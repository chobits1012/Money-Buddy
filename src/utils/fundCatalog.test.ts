import { describe, expect, it } from 'vitest';
import { buildUserFundEntries, searchFunds, type FundCatalogEntry } from './fundCatalog';

const catalog: FundCatalogEntry[] = [
    { symbol: 'ALLIANZ-TW-BIG', name: '安聯台灣大壩', keywords: ['大壩'] },
    { symbol: 'UNI-PENTIUM', name: '統一奔騰基金', keywords: ['奔騰'] },
];

describe('fundCatalog', () => {
    it('matches fund by keyword alias', () => {
        const results = searchFunds('奔騰', catalog, []);
        expect(results).toHaveLength(1);
        expect(results[0]?.name).toBe('統一奔騰基金');
    });

    it('prioritizes user holdings over catalog duplicates', () => {
        const userFunds = buildUserFundEntries([{ name: '安聯台灣大壩', symbol: 'MY-BIG' }]);
        const results = searchFunds('安聯', catalog, userFunds);
        expect(results[0]?.source).toBe('holding');
        expect(results[0]?.exchDisp).toBe('我的基金');
    });
});
