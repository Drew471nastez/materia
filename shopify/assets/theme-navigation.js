/* Warm only the two real product-neighbour pages, once the DOM is ready.
   Native navigation retains form behaviour, history and the browser's cache. */
(() => {
  if (window.__materiaNavigation) return;
  window.__materiaNavigation = true;
  const connection = navigator.connection;
  if (connection?.saveData || /2g/.test(connection?.effectiveType || '')) return;
  const warmed = new Set();
  const warm = anchor => {
    if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.hasAttribute('data-no-prefetch') || anchor.relList.contains('nofollow')) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return; }
    if (url.origin !== location.origin || url.pathname === location.pathname || /\/(cart|checkout|account|search|apps)(\/|$)|logout|add-to-cart|\/add(\/|$)/i.test(url.pathname)) return;
    if (warmed.has(url.href) || warmed.size >= 12) return;
    warmed.add(url.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch'; hint.as = 'document'; hint.href = url.href;
    document.head.appendChild(hint);
  };
  const ready = () => {
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 150));
    idle(() => [...document.querySelectorAll('a[data-product-neighbor]')].slice(0, 2).forEach(warm), {timeout: 1200});
  };
  if (document.readyState !== 'loading') ready();
  else document.addEventListener('DOMContentLoaded', ready, {once: true});
  document.addEventListener('pointerover', event => warm(event.target.closest?.('a[href]')), {passive: true});
  document.addEventListener('focusin', event => warm(event.target.closest?.('a[href]')));
  document.addEventListener('pointerdown', event => warm(event.target.closest?.('a[href]')), {passive: true});
})();
