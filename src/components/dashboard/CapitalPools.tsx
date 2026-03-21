import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { usePortfolioStore } from '../../store/portfolioStore';
import { FORMAT_TWD } from '../../utils/constants';
import type { AssetPool, AssetType } from '../../types';
import { cn } from '../../utils/cn';
import { selectPoolBuckets } from '../../utils/dashboardMetrics';
import { useState } from 'react';

const THEME_CONFIG = {
    TAIWAN_STOCK: {
        bg: 'bg-moss/5',
        border: 'border-moss/20',
        hoverBg: 'hover:bg-moss/10',
        hoverBorder: 'hover:border-moss/30',
        iconColor: 'text-moss/20',
        iconHoverColor: 'group-hover:text-moss/40',
        accentBg: 'bg-moss/10',
        accentText: 'text-moss',
        accentHoverBg: 'hover:bg-moss/20',
        separator: 'border-moss/10'
    },
    US_STOCK: {
        bg: 'bg-rust/5',
        border: 'border-rust/20',
        hoverBg: 'hover:bg-rust/10',
        hoverBorder: 'hover:border-rust/30',
        iconColor: 'text-rust/20',
        iconHoverColor: 'group-hover:text-rust/40',
        accentBg: 'bg-rust/10',
        accentText: 'text-rust',
        accentHoverBg: 'hover:bg-rust/20',
        separator: 'border-rust/10'
    },
    FUNDS: {
        bg: 'bg-clay/5',
        border: 'border-clay/20',
        hoverBg: 'hover:bg-clay/10',
        hoverBorder: 'hover:border-clay/30',
        iconColor: 'text-clay/20',
        iconHoverColor: 'group-hover:text-clay/40',
        accentBg: 'bg-primary/10',
        accentText: 'text-primary',
        accentHoverBg: 'hover:bg-primary/20',
        separator: 'border-clay/10'
    },
    OTHER: {
        bg: 'bg-white/40',
        border: 'border-white/60',
        hoverBg: 'hover:bg-white/60',
        hoverBorder: 'hover:border-white/80',
        iconColor: 'text-clay/20',
        iconHoverColor: 'group-hover:text-clay/40',
        accentBg: 'bg-primary/10',
        accentText: 'text-primary',
        accentHoverBg: 'hover:bg-primary/20',
        separator: 'border-stoneSoft/50'
    }
};

export const CapitalPools = ({ onSelectPool, type }: { onSelectPool: (id: string) => void, type: AssetType }) => {
    const { pools, allocateToPool, withdrawFromPool, getUsStockAvailableCapital, getGlobalFreeCapital } = usePortfolioStore();
    const isUSStock = type === 'US_STOCK';
    const { twdPools, usdPools } = selectPoolBuckets(pools);
    const currentTypePools = isUSStock ? usdPools : twdPools.filter((pool) => pool.type === type);
    
    const availableBalance = isUSStock ? getUsStockAvailableCapital() : getGlobalFreeCapital();
    const balanceLabel = isUSStock
        ? `可用餘額: $${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
        : `可用餘額: ${FORMAT_TWD.format(availableBalance)}`;

    const parseMoneyInput = (raw: string): number => Number(raw.replace(/,/g, '').trim());

    const [fundModal, setFundModal] = useState<{
        action: 'ALLOCATE' | 'WITHDRAW';
        pool: AssetPool;
        max: number;
    } | null>(null);

    const [amountText, setAmountText] = useState('');
    const [modalError, setModalError] = useState('');

    const closeFundModal = () => {
        setFundModal(null);
        setAmountText('');
        setModalError('');
    };

    return (
        <>
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">入金池管理 (戰備軍團)</h2>
                    <div className="text-right text-sm text-clay font-medium">
                        {balanceLabel}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentTypePools.map((pool) => {
                        const theme = THEME_CONFIG[type as keyof typeof THEME_CONFIG] || THEME_CONFIG.OTHER;

                        return (
                            <div 
                                key={pool.id} 
                                onClick={() => onSelectPool(pool.id)}
                                className={cn(
                                    "p-5 rounded-2xl transition-all group flex flex-col cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden border",
                                    theme.bg,
                                    theme.border,
                                    theme.hoverBg,
                                    theme.hoverBorder
                                )}
                            >
                                <div className={cn("absolute top-0 right-0 p-3 transition-colors", theme.iconColor, theme.iconHoverColor)}>
                                    <span className="material-symbols-outlined text-lg"> military_tech </span>
                                </div>

                                <div className="font-semibold text-slate-700 mb-1 flex justify-between items-center text-sm tracking-wide">
                                    {pool.name}
                                </div>
                                
                                <div className="mt-2">
                                    <div className="text-2xl font-light text-slate-700 tracking-tight">
                                        {isUSStock
                                            ? `$${pool.currentCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                            : FORMAT_TWD.format(pool.currentCash)}
                                    </div>
                                    <div className="text-[10px] text-clayDark uppercase tracking-widest mt-0.5">
                                        目前可用資金 {isUSStock ? '(USD)' : '(NT)'}
                                    </div>
                                </div>

                                <div className={cn("mt-4 pt-3 border-t", theme.separator)}>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-clayDark uppercase tracking-wider">
                                                分配預算 {isUSStock ? '(USD)' : '(NT)'}
                                            </p>
                                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                                                {isUSStock ? `$${pool.allocatedBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : FORMAT_TWD.format(pool.allocatedBudget)}
                                            </p>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className={cn("h-8 px-3 text-[10px] border-none shadow-none", theme.accentBg, theme.accentText, theme.accentHoverBg)}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFundModal({ action: 'ALLOCATE', pool, max: availableBalance });
                                                    setAmountText('');
                                                    setModalError('');
                                                }}
                                            >
                                                撥款
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 px-3 text-[10px] text-clay hover:text-rust hover:bg-rust/5"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFundModal({ action: 'WITHDRAW', pool, max: pool.currentCash });
                                                    setAmountText('');
                                                    setModalError('');
                                                }}
                                            >
                                                撤資
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {currentTypePools.length === 0 && (
                        <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            尚未建立任何戰備池子
                        </div>
                    )}
                </div>
            </Card>

            {/* 撥款/撤資金額 Modal（取代原生 prompt/alert） */}
            {fundModal && (
                <>
                    <div
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] transition-opacity duration-300 opacity-100"
                        onClick={closeFundModal}
                    />
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                        <Card className="w-full max-w-sm flex flex-col gap-4 pointer-events-auto transition-all duration-300 transform shadow-2xl border-stoneSoft">
                            <div className="flex flex-col gap-2.5">
                                <h3 className="text-2xl font-light text-slate-800 tracking-tight">
                                    {fundModal.action === 'ALLOCATE' ? '撥款' : '撤資'}至「{fundModal.pool.name}」
                                </h3>
                                <p className="text-sm text-clayDark leading-relaxed font-medium">
                                    請輸入金額（最多{' '}
                                    {fundModal.max.toLocaleString('en-US', { minimumFractionDigits: isUSStock ? 2 : 0 })} {isUSStock ? 'USD' : 'NT'}
                                    ）
                                </p>
                            </div>

                            <Input
                                label={`金額 (${isUSStock ? 'USD' : 'NT'})`}
                                placeholder="0"
                                value={amountText}
                                onChange={(e) => {
                                    setAmountText(e.target.value);
                                    setModalError('');
                                }}
                                type="text"
                                icon={isUSStock ? <span className="font-semibold px-1 text-xs">$</span> : <span className="font-semibold px-1 text-xs">NT$</span>}
                                error={modalError}
                                inputMode="decimal"
                            />

                            <div className="flex justify-end gap-3 mt-4">
                                <Button variant="ghost" size="sm" onClick={closeFundModal}>
                                    取消
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        const num = parseMoneyInput(amountText);
                                        if (!Number.isFinite(num) || num <= 0) {
                                            setModalError('請輸入有效金額');
                                            return;
                                        }
                                        if (num > fundModal.max) {
                                            setModalError(`金額不可大於目前可用（最多 ${fundModal.max.toLocaleString('en-US', { minimumFractionDigits: isUSStock ? 2 : 0 })} ${isUSStock ? 'USD' : 'NT'}）。`);
                                            return;
                                        }
                                        if (fundModal.action === 'ALLOCATE') {
                                            allocateToPool(fundModal.pool.id, num);
                                        } else {
                                            withdrawFromPool(fundModal.pool.id, num);
                                        }
                                        closeFundModal();
                                    }}
                                >
                                    確認
                                </Button>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </>
    );
};
