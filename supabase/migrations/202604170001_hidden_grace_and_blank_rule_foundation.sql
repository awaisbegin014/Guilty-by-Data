alter table public.rounds
  add column if not exists submission_grace_seconds int not null default 60 check (submission_grace_seconds >= 0),
  add column if not exists submission_ends_at timestamptz,
  add column if not exists submission_remaining_seconds int check (submission_remaining_seconds >= 0);

alter table public.rounds
  drop constraint if exists rounds_submission_window_order_check,
  add constraint rounds_submission_window_order_check
    check (
      submission_ends_at is null
      or ends_at is null
      or submission_ends_at >= ends_at
    );

create or replace function public.is_round_active(round_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rounds
    where id = round_uuid
      and status = 'open'
      and (starts_at is null or now() >= starts_at)
      and (
        coalesce(submission_ends_at, ends_at) is null
        or now() <= coalesce(submission_ends_at, ends_at)
      )
  );
$$;

create table if not exists public.blank_question_rules (
  question_id uuid primary key references public.questions(id) on delete cascade,
  correct_answer numeric not null,
  range_start numeric not null,
  range_end numeric not null,
  exact_score numeric not null,
  min_score numeric not null,
  curve_power numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blank_question_rules_range_check
    check (range_start <= correct_answer and correct_answer <= range_end),
  constraint blank_question_rules_score_check
    check (exact_score >= 0 and min_score >= 0 and exact_score >= min_score),
  constraint blank_question_rules_curve_power_check
    check (curve_power > 0)
);

create or replace function public.validate_blank_question_rule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_type text;
  v_input_type text;
begin
  select question.type, question.input_type
  into v_question_type, v_input_type
  from public.questions question
  where question.id = new.question_id;

  if not found then
    raise exception 'Question % was not found for blank scoring rules.', new.question_id
      using errcode = '23503';
  end if;

  if v_question_type <> 'blank' then
    raise exception 'Blank scoring rules can only be attached to blank questions.'
      using errcode = '23514';
  end if;

  if v_input_type not in ('int', 'float') then
    raise exception 'Blank questions with scoring rules must use int or float input types.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists blank_question_rules_validate_question on public.blank_question_rules;
create trigger blank_question_rules_validate_question
before insert or update on public.blank_question_rules
for each row
execute function public.validate_blank_question_rule();

drop trigger if exists blank_question_rules_touch_updated_at on public.blank_question_rules;
create trigger blank_question_rules_touch_updated_at
before update on public.blank_question_rules
for each row
execute function public.touch_updated_at();

alter table public.blank_question_rules enable row level security;

drop policy if exists admins_manage_blank_question_rules on public.blank_question_rules;
create policy admins_manage_blank_question_rules on public.blank_question_rules
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.round_public_state
  add column if not exists submission_ends_at timestamptz,
  add column if not exists submission_remaining_seconds int;

update public.rounds
set
  submission_ends_at = case
    when ends_at is not null
      then ends_at + make_interval(secs => submission_grace_seconds)
    else null
  end,
  submission_remaining_seconds = case
    when timer_state in ('idle', 'paused')
      then greatest(
        coalesce(
          timer_remaining_seconds,
          timer_duration_seconds,
          greatest(timer_minutes, 1) * 60
        ),
        0
      ) + submission_grace_seconds
    when ends_at is not null
      then greatest(
        floor(
          extract(
            epoch from (ends_at + make_interval(secs => submission_grace_seconds)) - now()
          )
        )::int,
        0
      )
    else null
  end;

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
    submission_ends_at,
    submission_remaining_seconds,
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
    new.submission_ends_at,
    new.submission_remaining_seconds,
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
    submission_ends_at = excluded.submission_ends_at,
    submission_remaining_seconds = excluded.submission_remaining_seconds,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

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
  submission_ends_at,
  submission_remaining_seconds,
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
  submission_ends_at,
  submission_remaining_seconds,
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
  submission_ends_at = excluded.submission_ends_at,
  submission_remaining_seconds = excluded.submission_remaining_seconds,
  updated_at = excluded.updated_at;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'blank_question_rules'
    ) then
      execute 'alter publication supabase_realtime add table public.blank_question_rules';
    end if;
  end if;
end;
$$;
