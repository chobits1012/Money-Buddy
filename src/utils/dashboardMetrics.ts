import type {
    AssetType,
    AssetPool,
    CapitalDeposit,
    CapitalWithdrawal,
    CustomCategory,
    DashboardAllocationView,
    DashboardMetricsInput,
    FundingMetrics,
    AllocationMetrics,
    PoolBuckets,
    PortfolioPnLSummary,
    StockHolding,
    Transaction,
} from '../types';
import { filterActive } from './entityActive';
import { resolveUsdAccountBalance } from './usdAccount';

export type {
    DashboardAllocationView,
    DashboardMetricsInput,
    FundingMetrics,
    AllocationMetrics,
    PoolBuckets,
    PortfolioPnLSummary,
};

interface PoolSplitView {
    twdPools: AssetPool[];
    usdPools: AssetPool[];
}

/** 全體 + 分市場損益（美股未實現以 USD 累計，其餘以 TWD） */
export function summarizePortfolioPnL(
    holdings: StockHolding[],
    exchangeRateUSD: number,
): PortfolioPnLSummary {
    let totalUnrealizedPnL = 0;
    let totalRealizedPnL = 0;
    let taiwanUnrealizedPnL = 0;
    let usUnrealizedPnLUSD = 0;
    let fundUnrealizedPnL = 0;

    filterActive(holdings).forEach((h) => {
        const u = h.unrealizedPnL || 0;
        const r = h.realizedPnL || 0;

        if (h.type === 'US_STOCK') {
            usUnrealizedPnLUSD += u;
            totalUnrealizedPnL += u * exchangeRateUSD;
            totalRealizedPnL += r * exchangeRateUSD;
        } else if (h.type === 'TAIWAN_STOCK') {
            taiwanUnrealizedPnL += u;
            totalUnrealizedPnL += u;
            totalRealizedPnL += r;
        } else if (h.type === 'FUNDS') {
            fundUnrealizedPnL += u;
            totalUnrealizedPnL += u;
            totalRealizedPnL += r;
        } else {
            totalUnrealizedPnL += u;
            totalRealizedPnL += r;
        }
    });

    return {
        totalUnrealizedPnL,
        totalRealizedPnL,
        taiwanUnrealizedPnL,
        usUnrealizedPnLUSD,
        fundUnrealizedPnL,
    };
}

const clampNonNegative = (value: number): number => (value > 0 ? value : 0);

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

/** 美股主帳撥入／提領的固定台幣成本（撥入當下記錄，不隨匯率變動） */
export const calculateUsdAllocatedTwdBasis = (transactions: Transaction[] | undefined): number => {
    const usTx = filterActive(transactions ?? []).filter((tx) => tx.type === 'US_STOCK');
    return clampNonNegative(Math.round(
        usTx.reduce((sum, tx) => {
            if (tx.action === 'DEPOSIT') return sum + (tx.amount || 0);
            if (tx.action === 'WITHDRAWAL') return sum - (tx.amount || 0);
            return sum;
        }, 0),
    ));
};

export const calculateFundingMetrics = ({
    masterTwdTotal: masterTwdTotalFromState,
    capitalDeposits: rawDeposits,
    capitalWithdrawals: rawWithdrawals,
    pools: rawPools,
    holdings: rawHoldings,
    customCategories: rawCustom,
    transactions: rawTransactions,
}: Pick<
    DashboardMetricsInput,
    | 'masterTwdTotal'
    | 'capitalDeposits'
    | 'capitalWithdrawals'
    | 'totalCapitalPool'
    | 'pools'
    | 'holdings'
    | 'customCategories'
    | 'transactions'
>): FundingMetrics => {
    const pools = filterActive(rawPools);
    const holdings = filterActive(rawHoldings);
    const customCategories = filterActive(rawCustom);
    const capitalDeposits = rawDeposits ? filterActive(rawDeposits) : undefined;
    const capitalWithdrawals = rawWithdrawals ? filterActive(rawWithdrawals) : undefined;

    const masterCapitalTotal = typeof masterTwdTotalFromState === 'number'
        ? clampNonNegative(Math.round(masterTwdTotalFromState))
        : calculateMasterCapitalTotal(capitalDeposits, capitalWithdrawals);
    const { twdAllocatedTotal } = selectPoolBuckets(pools);
    const directGlobalTwdInvested = holdings
        .filter((h) => !h.poolId && h.type !== 'US_STOCK')
        .reduce((sum, h) => sum + h.totalAmount, 0);
    const customTotal = customCategories.reduce((sum, c) => sum + c.amount, 0);
    const usdAllocatedTwdBasis = calculateUsdAllocatedTwdBasis(rawTransactions);
    const allocatedCapital = clampNonNegative(
        Math.round(twdAllocatedTotal + directGlobalTwdInvested + customTotal + usdAllocatedTwdBasis),
    );
    const idleCapital = clampNonNegative(masterCapitalTotal - allocatedCapital);
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

/**
 * 僅供內部與測試使用；儀表板 UI 請用 {@link buildDashboardAllocationView}。
 * 回傳的 `idleCapital` 與大卡片／funding 不一致，不應單獨用於顯示閒置。
 * @deprecated
 */
export const calculateAllocationMetrics = ({
    masterTwdTotal: masterTwdTotalFromState,
    capitalDeposits: rawDeposits,
    capitalWithdrawals: rawWithdrawals,
    totalCapitalPool,
    usdAccountCash,
    usStockFundPool,
    exchangeRateUSD,
    holdings: rawHoldings,
    pools: rawPools,
    customCategories: rawCustom,
}: DashboardMetricsInput): AllocationMetrics => {
    const holdings = filterActive(rawHoldings);
    const pools = filterActive(rawPools);
    const customCategories = filterActive(rawCustom);
    const capitalDeposits = rawDeposits ? filterActive(rawDeposits) : undefined;
    const capitalWithdrawals = rawWithdrawals ? filterActive(rawWithdrawals) : undefined;

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
    const usBucket = Math.round(resolveUsdAccountBalance({ usdAccountCash, usStockFundPool }) * exchangeRateUSD);

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

/**
 * 組裝儀表板「資金配置」視圖：funding 指標 + 圓餅圖用的 assetTotals／自訂欄位。
 * 閒置一律來自 calculateFundingMetrics，與 calculateAllocationMetrics 內的 idle 無關。
 */
export function buildDashboardAllocationView(
    input: DashboardMetricsInput,
): DashboardAllocationView {
    const funding = calculateFundingMetrics({
        masterTwdTotal: input.masterTwdTotal,
        capitalDeposits: input.capitalDeposits,
        capitalWithdrawals: input.capitalWithdrawals,
        totalCapitalPool: input.totalCapitalPool,
        pools: input.pools,
        holdings: input.holdings,
        customCategories: input.customCategories,
        transactions: input.transactions,
    });
    const { assetTotals, customCategories } = calculateAllocationMetrics(input);
    return {
        ...funding,
        assetTotals,
        customCategories,
    };
}
