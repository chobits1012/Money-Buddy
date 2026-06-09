import fs from 'fs';
import path from 'path';

const TWSE_URL = 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
const OUT_DIR = path.join(process.cwd(), 'src', 'data');
const OUT_PATH = path.join(OUT_DIR, 'tw_stocks.json');
const TMP_PATH = `${OUT_PATH}.tmp`;
const META_PATH = path.join(OUT_DIR, 'tw_stocks.meta.json');

async function fetchTWStocks() {
    console.log('Fetching TWSE stock data...');
    const res = await fetch(TWSE_URL);
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Unexpected TWSE response: empty or non-array payload');
    }

    const stocks = data.map((item: { Code: string; Name: string }) => ({
        symbol: item.Code,
        name: item.Name.trim(),
    }));

    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    // 先寫暫存檔，成功後再覆蓋，避免 API 失敗時損壞既有清單
    fs.writeFileSync(TMP_PATH, JSON.stringify(stocks, null, 2));
    fs.renameSync(TMP_PATH, OUT_PATH);

    const meta = {
        source: 'TWSE',
        endpoint: 'exchangeReport/STOCK_DAY_ALL',
        updatedAt: new Date().toISOString(),
        count: stocks.length,
    };
    fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));

    console.log(`Successfully wrote ${stocks.length} stocks to ${OUT_PATH}`);
    console.log(`Metadata: ${META_PATH}`);
}

fetchTWStocks().catch((e) => {
    if (fs.existsSync(TMP_PATH)) {
        fs.unlinkSync(TMP_PATH);
    }
    console.warn('Failed to fetch TW stocks:', e);
    if (fs.existsSync(OUT_PATH)) {
        console.warn('Using existing tw_stocks.json for this build.');
        process.exit(0);
    }
    console.error('No existing tw_stocks.json to fall back on; build cannot continue.');
    process.exit(1);
});
