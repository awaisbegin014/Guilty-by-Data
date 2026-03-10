import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Edit3, Trash2, Plus, Save, X, Check } from 'lucide-react';
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
        if (window.confirm('Delete this question?')) {
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
        <div className="qm-root animate-fade-in">

            {/* ── Page Header ── */}
            <div className="qm-page-header">
                <div>
                    <h1>Question Manager</h1>
                    <p>Configure MCQ challenges for each investigation round.</p>
                </div>
            </div>

            <div className="qm-layout">

                {/* ── Sidebar ── */}
                <aside className="qm-sidebar">
                    <p className="qm-sidebar-label">Rounds</p>
                    {rounds.map(round => {
                        const isActive = selectedRoundId === round.id;
                        return (
                            <button
                                key={round.id}
                                onClick={() => handleSelectRound(round.id)}
                                className={`qm-round-btn${isActive ? ' qm-round-btn--active' : ''}`}
                            >
                                <span className="qm-round-name">{round.title}</span>
                                <span className="qm-round-count">{round.questions.length}Q</span>
                            </button>
                        );
                    })}
                </aside>

                {/* ── Main Panel ── */}
                <div className="qm-main">

                    {/* Panel header */}
                    <div className="qm-panel-header">
                        <div className="qm-panel-title">
                            <span className="qm-panel-round">{activeRound.title}</span>
                            <span className="qm-panel-meta">{activeRound.questions.length} question{activeRound.questions.length !== 1 ? 's' : ''}</span>
                        </div>
                        <button className="qm-add-btn" onClick={handleAddQuestion}>
                            <Plus size={15} />
                            Add Question
                        </button>
                    </div>

                    {/* Empty state */}
                    {activeRound.questions.length === 0 && (
                        <div className="qm-empty">
                            <p>No questions yet. Click <strong>Add Question</strong> to create one.</p>
                        </div>
                    )}

                    {/* Question list */}
                    <div className="qm-question-list">
                        {activeRound.questions.map((q, qIndex) => {
                            const isEditing = editingQuestionId === q.id;

                            if (isEditing) {
                                return (
                                    <div key={q.id} className="qm-question-card qm-question-card--editing">
                                        {/* Question text */}
                                        <div className="qm-field">
                                            <label className="qm-label">Question</label>
                                            <textarea
                                                className="qm-textarea"
                                                value={editForm.text}
                                                onChange={e => setEditForm({ ...editForm, text: e.target.value })}
                                                placeholder="Enter question text…"
                                            />
                                        </div>

                                        {/* Options */}
                                        <div className="qm-field">
                                            <label className="qm-label">Options — click the letter to mark as correct</label>
                                            <div className="qm-options-grid">
                                                {editForm.options?.map((opt, idx) => {
                                                    const isCorrect = editForm.correctOptionId === opt.id;
                                                    return (
                                                        <div key={opt.id} className={`qm-option-row${isCorrect ? ' qm-option-row--correct' : ''}`}>
                                                            <button
                                                                className={`qm-option-letter${isCorrect ? ' qm-option-letter--correct' : ''}`}
                                                                onClick={() => setEditForm({ ...editForm, correctOptionId: opt.id })}
                                                            >
                                                                {isCorrect ? <Check size={13} /> : String.fromCharCode(65 + idx)}
                                                            </button>
                                                            <input
                                                                className="qm-option-input"
                                                                value={opt.text}
                                                                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                                onChange={e => {
                                                                    const opts = [...(editForm.options || [])];
                                                                    opts[idx] = { ...opts[idx], text: e.target.value };
                                                                    setEditForm({ ...editForm, options: opts });
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="qm-edit-actions">
                                            <button className="qm-btn-cancel" onClick={() => setEditingQuestionId(null)}>
                                                <X size={14} /> Cancel
                                            </button>
                                            <button className="qm-btn-save" onClick={saveEdit}>
                                                <Save size={14} /> Save Changes
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={q.id} className="qm-question-card">
                                    <div className="qm-question-header">
                                        <div className="qm-question-top">
                                            <span className="qm-question-num">{qIndex + 1}</span>
                                            <span className="qm-question-text">{q.text}</span>
                                        </div>
                                        <div className="qm-question-actions">
                                            <button className="qm-icon-btn" title="Edit" onClick={() => startEditing(q)}>
                                                <Edit3 size={15} />
                                            </button>
                                            <button className="qm-icon-btn qm-icon-btn--danger" title="Delete" onClick={() => handleDeleteQuestion(q.id)}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="qm-options-read">
                                        {q.options.map((opt, idx) => {
                                            const isAnswer = q.correctOptionId === opt.id;
                                            return (
                                                <div key={opt.id} className={`qm-opt-read${isAnswer ? ' qm-opt-read--answer' : ''}`}>
                                                    <span className={`qm-opt-badge${isAnswer ? ' qm-opt-badge--answer' : ''}`}>
                                                        {isAnswer ? <Check size={11} /> : String.fromCharCode(65 + idx)}
                                                    </span>
                                                    <span>{opt.text}</span>
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
        </div>
    );
};
