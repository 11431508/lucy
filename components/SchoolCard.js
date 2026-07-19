/**
 * @module components/SchoolCard
 * @description 學校總分摘要卡（結果頁頂部排名列使用）。
 */

import { formatScore } from '../utils/Formatter.js';

/**
 * 產生學校摘要卡 HTML。
 * @param {object} result analysisEngine 之單校結果
 * @param {number} rankIndex 排名（0 起）
 * @returns {string} HTML 字串
 */
export function SchoolCard(result, rankIndex) {
  const medal = ['①', '②', '③', '④'][rankIndex] || rankIndex + 1;
  return `
    <div class="school-summary glass" data-animate>
      <div class="rank-badge">${medal}</div>
      <div class="school-summary-main">
        <h3>${result.name}</h3>
        <div class="total-score">${formatScore(result.total)}<span>/100</span></div>
      </div>
      <div class="mini-scores">
        <span>生活 ${formatScore(result.life)}</span>
        <span>薪資 ${formatScore(result.salary)}</span>
        <span>適配 ${formatScore(result.fit)}</span>
      </div>
    </div>`;
}
