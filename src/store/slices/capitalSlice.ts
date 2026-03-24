import type { StateCreator } from 'zustand';
import type {
    CapitalState,
    StockAssetType,
    CapitalDeposit,
    CapitalWithdrawal,
    AssetPool,
    PortfolioStore,
    PoolLedgerEntry,
} from '../../types';

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
    masterTwdTotal: 0,
    totalCapitalPool: 0,
    capitalDeposits: [],
    capitalWithdrawals: [], // 新增：初始化提領紀錄
    pools: [],
    poolLedger: [],
    usdAccountCash: 0,
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
        set({ masterTwdTotal: amount, totalCapitalPool: amount, capitalDeposits: [deposit], isConfigured: true });
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
            masterTwdTotal: state.masterTwdTotal + params.amount,
            totalCapitalPool: state.totalCapitalPool + params.amount,
            capitalDeposits: [...state.capitalDeposits, deposit],
        }));
    },

    removeCapitalDeposit: (id) => {
        set((state) => {
            const deposit = state.capitalDeposits.find((d) => d.id === id);
            if (!deposit) return {};
            return {
                masterTwdTotal: Math.max(0, state.masterTwdTotal - deposit.amount),
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
            masterTwdTotal: state.masterTwdTotal - params.amount,
            totalCapitalPool: state.totalCapitalPool - params.amount,
            capitalWithdrawals: [...state.capitalWithdrawals, withdrawal],
        }));
    },

    addPool: (name: string, type: StockAssetType, initialAmount: number = 0) => {
        const now = new Date().toISOString();
        const state = get();
        const normalizedInitialAmount = Number(initialAmount);
        if (!name.trim() || isNaN(normalizedInitialAmount) || normalizedInitialAmount < 0) return;

        if (type === 'US_STOCK') {
            const usAvailable = state.getUsStockAvailableCapital();
            if (normalizedInitialAmount > usAvailable) return;
        } else {
            if (normalizedInitialAmount > state.totalCapitalPool) return;
        }

        const newPool: AssetPool = {
            id: crypto.randomUUID(),
            name: name.trim(),
            allocatedBudget: normalizedInitialAmount,
            currentCash: normalizedInitialAmount,
            type,
            createdAt: now,
            updatedAt: now,
        };
        const ledgerEntry: PoolLedgerEntry = {
            id: crypto.randomUUID(),
            poolId: newPool.id,
            poolName: newPool.name,
            marketType: type,
            action: 'POOL_CREATE',
            date: now,
            updatedAt: now,
            amountTWD: type === 'US_STOCK' ? undefined : normalizedInitialAmount,
            amountUSD: type === 'US_STOCK' ? normalizedInitialAmount : undefined,
            note: `建立入金池「${newPool.name}」`,
        };
        set((state) => {
            const poolLedger = [...(state.poolLedger ?? []), ledgerEntry];
            if (type === 'US_STOCK') {
                return {
                    pools: [...(state.pools || []), newPool],
                    poolLedger,
                };
            }
            return {
                totalCapitalPool: state.totalCapitalPool - initialAmount,
                pools: [...(state.pools || []), newPool],
                poolLedger,
            };
        });
    },

    removePool: (id: string) => {
        set((state) => {
            const poolToRemove = state.pools.find(p => p.id === id);
            if (!poolToRemove) return {};

            const now = new Date().toISOString();
            const removeEntry: PoolLedgerEntry = {
                id: crypto.randomUUID(),
                poolId: poolToRemove.id,
                poolName: poolToRemove.name,
                marketType: poolToRemove.type,
                action: 'POOL_REMOVE',
                date: now,
                updatedAt: now,
                amountTWD: poolToRemove.type === 'US_STOCK' ? undefined : poolToRemove.allocatedBudget,
                amountUSD: poolToRemove.type === 'US_STOCK' ? poolToRemove.allocatedBudget : undefined,
                note: `移除入金池「${poolToRemove.name}」（池內配置釋回）`,
            };
            const poolLedger = [...(state.poolLedger ?? []), removeEntry];

            if (poolToRemove.type === 'US_STOCK') {
                return {
                    pools: state.pools.filter((p) => p.id !== id),
                    holdings: state.holdings.map(h => h.poolId === id ? { ...h, poolId: undefined } : h),
                    poolLedger,
                };
            }

            return {
                totalCapitalPool: state.totalCapitalPool + poolToRemove.allocatedBudget,
                pools: state.pools.filter((p) => p.id !== id),
                holdings: state.holdings.map(h => h.poolId === id ? { ...h, poolId: undefined } : h),
                poolLedger,
            };
        });
    },

    allocateToPool: (poolId: string, amount: number) => {
        set((state) => {
            const pool = state.pools.find(p => p.id === poolId);
            if (!pool) return {};

            if (pool.type === 'US_STOCK') {
                const usAvailable = get().getUsStockAvailableCapital();
                if (amount > usAvailable) return {};
                const now = new Date().toISOString();
                const ledgerEntry: PoolLedgerEntry = {
                    id: crypto.randomUUID(),
                    poolId: pool.id,
                    poolName: pool.name,
                    marketType: pool.type,
                    action: 'POOL_ALLOCATE',
                    date: now,
                    updatedAt: now,
                    amountUSD: amount,
                    note: `美元帳戶 → 入金池「${pool.name}」`,
                };
                return {
                    pools: state.pools.map((p) =>
                        p.id === poolId
                            ? { ...p, allocatedBudget: p.allocatedBudget + amount, currentCash: p.currentCash + amount, updatedAt: now }
                            : p
                    ),
                    poolLedger: [...(state.poolLedger ?? []), ledgerEntry],
                };
            }

            if (state.totalCapitalPool < amount) return {};
            const now = new Date().toISOString();
            const ledgerEntry: PoolLedgerEntry = {
                id: crypto.randomUUID(),
                poolId: pool.id,
                poolName: pool.name,
                marketType: pool.type,
                action: 'POOL_ALLOCATE',
                date: now,
                updatedAt: now,
                amountTWD: amount,
                note: `主帳可分配資金 → 入金池「${pool.name}」`,
            };
            return {
                totalCapitalPool: state.totalCapitalPool - amount,
                pools: state.pools.map((p) =>
                    p.id === poolId
                        ? { ...p, allocatedBudget: p.allocatedBudget + amount, currentCash: p.currentCash + amount, updatedAt: now }
                        : p
                ),
                poolLedger: [...(state.poolLedger ?? []), ledgerEntry],
            };
        });
    },

    withdrawFromPool: (poolId: string, amount: number) => {
        set((state) => {
            const pool = state.pools.find((p) => p.id === poolId);
            if (!pool || pool.currentCash < amount) return {};

            const now = new Date().toISOString();

            if (pool.type === 'US_STOCK') {
                const ledgerEntry: PoolLedgerEntry = {
                    id: crypto.randomUUID(),
                    poolId: pool.id,
                    poolName: pool.name,
                    marketType: pool.type,
                    action: 'POOL_WITHDRAW',
                    date: now,
                    updatedAt: now,
                    amountUSD: amount,
                    note: `入金池「${pool.name}」→ 美元帳戶`,
                };
                return {
                    pools: state.pools.map((p) =>
                        p.id === poolId
                            ? { ...p, allocatedBudget: p.allocatedBudget - amount, currentCash: p.currentCash - amount, updatedAt: now }
                            : p
                    ),
                    poolLedger: [...(state.poolLedger ?? []), ledgerEntry],
                };
            }

            const ledgerEntry: PoolLedgerEntry = {
                id: crypto.randomUUID(),
                poolId: pool.id,
                poolName: pool.name,
                marketType: pool.type,
                action: 'POOL_WITHDRAW',
                date: now,
                updatedAt: now,
                amountTWD: amount,
                note: `入金池「${pool.name}」→ 主帳可分配資金`,
            };
            return {
                totalCapitalPool: state.totalCapitalPool + amount,
                pools: state.pools.map((p) =>
                    p.id === poolId
                        ? { ...p, allocatedBudget: p.allocatedBudget - amount, currentCash: p.currentCash - amount, updatedAt: now }
                        : p
                ),
                poolLedger: [...(state.poolLedger ?? []), ledgerEntry],
            };
        });
    },

    setExchangeRate: (rate: number) => {
        if (rate <= 0 || isNaN(rate)) return;
        set({ exchangeRateUSD: rate });
    },

    setUsStockFundPool: (amount: number) => {
        if (amount < 0 || isNaN(amount)) return;
        set({ usdAccountCash: amount, usStockFundPool: amount });
    },

    getUsStockAvailableCapital: () => {
        const state = get();
        const holdingsInUS = state.holdings.filter(h => !h.poolId && h.type === 'US_STOCK');
        const totalInvestedUSD = holdingsInUS.reduce((sum, h) => sum + (h.totalAmountUSD || 0), 0);
        const poolsUSD = state.pools.filter(p => p.type === 'US_STOCK').reduce((sum, p) => sum + p.allocatedBudget, 0);
        const usdBase = Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0);
        const available = usdBase - totalInvestedUSD - poolsUSD;
        return available > 0 ? available : 0;
    },
});
