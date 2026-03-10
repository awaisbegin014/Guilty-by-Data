import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { LayoutDashboard, Target, HelpCircle, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setAdmin } = useAppStore();

    const handleLogout = () => {
        setAdmin(false);
        navigate('/admin/login');
    };

    const navItems = [
        { path: '/admin/dashboard', icon: <LayoutDashboard size={15} />, label: 'Overview' },
        { path: '/admin/rounds', icon: <Target size={15} />, label: 'Rounds' },
        { path: '/admin/questions', icon: <HelpCircle size={15} />, label: 'Questions' },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">

            {/* ── Header ── */}
            <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950">
                <div className="container h-14 flex items-center justify-between gap-8">

                    {/* Brand */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <ShieldCheck size={17} className="text-slate-300" />
                        <span className="text-[0.85rem] font-bold tracking-tight text-white">
                            GBD Admin
                        </span>
                        <span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-[1px] text-[0.6rem] font-semibold uppercase tracking-wider text-slate-300">
                            Control
                        </span>
                    </div>

                    {/* Nav */}
                    <nav className="flex items-center gap-1 flex-1 justify-center">
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[0.82rem] font-semibold no-underline transition-colors duration-150',
                                        isActive
                                            ? 'bg-slate-700 text-white'
                                            : 'text-white hover:text-white hover:bg-slate-800'
                                    )}
                                >
                                    {React.cloneElement(item.icon, { size: 16 })}
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sign out */}
                    <button
                        onClick={handleLogout}
                        className="shrink-0 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-transparent px-3 py-1.5 text-[0.78rem] font-semibold text-slate-200 transition-colors duration-150 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
                    >
                        <LogOut size={13} />
                        Sign Out
                    </button>
                </div>
            </header>

            {/* ── Main content ── */}
            <main className="flex-1 py-8 pb-12">
                <div className="container">
                    <Outlet />
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-slate-200/80 bg-gradient-to-b from-white to-slate-50 py-4">
                <div className="container text-center">
                    <p className="text-[0.72rem] text-slate-400 font-medium">
                        © {new Date().getFullYear()} Guilty by Data · Admin Panel · Authorized Access Only
                    </p>
                </div>
            </footer>
        </div>
    );
};
