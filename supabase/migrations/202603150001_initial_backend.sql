create extension if not exists pgcrypto;

create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  order_index int not null unique,
  title text not null,
  description text,
  objective text,
  case_brief text,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  timer_minutes int not null default 30,
  starts_at timestamptz,
  ends_at timestamptz,
  documentation jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  title text not null,
  description text,
  link text,
  show_link boolean not null default false,
  show_password boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists datasets_round_id_key on public.datasets(round_id);

create table if not exists public.dataset_secrets (
  dataset_id uuid primary key references public.datasets(id) on delete cascade,
  password_value text not null
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  order_index int not null,
  type text not null check (type in ('mcq', 'blank')),
  text text not null,
  input_type text check (input_type in ('int', 'float', 'string')),
  created_at timestamptz not null default now(),
  unique (round_id, order_index)
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  order_index int not null,
  text text not null,
  score numeric default 0,
  unique (question_id, order_index)
);

create table if not exists public.correct_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid unique not null references public.questions(id) on delete cascade,
  answer_value text not null,
  score numeric default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  total_score numeric,
  status text not null default 'accepted' check (status in ('accepted', 'rejected')),
  unique (team_id, round_id)
);

create table if not exists public.submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_value text not null,
  score_awarded numeric,
  unique (submission_id, question_id)
);

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  team_id uuid unique not null references public.teams(id) on delete cascade,
  team_name text not null,
  username text not null,
  round_1_score numeric not null default 0,
  round_2_score numeric not null default 0,
  round_3_score numeric not null default 0,
  total_score numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.competition_settings (
  key text primary key,
  value jsonb not null
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where id = auth.uid()
  );
$$;

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
      and (ends_at is null or now() <= ends_at)
  );
$$;

alter table public.admins enable row level security;
alter table public.teams enable row level security;
alter table public.rounds enable row level security;
alter table public.datasets enable row level security;
alter table public.dataset_secrets enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.correct_answers enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_answers enable row level security;
alter table public.leaderboard enable row level security;
alter table public.competition_settings enable row level security;
alter table public.audit_log enable row level security;

drop policy if exists admins_self_select on public.admins;
create policy admins_self_select on public.admins
for select to authenticated
using (id = auth.uid());

drop policy if exists admins_manage_admins on public.admins;
create policy admins_manage_admins on public.admins
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists teams_self_select on public.teams;
create policy teams_self_select on public.teams
for select to authenticated
using (id = auth.uid());

drop policy if exists admins_manage_teams on public.teams;
create policy admins_manage_teams on public.teams
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists teams_read_rounds on public.rounds;
create policy teams_read_rounds on public.rounds
for select to authenticated
using (public.is_round_active(id));

drop policy if exists admins_manage_rounds on public.rounds;
create policy admins_manage_rounds on public.rounds
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists teams_read_datasets on public.datasets;
create policy teams_read_datasets on public.datasets
for select to authenticated
using (
  show_link = true
  and public.is_round_active(round_id)
);

drop policy if exists admins_manage_datasets on public.datasets;
create policy admins_manage_datasets on public.datasets
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists teams_read_dataset_secrets on public.dataset_secrets;
create policy teams_read_dataset_secrets on public.dataset_secrets
for select to authenticated
using (
  exists (
    select 1
    from public.datasets
    where datasets.id = dataset_secrets.dataset_id
      and datasets.show_password = true
      and public.is_round_active(datasets.round_id)
  )
);

drop policy if exists admins_manage_dataset_secrets on public.dataset_secrets;
create policy admins_manage_dataset_secrets on public.dataset_secrets
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists teams_read_questions on public.questions;
create policy teams_read_questions on public.questions
for select to authenticated
using (public.is_round_active(round_id));

drop policy if exists admins_manage_questions on public.questions;
create policy admins_manage_questions on public.questions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists teams_read_options on public.options;
create policy teams_read_options on public.options
for select to authenticated
using (
  exists (
    select 1
    from public.questions
    where questions.id = options.question_id
      and public.is_round_active(questions.round_id)
  )
);

drop policy if exists admins_manage_options on public.options;
create policy admins_manage_options on public.options
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admins_manage_correct_answers on public.correct_answers;
create policy admins_manage_correct_answers on public.correct_answers
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists teams_read_own_submissions on public.submissions;
create policy teams_read_own_submissions on public.submissions
for select to authenticated
using (team_id = auth.uid());

drop policy if exists admins_manage_submissions on public.submissions;
create policy admins_manage_submissions on public.submissions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists teams_read_own_submission_answers on public.submission_answers;
create policy teams_read_own_submission_answers on public.submission_answers
for select to authenticated
using (
  exists (
    select 1
    from public.submissions
    where submissions.id = submission_answers.submission_id
      and submissions.team_id = auth.uid()
  )
);

drop policy if exists admins_manage_submission_answers on public.submission_answers;
create policy admins_manage_submission_answers on public.submission_answers
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists authenticated_read_leaderboard on public.leaderboard;
create policy authenticated_read_leaderboard on public.leaderboard
for select to authenticated
using (true);

drop policy if exists admins_manage_leaderboard on public.leaderboard;
create policy admins_manage_leaderboard on public.leaderboard
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admins_manage_competition_settings on public.competition_settings;
create policy admins_manage_competition_settings on public.competition_settings
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists admins_manage_audit_log on public.audit_log;
create policy admins_manage_audit_log on public.audit_log
for all to authenticated
using (public.is_admin())
with check (public.is_admin());
