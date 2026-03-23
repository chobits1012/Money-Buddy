import { describe, expect, it } from 'vitest';
import type { PortfolioState } from '../types';
import { hasLocalDataToProtect, shouldBlockAccountSwitch } from './accountSyncGate';

const emptyState = (): PortfolioState => ({
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
    isConfigured: false,
    lastSyncedAt: undefined,
    localDataOwnerId: null,
    pendingUpload: false,
});

describe('accountSyncGate', () => {
    it('does not block when session matches localDataOwnerId', () => {
        const s = emptyState();
        s.localDataOwnerId = 'user-a';
        expect(shouldBlockAccountSwitch('user-a', s)).toBe(false);
    });

    it('does not block first login with empty local and no owner', () => {
        const s = emptyState();
        expect(shouldBlockAccountSwitch('user-b', s)).toBe(false);
    });

    it('blocks when local has data but owner differs from session', () => {
        const s = emptyState();
        s.localDataOwnerId = 'user-a';
        s.holdings = [
            {
                id: 'h1',
                type: 'TAIWAN_STOCK',
                name: 'Test',
                purchases: [],
                shares: 0,
                avgPrice: 0,
                totalAmount: 0,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
            },
        ];
        expect(shouldBlockAccountSwitch('user-b', s)).toBe(true);
    });

    it('blocks guest with data when logging into a specific account', () => {
        const s = emptyState();
        s.capitalDeposits = [{ id: 'd1', amount: 100, note: '', date: '2026-01-01', updatedAt: '2026-01-01' }];
        expect(shouldBlockAccountSwitch('user-b', s)).toBe(true);
    });

    it('hasLocalDataToProtect detects meaningful rows', () => {
        const s = emptyState();
        expect(hasLocalDataToProtect(s)).toBe(false);
        s.masterTwdTotal = 1;
        expect(hasLocalDataToProtect(s)).toBe(true);
    });
});
