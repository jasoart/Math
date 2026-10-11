# MATH LAB 數學工作室

[開啟網站](https://jasoart.github.io/Math/) · [平面繪圖](https://jasoart.github.io/Math/graph.html) · [立體繪圖](https://jasoart.github.io/Math/spatial.html)

讓想法，有了形狀。MATH LAB 將互動數學、自由繪圖與個人筆記整合在同一個工作室，適用桌面、平板與手機。

## 工作空間

- **互動探索**：148 個模組，涵蓋函數、幾何、向量、微積分、機率與統計。以主題、搜尋及收藏找到工具，調整參數並記錄觀察。
- **平面繪圖**：函數、隱函數、參數式、極座標、點與不等式；支援精確符號、動態參數、交點分析、積分、數值表、避碰標註及 PNG／SVG 匯出。
- **立體繪圖**：輸入 `z=f(x,y)`，探索具有光照與高度配色的曲面。旋轉、縮放、切換視角與線框，調整取樣範圍，分享或匯出 PNG。
- **數學鍵盤**：分數、根號、函數及巢狀範本，支援空格導覽、語法回饋與復原／重做。互動模組的 433 個數值欄位保留精確原式。
- **個人筆記**：筆記、收藏與探索進度儲存在目前瀏覽器，可匯出 JSON 備份。平面繪圖另提供圖形檔案匯入／匯出。

網站採暖白、玉石綠的視覺系統，搭配專屬生成的幾何主視覺與圖標。所有執行資源均隨網站提供，無需登入或外部 CDN。

## 本機使用

需要 Node.js 20+、Python 3，以及用於瀏覽器驗證的 Chromium。

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci
python3 -m http.server 8000 --bind 127.0.0.1
```

開啟 `http://localhost:8000`。網站為靜態檔案，無需建置步驟。

## 驗證

```bash
npm run check
npm run test:modules
npm test
npm run test:graph
npm run test:spatial
npm run test:product
```

瀏覽器測試預設使用 `/usr/bin/chromium`，也可用 `CHROMIUM_PATH` 指定路徑。測試涵蓋數值、解析器、不可信輸入、資料還原、鍵盤、繪圖、PNG／SVG，以及桌面／平板／手機的版面和操作。

## 資料與數值邊界

- 分享網址包含相應工作空間的算式、參數或視角，不包含個人筆記。
- 本機資料不會同步至其他裝置。清除瀏覽器資料會移除紀錄，請保留重要內容的備份。
- 平面與立體圖形使用有限取樣。數值近似可能略過非常細小的特徵或奇異點，請配合定義域、數值與解析式判讀。
- 立體工作區繪製單值曲面 `z=f(x,y)`；並非任意三維隱曲面的求解器。超出設定高度或未定義的區域不繪製。
- 尚未提供離線重新載入的 Service Worker 快取；響應式 Chromium 驗證不等同所有裝置的實機驗證。

## 部署

GitHub Pages 使用 `main` 分支根目錄。推送後由 GitHub 的 `pages-build-deployment` 建置及發布；以 Actions 對應提交的成功狀態確認部署。

主要入口為 `index.html`、`graph.html`、`spatial.html`，共用樣式位於 `styles.css`，圖片位於 `assets/`。更動後請執行上述驗證再推送。

## 授權

MIT License，詳見 [LICENSE](LICENSE)。圖像來源與最佳化紀錄見 [assets/README.md](assets/README.md)。
