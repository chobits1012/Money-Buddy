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
    poolId?: string; // 關聯入金池
    updatedAt?: string;
}

// 單次交易紀錄 (原購買紀錄擴充)
export interface PurchaseRecord {
    id: string;
    action?: 'BUY' | 'SELL'; // 買或賣 (為了向後相容，預設為 BUY)
    date: string;
    shares: number;
    pricePerShare: number;
    totalCost: number; // 如果是 SELL，代表拿回的總金額
    totalCostUSD?: number;
    exchangeRate?: number;
    note?: string;
    updatedAt?: string;
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
    realizedPnL?: number; // 已實現損益
    poolId?: string; // 關聯入金池
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
    updatedAt?: string;
}

// 入金池 (隔離資金管理)
export interface AssetPool {
    id: string;
    name: string;
    allocatedBudget: number; // 分配預算
    currentCash: number;
    type: AssetType;         // 所屬市場分類 (e.g. TAIWAN_STOCK)
    note?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PortfolioState {
    totalCapitalPool: number;
    capitalDeposits: CapitalDeposit[];
    pools: AssetPool[]; // 新增：多入金池管理
    usStockFundPool: number;
    exchangeRateUSD: number;
    transactions: Transaction[];
    holdings: StockHolding[];
    customCategories: CustomCategory[];
    isConfigured: boolean;
    lastSyncedAt?: string;
}

export interface AssetSummary {
    type: AssetType;
    totalAmount: number;
    percentage: number;
}
