# Phase E — 可分配餘額統一 + 首頁基金損益 交接規劃書

專案：portfolio-tracker（Money-Buddy）  
前置文件：`@docs/FUND_PHASE_C_HANDOVER.md`（基金淨值 API，Phase C/D 背景）  
交接日期：2026-06-09  
用途：**新對話請直接讀取本檔 `@docs/PHASE_E_FUNDING_PNL_HANDOVER.md`**，無需再貼舊討論。

---

## 一、背景與使用者已確認決策

### 1.1 問題來源

使用者發現三個畫面數字不一致（實際帳本截圖驗證）：

| 畫面 | 顯示標籤 | 錯誤數字 | 正確數字 |
|------|---------|---------|---------|
| Dashboard 大卡片 | 總閒置資金 (TWD) | — | **$729,658** ✅ |
| 台股 → 入金池管理右上角 | 可用餘額 | $1,225,660 ❌ | 應為 **$729,658** |
| 基金 → 入金池管理右上角 | 可用餘額 | $1,225,660 ❌ | 應為 **$729,658** |

差額 **$496,002** ≈ 美股帳戶 TWD 等值（`usdAccountCash × exchangeRateUSD`）。

### 1.2 使用者產品定義（已確認，不可再辯論兩套口徑）

> **可再投入／可分配餘額 = 財產總額 − 台股 − 美股 − 基金（＋自訂類別等已配置項目）**

- 撥入美股的錢**必須**算在「已分配」裡。
- 不存在「忽略美股、只看 TWD 主帳戶」的第二套「可用餘額」對使用者有意義。
- 全系統只應有一個數字回答：「我還能在各處分派多少？」

### 1.3 本 Phase 目標（兩條工作線）

| 代號 | 內容 | 優先 |
|------|------|------|
| **E-1** | 統一「可分配餘額」為 `idleCapital`，修正所有誤用 `getGlobalFreeCapital()` 的 UI 與驗證 | P0 |
| **E-2** | 首頁（Dashboard）補上基金損益細項 + 進首頁刷新基金 NAV（原 Phase D） | P1 |

---

## 二、現況技術盤點

### 2.1 正確算法（應成為唯一使用者口徑）

**來源：** `src/utils/dashboardMetrics.ts` → `calculateFundingMetrics()` → `idleCapital`

```typescript
// 已分配 = TWD 軍團預算總和 + 非軍團 TWD 持倉 + 自訂類別 + 美股帳戶 TWD 等值
const allocatedCapital =
    twdAllocatedTotal + directGlobalTwdInvested + customTotal + usdAccountTwd;
const idleCapital = masterCapitalTotal - allocatedCapital;
```

**組裝入口：** `buildDashboardAllocationView()` — Dashboard 大卡片、圓餅圖、Excel 匯出已使用。

**使用者實際驗證（截圖）：**

```
$5,678,660  主資本（masterTwdTotal）
− $4,000,000  台股軍團（月配息 300 萬 + 進攻大將軍 100 萬）
−   $453,000  基金軍團（基金大軍）
−   $496,002  美股帳戶 TWD 等值
=   $729,658  idleCapital ✅
```

### 2.2 錯誤算法（造成幽靈數字 $1,225,660）

**來源：** `src/store/slices/holdingSlice.ts` → `getGlobalFreeCapital()`

```typescript
// 只問 TWD 主帳戶現金，完全忽略美股帳戶
globalFree = totalCapitalPool - totalInvestedGlobal - customTotal;
```

在本案例中：`$5,678,660 − $4,453,000 = $1,225,660`（美股未扣）。

**為何會發生：** 撥入美股時 `addTransaction(DEPOSIT)` 會從 `totalCapitalPool` 扣款；但若美股帳戶來自舊資料／初始設定未走此路徑，`totalCapitalPool` 會偏高，而 `idleCapital` 仍正確扣除美股。

### 2.3 第三套未使用算法（勿誤用）

`getAvailableCapital()` = globalFree + US free TWD + 所有軍團 currentCash — **比真實可分配更大**，目前 UI 未用，實作時勿改為顯示此函式。

### 2.4 基金損益首頁現況

| 項目 | 狀態 |
|------|------|
| 總未實現／已實現損益加總 | ✅ 基金已計入 `Dashboard.tsx` 的 `else` 分支 |
| 「分市場損益」展開細項 | ❌ 只有台股、美股，無基金列 |
| 進首頁刷新 NAV | ❌ `Dashboard.tsx` 只呼叫 `fetchQuotesForHoldings()`，未呼叫 `fetchFundNavForHoldings()` |
| 基金頁內 NAV | ✅ `HoldingsPage` 進入 `FUNDS` 時會刷新 |

---

## 三、E-1 可分配餘額統一 — 實作規格

### 3.1 設計原則

1. **單一真實來源（SSOT）：** 使用者看到的「可分配餘額」= `idleCapital`（來自 `buildDashboardAllocationView` 或等價 store helper）。
2. **`getGlobalFreeCapital()` 不再用於使用者可見的「剩餘可分配」語意**；可保留為內部帳本輔助或標記 `@deprecated`。
3. **軍團內視圖例外：** 進入單一軍團後，「目前可用資金」仍為 `pool.currentCash`（該池可下單金額）— 語意不同，不與全局可分配餘額混淆。
4. **標籤統一建議：**
   - Dashboard 大卡片：`可分配餘額 (TWD)`（取代「總閒置資金」，或兩者並列過渡一版後統一）
   - 台股／基金／美股軍團列表右上角：同標籤、同數字
   - 說明 tooltip 改為：「已扣除台股、基金軍團預算、美股帳戶與自訂類別後，尚可再配置的金額」

### 3.2 建議新增 store helper

在 `holdingSlice.ts` 或 `capitalSlice.ts` 新增（擇一，避免 Dashboard 以外到處重複組參數）：

```typescript
getIdleCapital: () => number
```

實作：從 `get()` 取 state，呼叫 `calculateFundingMetrics({ ... })` 回傳 `idleCapital`。  
**不要**在 UI 元件內手動拼公式。

### 3.3 需修改檔案清單

| 檔案 | 現況 | 改為 |
|------|------|------|
| `src/components/dashboard/CapitalPools.tsx` | `getGlobalFreeCapital()` 顯示「可用餘額」；撥款 `max` 同此值 | 非美股：`getIdleCapital()`；標籤改「可分配餘額」 |
| `src/components/holdings/HoldingsPage.tsx` | 軍團列表層 `getGlobalFreeCapital()` | 非軍團、非美股上下文：`getIdleCapital()` |
| `src/components/holdings/FundTransferDrawer.tsx` | IN 模式上限 `getGlobalFreeCapital()` | `getIdleCapital()`；錯誤訊息文案同步 |
| `src/components/holdings/HoldingFormDrawer.tsx` | 非 pool、非美股買入上限 `getGlobalFreeCapital()` | `getIdleCapital()`（非軍團直接買入會增加已分配） |
| `src/components/dashboard/CustomCategoryDrawer.tsx` | `getGlobalFreeCapital()` | `getIdleCapital()` |
| `src/components/dashboard/CapitalOverview.tsx` | 標籤「總閒置資金」；說明文字不精確 | 更新標籤與 `showFundingHint` 說明（見 3.5） |
| `src/store/slices/capitalSlice.ts` | `allocateToPool` 僅檢查 `totalCapitalPool` | 增加 `amount <= getIdleCapital()` 防護（TWD 池） |
| `src/store/slices/holdingSlice.ts` | `addTransaction` DEPOSIT 僅檢查 `totalCapitalPool` | 改為檢查 `idleCapital`（或兩者 min） |

**美股軍團列表頁** `CapitalPools type=US_STOCK`：  
- 撥款操作上限仍用 `getUsStockAvailableCapital()`（USD 戰備池語意）。  
- 右上角若顯示全局可分配，改顯示 `getIdleCapital()` TWD **或** 維持 USD 口徑但加小字「全局可分配 NT$xxx」— **建議採前者（統一 TWD 數字）**，與使用者期望一致。

### 3.4 `getGlobalFreeCapital()` 處置

**選項 A（建議）：** 保留函式，加 JSDoc `@deprecated` — 「僅內部帳本；UI 請用 getIdleCapital」。

**選項 B：** 刪除並以 `calculateGlobalIdleCapital` / funding metrics 取代所有引用。

實作後 `grep getGlobalFreeCapital` 應只剩 deprecated 定義或測試。

### 3.5 文案更新（CapitalOverview）

現有說明（不精確）：

> 已分配包含：台股/基金/美股帳戶與各軍團；未分配為主帳戶可再配置資金。

**建議改為：**

> 可分配餘額 = 主資本總額 − 台股／基金軍團預算 − 美股帳戶 − 非軍團持倉 − 自訂類別。此數字與各市場入金池頁右上角一致。

### 3.6 撥款 Modal 邏輯

`CapitalPools.tsx` 撥款 `max` 目前：

```typescript
setFundModal({ action: 'ALLOCATE', pool, max: availableBalance });
```

改後：

```typescript
const deployable = isUSStock ? getUsStockAvailableCapital() : getIdleCapital();
// TWD 撥款實際還受 totalCapitalPool 限制（主帳戶現金）
const max = isUSStock ? deployable : Math.min(deployable, totalCapitalPool);
```

若 `totalCapitalPool > idleCapital`（資料不一致），**以較小者為準**，避免使用者以為還能分配實際已配置給美股的金額。

### 3.7 測試

新增／更新 `src/utils/dashboardMetrics.test.ts`：

1. **案例：有 TWD 軍團 + 美股帳戶** — `idleCapital` ≠ `getGlobalFreeCapital()`，且差額 = `usdAccountTwd`。
2. **案例：純 TWD、無美股** — 兩者應相等（回歸）。
3. **案例：撥款超過 idleCapital** — `allocateToPool` 應拒絕。

可選整合測試：`FundTransferDrawer` IN 模式輸入 > idleCapital 顯示錯誤。

---

## 四、E-2 首頁基金損益 — 實作規格（原 Phase D）

### 4.1 Dashboard 進首頁刷新 NAV

**檔案：** `src/components/dashboard/Dashboard.tsx`

```typescript
// 現有
useEffect(() => {
    fetchQuotesForHoldings();
}, [fetchQuotesForHoldings]);

// 新增（與 HoldingFormDrawer 提交後刷新模式一致）
useEffect(() => {
    void fetchFundNavForHoldings();
}, [fetchFundNavForHoldings]);
```

從 store 解構 `fetchFundNavForHoldings`。  
`isLoadingQuotes` 若需涵蓋基金，可擴充為 `isLoadingMarketData` 或基金獨立 spinner（最小改動：共用現有 sync icon）。

### 4.2 分市場損益 — 新增基金列

**檔案：** `src/components/dashboard/Dashboard.tsx`（彙總）

```typescript
let fundUnrealizedPnL = 0;
// forEach 內
} else if (h.type === 'FUNDS') {
    fundUnrealizedPnL += u;
    totalUnrealizedPnL += u;
    totalRealizedPnL += r;
} else {
    // CRYPTO 等
}
```

傳入 `CapitalOverview` 新 prop：`fundUnrealizedPnL: number`（可選 `fundRealizedPnL` 若要在細項顯示已實現；最小方案只做未實現，與台股列對齊）。

**檔案：** `src/components/dashboard/CapitalOverview.tsx`（顯示）

1. 展開條件改為：`(taiwan !== 0 || us !== 0 || fund !== 0)`
2. 在美股列下方新增（僅 `fundUnrealizedPnL !== 0` 時）：

```tsx
<div className="flex items-baseline ... text-[11px]">
    <span className="text-clay shrink-0">基金未實現</span>
    <span className={cn("font-semibold tabular-nums", ...)}>
        {fundUnrealizedPnL > 0 ? '+' : ''}{FORMAT_TWD.format(fundUnrealizedPnL)}
    </span>
</div>
```

樣式完全複製台股列，不新增 Card 區塊，維持美觀。

### 4.3 可選增強（非必做）

| 項目 | 說明 |
|------|------|
| 總未實現旁 `(含基金)` 提示 | 當 `fundUnrealizedPnL !== 0` 且細項收合時顯示 |
| 已實現細項 | 基金已實現目前只在總行；若需對稱可加第四列 |
| `isLoadingFundNav` | 基金刷新時顯示 loading |

### 4.4 測試

- 單元：Dashboard 彙總邏輯可抽成 `summarizePnLByMarket(holdings, exchangeRate)` 並測試 FUNDS 分支。
- 手動：`npm run dev` → 首頁應見基金未實現細項；未進基金頁前 NAV 也應更新（有 fundCode 的持倉）。

---

## 五、不需改動的範圍（避免 scope creep）

| 項目 | 原因 |
|------|------|
| `recalcHolding()` / `accounting.ts` | 損益引擎正確 |
| 軍團卡片「目前可用資金」`pool.currentCash` | 語意為池內可下單，與全局可分配不同 |
| 圓餅圖 `assetTotals` 算法 | 已與 `idleCapital` 加總等於 master |
| `docs/FUND_PHASE_C_HANDOVER.md` | 保留歷史；Phase D 改由本檔承接 |
| 舊資料遷移（簡易金額模式） | 本 Phase 不處理 |
| 49 檔缺 fundCode | 不阻擋 E-2，但無 code 的基金 NAV 仍為 0 |

---

## 六、建議實作順序與 Commit 策略

### 6.1 順序

```
Step 1  新增 getIdleCapital() + dashboardMetrics 測試（E-1 基礎）
Step 2  替換 CapitalPools / HoldingsPage / Drawers 顯示與驗證（E-1 UI）
Step 3  allocateToPool / addTransaction 防護（E-1 後端）
Step 4  CapitalOverview 文案（E-1 收尾）
Step 5  Dashboard fetchFundNav + fundUnrealizedPnL 彙總與顯示（E-2）
Step 6  全站手動回歸（見第七節）
```

### 6.2 建議 Commit（2～3 個）

1. `fix(funding): unify deployable balance as idleCapital across UI`
2. `feat(dashboard): show fund unrealized PnL and refresh NAV on load`
3. （可選）`test: funding metrics idle vs global free capital`

---

## 七、驗收清單（Acceptance Criteria）

### E-1 可分配餘額

- [ ] Dashboard 大卡片數字 = 台股入金池頁右上角 = 基金入金池頁右上角（同一帳本下）
- [ ] 使用者截圖案例：三處皆顯示 **$729,658**（非 $1,225,660）
- [ ] 撥入美股（FundTransferDrawer IN）上限不超過 idleCapital
- [ ] TWD 軍團撥款上限 ≤ idleCapital
- [ ] 自訂類別新增上限使用 idleCapital
- [ ] 進入單一軍團後，仍顯示該軍團 `currentCash`（行為不變）
- [ ] Excel 匯出閒置資金與 UI 一致（已用 idleCapital，回歸即可）
- [ ] `npm run test` 通過；`npx tsc -b` 通過

### E-2 基金損益

- [ ] 首頁「分市場損益」展開後有「基金未實現」列（有基金損益時）
- [ ] 首頁載入會觸發 `fetchFundNavForHoldings()`（有 fundCode 者更新）
- [ ] 台股／美股細項樣式與基金列一致，無新增大區塊破壞排版
- [ ] 總未實現數字 = 台股 + 美股（換算）+ 基金 + 其他（與改前總計一致或更準確）

---

## 八、關鍵檔案索引

| 路徑 | Phase | 角色 |
|------|-------|------|
| `src/utils/dashboardMetrics.ts` | E-1 | `idleCapital` SSOT |
| `src/store/slices/holdingSlice.ts` | E-1 | `getGlobalFreeCapital`、NAV fetch |
| `src/store/slices/capitalSlice.ts` | E-1 | `allocateToPool` 驗證 |
| `src/components/dashboard/CapitalPools.tsx` | E-1 | 入金池頁右上角數字 |
| `src/components/holdings/HoldingsPage.tsx` | E-1 | 持倉頁餘額 |
| `src/components/holdings/FundTransferDrawer.tsx` | E-1 | 美股撥入上限 |
| `src/components/holdings/HoldingFormDrawer.tsx` | E-1 | 買入上限 |
| `src/components/dashboard/CustomCategoryDrawer.tsx` | E-1 | 自訂類別上限 |
| `src/components/dashboard/CapitalOverview.tsx` | E-1/E-2 | 大卡片文案、分市場損益 UI |
| `src/components/dashboard/Dashboard.tsx` | E-2 | PnL 彙總、NAV 刷新 |
| `src/utils/dashboardMetrics.test.ts` | E-1 | 單元測試 |

---

## 九、新對話啟動指令（複製貼上）

```
請讀取 @docs/PHASE_E_FUNDING_PNL_HANDOVER.md 並依規劃實作 Phase E。
優先完成 E-1（可分配餘額統一），再完成 E-2（首頁基金損益）。
實作後跑 npm run test && npx tsc -b，並列出修改摘要與驗收結果。
```

---

## 十、已知風險與備註

1. **資料修復：** 若歷史資料中美股帳戶未正確扣減 `totalCapitalPool`，統一顯示 idleCapital 後數字會正確，但 `totalCapitalPool` 帳本可能仍偏高；可選後續用 `reconcilePortfolioState.ts` 修復，**本 Phase 不強制**。
2. **美股頁顯示 TWD idleCapital：** 使用者已要求全局單一數字；若覺得美股頁怪異，可第二迭代加副標。
3. **Phase C fundCode 31/80：** 無 code 的基金在首頁未實現仍為 0，屬資料問題非本 Phase bug。

---

*文件結束 — Phase E 交接*
