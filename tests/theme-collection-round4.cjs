/* Run: node tests/theme-collection-round4.cjs
   The collection page filters, round 4:
   1. The computer sidebar has no scrollbar of its own. Shorter than the
      window it sticks under the sticky header; taller, it moves with the
      page until its bottom meets the window's bottom and stays there, and on
      the way back up it moves with the page until its top meets the header
      and stays there, so every filter is reachable with no inner scroll. It
      moves without jitter (every frame in one direction), re-measures when a
      group opens or closes, the window resizes or the builder draws the
      section again (storelib:section-load), and never leaves its column.
      The phone drawer keeps its own scroll with a hairline scrollbar.
   2. Filter and Sort by button style (section setting toolbar_button_style):
      Theme button (default: Theme settings > Buttons and the field style),
      Outline, Text and icon, Pill; 44px targets at 375px. Active filters are
      soft round pills with a 44px tap area; size chips and tick boxes are
      clean (hover, tabular counts).
   3. The data: groups, values, counts and links follow the products; price
      fields show whole amounts as typed (100, not 100.0) and the real lowest
      and highest prices as hints; removing one filter and Clear all ask the
      section for the right address. With LIVE unset, the live collection is
      checked against its own products the same way.
   Rendered with the real templates through the Liquid subset in
   tests/theme-search-collection.cjs and drawn in Chromium with the theme's
   CSS and shopify/assets/collection.js. LIVE=0 skips the live site. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('module');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const LIVE = 'https://andrewrullz.storelib.com';

const helperPath = path.join(__dirname, 'theme-search-collection.cjs'), helperSource = fs.readFileSync(helperPath, 'utf8');
const helper = new Module(helperPath, module); helper.filename = helperPath; helper.paths = module.paths;
helper._compile(helperSource.slice(0, helperSource.indexOf('(async () => {')) + '\nmodule.exports={renderTemplate,templateOf,sectionSettings,config,stubs,shop,themeRoot,CATALOGUE};', helperPath);
const h = helper.exports;
const env = () => ({stubs: h.stubs, files: {}, rendered: new Set()});

/* ───────────── Fixtures ───────────── */
const SECTION_FILE = 'sections/main-collection-product.storelib';
const SAVED = JSON.parse(read('templates/collection.json')).sections['main-collection-product'].settings;
// A long collection: 36 products in 18 product types, so the sidebar is far
// taller than the window and the grid taller still.
const LONG = Array.from({length: 36}, (_, k) => {
  const base = h.CATALOGUE[k % h.CATALOGUE.length];
  return {...base, id: 1000 + k, handle: 'long' + k, url: '/products/long' + k, title: base.title + ' ' + (k + 1), type: 'Type ' + String((k % 18) + 1).padStart(2, '0'), available: k % 7 !== 3, price_max: base.price};
});
const ALL = Object.fromEntries(LONG.map(p => [p.handle, p]));

function renderCollection({products = LONG, filters = [], layout = 'vertical', editor = false, extra = {}, url = 'https://shop.test/collections/all', id = 'main-collection-product'} = {}) {
  const settings = h.sectionSettings(SECTION_FILE, {...SAVED, enable_filtering: true, filter_layout: layout, default_filter: 'open_all', show_filter_counts: true, items_to_show: 48, ...extra});
  const collection = {title: 'All products', url: '/collections/all', products, products_count: products.length, filters, sort_options: [{value: 'manual', name: 'Featured'}, {value: 'price-ascending', name: 'Price, low to high'}], sort_by: null, default_sort_by: 'manual'};
  const html = h.renderTemplate(h.templateOf(read(SECTION_FILE)), {
    settings: h.config, section: {id, settings, blocks: []}, collection, collections: {}, all_products: ALL,
    request: {design_mode: editor, locale: {iso_code: 'en'}, host: 'shop.test'}, routes: {all_products_collection_url: '/collections/all'},
    cart: {currency: {symbol: 'R$'}}, template: 'collection', pages: {}, content_for_header: '', __page: 1, __url: url,
  }, env());
  return `<div id="shopify-section-${id}" class="shopify-section">${html}</div>`;
}
// The platform's own filter data for an address (tests/theme-search-collection.cjs shop()).
const platform = (query = '', extra = {}) => {
  const url = 'https://shop.test/collections/all' + query;
  const data = h.shop(url, 'collection');
  return renderCollection({products: data.results, filters: data.filters, url, ...extra});
};
const CSS = ['critical.css', 'theme.css', 'theme-button-contract.css', 'collection-page.css'].map(f => read('shopify/assets/' + f)).join('\n');
const COLLECTION_JS = read('shopify/assets/collection.js');
const ROOT_VARS = `:root{--responsive-rate:((100vw - 575px) / (1600 - 575));--heading-font-scale:1}`;
const HEADER = '<div class="shopify-section-group-header-group" style="position:sticky;top:0;z-index:9;height:80px;background:#fff">Header</div>';
const doc = (body, {head = ''} = {}) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${h.themeRoot()}${ROOT_VARS}</style><style>${CSS}</style><style>.product-item img{aspect-ratio:3/4;width:100%;height:auto}</style>${head}</head>
<body data-btn-style="solid" data-btn-secondary-style="outline">${body}<footer style="height:600px">Footer</footer>
<script>customElements.define('grid-list', class extends HTMLElement { showGridItems() {} });</script><script>${COLLECTION_JS.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;

async function serve(page, body, {section = null, sectionFor = null} = {}) {
  page.__requests = [];
  await page.route('https://shop.test/**', route => {
    const url = route.request().url();
    if (/\/assets\//.test(url)) return route.fulfill({status: 200, body: ''});
    page.__requests.push(url);
    const isSection = new URL(url).searchParams.has('section_id');
    const answer = isSection ? (sectionFor ? sectionFor(url) : section || body) : doc(body);
    return route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: answer});
  });
  await page.goto('https://shop.test/collections/all');
}
const frames = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const box = p => p.evaluate(() => {
  const el = document.querySelector('[data-facets-panel]'), r = el.getBoundingClientRect(), res = document.querySelector('.facets__results').getBoundingClientRect();
  const col = el.parentElement.getBoundingClientRect();
  return {top: r.top, bottom: r.bottom, height: r.height, view: innerHeight, y: scrollY, pin: el.hasAttribute('data-facets-pin') ? 'pin' : 'fit', colTop: col.top, resBottom: res.bottom};
});
// Scroll by wheel in small steps, sampling the sidebar every frame.
async function wheel(p, total, step = 80) {
  await p.evaluate(() => {
    window.__samples = [];
    const el = document.querySelector('[data-facets-panel]');
    const tick = () => { window.__samples.push({y: scrollY, top: el.getBoundingClientRect().top}); window.__raf = requestAnimationFrame(tick); };
    window.__raf = requestAnimationFrame(tick);
  });
  const n = Math.ceil(Math.abs(total) / step);
  for (let i = 0; i < n; i++) { await p.mouse.wheel(0, Math.sign(total) * step); await p.waitForTimeout(24); }
  await p.waitForTimeout(120); await frames(p);
  return p.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__samples; });
}

(async () => {
  const browser = await chromium.launch({executablePath: ['/usr/bin/chromium', '/opt/pw-browsers/chromium'].find(f => fs.existsSync(f)), headless: true, args: ['--no-sandbox']});
  let passed = 0;
  const group = async (name, fn) => { await fn(); passed++; console.log('ok', name); };
  try {
    /* 1 ───────────── The sticky sidebar, no scrollbar ───────────── */
    await group('1 tall sidebar moves with the page and pins at either end, no inner scroll', async () => {
      const css = read('shopify/assets/collection-page.css');
      const rule = css.slice(css.indexOf('.facets-panel--vertical {\n    position: sticky;'));
      assert.ok(!/max-height: calc\(100vh/.test(css), 'no max-height that would need an inner scroll');
      assert.ok(/max-height: none;\s*overflow: visible;/.test(rule.slice(0, 400)), 'the sidebar does not scroll on its own');
      const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
      const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
      await serve(p, HEADER + renderCollection());
      await frames(p);
      const panel = await p.$eval('[data-facets-panel]', el => ({oy: getComputedStyle(el).overflowY, max: getComputedStyle(el).maxHeight, sh: el.scrollHeight, ch: el.clientHeight, sw: getComputedStyle(el).scrollbarWidth, position: getComputedStyle(el).position}));
      assert.equal(panel.oy, 'visible'); assert.equal(panel.max, 'none'); assert.ok(panel.sh <= panel.ch + 1, 'nothing hidden inside it'); assert.equal(panel.position, 'sticky');
      let b = await box(p);
      assert.ok(b.height > 900 + 200, 'the fixture sidebar is taller than the window: ' + b.height);
      assert.ok(b.resBottom - b.colTop > b.height + 600, 'and the grid taller than the sidebar');
      const startTop = b.top;
      // Down: it moves with the page, then its bottom stays 24px above the window's.
      let s = await wheel(p, 1200);
      for (let i = 1; i < s.length; i++) assert.ok(s[i].top <= s[i - 1].top + 0.5, 'scrolling down it never moves back (no jitter) at frame ' + i);
      b = await box(p);
      assert.equal(b.pin, 'pin');
      assert.ok(Math.abs(b.bottom - (900 - 24)) <= 1.5, 'bottom pinned 24px above the window bottom: ' + b.bottom);
      const firstPinned = s.find(x => Math.abs(x.top + b.height - 876) <= 1.5);
      assert.ok(firstPinned, 'it reached the bottom pin');
      // Before it pinned, it moved exactly with the page.
      const early = s.filter(x => x.y < firstPinned.y);
      for (const x of early) assert.ok(Math.abs((startTop - x.top) - x.y) <= 2, 'moves with the page before the bottom pin');
      // Further down it stays pinned, within its column.
      await wheel(p, 1600);
      b = await box(p);
      assert.ok(Math.abs(b.bottom - 876) <= 1.5 && b.bottom <= b.resBottom + 1, 'still pinned, inside the column');
      // Up a little: it moves down with the page.
      const before = await box(p);
      s = await wheel(p, -240);
      for (let i = 1; i < s.length; i++) assert.ok(s[i].top >= s[i - 1].top - 0.5, 'scrolling up it never moves back at frame ' + i);
      b = await box(p);
      assert.equal(b.pin, 'pin');
      const moved = b.top - before.top, scrolled = before.y - b.y;
      assert.ok(Math.abs(moved - scrolled) <= 3, `released: moved ${moved} with the page's ${scrolled}`);
      // Up enough: its top stays 24px under the 80px header.
      await wheel(p, -(b.height));
      b = await box(p);
      assert.ok(b.y > 200, 'not back at the top of the page yet: ' + JSON.stringify(b));
      assert.ok(Math.abs(b.top - 104) <= 1.5, 'top pinned under the header: ' + b.top);
      // Down again: released, moving with the page.
      const pinnedTop = await box(p);
      await wheel(p, 160);
      b = await box(p);
      assert.ok(Math.abs((pinnedTop.top - b.top) - (b.y - pinnedTop.y)) <= 3, 'down again: moves with the page');
      // Back to the very top: where it started.
      await p.evaluate(() => window.scrollTo(0, 0)); await frames(p); await frames(p);
      b = await box(p);
      assert.ok(Math.abs(b.top - startTop) <= 1, 'back at its place at the top of the page');
      // At the very end of the page it never leaves its column.
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await frames(p); await frames(p);
      b = await box(p);
      assert.ok(b.bottom <= b.resBottom + 1, 'stops at the end of the grid');
      // Every filter can be reached: the last value becomes visible on the way down.
      await p.evaluate(() => window.scrollTo(0, 0)); await frames(p);
      await wheel(p, 1500);
      const last = await p.$eval('[data-facets-panel] .facets-group:last-of-type a.facets-value:last-of-type, [data-facets-panel] .facets-group:last-child li:last-child a', el => { const r = el.getBoundingClientRect(); return {top: r.top, bottom: r.bottom}; });
      assert.ok(last.bottom <= 900 && last.top >= 0, 'the last filter is on screen');
      assert.deepEqual(errors, []);
      await ctx.close();
    });

    await group('1b short sidebar, groups opening and closing, resize, section reload, listeners', async () => {
      const js = COLLECTION_JS;
      assert.ok(/addEventListener\('scroll', onScroll, \{ passive: true \}\)/.test(js) && /requestAnimationFrame/.test(js), 'passive, one measure per frame');
      assert.ok(/ResizeObserver/.test(js) && /storelib:section-load/.test(js), 'remeasures on size changes and builder redraws');
      const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
      const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
      await serve(p, HEADER + renderCollection({extra: {default_filter: 'close_all'}}));
      await frames(p);
      let b = await box(p);
      assert.ok(b.height + 104 + 24 < 900, 'closed groups: shorter than the window');
      await p.evaluate(() => window.scrollTo(0, 1400)); await p.waitForTimeout(400); await frames(p);
      b = await box(p);
      assert.equal(b.pin, 'fit'); assert.ok(Math.abs(b.top - 104) <= 1, 'short: sticks under the header: ' + b.top);
      // Open every group while pinned: it becomes tall and is pinned instead.
      await p.$$eval('[data-facets-panel] details.facets-group', els => els.forEach(d => { d.open = true; }));
      await p.waitForTimeout(450); await frames(p);
      b = await box(p);
      assert.ok(b.height > 900, 'now taller than the window');
      assert.notEqual(b.pin, 'fit', 'pinned by direction once tall');
      assert.ok(Math.abs(b.top - 104) <= 2, 'opening groups does not move its top under the pointer: ' + b.top);
      await wheel(p, 1200);
      b = await box(p);
      assert.ok(Math.abs(b.bottom - 876) <= 1.5, 'and scrolls down to its bottom');
      // Close them again: back to the plain sticky place.
      await p.$$eval('[data-facets-panel] details.facets-group', els => els.forEach(d => { d.open = false; }));
      await p.waitForTimeout(450); await frames(p);
      b = await box(p);
      assert.equal(b.pin, 'fit'); assert.ok(Math.abs(b.top - 104) <= 1.5, 'short again: under the header');
      // A taller window: it fits; a shorter one: pinned again.
      await p.$$eval('[data-facets-panel] details.facets-group', els => els.forEach(d => { d.open = true; }));
      await p.waitForTimeout(450);
      await p.setViewportSize({width: 1440, height: 2600}); await p.waitForTimeout(150); await frames(p);
      assert.equal((await box(p)).pin, 'fit', 'fits a tall window');
      await p.setViewportSize({width: 1440, height: 800}); await p.waitForTimeout(150); await frames(p);
      await wheel(p, 400);
      assert.notEqual((await box(p)).pin, 'fit', 'pinned in a short window');
      // Phone width: no pin on the drawer.
      await p.setViewportSize({width: 375, height: 800}); await p.waitForTimeout(150); await frames(p);
      assert.equal(await p.$eval('[data-facets-panel]', el => el.hasAttribute('data-facets-pin') || !!el.style.getPropertyValue('--facets-pin-offset')), false, 'the drawer carries no pin');
      await p.setViewportSize({width: 1440, height: 900}); await p.waitForTimeout(150);
      // The builder draws the section again in place.
      await p.evaluate(html => {
        const old = document.getElementById('shopify-section-main-collection-product');
        const t = document.createElement('template'); t.innerHTML = html; const next = t.content.firstElementChild;
        old.replaceWith(next); next.dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: 'main-collection-product'}}));
      }, renderCollection({editor: true}));
      await p.evaluate(() => window.scrollTo(0, 0)); await frames(p);
      await wheel(p, 1400);
      b = await box(p);
      assert.equal(b.pin, 'pin'); assert.ok(Math.abs(b.bottom - 876) <= 1.5, 'the redrawn sidebar pins at once');
      // Reduced motion: no transition on the pinned sidebar.
      await p.emulateMedia({reducedMotion: 'reduce'});
      assert.ok(await p.$eval('[data-facets-panel]', el => getComputedStyle(el).transitionDuration.split(',').every(d => parseFloat(d) === 0)));
      assert.deepEqual(errors, []);
      await ctx.close();
    });

    await group('1c phone drawer: its own scroll, hairline scrollbar, 375px', async () => {
      const ctx = await browser.newContext({viewport: {width: 375, height: 700}, hasTouch: true});
      const p = await ctx.newPage();
      await serve(p, renderCollection());
      await p.$eval('[data-facets-open]', el => el.click()); await p.waitForTimeout(450);
      const body = await p.$eval('[data-facets-panel] .facets-panel__body', el => ({oy: getComputedStyle(el).overflowY, sw: getComputedStyle(el).scrollbarWidth, sh: el.scrollHeight, ch: el.clientHeight, gutter: el.offsetWidth - el.clientWidth}));
      assert.equal(body.oy, 'auto'); assert.ok(['thin', 'none'].includes(body.sw), 'thin or no scrollbar: ' + body.sw);
      assert.ok(body.sh > body.ch, 'the drawer scrolls'); assert.ok(body.gutter <= 8, 'a hairline at most: ' + body.gutter);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= 375), 'no sideways scroll');
      await ctx.close();
    });

    /* 2 ───────────── Toolbar button style ───────────── */
    await group('2 Filter and Sort by button styles; pills and chips', async () => {
      const schema = JSON.parse(read(SECTION_FILE).match(/<schema>([\s\S]*)<\/schema>/)[1]);
      const setting = schema.shopify.settings.find(s => s.id === 'toolbar_button_style');
      assert.deepEqual(setting.options.map(o => o.value), ['theme', 'outline', 'minimal', 'pill']);
      assert.equal(setting.default, 'minimal', 'the compact toolbar is the default; Theme button remains selectable');
      assert.ok(setting.options.every(o => o.label.split(' ').length <= 3));
      const ctx = await browser.newContext({viewport: {width: 375, height: 800}, hasTouch: true});
      const p = await ctx.newPage();
      const look = sel => p.$eval(sel, el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return {theme: el.getAttribute('data-theme-button'), cls: el.className, h: r.height, right: r.right, bg: cs.backgroundColor, bw: cs.borderTopWidth, bc: cs.borderTopColor, radius: parseFloat(cs.borderTopLeftRadius)}; });
      const seen = {};
      for (const style of ['theme', 'outline', 'minimal', 'pill']) {
        await serve(p, renderCollection({extra: {toolbar_button_style: style}}));
        const f = await look('[data-facets-open]'), s = await look('[data-facets-sort-trigger]');
        seen[style] = {f, s};
        assert.ok(f.h >= 44 && s.h >= 44, style + ': 44px targets');
        assert.ok(f.right <= 375 && s.right <= 375 && await p.evaluate(() => document.documentElement.scrollWidth <= 375), style + ': fits 375px');
        if (style === 'theme') {
          assert.equal(f.theme, 'secondary'); assert.ok(/\bbtn-secondary\b/.test(f.cls)); assert.ok(/\binput-style\b/.test(s.cls), 'Sort by keeps the field style');
        } else {
          assert.equal(f.theme, null, style + ': off the theme button contract'); assert.ok(!/\bbtn\b/.test(f.cls) && !/\binput-style\b/.test(s.cls));
          assert.ok(f.cls.includes('facets-tbtn--' + style) && s.cls.includes('facets-tbtn--' + style), 'both buttons share the style');
        }
        // It still opens the drawer.
        await p.$eval('[data-facets-open]', el => el.click()); await p.waitForTimeout(420);
        assert.ok(await p.$eval('[data-facets-panel]', el => el.matches(':popover-open')), style + ': opens the drawer');
        await p.keyboard.press('Escape'); await p.waitForTimeout(420);
      }
      assert.equal(seen.outline.f.bw, '1px'); assert.equal(seen.outline.f.bg, 'rgba(0, 0, 0, 0)');
      assert.equal(seen.minimal.f.bc, 'rgba(0, 0, 0, 0)', 'text and icon: no border'); assert.equal(seen.minimal.f.bg, 'rgba(0, 0, 0, 0)');
      assert.ok(seen.pill.f.radius >= 22 && seen.pill.s.radius >= 22, 'pill: round ends');
      assert.equal(seen.outline.f.h, seen.outline.s.h, 'Filter and Sort by line up');
      // Active filters as pills, with a 44px tap area.
      await serve(p, platform('?filter.v.option.color=Black&filter.v.option.size=M'));
      const pills = await p.$$eval('.facets-pill', els => els.map(el => { const r = el.getBoundingClientRect(), a = getComputedStyle(el, '::after'); return {text: el.textContent.trim(), h: r.height, tap: r.height - 2 * parseFloat(a.top), radius: parseFloat(getComputedStyle(el).borderTopLeftRadius)}; }));
      assert.deepEqual(pills.map(x => x.text.replace(/\s+/g, ' ').toLowerCase()), ['m clear', 'black clear', 'clear all'], 'one pill per filter, then Clear all');
      assert.ok(pills.every(x => x.tap >= 44), '44px tap areas');
      assert.ok(pills[0].radius >= 16, 'round pills');
      // Chips: tidy counts; tick boxes react on hover.
      assert.equal(await p.$eval('.facets-values--chips .facets-value__count', el => getComputedStyle(el).fontVariantNumeric), 'tabular-nums');
      await ctx.close();
    });

    /* 3 ───────────── The data ───────────── */
    await group('3 groups, counts, links, price hints, remove one and Clear all', async () => {
      // Canvas groups from the products: every count is the products that have it.
      const html = renderCollection();
      const values = [...html.matchAll(/data-facets-param="([^"]+)"\s+data-facets-value="([^"]*)"[\s\S]*?facets-value__count">\((\d+)\)/g)].map(m => ({param: m[1], value: m[2].replace(/&amp;/g, '&'), count: +m[3]}));
      const count = (param, value) => values.find(v => v.param === param && v.value === value)?.count;
      assert.equal(count('filter.v.availability', '1'), LONG.filter(p => p.available).length);
      assert.equal(count('filter.v.availability', '0'), LONG.filter(p => !p.available).length);
      assert.equal(count('filter.p.product_type', 'Type 01'), LONG.filter(p => p.type === 'Type 01').length);
      assert.equal(count('filter.v.option.size', 'M'), LONG.filter(p => p.sizes.includes('M')).length);
      assert.equal(count('filter.v.option.color', 'Beige'), LONG.filter(p => p.color === 'Beige').length);
      const low = Math.min(...LONG.map(p => p.price)), high = Math.max(...LONG.map(p => p.price));
      assert.ok(html.includes(`placeholder="${Math.floor(low / 100)}"`), 'From hint is the lowest price');
      assert.ok(html.includes(`max="${Math.ceil(high / 100)}"`) && html.includes(`placeholder="${Math.ceil(high / 100)}"`), 'To hint is the highest price');
      // Platform data: a price typed as a whole amount shows as typed.
      const priced = platform('?filter.v.price.gte=50&filter.v.price.lte=99.5');
      assert.ok(/name="filter\.v\.price\.gte"[\s\S]*?value="50"/.test(priced), 'whole amounts without .0');
      assert.ok(/name="filter\.v\.price\.lte"[\s\S]*?value="99.5"/.test(priced), 'cents kept');
      assert.ok(/name="filter\.v\.price\.gte"[\s\S]*?placeholder="(\d+)"/.exec(platform(''))[1] === String(Math.floor(Math.min(...h.CATALOGUE.map(p => p.price)) / 100)), 'live From hint: the lowest listed price');
      // Sort by links keep the filters that are on, also without the script.
      const sortHref = /href="([^"]*sort_by=price-ascending[^"]*)"/.exec(platform('?filter.v.option.color=Black&filter.v.price.gte=50'))[1].replace(/&amp;/g, '&');
      const sortParams = new URL(sortHref, 'https://shop.test').searchParams;
      assert.equal(sortParams.get('sort_by'), 'price-ascending'); assert.equal(sortParams.get('filter.v.option.color'), 'Black'); assert.equal(Number(sortParams.get('filter.v.price.gte')), 50, sortHref);
      assert.ok(/href="\/collections\/all\?sort_by=price-ascending"/.test(platform('')), 'no filters: the plain sort link');
      // Remove one and Clear all through the section request; the counts come back updated.
      const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
      const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
      await p.route('https://shop.test/**', route => {
        const url = new URL(route.request().url());
        if (/\/assets\//.test(url.pathname)) return route.fulfill({status: 200, body: ''});
        p.__last = url;
        const q = new URLSearchParams(url.search); q.delete('section_id');
        const body = platform(q.toString() ? '?' + q : '');
        return route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: url.searchParams.has('section_id') ? body : doc(body)});
      });
      await p.goto('https://shop.test/collections/all?filter.v.option.color=Black&filter.v.option.size=M');
      const countText = () => p.$eval('[data-facets-part="count"]', el => el.textContent.trim());
      const blackOnly = h.shop('https://shop.test/collections/all?filter.v.option.color=Black', 'collection').results.length;
      await p.locator('.facets-pill', {hasText: 'M'}).first().click(); await p.waitForTimeout(250);
      assert.deepEqual([...p.__last.searchParams.entries()].filter(([k]) => k !== 'section_id'), [['filter.v.option.color', 'Black']], 'remove one keeps the other');
      assert.ok((await countText()).startsWith(String(blackOnly)), 'the count follows: ' + await countText());
      assert.equal(new URL(p.url()).search, '?filter.v.option.color=Black');
      const mCount = await p.$eval('a.facets-value[data-facets-param="filter.v.option.size"][data-facets-value="M"] .facets-value__count', el => el.textContent);
      assert.equal(mCount, `(${h.shop('https://shop.test/collections/all?filter.v.option.color=Black&filter.v.option.size=M', 'collection').results.length})`, 'value counts redrawn from the section');
      await p.locator('.facets-pill--clear').click(); await p.waitForTimeout(250);
      assert.ok(![...p.__last.searchParams.keys()].some(k => k.startsWith('filter.')), 'Clear all drops every filter');
      assert.equal(await p.locator('.facets-pill').count(), 0);
      assert.ok((await countText()).startsWith(String(h.CATALOGUE.length)));
      assert.deepEqual(errors, []);
      await ctx.close();
    });

    /* ───────────── The live site ───────────── */
    if (process.env.LIVE !== '0') {
      await group('live: filters match the collection products', async () => {
        const get = async q => (await (await fetch(LIVE + '/collections/all' + q + (q ? '&' : '?') + 'section_id=main-collection-product')).text());
        const parse = html => ({
          count: +(/data-facets-part="count">\s*(\d+)/.exec(html) || [])[1],
          items: (html.match(/class="grid__item/g) || []).length,
          values: [...html.matchAll(/<a\s+class="facets-value"([\s\S]*?)<\/a>/g)].map(m => ({href: /href="([^"]*)"/.exec(m[1])[1].replace(/&amp;/g, '&'), param: /data-facets-param="([^"]*)"/.exec(m[1])[1], value: /data-facets-value="([^"]*)"/.exec(m[1])[1].replace(/&amp;/g, '&'), count: +((/facets-value__count">\((\d+)\)/.exec(m[1]) || [])[1]), on: /aria-checked="true"/.test(m[1])})),
          max: +((/name="filter\.v\.price\.lte"[\s\S]*?max="(\d+)"/.exec(html) || [])[1]),
          prices: [...html.matchAll(/class="price[^"]*"[^>]*>[^<]*?([\d.,]+)/g)].map(m => +m[1].replace(/,/g, '')),
        });
        const all = parse(await get(''));
        assert.ok(all.values.length > 0 && all.count === all.items, 'the count matches the grid');
        const stock = all.values.filter(v => v.param === 'filter.v.availability').reduce((a, v) => a + v.count, 0);
        assert.equal(stock, all.count, 'in stock + out of stock = every product');
        for (const v of all.values.filter(x => x.count > 0).slice(0, 6)) {
          const q = new URL(v.href, LIVE).search;
          const one = parse(await get(q));
          assert.equal(one.items, v.count, `${v.param}=${v.value}: ${v.count} promised, ${one.items} shown`);
          const back = one.values.find(x => x.param === v.param && x.value === v.value);
          assert.ok(back && back.on, 'the value is on after following it');
          assert.equal(new URL(back.href, LIVE).search.includes(v.param + '='), false, 'and its link removes it');
        }
        assert.ok(all.max >= 1, 'price range from the products: max ' + all.max);
      });
    }
    console.log(`theme-collection-round4: ${passed} groups passed`);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
