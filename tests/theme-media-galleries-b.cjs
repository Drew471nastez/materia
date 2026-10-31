/* Galleries-b Image and video sections: Image 2, Gallery Simple 4,
   Gallery Simple 5 (gallerysimple2) and Gallery Scrolling Logos
   (images-carousel), with shopify/assets/media-live-galleries-b.js.

   For each section at 375 and 1366, editor and storefront:
   schema, theme inheritance, colour scheme switch (live and redraw), custom
   colours/fonts on and off, every visible control through a live edit and a
   redraw, desktop/mobile values, distinct variants, two instances, added
   blocks, redraw without duplicate listeners, no image reload, running
   marquee not restarted, first paint equal to hydrated paint, reduced
   motion, overflow and errors. The marquee also gets its loop geometry
   checked: the copies cover the row, the track moves exactly one group per
   loop, and the frame at the wrap point is pixel identical to the start.

   LIQUIDJS=<path to liquidjs> node tests/theme-media-galleries-b.cjs */
const assert = require('assert/strict');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'media-live-galleries-b.js';
const IMG = {url: 'https://theme.test/photo-a.png', alt: 'Saved alt', width: 1200, height: 800};
const IMG2 = {url: 'https://theme.test/photo-b.png', alt: 'Other alt', width: 800, height: 800};
const BG = 'rgb(24, 32, 40)', ALT_BG = 'rgb(250, 250, 250)';
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++; };

/* ---- measuring ---- */
async function measure(t, p, uid) {
  const sid = uid || t.section.id;
  return t.page.evaluate(({sid, sel, prop, pseudo}) => {
    const wrap = document.getElementById('shopify-section-' + sid);
    const el = sel === 'wrap' ? wrap : sel ? wrap.querySelector(sel) : wrap.querySelector('[data-mgb]');
    if (!el) return '<missing ' + sel + '>';
    if (prop === 'text') return el.textContent.trim();
    if (prop === 'html') return el.innerHTML.trim();
    if (prop === 'visible') return !!(el.offsetWidth || el.offsetHeight) && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
    if (prop === 'tag') return el.tagName;
    if (prop === 'rectW') return Math.round(el.getBoundingClientRect().width);
    if (prop === 'rectH') return Math.round(el.getBoundingClientRect().height);
    if (prop === 'rectY') return Math.round(el.getBoundingClientRect().top + scrollY);
    if (prop === 'count') return wrap.querySelectorAll(sel).length;
    if (prop === 'classes') return el.className;
    if (prop === 'box') return getComputedStyle(el).maxWidth + '/' + getComputedStyle(el).paddingLeft;
    if (prop.startsWith('attr:')) return el.getAttribute(prop.slice(5));
    if (prop.startsWith('var:')) return getComputedStyle(el).getPropertyValue(prop.slice(4)).trim();
    return getComputedStyle(el, pseudo || null)[prop];
  }, {sid, sel: p.sel || '', prop: p.prop, pseudo: p.pseudo});
}
const pick = (exp, width) => exp && typeof exp === 'object' && !(exp instanceof RegExp) && ('m' in exp || 'd' in exp) ? exp[width < 768 ? 'm' : 'd'] : exp;
const match = (got, exp) => exp instanceof RegExp ? exp.test(String(got)) : typeof exp === 'function' ? exp(got) : String(got) === String(exp);

/* Every non-hidden setting id must have a probe. */
function coverage(name, probes, special = []) {
  const {schema} = schemaOf(name);
  const lists = [['', schema.settings], ...(schema.blocks || []).map(b => [b.type, b.settings])];
  for (const [type, list] of lists) for (const x of list) {
    if (!x.id || x.hidden === true || special.includes((type ? type + '.' : '') + x.id)) continue;
    ok(probes.some(p => p.id === x.id && (p.block || '') === type), name + ': no probe for ' + (type ? type + '.' : '') + x.id);
  }
}

/* Each probe: change one setting (plus what it needs), assert the effect, put it back. */
async function runProbes(t, probes, width, via) {
  for (const p of probes) {
    if (via === 'emit' && p.redrawOnly) continue;
    const blockId = p.block ? t.blockId(p.block, p.n || 0) : undefined;
    const cur = t.rendered[0].section, curBlock = blockId && cur.blocks.find(b => b.id === blockId);
    const change = {...(p.with || {}), [p.id]: p.value};
    const restore = Object.fromEntries(Object.keys(change).map(k => [k, (curBlock ? curBlock.settings : cur.settings)[k] ?? '']));
    const sets = async values => {
      if (via === 'emit') return t.emit(values, blockId);
      if (!blockId) return t.redraw({settings: values});
      return t.redraw({blocks: cur.blocks.map(b => ({type: b.type, settings: b.id === blockId ? {...b.settings, ...values} : b.settings}))});
    };
    if (p.prep) await p.prep(t);
    if (p.with && Object.keys(p.with).length) await sets(p.with);
    const base = await measure(t, p);
    await sets(via === 'emit' ? {[p.id]: p.value} : change);
    const got = await measure(t, p), exp = pick(p.expect, width), label = `${t.name} ${width} ${via} ${p.block ? p.block + '.' : ''}${p.id}=${JSON.stringify(p.value)}`;
    if (exp === null) eq(got, base, label + ' should not apply at this width');
    else { ok(match(got, exp), label + ': got ' + got + ', expected ' + exp); ok(!match(base, exp), label + ': default already shows ' + base); }
    await sets(restore);
    if (p.unprep) await p.unprep(t);
  }
}
async function hoverBg(t, sel) {
  const loc = t.root(sel);
  await loc.hover(); await t.page.waitForTimeout(60);
  const v = await loc.evaluate(el => ({bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, opacity: getComputedStyle(el).opacity}));
  await t.page.mouse.move(1, 1); await t.page.waitForTimeout(40);
  return v;
}
async function snapshot(t, sels) {
  return t.page.evaluate(sels => sels.map(sel => { const el = document.querySelector(sel); if (!el) return [sel, null]; const r = el.getBoundingClientRect(), c = getComputedStyle(el); return [sel, (el.closest('.mq__track') ? [Math.round(r.width), Math.round(r.height)] : [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]).join(','), c.backgroundColor, c.color, c.fontFamily, c.fontSize, c.fontWeight, c.paddingTop, c.borderRadius, c.display]; }), sels);
}
async function firstPaint(browser, name, opts, sels, width) {
  const a = await mount(browser, name, {...opts, assets: []}), sa = await snapshot(a, sels); await a.page.close();
  const b = await mount(browser, name, {...opts, assets: [ASSET]}); await b.page.waitForTimeout(80); const sb = await snapshot(b, sels);
  eq(sb, sa, name + ' ' + width + ': first paint differs from hydrated paint');
  eq(b.errors, [], name + ' errors'); await b.page.close();
}
const M = async (browser, name, width, editing, opts = {}) => { const t = await mount(browser, name, {width, editing, assets: [ASSET], ...opts}); t.name = name; await t.page.addStyleTag({content: '.shopify-section{padding-top:7px}'}); return t; };

/* ---- shared section checks ---- */
async function common(t, width, {heading, text, customColors, fonts}) {
  eq(await measure(t, {prop: 'backgroundColor'}), BG, t.name + ' scheme background');
  if (heading) { eq(await measure(t, {sel: heading, prop: 'color'}), 'rgb(255, 255, 255)', t.name + ' heading colour'); ok(/Georgia/.test(await measure(t, {sel: heading, prop: 'fontFamily'})), t.name + ' heading font'); }
  if (text) { eq(await measure(t, {sel: text, prop: 'color'}), 'rgb(204, 204, 204)', t.name + ' text colour'); ok(/Arial/.test(await measure(t, {sel: text, prop: 'fontFamily'})), t.name + ' body font'); }
  await t.emit({color_scheme: 'alt-scheme'});
  eq(await measure(t, {prop: 'backgroundColor'}), ALT_BG, t.name + ' live scheme');
  if (heading) eq(await measure(t, {sel: heading, prop: 'color'}), 'rgb(16, 16, 16)', t.name + ' live scheme heading');
  await t.emit({color_scheme: t.section.settings.color_scheme});
  eq(await measure(t, {prop: 'backgroundColor'}), BG, t.name + ' scheme back');
  await t.redraw({settings: {color_scheme: 'alt-scheme'}});
  eq(await measure(t, {prop: 'backgroundColor'}), ALT_BG, t.name + ' redraw scheme');
  await t.redraw({settings: {color_scheme: t.section.settings.color_scheme}});
  // custom colours on, then off
  await t.emit({enable_custom_style: true, ...Object.fromEntries(customColors.map(c => [c.id, c.value]))});
  for (const c of customColors) eq(await measure(t, c), c.expect, t.name + ' custom ' + c.id);
  await t.emit({enable_custom_style: false});
  for (const c of customColors) eq(await measure(t, c), c.theme, t.name + ' custom off ' + c.id);
  if (fonts) {
    await t.emit({enable_custom_fonts: true, heading_font: {family: 'Verdana'}, body_font: {family: 'Tahoma'}});
    for (const [sel, re] of fonts) ok(re.test(await measure(t, {sel, prop: 'fontFamily'})), t.name + ' custom font ' + sel);
    await t.emit({enable_custom_fonts: false});
    for (const [sel, re] of fonts) ok(!re.test(await measure(t, {sel, prop: 'fontFamily'})), t.name + ' custom font off ' + sel);
    await t.redraw({settings: {enable_custom_fonts: true, heading_font: {family: 'Verdana', fallback_families: 'sans-serif'}, body_font: {family: 'Tahoma', fallback_families: 'sans-serif'}}});
    for (const [sel, re] of fonts) ok(re.test(await measure(t, {sel, prop: 'fontFamily'})), t.name + ' custom font redraw ' + sel);
    await t.redraw({settings: {enable_custom_fonts: false, heading_font: t.section.settings.heading_font, body_font: t.section.settings.body_font}});
  }
  ok(await t.noOverflow(), t.name + ' ' + width + ' overflow');
}
async function noReload(t, sel, unrelated, block) {
  await t.page.evaluate(({sid, sel}) => { window.__img = document.querySelector('#shopify-section-' + sid + ' ' + sel); window.__src = window.__img.getAttribute('src'); }, {sid: t.section.id, sel});
  await t.emit(unrelated, block);
  ok(await t.page.evaluate(({sid, sel}) => document.querySelector('#shopify-section-' + sid + ' ' + sel) === window.__img && window.__img.getAttribute('src') === window.__src, {sid: t.section.id, sel}), t.name + ' image not reloaded');
}
async function twoInstances(browser, name, width, editing, edit, probe, block) {
  const t = await mount(browser, name, {width, editing, assets: [ASSET], instances: [{uid: 'a'}, {uid: 'b'}]}); t.name = name;
  const before = await measure(t, probe, 'b');
  await t.emit(edit, block ? t.blockId(block, 0, 'a') : undefined, 'a');
  ok(!match(await measure(t, probe, 'a'), before), name + ' instance a changed');
  eq(await measure(t, probe, 'b'), before, name + ' instance b unchanged');
  eq(t.errors, [], name + ' two instance errors'); await t.page.close();
}
async function rootsStable(t) {
  for (let i = 0; i < 3; i++) await t.redraw();
  eq(await t.page.evaluate(() => [...window.MateriaGalleriesB.roots.keys()].filter(r => r.isConnected).length + '/' + window.MateriaGalleriesB.roots.size), '1/1', t.name + ' one controller after redraws');
}
const variants = async (t, id, values, probe, width, extra = {}) => {
  const seen = [];
  for (const v of values) { await t.emit({...extra, [id]: v}); seen.push(String(await measure(t, probe))); }
  eq(new Set(seen).size, values.length, t.name + ' ' + width + ' ' + id + ' variants distinct: ' + seen.join(' | '));
  await t.emit({[id]: t.section.settings[id]});
};

/* ================= Image 2 ================= */
function image2Probes() {
  const m = '.img2__media', img = '.img2__media img';
  return [
    {id: 'reset_spacing', value: false, sel: 'wrap', prop: 'paddingTop', expect: '7px'},
    {id: 'image', value: IMG, sel: img, prop: 'attr:src', expect: /photo-a\.png/},
    {id: 'image_alt', value: 'A shelf of books', sel: img, prop: 'attr:alt', expect: 'A shelf of books'},
    {id: 'link', value: '/pages/about', sel: '.img2__media a', prop: 'attr:href', expect: '/pages/about'},
    {id: 'full_bleed', value: true, prop: 'paddingLeft', expect: '0px'},
    {id: 'aspect_w', value: 4, sel: m, prop: 'aspectRatio', expect: '4 / 9'},
    {id: 'aspect_h', value: 3, sel: m, prop: 'aspectRatio', expect: '16 / 3'},
    {id: 'radius', value: 30, sel: m, prop: 'borderTopLeftRadius', expect: '30px'},
    {id: 'fit', value: 'contain', with: {image: IMG}, sel: img, prop: 'objectFit', expect: 'contain'},
    {id: 'focal', value: 'top', with: {image: IMG}, sel: img, prop: 'objectPosition', expect: '50% 0%'},
    {id: 'enable_custom_style', value: true, with: {section_bg: '#abcdef'}, prop: 'backgroundColor', expect: 'rgb(171, 205, 239)'},
    {id: 'section_bg', value: '#abcdef', with: {enable_custom_style: true}, prop: 'backgroundColor', expect: 'rgb(171, 205, 239)'},
    {id: 'padding_top_desktop', value: 100, prop: 'paddingTop', expect: {d: '100px', m: null}},
    {id: 'padding_bottom_desktop', value: 100, prop: 'paddingBottom', expect: {d: '100px', m: null}},
    {id: 'side_padding_desktop', value: 50, prop: 'paddingLeft', expect: {d: '50px', m: null}},
    {id: 'padding_top_mobile', value: 70, prop: 'paddingTop', expect: {m: '70px', d: null}},
    {id: 'padding_bottom_mobile', value: 70, prop: 'paddingBottom', expect: {m: '70px', d: null}},
    {id: 'side_padding_mobile', value: 30, prop: 'paddingLeft', expect: {m: '30px', d: null}},
  ];
}
async function image2(browser) {
  const name = 'image-2', probes = image2Probes();
  eq(schemaProblems(name), [], name + ' schema'); coverage(name, probes, ['color_scheme']);
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    let t = await M(browser, name, width, editing);
    await common(t, width, {customColors: [{id: 'section_bg', value: '#abcdef', prop: 'backgroundColor', expect: 'rgb(171, 205, 239)', theme: BG}]});
    eq(await measure(t, {sel: '.img2__media img', prop: 'attr:alt'}), '', name + ' placeholder alt empty');
    for (const via of ['emit', 'redraw']) await runProbes(t, probes, width, via);
    await variants(t, 'focal', ['top', 'center', 'bottom', 'left', 'right'], {sel: '.img2__media img', prop: 'objectPosition'}, width, {image: IMG});
    await variants(t, 'fit', ['cover', 'contain'], {sel: '.img2__media img', prop: 'objectFit'}, width, {image: IMG});
    await t.emit({image: IMG, link: '/a'}); await noReload(t, '.img2__media img', {padding_top_desktop: 12, padding_top_mobile: 12, radius: 3, link: '/b'});
    await t.emit({link: ''}); ok(await t.root('.img2__media a').count() === 0 && await t.root('.img2__media img').count() === 1, name + ' link removed, image kept');
    await rootsStable(t); ok(await t.noOverflow(), name + ' overflow'); eq(t.errors, [], name + ' errors'); await t.page.close();
    await twoInstances(browser, name, width, editing, {radius: 33}, {sel: '.img2__media', prop: 'borderTopLeftRadius'});
    await firstPaint(browser, name, {width, editing}, ['#shopify-section-test [data-mgb]', '#shopify-section-test .img2__media', '#shopify-section-test .img2__media img'], width);
  }
  t = await M(browser, name, 375, true, {reducedMotion: 'reduce'}); ok(await t.root('.img2__media img').isVisible(), name + ' reduced motion visible'); await t.page.close();
}
let t;

/* ================= Gallery Simple 4 ================= */
function gs4Probes() {
  const H = '.gs4__heading', S = '.gs4__sub', I = '.gs4__inner', HD = '.gs4__header', G = '.gs4__grid', IT = '.gs4__item';
  const d = (v) => ({d: v, m: null}), m = (v) => ({m: v, d: null});
  return [
    {id: 'reset_spacing', value: false, sel: 'wrap', prop: 'paddingTop', expect: '7px'},
    {id: 'section_width_desktop', value: 700, sel: I, prop: 'maxWidth', expect: d('min(100%, 700px)')},
    {id: 'grid_desktop', value: 3, sel: G, prop: 'gridTemplateColumns', expect: d(v => v.split(' ').length === 3)},
    {id: 'image_height', value: 420, sel: IT, prop: 'height', expect: d('420px')},
    {id: 'image_gap', value: 30, sel: G, prop: 'columnGap', expect: '30px'},
    {id: 'heading_sub_gap', value: 55, sel: H, prop: 'marginBottom', expect: '55px'},
    {id: 'sub_section_gap', value: 45, sel: HD, prop: 'marginBottom', expect: '45px'},
    {id: 'enable_custom_style', value: true, with: {section_bg: '#abcdef'}, prop: 'backgroundColor', expect: 'rgb(171, 205, 239)'},
    {id: 'section_bg', value: '#abcdef', with: {enable_custom_style: true}, prop: 'backgroundColor', expect: 'rgb(171, 205, 239)'},
    {id: 'enable_custom_fonts', value: true, with: {heading_font: {family: 'Verdana', fallback_families: 'sans-serif'}}, sel: H, prop: 'fontFamily', expect: /Verdana/},
    {id: 'heading_font', value: {family: 'Verdana', fallback_families: 'sans-serif'}, with: {enable_custom_fonts: true}, sel: H, prop: 'fontFamily', expect: /Verdana/},
    {id: 'body_font', value: {family: 'Tahoma', fallback_families: 'sans-serif'}, with: {enable_custom_fonts: true}, sel: S, prop: 'fontFamily', expect: /Tahoma/},
    ...['top', 'bottom', 'left', 'right'].flatMap(side => [
      {id: 'padding_' + side + '_desktop', value: 64, sel: I, prop: 'padding' + side[0].toUpperCase() + side.slice(1), expect: d('64px')},
      {id: 'padding_' + side + '_mobile', value: 14, sel: I, prop: 'padding' + side[0].toUpperCase() + side.slice(1), expect: m('14px')},
      {id: 'header_padding_' + side + '_desktop', value: 50, sel: HD, prop: 'padding' + side[0].toUpperCase() + side.slice(1), expect: d('50px')},
      {id: 'header_padding_' + side + '_mobile', value: 40, sel: HD, prop: 'padding' + side[0].toUpperCase() + side.slice(1), expect: m('40px')},
    ]),
    {id: 'section_width_mobile', value: 300, sel: I, prop: 'maxWidth', expect: m('min(100%, 300px)')},
    {id: 'grid_mobile', value: 3, sel: G, prop: 'gridTemplateColumns', expect: m(v => v.split(' ').length === 3)},
    {id: 'image_height_mobile', value: 150, sel: IT, prop: 'height', expect: m('150px')},
    {block: 'heading', id: 'text', value: '<strong>Our work</strong>', sel: H, prop: 'html', expect: '<strong>Our work</strong>'},
    {block: 'heading', id: 'enable_custom_style', value: true, with: {color: '#ff0000'}, sel: H, prop: 'color', expect: 'rgb(255, 0, 0)'},
    {block: 'heading', id: 'color', value: '#ff0000', with: {enable_custom_style: true}, sel: H, prop: 'color', expect: 'rgb(255, 0, 0)'},
    {block: 'heading', id: 'font_size_desktop', value: 50, sel: H, prop: 'fontSize', expect: d('50px')},
    {block: 'heading', id: 'font_size_mobile', value: 22, sel: H, prop: 'fontSize', expect: m('22px')},
    {block: 'heading', id: 'font_weight', value: '300', sel: H, prop: 'fontWeight', expect: '300'},
    {block: 'subheading', id: 'text', value: '<p>New <em>prints</em> every week</p>', sel: S, prop: 'html', expect: '<p>New <em>prints</em> every week</p>'},
    {block: 'subheading', id: 'enable_custom_style', value: true, with: {color: '#00ff00'}, sel: S, prop: 'color', expect: 'rgb(0, 255, 0)'},
    {block: 'subheading', id: 'color', value: '#00ff00', with: {enable_custom_style: true}, sel: S, prop: 'color', expect: 'rgb(0, 255, 0)'},
    {block: 'subheading', id: 'font_size_desktop', value: 24, sel: S, prop: 'fontSize', expect: d('24px')},
    {block: 'subheading', id: 'font_size_mobile', value: 12, sel: S, prop: 'fontSize', expect: m('12px')},
    {block: 'subheading', id: 'font_weight', value: '700', sel: S, prop: 'fontWeight', expect: '700'},
    {block: 'gallery_item', id: 'image', value: IMG, sel: IT + ' img', prop: 'attr:src', expect: /photo-a\.png/},
    {block: 'gallery_item', id: 'image_alt', value: 'Blue vase', sel: IT + ' img', prop: 'attr:alt', expect: 'Blue vase'},
    {block: 'gallery_item', id: 'enable_link', value: true, with: {link_url: '/collections/all'}, sel: IT + ' a', prop: 'attr:href', expect: '/collections/all'},
    {block: 'gallery_item', id: 'link_url', value: '/collections/all', with: {enable_link: true}, sel: IT + ' a', prop: 'attr:href', expect: '/collections/all'},
  ];
}
async function gs4(browser) {
  const name = 'gallerysimple4', probes = gs4Probes();
  eq(schemaProblems(name), [], name + ' schema'); coverage(name, probes, ['color_scheme']);
  eq(schemaOf(name).schema.settings.find(x => x.id).id, 'color_scheme', name + ' color_scheme first');
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    t = await M(browser, name, width, editing);
    await common(t, width, {heading: '.gs4__heading', text: '.gs4__sub', customColors: [{id: 'section_bg', value: '#abcdef', prop: 'backgroundColor', expect: 'rgb(171, 205, 239)', theme: BG}], fonts: [['.gs4__heading', /Verdana/], ['.gs4__sub', /Tahoma/]]});
    eq(await measure(t, {sel: '.gs4__heading', prop: 'tag'}), 'H2', name + ' heading h2');
    eq(await measure(t, {sel: '.gs4__sub', prop: 'tag'}), 'DIV', name + ' text in a div');
    await t.emit({enable_custom_style: true, color: '#ff0000'}, t.blockId('heading')); await t.emit({enable_custom_style: false}, t.blockId('heading'));
    eq(await measure(t, {sel: '.gs4__heading', prop: 'color'}), 'rgb(255, 255, 255)', name + ' block custom off restores theme');
    for (const via of ['emit', 'redraw']) await runProbes(t, probes, width, via);
    await t.emit({image: IMG}, t.blockId('gallery_item'));
    await noReload(t, '.gs4__item img', {image_height: 310, image_height_mobile: 210, enable_link: true, link_url: '/x'}, t.blockId('gallery_item'));
    await noReload(t, '.gs4__item img', {image_gap: 9, padding_top_desktop: 20});
    await rootsStable(t); eq(t.errors, [], name + ' errors'); await t.page.close();
    // added block
    t = await M(browser, name, width, editing, {extraBlocks: [{type: 'gallery_item', settings: {image: IMG2}}]});
    eq(await t.root('.gs4__item').count(), 5, name + ' extra block rendered');
    await t.redraw(); await t.emit({image_alt: 'Fifth'}, t.blockId('gallery_item', 4));
    eq(await measure(t, {sel: '.gs4__item:nth-child(5) img', prop: 'attr:alt'}), 'Fifth', name + ' extra block live');
    eq(t.errors, [], name + ' errors'); await t.page.close();
    await twoInstances(browser, name, width, editing, {font_size_desktop: 60, font_size_mobile: 40}, {sel: '.gs4__heading', prop: 'fontSize'}, 'heading');
    await firstPaint(browser, name, {width, editing}, ['#shopify-section-test [data-mgb]', '#shopify-section-test .gs4__inner', '#shopify-section-test .gs4__heading', '#shopify-section-test .gs4__sub', '#shopify-section-test .gs4__item'], width);
  }
}

/* ================= Gallery Simple 5 (gallerysimple2) ================= */
function gs2Probes() {
  const T = '.gs2__tagline', H = '.gs2__heading', B = '.gs2__btn', C = '.gs2__container', IT = '.gs2__item', N = '.gs2__nav';
  const d = (v) => ({d: v, m: null}), m = (v) => ({m: v, d: null}), own = {use_theme_button: false};
  return [
    {id: 'section_width', value: 'container', prop: 'maxWidth', expect: v => v !== 'none'},
    {id: 'reset_spacing', value: false, sel: 'wrap', prop: 'paddingTop', expect: '7px'},
    {id: 'inner_width_px', value: 900, sel: C, prop: 'maxWidth', expect: d('940px')},
    {id: 'desktop_heading_max_width', value: 500, sel: T, prop: 'maxWidth', expect: d('500px')},
    {id: 'image_border_radius', value: 20, sel: IT + ' img', prop: 'borderTopLeftRadius', expect: '20px'},
    {id: 'enable_custom_style', value: true, with: {background_color: '#abcdef'}, prop: 'backgroundColor', expect: 'rgb(171, 205, 239)'},
    {id: 'background_color', value: '#abcdef', with: {enable_custom_style: true}, prop: 'backgroundColor', expect: 'rgb(171, 205, 239)'},
    {id: 'background_gradient', value: 'linear-gradient(90deg, rgb(1, 2, 3), rgb(4, 5, 6))', with: {enable_custom_style: true}, prop: 'backgroundImage', expect: /linear-gradient/},
    {id: 'heading_color', value: '#ff0000', with: {enable_custom_style: true}, sel: H, prop: 'color', expect: 'rgb(255, 0, 0)'},
    {id: 'tagline_text_color', value: '#00ff00', with: {enable_custom_style: true}, sel: T, prop: 'color', expect: 'rgb(0, 255, 0)'},
    {id: 'button_background_color', value: '#0000ff', with: {enable_custom_style: true}, sel: B, prop: 'backgroundColor', expect: 'rgb(0, 0, 255)'},
    {id: 'button_text_color', value: '#ffff00', with: {enable_custom_style: true}, sel: B, prop: 'color', expect: 'rgb(255, 255, 0)'},
    {id: 'button_border_hover_color', value: '#00ffff', with: {enable_custom_style: true}, sel: B, prop: 'var:--mb-hover-border', expect: /#00ffff|rgb\(0, 255, 255\)/},
    {id: 'arrow_icon_color', value: '#ff00ff', with: {enable_custom_style: true}, sel: '.gs2__arrow', prop: 'color', expect: 'rgb(255, 0, 255)'},
    {id: 'enable_custom_fonts', value: true, with: {heading_font: {family: 'Verdana', fallback_families: 'sans-serif'}}, sel: H, prop: 'fontFamily', expect: /Verdana/},
    {id: 'heading_font', value: {family: 'Verdana', fallback_families: 'sans-serif'}, with: {enable_custom_fonts: true}, sel: H, prop: 'fontFamily', expect: /Verdana/},
    {id: 'body_font', value: {family: 'Tahoma', fallback_families: 'sans-serif'}, with: {enable_custom_fonts: true}, sel: T, prop: 'fontFamily', expect: /Tahoma/},
    {id: 'tagline_font_weight', value: '700', sel: T, prop: 'fontWeight', expect: '700'},
    {id: 'desktop_tagline_size', value: 24, sel: T, prop: 'fontSize', expect: d('24px')},
    {id: 'mobile_tagline_size', value: 12, sel: T, prop: 'fontSize', expect: m('12px')},
    {id: 'reveal', value: false, redrawOnly: true, sel: 'wrap', prop: 'classes', expect: v => !/scroll-trigger/.test(v), prep: async t => { await t.redraw(); }},
    {id: 'desktop_top_padding', value: 90, sel: C, prop: 'paddingTop', expect: d('90px')},
    {id: 'desktop_bottom_padding', value: 90, sel: C, prop: 'paddingBottom', expect: d('90px')},
    {id: 'desktop_tagline_padding_bottom', value: 30, sel: T, prop: 'paddingBottom', expect: d('30px')},
    {id: 'section_margin_top_desktop', value: 40, sel: 'wrap', prop: 'marginTop', expect: d('40px')},
    {id: 'section_margin_bottom_desktop', value: 40, sel: 'wrap', prop: 'marginBottom', expect: d('40px')},
    {id: 'image_placement_mobile', value: 'column-reverse', sel: C, prop: 'flexDirection', expect: m('column-reverse')},
    {id: 'mobile_heading_max_width', value: 250, sel: T, prop: 'maxWidth', expect: m('250px')},
    {id: 'carousel_on_mobile', value: false, sel: N, prop: 'display', expect: m('none')},
    {id: 'arrows_gap', value: 60, sel: N, prop: 'columnGap', expect: '60px'},
    {id: 'carousel_bottom_padding', value: 30, sel: N, prop: 'paddingBottom', expect: '30px'},
    {id: 'mobile_image_bottom_padding', value: 40, sel: IT, prop: 'paddingBottom', expect: m('40px')},
    {id: 'mobile_tagline_padding_bottom', value: 26, sel: T, prop: 'paddingBottom', expect: m('26px')},
    {id: 'mobile_top_padding', value: 50, sel: C, prop: 'paddingTop', expect: m('50px')},
    {id: 'mobile_bottom_padding', value: 50, sel: C, prop: 'paddingBottom', expect: m('50px')},
    {id: 'section_margin_top_mobile', value: 16, sel: 'wrap', prop: 'marginTop', expect: m('16px')},
    {id: 'section_margin_bottom_mobile', value: 16, sel: 'wrap', prop: 'marginBottom', expect: m('16px')},
    {id: 'html_id', value: 'Our Gallery', sel: C, prop: 'attr:id', expect: 'our-gallery'},
    {id: 'html_class', value: 'promo, wide', sel: C, prop: 'classes', expect: v => /\bpromo\b/.test(v) && /\bwide\b/.test(v)},
    {block: 'eyebrow', id: 'text', value: 'New <em>rooms</em>', sel: T, prop: 'html', expect: 'New <em>rooms</em>'},
    {block: 'eyebrow', id: 'enable_custom_style', value: true, with: {color: '#ff8800'}, sel: T, prop: 'color', expect: 'rgb(255, 136, 0)'},
    {block: 'eyebrow', id: 'color', value: '#ff8800', with: {enable_custom_style: true}, sel: T, prop: 'color', expect: 'rgb(255, 136, 0)'},
    {block: 'heading', id: 'heading', value: 'Rooms <strong>we love</strong>', sel: H, prop: 'html', expect: 'Rooms <strong>we love</strong>'},
    {block: 'heading', id: 'heading_weight', value: '300', sel: H, prop: 'fontWeight', expect: '300'},
    {block: 'heading', id: 'desktop_heading_size', value: 56, sel: H, prop: 'fontSize', expect: d('56px')},
    {block: 'heading', id: 'mobile_heading_size', value: 24, sel: H, prop: 'fontSize', expect: m('24px')},
    {block: 'heading', id: 'desktop_heading_padding_bottom', value: 40, sel: H, prop: 'paddingBottom', expect: d('40px')},
    {block: 'heading', id: 'mobile_heading_padding_bottom', value: 12, sel: H, prop: 'paddingBottom', expect: m('12px')},
    {block: 'button', id: 'button_text', value: 'See the rooms', sel: B, prop: 'text', expect: 'See the rooms'},
    {block: 'button', id: 'button_link', value: '/pages/rooms', sel: B, prop: 'attr:href', expect: '/pages/rooms'},
    {block: 'button', id: 'button_target', value: '_blank', with: {button_link: '/pages/rooms'}, sel: B, prop: 'attr:target', expect: '_blank'},
    {block: 'button', id: 'use_theme_button', value: false, with: {button_border_radius: 2}, sel: B, prop: 'borderTopLeftRadius', expect: '2px'},
    {block: 'button', id: 'button_hover', value: 'invert', with: own, sel: B, prop: 'attr:data-button-hover', expect: 'reverse'},
    {block: 'button', id: 'button_font_size', value: 22, with: own, sel: B, prop: 'fontSize', expect: d('22px')},
    {block: 'button', id: 'button_font_size_mobile', value: 11, with: own, sel: B, prop: 'fontSize', expect: m('11px')},
    {block: 'button', id: 'button_font_weight', value: '800', with: own, sel: B, prop: 'fontWeight', expect: '800'},
    {block: 'button', id: 'button_border_radius', value: 4, with: own, sel: B, prop: 'borderTopLeftRadius', expect: '4px'},
    {block: 'button', id: 'desktop_button_padding_vertical', value: 20, with: own, sel: B, prop: 'paddingTop', expect: d('20px')},
    {block: 'button', id: 'desktop_button_padding_horizontal', value: 44, with: own, sel: B, prop: 'paddingLeft', expect: d('44px')},
    {block: 'button', id: 'mobile_button_padding_vertical', value: 6, with: own, sel: B, prop: 'paddingTop', expect: m('6px')},
    {block: 'button', id: 'mobile_button_padding_horizontal', value: 16, with: own, sel: B, prop: 'paddingLeft', expect: m('16px')},
    {block: 'gallery_image_02', id: 'image', value: IMG, sel: IT + ' img', prop: 'attr:src', expect: /photo-a\.png/},
    {block: 'gallery_image_02', id: 'image_alt', value: 'Green sofa', sel: IT + ' img', prop: 'attr:alt', expect: 'Green sofa'},
  ];
}
async function gs2(browser) {
  const name = 'gallerysimple2', probes = gs2Probes();
  eq(schemaProblems(name), [], name + ' schema'); coverage(name, probes, ['color_scheme']);
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    t = await M(browser, name, width, editing, {theme: {scroll_animation: 'fade-in'}});
    await common(t, width, {heading: '.gs2__heading', text: '.gs2__tagline', fonts: [['.gs2__heading', /Verdana/], ['.gs2__tagline', /Tahoma/]], customColors: [
      {id: 'background_color', value: '#abcdef', prop: 'backgroundColor', expect: 'rgb(171, 205, 239)', theme: BG},
      {id: 'heading_color', value: '#ff0000', sel: '.gs2__heading', prop: 'color', expect: 'rgb(255, 0, 0)', theme: 'rgb(255, 255, 255)'},
      {id: 'button_background_color', value: '#0000ff', sel: '.gs2__btn', prop: 'backgroundColor', expect: 'rgb(0, 0, 255)', theme: 'rgb(18, 52, 86)'}]});
    eq(await measure(t, {sel: '.gs2__heading', prop: 'tag'}), 'H2', name + ' heading h2');
    // theme button: colours, radius, hover; no link renders a <button>
    eq(await measure(t, {sel: '.gs2__btn', prop: 'tag'}), 'BUTTON', name + ' button without link');
    eq(await measure(t, {sel: '.gs2__btn', prop: 'borderTopLeftRadius'}), '12px', name + ' theme button radius');
    eq((await hoverBg(t, '.gs2__btn')).bg, 'rgb(255, 0, 0)', name + ' theme hover');
    ok(/scroll-trigger/.test(await measure(t, {sel: 'wrap', prop: 'classes'})), name + ' theme scroll animation hook');
    await t.emit({reveal: false}); ok(!/scroll-trigger/.test(await measure(t, {sel: 'wrap', prop: 'classes'})), name + ' reveal off live'); await t.emit({reveal: true});
    // button hover variants (own style): none keeps rest colour, fade dims, invert swaps
    const hv = [];
    for (const v of ['none', 'fade', 'invert']) { await t.emit({use_theme_button: false, button_hover: v}, t.blockId('button')); const h = await hoverBg(t, '.gs2__btn'); hv.push(h.bg + '/' + h.color + '/' + h.opacity); }
    eq(new Set(hv).size, 3, name + ' button hover variants distinct: ' + hv.join(' | '));
    eq(hv[0].split('/')[0], 'rgb(18, 52, 86)', name + ' hover none keeps the rest colour');
    await t.emit({use_theme_button: true, button_hover: 'fade'}, t.blockId('button'));
    await t.emit({button_link: '/pages/a'}, t.blockId('button')); eq(await measure(t, {sel: '.gs2__btn', prop: 'tag'}), 'A', name + ' link makes an <a>');
    await t.emit({button_link: ''}, t.blockId('button'));
    for (const via of ['emit', 'redraw']) await runProbes(t, probes, width, via);
    await variants(t, 'section_width', width >= 1200 ? ['container', 'fluid_container', 'stretch_width', 'full_width'] : ['container', 'fluid_container', 'full_width'], {prop: 'box'}, width);
    if (width < 768) {
      const order = async () => t.page.evaluate(() => { const c = document.querySelector('.gs2__content').getBoundingClientRect().top, s = document.querySelector('.gs2__stage').getBoundingClientRect().top; return c < s ? 'text-first' : 'images-first'; });
      const a = await order(); await t.emit({image_placement_mobile: 'column-reverse'}); const b = await order(); await t.emit({image_placement_mobile: 'column'});
      ok(a === 'text-first' && b === 'images-first', name + ' image placement variants');
      // carousel: next moves one slide, wraps at the end; arrows are 44px; list swipes
      const list = t.root('.gs2__list');
      const box = await t.root('.gs2__arrow').first().boundingBox(); ok(box.width >= 44 && box.height >= 44, name + ' arrow tap target');
      eq(await list.evaluate(el => getComputedStyle(el).scrollSnapType), 'x mandatory', name + ' swipe snapping');
      const w = await list.evaluate(el => el.clientWidth);
      await t.root('[data-mgb-next]').click(); await t.page.waitForTimeout(700);
      eq(Math.round(await list.evaluate(el => el.scrollLeft)), w, name + ' next moves exactly one slide');
      await t.root('[data-mgb-prev]').click(); await t.page.waitForTimeout(700);
      eq(Math.round(await list.evaluate(el => el.scrollLeft)), 0, name + ' prev back');
      await t.root('[data-mgb-prev]').click(); await t.page.waitForTimeout(900);
      ok(await list.evaluate(el => el.scrollLeft >= el.scrollWidth - el.clientWidth - 2), name + ' prev wraps to the end');
      await t.root('[data-mgb-next]').click(); await t.page.waitForTimeout(900);
      eq(Math.round(await list.evaluate(el => el.scrollLeft)), 0, name + ' next wraps to the start');
      await rootsStable(t);
      await t.root('[data-mgb-next]').click(); await t.page.waitForTimeout(700);
      eq(Math.round(await t.root('.gs2__list').evaluate(el => el.scrollLeft)), w, name + ' one click handler after redraws');
    } else {
      const tiles = await t.page.evaluate(() => [...document.querySelectorAll('.gs2__item')].slice(0, 6).map(el => { const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)].join(','); }));
      eq(new Set(tiles).size, 6, name + ' collage tiles placed apart');
      await rootsStable(t);
    }
    await t.emit({image: IMG}, t.blockId('gallery_image_02'));
    await noReload(t, '.gs2__item img', {image_border_radius: 6, desktop_top_padding: 30, tagline_font_weight: '500'});
    await noReload(t, '.gs2__item img', {text: 'Fresh'}, t.blockId('eyebrow'));
    ok(await t.noOverflow(), name + ' overflow'); eq(t.errors, [], name + ' errors'); await t.page.close();
    t = await M(browser, name, width, editing, {extraBlocks: [{type: 'gallery_image_02', settings: {image: IMG2}}]});
    eq(await t.root('.gs2__item').count(), 7, name + ' extra block rendered'); await t.redraw();
    await t.emit({image_alt: 'Seventh'}, t.blockId('gallery_image_02', 6));
    eq(await measure(t, {sel: '.gs2__item:nth-child(7) img', prop: 'attr:alt'}), 'Seventh', name + ' extra block live'); eq(t.errors, [], name + ' errors'); await t.page.close();
    await twoInstances(browser, name, width, editing, {text: 'Only in A'}, {sel: '.gs2__tagline', prop: 'text'}, 'eyebrow');
    await gs2Legacy(browser, width, editing);
    await firstPaint(browser, name, {width, editing}, ['#shopify-section-test [data-mgb]', '#shopify-section-test .gs2__tagline', '#shopify-section-test .gs2__heading', '#shopify-section-test .gs2__btn', '#shopify-section-test .gs2__item', '#shopify-section-test .gs2__item:nth-child(5)', '#shopify-section-test .gs2__nav'], width);
  }
}

/* Eyebrow block order, and the hidden legacy tagline used only when the
   section has no Eyebrow block (saved instances). */
async function gs2Legacy(browser, width, editing) {
  const name = 'gallerysimple2', imgs = Array.from({length: 6}, () => ({type: 'gallery_image_02'}));
  const order = t => t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .gs2__content > *')].map(e => e.dataset.mgbType || (e.hasAttribute('data-mgb-tagline') ? 'legacy' : e.tagName)).join(','));
  // Legacy path: no Eyebrow block; the section tagline renders first and stays live.
  let t = await M(browser, name, width, editing, {blocks: [{type: 'heading'}, {type: 'button'}, ...imgs], settings: {tagline: 'Saved <em>tagline</em>'}});
  eq(await order(t), 'legacy,heading,button', name + ' ' + width + ' legacy tagline first');
  eq(await measure(t, {sel: '[data-mgb-tagline]', prop: 'html'}), 'Saved <em>tagline</em>', name + ' ' + width + ' legacy tagline text');
  eq(await measure(t, {sel: '.gs2__tagline', prop: 'color'}), 'rgb(204, 204, 204)', name + ' ' + width + ' legacy tagline theme colour');
  await t.emit({tagline: 'Live <strong>tagline</strong>'});
  eq(await measure(t, {sel: '[data-mgb-tagline]', prop: 'html'}), 'Live <strong>tagline</strong>', name + ' ' + width + ' legacy tagline live');
  await t.emit({enable_custom_style: true, tagline_text_color: '#00ff00'});
  eq(await measure(t, {sel: '.gs2__tagline', prop: 'color'}), 'rgb(0, 255, 0)', name + ' ' + width + ' legacy tagline custom colour');
  await t.emit({enable_custom_style: false, tagline: ''});
  eq(await measure(t, {sel: '[data-mgb-tagline]', prop: 'visible'}), false, name + ' ' + width + ' empty legacy tagline hides (live)');
  await t.redraw({settings: {tagline: 'Redrawn'}});
  eq(await measure(t, {sel: '[data-mgb-tagline]', prop: 'text'}), 'Redrawn', name + ' ' + width + ' legacy tagline redraw');
  eq(t.errors, [], name + ' legacy errors'); await t.page.close();
  // Blocks path: content blocks in block order; the legacy tagline is not rendered or touched.
  t = await M(browser, name, width, editing, {blocks: [{type: 'heading'}, {type: 'eyebrow', settings: {text: 'Under the heading'}}, ...imgs, {type: 'button'}], settings: {tagline: 'Saved tagline'}});
  eq(await order(t), 'heading,eyebrow,button', name + ' ' + width + ' blocks in block order');
  eq(await t.root('[data-mgb-tagline]').count(), 0, name + ' ' + width + ' no legacy tagline with an Eyebrow block');
  await t.emit({tagline: 'Ignored'});
  eq(await measure(t, {sel: '.gs2__tagline', prop: 'text'}), 'Under the heading', name + ' ' + width + ' legacy edit leaves the Eyebrow block');
  await t.redraw({blocks: [{type: 'button'}, ...imgs, {type: 'eyebrow', settings: {text: 'Under the heading'}}, {type: 'heading'}]});
  eq(await order(t), 'button,eyebrow,heading', name + ' ' + width + ' reordered after redraw');
  await t.redraw({blocks: [{type: 'eyebrow'}, {type: 'button'}, ...imgs]});
  eq(await order(t), 'eyebrow,button', name + ' ' + width + ' removed heading block');
  eq(t.errors, [], name + ' blocks errors'); await t.page.close();
  // The first preset starts with an Eyebrow block.
  t = await M(browser, name, width, editing);
  eq(await order(t), 'eyebrow,heading,button', name + ' ' + width + ' preset order');
  eq(await measure(t, {sel: '.gs2__tagline', prop: 'text'}), 'Latest interior designs', name + ' ' + width + ' preset eyebrow text');
  await t.page.close();
}

/* ================= Gallery Scrolling Logos (images-carousel) ================= */
function mqProbes() {
  const R = '.mq__row', TR = '.mq__track', IT = '.mq__item', d = (v) => ({d: v, m: null}), m = (v) => ({m: v, d: null});
  return [
    {id: 'section_width', value: 'container', sel: '.mq__inner', prop: 'maxWidth', expect: v => v !== 'none'},
    {id: 'reset_spacing', value: false, sel: 'wrap', prop: 'paddingTop', expect: '7px'},
    {id: 'make_images_square', value: true, sel: IT, prop: 'height', expect: {d: '200px', m: '180px'}},
    {id: 'image_width', value: 240, sel: IT, prop: 'width', expect: {d: '240px', m: '216px'}},
    {id: 'image_height', value: 150, sel: IT, prop: 'height', expect: {d: '150px', m: '135px'}},
    {id: 'image_fit', value: 'contain', with: {}, prep: async t => t.emit({image: IMG}, t.blockId('image_block')), unprep: async t => t.emit({image: ''}, t.blockId('image_block')), sel: IT + ' img', prop: 'objectFit', expect: 'contain'},
    {id: 'image_border_radius', value: 24, sel: IT, prop: 'borderTopLeftRadius', expect: '24px'},
    {id: 'slider_scale', value: 1.5, sel: IT, prop: 'width', expect: d('255px')},
    {id: 'direction', value: 'left', sel: TR, prop: 'animationDirection', expect: 'normal'},
    {id: 'speed', value: 40, sel: TR, prop: 'animationDuration', expect: d('40s')},
    {id: 'pause_on_hover', value: false, prop: 'attr:data-pause-hover', expect: 'false'},
    {id: 'show_pause_button', value: false, sel: '.mq__pause', prop: 'display', expect: 'none'},
    {id: 'enable_second_scrolling', value: true, redrawOnly: true, sel: R, prop: 'count', expect: 2},
    {id: 'second_direction', value: 'right', with: {enable_second_scrolling: true}, redrawOnly: true, sel: '.mq__row[data-mq-row="2"] .mq__track', prop: 'animationDirection', expect: 'reverse', prep: async t => t.redraw({settings: {enable_second_scrolling: true}}), unprep: async t => t.redraw({settings: {enable_second_scrolling: false}})},
    {id: 'speed_second_scrolling', value: 12, sel: '.mq__row[data-mq-row="2"] .mq__track', prop: 'animationDuration', expect: '12s', prep: async t => t.redraw({settings: {enable_second_scrolling: true}}), unprep: async t => t.redraw({settings: {enable_second_scrolling: false}})},
    {id: 'scroll_gap', value: 40, sel: '.mq__row[data-mq-row="2"]', prop: 'marginTop', expect: '40px', prep: async t => t.redraw({settings: {enable_second_scrolling: true}}), unprep: async t => t.redraw({settings: {enable_second_scrolling: false}})},
    {id: 'enable_custom_style', value: true, with: {section_bg: '#abcdef'}, prop: 'backgroundColor', expect: 'rgb(171, 205, 239)'},
    {id: 'section_bg', value: '#abcdef', with: {enable_custom_style: true}, prop: 'backgroundColor', expect: 'rgb(171, 205, 239)'},
    {id: 'reveal', value: false, redrawOnly: true, sel: 'wrap', prop: 'classes', expect: v => !/scroll-trigger/.test(v), prep: async t => { await t.redraw(); }},
    {id: 'item_gap', value: 50, sel: '.mq__group', prop: 'columnGap', expect: d('50px')},
    {id: 'padding_top', value: 60, prop: 'paddingTop', expect: '60px'},
    {id: 'padding_bottom', value: 60, prop: 'paddingBottom', expect: '60px'},
    {id: 'section_margin_top_desktop', value: 40, sel: 'wrap', prop: 'marginTop', expect: d('40px')},
    {id: 'section_margin_bottom_desktop', value: 40, sel: 'wrap', prop: 'marginBottom', expect: d('40px')},
    {id: 'overall_size_mobile', value: 0.5, sel: IT, prop: 'width', expect: m('85px')},
    {id: 'speed_mobile', value: 9, sel: TR, prop: 'animationDuration', expect: m('9s')},
    {id: 'item_gap_mobile', value: 30, sel: '.mq__group', prop: 'columnGap', expect: m('30px')},
    {id: 'section_margin_top_mobile', value: 16, sel: 'wrap', prop: 'marginTop', expect: m('16px')},
    {id: 'section_margin_bottom_mobile', value: 16, sel: 'wrap', prop: 'marginBottom', expect: m('16px')},
    {block: 'image_block', id: 'image', value: IMG, sel: IT + ' img', prop: 'attr:src', expect: /photo-a\.png/},
    {block: 'image_block', id: 'image_alt', value: 'Acme', sel: IT + ' img', prop: 'attr:alt', expect: 'Acme'},
  ];
}
/* Loop geometry for every row: groups are equal and evenly spaced, the copies
   cover the row through a whole loop, the track ends one group to the left,
   and the frame at the wrap point is pixel identical to the first frame. */
async function seamless(t, label) {
  const geo = await t.page.evaluate(() => [...document.querySelectorAll('.mq__row')].map(row => {
    const track = row.querySelector('.mq__track'), groups = [...track.children], a = track.getAnimations()[0];
    const w = groups.map(g => g.getBoundingClientRect().width), x = groups.map(g => g.getBoundingClientRect().left);
    const dur = a.effect.getComputedTiming().duration; a.pause(); const keep = a.currentTime;
    a.currentTime = 0; const t0 = new DOMMatrix(getComputedStyle(track).transform).m41;
    a.currentTime = dur * 0.999999; const t1 = new DOMMatrix(getComputedStyle(track).transform).m41;
    a.currentTime = keep; a.play();
    return {k: groups.length, w, steps: x.slice(1).map((v, i) => v - x[i]), track: track.getBoundingClientRect().width, row: row.getBoundingClientRect().width, t0, t1, dir: getComputedStyle(track).animationDirection};
  }));
  for (const g of geo) {
    const G = g.w[0];
    ok(g.w.every(v => Math.abs(v - G) < 0.01), label + ' groups equal width');
    ok(g.steps.every(v => Math.abs(v - G) < 0.01), label + ' groups evenly spaced (no gap at the join)');
    ok(Math.abs(g.track - g.k * G) < 0.5, label + ' track is k groups');
    ok(g.track - G >= g.row - 0.5, label + ' copies cover the row for the whole loop: ' + (g.track - G) + ' >= ' + g.row);
    const start = g.dir === 'reverse' ? -G : 0, end = g.dir === 'reverse' ? 0 : -G;
    ok(Math.abs(g.t0 - start) < 0.5 && Math.abs(g.t1 - end) < 0.5, label + ' moves exactly one group per loop: ' + g.t0 + ' -> ' + g.t1 + ' (G ' + G + ')');
  }
  // pixel check: colour every item by its index in the group, freeze at 0 and at -G
  // (square corners: rounded-corner antialiasing varies with the raster offset, not with the geometry)
  await t.page.addStyleTag({content: '#pixel-test{}.mq__item{border-radius:0!important}.mq__item img{opacity:0}.mq__group>.mq__item:nth-child(6n+1){background:#e33}.mq__group>.mq__item:nth-child(6n+2){background:#3e3}.mq__group>.mq__item:nth-child(6n+3){background:#33e}.mq__group>.mq__item:nth-child(6n+4){background:#ee3}.mq__group>.mq__item:nth-child(6n+5){background:#e3e}.mq__group>.mq__item:nth-child(6n){background:#3ee}'});
  const row = t.root('.mq__row').first(), G = geo[0].w[0];
  const shot = async x => { await t.page.evaluate(x => { const tr = document.querySelector('.mq__track'); tr.style.setProperty('animation', 'none', 'important'); tr.style.setProperty('transform', 'translate3d(' + x + 'px,0,0)', 'important'); }, x); await t.page.waitForTimeout(30); return row.screenshot(); };
  const a = await shot(0), b = await shot(-G), c = await shot(-G / 2);
  ok(Buffer.compare(a, b) === 0, label + ' wrap frame identical to start frame');
  ok(Buffer.compare(a, c) !== 0, label + ' pixel check is sensitive');
  await t.page.evaluate(() => { const tr = document.querySelector('.mq__track'); tr.style.removeProperty('animation'); tr.style.removeProperty('transform'); });
  await t.page.evaluate(() => { for (const st of document.querySelectorAll('style')) if (st.textContent.startsWith('#pixel-test')) st.remove(); });
}
async function marquee(browser) {
  const name = 'images-carousel', probes = mqProbes();
  eq(schemaProblems(name), [], name + ' schema'); coverage(name, probes, ['color_scheme']);
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    t = await M(browser, name, width, editing, {theme: {scroll_animation: 'fade-in'}});
    await common(t, width, {customColors: [{id: 'section_bg', value: '#abcdef', prop: 'backgroundColor', expect: 'rgb(171, 205, 239)', theme: BG}]});
    ok(/scroll-trigger/.test(await measure(t, {sel: 'wrap', prop: 'classes'})), name + ' theme scroll animation hook');
    eq(await measure(t, {sel: '.mq__track', prop: 'animationName'}), 'mgb-mq-test', name + ' marquee runs');
    eq(await measure(t, {sel: '.mq__track', prop: 'animationDirection'}), 'reverse', name + ' default direction right');
    await seamless(t, name + ' ' + width + ' default');
    for (const via of ['emit', 'redraw']) await runProbes(t, probes, width, via);
    await variants(t, 'direction', ['left', 'right'], {sel: '.mq__track', prop: 'animationDirection'}, width);
    await variants(t, 'section_width', width >= 1200 ? ['container', 'fluid_container', 'stretch_width', 'full_width'] : ['container', 'fluid_container', 'full_width'], {sel: '.mq__inner', prop: 'box'}, width);
    await t.emit({image: IMG}, t.blockId('image_block'));
    await variants(t, 'image_fit', ['cover', 'contain'], {sel: '.mq__item img', prop: 'objectFit'}, width);
    // live geometry edits keep the loop seamless and adjust the copies
    const k0 = await t.root('.mq__row .mq__group').count();
    await t.emit({image_width: 100, item_gap: 0, item_gap_mobile: 0, slider_scale: 0.5, overall_size_mobile: 0.5});
    ok(await t.root('.mq__row .mq__group').count() > k0, name + ' more copies for smaller images');
    await seamless(t, name + ' ' + width + ' small live');
    await t.emit({image_width: 170, item_gap: 20, item_gap_mobile: 16, slider_scale: 1, overall_size_mobile: 0.9, direction: 'left'});
    await seamless(t, name + ' ' + width + ' left');
    await t.redraw({settings: {enable_second_scrolling: true, second_direction: 'left'}}); await seamless(t, name + ' ' + width + ' two rows');
    await t.redraw({settings: {enable_second_scrolling: false, direction: 'right'}});
    // the running animation survives unrelated edits (same object, time keeps growing) and a speed edit keeps the phase
    await t.page.evaluate(() => { window.__anim = document.querySelector('.mq__track').getAnimations()[0]; window.__t0 = window.__anim.currentTime; });
    await t.page.waitForTimeout(120);
    await t.emit({padding_top: 44, image_border_radius: 3, enable_custom_style: true, section_bg: '#222222', show_pause_button: true});
    await t.emit({image_alt: 'Brand'}, t.blockId('image_block'));
    ok(await t.page.evaluate(() => { const a = document.querySelector('.mq__track').getAnimations()[0]; return a === window.__anim && a.currentTime > window.__t0 && a.playState === 'running'; }), name + ' marquee not restarted by unrelated edits');
    const phase = () => t.page.evaluate(() => { const a = document.querySelector('.mq__track').getAnimations()[0], d = a.effect.getComputedTiming().duration; return (a.currentTime % d) / d; });
    const p0 = await phase(); await t.emit({speed: 100, speed_mobile: 13}); const p1 = await phase();
    ok(Math.abs(p1 - p0) < 0.02, name + ' speed change keeps the loop position: ' + p0.toFixed(3) + ' -> ' + p1.toFixed(3));
    ok(await t.page.evaluate(() => document.querySelector('.mq__track').getAnimations()[0] === window.__anim), name + ' speed change does not restart');
    await noReload(t, '.mq__item img', {padding_bottom: 20, speed: 90, direction: 'left'});
    // pause on hover, pause button, off screen, hidden tab
    const state = () => measure(t, {sel: '.mq__track', prop: 'animationPlayState'});
    await t.emit({pause_on_hover: true}); await t.root('.mq__row').hover(); await t.page.waitForTimeout(40); eq(await state(), 'paused', name + ' pause on hover');
    await t.page.mouse.move(1, 1); await t.page.waitForTimeout(40); eq(await state(), 'running', name + ' resumes after hover');
    await t.emit({pause_on_hover: false}); await t.root('.mq__row').hover(); await t.page.waitForTimeout(40); eq(await state(), 'running', name + ' hover pause off'); await t.page.mouse.move(1, 1);
    const pb = t.root('.mq__pause'), pbox = await pb.boundingBox(); ok(pbox.width >= 44 && pbox.height >= 44, name + ' pause button target');
    await pb.click(); await t.page.waitForTimeout(40); eq(await state(), 'paused', name + ' pause button'); eq(await pb.getAttribute('aria-pressed'), 'true', name + ' pause pressed');
    await pb.click(); await t.page.waitForTimeout(40); eq(await state(), 'running', name + ' play button');
    await t.page.evaluate(() => { const s = document.createElement('div'); s.id = 'spacer'; s.style.height = '3000px'; document.body.append(s); scrollTo(0, 2500); });
    await t.page.waitForTimeout(250); eq(await state(), 'paused', name + ' off screen pauses');
    await t.page.evaluate(() => scrollTo(0, 0)); await t.page.waitForTimeout(250); eq(await state(), 'running', name + ' back on screen');
    await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); }); await t.page.waitForTimeout(60);
    eq(await state(), 'paused', name + ' hidden tab pauses');
    await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange')); }); await t.page.waitForTimeout(60);
    eq(await state(), 'running', name + ' visible tab resumes');
    await rootsStable(t);
    await t.root('.mq__pause').click(); await t.page.waitForTimeout(40); eq(await state(), 'paused', name + ' one pause handler after redraws');
    ok(await t.noOverflow(), name + ' overflow'); eq(t.errors, [], name + ' errors'); await t.page.close();
    // added block renders in every copy and is live
    t = await M(browser, name, width, editing, {extraBlocks: [{type: 'image_block', settings: {image: IMG2}}]});
    await t.redraw(); const id7 = t.blockId('image_block', 6);
    const copies = await t.root('.mq__group').count(); eq(await t.root(`[data-mgb-block="${id7}"]`).count(), copies, name + ' extra block in every copy');
    await t.emit({image: IMG}, id7); ok((await t.page.evaluate(id => [...document.querySelectorAll(`[data-mgb-block="${id}"] img`)].every(i => /photo-a/.test(i.src)), id7)), name + ' extra block live in every copy');
    await seamless(t, name + ' ' + width + ' seven'); eq(t.errors, [], name + ' errors'); await t.page.close();
    await twoInstances(browser, name, width, editing, {image_border_radius: 30}, {sel: '.mq__item', prop: 'borderTopLeftRadius'});
    await firstPaint(browser, name, {width, editing}, ['#shopify-section-test [data-mgb]', '#shopify-section-test .mq__row', '#shopify-section-test .mq__group', '#shopify-section-test .mq__item', '#shopify-section-test .mq__pause'], width);
    // reduced motion: no movement, copies gone, every logo visible in the section
    t = await M(browser, name, width, editing, {reducedMotion: 'reduce'});
    eq(await measure(t, {sel: '.mq__track', prop: 'animationName'}), 'none', name + ' reduced motion stops');
    eq(await t.page.evaluate(() => [...document.querySelectorAll('[data-mq-clone]')].filter(g => g.offsetWidth).length), 0, name + ' reduced motion hides copies');
    ok(await t.page.evaluate(() => { const r = document.querySelector('[data-mgb]').getBoundingClientRect(); return [...document.querySelectorAll('.mq__group:not([data-mq-clone]) .mq__item')].every(i => { const b = i.getBoundingClientRect(); return b.width > 0 && b.left >= r.left - 0.5 && b.right <= r.right + 0.5; }); }), name + ' reduced motion shows every logo');
    eq(await measure(t, {sel: '.mq__pause', prop: 'display'}), 'none', name + ' no pause button when nothing moves');
    ok(await t.noOverflow(), name + ' reduced overflow'); eq(t.errors, [], name + ' errors');
    await t.page.screenshot({path: require('path').join(process.env.SHOTS || require('os').tmpdir(), `mq-reduced-${width}.png`)}); await t.page.close();
  }
}

(async () => {
  const browser = await launch();
  const only = process.argv[2];
  try {
    for (const [n, f] of [['image-2', image2], ['gallerysimple4', gs4], ['gallerysimple2', gs2], ['images-carousel', marquee]]) if (!only || only === n) { const c0 = checks; await f(browser); console.log('  ' + n + ': ' + (checks - c0) + ' checks'); }
    console.log(checks + ' galleries-b checks passed (Image 2, Gallery Simple 4, Gallery Simple 5, Gallery Scrolling Logos at 375 and 1366, editor and storefront)');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
