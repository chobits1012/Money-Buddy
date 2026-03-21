# Changelog

## [Unreleased]

### Added

- 多帳號本地儲存分槽：`portfolio-tracker-storage:<userId>`（含舊版單一 key 遷移與 `localDataOwnerId` 欄位）。
- 帳號切換閘門：本地「意圖擁有者」與登入帳號不一致時阻擋自動同步，並提供「僅雲端／合併上傳／取消並登出」。
- 背景同步改為 `syncWithServer`：pull → `syncMerge` → push；離線標記 `pendingUpload`。
- `SyncProvider`：全應用單一同步 hook，避免重複訂閱。
- 備份頁：匯出本地快照 JSON；文件：`docs/supabase-rls-user-backup.sql`、`docs/MANUAL_ACCEPTANCE.md`。
