import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, ArrowRight, Shield, Database } from 'lucide-react';
import type { Round, RoundProgress } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { cn } from '@/lib/utils';

interface RoundCardProps {
    round: Round;
    progress?: RoundProgress;
    isLocked?: boolean;
}

export const RoundCard: React.FC<RoundCardProps> = ({ round, progress, isLocked }) => {
    const navigate = useNavigate();

    const status = progress?.status || 'locked';
    const isCompleted = status === 'submitted';

    const handleAction = () => {
        if (isLocked) return;
        navigate(`/round/${round.id}`);
    };

    return (
        <div 
            onClick={handleAction}
            className={cn(
                "dossier-card group cursor-pointer transition-all duration-300 rounded-xl p-8 flex flex-col sm:flex-row sm:items-center gap-8 relative overflow-hidden",
                isLocked 
                    ? "opacity-60 cursor-not-allowed grayscale bg-slate-900/10 border-border/30" 
                    : "bg-[#181a1e] border-[#2d333a] hover:border-primary/40 hover:bg-[#1c2025] hover:shadow-2xl hover:shadow-primary/5 active:scale-[0.99]",
                isCompleted && "border-emerald-500/20 bg-emerald-500/[0.01]"
            )}
        >
            {/* Folder Accents */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-border group-hover:bg-primary transition-colors" />
            
            {/* Left/Main Content */}
            <div className="flex-1 min-w-0">
                {/* Top Row: Label and Status */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-300",
                            isCompleted 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                : isLocked 
                                    ? "bg-slate-800/50 border-border text-muted-foreground/50" 
                                    : "bg-slate-800 border-border text-primary shadow-inner-glow"
                        )}>
                            {isCompleted ? <CheckCircle2 size={16} /> : (isLocked ? <Lock size={16} /> : <Shield size={16} />)}
                        </div>
                        <span className="case-label text-[0.6rem]">Phase 0{round.id.at(-1)}</span>
                    </div>
                    {isCompleted ? (
                        <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black text-[0.6rem] tracking-widest">RESOLVED</Badge>
                    ) : (
                        isLocked 
                            ? <Badge variant="outline" className="opacity-40 font-black text-[0.6rem] tracking-widest">LOCKED</Badge> 
                            : <Badge variant="info" className="bg-primary/10 text-primary border-primary/20 font-black text-[0.6rem] tracking-widest">ACTIVE</Badge>
                    )}
                </div>

                {/* Middle: Title */}
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none group-hover:text-primary transition-colors mb-3">
                    {round.title}
                </h3>

                {/* Lower: Description */}
                <p className="text-[0.85rem] text-slate-400 line-clamp-1 font-medium leading-relaxed max-w-2xl">
                    {round.description}
                </p>
            </div>

            {/* Right/Action Section */}
            <div className="flex flex-col sm:items-end justify-between sm:h-full gap-4 sm:border-l sm:border-border/50 sm:pl-8">
                <div className="flex items-center gap-2 text-[0.6rem] font-mono text-muted-foreground font-black tracking-widest uppercase">
                    <Database size={12} className="text-primary/60" />
                    <span>{round.questions.length} Data Nodes</span>
                </div>
                
                <Button 
                    variant={isLocked ? "subtle" : "primary"} 
                    size="sm"
                    className={cn(
                        "h-11 px-8 rounded-lg font-black uppercase tracking-[0.2em] text-[0.65rem] transition-all duration-300",
                        !isLocked && "group-hover:translate-x-1"
                    )}
                >
                    {isCompleted ? "Review Analysis" : (isLocked ? "Access Restricted" : "Open Case")}
                    {!isLocked && <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
            </div>
        </div>
    );
};
