import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockRounds } from '../../data/mockData';
import { competitionConfig } from '../../config/competitionConfig';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Circle } from 'lucide-react';
import { cn } from '../../utils/cn';

export const QuestionPage: React.FC = () => {
    const { roundId, questionIndex } = useParams<{ roundId: string, questionIndex: string }>();
    const navigate = useNavigate();
    const { roundsProgress, setAnswer, submitRound } = useAppStore();

    const [showSubmitModal, setShowSubmitModal] = useState(false);

    const round = mockRounds.find(r => r.id === roundId);
    const qIndex = parseInt(questionIndex || '0', 10);

    if (!round || isNaN(qIndex) || qIndex < 0 || qIndex >= round.questions.length) {
        return <div className="container py-8">Question not found.</div>;
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
        if (isLastQuestion) {
            setShowSubmitModal(true);
        } else {
            navigate(`/round/${round.id}/q/${qIndex + 1}`);
        }
    };

    const handlePrev = () => {
        if (!isFirstQuestion && isBidirectional) {
            navigate(`/round/${round.id}/q/${qIndex - 1}`);
        } else if (isFirstQuestion) {
            navigate(`/round/${round.id}`);
        }
    };

    const handleFinalSubmit = () => {
        setShowSubmitModal(false);
        submitRound(round.id);
        navigate(`/round/${round.id}/submitted`);
    };

    const answeredCount = Object.keys(progress?.answers || {}).length;
    const missingAnswers = round.questions.length - answeredCount;

    return (
        <div className="pt-8 pb-16 animate-fade-in relative min-h-[80vh]">
            <TimerBanner roundId={round.id} />

            <div className="container mt-8 max-w-3xl">

                {/* Header / Progress */}
                <div className="flex items-center justify-between mb-8">
                    <Button variant="outline" onClick={handlePrev} disabled={!isBidirectional && !isFirstQuestion}>
                        <ArrowLeft size={16} className="mr-2" />
                        {isFirstQuestion ? 'Case Brief' : 'Previous'}
                    </Button>

                    <div className="text-center">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Interrogation Phase
                        </h2>
                        <div className="flex items-center gap-1 justify-center">
                            {round.questions.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "w-8 h-1.5 rounded-full transition-colors",
                                        idx === qIndex ? "bg-slate-800" :
                                            idx < qIndex ? "bg-slate-400" : "bg-slate-200"
                                    )}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Question {qIndex + 1} of {round.questions.length}</p>
                    </div>

                    <div className="w-[100px]" /> {/* Spacer for flex centering */}
                </div>

                {/* Question Card */}
                <Card className="border-t-4 border-t-slate-800 shadow-md">
                    <CardBody className="p-6 md:p-8">
                        <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mb-8 leading-snug">
                            {question.text}
                        </h2>

                        <div className="flex flex-col gap-3 pb-4">
                            {question.options.map((option) => {
                                const isSelected = selectedOptionId === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleOptionSelect(option.id)}
                                        className={cn(
                                            "flex items-center text-left p-4 rounded-xl border-2 transition-all",
                                            isSelected
                                                ? "border-slate-800 bg-slate-50 ring-1 ring-slate-800 shadow-sm"
                                                : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="mr-4 text-slate-400">
                                            {isSelected ? (
                                                <CheckCircle2 size={24} className="text-slate-800" />
                                            ) : (
                                                <Circle size={24} />
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-base md:text-lg flex-1",
                                            isSelected ? "font-semibold text-slate-900" : "text-slate-700"
                                        )}>
                                            {option.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </CardBody>
                </Card>

                {/* Next/Submit Button */}
                <div className="mt-8 flex justify-end">
                    <Button
                        variant="primary"
                        className="py-3 px-8 text-base shadow-sm"
                        onClick={handleNext}
                    >
                        {isLastQuestion ? 'Review & Submit Findings' : 'Next Question'}
                        {!isLastQuestion && <ArrowRight size={18} className="ml-2" />}
                    </Button>
                </div>

            </div>

            {/* Confirmation Modal Overlay */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in">
                    <Card className="w-full max-w-md shadow-lg border-0 ring-1 ring-slate-900/10">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4 text-slate-900">
                                <AlertTriangle size={24} className="text-warning-text" />
                                <h3 className="text-xl font-bold">Confirm Submission</h3>
                            </div>

                            <p className="text-slate-600 mb-4">
                                You are about to submit your findings for <strong>{round.title}</strong>.
                                Answers cannot be changed after submission.
                            </p>

                            {missingAnswers > 0 && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm font-medium mb-6 flex items-start gap-2 border border-red-200">
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                    <span>You have {missingAnswers} unanswered question{missingAnswers > 1 ? 's' : ''}. Unanswered questions are marked incorrect.</span>
                                </div>
                            )}

                            <div className="flex gap-3 justify-end mt-6">
                                <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
                                    Go Back
                                </Button>
                                <Button variant="primary" onClick={handleFinalSubmit}>
                                    Finalize & Submit
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
