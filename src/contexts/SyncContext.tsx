import { createContext, useContext, type ReactNode } from 'react';
import { useSupabaseSyncInternal } from '../hooks/useSupabaseSync';

export type { SyncStatus, SyncGateState } from '../hooks/useSupabaseSync';

const SyncContext = createContext<ReturnType<typeof useSupabaseSyncInternal> | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
    const value = useSupabaseSyncInternal();
    return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSupabaseSync() {
    const ctx = useContext(SyncContext);
    if (!ctx) {
        throw new Error('useSupabaseSync must be used within SyncProvider');
    }
    return ctx;
}
