import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Edit3, Trash2, Plus, Check, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Question } from '../../types';

function buildNewQuestion(roundId: string, questionIndex: number): Question {
    const newId = `temp-${Date.now()}`;
    return {
        id: newId,
        roundId,
        questionIndex,
        text: 'New Question',
        correctOptionId: `${newId}-a`,
        options: [
            { id: `${newId}-a`, text: 'Option A', score: 1 },
            { id: `${newId}-b`, text: 'Option B', score: 0 },
            { id: `${newId}-c`, text: 'Option C', score: 0 },
            { id: `${newId}-d`, text: 'Option D', score: 0 },
        ],
        type: 'mcq',
        inputType: null,
    };
}

function parseScoreInput(value: string) {
    if (!value.trim()) {
        return 0;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

export const AdminQuestionManager: React.FC = () => {
    const { rounds, saveQuestion, deleteQuestion, error } = useAppStore();
    const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[0]?.id || '');
    const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Question>>({});
    const [pendingNewQuestion, setPendingNewQuestion] = useState<Question | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!selectedRoundId && rounds[0]) {
            setSelectedRoundId(rounds[0].id);
        }
    }, [rounds, selectedRoundId]);

    const activeRound = rounds.find((round) => round.id === selectedRoundId);
    const questions = activeRound
        ? pendingNewQuestion && pendingNewQuestion.roundId === activeRound.id
            ? [...activeRound.questions, pendingNewQuestion]
            : activeRound.questions
        : [];

    const handleSelectRound = (id: string) => {
        setSelectedRoundId(id);
        setEditingQuestionId(null);
        setPendingNewQuestion(null);
    };

    const handleAddQuestion = () => {
        if (!activeRound) return;
        const question = buildNewQuestion(activeRound.id, activeRound.questions.length);
        setPendingNewQuestion(question);
        setEditingQuestionId(question.id);
        setEditForm(JSON.parse(JSON.stringify(question)));
    };

    const handleDeleteQuestion = async (qId: string) => {
        if (!activeRound) return;

        if (pendingNewQuestion?.id === qId) {
            setPendingNewQuestion(null);
            if (editingQuestionId === qId) {
                setEditingQuestionId(null);
            }
            return;
        }

        if (window.confirm('Are you sure you want to delete this question?')) {
            await deleteQuestion(qId);
            if (editingQuestionId === qId) {
                setEditingQuestionId(null);
            }
        }
    };

    const startEditing = (question: Question) => {
        setEditingQuestionId(question.id);
        setEditForm(JSON.parse(JSON.stringify(question)));
    };

    const saveEdit = async () => {
        if (!activeRound || !editingQuestionId || !editForm.text || !editForm.options) return;

        setIsSaving(true);
        try {
            await saveQuestion(activeRound.id, editForm as Question);
            if (pendingNewQuestion?.id === editingQuestionId) {
                setPendingNewQuestion(null);
            }
            setEditingQuestionId(null);
        } finally {
            setIsSaving(false);
        }
    };

    if (!activeRound) return null;

    return (
        <div className="flex flex-col gap-8">
            {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-primary/10 flex items-center justify-center">
                        <HelpCircle size={18} className="text-primary" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-white">Question Manager</h1>
                </div>
                <button
                    onClick={handleAddQuestion}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 text-white rounded-lg text-sm font-bold cursor-pointer hover:border-primary/50 transition-colors"
                >
                    <Plus size={16} /> Add Question
                </button>
            </div>

            <div className="flex gap-8 items-start">
                <div className="w-[200px] shrink-0 flex flex-col gap-2">
                    <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Round</p>
                    {rounds.map((round) => {
                        const isActive = selectedRoundId === round.id;
                        return (
                            <button
                                key={round.id}
                                onClick={() => handleSelectRound(round.id)}
                                className={cn(
                                    'w-full text-left px-4 py-3 rounded-[10px] text-sm cursor-pointer transition-all duration-150',
                                    isActive
                                        ? 'border-[1.5px] border-primary bg-primary/10 text-white font-bold'
                                        : 'border border-slate-800 bg-slate-950/60 text-slate-300 font-medium hover:border-slate-700'
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

                <div className="flex-1 flex flex-col gap-6">
                    {questions.map((question, qIndex) => {
                        const isEditing = editingQuestionId === question.id;

                        if (isEditing) {
                            return (
                                <div key={question.id} className="bg-slate-950/70 border border-primary/30 rounded-[20px] p-6 shadow-xl">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-sm font-bold text-white">Edit Question {qIndex + 1}</h4>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingQuestionId(null)} className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-xs font-semibold cursor-pointer">
                                                Cancel
                                            </button>
                                            <button onClick={() => void saveEdit()} disabled={isSaving} className="px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg text-white text-xs font-semibold cursor-pointer disabled:opacity-50">
                                                {isSaving ? 'Saving...' : 'Save Question'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Question Text</label>
                                            <textarea
                                                className="w-full px-3.5 py-2.5 border border-slate-700 rounded-[10px] text-sm text-slate-100 bg-slate-950 outline-none focus:border-primary min-h-[80px]"
                                                value={editForm.text}
                                                onChange={(event) => setEditForm({ ...editForm, text: event.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Options (Select the correct one and assign points)</label>
                                            {editForm.options?.map((option, idx) => (
                                                <div key={option.id} className="flex items-center gap-3">
                                                    <button
                                                        className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors",
                                                            editForm.correctOptionId === option.id ? "bg-green-600 text-white" : "bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500"
                                                        )}
                                                        onClick={() => setEditForm({ ...editForm, correctOptionId: option.id })}
                                                    >
                                                        {editForm.correctOptionId === option.id ? <Check size={14} /> : String.fromCharCode(65 + idx)}
                                                    </button>
                                                    <input
                                                        className="flex-1 px-3.5 py-2 border border-slate-700 rounded-[10px] text-sm text-slate-100 bg-slate-950 outline-none focus:border-primary"
                                                        value={option.text}
                                                        onChange={(event) => {
                                                            const options = [...(editForm.options || [])];
                                                            options[idx] = { ...options[idx], text: event.target.value };
                                                            setEditForm({ ...editForm, options });
                                                        }}
                                                    />
                                                    <div className="w-[110px] shrink-0">
                                                        <input
                                                            type="number"
                                                            step="0.25"
                                                            className="w-full px-3.5 py-2 border border-slate-700 rounded-[10px] text-sm text-slate-100 bg-slate-950 outline-none focus:border-primary"
                                                            value={option.score}
                                                            onChange={(event) => {
                                                                const options = [...(editForm.options || [])];
                                                                options[idx] = { ...options[idx], score: parseScoreInput(event.target.value) };
                                                                setEditForm({ ...editForm, options });
                                                            }}
                                                        />
                                                        <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-wider text-slate-500">
                                                            Points
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={question.id} className="bg-slate-950/60 border border-slate-800 rounded-[20px] p-5 hover:border-slate-700 transition-colors group">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="shrink-0 w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                            {qIndex + 1}
                                        </div>
                                        <p className="text-[0.95rem] font-bold text-slate-100 leading-snug pt-0.5">{question.text}</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEditing(question)} className="p-2 h-8 w-8 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-primary transition-all cursor-pointer">
                                            <Edit3 size={14} />
                                        </button>
                                        <button onClick={() => void handleDeleteQuestion(question.id)} className="p-2 h-8 w-8 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-red-300 hover:border-red-500 transition-all cursor-pointer">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10">
                                    {question.options.map((option, idx) => {
                                        const isCorrect = question.correctOptionId === option.id;
                                        return (
                                            <div key={option.id} className={cn(
                                                "flex items-center gap-3 p-2.5 rounded-lg border",
                                                isCorrect ? "bg-green-500/10 border-green-500/20" : "bg-slate-900 border-slate-800"
                                            )}>
                                                <div className={cn(
                                                    "w-6 h-6 rounded flex items-center justify-center font-bold text-[0.65rem]",
                                                    isCorrect ? "bg-green-600 text-white" : "bg-slate-950 text-slate-400 border border-slate-700"
                                                )}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                                                    <span className={cn("text-xs font-medium", isCorrect ? "text-green-100" : "text-slate-300")}>
                                                        {option.text}
                                                    </span>
                                                    <span className={cn(
                                                        "shrink-0 rounded-full border px-2 py-1 text-[0.6rem] font-black uppercase tracking-wider",
                                                        option.score > 0
                                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                                            : option.score < 0
                                                                ? "border-red-500/30 bg-red-500/10 text-red-200"
                                                                : "border-slate-700 bg-slate-950 text-slate-400"
                                                    )}>
                                                        {option.score > 0 ? `+${option.score}` : option.score} pts
                                                    </span>
                                                </div>
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
