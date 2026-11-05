/* Builder-only live preview controllers are not a visitor's download.
   layout/theme.storelib keeps a list of controllers that only repaint a
   section from the builder's storelib:settings-change / storelib:section-load
   (docs/storefront-scripts-audit.md says why each one is builder-only):

   - storefront (no request.design_mode, no window.Shopify.designMode, no
     builder referrer): none of them is requested, and nothing else changes;
   - the first live event loads them all, in order; the events that came
     before they ran are held and given again on the same target with the
     same detail, in arrival order, so a listener that was already on the page
     sees each event once, and the live change lands (the footer's padding);
   - request.design_mode (and window.Shopify.designMode): they are written as
     deferred scripts while the page parses, and run before DOMContentLoaded,
     in the list's order, as the old tags did.
   Renders the real layout with tests/theme-r6-footer-lib.cjs (footer group,
   mobile navigation bar) and serves shopify/assets.

   node tests/theme-builder-scripts-lazy.cjs */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const L = require('./theme-r6-footer-lib.cjs');
const root = path.join(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'layout/theme.storelib'), 'utf8');

const at = layout.indexOf('Builder-only live preview.');
assert(at > 0, 'layout/theme has the builder-only loader');
const loader = layout.slice(layout.indexOf('<script>', at), layout.indexOf('</script>', at));
const LAZY = [...loader.matchAll(/'([\w-]+\.js)' \| asset_url \| json/g)].map(m => m[1]);
assert(LAZY.length >= 5, 'the loader lists the builder-only controllers');
let checks = 0;

/* Static: each listed controller is only in the loader, never also a <script src> tag. */
for (const name of LAZY) {
  assert(fs.existsSync(path.join(root, 'shopify/assets', name)), `${name} exists`);
  assert.equal(layout.split(`'${name}' | asset_url`).length - 1, 1, `${name} appears once in the layout (the loader's list)`);
  assert(!new RegExp(`<script[^>]+'${name.replace('.', '\\.')}'`).test(layout), `${name} has no <script src> tag of its own`);
}
const head = layout.slice(0, layout.indexOf('</head>'));
assert(head.includes(loader), 'the loader is in <head>, before any section');
assert(!/\bsrc=/.test(loader.replace(/<script src="' \+/, '')), 'the loader itself is inline');
checks++;

async function open(browser, opts, {width = 1366, init} = {}) {
  const r = await L.renderPage({live: false, ...opts});
  const ctx = await browser.newContext({viewport: {width, height: 900}});
  const p = await ctx.newPage();
  const requested = [], errors = [];
  let gate = null;
  /* this liquidjs render leaves three of the layout's inline scripts with an empty value (shop, theme id); not this file's subject */
  p.on('pageerror', e => { if (!/^Unexpected token/.test(e.message)) errors.push(e.message); });
  if (init) await p.addInitScript(init);
  await p.route('**/*', async rt => {
    const u = new URL(rt.request().url());
    if (u.hostname !== 'fixture.test') return rt.fulfill({status: 204, body: ''});
    if (u.pathname === '/') return rt.fulfill({contentType: 'text/html', body: r.html});
    if (u.pathname.startsWith('/assets/')) {
      const name = u.pathname.slice(8);
      requested.push(name);
      if (gate && LAZY.includes(name)) await gate;
      const f = path.join(root, 'shopify/assets', name);
      const type = name.endsWith('.css') ? 'text/css' : name.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
      return fs.existsSync(f) ? rt.fulfill({path: f, contentType: type}) : rt.fulfill({status: 404, body: ''});
    }
    if (u.pathname.startsWith('/img/')) return rt.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"/>'});
    return rt.fulfill({status: 204, body: ''});
  });
  await p.goto('https://fixture.test/', {waitUntil: 'load'});
  await p.waitForTimeout(300);
  return {p, ctx, r, requested, errors, hold: () => { let release; gate = new Promise(res => { release = res; }); return () => release(); }};
}
const lazyLoaded = requested => LAZY.filter(n => requested.includes(n));
const bytes = LAZY.reduce((n, f) => n + fs.statSync(path.join(root, 'shopify/assets', f)).size, 0);

/* Every live event the page's own listeners receive, in order, as a script already on the page would. */
const COUNT = () => {
  window.__seen = [];
  for (const type of ['storelib:settings-change', 'storelib:section-load']) document.addEventListener(type, e => window.__seen.push(type.slice(9) + ':' + JSON.stringify(e.detail) + ':' + (e.target === document ? 'document' : e.target.id)));
};
const footerPadding = p => p.evaluate(() => [...document.querySelectorAll('#shopify-section-footer, #shopify-section-footer *')].map(el => getComputedStyle(el).paddingTop));

(async () => {
  const browser = await chromium.launch({executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined, args: ['--no-sandbox']});
  try {
    /* ---------- a visitor ---------- */
    for (const width of [375, 1366]) {
      const t = await open(browser, {design_mode: false}, {width});
      assert.deepEqual(lazyLoaded(t.requested), [], `${width}: a visitor requests none of ${LAZY.join(', ')}`);
      assert(t.requested.includes('live-countdown.js') && t.requested.includes('global.js'), 'the storefront runtimes still load');
      assert.equal(await t.p.evaluate(() => !!window.MateriaLiveFooter), false, 'no builder controller ran');
      assert.equal(await t.p.evaluate(() => document.documentElement.classList.contains('shopify-design-mode')), false, 'not marked as the builder');
      await t.p.waitForTimeout(400);
      assert.deepEqual(lazyLoaded(t.requested), [], 'still none after the page settled');
      await t.ctx.close();
      checks++;
    }
    console.log(`ok a visitor loads none of the ${LAZY.length} builder-only controllers (${bytes} bytes)`);

    /* ---------- a canvas with no design-mode signal: the first live event loads them, the events are replayed once ---------- */
    {
      const t = await open(browser, {design_mode: false}, {init: COUNT});
      const release = t.hold();
      const before = await footerPadding(t.p);
      assert(!before.includes('77px'), 'the footer is not at 77px yet');
      /* three events while the controllers are still downloading */
      await t.p.evaluate(() => {
        document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'footer', settings: {padding_top: 50}, live: true}}));
        document.getElementById('shopify-section-footer').dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: 'footer'}}));
        document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'footer', settings: {padding_top: 77}, live: false}}));
      });
      await t.p.waitForTimeout(200);
      assert.deepEqual(lazyLoaded(t.requested), LAZY, 'the first live event requests every controller');
      assert.deepEqual(await t.p.evaluate(() => window.__seen), [], 'held: no listener has seen them while the controllers load');
      release();
      await t.p.waitForFunction(() => window.__seen.length >= 3 && window.MateriaLiveFooter);
      await t.p.waitForTimeout(250);
      assert.deepEqual(await t.p.evaluate(() => window.__seen), [
        'settings-change:{"section":"footer","settings":{"padding_top":50},"live":true}:document',
        'section-load:{"sectionId":"footer"}:shopify-section-footer',
        'settings-change:{"section":"footer","settings":{"padding_top":77},"live":false}:document',
      ], 'each event reaches a listener already on the page once, in arrival order, on the same target with the same detail');
      assert.equal(await t.p.evaluate(() => [...document.scripts].filter(s => /\/assets\/live-footer\.js$/.test(s.src)).length), 1, 'each controller is added once');
      const order = await t.p.evaluate(() => [...document.scripts].map(s => s.src.split('/').pop()).filter(Boolean));
      assert.deepEqual(order.filter(n => LAZY.includes(n)), LAZY, 'added in the list order');
      assert((await footerPadding(t.p)).includes('77px'), 'the replayed change lands: the footer is painted at 77px');
      assert(await t.p.evaluate(() => document.documentElement.classList.contains('shopify-design-mode')), 'the page is marked as the builder');
      /* after loading, an event goes straight through, once */
      await t.p.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'footer', settings: {padding_top: 31}, live: true}})));
      await t.p.waitForTimeout(150);
      assert.equal(await t.p.evaluate(() => window.__seen.length), 4, 'a later event is seen once');
      assert((await footerPadding(t.p)).includes('31px'), 'and lands at once');
      assert.deepEqual(t.errors, [], 'no page errors');
      await t.ctx.close();
      checks++;
    }
    console.log('ok the first live event loads them in order and replays the held events once each, in order');

    /* ---------- the builder: request.design_mode, and window.Shopify.designMode ---------- */
    const DCL = () => document.addEventListener('DOMContentLoaded', () => { window.__dcl = [...document.scripts].filter(s => s.src).map(s => s.src.split('/').pop()); window.__dclFooter = !!window.MateriaLiveFooter; });
    for (const [label, opts, init] of [['request.design_mode', {design_mode: true}, DCL], ['window.Shopify.designMode', {design_mode: false}, `window.Shopify = {designMode: true}; (${DCL})();`]]) {
      const page = await open(browser, opts, {init});
      assert.deepEqual(lazyLoaded(page.requested), LAZY, `${label}: every controller is requested at once`);
      const dcl = await page.p.evaluate(() => window.__dcl);
      assert.deepEqual(dcl.filter(n => LAZY.includes(n)), LAZY, `${label}: written as scripts while parsing, in order`);
      assert.equal(await page.p.evaluate(() => window.__dclFooter), true, `${label}: they ran before DOMContentLoaded, like the deferred tags`);
      const deferred = await page.p.evaluate(names => names.map(n => [...document.scripts].find(s => s.src.endsWith('/' + n))?.defer), LAZY);
      assert(deferred.every(Boolean), `${label}: each is a deferred script`);
      const before = await footerPadding(page.p);
      await page.p.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'footer', settings: {padding_top: 66}, live: true}})));
      await page.p.waitForTimeout(150);
      assert(!before.includes('66px') && (await footerPadding(page.p)).includes('66px'), `${label}: the first live change lands at once`);
      assert.deepEqual(page.errors, [], `${label}: no page errors`);
      await page.ctx.close();
      checks++;
      console.log(`ok ${label}: loaded at once, in order, before DOMContentLoaded`);
    }
  } finally { await browser.close(); }
  console.log(`theme-builder-scripts-lazy: ${checks} checks passed (${LAZY.length} controllers, ${bytes} bytes no longer loaded for visitors)`);
})().catch(e => { console.error(e); process.exit(1); });
