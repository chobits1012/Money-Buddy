import { describe, expect, it } from 'vitest';
import type { StockHolding } from '../types';
import {
    mergeDuplicateHoldings,
    pickCanonicalHoldingName,
    resolveHoldingSymbol,
} from './mergeDuplicateHoldings';

const purchase = (id: string, shares: number, cost: number) => ({
    id,
    date: '2026-06-01T00:00:00.000Z',
    action: 'BUY' as const,
    shares,
    pricePerShare: cost / shares,
    totalCost: cost,
    updatedAt: '2026-06-01T00:00:00.000Z',
});

const holding = (overrides: Partial<StockHolding>): StockHolding => ({
    id: 'h1',
    type: 'TAIWAN_STOCK',
    name: '群益台灣精選高息 (00919)',
    symbol: '00919',
    purchases: [purchase('p1', 1000, 30000)],
    shares: 1000,
    avgPrice: 30,
    totalAmount: 30000,
    poolId: 'pool-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

describe('resolveHoldingSymbol', () => {
    it('reads symbol from name when symbol field is missing', () => {
        expect(
            resolveHoldingSymbol(
                holding({ symbol: undefined, name: '群益台灣精選高息 (00919)' }),
            ),
        ).toBe('00919');
    });
});

describe('pickCanonicalHoldingName', () => {
    it('prefers single-suffix name over double-suffix', () => {
        const name = pickCanonicalHoldingName(
            [
                holding({ name: '群益台灣精選高息 (00919)' }),
                holding({ id: 'h2', name: '群益台灣精選高息 (00919) (00919)' }),
            ],
            '00919',
        );
        expect(name).toBe('群益台灣精選高息 (00919)');
    });
});

describe('mergeDuplicateHoldings', () => {
    it('merges same symbol in same pool without cash side effects', () => {
        const original = holding({
            id: 'h-original',
            purchases: [
                purchase('p1', 20000, 460000),
                purchase('p2', 1000, 30000),
                purchase('p3', 1000, 30000),
                purchase('p4', 1000, 30000),
                purchase('p5', 1000, 30000),
                purchase('p6', 1000, 30000),
            ],
            shares: 20000,
            totalAmount: 460000,
        });
        const duplicate = holding({
            id: 'h-dup',
            name: '群益台灣精選高息 (00919) (00919)',
            purchases: [purchase('p-dup', 1000, 29990)],
            shares: 1000,
            totalAmount: 29990,
            createdAt: '2026-06-16T00:00:00.000Z',
        });

        const result = mergeDuplicateHoldings([original, duplicate]);

        expect(result.mergedCount).toBe(1);
        expect(result.removedHoldingIds).toEqual(['h-dup']);

        const merged = result.holdings.find((h) => h.id === 'h-original' && !h.deletedAt)!;
        expect(merged.name).toBe('群益台灣精選高息 (00919)');
        expect(merged.purchases).toHaveLength(7);
        expect(merged.shares).toBe(26000);
        expect(merged.totalAmount).toBe(639990);

        const removed = result.holdings.find((h) => h.id === 'h-dup');
        expect(removed?.deletedAt).toBeTruthy();
    });

    it('does not merge holdings in different pools', () => {
        const a = holding({ id: 'h1', poolId: 'pool-1' });
        const b = holding({ id: 'h2', poolId: 'pool-2' });
        const result = mergeDuplicateHoldings([a, b]);
        expect(result.mergedCount).toBe(0);
    });

    it('is idempotent on second run', () => {
        const first = mergeDuplicateHoldings([
            holding({ id: 'h-original' }),
            holding({ id: 'h-dup', name: '群益台灣精選高息 (00919) (00919)' }),
        ]);
        const second = mergeDuplicateHoldings(first.holdings);
        expect(second.mergedCount).toBe(0);
    });
});
