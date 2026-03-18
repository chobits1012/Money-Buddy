import type { StateCreator } from 'zustand';
import type { CapitalState, StockAssetType, CapitalDeposit, CapitalWithdrawal, AssetPool, PortfolioStore } from '../../types';

export interface CapitalActions {
    setCapitalPool: (amount: number) => void;
    addCapitalDeposit: (params: { amount: number; note: string }) => void;
    removeCapitalDeposit: (id: string) => void;
    addCapitalWithdrawal: (params: { amount: number; note: string }) => void; // 新增：提領動作
    setExchangeRate: (rate: number) => void;
    addPool: (name: string, type: StockAssetType, initialAmount?: number) => void;
    removePool: (id: string) => void;
    allocateToPool: (poolId: string, amount: number) => void;
    withdrawFromPool: (poolId: string, amount: number) => void;
    setUsStockFundPool: (amount: number) => void;
    getUsStockAvailableCapital: () => number;
}

export type CapitalSlice = CapitalState & CapitalActions;

export const createCapitalSlice: StateCreator<
    PortfolioStore,
    [],
    [],
    CapitalSlice
> = (set, get) => ({
    totalCapitalPool: 0,
    capitalDeposits: [],
    capitalWithdrawals: [], // 新增：初始化提領紀錄
    pools: [],
    usStockFundPool: 0,
    exchangeRateUSD: 31, // Default or imported constant

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

    addCapitalWithdrawal: (params) => { // 新增：提領動作的實現
        if (params.amount <= 0 || isNaN(params.amount)) return;
        const now = new Date().toISOString();
        const state = get();

        // 檢查是否有足夠的總資金可供提領
        if (state.totalCapitalPool < params.amount) {
            console.warn('提領失敗：總資金不足。');
            return;
        }

        const withdrawal: CapitalWithdrawal = {
            id: crypto.randomUUID(),
            amount: params.amount,
            note: params.note || '提領',
            date: now,
            updatedAt: now,
        };
        set((state) => ({
            totalCapitalPool: state.totalCapitalPool - params.amount,
            capitalWithdrawals: [...state.capitalWithdrawals, withdrawal],
        }));
    },

    addPool: (name: string, type: StockAssetType, initialAmount: number = 0) => {
        const now = new Date().toISOString();
        const newPool: AssetPool = {
            id: crypto.randomUUID(),
            name,
            allocatedBudget: initialAmount,
            currentCash: initialAmount,
            type,
            createdAt: now,
            updatedAt: now,
        };
        set((state) => {
            if (type === 'US_STOCK') {
                return {
                    usStockFundPool: state.usStockFundPool - initialAmount,
                    pools: [...(state.pools || []), newPool],
                };
            }
            return {
                totalCapitalPool: state.totalCapitalPool - initialAmount,
                pools: [...(state.pools || []), newPool],
            };
        });
    },

    removePool: (id: string) => {
        set((state) => {
            const poolToRemove = state.pools.find(p => p.id === id);
            if (!poolToRemove) return {};
            
            if (poolToRemove.type === 'US_STOCK') {
                return {
                    usStockFundPool: state.usStockFundPool + poolToRemove.allocatedBudget,
                    pools: state.pools.filter((p) => p.id !== id),
                    holdings: state.holdings.map(h => h.poolId === id ? { ...h, poolId: undefined } : h)
                };
            }

            return {
                totalCapitalPool: state.totalCapitalPool + poolToRemove.allocatedBudget,
                pools: state.pools.filter((p) => p.id !== id),
                holdings: state.holdings.map(h => h.poolId === id ? { ...h, poolId: undefined } : h)
            };
        });
    },

    allocateToPool: (poolId: string, amount: number) => {
        set((state) => {
            const pool = state.pools.find(p => p.id === poolId);
            if (!pool) return {};

            if (pool.type === 'US_STOCK') {
                if (state.usStockFundPool < amount) return {};
                return {
                    usStockFundPool: state.usStockFundPool - amount,
                    pools: state.pools.map((p) =>
                        p.id === poolId
                            ? { ...p, allocatedBudget: p.allocatedBudget + amount, currentCash: p.currentCash + amount, updatedAt: new Date().toISOString() }
                            : p
                    ),
                };
            }

            if (state.totalCapitalPool < amount) return {};
            return {
                totalCapitalPool: state.totalCapitalPool - amount,
                pools: state.pools.map((p) =>
                    p.id === poolId
                        ? { ...p, allocatedBudget: p.allocatedBudget + amount, currentCash: p.currentCash + amount, updatedAt: new Date().toISOString() }
                        : p
                ),
            };
        });
    },

    withdrawFromPool: (poolId: string, amount: number) => {
        set((state) => {
            const pool = state.pools.find((p) => p.id === poolId);
            if (!pool || pool.currentCash < amount) return {};

            if (pool.type === 'US_STOCK') {
                return {
                    usStockFundPool: state.usStockFundPool + amount,
                    pools: state.pools.map((p) =>
                        p.id === poolId
                            ? { ...p, allocatedBudget: p.allocatedBudget - amount, currentCash: p.currentCash - amount, updatedAt: new Date().toISOString() }
                            : p
                    ),
                };
            }

            return {
                totalCapitalPool: state.totalCapitalPool + amount,
                pools: state.pools.map((p) =>
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

    setUsStockFundPool: (amount: number) => {
        if (amount < 0 || isNaN(amount)) return;
        set({ usStockFundPool: amount });
    },

    getUsStockAvailableCapital: () => {
        const state = get();
        const holdingsInUS = state.holdings.filter(h => !h.poolId && h.type === 'US_STOCK');
        const totalInvestedUSD = holdingsInUS.reduce((sum, h) => sum + (h.totalAmountUSD || 0), 0);
        const poolsUSD = state.pools.filter(p => p.type === 'US_STOCK').reduce((sum, p) => sum + p.allocatedBudget, 0);
        const available = state.usStockFundPool - totalInvestedUSD - poolsUSD;
        return available > 0 ? available : 0;
    },
});
