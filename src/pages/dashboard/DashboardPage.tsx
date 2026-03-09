import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockRounds } from '../../data/mockData';
import { competitionConfig } from '../../config/competitionConfig';
import { Card, CardBody } from '../../components/ui/Card';
import { RoundCard } from '../../components/RoundCard';
import { Target, Clock, CheckCircle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
    const { unlockedRounds, roundsProgress } = useAppStore();
    const navigate = useNavigate();

    const completedRounds = Object.values(roundsProgress).filter((p) => p.status === 'submitted').length;
    const remainingRounds = competitionConfig.totalRounds - completedRounds;

    const handleRoundAction = (roundId: string) => {
        const progress = roundsProgress[roundId];
        if (progress?.status === 'submitted') {
            navigate(`/round/${roundId}/submitted`);
        } else {
            navigate(`/round/${roundId}`);
        }
    };

    return (
        <div className="container py-8 animate-fade-in">
            {/* Welcome Banner */}
            <h2 className="text-2xl font-bold mb-6">Investigator Dashboard</h2>

            <div className="flex flex-col gap-8">
                {/* Story Section - Full Width Top */}
                <Card className="bg-slate-900 text-white shadow-xl isolate relative overflow-hidden border-0">
                    <div className="absolute inset-0 bg-[#0f172a] opacity-90 z-0"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-900 z-10"></div>
                    <CardBody className="relative z-10 p-8 sm:p-10">
                        <div className="mb-6">
                            <span className="text-red-500 font-mono font-bold tracking-widest text-sm uppercase">Case File: #7492-Omega</span>
                            <h1 className="text-3xl sm:text-4xl font-bold mt-2 font-mono tracking-tight text-white drop-shadow-md">
                                THE ASHWORTH AFFAIR
                            </h1>
                        </div>

                        <div className="space-y-4 text-slate-300 leading-relaxed">
                            <p className="text-lg font-medium text-slate-100 border-l-2 border-red-500 pl-4">
                                CEO Richard Ashworth has been found dead. The physical evidence is entirely missing, but the digital trail remains.
                            </p>
                            <p>
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                            </p>
                            <p>
                                Your mission is to analyze the recovered corporate datasets across three investigation rounds. We need you to identify the suspect, uncover the hidden motive, and crack the encrypted alibis. Time is critical, investigator.
                            </p>
                        </div>
                    </CardBody>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Content (Left Area) */}
                    <div className="lg:col-span-3">

                        {/* Rounds List */}
                        <div>
                            <h3 className="font-bold text-xl uppercase tracking-wider text-slate-800 mb-6 font-mono flex items-center gap-2">
                                <Target className="text-red-600" size={24} />
                                Investigation Rounds
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {mockRounds.map((round, index) => {
                                    const isUnlocked = unlockedRounds.includes(round.id);
                                    const progress = roundsProgress[round.id];
                                    return (
                                        <RoundCard
                                            key={round.id}
                                            round={round}
                                            progress={progress}
                                            isUnlocked={isUnlocked}
                                            onAction={() => handleRoundAction(round.id)}
                                            roundIndex={index}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* Sidebar (Right Column) */}
                    <div className="lg:col-span-1 flex flex-col gap-6">

                        {/* Stats Summary */}
                        <Card>
                            <CardBody>
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Investigation Status</h3>

                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <Target size={18} />
                                            <span className="text-sm font-medium">Total Cases</span>
                                        </div>
                                        <span className="font-bold">{competitionConfig.totalRounds}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-success-text">
                                            <CheckCircle size={18} />
                                            <span className="text-sm font-medium">Resolved</span>
                                        </div>
                                        <span className="font-bold">{completedRounds}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Clock size={18} />
                                            <span className="text-sm font-medium">Pending</span>
                                        </div>
                                        <span className="font-bold">{remainingRounds}</span>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>



                    </div>
                </div>
            </div>
        </div>
    );
};
