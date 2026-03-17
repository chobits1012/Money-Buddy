import React, { useState } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../utils/cn';
import type { CustomCategory } from '../../types';

interface CustomCategoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    editingCategory?: CustomCategory;
}

export const CustomCategoryDrawer = ({ isOpen, onClose, editingCategory }: CustomCategoryDrawerProps) => {
    const { addCustomCategory, updateCustomCategory, getAvailableCapital } = usePortfolioStore();
    const availableCapital = getAvailableCapital();

    const isEditMode = !!editingCategory;

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (editingCategory) {
                setName(editingCategory.name);
                setAmount(editingCategory.amount.toLocaleString('en-US'));
                setNote(editingCategory.note);
            } else {
                setName('');
                setAmount('');
                setNote('');
            }
            setError('');
        }
    }, [isOpen, editingCategory]);

    if (!isOpen) return null;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
        if (!val) { setAmount(''); setError(''); return; }
        setAmount(Number(val).toLocaleString('en-US'));
        setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) { setError('請輸入欄位名稱'); return; }

        const numAmount = Number(amount.replace(/,/g, ''));
        if (isNaN(numAmount) || numAmount <= 0) { setError('請輸入有效的金額'); return; }

        const maxAllowed = isEditMode
            ? availableCapital + (editingCategory?.amount ?? 0)
            : availableCapital;

        if (numAmount > maxAllowed) {
            setError(`金額超出剩餘可動用資金 (NT$ ${maxAllowed.toLocaleString()})`);
            return;
        }

        if (isEditMode && editingCategory) {
            updateCustomCategory(editingCategory.id, {
                name: trimmedName,
                amount: numAmount,
                note: note,
            });
        } else {
            addCustomCategory({ name: trimmedName, amount: numAmount, note: note });
        }
        onClose();
    };

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
                    <h3 className="text-xl font-light text-slate-800">
                        {isEditMode ? '編輯欄位' : '新增自訂欄位'}
                    </h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-clay hover:text-slate-800 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <Input
                        label="欄位名稱"
                        placeholder="例如: 緊急預備金、保險"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(''); }}
                        autoFocus
                    />
                    <Input
                        label="金額 (TWD)"
                        placeholder="例如: 100,000"
                        value={amount}
                        onChange={handleAmountChange}
                        icon={<span className="font-semibold px-2 text-xs">NT$</span>}
                    />
                    <Input
                        label="用途 / 備註"
                        placeholder="例如: 半年生活費、年繳保費"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />

                    {error && (
                        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-rust text-sm">
                            {error}
                        </div>
                    )}

                    <Button type="submit" size="lg" className="w-full mt-2">
                        {isEditMode ? '確認修改' : '確認新增'}
                    </Button>
                </form>
            </div>
        </>
    );
};
