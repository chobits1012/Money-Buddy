import { useState } from 'react';
import { usePortfolioStore } from '../../store/portfolioStore';
import { Card } from '../ui/Card';
import { AllocationChart } from './AllocationChart';
import { FORMAT_TWD } from '../../utils/constants';
import { PlusIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { AssetDrawer } from './AssetDrawer';
import type { AssetType } from '../../types';
import { TransactionHistory } from '../history/TransactionHistory';

export const Dashboard = () => {
    const { totalCapitalPool, resetAll } = usePortfolioStore();
    const getAvailableCapital = usePortfolioStore((state) => state.getAvailableCapital);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<AssetType | null>(null);

    const availableCapital = getAvailableCapital();

    // 計算已投入比例
    const invested = totalCapitalPool - availableCapital;
    const investedPercentage = totalCapitalPool > 0 ? (invested / totalCapitalPool) * 100 : 0;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* 總覽卡片 */}
            <Card className="flex flex-col gap-4 relative overflow-hidden ring-1 ring-white/5 bg-gradient-to-b from-surface to-surface/80">

                {/* 背景裝飾 */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-accentPrimary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex justify-between items-start z-10">
                    <div>
                        <h2 className="text-textSecondary text-sm font-medium">總閒置資金 (TWD)</h2>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight text-white shadow-black">
                                {FORMAT_TWD.format(availableCapital)}
                            </span>
                        </div>
                        <p className="text-xs text-textSecondary mt-1">
                            總投入上限: {FORMAT_TWD.format(totalCapitalPool)}
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => resetAll()} className="text-xs opacity-50 hover:opacity-100">
                        重設
                    </Button>
                </div>

                {/* 資金水位進度條 */}
                <div className="mt-2 space-y-1.5 z-10">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-textSecondary">已投入 {investedPercentage.toFixed(1)}%</span>
                        <span className="text-textSecondary">剩餘 {(100 - investedPercentage).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden flex">
                        <div
                            className="h-full bg-gradient-to-r from-accentPrimary/80 to-accentPrimary transition-all duration-1000 ease-out"
                            style={{ width: `${investedPercentage}%` }}
                        />
                    </div>
                </div>
            </Card>

            {/* 資產圓餅圖與操作區大框架 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="flex flex-col items-center justify-center p-6">
                    <h3 className="w-full text-left text-sm font-medium text-textSecondary mb-2">資產配置比例</h3>
                    <AllocationChart />
                </Card>

                {/* 操作按鈕區 */}
                <Card className="flex flex-col gap-3 justify-center bg-surface/40">
                    <Button
                        className="w-full justify-between group"
                        variant="secondary"
                        onClick={() => { setSelectedAsset('TAIWAN_STOCK'); setIsDrawerOpen(true); }}
                    >
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#4A90E2]" />
                            新增台股投入
                        </span>
                        <PlusIcon className="w-4 h-4 text-textSecondary group-hover:text-white transition-colors" />
                    </Button>
                    <Button
                        className="w-full justify-between group"
                        variant="secondary"
                        onClick={() => { setSelectedAsset('US_STOCK'); setIsDrawerOpen(true); }}
                    >
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#9C27B0]" />
                            新增美股投入
                        </span>
                        <PlusIcon className="w-4 h-4 text-textSecondary group-hover:text-white transition-colors" />
                    </Button>
                    <Button
                        className="w-full justify-between group"
                        variant="secondary"
                        onClick={() => { setSelectedAsset('BONDS'); setIsDrawerOpen(true); }}
                    >
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#FF9800]" />
                            新增證券投入
                        </span>
                        <PlusIcon className="w-4 h-4 text-textSecondary group-hover:text-white transition-colors" />
                    </Button>
                    <Button
                        className="w-full justify-between group"
                        variant="secondary"
                        onClick={() => { setSelectedAsset('FUNDS'); setIsDrawerOpen(true); }}
                    >
                        <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#00BCD4]" />
                            新增基金投入
                        </span>
                        <PlusIcon className="w-4 h-4 text-textSecondary group-hover:text-white transition-colors" />
                    </Button>
                </Card>
            </div>

            {/* 歷史紀錄模塊 */}
            <TransactionHistory />

            {/* 抽屜套件 */}
            <AssetDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                type={selectedAsset}
            />
        </div>
    );
};
