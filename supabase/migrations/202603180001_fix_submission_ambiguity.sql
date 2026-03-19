-- Fix: qualify submitted_at in RETURNING clause inside process_round_submission.
-- The unqualified `returning id, submitted_at` can trigger an ambiguity error
-- in some PL/pgSQL runtime paths when a local variable shares the same name.
-- This migration replaces only the function; no data or schema is altered.

create or replace function public.process_round_submission(
  p_team_id uuid,
  p_round_id uuid,
  p_answers jsonb
)
returns table (
  submission_id uuid,
  submitted_at timestamptz,
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
      timer_remaining_seconds = 0
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

  -- FIX: explicitly qualify the RETURNING columns with the table name to
  -- prevent the "column reference submitted_at is ambiguous" runtime error.
  insert into public.submissions (
    team_id,
    round_id,
    status
  )
  values (
    p_team_id,
    p_round_id,
    'accepted'
  )
  returning
    public.submissions.id,
    public.submissions.submitted_at
  into v_submission_id, v_submitted_at;

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
      if not exists (
        select 1
        from public.options option_row
        where option_row.question_id = v_question.id
          and option_row.id::text = v_answer_value
      ) then
        raise exception 'Answer % is not valid for question %.', v_answer_value, v_question.id using errcode = '22023';
      end if;

      if v_answer_value = v_question.correct_answer_value then
        v_score := coalesce(v_question.correct_score, 0);
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
  set total_score = v_total_score
  where id = v_submission_id;

  select name, username
  into v_team_name, v_team_username
  from public.teams
  where id = p_team_id;

  select
    coalesce(sum(submission.total_score) filter (where round_row.order_index = 1), 0),
    coalesce(sum(submission.total_score) filter (where round_row.order_index = 2), 0),
    coalesce(sum(submission.total_score) filter (where round_row.order_index = 3), 0),
    coalesce(sum(submission.total_score), 0)
  into
    v_round_1_score,
    v_round_2_score,
    v_round_3_score,
    v_total_leaderboard_score
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
    updated_at = excluded.updated_at;

  return query
  select
    v_submission_id,
    v_submitted_at,
    v_total_score,
    'accepted'::text;
end;
$$;
