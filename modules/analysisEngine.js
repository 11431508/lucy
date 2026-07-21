/**
 * @module modules/analysisEngine
 * @description 分析總引擎（協調層）。整合生活、薪資、適配三獨立引擎之輸出，
 * 依 formula.json 之總分公式計算總分（100 分制），排序並產生各校客觀敘述與詳細結構。
 * 不含主觀語句（如「推薦你」「如果你比較適合」），不使用星星評價。
 */

import { round } from '../utils/Calculation.js';
import { computeAllLife } from './lifeEngine.js';
import { computeAllSalary } from './salaryEngine.js';
import { computeAllFit } from './fitEngine.js';
import { computeCostIndex } from './costEngine.js';
import { computeRatios, computeRatios4 } from './weightEngine.js';
import { computeSchoolAbroad } from './abroadEngine.js';
import { formatScore, formatTWD, formatPercent, formatCredibility } from '../utils/Formatter.js';

/**
 * 執行完整分析。
 * @param {object} db 由 dataLoader 載入之所有資料庫
 * @param {object} input 使用者輸入
 * @param {{life:number,salary:number,fit:number}} input.weights 原始權重
 * @param {Object<string,Object<string,number>>} input.lifeRatings schoolId → 生活評分
 * @param {string} input.prBand PR 區間鍵
 * @param {Object<string,number>} input.fitAnswers questionKey → 選項分值
 * @returns {{ratios:object, costIndex:object, results:Array<object>}} 分析結果
 */
export function runAnalysis(db, input) {
  const { formula, school, city, career, salary, personality, ranking, abroad } = db;

  const abroadWeight = input.weights.abroad ?? formula.weights.abroad.default;
  const ratios = computeRatios(input.weights);
  const ratios4 = computeRatios4({ ...input.weights, abroad: abroadWeight });
  const { index: costIndex } = computeCostIndex(city, school);

  const life = computeAllLife(formula, school, input.lifeRatings);
  const salaryScores = computeAllSalary({ formula, school, career, salary, costIndex, prBand: input.prBand });
  const fit = computeAllFit(formula, school, personality, input.fitAnswers);

  // 各校升學分數（留學期望值，0–10），供綜合評分二與獨立顯示。
  const abroadList = abroad ? computeSchoolAbroad(abroad, school) : [];
  const abroadScoreById = Object.fromEntries(abroadList.map((a) => [a.id, a.expectedValue]));

  const results = school.schools.map((s) => {
    const lifeScore = life[s.id].score;
    const salScore = salaryScores[s.id].score;
    const fitScore = fit[s.id].score;
    const abroadScore = abroadScoreById[s.id] ?? 0;
    const total = (lifeScore * ratios.life + salScore * ratios.salary + fitScore * ratios.fit) * 10;
    const totalWithAbroad =
      (lifeScore * ratios4.life + salScore * ratios4.salary + fitScore * ratios4.fit + abroadScore * ratios4.abroad) * 10;

    return {
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      program: s.program,
      total: round(total, 1),
      totalWithAbroad: round(totalWithAbroad, 1),
      life: lifeScore,
      salary: salScore,
      fit: fitScore,
      abroadScore,
      costAdjustedIncome: salaryScores[s.id].costAdjustedIncome,
      lifeDetail: life[s.id],
      salaryDetail: salaryScores[s.id],
      fitDetail: fit[s.id],
      ranking: ranking.records[s.id],
      school: s,
      text: buildNarrative(s, { lifeScore, salScore, fitScore }, salaryScores[s.id], ranking.records[s.id], formula, input.prBand, salary.careerSources?.[s.careerSetId]),
    };
  });

  results.sort((a, b) => b.total - a.total);
  return { ratios, ratios4, costIndex, results };
}

/**
 * 建立單一學校之客觀敘述文字。
 * @param {object} s 學校資料
 * @param {object} scores 三維分數
 * @param {object} salaryDetail 薪資引擎輸出
 * @param {object} rank 排名資料
 * @param {object} formula 公式設定
 * @param {string} prBand PR 區間鍵
 * @param {Object<string,object>|undefined} careerSources 該職涯集合之逐職涯薪資來源表
 * @returns {object} 各段落敘述字串／陣列
 */
function buildNarrative(s, scores, salaryDetail, rank, formula, prBand, careerSources) {
  const n = s.narrative;
  const topCareers = salaryDetail.careers.slice(0, 3);
  const topCareerLabels = topCareers.map((c) => `${c.label}（${formatPercent(c.prRatio, 0)}）`).join('、');

  const careerAnalysis =
    `依 PR 區間 ${labelForPR(formula, prBand)} 修正後，主要職涯分布為 ${topCareerLabels}。` +
    `其中最高比例之 ${topCareers[0].label} 平均職涯月薪約 ${formatTWD(topCareers[0].salary.avgCareer)}，` +
    `薪資天花板約 ${formatTWD(topCareers[0].salary.ceiling)}，週工時約 ${topCareers[0].salary.workHours} 小時。`;

  const salaryAnalysis =
    `期望混合月薪（起薪×${formula.salary.graduateWeight} + 職涯平均×${formula.salary.careerAverageWeight}）約 ${formatTWD(salaryDetail.expectedBlended)}，` +
    `除以當地生活成本指數 ${formatScore(salaryDetail.costIndex, 2)} 後，實質購買力相當於台北 ${formatTWD(salaryDetail.costAdjustedIncome)}（可支配物質水平基準）；` +
    `四校標準化後薪資分數為 ${formatScore(scores.salScore)} / 10。`;

  const lifeAnalysis =
    `生活分數 ${formatScore(scores.lifeScore)} / 10，涵蓋生活成就感、校園環境、生活環境與城市四項加權評估。`;

  const fitAnalysis =
    `適配分數 ${formatScore(scores.fitScore)} / 10，依本校採用之特質題目加權標準化並套用固定加減分後得出。`;

  const effortSummary =
    `建議 PR 區間 ${n.effort.recommendedPR}；語言：${n.effort.language}；` +
    `競賽：${n.effort.competition}；研究：${n.effort.research}；實習：${n.effort.internship}；` +
    `證照：${n.effort.certificate}；人脈：${n.effort.network}；交換：${n.effort.exchange}；雙主修：${n.effort.doubleMajor}。`;

  const sources = s.sources
    .map((src) => `${src.name}（${src.type}，${src.year}，可信度：${formatCredibility(src.credibility)}）${src.url}`)
    .join('；');

  // 逐職涯薪資引用：僅列該校有實際分布（比例>0）之職涯，官方／市場調查分別標示。
  const salarySources = careerSources
    ? salaryDetail.careers
        .filter((c) => c.baseRatio > 0 && careerSources[c.id])
        .map((c) => {
          const src = careerSources[c.id];
          return `${c.label}：${src.name}（${src.year}，${src.official ? '官方' : '市場調查'}，可信度：${formatCredibility(src.credibility)}）${src.url}`;
        })
        .join('；')
    : '';

  return {
    salarySources,
    positioning: n.positioning,
    strengths: n.strengths,
    weaknesses: n.weaknesses,
    developmentLimits: n.developmentLimits,
    effortSummary,
    topCareers: topCareerLabels,
    careerAnalysis,
    salaryAnalysis,
    lifeAnalysis,
    fitAnalysis,
    sources,
  };
}

/**
 * 取得 PR 區間之顯示標籤。
 * @param {object} formula 公式設定
 * @param {string} prBand PR 區間鍵
 * @returns {string} 中文標籤
 */
function labelForPR(formula, prBand) {
  const band = formula.salary.prBands.find((b) => b.key === prBand);
  return band ? band.label : prBand;
}
