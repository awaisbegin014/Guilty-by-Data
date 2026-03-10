import React from 'react';
import { Badge } from './ui/Badge';
import type { Round, RoundProgress } from '../types';
import { Lock, Play, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface RoundCardProps {
    round: Round;
    progress: RoundProgress | undefined;
    isUnlocked: boolean;
    onAction: () => void;
    roundIndex?: number;
}

export const RoundCard: React.FC<RoundCardProps> = ({ round, progress, isUnlocked, onAction, roundIndex }) => {
    const status = round.status === 'closed' ? 'locked' : (progress?.status || (isUnlocked ? 'available' : 'locked'));

    const statusConfig = {
        locked: { label: 'Locked', badge: 'default' as const, icon: <Lock size={12} />, btnText: 'Locked' },
        available: { label: 'Available', badge: 'info' as const, icon: <Play size={12} />, btnText: `Enter Round ${(roundIndex ?? 0) + 1}` },
        in_progress: { label: 'In Progress', badge: 'warning' as const, icon: <Clock size={12} />, btnText: `Resume Round ${(roundIndex ?? 0) + 1}` },
        submitted: { label: 'Submitted', badge: 'success' as const, icon: <CheckCircle size={12} />, btnText: 'View Results' },
    }[status] ?? { label: 'Unknown', badge: 'default' as const, icon: null, btnText: 'Unknown' };

    const isLocked = status === 'locked';
    const isSubmitted = status === 'submitted';

    return (
        <motion.div
            className={cn(
                'bg-white border border-border rounded-[14px] overflow-hidden flex items-center transition-[box-shadow,transform] duration-[0.18s]',
                isLocked ? 'opacity-65' : 'shadow-sm',
                !isLocked && 'hover:shadow-md hover:-translate-y-px',
                isSubmitted ? 'border-l-4 border-l-green-600' : !isLocked ? 'border-l-4 border-l-slate-900' : ''
            )}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: (roundIndex ?? 0) * 0.08 }}
        >
            {/* Round Number */}
            <div className={cn(
                'w-14 shrink-0 self-stretch flex items-center justify-center border-r border-border',
                isLocked ? 'bg-muted' : isSubmitted ? 'bg-green-50' : 'bg-slate-50'
            )}>
                <span className={cn(
                    'font-mono text-base font-bold',
                    isLocked ? 'text-slate-400' : isSubmitted ? 'text-green-600' : 'text-slate-700'
                )}>
                    {(roundIndex ?? 0) + 1}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 py-4 px-[1.125rem] min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                    <h3 className={cn(
                        'text-[0.95rem] font-bold leading-snug truncate',
                        isLocked ? 'text-slate-400' : 'text-slate-900'
                    )}>
                        {round.title}
                    </h3>
                    <Badge variant={statusConfig.badge}>
                        {statusConfig.icon}
                        {statusConfig.label}
                    </Badge>
                </div>

                <p className="text-[0.82rem] text-muted-foreground leading-relaxed mb-2">
                    {round.description}
                </p>

                {status === 'in_progress' && progress?.timeRemainingMs !== null && progress?.timeRemainingMs !== undefined && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
                        <Clock size={11} />
                        {Math.max(0, Math.floor(progress.timeRemainingMs / 60000))}m {Math.floor((progress.timeRemainingMs % 60000) / 1000)}s remaining
                    </div>
                )}
            </div>

            {/* Action */}
            <div className="px-4 shrink-0">
                {isLocked ? (
                    <div className="w-9 h-9 rounded-[10px] bg-muted border border-border flex items-center justify-center">
                        <Lock size={15} className="text-slate-400" />
                    </div>
                ) : (
                    <button
                        onClick={onAction}
                        className={cn(
                            'flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[0.8rem] font-semibold cursor-pointer whitespace-nowrap transition-all duration-150',
                            isSubmitted
                                ? 'bg-transparent border border-slate-300 text-slate-700 hover:bg-muted'
                                : 'bg-slate-900 border border-slate-900 text-white hover:bg-slate-800'
                        )}
                    >
                        {statusConfig.btnText}
                        <ChevronRight size={14} />
                    </button>
                )}
            </div>
        </motion.div>
    );
};
