import { describe, expect, it } from 'vitest';
import { create } from 'zustand';
import { createCapitalSlice } from './capitalSlice';
import { createHoldingSlice } from './holdingSlice';
import type { AssetPool } from '../../types';

function createTestStore(initial: {
    masterTwdTotal: number;
    totalCapitalPool: number;
    pools: AssetPool[];
    usdAccountCash?: number;
    usStockFundPool?: number;
    exchangeRateUSD?: number;
}) {
    return create<ReturnType<typeof createCapitalSlice> & ReturnType<typeof createHoldingSlice>>()(
        (set, get, api) => ({
            ...(createCapitalSlice(set as any, get as any, api as any)),
            ...(createHoldingSlice(set as any, get as any, api as any)),
            masterTwdTotal: initial.masterTwdTotal,
            totalCapitalPool: initial.totalCapitalPool,
            capitalDeposits: [],
            capitalWithdrawals: [],
            pools: initial.pools,
            poolLedger: [],
            usdAccountCash: initial.usdAccountCash ?? 0,
            usStockFundPool: initial.usStockFundPool ?? 0,
            exchangeRateUSD: initial.exchangeRateUSD ?? 31.5,
            exchangeRateEUR: 34.5,
            transactions: [],
            holdings: [],
            customCategories: [],
            isConfigured: true,
        }),
    );
}

describe('allocateToPool idleCapital guard', () => {
    it('rejects TWD allocation exceeding idleCapital', () => {
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
                name: '基金池',
                allocatedBudget: 453_000,
                currentCash: 453_000,
                type: 'FUNDS',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            },
        ];

        const store = createTestStore({
            masterTwdTotal: 5_678_660,
            totalCapitalPool: 1_225_660,
            pools,
            usdAccountCash: 15_746.095238,
            usStockFundPool: 15_746.095238,
            exchangeRateUSD: 31.5,
        });

        const before = store.getState();
        expect(before.getIdleCapital()).toBe(729_658);

        store.getState().allocateToPool('p-fund', 800_000);

        const after = store.getState();
        expect(after.pools.find((p) => p.id === 'p-fund')?.allocatedBudget).toBe(453_000);
        expect(after.totalCapitalPool).toBe(1_225_660);
    });
});
