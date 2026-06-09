# 基金功能改版 — 交接報告（Phase C 進行中）

專案：portfolio-tracker（Money-Buddy）  
分支：`main`（遠端最後 commit：`cc6fc73`）  
**本地 Phase C 變更尚未 commit**（見下方「Git 狀態」）  
交接日期：2026-05-29  
用途：新對話請直接讀取本檔 `@docs/FUND_PHASE_C_HANDOVER.md`，無需再貼舊報告。

---

## 一、專案背景與目標（不變）

基金改用「單位數 + 淨值」語意，可計算現值、未實現損益、報酬率；不影響台股/美股/資金池會計。分階段實作、可回滾。

**使用者已確認的產品決策（2026-05-29）：**

1. 境外基金淨值：**換算成台幣**計算損益，UI **同步顯示美金**原幣淨值。
2. 基金級別：以 **A 類 / 累積 / 台幣** 為預設對碼目標（使用者自述多為 A 類）。
3. Dashboard 外層顯示基金損益：**Phase D 再做**；現階段只做基金頁內自動淨值。

---

## 二、階段總覽

| 階段 | 內容 | 狀態 |
|------|------|------|
| Phase 1 | 基金單位/淨值模式、表單、損益引擎 | ✅ 已 merge main |
| Phase 2 | 淨值日期、過期提醒 | ✅ 已 merge main |
| Phase 3 | 基金卡片現值與損益展示 | ✅ 已 merge main |
| Phase A | 80 檔基金清單 + 搜尋 | ✅ commit `cc6fc73` |
| Phase B | 我的基金優先顯示 | ✅ commit `cc6fc73` |
| **Phase C** | **自動淨值 API（MoneyDJ）** | **🟡 核心已實作，fundCode 31/80** |
| Phase D | Dashboard 基金損益、進首頁刷新 | ⏳ 未做 |
| 舊資料遷移 | 簡易金額模式 → 單位/淨值 | ⏳ 未做 |

---

## 三、Phase C 已完成項目

### 3.1 資料源與 API

- **選定資料源**：MoneyDJ JSON（非官方公開 API，server 端代理）
- **境內**：`GET .../fundjsondata.xdjjson?a={fundCode}&x=wr02`
- **境外**：同上，`x=wb02`
- **回傳欄位**：`V1` 日期、`V4` 淨值、`V10` 幣別（台幣/美元）

### 3.2 新增/修改檔案

| 檔案 | 用途 |
|------|------|
| `src/utils/moneydjNav.ts` | 解析 MoneyDJ、批次抓取、query 解析 |
| `api/fund-nav.ts` | Vercel serverless：`GET /api/fund-nav?codes=&scopes=` |
| `vite.config.ts` | 本地 dev 代理 `/api/fund-nav`（與 `api/quote` 同模式） |
| `src/utils/fundNav.ts` | `resolveFundNavTarget`、`fetchFundNavQuotes`（打自家 API） |
| `src/store/slices/holdingSlice.ts` | `fetchFundNavForHoldings` 完整實作 |
| `src/types/index.ts` | `StockHolding.currentPriceUSD?` |
| `src/components/holdings/HoldingCard.tsx` | 境外基金顯示 USD 副標 |
| `src/utils/fundCatalog.ts` | `fundCode?`、`navScope?` 型別 |
| `scripts/fund_code_seed.ts` | 種子對照表（待驗證） |
| `scripts/apply_fund_codes.ts` | API + 名稱比對 → 寫入 `funds.json` |
| `scripts/validate_fund_codes.ts` | 僅驗證、不寫檔 |
| `src/utils/moneydjNav.test.ts` | 解析器單元測試 |
| `src/utils/fundNav.test.ts` | resolve / 日期保護測試 |
| `package.json` | 新增 script：`npm run update:fund-codes` |

### 3.3 執行時行為

```
HoldingsPage (type === 'FUNDS')
  → useEffect 觸發 fetchFundNavForHoldings()（僅進入基金頁一次）
    → resolveFundNavTarget(symbol, name) 從 funds.json 取 fundCode + navScope
    → fetchFundNavQuotes → GET /api/fund-nav
    → 更新 currentPrice、currentPriceDate
    → USD：currentPriceUSD = 原幣；currentPrice = nav × exchangeRateUSD
    → recalcHolding() 重算損益
```

**保護邏輯：**

- 無 `fundCode` 的持倉：**靜默跳過**（可繼續手動輸入淨值）
- API 淨值日期 **早於** 現有 `currentPriceDate`：**不覆写**（保護手動資料）
- 單次請求最多 20 檔 fundCode（server 限制）

### 3.4 fundCode 對照進度

- `src/data/funds.json`：**80 檔**清單
- **已寫入 fundCode：31 檔**（`funds.meta.json` → `fundCodesApplied: 31`）
- 其餘 **49 檔**無 fundCode → 不會自動更新淨值

**使用者優先 4 檔（均已對碼）：**

| symbol | 名稱 | fundCode | navScope |
|--------|------|----------|----------|
| ALLIANZ-TW-BIG | 安聯台灣大壩 | ACDD01 | domestic |
| ALLIANZ-TW-TECH | 安聯台灣科技 | ACDD04 | domestic |
| UNI-PENTIUM | 統一奔騰基金 | ACPS10 | domestic |
| ALLIANZ-AI | 安聯 AI | TLH43 | offshore |

**其餘 27 檔已對碼**（節錄）：安聯高股息 ACDD158、收益成長 ACDD74、元大高股息 AC0056、群益精選高息 ACCA278、復華科技優息 ACFH113、野村高股息 ACKH29、摩根太平洋 JFZ04、貝萊德世界科技 SHZ71 等。完整列表見 `funds.json` 內含 `"fundCode"` 的項目。

**已知對碼注意：**

- `ALLIANZ-US-TECH` 與 `ALLIANZ-GLOBAL-TECH` 目前皆指向 `TLZM0`（安聯全球高成長科技），美國科技專用 code 待補。
- 清單名稱為簡稱，與 MoneyDJ 全名不完全一致時，靠 `apply_fund_codes` 名稱 token 比對過濾。

### 3.5 測試

- `npm run test`：**50 passed**（含 fundNav / moneydjNav 新增測試）
- `npx tsc -b`：通過
- **尚未**手機端完整回歸（建議新對話或使用者驗證基金頁自動淨值）

---

## 四、Phase C 未完成項目

### 4.1 高優先

1. **補齊 fundCode（49 檔）**
   - 編輯 `scripts/fund_code_seed.ts`
   - 執行 `npm run update:fund-codes`（約 1 分鐘，逐檔打 MoneyDJ 驗證）
   - 目標：≥90% 清單有有效 code；錯誤 code 勿寫入（腳本會擋名稱不符）

2. **Commit Phase C**
   - 目前變更均在 working tree，**未 commit / 未 push**
   - 建議拆成 2～3 commit：`api+parser` → `client+wiring` → `fund codes data`

3. **實機驗證**
   - `npm run dev` → 基金頁 → 持有已對碼基金應自動更新淨值與日期
   - 境外基金（如安聯 AI）應見 TWD 淨值 + USD 副標

### 4.2 中優先

4. **修正錯誤/重複對碼**（如 ALLIANZ-US-TECH）
5. **清單外自訂基金**：仍無自動對碼，可考慮讓使用者在表單填 fundCode（未規劃）
6. **API 失敗 UX**：目前僅 `console.error`，可選加輕量提示（未做）

### 4.3 Phase D（使用者同意延後）

- Dashboard「分市場損益」增加基金列
- 進入 Dashboard 時呼叫 `fetchFundNavForHoldings()`（類似台股 `fetchQuotesForHoldings`）
- 外層總損益已會加總基金 `unrealizedPnL`（有 `currentPrice` 時），但**未單獨標示「基金」**

### 4.4 低優先 / 未做

- 舊「簡易金額模式」資料遷移腳本
- 完整 1000+ 檔基金資料庫
- 全域 ESLint 技術債
- MoneyDJ 請求 server 端快取（5 分鐘 TTL 等）

---

## 五、核心計算（Phase 1～3，未改）

```
costAmount        = units × avgCostNav
marketValue       = units × latestNav (TWD)
unrealizedPnL     = marketValue - costAmount
unrealizedPnLRate = unrealizedPnL / costAmount
```

- 入口：`src/utils/finance.ts` → `recalcHolding()`
- **未改**：`src/utils/accounting.ts`、台股/美股 `fetchQuotesForHoldings()`

---

## 六、Git 狀態與回滾

### 6.1 遠端 baseline

```
cc6fc73 feat(funds): expand catalog to 80 funds with user suggestions
```

### 6.2 本地未提交（Phase C）

**已修改：**

- `package.json`
- `src/components/holdings/HoldingCard.tsx`
- `src/data/funds.json`、`src/data/funds.meta.json`
- `src/store/slices/holdingSlice.ts`
- `src/types/index.ts`
- `src/utils/fundCatalog.ts`、`src/utils/fundNav.ts`
- `vite.config.ts`

**新增（未追蹤）：**

- `api/fund-nav.ts`
- `scripts/apply_fund_codes.ts`、`scripts/fund_code_seed.ts`、`scripts/validate_fund_codes.ts`
- `src/utils/moneydjNav.ts`、`src/utils/moneydjNav.test.ts`、`src/utils/fundNav.test.ts`

### 6.3 回滾建議

| 情境 | 作法 |
|------|------|
| 放棄全部 Phase C 本地變更 | `git checkout -- .` + 刪除上述 untracked 新檔 |
| 已 commit 後只撤資料 | revert 含 `funds.json` 的 commit |
| 只關 API、保留 UI | 刪 `api/fund-nav.ts`、還原 `vite.config.ts` 與 `fundNav.ts` 的 fetch 實作 |

歷史 checkpoint（main 上）：`bde96b3` Phase1、`47a9c93` Phase2、`8d9e248` Phase3、`beb42f7` merge、`cc6fc73` 80 檔清單。

---

## 七、關鍵檔案速查

| 檔案 | 用途 |
|------|------|
| `docs/FUND_PHASE_C_HANDOVER.md` | **本交接報告** |
| `src/data/funds.json` | 80 檔清單 + fundCode（31 檔） |
| `src/utils/moneydjNav.ts` | MoneyDJ 抓取與解析 |
| `src/utils/fundNav.ts` | Client 解析 fundCode、呼叫 `/api/fund-nav` |
| `api/fund-nav.ts` | Production API |
| `src/store/slices/holdingSlice.ts` | `fetchFundNavForHoldings()` |
| `src/components/holdings/HoldingsPage.tsx` | 進基金頁觸發更新 |
| `scripts/fund_code_seed.ts` | 待驗證的 code 種子 |
| `scripts/apply_fund_codes.ts` | 驗證並寫入 funds.json |

---

## 八、維護指令

```bash
# 驗證種子表能否對上 MoneyDJ（不寫檔）
npx tsx scripts/validate_fund_codes.ts

# 驗證通過者寫入 funds.json（需網路，約 1 分鐘）
npm run update:fund-codes

# 測試
npm run test

# 本地試跑
npm run dev
# → 進入基金頁，檢查已對碼持倉淨值是否更新
```

**手動測 API（範例）：**

```bash
curl "http://localhost:5173/api/fund-nav?codes=ACDD01&scopes=domestic"
```

---

## 九、給新對話的開場指令（可直接複製）

```
請延續 portfolio-tracker 基金 Phase C，先讀：
@docs/FUND_PHASE_C_HANDOVER.md

優先任務：
1. 實機確認基金頁自動淨值（4 檔優先基金）
2. 補齊 funds.json 其餘 fundCode（scripts/fund_code_seed.ts + npm run update:fund-codes）
3. 通過測試後，分階段 commit Phase C（尚未 commit）
4. 不更動台股/美股/資金池會計；Phase D Dashboard 基金損益延後

遠端 main: cc6fc73；Phase C 僅本地 working tree。
```

---

## 十、總結

| 項目 | 狀態 |
|------|------|
| 基金 UI/UX（單位、淨值、日期、現值、損益） | ✅ |
| 80 檔清單 + 我的基金記憶 | ✅ |
| MoneyDJ API + `/api/fund-nav` + 基金頁自動更新 | ✅ 已實作 |
| 雙幣別（TWD 計算 + USD 顯示） | ✅ |
| fundCode 31/80 | 🟡 進行中 |
| Commit / Push Phase C | ⏳ |
| Dashboard 基金損益（Phase D） | ⏳ |
| 舊資料遷移 | ⏳ |

**下一步建議：** 實機驗證 → 補 fundCode → commit → 再開 Phase D。
