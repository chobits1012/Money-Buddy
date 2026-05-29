export interface FundCatalogEntry {
    symbol: string;
    name: string;
    exchDisp?: string;
    keywords?: string[];
    /** Phase C: 外部淨值資料源代碼（待串接） */
    fundCode?: string;
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
