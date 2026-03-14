import { useState } from 'react';
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

interface HoldingsPageProps {
    type: StockAssetType;
    onBack: () => void;
}

// ═══ 美股帳戶入金 Drawer ═══
const FundDepositDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { setUsStockFundPool, usStockFundPool, getAvailableCapital } = usePortfolioStore();
    const availableCapital = getAvailableCapital();

    const [amount, setAmount] = useState('');
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
        if (numAmount > availableCapital) {
            setError(`金額不可大於目前總資產剩餘可動用資金 (NT$ ${availableCapital.toLocaleString()})`);
            return;
        }
        setUsStockFundPool(usStockFundPool + numAmount);
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
                        <h3 className="text-xl font-light text-slate-800">入金</h3>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-clay hover:text-slate-800 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="p-3 rounded-xl bg-stoneSoft/20 border border-stoneSoft">
                        <p className="text-xs text-clay mb-1">目前總資產可用資金</p>
                        <p className="text-lg font-light text-slate-800">{FORMAT_TWD.format(availableCapital)}</p>
                    </div>

                    <Input
                        label="入金金額 (TWD)"
                        placeholder="例如: 100,000"
                        value={amount}
                        onChange={handleAmountChange}
                        icon={<span className="font-semibold px-2 text-xs">NT$</span>}
                        autoFocus
                    />

                    {error && (
                        <div className="p-3 bg-rust/10 border border-rust/20 rounded-xl text-rust text-sm">
                            {error}
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


export const HoldingsPage = ({ type, onBack }: HoldingsPageProps) => {
    const {
        getHoldingsByType, getHoldingsTotalByType, removeHolding, removePurchase,
        usStockFundPool, getUsStockAvailableCapital,
    } = usePortfolioStore();

    const [isBuyOpen, setIsBuyOpen] = useState(false);
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [expandedHoldingId, setExpandedHoldingId] = useState<string | null>(null);

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

    const holdings = getHoldingsByType(type);
    const totalInvested = getHoldingsTotalByType(type);
    const isUSStock = type === 'US_STOCK';
    const isSimpleMode = SIMPLE_HOLDING_TYPES.includes(type);

    const usStockAvailable = isUSStock ? getUsStockAvailableCapital() : 0;

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
                                <p className="text-clay text-xs font-medium tracking-wide uppercase">美股帳戶資金</p>
                                <p className="text-2xl font-light text-slate-800 mt-0.5">
                                    {FORMAT_TWD.format(usStockFundPool)}
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setIsDepositOpen(true)}
                                className="shrink-0"
                            >
                                <span className="material-symbols-outlined text-base mr-1">add</span>
                                入金
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-2.5 rounded-lg bg-stoneSoft/20">
                                <p className="text-[10px] text-clay uppercase tracking-wider">已投入標的</p>
                                <p className="text-sm font-medium text-textPrimary mt-0.5">
                                    {FORMAT_TWD.format(totalInvested)}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-moss/8">
                                <p className="text-[10px] text-clay uppercase tracking-wider">帳戶可用餘額</p>
                                <p className="text-sm font-medium text-moss mt-0.5">
                                    {FORMAT_TWD.format(usStockAvailable)}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* 投入總額摘要 (台股用，或美股的持倉總額) */}
            {!isUSStock && (
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
                            <span className="text-sm font-medium">{holdings.length} 檔</span>
                        </div>
                    </div>
                </Card>
            )}

            {/* 持倉清單 */}
            {holdings.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-10 text-center bg-white/20 border-dashed border-stoneSoft">
                    <div className="w-12 h-12 bg-stoneSoft/30 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-clay text-2xl">add</span>
                    </div>
                    <p className="text-clay text-sm mb-1">尚無持倉紀錄</p>
                    <p className="text-clay/60 text-xs">點擊下方按鈕記錄第一筆買入</p>
                </Card>
            ) : (
                <div className="flex flex-col gap-3">
                    {holdings.map((holding) => {
                        const isExpanded = expandedHoldingId === holding.id;

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
                                                {holding.purchases.length} 筆{isSimpleMode ? '投入' : '買入'}
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
                                            /* ═══ 股數模式 (台股/美股)：股數 + 均價 + 總額 ═══ */
                                            <div className="grid grid-cols-3 gap-3">
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
                                                    <p className="text-[10px] text-clay uppercase tracking-wider">總額</p>
                                                    <p className="text-sm font-bold text-slate-800 mt-0.5">
                                                        {FORMAT_TWD.format(holding.totalAmount)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-3 shrink-0 text-clay">
                                        <span className="material-symbols-outlined text-xl">
                                            {isExpanded ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </div>
                                </button>

                                {/* 展開區：購買紀錄明細 */}
                                {isExpanded && (
                                    <div className="border-t border-stoneSoft/60 bg-stoneSoft/10">
                                        <div className="px-4 py-2 flex justify-between items-center">
                                            <p className="text-[10px] text-clay uppercase tracking-wider font-medium">{isSimpleMode ? '投入紀錄' : '購買紀錄'}</p>
                                            <button
                                                onClick={() => setConfirmAction({
                                                    title: '刪除標的',
                                                    message: `確定要刪除「${holding.name}」所有資料嗎？此動作無法復原。`,
                                                    action: () => removeHolding(holding.id)
                                                })}
                                                className="text-[10px] text-rust/60 hover:text-rust transition-colors px-2 py-1 rounded"
                                            >
                                                刪除此標的
                                            </button>
                                        </div>

                                        {holding.purchases.map((purchase, idx) => {
                                            const dateStr = new Date(purchase.date).toLocaleDateString('zh-TW', {
                                                month: 'short', day: 'numeric',
                                            });

                                            return (
                                                <div
                                                    key={purchase.id}
                                                    className={cn(
                                                        "px-4 py-3 flex items-center justify-between hover:bg-stoneSoft/20 transition-colors",
                                                        idx < holding.purchases.length - 1 && "border-b border-stoneSoft/30"
                                                    )}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-clay">{dateStr}</span>
                                                            {purchase.note && (
                                                                <span className="text-clay/60 bg-stoneSoft/30 px-1.5 py-0.5 rounded text-[10px]">
                                                                    {purchase.note}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isSimpleMode ? (
                                                            /* ═══ 簡易模式：只顯示金額 ═══ */
                                                            <div className="mt-1 text-sm">
                                                                <span className="text-moss font-medium">
                                                                    {FORMAT_TWD.format(purchase.totalCost)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            /* ═══ 股數模式：股數 + 價格 + 總額 ═══ */
                                                            <div className="flex items-center gap-4 mt-1 text-sm">
                                                                <span className="text-textPrimary">
                                                                    {purchase.shares.toLocaleString('en-US')} 股
                                                                </span>
                                                                <span className="text-clay">
                                                                    @{isUSStock
                                                                        ? `$${purchase.pricePerShare.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                                                        : `$${purchase.pricePerShare.toLocaleString('en-US')}`
                                                                    }
                                                                </span>
                                                                <span className="text-moss font-medium">
                                                                    {isUSStock && purchase.totalCostUSD
                                                                        ? `$${purchase.totalCostUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                                                        : FORMAT_TWD.format(purchase.totalCost)
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {/* 編輯按鈕 */}
                                                        <button
                                                            onClick={() => handleEdit(holding.id, holding.name, purchase)}
                                                            className="p-2 rounded-lg text-clay/40 hover:text-primary hover:bg-primary/10 transition-all"
                                                            title="編輯此筆買入"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">edit</span>
                                                        </button>
                                                        {/* 刪除按鈕 */}
                                                        <button
                                                            onClick={() => setConfirmAction({
                                                                title: '刪除紀錄',
                                                                message: '確定要刪除這筆買入紀錄嗎？',
                                                                action: () => removePurchase(holding.id, purchase.id)
                                                            })}
                                                            className="p-2 rounded-lg text-clay/40 hover:text-rust hover:bg-rust/10 transition-all"
                                                            title="刪除此筆買入"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* 新增按鈕 */}
            <Button
                onClick={() => setIsBuyOpen(true)}
                className="w-full group"
                size="lg"
            >
                <span className="material-symbols-outlined text-xl mr-2 transition-transform group-hover:rotate-90">add</span>
                {isSimpleMode ? '記錄投入' : '記錄買入'}
            </Button>

            {/* 買入 / 編輯表單抽屜 */}
            <BuyStockDrawer
                isOpen={isBuyOpen}
                onClose={handleCloseDrawer}
                type={type}
                editingPurchase={editingPurchase}
                editingHoldingId={editingHoldingId}
                editingHoldingName={editingHoldingName}
            />

            {/* 美股入金抽屜 */}
            {isUSStock && (
                <FundDepositDrawer
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
