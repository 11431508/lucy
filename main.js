/**
 * @module main
 * @description 應用主控制器：載入資料、管理精靈步驟狀態、渲染各步驟、綁定事件、
 * 繪製圖表並匯出 PDF。所有計算委由 modules/ 之引擎；本檔僅負責流程與畫面。
 */

import { loadAllData } from './modules/dataLoader.js';
import { runAnalysis } from './modules/analysisEngine.js';
import { getWeightFields, computeRatios, toPieData } from './modules/weightEngine.js';
import { getLifeItems } from './modules/lifeEngine.js';
import { getFitQuestionnaire } from './modules/fitEngine.js';

import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { StepCard } from './components/StepCard.js';
import { QuestionCard } from './components/QuestionCard.js';
import { ChartCard } from './components/ChartCard.js';
import { ResultCard } from './components/ResultCard.js';
import { SchoolCard } from './components/SchoolCard.js';

import * as Charts from './utils/Chart.js';
import { exportNodeToPDF } from './utils/PDF.js';
import { loadState, saveStateDebounced } from './utils/Storage.js';
import { crossFade, revealChildren } from './utils/Animation.js';
import { formatScore, formatPercent } from './utils/Formatter.js';

const STEP_LABELS = ['權重設定', '生活評估', '薪資分析', '科系適配', '分析結果'];

/** @type {object} 全域資料庫（唯讀） */
let db = null;
/** @type {object} 應用狀態 */
let state = null;
/** @type {object|null} 最近一次分析結果 */
let lastAnalysis = null;
const appEl = document.getElementById('app');

/**
 * 建立初始狀態（含 formula 預設值）。
 * @returns {object} 初始狀態
 */
function createInitialState() {
  const w = db.formula.weights;
  const firstPR = db.formula.salary.prBands[0].key;
  const lifeRatings = {};
  for (const s of db.school.schools) {
    lifeRatings[s.id] = {};
    for (const it of db.formula.life.items) lifeRatings[s.id][it.key] = it.min;
  }
  return {
    step: 1,
    weights: { life: w.life.default, salary: w.salary.default, fit: w.fit.default },
    lifeRatings,
    prBand: firstPR,
    fitAnswers: {},
  };
}

/** 持久化狀態（防抖）。 @returns {void} */
function persist() {
  saveStateDebounced(state);
}

/**
 * 應用啟動：載入資料、還原狀態、首次渲染。
 * @returns {Promise<void>}
 */
async function boot() {
  try {
    db = await loadAllData();
  } catch (e) {
    renderFatal(e);
    return;
  }
  const saved = loadState();
  state = saved && saved.weights ? saved : createInitialState();
  render();
}

/**
 * 顯示致命錯誤（多為以 file:// 開啟導致 fetch 失敗）。
 * @param {Error} e 錯誤
 * @returns {void}
 */
function renderFatal(e) {
  appEl.innerHTML = `
    <div class="fatal glass">
      <h2>資料載入失敗</h2>
      <p>${e.message}</p>
      <p>此平台以 ES6 Modules 與 fetch 載入 JSON 資料庫，需透過本機伺服器開啟，不能直接以 file:// 雙擊 index.html。</p>
      <pre># 於專案資料夾執行其一：
python -m http.server 8000
# 或
npx serve .

# 再以瀏覽器開啟 http://localhost:8000</pre>
    </div>`;
}

/**
 * 依目前步驟渲染整體畫面。
 * @returns {void}
 */
function render() {
  const body = renderStepBody(state.step);
  appEl.innerHTML = Header(state.step, STEP_LABELS) + `<main class="content">${body}</main>` + Footer(db.formula.version);
  bindEvents();
  postRender();
  revealChildren(appEl);
}

/**
 * 產生指定步驟之內容 HTML。
 * @param {number} step 步驟
 * @returns {string} HTML
 */
function renderStepBody(step) {
  switch (step) {
    case 1: return renderStep1();
    case 2: return renderStep2();
    case 3: return renderStep3();
    case 4: return renderStep4();
    case 5: return renderStep5();
    default: return '';
  }
}

/* ---------------- Step 1：權重設定 ---------------- */

/** @returns {string} HTML */
function renderStep1() {
  const fields = getWeightFields(db.formula);
  const sliders = fields
    .map(
      (f) => `
      <div class="slider-row">
        <label>${f.label}<span class="hint">（${f.min}–${f.max}）</span></label>
        <input type="range" min="${f.min}" max="${f.max}" step="1" value="${state.weights[f.key]}" data-weight="${f.key}">
        <output data-weight-out="${f.key}">${state.weights[f.key]}</output>
      </div>`
    )
    .join('');

  const body = `
    <div class="two-col">
      <div>
        <p class="lead">自行輸入三項權重，系統將自動正規化為比例。</p>
        ${sliders}
        <div class="ratio-badges" id="ratioBadges"></div>
      </div>
      ${ChartCard({ canvasId: 'weightPie', title: '權重比例', height: '280px' })}
    </div>`;

  return StepCard({ step: 1, title: '權重設定', subtitle: '設定生活、薪資、科系適配的相對重要性', body, showPrev: false });
}

/** 更新 step1 之比例徽章與圓餅圖。 @returns {void} */
function updateWeightViz() {
  const ratios = computeRatios(state.weights);
  const badges = document.getElementById('ratioBadges');
  if (badges) {
    badges.innerHTML = `
      <span>生活 ${formatPercent(ratios.life)}</span>
      <span>薪資 ${formatPercent(ratios.salary)}</span>
      <span>適配 ${formatPercent(ratios.fit)}</span>`;
  }
  const pie = toPieData(db.formula, ratios);
  Charts.pieChart('weightPie', pie.labels, pie.data);
}

/* ---------------- Step 2：生活評估 ---------------- */

/** @returns {string} HTML */
function renderStep2() {
  const items = getLifeItems(db.formula);
  const schools = db.school.schools
    .map((s) => {
      const sliders = items
        .map(
          (it) => `
        <div class="slider-row compact">
          <label>${it.label}<span class="hint">×${it.weight}</span></label>
          <input type="range" min="${it.min}" max="${it.max}" step="1"
                 value="${state.lifeRatings[s.id][it.key]}" data-life-school="${s.id}" data-life-item="${it.key}">
          <output data-life-out="${s.id}-${it.key}">${state.lifeRatings[s.id][it.key]}</output>
        </div>`
        )
        .join('');
      return `
        <div class="life-school glass" data-animate>
          <h3>${s.name}</h3>
          ${sliders}
          <div class="life-score-live">生活分數：<b data-life-score="${s.id}">—</b> / 10</div>
        </div>`;
    })
    .join('');

  const body = `<p class="lead">四所學校皆需評分，每項 1–10。生活分數 =(成就感×3 + 校園×3 + 生活×3 + 城市×1) / 10。</p>
    <div class="life-grid">${schools}</div>`;
  return StepCard({ step: 2, title: '生活評估', subtitle: '為每所學校的生活面向評分', body });
}

/** 更新 step2 即時生活分數。 @returns {void} */
function updateLifeScores() {
  const div = db.formula.life.divisor;
  for (const s of db.school.schools) {
    const r = state.lifeRatings[s.id];
    let sum = 0;
    for (const it of db.formula.life.items) sum += (r[it.key] || 0) * it.weight;
    const el = document.querySelector(`[data-life-score="${s.id}"]`);
    if (el) el.textContent = formatScore(sum / div);
  }
}

/* ---------------- Step 3：薪資分析（PR） ---------------- */

/** @returns {string} HTML */
function renderStep3() {
  const bands = db.formula.salary.prBands
    .map(
      (b) => `
      <label class="pr-option ${state.prBand === b.key ? 'selected' : ''}">
        <input type="radio" name="prBand" value="${b.key}" ${state.prBand === b.key ? 'checked' : ''}>
        <div><b>${b.label}</b><span>${b.description}</span></div>
      </label>`
    )
    .join('');

  const body = `
    <p class="lead">你認為自己的努力程度在人群中的 PR？PR 不直接增加薪資，而是改變各職涯的分布機率。</p>
    <div class="pr-options">${bands}</div>
    <p class="detail-note">薪資公式：（起薪×0.2 + 職涯平均薪資×0.8）→ 換算台幣 → 每一萬元 = 1 分 → 除以生活成本指數，四校最高標準化為 10 分。</p>`;
  return StepCard({ step: 3, title: '薪資分析', subtitle: '以努力程度 PR 調整職涯分布', body });
}

/* ---------------- Step 4：科系適配 ---------------- */

/** @returns {string} HTML */
function renderStep4() {
  const { questions, options } = getFitQuestionnaire(db.formula, db.personality);
  const cards = questions.map((q) => QuestionCard(q, options, state.fitAnswers[q.key])).join('');
  const body = `<p class="lead">共 10 題，每題單選。作答將依各校採用之特質題目計算適配分數。</p>
    <div class="question-list">${cards}</div>`;
  return StepCard({ step: 4, title: '科系適配', subtitle: '評估個人特質與各科系的契合度', body, nextLabel: '產生分析結果' });
}

/* ---------------- Step 5：結果 ---------------- */

/** @returns {string} HTML */
function renderStep5() {
  lastAnalysis = runAnalysis(db, {
    weights: state.weights,
    lifeRatings: state.lifeRatings,
    prBand: state.prBand,
    fitAnswers: state.fitAnswers,
  });
  const { ratios, results } = lastAnalysis;

  const summary = results.map((r, i) => SchoolCard(r, i)).join('');
  const charts = `
    <div class="chart-grid">
      ${ChartCard({ canvasId: 'chTotal', title: '總分比較' })}
      ${ChartCard({ canvasId: 'chRadar', title: '三維雷達圖' })}
      ${ChartCard({ canvasId: 'chDims', title: '生活／薪資／適配比較' })}
      ${ChartCard({ canvasId: 'chPie', title: '權重比例' })}
    </div>`;
  const cards = results.map((r, i) => ResultCard(r, i)).join('');

  const body = `
    <div class="result-toolbar">
      <p class="lead">依總分由高至低排列。權重比例：生活 ${formatPercent(ratios.life, 0)}｜薪資 ${formatPercent(ratios.salary, 0)}｜適配 ${formatPercent(ratios.fit, 0)}。</p>
      <div class="toolbar-actions">
        <button class="btn btn-ghost" data-action="prev">上一步</button>
        <button class="btn btn-primary" id="btnPDF">下載 PDF 報告</button>
      </div>
    </div>
    <div id="resultRoot">
      <div class="summary-row">${summary}</div>
      ${charts}
      <div class="result-cards">${cards}</div>
    </div>`;

  return `<section class="step-card glass" data-animate>
      <div class="step-card-head"><span class="step-badge">STEP 5</span><h2>分析結果</h2>
      <p class="step-sub">綜合生活、薪資、科系適配之總分與詳細分析</p></div>
      <div class="step-card-body">${body}</div>
    </section>`;
}

/**
 * 渲染後掛鉤：初始化各步驟之圖表與即時數值。
 * @returns {void}
 */
function postRender() {
  if (state.step === 1) Charts.ready().then(() => { if (state.step === 1) updateWeightViz(); });
  if (state.step === 2) updateLifeScores();
  if (state.step === 5) Charts.ready().then(() => { if (state.step === 5) initResultCharts(); });
}

/**
 * 繪製結果頁四張圖表。
 * @returns {void}
 */
function initResultCharts() {
  const { results, ratios } = lastAnalysis;
  const labels = results.map((r) => r.shortName);
  Charts.barChart('chTotal', labels, results.map((r) => r.total), '總分');
  Charts.radarChart('chRadar', ['生活', '薪資', '適配'], results.map((r) => ({ label: r.shortName, data: [r.life, r.salary, r.fit] })));
  Charts.groupedBar('chDims', labels, [
    { label: '生活', data: results.map((r) => r.life) },
    { label: '薪資', data: results.map((r) => r.salary) },
    { label: '適配', data: results.map((r) => r.fit) },
  ]);
  const pie = toPieData(db.formula, ratios);
  Charts.pieChart('chPie', pie.labels, pie.data);
}

/* ---------------- 事件綁定 ---------------- */

/**
 * 綁定目前畫面之互動事件（事件委派）。
 * @returns {void}
 */
function bindEvents() {
  // 導覽
  appEl.querySelectorAll('[data-action="next"]').forEach((b) => b.addEventListener('click', goNext));
  appEl.querySelectorAll('[data-action="prev"]').forEach((b) => b.addEventListener('click', goPrev));

  // Step1 權重
  appEl.querySelectorAll('[data-weight]').forEach((el) =>
    el.addEventListener('input', (e) => {
      const key = e.target.dataset.weight;
      state.weights[key] = Number(e.target.value);
      const out = appEl.querySelector(`[data-weight-out="${key}"]`);
      if (out) out.textContent = e.target.value;
      updateWeightViz();
      persist();
    })
  );

  // Step2 生活評分
  appEl.querySelectorAll('[data-life-school]').forEach((el) =>
    el.addEventListener('input', (e) => {
      const sid = e.target.dataset.lifeSchool;
      const item = e.target.dataset.lifeItem;
      state.lifeRatings[sid][item] = Number(e.target.value);
      const out = appEl.querySelector(`[data-life-out="${sid}-${item}"]`);
      if (out) out.textContent = e.target.value;
      updateLifeScores();
      persist();
    })
  );

  // Step3 PR
  appEl.querySelectorAll('input[name="prBand"]').forEach((el) =>
    el.addEventListener('change', (e) => {
      state.prBand = e.target.value;
      appEl.querySelectorAll('.pr-option').forEach((o) => o.classList.remove('selected'));
      e.target.closest('.pr-option').classList.add('selected');
      persist();
    })
  );

  // Step4 適配
  appEl.querySelectorAll('.question-card input[type="radio"]').forEach((el) =>
    el.addEventListener('change', (e) => {
      const key = e.target.closest('.question-card').dataset.qkey;
      state.fitAnswers[key] = Number(e.target.value);
      const card = e.target.closest('.question-card');
      card.querySelectorAll('.opt').forEach((o) => o.classList.remove('selected'));
      e.target.closest('.opt').classList.add('selected');
      persist();
    })
  );

  // 圖表 PNG 下載
  appEl.querySelectorAll('[data-download-chart]').forEach((b) =>
    b.addEventListener('click', () => Charts.downloadPNG(b.dataset.downloadChart, b.dataset.downloadChart))
  );

  // PDF
  const pdf = document.getElementById('btnPDF');
  if (pdf) pdf.addEventListener('click', onExportPDF);
}

/**
 * 前往下一步（含 Step4 完整性檢查）。
 * @returns {void}
 */
function goNext() {
  if (state.step === 4) {
    const answered = Object.keys(state.fitAnswers).length;
    if (answered < db.personality.questions.length) {
      if (!confirm(`尚有 ${db.personality.questions.length - answered} 題未作答，未作答題目將以「無感」計。是否繼續？`)) return;
    }
  }
  if (state.step < 5) {
    state.step += 1;
    persist();
    transitionRender();
  }
}

/** 前往上一步。 @returns {void} */
function goPrev() {
  if (state.step > 1) {
    state.step -= 1;
    persist();
    transitionRender();
  }
}

/** 以淡入淡出切換重繪。 @returns {void} */
function transitionRender() {
  const content = appEl.querySelector('.content') || appEl;
  crossFade(content, () => render(), 150);
}

/**
 * 匯出結果頁為 PDF。
 * @returns {Promise<void>}
 */
async function onExportPDF() {
  const btn = document.getElementById('btnPDF');
  const root = document.getElementById('resultRoot');
  if (!root) return;
  const prev = btn.textContent;
  btn.textContent = '產生 PDF 中…';
  btn.disabled = true;
  try {
    await exportNodeToPDF(root);
  } finally {
    btn.textContent = prev;
    btn.disabled = false;
  }
}

boot();
