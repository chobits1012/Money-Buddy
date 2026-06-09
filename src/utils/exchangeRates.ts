/** 離線 fallback：EUR/TWD（略低於近年均值，保守估算台幣現值） */
export const DEFAULT_EXCHANGE_RATE_EUR = 34.5;

interface QuoteResponse {
    symbol: string;
    price: number;
}

/** 聯網抓取 EUR/TWD；失敗時回傳 null，呼叫端沿用既有匯率或常數 */
export async function fetchEurTwdRate(): Promise<number | null> {
    try {
        const res = await fetch('/api/quote?symbols=EURTWD%3DX');
        if (!res.ok) return null;

        const quotes = (await res.json()) as QuoteResponse[];
        const price = quotes[0]?.price;
        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
            return null;
        }

        return Math.round(price * 100) / 100;
    } catch {
        return null;
    }
}
