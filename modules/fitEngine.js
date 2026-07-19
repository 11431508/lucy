/**
 * @module modules/fitEngine
 * @description 科系適配引擎（獨立模組）。10 題共用作答，各校依 personality.json 之 fitConfig 採用不同題目與權重。
 * 流程：加權加總 → 以該校採用題目之理論最高分標準化為 0–10 → 套用固定加減分 → 夾限 [0,10]。
 * 選項值與加減分一律取自 formula.json / personality.json。
 */

import { clamp, round } from '../utils/Calculation.js';

/**
 * 取得適配問卷題目與選項設定。
 * @param {object} formula data/formula.json
 * @param {object} personality data/personality.json
 * @returns {{questions:Array, options:Array}} 題目與選項（含分值）
 */
export function getFitQuestionnaire(formula, personality) {
  return { questions: personality.questions, options: formula.fit.optionValues };
}

/**
 * 計算單一學校之適配分數。
 * @param {object} formula data/formula.json
 * @param {object} fitConfig 該校 personality.fitConfigs[id]
 * @param {Object<string,number>} answers questionKey → 選項分值（0.4..2.0）
 * @returns {{score:number, base10:number, adjustment:number, contributions:Array}}
 */
export function computeSchoolFit(formula, fitConfig, answers) {
  const maxOption = Math.max(...formula.fit.optionValues.map((o) => o.value));
  let rawSum = 0;
  let maxSum = 0;
  const contributions = fitConfig.items.map((it) => {
    const val = Number(answers?.[it.key] ?? formula.fit.optionValues[2].value); // 預設「無感」
    rawSum += val * it.weight;
    maxSum += maxOption * it.weight;
    return { key: it.key, weight: it.weight, value: val, contribution: val * it.weight };
  });
  const base10 = maxSum > 0 ? (rawSum / maxSum) * formula.fit.maxScore : 0;
  const adjusted = base10 + fitConfig.fixedAdjustment;
  const score = clamp(adjusted, formula.fit.minScore, formula.fit.maxScore);
  return {
    score: round(score, 2),
    base10: round(base10, 2),
    adjustment: fitConfig.fixedAdjustment,
    contributions,
  };
}

/**
 * 計算所有學校之適配分數。
 * @param {object} formula data/formula.json
 * @param {object} school data/school.json
 * @param {object} personality data/personality.json
 * @param {Object<string,number>} answers questionKey → 選項分值
 * @returns {Object<string, object>} schoolId → 適配結果
 */
export function computeAllFit(formula, school, personality, answers) {
  const out = {};
  for (const s of school.schools) {
    const cfg = personality.fitConfigs[s.fitConfigId];
    out[s.id] = { ...computeSchoolFit(formula, cfg, answers), config: cfg };
  }
  return out;
}
