import type { StockHolding } from '../types';
import { filterActive } from './entityActive';

/**
 * 從購買紀錄重新計算持倉聚合值 (均價、總額、損益等)
 */
export function recalcHolding(holding: StockHolding): StockHolding {
    const purchases = filterActive(holding.purchases);
    if (purchases.length === 0) {
        return { ...holding, shares: 0, avgPrice: 0, totalAmount: 0, totalAmountUSD: undefined, unrealizedPnL: undefined, realizedPnL: 0 };
    }

    // 確保以時間順序處理交易
    const sortedPurchases = [...purchases].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalShares = 0;
    let totalCost = 0;
    let totalCostUSD = 0;
    let realizedPnL = 0;

    const isUSStock = holding.type === 'US_STOCK';

    for (const p of sortedPurchases) {
        const action = p.action || 'BUY';

        if (action === 'BUY') {
            totalShares += p.shares;
            totalCost += p.totalCost;
            if (p.totalCostUSD) {
                totalCostUSD += p.totalCostUSD;
            }
        } else if (action === 'SELL') {
            const currentAvgPrice = totalShares > 0
                ? (isUSStock ? totalCostUSD / totalShares : totalCost / totalShares)
                : 0;

            const sellShares = Math.min(p.shares, totalShares); // 防止超賣
            
            // 已實現損益：(賣出總額 - 目前均價 * 賣出單位數)
            const pnl = isUSStock && p.totalCostUSD
                ? (p.totalCostUSD - currentAvgPrice * sellShares)
                : (p.totalCost - currentAvgPrice * sellShares);

            realizedPnL += pnl;

            // 按比例扣除總成本，保持均價不變
            if (totalShares > 0) {
                const proportion = sellShares / totalShares;
                totalCost -= (totalCost * proportion);
                totalCostUSD -= (totalCostUSD * proportion);
            }
            totalShares -= sellShares;
        }
    }

    // 防禦性處理浮點數誤差
    if (totalShares < 0.000001) {
        totalShares = 0;
        totalCost = 0;
        totalCostUSD = 0;
    }

    const avgPrice = totalShares > 0
        ? (isUSStock ? totalCostUSD / totalShares : totalCost / totalShares)
        : 0;

    let unrealizedPnL = undefined;
    if (holding.currentPrice !== undefined && totalShares > 0) {
        unrealizedPnL = (holding.currentPrice - avgPrice) * totalShares;
    }

    return {
        ...holding,
        shares: Number(totalShares.toFixed(6)),
        avgPrice: Math.round(avgPrice * 100) / 100,
        totalAmount: Math.round(totalCost), // 台幣取整數
        totalAmountUSD: totalCostUSD > 0 ? Number(totalCostUSD.toFixed(2)) : undefined, // 美金取兩位
        unrealizedPnL: unrealizedPnL !== undefined ? Math.round(unrealizedPnL * 100) / 100 : undefined,
        realizedPnL: Math.round(realizedPnL * 100) / 100,
        updatedAt: new Date().toISOString(),
    };
}
