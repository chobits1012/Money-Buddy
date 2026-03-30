import type { PortfolioState } from '../../types';
import { filterActive } from '../entityActive';

/** 從 Zustand store 取出報表用純狀態（略過 action、過濾已刪除） */
export function toPortfolioExportState(s: PortfolioState): PortfolioState {
    return {
        masterTwdTotal: s.masterTwdTotal,
        totalCapitalPool: s.totalCapitalPool,
        capitalDeposits: filterActive(s.capitalDeposits),
        capitalWithdrawals: filterActive(s.capitalWithdrawals),
        pools: filterActive(s.pools),
        poolLedger: s.poolLedger ?? [],
        usdAccountCash: s.usdAccountCash,
        usStockFundPool: s.usStockFundPool,
        exchangeRateUSD: s.exchangeRateUSD,
        transactions: filterActive(s.transactions),
        holdings: filterActive(s.holdings),
        customCategories: filterActive(s.customCategories),
        isConfigured: s.isConfigured,
        lastSyncedAt: s.lastSyncedAt,
        localDataOwnerId: s.localDataOwnerId,
        pendingUpload: s.pendingUpload,
    };
}
