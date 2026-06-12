import { cn } from '../../utils/cn';
import type { HomeViewMode } from '../../hooks/useHomeViewMode';

interface ViewModeToggleProps {
    mode: HomeViewMode;
    onChange: (mode: HomeViewMode) => void;
    className?: string;
}

export function ViewModeToggle({ mode, onChange, className }: ViewModeToggleProps) {
    return (
        <div
            className={cn(
                'inline-flex rounded-full border border-stoneSoft/80 bg-white/50 p-0.5 text-[11px] font-medium',
                className,
            )}
            role="tablist"
            aria-label="首頁視圖切換"
        >
            <button
                type="button"
                role="tab"
                aria-selected={mode === 'classic'}
                onClick={() => onChange('classic')}
                className={cn(
                    'rounded-full px-3 py-1.5 transition-colors',
                    mode === 'classic'
                        ? 'bg-clayDark text-white'
                        : 'text-clay hover:text-slate-800',
                )}
            >
                經典
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={mode === 'pet'}
                onClick={() => onChange('pet')}
                className={cn(
                    'rounded-full px-3 py-1.5 transition-colors',
                    mode === 'pet'
                        ? 'bg-moss text-white'
                        : 'text-clay hover:text-slate-800',
                )}
            >
                庭院
            </button>
        </div>
    );
}
