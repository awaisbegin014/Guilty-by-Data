import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { competitionConfig } from '../../config/competitionConfig';
import { RoundCard } from '../../components/RoundCard';
import { Target, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const DashboardPage: React.FC = () => {
    const { unlockedRounds, roundsProgress, rounds, team } = useAppStore();
    const navigate = useNavigate();

    const completedRounds = Object.values(roundsProgress).filter((p) => p.status === 'submitted').length;
    const inProgressRounds = Object.values(roundsProgress).filter((p) => p.status === 'in_progress').length;
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
        <motion.div
            className="pt-8 pb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <div className="container">

                {/* Story Banner */}
                <div className="bg-slate-900 rounded-2xl overflow-hidden mb-8 relative">
                    <div className="h-[3px] bg-gradient-to-r from-red-600 to-red-900" />

                    <div className="p-10 relative">
                        <div className="absolute right-0 top-0 bottom-0 w-[40%] bg-[radial-gradient(ellipse_at_right_center,rgba(220,38,38,0.05)_0%,transparent_70%)] pointer-events-none" />

                        <div className="relative">
                            <span className="font-mono text-[0.7rem] font-semibold text-red-600 uppercase tracking-[0.1em] block mb-2.5">
                                Case File #7492-Omega
                            </span>
                            <h1 className="font-mono text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold text-slate-50 mb-5 tracking-tight leading-none">
                                The Ashworth Affair
                            </h1>
                            <div className="flex flex-col gap-3.5 max-w-[640px]">
                                <p className="text-slate-100 text-[0.975rem] font-medium border-l-2 border-red-600 pl-3.5 leading-relaxed">
                                    CEO <span className="text-white font-semibold">Richard Ashworth</span> has been found dead under suspicious circumstances.
                                    The physical evidence has vanished — but the digital trail remains intact.
                                </p>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Ashworth Dynamics, a mid-sized analytics firm, has been rocked by a series of
                                    internal crises. Insider trading allegations, a falsified revenue report, and now
                                    this. The board needs answers fast. Three datasets have been recovered from
                                    the encrypted company servers.
                                </p>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Your mission: analyze the evidence across three investigation rounds,
                                    identify the suspect, uncover the hidden motive, and crack the encrypted alibis.
                                    Every minute counts, {team?.name || 'Investigator'}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-8 items-start">

                    {/* Round Cards */}
                    <div>
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Target size={14} />
                            Investigation Rounds
                        </h2>
                        <div className="flex flex-col gap-3.5">
                            {rounds.map((round, index) => {
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

                    {/* Status Sidebar */}
                    <motion.div
                        className="w-[200px]"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                            Status
                        </h2>
                        <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-sm">
                            {[
                                { label: 'Total Cases', value: competitionConfig.totalRounds, icon: <Target size={15} className="text-slate-500" />, color: 'text-slate-500' },
                                { label: 'Completed', value: completedRounds, icon: <CheckCircle size={15} className="text-green-600" />, color: 'text-green-600' },
                                { label: 'Remaining', value: remainingRounds, icon: <Clock size={15} className="text-slate-500" />, color: 'text-slate-500' },
                            ].map((item, i) => (
                                <div key={i} className={`px-[1.125rem] py-3.5 flex items-center justify-between ${i < 2 ? 'border-b border-muted' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        {item.icon}
                                        <span className="text-[0.82rem] text-slate-700 font-medium">{item.label}</span>
                                    </div>
                                    <span className={`text-base font-bold ${item.color}`}>{item.value}</span>
                                </div>
                            ))}
                        </div>

                        {inProgressRounds > 0 && (
                            <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-[10px]">
                                <p className="text-[0.78rem] font-semibold text-amber-700">
                                    ⏱ {inProgressRounds} round{inProgressRounds > 1 ? 's' : ''} in progress
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>

            </div>
        </motion.div>
    );
};
