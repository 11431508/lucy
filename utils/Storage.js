/**
 * @module utils/Storage
 * @description LocalStorage 封裝，含防抖（debounce）寫入，避免高頻互動造成過度寫入。
 */

const STORAGE_KEY = 'udp_state_v1';
const DEBOUNCE_MS = 300;

let debounceTimer = null;

/**
 * 立即讀取已儲存的應用狀態。
 * @returns {Object|null} 解析後的狀態物件，若無或解析失敗回傳 null
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('[Storage] 讀取狀態失敗：', e);
    return null;
  }
}

/**
 * 以防抖方式寫入應用狀態（連續呼叫僅最後一次於 DEBOUNCE_MS 後生效）。
 * @param {Object} state 欲儲存的狀態物件
 * @returns {void}
 */
export function saveStateDebounced(state) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[Storage] 寫入狀態失敗：', e);
    }
  }, DEBOUNCE_MS);
}

/**
 * 清除已儲存狀態。
 * @returns {void}
 */
export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[Storage] 清除狀態失敗：', e);
  }
}
