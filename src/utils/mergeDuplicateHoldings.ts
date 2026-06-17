import type { PortfolioState, StockAssetType, StockHolding } from '../types';
import { isActive } from './entityActive';
import { recalcHolding } from './finance';
import { normalizeStockSymbol } from './holdingMatch';

const SYMBOL_MERGE_TYPES: StockAssetType[] = ['TAIWAN_STOCK', 'US_STOCK'];

/** 從 symbol 欄位或名稱尾碼 `(代號)` 推斷代號，供合併分組用 */
export function resolveHoldingSymbol(holding: StockHolding): string {
    const fromField = normalizeStockSymbol(holding.symbol, holding.type);
    if (fromField) return fromField;

    if (holding.type === 'TAIWAN_STOCK') {
        const match = holding.name.match(/\((\d{4,6}[A-Z]?)\)\s*$/i);
        if (match) return match[1].toUpperCase();
    }

    if (holding.type === 'US_STOCK') {
        const match = holding.name.match(/\(([A-Z]{1,5})\)\s*$/i);
        if (match) return match[1].toUpperCase();
    }

    return '';
}

function holdingGroupKey(holding: StockHolding): string | null {
    if (!SYMBOL_MERGE_TYPES.includes(holding.type)) return null;
    const symbol = resolveHoldingSymbol(holding);
    if (!symbol) return null;
    return `${holding.type}::${holding.poolId ?? ''}::${symbol}`;
}

/** 選擇顯示名稱：避免 `(00919) (00919)`，統一為 `名稱 (代號)` */
export function pickCanonicalHoldingName(
    holdings: StockHolding[],
    symbol: string,
): string {
    const names = holdings.map((h) => h.name.trim()).filter(Boolean);
    const doubleSuffix = new RegExp(
        `\\(${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*\\(${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
        'i',
    );
    const withoutDouble = names.filter((n) => !doubleSuffix.test(n));
    const pool = withoutDouble.length > 0 ? withoutDouble : names;

    const singleSuffix = new RegExp(
        `\\(${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)$`,
        'i',
    );
    const withSuffix = pool.filter((n) => singleSuffix.test(n));
    if (withSuffix.length > 0) {
        return withSuffix.sort((a, b) => a.length - b.length)[0];
    }

    const stripSuffix = new RegExp(
        `\\s*\\(${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*$`,
        'gi',
    );
    const bases = pool
        .map((n) => n.replace(stripSuffix, '').trim())
        .filter(Boolean)
        .sort((a, b) => a.length - b.length);
    const base = bases[0] ?? symbol;
    return `${base} (${symbol})`;
}

function pickPrimaryHolding(group: StockHolding[]): StockHolding {
    return [...group].sort((a, b) => {
        const purchaseDiff = b.purchases.length - a.purchases.length;
        if (purchaseDiff !== 0) return purchaseDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })[0];
}

function mergeHoldingGroup(group: StockHolding[]): {
    primary: StockHolding;
    removedIds: string[];
} {
    const primary = pickPrimaryHolding(group);
    const symbol = resolveHoldingSymbol(primary) || resolveHoldingSymbol(group[1]);
    const now = new Date().toISOString();

    const mergedPurchases = group.flatMap((h) => h.purchases);
    const mergedQuotes = group.reduce<Partial<StockHolding>>((acc, h) => {
        if (!acc.currentPrice && h.currentPrice) {
            acc.currentPrice = h.currentPrice;
            acc.currentPriceDate = h.currentPriceDate;
        }
        if (!acc.currentPriceUSD && h.currentPriceUSD) {
            acc.currentPriceUSD = h.currentPriceUSD;
        }
        if (!acc.currentPriceEUR && h.currentPriceEUR) {
            acc.currentPriceEUR = h.currentPriceEUR;
        }
        return acc;
    }, {});

    const merged = recalcHolding({
        ...primary,
        ...mergedQuotes,
        name: pickCanonicalHoldingName(group, symbol),
        symbol: symbol || primary.symbol,
        purchases: mergedPurchases,
        updatedAt: now,
    });

    const removedIds = group
        .filter((h) => h.id !== primary.id)
        .map((h) => h.id);

    return { primary: merged, removedIds };
}

export interface MergeDuplicateHoldingsResult {
    holdings: StockHolding[];
    mergedCount: number;
    removedHoldingIds: string[];
}

/**
 * 合併同一軍團內、相同代號的重複台股／美股持倉。
 * 僅搬移 purchases 並軟刪除重複外殼，不觸發資金回流。
 */
export function mergeDuplicateHoldings(
    holdings: StockHolding[],
): MergeDuplicateHoldingsResult {
    const active = holdings.filter(isActive);
    const groups = new Map<string, StockHolding[]>();

    for (const holding of active) {
        const key = holdingGroupKey(holding);
        if (!key) continue;
        const list = groups.get(key) ?? [];
        list.push(holding);
        groups.set(key, list);
    }

    const duplicateGroups = [...groups.values()].filter((g) => g.length > 1);
    if (duplicateGroups.length === 0) {
        return { holdings, mergedCount: 0, removedHoldingIds: [] };
    }

    const now = new Date().toISOString();
    const mergedById = new Map<string, StockHolding>();
    const removedIds: string[] = [];

    for (const group of duplicateGroups) {
        const { primary, removedIds: groupRemoved } = mergeHoldingGroup(group);
        mergedById.set(primary.id, primary);
        removedIds.push(...groupRemoved);
    }

    const updatedHoldings = holdings.map((h) => {
        if (!isActive(h)) return h;
        if (mergedById.has(h.id)) return mergedById.get(h.id)!;
        if (removedIds.includes(h.id)) {
            return { ...h, deletedAt: now, updatedAt: now };
        }
        return h;
    });

    return {
        holdings: updatedHoldings,
        mergedCount: duplicateGroups.length,
        removedHoldingIds: removedIds,
    };
}

/** 啟動時對整份 portfolio 狀態執行合併（冪等） */
export function mergeDuplicateHoldingsInState(
    state: PortfolioState,
): Partial<PortfolioState> {
    const result = mergeDuplicateHoldings(state.holdings ?? []);
    if (result.mergedCount === 0) return {};
    return { holdings: result.holdings };
}
