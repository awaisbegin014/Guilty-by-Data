import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichQuestionText } from './RichQuestionText';

interface Option {
    id: string;
    text: string;
}

interface McqQuestionProps {
    questionNumber: number;
    questionText: string;
    options: Option[];
    selectedOptionId?: string;
    onSelect: (optionId: string) => void;
}

export const McqQuestion: React.FC<McqQuestionProps> = ({
    questionNumber,
    questionText,
    options,
    selectedOptionId,
    onSelect,
}) => {
    return (
        <div className="flex flex-col gap-4">
            {/* ── Question Section ── */}
            <div className="dossier-card rounded-xl border-primary/20 bg-slate-900/60 px-6 py-5 flex items-start gap-4">
                <div className="w-9 h-9 rounded border border-border bg-slate-900/60 flex items-center justify-center text-primary font-mono font-black text-[0.65rem] shrink-0 mt-0.5">
                    P{questionNumber}
                </div>
                <RichQuestionText
                    content={questionText}
                    className="pt-1 text-white"
                />
            </div>

            {/* ── Options Section ── */}
            <div className="dossier-card rounded-xl border-border/50 bg-slate-900/40 px-5 py-4">
                <p className="text-[0.55rem] font-black font-mono text-muted-foreground uppercase tracking-[0.25em] mb-3">
                    Select Response
                </p>
                <div className="grid grid-cols-2 gap-3">
                    {options.map((option, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const isSelected = selectedOptionId === option.id;
                        return (
                            <button
                                key={option.id}
                                onClick={() => onSelect(option.id)}
                                className={cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 group relative text-left',
                                    isSelected
                                        ? 'bg-primary/10 border-primary shadow-[0_0_12px_rgba(74,124,157,0.15)]'
                                        : 'bg-secondary/10 border-border/60 hover:border-primary/40 hover:bg-secondary/20'
                                )}
                            >
                                {/* letter badge */}
                                <div className={cn(
                                    'w-7 h-7 flex items-center justify-center font-mono font-black text-[0.65rem] transition-colors rounded border shrink-0',
                                    isSelected
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-slate-900 border-border text-muted-foreground group-hover:text-slate-200'
                                )}>
                                    {isSelected ? <CheckCircle2 size={14} /> : letter}
                                </div>
                                {/* option text */}
                                <span className={cn(
                                    'text-[0.82rem] font-bold tracking-tight transition-colors',
                                    isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                                )}>
                                    {option.text}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
