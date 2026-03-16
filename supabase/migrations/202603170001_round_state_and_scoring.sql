alter table public.rounds
  add column if not exists zip_password text,
  add column if not exists timer_state text not null default 'idle' check (timer_state in ('idle', 'running', 'paused', 'expired')),
  add column if not exists timer_duration_seconds int not null default 1800 check (timer_duration_seconds > 0),
  add column if not exists timer_remaining_seconds int check (timer_remaining_seconds >= 0),
  add column if not exists timer_started_at timestamptz,
  add column if not exists timer_paused_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.rounds round_row
set zip_password = dataset_secrets.password_value
from public.datasets
join public.dataset_secrets
  on dataset_secrets.dataset_id = datasets.id
where datasets.round_id = round_row.id
  and round_row.zip_password is null;

update public.rounds
set
  timer_duration_seconds = greatest(timer_minutes, 1) * 60,
  timer_remaining_seconds = case
    when status = 'open' and starts_at is not null and ends_at is not null and now() < ends_at
      then greatest(floor(extract(epoch from ends_at - now()))::int, 0)
    when status = 'open' and starts_at is not null and ends_at is not null and now() >= ends_at
      then 0
    else greatest(timer_minutes, 1) * 60
  end,
  timer_state = case
    when status = 'open' and starts_at is not null and ends_at is not null and now() < ends_at
      then 'running'
    when status = 'open' and starts_at is not null and ends_at is not null and now() >= ends_at
      then 'expired'
    else 'idle'
  end,
  timer_started_at = case
    when status = 'open' and starts_at is not null and ends_at is not null and now() < ends_at
      then starts_at
    else timer_started_at
  end,
  updated_at = now();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists rounds_touch_updated_at on public.rounds;
create trigger rounds_touch_updated_at
before update on public.rounds
for each row
execute function public.touch_updated_at();

create table if not exists public.round_public_state (
  round_id uuid primary key references public.rounds(id) on delete cascade,
  order_index int not null,
  title text not null,
  description text,
  status text not null,
  timer_minutes int not null,
  timer_state text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  timer_remaining_seconds int,
  updated_at timestamptz not null default now()
);

create or replace function public.sync_round_public_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.round_public_state (
    round_id,
    order_index,
    title,
    description,
    status,
    timer_minutes,
    timer_state,
    starts_at,
    ends_at,
    timer_remaining_seconds,
    updated_at
  )
  values (
    new.id,
    new.order_index,
    new.title,
    new.description,
    new.status,
    new.timer_minutes,
    new.timer_state,
    new.starts_at,
    new.ends_at,
    new.timer_remaining_seconds,
    new.updated_at
  )
  on conflict (round_id) do update
  set
    order_index = excluded.order_index,
    title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    timer_minutes = excluded.timer_minutes,
    timer_state = excluded.timer_state,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    timer_remaining_seconds = excluded.timer_remaining_seconds,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists rounds_sync_public_state on public.rounds;
create trigger rounds_sync_public_state
after insert or update on public.rounds
for each row
execute function public.sync_round_public_state();

insert into public.round_public_state (
  round_id,
  order_index,
  title,
  description,
  status,
  timer_minutes,
  timer_state,
  starts_at,
  ends_at,
  timer_remaining_seconds,
  updated_at
)
select
  id,
  order_index,
  title,
  description,
  status,
  timer_minutes,
  timer_state,
  starts_at,
  ends_at,
  timer_remaining_seconds,
  updated_at
from public.rounds
on conflict (round_id) do update
set
  order_index = excluded.order_index,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  timer_minutes = excluded.timer_minutes,
  timer_state = excluded.timer_state,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  timer_remaining_seconds = excluded.timer_remaining_seconds,
  updated_at = excluded.updated_at;

alter table public.round_public_state enable row level security;

drop policy if exists authenticated_read_round_public_state on public.round_public_state;
create policy authenticated_read_round_public_state on public.round_public_state
for select to authenticated
using (true);

drop policy if exists admins_manage_round_public_state on public.round_public_state;
create policy admins_manage_round_public_state on public.round_public_state
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists submissions_team_round_lookup on public.submissions(team_id, round_id);
create index if not exists submission_answers_submission_lookup on public.submission_answers(submission_id);
create index if not exists leaderboard_total_score_lookup on public.leaderboard(total_score desc, updated_at asc);
create index if not exists audit_log_created_at_lookup on public.audit_log(created_at desc);

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
      timer_remaining_seconds = 0
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
    v_remaining_seconds := case
      when v_round.timer_state = 'running' and v_round.ends_at is not null
        then greatest(floor(extract(epoch from v_round.ends_at - now()))::int, 0)
      else coalesce(v_round.timer_remaining_seconds, v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60)
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
      timer_paused_at = case
        when v_round.timer_state = 'running' then now()
        else timer_paused_at
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

    v_remaining_seconds := greatest(floor(extract(epoch from coalesce(v_round.ends_at, now()) - now()))::int, 0);

    update public.rounds
    set
      timer_state = case when v_remaining_seconds = 0 then 'expired' else 'paused' end,
      timer_remaining_seconds = v_remaining_seconds,
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

    v_remaining_seconds := coalesce(v_round.timer_remaining_seconds, v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60);
    if v_remaining_seconds <= 0 then
      raise exception 'This timer has no remaining time to resume.' using errcode = 'P0001';
    end if;

    update public.rounds
    set
      timer_state = 'running',
      timer_started_at = now(),
      timer_paused_at = null,
      starts_at = now(),
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
        timer_paused_at = now(),
        ends_at = null
      where id = p_round_id
      returning * into v_round;
    else
      update public.rounds
      set
        timer_minutes = v_minutes,
        timer_duration_seconds = v_duration_seconds,
        timer_remaining_seconds = v_duration_seconds,
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
      'timer_minutes', v_round.timer_minutes
    ) || coalesce(p_payload, '{}'::jsonb)
  );

  return v_round;
end;
$$;
