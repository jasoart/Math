# MathScript 1.2

MathScript 是 MATH LAB 專用的宣告式數學語言，將參數、函數、圖形和計算寫成可編輯、可分享的實驗。入口：[程式實驗](https://jasoart.github.io/Math/script.html)。它是有獨立 tokenizer、parser、AST 與直譯器的領域專用語言（DSL），以既有 GraphRender／GraphMath 提供繪圖與數值運算，並由 language/values.js 提供有界資料與線性代數。

## 第一個實驗

```text
title "拋物線研究"
param a = 1 from -3 to 3 step 0.1
let offset = 2
fn f(x) = a * x^2 - offset
view -6, 6, -4, 8
plot f(x) color "#087f73" label "f(x)"
point (0, -offset) label "頂點"
print f(3) label "f(3)"
table f(x) from -2 to 2 step 1
integral f(x) from 0 to 2
roots f(x) from -4 to 4
```

編輯器支援語法上色、插入指令範本與專注模式；語法上色可關閉。

在編輯器貼上後按「執行」。拖動 a 滑桿會重新計算依賴它的常數、函數、數值表和圖形。Ctrl／⌘ + Enter 執行，Ctrl／⌘ + S 儲存作品；「停止」或 Esc 可取消目前運算。

## 語法

一行一個指令，也可用分號分隔。`#` 和 `//` 開始單行註解；雙引號內不作註解。名稱區分大小寫，可使用 Unicode 字母及底線，後續可含數字，最長 32 字。1.1 既有的保留字、內建函數、`pi`、`e`、`x`、`t` 不可用來宣告全域名稱；1.2 新增名稱採語境判斷以保留舊作品（見下方相容性說明）。`x` 是 plot／table／scatter／integral／roots／derivative／tangent／sum／product 的取樣變數；`t` 是 curve 的取樣變數。函數引數可使用 x 和 t。

| 英文 | 中文 | 範例與行為 |
| --- | --- | --- |
| `title` | `標題` | `title "我的實驗"` |
| `let` | `設` | `let radius = 2`，建立不可重複宣告的常數 |
| `param` | `參數` | `param a = 1 from -3 to 3 step 0.1`，建立滑桿 |
| `fn` | `函數` | `fn f(x) = x^2` 或 `fn add(a,b) = a+b` |
| `view` | `視窗` | `view -6,6,-4,8`，依序 xmin、xmax、ymin、ymax；最後一個 view 套用整張圖 |
| `plot` | `繪圖` | `plot f(x)`，y = 算式 |
| `curve` | `曲線` | `curve (cos(t),sin(t)) from 0 to 2*pi`，參數式 |
| `point` | `點` | `point (1,2) label "A"` |
| `print` | `顯示` | `print f(2) label "f(2)"` |
| `table` | `表格` | `table f(x) from -2 to 2 step 1` |
| `integral` | `積分` | `integral f(x) from 0 to 2`，有限區間數值定積分 |
| `roots` | `求根` | `roots f(x) from -4 to 4`，搜尋數值零點 |

`from / 從`、`to / 到`、`step / 每`、`color / 顏色`、`label / 標籤` 可以混用。plot、curve、point 可設定色碼 `"#RRGGBB"` 與標籤，print 可設定標籤。param 未給 step 時採範圍寬度的 1/100；table 的預設 step 為 1。表格以起點及步長取樣，不為了包含終點而修改步長。

### 算式與作用域

- `+ - * / ^`；`**` 等同 `^`。明確寫出乘號：`2*x`，不是 `2x`。
- 支援科學記號 `1e-3`、`π`、`×`、`÷`、`−`、`≤`、`≥`。
- 次方右結合，`2^3^2 = 512`；次方優先於負號，`-2^2 = -4`。
- 比較 `< > <= >= == !=` 回傳 1 或 0；用 `&&`、`||` 組合條件。`0 < x < 1` 不支援，寫成 `0 < x && x < 1`。
- `if(condition, yes, no)` 只計算被選取的分支；布林運算短路求值。
- 內建函數：`sin cos tan asin acos atan sqrt cbrt abs exp ln log floor ceil round min max`。`ln` 是自然對數、`log` 是底數 10，三角函數使用弧度。
- 函數有 1–8 個引數，採詞法作用域：捕捉宣告當下已存在的常數與函數。必須先定義再呼叫，不支援遞迴、重複宣告、一般 while／for 迴圈、DOM、網路或 JavaScript。
- 程式由上往下執行，所有曲線以最後確定的 view 取樣。變更滑桿會重新執行全部指令；編輯程式會清除滑桿覆寫，使用程式所定義的初值。

## 1.2：向量、矩陣與資料實驗

`let`、`print` 及自訂函數現在接受純量、向量與矩陣。向量寫成 `[3,4]`，矩陣寫成 `[[2,1],[1,3]]`。陣列必須非空、同一層的尺寸相符，所有分量都是有限實數；矩陣的列之間可換行。資料不可就地修改，運算建立新值。滑桿、座標、條件、舊有純量函數仍要求純量，錯誤會附帶原始碼行列位置。

```text
title "線性系統的解與驗證"
let A = [[2,1],[1,-1]]
let b = [5,1]
let solution = solve(A,b)
print solution label "解向量 [2,1]"
print inverse(A) label "反矩陣"
assert norm(matmul(A,solution)-b)<1e-10 label "代回檢查"
fn twice(v)=2*v
print twice(solution)
```

| 運算 | 規則 |
| --- | --- |
| `u+v`、`u-v` | 同尺寸向量／矩陣逐項加減，不自動廣播純量 |
| `2*u`、`u*2`、`u/2` | 純量倍乘、除法；不可除以零 |
| `-u`、`+u` | 每個分量套用正負號 |
| `u==v`、`u!=v` | 尺寸與分量的精確浮點比較；近似值用 `norm(u-v)<容差` |
| `dot(u,v)` | 同長向量內積 |
| `cross(u,v)` | 兩個三維向量的右手外積 |
| `norm(v)` | 向量的歐氏長度；矩陣的 Frobenius 範數；純量的絕對值 |
| `unit(v)` | 非零向量的單位方向，先縮放以避免長度中間值溢位 |
| `length(v)`、`component(v,i)` | 向量長度、取第 i 個分量 |
| `row(A,i)`、`column(A,j)`、`entry(A,i,j)` | 取矩陣列向量、欄向量或單一數值 |
| `matmul(A,B)`、`matmul(A,v)` | 矩陣乘矩陣／向量；左欄數等於右列數／向量長度 |
| `transpose(A)`、`identity(n)` | 轉置、n×n 單位矩陣 |
| `det(A)`、`trace(A)` | 方陣的行列式、對角和 |
| `solve(A,b)`、`inverse(A)` | 方陣線性系統的唯一解、反矩陣 |

索引一律從 **1** 開始。`A*B` 不代表矩陣乘法，請用 `matmul`。矩陣最多 8×8，向量最多 256 個分量。不支援空陣列、混合純量與向量、三層資料、方括號索引或 JavaScript 陣列方法。自訂函數可傳入／回傳資料，但目前的 AD 只展開純量算式；需要資料分量作常數時，先 `let coefficient=component(v,1)`，再微分含 coefficient 的算式。

### 統計與取樣

| 函數 | 定義 |
| --- | --- |
| `total(v)` | 補償加總，減少不同數量級相加時的誤差 |
| `mean(v)`、`median(v)` | 平均數、中位數 |
| `variance(v)` | 母體變異數：離均差平方和除以 n |
| `samplevar(v)` | 樣本變異數：除以 n−1；至少兩筆 |
| `stdev(v)` | 母體標準差，即 variance 的平方根 |
| `linspace(a,b,n)` | 包含兩端點的 n 個等距數值；2≤n≤256，可遞減 |
| `sample(expr,k,a,b,step)` | 第一個算式以區域變數 k 取樣成向量；正步長、a≤b、端點在 ±1,000,000 內，最多 256 筆 |

sample 與 table 一樣，從起點按步長取樣，不強制加入無法整除步長的終點；浮點端點使用同一個 1e−9 索引容差。索引只綁定第一個引數，外層同名變數不改變。sample 中任何未定義值都報錯，避免空洞資料被當成零。

```text
let xs = linspace(0,6,31)
let ys = sample(sin(u),u,0,6,0.2)
print mean(ys) label "取樣平均"
print ys label "完整資料"
view 0,6,-1.5,1.5
points xs,ys
polyline xs,ys color "#4f46e5" label "取樣折線"
```

`points / 資料點` 畫成散點，`polyline / 折線` 依照輸入順序連接；兩者都接受等長 x、y 向量、color 與 label，並產生可匯出的 x／y 表格。每組最多 200 點，折線至少 2 點，座標在 ±1,000,000 內。折線不排序，不推測資料間的真實函數。

### 結果、精度與相容性

向量與矩陣結果顯示為可捲動、可收合的表格，帶索引和列／欄標頭。畫面顯示 9 位有效數字；JSON 與 CSV 保留 JavaScript 浮點數的可往返精度。只含一般數值表的 CSV 保留 `table,line,x,value`；含向量或矩陣時改用 `block,type,line,row,column,value`，索引從 1 起算，向量為一欄，x／y 數值表分別為第 1、2 欄。純量 print 不列入 CSV。

線性系統以列尺度部分選主元、消去與回代求解；反矩陣以同一方法求解單位矩陣。零主元或尺度比≤1e−12 時拒絕唯一解／反矩陣；還會核對原式殘差。det 對遇到的零主元回傳 0，並縮放乘積以降低中間值溢位；結果無法表示時報錯。這些檢查**不是完整的條件數估計**：浮點消去不能證明數學上的奇異性，殘差小也不保證病態系統的解準確。極端尺度可能被拒絕，建議先調整單位或係數。運算不提供任意精度、符號矩陣或複數矩陣。

目前共 19 個完整範例及 19 個指令範本。1.2 新增向量投影、矩陣旋轉、三元線性系統、資料迴歸、取樣波形與離群值研究；1.1 的 13 個範例及模組學院 540 組情境持續維護。作品 JSON 的 `version:1` 格式不變；1.2 新增名稱採語境判斷，舊作品的 `let total`、`let norm`、`fn sample` 等仍可執行。變數 `norm` 與函數呼叫 `norm(v)` 分別解析；若自行宣告同名函數，詞法作用域中的自訂函數優先於新版內建函數。points／polyline 在指令開頭是繪圖指令，在算式中可作已宣告名稱。新程式建議用 `totalValue`、`normValue` 等清楚的變數名稱；若想使用內建函數，避免宣告同名函數。

## 1.1：加總、微分與程式驗證

| 指令 | 中文 | 用法 |
| --- | --- | --- |
| `sum` | `加總` | `sum x^2 from 1 to 10 label "平方和"` |
| `product` | `連乘` | `product x from 1 to 6` |
| `derivative` | `微分` | `derivative sin(x) at pi/4`，回傳此點導數 |
| `tangent` | `切線` | `tangent x^2 at 1 color "#4f46e5"`，畫切線、標示切點並輸出斜率 |
| `scatter` | `散點` | `scatter choose(6,x) from 0 to 6 step 1`，畫離散點並產生可匯出表格 |
| `assert` | `驗證` | `assert abs(0.1+0.2-0.3)<1e-12 label "容差核對"` |

`at / 於` 可以混用。`sum`／`product` 的索引在指令形式中使用 x；起終點須為遞增或相等的安全整數，在 ±1,000,000 內，最多 5,000 項。加總使用補償加法；任何未定義項、結果溢位或超出共用計算預算都會中止。scatter 的規則與 table 相同：起終點可相等，步長為正，未定義的點略過但表格保留空值。

可在表達式中組合以下局部運算：

```text
let totalValue = sum(n^2, n, 1, 10)
let productValue = product(k, k, 1, 6)
let slopeValue = diff(sin(u), u, pi/4)
let areaValue = integrate(t^2, t, 0, 2)
print sum(sum(i*j, j, 1, 4), i, 1, 3)
plot diff(sin(t), t, x)
```

第二個引數必須是索引／微分變數名稱；它只綁定第一個引數。起點、終點、代入位置在外層求值，外層同名常數不被修改。巢狀加總仍共用 1,500,000 單位運算預算，並非每層各取得一份預算。integrate 支援反向區間及零寬區間，未收斂時報錯。

自動微分採既有 GraphMath 的前向自動微分（AD），不是有限差分。先展開詞法函數並把已知參數代成常數，再執行 AD；展開式最多 480 字。支援算術、冪次、三角／反三角、exp／ln／log、sqrt／cbrt、abs、min／max、if、整數取整、sign、雙曲函數。尖點、跳躍、定義域邊界及不能確認可微的情況會拒絕；sum／product、integrate、choose、factorial、gcd 等不是 AD 支援的內部運算，需先化簡。同次執行快取最多 32 份展開的微分算式。

新增一般函數：

| 函數 | 定義與界限 |
| --- | --- |
| `factorial(n)` | 整數 n，0≤n≤170；大結果仍是浮點近似 |
| `choose(n,k)` | 整數 0≤k≤n≤1000；超出有限實數時報錯 |
| `gcd(a,b)` / `lcm(a,b)` | 安全整數輸入，結果非負；lcm 必須仍為安全整數 |
| `mod(a,b)` | b>0，結果介於 0（含）與 b（不含） |
| `hypot(a,b)` | 二維向量長度 |
| `atan2(y,x)` | 帶象限的弧度角，參數順序為 y、x |
| `sign(x)` | 正、零、負對應 1、0、−1 |
| `sinh(x)` / `cosh(x)` / `tanh(x)` | 雙曲函數 |

assert 需要有限實數：零代表不通過，非零代表通過。失敗會帶出行列位置與自訂標籤，停用舊結果分享。浮點等式宜用 `abs(left-right)<tolerance`，不能假定十進位小數的加減總是精確。

模組學院的 540 組情境都能送入編輯器，含目前參數、各步計算與圖形。1.1 提供的 13 個範例包含平方和、導數與切線、二項分配、弧長、雙重加總、Taylor 近似、整數工具與累積函數。舊版 version 1 作品格式保持相容。1.1 新增的指令與內建函數名稱成為保留名稱；若舊程式自行宣告 sum、diff、choose 等同名變數或函數，需先更名。

## 儲存、分享與發布

1. 編輯自動儲存草稿；「儲存作品」保留最多 20 份命名作品。開啟已儲存作品再儲存會更新該作品；從範例開始會建立新作品。資料只在本機瀏覽器。
2. 「匯出作品」下載含 source 和 parameters 的 `.mathscript.json`。匯入可讀 JSON、純文字 `.mathscript` 或 `.txt`。尚未完成的程式也可儲存；錯誤在執行時顯示。
3. 「分享作品」將最後一次成功執行的程式與參數放入網址片段。接收者可繼續編輯，沒有伺服器作品資料庫。網址不應包含私密資料；長作品請用 JSON 檔傳送。
4. 「匯出網頁」產生自包含 HTML，保存目前圖形、數值、原始碼與返回編輯器的連結。這是可離線閱讀的靜態快照，不會在匯出檔中重新運算。也可匯出 SVG；包含 table、scatter、points、polyline 或向量／矩陣結果時，可匯出 UTF-8 CSV 資料，保留浮點數精度，未定義值留空。
5. 編輯後或執行失敗時，舊預覽會明確標記並停用分享／圖形匯出，避免把舊結果當成最新作品。開啟分享連結會保留原有草稿；開始編輯分享內容後才更新草稿。

網站沿用 GitHub Pages 的 main 分支根目錄發布；本次沒有新增後端或付費服務。

## 引擎與界限

`language/mathscript.js` 提供 `compile(source)`、`run(programOrSource, options)`、`validateDocument(document)`。Node 可 require，瀏覽器提供 `MathScript`。程式不使用 eval、Function 建構器或使用者 JavaScript。

背景 Worker 使用最多 8 份 AST 的 LRU 快取；參數更新重用編譯結果。新輸入取消尚未完成的任務；請求編號避免過期結果覆寫畫面。5 秒未完成會終止 Worker。瀏覽器不支援 Worker 時顯示錯誤，不把耗時工作轉到主執行緒。

每份程式最多 24,000 字、6,000 token、160 個指令、48 層算式／函數呼叫、1,500,000 單位共用運算預算（資料分量與矩陣運算另計成本）、12 條曲線、12 個參數；每張數值表最多 200 列，全部表格合計最多 2,000 列，散點與標記合計最多 2,000 點；print 合計最多 4,096 個數值分量。每條曲線至多 9,000 次自適應取樣，範圍座標在 ±1,000,000 內。達上限會報錯或明確提示，不宣稱任意精度。

積分是自適應 Simpson 近似，顯示估計誤差；未收斂時拒絕輸出結果。求根為有限取樣，可能遺漏重根或高頻零點，零函數不可用於離散求根。曲線在極點／未定義處斷開；極窄特徵仍可能遺漏。參數式和一般函數圖共用 GraphRender。表格以「未定義」顯示非有限數值；print 接受有限實數及其向量／矩陣。

預覽座標軸由 view 控制，x／y 單位的螢幕長度可能不同；需要等比例時應配合畫布比例設定 view。3D 工作區仍由原本空間幾何工具提供，MathScript 1.2 提供 2D 圖形、資料與數值實驗。

## 維護與驗證

```bash
npm ci --ignore-scripts
npm run check
npm run test:language
npm run test:graph:core
node scripts/pwa.test.cjs
npm run build:pwa
```

語言測試獨立以多項式反導函數核對積分，測試語法、作用域、參數、資源上限、安全字串、無限／未定義值、繪圖、分享、匯入、儲存失敗、取消與過期結果。DOM 測試用隔離 VM 執行真實 Worker handler，不代表已驗證實際瀏覽器的排版、觸控、Worker 或 Service Worker 行為。部署前更新 `sw.js`；首次連線完成後，程式頁、Worker 及所有相依資源進入離線清單。

1.2 另以 Python 精確分數的 Gauss–Jordan、統計公式與向量恆等式交叉核對 576 組資料運算；測試矩陣尺寸、型別錯誤、奇異／近奇異系統、取樣、輸出上限、CSV、19 個範例及 56 個滑桿端點。Worker 相依載入在 VM 執行，仍不等同真實瀏覽器驗證。

後續可在現有 AST 上加入靜態型別推導、條件數估計、複數與 3D 場景命令，而不必開放 JavaScript 執行。
