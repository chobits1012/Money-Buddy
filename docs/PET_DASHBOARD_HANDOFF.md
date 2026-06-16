# 動物庭院（Pet Dashboard）交接報告

> 最後更新：2026-06-17  
> 用途：Cursor 新對話開場時貼上或 `@docs/PET_DASHBOARD_HANDOFF.md`，避免 context 滿了之後 AI 遺失脈絡。

---

## 一句話目標

把理財 App 首頁做成可切換的 **「動物庭院」** 視圖：投資資料映射成狗／貓／豬夥伴，經典財務儀表板完全不動，僅在首頁多一個 view mode。視覺方向：**Webtoon 動物 × 萌宅物語風統一庭院**（非三分區卡片）。

---

## 目前狀態總覽（2026-06-17）

| 項目 | 狀態 |
|------|------|
| 功能 MVP（切換、adapter、氣泡、品種選擇） | ✅ 完成 |
| 統一庭院場景（單張背景 + 8 休息點） | ✅ 完成，座標已手調 |
| 圖片接線（PNG + SVG fallback） | ✅ 完成 |
| **全螢幕模式**（手動按鈕、不假橫向） | ✅ 完成，**使用者已驗收** |
| **對話泡泡**（錨定動物、四向邊界偵測） | ✅ 卡片 + 全螢幕皆可用 |
| **大隻動物邊角不裁切**（scale > 1） | ✅ layout 尺寸縮放，非 CSS transform |
| 美術資產 | 🟡 **4／10+ 張**（見下方清單） |
| 庭院背景 | ✅ `public/pets/zones/courtyard.png` |
| 休息點編輯器（dev） | ✅ `?pet-spots=1` |
| **動物隨機換位** | ✅ **產品既定：隨機**（見下方說明） |
| 編輯既有軍團品種 | ❌ 未做 |
| 情緒圖 / 漫遊動畫 | ❌ 未做 |
| 分支 commit / push | ✅ `feature/pet-dashboard`，最新 `e30fb75` |
| 測試 | ✅ **103 passed**（`npm test`） |
| Production | Feature flag 預設關閉 |

---

## 2026-06-16～17 完成項目（全螢幕階段）

### 產品行為（使用者已確認 OK）

- 進入「庭院」→ **預設卡片模式**（不自動全螢幕）
- 按「全螢幕」→ 16:9 庭院放大至適合視窗（**不假橫向、不 rotate**）
  - 手機直拿：上下黑邊（letterbox），方案 A
  - 手機轉橫：自然填滿橫向螢幕，方案 B
- 「離開全螢幕」按鈕固定右上角，z-index 高於泡泡遮罩
- 點動物 → 泡泡 280px 寬，與卡片模式同款比例，指向動物、邊緣自動調位
- 全螢幕偏好寫入 `localStorage`（`portfolio-tracker-courtyard-fullscreen`，預設 `off`）
- 進入全螢幕時 `PetScene` remount → **休息點重新隨機分配**（符合產品需求）

### 技術決策（勿重踩）

| 曾嘗試 | 結果 | 現行做法 |
|--------|------|----------|
| 直向手機 CSS `rotate(90deg)` 假橫向 | 泡泡／按鈕座標系分裂，修一整天 | **已廢棄** |
| 泡泡內容反向旋轉、landscape shell | 仍不穩定 | **已刪除** `mapScreenToLandscapeShell.ts` |
| 動物 `transform: scale()` 放大 | 邊角動物耳朵被裁切 | **`CompanionSilhouette` 用實際寬高 × scale** |
| 全螢幕 `STAGE_BLEED` 納入 scale 分母 | 庭院變小、像卡片加黑邊 | **已移除**，scale 只依 360×202.5 |

### 相關 commit（新 → 舊，節錄）

```
e30fb75  restore fullscreen scale（移除 bleed 縮小問題）
2e0ca26  prevent pet clipping（layout 尺寸縮放）
6c458c2  simplify fullscreen（不假橫向，自然 letterbox）
```

比例調好的基準點仍為 `66d79fc`（休息點座標／scale 資料在 `courtyardRestSpots.ts`）。

---

## 已完成（本階段重點）

### 產品 / UI

- 首頁 **經典 ⟷ 庭院** 切換（`useHomeViewMode`）
- **統一庭院**：所有軍團動物在同一張背景上（不再狗區／貓區／豬區三張卡）
- **8 個休息點** + 遠近 `scale` 0.4–2.0（`courtyardRestSpots.ts`，使用者已手調）
- **隨機休息點**：`assignCourtyardRestSpotsRandom` + `PetScene` 每次 mount 新 seed
- 庭院內**不顯示**軍團名／佔比（點擊氣泡才看）
- 點擊**無白框**選取樣式；庭院內**無呼吸浮動**動畫
- 損益顏色與主畫面一致：**賺 = `text-rust`、虧 = `text-moss`**
- **全螢幕**：`CourtyardFullscreenStage` portal 至 `document.body`，單一 `PetScene`

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

### 程式重要檔案

| 檔案 | 職責 |
|------|------|
| `src/components/pet-dashboard/PetDashboard.tsx` | 庭院首頁、全螢幕開關、泡泡串接 |
| `src/components/pet-dashboard/PetScene.tsx` | 卡片／全螢幕庭院、`assignCourtyardRestSpotsRandom` |
| `src/components/pet-dashboard/CourtyardFullscreenStage.tsx` | 全螢幕 overlay、16:9 scale、退出按鈕 |
| `src/components/pet-dashboard/PetAnchoredSpeechBubble.tsx` | 錨定對話泡泡（portal `document.body`） |
| `src/components/pet-dashboard/CourtyardSceneCanvas.tsx` | 16:9 場景容器（與編輯器共用） |
| `src/components/pet-dashboard/CompanionSilhouette.tsx` | 讀圖 + `scale` 實際尺寸 + SVG fallback |
| `src/components/pet-dashboard/PetAvatar.tsx` | `variant=courtyard`，傳 `courtyardSpotScale` |
| `src/utils/speechBubblePosition.ts` | 泡泡四向定位與 viewport clamping |
| `src/utils/courtyardRestSpots.ts` | 8 休息點座標與 scale |
| `src/hooks/useCourtyardFullscreenPreference.ts` | 全螢幕偏好 localStorage |
| `src/utils/companionImagePath.ts` | 圖片路徑 + mood fallback |
| `src/utils/courtyardSpotDebug.ts` | dev 編輯器 + `?pet-labels=1` 站位標籤 |
| `src/components/pet-dashboard/PetCourtyardSpotEditor.tsx` | 拖曳／縮放編輯器（`?pet-spots=1`） |

### Dev 工具

- **休息點編輯模式**：`http://localhost:5173/?pet-spots=1` → 庭院
  - 8 隻哈士奇、拖曳移動、頂部 −／＋ 縮放、**複製座標**（含 scale）
  - 僅 `import.meta.env.DEV` 有效
- **站位標籤**：`?pet-labels=1`（一般庭院顯示休息點 id）

---

## 休息點隨機分配（產品規則）

**使用者明確要求：休息點要隨機，不要改成固定 hash。**

實作：

- `PetScene` 內 `sessionRandomSeed = useMemo(() => Math.random(), [])` — 每次 `PetScene` **mount** 重新洗牌
- 卡片模式與全螢幕各有一個 `PetScene` 實例；**切換全螢幕會 remount** → 動物換位
- 同一畫面內 companionId 不變則位置不變；離開全螢幕再進入可能換位

勿改為 `assignCourtyardRestSpots`（穩定 hash）除非使用者再次要求。

---

## 8 個休息點（目前座標）

`deck-cushion` 為前景最大隻休息點（scale 可至 2.0）。

| id | label | x | y | scale |
|----|-------|---|---|-------|
| `deck-cushion` | 木平台 · 前景坐墊 | 15 | 98.5 | 1.64 |
| `lawn-mid` | 踏腳石旁草地 | 42.4 | 73 | 1.1 |
| `deck-planter` | 右側木台 · 花盆 | 92.8 | 42.8 | 0.79 |
| `deck-lantern` | 前景右下 · 燈籠旁 | 73.4 | 96 | 1.41 |
| `lawn-back` | 後方草地 | 57.8 | 33.7 | 0.68 |
| `picnic` | 野餐墊 | 75 | 50 | 0.82 |
| `pond-bridge` | 池塘 · 木橋 | 6.5 | 63.3 | 0.86 |
| `swing-seat` | 鞦韆座椅上 | 21.1 | 30.1 | 0.68 |

修改後跑 `npm test`，並用正常庭院 + 全螢幕驗收（非 debug 模式）。

---

## 全螢幕架構（現行，簡化版）

```
PetDashboard
├── 卡片模式：PetScene (presentation=card)
└── isFullscreen
    ├── CourtyardFullscreenStage → portal(document.body)
    │     ├── 離開全螢幕（fixed, z-80）
    │     └── 16:9 舞台 scale( min(vw/360, vh/202.5) )
    │           └── PetScene (fullscreen, hideSpeechBubble)
    └── PetAnchoredSpeechBubble (fullscreenMode, portal body, fixed)
```

**約束：**

- 不要用 CSS `rotate` 做假橫向
- 不要用 `transform: scale()` 放大庭院動物（用 `CompanionSilhouette` 的 `scale` prop）
- 全螢幕 scale 分母只用 `BASE_WIDTH` × `BASE_HEIGHT`，不加 bleed

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
2. `PetScene` 合併 companions → `assignCourtyardRestSpotsRandom`（隨機）
3. `PetAvatar variant=courtyard` + `courtyardSpotScale` → `CompanionSilhouette scale={...}`
4. 點擊 → `PetAnchoredSpeechBubble`（`computeSpeechBubbleLayout`）

### Feature Flag

- DEV：永遠顯示庭院選項
- Production / Preview：`VITE_ENABLE_PET_DASHBOARD=true`（`.env.example` 預設 false）
- Preview 登入後若跳轉 production domain，需重新開 Preview URL（已知問題）

---

## 已解決的坑（新對話別重踩）

1. **Supabase 無 env 白屏** → nullable client + 優雅降級
2. **`public/Pets` vs `public/pets`** → 必須小寫 `pets`
3. **dev server 啟動後才加 public 檔** → 需重啟才讀到圖
4. **localStorage 依 port** → 測試資料在 `localhost:5173`
5. **柴犬腳底空白** → PNG 需標準化，腳底貼畫布底
6. **庭院損益顏色** → 賺 rust／虧 moss
7. **假橫向全螢幕** → 座標系分裂，已廢棄；用自然 letterbox + 真橫屏
8. **動物 `transform: scale()`** → 邊角裁耳；改用 layout 實際寬高
9. **全螢幕 STAGE_BLEED 算進 scale** → 庭院變小；bleed 已移除
10. **PWA 快取舊 bundle** → 驗收用無痕或清網站資料

---

## 測試

```bash
npm test        # 103 passed
npm run dev     # http://localhost:5173/
```

相關測試：`portfolioPetAdapter`、`companionMessages`、`speechBubblePosition`、`courtyardRestSpots`、`portfolioMigrations` v6、`holdingRoutes`。

---

## 接下來一步一步做什麼

### Step 1 — 補齊 neutral 品種圖（使用者 + AI 後處理）

優先順序建議：

1. 其餘 **狗**：corgi, golden-dog  
2. 其餘 **貓**：black-cat（siamese, british 可後補）  
3. 其餘 **豬**：spot-pig, pink-pig  
4. **流浪**三張：stray-dog, stray-cat, stray-pig  

生圖：Webtoon 風 + 柴犬當參考。放好後 AI 可去背、標準化、改名。

### Step 2 — 程式小改（上線前建議）

| 任務 | 說明 |
|------|------|
| **編輯軍團品種** | 持倉頁或設定讓舊 pool 可改 `companionId` |
| **新圖標準化腳本** | 可抽成 `scripts/normalizePetImage.mjs` |
| **合併 main + Production flag** | 使用者滿意後 PR；Vercel 設 `VITE_ENABLE_PET_DASHBOARD=true` |

**不要做：** 把休息點改成固定分配（產品要隨機）。

### Step 3 — Phase C：情緒圖

每品種補 `happy`, `sad`, `sleepy`（adapter 已有 mood）。

### Step 4 — Phase D：動態（之後）

- 點位內輕微隨機偏移（與「整頁洗牌」不同）
- Canvas 緩慢漫遊 + 氣泡跟隨
- Lottie 微動畫（眨眼、搖尾）
- **不要先做** Spine / Three.js

### Step 5 — Phase E：部署

```bash
# 分支已持續 push 至 origin/feature/pet-dashboard
# Preview: VITE_ENABLE_PET_DASHBOARD=true
# 滿意後 merge → main，Production 同環境變數
```

---

## Git 狀態

```bash
git branch --show-current   # feature/pet-dashboard
git log -1 --oneline        # e30fb75（截至 2026-06-17）
```

**不要主動 commit**，除非使用者明確要求。  
請勿 commit：`.vercel/`、本機可能變動的 `tw_stocks.json` meta。

---

## 新 Cursor 對話開場範本

```
我在 portfolio-tracker 的 feature/pet-dashboard 分支做「動物庭院」。
請先讀 @docs/PET_DASHBOARD_HANDOFF.md。

目前：統一庭院 + 全螢幕（不假橫向）+ 泡泡 + 隨機休息點 + 4 張動物圖，使用者已驗收全螢幕。
接下來我要：[例如「補 corgi 圖」「做編輯品種」「merge main」]

約束：
- 不動經典財務邏輯
- 休息點維持隨機（assignCourtyardRestSpotsRandom）
- 全螢幕不要用 CSS rotate 假橫向
- 庭院動物用 layout 尺寸縮放，不用 transform scale
- 對話文案不給投資建議
- public/pets 小寫
- 改動後 npm test
- 不要主動 commit
```

---

## 使用者偏好（累積）

- 喜歡 **漫畫對話框錨在動物頭上**
- 想要 **萌宅物語感** 的統一庭院（不要三分區）
- **休息點要隨機**（切全螢幕可換位）
- 全螢幕：**手動按鈕**，預設卡片模式；不假橫向
- 生圖累但接受；Gemini / ChatGPT 皆可，AI 可去背 + 標準化
- 使用繁體中文
- **不要主動 commit**

---

## 快速驗收 checklist

- [ ] `npm run dev` → 首頁可切「庭院」，**預設非全螢幕**
- [ ] 統一庭院背景 + 多隻動物在休息點上（**每次全螢幕可換位**）
- [ ] 遠近大小合理（坐墊可 > 1，如 1.64）
- [ ] 點動物 → 頭上氣泡 + 跳轉 holdings（**卡片模式**）
- [ ] 按全螢幕 → 庭院盡量填滿視窗（直向上下黑邊可接受）
- [ ] 全螢幕點動物 → 泡泡指向正確、邊角動物耳朵完整
- [ ] 「離開全螢幕」可見可點
- [ ] 損益顏色與經典頁一致（賺紅虧綠）
- [ ] 切回「經典」正常
- [ ] `npm test` 全過
- [ ] （可選）`?pet-spots=1` 編輯器仍可用
