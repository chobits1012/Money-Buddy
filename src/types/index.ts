// 採用嚴格型別定義資產與紀錄 (遵循 typescript-expert 規範)

/** 可同步且可軟刪除的實體共通欄位（供合併／LWW 使用） */
export interface HasIdUpdatedDeleted {
    id: string;
    updatedAt?: string;
    /** ISO8601；存在表示已刪除（墓碑），仍留在陣列內供同步合併 */
    deletedAt?: string;
}

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
    deletedAt?: string;
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
    deletedAt?: string;
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
    deletedAt?: string;
}

// 使用者自訂欄位 (e.g. 緊急預備金、保險)
export interface CustomCategory {
    id: string;
    name: string;
    amount: number;
    note: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

// 總資產入金紀錄
export interface CapitalDeposit {
    id: string;
    amount: number;
    note: string;
    date: string;
    updatedAt?: string;
    deletedAt?: string;
}

// 總資產提領紀錄 (新增)
export interface CapitalWithdrawal {
    id: string;
    amount: number;
    note: string;
    date: string;
    updatedAt?: string;
    deletedAt?: string;
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
    deletedAt?: string;
}

/** 入金池建立／調撥／移除（供報表流水與同步合併） */
export type PoolLedgerEntryAction =
    | 'POOL_CREATE'
    | 'POOL_ALLOCATE'
    | 'POOL_WITHDRAW'
    | 'POOL_REMOVE';

export interface PoolLedgerEntry {
    id: string;
    poolId: string;
    poolName: string;
    marketType: StockAssetType;
    action: PoolLedgerEntryAction;
    date: string;
    updatedAt: string;
    /** 台幣池：金額為台幣 */
    amountTWD?: number;
    /** 美股池：金額為美元 */
    amountUSD?: number;
    note?: string;
    deletedAt?: string;
}

// 資金管理狀態
export interface CapitalState {
    masterTwdTotal: number;
    totalCapitalPool: number;
    capitalDeposits: CapitalDeposit[];
    capitalWithdrawals: CapitalWithdrawal[]; // 新增：提領紀錄
    pools: AssetPool[];
    /** 入金池操作流水（建立、主帳↔池調撥、移除）；舊資料可能為空陣列 */
    poolLedger: PoolLedgerEntry[];
    usdAccountCash: number;
    usStockFundPool: number;
    exchangeRateUSD: number;
}

// 持倉與交易狀態
export interface HoldingState {
    transactions: Transaction[];
    holdings: StockHolding[];
    customCategories: CustomCategory[];
    isConfigured: boolean;
}

// 同步狀態
export interface SyncState {
    lastSyncedAt?: string;
    /** 本地資料意圖綁定的帳號；null 表示從未與帳號綁定；undefined 表示舊版尚未標記 */
    localDataOwnerId?: string | null;
    /** 離線期間有待上傳變更（由 sync 層更新） */
    pendingUpload?: boolean;
}

export interface PortfolioState extends CapitalState, HoldingState, SyncState {}

export interface CapitalActions {
    setCapitalPool: (amount: number) => void;
    addCapitalDeposit: (params: { amount: number; note: string }) => void;
    removeCapitalDeposit: (id: string) => void;
    addCapitalWithdrawal: (params: { amount: number; note: string }) => void; // 新增：提領動作
    setExchangeRate: (rate: number) => void;
    addPool: (name: string, type: StockAssetType, initialAmount?: number) => void;
    removePool: (id: string) => void;
    allocateToPool: (poolId: string, amount: number) => void;
    withdrawFromPool: (poolId: string, amount: number) => void;
    setUsStockFundPool: (amount: number) => void;
    getUsStockAvailableCapital: () => number;
}

export interface HoldingActions {
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
    removeTransaction: (id: string) => void;
    getAvailableCapital: () => number;
    getAssetTotals: () => Record<AssetType, number>;
    buyStock: (params: {
        type: StockAssetType;
        name: string;
        symbol?: string;
        action?: 'BUY' | 'SELL';
        shares: number;
        pricePerShare: number;
        totalCost: number;
        totalCostUSD?: number;
        exchangeRate?: number;
        note?: string;
        poolId?: string;
    }) => void;
    removePurchase: (holdingId: string, purchaseId: string) => void;
    updateHoldingName: (id: string, name: string) => void;
    updateHoldingQuote: (id: string, currentPrice: number) => void;
    updateHoldingPool: (id: string, poolId: string) => void;
    removeHolding: (id: string) => void;
    getHoldingsByType: (type: StockAssetType) => StockHolding[];
    getHoldingsTotalByType: (type: StockAssetType) => number;
    updatePurchase: (holdingId: string, purchaseId: string, updates: {
        action?: 'BUY' | 'SELL';
        shares?: number;
        pricePerShare?: number;
        totalCost?: number;
        totalCostUSD?: number;
        exchangeRate?: number;
        note?: string;
    }) => void;
    fetchQuotesForHoldings: () => Promise<void>;
    addCustomCategory: (params: { name: string; amount: number; note: string }) => void;
    updateCustomCategory: (id: string, updates: { name?: string; amount?: number; note?: string }) => void;
    removeCustomCategory: (id: string) => void;
    getCustomCategoriesTotal: () => number;
}

export interface SyncActions {
    overwriteState: (newState: PortfolioState) => void;
    setLocalDataOwnerId: (id: string | null) => void;
    setPendingUpload: (pending: boolean) => void;
    restoreFromSnapshot: () => boolean;
}

export interface PortfolioActions extends CapitalActions, HoldingActions, SyncActions {
    isLoadingQuotes: boolean;
    resetAll: () => void;
}

export type PortfolioStore = PortfolioState & PortfolioActions;

export interface AssetSummary {
    type: AssetType;
    totalAmount: number;
    percentage: number;
}
