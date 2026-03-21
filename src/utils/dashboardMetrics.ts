import type {
    AssetType,
    AssetPool,
    CapitalDeposit,
    CapitalWithdrawal,
    CustomCategory,
    StockHolding,
} from '../types';

interface DashboardMetricsInput {
    masterTwdTotal?: number;
    capitalDeposits?: CapitalDeposit[];
    capitalWithdrawals?: CapitalWithdrawal[];
    totalCapitalPool: number;
    usdAccountCash?: number;
    usStockFundPool: number;
    exchangeRateUSD: number;
    holdings: StockHolding[];
    pools: AssetPool[];
    customCategories: CustomCategory[];
}

interface PoolSplitView {
    twdPools: AssetPool[];
    usdPools: AssetPool[];
}

export interface PoolBuckets {
    twdPools: AssetPool[];
    usdPools: AssetPool[];
    twdAllocatedTotal: number;
    usdAllocatedTotal: number;
}

export interface FundingMetrics {
    masterCapitalTotal: number;
    idleCapital: number;
    allocatedCapital: number;
    allocatedPercentage: number;
}

export interface AllocationMetrics {
    assetTotals: Record<AssetType, number>;
    idleCapital: number;
    customCategories: CustomCategory[];
}

const clampNonNegative = (value: number): number => (value > 0 ? value : 0);
const pickUsdBase = (usdAccountCash: number | undefined, usStockFundPool: number): number =>
    Math.max(usdAccountCash || 0, usStockFundPool || 0);

const splitPoolsByCurrencyView = (pools: AssetPool[]): PoolSplitView => {
    const twdPools: AssetPool[] = [];
    const usdPools: AssetPool[] = [];

    pools.forEach((pool) => {
        if (pool.type === 'US_STOCK') {
            usdPools.push(pool);
            return;
        }
        twdPools.push(pool);
    });

    return { twdPools, usdPools };
};

export const selectPoolBuckets = (pools: AssetPool[]): PoolBuckets => {
    const { twdPools, usdPools } = splitPoolsByCurrencyView(pools);
    return {
        twdPools,
        usdPools,
        twdAllocatedTotal: twdPools.reduce((sum, pool) => sum + pool.allocatedBudget, 0),
        usdAllocatedTotal: usdPools.reduce((sum, pool) => sum + pool.allocatedBudget, 0),
    };
};

export const calculateMasterCapitalTotal = (
    deposits?: CapitalDeposit[],
    withdrawals?: CapitalWithdrawal[]
): number => {
    const deposited = (deposits ?? []).reduce((sum, item) => sum + item.amount, 0);
    const withdrawn = (withdrawals ?? []).reduce((sum, item) => sum + item.amount, 0);
    return clampNonNegative(Math.round(deposited - withdrawn));
};

export const calculateGlobalIdleCapital = (
    totalCapitalPool: number,
    holdings: StockHolding[],
    customCategories: CustomCategory[]
): number => {
    const holdingsInGlobal = holdings.filter((h) => !h.poolId && h.type !== 'US_STOCK');
    const totalInvestedGlobal = holdingsInGlobal.reduce((sum, h) => sum + h.totalAmount, 0);
    const customTotal = customCategories.reduce((sum, c) => sum + c.amount, 0);
    const globalFree = totalCapitalPool - totalInvestedGlobal - customTotal;
    return clampNonNegative(Math.round(globalFree));
};

export const calculateFundingMetrics = ({
    masterTwdTotal: masterTwdTotalFromState,
    capitalDeposits,
    capitalWithdrawals,
    totalCapitalPool,
    pools,
    usdAccountCash,
    usStockFundPool,
    exchangeRateUSD,
    holdings,
    customCategories,
}: Pick<
    DashboardMetricsInput,
    | 'masterTwdTotal'
    | 'capitalDeposits'
    | 'capitalWithdrawals'
    | 'totalCapitalPool'
    | 'pools'
    | 'usdAccountCash'
    | 'usStockFundPool'
    | 'exchangeRateUSD'
    | 'holdings'
    | 'customCategories'
>): FundingMetrics => {
    const masterCapitalTotal = typeof masterTwdTotalFromState === 'number'
        ? clampNonNegative(Math.round(masterTwdTotalFromState))
        : calculateMasterCapitalTotal(capitalDeposits, capitalWithdrawals);
    const idleCapital = calculateGlobalIdleCapital(totalCapitalPool, holdings, customCategories);

    // 以主帳戶口徑計算已分配（主帳戶總資產 - 主帳戶未分配）
    // 並用池視角做一次下限保護，避免異常資料造成負值或過小值。
    const allocatedFromMaster = clampNonNegative(masterCapitalTotal - idleCapital);
    const { twdAllocatedTotal } = selectPoolBuckets(pools);
    const usdAccountTwd = Math.round(pickUsdBase(usdAccountCash, usStockFundPool) * exchangeRateUSD);
    const allocatedLowerBound = clampNonNegative(Math.round(twdAllocatedTotal + usdAccountTwd));
    const allocatedCapital = Math.max(allocatedFromMaster, allocatedLowerBound);
    const allocatedPercentage = masterCapitalTotal > 0
        ? (allocatedCapital / masterCapitalTotal) * 100
        : 0;

    return {
        masterCapitalTotal,
        idleCapital,
        allocatedCapital,
        allocatedPercentage,
    };
};

export const calculateAllocationMetrics = ({
    masterTwdTotal: masterTwdTotalFromState,
    capitalDeposits,
    capitalWithdrawals,
    totalCapitalPool,
    usdAccountCash,
    usStockFundPool,
    exchangeRateUSD,
    holdings,
    pools,
    customCategories,
}: DashboardMetricsInput): AllocationMetrics => {
    const idleCapital = calculateGlobalIdleCapital(totalCapitalPool, holdings, customCategories);
    const { twdPools } = selectPoolBuckets(pools);

    // 池子代表該市場已分配資本（包含該池持倉與現金）
    const poolAllocatedByType: Record<AssetType, number> = {
        TAIWAN_STOCK: 0,
        US_STOCK: 0,
        FUNDS: 0,
        CRYPTO: 0,
    };

    twdPools.forEach((pool) => {
        poolAllocatedByType[pool.type] += pool.allocatedBudget;
    });

    // 非池內持倉視為直接由主帳戶持有
    const directHoldingsByType: Record<AssetType, number> = {
        TAIWAN_STOCK: 0,
        US_STOCK: 0,
        FUNDS: 0,
        CRYPTO: 0,
    };

    holdings.forEach((holding) => {
        if (holding.poolId) return;
        if (holding.type === 'US_STOCK') {
            return;
        }
        directHoldingsByType[holding.type] += holding.totalAmount;
    });

    // 美股整體以外層美元帳戶為準（含已分配池與未分配美元現金）
    const usBucket = Math.round(pickUsdBase(usdAccountCash, usStockFundPool) * exchangeRateUSD);

    const masterCapitalTotal = typeof masterTwdTotalFromState === 'number'
        ? clampNonNegative(Math.round(masterTwdTotalFromState))
        : calculateMasterCapitalTotal(capitalDeposits, capitalWithdrawals);
    const customTotal = customCategories.reduce((sum, c) => sum + c.amount, 0);
    const idleUpperBound = clampNonNegative(masterCapitalTotal - customTotal);

    return {
        assetTotals: {
            TAIWAN_STOCK: clampNonNegative(Math.round(poolAllocatedByType.TAIWAN_STOCK + directHoldingsByType.TAIWAN_STOCK)),
            US_STOCK: clampNonNegative(usBucket),
            FUNDS: clampNonNegative(Math.round(poolAllocatedByType.FUNDS + directHoldingsByType.FUNDS)),
            CRYPTO: clampNonNegative(Math.round(poolAllocatedByType.CRYPTO + directHoldingsByType.CRYPTO)),
        },
        idleCapital: clampNonNegative(Math.round(Math.min(idleCapital, idleUpperBound))),
        customCategories,
    };
};
