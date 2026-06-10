import { createGetHandler, requireQueryString } from './lib/vercelHandler';
import { fetchMoneyDJNavQuotes, parseFundNavQuery } from './lib/moneydjNav';

export default createGetHandler(async (query) => {
    const codes = requireQueryString(query, 'codes');
    const scopes = requireQueryString(query, 'scopes');

    try {
        const requests = parseFundNavQuery(codes, scopes);
        const quotes = await fetchMoneyDJNavQuotes(requests);
        return { body: quotes };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch fund NAV';
        console.error('Fund NAV API Error:', error);
        return { status: 400, body: { error: message } };
    }
});
