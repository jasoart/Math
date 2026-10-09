# 課綱與技術研究來源

檢索日期：2026-10-09（Asia/Taipei）。本次以原作者、研究團隊、公司官方儲存庫為技術來源。臺灣課綱與考試範圍網站的 HTTPS 連線被此環境的網路政策拒絕；因此本次**沒有完成「最新正規課綱」的線上核驗**。官方連結保留為後續核對入口，不能當作已讀取的文件。

## 技術研究：已核對的原始來源

### 1. Mosaic: An Architecture for Scalable & Interoperable Data Views

- Jeffrey Heer、Dominik Moritz；IEEE Transactions on Visualization and Computer Graphics 30(1), 436–446, 2024；VIS 2023 發表。DOI：`10.1109/TVCG.2023.3327189`。
- [原研究團隊的論文資料與摘要](https://github.com/uwdata/uwdata.github.io/blob/main/static/papers/mosaic.json)、[原作者軟體與正式引用](https://github.com/uwdata/mosaic/blob/main/README.md)、[原作者提供的 PDF](https://github.com/domoritz/domoritz.github.io/blob/master/papers/2023-Mosaic-VIS.pdf)。以上均成功讀取；PDF 首頁確認 Heer 的論文署名單位為 University of Washington，Moritz 為 Carnegie Mellon University。
- [UW 團隊成員資料](https://github.com/uwdata/uwdata.github.io/blob/main/static/people.json)列 Heer 為 Professor。Moritz 的[本人首頁](https://github.com/domoritz/domoritz.github.io/blob/master/index.md)、[履歷](https://github.com/domoritz/domoritz.github.io/blob/master/cv.html)及[任職資料](https://github.com/domoritz/domoritz.github.io/blob/master/_data/positions.yml)列 CMU 教授／Assistant Professor（2020 起）、Apple Research Scientist（2019 起），並描述管理 Apple AIML visualization team。Apple 身分由履歷核對，**不是該篇論文列出的署名單位**；沒有把作者稱為無法核實的「核心工程師」。
- 可採用：把搜尋、科目篩選、題目清單與圖形的選取條件表示成同一份狀態；計算和顯示分開；重用相同篩選結果。
- 限制：論文對大規模資料的速度優勢來自資料庫、查詢優化與預聚合。本站規模小，採用其協調互動的設計觀念即可；沒有理由因此加入 DuckDB/WASM，也不能聲稱取得論文的倍數效能提升。

### 2. Mosaic Selections: Managing and Optimizing User Selections for Scalable Data Visualization Systems

- Jeffrey Heer、Dominik Moritz、Ron Pechuk；2025 預印本 `arXiv:2507.19690v1`。
- [原作者論文資料與摘要](https://github.com/domoritz/domoritz.github.io/blob/master/_publications/2025-mosaic-selections.html)、[UW 團隊論文資料與摘要](https://github.com/uwdata/uwdata.github.io/blob/main/static/papers/mosaic-selections.json)均成功讀取。
- 出版資訊差異：作者網站標示 VIS 2025；UW 資料列年分 2026 並引用 arXiv DOI `10.48550/arXiv.2507.19690`。此處以「2025 預印本」標示，不宣稱已核對 2026 正式期刊出版，也不宣稱這是全球最新論文。預印本 PDF 所在 `arxiv.org` 不在允許目的地內，本次未讀取全文。
- 可採用：年分、科目、主題、題型等條件用可組合的 predicates；統計與清單共用相同篩選結果；在分析題目數不多時使用清楚的純函式，而非建立複雜查詢層。
- 限制：這是根據原作者摘要採用的架構方向。論文的正式出版狀態與效能實驗尚未全文核對，本站改動不能援引其實驗值。

### 3. Vega-Lite: A Grammar of Interactive Graphics

- Arvind Satyanarayan、Dominik Moritz、Kanit Wongsuphasawat、Jeffrey Heer；IEEE TVCG / InfoVis，2017。DOI：`10.1109/TVCG.2016.2599030`。
- [官方程式庫 README 的引用與團隊說明](https://github.com/vega/vega-lite/blob/main/README.md)、[原研究團隊論文資料與摘要](https://github.com/uwdata/uwdata.github.io/blob/main/static/papers/vega-lite.json)、[原作者提供的 PDF](https://github.com/domoritz/domoritz.github.io/blob/master/papers/2017-VegaLite-InfoVis.pdf)均成功讀取，並核對首頁摘要與相關互動模型。
- PDF 首頁的署名單位列 Satyanarayan 為 Stanford University，其餘作者為 University of Washington；Heer 為 UW 教授。官方 README 同時列出部分作者**現在**的 MIT、CMU / Apple、Databricks 身分；不能將現在任職單位改寫成 2017 年的論文署名。
- 可採用：把參數、資料、可見圖形、選取結果分開，並由同一個參數狀態產生圖形及數值說明；把互動定義成可重用元件。這與本站 `controls / compute / draw` 分工相容。
- 限制：成功讀取的是作者提供的 PDF 副本；原研究團隊 PDF 網域仍未開放。此處沒有聲稱安裝 Vega-Lite，也沒有把抽取的設計觀念寫成已整合該函式庫。

### 4. A Unifying Framework for Animated and Interactive Unit Visualizations

- Steven Drucker、Roland Fernandez；Microsoft Research 技術報告 `MSR-TR-2015-65`，2015-08。
- [Microsoft 官方 SandDance 儲存庫](https://github.com/microsoft/SandDance/blob/master/README.md)成功讀取，確認論文標題、作者、技術報告編號，以及 SandDance 由 Microsoft Research VIDA Group 建立。README 同時說明：一列資料對應一個畫面標記，並用平滑轉場維持視覺脈絡。
- [原報告 PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/sanddance.pdf)目的地尚未開放；本次不是全文審閱。作者的公司研究工程背景有專案一手來源支持，但沒有額外主張職等或「核心」頭銜。
- 可採用：機率與抽樣模組讓每個樣本／結果對應一個可辨識標記；變更參數時保留圖形脈絡；只在有助理解時提供轉場，並尊重 `prefers-reduced-motion`。
- 限制：屬技術報告，不標成已核對的同儕審查期刊論文。動畫設計不能取代精確的機率計算；此處的具體採用依據為 Microsoft 官方專案說明。

### 5. Google Chrome web-vitals（工程文件，非學術論文）

- Google Chrome 官方[README](https://github.com/GoogleChrome/web-vitals/blob/main/README.md)與[INP 實作](https://github.com/GoogleChrome/web-vitals/blob/main/src/onINP.ts)成功讀取；實作保留 Google LLC copyright。
- 可採用：互動延遲應跨整個頁面生命週期觀察；避免重複建立長期存活的 observer；自架靜態檔比執行時載入不受控 CDN 更容易重現。
- 限制：自行測量的單次 Canvas 計算或輸入事件耗時**不是 INP**。除非真正採用正式 INP 定義／量測工具，介面應稱「計算耗時」或「互動更新耗時」，不可拿它冒充 Core Web Vitals。模組若用 animation frame 合併更新，也是本站工程選擇，不是本文提出或證實的教學效果。

## 臺灣官方課綱／考試範圍：待連網核驗

| 官方單位 | 核對目標 | 入口 | 本次狀態 |
|---|---|---|---|
| 教育部 | 十二年國民基本教育課程綱要：數學領域之發布／修正公告 | [教育部](https://www.edu.tw/) | HTTPS proxy 403；未核對現行修訂日 |
| 國家教育研究院 | 數學領域：第 10 年級必修、數學 A、數學甲的學習內容與官方編碼 | [國教院](https://www.naer.edu.tw/) | HTTPS proxy 403；未核對完整正文 |
| 大學入學考試中心 | 學測數學 A、分科測驗數學甲現行考試說明與考試範圍 | [大考中心](https://www.ceec.edu.tw/) | HTTPS proxy 403；未核對最新公告 |

`curriculum.json` 記錄的是供本站使用的**待官方核驗課程分類基線**：數學 A 對應高一必修與高二數學 A；數學甲再含高三數學甲。內部主題 ID 是本站分類，不冒充官方課綱編碼。暫不提供逐項官方編碼，也不聲稱完整覆蓋或最新版本已確認。

使用者上傳的 111–115 試卷可作題目內容與既有考點的分析證據；檔名／題目出現某概念不能代替最新官方課綱，也不能證明上傳文件的出版真偽或試題答案。統計代表上傳樣本及人工主題分類；不得宣稱是官方配分、官方分類或未來命題預測。

## 本次網路診斷與所需目的地

保留環境提供的 HTTPS proxy 與 CA 信任，沒有停用 TLS。實際測試以下入口皆回報 `Tunnel connection failed: 403 Forbidden`：`www.ceec.edu.tw`、`www.naer.edu.tw`、`www.edu.tw`、`idl.cs.washington.edu`、`www.microsoft.com`、`research.google`。

後续核驗需要環境設定允許：`www.ceec.edu.tw`、`www.naer.edu.tw`、`crd.naer.edu.tw`、`www.edu.tw`；論文全文／出版資訊可再允許 `idl.uw.edu`、`idl.cs.washington.edu`、`www.microsoft.com`、`arxiv.org`、`doi.org`、`ieeexplore.ieee.org`。`crd.naer.edu.tw` 與後列未測目的地是可能的文件／出版入口，並非本次已見到的拒絕證據。

所有已讀取的 GitHub 來源是由原作者／研究團隊／公司維護的公開發表來源；沒有使用繞過 proxy 的路由或代理來取得被拒絕網域。
