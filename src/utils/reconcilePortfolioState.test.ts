import { describe, expect, it } from 'vitest';
import type { PortfolioState } from '../types';
import { reconcilePortfolioState } from './reconcilePortfolioState';

const base = (): PortfolioState => ({
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
    lastSyncedAt: undefined,
    localDataOwnerId: null,
    pendingUpload: false,
});

describe('reconcilePortfolioState', () => {
    it('recomputes totalCapitalPool from deposits and pools', () => {
        const s = base();
        s.capitalDeposits = [
            { id: 'd1', amount: 200_000_000, note: '', date: '2026-01-01', updatedAt: '2026-01-01' },
        ];
        s.pools = [
            {
                id: 'p1',
                name: '軍團',
                type: 'TAIWAN_STOCK',
                allocatedBudget: 50_000_000,
                currentCash: 50_000_000,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
            },
        ];
        s.totalCapitalPool = 200_000_000;
        s.masterTwdTotal = 200_000_000;

        const r = reconcilePortfolioState(s);
        expect(r.masterTwdTotal).toBe(200_000_000);
        expect(r.totalCapitalPool).toBe(150_000_000);
    });
});
