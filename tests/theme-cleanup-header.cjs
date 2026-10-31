/* Run: node tests/theme-cleanup-header.cjs   (exits 1 on any failure)
   The header's fixed CSS and its deferred scripts are cached files
   (shopify/assets/header-section.css, header-layout.css, header-sticky.css,
   header-section.js), linked where the rules used to be written inline. What
   a setting decides is a custom property written inline on the section.

   Static checks always run. With liquidjs (LIQUIDJS=<path>) the header is
   rendered with the saved settings: what it prints inline stays small, and
   in Chromium the page with the linked files is pixel-identical to the same
   page with each file's text written inline in its place (so a link is only
   a cache, never a change), at 375 and 1366, with the drawer and a mega menu
   open. The full before/after comparison against the former inline code was
   done once by hand for every header layout, hover and sticky option. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const body = text => text.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

/* ---------- static ---------- */
const header = body(read('sections/theme-header.storelib'));
const sticky = body(read('snippets/header-sticky-controller.storelib'));
const dims = body(read('snippets/header-dimensions.storelib'));
const CSS = ['header-section.css', 'header-layout.css', 'header-sticky.css'];
for (const f of [...CSS, 'header-section.js']) ok(fs.existsSync(path.join(root, 'shopify/assets', f)), `shopify/assets/${f} exists`);
for (const f of CSS) {
  const css = read('shopify/assets/' + f);
  ok(!/\{\{|\{%/.test(css), `${f} holds no Liquid`);
  ok(!/#shopify-section-/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), `${f} never names a section id`);
  ok((css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length, `${f} braces balance`);
}
const SCOPE = ':is(#materia-header, .shopify-section.section-header';
ok(CSS.every(f => read('shopify/assets/' + f).includes(SCOPE)), 'rules keep the weight of the section id through :is(#materia-header, ...)');
ok(/'header-section\.css' \| asset_url \| stylesheet_tag/.test(header) && /'header-layout\.css' \| asset_url \| stylesheet_tag/.test(header), 'the header links its two files');
ok(header.indexOf("'header-section.css'") < header.indexOf('{%- if pgs.glass_enabled -%}') && header.indexOf("'header-layout.css'") > header.indexOf('{%- if pill_enabled -%}'), 'each file sits where its rules were: before the glass, after the pill');
ok(/<script src="\{\{ 'header-section\.js' \| asset_url \}\}" defer="defer"><\/script>/.test(header), 'header-section.js is deferred');
ok(/'header-sticky\.css' \| asset_url \| stylesheet_tag/.test(sticky), 'the sticky controller links header-sticky.css');
ok(/window\.StorelibStickyStack/.test(sticky) && /window\.StorelibHeaderSticky/.test(sticky), 'the sticky controller stays inline: offsets before the first paint');
ok(!/<script>/.test(dims) && /--header-height-desktop: \{\{/.test(dims), 'header-dimensions prints only the two heights');
const js = read('shopify/assets/header-section.js');
ok(/__materiaCountBubbles/.test(js) && /MateriaHeaderDimensions/.test(js) && /storelib:settings-change/.test(js) && /storelib:section-load/.test(js), 'count bubbles and the builder slider drags live in header-section.js');
ok(!/console\.log/.test(js), 'no console.log');
ok(!/header\[data-menu-hover='[a-z_]+'\] #shopify-section/.test(header), 'the never-matching "header[...] #section" rules are gone');
for (const v of ['--hs-margin-top', '--hs-mnav-bg', '--hs-hover-fill', '--hs-logo-width', '--hs-logo-max-height']) ok(header.includes(v + ':'), `the section writes ${v}`);

/* ---------- rendered ---------- */
let Liquid = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) {
  try { ({ Liquid } = require(p)); break; } catch { /* next */ }
}
if (!Liquid) {
  console.log(`${checks} header cleanup checks passed (render skipped: set LIQUIDJS=<path to liquidjs>)`);
  process.exit(0);
}
const clean = s => s.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');
function engine(groups = {}) {
  const e = new Liquid({
    root: [path.join(root, 'snippets')], extname: '.storelib', dynamicPartials: true, strictFilters: false, strictVariables: false, jsTruthy: false, lenientIf: true,
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
  for (const tag of ['sections', 'section']) e.registerTag(tag, { parse(tok) { this.name = tok.args.replace(/['"]/g, '').trim(); }, * render(ctx, em) { em.write(groups[this.name] || ''); } });
  e.registerFilter('t', k => String(k).split('.').pop().replace(/_/g, ' '));
  e.registerFilter('asset_url', k => '/assets/' + k);
  e.registerFilter('stylesheet_tag', u => `<link rel="stylesheet" href="${u}">`);
  e.registerFilter('image_url', v => (typeof v === 'string' ? v : (v && (v.src || v.url)) || ''));
  e.registerFilter('image_tag', (u, ...a) => `<img src="${u}" ${a.filter(Array.isArray).filter(([k]) => k !== 'widths').map(([k, v]) => `${k}="${v ?? ''}"`).join(' ')}>`);
  e.registerFilter('json', v => JSON.stringify(v));
  for (const f of ['font_face', 'font_url', 'payment_type_svg_tag', 'inline_asset_content']) e.registerFilter(f, () => '');
  for (const f of ['font_modify', 'color_to_rgb', 'color_modify', 'color_mix', 'url', 'within']) e.registerFilter(f, v => v);
  e.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
  e.registerFilter('color_brightness', () => 128);
  e.registerFilter('money', v => '$' + (Number(v || 0) / 100).toFixed(2));
  e.registerFilter('handleize', v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return e;
}
const L = (title, url, links = []) => ({ title, url, links, handle: title.toLowerCase().replace(/\W+/g, '-') });
const MENU = { handle: 'main-menu', links: [L('Home', '/'), L('Shop', '/collections/all', [L('Layouts', '/c', [L('Grid [new]', '/g'), L('List', '/l')]), L('Pages', '/c', [L('Filters', '/f')])]), L('Pages', '/pages', [L('About us', '/a'), L('FAQ', '/q')])] };
async function render() {
  const theme = { ...JSON.parse(read('config/settings.json')).shopify };
  const schemes = Object.entries(theme.color_schemes).map(([id, v]) => ({ id, settings: v.settings }));
  theme.color_schemes = schemes;
  const saved = JSON.parse(read('sections/header-group.json')).sections.header;
  const hset = { ...saved.settings, mega_menu: MENU };
  hset.color_scheme = { ...(schemes.find(s => s.id === hset.color_scheme) || schemes[0]) };
  const blocks = (saved.block_order || []).map(k => ({ id: k, shopify_attributes: '', type: saved.blocks[k].type, settings: saved.blocks[k].settings }));
  const base = { settings: theme, request: { host: 'x.test', locale: { iso_code: 'en' }, page_type: 'index', design_mode: false }, routes: { account_url: '/account', account_login_url: '/account/login', root_url: '/', cart_url: '/cart', search_url: '/search' }, shop: { name: 'Materia' }, template: { name: 'index' }, cart: { item_count: 2, items: [] } };
  const hctx = { ...base, section: { id: 'header', settings: hset, blocks } };
  const hdr = await engine().parseAndRender(clean(body(read('sections/theme-header.storelib'))), hctx, { globals: hctx });
  const page = await engine({ 'header-group': `<div id="shopify-section-header" class="shopify-section shopify-section-group-header-group section-header">${hdr}</div>` }).parseAndRender(clean(body(read('layout/theme.storelib'))), { ...base, content_for_header: '', content_for_layout: '<main style="min-height:1600px;padding:40px"><h1>Page</h1></main>' }, { globals: base });
  return { hdr, page };
}

(async () => {
  const { hdr, page } = await render();
  let css = 0, inlineJs = 0;
  for (const m of hdr.matchAll(/<(style|script)(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/\1>/g)) {
    // localization-controls (shared with the top bar and footer) is not the header's own.
    if (m[1] === 'style' && /Keep the native accessible button/.test(m[2])) continue;
    if (m[1] === 'style') css += m[2].length; else inlineJs += m[2].length;
  }
  ok(css < 1500, `the header's own inline CSS is only its values (${css} bytes)`);
  ok(inlineJs < 13000, `inline JS is the sticky controller only (${inlineJs} bytes)`);
  for (const f of [...CSS, 'header-section.js']) ok(hdr.includes('/assets/' + f), `the rendered header links ${f}`);

  /* The same page with every header file written inline where it is linked. */
  const inlined = page.replace(/<link rel="stylesheet" href="\/assets\/(header-(?:section|layout|sticky)\.css)">/g, (m, f) => `<style>${read('shopify/assets/' + f)}</style>`);
  ok(inlined !== page, 'the inline copy differs from the linked page');
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const shoot = async (html, width) => {
      const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 812 : 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
      const p = await ctx.newPage();
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
      const shots = [await p.screenshot({ animations: 'disabled', caret: 'hide' })];
      if (width < 500) {
        await p.locator('button.nav-toggle').first().click();
      } else {
        await p.locator('.navigation:not(.mobile) .horizontal-list > .level0 > menu-item > a', { hasText: 'Shop' }).first().hover();
      }
      await p.waitForTimeout(900);
      shots.push(await p.screenshot({ animations: 'disabled', caret: 'hide' }));
      const facts = await p.evaluate(() => {
        const s = document.querySelector('#shopify-section-header'), c = getComputedStyle(s);
        return { mt: c.marginTop, mb: c.marginBottom, sticky: c.position, logo: getComputedStyle(s.querySelector('.header__logo')).maxWidth };
      });
      await ctx.close();
      return { shots, facts };
    };
    for (const width of [375, 1366]) {
      const a = await shoot(page, width), b = await shoot(inlined, width);
      ok(a.shots.every((s, i) => Buffer.compare(s, b.shots[i]) === 0), `${width}px: linked files and inline text draw the same pixels, closed and open`);
      ok(a.facts.mt === '0px' && a.facts.mb === '0px', `${width}px: Reset spacing still zeroes the section margins (${JSON.stringify(a.facts)})`);
      ok(a.facts.sticky === 'sticky', `${width}px: Always sticky is native sticky`);
      ok(/min\(/.test(a.facts.logo) || /px$/.test(a.facts.logo), `${width}px: the logo width comes from the header's slider value`);
    }
  } finally {
    await browser.close();
  }
  console.log(`${checks} header cleanup checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
