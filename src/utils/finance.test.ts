import { describe, expect, it } from 'vitest';
import type { StockHolding } from '../types';
import { getActivePurchases, recalcHolding } from './finance';

const makeHolding = (purchases: StockHolding['purchases']): StockHolding => ({
    id: 'h1',
    type: 'TAIWAN_STOCK',
    name: '2330',
    purchases,
    shares: 0,
    avgPrice: 0,
    totalAmount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('finance', () => {
    it('getActivePurchases excludes soft-deleted records', () => {
        const purchases = [
            {
                id: 'p1',
                date: '2026-01-01',
                shares: 10,
                pricePerShare: 100,
                totalCost: 1000,
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
                id: 'p2',
                date: '2026-01-02',
                shares: 5,
                pricePerShare: 110,
                totalCost: 550,
                updatedAt: '2026-01-02T00:00:00.000Z',
                deletedAt: '2026-01-03T00:00:00.000Z',
            },
        ];
        expect(getActivePurchases(purchases)).toHaveLength(1);
        expect(getActivePurchases(purchases)[0].id).toBe('p1');
    });

    it('recalcHolding ignores soft-deleted purchases', () => {
        const holding = makeHolding([
            {
                id: 'p1',
                date: '2026-01-01',
                shares: 10,
                pricePerShare: 100,
                totalCost: 1000,
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
                id: 'p2',
                date: '2026-01-02',
                shares: 999,
                pricePerShare: 1,
                totalCost: 999,
                updatedAt: '2026-01-02T00:00:00.000Z',
                deletedAt: '2026-01-03T00:00:00.000Z',
            },
        ]);

        const recalculated = recalcHolding(holding);
        expect(recalculated.shares).toBe(10);
        expect(recalculated.totalAmount).toBe(1000);
    });
});
