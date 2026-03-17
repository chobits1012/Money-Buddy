import { Card } from '../ui/Card';
import { AllocationChart } from './AllocationChart';
import type { StockAssetType } from '../../types';

interface AssetAllocationSectionProps {
    onSelectType: (type: StockAssetType) => void;
}

export const AssetAllocationSection = ({
    onSelectType
}: AssetAllocationSectionProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col items-center justify-center p-6">
                <h3 className="w-full text-left text-sm font-medium text-clay tracking-wide uppercase mb-2">資產配置比例</h3>
                <AllocationChart />
            </Card>

            {/* 操作按鈕區 */}
            <div className="flex flex-col gap-3 justify-center h-full">
                <button
                    onClick={() => onSelectType('TAIWAN_STOCK')}
                    className="glass-panel card-hover flex items-center justify-between p-4 sm:p-5 text-slate-800 group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-moss/15 text-moss flex items-center justify-center group-hover:scale-110 group-hover:bg-moss/20 transition-all">
                            <span className="material-symbols-outlined text-xl">ssid_chart</span>
                        </div>
                        <span className="text-sm font-medium tracking-wide">台股</span>
                    </div>
                    <span className="material-symbols-outlined text-clay group-hover:text-slate-800 transition-colors">chevron_right</span>
                </button>
                <button
                    onClick={() => onSelectType('US_STOCK')}
                    className="glass-panel card-hover flex items-center justify-between p-4 sm:p-5 text-slate-800 group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-rust/15 text-rust flex items-center justify-center group-hover:scale-110 group-hover:bg-rust/20 transition-all">
                            <span className="material-symbols-outlined text-xl">public</span>
                        </div>
                        <span className="text-sm font-medium tracking-wide">美股</span>
                    </div>
                    <span className="material-symbols-outlined text-clay group-hover:text-slate-800 transition-colors">chevron_right</span>
                </button>
                <button
                    onClick={() => onSelectType('FUNDS')}
                    className="glass-panel card-hover flex items-center justify-between p-4 sm:p-5 text-slate-800 group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-clay/15 text-clayDark flex items-center justify-center group-hover:scale-110 group-hover:bg-clay/25 transition-all">
                            <span className="material-symbols-outlined text-xl">pie_chart</span>
                        </div>
                        <span className="text-sm font-medium tracking-wide">基金</span>
                    </div>
                    <span className="material-symbols-outlined text-clay group-hover:text-slate-800 transition-colors">chevron_right</span>
                </button>
            </div>
        </div>
    );
};
