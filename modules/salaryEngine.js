/**
 * @module modules/salaryEngine
 * @description 薪資分析引擎（獨立模組）。PR 不直接加薪，而是改變各職涯錄取分布（PR 修正後比例）。
 * 薪資公式固定為：（起薪×0.2 + 職涯平均薪資×0.8）→ 依 regionalFactor 換算 → 每一萬元 = 1 分
 * → 除以生活成本指數 → 四校最高者標準化為 10 分。所有係數取自 formula.json / career.json。
 */

import { normalizeDistribution, maxNormalize, round } from '../utils/Calculation.js';

/**
 * 依 PR 區間對某校計算 PR 修正後的職涯分布。
 * @param {object} career data/career.json 內容
 * @param {string} careerSetId 職涯集合 id（law/finance）
 * @param {Object<string,number>} baseEmployment 基礎就業比例（careerId → ratio）
 * @param {string} prBand PR 區間鍵（pr99_90 等）
 * @returns {Object<string,number>} careerId → PR 修正後比例（加總為 1）
 */
export function prAdjustedDistribution(career, careerSetId, baseEmployment, prBand) {
  const careers = career.careerSets[careerSetId].careers;
  const tierOf = Object.fromEntries(careers.map((c) => [c.id, c.tier]));
  const weighted = {};
  for (const [careerId, base] of Object.entries(baseEmployment)) {
    const tier = tierOf[careerId] || 'mid';
    const mult = career.prTiers[tier]?.[prBand] ?? 1;
    weighted[careerId] = base * mult;
  }
  return normalizeDistribution(weighted);
}

/**
 * 計算單一職涯之混合薪資（未乘 regionalFactor）。
 * @param {object} formula data/formula.json 內容
 * @param {object} salaryRow 該職涯之薪資列
 * @returns {number} 起薪×0.2 + 職涯平均薪資×0.8
 */
export function blendedSalary(formula, salaryRow) {
  const { graduateWeight, careerAverageWeight } = formula.salary;
  return salaryRow.starting * graduateWeight + salaryRow.avgCareer * careerAverageWeight;
}

/**
 * 計算所有學校之薪資分數。
 * @param {object} params
 * @param {object} params.formula data/formula.json
 * @param {object} params.school data/school.json
 * @param {object} params.career data/career.json
 * @param {object} params.salary data/salary.json
 * @param {Object<string,number>} params.costIndex cityId → 成本指數
 * @param {string} params.prBand PR 區間鍵
 * @returns {Object<string, object>} schoolId → { score, rawPoint, expectedBlended, distribution, careers[] }
 */
export function computeAllSalary({ formula, school, career, salary, costIndex, prBand }) {
  const raw = {}; // schoolId → rawPoint（標準化前）
  const detail = {};

  for (const s of school.schools) {
    const setId = s.careerSetId;
    const dist = career.schoolDistributions[s.id];
    const factor = dist.regionalSalaryFactor;
    const table = salary.salaryTable[setId];
    const overrides = salary.schoolOverrides?.[s.id] || null;
    const adjusted = prAdjustedDistribution(career, setId, dist.employment, prBand);

    let expectedBlended = 0;
    const careers = career.careerSets[setId].careers.map((c) => {
      const row = table[c.id];
      const ov = overrides?.[c.id] || null;
      /**
       * 取金額欄位：若該校對此職涯有絕對值覆寫則直接採用（不乘地區係數），
       * 否則以基準表金額乘 regionalSalaryFactor。
       * @param {string} key 金額欄位鍵
       * @returns {number} 新臺幣月薪
       */
      const money = (key) => (ov && ov[key] != null ? ov[key] : row[key] * factor);

      const blended = money('starting') * formula.salary.graduateWeight + money('avgCareer') * formula.salary.careerAverageWeight;
      const baseRatio = dist.employment[c.id] || 0;
      const prRatio = adjusted[c.id] || 0;
      expectedBlended += prRatio * blended;
      return {
        id: c.id,
        label: c.label,
        tier: c.tier,
        baseRatio,
        prRatio,
        blendedSalary: blended,
        overridden: !!ov,
        salary: {
          starting: money('starting'),
          y3: money('y3'),
          y5: money('y5'),
          y10: money('y10'),
          avgCareer: money('avgCareer'),
          ceiling: money('ceiling'),
          workHours: row.workHours,
          stress: row.stress,
          aiImpact: row.aiImpact,
          futureDemand: row.futureDemand,
          promotion: row.promotion,
          stability: row.stability,
          freedom: row.freedom,
          regionLimit: row.regionLimit,
        },
      };
    });

    const idx = costIndex[s.cityId] || 1;
    const rawPoint = (expectedBlended / formula.salary.twdPerPoint) / idx;
    raw[s.id] = rawPoint;
    detail[s.id] = {
      rawPoint: round(rawPoint, 3),
      expectedBlended: round(expectedBlended, 0),
      costAdjustedIncome: round(expectedBlended / idx, 0),
      costIndex: round(idx, 3),
      regionalFactor: factor,
      distribution: adjusted,
      careers: careers.sort((a, b) => b.prRatio - a.prRatio),
    };
  }

  // 四校最高標準化為 maxScore。
  const normalized = maxNormalize(raw, formula.salary.maxScore);
  const out = {};
  for (const s of school.schools) {
    out[s.id] = { score: round(normalized[s.id], 2), ...detail[s.id] };
  }
  return out;
}
