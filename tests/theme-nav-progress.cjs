/* Run: node tests/theme-nav-progress.cjs
   The thin bar shown from a click on a link to another page until that page is shown
   (shopify/assets/theme-navigation.js): it appears for a normal same-site link, stays out of the
   way (transform only, no pointer events), and is not drawn for a link something else handled
   (preventDefault), a link to the same page, a new tab, or in the builder. */
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const nav = fs.readFileSync(path.join(__dirname, '../shopify/assets/theme-navigation.js'), 'utf8');
const page = (title, extra = '') => `<!doctype html><html><head><title>${title}</title></head><body>${extra}<a id="go" href="/slow" data-no-prefetch>Slow page</a> <a id="drawer" href="/other">Drawer</a> <a id="hash" href="#x">Here</a> <a id="tab" href="/other" target="_blank">Tab</a><script>document.getElementById('drawer').addEventListener('click', e => e.preventDefault());</script><script>${nav}</script></body></html>`;
(async () => {
  let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  await ctx.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.pathname === '/slow') { await new Promise(res => setTimeout(res, 1500)); return r.fulfill({contentType: 'text/html', body: page('Arrived')}); }
    if (u.pathname === '/builder') return r.fulfill({contentType: 'text/html', body: page('Builder', '<script>document.documentElement.classList.add("shopify-design-mode")</script>')});
    return r.fulfill({contentType: 'text/html', body: page('Start')});
  });
  const p = await ctx.newPage();
  const bar = () => p.evaluate(() => { const b = document.querySelector('.materia-nav-bar'); return b ? getComputedStyle(b).pointerEvents + ' ' + getComputedStyle(b).position : null; });
  await p.goto('https://site.test/'); await p.waitForTimeout(200);
  for (const id of ['drawer', 'hash']) { await p.click('#' + id); await p.waitForTimeout(150); ok(await bar() === null, `no bar for the ${id} link`); }
  await p.click('#tab', {modifiers: []}).catch(() => {}); await p.waitForTimeout(150); ok(await bar() === null, 'no bar for a new-tab link');
  for (const pg of ctx.pages()) if (pg !== p) await pg.close();
  const t = Date.now();
  /* window.name outlives the page change: it records the bar as it is drawn on the page being left */
  let seen = null; await p.exposeFunction('__barSeen', v => { seen = seen || v; });
  await p.evaluate(() => { new MutationObserver(() => { const b = document.querySelector('.materia-nav-bar'); if (b) window.__barSeen(getComputedStyle(b).pointerEvents + ' ' + getComputedStyle(b).position); }).observe(document.documentElement, {childList: true}); });
  await p.click('#go', {noWaitAfter: true});
  await p.waitForFunction(() => document.title === 'Arrived', null, {timeout: 10000});
  ok(seen === 'none fixed', 'the bar showed while the next page loaded, with no pointer events');
  ok(await bar() === null, 'the arriving page has no bar');
  await p.goBack(); await p.waitForTimeout(300); ok(await bar() === null, 'no bar after Back');
  seen = null; await p.goto('https://site.test/builder'); await p.waitForTimeout(200); await p.evaluate(() => { new MutationObserver(() => { const b = document.querySelector('.materia-nav-bar'); if (b) window.__barSeen('drawn'); }).observe(document.documentElement, {childList: true}); }); await p.click('#go', {noWaitAfter: true}); await p.waitForFunction(() => document.title === 'Arrived', null, {timeout: 10000}); ok(seen === null, 'no bar in the builder');
  await browser.close();
  console.log(checks + ' navigation progress bar checks passed');
})().catch(e => { console.error(e); process.exit(1); });
