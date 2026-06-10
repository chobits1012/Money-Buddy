import type { CapitalStateSnapshot, StockAssetType } from '../types';
import type { AccountingImpact } from './accounting';
import { resolveUsdAccountBalance, syncUsdAccountFields } from './usdAccount';

export type AccountingImpactDeltas = Pick<
    AccountingImpact,
    'cashDeltaTWD' | 'cashDeltaUSD' | 'pnlDeltaTWD' | 'pnlDeltaUSD'
>;

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

    const usdBase = resolveUsdAccountBalance(state);
    const newUsdBalance = usdBase + pnlDeltaUSD;

    return {
        totalCapitalPool:
            poolId || assetType === 'US_STOCK'
                ? state.totalCapitalPool
                : state.totalCapitalPool + pnlDeltaTWD,
        ...syncUsdAccountFields(newUsdBalance),
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
