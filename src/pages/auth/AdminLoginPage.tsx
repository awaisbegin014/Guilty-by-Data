import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { ShieldCheck, User, KeyRound, AlertCircle } from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
    const [adminId, setAdminId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { setAdmin } = useAppStore();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        setTimeout(() => {
            if (adminId === 'guilty_by_data' && password === '17014130') {
                setAdmin(true);
                navigate('/admin/dashboard');
            } else {
                setError('Invalid credentials. Access denied.');
                setIsLoading(false);
            }
        }, 600);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            padding: '2rem 1rem',
        }}>
            <div style={{ width: '100%', maxWidth: '400px' }} className="animate-fade-in">

                {/* Brand mark */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '14px',
                        background: '#1e293b', border: '1px solid #334155',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem',
                    }}>
                        <ShieldCheck size={26} color="#94a3b8" />
                    </div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.25rem' }}>
                        Restricted Access
                    </h1>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                        Authorized Organizers Only
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
                }}>
                    <div style={{ padding: '2rem' }}>
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                            {/* Error */}
                            {error && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: '10px', color: '#fca5a5',
                                    fontSize: '0.85rem', fontWeight: 500,
                                }}>
                                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Admin ID */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Admin Identifier
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <User size={15} style={{
                                        position: 'absolute', left: '12px', top: '50%',
                                        transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none',
                                    }} />
                                    <input
                                        type="text"
                                        value={adminId}
                                        onChange={(e) => setAdminId(e.target.value)}
                                        placeholder="Enter ID…"
                                        required
                                        autoFocus
                                        style={{
                                            width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem',
                                            paddingTop: '0.625rem', paddingBottom: '0.625rem',
                                            background: '#0f172a', border: '1.5px solid #334155',
                                            borderRadius: '10px', color: '#e2e8f0', fontSize: '0.9rem',
                                            outline: 'none', fontFamily: 'var(--font-sans)',
                                            transition: 'border-color 0.15s',
                                        }}
                                        onFocus={e => (e.target.style.borderColor = '#475569')}
                                        onBlur={e => (e.target.style.borderColor = '#334155')}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Master Key
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <KeyRound size={15} style={{
                                        position: 'absolute', left: '12px', top: '50%',
                                        transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none',
                                    }} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        style={{
                                            width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem',
                                            paddingTop: '0.625rem', paddingBottom: '0.625rem',
                                            background: '#0f172a', border: '1.5px solid #334155',
                                            borderRadius: '10px', color: '#e2e8f0', fontSize: '0.9rem',
                                            outline: 'none', fontFamily: 'var(--font-sans)', letterSpacing: '0.15em',
                                            transition: 'border-color 0.15s',
                                        }}
                                        onFocus={e => (e.target.style.borderColor = '#475569')}
                                        onBlur={e => (e.target.style.borderColor = '#334155')}
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                style={{
                                    marginTop: '0.25rem',
                                    width: '100%', padding: '0.75rem',
                                    background: isLoading ? '#334155' : '#f8fafc',
                                    color: '#0f172a', border: 'none',
                                    borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700,
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    letterSpacing: '0.02em',
                                    transition: 'background 0.15s ease',
                                    opacity: isLoading ? 0.6 : 1,
                                }}
                                onMouseOver={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#e2e8f0'; }}
                                onMouseOut={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; }}
                            >
                                {isLoading ? 'Authenticating…' : 'Override Protocol'}
                            </button>
                        </form>
                    </div>

                    <div style={{ padding: '0.875rem 2rem', borderTop: '1px solid #334155', background: '#0f172a', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.72rem', color: '#475569' }}>
                            All admin sessions are monitored and logged
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
