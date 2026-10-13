# MathScript Web 0.1

[開啟編譯工作台](https://jasoart.github.io/Math/script.html#webCompiler)

MathScript Web 是專案自研的 toy programming language：括號式語法、自己的 reader、語法樹、詞法作用域檢查與 JavaScript 程式碼產生器。它與原有 MathScript 1.2 數學指令語言是不同的語法；兩者在同一頁提供編輯介面，既有作品仍由原引擎執行。

## 已用自研語言重構的部分

| 原始碼 | 職責 | 編譯產物 |
| --- | --- | --- |
| `compiler/compiler.msw` | reader、語法檢查、作用域檢查、程式碼產生 | `compiler/compiler.js` |
| `curriculum/geometry.msw` | 圓切線、三角形三心、資料解析、線性迴歸、黎曼和 | `curriculum/geometry.js` |
| `curriculum/catalog.msw` | 36 類、324 個探究實驗的數學內容 | `curriculum/catalog.js` |
| `curriculum/modules.msw` | 參數控制、圖形變換、取樣、觀察點、公式與作圖資料 | `curriculum/modules.js` |
| `curriculum/tools.msw` | 10 種高中工具的欄位定義與運算調度 | `curriculum/tools.js` |

瀏覽器仍執行 JavaScript。`seed.cjs` 是首次啟動的編譯器種子；`runtime.js` 是集合、文字、數學與運算預算的宿主 ABI。Canvas／DOM、既有數學解析器和原本 196 個實驗仍保留相容層，**本版沒有宣稱整個既有網站已完全改寫**。建置及本版新增測試不使用 Python。

## 可重現的自編譯

```sh
npm ci
npm run build:custom
npm run test:custom
npm run test:highschool
npm run build:catalog
npm run build:pwa
```

建置順序：種子編譯 `compiler.msw` → 第 1 階段編譯器編譯同一份原始碼 → 第 2 階段再編譯同一份原始碼。三份產物必須逐位元相同；接著由產出的編譯器建置網站 `.msw` 模組。`node compiler/build.cjs --check` 會檢查所有受管理的 `.js` 與 `.msw` 是否同步，不修改檔案。

編譯工作台能在 Worker 中編譯、停止、匯入和下載 `.msw`、下載產物，或載入編譯器原始碼核對自編譯。工作台**只顯示輸出文字，不執行使用者的編譯產物**。輸出的 `.js` 需要 `compiler/runtime.js`；若有 `use`，也需要對應的本地宿主模組。正式網站載入已建置產物，不在啟動時重新編譯。

## 語法

```text
# # 至行尾是註解；空白與換行可自由安排
(module MyExperiment
  (fn f (x)
    (return (- (* x x) 2)))
  (let samples (array))
  (each x (array -2 -1 0 1 2)
    (push samples (array x (f x))))
  (export (record ("samples" samples))))
```

| 形式 | 意義 |
| --- | --- |
| `(module Name … (export …))` | 單一模組，恰好一個匯出紀錄 |
| `(let name expression)` | 宣告區域變數；同一作用域不可重複 |
| `(set name expression)` | 修改已宣告的變數 |
| `(fn name (args…) statements…)` | 函式，可遞迴，函式名稱在所在區塊預先可見 |
| `(lambda (args…) expression)` | 表達式函式 |
| `(return expression)` | 函式回傳 |
| `(if condition statements… (else statements…))` | 條件分支；else 可省略 |
| `(while condition statements…)` | 條件迴圈 |
| `(each item collection statements…)` | 依序迭代集合 |
| `(choose condition yes no)` | 只計算選中分支的條件表達式 |
| `(array expressions…)` | 陣列 |
| `(record ("key" value) …)` | 紀錄 |
| `(get object key)`、`(put object key value)` | 讀取／修改自有欄位 |
| `(+ a b)`、`(- a b)`、`(- a)`、`(* a b)`、`(/ a b)`、`(% a b)` | 算術；次方使用 `(pow a b)` |
| `(= a b)`、`(!= a b)`、`(< a b)`、`(<= a b)`、`(> a b)`、`(>= a b)` | 比較 |
| `(and a b)`、`(or a b)`、`(not a)` | 短路邏輯，真值沿用宿主規則 |
| `(f args…)`、`((get module "function") args…)` | 呼叫函式 |

名称為 ASCII 字母、底線、數字，不能以數字開頭；字串使用 JSON 雙引號及跳脫字元，可包含中文。數字為有限的十進位或科學記號；布林為 `true`、`false`，空值為 `none`。語言為動態型別，算術使用 IEEE 754 雙精度；`+` 也可串接文字。它不是任意精度 CAS，也沒有靜態型別推論。

除函式名稱外，先宣告再使用；函式內引用的外層變數也須在該函式定義前宣告。未知名稱、重複宣告、錯誤括號、錯置的語句等會被拒絕。多數編譯錯誤有行列位置；JSON 字串格式錯誤可能直接顯示宿主 JSON 診斷。

## 標準函式與宿主邊界

- 集合：`length`、`push`、`pop`、`slice`、`join`、`keys`、`isArray`。
- 文字與資料：`split`、`trim`、`replace`（字面全文替換）、`json`、`parseJson`、`str`、`num`。
- 數學：`finite`、`integer`、`floor`、`ceil`、`round`、`abs`、`sqrt`、`pow`、`sin`、`cos`、`tan`、`log`（自然對數）、`exp`、`min`、`max`、`hypot`。
- 錯誤：`fail`。

`use` 只能使用固定的名稱／路徑配對：GraphMath、GraphInsight、GraphStudy、GraphRender、MathWebCatalog、MathWebGeometry。範例：

```text
(use M "GraphMath" "../graph/math.js")
```

沒有任意 JavaScript 區塊、eval、Function 或直接 DOM／網路存取語法。危險原型欄位遭 runtime 阻擋。原始碼上限 120,000 字、reader 節點 30,000、括號深度 100；runtime 每次最外層呼叫有 5,000,000 次 tick 與 512 層呼叫深度限制。巢狀回傳的函式也會重新取得獨立的最外層預算。Worker 編譯逾 5 秒會被終止。

這些是 toy language 的防呆與資源界線，**不是完整的惡意程式沙箱或記憶體隔離**；不要在具有敏感能力的環境執行不受信任的產物。可信的網站模組由建置流程產生並檢查。

## 驗證範圍

本版檢查三階段自編譯、作用域、遞迴、短路運算、迴圈／深度上限、產物一致性、數學不變量及 DOM 事件流程。視覺排版、觸控与真實瀏覽器 Worker／離線行為仍須實機驗證；DOM 模擬不能替代這些檢查。
