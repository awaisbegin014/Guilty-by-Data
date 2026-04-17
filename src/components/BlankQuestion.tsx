import React, { useEffect, useMemo, useState } from 'react';
import { Hash, Sigma } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichQuestionText } from './RichQuestionText';

interface BlankQuestionProps {
  questionNumber: number;
  questionText: string;
  inputType: 'int' | 'float';
  value?: string;
  onChange: (value: string) => void;
}

function getValidationMessage(inputType: 'int' | 'float', value: string) {
  if (!value.trim()) {
    return '';
  }

  if (inputType === 'int') {
    return /^-?\d+$/.test(value.trim()) ? '' : 'Enter a whole number only.';
  }

  return /^-?(?:\d+|\d*\.\d+)$/.test(value.trim()) ? '' : 'Enter a valid decimal number.';
}

function isPotentiallyValidInput(inputType: 'int' | 'float', value: string) {
  if (value === '') {
    return true;
  }

  if (inputType === 'int') {
    return /^-?\d*$/.test(value);
  }

  return /^-?(?:\d+)?(?:\.\d*)?$/.test(value);
}

export const BlankQuestion: React.FC<BlankQuestionProps> = ({
  questionNumber,
  questionText,
  inputType,
  value = '',
  onChange,
}) => {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const validationMessage = useMemo(
    () => getValidationMessage(inputType, draftValue),
    [draftValue, inputType],
  );

  const helperLabel = inputType === 'int' ? 'Whole number only' : 'Decimal values allowed';
  const helperIcon = inputType === 'int' ? <Hash size={12} /> : <Sigma size={12} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="dossier-card rounded-xl border-primary/20 bg-slate-900/60 px-6 py-5 flex items-start gap-4">
        <div className="w-9 h-9 rounded border border-border bg-slate-900/60 flex items-center justify-center text-primary font-mono font-black text-[0.65rem] shrink-0 mt-0.5">
          P{questionNumber}
        </div>
        <RichQuestionText
          content={questionText}
          className="pt-1 text-white"
        />
      </div>

      <div className="dossier-card rounded-xl border-border/50 bg-slate-900/40 px-5 py-4">
        <div className="mb-3 flex items-center gap-2 text-[0.55rem] font-black font-mono text-muted-foreground uppercase tracking-[0.25em]">
          {helperIcon}
          <span>Numeric Response</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
          <label className="block text-[0.6rem] font-black uppercase tracking-[0.22em] text-slate-400">
            Your Answer
          </label>
          <input
            type="text"
            inputMode={inputType === 'int' ? 'numeric' : 'decimal'}
            autoComplete="off"
            spellCheck={false}
            value={draftValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              if (!isPotentiallyValidInput(inputType, nextValue)) {
                setDraftValue(nextValue);
                return;
              }

              setDraftValue(nextValue);
              onChange(nextValue);
            }}
            className={cn(
              'mt-3 w-full rounded-xl border bg-slate-950 px-4 py-3 text-lg font-mono font-black tracking-wide text-white outline-none transition-colors',
              validationMessage
                ? 'border-red-500/40 focus:border-red-400'
                : 'border-slate-700 focus:border-primary',
            )}
            placeholder={inputType === 'int' ? 'Enter a whole number' : 'Enter a decimal number'}
          />

          <div className="mt-3 flex items-start justify-between gap-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-500">
              {helperLabel}
            </p>
            <p
              className={cn(
                'text-right text-[0.7rem] font-semibold',
                validationMessage ? 'text-red-300' : 'text-slate-400',
              )}
            >
              {validationMessage || 'Saved locally as you type.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
