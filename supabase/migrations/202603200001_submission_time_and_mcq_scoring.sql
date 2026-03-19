alter table public.rounds
  add column if not exists timer_elapsed_seconds int not null default 0 check (timer_elapsed_seconds >= 0);

alter table public.submissions
  add column if not exists time_taken_seconds int check (time_taken_seconds >= 0);

alter table public.leaderboard
  add column if not exists total_time_seconds int check (total_time_seconds >= 0);

alter table public.submissions
  alter column time_taken_seconds drop not null,
  alter column time_taken_seconds drop default;

alter table public.leaderboard
  alter column total_time_seconds drop not null,
  alter column total_time_seconds drop default;

update public.rounds
set timer_elapsed_seconds = case
  when timer_state = 'running' and ends_at is not null
    then greatest(
      coalesce(timer_duration_seconds, greatest(timer_minutes, 1) * 60)
      - greatest(floor(extract(epoch from ends_at - now()))::int, 0),
      0
    )
  when timer_state = 'paused'
    then greatest(
      coalesce(timer_duration_seconds, greatest(timer_minutes, 1) * 60)
      - coalesce(timer_remaining_seconds, coalesce(timer_duration_seconds, greatest(timer_minutes, 1) * 60)),
      0
    )
  when timer_state = 'expired'
    then coalesce(timer_duration_seconds, greatest(timer_minutes, 1) * 60)
  else coalesce(timer_elapsed_seconds, 0)
end
where timer_elapsed_seconds = 0;

create index if not exists leaderboard_total_score_time_lookup
  on public.leaderboard (total_score desc, total_time_seconds asc, updated_at asc);

create index if not exists submissions_team_round_time_lookup
  on public.submissions (team_id, round_id, submitted_at);

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
begin
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
  where id = p_round_id
  for update;

  if not found then
    raise exception 'Round not found.' using errcode = 'P0002';
  end if;

  if v_round.status <> 'open' then
    raise exception 'This round is locked.' using errcode = 'P0001';
  end if;

  if v_round.timer_state = 'running' and v_round.ends_at is not null and now() >= v_round.ends_at then
    update public.rounds
    set
      timer_state = 'expired',
      timer_remaining_seconds = 0,
      timer_elapsed_seconds = timer_duration_seconds
    where id = v_round.id
    returning * into v_round;
  end if;

  if v_round.timer_state = 'idle' then
    raise exception 'This round has not started yet.' using errcode = 'P0001';
  elsif v_round.timer_state = 'paused' then
    raise exception 'This round is paused.' using errcode = 'P0001';
  elsif v_round.timer_state = 'expired' then
    raise exception 'This round has expired.' using errcode = 'P0001';
  elsif v_round.timer_state <> 'running' then
    raise exception 'This round is not currently accepting submissions.' using errcode = 'P0001';
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
    from public.submissions
    where team_id = p_team_id
      and round_id = p_round_id
  ) then
    raise exception 'This round has already been submitted.' using errcode = '23505';
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

  v_time_taken_seconds := least(
    coalesce(v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60),
    greatest(
      coalesce(v_round.timer_elapsed_seconds, 0)
      + floor(
        extract(
          epoch from now() - coalesce(v_round.timer_started_at, v_round.starts_at, now())
        )
      )::int,
      0
    )
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
  returning id, submitted_at into v_submission_id, v_submitted_at;

  for v_question in
    select
      question.id,
      question.type,
      question.input_type,
      correct.answer_value as correct_answer_value,
      coalesce(correct.score, 0) as correct_score
    from public.questions question
    left join public.correct_answers correct
      on correct.question_id = question.id
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
      begin
        if v_question.input_type = 'int' then
          if trim(v_answer_value)::bigint = trim(v_question.correct_answer_value)::bigint then
            v_score := coalesce(v_question.correct_score, 0);
          end if;
        elsif v_question.input_type = 'float' then
          if trim(v_answer_value)::numeric = trim(v_question.correct_answer_value)::numeric then
            v_score := coalesce(v_question.correct_score, 0);
          end if;
        elsif lower(trim(v_answer_value)) = lower(trim(v_question.correct_answer_value)) then
          v_score := coalesce(v_question.correct_score, 0);
        end if;
      exception
        when others then
          v_score := 0;
      end;
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
      v_score
    );

    v_total_score := v_total_score + coalesce(v_score, 0);
  end loop;

  update public.submissions
  set
    total_score = v_total_score,
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
    v_total_leaderboard_score,
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
    v_total_score,
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
  v_minutes int;
  v_duration_seconds int;
  v_remaining_seconds int;
  v_elapsed_seconds int;
begin
  select *
  into v_round
  from public.rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'Round not found.' using errcode = 'P0002';
  end if;

  if v_round.timer_state = 'running' and v_round.ends_at is not null and now() >= v_round.ends_at then
    update public.rounds
    set
      timer_state = 'expired',
      timer_remaining_seconds = 0,
      timer_elapsed_seconds = coalesce(timer_duration_seconds, greatest(timer_minutes, 1) * 60)
    where id = p_round_id
    returning * into v_round;
  end if;

  if p_action = 'unlock_round' then
    update public.rounds
    set
      status = 'open',
      timer_remaining_seconds = coalesce(timer_remaining_seconds, timer_duration_seconds, greatest(timer_minutes, 1) * 60)
    where id = p_round_id
    returning * into v_round;
  elsif p_action = 'lock_round' then
    v_elapsed_seconds := case
      when v_round.timer_state = 'running'
        then least(
          coalesce(v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60),
          greatest(
            coalesce(v_round.timer_elapsed_seconds, 0)
            + floor(
              extract(epoch from now() - coalesce(v_round.timer_started_at, now()))
            )::int,
            0
          )
        )
      else coalesce(v_round.timer_elapsed_seconds, 0)
    end;

    v_remaining_seconds := case
      when v_round.timer_state = 'running'
        then greatest(coalesce(v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60) - v_elapsed_seconds, 0)
      else coalesce(v_round.timer_remaining_seconds, coalesce(v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60))
    end;

    update public.rounds
    set
      status = 'closed',
      timer_state = case
        when v_round.timer_state = 'running' and v_remaining_seconds > 0 then 'paused'
        when v_round.timer_state = 'running' and v_remaining_seconds = 0 then 'expired'
        else timer_state
      end,
      timer_remaining_seconds = case
        when v_round.timer_state = 'running' then v_remaining_seconds
        else timer_remaining_seconds
      end,
      timer_elapsed_seconds = case
        when v_round.timer_state = 'running' then v_elapsed_seconds
        else timer_elapsed_seconds
      end,
      timer_paused_at = case
        when v_round.timer_state = 'running' then now()
        else timer_paused_at
      end,
      timer_started_at = case
        when v_round.timer_state = 'running' then null
        else timer_started_at
      end,
      ends_at = case
        when v_round.timer_state = 'running' and v_remaining_seconds > 0 then null
        else ends_at
      end
    where id = p_round_id
    returning * into v_round;
  elsif p_action = 'start_timer' then
    if v_round.status <> 'open' then
      raise exception 'Unlock the round before starting the timer.' using errcode = 'P0001';
    end if;

    if v_round.timer_state not in ('idle', 'expired') then
      raise exception 'Only an idle or expired round can be started.' using errcode = 'P0001';
    end if;

    v_duration_seconds := coalesce(v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60);

    update public.rounds
    set
      timer_state = 'running',
      timer_duration_seconds = v_duration_seconds,
      timer_remaining_seconds = v_duration_seconds,
      timer_elapsed_seconds = 0,
      timer_started_at = now(),
      timer_paused_at = null,
      starts_at = now(),
      ends_at = now() + make_interval(secs => v_duration_seconds)
    where id = p_round_id
    returning * into v_round;
  elsif p_action = 'pause_timer' then
    if v_round.status <> 'open' then
      raise exception 'Unlock the round before pausing the timer.' using errcode = 'P0001';
    end if;

    if v_round.timer_state <> 'running' then
      raise exception 'Only a running timer can be paused.' using errcode = 'P0001';
    end if;

    v_elapsed_seconds := least(
      coalesce(v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60),
      greatest(
        coalesce(v_round.timer_elapsed_seconds, 0)
        + floor(
          extract(epoch from now() - coalesce(v_round.timer_started_at, now()))
        )::int,
        0
      )
    );
    v_remaining_seconds := greatest(coalesce(v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60) - v_elapsed_seconds, 0);

    update public.rounds
    set
      timer_state = case when v_remaining_seconds = 0 then 'expired' else 'paused' end,
      timer_remaining_seconds = v_remaining_seconds,
      timer_elapsed_seconds = v_elapsed_seconds,
      timer_started_at = null,
      timer_paused_at = now(),
      ends_at = case when v_remaining_seconds = 0 then ends_at else null end
    where id = p_round_id
    returning * into v_round;
  elsif p_action = 'resume_timer' then
    if v_round.status <> 'open' then
      raise exception 'Unlock the round before resuming the timer.' using errcode = 'P0001';
    end if;

    if v_round.timer_state <> 'paused' then
      raise exception 'Only a paused timer can be resumed.' using errcode = 'P0001';
    end if;

    v_remaining_seconds := coalesce(v_round.timer_remaining_seconds, coalesce(v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60) - coalesce(v_round.timer_elapsed_seconds, 0));
    if v_remaining_seconds <= 0 then
      raise exception 'This timer has no remaining time to resume.' using errcode = 'P0001';
    end if;

    update public.rounds
    set
      timer_state = 'running',
      timer_started_at = now(),
      timer_paused_at = null,
      starts_at = coalesce(starts_at, now()),
      ends_at = now() + make_interval(secs => v_remaining_seconds)
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

    v_duration_seconds := v_minutes * 60;

    if v_round.timer_state = 'running' then
      update public.rounds
      set
        timer_minutes = v_minutes,
        timer_duration_seconds = v_duration_seconds,
        timer_remaining_seconds = v_duration_seconds,
        timer_elapsed_seconds = 0,
        timer_started_at = now(),
        timer_paused_at = null,
        starts_at = now(),
        ends_at = now() + make_interval(secs => v_duration_seconds)
      where id = p_round_id
      returning * into v_round;
    elsif v_round.timer_state = 'paused' then
      update public.rounds
      set
        timer_minutes = v_minutes,
        timer_duration_seconds = v_duration_seconds,
        timer_remaining_seconds = v_duration_seconds,
        timer_elapsed_seconds = 0,
        timer_started_at = null,
        timer_paused_at = now(),
        starts_at = coalesce(starts_at, now()),
        ends_at = null
      where id = p_round_id
      returning * into v_round;
    else
      update public.rounds
      set
        timer_minutes = v_minutes,
        timer_duration_seconds = v_duration_seconds,
        timer_remaining_seconds = v_duration_seconds,
        timer_elapsed_seconds = 0,
        timer_state = 'idle',
        timer_started_at = null,
        timer_paused_at = null,
        starts_at = null,
        ends_at = null
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
      'timer_elapsed_seconds', v_round.timer_elapsed_seconds
    ) || coalesce(p_payload, '{}'::jsonb)
  );

  return v_round;
end;
$$;
