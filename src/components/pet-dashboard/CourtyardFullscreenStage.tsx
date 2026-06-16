import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import type { ViewportSize } from '../../utils/speechBubblePosition';

interface CourtyardFullscreenStageProps {
    children: ReactNode;
    onExit: () => void;
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

export function CourtyardFullscreenStage({ children, onExit }: CourtyardFullscreenStageProps) {
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

    const scale = useMemo(
        () => Math.min(viewport.width / BASE_WIDTH, viewport.height / BASE_HEIGHT),
        [viewport.height, viewport.width],
    );

    if (typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-sm">
            <button
                type="button"
                onClick={onExit}
                className="fixed right-3 top-3 z-[80] rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-black/55 transition-colors"
            >
                離開全螢幕
            </button>

            <div className="relative flex h-full w-full items-center justify-center overflow-visible">
                <div
                    className="relative overflow-visible"
                    style={{
                        width: `${BASE_WIDTH}px`,
                        height: `${BASE_HEIGHT}px`,
                        transform: `scale(${scale})`,
                        transformOrigin: 'center center',
                    }}
                >
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}
