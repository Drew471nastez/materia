/* Run: node tests/theme-storefront-payload.cjs   (exits 1 on any failure)
   Settings JSON that only the builder's live preview reads is printed in the
   builder only ({% if request.design_mode %}), so a visitor's page does not
   carry it (docs/storefront-scripts-audit.md, "Settings JSON on the page").

   Static checks always run:
   - every data-<family>= of a builder-only family in sections/, snippets/
     and blocks/ sits inside {% if request.design_mode %} (the few sections
     whose runtime reads its family on the storefront are named in KEEP);
   - every controller that reads such a family paints nothing for a root
     printed without it, so a canvas that does not set request.design_mode
     shows each change through the builder's redraw instead.

   The rendered checks need liquidjs (LIQUIDJS=<path to liquidjs>): the saved
   home page (templates/home.json), a product page and a collection page are
   drawn in the real layout with the header, footer and overlay groups, once
   as a visitor (request.design_mode false) and once as the builder. As a
   visitor no builder-only family is printed and the JSON data-* attributes
   left (the ones storefront code reads) stay under BUDGET bytes per page; in
   the builder every builder-only family on the page is printed. Then, in
   Chromium, sections drawn as a visitor and given a live change are left as
   they are (the builder redraws them), and the same sections drawn as the
   builder still take the change live. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(repo, f), 'utf8');
let checks = 0;

/* data-<family> attributes printed for the builder only, and the controller that reads them */
const FAMILIES = {
  'media-live-text-grid.js': ['tg-settings', 'tg-defaults', 'tg-block-defaults'],
  'live-hero-gaps.js': ['hg-settings'],
  'live-collection-pages.js': ['lcp-settings', 'lcp-block-settings'],
  'live-account-pages.js': ['ap-settings'],
  'live-contact.js': ['ct-settings'],
  'live-main-product.js': ['pib-own'],
  'live-footer.js': ['ft-settings', 'mnb-settings'],
  'live-social-dividers.js': ['sd-settings', 'sd-socials'],
  'media-live-benefits.js': ['mlb-settings', 'mlb-defaults', 'mlb-block-defaults'],
  'live-features-b.js': ['fb-settings', 'fb-bs', 'fb-spec', 'fb-bspec'],
  'live-testimonials.js': ['tm-settings', 'lt-settings'],
  'live-page-popups.js': ['pg-settings'],
  'live-product-extras.js': ['rp-settings'],
  'live-cart-search.js': ['lcs-settings'],
  'live-products-a.js': ['pa-settings'],
  'live-announcements.js': ['an-settings', 'an-defaults', 'an-block-defaults'],
  'live-features-a.js': ['fa-settings'],
  'live-logos.js': ['lg-settings', 'lg-defaults', 'lg-block-defaults'],
  'live-popups-code.js': ['pc-settings'],
};
/* Sections (and the snippets drawing them) whose storefront code reads the family: printed for everyone. */
const KEEP = {
  'ct-settings': ['sections/collection-tab.storelib'], /* live-products-c.js paints Collection tabs on load */
  'lt-settings': ['sections/testimonials4.storelib', 'sections/scrolling-text.storelib', 'sections/inline-image-heading.storelib', 'sections/quotebanner.storelib'], /* Spotlight autoplay; live-text.js paints on load */
  'lg-settings': ['sections/brand-info.storelib'], /* its first paint is live-logos.js's (snippets/logos-root, logos-block) */
  'lg-defaults': ['sections/brand-info.storelib'],
  'lg-block-defaults': ['sections/brand-info.storelib'],
  'pc-settings': ['sections/fake-order.storelib'], /* the notifications' names and places */
};
const FAMILY = Object.values(FAMILIES).flat();
const files = ['sections', 'snippets', 'blocks'].flatMap(d => fs.readdirSync(path.join(repo, d)).filter(f => f.endsWith('.storelib')).map(f => d + '/' + f));

/* ---------- static: printed in the builder only ---------- */
for (const f of files) {
  const src = read(f).split('\n<schema>')[0];
  for (const fam of FAMILY) {
    const re = new RegExp('data-' + fam + '=', 'g');
    let m;
    while ((m = re.exec(src))) {
      if ((KEEP[fam] || []).includes(f)) continue;
      const before = src.slice(Math.max(0, m.index - 400), m.index);
      const open = Math.max(before.lastIndexOf('{% if request.design_mode'), before.lastIndexOf('{%- if request.design_mode'));
      const ok = open >= 0 && !/\{%-?\s*(endif|else)\s*-?%\}/.test(before.slice(open));
      assert(ok, f + ' line ' + (src.slice(0, m.index).split('\n').length) + ': data-' + fam + ' is printed outside {% if request.design_mode %}');
    }
  }
}
checks++;
/* the kept sections still print theirs for everyone */
for (const [fam, list] of Object.entries(KEEP)) for (const f of list) assert(new RegExp('\\sdata-' + fam + '="').test(read(f).split('\n<schema>')[0]) || (f === 'sections/brand-info.storelib' && fam === 'lg-settings'), f + ' keeps data-' + fam);
assert(read('snippets/logos-root.storelib').includes("{% if request.design_mode or type == 'brand-info' %} data-lg-settings="));
assert(read('sections/brand-info.storelib').includes("{% render 'logos-block', block: block, live: true %}"));
checks++;

/* ---------- static: a root printed without its settings is not painted ---------- */
const GUARD = {
  'media-live-text-grid.js': "if (!root.hasAttribute('data-tg-settings')) continue;",
  'live-hero-gaps.js': "if (!root.hasAttribute('data-hg-settings')) return;",
  'live-collection-pages.js': "[data-lcp][data-lcp-id][data-lcp-settings]",
  'live-account-pages.js': "if (!root.hasAttribute('data-ap-settings')) return;",
  'live-contact.js': "if (!root.hasAttribute('data-ct-settings')) return;",
  'live-main-product.js': "if (!el.hasAttribute('data-pib-own')) { refetch(sec, bid); return; }",
  'live-social-dividers.js': "if (root.hasAttribute('data-sd-settings')) derive(root, st, false);",
  'media-live-benefits.js': "if (root.hasAttribute('data-mlb-settings')) derive(root, st, false);",
  'live-features-b.js': "if (!st.el.hasAttribute('data-fb-settings')) return;",
  'live-testimonials.js': "if (!st.el.hasAttribute('data-lt-settings') && !st.el.hasAttribute('data-tm-settings')) return;",
  'live-page-popups.js': "if (root.hasAttribute('data-pg-settings')) derive(root, st, false);",
  'live-product-extras.js': "!st.el.hasAttribute('data-rp-settings')) return;",
  'live-cart-search.js': "if (root.hasAttribute('data-lcs-settings')) derive(root, st, false);",
  'live-products-a.js': "if (root.hasAttribute('data-pa-settings')) derive(root, st, false);",
  'live-announcements.js': "if (root.hasAttribute('data-an-settings')) derive(root, st, false);",
  'live-features-a.js': "if (root.hasAttribute('data-fa-settings')) derive(root, st, false);",
  'live-logos.js': "if (root.hasAttribute('data-lg-settings')) derive(root, st, false);",
  'live-popups-code.js': "if (root.hasAttribute('data-pc-settings')) derive(root, st, false);",
};
for (const [f, g] of Object.entries(GUARD)) assert(read('shopify/assets/' + f).includes(g), f + ' paints nothing without its settings');
assert(read('shopify/assets/live-footer.js').includes("parse(root.getAttribute(isBar ? 'data-mnb-settings' : 'data-ft-settings'))"));
/* Announcement bar's close button keeps its "stay closed for" days without the settings */
assert(read('sections/announcement-bar-basic.storelib').includes('{% else %} data-an-close-days="{% if section.settings.close_persistence_days == nil %}1{% else %}{{ section.settings.close_persistence_days }}{% endif %}"{% endif %}'));
assert(read('shopify/assets/live-announcements.js').includes("days: () => root.hasAttribute('data-an-settings') ? st.s.close_persistence_days : root.dataset.anCloseDays"));
checks++;

/* ---------- rendered ---------- */
let Liquid = null, Drop = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) {
  try { ({Liquid, Drop} = require(p)); break; } catch { /* next */ }
}
if (!Liquid) {
  console.log(checks + ' storefront payload checks passed (render skipped: liquidjs not installed; set LIQUIDJS=<path to liquidjs>)');
  process.exit(0);
}
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
  const theme = {...all.shopify};
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


/* JSON data-* attributes of a page: name -> bytes (the attribute as printed) */
const JSON_ATTR = /\s(data-[a-z0-9-]+)=("\s*(?:\{|\[|&#123;|&#91;|&quot;\{)[^"]*"|'\s*[\{\[][^']*')/g;
function jsonAttrs(html) {
  const out = {};
  for (const m of html.matchAll(JSON_ATTR)) out[m[1]] = (out[m[1]] || 0) + Buffer.byteLength(m[0]);
  return out;
}
/* Bytes of JSON data-* attributes a visitor still gets per page: measured 80,745 (home), 28,156 (product), 8,568 (collection), + 10%. Before: 207,276 / 111,967 / 44,326. */
const BUDGET = {home: 88820, product: 30972, collection: 9425};

(async () => {
  const report = [];
  for (const name of ['home', 'product', 'collection']) {
    const errors = [];
    const shop = await renderTemplate(name, {errors});
    const builder = await renderTemplate(name, {design: true});
    const a = jsonAttrs(shop), b = jsonAttrs(builder);
    const leaked = FAMILY.map(f => 'data-' + f).filter(n => a[n]).filter(n => !Object.keys(KEEP).some(k => 'data-' + k === n));
    assert.deepEqual(leaked, [], name + ': builder-only settings printed for a visitor');
    for (const [fam, list] of Object.entries(KEEP)) if (a['data-' + fam]) {
      /* a kept family reaches a visitor only from the sections that keep it */
      const types = shop.split('data-section-type="').slice(1).filter(c => c.includes('data-' + fam + '=')).map(c => 'sections/' + c.slice(0, c.indexOf('"')) + '.storelib');
      for (const t of types) assert(list.includes(t), name + ': data-' + fam + ' printed for a visitor by ' + t);
    }
    const total = Object.values(a).reduce((x, y) => x + y, 0);
    assert(total <= BUDGET[name], name + ': ' + total + ' bytes of JSON data-* attributes for a visitor, over the budget of ' + BUDGET[name]);
    const present = FAMILY.map(f => 'data-' + f).filter(n => b[n]);
    assert(present.length >= (name === 'collection' ? 1 : 4), name + ': the builder still gets the live settings (' + present.join(' ') + ')');
    for (const n of Object.keys(a)) assert(b[n], name + ': ' + n + ' printed for a visitor but not in the builder');
    report.push(name + ' ' + total + 'B/' + Object.values(b).reduce((x, y) => x + y, 0) + 'B');
  }
  checks++;

  /* ---------- in Chromium: no settings, no live paint; with them, live as before ---------- */
  const M = require('./media-fixture.cjs');
  const browser = await M.launch();
  const OTHER = 'scheme-2b5c6c91-201d-4fb1-aba3-e6d562656976';
  const CASES = [
    ['divider', ['live-social-dividers.js']],
    ['image-with-text-benefits', ['media-live-benefits.js']],
    ['comparison-table', ['live-features-b.js']],
    ['testimonials', ['live-testimonials.js']],
    ['testimonial-video', ['live-testimonials.js']],
    ['brand-logo', ['live-logos.js']],
    ['benefits-bar', ['live-features-a.js']],
    ['marquee-bar', ['live-announcements.js']],
    ['banner3', ['live-hero-gaps.js']],
    ['image-with-text-bento', ['media-live-text-grid.js']],
  ];
  try {
    for (const [name, assets] of CASES) {
      const html = async t => t.page.evaluate(id => document.getElementById('shopify-section-' + id).innerHTML, t.section.id);
      const shop = await M.mount(browser, name, {editing: false, assets});
      const before = await html(shop);
      /* a canvas without request.design_mode but with the builder's signal */
      await shop.page.evaluate(() => { window.Shopify = {designMode: true}; });
      await shop.page.evaluate(({id, settings}) => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: id, settings, live: false}})), {id: shop.section.id, settings: {color_scheme: OTHER, padding_top: 77, section_padding_top: 77, padding_top_desktop: 77}});
      await shop.page.waitForTimeout(80);
      assert.equal(await html(shop), before, name + ': drawn without its settings, a live change waits for the builder\'s redraw');
      assert.deepEqual(shop.errors, [], name + ': no error');
      await shop.page.close();
      const live = await M.mount(browser, name, {editing: true, assets});
      const was = await html(live);
      await live.emit({color_scheme: OTHER, padding_top: 77, section_padding_top: 77, padding_top_desktop: 77}, undefined, live.section.id, false);
      await live.page.waitForTimeout(80);
      assert.notEqual(await html(live), was, name + ': in the builder the change is painted live');
      assert.deepEqual(live.errors, [], name + ': no error in the builder');
      await live.page.close();
    }
    checks++;
    /* Announcement bar: closed for the days set, without its settings on the page */
    const bar = await M.mount(browser, 'announcement-bar-basic', {editing: false, assets: ['live-announcements.js'], settings: {show_close_button: true, show_close_button_mobile: true, close_persistence_days: 3}});
    assert.equal(await bar.page.evaluate(() => document.querySelector('[data-an-root]').hasAttribute('data-an-settings')), false);
    assert.equal(await bar.page.evaluate(() => document.querySelector('[data-an-root]').dataset.anCloseDays), '3');
    const t0 = await bar.page.evaluate(() => Date.now());
    await bar.page.evaluate(() => document.querySelector('[data-an-close]').click());
    const until = await bar.page.evaluate(() => +Object.entries(localStorage).find(([k]) => k.startsWith('announcementBarClosedUntil:'))[1]);
    assert(Math.abs(until - t0 - 3 * 864e5) < 60000, 'stays closed for 3 days');
    assert.equal(await bar.page.evaluate(() => document.querySelector('[data-an-root]').hidden), true);
    await bar.page.close();
    checks++;
  } finally { await browser.close(); }
  console.log(checks + ' storefront payload checks passed (' + report.join(', ') + ')');
})().catch(e => { console.error(e); process.exitCode = 1; });
