import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockLeaderboard } from '../../data/mockData';
import { Button } from '../../components/ui/Button';
import { Trophy, ArrowLeft, Clock, Target } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
    const { team } = useAppStore();
    const navigate = useNavigate();

    const formatTimeAgo = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const medalStyle = (rank: number): React.CSSProperties => {
        if (rank === 1) return { background: '#fef9c3', color: '#b45309', border: '2px solid #fbbf24' };
        if (rank === 2) return { background: '#f1f5f9', color: '#475569', border: '2px solid #94a3b8' };
        if (rank === 3) return { background: '#fff7ed', color: '#c2410c', border: '2px solid #fb923c' };
        return { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' };
    };

    return (
        <div style={{ paddingTop: '2rem', paddingBottom: '3rem' }} className="animate-fade-in">
            <div className="container" style={{ maxWidth: '800px' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px',
                            background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Trophy size={22} color="#fbbf24" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                                Global Leaderboard
                            </h2>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                Top Investigators Ranking
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={15} style={{ marginRight: '0.375rem' }} />
                        Dashboard
                    </Button>
                </div>

                {/* Table */}
                <div style={{
                    background: '#fff', border: '1px solid var(--border)',
                    borderRadius: '16px', overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                }}>
                    {/* Table head */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '64px 1fr 100px 90px 110px',
                        background: 'var(--bg-base)', borderBottom: '1px solid var(--border)',
                        padding: '0.75rem 1.25rem',
                    }}>
                        {['Rank', 'Team', 'Score', 'Solved', 'Last Active'].map((h, i) => (
                            <div key={i} style={{
                                fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-subtle)',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                                textAlign: i >= 2 ? 'center' : 'left',
                            }}>
                                {h}
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    {mockLeaderboard.map((entry, index) => {
                        const isCurrentTeam = team?.id === entry.teamId || team?.name === entry.teamName;
                        const medal = medalStyle(entry.rank);

                        return (
                            <div
                                key={entry.teamId}
                                className="animate-slide-up"
                                style={{
                                    display: 'grid', gridTemplateColumns: '64px 1fr 100px 90px 110px',
                                    padding: '1rem 1.25rem', alignItems: 'center',
                                    borderBottom: index < mockLeaderboard.length - 1 ? '1px solid var(--divider)' : 'none',
                                    background: isCurrentTeam ? '#f0f7ff' : 'transparent',
                                    animationDelay: `${index * 60}ms`,
                                    animationFillMode: 'both',
                                    transition: 'background 0.15s',
                                }}
                                onMouseOver={e => { if (!isCurrentTeam) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-base)'; }}
                                onMouseOut={e => { if (!isCurrentTeam) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                            >
                                {/* Rank */}
                                <div>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.85rem', fontWeight: 800,
                                        ...medal,
                                    }}>
                                        {entry.rank}
                                    </div>
                                </div>

                                {/* Team */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                                    <span style={{
                                        fontSize: '0.9rem', fontWeight: 700,
                                        color: entry.rank <= 3 ? '#0f172a' : '#334155',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {entry.teamName}
                                    </span>
                                    {isCurrentTeam && (
                                        <span style={{
                                            fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                            letterSpacing: '0.05em', padding: '0.1rem 0.5rem',
                                            background: '#1d4ed8', color: '#fff', borderRadius: '99px',
                                            flexShrink: 0,
                                        }}>
                                            You
                                        </span>
                                    )}
                                    {entry.rank === 1 && <Trophy size={13} color="#fbbf24" style={{ flexShrink: 0 }} />}
                                </div>

                                {/* Score */}
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                        {entry.points}
                                    </span>
                                </div>

                                {/* Solved */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                        padding: '0.25rem 0.625rem', borderRadius: '8px',
                                        background: 'var(--bg-base)', border: '1px solid var(--border)',
                                        fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-body)',
                                    }}>
                                        <Target size={12} color="#64748b" />
                                        {entry.roundsCompleted}/3
                                    </div>
                                </div>

                                {/* Last Active */}
                                <div style={{
                                    textAlign: 'center', display: 'flex', alignItems: 'center',
                                    justifyContent: 'flex-end', gap: '0.375rem',
                                    fontSize: '0.78rem', color: 'var(--text-subtle)',
                                }}>
                                    <Clock size={12} />
                                    {formatTimeAgo(entry.latestSubmissionTime)}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Mobile back btn */}
                <div style={{ marginTop: '1.5rem' }}>
                    <Button variant="outline" onClick={() => navigate('/dashboard')} style={{ width: '100%' }}>
                        <ArrowLeft size={15} style={{ marginRight: '0.375rem' }} />
                        Back to Dashboard
                    </Button>
                </div>

            </div>
        </div>
    );
};
