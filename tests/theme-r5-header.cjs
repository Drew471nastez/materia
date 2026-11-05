/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-r5-header.cjs
   Round 5, Header (sections/theme-header) on the real layout, with Theme
   settings > Typography "Use in every section" on (snippets/theme-controls):
   1. schema: ids kept and unique, the block files mirror the header's
      blocks, Menu font group, labels;
   2. every visible setting of the section and of every block changes the
      header after a redraw (each one on its own), at 1366;
   3. every value shopify/assets/live-header.js applies live gives the same
      header as the redraw that follows it (computed styles and boxes of
      every element), at 1366 and 375, section and block settings;
   4. Menu font: custom font, size and weight win under the theme priority on
      the top-level link and a dropdown link, live and after redraw; off
      gives the theme back;
   5. logo size, sticky and the hamburger: 44px targets at 375,
      aria-expanded, keyboard, no sideways scroll; redraw binds once. */
const assert = require('node:assert/strict');
const L = require('./theme-r5-header-lib.cjs');
const {PANTS, OTHER} = require('./theme-featured-product-round5.cjs');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

/* ---------- 1. schema ---------- */
const hs = L.schemaOf('sections/theme-header.storelib'), old = L.schemaOf('sections/theme-header.storelib', true);
{
  const ids = hs.settings.filter(s => s.id).map(s => s.id);
  ok(new Set(ids).size === ids.length, 'section ids are unique');
  ok(old.settings.filter(s => s.id).every(s => ids.includes(s.id)), 'every section id at HEAD is kept');
  for (const ob of old.blocks) {
    const nb = hs.blocks.find(b => b.type === ob.type);
    /* Storelib's builder renamed open-link-newtab to open_link_newtab in menu_promotion, menu_product and menu_collection; the saved header holds neither and the snippet reads both. */
    const RENAMED = {'open-link-newtab': 'open_link_newtab'};
    ok(nb && ob.settings.filter(s => s.id).every(s => nb.settings.some(x => x.id === s.id || x.id === RENAMED[s.id])), `block ${ob.type} keeps its ids`);
    const bids = nb.settings.filter(s => s.id).map(s => s.id);
    ok(new Set(bids).size === bids.length, `block ${ob.type} ids are unique`);
    const file = L.read('blocks/' + ob.type + '.storelib');
    const fb = JSON.parse(file.slice(file.indexOf('\n<schema>') + 9, file.lastIndexOf('</schema>'))).shopify;
    ok(JSON.stringify(fb.settings) === JSON.stringify(nb.settings), `blocks/${ob.type}.storelib mirrors the header's block`);
  }
  const i = ids.indexOf('enable_custom_fonts');
  ok(i > 0 && ids.slice(i, i + 4).join() === 'enable_custom_fonts,menu_custom_font,menu_font_size,menu_font_weight', 'Menu font: switch, then font, size and weight');
  const S = id => hs.settings.find(s => s.id === id);
  ok(S('enable_custom_fonts').default === false && ['menu_custom_font', 'menu_font_size', 'menu_font_weight'].every(id => S(id).visible_if === '{{ section.settings.enable_custom_fonts }}'), 'Menu font is opt in and its controls hide while it is off');
  ok(S('menu_custom_font').type === 'font_picker' && S('logo_width_desktop').type === 'range' && S('logo_width_mobile').type === 'range' && S('mega_menu').type === 'link_list', 'native font picker, logo size sliders and a link_list menu');
  const js = L.read('shopify/assets/live-header.js');
  ok(/customElements\.define\('announcement-rotator-v2'/.test(js) && /storelib:settings-change/.test(js) && !/fetch\(|localStorage/.test(js), 'the controller defines the rotator and listens for live edits, no fetch or storage');
}
if (!L.Liquid) { console.log(`${checks} header round 5 checks passed (render skipped: set LIQUIDJS=<path to liquidjs>)`); process.exit(0); }

/* ---------- the test page ---------- */
const coll = t => ({title: t, url: '/collections/' + t.toLowerCase(), handle: t.toLowerCase(), featured_image: L.img(t, 600, 800), image: L.img(t, 600, 800), products_count: 4, all_products_count: 4, products: [PANTS, OTHER]});
const MENU = {handle: 'main-menu', title: 'Main menu', links: [
  L.L('Home', '/'),
  L.L('Shop', '/collections/all', [L.L('Shop Layouts', '/collections/all', [L.L('Grid [new]', '/l/grid'), L.L('List [hot]', '/l/list')]), L.L('Shop Pages', '/collections/all', [L.L('Filters', '/l/filters'), L.L('Gifts [custom_1]', '/l/gifts'), L.L('Trends [custom_2]', '/l/trends'), L.L('Loved [popular]', '/l/loved')])]),
  L.L('Products', '/collections/all', [L.L('New', '/c/new')]),
  L.L('Collections', '/collections', [L.L('Coats', '/c/coats')]),
  L.L('Brands', '/pages/brands', [L.L('One', '/b/one')]),
  L.L('Journal', '/blogs/news', [L.L('Stories', '/b/stories')]),
  L.L('Pages', '/pages', [L.L('About us', '/pages/about'), L.L('FAQ [sale]', '/pages/faq')]),
  L.L('Buy Theme!', '/pages/buy'),
]};
const group = L.savedGroup().sections.header;
const saved = id => ({...group.blocks[id].settings});
const BLOCKS = [
  {id: 'pill', type: 'pill_glass', settings: {...saved('pill_glass_organize'), header_pill_enable: true, glass_enabled: true, glass_text_enable: true, header_pill_blur: true, header_pill_mobile: true, glass_border: true, header_pill_border_width: 2}},
  {id: 'badges', type: 'menu_badges', settings: saved('menu_badges_qmWfdR')},
  {id: 'mbanner', type: 'menu_mobile_banner', settings: {...saved('block-mvnnx2f7-1-jta9o'), text: 'Shop', body: 'Coats and knitwear.', button_link: '/collections/winter', image: L.img('promo', 800, 500)}},
  {id: 'promo', type: 'menu_promotion', settings: {...saved('block-mvnnz3jy-2-oyn6k'), text: 'Shop', promotion_image_1: L.img('one'), promotion_image_2: L.img('two'), promotion_label_2: 'Bags', promotion_link_2: '/collections/bags', item_label: 'new'}},
  {id: 'prod', type: 'menu_product', settings: {text: 'Products', product_1: PANTS, product_2: OTHER, show_price: true, product_menu_column: 2, product_width: 40, mega_custom_width: 1000, item_label: 'hot'}},
  {id: 'coll', type: 'menu_collection', settings: {text: 'Collections', collection_1: coll('Coats'), collection_2: coll('Bags'), collection_menu_column: 2, collection_width: 50, mega_custom_width: 900, item_label: 'sale'}},
  {id: 'conly', type: 'menu_collections_only', settings: {text: 'Brands', collection_list: [coll('One'), coll('Two'), coll('Three')], columns: 3, show_titles: true, image_ratio: 'square', mega_custom_width: 900}},
  {id: 'cats', type: 'menu_categories', settings: {text: 'Journal', heading: 'Browse', collection_list: [coll('Shirts'), coll('Hats')], show_links: true, layout: 'grid', columns: 3, image_style: 'circle', image_size: 64, show_count: true, count_label: 'items', view_all_label: 'Shop all', view_all_url: '/collections/all', banner_image: L.img('cat'), banner_heading: 'New in', banner_button: 'Shop', banner_link: '/collections/new', mega_custom_width: 1000}},
  {id: 'lstyle', type: 'menu_link_style', settings: {text: 'Buy Theme!', item_label: 'popular', link_color: '#2f6fdb', link_hover_color: '#e03131'}},
  /* the builder's Header button, as saved (a theme Primary button before the icons, shown in the phone row), with the schema default the saved block leaves out */
  {id: 'cta', type: 'header_button', settings: {mobile_bar_full_width: true, ...saved('header_button-1793700593404-rjjsl')}},
];
const ctxValues = {collection: coll('Changed'), collections: [coll('Changed'), coll('Other')], product: {...OTHER, title: 'Changed product'}};
const clone = v => JSON.parse(JSON.stringify(v));
/* the floating pill and glass place and paint the bar themselves; they are redraw only, so the rest is measured without them */
const NOPILL = clone(BLOCKS); NOPILL[0].settings.header_pill_enable = false; NOPILL[0].settings.glass_enabled = false;

(async () => {
  const {chromium} = require('playwright');
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  try {
    const opts = {menu: MENU, headerBlocks: BLOCKS, noBar: true};
    const page = async (width, more = {}) => {
      const r = await L.renderPage({...opts, ...more});
      const o = await L.open(browser, {...opts, ...more}, width);
      return {...o, r};
    };
    const schemes = Object.entries(JSON.parse(L.read('config/settings.json')).shopify.color_schemes).map(([id, v]) => ({id, settings: v.settings}));
    const SEL = '#shopify-section-header';
    /* section settings as the page renders them */
    const sectionBase = r => clone({...r.hctx.section.settings, mega_menu: MENU});
    const fix = s => { s.mega_menu = MENU; if (typeof s.color_scheme === 'string') s.color_scheme = schemes.find(x => x.id === s.color_scheme) || schemes[0]; return s; };
    const draw = async (p, r, settings, blocks) => L.redraw(p, 'header', await r.render('header', fix(clone(settings)), blocks || BLOCKS));
    const resolve = (en, list) => { const out = {}; for (const [k, v] of Object.entries(en || {})) { if (typeof v === 'string' && v.startsWith('__other__:')) { const s = list.find(x => x.id === k); out[k] = s.options.find(o => o.value !== v.slice(10)).value; } else out[k] = v; } return out; };

    /* ---------- 2. every control after a redraw ---------- */
    /* every setting at 1366; a setting that shows only on phones is measured again at 375 */
    const sweepSection = async (width, only) => {
      const {p, ctx, r} = await page(width);
      const base = sectionBase(r);
      const sigs = new Map();
      /* the floating pill places the bar itself (margins, width), so the section's own settings are swept without it */
      /* a hover setting is measured with the pointer over the bar */
      const point = async id => p.mouse.move(/hover/.test(id) ? 300 : 5, /hover/.test(id) ? 40 : 880);
      const baseSig = async (en, id) => { const key = JSON.stringify(en) + /hover/.test(id); if (!sigs.has(key)) { await draw(p, r, {...base, ...en}, NOPILL); await point(id); sigs.set(key, await L.signature(p, SEL)); } return sigs.get(key); };
      const missed = [];
      for (const s of hs.settings) {
        if (!s.id || s.hidden || (only && !only.includes(s.id))) continue;
        const en0 = L.enabling(s);
        if (en0 === null) continue;
        const en = resolve(en0, hs.settings);
        const a = await baseSig(en, s.id);
        const v = L.changed(s, {...base, ...en}[s.id], {...ctxValues, schemes});
        await draw(p, r, {...base, ...en, [s.id]: v}, NOPILL);
        await point(s.id);
        const b = await L.signature(p, SEL);
        if (!L.diff(a, b).length) missed.push(s.id);
        else checks++;
      }
      await ctx.close();
      return missed;
    };
    const part = name => !process.env.PART || process.env.PART.split(',').includes(name);
    if (part('sweep')) {
      const late = await sweepSection(1366);
      const missed = late.length ? await sweepSection(375, late) : [];
      assert.deepEqual(missed, [], 'section settings with no effect after a redraw: ' + missed.join(', '));
    }
    const sweepBlocks = async (width, only) => {
      const {p, ctx, r} = await page(width);
      const base = sectionBase(r);
      const bmissed = [];
      for (const bt of hs.blocks) {
        const idx = BLOCKS.findIndex(b => b.type === bt.type);
        for (const s of bt.settings) {
          if (!s.id || s.hidden || (only && !only.includes(bt.type + '.' + s.id))) continue;
          const en0 = L.enabling(s, 'block');
          if (en0 === null) continue;
          const en = resolve(en0, bt.settings);
          const blocksA = clone(BLOCKS); Object.assign(blocksA[idx].settings, en);
          if (bt.type === 'menu_categories' && s.id === 'show_links') { /* the Journal link has a sub link either way */ }
          await draw(p, r, base, restore(blocksA));
          const a = await L.signature(p, SEL);
          const blocksB = clone(blocksA); blocksB[idx].settings[s.id] = L.changed(s, blocksA[idx].settings[s.id], {...ctxValues, schemes});
          await draw(p, r, base, restore(blocksB));
          const b = await L.signature(p, SEL);
          let moved = L.diff(a, b).length > 0;
          if (!moved && bt.type === 'pill_glass') {
            /* the pill is the homepage's; glass alone is every other page's bar (the pill never draws a shadow) */
            const offA = clone(blocksA), offB = clone(blocksB); offA[idx].settings.header_pill_enable = false; offB[idx].settings.header_pill_enable = false;
            await draw(p, r, base, offA); const a2 = await L.signature(p, SEL);
            await draw(p, r, base, offB); moved = L.diff(a2, await L.signature(p, SEL)).length > 0;
          }
          if (!moved) bmissed.push(bt.type + '.' + s.id);
          else checks++;
        }
      }
      await ctx.close();
      return bmissed;
    };
    if (part('sweep')) {
      const late = await sweepBlocks(1366);
      const bmissed = late.length ? await sweepBlocks(375, late) : [];
      assert.deepEqual(bmissed, [], 'block settings with no effect after a redraw: ' + bmissed.join(', '));
    }

    /* ---------- 3. live equals redraw ---------- */
    const LIVE = {
      logo_width_desktop: 160, logo_width_mobile: 60, logo_position: 'center', separator_line: 'unset', header_height: 90, header_height_mobile: 56, section_width: 'container',
      menu_hover_style: 'color', menu_hover_color: '#2f6fdb', dropdowns_animation: 'fade-in', dropdowns_speed: 250, dropdowns_smoothness: 10, dropdown_width: 300, dropdown_padding: 30,
      dropdown_link_spacing: 12, dropdown_radius: 14, dropdown_shadow: 'strong', mega_column_gap: 50, mega_column_dividers: true, mega_card_radius: 18, mega_card_label: 'pill',
      mega_card_label_bg: '#ffe066', mega_card_label_color: '#222222', uppercase_first: true, sticky_header_type: 'on-scroll-up', sticky_header_mobile: false,
      menu_mobile_color: '#111111', menu_mobile_background: '#ffe066', menu_mobile_dividers: false, menu_mobile_chevrons: true,
      enable_custom_fonts: true, disable_white_fill_on_hover: true,
      menu_link_spacing: 40, icon_spacing: 30, icon_spacing_mobile: 20, logo_custom_position: true, logo_position_mobile: 'left', logo_gap_mobile: 24,
    };
    /* values seen only on hover, while scrolling or with another value set: checked for equality, not for a visible change at rest */
    const QUIET = ['menu_hover_style', 'sticky_header_type', 'sticky_header_mobile', 'disable_white_fill_on_hover', 'badges.badge_hover', 'cta.new_tab'];
    const MARGINS = {section_margin_top_desktop: 20, section_margin_bottom_desktop: 30, section_margin_top_mobile: 10, section_margin_bottom_mobile: 12};
    const LIVE_ON = {enable_custom_fonts: true};
    const LIVE_DEP = {menu_custom_font: {family: 'Georgia', fallback_families: 'serif'}, menu_font_size: 19, menu_font_weight: '700'};
    const TRANS = {transparent_text_icon_color: '#ff00aa', transparent_hover_fill_color: '#00ffaa'};
    /* values that act only with another one on: the actions as text, Custom logo position */
    const ACT_ON = {actions_as_text: true}, ACT = {action_text_size: 19, action_text_weight: '700', uppercase_first: true};
    const NUDGE_ON = {logo_custom_position: true}, NUDGE = {logo_offset_x: 40, logo_offset_x_mobile: 20};
    const BLIVE = {
      badges: {menu_badge_style: 'solid', badge_shape: 'pill', badge_font: 'heading', badge_case: 'none', badge_size: 13, badge_border: 2, badge_position: 'inline', badge_hover: false, hot: 'Hot now', new: 'Fresh', sale: 'Deal', popular: 'Loved', label_color_hot: '#111111', label_background_hot: '#ffe066', label_color_new: '#222222', label_background_new: '#a5d8ff', label_color_sale: '#333333', label_background_sale: '#ffc9c9', label_color_popular: '#444444', label_background_popular: '#d3f9d8'},
      lstyle: {link_color: '#d21f3c', link_hover_color: '#0b7285'},
      mbanner: {banner_bg: '#fff3bf', banner_text: '#212529', button_bg: '#d21f3c', button_color: '#ffffff', radius: 4, label: 'Just in', heading: 'Winter edit', body: 'Coats\nand scarves', button_label: 'See the edit', button_link: '/collections/scarves'},
      promo: {mega_custom_width: 760}, prod: {mega_custom_width: 700}, coll: {mega_custom_width: 640}, conly: {mega_custom_width: 600}, cats: {mega_custom_width: 820},
      cta: {button_text: 'Shop the edit', button_link: '/collections/new', new_tab: true, button_gap: 40, button_gap_mobile: 24, button_offset_x: -20, button_offset_y: 4, mobile_size: 'small', mobile_hide_icons: 'account_wishlist_search'},
    };
    const optionOk = (bt, id, v) => { const s = hs.blocks.find(b => b.type === bt).settings.find(x => x.id === id); return !s.options || s.options.some(o => o.value === v); };
    for (const [bid, set] of Object.entries(BLIVE)) for (const [k, v] of Object.entries(set)) assert(optionOk(BLOCKS.find(b => b.id === bid).type, k, v), `test value ${bid}.${k}=${v} is an option`);
    for (const width of part('live') ? [1366, 375] : []) {
      const {p, ctx, r, errors} = await page(width, {headerBlocks: NOPILL});
      const settle = () => width < 1025 ? p.waitForTimeout(500) : null;
      const base = sectionBase(r);
      const one = async (label, settings0, change, blockChange) => {
        /* a link changes an address, not a look: read the attributes too */
        const full = /(^|\.)button_link$/.test(label);
        await draw(p, r, settings0, NOPILL);
        const before = await L.signature(p, SEL, full);
        const bid = blockChange && blockChange[0];
        await L.emit(p, bid ? {section: 'header', block: bid, settings: blockChange[1], live: true} : {section: 'header', settings: change, live: true});
        await settle();
        const live = await L.signature(p, SEL, full);
        let blocks = NOPILL;
        if (bid) { blocks = clone(NOPILL); Object.assign(blocks.find(b => b.id === bid).settings, blockChange[1]); }
        await draw(p, r, bid ? settings0 : {...settings0, ...change}, restore(blocks));
        await settle();
        const after = await L.signature(p, SEL, full);
        const d = L.diff(live, after);
        ok(d.length === 0, `${width} live ${label} equals the redraw\n` + L.explain(d));
        return L.diff(before, live).length;
      };
      const flat = [];
      for (const [k, v] of Object.entries(LIVE)) {
        const changedCount = await one(k, base, {[k]: v});
        if (!changedCount) flat.push(k);
      }
      for (const [k, v] of Object.entries(MARGINS)) { const n = await one(k + ' (reset off)', {...base, reset_spacing: false}, {[k]: v}); if (!n && (width > 1024) === !/mobile/.test(k)) flat.push(k); }
      { const n = await one('reset_spacing off (margins set)', {...base, ...MARGINS}, {reset_spacing: false}); if (!n) flat.push('reset_spacing'); }
      await one('reset_spacing on (margins set)', {...base, ...MARGINS, reset_spacing: false}, {reset_spacing: true});
      for (const [k, v] of Object.entries(LIVE_DEP)) { const n = await one(k + ' (font on)', {...base, ...LIVE_ON}, {[k]: v}); if (!n) flat.push(k); }
      await one('font off', {...base, ...LIVE_ON, ...LIVE_DEP}, {enable_custom_fonts: false});
      for (const [k, v] of Object.entries(ACT)) { const n = await one(k + ' (actions as text)', {...base, ...ACT_ON}, {[k]: v}); if (!n && width > 1024) flat.push(k); }
      for (const [k, v] of Object.entries(NUDGE)) { const n = await one(k + ' (custom logo position)', {...base, ...NUDGE_ON}, {[k]: v}); if (!n && (width > 1024) === !/mobile/.test(k)) flat.push(k); }
      await one('logo_custom_position off (offsets set)', {...base, ...NUDGE_ON, ...NUDGE}, {logo_custom_position: false});
      for (const [k, v] of Object.entries(TRANS)) { const n = await one(k + ' (transparent)', {...base, transparent_header: true, transparent_on_mobile: true}, {[k]: v}); if (!n) flat.push(k); }
      for (const [bid, set] of Object.entries(BLIVE)) for (const [k, v] of Object.entries(set)) { const n = await one(bid + '.' + k, base, null, [bid, {[k]: v}]); if (!n && !(width === 1366 && bid === 'mbanner')) flat.push(bid + '.' + k); }
      /* a whole drag in one emit: many values at once, one frame */
      await one('several at once', base, {logo_width_desktop: 100, menu_hover_color: '#123456', dropdown_shadow: 'none', uppercase_first: true, menu_mobile_background: '#e9ecef'});
      if (width === 1366) {
        const desk = flat.filter(k => !QUIET.includes(k) && (!/mobile|mbanner|chevrons|dividers/.test(k) || k === 'mega_column_dividers'));
        assert.deepEqual(desk, [], `${width}: live values that changed nothing: ${desk.join(', ')}`);
      } else {
        const mob = flat.filter(k => /logo_width_mobile|menu_mobile|mbanner/.test(k));
        assert.deepEqual(mob, [], `${width}: phone values that changed nothing live: ${mob.join(', ')}`);
      }
      /* the actions: off hides at once, the redraw leaves them out (each drawn on first: the saved header has the country and language pickers off) */
      for (const [k, sel] of [['show_search', '.header_search'], ['show_account_icon', '.header_account'], ['show_wishlist_icon', '.header__wishlist'], ['show_shopping_cart', '.minicart'], ['show_currency', 'localization-form:has(input[name="country_code"])'], ['show_language', 'localization-form:has(input[name="language_code"])']]) {
        await draw(p, r, {...base, [k]: true});
        await L.emit(p, {section: 'header', settings: {[k]: false}, live: true});
        const live = await p.evaluate(s => { const el = document.querySelector('#shopify-section-header .header__action ' + s); return el && getComputedStyle(el).display; }, sel);
        await draw(p, r, {...base, [k]: false});
        const gone = await p.evaluate(s => !document.querySelector('#shopify-section-header .header__action ' + s), sel);
        ok(live === 'none' && gone, `${width} ${k} off: hidden live, left out after the redraw`);
      }
      /* sticky: the controller follows the attribute */
      await draw(p, r, base);
      await L.emit(p, {section: 'header', settings: {sticky_header_type: 'none'}, live: true});
      ok(await p.evaluate(() => document.querySelector('header.header').dataset.sticky === 'none'), `${width} Sticky header off reaches the sticky controller`);
      ok(JSON.stringify(errors.filter(e => !/Unexpected token/.test(e))) === '[]', `${width} no new page errors: ${errors.join('; ')}`);
      await ctx.close();
    }

    /* ---------- 4. Menu font under the theme priority ---------- */
    for (const width of part('font') ? [1366, 375] : []) {
      const {p, ctx, r} = await page(width);
      const base = sectionBase(r);
      const read = () => p.evaluate(() => {
        const top = [...document.querySelectorAll('#shopify-section-header .navigation' + (innerWidth > 1024 ? ':not(.mobile)' : '.mobile') + ' .horizontal-list > .level0 > menu-item > a')].find(a => a.textContent.includes('Pages'));
        const sub = top.closest('li').querySelector('.submenu a.menu_item-link');
        const c = getComputedStyle(top), cs = getComputedStyle(sub), span = getComputedStyle(top.querySelector('span'));
        return {font: c.fontFamily, size: c.fontSize, weight: c.fontWeight, span: span.fontFamily + '|' + span.fontSize + '|' + span.fontWeight, sub: cs.fontFamily, root: getComputedStyle(document.documentElement).getPropertyValue('--menu-font').trim(), prio: document.documentElement.getAttribute('data-font-priority')};
      });
      await draw(p, r, base);
      const theme = await read();
      ok(!/Georgia/.test(theme.font) && theme.prio !== 'off', `${width} theme menu font by default (${theme.font})`);
      const on = {...base, enable_custom_fonts: true, menu_custom_font: {family: 'Georgia', fallback_families: 'serif'}, menu_font_size: 21, menu_font_weight: '700'};
      await draw(p, r, on);
      const red = await read();
      ok(/^Georgia/.test(red.font) && /^Georgia/.test(red.sub) && red.size === '21px' && red.weight === '700', `${width} redraw: custom font, size and weight win under the theme priority (${JSON.stringify(red)})`);
      ok(/^Georgia[^|]*\|21px\|700$/.test(red.span), `${width} redraw: the link's text span follows (${red.span})`);
      await draw(p, r, base);
      await L.emit(p, {section: 'header', settings: {enable_custom_fonts: true, menu_custom_font: {family: 'Georgia', fallback_families: 'serif'}, menu_font_size: 21, menu_font_weight: '700'}, live: true});
      const lv = await read();
      ok(JSON.stringify(lv) === JSON.stringify(red), `${width} live: the same as the redraw (${JSON.stringify(lv)})`);
      await L.emit(p, {section: 'header', settings: {enable_custom_fonts: false}, live: true});
      ok(JSON.stringify(await read()) === JSON.stringify(theme), `${width} live off: theme font, size and weight back`);
      await draw(p, r, {...on, enable_custom_fonts: false});
      ok(JSON.stringify(await read()) === JSON.stringify(theme), `${width} redraw off: theme font, size and weight back`);
      await ctx.close();
    }

    /* ---------- 5. logo, phone targets, keyboard, redraw ---------- */
    if (part('a11y')) {
      /* the Header button kept to desktop here: in the phone pill beside it the logo has no room to grow, and shrinks with its column */
      const A11Y = clone(BLOCKS).map(b => b.type === 'header_button' ? {...b, settings: {...b.settings, show_on_mobile: false}} : b);
      const {p, ctx, r} = await page(375, {headerBlocks: A11Y});
      const base = sectionBase(r);
      await draw(p, r, base, A11Y);
      const logo = () => p.evaluate(() => Math.max(...[...document.querySelectorAll('#shopify-section-header .header__logo img, #shopify-section-header .header__logo svg')].map(e => Math.round(e.getBoundingClientRect().width))));
      const w0 = await logo();
      await L.emit(p, {section: 'header', settings: {logo_width_mobile: 120}, live: true});
      const w1 = await logo();
      ok(w0 !== w1 && Math.abs(w1 - Math.min(120, 375 * 0.42)) <= 2, `375 Logo size (phones) live: ${w0} -> ${w1}`);
      const sizes = await p.evaluate(() => [...document.querySelectorAll('#shopify-section-header .header__action a, #shopify-section-header .header__action button, #shopify-section-header button.nav-toggle')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden').map(e => [e.className.slice(0, 40), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
      ok(sizes.length >= 3 && sizes.every(([, w, h]) => w >= 44 && h >= 44), `375 header targets are at least 44px (${JSON.stringify(sizes)})`);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= 376), '375 no sideways scroll');
      const t = p.locator('#shopify-section-header button.nav-toggle');
      ok(await t.getAttribute('aria-expanded') === 'false', 'menu button says it is closed');
      await t.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
      ok(await t.getAttribute('aria-expanded') === 'true' && await p.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-header .navigation.mobile')).visibility === 'visible'), 'Enter on the menu button opens the drawer and says so');
      await p.keyboard.press('Escape'); await p.waitForTimeout(700);
      ok(await t.getAttribute('aria-expanded') === 'false', 'Escape closes the drawer');
      /* a redraw binds once: one tap opens */
      await draw(p, r, base, A11Y);
      await p.locator('#shopify-section-header button.nav-toggle').click(); await p.waitForTimeout(700);
      ok(await p.locator('#shopify-section-header button.nav-toggle').getAttribute('aria-expanded') === 'true', 'after a redraw one tap opens the drawer (no double binding)');
      await ctx.close();
    }
    if (part('a11y')) {
      const {p, ctx} = await page(1366);
      await p.keyboard.press('Tab');
      for (let i = 0; i < 12; i++) { if (await p.evaluate(() => document.activeElement.closest('.level0.menu-parent') && document.activeElement.matches('.navigation:not(.mobile) .level0 > menu-item > a'))) break; await p.keyboard.press('Tab'); }
      const k = await p.evaluate(() => ({ok: !!document.activeElement.closest('.navigation:not(.mobile) .level0.menu-parent'), exp: document.activeElement.getAttribute('aria-expanded'), ring: getComputedStyle(document.activeElement).outlineStyle}));
      ok(k.ok, '1366 a top-level link with a dropdown is reachable with Tab');
      ok(k.exp === 'true' || k.exp === 'false', `1366 it says whether its dropdown is open (${k.exp})`);
      await ctx.close();
    }
  } finally { await browser.close(); }
  console.log(`${checks} header round 5 checks passed (schema, every control after a redraw, live equals redraw at 1366 and 375, menu font priority, logo, targets, keyboard)`);
})().catch(e => { console.error(e); process.exit(1); });

/* JSON clones lose nothing here except the product objects' functions (none). */
function restore(list) { return list; }
