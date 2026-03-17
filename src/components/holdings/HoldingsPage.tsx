import { useState, useEffect } from 'react';
import type { StockAssetType, PurchaseRecord } from '../../types';
import { SIMPLE_HOLDING_TYPES } from '../../types';
import { usePortfolioStore } from '../../store/portfolioStore';
import { ASSET_LABELS, ASSET_COLORS, FORMAT_TWD } from '../../utils/constants';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { BuyStockDrawer } from './HoldingFormDrawer';
import { ConfirmModal } from '../ui/ConfirmModal';
import { cn } from '../../utils/cn';
import { CapitalPools } from "../dashboard/CapitalPools";
import { FundTransferDrawer } from './FundTransferDrawer';
import { AddPoolModal } from './AddPoolModal';
import { UnassignedHoldings } from './UnassignedHoldings';
import { HoldingCard } from './HoldingCard';

interface HoldingsPageProps {
    type: StockAssetType;
    onBack: () => void;
}

export const HoldingsPage = ({ type, onBack }: HoldingsPageProps) => {
    const {
        getHoldingsByType, removeHolding, removePurchase,
        usStockFundPool, getAvailableCapital, addPool, pools,
        fetchQuotesForHoldings, updateHoldingPool, getUsStockAvailableCapital, exchangeRateUSD
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
    
    const totalInvestedUSD = isUSStock
        ? filteredHoldings.reduce((sum, h) => sum + (h.totalAmountUSD || 0), 0)
        : 0;

    const usStockAvailable = getUsStockAvailableCapital();

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
                                {FORMAT_TWD.format(filteredHoldings.reduce((sum, h) => sum + h.totalAmount, 0))}
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

                    <UnassignedHoldings 
                        holdings={unassignedHoldings} 
                        pools={pools} 
                        type={type}
                        onUpdatePool={updateHoldingPool}
                        onRemove={(id, name) => setConfirmAction({
                            title: '刪除未歸屬標的',
                            message: `確定要刪除「${name}」的所有紀錄嗎？`,
                            action: () => removeHolding(id)
                        })}
                    />
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
                            {filteredHoldings.map((holding) => (
                                <HoldingCard 
                                    key={holding.id}
                                    holding={holding}
                                    isExpanded={expandedHoldingId === holding.id}
                                    isSimpleMode={isSimpleMode}
                                    isUSStock={isUSStock}
                                    onToggleExpand={(id) => setExpandedHoldingId(prev => prev === id ? null : id)}
                                    onEditPurchase={handleEdit}
                                    onRemovePurchase={(holdingId, purchase) => setConfirmAction({
                                        title: '刪除紀錄',
                                        message: '確定要刪除這筆交易紀錄嗎？',
                                        action: () => removePurchase(holdingId, purchase.id)
                                    })}
                                    onRemoveHolding={(id, name) => setConfirmAction({
                                        title: '刪除持倉',
                                        message: `確定要刪除 ${name} 的所有紀錄嗎？此動作不可逆。`,
                                        action: () => removeHolding(id)
                                    })}
                                />
                            ))}
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

            {isAddPoolOpen && (
                <AddPoolModal 
                  type={type}
                  availableTotal={availableTotal}
                  usStockAvailable={usStockAvailable}
                  exchangeRateUSD={exchangeRateUSD}
                  onClose={() => setIsAddPoolOpen(false)}
                  onSubmit={(name, amount) => {
                    addPool(name, type, amount);
                    setIsAddPoolOpen(false);
                  }}
                />
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

            {/* 資金劃撥抽屜 */}
            <FundTransferDrawer 
                isOpen={isDepositOpen}
                onClose={() => setIsDepositOpen(false)}
            />

            {/* 確認彈窗 */}
            {confirmAction && (
                <ConfirmModal
                    isOpen={!!confirmAction}
                    onCancel={() => setConfirmAction(null)}
                    onConfirm={() => {
                        confirmAction.action();
                        setConfirmAction(null);
                    }}
                    title={confirmAction.title}
                    message={confirmAction.message}
                />
            )}
        </div>
    );
};
