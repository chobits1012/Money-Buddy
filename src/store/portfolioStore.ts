import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PortfolioState, Transaction, AssetType } from '../types';
import { DEFAULT_USD_RATE } from '../utils/constants';

// 定義完整的 Zustand Store 型別，包含狀態與異動方法
interface PortfolioStore extends PortfolioState {
    // 設定初始資本
    setCapitalPool: (amount: number) => void;
    // 更新美金匯率
    setExchangeRate: (rate: number) => void;
    // 新增交易紀錄 (驗證與計算邏輯將在 Component 或 Service 中呼叫此處)
    addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
    // 刪除交易紀錄
    removeTransaction: (id: string) => void;
    // 獲得剩餘可用資金 (Getter)
    getAvailableCapital: () => number;
    // 獲得各項資產加總 (Getter)
    getAssetTotals: () => Record<AssetType, number>;
    // 重置所有資料 (危險操作)
    resetAll: () => void;
}

const initialState: PortfolioState = {
    totalCapitalPool: 0,
    exchangeRateUSD: DEFAULT_USD_RATE,
    transactions: [],
    isConfigured: false,
};

// 使用 Zustand 建立 Store，並掛載 persist middleware 以安全寫入 LocalStorage
export const usePortfolioStore = create<PortfolioStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            setCapitalPool: (amount: number) => {
                // [防禦性程式碼] 防止惡意輸入
                if (amount < 0 || isNaN(amount)) return;
                set({ totalCapitalPool: amount, isConfigured: true });
            },

            setExchangeRate: (rate: number) => {
                if (rate <= 0 || isNaN(rate)) return;
                set({ exchangeRateUSD: rate });
            },

            addTransaction: (payload) => {
                const newTransaction: Transaction = {
                    ...payload,
                    id: crypto.randomUUID(), // 使用瀏覽器內建安全的 UUID 生成
                    date: new Date().toISOString(),
                };

                set((state) => ({
                    transactions: [newTransaction, ...state.transactions],
                }));
            },

            removeTransaction: (id: string) => {
                set((state) => ({
                    transactions: state.transactions.filter((t) => t.id !== id),
                }));
            },

            getAssetTotals: () => {
                const state = get();
                // 初始化累加器
                const totals: Record<AssetType, number> = {
                    TAIWAN_STOCK: 0,
                    US_STOCK: 0,
                    BONDS: 0,
                    FUNDS: 0,
                };

                // 遍歷所有紀錄計算 (投入加, 取回減)
                state.transactions.forEach((t) => {
                    if (t.action === 'DEPOSIT') {
                        totals[t.type] += t.amount;
                    } else if (t.action === 'WITHDRAWAL') {
                        totals[t.type] -= t.amount;
                    }
                });

                // 確保沒有負數情況 (避免浮點或刪除順序導致的邊界異常)
                (Object.keys(totals) as AssetType[]).forEach(k => {
                    if (totals[k] < 0) totals[k] = 0;
                });

                return totals;
            },

            getAvailableCapital: () => {
                const state = get();
                const totals = state.getAssetTotals();
                const totalInvested = Object.values(totals).reduce((sum, val) => sum + val, 0);

                const available = state.totalCapitalPool - totalInvested;
                return available > 0 ? available : 0;
            },

            resetAll: () => {
                set(initialState);
            },
        }),
        {
            name: 'portfolio-tracker-storage', // LocalStorage 的 key
            // 確保就算資料損毀，也不會讓整個 App Crush (防脫軌機制)
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.error('復原 LocalStorage 資料時發生錯誤:', error);
                }
            },
        }
    )
);
