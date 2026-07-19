/**
 * @module components/Header
 * @description 頁首元件：品牌標題與步驟進度指示。
 */

/**
 * 產生頁首 HTML。
 * @param {number} currentStep 目前步驟（1..5）
 * @param {string[]} stepLabels 步驟名稱陣列
 * @returns {string} HTML 字串
 */
export function Header(currentStep, stepLabels) {
  const dots = stepLabels
    .map((label, i) => {
      const n = i + 1;
      const state = n < currentStep ? 'done' : n === currentStep ? 'active' : 'todo';
      return `<div class="step-dot ${state}"><span class="num">${n}</span><span class="lbl">${label}</span></div>`;
    })
    .join('<div class="step-line"></div>');

  return `
    <header class="app-header glass">
      <div class="brand">
        <div class="brand-mark">◆</div>
        <div>
          <h1>大學與科系決策分析平台</h1>
          <p class="brand-sub">University &amp; Major Decision Analysis</p>
        </div>
      </div>
      <nav class="stepper">${dots}</nav>
    </header>`;
}
