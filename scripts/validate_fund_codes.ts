import fs from 'fs';
import path from 'path';
import { FUND_CODE_SEED } from './fund_code_seed';
import { fetchMoneyDJNavQuote } from '../api/lib/moneydjNav';
import type { FundCatalogEntry } from '../src/utils/fundCatalog';

const FUNDS_PATH = path.join(process.cwd(), 'src', 'data', 'funds.json');

interface CatalogEntry extends FundCatalogEntry {}

async function main() {
    const catalog = JSON.parse(fs.readFileSync(FUNDS_PATH, 'utf-8')) as CatalogEntry[];
    const verified: Array<{ symbol: string; fundCode: string; navScope: 'domestic' | 'offshore'; apiName: string }> = [];
    const failed: Array<{ symbol: string; name: string; reason: string }> = [];

    for (const entry of catalog) {
        const seed = FUND_CODE_SEED[entry.symbol];
        if (!seed) {
            failed.push({ symbol: entry.symbol, name: entry.name, reason: 'no seed' });
            continue;
        }

        const navScope = seed.navScope ?? (entry.exchDisp === 'Global Fund' ? 'offshore' : 'domestic');
        const quote = await fetchMoneyDJNavQuote({ fundCode: seed.fundCode, navScope });
        if (!quote) {
            failed.push({ symbol: entry.symbol, name: entry.name, reason: `invalid code ${seed.fundCode}` });
            continue;
        }

        verified.push({
            symbol: entry.symbol,
            fundCode: seed.fundCode,
            navScope,
            apiName: quote.fundName ?? '',
        });
    }

    console.log(`Verified: ${verified.length}/${catalog.length}`);
    for (const item of verified) {
        console.log(`  OK  ${item.symbol} ${item.fundCode} (${item.navScope}) -> ${item.apiName}`);
    }
    console.log(`Failed: ${failed.length}`);
    for (const item of failed) {
        console.log(`  FAIL ${item.symbol} ${item.name} (${item.reason})`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
