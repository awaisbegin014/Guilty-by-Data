import type { Round, RoundProgress, RoundSubmission } from '../types/index.js';

export type ParticipantRoundStatus = RoundProgress['status'];

export function getEffectiveTimerState(round: Pick<Round, 'timerState' | 'endsAt'>, now = Date.now()) {
  if (round.timerState === 'running' && round.endsAt) {
    const endsAt = new Date(round.endsAt).getTime();
    if (!Number.isNaN(endsAt) && now >= endsAt) {
      return 'expired' as const;
    }
  }

  return round.timerState;
}

export function isRoundPlayable(
  round: Pick<Round, 'status' | 'timerState' | 'endsAt'>,
  sequentiallyAvailable: boolean,
  now = Date.now(),
) {
  return round.status === 'open'
    && sequentiallyAvailable
    && getEffectiveTimerState(round, now) === 'running';
}

export function deriveParticipantRoundStatus(params: {
  round: Pick<Round, 'status' | 'timerState' | 'endsAt'>;
  sequentiallyAvailable: boolean;
  submission?: RoundSubmission;
  hasDraftActivity: boolean;
  now?: number;
}): ParticipantRoundStatus {
  const {
    round,
    sequentiallyAvailable,
    submission,
    hasDraftActivity,
    now = Date.now(),
  } = params;

  if (submission) {
    return 'submitted';
  }

  if (round.status !== 'open' || !sequentiallyAvailable) {
    return 'locked';
  }

  const timerState = getEffectiveTimerState(round, now);

  if (timerState === 'running') {
    return hasDraftActivity ? 'in_progress' : 'available';
  }

  if (timerState === 'idle') {
    return 'not_started';
  }

  if (timerState === 'paused') {
    return 'paused';
  }

  return 'expired';
}

export function canAccessRoundRoute(status: ParticipantRoundStatus) {
  return status === 'available' || status === 'in_progress';
}

export function canShowSubmittedRoute(status: ParticipantRoundStatus) {
  return status === 'submitted';
}
