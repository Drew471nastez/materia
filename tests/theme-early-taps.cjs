/* On a slow connection the menu and search buttons are on screen before the
   theme's deferred scripts have run. layout/theme holds a tap on one of them
   and gives it again once DOMContentLoaded has fired (after every deferred
   script), so the first tap opens the menu instead of doing nothing. Links
   are not held, a tap after the page is ready is not touched, and a tap is
   given once only. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const layout = fs.readFileSync(path.join(__dirname, '..', 'layout/theme.storelib'), 'utf8');
const early = layout.match(/\/\/ A tap on the menu or search button[\s\S]*?\}\)\(\);/);
assert(early, 'layout/theme holds early taps');
const head = layout.slice(0, layout.indexOf('</head>'));
assert(head.includes(early[0]), 'the early tap script is in the head, before the header');

// The theme's own handlers, as theme.js wires them: one listener on document.
const LATE = `window.taps = {menu: 0, search: 0};
document.addEventListener('click', e => {
  if (e.target.closest('.nav-toggle')) { taps.menu++; document.documentElement.classList.toggle('nav-open'); }
  if (e.target.closest('.top-search-toggle')) { taps.search++; document.documentElement.classList.toggle('open-search'); }
});`;
const PAGE = `<!doctype html><html class="no-js"><head><script>${early[0]}
document.addEventListener('DOMContentLoaded', () => { window.ready = true; });</script>
<script src="https://theme.test/theme.js" defer></script></head><body>
<header><button class="nav-toggle" type="button" aria-label="Menu">=</button>
<button class="btn-reset top-search-toggle" type="button" aria-label="Search">?</button>
<a class="cart-link" href="#cart">Cart</a></header>
<main style="height:2000px"></main></body></html>`;

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  let checks = 0;
  try {
    const run = async (before) => {
      const ctx = await browser.newContext({viewport: {width: 375, height: 800}, hasTouch: true, isMobile: true});
      const p = await ctx.newPage();
      let release; const held = new Promise(r => { release = r; });
      await p.route('https://theme.test/page', r => r.fulfill({status: 200, contentType: 'text/html', body: PAGE}));
      await p.route('https://theme.test/theme.js', async r => { await held; r.fulfill({status: 200, contentType: 'text/javascript', body: LATE}); });
      p.goto('https://theme.test/page', {waitUntil: 'commit'}).catch(() => {});
      await p.waitForSelector('.nav-toggle');
      assert.equal(await p.evaluate(() => !!window.ready), false, 'the deferred script has not run yet');
      await before(p);
      release();
      await p.waitForFunction(() => window.ready);
      await p.waitForTimeout(150);
      const out = await p.evaluate(() => ({taps: window.taps, cls: document.documentElement.className, hash: location.hash, busy: document.querySelectorAll('[aria-busy]').length}));
      await ctx.close();
      return out;
    };
    let r = await run(p => p.tap('.nav-toggle'));
    assert.deepEqual(r.taps, {menu: 1, search: 0}, 'an early menu tap opens the menu once the script runs');
    assert.match(r.cls, /nav-open/); assert.equal(r.busy, 0); checks++;
    r = await run(async p => { await p.tap('.nav-toggle'); await p.tap('.top-search-toggle'); });
    assert.deepEqual(r.taps, {menu: 0, search: 1}, 'only the last early tap is given, once');
    checks++;
    r = await run(p => p.tap('.cart-link'));
    assert.equal(r.hash, '#cart', 'a link works at once'); assert.deepEqual(r.taps, {menu: 0, search: 0}); checks++;
    // After the page is ready a tap reaches the theme directly, once.
    const ctx = await browser.newContext({viewport: {width: 375, height: 800}, hasTouch: true});
    const p = await ctx.newPage();
    await p.route('https://theme.test/page', rr => rr.fulfill({status: 200, contentType: 'text/html', body: PAGE}));
    await p.route('https://theme.test/theme.js', rr => rr.fulfill({status: 200, contentType: 'text/javascript', body: LATE}));
    await p.goto('https://theme.test/page');
    await p.tap('.nav-toggle'); await p.waitForTimeout(50);
    assert.deepEqual(await p.evaluate(() => window.taps), {menu: 1, search: 0}, 'a tap after the page is ready is not held');
    await ctx.close(); checks++;
  } finally { await browser.close(); }
  console.log(`theme-early-taps: ${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
