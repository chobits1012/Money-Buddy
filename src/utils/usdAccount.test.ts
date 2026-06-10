import { describe, expect, it } from 'vitest';
import { resolveUsdAccountBalance, syncUsdAccountFields } from './usdAccount';

describe('usdAccount', () => {
    it('resolveUsdAccountBalance picks the higher of legacy fields', () => {
        expect(resolveUsdAccountBalance({ usdAccountCash: 100, usStockFundPool: 200 })).toBe(200);
        expect(resolveUsdAccountBalance({ usdAccountCash: 300, usStockFundPool: 150 })).toBe(300);
    });

    it('syncUsdAccountFields mirrors both columns', () => {
        expect(syncUsdAccountFields(1250)).toEqual({
            usdAccountCash: 1250,
            usStockFundPool: 1250,
        });
        expect(syncUsdAccountFields(-5)).toEqual({
            usdAccountCash: 0,
            usStockFundPool: 0,
        });
    });
});
