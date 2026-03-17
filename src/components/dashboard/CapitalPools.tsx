import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePortfolioStore } from '../../store/portfolioStore';
import { FORMAT_TWD } from '../../utils/constants';
import type { AssetType } from '../../types';
import { cn } from '../../utils/cn';

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
    const { pools, totalCapitalPool, allocateToPool, withdrawFromPool } = usePortfolioStore();

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">入金池管理 (戰備軍團)</h2>
                <div className="text-right text-sm text-slate-500">
                    總可用餘額: {FORMAT_TWD.format(totalCapitalPool)}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pools.filter(p => p.type === type).map((pool) => {
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
                                    {FORMAT_TWD.format(pool.currentCash)}
                                </div>
                                <div className="text-[10px] text-clayDark uppercase tracking-widest mt-0.5">
                                    目前可用資金
                                </div>
                            </div>

                            <div className={cn("mt-4 pt-3 border-t", theme.separator)}>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-clayDark uppercase tracking-wider">分配預算</p>
                                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                                            {FORMAT_TWD.format(pool.allocatedBudget)}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            className={cn("h-8 px-3 text-[10px] border-none shadow-none", theme.accentBg, theme.accentText, theme.accentHoverBg)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const amount = window.prompt(`請輸入撥款至「${pool.name}」的金額:`);
                                                if (amount && !isNaN(Number(amount))) {
                                                    allocateToPool(pool.id, Number(amount));
                                                }
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
                                                const amount = window.prompt(`請從「${pool.name}」撤資的金額:`);
                                                if (amount && !isNaN(Number(amount))) {
                                                    withdrawFromPool(pool.id, Number(amount));
                                                }
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
                
                {pools.filter(p => p.type === type).length === 0 && (
                    <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        尚未建立任何戰備池子
                    </div>
                )}
            </div>
        </Card>
    );
};
