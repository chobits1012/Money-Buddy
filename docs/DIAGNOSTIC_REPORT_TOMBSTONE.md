# 診斷報告：Tombstone 軟刪除分支問題全面分析

> 建立時間：2026-03-30  
> 分支：`feature/tombstone-soft-delete`（相對 `main` 共 +714 / -224 行，21 個檔案）  
> 目的：供新對話接手，完整理解問題後再決定修復策略。

---

## 一、目前狀態

| 項目 | 說明 |
|------|------|
| main HEAD | `1f53ad8` — 正常運作的版本（硬刪除 + 聯集合併） |
| feature HEAD | `054b650` — 含 5 個 commit 的軟刪除實作 |
| 線上問題 | ① 刪除標的數秒後復活 ② 每次刪除軍團資金持續膨脹 |

### feature 分支 commit 歷史（由舊到新）

```
7e5d46e feat(sync): tombstone soft-delete (deletedAt) for merge and CRUD
b89566c fix(sync): read local state after cloud fetch to avoid wiping in-flight edits
9b6df0c docs: add tombstone/sync handoff for follow-up debugging
fde383e fix(sync): prevent deleted items from resurrecting after cloud sync
054b650 fix(sync): fix TS2352/TS2345 build errors in extractPortfolioData
```

---

## 二、Bug 1：刪除後標的復活

### 現象
使用者刪除一筆持倉，UI 上暫時消失，約 2~3 秒後又回來。

### 根因：tombstone 在 LWW 裁決中敗北

`mergePairByTombstone` 的邏輯：

```
if (localD > 0 && localD > cloudU)  → 本機刪除勝
if (cloudD > 0 && cloudD > localU)  → 雲端刪除勝
else                                 → LWW: updatedAt 較新者勝
```

敗北原因：**雲端的 `updatedAt` 被無意間刷新到比 `deletedAt` 更新**。

#### 時間線追蹤

```
T=0     初始同步：雲端資料載入，overwriteState
T=0.1   Dashboard/HoldingsPage 的 useEffect 觸發 fetchQuotesForHoldings()
T=0.5   報價 API 回來 → recalcHolding() 設定 updatedAt = "T=0.5"
T=0.5   subscribe 觸發 → debounce 2s → T=2.5 同步
T=2.5   syncWithServer → upsert 到雲端
        此時雲端每筆 active holding 的 updatedAt = "T=0.5"

T=3.0   使用者刪除 holding A → deletedAt = updatedAt = "T=3.0"
T=3.0   subscribe → debounce → T=5.0 同步
T=5.0   syncWithServer:
        - fetchCloudBackup → 雲端 A.updatedAt = "T=0.5"
        - localState → A.deletedAt = "T=3.0"
        - mergePairByTombstone: localD(3.0) > cloudU(0.5) → 刪除勝 ✓
```

以上在**時間線乾淨**的情況下，tombstone 應該勝出。但實際上可能出現：

```
T=3.0   使用者刪除 A → deletedAt = "T=3.0"
T=3.0   subscribe → debounce → T=5.0 同步
T=3.5   fetchQuotesForHoldings 再次觸發（頁面切換/re-render）
        → 但 isActive(A) = false，所以 A 不會被 recalcHolding 更新 ✓
```

然而在 054b650 修正前，`recalcHolding` 每次都把 `updatedAt` 設為 `now`，導致每次報價更新都會刷新雲端所有 holding 的 `updatedAt`。如果這個時戳與使用者刪除的時間差距很小（毫秒級），就有可能出現 **`cloudU >= localD`** 的情況。

### 另一個可能的復活路徑

即使 tombstone 勝出並上傳到雲端，如果中間有任何一次同步使用了**過時的 local snapshot**（例如 `resolveAccountSwitchMerge` 在修正前先讀 local 再 await 雲端），就可能把舊的不含 `deletedAt` 的版本寫回雲端。

---

## 三、Bug 2：軍團資金持續膨脹（嚴重）

### 現象
每次刪除標的，軍團資金（可用資金 / USD 帳戶）就增加。刪除 → 復活 → 再刪除 → 再增加，無限循環。

### 根因：雙重會計 —— 刪除的「退款」被立即執行，但復活時不會「扣回」

#### 刪除的財務副作用（holdingSlice.removeHolding）

```javascript
// 刪除時立即執行的資金調整：
totalCapitalPool += pnlDeltaTWD    // TWD 持倉：損益反轉
usdAccountCash   += pnlDeltaUSD    // USD 持倉：損益反轉
usStockFundPool  += pnlDeltaUSD
pools[i].allocatedBudget += delta   // 入金池：損益反轉
pools[i].currentCash     += delta
```

這些是**增量操作**（delta），直接加到當前數值上。

#### 同步合併時的資金矯正（reconcilePortfolioState）

```javascript
// TWD 路徑 — 封閉公式，完全從陣列重算：
totalCapitalPool = masterTwdTotal - twdPoolAllocated - globalTwdInvested - customTotal
// → 如果 holding 復活，globalTwdInvested 包含它，totalCapitalPool 會正確降低 ✓

// USD 路徑 — 單向地板（只會上升不會下降）：
safeUsd = Math.max(hint, minUsdBase)
// hint = 當前 local 或 cloud 的 usdAccountCash（已被刪除退款膨脹）
// minUsdBase = 復活的 US holdings + US pools
// → max 操作讓膨脹後的 hint 永遠不會被拉回來 ✗
```

#### 具體膨脹流程

##### 路徑 A：台股持倉在軍團（Pool）內 — 使用者實際遇到的情況

```javascript
// removeHolding 的 pool 更新邏輯：
pools: state.pools.map(p => p.id === holding.poolId ? {
    ...p,
    allocatedBudget: p.allocatedBudget + pnlDeltaTWD,     // 損益反轉
    currentCash:     p.currentCash     + cashDeltaTWD,     // 成本金額回流
} : p)
// 其中 cashDeltaTWD = Math.round(holding.totalAmount + pnlDeltaTWD)
```

| 步驟 | 事件 | pool.currentCash | pool 內持倉 | 說明 |
|------|------|------------------|-------------|------|
| 0 | 初始狀態 | NT$10,000 | 持倉 A (totalAmount = NT$50,000) | |
| 1 | 刪除 A | NT$60,000 | A.deletedAt 已設 | cashDeltaTWD = 50000，回流到軍團 |
| 2 | 同步（A 復活） | **NT$60,000** | A 回來了 | **reconcile 不會重算 pool.currentCash** |
| 3 | 再刪除 A | NT$110,000 | A.deletedAt 已設 | 又 +50,000 |
| 4 | 同步（A 復活） | **NT$110,000** | A 回來了 | currentCash 永遠不會被矯正 |
| … | 無限循環 | ∞ | | **每刪一次，軍團資金就膨脹 NT$50,000** |

**這就是使用者看到的「刪除台股持倉 → 軍團資金一直增加」的根因。**

UI 對應：`CapitalPools.tsx` 顯示 `pool.currentCash` 為「目前可用資金」，`pool.allocatedBudget` 為「分配預算」。`reconcilePortfolioState` 完全不碰這兩個值。

##### 路徑 B：US 持倉（不論是否在 Pool 內）

| 步驟 | 事件 | usdAccountCash | 說明 |
|------|------|----------------|------|
| 0 | 初始狀態 | $150 | 持有 US 持倉 A ($100 invested, realizedPnL = -$20) |
| 1 | 刪除 A | $170 | pnlDeltaUSD = -(-20) = +20 |
| 2 | 同步（A 復活） | $170 | reconcile: max(170, 100) = 170，**不會降回 150** |
| 3 | 再刪除 A | $190 | 又 +20 |
| … | 無限循環 | ∞ | **每刪一次就膨脹 $20** |

##### 路徑 C：非 Pool 的台股持倉

TWD 的 `totalCapitalPool` 在刪除後也會被 pnlDelta 膨脹，但下一次 sync 的 `reconcilePortfolioState` 會用封閉公式完全覆蓋。所以這條路徑是「刪除時短暫膨脹 → 同步後矯正」，**不會持續累積**。

但這僅限於**不在 Pool 中的台股持倉**。一旦持倉在 Pool 中，就走路徑 A，永久膨脹。

#### 三條路徑的膨脹特性

| 路徑 | 膨脹是否被 reconcile 矯正 | 根因 |
|------|--------------------------|------|
| A: 台股 Pool 內持倉 | **否** — pool.currentCash 是增量值，reconcile 不碰 | `removeHolding` 直接加 cashDelta 到 pool |
| B: USD 持倉 | **否** — `Math.max(hint, minUsdBase)` 單向閥門 | reconcile 的 max 只升不降 |
| C: 非 Pool 台股 | **是** — `totalCapitalPool` 由封閉公式完全重算 | reconcile 用公式覆蓋 delta |

---

## 四、為什麼多次修正都無效

| 修正 | 解決了什麼 | 沒解決什麼 |
|------|-----------|-----------|
| `b89566c` 先 await 雲端再讀 local | 避免拉雲端期間使用者操作被覆蓋 | tombstone 仍可能敗北；財務膨脹未處理 |
| `fde383e` dirty flag + extractPortfolioData + preserveUpdatedAt | 減少 updatedAt 污染；同步期間漏排問題 | 雲端已有被污染的 updatedAt；USD/pool 膨脹公式未改 |

**核心問題是架構性的**：軟刪除的「財務副作用」以增量方式立即執行，但 `reconcilePortfolioState` 無法完全反轉這些增量（特別是 USD 和 pool），而 tombstone 合併無法保證刪除一定勝出。這形成了一個**不可逆的膨脹迴圈**。

---

## 五、main vs feature 架構對比

| 面向 | main（硬刪除） | feature（軟刪除） |
|------|---------------|------------------|
| 刪除方式 | `array.filter()` 移除 | 設 `deletedAt`，留在陣列 |
| 財務副作用 | 增量 pnlDelta | 增量 pnlDelta（同 main） |
| 同步合併 | 聯集 + LWW（被刪項目從雲端回來） | tombstone + LWW（理論上刪除可以勝出） |
| reconcile 矯正 | 非 Pool 台股: ✓ 封閉公式 / Pool 內台股: ✗ / USD: ✗ max 閥門 | 完全相同 |
| 復活時的資金一致性 | 非 Pool 台股被矯正 / Pool 內和 USD 有風險但較少觸發（硬刪後 pnlDelta 不會反覆執行） | 非 Pool 台股被矯正 / **Pool 內台股和 USD 會無限膨脹**（tombstone 失敗 → 反覆觸發刪除） |

**關鍵差異**：main 上雖然也有「刪除後復活」的問題，但使用者不會（也無法）反覆刪除同一筆已經不存在的項目。feature 上 tombstone 失敗後項目回來，使用者可以反覆刪除，每次都觸發財務副作用。

---

## 六、建議路徑

### 方案 A：回到 main，重新設計（推薦）

1. **回到 `main`** — 先回到穩定狀態
2. **重新設計軟刪除架構**，核心原則：
   - **刪除時不應有增量財務副作用** — 所有 "退款" 應由 `reconcilePortfolioState` 封閉公式處理，而非 slice 中的 delta 操作
   - **reconcilePortfolioState 必須能完全重算所有純量**（包含 USD、pool.currentCash、pool.allocatedBudget），不依賴任何 "前一個值"
   - **tombstone 合併時，不應依賴 `updatedAt` 做 LWW** — 考慮使用單調遞增的 `version` 或明確的 `deletedAt` 優先策略
3. **分階段實作**：
   - Phase 1: 先修正 `reconcilePortfolioState`，讓它能完全重算：
     - USD 帳戶（移除 `Math.max` 閥門）
     - 每個 Pool 的 `currentCash`（= allocatedBudget - 該 pool 內 active holdings 的 totalAmount 總和）
     - 每個 Pool 的 `allocatedBudget`（考慮是否也需要封閉公式化）
   - Phase 2: 再加入 tombstone + 合併
   - Phase 3: 端對端測試（特別是「刪除 Pool 內台股 → 同步 → 確認軍團資金不膨脹」）

### 方案 B：在 feature 上修補

風險高，因為需要同時修正：
- `reconcilePortfolioState` 的 USD 計算（移除 max 閥門）
- `reconcilePortfolioState` 新增 pool.currentCash 封閉公式重算
- 所有 slice 中的 removeXxx 增量操作（或改為純 tombstone 標記，不動資金）
- tombstone 合併策略（可能需要 "刪除永遠勝" 或版本號）
- 21 個已改檔案中可能還有其他邊界案例
- `dashboardMetrics.ts` 中 `calculateFundingMetrics` 也需配合新的 pool 計算邏輯

---

## 七、重要檔案索引

| 用途 | 路徑 | 注意事項 |
|------|------|---------|
| 同步 hook | `src/hooks/useSupabaseSync.ts` | syncWithServer, overwriteState 路徑 |
| 合併邏輯 | `src/utils/syncMerge.ts` | mergePairByTombstone, reconcile 呼叫 |
| 對帳/矯正 | `src/utils/reconcilePortfolioState.ts` | **不碰 pool.currentCash；USD 的 max 閥門也是膨脹根因** |
| 持倉 slice | `src/store/slices/holdingSlice.ts` | removeHolding 增量副作用 |
| 資金 slice | `src/store/slices/capitalSlice.ts` | removePool, removeCapitalDeposit |
| 會計引擎 | `src/utils/accounting.ts` | calculateHoldingRemovalImpact |
| 重算持倉 | `src/utils/finance.ts` | recalcHolding + preserveUpdatedAt |
| 儀表板指標 | `src/utils/dashboardMetrics.ts` | buildDashboardAllocationView, idleCapital 計算路徑 |
| 軍團 UI | `src/components/dashboard/CapitalPools.tsx` | 顯示 pool.currentCash（目前可用資金）— 使用者看到膨脹的數字 |
| Active 過濾 | `src/utils/entityActive.ts` | isActive, filterActive |
| 型別定義 | `src/types/index.ts` | deletedAt 欄位 |
| 合併測試 | `src/utils/syncMerge.test.ts` | 現有 tombstone 測試 |

---

## 八、回到 main 的步驟（如果選方案 A）

```bash
# 1. 確認目前分支狀態
git stash  # 如有未 commit 的變更

# 2. 切回 main
git checkout main

# 3. 部署 main 到 Vercel（確認穩定）
git push origin main

# 4. feature 分支保留作為參考，不合併
# 日後可從 feature 分支 cherry-pick 有用的部分（如 entityActive.ts）
```

---

## 九、結論

feature 分支有兩個互相加劇的架構性問題：

1. **Tombstone 合併不可靠** — `updatedAt` 被報價更新污染，導致刪除在 LWW 中敗北
2. **財務副作用不可逆** — 刪除時的增量 "退款" 無法被 `reconcilePortfolioState` 完全矯正：
   - **台股 Pool 內持倉**（使用者實際遇到）：`pool.currentCash` 被 `cashDeltaTWD`（= holding.totalAmount）膨脹，reconcile 完全不碰 pool 內部數值
   - **USD 持倉**：`usdAccountCash` 的 `Math.max` 閥門只升不降
   - **唯一安全路徑**：非 Pool 的台股持倉，因 `totalCapitalPool` 由封閉公式完全重算

這兩個問題結合形成了**「刪除退款 → 復活 → 再刪除退款 → 再復活」的無限膨脹迴圈**。使用者每刪除一次台股持倉，軍團的「目前可用資金」就永久增加一筆持倉成本金額。

建議回到 main，從 reconcile 的封閉公式修正開始（**特別是讓 reconcile 能完全重算 pool 的 currentCash 和 allocatedBudget**），再逐步加入軟刪除機制。
