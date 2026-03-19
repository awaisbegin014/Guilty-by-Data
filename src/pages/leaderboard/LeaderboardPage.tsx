import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { Trophy, ArrowLeft, Clock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatParticipantIdentifier } from '../../lib/teamIdentity';

const formatTimeAgo = (timestamp: string, now: number) => {
    const diff = Math.max(0, now - new Date(timestamp).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

const formatDuration = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
        return '--';
    }

    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const LeaderboardPage: React.FC = () => {
    const { team, leaderboard, serverTimeOffsetMs } = useAppStore();
    const navigate = useNavigate();
    const [now, setNow] = useState(() => Date.now() + serverTimeOffsetMs);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setNow(Date.now() + serverTimeOffsetMs);
        }, 0);

        return () => window.clearTimeout(timeout);
    }, [serverTimeOffsetMs]);

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now() + serverTimeOffsetMs);
        }, 30000);

        return () => clearInterval(interval);
    }, [serverTimeOffsetMs]);

    return (
        <div className="pt-8 pb-20">
            <div className="container max-w-[900px]">

                {/* Registry Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 pb-8 border-b border-border">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary shadow-inner-glow">
                            <Trophy size={28} />
                        </div>
                        <div>
                             <div className="flex items-center gap-2 mb-1.5">
                                 <Shield size={14} className="text-primary" />
                                 <span className="case-label">Official Registry</span>
                             </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                                Investigation Standings
                            </h2>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="w-full sm:w-auto font-black uppercase tracking-widest text-[0.7rem] px-5">
                        <ArrowLeft size={14} className="mr-2" />
                        Command Center
                    </Button>
                </div>

                {/* Standings Table/List */}
                <div className="dossier-card rounded-2xl overflow-hidden shadow-2xl">
                    {/* Header Columns */}
                    <div className="grid grid-cols-[80px_minmax(220px,1fr)_90px_90px_90px_110px_110px_110px] bg-slate-900/60 border-b border-border px-8 py-5">
                        {['Rank', 'Designation', 'R1', 'R2', 'R3', 'Total', 'Time', 'Updated'].map((h, i) => (
                            <div key={i} className={cn(
                                'text-[0.6rem] font-black text-muted-foreground uppercase tracking-[0.2em] font-mono',
                                i >= 2 && 'text-center'
                            )}>
                                {h}
                            </div>
                        ))}
                    </div>

                    {/* Registry Rows */}
                    <div className="divide-y divide-border">
                        {leaderboard.map((entry) => {
                            const isCurrentTeam = team?.id === entry.teamId || team?.name === entry.teamName;
                            const isTop3 = entry.rank <= 3;

                            return (
                                <div
                                    key={entry.teamId}
                                    className={cn(
                                        'grid grid-cols-[80px_minmax(220px,1fr)_90px_90px_90px_110px_110px_110px] px-8 py-6 items-center gap-2 transition-all group',
                                        isCurrentTeam ? 'bg-primary/5' : 'hover:bg-slate-900/30'
                                    )}
                                >
                                    {/* Rank */}
                                    <div className="flex justify-start">
                                        <div className={cn(
                                            'w-10 h-10 rounded border font-mono font-black text-sm flex items-center justify-center transition-all',
                                            isTop3 
                                                ? (entry.rank === 1 ? 'bg-primary text-white border-primary' : 'bg-secondary border-slate-600 text-white') 
                                                : 'bg-transparent border-border text-muted-foreground'
                                        )}>
                                            {entry.rank.toString().padStart(2, '0')}
                                        </div>
                                    </div>

                                    {/* Team Designation */}
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="flex flex-col">
                                            <span className={cn(
                                                'text-lg font-black uppercase tracking-tight truncate transition-colors',
                                                isCurrentTeam ? 'text-primary' : 'text-slate-200 group-hover:text-white'
                                            )}>
                                                {formatParticipantIdentifier(entry.username || entry.teamName)}
                                            </span>
                                            {isCurrentTeam && (
                                                <span className="text-[0.55rem] font-mono font-bold uppercase tracking-[0.3em] text-primary">
                                                    Authorised_Entity_Local
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {[entry.round1Score, entry.round2Score, entry.round3Score, entry.totalScore].map((score, idx) => (
                                        <div key={`${entry.teamId}-${idx}`} className="text-center">
                                            <span className={cn(
                                                idx === 3 ? 'text-xl' : 'text-base',
                                                'font-black font-mono tracking-tighter',
                                                isTop3 ? 'text-white' : 'text-slate-300'
                                            )}>
                                                {score.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}

                                    <div className="text-center">
                                        <span className="text-sm font-black font-mono tracking-tight text-slate-200">
                                            {formatDuration(entry.totalTimeSeconds)}
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1.5 text-[0.65rem] font-mono font-black text-muted-foreground uppercase tracking-widest">
                                            <Clock size={12} />
                                            <span>{formatTimeAgo(entry.updatedAt, now)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Notes */}
                <div className="mt-12 flex flex-col items-center gap-4 text-center">
                    <p className="case-label opacity-30">Investigation Registry v2.4a</p>
                    <p className="text-[0.58rem] font-mono font-black uppercase tracking-[0.24em] text-slate-500">
                        Tie-break: higher score first, lower total time second
                    </p>
                    <div className="flex items-center gap-6">
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-primary" />
                             <span className="text-[0.6rem] font-black text-muted-foreground uppercase tracking-[0.2em]">Live Feed Active</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500" />
                             <span className="text-[0.6rem] font-black text-muted-foreground uppercase tracking-[0.2em]">Sync: Nominal</span>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
