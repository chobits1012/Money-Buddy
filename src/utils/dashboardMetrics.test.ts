import { describe, expect, it } from 'vitest';
import {
    calculateAllocationMetrics,
    calculateFundingMetrics,
    selectPoolBuckets,
} from './dashboardMetrics';
import type { AssetPool, CustomCategory, StockHolding } from '../types';

const makeHolding = (overrides: Partial<StockHolding>): StockHolding => ({
    id: 'h-1',
    type: 'TAIWAN_STOCK',
    name: 'test',
    purchases: [],
    shares: 0,
    avgPrice: 0,
    totalAmount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

const emptyCustom: CustomCategory[] = [];

describe('dashboardMetrics', () => {
    it('computes funding progress by master and idle capital', () => {
        const holdings: StockHolding[] = [makeHolding({ totalAmount: 200 })];
        const custom: CustomCategory[] = [{
            id: 'c-1',
            name: 'buffer',
            amount: 100,
            note: '',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        }];

        const metrics = calculateFundingMetrics({
            masterTwdTotal: 1000,
            capitalDeposits: [],
            capitalWithdrawals: [],
            totalCapitalPool: 1000,
            pools: [],
            usdAccountCash: 0,
            usStockFundPool: 0,
            exchangeRateUSD: 31,
            holdings,
            customCategories: custom,
        });

        expect(metrics.idleCapital).toBe(700);
        expect(metrics.allocatedCapital).toBe(300);
        expect(metrics.allocatedPercentage).toBeCloseTo(30, 4);
    });

    it('builds allocation buckets with USD account in TWD', () => {
        const pools: AssetPool[] = [
            {
                id: 'p-tw',
                name: '台股池',
                allocatedBudget: 200,
                currentCash: 180,
                type: 'TAIWAN_STOCK',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
                id: 'p-us',
                name: '美股池',
                allocatedBudget: 100,
                currentCash: 80,
                type: 'US_STOCK',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ];

        const metrics = calculateAllocationMetrics({
            masterTwdTotal: 3000,
            capitalDeposits: [],
            capitalWithdrawals: [],
            totalCapitalPool: 1200,
            usdAccountCash: 100,
            usStockFundPool: 0,
            exchangeRateUSD: 30,
            holdings: [],
            pools,
            customCategories: emptyCustom,
        });

        expect(metrics.assetTotals.TAIWAN_STOCK).toBe(200);
        expect(metrics.assetTotals.US_STOCK).toBe(3000);
    });

    it('splits pools by currency view', () => {
        const pools: AssetPool[] = [
            {
                id: 'p1',
                name: '台股',
                allocatedBudget: 10,
                currentCash: 10,
                type: 'TAIWAN_STOCK',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
                id: 'p2',
                name: '美股',
                allocatedBudget: 5,
                currentCash: 5,
                type: 'US_STOCK',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ];

        const buckets = selectPoolBuckets(pools);
        expect(buckets.twdPools).toHaveLength(1);
        expect(buckets.usdPools).toHaveLength(1);
        expect(buckets.twdAllocatedTotal).toBe(10);
        expect(buckets.usdAllocatedTotal).toBe(5);
    });
});
