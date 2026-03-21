import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseSync } from '../contexts/SyncContext';
import { usePortfolioStore } from '../store/portfolioStore';
import { SyncIndicator } from '../components/sync/SyncIndicator';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export const BackupPage = () => {
    const navigate = useNavigate();
    const { user, logout, manualSync, syncStatus, lastSyncTime, isSyncing } = useSupabaseSync();

    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        action: () => void;
    } | null>(null);

    const [alertMessage, setAlertMessage] = useState<{
        title: string;
        message: string;
    } | null>(null);

    const handleManualSync = () => {
        setConfirmAction({
            title: '立即同步',
            message: '將從雲端拉取最新資料合併後，再上傳至雲端。確定要立即同步嗎？',
            action: async () => {
                const result = await manualSync();
                setAlertMessage({
                    title: result.success ? '同步成功' : '同步失敗',
                    message: result.message,
                });
            },
        });
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const exportLocalSnapshotJson = () => {
        const state = usePortfolioStore.getState();
        const serializable = Object.fromEntries(
            Object.entries(state).filter(([, v]) => typeof v !== 'function'),
        );
        const data = JSON.stringify(serializable, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-local-${new Date().toISOString().slice(0, 19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-background text-textPrimary flex flex-col items-center concrete-bg">
            <main className="w-full max-w-md flex-1 flex flex-col relative px-4 py-8 pb-24 sm:px-6 animate-in fade-in duration-500">
                <header className="mb-8 flex justify-between items-center bg-transparent">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-1 text-clay hover:text-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">arrow_back</span>
                        返回
                    </button>
                    <h1 className="text-xl font-light tracking-widest uppercase text-clay">
                        同步設定
                    </h1>
                </header>

                <Card className="flex flex-col gap-6">
                    {/* 帳號資訊 */}
                    <div className="flex flex-col items-center justify-center p-4 border-b border-stoneSoft/50 text-center">
                        <span className="material-symbols-outlined text-4xl mb-2 text-primary/80">account_circle</span>
                        <p className="text-sm text-textSecondary uppercase tracking-wider mb-1">目前登入帳號</p>
                        <p className="text-slate-800 font-medium">{user?.email || '未登入'}</p>
                    </div>

                    {/* 同步狀態 (大版) */}
                    <div className="px-2">
                        <SyncIndicator status={syncStatus} variant="full" />
                        {lastSyncTime && (
                            <p className="text-xs text-clay mt-2 text-center">
                                上次同步：{new Date(lastSyncTime).toLocaleString('zh-TW')}
                            </p>
                        )}
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={exportLocalSnapshotJson}
                            variant="ghost"
                            className="w-full flex justify-center items-center gap-2 border border-stoneSoft text-clayDark"
                            size="md"
                        >
                            <span className="material-symbols-outlined text-lg">download</span>
                            匯出本地快照 (JSON)
                        </Button>

                        <Button
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className="w-full flex justify-center items-center gap-2 !bg-clayDark hover:!bg-clayDark/90 hover:shadow-lg !text-white transition-all shadow-clayDark/20"
                            size="lg"
                        >
                            <span className={`material-symbols-outlined text-lg${isSyncing ? ' sync-spin' : ''}`}>sync</span>
                            {isSyncing ? '同步中…' : '立即同步'}
                        </Button>

                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            className="w-full flex justify-center items-center gap-2 mt-4 text-rust hover:text-rust hover:bg-rust/10"
                            size="md"
                        >
                            <span className="material-symbols-outlined text-lg">logout</span>
                            登出帳號
                        </Button>
                    </div>
                </Card>
            </main>

            <ConfirmModal
                isOpen={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                confirmText="確定"
                cancelText="取消"
                onConfirm={() => {
                    if (confirmAction) confirmAction.action();
                    setConfirmAction(null);
                }}
                onCancel={() => setConfirmAction(null)}
            />

            <ConfirmModal
                isOpen={!!alertMessage}
                title={alertMessage?.title || ''}
                message={alertMessage?.message || ''}
                confirmText="確定"
                onConfirm={() => setAlertMessage(null)}
                isAlert
            />
        </div>
    );
};
