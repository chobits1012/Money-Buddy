import { describe, expect, it } from 'vitest';
import { migratePortfolioState, PORTFOLIO_PERSIST_VERSION } from './portfolioMigrations';

describe('portfolioMigrations', () => {
    it('exports current persist version', () => {
        expect(PORTFOLIO_PERSIST_VERSION).toBe(5);
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
});
