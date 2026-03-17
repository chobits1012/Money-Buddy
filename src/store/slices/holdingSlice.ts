import type { StateCreator } from 'zustand';
import type { 
    HoldingState, Transaction, StockHolding, StockAssetType, 
    AssetType, PortfolioStore
} from '../../types';
import { recalcHolding } from '../../utils/finance';

export interface HoldingActions {
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
    removeTransaction: (id: string) => void;
    getAvailableCapital: () => number;
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
                if (payload.action === 'DEPOSIT') {
                    updates.usStockFundPool = state.usStockFundPool + (payload.amountUSD || 0);
                } else if (payload.action === 'WITHDRAWAL') {
                    updates.usStockFundPool = state.usStockFundPool - (payload.amountUSD || 0);
                }
            }

            return updates;
        });
    },

    removeTransaction: (id: string) => {
        set((state) => {
            const tx = state.transactions.find((t) => t.id === id);
            if (!tx) return {};

            const updates: any = {
                transactions: state.transactions.filter((t) => t.id !== id),
            };

            if (tx.type === 'US_STOCK') {
                if (tx.action === 'DEPOSIT') {
                    updates.usStockFundPool = state.usStockFundPool - (tx.amountUSD || 0);
                } else if (tx.action === 'WITHDRAWAL') {
                    updates.usStockFundPool = state.usStockFundPool + (tx.amountUSD || 0);
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

        state.holdings.forEach((h) => {
            if (h.type in totals && h.type !== 'US_STOCK') {
                totals[h.type] += h.totalAmount;
            }
        });

        totals.US_STOCK = Math.round(state.usStockFundPool * state.exchangeRateUSD);

        (Object.keys(totals) as AssetType[]).forEach(k => {
            if (totals[k] < 0) totals[k] = 0;
        });

        return totals;
    },

    getAvailableCapital: () => {
        const state = get();
        const holdingsInGlobal = state.holdings.filter(h => !h.poolId && h.type !== 'US_STOCK');
        const totalInvestedGlobal = holdingsInGlobal.reduce((sum, h) => sum + h.totalAmount, 0);
        
        const customTotal = state.getCustomCategoriesTotal();
        const available = state.totalCapitalPool - totalInvestedGlobal - customTotal;
        return available > 0 ? available : 0;
    },

    buyStock: (params) => {
        const now = new Date().toISOString();
        const newPurchase = {
            id: crypto.randomUUID(),
            date: now,
            action: params.action || 'BUY',
            shares: params.shares,
            pricePerShare: params.pricePerShare,
            totalCost: params.totalCost,
            totalCostUSD: params.totalCostUSD,
            exchangeRate: params.exchangeRate,
            note: params.note,
            updatedAt: now,
        };

        set((state) => {
            const existingIndex = state.holdings.findIndex(
                (h) => h.type === params.type && h.name.toLowerCase() === params.name.toLowerCase() && h.poolId === params.poolId
            );

            let updatedHoldings = [...state.holdings];
            let pnlDeltaTWD = 0;
            let pnlDeltaUSD = 0;

            if (existingIndex >= 0) {
                const existing = { ...updatedHoldings[existingIndex] };
                const oldPnL = existing.realizedPnL || 0;
                
                existing.purchases = [...existing.purchases, newPurchase];
                const recalculated = recalcHolding(existing);
                updatedHoldings[existingIndex] = recalculated;
                
                const newPnL = recalculated.realizedPnL || 0;
                const diff = newPnL - oldPnL;
                
                if (existing.type === 'US_STOCK') {
                    pnlDeltaUSD = diff; 
                } else {
                    pnlDeltaTWD = diff;
                }
            } else {
                const newHolding = {
                    id: crypto.randomUUID(),
                    type: params.type,
                    name: params.name.trim(),
                    symbol: params.symbol,
                    purchases: [newPurchase],
                    poolId: params.poolId,
                    shares: 0,
                    avgPrice: 0,
                    totalAmount: 0,
                    createdAt: now,
                    updatedAt: now,
                };
                const recalculated = recalcHolding(newHolding as any);
                updatedHoldings = [...updatedHoldings, recalculated];
                
                if (recalculated.type === 'US_STOCK') {
                    pnlDeltaUSD = recalculated.realizedPnL || 0;
                } else {
                    pnlDeltaTWD = recalculated.realizedPnL || 0;
                }
            }

            const cashDeltaTWD = (params.action === 'SELL' ? 1 : -1) * params.totalCost;
            const cashDeltaUSD = (params.action === 'SELL' ? 1 : -1) * (params.totalCostUSD || 0);

            return { 
                holdings: updatedHoldings,
                totalCapitalPool: (params.poolId || params.type === 'US_STOCK') ? state.totalCapitalPool : state.totalCapitalPool + pnlDeltaTWD,
                usStockFundPool: state.usStockFundPool + pnlDeltaUSD,
                pools: params.poolId ? state.pools.map(p => p.id === params.poolId ? { 
                    ...p, 
                    allocatedBudget: p.allocatedBudget + (p.type === 'US_STOCK' ? pnlDeltaUSD : pnlDeltaTWD),
                    currentCash: p.currentCash + (p.type === 'US_STOCK' ? cashDeltaUSD : cashDeltaTWD),
                    updatedAt: now
                } : p) : state.pools,
            };
        });
    },

    removePurchase: (holdingId, purchaseId) => {
        set((state) => {
            const holdingIndex = state.holdings.findIndex((h) => h.id === holdingId);
            if (holdingIndex < 0) return {};

            const updated = [...state.holdings];
            const holding = { ...updated[holdingIndex] };
            const oldPnL = holding.realizedPnL || 0;
            holding.purchases = holding.purchases.filter((p) => p.id !== purchaseId);

            let pnlDeltaTWD = 0;
            let pnlDeltaUSD = 0;

            if (holding.purchases.length === 0) {
                const diff = 0 - oldPnL;
                if (holding.type === 'US_STOCK') pnlDeltaUSD = diff;
                else pnlDeltaTWD = diff;

                const purchaseToRemove = state.holdings[holdingIndex].purchases.find(p => p.id === purchaseId);
                const oldAction = purchaseToRemove?.action || 'BUY';
                const oldCashFlow = (oldAction === 'SELL' ? 1 : -1) * (purchaseToRemove?.totalCost || 0);
                const oldCashFlowUSD = (oldAction === 'SELL' ? 1 : -1) * (purchaseToRemove?.totalCostUSD || 0);

                return { 
                    holdings: state.holdings.filter((h) => h.id !== holdingId),
                    totalCapitalPool: (holding.poolId || holding.type === 'US_STOCK') ? state.totalCapitalPool : state.totalCapitalPool + pnlDeltaTWD,
                    usStockFundPool: state.usStockFundPool + pnlDeltaUSD,
                    pools: holding.poolId ? state.pools.map(p => p.id === holding.poolId ? { 
                        ...p, 
                        allocatedBudget: p.allocatedBudget + (p.type === 'US_STOCK' ? pnlDeltaUSD : pnlDeltaTWD),
                        currentCash: p.currentCash - (p.type === 'US_STOCK' ? oldCashFlowUSD : oldCashFlow),
                        updatedAt: new Date().toISOString()
                    } : p) : state.pools,
                };
            }

            const recalculated = recalcHolding(holding as any);
            updated[holdingIndex] = recalculated;
            
            const newPnL = recalculated.realizedPnL || 0;
            const diff = newPnL - oldPnL;
            if (holding.type === 'US_STOCK') pnlDeltaUSD = diff;
            else pnlDeltaTWD = diff;

            const purchaseToRemove = state.holdings[holdingIndex].purchases.find(p => p.id === purchaseId);
            const oldAction = purchaseToRemove?.action || 'BUY';
            const oldCashFlow = (oldAction === 'SELL' ? 1 : -1) * (purchaseToRemove?.totalCost || 0);
            const oldCashFlowUSD = (oldAction === 'SELL' ? 1 : -1) * (purchaseToRemove?.totalCostUSD || 0);

            return { 
                holdings: updated,
                totalCapitalPool: (holding.poolId || holding.type === 'US_STOCK') ? state.totalCapitalPool : state.totalCapitalPool + pnlDeltaTWD,
                usStockFundPool: state.usStockFundPool + pnlDeltaUSD,
                pools: holding.poolId ? state.pools.map(p => p.id === holding.poolId ? { 
                    ...p, 
                    allocatedBudget: p.allocatedBudget + (p.type === 'US_STOCK' ? pnlDeltaUSD : pnlDeltaTWD),
                    currentCash: p.currentCash - (p.type === 'US_STOCK' ? oldCashFlowUSD : oldCashFlow),
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
            const holding = state.holdings.find((h) => h.id === id);
            if (!holding) return {};
            
            let pnlDeltaTWD = 0;
            let pnlDeltaUSD = 0;
            const oldPnL = holding.realizedPnL || 0;
            const diff = 0 - oldPnL;

            if (holding.type === 'US_STOCK') pnlDeltaUSD = diff;
            else pnlDeltaTWD = diff;

            return {
                holdings: state.holdings.filter((h) => h.id !== id),
                totalCapitalPool: (holding.poolId || holding.type === 'US_STOCK') ? state.totalCapitalPool : state.totalCapitalPool + pnlDeltaTWD,
                usStockFundPool: state.usStockFundPool + pnlDeltaUSD,
                pools: holding.poolId ? state.pools.map(p => p.id === holding.poolId ? { 
                    ...p, 
                    allocatedBudget: p.allocatedBudget + pnlDeltaTWD,
                    currentCash: p.currentCash + holding.totalAmount + pnlDeltaTWD,
                    updatedAt: new Date().toISOString()
                } : p) : state.pools,
            };
        });
    },

    getHoldingsByType: (type) => {
        return get().holdings.filter((h) => h.type === type);
    },

    getHoldingsTotalByType: (type) => {
        return get().holdings
            .filter((h) => h.type === type)
            .reduce((sum, h) => sum + h.totalAmount, 0);
    },

    updatePurchase: (holdingId, purchaseId, updates) => {
        set((state) => {
            const holdingIndex = state.holdings.findIndex((h) => h.id === holdingId);
            if (holdingIndex < 0) return {};

            const updatedHoldings = [...state.holdings];
            const holding = { ...updatedHoldings[holdingIndex] };
            const oldPnL = holding.realizedPnL || 0;
            const oldPurchase = holding.purchases.find(p => p.id === purchaseId);
            if (!oldPurchase) return {};
            
            const oldActionRaw = oldPurchase.action || 'BUY';
            const oldCashFlow = (oldActionRaw === 'SELL' ? 1 : -1) * oldPurchase.totalCost;

            holding.purchases = holding.purchases.map((p) => {
                if (p.id !== purchaseId) return p;
                return { ...p, ...updates };
            });

            const newPurchase = holding.purchases.find(p => p.id === purchaseId)!;
            const newActionRaw = newPurchase.action || 'BUY';
            const newCashFlow = (newActionRaw === 'SELL' ? 1 : -1) * newPurchase.totalCost;
            const cashDeltaTWD = newCashFlow - oldCashFlow;

            const recalculated = recalcHolding(holding as any);
            updatedHoldings[holdingIndex] = recalculated;

            const newPnL = recalculated.realizedPnL || 0;
            const diff = newPnL - oldPnL;

            let pnlDeltaTWD = 0;
            let pnlDeltaUSD = 0;
            if (holding.type === 'US_STOCK') pnlDeltaUSD = diff;
            else pnlDeltaTWD = diff;

            return { 
                holdings: updatedHoldings,
                totalCapitalPool: (holding.poolId || holding.type === 'US_STOCK') ? state.totalCapitalPool : state.totalCapitalPool + pnlDeltaTWD,
                usStockFundPool: state.usStockFundPool + pnlDeltaUSD,
                pools: holding.poolId ? state.pools.map(p => p.id === holding.poolId ? { 
                    ...p, 
                    allocatedBudget: p.allocatedBudget + pnlDeltaTWD,
                    currentCash: p.currentCash + cashDeltaTWD,
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
        set((state) => ({
            customCategories: state.customCategories.filter((c) => c.id !== id),
        }));
    },

    getCustomCategoriesTotal: () => {
        return get().customCategories.reduce((sum, c) => sum + c.amount, 0);
    },

    fetchQuotesForHoldings: async () => {
        const state = get();
        const targetHoldings = state.holdings.filter(
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
                    if (!h.symbol || !quoteMap[h.symbol]) return h;
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
