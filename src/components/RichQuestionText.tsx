import React from 'react';
import { cn } from '@/lib/utils';
import { toRenderableRichText } from '../lib/richText';

interface RichQuestionTextProps {
  content: string;
  className?: string;
}

export const RichQuestionText: React.FC<RichQuestionTextProps> = ({
  content,
  className,
}) => (
  <div
    className={cn('question-rich-text', className)}
    dangerouslySetInnerHTML={{ __html: toRenderableRichText(content) }}
  />
);
