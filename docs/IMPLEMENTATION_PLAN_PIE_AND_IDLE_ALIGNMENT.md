# 實作計劃書：圓餅閒置與大卡片對齊（階段 A + B）

**版本**：1.0  
**目的**：修正圓餅圖「主帳戶未分配資金」與總資產不一致（閒置多算、扇形加總超過主資本）的問題；先以**最小改動**對齊大卡片邏輯，再**收斂為單一資料來源**，降低未來再次分叉的風險。  
**原則**：每一步可獨立驗收、可回滾；**不**重寫會計引擎（`finance.ts` / `accounting.ts` / store slices），**只**調整儀表板指標的組裝方式。

---

## 一、問題與目標（簡述）

| 現象 | 原因（已確認） |
|------|----------------|
| 圓餅：台股 + 美股 + 閒置 **>** 總資產 | 閒置使用 `calculateGlobalIdleCapital(totalCapitalPool, …)`，與大卡片的 `calculateFundingMetrics` 閒置定義不同；等價於**美股已占用的額度未從閒置扣乾淨**。 |
| 大卡片閒置正確 | `idleCapital = masterCapitalTotal − allocatedCapital`，其中 `allocatedCapital` 已含美股換算台幣塊。 |

**驗收標準（Definition of Done）**

| 編號 | 條件 |
|------|------|
| D1 | 在與你相同的資料情境下，圓餅「主帳戶未分配資金」**等於**大卡片閒置（四捨五入允許 ±1 元）。 |
| D2 | 圓餅各扇形（台股、美股、基金、加密、各自訂欄位、閒置）加總 **=** `masterCapitalTotal`（同上 ±1）。 |
| D3 | `npm run build` 與 `npm test` 通過。 |
| D4 | 未修改 `src/utils/finance.ts`、`src/utils/accounting.ts`、`src/store/slices/*.ts` 的會計規則（除非事後發現與本計畫無關的 bug，另開議題）。 |

---

## 二、非目標與禁止範圍（避免「修到累」又擴散）

- **不**改：買賣入帳、池子增減、`recalcHolding`、雲端 `syncMerge` / `reconcilePortfolioState` 的數學。
- **不**改：大卡片上「已實現／未實現損益」的加總邏輯（`Dashboard.tsx` 內 forEach）。
- **本計畫完成前**，避免順手重構 `CapitalOverview` 的 props 命名或其他畫面。

若階段 B 要動到 `calculateAllocationMetrics` 的**對外行為**，必須先補測試再改。

---

## 三、階段 A — 最小修正（先對齊、風險最低）

**目標**：只讓圓餅的「閒置」與大卡片使用**同一個** `idleCapital`（`calculateFundingMetrics`）。

### A.1 實作細項

| 步驟 | 動作 | 檔案 |
|------|------|------|
| A.1.1 | 在 `AllocationChart` 中，除既有的 `calculateAllocationMetrics` 外，以與 `Dashboard.tsx` **相同欄位**呼叫 `calculateFundingMetrics`，取得 `idleCapital`。 | `src/components/dashboard/AllocationChart.tsx` |
| A.1.2 | 圓餅資料裡「主帳戶未分配資金」的數值改為使用 **A.1.1 的 `idleCapital`**，**不要**使用 `calculateAllocationMetrics` 回傳的 `idleCapital`。 | 同上 |
| A.1.3 | `assetTotals`、自訂欄位列表仍沿用 `calculateAllocationMetrics`（避免一次動太多）。 | 同上 |

### A.2 驗證（必做）

1. **手動**：用你目前的真實資料（總資產 5678660、兩軍團 400 萬、美股入金換算約 493807）確認：三塊主要扇形 + 自訂 + 閒置 = 總資產；閒置 = 1184853。  
2. **指令**：`npm test`、`npm run build`。

### A.3 風險與緩解

| 風險 | 緩解 |
|------|------|
| `Dashboard` 與 `AllocationChart` 傳入 `calculateFundingMetrics` 的參數不一致 | 複製貼上時以 `Dashboard.tsx` 的呼叫為**唯一範本**；或抽成常數物件（留給階段 B）。 |
| 極少數邊界下扇形加總與 master 差 1～2 元 | 四捨五入造成；可接受則記錄在驗收表；若不可接受則在階段 B 用「由 master 反推閒置」做最後校準（選做）。 |

### A.4 完成定義

- 達成 **D1～D3** 即可視為階段 A 完成；**D4** 維持（不改會計核心檔）。

---

## 四、階段 B — 單一來源收斂（慢慢做、可與 A 間隔一版）

**目標**：儀表板「資金配置」相關數字只經過 **一個** 組裝函式產出，避免 `AllocationChart` 與 `Dashboard` 各呼叫兩個函式再拼裝。

### B.1 實作細項

| 步驟 | 動作 | 檔案 |
|------|------|------|
| B.1.1 | 在 `dashboardMetrics.ts` 新增純函式（建議名稱）：`buildDashboardAllocationView(input)`，回傳型別含：`masterCapitalTotal`、`idleCapital`、`allocatedCapital`、`assetTotals`、`customCategories`（與圓餅需要的一致）。 | `src/utils/dashboardMetrics.ts` |
| B.1.2 | 實作方式：**內部**呼叫 `calculateFundingMetrics` 取得 `masterCapitalTotal`、`idleCapital`、`allocatedCapital`；**內部**沿用現有 `calculateAllocationMetrics` 的邏輯產出 `assetTotals` 與 `customCategories`，但 **丟棄** 其 `idleCapital`（改由 funding 覆蓋）。或將 `assetTotals` 的計算抽成私有函式，避免重複程式碼。 | 同上 |
| B.1.3 | `AllocationChart` 改為**只**依賴 `buildDashboardAllocationView`（或僅從此匯出之型別）。 | `src/components/dashboard/AllocationChart.tsx` |
| B.1.4 | `Dashboard` 大卡片若僅需 `masterCapitalTotal` / `idleCapital`，改為從 `buildDashboardAllocationView` 取用**同一包**結果（避免兩處各算一次 funding）。 | `src/components/dashboard/Dashboard.tsx` |
| B.1.5 | 更新 `dashboardMetrics.test.ts`：新增「扇形加總 = master」的 fixture（可用你提供的數字做成物件）；既有測試維持綠燈。 | `src/utils/dashboardMetrics.test.ts` |

### B.2 `calculateAllocationMetrics` 的處理（避免搞壞別人）

- 目前僅 **AllocationChart** 使用（已 grep）。  
- **建議**：階段 B 完成後，將 `calculateAllocationMetrics` 標為 `@deprecated` 註解，或改為內部呼叫 `buildDashboardAllocationView` 並 map 回舊形狀（若你希望保留向後相容）。  
- **不要**在未跑測試前刪除公開 export。

### B.3 驗證

- 同階段 A 手動案例 + **D2** 的自動化測試。  
- 全專案 `npm test`、`npm run build`。

### B.4 完成定義

- **D1～D4** 全部滿足，且 `AllocationChart` / `Dashboard` 不再各自拼兩套 metrics。

---

## 五、建議執行順序（一步一步）

1. **只做階段 A** → 發版或你自己驗收通過後再開 B。  
2. **階段 B** 挑空檔做；每完成 B.1.1～B.1.2 就先跑測試，再改元件。  
3. 任何一步若測試失敗，**先還原該 commit / 該檔**，不要邊改會計邊改 UI。

---

## 六、手動驗收表（可列印勾選）

| 項目 | 結果 |
|------|------|
| 大卡片閒置與圓餅「主帳戶未分配資金」一致 | ☐ |
| 圓餅全部扇形加總 = 大卡片總資產（主資本） | ☐ |
| 有自訂欄位時加總仍成立 | ☐ |
| 有美股池／台幣池／主帳直持混合時加總仍成立 | ☐ |
| `npm test` 全過 | ☐ |
| `npm run build` 通過 | ☐ |

---

## 七、回滾策略

- 階段 A：僅動 `AllocationChart.tsx` 時，git 還原單一檔即可。  
- 階段 B：建議獨立 branch；若 `buildDashboardAllocationView` 有問題，可先回退 B.1.3～B.1.4，保留 A 的行為。

---

## 八、相關檔案索引

| 檔案 | 角色 |
|------|------|
| `src/utils/dashboardMetrics.ts` | `calculateFundingMetrics`、`calculateAllocationMetrics`、`calculateGlobalIdleCapital` |
| `src/components/dashboard/AllocationChart.tsx` | 圓餅資料來源 |
| `src/components/dashboard/Dashboard.tsx` | 大卡片 `calculateFundingMetrics` |
| `src/utils/dashboardMetrics.test.ts` | 單元測試擴充處 |

---

**文件結尾**：實作時建議在 PR / commit 註明「僅儀表板指標組裝；未改會計引擎」，方便日後追查。
