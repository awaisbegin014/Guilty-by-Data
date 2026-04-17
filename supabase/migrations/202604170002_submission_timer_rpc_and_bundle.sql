create or replace function public.calculate_blank_question_score(
  p_input_type text,
  p_answer_value text,
  p_correct_answer numeric,
  p_range_start numeric,
  p_range_end numeric,
  p_exact_score numeric,
  p_min_score numeric,
  p_curve_power numeric default 1
)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_answer_numeric numeric;
  v_distance numeric;
  v_max_distance numeric;
  v_normalized numeric;
  v_score numeric;
begin
  if p_answer_value is null or nullif(trim(p_answer_value), '') is null then
    return 0;
  end if;

  begin
    v_answer_numeric := trim(p_answer_value)::numeric;
  exception
    when others then
      return 0;
  end;

  if p_input_type = 'int' and trunc(v_answer_numeric) <> v_answer_numeric then
    return 0;
  end if;

  if v_answer_numeric < p_range_start or v_answer_numeric > p_range_end then
    return 0;
  end if;

  if v_answer_numeric = p_correct_answer then
    return round(p_exact_score, 3);
  end if;

  v_distance := abs(v_answer_numeric - p_correct_answer);
  v_max_distance := case
    when v_answer_numeric < p_correct_answer then p_correct_answer - p_range_start
    else p_range_end - p_correct_answer
  end;

  if coalesce(v_max_distance, 0) <= 0 then
    return 0;
  end if;

  v_normalized := v_distance / nullif(v_max_distance, 0);
  if v_normalized >= 1 then
    return 0;
  end if;

  v_score := p_min_score
    + (p_exact_score - p_min_score) * power(1 - v_normalized, coalesce(p_curve_power, 1));

  return round(greatest(v_score, 0), 3);
end;
$$;

create or replace function public.process_round_submission(
  p_team_id uuid,
  p_round_id uuid,
  p_answers jsonb
)
returns table (
  submission_id uuid,
  submitted_at timestamptz,
  time_taken_seconds int,
  total_score numeric,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.rounds%rowtype;
  v_existing_submission public.submissions%rowtype;
  v_submission_id uuid;
  v_submitted_at timestamptz;
  v_time_taken_seconds int := 0;
  v_total_score numeric := 0;
  v_answer_value text;
  v_question record;
  v_score numeric := 0;
  v_team_name text;
  v_team_username text;
  v_round_1_score numeric := 0;
  v_round_2_score numeric := 0;
  v_round_3_score numeric := 0;
  v_total_leaderboard_score numeric := 0;
  v_total_time_seconds int;
  v_visible_duration_seconds int := 0;
  v_submission_window_seconds int := 0;
  v_submission_remaining_seconds int := 0;
  v_submission_deadline timestamptz;
begin
  select *
  into v_existing_submission
  from public.submissions
  where team_id = p_team_id
    and round_id = p_round_id
  limit 1;

  if found then
    return query
    select
      v_existing_submission.id,
      v_existing_submission.submitted_at,
      v_existing_submission.time_taken_seconds,
      v_existing_submission.total_score,
      v_existing_submission.status;
    return;
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers payload must be an array.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_answers) as answer(question_id uuid, answer_value text)
    where answer.question_id is null or nullif(trim(answer.answer_value), '') is null
  ) then
    raise exception 'Each answer must include questionId and answerValue.' using errcode = '22023';
  end if;

  if (
    select count(*)
    from jsonb_to_recordset(p_answers) as answer(question_id uuid, answer_value text)
  ) <> (
    select count(distinct answer.question_id)
    from jsonb_to_recordset(p_answers) as answer(question_id uuid, answer_value text)
  ) then
    raise exception 'Duplicate answer provided in submission payload.' using errcode = '22023';
  end if;

  select *
  into v_round
  from public.rounds
  where id = p_round_id;

  if not found then
    raise exception 'Round not found.' using errcode = 'P0002';
  end if;

  if v_round.status <> 'open' then
    raise exception 'This round is locked.' using errcode = 'P0001';
  end if;

  if v_round.timer_state = 'idle' or v_round.starts_at is null then
    raise exception 'This round has not started yet.' using errcode = 'P0001';
  elsif v_round.timer_state = 'paused' then
    raise exception 'This round is paused.' using errcode = 'P0001';
  end if;

  v_submission_deadline := coalesce(v_round.submission_ends_at, v_round.ends_at);
  if v_submission_deadline is null then
    raise exception 'This round is not currently accepting submissions.' using errcode = 'P0001';
  end if;

  if now() >= v_submission_deadline then
    raise exception 'This round has expired.' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.rounds prior_round
    where prior_round.order_index < v_round.order_index
      and not exists (
        select 1
        from public.submissions prior_submission
        where prior_submission.team_id = p_team_id
          and prior_submission.round_id = prior_round.id
      )
  ) then
    raise exception 'Previous rounds must be submitted before this round can be submitted.' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_answers) as answer(question_id uuid, answer_value text)
    left join public.questions question
      on question.id = answer.question_id
     and question.round_id = p_round_id
    where question.id is null
  ) then
    raise exception 'One or more submitted questions do not belong to this round.' using errcode = '22023';
  end if;

  v_visible_duration_seconds := coalesce(
    v_round.timer_duration_seconds,
    greatest(v_round.timer_minutes, 1) * 60
  );
  v_submission_window_seconds := v_visible_duration_seconds + coalesce(v_round.submission_grace_seconds, 0);
  v_submission_remaining_seconds := greatest(
    floor(extract(epoch from v_submission_deadline - now()))::int,
    0
  );
  v_time_taken_seconds := least(
    v_submission_window_seconds,
    greatest(v_submission_window_seconds - v_submission_remaining_seconds, 0)
  );

  insert into public.submissions (
    team_id,
    round_id,
    status,
    time_taken_seconds
  )
  values (
    p_team_id,
    p_round_id,
    'accepted',
    v_time_taken_seconds
  )
  on conflict (team_id, round_id) do nothing
  returning
    public.submissions.id,
    public.submissions.submitted_at
  into v_submission_id, v_submitted_at;

  if v_submission_id is null then
    select *
    into v_existing_submission
    from public.submissions
    where team_id = p_team_id
      and round_id = p_round_id
    limit 1;

    if found then
      return query
      select
        v_existing_submission.id,
        v_existing_submission.submitted_at,
        v_existing_submission.time_taken_seconds,
        v_existing_submission.total_score,
        v_existing_submission.status;
      return;
    end if;

    raise exception 'Unable to create or load the submission row.' using errcode = 'P0001';
  end if;

  for v_question in
    select
      question.id,
      question.type,
      question.input_type,
      correct.answer_value as correct_answer_value,
      coalesce(correct.score, 0) as correct_score,
      blank_rule.correct_answer as blank_correct_answer,
      blank_rule.range_start,
      blank_rule.range_end,
      blank_rule.exact_score,
      blank_rule.min_score,
      blank_rule.curve_power
    from public.questions question
    left join public.correct_answers correct
      on correct.question_id = question.id
    left join public.blank_question_rules blank_rule
      on blank_rule.question_id = question.id
    where question.round_id = p_round_id
    order by question.order_index
  loop
    select answer.answer_value
    into v_answer_value
    from jsonb_to_recordset(p_answers) as answer(question_id uuid, answer_value text)
    where answer.question_id = v_question.id
    limit 1;

    if v_answer_value is null then
      continue;
    end if;

    v_score := 0;

    if v_question.type = 'mcq' then
      select
        coalesce(option_row.score, v_question.correct_score, 0)
      into v_score
      from public.options option_row
      where option_row.question_id = v_question.id
        and option_row.id::text = v_answer_value
      limit 1;

      if not found then
        raise exception 'Answer % is not valid for question %.', v_answer_value, v_question.id using errcode = '22023';
      end if;
    else
      if v_question.blank_correct_answer is not null then
        v_score := public.calculate_blank_question_score(
          v_question.input_type,
          v_answer_value,
          v_question.blank_correct_answer,
          v_question.range_start,
          v_question.range_end,
          v_question.exact_score,
          v_question.min_score,
          v_question.curve_power
        );
      else
        begin
          if v_question.input_type = 'int' then
            if trim(v_answer_value)::bigint = trim(v_question.correct_answer_value)::bigint then
              v_score := round(coalesce(v_question.correct_score, 0), 3);
            end if;
          elsif v_question.input_type = 'float' then
            if trim(v_answer_value)::numeric = trim(v_question.correct_answer_value)::numeric then
              v_score := round(coalesce(v_question.correct_score, 0), 3);
            end if;
          elsif lower(trim(v_answer_value)) = lower(trim(v_question.correct_answer_value)) then
            v_score := round(coalesce(v_question.correct_score, 0), 3);
          end if;
        exception
          when others then
            v_score := 0;
        end;
      end if;
    end if;

    insert into public.submission_answers (
      submission_id,
      question_id,
      answer_value,
      score_awarded
    )
    values (
      v_submission_id,
      v_question.id,
      v_answer_value,
      round(coalesce(v_score, 0), 3)
    );

    v_total_score := v_total_score + coalesce(v_score, 0);
  end loop;

  update public.submissions
  set
    total_score = round(v_total_score, 3),
    time_taken_seconds = v_time_taken_seconds
  where id = v_submission_id;

  select name, username
  into v_team_name, v_team_username
  from public.teams
  where id = p_team_id;

  select
    coalesce(sum(submission.total_score) filter (where round_row.order_index = 1), 0),
    coalesce(sum(submission.total_score) filter (where round_row.order_index = 2), 0),
    coalesce(sum(submission.total_score) filter (where round_row.order_index = 3), 0),
    coalesce(sum(submission.total_score), 0),
    case
      when count(*) = count(submission.time_taken_seconds)
        then coalesce(sum(submission.time_taken_seconds), 0)::int
      else null
    end
  into
    v_round_1_score,
    v_round_2_score,
    v_round_3_score,
    v_total_leaderboard_score,
    v_total_time_seconds
  from public.submissions submission
  join public.rounds round_row
    on round_row.id = submission.round_id
  where submission.team_id = p_team_id
    and submission.status = 'accepted';

  insert into public.leaderboard (
    team_id,
    team_name,
    username,
    round_1_score,
    round_2_score,
    round_3_score,
    total_score,
    total_time_seconds,
    updated_at
  )
  values (
    p_team_id,
    v_team_name,
    v_team_username,
    v_round_1_score,
    v_round_2_score,
    v_round_3_score,
    round(v_total_leaderboard_score, 3),
    v_total_time_seconds,
    now()
  )
  on conflict (team_id) do update
  set
    team_name = excluded.team_name,
    username = excluded.username,
    round_1_score = excluded.round_1_score,
    round_2_score = excluded.round_2_score,
    round_3_score = excluded.round_3_score,
    total_score = excluded.total_score,
    total_time_seconds = excluded.total_time_seconds,
    updated_at = excluded.updated_at;

  return query
  select
    v_submission_id,
    v_submitted_at,
    v_time_taken_seconds,
    round(v_total_score, 3),
    'accepted'::text;
end;
$$;

create or replace function public.apply_admin_round_action(
  p_actor_id uuid,
  p_round_id uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns public.rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.rounds%rowtype;
  v_now timestamptz := now();
  v_minutes int;
  v_visible_duration_seconds int;
  v_current_visible_remaining int;
  v_current_submission_remaining int;
  v_current_hidden_remaining int;
  v_visible_elapsed_seconds int;
  v_submission_grace_seconds int;
  v_new_visible_duration_seconds int;
  v_new_grace_seconds int;
  v_new_visible_remaining int;
  v_new_hidden_remaining int;
  v_new_submission_remaining int;
  v_hidden_elapsed_seconds int;
begin
  select *
  into v_round
  from public.rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'Round not found.' using errcode = 'P0002';
  end if;

  v_visible_duration_seconds := coalesce(
    v_round.timer_duration_seconds,
    greatest(v_round.timer_minutes, 1) * 60
  );
  v_submission_grace_seconds := coalesce(v_round.submission_grace_seconds, 60);

  v_current_visible_remaining := case
    when v_round.timer_state = 'running' and v_round.ends_at is not null
      then greatest(floor(extract(epoch from v_round.ends_at - v_now))::int, 0)
    when v_round.timer_state = 'expired'
      then 0
    else greatest(
      coalesce(
        v_round.timer_remaining_seconds,
        v_visible_duration_seconds - coalesce(v_round.timer_elapsed_seconds, 0),
        v_visible_duration_seconds
      ),
      0
    )
  end;

  v_current_submission_remaining := case
    when v_round.timer_state = 'running' and coalesce(v_round.submission_ends_at, v_round.ends_at) is not null
      then greatest(
        floor(extract(epoch from coalesce(v_round.submission_ends_at, v_round.ends_at) - v_now))::int,
        0
      )
    when v_round.timer_state = 'expired'
      then 0
    else greatest(
      coalesce(
        v_round.submission_remaining_seconds,
        v_current_visible_remaining + v_submission_grace_seconds,
        v_visible_duration_seconds + v_submission_grace_seconds
      ),
      0
    )
  end;

  v_current_hidden_remaining := greatest(v_current_submission_remaining - v_current_visible_remaining, 0);
  v_visible_elapsed_seconds := greatest(v_visible_duration_seconds - v_current_visible_remaining, 0);

  if v_round.timer_state = 'running' and v_current_submission_remaining = 0 then
    update public.rounds
    set
      timer_state = 'expired',
      timer_remaining_seconds = 0,
      submission_remaining_seconds = 0,
      timer_elapsed_seconds = v_visible_duration_seconds,
      timer_started_at = null,
      timer_paused_at = v_now,
      ends_at = coalesce(ends_at, v_now),
      submission_ends_at = coalesce(submission_ends_at, coalesce(ends_at, v_now))
    where id = p_round_id
    returning * into v_round;

    v_visible_duration_seconds := coalesce(
      v_round.timer_duration_seconds,
      greatest(v_round.timer_minutes, 1) * 60
    );
    v_submission_grace_seconds := coalesce(v_round.submission_grace_seconds, 60);
    v_current_visible_remaining := 0;
    v_current_submission_remaining := 0;
    v_current_hidden_remaining := 0;
    v_visible_elapsed_seconds := v_visible_duration_seconds;
  end if;

  if p_action = 'unlock_round' then
    update public.rounds
    set
      status = 'open',
      timer_remaining_seconds = coalesce(timer_remaining_seconds, v_current_visible_remaining, v_visible_duration_seconds),
      submission_remaining_seconds = coalesce(
        submission_remaining_seconds,
        v_current_submission_remaining,
        v_visible_duration_seconds + v_submission_grace_seconds
      )
    where id = p_round_id
    returning * into v_round;
  elsif p_action = 'lock_round' then
    update public.rounds
    set
      status = 'closed',
      timer_state = case
        when v_round.timer_state = 'running' and v_current_submission_remaining > 0 then 'paused'
        when v_current_submission_remaining = 0 then 'expired'
        else timer_state
      end,
      timer_remaining_seconds = case
        when v_round.timer_state = 'running' then v_current_visible_remaining
        else coalesce(timer_remaining_seconds, v_current_visible_remaining)
      end,
      submission_remaining_seconds = case
        when v_round.timer_state = 'running' then v_current_submission_remaining
        else coalesce(submission_remaining_seconds, v_current_submission_remaining)
      end,
      timer_elapsed_seconds = case
        when v_round.timer_state = 'running' then v_visible_elapsed_seconds
        else timer_elapsed_seconds
      end,
      timer_paused_at = case
        when v_round.timer_state = 'running' then v_now
        else timer_paused_at
      end,
      timer_started_at = case
        when v_round.timer_state = 'running' then null
        else timer_started_at
      end,
      ends_at = case
        when v_round.timer_state = 'running' then null
        else ends_at
      end,
      submission_ends_at = case
        when v_round.timer_state = 'running' then null
        else submission_ends_at
      end
    where id = p_round_id
    returning * into v_round;
  elsif p_action = 'start_timer' then
    if v_round.status <> 'open' then
      raise exception 'Unlock the round before starting the timer.' using errcode = 'P0001';
    end if;

    if v_round.timer_state = 'paused' then
      if v_current_submission_remaining <= 0 then
        raise exception 'This timer has no remaining time to resume.' using errcode = 'P0001';
      end if;

      update public.rounds
      set
        timer_state = 'running',
        timer_remaining_seconds = v_current_visible_remaining,
        submission_remaining_seconds = v_current_submission_remaining,
        timer_started_at = v_now,
        timer_paused_at = null,
        starts_at = coalesce(starts_at, v_now),
        ends_at = v_now + make_interval(secs => v_current_visible_remaining),
        submission_ends_at = v_now + make_interval(secs => v_current_submission_remaining)
      where id = p_round_id
      returning * into v_round;
    elsif v_round.timer_state in ('idle', 'expired') then
      update public.rounds
      set
        timer_state = 'running',
        timer_duration_seconds = v_visible_duration_seconds,
        timer_remaining_seconds = v_visible_duration_seconds,
        submission_remaining_seconds = v_visible_duration_seconds + v_submission_grace_seconds,
        timer_elapsed_seconds = 0,
        timer_started_at = v_now,
        timer_paused_at = null,
        starts_at = v_now,
        ends_at = v_now + make_interval(secs => v_visible_duration_seconds),
        submission_ends_at = v_now + make_interval(secs => v_visible_duration_seconds + v_submission_grace_seconds)
      where id = p_round_id
      returning * into v_round;
    else
      raise exception 'Only an idle, paused, or expired round can be started.' using errcode = 'P0001';
    end if;
  elsif p_action = 'pause_timer' then
    if v_round.status <> 'open' then
      raise exception 'Unlock the round before pausing the timer.' using errcode = 'P0001';
    end if;

    if v_round.timer_state <> 'running' then
      raise exception 'Only a running timer can be paused.' using errcode = 'P0001';
    end if;

    update public.rounds
    set
      timer_state = case when v_current_submission_remaining = 0 then 'expired' else 'paused' end,
      timer_remaining_seconds = v_current_visible_remaining,
      submission_remaining_seconds = v_current_submission_remaining,
      timer_elapsed_seconds = v_visible_elapsed_seconds,
      timer_started_at = null,
      timer_paused_at = v_now,
      ends_at = null,
      submission_ends_at = null
    where id = p_round_id
    returning * into v_round;
  elsif p_action = 'resume_timer' then
    if v_round.status <> 'open' then
      raise exception 'Unlock the round before resuming the timer.' using errcode = 'P0001';
    end if;

    if v_round.timer_state <> 'paused' then
      raise exception 'Only a paused timer can be resumed.' using errcode = 'P0001';
    end if;

    if v_current_submission_remaining <= 0 then
      raise exception 'This timer has no remaining time to resume.' using errcode = 'P0001';
    end if;

    update public.rounds
    set
      timer_state = 'running',
      timer_remaining_seconds = v_current_visible_remaining,
      submission_remaining_seconds = v_current_submission_remaining,
      timer_started_at = v_now,
      timer_paused_at = null,
      starts_at = coalesce(starts_at, v_now),
      ends_at = v_now + make_interval(secs => v_current_visible_remaining),
      submission_ends_at = v_now + make_interval(secs => v_current_submission_remaining)
    where id = p_round_id
    returning * into v_round;
  elsif p_action = 'reset_round' then
    update public.rounds
    set
      timer_state = 'idle',
      timer_duration_seconds = v_visible_duration_seconds,
      timer_remaining_seconds = v_visible_duration_seconds,
      submission_remaining_seconds = v_visible_duration_seconds + v_submission_grace_seconds,
      timer_elapsed_seconds = 0,
      timer_started_at = null,
      timer_paused_at = null,
      starts_at = null,
      ends_at = null,
      submission_ends_at = null
    where id = p_round_id
    returning * into v_round;
  elsif p_action = 'set_timer_duration' then
    v_minutes := nullif(trim(p_payload ->> 'timerMinutes'), '')::int;

    if v_round.status <> 'open' then
      raise exception 'Unlock the round before changing the timer duration.' using errcode = 'P0001';
    end if;

    if v_minutes is null or v_minutes < 1 then
      raise exception 'Timer duration must be at least 1 minute.' using errcode = '22023';
    end if;

    v_new_visible_duration_seconds := v_minutes * 60;
    v_new_visible_remaining := greatest(v_new_visible_duration_seconds - v_visible_elapsed_seconds, 0);
    v_new_submission_remaining := v_new_visible_remaining + v_current_hidden_remaining;

    if v_round.timer_state = 'running' then
      update public.rounds
      set
        timer_minutes = v_minutes,
        timer_duration_seconds = v_new_visible_duration_seconds,
        timer_remaining_seconds = v_new_visible_remaining,
        submission_remaining_seconds = v_new_submission_remaining,
        timer_elapsed_seconds = greatest(v_new_visible_duration_seconds - v_new_visible_remaining, 0),
        timer_started_at = case when v_new_submission_remaining > 0 then v_now else null end,
        timer_paused_at = case when v_new_submission_remaining > 0 then null else v_now end,
        ends_at = case
          when v_new_submission_remaining = 0 then v_now
          else v_now + make_interval(secs => v_new_visible_remaining)
        end,
        submission_ends_at = case
          when v_new_submission_remaining = 0 then v_now
          else v_now + make_interval(secs => v_new_submission_remaining)
        end,
        timer_state = case when v_new_submission_remaining = 0 then 'expired' else 'running' end
      where id = p_round_id
      returning * into v_round;
    elsif v_round.timer_state = 'paused' then
      update public.rounds
      set
        timer_minutes = v_minutes,
        timer_duration_seconds = v_new_visible_duration_seconds,
        timer_remaining_seconds = v_new_visible_remaining,
        submission_remaining_seconds = v_new_submission_remaining,
        timer_elapsed_seconds = greatest(v_new_visible_duration_seconds - v_new_visible_remaining, 0),
        timer_state = case when v_new_submission_remaining = 0 then 'expired' else 'paused' end,
        timer_started_at = null,
        timer_paused_at = v_now,
        ends_at = null,
        submission_ends_at = null
      where id = p_round_id
      returning * into v_round;
    else
      update public.rounds
      set
        timer_minutes = v_minutes,
        timer_duration_seconds = v_new_visible_duration_seconds,
        timer_remaining_seconds = case
          when starts_at is null or timer_state = 'idle' then v_new_visible_duration_seconds
          else v_new_visible_remaining
        end,
        submission_remaining_seconds = case
          when starts_at is null or timer_state = 'idle' then v_new_visible_duration_seconds + v_submission_grace_seconds
          else v_new_submission_remaining
        end,
        timer_elapsed_seconds = case
          when starts_at is null or timer_state = 'idle' then 0
          else greatest(v_new_visible_duration_seconds - v_new_visible_remaining, 0)
        end,
        timer_state = case
          when starts_at is null or timer_state = 'idle' then 'idle'
          when v_new_submission_remaining = 0 then 'expired'
          else timer_state
        end,
        timer_started_at = null,
        timer_paused_at = case
          when starts_at is null or timer_state = 'idle' then null
          else v_now
        end,
        starts_at = case
          when starts_at is null or timer_state = 'idle' then null
          else starts_at
        end,
        ends_at = null,
        submission_ends_at = null
      where id = p_round_id
      returning * into v_round;
    end if;
  elsif p_action = 'set_grace_duration' then
    v_new_grace_seconds := nullif(trim(p_payload ->> 'submissionGraceSeconds'), '')::int;

    if v_round.status <> 'open' then
      raise exception 'Unlock the round before changing the grace duration.' using errcode = 'P0001';
    end if;

    if v_new_grace_seconds is null or v_new_grace_seconds < 0 then
      raise exception 'Grace duration must be zero or greater.' using errcode = '22023';
    end if;

    v_hidden_elapsed_seconds := greatest(v_submission_grace_seconds - v_current_hidden_remaining, 0);
    v_new_hidden_remaining := greatest(v_new_grace_seconds - v_hidden_elapsed_seconds, 0);
    v_new_submission_remaining := v_current_visible_remaining + v_new_hidden_remaining;

    if v_round.timer_state = 'running' then
      update public.rounds
      set
        submission_grace_seconds = v_new_grace_seconds,
        submission_remaining_seconds = v_new_submission_remaining,
        timer_remaining_seconds = v_current_visible_remaining,
        timer_elapsed_seconds = v_visible_elapsed_seconds,
        timer_started_at = case when v_new_submission_remaining > 0 then v_now else null end,
        timer_paused_at = case when v_new_submission_remaining > 0 then null else v_now end,
        ends_at = case
          when v_new_submission_remaining = 0 then v_now
          else v_now + make_interval(secs => v_current_visible_remaining)
        end,
        submission_ends_at = case
          when v_new_submission_remaining = 0 then v_now
          else v_now + make_interval(secs => v_new_submission_remaining)
        end,
        timer_state = case when v_new_submission_remaining = 0 then 'expired' else 'running' end
      where id = p_round_id
      returning * into v_round;
    elsif v_round.timer_state = 'paused' then
      update public.rounds
      set
        submission_grace_seconds = v_new_grace_seconds,
        timer_remaining_seconds = v_current_visible_remaining,
        submission_remaining_seconds = v_new_submission_remaining,
        timer_elapsed_seconds = v_visible_elapsed_seconds,
        timer_state = case when v_new_submission_remaining = 0 then 'expired' else 'paused' end,
        timer_started_at = null,
        timer_paused_at = v_now,
        ends_at = null,
        submission_ends_at = null
      where id = p_round_id
      returning * into v_round;
    else
      update public.rounds
      set
        submission_grace_seconds = v_new_grace_seconds,
        timer_remaining_seconds = case
          when starts_at is null or timer_state = 'idle' then v_visible_duration_seconds
          else v_current_visible_remaining
        end,
        submission_remaining_seconds = case
          when starts_at is null or timer_state = 'idle' then v_visible_duration_seconds + v_new_grace_seconds
          else v_new_submission_remaining
        end,
        timer_elapsed_seconds = case
          when starts_at is null or timer_state = 'idle' then 0
          else v_visible_elapsed_seconds
        end,
        timer_state = case
          when starts_at is null or timer_state = 'idle' then 'idle'
          when v_new_submission_remaining = 0 then 'expired'
          else timer_state
        end,
        timer_started_at = null,
        timer_paused_at = case
          when starts_at is null or timer_state = 'idle' then null
          else v_now
        end,
        ends_at = null,
        submission_ends_at = null
      where id = p_round_id
      returning * into v_round;
    end if;
  else
    raise exception 'Unsupported round action: %', p_action using errcode = '22023';
  end if;

  insert into public.audit_log (
    actor_id,
    action,
    target,
    metadata
  )
  values (
    p_actor_id,
    p_action,
    'round:' || p_round_id::text,
    jsonb_build_object(
      'round_id', p_round_id,
      'status', v_round.status,
      'timer_state', v_round.timer_state,
      'timer_minutes', v_round.timer_minutes,
      'timer_elapsed_seconds', v_round.timer_elapsed_seconds,
      'submission_grace_seconds', v_round.submission_grace_seconds,
      'submission_remaining_seconds', v_round.submission_remaining_seconds
    ) || coalesce(p_payload, '{}'::jsonb)
  );

  return v_round;
end;
$$;
