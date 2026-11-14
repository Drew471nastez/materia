/* Each saved page runs only the section runtimes its sections need.

   layout/theme.storelib links the global scripts (swiper, utils, global,
   the cart drawer, navigation, hero-image-one.js's painter API, ...); every
   section runtime (list S in the layout's builder loader) is linked by the
   sections that use it, at the top of the section's own file, the way the
   theme's own sections link theirs. Checked here, as a visitor, with the real
   layout and the saved templates (header, footer and overlay groups too):

   - the section runtimes each page requests are exactly the ones in EXPECT;
   - a runtime is requested if and only if the page's markup has a root it
     drives (ROOTS; hero-product-two.js also for the sections that call its
     icon helper), so no page loads one it does not use and none misses one;
   - no builder-only controller is requested and no page error is raised;
   - a section placed twice (FAQ Tabs twice on the FAQ page) links its
     runtime twice but the runtime sets itself up once: it adds the same
     number of document listeners as with one copy, and a question of each
     copy opens on one click (a second set-up would close it again).

   Needs liquidjs (LIQUIDJS=<path to liquidjs>) and Playwright's Chromium.
   node tests/theme-scripts-per-page.cjs */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(repo, f), 'utf8');
let Drop = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) { try { ({Drop} = require(p)); break; } catch { /* next */ } }
if (!Drop) { console.log('theme-scripts-per-page skipped: liquidjs not installed (LIQUIDJS=<path to liquidjs>)'); process.exit(0); }
const {chromium} = require('playwright');
const {engine, R5} = require('./theme-r6-main-product-lib.cjs');
class TemplateDrop extends Drop { constructor(n) { super(); this.name = n; } valueOf() { return this.name; } toString() { return this.name; } }
const body = t => t.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
const clean = s => s.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');
const schemaOf = t => { try { return JSON.parse(t.slice(t.indexOf('\n<schema>') + 9, t.lastIndexOf('</schema>'))).shopify || {}; } catch { return {}; } };
const Lk = (title, url, links = []) => ({title, url, links, handle: title.toLowerCase().replace(/\W+/g, '-'), active: false, child_active: false, levels: links.length ? 1 : 0});
const MENUS = {
  'main-menu': {handle: 'main-menu', links: [Lk('Home', '/'), Lk('Shop', '/collections/all', [Lk('Tops', '/collections/tops'), Lk('Bottoms', '/collections/bottoms')]), Lk('About us', '/pages/about'), Lk('Contact', '/pages/contact')]},
  footer: {handle: 'footer', links: ['About us', 'Contact', 'FAQ', 'Shipping'].map(t => Lk(t, '/pages/' + t.toLowerCase().replace(/\W+/g, '-')))},
};
const PRODUCTS = [R5.PANTS, R5.OTHER, R5.TALL, R5.PANTS, R5.OTHER, R5.TALL, R5.PANTS, R5.OTHER];
const COLLECTION = {id: 'c1', handle: 'all', title: 'All products', url: '/collections/all', description: '', products: PRODUCTS, products_count: PRODUCTS.length, all_products_count: PRODUCTS.length, filters: [], sort_options: [{value: 'manual', name: 'Featured'}, {value: 'price-ascending', name: 'Price, low to high'}], sort_by: '', default_sort_by: 'manual', image: null};
const ART = i => ({id: 'a' + i, title: 'Journal entry ' + i, url: '/blogs/news/entry-' + i, handle: 'entry-' + i, author: 'Materia', published_at: '2026-10-0' + i, created_at: '2026-10-0' + i, excerpt: '<p>Notes from the studio.</p>', content: '<p>Notes from the studio.</p>', excerpt_or_content: '<p>Notes from the studio.</p>', image: {src: '/img/poster.svg', width: 800, height: 600, aspect_ratio: 1.333, alt: ''}, tags: ['news'], comments_count: 0});
const BLOG = {id: 'b1', handle: 'news', title: 'News', url: '/blogs/news', articles: [1, 2, 3, 4, 5].map(ART), articles_count: 5, all_tags: ['news'], tags: ['news']};
const PAGE = {
  faqs: {file: 'templates/faqs.json', page_type: 'page'},
  page: {file: 'templates/page.json', page_type: 'page'},
  home: {file: 'templates/home.json', page_type: 'index'},
  product: {file: 'templates/product.json', page_type: 'product'},
  collection: {file: 'templates/collection.json', page_type: 'collection'},
  cart: {file: 'templates/cart.json', page_type: 'cart'},
  search: {file: 'templates/search.json', page_type: 'search'},
  blog: {file: 'templates/blog.json', page_type: 'blog'},
};
const readIn = (tree, f, overlay) => overlay && overlay[f] != null ? overlay[f] : fs.readFileSync(path.join(tree, f), 'utf8');

/* overlay: {relative path: text} read instead of the tree's file (layout, snippets, sections). */
async function renderTemplate(name, {tree = repo, overlay = null, errors = [], skip = [], design = false, template = null, noGroups = false} = {}) {
  const spec = PAGE[name];
  const all = JSON.parse(readIn(tree, 'config/settings.json', overlay));
  const theme = {...all.shopify, ...(global.__THEME_OVERRIDE || {})};
  const schemes = Object.entries(theme.color_schemes).map(([id, v]) => ({id, settings: v.settings}));
  theme.color_schemes = schemes;
  const base = {
    settings: theme, request: {host: 'fixture.test', locale: {iso_code: 'en'}, page_type: spec.page_type, design_mode: design, path: '/'},
    routes: {account_url: '/account', account_login_url: '/account/login', root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', cart_change_url: '/cart/change', search_url: '/search', all_products_collection_url: '/collections/all', predictive_search_url: '/search/suggest'},
    shop: {name: 'Materia', email: 'hi@x.test', domain: 'fixture.test', url: 'https://fixture.test', currency: 'BRL', money_format: 'R${{amount}}', locale: 'en'},
    template: new TemplateDrop(spec.page_type), cart: {item_count: 0, items: [], total_price: 0, currency: {iso_code: 'BRL'}, attributes: {}, note: ''}, customer: null, linklists: MENUS, pages: {}, all_products: {},
    localization: {available_countries: [], available_languages: [], country: {iso_code: 'BR'}, language: {iso_code: 'en'}},
    collections: {all: COLLECTION}, blogs: {news: BLOG},
    page_title: name,
  };
  if (name === 'product') base.product = R5.PANTS;
  if (name === 'collection') base.collection = COLLECTION;
  if (name === 'search') base.search = {performed: true, terms: 'pants', results: PRODUCTS, results_count: PRODUCTS.length, filters: [], sort_options: COLLECTION.sort_options, sort_by: '', types: ['product']};
  if (name === 'blog') base.blog = BLOG;

  /* inline_asset_content reads the tree's file */
  const mk = groups => {
    const e = engine(tree, groups);
    e.registerFilter('inline_asset_content', k => { const f = path.join(tree, 'shopify/assets', String(k)); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''; });
    e.registerFilter('handle', v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    if (overlay) {
      const orig = e.options.fs;
      const rel = f => path.relative(tree, f);
      e.options.fs = {...orig, readFileSync: f => overlay[rel(f)] != null ? clean(body(overlay[rel(f)])) : orig.readFileSync(f), readFile: async f => overlay[rel(f)] != null ? clean(body(overlay[rel(f)])) : orig.readFile(f)};
    }
    return e;
  };
  const withDefaults = (defs, saved) => {
    const out = {};
    for (const s of defs || []) if (s.id && s.default !== undefined) out[s.id] = s.default;
    Object.assign(out, saved || {});
    for (const s of defs || []) {
      if (s.type === 'link_list') out[s.id] = MENUS[typeof out[s.id] === 'string' ? out[s.id] : 'main-menu'] || MENUS['main-menu'];
      if (s.type === 'color_scheme') out[s.id] = {...(schemes.find(x => x.id === out[s.id]) || schemes[0])};
      if (s.type === 'product' && out[s.id]) out[s.id] = R5.PANTS;
      if (s.type === 'product' && !out[s.id] && name === 'product') out[s.id] = R5.PANTS;
      if (s.type === 'collection') out[s.id] = COLLECTION;
      if (s.type === 'product_list') out[s.id] = PRODUCTS.slice(0, 4);
      if (s.type === 'collection_list') out[s.id] = [COLLECTION, COLLECTION, COLLECTION];
      if (s.type === 'blog') out[s.id] = BLOG;
      if (s.type === 'image_picker' && typeof out[s.id] === 'string' && out[s.id]) out[s.id] = {src: '/img/poster.svg', url: '/img/poster.svg', width: 1600, height: 1000, aspect_ratio: 1.6, alt: ''};
    }
    return out;
  };
  const draw = async (id, inst, groupClass = '', index = 1) => {
    let text;
    try { text = readIn(tree, `sections/${inst.type}.storelib`, overlay); } catch { errors.push(`${inst.type}: missing`); return ''; }
    const schema = schemaOf(text);
    const blocks = (inst.block_order || Object.keys(inst.blocks || {})).filter(k => inst.blocks[k] && !inst.blocks[k].disabled).map(k => {
      const b = inst.blocks[k];
      return {id: k, type: b.type, shopify_attributes: `data-block-id="${k}"`, settings: withDefaults(((schema.blocks || []).find(x => x.type === b.type) || {}).settings, b.settings)};
    });
    const ctx = {...base, section: {id, settings: withDefaults(schema.settings, inst.settings), blocks, index}};
    try {
      const html = await mk({}).parseAndRender(clean(body(text)), ctx, {globals: ctx});
      return `<div id="shopify-section-${id}" class="shopify-section${groupClass}${schema.class ? ' ' + schema.class : ''}" data-section-id="${id}" data-section-type="${inst.type}">${html}</div>`;
    } catch (err) { errors.push(`${inst.type}: ${err.message.split('\n')[0]}`); return `<div id="shopify-section-${id}" class="shopify-section"></div>`; }
  };
  const group = async (file, cls) => {
    if (noGroups) return ''; const g = JSON.parse(readIn(tree, file, overlay)); let out = '';
    for (const k of g.order) if (!g.sections[k].disabled && !skip.includes(g.sections[k].type)) out += await draw(k, g.sections[k], cls);
    return out;
  };
  const groups = {
    'header-group': await group('sections/header-group.json', ' shopify-section-group-header-group'),
    'footer-group': await group('sections/footer-group.json', ' shopify-section-group-footer-group'),
    'overlay-group': await group('sections/overlay-group.json', ' shopify-section-group-overlay-group'),
  };
  const t = template || JSON.parse(readIn(tree, spec.file, overlay));
  let content = '', i = 0;
  for (const k of t.order) if (!t.sections[k].disabled) content += await draw(k, t.sections[k], '', ++i);
  const html = await mk(groups).parseAndRender(clean(body(readIn(tree, 'layout/theme.storelib', overlay))), {...base, content_for_header: '', content_for_layout: content}, {globals: base});
  return html;
}

/* ---------- the layout's lists ---------- */
const layout = read('layout/theme.storelib');
const loader = layout.slice(layout.indexOf('<script>', layout.indexOf('Builder-only live preview.')));
const listOf = name => { const s = loader.indexOf(`var ${name} = [`); assert(s > 0, `the loader has list ${name}`); return [...loader.slice(s, loader.indexOf('];', s)).matchAll(/'([\w-]+\.js)' \| asset_url \| json/g)].map(m => m[1]); };
const SECTION = listOf('S'), LAZY = listOf('L');

/* What each section runtime drives (its scan() selectors). */
const ROOTS = {
  'hero-pro-scrolling.js': '[data-hero-scrolling]',
  'hero-product-two.js': '[data-hero-product-two], [data-hero-product-three], [data-marketing-section]',
  'hero-product-one.js': '[data-hp3-variant="product1"]',
  'hero-product-three.js': '[data-hero-product-three]',
  'marketing-sections.js': '[data-marketing-section]',
  'before-after-controls.js': '[data-before-after-controls]',
  'media-live-before-after.js': '[data-bam-root]',
  'media-live-galleries-a.js': '[data-mga-section]',
  'media-live-galleries-b.js': '[data-mgb]',
  'media-live-image-video.js': '[data-iv]',
  'media-live-benefits.js': '[data-mlb-root]',
  'media-live-stats-reels.js': '[data-msr]',
  'live-products-a.js': '[data-pa-root]',
  'live-products-b.js': '[data-pb-root]',
  'live-products-c.js': '[data-pch], [data-collection-tab][data-ct-section]',
  'live-products-d.js': '[data-pd-root]',
  'live-features-a.js': '[data-fa]',
  'live-features-b.js': '[data-fb-root]',
  'live-features-c.js': '[data-fc-root]',
  'live-features-d.js': '[data-fd]',
  'live-collections.js': '[data-cl-root]',
  'live-testimonials.js': '[data-lt-root], [data-tm-root]',
  'live-faq.js': '[data-faq-root]',
  'live-logos.js': '[data-lg-root]',
  'live-countdown.js': '[data-cd-root]',
  'live-announcements.js': '[data-an-root]',
  'live-social-dividers.js': '[data-sd-root]',
  'live-popups-code.js': '[data-pc-root]',
  'live-page-popups.js': '[data-pg-root]',
  'live-product-extras.js': '[data-rp-root], [data-svs-root], shopable-video-sticky',
  'live-header.js': 'announcement-rotator-v2',
  'live-blog-slideshow.js': '[data-slideshow-settings], [data-bp-root]',
  'live-cart-search.js': '[data-lcs-root], cart-faq',
  'hero-benefits.js': '[data-hero-benefits]',
  'scroll-text-reveal.js': 'scroll-text-banner[data-text-controls]',
  'text-section-controls.js': '[data-text-controls]',
  'live-text.js': '[data-live-text]',
  'testimonial-quote.js': '[data-testimonial-quote]',
  'announcement-pro-4.js': '[data-announcement-pro-four]',
  'announcement-three-colors.js': '[data-announcement-three]',
  'live-r7-hero.js': '[data-r7h]',
  'live-r7-products.js': '[data-r7k-root]',
  'live-r7-collections.js': '[data-r7c]',
  'live-r7-testimonials.js': '[data-r7t-root]',
  'live-r7-features.js': '[data-r7e]',
  'live-r7-media.js': '[data-r7m]',
  'live-r7-text.js': '[data-r7t]',
  'live-r7-faq.js': '[data-r7f]',
  'live-r7-trust.js': '[data-r7g]',
  'live-r7-promo.js': '[data-r7p]',
  'live-r7-connect.js': '[data-r7n]',
  'live-r7-stories.js': '[data-r7s]',
  'live-r7-extras.js': '[data-r7x]',
};
/* The section runtimes each saved page requests (header, footer and overlay groups included), in the layout's order. */
const GROUPS = ['live-announcements.js', 'live-popups-code.js', 'live-page-popups.js', 'live-header.js', 'announcement-three-colors.js'];
const EXPECT = {
  home: ['before-after-controls.js', 'media-live-benefits.js', 'media-live-stats-reels.js', 'live-products-a.js', 'live-products-b.js', 'live-products-c.js', 'live-features-a.js', 'live-features-c.js', 'live-features-d.js', 'live-testimonials.js', 'live-faq.js', 'live-logos.js', 'live-countdown.js', 'live-announcements.js', 'live-social-dividers.js', 'live-popups-code.js', 'live-page-popups.js', 'live-header.js', 'live-blog-slideshow.js', 'hero-benefits.js', 'announcement-three-colors.js'],
  product: ['live-features-c.js', 'live-features-d.js', 'live-testimonials.js', 'live-faq.js', 'live-announcements.js', 'live-popups-code.js', 'live-page-popups.js', 'live-product-extras.js', 'live-header.js', 'announcement-three-colors.js'],
  collection: ['live-announcements.js', 'live-popups-code.js', 'live-page-popups.js', 'live-header.js', 'announcement-three-colors.js'],
  faqs: ['live-faq.js', 'live-announcements.js', 'live-popups-code.js', 'live-page-popups.js', 'live-header.js', 'announcement-three-colors.js'],
  cart: ['live-announcements.js', 'live-popups-code.js', 'live-page-popups.js', 'live-header.js', 'live-cart-search.js', 'announcement-three-colors.js'],
  blog: ['live-announcements.js', 'live-popups-code.js', 'live-page-popups.js', 'live-header.js', 'live-blog-slideshow.js', 'announcement-three-colors.js'],
  search: ['live-announcements.js', 'live-popups-code.js', 'live-page-popups.js', 'live-header.js', 'live-cart-search.js', 'announcement-three-colors.js'],
};

async function open(browser, html, width, init) {
  const ctx = await browser.newContext({viewport: {width, height: 900}});
  const p = await ctx.newPage();
  const requested = [], errors = [];
  /* this liquidjs render leaves three of the layout's inline scripts with an empty value (shop, theme id); not this file's subject */
  p.on('pageerror', e => { if (!/^Unexpected token/.test(e.message)) errors.push(e.message); });
  if (init) await p.addInitScript(init);
  await p.route('**/*', async rt => {
    const u = new URL(rt.request().url());
    if (u.hostname !== 'fixture.test') return rt.fulfill({status: 204, body: ''});
    if (u.pathname === '/') return rt.fulfill({contentType: 'text/html', body: html});
    if (u.pathname.startsWith('/assets/')) {
      const name = u.pathname.slice(8), f = path.join(repo, 'shopify/assets', name);
      if (rt.request().resourceType() === 'script') requested.push(name);
      const type = name.endsWith('.css') ? 'text/css' : name.endsWith('.js') ? 'text/javascript' : undefined;
      return fs.existsSync(f) ? rt.fulfill({path: f, contentType: type}) : rt.fulfill({status: 404, body: ''});
    }
    if (u.pathname.startsWith('/img/')) return rt.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"/>'});
    return rt.fulfill({status: 204, body: ''});
  });
  await p.goto('https://fixture.test/', {waitUntil: 'load'});
  await p.waitForTimeout(300);
  return {p, ctx, requested, errors};
}
/* Counts the document listeners each script adds while it runs (a second set-up would add them again). */
const COUNT_LISTENERS = () => {
  const add = EventTarget.prototype.addEventListener;
  window.__listeners = {};
  EventTarget.prototype.addEventListener = function (type) {
    const s = document.currentScript && document.currentScript.src;
    if (this === document && s) { const n = s.split('/').pop(); window.__listeners[n] = (window.__listeners[n] || 0) + 1; }
    return add.apply(this, arguments);
  };
};

(async () => {
  let checks = 0;
  /* static */
  assert.deepEqual(Object.keys(ROOTS).sort(), [...SECTION].sort(), 'every section runtime of the loader has its roots listed here');
  for (const name of SECTION) assert(!new RegExp(`<script[^>]+'${name.replace('.', '\\.')}'`).test(layout), `${name}: no tag of its own in the layout`);
  checks++;

  const browser = await chromium.launch({executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined, args: ['--no-sandbox']});
  try {
    for (const [name, want] of Object.entries(EXPECT)) {
      const errors = [];
      const html = await renderTemplate(name, {errors});
      /* Storelib's own review widget (a native section, not in this theme) is drawn by Storelib, not by this render */
      assert.deepEqual(errors.filter(e => e !== 'storelib-review-widget: missing'), [], `${name}: every section draws`);
      const t = await open(browser, html, 1366);
      const got = SECTION.filter(n => t.requested.includes(n));
      assert.deepEqual(got, want, `${name}: the section runtimes requested`);
      assert.deepEqual(LAZY.filter(n => t.requested.includes(n)), [], `${name}: no builder-only controller`);
      const needed = await t.p.evaluate(({html, ROOTS}) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return Object.keys(ROOTS).filter(n => doc.querySelector(ROOTS[n]));
      }, {html, ROOTS});
      assert.deepEqual(got, SECTION.filter(n => needed.includes(n)), `${name}: a runtime is requested exactly when the page has a root it drives`);
      assert.deepEqual(t.errors, [], `${name}: no page errors`);
      const other = [...new Set(t.requested)].length - got.length;
      console.log(`ok ${name}: ${got.length} section runtimes (${got.filter(n => !GROUPS.includes(n)).join(', ') || 'none'} besides the header, footer and overlay groups' ${got.filter(n => GROUPS.includes(n)).length}), ${other} other scripts`);
      await t.ctx.close();
      checks++;
    }

    /* a section placed twice */
    const faqs = JSON.parse(read('templates/faqs.json'));
    const id = faqs.order.find(k => faqs.sections[k].type === 'faq-tabs');
    assert(id, 'the FAQ page has FAQ Tabs');
    const twice = JSON.parse(JSON.stringify(faqs));
    twice.sections[id + '_copy'] = JSON.parse(JSON.stringify(faqs.sections[id]));
    twice.order.splice(twice.order.indexOf(id) + 1, 0, id + '_copy');
    const one = await renderTemplate('faqs', {}), two = await renderTemplate('faqs', {template: twice});
    const tags = h => h.split(`/live-faq.js"`).length - 1;
    assert.equal(tags(two), tags(one) + 1, 'the copy links live-faq.js once more');
    const a = await open(browser, one, 1366, COUNT_LISTENERS), b = await open(browser, two, 1366, COUNT_LISTENERS);
    const la = await a.p.evaluate(() => window.__listeners), lb = await b.p.evaluate(() => window.__listeners);
    assert(la['live-faq.js'] > 0, 'live-faq.js adds its document listeners');
    assert.deepEqual(lb, la, 'with the section twice every script adds the same document listeners as with it once: live-faq.js set itself up once');
    const opened = await b.p.evaluate(() => [...document.querySelectorAll('[data-faq-root]')].map(root => {
      const item = [...root.querySelectorAll('[data-faq-item]')].find(i => !i.hasAttribute('open') && i.querySelector('[data-faq-trigger]'));
      if (!item) return null;
      item.querySelector('[data-faq-trigger]').click();
      return item.hasAttribute('open');
    }));
    assert.equal(opened.length, 2, 'two FAQ Tabs on the page');
    assert.deepEqual(opened, [true, true], 'one click opens a question in each copy (toggled once, not twice)');
    assert.deepEqual(b.errors, [], 'no page errors with the section twice');
    await a.ctx.close(); await b.ctx.close();
    checks++;
    console.log(`ok a section placed twice links its runtime twice and runs it once (live-faq.js: ${la['live-faq.js']} document listeners either way)`);
  } finally { await browser.close(); }
  console.log(`theme-scripts-per-page: ${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
