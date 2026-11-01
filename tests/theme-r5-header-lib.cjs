/* Shared harness for the round 5 header group tests (theme-r5-header-*.cjs).
   Renders the real layout/theme.storelib with the header group (Announcement
   Bar Pro 3 = sections/top-bar, then sections/theme-header) and serves the
   repository's shopify/assets, so Theme settings > Typography "Use in every
   section" (snippets/theme-controls) and every header stylesheet apply as on
   the site. `old: true` renders the files as they are at HEAD (sections,
   snippets and assets), for the saved-look comparison. liquidjs stands in
   for Storelib's renderer (LIQUIDJS=<path>); filters it lacks are stubbed. */
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const headCache = new Map();
const readHead = f => { if (!headCache.has(f)) { let t = null; try { t = execFileSync('git', ['show', 'HEAD:' + f], {cwd: root, encoding: 'utf8', maxBuffer: 64 << 20}); } catch (_) { t = null; } headCache.set(f, t); } return headCache.get(f); };
const body = text => text.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
const schemaOf = (f, old) => { const t = old ? readHead(f) : read(f); return JSON.parse(t.slice(t.indexOf('\n<schema>') + 9, t.lastIndexOf('</schema>'))).shopify; };
const clean = s => s.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');

let Liquid = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) { try { ({Liquid} = require(p)); break; } catch (_) { /* next */ } }

function engine(groups = {}, old = false) {
  const src = f => { const rel = path.relative(root, f); return old ? (readHead(rel) ?? fs.readFileSync(f, 'utf8')) : fs.readFileSync(f, 'utf8'); };
  const e = new Liquid({
    root: [path.join(root, 'snippets')], extname: '.storelib', dynamicPartials: true, strictFilters: false, strictVariables: false, jsTruthy: false, lenientIf: true,
    fs: {
      readFileSync: f => clean(body(src(f))), readFile: async f => clean(body(src(f))),
      existsSync: f => fs.existsSync(f), exists: async f => fs.existsSync(f),
      resolve: (dir, file, ext) => path.join(dir, file + ext), contains: () => true, dirname: path.dirname, sep: '/',
    },
  });
  const block = (name, write) => ({
    parse(tok, remain) { this.tpls = []; const s = this.liquid.parser.parseStream(remain); s.on('tag:end' + name, () => s.stop()).on('template', t => this.tpls.push(t)).on('end', () => { throw new Error('unclosed ' + name); }); s.start(); },
    * render(ctx, em) { if (!write) return; em.write(write[0]); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, em); em.write(write[1]); },
  });
  e.registerTag('style', block('style', ['<style>', '</style>']));
  e.registerTag('stylesheet', block('stylesheet', ['<style>', '</style>']));
  e.registerTag('javascript', block('javascript', null));
  e.registerTag('form', block('form', ['<form>', '</form>']));
  e.registerTag('paginate', block('paginate', ['', '']));
  for (const tag of ['sections', 'section']) e.registerTag(tag, {parse(tok) { this.name = tok.args.replace(/['"]/g, '').trim(); }, * render(ctx, em) { em.write(groups[this.name] || ''); }});
  e.registerFilter('t', k => String(k).split('.').pop().replace(/_/g, ' '));
  e.registerFilter('asset_url', k => '/assets/' + k);
  e.registerFilter('stylesheet_tag', u => `<link rel="stylesheet" href="${u}">`);
  e.registerFilter('image_url', (v, ...a) => { const s = typeof v === 'string' ? v : (v && (v.src || v.url)) || ''; const w = a.find(x => Array.isArray(x) && x[0] === 'width'); return s + (w && w[1] ? '?width=' + w[1] : ''); });
  e.registerFilter('image_tag', (u, ...a) => `<img src="${u}" ${a.filter(Array.isArray).filter(([k]) => k !== 'widths').map(([k, v]) => `${k}="${v ?? ''}"`).join(' ')}>`);
  e.registerFilter('json', v => JSON.stringify(v));
  e.registerFilter('font_face', f => f && f.family ? `@font-face{font-family:"${f.family}";src:local("${f.family}");font-display:swap}` : '');
  for (const f of ['font_url', 'payment_type_svg_tag', 'inline_asset_content']) e.registerFilter(f, () => '');
  for (const f of ['font_modify', 'color_to_rgb', 'color_modify', 'color_mix', 'url', 'within']) e.registerFilter(f, v => v);
  e.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
  e.registerFilter('color_brightness', () => 128);
  e.registerFilter('money', v => '$' + (Number(v || 0) / 100).toFixed(2));
  e.registerFilter('handleize', v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return e;
}
const L = (title, url, links = []) => ({title, url, links, handle: title.toLowerCase().replace(/\W+/g, '-')});
const img = (n, w = 800, h = 1000) => ({src: `/img/${n}.svg`, width: w, height: h, aspect_ratio: w / h, alt: n});
const savedGroup = () => JSON.parse(read('sections/header-group.json'));
const savedMenu = () => ({handle: 'main-menu', title: 'Main menu', links: JSON.parse(read('config/settings.json')).menus['main-menu'].links.map(l => L(l.title, l.url))});
const RICH_MENU = {handle: 'main-menu', title: 'Main menu', links: [
  L('Home', '/'),
  L('Shop', '/collections/all', [L('Shop Layouts', '/collections/all', [L('Grid [new]', '/l/grid'), L('List', '/l/list')]), L('Shop Pages', '/collections/all', [L('Filters', '/l/filters')])]),
  L('Pages', '/pages', [L('About us', '/pages/about'), L('Contact us', '/pages/contact'), L('FAQ', '/pages/faq')]),
  L('Buy Theme!', '/pages/buy'),
]};
const blockList = sec => (sec.block_order || Object.keys(sec.blocks || {})).map(id => ({id, type: sec.blocks[id].type, settings: {...sec.blocks[id].settings}}));
const localization = {country: {iso_code: 'US', name: 'United States', currency: {iso_code: 'USD', symbol: '$'}}, language: {iso_code: 'en', endonym_name: 'English'},
  available_countries: [{iso_code: 'US', name: 'United States', currency: {iso_code: 'USD', symbol: '$'}}, {iso_code: 'FR', name: 'France', currency: {iso_code: 'EUR', symbol: '€'}}],
  available_languages: [{iso_code: 'en', endonym_name: 'English'}, {iso_code: 'fr', endonym_name: 'Français'}]};

/* opts: header / headerBlocks (array, default saved), topbar / topbarBlocks,
   menu, page_type, old, design_mode, ids {header, topbar}, twoBars */
async function renderPage(opts = {}) {
  const old = !!opts.old;
  const all = JSON.parse(read('config/settings.json'));
  const theme = {...all.shopify};
  const schemes = Object.entries(theme.color_schemes).map(([id, v]) => ({id, settings: v.settings}));
  theme.color_schemes = schemes;
  theme.logo = img('logo', 300, 100);
  const group = savedGroup();
  const hsec = group.sections.header, tsec = group.sections.top_bar_KEfgRp;
  const sch = id => ({...(schemes.find(s => s.id === id) || schemes[0])});
  const hDefaults = Object.fromEntries(schemaOf('sections/theme-header.storelib', old).settings.filter(s => s.id && 'default' in s).map(s => [s.id, s.default]));
  const tDefaults = Object.fromEntries(schemaOf('sections/top-bar.storelib', old).settings.filter(s => s.id && 'default' in s).map(s => [s.id, s.default]));
  const hset = {...hDefaults, ...hsec.settings, ...(opts.header || {}), mega_menu: opts.menu || savedMenu()};
  hset.color_scheme = sch(hset.color_scheme);
  if (hset.menu_custom_font && typeof hset.menu_custom_font === 'string') hset.menu_custom_font = {family: hset.menu_custom_font === 'assistant_n4' ? 'Assistant' : hset.menu_custom_font, fallback_families: 'sans-serif'};
  const tset = {...tDefaults, ...tsec.settings, ...(opts.topbar || {})};
  tset.color_scheme = sch(tset.color_scheme);
  if (tset.font && typeof tset.font === 'string') tset.font = {family: tset.font === 'assistant_n4' ? 'Assistant' : tset.font, fallback_families: 'sans-serif'};
  const page_type = opts.page_type || 'index';
  const base = {
    settings: theme, request: {host: 'x.test', locale: {iso_code: 'en'}, page_type, design_mode: !!opts.design_mode},
    routes: {account_url: '/account', account_login_url: '/account/login', account_logout_url: '/account/logout', root_url: '/', cart_url: '/cart', search_url: '/search'},
    shop: {name: 'Materia', domain: 'x.test', url: 'https://x.test'}, template: {name: page_type === 'index' ? 'index' : 'page'}, cart: {item_count: 2, items: []}, customer: null, localization,
  };
  const e = engine({}, old);
  const hid = (opts.ids && opts.ids.header) || 'header', tid = (opts.ids && opts.ids.topbar) || 'top_bar_KEfgRp';
  const withAttrs = list => list.map(b => ({shopify_attributes: '', ...b}));
  const hctx = {...base, section: {id: hid, settings: hset, blocks: withAttrs(opts.headerBlocks || blockList(hsec))}};
  const hsrc = old ? readHead('sections/theme-header.storelib') : read('sections/theme-header.storelib');
  const tsrc = old ? readHead('sections/top-bar.storelib') : read('sections/top-bar.storelib');
  const hdr = await e.parseAndRender(clean(body(hsrc)), hctx, {globals: hctx});
  const bars = [];
  for (const [i, extra] of (opts.twoBars ? [[0, {}], [1, opts.twoBars]] : [[0, {}]])) {
    const id = i ? tid + '_b' : tid;
    const tctx = {...base, section: {id, settings: {...tset, ...extra}, blocks: withAttrs(opts.topbarBlocks || blockList(tsec))}};
    const out = await e.parseAndRender(clean(body(tsrc)), tctx, {globals: tctx});
    bars.push(`<div id="shopify-section-${id}" class="shopify-section shopify-section-group-header-group">${out}</div>`);
  }
  const groupHtml = (opts.noBar ? '' : bars.join('')) + `<div id="shopify-section-${hid}" class="shopify-section section-header shopify-section-group-header-group">${hdr}</div>`;
  const le = engine({'header-group': groupHtml, 'footer-group': ''}, old);
  const layout = old ? readHead('layout/theme.storelib') : read('layout/theme.storelib');
  const html = await le.parseAndRender(clean(body(layout)), {...base, content_for_header: '', content_for_layout: '<main style="min-height:1600px;padding:40px"><h2>Page</h2><button id="after">After</button></main>'}, {globals: base});
  return {html, hctx, render: async (section, settings, blocks) => {
    const ctx = {...base, section: {id: section === 'header' ? hid : tid, settings, blocks: withAttrs(blocks)}};
    return e.parseAndRender(clean(body(section === 'header' ? hsrc : tsrc)), ctx, {globals: ctx});
  }};
}

async function open(browser, opts, width, extra = {}) {
  const {html} = await renderPage(opts);
  const old = !!opts.old;
  const ctx = await browser.newContext({viewport: {width, height: width < 500 ? 812 : 900}, ...(width < 500 ? {isMobile: true, hasTouch: true} : {}), reducedMotion: extra.reduced ? 'reduce' : 'no-preference'});
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.hostname !== 'fixture.test') return r.fulfill({status: 204, body: ''});
    if (u.pathname === '/') return r.fulfill({contentType: 'text/html', body: html});
    if (u.pathname.startsWith('/assets/')) {
      const rel = 'shopify/assets/' + u.pathname.slice(8);
      const type = rel.endsWith('.css') ? 'text/css' : rel.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
      if (old && /\.(css|js)$/.test(rel)) { const t = readHead(rel); if (t != null) return r.fulfill({body: t, contentType: type}); }
      const f = path.join(root, rel);
      return fs.existsSync(f) ? r.fulfill({path: f, contentType: type}) : r.fulfill({status: 404, body: ''});
    }
    if (u.pathname.startsWith('/img/')) return r.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#c9b8a6"/></svg>'});
    return r.fulfill({status: 204, body: ''});
  });
  if (extra.before) await extra.before(p);
  await p.goto('https://fixture.test/');
  await p.waitForTimeout(extra.wait || 700);
  await p.evaluate(() => document.fonts.ready);
  return {p, ctx, errors};
}
/* the builder's live event, then two frames */
async function emit(p, detail) {
  await p.evaluate(d => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: d})), detail);
  await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}
/* the builder's redraw: new markup for one section, then storelib:section-load */
async function redraw(p, sectionId, markup) {
  await p.evaluate(([id, html]) => {
    const sec = document.getElementById('shopify-section-' + id);
    sec.innerHTML = html;
    sec.querySelectorAll('script').forEach(o => { const s = document.createElement('script'); s.textContent = o.textContent; o.replaceWith(s); });
    sec.dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: id}}));
  }, [sectionId, markup]);
  await p.waitForTimeout(150);
}

module.exports = {Liquid, root, read, readHead, body, schemaOf, engine, renderPage, open, emit, redraw, savedGroup, savedMenu, RICH_MENU, L, img, blockList};

/* ---------- measuring ---------- */
/* A signature of every element of one section: box, the computed styles a
   setting can change, own text and (full mode) classes and attributes. */
const VARS = ['--menu-hover-color', '--menu-link-color', '--menu-link-hover-color', '--mega-label-bg', '--mega-label-color', '--dd-shadow', '--hs-logo-width', '--hs-logo-width-mobile', '--hs-hover-fill', '--transparent-color', '--mmb-bg', '--mmb-color', '--mmb-btn-bg', '--mmb-btn-color', '--hot-cl', '--hot-bg-cl', '--new-cl', '--new-bg-cl', '--sale-cl', '--sale-bg-cl', '--popular-cl', '--popular-bg-cl', '--custom_1-cl', '--custom_1-bg-cl', '--custom_2-cl', '--custom_2-bg-cl', '--mega_custom_width', '--menu-font', '--tb-msg-color'];
async function signature(p, sel, full = true) {
  return p.evaluate(([sel, full, VARS]) => {
    const root = document.querySelector(sel);
    if (!root) return ['missing ' + sel];
    const skip = new Set(['SCRIPT', 'STYLE', 'LINK', 'path', 'use', 'symbol', 'TEMPLATE']);
    const props = ['color', 'backgroundColor', 'backgroundImage', 'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'display', 'visibility', 'opacity', 'borderTopWidth', 'borderBottomWidth', 'borderTopColor', 'borderBottomColor', 'borderTopLeftRadius', 'boxShadow', 'justifyContent', 'textAlign', 'position', 'transform', 'marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'paddingLeft', 'columnGap', 'gridTemplateColumns', 'width', 'maxWidth', 'height', 'top', 'zIndex', 'backdropFilter', 'transitionDuration', 'transitionTimingFunction', 'textDecorationLine'];
    const out = [];
    for (const e of [root, ...root.querySelectorAll('*')]) {
      if (skip.has(e.tagName)) continue;
      const c = getComputedStyle(e), r = e.getBoundingClientRect();
      const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
      const row = [e.tagName, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), ...props.map(k => c[k]), ...VARS.map(v => c.getPropertyValue(v).trim()), own];
      if (full) row.push(e.getAttribute('class') || '', ...['href', 'target', 'src', 'alt', 'aria-expanded', 'aria-label', 'data-sticky', 'data-sticky-mobile', 'data-delay', 'data-duration', 'data-menu-hover', 'data-mega-label', 'data-badge-style', 'data-badge-shape', 'data-badge-font', 'data-badge-case', 'data-badge-pos', 'data-action-mobile', 'data-menu-tab', 'data-menu-title', 'data-sticky-announcement', 'sizes', 'loading', 'style'].map(a => e.getAttribute(a) ?? ''));
      out.push(row.join('|'));
    }
    return out;
  }, [sel, full, VARS]);
}
const diff = (a, b) => { const out = []; const n = Math.max(a.length, b.length); for (let i = 0; i < n; i++) if (a[i] !== b[i]) out.push([i, a[i], b[i]]); return out; };
/* a value different from `cur` for a schema setting */
function changed(s, cur, ctx = {}) {
  switch (s.type) {
    case 'checkbox': return !(cur === true || cur === 'true');
    case 'range': { const v = Number(cur ?? s.default ?? s.min); return v === s.max ? s.min : s.max; }
    case 'number': return Number(cur || 0) + 7;
    case 'select': case 'radio': { const o = s.options.find(o => o.value !== cur && o.value !== (cur ?? s.default)); return o && o.value; }
    case 'color': return '#d21f3c';
    case 'text': case 'textarea': case 'inline_richtext': case 'richtext': case 'html': return 'Changed copy';
    case 'url': return '/pages/changed';
    case 'font_picker': return {family: 'Georgia', fallback_families: 'serif'};
    case 'image_picker': return img('Changed', 600, 400);
    case 'color_scheme': return (ctx.schemes || []).find(x => x.id !== (cur && cur.id || cur));
    case 'link_list': return RICH_MENU;
    case 'collection': return ctx.collection;
    case 'collection_list': return ctx.collections;
    case 'product': return ctx.product;
    default: return undefined;
  }
}
/* settings a visible_if names, set so the dependent control shows */
function enabling(s, settingsKey = 'section') {
  const out = {}, vi = s.visible_if || '';
  if (/\{\{\s*false\s*\}\}/.test(vi)) return null;
  const re = new RegExp(settingsKey + '\\.settings\\.([\\w-]+)(?:\\s*(==|!=)\\s*(?:\'([^\']*)\'|(false|true)))?', 'g');
  let m;
  while ((m = re.exec(vi))) {
    const [, id, op, str, lit] = m;
    if (!op) { out[id] = true; continue; }
    const val = str != null ? str : lit === 'true';
    if (op === '==') out[id] = val;
    else out[id] = typeof val === 'boolean' ? !val : '__other__:' + val;
    if (/\bor\b/.test(vi)) break;
  }
  return out;
}
module.exports.signature = signature;
module.exports.diff = diff;
module.exports.changed = changed;
module.exports.enabling = enabling;
