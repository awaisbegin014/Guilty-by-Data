import { competitionConfig } from '../config/competitionConfig';
import type { Round, RoundProgress } from '../types';

export function getRoundDisplayNumber(orderIndex: number) {
  if (!Number.isFinite(orderIndex)) {
    return 1;
  }

  const normalized = Math.trunc(orderIndex);
  return Math.max(1, normalized >= 1 ? normalized : normalized + 1);
}

export function formatRoundPhaseLabel(orderIndex: number) {
  return `Phase ${String(getRoundDisplayNumber(orderIndex)).padStart(2, '0')}`;
}

export function formatRoundShortCode(orderIndex: number) {
  return `P_${String(getRoundDisplayNumber(orderIndex)).padStart(2, '0')}`;
}

export function formatRoundSystemLabel(orderIndex: number) {
  return `Round_${String(getRoundDisplayNumber(orderIndex)).padStart(2, '0')}`;
}

export function getLockedRoundPresentation(
  round: Pick<Round, 'status'>,
  status: RoundProgress['status'],
) {
  if (status !== 'locked') {
    return null;
  }

  if (round.status === 'open' && competitionConfig.sequentialRoundUnlock) {
    return {
      badge: 'PRIOR PHASE',
      buttonLabel: 'Complete Prior Phase',
      description: 'Submit the previous phase first to unlock this case file.',
      accent: 'border-amber-500/20 bg-amber-500/[0.04]',
      iconClass: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    };
  }

  if (round.status === 'draft') {
    return {
      badge: 'HIDDEN',
      buttonLabel: 'Awaiting Unlock',
      description: 'Admins have not opened this round yet.',
      accent: 'opacity-60 cursor-not-allowed grayscale bg-slate-900/10 border-border/30',
      iconClass: 'bg-slate-800/50 border-border text-muted-foreground/50',
    };
  }

  return {
    badge: 'LOCKED',
    buttonLabel: 'Access Restricted',
    description: 'Admins have locked this round for new analysis.',
    accent: 'opacity-60 cursor-not-allowed grayscale bg-slate-900/10 border-border/30',
    iconClass: 'bg-slate-800/50 border-border text-muted-foreground/50',
  };
}
