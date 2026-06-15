import { cn } from '../../utils/cn';
import type { CompanionAvatarViewModel } from '../../types/petDashboard';
import { CompanionSilhouette } from './CompanionSilhouette';

interface PetAvatarProps {
    companion: CompanionAvatarViewModel;
    selected?: boolean;
    onSelect: (anchorRect: DOMRect) => void;
    /** 庭院場景：無標籤、無選取框，融入背景 */
    variant?: 'default' | 'courtyard';
    /** 庭院遠近縮放（愈大愈靠近鏡頭；編輯器上限 2.0） */
    courtyardSpotScale?: number;
}

export function PetAvatar({
    companion,
    selected,
    onSelect,
    variant = 'default',
    courtyardSpotScale = 1,
}: PetAvatarProps) {
    const isCourtyard = variant === 'courtyard';
    const subtitle = companion.isPlaceholder
        ? companion.statusLabel
        : companion.isStray
          ? '流浪持倉'
          : `${companion.allocationPercent}%`;

    const displayScale = isCourtyard
        ? courtyardSpotScale
        : companion.scale;

    if (isCourtyard) {
        return (
            <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                    const anchor = e.currentTarget.querySelector('[data-pet-anchor]');
                    const rect = anchor instanceof HTMLElement
                        ? anchor.getBoundingClientRect()
                        : e.currentTarget.getBoundingClientRect();
                    onSelect(rect);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const anchor = e.currentTarget.querySelector('[data-pet-anchor]');
                        const rect = anchor instanceof HTMLElement
                            ? anchor.getBoundingClientRect()
                            : e.currentTarget.getBoundingClientRect();
                        onSelect(rect);
                    }
                }}
                className={cn(
                    'pet-avatar group inline-flex flex-col justify-end items-center leading-none',
                    'cursor-pointer touch-manipulation active:scale-[0.97]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss/40',
                    companion.isPlaceholder && 'opacity-70',
                )}
                aria-label={`${companion.displayName}，${subtitle}`}
            >
                <div
                    data-pet-anchor
                    className="relative block leading-none"
                    style={{ transform: `scale(${displayScale})`, transformOrigin: 'center bottom' }}
                >
                    <div className={cn('pet-breathe block leading-none', companion.mood === 'sleepy' && 'pet-sleepy')}>
                        <CompanionSilhouette
                            companion={companion}
                            size="courtyard"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={(e) => {
                const anchor = e.currentTarget.querySelector('[data-pet-anchor]');
                const rect = anchor instanceof HTMLElement
                    ? anchor.getBoundingClientRect()
                    : e.currentTarget.getBoundingClientRect();
                onSelect(rect);
            }}
            className={cn(
                'pet-avatar group flex flex-col items-center transition-transform touch-manipulation',
                'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss/40',
                cn(
                    'gap-2 min-w-[88px] p-2 sm:p-3 rounded-2xl active:scale-95',
                    selected
                        ? 'bg-white/70 ring-2 ring-moss/40 shadow-sm'
                        : 'hover:bg-white/50 active:bg-white/60',
                ),
                companion.isPlaceholder && 'opacity-70',
            )}
            aria-label={`${companion.displayName}，${subtitle}`}
        >
            <div
                data-pet-anchor
                className="relative"
                style={{ transform: `scale(${displayScale})`, transformOrigin: 'center bottom' }}
            >
                <div className={cn('pet-breathe', companion.mood === 'sleepy' && 'pet-sleepy')}>
                    <CompanionSilhouette
                        companion={companion}
                        size="default"
                    />
                </div>
            </div>
            {!isCourtyard && (
                <div className="text-center max-w-[96px] truncate w-full">
                    <p className="text-xs sm:text-sm font-medium text-slate-800 truncate w-full">
                        {companion.displayName}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-clay truncate w-full">{subtitle}</p>
                </div>
            )}
        </button>
    );
}
