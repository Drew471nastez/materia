/* The two saved Content Tabs (templates/home.json content_tabs_6wGCed and
   templates/product.json content_tabs_TGhHGp) look the same before and after
   the Features c changes, at 375 and 1366, with the shop's own Default colour
   scheme and the real theme priority rules. Card colours, the badge colours
   and the product page's white background are now custom styling, so the
   comparison sets the switches the lead adds to the templates
   (enable_custom_style on the section and on each card); without them the
   differences are listed (informational).

   LIQUIDJS=<path to liquidjs> node tests/theme-features-c-saved.cjs */
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), {execSync} = require('child_process');
const {launch, schemaOf, themeControls} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const BEFORE = '4b0142b5105bb986fc079db12745e377a2238804';
const name = 'content-tabs';
/* the Default scheme from config/settings.json and the saved Theme settings fonts stand-ins */
const VARS = ':root{--color-background:#ffffff;--gradient-background:#ffffff;--color-heading:#000000;--color-text:#0f0f0f;--color-border:#cecece;--color-primary:#1d1d1d;--body-font:Arial;--heading-font:Georgia;--body-weight:500;--heading-weight:500;--body-line-height:1.5;--heading-line-height:1.2;--page-width:1300px;--btn-primary-bg-color:#090909;--btn-primary-color:#ffffff;--btn-primary-border-color:#fefefe;--btn-radius:8px;--btn-font:Arial;--btn-font-size:16px;--btn-font-weight:600;--btn-padding-x:24px;--btn-padding-y:12px}body{margin:0}';
let checks = 0;
const notes = [];

async function look(browser, raw, sec, uid, width) {
  const e = engine(); e.registerFilter('script_tag', () => ''); e.registerFilter('img_url', v => v?.url || v || '');
  const section = {id: uid, settings: sec.settings, blocks: sec.block_order.filter(k => !sec.blocks[k].hidden).map(k => ({id: k, type: sec.blocks[k].type, settings: sec.blocks[k].settings, shopify_attributes: ''}))};
  const ctx = {section, settings: {scroll_animation: 'none'}, request: {design_mode: false}, routes: {}};
  const tpl = raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '');
  const html = (await e.parseAndRender(tpl, ctx, {globals: ctx})).replace(/<script\b[\s\S]*?<\/script>/g, '');
  const page = await browser.newPage({viewport: {width, height: 900}});
  await page.route('**/*', r => r.fulfill({body: r.request().url() === 'http://theme.test/' ? '<!doctype html><html><head></head><body></body></html>' : '', contentType: 'text/html'}));
  await page.goto('http://theme.test/');
  await page.addStyleTag({content: VARS});
  await page.addStyleTag({content: await themeControls()});
  await page.addStyleTag({content: VARS.replace(/body\{[^}]*\}/, '')});
  for (const f of ['critical.css', 'theme.css', 'theme-button-contract.css']) await page.addStyleTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', f), 'utf8')});
  await page.evaluate(({h, uid}) => { const w = document.createElement('div'); w.id = 'shopify-section-' + uid; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w); }, {h: html, uid});
  await page.waitForTimeout(80);
  const out = await page.evaluate(uid => {
    const q = s => document.querySelector('#shopify-section-' + uid + ' ' + s), all = s => [...document.querySelectorAll('#shopify-section-' + uid + ' ' + s)];
    const cs = (el, ...p) => { const c = getComputedStyle(el); return p.map(k => c[k]).join(' | '); };
    const box = el => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round).join(','); };
    const r = {};
    r.section = cs(q('.ctabs'), 'backgroundColor', 'paddingTop', 'paddingBottom') + ' ' + box(q('.ctabs'));
    r.heading = cs(q('.ctabs__heading'), 'color', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign') + ' ' + box(q('.ctabs__heading')) + ' ' + q('.ctabs__heading').textContent.trim();
    all('.ctabs__highlight').forEach((h, i) => { r['highlight' + i] = cs(h, 'color', 'fontSize', 'fontFamily') + ' ' + box(h) + ' ' + h.textContent.trim(); });
    all('.ctabs__card').forEach((c, i) => {
      r['card' + i] = box(c) + ' ' + cs(c, 'borderTopLeftRadius');
      r['card' + i + ' tint'] = cs(c.querySelector('.ctabs__tint'), 'backgroundColor', 'opacity');
      r['card' + i + ' title'] = cs(c.querySelector('.ctabs__title'), 'color', 'fontSize', 'fontFamily', 'fontWeight') + ' ' + box(c.querySelector('.ctabs__title'));
      r['card' + i + ' text'] = cs(c.querySelector('.ctabs__desc'), 'color', 'fontSize', 'fontFamily') + ' ' + box(c.querySelector('.ctabs__desc'));
      c.querySelectorAll('.ctabs__badge:not([hidden])').forEach((b, j) => { r['card' + i + ' badge' + j] = cs(b, 'backgroundColor', 'color', 'fontSize') + ' ' + box(b) + ' ' + b.textContent.trim(); });
    });
    const arrows = all('.ctabs__arrow'); arrows.forEach((a, i) => { r['arrow' + i] = cs(a, 'color', 'borderTopColor', 'width') + ' ' + box(a); });
    all('.ctabs__btn').forEach((b, i) => { if (b.offsetParent) r['button' + i] = cs(b, 'backgroundColor', 'color', 'fontSize', 'borderTopLeftRadius', 'paddingTop', 'lineHeight') + ' ' + box(b) + ' ' + b.textContent.trim(); });
    const f = q('.ctabs__footer'); r.footer = f && f.offsetParent ? cs(f, 'color', 'fontSize') + ' ' + box(f) : 'none';
    return r;
  }, uid);
  await page.close();
  return out;
}

(async () => {
  const browser = await launch();
  const oldRaw = execSync('git show ' + BEFORE + ':sections/' + name + '.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8'});
  const newRaw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8');
  assert.ok(!oldRaw.includes('data-fc-root') && newRaw.includes('data-fc-root'), 'the two versions');
  const s = schemaOf(name).schema, defs = list => Object.fromEntries((list || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
  try {
    for (const [file, key] of [['home', 'content_tabs_6wGCed'], ['product', 'content_tabs_TGhHGp']]) {
      const saved = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates', file + '.json'), 'utf8')).sections[key];
      const fill = (sec, toggles) => ({...sec, settings: {...defs(s.settings), ...sec.settings, ...(toggles && sec.settings.background ? {enable_custom_style: true} : {})},
        blocks: Object.fromEntries(Object.entries(sec.blocks).map(([k, b]) => [k, {...b, settings: {...defs(s.blocks.find(x => x.type === b.type).settings), ...b.settings, ...(toggles && b.type === 'tab' ? {enable_custom_style: true} : {})}}]))});
      for (const width of [375, 1366]) {
        const before = await look(browser, oldRaw, fill(saved, false), key, width);
        const as = await look(browser, newRaw, fill(saved, false), key, width);
        const toggled = await look(browser, newRaw, fill(saved, true), key, width);
        /* boxes may move by up to 2px: the button now uses the theme button contract (line height 1.4), so the rows below it shift by a pixel */
        const close = (x = '', y = '') => { const r = /(-?\d+),(-?\d+),(-?\d+),(-?\d+)/, a = x.match(r), b = y.match(r); return a && b && x.replace(r, '') === y.replace(r, '') && a.slice(1).every((v, i) => Math.abs(v - b[i + 1]) <= 2); };
        const changed = (a, b, strict) => Object.keys({...a, ...b}).filter(k => a[k] !== b[k] && !(strict && (k.startsWith('button') || close(a[k], b[k])))).map(k => `${k}: ${a[k]} -> ${b[k]}`);
        const withToggles = changed(before, toggled, true);
        const buttons = changed(before, toggled).filter(x => x.startsWith('button'));
        if (buttons.length) notes.push(`${file} ${key} @${width} button (theme button contract, informational): ${buttons.join('; ')}`);
        assert.deepEqual(withToggles, [], `${file} ${key} @${width} with the template switches`); checks++;
        const without = changed(before, as);
        notes.push(`${file} ${key} @${width}: ${without.length ? without.length + ' differences without the switches:\n    ' + without.join('\n    ') : 'identical without switches'}`);
      }
    }
    console.log(notes.join('\n'));
    console.log(checks + ' saved Content Tabs comparisons passed (identical with the switches)');
  } catch (e) { console.error(notes.join('\n')); console.error(e.message.slice(0, 4000)); process.exitCode = 1; } finally { await browser.close(); }
})();
