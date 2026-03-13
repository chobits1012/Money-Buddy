import React, { useEffect, useState } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import type { AssetType } from '../../types';
import { ASSET_LABELS, ASSET_COLORS } from '../../utils/constants';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AssetDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    type: AssetType | null;
}

export const AssetDrawer = ({ isOpen, onClose, type }: AssetDrawerProps) => {
    const { addTransaction, exchangeRateUSD, getAvailableCapital } = usePortfolioStore();
    const availableCapital = getAvailableCapital();

    const [amountTWD, setAmountTWD] = useState('');
    const [amountUSD, setAmountUSD] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    // 每次開啟時重置狀態
    useEffect(() => {
        if (isOpen) {
            setAmountTWD('');
            setAmountUSD('');
            setNote('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen || !type) return null;

    const isUSStock = type === 'US_STOCK';

    const handleTWDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
        if (!val) {
            setAmountTWD('');
            if (isUSStock) setAmountUSD('');
            setError('');
            return;
        }
        const numTWD = Number(val);
        setAmountTWD(numTWD.toLocaleString('en-US'));

        // 如果是美股，自動反推美金
        if (isUSStock) {
            setAmountUSD((numTWD / exchangeRateUSD).toFixed(2));
        }
        setError('');
    };

    const handleUSDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, ''); // 容許小數點
        if (!val) {
            setAmountUSD('');
            setAmountTWD('');
            setError('');
            return;
        }
        const numUSD = Number(val);
        if (!isNaN(numUSD)) {
            setAmountUSD(val); // 保持使用者輸入的樣子 (包含小數點)
            // 自動換算台幣
            setAmountTWD(Math.round(numUSD * exchangeRateUSD).toLocaleString('en-US'));
        }
        setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalAmountTWD = Number(amountTWD.replace(/,/g, ''));

        // 安全防護機制：金額驗證與不可大於剩餘可用資金
        if (isNaN(finalAmountTWD) || finalAmountTWD <= 0) {
            setError('請輸入有效的金額');
            return;
        }
        if (finalAmountTWD > availableCapital) {
            setError(`金額不可大於目前剩餘可動用資金 (NT$ ${availableCapital.toLocaleString()})`);
            return;
        }

        addTransaction({
            type,
            amount: finalAmountTWD,
            action: 'DEPOSIT',
            note: note || '新增投入',
            ...(isUSStock && { amountUSD: Number(amountUSD), exchangeRate: exchangeRateUSD })
        });

        onClose();
    };

    return (
        <>
            <div
                className={cn(
                    "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            <div
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-white/10 rounded-t-3xl p-6 transition-transform duration-300 ease-in-out shadow-2xl max-w-md mx-auto",
                    isOpen ? "translate-y-0" : "translate-y-full"
                )}
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className={cn("px-3 py-1 text-xs font-semibold rounded-full", ASSET_COLORS[type])}>
                            {ASSET_LABELS[type]}
                        </div>
                        <h3 className="text-xl font-bold text-white">新增投入資金</h3>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-textSecondary hover:text-white transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* 美股雙幣別特殊處理 */}
                    {isUSStock ? (
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="投入金額 (USD)"
                                placeholder="0.00"
                                value={amountUSD}
                                onChange={handleUSDChange}
                                icon={<span className="font-semibold px-1">$</span>}
                            />
                            <Input
                                label={`換算台幣 (匯率 ${exchangeRateUSD})`}
                                placeholder="0"
                                value={amountTWD}
                                onChange={handleTWDChange}
                                icon={<span className="font-semibold px-1 text-xs">NT$</span>}
                            />
                        </div>
                    ) : (
                        <Input
                            label="投入金額 (TWD)"
                            placeholder="例如: 10,000"
                            value={amountTWD}
                            onChange={handleTWDChange}
                            icon={<span className="font-semibold px-2">NT$</span>}
                        />
                    )}

                    <Input
                        label="備註 (選填)"
                        placeholder="例如: 定期定額 QQQ"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />

                    {error && (
                        <div className="p-3 bg-accentDanger/10 border border-accentDanger/20 rounded-xl text-accentDanger text-sm">
                            {error}
                        </div>
                    )}

                    <Button type="submit" size="lg" className="w-full mt-2">
                        確認投入
                    </Button>
                </form>
            </div>
        </>
    );
};
