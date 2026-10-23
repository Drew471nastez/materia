/* Warm bounded, visible product destinations and real product neighbours.
   Native navigation retains form behaviour, history and the browser's cache. */
(() => {
  if (window.__materiaNavigation) return;
  window.__materiaNavigation = true;
  // On-demand diagnostics only: no telemetry, fetch, storage or URL query data.
  // Run materiaNavigationTiming() on the affected published page.
  window.materiaNavigationTiming = () => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return null;
    const round = value => Math.round(value);
    const elapsed = value => value > 0 ? round(value) : null;
    return {
      type: nav.type,
      route: location.pathname,
      documentPath: new URL(nav.name).pathname,
      serverResponseMs: round(nav.responseStart - nav.requestStart),
      documentDownloadMs: round(nav.responseEnd - nav.responseStart),
      domReadyMs: elapsed(nav.domContentLoadedEventEnd),
      loadMs: elapsed(nav.loadEventEnd),
      firstContentfulPaintMs: elapsed(performance.getEntriesByName('first-contentful-paint')[0]?.startTime),
      slowResources: performance.getEntriesByType('resource')
        .filter(entry => /^https?:/.test(entry.name) && ['script','link','css','img','fetch','xmlhttprequest'].includes(entry.initiatorType))
        .sort((a,b) => b.duration - a.duration).slice(0,8)
        .map(entry => ({path:new URL(entry.name,location.href).pathname,kind:entry.initiatorType,durationMs:round(entry.duration)})),
    };
  };
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
    idle(() => {
      [...document.querySelectorAll('a[data-product-neighbor]')].slice(0, 2).forEach(warm);
      // Prepare a small number of visible product destinations before the
      // shopper taps; never crawl the catalog or preload offscreen carousels.
      const visible = [];
      const urls = new Set();
      let inspected = 0;
      for (const anchor of document.querySelectorAll('main a[href*="/products/"]')) {
        if (inspected++ === 40) break;
        if (urls.has(anchor.href)) continue;
        const rect = anchor.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) continue;
        urls.add(anchor.href); visible.push(anchor);
        if (visible.length === 4) break;
      }
      visible.forEach(warm);
    }, {timeout: 1200});
  };
  if (document.readyState !== 'loading') ready();
  else document.addEventListener('DOMContentLoaded', ready, {once: true});
  document.addEventListener('pointerover', event => warm(event.target.closest?.('a[href]')), {passive: true});
  document.addEventListener('focusin', event => warm(event.target.closest?.('a[href]')));
  document.addEventListener('pointerdown', event => warm(event.target.closest?.('a[href]')), {passive: true});
})();
