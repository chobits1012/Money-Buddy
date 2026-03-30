/**
 * syncMerge.ts
 * 
 * 雙向合併邏輯：根據 id + updatedAt 將本地與雲端的 PortfolioState 合併。
 * 這是一個純函式，不依賴任何 React 或 Zustand 的 API。
 */
import type {
    PortfolioState,
    StockHolding,
    CustomCategory,
    Transaction,
    CapitalDeposit,
    CapitalWithdrawal,
    AssetPool,
    PoolLedgerEntry,
} from '../types';
import { reconcilePortfolioState } from './reconcilePortfolioState';

// ═══ 通用型別 ═══
interface Mergeable {
    id: string;
    updatedAt?: string;
    deletedAt?: string;
}

// ═══ 核心工具函式 ═══

function getTimestamp(dateStr?: string): number {
    if (!dateStr) return 0;
    return new Date(dateStr).getTime();
}

function toSafeNonNegativeNumber(value: unknown): number {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return 0;
    return num;
}

/**
 * 通用陣列合併邏輯（聯集 + tombstone 優先 + LWW fallback）：
 * - 以 id 為基準比對
 * - 任一方有 deletedAt → **刪除永遠勝出**（取有 deletedAt 的版本）
 * - 雙方都有 deletedAt → 取較早的 deletedAt
 * - 雙方都沒有 deletedAt → 保留 updatedAt 較新的（LWW）
 * - 只在一方有 → 一律保留該筆
 */
function mergeArrayById<T extends Mergeable>(
    localItems: T[],
    cloudItems: T[],
): T[] {
    const idToLocal = new Map(localItems.map((i) => [i.id, i]));
    const idToCloud = new Map(cloudItems.map((i) => [i.id, i]));
    const allIds = new Set([...idToLocal.keys(), ...idToCloud.keys()]);
    const merged: T[] = [];

    for (const id of allIds) {
        const L = idToLocal.get(id);
        const C = idToCloud.get(id);
        if (L && C) {
            if (L.deletedAt && C.deletedAt) {
                merged.push(getTimestamp(L.deletedAt) <= getTimestamp(C.deletedAt) ? L : C);
            } else if (L.deletedAt) {
                merged.push(L);
            } else if (C.deletedAt) {
                merged.push(C);
            } else {
                merged.push(getTimestamp(C.updatedAt) > getTimestamp(L.updatedAt) ? C : L);
            }
        } else {
            merged.push((L ?? C)!);
        }
    }

    return merged;
}

// ═══ 主要合併函式 ═══

/**
 * 將本地狀態與雲端狀態進行雙向合併。
 * 
 * @param local 本地的 PortfolioState
 * @param cloud 雲端的 PortfolioState
 * @returns 合併後的 PortfolioState
 */
export function syncMerge(
    local: PortfolioState,
    cloud: PortfolioState,
): PortfolioState {
    // ═══ 1. 陣列資料合併（tombstone 優先 + LWW fallback） ═══

    const mergedHoldings = mergeArrayById<StockHolding>(
        local.holdings,
        cloud.holdings,
    );

    const mergedCustomCategories = mergeArrayById<CustomCategory>(
        local.customCategories,
        cloud.customCategories,
    );

    const mergedTransactions = mergeArrayById<Transaction>(
        local.transactions,
        cloud.transactions,
    );

    const mergedCapitalDeposits = mergeArrayById<CapitalDeposit>(
        local.capitalDeposits,
        cloud.capitalDeposits,
    );

    const mergedCapitalWithdrawals = mergeArrayById<CapitalWithdrawal>(
        local.capitalWithdrawals || [],
        cloud.capitalWithdrawals || [],
    );

    const mergedPools = mergeArrayById<AssetPool>(
        local.pools || [],
        cloud.pools || [],
    ).map((pool) => ({
        ...pool,
        allocatedBudget: toSafeNonNegativeNumber(pool.allocatedBudget),
        currentCash: toSafeNonNegativeNumber(pool.currentCash),
    }));

    const mergedPoolLedger = mergeArrayById<PoolLedgerEntry>(
        local.poolLedger || [],
        cloud.poolLedger || [],
    );

    const cloudOverallNewer =
        getTimestamp(cloud.lastSyncedAt) > getTimestamp(local.lastSyncedAt);

    const localUsdBase = Math.max(
        toSafeNonNegativeNumber(local.usdAccountCash),
        toSafeNonNegativeNumber(local.usStockFundPool),
    );
    const cloudUsdBase = Math.max(
        toSafeNonNegativeNumber(cloud.usdAccountCash),
        toSafeNonNegativeNumber(cloud.usStockFundPool),
    );
    const mergedUsdAccountCashPick = cloudOverallNewer ? cloudUsdBase : localUsdBase;

    const mergedExchangeRateUSD = cloudOverallNewer
        ? cloud.exchangeRateUSD
        : local.exchangeRateUSD;

    const mergedForReconcile: PortfolioState = {
        ...local,
        capitalDeposits: mergedCapitalDeposits,
        capitalWithdrawals: mergedCapitalWithdrawals,
        pools: mergedPools,
        poolLedger: mergedPoolLedger,
        holdings: mergedHoldings,
        customCategories: mergedCustomCategories,
        transactions: mergedTransactions,
        exchangeRateUSD: mergedExchangeRateUSD,
        isConfigured: local.isConfigured || cloud.isConfigured,
        localDataOwnerId: local.localDataOwnerId ?? cloud.localDataOwnerId ?? null,
        pendingUpload: local.pendingUpload ?? cloud.pendingUpload ?? false,
    };

    const reconciled = reconcilePortfolioState(mergedForReconcile, {
        usdBaseHint: toSafeNonNegativeNumber(mergedUsdAccountCashPick),
    });

    return {
        ...mergedForReconcile,
        ...reconciled,
        lastSyncedAt: new Date().toISOString(),
    };
}
