drop policy if exists teams_read_rounds on public.rounds;

drop policy if exists teams_read_questions on public.questions;

drop policy if exists teams_read_options on public.options;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'round_public_state'
    ) then
      execute 'alter publication supabase_realtime add table public.round_public_state';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'leaderboard'
    ) then
      execute 'alter publication supabase_realtime add table public.leaderboard';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'submissions'
    ) then
      execute 'alter publication supabase_realtime add table public.submissions';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'rounds'
    ) then
      execute 'alter publication supabase_realtime add table public.rounds';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'questions'
    ) then
      execute 'alter publication supabase_realtime add table public.questions';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'options'
    ) then
      execute 'alter publication supabase_realtime add table public.options';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'correct_answers'
    ) then
      execute 'alter publication supabase_realtime add table public.correct_answers';
    end if;
  end if;
end;
$$;
