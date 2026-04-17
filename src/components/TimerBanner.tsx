import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, PauseCircle, Lock, Radar } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '@/lib/utils';
import { getParticipantTimerPhase } from '../lib/roundState';

interface TimerBannerProps {
    roundId: string;
}

export const TimerBanner: React.FC<TimerBannerProps> = ({ roundId }) => {
    const { rounds, roundsProgress, recomputeParticipantState, serverTimeOffsetMs } = useAppStore();
    const progress = roundsProgress[roundId];
    const round = rounds.find((item) => item.id === roundId);
    const [now, setNow] = useState(() => Date.now() + serverTimeOffsetMs);
    const timerPhase = round ? getParticipantTimerPhase(round, now) : null;
    const visibleTimeLeftSeconds = timerPhase?.startsWith('running') && round?.endsAt
        ? Math.max(0, Math.floor((new Date(round.endsAt).getTime() - now) / 1000))
        : round?.timerRemainingSeconds ?? null;
    const graceTimeLeftSeconds = timerPhase === 'running-grace' && round?.submissionEndsAt
        ? Math.max(0, Math.floor((new Date(round.submissionEndsAt).getTime() - now) / 1000))
        : round?.submissionRemainingSeconds ?? null;
    const pausedTimeLeftSeconds = round?.submissionRemainingSeconds ?? round?.timerRemainingSeconds ?? null;

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setNow(Date.now() + serverTimeOffsetMs);
        }, 0);
        return () => window.clearTimeout(timeout);
    }, [round?.endsAt, round?.submissionEndsAt, round?.timerState, serverTimeOffsetMs]);

    useEffect(() => {
        if (!round || progress?.status === 'submitted') return;

        const interval = setInterval(() => {
            const nextNow = Date.now() + serverTimeOffsetMs;
            setNow(nextNow);
            if (round.submissionEndsAt && round.timerState === 'running') {
                const nextTime = Math.max(0, new Date(round.submissionEndsAt).getTime() - nextNow);
                if (nextTime === 0) {
                    clearInterval(interval);
                    recomputeParticipantState();
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [progress?.status, recomputeParticipantState, round, roundId, serverTimeOffsetMs]);

    if (progress?.status === 'submitted' || !round) return null;

    // ── Locked ──
    if (progress?.status === 'locked') {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-slate-900/80">
                <Lock size={11} className="text-slate-400 shrink-0" />
                <span className="text-[0.55rem] font-black font-mono text-slate-400 uppercase tracking-widest">Locked</span>
            </div>
        );
    }

    // ── Idle ──
    if (timerPhase === 'idle') {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-slate-900/80">
                <Radar size={11} className="text-primary shrink-0" />
                <span className="text-[0.55rem] font-black font-mono text-slate-300 uppercase tracking-widest">Awaiting Start</span>
            </div>
        );
    }

    // ── Paused ──
    if (timerPhase === 'paused') {
        const minutes = Math.floor((pausedTimeLeftSeconds ?? 0) / 60);
        const seconds = Math.floor((pausedTimeLeftSeconds ?? 0) % 60);
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10">
                <PauseCircle size={11} className="text-amber-400 shrink-0" />
                <span className="text-[0.55rem] font-black font-mono text-amber-300 uppercase tracking-widest">Paused</span>
                <span className="text-[0.55rem] opacity-40 font-mono">|</span>
                <span className="font-mono text-[0.85rem] font-black text-amber-200 tracking-widest">
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </span>
            </div>
        );
    }

    // ── Expired ──
    if (timerPhase === 'expired') {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-700 bg-red-600/90">
                <AlertTriangle size={11} className="text-white shrink-0" />
                <span className="text-[0.55rem] font-black font-mono text-white uppercase tracking-widest">Expired</span>
            </div>
        );
    }

    if (timerPhase === 'running-grace') {
        const graceSeconds = graceTimeLeftSeconds ?? 0;
        const minutes = Math.floor(graceSeconds / 60);
        const seconds = Math.floor(graceSeconds % 60);

        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-700 bg-red-600/90 text-white">
                <AlertTriangle size={11} className="shrink-0 animate-pulse" />
                <span className="text-[0.5rem] font-black font-mono uppercase tracking-widest opacity-80">
                    Grace
                </span>
                <span className="text-[0.5rem] opacity-30 font-mono">|</span>
                <span className="font-mono text-[0.85rem] font-black tracking-widest animate-pulse">
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </span>
            </div>
        );
    }

    if (visibleTimeLeftSeconds === null) return null;

    const minutes = Math.floor(visibleTimeLeftSeconds / 60);
    const seconds = Math.floor(visibleTimeLeftSeconds % 60);
    const isWarning = visibleTimeLeftSeconds < 300;
    const isCritical = visibleTimeLeftSeconds < 60;

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors duration-300",
            isCritical
                ? "bg-red-600/90 border-red-700 text-white"
                : isWarning
                    ? "bg-yellow-400/90 border-yellow-500 text-yellow-950"
                    : "bg-slate-900/90 border-slate-700 text-white"
        )}>
            {isWarning
                ? <AlertTriangle size={11} className="shrink-0" />
                : <Clock size={11} className="shrink-0" />
            }
            <span className="text-[0.5rem] font-black font-mono uppercase tracking-widest opacity-70">
                {isCritical ? "CRITICAL" : isWarning ? "WARNING" : "TIME"}
            </span>
            <span className="text-[0.5rem] opacity-30 font-mono">|</span>
            <span className={cn("font-mono text-[0.85rem] font-black tracking-widest", isCritical && "animate-pulse")}>
                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
        </div>
    );
};
