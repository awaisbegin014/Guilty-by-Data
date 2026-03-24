import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Shield, Fingerprint, Key, AlertCircle, Database } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const TeamLoginPage: React.FC = () => {
    const [teamId, setTeamId] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');

    const { loginTeam, isBootstrapping, error, clearError } = useAppStore();
    const navigate = useNavigate();

    useEffect(() => {
        clearError();
    }, [clearError]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        clearError();

        if (!teamId.trim() || !password.trim()) {
            setLocalError('CREDENTIAL_ERROR: Please enter both Team ID and Access Key.');
            return;
        }

        try {
            await loginTeam(teamId, password);
            navigate('/dashboard');
        } catch {
            // Store error is already populated for the UI.
        }
    };

    const displayError = localError || error;

    return (
        <div className="w-full h-full flex-1 flex items-start justify-center pt-4 px-4 pb-8 bg-auth-image overflow-hidden">
            <div className="w-full max-w-[400px]">


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
                            {displayError && (
                                <div className="flex items-start gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-[0.65rem] font-bold font-mono uppercase tracking-tight">
                                    <AlertCircle size={12} className="shrink-0" />
                                    <span>{displayError}</span>
                                </div>
                            )}

                            {/* Team Identity */}
                            <div className="flex flex-col gap-1">
                                <label className="case-label flex items-center gap-2 text-[0.55rem]">
                                    <Database size={10} className="text-primary" />
                                    Team Identifier
                                </label>
                                <input
                                    id="teamId"
                                    type="text"
                                    placeholder="team-alpha"
                                    value={teamId}
                                    onChange={(e) => setTeamId(e.target.value)}
                                    autoFocus
                                    autoComplete="username"
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
                                    autoComplete="current-password"
                                    className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-md text-white text-xs font-bold font-mono tracking-widest focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:text-muted-foreground/30"
                                />
                            </div>

                            {/* Authorization Submit */}
                            <Button
                                type="submit"
                                disabled={isBootstrapping}
                                className="mt-1 h-10 text-[0.7rem] uppercase tracking-widest"
                            >
                                {isBootstrapping ? (
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


            </div>
        </div>
    );
};
