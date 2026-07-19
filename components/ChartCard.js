/**
 * @module components/ChartCard
 * @description 圖表卡片：包裹 canvas 並提供 PNG 下載按鈕。
 */

/**
 * 產生圖表卡片 HTML。
 * @param {object} opts
 * @param {string} opts.canvasId canvas 元素 id
 * @param {string} opts.title 圖表標題
 * @param {string} [opts.height='320px'] 卡片高度
 * @returns {string} HTML 字串
 */
export function ChartCard({ canvasId, title, height = '320px' }) {
  return `
    <div class="chart-card glass" data-animate>
      <div class="chart-card-head">
        <h3>${title}</h3>
        <button class="btn btn-mini" data-download-chart="${canvasId}">下載 PNG</button>
      </div>
      <div class="chart-wrap" style="height:${height}">
        <canvas id="${canvasId}"></canvas>
      </div>
    </div>`;
}
