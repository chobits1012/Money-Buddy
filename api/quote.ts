import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { symbols } = req.query;
    if (!symbols || typeof symbols !== 'string') {
        return res.status(400).json({ error: 'Query parameter "symbols" is required' });
    }

    try {
        const symbolArray = symbols.split(',').map(s => s.trim());
        const quotes = await yahooFinance.quote(symbolArray);
        
        // yahooFinance.quote returns an array if passed an array, 
        // but if passed a single string or 1 item, it might return a single object or array depending on version. 
        // We'll normalize it to an array.
        const results = Array.isArray(quotes) ? quotes : [quotes];

        const mapped = results.map((q: any) => ({
            symbol: q.symbol,
            price: q.regularMarketPrice,
            currency: q.currency,
        }));

        return res.status(200).json(mapped);
    } catch (error: any) {
        console.error('Yahoo Finance Quote API Error:', error);
        return res.status(500).json({ error: 'Failed to fetch quotes' });
    }
}
