import React, { useEffect, useState } from 'react';
import type { StockAssetType, PurchaseRecord } from '../../types';
import { SIMPLE_HOLDING_TYPES } from '../../types';
import { usePortfolioStore } from '../../store/portfolioStore';
import { ASSET_LABELS, ASSET_COLORS, FORMAT_TWD } from '../../utils/constants';
import { Input } from '../ui/Input';
import { AssetSearchInput } from './AssetSearchInput';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface BuyStockDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    type: StockAssetType;
    editingPurchase?: PurchaseRecord;
    editingHoldingId?: string;
    editingHoldingName?: string;
    poolId?: string;
}

export const BuyStockDrawer = ({
    isOpen, onClose, type,
    editingPurchase, editingHoldingId, editingHoldingName,
    poolId,
}: BuyStockDrawerProps) => {
    const { buyStock, updatePurchase, exchangeRateUSD, getGlobalFreeCapital, getUsStockAvailableCapital, holdings, pools } = usePortfolioStore();

    const isUSStock = type === 'US_STOCK';
    const isSimpleMode = SIMPLE_HOLDING_TYPES.includes(type);
    const isEditMode = !!editingPurchase;

    // 美股買入時使用美股帳戶餘額，其他使用總資產餘額
    // 取得當前可用資金：如果是軍團則用軍團現金，否則依據類型選擇全局或美股池
    const availableCapital = poolId 
        ? (pools.find(p => p.id === poolId)?.currentCash || 0)
        : (isUSStock ? getUsStockAvailableCapital() : getGlobalFreeCapital());

    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
    const [shares, setShares] = useState('');
    const [price, setPrice] = useState('');
    const [amount, setAmount] = useState(''); // 簡易模式用
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    // 取得當前輸入的標的以做防呆
    // 取得當前輸入的標的以做防呆：必須比對 poolId 以確保隔離
    const currentHolding = holdings.find((h) => 
        h.type === type && 
        h.name.toLowerCase() === name.trim().toLowerCase() &&
        h.poolId === poolId
    );
    const availableShares = currentHolding ? currentHolding.shares : 0;
    const availableAmount = currentHolding ? currentHolding.totalAmount : 0;

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
                setSymbol('');
                setAction(editingPurchase.action || 'BUY');
                if (isSimpleMode) {
                    setAmount(editingPurchase.totalCost.toLocaleString('en-US'));
                } else {
                    setShares(String(editingPurchase.shares));
                    setPrice(String(editingPurchase.pricePerShare));
                }
                setNote(editingPurchase.note || '');
            } else {
                setName('');
                setSymbol('');
                setAction('BUY');
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

            if (action === 'SELL' && !isEditMode && numAmount > availableAmount) {
                setError(`減少的金額不能大於目前總投入金額 (${FORMAT_TWD.format(availableAmount)})`);
                return;
            }

            if (isEditMode && editingHoldingId && editingPurchase) {
                const diff = numAmount - editingPurchase.totalCost;
                if (diff > 0 && diff > availableCapital) {
                    setError('增加的金額超出剩餘可動用資金');
                    return;
                }
                updatePurchase(editingHoldingId, editingPurchase.id, {
                    action,
                    shares: 1, // 簡易模式暫以 shares=1 記錄，主要使用 totalCost
                    pricePerShare: numAmount,
                    totalCost: numAmount,
                    note: note || undefined,
                });
            } else {
                if (action === 'BUY' && numAmount > availableCapital) {
                    setError(`超出剩餘可動用資金 (NT$ ${availableCapital.toLocaleString()})`);
                    return;
                }
                buyStock({
                    type: type as any,
                    name: trimmedName,
                    symbol: symbol || undefined,
                    action,
                    shares: 1,
                    pricePerShare: numAmount,
                    totalCost: numAmount,
                    note: note || undefined,
                    poolId,
                });
            }
        } else {
            // ═══ 股數模式 (台股/美股/虛擬幣) ═══
            if (isNaN(numShares) || numShares <= 0) { setError('請輸入有效的數量'); return; }
            if (isNaN(numPrice) || numPrice <= 0) { setError(`請輸入有效的${action === 'BUY' ? '買入' : '賣出'}價格`); return; }

            if (action === 'SELL' && !isEditMode && numShares > availableShares) {
                setError(`賣出數量不能大於目前持有數量 (${availableShares.toLocaleString()})`);
                return;
            }

            if (isEditMode && editingHoldingId && editingPurchase) {
                const diff = isUSStock
                    ? (action === 'BUY' ? calcTotal - (editingPurchase.totalCostUSD || 0) : 0)
                    : (action === 'BUY' ? calcTotalTWD - editingPurchase.totalCost : 0);

                if (diff > 0 && diff > availableCapital && action === 'BUY') {
                    const label = isUSStock ? '美股帳戶' : '總資產';
                    const symbol = isUSStock ? '$' : 'NT$ ';
                    setError(`增加的金額超出${label}剩餘可動用資金 (${symbol}${availableCapital.toLocaleString()})`);
                    return;
                }
                updatePurchase(editingHoldingId, editingPurchase.id, {
                    action,
                    shares: numShares,
                    pricePerShare: numPrice,
                    totalCost: calcTotalTWD,
                    totalCostUSD: isUSStock ? calcTotal : undefined,
                    exchangeRate: isUSStock ? exchangeRateUSD : undefined,
                    note: note || undefined,
                });
            } else {
                if (action === 'BUY') {
                    const isOverLimit = isUSStock ? (calcTotal > availableCapital) : (calcTotalTWD > availableCapital);
                    if (isOverLimit) {
                        const label = isUSStock ? '美股帳戶' : '總資產';
                        const symbol = isUSStock ? '$' : 'NT$ ';
                        setError(`超出${label}剩餘可動用資金 (${symbol}${availableCapital.toLocaleString()})`);
                        return;
                    }
                }
                buyStock({
                    type: type as any,
                    name: trimmedName,
                    symbol: symbol || undefined,
                    action,
                    shares: numShares,
                    pricePerShare: numPrice,
                    totalCost: calcTotalTWD,
                    totalCostUSD: isUSStock ? calcTotal : undefined,
                    exchangeRate: isUSStock ? exchangeRateUSD : undefined,
                    note: note || undefined,
                    poolId,
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
                            {isEditMode ? '編輯紀錄' : (isSimpleMode ? '新增紀錄' : '新增交易')}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-clay hover:text-slate-800 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* 買入 / 賣出 Toggle */}
                    <div className="flex bg-stoneSoft/30 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => { setAction('BUY'); setError(''); }}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                                action === 'BUY' ? "bg-white shadow-sm text-rust" : "text-clay hover:text-slate-800"
                            )}
                        >
                            {isSimpleMode ? '投入' : '買入'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setAction('SELL'); setError(''); }}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                                action === 'SELL' ? "bg-white shadow-sm text-moss" : "text-clay hover:text-slate-800"
                            )}
                        >
                            {isSimpleMode ? '取回' : '賣出'}
                        </button>
                    </div>

                    {type === 'TAIWAN_STOCK' || type === 'US_STOCK' ? (
                        <AssetSearchInput
                            type={type}
                            value={name}
                            onChange={(v) => setName(v)}
                            onSelect={(n, sym) => {
                                setName(`${n} (${sym})`);
                                setSymbol(sym);
                                setError('');
                            }}
                            placeholder={getNamePlaceholder()}
                            error={error}
                            disabled={isEditMode}
                        />
                    ) : (
                        <Input
                            label="標的名稱"
                            placeholder={getNamePlaceholder()}
                            value={name}
                            onChange={(e) => { 
                                setName(e.target.value); 
                                setSymbol(''); // Non-stock assets don't need symbols for quotes right now
                                setError(''); 
                            }}
                            autoFocus
                            disabled={isEditMode}
                            error={error}
                        />
                    )}

                    {isSimpleMode ? (
                        /* ═══ 簡易模式：只有金額 ═══ */
                        <Input
                            label={action === 'BUY' ? "投入金額 (TWD)" : "取回金額 (TWD)"}
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
                                    label={type === 'CRYPTO' ? (action === 'BUY' ? '買入數量' : '賣出數量') : (action === 'BUY' ? '買入股數' : '賣出股數')}
                                    placeholder="0"
                                    value={shares}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
                                        setShares(val);
                                        setError('');
                                    }}
                                />
                                <Input
                                    label={isUSStock ? (action === 'BUY' ? '買入價格 (USD)' : '賣出價格 (USD)') : (action === 'BUY' ? '買入價格 (TWD)' : '賣出價格 (TWD)')}
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
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs text-clay">
                                            {isEditMode ? '修改後總金額' : (action === 'BUY' ? '此次投入金額' : '此次拿回金額')}
                                        </p>
                                        {action === 'SELL' && availableShares > 0 && (
                                            <p className="text-[10px] text-clay bg-white/50 px-1.5 py-0.5 rounded">
                                                可賣出餘額: {availableShares.toLocaleString()}
                                            </p>
                                        )}
                                    </div>
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
