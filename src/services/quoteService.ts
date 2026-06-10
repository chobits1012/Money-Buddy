import type { StockHolding } from '../types';
import { recalcHolding } from '../utils/finance';

export interface StockQuoteResponse {
    symbol: string;
    price: number;
}

/** 依持倉組出 Yahoo 查價用的 symbol 列表（台股自動加 .TW） */
export function toYahooQuoteSymbols(
    holdings: Pick<StockHolding, 'type' | 'symbol'>[],
): string[] {
    return [
        ...new Set(
            holdings
                .filter((h) => h.symbol && (h.type === 'TAIWAN_STOCK' || h.type === 'US_STOCK'))
                .map((h) =>
                    h.type === 'TAIWAN_STOCK' && !h.symbol!.includes('.')
                        ? `${h.symbol}.TW`
                        : h.symbol!,
                ),
        ),
    ];
}

/** 將 API 回傳轉成 symbol → price 對照表 */
export function buildQuoteMapFromResponse(quotes: StockQuoteResponse[]): Record<string, number> {
    const quoteMap: Record<string, number> = {};
    quotes.forEach((q) => {
        quoteMap[q.symbol] = q.price;
        if (q.symbol.endsWith('.TW')) {
            quoteMap[q.symbol.replace('.TW', '')] = q.price;
        }
    });
    return quoteMap;
}

/** 向後端取得股價 */
export async function fetchStockQuotes(symbols: string[]): Promise<Record<string, number>> {
    if (symbols.length === 0) return {};

    const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols.join(','))}`);
    if (!res.ok) throw new Error('Failed to fetch quotes');

    const quotes: StockQuoteResponse[] = await res.json();
    return buildQuoteMapFromResponse(quotes);
}

/** 把股價套回持倉並重算損益 */
export function applyStockQuotesToHoldings(
    holdings: StockHolding[],
    quoteMap: Record<string, number>,
): StockHolding[] {
    return holdings.map((h) => {
        if (h.deletedAt || !h.symbol || !quoteMap[h.symbol]) return h;
        return recalcHolding({ ...h, currentPrice: quoteMap[h.symbol] });
    });
}
