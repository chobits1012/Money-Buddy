import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    yahooSearchPlugin(),
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
    // We use a custom plugin below for /api/search to bypass Yahoo's strict header/proxy blocks locally
  }
})

function yahooSearchPlugin() {
  return {
    name: 'yahoo-search-plugin',
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
            const targetUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&enableFuzzyQuery=false`;
            
            // Dynamic import of node-fetch or use native fetch if available in Node 18+
            const response = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                // Adding a fake referer/origin is sometimes needed
                'Origin': 'https://finance.yahoo.com',
                'Referer': 'https://finance.yahoo.com/'
              }
            });
            
            const data: any = await response.json();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data.quotes || []));
          } catch (err) {
            console.error('Yahoo proxy error:', err);
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
