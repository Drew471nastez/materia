/* Run: node tests/theme-collection-round3.cjs
   The collection page, round 3, one group per point the creator raised:
   1. The builder's canvas draws the collection's own filter groups (no
      "Filter preview" sentence): without the platform's filter data,
      snippets/facets-panel builds availability, price, each option, product
      type and brand from the collection's products (read whole through
      all_products when a product arrives without its variants), as the
      platform's own filter links, so they filter and look like the live ones.
   2. Filters never depend on a class, a script or a cache to show: the
      sidebar and the drawer work with scripts off and without the editor
      class; a page shown from the back/forward cache comes back closed and
      unlocked; a section drawn again in the builder works at once.
   3. The drawer: slides on translate with a fading shade, holds the page
      still without a sideways jump, keeps focus inside (Tab, Shift+Tab),
      closes on Escape with focus back on Filter, fits 375px with its own
      scroll and the safe areas, stops moving under reduced motion; the
      computer sidebar sticks under a sticky header (round 4: with no scrollbar of
      its own).
   4. Filter is a theme button: data-theme-button, .btn-secondary, and its
      size, corners and colours follow Theme settings > Buttons; it opens
      the drawer every time.
   5. main-collection-heading: image, collection image, placeholder (builder
      only), overlay, alignment, padding, height, colour scheme, heading,
      heading size, description, breadcrumb settings, section width, blocks
      selectable in the canvas.
   Rendered with the real templates through the Liquid subset in
   tests/theme-search-collection.cjs and drawn in Chromium with the theme's
   CSS and shopify/assets/collection.js. LIVE=0 skips the live site checks. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('module');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const LIVE = 'https://andrewrullz.storelib.com';

// The real-template renderer, without starting its own test run.
const helperPath = path.join(__dirname, 'theme-search-collection.cjs'), helperSource = fs.readFileSync(helperPath, 'utf8');
const helper = new Module(helperPath, module); helper.filename = helperPath; helper.paths = module.paths;
helper._compile(helperSource.slice(0, helperSource.indexOf('(async () => {')) + '\nmodule.exports={renderTemplate,templateOf,sectionSettings,config,stubs,shop,themeRoot,CATALOGUE};', helperPath);
const h = helper.exports;
const env = () => ({stubs: h.stubs, files: {}, rendered: new Set()});

/* ───────────── Fixtures ───────────── */
const TYPES = ['Pants & Jeans', 'Shirts & Tops'];
const FULL = h.CATALOGUE.map((p, k) => ({...p, type: TYPES[k % 2], available: k !== 3, price_max: p.price}));
// What the builder's canvas hands the section: the collection's products
// without their variants (one default "Title" option), and no filter data.
const LIGHT = FULL.map(p => ({...p, options_with_values: [{name: 'Title', values: ['Default Title']}], has_only_default_variant: true, variants: [p.variants[0]]}));
const ALL_PRODUCTS = Object.fromEntries(FULL.map(p => [p.handle, p]));
const SECTION_FILE = 'sections/main-collection-product.storelib';
const SAVED = JSON.parse(read('templates/collection.json')).sections['main-collection-product'].settings;

function renderCollection({products = LIGHT, filters = [], layout = 'vertical', editor = true, blocks = [], allProducts = ALL_PRODUCTS, extra = {}} = {}) {
  const settings = h.sectionSettings(SECTION_FILE, {...SAVED, enable_filtering: true, filter_layout: layout, default_filter: 'open_all', show_filter_counts: true, ...extra});
  const collection = {title: 'All products', url: '/collections/all', products, products_count: products.length, filters, sort_options: [{value: 'manual', name: 'Featured'}, {value: 'price-ascending', name: 'Price, low to high'}], sort_by: null, default_sort_by: 'manual'};
  const html = h.renderTemplate(h.templateOf(read(SECTION_FILE)), {
    settings: h.config, section: {id: 'main-collection-product', settings, blocks}, collection, collections: {}, all_products: allProducts,
    request: {design_mode: editor, locale: {iso_code: 'en'}, host: 'shop.test'}, routes: {all_products_collection_url: '/collections/all'},
    cart: {currency: {symbol: '€'}}, template: 'collection', pages: {}, content_for_header: '', __page: 1, __url: 'https://shop.test/collections/all',
  }, env());
  return `<div id="shopify-section-main-collection-product" class="shopify-section">${html}</div>`;
}
const CSS = ['critical.css', 'theme.css', 'theme-button-contract.css', 'collection-page.css'].map(f => read('shopify/assets/' + f)).join('\n');
const COLLECTION_JS = read('shopify/assets/collection.js');
// The theme's fluid rate, as the layout writes it (1px at 1600px wide).
const ROOT_VARS = `:root{--responsive-rate:((100vw - 575px) / (1600 - 575));--heading-font-scale:1}`;
const doc = (body, {scripts = true, htmlClass = '', head = ''} = {}) => `<!doctype html><html lang="en" class="${htmlClass}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${h.themeRoot()}${ROOT_VARS}</style><style>${CSS}</style>${head}</head>
<body data-btn-style="solid" data-btn-secondary-style="outline">${body}<footer style="height:400px">Footer</footer>
${scripts ? `<script>customElements.define('grid-list', class extends HTMLElement { showGridItems() {} });</script><script>${COLLECTION_JS.replace(/<\/script/gi, '<\\/script')}</script>` : ''}</body></html>`;

async function serve(page, body, opts = {}) {
  page.__requests = [];
  await page.route('https://shop.test/**', route => {
    const url = route.request().url();
    if (/\/assets\//.test(url)) return route.fulfill({status: 200, body: ''});
    page.__requests.push(url);
    const isSection = new URL(url).searchParams.has('section_id');
    return route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: isSection ? (opts.section || body) : doc(body, opts)});
  });
  await page.goto('https://shop.test/collections/all');
}
const groups = p => p.$$eval('[data-facets-panel] details.facets-group', els => els.map(el => el.querySelector('.facets-group__name').textContent.trim()));

/* ───────────── Heading fixtures ───────────── */
const HEAD_FILE = 'sections/main-collection-heading.storelib';
const picture = (w, hgt, extra = {}) => ({src: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}"><rect width="${w}" height="${hgt}" fill="#345"/></svg>`), width: w, height: hgt, aspect_ratio: w / hgt, alt: 'Banner', ...extra});
const HEAD_BLOCKS = [
  {id: 'bc', type: 'breadcrumb', settings: {separator: 'chevron', font_size: 13}, shopify_attributes: 'data-block-id="bc"'},
  {id: 'hd', type: 'heading', settings: {page_title: '', header_size: 'default'}, shopify_attributes: 'data-block-id="hd"'},
  {id: 'ds', type: 'description', settings: {}, shopify_attributes: 'data-block-id="ds"'},
];
function renderHeading(saved = {}, {blocks = HEAD_BLOCKS, collection = {}, editor = false} = {}) {
  const settings = h.sectionSettings(HEAD_FILE, saved);
  const html = h.renderTemplate(h.templateOf(read(HEAD_FILE)), {
    settings: h.config, section: {id: 'heading', settings, blocks}, request: {design_mode: editor}, routes: {root_url: '/'},
    collection: {title: 'Pants & Jeans', url: '/collections/pants', description: '<p>Cut and sewn in small runs.</p>', image: null, ...collection},
  }, env());
  return `<div id="shopify-section-heading" class="shopify-section">${html}</div>`;
}
const headingState = p => p.evaluate(() => {
  const s = document.querySelector('.sec__page-heading');
  if (!s) return null;
  const cs = getComputedStyle(s), title = document.querySelector('.heading-title'), trail = document.querySelector('.bc__trail');
  const overlay = document.querySelector('.overlay-bg');
  return {
    classes: s.className, height: s.getBoundingClientRect().height, pt: parseFloat(cs.paddingTop), pb: parseFloat(cs.paddingBottom), ratio: cs.aspectRatio,
    title: title?.textContent.trim(), titleSize: title && parseFloat(getComputedStyle(title).fontSize), align: title && getComputedStyle(title.closest('.heading-content')).textAlign,
    trail: trail && getComputedStyle(trail).justifyContent, overlay: overlay && getComputedStyle(overlay, '::after').opacity,
    img: document.querySelector('.overlay-bg img')?.getAttribute('src') || null, placeholder: !!document.querySelector('.overlay-bg .placeholder-svg'),
    description: document.querySelector('.heading-description')?.textContent.trim() || null, blocks: [...document.querySelectorAll('[data-block-id]')].map(el => el.dataset.blockId),
    bc: trail && {size: getComputedStyle(trail).fontSize, upper: getComputedStyle(trail.closest('.bc')).textTransform, link: getComputedStyle(document.querySelector('.bc__link')).color, current: getComputedStyle(document.querySelector('.bc__current')).color, sep: getComputedStyle(document.querySelector('.bc__item + .bc__item'), '::before').content},
    width: s.querySelector(':scope > div:not(.overlay-bg)')?.className,
  };
});

(async () => {
  const browser = await chromium.launch({executablePath: ['/usr/bin/chromium', '/opt/pw-browsers/chromium'].find(f => fs.existsSync(f)), headless: true, args: ['--no-sandbox']});
  let passed = 0;
  const group = async (name, fn) => { await fn(); passed++; console.log('ok', name); };
  try {
    /* 1 ───────────── The builder draws the collection's own filters ───────────── */
    await group('1 canvas filters from the collection products', async () => {
      const html = renderCollection();
      assert.ok(!/Filter preview|The live page shows/i.test(html), 'no explanatory sentence');
      assert.ok(!html.includes('facets-preview-notice'), 'no notice element');
      const ctx = await browser.newContext({viewport: {width: 1366, height: 900}});
      const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
      await serve(p, html);
      assert.deepEqual(await groups(p), ['Availability', 'Price', 'Size', 'Color', 'Product type', 'Brand'], 'the platform order, with options read through all_products');
      assert.ok(await p.locator('[data-facets-panel]').isVisible(), 'the sidebar shows with no editor class on <html>');
      const values = await p.$$eval('[data-facets-panel] a.facets-value', els => els.map(a => ({href: a.getAttribute('href'), param: a.dataset.facetsParam, value: a.dataset.facetsValue, label: a.querySelector('.facets-value__label').textContent, count: a.querySelector('.facets-value__count')?.textContent, disabled: a.getAttribute('aria-disabled')})));
      const find = label => values.find(v => v.label === label);
      assert.deepEqual(find('In stock'), {href: '/collections/all?filter.v.availability=1', param: 'filter.v.availability', value: '1', label: 'In stock', count: '(5)', disabled: null});
      assert.equal(find('Out of stock').count, '(1)');
      assert.equal(find('M').href, '/collections/all?filter.v.option.size=M'); assert.equal(find('M').count, '(4)');
      assert.equal(find('Beige').param, 'filter.v.option.color'); assert.equal(find('Beige').count, '(2)');
      assert.equal(find('Pants & Jeans').href, '/collections/all?filter.p.product_type=Pants+%26+Jeans', 'product type links as the live page writes them');
      assert.equal(find('Pants & Jeans').count, '(3)');
      assert.equal(await p.locator('.facets-values--swatch .facets-value__swatch').count(), 4, 'colour values are swatches');
      assert.equal(await p.locator('.facets-values--chips a.facets-value').count(), 4, 'sizes are chips');
      assert.deepEqual(await p.$$eval('form[data-facets-price] input', els => els.map(i => i.name)), ['filter.v.price.gte', 'filter.v.price.lte'], 'price is a working form');
      // A value filters through the section request like a live one.
      await p.locator('a.facets-value', {hasText: 'Beige'}).click();
      await p.waitForTimeout(150);
      const req = p.__requests.find(u => u.includes('section_id='));
      assert.ok(req && new URL(req).searchParams.get('filter.v.option.color') === 'Beige', 'the click asks the section for that filter');
      // Every live group key matches, so a redraw with real data keeps groups open.
      assert.deepEqual(await p.$$eval('details[data-facets-group]', els => els.map(el => el.dataset.facetsGroup)), ['availability', 'price', 'size', 'color', 'product-type', 'brand']);
      assert.deepEqual(errors, []);
      // Products that already carry their options need no lookup; the real filter data wins when present.
      const own = renderCollection({products: FULL, allProducts: {}});
      assert.ok(own.includes('filter.v.option.size=S'), 'options from the products themselves');
      const live = h.shop('https://shop.test/collections/all', 'collection');
      const real = renderCollection({products: live.results, filters: live.filters});
      assert.ok(!real.includes('data-facets-source="products"'), 'platform filters are used when the page has them');
      assert.ok(!renderCollection({products: [], allProducts: {}}).includes('data-facets-source'), 'no products, no made-up groups');
      assert.ok(renderCollection({products: [], allProducts: {}}).includes('data-facets-no-data="true"'), 'nothing to filter: no Filter button or sidebar');
      assert.ok(!html.includes('data-facets-no-data'), 'products to filter: the panel is never marked empty');
      await ctx.close();
    });

    /* 2 ───────────── Filters always show ───────────── */
    await group('2 filters show without scripts, classes or a fresh load', async () => {
      const html = renderCollection({editor: false});
      for (const width of [1366, 375]) {
        const ctx = await browser.newContext({viewport: {width, height: 800}, javaScriptEnabled: false});
        const p = await ctx.newPage();
        await serve(p, html, {scripts: false});
        if (width > 1024) assert.ok(await p.locator('[data-facets-panel] .facets-group').first().isVisible(), 'the sidebar is drawn by CSS alone');
        else {
          await p.click('[data-facets-open]');
          await p.waitForTimeout(450);
          assert.ok(await p.locator('[data-facets-panel] .facets-group').first().isVisible(), 'the drawer opens with scripts off (popover)');
        }
        await ctx.close();
      }
      // The CSS hides nothing behind an editor class.
      const css = read('shopify/assets/collection-page.css');
      assert.ok(!/html:not\(\.shopify-design-mode\)[^{]*facets/.test(css), 'no facets rule waits for .shopify-design-mode');
      const ctx = await browser.newContext({viewport: {width: 375, height: 800}, hasTouch: true});
      const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
      await serve(p, html);
      await p.tap('[data-facets-open]'); await p.waitForTimeout(450);
      assert.ok(await p.$eval('[data-facets-panel]', el => el.matches(':popover-open')));
      // Leaving with it open and coming back from the back/forward cache.
      await p.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})); window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})); });
      await p.waitForTimeout(450);
      assert.equal(await p.$eval('[data-facets-panel]', el => el.matches(':popover-open')), false, 'restored closed');
      assert.equal(await p.evaluate(() => document.documentElement.classList.contains('facets-locked') || getComputedStyle(document.documentElement).overflow === 'hidden'), false, 'restored unlocked');
      // The builder draws the section again in place.
      await p.evaluate(html => {
        const old = document.getElementById('shopify-section-main-collection-product');
        const t = document.createElement('template'); t.innerHTML = html; const next = t.content.firstElementChild;
        old.replaceWith(next); next.dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: 'main-collection-product'}}));
      }, renderCollection({editor: true}));
      await p.tap('[data-facets-open]'); await p.waitForTimeout(450);
      assert.equal(await p.getAttribute('[data-facets-open]', 'aria-expanded'), 'true', 'the redrawn section is wired at once');
      assert.ok(await p.locator('[data-facets-panel] .facets-group').first().isVisible());
      assert.deepEqual(errors, []);
      await ctx.close();
    });

    /* 3 ───────────── The drawer and the sidebar ───────────── */
    await group('3 drawer motion, lock, focus, Escape, 375px, safe areas; sticky sidebar', async () => {
      const css = read('shopify/assets/collection-page.css');
      assert.ok(/padding-top: max\(8px, env\(safe-area-inset-top/.test(css) && /env\(safe-area-inset-bottom/.test(css) && /env\(safe-area-inset-left/.test(css), 'safe areas');
      const ctx = await browser.newContext({viewport: {width: 375, height: 700}, hasTouch: true});
      const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
      await serve(p, renderCollection());
      const panel = p.locator('[data-facets-panel]');
      const motion = await panel.evaluate(el => ({prop: getComputedStyle(el).transitionProperty, shut: getComputedStyle(el).translate}));
      assert.ok(motion.prop.includes('translate') && !/\b(left|width|margin)\b/.test(motion.prop), 'slides on translate only: ' + motion.prop);
      await p.evaluate(() => window.scrollTo(0, 300));
      const before = await p.evaluate(() => ({y: scrollY, w: document.documentElement.clientWidth, overflow: getComputedStyle(document.documentElement).overflow}));
      // Pressed where it is (a tap would first scroll it into view).
      await p.$eval('[data-facets-open]', el => el.click());
      await p.waitForTimeout(450);
      const open = await p.evaluate(() => {
        const el = document.querySelector('[data-facets-panel]'), r = el.getBoundingClientRect(), body = el.querySelector('.facets-panel__body');
        return {y: scrollY, w: document.documentElement.clientWidth, overflow: getComputedStyle(document.documentElement).overflow, gutter: getComputedStyle(document.documentElement).scrollbarGutter,
          left: r.left, right: r.right, height: r.height, bodyScroll: getComputedStyle(body).overflowY, contain: getComputedStyle(body).overscrollBehaviorY,
          focus: document.activeElement === el, shade: getComputedStyle(el, '::backdrop').opacity, sideways: document.documentElement.scrollWidth <= 375};
      });
      assert.equal(open.y, before.y, 'the page does not jump'); assert.equal(open.w, before.w, 'nor move sideways');
      assert.equal(open.overflow, 'hidden', 'the page under it is held'); assert.equal(open.gutter, 'stable');
      assert.ok(open.left >= 0 && open.right <= 375 && open.height === 700, 'fits a 375px phone, full height'); assert.ok(open.sideways);
      assert.equal(open.bodyScroll, 'auto'); assert.equal(open.contain, 'contain', 'its own scroll');
      assert.ok(open.focus, 'focus moves into the drawer'); assert.equal(open.shade, '1', 'the shade fades in');
      const targets = await p.$$eval('[data-facets-panel] :is(summary, a.facets-value:not([aria-disabled]), .facets-sheet__close, .facets-panel__done, .facets-panel__clear)', els => els.filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect().height));
      assert.ok(targets.length && targets.every(t => t >= 40), '40px+ targets');
      // Focus stays inside.
      await p.keyboard.press('Tab');
      assert.ok(await p.evaluate(() => document.activeElement.matches('.facets-sheet__close')), 'Tab: the first control');
      await p.keyboard.press('Shift+Tab');
      assert.ok(await p.evaluate(() => document.activeElement.matches('.facets-panel__done')), 'Shift+Tab from the first: the last');
      await p.keyboard.press('Tab');
      assert.ok(await p.evaluate(() => document.activeElement.matches('.facets-sheet__close')), 'Tab from the last: the first');
      for (let i = 0; i < 40; i++) { await p.keyboard.press('Tab'); assert.ok(await p.evaluate(() => document.querySelector('[data-facets-panel]').contains(document.activeElement)), 'never leaves the drawer'); }
      await p.keyboard.press('Escape');
      await p.waitForTimeout(450);
      const shut = await p.evaluate(() => ({open: document.querySelector('[data-facets-panel]').matches(':popover-open'), focus: document.activeElement.matches('[data-facets-open]'), y: scrollY, overflow: getComputedStyle(document.documentElement).overflow, expanded: document.querySelector('[data-facets-open]').getAttribute('aria-expanded')}));
      assert.deepEqual(shut, {open: false, focus: true, y: before.y, overflow: before.overflow, expanded: 'false'}, 'Escape closes, focus returns to Filter, page where it was');
      // Reduced motion: no slide.
      await p.emulateMedia({reducedMotion: 'reduce'});
      assert.equal(await panel.evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(d => parseFloat(d) === 0)), true, 'still under reduced motion');
      await p.emulateMedia({reducedMotion: 'no-preference'});
      // Widening into the sidebar layout closes a drawer left open.
      await p.setViewportSize({width: 900, height: 700});
      await p.click('[data-facets-open]'); await p.waitForTimeout(400);
      await p.setViewportSize({width: 1366, height: 700}); await p.waitForTimeout(200);
      assert.equal(await panel.evaluate(el => el.matches(':popover-open')), false, 'the drawer becomes the sidebar');
      assert.ok(await panel.isVisible() && await panel.evaluate(el => getComputedStyle(el).position) === 'sticky');
      assert.deepEqual(errors, []);
      await ctx.close();
      // Sticky under a sticky header, with its own scroll.
      const desk = await browser.newContext({viewport: {width: 1366, height: 700}});
      const d = await desk.newPage();
      const many = [...FULL, ...FULL.map(x => ({...x, id: x.id + 10, handle: x.handle + 'b'})), ...FULL.map(x => ({...x, id: x.id + 20, handle: x.handle + 'c'}))];
      // Round 4: no scrollbar of its own (a tall sidebar is pinned to the
      // window's edges instead, tests/theme-collection-round4.cjs).
      await serve(d, '<div class="shopify-section-group-header-group" style="position:sticky;top:0;z-index:9;height:80px;background:#fff">Header</div>' + renderCollection({products: many, extra: {default_filter: 'close_all'}}));
      await d.evaluate(() => window.scrollTo(0, 900)); await d.waitForTimeout(400);
      const side = await d.$eval('[data-facets-panel]', el => ({top: el.getBoundingClientRect().top, max: getComputedStyle(el).maxHeight, scroll: getComputedStyle(el).overflowY}));
      assert.ok(Math.abs(side.top - 104) <= 1, 'sticks 24px under the 80px header: ' + side.top);
      assert.ok(side.max === 'none' && side.scroll === 'visible', 'no inner scrollbar');
      await desk.close();
    });

    /* 4 ───────────── Filter follows Theme settings > Buttons ───────────── */
    await group('4 Filter button on the theme button contract', async () => {
      const ctx = await browser.newContext({viewport: {width: 375, height: 800}, hasTouch: true});
      const p = await ctx.newPage();
      // Pinned to the default style: the creator may pick another (theme-collection-round4 covers those).
      await serve(p, renderCollection({extra: {toolbar_button_style: 'theme'}}));
      const btn = p.locator('[data-facets-open]');
      assert.equal(await btn.getAttribute('data-theme-button'), 'secondary');
      assert.ok(/\bbtn\b/.test(await btn.getAttribute('class')) && /\bbtn-secondary\b/.test(await btn.getAttribute('class')), 'theme classes');
      assert.equal(await p.getAttribute('.facets-panel__done', 'data-theme-button'), 'primary');
      const look = () => btn.evaluate(el => { const cs = getComputedStyle(el); return {pt: cs.paddingTop, pl: cs.paddingLeft, fs: cs.fontSize, radius: cs.borderTopLeftRadius, bg: cs.backgroundColor, color: cs.color, border: cs.borderTopColor, bw: cs.borderTopWidth}; });
      await p.evaluate(() => { const s = document.documentElement.style; s.setProperty('--btn-padding-y', '12px'); s.setProperty('--btn-padding-x', '30px'); s.setProperty('--btn-font-size', '17px'); s.setProperty('--btn-radius', '22px'); s.setProperty('--btn-secondary-bg-color', 'rgb(1, 2, 3)'); s.setProperty('--btn-secondary-color', 'rgb(250, 250, 250)'); s.setProperty('--btn-secondary-border-color', 'rgb(9, 8, 7)'); s.setProperty('--btn-border-width', '2px'); });
      // Padding is the toolbar's own compact size (collection-page.css); the rest follows Theme settings > Buttons.
      { const {pt, pl, ...rest} = await look(); assert.deepEqual(rest, {fs: '17px', radius: '22px', bg: 'rgb(1, 2, 3)', color: 'rgb(250, 250, 250)', border: 'rgb(9, 8, 7)', bw: '2px'}, 'corners, type and colours from Theme settings > Buttons'); }
      await btn.evaluate(el => el.setAttribute('data-button-appearance', 'outline'));
      assert.equal((await look()).bg, 'rgba(0, 0, 0, 0)', 'the theme appearance applies (outline)');
      assert.ok(!/facets-toolbar__filter\s*\{[^}]*--mb-(padding|font-size|radius)/.test(read('shopify/assets/collection-page.css')), 'no local size over the theme settings');
      for (let i = 0; i < 5; i++) {
        await btn.tap(); await p.waitForTimeout(420);
        assert.ok(await p.$eval('[data-facets-panel]', el => el.matches(':popover-open')), 'opens every time (' + i + ')');
        assert.equal(await btn.getAttribute('aria-expanded'), 'true');
        await p.tap('[data-facets-panel] .facets-sheet__close'); await p.waitForTimeout(420);
        assert.equal(await p.$eval('[data-facets-panel]', el => el.matches(':popover-open')), false);
      }
      const box = await btn.boundingBox(); assert.ok(box.height >= 44, '44px');
      await ctx.close();
    });

    /* 5 ───────────── Collection banner settings ───────────── */
    await group('5 main-collection-heading settings', async () => {
      const ctx = await browser.newContext({viewport: {width: 1600, height: 900}});
      const p = await ctx.newPage();
      const show = async (saved, opts) => { await p.setContent(doc(renderHeading(saved, opts), {scripts: false})); return headingState(p); };
      let s = await show({});
      assert.equal(s.title, 'Pants & Jeans'); assert.equal(s.description, 'Cut and sewn in small runs.'); assert.equal(s.align, 'center'); assert.equal(s.trail, 'center');
      assert.deepEqual(s.blocks, ['bc', 'hd', 'ds'], 'every block can be picked in the canvas');
      assert.equal(s.img, null); assert.equal(s.placeholder, false);
      assert.ok(s.classes.includes('color-default-color-scheme'), 'colour scheme class');
      s = await show({alignment: 'left'}); assert.ok(['left', 'start'].includes(s.align)); assert.equal(s.trail, 'flex-start');
      s = await show({alignment: 'right'}); assert.ok(['right', 'end'].includes(s.align)); assert.equal(s.trail, 'flex-end');
      s = await show({padding_top: 10, padding_bottom: 90}); assert.equal(s.pt, 10); assert.equal(s.pb, 90, 'padding');
      s = await show({color_scheme: 'scheme-2'}); assert.ok(s.classes.includes('color-scheme-2'));
      s = await show({section_width: 'container'}); assert.equal(s.width, 'container');
      const wide = picture(1600, 400);
      s = await show({background_image: wide, overlay_opacity: 40});
      assert.equal(s.img, wide.src); assert.equal(s.overlay, '0.4', 'overlay opacity'); assert.equal(s.ratio, '4 / 1', 'Adapt to image'); assert.ok(Math.abs(s.height - 400) <= 1);
      s = await show({background_image: picture(1600, 400, {aspect_ratio: null}), height: 'adapt'}); assert.equal(s.ratio, '4 / 1', 'ratio from width and height');
      s = await show({background_image: wide, height: 'based_on_content'}); assert.equal(s.ratio, 'auto'); assert.ok(s.height < 300, 'Based on content');
      s = await show({background_image: wide, overlay_opacity: 0}); assert.equal(s.overlay, '0');
      const own = picture(1200, 600);
      s = await show({background_image: wide, show_collection_image: true}, {collection: {image: own}}); assert.equal(s.img, own.src, 'Use collection image');
      s = await show({background_image: wide, show_collection_image: true}); assert.equal(s.img, wide.src, 'no collection image: the background image');
      s = await show({show_collection_image: true}); assert.equal(s.placeholder, false, 'no picture at all: nothing on the live page');
      s = await show({show_collection_image: true}, {editor: true}); assert.equal(s.placeholder, true, 'the builder shows where it goes');
      s = await show({}, {blocks: [{...HEAD_BLOCKS[1], settings: {page_title: 'Trousers <b>', header_size: 'default'}}]});
      assert.equal(s.title, 'Trousers <b>', 'own heading, printed as text'); const normal = s.titleSize;
      s = await show({}, {blocks: [{...HEAD_BLOCKS[1], settings: {page_title: '', header_size: 'small'}}]}); assert.ok(s.titleSize < normal, 'Small');
      s = await show({}, {blocks: [{...HEAD_BLOCKS[1], settings: {page_title: '', header_size: 'large'}}]}); assert.ok(s.titleSize > normal, 'Large');
      s = await show({}, {blocks: [{...HEAD_BLOCKS[0], settings: {separator: 'slash', font_size: 16, uppercase: true, link_color: 'rgb(200, 0, 0)', current_color: 'rgb(0, 120, 0)'}}]});
      assert.deepEqual(s.bc, {size: '16px', upper: 'uppercase', link: 'rgb(200, 0, 0)', current: 'rgb(0, 120, 0)', sep: '"/"'}, 'breadcrumb settings');
      s = await show({}, {collection: {description: ''}}); assert.equal(s.description, null, 'no description, no empty line');
      s = await show({background_image: wide}, {blocks: []}); assert.ok(s && s.img === wide.src, 'a picture alone still draws the banner');
      assert.equal(await show({}, {blocks: []}), null, 'nothing to show: no empty banner');
      const off = renderHeading({reset_spacing: false}), on = renderHeading({reset_spacing: true});
      assert.ok(on.includes('margin-top: 0 !important') && !off.includes('margin-top: 0 !important'), 'Remove default space');
      await ctx.close();
    });

    /* ───────────── The live site ───────────── */
    if (process.env.LIVE !== '0') {
      await group('live: filters on landing, sidebar and drawer', async () => {
        for (const width of [1366, 375]) {
          const ctx = await browser.newContext({viewport: {width, height: 800}, hasTouch: width < 500});
          const p = await ctx.newPage();
          await p.goto(LIVE + '/collections/all', {waitUntil: 'load', timeout: 60000});
          assert.ok(await p.locator('[data-facets-panel] .facets-group').count() > 0, 'the platform hands filter groups');
          if (width > 1024) assert.ok(await p.locator('[data-facets-panel] .facets-group').first().isVisible(), 'sidebar on landing');
          else {
            await p.locator('[data-facets-open]').tap(); await p.waitForTimeout(500);
            assert.ok(await p.locator('[data-facets-panel] .facets-group').first().isVisible(), 'drawer on landing');
          }
          await ctx.close();
        }
        const res = await fetch(LIVE + '/collections/all?filter.p.product_type=Pants+%26+Jeans&section_id=main-collection-product');
        const html = await res.text();
        assert.ok(res.ok && html.includes('data-facets-part="filters"'), 'the section request answers with its filters');
        assert.ok((html.match(/class="grid__item/g) || []).length >= 1, 'the product type link the canvas writes filters on the live site');
      });
    }
    console.log(`theme-collection-round3: ${passed} groups passed`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
