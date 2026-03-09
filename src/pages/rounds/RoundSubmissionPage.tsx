import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockRounds } from '../../data/mockData';
import { competitionConfig } from '../../config/competitionConfig';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle, Trophy, ArrowRight, LayoutDashboard } from 'lucide-react';

export const RoundSubmissionPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { roundsProgress, unlockedRounds } = useAppStore();

    const round = mockRounds.find(r => r.id === roundId);
    const progress = round ? roundsProgress[round.id] : undefined;

    if (!round || progress?.status !== 'submitted') {
        return <div className="container py-8">Submission data not found or round not completed.</div>;
    }

    // Determine standard flows
    const roundIndex = mockRounds.findIndex(r => r.id === round.id);
    const isFinalRound = roundIndex === mockRounds.length - 1;
    const isCompetitionComplete = isFinalRound && progress.status === 'submitted';

    const hasNextUnlocked = !isFinalRound && unlockedRounds.includes(mockRounds[roundIndex + 1].id);

    return (
        <div className="container flex items-center justify-center min-h-[70vh] py-12 animate-fade-in">
            <Card className="w-full max-w-2xl text-center shadow-lg border-t-8 border-t-slate-800">
                <CardBody className="px-6 py-12 flex flex-col items-center">

                    <div className="bg-green-100 text-green-700 p-4 rounded-full mb-6 relative">
                        <CheckCircle size={48} />
                    </div>

                    <Badge variant="success" className="mb-4">EVIDENCE SUBMITTED</Badge>

                    <h2 className="text-3xl font-bold text-slate-900 mb-4">{round.title}</h2>

                    <p className="text-lg text-slate-600 max-w-lg mb-8">
                        Your findings have been recorded and securely transmitted to the executive committee.
                        The case file is now locked.
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 w-full max-w-md mb-10 flex justify-between items-center text-left">
                        <div>
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Time of Submission</p>
                            <p className="text-sm font-medium text-slate-800">
                                {progress.submittedAt ? new Date(progress.submittedAt).toLocaleTimeString() : 'N/A'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Case Status</p>
                            <p className="text-sm font-bold text-success-text">Resolved</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                        {!isCompetitionComplete ? (
                            <>
                                <Button
                                    variant="outline"
                                    className="flex-1 py-3"
                                    onClick={() => navigate('/dashboard')}
                                >
                                    <LayoutDashboard size={18} className="mr-2" />
                                    Dashboard
                                </Button>

                                {competitionConfig.sequentialRoundUnlock && hasNextUnlocked && (
                                    <Button
                                        variant="primary"
                                        className="flex-1 py-3"
                                        onClick={() => navigate(`/round/${mockRounds[roundIndex + 1].id}`)}
                                    >
                                        Next Case
                                        <ArrowRight size={18} className="ml-2" />
                                    </Button>
                                )}

                                {/* If purely open competition, just go to leaderboard or dashboard */}
                                {(!competitionConfig.sequentialRoundUnlock || !hasNextUnlocked) && (
                                    <Button
                                        variant="primary"
                                        className="flex-1 py-3"
                                        onClick={() => navigate('/leaderboard')}
                                    >
                                        View Rankings
                                        <Trophy size={18} className="ml-2" />
                                    </Button>
                                )}
                            </>
                        ) : (
                            // Flow for handling the completion of the entire competition
                            <Button
                                variant="primary"
                                className="w-full py-4 text-lg"
                                onClick={() => navigate('/complete')}
                            >
                                View Final Verdict
                                <Trophy size={20} className="ml-2" />
                            </Button>
                        )}
                    </div>

                </CardBody>
            </Card>
        </div>
    );
};
