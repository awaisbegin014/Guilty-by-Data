import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, ArrowRight, Shield, Database, PauseCircle, AlertTriangle, Radar } from 'lucide-react';
import type { Round, RoundProgress } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';
import { formatRoundPhaseLabel, getLockedRoundPresentation } from '../lib/roundPresentation';

interface RoundCardProps {
  round: Round;
  progress?: RoundProgress;
  isLocked?: boolean;
}

type StatusMeta = {
  badge: string;
  icon: React.ReactNode;
  accent: string;
  iconClass: string;
  buttonLabel: string;
};

const statusMap: Record<Exclude<RoundProgress['status'], 'locked'>, StatusMeta> = {
  submitted: {
    badge: 'RESOLVED',
    icon: <CheckCircle2 size={16} />,
    accent: 'border-emerald-500/20 bg-emerald-500/[0.01]',
    iconClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
    buttonLabel: 'Review Submission',
  },
  available: {
    badge: 'LIVE',
    icon: <Shield size={16} />,
    accent: '',
    iconClass: 'bg-slate-800 border-border text-primary shadow-inner-glow',
    buttonLabel: 'Open Case',
  },
  in_progress: {
    badge: 'IN PROGRESS',
    icon: <Shield size={16} />,
    accent: 'border-primary/20 bg-primary/[0.02]',
    iconClass: 'bg-primary/10 border-primary/20 text-primary',
    buttonLabel: 'Resume Analysis',
  },
  not_started: {
    badge: 'STANDBY',
    icon: <Radar size={16} />,
    accent: 'bg-slate-900/10 border-border/30',
    iconClass: 'bg-slate-800/50 border-border text-slate-300',
    buttonLabel: 'Awaiting Start',
  },
  paused: {
    badge: 'PAUSED',
    icon: <PauseCircle size={16} />,
    accent: 'bg-amber-500/[0.04] border-amber-500/20',
    iconClass: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    buttonLabel: 'Timer Paused',
  },
  expired: {
    badge: 'EXPIRED',
    icon: <AlertTriangle size={16} />,
    accent: 'bg-red-500/[0.04] border-red-500/20',
    iconClass: 'bg-red-500/10 border-red-500/20 text-red-300',
    buttonLabel: 'Window Closed',
  },
};

export const RoundCard: React.FC<RoundCardProps> = ({ round, progress, isLocked }) => {
  const navigate = useNavigate();

  const status = progress?.status || 'locked';
  const isCompleted = status === 'submitted';
  const isPlayable = status === 'available' || status === 'in_progress';
  const isHardLocked = status === 'locked' || isLocked;
  const lockedPresentation = getLockedRoundPresentation(round, status);

  const handleAction = () => {
    if (isCompleted) {
      navigate(`/round/${round.id}/submitted`);
      return;
    }

    if (!isPlayable) return;
    navigate(`/round/${round.id}`);
  };

  const statusMeta: StatusMeta = status === 'locked' && lockedPresentation
    ? {
      badge: lockedPresentation.badge,
      icon: <Lock size={16} />,
      accent: lockedPresentation.accent,
      iconClass: lockedPresentation.iconClass,
      buttonLabel: lockedPresentation.buttonLabel,
    }
    : statusMap[status as Exclude<RoundProgress['status'], 'locked'>];

  const descriptionText = status === 'locked' && lockedPresentation
    ? lockedPresentation.description
    : round.description;

  return (
    <div
      onClick={handleAction}
      className={cn(
        'dossier-card group relative flex flex-col gap-6 overflow-hidden rounded-xl p-6 transition-all duration-300 md:p-8 sm:flex-row sm:items-center',
        isHardLocked || !isPlayable
          ? 'cursor-default'
          : 'border-[#2d333a] bg-[#181a1e] hover:border-primary/40 hover:bg-[#1c2025] hover:shadow-2xl hover:shadow-primary/5 active:scale-[0.99]',
        statusMeta.accent,
      )}
    >
      <div className="absolute bottom-0 left-0 top-0 w-1 bg-border transition-colors group-hover:bg-primary" />

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300',
                statusMeta.iconClass,
              )}
            >
              {statusMeta.icon}
            </div>
            <span className="case-label text-[0.6rem]">{formatRoundPhaseLabel(round.orderIndex)}</span>
          </div>
          <Badge
            variant={isCompleted ? 'success' : status === 'expired' || (status === 'locked' && round.status === 'open') ? 'warning' : status === 'paused' ? 'warning' : status === 'locked' ? 'outline' : 'info'}
            className={cn(
              'text-[0.6rem] font-black tracking-widest',
              status === 'locked' && round.status !== 'open' && 'opacity-60',
            )}
          >
            {statusMeta.badge}
          </Badge>
        </div>

        <h3 className="mb-3 text-2xl font-black uppercase leading-none tracking-tighter text-white transition-colors group-hover:text-primary">
          {round.title}
        </h3>

        <p className="max-w-2xl text-[0.85rem] font-medium leading-relaxed text-slate-400 sm:line-clamp-2">
          {descriptionText}
        </p>
      </div>

      <div className="flex w-full flex-col gap-4 sm:h-full sm:w-auto sm:min-w-[220px] sm:items-end sm:border-l sm:border-border/50 sm:pl-8">
        <div className="flex items-center gap-2 text-[0.6rem] font-mono font-black uppercase tracking-widest text-muted-foreground">
          <Database size={12} className="text-primary/60" />
          <span>{round.questionCount} Data Nodes</span>
        </div>

        <Button
          variant={!isPlayable ? 'subtle' : 'primary'}
          size="sm"
          className={cn(
            'h-11 w-full rounded-lg px-5 text-[0.65rem] font-black uppercase tracking-[0.2em] transition-all duration-300 sm:w-auto sm:px-8',
            (isPlayable || isCompleted) && 'group-hover:translate-x-1',
          )}
        >
          {statusMeta.buttonLabel}
          {(isPlayable || isCompleted) && <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1" />}
        </Button>
      </div>
    </div>
  );
};
