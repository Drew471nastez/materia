/* Round 7, Products: Recently Viewed (sections/recently-viewed.storelib) and
   Product Duo (sections/product-duo.storelib), with their controller
   shopify/assets/live-r7-products.js and stylesheet shopify/assets/r7-products.css.

   Both sections, at 375 and 1366, in the builder (editing) and on a visitor's
   page: file format and schema, theme inheritance (with the real theme
   priority rules on, and once with them off), colour schemes, custom styling
   and fonts on and off, every section and block control (live and after a
   server redraw, and the live paint equal to the redraw), desktop and mobile
   values, selects pairwise distinct, two instances, added blocks and
   redraws, pictures kept, first paint equal to the hydrated paint, reduced
   motion, no overflow and no errors.

   Recently Viewed: the visitor's list (localStorage ids, newest first,
   capped, never the product being viewed), the one bounded request and its
   reuse, the theme's own product cards, hidden with nothing to show, the
   search answer the section draws, and the row as a native scroller (touch
   style scrollLeft, snap, arrows, keys, ends, progress).
   Product Duo: real titles, prices (money filter, compare only when higher),
   sold out, the product page link and the theme's add to cart form, points
   under their product, empty pickers, and the Swipe row on phones.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-products.cjs [recently-viewed|product-duo] */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const {launch, mount, render, schemaOf, schemaProblems, PANTS, OTHER, TALL} = require('./media-fixture.cjs');
const CSS = 'r7-products.css', JS = 'live-r7-products.js', ASSETS = [CSS, JS];
const KEY = 'materia__recently-viewed-products';
const ROOT = path.join(__dirname, '..');
const clone = o => JSON.parse(JSON.stringify(o));
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
const mk = (base, id, extra = {}) => ({...clone(base), id, handle: id, title: 'Item ' + id, url: '/products/' + id, ...extra});
/* Ten products with ids of their own, the store's catalogue in these tests. */
const CATALOG = Array.from({length: 10}, (_, i) => mk([PANTS, OTHER, TALL][i % 3], 'p' + (i + 1)));
const BY_ID = Object.fromEntries(CATALOG.map(p => [p.id, p]));
const SOLO = mk(PANTS, 'solo', {title: 'Solo Kit', variants: [clone(PANTS.variants[0])], has_only_default_variant: true, compare_at_price: 0, compare_at_price_max: 0, price: 4900, price_varies: false});
SOLO.selected_or_first_available_variant = SOLO.variants[0];
const SOLD = mk(PANTS, 'sold', {title: 'Sold Kit', available: false, variants: PANTS.variants.map(v => ({...clone(v), available: false}))});
SOLD.selected_or_first_available_variant = SOLD.variants[0];
const SOLD_SOLO = mk(SOLO, 'sold-solo', {available: false, variants: [{...clone(SOLO.variants[0]), available: false}]});
SOLD_SOLO.selected_or_first_available_variant = SOLD_SOLO.variants[0];
/* Theme settings as a store has them: the schema's defaults, then config/settings.json. */
const THEME = (() => { const d = {}; for (const g of JSON.parse(fs.readFileSync(path.join(ROOT, 'shopify/config/settings_schema.json'), 'utf8'))) for (const x of g.settings || []) if (x.id && x.default !== undefined) d[x.id] = x.default; const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/settings.json'), 'utf8')).shopify; delete t.color_schemes; delete d.color_schemes; return {...d, ...t, scroll_animation: 'none'}; })();
const GLOBALS = {collections: {all: {products: CATALOG}}, routes: {all_products_collection_url: '/collections/all', cart_add_url: '/cart/add', cart_url: '/cart', root_url: '/', search_url: '/search'}};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const near = (a, b, tol, m) => { assert.ok(Math.abs(a - b) <= tol, m + ' (' + a + ' vs ' + b + ')'); checks++; };
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);
const pxn = v => parseFloat(v) || 0;

/* ------------------------------------------------------------ section configs */
const CFG = {
  'recently-viewed': {
    root: '.r7rv', heading: '.r7k-heading', text: '.r7k-sub',
    blocks: () => [{type: 'eyebrow'}, {type: 'heading'}, {type: 'subheading'}],
    settings: () => ({}),
    desk: ['items_per_row', 'show_arrows'], mob: ['items_per_row_mobile'],
    /* what a live edit leaves to the builder's redraw */
    structural: (id, v, cur) => id === 'products_to_show' && v > cur,
    vals: {column_gap: [0], products_to_show: [3]},
    selects: ['header_alignment', 'section_width'],
  },
  'product-duo': {
    root: '.r7duo', heading: '.r7k-heading', text: '.r7k-sub', button: '.r7duo__btn',
    blocks: () => [{type: 'eyebrow'}, ...presetBlocks('product-duo')].map(b => b.type === 'product' ? {...b, settings: {product: null}} : b),
    fill: blocks => { let n = 0; return blocks.map(b => b.type === 'product' ? {...b, settings: {...b.settings, product: [CATALOG[0], SOLO][n++ % 2]}} : b); },
    settings: () => ({}),
    desk: ['column_gap'], mob: ['mobile_layout'],
    structural: id => ['product', 'image', 'button_action'].includes(id),
    pre: {card_bg: {card_style: 'filled'}},
    vals: {},
    selects: ['header_alignment', 'section_width', 'content_alignment', 'card_style', 'image_ratio', 'mobile_layout'],
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
    case 'text': return ['Edited text'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <strong>copy</strong></p>'];
    case 'font_picker': return [FONT];
    case 'image_picker': return [IMG];
    case 'product': return [CATALOG[4]];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
/* The settings a control's visible_if asks for. */
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
const widthOk = (cfg, id, width) => /_mobile$/.test(id) || (cfg.mob || []).includes(id) ? width < 768 : /_desktop$/.test(id) || (cfg.desk || []).includes(id) ? width >= 768 : true;

/* ------------------------------------------------------------ page helpers */
async function addFp(page) {
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight', 'textAlign', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap', 'flexDirection', 'alignItems', 'justifyContent', 'borderTopLeftRadius', 'aspectRatio', 'opacity', 'display', 'gridTemplateColumns', 'borderTopWidth', 'borderTopColor', 'borderBottomColor', 'overflowX', 'scrollSnapType', 'transform'];
    const SKIP = /^(style|data-r7k-settings|class|srcset|sizes|loading|decoding|src|width|height|id|tabindex|role|aria-labelledby|aria-label|aria-busy|data-rv-state|data-rv-url|data-rv-sample)$/;
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-r7k-root]'), out = {}, seen = {};
      const ws = getComputedStyle(wrap), wr = wrap.getBoundingClientRect();
      out.wrap = {marginTop: ws.marginTop, marginBottom: ws.marginBottom, display: ws.display, height: Math.round(wr.height)};
      if (!root || root.hidden) return out;
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.closest('template,[hidden]') || e.ownerSVGElement || /^(SCRIPT|STYLE|TEMPLATE|LINK)$/.test(e.tagName)) continue;
        /* a theme product card is the theme's own drawing: its box counts, its inside is the card tests' */
        const card = e.closest('.product-item'); if (card && card !== e) continue;
        const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
        let k = e.tagName + '.' + (cls.split(' ')[0] || '');
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const p of P) o[p] = cs[p];
        o.rect = r.width || r.height ? [r.x - wr.x, r.y - wr.y, r.width, r.height].map(Math.round).join(',') : 'none';
        for (const v of ['--mb-hover-bg', '--mb-hover-text', '--mb-hover-border']) o[v] = cs.getPropertyValue(v).trim();
        if (!e.children.length || /^(H\d|P|A|BUTTON|SPAN|LI)$/.test(e.tagName)) o.text = e.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
        o.html = /^(H\d|LI|DIV)$/.test(e.tagName) && e.matches('.r7k-heading,.r7k-sub,.r7duo__point') ? e.innerHTML.trim() : '';
        o.cls = cls.split(/\s+/).filter(Boolean).sort().join(' ');
        o.attrs = [...e.attributes].filter(a => !SKIP.test(a.name)).map(a => a.name + '=' + a.value).sort().join('|');
        if (e.tagName === 'IMG') o.src = (e.getAttribute('src') || '').split('?')[0];
        const b = getComputedStyle(e, '::before'); if (b.content !== 'none') o.before = [b.display, b.width, b.height, b.backgroundColor].join();
        out[k] = o;
      }
      return out;
    };
    window.__frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}
const settle = async t => {
  await t.page.evaluate(() => window.__frames());
  await t.page.waitForFunction(() => !document.querySelector('[data-r7k-track][aria-busy]') && !document.getAnimations().some(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('[data-r7k-root]') && !a.effect.target.closest('.product-item')), null, {timeout: 30000});
  await t.page.evaluate(() => window.__frames());
};
const fp = async (t, uid = 'test') => { await settle(t); return t.page.evaluate(u => window.__fp(u), uid); };
const diff = (a, b) => { const out = []; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { if (!a[k] || !b[k]) { out.push(k + (a[k] ? ' gone' : ' new')); continue; } for (const p of Object.keys(a[k])) if (a[k][p] !== b[k][p]) out.push(k + ' ' + p + ': ' + a[k][p] + ' -> ' + b[k][p]); } return out; };
const audit = (t, uid = 'test') => t.page.evaluate(u => { const r = document.querySelector('#shopify-section-' + u + ' [data-r7k-root]'); return r ? window.MateriaR7Products.audit(r) : ['no root']; }, uid);

/* What Storelib answers /search?q=id:..&section_id=recently-viewed with: the section drawn with search.results. */
async function searchAnswer(url) {
  const ids = (url.searchParams.get('q') || '').split(' OR ').map(x => x.replace(/^id:/, ''));
  const results = ids.map(id => BY_ID[id]).filter(Boolean);
  const r = await render('recently-viewed', {editing: false, uid: 'recently-viewed', theme: THEME, globals: {...GLOBALS, search: {performed: true, terms: url.searchParams.get('q'), results}}});
  return '<div id="shopify-section-recently-viewed" class="shopify-section">' + r.html + '</div>';
}
/* Mount with a visitor's list in localStorage and the search answer mocked. requests collects every /search call. */
async function mountWith(browser, name, opts = {}) {
  const {ids = null, requests = [], fail = false, assets = ASSETS, ...rest} = opts;
  const cfg = CFG[name];
  const base = {theme: THEME, globals: GLOBALS, blocks: rest.instances ? undefined : cfg.blocks(), ...rest, settings: {...cfg.settings(), ...(rest.settings || {})}};
  const t = await mount(browser, name, {...base, assets: assets.filter(a => a !== JS)});
  t.requests = requests;
  await t.page.route(u => u.pathname === '/search', async r => {
    const u = new URL(r.request().url()); requests.push(u);
    if (fail === true || (typeof fail === 'function' && fail(u))) return r.fulfill({status: 500, body: 'no'});
    return r.fulfill({contentType: 'text/html', body: await searchAnswer(u)});
  });
  if (ids) await t.page.evaluate(({k, ids}) => localStorage.setItem(k, JSON.stringify(ids)), {k: KEY, ids});
  else await t.page.evaluate(k => localStorage.removeItem(k), KEY);
  await addFp(t.page);
  if (assets.includes(JS)) await t.page.addScriptTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', JS), 'utf8')});
  await settle(t);
  return t;
}
/* The usual mount of a section for the control checks: in the builder the samples, on a visitor's page a saved list. */
const IDS = ['p3', 'p1', 'p7', 'p2', 'p9', 'p5', 'p8', 'p4'];
const usual = (browser, name, width, editing, opts = {}) => mountWith(browser, name, {width, editing, ...(name === 'recently-viewed' && !editing ? {ids: IDS} : {}), ...(name === 'product-duo' && !opts.blocks && !opts.instances ? {blocks: CFG[name].fill(CFG[name].blocks())} : {}), ...opts});

/* ------------------------------------------------------------ static */
function staticChecks(name) {
  const raw = fs.readFileSync(path.join(ROOT, 'sections', name + '.storelib'), 'utf8'), lines = raw.split('\n'), s = schemaOf(name).schema;
  eq(schemaProblems(name), [], name + ': schema problems');
  eq(lines[0], '<template compat="shopify">', name + ': line 1');
  eq(lines[1], `<script src="{{ 'live-r7-products.js' | asset_url }}" defer="defer"></script>`, name + ': line 2 links the controller');
  eq(lines[2], "{% render 'theme-type' %}", name + ': theme type first');
  eq(Object.keys(JSON.parse(raw.split('<schema>')[1].split('</schema>')[0])).includes('shopify'), true, name + ': the schema has the theme\'s own object (Storelib adds its panel)');
  ok(s.name.length <= 25, name + ': name fits the library card');
  const sameName = fs.readdirSync(path.join(ROOT, 'sections')).filter(f => f.endsWith('.storelib') && f !== name + '.storelib').filter(f => { try { const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'sections', f), 'utf8').split('<schema>')[1].split('</schema>')[0]); return ((j.shopify || j).name || '').toLowerCase() === s.name.toLowerCase(); } catch (_) { return false; } });
  eq(sameName, [], name + ': no other section has this name');
  eq([s.presets[0].name, s.presets[0].category], [s.name, 'Products'], name + ': preset name and category');
  const ids = s.settings.filter(x => x.id).map(x => x.id);
  eq(ids.slice(0, 3), ['color_scheme', 'section_width', 'reset_spacing'], name + ': General group order');
  for (const id of ['padding_top', 'padding_bottom', 'section_margin_top_desktop', 'section_margin_bottom_desktop', 'section_margin_top_mobile', 'section_margin_bottom_mobile', 'enable_custom_style', 'enable_custom_fonts', 'heading_font', 'body_font']) ok(ids.includes(id), name + ': has ' + id);
  /* the same spacing controls as Products carousel */
  const ref = schemaOf('products-carousel').schema.settings;
  for (const id of ['padding_top', 'padding_bottom', 'section_margin_top_desktop', 'section_margin_bottom_mobile']) { const a = s.settings.find(x => x.id === id), b = ref.find(x => x.id === id); eq([a.min, a.max, a.step, a.default], [b.min, b.max, b.step, b.default], name + ': ' + id + ' as in Products carousel'); }
  const groups = s.settings.filter(x => x.type === 'header').map(x => x.content);
  const ORDER = ['General', 'Content', 'Layout', 'Images', 'Scrolling', 'Appearance', 'Typography', 'Desktop spacing', 'Mobile'];
  eq(groups, ORDER.filter(g => groups.includes(g)), name + ': groups in the shared order');
  /* copy: no banned words, no em dash, no invented numbers */
  const words = [];
  const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (typeof v === 'string' && ['label', 'info', 'content', 'name', 'default', 'text'].includes(k)) words.push(v); else walk(v); } };
  walk(s);
  const bad = words.filter(w => /\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b|—|–/i.test(w));
  eq(bad, [], name + ': copy');
  for (const b of s.blocks) for (const x of b.settings) if (['text', 'inline_richtext', 'richtext'].includes(x.type) && x.default) ok(!/\d/.test(x.default.replace(/<[^>]+>/g, '')), name + ': no number invented in ' + b.type + '.' + x.id);
  ok(!/<template[\s>]/.test(raw.split('\n').slice(1).join('\n').split('\n</template>')[0]), name + ': no nested template element');
  ok(!/touch-action:\s*none|preventDefault\(\)[^;]*;[^}]*(wheel|touchmove)/.test(fs.readFileSync(path.join(ROOT, 'shopify/assets', JS), 'utf8') + fs.readFileSync(path.join(ROOT, 'shopify/assets', CSS), 'utf8')), name + ': nothing traps the page scroll');
}

/* ------------------------------------------------------------ checks shared by both sections */
async function inheritance(browser, name, width, editing) {
  const cfg = CFG[name], tag = `${name} ${width} ${editing ? 'editor' : 'store'}`;
  for (const priority of width === 1366 && editing ? [true, 'off'] : [true]) {
    const t = await usual(browser, name, width, editing, {priority});
    eq(await t.css(cfg.root, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ': scheme background');
    eq(await t.css(cfg.heading, 'color'), 'rgb(255, 255, 255)', tag + ': heading colour');
    ok(/Georgia/.test(await t.css(cfg.heading, 'fontFamily')), tag + ': heading font');
    eq(await t.css(cfg.heading, 'fontWeight'), '700', tag + ': heading weight');
    eq(await t.root(cfg.heading).evaluate(el => el.tagName), 'H2', tag + ': the section heading is an h2');
    eq(await t.css(cfg.text, 'color'), 'rgb(204, 204, 204)', tag + ': text colour');
    ok(/Arial/.test(await t.css(cfg.text + ' p', 'fontFamily')), tag + ': body font');
    ok(/Arial/.test(await t.css('.r7k-eyebrow', 'fontFamily')), tag + ': eyebrow font');
    eq(await t.css(cfg.heading, 'fontSize'), width < 768 ? '26px' : '32px', tag + ': heading size at this width');
    if (cfg.button) {
      eq(await t.css(cfg.button, 'backgroundColor'), 'rgb(18, 52, 86)', tag + ': theme button background');
      eq(await t.css(cfg.button, 'borderTopLeftRadius'), '12px', tag + ': theme button radius');
      await t.root(cfg.button).first().hover();
      eq(await t.css(cfg.button, 'backgroundColor'), 'rgb(255, 0, 0)', tag + ': theme button hover');
      await t.page.mouse.move(0, 0);
      ok((await t.root(cfg.button).first().evaluate(el => el.getBoundingClientRect().height)) >= 44, tag + ': button is a 44px target');
      eq(await t.root('.r7duo__title').first().evaluate(el => el.tagName), 'H3', tag + ': items are h3');
      ok(/Georgia/.test(await t.css('.r7duo__title', 'fontFamily')), tag + ': product title in the heading font');
      eq(await t.css('.r7duo__title', 'color'), 'rgb(255, 255, 255)', tag + ': product title colour');
      eq(await t.css('.r7duo__point', 'color'), 'rgb(204, 204, 204)', tag + ': points colour');
      eq(await t.css('.r7duo__point', 'borderTopColor'), 'rgb(68, 85, 102)', tag + ': lines in the scheme border colour');
    } else {
      eq(await t.css('.r7rv__arrow', 'color'), 'rgb(255, 255, 255)', tag + ': arrows in the heading colour');
      ok((await t.root('.product-item').count()) > 0, tag + ': the theme\'s own product cards');
    }
    if (editing) eq(await audit(t), [], tag + ': the markup carries what the controller derives');
    ok(await t.noOverflow(), tag + ': no sideways page scroll');
    eq(t.errors, [], tag + ': no errors');
    await t.page.close();
  }
}

async function schemes(browser, name, width, editing) {
  const cfg = CFG[name], tag = `${name} ${width} ${editing ? 'editor' : 'store'} scheme`;
  const t = await usual(browser, name, width, editing);
  await t.emit({color_scheme: 'alt-scheme'});
  await settle(t);
  eq(await t.css(cfg.root, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ': live background');
  eq(await t.css(cfg.heading, 'color'), 'rgb(16, 16, 16)', tag + ': live heading');
  eq(await t.css(cfg.text, 'color'), 'rgb(51, 51, 51)', tag + ': live text');
  await t.redraw({settings: {color_scheme: 'alt-scheme'}});
  await settle(t);
  eq(await t.css(cfg.root, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ': redraw background');
  eq(await t.css(cfg.heading, 'color'), 'rgb(16, 16, 16)', tag + ': redraw heading');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* Every visible control of the section and of every block type: the change shows (live and after a redraw), and the live paint is the redraw's. */
async function everyControl(browser, name, width, editing) {
  const cfg = CFG[name], {schema} = schemaOf(name), tag = `${name} ${width} ${editing ? 'editor' : 'store'}`;
  const t = await usual(browser, name, width, editing);
  const baseSettings = clone(t.section.settings), baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: b.settings}));
  const reset = async () => { await t.redraw({settings: baseSettings, blocks: baseBlocks}); return fp(t); };
  let tried = 0;
  const lists = [['section', schema.settings, null], ...schema.blocks.map(b => ['block ' + b.type, b.settings, b.type])];
  for (const [where, list, btype] of lists) {
    for (const x of list) {
      if (!x.id || x.hidden || !widthOk(cfg, x.id, width)) continue;
      const bi = btype ? baseBlocks.findIndex(b => b.type === btype) : -1;
      const cur0 = btype ? baseBlocks[bi].settings : baseSettings;
      const pre = {...prereq(x, list, cur0), ...(COMMON_PRE[x.id] || {}), ...((cfg.pre || {})[x.id] || {})};
      const blockPre = btype ? pre : {}, sectionPre = btype ? {} : pre;
      const withPre = async () => { await t.redraw({settings: {...baseSettings, ...sectionPre}, blocks: baseBlocks.map((b, i) => i === bi ? {...b, settings: {...b.settings, ...blockPre}} : b)}); return fp(t); };
      for (const v of (cfg.vals[x.id] || valuesFor(x, cur0[x.id]))) {
        const label = `${tag} ${where}.${x.id}=${typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : v}`;
        const before = await withPre();
        const structural = cfg.structural(x.id, v, cur0[x.id]);
        let live = null;
        if (editing && !structural) {
          await t.emit({[x.id]: v}, btype ? t.blockId(btype) : undefined);
          live = await fp(t);
          ok(diff(before, live).length > 0, label + ': the live edit shows');
          await withPre();
        }
        await t.redraw({settings: {...baseSettings, ...sectionPre, ...(btype ? {} : {[x.id]: v})}, blocks: baseBlocks.map((b, i) => i === bi ? {...b, settings: {...b.settings, ...blockPre, [x.id]: v}} : b)});
        const after = await fp(t);
        ok(diff(before, after).length > 0, label + ': the redraw shows it');
        if (live) eq(diff(live, after), [], label + ': the live paint is the redraw\'s');
        if (editing) eq(await audit(t), [], label + ': markup and controller agree');
        tried++;
      }
    }
  }
  ok(tried > 10, tag + ': controls tried (' + tried + ')');
  await reset();
  eq(t.errors, [], tag + ': no errors after every control');
  ok(await t.noOverflow(), tag + ': no overflow after every control');
  await t.page.close();
}

async function selectsDistinct(browser, name, width, editing) {
  const cfg = CFG[name], {schema} = schemaOf(name), tag = `${name} ${width} ${editing ? 'editor' : 'store'}`;
  const t = await usual(browser, name, width, editing);
  for (const id of cfg.selects) {
    if (!widthOk(cfg, id, width)) continue;
    const x = schema.settings.find(y => y.id === id), seen = [];
    for (const o of x.options) { await t.redraw({settings: {[id]: o.value}}); seen.push([o.value, JSON.stringify(await fp(t))]); }
    for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
      /* three widths that fill the same phone look the same there: only the edge to edge one differs */
      if (id === 'section_width' && width < 768 && seen[i][0] !== 'full_width' && seen[j][0] !== 'full_width') continue;
      ok(seen[i][1] !== seen[j][1], `${tag} ${id}: ${seen[i][0]} and ${seen[j][0]} look different`);
    }
  }
  await t.page.close();
}

async function customStyle(browser, name, width, editing) {
  const cfg = CFG[name], tag = `${name} ${width} ${editing ? 'editor' : 'store'} custom`;
  const t = await usual(browser, name, width, editing);
  const theme = await fp(t);
  /* section colours */
  if (name === 'recently-viewed') {
    await t.emit({enable_custom_style: true, section_bg_override: '#102030', arrow_color: '#ff8800'}); await settle(t);
    eq(await t.css(cfg.root, 'backgroundColor'), 'rgb(16, 32, 48)', tag + ': background');
    eq(await t.css('.r7rv__arrow', 'color'), 'rgb(255, 136, 0)', tag + ': arrows');
    eq(await t.css('.r7rv__thumb', 'backgroundColor'), 'rgb(255, 136, 0)', tag + ': progress');
  } else {
    await t.emit({enable_custom_style: true, card_style: 'filled', section_bg_override: '#102030', card_bg: '#203040', line_color: '#ff8800', title_color: '#00ff88', text_color: '#8800ff', price_color: '#ffee00', button_bg: '#0000ff', button_text: '#ffff00', button_bg_hover: '#00ff00', button_text_hover: '#000001'}); await settle(t);
    eq(await t.css(cfg.root, 'backgroundColor'), 'rgb(16, 32, 48)', tag + ': background');
    eq(await t.css('.r7duo__card', 'backgroundColor'), 'rgb(32, 48, 64)', tag + ': card background');
    eq(await t.css('.r7duo__point', 'borderTopColor'), 'rgb(255, 136, 0)', tag + ': lines');
    eq(await t.css('.r7duo__title', 'color'), 'rgb(0, 255, 136)', tag + ': title');
    eq(await t.css('.r7duo__title a', 'color'), 'rgb(0, 255, 136)', tag + ': title link');
    eq(await t.css('.r7duo__point', 'color'), 'rgb(136, 0, 255)', tag + ': points');
    eq(await t.css('.r7duo__label', 'color'), 'rgb(136, 0, 255)', tag + ': label');
    eq(await t.css('.r7duo__now', 'color'), 'rgb(255, 238, 0)', tag + ': price');
    eq(await t.css(cfg.button, 'backgroundColor'), 'rgb(0, 0, 255)', tag + ': button background');
    eq(await t.css(cfg.button, 'color'), 'rgb(255, 255, 0)', tag + ': button text');
    await t.root(cfg.button).first().hover();
    eq(await t.css(cfg.button, 'backgroundColor'), 'rgb(0, 255, 0)', tag + ': button hover background');
    eq(await t.css(cfg.button, 'color'), 'rgb(0, 0, 1)', tag + ': button hover text');
    await t.page.mouse.move(0, 0);
  }
  /* an empty colour falls back to the scheme */
  await t.emit({section_bg_override: ''}); await settle(t);
  eq(await t.css(cfg.root, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ': empty colour is the scheme\'s');
  /* off: the theme again, exactly */
  await t.emit({enable_custom_style: false, card_style: 'plain'}); await settle(t);
  eq(diff(theme, await fp(t)), [], tag + ': off restores the theme (live)');
  await t.redraw({settings: {enable_custom_style: false, section_bg_override: '#102030', card_style: name === 'product-duo' ? 'plain' : undefined}});
  eq(diff(theme, await fp(t)), [], tag + ': off restores the theme (redraw, colours still saved)');
  /* block colours */
  for (const [type, sel, fallback] of [['eyebrow', '.r7k-eyebrow', 'rgb(204, 204, 204)'], ['heading', cfg.heading, 'rgb(255, 255, 255)'], ['subheading', cfg.text, 'rgb(204, 204, 204)']]) {
    await t.emit({enable_custom_style: true, color: '#ab12cd'}, t.blockId(type)); await settle(t);
    eq(await t.css(sel, 'color'), 'rgb(171, 18, 205)', tag + ': ' + type + ' colour (live)');
    if (type === 'subheading') eq(await t.css(sel + ' p', 'color'), 'rgb(171, 18, 205)', tag + ': subheading paragraph colour');
    await t.redraw({blocks: t.section.blocks.map(b => ({type: b.type, settings: b.type === type ? {...b.settings, enable_custom_style: true, color: '#ab12cd'} : b.settings}))});
    await settle(t);
    eq(await t.css(sel, 'color'), 'rgb(171, 18, 205)', tag + ': ' + type + ' colour (redraw)');
    await t.emit({enable_custom_style: false}, t.blockId(type)); await settle(t);
    eq(await t.css(sel, 'color'), fallback, tag + ': ' + type + ' colour off is the scheme\'s');
    await t.redraw({blocks: t.section.blocks.map(b => ({type: b.type, settings: b.type === type ? {...b.settings, enable_custom_style: false} : b.settings}))});
  }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* Round 3: custom fonts, sizes and the button's own shape win under the real theme rules, and off is the theme again. */
async function priority(browser, name, width, editing) {
  const cfg = CFG[name], tag = `${name} ${width} ${editing ? 'editor' : 'store'} priority`;
  const t = await usual(browser, name, width, editing, {priority: true});
  const theme = await fp(t);
  for (const how of ['live', 'redraw']) {
    const set = async s => { if (how === 'live') await t.emit(s); else await t.redraw({settings: s}); await settle(t); };
    await set({enable_custom_fonts: true, heading_font: FONT, body_font: {family: 'Courier New', fallback_families: 'monospace'}});
    ok(/Verdana/.test(await t.css(cfg.heading, 'fontFamily')), `${tag} ${how}: heading font from the picker`);
    ok(/Courier New/.test(await t.css(cfg.text + ' p', 'fontFamily')), `${tag} ${how}: body font from the picker on a paragraph`);
    ok(/Courier New/.test(await t.css('.r7k-eyebrow', 'fontFamily')), `${tag} ${how}: body font on the eyebrow`);
    if (name === 'product-duo') {
      ok(/Verdana/.test(await t.css('.r7duo__title', 'fontFamily')), `${tag} ${how}: product title font`);
      ok(/Verdana/.test(await t.css('.r7duo__title a', 'fontFamily')), `${tag} ${how}: product title link font`);
      ok(/Courier New/.test(await t.css('.r7duo__point', 'fontFamily')), `${tag} ${how}: points font`);
      ok(/Courier New/.test(await t.css('.r7duo__label', 'fontFamily')), `${tag} ${how}: label font`);
    }
    await set({enable_custom_fonts: false});
    ok(/Georgia/.test(await t.css(cfg.heading, 'fontFamily')), `${tag} ${how}: fonts off, the theme heading font`);
    ok(/Arial/.test(await t.css(cfg.text + ' p', 'fontFamily')), `${tag} ${how}: fonts off, the theme body font`);
    eq(diff(theme, await fp(t)), [], `${tag} ${how}: fonts off restores the theme`);
    if (name !== 'product-duo') continue;
    const baseShape = [await t.css(cfg.button, 'borderTopLeftRadius'), await t.css(cfg.button, 'paddingTop'), await t.css(cfg.button, 'paddingLeft'), await t.css(cfg.button, 'fontSize')];
    await set({use_theme_button: false, button_radius: 31, button_padding_v: 21, button_padding_h: 47, button_font_size: 23});
    eq([await t.css(cfg.button, 'borderTopLeftRadius'), await t.css(cfg.button, 'paddingTop'), await t.css(cfg.button, 'paddingLeft'), await t.css(cfg.button, 'fontSize')], ['31px', '21px', '47px', '23px'], `${tag} ${how}: the button's own shape wins`);
    eq(await t.css(cfg.button + ' span', 'fontSize'), '23px', `${tag} ${how}: its label too`);
    ok(await t.root(cfg.button).first().evaluate(el => el.hasAttribute('data-own-shape')), `${tag} ${how}: marked as its own shape`);
    eq(await t.root(cfg.button).evaluateAll(els => els.every(el => el.hasAttribute('data-own-shape'))), true, `${tag} ${how}: both buttons`);
    await set({use_theme_button: true});
    eq([await t.css(cfg.button, 'borderTopLeftRadius'), await t.css(cfg.button, 'paddingTop'), await t.css(cfg.button, 'paddingLeft'), await t.css(cfg.button, 'fontSize')], baseShape, `${tag} ${how}: Match theme button is the theme's shape again`);
    ok(!(await t.root(cfg.button).first().evaluate(el => el.hasAttribute('data-own-shape'))), `${tag} ${how}: no longer marked`);
    await set({title_size: 37, text_size: 19});
    eq(await t.css('.r7duo__title', 'fontSize'), width < 768 ? '33.3px' : '37px', `${tag} ${how}: product title size`);
    eq(await t.css('.r7duo__point', 'fontSize'), '19px', `${tag} ${how}: text size`);
    await set({title_size: 22, text_size: 15});
  }
  /* block sizes, live and redraw */
  let sized = t.section.blocks.map(b => ({type: b.type, settings: b.settings}));
  for (const [type, sel, id, v] of [['heading', cfg.heading, width < 768 ? 'size_mobile' : 'size_desktop', 41], ['eyebrow', '.r7k-eyebrow', 'size', 19], ['subheading', cfg.text, 'size', 23]]) {
    await t.emit({[id]: v}, t.blockId(type)); await settle(t);
    eq(await t.css(sel, 'fontSize'), v + 'px', `${tag}: ${type} ${id} (live)`);
    if (type === 'heading') { await t.emit({text: 'Big <strong>words</strong>'}, t.blockId(type)); await settle(t); eq(await t.css(sel + ' strong', 'fontSize'), v + 'px', `${tag}: heading size on a descendant`); ok(/Georgia/.test(await t.css(sel + ' strong', 'fontFamily')), `${tag}: heading font on a descendant`); }
    sized = sized.map(b => ({type: b.type, settings: b.type === type ? {...b.settings, [id]: v} : b.settings}));
    await t.redraw({blocks: sized}); await settle(t);
    eq(await t.css(sel, 'fontSize'), v + 'px', `${tag}: ${type} ${id} (redraw)`);
  }
  /* the other width's size does not apply here */
  await t.emit({[width < 768 ? 'size_desktop' : 'size_mobile']: 77}, t.blockId('heading')); await settle(t);
  eq(await t.css(cfg.heading, 'fontSize'), '41px', `${tag}: the other width's heading size stays out`);
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

async function twoInstances(browser, name, width, editing) {
  const cfg = CFG[name], tag = `${name} ${width} ${editing ? 'editor' : 'store'} two`;
  const blocks = name === 'product-duo' ? cfg.fill(cfg.blocks()) : cfg.blocks();
  const requests = [];
  const t = await usual(browser, name, width, editing, {instances: [{uid: 'a', settings: cfg.settings(), blocks}, {uid: 'b', settings: cfg.settings(), blocks}], requests});
  const b0 = await fp(t, 'b');
  await t.emit({header_alignment: name === 'product-duo' ? 'left' : 'center', padding_top: 96, color_scheme: 'alt-scheme'}, undefined, 'a'); await settle(t);
  await t.emit({text: 'Only in A'}, t.blockId('heading', 0, 'a'), 'a'); await settle(t);
  eq(await t.css(cfg.root, 'backgroundColor', 'a'), 'rgb(250, 250, 250)', tag + ': A changed');
  eq(await t.page.locator('#shopify-section-a ' + cfg.heading).textContent(), 'Only in A', tag + ': A heading changed');
  eq(diff(b0, await fp(t, 'b')), [], tag + ': B is untouched');
  if (name === 'recently-viewed') {
    /* each row scrolls on its own */
    if ((await t.page.locator('#shopify-section-a .r7rv__arrow--next').isVisible())) { await t.page.locator('#shopify-section-a .r7rv__arrow--next').click(); await t.page.waitForTimeout(700); }
    else await t.page.locator('#shopify-section-a [data-r7k-track]').evaluate(el => { el.scrollLeft = 300; });
    await settle(t);
    ok((await t.page.locator('#shopify-section-a [data-r7k-track]').evaluate(el => el.scrollLeft)) > 0, tag + ': A scrolled');
    eq(await t.page.locator('#shopify-section-b [data-r7k-track]').evaluate(el => el.scrollLeft), 0, tag + ': B did not');
    if (!editing) {
      eq(requests.length, 1, tag + ': two rows, one request');
      const dup = await t.page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map(e => e.id).filter(Boolean); return ids.filter((x, i) => ids.indexOf(x) !== i); });
      eq(dup, [], tag + ': no id is on the page twice');
    }
  }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

async function addedBlocksAndRedraws(browser, name, width, editing) {
  const cfg = CFG[name], tag = `${name} ${width} ${editing ? 'editor' : 'store'} redraw`;
  const requests = [];
  const start = name === 'product-duo' ? cfg.fill(presetBlocks(name)) : [{type: 'heading'}];
  const t = await usual(browser, name, width, editing, {blocks: start, requests});
  ok(!(await t.root('.r7k-eyebrow').count()), tag + ': no eyebrow yet');
  const added = name === 'product-duo' ? [...start, {type: 'eyebrow', settings: {text: 'Added'}}, {type: 'point', settings: {text: 'A new point'}}] : [...start, {type: 'eyebrow', settings: {text: 'Added'}}, {type: 'subheading', settings: {text: '<p>Added copy</p>'}}];
  await t.redraw({blocks: added}); await settle(t);
  eq(await t.root('.r7k-eyebrow').textContent(), 'Added', tag + ': the added block is drawn');
  await t.emit({text: 'Edited after adding'}, 'test-b' + added.findIndex(b => b.type === 'eyebrow')); await settle(t);
  eq(await t.root('.r7k-eyebrow').textContent(), 'Edited after adding', tag + ': and takes live edits');
  if (name === 'product-duo') {
    eq(await t.root('.r7duo__card').nth(1).locator('.r7duo__point').last().textContent(), 'A new point', tag + ': a point added last belongs to the second product');
    await t.emit({text: 'Point <strong>edited</strong>'}, 'test-b' + (added.length - 1)); await settle(t);
    eq(await t.root('.r7duo__card').nth(1).locator('.r7duo__point').last().innerHTML(), 'Point <strong>edited</strong>', tag + ': the added point takes live edits');
  }
  for (let i = 0; i < 4; i++) await t.redraw({});
  await settle(t);
  const n = await t.page.evaluate(() => [window.MateriaR7Products.roots.size, document.querySelectorAll('[data-r7k-root]').length, [...window.MateriaR7Products.roots.keys()].every(r => r.isConnected)]);
  eq(n, [1, 1, true], tag + ': one live root after five redraws');
  if (name === 'recently-viewed') {
    if (!editing) eq(requests.length, 1, tag + ': redraws reuse the answer (one request)');
    else eq(requests.length, 0, tag + ': the builder asks for nothing');
    if (width >= 768) {
      /* one listener: one click, one page */
      const track = t.root('[data-r7k-track]');
      await t.page.emulateMedia({reducedMotion: 'reduce'});
      const page1 = await track.evaluate(el => { const li = el.children[0]; const gap = parseFloat(getComputedStyle(el).columnGap); return Math.floor((el.clientWidth + gap) / (li.offsetWidth + gap)) * (li.offsetWidth + gap); });
      await t.root('.r7rv__arrow--next').click(); await settle(t);
      const max = await track.evaluate(el => el.scrollWidth - el.clientWidth);
      near(await track.evaluate(el => el.scrollLeft), Math.min(page1, max), 2, tag + ': one click moves one page after the redraws');
    }
  }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

async function picturesKept(browser, name, width, editing) {
  if (!editing) return;
  const tag = `${name} ${width} pictures`;
  const t = await usual(browser, name, width, true);
  await t.page.evaluate(() => { window.__imgs = [...document.querySelectorAll('#shopify-section-test img')]; window.__srcs = window.__imgs.map(i => i.getAttribute('src')); window.__sets = 0; for (const i of window.__imgs) new MutationObserver(m => { window.__sets += m.length; }).observe(i, {attributes: true, attributeFilter: ['src', 'srcset']}); const tr = document.querySelector('#shopify-section-test [data-r7k-track]'); window.__kids = [...tr.children]; });
  ok((await t.page.evaluate(() => window.__imgs.length)) > 0, tag + ': pictures to watch');
  await t.emit({padding_top: 80, header_alignment: 'center', color_scheme: 'alt-scheme', enable_custom_style: true, section_bg_override: '#123123'});
  await t.emit({text: 'New words'}, t.blockId('heading'));
  if (name === 'product-duo') { await t.emit({card_style: 'outline', image_ratio: 'portrait', title_size: 30}); await t.emit({label: 'New label', button_label: 'Go', button_style: 'secondary'}, t.blockId('product')); }
  else await t.emit({items_per_row: 3, column_gap: 10, show_arrows: false});
  await settle(t);
  eq(await t.page.evaluate(() => [window.__imgs.every(i => i.isConnected), window.__imgs.map(i => i.getAttribute('src')).join() === window.__srcs.join(), window.__sets]), [true, true, 0], tag + ': no picture was reloaded or replaced');
  eq(await t.page.evaluate(() => { const tr = document.querySelector('#shopify-section-test [data-r7k-track]'); return window.__kids.every((k, i) => tr.children[i] === k); }), true, tag + ': the cards are the same elements');
  await t.page.close();
}

async function firstPaint(browser, name, width, editing) {
  const tag = `${name} ${width} ${editing ? 'editor' : 'store'} first paint`;
  const a = await usual(browser, name, width, editing, {assets: [CSS], ids: null});
  const b = await usual(browser, name, width, editing, {ids: null});
  eq(diff(await fp(a), await fp(b)), [], tag + ': the same before and after the controller');
  if (name === 'recently-viewed' && !editing) {
    eq((await fp(a)).wrap.display, 'none', tag + ': nothing viewed, the section takes no space');
    eq(await b.page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, tag + ': and adds no height');
  }
  eq(a.errors.concat(b.errors), [], tag + ': no errors');
  await a.page.close(); await b.page.close();
  /* scripts off entirely: the first preset is a complete drawing in the builder */
  if (editing) {
    const p = await mount(browser, name, {width, editing: true, theme: THEME, assets: [CSS], inlineScripts: false});
    const box = await p.root('[data-r7k-root]').boundingBox();
    ok(box && box.height > 150, tag + ': the first preset draws with no pictures and no script');
    ok((await p.root('.r7k-heading').textContent()).trim().length > 0, tag + ': with its heading');
    ok(await p.noOverflow(), tag + ': preset has no overflow');
    eq(p.errors, [], tag + ': preset no errors');
    await p.page.close();
  }
}

/* ------------------------------------------------------------ Recently Viewed */
async function rvList(browser, width) {
  const tag = `recently-viewed ${width} list`;
  /* nothing saved */
  let t = await mountWith(browser, 'recently-viewed', {width, editing: false, ids: null});
  eq([await t.root('[data-r7k-root]').evaluate(el => el.hidden), t.requests.length], [true, 0], tag + ': no list, hidden and nothing asked');
  await t.page.close();
  /* a list longer than the limit, with the product being viewed in it */
  const saved = ['p3', 'p1', 'p7', 'p2', 'p9', 'p5', 'p8', 'p4', 'p6', 'p10'];
  t = await mountWith(browser, 'recently-viewed', {width, editing: false, ids: saved, settings: {products_to_show: 4}, globals: {...GLOBALS, product: BY_ID.p1}});
  eq(t.requests.length, 1, tag + ': one request');
  const u = t.requests[0];
  eq([u.pathname, u.searchParams.get('section_id'), u.searchParams.get('type'), u.searchParams.get('q')], ['/search', 'recently-viewed', 'product', 'id:p3 OR id:p7 OR id:p2 OR id:p9'], tag + ': asks for the newest four, without the product being viewed');
  eq(await t.root('[data-rv-card]').evaluateAll(els => els.map(e => e.dataset.rvId)), ['p3', 'p7', 'p2', 'p9'], tag + ': newest first, capped');
  eq(await t.root('[data-r7k-root]').evaluate(el => el.hidden), false, tag + ': shown');
  eq(await t.root('[data-rv-card] .product-item').count(), 4, tag + ': each is the theme\'s product card');
  ok(/R\$137\.77/.test(await t.root('[data-rv-card]').first().textContent()), tag + ': with its real price through the money filter');
  eq(await t.root('[data-rv-card]').first().locator('a[href="/products/p3"]').count() > 0, true, tag + ': linking to the product');
  eq(await t.root('.r7rv__ghost').count(), 0, tag + ': the placeholders are gone');
  eq(await t.root('[data-r7k-track]').getAttribute('aria-busy'), null, tag + ': no longer busy');
  /* the product page writes the product being viewed to the front of the list */
  eq((await t.page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY)).slice(0, 3), ['p1', 'p3', 'p7'], tag + ': the product being viewed is recorded first');
  eq((await t.page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY)).length, 10, tag + ': without a duplicate');
  /* the row has the right scroll flags for its count */
  eq(await t.root('[data-r7k-root]').evaluate(el => [el.dataset.overD, el.dataset.overM]), ['false', 'true'], tag + ': four cards fit a desktop row of five, not a phone row of two');
  /* a new product saved in another tab */
  await t.page.evaluate(k => { localStorage.setItem(k, JSON.stringify(['p10', 'p3'])); window.dispatchEvent(new StorageEvent('storage', {key: k})); }, KEY);
  await settle(t);
  eq(await t.root('[data-rv-card]').evaluateAll(els => els.map(e => e.dataset.rvId)), ['p10', 'p3'], tag + ': follows the list when it changes');
  eq(t.requests.length, 2, tag + ': one more request for the new list');
  /* back from the back/forward cache with the same list: nothing asked again */
  await t.page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
  await settle(t);
  eq(t.requests.length, 2, tag + ': the same list is not asked for again');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
  /* the storage cap */
  t = await mountWith(browser, 'recently-viewed', {width, editing: false, ids: Array.from({length: 25}, (_, i) => 'x' + i), globals: {...GLOBALS, product: BY_ID.p2}});
  const kept = await t.page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  eq([kept.length, kept[0], kept.includes('x24')], [25, 'p2', false], tag + ': the list keeps 25 ids at most, oldest dropped');
  /* ids that are no longer products: asked once, nothing to show, hidden */
  eq([await t.root('[data-r7k-root]').evaluate(el => el.hidden), t.requests.length, await t.root('[data-r7k-track]').evaluate(el => el.children.length)], [true, 1, 0], tag + ': products that are gone leave the section hidden');
  eq((await fp(t)).wrap.display, 'none', tag + ': and it takes no space');
  await t.page.close();
  /* junk in storage is ignored */
  t = await mountWith(browser, 'recently-viewed', {width, editing: false, ids: null, assets: [CSS]});
  await t.page.evaluate(k => localStorage.setItem(k, '{"not":"a list"'), KEY);
  await t.page.addScriptTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', JS), 'utf8')}); await settle(t);
  eq([await t.root('[data-r7k-root]').evaluate(el => el.hidden), t.requests.length, t.errors], [true, 0, []], tag + ': a broken list is no list');
  await t.page.evaluate(k => localStorage.setItem(k, JSON.stringify(['p1', '"><img src=x onerror=alert(1)>', 'p2 OR id:p3', {a: 1}])), KEY);
  await t.redraw({}); await settle(t);
  eq(t.requests.length && t.requests[0].searchParams.get('q'), 'id:p1', tag + ': only plain ids are asked for');
  await t.page.close();
  /* the request fails: hidden, a warning only, and it comes back with the connection */
  let down = true;
  t = await mountWith(browser, 'recently-viewed', {width, editing: false, ids: ['p1', 'p2'], fail: () => down});
  eq([await t.root('[data-r7k-root]').evaluate(el => el.hidden), t.errors], [true, []], tag + ': a failed request hides the section without an error');
  down = false;
  await t.page.evaluate(() => window.dispatchEvent(new Event('online'))); await settle(t);
  eq(await t.root('[data-rv-card]').evaluateAll(els => els.map(e => e.dataset.rvId)), ['p1', 'p2'], tag + ': back online, the row is drawn');
  await t.page.close();
}

async function rvBuilder(browser, width) {
  const tag = `recently-viewed ${width} builder`;
  const requests = [];
  const t = await mountWith(browser, 'recently-viewed', {width, editing: true, ids: ['p9', 'p8'], requests, globals: {...GLOBALS, product: BY_ID.p2}, settings: {products_to_show: 6}});
  eq(await t.root('[data-rv-card]').evaluateAll(els => els.map(e => e.dataset.rvId)), ['p1', 'p3', 'p4', 'p5', 'p6', 'p7'], tag + ': store products stand in, without the product being viewed');
  eq(requests.length, 0, tag + ': nothing is asked for in the builder');
  eq(await t.page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY), ['p9', 'p8'], tag + ': and the builder records nothing');
  await t.emit({products_to_show: 3}); await settle(t);
  eq(await t.root('[data-rv-card]:not([hidden])').count(), 3, tag + ': fewer products show at once (live)');
  eq(await t.root('[data-r7k-root]').evaluate(el => el.dataset.overD), 'false', tag + ': and the row no longer scrolls on a desktop');
  await t.page.close();
  /* a store with no products yet: the theme's placeholder cards */
  const e = await mountWith(browser, 'recently-viewed', {width, editing: true, globals: {...GLOBALS, collections: {}}});
  eq([await e.root('[data-rv-card]').count(), await e.root('[data-rv-card] .product-item').count()], [8, 8], tag + ': placeholder cards when the store has no products');
  ok(await e.noOverflow(), tag + ': placeholders do not overflow');
  await e.page.close();
}

/* The search answer and what a real search page gets. */
async function rvAnswer() {
  const tag = 'recently-viewed answer';
  const drawn = async g => { const r = await render('recently-viewed', {editing: false, uid: 'x', theme: THEME, globals: {...GLOBALS, ...g}}); return {ids: [...r.html.matchAll(/data-rv-id="([^"]*)"/g)].map(m => m[1]), state: (r.html.match(/data-rv-state="([^"]*)"/) || [])[1], hidden: /\shidden\s*>\s*$/.test(r.html.split('<div class="r7k-inner')[0]), html: r.html}; };
  let d = await drawn({search: {performed: true, terms: 'id:p4 OR id:p2', results: [BY_ID.p4, BY_ID.p2]}});
  eq([d.ids, d.state], [['p4', 'p2'], 'search'], tag + ': draws the asked products as cards');
  ok(!/data-r7k-settings=/.test(d.html), tag + ': a visitor\'s page carries no settings JSON');
  d = await drawn({search: {performed: true, terms: 'pants', results: CATALOG}});
  eq([d.ids, d.state, d.hidden], [[], 'wait', true], tag + ': a visitor\'s own search is not drawn as their viewed products');
  d = await drawn({});
  eq([d.ids, d.state, d.hidden], [[], 'wait', true], tag + ': a page is drawn hidden and empty');
  d = await drawn({search: {performed: true, terms: 'id:p4', results: []}});
  eq([d.ids, d.state], [[], 'wait'], tag + ': no result, no card');
}

/* The row as a native scroller. */
async function rvScroller(browser, width, editing) {
  const tag = `recently-viewed ${width} ${editing ? 'editor' : 'store'} row`;
  const t = await usual(browser, 'recently-viewed', width, editing);
  const track = t.root('[data-r7k-track]');
  const css = await track.evaluate(el => { const c = getComputedStyle(el); return [c.overflowX, c.scrollSnapType, c.overscrollBehaviorX, c.scrollbarWidth, c.touchAction, getComputedStyle(el.children[0]).scrollSnapAlign]; });
  eq(css, ['auto', 'x mandatory', 'contain', 'none', 'pan-x pan-y', 'start'], tag + ': a native snap scroller');
  const geo = () => track.evaluate(el => { const li = el.children[0], gap = parseFloat(getComputedStyle(el).columnGap); return {one: li.offsetWidth + gap, max: el.scrollWidth - el.clientWidth, w: el.clientWidth, left: el.scrollLeft, fit: Math.floor((el.clientWidth + gap) / (li.offsetWidth + gap))}; });
  const g = await geo();
  ok(g.max > 0, tag + ': more cards than fit');
  eq(g.fit, width < 768 ? 2 : 5, tag + ': cards per row at this width');
  eq(await track.getAttribute('tabindex'), '0', tag + ': the row is a tab stop');
  /* touch style: the finger sets scrollLeft, the row snaps to a card */
  await track.evaluate((el, x) => { el.scrollLeft = x; }, g.one * 1.4);
  await t.page.waitForTimeout(500); await settle(t);
  const snapped = (await geo()).left;
  ok(snapped > 0, tag + ': scrollLeft moves the row');
  near(snapped / g.one, Math.round(snapped / g.one), 0.03, tag + ': and it rests on a card');
  ok(Number(await t.root('[data-r7k-progress]').evaluate(el => el.style.getPropertyValue('--rv-p'))) > 0, tag + ': the progress line follows');
  await t.page.emulateMedia({reducedMotion: 'reduce'});
  await track.evaluate(el => { el.scrollLeft = 0; }); await settle(t);
  eq(await t.root('[data-r7k-progress]').evaluate(el => el.style.getPropertyValue('--rv-p')), '', tag + ': progress is back at the start');
  const thumb = await t.root('.r7rv__thumb').evaluate(el => { const r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect(); return [r.width / p.width, r.left - p.left, getComputedStyle(el.parentElement).display]; });
  eq(thumb[2], 'block', tag + ': the progress line shows when the row scrolls');
  near(thumb[0], g.w / (g.w + g.max), 0.03, tag + ': its thumb is the visible share of the row');
  near(thumb[1], 0, 1, tag + ': and starts at the left');
  /* keys */
  await track.focus();
  await t.page.keyboard.press('ArrowRight'); await settle(t);
  near((await geo()).left, g.one, 2, tag + ': ArrowRight moves one card');
  await t.page.keyboard.press('ArrowLeft'); await settle(t);
  near((await geo()).left, 0, 2, tag + ': ArrowLeft moves back');
  await t.page.keyboard.press('End'); await settle(t);
  near((await geo()).left, g.max, 2, tag + ': End goes to the last card');
  near(Number(await t.root('[data-r7k-progress]').evaluate(el => el.style.getPropertyValue('--rv-p'))), 1, 0.01, tag + ': progress is full at the end');
  await t.page.keyboard.press('Home'); await settle(t);
  near((await geo()).left, 0, 2, tag + ': Home goes to the first');
  /* arrows */
  const prev = t.root('.r7rv__arrow--prev'), next = t.root('.r7rv__arrow--next');
  if (width >= 768) {
    eq([await prev.isVisible(), await next.isVisible()], [true, true], tag + ': arrows show');
    eq(await next.evaluate(el => { const r = el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }), true, tag + ': arrows are 44px targets');
    eq([await prev.isDisabled(), await next.isDisabled()], [true, false], tag + ': Previous is off at the start');
    await next.click(); await settle(t);
    near((await geo()).left, Math.min(g.fit * g.one, g.max), 2, tag + ': Next moves a row of cards');
    eq(await prev.isDisabled(), false, tag + ': Previous is on once moved');
    for (let i = 0; i < 6 && !(await next.isDisabled()); i++) { await next.click(); await settle(t); }
    near((await geo()).left, g.max, 2, tag + ': Next stops at the end');
    eq([await prev.isDisabled(), await next.isDisabled()], [false, true], tag + ': Next is off at the end');
    for (let i = 0; i < 6 && !(await prev.isDisabled()); i++) { await prev.click(); await settle(t); }
    eq([(await geo()).left, await prev.isDisabled()], [0, true], tag + ': Previous goes back to the start and turns off');
    /* smooth unless reduced motion: the click does not jump */
    await t.page.emulateMedia({reducedMotion: 'no-preference'});
    await next.click();
    const mid = await track.evaluate(el => new Promise(r => requestAnimationFrame(() => r(el.scrollLeft))));
    ok(mid < g.fit * g.one - 2, tag + ': the arrows scroll smoothly');
    await t.page.waitForTimeout(900);
    await t.emit({show_arrows: false}); await settle(t);
    eq(await next.isVisible(), false, tag + ': arrows off');
    await t.emit({show_arrows: true}); await settle(t);
  } else {
    eq([await prev.isVisible(), await next.isVisible()], [false, false], tag + ': no arrows on phones, the finger moves the row');
    const peek = await track.evaluate(el => { const third = el.children[2].getBoundingClientRect(), r = el.getBoundingClientRect(); return r.right - third.left; });
    ok(peek > 12 && peek < 60, tag + ': the next card peeks in (' + Math.round(peek) + 'px)');
    /* the row runs to both screen edges and its cards start on the page's gutter, at every section width */
    for (const w of ['container', 'fluid_container', 'stretch_width', 'full_width']) {
      await t.redraw({settings: {section_width: w}}); await settle(t);
      const e = await t.root('[data-r7k-root]').evaluate(el => { const tr = el.querySelector('[data-r7k-track]').getBoundingClientRect(); return {track: [Math.round(tr.left), Math.round(tr.right)], card: Math.round(el.querySelector('[data-rv-card]').getBoundingClientRect().left), heading: Math.round(el.querySelector('.r7k-heading').getBoundingClientRect().left), left: el.querySelector('[data-r7k-track]').scrollLeft}; });
      eq([e.track, e.card, e.left], [[0, 375], e.heading, 0], `${tag} ${w}: edge to edge, the first card on the gutter with the heading`);
    }
    await t.redraw({settings: {section_width: 'fluid_container'}}); await settle(t);
  }
  /* a row that fits is not a scroller: no arrows, no progress, no tab stop */
  await t.redraw({settings: {products_to_show: 2, items_per_row_mobile: 2}}); await settle(t);
  if (!editing) { await t.page.evaluate(k => { localStorage.setItem(k, JSON.stringify(['p3', 'p1'])); window.MateriaR7Products.reload(); }, KEY); await settle(t); }
  eq(await t.root('[data-rv-card]:not([hidden])').count(), 2, tag + ': two cards');
  eq([await t.root('.r7rv__progress').isVisible(), await next.isVisible(), await track.getAttribute('tabindex')], [false, false, null], tag + ': a row that fits has no arrows, no progress line and is no tab stop');
  ok(await t.noOverflow(), tag + ': no overflow');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* ------------------------------------------------------------ Product Duo */
async function duoData(browser, width, editing) {
  const tag = `product-duo ${width} ${editing ? 'editor' : 'store'} data`;
  const P1 = BY_ID.p1, base = presetBlocks('product-duo');
  const withProducts = (a, b) => { let n = 0; return base.map(x => x.type === 'product' ? {...x, settings: [a, b][n++]} : x); };
  let t = await mountWith(browser, 'product-duo', {width, editing, blocks: withProducts({product: P1, label: 'For a first order'}, {product: SOLO, button_action: 'cart', button_style: 'secondary', image: IMG})});
  const card = n => t.root('.r7duo__card').nth(n);
  eq(await t.root('.r7duo__card').count(), 2, tag + ': two cards');
  eq(await card(0).locator('.r7duo__title a').evaluate(el => [el.textContent, el.getAttribute('href')]), ['Item p1', '/products/p1'], tag + ': the product\'s own title and link');
  eq(await card(0).locator('.r7duo__now').evaluate(el => el.lastChild.textContent.trim()), 'R$137.77', tag + ': its price through the money filter');
  eq(await card(0).locator('.r7duo__was').evaluate(el => el.lastChild.textContent.trim()), 'R$211.93', tag + ': the compare price when it is higher');
  eq(await card(1).locator('.r7duo__was').count(), 0, tag + ': no compare price when there is none');
  eq(await card(1).locator('.r7duo__now').textContent(), 'R$49.00', tag + ': the second product\'s own price');
  eq(await card(0).locator('.r7duo__label').textContent(), 'For a first order', tag + ': the label');
  eq(await card(0).locator('.r7duo__media img').evaluate(el => [el.getAttribute('src').split('?')[0], el.alt, el.loading, el.hasAttribute('width') && el.hasAttribute('height')]), ['/img/black.svg', 'Pants Down', 'lazy', true], tag + ': the product picture, described, lazy, with its size');
  eq(await card(1).locator('.r7duo__media img').evaluate(el => [el.getAttribute('src').split('?')[0], el.alt]), ['https://theme.test/pic.png', 'Saved alt'], tag + ': a picked picture replaces it, with its own alt text');
  eq(await card(0).locator('.r7duo__media').evaluate(el => [el.getAttribute('href'), el.tabIndex]), ['/products/p1', -1], tag + ': the picture links to the product, one tab stop per card');
  eq(await card(0).locator('.r7duo__point').allTextContents(), ['Say what it includes', 'Name the detail that sets it apart', 'Add what a buyer should know first'], tag + ': the first product\'s points');
  eq(await card(1).locator('.r7duo__point').count(), 3, tag + ': the second product\'s points');
  /* the buttons */
  eq(await card(0).locator('.r7duo__btn').evaluate(el => [el.tagName, el.getAttribute('href'), el.textContent.trim(), el.dataset.themeButton, el.hasAttribute('data-sl-button')]), ['A', '/products/p1', 'View product', 'primary', true], tag + ': a theme button to the product page');
  eq(await card(1).locator('product-form form input[name="id"]').evaluate(el => [el.type, el.value]), ['hidden', SOLO.variants[0].id], tag + ': add to cart through the theme\'s product form, with the variant id');
  eq(await card(1).locator('.r7duo__btn').evaluate(el => [el.tagName, el.type, el.name, el.disabled, el.dataset.themeButton, el.classList.contains('product__add-cart'), !!el.querySelector('.btn-action')]), ['BUTTON', 'submit', 'add', false, 'secondary', true, true], tag + ': a submit button on the theme contract');
  eq(await t.root('.r7duo__or').evaluate(el => [el.textContent.trim(), getComputedStyle(el).display !== 'none']), ['or', true], tag + ': the word between them');
  eq(await t.root('form[action*="checkout"], input[name*="card"], iframe').count(), 0, tag + ': no payment form');
  ok(await t.noOverflow(), tag + ': no overflow');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
  /* a product with options and Add to cart: its page, so the visitor can choose. Sold out: the label, and no active buy button. */
  t = await mountWith(browser, 'product-duo', {width, editing, blocks: withProducts({product: P1, button_action: 'cart'}, {product: SOLD_SOLO, button_action: 'cart'})});
  eq(await card(0).locator('.r7duo__btn').evaluate(el => [el.tagName, el.getAttribute('href'), el.textContent.trim()]), ['A', '/products/p1', 'label'], tag + ': options first: the theme\'s Select options link to the product');
  eq(await card(0).locator('product-form').count(), 0, tag + ': no blind add to cart for a product with options');
  eq(await card(1).locator('.r7duo__btn').evaluate(el => [el.tagName, el.disabled, el.textContent.trim()]), ['BUTTON', true, 'sold out'], tag + ': sold out: a disabled button with the theme\'s sold out label');
  eq(await card(1).locator('.r7duo__sold').textContent(), 'sold out', tag + ': and the sold out tag by the price');
  eq(await card(1).locator('product-form').count(), 0, tag + ': no form for a sold out product');
  await t.page.close();
  t = await mountWith(browser, 'product-duo', {width, editing, blocks: withProducts({product: SOLD}, {product: P1, button_label: ''})});
  eq(await card(0).locator('.r7duo__sold').count(), 1, tag + ': sold out tag with the page button');
  eq(await card(0).locator('.r7duo__btn').evaluate(el => [el.tagName, el.getAttribute('href')]), ['A', '/products/sold'], tag + ': the page link stays');
  eq(await card(1).locator('.r7duo__action').evaluate(el => getComputedStyle(el).display), 'none', tag + ': an empty label leaves no button and no gap');
  await t.page.close();
  /* empty pickers */
  t = await mountWith(browser, 'product-duo', {width, editing, blocks: withProducts({product: null}, {product: P1})});
  if (editing) {
    eq(await t.root('.r7duo__card').count(), 2, tag + ': an empty picker is a placeholder card in the builder');
    eq(await card(0).locator('.r7duo__media img.placeholder-image').count(), 1, tag + ': with the theme\'s placeholder picture');
    ok(!/\d/.test(await card(0).locator('.r7duo__price').textContent()), tag + ': and no invented price');
    eq(await card(0).locator('.r7duo__btn').evaluate(el => [el.hasAttribute('href'), el.getAttribute('aria-disabled')]), [false, 'true'], tag + ': its button goes nowhere');
  } else {
    eq(await t.root('.r7duo__card').count(), 1, tag + ': an empty picker draws no card on the store');
    eq(await t.root('.r7duo__or').count(), 0, tag + ': and no word beside a single card');
    eq(await t.root('.r7duo__grid').getAttribute('data-count'), '1', tag + ': the one card is laid out alone');
    eq(await card(0).locator('.r7duo__point').count(), 3, tag + ': with its own points');
  }
  await t.page.close();
  t = await mountWith(browser, 'product-duo', {width, editing, blocks: base});
  if (editing) eq([await t.root('.r7duo__card').count(), await t.root('[data-r7k-root]').evaluate(el => el.hidden)], [2, false], tag + ': the first preset draws two placeholder cards');
  else eq([await t.root('.r7duo__card').count(), await t.root('[data-r7k-root]').evaluate(el => el.hidden), (await fp(t)).wrap.display], [0, true, 'none'], tag + ': no product picked: nothing on the store');
  eq(t.errors, [], tag + ': no errors with empty pickers');
  await t.page.close();
  /* block edge cases: one product, a third product, points before any product, no blocks */
  t = await mountWith(browser, 'product-duo', {width, editing, blocks: [{type: 'point', settings: {text: 'Early point'}}, {type: 'product', settings: {product: P1}}, {type: 'product', settings: {product: SOLO}}, {type: 'product', settings: {product: BY_ID.p3}}, {type: 'point', settings: {text: 'Late point'}}]});
  eq(await t.root('.r7duo__card').count(), 2, tag + ': two products at most');
  eq([await card(0).locator('.r7duo__point').allTextContents(), await card(1).locator('.r7duo__point').allTextContents()], [['Early point'], ['Late point']], tag + ': a point before any product goes to the first, a late one to the second');
  eq(await t.root('.r7k-header').evaluate(el => getComputedStyle(el).display), 'none', tag + ': no header blocks, no header space');
  await t.page.close();
  t = await mountWith(browser, 'product-duo', {width, editing, blocks: []});
  eq([await t.root('[data-r7k-root]').evaluate(el => el.hidden), await t.root('.r7duo__empty').count(), t.errors], editing ? [false, 1, []] : [true, 0, []], tag + ': no blocks: a hint in the builder, nothing on the store, no error');
  if (editing) ok((await t.root('[data-r7k-root]').boundingBox()).height > 60, tag + ': the empty section can still be picked in the builder');
  await t.page.close();
  /* live edits of a product block */
  if (editing) {
    t = await mountWith(browser, 'product-duo', {width, editing, blocks: withProducts({product: P1}, {product: SOLO, button_action: 'cart'})});
    await t.emit({label: 'New label', button_label: 'See it', button_style: 'secondary'}, t.blockId('product', 0)); await settle(t);
    eq(await card(0).locator('.r7duo__label').textContent(), 'New label', tag + ': label live');
    eq(await card(0).locator('.r7duo__btn').evaluate(el => [el.textContent.trim(), el.dataset.themeButton]), ['See it', 'secondary'], tag + ': button label and style live');
    eq(await card(1).locator('.r7duo__btn').evaluate(el => [el.textContent.trim(), el.dataset.themeButton]), ['add to cart', 'primary'], tag + ': the other product is untouched');
    await t.emit({button_label: 'Typed for nothing'}, t.blockId('product', 1)); await settle(t);
    eq(await card(1).locator('.r7duo__btn').textContent().then(s => s.trim()), 'add to cart', tag + ': an add to cart button keeps the theme\'s label');
    await t.emit({label: ''}, t.blockId('product', 0)); await settle(t);
    eq(await card(0).locator('.r7duo__label').isVisible(), false, tag + ': an empty label hides');
    await t.emit({divider_text: 'versus'}); await settle(t);
    eq(await t.root('.r7duo__or').textContent().then(s => s.trim()), 'versus', tag + ': the word between them, live');
    await t.emit({divider_text: ''}); await settle(t);
    eq(await t.root('.r7duo__grid').getAttribute('data-or'), 'line', tag + ': no word, plain cards: a line');
    await t.emit({card_style: 'outline'}); await settle(t);
    eq([await t.root('.r7duo__grid').getAttribute('data-or'), await t.root('.r7duo__or').isVisible()], ['none', false], tag + ': no word, boxed cards: nothing between them');
    eq(t.errors, [], tag + ': no errors');
    await t.page.close();
  }
}

/* Add to cart goes through the theme's product-form element. */
async function duoCart(browser) {
  const tag = 'product-duo cart';
  const base = presetBlocks('product-duo'); let n = 0;
  const blocks = base.map(x => x.type === 'product' ? {...x, settings: [{product: SOLO, button_action: 'cart'}, {product: BY_ID.p1}][n++]} : x);
  const t = await mountWith(browser, 'product-duo', {width: 1366, editing: false, blocks});
  /* a stand-in for the theme's element (theme.js): it takes the form's submit, as the real one does */
  await t.page.evaluate(() => { window.__added = []; customElements.define('product-form', class extends HTMLElement { constructor() { super(); this.form = this.querySelector('form'); this.form.querySelector('[name=id]').disabled = false; this.form.addEventListener('submit', e => { e.preventDefault(); window.__added.push(Object.fromEntries(new FormData(this.form))); }); } }); });
  await t.root('.r7duo__btn').first().click();
  eq(await t.page.evaluate(() => window.__added), [{id: SOLO.variants[0].id}], tag + ': the theme\'s product form receives the submit with the variant id');
  await t.page.close();
}

async function duoLayout(browser, width, editing) {
  const tag = `product-duo ${width} ${editing ? 'editor' : 'store'} layout`;
  const t = await usual(browser, 'product-duo', width, editing);
  const boxes = () => t.root('.r7duo__card').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }));
  let b = await boxes();
  if (width >= 768) {
    eq(b[0][1], b[1][1], tag + ': side by side');
    near(b[0][2], b[1][2], 1, tag + ': equal widths');
    near(b[0][3], b[1][3], 1, tag + ': equal heights');
    const btns = await t.root('.r7duo__btn').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().bottom)));
    near(btns[0], btns[1], 1, tag + ': the buttons line up at the bottom');
    await t.redraw({settings: {column_gap: 96}}); await settle(t);
    const wide = await boxes();
    ok(wide[1][0] - (wide[0][0] + wide[0][2]) > b[1][0] - (b[0][0] + b[0][2]), tag + ': the gap setting widens the space between them');
    eq(await t.root('[data-r7k-track]').getAttribute('tabindex'), null, tag + ': not a scroller on desktop, no tab stop');
  } else {
    ok(b[1][1] > b[0][1] + b[0][3] - 1, tag + ': stacked on phones');
    near(b[0][2], b[1][2], 1, tag + ': full width cards');
    eq(await t.root('[data-r7k-track]').getAttribute('tabindex'), null, tag + ': stacked cards are no tab stop');
    /* Swipe */
    for (const how of ['live', 'redraw']) {
      if (how === 'live') await t.emit({mobile_layout: 'swipe'}); else { await t.redraw({settings: {mobile_layout: 'stack'}}); await t.redraw({settings: {mobile_layout: 'swipe'}}); }
      await settle(t);
      const track = t.root('[data-r7k-track]');
      const css = await track.evaluate(el => { const c = getComputedStyle(el); return [c.overflowX, c.scrollSnapType, c.overscrollBehaviorX, c.scrollbarWidth, c.touchAction, getComputedStyle(el.querySelector('.r7duo__card')).scrollSnapAlign]; });
      eq(css, ['auto', 'x mandatory', 'contain', 'none', 'pan-x pan-y', 'start'], `${tag} ${how}: Swipe is a native snap scroller`);
      b = await boxes();
      eq(b[0][1], b[1][1], `${tag} ${how}: the cards sit in a row`);
      ok(b[1][0] < width && b[1][0] > width * 0.6, `${tag} ${how}: the second card peeks in`);
      const edge = await t.root('[data-r7k-root]').evaluate(el => { const tr = el.querySelector('[data-r7k-track]').getBoundingClientRect(); return [Math.round(tr.left), Math.round(tr.right), Math.round(el.querySelector('.r7duo__card').getBoundingClientRect().left) === Math.round(el.querySelector('.r7k-sub').getBoundingClientRect().left)]; });
      eq(edge, [0, width, true], `${tag} ${how}: the row runs to both screen edges, its first card on the page's gutter`);
      eq(await t.root('.r7duo__or').isVisible(), false, `${tag} ${how}: no word in the row`);
      if (editing || how === 'redraw') eq(await track.getAttribute('tabindex'), '0', `${tag} ${how}: the row is a tab stop`);
      const max = await track.evaluate(el => el.scrollWidth - el.clientWidth);
      ok(max > 100, `${tag} ${how}: it scrolls`);
      await track.evaluate((el, x) => { el.scrollLeft = x; }, max * 0.8);
      await t.page.waitForTimeout(450); await settle(t);
      near(await track.evaluate(el => el.scrollLeft), max, 2, `${tag} ${how}: a swipe snaps to the second card`);
      await t.page.emulateMedia({reducedMotion: 'reduce'});
      await track.focus();
      await t.page.keyboard.press('ArrowLeft'); await settle(t);
      near(await track.evaluate(el => el.scrollLeft), 0, 2, `${tag} ${how}: ArrowLeft goes to the first card`);
      await t.page.keyboard.press('ArrowRight'); await settle(t);
      near(await track.evaluate(el => el.scrollLeft), max, 2, `${tag} ${how}: ArrowRight to the second`);
      await t.page.emulateMedia({reducedMotion: 'no-preference'});
      ok(await t.noOverflow(), `${tag} ${how}: the page does not scroll sideways`);
    }
    /* the builder picks the first product: its card comes into view */
    if (editing) {
      await t.page.emulateMedia({reducedMotion: 'reduce'});
      await t.page.evaluate(id => { const el = document.querySelector('[data-r7k-block="' + id + '"]'); el.dispatchEvent(new CustomEvent('shopify:block:select', {bubbles: true, detail: {blockId: id}})); }, t.blockId('product', 0));
      await settle(t);
      near(await t.root('[data-r7k-track]').evaluate(el => el.scrollLeft), 0, 2, tag + ': picking a product block brings its card into view');
    }
  }
  /* long words and many points do not break the cards */
  await t.redraw({blocks: [{type: 'heading', settings: {text: 'Supercalifragilisticexpialidocious-and-then-some heading that keeps going'}}, {type: 'product', settings: {product: {...BY_ID.p1, title: 'Anextraordinarilylongproductnamewithoutanyspacesatallinit Deluxe Edition'}, label: 'Averyveryverylonglabelwithoutspacesthatcouldoverflow'}}, ...Array.from({length: 7}, (_, i) => ({type: 'point', settings: {text: 'Point ' + 'word '.repeat(i * 4 + 1)}})), {type: 'product', settings: {product: SOLO}}], settings: {mobile_layout: 'stack'}});
  await settle(t);
  ok(await t.noOverflow(), tag + ': long words do not widen the page');
  eq(await t.root('.r7duo__card').evaluateAll(els => els.every(e => e.scrollWidth <= e.clientWidth + 1)), true, tag + ': and stay inside their card');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

async function reducedMotion(browser, name, width, editing) {
  const tag = `${name} ${width} ${editing ? 'editor' : 'store'} reduced motion`;
  const t = await usual(browser, name, width, editing, {reducedMotion: 'reduce', ...(name === 'product-duo' ? {settings: {mobile_layout: 'swipe'}} : {})});
  eq(await t.page.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('[data-r7k-root]') && !a.effect.target.closest('.product-item')).length), 0, tag + ': nothing of the section is animating (the inside of a theme product card is the card\'s own)');
  eq(await t.root('[data-r7k-root]').evaluate(el => [el.hidden, getComputedStyle(el).opacity]), [false, '1'], tag + ': the content is fully visible');
  if (name === 'recently-viewed') {
    eq(await t.css('.r7rv__arrow', 'transitionDuration'), '0s', tag + ': no arrow transition');
    eq(await t.root('[data-rv-card]').first().evaluate(el => getComputedStyle(el).opacity), '1', tag + ': cards visible');
  } else eq(await t.css('.r7duo__media img', 'transitionDuration'), '0s', tag + ': no picture transition');
  const track = t.root('[data-r7k-track]');
  if (await track.evaluate(el => el.scrollWidth > el.clientWidth + 2)) {
    await track.focus(); await t.page.keyboard.press('ArrowRight');
    ok((await track.evaluate(el => el.scrollLeft)) > 0, tag + ': a key moves the row at once, with no smooth scroll');
  }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* ------------------------------------------------------------ run */
(async () => {
  const only = process.argv.slice(2), names = Object.keys(CFG).filter(n => !only.length || only.includes(n));
  const browser = await launch();
  try {
    for (const name of names) {
      staticChecks(name);
      if (name === 'recently-viewed') await rvAnswer();
      else await duoCart(browser);
      for (const width of [375, 1366]) {
        if (name === 'recently-viewed') { await rvList(browser, width); await rvBuilder(browser, width); }
        for (const editing of [true, false]) {
          await inheritance(browser, name, width, editing);
          await schemes(browser, name, width, editing);
          await customStyle(browser, name, width, editing);
          await priority(browser, name, width, editing);
          await everyControl(browser, name, width, editing);
          await selectsDistinct(browser, name, width, editing);
          await twoInstances(browser, name, width, editing);
          await addedBlocksAndRedraws(browser, name, width, editing);
          await picturesKept(browser, name, width, editing);
          await firstPaint(browser, name, width, editing);
          await reducedMotion(browser, name, width, editing);
          if (name === 'recently-viewed') await rvScroller(browser, width, editing);
          else { await duoData(browser, width, editing); await duoLayout(browser, width, editing); }
          console.log(`  ${name} ${width} ${editing ? 'editor' : 'store'}: ${checks} checks so far`);
        }
      }
    }
  } finally { await browser.close(); }
  console.log(`theme r7 products: ${checks} checks passed (${names.join(', ')}; 375 and 1366; builder and visitor's page)`);
})().catch(e => { console.error(e); process.exit(1); });
