import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { competitionConfig } from '../../config/competitionConfig';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export const QuestionPage: React.FC = () => {
    const { roundId, questionIndex } = useParams<{ roundId: string; questionIndex: string }>();
    const navigate = useNavigate();
    const { roundsProgress, setAnswer, submitRound, rounds } = useAppStore();

    const [showSubmitModal, setShowSubmitModal] = useState(false);

    const round = rounds.find(r => r.id === roundId);
    const qIndex = parseInt(questionIndex || '0', 10);

    if (!round || isNaN(qIndex) || qIndex < 0 || qIndex >= round.questions.length) {
        return <div className="container p-8">Question not found.</div>;
    }

    if (round.status === 'closed') {
        navigate('/dashboard', { replace: true });
        return null;
    }

    const progress = roundsProgress[round.id];
    if (progress?.status === 'submitted') {
        navigate(`/round/${round.id}/submitted`, { replace: true });
        return null;
    }

    const question = round.questions[qIndex];
    const selectedOptionId = progress?.answers?.[question.id];
    const isBidirectional = competitionConfig.questionNavigationMode === 'bidirectional';
    const isLastQuestion = qIndex === round.questions.length - 1;
    const isFirstQuestion = qIndex === 0;

    const handleOptionSelect = (optionId: string) => {
        setAnswer(round.id, question.id, optionId);
    };

    const handleNext = () => {
        if (isLastQuestion) setShowSubmitModal(true);
        else navigate(`/round/${round.id}/q/${qIndex + 1}`);
    };

    const handlePrev = () => {
        if (!isFirstQuestion && isBidirectional) navigate(`/round/${round.id}/q/${qIndex - 1}`);
        else if (isFirstQuestion) navigate(`/round/${round.id}`);
    };

    const handleFinalSubmit = () => {
        setShowSubmitModal(false);
        submitRound(round.id);
        navigate(`/round/${round.id}/submitted`);
    };

    const answeredCount = Object.keys(progress?.answers || {}).length;
    const missingAnswers = round.questions.length - answeredCount;

    return (
        <motion.div
            className="pt-4 pb-12 min-h-[80vh]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
        >
            <TimerBanner roundId={round.id} />

            <div className="container max-w-[680px] mt-6">

                {/* Progress Bar + Nav */}
                <div className="flex items-center justify-between mb-7">
                    <Button variant="outline" onClick={handlePrev} disabled={!isBidirectional && !isFirstQuestion}>
                        <ArrowLeft size={15} />
                        {isFirstQuestion ? 'Case Brief' : 'Previous'}
                    </Button>

                    <div className="text-center">
                        <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Interrogation Phase
                        </p>
                        <div className="flex gap-[5px] justify-center">
                            {round.questions.map((_, idx) => {
                                const isAnswered = !!progress?.answers?.[round.questions[idx].id];
                                return (
                                    <div key={idx} className={cn(
                                        'w-7 h-[5px] rounded-full transition-colors duration-200',
                                        idx === qIndex ? 'bg-slate-900' : isAnswered ? 'bg-slate-500' : 'bg-slate-200'
                                    )} />
                                );
                            })}
                        </div>
                        <p className="text-[0.72rem] text-slate-400 mt-2 font-medium">
                            {qIndex + 1} / {round.questions.length}
                        </p>
                    </div>

                    <div className="w-[90px]" />
                </div>

                {/* Question Card */}
                <motion.div
                    key={question.id}
                    className="bg-white border border-border border-t-4 border-t-slate-900 rounded-2xl shadow-md overflow-hidden mb-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="px-8 py-7">
                        <h2 className="text-lg font-bold text-slate-900 leading-relaxed mb-6">
                            {question.text}
                        </h2>

                        <div className="flex flex-col gap-2.5">
                            {question.options.map((option, idx) => {
                                const isSelected = selectedOptionId === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleOptionSelect(option.id)}
                                        className={cn(
                                            'flex items-center gap-3.5 text-left px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all duration-150',
                                            isSelected
                                                ? 'border-slate-900 bg-slate-50 shadow-[0_0_0_1px_#0f172a]'
                                                : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                                        )}
                                    >
                                        <div className={cn(
                                            'w-7 h-7 rounded-lg shrink-0 flex items-center justify-center font-mono text-xs font-bold transition-all duration-150',
                                            isSelected
                                                ? 'bg-slate-900 text-white'
                                                : 'bg-slate-100 text-slate-500'
                                        )}>
                                            {isSelected ? <CheckCircle2 size={16} /> : String.fromCharCode(65 + idx)}
                                        </div>
                                        <span className={cn(
                                            'text-[0.9rem] flex-1',
                                            isSelected ? 'text-slate-900 font-semibold' : 'text-slate-700'
                                        )}>
                                            {option.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>

                {/* Next Button */}
                <div className="flex justify-end">
                    <Button variant="primary" onClick={handleNext}>
                        {isLastQuestion ? 'Review & Submit Findings' : 'Next Question'}
                        {!isLastQuestion && <ArrowRight size={16} />}
                    </Button>
                </div>
            </div>

            {/* Submit Modal */}
            <AnimatePresence>
                {showSubmitModal && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-[18px] max-w-[440px] w-full shadow-xl overflow-hidden"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="p-7">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertTriangle size={22} className="text-amber-700" />
                                    <h3 className="text-lg font-extrabold text-slate-900">Confirm Submission</h3>
                                </div>

                                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                                    You're about to submit your findings for <strong className="text-slate-900">{round.title}</strong>.
                                    Answers cannot be changed after submission.
                                </p>

                                {missingAnswers > 0 && (
                                    <div className="bg-warning-bg border border-warning-border rounded-[10px] px-4 py-3 flex gap-2.5 items-start mb-5">
                                        <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
                                        <span className="text-[0.82rem] text-amber-700 font-medium">
                                            {missingAnswers} question{missingAnswers > 1 ? 's are' : ' is'} unanswered — these will be marked incorrect.
                                        </span>
                                    </div>
                                )}

                                <div className="flex gap-3 justify-end mt-2">
                                    <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
                                        Go Back
                                    </Button>
                                    <Button variant="primary" onClick={handleFinalSubmit}>
                                        Finalize & Submit
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
