import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { validTeams } from '../../data/mockData';
import { Search, User, KeyRound, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-8 bg-background">
            <motion.div
                className="w-full max-w-[420px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-[14px] bg-slate-900 flex items-center justify-center mx-auto mb-4 shadow-[0_4px_12px_rgba(15,23,42,0.25)]">
                        <Search size={26} className="text-slate-50" />
                    </div>
                    <h1 className="text-[1.6rem] font-extrabold text-slate-900 mb-1.5">
                        Case Access Portal
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your team credentials to begin the investigation.
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white border border-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="p-8">
                        <form onSubmit={handleLogin} className="flex flex-col gap-5">
                            {/* Error */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-start gap-2.5 px-4 py-3 bg-error-bg border border-error-border rounded-[10px] text-error-text text-[0.85rem] font-medium"
                                >
                                    <AlertCircle size={16} className="mt-px shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            {/* Team Name */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-wide">
                                    Team Name
                                </label>
                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        id="teamName"
                                        type="text"
                                        placeholder="e.g. Team Alpha"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        autoFocus
                                        autoComplete="off"
                                        className="w-full pl-9 pr-4 py-2.5 border-[1.5px] border-slate-300 rounded-[10px] bg-white text-slate-900 text-[0.9rem] outline-none font-sans leading-relaxed transition-colors duration-150 focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_23_42/0.1)] placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {/* Access Key */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.8rem] font-bold text-slate-600 uppercase tracking-wide">
                                    Access Key
                                </label>
                                <div className="relative">
                                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 border-[1.5px] border-slate-300 rounded-[10px] bg-white text-slate-900 text-[0.9rem] outline-none font-sans leading-relaxed transition-colors duration-150 focus:border-primary focus:shadow-[0_0_0_3px_rgb(15_23_42/0.1)] placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-2 w-full py-3 bg-slate-900 text-white border-none rounded-[10px] text-[0.9rem] font-bold cursor-pointer flex items-center justify-center gap-2 tracking-tight transition-all duration-150 hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-slate-700"
                            >
                                {isLoading ? (
                                    <span className="opacity-80 text-[0.85rem]">Authenticating…</span>
                                ) : (
                                    'Access Case Files'
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="px-8 py-3.5 border-t border-border bg-muted text-center">
                        <p className="text-xs text-slate-400">
                            Authorized personnel only · All access is logged
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
