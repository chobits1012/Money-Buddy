import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseSync } from '../hooks/useSupabaseSync';
import { usePortfolioStore } from '../store/portfolioStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export const BackupPage = () => {
    const navigate = useNavigate();
    const { user, logout, uploadData, downloadData, lastSyncTime } = useSupabaseSync();
    const { isConfigured, totalCapitalPool } = usePortfolioStore();

    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        action: () => void;
    } | null>(null);

    const [alertMessage, setAlertMessage] = useState<{
        title: string;
        message: string;
    } | null>(null);

    const handleUploadClick = () => {
        if (!isConfigured || totalCapitalPool === 0) {
            setConfirmAction({
                title: '警示：空數據上傳',
                message: '目前為空數據！確定要將空數據上傳並覆蓋雲端紀錄嗎？',
                action: async () => {
                    const result = await uploadData();
                    setAlertMessage({
                        title: result.success ? '備份成功' : '備份失敗',
                        message: result.message
                    });
                }
            });
        } else {
            setConfirmAction({
                title: '上傳備份',
                message: '確定要將目前資料備份到雲端嗎？',
                action: async () => {
                    const result = await uploadData();
                    setAlertMessage({
                        title: result.success ? '備份成功' : '備份失敗',
                        message: result.message
                    });
                }
            });
        }
    };

    const handleDownloadClick = () => {
        setConfirmAction({
            title: '下載覆蓋',
            message: '確定要從雲端下載並覆蓋目前的本機資料嗎？此操作無法復原。',
            action: async () => {
                const result = await downloadData();
                setAlertMessage({
                    title: result.success ? '還原成功' : '還原失敗',
                    message: result.message
                });
            }
        });
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
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
                        備份管理
                    </h1>
                </header>

                <Card className="flex flex-col gap-6">
                    <div className="flex flex-col items-center justify-center p-4 border-b border-stoneSoft/50 text-center">
                        <span className="material-symbols-outlined text-4xl mb-2 text-primary/80">account_circle</span>
                        <p className="text-sm text-textSecondary uppercase tracking-wider mb-1">目前登入帳號</p>
                        <p className="text-slate-800 font-medium">{user?.email || '未登入'}</p>
                        {lastSyncTime && (
                            <p className="text-xs text-clay mt-2">上次同步: {new Date(lastSyncTime).toLocaleString('zh-TW')}</p>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={handleUploadClick}
                            className="w-full flex justify-center items-center gap-2 !bg-clayDark hover:!bg-clayDark/90 hover:shadow-lg !text-white transition-all shadow-clayDark/20"
                            size="lg"
                        >
                            <span className="material-symbols-outlined text-lg">cloud_upload</span>
                            數據上傳
                        </Button>

                        <Button
                            onClick={handleDownloadClick}
                            variant="secondary"
                            className="w-full flex justify-center items-center gap-2"
                            size="lg"
                        >
                            <span className="material-symbols-outlined text-lg">cloud_download</span>
                            下載覆蓋
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
