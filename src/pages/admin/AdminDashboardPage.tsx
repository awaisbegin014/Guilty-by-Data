import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Database, Activity, CheckSquare, AlertCircle } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
    const { rounds, roundsProgress, resetParticipantProgress } = useAppStore();
    const navigate = useNavigate();

    const totalRounds = rounds.length;
    const activeInvestigations = Object.values(roundsProgress).filter(p => p.status === 'in_progress').length;
    const completedInvestigations = Object.values(roundsProgress).filter(p => p.status === 'submitted').length;

    const handleReset = () => {
        if (window.confirm('Are you sure you want to reset all participant progress? This cannot be undone.')) {
            resetParticipantProgress();
            alert('Progress has been reset.');
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="border-b border-border pb-6">
                <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Admin Dashboard</h1>
                <p className="text-slate-500 text-sm">Overview of competition progress and management.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-border rounded-[14px] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Database size={18} className="text-blue-600" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Rounds</span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">{totalRounds}</p>
                </div>
                <div className="bg-white border border-border rounded-[14px] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity size={18} className="text-emerald-600" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Teams</span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">{activeInvestigations}</p>
                </div>
                <div className="bg-white border border-border rounded-[14px] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <CheckSquare size={18} className="text-violet-600" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submissions</span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">{completedInvestigations}</p>
                </div>
            </div>

            {/* Management Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                    onClick={() => navigate('/admin/rounds')}
                    className="bg-white border border-border rounded-[14px] p-6 text-left hover:border-slate-900 transition-colors group cursor-pointer"
                >
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Round Manager</h3>
                    <p className="text-sm text-slate-500 mb-4">Manage round descriptions, objectives, and dataset links.</p>
                    <span className="text-xs font-bold text-blue-600 group-hover:underline">Edit Rounds →</span>
                </button>
                <button
                    onClick={() => navigate('/admin/questions')}
                    className="bg-white border border-border rounded-[14px] p-6 text-left hover:border-slate-900 transition-colors group cursor-pointer"
                >
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Question Manager</h3>
                    <p className="text-sm text-slate-500 mb-4">Edit MCQs, correct answers, and point values for each round.</p>
                    <span className="text-xs font-bold text-blue-600 group-hover:underline">Edit Questions →</span>
                </button>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 bg-red-50 border border-red-100 rounded-[14px] p-6">
                <div className="flex items-center gap-3 mb-4">
                    <AlertCircle size={20} className="text-red-600" />
                    <h3 className="text-lg font-bold text-red-900">Danger Zone</h3>
                </div>
                <p className="text-sm text-red-700 mb-6">Resetting participant progress will clear all current answers and scores. This cannot be undone.</p>
                <button
                    onClick={handleReset}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer"
                >
                    Reset All Progress
                </button>
            </div>
        </div>
    );
};
