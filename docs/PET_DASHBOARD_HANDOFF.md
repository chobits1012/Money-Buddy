# 動物庭院（Pet Dashboard）交接報告

> 最後更新：2026-06-12  
> 用途：Cursor 新對話開場時貼上或 `@docs/PET_DASHBOARD_HANDOFF.md`，避免 context 滿了之後 AI 遺失脈絡。

---

## 一句話目標

把理財 App 首頁做成可切換的 **「動物庭院」** 視圖：投資資料映射成狗／貓／豬夥伴，經典財務儀表板完全不動，僅在首頁多一個 view mode。視覺方向：**Webtoon 動物 × 萌宅物語風統一庭院**（非三分區卡片）。

---

## 目前狀態總覽（2026-06-12）

| 項目 | 狀態 |
|------|------|
| 功能 MVP（切換、adapter、氣泡、品種選擇） | ✅ 完成 |
| 統一庭院場景（單張背景 + 8 休息點） | ✅ 完成，座標已手調 |
| 圖片接線（PNG + SVG fallback） | ✅ 完成 |
| 美術資產 | 🟡 **4／10+ 張**（見下方清單） |
| 庭院背景 | ✅ `public/pets/zones/courtyard.png` |
| 休息點編輯器（dev） | ✅ `?pet-spots=1` |
| 動物隨機換位 | 🟡 每次重整隨機（待改固定或穩定分配） |
| 編輯既有軍團品種 | ❌ 未做 |
| 情緒圖 / 漫遊動畫 | ❌ 未做 |
| 分支 commit / push | ❌ **尚未**（使用者未要求） |
| 測試 | ✅ **101 passed**（`npm test`） |
| Production | Feature flag 預設關閉 |

---

## 已完成（本階段重點）

### 產品 / UI

- 首頁 **經典 ⟷ 庭院** 切換（`useHomeViewMode`）
- **統一庭院**：所有軍團動物在同一張背景上（不再狗區／貓區／豬區三張卡）
- **8 個休息點** + 遠近 `scale`（`courtyardRestSpots.ts`，使用者已手調座標）
- 庭院內**不顯示**軍團名／佔比（點擊氣泡才看）
- 點擊**無白框**選取樣式；庭院內**無呼吸浮動**動畫
- 損益顏色與主畫面一致：**賺 = `text-rust`、虧 = `text-moss`**

### 美術資產（已有）

```
public/pets/
  dog-shiba-neutral.png      ✅ 已標準化（腳底貼齊畫布）
  dog-husky-neutral.png
  cat-orange-cat-neutral.png
  pig-mini-pig-neutral.png
public/pets/zones/
  courtyard.png              ✅ Webtoon × 萌宅風格統一庭院
```

命名規則：`{family}-{companionId}-{mood}.png`（或 `.webp`）  
程式先試 `.webp` 再試 `.png`，找不到 → SVG fallback。  
mood 缺圖時 fallback 到 `neutral`（`companionImagePath.ts`）。

### 程式新增／重要檔案

| 檔案 | 職責 |
|------|------|
| `src/utils/companionImagePath.ts` | 圖片路徑 + mood fallback |
| `src/utils/courtyardAssets.ts` | 背景圖路徑 |
| `src/utils/courtyardRestSpots.ts` | 8 休息點座標與 scale |
| `src/utils/courtyardRestSpots.test.ts` | 休息點分配測試 |
| `src/utils/courtyardSpotDebug.ts` | dev 測試模式 + 複製座標 |
| `src/components/pet-dashboard/PetCourtyardSpotEditor.tsx` | 拖曳／縮放編輯器 |
| `src/components/pet-dashboard/PetScene.tsx` | 統一庭院場景 |
| `src/components/pet-dashboard/CompanionSilhouette.tsx` | 讀圖 + SVG fallback |
| `src/components/pet-dashboard/PetAvatar.tsx` | `variant=courtyard` 小尺寸 |

### Dev 工具

- **休息點編輯模式**：`http://localhost:5173/?pet-spots=1` → 庭院
  - 8 隻哈士奇、拖曳移動、頂部 −／＋ 縮放、**複製座標**（含 scale）
  - 僅 `import.meta.env.DEV` 有效

### 圖片後處理（AI 可代勞）

- 白底去背、統一畫布 1024×1536、腳底貼齊底部（柴犬已重做）
- 新圖丟 `public/pets/` 後告訴 AI 檔名即可

---

## 8 個休息點（目前座標）

`scale 1.0` **僅** `deck-cushion`（前景坐墊，最大）。

| id | label | x | y | scale |
|----|-------|---|---|-------|
| `deck-cushion` | 木平台 · 前景坐墊 | 15 | 98.5 | 1 |
| `lawn-mid` | 踏腳石旁草地 | 42.4 | 73 | 0.8 |
| `deck-planter` | 右側木台 · 花盆 | 92.8 | 42.8 | 0.97 |
| `deck-lantern` | 前景右下 · 燈籠旁 | 73.4 | 96 | 0.87 |
| `lawn-back` | 後方草地 | 57.8 | 33.7 | 0.54 |
| `picnic` | 野餐墊 | 75 | 50 | 0.64 |
| `pond-bridge` | 池塘 · 木橋 | 4.6 | 63.5 | 0.6 |
| `swing-seat` | 鞦韆座椅上 | 20.7 | 32.3 | 0.44 |

修改後跑 `npm test`，並用正常庭院驗收（非 debug 模式）。

---

## 產品規則（不可改壞）

### 資產類型 → 動物科（資料層不變）

| 資產類型 | 動物科 |
|----------|--------|
| `TAIWAN_STOCK` | 狗 |
| `US_STOCK` | 貓 |
| `FUNDS` | 豬 |

### 軍團 → 品種

- 建軍團時 `CompanionBreedPicker` 選品種
- 舊 pool migration v6 自動補預設品種
- **尚未支援**：建立後修改品種（上線前建議補）

### 品種清單（`companionRegistry.ts`）

- **狗**：shiba, corgi, golden-dog, husky
- **貓**：orange-cat, black-cat, siamese, british
- **豬**：mini-pig, spot-pig, pink-pig
- **流浪**：stray-dog, stray-cat, stray-pig

### 情緒（mood）

`happy | neutral | sad | sleepy` — adapter 依損益計算；圖片檔名含 mood，缺圖 fallback `neutral`。

### 對話文案

`companionMessages.ts` — 溫暖陪伴語，**不給投資建議**。

---

## 架構（四層，勿打破）

```
財務核心（不動）          holdings, pools, dashboardMetrics
        ↓
Adapter                  portfolioPetAdapter.ts → CompanionAvatarViewModel
        ↓
Registry                 companionRegistry.ts
        ↓
UI                       pet-dashboard/* + courtyardRestSpots
```

### 庭院顯示流程

1. `usePetDashboardViewModel` → 各 zone 的 companions
2. `PetScene` 合併所有 companions → `assignCourtyardRestSpotsRandom` 分配到 8 點
3. `PetAvatar variant=courtyard` + `courtyardSpotScale`
4. 點擊 → `PetAnchoredSpeechBubble`（portal）

### Feature Flag

- DEV：永遠顯示庭院選項
- Production：`VITE_ENABLE_PET_DASHBOARD=true`（`.env.example` 預設 false）

---

## 已解決的坑（新對話別重踩）

1. **Supabase 無 env 白屏** → nullable client + 優雅降級
2. **`public/Pets` vs `public/pets`** → 必須小寫 `pets`，Vite 路徑區分大小寫
3. **dev server 啟動後才加 public 檔** → 需重啟才讀到圖
4. **localStorage 依 port** → 測試資料在 `localhost:5173`，換 port 會是空白
5. **柴犬腳底空白** → PNG 需標準化，腳底貼畫布底（否則同休息點看起來偏高）
6. **庭院損益顏色** → 台股慣例賺紅虧綠，用 rust／moss 與主畫面一致

---

## 測試

```bash
npm test        # 101 passed
npm run dev     # http://localhost:5173/
```

相關測試：`portfolioPetAdapter`、`companionMessages`、`speechBubblePosition`、`courtyardRestSpots`、`portfolioMigrations` v6、`holdingRoutes`。

---

## 接下來一步一步做什麼

### Step 1 — 補齊 neutral 品種圖（使用者 + AI 後處理）

優先順序建議：

1. 其餘 **狗**：corgi, golden-dog  
2. 其餘 **貓**：black-cat（siamese, british 可後補）  
3. 其餘 **豬**：spot-pig, pink-pig（或接受 mini-pig 通用）  
4. **流浪**三張：stray-dog, stray-cat, stray-pig  

生圖：Webtoon 風 + 柴犬當參考；庭院參考萌宅氛圍即可。  
放好後 AI 可去背、標準化、改名。

### Step 2 — 程式小改（可選，上線前建議）

| 任務 | 說明 |
|------|------|
| **固定休息點分配** | 改 `assignCourtyardRestSpotsRandom` → 穩定 hash（同一軍團每次同位置） |
| **編輯軍團品種** | 持倉頁或設定讓舊 pool 可改 `companionId` |
| **新圖標準化腳本** | 可抽成 `scripts/normalizePetImage.mjs` 避免手動 |

### Step 3 — Phase C：情緒圖

每品種補 `happy`, `sad`, `sleepy`（adapter 已有 mood）。

### Step 4 — Phase D：動態（之後）

- 可選：點位內輕微隨機偏移（不要整頁每次大洗牌）
- Canvas 緩慢漫遊 + 氣泡跟隨（`speechBubblePosition` 已鋪路）
- Lottie 微動畫（眨眼、搖尾）
- **不要先做 Spine / Three.js**

### Step 5 — Phase E：部署

使用者明確同意後：

```bash
git add ...
git commit -m "feat(pet-dashboard): ..."
git push -u origin feature/pet-dashboard
# Vercel Preview: VITE_ENABLE_PET_DASHBOARD=true
```

---

## Git 狀態（仍為工作區大量變更）

```bash
git branch --show-current   # feature/pet-dashboard（預期）
```

含 `public/pets/`、`src/components/pet-dashboard/*`、多個 utils 等。  
**不要主動 commit**，除非使用者明確要求。

---

## 新 Cursor 對話開場範本

```
我在 portfolio-tracker 的 feature/pet-dashboard 分支做「動物庭院」。
請先讀 @docs/PET_DASHBOARD_HANDOFF.md。

目前：統一庭院 + 8 休息點 + 4 張動物圖 + 背景圖已完成。
接下來我要：[例如「補 corgi 圖」「做編輯品種」「改固定休息點」]

約束：
- 不動經典財務邏輯
- 對話文案不給投資建議
- public/pets 小寫
- 新 PNG 記得標準化腳底
- 改動後 npm test
- 不要主動 commit
```

---

## 使用者偏好（累積）

- 喜歡 **漫畫對話框錨在動物頭上**
- 想要 **萌宅物語感** 的統一庭院（不要三分區）
- 生圖累但接受；Gemini / ChatGPT 皆可，AI 可去背 + 標準化
- 使用繁體中文
- **不要主動 commit**

---

## 快速驗收 checklist

- [ ] `npm run dev` → 首頁可切「庭院」
- [ ] 統一庭院背景 + 多隻動物在休息點上
- [ ] 遠近大小合理（坐墊最大）
- [ ] 點動物 → 頭上氣泡 + 跳轉 holdings
- [ ] 損益顏色與經典頁一致（賺紅虧綠）
- [ ] 切回「經典」正常
- [ ] `npm test` 全過
- [ ] （可選）`?pet-spots=1` 編輯器仍可用
