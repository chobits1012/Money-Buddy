import type { StateCreator } from 'zustand';
import type {
    HoldingSlice,
    Transaction,
    AssetType,
    PortfolioStore,
} from '../../types';
import { recalcHolding } from '../../utils/finance';
import { isActive, filterActive } from '../../utils/entityActive';
import { applyFundNavQuotesToHoldings, refreshFundNavData } from '../../services/fundNavService';
import { 
    calculateTransactionImpact, 
    calculateNewHoldingImpact, 
    calculateRemovalImpact,
    calculateHoldingRemovalImpact,
    calculateUpdateImpact,
    type AccountingImpact 
} from '../../utils/accounting';
import { calculateFundingMetrics } from '../../utils/dashboardMetrics';
import { applyAccountingImpact } from '../../utils/applyAccountingImpact';
import { resolveUsdAccountBalance, syncUsdAccountFields } from '../../utils/usdAccount';
import {
    applyStockQuotesToHoldings,
    fetchStockQuotes,
    toYahooQuoteSymbols,
} from '../../services/quoteService';

export const createHoldingSlice: StateCreator<
    PortfolioStore,
    [],
    [],
    HoldingSlice
> = (set, get) => ({
    transactions: [],
    holdings: [],
    isConfigured: false,

    addTransaction: (payload) => {
        const newTransaction: Transaction = {
            ...payload,
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        set((state) => {
            const updates: any = {
                transactions: [newTransaction, ...state.transactions],
            };

            if (payload.type === 'US_STOCK') {
                const usdBase = resolveUsdAccountBalance(state);
                const twdAmount = payload.amount || 0;
                if (payload.action === 'DEPOSIT') {
                    // 保護主帳戶：美股入金視為台幣主帳戶轉出，不可超過可分配餘額
                    const idleCapital = get().getIdleCapital();
                    if (twdAmount > idleCapital || state.totalCapitalPool < twdAmount) return {};
                    Object.assign(updates, syncUsdAccountFields(usdBase + (payload.amountUSD || 0)));
                    // 主帳戶可分配資金（totalCapitalPool）扣除轉出
                    updates.totalCapitalPool = Math.max(0, state.totalCapitalPool - twdAmount);
                } else if (payload.action === 'WITHDRAWAL') {
                    if (usdBase < (payload.amountUSD || 0)) return {};
                    // 美股提領回台幣，主帳戶可分配資金增加，但不可超過主資產上限
                    Object.assign(updates, syncUsdAccountFields(usdBase - (payload.amountUSD || 0)));
                    updates.totalCapitalPool = Math.min(
                        state.masterTwdTotal,
                        state.totalCapitalPool + twdAmount
                    );
                }
            }

            return updates;
        });
    },

    removeTransaction: (id: string) => {
        set((state) => {
            const tx = state.transactions.find((t) => t.id === id && isActive(t));
            if (!tx) return {};

            const now = new Date().toISOString();
            const updates: any = {
                transactions: state.transactions.map((t) =>
                    t.id === id ? { ...t, deletedAt: now, updatedAt: now } : t
                ),
            };

            if (tx.type === 'US_STOCK') {
                const usdBase = resolveUsdAccountBalance(state);
                const twdAmount = tx.amount || 0;
                if (tx.action === 'DEPOSIT') {
                    Object.assign(updates, syncUsdAccountFields(usdBase - (tx.amountUSD || 0)));
                    updates.totalCapitalPool = Math.min(
                        state.masterTwdTotal,
                        state.totalCapitalPool + twdAmount
                    );
                } else if (tx.action === 'WITHDRAWAL') {
                    Object.assign(updates, syncUsdAccountFields(usdBase + (tx.amountUSD || 0)));
                    updates.totalCapitalPool = Math.max(0, state.totalCapitalPool - twdAmount);
                }
            }

            return updates;
        });
    },

    getAssetTotals: () => {
        const state = get();
        const totals: Record<AssetType, number> = {
            TAIWAN_STOCK: 0,
            US_STOCK: 0,
            FUNDS: 0,
            CRYPTO: 0,
        };

        filterActive(state.holdings).forEach((h) => {
            if (h.type in totals && h.type !== 'US_STOCK') {
                totals[h.type] += h.totalAmount;
            }
        });

        const usdBase = resolveUsdAccountBalance(state);
        totals.US_STOCK = Math.round(usdBase * state.exchangeRateUSD);

        (Object.keys(totals) as AssetType[]).forEach(k => {
            if (totals[k] < 0) totals[k] = 0;
        });

        return totals;
    },

    getAvailableCapital: () => {
        const state = get();
        const activeHoldings = filterActive(state.holdings);
        const activePools = filterActive(state.pools);

        const holdingsInGlobal = activeHoldings.filter(h => !h.poolId && h.type !== 'US_STOCK');
        const totalInvestedGlobal = holdingsInGlobal.reduce((sum, h) => sum + h.totalAmount, 0);
        const customTotal = state.getCustomCategoriesTotal();
        const globalFree = state.totalCapitalPool - totalInvestedGlobal - customTotal;
        
        const usFreeTWD = state.getUsStockAvailableCapital() * state.exchangeRateUSD;
        const poolCash = activePools.reduce((sum, p) => sum + (p.type === 'US_STOCK' ? p.currentCash * state.exchangeRateUSD : p.currentCash), 0);
        
        const available = globalFree + usFreeTWD + poolCash;
        return available > 0 ? Math.round(available) : 0;
    },

    /** @deprecated 僅內部帳本；UI 請用 getIdleCapital */
    getGlobalFreeCapital: () => {
        const state = get();
        const holdingsInGlobal = filterActive(state.holdings).filter(h => !h.poolId && h.type !== 'US_STOCK');
        const totalInvestedGlobal = holdingsInGlobal.reduce((sum, h) => sum + h.totalAmount, 0);
        const customTotal = state.getCustomCategoriesTotal();
        const globalFree = state.totalCapitalPool - totalInvestedGlobal - customTotal;
        return globalFree > 0 ? Math.round(globalFree) : 0;
    },

    getIdleCapital: () => {
        const state = get();
        return calculateFundingMetrics({
            masterTwdTotal: state.masterTwdTotal,
            capitalDeposits: state.capitalDeposits,
            capitalWithdrawals: state.capitalWithdrawals,
            totalCapitalPool: state.totalCapitalPool,
            pools: state.pools,
            holdings: state.holdings,
            customCategories: state.customCategories,
            transactions: state.transactions,
        }).idleCapital;
    },

    buyStock: (params) => {
        set((state) => {
            const existingIndex = state.holdings.findIndex(
                (h) => isActive(h) && h.type === params.type && h.name.toLowerCase() === params.name.toLowerCase() && h.poolId === params.poolId
            );

            let impact: AccountingImpact;
            let updatedHoldings = [...state.holdings];

            if (existingIndex >= 0) {
                // 1. 既有持倉：計算交易影響
                impact = calculateTransactionImpact(state.holdings[existingIndex], {
                    action: params.action || 'BUY',
                    shares: params.shares,
                    pricePerShare: params.pricePerShare,
                    totalCost: params.totalCost,
                    totalCostUSD: params.totalCostUSD,
                    currentPrice: params.currentPrice,
                    currentPriceDate: params.currentPriceDate,
                    exchangeRate: params.exchangeRate,
                    note: params.note,
                });
                updatedHoldings[existingIndex] = impact.updatedHolding;
            } else {
                // 2. 全新持倉：初始化並計算影響
                impact = calculateNewHoldingImpact({
                    ...params,
                    action: params.action || 'BUY',
                });
                updatedHoldings.push(impact.updatedHolding);
            }

            return {
                holdings: updatedHoldings,
                ...applyAccountingImpact(state, impact, {
                    poolId: params.poolId,
                    assetType: params.type,
                }),
            };
        });
    },

    removePurchase: (holdingId, purchaseId) => {
        set((state) => {
            const holding = state.holdings.find((h) => h.id === holdingId && isActive(h));
            if (!holding) return {};

            const now = new Date().toISOString();
            const { 
                updatedHolding, 
                cashDeltaTWD, 
                cashDeltaUSD, 
                pnlDeltaTWD, 
                pnlDeltaUSD, 
                isHoldingEmpty 
            } = calculateRemovalImpact(holding, purchaseId);

            let updatedHoldings = [...state.holdings];
            const holdingIndex = state.holdings.findIndex(h => h.id === holdingId);

            if (isHoldingEmpty) {
                updatedHoldings[holdingIndex] = {
                    ...updatedHolding,
                    deletedAt: now,
                    updatedAt: now,
                };
            } else {
                updatedHoldings[holdingIndex] = updatedHolding;
            }

            return {
                holdings: updatedHoldings,
                ...applyAccountingImpact(
                    state,
                    { cashDeltaTWD, cashDeltaUSD, pnlDeltaTWD, pnlDeltaUSD },
                    { poolId: holding.poolId, assetType: holding.type },
                ),
            };
        });
    },

    updateHoldingName: (id, name) => {
        set((state) => ({
            holdings: state.holdings.map((h) =>
                h.id === id ? { ...h, name, updatedAt: new Date().toISOString() } : h
            ),
        }));
    },

    updateHoldingQuote: (id, currentPrice) => {
        set((state) => {
            const holdingIndex = state.holdings.findIndex((h) => h.id === id);
            if (holdingIndex < 0) return {};

            const updated = [...state.holdings];
            const holding = { ...updated[holdingIndex], currentPrice };
            updated[holdingIndex] = recalcHolding(holding as any);
            
            return { holdings: updated };
        });
    },

    updateHoldingPool: (id, poolId) => {
        set((state) => ({
            holdings: state.holdings.map((h) =>
                h.id === id ? { ...h, poolId, updatedAt: new Date().toISOString() } : h
            ),
        }));
    },

    removeHolding: (id) => {
        set((state) => {
            const holding = state.holdings.find((h) => h.id === id && isActive(h));
            if (!holding) return {};
            
            const now = new Date().toISOString();
            const { 
                cashDeltaTWD, 
                cashDeltaUSD, 
                pnlDeltaTWD, 
                pnlDeltaUSD 
            } = calculateHoldingRemovalImpact(holding);

            return {
                holdings: state.holdings.map((h) =>
                    h.id === id ? { ...h, deletedAt: now, updatedAt: now } : h
                ),
                ...applyAccountingImpact(
                    state,
                    { cashDeltaTWD, cashDeltaUSD, pnlDeltaTWD, pnlDeltaUSD },
                    { poolId: holding.poolId, assetType: holding.type, updatedAt: now },
                ),
            };
        });
    },

    getHoldingsByType: (type) => {
        return filterActive(get().holdings).filter((h) => h.type === type);
    },

    getHoldingsTotalByType: (type) => {
        return filterActive(get().holdings)
            .filter((h) => h.type === type)
            .reduce((sum, h) => sum + h.totalAmount, 0);
    },

    updatePurchase: (holdingId, purchaseId, updates) => {
        set((state) => {
            const holding = state.holdings.find((h) => h.id === holdingId && isActive(h));
            if (!holding) return {};

            const { 
                updatedHolding, 
                cashDeltaTWD, 
                cashDeltaUSD, 
                pnlDeltaTWD, 
                pnlDeltaUSD 
            } = calculateUpdateImpact(holding, purchaseId, updates);

            const updatedHoldings = state.holdings.map(h => h.id === holdingId ? updatedHolding : h);

            return {
                holdings: updatedHoldings,
                ...applyAccountingImpact(
                    state,
                    { cashDeltaTWD, cashDeltaUSD, pnlDeltaTWD, pnlDeltaUSD },
                    { poolId: holding.poolId, assetType: holding.type },
                ),
            };
        });
    },

    fetchQuotesForHoldings: async () => {
        const state = get();
        const targetHoldings = filterActive(state.holdings).filter(
            (h) => (h.type === 'TAIWAN_STOCK' || h.type === 'US_STOCK') && h.symbol,
        );

        if (targetHoldings.length === 0) return;

        set({ isLoadingQuotes: true } as any);

        try {
            const quoteMap = await fetchStockQuotes(toYahooQuoteSymbols(targetHoldings));
            set((current) => ({
                holdings: applyStockQuotesToHoldings(current.holdings, quoteMap),
                isLoadingQuotes: false,
            } as any));
        } catch (error) {
            console.error('Failed to update quotes:', error);
            set({ isLoadingQuotes: false } as any);
        }
    },

    fetchFundNavForHoldings: async () => {
        const state = get();
        const targetHoldings = filterActive(state.holdings).filter((h) => h.type === 'FUNDS');
        if (targetHoldings.length === 0) return;

        try {
            const result = await refreshFundNavData(targetHoldings);
            if (!result || result.quotes.length === 0) return;

            const { targetByHoldingId, quotes, rateUpdates } = result;
            if (Object.keys(rateUpdates).length > 0) {
                set(rateUpdates);
            }

            const { exchangeRateUSD, exchangeRateEUR } = get();
            set((current) => ({
                holdings: applyFundNavQuotesToHoldings(
                    current.holdings,
                    targetByHoldingId,
                    quotes,
                    exchangeRateUSD,
                    exchangeRateEUR,
                ),
            }));
        } catch (error) {
            console.error('Failed to update fund NAV:', error);
        }
    },
});
