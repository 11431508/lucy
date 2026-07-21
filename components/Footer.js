/**
 * @module components/Footer
 * @description 頁尾元件：資料版本與免責說明。
 */

/**
 * 產生頁尾 HTML。
 * @param {string} version 資料版本
 * @returns {string} HTML 字串
 */
export function Footer(version) {
  return `
    <footer class="app-footer">
      <p class="disclaimer-strong">⚠ 資料準確性聲明：本平台之薪資、就業分布、排名、升學比例等數字<strong>多為估計值，來源不保證準確</strong>，係多來源交叉推估之參考值（各筆附來源、年份與可信度等級）。實際數字請以各校與政府之最新官方資料為準。</p>
      <p>資料版本 ${version}。</p>
      <p class="muted">本平台為決策分析工具，非投資或生涯之個人化建議。</p>
    </footer>`;
}
