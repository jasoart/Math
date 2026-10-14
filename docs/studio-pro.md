# Math Lab：積木、動態系統與 MathInk

這次更新讓數學實驗同時具有可拖移的結構、可閱讀的程式與可匯出的圖形。首頁、程式實驗、平面繪圖及其他頁面共用新的紙白／墨綠視覺系統。

## 開始使用

1. 開啟 `script.html`，預設使用積木工作區。從左側五個分類拖入積木，接入「開始數學實驗」。
2. 使用數值、變數、函數、向量等積木填滿插槽；完整且合法的程式會自動更新右側預覽。點「文字程式」可直接編輯 MathScript。
3. 函數／向量積木可用右鍵或長按選單增減引數；矩陣由巢狀向量構成。19 個既有範例均支援文字→積木→文字。
4. 開啟 `graph.html` 的「向量場」，選擇簡諧振盪、阻尼螺旋、單擺、鞍點或邏輯斯成長，按「繪製向量場」。可輸入初始座標，或勾選「點畫布加入初始點」。
5. 程式頁下方的 MathInk 工作台可輸入公式，匯出獨立 SVG。平面繪圖的算式預覽也優先使用 MathInk。

## 積木輸入

拖移、吸附、縮放、觸控及復原由 **Blockly 12.5.1** 提供；數學指令、積木模型、MathScript 生成器、註解保留與執行橋接是本專案實作。Blockly 以 Apache-2.0 授權本機封裝，沒有執行期 CDN。此版本與專案現有 jsdom 26 測試環境相容。

| 分類 | 功能 |
|---|---|
| 定義 | 標題、變數、參數滑桿、自訂函數 |
| 運算 | 四則、次方、比較、邏輯、三角與指數函數、條件函數 |
| 繪圖 | 視窗、函數、參數曲線、點、資料散點、折線 |
| 微積分 | 微分、切線、定積分、求根、有限加總與連乘 |
| 資料 | 向量、矩陣、統計、線性系統、取樣、結果、驗證 |

插槽區分純量、布林與資料。變數與通用函數的確切型別由 MathScript 執行器檢查。大型資料陣列保留在可編輯的進階算式積木中，避免產生上千個小方塊。此工作區針對 MathScript 1.2；頁面下方的 MathScript Web 0.2 模組編譯器維持原有獨立語法。

完整來源與原有註解可往返；修改指令時重新生成該指令，保留其註解。未接回起點的積木與缺少引數會阻止同步，不會被默默忽略。無效文字仍可在文字模式編輯。文字與未完成積木衝突時，明確按「從文字載入」，舊積木會提供下載備份。

積木有獨立的本機草稿及 `.blocks.json` 匯入／匯出；現有作品／分享保存已同步的 MathScript。匯入限制為 350 KB、1,200 塊積木，使用白名單與深度限制。匯入檔附帶的原始碼只有在其 AST 與可見積木相同時才會保留。

## 平面繪圖

### 背景細化

拖曳與調整視窗時先顯示快速取樣，停止互動後交由 Web Worker 批次計算完整幾何。每個請求包含視窗、尺寸、參數、品質及算式；切換場景會取消過時工作，已完成的幾何有界快取。Canvas 與 SVG 使用相同幾何路徑。PNG／SVG 匯出使用同步精細取樣，避免匯出尚未細化的畫面。

原有自適應函數取樣、隱函數 marching squares、漸近線拒絕、標籤避碰及自動微分保留；這些不是本次新發明。Worker 無法使用時保留既有同步繪圖路徑。

### 動態系統

輸入平面系統 `dx/dt = P(x,y,t)`、`dy/dt = Q(x,y,t)`。箭頭正規化長度，原始速度區分深淺。軌跡使用自研 RK4＋步長加倍誤差估計，前向與反向各自積分；支援最多 12 個初始點、每方向最多 5,000 次嘗試，非有限值、發散、精度不足或預算用盡時停止並回報。

含時間的系統以 `t=0` 顯示背景箭頭，軌跡則沿實際時間計算。軌跡為數值近似，不能保證跨越不連續點、剛性系統或所有特殊軌道的精度。它不是符號微分方程求解器。

向量場與軌跡直接整合進主畫布，可隨 PNG／SVG 匯出；CSV 包含初始點編號、方向、時間、座標與完成狀態。向量場設定另存本機草稿，**現有圖形 JSON／分享連結不包含向量場**，畫面有相同說明。

## MathInk 1.0

`engine/math-ink.js` 自行完成詞法解析、Pratt parser、數學盒模型及 SVG 位置計算，並輸出對應 MathML。分數的上下基線、根號線段、上下標、可伸展括號、矩陣欄寬與有限求和／定積分上下限均由這個引擎排版。瀏覽器可用時以 OffscreenCanvas 或 Canvas 取得字形寬度；沒有瀏覽器時使用保守字寬估計。

| 輸入 | 排版 |
|---|---|
| `sqrt(x^2+1)/(1+x^2)` | 根號、上標與垂直分數 |
| `a_i^2` | 同一基底上的上下標 |
| `[[1,2],[3,4]]` 或 `[1,2;3,4]` | 矩形矩陣與伸展括號 |
| `sum(n^2,n,1,N)` | 有上下限的有限求和 |
| `product(k,k,1,N)` | 連乘 |
| `integrate(exp(-x^2),x,0,1)` | 定積分與微分變數 |
| `1e-3` | 科學記號 |

引擎不執行公式，也不接受 TeX 巨集或任意 HTML。最多 1,200 字元、500 個語法節點、40 層巢狀、8×8 矩陣；輸出與字形度量均有界快取。SVG 可獨立下載，MathML 提供語義閱讀結構。

這是自研的實用數學記號子集，**不是完整 LaTeX、OpenType MATH 或電腦代數系統**。其他教材中的廣泛符號與文字排版繼續使用既有 KaTeX；不支援的圖形記號也會回退。沒有宣稱移除 KaTeX 或重寫其全部能力。

## 真人作品與設計參考

以下是實際搜尋閱讀的作者或團隊作品，參考其互動原則與資訊組織；沒有複製其插圖、品牌、版型或程式碼。首頁 SVG 是本專案新繪製的程式與曲線構圖。

| 作者／團隊與作品 | 參考重點與本次落實 |
|---|---|
| [Bret Victor — Explorable Explanations](https://worrydream.com/ExplorableExplanations/) | 讓模型可檢查、可修改：積木與可見程式並存 |
| [Bartosz Ciechanowski — Curves and Surfaces](https://ciechanow.ski/curves-and-surfaces/) | 操作接近圖形、說明克制：畫布旁配置參數與操作 |
| [Bartosz Ciechanowski — Mechanical Watch](https://ciechanow.ski/mechanical-watch/) | 清楚的視覺分工：積木分類、曲線與種子色彩對應 |
| [Amit Patel — Red Blob Games / Pathfinding](https://www.redblobgames.com/pathfinding/) | 用直接操作檢查模型：點畫布放入初始點，讓軌跡成為結果 |
| [Daniel Kunin、Jingru Guo 等 — Seeing Theory](https://blog.cs.brown.edu/2018/01/22/seeing-theory-teaching-statistics-through-interactive-web-based-visualizations/) | 由預設例子進入實驗：保留可編輯範例，新增五種動態系統 |
| [Nicky Case — LOOPY](https://ncase.me/loopy/) | 以視覺結構表達系統：拖移組合式輸入與即時回饋 |
| [Mathigon／Amplify — Polypad](https://polypad.amplify.com/) | 工具分類與直接操作：積木工具箱、縮放、復原與觸控 |
| [Steven Wittens — Making MathBox](https://acko.net/blog/making-mathbox/) | 公式與幾何互相支持：MathInk 公式預覽與向量圖匯出 |
| [Kalid Azad — Intuitive Understanding of Sine Waves](https://betterexplained.com/articles/intuitive-understanding-of-sine-waves/) | 從具體圖像理解關係：首頁以函數積木連結波形 |
| [J. Ström、K. Åström、T. Akenine-Möller — Immersive Linear Algebra](https://immersivemath.com/ila/ch00_preface/preface.html) | 讓數學物件可操作：矩陣、向量與既有實驗完整轉成積木 |
| [Chris Olah、Alexander Mordvintsev、Ludwig Schubert — Feature Visualization](https://distill.pub/2017/feature-visualization/) | 圖像、標註、說明分層：主畫布、工具面板與數值狀態分開 |
| [Jack Schaedler — Circles, Sines and Signals](https://jackschaedler.github.io/circles-sines-signals/) | 降低符號負擔：先操作圖形，按需查看生成程式與公式 |

## 技術研究與採用範圍

| 一手來源 | 狀態 |
|---|---|
| [Blockly JSON serialization](https://developers.google.com/blockly/guides/configure/web/serialization) | 已採用工作區 JSON、自訂積木 extra state 與型別連接 |
| [Desmos — Press a Key in the Calculator](https://engineering.desmos.com/articles/press-a-key-in-the-calculator/) | 借鏡主執行緒與背景數學運算分工；這是成熟設計，不標示為新論文 |
| [W3C MathML Core](https://www.w3.org/TR/mathml-core/) | 參考數學基線與結構語義；MathInk 以原創盒模型輸出 SVG＋MathML，未宣稱完整符合所有排版規範 |
| [MDN — OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) | 用於取得字形度量，並保留 Canvas／估計字寬回退 |
| [Linebender — Vello architecture](https://github.com/linebender/vello/blob/main/ARCHITECTURE.md) | 研究目前 CPU/GPU 分工與稀疏 strip 的方向；本次實作幾何計算／顯示分離，**沒有整合 Vello、稀疏 strip rasterizer 或 WebGPU** |
| [Idyll Studio — UIST 2021](https://idl.cs.washington.edu/files/2021-IdyllStudio-UIST.pdf) | 參考可反映底層程式的結構編輯；以積木、來源與執行結果的同步落實 |

研究中區分近期工程方向與經典基礎。此次以實際可維護的背景計算、取消過時工作、SVG／MathML 與觸控積木實作為交付，不把未整合的 GPU 技術列成已完成功能。

## 驗證與維護

```sh
npm ci
npm run check
npm run test:studio
npm run test:studio:browser
npm run test:language
npm run test:graph:core
npm run test:highschool
node scripts/typeset.test.cjs
npm run build:pwa
node scripts/pwa.test.cjs
npm run languages
npm run languages:check
```

瀏覽器測試需要 Playwright Chromium，可用 `CHROMIUM_PATH` 指定相容的本機瀏覽器；`SCREENSHOT_DIR` 指定截圖輸出資料夾。測試自行啟動本機 HTTP server，涵蓋滑鼠與觸控拖移、文字切換、範例、背景細化、向量場、匯出、錯誤及 1440／820／390 像素版面。Chromium 的平板模擬不等於實體 iPad／Safari 驗證。

數值測試以圓軌道守恆與指數解析解檢查積分誤差；積木測試檢查全部 19 範例的原文與結果往返。另保留原有圖形、MathScript、排版、高中工具及離線資產檢查。

修改積木第三方版本後執行 `npm run vendor:blocks`，保留對應上游授權；修改網頁資產後執行 `npm run build:pwa`。新增的程式與第三方資產按原有規則更新來源語言報告，不偽造 GitHub 原生語言分類。
