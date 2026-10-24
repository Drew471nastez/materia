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
  // Storelib's own speculation rules already fetch a link the visitor rests on
  // or presses (and prerender it when that is safe). Where the browser has
  // them, the theme only names the few product pages in view, as rules of the
  // same kind, so one page is never fetched twice by two mechanisms. Other
  // browsers get a plain prefetch on hover (mouse only: a tap is already the
  // click) or keyboard focus.
  const speculation = !!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules'));
  const skip = /\/(cart|checkout|account|search|apps|api)(\/|$)|logout|add-to-cart|\/add(\/|$)/i;
  const warmed = new Set();
  const eligible = anchor => {
    if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.hasAttribute('data-no-prefetch') || anchor.relList.contains('nofollow')) return null;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return null; }
    if (url.origin !== location.origin || url.pathname === location.pathname || skip.test(url.pathname)) return null;
    url.hash = '';
    if (warmed.has(url.href) || warmed.size >= 12) return null;
    return url;
  };
  const warm = anchor => {
    const url = eligible(anchor);
    if (!url) return;
    warmed.add(url.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch'; hint.as = 'document'; hint.href = url.href;
    document.head.appendChild(hint);
  };
  const warmList = anchors => {
    const urls = [];
    for (const anchor of anchors) {
      const url = eligible(anchor);
      if (url) { warmed.add(url.href); urls.push(url.pathname + url.search); }
    }
    if (!urls.length) return;
    const rules = document.createElement('script');
    rules.type = 'speculationrules';
    rules.textContent = JSON.stringify({prefetch: [{source: 'list', urls, eagerness: 'immediate'}]});
    document.head.appendChild(rules);
  };
  const ready = () => {
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 150));
    idle(() => {
      const picked = [...document.querySelectorAll('a[data-product-neighbor]')].slice(0, 2);
      // Prepare a small number of visible product destinations before the
      // shopper taps; never crawl the catalog or preload offscreen carousels.
      const urls = new Set();
      let inspected = 0, visible = 0;
      for (const anchor of document.querySelectorAll('main a[href*="/products/"]')) {
        if (inspected++ === 40) break;
        if (urls.has(anchor.href)) continue;
        const rect = anchor.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) continue;
        urls.add(anchor.href); picked.push(anchor);
        if (++visible === 4) break;
      }
      // The first few visible links of the header menu (home, shop, a
      // collection): the pages most visitors open next.
      let menu = 0;
      for (const anchor of document.querySelectorAll('header nav a[href], .section-header nav a[href]')) {
        if (menu === 4) break;
        const rect = anchor.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.top >= innerHeight || urls.has(anchor.href)) continue;
        urls.add(anchor.href); picked.push(anchor); menu++;
      }
      if (speculation) warmList(picked); else picked.forEach(warm);
    }, {timeout: 1200});
  };
  if (document.readyState !== 'loading') ready();
  else document.addEventListener('DOMContentLoaded', ready, {once: true});
  if (speculation) return;
  let hoverTimer = 0;
  document.addEventListener('pointerover', event => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const anchor = event.target.closest?.('a[href]');
    clearTimeout(hoverTimer);
    if (anchor) hoverTimer = setTimeout(() => warm(anchor), 65);
  }, {passive: true});
  document.addEventListener('focusin', event => warm(event.target.closest?.('a[href]')));
})();
