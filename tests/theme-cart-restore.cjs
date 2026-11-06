/* A page that comes back after the cart changed elsewhere shows the new cart
   in place, without loading again.
   Storelib's head script (copied below as it ships) reads /cart.js when a page
   comes back from the back/forward cache or a prerendered page is opened, and
   reloads when the count differs from window.Shopify.storelibCartAtDraw (or
   the count the page was drawn with). utils.js keeps that number at the last
   live count and redraws the returning page's cart itself.
   1. Add on page B, Back to A: no reload (the server sees A once, a marker on
      A survives, the navigation type stays), and A's bubble, drawer, drawer
      label, free-shipping bar and cart:updated listeners have the new cart.
      Storelib's own read is the only /cart.js read; one sections request.
   2. Back with nothing changed: no reload and no extra request.
   3. The same without the theme's sync: Storelib reloads A (the test sees the
      double load it was written for).
   4. A prerendered page opened after an add (held in the prerendering
      state): shown in place with the new count; without the sync it reloads.
   5. Never in the builder; nothing sent on a normal page load. */
const {chromium} = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* Storelib's head-script cart check, as on the live storefront (S is
   window.Shopify, CART_AT_DRAW the count the server drew the page with). */
const storelibHead = (count, editing) => `(function(){var S=window.Shopify=window.Shopify||{};S.designMode=${editing};S.storelib=true;var EDITING=${editing};var CART_AT_DRAW=${count};`
  + 'if(!EDITING){var cartNow=function(){fetch("/cart.js",{credentials:"same-origin",headers:{Accept:"application/json"}}).then(function(r){return r.ok?r.json():null}).then(function(c){if(c&&Number(c.item_count)!==(typeof S.storelibCartAtDraw==="number"?S.storelibCartAtDraw:CART_AT_DRAW))location.reload()}).catch(function(){})};window.addEventListener("pageshow",function(e){if(e.persisted)cartNow()});if(document.prerendering)document.addEventListener("prerenderingchange",cartNow,{once:true})}})();';

/* The drawer element as the theme defines it (cart-components.js). */
const components = read('shopify/assets/cart-components.js');
const drawerScript = components.slice(0, components.indexOf('// theme.js loads this file'))
  + components.slice(components.indexOf('class CartNotification'), components.indexOf('customElements.define("cart-notification"'))
  + `;CartNotification.prototype.cartAction=function(){};CartNotification.prototype.addonsUpdate=function(){};
if(!customElements.get('cart-notification'))customElements.define('cart-notification',CartNotification);
customElements.define('free-ship-progress-bar',class extends HTMLElement{init(order){this.dataset.order=String(order);}});
window.root=document.documentElement;window.BlsLazyloadImg={init(){}};window.cartStrings={error:'Update failed'};`;

let cart = [];
const hits = {};
const state = () => {
  const count = cart.reduce((n, line) => n + line.quantity, 0);
  return {token: 't', item_count: count, total_price: count * 1500, items_subtotal_price: count * 1500, items: cart.map(line => ({key: line.id + ':k', id: line.id, variant_id: line.id, product_id: 1, quantity: line.quantity, title: 'Shirt ' + line.id}))};
};
const drawer = c => `<div id="minicart-form"><div class="minicart-scroll"><form id="minicart"><div class="minicart-body"><div class="items">${c.items.map(i => `<div class="cart-item" id="minicart__product-${i.key}"><input name="updates[]" data-id="${i.key}" data-value="${i.quantity}" value="${i.quantity}">${i.title}</div>`).join('')}</div></div>${c.item_count ? '' : '<div class="cart-body">Empty</div>'}</form></div><span data-cart-subtotal-price>R$ ${(c.total_price / 100).toFixed(2)}</span></div>`;
const doc = (name, {sync = true, editing = false} = {}) => {
  const c = state();
  return `<!doctype html><html lang="en"${editing ? ' class="shopify-design-mode"' : ''}><head><meta charset="utf-8"><title>${name}</title>
<script>${storelibHead(c.item_count, editing)}</script>
${sync ? '' : '<script>window.__materiaCartSync = true;</script>'}
<script src="/assets/utils.js" defer="defer" data-cart-count="${c.item_count}"></script>
<script src="/assets/drawer.js" defer="defer"></script>
</head><body><h1 id="title">${name}</h1>
<a id="cart-icon-bubble" href="/cart"><span class="cart-count h-count">${c.item_count}<span class="visually-hidden">${c.item_count} items</span></span></a>
<span class="hd__badge" data-storelib-cart-count>${c.item_count}</span>
<free-ship-progress-bar data-order="${c.total_price}"></free-ship-progress-bar>
<cart-notification id="minicart_wrapper"><div class="minicart__wrapper"><span class="cart-count cart-count-drawer">(${c.item_count})</span>${drawer(c)}</div></cart-notification>
<p><a id="to-a" href="/pages/a${sync ? '' : '?nosync'}">A</a> <a id="to-b" href="/pages/b${sync ? '' : '?nosync'}">B</a> <a id="to-c" href="/pages/c${sync ? '' : '?nosync'}">C</a></p>
<button id="add" type="button">Add to cart</button>
<script>
  window.__marker = ${JSON.stringify(name)} + ':' + Math.random();
  window.__events = [];
  document.addEventListener('cart:updated', e => __events.push(e.detail && e.detail.cart && e.detail.cart.item_count));
  /* An add as the theme's product form does it: the answer is the added line, no count. */
  document.getElementById('add').addEventListener('click', () => {
    fetch('/cart/add.js', {method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify({items: [{id: '7', quantity: 1}]})})
      .then(r => r.json()).then(() => {
        document.querySelectorAll('#cart-icon-bubble .cart-count').forEach(el => { el.textContent = String(parseInt(el.textContent, 10) + 1); });
        window.__added = (window.__added || 0) + 1;
      });
  });
</script></body></html>`;
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const key = req.method + ' ' + url.pathname + (url.searchParams.has('sections') ? '?sections' : '') + (url.searchParams.has('nosync') ? '?nosync' : '');
  hits[key] = (hits[key] || 0) + 1;
  const send = (body, type = 'text/html', status = 200) => { res.writeHead(status, {'content-type': type, 'cache-control': 'private, no-cache'}); res.end(body); };
  if (url.pathname === '/assets/utils.js') return send(read('shopify/assets/utils.js'), 'text/javascript');
  if (url.pathname === '/assets/drawer.js') return send(drawerScript, 'text/javascript');
  const page = url.pathname.match(/^\/pages\/(a|b|c|editor)$/);
  if (page) return send(doc('Page ' + page[1].toUpperCase(), {sync: !url.searchParams.has('nosync'), editing: page[1] === 'editor'}));
  if (url.pathname === '/cart.js') return send(JSON.stringify(state()), 'application/json');
  if (url.pathname === '/cart' && url.searchParams.has('sections')) return send(JSON.stringify({'minicart-form': `<div id="shopify-section-minicart-form">${drawer(state())}</div>`}), 'application/json');
  if (url.pathname === '/cart/add.js' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const items = JSON.parse(body).items;
      for (const item of items) {
        const line = cart.find(l => l.id === item.id);
        if (line) line.quantity += item.quantity; else cart.push({id: item.id, quantity: item.quantity});
      }
      send(JSON.stringify({items: items.map(i => ({id: i.id, variant_id: i.id, quantity: i.quantity}))}), 'application/json');
    });
    return;
  }
  send('not found', 'text/plain', 404);
});
const reset = () => { cart = []; for (const k of Object.keys(hits)) delete hits[k]; };
const hit = k => hits[k] || 0;

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Playwright turns the back/forward cache off by default; it is on in every browser a shopper uses.
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', channel: 'chromium', args: ['--no-sandbox'], ignoreDefaultArgs: ['--disable-back-forward-cache']});
  let checks = 0;
  const view = page => page.evaluate(() => ({
    marker: window.__marker,
    type: performance.getEntriesByType('navigation')[0].type,
    bubble: [...document.querySelector('#cart-icon-bubble .cart-count').childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join('').trim(),
    badge: document.querySelector('[data-storelib-cart-count]').textContent,
    label: document.querySelector('.cart-count-drawer').textContent,
    rows: document.querySelectorAll('#minicart-form .cart-item').length,
    subtotal: document.querySelector('[data-cart-subtotal-price]').textContent,
    order: document.querySelector('free-ship-progress-bar').dataset.order,
    events: window.__events,
    getter: window.Shopify.storelibCartAtDraw,
  }));
  try {
    /* 1-3. Back to a page drawn before the add. */
    for (const sync of [true, false]) {
      reset();
      const q = sync ? '' : '?nosync';
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin + '/pages/a' + q);
      await page.waitForLoadState('load');
      const first = await view(page);
      assert.equal(first.bubble, '0');
      if (sync) {
        assert.equal(first.getter, 0, 'the getter starts at the drawn count');
        assert.deepEqual(Object.keys(hits).filter(k => /cart/.test(k)), [], 'a normal page load sends nothing to the cart');
      } else assert.equal(first.getter, undefined, 'the control page has no sync');
      await page.click('#to-b'); await page.waitForURL('**/pages/b*'); await page.waitForLoadState('load');
      await page.click('#add');
      await page.waitForFunction(() => window.__added === 1);
      if (sync) {
        // The add's answer has no count: one read of /cart.js follows.
        await page.waitForFunction(() => window.Shopify.storelibCartAtDraw === 1, null, {timeout: 3000});
        assert.equal(hit('GET /cart.js'), 1, 'one read after an add without a count');
      }
      const before = {a: hit('GET /pages/a' + q), reads: hit('GET /cart.js'), sections: hit('GET /cart?sections')};
      await page.goBack({waitUntil: 'commit'});
      await page.waitForFunction(() => document.getElementById('title')?.textContent === 'Page A');
      await page.waitForTimeout(1200);
      if (!sync) {
        // Storelib reloads A: the double load.
        await page.waitForFunction(() => performance.getEntriesByType('navigation')[0].type === 'reload', null, {timeout: 5000});
        const after = await view(page);
        assert.notEqual(after.marker, first.marker, 'without the sync, Storelib loads the page again');
        assert.equal(hit('GET /pages/a' + q), before.a + 1, 'the server draws A a second time');
        assert.equal(after.bubble, '1');
        checks++;
        await ctx.close();
        continue;
      }
      const back = await view(page);
      const persisted = await page.evaluate(() => performance.getEntriesByType('navigation')[0].notRestoredReasons);
      assert.equal(back.marker, first.marker, 'A came back from the back/forward cache and stayed (reasons: ' + JSON.stringify(persisted) + ')');
      assert.equal(back.type, 'navigate', 'no reload');
      assert.equal(hit('GET /pages/a'), before.a, 'the server drew A once');
      assert.deepEqual({bubble: back.bubble, badge: back.badge, label: back.label, rows: back.rows, subtotal: back.subtotal, order: back.order, getter: back.getter},
        {bubble: '1', badge: '1', label: '(1)', rows: 1, subtotal: 'R$ 15.00', order: '1500', getter: 1}, 'A shows the new cart in place');
      assert(back.events.includes(1), 'cart:updated carries the live cart');
      assert.equal(hit('GET /cart.js'), before.reads + 1, "Storelib's own read is the only read");
      assert.equal(hit('GET /cart?sections'), before.sections + 1, 'one sections request redraws the drawer');
      checks++;
      // 2. Forward and Back again with nothing changed.
      await page.goForward({waitUntil: 'commit'});
      await page.waitForFunction(() => document.getElementById('title')?.textContent === 'Page B');
      await page.waitForTimeout(600);
      // B was drawn with 0 before its own add; its count was kept in step by the add itself.
      assert.equal((await view(page)).bubble, '1', 'B, back from the cache, shows the cart too');
      const steady = {a: hit('GET /pages/a'), b: hit('GET /pages/b'), sections: hit('GET /cart?sections')};
      await page.goBack({waitUntil: 'commit'});
      await page.waitForFunction(() => document.getElementById('title')?.textContent === 'Page A');
      await page.waitForTimeout(800);
      const again = await view(page);
      assert.equal(again.marker, first.marker); assert.equal(again.type, 'navigate');
      assert.deepEqual({a: hit('GET /pages/a'), b: hit('GET /pages/b'), sections: hit('GET /cart?sections')}, steady, 'nothing changed: nothing redrawn, nothing loaded');
      assert.deepEqual(errors, []);
      checks++;
      await ctx.close();
    }

    /* 4. A prerendered page opened after an add. Chromium under Playwright
       refuses real prerendering (PrerenderingDisabledByDevTools), so the
       page is held in the prerendering state the way the browser holds it:
       document.prerendering is true while it loads and runs its scripts, then
       turns false with a prerenderingchange event when the shopper opens it.
       It shares this browser's storage with the page that adds. */
    for (const sync of [true, false]) {
      reset();
      const q = sync ? '' : '?nosync';
      const ctx = await browser.newContext();
      const shopper = await ctx.newPage();
      await shopper.goto(origin + '/pages/a' + q);
      await shopper.waitForLoadState('load');
      const held = await ctx.newPage();
      const errors = []; held.on('pageerror', e => errors.push(e.message));
      await held.addInitScript(() => {
        let prerendering = true;
        Object.defineProperty(Document.prototype, 'prerendering', {configurable: true, get: () => prerendering});
        window.__activate = () => { prerendering = false; document.dispatchEvent(new Event('prerenderingchange')); };
      });
      await held.goto(origin + '/pages/c' + q);
      await held.waitForLoadState('load');
      const drawnWith = await view(held);
      assert.equal(drawnWith.bubble, '0');
      await shopper.click('#add');
      await shopper.waitForFunction(() => window.__added === 1);
      await shopper.waitForTimeout(700);
      const before = {c: hit('GET /pages/c' + q), reads: hit('GET /cart.js'), sections: hit('GET /cart?sections')};
      await held.evaluate(() => window.__activate());
      await held.waitForTimeout(1200);
      if (sync) {
        const c = await view(held);
        assert.equal(c.marker, drawnWith.marker, 'the opened page stays');
        assert.equal(hit('GET /pages/c'), before.c, 'the prerendered page is shown, not loaded again');
        assert.deepEqual({bubble: c.bubble, label: c.label, rows: c.rows, order: c.order}, {bubble: '1', label: '(1)', rows: 1, order: '1500'}, 'C shows the new cart in place');
        assert.equal(hit('GET /cart.js'), before.reads + 1, "Storelib's own read is the only read");
        assert.equal(hit('GET /cart?sections'), before.sections + 1);
      } else {
        await held.waitForFunction(() => document.getElementById('title')?.textContent === 'Page C');
        assert.equal(hit('GET /pages/c' + q), before.c + 1, 'without the sync, the opened page loads again');
        assert.notEqual((await view(held)).marker, drawnWith.marker);
      }
      assert.deepEqual(errors, []);
      checks++;
      await ctx.close();
    }

    /* 5. The builder: no getter, no fetch wrapper. */
    {
      reset();
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(origin + '/pages/editor');
      await page.waitForLoadState('load');
      assert.deepEqual(await page.evaluate(() => ({getter: Object.getOwnPropertyDescriptor(window.Shopify, 'storelibCartAtDraw'), sync: !!window.fetch.__materiaCartSync, saved: localStorage.getItem('materia:cart-count')})),
        {getter: undefined, sync: false, saved: null}, 'the builder is left alone');
      checks++;
      await ctx.close();
    }
    console.log(`${checks} cart restore checks passed (Back after an add shows the cart in place without a reload, nothing changed nothing sent, control reloads, prerender activation, builder untouched)`);
  } finally {
    await browser.close();
    server.closeAllConnections(); server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
