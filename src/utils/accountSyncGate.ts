import type { PortfolioState } from '../types';

export function hasLocalDataToProtect(state: PortfolioState): boolean {
    return (
        (state.holdings?.length ?? 0) > 0 ||
        (state.transactions?.length ?? 0) > 0 ||
        (state.customCategories?.length ?? 0) > 0 ||
        (state.capitalDeposits?.length ?? 0) > 0 ||
        (state.capitalWithdrawals?.length ?? 0) > 0 ||
        (state.pools?.length ?? 0) > 0 ||
        (state.masterTwdTotal ?? 0) > 0 ||
        (state.totalCapitalPool ?? 0) > 0
    );
}

/**
 * 新 session 與本地「意圖擁有者」不一致且可能誤寫雲端時阻擋自動同步。
 */
export function shouldBlockAccountSwitch(sessionUserId: string, state: PortfolioState): boolean {
    if (state.localDataOwnerId === sessionUserId) return false;
    if (state.localDataOwnerId == null && !hasLocalDataToProtect(state)) return false;
    return true;
}
