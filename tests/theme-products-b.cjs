/* Products sections, group products-b: Products Listing, Products carousel,
   Product Showcase and Product Spotlight Hero (featured-product2), with their
   live controller shopify/assets/live-products-b.js.

   Schema, theme inheritance, every control (live and after a server redraw, at
   375 and 1366), first paint, colour schemes, custom styling and fonts, two
   instances, added blocks and redraws, pictures kept, product data (prices,
   compare-at, sold out, add to cart), the theme's product cards, the Showcase
   slider and the carousel's auto-rotation (keyboard, swipe, off screen,
   reduced motion), legacy section-setting headers, and the saved
   product_showcase_yGRpEr instance against the section before this change.

   LIQUIDJS=<path to liquidjs> node tests/theme-products-b.cjs [section ...] */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process'), assert = require('assert/strict');
const {launch, mount, render, schemaOf, schemaProblems, THEME_VARS, PANTS, OTHER, TALL} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const ASSET = 'live-products-b.js';
const SLIDER = ['swiper-bundle.min.css', 'pagination-styles.css', 'motion.min.js', 'swiper-bundle.min.js', 'global.js'];
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const VID = {sources: [{format: 'mp4', url: 'https://theme.test/up.mp4', mime_type: 'video/mp4'}], preview_image: {src: 'https://theme.test/poster.png'}};
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
const clone = o => JSON.parse(JSON.stringify(o));
const SOLD = {...clone(PANTS), id: 'sold-id', handle: 'sold', title: 'Sold Item', url: '/products/sold', available: false, compare_at_price: 0, variants: PANTS.variants.map(v => ({...v, available: false}))};
SOLD.selected_or_first_available_variant = SOLD.variants[0];
const RATED = {...clone(PANTS), rating: 4.5, review_count: 12};
const COLLECTION = {title: 'Summer', handle: 'summer', url: '/collections/summer', products: [RATED, OTHER, TALL], products_count: 3};
/* Theme settings as a store has them: the schema's defaults, then config/settings.json. */
const THEME = (() => { const d = {}; for (const g of JSON.parse(fs.readFileSync(path.join(__dirname, '../shopify/config/settings_schema.json'), 'utf8'))) for (const x of g.settings || []) if (x.id && x.default !== undefined) d[x.id] = x.default; const t = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/settings.json'), 'utf8')).shopify; delete t.color_schemes; delete d.color_schemes; return {...d, ...t, scroll_animation: 'none'}; })();
let checks = 0, savedCompared = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);

/* Per section: base settings and blocks (every block type present), which controls only show at one width,
   prerequisites, values to try, and controls that wait for the builder's redraw (no live check). */
const bottom = blocks => blocks.map(b => b.type === 'view_all' ? {...b, settings: {...b.settings, position: 'bottom'}} : b);
const CFG = {
  'products-listing': {
    root: '.pl', heading: '.pb-heading', text: '.pb-sub', button: '.pl-btn',
    settings: () => ({collection: COLLECTION}),
    blocks: () => [...presetBlocks('products-listing'), {type: 'button', settings: {text: 'Second', position: 'header'}}],
    desk: ['items_per_row'], mob: ['items_per_row_mobile'], wide: ['section_width'],
    structural: ['collection', 'show_badges', 'show_vendor', 'show_rating', 'show_short_description', 'show_swatches', 'show_price', 'show_add_to_cart', 'show_action', 'reveal', 'reset_spacing'],
    vals: {items_to_show: [2], collection: [{...COLLECTION, url: '/collections/other', products: [OTHER], products_count: 1}]},
    theme: {reveal: {scroll_animation: 'fade_up'}, show_vendor: {show_vendor: true}, show_rating: {show_rate: true}, show_short_description: {show_short_description: true}},
  },
  'products-carousel': {
    root: '.pc', heading: '.pb-heading', text: '.pb-sub', button: '.pc__view-all',
    settings: () => ({collection: COLLECTION}),
    blocks: () => [{type: 'eyebrow'}, ...presetBlocks('products-carousel')],
    wide: ['section_width'],
    desk: [], large: ['show_banner', 'banner_type', 'banner_image', 'local_video', 'video_url', 'video_autoplay', 'banner_link', 'banner_width', 'position', 'sticky_banner'], /* the banner shows from 1025px */
    mob: [],
    structural: ['collection', 'items_to_show', 'items_per_row', 'column_gap', 'show_banner', 'banner_type', 'banner_image', 'local_video', 'video_url', 'video_autoplay', 'show_arrow', 'carousel_pagination', 'pagination_style', 'infinite', 'autoplay', 'autorotate_speed', 'reveal', 'items_per_row_mobile', 'reset_spacing'],
    any: ['items_per_row', 'items_per_row_mobile'],
    pre: {banner_type: {local_video: VID, banner_image: IMG}, video_autoplay: {local_video: VID}, gap_products_to_button: {carousel_pagination: 'disable'}, gap_pagination_to_button: {carousel_pagination: 'show_dots'}, gap_products_to_pagination: {carousel_pagination: 'show_dots'}, pagination_style: {carousel_pagination: 'show_dots'}, pagination_position: {carousel_pagination: 'show_dots'}},
    preBlocks: {gap_products_to_button: bottom, gap_pagination_to_button: bottom},
    vals: {collection: [{...COLLECTION, url: '/collections/other', products: [OTHER], products_count: 1}], video_url: [{type: 'youtube', id: 'abc123'}], local_video: [VID], items_to_show: [2]},
  },
  'product-showcase': {
    root: '.ps-section', heading: '.ps-heading', text: '.ps-desc', button: '.ps-btn',
    settings: () => ({}),
    blocks: () => presetBlocks('product-showcase').map((b, i) => i ? b : {...b, settings: {...b.settings, star_rating: 4, reviews_text: '40 reviews'}}),
    desk: ['left_vertical_align', 'padding_top', 'padding_bottom'], mob: [],
    structural: ['product'],
    pre: {reviews_link: {reviews_text: '40 reviews'}},
    vals: {product: [PANTS], image_max_height: [200]},
    preBlocks: {image_max_height: b => b.map(x => ({...x, settings: {...x.settings, image: IMG}}))},
    wide: ['section_width', 'content_max_width'],
  },
  'featured-product2': {
    root: '.psh-root', heading: '.psh__heading', text: '.psh__sub', button: '.psh__cta',
    settings: () => ({product: PANTS}),
    blocks: () => [...presetBlocks('featured-product2'), {type: 'subheading'}].map(b => b.type === 'rating' ? {...b, settings: {show: true, rating: '4.5', reviews_count: '12'}} : b.type === 'buttons' ? {...b, settings: {primary_label: 'Shop now', secondary_label: 'Details'}} : b),
    desk: ['image_position', 'image_width_pct', 'column_valign'], mob: [], any: ['enable_sticky_content_on_desktop'],
    structural: ['product', 'enable_sticky_content_on_desktop', 'use_product_description', 'truncate_chars', 'primary_action', 'reset_spacing'],
    pre: {placeholder_url: {}},
    vals: {truncate_chars: [60], product: [OTHER], primary_action: ['add_to_cart']},
    wide: ['section_width'],
  },
};
const COMMON_PRE = {enable_custom_fonts: {heading_font: FONT, body_font: FONT}, heading_font: {heading_font: {family: 'Courier New'}, body_font: {family: 'Courier New'}}, body_font: {heading_font: {family: 'Courier New'}, body_font: {family: 'Courier New'}}};

function valuesFor(x, cur = x.default) {
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return [/alt$/.test(x.id) ? 'Described image' : x.id === 'rating' ? '3.5' : 'Edited text'];
    case 'textarea': return ['Edited longer text'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <strong>copy</strong></p>'];
    case 'url': return ['/pages/test'];
    case 'image_picker': return [IMG];
    case 'font_picker': return [FONT];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
function prereq(x, list, base) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true)))?/g)) {
    const [, id, op, str, lit] = m, want = str ?? (lit === undefined ? true : lit === 'true');
    if (!op) out[id] = true;
    else if (op === '==') out[id] = want;
    else if (base[id] === want) { const s = list.find(y => y.id === id); out[id] = s.options.map(o => o.value).filter(v => v !== want).pop(); }
  }
  if (x.id === 'enable_custom_style') for (const y of list) if (y.type === 'color') out[y.id] = '#13579b';
  return out;
}

async function addFp(page) {
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'backgroundImage', 'fontSize', 'fontFamily', 'fontWeight', 'textTransform', 'textAlign', 'letterSpacing', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap', 'flexDirection', 'order', 'alignItems', 'alignSelf', 'justifyContent', 'borderTopLeftRadius', 'aspectRatio', 'opacity', 'display', 'gridTemplateColumns', 'position', 'borderTopWidth', 'borderTopColor', 'width', 'height', 'maxWidth', 'maxHeight', 'stroke'];
    const SKIP = /^(style|data-pb-settings|data-pb-defaults|data-pb-block-defaults|data-pb-ready|data-pb-running|data-pb-paused|class|srcset|sizes|loading|fetchpriority|decoding|src|width|height|id|aria-describedby|data-swiper.*)$/;
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-pb-root]'), out = {}, seen = {};
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.closest('template,[hidden]') || e.ownerSVGElement || /^(SCRIPT|STYLE|TEMPLATE)$/.test(e.tagName)) continue;
        const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
        let k = (e.dataset && e.dataset.pbBlock && !e.parentElement.closest('[data-pb-block="' + e.dataset.pbBlock + '"]') ? e.dataset.pbBlock : e.tagName + '.' + (cls.split(' ')[0] || ''));
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const p of P) o[p] = cs[p];
        o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
        for (const v of ['--mb-hover-bg', '--mb-hover-text', '--mb-hover-border']) o[v] = cs.getPropertyValue(v).trim();
        if (!e.children.length || /^(H\d|P|A|BUTTON|SPAN|LI)$/.test(e.tagName)) o.text = e.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
        o.tag = e.tagName;
        o.cls = cls.split(/\s+/).filter(c => c && !/^swiper-(slide-|pagination-bullet)|^is-entering$/.test(c)).sort().join(' ');
        o.attrs = [...e.attributes].filter(a => !SKIP.test(a.name)).map(a => a.name + '=' + a.value).sort().join('|');
        if (e.tagName === 'IMG' || e.tagName === 'VIDEO' || e.tagName === 'IFRAME') o.src = (e.getAttribute('src') || '').split('?')[0];
        const svg = e.querySelector(':scope > svg'); if (svg) o.svg = svg.innerHTML.length + ':' + svg.innerHTML.slice(0, 60);
        const a = getComputedStyle(e, '::after'); if (a.content !== 'none') o.after = [a.content, a.width, a.backgroundColor].join();
        o.blk = e.closest('[data-pb-block]')?.dataset.pbBlock || '';
        out[k] = o;
      }
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, blk: ''};
      return out;
    };
  });
}
const fp = async (t, uid = 'test') => { await t.page.evaluate(u => Promise.all([...document.querySelectorAll('#shopify-section-' + u + ' img')].map(i => { i.loading = 'eager'; return i.decode().catch(() => {}); })), uid); return t.page.evaluate(u => window.__fp(u), uid); };
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaProductsB.audit(document.querySelector('#shopify-section-' + u + ' [data-pb-root]')), uid);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
/* The test picture as a real 800x600 image, so a picture drawn live and one drawn by the server size the same. */
const realPictures = page => page.route('**/pic.png*', r => r.fulfill({body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#888"/></svg>', contentType: 'image/svg+xml'}));
const SPACING = '.shopify-section{padding-top:7px;padding-bottom:7px} *,*::before,*::after{transition:none!important}'; /* end states: no colour transitions mid-measure */
const bpOf = name => ({'products-listing': 768, 'products-carousel': 768, 'product-showcase': 750, 'featured-product2': 760})[name];

/* Every non-hidden control: change it live, then redraw with it; check the right element changes, the live
   result equals the server result (unless it waits for the redraw), the markup equals what the controller
   derives, and desktop/mobile controls change only at their own width. Select options must look different. */
async function everyControl(browser, name, width) {
  const cfg = CFG[name], {schema} = schemaOf(name);
  const t = await mount(browser, name, {width, editing: true, settings: cfg.settings(), blocks: cfg.blocks(), assets: [ASSET], theme: THEME});
  await t.page.addStyleTag({content: SPACING}); await addFp(t.page); await realPictures(t.page);
  const base = {...clone(t.section.settings), ...cfg.settings()};
  for (const x of schema.settings) if (x.id && !(x.id in base)) base[x.id] = '';
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header') cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks || []) {
    const i = baseBlocks.findIndex(b => b.type === bt.type);
    for (const x of bt.settings || []) if (x.id && !x.hidden && x.type !== 'header' && x.visible_if !== '{{ false }}') { assert.ok(i >= 0, name + ': no base block ' + bt.type); cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  }
  const covered = new Set(), bp = bpOf(name);
  for (const c of cases) {
    const {x} = c, wide = (cfg.wide || []).includes(x.id) && c.scope < 0;
    if (wide && width !== 1366) continue;
    if ((cfg.large || []).includes(x.id) && c.scope < 0 && width < 1025) continue;
    if (wide) await t.page.setViewportSize({width: 1700, height: 900});
    let blocks0 = clone(baseBlocks), S = {...base, ...(c.scope < 0 ? COMMON_PRE[x.id] || {} : {})};
    if (c.scope < 0 && cfg.preBlocks?.[x.id]) blocks0 = cfg.preBlocks[x.id](blocks0);
    const bi = c.scope;
    const bBase = bi >= 0 ? blocks0[bi].settings : S;
    const pre = {...prereq(x, c.list, bBase), ...(c.scope < 0 ? cfg.pre?.[x.id] || {} : cfg.preBlock?.[x.id] || {})};
    if (bi >= 0) Object.assign(blocks0[bi].settings, pre); else Object.assign(S, pre);
    const blockId = bi >= 0 ? 'test-b' + bi : undefined;
    const theme = cfg.theme?.[x.id];
    const key = (c.btype ? c.btype + '.' : '') + x.id;
    const isDesk = (c.scope < 0 && cfg.desk.includes(x.id)) || /_desktop$/.test(x.id), isMob = (c.scope < 0 && cfg.mob.includes(x.id)) || /_mobile$/.test(x.id);
    const any = (cfg.any || []).includes(x.id);
    const shows = any || (!(isDesk && width < bp) && !(isMob && width >= bp));
    const structural = cfg.structural.includes(x.id) || x.type === 'product' || x.type === 'collection';
    const redraw = async (settings, blocks) => { if (theme) { const r = await render(name, {editing: true, uid: 'test', settings, blocks, theme: {...THEME, ...theme}}); await t.page.evaluate(h => { const w = document.getElementById('shopify-section-test'); w.innerHTML = h; w.dispatchEvent(new CustomEvent('storelib:section-load', {bubbles: true, detail: {sectionId: 'test'}})); }, r.html); await t.page.waitForTimeout(120); } else await t.redraw({settings, blocks}); };
    await redraw(S, blocks0);
    const fp0 = await fp(t);
    eq(await audit(t), [], name + ' ' + key + ' base markup matches controller');
    const cur = bi >= 0 ? blocks0[bi].settings[x.id] : S[x.id];
    const seen = [[JSON.stringify(cur ?? null), fp0]];
    for (const v of (cfg.vals?.[x.id] || valuesFor(x, cur))) {
      const tag = name + ' @' + width + ' ' + key + '=' + JSON.stringify(v).slice(0, 40);
      await redraw(S, blocks0);
      if (!structural) await t.emit({[x.id]: v}, blockId);
      const fpL = await fp(t);
      const blocks1 = clone(blocks0); if (bi >= 0) blocks1[bi].settings[x.id] = v;
      await redraw(bi >= 0 ? S : {...S, [x.id]: v}, blocks1);
      const fpR = await fp(t);
      eq(await audit(t), [], tag + ': markup matches controller');
      const dR = diff(fp0, fpR), dL = diff(fp0, fpL);
      if (shows) {
        ok(dR.length > 0, tag + ': redraw changes nothing');
        if (bi >= 0) ok(dR.some(k => fpR[k]?.blk === blockId || fp0[k]?.blk === blockId), tag + ': does not change its own block (' + dR.slice(0, 4) + ')');
        if (bi < 0 && /^section_margin/.test(x.id)) ok(dR.includes('wrap'), tag + ': margin not on the section');
        if (!structural) {
          const d = diff(fpL, fpR);
          eq(d.map(k => k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(fpL[k] || {}).filter(([p, val]) => JSON.stringify(val) !== JSON.stringify((fpR[k] || {})[p]))))), [], tag + ': live differs from redraw');
        }
        seen.push([JSON.stringify(v), fpR]);
      } else {
        eq(dR, [], tag + ': changes at the wrong width (redraw)');
        eq(dL, [], tag + ': changes at the wrong width (live)');
      }
      covered.add(key);
    }
    if (x.type === 'select' && shows) {
      for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) ok(diff(seen[i][1], seen[j][1]).length > 0, name + ' ' + key + ': ' + seen[i][0] + ' and ' + seen[j][0] + ' look the same');
    }
    if (wide) await t.page.setViewportSize({width, height: 900});
  }
  eq(t.errors, [], name + ' @' + width + ' errors');
  await t.page.close();
  return covered.size;
}

/* Theme inheritance, schemes, custom styling, fonts, first paint, buttons, overflow. */
async function theme(browser, name, width, editing) {
  const cfg = CFG[name], tag = name + ' @' + width + (editing ? ' editor' : ' storefront');
  const t = await mount(browser, name, {width, editing, settings: cfg.settings(), blocks: cfg.blocks(), assets: [], theme: THEME});
  await addFp(t.page);
  const before = await fp(t);
  await t.page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', ASSET), 'utf8')});
  await t.page.waitForTimeout(150);
  eq(diff(before, await fp(t)), [], tag + ': first paint equals hydrated paint');
  eq(await audit(t), [], tag + ': markup matches controller');
  const R = '[data-pb-root]';
  eq(await t.css(R, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' scheme background');
  eq(await t.css(cfg.heading, 'color'), 'rgb(255, 255, 255)', tag + ' heading colour');
  ok(/^Georgia/.test(await t.css(cfg.heading, 'fontFamily')), tag + ' heading font');
  ok(/^Arial/.test(await t.css(cfg.text, 'fontFamily')), tag + ' body font');
  eq(await t.css(cfg.text, 'color'), 'rgb(204, 204, 204)', tag + ' text colour');
  eq(await t.root(cfg.heading).first().evaluate(e => e.tagName), 'H2', tag + ' heading is an h2');
  const bid0 = {'products-listing': t.blockId('button'), 'products-carousel': t.blockId('view_all')}[name];
  const btn = t.root(bid0 ? '[data-pb-block="' + bid0 + '"]' : cfg.button + ':not([hidden])').first();
  eq(await btn.evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(18, 52, 86)', tag + ' button colour');
  eq(await btn.evaluate(e => getComputedStyle(e).borderTopLeftRadius), '12px', tag + ' button radius');
  eq(await btn.getAttribute('data-theme-button'), 'primary', tag + ' theme button contract');
  ok(await btn.getAttribute('data-sl-button') !== null, tag + ' data-sl-button');
  await btn.hover(); await t.page.waitForTimeout(40);
  eq(await btn.evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 0, 0)', tag + ' button hover');
  await t.page.mouse.move(0, 0);
  ok((await btn.boundingBox()).height >= 44, tag + ' button target');
  for (const sel of ['.ps-arrow', '.swiper-arrow']) for (const el of await t.root(sel).all()) if (await el.isVisible()) ok((await el.boundingBox()).width >= 44, tag + ' ' + sel + ' 44px');
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  if (editing) {
    await t.emit({color_scheme: 'alt-scheme'});
    eq(await t.css(R, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme live');
    eq(await t.css(cfg.heading, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await t.css(R, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme redraw');
    eq(await t.css(cfg.heading, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    const bg = {'products-listing': 'section_bg', 'products-carousel': 'section_bg_override', 'product-showcase': 'background_color', 'featured-product2': 'section_bg'}[name];
    const heading = name === 'product-showcase' ? [{heading_color: '#cc0033'}] : [{enable_custom_style: true, color: '#cc0033'}, t.blockId('heading')];
    await t.emit({enable_custom_style: true, [bg]: '#abcdef'});
    await t.emit(...heading);
    const bid = {'products-listing': t.blockId('button'), 'products-carousel': t.blockId('view_all')}[name];
    if (bid) await t.emit({enable_custom_style: true, bg: '#00ff00', color: '#000000', bg_hover: '#0000ff'}, bid);
    else if (name === 'product-showcase') await t.emit({button_bg_color: '#00ff00', button_text_color: '#000000', button_bg_hover_color: '#0000ff'});
    else await t.emit({cta_bg: '#00ff00', cta_color: '#000000', cta_bg_hover: '#0000ff'});
    const bgEl = name === 'featured-product2' ? '.psh' : R;
    eq(await t.css(bgEl, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background');
    eq(await t.css(cfg.heading, 'color'), 'rgb(204, 0, 51)', tag + ' custom heading');
    eq(await btn.evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(0, 255, 0)', tag + ' custom button');
    await btn.hover(); await t.page.waitForTimeout(40);
    eq(await btn.evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(0, 0, 255)', tag + ' custom button hover');
    await t.page.mouse.move(0, 0);
    await t.emit({enable_custom_fonts: true, heading_font: {family: 'Courier New'}, body_font: {family: 'Verdana'}});
    ok(/^"?Courier New/.test(await t.css(cfg.heading, 'fontFamily')), tag + ' custom heading font');
    ok(/^Verdana/.test(await t.css(cfg.text, 'fontFamily')), tag + ' custom body font');
    await t.redraw({settings: {enable_custom_fonts: true, heading_font: {family: 'Courier New'}, body_font: {family: 'Verdana'}, enable_custom_style: true, [bg]: '#abcdef'}});
    ok(/^Verdana/.test(await t.css(cfg.text, 'fontFamily')), tag + ' custom body font after redraw');
    eq(await t.css(bgEl, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background after redraw');
    await t.redraw({settings: {enable_custom_fonts: false, enable_custom_style: false}});
    await t.emit({enable_custom_style: true, [bg]: '#abcdef', enable_custom_fonts: true, heading_font: {family: 'Courier New'}});
    await t.emit({enable_custom_style: false, enable_custom_fonts: false});
    eq(diff(before, await fp(t)), [], tag + ': toggles off restore the theme exactly');
    eq(await btn.evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(18, 52, 86)', tag + ' theme button back');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

/* Two instances, pictures kept, redraws, added blocks. */
async function lifecycle(browser, name) {
  const cfg = CFG[name];
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const withImg = name === 'product-showcase' ? cfg.blocks().map(b => ({...b, settings: {...b.settings, image: IMG}})) : cfg.blocks();
    const sa = {...cfg.settings(), ...(name === 'featured-product2' ? {image: IMG} : {})};
    const t = await mount(browser, name, {width, editing: true, instances: [{uid: 'a', blocks: withImg, settings: sa}, {uid: 'b', settings: cfg.settings(), blocks: cfg.blocks()}], assets: [ASSET], theme: THEME});
    await addFp(t.page);
    const b0 = await fp(t, 'b');
    const hb = name === 'product-showcase' ? null : t.blockId('heading', 0, 'a');
    await t.emit({padding_top: 12, padding_top_mobile: 12, enable_custom_style: true, section_bg: '#abcdef', background_color: '#abcdef', section_bg_override: '#abcdef'}, undefined, 'a');
    if (hb) await t.emit({text: 'Only in A'}, hb, 'a'); else await t.emit({heading: 'Only in A'}, t.blockId('slide', 0, 'a'), 'a');
    eq(diff(b0, await fp(t, 'b')), [], tag + ': an edit to one instance leaves the other alone');
    eq((await t.page.locator('#shopify-section-a ' + cfg.heading).first().textContent()).trim(), 'Only in A', tag + ' heading A');
    const imgSel = {'product-showcase': '.ps-slide img', 'featured-product2': '.psh__media img', 'products-listing': '.pl-grid img', 'products-carousel': '.swiper-wrapper img'}[name];
    if (await t.page.locator('#shopify-section-a ' + imgSel).count()) {
      await t.page.evaluate(s => { const i = document.querySelector('#shopify-section-a ' + s); i.__mark = i.getAttribute('src'); }, imgSel);
      await t.emit({padding_bottom: 10, padding_bottom_mobile: 10, section_margin_top_mobile: 5, heading_size_desktop: 40, image_radius: 3, image_border_radius: 3}, undefined, 'a');
      ok(await t.page.evaluate(s => { const i = document.querySelector('#shopify-section-a ' + s); return i.__mark === i.getAttribute('src'); }, imgSel), tag + ': picture element and address kept on unrelated edits');
    }
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
    eq(await t.page.evaluate(() => window.MateriaProductsB.roots.size), 2, tag + ': redraws leave one controller per section');
    let blocks, added, edit, want;
    if (name === 'product-showcase') { blocks = [...withImg, {type: 'slide', settings: {heading: 'Added slide'}}]; added = 'a-b' + (blocks.length - 1); edit = {heading: 'Edited added'}; want = 'Edited added'; }
    else if (name === 'featured-product2') { blocks = [...withImg, {type: 'eyebrow', settings: {text: 'Added'}}]; added = 'a-b' + (blocks.length - 1); edit = {text: 'Edited added'}; want = 'Edited added'; }
    else { blocks = [...withImg.filter(b => b.type !== 'subheading'), {type: 'subheading', settings: {text: '<p>Added</p>'}}]; added = 'a-b' + (blocks.length - 1); edit = {text: '<p>Edited added</p>'}; want = 'Edited added'; }
    await t.redraw({uid: 'a', blocks});
    ok(await t.page.locator('[data-pb-block="' + added + '"]').count() === 1, tag + ' added block drawn');
    await t.emit(edit, added, 'a');
    const txt = await t.page.locator('[data-pb-block="' + added + '"]').evaluate(e => (e.querySelector('.ps-heading') || e).textContent.trim());
    eq(txt, want, tag + ' added block live');
    eq(await audit(t, 'a'), [], tag + ' audit after edits');
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* Header blocks vs the legacy section settings (no blocks of that type). */
async function legacy(browser, name) {
  if (!['products-listing', 'products-carousel'].includes(name)) return;
  const L = name === 'products-listing' ? {heading: 'Old heading', subheading: 'Old eyebrow', description: '<p>Old text</p>', show_view_all: true, view_all_label: 'Old view all', view_all_position: 'bottom', heading_font_size: 40} : {heading: 'Old heading', description: 'Old text'};
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: false, settings: {...CFG[name].settings(), ...L}, blocks: name === 'products-carousel' ? [{type: 'view_all'}] : [], assets: [ASSET], theme: THEME});
    const txt = await t.root('.pb-heading').allTextContents();
    eq(txt.map(s => s.trim()), ['Old heading'], name + ' @' + width + ' legacy heading shown without a Heading block');
    ok((await t.root('.pb-sub').textContent()).includes('Old text'), name + ' legacy description shown');
    if (name === 'products-listing') {
      eq((await t.root('.pb-eyebrow').textContent()).trim(), 'Old eyebrow', name + ' legacy eyebrow');
      eq((await t.root('.pl-bottom .pl-btn').textContent()).trim(), 'Old view all', name + ' legacy view all');
      eq(await t.root('.pl-bottom .pl-btn').getAttribute('href'), '/collections/summer', name + ' legacy view all opens the collection');
      eq(await t.css('.pb-heading', 'fontSize'), '40px', name + ' legacy heading size');
    }
    eq(await audit(t), [], name + ' legacy audit');
    await t.page.close();
    const b = await mount(browser, name, {width, editing: false, settings: {...CFG[name].settings(), ...L}, blocks: CFG[name].blocks(), assets: [ASSET], theme: THEME});
    const h = (await b.root('.pb-heading').allTextContents()).map(s => s.trim());
    ok(!h.includes('Old heading') && h.length === 1, name + ' @' + width + ' a Heading block replaces the legacy heading');
    ok(!(await b.root('.pb-sub').allTextContents()).some(s => s.includes('Old text')), name + ' a Subheading block replaces the legacy text');
    eq(b.errors, [], name + ' legacy errors');
    await b.page.close();
  }
}

/* Product data: prices through money, compare-at only when higher, sold out, cards from the theme snippet. */
async function products(browser, name) {
  const tag = name;
  if (name === 'products-listing' || name === 'products-carousel') {
    const t = await mount(browser, name, {width: 1366, editing: false, settings: {collection: COLLECTION}, blocks: CFG[name].blocks(), assets: [ASSET], theme: THEME});
    eq(await t.root('.product-item').count(), 3, tag + ': one theme product card (snippets/product-item) per product');
    ok((await t.root('.product-item').first().textContent()).includes('Pants Down'), tag + ': card title from the product');
    ok((await t.root('.product-item').first().textContent()).includes('R$137.77'), tag + ': card price through money');
    const href = await t.root(CFG[name].button + ':not([hidden])').first().getAttribute('href');
    eq(href, '/collections/summer', tag + ': view all opens the collection');
    await t.page.close();
    /* Theme settings > Product cards reach the cards */
    const r1 = (await render(name, {settings: {collection: COLLECTION}, theme: {...THEME, product_image_ratio: 'square'}})).html, r2 = (await render(name, {settings: {collection: COLLECTION}, theme: {...THEME, product_image_ratio: 'portrait'}})).html;
    ok(r1 !== r2, tag + ': Theme settings > Product cards image ratio reaches the cards');
    const e1 = await mount(browser, name, {width: 375, editing: true, settings: {}, blocks: CFG[name].blocks(), assets: [ASSET], theme: THEME});
    ok(await e1.root('.product-item').count() > 0, tag + ': no collection: tidy placeholder cards in the editor');
    ok(await e1.noOverflow(), tag + ': no collection: no overflow'); eq(e1.errors, [], tag + ' empty errors');
    await e1.page.close();
  }
  if (name === 'featured-product2') {
    const blocks = CFG[name].blocks();
    const t = await mount(browser, name, {width: 1366, editing: false, settings: {product: PANTS}, blocks, assets: [ASSET], theme: THEME});
    eq((await t.root('.psh__heading').textContent()).trim(), 'Pants Down', tag + ': heading from the product title');
    const price = (await t.root('.psh__price').textContent()).replace(/\s+/g, ' ');
    ok(price.includes('R$137.77') && price.includes('R$211.93'), tag + ': price and compare-at through money');
    eq(await t.root('.psh__price del').count(), 1, tag + ': compare-at shown when higher');
    eq(await t.root('.psh__cta').first().getAttribute('href'), '/products/pants-down', tag + ': primary button opens the product');
    await t.page.close();
    const equal = {...clone(PANTS), compare_at_price: 13777};
    const t2 = await mount(browser, name, {width: 375, editing: false, settings: {product: equal}, blocks, assets: [ASSET], theme: THEME});
    eq(await t2.root('.psh__price del').count(), 0, tag + ': no compare-at when not higher');
    await t2.page.close();
    const bb = blocks.map(b => b.type === 'buttons' ? {...b, settings: {...b.settings, primary_action: 'add_to_cart'}} : b);
    const t3 = await mount(browser, name, {width: 375, editing: false, settings: {product: PANTS}, blocks: bb, assets: [ASSET], theme: THEME});
    eq(await t3.root('form input[name=id]').getAttribute('value'), 'pants-down-v0', tag + ': add to cart posts the selected variant');
    eq(await t3.root('form button[name=add]').getAttribute('data-theme-button'), 'primary', tag + ': add to cart is a theme button');
    ok(!(await t3.root('form button[name=add]').isDisabled()), tag + ': available: button enabled');
    await t3.page.close();
    const t4 = await mount(browser, name, {width: 375, editing: false, settings: {product: SOLD}, blocks: bb, assets: [ASSET], theme: THEME});
    ok(await t4.root('form button[name=add]').isDisabled(), tag + ': sold out: no active buy button');
    ok(/sold out/i.test(await t4.root('form button[name=add]').textContent()), tag + ': sold out label');
    eq(await t4.root('.psh__soldout').count(), 1, tag + ': sold out tag beside the price');
    await t4.page.close();
    const t5 = await mount(browser, name, {width: 375, editing: false, settings: {}, blocks, assets: [ASSET], theme: THEME});
    ok(!/\$|R\$/.test(await t5.root('.psh__price').textContent()), tag + ': no product: no typed price on the storefront');
    eq(await t5.root('.psh__note').count(), 0, tag + ': no product: no editor notes on the storefront');
    eq(t5.errors, [], tag + ' no product errors');
    await t5.page.close();
  }
  if (name === 'product-showcase') {
    const blocks = [{type: 'slide', settings: {product: PANTS, heading: '', description: '', button_text: 'Shop'}}, {type: 'slide', settings: {product: SOLD, heading: 'Own title', button_text: 'Shop'}}];
    const t = await mount(browser, name, {width: 1366, editing: false, blocks, assets: [ASSET], theme: THEME});
    eq((await t.root('.ps-heading').first().textContent()).trim(), 'Pants Down', tag + ': empty heading takes the product title');
    ok((await t.root('.ps-desc').first().textContent()).includes('Designed for everyday wear'), tag + ': empty description takes the product description');
    const price = (await t.root('.ps-price').first().textContent()).replace(/\s+/g, ' ');
    ok(price.includes('R$137.77') && price.includes('R$211.93'), tag + ': price and compare-at through money');
    eq(await t.root('.ps-btn').first().getAttribute('href'), '/products/pants-down', tag + ': button opens the product');
    ok((await t.root('.ps-slide img').first().getAttribute('src')).startsWith('/img/black.svg'), tag + ': picture from the product');
    eq((await t.root('.ps-heading').nth(1).textContent()).trim(), 'Own title', tag + ': own heading replaces the product title');
    ok(/sold out/i.test(await t.root('.ps-price').nth(1).textContent()), tag + ': sold out tag');
    eq(await t.root('.ps-price').nth(1).locator('s').count(), 0, tag + ': no compare-at when not higher');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* Product Showcase slider: arrows, keyboard, swipe, autoplay that stops off screen / hidden / hover / reduced motion; re-init once. */
async function slider(browser) {
  const name = 'product-showcase';
  for (const width of [375, 1366]) {
    const tag = name + ' slider @' + width;
    const t = await mount(browser, name, {width, height: 1800, editing: false, settings: {autoplay: true, autoplay_speed: 3}, blocks: CFG[name].blocks(), assets: [ASSET], theme: THEME, inlineScripts: true});
    const active = () => t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test [data-ps-slide]')].findIndex(s => s.classList.contains('is-active')));
    const n = await t.root('[data-ps-slide]').count();
    ok(n >= 2, tag + ' several slides');
    eq(await t.root('[data-ps-slide][inert]').count(), n - 1, tag + ': hidden slides are inert');
    await t.root('.ps-slide.is-active [data-ps-next]').click(); await t.page.waitForTimeout(80);
    eq(await active(), 1, tag + ': next arrow');
    await t.page.keyboard.press('ArrowLeft'); await t.page.waitForTimeout(80);
    eq(await active(), 0, tag + ': ArrowLeft with focus inside');
    ok(await t.page.evaluate(() => document.activeElement.matches('#shopify-section-test .ps-slide.is-active [data-ps-prev]')), tag + ': focus stays on a visible arrow');
    await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(80);
    eq(await active(), 1, tag + ': ArrowRight');
    const box = await t.root('[data-ps-viewport]').boundingBox();
    await t.page.mouse.move(box.x + box.width * 0.8, box.y + 40); await t.page.mouse.down();
    await t.page.mouse.move(box.x + box.width * 0.2, box.y + 40, {steps: 8}); await t.page.mouse.up(); await t.page.waitForTimeout(80);
    eq(await active(), 2 % n, tag + ': swipe moves to the next slide');
    for (const el of await t.root('.ps-slide.is-active .ps-arrow').all()) { const b = await el.boundingBox(); ok(b.width >= 44 && b.height >= 44, tag + ': arrow 44px'); }
    await t.page.keyboard.press('Shift'); await t.root('.ps-slide.is-active [data-ps-next]').focus();
    ok(await t.root('.ps-slide.is-active [data-ps-next]').evaluate(e => getComputedStyle(e).outlineStyle !== 'none'), tag + ': visible focus ring');
    await t.page.evaluate(() => document.activeElement.blur()); await t.page.mouse.move(5, 1795);
    await t.page.waitForTimeout(80);
    eq(await t.root('[data-pb-root]').getAttribute('data-pb-running'), 'true', tag + ': autoplay runs on screen');
    const at = await active(); await t.page.waitForTimeout(3300);
    ok(await active() !== at, tag + ': autoplay moves on');
    await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '4000px'; document.body.prepend(s); });
    await t.page.waitForTimeout(150);
    eq(await t.root('[data-pb-root]').getAttribute('data-pb-running'), 'false', tag + ': autoplay stops off screen');
    await t.page.evaluate(() => document.body.firstElementChild.remove()); await t.page.waitForTimeout(150);
    eq(await t.root('[data-pb-root]').getAttribute('data-pb-running'), 'true', tag + ': autoplay resumes on screen');
    await t.emit({autoplay: false}); await t.page.waitForTimeout(50);
    eq(await t.root('[data-pb-root]').getAttribute('data-pb-running'), 'false', tag + ': autoplay off live');
    for (let i = 0; i < 3; i++) await t.redraw({settings: {autoplay: true}});
    eq(await t.page.evaluate(() => window.MateriaProductsB.roots.size), 1, tag + ': one controller after redraws');
    await t.root('.ps-slide.is-active [data-ps-next]').click(); await t.page.waitForTimeout(80);
    eq(await active(), 1, tag + ': one click moves one slide after redraws (no duplicate listeners)');
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
    const r = await mount(browser, name, {width, editing: false, settings: {autoplay: true, autoplay_speed: 3}, blocks: CFG[name].blocks(), assets: [ASSET], theme: THEME, reducedMotion: 'reduce'});
    await r.page.waitForTimeout(100);
    eq(await r.root('[data-pb-root]').getAttribute('data-pb-running'), 'false', tag + ': reduced motion: no autoplay');
    eq(await r.root('.ps-track').evaluate(e => getComputedStyle(e).transitionDuration), '0s', tag + ': reduced motion: no slide transition');
    await r.root('.ps-slide.is-active [data-ps-next]').click(); await r.page.waitForTimeout(50);
    ok(await r.root('.ps-slide.is-active').evaluate(e => getComputedStyle(e.querySelector('.ps-col-left')).opacity === '1'), tag + ': reduced motion: content fully visible');
    await r.page.close();
  }
}

/* Products carousel with the theme's slider: built once, rotation stops off screen and under reduced motion. */
async function carousel(browser) {
  const name = 'products-carousel';
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const t = await mount(browser, name, {width: 1366, height: 900, editing: false, settings: {collection: {...COLLECTION, products: [PANTS, OTHER, TALL, PANTS, OTHER, TALL], products_count: 6}, autoplay: true, autorotate_speed: 2, show_arrow: true, carousel_pagination: 'show_dots'}, blocks: CFG[name].blocks(), assets: [...SLIDER, ASSET], theme: THEME, reducedMotion});
    await t.page.waitForFunction(() => document.querySelector('[data-pb-slider]').globalSlide, null, {timeout: 5000});
    await t.page.waitForTimeout(400);
    const running = () => t.page.evaluate(() => !!document.querySelector('[data-pb-slider]').globalSlide.autoplay.running);
    eq(await running(), reducedMotion !== 'reduce', name + ' ' + reducedMotion + ': auto-rotation ' + (reducedMotion === 'reduce' ? 'off' : 'on'));
    if (reducedMotion !== 'reduce') {
      await t.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '3000px'; document.body.prepend(s); });
      await t.page.waitForTimeout(200);
      eq(await running(), false, name + ': rotation stops off screen');
      await t.page.evaluate(() => document.body.firstElementChild.remove()); await t.page.waitForTimeout(200);
      eq(await running(), true, name + ': rotation resumes on screen');
      await t.emit({padding_top: 20, header_spacing: 8});
      ok(await t.page.evaluate(() => !document.querySelector('[data-pb-slider]').globalSlide.destroyed), name + ': style edits keep the slider');
      await t.redraw(); await t.redraw();
      await t.page.waitForFunction(() => document.querySelector('[data-pb-slider]').globalSlide, null, {timeout: 5000});
      eq(await t.page.evaluate(() => document.querySelectorAll('[data-pb-slider].swiper-initialized').length), 1, name + ': one slider after redraws');
      eq(await t.page.evaluate(() => window.MateriaProductsB.roots.size), 1, name + ': one controller after redraws');
    } else eq(await t.page.evaluate(() => document.querySelector('[data-pb-slider]').globalSlide.params.speed), 0, name + ': reduced motion: no slide animation');
    ok(await t.noOverflow(), name + ' slider no overflow');
    eq(t.errors, [], name + ' slider errors');
    await t.page.close();
  }
}

/* The saved product_showcase_yGRpEr, with enable_custom_style on, against the section before this change. */
async function saved(browser) {
  const name = 'product-showcase', key = 'product_showcase_yGRpEr';
  let oldRaw; try { oldRaw = execSync('git show d134b8a:sections/' + name + '.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8'}); } catch (_) { return; }
  if (oldRaw.includes('data-pb-root')) return;
  const tj = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates/home.json'), 'utf8')), sec = tj.sections[key];
  const renderRaw = async (raw, settings) => {
    const sch = JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify;
    const defs = Object.fromEntries(sch.settings.filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
    const bdef = Object.fromEntries((sch.blocks[0].settings || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
    const e = engine(); e.registerFilter('script_tag', () => '');
    const section = {id: 'S', settings: {...defs, ...settings}, blocks: sec.block_order.map(k => ({id: k, type: 'slide', settings: {...bdef, ...sec.blocks[k].settings}}))};
    const ctx = {section, settings: {scroll_animation: 'none'}, request: {design_mode: false}, routes: {all_products_collection_url: '/collections/all'}};
    const tpl = raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '');
    return (await e.parseAndRender(tpl, ctx, {globals: ctx})).replace(/<script\b[\s\S]*?<\/script>/g, '');
  };
  const newRaw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8');
  for (const width of [375, 1366]) {
    const look = async html => {
      const page = await browser.newPage({viewport: {width, height: 900}});
      await page.route('**/*', r => r.fulfill({body: r.request().url() === 'http://theme.test/' ? '<!doctype html><html><head></head><body></body></html>' : '', contentType: 'text/html'}));
      await page.goto('http://theme.test/');
      await page.addStyleTag({content: THEME_VARS});
      for (const f of ['critical.css', 'theme.css', 'theme-button-contract.css']) await page.addStyleTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', f), 'utf8')});
      await page.evaluate(h => { const w = document.createElement('div'); w.id = 'shopify-section-S'; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w); }, html);
      await page.waitForTimeout(800); /* the old version fades its first slide in */
      const r = await page.evaluate(() => {
        const q = s => document.querySelector('#shopify-section-S ' + s), cs = (s, p) => getComputedStyle(q(s))[p], box = s => { const b = q(s).getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round).join(','); };
        return {bg: cs('.ps-section', 'backgroundColor'), pad: [cs('.ps-section', 'paddingTop'), cs('.ps-section', 'paddingBottom')],
          h: [cs('.ps-heading', 'color'), cs('.ps-heading', 'fontSize'), cs('.ps-heading', 'fontWeight'), cs('.ps-heading', 'textTransform')], d: [cs('.ps-desc', 'color'), cs('.ps-desc', 'fontSize')],
          stars: [cs('.ps-stars-fill', 'color'), cs('.ps-stars-base', 'color'), cs('.ps-stars', 'fontSize'), q('.ps-stars-fill').style.width], rev: [cs('.ps-reviews', 'color'), cs('.ps-reviews', 'fontSize'), q('.ps-reviews').textContent.trim()],
          ben: [cs('.ps-benefit', 'color'), cs('.ps-benefit', 'fontSize'), cs('.ps-check', 'color'), document.querySelectorAll('#shopify-section-S .ps-slide')[0].querySelectorAll('.ps-benefit:not([hidden])').length],
          btn: [cs('.ps-btn', 'backgroundColor'), cs('.ps-btn', 'color'), cs('.ps-btn', 'borderTopLeftRadius'), cs('.ps-btn', 'fontSize'), q('.ps-btn').textContent.trim()],
          arrow: q('.ps-arrow') ? [cs('.ps-arrow', 'color'), cs('.ps-arrow', 'borderTopColor'), cs('.ps-arrow', 'width')] : null,
          boxes: [box('.ps-heading'), box('.ps-btn'), box('.ps-benefits')]};
      });
      await page.close();
      return r;
    };
    const was = await look(await renderRaw(oldRaw, sec.settings)), now = await look(await renderRaw(newRaw, {...sec.settings, enable_custom_style: true})), plain = await look(await renderRaw(newRaw, sec.settings));
    eq(now, was, key + ' @' + width + ' looks the same with enable_custom_style on');
    ok(plain.bg !== was.bg, key + ' without the toggle it follows the theme (so the toggle is needed)');
    savedCompared++;
  }
}

(async () => {
  const only = process.argv.slice(2), names = Object.keys(CFG).filter(n => !only.length || only.includes(n));
  const browser = await launch();
  try {
    for (const n of names) {
      eq(schemaProblems(n), [], n + ' schema');
      const s = schemaOf(n).schema;
      for (const list of [s.settings, ...(s.blocks || []).map(b => b.settings)]) { const ids = list.filter(x => x.id).map(x => x.id); eq(new Set(ids).size, ids.length, n + ' unique ids'); }
      const raw = fs.readFileSync(path.join(__dirname, '../sections', n + '.storelib'), 'utf8');
      ok(raw.startsWith('<template compat="shopify">\n'), n + ' first line');
      ok(!/[—]/.test(JSON.stringify(s.presets)) && !/\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(JSON.stringify(s.presets)), n + ' preset copy');
      if (n === 'products-listing' || n === 'products-carousel') ok(raw.includes("render 'product-item'"), n + ' uses the theme product card');
    }
    const covered = {};
    await Promise.all(names.map(async n => { covered[n] = 0; for (const w of [375, 1366]) covered[n] = Math.max(covered[n], await everyControl(browser, n, w)); }));
    await Promise.all(names.map(async n => { for (const w of [375, 1366]) for (const e of [true, false]) await theme(browser, n, w, e); }));
    await Promise.all(names.map(n => lifecycle(browser, n)));
    await Promise.all(names.map(n => legacy(browser, n)));
    await Promise.all(names.map(n => products(browser, n)));
    if (names.includes('product-showcase')) { await slider(browser); await saved(browser); }
    if (names.includes('products-carousel')) await carousel(browser);
    console.log(checks + ' products-b checks passed (controls covered: ' + Object.entries(covered).map(([n, c]) => n + ' ' + c).join(', ') + (savedCompared ? '; saved Product Showcase compared with the previous version: ' + savedCompared : '') + ')');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
