import React, { useState } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { WalletIcon, ArrowRightIcon } from 'lucide-react';

export const WelcomeSetup = () => {
    const setCapitalPool = usePortfolioStore((state) => state.setCapitalPool);
    const [amountInput, setAmountInput] = useState('');
    const [error, setError] = useState('');

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
                <div className="w-16 h-16 bg-accentPrimary/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accentPrimary/10">
                    <WalletIcon className="w-8 h-8 text-accentPrimary" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white/90 mb-3">
                    歡迎使用資產控管中心
                </h1>
                <p className="text-textSecondary text-sm max-w-sm mx-auto leading-relaxed">
                    為了精準追蹤您的財務分配，請先設定您的
                    <strong className="text-white/80 font-medium ml-1">初始總資金 (TWD)</strong>。
                </p>
            </div>

            <Card className="w-full max-w-sm border-white/10 shadow-2xl">
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <Input
                        label="總資金池金額"
                        placeholder="例如: 1,000,000"
                        value={amountInput}
                        onChange={handleAmountChange}
                        error={error}
                        icon={<span className="font-semibold px-2">NT$</span>}
                        autoFocus
                    />
                    <Button type="submit" size="lg" className="w-full group">
                        開始追蹤
                        <ArrowRightIcon className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                </form>
            </Card>

            <p className="mt-8 text-xs text-textSecondary/60 text-center">
                * 資料由您的瀏覽器進行本地加密儲存，絕對保障個人隱私
            </p>
        </div>
    );
};
