import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Database, Activity, CheckSquare, AlertCircle } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
    const { rounds } = useAppStore();
    const navigate = useNavigate();

    const totalRounds = rounds.length;
    const openRounds = rounds.filter((round) => round.status === 'open').length;
    const runningTimers = rounds.filter((round) => round.timerState === 'running').length;
    const totalQuestions = rounds.reduce((sum, round) => sum + round.questions.length, 0);

    return (
        <div className="flex flex-col gap-8">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                <p className="case-label mb-2">Admin Overview</p>
                <h1 className="text-3xl font-black text-white">Competition Operations</h1>
                <p className="mt-2 text-sm text-slate-400">Round availability, timer activity, and authoring controls from the same dark-shell system state.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Database size={18} className="text-primary" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Rounds</span>
                    </div>
                    <p className="text-3xl font-extrabold text-white">{totalRounds}</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity size={18} className="text-emerald-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unlocked Rounds</span>
                    </div>
                    <p className="text-3xl font-extrabold text-white">{openRounds}</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity size={18} className="text-amber-300" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Running Timers</span>
                    </div>
                    <p className="text-3xl font-extrabold text-white">{runningTimers}</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckSquare size={18} className="text-sky-300" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Questions</span>
                    </div>
                    <p className="text-3xl font-extrabold text-white">{totalQuestions}</p>
                </div>
            </div>

            {/* Management Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                    onClick={() => navigate('/admin/rounds')}
                    className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-left transition-colors group cursor-pointer hover:border-primary/40"
                >
                    <h3 className="text-lg font-bold text-white mb-2">Round Manager</h3>
                    <p className="text-sm text-slate-400 mb-4">Manage narrative content, lock state, timer actions, and ZIP password access.</p>
                    <span className="text-xs font-bold text-primary group-hover:underline">Open Round Controls →</span>
                </button>
                <button
                    onClick={() => navigate('/admin/questions')}
                    className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 text-left transition-colors group cursor-pointer hover:border-primary/40"
                >
                    <h3 className="text-lg font-bold text-white mb-2">Question Manager</h3>
                    <p className="text-sm text-slate-400 mb-4">Edit the question bank and keep question counts fully data-driven per round.</p>
                    <span className="text-xs font-bold text-primary group-hover:underline">Open Question Controls →</span>
                </button>
            </div>

            {/* Danger Zone */}
            <div className="mt-2 rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <AlertCircle size={20} className="text-red-300" />
                    <h3 className="text-lg font-bold text-red-100">Admin Notes</h3>
                </div>
                <p className="text-sm text-red-100/80">
                    Participant submission reset is intentionally not exposed from the client now that Supabase is the system of record.
                    Use secure backend tooling for destructive operations.
                </p>
            </div>
        </div>
    );
};
