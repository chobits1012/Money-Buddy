import type { StockHolding } from '../types';
import { recalcHolding } from '../utils/finance';
import {
    fetchFundNavQuotes,
    resolveFundNavTarget,
    type FundNavQuote,
    type FundNavTarget,
} from '../utils/fundNav';
import {
    DEFAULT_EXCHANGE_RATE_EUR,
    DEFAULT_EXCHANGE_RATE_USD,
    fetchLiveExchangeRates,
} from '../utils/exchangeRates';

export function buildFundNavTargetsByHoldingId(
    holdings: StockHolding[],
): Map<string, FundNavTarget> {
    const map = new Map<string, FundNavTarget>();
    for (const holding of holdings) {
        const target = resolveFundNavTarget(holding.symbol, holding.name);
        if (target) map.set(holding.id, target);
    }
    return map;
}

export function uniqueFundNavTargets(targets: Iterable<FundNavTarget>): FundNavTarget[] {
    return [
        ...new Map(
            [...targets].map((t) => [`${t.fundCode}:${t.navScope}`, t] as const),
        ).values(),
    ];
}

export async function fetchLiveRateUpdates(): Promise<{
    exchangeRateUSD?: number;
    exchangeRateEUR?: number;
}> {
    const liveRates = await fetchLiveExchangeRates();
    const updates: { exchangeRateUSD?: number; exchangeRateEUR?: number } = {};
    if (liveRates.usd) updates.exchangeRateUSD = liveRates.usd;
    if (liveRates.eur) updates.exchangeRateEUR = liveRates.eur;
    return updates;
}

export function applyFundNavQuotesToHoldings(
    holdings: StockHolding[],
    targetByHoldingId: Map<string, FundNavTarget>,
    quotes: FundNavQuote[],
    exchangeRateUSD: number,
    exchangeRateEUR: number,
): StockHolding[] {
    const quoteMap = new Map(quotes.map((q) => [q.fundCode, q] as const));
    const usdRate = exchangeRateUSD > 0 ? exchangeRateUSD : DEFAULT_EXCHANGE_RATE_USD;
    const eurRate = exchangeRateEUR > 0 ? exchangeRateEUR : DEFAULT_EXCHANGE_RATE_EUR;

    return holdings.map((holding) => {
        const target = targetByHoldingId.get(holding.id);
        if (!target) return holding;

        const quote = quoteMap.get(target.fundCode);
        if (!quote) return holding;

        if (quote.currency === 'USD') {
            return recalcHolding({
                ...holding,
                currentPriceUSD: quote.nav,
                currentPriceEUR: undefined,
                currentPrice: Math.round(quote.nav * usdRate * 100) / 100,
                currentPriceDate: quote.navDate,
            });
        }

        if (quote.currency === 'EUR') {
            return recalcHolding({
                ...holding,
                currentPriceUSD: undefined,
                currentPriceEUR: quote.nav,
                currentPrice: Math.round(quote.nav * eurRate * 100) / 100,
                currentPriceDate: quote.navDate,
            });
        }

        return recalcHolding({
            ...holding,
            currentPriceUSD: undefined,
            currentPriceEUR: undefined,
            currentPrice: quote.nav,
            currentPriceDate: quote.navDate,
        });
    });
}

/** 抓取基金淨值與即時匯率；無可更新標的時回傳 null */
export async function refreshFundNavData(fundHoldings: StockHolding[]): Promise<{
    targetByHoldingId: Map<string, FundNavTarget>;
    quotes: FundNavQuote[];
    rateUpdates: { exchangeRateUSD?: number; exchangeRateEUR?: number };
} | null> {
    const targetByHoldingId = buildFundNavTargetsByHoldingId(fundHoldings);
    if (targetByHoldingId.size === 0) return null;

    const rateUpdates = await fetchLiveRateUpdates();
    const quotes = await fetchFundNavQuotes(uniqueFundNavTargets(targetByHoldingId.values()));
    return { targetByHoldingId, quotes, rateUpdates };
}
