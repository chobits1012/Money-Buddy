/**
 * Vercel serverless：必須自包含，不可 import 其他本地檔案（子目錄不會被打包）。
 * 共用邏輯副本見 api/lib/moneydjNav.ts（dev proxy / scripts 用）。
 */

type FundNavScope = 'domestic' | 'offshore';

interface FundNavRequest {
    fundCode: string;
    navScope: FundNavScope;
}

interface MoneyDJNavResult {
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

interface MoneyDJResultRow {
    V1?: string;
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

function parseMoneyDJCurrency(raw?: string): MoneyDJNavResult['currency'] {
    const value = (raw ?? '').trim();
    if (value.includes('台') || value.toUpperCase() === 'TWD') return 'TWD';
    if (value.includes('美') || value.toUpperCase() === 'USD') return 'USD';
    if (value.includes('歐') || value.toUpperCase() === 'EUR') return 'EUR';
    return 'OTHER';
}

function parseMoneyDJNavDate(raw?: string): string | undefined {
    if (!raw) return undefined;
    const match = raw.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
    if (!match) return undefined;
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseMoneyDJNavResponse(
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

async function fetchMoneyDJNavQuote(request: FundNavRequest): Promise<MoneyDJNavResult | null> {
    const tag = SCOPE_TO_TAG[request.navScope];
    const url = `${MONEYDJ_NAV_URL}?a=${encodeURIComponent(request.fundCode)}&x=${tag}`;

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const payload = (await res.json()) as MoneyDJResponse;
    if (payload.ResultSet?.StatusCode !== 0) return null;
    if ((payload.ResultSet.DataLength ?? 0) === 0) return null;

    return parseMoneyDJNavResponse(request.fundCode, payload);
}

function parseFundNavQuery(codesParam: string, scopesParam: string): FundNavRequest[] {
    const codes = codesParam.split(',').map((s) => s.trim()).filter(Boolean);
    const scopes = scopesParam.split(',').map((s) => s.trim()).filter(Boolean);

    if (codes.length === 0) throw new Error('Query parameter "codes" is required');
    if (scopes.length !== codes.length) {
        throw new Error('Query parameters "codes" and "scopes" must have the same length');
    }
    if (codes.length > 20) throw new Error('Too many fund codes (max 20)');

    return codes.map((fundCode, i) => {
        const scope = scopes[i];
        if (scope !== 'domestic' && scope !== 'offshore') {
            throw new Error(`Invalid scope "${scope}" for fund code "${fundCode}"`);
        }
        return { fundCode, navScope: scope };
    });
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const codes = req.query?.codes;
    const scopes = req.query?.scopes;

    if (!codes || typeof codes !== 'string') {
        return res.status(400).json({ error: 'Query parameter "codes" is required' });
    }
    if (!scopes || typeof scopes !== 'string') {
        return res.status(400).json({ error: 'Query parameter "scopes" is required' });
    }

    try {
        const requests = parseFundNavQuery(codes, scopes);
        const quotes = await Promise.all(requests.map((r) => fetchMoneyDJNavQuote(r)));
        const valid = quotes.filter((q): q is MoneyDJNavResult => q !== null);
        return res.status(200).json(valid);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch fund NAV';
        console.error('Fund NAV API Error:', error);
        return res.status(400).json({ error: message });
    }
}
