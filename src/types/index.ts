// 採用嚴格型別定義資產與紀錄 (遵循 typescript-expert 規範)

export type AssetType = 'TAIWAN_STOCK' | 'US_STOCK' | 'BONDS' | 'FUNDS';

export interface Transaction {
    id: string;
    type: AssetType;
    amount: number; // 統一使用台幣
    amountUSD?: number; // 如果是美股，可選擇紀錄當時的美金金額
    exchangeRate?: number; // 當時匯率
    date: string; // ISO 格式字串
    note: string;
    action: 'DEPOSIT' | 'WITHDRAWAL'; // 投入或取回
}

export interface PortfolioState {
    totalCapitalPool: number; // 初始總資金水位 (TWD)
    exchangeRateUSD: number;  // 當前全域美金匯率 (用於即時顯示)
    transactions: Transaction[];
    isConfigured: boolean; // 是否已完成初始設定
}

// 供圖表與儀表板使用的衍生資料型別
export interface AssetSummary {
    type: AssetType;
    totalAmount: number;
    percentage: number;
}
