import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline';
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    fullWidth,
    className,
    ...props
}) => {
    return (
        <button
            className={cn(
                'btn',
                `btn-${variant}`,
                fullWidth && 'btn-full',
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};
