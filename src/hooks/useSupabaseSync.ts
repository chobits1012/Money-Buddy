import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchCloudBackup } from '../lib/supabaseBackup';
import { usePortfolioStore } from '../store/portfolioStore';
import { syncMerge } from '../utils/syncMerge';
import { shouldBlockAccountSwitch } from '../utils/accountSyncGate';
import { createEmptyPortfolioStateForUser } from '../utils/emptyPortfolioState';
import { setPersistSuffix } from '../utils/persistUserStorage';
import type { PortfolioState } from '../types';
import type { User } from '@supabase/supabase-js';

const DEBOUNCE_DELAY = 2000;

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export type SyncGateState = 'idle' | 'blocked_account_mismatch' | 'resolving';

export function useSupabaseSyncInternal() {
    const [user, setUser] = useState<User | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [syncGate, setSyncGate] = useState<SyncGateState>('idle');

    const overwriteState = usePortfolioStore((state) => state.overwriteState);
    const setLocalDataOwnerId = usePortfolioStore((state) => state.setLocalDataOwnerId);
    const setPendingUpload = usePortfolioStore((state) => state.setPendingUpload);

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isPullingRef = useRef(false);
    const userRef = useRef<User | null>(null);
    const syncStatusRef = useRef<SyncStatus>('offline');
    const syncGateRef = useRef<SyncGateState>('idle');

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        syncStatusRef.current = syncStatus;
    }, [syncStatus]);

    useEffect(() => {
        syncGateRef.current = syncGate;
    }, [syncGate]);

    const syncWithServer = useCallback(async (options?: { bypassGate?: boolean }) => {
        const currentUser = userRef.current;
        if (!currentUser) return;
        if (!options?.bypassGate && syncGateRef.current !== 'idle') return;
        if (isPullingRef.current) return;

        if (!navigator.onLine) {
            setPendingUpload(true);
            setSyncStatus('offline');
            return;
        }

        isPullingRef.current = true;
        setPendingUpload(false);

        try {
            const localState = usePortfolioStore.getState() as PortfolioState;
            const cloudRow = await fetchCloudBackup(currentUser.id);

            let merged: PortfolioState = localState;
            if (cloudRow?.portfolio_data) {
                merged = syncMerge(localState, cloudRow.portfolio_data);
            }

            overwriteState({
                ...merged,
                localDataOwnerId: currentUser.id,
            });

            const now = new Date().toISOString();
            const finalState = usePortfolioStore.getState() as PortfolioState;

            const { error } = await supabase.from('user_backup').upsert(
                {
                    id: currentUser.id,
                    portfolio_data: finalState,
                    updated_at: now,
                    last_synced_at: now,
                },
                { onConflict: 'id' },
            );

            if (error) throw error;

            usePortfolioStore.setState({ lastSyncedAt: now, pendingUpload: false });
            setLastSyncTime(now);
            setSyncError(null);
        } catch (error) {
            console.error('[syncWithServer] 失敗:', error);
            setSyncError('同步失敗，請稍後再試');
            throw error;
        } finally {
            isPullingRef.current = false;
        }
    }, [overwriteState, setPendingUpload]);

    const syncWithServerRef = useRef(syncWithServer);
    syncWithServerRef.current = syncWithServer;

    useEffect(() => {
        const handleOnline = () => {
            if (userRef.current && syncGateRef.current === 'idle') {
                setSyncStatus('syncing');
                void syncWithServerRef.current()
                    .then(() => {
                        setSyncStatus('synced');
                    })
                    .catch(() => {
                        setSyncStatus('error');
                    });
            }
        };

        const handleOffline = () => {
            if (userRef.current) {
                setSyncStatus('offline');
            }
        };

        if (!navigator.onLine && userRef.current) {
            setSyncStatus('offline');
        }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const userId = user?.id;

    useEffect(() => {
        if (!userId) {
            setSyncGate('idle');
            return;
        }

        const st = usePortfolioStore.getState() as PortfolioState;
        if (shouldBlockAccountSwitch(userId, st)) {
            setSyncGate('blocked_account_mismatch');
            return;
        }

        setSyncGate('idle');
        setPersistSuffix(userId);
        setLocalDataOwnerId(userId);

        const run = async () => {
            if (isPullingRef.current) return;
            setIsSyncing(true);
            setSyncStatus('syncing');
            setSyncError(null);
            try {
                if (!navigator.onLine) {
                    setSyncStatus('offline');
                    setPendingUpload(true);
                    return;
                }
                await syncWithServerRef.current();
                setSyncStatus('synced');
            } catch {
                setSyncStatus('error');
            } finally {
                setIsSyncing(false);
            }
        };

        void run();
    }, [userId, setLocalDataOwnerId, setPendingUpload]);

    useEffect(() => {
        const unsubscribe = usePortfolioStore.subscribe(() => {
            if (isPullingRef.current) return;
            if (syncGateRef.current !== 'idle') return;
            if (!userRef.current) return;
            if (!navigator.onLine) {
                setSyncStatus('offline');
                setPendingUpload(true);
                return;
            }

            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
                setSyncStatus('syncing');
                void syncWithServerRef.current()
                    .then(() => {
                        setSyncStatus('synced');
                    })
                    .catch(() => {
                        setSyncStatus('error');
                    });
            }, DEBOUNCE_DELAY);
        });

        return () => {
            unsubscribe();
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [setPendingUpload]);

    const loginWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: '登入失敗，請稍後再試。' };
        }
    };

    const logout = async () => {
        try {
            const ownerId = usePortfolioStore.getState().localDataOwnerId;
            if (userRef.current && navigator.onLine && syncGateRef.current === 'idle') {
                try {
                    await syncWithServer();
                } catch {
                    /* 忽略 */
                }
            }
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            if (typeof ownerId === 'string' && ownerId.length > 0) {
                setPersistSuffix(ownerId);
            }
            setLastSyncTime(null);
            setSyncError(null);
            setSyncStatus('offline');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const resolveAccountSwitchUseCloud = useCallback(async () => {
        const u = userRef.current;
        if (!u) return;
        setSyncGate('resolving');
        setIsSyncing(true);
        setSyncError(null);
        try {
            if (!navigator.onLine) {
                setSyncError('需要網路才能載入雲端資料');
                setSyncGate('blocked_account_mismatch');
                return;
            }
            const row = await fetchCloudBackup(u.id);
            if (row?.portfolio_data) {
                overwriteState({
                    ...(row.portfolio_data as PortfolioState),
                    localDataOwnerId: u.id,
                });
            } else {
                overwriteState(createEmptyPortfolioStateForUser(u.id));
            }
            setPersistSuffix(u.id);
            setLocalDataOwnerId(u.id);
            setSyncGate('idle');
            await syncWithServer({ bypassGate: true });
            setSyncStatus('synced');
        } catch (e) {
            console.error('[AccountSwitch] use cloud failed', e);
            setSyncError('載入雲端失敗');
            setSyncGate('blocked_account_mismatch');
        } finally {
            setIsSyncing(false);
        }
    }, [overwriteState, setLocalDataOwnerId, syncWithServer]);

    const resolveAccountSwitchMerge = useCallback(async () => {
        const u = userRef.current;
        if (!u) return;
        setSyncGate('resolving');
        setIsSyncing(true);
        setSyncError(null);
        try {
            if (!navigator.onLine) {
                setSyncError('需要網路才能合併並上傳');
                setSyncGate('blocked_account_mismatch');
                return;
            }
            const localState = usePortfolioStore.getState() as PortfolioState;
            const row = await fetchCloudBackup(u.id);
            const cloud = row?.portfolio_data
                ? (row.portfolio_data as PortfolioState)
                : createEmptyPortfolioStateForUser(u.id);
            const merged = syncMerge(localState, cloud);
            overwriteState({ ...merged, localDataOwnerId: u.id });
            setPersistSuffix(u.id);
            setLocalDataOwnerId(u.id);
            setSyncGate('idle');
            await syncWithServer({ bypassGate: true });
            setSyncStatus('synced');
        } catch (e) {
            console.error('[AccountSwitch] merge failed', e);
            setSyncError('合併失敗');
            setSyncGate('blocked_account_mismatch');
        } finally {
            setIsSyncing(false);
        }
    }, [overwriteState, setLocalDataOwnerId, syncWithServer]);

    const resolveAccountSwitchCancel = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            setSyncGate('idle');
        } catch (e) {
            console.error('[AccountSwitch] cancel signOut failed', e);
        }
    }, []);

    const manualSync = useCallback(async (): Promise<{ success: boolean; message: string }> => {
        if (!user) {
            return { success: false, message: '請先登入才能同步' };
        }

        if (syncGate !== 'idle') {
            return { success: false, message: '請先處理帳號切換選項' };
        }

        if (!navigator.onLine) {
            setSyncStatus('offline');
            setPendingUpload(true);
            return { success: false, message: '目前離線，請檢查網路連線' };
        }

        setIsSyncing(true);
        setSyncStatus('syncing');
        setSyncError(null);

        try {
            await syncWithServer();
            setSyncStatus('synced');
            return { success: true, message: '同步完成！' };
        } catch {
            setSyncError('同步失敗，請稍後再試');
            setSyncStatus('error');
            return { success: false, message: '同步失敗，請檢查網路連線。' };
        } finally {
            setIsSyncing(false);
        }
    }, [user, syncGate, syncWithServer, setPendingUpload]);

    return {
        user,
        isSyncing,
        syncStatus,
        lastSyncTime,
        syncError,
        syncGate,
        loginWithGoogle,
        logout,
        manualSync,
        uploadData: manualSync,
        downloadData: manualSync,
        resolveAccountSwitchUseCloud,
        resolveAccountSwitchMerge,
        resolveAccountSwitchCancel,
    };
}
