import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FORMAT_TWD } from '../../utils/constants';
import { cn } from '../../utils/cn';
import type { CapitalDeposit } from '../../types';

interface CapitalOverviewProps {
    availableCapital: number;
    totalCapitalPool: number;
    totalUnrealizedPnL: number;
    totalRealizedPnL: number;
    isLoadingQuotes: boolean;
    capitalDeposits: CapitalDeposit[];
    onOpenDeposit: () => void;
    onReset: () => void;
    onRemoveDeposit: (id: string) => void;
}

export const CapitalOverview = ({
    availableCapital,
    totalCapitalPool,
    totalUnrealizedPnL,
    totalRealizedPnL,
    isLoadingQuotes,
    capitalDeposits,
    onOpenDeposit,
    onReset,
    onRemoveDeposit
}: CapitalOverviewProps) => {
    const [showDepositHistory, setShowDepositHistory] = useState(false);
    
    const invested = totalCapitalPool - availableCapital;
    const investedPercentage = totalCapitalPool > 0 ? (invested / totalCapitalPool) * 100 : 0;

    return (
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
                    <Button variant="secondary" size="sm" onClick={onOpenDeposit} className="text-xs">
                        <span className="material-symbols-outlined text-base mr-1">add</span>
                        入金
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onReset} className="text-xs opacity-50 hover:opacity-100">
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
                                            onClick={() => onRemoveDeposit(dep.id)}
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
    );
};
