/**
 * @module utils/Formatter
 * @description 顯示格式化工具：貨幣、百分比、分數、月薪等。集中管理呈現格式。
 */

/**
 * 將新臺幣金額格式化為易讀字串。
 * @param {number} value 金額（新臺幣）
 * @param {boolean} [perMonth=true] 是否標示為月薪
 * @returns {string} 例如 "NT$ 120,000 / 月"
 */
export function formatTWD(value, perMonth = true) {
  const n = Math.round(value).toLocaleString('zh-Hant-TW');
  return `NT$ ${n}${perMonth ? ' / 月' : ''}`;
}

/**
 * 格式化百分比。
 * @param {number} ratio 0–1 之比例
 * @param {number} [digits=1] 小數位
 * @returns {string} 例如 "42.9%"
 */
export function formatPercent(ratio, digits = 1) {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/**
 * 格式化分數（固定小數位）。
 * @param {number} value 分數
 * @param {number} [digits=1] 小數位
 * @returns {string} 例如 "8.4"
 */
export function formatScore(value, digits = 1) {
  return Number(value).toFixed(digits);
}

/**
 * 可信度等級 → 中文標籤。
 * @param {string} level high | medium | low
 * @returns {string} 中文可信度
 */
export function formatCredibility(level) {
  return { high: '高', medium: '中', low: '低' }[level] || '未標示';
}
