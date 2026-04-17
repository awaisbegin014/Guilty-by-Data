import React, { useState } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { competitionConfig } from '../../config/competitionConfig';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { McqQuestion } from '../../components/McqQuestion';
import { BlankQuestion } from '../../components/BlankQuestion';
import { ArrowLeft, ArrowRight, AlertTriangle, Fingerprint, Database, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canAccessRoundRoute } from '../../lib/roundState';
import { formatRoundShortCode } from '../../lib/roundPresentation';

export const QuestionPage: React.FC = () => {
    const { roundId, questionIndex } = useParams<{ roundId: string; questionIndex: string }>();
    const navigate = useNavigate();
    const { roundsProgress, setAnswer, submitRound, rounds, isSubmitting, unlockedRounds, error, clearError } = useAppStore();

    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const round = rounds.find(r => r.id === roundId);
    const progress = round ? roundsProgress[round.id] : undefined;
    const qIndex = parseInt(questionIndex || '0', 10);

    if (!round) {
        return <div className="container p-20 text-center"><p className="case-label">Analysis Node Unavailable</p></div>;
    }

    if (progress?.status === 'submitted') {
        return <Navigate to={`/round/${round.id}/submitted`} replace />;
    }

    if (!canAccessRoundRoute(progress?.status ?? 'locked') || !unlockedRounds.includes(round.id) || !round.contentVisible) {
        return <Navigate to="/dashboard" replace />;
    }

    if (isNaN(qIndex) || qIndex < 0 || qIndex >= round.questions.length) {
        return <div className="container p-20 text-center"><p className="case-label">Analysis Node Unavailable</p></div>;
    }

    const question = round.questions[qIndex];
    const selectedAnswerValue = progress?.answers?.[question.id] ?? '';
    const isBidirectional = competitionConfig.questionNavigationMode === 'bidirectional';
    const isLastQuestion = qIndex === round.questions.length - 1;
    const isFirstQuestion = qIndex === 0;

    const handleAnswerChange = (answerValue: string) => {
        setAnswer(round.id, question.id, answerValue);
    };

    const handleNext = () => {
        if (isLastQuestion) setShowSubmitModal(true);
        else navigate(`/round/${round.id}/q/${qIndex + 1}`);
    };

    const handlePrev = () => {
        if (!isFirstQuestion && isBidirectional) navigate(`/round/${round.id}/q/${qIndex - 1}`);
        else if (isFirstQuestion) navigate(`/round/${round.id}`);
    };

    const handleFinalSubmit = async () => {
        setShowSubmitModal(false);
        setSubmitError('');
        clearError();

        try {
            await submitRound(round.id);
            navigate(`/round/${round.id}/submitted`);
        } catch (submissionError) {
            setSubmitError(submissionError instanceof Error ? submissionError.message : 'Submission failed.');
        }
    };

    const answeredCount = Object.keys(progress?.answers || {}).length;
    const missingAnswers = round.questions.length - answeredCount;

    return (
        <div className="pb-8 min-h-full flex flex-col">
            <div className="container max-w-[900px] mt-4 flex-1 flex flex-col">

                {/* Question Terminal Header — progress + timer */}
                <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-border shrink-0">
                    {/* Left: round code badge */}
                    <div className="flex items-center gap-1.5 px-2 py-1 border border-primary/30 rounded bg-primary/10">
                        <Database size={10} className="text-primary" />
                        <span className="text-[0.55rem] font-mono text-white font-black uppercase tracking-wider">
                            {formatRoundShortCode(round.orderIndex)}
                        </span>
                    </div>

                    {/* Centre: node progress */}
                    <div className="flex flex-col items-center flex-1">
                        <div className="flex items-center gap-1.5 mb-1.5">
                             <Fingerprint size={12} className="text-primary" />
                             <span className="case-label text-white/90 text-[0.55rem]">Findings Board</span>
                        </div>
                        <div className="flex gap-1 justify-center">
                            {round.questions.map((_, idx) => {
                                const isAnswered = !!progress?.answers?.[round.questions[idx].id];
                                return (
                                    <div 
                                        key={idx} 
                                        className={cn(
                                            'w-6 h-1 transition-all duration-300',
                                            idx === qIndex ? 'bg-primary' : (isAnswered ? 'bg-slate-400' : 'bg-secondary')
                                        )} 
                                    />
                                );
                            })}
                        </div>
                        <p className="text-[0.6rem] font-mono text-white/60 font-black mt-1.5 uppercase tracking-widest">
                             Node {qIndex + 1} // {round.questions.length}
                        </p>
                    </div>

                    {/* Right: timer chip */}
                    <TimerBanner roundId={round.id} />
                </div>

                {/* Main Question Dossier */}
                <div className="mb-3 flex-1 overflow-y-auto min-h-0">
                    {question.type === 'blank' && (question.inputType === 'int' || question.inputType === 'float') ? (
                        <BlankQuestion
                            questionNumber={qIndex + 1}
                            questionText={question.text}
                            inputType={question.inputType}
                            value={selectedAnswerValue}
                            onChange={handleAnswerChange}
                        />
                    ) : (
                        <McqQuestion
                            questionNumber={qIndex + 1}
                            questionText={question.text}
                            options={question.options}
                            selectedOptionId={selectedAnswerValue}
                            onSelect={handleAnswerChange}
                        />
                    )}
                </div>

                {/* Navigation / Action Bar */}
                <div className="flex items-center justify-between gap-4 p-4 bg-slate-900/40 border border-border rounded-xl shrink-0">
                    <Button variant="secondary" size="sm" onClick={handlePrev} className="min-w-[150px] h-9 text-[0.65rem] tracking-widest uppercase">
                        <span className="flex items-center gap-2">
                            <ArrowLeft size={14} />
                            <span>{isFirstQuestion ? 'Case Brief' : 'Prev'}</span>
                        </span>
                    </Button>
                    <div className="flex items-center gap-2">
                        <Info size={13} className="text-primary shrink-0" />
                        <p className="text-[0.5rem] text-muted-foreground font-black uppercase tracking-widest leading-tight">
                            Findings stored locally until submission.
                        </p>
                    </div>
                    <Button variant="primary" size="sm" onClick={handleNext} className="min-w-[150px] h-9 text-[0.65rem] tracking-widest uppercase">
                        {isLastQuestion ? (
                            <span className="flex items-center gap-2">
                                <Fingerprint size={14} />
                                <span>Validate Protocol</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <span>Proceed</span>
                                <ArrowRight size={14} />
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            {/* Submission Protocol Modal */}
            {showSubmitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-background/80">
                    <div className="dossier-card rounded-xl max-w-[480px] w-full shadow-2xl relative z-50 overflow-hidden">
                        <div className="p-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded border border-destructive/20 bg-destructive/10 flex items-center justify-center text-destructive">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Final Protocol</h3>
                                    <span className="case-label text-[0.6rem]">Irreversible Transaction</span>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-8 leading-relaxed font-medium">
                                You are about to upload your analytical findings for <span className="text-white font-black">{round.title}</span>. Once the upload is finalized, your session for this phase will be locked.
                            </p>

                            {missingAnswers > 0 && (
                                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-5 mb-8 flex items-start gap-4">
                                     <AlertTriangle size={20} className="text-destructive shrink-0" />
                                     <div>
                                        <p className="text-[0.7rem] font-black text-destructive uppercase tracking-widest mb-1">DATA_GAP_WARNING</p>
                                        <p className="text-[0.7rem] text-muted-foreground font-bold uppercase tracking-tight">
                                             {missingAnswers} investigation node(s) have no findings. Points will be lost.
                                        </p>
                                     </div>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowSubmitModal(false)}
                                    className="flex-1 h-14 font-black text-[0.75rem] uppercase tracking-widest text-muted-foreground hover:text-white transition-colors"
                                >
                                    Return to Analysis
                                </button>
                                <Button 
                                    variant="primary" 
                                    onClick={() => void handleFinalSubmit()} 
                                    disabled={isSubmitting}
                                    className="flex-1 h-14 bg-destructive text-white border-none"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Execute Submission'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(submitError || error) && (
                <div className="container max-w-[800px] mt-4">
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {submitError || error}
                    </div>
                </div>
            )}
        </div>
    );
};
