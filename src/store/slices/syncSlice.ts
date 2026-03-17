import type { StateCreator } from 'zustand';
import type { SyncState, PortfolioStore, PortfolioState } from '../../types';
import CryptoJS from 'crypto-js';

export interface SyncActions {
    overwriteState: (newState: PortfolioState) => void;
    restoreFromSnapshot: () => boolean;
}

export type SyncSlice = SyncState & SyncActions;

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
    removeItem: (name: string) => {
        localStorage.removeItem(name);
    },
};

export const createSyncSlice: StateCreator<
    PortfolioStore,
    [],
    [],
    SyncSlice
> = (set) => ({
    lastSyncedAt: undefined,

    overwriteState: (newState) => {
        set({ ...newState, isConfigured: true });
    },

    restoreFromSnapshot: () => {
        const snapshotJson = encryptedStorage.getItem('portfolio-tracker-snapshot');
        if (!snapshotJson) return false;

        try {
            const snapshot = JSON.parse(snapshotJson);
            const { snapshotTime, ...stateData } = snapshot;
            
            set({ 
                ...stateData, 
                lastSyncedAt: new Date().toISOString() 
            });
            
            encryptedStorage.removeItem('portfolio-tracker-snapshot');
            return true;
        } catch (e) {
            console.error('還原快照失敗', e);
            return false;
        }
    },
});
