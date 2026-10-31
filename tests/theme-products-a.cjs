/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-products-a.cjs
   Products group products-a: Featured product, Product Info Box and Product
   information tabs, rendered with liquidjs and drawn in Chromium through
   tests/media-fixture.cjs, with shopify/assets/live-products-a.js.

   For each section, at 375 and 1366, in the builder and on the storefront:
   schema (colour scheme first, unique ids, visible_if), theme inheritance
   (scheme colours, theme fonts), colour scheme switch live and after a
   redraw, custom colours and fonts on and off, every visible setting and
   block setting changing its own element (live where it is applied live,
   and after a redraw), desktop and mobile values at their width, choices
   that look different from each other, two instances kept apart, a block
   added and redrawn, no duplicate listeners after redraws, no picture
   reload for an unrelated edit, first paint equal to the hydrated paint,
   reduced motion, keyboard tabs, no sideways scroll and no errors. */
const assert = require('node:assert/strict');
const {launch, mount, schemaOf, schemaProblems, PANTS, OTHER} = require('./media-fixture.cjs');

let pass = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); pass++; };
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); pass++; };
const ne = (a, b, msg) => { assert.notDeepEqual(a, b, msg); pass++; };
const ASSETS = ['live-products-a.js', 'main-product.css', 'product-page-ui.css'];
const def = list => Object.fromEntries((list || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
const visible = list => (list || []).filter(x => x.id && !x.hidden).map(x => x.id);
const BG = 'rgb(24, 32, 40)', WHITE = 'rgb(255, 255, 255)', TEXT = 'rgb(204, 204, 204)', ALT_BG = 'rgb(250, 250, 250)', ALT_TEXT = 'rgb(51, 51, 51)';
const RED = '#aa0000', RED_RGB = 'rgb(170, 0, 0)', GREEN = '#00aa00', GREEN_RGB = 'rgb(0, 170, 0)';
const IMG = {src: '/img/card.png', url: '/img/card.png', width: 60, height: 40, aspect_ratio: 1.5, alt: 'Store card'};

/* ---------- small page helpers ---------- */
const cs = (t, sel, prop, uid = 'test') => t.page.evaluate(([sel, prop, uid]) => { const el = document.querySelector('#shopify-section-' + uid + (sel ? ' ' + sel : '')); return el ? getComputedStyle(el)[prop] : null; }, [sel, prop, uid]);
const attr = (t, sel, name, uid = 'test') => t.page.evaluate(([sel, name, uid]) => { const el = document.querySelector('#shopify-section-' + uid + ' ' + sel); return el ? el.getAttribute(name) : 'missing'; }, [sel, name, uid]);
const text = (t, sel, uid = 'test') => t.page.evaluate(([sel, uid]) => { const el = document.querySelector('#shopify-section-' + uid + ' ' + sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : 'missing'; }, [sel, uid]);
const rect = (t, sel, uid = 'test') => t.page.evaluate(([sel, uid]) => { const el = document.querySelector('#shopify-section-' + uid + ' ' + sel); if (!el) return null; const r = el.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; }, [sel, uid]);
const shown = (t, sel, uid = 'test') => t.page.evaluate(([sel, uid]) => { const el = document.querySelector('#shopify-section-' + uid + ' ' + sel); return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }, [sel, uid]);
const count = (t, sel, uid = 'test') => t.page.evaluate(([sel, uid]) => document.querySelectorAll('#shopify-section-' + uid + ' ' + sel).length, [sel, uid]);
const audit = t => t.page.evaluate(() => [...document.querySelectorAll('[data-pa-root]')].flatMap(r => window.MateriaProductsA ? window.MateriaProductsA.audit(r) : []));
/* A probe that only shows a rule's effect when the element exists: a test element is added inside the root. */
const injected = (cls, rootSel) => async t => t.page.evaluate(([cls, rootSel]) => { const root = document.querySelector('#shopify-section-test ' + rootSel); let el = root.querySelector('[data-probe="' + cls + '"]'); if (!el) { el = document.createElement('div'); el.className = cls; el.dataset.probe = cls; el.textContent = 'x'; root.append(el); } return getComputedStyle(el).display; }, [cls, rootSel]);

/* Redraw a section to exactly these settings and blocks (schema defaults + preset + given). */
function baseOf(name, settings = {}) { const {schema} = schemaOf(name); return {...Object.fromEntries(schema.settings.filter(x => x.id).map(x => [x.id, null])), ...def(schema.settings), ...((schema.presets || [])[0] || {}).settings, ...settings}; }
function blocksOf(name, list) { const {schema} = schemaOf(name); return (list || schema.presets[0].blocks).map(b => ({type: b.type, settings: {...def((schema.blocks.find(x => x.type === b.type) || {}).settings), ...(b.settings || {})}})); }
async function to(t, name, settings, blocks) { await t.redraw({settings: baseOf(name, settings), blocks: blocksOf(name, blocks)}); }

/* Every visible setting: changed live (when applied live) and after a redraw, its probe changes. */
async function probeAll(name, specs, {width, editing, globals = {}, base = {}, blocks, margin}) {
  const t = await mount(BROWSER, name, {width, editing, assets: ASSETS, globals, settings: base, blocks});
  /* Remove space between sections needs another rule's margin to remove: 17px stands in for the theme's. */
  if (margin) await t.page.addStyleTag({content: '#shopify-section-test { margin-top: 17px; }'});
  await t.page.addStyleTag({content: '*, *::before, *::after { transition: none !important; }'}); /* probes read end states */
  for (const [id, sp] of Object.entries(specs)) {
    if ((sp.width || 1366) !== width) continue;
    const settings = {...base, ...(sp.base || {})};
    await to(t, name, settings, blocks);
    const before = await sp.p(t);
    if (sp.live) {
      await t.emit({[id]: sp.v});
      const after = await sp.p(t);
      ne(after, before, `${name} ${width}: ${id} live changes its element (${JSON.stringify(before)})`);
      if (sp.want !== undefined) eq(after, sp.want, `${name} ${width}: ${id} live value`);
    }
    await to(t, name, {...settings, [id]: sp.v}, blocks);
    const drawn = await sp.p(t);
    ne(drawn, before, `${name} ${width}: ${id} after a redraw changes its element`);
    if (sp.want !== undefined) eq(drawn, sp.want, `${name} ${width}: ${id} drawn value`);
  }
  eq(t.errors, [], `${name} ${width}: no errors while probing settings`);
  await t.page.close();
}
/* The same for block settings: specs[type][id]. */
async function probeBlocks(name, specs, {width, editing, globals = {}, base = {}}) {
  const t = await mount(BROWSER, name, {width, editing, assets: ASSETS, globals, settings: base});
  await t.page.addStyleTag({content: '*, *::before, *::after { transition: none !important; }'});
  const {schema} = schemaOf(name);
  for (const [type, list] of Object.entries(specs)) {
    for (const [id, sp] of Object.entries(list)) {
      const blocks = [{type, settings: sp.base || {}}];
      await to(t, name, base, blocks);
      const before = await sp.p(t);
      if (sp.live) {
        await t.emit({[id]: sp.v}, t.blockId(type));
        const after = await sp.p(t);
        ne(after, before, `${name} ${width}: block ${type}.${id} live changes its element`);
      }
      await to(t, name, base, [{type, settings: {...(sp.base || {}), [id]: sp.v}}]);
      ne(await sp.p(t), before, `${name} ${width}: block ${type}.${id} after a redraw changes its element`);
    }
    const block = schema.blocks.find(b => b.type === type);
    for (const id of visible(block.settings)) ok(list[id], `${name}: block ${type}.${id} has a probe`);
  }
  eq(t.errors, [], `${name} ${width}: no errors while probing blocks`);
  await t.page.close();
}

/* ---------------------------------------------------------------- specs */
const FP = 'featured-product', PIB = 'product-info-box', PIT = 'product-information-tab';
const fpRoot = '.sec__featured-product';
const wrapCss = prop => t => t.page.evaluate(p => getComputedStyle(document.getElementById('shopify-section-test'))[p], prop);
const gallery = t => attr(t, 'media-gallery', 'data-mt-gallery-config');
const FP_BASE = {product: PANTS, reset_spacing: false};
const FP_SPECS = {
  color_scheme: {v: 'alt-scheme', live: true, p: t => cs(t, fpRoot, 'backgroundColor'), want: ALT_BG},
  section_width: {v: 'container', live: true, p: t => cs(t, '.featured-product__content', 'maxWidth')},
  reset_spacing: {v: true, base: {section_margin_top_desktop: 24}, p: wrapCss('marginTop'), want: '0px'},
  product: {v: OTHER, p: t => text(t, '.product-detail__title')},
  show_view_link: {v: true, live: true, p: t => shown(t, '.pdp-view-link'), want: true},
  view_link_label: {v: 'See every detail', live: true, base: {show_view_link: true}, p: t => text(t, '.pdp-view-link'), want: 'See every detail'},
  desktop_layout: {v: 'grid_2_column', p: gallery},
  desktop_media_width: {v: 65, live: true, p: t => rect(t, '.product-detail__media').then(r => r.w)},
  desktop_main_image_position: {v: 'right', live: true, p: async t => (await rect(t, '.product-detail__media')).x < (await rect(t, '.product-detail__information')).x, want: false},
  center: {v: true, live: true, p: t => cs(t, '.product-detail__information', 'textAlign'), want: 'center'},
  show_thumbnails: {v: false, live: true, p: t => cs(t, '.thumbnail-slide', 'display'), want: 'none'},
  enable_size_chart: {v: false, live: true, p: injected('scp', fpRoot), want: 'none'},
  enable_dynamic_checkout: {v: false, live: true, p: injected('btn-checkout-dynamic', fpRoot), want: 'none'},
  enable_image_square: {v: true, p: t => attr(t, 'media-gallery', 'data-square')},
  enable_lightbox: {v: false, p: gallery},
  enable_sticky_content_on_desktop: {v: false, live: true, p: t => cs(t, '.product-detail__information > div', 'position'), want: 'static'},
  image_zoom: {v: 'inner_zoom_circle', p: gallery},
  enable_video_autoplay: {v: true, p: t => attr(t, '[data-auto-play-video]', 'data-auto-play-video')},
  enable_video_looping: {v: true, p: t => t.page.evaluate(() => { const v = document.querySelector('#shopify-section-test media-gallery video'); return v ? v.loop : 'none'; })},
  enable_video_controls: {v: false, p: t => t.page.evaluate(() => { const v = document.querySelector('#shopify-section-test media-gallery video'); return v ? v.controls : 'none'; })},
  reveal: {v: false, p: t => count(t, '[data-ti-no-reveal]')},
  padding_top: {v: 80, live: true, p: t => cs(t, fpRoot, 'paddingTop')},
  padding_bottom: {v: 80, live: true, p: t => cs(t, fpRoot, 'paddingBottom')},
  section_margin_top_desktop: {v: 30, live: true, p: wrapCss('marginTop'), want: '30px'},
  section_margin_bottom_desktop: {v: 30, live: true, p: wrapCss('marginBottom'), want: '30px'},
  mobile_options: {v: 'hidden_thumbnail', width: 375, p: gallery},
  mobile_slides_per_view: {v: '2', width: 375, p: t => attr(t, '[data-mobile]', 'data-mobile')},
  enable_nav_dots_mobile: {v: true, width: 375, p: t => t.page.evaluate(() => /nav-dots-row/.test(document.getElementById('shopify-section-test').innerHTML))},
  section_margin_top_mobile: {v: 30, live: true, width: 375, p: wrapCss('marginTop'), want: '30px'},
  section_margin_bottom_mobile: {v: 30, live: true, width: 375, p: wrapCss('marginBottom'), want: '30px'},
};
const PIB_SPECS = {
  color_scheme: {v: 'alt-scheme', live: true, p: t => cs(t, '.pib__inner', 'backgroundColor'), want: ALT_BG},
  section_width: {v: 'container', live: true, p: t => cs(t, '.pib', 'maxWidth')},
  reset_spacing: {v: false, p: wrapCss('marginTop'), want: '17px'},
  box_radius: {v: 22, live: true, p: t => cs(t, '.pib__inner', 'borderTopLeftRadius'), want: '22px'},
  row_pad_y: {v: 30, live: true, p: t => cs(t, '.pib__row--top', 'paddingTop'), want: '30px'},
  row_pad_x: {v: 30, live: true, p: t => cs(t, '.pib__row--top', 'paddingLeft'), want: '30px'},
  enable_custom_style: {v: true, live: true, base: {box_bg: RED}, p: t => cs(t, '.pib__inner', 'backgroundColor'), want: RED_RGB},
  box_bg: {v: RED, live: true, base: {enable_custom_style: true}, p: t => cs(t, '.pib__inner', 'backgroundColor'), want: RED_RGB},
  border_color: {v: RED, live: true, base: {enable_custom_style: true}, p: t => cs(t, '.pib__inner', 'borderTopColor'), want: RED_RGB},
  text_color: {v: RED, live: true, base: {enable_custom_style: true}, p: t => cs(t, '.pib__top-text', 'color'), want: RED_RGB},
  muted_color: {v: RED, live: true, base: {enable_custom_style: true}, p: t => cs(t, '.pib__answer', 'color'), want: RED_RGB},
  enable_custom_fonts: {v: true, live: true, base: {body_font: {family: 'Courier New', fallback_families: 'monospace'}}, p: t => cs(t, '.pib__top-text', 'fontFamily'), want: '"Courier New", monospace'},
  body_font: {v: {family: 'Verdana', fallback_families: 'sans-serif'}, live: true, base: {enable_custom_fonts: true}, p: t => cs(t, '.pib__top-text', 'fontFamily'), want: 'Verdana, sans-serif'},
  message_size: {v: 20, live: true, p: t => cs(t, '.pib__top-text', 'fontSize'), want: '20px'},
  title_size: {v: 20, live: true, p: t => cs(t, '.pib__summary', 'fontSize'), want: '20px'},
  body_size: {v: 18, live: true, p: t => cs(t, '.pib__answer', 'fontSize'), want: '18px'},
  margin_top: {v: 30, live: true, p: t => cs(t, '.pib', 'paddingTop'), want: '30px'},
  margin_bottom: {v: 30, live: true, p: t => cs(t, '.pib', 'paddingBottom'), want: '30px'},
};
const manual = {use_shop_methods: false};
const PIB_BLOCKS = {
  top_row: {
    text: {v: '<p>Ships in <strong>two</strong> days</p>', live: true, p: t => text(t, '.pib__top-text')},
    show_icon: {v: true, live: true, p: t => shown(t, '.pib__top-icon')},
    icon: {v: 'gift', live: true, base: {show_icon: true}, p: t => attr(t, '.pib__top-icon svg', 'data-icon')},
    enable_custom_style: {v: true, live: true, base: {show_icon: true, icon_color: GREEN}, p: t => cs(t, '.pib__top-icon', 'color')},
    icon_color: {v: GREEN, live: true, base: {show_icon: true, enable_custom_style: true}, p: t => cs(t, '.pib__top-icon', 'color')},
  },
  collapsible: {
    title: {v: 'Returns', live: true, p: t => text(t, '.pib__summary-text')},
    body: {v: '<p>Thirty days to send it back.</p>', live: true, p: t => text(t, '.pib__answer')},
    open_default: {v: true, live: true, p: t => attr(t, '[data-pib-toggle]', 'aria-expanded')},
  },
  badges: {
    use_shop_methods: {v: false, base: {badge_1_type: 'visa'}, p: t => count(t, '.pib__badge')},
    badge_height: {v: 40, live: true, p: t => cs(t, '.pib__badge svg', 'height')},
    ...Object.fromEntries([1, 2, 3, 4, 5, 6].flatMap(n => [
      ['badge_' + n + '_type', {v: 'paypal', base: manual, p: t => count(t, '.pib__badge')}],
      ['badge_' + n + '_image', {v: IMG, base: manual, p: t => count(t, 'img.pib__badge')}],
    ])),
  },
};
const PIT_G = {product: PANTS, pages: {care: {content: '<p>Care page text</p>'}}};
const tabX = n => t => rect(t, `.pit__tabs > li:nth-child(${n}) .pit__tab`).then(r => r && r.x);
const PIT_SPECS = {
  color_scheme: {v: 'alt-scheme', live: true, p: t => cs(t, '.pit', 'backgroundColor'), want: ALT_BG},
  section_width: {v: 'full_width', live: true, p: t => rect(t, '[data-pit-width]').then(r => r.w)},
  reset_spacing: {v: false, p: wrapCss('marginTop'), want: '17px'},
  tab_alignment: {v: 'center', live: true, p: tabX(1)},
  enable_custom_style: {v: true, live: true, base: {tab_color: RED}, p: t => cs(t, '.pit__tabs > li:nth-child(2) .pit__tab', 'color'), want: RED_RGB},
  tab_color: {v: RED, live: true, base: {enable_custom_style: true}, p: t => cs(t, '.pit__tabs > li:nth-child(2) .pit__tab', 'color'), want: RED_RGB},
  tab_active_color: {v: RED, live: true, base: {enable_custom_style: true}, p: t => cs(t, '.pit__tabs > li:nth-child(1) .pit__tab', 'color'), want: RED_RGB},
  text_color: {v: RED, live: true, base: {enable_custom_style: true}, p: t => cs(t, '.pit__content', 'color'), want: RED_RGB},
  tab_size: {v: 22, live: true, p: t => cs(t, '.pit__tab', 'fontSize'), want: '22px'},
  reveal: {v: false, p: t => count(t, '[data-ti-no-reveal]')},
  tab_gap: {v: 90, live: true, p: tabX(2)},
  padding_top: {v: 96, live: true, p: t => cs(t, '.pit', 'paddingTop')},
  padding_bottom: {v: 96, live: true, p: t => cs(t, '.pit', 'paddingBottom')},
  tab_gap_mobile: {v: 50, live: true, width: 375, p: tabX(2)},
};
const PIT_BLOCKS = {
  description: {title: {v: 'Details', live: true, p: t => text(t, '.pit__tab')}},
  custom_tab: {
    title: {v: 'Care', live: true, p: t => text(t, '.pit__tab')},
    tab_content: {v: 'content_page', p: t => text(t, '.tab-panel')},
    content_rich: {v: '<p>Wash cold, dry flat.</p>', live: true, p: t => text(t, '.tab-panel')},
    page: {v: 'care', base: {tab_content: 'content_page'}, p: t => text(t, '.tab-panel')},
  },
};

let BROWSER;
(async () => {
  BROWSER = await launch();
  try {
    /* 1. schema */
    for (const [name, specs] of [[FP, FP_SPECS], [PIB, PIB_SPECS], [PIT, PIT_SPECS]]) {
      eq(schemaProblems(name), [], `${name}: schema problems`);
      const {schema} = schemaOf(name);
      for (const id of visible(schema.settings)) ok(specs[id], `${name}: setting ${id} has a probe`);
      const headers = schema.settings.filter(s => s.type === 'header').map(s => s.content);
      eq(headers[0], 'General', `${name}: General group first`);
      for (const s of schema.settings) for (const words of [s.label, s.info]) if (words) ok(!/—|unlock|elevate|seamless|powerful|effortless|supercharge|transform/i.test(words), `${name}: plain label ${words}`);
    }
    {
      const {schema} = schemaOf(PIT);
      ok(schema.blocks.some(b => b.type === '@app'), 'tabs keep the @app block');
      const fp = schemaOf(FP).schema;
      ok(fp.presets[0].category === 'Products', 'featured product preset in Products');
      const old = ['reset_spacing', 'color_scheme', 'product', 'enable_color_swatches', 'section_width', 'show_thumbnails', 'enable_size_chart', 'desktop_main_image_position', 'enable_image_square', 'enable_lightbox', 'enable_sticky_content_on_desktop', 'image_zoom', 'mobile_options', 'mobile_slides_per_view', 'enable_nav_dots_mobile', 'enable_video_autoplay', 'enable_video_looping', 'enable_video_controls', 'enable_dynamic_checkout', 'reveal', 'padding_top', 'padding_bottom', 'section_margin_top_desktop', 'section_margin_bottom_desktop', 'section_margin_top_mobile', 'section_margin_bottom_mobile', 'center', 'desktop_media_width', 'desktop_layout', 'show_view_link', 'view_link_label'];
      for (const id of old) ok(fp.settings.some(s => s.id === id), `featured product keeps ${id}`);
      for (const id of ['section_width', 'color_scheme', 'reset_spacing', 'box_bg', 'border_color', 'text_color', 'muted_color', 'box_radius', 'row_pad_y', 'row_pad_x', 'margin_top', 'margin_bottom']) ok(schemaOf(PIB).schema.settings.some(s => s.id === id), `info box keeps ${id}`);
    }

    /* 2-4, 13. theme inheritance, scheme switch, custom off, overflow, both modes and widths */
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const tag = `${width} ${editing ? 'builder' : 'storefront'}`;
      {
        const t = await mount(BROWSER, FP, {width, editing, assets: ASSETS, settings: {product: PANTS}});
        eq(await cs(t, fpRoot, 'backgroundColor'), BG, `featured product ${tag}: scheme background`);
        eq(await cs(t, '.product-detail__title', 'color'), WHITE, `featured product ${tag}: title in the heading colour`);
        ok(/Georgia/.test(await cs(t, '.product-detail__title', 'fontFamily')), `featured product ${tag}: title in the heading font`);
        eq(await cs(t, '.product_detail-des', 'color'), TEXT, `featured product ${tag}: text in the text colour`);
        ok(/Arial/.test(await cs(t, '.product_detail-des', 'fontFamily')), `featured product ${tag}: text in the body font`);
        eq(await audit(t), [], `featured product ${tag}: markup equals the derived outputs`);
        await t.emit({color_scheme: 'alt-scheme'});
        eq([await cs(t, fpRoot, 'backgroundColor'), await cs(t, '.product_detail-des', 'color'), await cs(t, '.product-detail__title', 'color')], [ALT_BG, ALT_TEXT, 'rgb(16, 16, 16)'], `featured product ${tag}: scheme switch live`);
        await t.redraw({settings: {color_scheme: 'alt-scheme'}});
        eq([await cs(t, fpRoot, 'backgroundColor'), await cs(t, '.product_detail-des', 'color')], [ALT_BG, ALT_TEXT], `featured product ${tag}: scheme after redraw`);
        ok(await t.noOverflow(), `featured product ${tag}: no sideways scroll`);
        eq(t.errors, [], `featured product ${tag}: no errors`);
        await t.page.close();
      }
      {
        const t = await mount(BROWSER, PIB, {width, editing, assets: ASSETS});
        eq(await cs(t, '.pib__inner', 'backgroundColor'), BG, `info box ${tag}: scheme background`);
        eq(await cs(t, '.pib__inner', 'borderTopColor'), 'rgb(68, 85, 102)', `info box ${tag}: scheme border`);
        eq(await cs(t, '.pib__top-text', 'color'), TEXT, `info box ${tag}: text colour`);
        ok(/Arial/.test(await cs(t, '.pib__summary', 'fontFamily')), `info box ${tag}: body font`);
        eq(await cs(t, '.pib__summary', 'fontWeight'), '700', `info box ${tag}: row title in the heading weight`);
        eq(await audit(t), [], `info box ${tag}: markup equals the derived outputs`);
        await t.emit({enable_custom_style: true, box_bg: RED, text_color: GREEN});
        eq([await cs(t, '.pib__inner', 'backgroundColor'), await cs(t, '.pib__top-text', 'color')], [RED_RGB, GREEN_RGB], `info box ${tag}: custom colours on`);
        await t.emit({enable_custom_style: false});
        eq([await cs(t, '.pib__inner', 'backgroundColor'), await cs(t, '.pib__top-text', 'color')], [BG, TEXT], `info box ${tag}: custom off restores the scheme`);
        await t.emit({color_scheme: 'alt-scheme'});
        eq([await cs(t, '.pib__inner', 'backgroundColor'), await cs(t, '.pib__top-text', 'color')], [ALT_BG, ALT_TEXT], `info box ${tag}: scheme switch live`);
        await t.redraw({settings: {color_scheme: 'alt-scheme', enable_custom_style: true, box_bg: RED}});
        eq(await cs(t, '.pib__inner', 'backgroundColor'), RED_RGB, `info box ${tag}: custom colour after redraw`);
        await t.redraw({settings: {enable_custom_style: false}});
        eq(await cs(t, '.pib__inner', 'backgroundColor'), ALT_BG, `info box ${tag}: scheme after redraw`);
        for (const sel of ['.pib__summary']) { const r = await rect(t, sel); ok(r.h >= 44, `info box ${tag}: ${sel} is a 44px target`); }
        ok(await t.noOverflow(), `info box ${tag}: no sideways scroll`);
        eq(t.errors, [], `info box ${tag}: no errors`);
        await t.page.close();
      }
      {
        const t = await mount(BROWSER, PIT, {width, editing, assets: ASSETS, globals: PIT_G, blocks: [{type: 'description', settings: {title: 'Description'}}, {type: 'custom_tab'}, {type: 'custom_tab', settings: {title: 'Shipping and returns'}}, {type: 'custom_tab', settings: {title: 'Materials and care'}}]});
        eq(await cs(t, '.pit', 'backgroundColor'), BG, `tabs ${tag}: scheme background`);
        eq(await cs(t, '.data.item.active .pit__tab', 'color'), WHITE, `tabs ${tag}: open tab in the heading colour`);
        eq(await cs(t, '.pit__content', 'color'), TEXT, `tabs ${tag}: text colour`);
        ok(/Arial/.test(await cs(t, '.pit__content', 'fontFamily')), `tabs ${tag}: body font`);
        eq(await audit(t), [], `tabs ${tag}: markup equals the derived outputs`);
        await t.emit({color_scheme: 'alt-scheme'});
        eq([await cs(t, '.pit', 'backgroundColor'), await cs(t, '.pit__content', 'color')], [ALT_BG, ALT_TEXT], `tabs ${tag}: scheme switch live`);
        await t.emit({enable_custom_style: true, text_color: RED});
        eq(await cs(t, '.pit__content', 'color'), RED_RGB, `tabs ${tag}: custom text colour`);
        await t.emit({enable_custom_style: false});
        eq(await cs(t, '.pit__content', 'color'), ALT_TEXT, `tabs ${tag}: custom off restores the scheme`);
        await t.redraw({settings: {color_scheme: 'alt-scheme'}});
        eq(await cs(t, '.pit', 'backgroundColor'), ALT_BG, `tabs ${tag}: scheme after redraw`);
        const r = await rect(t, '.pit__tab'); ok(r.h >= 44, `tabs ${tag}: tabs are 44px targets`);
        ok(await t.noOverflow(), `tabs ${tag}: four tabs, no sideways scroll`);
        eq(t.errors, [], `tabs ${tag}: no errors`);
        await t.page.close();
      }
    }

    /* 5-6. every control, at its width */
    for (const width of [375, 1366]) {
      await probeAll(FP, FP_SPECS, {width, editing: true, base: FP_BASE});
      await probeAll(PIB, PIB_SPECS, {width, editing: true, margin: true});
      await probeAll(PIT, PIT_SPECS, {width, editing: true, margin: true, globals: PIT_G, base: {}, blocks: [{type: 'description', settings: {title: 'Description'}}, {type: 'custom_tab'}]});
    }
    for (const width of [375, 1366]) {
      await probeBlocks(PIB, PIB_BLOCKS, {width, editing: true});
      await probeBlocks(PIT, PIT_BLOCKS, {width, editing: true, globals: PIT_G});
    }

    /* 6. desktop values wait for the desktop, mobile values for the phone */
    {
      const t = await mount(BROWSER, FP, {width: 375, assets: ASSETS, settings: FP_BASE});
      await t.emit({section_margin_top_desktop: 44});
      eq(await wrapCss('marginTop')(t), '0px', 'featured product 375: desktop margin not used on a phone');
      await t.page.setViewportSize({width: 1366, height: 900}); await t.page.waitForTimeout(80);
      eq(await wrapCss('marginTop')(t), '44px', 'featured product 1366: desktop margin used on a computer');
      const media = await rect(t, '.product-detail__media');
      await t.page.setViewportSize({width: 375, height: 900}); await t.page.waitForTimeout(80);
      await t.emit({desktop_media_width: 30});
      ok((await rect(t, '.product-detail__media')).w > 300, 'featured product 375: media full width on a phone whatever the desktop width');
      ok(media.w > 0, 'featured product: media drawn');
      await t.page.close();
    }
    {
      const t = await mount(BROWSER, PIT, {width: 375, assets: ASSETS, globals: PIT_G});
      const gap = async () => (await rect(t, '.pit__tabs > li:nth-child(2)')).x - ((await rect(t, '.pit__tabs > li:nth-child(1)')).x + (await rect(t, '.pit__tabs > li:nth-child(1)')).w);
      await t.emit({tab_gap: 90, tab_gap_mobile: 20});
      eq(await gap(), 20, 'tabs 375: the mobile gap on a phone');
      await t.page.setViewportSize({width: 1366, height: 900}); await t.page.waitForTimeout(80);
      eq(await gap(), 90, 'tabs 1366: the desktop gap on a computer');
      await t.page.close();
    }

    /* 7. choices that look different from each other */
    {
      const t = await mount(BROWSER, FP, {width: 1700, assets: ASSETS, settings: FP_BASE});
      const seen = new Set();
      for (const v of ['container', 'fluid_container', 'stretch_width', 'full_width']) { await t.emit({section_width: v}); const r = await rect(t, '.featured-product__content'); const pad = await cs(t, '.featured-product__content', 'paddingLeft'); seen.add(JSON.stringify([r.w, pad])); }
      eq(seen.size, 4, 'featured product: every section width draws differently at 1700');
      const pos = new Set();
      for (const v of ['left', 'right']) { await t.emit({desktop_main_image_position: v}); pos.add((await rect(t, '.product-detail__media')).x); }
      eq(pos.size, 2, 'featured product: media left and right differ');
      await t.page.close();
    }
    {
      const t = await mount(BROWSER, PIB, {width: 1700, assets: ASSETS});
      const seen = new Set();
      for (const v of ['container', 'fluid_container', 'stretch_width', 'full_width']) { await t.emit({section_width: v}); const r = await rect(t, '.pib__inner'); seen.add(JSON.stringify([r.x, r.w])); }
      eq(seen.size, 4, 'info box: every section width draws differently at 1700');
      await t.page.close();
    }
    {
      const t = await mount(BROWSER, PIT, {width: 1366, assets: ASSETS, globals: PIT_G});
      const seen = new Set();
      for (const v of ['left', 'center', 'right']) { await t.emit({tab_alignment: v}); seen.add((await rect(t, '.pit__tabs > li:nth-child(1)')).x); }
      eq(seen.size, 3, 'tabs: left, center and right differ');
      const widths = new Set();
      for (const v of ['container', 'fluid_container', 'stretch_width', 'full_width']) { await t.emit({section_width: v}); const r = await rect(t, '[data-pit-width]'); widths.add(JSON.stringify([r.w, await cs(t, '[data-pit-width]', 'paddingLeft')])); }
      ok(widths.size >= 3, `tabs: section widths draw differently (${widths.size} of 4 at 1366)`);
      await t.page.close();
    }

    /* 8. two instances stay apart */
    for (const [name, o, sel, prop] of [[FP, {settings: FP_BASE}, fpRoot, 'paddingTop'], [PIB, {}, '.pib__inner', 'borderTopLeftRadius'], [PIT, {globals: PIT_G}, '.pit__tab', 'fontSize']]) {
      const t = await mount(BROWSER, name, {width: 1366, assets: ASSETS, instances: [{uid: 'a', ...o}, {uid: 'b', ...o}], globals: o.globals});
      const b0 = await cs(t, sel, prop, 'b');
      const key = {[FP]: ['padding_top', 70], [PIB]: ['box_radius', 30], [PIT]: ['tab_size', 26]}[name];
      await t.emit({[key[0]]: key[1]}, undefined, 'a');
      ne(await cs(t, sel, prop, 'a'), b0, `${name}: an edit reaches instance a`);
      eq(await cs(t, sel, prop, 'b'), b0, `${name}: instance b unchanged`);
      const rootSel = {[FP]: fpRoot, [PIB]: '.pib__inner', [PIT]: '.pit'}[name];
      await t.emit({color_scheme: 'alt-scheme'}, undefined, 'shopify-section-a');
      eq([await cs(t, rootSel, 'backgroundColor', 'a'), await cs(t, rootSel, 'backgroundColor', 'b')], [ALT_BG, BG], `${name}: a prefixed section id reaches a only`);
      if (name === PIB) {
        await t.page.click('#shopify-section-a [data-pib-toggle]');
        eq([await attr(t, '[data-pib-toggle]', 'aria-expanded', 'a'), await attr(t, '[data-pib-toggle]', 'aria-expanded', 'b')], ['true', 'false'], 'info box: opening a row in a leaves b closed');
      }
      if (name === PIT) {
        await t.page.click('#shopify-section-a .pit__tabs > li:nth-child(2) .pit__tab');
        eq([await attr(t, '.pit__tabs > li:nth-child(2) .pit__tab', 'aria-selected', 'a'), await attr(t, '.pit__tabs > li:nth-child(2) .pit__tab', 'aria-selected', 'b')], ['true', 'false'], 'tabs: a tab chosen in a leaves b on its first tab');
      }
      eq(t.errors, [], `${name}: two instances, no errors`);
      await t.page.close();
    }
    {
      const t = await mount(BROWSER, PIB, {width: 1366, assets: ASSETS, instances: [{uid: 'a'}, {uid: 'b'}]});
      await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: {id: 'a'}, settings: {box_radius: 3}}})));
      await t.page.waitForTimeout(60);
      eq(await cs(t, '.pib__inner', 'borderTopLeftRadius', 'a'), '3px', 'info box: a section given as {id} is understood');
      await t.page.evaluate(() => { const id = document.querySelector('#shopify-section-a [data-pa-type="collapsible"]').dataset.paBlock; document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'a', blockId: {id}, settings: {title: 'Block via blockId'}}})); });
      await t.page.waitForTimeout(60);
      eq(await text(t, '.pib__summary-text', 'a'), 'Block via blockId', 'info box: a block given as blockId {id} is understood');
      await t.page.close();
    }

    /* 9. an added block, redraws, no duplicate listeners */
    {
      const t = await mount(BROWSER, PIB, {width: 1366, assets: ASSETS, extraBlocks: [{type: 'collapsible', settings: {title: 'Care'}}]});
      eq(await count(t, '[data-pib-coll]'), 2, 'info box: an added block renders');
      const id = t.blockId('collapsible', 1);
      await t.emit({title: 'Care and washing'}, id);
      eq(await text(t, `[data-pa-block="${id}"] .pib__summary-text`), 'Care and washing', 'info box: the added block is live');
      for (let i = 0; i < 3; i++) await t.redraw();
      eq(await t.page.evaluate(() => window.MateriaProductsA.roots.size), 1, 'info box: three redraws, one root');
      await t.page.click('#shopify-section-test [data-pib-toggle]');
      eq(await attr(t, '[data-pib-toggle]', 'aria-expanded'), 'true', 'info box: one click opens once after redraws (no doubled listener)');
      await t.page.keyboard.press('Enter');
      eq(await attr(t, '[data-pib-toggle]', 'aria-expanded'), 'false', 'info box: Enter on the row button closes it');
      eq(t.errors, [], 'info box: redraws, no errors');
      await t.page.close();
    }
    {
      const t = await mount(BROWSER, PIT, {width: 1366, assets: ASSETS, globals: PIT_G, extraBlocks: [{type: 'custom_tab', settings: {title: 'Sizing'}}]});
      eq(await count(t, '.pit__tab'), 3, 'tabs: an added tab renders');
      await t.emit({title: 'Size guide'}, t.blockId('custom_tab', 1));
      eq(await text(t, '.pit__tabs > li:nth-child(3) .pit__tab'), 'Size guide', 'tabs: the added tab is live');
      for (let i = 0; i < 3; i++) await t.redraw();
      eq(await t.page.evaluate(() => window.MateriaProductsA.roots.size), 1, 'tabs: three redraws, one root');
      await t.page.focus('#shopify-section-test .pit__tabs > li:nth-child(1) .pit__tab');
      await t.page.keyboard.press('ArrowRight');
      eq(await attr(t, '.pit__tabs > li:nth-child(2) .pit__tab', 'aria-selected'), 'true', 'tabs: ArrowRight opens the next tab');
      ok(await t.page.evaluate(() => document.activeElement.matches('.pit__tabs > li:nth-child(2) .pit__tab')), 'tabs: and moves focus to it');
      eq([await shown(t, '.tab-content > :nth-child(2) .tab-panel'), await shown(t, '.tab-content > :nth-child(1) .tab-panel')], [true, false], 'tabs: its panel shows, the first hides');
      await t.page.keyboard.press('End');
      eq(await attr(t, '.pit__tabs > li:nth-child(3) .pit__tab', 'aria-selected'), 'true', 'tabs: End opens the last tab');
      await t.page.keyboard.press('ArrowRight');
      eq(await attr(t, '.pit__tabs > li:nth-child(1) .pit__tab', 'aria-selected'), 'true', 'tabs: ArrowRight wraps to the first');
      await t.page.keyboard.press('Home');
      await t.page.click('#shopify-section-test .pit__tabs > li:nth-child(3) .pit__tab');
      eq(await count(t, '.tab-item:not([hidden])'), 1, 'tabs: one click, one open panel (no doubled listener)');
      eq(await t.page.evaluate(() => location.hash), '', 'tabs: a click does not jump the page');
      eq(t.errors, [], 'tabs: redraws, no errors');
      await t.page.close();
    }
    {
      const t = await mount(BROWSER, FP, {width: 1366, assets: ASSETS, settings: FP_BASE, extraBlocks: [{type: 'text'}]});
      ok(await count(t, '[data-pa-root]') === 1, 'featured product: an added block, one root');
      for (let i = 0; i < 3; i++) await t.redraw();
      eq(await t.page.evaluate(() => window.MateriaProductsA.roots.size), 1, 'featured product: three redraws, one root');
      await t.emit({padding_top: 20});
      eq(await cs(t, fpRoot, 'paddingTop'), '20px', 'featured product: live after redraws');
      await t.redraw({settings: {padding_top: 12}});
      eq(await cs(t, fpRoot, 'paddingTop'), '12px', 'featured product: a redraw brings its own value');
      await t.emit({section_margin_top_desktop: 50});
      await t.redraw({settings: {section_margin_top_desktop: 8}});
      eq(await wrapCss('marginTop')(t), '8px', 'featured product: a live margin on the wrapper gives way to the redraw');
      eq(t.errors, [], 'featured product: redraws, no errors');
      await t.page.close();
    }

    /* 10. no picture reload for an unrelated edit */
    {
      const t = await mount(BROWSER, FP, {width: 1366, assets: ASSETS, settings: FP_BASE});
      await t.page.evaluate(() => { window.__img = document.querySelector('#shopify-section-test media-gallery img'); window.__src = window.__img && window.__img.getAttribute('src'); window.__gal = document.querySelector('#shopify-section-test media-gallery'); });
      for (const s of [{padding_top: 70}, {center: true}, {show_view_link: true}, {view_link_label: 'Open'}, {desktop_media_width: 40}, {color_scheme: 'alt-scheme'}, {show_thumbnails: false}]) await t.emit(s);
      ok(await t.page.evaluate(() => !!window.__img && window.__img.isConnected && window.__img.getAttribute('src') === window.__src && document.querySelector('#shopify-section-test media-gallery') === window.__gal), 'featured product: the gallery and its picture stay (no reload) through live edits');
      await t.page.close();
    }
    {
      const t = await mount(BROWSER, PIB, {width: 1366, assets: ASSETS, blocks: [{type: 'badges', settings: manual}], });
      await t.redraw({blocks: [{type: 'badges', settings: {...manual, badge_1_image: IMG}}]});
      await t.page.evaluate(() => { window.__img = document.querySelector('#shopify-section-test img.pib__badge'); });
      for (const s of [{box_radius: 4}, {row_pad_x: 30}, {color_scheme: 'alt-scheme'}]) await t.emit(s);
      await t.emit({badge_height: 32}, t.blockId('badges'));
      ok(await t.page.evaluate(() => window.__img && window.__img.isConnected), 'info box: a badge picture stays through live edits');
      eq(await t.page.evaluate(() => document.querySelector('#shopify-section-test .pib__answer-wrap, #shopify-section-test .pib__chevron') ? 1 : document.getAnimations().length), 0, 'info box: no running animation to restart');
      await t.page.close();
    }

    /* 11. first paint equals the hydrated paint */
    const snap = (t, sels) => t.page.evaluate(sels => sels.map(sel => { const el = document.querySelector('#shopify-section-test ' + sel); if (!el) return [sel, null]; const r = el.getBoundingClientRect(), c = getComputedStyle(el); return [sel, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.display]; }), sels);
    for (const width of [375, 1366]) for (const [name, o, sels] of [
      [FP, {settings: {...FP_BASE, show_view_link: true, center: true, padding_top: 50}}, [fpRoot, '.featured-product__content', '.product-detail__media', '.product-detail__information', '.product-detail__title', '.pdp-view-link']],
      [FP, {}, [fpRoot, '.product-detail__media', '.product-detail__information']],
      [PIB, {settings: {enable_custom_style: true, box_bg: RED, section_width: 'container', margin_top: 12}, blocks: [{type: 'top_row', settings: {show_icon: true}}, {type: 'collapsible', settings: {open_default: true}}, {type: 'badges'}]}, ['.pib', '.pib__inner', '.pib__top-icon', '.pib__top-text', '.pib__summary', '.pib__answer', '.pib__badges']],
      [PIT, {globals: PIT_G, settings: {tab_alignment: 'center', padding_top: 20}}, ['.pit', '.pit__tabs', '.pit__tab', '.pit__content', '.tab-panel']],
    ]) {
      const a = await mount(BROWSER, name, {width, assets: ASSETS.filter(x => !x.endsWith('.js')), inlineScripts: false, ...o});
      const b = await mount(BROWSER, name, {width, assets: ASSETS, ...o});
      await b.page.waitForTimeout(60);
      eq(await snap(b, sels), await snap(a, sels), `${name} ${width}: first paint equals the hydrated paint`);
      await a.page.close(); await b.page.close();
    }

    /* 12. reduced motion */
    {
      const t = await mount(BROWSER, PIB, {width: 375, assets: ASSETS, reducedMotion: 'reduce'});
      ok(/^0s(, 0s)*$/.test(await cs(t, '.pib__answer-wrap', 'transitionDuration')), 'info box: no height animation under reduced motion');
      await t.page.click('#shopify-section-test [data-pib-toggle]');
      ok((await rect(t, '.pib__answer')).h > 0 && await shown(t, '.pib__answer'), 'info box: the opened row shows at once');
      await t.page.close();
      const p = await mount(BROWSER, PIT, {width: 375, assets: ASSETS, reducedMotion: 'reduce', globals: PIT_G});
      ok(/^0s(, 0s)*$/.test(await cs(p, '.pit__tab', 'transitionDuration')), 'tabs: no underline animation under reduced motion');
      ok(await shown(p, '.tab-content > :nth-child(1) .tab-panel'), 'tabs: content visible');
      await p.page.close();
    }

    /* empty states: storefront draws nothing broken, the builder a note */
    {
      const t = await mount(BROWSER, PIT, {width: 1366, editing: false, assets: ASSETS, blocks: [{type: 'description', settings: {title: 'Description'}}, {type: 'custom_tab', settings: {content_rich: ''}}]});
      eq(await count(t, '.pit'), 0, 'tabs storefront: no product and no text, no empty tabs');
      await t.page.close();
      const e = await mount(BROWSER, PIT, {width: 1366, editing: true, assets: ASSETS});
      eq(await count(e, '.pit__note'), 1, 'tabs builder: the description tab notes where the description comes from');
      await e.page.close();
      const s = await mount(BROWSER, PIT, {width: 1366, editing: false, assets: ASSETS, globals: PIT_G, blocks: [{type: 'description'}, {type: 'custom_tab', settings: {tab_content: 'content_page'}}]});
      eq(await count(s, '.pit__tab'), 1, 'tabs storefront: a page tab with no page is left out');
      eq(await text(s, '.pit__tab'), 'Description', 'tabs: a description tab with no title reads Description');
      await s.page.close();
      const b = await mount(BROWSER, PIB, {width: 1366, editing: false, assets: ASSETS, blocks: []});
      eq(await count(b, '.pib'), 0, 'info box storefront: no blocks, nothing drawn');
      await b.page.close();
      const f = await mount(BROWSER, FP, {width: 375, editing: false, assets: ASSETS});
      ok(await shown(f, '.product-detail__media') && (await rect(f, '.product-detail__media')).h < 700, 'featured product storefront: no product, the media column keeps a tidy placeholder');
      eq(f.errors, [], 'featured product storefront: no product, no errors');
      await f.page.close();
    }
  } finally {
    await BROWSER.close();
  }
  console.log(`${pass} products-a checks passed (Featured product, Product Info Box, Product information tabs: schema, theme inheritance, schemes, custom colours and fonts, every setting live and redrawn, desktop and mobile, distinct choices, instances, added blocks, redraws, no reloads, first paint, reduced motion, keyboard tabs, empty states)`);
})().catch(e => { console.error(e); process.exit(1); });
