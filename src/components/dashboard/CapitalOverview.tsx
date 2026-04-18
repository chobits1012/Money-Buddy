import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ConfirmModal } from '../ui/ConfirmModal';
import { FORMAT_TWD } from '../../utils/constants';
import { cn } from '../../utils/cn';
import type { CapitalDeposit } from '../../types';

type ActionBarVariant = 'segmented' | 'cards' | 'minimal';

interface CapitalOverviewProps {
    availableCapital: number;
    totalCapitalPool: number;
    totalUnrealizedPnL: number;
    totalRealizedPnL: number;
    taiwanUnrealizedPnL: number;
    usUnrealizedPnLUSD: number;
    exchangeRateUSD: number;
    isLoadingQuotes: boolean;
    capitalDeposits: CapitalDeposit[];
    onOpenDeposit: () => void;
    onOpenWithdrawal: () => void;
    onReset: () => void;
    onRemoveDeposit: (id: string) => void;
}

export const CapitalOverview = ({
    availableCapital,
    totalCapitalPool,
    totalUnrealizedPnL,
    totalRealizedPnL,
    taiwanUnrealizedPnL,
    usUnrealizedPnLUSD,
    exchangeRateUSD,
    isLoadingQuotes,
    capitalDeposits,
    onOpenDeposit,
    onOpenWithdrawal,
    onReset,
    onRemoveDeposit
}: CapitalOverviewProps) => {
    const [showDepositHistory, setShowDepositHistory] = useState(false);
    const [showMarketPnL, setShowMarketPnL] = useState(false);
    const [showFundingHint, setShowFundingHint] = useState(false);
    const [pendingDeleteDepositId, setPendingDeleteDepositId] = useState<string | null>(null);
    // Default to "B" (cards style). This avoids the A/B/C preview controls
    // pushing the action buttons outside the card width.
    const actionBarVariant: ActionBarVariant = 'cards';
    
    const invested = totalCapitalPool - availableCapital;
    const investedPercentage = totalCapitalPool > 0 ? (invested / totalCapitalPool) * 100 : 0;
    const actionButtonBase = 'whitespace-nowrap';

    const renderActionBar = () => {
        if (actionBarVariant === 'cards') {
            // 使用原生 <button>，避免共用 Button 元件的 h-9 / px-4 與 twMerge 搶權重，導致畫面「看起來沒變」
            const cardBtn =
                'inline-flex h-7 min-h-[28px] max-h-7 items-center justify-center px-2 py-0 gap-1 rounded-lg text-[10px] leading-none font-medium shadow-none border box-border overflow-hidden transition-colors duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25';

            return (
                <div className="flex items-center justify-end gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={onOpenDeposit}
                        className={cn(
                            cardBtn,
                            'bg-moss/10 hover:bg-moss/18 text-slate-700 border-moss/25',
                            actionButtonBase
                        )}
                    >
                        <span className="material-symbols-outlined text-[14px] leading-none shrink-0">add_circle</span>
                        入金
                    </button>
                    <button
                        type="button"
                        onClick={onOpenWithdrawal}
                        className={cn(
                            cardBtn,
                            'bg-rust/8 hover:bg-rust/15 text-slate-700 hover:text-rust border-rust/25',
                            actionButtonBase
                        )}
                    >
                        <span className="material-symbols-outlined text-[14px] leading-none shrink-0">remove_circle</span>
                        提領
                    </button>
                    <button
                        type="button"
                        onClick={onReset}
                        className={cn(
                            cardBtn,
                            'bg-stoneSoft/30 hover:bg-stoneSoft/45 text-clayDark border-stoneSoft/70',
                            actionButtonBase
                        )}
                    >
                        <span className="material-symbols-outlined text-[14px] leading-none shrink-0">restart_alt</span>
                        重設
                    </button>
                </div>
            );
        }

        if (actionBarVariant === 'minimal') {
            return (
                <div className="flex items-center gap-2 bg-white/30 border border-stoneSoft/70 rounded-full px-2 py-1.5 shadow-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onOpenDeposit}
                        className={cn('h-8 px-3 rounded-full text-slate-700 hover:text-slate-900 hover:bg-moss/15', actionButtonBase)}
                    >
                        <span className="material-symbols-outlined text-[18px] mr-1">add</span>
                        入金
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onOpenWithdrawal}
                        className={cn('h-8 px-3 rounded-full text-clayDark hover:text-rust hover:bg-rust/10', actionButtonBase)}
                    >
                        <span className="material-symbols-outlined text-[18px] mr-1">remove</span>
                        提領
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        className={cn('h-8 px-3 rounded-full text-clay hover:text-slate-700 hover:bg-stoneSoft/35', actionButtonBase)}
                    >
                        <span className="material-symbols-outlined text-[18px] mr-1">refresh</span>
                        重設
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex items-center rounded-2xl border border-stoneSoft/80 bg-white/35 backdrop-blur-sm p-1 shadow-sm">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenDeposit}
                    className={cn('h-9 px-3 rounded-xl bg-primary/10 text-slate-700 hover:bg-primary/20 hover:text-slate-900', actionButtonBase)}
                >
                    <span className="material-symbols-outlined text-base mr-1">add</span>
                    入金
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onOpenWithdrawal}
                    className={cn('h-9 px-3 rounded-xl text-clayDark hover:text-rust hover:bg-rust/8', actionButtonBase)}
                >
                    <span className="material-symbols-outlined text-base mr-1">remove</span>
                    提領
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className={cn('h-9 px-3 rounded-xl text-clay hover:text-slate-700 hover:bg-stoneSoft/35', actionButtonBase)}
                >
                    <span className="material-symbols-outlined text-base mr-1">restart_alt</span>
                    重設
                </Button>
            </div>
        );
    };

    return (
        <Card className="flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

            <div className="flex justify-between items-start gap-3 sm:gap-4 z-10">
                {/* 勿加 flex-1：否則內層 justify-between 會把損益數字推到「按鈕左側」整段寬的最右邊 */}
                <div className="min-w-0 pr-2">
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
                        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-clay shrink-0 flex items-center gap-1">
                                未實現損益
                                {isLoadingQuotes && <span className="material-symbols-outlined text-[10px] animate-spin">sync</span>}
                            </span>
                            <span className={cn(
                                "text-sm font-semibold shrink-0 tabular-nums",
                                totalUnrealizedPnL > 0 ? "text-rust" : totalUnrealizedPnL < 0 ? "text-moss" : "text-clay"
                            )}>
                                {totalUnrealizedPnL > 0 ? '+' : ''}{FORMAT_TWD.format(totalUnrealizedPnL)}
                            </span>
                        </div>
                        {totalRealizedPnL !== 0 && (
                            <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
                                <span className="text-[10px] uppercase font-semibold tracking-wider text-clay shrink-0">
                                    已實現損益
                                </span>
                                <span className={cn(
                                    "text-sm font-semibold tabular-nums",
                                    totalRealizedPnL > 0 ? "text-rust" : totalRealizedPnL < 0 ? "text-moss" : "text-clay"
                                )}>
                                    {totalRealizedPnL > 0 ? '+' : ''}{FORMAT_TWD.format(totalRealizedPnL)}
                                </span>
                            </div>
                        )}
                        {/* 分市場未實現損益：可收合 */}
                        {(taiwanUnrealizedPnL !== 0 || usUnrealizedPnLUSD !== 0) && (
                            <div className="mt-1">
                                <button
                                    onClick={() => setShowMarketPnL(!showMarketPnL)}
                                    className="text-[10px] text-clay uppercase tracking-wider font-medium flex items-center gap-1 hover:text-slate-800 transition-colors"
                                >
                                    分市場損益
                                    <span className="material-symbols-outlined text-sm">
                                        {showMarketPnL ? 'expand_less' : 'expand_more'}
                                    </span>
                                </button>
                                {showMarketPnL && (
                                    <div className="mt-1.5 space-y-1.5 pl-1">
                                        {taiwanUnrealizedPnL !== 0 && (
                                            <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                                                <span className="text-clay shrink-0">台股未實現</span>
                                                <span className={cn(
                                                    "font-semibold tabular-nums",
                                                    taiwanUnrealizedPnL > 0 ? "text-rust" : taiwanUnrealizedPnL < 0 ? "text-moss" : "text-clay"
                                                )}>
                                                    {taiwanUnrealizedPnL > 0 ? '+' : ''}{FORMAT_TWD.format(taiwanUnrealizedPnL)}
                                                </span>
                                            </div>
                                        )}
                                        {usUnrealizedPnLUSD !== 0 && (
                                            <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                                                <span className="text-clay shrink-0">美股未實現</span>
                                                <div className="flex flex-col gap-0.5 tabular-nums">
                                                    <span className={cn(
                                                        "font-semibold leading-none block",
                                                        usUnrealizedPnLUSD > 0 ? "text-rust" : usUnrealizedPnLUSD < 0 ? "text-moss" : "text-clay"
                                                    )}>
                                                        {usUnrealizedPnLUSD * exchangeRateUSD > 0 ? '+' : ''}
                                                        {FORMAT_TWD.format(Math.round(usUnrealizedPnLUSD * exchangeRateUSD))}
                                                    </span>
                                                    <span className="text-[10px] text-clay/70 block leading-none">
                                                        {usUnrealizedPnLUSD > 0 ? '+' : ''}
                                                        {usUnrealizedPnLUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-start justify-end shrink-0 self-start min-w-0 -mr-2 sm:-mr-3">
                    {renderActionBar()}
                </div>
            </div>

            {/* 資金水位進度條 */}
            <div className="mt-2 space-y-1.5 z-10">
                <div className="flex justify-between text-xs font-medium">
                    <span className="text-clay">已分配 {investedPercentage.toFixed(1)}%</span>
                    <span className="text-clay">未分配 {(100 - investedPercentage).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-stoneSoft rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-gradient-to-r from-moss/60 to-moss transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${investedPercentage}%` }}
                    />
                </div>
                <div className="flex items-center justify-end">
                    <button
                        type="button"
                        onClick={() => setShowFundingHint((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[10px] text-clay/70 hover:text-slate-700 transition-colors"
                        aria-expanded={showFundingHint}
                        aria-label="顯示已分配定義說明"
                    >
                        <span className="w-3.5 h-3.5 rounded-full border border-clay/40 inline-flex items-center justify-center text-[9px] leading-none">i</span>
                        說明
                    </button>
                </div>
                {showFundingHint && (
                    <p className="text-[10px] text-clay/70">
                        已分配包含：台股/基金/美股帳戶與各軍團；未分配為主帳戶可再配置資金。
                    </p>
                )}
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
                                            onClick={() => setPendingDeleteDepositId(dep.id)}
                                            className="p-1 rounded text-clay/30 hover:text-rust hover:bg-rust/10 transition-all opacity-0 group-hover/dep:opacity-100 md:opacity-100"
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
            <ConfirmModal
                isOpen={!!pendingDeleteDepositId}
                title="刪除入金紀錄"
                message="確定要刪除這筆入金紀錄嗎？此動作無法復原。"
                confirmText="刪除"
                onConfirm={() => {
                    if (pendingDeleteDepositId) {
                        onRemoveDeposit(pendingDeleteDepositId);
                    }
                    setPendingDeleteDepositId(null);
                }}
                onCancel={() => setPendingDeleteDepositId(null)}
            />
        </Card>
    );
};
