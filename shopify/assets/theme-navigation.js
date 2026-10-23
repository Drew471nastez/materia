/* Warm only the two real product-neighbour pages, after this page has loaded.
   Native navigation retains form behaviour, history and the browser's cache. */
(() => {
  if (window.__materiaNavigation) return;
  window.__materiaNavigation = true;
  const connection = navigator.connection;
  if (connection?.saveData || /2g/.test(connection?.effectiveType || '')) return;
  const warmed = new Set();
  const warm = anchor => {
    if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.hasAttribute('data-no-prefetch')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || /\/(cart|checkout|account|search)(\/|$)/.test(url.pathname)) return;
    if (warmed.has(url.href)) return;
    warmed.add(url.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch'; hint.as = 'document'; hint.href = url.href;
    document.head.appendChild(hint);
  };
  const ready = () => {
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 150));
    idle(() => [...document.querySelectorAll('a[data-product-neighbor]')].slice(0, 2).forEach(warm), {timeout: 1200});
  };
  if (document.readyState === 'complete') ready();
  else window.addEventListener('load', ready, {once: true});
  document.addEventListener('pointerover', event => warm(event.target.closest?.('a[data-product-neighbor]')), {passive: true});
  document.addEventListener('focusin', event => warm(event.target.closest?.('a[data-product-neighbor]')));
})();
