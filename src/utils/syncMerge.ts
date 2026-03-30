/**
 * syncMerge.ts
 *
 * 雙向合併：聯集 + LWW，並以 deletedAt（墓碑）解決「本機刪除後被雲端舊資料覆蓋」問題。
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
    PurchaseRecord,
} from '../types';
import { reconcilePortfolioState } from './reconcilePortfolioState';
import { recalcHolding } from './finance';

function getTimestamp(dateStr?: string): number {
    if (!dateStr) return 0;
    const t = new Date(dateStr).getTime();
    return Number.isFinite(t) ? t : 0;
}

/** 用於 LWW：updatedAt、date、createdAt 取最大者（舊資料可能缺欄） */
function effectiveUpdatedFlexible(e: {
    updatedAt?: string;
    date?: string;
    createdAt?: string;
}): number {
    return Math.max(
        getTimestamp(e.updatedAt),
        getTimestamp(e.date),
        getTimestamp(e.createdAt),
    );
}

function effectivePurchaseUpdated(p: PurchaseRecord): number {
    return Math.max(getTimestamp(p.updatedAt), getTimestamp(p.date));
}

function toSafeNonNegativeNumber(value: unknown): number {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return 0;
    return num;
}

/**
 * 刪除優先 + LWW：同一 id 兩端都有時決定保留哪一筆。
 */
function mergePairByTombstone<T extends { updatedAt?: string; deletedAt?: string }>(
    local: T,
    cloud: T,
    effectiveUpdated: (e: T) => number,
): T {
    const localU = effectiveUpdated(local);
    const cloudU = effectiveUpdated(cloud);
    const localD = getTimestamp(local.deletedAt);
    const cloudD = getTimestamp(cloud.deletedAt);
    if (localD > 0 && localD > cloudU) {
        return { ...local };
    }
    if (cloudD > 0 && cloudD > localU) {
        return { ...cloud };
    }
    return cloudU > localU ? { ...cloud } : { ...local };
}

function mergeArrayByTombstone<T extends { id: string; updatedAt?: string; deletedAt?: string }>(
    localItems: T[],
    cloudItems: T[],
    effectiveUpdated: (e: T) => number,
): T[] {
    const idToLocal = new Map(localItems.map((i) => [i.id, i]));
    const idToCloud = new Map(cloudItems.map((i) => [i.id, i]));
    const allIds = new Set([...idToLocal.keys(), ...idToCloud.keys()]);
    const merged: T[] = [];

    for (const id of allIds) {
        const localItem = idToLocal.get(id);
        const cloudItem = idToCloud.get(id);
        if (localItem && cloudItem) {
            merged.push(mergePairByTombstone(localItem, cloudItem, effectiveUpdated));
        } else if (localItem) {
            merged.push(localItem);
        } else if (cloudItem) {
            merged.push(cloudItem);
        }
    }

    return merged;
}

function mergePurchases(local: PurchaseRecord[], cloud: PurchaseRecord[]): PurchaseRecord[] {
    return mergeArrayByTombstone(local, cloud, effectivePurchaseUpdated);
}

type HoldingMeta = Omit<StockHolding, 'purchases'>;

function mergeHoldingMeta(local: StockHolding, cloud: StockHolding): HoldingMeta {
    const { purchases: _lp, ...l } = local;
    const { purchases: _cp, ...c } = cloud;
    return mergePairByTombstone(l as HoldingMeta, c as HoldingMeta, (h) =>
        getTimestamp(h.updatedAt),
    );
}

/** 供測試與持倉合併：外層 tombstone + purchases 聯集 tombstone，最後依 active purchases 重算聚合 */
export function mergeStockHolding(local: StockHolding, cloud: StockHolding): StockHolding {
    const mergedPurchases = mergePurchases(local.purchases ?? [], cloud.purchases ?? []);
    const meta = mergeHoldingMeta(local, cloud);
    const recalced = recalcHolding({
        ...meta,
        purchases: mergedPurchases,
    });
    // 勿讓 recalcHolding 的「現在時間」覆蓋合併裁決的 updatedAt（否則下次同步永遠本地勝）
    return {
        ...recalced,
        updatedAt: meta.updatedAt,
        deletedAt: meta.deletedAt,
    };
}

function mergeHoldingsArray(local: StockHolding[], cloud: StockHolding[]): StockHolding[] {
    const idToLocal = new Map(local.map((h) => [h.id, h]));
    const idToCloud = new Map(cloud.map((h) => [h.id, h]));
    const allIds = new Set([...idToLocal.keys(), ...idToCloud.keys()]);
    const merged: StockHolding[] = [];

    for (const id of allIds) {
        const l = idToLocal.get(id);
        const c = idToCloud.get(id);
        if (l && c) {
            merged.push(mergeStockHolding(l, c));
        } else if (l) {
            merged.push(l);
        } else if (c) {
            merged.push(c);
        }
    }

    return merged;
}

export function syncMerge(local: PortfolioState, cloud: PortfolioState): PortfolioState {
    const mergedHoldings = mergeHoldingsArray(local.holdings, cloud.holdings);

    const mergedCustomCategories = mergeArrayByTombstone<CustomCategory>(
        local.customCategories,
        cloud.customCategories,
        (e) => effectiveUpdatedFlexible(e),
    );

    const mergedTransactions = mergeArrayByTombstone<Transaction>(
        local.transactions,
        cloud.transactions,
        (e) => effectiveUpdatedFlexible(e),
    );

    const mergedCapitalDeposits = mergeArrayByTombstone<CapitalDeposit>(
        local.capitalDeposits,
        cloud.capitalDeposits,
        (e) => effectiveUpdatedFlexible(e),
    );

    const mergedCapitalWithdrawals = mergeArrayByTombstone<CapitalWithdrawal>(
        local.capitalWithdrawals || [],
        cloud.capitalWithdrawals || [],
        (e) => effectiveUpdatedFlexible(e),
    );

    const mergedPools = mergeArrayByTombstone<AssetPool>(
        local.pools || [],
        cloud.pools || [],
        (e) => effectiveUpdatedFlexible(e),
    ).map((pool) => ({
        ...pool,
        allocatedBudget: toSafeNonNegativeNumber(pool.allocatedBudget),
        currentCash: toSafeNonNegativeNumber(pool.currentCash),
    }));

    const mergedPoolLedger = mergeArrayByTombstone<PoolLedgerEntry>(
        local.poolLedger || [],
        cloud.poolLedger || [],
        (e) => effectiveUpdatedFlexible(e),
    );

    const cloudOverallNewer = getTimestamp(cloud.lastSyncedAt) > getTimestamp(local.lastSyncedAt);

    const localUsdBase = Math.max(
        toSafeNonNegativeNumber(local.usdAccountCash),
        toSafeNonNegativeNumber(local.usStockFundPool),
    );
    const cloudUsdBase = Math.max(
        toSafeNonNegativeNumber(cloud.usdAccountCash),
        toSafeNonNegativeNumber(cloud.usStockFundPool),
    );
    const mergedUsdAccountCashPick = cloudOverallNewer ? cloudUsdBase : localUsdBase;

    const mergedExchangeRateUSD = cloudOverallNewer ? cloud.exchangeRateUSD : local.exchangeRateUSD;

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
