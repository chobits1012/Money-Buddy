import { createGetHandler, requireQueryString } from './lib/vercelHandler';
import { searchYahooStocks } from './lib/yahooApi';

export default createGetHandler(async (query) => {
    const q = requireQueryString(query, 'q');
    const quotes = await searchYahooStocks(q);
    return { body: quotes };
});
