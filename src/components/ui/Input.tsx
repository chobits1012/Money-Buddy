import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = 'text', label, error, icon, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5 w-full">
                {label && (
                    <label className="text-sm font-medium text-textSecondary ml-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary">
                            {icon}
                        </div>
                    )}
                    <input
                        type={type}
                        className={cn(
                            'flex w-full rounded-xl border border-white/10 bg-surface/50 px-3 py-3 text-sm text-textPrimary shadow-sm transition-colors',
                            'placeholder:text-textSecondary/50',
                            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accentPrimary focus-visible:border-accentPrimary',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            icon && 'pl-10',
                            error && 'border-accentDanger focus-visible:ring-accentDanger focus-visible:border-accentDanger',
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="text-sm text-accentDanger ml-1 flex items-center gap-1 mt-1 animate-pulse">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accentDanger" />
                        {error}
                    </p>
                )}
            </div>
        );
    }
);
Input.displayName = 'Input';
