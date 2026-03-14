import React, { useState } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { Card } from '../ui/Card';
import { AllocationChart } from './AllocationChart';
import { FORMAT_TWD, CUSTOM_CATEGORY_COLORS } from '../../utils/constants';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { StockAssetType, CustomCategory } from '../../types';
import { TransactionHistory } from '../history/TransactionHistory';
import { HoldingsPage } from '../holdings/HoldingsPage';
import { ConfirmModal } from '../ui/ConfirmModal';
import { cn } from '../../utils/cn';

// ═══ 自訂欄位新增/編輯 Drawer ═══
interface CustomCategoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    editingCategory?: CustomCategory;
}

const CustomCategoryDrawer = ({ isOpen, onClose, editingCategory }: CustomCategoryDrawerProps) => {
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


export const Dashboard = () => {
    const {
        holdings, exchangeRateUSD,
        totalCapitalPool, resetAll, customCategories, removeCustomCategory,
        capitalDeposits, addCapitalDeposit, removeCapitalDeposit,
        fetchQuotesForHoldings, isLoadingQuotes
    } = usePortfolioStore();
    const getAvailableCapital = usePortfolioStore((state) => state.getAvailableCapital);

    React.useEffect(() => {
        // Fetch real-time quotes when the dashboard loads
        fetchQuotesForHoldings();
    }, [fetchQuotesForHoldings]);

    const [activeHoldingsType, setActiveHoldingsType] = useState<StockAssetType | null>(null);

    // 自訂欄位 Drawer 狀態
    const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CustomCategory | undefined>(undefined);

    // 入金 Drawer 狀態
    const [isDepositDrawerOpen, setIsDepositDrawerOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositNote, setDepositNote] = useState('');
    const [depositError, setDepositError] = useState('');
    const [showDepositHistory, setShowDepositHistory] = useState(false);

    // ConfirmModal 狀態
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        action: () => void;
    } | null>(null);

    const availableCapital = getAvailableCapital();
    const invested = totalCapitalPool - availableCapital;
    const investedPercentage = totalCapitalPool > 0 ? (invested / totalCapitalPool) * 100 : 0;

    const totalUnrealizedPnL = holdings.reduce((sum, h) => {
        const pnl = h.unrealizedPnL || 0;
        return sum + (h.type === 'US_STOCK' ? pnl * exchangeRateUSD : pnl);
    }, 0);

    const totalRealizedPnL = holdings.reduce((sum, h) => {
        const pnl = h.realizedPnL || 0;
        return sum + (h.type === 'US_STOCK' ? pnl * exchangeRateUSD : pnl);
    }, 0);

    // ═══ 入金相關 ═══
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
        addCapitalDeposit({ amount: numAmount, note: depositNote || '入金' });
        setIsDepositDrawerOpen(false);
        setDepositAmount('');
        setDepositNote('');
        setDepositError('');
    };

    const openDepositDrawer = () => {
        setDepositAmount('');
        setDepositNote('');
        setDepositError('');
        setIsDepositDrawerOpen(true);
    };

    // ═══ 自訂欄位相關 ═══
    const handleEditCategory = (category: CustomCategory) => {
        setEditingCategory(category);
        setIsCategoryDrawerOpen(true);
    };

    const handleCloseCategoryDrawer = () => {
        setIsCategoryDrawerOpen(false);
        setEditingCategory(undefined);
    };

    // 如果正在查看台股/美股持倉頁面，渲染 HoldingsPage
    if (activeHoldingsType) {
        return (
            <HoldingsPage
                type={activeHoldingsType}
                onBack={() => setActiveHoldingsType(null)}
            />
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* ═══ 總覽卡片 ═══ */}
            <Card className="flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

                <div className="flex justify-between items-start z-10">
                    <div>
                        <h2 className="text-clay text-sm font-medium tracking-wide">總閒置資金 (TWD)</h2>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-3xl font-light tracking-tight text-slate-800">
                                {FORMAT_TWD.format(availableCapital)}
                            </span>
                        </div>
                        <p className="text-xs text-clay mt-1">
                            總資產: {FORMAT_TWD.format(totalCapitalPool)}
                        </p>
                        <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-semibold tracking-wider text-clay flex items-center gap-1">
                                    未實現損益
                                    {isLoadingQuotes && <span className="material-symbols-outlined text-[10px] animate-spin">sync</span>}
                                </span>
                                <span className={cn(
                                    "text-sm font-semibold",
                                    totalUnrealizedPnL > 0 ? "text-rust" : totalUnrealizedPnL < 0 ? "text-moss" : "text-clay"
                                )}>
                                    {totalUnrealizedPnL > 0 ? '+' : ''}{FORMAT_TWD.format(totalUnrealizedPnL)}
                                </span>
                            </div>
                            {totalRealizedPnL !== 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-semibold tracking-wider text-clay flex items-center gap-1">
                                        已實現損益
                                    </span>
                                    <span className={cn(
                                        "text-sm font-semibold",
                                        totalRealizedPnL > 0 ? "text-rust" : totalRealizedPnL < 0 ? "text-moss" : "text-clay"
                                    )}>
                                        {totalRealizedPnL > 0 ? '+' : ''}{FORMAT_TWD.format(totalRealizedPnL)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="secondary" size="sm" onClick={openDepositDrawer} className="text-xs">
                            <span className="material-symbols-outlined text-base mr-1">add</span>
                            入金
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmAction({
                            title: '重設所有資料',
                            message: '確定要重設所有資料嗎？此操作無法復原。',
                            action: resetAll
                        })} className="text-xs opacity-50 hover:opacity-100">
                            重設
                        </Button>
                    </div>
                </div>

                {/* 資金水位進度條 */}
                <div className="mt-2 space-y-1.5 z-10">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-clay">已投入 {investedPercentage.toFixed(1)}%</span>
                        <span className="text-clay">剩餘 {(100 - investedPercentage).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-stoneSoft rounded-full overflow-hidden flex">
                        <div
                            className="h-full bg-gradient-to-r from-moss/60 to-moss transition-all duration-1000 ease-out rounded-full"
                            style={{ width: `${investedPercentage}%` }}
                        />
                    </div>
                </div>

                {/* 入金紀錄 (可收合) */}
                {capitalDeposits.length > 0 && (
                    <div className="z-10">
                        <button
                            onClick={() => setShowDepositHistory(!showDepositHistory)}
                            className="text-[10px] text-clay uppercase tracking-wider font-medium flex items-center gap-1 hover:text-slate-800 transition-colors"
                        >
                            入金紀錄 ({capitalDeposits.length} 筆)
                            <span className="material-symbols-outlined text-sm">
                                {showDepositHistory ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {showDepositHistory && (
                            <div className="mt-2 flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                                {capitalDeposits.map((dep) => {
                                    const dateStr = new Date(dep.date).toLocaleDateString('zh-TW', {
                                        month: 'short', day: 'numeric',
                                    });
                                    return (
                                        <div key={dep.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-stoneSoft/20 transition-colors group/dep">
                                            <div className="flex items-center gap-3 text-xs">
                                                <span className="text-clay">{dateStr}</span>
                                                <span className="text-moss font-medium">+{FORMAT_TWD.format(dep.amount)}</span>
                                                {dep.note && <span className="text-clay/60 bg-stoneSoft/30 px-1.5 py-0.5 rounded text-[10px]">{dep.note}</span>}
                                            </div>
                                            <button
                                                onClick={() => setConfirmAction({
                                                    title: '刪除入金紀錄',
                                                    message: '確定要刪除這筆入金紀錄嗎？總資產將相應減少。',
                                                    action: () => removeCapitalDeposit(dep.id)
                                                })}
                                                className="p-1 rounded text-clay/30 hover:text-rust hover:bg-rust/10 transition-all opacity-0 group-hover/dep:opacity-100"
                                                title="刪除"
                                            >
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {/* 資產圓餅圖與操作區 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="flex flex-col items-center justify-center p-6">
                    <h3 className="w-full text-left text-sm font-medium text-clay tracking-wide uppercase mb-2">資產配置比例</h3>
                    <AllocationChart />
                </Card>

                {/* 操作按鈕區 */}
                <div className="flex flex-col gap-3 justify-center h-full">
                    <button
                        onClick={() => setActiveHoldingsType('TAIWAN_STOCK')}
                        className="glass-panel card-hover flex items-center justify-between p-4 sm:p-5 text-slate-800 group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-moss/15 text-moss flex items-center justify-center group-hover:scale-110 group-hover:bg-moss/20 transition-all">
                                <span className="material-symbols-outlined text-xl">ssid_chart</span>
                            </div>
                            <span className="text-sm font-medium tracking-wide">台股</span>
                        </div>
                        <span className="material-symbols-outlined text-clay group-hover:text-slate-800 transition-colors">chevron_right</span>
                    </button>
                    <button
                        onClick={() => setActiveHoldingsType('US_STOCK')}
                        className="glass-panel card-hover flex items-center justify-between p-4 sm:p-5 text-slate-800 group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-rust/15 text-rust flex items-center justify-center group-hover:scale-110 group-hover:bg-rust/20 transition-all">
                                <span className="material-symbols-outlined text-xl">public</span>
                            </div>
                            <span className="text-sm font-medium tracking-wide">美股</span>
                        </div>
                        <span className="material-symbols-outlined text-clay group-hover:text-slate-800 transition-colors">chevron_right</span>
                    </button>
                    <button
                        onClick={() => setActiveHoldingsType('FUNDS')}
                        className="glass-panel card-hover flex items-center justify-between p-4 sm:p-5 text-slate-800 group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-clay/15 text-clayDark flex items-center justify-center group-hover:scale-110 group-hover:bg-clay/25 transition-all">
                                <span className="material-symbols-outlined text-xl">pie_chart</span>
                            </div>
                            <span className="text-sm font-medium tracking-wide">基金</span>
                        </div>
                        <span className="material-symbols-outlined text-clay group-hover:text-slate-800 transition-colors">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* ═══ 自訂欄位區域 ═══ */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-clay tracking-wide uppercase">自訂欄位</h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingCategory(undefined); setIsCategoryDrawerOpen(true); }}
                        className="text-xs"
                    >
                        <span className="material-symbols-outlined text-base mr-1">add</span>
                        新增
                    </Button>
                </div>

                {customCategories.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-8 text-center bg-white/20 border-dashed border-stoneSoft">
                        <p className="text-clay text-sm mb-1">尚無自訂欄位</p>
                        <p className="text-clay/60 text-xs">可自行新增如「緊急預備金」、「保險」等項目</p>
                    </Card>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {customCategories.map((cat, idx) => {
                            const dotColor = CUSTOM_CATEGORY_COLORS[idx % CUSTOM_CATEGORY_COLORS.length];
                            return (
                                <Card key={cat.id} noPadding className="p-3.5 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{ backgroundColor: dotColor }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-slate-800 text-sm truncate">{cat.name}</h4>
                                                    {cat.note && (
                                                        <span className="text-[10px] text-clay bg-stoneSoft/40 px-1.5 py-0.5 rounded shrink-0 truncate max-w-[120px]">
                                                            {cat.note}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-textPrimary mt-0.5">
                                                    {FORMAT_TWD.format(cat.amount)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                                            <button
                                                onClick={() => handleEditCategory(cat)}
                                                className="p-1.5 rounded-lg text-clay/40 hover:text-primary hover:bg-primary/10 transition-all"
                                                title="編輯"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button
                                                onClick={() => setConfirmAction({
                                                    title: '刪除自訂欄位',
                                                    message: `確定要刪除「${cat.name}」嗎？`,
                                                    action: () => removeCustomCategory(cat.id)
                                                })}
                                                className="p-1.5 rounded-lg text-clay/40 hover:text-rust hover:bg-rust/10 transition-all"
                                                title="刪除"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 歷史紀錄模塊 */}
            <TransactionHistory />


            {/* 自訂欄位新增/編輯 Drawer */}
            <CustomCategoryDrawer
                isOpen={isCategoryDrawerOpen}
                onClose={handleCloseCategoryDrawer}
                editingCategory={editingCategory}
            />

            {/* ═══ 入金 Drawer ═══ */}
            {isDepositDrawerOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 opacity-100"
                        onClick={() => setIsDepositDrawerOpen(false)}
                    />
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-stoneSoft rounded-t-3xl p-6 shadow-2xl max-w-md mx-auto translate-y-0 transition-transform duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-light text-slate-800">總資產入金</h3>
                            <button onClick={() => setIsDepositDrawerOpen(false)} className="p-2 -mr-2 text-clay hover:text-slate-800 transition-colors">
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
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                confirmText="確定"
                onConfirm={() => {
                    if (confirmAction) confirmAction.action();
                    setConfirmAction(null);
                }}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    );
};
