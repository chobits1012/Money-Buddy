import type { UsdAccountFields } from '../types';

/** 讀取美股主帳美元餘額（相容舊資料的雙欄位，取較大值） */
export function resolveUsdAccountBalance(fields: UsdAccountFields): number {
    return Math.max(fields.usdAccountCash || 0, fields.usStockFundPool || 0);
}

/** 寫入時同步雙欄位，維持舊版 persist / sync 相容 */
export function syncUsdAccountFields(balance: number): {
    usdAccountCash: number;
    usStockFundPool: number;
} {
    const safe = balance > 0 ? balance : 0;
    return { usdAccountCash: safe, usStockFundPool: safe };
}
