import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { LayoutDashboard, Target, HelpCircle, LogOut } from 'lucide-react';
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
        { path: '/admin/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
        { path: '/admin/rounds', icon: <Target size={18} />, label: 'Rounds' },
        { path: '/admin/questions', icon: <HelpCircle size={18} />, label: 'Questions' },
    ];

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">

            {/* Admin Header */}
            <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
                <div className="container h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link to="/admin/dashboard" className="flex items-center gap-2 no-underline group">
                            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
                                <Target size={20} />
                            </div>
                            <span className="text-xl font-bold text-foreground">GBD Admin</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const isActive = location.pathname.startsWith(item.path);
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={cn(
                                            'inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors no-underline',
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                        )}
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLogout}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <LogOut size={16} />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-8 bg-muted/30">
                <div className="container max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
