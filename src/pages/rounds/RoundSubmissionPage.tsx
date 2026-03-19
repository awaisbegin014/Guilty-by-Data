import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { competitionConfig } from '../../config/competitionConfig';
import { Button } from '../../components/ui/Button';
import { Trophy, ArrowRight, LayoutDashboard, ShieldCheck, Database } from 'lucide-react';

function formatDuration(seconds: number | null | undefined) {
    if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
        return 'N/A';
    }

    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
}

export const RoundSubmissionPage: React.FC = () => {
    const { roundId } = useParams<{ roundId: string }>();
    const navigate = useNavigate();
    const { roundsProgress, unlockedRounds, rounds } = useAppStore();

    const round = rounds.find(r => r.id === roundId);
    const progress = round ? roundsProgress[round.id] : undefined;

    if (!round || progress?.status !== 'submitted') {
        return <div className="container p-20 text-center"><p className="case-label">Unauthorized Access: Submission Node Not Detected</p></div>;
    }

    const roundIndex = rounds.findIndex(r => r.id === round.id);
    const isFinalRound = roundIndex === rounds.length - 1;
    const isCompetitionComplete = isFinalRound && progress.status === 'submitted';
    const hasNextUnlocked = !isFinalRound && unlockedRounds.includes(rounds[roundIndex + 1].id);

    const submittedTime = progress.submittedAt
        ? new Date(progress.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'N/A';
    const timeTaken = formatDuration(progress.timeTakenSeconds);

    return (
        <div className="pt-2 pb-6">
            <div className="container max-w-[500px]">
                <div className="dossier-card rounded-lg shadow-2xl overflow-hidden border-t-2 border-t-emerald-500">
                    
                    <div className="p-5 text-center border-b border-border bg-slate-900/40">
                         <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                            <ShieldCheck size={16} className="text-emerald-500" />
                         </div>
                         <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="case-label text-emerald-500 text-[0.45rem]">Submission Confirmed</span>
                         </div>
                         <h2 className="text-lg font-black text-white uppercase tracking-tighter mb-1">
                            Case Resolved
                         </h2>
                         <p className="text-muted-foreground font-medium max-w-[240px] mx-auto leading-tight text-[0.65rem]">
                            Analytical findings for <span className="text-white">{round.title}</span> transmitted.
                         </p>
                    </div>

                    <div className="p-5 space-y-3">
                        {/* Technical Metadata */}
                        <div className="grid grid-cols-3 gap-2">
                             <div className="p-2 bg-secondary/10 border border-border rounded-lg text-center">
                                <p className="text-[0.45rem] font-mono text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Time</p>
                                <p className="text-[0.7rem] font-black text-white font-mono">{submittedTime}</p>
                             </div>
                             <div className="p-2 bg-secondary/10 border border-border rounded-lg text-center">
                                <p className="text-[0.45rem] font-mono text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Duration</p>
                                <p className="text-[0.7rem] font-black text-white font-mono">{timeTaken}</p>
                             </div>
                             <div className="p-2 bg-secondary/10 border border-border rounded-lg text-center">
                                <p className="text-[0.45rem] font-mono text-muted-foreground font-bold uppercase tracking-widest mb-0.5">Status</p>
                                <p className="text-[0.7rem] font-black text-emerald-500 font-mono">SECURED</p>
                             </div>
                        </div>

                        <div className="flex items-start gap-2 p-2.5 bg-slate-900/40 border border-dashed border-border rounded-lg">
                             <Database size={12} className="text-primary mt-0.5 shrink-0" />
                             <div>
                                <p className="text-[0.5rem] font-black text-white uppercase tracking-widest">Lock Active</p>
                                <p className="text-[0.5rem] text-muted-foreground font-medium leading-tight uppercase">Case file locked. No further edits.</p>
                             </div>
                        </div>

                        {/* Navigation Actions */}
                        <div className="flex flex-col gap-1.5">
                            {!isCompetitionComplete ? (
                                <>
                                    {competitionConfig.sequentialRoundUnlock && hasNextUnlocked ? (
                                        <Button variant="primary" size="lg" onClick={() => navigate(`/round/${rounds[roundIndex + 1].id}`)} className="h-10 text-[0.65rem] tracking-widest">
                                            <span>Proceed to Next Case</span>
                                            <ArrowRight size={12} className="ml-2" />
                                        </Button>
                                    ) : (
                                        <Button variant="primary" size="lg" onClick={() => navigate('/leaderboard')} className="h-10 text-[0.65rem] tracking-widest">
                                            <span>View Global Standings</span>
                                            <Trophy size={12} className="ml-2" />
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="h-8 uppercase tracking-[0.2em] font-black text-[0.45rem]">
                                        <LayoutDashboard size={10} className="mr-2" />
                                        Back to Command Center
                                    </Button>
                                </>
                            ) : (
                                <Button variant="primary" size="lg" onClick={() => navigate('/complete')} className="h-10 text-[0.65rem] tracking-widest bg-emerald-600 hover:bg-emerald-500 border-none">
                                    <span>Review Final Verdict</span>
                                    <Trophy size={14} className="ml-2" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-3 text-center">
                    <p className="text-[0.5rem] text-muted-foreground font-bold uppercase tracking-[0.3em]">
                        System Log: Round_{String(round.orderIndex + 1).padStart(2, '0')}_Verified
                    </p>
                </div>
            </div>
        </div>
    );
};
