import React, { useState } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { ASSET_COLORS, FORMAT_TWD } from '../../utils/constants';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';

interface FundTransferDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FundTransferDrawer = ({ isOpen, onClose }: FundTransferDrawerProps) => {
    const { addTransaction, getUsStockAvailableCapital, getGlobalFreeCapital, exchangeRateUSD } = usePortfolioStore();
    const availableTotal = getGlobalFreeCapital();
    const availableInUS = getUsStockAvailableCapital();

    const [mode, setMode] = useState<'IN' | 'OUT'>('IN');
    const [amountTWD, setAmountTWD] = useState('');
    const [amountUSD, setAmountUSD] = useState('');
    const [error, setError] = useState('');

    const handleTWDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
        if (!val) {
            setAmountTWD('');
            setAmountUSD('');
            setError('');
            return;
        }
        const numTWD = Number(val);
        setAmountTWD(numTWD.toLocaleString('en-US'));
        setAmountUSD((numTWD / exchangeRateUSD).toFixed(2));
        setError('');
    };

    const handleUSDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
        if (!val) {
            setAmountUSD('');
            setAmountTWD('');
            setError('');
            return;
        }
        const numUSD = Number(val);
        if (!isNaN(numUSD)) {
            setAmountUSD(val);
            setAmountTWD(Math.round(numUSD * exchangeRateUSD).toLocaleString('en-US'));
        }
        setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numTWD = Number(amountTWD.replace(/,/g, ''));
        const numUSD = Number(amountUSD);

        if (isNaN(numTWD) || numTWD <= 0) {
            setError('請輸入有效的金額');
            return;
        }

        if (mode === 'IN' && numTWD > availableTotal) {
            setError(`金額不可大於目前總資產剩餘可動用資金 (NT$ ${availableTotal.toLocaleString()})`);
            return;
        }

        if (mode === 'OUT' && numUSD > availableInUS) {
            setError(`金額不可大於美股帳戶目前可用餘額 ($ ${availableInUS.toLocaleString()})`);
            return;
        }

        addTransaction({
            type: 'US_STOCK',
            amount: numTWD,
            amountUSD: numUSD,
            exchangeRate: exchangeRateUSD,
            action: mode === 'IN' ? 'DEPOSIT' : 'WITHDRAWAL',
            note: mode === 'IN' ? '撥入美股帳戶' : '由美股帳戶撥回'
        });

        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className={cn(
                    "fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />
            <div
                className={cn(
                    "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-stoneSoft rounded-t-3xl p-6 transition-transform duration-300 ease-in-out shadow-2xl max-w-md mx-auto",
                    isOpen ? "translate-y-0" : "translate-y-full"
                )}
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className={cn("px-3 py-1 text-xs font-semibold rounded-full", ASSET_COLORS.US_STOCK)}>
                            美股帳戶
                        </div>
                        <h3 className="text-xl font-light text-slate-800">資金劃撥</h3>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-clay hover:text-slate-800 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex p-1 bg-stoneSoft/30 rounded-xl mb-6">
                    <button
                        onClick={() => { setMode('IN'); setError(''); }}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                            mode === 'IN' ? "bg-white text-rust shadow-sm" : "text-clay hover:text-slate-600"
                        )}
                    >
                        入金 (至美股)
                    </button>
                    <button
                        onClick={() => { setMode('OUT'); setError(''); }}
                        className={cn(
                            "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                            mode === 'OUT' ? "bg-white text-moss shadow-sm" : "text-clay hover:text-slate-600"
                        )}
                    >
                        出金 (回總資產)
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="p-3 rounded-xl bg-stoneSoft/20 border border-stoneSoft">
                        <p className="text-xs text-clay mb-1">
                            {mode === 'IN' ? '總資產可用資金 (NT)' : '美股帳戶可用餘額 (USD)'}
                        </p>
                        <p className="text-lg font-light text-slate-800">
                            {mode === 'IN'
                                ? FORMAT_TWD.format(availableTotal)
                                : `${availableInUS.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="金額 (USD)"
                            placeholder="0.00"
                            value={amountUSD}
                            onChange={handleUSDChange}
                            icon={<span className="font-semibold px-1">$</span>}
                            autoFocus
                        />
                        <Input
                            label={`換算台幣 (匯率 ${exchangeRateUSD})`}
                            placeholder="0"
                            value={amountTWD}
                            onChange={handleTWDChange}
                            icon={<span className="font-semibold px-1 text-xs">NT$</span>}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-rust text-sm">
                            {error}
                        </div>
                    )}

                    <Button type="submit" size="lg" className="w-full mt-2">
                        確認{mode === 'IN' ? '入金' : '出金'}
                    </Button>
                </form>
            </div>
        </>
    );
};
