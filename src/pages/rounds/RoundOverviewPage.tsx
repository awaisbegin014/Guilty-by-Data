import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TimerBanner } from '../../components/TimerBanner';
import { FileText, Database, ArrowRight, CheckCircle2, Circle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export const RoundOverviewPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { startRound, roundsProgress, rounds, unlockedRounds, markDatasetOpened } = useAppStore();

    const round = rounds.find(r => r.id === roundId);

    useEffect(() => {
        if (roundId && unlockedRounds.includes(roundId)) {
            startRound(roundId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roundId]);

    if (!round) {
        return <div className="container p-8">Case file not found.</div>;
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
        <div className="bg-white border border-border rounded-[14px] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2.5 bg-slate-50">
                <span className="text-muted-foreground">{icon}</span>
                <h3 className="text-[0.9rem] font-bold text-slate-900">{title}</h3>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );

    return (
        <motion.div
            className="pt-4 pb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <TimerBanner roundId={round.id} />

            <div className="container max-w-[720px] mt-6">

                {/* Header */}
                <div className="mb-7">
                    <Badge variant="info" className="mb-3">Active Investigation</Badge>
                    <h2 className="text-[1.75rem] font-extrabold text-slate-900 mb-1.5">
                        {round.title}
                    </h2>
                    <p className="text-muted-foreground text-[0.95rem]">{round.objective}</p>
                </div>

                <div className="flex flex-col gap-4">

                    {/* Case Brief */}
                    <Section title="Case Brief" icon={<FileText size={18} />}>
                        <p className="text-slate-700 leading-relaxed text-[0.9rem]">
                            {round.caseBrief}
                        </p>
                    </Section>

                    {/* Dataset */}
                    <Section title="Evidence Dataset" icon={<Database size={18} />}>
                        <div className="bg-slate-50 border border-border rounded-[10px] px-4 py-3.5 mb-4">
                            <p className="text-[0.85rem] font-bold text-slate-900 mb-1">
                                {round.datasetTitle}
                            </p>
                            <p className="text-[0.82rem] text-muted-foreground">
                                {round.datasetDescription}
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleDatasetAccess}>
                            <ExternalLink size={15} />
                            {round.datasetLink ? 'Open Dataset File' : 'Request Dataset Access'}
                        </Button>
                    </Section>

                    {/* Checklist */}
                    <Section title="Investigation Checklist" icon={<CheckCircle2 size={18} />}>
                        <div className="flex flex-col gap-3">
                            {[
                                { label: 'Review Case Brief', done: true },
                                { label: 'Open Evidence Dataset', done: !!progress?.datasetOpened },
                                { label: 'Read Investigation Documentation', done: !!progress?.docsVisited },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    {item.done
                                        ? <CheckCircle2 size={18} className="text-green-600" />
                                        : <Circle size={18} className="text-slate-300" />}
                                    <span className={`text-sm ${item.done ? 'text-slate-900 font-medium' : 'text-muted-foreground'}`}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Actions */}
                    <div className="flex gap-3.5 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => navigate(`/round/${round.id}/docs`)}
                        >
                            <FileText size={16} />
                            View Documentation
                        </Button>
                        <Button
                            variant="primary"
                            className="flex-1"
                            onClick={() => navigate(`/round/${round.id}/q/0`)}
                        >
                            Start Interrogation
                            <ArrowRight size={16} />
                        </Button>
                    </div>
                </div>

            </div>
        </motion.div>
    );
};
