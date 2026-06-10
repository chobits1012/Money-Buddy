import { describe, expect, it } from 'vitest';
import { applyAccountingImpact } from './applyAccountingImpact';
import type { AssetPool } from '../types';

const basePool: AssetPool = {
    id: 'pool-1',
    name: '台股軍團',
    allocatedBudget: 100_000,
    currentCash: 50_000,
    type: 'TAIWAN_STOCK',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
};

const baseState = {
    totalCapitalPool: 500_000,
    usdAccountCash: 1_000,
    usStockFundPool: 1_000,
    pools: [basePool],
};

const deltas = {
    cashDeltaTWD: -20_000,
    cashDeltaUSD: 0,
    pnlDeltaTWD: 5_000,
    pnlDeltaUSD: 100,
};

describe('applyAccountingImpact', () => {
    it('全局台股：totalCapitalPool 隨 pnlDeltaTWD 變動', () => {
        const result = applyAccountingImpact(baseState, deltas, {
            assetType: 'TAIWAN_STOCK',
        });

        expect(result.totalCapitalPool).toBe(505_000);
        expect(result.pools).toBe(baseState.pools);
    });

    it('美股：totalCapitalPool 不變，usd 欄位同步加 pnlDeltaUSD', () => {
        const result = applyAccountingImpact(baseState, deltas, {
            assetType: 'US_STOCK',
        });

        expect(result.totalCapitalPool).toBe(500_000);
        expect(result.usdAccountCash).toBe(1_100);
        expect(result.usStockFundPool).toBe(1_100);
    });

    it('入金池內台股：更新該池預算與現金，不動 totalCapitalPool', () => {
        const result = applyAccountingImpact(baseState, deltas, {
            poolId: 'pool-1',
            assetType: 'TAIWAN_STOCK',
            updatedAt: '2024-06-01T00:00:00.000Z',
        });

        expect(result.totalCapitalPool).toBe(500_000);
        expect(result.pools[0].allocatedBudget).toBe(105_000);
        expect(result.pools[0].currentCash).toBe(30_000);
        expect(result.pools[0].updatedAt).toBe('2024-06-01T00:00:00.000Z');
    });
});
