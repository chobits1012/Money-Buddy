import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    noPadding?: boolean;
}

export const Card = ({ children, className, noPadding = false, ...props }: CardProps) => {
    return (
        <div
            className={cn(
                'glass-panel overflow-hidden relative',
                !noPadding && 'p-4 sm:p-6',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};
