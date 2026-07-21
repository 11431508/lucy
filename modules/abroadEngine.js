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
 * 計算四校各自之留學跳板評分（申請實力、發展價值、風險調整期望值）。
 * @param {object} abroad data/abroad.json 內容
 * @param {object} school data/school.json 內容（提供校名）
 * @returns {Array<object>} 依期望值排序之各校結果
 *   每項含 { id, name, applicationScore, developmentValue, expectedValue, recommendedPath, note }
 */
export function computeSchoolAbroad(abroad, school) {
  const recs = abroad.schoolAbroad.records;
  const pathName = (pid) => abroad.paths.find((p) => p.id === pid)?.shortName || pid;
  const nameOf = (id) => school.schools.find((s) => s.id === id)?.name || id;

  const out = Object.entries(recs).map(([id, r]) => ({
    id,
    name: nameOf(id),
    applicationScore: r.applicationScore,
    developmentValue: r.developmentValue,
    expectedValue: Math.round((r.applicationScore / 10) * r.developmentValue * 10) / 10,
    recommendedPath: r.recommendedPath === 'finance_grad' ? '金融碩士／MBA' : pathName(r.recommendedPath),
    note: r.note,
  }));

  out.sort((a, b) => b.expectedValue - a.expectedValue);
  return out;
}
