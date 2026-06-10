import { Card } from '../ui/Card';
import { FORMAT_TWD } from '../../utils/constants';
import { cn } from '../../utils/cn';
import type { StockHolding, AssetPool, StockAssetType } from '../../types';
import type { PoolReturnMetrics } from '../../utils/poolReturnMetrics';
import { calcHoldingReturn } from '../../utils/poolReturnMetrics';
import { PoolReturnDisplay } from '../ui/PoolReturnDisplay';

interface UnassignedHoldingsProps {
    holdings: StockHolding[];
    pools: AssetPool[];
    type: StockAssetType;
    returnMetrics?: PoolReturnMetrics;
    exchangeRateUSD?: number;
    onUpdatePool: (holdingId: string, poolId: string) => void;
    onRemove: (holdingId: string, name: string) => void;
}

export const UnassignedHoldings = ({
    holdings,
    pools,
    type,
    returnMetrics,
    exchangeRateUSD = 31,
    onUpdatePool,
    onRemove
}: UnassignedHoldingsProps) => {
    if (holdings.length === 0) return null;

    return (
        <div className="mt-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3 px-1">
                <h3 className="text-sm font-medium text-clay uppercase tracking-wider">
                    未歸屬標的 (舊資料)
                </h3>
                {returnMetrics && (
                    <PoolReturnDisplay
                        metrics={returnMetrics}
                        exchangeRateUSD={exchangeRateUSD}
                        compact
                        className="sm:text-right"
                    />
                )}
            </div>
            <div className="flex flex-col gap-3">
                {holdings.map(h => {
                    const holdingReturn = calcHoldingReturn(h);
                    const isUS = h.type === 'US_STOCK';
                    return (
                    <Card key={h.id} className="p-4 bg-rust/5 border-rust/10">
                        <div className="flex justify-between items-center gap-4">
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{h.name}</p>
                                <p className="text-[10px] text-clay mt-0.5">
                                    投入: {isUS
                                        ? `$${holdingReturn.costBasis.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                                        : FORMAT_TWD.format(holdingReturn.costBasis)}
                                </p>
                                {holdingReturn.returnRatePercent !== null && (
                                    <p className={cn(
                                        'text-[10px] font-medium mt-0.5 tabular-nums',
                                        holdingReturn.totalPnL > 0 ? 'text-rust' : holdingReturn.totalPnL < 0 ? 'text-moss' : 'text-clay',
                                    )}>
                                        {holdingReturn.returnRatePercent > 0 ? '+' : ''}
                                        {holdingReturn.returnRatePercent.toFixed(2)}%
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <select 
                                    className="text-[10px] bg-white border border-stoneSoft rounded px-2 py-1.5 outline-none font-medium text-slate-700"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            onUpdatePool(h.id, e.target.value);
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>移至軍團...</option>
                                    {pools.filter(p => p.type === type).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => onRemove(h.id, h.name)}
                                    className="p-1.5 text-clay/40 hover:text-rust transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        </div>
                    </Card>
                    );
                })}
            </div>
        </div>
    );
};
