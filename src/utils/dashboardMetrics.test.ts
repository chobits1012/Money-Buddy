import { describe, expect, it } from 'vitest';
import {
    buildDashboardAllocationView,
    calculateAllocationMetrics,
    calculateFundingMetrics,
    calculateGlobalIdleCapital,
    calculateUsdAllocatedTwdBasis,
    selectPoolBuckets,
    summarizePortfolioPnL,
} from './dashboardMetrics';
import type { AssetPool, CustomCategory, StockHolding, Transaction } from '../types';

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

const makeUsStockDeposit = (amountTwd: number, amountUSD: number, exchangeRate: number): Transaction => ({
    id: 'tx-us-deposit',
    type: 'US_STOCK',
    action: 'DEPOSIT',
    amount: amountTwd,
    amountUSD,
    exchangeRate,
    date: '2026-01-01T00:00:00.000Z',
    note: '',
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
            holdings,
            customCategories: custom,
            transactions: [],
        });

        expect(metrics.idleCapital).toBe(700);
        expect(metrics.allocatedCapital).toBe(300);
        expect(metrics.allocatedPercentage).toBeCloseTo(30, 4);
    });

    it('subtracts fixed USD deposit TWD basis from idle capital', () => {
        const usdDepositTwd = 493_807;
        const pools: AssetPool[] = [
            {
                id: 'p-tw',
                name: '台股池',
                allocatedBudget: 4_000_000,
                currentCash: 4_000_000,
                type: 'TAIWAN_STOCK',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ];

        const input = {
            masterTwdTotal: 5_678_660,
            capitalDeposits: [],
            capitalWithdrawals: [],
            totalCapitalPool: 1_184_853,
            pools,
            usdAccountCash: 15_676.41,
            usStockFundPool: 15_676.41,
            exchangeRateUSD: 31.5,
            holdings: [] as StockHolding[],
            customCategories: emptyCustom,
            transactions: [makeUsStockDeposit(usdDepositTwd, 15_676.41, 31.5)],
        };

        const metrics = calculateFundingMetrics(input);
        const view = buildDashboardAllocationView(input);

        expect(metrics.idleCapital).toBe(1_184_853);
        expect(metrics.allocatedCapital).toBe(4_493_807);
        expect(view.idleCapital).toBe(metrics.idleCapital);
        expect(view.masterCapitalTotal).toBe(metrics.masterCapitalTotal);

        const pieAssetSum =
            view.assetTotals.TAIWAN_STOCK +
            view.assetTotals.US_STOCK +
            view.assetTotals.FUNDS +
            view.assetTotals.CRYPTO +
            view.customCategories.reduce((s, c) => s + c.amount, 0);
        expect(pieAssetSum + view.idleCapital).toBe(5_678_660);
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

    it('idleCapital is stable when exchange rate changes', () => {
        const usdDepositTwd = 496_002;
        const pools: AssetPool[] = [
            {
                id: 'p-tw',
                name: '台股軍團',
                allocatedBudget: 4_000_000,
                currentCash: 4_000_000,
                type: 'TAIWAN_STOCK',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
                id: 'p-fund',
                name: '基金大軍',
                allocatedBudget: 453_000,
                currentCash: 453_000,
                type: 'FUNDS',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ];

        const baseInput = {
            masterTwdTotal: 5_678_660,
            capitalDeposits: [],
            capitalWithdrawals: [],
            totalCapitalPool: 729_658,
            pools,
            usdAccountCash: 15_746.095238,
            usStockFundPool: 15_746.095238,
            holdings: [] as StockHolding[],
            customCategories: emptyCustom,
            transactions: [makeUsStockDeposit(usdDepositTwd, 15_746.095238, 31.5)],
        };

        const atRate31 = buildDashboardAllocationView({ ...baseInput, exchangeRateUSD: 31.5 });
        const atRate35 = buildDashboardAllocationView({ ...baseInput, exchangeRateUSD: 35 });

        expect(atRate31.idleCapital).toBe(729_658);
        expect(atRate35.idleCapital).toBe(729_658);
        expect(atRate31.assetTotals.US_STOCK).not.toBe(atRate35.assetTotals.US_STOCK);
    });

    it('idleCapital equals globalFree when USD deposit reduced totalCapitalPool', () => {
        const usdDepositTwd = 496_002;
        const pools: AssetPool[] = [
            {
                id: 'p-tw',
                name: '台股軍團',
                allocatedBudget: 4_000_000,
                currentCash: 4_000_000,
                type: 'TAIWAN_STOCK',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
                id: 'p-fund',
                name: '基金大軍',
                allocatedBudget: 453_000,
                currentCash: 453_000,
                type: 'FUNDS',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ];

        const input = {
            masterTwdTotal: 5_678_660,
            capitalDeposits: [],
            capitalWithdrawals: [],
            totalCapitalPool: 729_658,
            pools,
            usdAccountCash: 15_746.095238,
            usStockFundPool: 15_746.095238,
            exchangeRateUSD: 31.5,
            holdings: [] as StockHolding[],
            customCategories: emptyCustom,
            transactions: [makeUsStockDeposit(usdDepositTwd, 15_746.095238, 31.5)],
        };

        const { idleCapital } = calculateFundingMetrics(input);
        const globalFree = calculateGlobalIdleCapital(input.totalCapitalPool, input.holdings, input.customCategories);

        expect(idleCapital).toBe(729_658);
        expect(globalFree).toBe(idleCapital);
    });

    it('idleCapital equals globalFree when no USD account is allocated', () => {
        const pools: AssetPool[] = [
            {
                id: 'p-tw',
                name: '台股軍團',
                allocatedBudget: 300_000,
                currentCash: 300_000,
                type: 'TAIWAN_STOCK',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ];

        const input = {
            masterTwdTotal: 1_000_000,
            capitalDeposits: [],
            capitalWithdrawals: [],
            totalCapitalPool: 700_000,
            pools,
            usdAccountCash: 0,
            usStockFundPool: 0,
            exchangeRateUSD: 31,
            holdings: [] as StockHolding[],
            customCategories: emptyCustom,
            transactions: [],
        };

        const { idleCapital } = calculateFundingMetrics(input);
        const globalFree = calculateGlobalIdleCapital(input.totalCapitalPool, input.holdings, input.customCategories);

        expect(idleCapital).toBe(700_000);
        expect(globalFree).toBe(idleCapital);
    });

    it('calculateUsdAllocatedTwdBasis nets deposits and withdrawals', () => {
        const transactions: Transaction[] = [
            makeUsStockDeposit(500_000, 15_000, 33.33),
            {
                id: 'tx-us-withdraw',
                type: 'US_STOCK',
                action: 'WITHDRAWAL',
                amount: 100_000,
                amountUSD: 3_000,
                exchangeRate: 33.33,
                date: '2026-02-01T00:00:00.000Z',
                note: '',
            },
        ];

        expect(calculateUsdAllocatedTwdBasis(transactions)).toBe(400_000);
    });

    it('summarizePortfolioPnL：美股換算 TWD、台股與基金維持 TWD', () => {
        const summary = summarizePortfolioPnL(
            [
                makeHolding({ type: 'US_STOCK', unrealizedPnL: 10, realizedPnL: 2 }),
                makeHolding({ type: 'TAIWAN_STOCK', unrealizedPnL: 1000, realizedPnL: 200 }),
                makeHolding({ type: 'FUNDS', unrealizedPnL: 500, realizedPnL: 50 }),
            ],
            32,
        );

        expect(summary.usUnrealizedPnLUSD).toBe(10);
        expect(summary.taiwanUnrealizedPnL).toBe(1000);
        expect(summary.fundUnrealizedPnL).toBe(500);
        expect(summary.totalUnrealizedPnL).toBe(10 * 32 + 1000 + 500);
        expect(summary.totalRealizedPnL).toBe(2 * 32 + 200 + 50);
    });
});
