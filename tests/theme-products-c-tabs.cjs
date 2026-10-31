/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-products-c-tabs.cjs   (exits 1 on any failure)
   Products group C: Product Tabs Navigation (sections/collection-tab), its
   cached collection-tab.css/js and the live editor updates in
   shopify/assets/live-products-c.js. At 375 and 1366, editor and storefront:
   schema order and checks; theme inheritance (scheme, heading/body fonts,
   theme buttons for the tabs and View more); every visible setting of the
   section and its blocks changes its element, live and after a redraw,
   desktop/mobile values only at their width; tab styles look different;
   real tablist/tab/tabpanel roles, arrow keys, Home/End, per instance; two
   instances stay apart; redraws set up once; first paint equals the
   hydrated paint; reduced motion; no sideways scroll; product cards come
   from the theme's product-item snippet; the legacy paths (no View more
   block, a heading saved with Heading 1) still draw what was saved. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {launch, mount, schemaOf, schemaProblems, PANTS, OTHER, TALL} = require('./media-fixture.cjs');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const NAME = 'collection-tab';
const ASSETS = ['collection-tab.css', 'product-card.css', 'collection-tab.js', 'live-products-c.js'];
const IMG = {src: '/img/icon.png', width: 100, height: 100, aspect_ratio: 1, alt: ''};
const IMG2 = {src: '/img/icon-two.png', width: 100, height: 100, aspect_ratio: 1, alt: ''};
const items = n => Array.from({length: n}, (_, i) => ({...[PANTS, OTHER, TALL][i % 3], id: 'p' + i, handle: 'item-' + i, title: 'Item ' + i, url: '/products/item-' + i}));
const colA = {id: 'a', title: 'New in', handle: 'new-in', url: '/collections/new-in', products_count: 10, products: items(10), image: IMG};
const colB = {id: 'b', title: 'Best sellers', handle: 'best', url: '/collections/best', products_count: 3, products: items(3), image: IMG};
const colE = {id: 'e', title: 'Coming soon', handle: 'soon', url: '/collections/soon', products_count: 0, products: [], image: null};
const GLOBALS = {collections: {a: colA, b: colB, e: colE}};
const BLOCKS = [{type: 'heading'}, {type: 'subheading'}, {type: 'collection', settings: {collection: colA}}, {type: 'collection', settings: {collection: colB}}, {type: 'collection', settings: {collection: colE}}, {type: 'view_more'}];
const C1 = '#010203', RGB1 = 'rgb(1, 2, 3)';
const near = (a, b, d = 1.5) => Math.abs(a - b) <= d;
const R = (uid = 'test') => '#shopify-section-' + uid + ' .sec__collection-tab';
const CARD = '.ti-tabs__panel.is-active grid-custom > *';
const cs = (sel, prop) => ({sel, prop});

const PROBES = [
  {id: 'color_scheme', v: 'alt-scheme', ...cs('', 'backgroundColor'), expect: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'container', ...cs('.ti-tabs__inner', 'maxWidth'), match: /^13\d\dpx$/},
  {id: 'reset_spacing', v: false, live: false, fn: 'el.classList.contains("remove_spacing")', expect: false},
  {id: 'items_to_show', v: 2, live: false, fn: `el.querySelectorAll(${JSON.stringify(CARD)}).length`, expect: 2},
  {id: 'items_per_row', v: 2, ...cs(CARD, 'width'), w: 1366},
  {id: 'rows', v: 2, live: false, fn: `el.querySelectorAll(${JSON.stringify(CARD)}).length`, expect: 8},
  {id: 'column_gap', v: 40, w: 1366, fn: `(() => { const c = el.querySelectorAll(${JSON.stringify(CARD)}); return Math.round(c[1].getBoundingClientRect().left - c[0].getBoundingClientRect().right); })()`},
  {id: 'content_alignment', v: 'left', ...cs('.ti-tabs__header', 'textAlign'), expect: 'left'},
  {id: 'vertical_gap_heading_subheading', v: 33, ...cs('.ti-tabs__subheading', 'marginTop'), expect: '33px'},
  {id: 'tab_style', v: 'underline', ...cs('.ti-tabs__btn.is-active', 'backgroundColor')},
  {id: 'tabs_alignment', v: 'left', w: 1366, fn: 'Math.round(el.querySelector(".ti-tabs__btn").getBoundingClientRect().left)'},
  {id: 'tab_border_radius', v: 2, with: {tab_style: 'button'}, ...cs('.ti-tabs__btn', 'borderTopLeftRadius'), expect: '2px'},
  {id: 'tab_padding_x', v: 31, ...cs('.ti-tabs__btn', 'paddingLeft'), expect: '31px'},
  {id: 'tab_padding_y', v: 15, ...cs('.ti-tabs__btn', 'paddingTop'), expect: '15px'},
  {id: 'tab_gap', v: 31, ...cs('.ti-tabs__nav', 'columnGap'), expect: '31px'},
  {id: 'tab_unchecked_border_thickness', v: 3, ...cs('.ti-tabs__btn:not(.is-active)', 'borderTopWidth'), expect: '3px'},
  {id: 'tab_checked_border_thickness', v: 3, ...cs('.ti-tabs__btn.is-active', 'borderTopWidth'), expect: '3px'},
  {id: 'show_tab_icon', v: true, live: false, ...cs('.ti-tabs__icon', 'display')},
  {id: 'tab_icon_size', v: 40, with: {show_tab_icon: true}, preRedraw: true, ...cs('.ti-tabs__icon', 'width'), expect: '40px'},
  {id: 'show_product_count', v: true, live: false, ...cs('.ti-tabs__count', 'text'), expect: '(10)'},
  {id: 'show_nav_bottom_border', v: true, ...cs('.ti-tabs__nav', 'borderBottomWidth'), expect: '1px'},
  {id: 'nav_bottom_border_thickness', v: 4, with: {show_nav_bottom_border: true}, ...cs('.ti-tabs__nav', 'borderBottomWidth'), expect: '4px'},
  {id: 'gap_tabs_to_products', v: 51, ...cs('.ti-tabs__nav', 'marginBottom'), expect: '51px'},
  {id: 'gap_loadmore', v: 51, ...cs('.ti-tabs__loadmore-wrap', 'marginTop'), expect: '51px'},
  {id: 'empty_state_message', v: 'Nothing here yet', ...cs('.ti-tabs__empty', 'text'), expect: 'Nothing here yet'},
  {id: 'empty_state_font_size', v: 21, ...cs('.ti-tabs__empty', 'fontSize'), expect: '21px'},
  {id: 'enable_custom_styling', v: true, with: {tab_checked_bg_color: C1}, ...cs('.ti-tabs__btn.is-active', 'backgroundColor'), expect: RGB1},
  {id: 'tab_font_size', v: 21, custom: true, ...cs('.ti-tabs__btn', 'fontSize'), expect: '21px'},
  {id: 'tab_font_weight', v: '300', custom: true, ...cs('.ti-tabs__btn', 'fontWeight'), expect: '300'},
  {id: 'tab_unchecked_bg_color', v: C1, custom: true, ...cs('.ti-tabs__btn:not(.is-active)', 'backgroundColor'), expect: RGB1},
  {id: 'tab_checked_bg_color', v: C1, custom: true, ...cs('.ti-tabs__btn.is-active', 'backgroundColor'), expect: RGB1},
  {id: 'tab_unchecked_text_color', v: C1, custom: true, ...cs('.ti-tabs__btn:not(.is-active)', 'color'), expect: RGB1},
  {id: 'tab_checked_text_color', v: C1, custom: true, ...cs('.ti-tabs__btn.is-active', 'color'), expect: RGB1},
  {id: 'tab_hover_bg_color', v: C1, custom: true, ...cs('', '--ct-hover-bg'), expect: C1},
  {id: 'tab_hover_text_color', v: C1, custom: true, ...cs('', '--ct-hover-text'), expect: C1},
  {id: 'tab_unchecked_border_color', v: C1, custom: true, with: {tab_unchecked_border_thickness: 2}, ...cs('.ti-tabs__btn:not(.is-active)', 'borderTopColor'), expect: RGB1},
  {id: 'tab_checked_border_color', v: C1, custom: true, with: {tab_checked_border_thickness: 2}, ...cs('.ti-tabs__btn.is-active', 'borderTopColor'), expect: RGB1},
  {id: 'nav_bottom_border_color', v: C1, custom: true, with: {show_nav_bottom_border: true}, ...cs('.ti-tabs__nav', 'borderBottomColor'), expect: RGB1},
  {id: 'empty_state_text_color', v: C1, custom: true, ...cs('.ti-tabs__empty', 'color'), expect: RGB1},
  {id: 'tab_switch_animation', v: 'zoom-in', ...cs('', '@data-ct-switch'), expect: 'zoom-in'},
  {id: 'reveal', v: false, live: false, fn: 'el.classList.contains("overflow-hidden")', expect: false},
  {id: 'scroll_animation', v: 'fade', ...cs('', '@data-ct-animation'), expect: 'fade'},
  {id: 'padding_top', v: 7, ...cs('', 'paddingTop'), expect: '7px'},
  {id: 'padding_bottom', v: 7, ...cs('', 'paddingBottom'), expect: '7px'},
  {id: 'vertical_gap_subheading_section_desktop', v: 41, ...cs('.ti-tabs__header', 'marginBottom'), expect: '41px', w: 1366},
  {id: 'section_margin_top_desktop', v: 13, with: {reset_spacing: false}, preRedraw: true, fn: 'getComputedStyle(el.closest(".shopify-section")).marginTop', expect: '13px', w: 1366},
  {id: 'section_margin_bottom_desktop', v: 13, with: {reset_spacing: false}, preRedraw: true, fn: 'getComputedStyle(el.closest(".shopify-section")).marginBottom', expect: '13px', w: 1366},
  {id: 'items_per_row_mobile', v: 1, ...cs(CARD, 'width'), w: 375},
  {id: 'tabs_full_width', v: true, ...cs('.ti-tabs__btn', 'flexGrow'), expect: '1', w: 375},
  {id: 'vertical_gap_subheading_section_mobile', v: 41, ...cs('.ti-tabs__header', 'marginBottom'), expect: '41px', w: 375},
  {id: 'section_margin_top_mobile', v: 13, with: {reset_spacing: false}, preRedraw: true, fn: 'getComputedStyle(el.closest(".shopify-section")).marginTop', expect: '13px', w: 375},
  {id: 'section_margin_bottom_mobile', v: 13, with: {reset_spacing: false}, preRedraw: true, fn: 'getComputedStyle(el.closest(".shopify-section")).marginBottom', expect: '13px', w: 375},
  {block: 'heading', id: 'heading', v: 'New <em>arrivals</em>', ...cs('.ti-tabs__heading', 'text'), expect: 'New arrivals'},
  {block: 'heading', id: 'text_style', v: 'large', ...cs('.ti-tabs__heading', 'fontSize')},
  {block: 'heading', id: 'custom_style', v: true, with: {heading_color: C1}, ...cs('.ti-tabs__heading', 'color'), expect: RGB1},
  {block: 'heading', id: 'heading_color', v: C1, with: {custom_style: true}, ...cs('.ti-tabs__heading', 'color'), expect: RGB1},
  {block: 'heading', id: 'heading_font_weight', v: '300', with: {custom_style: true}, ...cs('.ti-tabs__heading', 'fontWeight'), expect: '300'},
  {block: 'heading', id: 'heading_font_size_desktop', v: 51, with: {custom_style: true}, ...cs('.ti-tabs__heading', 'fontSize'), expect: '51px', w: 1366},
  {block: 'heading', id: 'heading_font_size_mobile', v: 19, with: {custom_style: true}, ...cs('.ti-tabs__heading', 'fontSize'), expect: '19px', w: 375},
  {block: 'subheading', id: 'subheading', v: '<p>Short <strong>line</strong></p>', ...cs('.ti-tabs__subheading', 'text'), expect: 'Short line'},
  {block: 'subheading', id: 'text_size', v: 'body_large', ...cs('.ti-tabs__subheading', 'fontSize')},
  {block: 'subheading', id: 'max_width', v: 300, ...cs('.ti-tabs__subheading', 'maxWidth'), expect: '300px'},
  {block: 'subheading', id: 'custom_style', v: true, with: {subheading_color: C1}, ...cs('.ti-tabs__subheading', 'color'), expect: RGB1},
  {block: 'subheading', id: 'subheading_color', v: C1, with: {custom_style: true}, ...cs('.ti-tabs__subheading', 'color'), expect: RGB1},
  {block: 'subheading', id: 'subheading_font_weight', v: '700', with: {custom_style: true}, ...cs('.ti-tabs__subheading', 'fontWeight'), expect: '700'},
  {block: 'subheading', id: 'subheading_font_size_desktop', v: 21, with: {custom_style: true}, ...cs('.ti-tabs__subheading', 'fontSize'), expect: '21px', w: 1366},
  {block: 'subheading', id: 'subheading_font_size_mobile', v: 11, with: {custom_style: true}, ...cs('.ti-tabs__subheading', 'fontSize'), expect: '11px', w: 375},
  {block: 'collection', id: 'collection', v: colB, live: false, ...cs('.ti-tabs__btn', 'text'), expect: 'Best sellers'},
  {block: 'collection', id: 'collection_title', v: 'Fresh', ...cs('.ti-tabs__btn-text', 'text'), expect: 'Fresh'},
  {block: 'collection', id: 'tab_icon', v: IMG2, live: false, with: {}, sectionPre: {show_tab_icon: true}, ...cs('.ti-tabs__icon', '@src'), match: /icon-two/},
  {block: 'view_more', id: 'enabled', v: false, live: false, fn: '!!el.querySelector(".load-more")', expect: false},
  {block: 'view_more', id: 'label', v: 'Show more', ...cs('.load-more', 'text'), expect: 'Show more'},
  {block: 'view_more', id: 'button_role', v: 'secondary', ...cs('.load-more', 'backgroundColor')},
  {block: 'view_more', id: 'appearance', v: 'outline', ...cs('.load-more', 'backgroundColor')},
  {block: 'view_more', id: 'custom_style', v: true, with: {button_background: C1}, ...cs('.load-more', 'backgroundColor'), expect: RGB1},
  {block: 'view_more', id: 'button_background', v: C1, with: {custom_style: true}, ...cs('.load-more', 'backgroundColor'), expect: RGB1},
  {block: 'view_more', id: 'button_text', v: C1, with: {custom_style: true}, ...cs('.load-more', 'color'), expect: RGB1},
  {block: 'view_more', id: 'button_border', v: C1, with: {custom_style: true}, ...cs('.load-more', 'borderTopColor'), expect: RGB1},
];

async function measure(t, p, uid = 'test') {
  return t.page.evaluate(({root, p}) => {
    const r = document.querySelector(root);
    if (p.fn) return new Function('el', 'return ' + p.fn)(r);
    const el = p.sel ? r.querySelector(p.sel) : r;
    if (!el) return '<missing>';
    if (p.prop === 'text') return el.textContent.trim().replace(/\s+/g, ' ');
    if (p.prop === '@src') return (el.getAttribute('src') || '').split('?')[0];
    if (p.prop[0] === '@') return el.getAttribute(p.prop.slice(1));
    if (p.prop.startsWith('--')) return getComputedStyle(el).getPropertyValue(p.prop).trim();
    return getComputedStyle(el)[p.prop];
  }, {root: R(uid), p});
}
const blockOf = (t, type) => t.rendered[0].section.blocks.find(b => b.type === type);
const original = (t, block, keys) => { const src = block ? blockOf(t, block).settings : t.rendered[0].section.settings; return Object.fromEntries(keys.map(k => [k, src[k] === undefined ? '' : src[k]])); };
async function apply(t, block, changes, how) {
  if (how === 'emit') return t.emit(changes, block ? t.blockId(block) : undefined);
  if (!block) return t.redraw({settings: changes});
  const r = t.rendered[0], first = blockOf(t, block);
  return t.redraw({blocks: r.section.blocks.map(b => ({type: b.type, settings: b === first ? {...b.settings, ...changes} : b.settings}))});
}

async function controls(browser, width) {
  const t = await mount(browser, NAME, {width, blocks: BLOCKS, globals: GLOBALS, assets: ASSETS});
  await t.page.addStyleTag({content: '*, *::before, *::after { transition: none !important; }'}); // read end values, not a frame of a colour fade
  const {schema} = t;
  const visible = [['', schema.settings], ...schema.blocks.map(b => [b.type, b.settings])].flatMap(([type, list]) => list.filter(x => x.id && !x.hidden).map(x => (type ? type + '.' : '') + x.id));
  const covered = new Set(PROBES.map(p => (p.block ? p.block + '.' : '') + p.id));
  for (const id of visible) ok(covered.has(id), `${NAME}: setting ${id} has a control check`);
  for (const p of PROBES) {
    const where = `${NAME}@${width} ${p.block ? p.block + '.' : ''}${p.id}`;
    const pre = {...(p.with || {})}; if (p.custom) pre.enable_custom_styling = true;
    const preRestore = original(t, p.block, Object.keys(pre)), restore = original(t, p.block, [p.id]);
    if (p.sectionPre) await t.redraw({settings: p.sectionPre});
    for (const how of p.live === false ? ['redraw'] : ['emit', 'redraw']) {
      if (Object.keys(pre).length) await apply(t, p.block, pre, p.preRedraw ? 'redraw' : how);
      const base = await measure(t, p);
      await apply(t, p.block, {[p.id]: p.v}, how);
      await t.page.waitForTimeout(60);
      const got = await measure(t, p);
      if (p.w && p.w !== width) eq(got, base, `${where} (${how}): a ${p.w === 1366 ? 'desktop' : 'mobile'} value leaves this width alone`);
      else {
        ok(got !== base, `${where} (${how}): changes its element (${base} -> ${got})`);
        if ('expect' in p) eq(got, p.expect, `${where} (${how}) value`);
        if (p.match) ok(p.match.test(String(got)), `${where} (${how}) ${got} matches ${p.match}`);
      }
      await apply(t, p.block, restore, how);
      await t.page.waitForTimeout(60);
      eq(await measure(t, p), base, `${where} (${how}): back to where it was when undone`);
      if (Object.keys(pre).length) await apply(t, p.block, preRestore, p.preRedraw ? 'redraw' : how);
    }
    if (p.sectionPre) await t.redraw({settings: original(t, null, Object.keys(p.sectionPre))});
  }
  eq(t.errors, [], `${NAME}@${width}: no errors while editing`);
  await t.page.close();
}

async function tabs(browser, width, editing) {
  const where = `${NAME}@${width}${editing ? ' editor' : ''}`;
  const t = await mount(browser, NAME, {width, editing, globals: GLOBALS, assets: ASSETS, instances: [{uid: 'a', blocks: BLOCKS}, {uid: 'b', blocks: BLOCKS}]});
  const {page} = t;
  // Theme inheritance.
  const root = await page.$eval(R('a'), el => getComputedStyle(el).backgroundColor);
  eq(root, 'rgb(24, 32, 40)', `${where}: scheme background`);
  const h = await page.$eval(R('a') + ' .ti-tabs__heading', el => [el.tagName, getComputedStyle(el).color, getComputedStyle(el).fontFamily]);
  ok(h[0] === 'H2' && h[1] === 'rgb(255, 255, 255)' && /Georgia/.test(h[2]), `${where}: heading is an h2 in the scheme heading colour and font (${h})`);
  const sub = await page.$eval(R('a') + ' .ti-tabs__subheading', el => [getComputedStyle(el).color, getComputedStyle(el).fontFamily]);
  ok(sub[0] === 'rgb(204, 204, 204)' && /Arial/.test(sub[1]), `${where}: subheading in the scheme text colour and body font (${sub})`);
  const pill = await page.$eval(R('a') + ' .ti-tabs__btn.is-active', el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color]);
  eq(pill, ['rgb(18, 52, 86)', 'rgb(255, 255, 255)'], `${where}: the open pill uses Theme settings > Buttons`);
  const more = await page.$eval(R('a') + ' .load-more', el => ({tb: el.dataset.themeButton, sl: el.hasAttribute('data-sl-button'), bg: getComputedStyle(el).backgroundColor, r: getComputedStyle(el).borderTopLeftRadius, h: el.getBoundingClientRect().height}));
  ok(more.tb === 'primary' && more.sl && more.bg === 'rgb(18, 52, 86)' && more.r === '12px' && more.h >= 44, `${where}: View more is a theme button ${JSON.stringify(more)}`);
  await page.hover(R('a') + ' .load-more'); await page.waitForTimeout(60);
  eq(await page.$eval(R('a') + ' .load-more', el => getComputedStyle(el).backgroundColor), 'rgb(255, 0, 0)', `${where}: View more hover from the theme`);
  // Product cards are the theme's product-item snippet.
  ok(await page.$$eval(R('a') + ' .ti-tabs__panel.is-active grid-custom > *', els => els.length) >= 4 && await page.$(R('a') + ' .ti-tabs__panel.is-active .product-item__inner'), `${where}: cards from the theme product card snippet (product-item)`);
  // Roles and keyboard.
  const roles = await page.$$eval(R('a') + ' [role="tab"]', els => els.map(e => ({sel: e.getAttribute('aria-selected'), tab: e.tabIndex, panel: document.getElementById(e.getAttribute('aria-controls'))?.getAttribute('role'), label: document.getElementById(e.getAttribute('aria-controls'))?.getAttribute('aria-labelledby') === e.id, h: e.getBoundingClientRect().height})));
  ok(await page.$(R('a') + ' [role="tablist"]') && roles.length === 3 && roles.every(r => r.panel === 'tabpanel' && r.label && r.h >= 44), `${where}: tablist, tabs and labelled tabpanels, 44px tabs`);
  eq(roles.map(r => [r.sel, r.tab]), [['true', 0], ['false', -1], ['false', -1]], `${where}: one selected tab in the tab order`);
  const tabsA = await page.$$(R('a') + ' [role="tab"]');
  await tabsA[0].focus();
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
  const sel = uid => page.$$eval(R(uid) + ' [role="tab"]', els => els.map(e => e.getAttribute('aria-selected')));
  eq(await sel('a'), ['false', 'true', 'false'], `${where}: ArrowRight opens the next tab`);
  ok(await tabsA[1].evaluate(e => e === document.activeElement), `${where}: focus follows`);
  eq(await page.$$eval(R('a') + ' [role="tabpanel"]', els => els.map(p => p.hasAttribute('inert'))), [true, false, true], `${where}: closed panels are inert`);
  await page.keyboard.press('End'); await page.waitForTimeout(80);
  eq(await sel('a'), ['false', 'false', 'true'], `${where}: End`);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
  eq(await sel('a'), ['true', 'false', 'false'], `${where}: ArrowRight wraps`);
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(80);
  eq(await sel('a'), ['false', 'false', 'true'], `${where}: ArrowLeft wraps back`);
  await page.keyboard.press('Home'); await page.waitForTimeout(80);
  eq(await sel('a'), ['true', 'false', 'false'], `${where}: Home`);
  await tabsA[2].click(); await page.waitForTimeout(80);
  eq(await sel('a'), ['false', 'false', 'true'], `${where}: a tap opens a tab`);
  ok(/No products found in this collection/.test(await page.$eval(R('a') + ' .ti-tabs__panel.is-active', e => e.textContent)), `${where}: an empty tab says so`);
  eq(await sel('b'), ['true', 'false', 'false'], `${where}: the other instance keeps its own tab`);
  // Two instances: an edit to a leaves b alone.
  await t.emit({enable_custom_styling: true, tab_checked_bg_color: C1}, undefined, 'a');
  await page.waitForTimeout(350); // the tab colour fades over .25s
  ok(await page.$eval(R('a') + ' .ti-tabs__btn.is-active', e => getComputedStyle(e).backgroundColor) === RGB1 && await page.$eval(R('b') + ' .ti-tabs__btn.is-active', e => getComputedStyle(e).backgroundColor) !== RGB1, `${where}: edits stay in their instance`);
  // Scheme switch live and after redraw.
  await t.emit({color_scheme: 'alt-scheme'}, undefined, 'b');
  eq(await page.$eval(R('b'), e => getComputedStyle(e).backgroundColor), 'rgb(250, 250, 250)', `${where}: scheme switch live`);
  await t.redraw({uid: 'b', settings: {color_scheme: 'alt-scheme'}});
  eq(await page.$eval(R('b'), e => getComputedStyle(e).backgroundColor), 'rgb(250, 250, 250)', `${where}: scheme switch after redraw`);
  // Redraws set up once and stay live; an added tab is drawn and live.
  const before = await page.evaluate(() => window.MateriaProductsC.stats().roots);
  for (let i = 0; i < 3; i++) await t.redraw({uid: 'b'});
  eq(await page.evaluate(() => window.MateriaProductsC.stats().roots), before, `${where}: redraws set up once`);
  const added = t.rendered.find(r => r.section.id === 'b').section.blocks.map(b => ({type: b.type, settings: b.settings})).concat([{type: 'collection', settings: {collection: colB, collection_title: 'Added'}}]);
  await t.redraw({uid: 'b', blocks: added});
  const newId = t.blockId('collection', 3, 'b');
  await page.click(`${R('b')} [role="tab"][data-block-id="${newId}"]`); await page.waitForTimeout(80);
  eq(await page.$eval(`${R('b')} [role="tab"][data-block-id="${newId}"]`, e => e.getAttribute('aria-selected')), 'true', `${where}: an added tab opens`);
  await t.emit({collection_title: 'Renamed'}, newId, 'b');
  eq(await page.$eval(`${R('b')} [role="tab"][data-block-id="${newId}"] .ti-tabs__btn-text`, e => e.textContent), 'Renamed', `${where}: an added tab is live`);
  ok(await t.noOverflow(), `${where}: no sideways scroll`);
  eq(t.errors, [], `${where}: no errors`);
  await page.close();
}

async function styles(browser) {
  const seen = [];
  for (const tab_style of ['pill', 'button', 'underline', 'text']) {
    const t = await mount(browser, NAME, {width: 1366, blocks: BLOCKS, globals: GLOBALS, assets: ASSETS, settings: {tab_style}});
    seen.push(await t.page.$eval(R() + ' .ti-tabs__btn.is-active', e => { const c = getComputedStyle(e); return [c.backgroundColor, c.borderTopLeftRadius, c.borderBottomWidth, c.fontWeight].join(' '); }));
    await t.page.close();
  }
  eq(new Set(seen).size, 4, `${NAME}: the four tab styles look different (${seen.join(' | ')})`);
}

async function paint(browser, width) {
  const snap = async assets => {
    const m = await mount(browser, NAME, {width, blocks: BLOCKS, globals: GLOBALS, assets, inlineScripts: false});
    const out = await m.page.evaluate(root => [...document.querySelectorAll(root + ', ' + root + ' *')].filter(el => !(el.closest('svg') && el.tagName !== 'svg')).map(el => { const b = el.getBoundingClientRect(), c = getComputedStyle(el); return [el.tagName, Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize].join('|'); }), R());
    await m.page.close();
    return out;
  };
  const cold = await snap(ASSETS.filter(a => a !== 'live-products-c.js')), warm = await snap(ASSETS);
  eq(warm, cold, `${NAME}@${width}: first paint equals the hydrated paint`);
  const rm = await mount(browser, NAME, {width, blocks: BLOCKS, globals: GLOBALS, assets: ASSETS, reducedMotion: 'reduce', editing: false});
  await rm.page.click(R() + ' [role="tab"] >> nth=1'); await rm.page.waitForTimeout(80);
  eq(await rm.page.$eval(R() + ' .ti-tabs__panel.is-active', e => [getComputedStyle(e).animationName, getComputedStyle(e).opacity]), ['none', '1'], `${NAME}@${width}: reduced motion switches tabs without animation`);
  eq(await rm.page.$eval(R(), e => getComputedStyle(e).opacity), '1', `${NAME}@${width}: reduced motion shows the section`);
  eq(rm.errors, [], `${NAME}@${width}: no errors under reduced motion`);
  await rm.page.close();
}

async function legacy(browser) {
  // A heading saved as Heading 1 before Text style existed keeps its size; Text style picks one when chosen.
  const head = [{type: 'heading', settings: {heading_size: 'h1'}}, {type: 'collection', settings: {collection: colA}}];
  let t = await mount(browser, NAME, {width: 1366, blocks: head, globals: GLOBALS, assets: ASSETS});
  eq(await t.page.$eval(R(), e => e.dataset.ctH), 'h1', `${NAME}: a heading saved as Heading 1 stays Heading 1`);
  await t.emit({text_style: 'small'}, t.blockId('heading'));
  eq(await t.page.$eval(R(), e => e.dataset.ctH), 'h3', `${NAME}: Text style picks the size when changed`);
  await t.page.close();
  // No View more block: the saved section settings still draw it.
  t = await mount(browser, NAME, {width: 1366, blocks: head, globals: GLOBALS, assets: ASSETS, settings: {button_label: 'See more', use_outline_button_style: true}});
  const lm = await t.page.$eval(R() + ' .load-more', e => [e.textContent.trim(), e.dataset.buttonAppearance, e.dataset.themeButton]);
  eq(lm, ['See more', 'outline', 'primary'], `${NAME}: no View more block uses the saved label and outline`);
  await t.emit({button_label: 'Load more'});
  eq(await t.page.$eval(R() + ' .load-more', e => e.textContent.trim()), 'Load more', `${NAME}: the legacy label is live`);
  await t.page.close();
  // The saved home page instance renders.
  const saved = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'templates/home.json'), 'utf8')).sections['collection-tab-1792869150783'];
  const blocks = saved.block_order.map(id => ({type: saved.blocks[id].type, settings: {...saved.blocks[id].settings, ...(saved.blocks[id].type === 'collection' ? {collection: colA} : {})}}));
  t = await mount(browser, NAME, {width: 1366, blocks, globals: GLOBALS, settings: saved.settings, assets: ASSETS});
  const s = await t.page.$eval(R(), e => ({h: e.dataset.ctH, style: e.dataset.ctStyle, head: e.querySelector('.ti-tabs__heading').textContent, more: !!e.querySelector('.load-more'), icon: !!e.querySelector('.ti-tabs__icon')}));
  eq(s, {h: 'h2', style: 'underline', head: 'Featured Products', more: true, icon: false}, `${NAME}: the saved home page instance draws as saved`);
  eq(t.errors, [], `${NAME}: saved instance, no errors`);
  await t.page.close();
}

(async () => {
  const browser = await launch();
  try {
    eq(schemaProblems(NAME), [], `${NAME}: schema checks`);
    const {schema} = schemaOf(NAME);
    const heads = schema.settings.filter(x => x.type === 'header').map(x => x.content);
    ok(heads[0] === 'General' && heads.indexOf('Appearance') < heads.indexOf('Animation') && heads[heads.length - 1] === 'Mobile', `${NAME}: settings grouped in the shared order (${heads.join(' > ')})`);
    for (const x of schema.settings) if (x.type === 'color') ok(/enable_custom_styling/.test(x.visible_if || ''), `${NAME}: colour ${x.id} waits for Enable custom styling`);
    for (const width of [375, 1366]) {
      const lib = await mount(browser, NAME, {width, editing: true, assets: ASSETS, globals: GLOBALS});
      ok(await lib.noOverflow() && (await lib.page.$$('[role="tab"]')).length === 3, `${NAME}@${width}: library preview draws its three tabs`);
      eq(lib.errors, [], `${NAME}@${width}: library preview, no errors`);
      if (process.env.SHOTS) await lib.page.screenshot({path: path.join(process.env.SHOTS, `${NAME}-library-${width}.png`), fullPage: true});
      await lib.page.close();
      await controls(browser, width);
      for (const editing of [true, false]) await tabs(browser, width, editing);
      await paint(browser, width);
    }
    await styles(browser);
    await legacy(browser);
  } finally { await browser.close(); }
  console.log(`theme-products-c-tabs: ${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
