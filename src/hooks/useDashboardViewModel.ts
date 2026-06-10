import { useMemo } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { buildDashboardAllocationView, summarizePortfolioPnL } from '../utils/dashboardMetrics';
import { filterActive } from '../utils/entityActive';

/** 首頁總覽卡片所需的計算結果（資金 + 損益） */
export function useDashboardViewModel() {
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
    const isLoadingQuotes = usePortfolioStore((state) => state.isLoadingQuotes);

    const { idleCapital, masterCapitalTotal } = useMemo(
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
        ],
    );

    const pnl = useMemo(
        () => summarizePortfolioPnL(holdings, exchangeRateUSD),
        [holdings, exchangeRateUSD],
    );

    return {
        idleCapital,
        masterCapitalTotal,
        activeCapitalDeposits: filterActive(capitalDeposits),
        activeCustomCategories: filterActive(customCategories),
        exchangeRateUSD,
        isLoadingQuotes,
        ...pnl,
    };
}
