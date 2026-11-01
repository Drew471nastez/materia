/* Collections sections (round 4): every custom typography and button switch
   wins under the real theme rules (snippets/theme-controls: Use in every
   section and Use shared button size and shape, both on), on the element and
   on a descendant, at 375 and 1366, in the editor and on the storefront,
   after a redraw and after a live edit; switched off, the theme value is back.

   LIQUIDJS=<path to liquidjs> node tests/theme-collections-r4-priority.cjs [section ...] */
const assert = require('assert/strict');
const {launch, mount, schemaOf} = require('./media-fixture.cjs');
const ASSET = 'live-collections.js';
const COURIER = {family: 'Courier New', fallback_families: 'monospace'}, VERDANA = {family: 'Verdana', fallback_families: 'sans-serif'};
const FONTS = {enable_custom_fonts: true, heading_font: COURIER, body_font: VERDANA};
const clone = o => JSON.parse(JSON.stringify(o));
const preset = n => clone(schemaOf(n).schema.presets[0].blocks || []);
let checks = 0;
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const cour = v => /^"?Courier New/.test(v) ? 'Courier New' : v, verd = v => /^"?Verdana/.test(v) ? 'Verdana' : v;

/* scope: section, or a block type (its first block). checks: [selector, property, expected (string or fn)]. */
const CASES = {
  'category-banners': {
    blocks: () => preset('category-banners').map((b, i) => i ? b : {...b, settings: {...b.settings, subheading: 'Light layers'}}),
    cases: [
      {scope: 'section', on: {enable_custom_style: true, heading_weight: 300, heading_size_mobile: 21, heading_size_desktop: 61}, checks: [['.cb1__heading', 'fontWeight', '300'], ['.cb1__heading', 'fontSize', w => w < 768 ? '21px' : '61px']]},
      {scope: 'section', on: {heading_letter_spacing: 0.3, heading_uppercase: true}, off: {heading_letter_spacing: 0, heading_uppercase: false}, checks: [['.cb1__heading', 'letterSpacing', l => /px$/.test(l) && parseFloat(l) > 3], ['.cb1__heading', 'textTransform', 'uppercase']]},
      {scope: 'section', on: FONTS, checks: [['.cb1__heading', 'fontFamily', 'Courier New', cour], ['.cb1__sub', 'fontFamily', 'Verdana', verd]]},
    ],
  },
  'category-banners-2': {
    blocks: () => preset('category-banners-2').map(b => b.type === 'banner' ? {...b, settings: {...b.settings, subheading: '<p>Light <em>layers</em></p>'}} : b.type === 'heading' ? {...b, settings: {heading: 'Shop by <strong>category</strong>'}} : b),
    cases: [
      {scope: 'section', on: {enable_custom_styling: true, heading_weight: 300, heading_size_mobile: 21, heading_size_desktop: 61}, checks: [['.cb2__heading', 'fontWeight', '300'], ['.cb2__heading', 'fontSize', w => w < 768 ? '21px' : '61px']]},
      {scope: 'section', on: {heading_letter_spacing: 0.3, heading_uppercase: true}, off: {heading_letter_spacing: 0, heading_uppercase: false}, checks: [['.cb2__heading', 'letterSpacing', l => parseFloat(l) > 3], ['.cb2__heading', 'textTransform', 'uppercase']]},
      {scope: 'heading', on: {custom_style: true, heading_font_weight: '300', heading_font_size_mobile: 19, heading_font_size_desktop: 51}, checks: [['.cb2__head-title', 'fontWeight', '300'], ['.cb2__head-title', 'fontSize', w => w < 768 ? '19px' : '51px'], ['.cb2__head-title strong', 'fontWeight', '700']]},
      {scope: 'subheading', on: {custom_style: true, subheading_font_weight: '600', subheading_font_size_mobile: 13, subheading_font_size_desktop: 23}, checks: [['.cb2__head-sub', 'fontWeight', '600'], ['.cb2__head-sub p', 'fontWeight', '600'], ['.cb2__head-sub p', 'fontSize', w => w < 768 ? '13px' : '23px']]},
      {scope: 'section', on: FONTS, checks: [['.cb2__heading', 'fontFamily', 'Courier New', cour], ['.cb2__head-title', 'fontFamily', 'Courier New', cour], ['.cb2__head-sub p', 'fontFamily', 'Verdana', verd], ['.cb2__sub p', 'fontFamily', 'Verdana', verd]]},
    ],
  },
  'scrolling-collection': {
    blocks: () => [{type: 'heading', settings: {text: 'Shop <em>by</em> collection'}}, {type: 'subheading'}, ...preset('scrolling-collection').filter(b => b.type === 'collection')],
    cases: [
      {scope: 'heading', on: {weight_enable: true, weight: '400'}, checks: [['.scol__heading', 'fontWeight', '400'], ['.scol__heading em', 'fontWeight', '400']]},
      {scope: 'heading', on: {size_enable: true, size_mobile: 19, size_desktop: 51}, checks: [['.scol__heading', 'fontSize', w => w < 768 ? '19px' : '51px']]},
      {scope: 'subheading', on: {size_enable: true, size: 21}, checks: [['.scol__sub', 'fontSize', '21px'], ['.scol__sub p', 'fontSize', '21px']]},
      {scope: 'section', on: FONTS, checks: [['.scol__heading', 'fontFamily', 'Courier New', cour], ['.scol__heading em', 'fontFamily', 'Courier New', cour], ['.scol__sub p', 'fontFamily', 'Verdana', verd], ['.scol__chip-label', 'fontFamily', 'Verdana', verd]]},
    ],
  },
  'collection-lookbook': {
    blocks: () => preset('collection-lookbook').map(b => b.type === 'heading' ? {...b, settings: {text: 'Shop <em>the</em> collections'}} : b),
    cases: [
      {scope: 'heading', on: {weight: '400'}, off: {weight: 'theme'}, checks: [['.lcb__heading', 'fontWeight', '400'], ['.lcb__heading em', 'fontWeight', '400']]},
      {scope: 'heading', on: {size_enable: true, size_mobile: 19, size_desktop: 51, line_height: 1.8, tracking: 3}, checks: [['.lcb__heading', 'fontSize', w => w < 768 ? '19px' : '51px'], ['.lcb__heading', 'letterSpacing', '3px'], ['.lcb__heading', 'lineHeight', w => w < 768 ? '34.2px' : '91.8px'], ['.lcb__heading em', 'letterSpacing', '3px']]},
      {scope: 'heading', on: {transform: 'uppercase'}, off: {transform: 'none'}, checks: [['.lcb__heading', 'textTransform', 'uppercase']]},
      {scope: 'section', on: {title_weight: '300', title_tracking: 2, title_transform: 'uppercase'}, off: {title_weight: 'theme', title_tracking: 0, title_transform: 'none'}, checks: [['.lcb__title', 'fontWeight', '300'], ['.lcb__title', 'letterSpacing', '2px'], ['.lcb__title', 'textTransform', 'uppercase']]},
      {scope: 'section', on: {use_theme_button: false, btn_radius: 3, btn_size: 17, btn_pad_x: 31, btn_weight: '700'}, checks: [['.lcb__btn', 'borderTopLeftRadius', '3px'], ['.lcb__btn', 'fontSize', '17px'], ['.lcb__btn', 'paddingLeft', '31px'], ['.lcb__btn', 'fontWeight', '700']]},
      {scope: 'section', on: FONTS, checks: [['.lcb__heading', 'fontFamily', 'Courier New', cour], ['.lcb__title', 'fontFamily', 'Courier New', cour], ['.lcb__sub p', 'fontFamily', 'Verdana', verd], ['.lcb__kicker', 'fontFamily', 'Verdana', verd]]},
    ],
  },
  'collectionnlist': {
    blocks: () => preset('collectionnlist'),
    cases: [
      {scope: 'section', on: {font_weight: '300'}, off: {font_weight: 'theme'}, checks: [['.cnl__link', 'fontWeight', '300'], ['.cnl__label', 'fontWeight', '300']]},
      {scope: 'section', on: FONTS, checks: [['.cnl__link', 'fontFamily', 'Courier New', cour], ['.cnl__label', 'fontFamily', 'Courier New', cour]]},
    ],
  },
  'collection-list2': {
    blocks: () => [{type: 'media_left'}, {type: 'badge'}, {type: 'heading', settings: {text: 'New <em>collection</em>'}}, {type: 'description'}, {type: 'button', settings: {text: 'Shop the collection', link: '/collections/all'}}, {type: 'media_right'}],
    cases: [
      {scope: 'heading', on: {weight: '400'}, off: {weight: 'theme'}, checks: [['.chp__heading', 'fontWeight', '400'], ['.chp__heading em', 'fontWeight', '400']]},
      {scope: 'heading', on: {size_enable: true, size_mobile: 19, size_desktop: 51, line_height: 1.8, tracking: 3}, checks: [['.chp__heading', 'fontSize', w => w < 768 ? '19px' : '51px'], ['.chp__heading', 'letterSpacing', '3px'], ['.chp__heading em', 'letterSpacing', '3px']]},
      {scope: 'heading', on: {transform: 'lowercase'}, off: {transform: 'none'}, checks: [['.chp__heading', 'textTransform', 'lowercase']]},
      {scope: 'description', on: {size_enable: true, size_mobile: 13, size_desktop: 21, line_height: 1.9}, checks: [['.chp__desc', 'fontSize', w => w < 768 ? '13px' : '21px'], ['.chp__desc p', 'fontSize', w => w < 768 ? '13px' : '21px']]},
      {scope: 'button', on: {use_theme_button: false, radius: 3, pad_x: 31, size: 19, weight: '700', border_width: 2}, checks: [['.chp__btn', 'borderTopLeftRadius', '3px'], ['.chp__btn', 'paddingLeft', '31px'], ['.chp__btn', 'fontSize', '19px'], ['.chp__btn', 'fontWeight', '700'], ['.chp__btn', 'borderTopWidth', '2px']]},
      {scope: 'button', on: {enable_custom_style: true, bg: '#00aa00', color: '#000000'}, checks: [['.chp__btn', 'backgroundColor', 'rgb(0, 170, 0)'], ['.chp__btn', 'color', 'rgb(0, 0, 0)']]},
      {scope: 'section', on: FONTS, checks: [['.chp__heading', 'fontFamily', 'Courier New', cour], ['.chp__desc p', 'fontFamily', 'Verdana', verd], ['.chp__badge', 'fontFamily', 'Verdana', verd]]},
    ],
  },
  'collection-banner': {
    blocks: () => preset('collection-banner').map(b => ({...b, settings: {...b.settings, primary_button_link: '/collections/all', description: 'Light layers for warm days.'}})),
    cases: [
      {scope: 'collection', on: {heading_font_weight: '300'}, off: {heading_font_weight: 'theme'}, checks: [['.cbn__title', 'fontWeight', '300'], ['.cbn__title a', 'fontWeight', '300']]},
      {scope: 'section', on: {use_theme_button: false, buttons_corner: 3}, checks: [['.cbn__btn[data-sl-button]', 'borderTopLeftRadius', '3px'], ['.cbn__btn[data-sl-button]', 'fontSize', '14px'], ['.cbn__btn[data-sl-button]', 'paddingLeft', '20px']]},
      {scope: 'collection', on: {enable_custom_style: true, primary_background_color: '#00aa00', primary_text_color: '#000000'}, checks: [['.cbn__btn[data-sl-button]', 'backgroundColor', 'rgb(0, 170, 0)'], ['.cbn__btn[data-sl-button]', 'color', 'rgb(0, 0, 0)']]},
      {scope: 'section', on: FONTS, checks: [['.cbn__title', 'fontFamily', 'Courier New', cour], ['.cbn__title a', 'fontFamily', 'Courier New', cour], ['.cbn__kicker', 'fontFamily', 'Verdana', verd], ['.cbn__desc', 'fontFamily', 'Verdana', verd]]},
    ],
  },
  'collection-list': {
    blocks: () => [{type: 'heading', settings: {text: 'Best <em>collections</em>'}}, {type: 'subheading'}, ...preset('collection-list').filter(b => b.type === 'collection')],
    assets: ['section-collection.css'],
    cases: [
      {scope: 'section', on: FONTS, checks: [['.cdl__heading', 'fontFamily', 'Courier New', cour], ['.cdl__heading em', 'fontFamily', 'Courier New', cour], ['.cdl__desc p', 'fontFamily', 'Verdana', verd]]},
      {scope: 'section', on: {enable_custom_bg: true, custom_section_bg: '#abcdef'}, checks: [['[data-cl-root]', 'backgroundColor', 'rgb(171, 205, 239)']]},
    ],
  },
};

const read = (t, sel, prop) => t.page.locator('#shopify-section-test ' + sel).first().evaluate((el, p) => getComputedStyle(el)[p], prop);
(async () => {
  const only = process.argv.slice(2), names = Object.keys(CASES).filter(n => !only.length || only.includes(n));
  const browser = await launch();
  try {
    for (const name of names) {
      const cfg = CASES[name];
      for (const width of [375, 1366]) for (const editing of [true, false]) {
        const t = await mount(browser, name, {width, editing, blocks: cfg.blocks(), assets: [ASSET, ...(cfg.assets || [])]});
        const base = clone(t.section.settings), baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
        for (const [i, c] of cfg.cases.entries()) {
          const tag = name + ' @' + width + (editing ? ' editor' : ' storefront') + ' case ' + i;
          const bi = c.scope === 'section' ? -1 : baseBlocks.findIndex(b => b.type === c.scope);
          const off = c.off || Object.fromEntries(Object.keys(c.on).map(k => [k, (bi < 0 ? base : baseBlocks[bi].settings)[k]]));
          const draw = async s => { const blocks = clone(baseBlocks); if (bi >= 0) Object.assign(blocks[bi].settings, s); await t.redraw({settings: bi < 0 ? {...base, ...s} : base, blocks}); };
          const expectOn = async how => { for (const [sel, prop, exp, norm] of c.checks) {
            const got = (norm || (v => v))(await read(t, sel, prop));
            if (typeof exp === 'function' && exp.length === 1 && /parseFloat|\.test/.test(exp.toString())) { assert.ok(exp(got), tag + ' ' + how + ' ' + sel + ' ' + prop + ' = ' + got); checks++; }
            else eq(got, typeof exp === 'function' ? exp(width) : exp, tag + ' ' + how + ' ' + sel + ' ' + prop);
          } };
          const expectTheme = async how => { for (const [sel, prop, , norm] of c.checks) eq((norm || (v => v))(await read(t, sel, prop)), theme[sel + '|' + prop], tag + ' ' + how + ' theme value back ' + sel + ' ' + prop); };
          /* The theme's own values: the switch off. */
          await draw(off);
          const theme = {};
          for (const [sel, prop, , norm] of c.checks) theme[sel + '|' + prop] = (norm || (v => v))(await read(t, sel, prop));
          await draw(c.on); await expectOn('redraw');
          await draw(off); await expectTheme('redraw off');
          if (editing) {
            const bid = bi >= 0 ? 'test-b' + bi : undefined;
            await t.emit(c.on, bid); await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
            await expectOn('live');
            await t.emit(off, bid); await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
            await expectTheme('live off');
            await draw(off);
          }
        }
        eq(t.errors, [], name + ' @' + width + ' errors');
        await t.page.close();
      }
    }
    console.log(checks + ' collections priority checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
