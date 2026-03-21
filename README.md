# 個人理財追蹤中心 (Portfolio Tracker)

專為個人設計的高品質理財追蹤 Progressive Web App (PWA)。
完美支援台股、美股、證券與基金的資產追蹤，並使用日式深色質感風格打造。

## 核心功能 (Features)
- 📊 **自動化資產圓餅圖：** 即時追蹤閒置資金與已投入資產。
- 🇺🇸 **美股特別處理：** 支援 USD 輸入與即時匯率換算為 TWD。
- 📱 **PWA 原生體驗：** 加到手機主畫面後即可如原生 App 般全視窗流暢運作。
- 🔒 **隱私優先儲存：** 資料透過 LocalStorage 只存在使用者的設備上。
- ☁️ **多帳號與安全同步：** 依帳號分槽儲存；換帳號時阻擋未確認的雲端寫入；背景同步為 pull-merge-push（見 `CHANGELOG.md`、`docs/MANUAL_ACCEPTANCE.md`）。

## 開發架構 (Tech Stack)
- React 18
- Vite
- TypeScript (Strict Mode)
- Tailwind CSS
- Zustand (State Management)
- Recharts (Data Visualization)
- Lucide React (Icons)

## 安裝與執行 (Getting Started)

```bash
# 安裝依賴
npm install --legacy-peer-deps

# 啟動開發伺服器
npm run dev

# 進行生產環境建置
npm run build
```

## 部署至 Vercel

1. 將本專案推播至 GitHub。
2. 在 Vercel 建立新專案，選擇匯入此 GitHub Repository。
3. Vercel 會自動偵測 Vite 設定並執行部署。
