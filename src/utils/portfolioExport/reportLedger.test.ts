import { describe, expect, it } from 'vitest';
import type { PortfolioState } from '../../types';
import { buildReportLedgerRows } from './reportLedger';

const baseState = (): PortfolioState => ({
    masterTwdTotal: 100_000,
    totalCapitalPool: 80_000,
    capitalDeposits: [
        {
            id: 'd1',
            amount: 100_000,
            note: '薪資',
            date: '2026-01-02T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
        },
    ],
    capitalWithdrawals: [],
    pools: [],
    poolLedger: [
        {
            id: 'pl1',
            poolId: 'p1',
            poolName: '台股池',
            marketType: 'TAIWAN_STOCK',
            action: 'POOL_ALLOCATE',
            date: '2026-01-03T10:00:00.000Z',
            updatedAt: '2026-01-03T10:00:00.000Z',
            amountTWD: 20_000,
            note: '主帳可分配資金 → 入金池「台股池」',
        },
    ],
    usdAccountCash: 1000,
    usStockFundPool: 1000,
    exchangeRateUSD: 32,
    transactions: [],
    holdings: [
        {
            id: 'h1',
            type: 'US_STOCK',
            name: 'Apple',
            symbol: 'AAPL',
            purchases: [
                {
                    id: 'pr1',
                    action: 'BUY',
                    date: '2026-01-04T10:00:00.000Z',
                    updatedAt: '2026-01-04T10:00:00.000Z',
                    shares: 1,
                    pricePerShare: 100,
                    totalCost: 3200,
                    totalCostUSD: 100,
                    exchangeRate: 32,
                    note: '',
                },
            ],
            shares: 1,
            avgPrice: 100,
            totalAmount: 3200,
            totalAmountUSD: 100,
            createdAt: '2026-01-04T10:00:00.000Z',
            updatedAt: '2026-01-04T10:00:00.000Z',
        },
    ],
    customCategories: [],
    isConfigured: true,
    lastSyncedAt: '2026-01-05T00:00:00.000Z',
    localDataOwnerId: null,
    pendingUpload: false,
});

describe('buildReportLedgerRows', () => {
    it('merges deposits, purchases, and pool ledger sorted newest first', () => {
        const rows = buildReportLedgerRows(baseState());
        expect(rows.length).toBeGreaterThanOrEqual(3);
        expect(rows[0].timestamp).toBeGreaterThanOrEqual(rows[rows.length - 1].timestamp);

        const buy = rows.find((r) => r.categoryZh === '買入');
        expect(buy?.usdAmount).toBe(100);
        expect(buy?.twdAmount).toBe(3200);

        const pool = rows.find((r) => r.id === 'pl1');
        expect(pool?.categoryZh).toBe('內部調撥');
        expect(pool?.twdAmount).toBe(20_000);

        const dep = rows.find((r) => r.id === 'cap-dep-d1');
        expect(dep?.categoryZh).toBe('入金');
        expect(dep?.twdAmount).toBe(100_000);
    });
});
