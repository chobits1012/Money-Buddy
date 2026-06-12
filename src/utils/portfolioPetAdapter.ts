import type { AssetPool, AssetType, StockHolding } from '../types';
import type {
    CompanionAvatarViewModel,
    CompanionMood,
    CourtyardZoneViewModel,
    PetCourtyardViewModel,
} from '../types/petDashboard';
import { ASSET_LABELS } from './constants';
import {
    ANIMAL_FAMILIES,
    COURTYARD_ASSET_TYPES,
    resolveCompanionBreed,
    type CourtyardAssetType,
} from './companionRegistry';
import { buildCompanionMessage } from './companionMessages';
import { filterActive } from './entityActive';
import { buildHoldingsRoute } from './holdingRoutes';
import { summarizeMarketPoolReturns } from './poolReturnMetrics';

const SCALE_MIN = 0.7;
const SCALE_MAX = 1.3;
const MOOD_THRESHOLD = 0.01;

export interface PetAdapterInput {
    holdings: StockHolding[];
    pools: AssetPool[];
    assetTotals: Record<AssetType, number>;
    totalUnrealizedPnL: number;
    isLoadingQuotes: boolean;
    exchangeRateUSD: number;
}

export function resolveCompanionMood(
    marketValueTWD: number,
    unrealizedPnL: number,
    pnlCurrency: 'TWD' | 'USD',
    exchangeRateUSD: number,
    isLoadingQuotes: boolean,
): CompanionMood {
    if (isLoadingQuotes) return 'sleepy';
    if (marketValueTWD <= 0) return 'neutral';

    const pnlTWD = pnlCurrency === 'USD'
        ? unrealizedPnL * exchangeRateUSD
        : unrealizedPnL;
    const ratio = pnlTWD / marketValueTWD;

    if (ratio > MOOD_THRESHOLD) return 'happy';
    if (ratio < -MOOD_THRESHOLD) return 'sad';
    return 'neutral';
}

export function resolveCompanionScale(allocationPercent: number): number {
    const normalized = Math.max(0, Math.min(100, allocationPercent));
    const scale = SCALE_MIN + (normalized / 100) * (SCALE_MAX - SCALE_MIN);
    return Math.round(scale * 100) / 100;
}

/** @deprecated 沿用舊測試名稱 */
export const resolveDogMood = resolveCompanionMood;
/** @deprecated 沿用舊測試名稱 */
export const resolveDogScale = resolveCompanionScale;

interface PoolMarketSnapshot {
    marketValueTWD: number;
    unrealizedPnL: number;
    pnlCurrency: 'TWD' | 'USD';
}

function calcPoolMarketSnapshot(
    pool: AssetPool,
    holdings: StockHolding[],
    exchangeRateUSD: number,
): PoolMarketSnapshot {
    const poolHoldings = holdings.filter((h) => h.poolId === pool.id);
    if (pool.type === 'US_STOCK') {
        const holdingsUSD = poolHoldings.reduce((sum, h) => sum + (h.totalAmountUSD || 0), 0);
        const unrealizedUSD = poolHoldings.reduce((sum, h) => sum + (h.unrealizedPnL || 0), 0);
        const totalUSD = holdingsUSD + pool.currentCash;
        return {
            marketValueTWD: Math.round(totalUSD * exchangeRateUSD),
            unrealizedPnL: unrealizedUSD,
            pnlCurrency: 'USD',
        };
    }

    const holdingsTWD = poolHoldings.reduce((sum, h) => sum + h.totalAmount, 0);
    const unrealizedTWD = poolHoldings.reduce((sum, h) => sum + (h.unrealizedPnL || 0), 0);
    return {
        marketValueTWD: Math.round(holdingsTWD + pool.currentCash),
        unrealizedPnL: unrealizedTWD,
        pnlCurrency: 'TWD',
    };
}

function calcStrayMarketSnapshot(
    holdings: StockHolding[],
    assetType: CourtyardAssetType,
    exchangeRateUSD: number,
): PoolMarketSnapshot {
    const strayHoldings = holdings.filter((h) => h.type === assetType && !h.poolId);
    if (assetType === 'US_STOCK') {
        const holdingsUSD = strayHoldings.reduce((sum, h) => sum + (h.totalAmountUSD || 0), 0);
        const unrealizedUSD = strayHoldings.reduce((sum, h) => sum + (h.unrealizedPnL || 0), 0);
        return {
            marketValueTWD: Math.round(holdingsUSD * exchangeRateUSD),
            unrealizedPnL: unrealizedUSD,
            pnlCurrency: 'USD',
        };
    }

    const holdingsTWD = strayHoldings.reduce((sum, h) => sum + h.totalAmount, 0);
    const unrealizedTWD = strayHoldings.reduce((sum, h) => sum + (h.unrealizedPnL || 0), 0);
    return {
        marketValueTWD: Math.round(holdingsTWD),
        unrealizedPnL: unrealizedTWD,
        pnlCurrency: 'TWD',
    };
}

function finalizeCompanion(
    companion: Omit<CompanionAvatarViewModel, 'companionMessage' | 'allocationPercent' | 'scale'> & {
        allocationPercent?: number;
        scale?: number;
    },
): CompanionAvatarViewModel {
    const allocationPercent = companion.allocationPercent ?? 0;
    const scale = companion.scale ?? SCALE_MIN;
    const base = {
        ...companion,
        allocationPercent,
        scale,
    };
    return {
        ...base,
        companionMessage: buildCompanionMessage(base),
    };
}

function applyZoneScales(
    companions: Omit<CompanionAvatarViewModel, 'companionMessage'>[],
): CompanionAvatarViewModel[] {
    const zoneTotal = companions.reduce(
        (sum, c) => sum + (c.isPlaceholder ? 0 : c.marketValueTWD),
        0,
    );

    return companions.map((companion) => {
        if (companion.isPlaceholder) {
            return finalizeCompanion({ ...companion, allocationPercent: 0, scale: SCALE_MIN });
        }
        const allocationPercent = zoneTotal > 0
            ? Math.round((companion.marketValueTWD / zoneTotal) * 1000) / 10
            : 0;
        return finalizeCompanion({
            ...companion,
            allocationPercent,
            scale: resolveCompanionScale(allocationPercent),
        });
    });
}

function buildPoolCompanion(
    pool: AssetPool,
    holdings: StockHolding[],
    input: PetAdapterInput,
): Omit<CompanionAvatarViewModel, 'companionMessage'> {
    const assetType = pool.type as CourtyardAssetType;
    const familyDef = ANIMAL_FAMILIES[assetType];
    const breed = resolveCompanionBreed(assetType, pool.companionId);
    const market = calcPoolMarketSnapshot(pool, holdings, input.exchangeRateUSD);

    return {
        id: pool.id,
        poolId: pool.id,
        assetType,
        family: familyDef.family,
        companionId: breed.id,
        breedLabel: breed.label,
        displayName: pool.name,
        mood: resolveCompanionMood(
            market.marketValueTWD,
            market.unrealizedPnL,
            market.pnlCurrency,
            input.exchangeRateUSD,
            input.isLoadingQuotes,
        ),
        color: breed.color,
        scale: SCALE_MIN,
        allocationPercent: 0,
        marketValueTWD: market.marketValueTWD,
        unrealizedPnL: market.unrealizedPnL,
        pnlCurrency: market.pnlCurrency,
        holdingsRoute: buildHoldingsRoute(assetType, pool.id),
        isStray: false,
        isPlaceholder: false,
    };
}

function buildStrayCompanion(
    assetType: CourtyardAssetType,
    holdings: StockHolding[],
    input: PetAdapterInput,
): Omit<CompanionAvatarViewModel, 'companionMessage'> {
    const familyDef = ANIMAL_FAMILIES[assetType];
    const breed = resolveCompanionBreed(assetType, familyDef.strayBreedId);
    const market = calcStrayMarketSnapshot(holdings, assetType, input.exchangeRateUSD);

    return {
        id: `stray-${assetType}`,
        assetType,
        family: familyDef.family,
        companionId: breed.id,
        breedLabel: breed.label,
        displayName: familyDef.strayLabel,
        mood: resolveCompanionMood(
            market.marketValueTWD,
            market.unrealizedPnL,
            market.pnlCurrency,
            input.exchangeRateUSD,
            input.isLoadingQuotes,
        ),
        color: breed.color,
        scale: SCALE_MIN,
        allocationPercent: 0,
        marketValueTWD: market.marketValueTWD,
        unrealizedPnL: market.unrealizedPnL,
        pnlCurrency: market.pnlCurrency,
        holdingsRoute: buildHoldingsRoute(assetType),
        isStray: true,
        isPlaceholder: false,
    };
}

function buildPlaceholderCompanion(
    assetType: CourtyardAssetType,
): Omit<CompanionAvatarViewModel, 'companionMessage'> {
    const familyDef = ANIMAL_FAMILIES[assetType];
    const breed = resolveCompanionBreed(assetType, familyDef.defaultBreedId);

    return {
        id: `placeholder-${assetType}`,
        assetType,
        family: familyDef.family,
        companionId: breed.id,
        breedLabel: breed.label,
        displayName: breed.label,
        mood: 'neutral',
        color: breed.color,
        scale: SCALE_MIN,
        allocationPercent: 0,
        marketValueTWD: 0,
        unrealizedPnL: 0,
        pnlCurrency: assetType === 'US_STOCK' ? 'USD' : 'TWD',
        holdingsRoute: buildHoldingsRoute(assetType),
        isStray: false,
        isPlaceholder: true,
        statusLabel: familyDef.placeholderLabel,
    };
}

function buildZone(
    assetType: CourtyardAssetType,
    input: PetAdapterInput,
): CourtyardZoneViewModel {
    const familyDef = ANIMAL_FAMILIES[assetType];
    const holdings = filterActive(input.holdings);
    const pools = filterActive(input.pools).filter((p) => p.type === assetType);
    const marketView = summarizeMarketPoolReturns(holdings, pools, assetType);

    const companions: Omit<CompanionAvatarViewModel, 'companionMessage'>[] = pools.map((pool) =>
        buildPoolCompanion(pool, holdings, input),
    );

    const hasStray =
        marketView.unassigned.holdingCount > 0 || marketView.unassigned.costBasis > 0;
    if (hasStray) {
        companions.push(buildStrayCompanion(assetType, holdings, input));
    }

    if (pools.length === 0 && !hasStray) {
        companions.push(buildPlaceholderCompanion(assetType));
    }

    return {
        assetType,
        family: familyDef.family,
        zoneLabel: familyDef.zoneLabel,
        companions: applyZoneScales(companions),
    };
}

/** 將軍團、流浪持倉與資產類型轉成動物庭院 ViewModel */
export function buildPetCourtyardViewModel(input: PetAdapterInput): PetCourtyardViewModel {
    const totalInvestedTWD = COURTYARD_ASSET_TYPES.reduce(
        (sum, type) => sum + Math.max(0, input.assetTotals[type]),
        0,
    );

    return {
        zones: COURTYARD_ASSET_TYPES.map((type) => buildZone(type, input)),
        totalInvestedTWD,
        totalUnrealizedPnL: input.totalUnrealizedPnL,
    };
}

export function getPetAssetLabel(type: CourtyardAssetType): string {
    return ASSET_LABELS[type];
}
