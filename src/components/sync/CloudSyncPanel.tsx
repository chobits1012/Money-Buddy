import { useSupabaseSync } from '../../hooks/useSupabaseSync';
import { LogIn, LogOut, UploadCloud, DownloadCloud, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';

export function CloudSyncPanel() {
  const {
    user,
    isSyncing,
    lastSyncTime,
    loginWithGoogle,
    logout,
    uploadData,
    downloadData
  } = useSupabaseSync();

  // 若未登入
  if (!user) {
    return (
      <div className="bg-surface p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border border-border">
        <div className="text-center">
          <h3 className="text-lg font-medium text-text-primary mb-2">雲端備份同步</h3>
          <p className="text-sm text-text-secondary max-w-sm">
            登入以啟用手動雲端備份。您的理財資料將會安全地綁定在您的帳號下，方便跨裝置同步與還原。
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={loginWithGoogle}
          disabled={isSyncing}
          className="w-full sm:w-auto mt-2"
        >
          <LogIn className="w-4 h-4 mr-2" />
          使用 Google 帳號登入
        </Button>
      </div>
    );
  }

  // 若已登入
  return (
    <div className="bg-surface p-6 rounded-2xl border border-border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-medium text-text-primary">雲端備份同步</h3>
          <p className="text-sm text-text-secondary">
            目前登入：{user.email}
          </p>
          {lastSyncTime && (
            <p className="text-xs text-text-tertiary mt-1">
              上次同步時間：{new Date(lastSyncTime).toLocaleString('zh-TW')}
            </p>
          )}
        </div>
        <Button 
          variant="ghost" 
          onClick={logout}
          disabled={isSyncing}
          className="text-text-secondary hover:text-status-danger hover:bg-status-danger/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          登出
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 上傳區塊 */}
        <div className="p-4 rounded-xl bg-bg-secondary flex flex-col gap-3">
          <div className="flex items-start justify-between">
             <div>
                <h4 className="font-medium text-text-primary">上傳資料至雲端</h4>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                  將目前裝置上的所有紀錄備份到雲端，這將會覆蓋雲端上的舊資料。
                </p>
             </div>
          </div>
          <Button 
            variant="primary" 
            onClick={uploadData}
            disabled={isSyncing}
            className="w-full mt-auto"
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            {isSyncing ? '處理中...' : '開始上傳'}
          </Button>
        </div>

        {/* 下載區塊 */}
        <div className="p-4 rounded-xl bg-status-danger/5 border border-status-danger/20 flex flex-col gap-3">
          <div className="flex items-start justify-between">
             <div>
                <h4 className="font-medium text-status-danger flex items-center gap-1.5">
                   <AlertTriangle className="w-4 h-4" />
                   從雲端下載資料
                </h4>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                  從雲端下載最新的備份。注意：目前裝置上的資料將會被完全覆蓋！
                </p>
             </div>
          </div>
          <Button 
            variant="danger" 
            onClick={downloadData}
            disabled={isSyncing}
            className="w-full mt-auto"
          >
            <DownloadCloud className="w-4 h-4 mr-2" />
            {isSyncing ? '處理中...' : '強制下載覆蓋'}
          </Button>
        </div>
      </div>
    </div>
  );
}
