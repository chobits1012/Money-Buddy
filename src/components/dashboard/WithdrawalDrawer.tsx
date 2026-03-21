import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface WithdrawalDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (amount: number, note: string) => void;
}

export const WithdrawalDrawer = ({
    isOpen,
    onClose,
    onSubmit
}: WithdrawalDrawerProps) => {
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
        if (!val) { setAmount(''); setError(''); return; }
        setAmount(Number(val).toLocaleString('en-US'));
        setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = Number(amount.replace(/,/g, ''));
        if (isNaN(numAmount) || numAmount <= 0) { setError('請輸入有效的金額'); return; }
        onSubmit(numAmount, note || '提領');
        onClose();
        setAmount('');
        setNote('');
        setError('');
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 opacity-100"
                onClick={onClose}
            />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-stoneSoft rounded-t-3xl p-6 shadow-2xl max-w-md mx-auto translate-y-0 transition-transform duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-light text-slate-800">總資產提領</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-clay hover:text-slate-800 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <Input
                        label="提領金額 (TWD)"
                        placeholder="例如: 10,000"
                        value={amount}
                        onChange={handleAmountChange}
                        icon={<span className="font-semibold px-2 text-xs">NT$</span>}
                        autoFocus
                    />
                    <Input
                        label="備註 (選填)"
                        placeholder="例如: 轉出至生活費、購買家電"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                    {error && (
                        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-rust text-sm">
                            {error}
                        </div>
                    )}
                    <Button type="submit" size="lg" variant="secondary" className="w-full mt-2">
                        確認提領
                    </Button>
                </form>
            </div>
        </>
    );
};
