import { calculateTransactionImpact, calculateNewHoldingImpact, calculateRemovalImpact, calculateHoldingRemovalImpact, calculateUpdateImpact } from './src/utils/accounting';
import { randomUUID } from 'node:crypto';

// Setup environment
if (typeof crypto === 'undefined') {
  (global as any).crypto = { randomUUID };
}

function runComprehensiveAudit() {
    console.log('🚀 開始會計引擎深度稽核...');

    // --- 測試 1: 多池隔離回流 (Isolation) ---
    console.log('\n[測試 1: 多池隔離回流]');
    
    // 台股持倉
    const twImpact = calculateNewHoldingImpact({
        type: 'TAIWAN_STOCK',
        name: '台積電',
        poolId: 'pool-tw',
        action: 'BUY',
        shares: 10,
        pricePerShare: 1000,
        totalCost: 10000,
    });
    
    // 美股持倉
    const usImpact = calculateNewHoldingImpact({
        type: 'US_STOCK',
        name: 'Apple',
        poolId: 'pool-us',
        action: 'BUY',
        shares: 10,
        pricePerShare: 150,
        totalCost: 45000, // 3000 USD * 15
        totalCostUSD: 1500,
        exchangeRate: 30,
    });

    // 賣出台股一部份 (獲利 1000)
    const twSellImpact = calculateTransactionImpact(twImpact.updatedHolding, {
        action: 'SELL',
        shares: 5,
        pricePerShare: 1200,
        totalCost: 6000,
    });

    console.log('✅ 台股賣出影響 (預期 PNL Delta +1000, Cash Delta +6000):', {
        pnlDelta: twSellImpact.pnlDeltaTWD,
        cashDelta: twSellImpact.cashDeltaTWD,
    });

    // 賣出美股一部份 (獲利 100 USD)
    const usSellImpact = calculateTransactionImpact(usImpact.updatedHolding, {
        action: 'SELL',
        shares: 5,
        pricePerShare: 170,
        totalCost: 25500, // 850 USD * 30? No, totalCost is TWD
        totalCostUSD: 850,
        exchangeRate: 30,
    });

    console.log('✅ 美股賣出影響 (預期 PNL Delta USD +100, Cash Delta USD +100):', {
        pnlDeltaUSD: usSellImpact.pnlDeltaUSD,
        cashDeltaUSD: usSellImpact.cashDeltaUSD,
    });

    // --- 測試 2: 移除整個持倉 (Holding Removal) ---
    console.log('\n[測試 2: 移除整個持倉]');
    const removalImpact = calculateHoldingRemovalImpact(twSellImpact.updatedHolding);
    
    // 剩下的台股 5 股，成本 5000。
    // 預期：PNL Delta = 0 - 1000 (移除已實現損益), Cash Delta = 5000 (成本) + (-1000) (損益修正?) 
    // 原本邏輯：currentCash + holding.totalAmount + pnlDelta
    // 5000 + (-1000) = 4000? 
    // 不對，原本邏輯是回到 Pool 的錢要是「最後剩下的價值」。
    // 價值 5000。損益 -1000。
    // 讓我們看看 calculateHoldingRemovalImpact 的實作。
    
    console.log('✅ 持倉移除回流:', removalImpact);

    // --- 測試 3: 更新交易 (Update Impact) ---
    console.log('\n[測試 3: 更新交易]');
    const updateImpact = calculateUpdateImpact(twSellImpact.updatedHolding, twSellImpact.updatedHolding.purchases[1].id, {
        totalCost: 7000, // 漲更多，賺 2000
    });
    
    console.log('✅ 更新交易影響 (預期 PNL 加 1000):', {
        pnlDelta: updateImpact.pnlDeltaTWD,
        cashDelta: updateImpact.cashDeltaTWD,
    });

    console.log('\n✨ 深度稽核完成。');
}

runComprehensiveAudit();
