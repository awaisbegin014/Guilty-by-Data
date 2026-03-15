import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { competitionConfig } from '../../config/competitionConfig';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Fingerprint, Database, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const QuestionPage: React.FC = () => {
    const { roundId, questionIndex } = useParams<{ roundId: string; questionIndex: string }>();
    const navigate = useNavigate();
    const { roundsProgress, setAnswer, submitRound, rounds, isSubmitting, unlockedRounds, error, clearError } = useAppStore();

    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const round = rounds.find(r => r.id === roundId);
    const qIndex = parseInt(questionIndex || '0', 10);

    if (!round || isNaN(qIndex) || qIndex < 0 || qIndex >= round.questions.length) {
        return <div className="container p-20 text-center"><p className="case-label">Analysis Node Unavailable</p></div>;
    }

    if (!unlockedRounds.includes(round.id)) {
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
        <div className="pt-4 pb-12 min-h-full flex flex-col">
            <TimerBanner roundId={round.id} />

            <div className="container max-w-[800px] mt-4 flex-1 flex flex-col">

                {/* Question Terminal Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 pb-3 border-b border-border shrink-0">
                    <Button variant="outline" size="sm" onClick={handlePrev} className="w-full sm:w-auto font-black text-[0.55rem] tracking-widest uppercase h-7 px-3">
                        <ArrowLeft size={10} className="mr-1.5" />
                        <span>{isFirstQuestion ? 'Case Brief' : 'Prev'}</span>
                    </Button>

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

                    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 border border-primary/30 rounded bg-primary/10">
                        <Database size={10} className="text-primary" />
                        <span className="text-[0.55rem] font-mono text-white font-black uppercase tracking-wider">P_0{round.id.at(-1)}</span>
                    </div>
                </div>

                {/* Main Question Dossier */}
                <div className="dossier-card rounded-xl p-5 sm:p-6 mb-3 border-primary/20 bg-slate-900/60 flex-1 overflow-y-auto min-h-0">
                    <div className="flex items-start gap-3 mb-4">
                         <div className="w-8 h-8 rounded border border-border bg-slate-900/40 flex items-center justify-center text-primary font-mono font-black text-[0.65rem] shrink-0">
                            P{qIndex + 1}
                         </div>
                         <h2 className="text-lg font-black text-white leading-tight mt-0.5 tracking-tight">
                            {question.text}
                         </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {question.options.map((option, idx) => {
                            const isSelected = selectedOptionId === option.id;
                            const letter = String.fromCharCode(65 + idx);
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleOptionSelect(option.id)}
                                    className={cn(
                                        'flex items-center gap-4 text-left px-5 py-3 rounded-lg border transition-all group relative overflow-hidden',
                                        isSelected
                                            ? 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(74,124,157,0.1)]'
                                            : 'bg-secondary/10 border-border/60 hover:border-primary/40 hover:bg-secondary/20'
                                    )}
                                >
                                    <div className={cn(
                                        'w-7 h-7 flex items-center justify-center font-mono font-black text-[0.65rem] transition-colors rounded border',
                                        isSelected ? 'bg-primary text-white border-primary' : 'bg-slate-900 border-border text-muted-foreground group-hover:text-slate-200'
                                    )}>
                                        {isSelected ? <CheckCircle2 size={14} /> : letter}
                                    </div>
                                    <span className={cn(
                                        'text-[0.85rem] flex-1 font-bold tracking-tight transition-colors',
                                        isSelected ? 'text-white' : 'text-slate-300'
                                    )}>
                                        {option.text}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Navigation / Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-900/40 border border-border rounded-xl shrink-0">
                    <div className="flex items-center gap-2.5">
                         <Info size={14} className="text-primary shrink-0" />
                         <p className="text-[0.55rem] text-muted-foreground font-black uppercase tracking-widest leading-tight">
                            Protocol: findings are stored locally until final submission.
                         </p>
                    </div>
                    <Button variant="primary" size="sm" onClick={handleNext} className="w-full sm:w-auto min-w-[180px] h-10 text-[0.7rem] tracking-widest uppercase">
                        {isLastQuestion ? (
                            <span className="flex items-center gap-2">
                                <Fingerprint size={16} />
                                <span>Validate Protocol</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <span>Proceed</span>
                                <ArrowRight size={16} />
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
