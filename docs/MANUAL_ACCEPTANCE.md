# 手動驗收表：多帳號隔離 × 安全雲端同步

對應 [`IMPLEMENTATION_PLAN_MULTI_ACCOUNT_AND_SAFE_SYNC.md`](./IMPLEMENTATION_PLAN_MULTI_ACCOUNT_AND_SAFE_SYNC.md) 第一節目標 G1–G5。

| # | 目標 | 驗收步驟 | 結果 |
|---|------|----------|------|
| G1 | 同一帳號多裝置增刪後可合併、不無故覆寫 | 兩瀏覽器／兩裝置登入同一帳號，交替新增／刪除，確認兩邊最終資料一致或同 id 以較新 `updatedAt` 為準 | ☐ |
| G2 | 換帳號時不會未確認就把本地寫入新帳號雲端 | 本地為帳號 A 資料 → 登入 B → 應出現阻擋式對話框；預設不自動 upsert | ☐ |
| G3 | 登出／離線編輯後，再登入同一帳號可合併上傳 | 離線或登出後改資料 → 連線並登入同一帳號 → 雲端含離線變更 | ☐ |
| G4 | 每帳號本地分槽，切換帳號載入各自快照 | 同一瀏覽器先後登入 A、B，資料互不覆蓋（除非選合併／雲端為主） | ☐ |
| G5 | 背景同步為 pull-merge-push，非整包覆寫 | 觀察網路：上傳前應有拉取／合併邏輯；或執行 `npm test` | ☐ |

**建議環境**：Chrome 一般視窗 + 無痕視窗，或兩台裝置；Supabase 專案已設定 `user_backup` 與 RLS（見 `docs/supabase-rls-user-backup.sql`）。
