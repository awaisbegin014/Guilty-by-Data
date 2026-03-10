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
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-40">
                <div className="container h-[60px] flex items-center justify-between">
                    {/* Brand */}
                    <div
                        className={`flex items-center gap-3 ${team ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => team && navigate('/dashboard')}
                    >
                        <div className="w-[34px] h-[34px] rounded-[9px] bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                            <span className="font-mono font-bold text-[0.72rem] text-slate-200 tracking-widest">GbD</span>
                        </div>
                        <div>
                            <div className="font-bold text-[0.9rem] text-slate-50 leading-tight tracking-tight">Guilty by Data</div>
                            <div className="text-[0.62rem] text-slate-500 tracking-[0.1em] uppercase font-semibold">Corporate Forensics</div>
                        </div>
                    </div>

                    {/* Nav Actions */}
                    {team && (
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-800">
                                <UserCircle size={15} className="text-slate-500" />
                                <span className="text-[0.8rem] font-semibold text-slate-300">{team.name}</span>
                            </div>

                            <div className="w-px h-4 bg-slate-800" />

                            <button
                                onClick={() => navigate(isLeaderboard ? '/dashboard' : '/leaderboard')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-transparent border border-slate-700/60 text-slate-400 cursor-pointer text-[0.78rem] font-semibold transition-all duration-150 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-600"
                            >
                                <Trophy size={13} />
                                {isLeaderboard ? 'Dashboard' : 'Leaderboard'}
                            </button>

                            <button
                                onClick={handleLogout}
                                title="Log out"
                                className="flex items-center p-1.5 rounded-lg bg-transparent border border-transparent text-slate-600 cursor-pointer transition-all duration-150 hover:text-red-400 hover:bg-red-500/10"
                            >
                                <LogOut size={15} />
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200/80 bg-gradient-to-b from-white to-slate-50 py-5">
                <div className="container text-center">
                    <p className="text-[0.75rem] text-slate-400 font-medium">
                        © {new Date().getFullYear()} Guilty by Data · Competition Platform
                    </p>
                    <p className="text-[0.68rem] text-slate-300 mt-0.5 tracking-wide">
                        Data Analytics Investigation Simulation
                    </p>
                </div>
            </footer>
        </div>
    );
};
