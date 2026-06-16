import { useEffect, useState } from 'react';

const STORAGE_KEY = 'portfolio-tracker-courtyard-fullscreen';

function readStoredPreference(): boolean {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) return false;
    return stored !== 'off';
}

export function useCourtyardFullscreenPreference() {
    const [isFullscreen, setIsFullscreen] = useState<boolean>(() => readStoredPreference());

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEY, isFullscreen ? 'on' : 'off');
    }, [isFullscreen]);

    return {
        isFullscreen,
        openFullscreen: () => setIsFullscreen(true),
        closeFullscreen: () => setIsFullscreen(false),
        toggleFullscreen: () => setIsFullscreen((prev) => !prev),
    };
}
