import type { FundCatalogEntry, FundNavScope, FundPricingCurrency } from './fundCatalog';
import { scopeFromExchDisp } from './moneydjNav';
import catalog from '../data/funds.json';

export interface FundNavTarget {
    fundCode: string;
    navScope: FundNavScope;
}

export interface FundNavQuote {
    fundCode: string;
    nav: number;
    navDate: string;
    currency: 'TWD' | 'USD' | 'EUR' | 'OTHER';
    fundName?: string;
}

const catalogBySymbol = new Map(
    (catalog as FundCatalogEntry[]).map((entry) => [entry.symbol, entry] as const),
);

const catalogByName = new Map(
    (catalog as FundCatalogEntry[]).map((entry) => [entry.name.trim().toLowerCase(), entry] as const),
);

function normalizeLookupName(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function resolveCatalogEntry(symbol?: string, name?: string): FundCatalogEntry | undefined {
    if (symbol) {
        const bySymbol = catalogBySymbol.get(symbol);
        if (bySymbol) return bySymbol;
    }
    if (name) {
        const normalized = normalizeLookupName(name);
        const byName = catalogByName.get(name.trim().toLowerCase());
        if (byName) return byName;

        for (const entry of catalog as FundCatalogEntry[]) {
            const catalogKey = normalizeLookupName(entry.name);
            if (normalized.includes(catalogKey) || catalogKey.includes(normalized)) {
                return entry;
            }
            if ((entry.keywords ?? []).some((keyword) => normalized.includes(normalizeLookupName(keyword)))) {
                return entry;
            }
        }
    }
    return undefined;
}

/** 境外基金申購/淨值輸入幣別 */
export function resolveFundPricingCurrency(symbol?: string, name?: string): FundPricingCurrency {
    const entry = resolveCatalogEntry(symbol, name);
    if (!entry) return 'TWD';
    if (entry.pricingCurrency) return entry.pricingCurrency;
    if (entry.navScope === 'offshore' || entry.exchDisp === 'Global Fund') return 'USD';
    return 'TWD';
}

/** Phase C：由標的 symbol / 名稱解析外部 fundCode */
export function resolveFundCode(symbol?: string, name?: string): string | undefined {
    return resolveCatalogEntry(symbol, name)?.fundCode;
}

/** Phase C：解析 fundCode + 境內/境外 scope */
export function resolveFundNavTarget(symbol?: string, name?: string): FundNavTarget | undefined {
    const entry = resolveCatalogEntry(symbol, name);
    if (!entry?.fundCode) return undefined;

    return {
        fundCode: entry.fundCode,
        navScope: entry.navScope ?? scopeFromExchDisp(entry.exchDisp),
    };
}

/** 僅在新淨值日期較新（或同日）時才覆写 */
export function shouldApplyFundNavUpdate(
    existingDate: string | undefined,
    incomingDate: string,
): boolean {
    if (!existingDate) return true;
    return incomingDate >= existingDate.slice(0, 10);
}

export async function fetchFundNavQuotes(requests: FundNavTarget[]): Promise<FundNavQuote[]> {
    if (requests.length === 0) return [];

    const unique = new Map<string, FundNavTarget>();
    for (const req of requests) {
        unique.set(`${req.fundCode}:${req.navScope}`, req);
    }
    const deduped = [...unique.values()];

    const codes = deduped.map((r) => r.fundCode).join(',');
    const scopes = deduped.map((r) => r.navScope).join(',');
    const res = await fetch(`/api/fund-nav?codes=${encodeURIComponent(codes)}&scopes=${encodeURIComponent(scopes)}`);

    if (!res.ok) {
        throw new Error('Failed to fetch fund NAV');
    }

    return res.json() as Promise<FundNavQuote[]>;
}
