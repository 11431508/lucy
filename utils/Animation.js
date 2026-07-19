/**
 * @module utils/Animation
 * @description 畫面切換與進場動畫工具，並提供圖片 Lazy Load 觀察器。
 */

/**
 * 淡出後切換內容再淡入。
 * @param {HTMLElement} el 目標容器
 * @param {Function} updateFn 於淡出後執行的內容更新函式
 * @param {number} [duration=180] 單向動畫毫秒數
 * @returns {Promise<void>} 動畫完成的 Promise
 */
export function crossFade(el, updateFn, duration = 180) {
  return new Promise((resolve) => {
    el.style.transition = `opacity ${duration}ms ease`;
    el.style.opacity = '0';
    setTimeout(() => {
      updateFn();
      el.style.opacity = '1';
      setTimeout(resolve, duration);
    }, duration);
  });
}

/**
 * 為容器內具 [data-animate] 之子元素加上進場動畫（依序淡入上移）。
 * @param {HTMLElement} container 父容器
 * @returns {void}
 */
export function revealChildren(container) {
  const items = container.querySelectorAll('[data-animate]');
  items.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    el.style.transition = 'opacity 320ms ease, transform 320ms ease';
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 60 * i);
  });
}

/**
 * 啟用圖片 Lazy Load：將 [data-src] 於進入視窗時載入至 src。
 * @param {ParentNode} [root=document] 搜尋根節點
 * @returns {void}
 */
export function enableLazyImages(root = document) {
  const imgs = root.querySelectorAll('img[data-src]');
  if (!('IntersectionObserver' in window)) {
    imgs.forEach((img) => { img.src = img.dataset.src; });
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '100px' });
  imgs.forEach((img) => io.observe(img));
}
