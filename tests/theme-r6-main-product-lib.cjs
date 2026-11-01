/* Shared helpers for the round 6 Main product tests (not a test itself).

   renderMain({...}) draws sections/main-product.storelib with liquidjs inside
   the real layout (header, every theme asset), from the working tree or from
   an older tree (`tree`: a folder holding sections/, snippets/, layout/,
   config/ and shopify/assets/, for example `git archive c098384`).
   open(browser, width, html, {tree}) serves that page and the tree's assets
   in Chromium. Products come from tests/theme-featured-product-round5.cjs. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const repo = path.resolve(__dirname, '..');
const R5 = require('./theme-featured-product-round5.cjs');
const {Liquid} = R5;

const body = text => text.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
const clean = s => s.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');
const schemaText = t => JSON.parse(t.slice(t.indexOf('\n<schema>') + 9, t.lastIndexOf('</schema>')));

function engine(tree, groups = {}) {
  const e = new Liquid({
    root: [path.join(tree, 'snippets')], extname: '.storelib', dynamicPartials: true, strictFilters: false, strictVariables: false, jsTruthy: false, lenientIf: true,
    fs: {
      readFileSync: f => clean(body(fs.readFileSync(f, 'utf8'))), readFile: async f => clean(body(fs.readFileSync(f, 'utf8'))),
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
  e.registerFilter('image_url', (v, ...a) => {
    const src = typeof v === 'string' ? v : (v && (v.src || v.url)) || '';
    const w = a.find(x => Array.isArray(x) && x[0] === 'width');
    return src + (w && w[1] ? (src.includes('?') ? '&' : '?') + 'width=' + w[1] : '');
  });
  e.registerFilter('image_tag', (u, ...a) => `<img src="${u}" ${a.filter(Array.isArray).filter(([k]) => k !== 'widths').map(([k, v]) => `${k}="${v ?? ''}"`).join(' ')}>`);
  e.registerFilter('json', v => v === undefined ? 'null' : JSON.stringify(v));
  e.registerFilter('video_tag', () => '<video></video>');
  e.registerFilter('media_tag', () => '');
  /* font_face prints a marker so a test can see which family was asked for */
  e.registerFilter('font_face', v => v && v.family ? `/* font_face ${v.family} */` : '');
  for (const f of ['font_url', 'payment_type_svg_tag', 'inline_asset_content', 'metafield_tag']) e.registerFilter(f, () => '');
  for (const f of ['font_modify', 'color_to_rgb', 'color_modify', 'color_mix', 'url', 'within']) e.registerFilter(f, v => v);
  e.registerFilter('placeholder_svg_tag', (name, cls) => `<svg class="${cls || ''}" viewBox="0 0 525 525" data-placeholder="${name}"><rect width="525" height="525"/></svg>`);
  e.registerFilter('color_brightness', () => 128);
  e.registerFilter('money', v => 'R$' + (Number(v || 0) / 100).toFixed(2));
  e.registerFilter('money_with_currency', v => 'R$' + (Number(v || 0) / 100).toFixed(2));
  e.registerFilter('money_without_currency', v => (Number(v || 0) / 100).toFixed(2));
  e.registerFilter('handleize', v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  e.registerFilter('date', v => String(v || ''));
  return e;
}

/* An older tree, extracted once per process. */
const trees = new Map();
function treeAt(rev) {
  if (!rev) return repo;
  if (trees.has(rev)) return trees.get(rev);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-' + rev + '-'));
  const tar = execFileSync('git', ['-C', repo, 'archive', rev, 'sections', 'snippets', 'layout', 'config', 'shopify/assets', 'templates'], {maxBuffer: 1 << 30});
  execFileSync('tar', ['-x', '-C', dir], {input: tar, maxBuffer: 1 << 30});
  trees.set(rev, dir);
  return dir;
}

const readIn = (tree, f) => fs.readFileSync(path.join(tree, f), 'utf8');
const mainSchema = (tree = repo) => schemaText(readIn(tree, 'sections/main-product.storelib')).shopify;
const defaultsOf = list => Object.fromEntries((list || []).filter(s => s.id && 'default' in s).map(s => [s.id, s.default]));

/* The product page's saved Main product (templates/product.json "main"). */
function savedMain(tree = repo) {
  const t = JSON.parse(readIn(tree, 'templates/product.json'));
  const [id, sec] = Object.entries(t.sections).find(([, s]) => s.type === 'main-product');
  return {id, sec};
}

/* blocks: [{id, type, settings}] or omitted for the saved ones. Settings get the schema defaults first.
   more: further Main product instances on the same page, [{id, settings, blocks}]. */
async function renderMain({tree = repo, settings = {}, blocks, product = R5.PANTS, design = false, id, extraHead = '', script = true, more = [], sectionOnly = false} = {}) {
  const sch = mainSchema(tree);
  const saved = savedMain(tree);
  const all = JSON.parse(readIn(tree, 'config/settings.json'));
  const theme = {...all.shopify};
  const schemes = Object.entries(theme.color_schemes).map(([sid, v]) => ({id: sid, settings: v.settings}));
  theme.color_schemes = schemes;
  const base = {
    settings: theme, request: {host: 'x.test', locale: {iso_code: 'en'}, page_type: 'product', design_mode: design},
    routes: {account_url: '/account', account_login_url: '/account/login', root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', search_url: '/search'},
    shop: {name: 'Materia', domain: 'x.test', url: 'https://x.test', currency: 'BRL', money_format: 'R${{amount}}', locale: 'en'}, template: {name: 'product'},
    cart: {item_count: 0, items: [], currency: {iso_code: 'BRL'}}, customer: null, pages: {}, all_products: {}, product,
  };
  const blockDefaults = type => defaultsOf((sch.blocks.find(b => b.type === type) || {}).settings);
  const e = engine(tree);
  const one = async (sid, settings, blocks) => {
    const sset = {...defaultsOf(sch.settings), ...saved.sec.settings, ...settings};
    for (const k of ['heading_font', 'body_font']) if (typeof sset[k] === 'string') sset[k] = {family: sset[k].replace(/_[nib]\d$/, '').split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), fallback_families: 'sans-serif'};
    const schemeId = sset.color_scheme && sset.color_scheme.id || sset.color_scheme;
    sset.color_scheme = {...(schemes.find(s => s.id === schemeId) || schemes[0])};
    const list = (blocks || saved.sec.block_order.filter(k => !saved.sec.blocks[k].disabled).map(k => ({id: k, ...saved.sec.blocks[k]})))
      .map(b => ({id: b.id, type: b.type, shopify_attributes: `data-block-id="${b.id}"`, settings: {...blockDefaults(b.type), ...(b.settings || {})}}));
    const ctx = {...base, section: {id: sid, settings: sset, blocks: list, index: 2}};
    const html = await e.parseAndRender(clean(body(readIn(tree, 'sections/main-product.storelib'))), ctx, {globals: ctx});
    return {html, settings: sset, blocks: list};
  };
  const sid = id || saved.id;
  const first = await one(sid, settings, blocks);
  const others = [];
  for (const m of more) others.push({id: m.id, ...(await one(m.id, m.settings || {}, m.blocks || blocks))});
  if (sectionOnly) return {sectionHtml: first.html, id: sid, settings: first.settings, blocks: first.blocks, more: others, schemes};
  const header = JSON.parse(readIn(tree, 'sections/header-group.json'));
  const hset = {...header.sections.header.settings, mega_menu: {handle: 'main-menu', links: [{title: 'Home', url: '/', links: []}, {title: 'Shop', url: '/collections/all', links: []}]}};
  hset.color_scheme = {...(schemes.find(s => s.id === hset.color_scheme) || schemes[0])};
  const hctx = {...base, section: {id: 'header', settings: hset, blocks: []}};
  const hdr = await e.parseAndRender(clean(body(readIn(tree, 'sections/theme-header.storelib'))), hctx, {globals: hctx});
  const le = engine(tree, {'header-group': `<div id="shopify-section-header" class="shopify-section section-header">${hdr}</div>`, 'footer-group': ''});
  const content = [{id: sid, html: first.html}, ...others].map(x => `<div id="shopify-section-${x.id}" class="shopify-section">${x.html}</div>`).join('') + '<div style="height:600px"></div>';
  let html = await le.parseAndRender(clean(body(readIn(tree, 'layout/theme.storelib'))), {...base, content_for_header: '', content_for_layout: content}, {globals: base});
  /* The controller, until the layout loads it. */
  if (script && fs.existsSync(path.join(tree, 'shopify/assets/live-main-product.js')) && !html.includes('live-main-product.js')) html = html.replace('</body>', '<script src="/assets/live-main-product.js" defer></script></body>');
  if (!script) html = html.replace(/<script[^>]*live-main-product\.js[^>]*><\/script>/g, '');
  if (extraHead) html = html.replace('</head>', extraHead + '</head>');
  return {html, sectionHtml: first.html, id: sid, settings: first.settings, blocks: first.blocks, more: others, schemes};
}

const SVG = {black: '#1d1d1d', beige: '#d8cdb5', poster: '#7a8fa6', red: '#b0302a', blue: '#2a4bb0', tall: '#4a7a4a'};
const FIXTURE_ERRORS = /Unexpected token|Unexpected end of input|is not valid JSON/;
const FOREIGN = /\/assets\/(?:media-)?live-(?!main-product)[\w-]+\.js/;
/* Parse errors of other groups' controllers in this tree (a parse error has no file in its stack). */
const parseCache = new Map();
function foreignParse(tree) {
  if (parseCache.has(tree)) return parseCache.get(tree);
  const vm = require('node:vm'), dir = path.join(tree, 'shopify/assets'), out = [];
  for (const f of fs.readdirSync(dir)) if (/^(media-)?live-.*\.js$/.test(f) && f !== 'live-main-product.js') { try { new vm.Script(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { out.push(e.message); } }
  parseCache.set(tree, out);
  return out;
}
async function open(browser, width, html, {tree = repo, reduced = false, height = 900, wait = 1200} = {}) {
  const ctx = await browser.newContext({viewport: {width, height}, ...(width < 500 ? {isMobile: true, hasTouch: true} : {}), reducedMotion: reduced ? 'reduce' : 'no-preference'});
  const p = await ctx.newPage();
  p.errors = [];
  /* Errors thrown by another group's live controller (being worked on in the same tree) are listed apart. */
  p.foreign = [];
  p.on('pageerror', err => { if (FIXTURE_ERRORS.test(err.message)) return; if (FOREIGN.test(err.stack || '') || foreignParse(tree).includes(err.message)) p.foreign.push(err.message); else p.errors.push(err.message); });
  await p.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.hostname !== 'fixture.test') return r.fulfill({status: 204, body: ''});
    if (u.pathname === '/') return r.fulfill({contentType: 'text/html', body: html});
    if (u.pathname.startsWith('/assets/')) {
      const f = path.join(tree, 'shopify/assets', u.pathname.slice(8));
      return fs.existsSync(f) ? r.fulfill({path: f, contentType: f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : undefined}) : r.fulfill({status: 404, body: ''});
    }
    if (u.pathname.startsWith('/img/')) {
      const key = u.pathname.slice(5, -4);
      return r.fulfill({contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="${SVG[key] || '#888'}"/></svg>`});
    }
    return r.fulfill({status: 204, body: ''});
  });
  await p.goto('https://fixture.test/');
  await p.waitForTimeout(wait);
  return {p, ctx};
}

/* A builder redraw of the section in place, then storelib:section-load. */
const redraw = (p, id, html) => p.evaluate(([id, html]) => {
  const sec = document.getElementById('shopify-section-' + id);
  sec.innerHTML = html;
  sec.dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: id}}));
}, [id, html]);
const emit = (p, detail) => p.evaluate(d => { document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: d})); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, detail);


/* The home page's saved Featured product (templates/home.json), drawn alone in the layout. */
async function renderFeatured({tree = repo, design = false, product = R5.PANTS, blocks, settings = {}} = {}) {
  const sch = schemaText(readIn(tree, 'sections/featured-product.storelib')).shopify;
  const home = JSON.parse(readIn(tree, 'templates/home.json'));
  const [fid, sec] = Object.entries(home.sections).find(([, s]) => s.type === 'featured-product');
  const all = JSON.parse(readIn(tree, 'config/settings.json'));
  const theme = {...all.shopify};
  const schemes = Object.entries(theme.color_schemes).map(([sid, v]) => ({id: sid, settings: v.settings}));
  theme.color_schemes = schemes;
  const base = {
    settings: theme, request: {host: 'x.test', locale: {iso_code: 'en'}, page_type: 'index', design_mode: design},
    routes: {account_url: '/account', account_login_url: '/account/login', root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', search_url: '/search'},
    shop: {name: 'Materia', domain: 'x.test', url: 'https://x.test', currency: 'BRL', money_format: 'R${{amount}}', locale: 'en'}, template: {name: 'index'},
    cart: {item_count: 0, items: [], currency: {iso_code: 'BRL'}}, customer: null, pages: {}, all_products: {},
  };
  const blockDefaults = type => defaultsOf((sch.blocks.find(b => b.type === type) || {}).settings);
  const sset = {...defaultsOf(sch.settings), ...sec.settings, ...settings, product};
  sset.color_scheme = {...(schemes.find(s => s.id === sset.color_scheme) || schemes[0])};
  const list = (blocks || sec.block_order.filter(k => !sec.blocks[k].disabled).map(k => ({id: k, ...sec.blocks[k]})))
    .map(b => ({id: b.id, type: b.type, shopify_attributes: `data-block-id="${b.id}"`, settings: {...blockDefaults(b.type), ...(b.settings || {})}}));
  const e = engine(tree);
  const ctx = {...base, section: {id: fid, settings: sset, blocks: list, index: 3}};
  const html = await e.parseAndRender(clean(body(readIn(tree, 'sections/featured-product.storelib'))), ctx, {globals: ctx});
  const le = engine(tree, {'header-group': '', 'footer-group': ''});
  const content = `<div id="shopify-section-${fid}" class="shopify-section">${html}</div><div style="height:600px"></div>`;
  let page = await le.parseAndRender(clean(body(readIn(tree, 'layout/theme.storelib'))), {...base, content_for_header: '', content_for_layout: content}, {globals: base});
  if (fs.existsSync(path.join(tree, 'shopify/assets/live-main-product.js')) && !page.includes('live-main-product.js')) page = page.replace('</body>', '<script src="/assets/live-main-product.js" defer></script></body>');
  return {html: page, sectionHtml: html, id: fid, blocks: list};
}

/* What a visitor sees of the section: every drawn element in order, with its box and paint. */
const look = (p, id) => p.evaluate(id => {
  const root = document.getElementById('shopify-section-' + id), out = [], top = root.getBoundingClientRect().top;
  for (const el of root.querySelectorAll('*')) {
    if (/^(STYLE|SCRIPT|TEMPLATE|LINK|META)$/.test(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const c = getComputedStyle(el);
    if (c.visibility === 'hidden') continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    out.push([el.tagName, Math.round(r.left), Math.round(r.top - top), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.fontWeight, c.borderRadius, c.opacity, c.borderTop, c.borderBottom, c.borderLeft, c.boxShadow, c.textDecorationLine, own.slice(0, 40)].join('|'));
  }
  return out;
}, id);
const lookDiff = (a, b, max = 8) => {
  const d = [];
  for (let i = 0; i < Math.max(a.length, b.length) && d.length < max; i++) if (a[i] !== b[i]) d.push(i + ': ' + a[i] + '  =>  ' + b[i]);
  return d;
};

module.exports = {renderFeatured, look, lookDiff, repo, engine, treeAt, renderMain, open, redraw, emit, mainSchema, savedMain, defaultsOf, schemaText, R5};
