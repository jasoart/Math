# MathScript 1.1

MathScript 是 MATH LAB 專用的宣告式數學語言，將參數、函數、圖形和計算寫成可編輯、可分享的實驗。入口：[程式實驗](https://jasoart.github.io/Math/script.html)。它是有獨立 tokenizer、parser、AST 與直譯器的領域專用語言（DSL），以既有 GraphRender／GraphMath 提供繪圖與數值運算。

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

一行一個指令，也可用分號分隔。`#` 和 `//` 開始單行註解；雙引號內不作註解。名稱區分大小寫，可使用 Unicode 字母及底線，後續可含數字，最長 32 字。保留字、內建函數、`pi`、`e`、`x`、`t` 不可用來宣告全域名稱。`x` 是 plot／table／scatter／integral／roots／derivative／tangent／sum／product 的取樣變數；`t` 是 curve 的取樣變數。函數引數可使用 x 和 t。

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
let total = sum(n^2, n, 1, 10)
let productValue = product(k, k, 1, 6)
let slopeValue = diff(sin(u), u, pi/4)
let areaValue = integrate(t^2, t, 0, 2)
print sum(sum(i*j, j, 1, 4), i, 1, 3)
plot diff(sin(t), t, x)
```

第二個引數必須是索引／微分變數名稱；它只綁定第一個引數。起點、終點、代入位置在外層求值，外層同名常數不被修改。巢狀加總仍共用 1,500,000 次 AST 預算，並非每層各取得一份預算。integrate 支援反向區間及零寬區間，未收斂時報錯。

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

模組學院的 540 組情境都能送入編輯器，含目前參數、各步計算與圖形。編輯器內建 13 個範例，新增平方和、導數與切線、二項分配、弧長、雙重加總、Taylor 近似、整數工具與累積函數。舊版 version 1 作品格式保持相容。1.1 新增的指令與內建函數名稱成為保留名稱；若舊程式自行宣告 sum、diff、choose 等同名變數或函數，需先更名。

## 儲存、分享與發布

1. 編輯自動儲存草稿；「儲存作品」保留最多 20 份命名作品。開啟已儲存作品再儲存會更新該作品；從範例開始會建立新作品。資料只在本機瀏覽器。
2. 「匯出作品」下載含 source 和 parameters 的 `.mathscript.json`。匯入可讀 JSON、純文字 `.mathscript` 或 `.txt`。尚未完成的程式也可儲存；錯誤在執行時顯示。
3. 「分享作品」將最後一次成功執行的程式與參數放入網址片段。接收者可繼續編輯，沒有伺服器作品資料庫。網址不應包含私密資料；長作品請用 JSON 檔傳送。
4. 「匯出網頁」產生自包含 HTML，保存目前圖形、數值、原始碼與返回編輯器的連結。這是可離線閱讀的靜態快照，不會在匯出檔中重新運算。也可匯出 SVG；包含 table 或 scatter 指令時，可匯出 UTF-8 CSV 數值表，保留浮點數精度，未定義值留空。
5. 編輯後或執行失敗時，舊預覽會明確標記並停用分享／圖形匯出，避免把舊結果當成最新作品。開啟分享連結會保留原有草稿；開始編輯分享內容後才更新草稿。

網站沿用 GitHub Pages 的 main 分支根目錄發布；本次沒有新增後端或付費服務。

## 引擎與界限

`language/mathscript.js` 提供 `compile(source)`、`run(programOrSource, options)`、`validateDocument(document)`。Node 可 require，瀏覽器提供 `MathScript`。程式不使用 eval、Function 建構器或使用者 JavaScript。

背景 Worker 使用最多 8 份 AST 的 LRU 快取；參數更新重用編譯結果。新輸入取消尚未完成的任務；請求編號避免過期結果覆寫畫面。5 秒未完成會終止 Worker。瀏覽器不支援 Worker 時顯示錯誤，不把耗時工作轉到主執行緒。

每份程式最多 24,000 字、6,000 token、160 個指令、48 層算式／函數呼叫、1,500,000 次 AST 評估、12 條曲線、12 個參數；每張數值表最多 200 列，全部表格合計最多 2,000 列，散點與標記合計最多 2,000 點。每條曲線至多 9,000 次自適應取樣，範圍座標在 ±1,000,000 內。達上限會報錯或明確提示，不宣稱任意精度。

積分是自適應 Simpson 近似，顯示估計誤差；未收斂時拒絕輸出結果。求根為有限取樣，可能遺漏重根或高頻零點，零函數不可用於離散求根。曲線在極點／未定義處斷開；極窄特徵仍可能遺漏。參數式和一般函數圖共用 GraphRender。表格以「未定義」顯示非有限數值；print 需要有限實數。

預覽座標軸由 view 控制，x／y 單位的螢幕長度可能不同；需要等比例時應配合畫布比例設定 view。3D 工作區仍由原本空間幾何工具提供，MathScript 1.1 專注 2D 函數與數值實驗。

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

後續可在現有 AST 上加入型別檢查、向量／矩陣、3D 場景命令與來源對照，而不必開放 JavaScript 執行。
