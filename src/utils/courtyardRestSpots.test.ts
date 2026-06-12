import { describe, expect, it } from 'vitest';
import {
    assignCourtyardRestSpots,
    assignCourtyardRestSpotsRandom,
    COURTYARD_REST_SPOTS,
} from './courtyardRestSpots';

describe('assignCourtyardRestSpots', () => {
    it('assigns unique spots when companion count <= spot count', () => {
        const ids = ['pool-a', 'pool-b', 'pool-c', 'pool-d'];
        const map = assignCourtyardRestSpots(ids);
        const spotIds = [...map.values()].map((s) => s.id);
        expect(map.size).toBe(4);
        expect(new Set(spotIds).size).toBe(4);
    });

    it('is stable for the same companion id', () => {
        const first = assignCourtyardRestSpots(['pool-tw-1']).get('pool-tw-1')?.id;
        const second = assignCourtyardRestSpots(['pool-tw-1']).get('pool-tw-1')?.id;
        expect(first).toBe(second);
    });

    it('falls back when more companions than spots', () => {
        const ids = Array.from({ length: COURTYARD_REST_SPOTS.length + 2 }, (_, i) => `pool-${i}`);
        const map = assignCourtyardRestSpots(ids);
        expect(map.size).toBe(ids.length);
    });
});

describe('COURTYARD_REST_SPOTS', () => {
    it('only deck-cushion uses maximum scale', () => {
        const maxSpots = COURTYARD_REST_SPOTS.filter((spot) => spot.scale >= 1);
        expect(maxSpots).toHaveLength(1);
        expect(maxSpots[0]?.id).toBe('deck-cushion');
    });
});

describe('assignCourtyardRestSpotsRandom', () => {
    it('assigns unique spots for four companions with fixed seed', () => {
        const map = assignCourtyardRestSpotsRandom(['a', 'b', 'c', 'd'], 0.42);
        const spotIds = [...map.values()].map((s) => s.id);
        expect(new Set(spotIds).size).toBe(4);
    });

    it('changes layout when seed changes', () => {
        const ids = ['a', 'b', 'c', 'd'];
        const first = [...assignCourtyardRestSpotsRandom(ids, 0.1).values()].map((s) => s.id);
        const second = [...assignCourtyardRestSpotsRandom(ids, 0.9).values()].map((s) => s.id);
        expect(first).not.toEqual(second);
    });
});
