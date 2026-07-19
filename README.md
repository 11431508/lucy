# 大學與科系決策分析平台

以**生活、薪資、科系適配**三維度，量化比較四所學校／科系，並輸出總分排序、圖表與 PDF 報告：

- 北京大學 法律
- 臺灣大學 法律
- 香港中文大學 法律
- 香港大學 會計與金融

## 執行方式

本平台採 **ES6 Modules + fetch** 載入 `data/` 之 JSON 資料庫，**需經本機伺服器開啟**（不能直接雙擊 `index.html`，否則瀏覽器會因 file:// 的 CORS 限制而無法載入資料）。

於本資料夾內擇一執行：

```bash
python -m http.server 8000
# 或
npx serve .
```

再以瀏覽器開啟 <http://localhost:8000>。

支援 Chrome、Edge、Safari、Firefox 及手機瀏覽器。

## 使用流程

1. **權重設定**：輸入生活（0–10）、薪資（0–20）、科系適配（0–10），系統即時正規化並顯示圓餅圖。
2. **生活評估**：四校各評四項（成就感、校園、生活、城市），即時計算生活分數。
3. **薪資分析**：回答努力程度 PR，改變各職涯錄取分布，據薪資資料庫計算薪資分數。
4. **科系適配**：10 題特質題，各校依採用題目與權重計算適配分數。
5. **分析結果**：總分（100 分制）排序、四張圖表（可下載 PNG）、各校完整分析、PDF 匯出。

## 架構

```
index.html / style.css / main.js
modules/   權重、生活、薪資、適配、成本、分析總引擎（獨立、可替換）
components/ Header, Footer, StepCard, QuestionCard, ChartCard, ResultCard, SchoolCard
utils/     Storage, Calculation, Formatter, Chart, PDF, Animation
data/      formula, school, career, salary, city, cost, personality, ranking（JSON）
```

### 可擴充性

新增學校、科系、城市、職涯或調整公式，**只需編輯 `data/` 之 JSON**，無須修改核心演算法：

- 新增學校 → `school.json` + `career.json`（distribution）+ `personality.json`（fitConfig）+ `ranking.json`
- 新增職涯 → `career.json`（careers）+ `salary.json`（salaryTable）
- 調整公式版本 → `formula.json`（權重範圍、加權係數、加減分、標準化規則）

## 資料來源與可信度

排名採 QS／THE 公開榜單近年區間值；薪資與就業分布為官方就業報告、政府統計、大型薪資調查之多來源交叉估算，各筆資料標示 `type / year / credibility`。實際數字請以各校與政府之最新官方資料為準；本平台為決策分析工具，非個人化投資或生涯建議。
