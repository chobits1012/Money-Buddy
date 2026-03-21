import { useState, useEffect } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import type { StockAssetType, CustomCategory } from '../../types';
import { TransactionHistory } from '../history/TransactionHistory';
import { HoldingsPage } from '../holdings/HoldingsPage';
import { ConfirmModal } from '../ui/ConfirmModal';
import { CustomCategoryDrawer } from './CustomCategoryDrawer';
import { CapitalOverview } from './CapitalOverview';
// import { DepositDrawer } from './DepositDrawer'; // DepositDrawer 已移至 App.tsx
import { AssetAllocationSection } from './AssetAllocationSection';
import { CustomCategorySection } from './CustomCategorySection';
import { Button } from '../ui/Button';
import { calculateFundingMetrics } from '../../utils/dashboardMetrics';

interface DashboardProps {
    onOpenDeposit: () => void; // 從 App.tsx 接收
    onOpenWithdrawal: () => void; // 從 App.tsx 接收
}

export const Dashboard = ({ onOpenDeposit, onOpenWithdrawal }: DashboardProps) => {
    const {
        masterTwdTotal,
        holdings, exchangeRateUSD,
        totalCapitalPool, pools, usStockFundPool, usdAccountCash, resetAll, customCategories, removeCustomCategory,
        capitalDeposits, capitalWithdrawals, removeCapitalDeposit, // addCapitalDeposit 已移至 App.tsx
        fetchQuotesForHoldings, isLoadingQuotes, restoreFromSnapshot
    } = usePortfolioStore();

    // 檢查是否有可還原的快照
    const [hasSnapshot, setHasSnapshot] = useState(false);
    
    useEffect(() => {
        const snapshot = localStorage.getItem('portfolio-tracker-snapshot');
        setHasSnapshot(!!snapshot);
    }, []);

    const handleRestore = () => {
        if (restoreFromSnapshot()) {
            setHasSnapshot(false);
        }
    };

    useEffect(() => {
        // Fetch real-time quotes when the dashboard loads
        fetchQuotesForHoldings();
    }, [fetchQuotesForHoldings]);

    const [activeHoldingsType, setActiveHoldingsType] = useState<StockAssetType | null>(null);

    // 自訂欄位 Drawer 狀態
    const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CustomCategory | undefined>(undefined);

    // 入金 Drawer 狀態 (已移至 App.tsx 管理)
    // const [isDepositDrawerOpen, setIsDepositDrawerOpen] = useState(false);

    // ConfirmModal 狀態
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        action: () => void;
        requireText?: string;
    } | null>(null);

    const handleResetClick = () => {
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
        setConfirmAction({
            title: '重設所有資料',
            message: '確定要重設所有資料嗎？此操作無法復原。\n(我們會為您保留一份本地快照以防萬一)',
            requireText: randomCode,
            action: () => {
                resetAll();
                setHasSnapshot(true);
            }
        });
    };

    const { idleCapital, masterCapitalTotal } = calculateFundingMetrics({
        masterTwdTotal,
        capitalDeposits,
        capitalWithdrawals,
        totalCapitalPool,
        pools,
        usdAccountCash,
        usStockFundPool,
        exchangeRateUSD,
        holdings,
        customCategories,
    });
    
    // 全體 + 分市場損益（統一換算成 TWD 後給 Dashboard）
    let totalUnrealizedPnL = 0;
    let totalRealizedPnL = 0;
    let taiwanUnrealizedPnL = 0;
    let usUnrealizedPnLUSD = 0;

    holdings.forEach((h) => {
        const u = h.unrealizedPnL || 0;
        const r = h.realizedPnL || 0;

        if (h.type === 'US_STOCK') {
            usUnrealizedPnLUSD += u;
            totalUnrealizedPnL += u * exchangeRateUSD;
            totalRealizedPnL += r * exchangeRateUSD;
        } else if (h.type === 'TAIWAN_STOCK') {
            taiwanUnrealizedPnL += u;
            totalUnrealizedPnL += u;
            totalRealizedPnL += r;
        } else {
            totalUnrealizedPnL += u;
            totalRealizedPnL += r;
        }
    });

    const handleEditCategory = (category: CustomCategory) => {
        setEditingCategory(category);
        setIsCategoryDrawerOpen(true);
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
            {/* ═══ 還原橫幅 (如果有快照) ═══ */}
            {hasSnapshot && (
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                            <span className="material-symbols-outlined">history</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">偵測到本地快照資料</p>
                            <p className="text-xs text-clay">如果您剛才是不小心重設，可以點此還原。</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={handleRestore} className="text-xs">
                            現在還原
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                            localStorage.removeItem('portfolio-tracker-snapshot');
                            setHasSnapshot(false);
                        }} className="text-xs">
                            忽略
                        </Button>
                    </div>
                </div>
            )}

            {/* ═══ 總覽卡片 ═══ */}
            <CapitalOverview 
                availableCapital={idleCapital}
                totalCapitalPool={masterCapitalTotal}
                totalUnrealizedPnL={totalUnrealizedPnL}
                totalRealizedPnL={totalRealizedPnL}
                taiwanUnrealizedPnL={taiwanUnrealizedPnL}
                usUnrealizedPnLUSD={usUnrealizedPnLUSD}
                exchangeRateUSD={exchangeRateUSD}
                isLoadingQuotes={isLoadingQuotes}
                capitalDeposits={capitalDeposits}
                onOpenDeposit={onOpenDeposit} // 傳遞從 App.tsx 接收的 prop
                onOpenWithdrawal={onOpenWithdrawal} // 傳遞從 App.tsx 接收的 prop
                onReset={handleResetClick}
                onRemoveDeposit={removeCapitalDeposit}
            />

            {/* 資產圓餅圖與操作區 */}
            <AssetAllocationSection onSelectType={setActiveHoldingsType} />

            {/* ═══ 自訂欄位區域 ═══ */}
            <CustomCategorySection 
                categories={customCategories}
                onAdd={() => { setEditingCategory(undefined); setIsCategoryDrawerOpen(true); }}
                onEdit={handleEditCategory}
                onRemove={(cat) => setConfirmAction({
                    title: '刪除自訂欄位',
                    message: `確定要刪除「${cat.name}」嗎？`,
                    action: () => removeCustomCategory(cat.id)
                })}
            />

            {/* 歷史紀錄模塊 */}
            <TransactionHistory />

            {/* 自訂欄位新增/編輯 Drawer */}
            <CustomCategoryDrawer
                isOpen={isCategoryDrawerOpen}
                onClose={() => { setIsCategoryDrawerOpen(false); setEditingCategory(undefined); }}
                editingCategory={editingCategory}
            />

            {/* ═══ 入金 Drawer ═══ (已移至 App.tsx 管理) */}
            {/* <DepositDrawer 
                isOpen={isDepositDrawerOpen}
                onClose={() => setIsDepositDrawerOpen(false)}
                onSubmit={(amount, note) => addCapitalDeposit({ amount, note })}
            /> */}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                requireText={confirmAction?.requireText}
                confirmText="確定重設"
                onConfirm={() => {
                    if (confirmAction) confirmAction.action();
                    setConfirmAction(null);
                }}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    );
};
