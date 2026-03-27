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
                <div className="flex flex-col gap-2 mb-6">
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
                        <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-tight mb-1">
                            {round.title}
                        </h1>
                        <p className="text-base text-slate-400 font-medium italic">
                            {round.objective}
                        </p>
                    </div>
                </div>

                {/* ── Formal Briefing Dossier ── */}
                <div className="dossier-card rounded-2xl overflow-hidden shadow-2xl border-[#2d333a] mb-6">
                    <div className="px-8 py-4 border-b border-border bg-slate-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Briefcase size={16} className="text-primary" />
                            <h3 className="text-[0.65rem] font-black text-white uppercase tracking-[0.2em]">Formal Briefing Dossier</h3>
                        </div>
                        <span className="text-[0.55rem] font-mono text-muted-foreground font-black tracking-widest">CONFIDENTIAL</span>
                    </div>
                    <div className="px-8 py-7 relative">
                        <div className="absolute left-0 top-6 bottom-6 w-[3px] bg-primary/25 rounded-full" />
                        <p className="text-lg text-slate-200 leading-relaxed font-normal whitespace-pre-wrap selection:bg-primary/30 pl-2">
                            {round.caseBrief}
                        </p>
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
