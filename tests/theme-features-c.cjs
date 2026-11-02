/* Features group c: Content Tabs, How To Use, Benefits Bar 3
   (ingredients-highlight-bar), Count Up Banner (number-stats), Product
   Benefits 2 and Product Benefits 3, with shopify/assets/live-features-c.js.
   Schema, theme inheritance, colour schemes, every control (a live edit and a
   server redraw at 375 and 1366 both change the section and agree with each
   other; desktop and mobile controls change only at their width), select
   options visibly distinct, custom styling off restores the theme, two copies
   stay independent, an added block, no duplicate set up after redraws, no
   picture reload on unrelated edits, first paint equals the hydrated paint,
   no overflow at 375 and no errors. Behaviour (carousel keys, autoplay, count
   up, video) is in tests/theme-features-c-runtime.cjs.

   LIQUIDJS=<path to liquidjs> node tests/theme-features-c.cjs [section ...] */
const assert = require('assert/strict');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');

const ASSET = 'live-features-c.js';
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const VID = {sources: [{url: 'https://theme.test/up.mp4', mime_type: 'video/mp4'}]};
const SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><path d="M2 2h4"/></svg>';
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
const MONO = {family: 'Courier New', fallback_families: 'monospace'};
let checks = 0;
const fails = [];
/* failures are collected and listed together at the end */
const ok = (c, m) => { try { assert.ok(c, m); checks++; } catch (e) { fails.push(m); } };
const eq = (a, b, m) => { try { assert.deepEqual(a, b, m); checks++; } catch (e) { fails.push(m + '\n    ' + JSON.stringify(a).slice(0, 600)); } };
const clone = o => JSON.parse(JSON.stringify(o));
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);

/* Per section: base blocks, the root selector, settings applied on redraw only (structural), settings with no
   look of their own in the fixture (tested in the runtime test), extra prerequisites, widths where a control
   applies, and a width to compare select options at. */
const FONTS = {heading_font: {enable_custom_fonts: true, body_font: MONO}, body_font: {enable_custom_fonts: true, heading_font: FONT}};
const CFG = {
  'content-tabs': {
    root: '.ctabs', blocks: () => [...presetBlocks('content-tabs'), {type: 'button', settings: {label: 'Second', link: '/pages/a', style: 'outline'}}],
    pre: {...FONTS},
    preBlock: {heading_font: {heading_custom_font_enable: true}, heading_font_weight: {heading_custom_font_enable: true, heading_font: FONT}, heading_custom_font_enable: {heading_font: FONT}},
    tablet: ['cards_desktop'], deskOnly: ['highlights_gap', 'text_align'], mobileOnly: ['full_width'],
  },
  'how-to-use': {
    root: '.htu-wrap', blocks: () => presetBlocks('how-to-use'),
    pre: {...FONTS, image_fit: {}, mobile_items_per_view: {enable_mobile_carousel: true}},
    novisual: ['carousel_autoplay', 'carousel_autoplay_speed', 'reveal'],
    preBlock: {accent_text: {text: 'How To Use', enable_accent: true, accent_text: 'To'}, accent_italic: {text: 'How To Use', enable_accent: true, accent_text: 'To'}, accent_color: {text: 'How To Use', enable_accent: true, accent_text: 'To', enable_custom_style: true}, enable_accent: {text: 'How To Use', accent_text: 'To'}},
  },
  'ingredients-highlight-bar': {
    root: '.ihb', blocks: () => [...presetBlocks('ingredients-highlight-bar'), ...Array.from({length: 4}, (_, i) => ({type: 'item', settings: {icon: 'leaf', top_label: 'Label ' + i, bottom_label: 'Bottom ' + i}}))],
    pre: {...FONTS},
    preBlock: {custom_image: {icon_source: 'image'}, icon_source: {custom_image: IMG}},
    selectWidth: {mobile_per_view: 749, mobile_align: 375},
    mobileOnly: ['mobile_layout', 'mobile_per_view', 'mobile_align'], deskOnly: ['center_items', 'icon_size'],
    /* a phone item is never narrower than 170px, so at 375 the larger counts look alike; they are compared at 749 */
    narrow: ['mobile_per_view'],
  },
  'number-stats': {
    /* the preset ships no figures (an empty count box draws nothing on the storefront); test numbers here */
    root: '.ns', blocks: () => { const n = [5000, 500, 100]; let i = 0; return presetBlocks('number-stats').map(b => b.type === 'count_box' ? {...b, settings: {...(b.settings || {}), number: n[i++ % 3]}} : b); },
    pre: {headline_font: {override_fonts: true, text_font: MONO}, text_font: {override_fonts: true, headline_font: FONT}, override_fonts: {headline_font: FONT, text_font: MONO}, section_bg_image_brightness: {section_background_image: IMG}, section_background_size: {section_background_image: IMG}, container_border_color: {container_border_size: 4}},
    novisual: ['reveal'],
    mobileOnly: ['mobile_text_alignment'], deskOnly: ['text_alignment', 'heading_subheading_gap', 'vertical_gap', 'count_size', 'description_size', 'section_padding_top', 'section_padding_bottom', 'section_padding_left_right', 'container_padding_top_bottom', 'container_padding_left_right', 'size'],
    /* the fixture's body line height is 1.5 */
    equal: ['line_height=1.5'],
  },
  'product-benefits-2': {
    root: '.pb2c-wrap', blocks: () => presetBlocks('product-benefits-2'),
    pre: {...FONTS},
    preBlock: {accent_text: {text: 'Built for everyday use', enable_accent: true, accent_text: 'everyday'}, accent_italic: {text: 'Built for everyday use', enable_accent: true, accent_text: 'everyday'}, accent_color: {text: 'Built for everyday use', enable_accent: true, accent_text: 'everyday', enable_custom_style: true}, enable_accent: {text: 'Built for everyday use', accent_text: 'everyday'}, image_cover: {icon_source: 'image', image: IMG}, image: {icon_source: 'image'}, icon_source: {image: IMG, svg_code: SVG}},
    mobileOnly: ['mobile_layout'],
  },
  'product-benefits-3': {
    root: '.pb3-wrap', blocks: () => presetBlocks('product-benefits-3'),
    pre: {...FONTS, image_radius_custom_enabled: {image_radius_custom: 40}},
    redraw: ['video_shopify', 'video'], deskOnly: ['layout', 'image_column_ratio', 'content_column_ratio'], mobileOnly: ['column_gap'],
    preBlock: {image: {icon_source: 'image'}, icon_source: {image: IMG, svg_code: SVG}},
  },
};
const STRUCTURAL = ['reset_spacing']; /* the neighbour sections' spacing changes on the builder's redraw */
const SPACING = '.shopify-section{margin-top:9px;margin-bottom:9px}';

function valuesFor(x, cur = x.default) {
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'text_alignment': return ['left', 'center', 'right'].filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': case 'color_background': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return ['Edited text'];
    case 'number': return [1234];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <strong>copy</strong></p>'];
    case 'textarea': return ['Edited longer text'];
    case 'html': return [SVG];
    case 'url': return [x.id === 'video' ? 'https://theme.test/clip.mp4' : '/pages/test'];
    case 'image_picker': return [IMG];
    case 'video': return [VID];
    case 'font_picker': return [FONT];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
/* Settings a control's visible_if asks for, plus all colours when it is a custom styling toggle. */
function prereq(x, list, base) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true)))?/g)) {
    const [, id, op, str, lit] = m, want = str ?? (lit === undefined ? true : lit === 'true');
    if (!op) out[id] = true;
    else if (op === '==') out[id] = want;
    else if ((out[id] ?? base[id]) === want) { const s = list.find(y => y.id === id); out[id] = s.options.map(o => o.value).filter(v => v !== want).pop(); }
  }
  if (['enable_custom_style', 'use_custom_background', 'custom_colors'].includes(x.id)) for (const y of list) if (y.type === 'color' || y.type === 'color_background') out[y.id] = '#13579b';
  return out;
}

async function addFp(page, rootSel) {
  await page.addStyleTag({content: '.shopify-section *{transition:none !important}'});
  await page.evaluate(rootSel => {
    const P = ['color', 'backgroundColor', 'backgroundImage', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textTransform', 'letterSpacing', 'lineHeight', 'textAlign', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap', 'flexDirection', 'alignItems', 'justifyContent', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomColor', 'aspectRatio', 'objectFit', 'opacity', 'display', 'gridTemplateColumns', 'transform', 'boxShadow', 'borderTopWidth', 'borderTopColor', 'borderBottomWidth', 'borderLeftWidth', 'borderLeftColor', 'width', 'height', 'maxWidth', 'filter', 'strokeWidth'];
    const norm = v => String(v).replace(/"/g, '').replace(/\?width=\d+/g, '');
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector(rootSel), out = {}, seen = {};
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.closest('template')) continue;
        if (e.ownerSVGElement && !['path', 'circle', 'polyline', 'polygon', 'rect', 'line', 'ellipse'].includes(e.tagName)) continue;
        const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
        let k = (e.dataset?.fcBlock ? 'b:' + e.dataset.fcBlock : e.tagName + '.' + (cls.split(' ')[0] || ''));
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        if (e.ownerSVGElement) { out[k] = {d: e.getAttribute('d') || e.getAttribute('points') || [e.getAttribute('cx'), e.getAttribute('x'), e.getAttribute('x1'), e.getAttribute('width'), e.getAttribute('r')].join(), sw: cs.strokeWidth, c: cs.stroke}; continue; }
        for (const p of P) o[p] = norm(cs[p]);
        o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
        for (const v of ['--mb-bg', '--mb-text', '--mb-hover-bg', '--mb-hover-text', '--mb-border', '--mb-hover-border']) o[v] = cs.getPropertyValue(v).trim();
        if (!e.children.length || /^(H\d|P|A|BUTTON|SPAN)$/.test(e.tagName)) o.text = e.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
        o.tag = e.tagName;
        for (const a of ['href', 'alt', 'hidden', 'type', 'data-theme-button', 'data-ti-no-reveal', 'data-own-font', 'data-own-weight', 'data-own-size']) o[a] = e.getAttribute(a);
        o.cls = [...e.classList].sort().join(' ');
        if (e.tagName === 'IMG' || e.tagName === 'VIDEO' || e.tagName === 'SOURCE') o.src = norm((e.getAttribute('src') || '').split('?')[0]);
        const b = getComputedStyle(e, '::before'); if (b.content !== 'none') o.before = norm([b.backgroundImage, b.backgroundSize, b.filter].join());
        out[k] = o;
      }
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom};
      return out;
    };
  }, rootSel);
}
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const frames = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const deep = (a, b) => { const out = []; for (const k of diff(a, b)) { const x = a[k] || {}, y = b[k] || {}; for (const p of new Set([...Object.keys(x), ...Object.keys(y)])) if (JSON.stringify(x[p]) !== JSON.stringify(y[p])) out.push(k + '.' + p + ': ' + JSON.stringify(x[p]) + ' vs ' + JSON.stringify(y[p])); } return out; };
const scopeOf = id => /desktop/.test(id) ? 'desk' : /mobile/.test(id) ? 'mob' : '';

function cases(name, cfg) {
  const {schema} = schemaOf(name), out = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header') out.push({x, list: schema.settings, btype: null});
  for (const bt of schema.blocks || []) for (const x of bt.settings || []) if (x.id && !x.hidden && x.type !== 'header') out.push({x, list: bt.settings, btype: bt.type});
  return out;
}

async function everyControl(browser, name, width) {
  const cfg = CFG[name], {schema} = schemaOf(name);
  const t = await mount(browser, name, {width, editing: true, blocks: cfg.blocks(), assets: [ASSET]});
  await t.page.addStyleTag({content: SPACING}); await addFp(t.page, cfg.root);
  const base = clone(t.section.settings), baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  for (const x of schema.settings) if (x.id && !(x.id in base)) base[x.id] = '';
  for (const b of baseBlocks) for (const x of schema.blocks.find(y => y.type === b.type).settings || []) if (x.id && !(x.id in b.settings)) b.settings[x.id] = '';
  const mob = id => (cfg.mobileOnly || []).includes(id) || scopeOf(id) === 'mob', desk = id => (cfg.deskOnly || []).includes(id) || scopeOf(id) === 'desk';
  for (const {x, list, btype} of cases(name, cfg)) {
    const bi = btype ? baseBlocks.findIndex(b => b.type === btype) : -1;
    if (btype) assert.ok(bi >= 0, name + ': no base block ' + btype);
    const cur = btype ? baseBlocks[bi].settings : base;
    const pre = {...prereq(x, list, cur), ...((btype ? cfg.preBlock : cfg.pre) || {})[x.id] || {}};
    if (!btype && ['enable_custom_fonts'].includes(x.id)) Object.assign(pre, {heading_font: FONT, body_font: MONO});
    const values = valuesFor(x, {...cur, ...pre}[x.id]);
    for (const v of values) {
      const tag = `${name}${btype ? ' [' + btype + ']' : ''} ${x.id}=${JSON.stringify(v).slice(0, 30)} @${width}`;
      const blocksWith = extra => baseBlocks.map((b, i) => ({type: b.type, settings: i === bi ? {...b.settings, ...extra} : b.settings}));
      const settingsWith = extra => ({...base, ...(btype ? {} : extra)});
      await t.redraw(btype ? {settings: base, blocks: blocksWith(pre)} : {settings: settingsWith(pre), blocks: baseBlocks});
      await frames(t);
      const before = await fp(t);
      const live = !(STRUCTURAL.includes(x.id) || (cfg.redraw || []).includes(x.id));
      let liveFp = null;
      if (live) { await t.emit({[x.id]: v}, btype ? t.blockId(btype) : undefined); await frames(t); liveFp = await fp(t); }
      await t.redraw(btype ? {settings: base, blocks: blocksWith({...pre, [x.id]: v})} : {settings: settingsWith({...pre, [x.id]: v}), blocks: baseBlocks});
      await frames(t);
      const server = await fp(t);
      const novisual = (cfg.novisual || []).includes(x.id);
      const applies = mob(x.id) ? width < 768 : desk(x.id) ? width >= 768 : true;
      const tablet = (cfg.tablet || []).includes(x.id) && width < 1024 && width >= 768;
      if (novisual) { eq(diff(before, server), [], tag + ' has no look of its own here'); continue; }
      if ((cfg.equal || []).includes(x.id + '=' + v)) { eq(deep(liveFp || server, server), [], tag + ': the live edit differs from the redraw'); continue; }
      if ((cfg.narrow || []).includes(x.id) && width < 400) { eq(deep(liveFp, server), [], tag + ': the live edit differs from the redraw'); continue; }
      if (applies) ok(diff(before, server).length > 0, tag + ': the redraw changes nothing');
      else if (!(x.id === 'image_size_desktop' || x.id === 'cards_desktop')) eq(deep(before, server), [], tag + ': changes the other width');
      if (live && !tablet) eq(deep(liveFp, server), [], tag + ': the live edit differs from the redraw');
    }
  }
  eq(t.errors, [], name + ' errors @' + width);
  await t.page.close();
}

/* Every option of every select looks different from every other option. */
async function selectsDistinct(browser, name) {
  const cfg = CFG[name], {schema} = schemaOf(name);
  for (const {x, list, btype} of cases(name, cfg)) {
    if (!['select', 'text_alignment'].includes(x.type)) continue;
    const opts = x.type === 'select' ? x.options.map(o => o.value) : ['left', 'center', 'right'];
    const width = (cfg.selectWidth || {})[x.id];
    const widths = width ? [width] : [375, 1366];
    const seen = {};
    for (const w of widths) {
      const t = await mount(browser, name, {width: w, editing: true, blocks: cfg.blocks(), assets: [ASSET]});
      await addFp(t.page, cfg.root);
      const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)})), bi = btype ? baseBlocks.findIndex(b => b.type === btype) : -1;
      const pre = {...prereq(x, list, btype ? baseBlocks[bi].settings : t.section.settings), ...((btype ? cfg.preBlock : cfg.pre) || {})[x.id] || {}};
      for (const o of opts) {
        if (btype) await t.redraw({blocks: baseBlocks.map((b, i) => ({type: b.type, settings: i === bi ? {...b.settings, ...pre, [x.id]: o} : b.settings}))});
        else await t.redraw({settings: {...pre, [x.id]: o}, blocks: baseBlocks});
        await frames(t);
        (seen[o] = seen[o] || []).push(JSON.stringify(await fp(t)));
      }
      await t.page.close();
    }
    for (let i = 0; i < opts.length; i++) for (let j = i + 1; j < opts.length; j++) if (!(btype === 'subheadline' && x.id === 'line_height' && [opts[i], opts[j]].sort().join() === '1.5,inherit')) ok(seen[opts[i]].some((s, k) => s !== seen[opts[j]][k]), `${name} ${btype || ''} ${x.id}: ${opts[i]} and ${opts[j]} look the same`);
  }
}

async function theme(browser, name) {
  const cfg = CFG[name], {schema} = schemaOf(name);
  ok(schemaProblems(name).length === 0, name + ' schema: ' + schemaProblems(name).join('; '));
  for (const x of schema.settings.concat(...(schema.blocks || []).map(b => b.settings || []))) if (x.type === 'color' && x.id) ok(/enable_custom_style|use_custom_background|custom_colors/.test(x.visible_if || ''), name + ' ' + x.id + ' is behind a custom styling switch');
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const t = await mount(browser, name, {width, editing, blocks: cfg.blocks(), assets: [ASSET]});
    const tag = `${name} @${width} ${editing ? 'editor' : 'store'}`;
    const bg = async () => t.page.evaluate(sel => { let e = document.querySelector('#shopify-section-test ' + sel); const all = [e, ...e.querySelectorAll('*')]; for (const el of all) { const c = getComputedStyle(el).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c; } return ''; }, cfg.root);
    eq(await bg(), 'rgb(24, 32, 40)', tag + ' scheme background');
    const h = await t.page.evaluate(() => { const e = document.querySelector('#shopify-section-test :is(h2, h3)'); const cs = getComputedStyle(e); return [cs.fontFamily, cs.color]; });
    ok(/Georgia/.test(h[0]), tag + ' heading font ' + h[0]);
    ok(['rgb(255, 255, 255)', 'rgb(51, 102, 153)'].includes(h[1]), tag + ' heading colour from the scheme ' + h[1]);
    const p = await t.page.evaluate(() => { const e = [...document.querySelectorAll('#shopify-section-test :is(p, .ihb__bottom, .ctabs__highlight)')].find(x => !x.hidden && x.offsetParent); return e ? getComputedStyle(e).fontFamily : ''; });
    ok(/Arial/.test(p), tag + ' body font ' + p);
    if (name === 'content-tabs') {
      const btn = t.root('[data-fc-type="button"]').first();
      eq(await btn.evaluate(e => [getComputedStyle(e).backgroundColor, getComputedStyle(e).borderTopLeftRadius]), ['rgb(18, 52, 86)', '12px'], tag + ' theme button');
      await btn.hover(); await t.page.waitForTimeout(60);
      eq(await btn.evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 0, 0)', tag + ' theme button hover');
    }
    /* colour scheme, live and redraw */
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t);
    eq(await bg(), 'rgb(250, 250, 250)', tag + ' scheme live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await bg(), 'rgb(250, 250, 250)', tag + ' scheme redraw');
    ok(await t.noOverflow(), tag + ' no overflow');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
  /* custom styling on (every colour set) then off: the theme paint comes back exactly, live and on redraw */
  const toggles = {section: [], blocks: []};
  for (const x of schema.settings) if (['enable_custom_style', 'use_custom_background', 'enable_custom_fonts', 'override_fonts'].includes(x.id)) toggles.section.push(x.id);
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: true, blocks: cfg.blocks(), assets: [ASSET]});
    await addFp(t.page, cfg.root);
    const themeFp = await fp(t), on = {};
    for (const x of schema.settings) { if (toggles.section.includes(x.id)) on[x.id] = true; if (x.type === 'color' || x.type === 'color_background') on[x.id] = '#13579b'; if (x.type === 'font_picker') on[x.id] = FONT; }
    const blockOn = {};
    for (const bt of schema.blocks || []) { const o = {}; for (const x of bt.settings || []) { if (['enable_custom_style', 'custom_colors', 'heading_custom_font_enable'].includes(x.id)) o[x.id] = true; if (x.type === 'color') o[x.id] = '#13579b'; if (x.type === 'font_picker') o[x.id] = FONT; } blockOn[bt.type] = o; }
    await t.emit(on); for (const b of t.section.blocks) await t.emit(blockOn[b.type] || {}, b.id); await frames(t);
    const live = await fp(t);
    ok(diff(themeFp, live).length > 0, name + ' custom styling changes the section @' + width);
    const off = Object.fromEntries(toggles.section.map(k => [k, false])), boff = type => Object.fromEntries(Object.keys(blockOn[type] || {}).filter(k => ['enable_custom_style', 'custom_colors', 'heading_custom_font_enable'].includes(k)).map(k => [k, false]));
    await t.emit(off); for (const b of t.section.blocks) await t.emit(boff(b.type), b.id); await frames(t);
    eq(deep(await fp(t), themeFp), [], name + ' custom styling off live restores the theme @' + width);
    await t.redraw({settings: {...on}, blocks: t.section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(blockOn[b.type] || {})}}))});
    await t.redraw({settings: {...on, ...off}, blocks: t.section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(blockOn[b.type] || {}), ...boff(b.type)}}))});
    await frames(t);
    eq(deep(await fp(t), themeFp), [], name + ' custom styling off on redraw restores the theme @' + width);
    eq(t.errors, [], name + ' custom toggles errors');
    await t.page.close();
  }
}

/* Two copies stay independent; an added block renders and is live; redraws do not stack set ups; first paint = hydrated; no picture reload. */
async function lifecycle(browser, name) {
  const cfg = CFG[name], {schema} = schemaOf(name);
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: true, instances: [{uid: 'a', blocks: cfg.blocks()}, {uid: 'b', blocks: cfg.blocks()}], assets: [ASSET]});
    await addFp(t.page, cfg.root);
    const b0 = await fp(t, 'b');
    const range = schema.settings.find(x => x.type === 'range' && !x.hidden && !scopeOf(x.id) && !STRUCTURAL.includes(x.id)) || schema.settings.find(x => x.type === 'range' && !x.hidden);
    await t.emit({color_scheme: 'alt-scheme', [range.id]: range.max === range.default ? range.min : range.max}, undefined, 'a');
    const firstBlock = t.rendered[0].section.blocks.find(b => (schema.blocks.find(x => x.type === b.type).settings || []).some(s => s.type === 'text' || s.type === 'inline_richtext'));
    const textId = schema.blocks.find(x => x.type === firstBlock.type).settings.find(s => s.type === 'text' || s.type === 'inline_richtext').id;
    await t.emit({[textId]: 'Only in a'}, firstBlock.id, 'a'); await frames(t);
    eq(deep(await fp(t, 'b'), b0), [], name + ' copy b unchanged by edits to a @' + width);
    ok((await fp(t, 'a')) !== null && await t.page.evaluate(() => document.querySelector('#shopify-section-a').textContent.includes('Only in a')), name + ' copy a edited @' + width);
    /* added block, redraw twice, set ups do not stack */
    const extraType = schema.blocks.filter(x => !x.limit || x.limit > cfg.blocks().filter(b => b.type === x.type).length).map(x => x.type).pop();
    const count0 = await t.page.evaluate(() => window.MateriaFeaturesC.count());
    await t.redraw({uid: 'a', blocks: [...cfg.blocks(), {type: extraType, settings: {}}]});
    await t.redraw({uid: 'a', blocks: [...cfg.blocks(), {type: extraType, settings: {}}]});
    eq(await t.page.evaluate(() => window.MateriaFeaturesC.count()), count0, name + ' redraws keep one controller per copy @' + width);
    eq(await t.page.evaluate(() => window.MateriaFeaturesC.listeners()), count0, name + ' no stale set ups after redraws @' + width);
    const added = t.rendered[0].section.blocks.at(-1);
    ok(await t.page.evaluate(id => !!document.querySelector('#shopify-section-a [data-fc-block="' + id + '"]'), added.id), name + ' added ' + extraType + ' block renders @' + width);
    const addedText = (schema.blocks.find(x => x.type === extraType).settings || []).find(s => ['text', 'inline_richtext', 'textarea', 'richtext'].includes(s.type));
    if (addedText) {
      await t.emit({[addedText.id]: addedText.type === 'richtext' ? '<p>Added and edited</p>' : 'Added and edited'}, added.id, 'a'); await frames(t);
      ok(await t.page.evaluate(id => document.querySelector('#shopify-section-a [data-fc-block="' + id + '"]').textContent.includes('Added and edited'), added.id), name + ' added block is live @' + width);
    }
    eq(t.errors, [], name + ' lifecycle errors');
    await t.page.close();
  }
  /* no picture reload on unrelated edits */
  const pic = {
    'content-tabs': {block: 'tab', id: 'image', sel: '.ctabs__media img', other: {title: 'Other words'}},
    'how-to-use': {block: 'step', id: 'image', sel: '.htu__img', other: {title: 'Other words'}},
    'product-benefits-2': {id: 'image', sel: '[data-fc-media] img', other: {tab_padding: 30}},
    'product-benefits-3': {id: 'image', sel: '[data-fc-media] img', other: {panel_radius: 30}},
    'ingredients-highlight-bar': {block: 'item', id: 'custom_image', sel: '.ihb__icon img', pre: {icon_source: 'image'}, other: {top_label: 'Other words'}},
  }[name];
  if (pic) {
    const blocks = cfg.blocks();
    if (pic.block) { const b = blocks.find(x => x.type === pic.block); b.settings = {...b.settings, ...(pic.pre || {}), [pic.id]: IMG}; }
    const t = await mount(browser, name, {width: 1366, editing: true, blocks, settings: pic.block ? {} : {[pic.id]: IMG}, assets: [ASSET]});
    const mark = () => t.page.evaluate(sel => { const i = document.querySelector('#shopify-section-test ' + sel); i.__mark = 1; return i.getAttribute('src'); }, pic.sel);
    const src0 = await mark();
    await t.emit(pic.other, pic.block ? t.blockId(pic.block) : undefined); await t.emit({color_scheme: 'alt-scheme'}); await frames(t);
    eq(await t.page.evaluate(sel => { const i = document.querySelector('#shopify-section-test ' + sel); return [i.__mark, i.getAttribute('src')]; }, pic.sel), [1, src0], name + ' picture kept on unrelated edits');
    eq(t.errors, [], name + ' picture errors');
    await t.page.close();
  }
  /* first paint equals the hydrated paint (editor, and the storefront where nothing counts) */
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const shots = [];
    for (const assets of [[], [ASSET]]) {
      const t = await mount(browser, name, {width, editing, blocks: cfg.blocks(), assets, inlineScripts: false});
      await addFp(t.page, cfg.root); await frames(t);
      const f = await fp(t);
      if (name === 'number-stats' && !editing) for (const k of Object.keys(f)) if (/SPAN\.loudecoms-count-up|H3/.test(k)) { delete f[k].text; delete f[k].rect; delete f[k].width; }
      if (name === 'number-stats' && !editing) for (const k of Object.keys(f)) if (/SPAN\.loudecoms-plus/.test(k)) delete f[k].rect;
      for (const k of Object.keys(f)) if (/ARROW|BUTTON\.ctabs__arrow|BUTTON\.ihb__arrow/.test(k)) { delete f[k].opacity; delete f[k].hidden; delete f[k].rect; delete f[k].display; }
      for (const k of Object.keys(f)) for (const a of ['tabindex']) delete f[k][a];
      shots.push(f);
      await t.page.close();
    }
    eq(deep(shots[0], shots[1]), [], `${name} first paint equals hydrated paint @${width} ${editing ? 'editor' : 'store'}`);
  }
}

(async () => {
  const only = process.argv.slice(2), names = only.length ? only : Object.keys(CFG);
  const browser = await launch();
  try {
    for (const name of names) {
      const start = checks;
      await theme(browser, name);
      await lifecycle(browser, name);
      for (const width of [375, 1366]) await everyControl(browser, name, width);
      await selectsDistinct(browser, name);
      console.log(name + ': ' + (checks - start) + ' checks passed');
    }
    if (fails.length) { console.error(fails.length + ' failures:\n  ' + fails.join('\n  ')); process.exitCode = 1; }
    console.log(checks + ' features-c checks passed (' + names.join(', ') + ')' + (fails.length ? ', ' + fails.length + ' failed' : ''));
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await browser.close(); }
})();
