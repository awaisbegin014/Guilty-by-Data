import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { competitionConfig } from '../../config/competitionConfig';
import { Button } from '../../components/ui/Button';
import { TimerBanner } from '../../components/TimerBanner';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

export const QuestionPage: React.FC = () => {
    const { roundId, questionIndex } = useParams<{ roundId: string; questionIndex: string }>();
    const navigate = useNavigate();
    const { roundsProgress, setAnswer, submitRound, rounds } = useAppStore();

    const [showSubmitModal, setShowSubmitModal] = useState(false);

    const round = rounds.find(r => r.id === roundId);
    const qIndex = parseInt(questionIndex || '0', 10);

    if (!round || isNaN(qIndex) || qIndex < 0 || qIndex >= round.questions.length) {
        return <div className="container" style={{ padding: '2rem' }}>Question not found.</div>;
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
        <div style={{ paddingTop: '1rem', paddingBottom: '3rem', minHeight: '80vh' }} className="animate-fade-in">
            <TimerBanner roundId={round.id} />

            <div className="container" style={{ maxWidth: '680px', marginTop: '1.5rem' }}>

                {/* Progress Bar + Nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
                    <Button variant="outline" onClick={handlePrev} disabled={!isBidirectional && !isFirstQuestion}>
                        <ArrowLeft size={15} style={{ marginRight: '0.375rem' }} />
                        {isFirstQuestion ? 'Case Brief' : 'Previous'}
                    </Button>

                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                            Interrogation Phase
                        </p>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            {round.questions.map((_, idx) => {
                                const isAnswered = !!progress?.answers?.[round.questions[idx].id];
                                return (
                                    <div key={idx} style={{
                                        width: '28px', height: '5px', borderRadius: '99px',
                                        background: idx === qIndex
                                            ? '#0f172a'
                                            : isAnswered ? '#64748b' : '#e2e8f0',
                                        transition: 'background 0.2s',
                                    }} />
                                );
                            })}
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: '0.5rem', fontWeight: 500 }}>
                            {qIndex + 1} / {round.questions.length}
                        </p>
                    </div>

                    <div style={{ width: '90px' }} />
                </div>

                {/* Question Card */}
                <div style={{
                    background: '#fff', border: '1px solid var(--border)',
                    borderTop: '4px solid #0f172a',
                    borderRadius: '16px', boxShadow: 'var(--shadow-md)',
                    overflow: 'hidden', marginBottom: '1.5rem',
                }}>
                    <div style={{ padding: '1.75rem 2rem' }}>
                        <h2 style={{
                            fontSize: '1.1rem', fontWeight: 700, color: '#0f172a',
                            lineHeight: 1.55, marginBottom: '1.5rem',
                        }}>
                            {question.text}
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                            {question.options.map((option, idx) => {
                                const isSelected = selectedOptionId === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleOptionSelect(option.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.875rem',
                                            textAlign: 'left', padding: '0.875rem 1rem',
                                            borderRadius: '12px',
                                            border: isSelected ? '2px solid #0f172a' : '2px solid #e2e8f0',
                                            background: isSelected ? '#f8fafc' : '#fff',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            boxShadow: isSelected ? '0 0 0 1px #0f172a' : 'none',
                                        }}
                                        onMouseOver={e => {
                                            if (!isSelected) {
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = '#94a3b8';
                                                (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc';
                                            }
                                        }}
                                        onMouseOut={e => {
                                            if (!isSelected) {
                                                (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0';
                                                (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                                            }
                                        }}
                                    >
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: isSelected ? '#0f172a' : '#f1f5f9',
                                            color: isSelected ? '#fff' : '#64748b',
                                            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
                                            transition: 'all 0.15s',
                                        }}>
                                            {isSelected ? <CheckCircle2 size={16} /> : String.fromCharCode(65 + idx)}
                                        </div>
                                        <span style={{
                                            fontSize: '0.9rem', flex: 1,
                                            color: isSelected ? '#0f172a' : '#334155',
                                            fontWeight: isSelected ? 600 : 400,
                                        }}>
                                            {option.text}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Next Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="primary" onClick={handleNext}>
                        {isLastQuestion ? 'Review & Submit Findings' : 'Next Question'}
                        {!isLastQuestion && <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />}
                    </Button>
                </div>
            </div>

            {/* Submit Modal */}
            {showSubmitModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 50,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(15,23,42,0.65)', padding: '1rem',
                }} className="animate-fade-in">
                    <div style={{
                        background: '#fff', borderRadius: '18px', maxWidth: '440px', width: '100%',
                        boxShadow: 'var(--shadow-xl)', overflow: 'hidden',
                    }}>
                        <div style={{ padding: '1.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <AlertTriangle size={22} color="#b45309" />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Confirm Submission</h3>
                            </div>

                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '1rem' }}>
                                You're about to submit your findings for <strong style={{ color: '#0f172a' }}>{round.title}</strong>.
                                Answers cannot be changed after submission.
                            </p>

                            {missingAnswers > 0 && (
                                <div style={{
                                    background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
                                    borderRadius: '10px', padding: '0.75rem 1rem',
                                    display: 'flex', gap: '0.625rem', alignItems: 'flex-start',
                                    marginBottom: '1.25rem',
                                }}>
                                    <AlertTriangle size={15} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span style={{ fontSize: '0.82rem', color: '#b45309', fontWeight: 500 }}>
                                        {missingAnswers} question{missingAnswers > 1 ? 's are' : ' is'} unanswered — these will be marked incorrect.
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <Button variant="outline" onClick={() => setShowSubmitModal(false)}>
                                    Go Back
                                </Button>
                                <Button variant="primary" onClick={handleFinalSubmit}>
                                    Finalize & Submit
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
