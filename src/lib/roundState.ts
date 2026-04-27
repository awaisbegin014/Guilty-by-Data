import type { Round, RoundProgress, RoundSubmission } from '../types/index.js';

export type ParticipantRoundStatus = RoundProgress['status'];
export type ParticipantTimerPhase = 'idle' | 'running-visible' | 'running-grace' | 'paused' | 'expired';

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function getFinalSubmissionDeadline(round: Pick<Round, 'endsAt' | 'submissionEndsAt'>) {
  return round.submissionEndsAt ?? round.endsAt;
}

export function getVisibleDeadline(round: Pick<Round, 'endsAt'>) {
  return round.endsAt;
}

export function getEffectiveTimerState(
  round: Pick<Round, 'timerState' | 'endsAt' | 'submissionEndsAt'>,
  now = Date.now(),
) {
  if (round.timerState === 'running') {
    const submissionDeadline = parseTimestamp(getFinalSubmissionDeadline(round));
    if (submissionDeadline !== null && now >= submissionDeadline) {
      return 'expired' as const;
    }
  }

  return round.timerState;
}

export function getParticipantTimerPhase(
  round: Pick<Round, 'timerState' | 'endsAt' | 'submissionEndsAt'>,
  now = Date.now(),
): ParticipantTimerPhase {
  const timerState = getEffectiveTimerState(round, now);
  if (timerState === 'idle' || timerState === 'paused' || timerState === 'expired') {
    return timerState;
  }

  const visibleDeadline = parseTimestamp(getVisibleDeadline(round));
  const finalDeadline = parseTimestamp(getFinalSubmissionDeadline(round));
  if (
    visibleDeadline !== null
    && finalDeadline !== null
    && now >= visibleDeadline
    && now < finalDeadline
  ) {
    return 'running-grace';
  }

  return 'running-visible';
}

export function isRoundPlayable(
  round: Pick<Round, 'status' | 'timerState' | 'endsAt' | 'submissionEndsAt'>,
  sequentiallyAvailable: boolean,
  now = Date.now(),
) {
  return round.status === 'open'
    && sequentiallyAvailable
    && getEffectiveTimerState(round, now) === 'running';
}

export function deriveParticipantRoundStatus(params: {
  round: Pick<Round, 'status' | 'timerState' | 'endsAt' | 'submissionEndsAt'>;
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

  if (submission?.status === 'accepted') {
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
