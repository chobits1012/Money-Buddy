export type FundNavScope = 'domestic' | 'offshore';
export type FundPricingCurrency = 'TWD' | 'USD' | 'EUR';

export interface FundCatalogEntry {
    symbol: string;
    name: string;
    exchDisp?: string;
    keywords?: string[];
    /** Phase C: MoneyDJ 基金代碼（a= 參數） */
    fundCode?: string;
    /** Phase C: 境內 wr02 / 境外 wb02；未填時由 exchDisp 推導 */
    navScope?: FundNavScope;
    /** 鉅亨網銷售代碼（僅供對照，淨值抓取仍用 fundCode） */
    cnyesCode?: string;
    /** 申購/淨值輸入幣別；境外未填時預設 USD */
    pricingCurrency?: FundPricingCurrency;
}

export type FundSearchSource = 'holding' | 'catalog';

export interface FundSearchResult extends FundCatalogEntry {
    source: FundSearchSource;
}

export function normalizeFundName(name: string): string {
    return name.trim().toLowerCase();
}

function matchesFundQuery(entry: Pick<FundCatalogEntry, 'name' | 'symbol' | 'keywords'>, query: string): boolean {
    const q = query.toLowerCase();
    if (entry.name.toLowerCase().includes(q)) return true;
    if (entry.symbol.toLowerCase().includes(q)) return true;
    return (entry.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(q));
}

export function searchFunds(
    query: string,
    catalog: FundCatalogEntry[],
    userFunds: FundCatalogEntry[],
    limit = 12,
): FundSearchResult[] {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const seen = new Set<string>();
    const results: FundSearchResult[] = [];

    for (const entry of userFunds) {
        const key = normalizeFundName(entry.name);
        if (seen.has(key) || !matchesFundQuery(entry, trimmed)) continue;
        seen.add(key);
        results.push({ ...entry, source: 'holding' });
    }

    for (const entry of catalog) {
        const key = normalizeFundName(entry.name);
        if (seen.has(key) || !matchesFundQuery(entry, trimmed)) continue;
        seen.add(key);
        results.push({ ...entry, source: 'catalog' });
    }

    return results.slice(0, limit);
}

export function buildUserFundEntries(
    holdings: Array<{ name: string; symbol?: string }>,
): FundCatalogEntry[] {
    const seen = new Set<string>();
    const entries: FundCatalogEntry[] = [];

    for (const holding of holdings) {
        const name = holding.name.trim();
        if (!name) continue;
        const key = normalizeFundName(name);
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({
            symbol: holding.symbol || `USER-${key.replace(/\s+/g, '-').slice(0, 24)}`,
            name,
            exchDisp: '我的基金',
        });
    }

    return entries;
}
