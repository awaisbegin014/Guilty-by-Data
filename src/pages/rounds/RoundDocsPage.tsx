import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { FileText, ArrowLeft, ArrowRight } from 'lucide-react';

export const RoundDocsPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { markDocsVisited, roundsProgress, rounds } = useAppStore();

    const round = rounds.find(r => r.id === roundId);
    const progress = round ? roundsProgress[round.id] : undefined;

    useEffect(() => {
        if (roundId && progress?.status !== 'submitted') {
            markDocsVisited(roundId);
        }
    }, [roundId, markDocsVisited, progress?.status]);

    if (!round) {
        return <div className="container" style={{ padding: '2rem' }}>Case file not found.</div>;
    }

    if (round.status === 'closed') {
        navigate('/dashboard', { replace: true });
        return null;
    }

    if (progress?.status === 'submitted') {
        navigate(`/round/${round.id}/submitted`, { replace: true });
        return null;
    }

    return (
        <div style={{ paddingTop: '1rem', paddingBottom: '3rem' }} className="animate-fade-in">
            <TimerBanner roundId={round.id} />

            <div className="container" style={{ maxWidth: '720px', marginTop: '1.5rem' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '12px',
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)',
                        }}>
                            <FileText size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                Investigation Docs
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                {round.title}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => navigate(`/round/${round.id}`)}>
                        <ArrowLeft size={15} style={{ marginRight: '0.375rem' }} />
                        Back
                    </Button>
                </div>

                {/* Docs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    {round.documentation.map((doc, idx) => (
                        <div key={idx} style={{
                            background: '#fff', border: '1px solid var(--border)',
                            borderRadius: '14px', overflow: 'hidden',
                            boxShadow: 'var(--shadow-sm)',
                        }}>
                            <div style={{
                                padding: '0.875rem 1.375rem',
                                borderBottom: '1px solid var(--border)',
                                background: 'var(--bg-base)',
                            }}>
                                <h3 style={{
                                    fontSize: '0.85rem', fontWeight: 700, color: '#0f172a',
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}>
                                    {doc.sectionTitle}
                                </h3>
                            </div>
                            <div style={{ padding: '1.25rem 1.375rem' }}>
                                <p style={{
                                    fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.75,
                                    borderLeft: '3px solid var(--border-strong)', paddingLeft: '0.875rem',
                                    fontStyle: 'italic',
                                }}>
                                    {doc.content}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="primary"
                        onClick={() => navigate(`/round/${round.id}/q/0`)}
                    >
                        Proceed to Interrogation
                        <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                    </Button>
                </div>

            </div>
        </div>
    );
};
