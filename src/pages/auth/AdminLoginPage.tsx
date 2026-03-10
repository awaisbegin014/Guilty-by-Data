import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { ShieldCheck, User, KeyRound, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

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
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-8">
            <motion.div
                className="w-full max-w-[400px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            >
                {/* Brand mark */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-[14px] bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck size={26} className="text-slate-400" />
                    </div>
                    <h1 className="text-[1.4rem] font-extrabold text-slate-50 mb-1">
                        Restricted Access
                    </h1>
                    <p className="text-[0.8rem] text-slate-500 uppercase tracking-wider font-semibold">
                        Authorized Organizers Only
                    </p>
                </div>

                {/* Card */}
                <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.4)]">
                    <div className="p-8">
                        <form onSubmit={handleLogin} className="flex flex-col gap-5">
                            {/* Error */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-[10px] text-red-300 text-[0.85rem] font-medium"
                                >
                                    <AlertCircle size={15} className="shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            {/* Admin ID */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.72rem] font-bold text-slate-500 uppercase tracking-wider">
                                    Admin Identifier
                                </label>
                                <div className="relative">
                                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={adminId}
                                        onChange={(e) => setAdminId(e.target.value)}
                                        placeholder="Enter ID…"
                                        required
                                        autoFocus
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border-[1.5px] border-slate-700 rounded-[10px] text-slate-200 text-[0.9rem] outline-none font-sans transition-colors duration-150 focus:border-slate-500 placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="flex flex-col gap-2">
                                <label className="text-[0.72rem] font-bold text-slate-500 uppercase tracking-wider">
                                    Master Key
                                </label>
                                <div className="relative">
                                    <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border-[1.5px] border-slate-700 rounded-[10px] text-slate-200 text-[0.9rem] outline-none font-sans tracking-widest transition-colors duration-150 focus:border-slate-500 placeholder:text-slate-600"
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-1 w-full py-3 bg-slate-50 text-slate-900 border-none rounded-[10px] text-sm font-bold cursor-pointer tracking-wide transition-all duration-150 hover:bg-slate-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-700"
                            >
                                {isLoading ? 'Authenticating…' : 'Override Protocol'}
                            </button>
                        </form>
                    </div>

                    <div className="px-8 py-3.5 border-t border-slate-700 bg-slate-900 text-center">
                        <p className="text-[0.72rem] text-slate-600">
                            All admin sessions are monitored and logged
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
