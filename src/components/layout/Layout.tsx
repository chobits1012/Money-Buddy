import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useSupabaseSync } from '../../hooks/useSupabaseSync';
import { ConfirmModal } from '../ui/ConfirmModal';
import { usePortfolioStore } from '../../store/portfolioStore';

export default function Layout() {
    const { user, loginWithGoogle } = useSupabaseSync();
    const navigate = useNavigate();
    const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null);
    const isConfigured = usePortfolioStore((state) => state.isConfigured);

    return (
        <div className="min-h-screen bg-background text-textPrimary flex flex-col items-center concrete-bg">
            {/* 寬度限制，確保在電腦或手機都有良好的視覺比例 */}
            <main className="w-full max-w-md flex-1 flex flex-col relative px-4 py-8 pb-24 sm:px-6">
                <header className="mb-8 flex justify-between items-center">
                    <h1 className="text-xl font-light tracking-widest uppercase text-clay">
                        資產控管中心
                    </h1>
                    {isConfigured && (user ? (
                        <button 
                            onClick={() => navigate('/backup')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-clayDark hover:bg-clayDark/90 transition-colors text-white text-xs font-medium cursor-pointer shadow-sm"
                        >
                            <span className="material-symbols-outlined text-sm">cloud_done</span>
                            備份管理
                        </button>
                    ) : (
                        <button 
                            onClick={async () => {
                                const res = await loginWithGoogle();
                                if (res && !res.success) {
                                    setAlertMessage({ title: '登入失敗', message: res.message });
                                }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-clayDark hover:bg-clayDark/90 transition-colors text-white text-xs font-medium cursor-pointer shadow-sm"
                        >
                            <span className="material-symbols-outlined text-sm">cloud_sync</span>
                            登入
                        </button>
                    ))}
                </header>

                {/* React Router 渲染區 */}
                <Outlet />
            </main>

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
}
