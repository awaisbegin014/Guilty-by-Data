import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Trophy, LayoutDashboard, Star, ShieldCheck, Database, Award, BarChart4 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const CompetitionCompletePage: React.FC = () => {
    const navigate = useNavigate();
    const { team, rounds, roundsProgress, leaderboard } = useAppStore();

    const roundsCompleted = Object.values(roundsProgress).filter(p => p.status === 'submitted').length;
    const leaderboardEntry = leaderboard.find((entry) => entry.teamId === team?.id);
    const totalPoints = leaderboardEntry?.totalScore ?? 0;
    const rank = leaderboardEntry?.rank ?? null;

    return (
        <div className="pt-10 pb-16">
            <div className="container max-w-[640px]">
                <div className="dossier-card rounded-2xl shadow-2xl overflow-hidden">
                    
                    {/* Official Verdict Header */}
                    <div className="bg-slate-900 px-10 py-12 text-center border-b border-border relative">
                        <div className="absolute top-0 right-0 p-4">
                             <ShieldCheck size={32} className="text-white/5" />
                        </div>
                        <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/20">
                            <Award size={40} className="text-primary" />
                        </div>
                        <span className="case-label text-primary mb-2 block text-[0.6rem]">Final Verdict Delivered</span>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-3">
                            Investigation Concluded
                        </h1>
                        <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[0.6rem]">
                            Registry Entry: COMP_COMP_7492
                        </p>
                    </div>

                    {/* Report Content */}
                    <div className="p-10 flex flex-col gap-8">

                        <div className="text-center space-y-3">
                            <p className="text-base text-slate-200 leading-relaxed font-normal">
                                Commendable work, <span className="font-black text-primary uppercase">{team?.name || 'Investigator'}</span>.
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed max-w-[440px] mx-auto font-medium">
                                Your comprehensive analysis of the Ashworth datasets has been finalized. 
                                The executive board has received your findings for deliberation.
                            </p>
                        </div>

                        {/* Analytical Statistics */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { label: 'Total Score', value: totalPoints.toLocaleString(), unit: 'PTS', icon: <Trophy size={14} />, color: 'text-primary' },
                                { label: 'Global Rank', value: rank ? `#${rank}` : 'TBD', unit: 'PLACE', icon: <BarChart4 size={14} />, color: 'text-emerald-500' },
                                { label: 'Rounds Submitted', value: `${roundsCompleted}/${rounds.length}`, unit: 'ROUNDS', icon: <Database size={14} />, color: 'text-white' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-secondary/30 border border-border rounded-xl p-5 text-center">
                                    <div className={`flex items-center justify-center gap-1.5 mb-2 ${stat.color} opacity-60`}>
                                        {stat.icon}
                                        <span className="text-[0.6rem] font-black uppercase tracking-widest">{stat.label}</span>
                                    </div>
                                    <p className={`text-2xl font-black ${stat.color} font-mono leading-none mb-1`}>{stat.value}</p>
                                    <p className="text-[0.55rem] text-muted-foreground font-bold font-mono tracking-widest">{stat.unit}</p>
                                </div>
                            ))}
                        </div>

                        {/* Completion Proof */}
                        <div className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-900/40 border border-dashed border-border rounded-xl">
                            <Star size={16} className="text-primary" />
                            <span className="text-[0.7rem] text-muted-foreground font-bold uppercase tracking-widest">
                                {roundsCompleted} / {rounds.length} Case Files Successfully Processed
                            </span>
                        </div>

                        {/* Post-Mission Protocols */}
                        <div className="flex gap-4">
                            <Button variant="outline" size="lg" onClick={() => navigate('/dashboard')} className="flex-1 h-14 text-sm uppercase tracking-widest font-black">
                                <LayoutDashboard size={16} className="mr-2" />
                                <span>Return Home</span>
                            </Button>
                            <Button variant="primary" size="lg" onClick={() => navigate('/leaderboard')} className="flex-1 h-14 text-sm uppercase tracking-widest font-black">
                                <span>Official Standings</span>
                                <Trophy size={16} className="ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="mt-10 text-center">
                    <p className="text-[0.65rem] text-muted-foreground font-bold uppercase tracking-[0.4em]">
                        // End of Line // System Session Terminated Normally
                    </p>
                </div>
            </div>
        </div>
    );
};
