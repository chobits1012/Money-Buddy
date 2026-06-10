import type { AssetPool, StockAssetType } from '../types';

export interface CapitalStateSnapshot {
    totalCapitalPool: number;
    usdAccountCash: number;
    usStockFundPool: number;
    pools: AssetPool[];
}

export interface AccountingImpactDeltas {
    cashDeltaTWD: number;
    cashDeltaUSD: number;
    pnlDeltaTWD: number;
    pnlDeltaUSD: number;
}

export interface ApplyAccountingImpactContext {
    poolId?: string;
    assetType: StockAssetType;
    updatedAt?: string;
}

/**
 * 將 accounting 引擎算出的資金變動，套用到 store 的資本欄位。
 * buyStock / removePurchase / removeHolding / updatePurchase 共用此邏輯。
 */
export function applyAccountingImpact(
    state: CapitalStateSnapshot,
    deltas: AccountingImpactDeltas,
    context: ApplyAccountingImpactContext,
): Pick<CapitalStateSnapshot, 'totalCapitalPool' | 'usdAccountCash' | 'usStockFundPool' | 'pools'> {
    const { cashDeltaTWD, cashDeltaUSD, pnlDeltaTWD, pnlDeltaUSD } = deltas;
    const { poolId, assetType, updatedAt = new Date().toISOString() } = context;

    const usdBase = Math.max(state.usdAccountCash || 0, state.usStockFundPool || 0);
    const newUsdBalance = usdBase + pnlDeltaUSD;

    return {
        totalCapitalPool:
            poolId || assetType === 'US_STOCK'
                ? state.totalCapitalPool
                : state.totalCapitalPool + pnlDeltaTWD,
        usdAccountCash: newUsdBalance,
        usStockFundPool: newUsdBalance,
        pools: poolId
            ? state.pools.map((p) =>
                  p.id === poolId
                      ? {
                            ...p,
                            allocatedBudget:
                                p.allocatedBudget +
                                (p.type === 'US_STOCK' ? pnlDeltaUSD : pnlDeltaTWD),
                            currentCash:
                                p.currentCash +
                                (p.type === 'US_STOCK' ? cashDeltaUSD : cashDeltaTWD),
                            updatedAt,
                        }
                      : p,
              )
            : state.pools,
    };
}
