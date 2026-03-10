import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { LayoutDashboard, Target, HelpCircle, LogOut, ShieldCheck } from 'lucide-react';
import { cn } from '../utils/cn';

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
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>

            {/* ── Header ── */}
            <header style={{
                background: '#0f172a',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                position: 'sticky', top: 0, zIndex: 40,
                height: '60px',
            }}>
                <div className="container" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem' }}>

                    {/* Brand */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                        <ShieldCheck size={18} color="#94a3b8" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                            GBD Admin
                        </span>
                        <span style={{
                            fontSize: '0.65rem', fontWeight: 600, color: '#475569',
                            background: '#1e293b', border: '1px solid #334155',
                            borderRadius: '4px', padding: '0.1rem 0.4rem',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                            Control
                        </span>
                    </div>

                    {/* Nav */}
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1, justifyContent: 'center' }}>
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        'admin-nav-link',
                                        isActive && 'admin-nav-link--active'
                                    )}
                                    style={{ textDecoration: 'none' }}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sign out */}
                    <button
                        onClick={handleLogout}
                        className="admin-signout-btn"
                        style={{ flexShrink: 0 }}
                    >
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </div>
            </header>

            {/* ── Main content ── */}
            <main style={{ flex: 1, padding: '2rem 0 3rem' }}>
                <div className="container">
                    <Outlet />
                </div>
            </main>

            {/* ── Footer ── */}
            <footer style={{ borderTop: '1px solid var(--border)', background: '#fff', padding: '1rem 0' }}>
                <div className="container" style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        © {new Date().getFullYear()} Guilty by Data · Admin Panel · Authorized Access Only
                    </p>
                </div>
            </footer>
        </div>
    );
};
