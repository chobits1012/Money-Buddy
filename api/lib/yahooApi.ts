/** 僅供本地 dev middleware / scripts 使用；Vercel 上的 api/*.ts 必須自包含。 */
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface YahooQuoteResult {
    symbol: string;
    price: number;
    currency: string;
}

export async function searchYahooStocks(query: string): Promise<unknown[]> {
    const results = await yahooFinance.search(query, {
        quotesCount: 10,
        newsCount: 0,
        enableFuzzyQuery: false,
    });
    return (results as { quotes?: unknown[] }).quotes || [];
}

export async function fetchYahooQuotes(symbolsParam: string): Promise<YahooQuoteResult[]> {
    const symbolArray = symbolsParam.split(',').map((s) => s.trim());
    const quotes = await yahooFinance.quote(symbolArray);
    const results = Array.isArray(quotes) ? quotes : [quotes];
    return results.map((q) => ({
        symbol: q.symbol,
        price: q.regularMarketPrice,
        currency: q.currency,
    }));
}
