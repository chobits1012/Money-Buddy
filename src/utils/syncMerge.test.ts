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
