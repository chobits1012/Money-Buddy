import type { ReactNode, RefObject } from 'react';
import { COURTYARD_BACKGROUND } from '../../utils/courtyardAssets';
import { cn } from '../../utils/cn';

interface CourtyardSceneCanvasProps {
    children: ReactNode;
    /** 編輯器拖曳時用來換算 % 座標，必須指向此 16:9 容器 */
    fieldRef?: RefObject<HTMLDivElement | null>;
    className?: string;
    onFieldPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

/**
 * 庭院 16:9 場景容器。編輯器與正式顯示必須共用，確保 % 座標與 scale 構圖一致。
 */
export function CourtyardSceneCanvas({
    children,
    fieldRef,
    className,
    onFieldPointerDown,
}: CourtyardSceneCanvasProps) {
    return (
        <div
            ref={fieldRef}
            className={cn(
                'relative aspect-[16/9] w-full bg-moss/5 overflow-visible',
                className,
            )}
            onPointerDown={onFieldPointerDown}
        >
            <img
                src={COURTYARD_BACKGROUND}
                alt=""
                className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
                aria-hidden
                draggable={false}
            />
            <div className="absolute inset-0 overflow-visible">{children}</div>
        </div>
    );
}
