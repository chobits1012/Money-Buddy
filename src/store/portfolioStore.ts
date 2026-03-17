import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import CryptoJS from 'crypto-js';
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

    // ═══ 入金池管理 ═══
    addPool: (name: string, initialAmount?: number) => void;
    removePool: (id: string) => void;
    allocateToPool: (poolId: string, amount: number) => void;
    withdrawFromPool: (poolId: string, amount: number) => void;
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

    // ═══ 自訂欄位管理 ═══
    addCustomCategory: (params: { name: string; amount: number; note: string }) => void;
    updateCustomCategory: (id: string, updates: { name?: string; amount?: number; note?: string }) => void;
    removeCustomCategory: (id: string) => void;
    getCustomCategoriesTotal: () => number;

    // ═══ 雲端同步 ═══
    overwriteState: (newState: PortfolioState) => void;
    restoreFromSnapshot: () => boolean;
}

const initialState: PortfolioState = {
    pools: [],
    totalCapitalPool: 0,
    capitalDeposits: [],
    usStockFundPool: 0,
    exchangeRateUSD: DEFAULT_USD_RATE,
    transactions: [],
    holdings: [],
    customCategories: [],
    isConfigured: false,
    lastSyncedAt: undefined,
};

const ENCRYPTION_KEY = import.meta.env.VITE_STORAGE_ENCRYPTION_KEY || 'default_secret_key_DO_NOT_USE_IN_PROD';

const encryptedStorage = {
    getItem: (name: string) => {
        const encrypted = localStorage.getItem(name);
        if (!encrypted) return null;
        try {
            const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            return decrypted ? decrypted : null;
        } catch (e) {
            console.error('解密本地資料失敗', e);
            return null;
        }
    },
    setItem: (name: string, value: string) => {
        const encrypted = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
        localStorage.setItem(name, encrypted);
    },
    removeItem: (name: string) => {
        localStorage.removeItem(name);
    },
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
                    updatedAt: now,
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
                    updatedAt: now,
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

            addPool: (name: string, initialAmount: number = 0) => {
                const now = new Date().toISOString();
                const newPool = {
                    id: crypto.randomUUID(),
                    name,
                    allocatedBudget: initialAmount,
                    currentCash: initialAmount,
                    type: 'TAIWAN_STOCK' as AssetType,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({
                    totalCapitalPool: state.totalCapitalPool - initialAmount,
                    pools: [...(state.pools || []), newPool],
                }));
            },

            removePool: (id: string) => {
                set((state) => {
                    const poolToRemove = state.pools.find(p => p.id === id);
                    if (!poolToRemove) return {};
                    
                    return {
                        totalCapitalPool: state.totalCapitalPool + poolToRemove.allocatedBudget,
                        pools: state.pools.filter((p) => p.id !== id),
                        // 將原本屬於該軍團的持倉「釋放」回全局
                        holdings: state.holdings.map(h => h.poolId === id ? { ...h, poolId: undefined } : h)
                    };
                });
            },

            allocateToPool: (poolId: string, amount: number) => {
                set((state) => {
                    if (state.totalCapitalPool < amount) return {};
                    return {
                        totalCapitalPool: state.totalCapitalPool - amount,
                        pools: (state.pools || []).map((p) =>
                            p.id === poolId
                                ? { ...p, allocatedBudget: p.allocatedBudget + amount, currentCash: p.currentCash + amount, updatedAt: new Date().toISOString() }
                                : p
                        ),
                    };
                });
            },

            withdrawFromPool: (poolId: string, amount: number) => {
                set((state) => {
                    const pool = (state.pools || []).find((p) => p.id === poolId);
                    if (!pool || pool.currentCash < amount) return {};
                    return {
                        totalCapitalPool: state.totalCapitalPool + amount,
                        pools: (state.pools || []).map((p) =>
                            p.id === poolId
                                ? { ...p, allocatedBudget: p.allocatedBudget - amount, currentCash: p.currentCash - amount, updatedAt: new Date().toISOString() }
                                : p
                        ),
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
                const usHoldingsTotalUSD = state.holdings
                    .filter((h) => h.type === 'US_STOCK' && !h.poolId)
                    .reduce((sum, h) => sum + (h.totalAmountUSD || 0), 0);
                const available = state.usStockFundPool - usHoldingsTotalUSD;
                return available > 0 ? available : 0;
            },

            addTransaction: (payload) => {
                const newTransaction: Transaction = {
                    ...payload,
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                set((state) => {
                    const updates: Partial<PortfolioStore> = {
                        transactions: [newTransaction, ...state.transactions],
                    };

                    // 如果是美股的資金劃撥，同步更新美股資金池
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

                    const updates: Partial<PortfolioStore> = {
                        transactions: state.transactions.filter((t) => t.id !== id),
                    };

                    // 如果刪除的是美股資金劃撥，還原資金池數額
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

                // 台股、基金、虛擬幣從 holdings 累加
                state.holdings.forEach((h) => {
                    if (h.type in totals && h.type !== 'US_STOCK') {
                        totals[h.type] += h.totalAmount;
                    }
                });

                // 美股使用資金池整體金額，並轉換為台幣供 Dashboard 顯示
                totals.US_STOCK = Math.round(state.usStockFundPool * state.exchangeRateUSD);

                (Object.keys(totals) as AssetType[]).forEach(k => {
                    if (totals[k] < 0) totals[k] = 0;
                });

                return totals;
            },

            getAvailableCapital: () => {
                const state = get();
                // 只計算「不屬於任何軍團」且「非美股」的持倉投入 (美股有獨立的 usStockFundPool)
                const holdingsInGlobal = state.holdings.filter(h => !h.poolId && h.type !== 'US_STOCK');
                const totalInvestedGlobal = holdingsInGlobal.reduce((sum, h) => sum + h.totalAmount, 0);
                
                const customTotal = state.getCustomCategoriesTotal();
                const available = state.totalCapitalPool - totalInvestedGlobal - customTotal;
                return available > 0 ? available : 0;
            },

            resetAll: () => {
                const currentState = get();
                const now = new Date().toISOString();
                
                // 1. 儲存緊急快照到 localStorage (不包含函數)
                const { 
                    isLoadingQuotes, setCapitalPool, addCapitalDeposit, removeCapitalDeposit, 
                    setExchangeRate, addTransaction, removeTransaction, getAvailableCapital, 
                    getAssetTotals, resetAll, setUsStockFundPool, getUsStockAvailableCapital,
                    buyStock, removePurchase, updateHoldingName, updateHoldingQuote, 
                    removeHolding, getHoldingsByType, getHoldingsTotalByType, updatePurchase,
                    fetchQuotesForHoldings, addCustomCategory, updateCustomCategory, 
                    removeCustomCategory, getCustomCategoriesTotal, overwriteState,
                    restoreFromSnapshot,
                    ...stateData 
                } = currentState;

                encryptedStorage.setItem('portfolio-tracker-snapshot', JSON.stringify({
                    ...stateData,
                    snapshotTime: now
                }));

                // 2. 清空資料，但更新 lastSyncedAt 告知雲端這是「最新狀態」（刪除全部）
                set({ 
                    ...initialState, 
                    lastSyncedAt: now,
                    isConfigured: true // 保持已設定狀態，或是根據需求決定
                });
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
                            poolId: params.poolId,
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

                    const cashDeltaTWD = (params.action === 'SELL' ? 1 : -1) * params.totalCost;

                    return { 
                        holdings: updatedHoldings,
                        // 總預算池：僅非軍團、非美股交易時，將已實現損益（獲利/虧損）反映回預算上限
                        totalCapitalPool: (params.poolId || params.type === 'US_STOCK') ? state.totalCapitalPool : state.totalCapitalPool + pnlDeltaTWD,
                        // 美股預算池：反映美股交易造成的損益（美金）
                        usStockFundPool: state.usStockFundPool + pnlDeltaUSD,
                        // 軍團池：同時更新分配預算(反映損益帶來的上限變化)與當前可用現金(實際現金流)
                        pools: params.poolId ? state.pools.map(p => p.id === params.poolId ? { 
                            ...p, 
                            allocatedBudget: p.allocatedBudget + pnlDeltaTWD,
                            currentCash: p.currentCash + cashDeltaTWD,
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

                        return { 
                            holdings: state.holdings.filter((h) => h.id !== holdingId),
                            totalCapitalPool: (holding.poolId || holding.type === 'US_STOCK') ? state.totalCapitalPool : state.totalCapitalPool + pnlDeltaTWD,
                            usStockFundPool: state.usStockFundPool + pnlDeltaUSD,
                            pools: holding.poolId ? state.pools.map(p => p.id === holding.poolId ? { 
                                ...p, 
                                allocatedBudget: p.allocatedBudget + pnlDeltaTWD,
                                currentCash: p.currentCash - oldCashFlow, // 撤銷該筆交易：現金流反向更新
                                updatedAt: new Date().toISOString()
                            } : p) : state.pools,
                        };
                    }

                    const recalculated = recalcHolding(holding);
                    updated[holdingIndex] = recalculated;
                    
                    const newPnL = recalculated.realizedPnL || 0;
                    const diff = newPnL - oldPnL;
                    if (holding.type === 'US_STOCK') pnlDeltaUSD = diff;
                    else pnlDeltaTWD = diff;

                    const purchaseToRemove = state.holdings[holdingIndex].purchases.find(p => p.id === purchaseId);
                    const oldAction = purchaseToRemove?.action || 'BUY';
                    const oldCashFlow = (oldAction === 'SELL' ? 1 : -1) * (purchaseToRemove?.totalCost || 0);

                    return { 
                        holdings: updated,
                        totalCapitalPool: (holding.poolId || holding.type === 'US_STOCK') ? state.totalCapitalPool : state.totalCapitalPool + pnlDeltaTWD,
                        usStockFundPool: state.usStockFundPool + pnlDeltaUSD,
                        pools: holding.poolId ? state.pools.map(p => p.id === holding.poolId ? { 
                            ...p, 
                            allocatedBudget: p.allocatedBudget + pnlDeltaTWD,
                            currentCash: p.currentCash - oldCashFlow,
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
                    updated[holdingIndex] = recalcHolding(holding);
                    
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
                            currentCash: p.currentCash + holding.totalAmount + pnlDeltaTWD, // 刪除持倉：將剩餘成本 + 已實現損益 全數退回現金
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

            overwriteState: (newState) => {
                set({ ...newState, isConfigured: true });
            },

            restoreFromSnapshot: () => {
                const snapshotJson = encryptedStorage.getItem('portfolio-tracker-snapshot');
                if (!snapshotJson) return false;

                try {
                    const snapshot = JSON.parse(snapshotJson);
                    const { snapshotTime, ...stateData } = snapshot;
                    
                    // 恢復資料
                    set({ 
                        ...stateData, 
                        lastSyncedAt: new Date().toISOString() 
                    });
                    
                    // 清除快照，防止重複還原
                    encryptedStorage.removeItem('portfolio-tracker-snapshot');
                    return true;
                } catch (e) {
                    console.error('還原快照失敗', e);
                    return false;
                }
            },
        }),
        {
            name: 'portfolio-tracker-storage',
            version: 1, // v0 → v1: 為所有陣列項目補上 updatedAt
            storage: createJSONStorage(() => encryptedStorage),
            migrate: (persistedState: unknown, version: number) => {
                const state = persistedState as Record<string, unknown>;

                if (version < 1) {
                    // Migration: 為舊資料補上 updatedAt
                    const now = new Date().toISOString();

                    // capitalDeposits
                    if (Array.isArray(state.capitalDeposits)) {
                        state.capitalDeposits = state.capitalDeposits.map((d: Record<string, unknown>) => ({
                            ...d,
                            updatedAt: d.updatedAt || (d.date as string) || now,
                        }));
                    }

                    // transactions
                    if (Array.isArray(state.transactions)) {
                        state.transactions = state.transactions.map((t: Record<string, unknown>) => ({
                            ...t,
                            updatedAt: t.updatedAt || (t.date as string) || now,
                        }));
                    }

                    // holdings & purchases
                    if (Array.isArray(state.holdings)) {
                        state.holdings = state.holdings.map((h: Record<string, unknown>) => {
                            const purchases = Array.isArray(h.purchases)
                                ? h.purchases.map((p: Record<string, unknown>) => ({
                                    ...p,
                                    updatedAt: p.updatedAt || (p.date as string) || now,
                                }))
                                : h.purchases;
                            return {
                                ...h,
                                purchases,
                                updatedAt: h.updatedAt || (h.createdAt as string) || now,
                            };
                        });
                    }

                    // customCategories
                    if (Array.isArray(state.customCategories)) {
                        state.customCategories = state.customCategories.map((c: Record<string, unknown>) => ({
                            ...c,
                            updatedAt: c.updatedAt || (c.createdAt as string) || now,
                        }));
                    }

                    // 初始化 lastSyncedAt
                    if (!state.lastSyncedAt) {
                        state.lastSyncedAt = undefined;
                    }
                }

                return state as unknown as PortfolioState & { isLoadingQuotes: boolean };
            },
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.error('復原 LocalStorage 資料時發生錯誤:', error);
                }
            },
        }
    )
);
