/* Warm bounded, visible product destinations and real product neighbours.
   Native navigation retains form behaviour, history and the browser's cache. */
(() => {
  if (window.__materiaNavigation) return;
  window.__materiaNavigation = true;
  /* A thin bar across the top from the moment a link to another page of the site is clicked until
     that page is shown, so a click on a slow connection is seen to have landed. Storelib keeps the
     old page painted until the next one has arrived; the bar is drawn on the compositor (transform
     only), never covers or dims the page, and goes when the page is left, restored (Back), or after
     12 s if the navigation never happened. Not in the builder. */
  const inBuilder = () => document.documentElement.classList.contains('shopify-design-mode') || !!window.Shopify?.designMode;
  let bar = null, barTimer = 0;
  const hideBar = () => { clearTimeout(barTimer); if (bar) { bar.remove(); bar = null; } };
  const showBar = () => {
    if (bar || inBuilder()) return;
    bar = document.createElement('div');
    bar.setAttribute('aria-hidden', 'true');
    bar.className = 'materia-nav-bar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:2px;z-index:2147483646;pointer-events:none;background:var(--color-primary,currentColor);transform-origin:0 50%;transform:scaleX(0);will-change:transform';
    document.documentElement.appendChild(bar);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) bar.style.transform = 'scaleX(.6)';
    else bar.animate?.([{transform: 'scaleX(0)'}, {transform: 'scaleX(.35)', offset: .15}, {transform: 'scaleX(.9)'}], {duration: 9000, easing: 'cubic-bezier(.1,.6,.2,1)', fill: 'forwards'});
    barTimer = setTimeout(hideBar, 12000);
  };
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch (_) { return; }
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    /* only when nothing else took the click (a drawer, a quick view, a filter handled in place) */
    setTimeout(() => { if (!event.defaultPrevented) showBar(); }, 0);
  });
  addEventListener('pageshow', hideBar);
  addEventListener('pagehide', hideBar);
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
  const net = connection?.effectiveType || '';
  // Save-data and 2G: do not prefetch. A second download fights the page
  // the visitor is already waiting on.
  if (connection?.saveData || /2g/.test(net)) return;
  const limited = net === '3g';
  // Checkout is Storelib's own page and pays through Stripe. When a shopper
  // heads for a checkout button (or opens the cart page), the connection to
  // Stripe is opened ahead, once. The checkout page itself is never fetched
  // early: Storelib keeps it out of prefetching on purpose.
  let checkoutWarm = false;
  const warmCheckout = () => {
    if (checkoutWarm) return;
    checkoutWarm = true;
    for (const href of ['https://js.stripe.com', 'https://api.stripe.com']) {
      const link = document.createElement('link');
      link.rel = 'preconnect'; link.href = href; link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  };
  const checkoutTarget = '[name="checkout"], .btn-checkout, a[href*="/checkout"], [data-checkout]';
  const nearCheckout = event => { if (event.target.closest?.(checkoutTarget)) warmCheckout(); };
  document.addEventListener('pointerover', nearCheckout, {passive: true});
  document.addEventListener('touchstart', nearCheckout, {passive: true});
  document.addEventListener('focusin', nearCheckout);
  if (/^\/cart\/?$/.test(location.pathname)) warmCheckout();
  // Storelib's own speculation rules already fetch a link the visitor rests on
  // or presses (and prerender it when that is safe). Where the browser has
  // them, the theme only names the few product pages in view, as rules of the
  // same kind, so one page is never fetched twice by two mechanisms. Other
  // browsers get a plain prefetch on hover (mouse only: a tap is already the
  // click) or keyboard focus.
  const speculation = !!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules'));
  const skip = /\/(cart|checkout|account|search|apps|api|admin|builder)(\/|$)|logout|add-to-cart|\/add(\/|$)/i;
  // A query that changes something (adds to the cart, signs out, removes or
  // clears a thing) is never fetched early: fetching it would do it.
  const acts = /[?&](add-to-cart|add|action|logout|remove|delete|clear|return_to|checkout)(=|&|$)/i;
  const warmed = new Set();
  const eligible = anchor => {
    if (!anchor || anchor.target || anchor.hasAttribute('download') || anchor.hasAttribute('data-no-prefetch') || anchor.relList.contains('nofollow')) return null;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return null; }
    if (url.origin !== location.origin || url.pathname === location.pathname || skip.test(url.pathname) || acts.test(url.search) || navigator.onLine === false) return null;
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
      const picked = [...document.querySelectorAll('a[data-product-neighbor]')].slice(0, limited ? 1 : 2);
      // Prepare a small number of visible product destinations before the
      // shopper taps; never crawl the catalog or preload offscreen carousels.
      // On a slow connection, one page only, so it does not crowd the current one.
      const urls = new Set();
      let inspected = 0, visible = 0;
      const visibleCap = limited ? 1 : 4;
      for (const anchor of document.querySelectorAll('main a[href*="/products/"]')) {
        if (inspected++ === 40) break;
        if (urls.has(anchor.href)) continue;
        const rect = anchor.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth) continue;
        urls.add(anchor.href); picked.push(anchor);
        if (++visible === visibleCap) break;
      }
      // The first few visible links of the header menu (home, shop, a
      // collection): the pages most visitors open next.
      let menu = 0;
      const menuCap = limited ? 1 : 4;
      for (const anchor of document.querySelectorAll('header nav a[href], .section-header nav a[href]')) {
        if (menu === menuCap) break;
        const rect = anchor.getBoundingClientRect();
        if (!rect.width || !rect.height || rect.top >= innerHeight || urls.has(anchor.href)) continue;
        urls.add(anchor.href); picked.push(anchor); menu++;
      }
      if (speculation) warmList(picked); else picked.forEach(warm);
    }, {timeout: 500});
  };
  if (document.readyState !== 'loading') ready();
  else document.addEventListener('DOMContentLoaded', ready, {once: true});
  if (speculation) return;
  // A press starts the next page before the click finishes. One link, the
  // one under the finger. Browsers with speculation rules already do this.
  document.addEventListener('touchstart', event => {
    const anchor = event.target.closest?.('a[href]');
    if (anchor) warm(anchor);
  }, {passive: true, capture: true});
  let hoverTimer = 0;
  document.addEventListener('pointerover', event => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const anchor = event.target.closest?.('a[href]');
    clearTimeout(hoverTimer);
    if (anchor) hoverTimer = setTimeout(() => warm(anchor), 65);
  }, {passive: true});
    document.addEventListener('focusin', event => warm(event.target.closest?.('a[href]')));

})();
