import { describe, expect, it } from 'vitest';
import type { PortfolioState } from '../types';
import { syncMerge } from './syncMerge';

/**
 * 模擬 syncWithServer 的純合併步驟（不含網路）：本地 + 雲端 → 合併後狀態。
 */
function mergeLocalWithCloudForUpload(
    local: PortfolioState,
    cloud: PortfolioState | null,
    userId: string,
): PortfolioState {
    if (!cloud) {
        return { ...local, localDataOwnerId: userId };
    }
    return { ...syncMerge(local, cloud), localDataOwnerId: userId };
}

describe('sync server merge pipeline (logic only)', () => {
    it('when cloud missing, keeps local and sets owner', () => {
        const local: PortfolioState = {
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
        };
        const out = mergeLocalWithCloudForUpload(local, null, 'uid-1');
        expect(out.localDataOwnerId).toBe('uid-1');
        expect(out.holdings).toEqual([]);
    });

    it('when cloud exists, uses syncMerge', () => {
        const local: PortfolioState = {
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
        };

        const cloud = {
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
            lastSyncedAt: '2026-02-01T00:00:00.000Z',
        } as PortfolioState;

        const out = mergeLocalWithCloudForUpload(local, cloud, 'uid-1');
        expect(out.localDataOwnerId).toBe('uid-1');
        expect(out.lastSyncedAt).toBeDefined();
    });
});
