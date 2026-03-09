import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Trophy, LayoutDashboard, Crown } from 'lucide-react';
import { mockLeaderboard } from '../../data/mockData';
import { useAppStore } from '../../store/useAppStore';

export const CompetitionCompletePage: React.FC = () => {
    const navigate = useNavigate();
    const { team } = useAppStore();

    const userRankEntry = mockLeaderboard.find(l => l.teamId === team?.id || l.teamName === team?.name);
    // Default mock entry if team not in static mock data
    const finalScore = userRankEntry?.points || 240;
    const finalRank = userRankEntry?.rank || 4;

    return (
        <div className="container flex items-center justify-center min-h-[85vh] py-8 animate-fade-in">
            <Card className="w-full max-w-2xl text-center border-0 shadow-[0_20px_50px_rgba(15,23,42,0.1)] overflow-hidden">

                {/* Dynamic header background effect */}
                <div className="bg-slate-900 pt-16 pb-12 px-6 relative">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{
                        backgroundImage: 'radial-gradient(circle at 50% 100%, #ffffff 0%, transparent 60%)'
                    }}></div>

                    <div className="bg-yellow-400 text-yellow-900 inset-0 mx-auto w-20 h-20 flex items-center justify-center rounded-full mb-6 ring-8 ring-slate-800 relative z-10 shadow-xl">
                        <Trophy size={40} />
                    </div>

                    <h1 className="text-4xl font-black text-white mb-2 relative z-10 uppercase tracking-tight">Mission Accomplished</h1>
                    <p className="text-slate-300 text-lg font-medium relative z-10">All corporate crises investigated.</p>
                </div>

                <CardBody className="px-8 py-10 flex flex-col items-center bg-white">
                    <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
                        Outstanding work, <strong>{team?.name || 'Investigator'}</strong>. Your team has successfully reviewed all evidence datasets, navigated complex business challenges, and provided strategic findings to the leadership board.
                    </p>

                    <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-10">
                        <div className="bg-slate-50 rounded-xl p-6 border-b-4 border-slate-300">
                            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Final Score</span>
                            <span className="block text-3xl font-black text-slate-900">{finalScore}</span>
                            <span className="text-xs text-slate-400">PTS</span>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-6 border-b-4 border-blue-200">
                            <span className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                                <Crown size={14} className="mb-0.5" /> Global Rank
                            </span>
                            <span className="block text-3xl font-black text-blue-900">#{finalRank}</span>
                            <span className="text-xs text-blue-500">Tier 1</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                        <Button
                            variant="outline"
                            className="flex-1 py-3 text-base"
                            onClick={() => navigate('/dashboard')}
                        >
                            <LayoutDashboard size={18} className="mr-2" />
                            Return Home
                        </Button>

                        <Button
                            variant="primary"
                            className="flex-1 py-3 text-base"
                            onClick={() => navigate('/leaderboard')}
                        >
                            Global Rankings
                            <Trophy size={18} className="ml-2" />
                        </Button>
                    </div>
                </CardBody>

            </Card>
        </div>
    );
};
