import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

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

        // The quotes are inside results.quotes
        return res.status(200).json((results as any).quotes || []);
    } catch (error: any) {
        console.error('Yahoo Finance Search API Error:', error);
        return res.status(500).json({ error: 'Failed to fetch search results' });
    }
}
