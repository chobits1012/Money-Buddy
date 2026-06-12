import { useCallback, useRef, useState } from 'react';
import { PetAvatar } from './PetAvatar';
import { COURTYARD_BACKGROUND } from '../../utils/courtyardAssets';
import {
    buildCourtyardSpotDebugEntries,
    cloneCourtyardRestSpots,
    copyCourtyardSpotsToClipboard,
    type CourtyardSpotDebugEntry,
} from '../../utils/courtyardSpotDebug';
import type { CourtyardRestSpot } from '../../utils/courtyardRestSpots';
import { cn } from '../../utils/cn';

const SCALE_STEP = 0.02;
const MIN_SCALE = 0.4;
const MAX_SCALE = 1.0;
const DRAG_THRESHOLD_PX = 4;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function pointerToPercent(
    clientX: number,
    clientY: number,
    rect: DOMRect,
): { x: number; y: number } {
    return {
        x: clamp(((clientX - rect.left) / rect.width) * 100, 2, 98),
        y: clamp(((clientY - rect.top) / rect.height) * 100, 8, 99),
    };
}

export function PetCourtyardSpotEditor() {
    const fieldRef = useRef<HTMLDivElement>(null);
    const dragSpotIdRef = useRef<string | null>(null);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);
    const [spots, setSpots] = useState<CourtyardRestSpot[]>(() => cloneCourtyardRestSpots());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

    const entries: CourtyardSpotDebugEntry[] = buildCourtyardSpotDebugEntries(spots);
    const selectedSpot = spots.find((spot) => spot.id === selectedId);

    const updateSpot = useCallback((spotId: string, patch: Partial<CourtyardRestSpot>) => {
        setSpots((prev) =>
            prev.map((spot) => (spot.id === spotId ? { ...spot, ...patch } : spot)),
        );
    }, []);

    const handlePointerMove = useCallback((event: PointerEvent) => {
        const spotId = dragSpotIdRef.current;
        const field = fieldRef.current;
        const dragStart = dragStartRef.current;
        if (!spotId || !field || !dragStart) return;

        const moved =
            Math.abs(event.clientX - dragStart.x) > DRAG_THRESHOLD_PX
            || Math.abs(event.clientY - dragStart.y) > DRAG_THRESHOLD_PX;
        if (!moved) return;

        const { x, y } = pointerToPercent(event.clientX, event.clientY, field.getBoundingClientRect());
        updateSpot(spotId, { x, y });
    }, [updateSpot]);

    const endDrag = useCallback(() => {
        dragSpotIdRef.current = null;
        dragStartRef.current = null;
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
    }, [handlePointerMove]);

    const startDrag = useCallback((spotId: string, event: React.PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedId(spotId);
        dragSpotIdRef.current = spotId;
        dragStartRef.current = { x: event.clientX, y: event.clientY };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);
    }, [endDrag, handlePointerMove]);

    const roundScaleClamp = (value: number) =>
        Math.round(clamp(value, MIN_SCALE, MAX_SCALE) * 100) / 100;

    const adjustScale = (spotId: string, delta: number) => {
        const spot = spots.find((s) => s.id === spotId);
        if (!spot) return;
        updateSpot(spotId, { scale: roundScaleClamp(spot.scale + delta) });
    };

    const handleCopy = async () => {
        try {
            await copyCourtyardSpotsToClipboard(spots);
            setCopyState('copied');
            window.setTimeout(() => setCopyState('idle'), 2000);
        } catch {
            setCopyState('error');
            window.setTimeout(() => setCopyState('idle'), 2000);
        }
    };

    return (
        <section className="pet-courtyard overflow-hidden rounded-2xl border-2 border-amber-500/50 shadow-sm">
            <div className="border-b border-amber-200/70 bg-amber-50/95 px-3 py-2.5 space-y-2">
                <p className="text-center text-[10px] text-amber-950/85 leading-relaxed">
                    <strong>休息點編輯模式</strong> · 在圖上拖曳移動 · 點一下選取
                    <br />
                    調完按「複製座標」貼給我 · 移除 <code className="text-amber-800">?pet-spots=1</code> 回到正常
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setSpots(cloneCourtyardRestSpots())}
                        className="rounded-lg border border-stoneSoft/60 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm"
                    >
                        重設
                    </button>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm"
                    >
                        {copyState === 'copied' ? '已複製！' : copyState === 'error' ? '複製失敗' : '複製座標'}
                    </button>
                </div>
                <div className="rounded-xl border border-amber-300/80 bg-white px-3 py-2.5 shadow-sm">
                    {selectedSpot ? (
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 text-[11px] text-slate-800">
                                <p className="font-medium truncate">選取：{selectedSpot.label}</p>
                                <p className="text-clay truncate">
                                    {selectedSpot.id} · x {selectedSpot.x} y {selectedSpot.y} · scale {selectedSpot.scale}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    aria-label="縮小"
                                    onClick={() => adjustScale(selectedSpot.id, -SCALE_STEP)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stoneSoft/70 bg-stone-50 text-lg font-bold text-slate-800 active:bg-stone-100"
                                >
                                    −
                                </button>
                                <button
                                    type="button"
                                    aria-label="放大"
                                    onClick={() => adjustScale(selectedSpot.id, SCALE_STEP)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stoneSoft/70 bg-stone-50 text-lg font-bold text-slate-800 active:bg-stone-100"
                                >
                                    ＋
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-[11px] text-clay">
                            點選圖中的哈士奇後，在此用 − / ＋ 調整大小
                        </p>
                    )}
                </div>
            </div>

            <div
                ref={fieldRef}
                className="relative aspect-[16/9] w-full bg-moss/5 touch-none"
                onPointerDown={() => setSelectedId(null)}
            >
                <img
                    src={COURTYARD_BACKGROUND}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                    aria-hidden
                    draggable={false}
                />
                <div className="absolute inset-0">
                    {entries.map(({ spot, companion }) => {
                        const isSelected = selectedId === spot.id;
                        return (
                            <div
                                key={spot.id}
                                className="absolute"
                                style={{
                                    left: `${spot.x}%`,
                                    top: `${spot.y}%`,
                                    transform: 'translate(-50%, -100%)',
                                    zIndex: Math.round(spot.y),
                                }}
                            >
                                {/* 僅動物參與定位高度；標籤 absolute 不撐高、避免點選位移 */}
                                <div
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        startDrag(spot.id, e);
                                    }}
                                    className={cn(
                                        'relative inline-flex cursor-grab active:cursor-grabbing',
                                        isSelected && 'outline outline-1 outline-amber-400 rounded-sm',
                                    )}
                                >
                                    <div className="pointer-events-none">
                                        <PetAvatar
                                            companion={companion}
                                            variant="courtyard"
                                            courtyardSpotScale={spot.scale}
                                            onSelect={() => {}}
                                        />
                                    </div>
                                    <p className="absolute left-1/2 top-full -translate-x-1/2 mt-0.5 text-center text-[8px] font-medium leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] whitespace-nowrap pointer-events-none">
                                        {spot.id}
                                        <span className="text-white/80"> · {spot.scale}</span>
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <p className="text-[10px] text-amber-900/80 text-center py-2 bg-amber-50/80 border-t border-amber-200/50">
                在圖上拖曳調位置 · 大小請用圖上方的 − / ＋
            </p>
        </section>
    );
}
