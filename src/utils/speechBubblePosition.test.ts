import { describe, expect, it } from 'vitest';
import { computeSpeechBubbleLayout } from './speechBubblePosition';

describe('speechBubblePosition', () => {
    const viewport = { width: 390, height: 844 };
    const bubble = { width: 280, height: 180 };

    it('places bubble above anchor by default', () => {
        const layout = computeSpeechBubbleLayout(
            { top: 400, left: 150, width: 80, height: 80, bottom: 480 },
            bubble,
            viewport,
        );
        expect(layout.placement).toBe('above');
        expect(layout.top).toBeLessThan(400);
    });

    it('flips below when not enough space above', () => {
        const layout = computeSpeechBubbleLayout(
            { top: 20, left: 150, width: 80, height: 80, bottom: 100 },
            bubble,
            viewport,
        );
        expect(layout.placement).toBe('below');
        expect(layout.top).toBeGreaterThan(100);
    });

    it('clamps horizontal position inside viewport', () => {
        const layout = computeSpeechBubbleLayout(
            { top: 300, left: 5, width: 60, height: 60, bottom: 360 },
            bubble,
            viewport,
        );
        expect(layout.left).toBeGreaterThanOrEqual(12);
        expect(layout.left + layout.width).toBeLessThanOrEqual(viewport.width - 12);
    });

    it('uses left placement near right edge', () => {
        const layout = computeSpeechBubbleLayout(
            { top: 340, left: 340, width: 40, height: 40, bottom: 380 },
            bubble,
            viewport,
        );
        expect(layout.placement).toBe('left');
    });

    it('uses right placement near left edge when vertical space is tight', () => {
        const layout = computeSpeechBubbleLayout(
            { top: 400, left: 5, width: 20, height: 20, bottom: 420 },
            { width: 260, height: 500 },
            viewport,
        );
        expect(layout.placement).toBe('right');
    });
});
