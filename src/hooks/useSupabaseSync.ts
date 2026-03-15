import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { usePortfolioStore } from '../store/portfolioStore';
import { syncMerge } from '../utils/syncMerge';
import type { PortfolioState } from '../types';
import type { User } from '@supabase/supabase-js';

// Debounce 延遲（毫秒）
const DEBOUNCE_DELAY = 2000;

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export function useSupabaseSync() {
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const overwriteState = usePortfolioStore((state) => state.overwriteState);

  // 用 ref 追蹤 debounce timer 與是否正在初始拉取
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPullingRef = useRef(false);
  const userRef = useRef<User | null>(null);
  const syncStatusRef = useRef<SyncStatus>('offline');

  // 保持 refs 同步
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    syncStatusRef.current = syncStatus;
  }, [syncStatus]);

  // ═══ 0. 離線 / 上線偵測 (步驟 4.5) ═══
  useEffect(() => {
    const handleOnline = () => {
      // 恢復連線後，若有登入，自動觸發一次同步
      if (userRef.current) {
        setSyncStatus('syncing');
        autoUpload().then(() => {
          setSyncStatus('synced');
        }).catch(() => {
          setSyncStatus('error');
        });
      }
    };

    const handleOffline = () => {
      if (userRef.current) {
        setSyncStatus('offline');
      }
    };

    // 初始化時檢查網路狀態
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

  // ═══ 1. 初始化與監聽登入狀態 ═══
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ═══ 2. Pull-First 邏輯：偵測到登入後自動拉取合併 ═══
  useEffect(() => {
    if (!user) {
      setSyncStatus('offline');
      return;
    }

    const pullAndMerge = async () => {
      if (isPullingRef.current) return;
      isPullingRef.current = true;
      setIsSyncing(true);
      setSyncStatus('syncing');
      setSyncError(null);

      try {
        // 離線時跳過
        if (!navigator.onLine) {
          setSyncStatus('offline');
          return;
        }

        const { data, error } = await supabase
          .from('user_backup')
          .select('portfolio_data, updated_at')
          .eq('id', user.id)
          .single();

        if (error) {
          // PGRST116 = 找不到資料，代表雲端沒有備份，這不算錯誤
          if (error.code === 'PGRST116') {
            console.log('[Auto-Sync] 雲端無備份，跳過合併');
          } else {
            throw error;
          }
        } else if (data?.portfolio_data) {
          // 取得本地目前狀態
          const localState = usePortfolioStore.getState() as PortfolioState;
          const cloudState = data.portfolio_data as PortfolioState;

          // 使用 syncMerge 合併
          const merged = syncMerge(localState, cloudState);

          // 寫回 Store
          overwriteState(merged);
          setLastSyncTime(merged.lastSyncedAt || new Date().toISOString());
          console.log('[Auto-Sync] Pull-First 合併完成');
        }

        setSyncStatus('synced');
      } catch (error) {
        console.error('[Auto-Sync] Pull-First 失敗:', error);
        setSyncError('同步拉取失敗，請檢查網路');
        setSyncStatus('error');
      } finally {
        setIsSyncing(false);
        isPullingRef.current = false;
      }
    };

    pullAndMerge();
  }, [user, overwriteState]);

  // ═══ 3. 背景 Debounce 上傳：訂閱 Store 變化 ═══
  useEffect(() => {
    // 訂閱 Zustand store 的變化
    const unsubscribe = usePortfolioStore.subscribe((_state, _prevState) => {
      // 如果正在初始拉取中，不觸發上傳（避免拉下來的資料又立刻傳上去）
      if (isPullingRef.current) return;
      // 如果沒登入，不自動上傳
      if (!userRef.current) return;
      // 如果離線，不嘗試上傳
      if (!navigator.onLine) {
        setSyncStatus('offline');
        return;
      }

      // 清除前一個 timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // 設定新的 debounce timer
      debounceTimerRef.current = setTimeout(() => {
        setSyncStatus('syncing');
        autoUpload().then(() => {
          setSyncStatus('synced');
        }).catch(() => {
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
  }, []); // 只在掛載時訂閱一次

  // 自動上傳函式（背景靜默執行）
  const autoUpload = async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    // 離線時不嘗試上傳
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    try {
      const currentState = usePortfolioStore.getState();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('user_backup')
        .upsert({
          id: currentUser.id,
          portfolio_data: currentState,
          updated_at: now,
          last_synced_at: now,
        }, {
          onConflict: 'id',
        });

      if (error) throw error;
      setLastSyncTime(now);
      console.log('[Auto-Sync] 背景上傳完成', new Date().toLocaleTimeString('zh-TW'));
    } catch (error) {
      console.error('[Auto-Sync] 背景上傳失敗:', error);
      throw error; // 讓呼叫端處理狀態切換
    }
  };

  // ═══ 4. Google 登入 ═══
  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: '登入失敗，請稍後再試。' };
    }
  };

  // ═══ 5. 登出 ═══
  const logout = async () => {
    try {
      // 登出前做最後一次上傳
      if (userRef.current && navigator.onLine) {
        try {
          await autoUpload();
        } catch {
          // 忽略上傳失敗，繼續登出
        }
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setLastSyncTime(null);
      setSyncError(null);
      setSyncStatus('offline');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // ═══ 6. 手動同步（Pull + Push，供「立即同步」按鈕使用） ═══
  const manualSync = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: '請先登入才能同步' };
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return { success: false, message: '目前離線，請檢查網路連線' };
    }

    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // Step 1: Pull — 從雲端拉取並合併
      const { data, error: pullError } = await supabase
        .from('user_backup')
        .select('portfolio_data, updated_at')
        .eq('id', user.id)
        .single();

      if (pullError && pullError.code !== 'PGRST116') {
        throw pullError;
      }

      if (data?.portfolio_data) {
        const localState = usePortfolioStore.getState() as PortfolioState;
        const cloudState = data.portfolio_data as PortfolioState;
        const merged = syncMerge(localState, cloudState);
        overwriteState(merged);
      }

      // Step 2: Push — 上傳合併後的資料
      const currentState = usePortfolioStore.getState();
      const now = new Date().toISOString();

      const { error: pushError } = await supabase
        .from('user_backup')
        .upsert({
          id: user.id,
          portfolio_data: currentState,
          updated_at: now,
          last_synced_at: now,
        }, {
          onConflict: 'id',
        });

      if (pushError) throw pushError;

      setLastSyncTime(now);
      setSyncStatus('synced');
      return { success: true, message: '同步完成！' };
    } catch (error) {
      console.error('[Manual-Sync] 同步失敗:', error);
      setSyncError('同步失敗，請稍後再試');
      setSyncStatus('error');
      return { success: false, message: '同步失敗，請檢查網路連線。' };
    } finally {
      setIsSyncing(false);
    }
  }, [user, overwriteState]);

  return {
    user,
    isSyncing,
    syncStatus,
    lastSyncTime,
    syncError,
    loginWithGoogle,
    logout,
    manualSync,
    uploadData: manualSync, // 保留向後相容
    downloadData: manualSync, // 保留向後相容
  };
}
