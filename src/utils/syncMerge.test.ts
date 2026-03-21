import { describe, expect, it } from 'vitest';
import type { PortfolioState } from '../types';
import { syncMerge } from './syncMerge';

const baseState = (overrides: Partial<PortfolioState>): PortfolioState => ({
    masterTwdTotal: 0,
    totalCapitalPool: 0,
    capitalDeposits: [],
    capitalWithdrawals: [],
    pools: [],
    usdAccountCash: 0,
    usStockFundPool: 0,
    exchangeRateUSD: 31,
    transactions: [],
    holdings: [],
    customCategories: [],
    isConfigured: true,
    lastSyncedAt: '2026-01-01T00:00:00.000Z',
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
});
