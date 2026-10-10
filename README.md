# 高中動態幾何微型實驗室

> GitHub Pages-ready interactive micro-apps for Taiwan high school dynamic geometry, scientific visualization, and mathematical visualization.

本專案可放入 `https://github.com/jasoart/Math` 作為 `dynamic-geometry/` 子專案，或直接作為 GitHub Pages 的網站根目錄。  
目前為 **v2.2 智慧繪圖 Pro 版**：獨立通用繪圖工作區與 98 個互動模組，純前端、不需後端或打包工具。

新增課程／主題篩選、收藏、練習紀錄、本機筆記、教師投影與公式揭露、參數分享、JSON 備份還原，以及 111–115 年學測數 A／分科數甲的 **185 個題號索引**。題型分析以使用者上傳試卷為依據，僅提供觀念摘要和模組關聯，不是官方詳解或命題預測。

研究與來源：[技術論文與官方核驗狀態](research/SOURCES.md)、[數 A 分析](research/EXAMS_MATH_A.md)、[數甲分析](research/EXAMS_MATH_ADVANCED.md)。本次官方入口受環境網路政策限制，尚未核對現行完整課綱正文與修訂日；網站分類為教學參考，延伸內容另標示，不能宣稱最新正式課綱完整覆蓋。

## v2.2 共用數學鍵盤與精確算式

通用繪圖與 **98 個模組的 301 個數值參數**均支援網頁內建數學鍵盤。點選算式或符號輸入框，即可使用「常用／函數／條件／變數」四頁鍵盤；提供根號、圓周率、分數、次方、三角函數、不等號、括號與游標編輯，並以原生 MathML 預覽根號與分數。可切回系統鍵盤，亦保留實體鍵盤輸入。

- 輸入 `√2`、`2√2`、`π/3`、`1/2`、`(1+√5)/2`，保留原式，不會被滑桿吸附成 1.4 或 1.0。
- 模組的「精確算式」與滑桿並存；只有主動拖曳滑桿，才會改成滑桿選取的數值。
- 角度欄以原有單位為準：度數欄輸入 `60°` 或 `π/3 rad` 表示同一角；直接輸入 `π/3` 則仍是 π/3 度。函數中的 `sin(30°)` 支援角度轉弧度。
- 次數、項數、樣本數等離散參數會驗證整數結果，允許 `√4`，拒絕 `√2`，不會偷偷四捨五入。
- 模組的符號參數保存到本機、分享連結與學習紀錄 JSON。通用繪圖的算式、參數、滑桿範圍、t 範圍與視窗同樣保存原始符號；相容舊版純數值資料。

**精確輸入與數值計算的界線：**原始算式是保存與還原的依據，未以近似小數取代。畫布、既有模組計算、求根與積分仍使用浮點近似；本版不是符號代數系統，不會宣稱所有模組推導結果都經過精確化簡。

## v2.2 智慧通用繪圖 Pro

從首頁「智慧繪圖」進入，或直接開啟 [graph.html](graph.html)。正式網址：[智慧繪圖 Pro](https://jasoart.github.io/Math/graph.html)。

- 同時疊加最多 **12 條**函數、隱函數、不等式區域、參數曲線、極座標或座標點；可改色、複製與隱藏。
- **分段函數**：`if(x<0,-x,x^2)`；延遲計算分支，因此 `if(x>=0,sqrt(x),sqrt(-x))` 可用。
- **定義域限制**：`y=sqrt(x) {0<=x<=4}`；支援連鎖比較、`&&`、`||`。
- **不等式著色**：`x^2+y^2<=9`、`y>x+1`；嚴格不等式的邊界採虛線，各列區域分別著色。
- **六組動態參數** a、b、c、d、h、k，自訂最小／最大／步長，播放往返動畫；切換分頁會暫停。
- 拖曳平移、滾輪／雙指縮放、鍵盤操作、等比例座標、智慧取景、精準視窗與專注畫布。
- 可見一般函數的零點、局部極值、交點，函數追蹤、數值斜率、切線與導函數疊圖。
- **定積分與幾何面積**：計算 f 或 f−g 的積分，並分開計算 |f−g| 的面積；正負區域採不同顏色。反向上下限的積分變號，幾何面積保持非負。
- **數值表**：同時比較所有可見一般函數，最多 200 筆，可下載含完整數值的 UTF-8 CSV。
- **60 個狀態的復原／重做**，本機自動儲存，分享網址、JSON 備份與驗證匯入；相容 v2.1 的分享及本機資料。
- **PNG 與向量 SVG** 匯出，附目前算式與六組參數。
- 範例涵蓋拋物線、圓與橢圓、三角函數、有理函數、李沙育曲線、玫瑰線、座標點、分段函數、不等式、積分與 **v–t 等加速度位移**。

算式使用白名單解析器，不執行使用者 JavaScript，正式網站無 CDN 或 API 需求。每列最多 480 字。三角函數採弧度，`log` 為底數 10、`ln` 為自然對數；支援 `2x`、`πx`、`x(x+1)`、`cbrt`、雙曲函數等。函數引數必須加括號；除法請明確寫成 `1/(2x)`。目前不提供自訂函數、符號代數、自然語言、3D 或手動幾何作圖。

**數值限制：**繪圖、特殊點、導數及積分均為有限取樣近似，不能取代代數證明。可能遺漏高頻震盪、靠近的根、孤立點、狹窄區域或可去不連續點；不會自動標出所有空心端點。隱函數和不等式不列特殊點；floor／ceil／round／sign 略過特殊點分析。智慧取景對一般函數採 x∈[−10,10] 並略去部分極端 y 值，隱函數需手動調整。差分導數不能證明可微；數值積分只適用有限區間，遇到非有限值或未收斂時拒絕回傳估計，不處理瑕積分或柯西主值。即使顯示估計，也應先確認定義域與連續性。

JSON／分享保存算式、顏色、參數、滑桿、格線與視窗；切線、追蹤、積分結果與數值表是暫時的觀察工具。修改函數／參數後，需重新計算積分與數值表。滑桿動畫期間暫停特殊點分析，結束後重新計算。

```bash
npm ci
npm run check
npm run test:graph:core   # 數學、資料驗證、DOM 與事件，不需瀏覽器
npm run test:graph        # 以上檢查，再加 Playwright 真實瀏覽器驗證
```

核心測試逐一驗證全部 98 個模組的 301 個符號參數、鍵盤編輯、角度單位、分享及學習備份，並包含原有解析／數值案例、分段與範圍、積分符號與幾何面積、奇異點、不可信輸入、舊資料遷移、復原分支、參數動畫、JSON 及分享、SVG、CSV 等。`scripts/verify-graph.cjs` 保留桌面／手機／平板、Canvas、雙指縮放與 PNG 的實際瀏覽器測試，可用 `CHROMIUM_PATH` 指定瀏覽器。

本次發版執行語法、數學、資料與 DOM／事件測試；當前環境沒有可用的瀏覽器控制工具，未執行真實瀏覽器版面及觸控測試。DOM 測試不代表 Safari／iPad 的實機驗證。

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
| `graph.html`、`graph/` | v2.2 智慧繪圖 Pro 工作區、算式解析與數值分析 |
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
