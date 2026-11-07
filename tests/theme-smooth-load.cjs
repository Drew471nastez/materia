/* Run: node tests/theme-smooth-load.cjs   (exits 1 on any failure)
   Pages land and scroll without anything moving under the visitor.

   The saved home, product and collection pages (templates/*.json with the
   header, footer and overlay groups, drawn in layout/theme the way
   theme-css-loading.cjs draws them) are opened at 375 and 1366 and must:
   - shift less than 0.02 (Cumulative Layout Shift) while loading and in the
     first 3 s. The product carries a Storelib quantity break, whose cards
     (snippets/storelib-product-offers) hold their place before
     product-offers.js draws them;
   - not move while the page is scrolled down and back up (the sticky header
     keeps the Header height setting when it sticks, the back-to-top button
     follows the bottom bars with translate, the dots' row of a slideshow
     is kept before Swiper fills it);
   - stay at the top after loading: nothing scrolls the page, and focus() is
     only called with preventScroll;
   - register no blocking (passive: false) touchstart, touchmove or wheel
     listener on window or document from a theme script (Swiper listens to
     touchmove on the slider itself).
   Static: no :has() in the theme's CSS tests a style attribute (one did, and
   every inline style write on the page then cost ~12 ms of style work).
   The rendered checks need liquidjs (LIQUIDJS=<path to liquidjs>). */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

/* ---------- static ---------- */
for (const f of fs.readdirSync(path.join(root, 'shopify/assets')).filter(f => f.endsWith('.css'))) {
  const css = read('shopify/assets/' + f).replace(/\/\*[\s\S]*?\*\//g, '');
  ok(!/:has\([^{}]*\[style/.test(css), `${f}: no :has() tests a style attribute`);
}
ok(/\.animate > header\.header \{[^}]*height: var\(--header-bar-height, auto\) !important;/.test(read('shopify/assets/header-layout.css')), 'header-layout.css: the stuck bar keeps the Header height');
const swiper = read('shopify/assets/swiper-bundle.min.js');
ok(swiper.includes('r[d]("touchmove",e.onTouchMove,{passive:!1,capture:o})') && swiper.includes('s[d]("touchstart",e.onDocumentTouchStart,{passive:!0,capture:o})'), 'Swiper: touchmove on the slider, the document touchstart passive');
ok(!/bottom \.3s/.test(read('sections/back-to-top-pro.storelib')), 'back-to-top-pro: bottom is not animated');

/* ---------- rendered ---------- */
let Liquid = null, Drop = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) {
  try { ({Liquid, Drop} = require(p)); break; } catch { /* next */ }
}
if (!Liquid) {
  console.log(`${checks} smooth load checks passed (render skipped: liquidjs not installed; set LIQUIDJS=<path to liquidjs>)`);
  process.exit(0);
}

const {engine, R5} = require('./theme-r6-main-product-lib.cjs');
class TemplateDrop extends Drop { constructor(n) { super(); this.name = n; } valueOf() { return this.name; } toString() { return this.name; } }

/* ---------- a whole template in the real layout ---------- */
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
  home: {file: 'templates/home.json', page_type: 'index'},
  product: {file: 'templates/product.json', page_type: 'product'},
  collection: {file: 'templates/collection.json', page_type: 'collection'},
  cart: {file: 'templates/cart.json', page_type: 'cart'},
  search: {file: 'templates/search.json', page_type: 'search'},
  blog: {file: 'templates/blog.json', page_type: 'blog'},
};
const readIn = (tree, f, overlay) => overlay && overlay[f] != null ? overlay[f] : fs.readFileSync(path.join(tree, f), 'utf8');

/* overlay: {relative path: text} read instead of the tree's file (layout, snippets, sections). */
async function renderTemplate(name, {tree = root, overlay = null, errors = [], skip = []} = {}) {
  const spec = PAGE[name];
  const all = JSON.parse(readIn(tree, 'config/settings.json', overlay));
  const theme = {...all.shopify};
  const schemes = Object.entries(theme.color_schemes).map(([id, v]) => ({id, settings: v.settings}));
  theme.color_schemes = schemes;
  const base = {
    settings: theme, request: {host: 'fixture.test', locale: {iso_code: 'en'}, page_type: spec.page_type, design_mode: false, path: '/'},
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
    const g = JSON.parse(readIn(tree, file, overlay)); let out = '';
    for (const k of g.order) if (!g.sections[k].disabled && !skip.includes(g.sections[k].type)) out += await draw(k, g.sections[k], cls);
    return out;
  };
  const groups = {
    'header-group': await group('sections/header-group.json', ' shopify-section-group-header-group'),
    'footer-group': await group('sections/footer-group.json', ' shopify-section-group-footer-group'),
    'overlay-group': await group('sections/overlay-group.json', ' shopify-section-group-overlay-group'),
  };
  const t = JSON.parse(readIn(tree, spec.file, overlay));
  let content = '', i = 0;
  for (const k of t.order) if (!t.sections[k].disabled) content += await draw(k, t.sections[k], '', ++i);
  const html = await mk(groups).parseAndRender(clean(body(readIn(tree, 'layout/theme.storelib', overlay))), {...base, content_for_header: '', content_for_layout: content}, {globals: base});
  return html;
}

const SVG = {black: '#1d1d1d', beige: '#d8cdb5', poster: '#7a8fa6', red: '#b0302a', blue: '#2a4bb0', tall: '#4a7a4a'};
/* Serves html at https://fixture.test/ and the tree's assets; opts.delay {name: ms}, opts.block [names] */
async function serve(page, html, {tree = root, delay = {}, block = [], assetOverlay = {}} = {}) {
  await page.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.hostname !== 'fixture.test') return r.fulfill({status: 204, body: ''});
    if (u.pathname === '/') return r.fulfill({contentType: 'text/html', body: html});
    if (u.pathname.startsWith('/assets/')) {
      const n = u.pathname.slice(8);
      if (block.includes(n)) return; /* never answered */
      if (delay[n]) await new Promise(res => setTimeout(res, delay[n]));
      const ct = n.endsWith('.css') ? 'text/css' : n.endsWith('.js') ? 'text/javascript' : undefined;
      if (assetOverlay[n] != null) return r.fulfill({body: assetOverlay[n], contentType: ct});
      const f = path.join(tree, 'shopify/assets', n);
      return fs.existsSync(f) ? r.fulfill({path: f, contentType: ct}) : r.fulfill({status: 404, body: ''});
    }
    if (u.pathname.startsWith('/img/')) {
      const key = u.pathname.slice(5).replace(/\.svg.*$/, '');
      return r.fulfill({contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="${SVG[key] || '#888'}"/></svg>`});
    }
    return r.fulfill({status: 204, body: ''});
  });
}
const POPUPS = ['promobanner', 'promotionalpopup2', 'promonewsletterpopup-2', 'promotional-image-popup', 'spin-wheel-popup', 'countdown-promo-popup', 'coupon-promotion-newsletter-popup', 'fake-order'];

/* A quantity break as Storelib sends it (product.metafields.storelib.offers). */
const OFFERS = {bundles: [], checkoutOffers: [], quantityBreaks: [{offerId: 'qb-1', productId: 'pants-down', title: 'Buy more, save more', priceCents: 13777, compareAtCents: 21193,
  tiers: [{quantity: 2, freeQuantity: 0, discountType: 'percent', discountValue: 20, label: 'Buy 2, save 20%', badge: '', unitPriceCents: 11022, totalCents: 22043, compareCents: 27554},
    {quantity: 3, freeQuantity: 0, discountType: 'percent', discountValue: 30, label: 'Buy 3, save 30%', badge: '', unitPriceCents: 9644, totalCents: 28932, compareCents: 41331}]}]};

/* Before any page script: what moves, what scrolls, what blocks a scroll. */
const WATCH = () => {
  const w = window.__smooth = {shifts: [], scrolls: [], focus: [], listeners: [], scrollEvents: 0};
  const name = n => { n = n && (n.nodeType === 1 ? n : n.parentElement); if (!n) return '?'; const s = n.closest('.shopify-section'); return n.tagName.toLowerCase() + '.' + String(n.className).trim().split(/\s+/).slice(0, 2).join('.') + (s ? ' @' + s.id : ''); };
  new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) w.shifts.push({t: Math.round(e.startTime), v: e.value, phase: w.phase || 'load', src: (e.sources || []).map(s => name(s.node)).join(', ')}); })).observe({type: 'layout-shift', buffered: true});
  const theme = () => { const line = (new Error().stack || '').split('\n').slice(2).find(l => /\/assets\/|fixture\.test\/:/.test(l)); return line ? line.trim() : null; };
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (/^(touchstart|touchmove|wheel|mousewheel)$/.test(type) && (this === window || this === document) && opts && typeof opts === 'object' && opts.passive === false) {
      const at = theme(); if (at) w.listeners.push(`${type} on ${this === window ? 'window' : 'document'} ${at}`);
    }
    return add.call(this, type, fn, opts);
  };
  for (const [o, m] of [[window, 'scrollTo'], [window, 'scroll'], [window, 'scrollBy'], [Element.prototype, 'scrollIntoView']]) {
    const f = o[m]; o[m] = function (...a) { if (!w.free) w.scrolls.push(`${m} ${theme() || ''}`); return f.apply(this, a); };
  }
  const focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (o) { if (!(o && o.preventScroll) && !w.free) w.focus.push(`${name(this)} ${theme() || ''}`); return focus.call(this, o); };
  add.call(window, 'scroll', () => { if (!w.free) w.scrollEvents++; }, {passive: true});
};

const {chromium} = require('playwright');
(async () => {
  R5.PANTS.metafields = {...R5.PANTS.metafields, storelib: {offers: {value: OFFERS}}};
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    for (const name of ['home', 'product', 'collection']) {
      let html = await renderTemplate(name, {skip: POPUPS});
      /* The fixture's {% form %} prints a bare <form>: give the product form its id, as the store does. */
      const formId = (html.match(/data-form-id="([^"]+)"/) || [])[1];
      if (formId) html = html.replace(/<form>(?=[\s\S]{0,1500}name="id")/, `<form id="${formId}">`);
      if (name === 'product') ok(/<storelib-product-offers[\s\S]*?class="po-tier/.test(html), 'product: the quantity break cards are in the page before its script');
      for (const width of [375, 1366]) {
        const ctx = await browser.newContext({viewport: {width, height: 844}, ...(width < 500 ? {isMobile: true, hasTouch: true} : {})});
        const p = await ctx.newPage();
        const errors = []; p.on('pageerror', e => errors.push(e.message));
        await p.addInitScript(WATCH);
        await serve(p, html);
        await p.goto('https://fixture.test/', {waitUntil: 'load'});
        await p.waitForTimeout(3000);
        const at = `${name} @${width}`;
        const load = await p.evaluate(() => ({...window.__smooth, y: scrollY}));
        const cls = load.shifts.reduce((n, s) => n + s.v, 0);
        ok(cls < 0.02, `${at}: CLS ${cls.toFixed(4)} while loading (max 0.02)${cls >= 0.02 ? '\n  ' + load.shifts.map(s => `${s.t}ms ${s.v.toFixed(4)} ${s.src}`).join('\n  ') : ''}`);
        ok(load.y === 0 && load.scrollEvents === 0, `${at}: the page stays at the top (scrollY ${load.y}, ${load.scrollEvents} scroll events)`);
        ok(!load.scrolls.length && !load.focus.length, `${at}: nothing scrolls the page or focuses without preventScroll\n  ${[...load.scrolls, ...load.focus].join('\n  ')}`);
        ok(!load.listeners.length, `${at}: no blocking touch or wheel listener on window or document\n  ${load.listeners.join('\n  ')}`);
        /* Down and back up, a frame per step. */
        await p.evaluate(async () => {
          const w = window.__smooth; w.free = true; w.phase = 'scroll';
          const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const end = Math.min(document.documentElement.scrollHeight - innerHeight, 5000);
          for (let y = 0; y <= end; y += 120) { window.scrollTo(0, y); await frame(); }
          await new Promise(r => setTimeout(r, 400));
          for (let y = end; y >= 0; y -= 120) { window.scrollTo(0, y); await frame(); }
          window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 700));
        });
        const moved = (await p.evaluate(() => window.__smooth.shifts)).filter(s => s.phase === 'scroll');
        const total = moved.reduce((n, s) => n + s.v, 0);
        ok(total < 0.001, `${at}: nothing moves while scrolling (${total.toFixed(4)})${total >= 0.001 ? '\n  ' + moved.map(s => `${s.t}ms ${s.v.toFixed(4)} ${s.src}`).join('\n  ') : ''}`);
        ok(!errors.length, `${at}: no page errors\n  ${errors.join('\n  ')}`);
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
  console.log(`${checks} smooth load checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
