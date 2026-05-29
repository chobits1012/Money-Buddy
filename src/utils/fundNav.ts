import type { FundCatalogEntry } from './fundCatalog';
import catalog from '../data/funds.json';

export interface FundNavQuote {
    fundCode: string;
    nav: number;
    navDate: string;
}

const catalogBySymbol = new Map(
    (catalog as FundCatalogEntry[]).map((entry) => [entry.symbol, entry] as const),
);

const catalogByName = new Map(
    (catalog as FundCatalogEntry[]).map((entry) => [entry.name.trim().toLowerCase(), entry] as const),
);

/** Phase C：由標的 symbol / 名稱解析外部 fundCode */
export function resolveFundCode(symbol?: string, name?: string): string | undefined {
    if (symbol) {
        const bySymbol = catalogBySymbol.get(symbol);
        if (bySymbol?.fundCode) return bySymbol.fundCode;
    }
    if (name) {
        const byName = catalogByName.get(name.trim().toLowerCase());
        if (byName?.fundCode) return byName.fundCode;
    }
    return undefined;
}

/**
 * Phase C 預留：自動抓取基金淨值。
 * 目前尚未串接外部資料源，回傳空陣列；後續可接 MoneyDJ / 投信公開淨值 API。
 */
export async function fetchFundNavQuotes(fundCodes: string[]): Promise<FundNavQuote[]> {
    if (fundCodes.length === 0) return [];
    void fundCodes;
    return [];
}
