-- Competition stabilization migration.
--
-- Consolidates the DB hardening work applied through Supabase MCP on 2026-04-27.
-- The live project received the work as split migrations while we verified each
-- step. This local file represents the final intended schema state:
--
-- - wrap submission/admin SECURITY DEFINER RPCs with authenticated-user checks
-- - keep old internal implementations executable only by postgres
-- - lock the round row before submission handoff
-- - require accepted prior submissions for sequential round progression
-- - remove answer/scoring tables from the realtime publication
-- - add an admin leaderboard recompute RPC
-- - replace recursive round_public_state RLS with a SECURITY DEFINER helper
-- - remove old service-role compatibility RPC signatures

alter function public.process_round_submission(uuid, uuid, jsonb)
rename to process_round_submission_legacy_impl;

revoke all on function public.process_round_submission_legacy_impl(uuid, uuid, jsonb)
from public, anon, authenticated, service_role;

create or replace function public.process_round_submission(
  p_authenticated_user_id uuid,
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
begin
  if p_authenticated_user_id is null or p_team_id is null or p_authenticated_user_id <> p_team_id then
    raise exception 'Authenticated user does not match the submitting team.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.teams team_row
    where team_row.id = p_team_id
  ) then
    raise exception 'This account is not registered as a team.' using errcode = 'P0001';
  end if;

  select *
  into v_round
  from public.rounds
  where id = p_round_id
  for update;

  if not found then
    raise exception 'Round not found.' using errcode = 'P0002';
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
          and prior_submission.status = 'accepted'
      )
  ) then
    raise exception 'Previous rounds must be submitted before this round can be submitted.' using errcode = 'P0001';
  end if;

  return query
  select *
  from public.process_round_submission_legacy_impl(p_team_id, p_round_id, p_answers);
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
begin
  raise exception 'Use the authenticated submission RPC signature.' using errcode = 'P0001';
end;
$$;

revoke execute on function public.process_round_submission(uuid, uuid, jsonb)
from public, anon, authenticated, service_role;

grant execute on function public.process_round_submission(uuid, uuid, jsonb)
to service_role;

revoke execute on function public.process_round_submission(uuid, uuid, uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.process_round_submission(uuid, uuid, uuid, jsonb)
to service_role;

alter function public.apply_admin_round_action(uuid, uuid, text, jsonb)
rename to apply_admin_round_action_legacy_impl;

revoke all on function public.apply_admin_round_action_legacy_impl(uuid, uuid, text, jsonb)
from public, anon, authenticated, service_role;

create or replace function public.apply_admin_round_action(
  p_authenticated_user_id uuid,
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
begin
  if p_authenticated_user_id is null or p_actor_id is null or p_authenticated_user_id <> p_actor_id then
    raise exception 'Authenticated user does not match the admin actor.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.admins admin_row
    where admin_row.id = p_actor_id
  ) then
    raise exception 'This account is not authorized as an admin.' using errcode = 'P0001';
  end if;

  return public.apply_admin_round_action_legacy_impl(p_actor_id, p_round_id, p_action, p_payload);
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
begin
  raise exception 'Use the authenticated admin round action RPC signature.' using errcode = 'P0001';
end;
$$;

revoke execute on function public.apply_admin_round_action(uuid, uuid, text, jsonb)
from public, anon, authenticated, service_role;

grant execute on function public.apply_admin_round_action(uuid, uuid, text, jsonb)
to service_role;

revoke execute on function public.apply_admin_round_action(uuid, uuid, uuid, text, jsonb)
from public, anon, authenticated;

grant execute on function public.apply_admin_round_action(uuid, uuid, uuid, text, jsonb)
to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'correct_answers'
    ) then
      execute 'alter publication supabase_realtime drop table public.correct_answers';
    end if;

    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'blank_question_rules'
    ) then
      execute 'alter publication supabase_realtime drop table public.blank_question_rules';
    end if;
  end if;
end;
$$;

create or replace function public.recompute_leaderboard()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'This account is not authorized as an admin.' using errcode = 'P0001';
  end if;

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
  select
    team_row.id,
    team_row.name,
    team_row.username,
    coalesce(sum(submission.total_score) filter (where round_row.order_index = 1), 0),
    coalesce(sum(submission.total_score) filter (where round_row.order_index = 2), 0),
    coalesce(sum(submission.total_score) filter (where round_row.order_index = 3), 0),
    coalesce(sum(submission.total_score), 0),
    case
      when count(submission.id) > 0 and count(submission.id) = count(submission.time_taken_seconds)
        then coalesce(sum(submission.time_taken_seconds), 0)::int
      else null
    end,
    now()
  from public.teams team_row
  left join public.submissions submission
    on submission.team_id = team_row.id
   and submission.status = 'accepted'
  left join public.rounds round_row
    on round_row.id = submission.round_id
  group by team_row.id, team_row.name, team_row.username
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

  delete from public.leaderboard leaderboard_row
  where not exists (
    select 1
    from public.teams team_row
    where team_row.id = leaderboard_row.team_id
  );
end;
$$;

revoke execute on function public.recompute_leaderboard()
from public, anon;

grant execute on function public.recompute_leaderboard()
to authenticated, service_role;

create or replace function public.can_read_round_public_state(p_round_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.submissions submission
      where submission.team_id = auth.uid()
        and submission.round_id = p_round_id
        and submission.status = 'accepted'
    )
    or exists (
      select 1
      from public.rounds current_round
      where current_round.id = p_round_id
        and current_round.status = 'open'
        and not exists (
          select 1
          from public.rounds prior_round
          where prior_round.order_index < current_round.order_index
            and not exists (
              select 1
              from public.submissions prior_submission
              where prior_submission.team_id = auth.uid()
                and prior_submission.round_id = prior_round.id
                and prior_submission.status = 'accepted'
            )
        )
    );
$$;

drop policy if exists authenticated_read_round_public_state on public.round_public_state;

create policy authenticated_read_round_public_state on public.round_public_state
for select to authenticated
using (public.can_read_round_public_state(round_id));

revoke execute on function public.can_read_round_public_state(uuid)
from public, anon;

grant execute on function public.can_read_round_public_state(uuid)
to authenticated, service_role;

drop function if exists public.process_round_submission(uuid, uuid, jsonb);

drop function if exists public.apply_admin_round_action(uuid, uuid, text, jsonb);
