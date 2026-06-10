import { describe, expect, it } from 'vitest';
import {
    buildQuoteMapFromResponse,
    toYahooQuoteSymbols,
} from './quoteService';

describe('quoteService', () => {
    it('toYahooQuoteSymbols：台股加 .TW、美股維持原 symbol', () => {
        const symbols = toYahooQuoteSymbols([
            { type: 'TAIWAN_STOCK', symbol: '2330' },
            { type: 'US_STOCK', symbol: 'AAPL' },
            { type: 'TAIWAN_STOCK', symbol: '2330.TW' },
        ]);

        expect(symbols).toContain('2330.TW');
        expect(symbols).toContain('AAPL');
        expect(symbols.filter((s) => s === '2330.TW')).toHaveLength(1);
    });

    it('buildQuoteMapFromResponse：.TW 也映射回無後綴 symbol', () => {
        const map = buildQuoteMapFromResponse([
            { symbol: '2330.TW', price: 500 },
            { symbol: 'AAPL', price: 180 },
        ]);

        expect(map['2330.TW']).toBe(500);
        expect(map['2330']).toBe(500);
        expect(map['AAPL']).toBe(180);
    });
});
