import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { competitionConfig } from '../../config/competitionConfig';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CheckCircle, Trophy, ArrowRight, LayoutDashboard, Clock } from 'lucide-react';

export const RoundSubmissionPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { roundsProgress, unlockedRounds, rounds } = useAppStore();

    const round = rounds.find(r => r.id === roundId);
    const progress = round ? roundsProgress[round.id] : undefined;

    if (!round || progress?.status !== 'submitted') {
        return <div className="container" style={{ padding: '2rem' }}>Submission data not found.</div>;
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
        <div style={{ paddingTop: '3rem', paddingBottom: '3rem' }} className="animate-fade-in">
            <div className="container" style={{ maxWidth: '560px' }}>
                <div style={{
                    background: '#fff', border: '1px solid var(--border)',
                    borderRadius: '20px', overflow: 'hidden',
                    boxShadow: 'var(--shadow-lg)',
                    textAlign: 'center',
                }}>
                    {/* Top accent */}
                    <div style={{ height: '4px', background: 'linear-gradient(90deg, #16a34a, #15803d)' }} />

                    <div style={{ padding: '2.5rem 2rem' }}>
                        {/* Icon */}
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '50%',
                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.25rem',
                        }}>
                            <CheckCircle size={36} color="#16a34a" />
                        </div>

                        <Badge variant="success" style={{ marginBottom: '1rem' }}>Evidence Submitted</Badge>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                            {round.title}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.65, maxWidth: '380px', margin: '0 auto 1.75rem' }}>
                            Your findings have been recorded and transmitted to the executive committee. The case file is now locked.
                        </p>

                        {/* Timestamp */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            padding: '0.75rem 1.25rem',
                            background: 'var(--bg-base)', border: '1px solid var(--border)',
                            borderRadius: '10px', marginBottom: '2rem',
                            fontSize: '0.82rem', color: 'var(--text-muted)',
                        }}>
                            <Clock size={14} />
                            Submitted at {submittedTime}
                            <span style={{ margin: '0 0.5rem', color: 'var(--border-strong)' }}>·</span>
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>Case Resolved</span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {!isCompetitionComplete ? (
                                <>
                                    <Button variant="outline" onClick={() => navigate('/dashboard')} style={{ width: '100%' }}>
                                        <LayoutDashboard size={16} style={{ marginRight: '0.5rem' }} />
                                        Back to Dashboard
                                    </Button>

                                    {competitionConfig.sequentialRoundUnlock && hasNextUnlocked ? (
                                        <Button variant="primary" onClick={() => navigate(`/round/${rounds[roundIndex + 1].id}`)} style={{ width: '100%' }}>
                                            Next Case
                                            <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                                        </Button>
                                    ) : (
                                        <Button variant="primary" onClick={() => navigate('/leaderboard')} style={{ width: '100%' }}>
                                            View Rankings
                                            <Trophy size={16} style={{ marginLeft: '0.5rem' }} />
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <Button variant="primary" onClick={() => navigate('/complete')} style={{ width: '100%', padding: '0.875rem' }}>
                                    View Final Verdict
                                    <Trophy size={18} style={{ marginLeft: '0.5rem' }} />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
