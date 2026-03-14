import fs from 'fs';
import path from 'path';

async function fetchTWStocks() {
    try {
        console.log('Fetching TWSE stock data...');
        const res = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const data = await res.json();
        const stocks = data.map((item: any) => ({
            symbol: item.Code,
            name: item.Name.trim()
        }));

        const outDir = path.join(process.cwd(), 'src', 'data');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }

        const outPath = path.join(outDir, 'tw_stocks.json');
        fs.writeFileSync(outPath, JSON.stringify(stocks, null, 2));
        console.log(`Successfully wrote ${stocks.length} stocks to ${outPath}`);
    } catch (e) {
        console.error('Failed to fetch TW stocks:', e);
    }
}

fetchTWStocks();
