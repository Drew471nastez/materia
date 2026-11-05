/* Run: node tests/theme-css-loading.cjs   (exits 1 on any failure)
   Which stylesheets hold a page, and proof that loading them differently
   changed nothing a visitor sees.

   - minicart.css: where the cart drawer is drawn (every template but the
     cart page, unless Theme settings send an add to the cart page),
     cart-drawer.css is linked after it, with the drawer, and repeats every
     rule of minicart.css but the cart-refresh fade. There minicart.css loads
     without holding the parser, the page's scripts or its ready event (print
     swap, <noscript> copy). The cart page has no drawer and keeps it plain.
   - critical.css and product-card.css carried rules written twice in the
     same file; the earlier copy could never win and is gone.

   Static checks always run. The rendered checks need liquidjs
   (LIQUIDJS=<path to liquidjs>): the saved home page (templates/home.json),
   a product, a collection, the cart, search and the blog page are drawn in
   the real layout with the header, footer and overlay groups, once with the
   files above as they were at BASE (git show BASE:<file>) and once as they
   are now, and the screenshots must be byte-identical at 375 and 1366; then
   again with minicart.css never answering, which must also look the same,
   and the cart drawer opened at once on such a page must look like the
   drawer of the page before. When a later change to these files is meant to
   look different, move BASE to that commit. The comparison is skipped when
   BASE is not in this clone's history. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

const BASE = 'd9f4008';
const BEFORE_FILES = ['snippets/minicart.storelib'];
const BEFORE_ASSETS = ['critical.css', 'product-card.css'];
/* Only state after a cart change; never seen before the first paint or when the drawer opens. */
const MINICART_OWN = ['#minicart_wrapper cart-items.cart-refreshing .cart-item:not(.materia-row-exit),#minicart_wrapper cart-items.cart-refreshing .cart-recommend,#minicart_wrapper cart-items.cart-refreshing .cart-item img,#minicart_wrapper .cart-recommend,#minicart_wrapper .cart-recommend .swiper'];

/* ---------- CSS rules: [{ctx, sel, body}] with the at-rule context each sits in ---------- */
function rules(text) {
  const out = []; let i = 0; const n = text.length;
  const comment = () => { const e = text.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; };
  const prelude = () => { let s = '', depth = 0; while (i < n) { const c = text[i];
    if (text.startsWith('/*', i)) { comment(); s += ' '; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < n && text[j] !== c) { if (text[j] === '\\') j++; j++; } s += text.slice(i, j + 1); i = j + 1; continue; }
    if (c === '(') depth++; if (c === ')') depth--;
    if (depth <= 0 && '{;}'.includes(c)) return s; s += c; i++; } return s; };
  const skipBlock = () => { let d = 1; while (i < n && d) { if (text.startsWith('/*', i)) { comment(); continue; } if (text[i] === '{') d++; else if (text[i] === '}') d--; i++; } };
  (function block(ctx) {
    for (;;) {
      while (i < n && (/\s/.test(text[i]) || text.startsWith('/*', i))) { if (text[i] === '/') comment(); else i++; }
      if (i >= n) return; if (text[i] === '}') { i++; return; }
      const start = i, pre = prelude().trim();
      if (text[i] !== '{') { i++; continue; }
      i++;
      if (pre.startsWith('@') && !/^@(font-face|(-webkit-)?keyframes|page|property|counter-style)/.test(pre)) { block([...ctx, pre.replace(/\s+/g, ' ')]); continue; }
      const bs = i; skipBlock();
      const raw = text.slice(bs, i - 1).replace(/\/\*[\s\S]*?\*\//g, '');
      out.push({ctx: ctx.join(' | '), sel: pre.replace(/\s+/g, ' ').replace(/\s*([>+~,])\s*/g, '$1'), body: raw.replace(/\s+/g, ' ').replace(/\s*([:;{}])\s*/g, '$1').replace(/;$/, '').trim(), start, end: i});
    }
  })([]);
  return out;
}
const key = r => r.ctx + '\u0000' + r.sel + '\u0000' + r.body;

/* ---------- static ---------- */
const minicart = read('snippets/minicart.storelib');
const linkAt = minicart.indexOf("'minicart.css' | asset_url");
ok(/\{%- if template != 'cart' and settings\.action_after_add_cart != 'go_to_cart_page' -%\}\s*<link rel="stylesheet" href="\{\{ 'minicart\.css' \| asset_url \}\}" media="print" onload="this\.media='all'"><noscript>\{\{ 'minicart\.css' \| asset_url \| stylesheet_tag \}\}<\/noscript>\s*\{%- else -%\}\s*\{\{ 'minicart\.css' \| asset_url \| stylesheet_tag \}\}\s*\{%- endif -%\}/.test(minicart),
  'minicart: minicart.css is a print swap with a <noscript> copy where the drawer is drawn, a plain stylesheet on the cart page');
const drawerIf = minicart.indexOf("{% if template != 'cart' and action_after_add_cart != 'go_to_cart_page' %}");
const presentation = minicart.indexOf("{% render 'cart-drawer-presentation' %}");
ok(linkAt > 0 && drawerIf > linkAt && presentation > drawerIf && minicart.indexOf('{% endif %}', presentation) > presentation && /assign action_after_add_cart = theme_st\.action_after_add_cart/.test(minicart) && /assign theme_st = settings/.test(minicart),
  'minicart: cart-drawer.css (cart-drawer-presentation) is drawn after minicart.css, under the same condition the print swap uses');
ok(read('snippets/cart-drawer-presentation.storelib').includes("{{ 'cart-drawer.css' | asset_url | stylesheet_tag }}"), 'cart-drawer-presentation links cart-drawer.css as a plain stylesheet');
{
  const later = new Set(rules(read('shopify/assets/cart-drawer.css')).map(key));
  const own = rules(read('shopify/assets/minicart.css')).filter(r => !later.has(key(r)));
  ok(own.every(r => MINICART_OWN.includes(r.sel)), `every minicart.css rule but the cart-refresh fade is repeated in cart-drawer.css, in the same context (not repeated: ${own.map(r => r.sel.slice(0, 90)).join(' / ')})`);
}
for (const f of ['critical.css', 'product-card.css']) {
  const list = rules(read('shopify/assets/' + f)), seen = new Map(), dup = [];
  for (const r of list) { if (seen.has(key(r))) dup.push(r.sel); seen.set(key(r), r); }
  ok(!dup.length, `${f}: no rule written twice in the same context (${dup.join(', ')})`);
}
{
  const head = read('layout/theme.storelib').split('</head>')[0].replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  ok(!/'minicart\.css' \| asset_url \| stylesheet_tag/.test(head) && /<link rel="preload" as="style" href="\{\{ 'minicart\.css' \| asset_url \}\}" fetchpriority="low">/.test(head), 'layout <head>: minicart.css is only a low-priority preload');
}

/* ---------- rendered ---------- */
let Liquid = null, Drop = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) {
  try { ({Liquid, Drop} = require(p)); break; } catch { /* next */ }
}
if (!Liquid) {
  console.log(`${checks} CSS loading checks passed (render skipped: liquidjs not installed; set LIQUIDJS=<path to liquidjs>)`);
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
const KILL = '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important}';

const {chromium} = require('playwright');
(async () => {
  let baseOk = false;
  try { execFileSync('git', ['-C', root, 'cat-file', '-e', BASE + '^{commit}'], {stdio: 'ignore'}); baseOk = true; } catch { /* shallow */ }
  const show = f => execFileSync('git', ['-C', root, 'show', `${BASE}:${f}`], {maxBuffer: 1 << 28}).toString();
  const overlay = baseOk ? Object.fromEntries(BEFORE_FILES.map(f => [f, show(f)])) : null;
  const assetOverlay = baseOk ? Object.fromEntries(BEFORE_ASSETS.map(f => [f, show('shopify/assets/' + f)])) : {};

  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text']});
  /* Fixed time, fixed random: two loads of one page draw the same pixels. */
  const load = async (html, width, opts = {}) => {
    const ctx = await browser.newContext({viewport: {width, height: 900}, ...(width < 500 ? {isMobile: true, hasTouch: true} : {}), reducedMotion: 'reduce'});
    const p = await ctx.newPage();
    await serve(p, html, opts);
    await p.clock.install({time: new Date('2026-11-01T10:00:00Z')});
    await p.clock.pauseAt(new Date('2026-11-01T10:00:05Z'));
    await p.addInitScript(() => { let s = 1; Math.random = () => (s = s * 16807 % 2147483647) / 2147483647; });
    await p.goto('https://fixture.test/', {waitUntil: 'domcontentloaded'});
    await p.addStyleTag({content: KILL});
    await p.waitForTimeout(300);
    await p.clock.runFor(3000);
    await p.waitForTimeout(300);
    await p.evaluate(() => document.fonts.ready);
    return {p, ctx};
  };
  const shot = async (html, width, opts) => { const {p, ctx} = await load(html, width, opts); const png = await p.screenshot({fullPage: true}); const info = await p.evaluate(() => ({
    blocking: performance.getEntriesByType('resource').filter(e => e.initiatorType === 'link' && /\.css$/.test(e.name) && e.renderBlockingStatus === 'blocking').map(e => e.name.split('/').pop()),
    minicart: [...document.querySelectorAll('link[href$="/minicart.css"]')].map(l => l.media || 'all'),
    sheet: [...document.styleSheets].some(s => s.href && s.href.endsWith('/minicart.css') && s.media.mediaText !== 'print'),
  })); await ctx.close(); return {png, info}; };

  try {
    for (const name of Object.keys(PAGE)) {
      const errors = [];
      const after = await renderTemplate(name, {errors, skip: POPUPS});
      const drawer = name !== 'cart';
      const links = [...after.matchAll(/<link rel="stylesheet" href="\/assets\/minicart\.css"([^>]*)>/g)].map(m => m[1].trim());
      ok(links.length === (drawer ? 2 : 1) && (drawer ? links[0] === `media="print" onload="this.media='all'"` && after.includes('<noscript><link rel="stylesheet" href="/assets/minicart.css"></noscript>') : links[0] === ''),
        `${name}: minicart.css is ${drawer ? 'a print swap' : 'a plain stylesheet'} (${links.join(' | ')})`);
      if (drawer) ok(after.indexOf('/assets/cart-drawer.css') > after.indexOf('/assets/minicart.css'), `${name}: cart-drawer.css comes after minicart.css`);
      const before = overlay ? await renderTemplate(name, {overlay, skip: POPUPS}) : null;
      for (const width of [375, 1366]) {
        const now = await shot(after, width);
        ok(!now.info.blocking.includes('minicart.css'), `${name} @${width}: minicart.css does not block rendering`);
        if (drawer) ok(now.info.minicart[0] === 'all' && now.info.sheet, `${name} @${width}: minicart.css applies once loaded`);
        if (!before) continue;
        const then = await shot(before, width, {assetOverlay});
        ok(then.png.equals(now.png), `${name} @${width}: the page is pixel-identical to ${BASE}`);
        if (drawer) {
          const hung = await shot(after, width, {block: ['minicart.css']});
          ok(hung.png.equals(then.png), `${name} @${width}: with minicart.css never answering, the page still looks the same`);
        }
      }
      if (errors.length) console.log(`  (${name}: sections the fixture cannot draw, the same on both sides: ${[...new Set(errors)].join('; ')})`);
    }

    /* The drawer, opened as soon as the page is ready with minicart.css still on its way, is the drawer of before. */
    if (overlay) {
      const before = await renderTemplate('home', {overlay, skip: POPUPS}), after = await renderTemplate('home', {skip: POPUPS});
      for (const width of [375, 1366]) {
        const opened = async (html, opts) => {
          const {p, ctx} = await load(html, width, opts);
          await p.evaluate(() => { const a = [...document.querySelectorAll('#cart-icon-bubble')].find(el => el.getClientRects().length); a.click(); });
          await p.clock.runFor(1500);
          await p.waitForTimeout(200);
          const open = await p.evaluate(() => !!document.querySelector('#minicart_wrapper .minicart__wrapper.open'));
          const png = await p.screenshot();
          await ctx.close();
          return {open, png};
        };
        const a = await opened(before, {assetOverlay}), b = await opened(after, {block: ['minicart.css']});
        ok(a.open && b.open, `home @${width}: the cart drawer opens`);
        ok(a.png.equals(b.png), `home @${width}: the drawer opened with minicart.css still loading looks as before`);
      }
    } else console.log(`  (before/after skipped: ${BASE} not in this clone's history)`);
  } finally { await browser.close(); }
  console.log(`${checks} CSS loading checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
