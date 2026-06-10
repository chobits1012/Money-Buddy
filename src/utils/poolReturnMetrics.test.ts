import { describe, expect, it } from 'vitest';
import {
    calcHoldingReturn,
    calcReturnRatePercent,
    summarizeMarketPoolReturns,
    summarizePoolReturn,
} from './poolReturnMetrics';
import type { AssetPool, StockHolding } from '../types';

const makeHolding = (overrides: Partial<StockHolding>): StockHolding => ({
    id: 'h-1',
    type: 'TAIWAN_STOCK',
    name: 'test',
    purchases: [],
    shares: 100,
    avgPrice: 100,
    totalAmount: 10_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

const makePool = (overrides: Partial<AssetPool>): AssetPool => ({
    id: 'p-1',
    name: 'A池',
    allocatedBudget: 300_000,
    currentCash: 50_000,
    type: 'TAIWAN_STOCK',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

describe('poolReturnMetrics', () => {
    it('calcHoldingReturn uses USD basis for US stocks', () => {
        const holding = makeHolding({
            type: 'US_STOCK',
            totalAmount: 31_000,
            totalAmountUSD: 1_000,
            unrealizedPnL: 100,
            realizedPnL: 50,
        });

        const result = calcHoldingReturn(holding);
        expect(result.costBasis).toBe(1_000);
        expect(result.totalPnL).toBe(150);
        expect(result.returnRatePercent).toBe(15);
        expect(result.currency).toBe('USD');
    });

    it('summarizePoolReturn aggregates holdings in one pool', () => {
        const holdings = [
            makeHolding({ id: 'h1', poolId: 'p-a', totalAmount: 100_000, unrealizedPnL: 10_000, realizedPnL: 0 }),
            makeHolding({ id: 'h2', poolId: 'p-a', totalAmount: 50_000, unrealizedPnL: -2_500, realizedPnL: 500 }),
        ];

        const metrics = summarizePoolReturn(holdings, 'p-a', 'A池', 'TAIWAN_STOCK');
        expect(metrics.costBasis).toBe(150_000);
        expect(metrics.totalPnL).toBe(8_000);
        expect(metrics.returnRatePercent).toBeCloseTo(5.33, 2);
        expect(metrics.holdingCount).toBe(2);
    });

    it('aggregate return is weighted by cost, not average of rates', () => {
        const holdings = [
            makeHolding({ id: 'h1', poolId: 'p-a', totalAmount: 300_000, unrealizedPnL: 30_000 }),
            makeHolding({ id: 'h2', poolId: 'p-b', totalAmount: 100_000, unrealizedPnL: -5_000 }),
        ];
        const pools = [
            makePool({ id: 'p-a', name: 'A池' }),
            makePool({ id: 'p-b', name: 'B池', allocatedBudget: 100_000 }),
        ];

        const view = summarizeMarketPoolReturns(holdings, pools, 'TAIWAN_STOCK');
        expect(view.byPool[0].returnRatePercent).toBe(10);
        expect(view.byPool[1].returnRatePercent).toBe(-5);
        expect(view.aggregate.costBasis).toBe(400_000);
        expect(view.aggregate.totalPnL).toBe(25_000);
        expect(view.aggregate.returnRatePercent).toBe(6.25);
    });

    it('returns null rate when pool has no holdings', () => {
        const metrics = summarizePoolReturn([], 'p-a', 'A池', 'TAIWAN_STOCK');
        expect(metrics.returnRatePercent).toBeNull();
        expect(metrics.holdingCount).toBe(0);
    });

    it('keeps unassigned holdings separate from aggregate', () => {
        const holdings = [
            makeHolding({ id: 'h1', poolId: 'p-a', totalAmount: 100_000, unrealizedPnL: 5_000 }),
            makeHolding({ id: 'h2', totalAmount: 20_000, unrealizedPnL: 1_000 }),
        ];
        const pools = [makePool({ id: 'p-a' })];

        const view = summarizeMarketPoolReturns(holdings, pools, 'TAIWAN_STOCK');
        expect(view.aggregate.costBasis).toBe(100_000);
        expect(view.unassigned.costBasis).toBe(20_000);
        expect(view.unassigned.returnRatePercent).toBe(5);
    });

    it('calcReturnRatePercent matches holding-level formula', () => {
        expect(calcReturnRatePercent(1_500, 10_000)).toBe(15);
    });
});
