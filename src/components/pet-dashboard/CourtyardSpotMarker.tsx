import type { ReactNode } from 'react';
import type { CourtyardRestSpot } from '../../utils/courtyardRestSpots';
import { cn } from '../../utils/cn';

interface CourtyardSpotMarkerProps {
    spot: CourtyardRestSpot;
    children: ReactNode;
    className?: string;
}

/**
 * 庭院休息點定位：在 (x%, y%) 放一個零高度錨點，動物從該點往上長。
 * 腳底永遠落在座標上，不受 button / label 等外層高度影響。
 */
export function CourtyardSpotMarker({ spot, children, className }: CourtyardSpotMarkerProps) {
    return (
        <div
            className={cn('absolute', className)}
            style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                width: 0,
                height: 0,
                zIndex: Math.round(spot.y),
            }}
        >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 leading-none">
                {children}
            </div>
        </div>
    );
}
