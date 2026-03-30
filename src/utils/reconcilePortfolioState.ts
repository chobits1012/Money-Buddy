import type { PortfolioState, AssetPool, StockHolding, PoolLedgerEntry } from '../types';
import { filterActive } from './entityActive';

function toSafeNonNegativeNumber(value: unknown): number {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return 0;
    return num;
}

export type ReconcilePortfolioOptions = {
    /**
     * 同步合併時：依「雲端較新／本地較新」選出的美元基底（usdAccountCash ?? usStockFundPool）。
     * 僅在無 US_STOCK 交易紀錄（legacy 資料）時作為 fallback 使用。
     */
    usdBaseHint?: number;
};

/**
 * 從不可變來源（入金紀錄、poolLedger、holdings 陣列）以封閉公式重算所有派生純量，
 * 包括 masterTwdTotal、totalCapitalPool、usdAccountCash/usStockFundPool，
 * 以及每個 pool 的 allocatedBudget 與 currentCash。
 *
 * 設計原則：結果完全由「帳本紀錄 + 當前持倉」決定，不依賴任何「前一個值」，
 * 從而避免增量操作（如 removeHolding 的 pnlDelta）在 sync 復活循環中累積膨脹。
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

    const allPools = state.pools ?? [];
    const activePools = filterActive(allPools);
    const holdings = filterActive(state.holdings ?? []);
    const customCategories = filterActive(state.customCategories ?? []);
    const transactions = filterActive(state.transactions ?? []);
    const poolLedger = state.poolLedger ?? [];

    // ═══ 1. Pool allocatedBudget + currentCash（封閉公式，僅 active pools） ═══
    const reconciledActivePools = reconcilePools(activePools, holdings, poolLedger);
    const reconciledActiveMap = new Map(reconciledActivePools.map((p) => [p.id, p]));
    const reconciledPools = allPools.map((p) => reconciledActiveMap.get(p.id) ?? p);

    // ═══ 2. TWD totalCapitalPool（封閉公式，僅計算 active pools） ═══
    const twdPoolAllocated = reconciledActivePools
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

    // ═══ 3. USD 帳戶（封閉公式，從交易紀錄重算） ═══
    const safeUsd = reconcileUsd(transactions, holdings, activePools, state, options);

    return {
        masterTwdTotal,
        totalCapitalPool,
        usdAccountCash: safeUsd,
        usStockFundPool: safeUsd,
        pools: reconciledPools,
    };
}

// ─── Pool 封閉公式 ───

function reconcilePools(
    pools: AssetPool[],
    holdings: StockHolding[],
    poolLedger: PoolLedgerEntry[],
): AssetPool[] {
    return pools.map((pool) => {
        const poolHoldings = holdings.filter((h) => h.poolId === pool.id);
        const isUsd = pool.type === 'US_STOCK';

        // allocatedBudget：若有 ledger 紀錄則從帳本重算，否則保留現值（legacy）
        const allocatedBudget = reconcilePoolAllocatedBudget(
            pool,
            poolHoldings,
            poolLedger,
        );

        // currentCash = allocatedBudget − 池內持倉投資總額
        const totalInvested = isUsd
            ? poolHoldings.reduce(
                  (sum, h) => sum + toSafeNonNegativeNumber(h.totalAmountUSD ?? 0),
                  0,
              )
            : poolHoldings.reduce(
                  (sum, h) => sum + toSafeNonNegativeNumber(h.totalAmount),
                  0,
              );

        const rawCash = allocatedBudget - totalInvested;
        const currentCash = isUsd
            ? Math.max(0, rawCash)
            : Math.max(0, Math.round(rawCash));

        return { ...pool, allocatedBudget, currentCash };
    });
}

function reconcilePoolAllocatedBudget(
    pool: AssetPool,
    poolHoldings: StockHolding[],
    poolLedger: PoolLedgerEntry[],
): number {
    const entries = poolLedger.filter((e) => e.poolId === pool.id);
    if (entries.length === 0) return pool.allocatedBudget; // legacy: 無帳本則信任現值

    const isUsd = pool.type === 'US_STOCK';

    // 帳本基底 = CREATE + ALLOCATE − WITHDRAW
    const baseAlloc = entries.reduce((sum, e) => {
        const amount = isUsd ? (e.amountUSD || 0) : (e.amountTWD || 0);
        if (e.action === 'POOL_CREATE' || e.action === 'POOL_ALLOCATE')
            return sum + amount;
        if (e.action === 'POOL_WITHDRAW' || e.action === 'POOL_REMOVE')
            return sum - amount;
        return sum;
    }, 0);

    // 已實現損益回流（持倉交易的複利效應）
    const pnlAdj = poolHoldings.reduce(
        (sum, h) => sum + (h.realizedPnL || 0),
        0,
    );

    const raw = baseAlloc + pnlAdj;
    return isUsd ? Math.max(0, raw) : Math.max(0, Math.round(raw));
}

// ─── USD 封閉公式 ───

function reconcileUsd(
    transactions: PortfolioState['transactions'],
    holdings: StockHolding[],
    pools: AssetPool[],
    state: PortfolioState,
    options?: ReconcilePortfolioOptions,
): number {
    const usTx = (transactions ?? []).filter((tx) => tx.type === 'US_STOCK');

    if (usTx.length > 0) {
        // 封閉公式：從交易紀錄 + 持倉損益重算
        const usdFromTx = usTx.reduce((sum, tx) => {
            if (tx.action === 'DEPOSIT') return sum + (tx.amountUSD || 0);
            if (tx.action === 'WITHDRAWAL') return sum - (tx.amountUSD || 0);
            return sum;
        }, 0);
        const usdHoldingPnl = holdings
            .filter((h) => h.type === 'US_STOCK')
            .reduce((sum, h) => sum + (h.realizedPnL || 0), 0);

        return Math.max(0, usdFromTx + usdHoldingPnl);
    }

    // Legacy fallback：無 US_STOCK 交易紀錄，保留 hint 或 state 值
    const fromState = Math.max(
        toSafeNonNegativeNumber(state.usdAccountCash),
        toSafeNonNegativeNumber(state.usStockFundPool),
    );
    return options?.usdBaseHint !== undefined
        ? toSafeNonNegativeNumber(options.usdBaseHint)
        : fromState;
}
