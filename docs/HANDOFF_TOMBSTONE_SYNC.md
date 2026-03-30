# Portfolio Tracker — Tombstone／同步 交接報告

> 建立目的：延續除錯與實作；新對話可讀此檔取得完整脈絡。

## 1. 專案與分支

| 項目 | 說明 |
|------|------|
| **GitHub** | `https://github.com/chobits1012/Money-Buddy.git` |
| **功能分支** | `feature/tombstone-soft-delete` |
| **主要 commit** | `7e5d46e` — tombstone／軟刪除整包實作 |
| **後續修正** | `b89566c` — 同步時讀取本機狀態的時序修正（見 §4） |
| **使用者測試網址（範例）** | `money-buddy-git-feature-tombston-…vercel.app`（Vercel Preview，分支名在 URL 會被截短） |

---

## 2. 原始問題與目標

- **現象**：本機刪除後，經雲端同步（聯集 + LWW）又被舊資料蓋回，刪掉的項目「復活」。
- **目標**：刪除改為軟刪（`deletedAt` + 更新 `updatedAt`），合併時 **刪除優先於對方 `updatedAt`**（與規格一致），並保留離線／多裝置同步能力。
- **巢狀**：`StockHolding.purchases`（`PurchaseRecord`）需獨立 tombstone 合併，不能只比外層 `holding.updatedAt`。

---

## 3. 已完成的實作（`7e5d46e` 為主）

### 3.1 型別

- 檔案：`src/types/index.ts`
- 可同步且可刪的實體加上 `deletedAt?: string`（含 `PurchaseRecord`、`StockHolding`、`Transaction`、`CustomCategory`、`CapitalDeposit`、`CapitalWithdrawal`、`AssetPool`、`PoolLedgerEntry`）。
- 新增介面 `HasIdUpdatedDeleted`（供合併語意對齊）。

### 3.2 共用工具

- 檔案：`src/utils/entityActive.ts` — `isActive`、`filterActive`（`!entity.deletedAt`）。

### 3.3 合併邏輯

- 檔案：`src/utils/syncMerge.ts`
- 通用：`mergeArrayByTombstone` + `mergePairByTombstone`（先比墓碑與對方「有效更新時間」，再 LWW）。
- 持倉：`mergeStockHolding` — 先合併 `purchases`，再合併外層 meta；`recalcHolding` 後**保留**合併裁決的 `updatedAt`／`deletedAt`（避免 `recalcHolding` 每次把 `updatedAt` 設成「現在」導致下次同步永遠本機勝）。

### 3.4 重算與對帳

- `src/utils/finance.ts` — `recalcHolding` 只對 **active** purchases 聚合。
- `src/utils/reconcilePortfolioState.ts` — 加總時 `filterActive` deposits／withdrawals／pools／holdings／customCategories。
- `src/utils/dashboardMetrics.ts` — `buildDashboardAllocationView` 入口先過濾 active；`selectPoolBuckets` 內過濾 active pools；`calculateMasterCapitalTotal` 等同理。

### 3.5 會計

- `src/utils/accounting.ts` — 買入時若 holding 曾軟刪則清 `deletedAt`；`calculateRemovalImpact` 改軟刪 purchase；已刪 purchase 再操作會丟錯；`calculateUpdateImpact` 更新時清 purchase 的 `deletedAt`。

### 3.6 Store（Zustand）

- `src/store/slices/holdingSlice.ts` — `remove*` 改軟刪；更新類清 `deletedAt`；`getHoldingsByType`／資金相關計算用 `isActive`；`fetchQuotesForHoldings` 不更新已刪 holding。
- `src/store/slices/capitalSlice.ts` — 入金／池軟刪；`allocate`／`withdraw`／`getUsStockAvailableCapital` 只找 active pool／holding。

### 3.7 UI／匯出

- Dashboard、CapitalOverview、Holdings 相關元件、`TransactionHistory`、`HoldingCard`、匯出 `reportLedger`／`buildWorkbook` 等路徑已對列表或迴圈做 active 過濾（細節見 git diff）。

### 3.8 測試

- `src/utils/syncMerge.test.ts` 已加 tombstone／巢狀 purchase 等案例。
- 全專案 `npm test`（Vitest）與 `tsc --noEmit` 在修正當下皆通過。

---

## 4. 已做的第二階段修正（`b89566c`）

### 問題（推論）

- `useSupabaseSync` 的 `syncWithServer` 原先在 **`await fetchCloudBackup` 之前**就 `getState()`。
- 若在**拉雲端期間**使用者才刪除，合併用的是**過期本機快照**，`overwriteState` 會把「刪除後的記憶體狀態」蓋掉 → 行為像刪除後幾秒又回來。

### 修正

- 檔案：`src/hooks/useSupabaseSync.ts`
- **先 await 雲端，再 `getState()`**，再用最新本機與雲端做 `syncMerge`。

---

## 5. 仍存在的問題（使用者實測）

- **環境**：無痕視窗、Vercel Preview（`feature/tombstone…` 網址）。
- **現象**：刪除後，**約幾秒內資料又回來**（與「同步／debounce 觸發」時間尺度相近）。
- **已排除（或需再驗證）**：
  - 不一定是「另一分頁舊版」：無痕仍發生。
  - 部署 commit 是否為 `b89566c`：**需在 Vercel Deployment 畫面核對**；若仍為 `7e5d46e` 則未含 §4 修正。

---

## 6. 建議後續排查方向（給下一個對話／開發者）

1. **確認線上 JS 版本**  
   - Vercel 該次部署的 **Git SHA** 是否為 `b89566c`（或更新）。  
   - 必要時在 UI 暫時顯示 build 時間或 commit 以利除錯。

2. **同步與 debounce 路徑**  
   - `useSupabaseSync.ts`：`subscribe` + `DEBOUNCE_DELAY`（2000ms）會在每次 store 變更後觸發 `syncWithServer`。  
   - 檢查是否仍有：**`isPullingRef` 為 true 時略過 subscribe，且 sync 結束後未補排程**，導致某次合併仍舊或與 persist 互搶。  
   - 檢查 **persist（`portfolioStore`）rehydrate／write** 與 **overwriteState** 的先後是否會在少數時序下覆寫。

3. **合併語意邊角**  
   - 裝置時間嚴重錯誤時，`localDeleted > cloudUpdated` 可能不成立，雲端舊筆「看起來較新」而復活。  
   - `mergeHoldingMeta` 只用 `holding.updatedAt`（未含 `createdAt`），極端缺欄資料是否影響裁決。  
   - 若刪的是 **transaction／category／deposit** 等，確認 UI 刪除路徑確實寫入 `deletedAt` 且該次 **upsert 的 `portfolio_data`** 內可見（Supabase 除錯）。

4. **Supabase 實查**  
   - 刪除後立刻查 `user_backup.portfolio_data`：對應 `id` 是否出現 `deletedAt`。  
   - 若沒有 → 上傳或本地合併前即遺失。  
   - 若有但 UI 仍顯示 → 讀取路徑未過濾或狀態被覆寫。

5. **其他入口覆寫狀態**  
   - `resolveAccountSwitchUseCloud` 等路徑是否**未經 `syncMerge`** 直接 `overwriteState(cloud)`（帳號切換流程與一般登入不同）。

---

## 7. 重要檔案索引

| 用途 | 路徑 |
|------|------|
| 同步合併 | `src/utils/syncMerge.ts` |
| 同步 hook | `src/hooks/useSupabaseSync.ts` |
| 型別 | `src/types/index.ts` |
| Active 判斷 | `src/utils/entityActive.ts` |
| 對帳 | `src/utils/reconcilePortfolioState.ts` |
| 持倉重算 | `src/utils/finance.ts` |
| 會計 | `src/utils/accounting.ts` |
| Slices | `src/store/slices/holdingSlice.ts`、`capitalSlice.ts` |
| 合併測試 | `src/utils/syncMerge.test.ts` |
| 啟動 rehydrate | `src/main.tsx` |

---

## 8. 本機指令

```bash
git fetch origin
git checkout feature/tombstone-soft-delete
npm install
npm test
npx tsc --noEmit
npm run dev
```

---

## 9. 狀態總結

軟刪與 tombstone 合併已實作並推上 GitHub；已修正「拉雲端前讀本機」的競態；**使用者在 Vercel 無痕下仍回報刪除後數秒復活**，需在**確認部署版本**的前提下，繼續從 **debounce 同步／persist／其他 overwriteState 路徑／Supabase 實際 JSON** 追查。
