/* Shared browser fixture for the Image and video sections.
   Renders a real section file with liquidjs (LIQUIDJS=<path> or installed),
   mounts one or more instances in Chromium with theme variables, loads the
   theme CSS and the section runtimes, and gives small helpers for live
   editor events and computed styles.

   const {launch, mount} = require('./media-fixture.cjs');
   const browser = await launch();
   const t = await mount(browser, 'image-2', {width: 375, editing: true});
   await t.emit({padding_top_mobile: 30});          // section setting
   await t.emit({text: 'Hi'}, t.blockId('heading'));  // block setting
   await t.css('.img2', 'paddingTop');
   await t.redraw();                                 // server-style redraw
*/
const fs = require('fs'), path = require('path'), {chromium} = require('playwright'), {engine, PANTS, OTHER, TALL, EMPTY} = require('./theme-featured-product-round5.cjs');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const def = a => Object.fromEntries((a || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
const THEME_VARS = ':root{--color-background:#182028;--color-heading:#ffffff;--color-text:#cccccc;--color-primary:#336699;--color-secondary:#995533;--color-border:#445566;--color-foreground:#ffffff;--gradient-background:#182028;--body-font:Arial;--heading-font:Georgia;--body-weight:400;--heading-weight:700;--body-line-height:1.5;--heading-line-height:1.2;--page-width:1300px;--fluid-container-width:1500px;--rounded-radius:8px;--btn-primary-bg-color:#123456;--btn-primary-color:#ffffff;--btn-primary-border-color:#123456;--btn-primary-hover-bg-color:#ff0000;--btn-primary-hover-color:#ffffff;--btn-secondary-bg-color:#ffffff;--btn-secondary-color:#123456;--btn-anim-duration:0ms;--btn-radius:12px;--btn-font:Arial;--btn-font-size:16px;--btn-font-weight:500;--btn-padding-x:24px;--btn-padding-y:12px;--heading-font-scale:1;--responsive-rate:((100vw - 575px) / (1600 - 575));--body-font-size:16px;--h0-size:calc(var(--heading-font-scale) * 4.8rem);--h1-size:calc(var(--heading-font-scale) * 4rem);--h2-size:calc(var(--heading-font-scale) * 3.6rem);--h3-size:calc(var(--heading-font-scale) * 3rem);--h4-size:calc(var(--heading-font-scale) * 2.4rem);--h5-size:calc(var(--heading-font-scale) * 1.8rem);--h6-size:calc(var(--heading-font-scale) * 1.6rem);--card-radius:6px;--container-gutter:30px;--grid-gap:12px;--border-width:1px;--transition:0.4s cubic-bezier(.3, 1, .3, 1);--duration-short:0.3s;--duration-long:0.5s}.color-alt-scheme{--color-background:#fafafa;--color-heading:#101010;--color-text:#333333;--color-primary:#008800;--color-border:#dddddd;--gradient-background:#fafafa}body{margin:0;background:#000}';
const BASE_CSS = ['critical.css', 'theme.css', 'theme-button-contract.css', 'animation.css'];
const BASE_JS = ['hero-image-one.js'];

function schemaOf(name) {
  const raw = read('sections/' + name + '.storelib');
  return {raw, schema: JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify};
}

/* section: {id, settings, blocks:[{type, settings}]} merged over schema defaults and the first preset. */
async function render(name, {editing = true, uid = 'test', settings = {}, blocks, extraBlocks = [], theme = {}, globals = {}} = {}) {
  const {raw, schema: s} = schemaOf(name), preset = (s.presets || [])[0] || {}, bdef = t => def((s.blocks || []).find(x => x.type === t)?.settings);
  const list = (blocks || preset.blocks || []).concat(extraBlocks);
  const section = {id: uid, settings: {...def(s.settings), ...(preset.settings || {}), ...settings}, blocks: list.map((b, i) => ({id: uid + '-b' + i, type: b.type, settings: {...bdef(b.type), ...(b.settings || {})}}))};
  section.blocks_by_id = Object.fromEntries(section.blocks.map(b => [b.id, b]));
  const e = engine();
  e.registerFilter('script_tag', () => '');
  e.registerFilter('img_url', v => v?.url || v?.src || v || '');
  const ctx = {section, settings: {scroll_animation: 'none', animation_duration: 700, ...theme}, request: {design_mode: editing}, shop: {name: 'Materia Themes', currency: 'USD', money_format: '${{amount}}'}, routes: {all_products_collection_url: '/collections/all', cart_add_url: '/cart/add', cart_url: '/cart', root_url: '/'}, ...globals};
  const tpl = raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '');
  let html = await e.parseAndRender(tpl, ctx, {globals: ctx});
  const scripts = [];
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, (m, attrs, body) => { if (!/\bsrc=/.test(attrs) && !/type=["']?application\/(ld\+)?json/.test(attrs) && body.trim()) scripts.push(body); return /type=["']?application\/json/.test(attrs) ? m : ''; }).replace(/<link\b[^>]*>/g, '');
  return {html, scripts, schema: s, section};
}

async function launch() { return chromium.launch({executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined, args: ['--no-sandbox']}); }

/* instances: [{uid, settings, blocks, extraBlocks}] to mount several copies. assets: extra shopify/assets files (.css/.js) to load. inlineScripts: also run the section's own inline <script> bodies. */
async function mount(browser, name, {width = 1366, height = 900, editing = true, settings = {}, blocks, extraBlocks = [], instances, assets = [], theme = {}, globals = {}, inlineScripts = true, reducedMotion = 'no-preference'} = {}) {
  const page = await browser.newPage({viewport: {width, height}, reducedMotion});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route('**/*', r => r.request().url() === 'http://theme.test/' ? r.fulfill({body: '<!doctype html><html><head></head><body></body></html>', contentType: 'text/html'}) : /\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(r.request().url()) ? r.fulfill({body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'), contentType: 'image/png'}) : r.fulfill({body: ''}));
  await page.goto('http://theme.test/');
  const list = instances || [{uid: 'test', settings, blocks, extraBlocks}];
  const rendered = [];
  for (const inst of list) rendered.push(await render(name, {editing, theme, globals, ...inst, uid: inst.uid || 'test'}));
  await page.evaluate(({vars, editing}) => { const s = document.createElement('style'); s.textContent = vars; document.head.append(s); if (editing) { document.documentElement.classList.add('shopify-design-mode'); document.body.classList.add('shopify-design-mode'); window.Shopify = {designMode: true}; } }, {vars: THEME_VARS, editing});
  for (const f of BASE_CSS.concat(assets.filter(a => a.endsWith('.css')))) if (fs.existsSync(path.join(__dirname, '..', 'shopify/assets', f))) await page.addStyleTag({content: read('shopify/assets/' + f)});
  await page.evaluate(parts => { for (const p of parts) { const w = document.createElement('div'); w.id = 'shopify-section-' + p.uid; w.className = 'shopify-section'; w.innerHTML = p.html; document.body.append(w); } }, rendered.map((r, i) => ({uid: r.section.id, html: r.html})));
  for (const f of BASE_JS.concat(assets.filter(a => a.endsWith('.js')))) await page.addScriptTag({content: read('shopify/assets/' + f)});
  if (inlineScripts) for (const r of rendered) for (const body of r.scripts) await page.addScriptTag({content: body}).catch(e => errors.push('inline script: ' + e.message));
  await page.waitForTimeout(150);
  const first = rendered[0];
  const api = {
    page, errors, rendered, schema: first.schema, section: first.section,
    root: sel => page.locator('#shopify-section-' + first.section.id + (sel ? ' ' + sel : '')),
    blockId: (type, n = 0, uid = first.section.id) => rendered.find(r => r.section.id === uid).section.blocks.filter(b => b.type === type)[n]?.id,
    /* Live editor event, as the Storelib canvas sends it. */
    emit: async (settings, block, uid = first.section.id, live = true) => { await page.evaluate(({settings, block, uid, live}) => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: uid, settings, block, live}})), {settings, block, uid, live}); await page.waitForTimeout(70); },
    css: (sel, prop, uid = first.section.id) => page.locator('#shopify-section-' + uid + ' ' + sel).first().evaluate((el, k) => getComputedStyle(el)[k], prop),
    noOverflow: () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    /* Re-render with new settings and swap the section in place, then fire storelib:section-load like the builder. */
    redraw: async ({settings = {}, blocks, uid = first.section.id} = {}) => {
      const prev = rendered.find(r => r.section.id === uid);
      const next = await render(name, {editing, theme, globals, uid, settings: {...prev.section.settings, ...settings}, blocks: blocks || prev.section.blocks.map(b => ({type: b.type, settings: b.settings}))});
      Object.assign(prev, next);
      await page.evaluate(({uid, html}) => { const w = document.getElementById('shopify-section-' + uid); w.innerHTML = html; w.dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: uid}})); }, {uid, html: next.html});
      if (inlineScripts) for (const body of next.scripts) await page.addScriptTag({content: body}).catch(e => errors.push('inline script: ' + e.message));
      await page.waitForTimeout(120);
      return next;
    },
  };
  return api;
}

/* Static schema checks shared by every media section. Returns a list of problems. */
function schemaProblems(name) {
  const {schema: s} = schemaOf(name), out = [];
  const lists = [['section', s.settings || []], ...(s.blocks || []).map(b => ['block ' + b.type, b.settings || []])];
  for (const [where, list] of lists) {
    const ids = list.filter(x => x.id).map(x => x.id);
    if (new Set(ids).size !== ids.length) out.push(where + ': duplicate ids');
    for (const x of list) if (x.type === 'select' && (x.options || []).some(o => /^h[1-6]$/.test(o.value)) && x.hidden !== true) out.push(where + ': ' + x.id + ' exposes an HTML tag selector (keep the id, add "hidden": true)');
    for (const x of list) if (x.visible_if && !/^\{\{[\s\S]*\}\}$/.test(x.visible_if)) out.push(where + ': ' + x.id + ' visible_if is not a {{ }} expression');
  }
  if ((s.settings || []).find(x => x.id)?.id !== 'color_scheme') out.push('section: first setting is not color_scheme');
  return out;
}

module.exports = {render, launch, mount, schemaOf, schemaProblems, THEME_VARS, PANTS, OTHER, TALL, EMPTY};
