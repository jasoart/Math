# 高中動態幾何微型實驗室

> GitHub Pages-ready interactive micro-apps for Taiwan high school dynamic geometry, scientific visualization, and mathematical visualization.

本專案可放入 `https://github.com/jasoart/Math` 作為 `dynamic-geometry/` 子專案，或直接作為 GitHub Pages 的網站根目錄。  
目前為 **v1.1 全單元覆蓋校準版**：純前端、不需後端、不需打包工具，開啟 `index.html` 即可使用。

## 專案定位

這不是單純題庫，也不是大型 GeoGebra 替代品，而是一組「5–8 分鐘可完成一個觀念」的互動式微型應用程式。

設計目標：

1. **完整高中數學 A / 數甲核心單元覆蓋**：10 年級必修、11 年級數學 A、12 年級數學甲核心考點均有對應互動模組。
2. **動態幾何與視覺化**：讓學生拖曳參數，觀察圖形、距離、角度、面積、機率分布如何變化。
3. **考點轉譯**：每個模組都有「數學訊號」，協助學生把題目關鍵字對應到解題直覺。
4. **頂標任務**：每個模組提供一個可當課堂提問或作業的小任務。
5. **GitHub 友善**：純前端，不需後端，不需編譯，可直接部署 GitHub Pages。

## v1.1 新增重點

- 模組數從 41 個擴充為 **85 個互動模組**。
- 新增 `ALL_UNITS_CHECKLIST.md`：完整單元覆蓋檢核。
- 新增 `EXAM_115_ALIGNMENT.md`：對照 115 學測數學 A 與 115 分科數學甲試卷題型。
- 補齊先前較缺的單元：
  - 集合與邏輯、直線方程、線性規劃、圓方程
  - 函數變換、反函數與合成函數、三次函數中心、根的重數
  - 連續複利、對數尺度、Σ 公式、遞迴數列、無窮等比級數
  - 三角函數圖形變換、三角方程
  - 空間交線、線面角、三重積體積、球面
  - 反方陣、高斯消去、行列式面積、隔板法、二項式定理
  - 機率樹、列聯表、主客觀機率、期望值與變異數
  - 牛頓法、微分公式、凹凸反曲、最佳化、介值定理、夾擠定理、切片積分
  - 複數 n 次方根、共軛虛根、旋轉橢圓、橢圓參數式
  - 二項常態近似、不放回抽樣

## 快速開始

直接開啟：

```bash
open index.html
```

或用任一靜態伺服器：

```bash
python -m http.server 8000
```

然後開啟 `http://localhost:8000`。

## 部署到 GitHub Pages

若要放進你的 `jasoart/Math` repo：

```bash
git clone https://github.com/jasoart/Math.git
cd Math
mkdir -p dynamic-geometry
cp -R path/to/highschool-dynamic-geometry/* dynamic-geometry/
git add dynamic-geometry
git commit -m "Expand dynamic geometry to complete high-school math coverage"
git push
```

若使用 GitHub Pages：

1. 到 repo 的 **Settings → Pages**
2. Source 選擇 `GitHub Actions`，或直接指定 branch/folder
3. 若採用本專案內建 workflow，將資料夾放在 repo 根目錄即可自動部署

## 專案檔案

| 檔案 | 用途 |
|---|---|
| `index.html` | 單頁應用入口 |
| `styles.css` | 響應式版面與卡片樣式 |
| `app.js` | 85 個互動模組與 Canvas 繪圖邏輯 |
| `MODULE_INDEX.md` | 模組索引 |
| `CURRICULUM_MAP.md` | 課程單元對照 |
| `ALL_UNITS_CHECKLIST.md` | 全單元覆蓋檢核 |
| `EXAM_115_ALIGNMENT.md` | 115 年試卷題型對照 |
| `TEACHER_GUIDE.md` | 教師課堂使用建議 |
| `ROADMAP.md` | 後續開發規劃 |
| `CHANGELOG.md` | 版本紀錄 |
| `package.json` | 語法檢查指令 |

## 指令

```bash
npm run check
```

目前檢查項目：

```bash
node --check app.js
```

## 授權

MIT License。
