/**
 * @module modules/weightEngine
 * @description 權重引擎（獨立模組）。將使用者輸入之生活／薪資／適配原始權重正規化為比例，
 * 並產生圓餅圖所需資料。範圍與預設值一律讀取 formula.json。
 */

import { normalizeWeights } from '../utils/Calculation.js';

/**
 * 取得權重欄位設定（範圍、預設、標籤）。
 * @param {object} formula data/formula.json 內容
 * @returns {Array<{key:string, min:number, max:number, default:number, label:string}>}
 */
export function getWeightFields(formula) {
  return ['life', 'salary', 'fit'].map((key) => ({ key, ...formula.weights[key] }));
}

/**
 * 計算正規化比例。
 * @param {{life:number, salary:number, fit:number}} raw 原始權重
 * @returns {{life:number, salary:number, fit:number, total:number}} 比例與原始總和
 */
export function computeRatios(raw) {
  return normalizeWeights(raw);
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
