/* Shared harness for the round 6 footer and phone navigation tests
   (theme-r6-footer*.cjs). Renders the real layout/theme.storelib with the
   footer group (sections/theme-footer) and the overlay group's Mobile
   navigation bar (and Custom colors), serving the repository's
   shopify/assets, so Theme settings > Typography "Use in every section"
   (snippets/theme-controls) and every footer stylesheet apply as on the site.
   `old: true` renders the files as they were before round 6 (c098384, or
   FOOTER_BASE=<ref>) for the saved-look comparison. The layout does not load
   shopify/assets/live-footer.js yet, so `live: true` (the default for new
   renders) adds it the way the layout will. liquidjs stands in for
   Storelib's renderer (LIQUIDJS=<path>). */
process.env.HEADER_BASE = process.env.FOOTER_BASE || 'c098384';
const H = require('./theme-r5-header-lib.cjs');
const {read, readHead, body, engine, L, img} = H;
const clean = s => s.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');
const schemaOf = (f, old) => { const t = old ? readHead(f) : read(f); return JSON.parse(t.slice(t.indexOf('\n<schema>') + 9, t.lastIndexOf('</schema>'))).shopify; };
const defaults = list => Object.fromEntries((list || []).filter(s => s.id && 'default' in s).map(s => [s.id, s.default]));
const ALL = JSON.parse(read('config/settings.json'));
const MENUS = Object.fromEntries(Object.entries(ALL.menus).map(([h, m]) => [h, {handle: h, title: m.title, links: m.links.map(l => L(l.title, l.url))}]));
const savedFooter = () => JSON.parse(read('sections/footer-group.json')).sections.footer;
const savedBar = () => JSON.parse(read('sections/overlay-group.json')).sections.mobile_navigation_bar_GG8UWc;
const savedColors = () => JSON.parse(read('sections/overlay-group.json')).sections['custom-colors'];
const blockList = sec => (sec.block_order || Object.keys(sec.blocks || {})).map(id => ({id, type: sec.blocks[id].type, settings: {...sec.blocks[id].settings}}));
const localization = {country: {iso_code: 'US', name: 'United States', currency: {iso_code: 'USD', symbol: '$'}}, language: {iso_code: 'en', endonym_name: 'English'},
  available_countries: [{iso_code: 'US', name: 'United States', currency: {iso_code: 'USD', symbol: '$'}}, {iso_code: 'FR', name: 'France', currency: {iso_code: 'EUR', symbol: '€'}}],
  available_languages: [{iso_code: 'en', endonym_name: 'English'}, {iso_code: 'fr', endonym_name: 'Français'}]};

/* The form tag with its attributes, as Storelib prints it. */
function formTag(e) {
  e.registerTag('form', {
    parse(tok, remain) {
      this.args = tok.args; this.tpls = [];
      const s = this.liquid.parser.parseStream(remain);
      s.on('tag:endform', () => s.stop()).on('template', t => this.tpls.push(t)).on('end', () => { throw new Error('unclosed form'); }); s.start();
    },
    * render(ctx, em) {
      const parts = []; let cur = '', q = false;
      for (const ch of this.args) { if (ch === "'") q = !q; if (ch === ',' && !q) { parts.push(cur); cur = ''; } else cur += ch; }
      parts.push(cur); parts.shift();
      let attrs = '';
      for (const p of parts) {
        const m = p.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/); if (!m) continue;
        const v = /^'.*'$/.test(m[2]) ? m[2].slice(1, -1) : yield this.liquid.evalValue(m[2], ctx);
        attrs += ` ${m[1]}="${String(v == null ? '' : v).replace(/"/g, '&quot;')}"`;
      }
      ctx.push({form: {}});
      em.write(`<form method="post" action="/contact#ContactFooter"${attrs}><input type="hidden" name="form_type" value="customer">`);
      yield this.liquid.renderer.renderTemplates(this.tpls, ctx, em);
      em.write('</form>');
      ctx.pop();
    },
  });
  e.registerFilter('font_face', f => f && f.family ? `@font-face{font-family:"${f.family}";src:local("${f.family}");font-display:swap}` : '');
  e.registerFilter('inline_asset_content', () => '');
  return e;
}

/* opts: old, design_mode, footer (settings over the saved ones), footerBlocks,
   bar, barBlocks, page_type, live (add live-footer.js; default !old),
   footerId, barId, noBar */
async function renderPage(opts = {}) {
  const old = !!opts.old;
  const theme = {...ALL.shopify};
  const schemes = Object.entries(theme.color_schemes).map(([id, v]) => ({id, settings: v.settings}));
  theme.color_schemes = schemes;
  theme.logo = img('logo', 300, 100);
  if (!theme.store_address) theme.store_address = '12 Market Street';
  const page_type = opts.page_type || 'index';
  const base = {
    settings: theme, request: {host: 'x.test', locale: {iso_code: 'en'}, page_type, design_mode: !!opts.design_mode, path: '/'},
    routes: {account_url: '/account', account_login_url: '/account/login', account_logout_url: '/account/logout', root_url: '/', cart_url: '/cart', search_url: '/search'},
    shop: {name: 'Materia', domain: 'x.test', url: 'https://x.test'}, template: {name: page_type === 'index' ? 'index' : 'page'}, cart: {item_count: 2, items: []}, customer: null, localization,
    collections: {all: {url: '/collections/all'}}, linklists: MENUS,
  };
  const e = formTag(engine({}, old));
  const fsrc = old ? readHead('sections/theme-footer.storelib') : read('sections/theme-footer.storelib');
  const bsrc = old ? readHead('sections/mobile-navigation-bar.storelib') : read('sections/mobile-navigation-bar.storelib');
  const csrc = old ? readHead('sections/custom-colors.storelib') : read('sections/custom-colors.storelib');
  const fsch = schemaOf('sections/theme-footer.storelib', old), bsch = schemaOf('sections/mobile-navigation-bar.storelib', old);
  const fid = opts.footerId || 'footer', bid = opts.barId || 'mobile_navigation_bar_GG8UWc';
  const scheme = v => schemes.find(s => s.id === (v && v.id || v)) || schemes[0];
  const prep = (sch, type, s) => {
    const out = {...defaults((sch.blocks.find(b => b.type === type) || {}).settings), ...s};
    if (typeof out.menu === 'string') out.menu = MENUS[out.menu] || '';
    return out;
  };
  /* a font picker holds a font object in Storelib (family, fallback_families); a saved handle such as assistant_n4 is read as that font */
  const fonts = (sch, s) => { for (const x of sch.settings) if (x.type === 'font_picker' && typeof s[x.id] === 'string') { const fam = s[x.id].replace(/_[nib]\d$/, '').split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' '); s[x.id] = {family: fam, fallback_families: 'sans-serif'}; } return s; };
  const footerCtx = (settings, blocks) => ({...base, section: {id: fid, settings: fonts(fsch, {...defaults(fsch.settings), ...settings, color_scheme: scheme(settings.color_scheme)}), blocks: blocks.map(b => ({shopify_attributes: '', ...b, settings: prep(fsch, b.type, b.settings)}))}});
  const barCtx = (settings, blocks) => ({...base, section: {id: bid, settings: fonts(bsch, {...defaults(bsch.settings), ...settings}), blocks: blocks.map(b => ({shopify_attributes: '', ...b, settings: prep(bsch, b.type, b.settings)}))}});
  const renderFooter = async (settings, blocks) => { const c = footerCtx(settings, blocks); return e.parseAndRender(clean(body(fsrc)), c, {globals: c}); };
  const renderBar = async (settings, blocks) => { const c = barCtx(settings, blocks); return e.parseAndRender(clean(body(bsrc)), c, {globals: c}); };
  const fsec = savedFooter(), bsec = savedBar(), csec = savedColors();
  const fset = {...fsec.settings, ...(opts.footer || {})}, fblocks = opts.footerBlocks || blockList(fsec);
  const bset = {...bsec.settings, ...(opts.bar || {})}, bblocks = opts.barBlocks || blockList(bsec);
  const fhtml = await renderFooter(fset, fblocks);
  const bhtml = opts.noBar ? '' : await renderBar(bset, bblocks);
  const cctx = {...base, section: {id: 'custom-colors', settings: {}, blocks: (opts.colorBlocks || blockList(csec)).map(b => ({shopify_attributes: '', ...b}))}};
  const chtml = await e.parseAndRender(clean(body(csrc)), cctx, {globals: cctx});
  const groups = {
    'header-group': '',
    'footer-group': `<div id="shopify-section-${fid}" class="shopify-section shopify-section-group-footer-group">${fhtml}</div>`,
    'overlay-group': (opts.noBar ? '' : `<div id="shopify-section-${bid}" class="shopify-section shopify-section-group-overlay-group section-edge-bleed">${bhtml}</div>`) + `<div id="shopify-section-custom-colors" class="shopify-section shopify-section-group-overlay-group">${chtml}</div>`,
  };
  const le = formTag(engine(groups, old));
  const layout = old ? readHead('layout/theme.storelib') : read('layout/theme.storelib');
  let html = await le.parseAndRender(clean(body(layout)), {...base, content_for_header: '', content_for_layout: opts.content || '<main style="min-height:400px;padding:40px"><h2>Page</h2><span class="product__color-swatch custom__color-swatches--azure" style="display:inline-block;width:30px;height:30px"></span></main>'}, {globals: base});
  const live = opts.live !== undefined ? opts.live : !old;
  if (live && !/live-footer\.js/.test(html)) html = html.replace('</body>', '<script src="/assets/live-footer.js" defer="defer"></script></body>');
  return {html, fid, bid, fset, fblocks, bset, bblocks, renderFooter, renderBar, fsch, bsch, schemes};
}

async function open(browser, opts, width, extra = {}) {
  const r = await renderPage(opts);
  const old = !!opts.old;
  const ctx = await browser.newContext({viewport: {width, height: width < 500 ? 812 : 900}, ...(width < 500 ? {isMobile: true, hasTouch: true} : {}), reducedMotion: extra.reduced ? 'reduce' : 'no-preference'});
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  const path = require('node:path'), fs = require('node:fs');
  await p.route('**/*', async rt => {
    const u = new URL(rt.request().url());
    if (u.hostname !== 'fixture.test') return rt.fulfill({status: 204, body: ''});
    if (u.pathname === '/') return rt.fulfill({contentType: 'text/html', body: r.html});
    if (u.pathname.startsWith('/assets/')) {
      const rel = 'shopify/assets/' + u.pathname.slice(8);
      const type = rel.endsWith('.css') ? 'text/css' : rel.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
      if (old && /\.(css|js)$/.test(rel)) { const t = readHead(rel); if (t != null) return rt.fulfill({body: t, contentType: type}); }
      const f = path.join(H.root, rel);
      return fs.existsSync(f) ? rt.fulfill({path: f, contentType: type}) : rt.fulfill({status: 404, body: ''});
    }
    if (u.pathname.startsWith('/img/')) return rt.fulfill({contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#c9b8a6"/></svg>'});
    return rt.fulfill({status: 204, body: ''});
  });
  await p.goto('https://fixture.test/');
  await p.waitForTimeout(extra.wait || 600);
  await p.evaluate(() => document.fonts.ready);
  return {p, ctx, errors, r};
}

module.exports = {...H, clean, schemaOf, defaults, renderPage, open, savedFooter, savedBar, savedColors, blockList, MENUS, ALL};
