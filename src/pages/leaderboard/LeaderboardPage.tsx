import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockLeaderboard } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Trophy, ArrowLeft, Clock, Target, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

export const LeaderboardPage: React.FC = () => {
    const { team } = useAppStore();
    const navigate = useNavigate();

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
                    <div className="grid grid-cols-[80px_1fr_120px_140px_140px] bg-slate-900/60 border-b border-border px-8 py-5">
                        {['Rank', 'Designation', 'Integrity Score', 'Cases Resolved', 'Last Signal'].map((h, i) => (
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
                        {mockLeaderboard.map((entry) => {
                            const isCurrentTeam = team?.id === entry.teamId || team?.name === entry.teamName;
                            const isTop3 = entry.rank <= 3;

                            return (
                                <div
                                    key={entry.teamId}
                                    className={cn(
                                        'grid grid-cols-[80px_1fr_120px_140px_140px] px-8 py-6 items-center transition-all group',
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
                                                {entry.teamName}
                                            </span>
                                            {isCurrentTeam && (
                                                <span className="text-[0.55rem] font-mono font-bold uppercase tracking-[0.3em] text-primary">
                                                    Authorised_Entity_Local
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div className="text-center">
                                        <span className={cn(
                                            'text-xl font-black font-mono tracking-tighter',
                                            isTop3 ? 'text-white' : 'text-slate-300'
                                        )}>
                                            {entry.points.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Solved Status */}
                                    <div className="flex justify-center">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-secondary/30 border border-border">
                                            <Target size={14} className="text-primary/60" />
                                            <span className="text-xs font-black font-mono text-slate-300">
                                                {entry.roundsCompleted}/03
                                            </span>
                                        </div>
                                    </div>

                                    {/* Last Active Timestamp */}
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1.5 text-[0.65rem] font-mono font-black text-muted-foreground uppercase tracking-widest">
                                            <Clock size={12} />
                                            <span>{formatTimeAgo(entry.latestSubmissionTime)}</span>
                                        </div>
                                        <div className="w-24 h-1 bg-secondary rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary/40" 
                                                style={{ width: `${(entry.roundsCompleted / 3) * 100}%` }} 
                                            />
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
