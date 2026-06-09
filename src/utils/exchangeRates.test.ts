import { describe, expect, it } from 'vitest';
import { DEFAULT_EXCHANGE_RATE_EUR } from './exchangeRates';

describe('exchangeRates', () => {
    it('uses conservative EUR/TWD fallback when offline', () => {
        expect(DEFAULT_EXCHANGE_RATE_EUR).toBe(34.5);
    });
});
