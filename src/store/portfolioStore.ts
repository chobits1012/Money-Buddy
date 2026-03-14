import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PortfolioState, Transaction, AssetType, StockHolding, StockAssetType, PurchaseRecord, CustomCategory, CapitalDeposit } from '../types';
import { DEFAULT_USD_RATE } from '../utils/constants';

// 從購買紀錄重新計算持倉聚合值
function recalcHolding(holding: StockHolding): StockHolding {
    const purchases = holding.purchases;
    if (purchases.length === 0) {
        return { ...holding, shares: 0, avgPrice: 0, totalAmount: 0, totalAmountUSD: undefined, unrealizedPnL: undefined, realizedPnL: 0 };
    }

    // 確保以時間順序處理交易
    const sortedPurchases = [...purchases].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalShares = 0;
    let totalCost = 0;
    let totalCostUSD = 0;
    let realizedPnL = 0;

    const isUSStock = holding.type === 'US_STOCK';

    for (const p of sortedPurchases) {
        const action = p.action || 'BUY';

        if (action === 'BUY') {
            totalShares += p.shares;
            totalCost += p.totalCost;
            if (p.totalCostUSD) {
                totalCostUSD += p.totalCostUSD;
            }
        } else if (action === 'SELL') {
            const currentAvgPrice = totalShares > 0
                ? (isUSStock ? totalCostUSD / totalShares : totalCost / totalShares)
                : 0;

            const sellShares = Math.min(p.shares, totalShares); // 防止超賣
            
            // 已實現損益：(賣出總額 - 目前均價 * 賣出單位數)
            const pnl = isUSStock && p.totalCostUSD
                ? (p.totalCostUSD - currentAvgPrice * sellShares)
                : (p.totalCost - currentAvgPrice * sellShares);

            realizedPnL += pnl;

            // 按比例扣除總成本，保持均價不變
            if (totalShares > 0) {
                const proportion = sellShares / totalShares;
                totalCost -= (totalCost * proportion);
                totalCostUSD -= (totalCostUSD * proportion);
            }
            totalShares -= sellShares;
        }
    }

    // 防禦性處理浮點數誤差
    if (totalShares < 0.000001) {
        totalShares = 0;
        totalCost = 0;
        totalCostUSD = 0;
    }

    const avgPrice = totalShares > 0
        ? (isUSStock ? totalCostUSD / totalShares : totalCost / totalShares)
        : 0;

    let unrealizedPnL = undefined;
    if (holding.currentPrice !== undefined && totalShares > 0) {
        unrealizedPnL = (holding.currentPrice - avgPrice) * totalShares;
    }

    return {
        ...holding,
        shares: Number(totalShares.toFixed(6)),
        avgPrice: Math.round(avgPrice * 100) / 100,
        totalAmount: Math.round(totalCost), // 台幣取整數
        totalAmountUSD: totalCostUSD > 0 ? Number(totalCostUSD.toFixed(2)) : undefined, // 美金取兩位
        unrealizedPnL: unrealizedPnL !== undefined ? Math.round(unrealizedPnL * 100) / 100 : undefined,
        realizedPnL: Math.round(realizedPnL * 100) / 100,
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
        action?: 'BUY' | 'SELL';
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
        action?: 'BUY' | 'SELL';
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
                    action: params.action || 'BUY',
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
                            // 美國股票的 realizedPnL 實際上儲存的單位也是根據是否傳入 USD 來決定的（這裡目前依據 recalHolding 邏輯，美股算出來的 PnL 是美金單位）
                            pnlDeltaUSD = diff; 
                        } else {
                            pnlDeltaTWD = diff;
                        }

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
                        const recalculated = recalcHolding(newHolding);
                        updatedHoldings = [...updatedHoldings, recalculated];
                        
                        if (recalculated.type === 'US_STOCK') {
                            pnlDeltaUSD = recalculated.realizedPnL || 0;
                        } else {
                            pnlDeltaTWD = recalculated.realizedPnL || 0;
                        }
                    }

                    // 如果是賣出，代表有現金收回。
                    // 目前架構下：
                    // 台股/基金/虛擬幣：占用 totalCapitalPool 裡面的「可用資金」。賣出後，不需要特別去改 CapitalPool，因為 totalInvested 會變少。
                    // 但是！如果你「虧損」或「獲益」，這部分資金是真正的增減，需要反映回總資金池。
                    // 因此我們將 Delta(RealizedPnL) 加回到資金池中。
                    return { 
                        holdings: updatedHoldings,
                        totalCapitalPool: state.totalCapitalPool + pnlDeltaTWD,
                        usStockFundPool: state.usStockFundPool + pnlDeltaUSD
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

                        return { 
                            holdings: state.holdings.filter((h) => h.id !== holdingId),
                            totalCapitalPool: state.totalCapitalPool + pnlDeltaTWD,
                            usStockFundPool: state.usStockFundPool + pnlDeltaUSD
                        };
                    }

                    const recalculated = recalcHolding(holding);
                    updated[holdingIndex] = recalculated;
                    
                    const newPnL = recalculated.realizedPnL || 0;
                    const diff = newPnL - oldPnL;
                    if (holding.type === 'US_STOCK') pnlDeltaUSD = diff;
                    else pnlDeltaTWD = diff;

                    return { 
                        holdings: updated,
                        totalCapitalPool: state.totalCapitalPool + pnlDeltaTWD,
                        usStockFundPool: state.usStockFundPool + pnlDeltaUSD
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
                    updated[holdingIndex] = recalcHolding(holding);
                    
                    return { holdings: updated };
                });
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
                        totalCapitalPool: state.totalCapitalPool + pnlDeltaTWD,
                        usStockFundPool: state.usStockFundPool + pnlDeltaUSD
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
                    holding.purchases = holding.purchases.map((p) => {
                        if (p.id !== purchaseId) return p;
                        return { ...p, ...updates };
                    });

                    const recalculated = recalcHolding(holding);
                    updatedHoldings[holdingIndex] = recalculated;

                    const newPnL = recalculated.realizedPnL || 0;
                    const diff = newPnL - oldPnL;

                    let pnlDeltaTWD = 0;
                    let pnlDeltaUSD = 0;
                    if (holding.type === 'US_STOCK') pnlDeltaUSD = diff;
                    else pnlDeltaTWD = diff;

                    return { 
                        holdings: updatedHoldings,
                        totalCapitalPool: state.totalCapitalPool + pnlDeltaTWD,
                        usStockFundPool: state.usStockFundPool + pnlDeltaUSD
                    };
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
