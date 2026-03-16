import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { RoundCard } from '../../components/RoundCard';
import { Badge } from '../../components/ui/Badge';
import { ShieldCheck, BarChart4, Fingerprint, Target, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { unlockedRounds, roundsProgress, rounds } = useAppStore();

    const completedRounds = Object.values(roundsProgress).filter((p) => p.status === 'submitted').length;
    const nextAvailableRound = rounds.find((round) => {
        const progress = roundsProgress[round.id];
        return unlockedRounds.includes(round.id) && (progress?.status === 'available' || progress?.status === 'in_progress');
    });

    return (
        <div className="pt-4 pb-20">
            <div className="container max-w-[1100px]">
                
                {/* Header: Commands and Status */}
                <div className="flex flex-col gap-1 mb-12">
                    <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-primary rounded-full" />
                         <span className="text-[0.65rem] font-black font-mono text-muted-foreground uppercase tracking-[0.3em]">
                            Investigation Command Center
                         </span>
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tight">
                        Active Investigation
                    </h1>
                </div>

                {/* Dashboard Main Flow */}
                <div className="flex flex-col gap-10">
                    
                    {/* Active Jump-Back (Conditional) */}
                    {nextAvailableRound && (
                        <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 flex items-center justify-between animate-pulse-subtle">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Active Investigation Detected</h3>
                                    <p className="text-[0.6rem] text-muted-foreground font-black font-mono uppercase tracking-widest mt-0.5">
                                        Round: {nextAvailableRound.title} // Ready For Review
                                    </p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => navigate(`/round/${nextAvailableRound.id}`)}
                                variant="primary" 
                                size="sm" 
                                className="h-9 px-6 text-[0.65rem] font-black tracking-widest uppercase"
                            >
                                Resume Mission <ArrowRight size={14} className="ml-2" />
                            </Button>
                        </div>
                    )}
                    
                    {/* Case Briefing Section */}
                    <div className="dossier-card rounded-2xl overflow-hidden shadow-2xl">
                        <div className="px-10 py-8 border-b border-border bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">Case Dossier: Ashworth</h2>
                                    <p className="text-[0.6rem] font-black font-mono text-muted-foreground uppercase tracking-widest mt-1">Ref No: #7492-OMEGA-ANALYTICS</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-10 space-y-12">
                            <p className="text-lg text-slate-300 leading-relaxed font-medium max-w-4xl">
                                Richard Ashworth, lead architect of Ashworth Dynamics, has been discovered deceased. 
                                Initial forensics suggest a highly coordinated digital breach preceded the event. 
                                Your team must parse recovered server logs and financial transactions to determine 
                                culpability and motive.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="p-6 rounded-xl bg-slate-900/20 border border-border">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Fingerprint size={18} className="text-primary" />
                                        <h4 className="text-[0.7rem] font-black text-white uppercase tracking-widest">Primary Objective</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                        Map the movement of illicit data packets and identify the breach source.
                                    </p>
                                </div>
                                <div className="p-6 rounded-xl bg-slate-900/20 border border-border">
                                    <div className="flex items-center gap-3 mb-4">
                                        <BarChart4 size={18} className="text-primary" />
                                        <h4 className="text-[0.7rem] font-black text-white uppercase tracking-widest">Scope of Analysis</h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                        Financial ledger anomalies and encrypted metadata extraction.
                                    </p>
                                </div>
                                <div className="p-6 rounded-xl bg-slate-900/20 border border-border">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Target size={18} className="text-primary" />
                                        <h4 className="text-[0.7rem] font-black text-white uppercase tracking-widest">Intel Progress</h4>
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <span className="text-xl font-black text-white font-mono">{completedRounds} / {rounds.length}</span>
                                        <span className="text-[0.6rem] font-black text-muted-foreground uppercase mb-1">Nodes Resolved</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Investigation Phases (Horizontal Blocks) */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 border-b border-border pb-4">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Case Files // Phases</h3>
                            <Badge variant="outline" className="font-mono font-black text-[0.6rem] tracking-[0.2em] px-2">Registry: Nominal</Badge>
                        </div>
                        
                        <div className="flex flex-col gap-6">
                            {rounds.map((round) => {
                                const isUnlocked = unlockedRounds.includes(round.id);
                                const progress = roundsProgress[round.id];
                                return (
                                    <RoundCard
                                        key={round.id}
                                        round={round}
                                        progress={progress}
                                        isLocked={!isUnlocked && progress?.status === 'locked'}
                                    />
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
