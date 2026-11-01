/* Round 6, Collection products (sections/main-collection-product.storelib,
   templates/collection.json) with the real theme priority rules and
   shopify/assets/live-collection-pages.js. Filtering, sorting and pagination
   are covered by tests/theme-collection-round3.cjs, round4 and
   theme-search-collection.cjs (shopify/assets/collection.js asks the section
   for its parts with ?section_id=); this file checks the round 6 bar.

   1. Schema: every id at c098384 kept, the shared group order, plain labels.
   2. The settings that apply live (scheme, width, products per row, gap,
      padding, products per row on phones, the empty collection button): a
      redraw looks different, live looks like the redraw, the old value
      restores it, at 375 and 1366.
   3. First paint equals the hydrated paint; two instances independent; the
      section's parts collection.js swaps are still marked.
   4. The saved instance looks as it did.

   LIQUIDJS=<path to liquidjs> node tests/theme-r6-collection-pages-products.cjs */
const L = require('./theme-r6-collection-pages-lib.cjs');
const {PANTS, OTHER, TALL} = require('./media-fixture.cjs');
const {ok, eq, frames, counter} = L;
const NAME = 'main-collection-product';
const only = process.argv.slice(2);
const COLL = {title: 'Pants & Jeans', handle: 'pants', url: '/collections/pants', products: [PANTS, OTHER, TALL, OTHER, PANTS], products_count: 5, all_products_count: 5, filters: [], sort_by: '', sort_options: []};
const G = {template: 'collection', collection: COLL, collections: {all: COLL}, content_for_header: ''};
const EMPTY = {template: 'collection', collection: {...COLL, products: [], products_count: 0}, collections: {all: COLL}, content_for_header: ''};
const BASE = {enable_filtering: false};

const sig = page => page.evaluate(() => {
  const R = document.querySelector('#shopify-section-test [data-lcp]');
  if (!R) return null;
  const cs = (el, p) => el ? Object.fromEntries(p.map(k => [k, getComputedStyle(el)[k]])) : null;
  const items = [...R.querySelectorAll('#product-grid > .grid__item')];
  const a = R.querySelector('.facets-empty__action');
  return {cls: [...R.classList].sort().join(' '), inner: R.querySelector(':scope > grid-list > div')?.className, root: cs(R, ['backgroundColor', 'paddingTop', 'paddingBottom']),
    rows: [...new Set(items.map(c => Math.round(c.getBoundingClientRect().top)))].length, w: items[0] && Math.round(items[0].getBoundingClientRect().width), x2: items[1] && Math.round(items[1].getBoundingClientRect().left),
    empty: a && [a.textContent.trim(), a.getAttribute('href')]};
});

(async () => {
  L.schemaChecks(NAME, ['General', 'Content', 'Layout', 'Desktop spacing', 'Mobile']);
  const browser = await L.launch();
  try {
    const r = await L.render(NAME, {editing: false, settings: {}, globals: G});
    ok(/data-facets-part="results"/.test(r.html) && /<facets-root[^>]*data-section-id="test"/.test(r.html), 'collection.js still finds its parts');
    ok(/data-lcp="main-collection-product"/.test(r.html), 'the controller hook');
    if (!only.length || only.includes('life')) {
      await L.firstPaint(browser, NAME, {settings: BASE, globals: G, sig});
      await L.firstPaint(browser, NAME, {settings: {...BASE, items_per_row: 3, column_gap: 10, padding_top: 40, items_per_row_mobile: '1'}, globals: G, sig, label: 'custom '});
      await L.twoInstances(browser, NAME, {settings: BASE, globals: G, edit: {padding_top: 60, items_per_row: 2}, read: (t, uid) => t.page.evaluate(uid => getComputedStyle(document.querySelector('#shopify-section-' + uid + ' [data-lcp]')).paddingTop, uid)});
    }
    if (!only.length || only.includes('saved')) {
      const sec = JSON.parse(L.read('templates/collection.json')).sections['main-collection-product'];
      await L.saved(browser, NAME, {inst: {settings: {...sec.settings, enable_filtering: false}, blocks: []}, globals: G, assets: ['collection-page.css'], label: 'templates/collection.json (grid)', look: page => page.evaluate(() => {
        const R = document.querySelector('#shopify-section-S section'), r = el => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
        return {root: ['backgroundColor', 'paddingTop', 'paddingBottom'].map(k => getComputedStyle(R)[k]), items: [...R.querySelectorAll('#product-grid > .grid__item')].map(r), toolbar: R.querySelector('[data-facets-part="toolbar"], .facets__toolbar') ? r(R.querySelector('[data-facets-part="toolbar"], .facets__toolbar')) : null};
      })});
    }
    if (!only.length || only.includes('sweep')) {
      await L.sweep(browser, NAME, {base: BASE, globals: G, sig, assets: ['collection-page.css', L.CTRL], only: ['color_scheme', 'section_width', 'items_per_row', 'column_gap', 'padding_top', 'padding_bottom', 'items_per_row_mobile'],
        same: {375: new Set(['items_per_row', 'column_gap']), 1366: new Set(['items_per_row_mobile']), all: new Set(['section_width:stretch_width'])}, lenientSame: true});
      await L.sweep(browser, NAME, {globals: EMPTY, sig, only: ['empty_link_label', 'empty_link_url'], values: {empty_link_url: ['/pages/edited']}});
    }
  } finally { await browser.close(); }
  console.log(counter.checks + ' collection products round 6 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
