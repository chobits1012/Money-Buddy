import { useCallback, useEffect, useRef, useState } from 'react';
import { CourtyardPetAtSpot } from './CourtyardPetAtSpot';
import { CourtyardSceneCanvas } from './CourtyardSceneCanvas';
import {
    buildCourtyardSpotDebugEntries,
    cloneCourtyardRestSpots,
    copyCourtyardSpotsToClipboard,
    type CourtyardSpotDebugEntry,
} from '../../utils/courtyardSpotDebug';
import {
    clampCourtyardSpotScale,
    COURTYARD_SPOT_SCALE_MAX,
    COURTYARD_SPOT_SCALE_MIN,
    COURTYARD_SPOT_SCALE_STEP,
    type CourtyardRestSpot,
} from '../../utils/courtyardRestSpots';
import { getCourtyardRestSpotsLayoutKey } from '../../utils/courtyardRestSpots';

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
    const spotsLayoutKey = getCourtyardRestSpotsLayoutKey();
    const isFirstLayoutSyncRef = useRef(true);

    useEffect(() => {
        if (isFirstLayoutSyncRef.current) {
            isFirstLayoutSyncRef.current = false;
            return;
        }
        if (dragSpotIdRef.current) return;
        setSpots(cloneCourtyardRestSpots());
    }, [spotsLayoutKey]);

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

    const roundScaleClamp = clampCourtyardSpotScale;

    const adjustScale = useCallback((spotId: string, delta: number) => {
        setSpots((prev) =>
            prev.map((spot) =>
                spot.id === spotId
                    ? { ...spot, scale: roundScaleClamp(spot.scale + delta) }
                    : spot,
            ),
        );
    }, []);

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
        <section className="pet-courtyard overflow-visible rounded-2xl border-2 border-amber-500/50 shadow-sm">
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
                <div
                    className="rounded-xl border border-amber-300/80 bg-white px-3 py-2.5 shadow-sm"
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    {selectedSpot ? (
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 text-[11px] text-slate-800">
                                <p className="font-medium truncate">選取：{selectedSpot.label}</p>
                                <p className="text-clay truncate">
                                    {selectedSpot.id} · x {selectedSpot.x} y {selectedSpot.y} · scale{' '}
                                    {selectedSpot.scale.toFixed(2)}
                                    <span className="text-amber-800/70">
                                        {' '}
                                        （{COURTYARD_SPOT_SCALE_MIN}–{COURTYARD_SPOT_SCALE_MAX}）
                                    </span>
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    aria-label="縮小"
                                    disabled={selectedSpot.scale <= COURTYARD_SPOT_SCALE_MIN + 0.001}
                                    onClick={() => adjustScale(selectedSpot.id, -COURTYARD_SPOT_SCALE_STEP)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stoneSoft/70 bg-stone-50 text-lg font-bold text-slate-800 active:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    −
                                </button>
                                <button
                                    type="button"
                                    aria-label="放大"
                                    disabled={selectedSpot.scale >= COURTYARD_SPOT_SCALE_MAX - 0.001}
                                    onClick={() => adjustScale(selectedSpot.id, COURTYARD_SPOT_SCALE_STEP)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stoneSoft/70 bg-stone-50 text-lg font-bold text-slate-800 active:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
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

            <CourtyardSceneCanvas
                fieldRef={fieldRef}
                className="touch-none"
                onFieldPointerDown={() => setSelectedId(null)}
            >
                {entries.map(({ spot, companion }) => (
                    <CourtyardPetAtSpot
                        key={`${spot.id}-${spot.scale}-${spotsLayoutKey}`}
                        spot={spot}
                        companion={companion}
                        showSpotLabel
                        isSelected={selectedId === spot.id}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            startDrag(spot.id, e);
                        }}
                    />
                ))}
            </CourtyardSceneCanvas>

            <p className="text-[10px] text-amber-900/80 text-center py-2 bg-amber-50/80 border-t border-amber-200/50">
                在圖上拖曳調位置 · 大小請用圖上方的 − / ＋
            </p>
        </section>
    );
}
