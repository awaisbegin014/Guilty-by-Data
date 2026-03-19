import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, PauseCircle, Lock, Radar } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '@/lib/utils';
import { getEffectiveTimerState } from '../lib/roundState';

interface TimerBannerProps {
    roundId: string;
}

export const TimerBanner: React.FC<TimerBannerProps> = ({ roundId }) => {
    const { rounds, roundsProgress, recomputeParticipantState, serverTimeOffsetMs } = useAppStore();
    const progress = roundsProgress[roundId];
    const round = rounds.find((item) => item.id === roundId);
    const [now, setNow] = useState(() => Date.now() + serverTimeOffsetMs);
    const timerState = round ? getEffectiveTimerState(round, now) : null;
    const timeLeftSeconds = timerState === 'running' && round?.endsAt
        ? Math.max(0, Math.floor((new Date(round.endsAt).getTime() - now) / 1000))
        : round?.timerRemainingSeconds ?? null;

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setNow(Date.now() + serverTimeOffsetMs);
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [round?.endsAt, round?.timerState, serverTimeOffsetMs]);

    useEffect(() => {
        if (!round || progress?.status === 'submitted') {
            return;
        }

        const interval = setInterval(() => {
            const nextNow = Date.now() + serverTimeOffsetMs;
            setNow(nextNow);

            if (round.endsAt && round.timerState === 'running') {
                const nextTime = Math.max(0, new Date(round.endsAt).getTime() - nextNow);
                if (nextTime === 0) {
                    clearInterval(interval);
                    recomputeParticipantState();
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [progress?.status, recomputeParticipantState, round, roundId, serverTimeOffsetMs]);

    if (progress?.status === 'submitted' || !round) {
        return null;
    }

    if (progress?.status === 'locked') {
        return (
            <div className="container max-w-[700px] mt-2 mb-1 shrink-0">
                <div className="flex items-center justify-center gap-3 py-2 px-6 rounded-lg border border-border bg-slate-950/60 text-slate-300">
                    <Lock size={15} className="shrink-0" />
                    <span className="text-[0.65rem] tracking-[0.2em] font-black uppercase">
                        Round Locked
                    </span>
                </div>
            </div>
        );
    }

    if (timerState === 'idle') {
        return (
            <div className="container max-w-[700px] mt-2 mb-1 shrink-0">
                <div className="flex items-center justify-center gap-3 py-2 px-6 rounded-lg border border-border bg-slate-900/70 text-slate-200">
                    <Radar size={15} className="shrink-0 text-primary" />
                    <span className="text-[0.65rem] tracking-[0.2em] font-black uppercase">
                        Timer Not Started
                    </span>
                    <span className="text-[0.65rem] text-slate-400 uppercase tracking-wider">
                        Waiting for admin activation
                    </span>
                </div>
            </div>
        );
    }

    if (timerState === 'paused') {
        const minutes = Math.floor((timeLeftSeconds ?? 0) / 60);
        const seconds = Math.floor((timeLeftSeconds ?? 0) % 60);

        return (
            <div className="container max-w-[700px] mt-2 mb-1 shrink-0">
                <div className="flex items-center justify-center gap-3 py-2 px-6 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100">
                    <PauseCircle size={15} className="shrink-0" />
                    <span className="text-[0.65rem] tracking-[0.2em] font-black uppercase">
                        Timer Paused
                    </span>
                    <span className="mx-1 opacity-40">|</span>
                    <span className="font-mono text-[0.95rem] font-black tracking-widest">
                        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                    </span>
                </div>
            </div>
        );
    }

    if (timerState === 'expired') {
        return (
            <div className="container max-w-[700px] mt-2 mb-1 shrink-0">
                <div className="flex items-center justify-center gap-3 py-2 px-6 rounded-lg border border-red-700 bg-red-600 text-white shadow-red-900/20">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span className="text-[0.65rem] tracking-[0.2em] font-black uppercase">
                        Round Expired
                    </span>
                </div>
            </div>
        );
    }

    if (timeLeftSeconds === null) {
        return null;
    }

    const minutes = Math.floor(timeLeftSeconds / 60);
    const seconds = Math.floor(timeLeftSeconds % 60);
    const isWarning = timeLeftSeconds < 300;
    const isCritical = timeLeftSeconds < 60;

    return (
        <div className="container max-w-[700px] mt-2 mb-1 shrink-0">
            <div
                className={cn(
                    "flex items-center justify-center gap-3 py-2 px-6 rounded-lg border-2 shadow-lg transition-colors duration-300",
                    isCritical ? "bg-red-600 text-white border-red-700 shadow-red-900/20" :
                        isWarning ? "bg-yellow-400 text-yellow-950 border-yellow-500 shadow-yellow-900/10" :
                            "bg-slate-900 text-white border-slate-700 shadow-black/40"
                )}
            >
                {isWarning ? <AlertTriangle size={15} className="shrink-0" /> : <Clock size={15} className="shrink-0" />}
                <span className="text-[0.65rem] tracking-[0.2em] font-black uppercase">
                    {isCritical ? "TIME CRITICAL" : isWarning ? "WARNING" : "TIME REMAINING"}
                </span>
                <span className="mx-1 opacity-40">|</span>
                <span
                    className={cn(
                        "font-mono text-[0.95rem] font-black tracking-widest",
                        isCritical && "animate-pulse"
                    )}
                >
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </span>
            </div>
        </div>
    );
};
