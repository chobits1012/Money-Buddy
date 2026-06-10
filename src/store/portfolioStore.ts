import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
    CapitalActions,
    CustomCategoryActions,
    HoldingActions,
    PortfolioState,
    SyncActions,
} from '../types';
import { createCapitalSlice } from './slices/capitalSlice';
import { createHoldingSlice } from './slices/holdingSlice';
import { createSyncSlice } from './slices/syncSlice';
import { createCustomCategorySlice } from './slices/customCategorySlice';
import { encryptedLocalStorage } from '../utils/storageEncryption';
import { getPersistStorageKey } from '../utils/persistUserStorage';
import { migratePortfolioState, PORTFOLIO_PERSIST_VERSION } from './portfolioMigrations';

// Combined Store Interface
interface PortfolioStore extends PortfolioState, CapitalActions, HoldingActions, CustomCategoryActions, SyncActions {
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
            ...createCustomCategorySlice(set, get, api),
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
            version: PORTFOLIO_PERSIST_VERSION,
            skipHydration: true,
            storage: persistScopedStorage,
            migrate: migratePortfolioState,
        }
    )
);
