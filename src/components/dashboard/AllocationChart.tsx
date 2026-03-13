import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePortfolioStore } from '../../store/portfolioStore';
import { ASSET_LABELS, ASSET_CHART_COLORS, CUSTOM_CATEGORY_COLORS } from '../../utils/constants';

export const AllocationChart = () => {
    const getAssetTotals = usePortfolioStore((state) => state.getAssetTotals);
    const getAvailableCapital = usePortfolioStore((state) => state.getAvailableCapital);
    const customCategories = usePortfolioStore((state) => state.customCategories);

    const assetTotals = getAssetTotals();
    const available = getAvailableCapital();

    // 固定資產類別
    const data = [
        { name: ASSET_LABELS.TAIWAN_STOCK, value: assetTotals.TAIWAN_STOCK, color: ASSET_CHART_COLORS.TAIWAN_STOCK },
        { name: ASSET_LABELS.US_STOCK, value: assetTotals.US_STOCK, color: ASSET_CHART_COLORS.US_STOCK },
        { name: ASSET_LABELS.FUNDS, value: assetTotals.FUNDS, color: ASSET_CHART_COLORS.FUNDS },
    ];

    // 動態加入自訂欄位
    customCategories.forEach((cat, idx) => {
        if (cat.amount > 0) {
            data.push({
                name: cat.name,
                value: cat.amount,
                color: CUSTOM_CATEGORY_COLORS[idx % CUSTOM_CATEGORY_COLORS.length],
            });
        }
    });

    // 閒置資金
    data.push({ name: '閒置可動用資金', value: available, color: ASSET_CHART_COLORS.AVAILABLE });

    // 只顯示大於 0 的區塊
    const filteredData = data.filter(item => item.value > 0);

    // 動畫處理：如果沒有資料，顯示一個灰色的空心圓預設圖
    if (filteredData.length === 0 || (filteredData.length === 1 && filteredData[0].name === '閒置可動用資金' && filteredData[0].value === 0)) {
        return (
            <div className="h-48 w-full flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border-[16px] border-stoneSoft/50 animate-pulse" style={{ margin: '10%' }} />
                <span className="text-clay text-sm">無資金可用</span>
            </div>
        );
    }

    return (
        <div className="h-56 w-full -my-4 relative z-0">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={filteredData}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="90%"
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                    >
                        {filteredData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} className="transition-all duration-300 hover:opacity-80 drop-shadow-sm" />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: unknown) => {
                            const numValue = typeof value === 'number' ? value : Number(value);
                            return [`NT$ ${numValue.toLocaleString()}`, '金額'];
                        }}
                        contentStyle={{
                            backgroundColor: '#f2f0ed',
                            border: '1px solid #e5e1dc',
                            borderRadius: '8px',
                            color: '#334155',
                            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.08)'
                        }}
                        itemStyle={{ color: '#334155' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
