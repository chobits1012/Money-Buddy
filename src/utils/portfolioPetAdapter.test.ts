import { describe, expect, it } from 'vitest';
import {
    buildPetCourtyardViewModel,
    resolveCompanionMood,
    resolveCompanionScale,
} from './portfolioPetAdapter';
import type { AssetPool, AssetType, StockHolding } from '../types';

const emptyAssetTotals = (): Record<AssetType, number> => ({
    TAIWAN_STOCK: 0,
    US_STOCK: 0,
    FUNDS: 0,
    CRYPTO: 0,
});

const makePool = (overrides: Partial<AssetPool>): AssetPool => ({
    id: 'pool-1',
    name: '成長軍團',
    allocatedBudget: 500_000,
    currentCash: 100_000,
    type: 'TAIWAN_STOCK',
    companionId: 'corgi',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

const makeHolding = (overrides: Partial<StockHolding>): StockHolding => ({
    id: 'h-1',
    type: 'TAIWAN_STOCK',
    name: 'test',
    purchases: [],
    shares: 0,
    avgPrice: 0,
    totalAmount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

describe('portfolioPetAdapter', () => {
    it('maps pools to companions within zones', () => {
        const view = buildPetCourtyardViewModel({
            holdings: [
                makeHolding({ id: 'h-tw', poolId: 'pool-tw', totalAmount: 400_000, unrealizedPnL: 20_000 }),
            ],
            pools: [makePool({ id: 'pool-tw', name: '台股主力', companionId: 'corgi' })],
            assetTotals: {
                ...emptyAssetTotals(),
                TAIWAN_STOCK: 500_000,
            },
            totalUnrealizedPnL: 20_000,
            isLoadingQuotes: false,
            exchangeRateUSD: 32,
        });

        const dogZone = view.zones.find((z) => z.assetType === 'TAIWAN_STOCK');
        expect(dogZone?.zoneLabel).toContain('狗區');
        expect(dogZone?.companions).toHaveLength(1);
        expect(dogZone?.companions[0]).toMatchObject({
            displayName: '台股主力',
            companionId: 'corgi',
            breedLabel: '柯基',
            family: 'dog',
            holdingsRoute: '/holdings/taiwan?pool=pool-tw',
        });
        expect(dogZone?.companions[0]?.companionMessage).toContain('台股主力');
    });

    it('adds stray companion for unassigned holdings', () => {
        const view = buildPetCourtyardViewModel({
            holdings: [
                makeHolding({ id: 'h-stray', totalAmount: 200_000, unrealizedPnL: -5_000 }),
            ],
            pools: [],
            assetTotals: {
                ...emptyAssetTotals(),
                TAIWAN_STOCK: 200_000,
            },
            totalUnrealizedPnL: -5_000,
            isLoadingQuotes: false,
            exchangeRateUSD: 32,
        });

        const dogZone = view.zones.find((z) => z.assetType === 'TAIWAN_STOCK');
        expect(dogZone?.companions).toHaveLength(1);
        expect(dogZone?.companions[0]).toMatchObject({
            isStray: true,
            displayName: '流浪犬',
            family: 'dog',
        });
    });

    it('shows placeholder when no pools and no stray holdings', () => {
        const view = buildPetCourtyardViewModel({
            holdings: [],
            pools: [],
            assetTotals: emptyAssetTotals(),
            totalUnrealizedPnL: 0,
            isLoadingQuotes: false,
            exchangeRateUSD: 32,
        });

        const fundZone = view.zones.find((z) => z.assetType === 'FUNDS');
        expect(fundZone?.companions).toHaveLength(1);
        expect(fundZone?.companions[0]).toMatchObject({
            isPlaceholder: true,
            statusLabel: '尚未建立軍團',
            family: 'pig',
        });
    });

    it('derives mood from unrealized PnL ratio', () => {
        expect(resolveCompanionMood(100_000, 5_000, 'TWD', 32, false)).toBe('happy');
        expect(resolveCompanionMood(100_000, -5_000, 'TWD', 32, false)).toBe('sad');
        expect(resolveCompanionMood(100_000, 500, 'TWD', 32, false)).toBe('neutral');
        expect(resolveCompanionMood(100_000, 0, 'TWD', 32, true)).toBe('sleepy');
    });

    it('scales companion size by zone allocation percent', () => {
        expect(resolveCompanionScale(0)).toBe(0.7);
        expect(resolveCompanionScale(100)).toBe(1.3);
        expect(resolveCompanionScale(50)).toBe(1);
    });
});
