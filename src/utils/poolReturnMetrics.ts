import type { AssetPool, StockAssetType, StockHolding } from '../types';
import { filterActive } from './entityActive';

export type ReturnCurrency = 'TWD' | 'USD';

export interface HoldingReturnMetrics {
    costBasis: number;
    totalPnL: number;
    returnRatePercent: number | null;
    currency: ReturnCurrency;
}

export interface PoolReturnMetrics {
    poolId: string | null;
    poolName: string;
    holdingCount: number;
    costBasis: number;
    totalPnL: number;
    returnRatePercent: number | null;
    currency: ReturnCurrency;
}

export interface MarketPoolReturnView {
    byPool: PoolReturnMetrics[];
    aggregate: PoolReturnMetrics;
    unassigned: PoolReturnMetrics;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

export const calcReturnRatePercent = (totalPnL: number, costBasis: number): number | null => {
    if (costBasis <= 0) return null;
    return round2((totalPnL / costBasis) * 100);
};

const currencyForMarket = (marketType: StockAssetType): ReturnCurrency =>
    marketType === 'US_STOCK' ? 'USD' : 'TWD';

/** 單一持倉報酬（與 HoldingCard 共用；美股統一 USD 成本與損益） */
export const calcHoldingReturn = (holding: StockHolding): HoldingReturnMetrics => {
    const isUS = holding.type === 'US_STOCK';
    const costBasis = isUS ? (holding.totalAmountUSD || 0) : holding.totalAmount;
    const totalPnL = (holding.unrealizedPnL || 0) + (holding.realizedPnL || 0);
    return {
        costBasis,
        totalPnL,
        returnRatePercent: calcReturnRatePercent(totalPnL, costBasis),
        currency: isUS ? 'USD' : 'TWD',
    };
};

const summarizeHoldings = (
    holdings: StockHolding[],
    poolId: string | null,
    poolName: string,
    currency: ReturnCurrency,
): PoolReturnMetrics => {
    let costBasis = 0;
    let totalPnL = 0;

    holdings.forEach((holding) => {
        const slice = calcHoldingReturn(holding);
        costBasis += slice.costBasis;
        totalPnL += slice.totalPnL;
    });

    return {
        poolId,
        poolName,
        holdingCount: holdings.length,
        costBasis: currency === 'USD' ? round2(costBasis) : Math.round(costBasis),
        totalPnL: currency === 'USD' ? round2(totalPnL) : Math.round(totalPnL),
        returnRatePercent: calcReturnRatePercent(totalPnL, costBasis),
        currency,
    };
};

/** 單一入金池或未歸屬（poolId=null） */
export const summarizePoolReturn = (
    holdings: StockHolding[],
    poolId: string | null,
    poolName: string,
    marketType: StockAssetType,
): PoolReturnMetrics => {
    const currency = currencyForMarket(marketType);
    const scoped = poolId === null
        ? holdings.filter((h) => !h.poolId)
        : holdings.filter((h) => h.poolId === poolId);
    return summarizeHoldings(scoped, poolId, poolName, currency);
};

/** 某市場所有入金池 + 合計 + 未歸屬 */
export const summarizeMarketPoolReturns = (
    rawHoldings: StockHolding[],
    rawPools: AssetPool[],
    marketType: StockAssetType,
): MarketPoolReturnView => {
    const holdings = filterActive(rawHoldings).filter((h) => h.type === marketType);
    const pools = filterActive(rawPools).filter((p) => p.type === marketType);
    const currency = currencyForMarket(marketType);
    const poolIds = new Set(pools.map((p) => p.id));

    const byPool = pools.map((pool) =>
        summarizePoolReturn(holdings, pool.id, pool.name, marketType),
    );

    const pooledHoldings = holdings.filter((h) => h.poolId && poolIds.has(h.poolId));
    const aggregate = summarizeHoldings(
        pooledHoldings,
        '__aggregate__',
        '全軍團合計',
        currency,
    );

    const unassigned = summarizePoolReturn(holdings, null, '未歸屬標的', marketType);

    return { byPool, aggregate, unassigned };
};

export const toTwdApprox = (usdAmount: number, exchangeRateUSD: number): number =>
    Math.round(usdAmount * (exchangeRateUSD > 0 ? exchangeRateUSD : 31));
