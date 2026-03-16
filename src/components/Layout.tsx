import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { UserCircle, Trophy, LogOut, Database } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatParticipantIdentifier } from '../lib/teamIdentity';

export const Layout: React.FC = () => {
    const { team, logout } = useAppStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const isLeaderboard = location.pathname === '/leaderboard';

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground bg-analytical-grid">
            {/* Header */}
            <header className="bg-card/80 backdrop-blur-md border-b border-border z-40 shrink-0">
                <div className="container h-[64px] flex items-center justify-between">
                    {/* Brand */}
                    <div
                        className={`flex items-center gap-3 ${team ? 'cursor-pointer' : 'cursor-default'} group`}
                        onClick={() => team && navigate('/dashboard')}
                    >
                        <div className="w-9 h-9 rounded-md bg-secondary border border-border flex items-center justify-center shadow-inner-glow transition-all group-hover:border-primary/50 overflow-hidden">
                            <img src="/logo.png" alt="Guilty By Data Logo" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <div className="font-black text-base text-white leading-tight tracking-tighter uppercase">Guilty By Data</div>
                            <div className="text-[0.55rem] text-muted-foreground tracking-[0.2em] uppercase font-bold flex items-center gap-1.5 font-mono">
                                <Database size={9} />
                                investigation portal
                            </div>
                        </div>
                    </div>

                    {/* Nav Actions */}
                    {team && (
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-secondary border border-border">
                                <UserCircle size={14} className="text-muted-foreground" />
                                <span className="text-[0.65rem] font-black text-foreground font-mono uppercase tracking-wider">
                                    {formatParticipantIdentifier(team.username || team.email || team.name)}
                                </span>
                            </div>

                            <div className="w-px h-5 bg-border mx-1" />

                            <button
                                onClick={() => navigate(isLeaderboard ? '/dashboard' : '/leaderboard')}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[0.65rem] font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-95 shadow-lg shadow-primary/10"
                            >
                                <Trophy size={12} />
                                {isLeaderboard ? 'Dashboard' : 'Leaderboard'}
                            </button>

                            <button
                                onClick={() => void handleLogout()}
                                title="Secure Logout"
                                className="flex items-center p-1.5 rounded-md text-muted-foreground hover:text-white hover:bg-destructive/10 transition-colors"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 relative overflow-y-auto">
                <div className="min-h-full flex flex-col">
                    <div className="flex-1">
                        <Outlet />
                    </div>
                    
                    {/* Footer */}
                    <footer className="border-t border-border bg-card/50 py-6 shrink-0 mt-auto">
                        <div className="container">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="text-left">
                                    <p className="case-label mb-0.5">System Status: Active</p>
                                    <p className="text-[0.6rem] text-muted-foreground font-medium uppercase tracking-tight">
                                        Investigation Terminal v2.4.0 // Secured Protocol Active
                                    </p>
                                </div>
                                <div className="text-center md:text-right">
                                    <p className="text-[0.6rem] text-muted-foreground font-medium uppercase tracking-tight">
                                        © {new Date().getFullYear()} Guilty By Data · Competitive Analytics Platform
                                    </p>
                                </div>
                            </div>
                        </div>
                    </footer>
                </div>
            </main>
        </div>
    );
};
