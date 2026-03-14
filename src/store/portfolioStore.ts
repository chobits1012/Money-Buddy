import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PortfolioState, Transaction, AssetType, StockHolding, StockAssetType, PurchaseRecord, CustomCategory, CapitalDeposit } from '../types';
import { DEFAULT_USD_RATE } from '../utils/constants';

// 從購買紀錄重新計算持倉聚合值
function recalcHolding(holding: StockHolding): StockHolding {
    const purchases = holding.purchases;
    if (purchases.length === 0) {
        return { ...holding, shares: 0, avgPrice: 0, totalAmount: 0, totalAmountUSD: 0 };
    }

    const totalShares = purchases.reduce((sum, p) => sum + p.shares, 0);
    const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
    const totalCostUSD = purchases.reduce((sum, p) => sum + (p.totalCostUSD ?? 0), 0);

    const isUSStock = holding.type === 'US_STOCK';
    const avgPrice = totalShares > 0
        ? (isUSStock ? totalCostUSD / totalShares : totalCost / totalShares)
        : 0;

    let unrealizedPnL = holding.unrealizedPnL;
    if (holding.currentPrice !== undefined && totalShares > 0) {
        unrealizedPnL = (holding.currentPrice - avgPrice) * totalShares;
    } else if (totalShares === 0) {
        unrealizedPnL = undefined;
    }

    return {
        ...holding,
        shares: totalShares,
        avgPrice: Math.round(avgPrice * 100) / 100,
        totalAmount: totalCost,
        totalAmountUSD: totalCostUSD > 0 ? totalCostUSD : undefined,
        unrealizedPnL: unrealizedPnL !== undefined ? Math.round(unrealizedPnL * 100) / 100 : undefined,
        updatedAt: new Date().toISOString(),
    };
}

// Zustand Store 介面
interface PortfolioStore extends PortfolioState {
    isLoadingQuotes: boolean;
    setCapitalPool: (amount: number) => void;
    addCapitalDeposit: (params: { amount: number; note: string }) => void;
    removeCapitalDeposit: (id: string) => void;
    setExchangeRate: (rate: number) => void;
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
    removeTransaction: (id: string) => void;
    getAvailableCapital: () => number;
    getAssetTotals: () => Record<AssetType, number>;
    resetAll: () => void;

    // ═══ 美股資金池管理 ═══
    setUsStockFundPool: (amount: number) => void;
    getUsStockAvailableCapital: () => number;

    // ═══ 個股持倉管理 ═══
    buyStock: (params: {
        type: StockAssetType;
        name: string;
        symbol?: string; // 加入 symbol
        shares: number;
        pricePerShare: number;
        totalCost: number;
        totalCostUSD?: number;
        exchangeRate?: number;
        note?: string;
    }) => void;
    removePurchase: (holdingId: string, purchaseId: string) => void;
    updateHoldingName: (id: string, name: string) => void;
    updateHoldingQuote: (id: string, currentPrice: number) => void;
    removeHolding: (id: string) => void;
    getHoldingsByType: (type: StockAssetType) => StockHolding[];
    getHoldingsTotalByType: (type: StockAssetType) => number;
    updatePurchase: (holdingId: string, purchaseId: string, updates: {
        shares?: number;
        pricePerShare?: number;
        totalCost?: number;
        totalCostUSD?: number;
        exchangeRate?: number;
        note?: string;
    }) => void;
    fetchQuotesForHoldings: () => Promise<void>;

    // ═══ 自訂欄位管理 ═══
    addCustomCategory: (params: { name: string; amount: number; note: string }) => void;
    updateCustomCategory: (id: string, updates: { name?: string; amount?: number; note?: string }) => void;
    removeCustomCategory: (id: string) => void;
    getCustomCategoriesTotal: () => number;
}

const initialState: PortfolioState = {
    totalCapitalPool: 0,
    capitalDeposits: [],
    usStockFundPool: 0,
    exchangeRateUSD: DEFAULT_USD_RATE,
    transactions: [],
    holdings: [],
    customCategories: [],
    isConfigured: false,
};

export const usePortfolioStore = create<PortfolioStore>()(
    persist(
        (set, get) => ({
            ...initialState,
            isLoadingQuotes: false,

            setCapitalPool: (amount: number) => {
                if (amount < 0 || isNaN(amount)) return;
                const now = new Date().toISOString();
                const deposit: CapitalDeposit = {
                    id: crypto.randomUUID(),
                    amount,
                    note: '初始設定',
                    date: now,
                };
                set({ totalCapitalPool: amount, capitalDeposits: [deposit], isConfigured: true });
            },

            addCapitalDeposit: (params) => {
                if (params.amount <= 0 || isNaN(params.amount)) return;
                const now = new Date().toISOString();
                const deposit: CapitalDeposit = {
                    id: crypto.randomUUID(),
                    amount: params.amount,
                    note: params.note || '入金',
                    date: now,
                };
                set((state) => ({
                    totalCapitalPool: state.totalCapitalPool + params.amount,
                    capitalDeposits: [...state.capitalDeposits, deposit],
                }));
            },

            removeCapitalDeposit: (id) => {
                set((state) => {
                    const deposit = state.capitalDeposits.find((d) => d.id === id);
                    if (!deposit) return {};
                    return {
                        totalCapitalPool: state.totalCapitalPool - deposit.amount,
                        capitalDeposits: state.capitalDeposits.filter((d) => d.id !== id),
                    };
                });
            },

            setExchangeRate: (rate: number) => {
                if (rate <= 0 || isNaN(rate)) return;
                set({ exchangeRateUSD: rate });
            },

            // ═══ 美股資金池 ═══
            setUsStockFundPool: (amount: number) => {
                if (amount < 0 || isNaN(amount)) return;
                set({ usStockFundPool: amount });
            },

            getUsStockAvailableCapital: () => {
                const state = get();
                const usHoldingsTotal = state.holdings
                    .filter((h) => h.type === 'US_STOCK')
                    .reduce((sum, h) => sum + h.totalAmount, 0);
                const available = state.usStockFundPool - usHoldingsTotal;
                return available > 0 ? available : 0;
            },

            addTransaction: (payload) => {
                const newTransaction: Transaction = {
                    ...payload,
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                };
                set((state) => ({
                    transactions: [newTransaction, ...state.transactions],
                }));
            },

            removeTransaction: (id: string) => {
                set((state) => ({
                    transactions: state.transactions.filter((t) => t.id !== id),
                }));
            },

            getAssetTotals: () => {
                const state = get();
                const totals: Record<AssetType, number> = {
                    TAIWAN_STOCK: 0,
                    US_STOCK: 0,
                    FUNDS: 0,
                    CRYPTO: 0,
                };

                // 台股、基金、虛擬幣從 holdings 累加
                state.holdings.forEach((h) => {
                    if (h.type in totals && h.type !== 'US_STOCK') {
                        totals[h.type] += h.totalAmount;
                    }
                });

                // 美股使用資金池整體金額
                totals.US_STOCK = state.usStockFundPool;

                (Object.keys(totals) as AssetType[]).forEach(k => {
                    if (totals[k] < 0) totals[k] = 0;
                });

                return totals;
            },

            getAvailableCapital: () => {
                const state = get();
                const totals = state.getAssetTotals();
                const totalInvested = Object.values(totals).reduce((sum, val) => sum + val, 0);
                const customTotal = state.customCategories.reduce((sum, c) => sum + c.amount, 0);
                const available = state.totalCapitalPool - totalInvested - customTotal;
                return available > 0 ? available : 0;
            },

            resetAll: () => {
                set(initialState);
            },

            // ═══ 購買股票 (自動合併) ═══

            buyStock: (params) => {
                const now = new Date().toISOString();
                const newPurchase: PurchaseRecord = {
                    id: crypto.randomUUID(),
                    date: now,
                    shares: params.shares,
                    pricePerShare: params.pricePerShare,
                    totalCost: params.totalCost,
                    totalCostUSD: params.totalCostUSD,
                    exchangeRate: params.exchangeRate,
                    note: params.note,
                };

                set((state) => {
                    const existingIndex = state.holdings.findIndex(
                        (h) => h.type === params.type && h.name.toLowerCase() === params.name.toLowerCase()
                    );

                    if (existingIndex >= 0) {
                        const updated = [...state.holdings];
                        const existing = { ...updated[existingIndex] };
                        existing.purchases = [...existing.purchases, newPurchase];
                        updated[existingIndex] = recalcHolding(existing);
                        return { holdings: updated };
                    } else {
                        const newHolding: StockHolding = {
                            id: crypto.randomUUID(),
                            type: params.type,
                            name: params.name.trim(),
                            symbol: params.symbol,
                            purchases: [newPurchase],
                            shares: 0,
                            avgPrice: 0,
                            totalAmount: 0,
                            createdAt: now,
                            updatedAt: now,
                        };
                        return { holdings: [...state.holdings, recalcHolding(newHolding)] };
                    }
                });
            },

            removePurchase: (holdingId, purchaseId) => {
                set((state) => {
                    const holdingIndex = state.holdings.findIndex((h) => h.id === holdingId);
                    if (holdingIndex < 0) return {};

                    const updated = [...state.holdings];
                    const holding = { ...updated[holdingIndex] };
                    holding.purchases = holding.purchases.filter((p) => p.id !== purchaseId);

                    if (holding.purchases.length === 0) {
                        return { holdings: state.holdings.filter((h) => h.id !== holdingId) };
                    }

                    updated[holdingIndex] = recalcHolding(holding);
                    return { holdings: updated };
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
                    updated[holdingIndex] = recalcHolding(holding);
                    
                    return { holdings: updated };
                });
            },

            removeHolding: (id) => {
                set((state) => ({
                    holdings: state.holdings.filter((h) => h.id !== id),
                }));
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
                    holding.purchases = holding.purchases.map((p) => {
                        if (p.id !== purchaseId) return p;
                        return { ...p, ...updates };
                    });

                    updatedHoldings[holdingIndex] = recalcHolding(holding);
                    return { holdings: updatedHoldings };
                });
            },

            // ═══ 自訂欄位 CRUD ═══

            addCustomCategory: (params) => {
                const now = new Date().toISOString();
                const newCategory: CustomCategory = {
                    id: crypto.randomUUID(),
                    name: params.name.trim(),
                    amount: params.amount,
                    note: params.note,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({
                    customCategories: [...state.customCategories, newCategory],
                }));
            },

            updateCustomCategory: (id, updates) => {
                set((state) => ({
                    customCategories: state.customCategories.map((c) =>
                        c.id === id
                            ? { ...c, ...updates, updatedAt: new Date().toISOString() }
                            : c
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

                set({ isLoadingQuotes: true });

                try {
                    // Extract unique symbols. TW stocks may need .TW appended if Yahoo API requires it.
                    // For now, assume the user selected a valid symbol from AssetSearchInput.
                    const symbols = [...new Set(targetHoldings.map(h => h.type === 'TAIWAN_STOCK' && !h.symbol!.includes('.') ? `${h.symbol}.TW` : h.symbol!))];
                    
                    // Simple batching: if too many, we might need chunks, but let's assume < 100
                    const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols.join(','))}`);
                    if (!res.ok) throw new Error('Failed to fetch quotes');
                    
                    const quotes = await res.json();
                    
                    const quoteMap: Record<string, number> = {};
                    quotes.forEach((q: any) => {
                        quoteMap[q.symbol] = q.price;
                        // Map 2330.TW back to 2330 so we can match it in store
                        if (q.symbol.endsWith('.TW')) {
                            quoteMap[q.symbol.replace('.TW', '')] = q.price;
                        }
                    });

                    set((state) => {
                        const updated = state.holdings.map(h => {
                            if (!h.symbol || !quoteMap[h.symbol]) return h;
                            const currentPrice = quoteMap[h.symbol];
                            return recalcHolding({ ...h, currentPrice });
                        });
                        return { holdings: updated, isLoadingQuotes: false };
                    });

                } catch (error) {
                    console.error('Failed to update quotes:', error);
                    set({ isLoadingQuotes: false });
                }
            },
        }),
        {
            name: 'portfolio-tracker-storage',
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.error('復原 LocalStorage 資料時發生錯誤:', error);
                }
            },
        }
    )
);
