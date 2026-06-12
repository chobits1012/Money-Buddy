import { describe, expect, it } from 'vitest';
import { migratePortfolioState, PORTFOLIO_PERSIST_VERSION } from './portfolioMigrations';

describe('portfolioMigrations', () => {
    it('exports current persist version', () => {
        expect(PORTFOLIO_PERSIST_VERSION).toBe(6);
    });

    it('adds poolLedger and EUR rate for legacy snapshots', () => {
        const migrated = migratePortfolioState({
            masterTwdTotal: 1_000_000,
            totalCapitalPool: 1_000_000,
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
        }, 0);

        expect(migrated.poolLedger).toEqual([]);
        expect(migrated.exchangeRateEUR).toBe(34.5);
    });

    it('assigns default companionId to legacy pools on v6 migration', () => {
        const migrated = migratePortfolioState({
            pools: [
                {
                    id: 'p1',
                    name: '台股池',
                    allocatedBudget: 100,
                    currentCash: 100,
                    type: 'TAIWAN_STOCK',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ],
        }, 5);

        expect(migrated.pools[0]?.companionId).toBe('shiba');
    });
});
