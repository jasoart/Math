# All Units Checklist：高中數學 A / 數甲完整單元檢核

本檔用來確認 v1.1 是否涵蓋高中數學 A 與分科數學甲核心單元。  
「涵蓋」代表至少有一個可操作互動模組能呈現該單元的主要概念、公式或考場判讀方式。

## 10 年級必修核心

| 單元群 | 覆蓋狀態 | 對應模組 |
|---|---:|---|
| 數與式、絕對值、集合邏輯 | ✅ | `set-logic-venn`, `number-line-absolute` |
| 坐標平面、直線、圓 | ✅ | `line-slope-intercept`, `circle-line`, `circle-standard-equation` |
| 二次函數與多項式 | ✅ | `quadratic-vertex`, `polynomial-remainder`, `root-multiplicity`, `cubic-symmetry-center` |
| 不等式、算幾、線性規劃 | ✅ | `amgm-rectangle`, `cauchy-bound`, `linear-programming` |
| 指數、對數、複利模型 | ✅ | `exponential-log`, `logarithm-domain-scale`, `exponential-compound-interest` |
| 數列、級數、Σ 符號 | ✅ | `sequence-series`, `sigma-sum-formulas`, `recurrence-sequence`, `infinite-geometric-series` |
| 排列組合 | ✅ | `counting-principle`, `stars-and-bars`, `binomial-theorem-pascal` |
| 機率基礎 | ✅ | `set-logic-venn`, `probability-tree-independence`, `two-way-table-bayes` |
| 數據分析 | ✅ | `mean-variance-transform`, `standardization-transform`, `boxplot-spread`, `histogram-cumulative` |

## 11 年級數學 A 核心

| 單元群 | 覆蓋狀態 | 對應模組 |
|---|---:|---|
| 三角比與三角測量 | ✅ | `triangle-laws` |
| 三角函數、週期圖像、疊合 | ✅ | `trig`, `trig-graph-transform`, `trig-equation-solutions`, `trig-composition` |
| 平面向量、內積、投影 | ✅ | `projection`, `vector-linear-combination`, `cauchy-bound`, `shoelace-determinant-area` |
| 空間坐標、空間向量、平面 | ✅ | `sphere-space-coordinate`, `space-plane-distance`, `space-skew-lines`, `plane-intersection-line`, `line-plane-angle`, `scalar-triple-product` |
| 矩陣、線性變換、反方陣、方程組 | ✅ | `matrix`, `determinant-system`, `matrix-inverse-system`, `gaussian-elimination-visual` |
| 轉移矩陣 | ✅ | `markov-chain` |
| 指數與對數函數延伸 | ✅ | `exponential-log`, `logarithm-domain-scale`, `exponential-compound-interest` |
| 主觀/客觀機率、條件機率、貝氏定理 | ✅ | `subjective-objective-probability`, `probability-tree-independence`, `two-way-table-bayes`, `bayes` |
| 迴歸、相關、標準化 | ✅ | `regression`, `covariance-correlation-sign`, `standardization-transform`, `mean-variance-transform` |

## 12 年級數學甲核心

| 單元群 | 覆蓋狀態 | 對應模組 |
|---|---:|---|
| 數列極限、夾擠、無窮等比級數 | ✅ | `infinite-geometric-series`, `squeeze-theorem`, `limit-continuity` |
| 函數極限、連續、介值定理 | ✅ | `limit-continuity`, `piecewise-continuity-ivt`, `squeeze-theorem` |
| 微分定義、導數公式、切線 | ✅ | `derivative-tangent`, `derivative-rules` |
| 單調、凹凸、反曲、最佳化 | ✅ | `derivative-optimization`, `concavity-inflection`, `optimization-box` |
| 泰勒近似、一次估計 | ✅ | `taylor`, `derivative-rules` |
| 黎曼和、定積分、微積分基本定理 | ✅ | `riemann`, `ftc-accumulation`, `area-between-curves` |
| 切片積分、旋轉體 | ✅ | `cross-section-volume` |
| 複數平面、極式、棣美弗、n 次方根 | ✅ | `complex`, `complex-demoivre`, `complex-nth-roots` |
| 實係數方程虛根成對 | ✅ | `complex-conjugate-roots` |
| 二次曲線、旋轉橢圓、參數式 | ✅ | `parabola`, `ellipse`, `hyperbola`, `conic-tangent`, `conic-rotation-xy`, `ellipse-parametric` |
| 反函數、合成函數 | ✅ | `inverse-composition`, `function-transformations` |
| 二項分布、幾何分布、期望與變異 | ✅ | `binomial-distribution`, `geometric-distribution`, `discrete-random-variable`, `normal-approx-binomial` |

## v1.1 補強後仍刻意不做成獨立模組的項目

以下項目屬於工具或延伸觀念，已融入相關模組，而非獨立成大型模組：

- 計算機數值估計：融入 `newton-method`, `infinite-geometric-series`。
- 公式代換與代數化簡：融入各模組即時公式。
- 一般含 xy 項二次式完整分類：以 `conic-rotation-xy` 呈現「旋轉橢圓產生 xy 項」的課綱核心精神，不把大學解析幾何完整分類塞入。
- 羅必達法則：不列為核心模組；本專案以高中課綱的極限、夾擠、導數與泰勒觀念為主。
