import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface DepositDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (amount: number, note: string) => void;
}

export const DepositDrawer = ({
    isOpen,
    onClose,
    onSubmit
}: DepositDrawerProps) => {
    const [depositAmount, setDepositAmount] = useState('');
    const [depositNote, setDepositNote] = useState('');
    const [depositError, setDepositError] = useState('');

    const handleDepositAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
        if (!val) { setDepositAmount(''); setDepositError(''); return; }
        setDepositAmount(Number(val).toLocaleString('en-US'));
        setDepositError('');
    };

    const handleDepositSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = Number(depositAmount.replace(/,/g, ''));
        if (isNaN(numAmount) || numAmount <= 0) { setDepositError('請輸入有效的金額'); return; }
        onSubmit(numAmount, depositNote || '入金');
        onClose();
        setDepositAmount('');
        setDepositNote('');
        setDepositError('');
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
                    <h3 className="text-xl font-light text-slate-800">總資產入金</h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-clay hover:text-slate-800 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleDepositSubmit} className="flex flex-col gap-5">
                    <Input
                        label="入金金額 (TWD)"
                        placeholder="例如: 50,000"
                        value={depositAmount}
                        onChange={handleDepositAmountChange}
                        icon={<span className="font-semibold px-2 text-xs">NT$</span>}
                        autoFocus
                    />
                    <Input
                        label="備註 (選填)"
                        placeholder="例如: 年終獎金、薪水"
                        value={depositNote}
                        onChange={(e) => setDepositNote(e.target.value)}
                    />
                    {depositError && (
                        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-rust text-sm">
                            {depositError}
                        </div>
                    )}
                    <Button type="submit" size="lg" className="w-full mt-2">
                        確認入金
                    </Button>
                </form>
            </div>
        </>
    );
};
