import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PortfolioState } from '../types';
import { createCapitalSlice } from './slices/capitalSlice';
import type { CapitalActions } from './slices/capitalSlice';
import { createHoldingSlice } from './slices/holdingSlice';
import type { HoldingActions } from './slices/holdingSlice';
import { createSyncSlice } from './slices/syncSlice';
import type { SyncActions } from './slices/syncSlice';
import { encryptedLocalStorage } from '../utils/storageEncryption';
import { getPersistStorageKey } from '../utils/persistUserStorage';
import { reconcilePortfolioState } from '../utils/reconcilePortfolioState';

// Combined Store Interface
interface PortfolioStore extends PortfolioState, CapitalActions, HoldingActions, SyncActions {
    isLoadingQuotes: boolean;
    resetAll: () => void;
}

const persistScopedStorage = createJSONStorage(() => ({
    getItem: (_name: string) => encryptedLocalStorage.getItem(getPersistStorageKey()),
    setItem: (_name: string, value: string) =>
        encryptedLocalStorage.setItem(getPersistStorageKey(), value),
    removeItem: (_name: string) => encryptedLocalStorage.removeItem(getPersistStorageKey()),
}));

export const usePortfolioStore = create<PortfolioStore>()(
    persist(
        (set, get, api) => ({
            ...createCapitalSlice(set, get, api),
            ...createHoldingSlice(set, get, api),
            ...createSyncSlice(set, get, api),
            
            isLoadingQuotes: false,

            resetAll: () => {
                const currentState = get();
                const now = new Date().toISOString();
                
                // 1. Save emergency snapshot
                // We pick only state data, excluding functions
                const stateData = Object.fromEntries(
                    Object.entries(currentState).filter(([_, v]) => typeof v !== 'function')
                );

                encryptedLocalStorage.setItem('portfolio-tracker-snapshot', JSON.stringify({
                    ...stateData,
                    snapshotTime: now
                }));

                // 2. Clear data (reset manually to defaults)
                set({ 
                    masterTwdTotal: 0,
                    totalCapitalPool: 0,
                    capitalDeposits: [],
                    capitalWithdrawals: [],
                    pools: [],
                    poolLedger: [],
                    usdAccountCash: 0,
                    usStockFundPool: 0,
                    transactions: [],
                    holdings: [],
                    customCategories: [],
                    isConfigured: true,
                    lastSyncedAt: now,
                    isLoadingQuotes: false,
                    localDataOwnerId: null,
                    pendingUpload: false,
                });
            },
        }),
        {
            name: 'portfolio-tracker-storage',
            version: 4,
            skipHydration: true,
            storage: persistScopedStorage,
            migrate: (persistedState: unknown, version: number) => {
                const state = persistedState as Record<string, any>;

                if (version < 1) {
                    const now = new Date().toISOString();
                    if (Array.isArray(state.capitalDeposits)) {
                        state.capitalDeposits = state.capitalDeposits.map((d: any) => ({
                            ...d, updatedAt: d.updatedAt || d.date || now
                        }));
                    }
                    if (Array.isArray(state.transactions)) {
                        state.transactions = state.transactions.map((t: any) => ({
                            ...t, updatedAt: t.updatedAt || t.date || now
                        }));
                    }
                    if (Array.isArray(state.holdings)) {
                        state.holdings = state.holdings.map((h: any) => {
                            const purchases = Array.isArray(h.purchases)
                                ? h.purchases.map((p: any) => ({ ...p, updatedAt: p.updatedAt || p.date || now }))
                                : h.purchases;
                            return {
                                ...h,
                                purchases,
                                updatedAt: h.updatedAt || h.createdAt || now,
                            };
                        });
                    }
                    if (Array.isArray(state.customCategories)) {
                        state.customCategories = state.customCategories.map((c: any) => ({
                            ...c, updatedAt: c.updatedAt || c.createdAt || now
                        }));
                    }
                }

                if (typeof state.masterTwdTotal !== 'number') {
                    const deposits = Array.isArray(state.capitalDeposits) ? state.capitalDeposits : [];
                    const withdrawals = Array.isArray(state.capitalWithdrawals) ? state.capitalWithdrawals : [];
                    const deposited = deposits.reduce((sum: number, d: any) => sum + (Number(d?.amount) || 0), 0);
                    const withdrawn = withdrawals.reduce((sum: number, w: any) => sum + (Number(w?.amount) || 0), 0);
                    state.masterTwdTotal = Math.max(0, deposited - withdrawn);
                }

                if (!Array.isArray(state.capitalWithdrawals)) {
                    state.capitalWithdrawals = [];
                }
                if (!Array.isArray(state.pools)) {
                    state.pools = [];
                }

                if (typeof state.usdAccountCash !== 'number') {
                    state.usdAccountCash = Number(state.usStockFundPool) || 0;
                }

                const totalCapitalPool = Number(state.totalCapitalPool);
                if (!Number.isFinite(totalCapitalPool)) {
                    state.totalCapitalPool = state.masterTwdTotal;
                } else {
                    state.totalCapitalPool = Math.max(0, Math.min(totalCapitalPool, state.masterTwdTotal));
                }

                // 舊欄位維持同步，避免既有畫面與流程異常
                state.usStockFundPool = state.usdAccountCash;

                if (version < 2) {
                    if (!('localDataOwnerId' in state)) {
                        state.localDataOwnerId = undefined;
                    }
                    if (!('pendingUpload' in state)) {
                        state.pendingUpload = false;
                    }
                }

                if (version < 3) {
                    Object.assign(state, reconcilePortfolioState(state as PortfolioState));
                }

                if (version < 4) {
                    if (!Array.isArray(state.poolLedger)) {
                        state.poolLedger = [];
                    }
                }

                return state as any;
            },
        }
    )
);
