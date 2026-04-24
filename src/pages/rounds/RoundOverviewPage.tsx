import React from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { ArrowRight, Briefcase } from 'lucide-react';
import { canAccessRoundRoute } from '../../lib/roundState';
import { formatRoundPhaseLabel } from '../../lib/roundPresentation';

export const RoundOverviewPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { roundsProgress, rounds, unlockedRounds } = useAppStore();

    const round = rounds.find(r => r.id === roundId);

    if (!round) {
        return <div className="container p-20 text-center"><p className="case-label">Error: File Not Found</p></div>;
    }

    const progress = roundsProgress[round.id];

    if (progress?.status === 'submitted') {
        return <Navigate to={`/round/${round.id}/submitted`} replace />;
    }

    if (!canAccessRoundRoute(progress?.status ?? 'locked') || !unlockedRounds.includes(round.id) || !round.contentVisible) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="pb-10">
            <div className="container max-w-[860px] mt-5">

                {/* ── Header ── */}
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-5 bg-primary rounded-full shadow-[0_0_8px_rgba(74,124,157,0.4)]" />
                            <span className="text-[0.65rem] font-black font-mono text-white/70 uppercase tracking-[0.3em]">
                                Investigation Registry // {formatRoundPhaseLabel(round.orderIndex)}
                            </span>
                        </div>
                        <TimerBanner roundId={round.id} />
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-tight">
                            {round.title}
                        </h1>
                    </div>
                </div>

                {/* ── Formal Briefing Dossier ── */}
                <div className="dossier-card rounded-2xl overflow-hidden shadow-2xl border-[#2d333a] mb-10 bg-slate-900/40">
                    <div className="px-8 py-5 border-b border-border bg-slate-950/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Briefcase size={16} className="text-primary" />
                            <h3 className="text-[0.7rem] font-black text-white uppercase tracking-[0.2em]">Formal Briefing Dossier</h3>
                        </div>
                        <span className="text-[0.6rem] font-mono text-primary/80 font-black tracking-widest border border-primary/20 px-2 py-0.5 rounded bg-primary/10">CONFIDENTIAL</span>
                    </div>
                    
                    <div className="p-8 space-y-8">
                        {/* Description Section */}
                        <div className="relative pl-6">
                            <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-500/50 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
                            <h4 className="text-[0.65rem] font-black font-mono text-blue-400 uppercase tracking-[0.2em] mb-2">
                                Phase Description
                            </h4>
                            <p className="text-base text-slate-300 font-medium leading-relaxed">
                                {round.description}
                            </p>
                        </div>

                        {/* Objective Section */}
                        <div className="relative pl-6">
                            <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-amber-500/50 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                            <h4 className="text-[0.65rem] font-black font-mono text-amber-500 uppercase tracking-[0.2em] mb-2">
                                Primary Objective
                            </h4>
                            <p className="text-base text-slate-300 font-medium leading-relaxed italic">
                                {round.objective}
                            </p>
                        </div>

                        {/* Case Brief Section */}
                        <div className="relative bg-slate-950/50 p-6 sm:p-8 rounded-xl border border-slate-800/80 shadow-inner mt-4">
                            <div className="absolute left-0 top-8 bottom-8 w-[4px] bg-primary/60 rounded-r-full shadow-[0_0_12px_rgba(74,124,157,0.4)]" />
                            <h4 className="text-[0.65rem] font-black font-mono text-primary uppercase tracking-[0.2em] mb-4">
                                Detailed Case Briefing
                            </h4>
                            <p className="text-lg text-slate-200 leading-relaxed font-normal whitespace-pre-wrap selection:bg-primary/30">
                                {round.caseBrief}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Initialize Analysis ── */}
                <div className="flex flex-col items-center gap-4 py-4">
                    <p className="text-[0.6rem] font-black text-muted-foreground uppercase tracking-[0.4em] text-center">
                        Proceed to Analytical Interrogation
                    </p>
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full max-w-[420px] h-14 rounded-xl shadow-xl shadow-primary/10 group transition-all duration-500 hover:scale-[1.02]"
                        onClick={() => navigate(`/round/${round.id}/q/0`)}
                    >
                        <span className="font-black uppercase tracking-[0.3em] text-[0.85rem] ml-3">Initialize Analysis</span>
                        <ArrowRight size={20} className="ml-3 group-hover:translate-x-2 transition-transform duration-300" />
                    </Button>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[0.5rem] font-black font-mono uppercase tracking-widest">Registry State: Ready</span>
                    </div>
                </div>

            </div>
        </div>
    );
};
