import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { FORMAT_TWD } from '../../utils/constants';
import type { StockHolding, PurchaseRecord } from '../../types';

interface HoldingCardProps {
    holding: StockHolding;
    isExpanded: boolean;
    isSimpleMode: boolean;
    isUSStock: boolean;
    onToggleExpand: (id: string) => void;
    onEditPurchase: (holdingId: string, holdingName: string, purchase: PurchaseRecord) => void;
    onRemovePurchase: (holdingId: string, purchase: PurchaseRecord) => void;
    onRemoveHolding: (holdingId: string, name: string) => void;
}

export const HoldingCard = ({
    holding,
    isExpanded,
    isSimpleMode,
    isUSStock,
    onToggleExpand,
    onEditPurchase,
    onRemovePurchase,
    onRemoveHolding
}: HoldingCardProps) => {
    const totalPnL = (holding.unrealizedPnL || 0) + (holding.realizedPnL || 0);
    const pnlPercent = holding.totalAmount > 0 
        ? (totalPnL / holding.totalAmount) * 100 
        : 0;

    return (
        <Card noPadding className="overflow-hidden">
            {/* 持倉摘要（可點擊展開） */}
            <button
                onClick={() => onToggleExpand(holding.id)}
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
                                <p className="text-sm font-medium text-slate-800 mt-0.5">
                                    {holding.shares.toLocaleString('en-US')}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-clay uppercase tracking-wider">
                                    均價 {isUSStock ? '(USD)' : ''}
                                </p>
                                <p className="text-sm font-medium text-slate-800 mt-0.5">
                                    {isUSStock
                                        ? `$${holding.avgPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                        : `$${holding.avgPrice.toLocaleString('en-US', { maximumFractionDigits: 1 })}`
                                    }
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-clay uppercase tracking-wider">
                                    現價 {isUSStock ? '(USD)' : ''}
                                </p>
                                <p className="text-sm font-medium text-slate-800 mt-0.5">
                                    {holding.currentPrice !== undefined
                                        ? (isUSStock
                                            ? `$${holding.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                            : `$${holding.currentPrice.toLocaleString('en-US', { maximumFractionDigits: 1 })}`)
                                        : '-'
                                    }
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-clay uppercase tracking-wider">
                                    總成本 {isUSStock ? '(USD)' : '(NT)'}
                                </p>
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
                                onRemoveHolding(holding.id, holding.name);
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
                                            onClick={() => onEditPurchase(holding.id, holding.name, purchase)}
                                            className="p-1.5 text-clay hover:text-primary transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </button>
                                        <button
                                            onClick={() => onRemovePurchase(holding.id, purchase)}
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
};
