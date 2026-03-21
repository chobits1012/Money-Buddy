# 實作計劃書：多帳號隔離 × 安全雲端同步

**版本**：1.0  
**目的**：供新對話或新分支依序實作；與 [`MULTI_ACCOUNT_SYNC_RECOMMENDATIONS.md`](./MULTI_ACCOUNT_SYNC_RECOMMENDATIONS.md) 互補（該檔為決策與風險說明，本檔為**可執行拆解**）。

---

## 一、目標與驗收標準（Definition of Done）

| # | 目標 | 驗收方式（手動／自動擇一或並用） |
|---|------|----------------------------------|
| G1 | 同一帳號多裝置增刪後，資料可合併且不無故覆寫他端 | 兩瀏覽器模擬：交替編輯後，兩邊最終資料集一致或符合合併規則（同 id 取較新 `updatedAt`） |
| G2 | 換帳號登入時，**不會**在未確認下把上一帳號本地資料寫入新帳號雲端 | 登入 B 前本地為 A 資料 → 須出現阻擋式對話框，預設不自動 upsert |
| G3 | 登出／離線期間編輯之資料，再登入**同一帳號**時可與雲端合併並上傳 | 離線改動 → 連線登入 A → 雲端含離線變更 |
| G4 | 每帳號本地資料分區儲存，切換帳號可載入各自快照 | 同一瀏覽器先後登入 A、B，兩者顯示資料互不覆蓋（除非使用者選「匯入／覆蓋」） |
| G5 | 背景同步不再「未合併即整包覆寫雲端」 | 上傳路徑須含 pull-merge-push 或等價版本 gate；單元／整合測試覆蓋 |

---

## 二、架構決策（實作前鎖定，避免分叉）

1. **本地儲存策略（建議採用）**  
   - **依 `userId` 分 persist key**：例如 `portfolio-tracker-storage:<uuid>`。  
   - **遷移**：現有單一 key `portfolio-tracker-storage` 於首次啟動時讀入，若偵測到已登入使用者，將內容搬入 `portfolio-tracker-storage:<userId>` 並可選擇刪除舊 key（需記錄 migration flag，避免重跑）。

2. **「這包資料屬於誰」**  
   - 在 `PortfolioState`（或 persist 外層 metadata）新增 **`localDataOwnerId: string | null`**：  
     - `null`：從未與帳號綁定過的純本地（或新使用者）。  
     - 有值：最後一次**意圖**綁定的帳號（登入成功寫入；登出可選保留不變以支援離線草稿語意）。

3. **帳號切換閘門**  
   - 在 `supabase.auth.onAuthStateChange` / `SIGNED_IN` 之後，若 `session.user.id !== localDataOwnerId`（且本地非空或業務上視為「有資料需保護」），**不執行**既有的 Pull-First 與 autoUpload，直到使用者在 UI 選擇策略。

4. **安全上傳**  
   - `autoUpload` 改為 **`syncWithServer()`**：`pull` → `syncMerge(local, cloud)` → `push`（或比對 `user_backup.updated_at` 與本地快取之伺服器時間，衝突時再 merge）。  
   - 若離線：只標記 `pendingUpload`，不呼叫 upsert。

5. **未登入時是否可編輯**  
   - 建議採 **允許編輯**，並將 `localDataOwnerId` 設為**最後登出之帳號**或獨立欄位 `lastKnownAccountId`（二擇一，避免語意混淆）。**本計劃建議**：登出時**不**清空 `localDataOwnerId`，讓離線編輯仍歸屬於 A；若未登入過則為 `null`。首次登入 B 時與 `localDataOwnerId` 比對觸發閘門。

---

## 三、階段總覽

| 階段 | 代號 | 主題 | 依賴 |
|------|------|------|------|
| 0 | M0 | 型別、metadata、資料遷移骨架 | 無 |
| 1 | M1 | Zustand persist 多 key + 登入／登出與 owner 同步 | M0 |
| 2 | M2 | 帳號切換對話框 + 三種流程（雲端為主／合併後上傳／取消） | M1 |
| 3 | M3 | `autoUpload` → 安全 `syncWithServer`（pull-merge-push） | M1（M2 可與 M3 並行，但建議 M2 先完成以免測試混淆） |
| 4 | M4 | 備份匯出（可選加密）、RLS 檢查清單 | M2 |
| 5 | M5 | 測試、文件、手動驗收表 | 全部 |

---

## 四、細項工作拆解

### M0 — 型別與狀態契約

| # | 工作項 | 說明 | 主要檔案 |
|---|--------|------|----------|
| M0.1 | 擴充 `PortfolioState` / `SyncState` | 新增 `localDataOwnerId?: string \| null`（命名與 `MULTI_ACCOUNT_SYNC_RECOMMENDATIONS` 一致即可） | `src/types/index.ts` |
| M0.2 | Store 預設值與 `overwriteState` | 確保 `overwriteState` 可選擇是否覆寫 `localDataOwnerId`（合併自雲端時可能需要從 session 寫入） | `src/store/slices/syncSlice.ts` |
| M0.3 | `resetAll` 行為 | 重置時一併清 `localDataOwnerId` 或依產品定義保留 | `src/store/portfolioStore.ts` |
| M0.4 | `migrate` 版本升級 | 若 persist `version` 遞增：舊資料補 `localDataOwnerId: undefined`（視為「未標記」） | `src/store/portfolioStore.ts` |

**驗收**：TypeScript 編譯通過；無執行期因 undefined 崩潰。

---

### M1 — 依帳號分槽的 Persist

| # | 工作項 | 說明 | 主要檔案 |
|---|--------|------|----------|
| M1.1 | 動態 storage name | `persist` 的 `name` 改為依目前 `userId` 計算，或自訂 `createJSONStorage` 包一層依 `userId` 讀寫不同 key | `src/store/portfolioStore.ts` |
| M1.2 | 登入後載入對應槽 | `user` 變化時：從 `portfolio-tracker-storage:<id>` 還原；若無則空狀態或預設值 | 需與 `useSupabaseSync` 或 root 組件協調；可能 `portfolioStore` 不直接依賴 React — **建議**在 `useSupabaseSync` 或 `App` 裡 `getSession()` 後 dispatch `hydratePersistForUser(userId)` 或 `persist.rehydrate()` 改寫（Zustand persist 動態 name 需查官方慣例，常見做法為 **自訂 storage getItem/setItem 內含 userId**） |
| M1.3 | 單一 key → 多 key 遷移 | 啟動時：若存在 `portfolio-tracker-storage` 且無 `user` 分槽，依 `localDataOwnerId` 或首次登入 user 搬移 | 小模組 `src/utils/persistMigration.ts`（新建） |
| M1.4 | 登出 | 登出前 flush 目前狀態至 `portfolio-tracker-storage:<A的id>`；清除記憶體中敏感與否依產品；**不要**把 A 的內容留在「無 key」的共用槽 | `useSupabaseSync.ts` + store |
| M1.5 | `localDataOwnerId` 更新時機 | 登入成功：`localDataOwnerId = session.user.id`；登出：保留（離線草稿）或清空（若採「登出即匿名」）— **建議保留**以符合「登出後仍編輯 A」 | `useSupabaseSync.ts` |

**驗收**：G4 基本滿足；舊使用者升級後資料仍在可見位置。

**風險**：Zustand `persist` 動態 key 的慣例 — 實作前建議先 POC：自訂 `storage` 物件 `getItem(name)` 實際讀 `localStorage.getItem(\`portfolio-tracker-storage:${userId}\`)`，`userId` 存在 closure 或 module 變數，由 auth 事件更新。

---

### M2 — 帳號切換閘門 UI

| # | 工作項 | 說明 | 主要檔案 |
|---|--------|------|----------|
| M2.1 | 狀態機 | `syncGate: 'idle' \| 'blocked_account_mismatch' \| 'resolving'` + 暫存 `pendingSession` | 新 hook `src/hooks/useAccountSyncGate.ts` 或併入 `useSupabaseSync` |
| M2.2 | 阻擋條件 | `SIGNED_IN` 且 `session.user.id !== localDataOwnerId` 且（本地有 holdings / transactions 等**非空**或 `isConfigured`）→ blocked | 與產品確認「空資料是否跳過」 |
| M2.3 | 對話框元件 | 三選項：**僅使用雲端（B）**、**合併本地到 B 並上傳**、**取消（signOut 回到未登入）** | `src/components/sync/AccountSwitchDialog.tsx`（新建） |
| M2.4 | 選項 A：雲端為主 | 拉取 B 的 `user_backup` → `overwriteState`（可選不經 merge）→ `localDataOwnerId = B` | `useSupabaseSync.ts` |
| M2.5 | 選項 B：合併入 B | `syncMerge(本地, 雲端_B)` → `overwriteState` → upsert → 更新 `lastSyncedAt` | 同上 |
| M2.6 | 選項 C：取消 | `supabase.auth.signOut()`，不變更本地資料 | 同上 |
| M2.7 | Layout 掛載 | 全域阻擋時顯示 modal（或全頁），避免背景仍觸發 auto sync | `Layout.tsx` 或 `App` |

**驗收**：G2；手動測試 A→B 三條路徑。

---

### M3 — 安全背景同步（Pull-Merge-Push）

| # | 工作項 | 說明 | 主要檔案 |
|---|--------|------|----------|
| M3.1 | 抽取 `fetchCloudBackup(userId)` | 回傳 `portfolio_data` + `updated_at` | `useSupabaseSync.ts` 或 `src/lib/supabaseBackup.ts` |
| M3.2 | `syncWithServer()` | 取代 `autoUpload` 核心：fetch → merge → upsert；debounce 仍 2s | `useSupabaseSync.ts` |
| M3.3 | `isPullingRef` / 閘門互斥 | 帳號切換對話框 blocked 期間不觸發上傳；初次 pull 與 debounce 邏輯與現有 ref 一致 | `useSupabaseSync.ts` |
| M3.4 | 登入時 Pull-First | 與 M2 協調：僅在 **非 blocked** 或 **已 resolve** 後執行 | `useSupabaseSync.ts` |
| M3.5 | 線上事件 `online` | 恢復連線時改呼叫 `syncWithServer()` | 同上 |

**驗收**：G1、G5；可補一則整合測試 mock Supabase。

---

### M4 — 備份與後端檢查

| # | 工作項 | 說明 | 主要檔案 |
|---|--------|------|----------|
| M4.1 | 匯出 JSON | 在「雲端為主」覆蓋前，按鈕下載目前本地快照（可沿用既有加密或明碼） | 新元件或 `BackupPage` |
| M4.2 | Supabase RLS | 若 repo 無 SQL：於 `docs/` 補上 `user_backup` 的 policy 範例（`SELECT/INSERT/UPDATE` 僅 `auth.uid() = id`） | `docs/supabase-rls-user-backup.sql`（新建） |

**驗收**：文件可複製到 Supabase；匯出檔可還原測試（可選）。

---

### M5 — 測試與文件

| # | 工作項 | 說明 |
|---|--------|------|
| M5.1 | 單元測試 | `syncMerge` 既有測試外，新增 `syncWithServer` 純邏輯（mock fetch） |
| M5.2 | 手動驗收表 | 將「一、目標與驗收標準」逐條打勾 |
| M5.3 | README / CHANGELOG | 簡述「多帳號本地分槽」與「換帳號時對話框」 |

---

## 五、建議實作順序（給新對話的指令範本）

1. **先做 M0 + M1.1～M1.3**（資料模型與 persist 分槽 + 遷移），暫停自動上傳改寫，先確認登入／登出／換 key 不丟資料。  
2. **再做 M2**（閘門 UI），此時可暫時關閉 `autoUpload` 或僅在 `!blocked` 時啟用。  
3. **再做 M3**（`syncWithServer`），接回 debounce 與 online handler。  
4. **最後 M4、M5**。

若新對話時間有限：**最小可行子集** = M0 + M1 + M2 + M3（M4 可後補）。

---

## 六、已知風險與回滾

| 風險 | 緩解 |
|------|------|
| 動態 persist 與 SSR／Hydration 順序 | 確保在 `getSession()` 後再 hydrate store；避免首屏 render 用錯 user |
| 遷移重複執行 | `migrationVersion` 或 flag 存在 `localStorage` |
| 合併與效能 | 大 JSON 時 debounce 維持 2s；可選壓縮或差異同步（未來） |

回滾：保留 git tag；舊單一 key 遷移前可備份 `localStorage` 整份。

---

## 七、相關現有檔案索引（實作時必讀）

| 檔案 | 用途 |
|------|------|
| `src/hooks/useSupabaseSync.ts` | Auth、Pull-First、debounce upload、manualSync |
| `src/store/portfolioStore.ts` | persist、加密、migrate |
| `src/store/slices/syncSlice.ts` | `overwriteState` |
| `src/utils/syncMerge.ts` | 合併 |
| `src/components/layout/Layout.tsx` | 掛載 sync 相關 |
| `docs/MULTI_ACCOUNT_SYNC_RECOMMENDATIONS.md` | 背景與決策 |

---

**文件結尾**：將本計劃與「新對話」需求一併貼上時，建議加一句：**「請依階段五順序實作，每階段完成後跑 build 與手動驗收表。」**
