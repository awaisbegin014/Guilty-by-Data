import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { ShieldCheck, User, KeyRound, AlertCircle, Database } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminLoginPage: React.FC = () => {
    const [adminId, setAdminId] = useState('');
    const [password, setPassword] = useState('');
    const [localError, setLocalError] = useState('');

    const navigate = useNavigate();
    const { loginAdmin, isBootstrapping, error, clearError } = useAppStore();

    useEffect(() => {
        clearError();
    }, [clearError]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        clearError();

        if (!adminId.trim() || !password.trim()) {
            setLocalError('Please enter both your admin identifier and password.');
            return;
        }

        try {
            await loginAdmin(adminId, password);
            navigate('/admin/dashboard');
        } catch {
            // Store error is already populated for the UI.
        }
    };

    const displayError = localError || error;

    return (
        <div className="flex h-screen flex-col overflow-hidden text-foreground">
            {/* Global Page Header */}
            <header className="z-40 shrink-0 border-b border-border bg-card/80 backdrop-blur-md">
                <div className="container flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="group flex items-center gap-3 cursor-default">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary shadow-inner-glow transition-all group-hover:border-primary/50 sm:h-11 sm:w-11">
                            <picture>
                                <source type="image/webp" srcSet="/logo-96.webp 1x, /logo-160.webp 2x" />
                                <source type="image/png" srcSet="/logo-96.png 1x, /logo-160.png 2x" />
                                <img src="/logo-96.png" alt="Guilty By Data Logo" className="h-full w-full object-cover" width="44" height="44" />
                            </picture>
                        </div>
                        <div className="min-w-0">
                            <div className="font-black leading-tight tracking-tighter text-white uppercase text-sm sm:text-base">Guilty By Data</div>
                            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.52rem] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-[0.55rem]">
                                <Database size={9} />
                                <span>investigation portal</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative flex-1 overflow-y-auto">
                <div className="flex min-h-full flex-col">
                    <div className="flex-1 flex items-start justify-center pt-4 p-4 bg-auth-image overflow-hidden">
                        <motion.div
                            className="w-full max-w-[380px]"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        >


                            {/* Brand mark */}
                            <div className="text-center mb-4">
                                <div className="w-10 h-10 rounded-[10px] bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-2 shadow-inner-glow">
                                    <ShieldCheck size={20} className="text-slate-400" />
                                </div>
                                <h1 className="text-[1.1rem] font-extrabold text-slate-50 mb-0.5">
                                    Restricted Access
                                </h1>
                                <p className="text-[0.6rem] text-slate-500 uppercase tracking-widest font-bold">
                                    Authorized Organizers Only
                                </p>
                            </div>

                            {/* Card */}
                            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                                <div className="p-7">
                                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                        {/* Error */}
                                        {displayError && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-300 text-[0.75rem] font-bold"
                                            >
                                                <AlertCircle size={14} className="shrink-0" />
                                                <span>{displayError}</span>
                                            </motion.div>
                                        )}

                                        {/* Admin ID */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
                                                Admin Email / Identifier
                                            </label>
                                            <div className="relative">
                                                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    value={adminId}
                                                    onChange={(e) => setAdminId(e.target.value)}
                                                    placeholder="organizer@example.com"
                                                    required
                                                    autoFocus
                                                    autoComplete="username"
                                                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 text-sm outline-none font-sans transition-colors duration-150 focus:border-slate-500 placeholder:text-slate-600 font-medium"
                                                />
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest">
                                                Master Key
                                            </label>
                                            <div className="relative">
                                                <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                                                <input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    required
                                                    autoComplete="current-password"
                                                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-200 text-sm outline-none font-sans tracking-widest transition-colors duration-150 focus:border-slate-500 placeholder:text-slate-600"
                                                />
                                            </div>
                                        </div>

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={isBootstrapping}
                                            className="mt-1 w-full py-2.5 bg-slate-50 text-slate-900 border-none rounded-md text-xs font-black uppercase tracking-widest cursor-pointer transition-all duration-150 hover:bg-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isBootstrapping ? 'Authenticating…' : 'Override Protocol'}
                                        </button>
                                    </form>
                                </div>

                                <div className="px-7 py-3 border-t border-slate-700 bg-slate-900/50 text-center">
                                    <p className="text-[0.6rem] text-slate-600 font-bold uppercase tracking-wider">
                                        Access monitored & logged
                                    </p>
                                </div>
                            </div>


                        </motion.div>
                    </div>

                    {/* Global Page Footer */}
                    <footer className="mt-auto shrink-0 border-t border-border bg-card/50 py-3">
                        <div className="container">
                            <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
                                <div className="text-left">
                                    <p className="case-label mb-0.5">System Status: Active</p>
                                    <p className="text-[0.6rem] font-medium uppercase tracking-tight text-muted-foreground">
                                        Investigation Terminal v2.4.0 // Secured Protocol Active
                                    </p>
                                </div>
                                <div className="text-center md:text-right">
                                    <p className="text-[0.6rem] font-medium uppercase tracking-tight text-muted-foreground">
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
