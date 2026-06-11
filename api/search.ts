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

    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        const results = await yahooFinance.search(q, {
            quotesCount: 10,
            newsCount: 0,
            enableFuzzyQuery: false,
        });

        return res.status(200).json((results as { quotes?: unknown[] }).quotes || []);
    } catch (error) {
        console.error('Yahoo Finance Search API Error:', error);
        return res.status(500).json({ error: 'Failed to fetch search results' });
    }
}
