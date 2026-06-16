import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import type { ViewportSize } from '../../utils/speechBubblePosition';
import { getLandscapeShellLayoutViewport } from '../../utils/mapScreenToLandscapeShell';

export interface LandscapeShellLayout {
    forceLandscapeVisual: boolean;
    layoutViewport: ViewportSize;
}

interface CourtyardFullscreenStageProps {
    children: ReactNode;
    onExit: () => void;
    onShellElement?: (element: HTMLElement | null) => void;
    onShellLayout?: (layout: LandscapeShellLayout | null) => void;
}

function readViewport(): ViewportSize {
    if (typeof window === 'undefined') {
        return { width: 360, height: 202 };
    }

    const vv = window.visualViewport;
    return {
        width: Math.max(1, Math.floor(vv?.width ?? window.innerWidth)),
        height: Math.max(1, Math.floor(vv?.height ?? window.innerHeight)),
    };
}

const BASE_WIDTH = 360;
const BASE_HEIGHT = (BASE_WIDTH * 9) / 16;

export function CourtyardFullscreenStage({
    children,
    onExit,
    onShellElement,
    onShellLayout,
}: CourtyardFullscreenStageProps) {
    const shellRef = useRef<HTMLDivElement>(null);
    const [viewport, setViewport] = useState<ViewportSize>(() => readViewport());

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
        const layoutViewport = getLandscapeShellLayoutViewport(viewport);
        const scale = Math.min(
            layoutViewport.width / BASE_WIDTH,
            layoutViewport.height / BASE_HEIGHT,
        );

        return {
            forceLandscapeVisual,
            layoutViewport,
            shellWidth: layoutViewport.width,
            shellHeight: layoutViewport.height,
            scale,
        };
    }, [viewport.height, viewport.width]);

    useEffect(() => {
        onShellElement?.(shellRef.current);
        return () => {
            onShellElement?.(null);
        };
    }, [onShellElement]);

    useEffect(() => {
        onShellLayout?.({
            forceLandscapeVisual: stageLayout.forceLandscapeVisual,
            layoutViewport: stageLayout.layoutViewport,
        });
        return () => {
            onShellLayout?.(null);
        };
    }, [onShellLayout, stageLayout.forceLandscapeVisual, stageLayout.layoutViewport]);

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-sm">
            <div
                ref={shellRef}
                className="absolute left-1/2 top-1/2 overflow-visible"
                style={{
                    width: `${stageLayout.shellWidth}px`,
                    height: `${stageLayout.shellHeight}px`,
                    transform: stageLayout.forceLandscapeVisual
                        ? 'translate(-50%, -50%) rotate(90deg)'
                        : 'translate(-50%, -50%)',
                }}
            >
                <button
                    type="button"
                    onClick={onExit}
                    className="absolute right-3 top-3 z-[80] rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-black/55 transition-colors"
                >
                    離開全螢幕
                </button>

                <div className="relative h-full w-full overflow-visible">
                    <div
                        className="absolute left-1/2 top-1/2"
                        style={{
                            width: `${BASE_WIDTH}px`,
                            height: `${BASE_HEIGHT}px`,
                            transform: `translate(-50%, -50%) scale(${stageLayout.scale})`,
                            transformOrigin: 'center center',
                        }}
                    >
                        <div className="h-full w-full">{children}</div>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
