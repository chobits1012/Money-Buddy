import type { StateCreator } from 'zustand';
import type { 
    HoldingState, Transaction, StockHolding, StockAssetType, 
    AssetType, PortfolioStore
} from '../../types';
import { recalcHolding } from '../../utils/finance';
import { isActive, filterActive } from '../../utils/entityActive';
import { 
    calculateTransactionImpact, 
    calculateNewHoldingImpact, 
    calculateRemovalImpact,
    calculateHoldingRemovalImpact,
    calculateUpdateImpact,
    type AccountingImpact 
} from '../../utils/accounting';

export interface HoldingActions {
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
    removeTransaction: (id: string) => void;
    getAvailableCapital: () => number;
    getGlobalFreeCapital: () => number;
    getAssetTotals: () => Record<AssetType, number>;
    
    buyStock: (params: {
        type: StockAssetType;
        name: string;
        symbol?: string;
        action?: 'BUY' | 'SELL';
        shares: number;
        pricePerShare: number;
        totalCost: number;
        totalCostUSD?: number;
        exchangeRate?: number;
        note?: string;
        poolId?: string;
    }) => void;
    removePurchase: (holdingId: string, purchaseId: string) => void;
    updateHoldingName: (id: string, name: string) => void;
    updateHoldingQuote: (id: string, currentPrice: number) => void;
    updateHoldingPool: (id: string, poolId: string) => void;
    removeHolding: (id: string) => void;
    getHoldingsByType: (type: StockAssetType) => StockHolding[];
    getHoldingsTotalByType: (type: StockAssetType) => number;
    updatePurchase: (holdingId: string, purchaseId: string, updates: {
        action?: 'BUY' | 'SELL';
        shares?: number;
        pricePerShare?: number;
        totalCost?: number;
        totalCostUSD?: number;
        exchangeRate?: number;
        note?: string;
    }) => void;
    fetchQuotesForHoldings: () => Promise<void>;

    addCustomCategory: (params: { name: string; amount: number; note: string }) => void;
    updateCustomCategory: (id: string, updates: { name?: string; amount?: number; note?: string }) => void;
    removeCustomCategory: (id: string) => void;
    getCustomCategoriesTotal: () => number;
}

export type HoldingSlice = HoldingState & HoldingActions;

export const createHoldingSlice: StateCreator<
    PortfolioStore,
    [],
    [],
    HoldingSlice
> = (set, get) => ({
    transactions: [],
    holdings: [],
    customCategories: [],
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
                const usdBase = Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0);
                const twdAmount = payload.amount || 0;
                if (payload.action === 'DEPOSIT') {
                    // 保護主帳戶：美股入金視為台幣主帳戶轉出，不可超過可分配餘額
                    if (state.totalCapitalPool < twdAmount) return {};
                    updates.usdAccountCash = usdBase + (payload.amountUSD || 0);
                    updates.usStockFundPool = usdBase + (payload.amountUSD || 0);
                    // 主帳戶可分配資金（totalCapitalPool）扣除轉出
                    updates.totalCapitalPool = Math.max(0, state.totalCapitalPool - twdAmount);
                } else if (payload.action === 'WITHDRAWAL') {
                    if (usdBase < (payload.amountUSD || 0)) return {};
                    // 美股提領回台幣，主帳戶可分配資金增加，但不可超過主資產上限
                    updates.usdAccountCash = usdBase - (payload.amountUSD || 0);
                    updates.usStockFundPool = usdBase - (payload.amountUSD || 0);
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
                const usdBase = Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0);
                const twdAmount = tx.amount || 0;
                if (tx.action === 'DEPOSIT') {
                    updates.usdAccountCash = usdBase - (tx.amountUSD || 0);
                    updates.usStockFundPool = usdBase - (tx.amountUSD || 0);
                    updates.totalCapitalPool = Math.min(
                        state.masterTwdTotal,
                        state.totalCapitalPool + twdAmount
                    );
                } else if (tx.action === 'WITHDRAWAL') {
                    updates.usdAccountCash = usdBase + (tx.amountUSD || 0);
                    updates.usStockFundPool = usdBase + (tx.amountUSD || 0);
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

        const usdBase = Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0);
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

    getGlobalFreeCapital: () => {
        const state = get();
        const holdingsInGlobal = filterActive(state.holdings).filter(h => !h.poolId && h.type !== 'US_STOCK');
        const totalInvestedGlobal = holdingsInGlobal.reduce((sum, h) => sum + h.totalAmount, 0);
        const customTotal = state.getCustomCategoriesTotal();
        const globalFree = state.totalCapitalPool - totalInvestedGlobal - customTotal;
        return globalFree > 0 ? Math.round(globalFree) : 0;
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

            const { cashDeltaTWD, cashDeltaUSD, pnlDeltaTWD, pnlDeltaUSD } = impact;

            return { 
                holdings: updatedHoldings,
                // 如果指定了 Pool，或是美股（美股有獨立的 usStockFundPool），則不影響全域本金池
                // 否則，將損益變動 (pnlDelta) 回流至全域資產池
                totalCapitalPool: (params.poolId || params.type === 'US_STOCK') 
                    ? state.totalCapitalPool 
                    : state.totalCapitalPool + pnlDeltaTWD,
                
                // 美股資金池：增加/減少現金變動 (cashDelta) 以及 損益變動 (pnlDelta)
                usdAccountCash: Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0) + pnlDeltaUSD,
                usStockFundPool: Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0) + pnlDeltaUSD,
                
                // 入金池連動
                pools: params.poolId ? state.pools.map(p => p.id === params.poolId ? { 
                    ...p, 
                    // 分配預算 (allocatedBudget) 應隨損益變動 (pnlDelta) 增減 (複利效應)
                    allocatedBudget: p.allocatedBudget + (p.type === 'US_STOCK' ? pnlDeltaUSD : pnlDeltaTWD),
                    // 剩餘現金 (currentCash) 隨實際交易金額 (cashDelta) 增減
                    currentCash: p.currentCash + (p.type === 'US_STOCK' ? cashDeltaUSD : cashDeltaTWD),
                    updatedAt: new Date().toISOString()
                } : p) : state.pools,
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
                updatedHoldings = state.holdings.map((h) =>
                    h.id === holdingId ? { ...h, deletedAt: now, updatedAt: now } : h
                );
            } else {
                updatedHoldings[holdingIndex] = updatedHolding;
            }

            return { 
                holdings: updatedHoldings,
                totalCapitalPool: (holding.poolId || holding.type === 'US_STOCK') 
                    ? state.totalCapitalPool 
                    : state.totalCapitalPool + pnlDeltaTWD,
                
                usdAccountCash: Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0) + pnlDeltaUSD,
                usStockFundPool: Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0) + pnlDeltaUSD,
                
                pools: holding.poolId ? state.pools.map(p => p.id === holding.poolId ? { 
                    ...p, 
                    allocatedBudget: p.allocatedBudget + (p.type === 'US_STOCK' ? pnlDeltaUSD : pnlDeltaTWD),
                    currentCash: p.currentCash + (p.type === 'US_STOCK' ? cashDeltaUSD : cashDeltaTWD),
                    updatedAt: new Date().toISOString()
                } : p) : state.pools,
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
                totalCapitalPool: (holding.poolId || holding.type === 'US_STOCK') 
                    ? state.totalCapitalPool 
                    : state.totalCapitalPool + pnlDeltaTWD,
                
                usdAccountCash: Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0) + pnlDeltaUSD,
                usStockFundPool: Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0) + pnlDeltaUSD,
                
                pools: holding.poolId ? state.pools.map(p => p.id === holding.poolId ? { 
                    ...p, 
                    allocatedBudget: p.allocatedBudget + (p.type === 'US_STOCK' ? pnlDeltaUSD : pnlDeltaTWD),
                    currentCash: p.currentCash + (p.type === 'US_STOCK' ? cashDeltaUSD : cashDeltaTWD),
                    updatedAt: now,
                } : p) : state.pools,
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
                totalCapitalPool: (holding.poolId || holding.type === 'US_STOCK') 
                    ? state.totalCapitalPool 
                    : state.totalCapitalPool + pnlDeltaTWD,
                
                usdAccountCash: Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0) + pnlDeltaUSD,
                usStockFundPool: Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0) + pnlDeltaUSD,
                
                pools: holding.poolId ? state.pools.map(p => p.id === holding.poolId ? { 
                    ...p, 
                    allocatedBudget: p.allocatedBudget + (p.type === 'US_STOCK' ? pnlDeltaUSD : pnlDeltaTWD),
                    currentCash: p.currentCash + (p.type === 'US_STOCK' ? cashDeltaUSD : cashDeltaTWD),
                    updatedAt: new Date().toISOString()
                } : p) : state.pools,
            };
        });
    },

    addCustomCategory: (params) => {
        const now = new Date().toISOString();
        set((state) => ({
            customCategories: [...state.customCategories, {
                id: crypto.randomUUID(),
                name: params.name.trim(),
                amount: params.amount,
                note: params.note,
                createdAt: now,
                updatedAt: now,
            }],
        }));
    },

    updateCustomCategory: (id, updates) => {
        set((state) => ({
            customCategories: state.customCategories.map((c) =>
                c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
            ),
        }));
    },

    removeCustomCategory: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
            customCategories: state.customCategories.map((c) =>
                c.id === id ? { ...c, deletedAt: now, updatedAt: now } : c
            ),
        }));
    },

    getCustomCategoriesTotal: () => {
        return filterActive(get().customCategories).reduce((sum, c) => sum + c.amount, 0);
    },

    fetchQuotesForHoldings: async () => {
        const state = get();
        const targetHoldings = filterActive(state.holdings).filter(
            h => (h.type === 'TAIWAN_STOCK' || h.type === 'US_STOCK') && h.symbol
        );

        if (targetHoldings.length === 0) return;

        set({ isLoadingQuotes: true } as any);

        try {
            const symbols = [...new Set(targetHoldings.map(h => h.type === 'TAIWAN_STOCK' && !h.symbol!.includes('.') ? `${h.symbol}.TW` : h.symbol!))];
            const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols.join(','))}`);
            if (!res.ok) throw new Error('Failed to fetch quotes');
            
            const quotes = await res.json();
            const quoteMap: Record<string, number> = {};
            quotes.forEach((q: any) => {
                quoteMap[q.symbol] = q.price;
                if (q.symbol.endsWith('.TW')) {
                    quoteMap[q.symbol.replace('.TW', '')] = q.price;
                }
            });

            set((state) => {
                const updated = state.holdings.map(h => {
                    if (h.deletedAt || !h.symbol || !quoteMap[h.symbol]) return h;
                    return recalcHolding({ ...h, currentPrice: quoteMap[h.symbol] } as any);
                });
                return { holdings: updated, isLoadingQuotes: false } as any;
            });
        } catch (error) {
            console.error('Failed to update quotes:', error);
            set({ isLoadingQuotes: false } as any);
        }
    },
});
