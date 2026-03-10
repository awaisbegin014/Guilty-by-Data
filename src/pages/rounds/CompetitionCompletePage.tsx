import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Trophy, LayoutDashboard, Star } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { motion } from 'framer-motion';

export const CompetitionCompletePage: React.FC = () => {
    const navigate = useNavigate();
    const { team, rounds, roundsProgress } = useAppStore();

    let totalCorrect = 0;
    let totalQuestions = 0;

    rounds.forEach(round => {
        const progress = roundsProgress[round.id];
        if (!progress || progress.status !== 'submitted') return;
        round.questions.forEach(q => {
            totalQuestions++;
            if (progress.answers[q.id] === q.correctOptionId) {
                totalCorrect++;
            }
        });
    });

    const totalPoints = totalCorrect * 100;
    const roundsCompleted = Object.values(roundsProgress).filter(p => p.status === 'submitted').length;
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return (
        <motion.div
            className="pt-12 pb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <div className="container max-w-[540px]">
                <div className="bg-white rounded-[20px] overflow-hidden shadow-xl border border-border">

                    {/* Dark header */}
                    <div className="bg-slate-900 px-8 py-10 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(234,179,8,0.08)_0%,transparent_60%)] pointer-events-none" />

                        <motion.div
                            className="relative w-[72px] h-[72px] rounded-full bg-yellow-100 border-4 border-amber-400 flex items-center justify-center mx-auto mb-5 shadow-[0_0_0_8px_rgba(251,191,36,0.12)]"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                        >
                            <Trophy size={34} className="text-amber-700" />
                        </motion.div>
                        <h1 className="relative text-[1.75rem] font-black text-slate-50 tracking-tight uppercase mb-1.5">
                            Mission Accomplished
                        </h1>
                        <p className="relative text-slate-500 text-sm">
                            All corporate crises investigated
                        </p>
                    </div>

                    {/* Body */}
                    <div className="p-8 flex flex-col gap-6">

                        <p className="text-center text-muted-foreground text-[0.9rem] leading-relaxed">
                            Outstanding work, <strong className="text-slate-900">{team?.name || 'Investigator'}</strong>.
                            Your team has reviewed all evidence datasets and submitted strategic findings to the leadership board.
                        </p>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Total Score', value: totalPoints.toString(), sub: 'points', color: 'text-slate-900', bg: 'bg-slate-50', border: 'border-slate-200' },
                                { label: 'Correct', value: `${totalCorrect}/${totalQuestions}`, sub: 'answers', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                                { label: 'Accuracy', value: `${accuracy}%`, sub: 'rate', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
                            ].map((stat, i) => (
                                <motion.div
                                    key={i}
                                    className={`${stat.bg} border ${stat.border} rounded-xl px-3.5 py-4 text-center`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                                >
                                    <p className="text-[0.68rem] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{stat.label}</p>
                                    <p className={`text-2xl font-black ${stat.color} leading-none`}>{stat.value}</p>
                                    <p className="text-[0.7rem] text-slate-400 mt-0.5">{stat.sub}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Rounds completed badge */}
                        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 border border-border rounded-[10px] text-[0.82rem] text-muted-foreground">
                            <Star size={13} className="text-slate-500" />
                            <span>{roundsCompleted} of {rounds.length} investigation rounds completed</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex-1">
                                <LayoutDashboard size={16} />
                                Home
                            </Button>
                            <Button variant="primary" onClick={() => navigate('/leaderboard')} className="flex-1">
                                Rankings
                                <Trophy size={16} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
