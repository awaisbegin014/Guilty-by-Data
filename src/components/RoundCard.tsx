import React from 'react';


import { Badge } from './ui/Badge';
import type { Round, RoundProgress } from '../types';
import { Lock, Play, CheckCircle, Clock, ChevronRight } from 'lucide-react';

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
        <div style={{
            background: '#fff',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: isLocked ? 'none' : 'var(--shadow-sm)',
            opacity: isLocked ? 0.65 : 1,
            transition: 'box-shadow 0.18s, transform 0.18s',
            display: 'flex', alignItems: 'center',
            ...(isSubmitted ? { borderLeft: '4px solid #16a34a' } : isLocked ? {} : { borderLeft: '4px solid #0f172a' }),
        }}
            onMouseOver={e => {
                if (!isLocked) {
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                }
            }}
            onMouseOut={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = isLocked ? 'none' : 'var(--shadow-sm)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
        >
            {/* Round Number */}
            <div style={{
                width: '56px', flexShrink: 0, alignSelf: 'stretch',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isLocked ? 'var(--bg-elevated)' : isSubmitted ? '#f0fdf4' : '#f8fafc',
                borderRight: '1px solid var(--border)',
            }}>
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700,
                    color: isLocked ? '#94a3b8' : isSubmitted ? '#16a34a' : '#334155',
                }}>
                    {(roundIndex ?? 0) + 1}
                </span>
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '1rem 1.125rem', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.375rem' }}>
                    <h3 style={{
                        fontSize: '0.95rem', fontWeight: 700, color: isLocked ? '#94a3b8' : '#0f172a',
                        lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {round.title}
                    </h3>
                    <Badge variant={statusConfig.badge}>
                        {statusConfig.icon}
                        {statusConfig.label}
                    </Badge>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                    {round.description}
                </p>

                {status === 'in_progress' && progress?.timeRemainingMs !== null && progress?.timeRemainingMs !== undefined && (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        fontSize: '0.75rem', fontWeight: 600, color: '#b45309',
                        background: '#fffbeb', border: '1px solid #fde68a',
                        borderRadius: '6px', padding: '0.2rem 0.5rem',
                    }}>
                        <Clock size={11} />
                        {Math.max(0, Math.floor(progress.timeRemainingMs / 60000))}m {Math.floor((progress.timeRemainingMs % 60000) / 1000)}s remaining
                    </div>
                )}
            </div>

            {/* Action */}
            <div style={{ padding: '0 1rem', flexShrink: 0 }}>
                {isLocked ? (
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Lock size={15} color="#94a3b8" />
                    </div>
                ) : (
                    <button
                        onClick={onAction}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            padding: '0.5rem 0.875rem',
                            background: isSubmitted ? 'transparent' : '#0f172a',
                            border: isSubmitted ? '1px solid var(--border-strong)' : '1px solid #0f172a',
                            borderRadius: '10px',
                            color: isSubmitted ? '#334155' : '#fff',
                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseOver={e => {
                            const el = e.currentTarget as HTMLButtonElement;
                            if (isSubmitted) { el.style.background = 'var(--bg-elevated)'; }
                            else { el.style.background = '#1e293b'; }
                        }}
                        onMouseOut={e => {
                            const el = e.currentTarget as HTMLButtonElement;
                            el.style.background = isSubmitted ? 'transparent' : '#0f172a';
                        }}
                    >
                        {statusConfig.btnText}
                        <ChevronRight size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};
