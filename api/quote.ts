/**
 * Vercel serverless：必須自包含，不可 import 其他本地檔案（子目錄不會被打包）。
 * 共用邏輯見 api/lib/yahooApi.ts（dev proxy / scripts 用）。
 */
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { symbols } = req.query;
    if (!symbols || typeof symbols !== 'string') {
        return res.status(400).json({ error: 'Query parameter "symbols" is required' });
    }

    try {
        const symbolArray = symbols.split(',').map((s) => s.trim());
        const quotes = await yahooFinance.quote(symbolArray);
        const results = Array.isArray(quotes) ? quotes : [quotes];

        const mapped = results.map((q) => ({
            symbol: q.symbol,
            price: q.regularMarketPrice,
            currency: q.currency,
        }));

        return res.status(200).json(mapped);
    } catch (error) {
        console.error('Yahoo Finance Quote API Error:', error);
        return res.status(500).json({ error: 'Failed to fetch quotes' });
    }
}
