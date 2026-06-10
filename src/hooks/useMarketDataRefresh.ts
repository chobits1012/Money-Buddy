import { useEffect } from 'react';
import type { StockHolding } from '../types';
import { usePortfolioStore } from '../store/portfolioStore';
import { filterActive } from '../utils/entityActive';

const buildStockHoldingsKey = (holdings: StockHolding[]): string =>
    filterActive(holdings)
        .filter((h) => (h.type === 'TAIWAN_STOCK' || h.type === 'US_STOCK') && h.symbol)
        .map((h) => `${h.id}:${h.symbol}`)
        .join('|');

const buildFundHoldingsKey = (holdings: StockHolding[]): string =>
    filterActive(holdings)
        .filter((h) => h.type === 'FUNDS')
        .map((h) => `${h.id}:${h.symbol ?? ''}:${h.name}`)
        .join('|');

/**
 * 在 app 單一處更新台股/美股報價與基金淨值；持倉變更時自動重抓。
 */
export function useMarketDataRefresh(enabled: boolean) {
    const fetchQuotesForHoldings = usePortfolioStore((state) => state.fetchQuotesForHoldings);
    const fetchFundNavForHoldings = usePortfolioStore((state) => state.fetchFundNavForHoldings);

    const stockHoldingsKey = usePortfolioStore((state) => buildStockHoldingsKey(state.holdings));
    const fundHoldingsKey = usePortfolioStore((state) => buildFundHoldingsKey(state.holdings));

    useEffect(() => {
        if (!enabled || !stockHoldingsKey) return;
        void fetchQuotesForHoldings();
    }, [enabled, stockHoldingsKey, fetchQuotesForHoldings]);

    useEffect(() => {
        if (!enabled || !fundHoldingsKey) return;
        void fetchFundNavForHoldings();
    }, [enabled, fundHoldingsKey, fetchFundNavForHoldings]);
}
