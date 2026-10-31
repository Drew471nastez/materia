/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-products-bc-priority.cjs [section ...]   (exits 1 on any failure)
   Round 3, Products groups B and C: every custom font, weight, letter
   spacing, case and button size/shape control of Product Spotlight Hero,
   Product Showcase, Products carousel, Products Listing, Product Tabs
   Navigation and the three hotspot sections wins over the theme's real
   priority rules (snippets/theme-controls: "Use in every section" and "Use
   shared button size and shape", both on in config/settings.json).

   For every control, at 375 and 1366, in the editor and on the storefront,
   with theme priority on (and once more at 1366 with it off): the computed
   style on the element that draws the text (and on a <p> inside rich text)
   after a live edit and after a redraw; then the control switched off, live
   and after a redraw, gives back exactly the theme's value and leaves no
   data-own-* attribute. Weight and case selects: every option is drawn and
   all options differ. Theme inheritance (heading/body fonts) with priority
   on and off. */
const assert = require('node:assert/strict');
const {launch, mount, schemaOf, PANTS, OTHER, TALL} = require('./media-fixture.cjs');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const clone = o => JSON.parse(JSON.stringify(o));
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'}, FONT2 = {family: 'Courier New', fallback_families: 'monospace'};
const FONTS_ON = {enable_custom_fonts: true, heading_font: FONT, body_font: FONT2}, FONTS_OFF = {enable_custom_fonts: false};
const HEAD = /Verdana/, BODY = /Courier New/;
const IMG = {src: '/img/look.png', width: 800, height: 1000, aspect_ratio: 0.8, alt: 'Look picture'};
const COLLECTION = {title: 'Summer', handle: 'summer', url: '/collections/summer', products: [PANTS, OTHER, TALL], products_count: 3};
const VARIES = {...PANTS, id: 'varies-id', title: 'Varied Coat', price_varies: true};
const preset = n => clone(schemaOf(n).schema.presets[0].blocks || []);
const withProducts = (n, type, products) => { let i = 0; return preset(n).map(b => b.type === type ? {...b, settings: {...b.settings, product: products[i++ % products.length]}} : b); };
const items = n => Array.from({length: n}, (_, i) => ({...[PANTS, OTHER, TALL][i % 3], id: 'p' + i, handle: 'item-' + i, title: 'Item ' + i, url: '/products/item-' + i}));
const colA = {id: 'a', title: 'New in', handle: 'new-in', url: '/collections/new-in', products_count: 4, products: items(4)};
const SHAPE = {fontSize: '21px', paddingLeft: '31px', paddingTop: '7px', borderTopLeftRadius: '3px'};
/* A text element, or the first <p> inside it (rich text). */
const P = sel => ({sel, p: true});

const SECTIONS = {
  'featured-product2': {
    assets: ['live-products-b.js'], settings: {product: PANTS},
    blocks: [...preset('featured-product2'), {type: 'subheading'}].map(b => b.type === 'buttons' ? {...b, settings: {primary_label: 'Shop now', secondary_label: 'Details'}} : b),
    heading: '.psh__heading', text: P('.psh__sub'),
    cases: [
      {name: 'button size and shape', on: {use_theme_button: false, cta_size: 21, cta_pad_x: 31, cta_pad_y: 7, cta_radius: 3}, off: {use_theme_button: true}, el: [{sel: '.psh__cta[data-pb-primary]', want: SHAPE}, {sel: '.psh__cta--secondary', want: SHAPE}]},
      {name: 'custom fonts', on: FONTS_ON, off: FONTS_OFF, el: [{sel: '.psh__heading', want: {fontFamily: HEAD}}, {...P('.psh__sub'), want: {fontFamily: BODY}}, {sel: '.psh__eyebrow', want: {fontFamily: BODY}}, {sel: '.psh__desc', want: {fontFamily: BODY}}]},
    ],
  },
  'product-showcase': {
    assets: ['live-products-b.js'], settings: {}, blocks: preset('product-showcase'),
    heading: '.ps-slide.is-active .ps-heading', text: '.ps-slide.is-active .ps-desc',
    cases: [
      {name: 'heading custom weight', on: {heading_use_custom_weight: true, heading_weight: '400'}, off: {heading_use_custom_weight: false}, el: [{sel: '.ps-slide.is-active .ps-heading', want: {fontWeight: '400'}}],
        sweep: {id: 'heading_weight', with: {heading_use_custom_weight: true}, sel: '.ps-slide.is-active .ps-heading', prop: 'fontWeight'}},
      {name: 'heading letter spacing', on: {heading_letter_spacing: 5}, off: {heading_letter_spacing: 0}, el: [{sel: '.ps-slide.is-active .ps-heading', want: {letterSpacing: '5px'}}]},
      {name: 'heading case', on: {heading_uppercase: 'uppercase'}, off: {heading_uppercase: 'none'}, el: [{sel: '.ps-slide.is-active .ps-heading', want: {textTransform: 'uppercase'}}],
        sweep: {id: 'heading_uppercase', sel: '.ps-slide.is-active .ps-heading', prop: 'textTransform'}},
      {name: 'button size and shape', on: {use_theme_button: false, button_radius: 3, button_padding_v: 7, button_padding_h: 31, button_font_size: 21}, off: {use_theme_button: true}, el: [{sel: '.ps-slide.is-active .ps-btn', want: SHAPE}]},
      {name: 'custom fonts', on: FONTS_ON, off: FONTS_OFF, el: [{sel: '.ps-slide.is-active .ps-heading', want: {fontFamily: HEAD}}, {sel: '.ps-slide.is-active .ps-desc', want: {fontFamily: BODY}}, {sel: '.ps-slide.is-active .ps-benefit', want: {fontFamily: BODY}}]},
    ],
  },
  'products-carousel': {
    assets: ['live-products-b.js'], settings: {collection: COLLECTION}, blocks: [{type: 'eyebrow', settings: {text: 'New'}}, ...preset('products-carousel')].map(b => b.type === 'subheading' ? {...b, settings: {...b.settings, text: '<p>Fresh picks</p>'}} : b),
    heading: '.pb-heading', text: P('.pb-sub'),
    cases: [
      {name: 'View all size, shape and weight', block: 'view_all', on: {use_theme_button: false, radius: 3, padding_x: 31, padding_y: 7, font_size: 21, font_weight: '700', border_width: 4}, off: {use_theme_button: true}, el: [{sel: '.pc__view-all', want: {...SHAPE, fontWeight: '700', borderTopWidth: '4px'}}],
        sweep: {id: 'font_weight', block: 'view_all', with: {use_theme_button: false}, sel: '.pc__view-all', prop: 'fontWeight'}},
      {name: 'View all uppercase', block: 'view_all', on: {uppercase: true}, off: {uppercase: false}, el: [{sel: '.pc__view-all', want: {textTransform: 'uppercase'}}]},
      {name: 'custom fonts', on: FONTS_ON, off: FONTS_OFF, el: [{sel: '.pb-heading', want: {fontFamily: HEAD}}, {...P('.pb-sub'), want: {fontFamily: BODY}}, {sel: '.pb-eyebrow', want: {fontFamily: BODY}}]},
    ],
  },
  'products-listing': {
    assets: ['live-products-b.js'], settings: {collection: COLLECTION}, blocks: preset('products-listing').map(b => b.type === 'subheading' ? {...b, settings: {...b.settings, text: '<p>Fresh picks</p>'}} : b),
    heading: '.pb-heading', text: P('.pb-sub'),
    cases: [
      {name: 'button size and shape', block: 'button', on: {use_theme_button: false, radius: 3, pad_x: 31, pad_y: 7, size: 21, border_width: 4}, off: {use_theme_button: true}, el: [{sel: '.pl-btn', want: {...SHAPE, borderTopWidth: '4px'}}]},
      {name: 'custom fonts', on: FONTS_ON, off: FONTS_OFF, el: [{sel: '.pb-heading', want: {fontFamily: HEAD}}, {...P('.pb-sub'), want: {fontFamily: BODY}}, {sel: '.pb-eyebrow', want: {fontFamily: BODY}}]},
    ],
  },
  'hotspot-image-product-2': {
    assets: ['live-products-c.js'], settings: {image: IMG}, blocks: withProducts('hotspot-image-product-2', 'hotspot', [PANTS, OTHER, TALL]),
    heading: '.hsp2__heading', text: P('.hsp2__sub'),
    cases: [
      {name: 'custom fonts', on: FONTS_ON, off: FONTS_OFF, el: [{sel: '.hsp2__heading', want: {fontFamily: HEAD}}, {...P('.hsp2__sub'), want: {fontFamily: BODY}}, {sel: '.hsp2__eyebrow', want: {fontFamily: BODY}}, {sel: '.hsp2__pop-title', want: {fontFamily: HEAD}}]},
      {name: 'eyebrow letter spacing', block: 'eyebrow', on: {enable_custom_style: true, letter_spacing: 0.5, size: 12}, off: {enable_custom_style: false}, el: [{sel: '.hsp2__eyebrow', want: {letterSpacing: '6px'}}]},
    ],
  },
  hotspotsection: {
    assets: ['live-products-c.js'], settings: {background_image: IMG}, blocks: withProducts('hotspotsection', 'product_item', [VARIES]),
    heading: '.hss__title', text: '.hss__text',
    cases: [
      {name: 'heading custom weight', block: 'heading', on: {enable_custom_font_weight: true, heading_font_weight: '300'}, off: {enable_custom_font_weight: false}, el: [{sel: '.hss__title', want: {fontWeight: '300'}}],
        sweep: {id: 'heading_font_weight', block: 'heading', with: {enable_custom_font_weight: true}, sel: '.hss__title', prop: 'fontWeight'}},
      {name: 'Choose options weight', on: {choose_text_font_weight: 'bold'}, off: {choose_text_font_weight: 'normal'}, el: [{sel: '.hss__btn--choose', want: {fontWeight: '700'}}],
        sweep: {id: 'choose_text_font_weight', sel: '.hss__btn--choose', prop: 'fontWeight'}},
      {name: 'custom fonts', on: FONTS_ON, off: FONTS_OFF, el: [{sel: '.hss__title', want: {fontFamily: HEAD}}, {sel: '.hss__text', want: {fontFamily: BODY}}, {sel: '.hss__pop-title', want: {fontFamily: HEAD}}]},
    ],
  },
  'shop-the-look': {
    assets: ['live-products-c.js'], settings: {image: IMG}, blocks: withProducts('shop-the-look', 'hotspot', [PANTS, OTHER]),
    heading: '.stl__card-title', text: '.stl__card-price',
    cases: [
      {name: 'custom fonts', on: FONTS_ON, off: FONTS_OFF, el: [{sel: '.stl__card-title', want: {fontFamily: HEAD}}, {sel: '.stl__card-price', want: {fontFamily: BODY}}, {sel: '.stl__label-text', want: {fontFamily: BODY}}]},
    ],
  },
  'collection-tab': {
    assets: ['collection-tab.css', 'product-card.css', 'collection-tab.js', 'live-products-c.js'], settings: {}, globals: {collections: {a: colA}},
    blocks: [{type: 'heading'}, {type: 'subheading', settings: {subheading: '<p>Pick a collection.</p>'}}, {type: 'collection', settings: {collection: colA}}, {type: 'view_more'}],
    heading: '.ti-tabs__heading', text: P('.ti-tabs__subheading'),
    cases: [
      {name: 'heading custom weight', block: 'heading', on: {custom_style: true, heading_font_weight: '300'}, off: {custom_style: false}, el: [{sel: '.ti-tabs__heading', want: {fontWeight: '300'}}],
        sweep: {id: 'heading_font_weight', block: 'heading', with: {custom_style: true}, sel: '.ti-tabs__heading', prop: 'fontWeight'}},
      {name: 'subheading custom weight', block: 'subheading', on: {custom_style: true, subheading_font_weight: '700'}, off: {custom_style: false}, el: [{...P('.ti-tabs__subheading'), want: {fontWeight: '700'}}],
        sweep: {id: 'subheading_font_weight', block: 'subheading', with: {custom_style: true}, sel: '.ti-tabs__subheading p', prop: 'fontWeight'}},
      {name: 'subheading text size', block: 'subheading', sweepOnly: true, sweep: {id: 'text_size', block: 'subheading', with: {custom_style: false}, sel: '.ti-tabs__subheading p', prop: 'fontSize'}},
      {name: 'tab font size and weight', on: {enable_custom_styling: true, tab_font_size: 21, tab_font_weight: '300'}, off: {enable_custom_styling: false}, el: [{sel: '.ti-tabs__btn', want: {fontSize: '21px', fontWeight: '300'}}],
        sweep: {id: 'tab_font_weight', with: {enable_custom_styling: true}, sel: '.ti-tabs__btn', prop: 'fontWeight'}},
    ],
  },
};

const OWN = '[data-own-font],[data-own-weight],[data-own-size],[data-own-shape],[data-pb-own-tracking],[data-pb-own-case]';
async function read(t, list) {
  return t.page.evaluate(list => list.map(({sel, p, props}) => {
    const root = document.querySelector('#shopify-section-test');
    let el = root.querySelector(sel); if (el && p) el = el.querySelector('p') || el;
    if (!el) return null;
    const cs = getComputedStyle(el), o = {};
    for (const k of props) o[k] = cs[k];
    return o;
  }), list.map(e => ({sel: e.sel, p: e.p, props: Object.keys(e.want)})));
}
const owned = t => t.page.evaluate(sel => document.querySelector('#shopify-section-test').querySelectorAll(sel).length, OWN);
const match = (v, w) => w instanceof RegExp ? w.test(v) : v === w;

async function run(browser, name, width, editing, priority) {
  const cfg = SECTIONS[name], where = `${name} @${width} ${editing ? 'editor' : 'storefront'} priority ${priority === 'off' ? 'off' : 'on'}`;
  const t = await mount(browser, name, {width, editing, settings: cfg.settings, blocks: cfg.blocks, assets: cfg.assets, globals: cfg.globals || {}, priority});
  await t.page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
  const base = clone(t.section.settings), baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  const reset = () => t.redraw({settings: base, blocks: clone(baseBlocks)});
  const bIndex = type => baseBlocks.findIndex(b => b.type === type);
  /* Theme inheritance: heading font Georgia, text Arial (priority on and off). */
  const inh = await read(t, [{sel: cfg.heading, want: {fontFamily: 1}}, {...(typeof cfg.text === 'string' ? {sel: cfg.text} : cfg.text), want: {fontFamily: 1}}]);
  ok(inh[0] && /Georgia/.test(inh[0].fontFamily), `${where}: heading uses the theme heading font (${inh[0] && inh[0].fontFamily})`);
  ok(inh[1] && /Arial/.test(inh[1].fontFamily), `${where}: text uses the theme body font (${inh[1] && inh[1].fontFamily})`);
  ok(await owned(t) === 0, `${where}: no data-own-* attribute with every custom control off`);
  for (const c of cfg.cases) {
    const bi = c.block ? bIndex(c.block) : -1, blockId = bi >= 0 ? 'test-b' + bi : undefined;
    assert.ok(!c.block || bi >= 0, name + ': no ' + c.block + ' block');
    const withVals = (vals) => { const S = clone(base), B = clone(baseBlocks); if (bi >= 0) Object.assign(B[bi].settings, vals); else Object.assign(S, vals); return {settings: S, blocks: B}; };
    if (!c.sweepOnly) {
      const tag = `${where} ${c.name}`;
      await reset();
      const theme = await read(t, c.el);
      const check = async (how) => {
        const got = await read(t, c.el);
        c.el.forEach((e, i) => { for (const [k, w] of Object.entries(e.want)) ok(got[i] && match(got[i][k], w), `${tag} on (${how}): ${e.sel}${e.p ? ' p' : ''} ${k} = ${got[i] && got[i][k]}, want ${w}`); });
      };
      const back = async (how) => {
        const got = await read(t, c.el);
        assert.deepEqual(got, theme, `${tag} off (${how}): theme values back`); checks++;
        ok(await owned(t) === 0, `${tag} off (${how}): no data-own-* left`);
      };
      await t.emit(c.on, blockId); await t.page.waitForTimeout(40); await check('live');
      await t.emit(c.off, blockId); await t.page.waitForTimeout(40); await back('live');
      await t.redraw(withVals(c.on)); await check('redraw');
      await t.emit(c.off, blockId); await t.page.waitForTimeout(40); await back('live after redraw');
      await t.redraw(withVals(c.on)); await t.redraw(withVals(c.off)); await back('redraw');
    }
    if (c.sweep && width === 1366 && priority !== 'off') {
      const sw = c.sweep, list = (sw.block ? schemaOf(name).schema.blocks.find(b => b.type === sw.block).settings : schemaOf(name).schema.settings).find(x => x.id === sw.id).options.map(o => o.value);
      for (const live of [true, false]) {
        const seen = [];
        for (const v of list) {
          await t.redraw(withVals({...(sw.with || {}), ...(live ? {} : {[sw.id]: v})}));
          if (live) await t.emit({[sw.id]: v}, blockId);
          const [got] = await read(t, [{sel: sw.sel, want: {[sw.prop]: 1}}]);
          seen.push(got && got[sw.prop]);
        }
        ok(new Set(seen).size === list.length, `${where} ${sw.id} (${live ? 'live' : 'redraw'}): every option draws differently ${JSON.stringify(list)} -> ${JSON.stringify(seen)}`);
      }
    }
  }
  assert.deepEqual(t.errors, [], where + ': no errors'); checks++;
  await t.page.close();
}

(async () => {
  const only = process.argv.slice(2), browser = await launch();
  try {
    for (const name of Object.keys(SECTIONS)) {
      if (only.length && !only.includes(name)) continue;
      for (const width of [375, 1366]) for (const editing of [true, false]) await run(browser, name, width, editing, true);
      await run(browser, name, 1366, true, 'off');
    }
  } finally { await browser.close(); }
  console.log(checks + ' products B/C theme priority checks passed');
})().catch(e => { console.error(e); process.exit(1); });
