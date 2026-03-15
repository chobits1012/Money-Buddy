import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { usePortfolioStore } from '../store/portfolioStore';
import type { User } from '@supabase/supabase-js';

export function useSupabaseSync() {
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const overwriteState = usePortfolioStore((state) => state.overwriteState);

  // 1. 初始化與監聽登入狀態
  useEffect(() => {
    // 取得目前登入的使用者
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 監聽登入狀態改變 (登入、登出)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 2. Google 登入
  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        // 可以設定登入後導向回目前網頁
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

  // 3. 登出
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setLastSyncTime(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 4. 上傳資料 (Backup)
  const uploadData = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: '請先登入才能備份資料' };
    }

    setIsSyncing(true);
    try {
      // 取得目前最新的 Zustand 狀態
      const currentState = usePortfolioStore.getState();
      
      // 為了避免把不要的狀態也存上去（例如 isLoadingQuotes），我們可以選擇性挑出要存的資料
      // 但為了簡單與完整重建，我們直接把整個 store 備份，但在 overwrite 時要注意重設 UI 狀態
      
      const { error } = await supabase
        .from('user_backup')
        .upsert({ 
          id: user.id, // 因為 RLS 需要比對這個 ID
          portfolio_data: currentState,
          updated_at: new Date().toISOString()
        }, {
            onConflict: 'id' // 如果已經有資料就覆蓋
        });

      if (error) throw error;

      setLastSyncTime(new Date().toISOString());
      return { success: true, message: '資料備份成功！' };
    } catch (error) {
      console.error('Upload Error:', error);
      return { success: false, message: '備份失敗，請檢查網路連線。' };
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  // 5. 下載資料 (Restore)
  const downloadData = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: '請先登入才能下載資料' };
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('user_backup')
        .select('portfolio_data, updated_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data && data.portfolio_data) {
        // 使用剛才加在 store 裡的方法覆蓋本地狀態
        overwriteState(data.portfolio_data);
        setLastSyncTime(data.updated_at);
        return { success: true, message: '雲端資料已成功還原至本機！' };
      } else {
        return { success: false, message: '雲端目前沒有您的備份資料。' };
      }
    } catch (error: any) {
      console.error('Download Error:', error);
      if (error.code === 'PGRST116') {
          // Supabase 找不到資料時會回傳這個錯誤碼
          return { success: false, message: '雲端目前沒有您的備份資料。' };
      } else {
          return { success: false, message: '下載備份失敗，請稍後再試。' };
      }
    } finally {
      setIsSyncing(false);
    }
  }, [user, overwriteState]);

  return {
    user,
    isSyncing,
    lastSyncTime,
    loginWithGoogle,
    logout,
    uploadData,
    downloadData
  };
}
