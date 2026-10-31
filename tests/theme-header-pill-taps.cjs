/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-header-pill-taps.cjs
   The pill header with its blur (or the glass) on: the decorative blur layer
   sits inside the bar, and `.header.is-pill * { pointer-events: auto }` once
   gave it back the taps meant for the buttons under it. Rendered with the
   saved header and the whole layout, at 375 (touch) and 1366: the element at
   the centre of the menu, search, account and cart buttons is that button,
   and a real tap on the menu button opens the drawer. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let Liquid = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) { try { ({ Liquid } = require(p)); break; } catch { /* next */ } }
if (!Liquid) { console.log('pill tap checks skipped: set LIQUIDJS=<path to liquidjs>'); process.exit(0); }
// The renderer of tests/theme-cleanup-header.cjs (engine, clean, body), without running that test.
const src = read('tests/theme-cleanup-header.cjs');
const helper = src.slice(src.indexOf('const clean = '), src.indexOf('const L = ('));
const body = text => text.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
const { engine: baseEngine, clean } = new Function('require', 'fs', 'path', 'root', 'Liquid', 'body', helper + ';return {engine, clean};')(require, fs, path, root, Liquid, body);
// A missing value prints null through | json, as on the storefront (JSON.stringify(undefined) prints nothing).
const engine = groups => { const e = baseEngine(groups); e.registerFilter('json', v => v === undefined ? 'null' : JSON.stringify(v)); return e; };
const MENU = { handle: 'main-menu', links: JSON.parse(read('config/settings.json')).menus['main-menu'].links.map(l => ({ title: l.title, url: l.url, links: [], handle: l.title.toLowerCase() })) };

async function render(pill) {
  const theme = { ...JSON.parse(read('config/settings.json')).shopify };
  const schemes = Object.entries(theme.color_schemes).map(([id, v]) => ({ id, settings: v.settings }));
  theme.color_schemes = schemes;
  const saved = JSON.parse(read('sections/header-group.json')).sections.header;
  const hset = { ...saved.settings, mega_menu: MENU };
  hset.color_scheme = { ...(schemes.find(s => s.id === hset.color_scheme) || schemes[0]) };
  const blocks = (saved.block_order || []).map(k => ({ id: k, shopify_attributes: '', type: saved.blocks[k].type, settings: saved.blocks[k].type === 'pill_glass' ? { ...saved.blocks[k].settings, ...pill } : saved.blocks[k].settings }));
  const base = { settings: theme, request: { host: 'x.test', locale: { iso_code: 'en' }, page_type: 'index', design_mode: false }, routes: { account_url: '/account', account_login_url: '/account/login', root_url: '/', cart_url: '/cart', search_url: '/search' }, shop: { name: 'Materia' }, template: { name: 'index' }, cart: { item_count: 2, items: [] } };
  const hctx = { ...base, section: { id: 'header', settings: hset, blocks } };
  const hdr = await engine().parseAndRender(clean(body(read('sections/theme-header.storelib'))), hctx, { globals: hctx });
  return engine({ 'header-group': `<div id="shopify-section-header" class="shopify-section shopify-section-group-header-group section-header">${hdr}</div>` }).parseAndRender(clean(body(read('layout/theme.storelib'))), { ...base, content_for_header: '', content_for_layout: '<main style="min-height:1600px;padding:40px"><h1>Page</h1></main>' }, { globals: base });
}


(async () => {
  let checks = 0;
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const [name, pill] of [['pill blur', { header_pill_enable: true, header_pill_mobile: true, header_pill_blur: true, glass_enabled: false }], ['pill glass', { header_pill_enable: true, header_pill_mobile: true, glass_enabled: true }]]) {
      const html = await render(pill);
      for (const width of [375, 1366]) {
        const phone = width < 500;
        const ctx = await browser.newContext({ viewport: { width, height: phone ? 812 : 900 }, ...(phone ? { isMobile: true, hasTouch: true } : {}) });
        const p = await ctx.newPage(), errors = [];
        p.on('pageerror', e => errors.push(e.message));
        await p.route('**/*', r => {
          const u = new URL(r.request().url());
          if (u.hostname !== 'fixture.test') return r.fulfill({ status: 204, body: '' });
          if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: html });
          const f = path.join(root, 'shopify/assets', u.pathname.replace(/^\/assets\//, ''));
          if (u.pathname.startsWith('/assets/') && fs.existsSync(f)) return r.fulfill({ path: f, contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript' });
          return r.fulfill({ status: 204, body: '' });
        });
        await p.goto('https://fixture.test/');
        await p.waitForTimeout(900);
        assert(await p.locator('header.header.is-pill').count(), `${name} ${width}: the header is a pill`);
        assert(await p.locator(name === 'pill blur' ? '.header-glass-layer--pill' : '.header-glass-layer:not(.header-glass-layer--pill)').count(), `${name} ${width}: the blur layer is drawn`);
        // Every control the bar shows: the menu button and each link or button in the actions (search, account, wishlist, cart).
        const hits = await p.evaluate(() => [...document.querySelectorAll('header.header [data-action="toggle-nav"], header.header .header__action :is(a, button, [data-action])')]
          .filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('.navigation, [hidden], .lang__currency-desktop') && r.top < innerHeight && r.left < innerWidth; })
          .filter((e, i, all) => !all.some(o => o !== e && o.contains(e)))
          .map(el => { const r = el.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { ok: !!top && (top === el || el.contains(top)), top: top ? top.tagName + '.' + top.className : null, el: el.tagName + '.' + el.className + (el.getAttribute('href') ? ' ' + el.getAttribute('href') : '') }; }));
        const names = hits.map(h => h.el).join(' | ');
        if (phone) assert(/nav-toggle/.test(names), `${name} ${width}: the menu button is in the bar: ${names}`);
        // On a phone the account link is in the drawer; the bar keeps search and cart.
        for (const want of phone ? ['search', 'cart'] : ['search', 'account', 'cart']) assert(new RegExp(want, 'i').test(names), `${name} ${width}: the ${want} button is in the bar: ${names}`);
        for (const h of hits) { assert(h.ok, `${name} ${width}: a tap on ${h.el} reaches ${h.top}`); checks++; }
        if (phone) {
          await p.locator('header.header [data-action="toggle-nav"]').first().tap();
          await p.waitForFunction(() => document.documentElement.classList.contains('nav-open'), null, { timeout: 3000 });
          await p.waitForTimeout(700);
          const drawer = await p.evaluate(() => { const nav = document.querySelector('.navigation.mobile'), r = nav.getBoundingClientRect(); return { left: r.left, width: r.width, visible: getComputedStyle(nav).visibility !== 'hidden' }; });
          assert(drawer.visible && drawer.left > -2 && drawer.width > 200, `${name}: the tap opens the drawer ${JSON.stringify(drawer)}`);
          checks++;
        }
        assert.deepEqual(errors, [], `${name} ${width}: page errors`);
        await ctx.close();
      }
    }
  } finally { await browser.close(); }
  console.log(`${checks} pill header tap checks passed (blur and glass, 375 and 1366, real tap opens the drawer)`);
})().catch(e => { console.error(e); process.exitCode = 1; });
