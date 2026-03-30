import { describe, expect, it } from 'vitest';
import type { PortfolioState } from '../types';
import { syncMerge } from './syncMerge';

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

    // ═══ Tombstone 合併測試 ═══

    describe('tombstone merge', () => {
        it('local deletedAt wins over cloud with newer updatedAt (tombstone priority)', () => {
            const local = baseState({
                holdings: [{
                    id: 'h1', type: 'TAIWAN_STOCK', name: 'A', purchases: [], shares: 10,
                    avgPrice: 100, totalAmount: 1000, createdAt: '2026-01-01',
                    updatedAt: '2026-03-01T00:00:00.000Z',
                    deletedAt: '2026-03-01T00:00:00.000Z',
                }],
            });
            const cloud = baseState({
                holdings: [{
                    id: 'h1', type: 'TAIWAN_STOCK', name: 'A', purchases: [], shares: 10,
                    avgPrice: 100, totalAmount: 1000, createdAt: '2026-01-01',
                    updatedAt: '2026-03-10T00:00:00.000Z',
                }],
            });
            const merged = syncMerge(local, cloud);
            expect(merged.holdings.find(h => h.id === 'h1')?.deletedAt).toBeTruthy();
        });

        it('cloud deletedAt wins over local with newer updatedAt', () => {
            const local = baseState({
                pools: [{
                    id: 'p1', name: 'Pool', type: 'TAIWAN_STOCK', allocatedBudget: 10000,
                    currentCash: 10000, createdAt: '2026-01-01',
                    updatedAt: '2026-03-10T00:00:00.000Z',
                }],
            });
            const cloud = baseState({
                pools: [{
                    id: 'p1', name: 'Pool', type: 'TAIWAN_STOCK', allocatedBudget: 10000,
                    currentCash: 10000, createdAt: '2026-01-01',
                    updatedAt: '2026-03-01T00:00:00.000Z',
                    deletedAt: '2026-03-01T00:00:00.000Z',
                }],
            });
            const merged = syncMerge(local, cloud);
            expect(merged.pools.find(p => p.id === 'p1')?.deletedAt).toBeTruthy();
        });

        it('both sides deleted: keeps earlier deletedAt', () => {
            const local = baseState({
                customCategories: [{
                    id: 'c1', name: 'Cat', amount: 500, note: '',
                    createdAt: '2026-01-01', updatedAt: '2026-03-01',
                    deletedAt: '2026-03-01T00:00:00.000Z',
                }],
            });
            const cloud = baseState({
                customCategories: [{
                    id: 'c1', name: 'Cat', amount: 500, note: '',
                    createdAt: '2026-01-01', updatedAt: '2026-03-02',
                    deletedAt: '2026-03-05T00:00:00.000Z',
                }],
            });
            const merged = syncMerge(local, cloud);
            expect(merged.customCategories.find(c => c.id === 'c1')?.deletedAt)
                .toBe('2026-03-01T00:00:00.000Z');
        });

        it('end-to-end: deleted holding does NOT resurrect even if cloud updatedAt is refreshed by quotes', () => {
            const local = baseState({
                capitalDeposits: [{ id: 'd1', amount: 100000, note: '', date: '2026-01-01', updatedAt: '2026-01-01' }],
                holdings: [{
                    id: 'h1', type: 'TAIWAN_STOCK', name: 'TSE2330', purchases: [],
                    shares: 100, avgPrice: 500, totalAmount: 50000,
                    createdAt: '2026-01-01',
                    updatedAt: '2026-03-20T10:00:00.000Z',
                    deletedAt: '2026-03-20T10:00:00.000Z',
                }],
            });
            const cloud = baseState({
                capitalDeposits: [{ id: 'd1', amount: 100000, note: '', date: '2026-01-01', updatedAt: '2026-01-01' }],
                holdings: [{
                    id: 'h1', type: 'TAIWAN_STOCK', name: 'TSE2330', purchases: [],
                    shares: 100, avgPrice: 500, totalAmount: 50000,
                    currentPrice: 520,
                    createdAt: '2026-01-01',
                    updatedAt: '2026-03-25T12:00:00.000Z',
                }],
            });

            const merged = syncMerge(local, cloud);
            const h = merged.holdings.find(h => h.id === 'h1')!;
            expect(h.deletedAt).toBeTruthy();
            expect(merged.totalCapitalPool).toBe(100000);
        });

        it('deleted holding excluded from reconcile financials', () => {
            const local = baseState({
                capitalDeposits: [{ id: 'd1', amount: 200000, note: '', date: '2026-01-01', updatedAt: '2026-01-01' }],
                poolLedger: [{
                    id: 'le1', poolId: 'p1', poolName: 'TW', marketType: 'TAIWAN_STOCK',
                    action: 'POOL_CREATE', date: '2026-01-01', updatedAt: '2026-01-01',
                    amountTWD: 100000,
                }],
                pools: [{
                    id: 'p1', name: 'TW', type: 'TAIWAN_STOCK', allocatedBudget: 100000,
                    currentCash: 50000, createdAt: '2026-01-01', updatedAt: '2026-01-01',
                }],
                holdings: [{
                    id: 'h1', type: 'TAIWAN_STOCK', name: 'A', poolId: 'p1', purchases: [],
                    shares: 100, avgPrice: 500, totalAmount: 50000, createdAt: '2026-01-01',
                    updatedAt: '2026-03-20T10:00:00.000Z',
                    deletedAt: '2026-03-20T10:00:00.000Z',
                }],
            });
            const cloud = baseState({
                capitalDeposits: local.capitalDeposits,
                poolLedger: local.poolLedger,
                pools: local.pools,
                holdings: [{
                    id: 'h1', type: 'TAIWAN_STOCK', name: 'A', poolId: 'p1', purchases: [],
                    shares: 100, avgPrice: 500, totalAmount: 50000, createdAt: '2026-01-01',
                    updatedAt: '2026-03-25T12:00:00.000Z',
                }],
            });

            const merged = syncMerge(local, cloud);
            const pool = merged.pools.find(p => p.id === 'p1')!;
            expect(pool.currentCash).toBe(100000);
            expect(pool.allocatedBudget).toBe(100000);
        });
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
});
