import { cn } from '../../utils/cn';
import type { CompanionAvatarViewModel } from '../../types/petDashboard';
import type { CourtyardRestSpot } from '../../utils/courtyardRestSpots';
import { CourtyardSpotMarker } from './CourtyardSpotMarker';
import { PetAvatar } from './PetAvatar';

interface CourtyardPetAtSpotProps {
    spot: CourtyardRestSpot;
    companion: CompanionAvatarViewModel;
    onSelect?: (anchorRect: DOMRect) => void;
    /** 顯示休息點 id（編輯器或 dev 除錯） */
    showSpotLabel?: boolean;
    onPointerDown?: (event: React.PointerEvent) => void;
    isSelected?: boolean;
}

/**
 * 單一休息點上的動物。編輯器與正式庭院必須共用此元件，確保 DOM 一致。
 */
export function CourtyardPetAtSpot({
    spot,
    companion,
    onSelect,
    showSpotLabel = false,
    onPointerDown,
    isSelected = false,
}: CourtyardPetAtSpotProps) {
    return (
        <CourtyardSpotMarker spot={spot}>
            <div
                onPointerDown={onPointerDown}
                className={cn(
                    'relative leading-none',
                    onPointerDown && 'cursor-grab active:cursor-grabbing touch-none',
                    isSelected && 'outline outline-1 outline-amber-400 rounded-sm',
                )}
            >
                <PetAvatar
                    companion={companion}
                    variant="courtyard"
                    courtyardSpotScale={spot.scale}
                    onSelect={onSelect ?? (() => {})}
                />
                {showSpotLabel && (
                    <p className="absolute left-1/2 top-full z-10 -translate-x-1/2 mt-0.5 whitespace-nowrap rounded px-1.5 py-0.5 text-center text-[9px] font-bold leading-tight text-amber-950 bg-amber-400/95 shadow-md pointer-events-none">
                        {spot.id}
                        <span className="font-medium text-amber-950/75"> · {spot.scale}</span>
                    </p>
                )}
            </div>
        </CourtyardSpotMarker>
    );
}
