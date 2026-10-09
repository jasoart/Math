# Changelog

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
