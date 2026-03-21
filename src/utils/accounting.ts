import type { StockHolding, StockAssetType, PurchaseRecord } from '../types';
import { recalcHolding } from './finance';

/**
 * 會計引擎結果介面
 */
export interface AccountingImpact {
    updatedHolding: StockHolding;
    cashDeltaTWD: number;
    cashDeltaUSD: number;
    pnlDeltaTWD: number;
    pnlDeltaUSD: number;
}

/**
 * 計算單次交易對持倉與資金的影響 (純函數)
 */
export function calculateTransactionImpact(
    holding: StockHolding,
    params: {
        action: 'BUY' | 'SELL';
        shares: number;
        pricePerShare: number;
        totalCost: number;
        totalCostUSD?: number;
        exchangeRate?: number;
        note?: string;
    }
): AccountingImpact {
    const now = new Date().toISOString();
    
    // 1. 建立新的購買紀錄 (如果是 SELL，代表贖回紀錄)
    const newPurchase: PurchaseRecord = {
        id: crypto.randomUUID(),
        date: now,
        action: params.action,
        shares: params.shares,
        pricePerShare: params.pricePerShare,
        totalCost: params.totalCost,
        totalCostUSD: params.totalCostUSD,
        exchangeRate: params.exchangeRate,
        note: params.note,
        updatedAt: now,
    };

    // 2. 紀錄舊的損益（為了計算差值）
    const oldPnL = holding.realizedPnL || 0;

    // 3. 準備更新後的持倉對象
    const updatedHoldingBase: StockHolding = {
        ...holding,
        purchases: [...holding.purchases, newPurchase],
        updatedAt: now,
    };

    // 4. 使用 finance.ts 的核心算法計算新狀態
    const recalculated = recalcHolding(updatedHoldingBase);

    // 5. 計算損益變動 (PNL Delta)
    const newPnL = recalculated.realizedPnL || 0;
    const pnlDelta = newPnL - oldPnL;

    // 6. 計算現金變動 (Cash Delta)
    // 買入：現金減少 (-)
    // 賣出：現金增加 (+)
    const multiplier = params.action === 'SELL' ? 1 : -1;
    const cashDeltaTWD = multiplier * params.totalCost;
    const cashDeltaUSD = multiplier * (params.totalCostUSD || 0);

    // 7. 區分台美股損益變動
    let pnlDeltaTWD = 0;
    let pnlDeltaUSD = 0;
    if (holding.type === 'US_STOCK') {
        pnlDeltaUSD = pnlDelta;
    } else {
        pnlDeltaTWD = pnlDelta;
    }

    return {
        updatedHolding: recalculated,
        cashDeltaTWD: Math.round(cashDeltaTWD),
        cashDeltaUSD: cashDeltaUSD, // 美金保留浮點，回寫時再處理
        pnlDeltaTWD: Math.round(pnlDeltaTWD),
        pnlDeltaUSD: pnlDeltaUSD,
    };
}

/**
 * 建立全新的持倉並計算初始影響
 */
export function calculateNewHoldingImpact(
    params: {
        type: StockAssetType;
        name: string;
        symbol?: string;
        poolId?: string;
        action: 'BUY' | 'SELL';
        shares: number;
        pricePerShare: number;
        totalCost: number;
        totalCostUSD?: number;
        exchangeRate?: number;
        note?: string;
    }
): AccountingImpact {
    const now = new Date().toISOString();
    
    // 初始化一個空的持倉
    const initialHolding: StockHolding = {
        id: crypto.randomUUID(),
        type: params.type,
        name: params.name.trim(),
        symbol: params.symbol,
        purchases: [],
        poolId: params.poolId,
        shares: 0,
        avgPrice: 0,
        totalAmount: 0,
        createdAt: now,
        updatedAt: now,
    };

    // 直接調用計算影響的函數
    return calculateTransactionImpact(initialHolding, params);
}

/**
 * 計算移除該次買賣紀錄後的系統影響
 */
export function calculateRemovalImpact(
    holding: StockHolding,
    purchaseId: string
): AccountingImpact & { isHoldingEmpty: boolean } {
    const now = new Date().toISOString();
    const purchaseToRemove = holding.purchases.find(p => p.id === purchaseId);
    
    if (!purchaseToRemove) {
        throw new Error('找不到該筆交易紀錄');
    }

    // 1. 紀錄舊損益
    const oldPnL = holding.realizedPnL || 0;

    // 2. 準備移除後的持倉
    const remainingPurchases = holding.purchases.filter(p => p.id !== purchaseId);
    let updatedHolding: StockHolding;
    let isHoldingEmpty = false;

    if (remainingPurchases.length === 0) {
        // 持倉歸零：重設所有會計數值
        updatedHolding = {
            ...holding,
            purchases: [],
            shares: 0,
            avgPrice: 0,
            totalAmount: 0,
            totalAmountUSD: undefined,
            unrealizedPnL: undefined,
            realizedPnL: 0,
            updatedAt: now,
        };
        isHoldingEmpty = true;
    } else {
        // 重算聚合資訊
        updatedHolding = recalcHolding({
            ...holding,
            purchases: remainingPurchases,
            updatedAt: now,
        });
    }

    // 3. 損益變動 (移除交易後的 PNL 差)
    const newPnL = updatedHolding.realizedPnL || 0;
    const pnlDelta = newPnL - oldPnL;

    // 4. 現金變動 (反向操作)
    // 原本 BUY：-金額 -> 移除後：+金額
    // 原本 SELL：+金額 -> 移除後：-金額
    const multiplier = purchaseToRemove.action === 'SELL' ? -1 : 1;
    const cashDeltaTWD = multiplier * purchaseToRemove.totalCost;
    const cashDeltaUSD = multiplier * (purchaseToRemove.totalCostUSD || 0);

    let pnlDeltaTWD = 0;
    let pnlDeltaUSD = 0;
    if (holding.type === 'US_STOCK') {
        pnlDeltaUSD = pnlDelta;
    } else {
        pnlDeltaTWD = pnlDelta;
    }

    return {
        updatedHolding,
        cashDeltaTWD: Math.round(cashDeltaTWD),
        cashDeltaUSD,
        pnlDeltaTWD: Math.round(pnlDeltaTWD),
        pnlDeltaUSD,
        isHoldingEmpty,
    };
}

/**
 * 計算移除整個持倉的影響
 */
export function calculateHoldingRemovalImpact(
    holding: StockHolding
): Omit<AccountingImpact, 'updatedHolding'> {
    const pnlDelta = 0 - (holding.realizedPnL || 0);
    
    // 現金回流 = 目前持倉的成本金額 + 損益變動 (或者是說回流就是最後一刻的價值，但這裡用成本+損益較對帳)
    // 其實就是 holding.totalAmount + pnlDelta? 
    // 不對，如果 totalAmount 是 10000，pnlDelta 是 -1000 (代表之前實現了1000虧損並加回了pool)
    // 這裡的邏輯要跟原本一致
    
    let pnlDeltaTWD = 0;
    let pnlDeltaUSD = 0;
    if (holding.type === 'US_STOCK') {
        pnlDeltaUSD = pnlDelta;
    } else {
        pnlDeltaTWD = pnlDelta;
    }

    return {
        cashDeltaTWD: Math.round(holding.totalAmount + pnlDeltaTWD),
        cashDeltaUSD: (holding.totalAmountUSD || 0) + pnlDeltaUSD,
        pnlDeltaTWD: Math.round(pnlDeltaTWD),
        pnlDeltaUSD,
    };
}

/**
 * 計算更新某筆買賣紀錄後的系統影響
 */
export function calculateUpdateImpact(
    holding: StockHolding,
    purchaseId: string,
    updates: Partial<PurchaseRecord>
): AccountingImpact {
    const now = new Date().toISOString();
    const oldPurchase = holding.purchases.find(p => p.id === purchaseId);
    if (!oldPurchase) throw new Error('找不到該筆交易紀錄');

    // 1. 紀錄舊損益
    const oldPnL = holding.realizedPnL || 0;

    // 2. 準備更新後的持倉
    const updatedPurchases = holding.purchases.map(p => 
        p.id === purchaseId ? { ...p, ...updates, updatedAt: now } : p
    );
    const updatedHolding = recalcHolding({
        ...holding,
        purchases: updatedPurchases,
        updatedAt: now,
    });

    // 3. 損益變動
    const newPnL = updatedHolding.realizedPnL || 0;
    const pnlDelta = newPnL - oldPnL;

    // 4. 現金變動差值 = 新現金流 - 舊現金流
    const oldMultiplier = oldPurchase.action === 'SELL' ? 1 : -1;
    const oldCashFlowTWD = oldMultiplier * oldPurchase.totalCost;
    const oldCashFlowUSD = oldMultiplier * (oldPurchase.totalCostUSD || 0);

    const newPurchase = updatedPurchases.find(p => p.id === purchaseId)!;
    const newMultiplier = newPurchase.action === 'SELL' ? 1 : -1;
    const newCashFlowTWD = newMultiplier * newPurchase.totalCost;
    const newCashFlowUSD = newMultiplier * (newPurchase.totalCostUSD || 0);

    const cashDeltaTWD = newCashFlowTWD - oldCashFlowTWD;
    const cashDeltaUSD = newCashFlowUSD - oldCashFlowUSD;

    let pnlDeltaTWD = 0;
    let pnlDeltaUSD = 0;
    if (holding.type === 'US_STOCK') {
        pnlDeltaUSD = pnlDelta;
    } else {
        pnlDeltaTWD = pnlDelta;
    }

    return {
        updatedHolding,
        cashDeltaTWD: Math.round(cashDeltaTWD),
        cashDeltaUSD,
        pnlDeltaTWD: Math.round(pnlDeltaTWD),
        pnlDeltaUSD,
    };
}
