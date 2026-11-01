/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-r5-header-saved.cjs
   Round 5, header group: the saved header group (sections/header-group.json:
   Announcement Bar Pro 3 + Header, with the saved main menu, mega menu
   banner and phone menu banner) looks the same before and after this round.
   The page is rendered twice, once with the files before round 5 (commit 2002b49) and once with the
   working tree, at 375 and 1366, closed, with the phone menu drawer and its
   Home submenu open (375) and with the Home mega menu open (1366). Every
   element of both sections is compared: box, computed colours, type,
   borders, spacing, layout and its text. */
const assert = require('node:assert/strict');
const L = require('./theme-r5-header-lib.cjs');
if (!L.Liquid) { console.log('0 saved header checks (render skipped: set LIQUIDJS=<path to liquidjs>)'); process.exit(0); }
const {chromium} = require('playwright');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const SECTIONS = ['#shopify-section-top_bar_KEfgRp', '#shopify-section-header'];

async function state(browser, old, width, mode) {
  const {p, ctx, errors} = await L.open(browser, {old}, width);
  if (mode === 'drawer') {
    await p.locator('button.nav-toggle').click();
    await p.waitForTimeout(800);
    const t = p.locator('.navigation.mobile .horizontal-list > .level0 > menu-item', {hasText: 'Home'}).locator('> open-children-toggle');
    if (await t.count()) { await t.click(); await p.waitForTimeout(800); }
  }
  if (mode === 'mega') {
    await p.locator('.navigation:not(.mobile) .horizontal-list > .level0 > menu-item > a', {hasText: 'Home'}).first().hover();
    await p.waitForTimeout(800);
  }
  const sig = [];
  for (const s of SECTIONS) sig.push(...(await L.signature(p, s, false)).map(r => s + ' ' + r));
  const extra = await p.evaluate(() => ({scroll: document.documentElement.scrollWidth, active: document.querySelector('announcement-rotator-v2')?.dataset.activeIndex}));
  await ctx.close();
  return {sig, errors, extra};
}

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    for (const [width, mode] of [[375, 'closed'], [375, 'drawer'], [1366, 'closed'], [1366, 'mega']]) {
      const a = await state(browser, true, width, mode), b = await state(browser, false, width, mode);
      const d = L.diff(a.sig, b.sig);
      ok(a.sig.length > 100 && a.sig.length === b.sig.length, `${width} ${mode}: same elements (${a.sig.length} / ${b.sig.length})`);
      ok(d.length === 0, `${width} ${mode}: every element looks the same\n` + d.slice(0, 6).map(x => JSON.stringify(x)).join('\n'));
      ok(b.extra.scroll <= width + 1, `${width} ${mode}: no sideways scroll`);
      ok(JSON.stringify(a.errors) === JSON.stringify(b.errors), `${width} ${mode}: no new page errors (${b.errors.join('; ')})`);
      ok(b.extra.active === '0', `${width} ${mode}: the message rotator runs from the controller`);
    }
  } finally { await browser.close(); }
  console.log(`${checks} saved header group checks passed (old vs new at 375 and 1366, drawer and mega menu open)`);
})().catch(e => { console.error(e); process.exit(1); });
