import React, { useState, useEffect } from 'react';
import type { StockAssetType, PurchaseRecord } from '../../types';
import { SIMPLE_HOLDING_TYPES } from '../../types';
import { usePortfolioStore } from '../../store/portfolioStore';
import { ASSET_LABELS, ASSET_COLORS, FORMAT_TWD } from '../../utils/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BuyStockDrawer } from './HoldingFormDrawer';
import { ConfirmModal } from '../ui/ConfirmModal';
import { cn } from '../../utils/cn';

import { CapitalPools } from "../dashboard/CapitalPools";

interface HoldingsPageProps {
    type: StockAssetType;
    onBack: () => void;
}
interface FundTransferDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const FundTransferDrawer = ({ isOpen, onClose }: FundTransferDrawerProps) => {
    const { addTransaction, getUsStockAvailableCapital, getAvailableCapital, exchangeRateUSD } = usePortfolioStore();
    const availableTotal = getAvailableCapital();
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
                            {mode === 'IN' ? '總資產可用資金' : '美股帳戶可用餘額'}
                        </p>
                        <p className="text-lg font-light text-slate-800">
                            {FORMAT_TWD.format(mode === 'IN' ? availableTotal : availableInUS)}
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

export const HoldingsPage = ({ type, onBack }: HoldingsPageProps) => {
    const {
        getHoldingsByType, removeHolding, removePurchase,
        usStockFundPool, getAvailableCapital, addPool, pools,
        fetchQuotesForHoldings, exchangeRateUSD, updateHoldingPool
    } = usePortfolioStore();

    useEffect(() => {
        if (!SIMPLE_HOLDING_TYPES.includes(type)) {
            fetchQuotesForHoldings();
        }
    }, [type, fetchQuotesForHoldings]);

    const [isBuyOpen, setIsBuyOpen] = useState(false);
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [expandedHoldingId, setExpandedHoldingId] = useState<string | null>(null);
    const [activePoolId, setActivePoolId] = useState<string | null>(null);
    const [isAddPoolOpen, setIsAddPoolOpen] = useState(false);
    
    // 資金池表單狀態
    const [poolName, setPoolName] = useState('');
    const [poolAmount, setPoolAmount] = useState('');
    const [poolError, setPoolError] = useState('');
 
    // 取得當前可用餘額：若是進入軍團視圖，則顯示軍團內的現金
    const currentPool = pools.find(p => p.id === activePoolId);
    const availableTotal = activePoolId && currentPool 
        ? currentPool.currentCash 
        : getAvailableCapital();
 
    // ConfirmModal 狀態
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        action: () => void;
    } | null>(null);

    // 編輯模式狀態
    const [editingPurchase, setEditingPurchase] = useState<PurchaseRecord | undefined>(undefined);
    const [editingHoldingId, setEditingHoldingId] = useState<string | undefined>(undefined);
    const [editingHoldingName, setEditingHoldingName] = useState<string | undefined>(undefined);

    const isUSStock = type === 'US_STOCK';
    const isSimpleMode = SIMPLE_HOLDING_TYPES.includes(type);
    
    // 根據當前軍團過濾持倉與計算總投入 (若是 null 則代表全局)
    const allHoldingsOfType = getHoldingsByType(type);
    const filteredHoldings = allHoldingsOfType.filter(h => h.poolId === (activePoolId || undefined));
    const unassignedHoldings = allHoldingsOfType.filter(h => !h.poolId);
    
    const totalInvested = filteredHoldings.reduce((sum, h) => sum + h.totalAmount, 0);
    const totalInvestedUSD = isUSStock
        ? filteredHoldings.reduce((sum, h) => sum + (h.totalAmountUSD || 0), 0)
        : 0;

    const usStockAvailable = isUSStock ? usStockFundPool - totalInvestedUSD : 0;

    const toggleExpand = (id: string) => {
        setExpandedHoldingId((prev) => (prev === id ? null : id));
    };

    const handleEdit = (holdingId: string, holdingName: string, purchase: PurchaseRecord) => {
        setEditingPurchase(purchase);
        setEditingHoldingId(holdingId);
        setEditingHoldingName(holdingName);
        setIsBuyOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsBuyOpen(false);
        setEditingPurchase(undefined);
        setEditingHoldingId(undefined);
        setEditingHoldingName(undefined);
    };

    const handleAddPool = () => {
        const amount = Number(poolAmount.replace(/,/g, ''));
        if (!poolName) { setPoolError('請輸入軍團名稱'); return; }
        if (isNaN(amount) || amount <= 0) { setPoolError('請輸入有效金額'); return; }
        if (amount > availableTotal) { setPoolError('金額不可大於可用資產'); return; }
        
        addPool(poolName, amount);
        setIsAddPoolOpen(false);
        setPoolName('');
        setPoolAmount('');
        setPoolError('');
    };
    return (
        <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            {/* 頂部導航列 */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-xl text-clay hover:text-slate-800 hover:bg-stoneSoft/50 transition-all"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="flex items-center gap-3 flex-1">
                    <div className={cn("px-3 py-1 text-xs font-semibold rounded-full", ASSET_COLORS[type])}>
                        {ASSET_LABELS[type]}
                    </div>
                    <h2 className="text-lg font-light text-slate-800">持倉總覽</h2>
                </div>
            </div>

            {/* ═══ 美股帳戶資金卡片 (僅美股顯示) ═══ */}
            {isUSStock && (
                <Card className="relative overflow-hidden border-rust/20">
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-rust/8 rounded-full blur-3xl pointer-events-none" />
                    <div className="z-10 relative">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="text-clay text-xs font-medium tracking-wide uppercase">美股帳戶總資產</p>
                                <div className="flex flex-col">
                                    <p className="text-2xl font-light text-slate-800 mt-0.5">
                                        ${usStockFundPool.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-clay/70">
                                        ≈ {FORMAT_TWD.format(Math.round(usStockFundPool * exchangeRateUSD))}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsDepositOpen(true)}
                                className="shrink-0 text-clay"
                            >
                                <span className="material-symbols-outlined text-base mr-1">sync_alt</span>
                                資金劃撥
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-2.5 rounded-lg bg-stoneSoft/20">
                                <p className="text-[10px] text-clay uppercase tracking-wider">已投入資金 (USD)</p>
                                <p className="text-sm font-medium text-slate-800 mt-0.5">
                                    ${totalInvestedUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-moss/8">
                                <p className="text-[10px] text-clay uppercase tracking-wider">帳戶可用餘額 (USD)</p>
                                <p className="text-sm font-medium text-moss mt-0.5">
                                    ${usStockAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* 投入總額摘要 (若進入軍團後顯示) */}
            {activePoolId && !isUSStock && (
                <Card className="relative overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/8 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex justify-between items-center z-10 relative">
                        <div>
                            <p className="text-clay text-xs font-medium tracking-wide uppercase">總投入金額</p>
                            <p className="text-2xl font-light text-slate-800 mt-0.5">
                                {FORMAT_TWD.format(totalInvested)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-clay">
                            <span className="material-symbols-outlined text-xl">bar_chart</span>
                            <span className="text-sm font-medium">{filteredHoldings.length} 檔</span>
                        </div>
                    </div>
                </Card>
            )}

            {/* 戰備池子管理區 */}
            {!activePoolId ? (
                <div className="flex flex-col gap-4">
                    <CapitalPools type={type} onSelectPool={setActivePoolId} />
                    <Button 
                        variant="secondary" 
                        className="w-full py-6 border-dashed border-2 bg-stoneSoft/10 hover:bg-stoneSoft/20"
                        onClick={() => setIsAddPoolOpen(true)}
                    >
                        <span className="material-symbols-outlined mr-2">add_circle</span>
                        新增戰備軍團
                    </Button>

                    {/* 未歸屬標的 (舊資料) */}
                    {unassignedHoldings.length > 0 && (
                        <div className="mt-4">
                            <h3 className="text-sm font-medium text-clay uppercase tracking-wider mb-3 px-1">未歸屬標的 (舊資料)</h3>
                            <div className="flex flex-col gap-3">
                                {unassignedHoldings.map(h => (
                                    <Card key={h.id} className="p-4 bg-rust/5 border-rust/10">
                                        <div className="flex justify-between items-center gap-4">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-800 truncate">{h.name}</p>
                                                <p className="text-[10px] text-clay mt-0.5">總投入: {FORMAT_TWD.format(h.totalAmount)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <select 
                                                    className="text-[10px] bg-white border border-stoneSoft rounded px-2 py-1.5 outline-none font-medium text-slate-700"
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            updateHoldingPool(h.id, e.target.value);
                                                        }
                                                    }}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>移至軍團...</option>
                                                    {pools.filter(p => p.type === type).map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    onClick={() => setConfirmAction({
                                                        title: '刪除未歸屬標的',
                                                        message: `確定要刪除「${h.name}」的所有紀錄嗎？`,
                                                        action: () => removeHolding(h.id)
                                                    })}
                                                    className="p-1.5 text-clay/40 hover:text-rust transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-2">
                        <button 
                            onClick={() => setActivePoolId(null)} 
                            className="text-xs text-clay flex items-center hover:text-slate-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm mr-1">arrow_back_ios</span>
                            返回軍團列表
                        </button>
                    </div>

                    {/* 持倉清單 (僅在進入軍團後顯示) */}
                    {filteredHoldings.length === 0 ? (
                        <Card className="flex flex-col items-center justify-center p-10 text-center bg-white/20 border-dashed border-stoneSoft">
                            <div className="w-12 h-12 bg-stoneSoft/30 rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-clay text-2xl">add</span>
                            </div>
                            <p className="text-clay text-sm mb-1">尚無持倉紀錄</p>
                            <p className="text-clay/60 text-xs">點擊下方按鈕記錄第一筆交易</p>
                        </Card>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredHoldings.map((holding) => {
                                const isExpanded = expandedHoldingId === holding.id;
                                const totalPnL = (holding.unrealizedPnL || 0) + (holding.realizedPnL || 0);
                                const pnlPercent = holding.totalAmount > 0 
                                    ? (totalPnL / holding.totalAmount) * 100 
                                    : 0;

                                return (
                                    <Card key={holding.id} noPadding className="overflow-hidden">
                                        {/* 持倉摘要（可點擊展開） */}
                                        <button
                                            onClick={() => toggleExpand(holding.id)}
                                            className="w-full p-4 flex items-center justify-between text-left hover:bg-stoneSoft/10 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <h4 className="font-semibold text-slate-800 text-sm truncate">
                                                        {holding.name}
                                                    </h4>
                                                    <span className="text-[10px] text-clay bg-stoneSoft/40 px-1.5 py-0.5 rounded shrink-0">
                                                        {holding.purchases.length} 筆{isSimpleMode ? '紀錄' : '交易'}
                                                    </span>
                                                </div>
                                                {isSimpleMode ? (
                                                    /* ═══ 簡易模式 (基金)：只顯示總投入金額 ═══ */
                                                    <div>
                                                        <p className="text-[10px] text-clay uppercase tracking-wider">總投入金額</p>
                                                        <p className="text-sm font-bold text-slate-800 mt-0.5">
                                                            {FORMAT_TWD.format(holding.totalAmount)}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-3 gap-y-4 gap-x-2 mt-2">
                                                        <div>
                                                            <p className="text-[10px] text-clay uppercase tracking-wider">總股數</p>
                                                            <p className="text-sm font-medium text-textPrimary mt-0.5">
                                                                {holding.shares.toLocaleString('en-US')}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-clay uppercase tracking-wider">均價</p>
                                                            <p className="text-sm font-medium text-textPrimary mt-0.5">
                                                                {isUSStock
                                                                    ? `$${holding.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                                                    : `$${holding.avgPrice.toLocaleString('en-US', { maximumFractionDigits: 1 })}`
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-clay uppercase tracking-wider">現價</p>
                                                            <p className="text-sm font-medium text-textPrimary mt-0.5">
                                                                {holding.currentPrice !== undefined
                                                                    ? (isUSStock
                                                                        ? `$${holding.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                                                        : `$${holding.currentPrice.toLocaleString('en-US', { maximumFractionDigits: 1 })}`)
                                                                    : '-'
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] text-clay uppercase tracking-wider">總成本</p>
                                                            <p className="text-sm font-bold text-slate-800 mt-0.5">
                                                                {isUSStock
                                                                    ? `$${(holding.totalAmountUSD || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                                                                    : FORMAT_TWD.format(holding.totalAmount)
                                                                }
                                                            </p>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <p className="text-[10px] text-clay uppercase tracking-wider">累積損益</p>
                                                            <div className="flex items-baseline gap-2 mt-0.5">
                                                                <p className={cn(
                                                                    "text-sm font-bold",
                                                                    totalPnL >= 0 ? "text-rust" : "text-green-600"
                                                                )}>
                                                                    {isUSStock
                                                                        ? `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                                                                        : `${totalPnL >= 0 ? '+' : ''}${FORMAT_TWD.format(totalPnL)}`
                                                                    }
                                                                </p>
                                                                <p className={cn(
                                                                    "text-[10px] font-medium",
                                                                    pnlPercent >= 0 ? "text-rust" : "text-green-600"
                                                                )}>
                                                                    ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ml-4 text-clay/40">
                                                <span className={cn(
                                                    "material-symbols-outlined transition-transform duration-300",
                                                    isExpanded ? "rotate-180" : ""
                                                )}>
                                                    expand_more
                                                </span>
                                            </div>
                                        </button>

                                        {/* 展開詳情：最後 5 筆交易紀錄 */}
                                        <div className={cn(
                                            "grid transition-all duration-300 ease-in-out bg-stoneSoft/5",
                                            isExpanded ? "grid-rows-[1fr] border-t border-stoneSoft/50" : "grid-rows-[0fr]"
                                        )}>
                                            <div className="overflow-hidden">
                                                <div className="p-4 flex flex-col gap-3">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-[10px] font-bold text-clay uppercase tracking-widest">交易紀錄 (最近 5 筆)</p>
                                                        <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmAction({
                                                                title: '刪除持倉',
                                                                message: `確定要刪除 ${holding.name} 的所有紀錄嗎？此動作不可逆。`,
                                                                action: () => removeHolding(holding.id)
                                                            });
                                                        }}>
                                                            全部刪除
                                                        </Button>
                                                    </div>
                                                    {(holding.purchases || []).slice(-5).reverse().map((purchase) => (
                                                        <div key={purchase.id} className="flex flex-col gap-2 p-3 bg-white/50 rounded-xl border border-stoneSoft/30 group relative">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={cn(
                                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                                            purchase.action === 'BUY' ? "bg-rust/10 text-rust" : "bg-green-100 text-green-700"
                                                                        )}>
                                                                            {purchase.action === 'BUY' ? (isSimpleMode ? '投入' : '買入') : (isSimpleMode ? '減少' : '賣出')}
                                                                        </span>
                                                                        <span className="text-[10px] text-clay font-medium">
                                                                            {new Date(purchase.date).toLocaleDateString('zh-TW')}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs font-semibold text-slate-800 mt-1">
                                                                        {purchase.shares.toLocaleString()} 股 @ {isUSStock ? `$${purchase.pricePerShare}` : `$${purchase.pricePerShare}`}
                                                                    </p>
                                                                </div>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleEdit(holding.id, holding.name, purchase)}
                                                                        className="p-1.5 text-clay hover:text-primary transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setConfirmAction({
                                                                            title: '刪除紀錄',
                                                                            message: '確定要刪除這筆交易紀錄嗎？',
                                                                            action: () => removePurchase(holding.id, purchase.id)
                                                                        })}
                                                                        className="p-1.5 text-clay hover:text-rust transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-end border-t border-stoneSoft/20 pt-2 mt-1">
                                                                <p className="text-[10px] text-clay italic truncate max-w-[60%]">
                                                                    {purchase.note || '無備註'}
                                                                </p>
                                                                <p className="text-xs font-bold text-slate-700">
                                                                    {isUSStock ? `$${purchase.totalCostUSD?.toLocaleString()}` : FORMAT_TWD.format(purchase.totalCost)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            {/* 底部間距，防止 FAB 遮擋最後一筆紀錄 */}
            <div className="h-20" />

            {/* 浮動記錄交易按鈕 (FAB) - 僅在進入軍團視圖後顯示 */}
            {activePoolId && (
                <button
                    onClick={() => setIsBuyOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-white/90 shadow-lg shadow-primary/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-xl hover:shadow-primary/30 active:scale-95 z-30"
                    title="記錄交易"
                >
                    <span className="material-symbols-outlined text-2xl">add</span>
                </button>
            )}

            {/* 新增軍團彈窗 (AddPoolModal) */}
            {isAddPoolOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsAddPoolOpen(false)} />
                    <Card className="w-full max-w-sm z-[101] flex flex-col gap-5 animate-in zoom-in-95 duration-200 shadow-2xl">
                        <div className="flex flex-col gap-1">
                            <h3 className="text-xl font-light text-slate-800">新增戰備軍團</h3>
                            <p className="text-xs text-clay">建立獨立入金池，隔離資產損益</p>
                        </div>
                        <div className="flex flex-col gap-4">
                            <Input 
                                label="軍團名稱" 
                                placeholder="例如：防禦大軍" 
                                value={poolName} 
                                onChange={(e) => { setPoolName(e.target.value); setPoolError(''); }}
                                error={poolError && !poolName ? poolError : ''}
                                autoFocus
                            />
                            <Input 
                                label="撥款金額 (TWD)" 
                                placeholder="0"
                                value={poolAmount}
                                onChange={(e) => { 
                                    const val = e.target.value.replace(/,/g, '').replace(/[^\d]/g, '');
                                    setPoolAmount(Number(val).toLocaleString('en-US'));
                                    setPoolError('');
                                }}
                                icon={<span className="font-semibold px-1 text-xs">NT$</span>}
                                error={poolError && poolName ? poolError : ''}
                            />
                        </div>
                        <div className="flex justify-end gap-3 mt-2">
                            <Button variant="ghost" onClick={() => setIsAddPoolOpen(false)}>取消</Button>
                            <Button variant="primary" onClick={handleAddPool}>確認建立</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* 買入 / 編輯表單抽屜 */}
            <BuyStockDrawer poolId={activePoolId || undefined}
                isOpen={isBuyOpen}
                onClose={handleCloseDrawer}
                type={type}
                editingPurchase={editingPurchase}
                editingHoldingId={editingHoldingId}
                editingHoldingName={editingHoldingName}
            />

            {/* 美股資金劃撥抽屜 */}
            {isUSStock && (
                <FundTransferDrawer
                    isOpen={isDepositOpen}
                    onClose={() => { setIsDepositOpen(false); }}
                />
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                confirmText="刪除"
                onConfirm={() => {
                    if (confirmAction) confirmAction.action();
                    setConfirmAction(null);
                }}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    );
};
