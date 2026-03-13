import React, { useEffect, useState } from 'react';
import type { StockAssetType, PurchaseRecord } from '../../types';
import { SIMPLE_HOLDING_TYPES } from '../../types';
import { usePortfolioStore } from '../../store/portfolioStore';
import { ASSET_LABELS, ASSET_COLORS } from '../../utils/constants';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface BuyStockDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    type: StockAssetType;
    editingPurchase?: PurchaseRecord;
    editingHoldingId?: string;
    editingHoldingName?: string;
}

export const BuyStockDrawer = ({
    isOpen, onClose, type,
    editingPurchase, editingHoldingId, editingHoldingName,
}: BuyStockDrawerProps) => {
    const { buyStock, updatePurchase, exchangeRateUSD, getAvailableCapital, getUsStockAvailableCapital } = usePortfolioStore();

    const isUSStock = type === 'US_STOCK';
    const isSimpleMode = SIMPLE_HOLDING_TYPES.includes(type);
    const isEditMode = !!editingPurchase;

    // 美股買入時使用美股帳戶餘額，其他使用總資產餘額
    const availableCapital = isUSStock ? getUsStockAvailableCapital() : getAvailableCapital();

    const [name, setName] = useState('');
    const [shares, setShares] = useState('');
    const [price, setPrice] = useState('');
    const [amount, setAmount] = useState(''); // 簡易模式用
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    // 股數模式：自動計算總額
    const numShares = Number(shares.replace(/,/g, '') || 0);
    const numPrice = Number(price.replace(/,/g, '') || 0);
    const calcTotal = numShares > 0 && numPrice > 0 ? numShares * numPrice : 0;
    const calcTotalTWD = isUSStock ? Math.round(calcTotal * exchangeRateUSD) : calcTotal;

    // 簡易模式：直接從 amount 取值
    const numAmount = Number(amount.replace(/,/g, '') || 0);

    useEffect(() => {
        if (isOpen) {
            if (editingPurchase) {
                setName(editingHoldingName || '');
                if (isSimpleMode) {
                    setAmount(editingPurchase.totalCost.toLocaleString('en-US'));
                } else {
                    setShares(String(editingPurchase.shares));
                    setPrice(String(editingPurchase.pricePerShare));
                }
                setNote(editingPurchase.note || '');
            } else {
                setName('');
                setShares('');
                setPrice('');
                setAmount('');
                setNote('');
            }
            setError('');
        }
    }, [isOpen, editingPurchase, editingHoldingName, isSimpleMode]);

    if (!isOpen) return null;

    const getNamePlaceholder = () => {
        switch (type) {
            case 'TAIWAN_STOCK': return '例如: 台積電、0050';
            case 'US_STOCK': return '例如: AAPL、QQQ';
            case 'FUNDS': return '例如: 元大台灣50、復華債券';
            case 'CRYPTO': return '例如: BTC、ETH';
            default: return '請輸入名稱';
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
        if (!val) { setAmount(''); setError(''); return; }
        setAmount(Number(val).toLocaleString('en-US'));
        setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedName = name.trim();
        if (!trimmedName) { setError('請輸入標的名稱'); return; }

        if (isSimpleMode) {
            // ═══ 簡易模式 (基金) ═══
            if (isNaN(numAmount) || numAmount <= 0) { setError('請輸入有效的金額'); return; }

            if (isEditMode && editingHoldingId && editingPurchase) {
                const diff = numAmount - editingPurchase.totalCost;
                if (diff > 0 && diff > availableCapital) {
                    setError('增加的金額超出剩餘可動用資金');
                    return;
                }
                updatePurchase(editingHoldingId, editingPurchase.id, {
                    shares: 1,
                    pricePerShare: numAmount,
                    totalCost: numAmount,
                    note: note || undefined,
                });
            } else {
                if (numAmount > availableCapital) {
                    setError(`超出剩餘可動用資金 (NT$ ${availableCapital.toLocaleString()})`);
                    return;
                }
                buyStock({
                    type,
                    name: trimmedName,
                    shares: 1,
                    pricePerShare: numAmount,
                    totalCost: numAmount,
                    note: note || undefined,
                });
            }
        } else {
            // ═══ 股數模式 (台股/美股/虛擬幣) ═══
            if (isNaN(numShares) || numShares <= 0) { setError('請輸入有效的數量'); return; }
            if (isNaN(numPrice) || numPrice <= 0) { setError('請輸入有效的買入價格'); return; }

            if (isEditMode && editingHoldingId && editingPurchase) {
                const oldTotalTWD = editingPurchase.totalCost;
                const diff = calcTotalTWD - oldTotalTWD;
                if (diff > 0 && diff > availableCapital) {
                    const label = isUSStock ? '美股帳戶' : '總資產';
                    setError(`增加的金額超出${label}剩餘可動用資金`);
                    return;
                }
                updatePurchase(editingHoldingId, editingPurchase.id, {
                    shares: numShares,
                    pricePerShare: numPrice,
                    totalCost: calcTotalTWD,
                    totalCostUSD: isUSStock ? calcTotal : undefined,
                    exchangeRate: isUSStock ? exchangeRateUSD : undefined,
                    note: note || undefined,
                });
            } else {
                if (calcTotalTWD > availableCapital) {
                    const label = isUSStock ? '美股帳戶' : '總資產';
                    setError(`超出${label}剩餘可動用資金 (NT$ ${availableCapital.toLocaleString()})`);
                    return;
                }
                buyStock({
                    type,
                    name: trimmedName,
                    shares: numShares,
                    pricePerShare: numPrice,
                    totalCost: calcTotalTWD,
                    totalCostUSD: isUSStock ? calcTotal : undefined,
                    exchangeRate: isUSStock ? exchangeRateUSD : undefined,
                    note: note || undefined,
                });
            }
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
                    <div className="flex items-center gap-3">
                        <div className={cn("px-3 py-1 text-xs font-semibold rounded-full", ASSET_COLORS[type])}>
                            {ASSET_LABELS[type]}
                        </div>
                        <h3 className="text-xl font-light text-slate-800">
                            {isEditMode ? '編輯紀錄' : (isSimpleMode ? '記錄投入' : '記錄買入')}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-clay hover:text-slate-800 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <Input
                        label="標的名稱"
                        placeholder={getNamePlaceholder()}
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError(''); }}
                        autoFocus
                        disabled={isEditMode}
                    />

                    {isSimpleMode ? (
                        /* ═══ 簡易模式：只有金額 ═══ */
                        <Input
                            label="投入金額 (TWD)"
                            placeholder="例如: 10,000"
                            value={amount}
                            onChange={handleAmountChange}
                            icon={<span className="font-semibold px-1 text-xs">NT$</span>}
                        />
                    ) : (
                        /* ═══ 股數模式：股數 + 價格 ═══ */
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label={type === 'CRYPTO' ? '買入數量' : '買入股數'}
                                    placeholder="0"
                                    value={shares}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
                                        setShares(val);
                                        setError('');
                                    }}
                                />
                                <Input
                                    label={isUSStock ? '買入價格 (USD)' : '買入價格 (TWD)'}
                                    placeholder="0"
                                    value={price}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
                                        setPrice(val);
                                        setError('');
                                    }}
                                    icon={isUSStock
                                        ? <span className="font-semibold px-1 text-xs">$</span>
                                        : <span className="font-semibold px-1 text-xs">NT$</span>
                                    }
                                />
                            </div>

                            {/* 自動計算總額 */}
                            {calcTotal > 0 && (
                                <div className="p-3 rounded-xl bg-stoneSoft/30 border border-stoneSoft">
                                    <p className="text-xs text-clay mb-1">
                                        {isEditMode ? '修改後投入金額' : '此次投入金額'}
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        {isUSStock && (
                                            <span className="text-lg font-light text-slate-800">
                                                ${calcTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
                                        <span className={cn(
                                            "font-medium",
                                            isUSStock ? "text-sm text-clay" : "text-lg text-slate-800 font-light"
                                        )}>
                                            {isUSStock ? `≈ NT$${calcTotalTWD.toLocaleString()}` : `NT$${calcTotalTWD.toLocaleString()}`}
                                        </span>
                                    </div>
                                    {isUSStock && (
                                        <p className="text-[10px] text-clay/60 mt-1">匯率: {exchangeRateUSD}</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    <Input
                        label="備註 (選填)"
                        placeholder={isSimpleMode ? '例如: 定期定額、單筆申購' : '例如: 定期定額、加碼'}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />

                    {error && (
                        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-rust text-sm">
                            {error}
                        </div>
                    )}

                    <Button type="submit" size="lg" className="w-full mt-2">
                        {isEditMode ? '確認修改' : '確認'}
                    </Button>
                </form>
            </div>
        </>
    );
};
