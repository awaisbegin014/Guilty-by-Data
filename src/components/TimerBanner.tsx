import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '@/lib/utils';

interface TimerBannerProps {
    roundId: string;
}

export const TimerBanner: React.FC<TimerBannerProps> = ({ roundId }) => {
    const { rounds, roundsProgress } = useAppStore();
    const progress = roundsProgress[roundId];
    const round = rounds.find((item) => item.id === roundId);
    const navigate = useNavigate();
    const [now, setNow] = useState(() => Date.now());
    const timeLeft = round?.endsAt ? Math.max(0, new Date(round.endsAt).getTime() - now) : null;

    useEffect(() => {
        if (!round?.endsAt || progress?.status === 'submitted') {
            return;
        }

        const endTime = new Date(round.endsAt).getTime();

        const interval = setInterval(() => {
            const nextTime = Math.max(0, endTime - Date.now());
            setNow(Date.now());

            if (nextTime === 0 && progress?.status !== 'submitted') {
                clearInterval(interval);
                if (window.location.pathname.startsWith(`/round/${roundId}`)) {
                    navigate(`/round/${roundId}/submitted`);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [navigate, progress?.status, round?.endsAt, roundId]);

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
