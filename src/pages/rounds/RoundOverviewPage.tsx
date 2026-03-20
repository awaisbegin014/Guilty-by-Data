import React, { useState } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { KeyRound, ArrowRight, ShieldAlert, Copy, Briefcase } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { canAccessRoundRoute } from '../../lib/roundState';
import { formatRoundPhaseLabel } from '../../lib/roundPresentation';

export const RoundOverviewPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { roundsProgress, rounds, unlockedRounds, markResourceViewed } = useAppStore();
    const [copyState, setCopyState] = useState<{ roundId: string | null; status: 'idle' | 'copied' | 'error' }>({
        roundId: null,
        status: 'idle',
    });

    const round = rounds.find(r => r.id === roundId);
    const visibleCopyState = copyState.roundId === roundId ? copyState.status : 'idle';

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

    const handleCopyPassword = async () => {
        markResourceViewed(round.id);

        if (!round.zipPassword) {
            setCopyState({ roundId: round.id, status: 'error' });
            return;
        }

        try {
            await navigator.clipboard.writeText(round.zipPassword);
            setCopyState({ roundId: round.id, status: 'copied' });
        } catch {
            setCopyState({ roundId: round.id, status: 'error' });
        }
    };

    return (
        <div className="pt-2 pb-16">
            <TimerBanner roundId={round.id} />

            <div className="container max-w-[900px] mt-6">
                
                {/* Header: Commands and Status */}
                <div className="flex flex-col gap-6 mb-16">
                    <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_8px_rgba(74,124,157,0.4)]" />
                         <span className="text-[0.7rem] font-black font-mono text-white/90 uppercase tracking-[0.3em]">
                            Investigation Registry // {formatRoundPhaseLabel(round.orderIndex)}
                         </span>
                    </div>
                    <div>
                        <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-tight mb-3">
                            {round.title}
                        </h1>
                        <p className="text-lg text-slate-400 font-medium max-w-2xl leading-relaxed italic">
                            {round.objective}
                        </p>
                    </div>
                </div>

                {/* Case Flow Stack */}
                <div className="flex flex-col gap-12">
                    
                    {/* 1. Formal Briefing Focal Point */}
                    <div className="dossier-card rounded-2xl overflow-hidden shadow-2xl border-[#2d333a]">
                        <div className="px-10 py-6 border-b border-border bg-slate-900/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Briefcase size={18} className="text-primary" />
                                <h3 className="text-[0.7rem] font-black text-white uppercase tracking-[0.2em]">Formal Briefing Dossier</h3>
                            </div>
                            <span className="text-[0.6rem] font-mono text-muted-foreground font-black tracking-widest">CONFIDENTIAL</span>
                        </div>
                        <div className="p-12 relative">
                            <div className="absolute left-0 top-12 bottom-12 w-1 bg-primary/20" />
                            <p className="text-xl text-slate-200 leading-relaxed font-normal whitespace-pre-wrap selection:bg-primary/30">
                                {round.caseBrief}
                            </p>
                        </div>
                    </div>

                    {/* 2. Unified Action Dossier (Resources + Button) */}
                    <div className="dossier-card rounded-2xl overflow-hidden border-[#2d333a] shadow-inner-glow">
                        <div className="px-10 py-6 border-b border-border bg-slate-900/60 flex items-center gap-3">
                            <ShieldAlert size={18} className="text-primary" />
                            <h4 className="text-[0.7rem] font-black text-white uppercase tracking-widest">Investigation Protocols & Resources</h4>
                        </div>
                        
                        <div className="p-2 space-y-2">
                            {/* Documentation Row */}
                            <div className="p-8 rounded-xl bg-slate-900/40 border border-border/40 flex items-center gap-8 group transition-all duration-300 hover:border-primary/20 hover:bg-slate-900/60">
                                <div className="w-14 h-14 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <ShieldAlert size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h5 className="text-sm font-black text-white uppercase tracking-tight">Review Field Protocols</h5>
                                        <Badge variant="outline" className="text-[0.55rem] font-black tracking-widest bg-primary/5 border-primary/20">DOCUMENTATION</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium line-clamp-1 max-w-md">
                                        Review case protocols, analytical tips, and investigation rules.
                                    </p>
                                </div>
                                <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    className="h-10 px-6 rounded-lg font-black uppercase tracking-widest text-[0.6rem]" 
                                    onClick={() => navigate(`/round/${round.id}/docs`)}
                                >
                                    <ArrowRight size={14} className="mr-2" />
                                    <span>Read Docs</span>
                                </Button>
                            </div>

                            {/* ZIP Password Row */}
                            <div className="p-8 rounded-xl bg-slate-900/40 border border-border/40 flex items-center gap-8 group transition-all duration-300 hover:border-primary/20 hover:bg-slate-900/60">
                                <div className="w-14 h-14 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <KeyRound size={24} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h5 className="text-sm font-black text-white uppercase tracking-tight">ZIP Archive Password</h5>
                                        <Badge variant="outline" className="text-[0.55rem] font-black tracking-widest bg-primary/5 border-primary/20">PASSWORD</Badge>
                                    </div>
                                    {round.zipPassword ? (
                                        <>
                                            <p className="text-sm text-slate-100 font-mono tracking-[0.15em] uppercase break-all">
                                                {round.zipPassword}
                                            </p>
                                            <p className="mt-2 text-xs text-muted-foreground leading-relaxed font-medium max-w-md">
                                                Use this password to open the offline ZIP package for this round.
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-muted-foreground leading-relaxed font-medium max-w-md">
                                            No ZIP password has been configured for this round yet.
                                        </p>
                                    )}
                                </div>
                                <Button variant="secondary" size="sm" className="h-10 px-6 rounded-lg font-black uppercase tracking-widest text-[0.6rem]" onClick={() => void handleCopyPassword()}>
                                    <Copy size={14} className="mr-2" />
                                    <span>{visibleCopyState === 'copied' ? 'Copied' : 'Copy Password'}</span>
                                </Button>
                            </div>


                            {/* Final Action Row */}
                            <div className="p-10 bg-primary/[0.03] border-t border-border mt-4 flex flex-col items-center">
                                <p className="text-[0.65rem] font-black text-muted-foreground uppercase tracking-[0.4em] mb-8 text-center">
                                    Proceed to Analytical Interrogation
                                </p>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="w-full max-w-[400px] h-16 rounded-xl shadow-xl shadow-primary/10 group transition-all duration-500 hover:scale-[1.02]"
                                    onClick={() => navigate(`/round/${round.id}/q/0`)}
                                >
                                    <span className="font-black uppercase tracking-[0.3em] text-[0.9rem] ml-4">Initialize Analysis</span>
                                    <ArrowRight size={22} className="ml-4 group-hover:translate-x-2 transition-transform duration-300" />
                                </Button>
                                <div className="mt-6 flex items-center gap-2 opacity-50">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[0.55rem] font-black font-mono uppercase tracking-widest">Registry State: Ready</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
