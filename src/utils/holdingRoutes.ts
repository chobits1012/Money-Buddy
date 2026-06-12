import type { StockAssetType } from '../types';

const SLUG_TO_TYPE: Record<string, StockAssetType> = {
    taiwan: 'TAIWAN_STOCK',
    us: 'US_STOCK',
    funds: 'FUNDS',
};

const TYPE_TO_SLUG: Partial<Record<StockAssetType, string>> = {
    TAIWAN_STOCK: 'taiwan',
    US_STOCK: 'us',
    FUNDS: 'funds',
};

export function holdingTypeToSlug(type: StockAssetType): string | null {
    return TYPE_TO_SLUG[type] ?? null;
}

export function parseHoldingMarketParam(market: string | undefined): StockAssetType | null {
    if (!market) return null;
    return SLUG_TO_TYPE[market.toLowerCase()] ?? null;
}

export function buildHoldingsRoute(type: StockAssetType, poolId?: string): string {
    const slug = holdingTypeToSlug(type);
    if (!slug) return '/';
    if (!poolId) return `/holdings/${slug}`;
    return `/holdings/${slug}?pool=${encodeURIComponent(poolId)}`;
}
