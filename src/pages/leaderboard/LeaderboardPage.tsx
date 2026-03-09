import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockLeaderboard } from '../../data/mockData';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Trophy, ArrowLeft, Clock, Target } from 'lucide-react';
import { cn } from '../../utils/cn';

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

    return (
        <div className="container py-8 animate-fade-in">
            <div className="max-w-4xl mx-auto">

                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-3 rounded-xl text-white">
                            <Trophy size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Global Leaderboard</h2>
                            <p className="text-slate-500 text-sm">Top Investigators Ranking</p>
                        </div>
                    </div>

                    <Button variant="outline" onClick={() => navigate('/dashboard')} className="hidden md:flex">
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                {/* Global Rankings List */}
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-4 px-6 font-semibold text-slate-600 text-sm">Rank</th>
                                    <th className="py-4 px-6 font-semibold text-slate-600 text-sm">Team Name</th>
                                    <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">Score</th>
                                    <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">Cases Solved</th>
                                    <th className="py-4 px-6 font-semibold text-slate-600 text-sm hidden sm:table-cell">Last Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {mockLeaderboard.map((entry) => {
                                    const isCurrentTeam = team?.id === entry.teamId || team?.name === entry.teamName;

                                    return (
                                        <tr
                                            key={entry.teamId}
                                            className={cn(
                                                "transition-colors hover:bg-slate-50",
                                                isCurrentTeam ? "bg-blue-50/50" : ""
                                            )}
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 font-bold text-slate-700 text-sm">
                                                    {entry.rank}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "font-semibold text-base",
                                                        isCurrentTeam ? "text-blue-700" : "text-slate-900"
                                                    )}>
                                                        {entry.teamName}
                                                    </span>
                                                    {isCurrentTeam && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">You</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="font-bold text-slate-900">{entry.points}</span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="inline-flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">
                                                    <Target size={14} className="text-slate-500" />
                                                    <span className="font-medium text-slate-700 text-sm">{entry.roundsCompleted}/3</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 hidden sm:table-cell">
                                                <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                                                    <Clock size={14} />
                                                    <span>{formatTimeAgo(entry.latestSubmissionTime)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Mobile Back Button */}
                <div className="mt-6 md:hidden">
                    <Button variant="outline" fullWidth onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

            </div>
        </div>
    );
};
