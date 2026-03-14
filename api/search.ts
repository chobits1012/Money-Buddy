export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { q } = req.query;
    if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
        const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!response.ok) {
            throw new Error(`Yahoo API responded with status: ${response.status}`);
        }

        const data = await response.json();
        
        // Return matching items from quotes
        return res.status(200).json(data.quotes || []);
    } catch (error: any) {
        console.error('Yahoo Finance Search API Error:', error);
        return res.status(500).json({ error: 'Failed to fetch search results' });
    }
}
