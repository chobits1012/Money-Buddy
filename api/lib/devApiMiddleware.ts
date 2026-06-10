import type { IncomingMessage, ServerResponse } from 'http';
import { fetchMoneyDJNavQuotes, parseFundNavQuery } from './moneydjNav';
import { fetchYahooQuotes, searchYahooStocks } from './yahooApi';

function sendJson(res: ServerResponse, status: number, body: unknown): void {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
}

/** Vite dev server：與 Vercel serverless 共用同一套 handler 邏輯 */
export function createDevApiMiddleware() {
    return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url) {
            next();
            return;
        }

        const urlObj = new URL(req.url, `http://${req.headers.host}`);

        if (urlObj.pathname === '/api/search') {
            const q = urlObj.searchParams.get('q');
            if (!q) {
                sendJson(res, 400, { error: 'Missing q' });
                return;
            }
            try {
                sendJson(res, 200, await searchYahooStocks(q));
            } catch (err) {
                console.error('Yahoo search error:', err);
                sendJson(res, 500, { error: 'Proxy error' });
            }
            return;
        }

        if (urlObj.pathname === '/api/quote') {
            const symbols = urlObj.searchParams.get('symbols');
            if (!symbols) {
                sendJson(res, 400, { error: 'Missing symbols' });
                return;
            }
            try {
                sendJson(res, 200, await fetchYahooQuotes(symbols));
            } catch (err) {
                console.error('Yahoo quote error:', err);
                sendJson(res, 500, { error: 'Proxy error' });
            }
            return;
        }

        if (urlObj.pathname === '/api/fund-nav') {
            const codes = urlObj.searchParams.get('codes');
            const scopes = urlObj.searchParams.get('scopes');
            if (!codes || !scopes) {
                sendJson(res, 400, { error: 'Missing codes or scopes' });
                return;
            }
            try {
                const requests = parseFundNavQuery(codes, scopes);
                const quotes = await fetchMoneyDJNavQuotes(requests);
                sendJson(res, 200, quotes);
            } catch (err) {
                console.error('Fund NAV proxy error:', err);
                const message = err instanceof Error ? err.message : 'Proxy error';
                sendJson(res, 400, { error: message });
            }
            return;
        }

        next();
    };
}
