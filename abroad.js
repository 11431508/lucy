/**
 * @module abroad
 * @description 升學評分頁控制器（獨立於四校分析）。載入 data/abroad.json，
 * 以 abroadEngine 計算加權總分，渲染觀念說明、政策快照、路徑比較卡、圖表與客觀結論。
 */

import { computeAbroad, computeSchoolAbroad } from './modules/abroadEngine.js';
import * as Charts from './utils/Chart.js';
import { revealChildren } from './utils/Animation.js';
import { formatCredibility } from './utils/Formatter.js';

const appEl = document.getElementById('app');

/**
 * 載入 abroad.json。
 * @returns {Promise<object>} 解析後資料
 */
async function loadData() {
  const [abroadRes, schoolRes] = await Promise.all([
    fetch('data/abroad.json', { cache: 'no-store' }),
    fetch('data/school.json', { cache: 'no-store' }),
  ]);
  if (!abroadRes.ok) throw new Error(`載入 data/abroad.json 失敗（HTTP ${abroadRes.status}）`);
  if (!schoolRes.ok) throw new Error(`載入 data/school.json 失敗（HTTP ${schoolRes.status}）`);
  return { abroad: await abroadRes.json(), school: await schoolRes.json() };
}

/**
 * 產生單一路徑之詳細卡片 HTML。
 * @param {object} r 引擎輸出之單一路徑結果
 * @param {Array<object>} dims 維度設定
 * @param {number} rankIndex 排名（0 起）
 * @returns {string} HTML
 */
function pathCard(r, dims, rankIndex) {
  const p = r.path;
  const rows = dims
    .map(
      (d) => `<tr>
        <td>${d.label}<span class="hint">（權重 ${d.weight}）</span></td>
        <td class="score-cell">${p.scores[d.key]}</td>
        <td class="rationale">${p.rationale[d.key]}</td>
      </tr>`
    )
    .join('');

  return `
    <article class="result-card glass" data-animate>
      <div class="result-head">
        <div>
          <span class="rank-chip">第 ${rankIndex + 1} 名</span>
          <h2>${p.name}</h2>
          <p class="positioning">總時程約 ${p.totalYears} 年｜估計總成本約 NT$ ${(p.estCostTWD / 10000).toLocaleString('zh-Hant-TW')} 萬</p>
          <p class="detail-note">${p.costBreakdown}</p>
        </div>
        <div class="result-scores">
          <div class="big-total">${r.total.toFixed(1)}<span>/100</span></div>
        </div>
      </div>
      <div class="table-scroll">
        <table class="detail-table abroad-table">
          <thead><tr><th>維度</th><th>分數</th><th>依據</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>`;
}

/**
 * 渲染整頁。
 * @param {object} data abroad.json 內容
 * @returns {void}
 */
function render({ abroad: data, school }) {
  const results = computeAbroad(data);
  const dims = data.dimensions;
  const schoolAbroad = computeSchoolAbroad(data, school);
  const appF = data.schoolAbroad.applicationFactors;
  const devF = data.schoolAbroad.developmentFactors;

  const m = data.schoolAbroad.scoreModel;
  const saRows = schoolAbroad
    .map(
      (r) => `<tr>
        <td>${r.name}</td>
        <td class="score-cell" style="color:var(--accent-3)">${r.topSchoolRate}%</td>
        <td class="score-cell">${r.normRate}</td>
        <td class="score-cell">${r.developmentValue}</td>
        <td class="score-cell" style="color:var(--accent-2)">${r.expectedValue}</td>
        <td>${r.targetDegree}</td>
      </tr>`
    )
    .join('');

  // 各校八因子拆解卡（申請 4 因子＋發展 4 因子，每項分數＋依據），並附來源。
  const factorRow = (f, score, why) =>
    `<tr><td>${f.label}</td><td class="score-cell">${score}</td><td class="rationale">${why}</td></tr>`;
  const saBreakdown = schoolAbroad
    .map((r) => {
      const appRows = appF.map((f) => factorRow(f, r.application[f.key], r.rationale[f.key])).join('');
      const devRows = devF.map((f) => factorRow(f, r.development[f.key], r.rationale[f.key])).join('');
      const srcs = r.sources
        .map((s) => `${s.name}（${s.year}，${s.official ? '官方' : '調查'}，可信度：${formatCredibility(s.credibility)}）${s.url}`)
        .join('；');
      return `
        <article class="result-card glass" data-animate>
          <div class="result-head">
            <div>
              <h2>${r.name}</h2>
              <p class="positioning">目標學位：${r.targetDegree}｜建議路徑：${r.recommendedPath}</p>
            </div>
            <div class="result-scores">
              <div class="big-total">${r.expectedValue}<span>/10 升學分數</span></div>
              <div class="score-triple">
                <div><b>${r.topSchoolRate}%</b><span>頂級升學率</span></div>
                <div><b>${r.developmentValue}</b><span>發展</span></div>
                <div><b>${r.applicationScore}</b><span>申請(輔)</span></div>
              </div>
            </div>
          </div>
          <p class="detail-note">升學分數 = ${m.topSchoolWeight}×標準化頂級升學率(${r.topSchoolRate}%→${r.normRate}) + ${m.developmentWeight}×發展(${r.developmentValue}) = ${r.expectedValue}。頂級升學率佔主要。</p>
          <p class="detail-note" style="color:var(--accent-3)">頂級升學率依據：${r.topSchoolNote}</p>
          <div class="table-scroll">
            <table class="detail-table abroad-table">
              <thead><tr><th>申請因子（4）</th><th>分數</th><th>依據</th></tr></thead>
              <tbody>${appRows}</tbody>
              <thead><tr><th>發展因子（4）</th><th>分數</th><th>依據</th></tr></thead>
              <tbody>${devRows}</tbody>
            </table>
          </div>
          <div class="result-block"><h4>資料來源</h4><p class="sources">${srcs}</p></div>
        </article>`;
    })
    .join('');

  const policyUS = data.policySnapshot.us.map((t) => `<li>${t}</li>`).join('');
  const policyUK = data.policySnapshot.uk.map((t) => `<li>${t}</li>`).join('');
  const verdictPts = data.verdict.points.map((t) => `<li>${t}</li>`).join('');
  const sources = data.sources
    .map((s) => `${s.name}（${s.year}，${s.official ? '官方' : '調查／報導'}，可信度：${formatCredibility(s.credibility)}）${s.url}`)
    .join('；');

  appEl.innerHTML = `
    <header class="app-header glass">
      <div class="brand">
        <div class="brand-mark">◆</div>
        <div>
          <h1>升學評分：美國 JD・英國 LLB・台灣＋LLM</h1>
          <p class="brand-sub">獨立模組｜台灣地區身分申請人｜政策現況 ${data.policySnapshot.asOf}</p>
        </div>
      </div>
      <nav class="stepper"><a class="btn btn-ghost" href="index.html">← 回四校分析</a></nav>
    </header>

    <main class="content">
      <div class="disclaimer-banner glass" data-animate>
        ⚠ <strong>資料準確性聲明：</strong>各校「頂級升學率」（進入 T14/M7 之比例）及薪資、政策數字<strong>多為估計值，來源不保證準確</strong>——各校並未公布此類比例，本頁數字係依官方就業報告、升學傳統與公開資訊<strong>推估</strong>（credibility 多標為 low–medium）。請勿當作官方事實，重大決定前務必自行查證最新規定。
      </div>
      <section class="step-card glass" data-animate>
        <div class="step-card-head">
          <span class="step-badge">觀念修正</span>
          <h2>LLB／JD／LLM 是什麼？</h2>
          <p class="step-sub">${data.conceptNote}</p>
          <p class="detail-note">${data.usTop10Note}</p>
        </div>
      </section>

      <section class="step-card glass" data-animate>
        <div class="step-card-head">
          <span class="step-badge">政策快照 ${data.policySnapshot.asOf}</span>
          <h2>美國與英國現況</h2>
        </div>
        <div class="result-grid">
          <div class="result-block"><h4>美國</h4><ul class="note-list">${policyUS}</ul></div>
          <div class="result-block"><h4>英國</h4><ul class="note-list">${policyUK}</ul></div>
        </div>
      </section>

      <section class="step-card glass" data-animate>
        <div class="step-card-head">
          <span class="step-badge">評分結果</span>
          <h2>三路徑加權總分</h2>
          <p class="step-sub">維度權重：${dims.map((d) => `${d.label} ${d.weight}`).join('｜')}（可於 data/abroad.json 調整）</p>
        </div>
        <div class="chart-grid">
          <div class="chart-card glass"><div class="chart-card-head"><h3>總分比較</h3>
            <button class="btn btn-mini" data-download-chart="abTotal">下載 PNG</button></div>
            <div class="chart-wrap" style="height:300px"><canvas id="abTotal"></canvas></div></div>
          <div class="chart-card glass"><div class="chart-card-head"><h3>八維度雷達</h3>
            <button class="btn btn-mini" data-download-chart="abRadar">下載 PNG</button></div>
            <div class="chart-wrap" style="height:300px"><canvas id="abRadar"></canvas></div></div>
        </div>
        <div class="result-cards">
          ${results.map((r, i) => pathCard(r, dims, i)).join('')}
        </div>
      </section>

      <section class="step-card glass" data-animate>
        <div class="step-card-head">
          <span class="step-badge">四校留學跳板</span>
          <h2>四所學校的留學評分（申請）與期望值（發展）</h2>
          <p class="step-sub">假設學士於 ${data.schoolAbroad.graduateYear} 年 5–6 月畢業，出國決策點為學士後。升學分數＝${m.topSchoolWeight}×標準化(頂級升學率)＋${m.developmentWeight}×發展價值，頂級升學率佔主要。不打算升學者可於主頁權重步驟將『升學』設 0。</p>
        </div>
        <div class="table-scroll">
          <table class="detail-table abroad-table">
            <thead><tr><th>學校</th><th>頂級升學率</th><th>標準化(0–10)</th><th>發展價值</th><th>升學分數</th><th>目標學位</th></tr></thead>
            <tbody>${saRows}</tbody>
          </table>
        </div>
        <p class="detail-note">頂級升學率＝進入 T14/M7 等頂級海外學校之估計比例（主要成分，每 ${m.ratePerPoint}%＝1 分、上限 ${m.rateCap}）；發展價值＝4 因子平均（次要）。各因子分數、依據與來源見下方逐校拆解。</p>
        <div class="result-cards" style="margin-top:16px">${saBreakdown}</div>
      </section>

      <section class="step-card glass" data-animate>
        <div class="step-card-head">
          <span class="step-badge">結論</span>
          <h2>${data.verdict.title}</h2>
        </div>
        <ul class="note-list">${verdictPts}</ul>
      </section>

      <section class="step-card glass" data-animate>
        <div class="step-card-head"><span class="step-badge">資料來源</span><h2>引用</h2></div>
        <p class="sources">${sources}</p>
      </section>
    </main>

    <footer class="app-footer">
      <p class="disclaimer-strong">⚠ 資料準確性聲明：頂級升學率、薪資與政策數字<strong>多為估計值，來源不保證準確</strong>，僅供決策參考；政策具時效性，重大決定前請自行查證最新官方規定。</p>
      <p>資料版本 ${data.version}（${data.updatedAt}）。</p>
    </footer>`;

  bindEvents();
  Charts.ready().then(() => drawCharts(results, dims));
  revealChildren(appEl);
}

/**
 * 繪製總分長條圖與八維度雷達圖。
 * @param {Array<object>} results 引擎輸出
 * @param {Array<object>} dims 維度設定
 * @returns {void}
 */
function drawCharts(results, dims) {
  Charts.barChart('abTotal', results.map((r) => r.shortName), results.map((r) => r.total), '總分');
  Charts.radarChart(
    'abRadar',
    dims.map((d) => d.label),
    results.map((r) => ({ label: r.shortName, data: dims.map((d) => r.scores[d.key]) }))
  );
}

/** 綁定圖表下載等事件。 @returns {void} */
function bindEvents() {
  appEl.querySelectorAll('[data-download-chart]').forEach((b) =>
    b.addEventListener('click', () => Charts.downloadPNG(b.dataset.downloadChart, b.dataset.downloadChart))
  );
}

/** 啟動。 @returns {Promise<void>} */
async function boot() {
  try {
    const data = await loadData();
    render(data);
  } catch (e) {
    appEl.innerHTML = `<div class="fatal glass"><h2>資料載入失敗</h2><p>${e.message}</p>
      <p>請經本機伺服器或網站網址開啟（不可直接雙擊檔案）。</p></div>`;
  }
}

boot();
