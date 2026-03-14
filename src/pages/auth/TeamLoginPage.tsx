import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { validTeams } from '../../data/mockData';
import { Shield, Fingerprint, Key, AlertCircle, Database } from 'lucide-react';
import { Button } from '../../components/ui/Button';

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
            setError('CREDENTIAL_ERROR: Please enter both Team Name and Access Key.');
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
                setError('AUTH_FAILED: Invalid credentials. Unauthorized access attempt logged.');
            }
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background bg-analytical-grid">
            <div className="w-full max-w-[400px]">
                {/* Header Context */}
                <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                        <Shield size={14} className="text-primary" />
                        <span className="case-label text-[0.55rem]">Central Intelligence Node</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[0.5rem] text-muted-foreground font-mono font-bold uppercase tracking-wider">
                        <Database size={10} />
                        DB_SECURED
                    </div>
                </div>

                {/* Main Login Card */}
                <div className="dossier-card rounded-xl shadow-2xl overflow-hidden">
                    <div className="p-5 border-b border-border bg-slate-900/40">
                        <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center mb-3 shadow-inner-glow">
                            <Fingerprint size={24} className="text-primary" />
                        </div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tight mb-0.5">
                            Investigation Access
                        </h1>
                        <p className="text-[0.6rem] text-muted-foreground font-semibold uppercase tracking-wider">
                            Enter mission credentials to authorize session
                        </p>
                    </div>

                    <div className="p-5">
                        <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
                            {/* Error Messaging */}
                            {error && (
                                <div className="flex items-start gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-[0.65rem] font-bold font-mono uppercase tracking-tight">
                                    <AlertCircle size={12} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Team Identity */}
                            <div className="flex flex-col gap-1">
                                <label className="case-label flex items-center gap-2 text-[0.55rem]">
                                    <Database size={10} className="text-primary" />
                                    Team Designation
                                </label>
                                <input
                                    id="teamName"
                                    type="text"
                                    placeholder="TEAMID_ALPHA"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    autoFocus
                                    autoComplete="off"
                                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-md text-white text-xs font-bold font-mono tracking-wider focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-muted-foreground/30"
                                />
                            </div>

                            {/* Access Key */}
                            <div className="flex flex-col gap-1">
                                <label className="case-label flex items-center gap-2 text-[0.55rem]">
                                    <Key size={10} className="text-primary" />
                                    Security Key
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-md text-white text-xs font-bold font-mono tracking-widest focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-muted-foreground/30"
                                />
                            </div>

                            {/* Authorization Submit */}
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="mt-1 h-10 text-[0.7rem] uppercase tracking-widest"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Authorizing...</span>
                                    </div>
                                ) : (
                                    'Initialize Session'
                                )}
                            </Button>
                        </form>
                    </div>

                    <div className="px-5 py-3 bg-secondary/30 border-t border-border flex items-center justify-between">
                        <p className="text-[0.55rem] text-muted-foreground font-bold font-mono uppercase tracking-widest leading-none">
                            Identity Verification Required
                        </p>
                        <Shield size={10} className="text-muted-foreground/40" />
                    </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="mt-3 text-center">
                    <p className="text-[0.5rem] text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-50">
                        Classified access only // GATEWAY_7492
                    </p>
                </div>
            </div>
        </div>
    );
};
