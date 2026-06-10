import { describe, expect, it } from 'vitest';
import { holdingTypeToSlug, parseHoldingMarketParam } from './holdingRoutes';

describe('holdingRoutes', () => {
    it('maps slugs and asset types both ways', () => {
        expect(holdingTypeToSlug('TAIWAN_STOCK')).toBe('taiwan');
        expect(holdingTypeToSlug('US_STOCK')).toBe('us');
        expect(holdingTypeToSlug('FUNDS')).toBe('funds');
        expect(parseHoldingMarketParam('taiwan')).toBe('TAIWAN_STOCK');
        expect(parseHoldingMarketParam('US')).toBe('US_STOCK');
    });

    it('returns null for unknown markets', () => {
        expect(parseHoldingMarketParam('crypto')).toBeNull();
        expect(holdingTypeToSlug('CRYPTO')).toBeNull();
    });
});
