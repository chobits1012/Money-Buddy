import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePortfolioStore } from '../../store/portfolioStore';
import { ASSET_LABELS } from '../../utils/constants';

export const AllocationChart = () => {
    const getAssetTotals = usePortfolioStore((state) => state.getAssetTotals);
    const getAvailableCapital = usePortfolioStore((state) => state.getAvailableCapital);

    const assetTotals = getAssetTotals();
    const available = getAvailableCapital();

    // 將資料重組為 Recharts 所需格式
    const data = [
        { name: ASSET_LABELS.TAIWAN_STOCK, value: assetTotals.TAIWAN_STOCK, color: '#4A90E2' },
        { name: ASSET_LABELS.US_STOCK, value: assetTotals.US_STOCK, color: '#9C27B0' },
        { name: ASSET_LABELS.BONDS, value: assetTotals.BONDS, color: '#FF9800' },
        { name: ASSET_LABELS.FUNDS, value: assetTotals.FUNDS, color: '#00BCD4' },
        // 閒置資金
        { name: '閒置可動用資金', value: available, color: '#383838' }
    ].filter(item => item.value > 0); // 只顯示大於 0 的區塊

    // 動畫處理：如果沒有資料，顯示一個灰色的空心圓預設圖
    if (data.length === 0 || (data.length === 1 && data[0].name === '閒置可動用資金' && data[0].value === 0)) {
        return (
            <div className="h-48 w-full flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border-[16px] border-surfaceHighlight/50 animate-pulse" style={{ margin: '10%' }} />
                <span className="text-textSecondary text-sm">無資金可用</span>
            </div>
        );
    }

    return (
        <div className="h-56 w-full -my-4 relative z-0">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="90%"
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} className="transition-all duration-300 hover:opacity-80 drop-shadow-sm" />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: unknown) => {
                            const numValue = typeof value === 'number' ? value : Number(value);
                            return [`NT$ ${numValue.toLocaleString()}`, '金額'];
                        }}
                        contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #333', borderRadius: '8px', color: '#E0E0E0' }}
                        itemStyle={{ color: '#E0E0E0' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
