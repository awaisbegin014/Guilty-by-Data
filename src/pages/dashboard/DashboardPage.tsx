import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { competitionConfig } from '../../config/competitionConfig';
import { RoundCard } from '../../components/RoundCard';
import { Target, CheckCircle, Clock } from 'lucide-react';

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
        <div style={{ paddingTop: '2rem', paddingBottom: '3rem' }} className="animate-fade-in">
            <div className="container">

                {/* Story Banner */}
                <div style={{
                    background: '#0f172a',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    marginBottom: '2rem',
                    position: 'relative',
                }}>
                    {/* Subtle top accent line */}
                    <div style={{ height: '3px', background: 'linear-gradient(90deg, #dc2626, #7f1d1d)' }} />

                    <div style={{ padding: '2.5rem', position: 'relative' }}>
                        {/* Subtle background detail */}
                        <div style={{
                            position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%',
                            background: 'radial-gradient(ellipse at right center, rgba(220,38,38,0.05) 0%, transparent 70%)',
                            pointerEvents: 'none',
                        }} />

                        <div style={{ position: 'relative' }}>
                            <span style={{
                                fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600,
                                color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.1em',
                                display: 'block', marginBottom: '0.625rem',
                            }}>
                                Case File #7492-Omega
                            </span>
                            <h1 style={{
                                fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                                fontWeight: 800, color: '#f8fafc', marginBottom: '1.25rem',
                                letterSpacing: '-0.02em', lineHeight: 1.1,
                            }}>
                                The Ashworth Affair
                            </h1>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', maxWidth: '640px' }}>
                                <p style={{
                                    color: '#f1f5f9', fontSize: '0.975rem', fontWeight: 500,
                                    borderLeft: '2px solid #dc2626', paddingLeft: '0.875rem', lineHeight: 1.7,
                                }}>
                                    CEO Richard Ashworth has been found dead under suspicious circumstances.
                                    The physical evidence has vanished — but the digital trail remains intact.
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.75 }}>
                                    Ashworth Dynamics, a mid-sized analytics firm, has been rocked by a series of
                                    internal crises. Insider trading allegations, a falsified revenue report, and now
                                    this. The board needs answers fast. Three datasets have been recovered from
                                    the encrypted company servers.
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.75 }}>
                                    Your mission: analyze the evidence across three investigation rounds,
                                    identify the suspect, uncover the hidden motive, and crack the encrypted alibis.
                                    Every minute counts, {team?.name || 'Investigator'}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>

                    {/* Round Cards */}
                    <div>
                        <h2 style={{
                            fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)',
                            textTransform: 'uppercase', letterSpacing: '0.07em',
                            marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}>
                            <Target size={14} />
                            Investigation Rounds
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
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
                    <div style={{ width: '200px' }}>
                        <h2 style={{
                            fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)',
                            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem',
                        }}>
                            Status
                        </h2>
                        <div style={{
                            background: '#fff', border: '1px solid var(--border)',
                            borderRadius: '14px', overflow: 'hidden',
                            boxShadow: 'var(--shadow-sm)',
                        }}>
                            {[
                                { label: 'Total Cases', value: competitionConfig.totalRounds, icon: <Target size={15} color="#64748b" />, color: '#64748b' },
                                { label: 'Completed', value: completedRounds, icon: <CheckCircle size={15} color="#16a34a" />, color: '#16a34a' },
                                { label: 'Remaining', value: remainingRounds, icon: <Clock size={15} color="#64748b" />, color: '#64748b' },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    padding: '0.875rem 1.125rem',
                                    borderBottom: i < 2 ? '1px solid var(--divider)' : 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {item.icon}
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-body)', fontWeight: 500 }}>{item.label}</span>
                                    </div>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, color: item.color }}>{item.value}</span>
                                </div>
                            ))}
                        </div>

                        {inProgressRounds > 0 && (
                            <div style={{
                                marginTop: '0.75rem', padding: '0.75rem 1rem',
                                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
                            }}>
                                <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#b45309' }}>
                                    ⏱ {inProgressRounds} round{inProgressRounds > 1 ? 's' : ''} in progress
                                </p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
