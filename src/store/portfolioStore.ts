import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import CryptoJS from 'crypto-js';
import type { PortfolioState } from '../types';
import { createCapitalSlice } from './slices/capitalSlice';
import type { CapitalActions } from './slices/capitalSlice';
import { createHoldingSlice } from './slices/holdingSlice';
import type { HoldingActions } from './slices/holdingSlice';
import { createSyncSlice } from './slices/syncSlice';
import type { SyncActions } from './slices/syncSlice';

// Combined Store Interface
interface PortfolioStore extends PortfolioState, CapitalActions, HoldingActions, SyncActions {
    isLoadingQuotes: boolean;
    resetAll: () => void;
}

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

                encryptedStorage.setItem('portfolio-tracker-snapshot', JSON.stringify({
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
                    usdAccountCash: 0,
                    usStockFundPool: 0,
                    transactions: [],
                    holdings: [],
                    customCategories: [],
                    isConfigured: true,
                    lastSyncedAt: now,
                    isLoadingQuotes: false
                });
            },
        }),
        {
            name: 'portfolio-tracker-storage',
            version: 1,
            storage: createJSONStorage(() => encryptedStorage),
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

                return state as any;
            },
        }
    )
);
