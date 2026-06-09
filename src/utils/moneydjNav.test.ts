import { describe, expect, it } from 'vitest';
import {
    parseFundNavQuery,
    parseMoneyDJCurrency,
    parseMoneyDJNavDate,
    parseMoneyDJNavResponse,
    scopeFromExchDisp,
} from './moneydjNav';

describe('moneydjNav', () => {
    it('parses NAV date to ISO format', () => {
        expect(parseMoneyDJNavDate('2026/05/28')).toBe('2026-05-28');
        expect(parseMoneyDJNavDate('invalid')).toBeUndefined();
    });

    it('parses currency labels', () => {
        expect(parseMoneyDJCurrency('台幣')).toBe('TWD');
        expect(parseMoneyDJCurrency('美元')).toBe('USD');
        expect(parseMoneyDJCurrency('歐元')).toBe('EUR');
    });

    it('parses wr02 API payload', () => {
        const result = parseMoneyDJNavResponse('ACDD01', {
            ResultSet: {
                StatusCode: 0,
                DataLength: 1,
                Result: [{
                    V1: '2026/05/28',
                    V3: '安聯台灣大壩基金-A累積型(台幣)',
                    V4: '331.64',
                    V10: '台幣',
                }],
            },
        });

        expect(result).toEqual({
            fundCode: 'ACDD01',
            nav: 331.64,
            navDate: '2026-05-28',
            currency: 'TWD',
            fundName: '安聯台灣大壩基金-A累積型(台幣)',
        });
    });

    it('maps exchDisp to nav scope', () => {
        expect(scopeFromExchDisp('TW Fund')).toBe('domestic');
        expect(scopeFromExchDisp('Global Fund')).toBe('offshore');
    });

    it('parses fund-nav query params', () => {
        const requests = parseFundNavQuery('ACDD01,TLH43', 'domestic,offshore');
        expect(requests).toEqual([
            { fundCode: 'ACDD01', navScope: 'domestic' },
            { fundCode: 'TLH43', navScope: 'offshore' },
        ]);
    });
});
