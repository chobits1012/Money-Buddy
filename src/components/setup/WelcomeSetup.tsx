import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolioStore } from '../../store/portfolioStore';
import { useSupabaseSync } from '../../hooks/useSupabaseSync';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const WelcomeSetup = () => {
    const setCapitalPool = usePortfolioStore((state) => state.setCapitalPool);
    const [amountInput, setAmountInput] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user, loginWithGoogle } = useSupabaseSync();

    useEffect(() => {
        if (user) {
            navigate('/backup');
        }
    }, [user, navigate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 安全驗證 (Security: 防脫軌與 Edge Cases)
        const amount = Number(amountInput.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) {
            setError('請輸入有效的金額且需大於零');
            return;
        }

        if (amount > 10000000000) {
            setError('您輸入的金額超過系統最大承載');
            return;
        }

        setCapitalPool(amount);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // 允許輸入數字，去除逗號
        const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
        if (!val) {
            setAmountInput('');
            setError('');
            return;
        }
        // 加上千分位顯示提升閱讀體驗
        setAmountInput(Number(val).toLocaleString('en-US'));
        setError('');
    };

    return (
        <div className="flex-1 flex flex-col justify-center items-center px-4 -mt-16 sm:mt-0 animate-in fade-in duration-700">
            <div className="mb-10 text-center">
                <div className="flex justify-center mb-4">
                    <img 
                        src="/pwa-192x192.png" 
                        alt="財柴" 
                        className="w-24 h-24 object-contain drop-shadow-md pb-2" 
                    />
                </div>
                <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-textPrimary mb-4 leading-snug">
                    歡迎使用money buddy<br />
                    我是你的錢錢好夥伴-財柴
                </h1>
                <p className="text-textSecondary text-sm max-w-sm mx-auto leading-relaxed">
                    為了讓我追蹤您的財務分配，<br />
                    請先設定您的
                    <strong className="text-textPrimary font-medium ml-1">初始總資金 (TWD)</strong>
                </p>
            </div>

            <Card className="w-full max-w-sm">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <Input
                        label="總資金池金額"
                        placeholder="例如: 1,000,000"
                        value={amountInput}
                        onChange={handleAmountChange}
                        error={error}
                        icon={<span className="font-semibold px-2 text-clay">NT$</span>}
                        autoFocus
                    />
                    <Button type="submit" size="lg" className="w-full group !bg-moss hover:!bg-moss/90 !shadow-moss/20">
                        開始追蹤
                        <span className="material-symbols-outlined text-base ml-2 transition-transform group-hover:translate-x-1">arrow_forward</span>
                    </Button>
                </form>
            </Card>

            {/* 新增登入提示與卡片 */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-2 text-sm text-textSecondary px-4 text-center">
                或者
                <button
                    onClick={async () => {
                        const res = await loginWithGoogle();
                        if (res && !res.success) {
                            setError(res.message);
                        }
                    }}
                    type="button"
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-clayDark hover:bg-clayDark/90 transition-colors text-white text-xs font-medium shadow-sm hover:shadow-md cursor-pointer whitespace-nowrap"
                >
                    <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
                    登入
                </button>
                取回你的雲端數據
            </div>

            <p className="mt-8 text-xs text-clay/60 text-center">
                * 資料由您的瀏覽器進行本地加密儲存，絕對保障個人隱私
            </p>
        </div>
    );
};
