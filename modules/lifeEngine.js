/**
 * @module modules/lifeEngine
 * @description 生活評估引擎（獨立模組）。依 formula.json 之生活項目權重計算各校生活分數（0–10）。
 * 不硬編碼任何權重或除數，全部取自 formula.json。
 */

import { weightedSum, clamp, round } from '../utils/Calculation.js';

/**
 * 取得生活評分項目設定。
 * @param {object} formula data/formula.json 內容
 * @returns {Array<{key:string, label:string, weight:number, min:number, max:number}>}
 */
export function getLifeItems(formula) {
  return formula.life.items;
}

/**
 * 計算單一學校之生活分數。
 * @param {object} formula data/formula.json 內容
 * @param {Object<string,number>} ratings 各項評分（key → 1..10）
 * @returns {{score:number, breakdown:Array<{key:string,label:string,rating:number,weight:number,contribution:number}>}}
 */
export function computeSchoolLife(formula, ratings) {
  const items = formula.life.items;
  const breakdown = items.map((it) => {
    const rating = clamp(Number(ratings?.[it.key] ?? it.min), it.min, it.max);
    return { key: it.key, label: it.label, rating, weight: it.weight, contribution: rating * it.weight };
  });
  const raw = weightedSum(breakdown.map((b) => ({ value: b.rating, weight: b.weight })));
  const score = clamp(raw / formula.life.divisor, 0, formula.life.maxScore);
  return { score: round(score, 2), breakdown };
}

/**
 * 計算所有學校之生活分數。
 * @param {object} formula data/formula.json 內容
 * @param {object} schoolData data/school.json 內容
 * @param {Object<string, Object<string,number>>} allRatings schoolId → 各項評分
 * @returns {Object<string,{score:number, breakdown:Array}>} schoolId → 結果
 */
export function computeAllLife(formula, schoolData, allRatings) {
  const out = {};
  for (const s of schoolData.schools) {
    out[s.id] = computeSchoolLife(formula, allRatings?.[s.id] || {});
  }
  return out;
}
