/**
 * @module components/StepCard
 * @description 步驟卡片容器：標題、說明與內容插槽，含上一步／下一步導覽。
 */

/**
 * 產生步驟卡片外框 HTML。
 * @param {object} opts
 * @param {number} opts.step 步驟編號
 * @param {string} opts.title 標題
 * @param {string} opts.subtitle 副標／說明
 * @param {string} opts.body 內容 HTML
 * @param {boolean} [opts.showPrev=true] 顯示上一步
 * @param {string} [opts.nextLabel='下一步'] 下一步按鈕文字
 * @returns {string} HTML 字串
 */
export function StepCard({ step, title, subtitle, body, showPrev = true, nextLabel = '下一步' }) {
  return `
    <section class="step-card glass" data-animate>
      <div class="step-card-head">
        <span class="step-badge">STEP ${step}</span>
        <h2>${title}</h2>
        <p class="step-sub">${subtitle}</p>
      </div>
      <div class="step-card-body">${body}</div>
      <div class="step-card-nav">
        ${showPrev ? '<button class="btn btn-ghost" data-action="prev">上一步</button>' : '<span></span>'}
        <button class="btn btn-primary" data-action="next">${nextLabel}</button>
      </div>
    </section>`;
}
