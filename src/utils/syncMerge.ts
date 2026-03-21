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
} from '../types';
import { reconcilePortfolioState } from './reconcilePortfolioState';

// ═══ 通用型別 ═══
interface HasIdAndUpdatedAt {
    id: string;
    updatedAt?: string;
}

// ═══ 核心工具函式 ═══

/**
 * 取得時間戳的毫秒值，若為空則回傳 0
 */
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
 * 通用陣列合併邏輯（聯集 + LWW）：
 * - 以 id 為基準比對
 * - 雙方都有 → 保留 updatedAt 較新的
 * - 只在一方有 → 一律保留該筆
 *
 * 不再用「整個 PortfolioState.lastSyncedAt」推斷單筆是否被對方刪除：該時間戳在每次同步成功後會
 * 更新成「現在」，導致「本地新增、雲端尚未有」的 entity（例如新軍團 pool）的 updatedAt
 * 反而早於 lastSyncedAt，**下一次合併會被誤刪**，進而讓 totalCapitalPool 與實際池/持倉不一致。
 * 若需真正刪除並同步，未來應以 tombstone 或每筆刪除版本處理。
 */
function mergeArrayById<T extends HasIdAndUpdatedAt>(
    localItems: T[],
    cloudItems: T[],
    _lastSyncedAt?: string,
): T[] {
    const idToLocal = new Map(localItems.map((i) => [i.id, i]));
    const idToCloud = new Map(cloudItems.map((i) => [i.id, i]));
    const allIds = new Set([...idToLocal.keys(), ...idToCloud.keys()]);
    const merged: T[] = [];

    for (const id of allIds) {
        const localItem = idToLocal.get(id);
        const cloudItem = idToCloud.get(id);
        if (localItem && cloudItem) {
            const localTime = getTimestamp(localItem.updatedAt);
            const cloudTime = getTimestamp(cloudItem.updatedAt);
            merged.push(cloudTime > localTime ? cloudItem : localItem);
        } else if (localItem) {
            merged.push(localItem);
        } else if (cloudItem) {
            merged.push(cloudItem);
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
    const lastSyncedAt = local.lastSyncedAt;

    // ═══ 1. 陣列資料合併 ═══

    // Holdings（持倉）
    const mergedHoldings = mergeArrayById<StockHolding>(
        local.holdings,
        cloud.holdings,
        lastSyncedAt,
    );

    // CustomCategories（自訂欄位）
    const mergedCustomCategories = mergeArrayById<CustomCategory>(
        local.customCategories,
        cloud.customCategories,
        lastSyncedAt,
    );

    // Transactions（異動紀錄）
    const mergedTransactions = mergeArrayById<Transaction>(
        local.transactions,
        cloud.transactions,
        lastSyncedAt,
    );

    // CapitalDeposits（入金紀錄）
    const mergedCapitalDeposits = mergeArrayById<CapitalDeposit>(
        local.capitalDeposits,
        cloud.capitalDeposits,
        lastSyncedAt,
    );

    // CapitalWithdrawals（提領紀錄）
    const mergedCapitalWithdrawals = mergeArrayById<CapitalWithdrawal>(
        local.capitalWithdrawals || [],
        cloud.capitalWithdrawals || [],
        lastSyncedAt,
    );

    // Pools（資產池）
    const mergedPools = mergeArrayById<AssetPool>(
        local.pools || [],
        cloud.pools || [],
        lastSyncedAt,
    ).map((pool) => ({
        ...pool,
        allocatedBudget: toSafeNonNegativeNumber(pool.allocatedBudget),
        currentCash: toSafeNonNegativeNumber(pool.currentCash),
    }));

    const cloudOverallNewer =
        getTimestamp(cloud.lastSyncedAt) > getTimestamp(local.lastSyncedAt);

    const mergedUsdAccountCashPick = cloudOverallNewer
        ? (cloud.usdAccountCash ?? cloud.usStockFundPool)
        : (local.usdAccountCash ?? local.usStockFundPool);

    const mergedExchangeRateUSD = cloudOverallNewer
        ? cloud.exchangeRateUSD
        : local.exchangeRateUSD;

    const mergedForReconcile: PortfolioState = {
        ...local,
        capitalDeposits: mergedCapitalDeposits,
        capitalWithdrawals: mergedCapitalWithdrawals,
        pools: mergedPools,
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
        usdExtraMax: Math.max(
            toSafeNonNegativeNumber(local.usdAccountCash),
            toSafeNonNegativeNumber(local.usStockFundPool),
            toSafeNonNegativeNumber(cloud.usdAccountCash),
            toSafeNonNegativeNumber(cloud.usStockFundPool),
        ),
    });

    return {
        ...mergedForReconcile,
        ...reconciled,
        lastSyncedAt: new Date().toISOString(),
    };
}
