import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    localApiPlugin(),
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '個人理財追蹤',
        short_name: '理財儀表板',
        description: '個人專屬資金控管中心與資產配置儀表板',
        theme_color: '#f2f0ed',
        background_color: '#f2f0ed',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // API served via custom plugin locally
  }
})

function localApiPlugin() {
  return {
    name: 'local-api-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.startsWith('/api/search')) {
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          const q = urlObj.searchParams.get('q');
          if (!q) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing q' }));
          }
          try {
            const results = await yahooFinance.search(q, {
              quotesCount: 10,
              newsCount: 0,
              enableFuzzyQuery: false,
            });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify((results as any).quotes || []));
          } catch (err) {
            console.error('Yahoo search error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Proxy error' }));
          }
          return;
        }

        if (req.url?.startsWith('/api/quote')) {
          const urlObj = new URL(req.url, `http://${req.headers.host}`);
          const symbolsStr = urlObj.searchParams.get('symbols');
          if (!symbolsStr) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Missing symbols' }));
          }
          try {
            const symbolArray = symbolsStr.split(',').map(s => s.trim());
            const quotes = await yahooFinance.quote(symbolArray);
            const results = Array.isArray(quotes) ? quotes : [quotes];
            const mapped = results.map((q: any) => ({
                symbol: q.symbol,
                price: q.regularMarketPrice,
                currency: q.currency,
            }));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(mapped));
          } catch (err) {
            console.error('Yahoo quote error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Proxy error' }));
          }
          return;
        }
        next();
      });
    }
  }
}
