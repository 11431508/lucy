/**
 * @module modules/weightEngine
 * @description 權重引擎（獨立模組）。將使用者輸入之生活／薪資／適配原始權重正規化為比例，
 * 並產生圓餅圖所需資料。範圍與預設值一律讀取 formula.json。
 */

import { normalizeWeights } from '../utils/Calculation.js';

/**
 * 取得核心三維權重欄位設定（生活／薪資／適配，供綜合評分一與圓餅圖）。
 * @param {object} formula data/formula.json 內容
 * @returns {Array<{key:string, min:number, max:number, default:number, label:string}>}
 */
export function getWeightFields(formula) {
  return ['life', 'salary', 'fit'].map((key) => ({ key, ...formula.weights[key] }));
}

/**
 * 取得升學權重欄位設定（僅計入綜合評分二）。
 * @param {object} formula data/formula.json 內容
 * @returns {{key:string, min:number, max:number, default:number, label:string}}
 */
export function getAbroadWeightField(formula) {
  return { key: 'abroad', ...formula.weights.abroad };
}

/**
 * 計算三維（生活／薪資／適配）正規化比例，供綜合評分一。
 * @param {{life:number, salary:number, fit:number}} raw 原始權重
 * @returns {{life:number, salary:number, fit:number, total:number}} 比例與原始總和
 */
export function computeRatios(raw) {
  return normalizeWeights(raw);
}

/**
 * 計算四維（含升學）正規化比例，供綜合評分二。
 * @param {{life:number, salary:number, fit:number, abroad:number}} raw 原始權重
 * @returns {{life:number, salary:number, fit:number, abroad:number, total:number}} 比例與原始總和
 */
export function computeRatios4(raw) {
  const total = raw.life + raw.salary + raw.fit + raw.abroad;
  if (total <= 0) return { life: 0.25, salary: 0.25, fit: 0.25, abroad: 0.25, total: 0 };
  return {
    life: raw.life / total,
    salary: raw.salary / total,
    fit: raw.fit / total,
    abroad: raw.abroad / total,
    total,
  };
}

/**
 * 產生圓餅圖資料（百分比）。
 * @param {object} formula data/formula.json 內容
 * @param {{life:number, salary:number, fit:number}} ratios 正規化比例
 * @returns {{labels:string[], data:number[]}} 圖表標籤與百分比數值
 */
export function toPieData(formula, ratios) {
  return {
    labels: [formula.weights.life.label, formula.weights.salary.label, formula.weights.fit.label],
    data: [ratios.life * 100, ratios.salary * 100, ratios.fit * 100],
  };
}
