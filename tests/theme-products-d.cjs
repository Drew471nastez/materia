/* Products group D: Quick Add to Cart (addtocartbutton), Discount Price
   (dynamic-pricing), Products set (product-set) and Product Shop The Look
   (product-shop-the-look). Schema, theme inheritance, every control (live and
   after a server redraw, at 375 and 1366), first paint, two instances, added
   blocks and redraws, the add to cart form, the set carousel, reduced motion,
   empty pickers, and the saved Products set on templates/product.json.

   LIQUIDJS=<path to liquidjs> node tests/theme-products-d.cjs [section ...] */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process'), assert = require('assert/strict');
const {launch, mount, render, schemaOf, schemaProblems, THEME_VARS, PANTS, OTHER, TALL, EMPTY} = require('./media-fixture.cjs');
const ASSET = 'live-products-d.js', ASSETS = [ASSET, 'product-card.css'];
const ROOT = '[data-pd-root]';
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 1000, alt: 'Saved alt'};
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
const clone = o => JSON.parse(JSON.stringify(o));
/* A product with a different price and no compare-at price. */
const CHEAP = (() => { const p = clone(OTHER); p.handle = 'cheap'; p.title = 'Cheap Tee'; p.price = 5000; p.compare_at_price = 0; for (const v of p.variants) { v.price = 5000; v.compare_at_price = 0; } p.selected_or_first_available_variant = p.first_available_variant = p.variants[0]; return p; })();
/* A sold out product. */
const GONE = (() => { const p = clone(TALL); p.available = false; for (const v of p.variants) v.available = false; p.selected_or_first_available_variant = p.first_available_variant = p.variants[0]; return p; })();
/* Some variants sold out. */
const MIXED = (() => { const p = clone(PANTS); p.variants[1].available = false; return p; })();
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);

const CFG = {
  addtocartbutton: {
    settings: {selected_product: PANTS},
    blocks: () => [{type: 'heading'}, {type: 'subheading'}, {type: 'button'}],
    desk: [], mob: [],
    structural: ['selected_product', 'show_variant_picker', 'after_add'],
    pre: {reset_spacing: {section_margin_top_mobile: 20, section_margin_top_desktop: 24}},
    heading: '.pd-atc__heading', text: '.pd-atc__sub', btn: '.pd-atc__button',
  },
  'dynamic-pricing': {
    settings: {product: PANTS},
    blocks: () => [],
    desk: ['section_height', 'desktop_padding'], mob: ['mobile_padding'],
    structural: ['product'],
    pre: {currency_color: {show_currency_symbol: true}, reset_spacing: {section_margin_top_mobile: 20, section_margin_top_desktop: 24}},
    noEffect: {display_on_devices: {375: ['mobile_only'], 1366: ['desktop_only']}},
    same: [['all_devices', 'mobile_only'], ['all_devices', 'desktop_only']],
    heading: '.pd-price__sale', text: '.pd-price__original',
  },
  'product-set': {
    settings: {carousel_pagination: 'show_dots', show_arrow: true},
    globals: {product: PANTS},
    blocks: () => [{type: 'heading'}, {type: 'subheading'}, {type: 'set', settings: {products: [OTHER, TALL]}}, {type: 'set', settings: {products: [TALL, OTHER]}}, {type: 'set', settings: {products: [OTHER]}}],
    desk: ['pagination_position', 'items_per_row'], mob: [],
    structural: ['products'],
    values: {column_gap: [5]},
    heading: '.pd-set__heading', text: '.pd-set__sub',
  },
  'product-shop-the-look': {
    settings: {},
    blocks: () => presetBlocks('product-shop-the-look').map((b, i) => b.type === 'product' ? {type: 'product', settings: {product: [PANTS, OTHER, GONE][i % 3]}} : b),
    desk: ['image_position', 'column_valign', 'image_width_pct', 'gap_desktop', 'image_aspect_desktop', 'image_min_height', 'size_desktop'], mob: ['image_aspect', 'gap_mobile', 'size_mobile'],
    structural: ['card_style', 'product'],
    heading: '.pstl__heading', text: '.pstl__sub',
  },
};
const COMMON_PRE = {enable_custom_fonts: {heading_font: FONT, body_font: FONT, price_font: FONT}, heading_font: {heading_font: {family: 'Courier New'}, body_font: {family: 'Courier New'}}, body_font: {heading_font: {family: 'Courier New'}, body_font: {family: 'Courier New'}}, price_font: {price_font: {family: 'Courier New'}}};
const SPECIAL = ['reveal']; /* checked on its own: the theme reveal hook */
const STRUCTURAL = ['reset_spacing']; /* the neighbour section's spacing changes on the builder's redraw */
const WIDE = ['section_width']; /* differs only on screens wider than the page width */

function valuesFor(x, cur = x.default) {
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return ['Edited text'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <strong>copy</strong></p>'];
    case 'url': return ['/pages/test'];
    case 'image_picker': return [IMG];
    case 'font_picker': return [FONT];
    case 'product': return [CHEAP];
    case 'product_list': return [[CHEAP, TALL]];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
function prereq(x, list, base) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true)))?/g)) {
    const [, id, op, str, lit] = m, want = str ?? (lit === undefined ? true : lit === 'true');
    if (!op) out[id] = true;
    else if (op === '==') out[id] = want;
    else if (base[id] === want) { const s = list.find(y => y.id === id); out[id] = s.type === 'checkbox' ? !want : s.options.map(o => o.value).filter(v => v !== want)[0]; }
  }
  if (x.id === 'enable_custom_style') for (const y of list) if (y.type === 'color') out[y.id] = '#13579b';
  return out;
}

async function addFp(page) {
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'backgroundImage', 'fontSize', 'fontFamily', 'fontWeight', 'letterSpacing', 'textAlign', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap', 'flexDirection', 'alignItems', 'justifyContent', 'borderTopLeftRadius', 'aspectRatio', 'opacity', 'display', 'visibility', 'transform', 'scale', 'borderTopWidth', 'borderTopColor', 'top', 'width', 'height', 'maxWidth', 'gridTemplateColumns', 'filter'];
    const SKIP = /^data-pd-(settings|defaults|block-defaults)$/;
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-pd-root]'), out = {}, seen = {};
      if (!root) return {wrap: {gone: true}};
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.closest('template') || e.ownerSVGElement || e.tagName === 'SCRIPT') continue;
        const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
        let k = (e.dataset && e.dataset.pdBlock && e.dataset.pdBlock + '/') + e.tagName + '.' + (cls.split(' ')[0] || '');
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const p of P) o[p] = cs[p];
        o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
        for (const v of ['--mb-bg', '--mb-text', '--mb-border', '--mb-hover-bg', '--mb-radius', '--mb-font-size', '--mb-weight', '--btn-border-width', '--pd-cbh', '--pd-ctabgh']) o[v] = cs.getPropertyValue(v).trim();
        if (!e.children.length || /^(H\d|P|A|BUTTON|SPAN)$/.test(e.tagName)) o.text = e.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
        o.tag = e.tagName;
        for (const a of e.attributes) if (!SKIP.test(a.name) && !/^(style|class|id|for|sizes|srcset)$/.test(a.name)) o['@' + a.name] = a.name === 'src' ? a.value.split('?')[0] : a.value;
        if (e.tagName === 'SELECT' || e.tagName === 'INPUT') o.value = e.value;
        const b = getComputedStyle(e, '::before'); if (b.content !== 'none') o.before = [b.width, b.height, b.backgroundColor, b.transform].join();
        const a = getComputedStyle(e, '::after'); if (a.content !== 'none') o.after = [a.width, a.height, a.backgroundColor, a.transform].join();
        o.blk = e.closest('[data-pd-block]')?.dataset.pdBlock || '';
        out[k] = o;
      }
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, cls: wrap.className, blk: ''};
      return out;
    };
  });
}
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const sorted = o => JSON.stringify(o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).sort(([x], [y]) => x < y ? -1 : 1)) : o);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => sorted(a[k]) !== sorted(b[k]));
/* Settled values: theme transitions (links fade colour over 0.4s) are not what is compared. */
const SPACING = '.shopify-section{padding-top:7px;padding-bottom:7px;margin-top:11px;margin-bottom:11px}*,*::before,*::after{transition-duration:0s!important}';
const cfgMount = (name, extra = {}) => ({settings: clone(CFG[name].settings), blocks: CFG[name].blocks(), globals: CFG[name].globals || {}, ...extra});
/* JSON round trips drop nothing the sections read from products. */
const revive = o => o;

async function everyControl(browser, name, width) {
  const cfg = CFG[name], {schema} = schemaOf(name);
  const t = await mount(browser, name, {width, editing: true, ...cfgMount(name), assets: ASSETS});
  await t.page.addStyleTag({content: SPACING}); await addFp(t.page);
  const base = {...t.section.settings};
  for (const x of schema.settings) if (x.id && !(x.id in base)) base[x.id] = '';
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: {...b.settings}}));
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header' && !SPECIAL.includes(x.id)) cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks || []) {
    const i = baseBlocks.findIndex(b => b.type === bt.type);
    for (const x of bt.settings || []) if (x.id && !x.hidden && x.type !== 'header') { assert.ok(i >= 0, name + ': no base block ' + bt.type); cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  }
  const covered = new Set();
  for (const c of cases) {
    const {x} = c, wide = WIDE.includes(x.id);
    if (wide && width !== 1366) continue;
    if (wide) await t.page.setViewportSize({width: 1700, height: 900});
    const blocks0 = baseBlocks.map(b => ({type: b.type, settings: {...b.settings}}));
    const S = {...base, ...(c.scope < 0 ? COMMON_PRE[x.id] || {} : {})};
    const bi = c.scope;
    const bBase = bi >= 0 ? blocks0[bi].settings : S;
    const pre = {...prereq(x, c.list, bBase), ...(c.scope < 0 ? cfg.pre?.[x.id] || {} : {})};
    if (bi >= 0) Object.assign(blocks0[bi].settings, pre); else Object.assign(S, pre);
    const blockId = bi >= 0 ? 'test-b' + bi : undefined;
    const key = (c.btype ? c.btype + '.' : '') + x.id;
    const isDesk = cfg.desk.includes(x.id) || /_desktop$/.test(x.id), isMob = cfg.mob.includes(x.id) || /_mobile$/.test(x.id);
    const shows = !(isDesk && width < 760) && !(isMob && width >= 768);
    const structural = (cfg.structural || []).includes(x.id) || STRUCTURAL.includes(x.id);
    await t.redraw({settings: S, blocks: blocks0});
    const fp0 = await fp(t);
    const cur = bi >= 0 ? blocks0[bi].settings[x.id] : S[x.id];
    const seen = [[JSON.stringify(cur ?? null), fp0]];
    for (const v of cfg.values?.[x.id] || valuesFor(x, cur)) {
      const tag = name + ' @' + width + ' ' + key + '=' + JSON.stringify(v).slice(0, 40);
      const blocks1 = blocks0.map(b => ({type: b.type, settings: {...b.settings}})); if (bi >= 0) blocks1[bi].settings[x.id] = v;
      let fpL;
      if (!structural) { await t.redraw({settings: S, blocks: blocks0}); await t.emit({[x.id]: v}, blockId); fpL = await fp(t); }
      await t.redraw({settings: bi >= 0 ? S : {...S, [x.id]: v}, blocks: blocks1});
      const fpR = await fp(t);
      const dR = diff(fp0, fpR);
      const none = cfg.noEffect?.[x.id]?.[width]?.includes(v);
      if (shows && !none) {
        ok(dR.length > 0, tag + ': redraw changes nothing');
        if (bi >= 0) ok(dR.some(k => fpR[k]?.blk === blockId || fp0[k]?.blk === blockId), tag + ': does not change its own block (' + dR.slice(0, 4) + ')');
        if (bi < 0 && /^section_margin/.test(x.id)) ok(dR.includes('wrap'), tag + ': margin not on the section');
        if (!structural) {
          const d = diff(fpL, fpR);
          const keys = k => [...new Set([...Object.keys(fpL[k] || {}), ...Object.keys(fpR[k] || {})])].filter(p => JSON.stringify((fpL[k] || {})[p]) !== JSON.stringify((fpR[k] || {})[p]));
          eq(d.map(k => k + ' ' + keys(k).map(p => p + ': ' + JSON.stringify((fpL[k] || {})[p]) + ' live, ' + JSON.stringify((fpR[k] || {})[p]) + ' redraw').join('; ')), [], tag + ': live differs from redraw');
        }
        seen.push([JSON.stringify(v), fpR]);
      } else if (!none) {
        /* what shows at this width; attributes such as a desktop-only data flag or an image sizes hint are not */
        const paint = f => Object.fromEntries(Object.entries(f).map(([k, o]) => [k, Object.fromEntries(Object.entries(o).filter(([p]) => !p.startsWith('@')))]));
        eq(diff(paint(fp0), paint(fpR)), [], tag + ': changes at the wrong width (redraw)');
        if (fpL) eq(diff(paint(fp0), paint(fpL)), [], tag + ': changes at the wrong width (live)');
      }
      covered.add(key);
    }
    if (x.type === 'select' && shows) {
      for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
        if ((cfg.same || []).some(([a, b]) => [a, b].includes(JSON.parse(seen[i][0])) && [a, b].includes(JSON.parse(seen[j][0])))) continue;
        ok(diff(seen[i][1], seen[j][1]).length > 0, name + ' ' + key + ': ' + seen[i][0] + ' and ' + seen[j][0] + ' look the same');
      }
    }
    if (wide) await t.page.setViewportSize({width, height: 900});
  }
  eq(t.errors, [], name + ' @' + width + ' errors');
  await t.page.close();
  return covered.size;
}

/* Theme inheritance, schemes, custom styling and fonts on and off, first paint, buttons, overflow. */
async function theme(browser, name, width, editing) {
  const cfg = CFG[name], tag = name + ' @' + width + (editing ? ' editor' : ' storefront');
  const t = await mount(browser, name, {width, editing, ...cfgMount(name), assets: ['product-card.css']});
  await addFp(t.page);
  const before = await fp(t);
  await t.page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', ASSET), 'utf8')});
  await t.page.waitForTimeout(150);
  { const a = await fp(t), d = diff(before, a); eq(d.map(k => k + JSON.stringify(Object.fromEntries(Object.entries(a[k] || {}).filter(([p, v]) => JSON.stringify(v) !== JSON.stringify((before[k] || {})[p]))))), [], tag + ': first paint equals hydrated paint'); }
  eq(await t.css(ROOT, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' scheme background');
  eq(await t.css(cfg.heading, 'color'), 'rgb(255, 255, 255)', tag + ' heading colour');
  ok(/^Georgia/.test(await t.css(cfg.heading, 'fontFamily')) || name === 'dynamic-pricing' && /^Arial/.test(await t.css(cfg.heading, 'fontFamily')), tag + ' heading font');
  ok(/^Arial/.test(await t.css(cfg.text, 'fontFamily')), tag + ' body font');
  eq(await t.css(cfg.text, 'color'), 'rgb(204, 204, 204)', tag + ' text colour');
  if (cfg.btn) {
    eq(await t.css(cfg.btn, 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' button colour');
    eq(await t.css(cfg.btn, 'borderTopLeftRadius'), '12px', tag + ' button radius');
    await t.root(cfg.btn).first().hover(); await t.page.waitForTimeout(40);
    eq(await t.css(cfg.btn, 'backgroundColor'), 'rgb(255, 0, 0)', tag + ' button hover');
    await t.page.mouse.move(0, 0);
    ok((await t.root(cfg.btn).first().boundingBox()).height >= 44, tag + ' button target');
  }
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  if (editing) {
    await t.emit({color_scheme: 'alt-scheme'});
    eq(await t.css(ROOT, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme live');
    eq(await t.css(cfg.heading, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await t.css(ROOT, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    const after = await fp(t);
    const {schema} = schemaOf(name);
    if (schema.settings.some(x => x.id === 'enable_custom_style')) {
      const colours = Object.fromEntries(schema.settings.filter(x => x.type === 'color').map((x, i) => [x.id, '#' + [1, 10 + i, 11].map(n => n.toString(16).padStart(2, '0')).join('')]));
      const rgb = h => 'rgb(' + [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ') + ')';
      await t.emit({enable_custom_style: true, enable_gradient: false, show_currency_symbol: true, ...colours});
      if (name === 'dynamic-pricing') { eq(await t.css(ROOT, 'backgroundColor'), rgb(colours.background_color), tag + ' custom background'); eq(await t.css('.pd-price__sale', 'color'), rgb(colours.discounted_price_color), tag + ' custom sale price'); eq(await t.css('.pd-price__original', 'color'), rgb(colours.original_price_color), tag + ' custom compare price'); eq(await t.css('.pd-price__currency', 'color'), rgb(colours.currency_color), tag + ' custom currency'); }
      if (name === 'product-shop-the-look') { eq(await t.css(ROOT, 'backgroundColor'), rgb(colours.section_bg), tag + ' custom background'); eq(await t.css('.pstl__card-title', 'color'), rgb(colours.card_title_color), tag + ' custom card title'); eq(await t.css('.pstl__card', 'backgroundColor'), rgb(colours.card_bg), tag + ' custom card'); eq(await t.css('.pstl__card-cta', 'backgroundColor'), rgb(colours.cta_bg), tag + ' custom arrow'); }
      if (name === 'addtocartbutton') { eq(await t.css(cfg.btn, 'backgroundColor'), rgb(colours.button_bg_color), tag + ' custom button'); eq(await t.css(cfg.btn, 'color'), rgb(colours.button_text_color), tag + ' custom button text'); }
      await t.emit({enable_custom_style: false, show_currency_symbol: false});
    }
    const hid = t.blockId('heading');
    if (hid) {
      await t.emit({enable_custom_style: true, color: '#cc0033'}, hid);
      eq(await t.css(cfg.heading, 'color'), 'rgb(204, 0, 51)', tag + ' custom heading');
      await t.emit({enable_custom_style: false}, hid);
    }
    await t.emit({enable_custom_fonts: true, heading_font: {family: 'Courier New'}, body_font: {family: 'Verdana'}, price_font: {family: 'Verdana'}});
    if (name !== 'dynamic-pricing') ok(/^"?Courier New/.test(await t.css(cfg.heading, 'fontFamily')), tag + ' custom heading font');
    ok(/^Verdana/.test(await t.css(name === 'dynamic-pricing' ? cfg.heading : cfg.text, 'fontFamily')), tag + ' custom body font');
    await t.emit({enable_custom_fonts: false});
    eq(diff(after, await fp(t)), [], tag + ': toggles off restore the theme exactly');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

/* Two instances stay independent; redraws re-initialise once; an added block is drawn and live. */
async function lifecycle(browser, name) {
  const cfg = CFG[name];
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const t = await mount(browser, name, {width, editing: true, instances: [{uid: 'a', ...cfgMount(name)}, {uid: 'b', ...cfgMount(name)}], globals: cfg.globals || {}, assets: ASSETS});
    await addFp(t.page);
    const b0 = await fp(t, 'b');
    await t.emit({padding_top: 31, padding_top_desktop: 31, section_height: 300, section_height_mobile: 200, color_scheme: 'alt-scheme'}, undefined, 'a');
    const hid = t.blockId('heading', 0, 'a');
    if (hid) await t.emit({text: 'Only in A'}, hid, 'a');
    eq(diff(b0, await fp(t, 'b')), [], tag + ': an edit to one instance leaves the other alone');
    if (hid) eq(await t.page.locator('#shopify-section-a ' + cfg.heading).first().textContent(), 'Only in A', tag + ' heading A');
    /* pictures are not reloaded by unrelated edits */
    const img = await t.page.locator('#shopify-section-a img').count();
    if (img) {
      await t.page.evaluate(() => { for (const i of document.querySelectorAll('#shopify-section-a img')) i.__mark = i.getAttribute('src'); });
      await t.emit({padding_bottom: 17, text_gap: 9, product_gap: 5, color_scheme: 'default-color-scheme'}, undefined, 'a');
      ok(await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-a img')].every(i => i.__mark === i.getAttribute('src'))), tag + ': picture elements and addresses kept');
    }
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
    eq(await t.page.evaluate(() => window.MateriaProductsD.roots.size), 2, tag + ': redraws leave one controller per section');
    if (name === 'product-set') ok(await t.page.evaluate(() => window.MateriaProductsD.timers()) <= 2, tag + ': no duplicate timers');
    const addType = {addtocartbutton: 'heading', 'product-set': 'heading', 'product-shop-the-look': 'eyebrow'}[name];
    if (addType) {
      const blocks = [...cfg.blocks().filter(b => b.type !== addType), {type: addType, settings: {text: 'Added block'}}];
      await t.redraw({uid: 'a', blocks});
      const id = 'a-b' + (blocks.length - 1);
      eq((await t.page.locator('[data-pd-block="' + id + '"]').textContent()).trim(), 'Added block', tag + ' added block drawn');
      await t.emit({text: 'Edited added', enable_custom_style: true, color: '#00ff00'}, id, 'a');
      eq((await t.page.locator('[data-pd-block="' + id + '"]').textContent()).trim(), 'Edited added', tag + ' added block live');
      eq(await t.page.locator('[data-pd-block="' + id + '"]').evaluate(e => getComputedStyle(e).color), 'rgb(0, 255, 0)', tag + ' added block colour live');
    }
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* The theme reveal on scroll: on adds the theme's scroll trigger, off marks the section for the layout. */
async function reveal(browser, name) {
  if (!schemaOf(name).schema.settings.some(x => x.id === 'reveal')) return;
  for (const v of [true, false]) {
    const t = await mount(browser, name, {width: 375, editing: false, ...cfgMount(name), settings: {...CFG[name].settings, reveal: v}, theme: {scroll_animation: 'fade-in'}, assets: ASSETS});
    eq(await t.page.evaluate(() => document.querySelector('#shopify-section-test').classList.contains('scroll-trigger')), v, name + ' reveal ' + v + ' theme animation');
    eq(await t.page.locator('#shopify-section-test [data-ti-no-reveal]').count(), v ? 0 : 1, name + ' reveal ' + v + ' layout marker');
    eq(t.errors, [], name + ' reveal errors');
    await t.page.close();
  }
}

/* Empty pickers: a tidy preview in the builder, nothing broken on the storefront. */
async function empty(browser, name) {
  const cfg = CFG[name], noProduct = b => b.map(x => x.type === 'set' || x.type === 'product' ? {type: x.type} : x);
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const tag = name + ' empty @' + width + (editing ? ' editor' : ' storefront');
    const t = await mount(browser, name, {width, editing, settings: {}, blocks: noProduct(cfg.blocks()), assets: ASSETS});
    const root = await t.page.locator(ROOT).count();
    if (editing) {
      eq(root, 1, tag + ' preview drawn');
      const h = await t.root(ROOT).evaluate(e => e.getBoundingClientRect().height);
      ok(h > 40 && h < 1600, tag + ' preview has a real height (' + h + ')');
      ok(!/R\$|\$\d/.test(await t.root(ROOT).innerText()), tag + ' preview shows no invented price');
      await t.page.screenshot({path: path.join(process.env.SHOTS || '/tmp', name + '-empty-' + width + '.png'), fullPage: true});
    } else if (name === 'product-shop-the-look') {
      eq(await t.page.locator('.pstl__card').count(), 0, tag + ' no empty product cards on the storefront');
    } else eq(root, 0, tag + ' nothing drawn on the storefront');
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* Quick Add to Cart: the theme's cart form, real variant ids, sold out, picker, product-form, checkout. */
async function atc(browser) {
  const name = 'addtocartbutton';
  for (const width of [375, 1366]) {
    let t = await mount(browser, name, {width, editing: false, settings: {selected_product: MIXED, show_variant_picker: true, after_add: 'cart'}, blocks: [{type: 'button', settings: {text: 'Add it'}}], assets: ASSETS});
    const form = t.root('form.pd-atc__form');
    eq(await form.getAttribute('action'), '/cart/add', width + ' posts to the cart');
    eq(await t.page.locator('#shopify-section-test product-form form').count(), 1, width + ' open cart goes through the theme product-form');
    eq(await t.root('[name=return_to]').count(), 0, width + ' open cart stays on the page');
    const sel = t.root('select[name=id]');
    eq(await sel.inputValue(), MIXED.variants[0].id, width + ' first variant selected');
    ok((await sel.boundingBox()).height >= 44, width + ' variant picker target');
    eq(await t.page.locator('#shopify-section-test label[for="' + await sel.getAttribute('id') + '"]').textContent(), 'Size / Color', width + ' picker labelled with the option names');
    await sel.selectOption(MIXED.variants[1].id);
    await t.page.waitForTimeout(50);
    eq(await t.root('.pd-atc__button').isDisabled(), true, width + ' sold out variant disables the button');
    eq((await t.root('.pd-atc__label').textContent()).trim(), await t.root(ROOT).getAttribute('data-pd-sold-out'), width + ' sold out label');
    await sel.selectOption(MIXED.variants[2].id); await t.page.waitForTimeout(50);
    eq(await t.root('.pd-atc__button').isDisabled(), false, width + ' available variant enables the button');
    eq((await t.root('.pd-atc__label').textContent()).trim(), 'Add it', width + ' label back');
    eq(await t.page.evaluate(() => new FormData(document.querySelector('#shopify-section-test form')).get('id')), MIXED.variants[2].id, width + ' the form posts the selected variant id');
    await sel.focus(); ok(await sel.evaluate(e => getComputedStyle(e).outlineStyle !== 'none' || e.matches(':focus-visible')), width + ' picker focus visible');
    eq(t.errors, [], width + ' atc errors');
    await t.page.close();
    /* checkout and sold out products */
    t = await mount(browser, name, {width, editing: false, settings: {selected_product: GONE}, blocks: [{type: 'button'}], assets: ASSETS});
    eq(await t.root('[name=return_to]').getAttribute('value'), '/checkout', width + ' checkout returns to checkout');
    eq(await t.root('[name=id]').getAttribute('value'), GONE.variants[0].id, width + ' hidden id is the selected variant');
    eq(await t.root('.pd-atc__button').isDisabled(), true, width + ' sold out product disabled');
    eq((await t.root('.pd-atc__label').textContent()).trim(), await t.root(ROOT).getAttribute('data-pd-sold-out'), width + ' sold out product label');
    await t.emit({text: 'Changed'}, t.blockId('button'));
    eq((await t.root('.pd-atc__label').textContent()).trim(), await t.root(ROOT).getAttribute('data-pd-sold-out'), width + ' live label edit keeps the sold out label');
    eq(t.errors, [], width + ' atc sold out errors');
    await t.page.close();
    /* the product page's product when the picker is empty; the legacy label without a button block */
    t = await mount(browser, name, {width, editing: false, settings: {button_text: 'Legacy label'}, blocks: [], globals: {product: PANTS}, assets: ASSETS});
    eq(await t.root('[name=id]').getAttribute('value'), PANTS.variants[0].id, width + ' empty picker uses the page product');
    eq((await t.root('.pd-atc__label').textContent()).trim(), 'Legacy label', width + ' legacy button label when there is no button block');
    await t.page.close();
    t = await mount(browser, name, {width, editing: true, settings: {button_text: 'Legacy label', selected_product: PANTS}, blocks: [], assets: ASSETS});
    await t.emit({button_text: 'Legacy live'});
    eq((await t.root('.pd-atc__label').textContent()).trim(), 'Legacy live', width + ' legacy label live');
    await t.page.close();
  }
}

/* Discount Price: prices from the product, compare price only when higher, sold out, legacy text. */
async function prices(browser) {
  const name = 'dynamic-pricing';
  let t = await mount(browser, name, {width: 375, editing: false, settings: {product: CHEAP}, assets: ASSETS});
  eq(await t.root('.pd-price__original').isHidden(), true, 'no compare price when it is not higher');
  eq((await t.root('[data-pd-sale]').textContent()).trim(), 'R$50.00', 'price from the product (money filter)');
  await t.page.close();
  t = await mount(browser, name, {width: 375, editing: false, settings: {product: GONE}, assets: ASSETS});
  ok(await t.root('.pd-price__badge').isVisible(), 'sold out badge');
  await t.page.close();
  t = await mount(browser, name, {width: 375, editing: false, settings: {}, globals: {product: PANTS}, assets: ASSETS});
  eq((await t.root('[data-pd-original]').textContent()).trim(), 'R$211.93', 'product page product when the picker is empty');
  await t.page.close();
  t = await mount(browser, name, {width: 1366, editing: true, settings: {original_price: '$40', discounted_price: '<strong>$30</strong>', show_currency_symbol: true, currency: 'EUR'}, assets: ASSETS});
  eq(await t.root(ROOT).getAttribute('data-mode'), 'legacy', 'saved typed prices still show');
  eq((await t.root('.pd-price__currency').textContent()).trim(), 'EUR', 'legacy currency text');
  await t.emit({discounted_price: '<strong>$25</strong>'});
  eq((await t.root('[data-pd-sale]').textContent()).trim(), '$25', 'legacy price live');
  eq(t.errors, [], 'prices errors');
  await t.page.close();
}

/* Products set carousel: arrows, dots, keyboard, drag, loop, autoplay, per instance, reduced motion. */
async function carousel(browser) {
  const name = 'product-set';
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: false, instances: [{uid: 'a', ...cfgMount(name)}, {uid: 'b', ...cfgMount(name)}], globals: {product: PANTS}, assets: ASSETS});
    const tr = t.page.locator('#shopify-section-a .pd-set__track');
    const next = t.page.locator('#shopify-section-a .pd-set__arrow--next');
    ok((await next.boundingBox()).width >= 44, width + ' arrow target');
    eq(await t.page.locator('#shopify-section-a .pd-set__arrow--prev').isDisabled(), true, width + ' prev disabled at the start');
    await next.click(); await t.page.waitForTimeout(700);
    ok(await tr.evaluate(e => e.scrollLeft) > 0, width + ' next scrolls');
    eq(await t.page.locator('#shopify-section-b .pd-set__track').evaluate(e => e.scrollLeft), 0, width + ' the other instance stays');
    eq(await t.page.locator('#shopify-section-a .pd-set__dot').first().getAttribute('aria-current'), null, width + ' pagination follows');
    eq(await t.page.locator('#shopify-section-a .pd-set__dot[aria-current="true"]').count(), 1, width + ' one current dot');
    eq(await t.page.locator('#shopify-section-b .pd-set__dot').first().getAttribute('aria-current'), 'true', width + ' other pagination stays');
    await t.page.locator('#shopify-section-a .pd-set__dot').first().click(); await t.page.waitForTimeout(700);
    eq(await tr.evaluate(e => e.scrollLeft), 0, width + ' dot goes to its slide');
    ok((await t.page.locator('#shopify-section-a .pd-set__dot').first().boundingBox()).height >= 44, width + ' dot target height');
    await tr.focus(); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(700);
    ok(await tr.evaluate(e => e.scrollLeft) > 0, width + ' arrow key scrolls');
    await t.page.keyboard.press('ArrowLeft'); await t.page.waitForTimeout(700);
    eq(await tr.evaluate(e => e.scrollLeft), 0, width + ' arrow key back');
    const box = await tr.boundingBox();
    await t.page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2); await t.page.mouse.down();
    await t.page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, {steps: 8}); await t.page.mouse.up(); await t.page.waitForTimeout(700);
    ok(await tr.evaluate(e => e.scrollLeft) > 0, width + ' mouse drag scrolls');
    /* loop: next at the end goes back to the first set */
    await t.emit({infinite: true}, undefined, 'a');
    await tr.evaluate(e => { e.style.scrollBehavior = 'auto'; e.scrollLeft = e.scrollWidth; }); await t.page.waitForTimeout(100);
    await tr.evaluate(e => e.style.removeProperty('scroll-behavior'));
    await next.click(); await t.page.waitForTimeout(800);
    eq(await tr.evaluate(e => e.scrollLeft), 0, width + ' loop wraps to the first set');
    /* autoplay advances, and only for the section that has it */
    await t.page.mouse.move(0, 0); await t.page.evaluate(() => document.activeElement && document.activeElement.blur());
    await t.emit({autoplay: true, autorotate_speed: 2}, undefined, 'a');
    await t.page.waitForTimeout(2900);
    ok(await tr.evaluate(e => e.scrollLeft) > 0, width + ' autoplay advances');
    eq(await t.page.locator('#shopify-section-b .pd-set__track').evaluate(e => e.scrollLeft), 0, width + ' autoplay only in its own section');
    eq(await t.page.evaluate(() => window.MateriaProductsD.timers()), 1, width + ' one timer');
    await t.page.evaluate(() => { document.querySelector('#shopify-section-a').remove(); });
    await t.page.waitForTimeout(100);
    eq(await t.page.evaluate(() => window.MateriaProductsD.timers()), 0, width + ' removed section stops its timer');
    ok(await t.noOverflow(), width + ' carousel no page overflow');
    eq(t.errors, [], width + ' carousel errors');
    await t.page.close();
  }
  /* reduced motion: no autoplay, everything visible */
  const t = await mount(browser, name, {width: 1366, editing: false, ...cfgMount(name), settings: {...CFG[name].settings, autoplay: true, autorotate_speed: 2}, reducedMotion: 'reduce', assets: ASSETS});
  await t.page.waitForTimeout(2500);
  eq(await t.root('.pd-set__track').evaluate(e => e.scrollLeft), 0, 'reduced motion: no autoplay');
  eq(await t.page.evaluate(() => window.MateriaProductsD.timers()), 0, 'reduced motion: no timer');
  ok(await t.root('.pd-set__slide').first().isVisible(), 'reduced motion: sets visible');
  eq(t.errors, [], 'reduced motion errors');
  await t.page.close();
}

/* The saved Products set on templates/product.json, against the section before this change. */
async function savedSet(browser) {
  const name = 'product-set', tj = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates/product.json'), 'utf8'));
  const saved = tj.sections['product-set'];
  let oldRaw; try { oldRaw = execSync('git show 61b5e95:sections/' + name + '.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8'}); } catch (_) { return 0; }
  const withSet = clone(PANTS); withSet.metafields = {custom: {product_set: {value: [{product_item: {value: [OTHER, TALL]}}, {product_item: {value: [TALL, OTHER, PANTS]}}]}}};
  let compared = 0;
  for (const width of [375, 1366]) {
    const look = async (raw) => {
      const file = path.join(__dirname, '../sections', '__pd_tmp_' + name + '.storelib');
      fs.writeFileSync(file, raw);
      try {
        const t = await mount(browser, '__pd_tmp_' + name, {width, editing: false, settings: saved.settings, blocks: [], globals: {product: withSet}, assets: ASSETS});
        const r = await t.page.evaluate(() => {
          const h = document.querySelector('#shopify-section-test h2'), cs = h && getComputedStyle(h);
          return {heading: h && h.textContent.trim(), color: cs && cs.color, size: cs && cs.fontSize, family: cs && cs.fontFamily, cards: [...document.querySelectorAll('#shopify-section-test .product-item a[aria-label]')].map(a => a.getAttribute('aria-label')).slice(0, 6), count: document.querySelectorAll('#shopify-section-test .swiper-slide, #shopify-section-test .pd-set__slide').length};
        });
        await t.page.close();
        return r;
      } finally { fs.unlinkSync(file); }
    };
    const was = await look(oldRaw), now = await look(fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8'));
    eq(now, was, 'saved product-set @' + width + ' heading, cards and sets as before');
    compared++;
  }
  return compared;
}

(async () => {
  const only = process.argv.slice(2), names = Object.keys(CFG).filter(n => !only.length || only.includes(n));
  const browser = await launch();
  let saved = 0;
  try {
    for (const n of names) {
      eq(schemaProblems(n), [], n + ' schema');
      const {schema} = schemaOf(n), ids = schema.settings.filter(x => x.id).map(x => x.id);
      eq(new Set(ids).size, ids.length, n + ' unique ids');
      for (const b of schema.blocks || []) { const bi = b.settings.filter(x => x.id).map(x => x.id); eq(new Set(bi).size, bi.length, n + ' ' + b.type + ' unique ids'); }
      for (const x of schema.settings) if (x.type === 'select' && x.options.length <= 3 && !x.hidden) ok(x.options.every(o => o.label.split(' ').length <= 2), n + ' ' + x.id + ' button labels are a word or two');
    }
    const covered = {};
    await Promise.all(names.map(async n => { covered[n] = 0; for (const w of [375, 1366]) covered[n] = Math.max(covered[n], await everyControl(browser, n, w)); }));
    await Promise.all(names.map(async n => { for (const w of [375, 1366]) for (const e of [true, false]) await theme(browser, n, w, e); }));
    await Promise.all(names.map(n => lifecycle(browser, n)));
    await Promise.all(names.map(n => reveal(browser, n)));
    await Promise.all(names.map(n => empty(browser, n)));
    if (names.includes('addtocartbutton')) await atc(browser);
    if (names.includes('dynamic-pricing')) await prices(browser);
    if (names.includes('product-set')) { await carousel(browser); saved = await savedSet(browser); }
    console.log(checks + ' products-d checks passed (controls covered: ' + Object.entries(covered).map(([n, c]) => n + ' ' + c).join(', ') + '; saved Products set compared with the previous version: ' + saved + ')');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
