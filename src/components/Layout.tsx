import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { UserCircle, Trophy, LogOut } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const Layout: React.FC = () => {
    const { team, setTeam } = useAppStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        setTeam(null);
        navigate('/');
    };

    const isLeaderboard = location.pathname === '/leaderboard';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Header */}
            <header style={{
                background: '#0f172a',
                borderBottom: '1px solid #1e293b',
                position: 'sticky',
                top: 0,
                zIndex: 40,
                height: '64px',
            }}>
                <div className="container" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Brand */}
                    <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: team ? 'pointer' : 'default' }}
                        onClick={() => team && navigate('/dashboard')}
                    >
                        <div style={{
                            width: '36px', height: '36px', borderRadius: '8px',
                            background: '#1e293b', border: '1px solid #334155',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem', color: '#e2e8f0', letterSpacing: '0.05em' }}>GbD</span>
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc', lineHeight: 1.2 }}>Guilty by Data</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Corporate Forensics</div>
                        </div>
                    </div>

                    {/* Nav Actions */}
                    {team && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                                <UserCircle size={18} />
                                <span style={{ fontWeight: 500, color: '#cbd5e1' }}>{team.name}</span>
                            </div>

                            <div style={{ width: '1px', height: '20px', background: '#1e293b' }} />

                            <button
                                onClick={() => navigate(isLeaderboard ? '/dashboard' : '/leaderboard')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.375rem',
                                    padding: '0.375rem 0.75rem', borderRadius: '8px',
                                    background: 'transparent', border: '1px solid #1e293b',
                                    color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseOver={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = '#1e293b';
                                    (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
                                }}
                                onMouseOut={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                                }}
                            >
                                <Trophy size={14} />
                                {isLeaderboard ? 'Dashboard' : 'Leaderboard'}
                            </button>

                            <button
                                onClick={handleLogout}
                                title="Log out"
                                style={{
                                    display: 'flex', alignItems: 'center',
                                    padding: '0.375rem', borderRadius: '8px',
                                    background: 'transparent', border: '1px solid transparent',
                                    color: '#475569', cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseOver={e => {
                                    (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
                                    (e.currentTarget as HTMLButtonElement).style.background = '#1e293b';
                                }}
                                onMouseOut={e => {
                                    (e.currentTarget as HTMLButtonElement).style.color = '#475569';
                                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                }}
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main */}
            <main style={{ flex: 1 }}>
                <Outlet />
            </main>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid var(--border)',
                background: '#fff',
                padding: '1.5rem 0',
            }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                        © {new Date().getFullYear()} Guilty by Data — Competition Platform
                    </p>
                    <p style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '0.25rem' }}>
                        Data Analytics Investigation Simulation
                    </p>
                </div>
            </footer>
        </div>
    );
};
