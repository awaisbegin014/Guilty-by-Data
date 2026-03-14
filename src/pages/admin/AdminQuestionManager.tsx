import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Edit3, Trash2, Plus, Check, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '../../types';

export const AdminQuestionManager: React.FC = () => {
    const { rounds, updateRound } = useAppStore();
    const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[0]?.id || '');
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Question>>({});

    const activeRound = rounds.find(r => r.id === selectedRoundId);

    const handleSelectRound = (id: string) => {
        setSelectedRoundId(id);
        setEditingQuestionId(null);
    };

    const handleAddQuestion = () => {
        if (!activeRound) return;
        const newId = `q_new_${Date.now()}`;
        const newQuestion: Question = {
            id: newId,
            roundId: activeRound.id,
            questionIndex: activeRound.questions.length,
            text: 'New Question',
            correctOptionId: `${newId}_a`,
            options: [
                { id: `${newId}_a`, text: 'Option A' },
                { id: `${newId}_b`, text: 'Option B' },
                { id: `${newId}_c`, text: 'Option C' },
                { id: `${newId}_d`, text: 'Option D' },
            ],
        };
        updateRound(activeRound.id, { questions: [...activeRound.questions, newQuestion] });
        startEditing(newQuestion);
    };

    const handleDeleteQuestion = (qId: string) => {
        if (!activeRound) return;
        if (window.confirm('Are you sure you want to delete this question?')) {
            updateRound(activeRound.id, {
                questions: activeRound.questions.filter(q => q.id !== qId),
            });
            if (editingQuestionId === qId) setEditingQuestionId(null);
        }
    };

    const startEditing = (q: Question) => {
        setEditingQuestionId(q.id);
        setEditForm(JSON.parse(JSON.stringify(q)));
    };

    const saveEdit = () => {
        if (!activeRound || !editingQuestionId || !editForm.text) return;
        const updated = activeRound.questions.map(q =>
            q.id === editingQuestionId ? (editForm as Question) : q
        );
        updateRound(activeRound.id, { questions: updated });
        setEditingQuestionId(null);
    };

    if (!activeRound) return null;

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between border-b border-border pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center">
                        <HelpCircle size={18} className="text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900">Question Manager</h1>
                </div>
                <button 
                    onClick={handleAddQuestion}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold cursor-pointer hover:bg-slate-800 transition-colors"
                >
                    <Plus size={16} /> Add Question
                </button>
            </div>

            <div className="flex gap-8 items-start">
                {/* Sidebar */}
                <div className="w-[200px] shrink-0 flex flex-col gap-2">
                    <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Round</p>
                    {rounds.map(round => {
                        const isActive = selectedRoundId === round.id;
                        return (
                            <button
                                key={round.id}
                                onClick={() => handleSelectRound(round.id)}
                                className={cn(
                                    'w-full text-left px-4 py-3 rounded-[10px] text-sm cursor-pointer transition-all duration-150',
                                    isActive
                                        ? 'border-[1.5px] border-blue-600 bg-blue-50 text-blue-700 font-bold'
                                        : 'border border-border bg-white text-slate-700 font-medium hover:bg-slate-50'
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="truncate flex-1">{round.title}</span>
                                    <span className="text-[0.65rem] font-bold opacity-40 ml-2">{round.questions.length}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Main */}
                <div className="flex-1 flex flex-col gap-6">
                    {activeRound.questions.map((q, qIndex) => {
                        const isEditing = editingQuestionId === q.id;

                        if (isEditing) {
                            return (
                                <div key={q.id} className="bg-white border-2 border-slate-900 rounded-[14px] p-6 shadow-xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-sm font-bold text-slate-900">Edit Question {qIndex + 1}</h4>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingQuestionId(null)} className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-500 text-xs font-semibold cursor-pointer">
                                                Cancel
                                            </button>
                                            <button onClick={saveEdit} className="px-3 py-1.5 bg-slate-900 border-none rounded-lg text-white text-xs font-semibold cursor-pointer">
                                                Save Question
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Question Text</label>
                                            <textarea
                                                className="w-full px-3.5 py-2.5 border-[1.5px] border-slate-200 rounded-[10px] text-sm text-slate-900 outline-none focus:border-slate-900 min-h-[80px]"
                                                value={editForm.text}
                                                onChange={e => setEditForm({ ...editForm, text: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Options (Select the correct one)</label>
                                            {editForm.options?.map((opt, idx) => (
                                                <div key={opt.id} className="flex items-center gap-3">
                                                    <button
                                                        className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors",
                                                            editForm.correctOptionId === opt.id ? "bg-green-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                                        )}
                                                        onClick={() => setEditForm({ ...editForm, correctOptionId: opt.id })}
                                                    >
                                                        {editForm.correctOptionId === opt.id ? <Check size={14} /> : String.fromCharCode(65 + idx)}
                                                    </button>
                                                    <input
                                                        className="flex-1 px-3.5 py-2 border-[1.5px] border-slate-200 rounded-[10px] text-sm text-slate-900 outline-none focus:border-slate-900"
                                                        value={opt.text}
                                                        onChange={e => {
                                                            const opts = [...(editForm.options || [])];
                                                            opts[idx] = { ...opts[idx], text: e.target.value };
                                                            setEditForm({ ...editForm, options: opts });
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={q.id} className="bg-white border border-border rounded-[14px] p-5 hover:border-slate-300 transition-colors group">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                                            {qIndex + 1}
                                        </div>
                                        <p className="text-[0.95rem] font-bold text-slate-900 leading-snug pt-0.5">{q.text}</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditing(q)} className="p-2 h-8 w-8 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all cursor-pointer">
                                            <Edit3 size={14} />
                                        </button>
                                        <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 h-8 w-8 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-600 transition-all cursor-pointer">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10">
                                    {q.options.map((opt, idx) => {
                                        const isCorrect = q.correctOptionId === opt.id;
                                        return (
                                            <div key={opt.id} className={cn(
                                                "flex items-center gap-3 p-2.5 rounded-lg border",
                                                isCorrect ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-100"
                                            )}>
                                                <div className={cn(
                                                    "w-6 h-6 rounded flex items-center justify-center font-bold text-[0.65rem]",
                                                    isCorrect ? "bg-green-600 text-white" : "bg-white text-slate-400 border border-slate-200"
                                                )}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className={cn("text-xs font-medium", isCorrect ? "text-green-900" : "text-slate-600")}>
                                                    {opt.text}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
