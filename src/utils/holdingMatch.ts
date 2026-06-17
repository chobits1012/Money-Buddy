import type { StockAssetType, StockHolding } from '../types';
import { isActive } from './entityActive';

/** 台股去掉 .TW 後綴、美股轉大寫，供比對用 */
export function normalizeStockSymbol(
    symbol: string | undefined,
    type: StockAssetType,
): string {
    if (!symbol) return '';
    const s = symbol.trim().toUpperCase();
    if (type === 'TAIWAN_STOCK') {
        return s.replace(/\.TW$/i, '');
    }
    return s;
}

export interface HoldingMatchParams {
    type: StockAssetType;
    name: string;
    symbol?: string;
    poolId?: string;
}

/**
 * 尋找應合併的既有持倉。
 * 台股／美股優先以 symbol 比對（避免名稱格式不一致造成重複標的）。
 */
export function findMatchingHoldingIndex(
    holdings: StockHolding[],
    params: HoldingMatchParams,
): number {
    const poolId = params.poolId;
    const nameLower = params.name.trim().toLowerCase();
    const normSymbol = normalizeStockSymbol(params.symbol, params.type);
    const matchBySymbol =
        !!normSymbol &&
        (params.type === 'TAIWAN_STOCK' || params.type === 'US_STOCK');

    return holdings.findIndex((h) => {
        if (!isActive(h)) return false;
        if (h.type !== params.type) return false;
        if (h.poolId !== poolId) return false;

        if (matchBySymbol) {
            const hSym = normalizeStockSymbol(h.symbol, h.type);
            if (hSym && hSym === normSymbol) return true;
        }

        return h.name.toLowerCase() === nameLower;
    });
}
