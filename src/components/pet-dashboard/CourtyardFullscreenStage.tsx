import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CourtyardFullscreenOverlayContext } from './CourtyardFullscreenOverlayContext';

interface CourtyardFullscreenStageProps {
    children: ReactNode;
    onExit: () => void;
}

interface ViewportSize {
    width: number;
    height: number;
}

const BASE_WIDTH = 360;
const BASE_HEIGHT = (BASE_WIDTH * 9) / 16;

function readViewport(): ViewportSize {
    if (typeof window === 'undefined') {
        return { width: BASE_WIDTH, height: BASE_HEIGHT };
    }

    const vv = window.visualViewport;
    return {
        width: Math.max(1, Math.floor(vv?.width ?? window.innerWidth)),
        height: Math.max(1, Math.floor(vv?.height ?? window.innerHeight)),
    };
}

export function CourtyardFullscreenStage({ children, onExit }: CourtyardFullscreenStageProps) {
    const [viewport, setViewport] = useState<ViewportSize>(() => readViewport());
    const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setViewport(readViewport());
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        window.visualViewport?.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            window.visualViewport?.removeEventListener('resize', handleResize);
        };
    }, []);

    const stageLayout = useMemo(() => {
        const isPortraitViewport = viewport.height > viewport.width;
        const forceLandscapeVisual = isPortraitViewport;
        const visualWidth = forceLandscapeVisual ? viewport.height : viewport.width;
        const visualHeight = forceLandscapeVisual ? viewport.width : viewport.height;
        const scale = Math.min(visualWidth / BASE_WIDTH, visualHeight / BASE_HEIGHT);
        return {
            forceLandscapeVisual,
            scale,
        };
    }, [viewport.height, viewport.width]);

    return (
        <CourtyardFullscreenOverlayContext.Provider value={overlayEl}>
            <div className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-sm">
                <div className="relative h-full w-full overflow-hidden">
                    <div
                        className="absolute left-1/2 top-1/2"
                        style={{
                            width: `${BASE_WIDTH}px`,
                            height: `${BASE_HEIGHT}px`,
                            transform: stageLayout.forceLandscapeVisual
                                ? `translate(-50%, -50%) rotate(90deg) scale(${stageLayout.scale})`
                                : `translate(-50%, -50%) scale(${stageLayout.scale})`,
                            transformOrigin: 'center center',
                        }}
                    >
                        <div className="h-full w-full">{children}</div>
                    </div>
                </div>

                {/* 未旋轉的 overlay：對話泡泡 portal 到此，文字維持橫向可讀 */}
                <div
                    ref={setOverlayEl}
                    className="pointer-events-none absolute inset-0 z-[55]"
                />

                <button
                    type="button"
                    onClick={onExit}
                    className="absolute right-3 top-3 z-[60] rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-black/55 transition-colors"
                >
                    離開全螢幕
                </button>
            </div>
        </CourtyardFullscreenOverlayContext.Provider>
    );
}
