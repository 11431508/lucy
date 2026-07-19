/**
 * @module components/QuestionCard
 * @description 題目卡片：用於科系適配 10 題之單選選項渲染。
 */

/**
 * 產生單一適配題目 HTML。
 * @param {object} question { id, key, text }
 * @param {Array<{label:string, value:number}>} options 選項（含分值）
 * @param {number|undefined} selectedValue 目前選取分值
 * @returns {string} HTML 字串
 */
export function QuestionCard(question, options, selectedValue) {
  const opts = options
    .map(
      (o) => `
      <label class="opt ${selectedValue === o.value ? 'selected' : ''}">
        <input type="radio" name="fit_${question.key}" value="${o.value}" ${selectedValue === o.value ? 'checked' : ''}>
        <span>${o.label}</span>
      </label>`
    )
    .join('');

  return `
    <div class="question-card" data-animate data-qkey="${question.key}">
      <p class="question-text"><span class="q-id">${question.id.toUpperCase()}</span>${question.text}</p>
      <div class="opt-row">${opts}</div>
    </div>`;
}
