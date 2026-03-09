import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';

interface TimerBannerProps {
    roundId: string;
}

export const TimerBanner: React.FC<TimerBannerProps> = ({ roundId }) => {
    const { roundsProgress, updateTimeRemaining, submitRound } = useAppStore();
    const progress = roundsProgress[roundId];
    const navigate = useNavigate();

    // Local state for smoother re-renders
    const [timeLeft, setTimeLeft] = useState<number | null>(progress?.timeRemainingMs || null);

    useEffect(() => {
        if (!progress || progress.status === 'submitted' || !progress.timeRemainingMs) return;

        // Fast sync with global store initial
        setTimeLeft(progress.timeRemainingMs);

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null) return null;
                const nextTime = Math.max(0, prev - 1000);

                // Sync to store every 5 seconds to reduce writes, or when near end
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
    }, [roundId, progress?.status, progress?.timeRemainingMs, submitRound, updateTimeRemaining, navigate]);

    if (progress?.status === 'submitted') {
        return null;
    }

    if (timeLeft === null) {
        return null;
    }

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    const isWarning = timeLeft < 300000; // Under 5 minutes
    const isCritical = timeLeft < 60000; // Under 1 minute

    return (
        <div className={cn(
            "fixed top-0 left-0 w-full z-50 py-2 border-b shadow-md transition-colors",
            isCritical ? "bg-red-600 text-white border-red-700 font-bold" :
                isWarning ? "bg-yellow-400 text-yellow-900 border-yellow-500 font-bold" :
                    "bg-slate-800 text-white border-slate-900"
        )}>
            <div className="container flex items-center justify-center gap-2">
                {isWarning ? <AlertTriangle size={18} /> : <Clock size={18} />}
                <span className="text-sm tracking-wide">
                    {isCritical ? "TIME CRITICAL: " : isWarning ? "WARNING: " : "TIME REMAINING: "}
                </span>
                <span className="mono text-lg">
                    {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                </span>
            </div>
        </div>
    );
};
