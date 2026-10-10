# Changelog

## v2.3.0 — 2026-10-10

- 新增 50 個獨立主題模組，總數 148；新增 132 個數值欄位，全站 433 個欄位沿用符號鍵盤與原式分享／備份。
- 涵蓋代數、三角、平面與空間幾何、數列、排列組合、機率統計、極限與微積分；保留全部原模組 ID。
- 每個新模組加入數學訊號、條件與陷阱、變體練習和可收合解答；提供「只看本次新增」篩選。
- 新模組處理無解、退化、分母禁點、零機率條件等情境；空間投影與延伸探索另行標示。
- 公式文字安全轉義，修正小於符號可能被解讀成 HTML 而遺失的問題。
- 驗證包括 390 組 Python 參考、1,032 個參考值比對、1,172 次邊界／組合／窄畫布繪製，以及 148 模組的符號、分享、篩選、練習解答整合；未執行實機瀏覽器觸控測試。

## v2.2.0 — 2026-10-10

- 共用網頁數學鍵盤：√、π、分數、次方、函數、條件符號與 MathML 預覽，支援全部 98 個模組的 301 個數值欄位。
- 以原始符號算式保存模組與繪圖參數、分享、JSON 及本機紀錄；輸入不吸附滑桿刻度，離散數量檢查整數，支援度／弧度明確輸入。
- 通用繪圖擴充為 12 列，加入分段函數、定義域限制、連鎖比較與不等式區域著色。
- 六組參數、自訂滑桿範圍／步長、往返動畫；圖形配色、複製、精準視窗及專注畫布。
- 加入導函數疊圖、追蹤、有限區間積分、兩曲線間幾何面積、數值表及 CSV。
- 加入 60 個狀態的復原／重做、JSON 備份／驗證匯入、向量 SVG；相容舊版分享與本機資料。
- 改善偶重根的數值搜尋、微小函數值的判定、無效區間繪圖負擔與積分不收斂處理；新增 v–t 位移範例。
- 通過語法、466 項數學／狀態／符號欄位檢查及 DOM／事件回歸；保留 Playwright 測試，但本次環境未執行真實瀏覽器與觸控驗證。

## v2.1.0 — 2026-10-10

- 加入獨立智慧通用繪圖工作區與首頁導覽入口，保留既有 98 個模組。
- 支援函數、隱函數、參數式、極座標、座標點與最多 8 條圖形疊加；安全白名單算式解析與 a/b/c 參數偵測。
- 加入數值零點／局部極值／交點、指定 x 的函數值與切線、等比例縮放平移、觸控手勢與智慧取景。
- 提供本機儲存、驗證分享還原、附算式與參數的 PNG 匯出、可復原範例與手機版面。
- 新增解析器、數值與瀏覽器測試；明列有限取樣與不支援的輸入範圍。

## v2.0.0 — 2026-10-09

- 新增 13 個實驗，模組總數 98；保留純前端靜態部署。
- 新增課程／主題篩選、收藏、本機筆記與練習標記、教師投影與公式揭露、分享參數、JSON 備份與驗證匯入。
- 分析使用者提供的 10 卷、185 個編號題，附逐題頁碼、摘要、概念模組及閱讀限制。
- 以原作者與官方公司儲存庫核實互動視覺化研究的出處，分開標記全文、摘要及未核驗的官方課綱入口。
- 使用 animation frame 合併繪圖更新，快取畫布尺寸並限制 HiDPI backing store；新增數學不變量與瀏覽器回歸驗證。

## v1.1.0

### Added

- Expanded the project from 41 to **85 interactive modules**.
- Added full-unit coverage files:
  - `ALL_UNITS_CHECKLIST.md`
  - `EXAM_115_ALIGNMENT.md`
- Added algebra/function modules:
  - set logic and Venn diagram
  - line slope/intercept
  - linear programming
  - circle standard equation
  - function transformations
  - inverse/composition functions
  - cubic symmetry center
  - root multiplicity
  - compound interest
  - logarithm domain/scale
  - sigma formulas
  - recurrence sequences
  - infinite geometric series
- Added trigonometry modules:
  - trigonometric graph transformations
  - trigonometric equation solutions
- Added vector/space/matrix modules:
  - plane intersection line
  - line-plane angle
  - 2×2 inverse matrix
  - Gaussian elimination
  - determinant/shoelace area
  - scalar triple product
  - sphere and space coordinates
- Added calculus modules:
  - Newton's method
  - derivative rules
  - concavity and inflection
  - optimization box
  - piecewise continuity and IVT
  - squeeze theorem
  - cross-section/solid of revolution volume
- Added complex/conic modules:
  - complex nth roots
  - conjugate complex roots
  - rotated ellipse with xy term
  - ellipse parametric form
- Added probability/statistics modules:
  - stars and bars
  - binomial theorem / Pascal triangle
  - probability tree and independence
  - discrete random variable expectation/variance
  - subjective/objective probability
  - contingency table Bayes
  - mean/variance transformation
  - histogram/cumulative distribution
  - covariance/correlation sign
  - binomial-normal approximation
  - hypergeometric intuition

### Changed

- Updated `README.md`, `MODULE_INDEX.md`, `CURRICULUM_MAP.md`, `ROADMAP.md`, and `TEACHER_GUIDE.md` for v1.1.
- Calibrated module coverage against 115 GSAT Math A and 115 AST Math甲 topic patterns.

### Verified

- `node --check app.js` passes.

## v1.0.0

### Added

- Expanded the project to 41 interactive high-school math modules.
- Added module search in the sidebar.
- Added a Top-Score Task panel for every module.
- Added curriculum coverage documents:
  - `CURRICULUM_MAP.md`
  - `MODULE_INDEX.md`
