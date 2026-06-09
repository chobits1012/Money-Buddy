/** 離線 fallback：EUR/TWD（略低於近年均值，保守估算台幣現值） */
export const DEFAULT_EXCHANGE_RATE_EUR = 34.5;
export const DEFAULT_EXCHANGE_RATE_USD = 31;

interface QuoteResponse {
    symbol: string;
    price: number;
}

function parseQuotePrice(quotes: QuoteResponse[], symbol: string): number | null {
    const quote = quotes.find((item) => item.symbol === symbol);
    const price = quote?.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
    return Math.round(price * 100) / 100;
}

/** 聯網抓取 EUR/TWD；失敗時回傳 null，呼叫端沿用既有匯率或常數 */
export async function fetchEurTwdRate(): Promise<number | null> {
    const rates = await fetchLiveExchangeRates();
    return rates.eur;
}

export async function fetchUsdTwdRate(): Promise<number | null> {
    const rates = await fetchLiveExchangeRates();
    return rates.usd;
}

/** 一次抓取 USD/TWD、EUR/TWD */
export async function fetchLiveExchangeRates(): Promise<{ usd: number | null; eur: number | null }> {
    try {
        const res = await fetch('/api/quote?symbols=USDTWD%3DX,EURTWD%3DX');
        if (!res.ok) return { usd: null, eur: null };

        const quotes = (await res.json()) as QuoteResponse[];
        return {
            usd: parseQuotePrice(quotes, 'USDTWD=X'),
            eur: parseQuotePrice(quotes, 'EURTWD=X'),
        };
    } catch {
        return { usd: null, eur: null };
    }
}
