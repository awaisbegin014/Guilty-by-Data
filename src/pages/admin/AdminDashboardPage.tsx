import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Database, Activity, CheckSquare, AlertCircle, RefreshCw } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
    const { rounds, roundsProgress, resetParticipantProgress } = useAppStore();
    const navigate = useNavigate();

    const totalRounds = rounds.length;
    const activeInvestigations = Object.values(roundsProgress).filter(p => p.status === 'in_progress').length;
    const completedInvestigations = Object.values(roundsProgress).filter(p => p.status === 'submitted').length;

    const handleReset = () => {
        if (window.confirm('Reset all participant progress? This cannot be undone.')) {
            resetParticipantProgress();
            alert('Participant progress has been reset.');
            // Stay on admin dashboard — do NOT redirect to participant side
        }
    };

    const StatCard = ({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) => (
        <div style={{
            background: '#fff', borderRadius: '14px', padding: '1.5rem',
            border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'box-shadow 0.18s',
        }}>
            <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
                    {label}
                </p>
                <p style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                    {value}
                </p>
            </div>
            <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {icon}
            </div>
        </div>
    );

    const ActionCard = ({ title, desc, cta, path, accent }: { title: string; desc: string; cta: string; path: string; accent: string }) => (
        <div
            onClick={() => navigate(path)}
            style={{
                background: '#fff', borderRadius: '14px', padding: '1.5rem',
                border: '1px solid var(--border)', cursor: 'pointer',
                borderLeft: `4px solid ${accent}`,
                boxShadow: 'var(--shadow-sm)',
                transition: 'box-shadow 0.18s, transform 0.18s',
            }}
            onMouseOver={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
        >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}>{desc}</p>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: accent }}>
                {cta} →
            </span>
        </div>
    );

    return (
        <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">

            {/* Page Header */}
            <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.375rem' }}>System Overview</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>Monitor competition status and manage configurations.</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <StatCard label="Total Rounds" value={totalRounds}
                    icon={<Database size={22} color="#2563eb" />} color="#eff6ff" />
                <StatCard label="In Progress" value={activeInvestigations}
                    icon={<Activity size={22} color="#d97706" />} color="#fffbeb" />
                <StatCard label="Completed" value={completedInvestigations}
                    icon={<CheckSquare size={22} color="#16a34a" />} color="#f0fdf4" />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Mission Control
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <ActionCard
                        title="Manage Rounds"
                        desc="Configure dataset links, open/close rounds, and edit round content for each investigation phase."
                        cta="Open Round Settings"
                        path="/admin/rounds"
                        accent="#2563eb"
                    />
                    <ActionCard
                        title="Manage Questions"
                        desc="Add, edit, or remove MCQ questions; set correct answers and option text per round."
                        cta="Open Question Editor"
                        path="/admin/questions"
                        accent="#7c3aed"
                    />
                </div>
            </div>

            {/* Reset + Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Danger Zone */}
                <div style={{
                    background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '14px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem',
                }}>
                    <div>
                        <h4 style={{ fontWeight: 700, color: '#b91c1c', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                            Reset Participant Progress
                        </h4>
                        <p style={{ fontSize: '0.82rem', color: '#ef4444', lineHeight: 1.6 }}>
                            Clears all submitted answers, timers, and unlocks. Use for testing only.
                        </p>
                    </div>
                    <button
                        onClick={handleReset}
                        style={{
                            flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1rem', background: '#fff', border: '1px solid #fca5a5',
                            borderRadius: '8px', color: '#b91c1c', fontSize: '0.82rem', fontWeight: 600,
                            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s',
                        }}
                        onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'}
                        onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.background = '#fff'}
                    >
                        <RefreshCw size={14} />
                        Reset Progress
                    </button>
                </div>

                {/* Prototype Note */}
                <div style={{
                    background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '14px',
                    padding: '1.25rem 1.5rem',
                    display: 'flex', alignItems: 'flex-start', gap: '1rem',
                }}>
                    <AlertCircle size={18} color="#64748b" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div>
                        <h4 style={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                            Prototype Environment
                        </h4>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            Running without a backend. All changes persist only in this browser session via localStorage. Team activity stats shown here reflect local state only.
                        </p>
                    </div>
                </div>
            </div>

        </div>
    );
};
