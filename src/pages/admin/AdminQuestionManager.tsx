import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Check,
  Edit3,
  HelpCircle,
  ListChecks,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '../../store/useAppStore';
import type { BlankQuestionRule, Option, Question } from '../../types';
import { RichQuestionText } from '../../components/RichQuestionText';

function cloneQuestion(question: Question) {
  return JSON.parse(JSON.stringify(question)) as Question;
}

function buildDefaultOptions(seed: string): Option[] {
  return [
    { id: `${seed}-a`, text: 'Option A', score: 1, orderIndex: 0 },
    { id: `${seed}-b`, text: 'Option B', score: 0, orderIndex: 1 },
    { id: `${seed}-c`, text: 'Option C', score: 0, orderIndex: 2 },
    { id: `${seed}-d`, text: 'Option D', score: 0, orderIndex: 3 },
  ];
}

function buildDefaultBlankRule(): BlankQuestionRule {
  return {
    correctAnswer: 100,
    rangeStart: 90,
    rangeEnd: 110,
    exactScore: 5,
    minScore: 1,
    curvePower: 1,
  };
}

function buildNewQuestion(roundId: string, questionIndex: number): Question {
  const newId = `temp-${Date.now()}`;
  const options = buildDefaultOptions(newId);

  return {
    id: newId,
    roundId,
    questionIndex,
    text: 'New Question',
    correctOptionId: options[0]?.id ?? null,
    options,
    type: 'mcq',
    inputType: null,
    blankRule: null,
  };
}

function parseNumberInput(value: string, fallback = 0) {
  if (!value.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculatePreviewScore(rule: BlankQuestionRule, value: number) {
  if (value < rule.rangeStart || value > rule.rangeEnd) {
    return 0;
  }

  if (value === rule.correctAnswer) {
    return Number(rule.exactScore.toFixed(3));
  }

  const maxDistance = value < rule.correctAnswer
    ? rule.correctAnswer - rule.rangeStart
    : rule.rangeEnd - rule.correctAnswer;

  if (maxDistance <= 0) {
    return 0;
  }

  const normalized = Math.abs(value - rule.correctAnswer) / maxDistance;
  if (normalized >= 1) {
    return 0;
  }

  const score = rule.minScore + (rule.exactScore - rule.minScore) * Math.pow(1 - normalized, rule.curvePower);
  return Number(score.toFixed(3));
}

function getBlankPreviewSamples(rule: BlankQuestionRule, inputType: 'int' | 'float') {
  const midpointLeft = (rule.rangeStart + rule.correctAnswer) / 2;
  const midpointRight = (rule.correctAnswer + rule.rangeEnd) / 2;
  const values = [
    rule.rangeStart,
    midpointLeft,
    rule.correctAnswer,
    midpointRight,
    rule.rangeEnd,
  ].map((value) => (inputType === 'int' ? Math.round(value) : Number(value.toFixed(2))));

  return [...new Set(values)].map((value) => ({
    value,
    score: calculatePreviewScore(rule, value),
  }));
}

function validateQuestion(question: Question) {
  if (!question.text.trim()) {
    return 'Question text is required.';
  }

  if (question.type === 'blank') {
    if (question.inputType !== 'int' && question.inputType !== 'float') {
      return 'Blank questions must use integer or decimal input.';
    }

    if (!question.blankRule) {
      return 'Blank questions require scoring rules.';
    }

    const {
      correctAnswer,
      rangeStart,
      rangeEnd,
      exactScore,
      minScore,
      curvePower,
    } = question.blankRule;

    if (rangeStart > correctAnswer || correctAnswer > rangeEnd) {
      return 'The correct answer must stay within the configured range.';
    }

    if (exactScore < 0 || minScore < 0) {
      return 'Scores must be zero or greater.';
    }

    if (exactScore < minScore) {
      return 'Exact score must be greater than or equal to minimum score.';
    }

    if (curvePower <= 0) {
      return 'Curve power must be greater than zero.';
    }

    return null;
  }

  const nonEmptyOptions = question.options.filter((option) => option.text.trim());
  if (nonEmptyOptions.length < 2) {
    return 'MCQ questions need at least two non-empty options.';
  }

  if (!question.correctOptionId || !question.options.some((option) => option.id === question.correctOptionId)) {
    return 'Select the correct MCQ option before saving.';
  }

  return null;
}

function formatPreviewValue(value: number, inputType: 'int' | 'float') {
  return inputType === 'int' ? String(Math.round(value)) : value.toFixed(2);
}

export const AdminQuestionManager: React.FC = () => {
  const { rounds, saveQuestion, deleteQuestion, error } = useAppStore();
  const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[0]?.id || '');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Question | null>(null);
  const [pendingNewQuestion, setPendingNewQuestion] = useState<Question | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const previewSamples = useMemo(() => {
    if (
      !editForm
      || editForm.type !== 'blank'
      || !editForm.blankRule
      || (editForm.inputType !== 'int' && editForm.inputType !== 'float')
    ) {
      return [];
    }

    return getBlankPreviewSamples(editForm.blankRule, editForm.inputType);
  }, [editForm]);

  const handleSelectRound = (id: string) => {
    setSelectedRoundId(id);
    setEditingQuestionId(null);
    setPendingNewQuestion(null);
    setEditForm(null);
    setFormError(null);
  };

  const handleAddQuestion = () => {
    if (!activeRound) return;
    const question = buildNewQuestion(activeRound.id, activeRound.questions.length);
    setPendingNewQuestion(question);
    setEditingQuestionId(question.id);
    setEditForm(cloneQuestion(question));
    setFormError(null);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeRound) return;

    if (pendingNewQuestion?.id === questionId) {
      setPendingNewQuestion(null);
      setEditingQuestionId(null);
      setEditForm(null);
      setFormError(null);
      return;
    }

    if (window.confirm('Are you sure you want to delete this question?')) {
      await deleteQuestion(questionId);
      if (editingQuestionId === questionId) {
        setEditingQuestionId(null);
        setEditForm(null);
      }
    }
  };

  const startEditing = (question: Question) => {
    setEditingQuestionId(question.id);
    setEditForm(cloneQuestion(question));
    setFormError(null);
  };

  const updateEditForm = (updater: (current: Question) => Question) => {
    setEditForm((current) => (current ? updater(current) : current));
  };

  const handleTypeChange = (nextType: 'mcq' | 'blank') => {
    updateEditForm((current) => {
      if (nextType === 'blank') {
        return {
          ...current,
          type: 'blank',
          inputType: current.inputType === 'int' || current.inputType === 'float' ? current.inputType : 'int',
          correctOptionId: null,
          options: [],
          blankRule: current.blankRule ?? buildDefaultBlankRule(),
        };
      }

      const seed = current.id || `temp-${Date.now()}`;
      const options = current.options.length > 0 ? current.options : buildDefaultOptions(seed);
      return {
        ...current,
        type: 'mcq',
        inputType: null,
        blankRule: null,
        options,
        correctOptionId: current.correctOptionId && options.some((option) => option.id === current.correctOptionId)
          ? current.correctOptionId
          : options[0]?.id ?? null,
      };
    });
  };

  const saveEdit = async () => {
    if (!activeRound || !editingQuestionId || !editForm) return;

    const validationError = validateQuestion(editForm);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setIsSaving(true);
    try {
      await saveQuestion(activeRound.id, editForm);
      if (pendingNewQuestion?.id === editingQuestionId) {
        setPendingNewQuestion(null);
      }
      setEditingQuestionId(null);
      setEditForm(null);
    } finally {
      setIsSaving(false);
    }
  };

  if (!activeRound) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      {(error || formError) && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {formError || error}
        </div>
      )}

      <div className="flex items-center justify-between rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10">
            <HelpCircle size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Question Manager</h1>
            <p className="mt-1 text-sm text-slate-400">
              Author MCQ and blank questions from the same editor, with live HTML preview and scoring validation.
            </p>
          </div>
        </div>
        <button
          onClick={handleAddQuestion}
          className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:border-primary/50"
        >
          <Plus size={16} /> Add Question
        </button>
      </div>

      <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="w-full shrink-0 lg:w-[220px]">
          <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-wider text-slate-400">Select Round</p>
          <div className="space-y-2">
            {rounds.map((round) => {
              const isActive = selectedRoundId === round.id;
              return (
                <button
                  key={round.id}
                  onClick={() => handleSelectRound(round.id)}
                  className={cn(
                    'w-full rounded-[10px] px-4 py-3 text-left text-sm transition-all duration-150',
                    isActive
                      ? 'border-[1.5px] border-primary bg-primary/10 font-bold text-white'
                      : 'border border-slate-800 bg-slate-950/60 font-medium text-slate-300 hover:border-slate-700',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{round.title}</span>
                    <span className="ml-2 text-[0.65rem] font-bold opacity-40">{round.questions.length}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 space-y-6">
          {questions.map((question, questionIndex) => {
            const isEditing = editingQuestionId === question.id;

            if (isEditing && editForm) {
              return (
                <div key={question.id} className="rounded-[20px] border border-primary/30 bg-slate-950/70 p-6 shadow-xl">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Edit Question {questionIndex + 1}</h4>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {editForm.type === 'blank' ? 'Blank scoring editor' : 'MCQ option editor'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingQuestionId(null);
                          setEditForm(null);
                          setFormError(null);
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void saveEdit()}
                        disabled={isSaving}
                        className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Question'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Question Type</label>
                        <select
                          value={editForm.type ?? 'mcq'}
                          onChange={(event) => handleTypeChange(event.target.value as 'mcq' | 'blank')}
                          className="w-full rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-primary"
                        >
                          <option value="mcq">MCQ</option>
                          <option value="blank">Blank</option>
                        </select>
                      </div>

                      {editForm.type === 'blank' ? (
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Numeric Mode</label>
                          <select
                            value={editForm.inputType ?? 'int'}
                            onChange={(event) => updateEditForm((current) => ({
                              ...current,
                              inputType: event.target.value as 'int' | 'float',
                            }))}
                            className="w-full rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-primary"
                          >
                            <option value="int">Integer</option>
                            <option value="float">Decimal</option>
                          </select>
                        </div>
                      ) : (
                        <div className="rounded-[10px] border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                          MCQ options keep admin-visible real scores. Participant payloads still hide them.
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Question Text</label>
                      <textarea
                        className="min-h-[180px] w-full resize-y rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-3 font-mono text-sm text-slate-100 outline-none focus:border-primary"
                        value={editForm.text}
                        onChange={(event) => updateEditForm((current) => ({ ...current, text: event.target.value }))}
                        spellCheck={false}
                      />
                      <p className="mt-2 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                        HTML such as h3, p, ul, li, strong, code, and br will render in preview and participant view.
                      </p>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Rendered Preview</label>
                      <div className="rounded-[14px] border border-slate-800 bg-slate-950/70 px-4 py-4">
                        <RichQuestionText content={editForm.text ?? ''} className="text-slate-100" />
                      </div>
                    </div>

                    {editForm.type === 'blank' ? (
                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Correct Answer</label>
                              <input
                                type="number"
                                step={editForm.inputType === 'int' ? '1' : '0.01'}
                                value={editForm.blankRule?.correctAnswer ?? 0}
                                onChange={(event) => updateEditForm((current) => ({
                                  ...current,
                                  blankRule: {
                                    ...(current.blankRule ?? buildDefaultBlankRule()),
                                    correctAnswer: parseNumberInput(event.target.value),
                                  },
                                }))}
                                className="w-full rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Range Start</label>
                              <input
                                type="number"
                                step={editForm.inputType === 'int' ? '1' : '0.01'}
                                value={editForm.blankRule?.rangeStart ?? 0}
                                onChange={(event) => updateEditForm((current) => ({
                                  ...current,
                                  blankRule: {
                                    ...(current.blankRule ?? buildDefaultBlankRule()),
                                    rangeStart: parseNumberInput(event.target.value),
                                  },
                                }))}
                                className="w-full rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Range End</label>
                              <input
                                type="number"
                                step={editForm.inputType === 'int' ? '1' : '0.01'}
                                value={editForm.blankRule?.rangeEnd ?? 0}
                                onChange={(event) => updateEditForm((current) => ({
                                  ...current,
                                  blankRule: {
                                    ...(current.blankRule ?? buildDefaultBlankRule()),
                                    rangeEnd: parseNumberInput(event.target.value),
                                  },
                                }))}
                                className="w-full rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Exact Score</label>
                              <input
                                type="number"
                                step="0.25"
                                value={editForm.blankRule?.exactScore ?? 0}
                                onChange={(event) => updateEditForm((current) => ({
                                  ...current,
                                  blankRule: {
                                    ...(current.blankRule ?? buildDefaultBlankRule()),
                                    exactScore: parseNumberInput(event.target.value),
                                  },
                                }))}
                                className="w-full rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Minimum Score</label>
                              <input
                                type="number"
                                step="0.25"
                                value={editForm.blankRule?.minScore ?? 0}
                                onChange={(event) => updateEditForm((current) => ({
                                  ...current,
                                  blankRule: {
                                    ...(current.blankRule ?? buildDefaultBlankRule()),
                                    minScore: parseNumberInput(event.target.value),
                                  },
                                }))}
                                className="w-full rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-primary"
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">Curve Power</label>
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={editForm.blankRule?.curvePower ?? 1}
                                onChange={(event) => updateEditForm((current) => ({
                                  ...current,
                                  blankRule: {
                                    ...(current.blankRule ?? buildDefaultBlankRule()),
                                    curvePower: parseNumberInput(event.target.value, 1),
                                  },
                                }))}
                                className="w-full rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:border-primary"
                              />
                            </div>
                          </div>

                          <div className="rounded-[14px] border border-slate-800 bg-slate-950/60 p-4">
                            <div className="flex items-center gap-2 text-sm font-bold text-white">
                              <Calculator size={16} className="text-primary" />
                              Live Scoring Notes
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                              The exact answer is always the peak. Values outside the configured range score zero, and in-range non-exact values trail off using the configured curve power.
                            </p>
                          </div>
                        </div>

                        <div className="rounded-[14px] border border-slate-800 bg-slate-950/60 p-4">
                          <div className="flex items-center gap-2 text-sm font-bold text-white">
                            <SlidersHorizontal size={16} className="text-primary" />
                            Preview Curve
                          </div>
                          <div className="mt-4 space-y-3">
                            {previewSamples.map((sample) => (
                              <div key={`${sample.value}`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                                <div>
                                  <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-500">Answer</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-slate-100">
                                    {formatPreviewValue(sample.value, editForm.inputType as 'int' | 'float')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-500">Score</p>
                                  <p className="mt-1 font-mono text-sm font-bold text-emerald-300">
                                    {sample.score.toFixed(3)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                            Options (Select the correct one and assign points)
                          </label>
                          <button
                            onClick={() => updateEditForm((current) => {
                              const nextOptionIndex = current.options.length;
                              const seed = current.id || `temp-${Date.now()}`;
                              const nextOption = {
                                id: `${seed}-${nextOptionIndex + 1}`,
                                text: `Option ${String.fromCharCode(65 + nextOptionIndex)}`,
                                score: 0,
                                orderIndex: nextOptionIndex,
                              };

                              return {
                                ...current,
                                options: [...current.options, nextOption],
                                correctOptionId: current.correctOptionId ?? nextOption.id,
                              };
                            })}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200"
                          >
                            <Plus size={12} />
                            Add Option
                          </button>
                        </div>

                        {editForm.options.map((option, index) => (
                          <div key={option.id} className="flex items-center gap-3">
                            <button
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-colors',
                                editForm.correctOptionId === option.id
                                  ? 'bg-green-600 text-white'
                                  : 'border border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500',
                              )}
                              onClick={() => updateEditForm((current) => ({ ...current, correctOptionId: option.id }))}
                            >
                              {editForm.correctOptionId === option.id ? <Check size={14} /> : String.fromCharCode(65 + index)}
                            </button>
                            <input
                              className="flex-1 rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-primary"
                              value={option.text}
                              onChange={(event) => updateEditForm((current) => {
                                const options = [...current.options];
                                options[index] = { ...options[index], text: event.target.value };
                                return { ...current, options };
                              })}
                            />
                            <div className="w-[110px] shrink-0">
                              <input
                                type="number"
                                step="0.25"
                                className="w-full rounded-[10px] border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-slate-100 outline-none focus:border-primary"
                                value={option.score}
                                onChange={(event) => updateEditForm((current) => {
                                  const options = [...current.options];
                                  options[index] = { ...options[index], score: parseNumberInput(event.target.value) };
                                  return { ...current, options };
                                })}
                              />
                              <p className="mt-1 text-[0.6rem] font-bold uppercase tracking-wider text-slate-500">Points</p>
                            </div>
                            <button
                              onClick={() => updateEditForm((current) => {
                                const options = current.options.filter((_, optionIndex) => optionIndex !== index);
                                const nextCorrectOptionId = current.correctOptionId === option.id
                                  ? options[0]?.id ?? null
                                  : current.correctOptionId;
                                return {
                                  ...current,
                                  options: options.map((item, optionIndex) => ({ ...item, orderIndex: optionIndex })),
                                  correctOptionId: nextCorrectOptionId,
                                };
                              })}
                              disabled={editForm.options.length <= 2}
                              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 transition-colors hover:border-red-500 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={question.id} className="rounded-[20px] border border-slate-800 bg-slate-950/60 p-5 transition-colors group hover:border-slate-700">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-xs font-bold text-slate-400">
                      {questionIndex + 1}
                    </div>
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={cn(
                          'rounded-full border px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.18em]',
                          question.type === 'blank'
                            ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
                        )}>
                          {question.type === 'blank' ? 'Blank' : 'MCQ'}
                        </span>
                        {question.type === 'blank' && (
                          <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-slate-300">
                            {question.inputType === 'float' ? 'Decimal' : 'Integer'}
                          </span>
                        )}
                      </div>
                      <RichQuestionText content={question.text} className="pt-0.5 text-slate-100" />
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditing(question)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 transition-all hover:border-primary hover:text-white"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => void handleDeleteQuestion(question.id)}
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 transition-all hover:border-red-500 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {question.type === 'blank' && question.blankRule ? (
                  <div className="grid gap-3 pl-10 md:grid-cols-3 xl:grid-cols-6">
                    {[
                      ['Correct', question.blankRule.correctAnswer],
                      ['Start', question.blankRule.rangeStart],
                      ['End', question.blankRule.rangeEnd],
                      ['Exact', question.blankRule.exactScore],
                      ['Min', question.blankRule.minScore],
                      ['Power', question.blankRule.curvePower],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                        <p className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
                        <p className="mt-1 font-mono text-sm font-bold text-slate-100">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 pl-10 md:grid-cols-2">
                    {question.options.map((option, index) => {
                      const isCorrect = question.correctOptionId === option.id;
                      return (
                        <div
                          key={option.id}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border p-2.5',
                            isCorrect ? 'border-green-500/20 bg-green-500/10' : 'border-slate-800 bg-slate-900',
                          )}
                        >
                          <div className={cn(
                            'flex h-6 w-6 items-center justify-center rounded text-[0.65rem] font-bold',
                            isCorrect ? 'bg-green-600 text-white' : 'border border-slate-700 bg-slate-950 text-slate-400',
                          )}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                            <span className={cn('text-xs font-medium', isCorrect ? 'text-green-100' : 'text-slate-300')}>
                              {option.text}
                            </span>
                            <span className={cn(
                              'shrink-0 rounded-full border px-2 py-1 text-[0.6rem] font-black uppercase tracking-wider',
                              option.score > 0
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                                : option.score < 0
                                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                                  : 'border-slate-700 bg-slate-950 text-slate-400',
                            )}>
                              {option.score > 0 ? `+${option.score}` : option.score} pts
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {questions.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <ListChecks size={18} className="text-primary" />
              </div>
              <p className="text-sm font-bold text-white">No questions in this round yet.</p>
              <p className="mt-2 text-sm text-slate-400">Add an MCQ or blank question to start building the round.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
