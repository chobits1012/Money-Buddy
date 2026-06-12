import { useCallback, useState } from 'react';

export type HomeViewMode = 'classic' | 'pet';

const STORAGE_KEY = 'portfolio-tracker-home-view';

function readStoredMode(): HomeViewMode {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'pet' || stored === 'classic') return stored;
    } catch {
        // localStorage unavailable
    }
    return 'classic';
}

export function useHomeViewMode() {
    const [viewMode, setViewModeState] = useState<HomeViewMode>(readStoredMode);

    const setViewMode = useCallback((mode: HomeViewMode) => {
        setViewModeState(mode);
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch {
            // ignore
        }
    }, []);

    return [viewMode, setViewMode] as const;
}
