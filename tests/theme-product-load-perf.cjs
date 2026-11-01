// Product page load: style work the page caused itself while loading.
//
// Measured on /products/pants-down (cached replay, 1366px): 2.9 s of style
// recalculation and ~1.1-1.6 s of blocking time before, ~0.4 s and ~0.13 s
// after. Three causes, each fixed without changing what the page shows:
//
// 1. sections/main-product.storelib placed the sticky columns under the header
//    with body:has(.shopify-section-header-sticky:not(.shopify-section-header-hidden))
//    and body:has(header.header[data-sticky='always']). A body:has() makes the
//    browser re-style the whole page (~1600 elements) on any DOM change while it
//    loads. They key off attributes now: data-header-stuck / data-header-hidden,
//    which the header's sticky script writes on <html> with the header's own
//    classes, and data-mp-header-always, which the section's script keeps on its
//    root while any header.header[data-sticky='always'] is on the page.
// 2. main-product.js renameBuyNow rewrote "Buy Now" with "Buy Now" every 100ms
//    for 3s (the pattern matches its own result), replacing the text node each
//    time: 30 page-wide re-styles. It leaves a label that already reads Buy Now.
// 3. materia-popups.js wrote --materia-bottom-inset: 0px on <html> in the first
//    frame (a whole-page re-style). Every rule reads it as
//    var(--materia-bottom-inset, 0px), so 0px is left unset; any other value is
//    written as before, and the event still fires.
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
let checks = 0;

/* ---------- static ---------- */
const section = read('sections/main-product.storelib');
const markup = section.split('</template>')[0];
const uncommented = markup.replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
assert(!/:has\(/.test(uncommented.slice(0, uncommented.indexOf('</style>'))), 'main-product: no :has() in the sticky rules');
assert(markup.includes("html[data-header-stuck]:not([data-header-hidden]) #shopify-section-{{ section.id }},"), 'main-product: stuck and not hidden, from <html>');
assert(markup.includes('#shopify-section-{{ section.id }}[data-mp-header-always] {'), 'main-product: always-sticky header, from the root attribute');
const ctl = read('snippets/header-sticky-controller.storelib');
for (const a of ['data-header-stuck', 'data-header-hidden']) assert(ctl.includes(`'${a}'`), `the header's sticky script writes ${a}`);
checks++;
const mainJs = read('shopify/assets/main-product.js');
assert(/if \(target\.textContent === TARGET\) return;/.test(mainJs), 'renameBuyNow leaves a label that already reads Buy Now');
const popups = read('shopify/assets/materia-popups.js');
assert(/now === '' && v === '0px'/.test(popups), 'materia-popups leaves a 0px bottom inset unset');
// Unset and 0px are the same only while every use falls back to 0px and no other script reads it.
let uses = 0;
for (const dir of ['sections', 'snippets', 'blocks', 'layout', 'shopify/assets']) for (const f of fs.readdirSync(path.join(root, dir))) {
  const t = fs.readFileSync(path.join(root, dir, f), 'utf8');
  for (const u of t.match(/var\(--materia-bottom-inset[^)]*\)/g) || []) { uses++; assert(/,\s*0px\)$/.test(u), `${dir}/${f}: ${u} falls back to 0px`); }
  if (f !== 'materia-popups.js') assert(!/getPropertyValue\(\s*['"]--materia-bottom-inset/.test(t), `${dir}/${f} reads --materia-bottom-inset from script`);
}
assert(uses >= 6, 'the bottom inset uses were found');
checks++;

// The section's style and script as Storelib renders them (section id "main").
const fragment = markup.slice(markup.indexOf('<style data-mp-sticky>'), markup.indexOf('</script>') + 9)
  .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '')
  .replace(/\{\{ section\.id \}\}/g, 'main')
  .replace(/\{\{ section\.settings\.sticky_top_gap \| default: 24 \}\}/g, '24')
  .replace(/\{% if section\.settings\.enable_sticky_content_on_desktop %\}true\{% else %\}false\{% endif %\}/g, 'true');
assert(!/\{[{%]/.test(fragment), 'fragment fully rendered');

(async () => {
  const b = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  // 800px: the script does not write --mp-header-live inline below 1025px, so the rules decide.
  const p = await b.newPage({viewport: {width: 800, height: 700}});
  const original = `<style>#ref{--mp-header-h:var(--header-bar-height,64px);--mp-header-live:var(--sl-header-offset,0px)}
    body:has(.shopify-section-header-sticky:not(.shopify-section-header-hidden)) #ref,
    body:has(header.header[data-sticky='always']) #ref{--mp-header-live:calc(var(--sl-header-offset, 0px) + var(--mp-header-h))}</style>`;
  await p.setContent(`<!doctype html><html><head><style>:root{--sl-header-offset:12px;--header-bar-height:70px}</style>${original}</head><body>
    <div id="shopify-section-header" class="shopify-section section-header"><header class="header" data-sticky="on-scroll-up"></header></div>
    <section id="shopify-section-main" class="shopify-section">${fragment}<div class="product">x</div></section><div id="ref"></div></body></html>`);
  const state = () => p.evaluate(() => new Promise(r => requestAnimationFrame(() => r({
    now: getComputedStyle(document.getElementById('shopify-section-main')).getPropertyValue('--mp-header-live').trim(),
    was: getComputedStyle(document.getElementById('ref')).getPropertyValue('--mp-header-live').trim()}))));
  // What the header's sticky script writes together: the section's classes and the same state on <html>.
  const set = (o) => p.evaluate(o => {
    const s = document.getElementById('shopify-section-header'), h = document.documentElement;
    if ('stuck' in o) { s.classList.toggle('shopify-section-header-sticky', o.stuck); h.toggleAttribute('data-header-stuck', o.stuck); }
    if ('hidden' in o) { s.classList.toggle('shopify-section-header-hidden', o.hidden); h.toggleAttribute('data-header-hidden', o.hidden); }
    if ('sticky' in o) { const hd = document.querySelector('header.header'); if (hd) hd.dataset.sticky = o.sticky; }
  }, o);
  const same = async (label, expectOn) => {
    const s = await state();
    assert.equal(s.now, s.was, `${label}: ${s.now} where body:has() gave ${s.was}`);
    assert.equal(s.now !== '12px', expectOn, `${label}: header line ${expectOn ? 'added' : 'not added'}`);
  };
  await same('top of the page', false);
  await set({stuck: true}); await same('stuck', true);
  await set({hidden: true}); await same('stuck and hidden', false);
  await set({hidden: false, stuck: false}); await same('back at the top', false);
  await set({sticky: 'always'}); await same('always sticky', true);
  await set({stuck: true, hidden: true}); await same('always sticky, hidden state', true);
  await set({sticky: 'none', stuck: false, hidden: false}); await same('not sticky', false);
  checks++;
  // A header drawn again (builder) or removed: the attribute follows.
  await p.evaluate(() => { const s = document.getElementById('shopify-section-header'); s.innerHTML = '<header class="header" data-sticky="always"></header>'; });
  await same('redrawn header, always', true);
  await p.evaluate(() => document.querySelector('header.header').classList.remove('header'));
  await same('header class removed', false);
  await p.evaluate(() => document.querySelector('header').classList.add('header'));
  await same('header class back', true);
  await p.evaluate(() => document.getElementById('shopify-section-header').remove());
  await same('header removed', false);
  await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = '<div><header class="header" data-sticky="always"></header></div>'; document.body.prepend(d); });
  await same('header added inside a wrapper', true);
  checks++;
  // An always-sticky header present when the section is parsed: right from the first paint.
  await p.setContent(`<!doctype html><html><head><style>:root{--sl-header-offset:12px;--header-bar-height:70px}</style>${original}</head><body>
    <div class="shopify-section section-header"><header class="header" data-sticky="always"></header></div>
    <section id="shopify-section-main" class="shopify-section">${fragment}<script>window.__atParse = getComputedStyle(document.getElementById('shopify-section-main')).getPropertyValue('--mp-header-live').trim();</script></section><div id="ref"></div></body></html>`);
  assert.equal(await p.evaluate(() => window.__atParse), 'calc(12px + 70px)', 'always-sticky header applies while the page is parsed');
  await same('loaded with an always-sticky header', true);
  checks++;

  // renameBuyNow: shortened once, then left alone.
  const q = await b.newPage();
  await q.setContent(`<!doctype html><body><div class="product-form__buttons"><button class="shopify-payment-button__button"><span class="btn-label">Buy it now</span></button>
    <button class="shopify-payment-button__button"><span class="btn-label">  Buy Now  </span></button></div></body>`);
  await q.evaluate(() => { window.__writes = 0; new MutationObserver(r => { window.__writes += r.length; }).observe(document.body, {subtree: true, childList: true, characterData: true}); });
  await q.addScriptTag({content: mainJs});
  await q.waitForTimeout(150);
  assert.deepEqual(await q.$$eval('.btn-label', l => l.map(x => x.textContent)), ['Buy Now', 'Buy Now'], 'Buy it now and a padded Buy Now both read Buy Now');
  const after = await q.evaluate(() => window.__writes);
  await q.waitForTimeout(1200);
  assert.equal(await q.evaluate(() => window.__writes), after, 'no rewrites of a label that already reads Buy Now');
  await q.evaluate(() => { document.querySelector('.btn-label').textContent = 'Buy it now'; });
  await q.waitForTimeout(250);
  assert.equal(await q.$eval('.btn-label', l => l.textContent), 'Buy Now', 'a label drawn again is shortened again');
  checks++;
  await b.close();
  console.log(`product-load-perf: ${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
