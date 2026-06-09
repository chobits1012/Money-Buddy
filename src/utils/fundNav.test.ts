import { describe, expect, it } from 'vitest';
import { resolveFundCode, resolveFundNavTarget, shouldApplyFundNavUpdate } from './fundNav';

describe('fundNav', () => {
    it('resolves fund code from catalog symbol', () => {
        expect(resolveFundCode('ALLIANZ-TW-BIG', '安聯台灣大壩')).toBe('ACDD01');
    });

    it('resolves fund nav target with scope', () => {
        expect(resolveFundNavTarget('ALLIANZ-AI', '安聯 AI')).toEqual({
            fundCode: 'TLH43',
            navScope: 'offshore',
        });
    });

    it('resolves new ESG EUR fund from catalog', () => {
        expect(resolveFundNavTarget('ALLIANZ-GLOBAL-ESG-EUR', '安聯全球永續發展Ａ配息歐元')).toEqual({
            fundCode: 'TLZ58',
            navScope: 'offshore',
        });
    });

    it('does not overwrite newer manual NAV date', () => {
        expect(shouldApplyFundNavUpdate('2026-05-28', '2026-05-27')).toBe(false);
        expect(shouldApplyFundNavUpdate('2026-05-28', '2026-05-28')).toBe(true);
        expect(shouldApplyFundNavUpdate(undefined, '2026-05-27')).toBe(true);
    });
});
