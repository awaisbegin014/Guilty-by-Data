import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { UserCircle, Trophy, LogOut } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';

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
        <div className="flex flex-col" style={{ minHeight: '100vh' }}>
            {/* Header */}
            <header className="bg-slate-900 text-white shadow-md z-10 sticky top-0">
                <div className="container py-4 flex items-center justify-between">
                    <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => team && navigate('/dashboard')}
                    >
                        <div className="bg-slate-700 p-2 rounded-md">
                            <span className="font-bold text-xl tracking-wider text-white mono">GbD</span>
                        </div>
                        <div>
                            <h1 className="text-white text-lg font-bold m-0 leading-tight">Guilty by Data</h1>
                            <p className="text-slate-400 text-xs m-0">Corporate Forensics</p>
                        </div>
                    </div>

                    {team && (
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-slate-300">
                                <UserCircle size={20} />
                                <span className="font-medium text-sm hidden md:inline">{team.name}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    className="text-slate-300 border-slate-700 hover:bg-slate-800 hidden md:flex"
                                    onClick={() => navigate(isLeaderboard ? '/dashboard' : '/leaderboard')}
                                >
                                    <Trophy size={16} className="mr-2" />
                                    {isLeaderboard ? 'Dashboard' : 'Leaderboard'}
                                </Button>

                                <button
                                    onClick={handleLogout}
                                    className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm"
                                    title="Log out"
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-slate-100 border-t border-slate-200 py-6 mt-12">
                <div className="container text-center">
                    <p className="text-sm text-slate-500">
                        &copy; {new Date().getFullYear()} Guilty by Data Competition Platform. All rights reserved.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Data Analytics Investigation Simulation</p>
                </div>
            </footer>
        </div>
    );
};
