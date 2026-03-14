// 採用嚴格型別定義資產與紀錄 (遵循 typescript-expert 規範)

export type AssetType = 'TAIWAN_STOCK' | 'US_STOCK' | 'FUNDS' | 'CRYPTO';

// 支援持倉管理的資產類型 (全部類型皆使用持倉系統)
export type StockAssetType = AssetType;

// 簡易模式的類型 (只需名稱 + 金額，不需股數/價格)
export const SIMPLE_HOLDING_TYPES: AssetType[] = ['FUNDS'];

export interface Transaction {
    id: string;
    type: AssetType;
    amount: number;
    amountUSD?: number;
    exchangeRate?: number;
    date: string;
    note: string;
    action: 'DEPOSIT' | 'WITHDRAWAL';
    holdingId?: string;
}

// 單次購買紀錄
export interface PurchaseRecord {
    id: string;
    date: string;
    shares: number;
    pricePerShare: number;
    totalCost: number;
    totalCostUSD?: number;
    exchangeRate?: number;
    note?: string;
}

// 個股/基金持倉資料 (由 PurchaseRecords 聚合)
export interface StockHolding {
    id: string;
    type: StockAssetType;
    name: string;
    symbol?: string; // 加入 symbol 供報價使用
    purchases: PurchaseRecord[];
    shares: number;
    avgPrice: number;
    totalAmount: number;
    totalAmountUSD?: number;
    currentPrice?: number;
    unrealizedPnL?: number;
    createdAt: string;
    updatedAt: string;
}

// 使用者自訂欄位 (e.g. 緊急預備金、保險)
export interface CustomCategory {
    id: string;
    name: string;
    amount: number;
    note: string;
    createdAt: string;
    updatedAt: string;
}

// 總資產入金紀錄
export interface CapitalDeposit {
    id: string;
    amount: number;
    note: string;
    date: string;
}

export interface PortfolioState {
    totalCapitalPool: number;
    capitalDeposits: CapitalDeposit[];
    usStockFundPool: number;
    exchangeRateUSD: number;
    transactions: Transaction[];
    holdings: StockHolding[];
    customCategories: CustomCategory[];
    isConfigured: boolean;
}

export interface AssetSummary {
    type: AssetType;
    totalAmount: number;
    percentage: number;
}
