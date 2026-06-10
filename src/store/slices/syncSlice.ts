import type { StateCreator } from 'zustand';
import type { PortfolioStore, SyncSlice } from '../../types';
import { encryptedLocalStorage } from '../../utils/storageEncryption';

export const createSyncSlice: StateCreator<
    PortfolioStore,
    [],
    [],
    SyncSlice
> = (set) => ({
    lastSyncedAt: undefined,
    localDataOwnerId: null,
    pendingUpload: false,

    overwriteState: (newState) => {
        set((state) => ({
            ...newState,
            isConfigured: true,
            localDataOwnerId:
                newState.localDataOwnerId !== undefined
                    ? newState.localDataOwnerId
                    : state.localDataOwnerId,
        }));
    },

    setLocalDataOwnerId: (id) => set({ localDataOwnerId: id }),

    setPendingUpload: (pending) => set({ pendingUpload: pending }),

    restoreFromSnapshot: () => {
        const snapshotJson = encryptedLocalStorage.getItem('portfolio-tracker-snapshot');
        if (!snapshotJson) return false;

        try {
            const snapshot = JSON.parse(snapshotJson);
            const { snapshotTime: _t, ...stateData } = snapshot;
            
            set({ 
                ...stateData, 
                lastSyncedAt: new Date().toISOString() 
            });
            
            encryptedLocalStorage.removeItem('portfolio-tracker-snapshot');
            return true;
        } catch (e) {
            console.error('還原快照失敗', e);
            return false;
        }
    },
});
