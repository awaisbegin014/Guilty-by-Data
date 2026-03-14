import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '@/lib/utils';

interface TimerBannerProps {
    roundId: string;
}

export const TimerBanner: React.FC<TimerBannerProps> = ({ roundId }) => {
    const { roundsProgress, updateTimeRemaining, submitRound } = useAppStore();
    const progress = roundsProgress[roundId];
    const navigate = useNavigate();

    const [timeLeft, setTimeLeft] = useState<number | null>(progress?.timeRemainingMs || null);

    useEffect(() => {
        if (!progress || progress.status === 'submitted') return;
        if (progress.timeRemainingMs === null) return;

        if (timeLeft === null || Math.abs(progress.timeRemainingMs - timeLeft) > 6000) {
            setTimeLeft(progress.timeRemainingMs);
        }

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null) return null;
                const nextTime = Math.max(0, prev - 1000);

                if (nextTime % 5000 === 0 || nextTime <= 5000) {
                    updateTimeRemaining(roundId, nextTime);
                }

                if (nextTime === 0) {
                    clearInterval(interval);
                    submitRound(roundId);
                    navigate(`/round/${roundId}/submitted`);
                }

                return nextTime;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [roundId, progress, submitRound, updateTimeRemaining, navigate, timeLeft]);

    if (progress?.status === 'submitted' || timeLeft === null) {
        return null;
    }

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    const isWarning = timeLeft < 300000;
    const isCritical = timeLeft < 60000;

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
