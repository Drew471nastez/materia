/* Announcement Code Bar and Product Drop Countdown (round 7, shopify/assets/live-r7-promo.js).

   For both sections, at 375 and 1366, in the builder (editing) and on a
   visitor's page (storefront), with the real Theme settings priority rules on:
   schema, theme inheritance (and once with the priority rules off), colour
   scheme switch, every section setting and every block setting (live and
   after a redraw; set back restores the theme), every select option
   distinct, desktop / mobile values at their own width, custom fonts and
   button shape on the element and on a descendant, two instances, added and
   removed blocks, redraws that do not double listeners or timers, text nodes
   kept on unrelated edits, first paint equal to hydrated paint, reduced
   motion, no sideways page scroll. Then what each section does: the copy
   button (clipboard, keyboard, the status line, the fallback that selects
   the code, 44px targets, header group), and the timer (the moment with a
   UTC offset or the visitor's clock, impossible dates, at most one tick a
   second, paused off screen and in a hidden tab, right after a redraw, the
   end: on sale message and label, or hidden, sold out, the empty date).

   The fixture's Liquid date filter is a stub; this file gives it %s (epoch
   seconds) so the first paint's state is the one Shopify prints.

   Run: LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-promo.cjs [section ...] */
const FP = require('./theme-featured-product-round5.cjs');
{
  const base = FP.engine;
  FP.engine = (...a) => {
    const e = base(...a);
    e.registerFilter('date', (v, f) => {
      if (f !== '%s') return String(v || '');
      const t = v === 'now' ? Date.now() : Date.parse(String(v));
      return Number.isFinite(t) ? String(Math.floor(t / 1000)) : String(v || '');
    });
    return e;
  };
}
const {launch, mount, schemaOf, schemaProblems, PANTS, OTHER} = require('./media-fixture.cjs');
const NAMES = ['announcement-code-bar', 'countdown-product-drop'].filter(n => !process.argv.slice(2).length || process.argv.slice(2).includes(n));
const ASSETS = ['live-r7-promo.js'];
const F = family => ({family});
const P = {'announcement-code-bar': 'acb', 'countdown-product-drop': 'pdc'};
const CATEGORY = {'announcement-code-bar': 'Announcements', 'countdown-product-drop': 'Countdowns'};
const HEADERS = {
  'announcement-code-bar': 'General > Layout > Appearance > Typography > Animation > Desktop spacing > Mobile',
  'countdown-product-drop': 'General > Content > Layout > Appearance > Typography > Animation > Desktop spacing > Mobile',
};

let passed = 0;
const failed = [];
let where = '';
const ok = (cond, what, detail) => { if (cond) passed++; else failed.push(where + ' ' + what + (detail !== undefined ? ' :: ' + String(detail).slice(0, 260) : '')); };
const eq = (a, b, what) => ok(a === b, what, JSON.stringify(a) + ' / ' + JSON.stringify(b));
const ne = (a, b, what) => ok(a !== b && !/missing/.test(a + b), what, JSON.stringify(a) + ' / ' + JSON.stringify(b));

/* ------------------------------------------------------------ dates */
const isoAt = ms => new Date(Date.now() + ms).toISOString().slice(0, 16);
const DAY = 86400000, HOUR = 3600000;
const SOON = isoAt(3 * DAY + 5 * HOUR);         /* the base drawing: a UTC clock time, read with +05:30 */
const LATER = isoAt(10 * DAY + 2 * HOUR);       /* read with +05:30: 9 days 20 hours and a half */
const PAST = '2020-01-01T00:00';

/* ------------------------------------------------------------ what is drawn */
const full = (list, given = {}) => { const o = {}; for (const x of list) if (x.id) o[x.id] = x.default !== undefined ? x.default : ''; return {...o, ...given}; };
const blockType = (schema, type) => schema.blocks.find(b => b.type === type);
const BLOCKS = {
  'announcement-code-bar': [
    ['message', {text: 'Free delivery <em>this week</em> with code'}],
    ['code', {code: 'FREESHIP'}],
    ['link', {label: 'Shop now', link: '/collections/all'}],
  ],
  'countdown-product-drop': [
    ['heading', {text: 'Name <em>the</em> drop'}],
    ['text', {text: '<p>Say what is <strong>coming</strong>.</p>'}],
    ['timer', {}],
    ['button', {}],
  ],
};
const SETTINGS = {
  'announcement-code-bar': {},
  'countdown-product-drop': {end_iso: SOON, time_zone: '+05:30', product: PANTS},
};
const baseBlocks = name => { const {schema} = schemaOf(name); return BLOCKS[name].map(([type, s]) => ({type, settings: full(blockType(schema, type).settings, s)})); };
const baseSettings = name => full(schemaOf(name).schema.settings, SETTINGS[name]);
const visible = x => x.id && !x.hidden && !/\{\{\s*false\s*\}\}/.test(x.visible_if || '');

/* ------------------------------------------------------------ probes */
/* A probe is [selector, what, 'hover'?]. what: a computed style, @attribute, #text, #html, #tag, #hidden, #w, #x. */
async function read(t, probes, uid = 'test') {
  const out = [];
  for (const [sel, what, opt] of probes) {
    const target = '#shopify-section-' + uid + (sel === ':wrapper' ? '' : ' ' + sel);
    if (opt === 'hover') await t.page.hover(target).catch(() => {});
    out.push(await t.page.evaluate(({target, what}) => {
      for (const a of document.getAnimations()) if (!a.animationName) a.finish();
      const el = document.querySelector(target);
      if (!el) return 'missing';
      if (what[0] === '@') return String(el.getAttribute(what.slice(1)));
      if (what === '#text') return el.textContent.trim();
      if (what === '#html') return el.innerHTML.trim();
      if (what === '#tag') return el.tagName;
      if (what === '#hidden') return String(el.hidden);
      if (what === '#w') return String(Math.round(el.getBoundingClientRect().width));
      if (what === '#x') return String(Math.round(el.getBoundingClientRect().x));
      return getComputedStyle(el)[what];
    }, {target, what}));
    if (opt === 'hover') await t.page.mouse.move(0, 0);
  }
  return out.join(' | ');
}
const one = (t, sel, uid = 'test') => t.page.locator('#shopify-section-' + uid + ' ' + sel).first();
const frames = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

function changed(x, current) {
  switch (x.type) {
    case 'checkbox': return !current;
    case 'range': return current === x.max ? x.min : x.max;
    case 'select': return x.options.find(o => o.value !== current).value;
    case 'color': return '#ff0000';
    case 'color_scheme': return 'alt-scheme';
    case 'font_picker': return F('Tahoma');
    case 'inline_richtext': return 'Edited <em>words</em>';
    case 'richtext': return '<p>Edited <em>text</em></p>';
    case 'url': return '/pages/edited';
    case 'product': return OTHER;
    default: return 'Edited words';
  }
}

/* What each setting changes. at: d (1366 only) or m (375 only). when: per option, the width it shows at. pre: other settings it needs.
   expect: the probes afterwards. distinct: how many different looks the options give (default: all). redraw: needs the builder's redraw. */
const MARGINS = p => ({
  reset_spacing: {p: [[':wrapper', 'marginTop']], pre: {section_margin_top_desktop: 40, section_margin_top_mobile: 40}},
  section_margin_top_desktop: {at: 'd', p: [[':wrapper', 'marginTop']], pre: {reset_spacing: false}, expect: '300px'},
  section_margin_bottom_desktop: {at: 'd', p: [[':wrapper', 'marginBottom']], pre: {reset_spacing: false}, expect: '300px'},
  section_margin_top_mobile: {at: 'm', p: [[':wrapper', 'marginTop']], pre: {reset_spacing: false}, expect: '300px'},
  section_margin_bottom_mobile: {at: 'm', p: [[':wrapper', 'marginBottom']], pre: {reset_spacing: false}, expect: '300px'},
  show_section_on: {p: [['.' + p, 'display']], when: {mobile: 'd', desktop: 'm'}, expect: 'none', distinct: false},
  reveal: {p: [['.' + p, '@data-ti-no-reveal']]},
});
const SECTION = {
  'announcement-code-bar': {
    ...MARGINS('acb'),
    color_scheme: {p: [['.acb', 'backgroundColor'], ['.acb__msg', 'color'], ['.acb__chip', 'color']], expect: 'rgb(250, 250, 250) | rgb(51, 51, 51) | rgb(16, 16, 16)'},
    /* Measured in a 1700px window: below 1548px Fluid container (1500px) and Full width are both the whole window. */
    section_width: {viewport: 1700, p: [['.acb', '#w']]},
    content_alignment: {p: [['.acb__row', 'justifyContent'], ['.acb__msg', '#x']], expect: /^flex-start \| (16|24)$/},
    show_separator_line: {p: [['.acb', 'borderBottomWidth']], expect: '1px'},
    enable_custom_style: {p: [['.acb', 'backgroundColor'], ['.acb__msg', 'color']], pre: {background_color: '#00ff00', text_color: '#0000ff'}, expect: 'rgb(0, 255, 0) | rgb(0, 0, 255)'},
    background_color: {p: [['.acb', 'backgroundColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    text_color: {p: [['.acb__msg', 'color'], ['.acb__msg em', 'color'], ['.acb__link', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0) | rgb(255, 0, 0)'},
    line_color: {p: [['.acb', 'borderBottomColor']], pre: {enable_custom_style: true, show_separator_line: true}, expect: 'rgb(255, 0, 0)'},
    enable_custom_fonts: {p: [['.acb__msg', 'fontFamily'], ['.acb__msg em', 'fontFamily'], ['.acb__chip', 'fontFamily'], ['.acb', '@data-own-font']], pre: {body_font: F('Tahoma')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif | Tahoma, sans-serif | '},
    body_font: {p: [['.acb__msg', 'fontFamily'], ['.acb__link', 'fontFamily']], pre: {enable_custom_fonts: true, body_font: F('Verdana')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif'},
    font_size: {at: 'd', p: [['.acb__msg', 'fontSize'], ['.acb__chip', 'fontSize']], expect: '20px | 20px'},
    mobile_font_size: {at: 'm', p: [['.acb__msg', 'fontSize']], expect: '18px'},
    padding_top: {at: 'd', p: [['.acb', 'paddingTop']], expect: '24px'},
    padding_bottom: {at: 'd', p: [['.acb', 'paddingBottom']], expect: '24px'},
    padding_top_mobile: {at: 'm', p: [['.acb', 'paddingTop']], expect: '24px'},
    padding_bottom_mobile: {at: 'm', p: [['.acb', 'paddingBottom']], expect: '24px'},
  },
  'countdown-product-drop': {
    ...MARGINS('pdc'),
    color_scheme: {p: [['.pdc', 'backgroundColor'], ['.pdc__heading', 'color'], ['.pdc__text p', 'color'], ['.pdc__num', 'color']], expect: 'rgb(250, 250, 250) | rgb(16, 16, 16) | rgb(51, 51, 51) | rgb(16, 16, 16)'},
    section_width: {viewport: 1700, p: [['.pdc__inner', '#w'], ['.pdc__inner', 'paddingLeft']]},
    product: {redraw: true, p: [['.pdc__title', '#text'], ['.pdc__frame img', '@src'], ['.pdc__price', '#text']]},
    end_iso: {p: [['[data-r7p-unit="d"]', '#text']], value: LATER, expect: '09'},
    /* Each visitor's own clock and UTC+00:00 are the same moment here: the browser runs on UTC. */
    time_zone: {p: [['[data-r7p-unit="d"]', '#text'], ['[data-r7p-unit="h"]', '#text']], distinct: 20},
    after_end: {p: [['.pdc__ended', 'display'], ['.pdc', 'display']], pre: {end_iso: PAST}},
    expired_message: {p: [['.pdc__ended', '#text'], ['.pdc__ended', 'display']], pre: {end_iso: PAST}, expect: 'Edited words | block'},
    image_position: {at: 'd', p: [['.pdc__media', 'order'], ['.pdc__media', '#x']]},
    enable_custom_style: {p: [['.pdc', 'backgroundColor'], ['.pdc__num', 'color']], pre: {section_bg: '#00ff00', digit_color: '#0000ff'}, expect: 'rgb(0, 255, 0) | rgb(0, 0, 255)'},
    section_bg: {p: [['.pdc', 'backgroundColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    card_bg: {p: [['.pdc__frame', 'backgroundColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    price_color: {p: [['.pdc__price', 'color'], ['.pdc__was', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0)'},
    digit_color: {p: [['.pdc__num', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    digit_bg: {p: [['.pdc__unit', 'backgroundColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    line_color: {p: [['.pdc__unit', 'borderTopColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    label_color: {p: [['.pdc__lbl', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    enable_custom_fonts: {p: [['.pdc__heading', 'fontFamily'], ['.pdc__num', 'fontFamily'], ['.pdc__title', 'fontFamily'], ['.pdc__text p', 'fontFamily'], ['.pdc', '@data-own-font']], pre: {heading_font: F('Tahoma'), body_font: F('Verdana')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif | Tahoma, sans-serif | Verdana, sans-serif | '},
    heading_font: {p: [['.pdc__heading', 'fontFamily'], ['.pdc__heading em', 'fontFamily'], ['.pdc__num', 'fontFamily'], ['.pdc__title', 'fontFamily']], pre: {enable_custom_fonts: true, heading_font: F('Verdana'), body_font: F('Verdana')}, expect: /^(Tahoma, sans-serif( \| )?){4}$/},
    body_font: {p: [['.pdc__text p', 'fontFamily'], ['.pdc__text strong', 'fontFamily'], ['.pdc__price', 'fontFamily']], pre: {enable_custom_fonts: true, heading_font: F('Verdana'), body_font: F('Verdana')}, expect: /^(Tahoma, sans-serif( \| )?){3}$/},
    digit_size_desktop: {at: 'd', p: [['.pdc__num', 'fontSize']], expect: '72px'},
    digit_size_mobile: {at: 'm', p: [['.pdc__num', 'fontSize']], expect: '48px'},
    padding_top_desktop: {at: 'd', p: [['.pdc', 'paddingTop']], expect: '200px'},
    padding_bottom_desktop: {at: 'd', p: [['.pdc', 'paddingBottom']], expect: '200px'},
    padding_top_mobile: {at: 'm', p: [['.pdc', 'paddingTop']], expect: '200px'},
    padding_bottom_mobile: {at: 'm', p: [['.pdc', 'paddingBottom']], expect: '200px'},
  },
};
const BLOCK = {
  message: B => ({
    text: {p: [[B, '#html']], expect: 'Edited <em>words</em>'},
    enable_custom_style: {p: [[B, 'color'], [B + ' em', 'color']], pre: {color: '#00ff00'}, expect: 'rgb(0, 255, 0) | rgb(0, 255, 0)'},
    color: {p: [[B, 'color'], [B + ' em', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0)'},
    enable_custom_fonts: {p: [[B, 'fontFamily'], [B + ' em', 'fontFamily'], [B, '@data-own-font']], pre: {font: F('Tahoma')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif | '},
    font: {p: [[B, 'fontFamily'], [B + ' em', 'fontFamily']], pre: {enable_custom_fonts: true, font: F('Verdana')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif'},
  }),
  code: B => ({
    code: {p: [[B + ' .acb__value', '#text'], [B + ' .acb__code', '@aria-label'], [B + ' .acb__code', '@data-code']], expect: 'Edited words | Copy code: Edited words | Edited words'},
    copy_label: {p: [[B + ' .acb__code', '@aria-label']], expect: 'Edited words: FREESHIP'},
    copied_text: {p: [[B + ' .acb__done', '#text']], expect: 'Edited words'},
    enable_custom_style: {p: [[B + ' .acb__chip', 'backgroundColor'], [B + ' .acb__chip', 'color']], pre: {bg_color: '#00ff00', text_color: '#0000ff'}, expect: 'rgb(0, 255, 0) | rgb(0, 0, 255)'},
    bg_color: {p: [[B + ' .acb__chip', 'backgroundColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    text_color: {p: [[B + ' .acb__chip', 'color'], [B + ' .acb__value', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0)'},
    border_color: {p: [[B + ' .acb__chip', 'borderTopColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
  }),
  link: B => ({
    label: {p: [[B, '#text'], [B, '#hidden']], expect: 'Edited words | false'},
    link: {p: [[B, '@href']], expect: '/pages/edited'},
    enable_custom_style: {p: [[B, 'color']], pre: {color: '#00ff00'}, expect: 'rgb(0, 255, 0)'},
    color: {p: [[B, 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
  }),
  heading: B => ({
    text: {p: [[B, '#html']], expect: 'Edited <em>words</em>'},
    enable_custom_style: {p: [[B, 'color'], [B + ' em', 'color']], pre: {color: '#00ff00'}, expect: 'rgb(0, 255, 0) | rgb(0, 255, 0)'},
    color: {p: [[B, 'color'], [B + ' em', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0)'},
    enable_custom_fonts: {p: [[B, 'fontFamily'], [B + ' em', 'fontFamily'], [B, '@data-own-font']], pre: {font: F('Tahoma')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif | '},
    font: {p: [[B, 'fontFamily'], [B + ' em', 'fontFamily']], pre: {enable_custom_fonts: true, font: F('Verdana')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif'},
    size_enable: {p: [[B, 'fontSize'], [B + ' em', 'fontSize']], pre: {size_desktop: 60, size_mobile: 40}, expect: w => w === 375 ? '40px | 40px' : '60px | 60px'},
    size_desktop: {at: 'd', p: [[B, 'fontSize']], pre: {size_enable: true}, expect: '72px'},
    size_mobile: {at: 'm', p: [[B, 'fontSize']], pre: {size_enable: true}, expect: '48px'},
  }),
  text: B => ({
    text: {p: [[B, '#html']], expect: '<p>Edited <em>text</em></p>'},
    enable_custom_style: {p: [[B, 'color'], [B + ' p', 'color']], pre: {color: '#00ff00'}, expect: 'rgb(0, 255, 0) | rgb(0, 255, 0)'},
    color: {p: [[B, 'color'], [B + ' p', 'color'], [B + ' strong', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0) | rgb(255, 0, 0)'},
    enable_custom_fonts: {p: [[B + ' p', 'fontFamily'], [B + ' strong', 'fontFamily'], [B, '@data-own-font']], pre: {font: F('Tahoma')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif | '},
    font: {p: [[B + ' p', 'fontFamily']], pre: {enable_custom_fonts: true, font: F('Verdana')}, expect: 'Tahoma, sans-serif'},
  }),
  timer: B => ({
    label_days: {p: [[B + ' [data-r7p-label="d"]', '#text']], expect: 'Edited words'},
    label_hours: {p: [[B + ' [data-r7p-label="h"]', '#text']], expect: 'Edited words'},
    label_minutes: {p: [[B + ' [data-r7p-label="m"]', '#text']], expect: 'Edited words'},
    label_seconds: {p: [[B + ' [data-r7p-label="s"]', '#text']], expect: 'Edited words'},
    show_seconds: {p: [[B + ' [data-r7p-seconds]', 'display'], [B + ' .pdc__unit:first-child', '#w']], expect: /^none \| /},
  }),
  button: B => { const T = B + ' [data-r7p-btn]'; return {
    label: {p: [[T + ' [data-r7p-before]', '#text'], [T, '#w']], expect: /^Edited words \| /},
    live_label: {p: [[T + ' [data-r7p-after]', '#text']], expect: 'Edited words'},
    link: {p: [[T, '@href'], [T, '#tag']], expect: '/pages/edited | A'},
    style: {p: [[T, 'backgroundColor'], [T, 'color'], [T, '@data-theme-button']], expect: 'rgb(255, 255, 255) | rgb(18, 52, 86) | secondary'},
    enable_custom_style: {p: [[T, 'backgroundColor'], [T, 'borderTopColor']], pre: {bg_color: '#00ff00'}, expect: 'rgb(0, 255, 0) | rgb(0, 255, 0)'},
    bg_color: {p: [[T, 'backgroundColor'], [T, 'borderTopColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0)'},
    text_color: {p: [[T, 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    bg_color_hover: {p: [[T, 'backgroundColor', 'hover']], pre: {enable_custom_style: true}, value: '#0000ff', expect: 'rgb(0, 0, 255)'},
    text_color_hover: {p: [[T, 'color', 'hover']], pre: {enable_custom_style: true}, value: '#00ff00', expect: 'rgb(0, 255, 0)'},
    use_theme_button: {p: [[T, 'borderTopLeftRadius'], [T, 'fontSize'], [T, 'paddingLeft'], [T, 'paddingTop'], [T, '@data-own-shape']], pre: {radius: 33, size: 21, pad_x: 50, pad_y: 20}, expect: '33px | 21px | 50px | 20px | '},
    radius: {p: [[T, 'borderTopLeftRadius']], pre: {use_theme_button: false}, expect: '60px'},
    size: {p: [[T, 'fontSize']], pre: {use_theme_button: false}, expect: '22px'},
    pad_x: {p: [[T, 'paddingLeft'], [T, 'paddingRight']], pre: {use_theme_button: false}, expect: '60px | 60px'},
    pad_y: {p: [[T, 'paddingTop'], [T, 'paddingBottom']], pre: {use_theme_button: false}, expect: '28px | 28px'},
  }; },
};

/* One control: from the base drawing, changed live (in the builder) and by a redraw, then back. */
async function control(t, width, editing, scope, x, spec, state) {
  const {settings, blocks, index} = state;
  const label = (scope === 'section' ? '' : scope + '.') + x.id;
  const atWidth = at => !at || (at === 'd' && width === 1366) || (at === 'm' && width === 375);
  const s0 = {...settings, ...(scope === 'section' ? spec.pre : {})}, b0 = blocks.map((b, i) => i === index && scope !== 'section' ? {type: b.type, settings: {...b.settings, ...spec.pre}} : b);
  const cur = scope === 'section' ? s0[x.id] : b0[index].settings[x.id];
  const values = x.type === 'select' ? x.options.map(o => o.value).filter(v => v !== cur) : [spec.value !== undefined ? spec.value : changed(x, cur)];
  const blockId = scope === 'section' ? undefined : 'test-b' + index;
  const withValue = v => scope === 'section' ? {settings: {...s0, [x.id]: v}, blocks: b0} : {settings: s0, blocks: b0.map((b, i) => i === index ? {type: b.type, settings: {...b.settings, [x.id]: v}} : b)};
  const apply = async v => { if (spec.redraw) await t.redraw(withValue(v)); else await t.emit({[x.id]: v}, blockId); await frames(t); };
  if (spec.viewport) await t.page.setViewportSize({width: spec.viewport, height: 900});
  await t.redraw({settings: s0, blocks: b0}); await frames(t);
  const v0 = await read(t, spec.p);
  ok(!/missing/.test(v0), label + ' has its element', v0);
  const seen = new Set([v0]);
  for (const v of values) {
    await apply(v);
    const v1 = await read(t, spec.p);
    const applies = spec.when ? atWidth(spec.when[v]) : atWidth(spec.at);
    if (applies) ne(v1, v0, label + ' = ' + JSON.stringify(v).slice(0, 40) + ' changes its element (' + (spec.redraw ? 'redrawn' : editing ? 'live' : 'redrawn') + ')');
    else eq(v1, v0, label + ' = ' + JSON.stringify(v).slice(0, 40) + ' leaves ' + width + 'px alone');
    seen.add(v1);
    if (editing && !spec.redraw) {
      await t.redraw(withValue(v)); await frames(t);
      eq(await read(t, spec.p), v1, label + ' = ' + JSON.stringify(v).slice(0, 40) + ' after a redraw matches the live paint');
    }
    if (applies && spec.expect !== undefined && v === values[0]) { const want = typeof spec.expect === 'function' ? spec.expect(width) : spec.expect; ok(want instanceof RegExp ? want.test(v1) : v1 === want, label + ' lands on its element', v1 + ' / ' + want); }
  }
  if (x.type === 'select' && spec.distinct !== false && atWidth(spec.at)) eq(seen.size, spec.distinct || values.length + 1, label + ': every option looks different');
  await apply(cur);
  eq(await read(t, spec.p), v0, label + ' set back restores what was there');
  if (spec.viewport) await t.page.setViewportSize({width, height: 900});
}

async function everyControl(browser, name, width, editing) {
  const {schema} = schemaOf(name), settings = baseSettings(name), blocks = baseBlocks(name);
  const t = await mount(browser, name, {width, editing, settings, blocks, assets: ASSETS});
  const first = {};
  blocks.forEach((b, i) => { if (first[b.type] === undefined) first[b.type] = i; });
  for (const x of schema.settings.filter(visible)) {
    const spec = SECTION[name][x.id];
    ok(!!spec, 'section.' + x.id + ' is covered by this test');
    if (spec) await control(t, width, editing, 'section', x, spec, {settings, blocks});
  }
  for (const type of schema.blocks) {
    const index = first[type.type], spec = BLOCK[type.type]('[data-r7p-block="test-b' + index + '"]');
    for (const x of type.settings.filter(visible)) {
      ok(!!spec[x.id], type.type + '.' + x.id + ' is covered by this test');
      if (spec[x.id]) await control(t, width, editing, type.type, x, spec[x.id], {settings, blocks, index});
    }
  }
  eq(await t.noOverflow(), true, 'no sideways page scroll after every control');
  eq(t.errors.join('; '), '', 'no errors after every control');
  await t.page.close();
}

/* ------------------------------------------------------------ the other checks */
async function schemaChecks(name) {
  where = name;
  const {schema, raw} = schemaOf(name);
  eq(schemaProblems(name).join('; '), '', 'schema problems');
  eq(raw.split('\n')[0], '<template compat="shopify">', 'line 1');
  eq(raw.split('\n')[1], "<script src=\"{{ 'live-r7-promo.js' | asset_url }}\" defer=\"defer\"></script>", 'line 2 links the controller');
  ok(schema.name.length <= 25, 'name is at most 25 characters');
  eq(schema.presets[0].name, schema.name, 'the preset carries the section name');
  eq(schema.presets[0].category, CATEGORY[name], 'the preset is in ' + CATEGORY[name]);
  eq(schema.settings.filter(x => x.type === 'header').map(x => x.content).join(' > '), HEADERS[name], 'groups in the shared order');
  ok(!/—|–|\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(JSON.stringify(schema)), 'no em dashes or banned words in labels and defaults');
  const fs = require('fs');
  const others = fs.readdirSync('sections').filter(f => f.endsWith('.storelib') && f !== name + '.storelib').filter(f => fs.readFileSync('sections/' + f, 'utf8').includes('"name": "' + schema.name + '"'));
  eq(others.join(','), '', 'no other section uses the name');
  for (const b of schema.blocks) ok(new Set(b.settings.filter(x => x.id).map(x => x.id)).size === b.settings.filter(x => x.id).length, b.type + ' ids are unique');
  if (name === 'announcement-code-bar') {
    ok(schema.enabled_on?.groups?.includes('header'), 'the bar can sit in the header group');
    eq(schema.settings.find(x => x.id === 'section_margin_top_desktop')?.max, 300, 'margins use the bars\' range');
    eq(schema.blocks.find(b => b.type === 'code').settings.find(x => x.id === 'code').default, undefined, 'no code is invented');
  } else {
    eq(schema.settings.find(x => x.id === 'end_iso').default, '', 'no date is invented');
    ok(!schema.settings.find(x => x.id === 'product').default, 'no product is picked by default');
  }
}

async function inheritance(browser, name, width, editing, priority) {
  const t = await mount(browser, name, {width, editing, settings: baseSettings(name), blocks: baseBlocks(name), assets: ASSETS, priority});
  const css = (sel, prop) => t.css(sel, prop);
  const tall = async sel => one(t, sel).evaluate(el => el.getBoundingClientRect().height >= 44);
  if (name === 'announcement-code-bar') {
    eq(await css('.acb', 'backgroundColor'), 'rgb(24, 32, 40)', 'background is the scheme background');
    eq(await css('.acb__msg', 'color'), 'rgb(204, 204, 204)', 'message is the scheme text colour');
    ok(/^Arial/.test(await css('.acb__msg', 'fontFamily')), 'message is the theme body font', await css('.acb__msg', 'fontFamily'));
    eq(await css('.acb__chip', 'color'), 'rgb(255, 255, 255)', 'the code is the scheme heading colour');
    eq(await css('.acb__chip', 'fontWeight'), '700', 'the code is the theme heading weight');
    eq(await css('.acb__chip', 'borderTopStyle'), 'dashed', 'the code sits in a dashed outline');
    eq(await css('.acb__link', 'color'), 'rgb(204, 204, 204)', 'link is the scheme text colour');
    ok(await tall('.acb__code'), 'the copy button is at least 44px tall');
    ok(await tall('.acb__link'), 'the link is at least 44px tall');
    /* one line on a desktop; on a phone the code and link wrap under the message */
    ok(await one(t, '.acb').evaluate(el => el.getBoundingClientRect().height <= (innerWidth < 768 ? 90 : 60)), 'the bar stays slim', await one(t, '.acb').evaluate(el => el.getBoundingClientRect().height));
    eq(await one(t, '.acb').evaluate(el => el.getAttribute('data-sticky-announcement')), 'false', 'the header stack sees the bar (data-sticky-announcement)');
  } else {
    eq(await css('.pdc', 'backgroundColor'), 'rgb(24, 32, 40)', 'background is the scheme background');
    eq(await css('.pdc__heading', 'color'), 'rgb(255, 255, 255)', 'heading is the scheme heading colour');
    ok(/^Georgia/.test(await css('.pdc__heading', 'fontFamily')), 'heading is the theme heading font');
    eq(await css('.pdc__heading', 'fontWeight'), '700', 'heading is the theme heading weight');
    eq(await one(t, '.pdc__heading').evaluate(el => el.tagName), 'H2', 'the section heading is an h2');
    eq(await one(t, '.pdc__title').evaluate(el => el.tagName), 'H3', 'the product name is an h3');
    ok(/^Georgia/.test(await css('.pdc__title', 'fontFamily')), 'product name is the theme heading font');
    eq(await css('.pdc__text p', 'color'), 'rgb(204, 204, 204)', 'text is the scheme text colour');
    ok(/^Arial/.test(await css('.pdc__text p', 'fontFamily')), 'text is the theme body font');
    eq(await css('.pdc__num', 'color'), 'rgb(255, 255, 255)', 'numbers are the scheme heading colour');
    ok(/^Georgia/.test(await css('.pdc__num', 'fontFamily')), 'numbers are the theme heading font');
    eq(await css('.pdc__unit', 'borderTopColor'), 'rgb(68, 85, 102)', 'number boxes use the scheme border colour');
    eq(await css('.pdc__unit', 'borderTopLeftRadius'), '8px', 'number boxes use the theme radius');
    eq(await css('.pdc__btn', 'backgroundColor'), 'rgb(18, 52, 86)', 'button is the theme button colour');
    eq(await css('.pdc__btn', 'borderTopLeftRadius'), '12px', 'button has the theme radius');
    eq(await css('.pdc__btn', 'fontSize'), '16px', 'button has the theme text size');
    eq(await one(t, '.pdc__btn').evaluate(el => el.getAttribute('href')), '/products/pants-down', 'an empty link goes to the product');
    await one(t, '.pdc__btn').hover(); await t.page.waitForTimeout(60);
    eq(await css('.pdc__btn', 'backgroundColor'), 'rgb(255, 0, 0)', 'button takes the theme hover colour');
    await t.page.mouse.move(0, 0);
    ok(await tall('.pdc__btn'), 'button is at least 44px tall');
    ok(await one(t, '.pdc__frame img').evaluate(el => el.getAttribute('loading') === 'lazy' && el.getAttribute('width') && el.getAttribute('height') && el.alt), 'the picture is lazy, sized and has alt text');
    eq(await one(t, '.pdc__price').evaluate(el => el.textContent.replace(/\s+/g, ' ').trim()), 'R$137.77R$211.93', 'the price and compare price come from the product');
  }
  eq(await t.noOverflow(), true, 'no sideways page scroll');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

/* Custom fonts, sizes and button shape together, against the real theme rules. */
async function priorityChecks(browser, name, width, editing) {
  const settings = baseSettings(name), blocks = baseBlocks(name);
  const t = await mount(browser, name, {width, editing, settings, blocks, assets: ASSETS});
  const id = type => 'test-b' + blocks.findIndex(b => b.type === type);
  let probes, on, off, want, types;
  if (name === 'announcement-code-bar') {
    probes = [['.acb__msg', 'fontFamily'], ['.acb__msg em', 'fontFamily'], ['.acb__chip', 'fontFamily'], ['.acb__link', 'fontFamily']];
    on = {section: {enable_custom_fonts: true, body_font: F('Verdana')}, message: {enable_custom_fonts: true, font: F('Tahoma')}};
    off = {section: {enable_custom_fonts: false}, message: {enable_custom_fonts: false}};
    want = 'Tahoma, sans-serif | Tahoma, sans-serif | Verdana, sans-serif | Verdana, sans-serif';
    types = ['message'];
  } else {
    probes = [['.pdc__heading', 'fontFamily'], ['.pdc__heading em', 'fontFamily'], ['.pdc__heading', 'fontSize'], ['.pdc__text p', 'fontFamily'], ['.pdc__text strong', 'fontFamily'], ['.pdc__title', 'fontFamily'], ['.pdc__num', 'fontFamily'], ['.pdc__btn', 'borderTopLeftRadius'], ['.pdc__btn', 'fontSize'], ['.pdc__btn', 'paddingLeft'], ['.pdc__btn', 'paddingTop'], ['.pdc__btn', 'fontFamily']];
    on = {section: {enable_custom_fonts: true, heading_font: F('Verdana'), body_font: F('Verdana')}, heading: {enable_custom_fonts: true, font: F('Tahoma'), size_enable: true, size_desktop: 62, size_mobile: 42}, text: {enable_custom_fonts: true, font: F('Tahoma')}, button: {use_theme_button: false, radius: 31, size: 20, pad_x: 44, pad_y: 18}};
    off = {section: {enable_custom_fonts: false}, heading: {enable_custom_fonts: false, size_enable: false}, text: {enable_custom_fonts: false}, button: {use_theme_button: true}};
    want = ['Tahoma, sans-serif', 'Tahoma, sans-serif', (width === 375 ? 42 : 62) + 'px', 'Tahoma, sans-serif', 'Tahoma, sans-serif', 'Verdana, sans-serif', 'Verdana, sans-serif', '31px', '20px', '44px', '18px', 'Arial'].join(' | ');
    types = ['heading', 'text', 'button'];
  }
  const theme = await read(t, probes);
  const apply = async values => { await t.emit(values.section); for (const type of types) await t.emit(values[type], id(type)); await frames(t); };
  const drawn = values => ({settings: {...settings, ...values.section}, blocks: blocks.map(b => types.includes(b.type) ? {type: b.type, settings: {...b.settings, ...values[b.type]}} : b)});
  await apply(on);
  eq(await read(t, probes), want, 'custom fonts, sizes and shape win over the theme rules (' + (editing ? 'live' : 'redrawn') + ')');
  await t.redraw(drawn(on)); await frames(t);
  eq(await read(t, probes), want, 'and after a redraw');
  await apply(off);
  eq(await read(t, probes), theme, 'switched off, the theme is back (' + (editing ? 'live' : 'redrawn') + ')');
  const sel = name === 'announcement-code-bar' ? '.acb__msg' : '.pdc__heading';
  ok(await one(t, sel).evaluate(el => !el.hasAttribute('data-own-font') && !el.closest('[data-own-font]')), 'and the opt out attributes are gone');
  await t.redraw(drawn(off)); await frames(t);
  eq(await read(t, probes), theme, 'and the theme is back after a redraw');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

async function schemeSwitch(browser, name, width, editing) {
  const p = P[name], t = await mount(browser, name, {width, editing, settings: baseSettings(name), blocks: baseBlocks(name), assets: ASSETS});
  await t.emit({color_scheme: 'alt-scheme'}); await frames(t);
  eq(await t.css('.' + p, 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme switch paints the background');
  await t.redraw({settings: {color_scheme: 'alt-scheme'}}); await frames(t);
  eq(await t.css('.' + p, 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme switch holds after a redraw');
  eq(await one(t, '.' + p).evaluate(el => [...el.classList].filter(c => c.startsWith('color-')).join(' ')), 'color-alt-scheme', 'one scheme class');
  await t.page.close();
}

const SNAP = () => [...document.querySelectorAll('.shopify-section *')].filter(el => !['STYLE', 'SCRIPT'].includes(el.tagName)).map(el => {
  const r = el.getBoundingClientRect(), c = getComputedStyle(el);
  return [el.tagName, el.className, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.fontWeight, c.lineHeight, c.letterSpacing, c.display, c.visibility, c.opacity, c.borderTopColor, c.borderTopLeftRadius, c.paddingLeft, c.paddingTop, String(el.hidden), String(el.disabled)].join('~');
});
async function firstPaint(browser, name, width, editing) {
  const rich = name === 'announcement-code-bar'
    ? {settings: {...baseSettings(name), enable_custom_style: true, background_color: '#102030', text_color: '#ddeeff', show_separator_line: true, line_color: '#ff8800', enable_custom_fonts: true, body_font: F('Verdana'), content_alignment: 'left', section_width: 'container', reset_spacing: false, section_margin_top_desktop: 24, section_margin_top_mobile: 12},
      blocks: baseBlocks(name).map(b => ({type: b.type, settings: {...b.settings, ...(b.type === 'message' ? {enable_custom_style: true, color: '#ff00ff', enable_custom_fonts: true, font: F('Tahoma')} : b.type === 'code' ? {enable_custom_style: true, bg_color: '#ffffff', text_color: '#000000', border_color: '#ff0000'} : {enable_custom_style: true, color: '#00ffaa'})}}))}
    : {settings: {...baseSettings(name), enable_custom_style: true, section_bg: '#102030', card_bg: '#203040', digit_color: '#ffee00', digit_bg: '#000000', line_color: '#ff8800', label_color: '#aabbcc', price_color: '#ddeeff', enable_custom_fonts: true, heading_font: F('Tahoma'), body_font: F('Verdana'), image_position: 'right', section_width: 'full_width', reset_spacing: false, section_margin_top_desktop: 24, section_margin_top_mobile: 12},
      blocks: baseBlocks(name).map(b => ({type: b.type, settings: {...b.settings, ...(b.type === 'heading' ? {enable_custom_style: true, color: '#ff00ff', enable_custom_fonts: true, font: F('Verdana'), size_enable: true, size_desktop: 50, size_mobile: 34} : b.type === 'text' ? {enable_custom_style: true, color: '#00ffff'} : b.type === 'timer' ? {show_seconds: false} : b.type === 'button' ? {enable_custom_style: true, bg_color: '#ffffff', text_color: '#000000', use_theme_button: false, radius: 20, size: 18, pad_x: 30, pad_y: 10} : {})}}))};
  const cases = [['preset', {settings: {}, blocks: undefined}], ['every switch on', rich]];
  if (name === 'countdown-product-drop') cases.push(['ended', {settings: {...baseSettings(name), end_iso: PAST}}]);
  for (const [label, opts] of cases) {
    const a = await mount(browser, name, {width, editing, assets: [], ...opts}), before = await a.page.evaluate(SNAP);
    await a.page.close();
    const b = await mount(browser, name, {width, editing, assets: ASSETS, ...opts});
    await frames(b); await b.page.waitForTimeout(80);
    const after = await b.page.evaluate(SNAP), i = before.findIndex((x, n) => x !== after[n]);
    ok(before.length === after.length && i < 0, 'first paint equals hydrated paint (' + label + ')', i >= 0 ? before[i] + ' / ' + after[i] : before.length + ' / ' + after.length);
    eq(b.errors.join('; '), '', 'no errors (' + label + ')');
    eq(await b.noOverflow(), true, 'no sideways page scroll (' + label + ')');
    await b.page.close();
  }
}

async function twoInstances(browser, name, width, editing) {
  const p = P[name], settings = baseSettings(name), blocks = baseBlocks(name);
  const t = await mount(browser, name, {width, editing, assets: ASSETS, instances: [{uid: 'a', settings, blocks}, {uid: 'b', settings, blocks}]});
  const snap = uid => t.page.evaluate(uid => { const w = document.getElementById('shopify-section-' + uid); return [...w.querySelectorAll('*')].filter(el => !['STYLE', 'SCRIPT'].includes(el.tagName) && !el.matches('[data-r7p-unit]')).map(el => { const c = getComputedStyle(el), r = el.getBoundingClientRect(); return [el.tagName, Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.display, el.children.length ? '' : el.textContent].join('~'); }).join('\n'); }, uid);
  const b0 = await snap('b'), a0 = await snap('a');
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.count()), 2, 'both instances are set up');
  if (name === 'announcement-code-bar') {
    await t.emit({enable_custom_style: true, background_color: '#ff0000', content_alignment: 'left', padding_top: 20, padding_top_mobile: 20}, undefined, 'a');
    await t.emit({text: 'Only in A', enable_custom_style: true, color: '#0000ff'}, 'a-b0', 'a');
    await t.emit({code: 'ONLYA'}, 'a-b1', 'a');
  } else {
    await t.emit({enable_custom_style: true, section_bg: '#ff0000', image_position: 'right', end_iso: LATER, padding_top_desktop: 120, padding_top_mobile: 120}, undefined, 'a');
    await t.emit({text: 'Only in A', enable_custom_style: true, color: '#0000ff'}, 'a-b0', 'a');
  }
  await frames(t);
  ne(await snap('a'), a0, 'an edit to one instance changes it');
  eq(await t.css('.' + p, 'backgroundColor', 'a'), 'rgb(255, 0, 0)', 'the edited instance is painted');
  eq(await snap('b'), b0, 'and leaves the other instance alone');
  if (name === 'announcement-code-bar') {
    await stubClipboard(t);
    await one(t, '.acb__code', 'b').click();
    eq(await t.page.evaluate(() => window.__copied.join(',')), 'FREESHIP', 'a tap copies that instance\'s own code');
    eq(await one(t, '.acb__code', 'a').evaluate(el => el.hasAttribute('data-copied')), false, 'and leaves the other one as it was');
  } else {
    ne(await read(t, [['[data-r7p-unit="d"]', '#text']], 'a'), await read(t, [['[data-r7p-unit="d"]', '#text']], 'b'), 'each instance counts to its own date');
  }
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

/* Removed and added blocks, redraws that do not double anything, nodes kept on unrelated edits. */
async function lifecycle(browser, name, width, editing) {
  const settings = baseSettings(name), blocks = baseBlocks(name);
  const t = await mount(browser, name, {width, editing, assets: ASSETS, settings, blocks});
  const count = () => t.page.evaluate(() => window.MateriaLiveR7Promo.count());
  if (editing) {
    await t.page.evaluate(() => document.querySelectorAll('.shopify-section [data-r7p-block], .shopify-section [data-r7p-block] *').forEach(el => { el.__kept = true; }));
    const before = await t.page.evaluate(() => document.querySelectorAll('.shopify-section [data-r7p-block], .shopify-section [data-r7p-block] *').length);
    await t.emit(name === 'announcement-code-bar' ? {padding_top: 20, padding_top_mobile: 20, enable_custom_style: true, background_color: '#ff0000'} : {padding_top_desktop: 100, padding_top_mobile: 100, enable_custom_style: true, digit_color: '#ff0000'}); await frames(t);
    eq(await t.page.evaluate(() => [...document.querySelectorAll('.shopify-section [data-r7p-block], .shopify-section [data-r7p-block] *')].filter(el => el.__kept).length), before, 'an unrelated edit keeps every node that was drawn');
    eq(await t.page.evaluate(() => document.getAnimations().length), 0, 'and starts no animation');
  }
  const type = name === 'announcement-code-bar' ? 'message' : 'heading';
  const fewer = blocks.filter(b => b.type !== type);
  await t.redraw({blocks: fewer}); await frames(t);
  eq(await t.page.locator('#shopify-section-test [data-r7p-type="' + type + '"]').count(), 0, 'a removed block is gone');
  const more = name === 'announcement-code-bar' ? blocks.concat([{type: 'message', settings: full(blockType(schemaOf(name).schema, 'message').settings, {text: 'Added message'})}]) : blocks;
  await t.redraw({blocks: more}); await frames(t);
  const n = more.filter(b => b.type === type).length;
  eq(await t.page.locator('#shopify-section-test [data-r7p-type="' + type + '"]').count(), n, 'an added block is drawn');
  const last = more.length - 1 - [...more].reverse().findIndex(b => b.type === type);
  await t.emit({text: 'Live <em>edit</em>'}, 'test-b' + last); await frames(t);
  eq(await one(t, '[data-r7p-block="test-b' + last + '"]').evaluate(el => el.innerHTML.trim()), 'Live <em>edit</em>', 'the added block takes live edits');
  for (let i = 0; i < 3; i++) await t.redraw();
  await frames(t);
  eq(await count(), 1, 'three redraws leave one set up section');
  if (name === 'announcement-code-bar') {
    await stubClipboard(t);
    await one(t, '.acb__code').click(); await t.page.waitForTimeout(50);
    eq(await t.page.evaluate(() => window.__copied.length), 1, 'after three redraws one tap copies once');
  } else {
    eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.pending()), 1, 'after three redraws one timer runs');
  }
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

async function reducedMotion(browser, name, width, editing) {
  const t = await mount(browser, name, {width, editing, settings: baseSettings(name), blocks: baseBlocks(name), assets: ASSETS, reducedMotion: 'reduce'});
  if (name === 'announcement-code-bar') {
    eq(await t.css('.acb__chip', 'transitionDuration'), '0s', 'the chip does not animate under reduced motion');
    eq(await t.css('.acb__value', 'opacity'), '1', 'the code is fully visible');
  } else {
    eq(await t.css('.pdc__timer', 'display'), 'flex', 'the timer is fully visible');
    eq(await t.page.evaluate(() => document.getAnimations().length), 0, 'nothing animates');
  }
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

/* ------------------------------------------------------------ what each section does */
const stubClipboard = (t, mode = 'ok') => t.page.evaluate(mode => {
  window.__copied = [];
  const clip = mode === 'ok' ? {writeText: v => { window.__copied.push(v); return Promise.resolve(); }} : undefined;
  Object.defineProperty(navigator, 'clipboard', {configurable: true, get: () => clip});
  /* the fixture page is plain http; a real storefront is https */
  Object.defineProperty(window, 'isSecureContext', {configurable: true, get: () => true});
  if (mode === 'none') document.execCommand = () => false;
}, mode);

async function copying(browser, width, editing) {
  const name = 'announcement-code-bar', settings = baseSettings(name), blocks = baseBlocks(name);
  const t = await mount(browser, name, {width, editing, settings, blocks, assets: ASSETS});
  await stubClipboard(t);
  await one(t, '.acb__code').click(); await t.page.waitForTimeout(60);
  eq(await t.page.evaluate(() => window.__copied.join(',')), 'FREESHIP', 'a tap copies the code');
  eq(await read(t, [['.acb__code', '@data-copied'], ['.acb__done', 'opacity'], ['.acb__value', 'opacity'], ['[data-r7p-status]', '#text']]), ' | 1 | 0 | Copied: FREESHIP', 'the chip and the status line say it was copied');
  ok(await one(t, '.acb__code').evaluate(el => Math.abs(el.getBoundingClientRect().width - el.querySelector('.acb__chip').getBoundingClientRect().width) < 1), 'the chip keeps its width while the words change');
  await t.page.waitForTimeout(2100);
  eq(await read(t, [['.acb__code', '@data-copied'], ['[data-r7p-status]', '#text']]), 'null | ', 'two seconds later it is back to the code');
  await one(t, '.acb__code').focus();
  eq(await t.page.evaluate(() => document.activeElement.matches('.acb__code')), true, 'the copy button takes the keyboard');
  await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(60);
  eq(await t.page.evaluate(() => window.__copied.length), 2, 'Enter copies too');
  await t.page.keyboard.press('Tab');
  await stubClipboard(t, 'none');
  await one(t, '.acb__code').click(); await t.page.waitForTimeout(60);
  eq(await t.page.evaluate(() => String(getSelection())), 'FREESHIP', 'when nothing can be copied the code is selected for copying by hand');
  /* No code: visitors see the message alone, the builder shows where the code goes. */
  await t.redraw({blocks: blocks.map(b => b.type === 'code' ? {type: 'code', settings: {...b.settings, code: ''}} : b)}); await frames(t);
  if (editing) {
    eq(await read(t, [['.acb__value', '#text'], ['.acb__code', '@data-empty'], ['.acb__code', '@data-code']]), 'Add a code |  | ', 'the builder shows where the code goes');
    await stubClipboard(t);
    await one(t, '.acb__code').click(); await t.page.waitForTimeout(60);
    eq(await t.page.evaluate(() => window.__copied.length), 0, 'and copies nothing');
    await t.emit({code: 'LIVE10'}, 'test-b1'); await frames(t);
    eq(await read(t, [['.acb__value', '#text'], ['.acb__code', '@data-empty']]), 'LIVE10 | null', 'a code typed live shows at once');
  } else {
    eq(await t.page.locator('#shopify-section-test .acb__code').count(), 0, 'visitors see no code button without a code');
    eq(await t.css('.acb__msg', 'display'), 'block', 'and still see the message');
  }
  /* Long words on a phone. */
  await t.redraw({blocks: blocks.map(b => b.type === 'message' ? {type: 'message', settings: {...b.settings, text: 'Free delivery on every order placed before the end of the month, wherever you are, with this code at checkout'}} : b.type === 'code' ? {type: 'code', settings: {...b.settings, code: 'WELCOMEBACK2026'}} : b)}); await frames(t);
  eq(await t.noOverflow(), true, 'long text and a long code do not scroll the page sideways');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

async function timing(browser, width, editing) {
  const name = 'countdown-product-drop', settings = baseSettings(name), blocks = baseBlocks(name);
  let t = await mount(browser, name, {width, editing, settings, blocks, assets: ASSETS, height: 2000});
  /* The moment. */
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.moment('2030-01-01T10:00', '+02:00')), Date.UTC(2030, 0, 1, 8), 'a UTC offset is one moment everywhere');
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.moment('2030-01-01T10:00', 'visitor')), new Date(2030, 0, 1, 10).getTime(), 'the visitor\'s clock is the browser\'s own');
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.moment('2030-01-01T10:00:00-05:00', '+02:00')), Date.UTC(2030, 0, 1, 15), 'an offset typed into the date wins');
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.moment('2030-01-01', '+00:00')), Date.UTC(2030, 0, 1), 'a date alone is midnight');
  eq(await t.page.evaluate(() => [window.MateriaLiveR7Promo.moment('2027-02-29T10:00', '+00:00'), window.MateriaLiveR7Promo.moment('2026-13-01', '+00:00'), window.MateriaLiveR7Promo.moment('soon', '+00:00')].every(Number.isNaN)), true, 'an impossible or unreadable date is no date');
  const left = Math.floor((Date.parse(SOON + ':00+05:30') - Date.now()) / 1000);
  const shown = await t.page.evaluate(() => ['d', 'h', 'm', 's'].map(u => +document.querySelector('[data-r7p-unit="' + u + '"]').textContent));
  const secs = shown[0] * 86400 + shown[1] * 3600 + shown[2] * 60 + shown[3];
  ok(Math.abs(secs - left) <= 2, 'the time left is right for the picked offset', secs + ' / ' + left);
  /* At most once a second. */
  const t0 = await t.page.evaluate(() => window.MateriaLiveR7Promo.ticks());
  await t.page.waitForTimeout(2300);
  const n = await t.page.evaluate(() => window.MateriaLiveR7Promo.ticks()) - t0;
  ok(n >= 2 && n <= 3, 'ticks once a second', n);
  /* Off screen and in a hidden tab. */
  await t.page.evaluate(() => { document.getElementById('shopify-section-test').style.marginTop = '3000px'; });
  await t.page.waitForTimeout(300);
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.pending()), 0, 'paused off screen');
  const t1 = await t.page.evaluate(() => window.MateriaLiveR7Promo.ticks());
  await t.page.waitForTimeout(1300);
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.ticks()), t1, 'no ticks while off screen');
  await t.page.evaluate(() => { document.getElementById('shopify-section-test').style.marginTop = ''; });
  await t.page.waitForTimeout(300);
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.pending()), 1, 'running again back on screen');
  await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.pending()), 0, 'paused in a hidden tab');
  await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange')); });
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.pending()), 1, 'running again when the tab is back');
  /* Right after a redraw with a new date. */
  await t.redraw({settings: {end_iso: LATER}}); await frames(t);
  eq(await read(t, [['[data-r7p-unit="d"]', '#text']]), '09', 'a redraw counts to the new date');
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.pending()), 1, 'with one timer');
  /* The end: two seconds away. */
  await t.redraw({settings: {end_iso: new Date(Date.now() + 2500).toISOString().slice(0, 19), time_zone: '+00:00'}}); await frames(t);
  eq(await read(t, [['.pdc', '@data-state']]), 'running', 'running before the moment');
  eq(await read(t, [['[data-r7p-before]', 'display'], ['[data-r7p-after]', 'display']]), 'inline | none', 'the button reads its first label');
  await t.page.waitForTimeout(3200);
  eq(await read(t, [['.pdc', '@data-state'], ['.pdc__timer', 'display'], ['.pdc__ended', 'display'], ['.pdc__ended', '#text'], ['[data-r7p-before]', 'display'], ['[data-r7p-after]', 'display']]), 'ended | none | block | On sale now | none | inline', 'at the moment: the on sale message and the sale label');
  eq(await t.page.evaluate(() => window.MateriaLiveR7Promo.pending()), 0, 'and the timer stops');
  await t.page.close();
  /* Hidden once it ended. */
  t = await mount(browser, name, {width, editing, settings: {...settings, end_iso: PAST, after_end: 'hide'}, blocks, assets: ASSETS});
  eq(await t.css('.pdc', 'display'), editing ? 'block' : 'none', editing ? 'the builder still shows an ended, hidden section' : 'visitors no longer see an ended section set to hide');
  if (editing) eq(await t.css('.pdc__hint--hidden', 'display'), 'block', 'with a note that visitors no longer see it');
  await t.page.close();
  /* Sold out once on sale: no button. Before the moment the button stays. */
  const soldOut = {...PANTS, available: false};
  t = await mount(browser, name, {width, editing, settings: {...settings, end_iso: PAST, product: soldOut}, blocks, assets: ASSETS});
  eq(await read(t, [['.pdc__btn', 'display'], ['.pdc__sold', 'display'], ['.pdc__sold', '#text']]), 'none | inline | sold out', 'a sold out product shows the sold out word and no button');
  await t.page.close();
  t = await mount(browser, name, {width, editing, settings: {...settings, product: soldOut}, blocks, assets: ASSETS});
  eq(await read(t, [['.pdc__btn', 'display'], ['.pdc__sold', 'display']]), 'inline-flex | none', 'before the moment the button stays');
  await t.page.close();
  /* No date: a hint in the builder, nothing for visitors. No product: a placeholder in the builder. */
  t = await mount(browser, name, {width, editing, assets: ASSETS});
  if (editing) {
    eq(await read(t, [['.pdc', 'display'], ['.pdc__hint--date', 'display'], ['[data-r7p-unit="d"]', '#text'], ['.pdc__frame img', '@class'], ['.pdc__note', 'display']]), 'block | block | 00 | placeholder-image  | block', 'the builder shows zeros, the date hint and a placeholder product');
    await t.emit({end_iso: LATER, time_zone: '+05:30'}); await frames(t);
    eq(await read(t, [['.pdc', '@data-state'], ['[data-r7p-unit="d"]', '#text'], ['.pdc__hint--date', 'display']]), 'running | 09 | none', 'a date typed live starts the timer');
    await t.emit({end_iso: '2027-02-30T10:00'}); await frames(t);
    eq(await read(t, [['.pdc', '@data-state']]), 'unset', 'an impossible date typed live is no date');
  } else {
    eq(await t.css('.pdc', 'display'), 'none', 'visitors see nothing without a date');
    eq(await t.page.locator('#shopify-section-test .pdc__media').count(), 0, 'and no product placeholder');
  }
  await t.page.close();
  /* No product and no link: visitors get no dead button. */
  t = await mount(browser, name, {width, editing, settings: {...settings, product: ''}, blocks, assets: ASSETS});
  eq(await read(t, [['.pdc__actions', '#hidden']]), editing ? 'false' : 'true', editing ? 'the builder keeps the button to edit' : 'visitors get no button that leads nowhere');
  if (!editing) eq(await t.page.locator('#shopify-section-test .pdc__media').count(), 0, 'and no empty product column');
  eq(await t.noOverflow(), true, 'no sideways page scroll');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

(async () => {
  const browser = await launch();
  try {
    for (const name of NAMES) {
      await schemaChecks(name);
      for (const width of [375, 1366]) for (const editing of [true, false]) {
        where = name + ' @' + width + (editing ? ' editor' : ' storefront');
        await inheritance(browser, name, width, editing, true);
        await priorityChecks(browser, name, width, editing);
        await schemeSwitch(browser, name, width, editing);
        await firstPaint(browser, name, width, editing);
        await twoInstances(browser, name, width, editing);
        await lifecycle(browser, name, width, editing);
        await reducedMotion(browser, name, width, editing);
        if (name === 'announcement-code-bar') await copying(browser, width, editing); else await timing(browser, width, editing);
        await everyControl(browser, name, width, editing);
        process.stdout.write('.');
      }
      where = name + ' priority off';
      await inheritance(browser, name, 375, false, 'off');
      await inheritance(browser, name, 1366, true, 'off');
    }
  } finally { await browser.close(); }
  process.stdout.write('\n');
  for (const f of failed) console.log('FAIL ' + f);
  console.log((failed.length ? 'FAILED: ' : '') + passed + ' r7 promo checks passed' + (failed.length ? ', ' + failed.length + ' failed' : '') + ' (' + NAMES.join(', ') + ')');
  if (failed.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
