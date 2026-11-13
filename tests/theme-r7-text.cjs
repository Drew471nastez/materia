/* Text Columns and Sticky Heading Text (round 7, shopify/assets/live-r7-text.js).

   For both sections, at 375 and 1366, in the builder (editing) and on a
   visitor's page (storefront), with the real Theme settings priority rules on:
   schema, theme inheritance, colour scheme switch, every section setting and
   every block setting (live and after a redraw, back again restores the
   theme), every select option distinct, desktop / mobile / tablet values at
   their own width, custom fonts, weights, sizes and button shape on the
   element and on a descendant, two instances, added blocks, redraws that do
   not double the listeners, text nodes kept on unrelated edits, first paint
   equal to hydrated paint, reduced motion, no sideways page scroll, the swipe
   row of Text Columns (native scroll, snap, arrows, keys, ends) and the
   pinned heading of Sticky Heading Text.

   Run: LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-text.cjs [section ...] */
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const NAMES = ['text-columns', 'sticky-heading-text'].filter(n => !process.argv.slice(2).length || process.argv.slice(2).includes(n));
const ASSETS = ['live-r7-text.js'];
const F = family => ({family});
const P = {'text-columns': 'txc', 'sticky-heading-text': 'sht'};
const ITEM = {'text-columns': 'column', 'sticky-heading-text': 'text'};

let passed = 0;
const failed = [];
let where = '';
const ok = (cond, what, detail) => { if (cond) passed++; else failed.push(where + ' ' + what + (detail !== undefined ? ' :: ' + String(detail).slice(0, 260) : '')); };
const eq = (a, b, what) => ok(a === b, what, JSON.stringify(a) + ' / ' + JSON.stringify(b));
const ne = (a, b, what) => ok(a !== b && !/missing/.test(a + b), what, JSON.stringify(a) + ' / ' + JSON.stringify(b));

/* ------------------------------------------------------------ what is drawn */
const full = (list, given = {}) => { const o = {}; for (const x of list) if (x.id) o[x.id] = x.default !== undefined ? x.default : ''; return {...o, ...given}; };
const blockType = (schema, type) => schema.blocks.find(b => b.type === type);
const BLOCKS = {
  'text-columns': [
    ['heading', {text: 'Good <em>to know</em> before you order'}],
    ['subheading', {text: '<p>Intro <strong>text</strong> for the columns.</p>'}],
    ['column', {label: 'One', heading: 'First <em>column</em>', text: '<p>First <strong>text</strong>.</p>', link_label: 'Read more', link: '/pages/one'}],
    ['column', {label: 'Two', heading: 'Second column', text: '<p>Second text.</p>'}],
    ['column', {label: 'Three', heading: 'Third column', text: '<p>Third text.</p>'}],
  ],
  'sticky-heading-text': [
    ['eyebrow', {text: 'About us'}],
    ['heading', {text: 'How <em>we</em> work'}],
    ['subheading', {text: '<p>Short <strong>intro</strong> text.</p>'}],
    ['button', {label: 'Shop all products', link: '/collections/all'}],
    ['text', {heading: 'First <em>text</em>', text: '<p>First <strong>paragraph</strong>.</p><p>Second paragraph.</p>', link_label: 'Read more', link: '/pages/one'}],
    ['text', {heading: 'Second text', text: '<p>Second.</p>'}],
    ['text', {heading: 'Third text', text: '<p>Third.</p>'}],
  ],
};
const baseBlocks = name => { const {schema} = schemaOf(name); return BLOCKS[name].map(([type, s]) => ({type, settings: full(blockType(schema, type).settings, s)})); };
const baseSettings = name => full(schemaOf(name).schema.settings);
const visible = x => x.id && !x.hidden && !/\{\{\s*false\s*\}\}/.test(x.visible_if || '');

/* ------------------------------------------------------------ probes */
/* A probe is [selector, what, 'hover'?]. what: a computed style, ::before.prop / ::after.prop, @attribute, #text, #html, #tag, #hidden, #w. */
async function read(t, probes, uid = 'test') {
  const out = [];
  for (const [sel, what, opt] of probes) {
    const target = '#shopify-section-' + uid + (sel === ':wrapper' ? '' : ' ' + sel);
    if (opt === 'hover') await t.page.hover(target).catch(() => {});
    out.push(await t.page.evaluate(({target, what}) => {
      /* the theme eases a link's colour over 0.4s: read where it ends */
      for (const a of document.getAnimations()) if (!a.animationName) a.finish();
      const el = document.querySelector(target);
      if (!el) return 'missing';
      if (what[0] === '@') return String(el.getAttribute(what.slice(1)));
      if (what === '#text') return el.textContent.trim();
      if (what === '#html') return el.innerHTML.trim();
      if (what === '#tag') return el.tagName;
      if (what === '#hidden') return String(el.hidden);
      if (what === '#w') return String(Math.round(el.getBoundingClientRect().width));
      const pseudo = what.match(/^(::\w+)\.(\w+)$/);
      return pseudo ? getComputedStyle(el, pseudo[1])[pseudo[2]] : getComputedStyle(el)[what];
    }, {target, what}));
    if (opt === 'hover') await t.page.mouse.move(0, 0);
  }
  return out.join(' | ');
}
const one = (t, sel) => t.page.locator('#shopify-section-test ' + sel).first();
const frames = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

/* The value a control is changed to. */
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
    default: return 'Edited words';
  }
}

/* What each setting changes. at: d (1366 only), m (375 only), t (900 only). pre: other settings it needs first. expect: the first probe's value afterwards. */
const COMMON = p => ({
  color_scheme: {p: [['.' + p, 'backgroundColor'], ['.' + p + '__heading', 'color'], ['.' + p + '__text p', 'color']], expect: 'rgb(250, 250, 250) | rgb(16, 16, 16) | rgb(51, 51, 51)'},
  section_width: {at: 'd', p: [['.' + p + '__inner', '#w'], ['.' + p + '__inner', 'paddingLeft']]},
  reset_spacing: {p: [[':wrapper', 'marginTop']], pre: {section_margin_top_desktop: 40, section_margin_top_mobile: 40}},
  enable_custom_style: {p: [['.' + p, 'backgroundColor']], pre: {section_bg: '#00ff00'}, expect: 'rgb(0, 255, 0)'},
  section_bg: {p: [['.' + p, 'backgroundColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
  item_heading_color: {p: [['.' + p + '__title', 'color'], ['.' + p + '__title em', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0)'},
  text_color: {p: [['.' + p + '__text', 'color'], ['.' + p + '__text p', 'color'], ['.' + p + '__text strong', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0) | rgb(255, 0, 0)'},
  link_color: {p: [['.' + p + '__link', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
  enable_custom_fonts: {p: [['.' + p + '__heading', 'fontFamily'], ['.' + p + '__title', 'fontFamily'], ['.' + p + '__text p', 'fontFamily'], ['.' + p, '@data-own-font']], pre: {heading_font: F('Tahoma'), body_font: F('Verdana')}, expect: /^Tahoma, sans-serif \| Tahoma, sans-serif \| Verdana, sans-serif \| $/},
  heading_font: {p: [['.' + p + '__heading', 'fontFamily'], ['.' + p + '__heading em', 'fontFamily'], ['.' + p + '__title', 'fontFamily'], ['.' + p + '__title em', 'fontFamily']], pre: {enable_custom_fonts: true, heading_font: F('Verdana'), body_font: F('Verdana')}, expect: /^(Tahoma, sans-serif( \| )?){4}$/},
  body_font: {p: [['.' + p + '__text p', 'fontFamily'], ['.' + p + '__subheading p', 'fontFamily'], ['.' + p + '__subheading strong', 'fontFamily'], ['.' + p + '__link', 'fontFamily']], pre: {enable_custom_fonts: true, heading_font: F('Verdana'), body_font: F('Verdana')}, expect: /^(Tahoma, sans-serif( \| )?){4}$/},
  item_heading_size: {at: 'd', p: [['.' + p + '__title', 'fontSize']], expect: '40px'},
  item_heading_size_mobile: {at: 'm', p: [['.' + p + '__title', 'fontSize']], expect: '32px'},
  reveal: {p: [['.' + p, '@data-ti-no-reveal']]},
  padding_top: {at: 'd', p: [['.' + p, 'paddingTop']], expect: '200px'},
  padding_bottom: {at: 'd', p: [['.' + p, 'paddingBottom']], expect: '200px'},
  padding_top_mobile: {at: 'm', p: [['.' + p, 'paddingTop']], expect: '160px'},
  padding_bottom_mobile: {at: 'm', p: [['.' + p, 'paddingBottom']], expect: '160px'},
  section_margin_top_desktop: {at: 'd', p: [[':wrapper', 'marginTop']], pre: {reset_spacing: false}, expect: '300px'},
  section_margin_bottom_desktop: {at: 'd', p: [[':wrapper', 'marginBottom']], pre: {reset_spacing: false}, expect: '300px'},
  section_margin_top_mobile: {at: 'm', p: [[':wrapper', 'marginTop']], pre: {reset_spacing: false}, expect: '200px'},
  section_margin_bottom_mobile: {at: 'm', p: [[':wrapper', 'marginBottom']], pre: {reset_spacing: false}, expect: '200px'},
  show_on_mobile: {at: 'm', p: [[':wrapper', 'display']], expect: 'none'},
});
const SECTION = {
  'text-columns': {
    ...COMMON('txc'),
    content_alignment: {p: [['.txc__header', 'textAlign'], ['.txc__header', 'alignItems'], ['.txc__col', 'alignItems'], ['.txc__col', 'textAlign']], expect: 'center | center | center | center'},
    columns_desktop: {at: 'd', p: [['.txc__grid', 'gridTemplateColumns']]},
    columns_tablet: {at: 't', p: [['.txc__grid', 'gridTemplateColumns']]},
    column_gap: {at: 'd', p: [['.txc__grid', 'columnGap']], expect: '96px'},
    header_gap: {p: [['.txc__header', 'marginBottom']]},
    show_dividers: {p: [['.txc__col:nth-child(2)', '::before.display'], ['.txc__col:nth-child(2)', '::after.display'], ['.txc__grid', 'rowGap']]},
    label_color: {p: [['.txc__label', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    divider_color: {p: [['.txc__col:nth-child(2)', '::before.backgroundColor'], ['.txc__col:nth-child(2)', '::after.backgroundColor'], ['.txc__arrow', 'borderTopColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0) | rgb(255, 0, 0)'},
    mobile_layout: {at: 'm', p: [['.txc__grid', 'display'], ['.txc__grid', 'overflowX'], ['.txc__nav', 'display']], expect: 'flex | auto | flex'},
    show_arrows: {at: 'm', p: [['.txc__nav', 'display']], pre: {mobile_layout: 'swipe'}, expect: 'none'},
  },
  'sticky-heading-text': {
    ...COMMON('sht'),
    heading_position: {at: 'd', p: [['.sht__header', 'order'], ['.sht__inner', 'gridTemplateColumns']]},
    heading_width: {at: 'd', p: [['.sht__inner', 'gridTemplateColumns']]},
    column_gap: {at: 'd', p: [['.sht__inner', 'columnGap']], expect: '160px'},
    sticky: {at: 'd', p: [['.sht__header', 'position']], expect: 'static'},
    sticky_offset: {at: 'd', p: [['.sht__header', 'top']], expect: '120px'},
    item_gap: {p: [['.sht__item:nth-child(2)', 'marginTop'], ['.sht__item:nth-child(2)', 'paddingTop']]},
    show_dividers: {p: [['.sht__item:nth-child(2)', 'borderTopWidth'], ['.sht__item:nth-child(2)', 'paddingTop']], expect: /^0px \| 0px$/},
    show_numbers: {p: [['.sht__num', 'display']], expect: 'none'},
    number_color: {p: [['.sht__num', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    divider_color: {p: [['.sht__item:nth-child(2)', 'borderTopColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
  },
};
const BLOCK = {
  eyebrow: B => ({
    text: {p: [[B, '#text'], [B, '#hidden']], expect: 'Edited words | false'},
    enable_custom_style: {p: [[B, 'color']], pre: {color: '#00ff00'}, expect: 'rgb(0, 255, 0)'},
    color: {p: [[B, 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
  }),
  heading: B => ({
    text: {p: [[B, '#html']], expect: 'Edited <em>words</em>'},
    enable_custom_style: {p: [[B, 'color'], [B + ' em', 'color']], pre: {color: '#00ff00'}, expect: 'rgb(0, 255, 0) | rgb(0, 255, 0)'},
    color: {p: [[B, 'color'], [B + ' em', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0)'},
    enable_custom_fonts: {p: [[B, 'fontFamily'], [B + ' em', 'fontFamily'], [B, '@data-own-font']], pre: {font: F('Tahoma')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif | '},
    font: {p: [[B, 'fontFamily'], [B + ' em', 'fontFamily']], pre: {enable_custom_fonts: true, font: F('Verdana')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif'},
    weight_enable: {p: [[B, 'fontWeight'], [B + ' em', 'fontWeight'], [B, '@data-own-weight']], pre: {weight: '300'}, expect: '300 | 300 | '},
    weight: {p: [[B, 'fontWeight'], [B + ' em', 'fontWeight']], pre: {weight_enable: true}},
    size_enable: {p: [[B, 'fontSize'], [B, 'lineHeight'], [B, 'letterSpacing'], [B + ' em', 'letterSpacing'], [B, '@data-own-size']], pre: {size_desktop: 60, size_mobile: 50, line_height: 1.8, tracking: 4}, expect: w => (w === 375 ? '50px | 90px' : '60px | 108px') + ' | 4px | 4px | '},
    size_desktop: {at: 'd', p: [[B, 'fontSize']], pre: {size_enable: true}, expect: '80px'},
    size_mobile: {at: 'm', p: [[B, 'fontSize']], pre: {size_enable: true}, expect: '60px'},
    line_height: {p: [[B, 'lineHeight'], [B + ' em', 'lineHeight']], pre: {size_enable: true, size_desktop: 40, size_mobile: 40}, expect: '80px | 80px'},
    tracking: {p: [[B, 'letterSpacing'], [B + ' em', 'letterSpacing']], pre: {size_enable: true}, expect: '10px | 10px'},
  }),
  subheading: B => ({
    text: {p: [[B, '#html']], expect: '<p>Edited <em>text</em></p>'},
    enable_custom_style: {p: [[B, 'color'], [B + ' p', 'color']], pre: {color: '#00ff00'}, expect: 'rgb(0, 255, 0) | rgb(0, 255, 0)'},
    color: {p: [[B, 'color'], [B + ' p', 'color'], [B + ' strong', 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0) | rgb(255, 0, 0)'},
    enable_custom_fonts: {p: [[B, 'fontFamily'], [B + ' p', 'fontFamily'], [B, '@data-own-font']], pre: {font: F('Tahoma')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif | '},
    font: {p: [[B + ' p', 'fontFamily'], [B + ' strong', 'fontFamily']], pre: {enable_custom_fonts: true, font: F('Verdana')}, expect: 'Tahoma, sans-serif | Tahoma, sans-serif'},
    weight_enable: {p: [[B, 'fontWeight'], [B + ' p', 'fontWeight'], [B, '@data-own-weight']], pre: {weight: '600'}, expect: '600 | 600 | '},
    weight: {p: [[B, 'fontWeight'], [B + ' p', 'fontWeight']], pre: {weight_enable: true}},
    size_enable: {p: [[B, 'fontSize'], [B + ' p', 'fontSize'], [B + ' p', 'lineHeight'], [B, '@data-own-size']], pre: {size: 25, line_height: 2}, expect: '25px | 25px | 50px | '},
    size: {p: [[B, 'fontSize'], [B + ' p', 'fontSize']], pre: {size_enable: true}, expect: '28px | 28px'},
    line_height: {p: [[B + ' p', 'lineHeight']], pre: {size_enable: true, size: 20}, expect: '44px'},
  }),
  button: B => { const T = B + ' [data-r7t-btn]'; return {
    label: {p: [[T, '#text'], [B, '#hidden']], expect: 'Edited words | false'},
    link: {p: [[T, '@href'], [T, '#tag']], expect: '/pages/edited | A'},
    style: {p: [[T, 'backgroundColor'], [T, 'color'], [T, '@data-theme-button']], expect: 'rgb(255, 255, 255) | rgb(18, 52, 86) | secondary'},
    enable_custom_style: {p: [[T, 'backgroundColor'], [T, 'borderTopColor']], pre: {bg_color: '#00ff00'}, expect: 'rgb(0, 255, 0) | rgb(0, 255, 0)'},
    bg_color: {p: [[T, 'backgroundColor'], [T, 'borderTopColor']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0) | rgb(255, 0, 0)'},
    text_color: {p: [[T, 'color']], pre: {enable_custom_style: true}, expect: 'rgb(255, 0, 0)'},
    border_color: {p: [[T, 'borderTopColor']], pre: {enable_custom_style: true, bg_color: '#00ff00'}, expect: 'rgb(255, 0, 0)'},
    bg_color_hover: {p: [[T, 'backgroundColor', 'hover']], pre: {enable_custom_style: true}, value: '#0000ff', expect: 'rgb(0, 0, 255)'},
    text_color_hover: {p: [[T, 'color', 'hover']], pre: {enable_custom_style: true}, value: '#00ff00', expect: 'rgb(0, 255, 0)'},
    use_theme_button: {p: [[T, 'borderTopLeftRadius'], [T, 'fontSize'], [T, 'paddingLeft'], [T, 'paddingTop'], [T, '@data-own-shape']], pre: {radius: 33, size: 21, pad_x: 50, pad_y: 20}, expect: '33px | 21px | 50px | 20px | '},
    radius: {p: [[T, 'borderTopLeftRadius']], pre: {use_theme_button: false}, expect: '60px'},
    size: {p: [[T, 'fontSize']], pre: {use_theme_button: false}, expect: '22px'},
    pad_x: {p: [[T, 'paddingLeft'], [T, 'paddingRight']], pre: {use_theme_button: false}, expect: '60px | 60px'},
    pad_y: {p: [[T, 'paddingTop'], [T, 'paddingBottom']], pre: {use_theme_button: false}, expect: '28px | 28px'},
  }; },
  item: B => ({
    label: {p: [[B + ' [data-r7t-label]', '#text'], [B + ' [data-r7t-label]', '#hidden']], expect: 'Edited words | false'},
    heading: {p: [[B + ' [data-r7t-title]', '#html']], expect: 'Edited <em>words</em>'},
    text: {p: [[B + ' [data-r7t-text]', '#html']], expect: '<p>Edited <em>text</em></p>'},
    link_label: {p: [[B + ' [data-r7t-link]', '#text'], [B + ' [data-r7t-link]', '#hidden']], expect: 'Edited words | false'},
    link: {p: [[B + ' [data-r7t-link]', '@href']], expect: '/pages/edited'},
  }),
};
const specOf = (type, B) => (BLOCK[type] || BLOCK.item)(B);

/* One control: from the base drawing, changed live (in the builder) and by a redraw, then back. */
async function control(t, name, width, editing, scope, x, spec, state) {
  const {settings, blocks, index} = state;
  const label = (scope === 'section' ? '' : scope + '.') + x.id;
  const applies = !spec.at || (spec.at === 'd' && width === 1366) || (spec.at === 'm' && width === 375) || (spec.at === 't' && width === 900);
  const s0 = {...settings, ...(scope === 'section' ? spec.pre : {})}, b0 = blocks.map((b, i) => i === index && scope !== 'section' ? {type: b.type, settings: {...b.settings, ...spec.pre}} : b);
  const cur = scope === 'section' ? s0[x.id] : b0[index].settings[x.id];
  const values = x.type === 'select' ? x.options.map(o => o.value).filter(v => v !== cur) : [spec.value !== undefined ? spec.value : changed(x, cur)];
  const blockId = scope === 'section' ? undefined : 'test-b' + index;
  const withValue = v => scope === 'section' ? {settings: {...s0, [x.id]: v}, blocks: b0} : {settings: s0, blocks: b0.map((b, i) => i === index ? {type: b.type, settings: {...b.settings, [x.id]: v}} : b)};
  await t.redraw({settings: s0, blocks: b0});
  const v0 = await read(t, spec.p);
  ok(!/missing/.test(v0), label + ' has its element', v0);
  const seen = new Set([v0]);
  for (const v of values) {
    await t.emit({[x.id]: v}, blockId); await frames(t);
    const v1 = await read(t, spec.p);
    if (applies) ne(v1, v0, label + ' = ' + JSON.stringify(v) + ' changes its element (' + (editing ? 'live' : 'redrawn') + ')');
    else eq(v1, v0, label + ' leaves ' + width + 'px alone');
    seen.add(v1);
    if (editing) {
      /* the server's drawing of the same value is what the live paint showed */
      await t.redraw(withValue(v)); await frames(t);
      eq(await read(t, spec.p), v1, label + ' = ' + JSON.stringify(v) + ' after a redraw matches the live paint');
    }
    if (applies && spec.expect !== undefined && v === values[0]) { const want = typeof spec.expect === 'function' ? spec.expect(width) : spec.expect; ok(want instanceof RegExp ? want.test(v1) : v1 === want, label + ' lands on its element', v1 + ' / ' + want); }
  }
  if (applies && x.type === 'select') eq(seen.size, values.length + 1, label + ': every option looks different');
  /* back to where it was: off restores the theme */
  await t.emit({[x.id]: cur}, blockId); await frames(t);
  eq(await read(t, spec.p), v0, label + ' set back restores what was there');
}

async function everyControl(browser, name, width, editing) {
  const {schema} = schemaOf(name), settings = baseSettings(name), blocks = baseBlocks(name);
  const t = await mount(browser, name, {width, editing, settings, blocks, assets: ASSETS});
  const first = {};
  blocks.forEach((b, i) => { if (first[b.type] === undefined) first[b.type] = i; });
  for (const x of schema.settings.filter(visible)) {
    const spec = SECTION[name][x.id];
    ok(!!spec, 'section.' + x.id + ' is covered by this test');
    if (spec) await control(t, name, width, editing, 'section', x, spec, {settings, blocks});
  }
  for (const type of schema.blocks) {
    const index = first[type.type], spec = specOf(type.type, '[data-r7t-block="test-b' + index + '"]');
    for (const x of type.settings.filter(visible)) {
      ok(!!spec[x.id], type.type + '.' + x.id + ' is covered by this test');
      if (spec[x.id]) await control(t, name, width, editing, type.type, x, spec[x.id], {settings, blocks, index});
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
  eq(raw.split('\n')[1], "<script src=\"{{ 'live-r7-text.js' | asset_url }}\" defer=\"defer\"></script>", 'line 2 links the controller');
  ok(schema.name.length <= 25, 'name is at most 25 characters');
  eq(schema.presets[0].name, schema.name, 'the preset carries the section name');
  eq(schema.presets[0].category, 'Text', 'the preset is in Text');
  const headers = schema.settings.filter(x => x.type === 'header').map(x => x.content).join(' > ');
  eq(headers, 'General > Layout > Appearance > Typography > Animation > Desktop spacing > Mobile', 'groups in the shared order');
  const copy = JSON.stringify(schema);
  ok(!/—|–|\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(copy), 'no em dashes or banned words in labels and defaults');
  for (const b of schema.blocks) ok(new Set(b.settings.filter(x => x.id).map(x => x.id)).size === b.settings.filter(x => x.id).length, b.type + ' ids are unique');
}

async function inheritance(browser, name, width, editing, priority) {
  const p = P[name], t = await mount(browser, name, {width, editing, settings: baseSettings(name), blocks: baseBlocks(name), assets: ASSETS, priority});
  const css = (sel, prop) => t.css(sel, prop);
  eq(await css('.' + p, 'backgroundColor'), 'rgb(24, 32, 40)', 'background is the scheme background');
  eq(await css('.' + p + '__heading', 'color'), 'rgb(255, 255, 255)', 'heading is the scheme heading colour');
  ok(/^Georgia/.test(await css('.' + p + '__heading', 'fontFamily')), 'heading is the theme heading font', await css('.' + p + '__heading', 'fontFamily'));
  eq(await css('.' + p + '__heading', 'fontWeight'), '700', 'heading is the theme heading weight');
  eq(await one(t, '.' + p + '__heading').evaluate(el => el.tagName), 'H2', 'the section heading is an h2');
  eq(await css('.' + p + '__title', 'color'), 'rgb(255, 255, 255)', 'item heading is the scheme heading colour');
  ok(/^Georgia/.test(await css('.' + p + '__title', 'fontFamily')), 'item heading is the theme heading font');
  eq(await one(t, '.' + p + '__title').evaluate(el => el.tagName), 'H3', 'an item heading is an h3');
  eq(await css('.' + p + '__text p', 'color'), 'rgb(204, 204, 204)', 'text is the scheme text colour');
  ok(/^Arial/.test(await css('.' + p + '__text p', 'fontFamily')), 'text is the theme body font', await css('.' + p + '__text p', 'fontFamily'));
  ok(/^Arial/.test(await css('.' + p + '__subheading p', 'fontFamily')), 'subheading is the theme body font');
  eq(await css('.' + p + '__subheading p', 'color'), 'rgb(204, 204, 204)', 'subheading is the scheme text colour');
  if (name === 'text-columns') {
    eq(await css('.txc__label', 'color'), 'rgb(204, 204, 204)', 'label is the scheme text colour');
    eq(await one(t, '.txc__col:nth-child(2)').evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(68, 85, 102)', 'lines are the scheme border colour');
  } else {
    eq(await css('.sht__eyebrow', 'color'), 'rgb(204, 204, 204)', 'eyebrow is the scheme text colour');
    eq(await css('.sht__item:nth-child(2)', 'borderTopColor'), 'rgb(68, 85, 102)', 'lines are the scheme border colour');
    eq(await css('.sht__btn', 'backgroundColor'), 'rgb(18, 52, 86)', 'button is the theme button colour');
    eq(await css('.sht__btn', 'borderTopLeftRadius'), '12px', 'button has the theme radius');
    eq(await css('.sht__btn', 'fontSize'), '16px', 'button has the theme text size');
    await one(t, '.sht__btn').hover(); await t.page.waitForTimeout(60);
    eq(await css('.sht__btn', 'backgroundColor'), 'rgb(255, 0, 0)', 'button takes the theme hover colour');
    await t.page.mouse.move(0, 0);
    ok(await one(t, '.sht__btn').evaluate(el => el.getBoundingClientRect().height >= 44), 'button is at least 44px tall');
  }
  ok(await one(t, '.' + p + '__link').evaluate(el => el.getBoundingClientRect().height >= 44), 'the text link is at least 44px tall');
  eq(await t.noOverflow(), true, 'no sideways page scroll');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

/* Custom font, weight, size and button shape together, against the real theme rules. */
async function priorityChecks(browser, name, width, editing) {
  const p = P[name], settings = baseSettings(name), blocks = baseBlocks(name), {schema} = schemaOf(name);
  const t = await mount(browser, name, {width, editing, settings, blocks, assets: ASSETS});
  const idx = type => blocks.findIndex(b => b.type === type), id = type => 'test-b' + idx(type);
  const probes = [['.' + p + '__heading', 'fontFamily'], ['.' + p + '__heading em', 'fontFamily'], ['.' + p + '__heading', 'fontWeight'], ['.' + p + '__heading em', 'fontWeight'], ['.' + p + '__heading', 'fontSize'], ['.' + p + '__heading', 'lineHeight'], ['.' + p + '__heading', 'letterSpacing'],
    ['.' + p + '__subheading p', 'fontFamily'], ['.' + p + '__subheading strong', 'fontFamily'], ['.' + p + '__subheading p', 'fontWeight'], ['.' + p + '__subheading p', 'fontSize'], ['.' + p + '__subheading p', 'lineHeight'],
    ['.' + p + '__title', 'fontFamily'], ['.' + p + '__text p', 'fontFamily']].concat(name === 'sticky-heading-text' ? [['.sht__btn', 'borderTopLeftRadius'], ['.sht__btn', 'fontSize'], ['.sht__btn', 'paddingLeft'], ['.sht__btn', 'paddingTop'], ['.sht__btn', 'fontFamily']] : []);
  const theme = await read(t, probes);
  const on = {section: {enable_custom_fonts: true, heading_font: F('Verdana'), body_font: F('Verdana')}, heading: {enable_custom_fonts: true, font: F('Tahoma'), weight_enable: true, weight: '300', size_enable: true, size_desktop: 62, size_mobile: 42, line_height: 1.5, tracking: 3},
    subheading: {enable_custom_fonts: true, font: F('Tahoma'), weight_enable: true, weight: '600', size_enable: true, size: 24, line_height: 2}, button: {use_theme_button: false, radius: 31, size: 20, pad_x: 44, pad_y: 18}};
  const off = {section: {enable_custom_fonts: false}, heading: {enable_custom_fonts: false, weight_enable: false, size_enable: false}, subheading: {enable_custom_fonts: false, weight_enable: false, size_enable: false}, button: {use_theme_button: true}};
  const size = width === 375 ? 42 : 62;
  const want = ['Tahoma, sans-serif', 'Tahoma, sans-serif', '300', '300', size + 'px', size * 1.5 + 'px', '3px', 'Tahoma, sans-serif', 'Tahoma, sans-serif', '600', '24px', '48px', 'Verdana, sans-serif', 'Verdana, sans-serif'].concat(name === 'sticky-heading-text' ? ['31px', '20px', '44px', '18px', 'Arial'] : []).join(' | ');
  const types = ['heading', 'subheading'].concat(name === 'sticky-heading-text' ? ['button'] : []);
  const apply = async values => { await t.emit(values.section); for (const type of types) await t.emit(values[type], id(type)); await frames(t); };
  const drawn = values => ({settings: {...settings, ...values.section}, blocks: blocks.map(b => types.includes(b.type) ? {type: b.type, settings: {...b.settings, ...values[b.type]}} : b)});
  void schema;
  await apply(on);
  eq(await read(t, probes), want, 'custom font, weight, size and shape win over the theme rules (' + (editing ? 'live' : 'redrawn') + ')');
  await t.redraw(drawn(on)); await frames(t);
  eq(await read(t, probes), want, 'and after a redraw');
  ok(await one(t, '.' + p + '__heading').evaluate(el => el.hasAttribute('data-own-font') && el.hasAttribute('data-own-weight') && el.hasAttribute('data-own-size')), 'the heading carries its opt out attributes');
  await apply(off);
  eq(await read(t, probes), theme, 'switched off, the theme is back (' + (editing ? 'live' : 'redrawn') + ')');
  ok(await one(t, '.' + p + '__heading').evaluate(el => !el.hasAttribute('data-own-font') && !el.hasAttribute('data-own-weight') && !el.hasAttribute('data-own-size')), 'and the opt out attributes are gone');
  await t.redraw(drawn(off)); await frames(t);
  eq(await read(t, probes), theme, 'and the theme is back after a redraw');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

/* Colour scheme: live and after a redraw. */
async function schemeSwitch(browser, name, width, editing) {
  const p = P[name], t = await mount(browser, name, {width, editing, settings: baseSettings(name), blocks: baseBlocks(name), assets: ASSETS});
  await t.emit({color_scheme: 'alt-scheme'}); await frames(t);
  eq(await t.css('.' + p, 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme switch paints the background');
  eq(await t.css('.' + p + '__title', 'color'), 'rgb(16, 16, 16)', 'scheme switch paints the item headings');
  await t.redraw({settings: {color_scheme: 'alt-scheme'}}); await frames(t);
  eq(await t.css('.' + p, 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme switch holds after a redraw');
  eq(await one(t, '.' + p).evaluate(el => [...el.classList].filter(c => c.startsWith('color-')).join(' ')), 'color-alt-scheme', 'one scheme class');
  await t.page.close();
}

const SNAP = () => [...document.querySelectorAll('.shopify-section *')].filter(el => !['STYLE', 'SCRIPT'].includes(el.tagName)).map(el => {
  const r = el.getBoundingClientRect(), c = getComputedStyle(el);
  return [el.tagName, el.className, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.fontWeight, c.lineHeight, c.letterSpacing, c.display, c.visibility, c.opacity, c.borderTopColor, c.borderTopLeftRadius, c.paddingLeft, c.paddingTop, String(el.hidden), String(el.disabled)].join('~');
});
/* First paint (no controller) equals the hydrated paint, for the preset and for a drawing with every switch on. */
async function firstPaint(browser, name, width, editing) {
  const rich = {settings: {...baseSettings(name), enable_custom_style: true, section_bg: '#102030', item_heading_color: '#ffee00', text_color: '#ddeeff', link_color: '#00ffaa', divider_color: '#ff8800', label_color: '#aabbcc', number_color: '#aabbcc', enable_custom_fonts: true, heading_font: F('Tahoma'), body_font: F('Verdana'), content_alignment: 'center', mobile_layout: 'swipe', heading_position: 'right', columns_desktop: 4, reset_spacing: false, section_margin_top_desktop: 24, section_margin_top_mobile: 12},
    blocks: baseBlocks(name).map(b => ({type: b.type, settings: {...b.settings, ...(b.type === 'heading' ? {enable_custom_style: true, color: '#ff00ff', enable_custom_fonts: true, font: F('Verdana'), weight_enable: true, weight: '500', size_enable: true, size_desktop: 50, size_mobile: 34, line_height: 1.3, tracking: 1} : b.type === 'subheading' ? {enable_custom_style: true, color: '#00ffff', size_enable: true, size: 20, line_height: 1.4, weight_enable: true, weight: '500'} : b.type === 'button' ? {enable_custom_style: true, bg_color: '#ffffff', text_color: '#000000', border_color: '#ff0000', use_theme_button: false, radius: 20, size: 18, pad_x: 30, pad_y: 10} : b.type === 'eyebrow' ? {enable_custom_style: true, color: '#ffaa00'} : {})}}))};
  for (const [label, opts] of [['preset', {}], ['every switch on', rich]]) {
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
  const snap = uid => t.page.evaluate(uid => { const w = document.getElementById('shopify-section-' + uid); return [...w.querySelectorAll('*')].filter(el => !['STYLE', 'SCRIPT'].includes(el.tagName)).map(el => { const c = getComputedStyle(el), r = el.getBoundingClientRect(); return [el.tagName, Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.display, el.children.length ? '' : el.textContent].join('~'); }).join('\n'); }, uid);
  const b0 = await snap('b'), a0 = await snap('a');
  eq(await t.page.evaluate(() => window.MateriaLiveR7Text.count()), 2, 'both instances are set up');
  await t.emit({enable_custom_style: true, section_bg: '#ff0000', item_heading_color: '#00ff00', content_alignment: 'center', columns_desktop: 2, mobile_layout: 'swipe', heading_position: 'right', show_numbers: false, padding_top: 120, padding_top_mobile: 120}, undefined, 'a');
  const item = blocks.findIndex(b => b.type === ITEM[name]), head = blocks.findIndex(b => b.type === 'heading');
  await t.emit({heading: 'Only in A', text: '<p>Only in A.</p>'}, 'a-b' + item, 'a');
  await t.emit({text: 'A heading', enable_custom_style: true, color: '#0000ff'}, 'a-b' + head, 'a');
  await frames(t);
  ne(await snap('a'), a0, 'an edit to one instance changes it');
  eq(await t.css('.' + p, 'backgroundColor', 'a'), 'rgb(255, 0, 0)', 'the edited instance is painted');
  eq(await t.css('.' + p + '__heading', 'color', 'a'), 'rgb(0, 0, 255)', 'its heading block is painted');
  eq(await snap('b'), b0, 'and leaves the other instance alone');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

/* Added blocks, redraws that do not double anything, and text nodes kept on unrelated edits. */
async function lifecycle(browser, name, width, editing) {
  const p = P[name], settings = baseSettings(name), blocks = baseBlocks(name), type = ITEM[name];
  const t = await mount(browser, name, {width, editing, assets: ASSETS, settings: {...settings, mobile_layout: 'swipe'}, blocks});
  const count = () => t.page.evaluate(() => window.MateriaLiveR7Text.count());
  const items = () => t.page.locator('#shopify-section-test [data-r7t-type="' + type + '"]').count();
  const n = await items();
  if (editing) {
    /* An unrelated edit keeps every node that was drawn. */
    await t.page.evaluate(() => document.querySelectorAll('.shopify-section [data-r7t-block], .shopify-section [data-r7t-block] *').forEach(el => { el.__kept = true; }));
    const before = await t.page.evaluate(() => document.querySelectorAll('.shopify-section [data-r7t-block], .shopify-section [data-r7t-block] *').length);
    await t.emit({padding_top: 100, padding_top_mobile: 100, column_gap: 24, enable_custom_style: true, text_color: '#ff0000'}); await frames(t);
    eq(await t.page.evaluate(() => [...document.querySelectorAll('.shopify-section [data-r7t-block], .shopify-section [data-r7t-block] *')].filter(el => el.__kept).length), before, 'an unrelated edit keeps every text node that was drawn');
    eq(await t.page.evaluate(() => document.getAnimations().length), 0, 'and starts no animation');
  }
  const added = blocks.concat([{type, settings: full(blockType(schemaOf(name).schema, type).settings, {heading: 'Added block', text: '<p>Added text.</p>'})}]);
  await t.redraw({blocks: added}); await frames(t);
  eq(await items(), n + 1, 'an added block is drawn');
  const sel = '[data-r7t-block="test-b' + (added.length - 1) + '"] [data-r7t-title]';
  eq(await one(t, sel).evaluate(el => el.textContent), 'Added block', 'with its heading');
  await t.emit({heading: 'Changed afterwards'}, 'test-b' + (added.length - 1)); await frames(t);
  eq(await one(t, sel).evaluate(el => el.textContent), 'Changed afterwards', 'and can be edited (' + (editing ? 'live' : 'redrawn') + ')');
  for (let i = 0; i < 3; i++) await t.redraw({});
  eq(await count(), 1, 'three redraws leave one controller state');
  if (name === 'text-columns' && width === 375) {
    const track = one(t, '[data-r7t-track]');
    await one(t, '[data-r7t-next]').click(); await t.page.waitForTimeout(700);
    const x = await track.evaluate(el => el.scrollLeft), step = await track.evaluate(el => el.children[1].offsetLeft - el.children[0].offsetLeft);
    ok(Math.abs(x - step) <= 2, 'after the redraws one tap on the arrow moves one column, not two', x + ' / ' + step);
  }
  await t.redraw({blocks: []}); await frames(t);
  eq(await items(), 0, 'with no blocks nothing is left behind');
  ok(await one(t, '.' + p).evaluate(el => el.getBoundingClientRect().height > 40), 'and the empty section still has its height');
  await t.redraw({blocks: [blocks.find(b => b.type === type)]}); await frames(t);
  eq(await items(), 1, 'one block alone is drawn');
  eq(await t.noOverflow(), true, 'no sideways page scroll');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

/* Empty words hide their element, and a button with no link is a button. */
async function emptyValues(browser, name, width, editing) {
  const settings = baseSettings(name), blocks = baseBlocks(name);
  const t = await mount(browser, name, {width, editing, assets: ASSETS, settings, blocks});
  const item = blocks.findIndex(b => b.type === ITEM[name]), B = '[data-r7t-block="test-b' + item + '"]';
  const hidden = () => one(t, B).evaluate(el => ['label', 'title', 'text', 'link'].map(k => el.querySelector('[data-r7t-' + k + ']')).filter(Boolean).map(el => getComputedStyle(el).display).join(' '));
  await t.emit({label: '', heading: '', text: '', link_label: ''}, 'test-b' + item); await frames(t);
  ok(/^(none ?)+$/.test(await hidden()), 'empty words hide their elements (' + (editing ? 'live' : 'redrawn') + ')', await hidden());
  await t.emit({heading: 'Back again', link_label: 'Go', link: ''}, 'test-b' + item); await frames(t);
  eq(await one(t, B + ' [data-r7t-title]').evaluate(el => getComputedStyle(el).display !== 'none' && el.textContent), 'Back again', 'and words bring them back');
  eq(await one(t, B + ' [data-r7t-link]').evaluate(el => el.hasAttribute('href')), false, 'a link label with no link is not a link');
  const head = blocks.findIndex(b => b.type === 'heading');
  await t.emit({text: ''}, 'test-b' + head); await frames(t);
  eq(await one(t, '[data-r7t-block="test-b' + head + '"]').evaluate(el => getComputedStyle(el).display), 'none', 'an empty heading is hidden');
  if (name === 'sticky-heading-text') {
    const btn = blocks.findIndex(b => b.type === 'button'), T = '[data-r7t-block="test-b' + btn + '"] [data-r7t-btn]';
    eq(await one(t, T).evaluate(el => el.tagName + ' ' + el.getAttribute('href')), 'A /collections/all', 'a button with a link is a link');
    await t.emit({link: ''}, 'test-b' + btn); await frames(t);
    eq(await one(t, T).evaluate(el => el.tagName + ' ' + el.type + ' ' + el.hasAttribute('data-theme-button')), 'BUTTON button true', 'a button with no link is a button on the theme contract');
    await t.emit({link: '/pages/about', enable_custom_style: true, bg_color: '#ff0000'}, 'test-b' + btn); await frames(t);
    eq(await one(t, T).evaluate(el => el.tagName + ' ' + el.getAttribute('href') + ' ' + getComputedStyle(el).backgroundColor), 'A /pages/about rgb(255, 0, 0)', 'and a link again with its link back');
    await t.emit({label: ''}, 'test-b' + btn); await frames(t);
    eq(await one(t, '[data-r7t-block="test-b' + btn + '"]').evaluate(el => getComputedStyle(el).display), 'none', 'a button with no label is hidden');
  }
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

async function reducedMotion(browser, name, width, editing) {
  const p = P[name], t = await mount(browser, name, {width, editing, assets: ASSETS, settings: {...baseSettings(name), mobile_layout: 'swipe'}, blocks: baseBlocks(name), reducedMotion: 'reduce'});
  ok(await one(t, '.' + p + '__heading').evaluate(el => { const c = getComputedStyle(el), r = el.getBoundingClientRect(); return c.opacity === '1' && c.visibility === 'visible' && r.height > 0; }), 'reduced motion: the content is visible');
  eq(await t.page.evaluate(() => document.getAnimations().length), 0, 'reduced motion: nothing animates');
  if (name === 'sticky-heading-text') eq(await t.css('.sht__header', 'transitionProperty'), 'none', 'reduced motion: the pinned heading does not glide');
  if (name === 'text-columns') {
    eq(await t.css('.txc__arrow', 'transitionProperty'), 'none', 'reduced motion: the arrows do not animate');
    if (width === 375) {
      await one(t, '[data-r7t-next]').click(); await frames(t);
      ok(await one(t, '[data-r7t-track]').evaluate(el => el.scrollLeft > 100), 'reduced motion: the arrow moves the row at once', await one(t, '[data-r7t-track]').evaluate(el => el.scrollLeft));
    }
  }
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

/* The swipe row on a phone: a native scroller the finger moves, with snap, arrows and keys. */
async function swipeRow(browser, editing) {
  const name = 'text-columns', settings = {...baseSettings(name), mobile_layout: 'swipe'}, blocks = baseBlocks(name);
  const t = await mount(browser, name, {width: 375, editing, assets: ASSETS, instances: [{uid: 'a', settings, blocks}, {uid: 'b', settings, blocks}]});
  const track = t.page.locator('#shopify-section-a [data-r7t-track]'), prev = t.page.locator('#shopify-section-a [data-r7t-prev]'), next = t.page.locator('#shopify-section-a [data-r7t-next]');
  const x = () => track.evaluate(el => Math.round(el.scrollLeft)), settle = () => t.page.waitForTimeout(750);
  const c = await track.evaluate(el => { const s = getComputedStyle(el), k = getComputedStyle(el.children[0]); return {ox: s.overflowX, snap: s.scrollSnapType, over: s.overscrollBehaviorX, touch: s.touchAction, bar: s.scrollbarWidth, align: k.scrollSnapAlign, wide: el.scrollWidth > el.clientWidth + 50, step: el.children[1].offsetLeft - el.children[0].offsetLeft, max: el.scrollWidth - el.clientWidth}; });
  eq([c.ox, c.snap, c.over, c.bar, c.align].join(' | '), 'auto | x mandatory | contain | none | start', 'the row is a native snap scroller');
  ok(/pan-x/.test(c.touch) && /pan-y/.test(c.touch), 'the finger can move it sideways and the page up and down', c.touch);
  ok(c.wide, 'the columns are wider than the screen');
  eq(await t.noOverflow(), true, 'the page itself does not scroll sideways');
  eq(await prev.isDisabled(), true, 'at the start the back arrow is off');
  eq(await next.isDisabled(), false, 'and the forward arrow is on');
  ok(await next.evaluate(el => { const r = el.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }), 'the arrows are 44px targets');
  /* the finger: a scroll position between two columns settles on a column */
  await track.evaluate((el, v) => { el.scrollLeft = v; }, Math.round(c.step * 0.7)); await settle();
  const snapped = await x();
  ok([0, c.step, c.step * 2, c.max].some(v => Math.abs(v - snapped) <= 2), 'a touch scroll snaps to a column', snapped + ' / step ' + c.step);
  eq(await prev.isDisabled(), false, 'away from the start the back arrow is on');
  await track.evaluate(el => { el.scrollLeft = 0; }); await settle();
  await next.click(); await settle();
  ok(Math.abs(await x() - c.step) <= 2, 'the forward arrow moves one column', await x() + ' / ' + c.step);
  eq(await t.page.locator('#shopify-section-b [data-r7t-track]').evaluate(el => el.scrollLeft), 0, 'and the other instance stays where it was');
  await prev.click(); await settle();
  eq(await x(), 0, 'the back arrow moves back');
  eq(await prev.isDisabled(), true, 'and is off again at the start');
  for (let i = 0; i < 4 && !(await next.isDisabled()); i++) { await next.click(); await settle(); }
  ok(Math.abs(await x() - c.max) <= 2, 'the forward arrow reaches the end', await x() + ' / ' + c.max);
  eq(await next.isDisabled(), true, 'where it is off');
  eq(await prev.evaluate(el => document.activeElement === el), true, 'and the keyboard is handed to the back arrow');
  await track.evaluate(el => { el.scrollLeft = 0; }); await settle();
  eq(await track.evaluate(el => el.getAttribute('tabindex') + ' ' + el.getAttribute('role') + ' ' + !!el.getAttribute('aria-label')), '0 group true', 'the row takes the keyboard while it scrolls');
  await track.focus(); await t.page.keyboard.press('ArrowRight'); await settle();
  ok(Math.abs(await x() - c.step) <= 2, 'the right arrow key moves one column', await x());
  await t.page.keyboard.press('ArrowLeft'); await settle();
  eq(await x(), 0, 'the left arrow key moves back');
  /* the page's own scroll is never held */
  eq(await track.evaluate(el => { const w = new WheelEvent('wheel', {deltaY: 120, bubbles: true, cancelable: true}); el.dispatchEvent(w); const m = new Event('touchmove', {bubbles: true, cancelable: true}); el.dispatchEvent(m); return w.defaultPrevented || m.defaultPrevented; }), false, 'wheel and touch moves are never cancelled');
  await t.emit({show_arrows: false}, undefined, 'a'); await frames(t);
  eq(await t.css('.txc__nav', 'display', 'a'), 'none', 'the arrows can be switched off');
  ok(await track.evaluate(el => el.scrollWidth > el.clientWidth + 50), 'and the row still scrolls');
  await t.emit({show_arrows: true, mobile_layout: 'stack'}, undefined, 'a'); await frames(t); await t.page.waitForTimeout(60);
  eq(await t.css('.txc__nav', 'display', 'a'), 'none', 'stacked columns have no arrows');
  eq(await t.page.locator('#shopify-section-a [data-r7t-track]').evaluate(el => el.scrollWidth <= el.clientWidth + 1 && !el.hasAttribute('tabindex')), true, 'and no scroller');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
  /* on a desktop the same markup is a grid */
  const d = await mount(browser, name, {width: 1366, editing, assets: ASSETS, settings, blocks: blocks.concat(blocks.filter(b => b.type === 'column'), blocks.filter(b => b.type === 'column').slice(0, 1))});
  eq(await one(d, '.txc__grid').evaluate(el => { const c = [...el.children], a = n => getComputedStyle(c[n], '::after'), b = n => getComputedStyle(c[n], '::before').display; return [c.length, b(0), b(1), b(3), b(4), a(0).display, a(3).display, a(4).display, a(6).display, Math.round(parseFloat(a(3).width)) === Math.round(el.getBoundingClientRect().width)].join(' '); }), '7 none block none block none block none block true', 'seven columns three to a row: a line between neighbours, one line above each later row');
  eq(await d.css('.txc__nav', 'display'), 'none', 'no arrows on a desktop');
  eq(await one(d, '[data-r7t-track]').evaluate(el => getComputedStyle(el).display + ' ' + (el.scrollWidth <= el.clientWidth + 1) + ' ' + el.hasAttribute('tabindex')), 'grid true false', 'and a grid that takes no keyboard stop');
  await d.page.close();
}

/* A real finger: touch events sent through the browser, as a phone sends them. */
async function finger(browser, editing) {
  const name = 'text-columns', t = await mount(browser, name, {width: 375, height: 520, editing, assets: ASSETS, settings: {...baseSettings(name), mobile_layout: 'swipe'}, blocks: baseBlocks(name)});
  await t.page.evaluate(() => { const d = document.createElement('div'); d.style.height = '1500px'; document.body.append(d); });
  const cdp = await t.page.context().newCDPSession(t.page);
  await cdp.send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 1});
  const track = one(t, '[data-r7t-track]'), box = await track.boundingBox(), step = await track.evaluate(el => el.children[1].offsetLeft - el.children[0].offsetLeft);
  const drag = async (dx, dy) => {
    const x = box.x + 250, y = box.y + 60;
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
    for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x + dx * i / 10, y: y + dy * i / 10}]}); await t.page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await t.page.waitForTimeout(900);
  };
  await drag(-200, 0);
  const x = await track.evaluate(el => Math.round(el.scrollLeft));
  ok(Math.abs(x - step) <= 2, 'a finger dragging sideways moves the row and it settles on the next column', x + ' / ' + step);
  eq(await t.page.evaluate(() => Math.round(scrollY)), 0, 'while the page stays where it was');
  eq(await one(t, '[data-r7t-prev]').isDisabled(), false, 'and the back arrow comes on');
  await drag(0, -160);
  ok(await t.page.evaluate(() => scrollY) > 60, 'a finger dragging up on the row scrolls the page: the row never holds it', await t.page.evaluate(() => scrollY));
  eq(await track.evaluate(el => Math.round(el.scrollLeft)), x, 'and the row stays on its column');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

/* The pinned heading: plain position: sticky under the sticky header, one column on a phone. */
async function pinned(browser, editing) {
  const name = 'sticky-heading-text', settings = baseSettings(name);
  const long = baseBlocks(name).concat(Array.from({length: 6}, (_, i) => ({type: 'text', settings: {heading: 'More ' + i, text: '<p>Another paragraph of text for the list that scrolls.</p><p>And one more.</p>', link_label: '', link: ''}})));
  const t = await mount(browser, name, {width: 1366, height: 600, editing, assets: ASSETS, settings, blocks: long});
  await t.page.evaluate(() => { const d = document.createElement('div'); d.style.height = '1500px'; document.body.append(d); });
  const rect = sel => one(t, sel).evaluate(el => { const r = el.getBoundingClientRect(); return {top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right)}; });
  eq(await t.css('.sht__header', 'position'), 'sticky', 'the heading side is position: sticky');
  eq(await t.css('.sht__header', 'top'), '32px', 'at its own space from the top');
  const h = await rect('.sht__header'), l = await rect('.sht__list');
  ok(h.right <= l.left, 'two columns: the heading side left of the texts', h.right + ' / ' + l.left);
  await t.page.evaluate(() => scrollTo(0, 500)); await frames(t);
  eq((await rect('.sht__header')).top, 32, 'scrolled, the heading stays in view');
  ok((await rect('.sht__item')).top < 0, 'while the texts scroll past');
  await t.page.evaluate(() => document.documentElement.style.setProperty('--sticky-top', '70px')); await t.page.waitForTimeout(500);
  eq((await rect('.sht__header')).top, 102, 'and sits under the sticky header (its height in --sticky-top)');
  await t.page.evaluate(() => scrollTo(0, 5000)); await frames(t);
  ok((await rect('.sht__header')).bottom <= (await rect('.sht')).bottom + 1, 'at the end it leaves with its section');
  await t.page.evaluate(() => scrollTo(0, 500));
  await t.emit({heading_position: 'right'}); await frames(t);
  ok((await rect('.sht__header')).left >= (await rect('.sht__list')).right, 'heading side right: it moves across');
  await t.emit({sticky: false}); await frames(t);
  eq(await t.css('.sht__header', 'position'), 'static', 'pinning switched off: nothing is sticky');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
  const low = await mount(browser, name, {width: 1366, height: 480, editing, assets: ASSETS, settings, blocks: long});
  eq(await low.css('.sht__header', 'position'), 'static', 'a screen too low to hold the heading side is not pinned');
  await low.page.close();
  for (const width of [375, 900]) {
    const m = await mount(browser, name, {width, editing, assets: ASSETS, settings: {...settings, heading_position: 'right'}, blocks: long});
    const r = sel => one(m, sel).evaluate(el => { const b = el.getBoundingClientRect(); return {top: b.top, bottom: b.bottom}; });
    eq(await m.css('.sht__header', 'position'), 'static', width + 'px: nothing is sticky');
    ok((await r('.sht__header')).bottom <= (await r('.sht__list')).top, width + 'px: one column, the heading first');
    eq(await m.noOverflow(), true, width + 'px: no sideways page scroll');
    await m.page.close();
  }
}

/* Tablet: columns per row and the narrower gap. */
async function tablet(browser, editing) {
  where = 'text-columns 900 ' + (editing ? 'editor' : 'storefront');
  const name = 'text-columns', settings = baseSettings(name), blocks = baseBlocks(name), x = schemaOf(name).schema.settings.find(s => s.id === 'columns_tablet');
  const t = await mount(browser, name, {width: 900, editing, assets: ASSETS, settings, blocks});
  const cols = () => one(t, '.txc__grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  eq(await cols(), 2, 'two columns a row on a tablet by default');
  const seen = new Set();
  for (let v = x.min; v <= x.max; v++) { await t.emit({columns_tablet: v}); await frames(t); eq(await cols(), v, 'Columns per row (tablet) = ' + v + ' (' + (editing ? 'live' : 'redrawn') + ')'); seen.add(await t.css('.txc__grid', 'gridTemplateColumns')); }
  eq(seen.size, 3, 'each tablet column count is different');
  await t.redraw({settings: {columns_tablet: 3}}); await frames(t);
  eq(await cols(), 3, 'and holds after a redraw');
  await t.emit({columns_desktop: 4}); await frames(t);
  eq(await cols(), 3, 'the desktop column count leaves a tablet alone');
  await t.emit({column_gap: 16}); await frames(t);
  eq(await t.css('.txc__grid', 'columnGap'), '16px', 'the gap between columns applies on a tablet');
  eq(await one(t, '.txc__col:nth-child(2)').evaluate(el => getComputedStyle(el, '::before').display + ' ' + getComputedStyle(el.parentElement.children[0], '::before').display), 'block none', 'a line stands between two columns, none before the first');
  /* three columns two to a row: the third starts a second row and draws the line above it, from side to side */
  await t.emit({columns_tablet: 2}); await frames(t);
  eq(await one(t, '.txc__grid').evaluate(el => { const c = [...el.children], w = n => Math.round(parseFloat(getComputedStyle(c[n], '::after').width)); return [0, 1, 2].map(n => getComputedStyle(c[n], '::after').display).join(' ') + ' ' + (w(2) === Math.round(el.getBoundingClientRect().width)); }), 'none none block true', 'one line above the second row, as wide as the row');
  eq(await t.noOverflow(), true, 'no sideways page scroll');
  eq(t.errors.join('; '), '', 'no errors');
  await t.page.close();
}

(async () => {
  const browser = await launch();
  /* W=375 MODE=editor narrows a run while working on a section. */
  const WIDTHS = [375, 1366].filter(w => !process.env.W || +process.env.W === w), MODES = [true, false].filter(e => !process.env.MODE || (process.env.MODE === 'editor') === e);
  try {
    for (const name of NAMES) {
      await schemaChecks(name);
      for (const editing of MODES) {
        for (const width of WIDTHS) {
          where = name + ' ' + width + ' ' + (editing ? 'editor' : 'storefront');
          await inheritance(browser, name, width, editing, true);
          await schemeSwitch(browser, name, width, editing);
          await everyControl(browser, name, width, editing);
          await priorityChecks(browser, name, width, editing);
          await twoInstances(browser, name, width, editing);
          await lifecycle(browser, name, width, editing);
          await emptyValues(browser, name, width, editing);
          await firstPaint(browser, name, width, editing);
          await reducedMotion(browser, name, width, editing);
        }
        where = name + ' 1366 priority off';
        if (editing) await inheritance(browser, name, 1366, true, 'off');
        if (name === 'text-columns') { where = name + ' swipe row ' + (editing ? 'editor' : 'storefront'); await swipeRow(browser, editing); await finger(browser, editing); await tablet(browser, editing); }
        if (name === 'sticky-heading-text') { where = name + ' pinned heading ' + (editing ? 'editor' : 'storefront'); await pinned(browser, editing); }
      }
    }
  } finally { await browser.close(); }
  for (const f of failed) console.error('FAIL ' + f);
  console.log('theme-r7-text: ' + passed + ' checks passed, ' + failed.length + ' failed (' + NAMES.join(', ') + ')');
  if (failed.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
