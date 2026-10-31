// Sticky columns (.sticky.top-30: product gallery and information, featured
// product) sit under the sticky header. The header's sticky script marks
// <html> (data-header-stuck / -hidden / -layout-2) and theme.css follows it,
// instead of body:has(.shopify-section-header-sticky), which made the browser
// re-style the whole page on every class change while it loaded (~6 s of
// style work on the home page).
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const css = read('shopify/assets/theme.css'), ctl = read('snippets/header-sticky-controller.storelib');
assert(!/body:has\(\.(layout-2\.)?shopify-section-header-(sticky|hidden)\)/.test(css), 'no body:has() on the header state');
for (const a of ['data-header-stuck', 'data-header-hidden', 'data-header-layout-2']) assert(ctl.includes(`'${a}'`), `the sticky script writes ${a}`);
(async () => {
  const b = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  const p = await b.newPage();
  const block = css.match(/html\[data-header-stuck\] \.sticky\.top-30 \{[\s\S]*?html\[data-header-hidden\] \.sticky\.top-30 \{[^}]*\}/)[0];
  await p.setContent(`<style>:root{--height-header:90px}.sticky{position:sticky}.top-30{top:30px}${block}</style><div class="sticky top-30" id="s">x</div>`);
  const top = () => p.$eval('#s', el => getComputedStyle(el).top);
  const set = (attrs) => p.evaluate(a => { for (const n of ['data-header-stuck', 'data-header-hidden', 'data-header-layout-2']) document.documentElement.toggleAttribute(n, a.includes(n)); }, attrs);
  await set([]); assert.equal(await top(), '30px', 'header not stuck: 30px');
  await set(['data-header-stuck']); assert.equal(await top(), '120px', 'stuck: header height + 30px');
  await set(['data-header-stuck', 'data-header-layout-2']); assert.equal(await top(), '80px', 'layout 2 stuck: 80px');
  await set(['data-header-stuck', 'data-header-hidden']); assert.equal(await top(), '30px', 'hidden on scroll: 30px');
  await b.close();
  console.log('sticky-under-header: 7 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
