import { describe, expect, it } from 'vitest';
import {
    getLandscapeShellLayoutViewport,
    mapScreenPointToLandscapeShell,
    mapScreenRectToLandscapeShell,
} from './mapScreenToLandscapeShell';

describe('mapScreenToLandscapeShell', () => {
    const portraitViewport = { width: 390, height: 844 };

    it('maps screen top-left to shell top-right', () => {
        const point = mapScreenPointToLandscapeShell(0, 0, portraitViewport);
        expect(point).toEqual({ x: 844, y: 0 });
    });

    it('maps screen bottom-right to shell bottom-left', () => {
        const point = mapScreenPointToLandscapeShell(390, 844, portraitViewport);
        expect(point).toEqual({ x: 0, y: 390 });
    });

    it('maps screen rect into landscape shell bounds', () => {
        const mapped = mapScreenRectToLandscapeShell(
            { top: 100, left: 50, width: 40, height: 40, bottom: 140 },
            portraitViewport,
        );

        expect(mapped.left).toBeGreaterThanOrEqual(0);
        expect(mapped.top).toBeGreaterThanOrEqual(0);
        expect(mapped.left + mapped.width).toBeLessThanOrEqual(portraitViewport.height);
        expect(mapped.top + mapped.height).toBeLessThanOrEqual(portraitViewport.width);
    });

    it('swaps viewport dimensions on portrait phones', () => {
        expect(getLandscapeShellLayoutViewport(portraitViewport)).toEqual({
            width: 844,
            height: 390,
        });
    });

    it('keeps landscape viewport unchanged on desktop', () => {
        const landscapeViewport = { width: 1200, height: 800 };
        expect(getLandscapeShellLayoutViewport(landscapeViewport)).toEqual(landscapeViewport);
    });
});
