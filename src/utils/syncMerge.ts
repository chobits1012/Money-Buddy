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
} from '../types';

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

/**
 * 通用陣列合併邏輯：
 * - 以 id 為基準比對
 * - 雙方都有 → 保留 updatedAt 較新的
 * - 只在一方有 → 判斷是「新增」還是「已被對方刪除」
 * 
 * @param localItems 本地的陣列
 * @param cloudItems 雲端的陣列
 * @param lastSyncedAt 上次同步時間（用來判斷刪除）
 */
function mergeArrayById<T extends HasIdAndUpdatedAt>(
    localItems: T[],
    cloudItems: T[],
    lastSyncedAt?: string,
): T[] {
    const syncTimestamp = getTimestamp(lastSyncedAt);

    // 建立雲端資料的 Map
    const cloudMap = new Map<string, T>();
    for (const item of cloudItems) {
        cloudMap.set(item.id, item);
    }

    // 建立本地資料的 Map
    const localMap = new Map<string, T>();
    for (const item of localItems) {
        localMap.set(item.id, item);
    }

    const merged: T[] = [];
    const processedIds = new Set<string>();

    // 1. 處理本地有的項目
    for (const localItem of localItems) {
        processedIds.add(localItem.id);
        const cloudItem = cloudMap.get(localItem.id);

        if (cloudItem) {
            // 雙方都有 → 比較 updatedAt，保留較新的
            const localTime = getTimestamp(localItem.updatedAt);
            const cloudTime = getTimestamp(cloudItem.updatedAt);
            merged.push(cloudTime > localTime ? cloudItem : localItem);
        } else {
            // 只在本地有：
            // - 如果有 lastSyncedAt 且本地這筆在上次同步前就存在，
            //   代表雲端「曾經有但被刪了」→ 不保留
            // - 否則代表「本地新增的」→ 保留
            const localTime = getTimestamp(localItem.updatedAt);
            if (syncTimestamp > 0 && localTime <= syncTimestamp) {
                // 雲端已刪除此項目，不保留
            } else {
                merged.push(localItem);
            }
        }
    }

    // 2. 處理只在雲端有的項目
    for (const cloudItem of cloudItems) {
        if (processedIds.has(cloudItem.id)) continue;

        // 只在雲端有：
        // - 如果有 lastSyncedAt 且雲端這筆在上次同步前就存在，
        //   代表本地「曾經有但被刪了」→ 不保留
        // - 否則代表「雲端新增的」→ 保留
        const cloudTime = getTimestamp(cloudItem.updatedAt);
        if (syncTimestamp > 0 && cloudTime <= syncTimestamp) {
            // 本地已刪除此項目，不保留
        } else {
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

    // ═══ 2. 純量值處理 ═══

    // totalCapitalPool：由合併後的 capitalDeposits 重新加總
    const mergedTotalCapitalPool = mergedCapitalDeposits.reduce(
        (sum, d) => sum + d.amount,
        0,
    );

    // usStockFundPool：取較新修改時間的那一方
    // 由於純量值沒有獨立的 updatedAt，我們使用 lastSyncedAt 來輔助判斷：
    // 如果雲端有更新（cloud 的整體較新），就用雲端的值
    const cloudOverallNewer =
        getTimestamp(cloud.lastSyncedAt) > getTimestamp(local.lastSyncedAt);
    const mergedUsStockFundPool = cloudOverallNewer
        ? cloud.usStockFundPool
        : local.usStockFundPool;

    // exchangeRateUSD：同上邏輯
    const mergedExchangeRateUSD = cloudOverallNewer
        ? cloud.exchangeRateUSD
        : local.exchangeRateUSD;

    // ═══ 3. 組合最終結果 ═══
    return {
        totalCapitalPool: mergedTotalCapitalPool,
        capitalDeposits: mergedCapitalDeposits,
        usStockFundPool: mergedUsStockFundPool,
        exchangeRateUSD: mergedExchangeRateUSD,
        transactions: mergedTransactions,
        holdings: mergedHoldings,
        customCategories: mergedCustomCategories,
        isConfigured: local.isConfigured || cloud.isConfigured,
        lastSyncedAt: new Date().toISOString(), // 合併完成即視為一次同步
    };
}
