# 繪圖、標註與排版技術依據

檢索與核驗日期：2026-10-11（Asia/Taipei）。本文件記錄指定六位研究者的一手公開來源，及這些來源對瀏覽器數學繪圖的適用範圍。取得來源不等於整合其程式庫；本次 2D 繪圖與標註演算法由本站自行實作。

## 已核對的來源與適用範圍

| 研究者 | 論文／技術資料與核驗程度 | 公開專案與授權 | 對本站的可用方向與限制 |
|---|---|---|---|
| Timo Aila | **Alias-Free Generative Adversarial Networks**，NeurIPS 2021。官方 README 列 Karras、Aittala、Laine、Härkönen、Hellsten、Lehtinen、Aila，提供摘要與正式引用；已讀 README，未讀論文 PDF。[官方實作與摘要](https://github.com/NVlabs/stylegan3) | [StyleGAN3](https://github.com/NVlabs/stylegan3)；[NVIDIA Source Code License](https://github.com/NVlabs/stylegan3/blob/main/LICENSE.txt)，使用受非商業用途等條款限制，不能當作 MIT 專案移植。 | 連續訊號、取樣與 aliasing 是理解縮放失真的參考。本站應以螢幕像素誤差控制曲線取樣，將數學座標和像素座標分開。這不是導入 GAN、StyleGAN3 濾波器或其平移／旋轉等變性保證。 |
| Brian Karis | **Real Shading in Unreal Engine 4**（2013 課程講義），作者、年分、標題與原講義 URL 已由 [Google Filament 官方技術文件的 Karis13b 引用](https://github.com/google/filament/blob/main/docs/Filament.md.html)核對。[原講義](https://blog.selfshadow.com/publications/s2013-shading-course/karis/s2013_pbs_epic_notes_v2.pdf)被代理拒絕，未讀全文。另查 [SIGGRAPH 2014 TemporalAA 投影片](https://advances.realtimerendering.com/s2014/epic/TemporalAA.pptx)，Playdead 一手 README 明確將 YCoCg clipping、neighbourhood rounding 歸功於 Karis並連至投影片；未讀全文。這些是工程講義，不標成同儕審查期刊論文。 | [Google Filament](https://github.com/google/filament) 為引用 Karis 的 PBR 工程實作；[Apache 2.0](https://github.com/google/filament/blob/main/LICENSE)。[Playdead temporal](https://github.com/playdeadgames/temporal) 為引用 Karis 的 TAA 實作；[MIT](https://github.com/playdeadgames/temporal/blob/master/LICENSE.txt)，作者 **Lasse Jon Fuglsang Pedersen**。兩者均非 Karis 本人的專案；未核實 Karis 本人另有適用且可移植的公開專案。 | 可研究時間序列穩定與平移時的閃動。本站首先採用確定性的標註排序與候選位置，維持同一狀態的排版一致。Canvas 文字與精確函數圖形不適合直接累積前一幀色彩；本次沒有加入 PBR、temporal reprojection／TAA，也不聲稱解決時間抗鋸齒。 |
| Sebastian Aaltonen | **PerfTest** 的作者技術說明已讀，包含資源型別、記憶體存取、取樣方式與不同 GPU 的工作負載量測。另有 Ulrich Haar／Aaltonen 的 [GPU-driven Rendering，SIGGRAPH 2015 課程投影片](https://advances.realtimerendering.com/s2015/aaltonenhaar_siggraph2015_combined_final.pdf)；官方網域被拒絕，未全文核驗。課程投影片不標成期刊論文。 | [sebbbi/perftest](https://github.com/sebbbi/perftest)；[MIT](https://github.com/sebbbi/perftest/blob/master/LICENSE.md)，版權列 Sebastian Aaltonen。 | 以代表性工作負載量測後再選擇策略：限制求值次數、跳過視窗外圖段、把標註候選數設上限。PerfTest 是 DirectX 11 GPU 工具；本站 Canvas 的測量不能引用其 GPU 倍數效能，沒有加入 GPU indirect drawing。 |
| Keenan Crane | **The Vector Heat Method**，Nicholas Sharp、Yousuf Soliman、Keenan Crane；ACM TOG 38(3), article 24, 2019。已讀[原專案文件的演算法說明與完整引用](https://github.com/nmwsharp/geometry-central-docs/blob/master/docs/surface/algorithms/vector_heat_method/index.html)。另查閱[測地距離／Heat Method 文件](https://github.com/nmwsharp/geometry-central-docs/blob/master/docs/surface/algorithms/geodesic_distance/index.html)；原論文 PDF 未取得。 | [geometry-central](https://github.com/nmwsharp/geometry-central)；[MIT](https://github.com/nmwsharp/geometry-central/blob/master/LICENSE)。README 明確列 Nicholas Sharp 為開發者、Crane 為主要貢獻者之一。 | 幾何資料、數值求解與視覺化分開；顯示精度不改變數學模型。該專案主要處理曲面網格與測地距離，不是函數標註排版引擎。本站的平面矩形避碰沒有使用 heat method、mesh Laplacian 或其測地線計算。 |
| Wojciech Matusik | **DiffAqua: A Differentiable Computational Design Pipeline for Soft Underwater Swimmers with Shape Interpolation**；Ma、Du、Zhang、Wu、Spielberg、Katzschmann、Matusik；ACM TOG 40(4), article 132, SIGGRAPH 2021。已讀[MIT Graphics 官方 README 與 BibTeX](https://github.com/mit-gfx/DiffAqua)，未讀論文全文。 | [mit-gfx/DiffAqua](https://github.com/mit-gfx/DiffAqua) 的已讀 README 未列明授權，不移植其程式碼。相關 [diff_pd_public](https://github.com/mit-gfx/diff_pd_public) 官方 README 連至 DiffAqua，及 DiffPD（TOG／SIGGRAPH 2022）；其[核心授權為 MIT](https://github.com/mit-gfx/diff_pd_public/blob/master/LICENSE)，外部相依須各自核對。 | 將設計需求寫成明確目標與約束，可啟發標註的重疊、超界、遮擋與離錨點距離評分。這是概念上的類比；本站使用離散候選位置與有界搜尋，不是可微流體模擬、形狀最佳化或 DiffPD solver。 |
| Perttu Hämäläinen | **Augmenting Sampling Based Controllers with Machine Learning**；Joose Rajamäki、Perttu Hämäläinen；SCA 2017，DOI `10.1145/3099564.3099579`。已取得並核對[作者儲存庫中的 PDF](https://github.com/JooseRajamaeki/SCA2017/blob/master/augmenting_sampling_based_controllers.pdf)首頁、摘要與導論。官方 [TVCG18 README](https://github.com/JooseRajamaeki/TVCG18) 另列 **Continuous Control Monte Carlo Tree Search Informed by Multiple Experts**（作者資料標 TVCG 2018；未另核對正式卷期）。 | [SCA2017](https://github.com/JooseRajamaeki/SCA2017)、[TVCG18](https://github.com/JooseRajamaeki/TVCG18)；[Aalto University Game Tools license](https://github.com/JooseRajamaeki/SCA2017/blob/master/LICENCE.txt)，允許使用與改作，但包含保留告示及商用產品 credits 要求；不是無條件 MIT。ODE、Eigen 另有授權。 | 用有限運算預算比較候選、優先保留可行解，是互動排版的合理工程方向。原論文控制 3D 模擬角色並結合機器學習；本站標註配置不訓練模型、不使用 MPC／MCTS，不把有限候選搜尋稱為原論文演算法。 |

## 本站實作方向

1. **繪圖品質**：以螢幕空間誤差細分函數與參數曲線；拒絕非有限值，對疑似極點保留斷段；限制遞迴深度與求值預算。縮放與視窗改變時重算樣本，保留原式與數學分析結果。
2. **標註與自動排版**：先量測文字矩形，再在錨點周圍列出有限候選位置，依邊界、已放標註、重要點與圖線避碰決定位置。優先處理重要標註；無法安全放置時省略次要標註，保留數值清單與必要的引導線。使用固定候選順序與排序，讓相同輸入得到一致結果。
3. **通用輸出**：Canvas 與 SVG 共用幾何與排版結果；SVG 記錄器應支援文字量測所需介面、遮罩、連接線與完整 XML 跳脫，避免匯出時改變標註位置。
4. **輸入與鍵盤**：數學範本插入游標位置，提供常用函數、括號與確定性的選取範圍；保留實體鍵盤、文字編輯與輔助工具操作。這是本站的互動工程改良，上列研究沒有提出本次數學鍵盤設計。
5. **驗證**：以高曲率曲線、極點、隱函數鞍點、密集交點、長中文標註、窄螢幕與 SVG 匯出驗證。量測樣本數、求值預算、重疊與繪製耗時；只有取得相同條件的前後量測，才能宣稱效能改善。

此方向不以引入大型 C++／CUDA／Unity 相依為前提。沒有把論文的實驗效能、GAN 影像指標或 3D 控制效果套用到本工具，也不宣稱本站排版是全域最佳解。

## 核驗與授權界線

- 成功讀取的主要來源是原作者、研究團隊或公司維護的 GitHub 儲存庫；Hämäläinen 的 SCA 2017 論文由作者儲存庫提供。本文以核對到的摘要、技術文件與作者引用為依據，不宣稱六位作者的論文都已全文審閱。
- 此環境向 `advances.realtimerendering.com`、`blog.selfshadow.com`、`research.nvidia.com`、`www.cs.cmu.edu`、`users.aalto.fi` 與 `nvlabs.github.io` 的請求回報代理連線 403。保留官方入口供後續核驗，沒有繞過代理或停用 TLS。
- 來源程式碼未複製進本專案，也沒有因「GitHub 可公開讀取」推論可以任意使用。若日後直接移植程式碼或引入相依，須保留相應授權、作者與第三方相依告示。
