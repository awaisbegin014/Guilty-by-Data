import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { validTeams } from '../../data/mockData';
import { Search, User, KeyRound, AlertCircle } from 'lucide-react';

export const TeamLoginPage: React.FC = () => {
    const [teamName, setTeamName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { setTeam } = useAppStore();
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!teamName.trim() || !password.trim()) {
            setError('Please enter both your Team Name and Access Key.');
            return;
        }

        setIsLoading(true);

        setTimeout(() => {
            setIsLoading(false);
            const match = validTeams.find(
                t => t.name.toLowerCase() === teamName.trim().toLowerCase() && t.password === password
            );

            if (match) {
                setTeam({ id: match.id, name: match.name });
                navigate('/dashboard');
            } else {
                setError('Invalid team name or access key. Please check your credentials.');
            }
        }, 700);
    };

    return (
        <div style={{
            minHeight: 'calc(100vh - 64px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            background: 'var(--bg-base)',
        }}>
            <div style={{ width: '100%', maxWidth: '420px' }} className="animate-fade-in">

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '14px',
                        background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem',
                        boxShadow: '0 4px 12px rgba(15,23,42,0.25)',
                    }}>
                        <Search size={26} color="#f8fafc" />
                    </div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.375rem' }}>
                        Case Access Portal
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Enter your team credentials to begin the investigation.
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                }}>
                    <div style={{ padding: '2rem' }}>
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                            {/* Error */}
                            {error && (
                                <div style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                                    padding: '0.75rem 1rem',
                                    background: 'var(--error-bg)', border: '1px solid var(--error-border)',
                                    borderRadius: '10px', color: 'var(--error-text)',
                                    fontSize: '0.85rem', fontWeight: 500,
                                }}>
                                    <AlertCircle size={16} style={{ marginTop: '1px', flexShrink: 0 }} />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Team Name */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Team Name
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{
                                        position: 'absolute', left: '12px', top: '50%',
                                        transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none',
                                    }} />
                                    <input
                                        id="teamName"
                                        type="text"
                                        className="input"
                                        style={{ paddingLeft: '2.25rem' }}
                                        placeholder="e.g. Team Alpha"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        autoFocus
                                        autoComplete="off"
                                    />
                                </div>
                            </div>

                            {/* Access Key */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Access Key
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <KeyRound size={16} style={{
                                        position: 'absolute', left: '12px', top: '50%',
                                        transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none',
                                    }} />
                                    <input
                                        id="password"
                                        type="password"
                                        className="input"
                                        style={{ paddingLeft: '2.25rem' }}
                                        placeholder="••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                style={{
                                    marginTop: '0.5rem',
                                    width: '100%', padding: '0.75rem',
                                    background: isLoading ? '#334155' : '#0f172a',
                                    color: '#fff', border: 'none',
                                    borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700,
                                    cursor: isLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    letterSpacing: '0.01em',
                                    transition: 'background 0.15s ease',
                                    opacity: isLoading ? 0.7 : 1,
                                }}
                                onMouseOver={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#1e293b'; }}
                                onMouseOut={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#0f172a'; }}
                            >
                                {isLoading ? (
                                    <>
                                        <span style={{ opacity: 0.8, fontSize: '0.85rem' }}>Authenticating…</span>
                                    </>
                                ) : (
                                    'Access Case Files'
                                )}
                            </button>
                        </form>
                    </div>

                    <div style={{ padding: '0.875rem 2rem', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                            Authorized personnel only · All access is logged
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
