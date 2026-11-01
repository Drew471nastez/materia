// The 11 retired native Storelib sections (first line <template>, no presets, on no page).
// There is no native engine here, so this draws them with liquidjs, whose syntax matches the subset
// they use ({{ }}, if/elsif, for with limit, forloop, filters), with Storelib's url/asset/lines/raw/json
// filters and scheme.* colour defaults added, then checks each in Chromium at 375 and 1366:
// no sideways scroll, 44px targets, a visible keyboard focus ring, nothing moving under reduced motion,
// heading order, text contrast, the schema rules, and that both the editor and live states draw.
// LIQUIDJS=<path to liquidjs> node tests/theme-r6-native-sections.cjs
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const {Liquid} = require(process.env.LIQUIDJS || 'liquidjs');
const {chromium} = require('playwright');
const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS || '';
const NAMES = ['category_tabs','dropship_hero','faq_pants_down','feature_bento_grid','foundation_benefits','foundation_bento','foundation_comparison','foundation_cta','grouped_questions','help_centre_faq','storefront_hero'];
const SCHEMES = {
  light: {background:'#ffffff', bg:'#ffffff', background_secondary:'#f1f1ee', text:'#3d3d3d', paragraph:'#3d3d3d', text_muted:'#5c5c5c', heading:'#111111', accent:'#1f4fa3', link:'#1f4fa3', border:'#d9d9d4',
    primary_button_background:'#111111', primary_btn_bg:'#111111', primary_button_text:'#ffffff', primary_btn_text:'#ffffff', primary_btn_hover_bg:'#333333', primary_btn_hover_text:'#ffffff', primary_button_border:'#111111'},
  dark: {background:'#15191e', bg:'#15191e', background_secondary:'#232a31', text:'#d2d6da', paragraph:'#d2d6da', text_muted:'#aab0b6', heading:'#ffffff', accent:'#8fb4ff', link:'#8fb4ff', border:'#3a434c',
    primary_button_background:'#ffffff', primary_btn_bg:'#ffffff', primary_button_text:'#111111', primary_btn_text:'#111111', primary_btn_hover_bg:'#e6e6e6', primary_btn_hover_text:'#111111', primary_button_border:'#ffffff'},
};
const IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><rect width="800" height="1000" fill="#7a6a58"/></svg>');
const product = (i, extra = {}) => ({id: 'p' + i, type: 'product', settings: Object.assign({title: 'Pants Down ' + i, price: '130 RON', compare_price: i === 1 ? '200 RON' : '', image: IMG, images: [IMG], url: '/products/pants-down-' + i, slug: 'pants-down-' + i, available: true, tag: '', checkout_url: '/checkout?productId=p' + i + '&src=website', variants: []}, extra)});
const PRODUCTS = [1, 2, 3, 4, 5, 6].map(i => product(i));

function parse(name) {
  const src = fs.readFileSync(path.join(ROOT, 'sections', name + '.storelib'), 'utf8');
  const part = tag => { const m = src.match(new RegExp('^<' + tag + '[^>]*>\\n([\\s\\S]*?)^</' + tag + '>', 'm')); return m ? m[1] : ''; };
  return {src, template: part('template'), style: part('style'), schema: JSON.parse(part('schema'))};
}
function value(setting, scheme) {
  let v = setting.default;
  if (setting.type === 'color' && typeof v === 'string' && v.startsWith('scheme.')) v = scheme[v.slice(7)];
  if (v === undefined) v = {range: 0, number: 0, toggle: false, checkbox: false, product_list: [], image_gallery: []}[setting.type] ?? '';
  return v;
}
function settingsOf(list, scheme) { const o = {}; for (const s of list) if (s.id && !['header', 'paragraph', 'divider'].includes(s.type)) o[s.id] = value(s, scheme); return o; }

// Per section: what a filled-in instance holds beyond its defaults (pictures, a product, a collection, topics).
const FILL = {
  category_tabs: {blocks: b => [0, 1, 2].map(i => ({label: ['New in', 'Trousers', 'Long label for the third tab'][i], collection: {title: 'C' + i, products: PRODUCTS.slice(i)}}))},
  dropship_hero: {settings: {product: PRODUCTS[0].settings, image: IMG, image_alt: 'Trousers on a chair', badge_text: 'Sale'}, blocks: () => [{}, {icon: 'truck'}, {icon: 'return'}]},
  faq_pants_down: {blocks: () => [{}, {question: 'A much longer question that has to wrap onto a second line on a phone screen?'}, {}]},
  feature_bento_grid: {settings: {button_text: 'Buy the theme', badges: 'Fast\nNo code', head_layout: 'split', head_image: IMG}, blocks: () => [{image: IMG}, {width: 'narrow', decoration: 'chips', items: 'One\nTwo\nThree'}, {width: 'narrow', decoration: 'callouts', items: 'Header\nFooter', image: IMG}, {image: IMG}]},
  foundation_benefits: {blocks: () => [{}, {heading: 'Sizes S, M and L'}, {symbol: ''}]},
  foundation_bento: {blocks: () => [{image: IMG, image_alt: 'Trousers'}, {}, {}, {kicker: ''}]},
  foundation_comparison: {blocks: () => [{}, {label: 'A longer feature name that wraps'}, {}]},
  foundation_cta: {},
  grouped_questions: {blocks: () => [{topic: 'Ordering'}, {}, {topic: 'Sizes'}, {}]},
  help_centre_faq: {blocks: () => [{}, {}, {}]},
  storefront_hero: {settings: {product: PRODUCTS[1].settings, show_price_card: true}, blocks: () => [{}, {icon: 'truck'}, {icon: 'return'}]},
};

const engine = new Liquid({strictFilters: true});
engine.registerFilter('url', v => { v = v == null ? '' : String(v); return v === '' || /^(\/(?!\/)|https?:|mailto:|tel:|#)/.test(v) ? v : '#'; });
engine.registerFilter('asset', v => v);
engine.registerFilter('raw', v => v);
engine.registerFilter('lines', v => String(v || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 100));
engine.registerFilter('json', v => JSON.stringify(v));
engine.registerFilter('alpha', v => v);

async function render(name, {scheme = 'light', inEditor = false, filled = true, override = {}} = {}) {
  const {template, style, schema} = parse(name);
  const sc = SCHEMES[scheme];
  const settings = Object.assign(settingsOf(schema.settings, sc), filled ? (FILL[name].settings || {}) : {}, override);
  for (const s of schema.settings) if (s.responsive && typeof settings[s.id] !== 'object') settings[s.id] = {desktop: settings[s.id], tablet: settings[s.id], mobile: settings[s.id]};
  const blocks = [];
  if (filled && FILL[name].blocks) FILL[name].blocks().forEach((extra, i) => { const type = schema.blocks[0]; blocks.push({id: 'b' + i, type: type.type, settings: Object.assign(settingsOf(type.settings, sc), extra)}); });
  const ctx = {settings, blocks, section: {id: 'sec_' + name, type: name, settings, blocks}, scheme: sc, theme: {radius: {medium: 12}, typography: {heading: 'Georgia'}, colors: {}}, page: {in_editor: inEditor, template: 'index'}, products: PRODUCTS};
  const strip = s => s.replace(/\{#[\s\S]*?#\}/g, '');
  const html = await engine.parseAndRender(strip(template), ctx);
  const css = await engine.parseAndRender(strip(style), ctx);
  return {html, css, settings, blocks};
}

function page({html, css}, theme = '') {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  html,body{margin:0} body{font-family:Arial,sans-serif;--heading-font:Georgia,serif;--body-font:Arial,sans-serif} ${theme}</style>
  <style>${css}</style></head><body><div data-section-id="s1">${html}</div></body></html>`;
}

const results = [];
function ok(cond, msg) { results.push([!!cond, msg]); if (!cond) console.log('FAIL', msg); }

function lum(c) { const m = c.match(/[\d.]+/g).map(Number); const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); }
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

(async () => {
  // Static rules first.
  const allNames = new Map();
  for (const f of fs.readdirSync(path.join(ROOT, 'sections')).filter(x => x.endsWith('.storelib'))) {
    const s = fs.readFileSync(path.join(ROOT, 'sections', f), 'utf8'); const m = s.match(/<schema>\s*([\s\S]*?)<\/schema>/); if (!m) continue;
    try { const d = JSON.parse(m[1]); const n = (d.shopify || d).name; if (n) allNames.set(n, (allNames.get(n) || []).concat(f)); } catch (e) {}
  }
  for (const name of NAMES) {
    const {src, template, style, schema} = parse(name);
    ok(src.startsWith('<template>\n'), name + ': first line is <template>');
    ok(Array.isArray(schema.presets) && schema.presets.length === 0, name + ': stays retired, no presets');
    ok(allNames.get(schema.name).length === 1, name + ': name "' + schema.name + '" is unique');
    const ids = schema.settings.map(s => s.id); ok(new Set(ids).size === ids.length, name + ': setting ids unique');
    ok(schema.settings[0].type === 'header' && schema.settings[1].id === 'color_scheme', name + ': General header with color_scheme first');
    const sp = ids.indexOf('hdr_spacing'); ok(sp > 0 && schema.settings.slice(sp + 1).every(s => /^padding/.test(s.id)), name + ': spacing last');
    for (const s of schema.settings.filter(s => s.type === 'color')) ok(/^scheme\./.test(s.default) || s.id === 'card_text_color', name + ': colour ' + s.id + ' follows the scheme');
    ok(!/@media\s*\((min|max)-width/.test(style), name + ': container queries, no width media queries');
    ok(!/@container\s*\(max-width/.test(style), name + ': phone first (no max-width container queries)');
    ok(/prefers-reduced-motion:\s*reduce/.test(style), name + ': reduced motion rule');
    ok(!/\son[a-z]+=|<script|javascript:|<iframe/i.test(template), name + ': no handlers, scripts or frames in the template');
    const words = JSON.stringify(schema) + template;
    ok(!/[–—]|\b(unlock|elevate|seamless|powerful|effortless(ly)?|supercharge|transform)\b/i.test(words.replace(/"(transform|text-transform)"/g, '')), name + ': plain copy, no banned words or em dashes');
    for (const h of template.match(/href="[^"]*"/g) || []) ok(/\|\s*url\s*\}\}"$/.test(h), name + ': ' + h + ' goes through | url');
    ok(!/\sid="(?!\{\{|ct-\{\{)/.test(template), name + ': no literal id');
  }

  const browser = await chromium.launch({executablePath: fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined, args: ['--no-sandbox']});
  const ctxs = {};
  for (const w of [375, 1366]) ctxs[w] = await browser.newContext({viewport: {width: w, height: 900}});
  for (const name of NAMES) {
    for (const scheme of ['light', 'dark']) for (const inEditor of [false, true]) for (const filled of [true, false]) {
      const tag = `${name} ${scheme} ${inEditor ? 'editor' : 'live'} ${filled ? 'filled' : 'empty'}`;
      const r = await render(name, {scheme, inEditor, filled});
      if (!filled && !inEditor) continue; // checked below: live with nothing set
      for (const w of [375, 1366]) {
        if (scheme === 'dark' && !filled) continue;
        const pg = await ctxs[w].newPage();
        await pg.setContent(page(r)); await pg.waitForTimeout(50);
        const m = await pg.evaluate(() => {
          const out = {scroll: document.scrollingElement.scrollWidth, vw: innerWidth, small: [], h1: document.querySelectorAll('h1').length, headings: [...document.querySelectorAll('h1,h2,h3,h4')].map(h => +h.tagName[1]), text: document.body.innerText.trim().length, low: []};
          for (const el of document.querySelectorAll('a,button,summary,label[for],[tabindex]')) {
            const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
            if (b.height < 43.5 && !el.closest('p,li') ) out.small.push(el.className + ' ' + Math.round(b.height));
            if (b.height < 43.5 && el.closest('p,li')) out.small.push('[inline] ' + el.className + ' ' + Math.round(b.height));
          }
          const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) && !/rgba\([^)]*, 0\)/.test(c)) return {c, img: getComputedStyle(e).backgroundImage !== 'none' || !!e.querySelector(':scope > img')}; } return {c: 'rgb(255, 255, 255)'}; };
          for (const el of document.querySelectorAll('h1,h2,h3,p,li,a,summary,th,td,strong,small,span,label')) {
            if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
            const b = el.getBoundingClientRect(); if (!b.width) continue;
            if (el.closest('.fw-bento__card,.fbg__head-media')) continue; // words over a photo, behind a veil
            const cs = getComputedStyle(el); const bg = bgOf(el); out.low.push([el.tagName + '.' + el.className, cs.color, bg.c, parseFloat(cs.fontSize), +cs.opacity]);
          }
          return out;
        });
        ok(m.scroll <= m.vw, `${tag} @${w}: no sideways scroll (${m.scroll} <= ${m.vw})`);
        ok(m.h1 <= 1, `${tag} @${w}: at most one h1`);
        ok(m.headings.every((h, i, a) => i === 0 || h <= a[i - 1] + 1), `${tag} @${w}: headings in order ${m.headings.join(',')}`);
        ok(m.text > 0 || (!filled && !inEditor), `${tag} @${w}: draws something`);
        if (w === 375) ok(m.small.length === 0, `${tag} @375: 44px targets ${m.small.join(' | ')}`);
        let worst = 99, worstEl = '';
        for (const [el, fg, bg, size, op] of m.low) { if (/rgba\([^)]*, 0\)/.test(fg)) continue; const c = ratio(fg, bg); if (c < worst) { worst = c; worstEl = el + ' ' + fg + ' on ' + bg; } }
        ok(worst >= 4.5, `${tag} @${w}: text contrast ${worst.toFixed(2)} ${worstEl}`);
        if (filled && !inEditor && scheme === 'light') {
          // Keyboard focus shows a ring on every stop.
          let rings = 0, stops = 0, missing = [];
          for (let i = 0; i < 14; i++) {
            await pg.keyboard.press('Tab');
            const f = await pg.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); const lab = e.id ? document.querySelector('label[for="' + e.id + '"]') : null; const lc = lab ? getComputedStyle(lab) : null; return {cls: e.className, ring: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (lc && lc.outlineStyle !== 'none' && parseFloat(lc.outlineWidth) > 0)}; });
            if (!f) break; stops++; if (f.ring) rings++; else missing.push(f.cls);
          }
          ok(rings === stops, `${tag} @${w}: focus ring on ${rings}/${stops} keyboard stops ${missing.join(',')}`);
          if (SHOTS) await pg.screenshot({path: path.join(SHOTS, `${name}-${w}.png`), fullPage: true});
        }
        await pg.close();
      }
    }
    // Live with nothing set: no editor notes reach a visitor.
    const live = await render(name, {filled: false});
    ok(!/sidebar|Choose a product|Add (a|the|your|cards|questions|benefit|comparison)/i.test(live.html.replace(/<[^>]+>/g, ' ')), `${name}: no editor prompt on the live site`);
    // Reduced motion: nothing keeps moving.
    const rm = await browser.newContext({viewport: {width: 1366, height: 900}, reducedMotion: 'reduce'});
    const pg = await rm.newPage(); await pg.setContent(page(await render(name, {}))); await pg.waitForTimeout(100);
    const moving = await pg.evaluate(() => document.getAnimations().filter(a => { const t = a.effect.getTiming(); return t.duration > 1 && (t.iterations === Infinity || a.playState === 'running'); }).map(a => a.animationName || a.transitionProperty));
    ok(moving.length === 0, `${name}: reduced motion stops animation ${moving.join(',')}`);
    await rm.close();
  }
  // Behaviour that matters per section.
  {
    const c = ctxs[1366]; const pg = await c.newPage();
    await pg.setContent(page(await render('dropship_hero', {}))); 
    ok(await pg.locator('.dh__now').innerText() === '130 RON', 'dropship_hero: the chosen product\'s live price draws (was read from product.settings.*, which a product_picker does not have)');
    ok(await pg.locator('.dh__btn').getAttribute('href') === '/products/pants-down-1', 'dropship_hero: button goes to the product page');
    await pg.setContent(page(await render('dropship_hero', {override: {product: product(9, {available: false, tag: 'Sold out'}).settings}})));
    ok(await pg.locator('.dh__btn').count() === 0 && (await pg.locator('.dh__tag').innerText()) === 'Sold out', 'dropship_hero: a product that cannot be bought shows its tag and no button');
    await pg.setContent(page(await render('dropship_hero', {filled: false})));
    ok(await pg.locator('.dh__media').count() === 0, 'dropship_hero: no empty photo box for visitors');
    await pg.setContent(page(await render('category_tabs', {})));
    await pg.locator('label.ct__t--2').click();
    ok(await pg.locator('.ct__p--2').isVisible() && !(await pg.locator('.ct__p--1').isVisible()), 'category_tabs: second tab shows its own products');
    await pg.setContent(page(await render('help_centre_faq', {})));
    await pg.locator('.hc__item >> nth=1 >> summary').click();
    ok(await pg.locator('.hc__item[open]').count() === 1, 'help_centre_faq: one answer open at a time');
    await pg.setContent(page(await render('grouped_questions', {})));
    ok(await pg.locator('h3.gq__topic').count() === 2, 'grouped_questions: topics draw');
    await pg.close();
  }
  await browser.close();
  const pass = results.filter(r => r[0]).length;
  console.log(`${pass}/${results.length} passed`);
  process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
