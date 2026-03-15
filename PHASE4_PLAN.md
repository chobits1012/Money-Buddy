# 階段四：UI/UX 翻新 — 同步狀態燈號與設定頁改版

> 此規劃書可在新對話中貼給 AI，作為階段四的實作藍圖。
> 前置作業（階段一～三）已全部完成，可直接開始。

---

## 🎨 設計風格對齊

目前專案採用 **Wabi-Sabi 侘寂風格**，色盤如下：

| 用途 | 色碼 | 說明 |
|------|------|------|
| `--color-moss` | `#7a8266` | 苔蘚綠，用於成功/正面 |
| `--color-clay` | `#a89e94` | 陶土灰，用於次要文字 |
| `--color-rust` | `#b46b4d` | 鏽橙，用於警告/危險 |
| `--color-primary` | `#ec5b13` | 暖橙，主色調 |
| `--color-clayDark` | `#a69486` | 深陶土色，按鈕底色 |
| `--color-textPrimary` | `#334155` | 深灰，主文字 |
| `--color-textSecondary` | `#a89e94` | 淺灰，次要文字 |

### 💡 同步狀態燈號建議（侘寂風格版）

避免使用鮮豔的紅綠黃，改用專案的大地色系搭配 Material Symbols：

| 狀態 | 燈號色 | 圖標 (Material Symbols) | 文字提示 | 說明 |
|------|--------|-------------------------|---------|------|
| ✅ 已同步 | `#7a8266` (moss) | `cloud_done` | 已同步 | 苔蘚綠，溫潤不刺眼 |
| 🔄 同步中 | `#a69486` (clayDark) | `sync` (帶旋轉動畫) | 同步中… | 陶土色，subtle 旋轉 |
| ⚠️ 待同步 | `#b46b4d` (rust) | `cloud_off` | 離線 | 鏽橙色，有溫度的警示 |

> 燈號呈現方式建議：在 Layout 的 header 右側「備份管理」按鈕中，加入一個 **小圓點** 或直接用上面的雲朵圖標替換現有圖標。這樣不需額外空間，風格也統一。

---

## 步驟拆分

### 4.1 建立同步狀態管理

**檔案**：`src/hooks/useSupabaseSync.ts`

- 新增 `syncStatus` state：`'synced' | 'syncing' | 'offline' | 'error'`
- Pull-First 開始時設為 `'syncing'`，完成後設為 `'synced'`
- 背景上傳開始時設為 `'syncing'`，完成後設為 `'synced'`
- 網路斷線或 API 錯誤時設為 `'offline'`
- 從 hook 中 return `syncStatus`

### 4.2 建立 SyncIndicator 元件

**檔案**：`src/components/sync/SyncIndicator.tsx`（新增）

- 接收 `syncStatus` prop
- 根據狀態顯示對應的圖標 + 小圓點顏色
- `syncing` 狀態時圖標帶有 CSS 旋轉動畫（`@keyframes spin`）
- 風格使用專案的 `glass-panel` + 大地色系

### 4.3 更新 Layout Header

**檔案**：`src/components/layout/Layout.tsx`

- 在「備份管理」/「登入」按鈕旁加入 `SyncIndicator`
- 已登入時顯示燈號
- 未登入時不顯示（或顯示灰色離線狀態）

### 4.4 改版「備份管理」頁面

**檔案**：`src/pages/BackupPage.tsx`

- 標題從「備份管理」改為「同步設定」
- 移除手動「資料上傳」和「下載覆蓋」按鈕
- 保留：
  - 登入帳號顯示
  - 同步狀態顯示（用 `SyncIndicator` 的大版本）
  - 上次同步時間
  - 登出按鈕
- 可額外加入一個「立即同步」按鈕（手動觸發拉取 + 上傳）

### 4.5 離線與錯誤處理

**檔案**：`src/hooks/useSupabaseSync.ts`

- 使用 `navigator.onLine` 和 `window.addEventListener('online'/'offline')` 監聽網路狀態
- 離線時暫存待上傳的 flag
- 恢復連線時自動觸發一次同步
- API 錯誤時不阻擋使用者操作，燈號切為離線/錯誤狀態

---

## 驗證清單

完成後請確認：
1. ✅ 登入後 header 出現苔蘚綠「已同步」圖標
2. ✅ 修改資料時圖標短暫變為旋轉的「同步中」
3. ✅ 斷網時圖標變為「離線」（鏽橙色）
4. ✅ 恢復網路後自動同步並回到「已同步」
5. ✅ 備份管理頁已改為「同步設定」，無手動上傳/下載按鈕
6. ✅ `npm run build` 編譯無錯誤
