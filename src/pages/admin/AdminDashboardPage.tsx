import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Database, Activity, CheckSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminDashboardPage: React.FC = () => {
    const { rounds, roundsProgress, resetParticipantProgress } = useAppStore();
    const navigate = useNavigate();

    const totalRounds = rounds.length;
    const activeInvestigations = Object.values(roundsProgress).filter(p => p.status === 'in_progress').length;
    const completedInvestigations = Object.values(roundsProgress).filter(p => p.status === 'submitted').length;

    const handleReset = () => {
        if (window.confirm('Reset all participant progress? This cannot be undone.')) {
            resetParticipantProgress();
            alert('Participant progress has been reset.');
        }
    };

    const StatCard = ({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) => (
        <div className="bg-white rounded-[14px] p-6 border border-border shadow-sm flex items-center justify-between transition-shadow duration-[0.18s]">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
                <p className="text-4xl font-extrabold text-slate-900 leading-none">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ background: color }}>
                {icon}
            </div>
        </div>
    );

    const ActionCard = ({ title, desc, cta, path, accent }: { title: string; desc: string; cta: string; path: string; accent: string }) => (
        <motion.div
            onClick={() => navigate(path)}
            className="bg-white rounded-[14px] p-6 border border-border cursor-pointer shadow-sm transition-[box-shadow,transform] duration-[0.18s] hover:shadow-md hover:-translate-y-0.5"
            style={{ borderLeft: `4px solid ${accent}` }}
            whileHover={{ y: -2 }}
        >
            <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-[0.85rem] text-muted-foreground mb-5 leading-relaxed">{desc}</p>
            <span className="text-[0.8rem] font-semibold" style={{ color: accent }}>
                {cta} →
            </span>
        </motion.div>
    );

    return (
        <motion.div
            className="max-w-[880px] mx-auto flex flex-col gap-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            {/* Page Header */}
            <div>
                <h1 className="text-[1.75rem] font-extrabold text-slate-900 mb-1.5">System Overview</h1>
                <p className="text-muted-foreground text-[0.925rem]">Monitor competition status and manage configurations.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard label="Total Rounds" value={totalRounds}
                    icon={<Database size={22} className="text-blue-600" />} color="#eff6ff" />
                <StatCard label="In Progress" value={activeInvestigations}
                    icon={<Activity size={22} className="text-amber-600" />} color="#fffbeb" />
                <StatCard label="Completed" value={completedInvestigations}
                    icon={<CheckSquare size={22} className="text-green-600" />} color="#f0fdf4" />
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-[0.8rem] font-bold text-slate-400 mb-4 uppercase tracking-wide">
                    Mission Control
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <ActionCard
                        title="Manage Rounds"
                        desc="Configure dataset links, open/close rounds, and edit round content for each investigation phase."
                        cta="Open Round Settings"
                        path="/admin/rounds"
                        accent="#2563eb"
                    />
                    <ActionCard
                        title="Manage Questions"
                        desc="Add, edit, or remove MCQ questions; set correct answers and option text per round."
                        cta="Open Question Editor"
                        path="/admin/questions"
                        accent="#7c3aed"
                    />
                </div>
            </div>

            {/* Reset + Info */}
            <div className="flex flex-col gap-4">
                {/* Danger Zone */}
                <div className="bg-red-50 border border-red-200 rounded-[14px] px-6 py-5 flex items-center justify-between gap-6">
                    <div>
                        <h4 className="font-bold text-red-700 text-[0.9rem] mb-1">Reset Participant Progress</h4>
                        <p className="text-[0.82rem] text-red-500 leading-relaxed">
                            Clears all submitted answers, timers, and unlocks. Use for testing only.
                        </p>
                    </div>
                    <button
                        onClick={handleReset}
                        className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-red-300 rounded-lg text-red-700 text-[0.82rem] font-semibold cursor-pointer whitespace-nowrap transition-colors duration-150 hover:bg-red-100"
                    >
                        <RefreshCw size={14} />
                        Reset Progress
                    </button>
                </div>

                {/* Prototype Note */}
                <div className="bg-slate-50 border border-border rounded-[14px] px-6 py-5 flex items-start gap-4">
                    <AlertCircle size={18} className="text-slate-500 shrink-0 mt-px" />
                    <div>
                        <h4 className="font-bold text-slate-700 text-sm mb-1">Prototype Environment</h4>
                        <p className="text-[0.82rem] text-muted-foreground leading-relaxed">
                            Running without a backend. All changes persist only in this browser session via localStorage. Team activity stats shown here reflect local state only.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
