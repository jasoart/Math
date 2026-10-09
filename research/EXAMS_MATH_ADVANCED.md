# 111–115 分科測驗數學甲：上傳試卷題型索引

分析日期：2026-10-09。資料來源為使用者上傳的五份 PDF 的版面文字抽取。此索引只記錄題型證據與學習模組關聯，不提供完整題文、選項答案或解題結果。

五份文件各有第 1–17 題，共 **85 個編號題**。12–14、15–17 題組按各編號分開計數；不把作答範例、參考公式或多選題的各個選項算成新題。每題只選一個主要領域，次要主題可複選。因此主要領域總和為 85，而多標籤主題出現次數可超過 85。統計未依配分加權；JSON 另記每題配分，各年合計 100 分。

主要領域依題目要求的主要操作判定。例如由積分函數求閉區間最值歸「微分」、求累積量或體積歸「積分」，含共軛根並連結函數性質的題先歸「複數」。這是人工分類規則，不是大考中心的官方分類，也不是未來出題機率。

所有 PDF 均標記為使用者上傳，未獨立核實官方發布與檔案真偽。**115 卷的年份只來自檔名與封面；以分析日期而言標示年為 2026，仍不能僅由上傳檔推定官方已發布或檔案與官方版本一致。** 文件來源、文字 SHA-256、逐題不確定性保存在 JSON。

文字抽取會遺失根號範圍、共軛橫線、模長豎線、上下標和圖形。confidence 只表示主題辨識把握；core-concept 表示主要概念直接對應，partial／related 表示部分或相關概念，三者都不表示模組已重現或解完整道題目。附圖依賴較重的題目需回到原 PDF 人工檢視。試卷作答注意事項屬資料，未作為網站或代理的操作指令。

| 主要領域 | 題數 |
|---|---:|
| 數與式 | 1 |
| 函數與多項式 | 2 |
| 指數與對數 | 3 |
| 數列與級數 | 4 |
| 三角 | 4 |
| 平面向量 | 4 |
| 空間向量與幾何 | 13 |
| 矩陣與線性系統 | 7 |
| 圓與直線 | 3 |
| 二次曲線 | 6 |
| 複數 | 8 |
| 排列組合 | 4 |
| 機率與隨機變數 | 8 |
| 極限 | 1 |
| 微分 | 9 |
| 積分 | 8 |
| 合計 | 85 |

## 逐年逐題

### 111 年（17 題）

來源：`01-111分科測驗數學甲試卷定稿.pdf`；狀態：使用者上傳，未獨立核實。頁碼採試卷內印刷頁碼，不含封面。

| 題號／頁 | 主領域 | 題型證據摘要 | 現有模組 | 新模組候選 |
|---|---|---|---|---|
| 1／1 | 數列與級數 | 等比數列相鄰項運算的對數和與範圍判讀 | `sequence-series`, `logarithm-domain-scale` | — |
| 2／1 | 矩陣與線性系統 | 參數化三元一次方程組的無解條件 | `gaussian-elimination-visual`, `matrix-inverse-system` | — |
| 3／2 | 空間向量與幾何 | 單位位置向量、與坐標軸夾角及到軸距離 | `sphere-space-coordinate`, `line-plane-angle`, `projection` | — |
| 4／2 | 複數 | 實係數多項式整除與非實根配對 | `complex-conjugate-roots`, `polynomial-remainder` | — |
| 5／3 | 圓與直線 | 平移圓的極端距離、極坐標與旋轉後方程 | `circle-standard-equation`, `circle-line`, `matrix` | `polar-sector-sweep` |
| 6／3 | 矩陣與線性系統 | 由基底像辨認線性變換、行列式、長度與夾角 | `matrix`, `determinant-system`, `projection` | — |
| 7／4 | 二次曲線 | 拋物線焦點弦、準線投影與三角比關係 | `parabola`, `triangle-laws` | — |
| 8／4 | 極限 | 數列不等式、已知極限與可推出的收斂資訊 | `squeeze-theorem`, `limit-continuity`, `sequence-series` | — |
| 9／5 | 機率與隨機變數 | 有限次連續成功事件構成的顧客成功率與等待期望 | `probability-tree-independence`, `geometric-distribution`, `discrete-random-variable` | — |
| 10／5 | 排列組合 | 帶指定日、禁用日與每日非空條件的安排計數 | `counting-principle`, `stars-and-bars` | `constrained-counting` |
| 11／6 | 複數 | 單位圓上的複數冪與距離相等條件 | `complex`, `complex-demoivre` | — |
| 12／7 | 空間向量與幾何 | 立體投影與斜角的三角比 | `line-plane-angle`, `space-plane-distance` | `spatial-section-geometry` |
| 13／7 | 空間向量與幾何 | 用全等三角形建立隨高度改變的截面面積 | `cross-section-volume` | `spatial-section-geometry` |
| 14／8 | 積分 | 切片長方體估計、黎曼和及定積分體積 | `riemann`, `cross-section-volume` | `spatial-section-geometry` |
| 15／9 | 微分 | 從向量長度與夾角建立函數並求導函數 | `projection`, `triangle-laws`, `derivative-rules` | — |
| 16／9 | 微分 | 用增減性判斷夾角最大時的參數 | `derivative-optimization`, `projection` | — |
| 17／10 | 微分 | 函數的一次近似用於餘弦估計 | `taylor`, `derivative-tangent` | — |

### 112 年（17 題）

來源：`01-112分科測驗數學甲考科試題.pdf`；狀態：使用者上傳，未獨立核實。頁碼採試卷內印刷頁碼，不含封面。

| 題號／頁 | 主領域 | 題型證據摘要 | 現有模組 | 新模組候選 |
|---|---|---|---|---|
| 1／1 | 平面向量 | 指定方向與路程的向量位移及軸交點 | `vector-linear-combination`, `projection`, `line-slope-intercept` | — |
| 2／1 | 指數與對數 | 由質量比建立兩種半衰期的指數衰退關係 | `exponential-log`, `exponential-compound-interest` | — |
| 3／1 | 積分 | 將根式數列和的極限辨認為黎曼積分 | `riemann`, `limit-continuity` | — |
| 4／2 | 數與式 | 絕對值不等式的包含區間與變換 | `number-line-absolute`, `function-transformations` | — |
| 5／2 | 複數 | 共軛虛根推多項式資訊並連結極值及反曲點 | `complex-conjugate-roots`, `derivative-optimization`, `concavity-inflection` | — |
| 6／3 | 空間向量與幾何 | 內積、外積、線性獨立與三階行列式 | `projection`, `vector-linear-combination`, `scalar-triple-product`, `gaussian-elimination-visual` | `space-cross-product` |
| 7／3 | 機率與隨機變數 | 圓形時鐘上隨機步行的分布、對稱與期望 | `binomial-distribution`, `discrete-random-variable`, `markov-chain` | — |
| 8／4 | 複數 | 含共軛的複數方程、模長與主輻角 | `complex`, `complex-demoivre`, `complex-nth-roots` | — |
| 9／4 | 三角 | 直角三角形外作等腰三角形後的點間距離 | `triangle-laws`, `matrix`, `vector-linear-combination` | — |
| 10／4 | 空間向量與幾何 | 直線穿過兩平行平面所截線段的長度 | `space-plane-distance`, `line-plane-angle` | — |
| 11／5 | 排列組合 | 含重複數字的四位排列與獲獎條件聯集 | `counting-principle`, `hypergeometric-sampling` | `constrained-counting` |
| 12／5 | 平面向量 | 圓心到兩點向量的夾角餘弦 | `projection`, `circle-standard-equation` | — |
| 13／5 | 微分 | 二次函數與圓在共同點的共同切線證明 | `derivative-tangent`, `circle-line`, `quadratic-vertex` | — |
| 14／5 | 積分 | 二次函數與半圓弧之間的有界面積 | `area-between-curves`, `riemann` | — |
| 15／6 | 二次曲線 | 旋轉橢圓上的最遠點與長軸長度 | `conic-rotation-xy`, `ellipse`, `matrix` | — |
| 16／6 | 二次曲線 | 旋轉橢圓的短軸方向、方程與長度 | `conic-rotation-xy`, `ellipse`, `matrix` | — |
| 17／6 | 矩陣與線性系統 | 由旋轉後軸上點反求原橢圓上點的坐標 | `matrix`, `matrix-inverse-system`, `conic-rotation-xy` | — |

### 113 年（17 題）

來源：`113分科測驗數學甲試題.pdf`；狀態：使用者上傳，未獨立核實。頁碼採試卷內印刷頁碼，不含封面。

| 題號／頁 | 主領域 | 題型證據摘要 | 現有模組 | 新模組候選 |
|---|---|---|---|---|
| 1／1 | 三角 | 由三角形高及兩底角正切求底邊 | `triangle-laws`, `trig` | — |
| 2／1 | 二次曲線 | 沿兩坐標方向伸縮橢圓與焦點 | `ellipse`, `matrix`, `function-transformations` | — |
| 3／1 | 排列組合 | 棋盤上互不攻擊棋子與禁放格的限制計數 | `counting-principle` | `constrained-counting` |
| 4／2 | 機率與隨機變數 | 重複抽獎、至少一次成功與等待期望的模型判讀 | `geometric-distribution`, `binomial-distribution`, `exponential-log` | — |
| 5／2 | 複數 | 共軛虛根、餘式資訊與三次函數對稱中心 | `complex-conjugate-roots`, `polynomial-remainder`, `cubic-symmetry-center` | — |
| 6／3 | 空間向量與幾何 | 內積和外積資訊限制夾角、長度及唯一性 | `projection`, `cauchy-bound`, `scalar-triple-product` | `space-cross-product` |
| 7／3 | 微分 | 多項式增減凹凸與平移正弦週期的判讀 | `derivative-rules`, `derivative-optimization`, `concavity-inflection`, `trig-graph-transform` | — |
| 8／4 | 複數 | 複數冪的實虛部數列與收斂、週期關係 | `complex-demoivre`, `complex`, `sequence-series`, `limit-continuity` | — |
| 9／4 | 矩陣與線性系統 | 相同列運算作用於不同常數向量的線性關係 | `gaussian-elimination-visual`, `matrix-inverse-system` | — |
| 10／4 | 圓與直線 | 已知弦長及弦線斜率求圓半徑的關係 | `circle-line`, `circle-standard-equation`, `line-slope-intercept` | — |
| 11／5 | 數列與級數 | 等差原數列與對數等差條件的連結 | `sequence-series`, `logarithm-domain-scale` | — |
| 12／5 | 矩陣與線性系統 | 三平面共同交點的聯立求解 | `gaussian-elimination-visual`, `plane-intersection-line` | — |
| 13／5 | 空間向量與幾何 | 兩平面交線方向與三組直線銳夾角 | `plane-intersection-line`, `line-plane-angle` | `space-cross-product` |
| 14／5 | 空間向量與幾何 | 以第四平面圍成指定邊長正四面體 | `space-plane-distance`, `plane-intersection-line`, `scalar-triple-product` | `spatial-section-geometry` |
| 15／6 | 微分 | 三次多項式的導函數辨識 | `derivative-rules`, `derivative-tangent` | — |
| 16／6 | 微分 | 三次函數指定點上的切線 | `derivative-tangent`, `cubic-symmetry-center` | — |
| 17／6 | 積分 | 三次函數與其切線所圍有界面積 | `area-between-curves`, `riemann`, `derivative-tangent` | — |

### 114 年（17 題）

來源：`01-114分科測驗數學甲試卷.pdf`；狀態：使用者上傳，未獨立核實。頁碼採試卷內印刷頁碼，不含封面。

| 題號／頁 | 主領域 | 題型證據摘要 | 現有模組 | 新模組候選 |
|---|---|---|---|---|
| 1／1 | 三角 | 正弦圖形對稱與相位差方程解 | `trig-equation-solutions`, `trig-graph-transform` | — |
| 2／1 | 空間向量與幾何 | 立方體中同時垂直兩指定平面的平面 | `line-plane-angle`, `plane-intersection-line` | `space-cross-product`, `spatial-section-geometry` |
| 3／1 | 排列組合 | 圓上八點決定不同直線的共線去重計數 | `counting-principle`, `line-slope-intercept`, `circle-standard-equation` | `constrained-counting` |
| 4／2 | 二次曲線 | 由鉛直線相交條件判斷二次曲線的x投影範圍 | `ellipse`, `hyperbola`, `parabola` | — |
| 5／2 | 數列與級數 | 週期餘弦數列的收斂與冪項無窮級數 | `trig`, `sequence-series`, `infinite-geometric-series` | — |
| 6／3 | 指數與對數 | 指數與直線交點、對數反函數及對稱 | `exponential-log`, `inverse-composition`, `logarithm-domain-scale` | — |
| 7／3 | 微分 | 由高次多項式局部極值限制導數符號與次數 | `derivative-optimization`, `concavity-inflection`, `root-multiplicity` | — |
| 8／4 | 複數 | 複數冪、共軛模長與三點共線 | `complex`, `complex-demoivre`, `complex-conjugate-roots` | `complex-collinearity` |
| 9／4 | 矩陣與線性系統 | 旋轉矩陣與鏡射矩陣的合成及三角參數 | `matrix`, `matrix-inverse-system`, `trig` | — |
| 10／4 | 空間向量與幾何 | 由同一平面與坐標平面交出的平行直線求距離 | `space-skew-lines`, `space-plane-distance`, `plane-intersection-line` | — |
| 11／5 | 平面向量 | 平行四邊形對角線與邊方向決定面積 | `vector-linear-combination`, `shoelace-determinant-area`, `line-slope-intercept` | — |
| 12／5 | 機率與隨機變數 | 兩次獨立抽獎皆失敗的事件機率 | `probability-tree-independence`, `binomial-distribution` | — |
| 13／5 | 機率與隨機變數 | 依定義以級數表示首次成功等待次數期望 | `geometric-distribution`, `discrete-random-variable`, `sigma-sum-formulas` | — |
| 14／5 | 機率與隨機變數 | 有保底與無上限兩種購買策略的花費期望比较 | `geometric-distribution`, `discrete-random-variable` | — |
| 15／6 | 函數與多項式 | 參數範圍內二次函數在區間的非負性證明 | `quadratic-vertex`, `function-transformations` | — |
| 16／6 | 積分 | 參數化二次曲線下的面積不變性 | `riemann`, `area-between-curves` | — |
| 17／6 | 積分 | 固定平面面積圖形的旋轉體體積與參數最大值 | `cross-section-volume`, `derivative-optimization` | — |

### 115 年（17 題）

來源：`01-115分科測驗數學甲考科試卷.pdf`；狀態：使用者上傳，未獨立核實。頁碼採試卷內印刷頁碼，不含封面。

| 題號／頁 | 主領域 | 題型證據摘要 | 現有模組 | 新模組候選 |
|---|---|---|---|---|
| 1／1 | 二次曲線 | 比較橢圓與雙曲線圖形的軸向和標準式 | `ellipse`, `hyperbola` | — |
| 2／1 | 數列與級數 | 完整與奇數項等比級數的收斂及乘積條件 | `infinite-geometric-series`, `sequence-series` | — |
| 3／1 | 三角 | 相位平移正弦與正餘弦疊合的最大值 | `trig-composition`, `trig-graph-transform` | — |
| 4／2 | 機率與隨機變數 | 抽球條件機率、期望與機率比例的數列及三角形條件 | `probability-tree-independence`, `discrete-random-variable`, `sequence-series`, `triangle-laws` | — |
| 5／2 | 複數 | 參數複數商的實虛部、共軛、模長與主輻角 | `complex`, `complex-conjugate-roots` | — |
| 6／3 | 積分 | 左右端點黎曼和、導數符號與梯形近似误差 | `riemann`, `concavity-inflection` | `riemann-error-bounds` |
| 7／3 | 指數與對數 | 對數有理式的定義域、奇對稱與反函數 | `logarithm-domain-scale`, `inverse-composition`, `exponential-log` | — |
| 8／4 | 平面向量 | 固定向量和長度及向量差下的內積與面積界 | `projection`, `cauchy-bound`, `shoelace-determinant-area`, `vector-linear-combination` | — |
| 9／4 | 矩陣與線性系統 | 購買總量、總價及重量差模型的高斯消去 | `gaussian-elimination-visual`, `matrix-inverse-system` | — |
| 10／4 | 圓與直線 | 圓到兩不相交直線的距离比與过原點切線 | `circle-line`, `circle-standard-equation`, `line-slope-intercept` | — |
| 11／5 | 機率與隨機變數 | 兩階段二項試驗與獲獎條件下的條件機率 | `binomial-distribution`, `two-way-table-bayes`, `probability-tree-independence` | — |
| 12／5 | 函數與多項式 | 多項式與變上限積分恆等式的特定點關係 | `polynomial-remainder`, `ftc-accumulation` | — |
| 13／5 | 積分 | 利用變上限積分關係與多項式條件辨識 被積函數 | `ftc-accumulation`, `derivative-rules`, `polynomial-remainder` | — |
| 14／5 | 微分 | 變上限積分函數在閉區間的最大與最小值 | `ftc-accumulation`, `derivative-optimization` | — |
| 15／6 | 空間向量與幾何 | 指定點到平面的距離 | `space-plane-distance` | — |
| 16／6 | 空間向量與幾何 | 包含給定直線且平行兩平面交線的平面 | `plane-intersection-line`, `space-plane-distance`, `vector-linear-combination` | `space-cross-product` |
| 17／6 | 空間向量與幾何 | 三平面的垂直截面形成正三角形的證明與邊長 | `line-plane-angle`, `plane-intersection-line`, `space-plane-distance` | `spatial-section-geometry`, `space-cross-product` |

## 需要注意的教學缺口

下列候選需確認實作內容後才加入網站連結。即使模組名稱相近，也不應宣稱可處理所有原題。

- `complex-collinearity`：以複數商的虛部與三點共線連結代數和幾何。 關聯題：114-8。
- `constrained-counting`：限制排列、重複元素與禁止位置；需清楚區分不同物件與不同結果。 關聯題：111-10、112-11、113-3、114-3。
- `polar-sector-sweep`：極坐標半徑與角度的圖形掃描；111 第5題只屬部分關聯。 關聯題：111-5。
- `riemann-error-bounds`：左右端點和、梯形近似以及單調和凹凸條件下的有號積分誤差。 關聯題：115-6。
- `space-cross-product`：外積、法向量、面積與兩平面交線方向的三維互動。 關聯題：112-6、113-6、113-13、114-2、115-16、115-17。
- `spatial-section-geometry`：立體與平面截面觀察；若實作只支援立方體，對積木、正四面體和多平面截面仍屬部分關聯。 關聯題：111-12、111-13、111-14、113-14、114-2、115-17。

其他仍屬部分覆蓋的題型：112 第 7 題的模 12 隨機步行、111 第 9 題的有限次連續成功事件、114 第 10 題的平行線距離退化情況，以及 113 第 4 題中重複抽獎的獨立性假設。這些應採原題語意建立模型，不能只靠關鍵字映射直接解題。

機器可讀資料：[`exams-math-advanced.json`](exams-math-advanced.json)。逐題 `uncertainty` 記錄抽取限制，`proposedModuleIds` 與 `moduleIds` 分開，以免把尚未驗證的候選當作已存在功能。
