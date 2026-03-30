import type { PortfolioState } from '../types';
import { filterActive } from './entityActive';

function toSafeNonNegativeNumber(value: unknown): number {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return 0;
    return num;
}

export type ReconcilePortfolioOptions = {
    /**
     * 同步合併時：依「雲端較新／本地較新」選出的美元基底（usdAccountCash ?? usStockFundPool）。
     * 未傳則用 state 內兩欄較大者。
     */
    usdBaseHint?: number;
};

/**
 * 依入金／提領、池、全域持倉、自訂欄位，重算與畫面邏輯一致的純量（masterTwdTotal、totalCapitalPool、美金帳戶）。
 * 可於同步後、或從 localStorage 還原後執行，修正歷史錯位資料。
 */
export function reconcilePortfolioState(
    state: PortfolioState,
    options?: ReconcilePortfolioOptions,
): Partial<PortfolioState> {
    const deposits = filterActive(state.capitalDeposits ?? []);
    const withdrawals = filterActive(state.capitalWithdrawals ?? []);
    const masterTwdTotal = Math.max(
        0,
        deposits.reduce((s, d) => s + d.amount, 0) -
            withdrawals.reduce((s, w) => s + w.amount, 0),
    );

    const pools = filterActive(state.pools ?? []);
    const holdings = filterActive(state.holdings ?? []);
    const customCategories = filterActive(state.customCategories ?? []);

    const twdPoolAllocated = pools
        .filter((p) => p.type !== 'US_STOCK')
        .reduce((sum, p) => sum + toSafeNonNegativeNumber(p.allocatedBudget), 0);
    const globalTwdInvested = holdings
        .filter((h) => !h.poolId && h.type !== 'US_STOCK')
        .reduce((sum, h) => sum + toSafeNonNegativeNumber(h.totalAmount), 0);
    const customTotal = customCategories.reduce(
        (sum, c) => sum + toSafeNonNegativeNumber(c.amount),
        0,
    );

    let totalCapitalPool =
        masterTwdTotal - twdPoolAllocated - globalTwdInvested - customTotal;
    totalCapitalPool = Math.round(totalCapitalPool);
    totalCapitalPool = Math.max(0, Math.min(masterTwdTotal, totalCapitalPool));

    const usGlobalInvestedUsd = holdings
        .filter((h) => !h.poolId && h.type === 'US_STOCK')
        .reduce((sum, h) => sum + toSafeNonNegativeNumber(h.totalAmountUSD ?? 0), 0);
    const usPoolAllocatedUsd = pools
        .filter((p) => p.type === 'US_STOCK')
        .reduce((sum, p) => sum + toSafeNonNegativeNumber(p.allocatedBudget), 0);
    const minUsdBase = usGlobalInvestedUsd + usPoolAllocatedUsd;

    const fromState = Math.max(
        toSafeNonNegativeNumber(state.usdAccountCash),
        toSafeNonNegativeNumber(state.usStockFundPool),
    );
    const hint =
        options?.usdBaseHint !== undefined
            ? toSafeNonNegativeNumber(options.usdBaseHint)
            : fromState;
    const baseUsd =
        options?.usdBaseHint !== undefined
            ? hint
            : fromState;
    const safeUsd = Math.max(baseUsd, minUsdBase);

    return {
        masterTwdTotal,
        totalCapitalPool,
        usdAccountCash: safeUsd,
        usStockFundPool: safeUsd,
    };
}
