/**
 * @module utils/Calculation
 * @description 純數學工具函式，供各分析引擎共用。所有函式無副作用、不讀取全域狀態，
 * 便於單元測試與公式版本替換。任何具體係數一律由 formula.json 傳入，本檔不硬編碼商業數字。
 */

/**
 * 將數值限制在 [min, max] 區間內。
 * @param {number} value 原始值
 * @param {number} min 下限
 * @param {number} max 上限
 * @returns {number} 限制後的值
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * 四捨五入至指定小數位。
 * @param {number} value 原始值
 * @param {number} [digits=2] 小數位數
 * @returns {number} 四捨五入後的值
 */
export function round(value, digits = 2) {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * 依三項權重計算正規化比例（各比例加總為 1）。
 * @param {{life:number, salary:number, fit:number}} weights 使用者輸入之原始權重
 * @returns {{life:number, salary:number, fit:number, total:number}} 正規化比例與原始總和
 */
export function normalizeWeights(weights) {
  const total = weights.life + weights.salary + weights.fit;
  if (total <= 0) {
    return { life: 1 / 3, salary: 1 / 3, fit: 1 / 3, total: 0 };
  }
  return {
    life: weights.life / total,
    salary: weights.salary / total,
    fit: weights.fit / total,
    total,
  };
}

/**
 * 加權加總。
 * @param {Array<{value:number, weight:number}>} items 值與權重陣列
 * @returns {number} 加權總和 Σ(value×weight)
 */
export function weightedSum(items) {
  return items.reduce((sum, it) => sum + it.value * it.weight, 0);
}

/**
 * 對一組數值做「最大值標準化」：最大者映射為 targetMax，其餘按比例縮放。
 * @param {Object<string,number>} record 鍵→原始值
 * @param {number} targetMax 目標最大分數（例如 10）
 * @returns {Object<string,number>} 鍵→標準化後分數
 */
export function maxNormalize(record, targetMax) {
  const values = Object.values(record);
  const max = Math.max(...values, 0);
  const out = {};
  for (const [key, v] of Object.entries(record)) {
    out[key] = max > 0 ? (v / max) * targetMax : 0;
  }
  return out;
}

/**
 * 將分布物件正規化為機率（加總為 1）。
 * @param {Object<string,number>} dist 鍵→權重
 * @returns {Object<string,number>} 鍵→機率
 */
export function normalizeDistribution(dist) {
  const total = Object.values(dist).reduce((s, v) => s + v, 0);
  const out = {};
  for (const [key, v] of Object.entries(dist)) {
    out[key] = total > 0 ? v / total : 0;
  }
  return out;
}
