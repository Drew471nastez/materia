/* Round 6, product page extras: People Also Bought (related-products) and
   the Floating video (shopable-video-sticky), run by
   shopify/assets/live-product-extras.js, plus the section renders the
   product page fetches with ?section_id= (product-bough-together,
   product-grouped, bundle-item, pickup-availability, media-gallery-grid,
   media-gallery-slide, review-product): their markup contract and labels.

   related-products: schema order, theme inheritance (priority on and off),
   colour schemes, custom colours and fonts on and off (live and redraw),
   every non-hidden control live and after a redraw at 375 and 1366 in the
   editor and the storefront, select options distinct, the saved product
   page instance against commit c098384, first paint equal to hydrated
   paint, two instances, redraw re-initialises once, reduced motion, no
   sideways scroll, no errors.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r6-product-extras.cjs */
const fs = require('fs'), path = require('path'), assert = require('assert/strict'), {execSync} = require('child_process');
const {launch, mount, render, schemaOf, schemaProblems, PANTS, OTHER, TALL} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const ASSET = 'live-product-extras.js';
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'}, MONO = {family: 'Courier New', fallback_families: 'monospace'};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const BASE = 'c098384';
const SAVED = JSON.parse(read('templates/product.json')).sections.related_products.settings;
/* Theme settings as saved, with the product card parts on that the section's switches can then turn off. */
const THEME = {...JSON.parse(read('config/settings.json')).shopify, scroll_animation: 'none', show_vendor: true, show_rate: true, show_add_cart: true};
const RATED = p => ({...p, vendor: 'Materia', metafields: {...p.metafields, reviews: {rating: {value: {rating: 4.5, scale_max: 5}}, rating_count: {value: 3}}}});
const CARDS = {enable_custom_products: true, custom_products: [PANTS, OTHER, TALL].map(RATED)};
const G = {product: {...PANTS, id: 'page-product'}};

/* Old file rendered with the fixture's context, for the saved-instance comparison. */
async function renderOld(name, settings, editing, uid, globals, theme = {}) {
  const raw = execSync(`git show ${BASE}:sections/${name}.storelib`, {cwd: path.join(__dirname, '..'), maxBuffer: 1 << 24}).toString();
  const s = JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify;
  const def = Object.fromEntries((s.settings || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
  const section = {id: uid, settings: {...def, ...settings}, blocks: []};
  const e = engine(); e.registerFilter('script_tag', () => ''); e.registerFilter('img_url', v => v?.url || v || '');
  const ctx = {section, settings: {scroll_animation: 'none', animation_duration: 700, ...theme}, request: {design_mode: editing}, shop: {name: 'Materia Themes', currency: 'USD', money_format: '${{amount}}'}, routes: {all_products_collection_url: '/collections/all', cart_add_url: '/cart/add', cart_url: '/cart', root_url: '/', product_recommendations_url: '/recommendations/products'}, ...globals};
  const tpl = raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '');
  return (await e.parseAndRender(tpl, ctx, {globals: ctx})).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<link\b[^>]*>/g, '');
}

/* What a related-products instance looks like: the parts a visitor sees. */
const LOOK = uid => {
  const w = document.getElementById('shopify-section-' + uid), r = w.querySelector('.sec__related-product');
  const cs = (el, ks) => el ? ks.map(k => getComputedStyle(el)[k]) : null;
  const h = r.querySelector('.section__header'), h2 = r.querySelector('.section__header-heading'), d = r.querySelector('.section__header-des'), g = r.querySelector('.products-grid__items, product-recommendations');
  const vis = el => !!el && !!el.getClientRects().length && getComputedStyle(el).display !== 'none';
  const box = el => { if (!el || !vis(el)) return null; const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  return {
    wrap: cs(w, ['marginTop', 'marginBottom']), root: cs(r, ['backgroundColor', 'paddingTop', 'paddingBottom', 'color']), head: vis(h) ? cs(h, ['textAlign', 'paddingLeft']) : null,
    h2: vis(h2) ? [h2.textContent.trim(), ...cs(h2, ['color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'marginBottom'])] : null,
    des: vis(d) ? [d.textContent.trim(), ...cs(d, ['color', 'fontFamily', 'fontSize'])] : null,
    grid: box(g), cards: [...r.querySelectorAll('.product-item')].map(box), h2box: box(h2), dbox: box(d),
  };
};

async function relatedProducts(browser) {
  const name = 'related-products', {schema} = schemaOf(name);
  eq(schemaProblems(name), [], 'related-products schema problems');
  const ids = schema.settings.filter(x => x.id).map(x => x.id);
  const heads = schema.settings.filter(x => x.type === 'header').map(x => x.content);
  eq(heads, ['General', 'Content', 'Layout', 'Products', 'Product card', 'Appearance', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'], 'shared order');
  const old = JSON.parse(execSync(`git show ${BASE}:sections/${name}.storelib`, {cwd: path.join(__dirname, '..')}).toString().split('<schema>')[1].split('</schema>')[0]).shopify;
  for (const x of old.settings.filter(x => x.id)) ok(ids.includes(x.id), 'kept id ' + x.id);
  ok(!JSON.stringify(schema).includes('"t:'), 'no untranslated labels');
  ok(!(schema.presets || []).length, 'page-level section: no preset');
  for (const x of schema.settings.filter(x => /^(heading_color|text_color|background_color)$/.test(x.id))) eq(x.visible_if, '{{ section.settings.enable_custom_style }}', x.id + ' hidden until custom styling');
  for (const x of schema.settings.filter(x => /_font$/.test(x.id))) ok(x.type === 'font_picker' && x.visible_if === '{{ section.settings.enable_custom_fonts }}', x.id + ' native font picker');

  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const tag = ` @${width} ${editing ? 'editor' : 'storefront'}`;
    /* Saved product page instance (hidden on the page, still kept) against the last commit. */
    {
      const t = await mount(browser, name, {width, editing, settings: {...SAVED, ...CARDS}, globals: G, theme: THEME, assets: [ASSET]});
      const now = await t.page.evaluate(LOOK, 'test');
      const oldHtml = await renderOld(name, {...SAVED, ...CARDS}, editing, 'test', G, THEME);
      await t.page.evaluate(html => { document.getElementById('shopify-section-test').innerHTML = html; }, oldHtml);
      await frames(t.page);
      const was = await t.page.evaluate(LOOK, 'test');
      eq(now, was, 'saved People Also Bought looks the same' + tag);
      ok(await t.noOverflow(), 'no sideways scroll' + tag); eq(t.errors, [], 'no errors' + tag);
      await t.page.close();
    }
    /* Theme first, first paint equal to hydrated paint, priority on and off. */
    for (const priority of [true, 'off']) {
      const a = await mount(browser, name, {width, editing, settings: CARDS, globals: G, theme: THEME, assets: [], priority});
      const before = await a.page.evaluate(LOOK, 'test');
      ok(before.root[0] === 'rgb(24, 32, 40)' && before.h2[1] === 'rgb(255, 255, 255)' && /Georgia/.test(before.h2[2]) && before.des[1] === 'rgb(204, 204, 204)' && /Arial/.test(before.des[2]), 'theme colours and fonts' + tag + ' priority ' + priority);
      await a.page.addScriptTag({content: read('shopify/assets/' + ASSET)}); await frames(a.page);
      eq(await a.page.evaluate(LOOK, 'test'), before, 'controller changes nothing on load' + tag);
      eq(await a.page.evaluate(() => [...document.querySelectorAll('[data-rp-root][data-rp-settings]')].flatMap(r => window.MateriaProductExtras.audit(r))), [], 'markup equals derived outputs' + tag);
      await a.page.close();
    }
    for (const custom of [{enable_custom_style: true, heading_color: '#ff0000', text_color: '#00ff00', background_color: '#0000ff', enable_custom_fonts: true, heading_font: FONT, body_font: MONO}]) {
      const a = await mount(browser, name, {width, editing, settings: {...CARDS, ...custom}, globals: G, theme: THEME, assets: []});
      const before = await a.page.evaluate(LOOK, 'test');
      await a.page.addScriptTag({content: read('shopify/assets/' + ASSET)}); await frames(a.page);
      eq(await a.page.evaluate(LOOK, 'test'), before, 'first paint equals hydrated with custom style' + tag);
      ok(before.root[0] === 'rgb(0, 0, 255)' && before.h2[1] === 'rgb(255, 0, 0)' && /Verdana/.test(before.h2[2]) && before.des[1] === 'rgb(0, 255, 0)' && /Courier New/.test(before.des[2]), 'custom colours and fonts win in first paint' + tag);
      await a.page.close();
    }

    const t = await mount(browser, name, {width, editing, settings: CARDS, globals: G, theme: THEME, assets: [ASSET]});
    const look = () => t.page.evaluate(LOOK, 'test');
    const h2 = () => t.page.evaluate(() => { const h = document.querySelector('#shopify-section-test h2'); const s = getComputedStyle(h); return {c: s.color, f: s.fontFamily, own: h.hasAttribute('data-own-font'), em: getComputedStyle(h.querySelector('em') || h).fontFamily}; });
    const base = await look();
    /* Scheme: live and redraw. */
    for (const via of ['live', 'redraw']) {
      if (via === 'live') await t.emit({color_scheme: 'alt-scheme'}); else await t.redraw({settings: {color_scheme: 'alt-scheme'}});
      await frames(t.page);
      const l = await look();
      ok(l.root[0] === 'rgb(250, 250, 250)' && l.h2[1] === 'rgb(16, 16, 16)' && l.des[1] === 'rgb(51, 51, 51)', 'alt scheme ' + via + tag);
      if (via === 'live') await t.emit({color_scheme: 'default-color-scheme'}); else await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      await frames(t.page);
      eq(await look(), base, 'scheme back ' + via + tag);
    }
    /* Custom style and fonts: on wins (element and a descendant), off restores the theme exactly. */
    for (const via of ['live', 'redraw']) {
      const on = {enable_custom_style: true, heading_color: '#ff0000', text_color: '#00ff00', background_color: '#0000ff', enable_custom_fonts: true, heading_font: FONT, body_font: MONO, heading: 'People <em>also</em> bought', description: 'Picked <strong>for</strong> you'};
      if (via === 'live') await t.emit(on); else await t.redraw({settings: on});
      await frames(t.page);
      const l = await look(), h = await h2();
      ok(l.root[0] === 'rgb(0, 0, 255)' && h.c === 'rgb(255, 0, 0)' && l.des[1] === 'rgb(0, 255, 0)', 'custom colours ' + via + tag);
      ok(h.own && /Verdana/.test(h.f) && /Verdana/.test(h.em), 'custom heading font on h2 and its <em> ' + via + tag);
      ok(await t.page.evaluate(() => /Courier New/.test(getComputedStyle(document.querySelector('#shopify-section-test .section__header-des strong')).fontFamily)), 'custom description font on a descendant ' + via + tag);
      const off = {enable_custom_style: false, enable_custom_fonts: false, heading: SAVED_DEF(schema, 'heading'), description: SAVED_DEF(schema, 'description')};
      if (via === 'live') await t.emit(off); else await t.redraw({settings: off});
      await frames(t.page);
      const back = await look();
      eq(back, base, 'custom off restores the theme ' + via + tag);
      ok(!(await h2()).own, 'data-own-font gone ' + via + tag);
      await t.redraw({settings: {heading_color: '', text_color: '', background_color: '', heading_font: SAVED_DEF(schema, 'heading_font'), body_font: SAVED_DEF(schema, 'body_font')}});
    }
    /* Every non-hidden control changes its element, live (where live) and after a redraw. */
    const CTRL = {
      section_width: ['container', 'stretch_width', 'full_width'], reset_spacing: [false],
      heading: ['Picked for you'], description: ['Two more to look at'], header_size: ['small', 'large'], header_alignment: ['center', 'right'],
      items_per_row: [2, 3], column_gap: [0, 50],
      enable_custom_products: [false], custom_products: [[OTHER]], intent: ['complementary'], items_to_show: [2],
      show_badges: [false], show_vendor: [true], show_rating: [false], show_swatches: [false], show_price: [false], show_add_to_cart: [false], show_action: [false],
      enable_custom_style: [true], heading_color: ['#ff0000'], text_color: ['#00ff00'], background_color: ['#0000ff'],
      enable_custom_fonts: [true], heading_font: [FONT], body_font: [MONO],
      reveal: [false], padding_top: [80], padding_bottom: [5], items_per_row_mobile: [1, 1.5, 3],
    };
    /* Structural: the store's recommendations and the cards are drawn by the server. */
    const REDRAW_ONLY = ['enable_custom_products', 'custom_products', 'intent', 'items_to_show', 'show_badges', 'show_vendor', 'show_rating', 'show_swatches', 'show_price', 'show_add_to_cart', 'show_action', 'reveal'];
    const NEEDS = {enable_custom_style: {heading_color: '#ff0000'}, enable_custom_fonts: {heading_font: FONT}, intent: {enable_custom_products: false}, items_to_show: {enable_custom_products: false}, heading_color: {enable_custom_style: true}, text_color: {enable_custom_style: true}, background_color: {enable_custom_style: true}, heading_font: {enable_custom_fonts: true}, body_font: {enable_custom_fonts: true}};
    const snap = () => t.page.evaluate(() => { const w = document.getElementById('shopify-section-test'); const r = w.querySelector('.sec__related-product'); const g = r.querySelector('[data-rp-grid]'); const p = r.querySelector('product-recommendations');
      return {look: null, html: r.querySelector('.section__header').outerHTML.length, cls: r.className + '|' + r.firstElementChild.className + '|' + (g || p).className, style: (g || p).getAttribute('style'), url: p ? p.dataset.url : null, cards: [...r.querySelectorAll('.product-item')].map(c => c.outerHTML.length) }; });
    const reset = keys => t.redraw({settings: {...Object.fromEntries(keys.map(k => [k, SAVED_DEF(schema, k)])), ...CARDS}});
    for (const id of ids) {
      const x = schema.settings.find(y => y.id === id);
      if (x.hidden || id === 'color_scheme') continue;
      ok(CTRL[id], 'control listed: ' + id);
      const pre = NEEDS[id] || {};
      for (const v of CTRL[id]) {
        const ch = {[id]: v}, keys = [id, ...Object.keys(pre)];
        for (const via of REDRAW_ONLY.includes(id) ? ['redraw'] : ['live', 'redraw']) {
          await t.redraw({settings: pre}); await frames(t.page);
          const before = JSON.stringify([await look(), await snap()]);
          if (via === 'live') await t.emit(ch); else await t.redraw({settings: ch});
          await frames(t.page);
          const after = [await look(), await snap()];
          ok(JSON.stringify(after) !== before, `${id}=${JSON.stringify(v).slice(0, 30)} changes the section (${via})${tag}`);
          if (via === 'live') {
            eq(await t.page.evaluate(() => [...document.querySelectorAll('[data-rp-root][data-rp-settings]')].flatMap(r => window.MateriaProductExtras.audit(r))), [], 'live output for ' + id + tag);
            await t.redraw({settings: ch}); await frames(t.page);
            eq(await look(), after[0], `${id} live equals the server's redraw${tag}`);
          }
          await reset(keys); await frames(t.page);
        }
      }
    }
    eq(await look(), base, 'every control back to its default draws the start state' + tag);
    /* Selects: each option different from each other. */
    for (const id of ['section_width', 'header_size', 'header_alignment']) {
      const opts = schema.settings.find(y => y.id === id).options.map(o => o.value), seen = [];
      for (const v of opts) { await t.emit({[id]: v}); await frames(t.page); seen.push(JSON.stringify(await look())); }
      eq(new Set(seen).size, opts.length, id + ' options all distinct' + tag);
      await t.redraw({settings: {[id]: SAVED_DEF(schema, id)}});
    }
    /* Desktop and mobile per row apply at their width only. */
    {
      const cardW = () => t.page.evaluate(() => { const c = document.querySelector('#shopify-section-test .product-item'); return Math.round(c.getBoundingClientRect().width); });
      const w0 = await cardW();
      await t.emit({items_per_row: 2}); await frames(t.page);
      const w1 = await cardW();
      ok(width === 1366 ? w1 > w0 * 1.5 : w1 === w0, 'desktop per row only on desktop' + tag);
      await t.emit({items_per_row: 4, items_per_row_mobile: 1}); await frames(t.page);
      const w2 = await cardW();
      ok(width === 375 ? w2 > w0 * 1.5 : w2 === w0, 'mobile per row only on mobile' + tag);
      await t.emit({items_per_row_mobile: 2}); await frames(t.page);
    }
    ok(await t.noOverflow(), 'no sideways scroll after edits' + tag);
    eq(t.errors, [], 'no errors after edits' + tag);
    await t.page.close();
  }

  /* Automatic mode: skeleton cards until the store answers, no motion under reduced motion. */
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const t = await mount(browser, name, {width: 375, editing: true, globals: G, theme: THEME, assets: [ASSET], reducedMotion});
    const sk = await t.page.evaluate(() => { const s = document.querySelectorAll('#shopify-section-test .related-skeleton__media'); return [s.length, getComputedStyle(s[0]).animationName]; });
    ok(sk[0] === 4 && (reducedMotion === 'reduce' ? sk[1] === 'none' : sk[1] !== 'none'), 'skeleton cards, still under reduced motion: ' + reducedMotion);
    ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test product-recommendations').dataset.url.includes('limit=4&intent=related')), 'recommendation request carries limit and intent');
    eq(t.errors, [], 'no errors ' + reducedMotion);
    await t.page.close();
  }
  /* Two instances stay independent; redraw re-initialises once. */
  {
    const t = await mount(browser, name, {width: 1366, editing: true, globals: G, theme: THEME, assets: [ASSET], instances: [{uid: 'a', settings: CARDS}, {uid: 'b', settings: CARDS}]});
    const b0 = await t.page.evaluate(LOOK, 'b');
    await t.emit({heading: 'Only A', enable_custom_style: true, heading_color: '#ff0000', header_alignment: 'right'}, undefined, 'a'); await frames(t.page);
    const a1 = await t.page.evaluate(LOOK, 'a'), b1 = await t.page.evaluate(LOOK, 'b');
    ok(a1.h2[0] === 'Only A' && a1.h2[1] === 'rgb(255, 0, 0)', 'instance a changed');
    eq(b1, b0, 'instance b untouched');
    const n0 = await t.page.evaluate(() => window.MateriaProductExtras.count());
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a', settings: {heading: 'Redraw ' + i}});
    eq(await t.page.evaluate(() => window.MateriaProductExtras.count()), n0, 'redraws keep one state per root');
    await t.emit({heading: 'After redraw'}, undefined, 'a'); await frames(t.page);
    eq((await t.page.evaluate(LOOK, 'a')).h2[0], 'After redraw', 'live after redraw');
    eq(t.errors, [], 'no errors, two instances');
    await t.page.close();
  }
}
const SAVED_DEF = (schema, id) => { const x = schema.settings.find(y => y.id === id); return x && x.default !== undefined ? x.default : (x.type === 'checkbox' ? false : x.type === 'product_list' ? [] : ''); };

/* ---------- Floating video ---------- */
async function floatingVideo(browser) {
  const name = 'shopable-video-sticky', {schema} = schemaOf(name);
  eq(schemaProblems(name), [], 'floating video schema problems');
  ok(!JSON.stringify(schema).includes('"t:'), 'no untranslated labels');
  ok(!(schema.presets || []).length, 'no preset added (reported to the lead)');
  const POSTER = {url: 'https://theme.test/poster.png', src: 'https://theme.test/poster.png', width: 600, height: 600, aspect_ratio: 1, alt: ''};
  const blocks = [{type: 'video', settings: {product: PANTS, poster_image: POSTER}}];
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const tag = ` @${width} ${editing ? 'editor' : 'storefront'}`;
    const t = await mount(browser, name, {width, height: 700, editing, blocks, assets: ['shopable-video.css', ASSET]});
    await t.page.evaluate(() => { document.body.style.minHeight = '3000px'; });
    const vis = () => t.page.evaluate(() => { const b = document.querySelector('#shopify-section-test .mini-video__video'); const r = b.getBoundingClientRect(); return {on: b.classList.contains('is-visible'), x: Math.round(r.x), bottom: Math.round(innerHeight - r.bottom)}; });
    await t.page.waitForTimeout(500);
    const v0 = await vis();
    ok(editing ? v0.on && v0.x >= 0 : !v0.on && v0.x < 0, 'shown at once in the builder, after scrolling on the storefront' + tag);
    if (!editing) { await t.page.evaluate(() => scrollTo(0, 600)); await t.page.waitForTimeout(600); ok((await vis()).on, 'slides in after 300px' + tag); }
    const v1 = await vis();
    eq([v1.x, v1.bottom], [25, 150], 'default offsets' + tag);
    await t.emit({offset_left: 61, offset_bottom: 40}); await frames(t.page); await t.page.waitForTimeout(500);
    const v2 = await vis();
    eq([v2.x, v2.bottom], [61, 40], 'offsets live' + tag);
    await t.redraw({settings: {offset_left: 61, offset_bottom: 40}}); await t.page.waitForTimeout(500);
    if (!editing) { await t.page.evaluate(() => scrollTo(0, 700)); await t.page.waitForTimeout(600); }
    eq(await vis().then(v => [v.on, v.x, v.bottom]), [true, 61, 40], 'offsets after redraw' + tag);
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test shopable-video-sticky').classList.contains('color-alt-scheme')), 'scheme live' + tag);
    await t.emit({action_close: true}); await frames(t.page);
    eq(await t.page.evaluate(() => document.querySelector('#shopify-section-test shopable-video-sticky').getAttribute('data-action-close')), 'true', 'stay closed live' + tag);
    /* Close: 44px target, keyboard, link names the product. */
    const hit = await t.page.evaluate(() => { const b = document.querySelector('#shopify-section-test .close-mini-video'), r = b.getBoundingClientRect(); const pts = [[r.left - 10, r.top + r.height / 2], [r.right + 10, r.top + r.height / 2], [r.left + r.width / 2, r.bottom + 10]]; return {size: [r.width, r.height], ok: pts.every(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.closest('.close-mini-video') === b; }), type: b.type, label: b.getAttribute('aria-label')}; });
    ok(hit.ok && hit.type === 'button' && hit.label, 'close button: 44px target, a button with a label' + tag);
    eq(await t.page.evaluate(() => document.querySelector('#shopify-section-test .mini-video__product-link').getAttribute('aria-label')), PANTS.title, 'product link label' + tag);
    await t.page.focus('#shopify-section-test .close-mini-video'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(500);
    ok(!(await vis()).on, 'closes from the keyboard' + tag);
    ok(await t.noOverflow(), 'no sideways scroll' + tag);
    eq(t.errors, [], 'no errors' + tag);
    await t.page.close();
  }
  /* Reduced motion: no autoplay, still shown; redraw keeps one element working. */
  {
    const VID = {aspect_ratio: 1, preview_image: POSTER, sources: [{format: 'mp4', url: 'https://theme.test/v.mp4'}]};
    const t = await mount(browser, name, {width: 375, editing: true, blocks: [{type: 'video', settings: {local_video: VID}}], assets: ['shopable-video.css', ASSET], reducedMotion: 'reduce'});
    const st = await t.page.evaluate(() => { const v = document.querySelector('#shopify-section-test video'); const b = document.querySelector('#shopify-section-test .mini-video__video'); return [v.autoplay, v.hasAttribute('autoplay'), b.classList.contains('is-visible'), getComputedStyle(b).transitionDuration]; });
    eq(st, [false, false, true, '0s'], 'reduced motion: no autoplay, no slide, still shown');
    await t.redraw({settings: {offset_left: 30}}); await t.page.waitForTimeout(100);
    ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .mini-video__video').classList.contains('is-visible') && !document.querySelector('#shopify-section-test video').autoplay), 'redraw sets it up again');
    eq(t.errors, [], 'no errors, reduced motion');
    await t.page.close();
  }
  /* Two instances independent. */
  {
    const t = await mount(browser, name, {width: 1366, editing: true, assets: ['shopable-video.css', ASSET], instances: [{uid: 'a', blocks}, {uid: 'b', blocks}]});
    await t.page.waitForTimeout(500);
    await t.emit({offset_left: 99}, undefined, 'a'); await t.page.waitForTimeout(500);
    const xs = await t.page.evaluate(() => ['a', 'b'].map(u => Math.round(document.querySelector('#shopify-section-' + u + ' .mini-video__video').getBoundingClientRect().x)));
    eq(xs, [99, 25], 'edit to one floating video leaves the other');
    eq(t.errors, [], 'no errors, two floating videos');
    await t.page.close();
  }
}

/* ---------- Section renders the product page fetches ---------- */
async function fragments(browser) {
  const num = (p, id) => ({...p, id, variants: p.variants.map((v, i) => ({...v, id: id * 10 + i}))});
  const A = num(PANTS, 101), B = num(OTHER, 102), C = num(TALL, 103);
  const search = {results: [A, B, C], terms: 'id:101 OR id:102 OR id:103', performed: true};
  const THEME = {hidden_price: false, enable_catalog_mode: false, show_add_cart: true, show_quantity_input: true, show_secondary_image: false, product_image_ratio: 'square'};
  const cases = [
    ['product-bough-together', {search, product: A}, ['.bought-together', '.bought-together .product-bought-image-item', '.bought-together .bought-together-checkbox[data-handle]', '.bought-together .product-variant-option', '.bought-together .bought-together-submit', '.bought-together .total-price .price', '.bought-together .saved-price', '#bought-together-form']],
    ['product-grouped', {search, product: A}, ['.product-group', '.product-group .product-group-list .product-variant-option', '.product-group form', '.product-group .product-group-submit', '.product-group .product-group-buy-now', '.product-group .quantity__input-product-group']],
    ['bundle-item', {product: A, request: {design_mode: false, params: {}}}, ['.bundle-image', '.bundle-content', 'bundle-cart-remove-button[data-variant-id]']],
    ['media-gallery-grid', {product: A}, ['a.media-gallery__image[data-media]', 'div.media-gallery__image[data-pane-container]', 'div.media-gallery__image:not([data-pane-container])']],
    ['media-gallery-slide', {product: A}, ['slide-with-thumbs', '.media-main-swiper .swiper-wrapper', '.media-gallery__append .media-thumb-swiper .swiper-wrapper', '.swiper-pagination', 'a.media-gallery__image', 'div.media-gallery__image[data-pane-container]']],
    ['pickup-availability', {product: A, product_variant: {...A.variants[0], product: A, store_availabilities: [{pick_up_enabled: true, available: true, pick_up_time: 'Usually ready in 2 hours', location: {name: 'Main store', address: {address1: '1 Road', city: 'Town', country: 'Country'}}}]}}, ['pickup-availability-preview', 'pickup-availability-preview button', '.pickup-availability-drawer pickup-availability-drawer', '.pickup-availability-drawer close-button', '.pickup-availability-drawer .overlay']],
  ];
  for (const [name, globals, sels] of cases) {
    const settings = {};
    const r = await render(name, {editing: false, uid: name, globals, settings, theme: THEME});
    const oldHtml = await renderOld(name, {}, false, name, globals, THEME);
    const page = await browser.newPage({viewport: {width: 375, height: 800}});
    await page.setContent('<body></body>');
    const count = html => page.evaluate(({html, sels}) => { const d = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html'); return sels.map(s => d.querySelectorAll(s).length); }, {html, sels});
    const now = await count(r.html), was = await count(oldHtml);
    ok(now.every(n => n > 0), name + ' keeps every element its script reads: ' + JSON.stringify(now));
    eq(now, was, name + ' same element counts as before');
    const a11y = await page.evaluate(html => { const d = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
      const named = el => (el.getAttribute('aria-label') || el.textContent || '').trim() || el.querySelector('img[alt]:not([alt=""])') || (el.id && d.querySelector('label[for="' + el.id + '"]'));
      return {unnamed: [...d.querySelectorAll('button, select, input:not([type=hidden]), close-button, a[href]:not([aria-hidden=true])')].filter(el => !named(el)).map(el => el.outerHTML.slice(0, 80)), arial: html.includes('arial-label'), badFor: [...d.querySelectorAll('label[for]')].filter(l => !d.getElementById(l.getAttribute('for'))).length}; }, r.html);
    eq(a11y, {unnamed: [], arial: false, badFor: 0}, name + ' every control has a name');
    await page.close();
  }
  for (const name of ['product-bough-together', 'product-grouped', 'bundle-item']) {
    const {schema} = schemaOf(name);
    eq(schemaProblems(name), [], name + ' schema');
    ok(!(schema.presets || []).length, name + ' no preset');
  }
  const bt = await render('product-bough-together', {editing: false, globals: {search, product: A}, theme: THEME});
  ok(/<h2 class="bought-together-heading/.test(bt.html) && /bought-together-submit[^>]*"\s+data-theme-button="primary" data-sl-button/.test(bt.html.replace(/\n\s*/g, ' ')), 'bought together: h2 and a theme button');
  const pg = await render('product-grouped', {editing: false, globals: {search, product: A}, theme: THEME});
  ok(/product-group-submit[^>]*data-theme-button="primary" data-sl-button/.test(pg.html.replace(/\n\s*/g, ' ')), 'product grouped: theme button');
}

(async () => {
  const browser = await launch();
  try {
    await fragments(browser);
    await floatingVideo(browser);
    await relatedProducts(browser);
    console.log(checks + ' product page extras checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
