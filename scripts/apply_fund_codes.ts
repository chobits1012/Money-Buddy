/**
 * 驗證 fundCode 並寫入 src/data/funds.json（僅通過名稱比對的項目）
 *
 * 用法: npx tsx scripts/apply_fund_codes.ts
 */
import fs from 'fs';
import path from 'path';
import { FUND_CODE_SEED } from './fund_code_seed';
import { fetchMoneyDJNavQuote } from '../src/utils/moneydjNav';
import type { FundCatalogEntry } from '../src/utils/fundCatalog';

const FUNDS_PATH = path.join(process.cwd(), 'src', 'data', 'funds.json');
const META_PATH = path.join(process.cwd(), 'src', 'data', 'funds.meta.json');

function normalizeName(value: string): string {
    return value
        .replace(/\s+/g, '')
        .replace(/基金/g, '')
        .toLowerCase();
}

const CJK_PARTS = /(台灣|全球|美國|日本|歐洲|歐陸|亞洲|科技|高股息|高息|成長|收益|半導體|奔騰|黑馬|全天候|標普|納斯達克|人工智慧|股信|精選|永續)/g;

function tokenize(name: string): string[] {
    const expanded = name.replace(/基金/g, ' ').replace(CJK_PARTS, ' $1 ');
    return expanded
        .split(/[^a-zA-Z0-9\u4e00-\u9fff]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
}

function matchesFundName(
    catalogName: string,
    apiName: string,
    keywords: string[] = [],
): boolean {
    const cat = normalizeName(catalogName);
    const api = normalizeName(apiName);

    if (api.includes(cat) || cat.includes(api)) return true;

    const catCore = catalogName.replace(/基金$/, '').trim();
    if (catCore.length >= 3 && api.includes(normalizeName(catCore))) return true;

    if (catalogName.includes('高股息') && apiName.includes('高息')) return true;
    if (catalogName.includes('股信') && apiName.includes('股票')) return true;
    if (catalogName.includes('金鼎') && apiName.includes('中小型')) return true;
    if (catalogName.includes('歐洲') && apiName.includes('歐陸')) return true;

    const tokens = [...tokenize(catalogName), ...keywords.map((k) => k.trim())];
    const matched = tokens.filter((token) => {
        const key = normalizeName(token);
        return key.length >= 2 && api.includes(key);
    });

    if (matched.length >= 2) return true;
    if (tokens.length <= 2 && matched.length >= 1) return true;

    return false;
}

async function main() {
    const catalog = JSON.parse(fs.readFileSync(FUNDS_PATH, 'utf-8')) as FundCatalogEntry[];
    const applied: string[] = [];
    const skipped: string[] = [];

    const updated: FundCatalogEntry[] = [];

    for (const entry of catalog) {
        const seed = FUND_CODE_SEED[entry.symbol];
        if (!seed) {
            const { fundCode: _removed, navScope: _nav, ...rest } = entry;
            skipped.push(`${entry.symbol}: no seed`);
            updated.push(rest as FundCatalogEntry);
            continue;
        }

        const navScope = seed.navScope ?? (entry.exchDisp === 'Global Fund' ? 'offshore' : 'domestic');
        await new Promise((r) => setTimeout(r, 150));
        const quote = await fetchMoneyDJNavQuote({ fundCode: seed.fundCode, navScope });

        if (!quote?.fundName) {
            skipped.push(`${entry.symbol}: API empty (${seed.fundCode})`);
            const { fundCode: _removed, navScope: _nav, ...rest } = entry;
            updated.push(rest as FundCatalogEntry);
            continue;
        }

        if (!matchesFundName(entry.name, quote.fundName, entry.keywords ?? [])) {
            skipped.push(
                `${entry.symbol}: name mismatch "${entry.name}" vs "${quote.fundName}"`,
            );
            const { fundCode: _removed, navScope: _nav, ...rest } = entry;
            updated.push(rest as FundCatalogEntry);
            continue;
        }

        applied.push(`${entry.symbol} → ${seed.fundCode} (${quote.fundName})`);
        updated.push({
            ...entry,
            fundCode: seed.fundCode,
            navScope,
        });
    }

    fs.writeFileSync(FUNDS_PATH, `${JSON.stringify(updated, null, 2)}\n`);

    const meta = {
        source: 'local-curated',
        updatedAt: new Date().toISOString(),
        count: updated.length,
        phase: 'C',
        navSource: 'MoneyDJ',
        fundCodesApplied: applied.length,
        note: 'fundCode 經 API + 名稱比對驗證後寫入',
    };
    fs.writeFileSync(META_PATH, `${JSON.stringify(meta, null, 2)}\n`);

    console.log(`Applied ${applied.length}/${catalog.length} fund codes`);
    applied.forEach((line) => console.log(`  ✓ ${line}`));
    console.log(`Skipped ${skipped.length}`);
    skipped.forEach((line) => console.log(`  ✗ ${line}`));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
