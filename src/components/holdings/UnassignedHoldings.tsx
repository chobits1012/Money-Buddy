import { Card } from '../ui/Card';
import { FORMAT_TWD } from '../../utils/constants';
import type { StockHolding, AssetPool, StockAssetType } from '../../types';
import { isActive } from '../../utils/entityActive';

interface UnassignedHoldingsProps {
    holdings: StockHolding[];
    pools: AssetPool[];
    type: StockAssetType;
    onUpdatePool: (holdingId: string, poolId: string) => void;
    onRemove: (holdingId: string, name: string) => void;
}

export const UnassignedHoldings = ({
    holdings,
    pools,
    type,
    onUpdatePool,
    onRemove
}: UnassignedHoldingsProps) => {
    if (holdings.length === 0) return null;

    return (
        <div className="mt-4">
            <h3 className="text-sm font-medium text-clay uppercase tracking-wider mb-3 px-1">
                未歸屬標的 (舊資料)
            </h3>
            <div className="flex flex-col gap-3">
                {holdings.map(h => (
                    <Card key={h.id} className="p-4 bg-rust/5 border-rust/10">
                        <div className="flex justify-between items-center gap-4">
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate">{h.name}</p>
                                <p className="text-[10px] text-clay mt-0.5">
                                    總投入: {FORMAT_TWD.format(h.totalAmount)}
                                </p>
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
                                    {pools.filter((p) => isActive(p) && p.type === type).map((p) => (
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
                ))}
            </div>
        </div>
    );
};
