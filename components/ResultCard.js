/**
 * @module components/ResultCard
 * @description 結果詳細卡：固定輸出學校名稱、總分、三維分數、生活／薪資／適配詳細、
 * 優勢、劣勢、發展限制、努力需求、主要就業方向、職涯發展分析、薪資分析、生活分析、資料來源。
 * 不使用星星評價，不含主觀語句。
 */

import { formatScore, formatTWD, formatPercent } from '../utils/Formatter.js';

/**
 * 產生條列清單 HTML。
 * @param {string[]} items 項目
 * @returns {string} HTML
 */
function list(items) {
  return `<ul class="tag-list">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
}

/**
 * 產生生活評分明細表。
 * @param {object} lifeDetail lifeEngine 輸出
 * @returns {string} HTML
 */
function lifeTable(lifeDetail) {
  const rows = lifeDetail.breakdown
    .map((b) => `<tr><td>${b.label}</td><td>${b.rating}</td><td>×${b.weight}</td><td>${b.contribution}</td></tr>`)
    .join('');
  return `<table class="detail-table"><thead><tr><th>項目</th><th>評分</th><th>權重</th><th>加權</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/**
 * 產生薪資職涯明細表（前 6 大職涯）。
 * @param {object} salaryDetail salaryEngine 輸出
 * @returns {string} HTML
 */
function salaryTable(salaryDetail) {
  const rows = salaryDetail.careers
    .slice(0, 6)
    .map(
      (c) => `<tr>
        <td>${c.label}</td>
        <td>${formatPercent(c.baseRatio, 0)}</td>
        <td>${formatPercent(c.prRatio, 0)}</td>
        <td>${formatTWD(c.salary.starting, false)}</td>
        <td>${formatTWD(c.salary.avgCareer, false)}</td>
        <td>${formatTWD(c.salary.ceiling, false)}</td>
        <td>${c.salary.workHours}h</td>
      </tr>`
    )
    .join('');
  return `<table class="detail-table"><thead><tr>
      <th>職涯</th><th>就業比例</th><th>PR修正後</th><th>起薪</th><th>職涯均薪</th><th>天花板</th><th>工時</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

/**
 * 產生適配明細（採用題目與貢獻）。
 * @param {object} fitDetail fitEngine 輸出
 * @returns {string} HTML
 */
function fitInfo(fitDetail) {
  return `<p class="detail-note">${fitDetail.config.note}　標準化基準分 ${formatScore(fitDetail.base10)}，固定加減分 ${fitDetail.adjustment >= 0 ? '+' : ''}${fitDetail.adjustment}，最終 ${formatScore(fitDetail.score)}。</p>`;
}

/**
 * 產生單一學校完整結果卡 HTML。
 * @param {object} r analysisEngine 之單校結果
 * @param {number} rankIndex 排名（0 起）
 * @returns {string} HTML 字串
 */
export function ResultCard(r, rankIndex) {
  const t = r.text;
  return `
    <article class="result-card glass" data-animate>
      <div class="result-head">
        <div>
          <span class="rank-chip">第 ${rankIndex + 1} 名</span>
          <h2>${r.name}</h2>
          <p class="positioning">${t.positioning}</p>
        </div>
        <div class="result-scores">
          <div class="big-total">${formatScore(r.total)}<span>/100</span></div>
          <div class="score-triple">
            <div><b>${formatScore(r.life)}</b><span>生活</span></div>
            <div><b>${formatScore(r.salary)}</b><span>薪資</span></div>
            <div><b>${formatScore(r.fit)}</b><span>適配</span></div>
          </div>
        </div>
      </div>

      <div class="result-grid">
        <div class="result-block">
          <h4>生活分析</h4>
          <p>${t.lifeAnalysis}</p>
          ${lifeTable(r.lifeDetail)}
        </div>

        <div class="result-block">
          <h4>薪資分析</h4>
          <p>${t.salaryAnalysis}</p>
          ${salaryTable(r.salaryDetail)}
        </div>

        <div class="result-block wide">
          <h4>職涯發展分析</h4>
          <p>主要就業方向：${t.topCareers}</p>
          <p>${t.careerAnalysis}</p>
        </div>

        <div class="result-block">
          <h4>適配分析</h4>
          <p>${t.fitAnalysis}</p>
          ${fitInfo(r.fitDetail)}
        </div>

        <div class="result-block">
          <h4>優勢</h4>
          ${list(t.strengths)}
          <h4>劣勢</h4>
          ${list(t.weaknesses)}
        </div>

        <div class="result-block">
          <h4>發展限制</h4>
          ${list(t.developmentLimits)}
        </div>

        <div class="result-block wide">
          <h4>努力需求</h4>
          <p>${t.effortSummary}</p>
        </div>

        <div class="result-block wide">
          <h4>資料來源</h4>
          <p class="sources">${t.sources}</p>
          ${t.salarySources ? `<h4>薪資逐筆引用</h4><p class="sources">${t.salarySources}</p>` : ''}
        </div>
      </div>
    </article>`;
}
