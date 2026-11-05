/* Page changes and the theme's own requests on a slow, stalled or broken
   connection.
   1. The fetch layer (utils.js): a deadline for every theme request, one more
      try for a GET that met the network or a busy server, never a second POST,
      a timeout that is not mistaken for the caller's own cancel, and
      Storelib's own addresses left alone.
   2. Page to page: while the next page stalls the current one stays painted
      and usable, and the next page is fully visible when it lands (with the
      theme's view-transition sheet and the platform's @view-transition rule).
   3. Back and Forward come from the back/forward cache: nothing in the
      theme's storefront scripts registers unload or beforeunload.
   4. Add to cart with the network down then back: the error shows by the
      button, the button is free again, the POST is sent once, and the next
      press adds. A GET that times out (the error toast's own section) still
      ends in the message. */
const {chromium} = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const speed = read('snippets/speed-optimization.storelib');
const landing = speed.match(/<style id="speed-page-landing">([\s\S]*?)<\/style>/)[1];
const theme = read('shopify/assets/theme.js');
const productForm = theme.slice(theme.indexOf('if (!customElements.get("product-form")) {'), theme.indexOf('// js loadmor product'));
const STOREFRONT = ['utils.js', 'global.js', 'theme-navigation.js', 'materia-experience.js', 'size-chart.js', 'wishlist.js', 'product-offers.js'];

const doc = (title, body, extra = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>@view-transition { navigation: auto; } body{margin:0;font:16px/1.4 sans-serif;background:#fff} main a{display:block;height:44px}</style>
<style>${landing}</style>
${STOREFRONT.map(f => `<script src="/assets/${f}" defer></script>`).join('\n')}${extra}
</head><body><main><h1 id="title">${title}</h1>${body}</main></body></html>`;
const LINKS = '<a id="to-b" href="/pages/b">B</a><a id="to-stall" href="/pages/stall">Stalled</a><a id="to-slow" href="/pages/slow">Slow</a><a href="/products/one">One</a>';

const held = [];
const hits = {};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const key = url.pathname + (url.searchParams.get('section_id') ? '?section_id=' + url.searchParams.get('section_id') : '');
  hits[key] = (hits[key] || 0) + 1;
  const send = (body, type = 'text/html', status = 200, headers = {}) => { res.writeHead(status, Object.assign({'content-type': type}, headers)); res.end(body); };
  if (url.pathname.startsWith('/assets/')) return send(read('shopify/assets/' + path.basename(url.pathname)), 'text/javascript');
  if (url.pathname === '/pages/stall' || url.searchParams.get('section_id') === 'stall') { held.push(res); return; }
  if (url.pathname === '/pages/slow') return setTimeout(() => send(doc('Slow page', LINKS)), 900);
  if (url.pathname === '/pages/a' || url.pathname === '/pages/b') return send(doc(url.pathname === '/pages/a' ? 'Page A' : 'Page B', LINKS));
  if (url.pathname === '/products/busy') return hits[key] === 1 ? send('busy', 'text/plain', 503, {'retry-after': '0'}) : send('fine', 'text/plain');
  if (url.pathname === '/products/one' || url.pathname === '/api/thing') return send('ok', 'text/plain');
  if (url.pathname === '/cart/add.js') return send(JSON.stringify({id: 1, items: [{id: 1, quantity: 1}], sections: {'minicart-form': '<div id="minicart-form">In your cart</div>'}}), 'application/json');
  if (url.pathname === '/cart.json') return send(JSON.stringify({item_count: 1, total_price: 100}), 'application/json');
  if (url.pathname === '/cart/change.js') return send('{}', 'application/json');
  if (url.pathname === '/products/form') return send(`<!doctype html><html><head><meta charset="utf-8"><script src="/assets/utils.js"></script></head><body>${req.url.includes('card') ? '<div class="product-item">' : ''}<product-form><form><input name="id" value="7"><div class="product-form__error-message-wrapper" hidden><span class="product-form__error-message"></span></div><button type="submit"><span>Add to cart</span></button></form></product-form>${req.url.includes('card') ? '</div>' : ''}<cart-notification><div id="minicart-form"></div></cart-notification></body></html>`);
  send('not found', 'text/plain', 404);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Playwright turns the back/forward cache off by default; it is on in every browser a shopper uses.
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', channel: 'chromium', args: ['--no-sandbox'], ignoreDefaultArgs: ['--disable-back-forward-cache']});
  let checks = 0;
  try {
    /* 1. The fetch layer. */
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      let flaky = 0, posts = 0, platform = 0;
      await ctx.route('**/products/flaky*', route => (++flaky === 1 ? route.abort('internetdisconnected') : route.fulfill({status: 200, contentType: 'text/plain', body: 'back'})));
      await ctx.route('**/cart/change.js', route => { posts++; route.abort('internetdisconnected'); });
      await ctx.route('**/api/down', route => { platform++; route.abort('internetdisconnected'); });
      await page.goto(origin + '/pages/a');
      await page.waitForFunction(() => window.fetch.__materiaResilient === true);
      const result = await page.evaluate(async () => {
        const out = {};
        const settle = p => p.then(r => r.text().then(t => ({ok: true, status: r.status, text: t})), e => ({ok: false, name: e.name}));
        out.flaky = await settle(fetch('/products/flaky?section_id=s'));
        out.busy = await settle(fetch('/products/busy'));
        out.post = await settle(fetch('/cart/change.js', {method: 'POST', body: '{}'}));
        out.platform = await settle(fetch('/api/down'));
        window.materiaFetchLimits = {get: 300};
        const t0 = performance.now();
        out.timeout = await settle(fetch('/pages/x?section_id=stall'));
        out.timeoutMs = performance.now() - t0;
        const c = new AbortController();
        const own = settle(fetch('/pages/y?section_id=stall', {signal: c.signal}));
        setTimeout(() => c.abort(), 50);
        out.own = await own;
        out.cross = window.fetch.call(window, 'https://elsewhere.invalid/x').catch(e => e.name) instanceof Promise;
        delete window.materiaFetchLimits;
        out.plain = await settle(fetch('/products/one'));
        return out;
      });
      assert.deepEqual(result.flaky, {ok: true, status: 200, text: 'back'}, 'a GET that met the network is asked once more');
      assert.equal(flaky, 2);
      assert.deepEqual(result.busy, {ok: true, status: 200, text: 'fine'}, 'a busy server (503) is asked once more');
      assert.equal(hits['/products/busy'], 2); checks++;
      assert.deepEqual(result.post, {ok: false, name: 'TypeError'});
      assert.equal(posts, 1, 'a cart POST is never sent twice'); checks++;
      assert.deepEqual(result.platform, {ok: false, name: 'TypeError'});
      assert.equal(platform, 1, "Storelib's own addresses are left to the browser"); checks++;
      assert.equal(result.timeout.name, 'TimeoutError', 'a stalled GET ends, as a TimeoutError');
      assert(result.timeoutMs < 1500, 'within its deadline, not retried after a timeout: ' + result.timeoutMs);
      assert.equal(result.own.name, 'AbortError', "the caller's own cancel stays an AbortError"); checks++;
      assert.deepEqual(result.plain, {ok: true, status: 200, text: 'ok'}, 'success is untouched'); checks++;
      assert.deepEqual(errors, []);
      await ctx.close();
    }

    /* 2. Page to page while the next page stalls, then lands. */
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const ctx = await browser.newContext({reducedMotion});
      const page = await ctx.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin + '/pages/a');
      await page.click('#to-stall', {noWaitAfter: true});
      await page.waitForTimeout(1500);
      const during = await page.evaluate(() => ({
        title: document.getElementById('title').textContent,
        opacity: getComputedStyle(document.documentElement).opacity,
        body: getComputedStyle(document.body).visibility,
        hit: document.elementFromPoint(20, 20)?.id || document.elementFromPoint(20, 20)?.tagName,
      }));
      assert.deepEqual(during, {title: 'Page A', opacity: '1', body: 'visible', hit: 'title'}, reducedMotion + ': a stalled next page leaves the current one painted');
      await page.click('#to-slow');
      await page.waitForURL('**/pages/slow');
      await page.waitForTimeout(reducedMotion === 'reduce' ? 50 : 500);
      const after = await page.evaluate(() => ({
        title: document.getElementById('title').textContent,
        opacity: getComputedStyle(document.documentElement).opacity,
        running: document.getAnimations().filter(a => a.playState === 'running' && /view-transition/.test(a.effect?.pseudoElement || '')).length,
        hit: document.elementFromPoint(20, 20)?.id,
      }));
      assert.deepEqual(after, {title: 'Slow page', opacity: '1', running: 0, hit: 'title'}, reducedMotion + ': the next page is fully shown when it lands');
      assert.deepEqual(errors, []); checks++;
      await ctx.close();
    }

    /* 3. Back and Forward from the back/forward cache. */
    {
      const ctx = await browser.newContext();
      await ctx.addInitScript(() => {
        window.__unload = [];
        const add = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type) {
          if (type === 'unload' || type === 'beforeunload') window.__unload.push(type);
          return add.apply(this, arguments);
        };
      });
      const page = await ctx.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin + '/pages/a');
      await page.waitForLoadState('load'); await page.waitForTimeout(700);
      const mark = () => page.evaluate(() => { window.__stamp = location.pathname; addEventListener('pageshow', e => { window.__persisted = e.persisted; }); return {unload: window.__unload, onunload: window.onunload, onbeforeunload: window.onbeforeunload}; });
      assert.deepEqual(await mark(), {unload: [], onunload: null, onbeforeunload: null}, 'no unload or beforeunload handler');
      await page.click('#to-b'); await page.waitForURL('**/pages/b'); await page.waitForTimeout(400);
      await mark();
      await page.goBack({waitUntil: 'commit'});
      await page.waitForFunction(() => document.getElementById('title')?.textContent === 'Page A');
      const back = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        return {stamp: window.__stamp, persisted: window.__persisted, reasons: nav.notRestoredReasons ? JSON.stringify(nav.notRestoredReasons.reasons) : null};
      });
      assert.equal(back.stamp, '/pages/a', 'Back restores the page itself from the back/forward cache (reasons: ' + back.reasons + ')');
      assert.equal(back.persisted, true);
      await page.goForward({waitUntil: 'commit'});
      await page.waitForFunction(() => document.getElementById('title')?.textContent === 'Page B');
      assert.equal(await page.evaluate(() => window.__persisted && window.__stamp), '/pages/b', 'Forward too');
      // A page that did reload from history (no cache) says so in its timing.
      assert.equal(await page.evaluate(() => typeof materiaNavigationTiming === 'function' && materiaNavigationTiming().type), 'navigate');
      assert.deepEqual(errors, []); checks++;
      await ctx.close();
      // Every storefront script, not only the ones on the fixture page.
      const sources = fs.readdirSync(path.join(__dirname, '..', 'shopify/assets')).filter(f => f.endsWith('.js') && !/\.min\.js$|mapbox/.test(f)).map(f => ['shopify/assets/' + f, read('shopify/assets/' + f)])
        .concat(['layout', 'snippets', 'sections', 'blocks'].flatMap(dir => fs.readdirSync(path.join(__dirname, '..', dir)).filter(f => f.endsWith('.storelib')).map(f => [dir + '/' + f, read(dir + '/' + f)])));
      for (const [file, src] of sources) {
        assert(!/addEventListener\(\s*['"](unload|beforeunload)['"]|\bonunload\s*=|\bonbeforeunload\s*=/.test(src), file + ': unload/beforeunload keeps a page out of the back/forward cache');
        assert(!/['"]Cache-Control['"]\s*:\s*['"][^'"]*no-store/i.test(src), file + ': no no-store set by the theme');
      }
      checks++;
    }

    /* 4. Add to cart: network down, then back. A GET that times out still ends in the message. */
    for (const card of [false, true]) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      let down = true, adds = 0;
      await ctx.route('**/cart/add.js', route => { adds++; return down ? route.abort('internetdisconnected') : route.continue(); });
      await page.goto(origin + '/products/form' + (card ? '?card=1' : ''));
      await page.evaluate(card => {
        window.PopupBase = class extends HTMLElement {};
        window.routes = {cart_add_url: '/cart/add.js', cart_url: '/cart'};
        window.cartStrings = {error: 'There was an error while updating your cart. Please try again.'};
        window.publish = () => {}; window.PUB_SUB_EVENTS = {cartError: 'error', cartUpdate: 'update'};
        window.BlsLazyloadImg = {init() {}};
        window.toasts = []; window.showToast = message => window.toasts.push(message);
        // The error toast's own section stalls: the GET deadline ends it.
        if (card) window.materiaFetchLimits = {get: 400};
        const cart = document.querySelector('cart-notification');
        cart.getSectionsToRender = () => [{id: 'minicart-form'}]; cart.setActiveElement = () => {}; cart.cartAction = () => {};
        window.opens = 0; cart.open = () => { window.opens++; };
        if (card) {
          const native = window.fetch;
          window.fetch = (url, init) => native(String(url).includes('section_id=form-message') ? String(url).replace('form-message', 'stall') : url, init);
        }
      }, card);
      await page.addScriptTag({content: productForm});
      const button = page.locator('button[type=submit]');
      await button.click();
      await page.waitForFunction(() => !document.querySelector('button[type=submit]').classList.contains('loading'));
      const failed = await page.evaluate(() => ({
        disabled: document.querySelector('button[type=submit]').getAttribute('aria-disabled'),
        wrapper: document.querySelector('.product-form__error-message-wrapper').hidden,
        message: document.querySelector('.product-form__error-message').textContent,
        opens: window.opens,
      }));
      assert.deepEqual(failed, {disabled: null, wrapper: false, message: 'There was an error while updating your cart. Please try again.', opens: 0}, (card ? 'card' : 'product page') + ': the error shows by a button that is free again');
      assert.equal(adds, 1, 'the failed add was sent once');
      if (card) {
        await page.waitForFunction(() => window.toasts.length > 0, null, {timeout: 3000});
        assert(/There was an error while updating your cart/.test(await page.evaluate(() => window.toasts[0])), 'the timed-out toast section still ends in the message');
      }
      checks++;
      down = false;
      await button.click();
      await page.waitForFunction(() => window.opens === 1, null, {timeout: 5000});
      assert.equal(adds, 2, 'the next press adds');
      assert.equal(await page.evaluate(() => document.querySelector('.product-form__error-message-wrapper').hidden), true, 'the old error is cleared');
      assert.equal(await page.locator('#minicart-form').textContent(), 'In your cart');
      assert.deepEqual(errors, []); checks++;
      await ctx.close();
    }
    console.log(`${checks} network resilience checks passed (fetch deadline and retry, stalled page change, back/forward cache, add to cart offline then online)`);
  } finally {
    held.forEach(res => { try { res.destroy(); } catch (_) {} });
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
