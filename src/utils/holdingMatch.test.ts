import { describe, expect, it } from 'vitest';
import type { StockHolding } from '../types';
import { findMatchingHoldingIndex } from './holdingMatch';

const baseHolding = (overrides: Partial<StockHolding>): StockHolding => ({
    id: 'h1',
    type: 'TAIWAN_STOCK',
    name: '群益台灣精選高息 (00919)',
    symbol: '00919',
    purchases: [],
    shares: 0,
    avgPrice: 0,
    totalAmount: 0,
    poolId: 'pool-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

describe('findMatchingHoldingIndex', () => {
    it('matches Taiwan stock by symbol even when display name differs', () => {
        const holdings = [baseHolding({})];
        const index = findMatchingHoldingIndex(holdings, {
            type: 'TAIWAN_STOCK',
            name: '群益台灣精選高息 (00919) (00919)',
            symbol: '00919',
            poolId: 'pool-1',
        });
        expect(index).toBe(0);
    });

    it('falls back to name when symbol is missing', () => {
        const holdings = [baseHolding({ symbol: undefined })];
        const index = findMatchingHoldingIndex(holdings, {
            type: 'TAIWAN_STOCK',
            name: '群益台灣精選高息 (00919)',
            poolId: 'pool-1',
        });
        expect(index).toBe(0);
    });

    it('does not match holdings in a different pool', () => {
        const holdings = [baseHolding({ poolId: 'pool-1' })];
        const index = findMatchingHoldingIndex(holdings, {
            type: 'TAIWAN_STOCK',
            name: '群益台灣精選高息 (00919)',
            symbol: '00919',
            poolId: 'pool-2',
        });
        expect(index).toBe(-1);
    });

    it('normalizes Taiwan .TW suffix on symbol', () => {
        const holdings = [baseHolding({ symbol: '00919.TW' })];
        const index = findMatchingHoldingIndex(holdings, {
            type: 'TAIWAN_STOCK',
            name: 'test',
            symbol: '00919',
            poolId: 'pool-1',
        });
        expect(index).toBe(0);
    });
});
