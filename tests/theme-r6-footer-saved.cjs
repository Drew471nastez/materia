/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-r6-footer-saved.cjs
   Round 6, footer and phone navigation: the saved footer group
   (sections/footer-group.json) and the overlay group's Mobile navigation bar
   look the same before (c098384) and after this round, at 375 and 1366, on
   the storefront and in the builder: closed, and at 375 with a footer column
   opened by a tap (the phone accordion). Every element of both sections is
   compared: box, computed colours, type, borders, spacing, layout and text.
   The saved footer carries a custom Big text colour (#222a48), which now
   applies under Enable custom styling: it is compared with
   enable_custom_style true (the value the lead sets in footer-group.json),
   and without it only that one colour may change. */
const assert = require('node:assert/strict');
const L = require('./theme-r6-footer-lib.cjs');
if (!L.Liquid) { console.log('0 saved footer checks (render skipped: set LIQUIDJS=<path to liquidjs>)'); process.exit(0); }
const {chromium} = require('playwright');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const SECTIONS = ['#shopify-section-footer', '#shopify-section-mobile_navigation_bar_GG8UWc'];
const TOGGLE = {enable_custom_style: true};

async function state(browser, opts, width, mode) {
  const {p, ctx, errors} = await L.open(browser, opts, width);
  if (mode === 'open') {
    const t = p.locator('#shopify-section-footer [data-footer-acc-toggle]').nth(1);
    await t.tap();
    await p.waitForTimeout(700);
  }
  const sig = [];
  for (const s of SECTIONS) sig.push(...(await L.signature(p, s, false)).map(r => s + ' ' + r));
  const extra = await p.evaluate(() => ({
    /* the widest edge of anything the footer or the bar draws (the layout's closed cart drawer sits off screen on purpose) */
    scroll: Math.max(0, ...[...document.querySelectorAll('#shopify-section-footer *, #shopify-section-mobile_navigation_bar_GG8UWc *')].filter(e => !e.closest('[hidden], .visually-hidden, template') && e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().right))),
    expanded: [...document.querySelectorAll('#shopify-section-footer [data-footer-acc-toggle]')].map(b => b.getAttribute('aria-expanded')).join(','),
    pad: getComputedStyle(document.body).paddingBottom,
  }));
  await ctx.close();
  return {sig, errors, extra};
}

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    for (const design_mode of [false, true]) for (const [width, mode] of [[375, 'closed'], [375, 'open'], [1366, 'closed']]) {
      const tag = `${width} ${mode}${design_mode ? ' builder' : ''}`;
      const a = await state(browser, {old: true, design_mode}, width, mode);
      const b = await state(browser, {design_mode, footer: TOGGLE}, width, mode);
      /* Two looks changed on purpose since c098384 (the creator's builder edit, 0674ef4): the
         mobile accordion arrow is drawn at Column arrow size (14px) instead of filling its box,
         and the saved Badges area width (33.333%) now caps the payment badges on desktop. */
      const intended = ([, x, y]) => {
        const A = String(x).split('|'), B = String(y).split('|');
        const ch = A.map((v, k) => [v, B[k]]).filter(([u, w]) => u !== w);
        if (A[0].endsWith(' svg')) return ch.every(([u, w]) => u === '100%' && w === '14px');
        /* On touch screens the store contact links carry an invisible 44px touch layer (materia-experience.css),
           which needs position: relative on the link; nothing moves on screen. */
        if (/(^| )A$/.test(A[0]) && ch.length) return ch.every(([u, w]) => (u === 'static' && w === 'relative') || (u === 'auto' && w === '0px'));
        if (A[0].endsWith(' DIV')) return ch.some(([u, w]) => u === '100%' && w === '33.333%') && ch.every(([u, w]) => (u === '100%' && w === '33.333%') || (/^-?[\d.]+(px)?$/.test(u) && /^-?[\d.]+(px)?$/.test(w)));
        return false;
      };
      const d = L.diff(a.sig, b.sig).filter(e => !intended(e));
      ok(a.sig.length > 60 && a.sig.length === b.sig.length, `${tag}: same elements (${a.sig.length} / ${b.sig.length})`);
      ok(d.length === 0, `${tag}: every element looks the same\n` + L.explain(d));
      ok(a.extra.expanded === b.extra.expanded, `${tag}: accordion state the same (${a.extra.expanded} / ${b.extra.expanded})`);
      if (width === 375 && mode === 'open') ok(/true/.test(b.extra.expanded), `${tag}: a tap opens a footer column`);
      ok(a.extra.pad === b.extra.pad, `${tag}: the page keeps the bar's room at the bottom (${b.extra.pad})`);
      ok(b.extra.scroll <= Math.max(width + 1, a.extra.scroll), `${tag}: nothing wider than before (${b.extra.scroll} / ${a.extra.scroll}; the layout's closed cart drawer widens this harness page)`);
      ok(b.errors.every(m => a.errors.includes(m)), `${tag}: no new page errors (${b.errors.filter(m => !a.errors.includes(m)).join('; ')})`);
      if (mode === 'closed') {
        /* Without the toggle only the Big text colour falls back to the scheme heading colour. */
        const c = await state(browser, {design_mode, footer: {enable_custom_style: false}}, width, mode);
        const dc = L.diff(b.sig, c.sig);
        ok(dc.length >= 1 && dc.every(([i]) => /footer__custom-text|DIV/.test(b.sig[i]) && b.sig[i].includes('Prime1')), `${tag}: without Enable custom styling only the Big text differs\n` + L.explain(dc));
      }
    }
  } finally { await browser.close(); }
  console.log(`${checks} saved footer group checks passed (old vs new at 375 and 1366, storefront and builder, a footer column opened)`);
})().catch(e => { console.error(e); process.exit(1); });
