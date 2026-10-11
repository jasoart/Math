# MATH LAB 數學工作室

[開啟網站](https://jasoart.github.io/Math/) · [平面繪圖](https://jasoart.github.io/Math/graph.html) · [3D 空間幾何](https://jasoart.github.io/Math/spatial.html)

讓想法，有了形狀。MATH LAB 將互動數學、自由繪圖、空間幾何與個人筆記整合在同一個可安裝的工作室，適用桌面、平板與手機。

## 工作空間

- **互動探索**：196 個模組。48 個擴充主題涵蓋數值方法、訊號、動態系統、曲線幾何、機率與線性代數。全部模組共用自適應曲線、標註避讓與公式排版；556 個模組數值欄位保留精確原式。
- **平面繪圖**：安全解析函數、隱函數、參數式、極座標、點與不等式。依算式結構辨識圖形類型、公式與定義域；自動微分提供切線、導函數與極值分析。另有參數動畫、交點、積分、數值表、標註及 PNG／SVG 匯出。
- **3D 空間幾何**：模板、算式、文字條件核對三種輸入。一次建立多個點、向量、直線、任意平面、完整球面、多面體、參數曲線／曲面、顯式與隱式曲面。量測距離、夾角、投影、交線、歪斜線公垂線、三平面聯立、截面及旋轉體體積。13 個既有空間模組可直接帶入目前參數。
- **同步教學**：觀念、公式、推導、提醒與答案練習；探索模式隱藏計算答案。球面、多面體與旋轉體截面可隨平面位置更新。手機提供建立物件與教學的底部工具抽屜。
- **數學鍵盤**：分數、根號、巢狀範本、三維座標、向量與方程式；空格導覽、語法回饋、復原／重做，支援工具抽屜內輸入。
- **資料留存**：個人筆記、收藏、圖形與場景保存在裝置。3D 支援復原／重做、分享連結、JSON 匯入／匯出及 PNG；筆記另可備份 JSON。

網站採暖白、玉石綠的視覺系統，搭配專屬生成的幾何主視覺與圖標。執行資源與數學字型均隨網站提供，無需登入或外部 CDN。

## 安裝與離線

首次以 HTTPS 載入並顯示「已可離線使用」後，三個工作區和全部模組可離線開啟。支援的瀏覽器會提供「安裝應用程式」；iPhone／iPad Safari 可由分享選單加入主畫面。

有更新時，使用者選擇「套用更新」才重新載入。儲存的圖形、筆記與場景會保留。請先結束輸入或儲存重要內容。首次離線快取約 2.5 MB；瀏覽器仍可清除快取與本機資料。

## 本機使用

需要 Node.js 20+、Python 3，以及用於瀏覽器驗證的 Chromium。

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm --cache /tmp/mathlab-npm-cache ci --ignore-scripts
python3 -m http.server 8000 --bind 127.0.0.1
```

網站以靜態檔案執行。當執行檔案更動時，部署前執行 `npm run build:pwa`，同步離線快取清單與內容摘要。套件字型已存入 vendor；更新其固定依賴後可使用 `npm run vendor:math` 重建。

## 驗證

```bash
npm run check
npm run test:modules
npm test
npm run test:graph
npm run test:engine
npm run test:spatial
npm run test:geometry
npm run test:pwa
npm run test:product
npm run build:pwa
```

瀏覽器測試預設使用 `/usr/bin/chromium`，也可用 `CHROMIUM_PATH` 指定。Python 獨立核對新增模組、幾何、積分與向量；瀏覽器驗證手機／桌面、真實圖形、輸入、分享、資料還原、離線與更新。PWA 測試特別使用 `/Math/` 部署子路徑。

## 計算與資料邊界

- 圖形使用有限網格；一般隱式曲面與非常狹窄的特徵可能需要更精細取樣。完整球面使用封閉的參數網格。
- 能判定的有理點面條件顯示分數／根號，簡單旋轉體顯示精確 π 值；其他計算顯示數值近似。自動微分在不可微或未定義位置不建立切線。
- 旋轉體以 x 表示沿所選旋轉軸的參數，要求區間內 0 ≤ 內半徑 ≤ 外半徑；任意函數使用有界數值積分與誤差估計。
- 文字條件辨識只處理明確座標與支援的方程式，加入前必須核對。沒有圖片 OCR、完整自然語言解題或手寫推導批改服務；答案練習檢查常數結果。
- 教學內容是幾何概念與推導，不宣稱所有進階曲面都屬正式考試範圍。未接入經核對的正式題庫與評分原則。
- 分享連結包含算式、物件、範圍與視角，沒有個人筆記；本機資料不會自動跨裝置同步。清除瀏覽器資料會移除紀錄，請保留 JSON 備份。
- Chromium 的自動化驗證不等同所有裝置的實機驗證。

## 部署

GitHub Pages 使用 main 分支根目錄。推送前重建 PWA 清單並驗證；GitHub 的 pages-build-deployment 成功狀態與對應提交確認部署。

入口為 index.html、graph.html、spatial.html；共用引擎位於 engine，幾何引擎位於 spatial，圖形分析位於 graph。維護範圍與後續需求見 [3D 需求對照](docs/geometry-roadmap.md)。

## 授權

MIT License，詳見 [LICENSE](LICENSE)。圖像來源見 [assets/README.md](assets/README.md)；KaTeX 授權保留於 [vendor/katex/LICENSE](vendor/katex/LICENSE)。
