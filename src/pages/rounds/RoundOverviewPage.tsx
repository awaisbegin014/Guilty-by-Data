import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TimerBanner } from '../../components/TimerBanner';
import { FileText, Database, ArrowRight, CheckCircle2, Circle, ExternalLink } from 'lucide-react';

export const RoundOverviewPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { startRound, roundsProgress, rounds, unlockedRounds, markDatasetOpened } = useAppStore();

    const round = rounds.find(r => r.id === roundId);

    // Start the round timer — only fires when roundId changes (not on every store update)
    useEffect(() => {
        if (roundId && unlockedRounds.includes(roundId)) {
            startRound(roundId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roundId]);

    if (!round) {
        return <div className="container" style={{ padding: '2rem' }}>Case file not found.</div>;
    }

    if (round.status === 'closed') {
        navigate('/dashboard', { replace: true });
        return null;
    }

    const progress = roundsProgress[round.id];

    if (progress?.status === 'submitted') {
        navigate(`/round/${round.id}/submitted`, { replace: true });
        return null;
    }

    const handleDatasetAccess = () => {
        markDatasetOpened(round.id);
        if (round.datasetLink) {
            window.open(round.datasetLink, '_blank', 'noopener,noreferrer');
        } else {
            alert('No dataset link configured yet. Please check with the organiser.');
        }
    };

    const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
        <div style={{
            background: '#fff', border: '1px solid var(--border)',
            borderRadius: '14px', overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
        }}>
            <div style={{
                padding: '1rem 1.375rem', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                background: 'var(--bg-base)',
            }}>
                <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
            </div>
            <div style={{ padding: '1.375rem' }}>{children}</div>
        </div>
    );

    return (
        <div style={{ paddingTop: '1rem', paddingBottom: '3rem' }} className="animate-fade-in">
            <TimerBanner roundId={round.id} />

            <div className="container" style={{ maxWidth: '720px', marginTop: '1.5rem' }}>

                {/* Header */}
                <div style={{ marginBottom: '1.75rem' }}>
                    <Badge variant="info" style={{ marginBottom: '0.75rem' }}>Active Investigation</Badge>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.375rem' }}>
                        {round.title}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{round.objective}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Case Brief */}
                    <Section title="Case Brief" icon={<FileText size={18} />}>
                        <p style={{ color: 'var(--text-body)', lineHeight: 1.75, fontSize: '0.9rem' }}>
                            {round.caseBrief}
                        </p>
                    </Section>

                    {/* Dataset */}
                    <Section title="Evidence Dataset" icon={<Database size={18} />}>
                        <div style={{
                            background: 'var(--bg-base)', border: '1px solid var(--border)',
                            borderRadius: '10px', padding: '0.875rem 1rem', marginBottom: '1rem',
                        }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                                {round.datasetTitle}
                            </p>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {round.datasetDescription}
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleDatasetAccess}>
                            <ExternalLink size={15} style={{ marginRight: '0.5rem' }} />
                            {round.datasetLink ? 'Open Dataset File' : 'Request Dataset Access'}
                        </Button>
                    </Section>

                    {/* Checklist */}
                    <Section title="Investigation Checklist" icon={<CheckCircle2 size={18} />}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                { label: 'Review Case Brief', done: true },
                                { label: 'Open Evidence Dataset', done: !!progress?.datasetOpened },
                                { label: 'Read Investigation Documentation', done: !!progress?.docsVisited },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {item.done
                                        ? <CheckCircle2 size={18} color="#16a34a" />
                                        : <Circle size={18} color="#cbd5e1" />}
                                    <span style={{
                                        fontSize: '0.875rem',
                                        color: item.done ? '#0f172a' : 'var(--text-muted)',
                                        fontWeight: item.done ? 500 : 400,
                                    }}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.875rem', paddingTop: '0.5rem' }}>
                        <Button
                            variant="outline"
                            style={{ flex: 1 }}
                            onClick={() => navigate(`/round/${round.id}/docs`)}
                        >
                            <FileText size={16} style={{ marginRight: '0.5rem' }} />
                            View Documentation
                        </Button>
                        <Button
                            variant="primary"
                            style={{ flex: 1 }}
                            onClick={() => navigate(`/round/${round.id}/q/0`)}
                        >
                            Start Interrogation
                            <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};
