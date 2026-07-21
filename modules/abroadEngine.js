/**
 * @module modules/abroadEngine
 * @description 升學評分引擎（獨立模組，與四校分析完全分離）。
 * 依 abroad.json 之維度權重對各留學路徑計算加權總分（100 分制），
 * 權重與分數全部來自資料檔，本檔不硬編碼任何數字。
 */

/**
 * 計算所有路徑之加權總分並排序。
 * @param {object} abroad data/abroad.json 內容
 * @returns {Array<object>} 依總分由高至低排序之路徑結果
 *   每項含 { id, name, shortName, total, scores, weighted, path }
 */
export function computeAbroad(abroad) {
  const dims = abroad.dimensions;
  const totalWeight = dims.reduce((s, d) => s + d.weight, 0);

  const results = abroad.paths.map((p) => {
    let sum = 0;
    /** @type {Object<string,number>} 維度鍵 → 加權得分 */
    const weighted = {};
    for (const d of dims) {
      const v = (p.scores[d.key] ?? 0) * d.weight;
      weighted[d.key] = v;
      sum += v;
    }
    const total = (sum / (totalWeight * 10)) * 100; // 滿分 100
    return {
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      total: Math.round(total * 10) / 10,
      scores: p.scores,
      weighted,
      path: p,
    };
  });

  results.sort((a, b) => b.total - a.total);
  return results;
}

/**
 * 由子因子物件計算平均分數。
 * @param {Array<{key:string}>} factors 因子定義
 * @param {Object<string,number>} values 子因子分數
 * @returns {number} 平均值（0–10）
 */
function factorMean(factors, values) {
  const arr = factors.map((f) => values[f.key] ?? 0);
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * 計算四校各自之留學跳板評分。
 * 升學分數『以頂級海外學校升學比例為主』：
 *   normRate = min(rateCap, topSchoolRate / ratePerPoint)
 *   expectedValue = topSchoolWeight×normRate + developmentWeight×developmentValue
 * applicationScore（申請 4 因子平均）僅作輔助顯示，不主導分數。
 * @param {object} abroad data/abroad.json 內容
 * @param {object} school data/school.json 內容（提供校名）
 * @returns {Array<object>} 依升學分數排序之各校結果，含頂級升學率、發展明細、依據與來源
 */
export function computeSchoolAbroad(abroad, school) {
  const sa = abroad.schoolAbroad;
  const m = sa.scoreModel;
  const appF = sa.applicationFactors;
  const devF = sa.developmentFactors;
  const pathName = (pid) => abroad.paths.find((p) => p.id === pid)?.shortName || pid;
  const nameOf = (id) => school.schools.find((s) => s.id === id)?.name || id;

  const out = Object.entries(sa.records).map(([id, r]) => {
    const applicationScore = factorMean(appF, r.application);
    const developmentValue = factorMean(devF, r.development);
    const normRate = Math.min(m.rateCap, r.topSchoolRate / m.ratePerPoint);
    const expectedValue = m.topSchoolWeight * normRate + m.developmentWeight * developmentValue;
    return {
      id,
      name: nameOf(id),
      topSchoolRate: r.topSchoolRate,
      normRate: Math.round(normRate * 10) / 10,
      applicationScore: Math.round(applicationScore * 10) / 10,
      developmentValue: Math.round(developmentValue * 10) / 10,
      expectedValue: Math.round(expectedValue * 10) / 10,
      recommendedPath: r.recommendedPath === 'finance_grad' ? '金融碩士／MBA' : pathName(r.recommendedPath),
      targetDegree: r.targetDegree,
      topSchoolNote: r.topSchoolNote,
      application: r.application,
      development: r.development,
      rationale: r.rationale,
      sources: r.sources || [],
    };
  });

  out.sort((a, b) => b.expectedValue - a.expectedValue);
  return out;
}
