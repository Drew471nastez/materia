/* Galleries A and B, round 3: custom fonts, weights and button shape must win
   over the real theme rules (snippets/theme-controls: Typography "Use in every
   section" and Buttons "Use shared button size and shape", both on), live and
   after a redraw, and the theme values must come back when switched off.

   Sections: Gallery Interactive 2 (gallery-interactive), Gallery Simple 3
   (gallery-simple3), Gallery Simple 4 (gallerysimple4), Gallery Simple 5
   (gallerysimple2). Gallery Simple 1, Gallery Grid 1, Image 2 and Gallery
   Scrolling Logos draw no text and no buttons with own typography; they are
   covered by the select sweep below.

   1. Every custom typography/button toggle: on (emit and redraw) the computed
      value lands on the element and on a descendant, and the matching
      data-own-* attribute is present; off (emit and redraw) the theme value
      and no attribute. 375 and 1366, editor and storefront, priority on.
   2. Every option of every weight select gives its computed weight.
   3. Every option of every other visible select in all eight sections gives a
      distinct rendering (priority on, live and redraw, 375 + 1366 combined).
   4. Theme inheritance with priority 'off'.

   Run: LIQUIDJS=<path to liquidjs> node tests/theme-media-galleries-typography.cjs [section] */
const assert = require('assert/strict'), {launch, mount, schemaOf} = require('./media-fixture.cjs');
const ASSETS = {'gallery-basic2': 'media-live-galleries-a.js', 'gallery-grid1': 'media-live-galleries-a.js', 'gallery-interactive': 'media-live-galleries-a.js', 'gallery-simple3': 'media-live-galleries-a.js', gallerysimple2: 'media-live-galleries-b.js', gallerysimple4: 'media-live-galleries-b.js', 'images-carousel': 'media-live-galleries-b.js', 'image-2': 'media-live-galleries-b.js'};
const TEST_CSS = '.shopify-section *{transition-duration:0s!important;transition-delay:0s!important}';
const only = process.argv[2];
let checks = 0;
const ok = (c, m) => { assert(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const V = {family: 'Verdana', fallback_families: 'sans-serif'}, T = {family: 'Tahoma', fallback_families: 'sans-serif'};
const IMG = {url: 'https://theme.test/photo-a.png', width: 800, height: 600};
const isV = v => /^"?Verdana/.test(v), isT = v => /^"?Tahoma/.test(v), isGeorgia = v => /^"?Georgia/.test(v), isArial = v => /^"?Arial/.test(v);
const W = (m, d) => ({m, d});

/* Each case: block (type, n) or section; on: settings that switch it on; off: settings that switch it off.
   probes: [selector, prop, custom (value|fn), theme (value|fn), attr?]. */
const CASES = {
  'gallery-interactive': {
    blocks: [{type: 'heading', settings: {title: 'Our <strong>new</strong> work'}}, {type: 'subheading', settings: {text: 'Shot in the <em>studio</em>'}}, {type: 'gallery_image', settings: {image: IMG}}, {type: 'gallery_image'}],
    cases: [
      {name: 'heading custom font', block: ['heading'], on: {enable_custom_fonts: true, font: V}, off: {enable_custom_fonts: false},
        probes: [['.mga-gi__heading', 'fontFamily', isV, isGeorgia, 'data-own-font'], ['.mga-gi__heading strong', 'fontFamily', isV, isGeorgia]]},
      {name: 'heading weight', block: ['heading'], on: {font_weight: '300'}, off: {font_weight: 'inherit'},
        probes: [['.mga-gi__heading', 'fontWeight', '300', '700', 'data-own-weight']]},
      {name: 'heading size', block: ['heading'], on: {size_desktop: 50, size_mobile: 22}, off: {size_desktop: 32, size_mobile: 30},
        probes: [['.mga-gi__heading', 'fontSize', W('22px', '50px'), W('30px', '32px')], ['.mga-gi__heading strong', 'fontSize', W('22px', '50px'), W('30px', '32px')]]},
      {name: 'subheading custom font', block: ['subheading'], on: {enable_custom_fonts: true, font: V}, off: {enable_custom_fonts: false},
        probes: [['.mga-gi__sub', 'fontFamily', isV, isArial, 'data-own-font'], ['.mga-gi__sub em', 'fontFamily', isV, isArial]]},
      {name: 'subheading weight', block: ['subheading'], on: {font_weight: '700'}, off: {font_weight: 'inherit'},
        probes: [['.mga-gi__sub', 'fontWeight', '700', '400', 'data-own-weight'], ['.mga-gi__sub em', 'fontWeight', '700', '400']]},
    ],
    weights: [{block: ['heading'], id: 'font_weight', sel: '.mga-gi__heading', inherit: '700'}, {block: ['subheading'], id: 'font_weight', sel: '.mga-gi__sub', inherit: '400'}],
  },
  'gallery-simple3': {
    blocks: [{type: 'heading', settings: {text: 'New <strong>work</strong>'}}, {type: 'subheading', settings: {text: '<p>Shot in the <strong>studio</strong></p>'}}, {type: 'image', settings: {background_image: IMG, gallery_link_url: '/pages/a', gallery_link_label: 'View'}}, {type: 'image'}],
    cases: [
      {name: 'section custom heading font', on: {enable_custom_fonts: true, heading_font: V}, off: {enable_custom_fonts: false},
        probes: [['.mga-s3__title', 'fontFamily', isV, isGeorgia, 'data-own-font'], ['.mga-s3__title strong', 'fontFamily', isV, isGeorgia]]},
      {name: 'section heading weight', on: {heading_font_weight: 'lighter'}, off: {heading_font_weight: 'inherit'},
        probes: [['.mga-s3__title', 'fontWeight', '100', '700', 'data-own-weight']]},
      {name: 'heading block custom font', block: ['heading'], on: {enable_custom_fonts: true, font: V}, off: {enable_custom_fonts: false},
        probes: [['.mga-s3__title', 'fontFamily', isV, isGeorgia, 'data-own-font'], ['.mga-s3__title strong', 'fontFamily', isV, isGeorgia]]},
      {name: 'heading block size', block: ['heading'], on: {size_enable: true, size_desktop: 50, size_mobile: 22}, off: {size_enable: false},
        probes: [['.mga-s3__title', 'fontSize', W('22px', '50px'), W('28px', '35px')]]},
      {name: 'subheading block custom font', block: ['subheading'], on: {enable_custom_fonts: true, font: V}, off: {enable_custom_fonts: false},
        probes: [['.mga-s3__sub', 'fontFamily', isV, isArial, 'data-own-font'], ['.mga-s3__sub p', 'fontFamily', isV, isArial], ['.mga-s3__sub strong', 'fontFamily', isV, isArial]]},
      {name: 'subheading block size', block: ['subheading'], on: {size_enable: true, size: 21}, off: {size_enable: false},
        probes: [['.mga-s3__sub', 'fontSize', '21px', '16px'], ['.mga-s3__sub p', 'fontSize', '21px', '16px']]},
    ],
    legacy: {settings: {heading_text: 'Saved <strong>title</strong>'}, blocks: [{type: 'image', settings: {background_image: IMG}}],
      cases: [
        {name: 'legacy heading custom font', on: {enable_custom_fonts: true, heading_font: V}, off: {enable_custom_fonts: false}, probes: [['[data-mga-heading]', 'fontFamily', isV, isGeorgia, 'data-own-font'], ['[data-mga-heading] strong', 'fontFamily', isV, isGeorgia]]},
        {name: 'legacy heading weight', on: {heading_font_weight: 'normal'}, off: {heading_font_weight: 'inherit'}, probes: [['[data-mga-heading]', 'fontWeight', '400', '700', 'data-own-weight']]},
      ]},
    weights: [{id: 'heading_font_weight', sel: '.mga-s3__title', inherit: '700', map: {lighter: '100', normal: '400', bold: '700'}}],
  },
  gallerysimple4: {
    blocks: [{type: 'heading', settings: {text: 'Gallery <strong>one</strong>'}}, {type: 'subheading', settings: {text: '<p>Discover <em>our</em> collection</p>'}}, {type: 'gallery_item', settings: {image: IMG}}, {type: 'gallery_item'}],
    cases: [
      {name: 'section custom fonts', on: {enable_custom_fonts: true, heading_font: V, body_font: T}, off: {enable_custom_fonts: false},
        probes: [['.gs4__heading', 'fontFamily', isV, isGeorgia, 'data-own-font'], ['.gs4__heading strong', 'fontFamily', isV, isGeorgia], ['.gs4__sub', 'fontFamily', isT, isArial, 'data-own-font'], ['.gs4__sub p', 'fontFamily', isT, isArial], ['.gs4__sub em', 'fontFamily', isT, isArial]]},
      {name: 'heading weight', block: ['heading'], on: {font_weight: '300'}, off: {font_weight: 'inherit'},
        probes: [['.gs4__heading', 'fontWeight', '300', '700', 'data-own-weight']]},
      {name: 'subheading weight', block: ['subheading'], on: {font_weight: '700'}, off: {font_weight: 'inherit'},
        probes: [['.gs4__sub', 'fontWeight', '700', '400', 'data-own-weight'], ['.gs4__sub p', 'fontWeight', '700', '400']]},
      {name: 'heading size', block: ['heading'], on: {font_size_desktop: 50, font_size_mobile: 22}, off: {font_size_desktop: 36, font_size_mobile: 28},
        probes: [['.gs4__heading', 'fontSize', W('22px', '50px'), W('28px', '36px')]]},
      {name: 'subheading size', block: ['subheading'], on: {font_size_desktop: 24, font_size_mobile: 12}, off: {font_size_desktop: 18, font_size_mobile: 16},
        probes: [['.gs4__sub p', 'fontSize', W('12px', '24px'), W('16px', '18px')]]},
    ],
    weights: [{block: ['heading'], id: 'font_weight', sel: '.gs4__heading', inherit: '700', map: {normal: '400', bold: '700'}}, {block: ['subheading'], id: 'font_weight', sel: '.gs4__sub', inherit: '400', map: {normal: '400', bold: '700'}}],
  },
  gallerysimple2: {
    blocks: [{type: 'eyebrow', settings: {text: 'Latest <em>designs</em>'}}, {type: 'heading', settings: {heading: 'Share your <strong>best</strong> images'}}, {type: 'button', settings: {button_text: 'Explore'}}, {type: 'gallery_image_02', settings: {image: IMG}}, {type: 'gallery_image_02'}],
    cases: [
      {name: 'section custom fonts', on: {enable_custom_fonts: true, heading_font: V, body_font: T}, off: {enable_custom_fonts: false},
        probes: [['.gs2__heading', 'fontFamily', isV, isGeorgia, 'data-own-font'], ['.gs2__heading strong', 'fontFamily', isV, isGeorgia], ['.gs2__tagline', 'fontFamily', isT, isArial, 'data-own-font'], ['.gs2__tagline em', 'fontFamily', isT, isArial], ['.gs2__btn', 'fontFamily', isT, isArial, 'data-own-font']]},
      {name: 'heading weight', block: ['heading'], on: {heading_weight: '300'}, off: {heading_weight: 'inherit'},
        probes: [['.gs2__heading', 'fontWeight', '300', '700', 'data-own-weight']]},
      {name: 'tagline weight', on: {tagline_font_weight: '800'}, off: {tagline_font_weight: '400'},
        probes: [['.gs2__tagline', 'fontWeight', '800', '400'], ['.gs2__tagline em', 'fontWeight', '800', '400']]},
      {name: 'heading size', block: ['heading'], on: {desktop_heading_size: 56, mobile_heading_size: 24}, off: {desktop_heading_size: 42, mobile_heading_size: 32},
        probes: [['.gs2__heading', 'fontSize', W('24px', '56px'), W('32px', '42px')]]},
      {name: 'button own shape', block: ['button'], on: {use_theme_button: false, button_border_radius: 3, button_font_size: 22, button_font_size_mobile: 11, button_font_weight: '800', desktop_button_padding_vertical: 20, desktop_button_padding_horizontal: 44, mobile_button_padding_vertical: 6, mobile_button_padding_horizontal: 16}, off: {use_theme_button: true},
        probes: [['.gs2__btn', 'borderTopLeftRadius', '3px', '12px', 'data-own-shape'], ['.gs2__btn', 'fontSize', W('11px', '22px'), '16px'], ['.gs2__btn', 'fontWeight', '800', '500', 'data-own-weight'], ['.gs2__btn', 'paddingTop', W('6px', '20px'), '12px'], ['.gs2__btn', 'paddingLeft', W('16px', '44px'), '24px']]},
    ],
    legacy: {settings: {tagline: 'Saved <em>tagline</em>'}, blocks: [{type: 'heading'}, {type: 'button'}, {type: 'gallery_image_02'}],
      cases: [{name: 'legacy tagline custom font', on: {enable_custom_fonts: true, body_font: T}, off: {enable_custom_fonts: false}, probes: [['[data-mgb-tagline]', 'fontFamily', isT, isArial, 'data-own-font'], ['[data-mgb-tagline] em', 'fontFamily', isT, isArial]]}]},
    weights: [{block: ['heading'], id: 'heading_weight', sel: '.gs2__heading', inherit: '700'}, {id: 'tagline_font_weight', sel: '.gs2__tagline'}, {block: ['button'], id: 'button_font_weight', sel: '.gs2__btn', with: {use_theme_button: false}}],
  },
};

/* Selects whose options only show on hover, or need another setting first. */
const SWEEP = {
  'gallery-basic2': {blocks: [{type: 'image', settings: {background_image: IMG, gallery_link_url: '/a'}}, {type: 'image', settings: {video_url: 'https://theme.test/clip.mp4', background_image: IMG}}], hover: {image_hover_animation: '.mga-b2__item:nth-child(1) .mga-b2__media'}},
  'gallery-grid1': {settings: {background_image_1: IMG}, hover: {image_hover_animation: '[data-mga-slot="1"]'}},
  'gallery-interactive': {},
  'gallery-simple3': {blocks: [{type: 'heading'}, {type: 'image', settings: {background_image: IMG}}, {type: 'image', settings: {background_image: IMG}}], hover: {image_hover_animation: '.mga-s3__item:nth-child(2) .mga-s3__media'}},
  gallerysimple2: {with: {button_hover: {use_theme_button: false}, button_target: {button_link: '/pages/a'}}, hover: {button_hover: '.gs2__btn'}},
  gallerysimple4: {},
  'images-carousel': {blocks: [1, 2, 3, 4].map(() => ({type: 'image_block', settings: {image: IMG}})), settings: {enable_second_scrolling: true}},
  'image-2': {settings: {image: IMG}},
};
const WEIGHT_IDS = /weight/;

const blockOf = (t, [type, n = 0]) => t.blockId(type, n);
const cur = t => t.rendered[0].section;
async function set(t, c, values, via) {
  if (!c.block) return via === 'emit' ? t.emit(values) : t.redraw({settings: values});
  const id = blockOf(t, c.block);
  if (via === 'emit') return t.emit(values, id);
  return t.redraw({blocks: cur(t).blocks.map(b => ({type: b.type, settings: b.id === id ? {...b.settings, ...values} : b.settings}))});
}
const resolve = (x, w) => x && typeof x === 'object' ? (w < 750 ? x.m : x.d) : x;
const match = (got, exp) => typeof exp === 'function' ? exp(got) : String(got) === String(exp);
async function probe(t, [sel, prop, , , attr]) {
  return t.page.evaluate(({root, sel, prop, attr}) => {
    const el = document.querySelector(root + ' ' + sel); if (!el) return {missing: true};
    return {v: getComputedStyle(el)[prop], a: attr ? el.hasAttribute(attr) : null};
  }, {root: '#shopify-section-' + t.section.id, sel, prop, attr});
}
async function runCase(t, c, width, label) {
  for (const via of ['emit', 'redraw']) {
    for (const [state, settings, idx] of [['on', c.on, 2], ['off', c.off, 3]]) {
      await set(t, c, settings, via);
      for (const p of c.probes) {
        const got = await probe(t, p), exp = resolve(p[idx], width), l = `${label} ${c.name} ${via} ${state} ${p[0]} ${p[1]}`;
        ok(!got.missing, l + ' element exists');
        ok(match(got.v, exp), l + ': got ' + got.v + ', expected ' + (typeof exp === 'function' ? exp.name : exp));
        if (p[4]) eq(got.a, state === 'on', l + ' ' + p[4]);
      }
    }
  }
}
async function weights(t, w, width, label) {
  const {schema} = schemaOf(t.name);
  const list = w.block ? schema.blocks.find(b => b.type === w.block[0]).settings : schema.settings;
  const opts = list.find(x => x.id === w.id).options.map(o => o.value);
  const c = {block: w.block};
  if (w.with) await set(t, c, w.with, 'emit');
  for (const via of ['emit', 'redraw']) for (const v of opts) {
    await set(t, c, {...(w.with || {}), [w.id]: v}, via);
    const exp = v === 'inherit' ? w.inherit : (w.map && w.map[v]) || v;
    const got = await probe(t, [w.sel, 'fontWeight']);
    eq(got.v, exp, `${label} ${w.id}=${v} ${via}`);
  }
}

async function typography(browser, name) {
  const cfg = CASES[name];
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const label = name + ' ' + width + (editing ? ' editor' : ' storefront');
    for (const [kind, set0] of [['blocks', cfg], ['legacy', cfg.legacy]]) {
      if (!set0) continue;
      for (const c of set0.cases) {
        const t = await mount(browser, name, {width, editing, blocks: set0.blocks, settings: set0.settings || {}, assets: [ASSETS[name]]});
        t.name = name; await t.page.addStyleTag({content: TEST_CSS}); await t.page.waitForTimeout(60);
        // Theme values first.
        for (const p of c.probes) { const got = await probe(t, p); ok(match(got.v, resolve(p[3], width)), `${label} ${kind} ${c.name} theme first ${p[0]} ${p[1]}: ${got.v}`); if (p[4]) eq(got.a, false, `${label} ${c.name} no ${p[4]} at first`); }
        await runCase(t, c, width, label + ' ' + kind);
        eq(t.errors, [], label + ' ' + c.name + ' errors');
        await t.page.close();
      }
    }
    for (const w of cfg.weights) {
      const t = await mount(browser, name, {width, editing, blocks: cfg.blocks, assets: [ASSETS[name]]}); t.name = name;
      await weights(t, w, width, label); eq(t.errors, [], label + ' weight errors'); await t.page.close();
    }
  }
  // Theme inheritance with both priorities off.
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, blocks: cfg.blocks, assets: [ASSETS[name]], priority: 'off'});
    for (const c of cfg.cases) for (const p of c.probes) if (p[1] !== 'fontSize' || !c.block) { const got = await probe(t, p); ok(match(got.v, resolve(p[3], width)), `${name} ${width} priority off theme ${p[0]} ${p[1]}: ${got.v}`); }
    for (const c of cfg.cases.slice(0, 1)) { await runCase(t, c, width, name + ' ' + width + ' priority off'); }
    eq(t.errors, [], name + ' priority off errors'); await t.page.close();
  }
}

/* Signature of the whole section: geometry plus the computed styles a select can change. */
const PROPS = ['color', 'backgroundColor', 'fontFamily', 'fontWeight', 'fontSize', 'textAlign', 'objectFit', 'objectPosition', 'animationDirection', 'animationName', 'borderTopLeftRadius', 'boxShadow', 'display', 'flexDirection', 'gridTemplateColumns', 'paddingLeft', 'paddingTop', 'maxWidth', 'aspectRatio', 'opacity', 'transform', 'filter'];
async function signature(t, hover) {
  const root = '#shopify-section-' + t.section.id;
  if (hover) { await t.page.hover(root + ' ' + hover); await t.page.waitForTimeout(80); }
  const sig = await t.page.evaluate(({root, PROPS}) => [...document.querySelectorAll(root + ' *')].filter(e => !['STYLE', 'SCRIPT', 'path', 'circle'].includes(e.tagName)).map(e => {
    const r = e.getBoundingClientRect(), c = getComputedStyle(e), inTrack = e.closest('.mq__track');
    const attrs = [...e.attributes].filter(a => /^(target|rel|data-dir|data-width|data-full|data-media|href|type)$/.test(a.name)).map(a => a.name + '=' + a.value).join(',');
    return [e.tagName, ...(inTrack ? [Math.round(r.width), Math.round(r.height)] : [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]), ...PROPS.map(p => inTrack && p === 'transform' ? '' : c[p]), attrs].join('|');
  }).join('\n'), {root, PROPS});
  if (hover) { await t.page.mouse.move(1, 1); await t.page.waitForTimeout(60); }
  return sig;
}
async function sweep(browser, name) {
  const cfg = SWEEP[name], {schema} = schemaOf(name), base = CASES[name] || {};
  const blocks = cfg.blocks || base.blocks;
  const selects = [];
  for (const x of schema.settings) if ((x.type === 'select' || x.type === 'radio') && !x.hidden && !WEIGHT_IDS.test(x.id)) selects.push({id: x.id, options: x.options.map(o => o.value)});
  for (const b of schema.blocks || []) for (const x of b.settings || []) if ((x.type === 'select' || x.type === 'radio') && !x.hidden && !WEIGHT_IDS.test(x.id)) selects.push({block: [b.type], id: x.id, options: x.options.map(o => o.value)});
  let n = 0;
  for (const s of selects) {
    const pages = [];
    for (const width of [375, 1366]) {
      const t = await mount(browser, name, {width, editing: true, blocks, settings: cfg.settings || {}, assets: [ASSETS[name]]});
      t.name = name; await t.page.addStyleTag({content: TEST_CSS});
      if (s.block && !t.blockId(s.block[0])) { await t.page.close(); continue; }
      pages.push([width, t]);
    }
    if (!pages.length) continue;
    for (const via of ['emit', 'redraw']) {
      const seen = s.options.map(() => '');
      for (const [width, t] of pages) {
        const c = {block: s.block}, extra = (cfg.with || {})[s.id] || {};
        for (let i = 0; i < s.options.length; i++) { await set(t, c, {...extra, [s.id]: s.options[i]}, via); seen[i] += width + ':' + await signature(t, (cfg.hover || {})[s.id]) + '\n'; }
      }
      for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) ok(seen[i] !== seen[j], `${name} ${s.block ? s.block[0] + '.' : ''}${s.id} ${via}: options ${s.options[i]} and ${s.options[j]} look the same`);
    }
    for (const [, t] of pages) { eq(t.errors, [], name + ' ' + s.id + ' errors'); await t.page.close(); }
    n++;
  }
  return n;
}

(async () => {
  const browser = await launch();
  try {
    for (const name of Object.keys(ASSETS)) {
      if (only && only !== name) continue;
      const c0 = checks;
      if (CASES[name]) await typography(browser, name);
      const n = await sweep(browser, name);
      console.log('  ' + name + ': ' + (checks - c0) + ' checks (' + n + ' selects swept)');
    }
    console.log('galleries typography and selects: ' + checks + ' checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
