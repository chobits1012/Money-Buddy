import { useMemo } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { buildDashboardAllocationView, summarizePortfolioPnL } from '../utils/dashboardMetrics';
import { buildPetCourtyardViewModel } from '../utils/portfolioPetAdapter';
import { useDashboardViewModel } from './useDashboardViewModel';

/** 狗狗庭院首頁所需的計算結果 */
export function usePetDashboardViewModel() {
    const masterTwdTotal = usePortfolioStore((state) => state.masterTwdTotal);
    const holdings = usePortfolioStore((state) => state.holdings);
    const exchangeRateUSD = usePortfolioStore((state) => state.exchangeRateUSD);
    const totalCapitalPool = usePortfolioStore((state) => state.totalCapitalPool);
    const pools = usePortfolioStore((state) => state.pools);
    const usStockFundPool = usePortfolioStore((state) => state.usStockFundPool);
    const usdAccountCash = usePortfolioStore((state) => state.usdAccountCash);
    const customCategories = usePortfolioStore((state) => state.customCategories);
    const capitalDeposits = usePortfolioStore((state) => state.capitalDeposits);
    const capitalWithdrawals = usePortfolioStore((state) => state.capitalWithdrawals);
    const transactions = usePortfolioStore((state) => state.transactions);
    const isLoadingQuotes = usePortfolioStore((state) => state.isLoadingQuotes);

    const dashboard = useDashboardViewModel();

    const allocation = useMemo(
        () =>
            buildDashboardAllocationView({
                masterTwdTotal,
                capitalDeposits,
                capitalWithdrawals,
                totalCapitalPool,
                pools,
                usdAccountCash,
                usStockFundPool,
                exchangeRateUSD,
                holdings,
                customCategories,
                transactions,
            }),
        [
            masterTwdTotal,
            capitalDeposits,
            capitalWithdrawals,
            totalCapitalPool,
            pools,
            usdAccountCash,
            usStockFundPool,
            exchangeRateUSD,
            holdings,
            customCategories,
            transactions,
        ],
    );

    const pnl = useMemo(
        () => summarizePortfolioPnL(holdings, exchangeRateUSD),
        [holdings, exchangeRateUSD],
    );

    const courtyard = useMemo(
        () =>
            buildPetCourtyardViewModel({
                holdings,
                pools,
                assetTotals: allocation.assetTotals,
                totalUnrealizedPnL: pnl.totalUnrealizedPnL,
                isLoadingQuotes,
                exchangeRateUSD,
            }),
        [holdings, pools, allocation.assetTotals, pnl.totalUnrealizedPnL, isLoadingQuotes, exchangeRateUSD],
    );

    return {
        courtyard,
        masterCapitalTotal: dashboard.masterCapitalTotal,
        idleCapital: dashboard.idleCapital,
        totalUnrealizedPnL: dashboard.totalUnrealizedPnL,
        isLoadingQuotes: dashboard.isLoadingQuotes,
        exchangeRateUSD: dashboard.exchangeRateUSD,
    };
}
