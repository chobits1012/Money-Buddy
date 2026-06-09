/** MoneyDJ 基金淨值（Vercel serverless / scripts / dev proxy 共用） */

export type FundNavScope = 'domestic' | 'offshore';

export interface FundNavRequest {
    fundCode: string;
    navScope: FundNavScope;
}

export interface MoneyDJNavResult {
    fundCode: string;
    nav: number;
    navDate: string;
    currency: 'TWD' | 'USD' | 'EUR' | 'OTHER';
    fundName?: string;
}

const MONEYDJ_NAV_URL =
    'https://landbank.moneydj.com/jsondata/djjson/fundjsondata.xdjjson';

const SCOPE_TO_TAG: Record<FundNavScope, string> = {
    domestic: 'wr02',
    offshore: 'wb02',
};

const MAX_BATCH_SIZE = 20;
const DEFAULT_CONCURRENCY = 5;

interface MoneyDJResultRow {
    V1?: string;
    V2?: string;
    V3?: string;
    V4?: string;
    V10?: string;
}

interface MoneyDJResponse {
    ResultSet?: {
        StatusCode?: number;
        DataLength?: number;
        Result?: MoneyDJResultRow[];
    };
}

export function scopeFromExchDisp(exchDisp?: string): FundNavScope {
    return exchDisp === 'Global Fund' ? 'offshore' : 'domestic';
}

export function parseMoneyDJCurrency(raw?: string): MoneyDJNavResult['currency'] {
    const value = (raw ?? '').trim();
    if (value.includes('台') || value.toUpperCase() === 'TWD') return 'TWD';
    if (value.includes('美') || value.toUpperCase() === 'USD') return 'USD';
    if (value.includes('歐') || value.toUpperCase() === 'EUR') return 'EUR';
    return 'OTHER';
}

export function parseMoneyDJNavDate(raw?: string): string | undefined {
    if (!raw) return undefined;
    const match = raw.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!match) return undefined;
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function parseMoneyDJNavResponse(
    fundCode: string,
    payload: MoneyDJResponse,
): MoneyDJNavResult | null {
    const row = payload.ResultSet?.Result?.[0];
    if (!row?.V4 || !row.V1) return null;

    const nav = Number.parseFloat(row.V4);
    if (!Number.isFinite(nav)) return null;

    const navDate = parseMoneyDJNavDate(row.V1);
    if (!navDate) return null;

    return {
        fundCode,
        nav,
        navDate,
        currency: parseMoneyDJCurrency(row.V10),
        fundName: row.V3?.trim(),
    };
}

export async function fetchMoneyDJNavQuote(
    request: FundNavRequest,
    retries = 2,
): Promise<MoneyDJNavResult | null> {
    const tag = SCOPE_TO_TAG[request.navScope];
    const url = `${MONEYDJ_NAV_URL}?a=${encodeURIComponent(request.fundCode)}&x=${tag}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) continue;

            const payload = (await res.json()) as MoneyDJResponse;
            if (payload.ResultSet?.StatusCode !== 0) return null;
            if ((payload.ResultSet.DataLength ?? 0) === 0) return null;

            return parseMoneyDJNavResponse(request.fundCode, payload);
        } catch {
            if (attempt === retries) return null;
        }
    }
    return null;
}

async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;

    async function worker() {
        while (index < items.length) {
            const current = index++;
            results[current] = await mapper(items[current]);
        }
    }

    const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        () => worker(),
    );
    await Promise.all(workers);
    return results;
}

export async function fetchMoneyDJNavQuotes(
    requests: FundNavRequest[],
    options?: { concurrency?: number },
): Promise<MoneyDJNavResult[]> {
    if (requests.length === 0) return [];
    if (requests.length > MAX_BATCH_SIZE) {
        throw new Error(`Too many fund codes (max ${MAX_BATCH_SIZE})`);
    }

    const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
    const settled = await mapWithConcurrency(requests, concurrency, async (req) => ({
        req,
        quote: await fetchMoneyDJNavQuote(req),
    }));

    return settled
        .filter((item): item is { req: FundNavRequest; quote: MoneyDJNavResult } => item.quote !== null)
        .map((item) => item.quote);
}

export function parseFundNavQuery(
    codesParam: string,
    scopesParam: string,
): FundNavRequest[] {
    const codes = codesParam.split(',').map((s) => s.trim()).filter(Boolean);
    const scopes = scopesParam.split(',').map((s) => s.trim()).filter(Boolean);

    if (codes.length === 0) {
        throw new Error('Query parameter "codes" is required');
    }
    if (scopes.length !== codes.length) {
        throw new Error('Query parameters "codes" and "scopes" must have the same length');
    }
    if (codes.length > MAX_BATCH_SIZE) {
        throw new Error(`Too many fund codes (max ${MAX_BATCH_SIZE})`);
    }

    return codes.map((fundCode, i) => {
        const scope = scopes[i];
        if (scope !== 'domestic' && scope !== 'offshore') {
            throw new Error(`Invalid scope "${scope}" for fund code "${fundCode}"`);
        }
        return { fundCode, navScope: scope };
    });
}
