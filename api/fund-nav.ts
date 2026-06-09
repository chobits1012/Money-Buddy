import {
    fetchMoneyDJNavQuotes,
    parseFundNavQuery,
} from './lib/moneydjNav';

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
        const quotes = await fetchMoneyDJNavQuotes(requests);
        return res.status(200).json(quotes);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch fund NAV';
        console.error('Fund NAV API Error:', error);
        return res.status(400).json({ error: message });
    }
}
