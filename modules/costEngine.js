/**
 * @module modules/costEngine
 * @description 生活成本引擎（獨立模組）。由 city.json 各城市月度成本加總，
 * 對四所學校所在城市之平均值標準化（四校平均 = 1）。更換城市資料即自動重算。
 */

/**
 * 計算各城市生活成本指數（四校平均 = 1）。
 * @param {object} cityData data/city.json 內容
 * @param {object} schoolData data/school.json 內容
 * @returns {{index: Object<string,number>, totals: Object<string,number>, average: number}}
 *   index：cityId → 成本指數；totals：cityId → 月度總成本；average：四校平均總成本
 */
export function computeCostIndex(cityData, schoolData) {
  const components = cityData.components.map((c) => c.key);
  /** @type {Object<string,number>} */
  const totals = {};

  for (const [cityId, city] of Object.entries(cityData.cities)) {
    totals[cityId] = components.reduce((sum, key) => sum + (city[key] || 0), 0);
  }

  // 依四所學校（可能重複城市）取平均，符合「四校平均生活成本指數為 1」。
  const schoolTotals = schoolData.schools.map((s) => totals[s.cityId] || 0);
  const average = schoolTotals.reduce((a, b) => a + b, 0) / schoolTotals.length;

  /** @type {Object<string,number>} */
  const index = {};
  for (const [cityId, total] of Object.entries(totals)) {
    index[cityId] = average > 0 ? total / average : 1;
  }

  return { index, totals, average };
}
