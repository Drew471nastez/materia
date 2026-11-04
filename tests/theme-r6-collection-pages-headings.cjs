/* Round 6, Page heading (sections/page-heading.storelib) and Collection banner
   (sections/main-collection-heading.storelib), with the real theme priority
   rules and shopify/assets/live-collection-pages.js.

   1. Schema: every id at c098384 kept, the shared group order, plain labels.
   2. Every visible section and block setting at 375 and 1366: a redraw looks
      different, the same change sent live looks like the redraw, the old
      value restores it.
   3. Theme first: scheme colours and theme fonts; a block's custom font wins
      over the theme's "Use in every section" rule (data-own-font) on the
      element and a paragraph inside; off restores the theme. The description
      colour applies only while its Enable custom styling is on.
   4. First paint equals the hydrated paint; two instances independent.
   5. Every saved instance (templates/*.json) looks as it did at c098384, with
      the description blocks' enable_custom_style on.

   LIQUIDJS=<path to liquidjs> node tests/theme-r6-collection-pages-headings.cjs [page|collection] [sweep|theme|life|saved] */
const L = require('./theme-r6-collection-pages-lib.cjs');
const {ok, eq, frames, settle, counter} = L;
const args = process.argv.slice(2);
const PAGE = {template: 'page', page: {title: 'About us', content: '<p>The page text.</p>'}, page_title: 'About us'};
const COLL = {template: 'collection', collection: {title: 'Pants & Jeans', url: '/collections/pants', description: '<p>Cut and sewn in small runs.</p>', image: null}};
const CASES = {
  page: {name: 'page-heading', globals: PAGE, blocks: [{type: 'breadcrumb', settings: {}}, {type: 'heading', settings: {}}, {type: 'description', settings: {description: '<p>Short <strong>intro</strong></p>'}}]},
  collection: {name: 'main-collection-heading', globals: COLL, blocks: [{type: 'breadcrumb', settings: {}}, {type: 'heading', settings: {}}, {type: 'description', settings: {}}]},
};

const sig = page => page.evaluate(() => {
  const R = document.querySelector('#shopify-section-test [data-lcp]');
  if (!R) return null;
  const cs = (el, p) => el ? Object.fromEntries(p.map(k => [k, getComputedStyle(el)[k]])) : null;
  const h = R.querySelector('.heading-title'), d = R.querySelector('.heading-description'), nav = R.querySelector('nav.bc'), item = nav && nav.querySelectorAll('.bc__item')[1];
  const vis = el => el && getComputedStyle(el).display !== 'none' ? el : null;
  return {
    cls: [...R.classList].sort().join(' '), inner: R.querySelector(':scope > div:not(.overlay-bg)')?.className,
    root: cs(R, ['backgroundColor', 'paddingTop', 'paddingBottom', 'justifyContent', 'aspectRatio']), overlay: R.querySelector('.overlay-bg') && getComputedStyle(R.querySelector('.overlay-bg'), '::after').opacity,
    img: R.querySelector('.overlay-bg img')?.getAttribute('src') || null,
    content: cs(R.querySelector('.heading-content'), ['textAlign']),
    h: h && {t: h.textContent.trim(), cls: h.className.replace(/\s+/g, ' ').trim(), ...cs(h, ['fontSize', 'color', 'fontFamily', 'marginBottom', 'fontWeight'])},
    d: vis(d) && {t: d.textContent.trim(), ...cs(d, ['color', 'fontSize', 'fontFamily']), p: cs(d.querySelector('p'), ['fontFamily', 'color'])},
    bc: nav && {...cs(nav, ['fontSize', 'textTransform', 'fontFamily']), trail: getComputedStyle(nav.querySelector('.bc__trail')).justifyContent, link: getComputedStyle(nav.querySelector('.bc__link')).color, cur: getComputedStyle(nav.querySelector('.bc__current')).color, sep: item && ['content', 'width'].map(k => getComputedStyle(item, '::before')[k])},
  };
});

async function themeFirst(browser, c) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const t = await L.mount(browser, c.name, {width, editing, assets: [L.CTRL], blocks: c.blocks, globals: c.globals});
    const H = '.heading-title', D = '.heading-description', DP = '.heading-description p';
    const read = async () => (await settle(t.page), {bg: await t.css('[data-lcp]', 'backgroundColor'), h: await t.css(H, 'fontFamily'), hc: await t.css(H, 'color'), d: await t.css(D, 'fontFamily'), dp: await t.css(DP, 'fontFamily'), dc: await t.css(D, 'color'), dpc: await t.css(DP, 'color')});
    const theme = await read();
    eq([theme.bg, theme.h, theme.hc, theme.dp, theme.dpc], ['rgb(24, 32, 40)', 'Georgia', 'rgb(255, 255, 255)', 'Arial', 'rgb(204, 204, 204)'], c.name + ' theme first ' + width);
    const hb = t.blockId('heading'), db = t.blockId('description');
    const hOn = {enable_custom_fonts: true, font: L.FONT}, dOn = {enable_custom_fonts: true, font: L.MONO, ...(c.name === 'page-heading' ? {enable_custom_style: true, description_color: '#11ee22'} : {})};
    const want = async label => {
      const r = await read();
      ok(/Verdana/.test(r.h) && /Courier New/.test(r.d) && /Courier New/.test(r.dp), label + ' fonts on the element and the paragraph inside ' + JSON.stringify(r));
      if (c.name === 'page-heading') eq([r.dc, r.dpc], ['rgb(17, 238, 34)', 'rgb(17, 238, 34)'], label + ' description colour');
      eq(await t.page.locator('#shopify-section-test [data-own-font]').count(), 2, label + ' data-own-font on heading and description');
    };
    const back = async label => { eq(await read(), theme, label + ' theme restored'); eq(await t.page.locator('#shopify-section-test [data-own-font]').count(), 0, label + ' attributes gone'); };
    await t.emit(hOn, hb); await t.emit(dOn, db); await frames(t.page); await want('live on ' + width);
    await t.emit({enable_custom_fonts: false}, hb); await t.emit({enable_custom_fonts: false, enable_custom_style: false}, db); await frames(t.page); await back('live off ' + width);
    const blocks = on => c.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(on && b.type === 'heading' ? hOn : {}), ...(on && b.type === 'description' ? dOn : {})}}));
    await t.redraw({blocks: blocks(true)}); await frames(t.page); await want('redraw on ' + width);
    await t.redraw({blocks: blocks(false)}); await frames(t.page); await back('redraw off ' + width);
    if (c.name === 'page-heading') {
      await t.redraw({blocks: c.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(b.type === 'description' ? {description_color: '#ff0000'} : {})}}))}); await frames(t.page);
      eq(await t.css(D, 'color'), 'rgb(204, 204, 204)', 'a description colour waits for Enable custom styling ' + width);
    }
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq([await t.css('[data-lcp]', 'backgroundColor'), await t.css(H, 'color')], ['rgb(250, 250, 250)', 'rgb(16, 16, 16)'], 'scheme live ' + width);
    eq(await t.page.locator('#shopify-section-test h1').count(), 1, 'one h1');
    ok(await t.noOverflow(), 'no sideways scroll ' + width);
    eq(t.errors, [], 'no errors ' + width);
    await t.page.close();
  }
  const t = await L.mount(browser, c.name, {width: 1366, assets: [L.CTRL], blocks: c.blocks, globals: c.globals, priority: 'off'});
  eq(await t.css('.heading-title', 'fontFamily'), 'Georgia', 'priority off');
  await t.page.close();
}

const look = page => page.evaluate(() => {
  const W = document.getElementById('shopify-section-S'), R = W.querySelector('.sec__page-heading');
  if (!R) return {none: W.textContent.trim()};
  const cs = (el, p) => el ? p.map(k => getComputedStyle(el)[k]) : null, r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
  const h = R.querySelector('.heading-title'), d = R.querySelector('.heading-description'), nav = R.querySelector('nav.bc');
  return {root: [...cs(R, ['backgroundColor', 'paddingTop', 'paddingBottom', 'display']), ...r(R)], h: h && [h.textContent.trim(), ...cs(h, ['fontSize', 'color', 'fontFamily', 'fontWeight', 'marginBottom', 'textAlign']), ...r(h)],
    d: d && [d.textContent.trim(), ...cs(d, ['color', 'fontSize', 'fontFamily']), ...r(d)], bc: nav && [nav.textContent.replace(/\s+/g, ' ').trim(), ...cs(nav, ['fontSize', 'textTransform']), ...r(nav), ...[...nav.querySelectorAll('.bc__link, .bc__current')].map(el => getComputedStyle(el).color), ...[...nav.querySelectorAll('.bc__item + .bc__item')].map(el => getComputedStyle(el, '::before').content)]};
});

async function savedAll(browser) {
  const fs = require('fs'), path = require('path');
  for (const f of fs.readdirSync(path.join(L.ROOT, 'templates')).filter(f => f.endsWith('.json'))) {
    const tpl = JSON.parse(L.read('templates/' + f)), kind = f.replace('.json', '');
    for (const [key, sec] of Object.entries(tpl.sections || {})) {
      if (!['page-heading', 'main-collection-heading'].includes(sec.type)) continue;
      const blocks = (sec.block_order || Object.keys(sec.blocks || {})).map(k => sec.blocks[k]).filter(Boolean);
      const globals = sec.type === 'page-heading' ? {template: kind === 'about' || kind === 'faqs' || kind === 'wishlist' || kind === 'contact' ? 'page' : kind, page: {title: 'A page', content: ''}, page_title: 'A page', blog: {title: 'Blog', url: '/blogs/news'}, cart: {item_count: 1, items: [1]}} : COLL;
      await L.saved(browser, sec.type, {inst: {settings: sec.settings, blocks, blockToggles: {description: {enable_custom_style: true}}}, globals, look, label: 'templates/' + f + ' ' + key, ...(sec.type === 'page-heading' ? {ref: '0674ef4'} : {})}); /* page-heading: the builder edit 0674ef4 sized custom headings and text a little smaller on phones on purpose */
    }
  }
}

(async () => {
  const browser = await L.launch();
  const which = args.filter(a => CASES[a]), parts = args.filter(a => !CASES[a]);
  try {
    for (const k of which.length ? which : Object.keys(CASES)) {
      const c = CASES[k];
      if (!parts.length || parts.includes('schema')) L.schemaChecks(c.name, k === 'page' ? ['General', 'Layout', 'Media', 'Desktop spacing'] : ['General', 'Layout', 'Media', 'Desktop spacing']);
      if (!parts.length || parts.includes('theme')) await themeFirst(browser, c);
      if (!parts.length || parts.includes('life')) {
        await L.firstPaint(browser, c.name, {blocks: c.blocks, globals: c.globals, sig});
        await L.firstPaint(browser, c.name, {blocks: c.blocks.map(b => ({type: b.type, settings: {...b.settings, enable_custom_fonts: true, font: L.FONT, enable_custom_style: true, description_color: '#11ee22', header_size: 'medium', enable_heading_color: true, heading_color: '#ee1122', separator: 'dot', uppercase: true}})), settings: {alignment: 'left', padding_top: 12}, globals: c.globals, sig, label: 'custom '});
        await L.twoInstances(browser, c.name, {blocks: c.blocks, globals: c.globals, blockType: 'heading', edit: {page_title: 'Only b', header_size: 'large'}, read: (t, uid) => t.page.evaluate(uid => { const h = document.querySelector('#shopify-section-' + uid + ' .heading-title'); return [h.textContent.trim(), getComputedStyle(h).fontSize]; }, uid)});
      }
      if (!parts.length || parts.includes('sweep')) await L.sweep(browser, c.name, {blocks: c.blocks, globals: c.globals, sig,
        pre: {'heading.heading_color': {block: {enable_heading_color: true}}, 'heading.heading_font_size': {block: {header_size: 'medium'}}, 'heading.font': {block: {enable_custom_fonts: true, font: L.MONO}}, 'heading.enable_custom_fonts': {block: {font: L.MONO}},
          'description.font': {block: {enable_custom_fonts: true, font: L.MONO}}, 'description.enable_custom_fonts': {block: {font: L.MONO}}, 'description.description_color': {block: {enable_custom_style: true}}, height: {background_image: {src: 'https://theme.test/b.png', url: 'https://theme.test/b.png', width: 1600, height: 400, aspect_ratio: 4, alt: ''}}, overlay_opacity: {background_image: {src: 'https://theme.test/b.png', url: 'https://theme.test/b.png', width: 1600, height: 400, aspect_ratio: 4, alt: ''}}},
        structural: new Set(['reset_spacing', 'background_image', 'show_collection_image', 'height', 'description.description']),
        values: {'description.description': ['<p>Edited <em>text</em></p>', '']},
        same: {all: new Set(['heading.enable_heading_color', 'description.enable_custom_style', ...(k === 'collection' ? ['reset_spacing'] : [])])}});
    }
    if (!parts.length || parts.includes('saved')) await savedAll(browser);
  } finally { await browser.close(); }
  console.log(counter.checks + ' page heading and collection banner round 6 checks passed');
})().catch(e => { console.error(e); process.exit(1); });
