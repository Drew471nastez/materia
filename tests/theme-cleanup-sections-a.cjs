/* Run: node tests/theme-cleanup-sections-a.cjs   (exits 1 on any failure)
   Page-weight cleanup, part A: the footer, Benefits bar, Divider, Product
   Benefits 4, Mobile navigation bar and FAQ keep their static CSS and JS in
   cached files under shopify/assets instead of inline in every page.

   Static checks always run: each file exists, its section loads it (the
   builder also gets the CSS inline, so a redrawn section never shows for a
   frame without it), each script sets up every instance once and again on
   storelib:section-load, and no per-section id is left in the files.

   The rendered checks need liquidjs (LIQUIDJS=<path to liquidjs>): each saved
   instance (templates/*.json, sections/*-group.json) is drawn and its inline
   CSS and JS must stay under a budget. Then the home page's instances are
   drawn twice in Chromium, once with these sections as they were before the
   cleanup (git show BASE:<file>) and once as they are now, and every element
   of every section must compute the same styles and the screenshots must be
   byte-identical at 375, 768 and 1366. When a later change to one of these
   sections is meant to look different, move BASE to that commit. The
   comparison is skipped when BASE is not in this clone's history. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const body = text => text.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

const BASE = '9f32ccf';
const SECTIONS = {
  'theme-footer': { css: 'footer-section.css', js: 'footer-section.js', global: 'MateriaFooterAccordion', budget: { css: 4200, js: 700 } },
  'benefits-bar': { css: 'benefits-bar.css', js: 'benefits-bar.js', global: 'MateriaBenefitsBar', budget: { css: 4200, js: 700 } },
  divider: { css: 'divider-section.css', budget: { css: 2600, js: 400 } },
  'product-benefits-4': { css: 'product-benefits-4.css', js: 'product-benefits-4.js', global: 'MateriaPb4', budget: { css: 2600, js: 700 } },
  'mobile-navigation-bar': { css: 'mobile-navigation-bar.css', budget: { css: 2800, js: 600 } },
  'faq-pro': { css: 'faq-pro.css', js: 'faq-pro.js', global: 'MateriaFaqPro', budget: { css: 2400, js: 700 } },
};

/* ---------- static ---------- */
for (const [sec, a] of Object.entries(SECTIONS)) {
  const src = body(read(`sections/${sec}.storelib`));
  const css = read(`shopify/assets/${a.css}`);
  ok(css.length > 500, `${a.css} exists`);
  ok(src.includes(`{{ '${a.css}' | asset_url | stylesheet_tag }}`), `${sec} links ${a.css}`);
  ok(src.includes(`{%- if request.design_mode -%}<style>{{ '${a.css}' | inline_asset_content }}</style>{%- endif %}`), `${sec} inlines ${a.css} in the builder`);
  ok(!/\{\{|\{%|#shopify-section-[\w-]+[ .:{,>]/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), `${a.css} is static and names no section id`);
  ok(/:is\(#_, /.test(css), `${a.css} keeps the id weight with :is(#_, ...)`);
  if (a.js) {
    const js = read(`shopify/assets/${a.js}`);
    ok(src.includes(`<script src="{{ '${a.js}' | asset_url }}" defer></script>`), `${sec} loads ${a.js} deferred`);
    ok(new RegExp(`if \\(window\\.${a.global}\\) return;`).test(js), `${a.js} runs once however many times it is loaded`);
    ok(/storelib:section-load/.test(js), `${a.js} sets a redrawn section up again`);
    ok(!/\{\{|\{%|console\.log/.test(js), `${a.js} is static`);
    ok(new RegExp(`window\\.${a.global}`).test(src.split(`'${a.js}' | asset_url }}" defer`)[1] || ''), `${sec} has the builder bootstrap for ${a.js}`);
  }
}
ok(!/LoudzUninstallBG|loudzBreakpoints/.test(read('sections/benefits-bar.storelib')), 'benefits bar: the unused uninstall background and breakpoint global are gone');

/* ---------- rendered ---------- */
let Liquid = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) {
  try { ({ Liquid } = require(p)); break; } catch { /* next */ }
}
if (!Liquid) {
  console.log(`${checks} cleanup (sections A) checks passed (render skipped: liquidjs not installed; set LIQUIDJS=<path to liquidjs>)`);
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
  e.registerFilter('inline_asset_content', k => { const f = path.join(root, 'shopify/assets', String(k)); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''; });
  e.registerFilter('image_url', (v, ...a) => {
    const src = typeof v === 'string' ? v : (v && (v.src || v.url)) || '';
    const w = a.find(x => Array.isArray(x) && x[0] === 'width');
    return src + (w && w[1] ? '?width=' + w[1] : '');
  });
  e.registerFilter('image_tag', (u, ...a) => `<img src="${u}" ${a.filter(Array.isArray).filter(([k]) => k !== 'widths').map(([k, v]) => `${k}="${v ?? ''}"`).join(' ')}>`);
  e.registerFilter('json', v => JSON.stringify(v));
  for (const f of ['font_face', 'font_url', 'payment_type_svg_tag']) e.registerFilter(f, () => '');
  for (const f of ['font_modify', 'color_to_rgb', 'color_modify', 'color_mix', 'url', 'within']) e.registerFilter(f, v => v);
  e.registerFilter('placeholder_svg_tag', () => '<svg></svg>');
  e.registerFilter('color_brightness', () => 128);
  e.registerFilter('money', v => '$' + (Number(v || 0) / 100).toFixed(2));
  e.registerFilter('handleize', v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  e.registerFilter('handle', v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return e;
}
const L = (title, url) => ({ title, url, links: [], handle: title.toLowerCase().replace(/\W+/g, '-') });
const MENUS = {
  'main-menu': { handle: 'main-menu', links: [L('Home', '/'), L('Shop', '/collections/all'), L('About us', '/pages/about')] },
  footer: { handle: 'footer', links: ['About us', 'Contact', 'FAQ', 'Shipping'].map(t => L(t, '/pages/' + t.toLowerCase().replace(/\W+/g, '-'))) },
};
const schemaOf = text => JSON.parse(text.slice(text.indexOf('\n<schema>') + 9, text.lastIndexOf('</schema>'))).shopify;
const withDefaults = (defs, saved) => {
  const out = {};
  for (const s of defs || []) if (s.id && s.default !== undefined) out[s.id] = s.default;
  Object.assign(out, saved || {});
  for (const s of defs || []) if (s.type === 'link_list' && typeof out[s.id] === 'string') out[s.id] = MENUS[out[s.id]] || { links: [] };
  return out;
};
const base = (() => {
  const theme = { ...JSON.parse(read('config/settings.json')).shopify };
  theme.color_schemes = Object.entries(theme.color_schemes).map(([id, v]) => ({ id, settings: v.settings }));
  return {
    settings: theme, request: { host: 'x.test', locale: { iso_code: 'en' }, page_type: 'index', design_mode: false },
    routes: { account_url: '/account', account_login_url: '/account/login', root_url: '/', cart_url: '/cart', search_url: '/search', all_products_collection_url: '/collections/all' },
    shop: { name: 'Materia', email: 'hi@x.test', phone: '+1 555 0100' }, template: { name: 'index' }, cart: { item_count: 0, items: [] }, customer: null, linklists: MENUS,
    localization: { available_countries: [], available_languages: [], country: { iso_code: 'US' }, language: { iso_code: 'en' } },
  };
})();
async function draw(text, id, inst, groupClass = '') {
  const schema = schemaOf(text);
  const blocks = (inst.block_order || []).filter(k => !inst.blocks[k].hidden && !inst.blocks[k].disabled).map(k => {
    const b = inst.blocks[k];
    return { id: k, type: b.type, shopify_attributes: '', settings: withDefaults(((schema.blocks || []).find(x => x.type === b.type) || {}).settings, b.settings) };
  });
  const ctx = { ...base, section: { id, settings: withDefaults(schema.settings, inst.settings), blocks } };
  const html = await engine().parseAndRender(clean(body(text)), ctx, { globals: ctx });
  return { html, outer: `<div id="shopify-section-${id}" class="shopify-section${groupClass}${schema.class ? ' ' + schema.class : ''}" data-section-id="${id}" data-section-type="${inst.type}">${html}</div>` };
}
const inlineBytes = html => {
  let css = 0, js = 0;
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) css += Buffer.byteLength(m[1]);
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) if (!/json/.test(m[1])) js += Buffer.byteLength(m[2]);
  return { css, js };
};

const saved = [];
for (const f of [...fs.readdirSync(path.join(root, 'templates')).map(f => 'templates/' + f), 'sections/footer-group.json', 'sections/overlay-group.json'].filter(f => f.endsWith('.json'))) {
  let j; try { j = JSON.parse(read(f)); } catch { continue; }
  for (const [id, s] of Object.entries(j.sections || {})) if (SECTIONS[s.type] && !s.disabled) saved.push({ file: f, id, inst: s });
}

const { chromium } = require('playwright');
(async () => {
  /* Inline budget for every saved instance. */
  for (const { file, id, inst } of saved) {
    const { html } = await draw(read(`sections/${inst.type}.storelib`), id, inst);
    const b = inlineBytes(html), max = SECTIONS[inst.type].budget;
    ok(b.css <= max.css && b.js <= max.js, `${file} ${id}: inline CSS ${b.css} B (max ${max.css}), JS ${b.js} B (max ${max.js})`);
    ok(!/LoudzValueIcons|sec__divider-|pb4h__|faq7__|footer-acc__|\.mnb-label/.test([...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('')), `${id}: the section's own rules are in its file, not inline`);
  }

  /* Before / after: the home page's instances, the footer and the bar. */
  let baseOk = false;
  try { execFileSync('git', ['-C', root, 'cat-file', '-e', BASE + '^{commit}'], { stdio: 'ignore' }); baseOk = true; } catch { /* shallow */ }
  if (!baseOk) { console.log(`${checks} cleanup (sections A) checks passed (before/after skipped: ${BASE} not in history)`); return; }
  const old = sec => execFileSync('git', ['-C', root, 'show', `${BASE}:sections/${sec}.storelib`]).toString();
  const home = JSON.parse(read('templates/home.json'));
  const fg = JSON.parse(read('sections/footer-group.json')), og = JSON.parse(read('sections/overlay-group.json'));
  const content = home.order.filter(k => SECTIONS[home.sections[k].type] && !home.sections[k].disabled).map(k => [k, home.sections[k]]);
  const [fid, fsec] = Object.entries(fg.sections).find(([, s]) => s.type === 'theme-footer');
  const [mid, msec] = Object.entries(og.sections).find(([, s]) => s.type === 'mobile-navigation-bar');
  const page = async src => {
    const parts = [];
    for (const [id, s] of content) parts.push((await draw(src(s.type), id, s)).outer);
    const groups = {
      'footer-group': (await draw(src('theme-footer'), fid, fsec, ' shopify-section-group-footer-group')).outer,
      'overlay-group': (await draw(src('mobile-navigation-bar'), mid, msec, ' shopify-section-group-overlay-group')).outer,
    };
    return engine(groups).parseAndRender(clean(body(read('layout/theme.storelib'))), { ...base, content_for_header: '', content_for_layout: parts.join('\n') }, { globals: base });
  };
  const html = { before: await page(old), after: await page(t => read(`sections/${t}.storelib`)) };
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox', '--font-render-hinting=none', '--disable-lcd-text'] });
  const COMPUTED = () => {
    const skip = new Set(['STYLE', 'SCRIPT', 'LINK', 'TEMPLATE', 'NOSCRIPT']); const out = [];
    const props = el => { const o = {}; for (const pse of [null, '::before', '::after']) { const cs = getComputedStyle(el, pse); if (pse && cs.content === 'none') continue; for (let i = 0; i < cs.length; i++) { const n = cs[i]; if (!n.startsWith('--')) o[(pse || '') + n] = n === 'animation-name' ? cs.getPropertyValue(n).replace(/(pb4h[A-Za-z]+)-[\w-]+/g, '$1') : cs.getPropertyValue(n); } } return o; };
    const walk = el => { if (skip.has(el.tagName)) return; out.push([el.tagName + '.' + [...el.classList].join('.'), props(el)]); for (const c of el.children) walk(c); };
    document.querySelectorAll('.shopify-section').forEach(walk);
    return out;
  };
  try {
    for (const width of [375, 768, 1366]) {
      const got = {};
      for (const w of ['before', 'after']) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}), reducedMotion: 'reduce' });
        const p = await ctx.newPage();
        await p.route('**/*', r => {
          const u = new URL(r.request().url());
          if (u.hostname !== 'fixture.test') return r.fulfill({ status: 204, body: '' });
          if (u.pathname === '/') return r.fulfill({ contentType: 'text/html', body: html[w] });
          const f = path.join(root, 'shopify/assets', u.pathname.replace(/^\/assets\//, ''));
          if (u.pathname.startsWith('/assets/') && fs.existsSync(f)) return r.fulfill({ path: f, contentType: f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : undefined });
          return r.fulfill({ status: 204, body: '' });
        });
        await p.goto('https://fixture.test/');
        await p.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important}' });
        await p.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } window.scrollTo(0, 0); });
        await p.waitForTimeout(500);
        got[w] = { shot: await p.screenshot({ fullPage: true }), computed: await p.evaluate(COMPUTED) };
        await ctx.close();
      }
      const a = got.before.computed, b = got.after.computed; const diffs = [];
      if (a.length !== b.length) diffs.push(`${a.length} vs ${b.length} elements`);
      for (let k = 0; k < Math.min(a.length, b.length) && diffs.length < 5; k++) {
        if (a[k][0] !== b[k][0]) { diffs.push(`element ${k}: ${a[k][0]} vs ${b[k][0]}`); continue; }
        for (const prop in a[k][1]) if (a[k][1][prop] !== b[k][1][prop] && diffs.length < 5) diffs.push(`${a[k][0]} ${prop}: ${a[k][1][prop]} -> ${b[k][1][prop]}`);
      }
      ok(!diffs.length, `@${width}: every element computes the same styles as before (${a.length} elements)${diffs.length ? '\n  ' + diffs.join('\n  ') : ''}`);
      ok(got.before.shot.equals(got.after.shot), `@${width}: the page is pixel-identical to before`);
    }
  } finally { await browser.close(); }
  console.log(`${checks} cleanup (sections A) checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
