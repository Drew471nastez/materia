/* Every setting, every section: a final sweep across the whole theme.

   For every sections/*.storelib with a "shopify" schema (the retired
   hero-product4, page-sale-banner and promo-banner-1 and the 11 native
   Storelib files are left out), the first preset (or the schema defaults) is
   drawn with tests/media-fixture.cjs render(), with one block of every block
   type the schema has, every picker given sample data (product, collection,
   blog, article, page, menu, image, video) and a page context with a
   product, a collection, a cart, a blog and a customer. Then every visible
   setting (not hidden, visible_if not "{{ false }}") of the section and of
   every block type is changed, its visible_if satisfied first:
   checkbox flipped, every other select option, range min and max, a colour,
   words, a link, another picked item.

   A change passes when the markup changes outside class and style (words,
   attributes, elements, data the scripts read). A change that only touches
   classes, style attributes or <style> is drawn in Chromium (1366 and 375;
   an id with _mobile counts at 375 only, _desktop at 1366 only) and passes
   when a computed style of the section changes, normally or with every
   :hover, :focus and :active rule forced on.

   The settings that change nothing are listed by section. Those in ALLOW
   carry the reason they stay; anything else fails the run.

   Run: LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-every-setting-sweep.cjs [section ...]
   JOBS=<n> splits the sections over n processes (default 4). OUT=<dir> keeps
   the full result as sweep.json there. */
const fs = require('fs'), path = require('path'), os = require('os'), {fork} = require('child_process'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FP = require('./theme-featured-product-round5.cjs');

/* One engine for the whole run, parsing every snippet and section once. */
const baseEngine = FP.engine;
let shared = null;
FP.engine = (...a) => {
  if (a.length) return baseEngine(...a);
  if (shared) return shared;
  const e = baseEngine();
  e.registerFilter('format_address', a => a ? [a.name, a.address1, a.city, a.country].filter(Boolean).join('<br>') : '');
  e.registerFilter('default_errors', () => '');
  e.registerFilter('default_pagination', () => '');
  e.registerFilter('highlight', v => v);
  e.registerFilter('link_to', (v, u) => `<a href="${u}">${v}</a>`);
  e.registerFilter('payment_button', () => '');
  e.registerFilter('time_tag', v => `<time>${v}</time>`);
  const m = new Map();
  e.options.cache = {read: k => m.get(k), write: (k, v) => m.set(k, v), remove: k => m.delete(k), clear: () => m.clear()};
  e.parser.cache = e.options.cache;
  e.parser.parseFile = e.parser._parseFileCached;
  const tpls = new Map(), par = e.parseAndRender.bind(e);
  e.parseAndRender = (src, ctx, opts) => { if (!tpls.has(src)) tpls.set(src, e.parse(src)); return e.render(tpls.get(src), ctx, opts); };
  void par;
  shared = e;
  return e;
};
const {render, schemaOf, THEME_VARS, themeControls, PANTS, OTHER} = require('./media-fixture.cjs');

const RETIRED = ['hero-product4', 'page-sale-banner', 'promo-banner-1'];

/* ------------------------------------------------------------ sample data */
const IMG = {id: 'img1', src: 'https://theme.test/pic-a.png', url: 'https://theme.test/pic-a.png', width: 1600, height: 1000, aspect_ratio: 1.6, alt: 'Sample picture', presentation: {focal_point: '50% 50%'}};
const IMG2 = {id: 'img2', src: 'https://theme.test/pic-b.png', url: 'https://theme.test/pic-b.png', width: 900, height: 1200, aspect_ratio: 0.75, alt: 'Other picture', presentation: {focal_point: '50% 50%'}};
const VIDEO = {id: 'vid1', media_type: 'video', alt: 'Clip', aspect_ratio: 1.78, sources: [{format: 'mp4', url: 'https://theme.test/clip.mp4', mime_type: 'video/mp4', width: 1280, height: 720}], preview_image: IMG};
const VIDEO2 = {...VIDEO, id: 'vid2', sources: [{format: 'mp4', url: 'https://theme.test/clip-b.mp4', mime_type: 'video/mp4', width: 720, height: 1280}], preview_image: IMG2, aspect_ratio: 0.56};
class VideoUrl { constructor(type, id) { this.type = type; this.id = id; } toString() { return this.type === 'youtube' ? 'https://www.youtube.com/watch?v=' + this.id : 'https://vimeo.com/' + this.id; } }
const coll = (handle, title, products) => ({id: 'c-' + handle, handle, title, url: '/collections/' + handle, description: '<p>Cut and sewn in small runs.</p>', image: IMG, featured_image: IMG, products, products_count: products.length, all_products_count: products.length, filters: [], sort_options: [{value: 'manual', name: 'Featured'}, {value: 'price-ascending', name: 'Price, low to high'}], sort_by: 'manual', default_sort_by: 'manual', all_tags: ['Cotton'], tags: [], all_types: ['Bottoms'], all_vendors: ['Materia'], metafields: {}});
const COLL = coll('pants', 'Pants', [PANTS, OTHER]);
const COLL2 = coll('tees', 'Tees', [OTHER]);
const article = (handle, title) => ({id: 'a-' + handle, handle, title, url: '/blogs/news/' + handle, author: 'Ana Lima', published_at: '2026-03-02', created_at: '2026-03-02', excerpt: '<p>How the new fabric is woven.</p>', excerpt_or_content: '<p>How the new fabric is woven.</p>', content: '<p>How the new fabric is woven, and why it lasts.</p>', image: IMG, tags: ['News'], comments_count: 1, comments: [{author: 'Joe', content: 'Nice', created_at: '2026-03-03'}], comments_enabled: true, blog: {title: 'News', handle: 'news', url: '/blogs/news'}, user: {first_name: 'Ana', last_name: 'Lima', bio: 'Editor', image: IMG}, metafields: {}});
const ARTICLE = article('fabric', 'The new fabric'), ARTICLE2 = article('care', 'Care guide');
const BLOG = {id: 'b-news', handle: 'news', title: 'News', url: '/blogs/news', articles: [ARTICLE, ARTICLE2], articles_count: 2, all_tags: ['News', 'Care'], tags: [], comments_enabled: true};
const BLOG2 = {...BLOG, id: 'b-journal', handle: 'journal', title: 'Journal', url: '/blogs/journal', articles: [ARTICLE2]};
const PAGE = {id: 'pg1', handle: 'about', title: 'About us', url: '/pages/about', content: '<p>We make clothes in Porto.</p>'};
const PAGE2 = {...PAGE, id: 'pg2', handle: 'care', title: 'Care', url: '/pages/care', content: '<p>Wash cold.</p>'};
const link = (title, url, links = []) => ({title, url, links, active: false, current: false, child_active: false, levels: links.length ? 1 : 0, type: 'http_link', handle: title.toLowerCase()});
const MENU = {handle: 'main-menu', title: 'Main menu', links: [link('Home', '/'), link('Shop', '/collections/all', [link('Pants', '/collections/pants'), link('Tees', '/collections/tees')]), link('About', '/pages/about')]};
const MENU2 = {handle: 'footer', title: 'Footer', links: [link('Contact', '/pages/contact'), link('Shipping', '/pages/shipping')]};
const LINE = {id: 1, key: 'k1', quantity: 1, title: 'Pants Down - S / Black', product: PANTS, variant: PANTS.variants[0], variant_id: PANTS.variants[0].id, price: 13777, final_price: 13777, original_price: 13777, line_price: 13777, final_line_price: 13777, original_line_price: 13777, url: PANTS.variants[0].url, image: IMG, options_with_values: [{name: 'Size', value: 'S'}], properties: {}, discounts: [], line_level_discount_allocations: [], selling_plan_allocation: null, unit_price_measurement: null};
const CART = {item_count: 1, items: [LINE], total_price: 13777, original_total_price: 13777, items_subtotal_price: 13777, total_discount: 0, cart_level_discount_applications: [], note: '', currency: {iso_code: 'USD'}, requires_shipping: true, attributes: {}};
const CUSTOMER = {id: 7, first_name: 'Ana', last_name: 'Lima', name: 'Ana Lima', email: 'ana@example.com', orders: [], orders_count: 0, addresses: [], addresses_count: 0, default_address: null, tags: []};
const GLOBALS = {
  product: PANTS, collection: COLL, collections: {all: COLL, pants: COLL, tees: COLL2}, all_products: {'pants-down': PANTS, 'other-tee': OTHER},
  cart: CART, blog: BLOG, blogs: {news: BLOG, journal: BLOG2}, article: ARTICLE, page: PAGE, pages: {about: PAGE, care: PAGE2}, customer: CUSTOMER,
  linklists: {'main-menu': MENU, footer: MENU2}, template: {name: 'index', suffix: null}, page_title: 'Materia', content_for_header: '',
  localization: {available_countries: [], available_languages: [], country: {iso_code: 'US', name: 'United States', currency: {iso_code: 'USD', symbol: '$'}}, language: {iso_code: 'en', endonym_name: 'English'}},
  recommendations: {performed: true, products: [OTHER], products_count: 1}, search: {performed: false, results: [], results_count: 0, terms: ''},
  routes: {all_products_collection_url: '/collections/all', cart_add_url: '/cart/add', cart_url: '/cart', cart_change_url: '/cart/change', root_url: '/', account_url: '/account', account_login_url: '/account/login', account_logout_url: '/account/logout', account_register_url: '/account/register', account_addresses_url: '/account/addresses', search_url: '/search', predictive_search_url: '/search/suggest', product_recommendations_url: '/recommendations/products', collections_url: '/collections'},
};

/* A value to change a setting to, given what it holds now. */
function values(x, cur) {
  const other = (a, b) => cur && (cur === a || cur.id === a.id) ? b : a;
  switch (x.type) {
    case 'range': case 'number': { const out = []; if (x.type === 'number') return [cur === 7 ? 3 : 7]; if (cur !== x.min) out.push(x.min); if (cur !== x.max) out.push(x.max); return out; }
    case 'select': case 'radio': case 'text_alignment': return (x.options || [{value: 'left'}, {value: 'center'}, {value: 'right'}]).map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': case 'color_background': return [cur === '#ab12cd' ? '#12cdab' : '#ab12cd'];
    case 'color_scheme': { const ids = Object.keys((JSON.parse(read('config/settings.json')).shopify || {}).color_schemes || {}); return [ids.find(i => i !== cur && i !== 'default') || ids[0]]; }
    case 'text': case 'textarea': return [cur === 'Edited words' ? 'Other words' : 'Edited words'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <em>text</em></p>'];
    case 'html': case 'liquid': return ['<p class="sweep-edited">Edited</p>'];
    case 'font_picker': return [{family: 'Verdana', fallback_families: 'sans-serif', style: 'normal', weight: 400}];
    case 'url': return ['/pages/edited'];
    case 'image_picker': return [other(IMG2, IMG)];
    case 'video': return [other(VIDEO2, VIDEO)];
    case 'video_url': return [new VideoUrl('vimeo', '76979871')];
    case 'product': return [other(OTHER, PANTS)];
    case 'collection': return [other(COLL2, COLL)];
    case 'blog': return [other(BLOG2, BLOG)];
    case 'article': return [other(ARTICLE2, ARTICLE)];
    case 'page': return [other(PAGE2, PAGE)];
    case 'link_list': return [other(MENU2, MENU)];
    case 'product_list': return [[OTHER]];
    case 'collection_list': return [[COLL2]];
    default: return [];
  }
}
/* What an empty picker or text holds in the base drawing, so what depends on it is drawn. */
function fill(x, cur) {
  const empty = cur === undefined || cur === null || cur === '';
  if (typeof cur === 'string' && cur && /^(product|collection|blog|article|page|link_list)$/.test(x.type)) return {product: PANTS, collection: COLL, blog: BLOG, article: ARTICLE, page: PAGE, link_list: MENU}[x.type];
  if (!empty && !(Array.isArray(cur) && !cur.length)) return cur;
  switch (x.type) {
    case 'image_picker': return IMG;
    case 'video': return VIDEO;
    case 'video_url': return new VideoUrl('youtube', 'dQw4w9WgXcQ');
    case 'product': return PANTS;
    case 'collection': return COLL;
    case 'blog': return BLOG;
    case 'article': return ARTICLE;
    case 'page': return PAGE;
    case 'link_list': return MENU;
    case 'product_list': return [PANTS, OTHER];
    case 'collection_list': return [COLL, COLL2];
    case 'text': case 'textarea': case 'inline_richtext': return 'Sample words';
    case 'richtext': return '<p>Sample text</p>';
    case 'url': return '/collections/all';
    default: return cur;
  }
}

/* ------------------------------------------------------------ the sweep */
const THEME = (() => { const t = {...(JSON.parse(read('config/settings.json')).shopify || {})}; return t; })();
const SCHEME_IDS = Object.keys(THEME.color_schemes || {});
const def = a => Object.fromEntries((a || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
const visible = x => x.id && !x.hidden && !/\{\{\s*false\s*\}\}/.test(x.visible_if || '');
const clone = o => o === undefined ? o : JSON.parse(JSON.stringify(o, (k, v) => v instanceof VideoUrl ? {__video_url: [v.type, v.id]} : v), (k, v) => v && v.__video_url ? new VideoUrl(...v.__video_url) : v);
const widthsOf = id => /(^|_)mobile($|_)/.test(id) ? [375] : /(^|_)desktop($|_)/.test(id) ? [1366] : [1366, 375];

function sectionList() {
  return fs.readdirSync(path.join(ROOT, 'sections')).filter(f => f.endsWith('.storelib')).map(f => f.slice(0, -9)).filter(n => {
    if (RETIRED.includes(n)) return false;
    const raw = read('sections/' + n + '.storelib');
    if (!raw.startsWith('<template compat="shopify">')) return false;
    try { return !!JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify; } catch (_) { return false; }
  });
}

function presetBlocks(preset) {
  let bl = preset.blocks || [];
  if (!Array.isArray(bl)) bl = (preset.block_order || Object.keys(bl)).map(k => bl[k]);
  return bl.filter(b => b && b.type);
}

/* The base drawing: the first preset over the defaults, one block of every type, pickers and empty words filled. */
function baseState(schema) {
  const preset = (schema.presets || [])[0] || {};
  const types = (schema.blocks || []).filter(b => b.type && !b.type.startsWith('@'));
  const blocks = presetBlocks(preset).filter(b => types.some(t => t.type === b.type)).map(b => ({type: b.type, settings: {...def(types.find(t => t.type === b.type).settings), ...(b.settings || {})}}));
  for (const t of types) if (!blocks.some(b => b.type === t.type)) blocks.push({type: t.type, settings: def(t.settings)});
  const settings = {...def(schema.settings), ...(preset.settings || {})};
  const fillAll = (list, s) => { for (const x of list || []) if (x.id) { const v = x.type === 'link_list' && typeof s[x.id] === 'string' ? (GLOBALS.linklists[s[x.id]] || MENU) : fill(x, s[x.id]); if (v !== undefined) s[x.id] = v; } };
  fillAll(schema.settings, settings);
  for (const b of blocks) fillAll(types.find(t => t.type === b.type).settings, b.settings);
  return {settings, blocks};
}

/* visible_if, read the way the builder reads it. */
async function shows(x, settings, blockSettings) {
  if (!x.visible_if) return true;
  const expr = x.visible_if.replace(/^\{\{\s*|\s*\}\}$/g, '');
  const e = FP.engine();
  const ctx = {section: {settings}, block: {settings: blockSettings || {}}, settings: THEME};
  try { return (await e.parseAndRender(`{%- if ${expr} -%}1{%- endif -%}`, ctx, {globals: ctx})) === '1'; } catch (_) { return true; }
}
function candidates(x) {
  if (!x) return [];
  switch (x.type) {
    case 'checkbox': return [true, false];
    case 'select': case 'radio': return (x.options || []).map(o => o.value);
    case 'range': return [x.default, x.min, x.max].filter(v => v !== undefined);
    case 'color_scheme': return SCHEME_IDS;
    case 'text': case 'url': case 'textarea': return ['Sample words', ''];
    case 'color': return ['#ab12cd', ''];
    case 'image_picker': return [IMG, ''];
    case 'product': return [PANTS, ''];
    case 'collection': return [COLL, ''];
    default: return [x.default];
  }
}
/* Settings that make x shown, changing as few others as it can. null when nothing does. */
async function satisfy(x, scope, state, list, blockList) {
  const cur = scope === 'section' ? state.settings : state.block;
  if (await shows(x, state.settings, state.block)) return {};
  const refs = [...new Set([...x.visible_if.matchAll(/\b(section|block)\.settings\.(\w+)/g)].map(m => m[1] + '.' + m[2]))];
  const opts = refs.map(r => { const [sc, id] = r.split('.'); return [r, candidates((sc === 'section' ? list : blockList || []).find(y => y.id === id))]; }).filter(([, c]) => c.length);
  const combos = [];
  const walk = (i, acc) => { if (combos.length > 400) return; if (i === opts.length) { combos.push(acc); return; } walk(i + 1, acc); for (const v of opts[i][1]) walk(i + 1, {...acc, [opts[i][0]]: v}); };
  walk(0, {});
  combos.sort((a, b) => Object.keys(a).length - Object.keys(b).length);
  for (const c of combos) {
    const s = {...state.settings}, b = {...(state.block || {})};
    for (const [k, v] of Object.entries(c)) { const [sc, id] = k.split('.'); (sc === 'section' ? s : b)[id] = v; }
    if (await shows(x, s, b)) return c;
  }
  void cur;
  return null;
}

/* Which css files a drawing asks for (render() takes the link tags out). */
const cssSeen = new Set();
{
  const e = FP.engine();
  e.registerFilter('asset_url', k => { if (/\.css$/.test(k)) cssSeen.add(k); return '/assets/' + k; });
}
async function draw(name, state) {
  const r = await render(name, {uid: 'test', settings: state.settings, blocks: state.blocks, theme: THEME, globals: GLOBALS, editing: true});
  return r.html + '\n<!--scripts-->\n' + r.scripts.join('\n<!--script-->\n');
}
/* A data attribute holding the section's or a block's settings as JSON (the live preview controllers read it) is not a change a visitor sees: it is taken out before the markup is compared. */
const decode = v => v.replace(/&quot;/g, '"').replace(/&#34;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
let IDS = new Set();
const isDump = v => { if (!/^\s*\{/.test(v)) return false; try { const o = JSON.parse(decode(v)); const k = Object.keys(o); return k.length >= 5 && k.filter(x => IDS.has(x)).length >= k.length * 0.6; } catch (_) { return false; } };
const undump = h => h.replace(/\s(data-[\w-]+)=("([^"]*)"|'([^']*)')/g, (m, n, q, a, b) => isDump(a !== undefined ? a : b) ? ' ' + n + '=""' : m).replace(/(<script type="application\/json"[^>]*>)([\s\S]*?)(<\/script>)/g, (m, o, body, c) => isDump(body) ? o + c : m);
const strip = h => h.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '<style></style>').replace(/\s(style|class)="[^"]*"/g, '').replace(/\s(style|class)='[^']*'/g, '');
const hash = s => crypto.createHash('sha1').update(s).digest('hex');

/* ------------------------------------------------------------ the browser */
const PROPS = ['color', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopStyle', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius', 'outlineColor', 'outlineWidth', 'outlineStyle', 'outlineOffset', 'boxShadow', 'textShadow', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'textDecorationLine', 'textDecorationColor', 'whiteSpace', 'webkitLineClamp', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'rowGap', 'columnGap', 'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow', 'display', 'flexDirection', 'flexWrap', 'flexBasis', 'flexGrow', 'justifyContent', 'alignItems', 'alignSelf', 'justifySelf', 'order', 'position', 'top', 'right', 'bottom', 'left', 'zIndex', 'transform', 'opacity', 'visibility', 'filter', 'backdropFilter', 'mixBlendMode', 'objectFit', 'objectPosition', 'aspectRatio', 'overflow', 'transitionDuration', 'transitionTimingFunction', 'animationName', 'animationDuration', 'animationDelay', 'animationTimingFunction', 'animationIterationCount', 'fill', 'stroke', 'strokeWidth', 'cursor', 'content', 'clipPath', 'scrollSnapType', 'webkitTextStrokeWidth', 'webkitTextStrokeColor', 'accentColor', 'caretColor', 'columnCount', 'textUnderlineOffset', 'verticalAlign', 'boxSizing', 'pointerEvents', 'wordBreak', 'fontVariantCaps', 'textIndent'];
const PSEUDO = ['content', 'color', 'backgroundColor', 'backgroundImage', 'width', 'height', 'opacity', 'borderTopColor', 'borderTopWidth', 'transform', 'display', 'boxShadow', 'top', 'left', 'borderTopLeftRadius'];
let layoutHtml = null;
async function pageShell() {
  if (layoutHtml) return layoutHtml;
  const e = FP.engine({'header-group': '', 'footer-group': '', 'overlay-group': ''});
  const theme = {...THEME, color_schemes: Object.entries(THEME.color_schemes || {}).map(([id, v]) => ({id, settings: v.settings}))};
  const base = {...GLOBALS, settings: theme, request: {host: 'theme.test', locale: {iso_code: 'en'}, page_type: 'index', design_mode: true, path: '/'}, shop: {name: 'Materia Themes', domain: 'theme.test', url: 'https://theme.test', currency: 'USD', money_format: '${{amount}}'}, content_for_header: '', content_for_layout: '<div id="shopify-section-test" class="shopify-section"></div>'};
  const clean = s => s.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');
  const src = clean(read('layout/theme.storelib').replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, ''));
  let html;
  try { html = await e.parseAndRender(src, base, {globals: base}); } catch (err) { html = `<!doctype html><html><head><style>${THEME_VARS}</style><style>${await themeControls()}</style>${['critical.css', 'theme.css', 'theme-button-contract.css', 'animation.css'].map(f => `<link rel="stylesheet" href="/assets/${f}">`).join('')}</head><body><div id="shopify-section-test" class="shopify-section"></div></body></html>`; }
  html = html.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/media="print"\s*onload="[^"]*"/g, '');
  html = html.replace('</head>', '<style>*,*::before,*::after{animation-play-state:paused!important;transition-property:none!important}</style><style id="sw-force"></style></head>');
  html = html.replace('<html', '<html class="shopify-design-mode"');
  layoutHtml = html;
  return html;
}
async function openPage(browser, width) {
  const ctx = await browser.newContext({viewport: {width, height: 900}, javaScriptEnabled: true});
  const page = await ctx.newPage();
  const shell = await pageShell();
  await page.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.hostname !== 'theme.test') return r.fulfill({status: 204, body: ''});
    if (u.pathname === '/') return r.fulfill({contentType: 'text/html', body: shell});
    if (u.pathname.startsWith('/assets/')) { const f = path.join(ROOT, 'shopify/assets', path.basename(u.pathname)); if (f.endsWith('.css') && fs.existsSync(f)) return r.fulfill({path: f, contentType: 'text/css'}); return r.fulfill({status: 204, body: ''}); }
    if (/\.(png|jpe?g|webp|gif|svg)/.test(u.pathname)) return r.fulfill({contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')});
    return r.fulfill({status: 204, body: ''});
  });
  await page.goto('http://theme.test/');
  await page.evaluate(({PROPS, PSEUDO}) => {
    const W = () => document.getElementById('shopify-section-test');
    const loaded = new Set([...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.getAttribute('href')));
    window.__css = async list => { const add = list.filter(h => !loaded.has(h)); await Promise.all(add.map(h => new Promise(res => { loaded.add(h); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; l.onload = l.onerror = res; document.head.append(l); }))); if (add.length) themeForced = null; };
    let themeForced = null;
    const STATE = /:(hover|focus-visible|focus-within|focus|active)\b/g;
    const forcedOf = sheets => {
      const out = [];
      const walk = (rules, wrap) => { for (const r of rules) {
        if (r instanceof CSSStyleRule) { if (STATE.test(r.selectorText)) { STATE.lastIndex = 0; out.push(wrap(r.selectorText.replace(STATE, '[data-sw-force]') + '{' + r.style.cssText + '}')); } STATE.lastIndex = 0; }
        else if (r instanceof CSSMediaRule) walk(r.cssRules, t => wrap('@media ' + r.conditionText + '{' + t + '}'));
        else if (r.cssRules && (r instanceof CSSSupportsRule || (window.CSSContainerRule && r instanceof CSSContainerRule) || (window.CSSLayerBlockRule && r instanceof CSSLayerBlockRule))) walk(r.cssRules, t => wrap(t));
      } };
      for (const s of sheets) { try { walk(s.cssRules, t => t); } catch (_) {} }
      return out.join('\n');
    };
    const snap = () => {
      const w = W(), out = [];
      const els = [...w.querySelectorAll('*')].filter(e => !/^(STYLE|SCRIPT|TEMPLATE|LINK|META)$/.test(e.tagName)).slice(0, 4000);
      for (const el of els) {
        const cs = getComputedStyle(el), row = [el.tagName];
        for (const p of PROPS) row.push(cs[p]);
        for (const ps of ['::before', '::after']) { const b = getComputedStyle(el, ps); if (b.content && b.content !== 'none' && b.content !== 'normal') { row.push(ps); for (const p of PSEUDO) row.push(b[p]); } }
        if (el.matches('input,textarea')) row.push(getComputedStyle(el, '::placeholder').color);
        out.push(row.join('|'));
      }
      return out;
    };
    window.__snap = (html, forced) => {
      const w = W();
      w.innerHTML = html;
      const f = document.getElementById('sw-force');
      if (forced) {
        if (themeForced === null) themeForced = forcedOf([...document.styleSheets].filter(s => !(s.ownerNode && w.contains(s.ownerNode)) && s.ownerNode !== f));
        f.textContent = themeForced + '\n' + forcedOf([...document.styleSheets].filter(s => s.ownerNode && w.contains(s.ownerNode)));
        for (const el of w.querySelectorAll('*')) el.setAttribute('data-sw-force', '');
      } else f.textContent = '';
      return snap();
    };
  }, {PROPS, PSEUDO});
  return page;
}
const snapCache = new Map();
async function snapshot(page, width, html, forced, css) {
  const key = width + (forced ? 'f' : 'n') + hash(html);
  if (snapCache.has(key)) return snapCache.get(key);
  await page.evaluate(list => window.__css(list), css.map(c => '/assets/' + c));
  const s = await page.evaluate(({html, forced}) => window.__snap(html, forced), {html: html.split('\n<!--scripts-->\n')[0], forced});
  if (snapCache.size > 400) snapCache.clear();
  snapCache.set(key, s);
  return s;
}
const firstDiff = (a, b) => { if (a.length !== b.length) return 'elements ' + a.length + ' / ' + b.length; const i = a.findIndex((x, k) => x !== b[k]); if (i < 0) return ''; const x = a[i].split('|'), y = b[i].split('|'); const j = x.findIndex((v, k) => v !== y[k]); return x[0] + ' ' + (PROPS[j - 1] || 'pseudo') + ': ' + x[j] + ' / ' + y[j]; };

/* ------------------------------------------------------------ one section */
async function sweepSection(name, pages) {
  const {schema} = schemaOf(name);
  const out = [];
  IDS = new Set([...(schema.settings || []), ...(schema.blocks || []).flatMap(b => b.settings || [])].filter(x => x.id).map(x => x.id));
  const base = baseState(schema);
  const types = (schema.blocks || []).filter(b => b.type && !b.type.startsWith('@'));
  const items = [];
  for (const x of schema.settings || []) if (visible(x)) items.push({scope: 'section', x});
  for (const t of types) { const n = base.blocks.findIndex(b => b.type === t.type); for (const x of t.settings || []) if (visible(x)) items.push({scope: t.type, n, x, list: t.settings}); }
  const drawn = new Map();
  const drawState = async st => { const k = hash(JSON.stringify(st)); if (!drawn.has(k)) { cssSeen.clear(); let h; try { h = await draw(name, st); } catch (err) { h = {error: String(err.message || err).split('\n')[0].slice(0, 200)}; } drawn.set(k, {html: h, css: [...cssSeen]}); if (drawn.size > 60) drawn.delete(drawn.keys().next().value); } return drawn.get(k); };
  for (const it of items) {
    const {x} = it, key = (it.scope === 'section' ? '' : it.scope + '.') + x.id;
    const st0 = clone(base);
    const blockS = it.scope === 'section' ? null : st0.blocks[it.n].settings;
    const pre = await satisfy(x, it.scope, {settings: st0.settings, block: blockS}, schema.settings, it.list);
    if (pre === null) { out.push({key, type: x.type, status: 'hidden', detail: 'its visible_if is never true: ' + x.visible_if}); continue; }
    for (const [k, v] of Object.entries(pre)) { const [sc, id] = k.split('.'); (sc === 'section' ? st0.settings : blockS)[id] = v; }
    const target = it.scope === 'section' ? st0.settings : blockS;
    const vals = values(x, target[x.id]);
    if (!vals.length) { out.push({key, type: x.type, status: 'skip', detail: 'no value to try for type ' + x.type}); continue; }
    const A = await drawState(st0);
    if (A.html.error) { out.push({key, type: x.type, status: 'error', detail: 'base: ' + A.html.error, pre}); continue; }
    const res = [];
    for (const v of vals) {
      const st = clone(st0); (it.scope === 'section' ? st.settings : st.blocks[it.n].settings)[x.id] = v;
      const B = await drawState(st);
      const label = typeof v === 'object' && v ? (v.handle || v.id || v.family || (Array.isArray(v) ? 'list' : 'object')) : JSON.stringify(v);
      if (B.html.error) { res.push({v: label, r: 'error', d: B.html.error}); continue; }
      if (A.html === B.html) { res.push({v: label, r: 'same'}); continue; }
      const ua = undump(A.html), ub = undump(B.html);
      if (ua === ub) { res.push({v: label, r: 'dump'}); continue; }
      if (strip(ua) !== strip(ub)) { res.push({v: label, r: 'markup'}); continue; }
      if (A.html.split('\n<!--scripts-->\n')[1] !== B.html.split('\n<!--scripts-->\n')[1]) { res.push({v: label, r: 'markup'}); continue; }
      let r = 'nostyle', d = '';
      const css = [...new Set([...A.css, ...B.css])];
      for (const w of widthsOf(x.id)) {
        const p = pages[w];
        d = firstDiff(await snapshot(p, w, A.html, false, css), await snapshot(p, w, B.html, false, css));
        if (d) { r = 'style'; break; }
        d = firstDiff(await snapshot(p, w, A.html, true, css), await snapshot(p, w, B.html, true, css));
        if (d) { r = 'state'; break; }
      }
      res.push({v: label, r, d});
      if (r !== 'nostyle') continue;
    }
    const GOOD = /^(markup|style|state|gate)$/;
    if (!res.some(r => GOOD.test(r.r) || r.r === 'error')) {
      /* A switch other settings hang on (their visible_if reads it): flipped with those settings changed too. */
      const list = it.scope === 'section' ? schema.settings : it.list;
      const ref = new RegExp('\\b' + (it.scope === 'section' ? 'section' : 'block') + '\\.settings\\.' + x.id + '\\b');
      const deps = (list || []).filter(y => visible(y) && y !== x && ref.test(y.visible_if || ''));
      if (deps.length) {
        for (const v of vals) {
          const on = clone(st0), off = clone(st0);
          const T = st => it.scope === 'section' ? st.settings : st.blocks[it.n].settings;
          off && (T(off)[x.id] = v);
          const g = (await shows(deps[0], T(on), T(on))) ? on : off;
          for (const y of deps) { const yv = values(y, T(g)[y.id])[0]; if (yv !== undefined) { T(on)[y.id] = yv; T(off)[y.id] = yv; } }
          const P = await drawState(on), Q = await drawState(off);
          if (P.html.error || Q.html.error) continue;
          const up = undump(P.html), uq = undump(Q.html);
          let r = up === uq ? 'same' : strip(up) !== strip(uq) ? 'gate' : '';
          if (!r) { const css = [...new Set([...P.css, ...Q.css])]; r = 'same'; for (const w of widthsOf(x.id)) { if (firstDiff(await snapshot(pages[w], w, P.html, false, css), await snapshot(pages[w], w, Q.html, false, css)) || firstDiff(await snapshot(pages[w], w, P.html, true, css), await snapshot(pages[w], w, Q.html, true, css))) { r = 'gate'; break; } } }
          if (r === 'gate') { res.push({v: 'with ' + deps.length + ' dependent settings changed', r}); break; }
        }
      }
    }
    const good = res.filter(r => GOOD.test(r.r));
    const status = res.some(r => r.r === 'error') ? 'error' : good.length ? 'pass' : 'dead';
    const deadOptions = (x.type === 'select' || x.type === 'radio') && good.length ? res.filter(r => !GOOD.test(r.r)).map(r => r.v) : [];
    out.push({key, type: x.type, status, pre: Object.keys(pre).length ? pre : undefined, how: [...new Set(good.map(r => r.r))].join(','), deadOptions: deadOptions.length ? deadOptions : undefined, detail: res.filter(r => r.r === 'error').map(r => r.v + ': ' + r.d).join('; ') || undefined, tried: res.map(r => r.v + '=' + r.r).join(' ')});
  }
  return out;
}

/* ------------------------------------------------------------ workers */
async function worker(names) {
  const {launch} = require('./media-fixture.cjs');
  const browser = await launch();
  const pages = {1366: await openPage(browser, 1366), 375: await openPage(browser, 375)};
  for (const n of names) {
    const t = Date.now();
    let res;
    try { res = await sweepSection(n, pages); } catch (err) { res = [{key: '(section)', status: 'error', detail: String(err.stack || err).slice(0, 300)}]; }
    process.send({name: n, res, ms: Date.now() - t});
  }
  await browser.close();
}

if (process.env.SWEEP_WORKER) {
  worker(JSON.parse(process.env.SWEEP_WORKER)).then(() => process.exit(0), err => { console.error(err); process.exit(1); });
  return;
}
module.exports = {values, fill, GLOBALS, sweepSection, sectionList};
if (require.main !== module) return;

(async () => {
  const only = process.argv.slice(2);
  const names = sectionList().filter(n => !only.length || only.includes(n));
  const size = n => fs.statSync(path.join(ROOT, 'sections', n + '.storelib')).size;
  const jobs = Math.max(1, Math.min(+(process.env.JOBS || 4), names.length));
  const buckets = Array.from({length: jobs}, () => ({list: [], w: 0}));
  for (const n of names.sort((a, b) => size(b) - size(a))) { const b = buckets.reduce((m, x) => x.w < m.w ? x : m); b.list.push(n); b.w += size(n); }
  const results = {};
  const t0 = Date.now();
  await Promise.all(buckets.map(b => new Promise((res, rej) => {
    const c = fork(__filename, [], {env: {...process.env, SWEEP_WORKER: JSON.stringify(b.list)}});
    c.on('message', m => { results[m.name] = m.res; if (process.env.VERBOSE) console.error(m.name, m.res.length, m.ms + 'ms'); });
    c.on('exit', code => code ? rej(new Error('worker exited ' + code)) : res());
  })));
  const all = Object.entries(results).sort(([a], [b]) => a.localeCompare(b));
  if (process.env.OUT) fs.writeFileSync(path.join(process.env.OUT, 'sweep.json'), JSON.stringify(Object.fromEntries(all), null, 1));
  let checked = 0, passing = 0, allowed = 0;
  const bad = [];
  for (const [n, res] of all) {
    const rows = [];
    for (const r of res) {
      if (r.key === '(section)') { bad.push(n + ': ' + r.detail); continue; }
      checked++;
      if (r.status === 'pass') { passing++; continue; }
      const why = ALLOW[n + ':' + r.key] || ALLOW[n + ':*'];
      if (why) { allowed++; continue; }
      rows.push('  ' + r.key + ' (' + r.type + '): ' + r.status + (r.detail ? ' - ' + r.detail : '') + (r.pre ? ' with ' + JSON.stringify(r.pre).slice(0, 120) : ''));
    }
    if (rows.length) bad.push(n + '\n' + rows.join('\n'));
  }
  console.log(`${names.length} sections, ${checked} settings checked, ${passing} change the section, ${allowed} allowed with a reason, ${checked - passing - allowed} change nothing (${Math.round((Date.now() - t0) / 1000)}s)`);
  if (bad.length) { console.log('Settings that change nothing, by section:\n' + bad.join('\n')); process.exitCode = 1; }
})().catch(err => { console.error(err); process.exitCode = 1; });

/* Settings that stay although the sweep sees no change, each with why. "section:key" or "section:*". */
var ALLOW = {};
