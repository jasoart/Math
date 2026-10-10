# 高中動態幾何微型實驗室

> GitHub Pages-ready interactive micro-apps for Taiwan high school dynamic geometry, scientific visualization, and mathematical visualization.

本專案可放入 `https://github.com/jasoart/Math` 作為 `dynamic-geometry/` 子專案，或直接作為 GitHub Pages 的網站根目錄。  
目前為 **v2.1 智慧繪圖版**：獨立通用繪圖工作區與 98 個互動模組，純前端、不需後端或打包工具。

新增課程／主題篩選、收藏、練習紀錄、本機筆記、教師投影與公式揭露、參數分享、JSON 備份還原，以及 111–115 年學測數 A／分科數甲的 **185 個題號索引**。題型分析以使用者上傳試卷為依據，僅提供觀念摘要和模組關聯，不是官方詳解或命題預測。

研究與來源：[技術論文與官方核驗狀態](research/SOURCES.md)、[數 A 分析](research/EXAMS_MATH_A.md)、[數甲分析](research/EXAMS_MATH_ADVANCED.md)。本次官方入口受環境網路政策限制，尚未核對現行完整課綱正文與修訂日；網站分類為教學參考，延伸內容另標示，不能宣稱最新正式課綱完整覆蓋。

## v2.1 智慧通用繪圖

從首頁「智慧繪圖」進入，或直接開啟 [graph.html](graph.html)。正式網址：[智慧繪圖工作區](https://jasoart.github.io/Math/graph.html)。

- 同時疊加最多 8 條函數、隱函數、參數曲線、極座標或座標點，自動判斷類型。
- 支援 `2x`、`x(x+1)`、`π`、`x²` 等寫法；a、b、c 自動出現參數控制。
- 拖曳平移、滾輪／雙指縮放、鍵盤操作、等比例座標、智慧取景。
- 一般函數的可見零點、局部極值與兩兩交點數值分析，以及指定 x 的函數值、斜率與切線。
- 本機自動儲存、可還原算式／參數／視窗的分享網址、附算式與參數的 PNG。
- 提供拋物線、圓與橢圓、三角函數、有理函數、李沙育曲線、玫瑰線及座標點範例；替換範例後可復原。

算式使用白名單解析器，不執行使用者 JavaScript，無 CDN 或 API 需求。三角函數採弧度，`log` 為底數 10、`ln` 為自然對數。除法請明確加括號，例如 `1/(2x)`。目前不支援不等式、分段條件、自訂函數、自然語言或 3D。

**數值限制：**繪圖及特殊點皆以有限取樣近似，不能取代代數證明。可能遺漏高頻震盪、非常靠近的根、隱函數孤立點或比像素小的區域；floor／ceil／round／sign 不進行特殊點分析。隱函數不列零點／交點。智慧取景對一般函數採 x∈[−10,10] 並略去部分極端 y 值，隱函數需手動調整。斜率為差分估計，不是符號微分。

```bash
npm run check
npm run test:graph
```

繪圖測試包括解析器與數值案例，以及桌面／手機操作、無效輸入、所有圖形類型、參數、分享還原、儲存、鍵盤、縮放、切線與 PNG。可用 `CHROMIUM_PATH` 指定瀏覽器，與既有 `npm test` 相同。

## v2.0 使用與驗證

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

分享網址包含模組與參數，不包含筆記。筆記、收藏、練習狀態使用瀏覽器 localStorage；「已練習」是自行標記，沒有自動評分。可用 JSON 備份保存至其他裝置，匯入會驗證版本、模組與參數範圍。網站不依賴 CDN；靜態檔案可以在本機伺服器使用，尚未提供斷網重新載入的 Service Worker 快取。

開發驗證使用 Node.js 20+、Python 3、Playwright 與 Chromium：

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
npm run evidence
npm run check
npm test
```

`npm test` 使用 `/usr/bin/chromium`；可用 `CHROMIUM_PATH` 指定可信任的已安裝 Chromium。測試啟動自己的暫時靜態伺服器，並於結束清理。編輯 `research/*.json` 後執行 `npm run evidence`，將資料生成為可直接部署的 `evidence.js`。

## 專案定位

這不是單純題庫，也不是大型 GeoGebra 替代品，而是一組「5–8 分鐘可完成一個觀念」的互動式微型應用程式。

設計目標：

1. **高中數學 A / 數甲觀念練習**：以核心概念和歷屆題型建立學習連結，逐題對應程度與限制另列。
2. **動態幾何與視覺化**：讓學生拖曳參數，觀察圖形、距離、角度、面積、機率分布如何變化。
3. **考點轉譯**：每個模組都有「數學訊號」，協助學生把題目關鍵字對應到解題直覺。
4. **頂標任務**：每個模組提供一個可當課堂提問或作業的小任務。
5. **GitHub 友善**：純前端，不需後端，不需編譯，可直接部署 GitHub Pages。

## v1.1 新增重點

- 模組數從 41 個擴充為 **85 個互動模組**。
- 新增 `ALL_UNITS_CHECKLIST.md`：完整單元覆蓋檢核。
- 新增 `EXAM_115_ALIGNMENT.md`：對照 115 學測數學 A 與 115 分科數學甲試卷題型。
- 補齊先前較缺的單元：
  - 集合與邏輯、直線方程、線性規劃、圓方程
  - 函數變換、反函數與合成函數、三次函數中心、根的重數
  - 連續複利、對數尺度、Σ 公式、遞迴數列、無窮等比級數
  - 三角函數圖形變換、三角方程
  - 空間交線、線面角、三重積體積、球面
  - 反方陣、高斯消去、行列式面積、隔板法、二項式定理
  - 機率樹、列聯表、主客觀機率、期望值與變異數
  - 牛頓法、微分公式、凹凸反曲、最佳化、介值定理、夾擠定理、切片積分
  - 複數 n 次方根、共軛虛根、旋轉橢圓、橢圓參數式
  - 二項常態近似、不放回抽樣

## 快速開始

直接開啟：

```bash
open index.html
```

或用任一靜態伺服器：

```bash
python -m http.server 8000
```

然後開啟 `http://localhost:8000`。

## 部署到 GitHub Pages

若要放進你的 `jasoart/Math` repo：

```bash
git clone https://github.com/jasoart/Math.git
cd Math
mkdir -p dynamic-geometry
cp -R path/to/highschool-dynamic-geometry/* dynamic-geometry/
git add dynamic-geometry
git commit -m "Expand dynamic geometry to complete high-school math coverage"
git push
```

若使用 GitHub Pages：

1. 到 repo 的 **Settings → Pages**
2. Source 選擇 `GitHub Actions`，或直接指定 branch/folder
3. 本專案目前沒有內建部署 workflow。最簡單的方式是選擇 `Deploy from a branch`，指定 `main` 與根目錄 `/ (root)`；若已採 GitHub Actions，需使用實際存在的部署 workflow。

## 專案檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 單頁應用入口 |
| `graph.html`、`graph/` | v2.1 智慧繪圖工作區、算式解析與數值分析 |
| `styles.css` | 響應式版面與卡片樣式 |
| `app.js` | 85 個互動模組與 Canvas 繪圖邏輯 |
| `extension-modules.js`、`exam-modules.js` | v2.0 新增的 13 個概念實驗，合計 98 個模組 |
| `learning.js` | 本機筆記、收藏、投影、分享及 JSON 備份 |
| `evidence.js`、`exam-explorer.js` | 185 題索引、研究來源與篩選介面 |
| `MODULE_INDEX.md` | 模組索引 |
| `CURRICULUM_MAP.md` | 課程單元對照 |
| `ALL_UNITS_CHECKLIST.md` | 全單元覆蓋檢核 |
| `EXAM_115_ALIGNMENT.md` | 115 年試卷題型對照 |
| `TEACHER_GUIDE.md` | 教師課堂使用建議 |
| `ROADMAP.md` | 後續開發規劃 |
| `CHANGELOG.md` | 版本紀錄 |
| `package.json` | 語法檢查指令 |

## 指令

```bash
npm run check
```

`npm run check` 檢查所有應用程式腳本；功能與數學驗證使用：

```bash
npm test
```

## 授權

MIT License。
