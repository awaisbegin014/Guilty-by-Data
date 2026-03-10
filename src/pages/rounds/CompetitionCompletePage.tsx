import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Trophy, LayoutDashboard, Star } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const CompetitionCompletePage: React.FC = () => {
    const navigate = useNavigate();
    const { team, rounds, roundsProgress } = useAppStore();

    // Calculate real score from actual answers vs correct option IDs
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
        <div style={{ paddingTop: '3rem', paddingBottom: '3rem' }} className="animate-fade-in">
            <div className="container" style={{ maxWidth: '540px' }}>
                <div style={{
                    background: '#fff', borderRadius: '20px',
                    overflow: 'hidden', boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border)',
                }}>

                    {/* Dark header */}
                    <div style={{
                        background: '#0f172a', padding: '2.5rem 2rem',
                        textAlign: 'center', position: 'relative', overflow: 'hidden',
                    }}>
                        {/* Subtle glow */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'radial-gradient(ellipse at 50% 120%, rgba(234,179,8,0.08) 0%, transparent 60%)',
                            pointerEvents: 'none',
                        }} />

                        <div style={{
                            position: 'relative',
                            width: '72px', height: '72px', borderRadius: '50%',
                            background: '#fef9c3', border: '4px solid #fbbf24',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.25rem',
                            boxShadow: '0 0 0 8px rgba(251,191,36,0.12)',
                        }}>
                            <Trophy size={34} color="#b45309" />
                        </div>
                        <h1 style={{
                            position: 'relative',
                            fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc',
                            letterSpacing: '-0.02em', textTransform: 'uppercase',
                            marginBottom: '0.375rem',
                        }}>
                            Mission Accomplished
                        </h1>
                        <p style={{ position: 'relative', color: '#64748b', fontSize: '0.875rem' }}>
                            All corporate crises investigated
                        </p>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>
                            Outstanding work, <strong style={{ color: '#0f172a' }}>{team?.name || 'Investigator'}</strong>.
                            Your team has reviewed all evidence datasets and submitted strategic findings to the leadership board.
                        </p>

                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                            {[
                                {
                                    label: 'Total Score',
                                    value: totalPoints.toString(),
                                    sub: 'points',
                                    color: '#0f172a',
                                    bg: '#f8fafc',
                                    border: '#e2e8f0',
                                },
                                {
                                    label: 'Correct',
                                    value: `${totalCorrect}/${totalQuestions}`,
                                    sub: 'answers',
                                    color: '#16a34a',
                                    bg: '#f0fdf4',
                                    border: '#bbf7d0',
                                },
                                {
                                    label: 'Accuracy',
                                    value: `${accuracy}%`,
                                    sub: 'rate',
                                    color: '#1d4ed8',
                                    bg: '#eff6ff',
                                    border: '#bfdbfe',
                                },
                            ].map((stat, i) => (
                                <div key={i} style={{
                                    background: stat.bg, border: `1px solid ${stat.border}`,
                                    borderRadius: '12px', padding: '1rem 0.875rem', textAlign: 'center',
                                }}>
                                    <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>
                                        {stat.label}
                                    </p>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 900, color: stat.color, lineHeight: 1 }}>
                                        {stat.value}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
                                        {stat.sub}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Rounds completed badge */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            padding: '0.625rem 1rem', background: 'var(--bg-base)',
                            border: '1px solid var(--border)', borderRadius: '10px',
                            fontSize: '0.82rem', color: 'var(--text-muted)',
                        }}>
                            <Star size={13} color="#64748b" />
                            <span>{roundsCompleted} of {rounds.length} investigation rounds completed</span>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <Button variant="outline" onClick={() => navigate('/dashboard')} style={{ flex: 1 }}>
                                <LayoutDashboard size={16} style={{ marginRight: '0.5rem' }} />
                                Home
                            </Button>
                            <Button variant="primary" onClick={() => navigate('/leaderboard')} style={{ flex: 1 }}>
                                Rankings
                                <Trophy size={16} style={{ marginLeft: '0.5rem' }} />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
