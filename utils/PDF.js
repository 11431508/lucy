/**
 * @module utils/PDF
 * @description A4 PDF 匯出。以 html2canvas 擷取結果頁 DOM（可正確呈現中文），
 * 再由 jsPDF 依 A4 尺寸自動分頁貼上。首頁、所有分數、圖表、分析、優劣勢、限制、努力需求、
 * 資料來源皆包含於結果頁內，故一次擷取即完整輸出。
 * 依賴全域 window.jspdf 與 window.html2canvas（由 index.html 載入）。
 */

const A4 = { w: 210, h: 297 };

/**
 * 將指定 DOM 節點匯出為多頁 A4 PDF。
 * @param {HTMLElement} node 欲匯出的容器（通常為結果頁根節點）
 * @param {string} [filename='大學科系決策分析報告.pdf'] 檔名
 * @returns {Promise<void>} 完成的 Promise
 */
export async function exportNodeToPDF(node, filename = '大學科系決策分析報告.pdf') {
  if (!window.jspdf || !window.html2canvas) {
    alert('PDF 元件尚未載入，請確認網路連線後重試。');
    return;
  }
  const { jsPDF } = window.jspdf;

  // 以較高倍率擷取以確保清晰度；背景填深色以符合介面。
  const canvas = await window.html2canvas(node, {
    scale: 2,
    backgroundColor: '#0b0f1e',
    useCORS: true,
    windowWidth: node.scrollWidth,
  });

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const imgW = A4.w;
  const pxPerMm = canvas.width / imgW;
  const pageHpx = A4.h * pxPerMm; // 每頁對應之來源像素高度

  let renderedHpx = 0;
  let page = 0;

  while (renderedHpx < canvas.height) {
    const sliceHpx = Math.min(pageHpx, canvas.height - renderedHpx);

    // 將該頁切片畫到暫存 canvas 再轉為影像。
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHpx;
    const ctx = pageCanvas.getContext('2d');
    ctx.fillStyle = '#0b0f1e';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, renderedHpx, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);

    const imgData = pageCanvas.toDataURL('image/png');
    const sliceHmm = sliceHpx / pxPerMm;
    if (page > 0) doc.addPage();
    doc.addImage(imgData, 'PNG', 0, 0, imgW, sliceHmm, undefined, 'FAST');

    renderedHpx += sliceHpx;
    page += 1;
  }

  doc.save(filename);
}
