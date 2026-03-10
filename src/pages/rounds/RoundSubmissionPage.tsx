import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { competitionConfig } from '../../config/competitionConfig';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle, Trophy, ArrowRight, LayoutDashboard, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const RoundSubmissionPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { roundsProgress, unlockedRounds, rounds } = useAppStore();

    const round = rounds.find(r => r.id === roundId);
    const progress = round ? roundsProgress[round.id] : undefined;

    if (!round || progress?.status !== 'submitted') {
        return <div className="container p-8">Submission data not found.</div>;
    }

    if (round.status === 'closed') {
        navigate('/dashboard', { replace: true });
        return null;
    }

    const roundIndex = rounds.findIndex(r => r.id === round.id);
    const isFinalRound = roundIndex === rounds.length - 1;
    const isCompetitionComplete = isFinalRound && progress.status === 'submitted';
    const hasNextUnlocked = !isFinalRound && unlockedRounds.includes(rounds[roundIndex + 1].id);

    const submittedTime = progress.submittedAt
        ? new Date(progress.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'N/A';

    return (
        <motion.div
            className="pt-12 pb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <div className="container max-w-[560px]">
                <div className="bg-white border border-border rounded-[20px] overflow-hidden shadow-lg text-center">
                    {/* Top accent */}
                    <div className="h-1 bg-gradient-to-r from-green-600 to-green-800" />

                    <div className="px-8 py-10">
                        {/* Icon */}
                        <motion.div
                            className="w-[72px] h-[72px] rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                        >
                            <CheckCircle size={36} className="text-green-600" />
                        </motion.div>

                        <Badge variant="success" className="mb-4">Evidence Submitted</Badge>

                        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                            {round.title}
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-[380px] mx-auto mb-7">
                            Your findings have been recorded and transmitted to the executive committee. The case file is now locked.
                        </p>

                        {/* Timestamp */}
                        <div className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-50 border border-border rounded-[10px] mb-8 text-[0.82rem] text-muted-foreground">
                            <Clock size={14} />
                            Submitted at {submittedTime}
                            <span className="mx-2 text-slate-300">·</span>
                            <span className="text-green-600 font-semibold">Case Resolved</span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            {!isCompetitionComplete ? (
                                <>
                                    <Button variant="outline" onClick={() => navigate('/dashboard')} fullWidth>
                                        <LayoutDashboard size={16} />
                                        Back to Dashboard
                                    </Button>

                                    {competitionConfig.sequentialRoundUnlock && hasNextUnlocked ? (
                                        <Button variant="primary" onClick={() => navigate(`/round/${rounds[roundIndex + 1].id}`)} fullWidth>
                                            Next Case
                                            <ArrowRight size={16} />
                                        </Button>
                                    ) : (
                                        <Button variant="primary" onClick={() => navigate('/leaderboard')} fullWidth>
                                            View Rankings
                                            <Trophy size={16} />
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button variant="primary" onClick={() => navigate('/complete')} fullWidth className="py-3.5">
                                    View Final Verdict
                                    <Trophy size={18} />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
