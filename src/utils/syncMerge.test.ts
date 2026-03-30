import { describe, expect, it } from 'vitest';
import type { PortfolioState, StockHolding } from '../types';
import { mergeStockHolding, syncMerge } from './syncMerge';

const baseState = (overrides: Partial<PortfolioState>): PortfolioState => ({
    masterTwdTotal: 0,
    totalCapitalPool: 0,
    capitalDeposits: [],
    capitalWithdrawals: [],
    pools: [],
    poolLedger: [],
    usdAccountCash: 0,
    usStockFundPool: 0,
    exchangeRateUSD: 31,
    transactions: [],
    holdings: [],
    customCategories: [],
    isConfigured: true,
    lastSyncedAt: '2026-01-01T00:00:00.000Z',
    localDataOwnerId: null,
    pendingUpload: false,
    ...overrides,
});

describe('syncMerge', () => {
    it('keeps totalCapitalPool within masterTwdTotal bounds', () => {
        const local = baseState({
            lastSyncedAt: '2026-01-01T00:00:00.000Z',
            capitalDeposits: [{ id: 'd1', amount: 1000, note: '', date: '2026-01-01', updatedAt: '2026-01-01' }],
            capitalWithdrawals: [],
            totalCapitalPool: 9000,
        });
        const cloud = baseState({
            lastSyncedAt: '2026-01-02T00:00:00.000Z',
            capitalDeposits: [{ id: 'd1', amount: 1000, note: '', date: '2026-01-01', updatedAt: '2026-01-01' }],
            capitalWithdrawals: [],
            totalCapitalPool: 5000,
        });

        const merged = syncMerge(local, cloud);
        expect(merged.masterTwdTotal).toBe(1000);
        expect(merged.totalCapitalPool).toBe(1000);
    });

    it('normalizes usdAccountCash from legacy usStockFundPool', () => {
        const local = baseState({
            lastSyncedAt: '2026-01-01T00:00:00.000Z',
            usdAccountCash: 0,
            usStockFundPool: 300,
        });
        const cloud = baseState({
            lastSyncedAt: '2026-01-02T00:00:00.000Z',
            // emulate old cloud payload without usdAccountCash signal
            usdAccountCash: 0,
            usStockFundPool: 500,
        });

        const merged = syncMerge(local, cloud);
        expect(merged.usdAccountCash).toBe(500);
        expect(merged.usStockFundPool).toBe(500);
    });

    it('reconciles totalCapitalPool when deposits and holdings come from different devices', () => {
        const deposit = {
            id: 'd1',
            amount: 10_000,
            note: '',
            date: '2026-01-01',
            updatedAt: '2026-01-01T00:00:00.000Z',
        };
        const local = baseState({
            lastSyncedAt: '2026-01-01T00:00:00.000Z',
            capitalDeposits: [deposit, {
                id: 'd2',
                amount: 2000,
                note: '',
                date: '2026-01-02',
                updatedAt: '2026-01-02T00:00:00.000Z',
            }],
            capitalWithdrawals: [],
            totalCapitalPool: 12_000,
            holdings: [],
        });
        const cloud = baseState({
            lastSyncedAt: '2026-01-03T00:00:00.000Z',
            capitalDeposits: [deposit],
            capitalWithdrawals: [],
            totalCapitalPool: 7000,
            holdings: [
                {
                    id: 'h1',
                    type: 'TAIWAN_STOCK',
                    name: 'TEST',
                    purchases: [],
                    shares: 0,
                    avgPrice: 0,
                    totalAmount: 3000,
                    createdAt: '2026-01-01',
                    updatedAt: '2026-01-03T00:00:00.000Z',
                },
            ],
        });

        const merged = syncMerge(local, cloud);
        expect(merged.masterTwdTotal).toBe(12_000);
        // 12000 - 0 pools - 3000 global TW - 0 custom = 9000
        expect(merged.totalCapitalPool).toBe(9000);
    });

    it('keeps a new local pool even when local lastSyncedAt is newer than pool.updatedAt (no false tombstone)', () => {
        const local = baseState({
            lastSyncedAt: '2026-03-21T10:00:00.000Z',
            masterTwdTotal: 200_000_000,
            totalCapitalPool: 150_000_000,
            capitalDeposits: [
                {
                    id: 'd1',
                    amount: 200_000_000,
                    note: '',
                    date: '2026-01-01',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            capitalWithdrawals: [],
            pools: [
                {
                    id: 'p-new',
                    name: '測試軍團',
                    type: 'TAIWAN_STOCK',
                    allocatedBudget: 50_000_000,
                    currentCash: 50_000_000,
                    createdAt: '2026-03-21T08:00:00.000Z',
                    updatedAt: '2026-03-21T08:00:00.000Z',
                },
            ],
        });
        const cloud = baseState({
            lastSyncedAt: '2026-03-21T07:00:00.000Z',
            pools: [],
            capitalDeposits: local.capitalDeposits,
            capitalWithdrawals: [],
        });

        const merged = syncMerge(local, cloud);
        expect(merged.pools).toHaveLength(1);
        expect(merged.pools[0].id).toBe('p-new');
        expect(merged.totalCapitalPool).toBe(150_000_000);
    });

    it('reconciles US base downward to newer side while keeping minimum required by holdings+pools', () => {
        const local = baseState({
            lastSyncedAt: '2026-03-20T10:00:00.000Z',
            usdAccountCash: 10_000,
            usStockFundPool: 10_000,
            holdings: [
                {
                    id: 'us-g',
                    type: 'US_STOCK',
                    name: 'USG',
                    purchases: [],
                    shares: 0,
                    avgPrice: 0,
                    totalAmount: 0,
                    totalAmountUSD: 1000,
                    createdAt: '2026-03-20',
                    updatedAt: '2026-03-20',
                },
            ],
            pools: [
                {
                    id: 'usp',
                    name: 'US Pool',
                    type: 'US_STOCK',
                    allocatedBudget: 500,
                    currentCash: 500,
                    createdAt: '2026-03-20',
                    updatedAt: '2026-03-20',
                },
            ],
        });
        const cloud = baseState({
            lastSyncedAt: '2026-03-21T10:00:00.000Z',
            usdAccountCash: 4000,
            usStockFundPool: 4000,
            holdings: local.holdings,
            pools: local.pools,
        });

        const merged = syncMerge(local, cloud);
        expect(merged.usdAccountCash).toBe(4000);
        expect(merged.usStockFundPool).toBe(4000);
    });

    it('keeps local tombstone when cloud still has older active purchase (no revive)', () => {
        const purchaseAlive = {
            id: 'p1',
            action: 'BUY' as const,
            date: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            shares: 10,
            pricePerShare: 100,
            totalCost: 1000,
            note: '',
        };
        const purchaseDead = {
            ...purchaseAlive,
            deletedAt: '2026-02-01T12:00:00.000Z',
            updatedAt: '2026-02-01T12:00:00.000Z',
        };
        const holdingBase = {
            id: 'h1',
            type: 'TAIWAN_STOCK' as const,
            name: '2330',
            purchases: [purchaseDead],
            shares: 0,
            avgPrice: 0,
            totalAmount: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-02-01T12:00:00.000Z',
            deletedAt: '2026-02-01T12:00:00.000Z',
        };
        const local = baseState({
            holdings: [holdingBase as StockHolding],
        });
        const cloud = baseState({
            holdings: [
                {
                    ...holdingBase,
                    deletedAt: undefined,
                    purchases: [purchaseAlive],
                    shares: 10,
                    avgPrice: 100,
                    totalAmount: 1000,
                    updatedAt: '2026-01-01T00:00:00.000Z',
                } as StockHolding,
            ],
        });

        const merged = syncMerge(local, cloud);
        const h = merged.holdings.find((x) => x.id === 'h1');
        expect(h?.deletedAt).toBeDefined();
        const pr = h?.purchases.find((x) => x.id === 'p1');
        expect(pr?.deletedAt).toBeDefined();
    });

    it('cloud tombstone wins when newer than local holding update', () => {
        const p1 = {
            id: 'p1',
            action: 'BUY' as const,
            date: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            shares: 5,
            pricePerShare: 100,
            totalCost: 500,
            note: '',
        };
        const local = baseState({
            holdings: [
                {
                    id: 'h1',
                    type: 'TAIWAN_STOCK',
                    name: 'X',
                    purchases: [p1],
                    shares: 5,
                    avgPrice: 100,
                    totalAmount: 500,
                    createdAt: '2026-01-01',
                    updatedAt: '2026-01-10T00:00:00.000Z',
                },
            ],
        });
        const cloud = baseState({
            holdings: [
                {
                    id: 'h1',
                    type: 'TAIWAN_STOCK',
                    name: 'X',
                    purchases: [p1],
                    shares: 5,
                    avgPrice: 100,
                    totalAmount: 500,
                    createdAt: '2026-01-01',
                    updatedAt: '2026-01-20T00:00:00.000Z',
                    deletedAt: '2026-01-20T00:00:00.000Z',
                },
            ],
        });
        const merged = syncMerge(local, cloud);
        expect(merged.holdings[0].deletedAt).toBeDefined();
    });

    it('mergeStockHolding keeps one active purchase when only the other side deleted a different id', () => {
        const a = {
            id: 'pa',
            action: 'BUY' as const,
            date: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            shares: 1,
            pricePerShare: 10,
            totalCost: 10,
            note: '',
        };
        const b = {
            id: 'pb',
            action: 'BUY' as const,
            date: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
            shares: 1,
            pricePerShare: 20,
            totalCost: 20,
            note: '',
        };
        const local: StockHolding = {
            id: 'h1',
            type: 'TAIWAN_STOCK',
            name: 'M',
            purchases: [a, { ...b, deletedAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' }],
            shares: 1,
            avgPrice: 10,
            totalAmount: 10,
            createdAt: '2026-01-01',
            updatedAt: '2026-03-01T00:00:00.000Z',
        };
        const cloud: StockHolding = {
            id: 'h1',
            type: 'TAIWAN_STOCK',
            name: 'M',
            purchases: [a, b],
            shares: 2,
            avgPrice: 15,
            totalAmount: 30,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-02T00:00:00.000Z',
        };
        const m = mergeStockHolding(local, cloud);
        expect(m.purchases.some((p) => p.id === 'pb' && p.deletedAt)).toBe(true);
        expect(m.purchases.some((p) => p.id === 'pa' && !p.deletedAt)).toBe(true);
        expect(m.shares).toBe(1);
    });
});
