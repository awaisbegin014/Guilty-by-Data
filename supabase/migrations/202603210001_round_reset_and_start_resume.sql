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

    if v_round.timer_state = 'paused' then
      v_remaining_seconds := coalesce(
        v_round.timer_remaining_seconds,
        coalesce(v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60) - coalesce(v_round.timer_elapsed_seconds, 0)
      );

      if v_remaining_seconds <= 0 then
        raise exception 'This timer has no remaining time to resume.' using errcode = 'P0001';
      end if;

      update public.rounds
      set
        timer_state = 'running',
        timer_remaining_seconds = v_remaining_seconds,
        timer_started_at = now(),
        timer_paused_at = null,
        starts_at = coalesce(starts_at, now()),
        ends_at = now() + make_interval(secs => v_remaining_seconds)
      where id = p_round_id
      returning * into v_round;
    elsif v_round.timer_state in ('idle', 'expired') then
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
      timer_remaining_seconds = v_remaining_seconds,
      timer_started_at = now(),
      timer_paused_at = null,
      starts_at = coalesce(starts_at, now()),
      ends_at = now() + make_interval(secs => v_remaining_seconds)
    where id = p_round_id
    returning * into v_round;
  elsif p_action = 'reset_round' then
    v_duration_seconds := coalesce(v_round.timer_duration_seconds, greatest(v_round.timer_minutes, 1) * 60);

    update public.rounds
    set
      timer_state = 'idle',
      timer_duration_seconds = v_duration_seconds,
      timer_remaining_seconds = v_duration_seconds,
      timer_elapsed_seconds = 0,
      timer_started_at = null,
      timer_paused_at = null,
      starts_at = null,
      ends_at = null
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
