import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { ArrowLeft, ArrowRight, ShieldCheck, FileSearch, Notebook } from 'lucide-react';

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
        return <div className="container p-20 text-center"><p className="case-label">Reference Material Not Found</p></div>;
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
        <div className="pt-8 pb-20">
            <TimerBanner roundId={round.id} />

            <div className="container max-w-[850px] mt-10">

                {/* Header Context */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 pb-8 border-b border-border">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary shadow-inner-glow">
                            <Notebook size={28} />
                        </div>
                        <div>
                             <div className="flex items-center gap-2 mb-1.5">
                                 <FileSearch size={14} className="text-primary" />
                                 <span className="case-label">Technical Dossier</span>
                             </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                                Field Manual
                            </h2>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/round/${round.id}`)} className="w-full sm:w-auto font-black uppercase tracking-widest text-[0.7rem] px-5">
                        <ArrowLeft size={14} className="mr-2" />
                        Return to Briefing
                    </Button>
                </div>

                {/* Documentation Sections */}
                <div className="flex flex-col gap-10 mb-12">
                    {round.documentation.map((doc, idx) => (
                        <div key={idx} className="dossier-card rounded-xl overflow-hidden group">
                            <div className="px-8 py-4 border-b border-border bg-slate-900/40 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded bg-primary text-white font-mono font-black text-[0.6rem] flex items-center justify-center">0{idx + 1}</span>
                                    <h3 className="text-[0.75rem] font-black text-white uppercase tracking-widest">
                                        Section: {doc.sectionTitle}
                                    </h3>
                                </div>
                                <ShieldCheck size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
                            </div>
                            <div className="p-10 bg-slate-900/10">
                                <p className="text-lg text-slate-300 leading-relaxed font-medium border-l-[3px] border-primary/20 pl-8 py-2">
                                    {doc.content}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tactical Footer Action */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-10 p-12 bg-secondary/20 border border-border rounded-xl">
                    <div className="max-w-[340px]">
                        <h4 className="text-sm font-black text-white uppercase mb-2">Intel Review Complete?</h4>
                        <p className="text-[0.7rem] text-muted-foreground font-bold uppercase tracking-wider leading-relaxed">
                            Verify all technical assumptions before initializing the finding submission node.
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={() => navigate(`/round/${round.id}/q/0`)}
                        className="w-full sm:w-auto min-w-[260px] h-16"
                    >
                        <span>Initiate Interrogation</span>
                        <ArrowRight size={20} className="ml-3" />
                    </Button>
                </div>

            </div>
        </div>
    );
};
