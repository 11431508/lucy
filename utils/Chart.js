/**
 * @module utils/Chart
 * @description Chart.js 封裝：統一深色主題樣式、管理實例生命週期、提供 PNG 下載。
 * 依賴全域 window.Chart（由 index.html 以 <script> 載入）。
 */

/** @type {Object<string, any>} canvasId → Chart 實例 */
const registry = {};

/**
 * 等待 Chart.js（自 CDN 載入）就緒。避免在函式庫載入完成前繪圖導致空白畫布。
 * @param {number} [timeoutMs=8000] 逾時毫秒數
 * @returns {Promise<boolean>} 就緒為 true；逾時為 false
 */
export function ready(timeoutMs = 8000) {
  if (window.Chart) return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (window.Chart) {
        clearInterval(timer);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        console.warn('[Chart] Chart.js 載入逾時');
        resolve(false);
      }
    }, 50);
  });
}

const THEME = {
  font: "'Noto Sans TC', system-ui, sans-serif",
  grid: 'rgba(255,255,255,0.08)',
  tick: 'rgba(233,238,255,0.75)',
  palette: ['#7aa2ff', '#5be3c0', '#ffb86b', '#ff7ab6', '#c08bff', '#9be15d'],
};

/**
 * 銷毀指定 canvas 上既有的圖表實例（重繪前呼叫）。
 * @param {string} canvasId canvas 元素 id
 * @returns {void}
 */
function destroyIfExists(canvasId) {
  if (registry[canvasId]) {
    registry[canvasId].destroy();
    delete registry[canvasId];
  }
}

/**
 * 建立圖表的共用底層函式。
 * @param {string} canvasId canvas 元素 id
 * @param {object} config Chart.js 設定物件
 * @returns {any} Chart 實例
 */
function create(canvasId, config) {
  const el = document.getElementById(canvasId);
  if (!el || !window.Chart) return null;
  destroyIfExists(canvasId);
  window.Chart.defaults.color = THEME.tick;
  window.Chart.defaults.font.family = THEME.font;
  // 關閉動畫：首次繪製即同步完成，確保 PNG／PDF 匯出與非焦點分頁下皆能正確呈現。
  window.Chart.defaults.animation = false;
  const chart = new window.Chart(el.getContext('2d'), config);
  registry[canvasId] = chart;
  return chart;
}

/**
 * 圓餅圖（權重比例）。
 * @param {string} canvasId canvas id
 * @param {string[]} labels 標籤
 * @param {number[]} data 數值
 * @returns {any} Chart 實例
 */
export function pieChart(canvasId, labels, data) {
  return create(canvasId, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: THEME.palette, borderColor: 'rgba(10,14,30,0.6)', borderWidth: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

/**
 * 長條圖（總分或單一維度比較）。
 * @param {string} canvasId canvas id
 * @param {string[]} labels 學校標籤
 * @param {number[]} data 數值
 * @param {string} title 資料集標題
 * @returns {any} Chart 實例
 */
export function barChart(canvasId, labels, data, title) {
  return create(canvasId, {
    type: 'bar',
    data: { labels, datasets: [{ label: title, data, backgroundColor: THEME.palette, borderRadius: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: THEME.grid } },
        x: { grid: { display: false } },
      },
      plugins: { legend: { display: false } },
    },
  });
}

/**
 * 分群長條圖（多維度四校比較）。
 * @param {string} canvasId canvas id
 * @param {string[]} labels 學校標籤
 * @param {Array<{label:string, data:number[]}>} series 各維度資料
 * @param {number} [yMax=10] y 軸上限（分數 0–10 用 10；綜合總分 0–100 用 100）
 * @returns {any} Chart 實例
 */
export function groupedBar(canvasId, labels, series, yMax = 10) {
  return create(canvasId, {
    type: 'bar',
    data: {
      labels,
      datasets: series.map((s, i) => ({ label: s.label, data: s.data, backgroundColor: THEME.palette[i], borderRadius: 6 })),
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: yMax, grid: { color: THEME.grid } }, x: { grid: { display: false } } },
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

/**
 * 雷達圖（四校於生活／薪資／適配三軸比較）。
 * @param {string} canvasId canvas id
 * @param {string[]} axes 軸標籤
 * @param {Array<{label:string, data:number[]}>} series 各校資料
 * @returns {any} Chart 實例
 */
export function radarChart(canvasId, axes, series) {
  return create(canvasId, {
    type: 'radar',
    data: {
      labels: axes,
      datasets: series.map((s, i) => ({
        label: s.label, data: s.data,
        borderColor: THEME.palette[i], backgroundColor: THEME.palette[i] + '33', pointBackgroundColor: THEME.palette[i],
      })),
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: { min: 0, max: 10, grid: { color: THEME.grid }, angleLines: { color: THEME.grid }, pointLabels: { color: THEME.tick } } },
      plugins: { legend: { position: 'bottom' } },
    },
  });
}

/**
 * 將指定圖表輸出為 PNG 並觸發下載。
 * @param {string} canvasId canvas id
 * @param {string} filename 下載檔名（不含副檔名）
 * @returns {void}
 */
export function downloadPNG(canvasId, filename) {
  const chart = registry[canvasId];
  if (!chart) return;
  const url = chart.toBase64Image('image/png', 1);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
}

/**
 * 取得目前所有圖表的 PNG dataURL（供 PDF 匯出使用）。
 * @returns {Object<string,string>} canvasId → dataURL
 */
export function snapshotAll() {
  const out = {};
  for (const [id, chart] of Object.entries(registry)) {
    out[id] = chart.toBase64Image('image/png', 1);
  }
  return out;
}
