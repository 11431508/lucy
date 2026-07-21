/**
 * @module modules/dataLoader
 * @description 以 fetch 平行載入 data/ 之所有 JSON 資料庫。所有引擎僅依賴此處回傳之資料物件，
 * 不直接讀檔，便於更換資料庫。
 */

const FILES = {
  formula: 'data/formula.json',
  school: 'data/school.json',
  ranking: 'data/ranking.json',
  career: 'data/career.json',
  salary: 'data/salary.json',
  city: 'data/city.json',
  cost: 'data/cost.json',
  personality: 'data/personality.json',
  abroad: 'data/abroad.json',
};

/**
 * 平行載入所有資料檔。
 * @returns {Promise<Object>} 鍵→解析後 JSON 之資料庫物件
 * @throws {Error} 任一檔案載入失敗時拋出（多因以 file:// 開啟，需改用本機伺服器）
 */
export async function loadAllData() {
  const entries = Object.entries(FILES);
  const results = await Promise.all(
    entries.map(async ([key, path]) => {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error(`載入 ${path} 失敗（HTTP ${res.status}）`);
      return [key, await res.json()];
    })
  );
  return Object.fromEntries(results);
}
