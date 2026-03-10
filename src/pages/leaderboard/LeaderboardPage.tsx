import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockLeaderboard } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Trophy, ArrowLeft, Clock, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const LeaderboardPage: React.FC = () => {
    const { team } = useAppStore();
    const navigate = useNavigate();

    const formatTimeAgo = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const medalColors = (rank: number) => {
        if (rank === 1) return 'bg-yellow-100 text-amber-700 border-2 border-amber-400';
        if (rank === 2) return 'bg-slate-100 text-slate-600 border-2 border-slate-400';
        if (rank === 3) return 'bg-orange-50 text-orange-700 border-2 border-orange-400';
        return 'bg-muted text-muted-foreground border border-border';
    };

    return (
        <motion.div
            className="pt-8 pb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <div className="container max-w-[800px]">

                {/* Header */}
                <div className="flex items-end justify-between mb-7 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
                            <Trophy size={22} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
                                Global Leaderboard
                            </h2>
                            <p className="text-[0.82rem] text-muted-foreground mt-0.5">
                                Top Investigators Ranking
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={15} />
                        Dashboard
                    </Button>
                </div>

                {/* Table */}
                <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
                    {/* Table head */}
                    <div className="grid grid-cols-[64px_1fr_100px_90px_110px] bg-slate-50 border-b border-border px-5 py-3">
                        {['Rank', 'Team', 'Score', 'Solved', 'Last Active'].map((h, i) => (
                            <div key={i} className={cn(
                                'text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider',
                                i >= 2 && 'text-center'
                            )}>
                                {h}
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    {mockLeaderboard.map((entry, index) => {
                        const isCurrentTeam = team?.id === entry.teamId || team?.name === entry.teamName;

                        return (
                            <motion.div
                                key={entry.teamId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.06 }}
                                className={cn(
                                    'grid grid-cols-[64px_1fr_100px_90px_110px] px-5 py-4 items-center transition-colors duration-150',
                                    index < mockLeaderboard.length - 1 && 'border-b border-muted',
                                    isCurrentTeam ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                                )}
                            >
                                {/* Rank */}
                                <div>
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-[0.85rem] font-extrabold', medalColors(entry.rank))}>
                                        {entry.rank}
                                    </div>
                                </div>

                                {/* Team */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={cn(
                                        'text-[0.9rem] font-bold truncate',
                                        entry.rank <= 3 ? 'text-slate-900' : 'text-slate-700'
                                    )}>
                                        {entry.teamName}
                                    </span>
                                    {isCurrentTeam && (
                                        <span className="text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-600 text-white rounded-full shrink-0">
                                            You
                                        </span>
                                    )}
                                    {entry.rank === 1 && <Trophy size={13} className="text-amber-400 shrink-0" />}
                                </div>

                                {/* Score */}
                                <div className="text-center">
                                    <span className="text-lg font-extrabold text-slate-900">{entry.points}</span>
                                </div>

                                {/* Solved */}
                                <div className="text-center">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-border text-[0.82rem] font-semibold text-slate-700">
                                        <Target size={12} className="text-slate-500" />
                                        {entry.roundsCompleted}/3
                                    </div>
                                </div>

                                {/* Last Active */}
                                <div className="text-right flex items-center justify-end gap-1.5 text-[0.78rem] text-slate-400">
                                    <Clock size={12} />
                                    {formatTimeAgo(entry.latestSubmissionTime)}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Mobile back btn */}
                <div className="mt-6">
                    <Button variant="outline" onClick={() => navigate('/dashboard')} fullWidth>
                        <ArrowLeft size={15} />
                        Back to Dashboard
                    </Button>
                </div>

            </div>
        </motion.div>
    );
};
