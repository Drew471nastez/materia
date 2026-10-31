/* Run: node tests/theme-home-load-perf.cjs
   Home page load work (sections/hero-*, promo/marketing, slideshow, text,
   before/after, announcement; snippets/localization-controls):
   - The section runtimes and their styles are printed once, by
     layout/theme.storelib's <head>; no section prints its own copy again (a
     classic script printed seven times ran its top level seven times, and each
     repeated <link> added the same sheet to style matching again).
   - The country/language picker styles are one cached file linked once, not
     2.5 KB of <style> each time a picker is drawn.
   - Every wave type's outlines live in text-section-controls.js, not as 58 KB
     of JSON in each Wavy Rich Text Banner.
   - A page with two of each hero/promo/text/before-after section loads with no
     forced style or layout pass from the sections' paint functions: widths come
     from one ResizeObserver cache (MateriaHeroImageOne.measure), read once in a
     batch before the first paint; the cache follows resizes and theme changes. */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {engine} = require('./theme-featured-product-round5.cjs');
const read = f => fs.readFileSync(f, 'utf8');
const clean = s => s.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '');
const parse = s => JSON.parse(s.split('<schema>')[1].split('</schema>')[0]).shopify;
const defaults = x => Object.fromEntries(x.settings.filter(s => s.id && 'default' in s).map(s => [s.id, s.default]));
let checks = 0;

const RUNTIMES = ['hero-image-one', 'hero-product-two', 'hero-product-one', 'hero-product-three', 'marketing-sections', 'hero-pro-scrolling',
  'before-after-controls', 'text-section-controls', 'scroll-text-reveal', 'slideshow-pointer', 'slideshow-live', 'announcement-three-colors',
  'announcement-pro-4', 'testimonial-quote'];
const layout = read('layout/theme.storelib');

/* Static: once in the layout, never again in a section, block or snippet. */
for (const name of RUNTIMES) {
  const js = fs.existsSync(`shopify/assets/${name}.js`), css = fs.existsSync(`shopify/assets/${name}.css`);
  if (js) assert.equal((layout.match(new RegExp(`'${name}\\.js' \\| asset_url`, 'g')) || []).length, 1, `layout loads ${name}.js once`);
  if (css) assert.equal((layout.match(new RegExp(`'${name}\\.css' \\| asset_url`, 'g')) || []).length, 1, `layout links ${name}.css once`);
}
for (const dir of ['sections', 'blocks', 'snippets']) for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.storelib'))) {
  const src = clean(read(`${dir}/${f}`)).replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '');
  for (const name of RUNTIMES) assert(!new RegExp(`'${name}\\.(js|css)' \\| asset_url`).test(src), `${dir}/${f} prints ${name} again (the layout already loads it)`);
}
checks++;

const loc = read('snippets/localization-controls.storelib');
assert(!/<style/.test(loc), 'localization-controls prints no <style>');
assert.equal((layout.match(/'localization-controls\.css' \| asset_url \| stylesheet_tag/g) || []).length, 1, 'layout links localization-controls.css once');
assert(layout.indexOf("'localization-controls.css'") < layout.indexOf('{{ content_for_header }}'), 'in <head>');
const locCss = read('shopify/assets/localization-controls.css');
for (const rule of ['localization-form button.button-localization {', 'min-height: 44px;', '.lang__currency-desktop:has(localization-form + localization-form)', '@media (prefers-reduced-motion: reduce)']) assert(locCss.includes(rule), `localization-controls.css keeps ${rule}`);
checks++;

const wavy = read('sections/wavyrichtextbanner.storelib');
assert(!wavy.includes('data-tx-wave-shapes'), 'the banner no longer carries every wave type as JSON');
const tsc = read('shopify/assets/text-section-controls.js');
const embedded = JSON.parse(tsc.match(/const WAVE_SHAPES='([^']*)'/)[1]);
assert.deepEqual(embedded, require('../scripts/wavy-shapes.cjs').shapes, 'text-section-controls.js holds scripts/wavy-shapes.cjs');
checks++;

/* Runtime: two of each section on one page, as a visitor. */
const SECTIONS = ['hero-section-pro', 'promo-banner-2', 'promotion-banner-pro-2', 'heroproduct1', 'hero-image1', 'wavyrichtextbanner', 'richtext1', 'before-and-after-reveal', 'hero-benefits'];
const PAINTERS = /\/(hero-image-one|hero-product-two|hero-product-one|hero-product-three|marketing-sections|before-after-controls|text-section-controls|slideshow-live|hero-benefits)\.js$/;

(async () => {
  const e = engine();
  const ctx = {settings: {scroll_animation: 'none'}, request: {design_mode: false}, page: {in_editor: false}};
  let body = '';
  for (const name of SECTIONS) {
    const raw = read(`sections/${name}.storelib`), schema = parse(raw);
    for (const id of ['a', 'b']) {
      const preset = schema.presets?.[0];
      const blocks = preset?.blocks?.length ? preset.blocks.map((b, i) => ({id: `${name}-${id}-${i}`, type: b.type, settings: {...defaults(schema.blocks.find(x => x.type === b.type) || {settings: []}), ...b.settings}}))
        : (schema.blocks || []).filter(b => b.settings).map((b, i) => ({id: `${name}-${id}-${i}`, type: b.type, settings: defaults(b)}));
      const section = {id: `${name}-${id}`, settings: {...defaults(schema), ...(preset?.settings || {})}, blocks};
      const c = {...ctx, section};
      const html = await e.parseAndRender(clean(raw), c, {globals: c});
      assert(!/<script[^>]+src=[^>]+(hero-(image|product|pro-scrolling)|marketing-|text-section|before-after|slideshow-)/.test(html), `${name} prints no runtime <script src>`);
      body += `<div class="shopify-section" id="shopify-section-${section.id}">${html}</div><div style="height:400px"></div>`;
    }
  }
  checks++;
  const tags = layout.split('\n').filter(l => /['"](hero-image-one|hero-product-(one|two|three)|marketing-sections|before-after-controls|text-section-controls|scroll-text-reveal|slideshow-live)\.(js|css)['"]/.test(l)).join('\n');
  const head = await e.parseAndRender(tags, {});

  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    for (const width of [375, 1366]) {
      const p = await browser.newPage({viewport: {width, height: 900}}), errors = [];
      p.on('pageerror', err => errors.push(err.message));
      await p.route('**/*', r => {
        const u = new URL(r.request().url()), name = u.pathname.split('/').pop();
        if (/^[\w.-]+\.(js|css)$/.test(name) && fs.existsSync('shopify/assets/' + name)) return r.fulfill({body: read('shopify/assets/' + name), contentType: name.endsWith('.js') ? 'application/javascript' : 'text/css'});
        if (/\.(png|jpe?g|webp|svg)$/.test(name)) return r.fulfill({body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#789"/></svg>', contentType: 'image/svg+xml'});
        if (u.pathname === '/') return r.fulfill({contentType: 'text/html', body: `<!doctype html><html><head><style>${read('shopify/assets/critical.css')}${read('shopify/assets/theme.css')}:root{--body-font:Arial;--heading-font:Georgia;--color-background:#fff;--color-text:#222;--color-heading:#111}body{margin:0}</style>${head}</head><body>${body}</body></html>`});
        return r.fulfill({body: '', contentType: 'text/plain'});
      });
      const cdp = await p.context().newCDPSession(p);
      const events = [];
      cdp.on('Tracing.dataCollected', d => events.push(...d.value));
      const done = new Promise(r => cdp.once('Tracing.tracingComplete', r));
      await cdp.send('Tracing.start', {traceConfig: {includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.stack']}});
      await p.goto('https://theme.test/', {waitUntil: 'load'});
      await p.waitForFunction(() => window.MateriaHeroImageOne?.measure && window.MateriaMarketing && window.MateriaHeroProductThree && window.MateriaTextSections && window.MateriaBeforeAfter);
      await p.evaluate(() => new Promise(r => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(r)), 600)));
      await cdp.send('Tracing.end'); await done;

      const forced = {paint: [], batch: []};
      for (const ev of events) {
        if (ev.ph !== 'X' || (ev.name !== 'UpdateLayoutTree' && ev.name !== 'Layout')) continue;
        const top = ev.args?.beginData?.stackTrace?.[0];
        if (!top || !PAINTERS.test((top.url || '').split('?')[0])) continue;
        (/^(width|prime|prop)$/.test(top.functionName) ? forced.batch : forced.paint).push(`${ev.name} ${top.url.split('/').pop()}:${top.lineNumber}:${top.functionName}`);
      }
      assert.deepEqual(forced.paint, [], `no section paint forces style or layout at ${width}px`);
      assert(forced.batch.length <= 4, `the batched width and space-scale reads force at most a few passes (${forced.batch.join(', ')})`);
      checks += 2;

      // Each layout runtime ran once. hero-benefits.js stays with its section (it is
      // not on every page); a second copy returns at its window.MateriaHeroBenefits guard.
      assert.deepEqual(await p.evaluate(() => [...document.scripts].map(s => s.src.split('/').pop()).filter(Boolean).filter((n, i, a) => a.indexOf(n) !== i && n !== 'hero-benefits.js')), [], 'no script runs twice');
      assert.equal(await p.locator('[data-marketing-section]').count(), 6);
      checks++;

      // The cached width follows the page: a resize reads it again, a theme change re-reads the scale.
      const widths = () => p.evaluate(() => [...document.querySelectorAll('[data-hero-image-one],[data-marketing-section],[data-hero-product-three],[data-text-controls],[data-before-after-controls]')].map(el => [MateriaHeroImageOne.measure.width(el), el.clientWidth]));
      for (const [cached, real] of await widths()) assert.equal(cached, real);
      await p.setViewportSize({width: width === 375 ? 1100 : 600, height: 900});
      await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      for (const [cached, real] of await widths()) assert.equal(cached, real, 'width cache follows a resize');
      const scale = await p.evaluate(async () => {
        const before = MateriaHeroImageOne.measure.prop('--sl-space-scale');
        document.documentElement.style.setProperty('--sl-space-scale', '1.5');
        await Promise.resolve();
        const after = MateriaHeroImageOne.measure.prop('--sl-space-scale');
        document.documentElement.style.removeProperty('--sl-space-scale');
        return [before, after];
      });
      assert.equal(scale[1].trim(), '1.5', 'a theme scale change is read again');
      checks++;

      // Live preview still paints a section from a setting change (desktop/mobile from the cache).
      await p.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'hero-section-pro-a', settings: {enable_custom_style: true, card_radius: 23}, live: true}})));
      await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      assert.deepEqual(errors, [], errors.join('\n'));
      checks++;
      await p.close();
    }
  } finally { await browser.close(); }
  console.log(`${checks} home page load checks passed`);
})().catch(err => { console.error(err); process.exit(1); });
