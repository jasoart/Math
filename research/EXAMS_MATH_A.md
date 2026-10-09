# 111–115 學測數學 A：題號與互動模組分析

分析對象為使用者上傳的 5 份 PDF，共 **100 個正式題號**（每年 20 題）。以下為人工歸類與概念摘要，不是大考中心官方分類，也不含官方解答。完整結構資料見 [exams-math-a.json](exams-math-a.json)。

## 計數、來源與限制

- 一個正式題號計一次，18–20 題組逐題計入。選填的填答空格、非選題內部小問不另增題數。
- `primaryTopic` 每題僅一類，合計 100；`topics` 可跨類，所以多標籤次數合計會超過 100。未以配分、難度或答對率加權。
- 模組連結用於觀念練習；「主概念」「部分」「相關」均不表示已重現完整原題。新增模組欄是實作規劃，應以最後產物為準。
- 文件以 `pdftotext -layout` 擷取。已查看 111 印刷第 1、2、3、6 頁、112 第 1、4 頁、113 第 1 頁、114 第 3 頁、115 第 1、2 頁圖像以查核關鍵根號、指數、矩陣與配置。其他頁未逐一視覺核驗，符號缺失處在 JSON 明示。
- 使用者 PDF 的作答注意事項是文件內容，不作為代理或網站功能指令。
- 115 文件封面標示 115 學年度；本份分析沒有驗證大考中心原站版本或考試日期。檔名和學年度不能單獨證明官方來源、發布日期或最新課綱。

## 主分類題數（每題一類）

| 人工主題分類 | 111 | 112 | 113 | 114 | 115 | 合計 |
|---|---:|---:|---:|---:|---:|---:|
| 數與式 | 1 | 1 | 0 | 0 | 1 | 3 |
| 函數與多項式 | 2 | 1 | 2 | 2 | 2 | 9 |
| 指數與對數 | 1 | 0 | 2 | 1 | 2 | 6 |
| 數列與級數 | 1 | 2 | 0 | 1 | 0 | 4 |
| 三角 | 3 | 3 | 3 | 3 | 2 | 14 |
| 平面向量 | 1 | 2 | 1 | 1 | 2 | 7 |
| 空間向量與幾何 | 3 | 3 | 4 | 2 | 3 | 15 |
| 矩陣與線性系統 | 1 | 2 | 1 | 3 | 2 | 9 |
| 圓與直線 | 3 | 2 | 2 | 3 | 2 | 12 |
| 排列組合 | 1 | 1 | 1 | 1 | 1 | 5 |
| 機率與隨機變數 | 2 | 2 | 2 | 2 | 2 | 10 |
| 統計與數據 | 1 | 1 | 2 | 1 | 1 | 6 |
| 合計 | 20 | 20 | 20 | 20 | 20 | 100 |

跨年可見的常見要求包括：由幾何條件建模、圖形與代數互換、資料轉換、條件機率與期望值、矩陣變換，以及限制條件下的計數。題數只描述這五卷，不用於預測下一次考試，也不推論正式課綱增刪。

## 補強模組及題號依據

| 概念模組規劃 | 對照題號 |
|---|---|
| `constrained-counting` | 111 Q1、112 Q4、113 Q5、114 Q3、114 Q15、115 Q4 |
| `data-projection-variance` | 111 Q3 |
| `floor-function-lattice` | 112 Q7、114 Q4、115 Q2 |
| `geometric-locus-ratio` | 111 Q15、112 Q15、112 Q19、114 Q11、115 Q6、115 Q10、115 Q17 |
| `matrix-power-recurrence` | 114 Q18、114 Q19、114 Q20、115 Q8 |
| `polar-sector-sweep` | 111 Q18、111 Q19、111 Q20 |
| `space-cross-product` | 111 Q17、112 Q5、113 Q2、113 Q18、114 Q6、115 Q18、115 Q19、115 Q20 |
| `spatial-section-geometry` | 111 Q11、113 Q20 |
| `trig-inequality-intervals` | 114 Q5 |

111 Q3 的投影變異可延伸到資料主方向與 PCA，但這是教學延伸，不能因此把 PCA 宣稱為數 A 必考課綱。111 Q18–20 的固定長度掃描棒需要更完整的幾何軌跡處理；極坐標扇形模組只有相關概念，未承諾直接複現題組。

## 111 學測數學 A

來源：`03-111學測數學a試卷定稿.pdf`；20 題；來源狀態：使用者上傳、未逐份核對官方原站。PDF SHA-256 與文字 SHA-256 均記錄在 JSON。

| 題號／印刷頁 | 主題 | 摘要證據 | 既有模組 | 新增規劃 | 連結程度 |
|---|---|---|---|---|---|
| 1／p.1 | 排列組合 | 由不同口味組合數的門檻反推口味數，再區分可重複與不可重複的兩球組合。 | `counting-principle`、`stars-and-bars` | `constrained-counting` | 部分 |
| 2／p.1 | 指數與對數 | 比較交換底數與真數的對數值，利用換底與互為倒數。 | `logarithm-domain-scale`、`exponential-log` | — | 主概念 |
| 3／p.1 | 統計與數據 | 比較散點沿不同直線投影後的一維變異，連結投影方向與資料主要伸展方向。 | `projection`、`mean-variance-transform`、`covariance-correlation-sign` | `data-projection-variance` | 相關 |
| 4／p.1 | 數列與級數 | 等差數列指定項的對數也成等差，連結加法差與乘法比例。 | `sequence-series`、`logarithm-domain-scale` | — | 部分 |
| 5／p.2 | 機率與隨機變數 | 由快篩陰性結果反推染病機率，比較一次與連續三次檢驗的條件機率。 | `bayes`、`probability-tree-independence`、`two-way-table-bayes` | — | 部分 |
| 6／p.2 | 圓與直線 | 由兩直線角平分線及正三角形配置判讀第三條直線的方向與方程。 | `line-slope-intercept`、`triangle-laws` | — | 部分 |
| 7／p.2 | 數與式 | 判讀絕對值不等式的等價變形、平方及整數解範圍。 | `number-line-absolute` | — | 主概念 |
| 8／p.2 | 三角 | 由平面三頂點坐標比較邊角、內積符號及外接圓半徑。 | `triangle-laws`、`projection`、`circle-standard-equation` | — | 部分 |
| 9／p.3 | 平面向量 | 交換向量線性組合係數，比較三角形內外位置、向量長度與子三角形面積。 | `vector-linear-combination`、`shoelace-determinant-area` | — | 部分 |
| 10／p.3 | 函數與多項式 | 由三次函數中心對稱及圖形變換判讀根、首項係數與中心附近近似。 | `cubic-symmetry-center`、`function-transformations`、`root-multiplicity` | — | 部分 |
| 11／p.3 | 空間向量與幾何 | 直角三角柱的平面截切、面面角及空間三角比比較。 | `line-plane-angle`、`sphere-space-coordinate`、`triangle-laws` | `spatial-section-geometry` | 相關 |
| 12／p.4 | 函數與多項式 | 由多項式除法餘式與無實根條件限制二次函數頂點高度。 | `polynomial-remainder`、`quadratic-vertex`、`root-multiplicity` | — | 部分 |
| 13／p.4 | 機率與隨機變數 | 不同抽卡位置具有不同中獎機率，以期望值線性性累加可購買批次的獎卡數。 | `discrete-random-variable`、`probability-tree-independence` | — | 部分 |
| 14／p.4 | 矩陣與線性系統 | 由原增廣矩陣與高斯消去後的階梯形判讀唯一解及參數。 | `gaussian-elimination-visual`、`determinant-system` | — | 主概念 |
| 15／p.5 | 三角 | 用相似三角形面積比、平行線路寬及三角比比較徵收土地。 | `triangle-laws`、`shoelace-determinant-area` | `geometric-locus-ratio` | 部分 |
| 16／p.5 | 空間向量與幾何 | 由空間直線的平面投影重合條件判定另一平面。 | `plane-intersection-line`、`space-plane-distance`、`line-plane-angle` | — | 部分 |
| 17／p.5 | 空間向量與幾何 | 以底面向量外積及受限頂點位置最大化平行六面體體積。 | `scalar-triple-product`、`cauchy-bound` | `space-cross-product` | 部分 |
| 18／p.6 | 圓與直線 | 同心圓之間的固定長度掃描棒，以距離與三角形幾何決定端點坐標。 | `circle-standard-equation`、`triangle-laws` | `polar-sector-sweep` | 部分 |
| 19／p.6 | 三角 | 固定長度掃描棒到達終點時的角度、極坐標及掃過區域作圖。 | `trig`、`triangle-laws`、`circle-standard-equation` | `polar-sector-sweep` | 相關 |
| 20／p.6 | 圓與直線 | 承接同心環帶掃描題組，計算第一象限與完整掃描區域的幾何面積。 | `circle-standard-equation`、`triangle-laws` | `polar-sector-sweep` | 相關 |

擷取與覆蓋限制：

- Q3：散點座標未列為數據表；已查看原 PDF 印刷第 1 頁圖形，只做方向與變異概念分析，不重建精確資料。
- Q5：題幹文字未明說三次檢驗的條件獨立模型；此索引只指出貝氏與重複檢驗考點，不給數值解答或額外假設。
- Q7：文字擷取遺失部分絕對值直線；已查看原 PDF 印刷第 2 頁核對，摘要只標示主題，不重製選項。
- Q9：已查看原 PDF 印刷第 3 頁以確認向量及長度符號；不據擷取的符號缺漏重建題目。
- Q11：已查看原 PDF 印刷第 3 頁積木示意圖；現有模組只支援角度與空間坐標，尚未重現原三角柱截切模型。
- Q19：文字擷取遺失端點根號；已查看原 PDF 印刷第 6 頁，確認半圓與端點配置，但尚未製作完整掃描軌跡。
- Q20：已查看原 PDF 印刷第 6 頁；須承接原題的端點移動與區域圖，索引不聲稱任意環帶扇形模組能直接計算整個原掃描區域。

## 112 學測數學 A

來源：`03-112學測數學a試卷.pdf`；20 題；來源狀態：使用者上傳、未逐份核對官方原站。PDF SHA-256 與文字 SHA-256 均記錄在 JSON。

| 題號／印刷頁 | 主題 | 摘要證據 | 既有模組 | 新增規劃 | 連結程度 |
|---|---|---|---|---|---|
| 1／p.1 | 數與式 | 連續三次取正平方根，反向以冪次運算恢復原正整數。 | `exponential-log` | — | 相關 |
| 2／p.1 | 三角 | 由單位圓切線與坐標軸截距辨認直角三角形中的正切。 | `trig`、`circle-line`、`triangle-laws` | — | 部分 |
| 3／p.1 | 統計與數據 | 將一軸資料取對數後用直線趨勢辨認原尺度的指數關係。 | `regression`、`logarithm-domain-scale`、`exponential-log` | — | 部分 |
| 4／p.1 | 排列組合 | 數字不可重複，且左右兩段指定遞增與遞減，依共同最高位與兩側分組計數。 | `counting-principle` | `constrained-counting` | 部分 |
| 5／p.2 | 空間向量與幾何 | 由同一平面內兩向量的法向量，比較三階行列式絕對值。 | `scalar-triple-product`、`space-plane-distance` | `space-cross-product` | 部分 |
| 6／p.2 | 機率與隨機變數 | 從立方體頂點選兩點，分類內積取值並求離散期望值。 | `discrete-random-variable`、`sphere-space-coordinate`、`projection` | — | 部分 |
| 7／p.2 | 數列與級數 | 比較每季與每年調薪的分段數列及累積薪水。 | `sequence-series`、`recurrence-sequence` | `floor-function-lattice` | 部分 |
| 8／p.3 | 機率與隨機變數 | 獨立重複抽獎的至少一次成功機率，用補事件與相邻次數差比較。 | `probability-tree-independence`、`binomial-distribution`、`geometric-distribution` | — | 部分 |
| 9／p.3 | 數列與級數 | 對等比數列取對數，再依項數奇偶分析交錯和不等式。 | `sequence-series`、`sigma-sum-formulas`、`logarithm-domain-scale` | — | 部分 |
| 10／p.3 | 圓與直線 | 參數直線在長方形邊界上的交點、斜率與線段包含條件。 | `line-slope-intercept`、`linear-programming` | — | 部分 |
| 11／p.4 | 矩陣與線性系統 | 比較順逆時針旋轉及兩條對稱軸鏡射的矩陣乘積與反矩陣。 | `matrix`、`matrix-inverse-system` | — | 主概念 |
| 12／p.4 | 三角 | 正弦與餘弦疊合的振幅、對稱軸、方程解與圖形平移。 | `trig-composition`、`trig-graph-transform`、`trig-equation-solutions` | — | 部分 |
| 13／p.4 | 矩陣與線性系統 | 根據三天各飲料銷量與總收入建立三元一次方程組求單價。 | `gaussian-elimination-visual` | — | 主概念 |
| 14／p.5 | 函數與多項式 | 比較二次多項式相除的常數餘式以確定係數。 | `polynomial-remainder` | — | 主概念 |
| 15／p.5 | 平面向量 | 垂直基底、直線分點與內積為零條件決定兩向量長度比。 | `vector-linear-combination`、`projection` | `geometric-locus-ratio` | 部分 |
| 16／p.5 | 空間向量與幾何 | 投影點與平面內三點等距，結合外心、法線及另一水平平面求距離。 | `space-plane-distance`、`sphere-space-coordinate`、`circle-standard-equation` | — | 部分 |
| 17／p.5 | 空間向量與幾何 | 利用歪斜線的公垂線及沿兩線的距離條件求空間點距離。 | `space-skew-lines`、`sphere-space-coordinate` | — | 主概念 |
| 18／p.6 | 三角 | 圓上點與原點形成等腰三角形，以方向角表達動點半徑長。 | `trig`、`triangle-laws`、`circle-standard-equation` | — | 部分 |
| 19／p.6 | 平面向量 | 給定方向角的三角比，求圓上動點坐標並說明向量倍數關係。 | `vector-linear-combination`、`trig`、`triangle-laws` | `geometric-locus-ratio` | 部分 |
| 20／p.6 | 圓與直線 | 承接兩圓動點題組，以點到直線距離與行列式求四邊形面積。 | `line-slope-intercept`、`circle-line`、`shoelace-determinant-area` | — | 部分 |

擷取與覆蓋限制：

- Q3：已查看原 PDF 印刷第 1 頁；散點圖未提供逐筆數值，只標示對數線性化考點，不重建精確資料。
- Q12：已查看原 PDF 印刷第 4 頁，確認係數含根號與選項中的 sin 平方；不採用遺失根號的擷取式。
- Q13：已查看原 PDF 印刷第 4 頁，確認銷量資料表。

## 113 學測數學 A

來源：`03-113學測數a試題定稿.pdf`；20 題；來源狀態：使用者上傳、未逐份核對官方原站。PDF SHA-256 與文字 SHA-256 均記錄在 JSON。

| 題號／印刷頁 | 主題 | 摘要證據 | 既有模組 | 新增規劃 | 連結程度 |
|---|---|---|---|---|---|
| 1／p.1 | 指數與對數 | 用藥物半衰期判讀指數衰退，區分線性或反比遞減模型。 | `exponential-log`、`exponential-compound-interest` | — | 主概念 |
| 2／p.1 | 空間向量與幾何 | 由正方體邊與對角線配置辨識兩向量外積的垂直方向。 | `scalar-triple-product`、`line-plane-angle` | `space-cross-product` | 相關 |
| 3／p.1 | 函數與多項式 | 三次多項式的三個根成等差，由首項係數與因式乘積判讀定點正負。 | `root-multiplicity`、`polynomial-remainder`、`sequence-series` | — | 部分 |
| 4／p.2 | 三角 | 以和角公式改寫三角方程，計算一個週期內的解數。 | `trig-equation-solutions`、`trig-composition` | — | 主概念 |
| 5／p.2 | 排列組合 | 將連續整數分成等量兩組，限制兩中位數相差一的分組計數。 | `counting-principle`、`histogram-cumulative` | `constrained-counting` | 部分 |
| 6／p.2 | 三角 | 由等腰三角形方向角、半角及餘弦定理求砲台到新彈著點距離。 | `triangle-laws`、`trig` | — | 部分 |
| 7／p.2 | 指數與對數 | 比較對數圖形與代數等價式，重點是定義域與指數反函數。 | `logarithm-domain-scale`、`exponential-log`、`inverse-composition` | — | 部分 |
| 8／p.3 | 三角 | 隨整數參數改變三角形邊長，用餘弦定理、海龍公式及高比較形狀。 | `triangle-laws`、`sequence-series` | — | 部分 |
| 9／p.3 | 統計與數據 | 由回歸直線、平均、標準差及相關係數比較新個體的相對位置與距離。 | `regression`、`standardization-transform`、`covariance-correlation-sign`、`line-slope-intercept` | — | 部分 |
| 10／p.3 | 圓與直線 | 以正方形與正六邊形相切配置計算中心高度、向量、點距及斜率。 | `line-slope-intercept`、`vector-linear-combination`、`triangle-laws` | — | 相關 |
| 11／p.4 | 機率與隨機變數 | 骰子與硬幣決定方程係數，分類唯一解、無解及條件機率。 | `determinant-system`、`probability-tree-independence`、`discrete-random-variable` | — | 部分 |
| 12／p.4 | 矩陣與線性系統 | 三角形經參數線性變換，比較固定點、可逆性、象限與面積倍率。 | `matrix`、`matrix-inverse-system`、`shoelace-determinant-area` | — | 部分 |
| 13／p.4 | 統計與數據 | 用兩種加權平均利潤條件求三類手機銷量比例。 | `mean-variance-transform`、`gaussian-elimination-visual` | — | 相關 |
| 14／p.5 | 函數與多項式 | 用模二次式的餘式運算處理多項式線性組合的整除條件。 | `polynomial-remainder` | — | 主概念 |
| 15／p.5 | 機率與隨機變數 | 抽球不放回且已知先前抽獎結果，更新剩餘獎項分布並求期望獎金。 | `hypergeometric-sampling`、`discrete-random-variable` | — | 部分 |
| 16／p.5 | 平面向量 | 利用兩互相垂直方向的正射影長與向量長關係，求第三方向投影。 | `projection`、`cauchy-bound` | — | 主概念 |
| 17／p.5 | 圓與直線 | 以動點為圓心、坐標差絕對值為半徑，求圓完全位於正方形內的可行區面積。 | `circle-standard-equation`、`number-line-absolute`、`linear-programming` | — | 部分 |
| 18／p.6 | 空間向量與幾何 | 以平面法向量決定原點投影點方向，再與坐標軸比較夹角。 | `space-plane-distance`、`line-plane-angle`、`projection` | `space-cross-product` | 部分 |
| 19／p.6 | 空間向量與幾何 | 把空間向量與坐標軸的角度上界轉成三個坐標的二次不等式。 | `sphere-space-coordinate`、`line-plane-angle`、`cauchy-bound` | — | 部分 |
| 20／p.6 | 空間向量與幾何 | 將角度限制與平面方程相交，在特定截面求坐標範圍與最短原點距離。 | `space-plane-distance`、`sphere-space-coordinate`、`cauchy-bound` | `spatial-section-geometry` | 相關 |

擷取與覆蓋限制：

- Q2：文字擷取未保留正方體圖連線；已查看原 PDF 印刷第 1 頁核對頂點配置，索引只描述外積考點。
- Q10：題幹描述兩正多邊形配置但沒有列出所有頂點；未重建完整頂點配置或聲稱已有同型模組。

## 114 學測數學 A

來源：`03-114學測數學a試題.pdf`；20 題；來源狀態：使用者上傳、未逐份核對官方原站。PDF SHA-256 與文字 SHA-256 均記錄在 JSON。

| 題號／印刷頁 | 主題 | 摘要證據 | 既有模組 | 新增規劃 | 連結程度 |
|---|---|---|---|---|---|
| 1／p.1 | 機率與隨機變數 | 由球色與球號列聯表的獨立性確定未知格子數量。 | `two-way-table-bayes`、`probability-tree-independence` | — | 主概念 |
| 2／p.1 | 圓與直線 | 以兩條斜率不同但共有軸截點的直線，比較截距三角形面積。 | `line-slope-intercept`、`shoelace-determinant-area` | — | 部分 |
| 3／p.1 | 排列組合 | 同類表演排在一起且歌唱限制先後位置，使用捆綁與分類排列。 | `counting-principle` | `constrained-counting` | 部分 |
| 4／p.2 | 指數與對數 | 依對數曲線下方的整數高度分層計算有界區域的内部格子點。 | `logarithm-domain-scale`、`counting-principle` | `floor-function-lattice` | 部分 |
| 5／p.2 | 三角 | 比較倍角與原角的正弦、餘弦大小，取兩個三角不等式解集交集。 | `trig`、`trig-equation-solutions` | `trig-inequality-intervals` | 部分 |
| 6／p.2 | 空間向量與幾何 | 由三互垂向量的兩組差向量恢復長度關係，求平行六面體體積。 | `scalar-triple-product`、`sphere-space-coordinate` | `space-cross-product` | 部分 |
| 7／p.2 | 數列與級數 | 透過線性平移化簡非齊次遞迴，判讀等比部分、整數性與大小。 | `recurrence-sequence`、`sequence-series` | — | 主概念 |
| 8／p.3 | 圓與直線 | 以同底指數規則將含平方指數的方程化為圓軌跡，比較對稱、交點與線性式最大值。 | `circle-standard-equation`、`circle-line`、`exponential-log`、`cauchy-bound` | — | 部分 |
| 9／p.3 | 函數與多項式 | 由二次方程式有無實根的判別式條件比較平移參數。 | `quadratic-vertex`、`root-multiplicity` | — | 主概念 |
| 10／p.3 | 三角 | 水平線切過指定區間的正弦圖形，比較交點數、位置對稱與弦長比例。 | `trig-graph-transform`、`trig-equation-solutions` | — | 主概念 |
| 11／p.4 | 平面向量 | 三角形角平分線與中線交點，連結分點向量、餘弦、面積及內積。 | `vector-linear-combination`、`projection`、`triangle-laws`、`shoelace-determinant-area` | `geometric-locus-ratio` | 部分 |
| 12／p.4 | 統計與數據 | 改變合金成分百分比與波長單位，判讀資料線性轉換後的標準差與迴歸直線。 | `regression`、`mean-variance-transform`、`covariance-correlation-sign` | — | 主概念 |
| 13／p.4 | 函數與多項式 | 由三次多項式除法商式的二次頂點條件確定原函數對稱中心。 | `polynomial-remainder`、`quadratic-vertex`、`cubic-symmetry-center` | — | 部分 |
| 14／p.5 | 空間向量與幾何 | 將點到三平面的距離轉為帶絕對值方程，結合坐標符號限制。 | `space-plane-distance`、`gaussian-elimination-visual`、`number-line-absolute` | — | 部分 |
| 15／p.5 | 機率與隨機變數 | 硬幣至多五次的停止規則，按第三個正面出現時間分類價格並求期望。 | `probability-tree-independence`、`binomial-distribution`、`discrete-random-variable` | `constrained-counting` | 部分 |
| 16／p.5 | 圓與直線 | 由相反斜率的兩直線、點到線距及圓相切條件確定圓半径與弦長。 | `circle-line`、`line-slope-intercept`、`circle-standard-equation` | — | 主概念 |
| 17／p.6 | 三角 | 已知三角形兩邊與夾角，在外接圓上以另一弦長與大小限制求點距。 | `triangle-laws`、`circle-standard-equation` | — | 部分 |
| 18／p.6 | 矩陣與線性系統 | 旋轉矩陣平方與立方得到同一矩陣，由旋轉構造辨認未知元素。 | `matrix`、`matrix-inverse-system` | `matrix-power-recurrence` | 部分 |
| 19／p.6 | 矩陣與線性系統 | 以旋轉矩陣冪的角度加成追蹤兩段點的映射與向量夹角。 | `matrix`、`trig` | `matrix-power-recurrence` | 部分 |
| 20／p.6 | 矩陣與線性系統 | 承接矩陣旋轉題組，以轉後向量方向建立直線交點並求平面角。 | `matrix`、`line-slope-intercept`、`triangle-laws` | `matrix-power-recurrence` | 部分 |

擷取與覆蓋限制：

- Q8：已查看原 PDF 印刷第 3 頁；原式有 2 的 x 平方與 y 平方指數，文字擷取的分式排列不能直接作為方程。

## 115 學測數學 A

來源：`03-115學測數學a試卷.pdf`；20 題；來源狀態：使用者上傳、未逐份核對官方原站。PDF SHA-256 與文字 SHA-256 均記錄在 JSON。

| 題號／印刷頁 | 主題 | 摘要證據 | 既有模組 | 新增規劃 | 連結程度 |
|---|---|---|---|---|---|
| 1／p.1 | 機率與隨機變數 | 獎金依兩次抽籤的聯合結果決定，以機率加權求期望值。 | `discrete-random-variable`、`probability-tree-independence` | — | 主概念 |
| 2／p.1 | 數與式 | 取整函數作用於兩個平方根，比較對稱輸入與跨整數邊界時的函數值。 | `function-transformations` | `floor-function-lattice` | 相關 |
| 3／p.1 | 指數與對數 | 等差輸入對應等比指數輸出，換一組輸入間隔比較新公比。 | `exponential-log`、`sequence-series` | — | 主概念 |
| 4／p.1 | 排列組合 | 按基本與進階材料的組成分類，再區分不同原料組合是否產生同一道具。 | `counting-principle` | `constrained-counting` | 部分 |
| 5／p.2 | 矩陣與線性系統 | 三階線性映射已知若干向量像，加入垂直條件判讀指定像的解數。 | `gaussian-elimination-visual`、`projection`、`matrix-inverse-system` | — | 部分 |
| 6／p.2 | 圓與直線 | 固定兩點，第三點限制在直線上，依等腰三角形三種等邊情況計數。 | `circle-line`、`line-slope-intercept`、`triangle-laws` | `geometric-locus-ratio` | 部分 |
| 7／p.2 | 圓與直線 | 兩線性不等式的嚴格半平面交集，判定可落入的象限與坐標軸。 | `linear-programming`、`line-slope-intercept` | — | 主概念 |
| 8／p.2 | 矩陣與線性系統 | 二階矩陣冪的元素關係，連結矩陣多項式恆等式與遞迴。 | `matrix`、`matrix-inverse-system`、`recurrence-sequence` | `matrix-power-recurrence` | 部分 |
| 9／p.3 | 統計與數據 | 以 T 分數比較兩科及格門檻、加權排名與標準化後迴歸斜率。 | `standardization-transform`、`mean-variance-transform`、`regression` | — | 主概念 |
| 10／p.3 | 平面向量 | 由梯形兩向量與交叉三角形面積求角、分點、整體面積及邊長限制。 | `vector-linear-combination`、`projection`、`shoelace-determinant-area` | `geometric-locus-ratio` | 部分 |
| 11／p.4 | 三角 | 參數直線與餘弦圖形的對稱、特定交點、軸交點與交點個數。 | `trig-graph-transform`、`trig-equation-solutions`、`line-slope-intercept` | — | 部分 |
| 12／p.4 | 函數與多項式 | 兩三次多項式的差式限制交點及各自對稱中心的關係。 | `cubic-symmetry-center`、`root-multiplicity`、`polynomial-remainder` | — | 部分 |
| 13／p.5 | 機率與隨機變數 | 以學歷與英聽通過比例構造列聯表，從通過者反推學歷條件機率。 | `bayes`、`two-way-table-bayes` | — | 主概念 |
| 14／p.5 | 平面向量 | 向量垂直於其參數决定的直線，將內積條件化為二次式最大值問題。 | `projection`、`quadratic-vertex`、`line-slope-intercept` | — | 部分 |
| 15／p.5 | 指數與對數 | 等差的三個正數與三個對數點共線，利用等距輸入與對數运算求比例。 | `logarithm-domain-scale`、`sequence-series`、`line-slope-intercept` | — | 部分 |
| 16／p.5 | 函數與多項式 | 拋物線頂點受直線限制，平移後仍通過固定根，比較兩頂點的距離。 | `quadratic-vertex`、`function-transformations`、`line-slope-intercept` | — | 部分 |
| 17／p.6 | 三角 | 直角三角形中的倍角分線與邊長條件，求邊上分點的向量比例。 | `triangle-laws`、`trig`、`vector-linear-combination` | `geometric-locus-ratio` | 部分 |
| 18／p.6 | 空間向量與幾何 | 由兩底面邊向量的外積長求平行四邊形面積。 | `scalar-triple-product`、`shoelace-determinant-area` | `space-cross-product` | 部分 |
| 19／p.6 | 空間向量與幾何 | 由底面外積法向量與已知點建立平面方程式。 | `space-plane-distance`、`plane-intersection-line` | `space-cross-product` | 主概念 |
| 20／p.6 | 空間向量與幾何 | 由三組外積及一條邊長恢複平行六面體的體積與到指定頂點的最遠距離。 | `scalar-triple-product`、`sphere-space-coordinate`、`cauchy-bound` | `space-cross-product` | 部分 |

擷取與覆蓋限制：

- Q1：題幹給每次結果機率，但索引不額外聲稱抽籤獨立條件已明文寫出，亦不提供答案。
- Q2：已查看原 PDF 印刷第 1 頁，確認取整符號內含平方根；純文字擷取會遺失根號。
- Q5：已查看原 PDF 印刷第 2 頁，確認三階矩陣與列形式向量；既有二階反矩陣模組只提供相關概念。
- Q8：已查看原 PDF 印刷第 2 頁，確認下標與矩陣冪；不把文字擷取排列當成公式。
- Q20：此題同时要求體積與全體點最大距離；外積或三重積單一模組只是部分覆蓋，不能宣稱已完整重現原題。

## 可複核性

摘要均對應具體題號與印刷頁；文件雜湊用於辨識同一份上傳文件，不能證明發行機構或内容正確。原始 PDF 不複製進此公開資料夾，避免誤導為官方鏡像。課綱判定與官方來源核對應參照同目錄另外的來源研究資料。
