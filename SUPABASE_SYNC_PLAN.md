# Supabase 雲端同步功能實作計畫

這份文件用於跨對話追蹤 Supabase 整合進度。每個新對話都可以讀取這個檔案來了解目前的進度並執行下一步。

## 階段一：環境與基礎建設 (Phase 1: Setup & Infrastructure)
- [x] 1.1 使用者在 Supabase 建立專案、啟用 Google OAuth，並建立 `user_backup` 資料表與 RLS 政策。
- [x] 1.2 安裝 `@supabase/supabase-js` 套件。
- [x] 1.3 建立 `.env.local` 並設定 Supabase 的 URL 與 Anon Key。
- [x] 1.4 實作 `src/lib/supabase.ts`，建立共用的 Supabase Client。

## 階段二：狀態管理擴充 (Phase 2: Store Extension)
- [x] 2.1 在 `src/store/portfolioStore.ts` 中新增 `overwriteState` 方法，確保能安全地將遠端資料覆寫到本地。

## 階段三：核心同步邏輯 (Phase 3: Core Sync Logic Hook)
- [x] 3.1 實作 `src/hooks/useSupabaseSync.ts` (第一部分)：處理 Google 登入 (`loginWithGoogle`)、登出 (`logout`) 與監聽身分狀態 (Auth State Change)。
- [x] 3.2 實作 `src/hooks/useSupabaseSync.ts` (第二部分)：實作 `uploadData` 功能，將目前 Zustand 狀態上傳至 Supabase。
- [x] 3.3 實作 `src/hooks/useSupabaseSync.ts` (第三部分)：實作 `downloadData` 功能，從 Supabase 下載資料並搭配 `overwriteState` 更新本地狀態。

## 階段四：使用者介面實作 (Phase 4: UI Implementation)
- [x] 4.1 建立 `src/components/sync/CloudSyncPanel.tsx`，包含未登入時的「Google登入按鈕」。
- [x] 4.2 擴充 `CloudSyncPanel.tsx`：已登入時顯示使用者資訊與「登出」按鈕。
- [x] 4.3 擴充 `CloudSyncPanel.tsx`：加入「上傳資料至雲端」按鈕與成功/失敗提示。
- [x] 4.4 擴充 `CloudSyncPanel.tsx`：加入「從雲端下載資料」按鈕，並實作覆蓋警告對話框。
- [x] 4.5 將 `CloudSyncPanel` 整合至應用程式中適當的頁面 (例如「設定」選單或「總覽」頁面下方)。

## 階段五：最終驗證 (Phase 5: Final Verification)
- [x] 5.1 完整測試登入、上傳、修改本地資料後下載還原的流程是否順暢。

---
**在新對話的起手式建議：**
「請讀取 `SUPABASE_SYNC_PLAN.md`，告訴我目前做到哪一步，並幫我完成清單上的下一個未完成項目。」
