import type { PortfolioState } from '../../types';

/** 從 Zustand store 取出報表用純狀態（略過 action） */
export function toPortfolioExportState(s: PortfolioState): PortfolioState {
    return {
        masterTwdTotal: s.masterTwdTotal,
        totalCapitalPool: s.totalCapitalPool,
        capitalDeposits: s.capitalDeposits,
        capitalWithdrawals: s.capitalWithdrawals,
        pools: s.pools,
        poolLedger: s.poolLedger ?? [],
        usdAccountCash: s.usdAccountCash,
        usStockFundPool: s.usStockFundPool,
        exchangeRateUSD: s.exchangeRateUSD,
        transactions: s.transactions,
        holdings: s.holdings,
        customCategories: s.customCategories,
        isConfigured: s.isConfigured,
        lastSyncedAt: s.lastSyncedAt,
        localDataOwnerId: s.localDataOwnerId,
        pendingUpload: s.pendingUpload,
    };
}
