import type { PortfolioState } from '../types';

/** 合併或「僅雲端」時使用的空狀態範本（lastSyncedAt 極早，讓本地較新紀錄優先保留） */
export function createEmptyPortfolioStateForUser(userId: string): PortfolioState {
    return {
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
        isConfigured: false,
        lastSyncedAt: '1970-01-01T00:00:00.000Z',
        localDataOwnerId: userId,
        pendingUpload: false,
    };
}
