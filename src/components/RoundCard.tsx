import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Lock, ArrowRight, Shield, Database, PauseCircle, AlertTriangle, Radar } from 'lucide-react';
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
    const isPlayable = status === 'available' || status === 'in_progress';
    const isHardLocked = status === 'locked' || isLocked;

    const handleAction = () => {
        if (isCompleted) {
            navigate(`/round/${round.id}/submitted`);
            return;
        }

        if (!isPlayable) return;
        navigate(`/round/${round.id}`);
    };

    const statusMeta = {
        submitted: {
            badge: 'RESOLVED',
            icon: <CheckCircle2 size={16} />,
            accent: 'border-emerald-500/20 bg-emerald-500/[0.01]',
            iconClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
            buttonLabel: 'Review Submission',
        },
        available: {
            badge: 'LIVE',
            icon: <Shield size={16} />,
            accent: '',
            iconClass: 'bg-slate-800 border-border text-primary shadow-inner-glow',
            buttonLabel: 'Open Case',
        },
        in_progress: {
            badge: 'IN PROGRESS',
            icon: <Shield size={16} />,
            accent: 'border-primary/20 bg-primary/[0.02]',
            iconClass: 'bg-primary/10 border-primary/20 text-primary',
            buttonLabel: 'Resume Analysis',
        },
        not_started: {
            badge: 'STANDBY',
            icon: <Radar size={16} />,
            accent: 'bg-slate-900/10 border-border/30',
            iconClass: 'bg-slate-800/50 border-border text-slate-300',
            buttonLabel: 'Awaiting Start',
        },
        paused: {
            badge: 'PAUSED',
            icon: <PauseCircle size={16} />,
            accent: 'bg-amber-500/[0.04] border-amber-500/20',
            iconClass: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
            buttonLabel: 'Timer Paused',
        },
        expired: {
            badge: 'EXPIRED',
            icon: <AlertTriangle size={16} />,
            accent: 'bg-red-500/[0.04] border-red-500/20',
            iconClass: 'bg-red-500/10 border-red-500/20 text-red-300',
            buttonLabel: 'Window Closed',
        },
        locked: {
            badge: 'LOCKED',
            icon: <Lock size={16} />,
            accent: 'opacity-60 cursor-not-allowed grayscale bg-slate-900/10 border-border/30',
            iconClass: 'bg-slate-800/50 border-border text-muted-foreground/50',
            buttonLabel: 'Access Restricted',
        },
    }[status];

    return (
        <div 
            onClick={handleAction}
            className={cn(
                "dossier-card group cursor-pointer transition-all duration-300 rounded-xl p-8 flex flex-col sm:flex-row sm:items-center gap-8 relative overflow-hidden",
                isHardLocked || !isPlayable
                    ? "cursor-default"
                    : "bg-[#181a1e] border-[#2d333a] hover:border-primary/40 hover:bg-[#1c2025] hover:shadow-2xl hover:shadow-primary/5 active:scale-[0.99]",
                statusMeta.accent
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
                            statusMeta.iconClass
                        )}>
                            {statusMeta.icon}
                        </div>
                        <span className="case-label text-[0.6rem]">Phase {String(round.orderIndex + 1).padStart(2, '0')}</span>
                    </div>
                    <Badge
                        variant={isCompleted ? 'success' : status === 'expired' ? 'warning' : status === 'paused' ? 'warning' : status === 'locked' ? 'outline' : 'info'}
                        className={cn(
                            'font-black text-[0.6rem] tracking-widest',
                            status === 'locked' && 'opacity-60',
                        )}
                    >
                        {statusMeta.badge}
                    </Badge>
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
                    <span>{round.questionCount} Data Nodes</span>
                </div>
                
                <Button 
                    variant={!isPlayable ? "subtle" : "primary"} 
                    size="sm"
                    className={cn(
                        "h-11 px-8 rounded-lg font-black uppercase tracking-[0.2em] text-[0.65rem] transition-all duration-300",
                        (isPlayable || isCompleted) && "group-hover:translate-x-1"
                    )}
                >
                    {statusMeta.buttonLabel}
                    {(isPlayable || isCompleted) && <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                </Button>
            </div>
        </div>
    );
};
