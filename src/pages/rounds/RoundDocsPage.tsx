import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { FileText, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
        return <div className="container p-8">Case file not found.</div>;
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
        <motion.div
            className="pt-4 pb-12"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <TimerBanner roundId={round.id} />

            <div className="container max-w-[720px] mt-6">

                {/* Header */}
                <div className="flex items-start justify-between mb-7 gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                            <FileText size={22} />
                        </div>
                        <div>
                            <h2 className="text-[1.4rem] font-extrabold text-slate-900 leading-tight">
                                Investigation Docs
                            </h2>
                            <p className="text-[0.8rem] text-muted-foreground mt-0.5">{round.title}</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => navigate(`/round/${round.id}`)}>
                        <ArrowLeft size={15} />
                        Back
                    </Button>
                </div>

                {/* Docs */}
                <div className="flex flex-col gap-4 mb-6">
                    {round.documentation.map((doc, idx) => (
                        <motion.div
                            key={idx}
                            className="bg-white border border-border rounded-[14px] overflow-hidden shadow-sm"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.08 }}
                        >
                            <div className="px-5 py-3.5 border-b border-border bg-slate-50">
                                <h3 className="text-[0.85rem] font-bold text-slate-900 uppercase tracking-wide">
                                    {doc.sectionTitle}
                                </h3>
                            </div>
                            <div className="p-5">
                                <p className="text-[0.9rem] text-slate-700 leading-relaxed border-l-[3px] border-slate-300 pl-3.5 italic">
                                    {doc.content}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Action */}
                <div className="flex justify-end">
                    <Button
                        variant="primary"
                        onClick={() => navigate(`/round/${round.id}/q/0`)}
                    >
                        Proceed to Interrogation
                        <ArrowRight size={16} />
                    </Button>
                </div>

            </div>
        </motion.div>
    );
};
