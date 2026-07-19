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
      <p>資料版本 ${version}｜薪資與排名為多來源交叉估算之參考值，並附來源、年份與可信度等級，實際情況請以官方最新資料為準。</p>
      <p class="muted">本平台為決策分析工具，非投資或生涯之個人化建議。</p>
    </footer>`;
}
