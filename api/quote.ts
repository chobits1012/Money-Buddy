import { createGetHandler, requireQueryString } from './lib/vercelHandler';
import { fetchYahooQuotes } from './lib/yahooApi';

export default createGetHandler(async (query) => {
    const symbols = requireQueryString(query, 'symbols');
    const quotes = await fetchYahooQuotes(symbols);
    return { body: quotes };
});
