import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock3,
  Edit3,
  KeyRound,
  Lock,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Save,
  TimerReset,
  Unlock,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store/useAppStore';
import { getEffectiveTimerState } from '../../lib/roundState';
import type { AdminRoundAction } from '../../types';

const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-colors focus:border-primary';
const labelClass = 'mb-2 block text-[0.68rem] font-black uppercase tracking-[0.2em] text-slate-400';

export const AdminRoundManager: React.FC = () => {
  const { rounds, updateRound, runAdminRoundAction, error, serverTimeOffsetMs } = useAppStore();
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [editCaseBrief, setEditCaseBrief] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [zipPassword, setZipPassword] = useState('');
  const [timerMinutes, setTimerMinutes] = useState('');
  const [now, setNow] = useState(() => Date.now() + serverTimeOffsetMs);

  useEffect(() => {
    if (!selectedRoundId && rounds[0]) {
      setSelectedRoundId(rounds[0].id);
    }
  }, [rounds, selectedRoundId]);

  const activeRound = rounds.find((round) => round.id === selectedRoundId) ?? rounds[0];

  useEffect(() => {
    if (!activeRound) {
      return;
    }

    setEditTitle(activeRound.title);
    setEditObjective(activeRound.objective);
    setEditCaseBrief(activeRound.caseBrief);
    setEditDescription(activeRound.description);
    setZipPassword(activeRound.zipPassword ?? '');
    setTimerMinutes(String(activeRound.timerMinutes));
  }, [activeRound]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setNow(Date.now() + serverTimeOffsetMs);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeRound?.endsAt, activeRound?.timerState, serverTimeOffsetMs]);

  useEffect(() => {
    if (!activeRound || activeRound.timerState !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now() + serverTimeOffsetMs);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeRound, serverTimeOffsetMs]);

  if (!activeRound) {
    return null;
  }

  const effectiveTimerState = getEffectiveTimerState(activeRound, now);
  const isUnlocked = activeRound.status === 'open';
  const remainingSeconds = effectiveTimerState === 'running' && activeRound.endsAt
    ? Math.max(0, Math.floor((new Date(activeRound.endsAt).getTime() - now) / 1000))
    : activeRound.timerRemainingSeconds ?? activeRound.timerDurationSeconds;
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingDisplaySeconds = remainingSeconds % 60;
  const isResetState = effectiveTimerState === 'idle'
    && activeRound.startsAt === null
    && activeRound.endsAt === null
    && (activeRound.timerRemainingSeconds ?? activeRound.timerDurationSeconds) === activeRound.timerDurationSeconds;

  const beginContentEdit = () => {
    setEditTitle(activeRound.title);
    setEditObjective(activeRound.objective);
    setEditCaseBrief(activeRound.caseBrief);
    setEditDescription(activeRound.description);
    setIsEditingContent(true);
  };

  const saveContent = async () => {
    setIsSavingContent(true);
    try {
      await updateRound(activeRound.id, {
        title: editTitle,
        description: editDescription,
        objective: editObjective,
        caseBrief: editCaseBrief,
      });
      setIsEditingContent(false);
    } finally {
      setIsSavingContent(false);
    }
  };

  const savePassword = async () => {
    setIsSavingPassword(true);
    try {
      await updateRound(activeRound.id, {
        zipPassword: zipPassword.trim() || null,
      });
      setIsEditingPassword(false);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleRoundAction = async (
    action: AdminRoundAction,
    payload?: { timerMinutes?: number },
  ) => {
    setIsRunningAction(true);
    try {
      await runAdminRoundAction(activeRound.id, action, payload);
    } finally {
      setIsRunningAction(false);
    }
  };

  const actionCards = [
    {
      label: isUnlocked ? 'Lock Round' : 'Unlock Round',
      description: isUnlocked ? 'Participants keep completed submissions visible, but new access is blocked.' : 'Expose the round card and allow timer control.',
      icon: isUnlocked ? <Lock size={16} /> : <Unlock size={16} />,
      disabled: isRunningAction,
      onClick: () => void handleRoundAction(isUnlocked ? 'lock_round' : 'unlock_round'),
      className: isUnlocked
        ? 'border-red-500/20 bg-red-500/10 text-red-100 hover:border-red-400/40'
        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/40',
    },
    {
      label: 'Start / Resume',
      description: effectiveTimerState === 'paused'
        ? 'Continues a paused timer from the remaining time.'
        : 'Starts a fresh timer from the configured default duration.',
      icon: <PlayCircle size={16} />,
      disabled: !isUnlocked || isRunningAction || !['idle', 'expired', 'paused'].includes(effectiveTimerState),
      onClick: () => void handleRoundAction('start_timer'),
      className: 'border-primary/20 bg-primary/10 text-slate-100 hover:border-primary/40',
    },
    {
      label: 'Pause Timer',
      description: 'Freezes the active timer and preserves the remaining time.',
      icon: <PauseCircle size={16} />,
      disabled: !isUnlocked || isRunningAction || effectiveTimerState !== 'running',
      onClick: () => void handleRoundAction('pause_timer'),
      className: 'border-amber-500/20 bg-amber-500/10 text-amber-100 hover:border-amber-400/40',
    },
    {
      label: 'Reset Round',
      description: 'Returns the timer to idle and restores the full default duration.',
      icon: <RotateCcw size={16} />,
      disabled: isRunningAction || isResetState,
      onClick: () => void handleRoundAction('reset_round'),
      className: 'border-sky-500/20 bg-sky-500/10 text-sky-100 hover:border-sky-400/40',
    },
  ];

  return (
    <motion.div
      className="mx-auto flex max-w-6xl flex-col gap-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
        <p className="case-label mb-2">Round Command</p>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">Round Control Center</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Locking, timer actions, and duration changes now run through server-validated round actions so the admin panel always refreshes from canonical state.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="px-3 pb-3 text-[0.68rem] font-black uppercase tracking-[0.2em] text-slate-400">Select Round</p>
          <div className="space-y-2">
            {rounds.map((round) => {
              const isSelected = round.id === activeRound.id;
              const roundTimerState = getEffectiveTimerState(round);

              return (
                <button
                  key={round.id}
                  onClick={() => setSelectedRoundId(round.id)}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-3 text-left transition-colors',
                    isSelected
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{round.title}</p>
                      <p className="mt-1 text-[0.62rem] font-mono uppercase tracking-[0.2em] text-slate-400">
                        {round.status === 'open' ? 'Unlocked' : 'Locked'} / {roundTimerState}
                      </p>
                    </div>
                    <div className="rounded-full border border-slate-700 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-300">
                      {round.questionCount}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-slate-400">Selected Round</p>
                <h2 className="mt-2 text-2xl font-black text-white">{activeRound.title}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">{activeRound.description}</p>
              </div>

              <div className="grid min-w-[280px] gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-500">Round Status</p>
                  <p className="mt-2 text-lg font-black text-white">{isUnlocked ? 'Unlocked' : 'Locked'}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-500">Timer</p>
                  <p className="mt-2 text-lg font-black capitalize text-white">{effectiveTimerState}</p>
                  <p className="mt-1 text-xs font-mono text-slate-400">
                    {remainingMinutes.toString().padStart(2, '0')}:{remainingDisplaySeconds.toString().padStart(2, '0')} remaining
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {actionCards.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45',
                  action.className,
                )}
              >
                <div className="flex items-center gap-2 text-sm font-black text-inherit">
                  {action.icon}
                  <span>{action.label}</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-inherit/80">{action.description}</p>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-slate-400">Default Timer Duration</p>
                <p className="mt-2 text-sm text-slate-400">
                  This stays the admin-set default and resets the current timer window to the new duration.
                </p>
              </div>
              <div className="flex w-full max-w-md gap-3">
                <div className="flex-1">
                  <label className={labelClass}>Minutes</label>
                  <input
                    type="number"
                    min="1"
                    value={timerMinutes}
                    onChange={(event) => setTimerMinutes(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  onClick={() => void handleRoundAction('set_timer_duration', { timerMinutes: Number(timerMinutes) })}
                  disabled={!isUnlocked || isRunningAction}
                  className="inline-flex h-[46px] items-center justify-center gap-2 self-end rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-black text-white transition-colors hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <TimerReset size={16} />
                  Apply
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/60">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <div>
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-slate-400">Round Content</p>
                  <h3 className="mt-1 text-lg font-black text-white">Narrative and objectives</h3>
                </div>
                {!isEditingContent ? (
                  <button
                    onClick={beginContentEdit}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-200 transition-colors hover:border-slate-600"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingContent(false)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-300"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      onClick={() => void saveContent()}
                      disabled={isSavingContent}
                      className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-black text-white disabled:opacity-45"
                    >
                      <Save size={14} />
                      {isSavingContent ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className={labelClass}>Title</label>
                  {isEditingContent ? (
                    <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className={inputClass} />
                  ) : (
                    <p className="text-sm text-slate-100">{activeRound.title}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  {isEditingContent ? (
                    <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className={cn(inputClass, 'min-h-[90px] resize-y')} />
                  ) : (
                    <p className="text-sm leading-relaxed text-slate-300">{activeRound.description || 'No description set.'}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Objective</label>
                  {isEditingContent ? (
                    <textarea value={editObjective} onChange={(event) => setEditObjective(event.target.value)} className={cn(inputClass, 'min-h-[90px] resize-y')} />
                  ) : (
                    <p className="text-sm leading-relaxed text-slate-300">{activeRound.objective || 'No objective set.'}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Case Brief</label>
                  {isEditingContent ? (
                    <textarea value={editCaseBrief} onChange={(event) => setEditCaseBrief(event.target.value)} className={cn(inputClass, 'min-h-[180px] resize-y')} />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{activeRound.caseBrief || 'No case brief set.'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/60">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                <div>
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-slate-400">ZIP Access</p>
                  <h3 className="mt-1 text-lg font-black text-white">Offline archive password</h3>
                </div>
                {!isEditingPassword ? (
                  <button
                    onClick={() => {
                      setZipPassword(activeRound.zipPassword ?? '');
                      setIsEditingPassword(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-200 transition-colors hover:border-slate-600"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditingPassword(false)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-300"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      onClick={() => void savePassword()}
                      disabled={isSavingPassword}
                      className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-black text-white disabled:opacity-45"
                    >
                      <Save size={14} />
                      {isSavingPassword ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-white">
                    <Clock3 size={16} className="text-primary" />
                    <span>Current timer snapshot</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">
                    State: <span className="font-black capitalize text-white">{effectiveTimerState}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Remaining: <span className="font-mono text-white">{remainingMinutes.toString().padStart(2, '0')}:{remainingDisplaySeconds.toString().padStart(2, '0')}</span>
                  </p>
                </div>

                <div>
                  <label className={labelClass}>ZIP Password</label>
                  {isEditingPassword ? (
                    <input
                      value={zipPassword}
                      onChange={(event) => setZipPassword(event.target.value)}
                      placeholder="Enter the ZIP password for this round"
                      className={inputClass}
                    />
                  ) : activeRound.zipPassword ? (
                    <div className="flex items-center gap-2 break-all rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200">
                      <KeyRound size={15} className="shrink-0 text-primary" />
                      <span className="font-mono tracking-[0.12em]">{activeRound.zipPassword}</span>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
                      No ZIP password configured yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
