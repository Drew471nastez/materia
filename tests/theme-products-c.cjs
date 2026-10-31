/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-products-c.cjs   (exits 1 on any failure)
   Products group C, the three hotspot sections: Hotspot Image Product 2
   (hotspot-image-product-2), Hotspot Image Product (hotspotsection) and
   Product Shop The Look 2 (shop-the-look), with their live controller
   shopify/assets/live-products-c.js. Uses the shared media fixture.
   At 375 and 1366, in the editor and on the storefront:
   schema order and checks; theme inheritance (scheme colours, fonts, theme
   buttons and their hover); colour scheme switch live and after a redraw;
   every visible setting of the section and its blocks changes its element,
   live and after a redraw, desktop/mobile values only at their width;
   variants that look different; two instances stay apart; an added block
   is drawn and live; a redraw sets up once; no picture reload and no
   restarted pulse on an unrelated edit; first paint equals the hydrated
   paint; reduced motion; no sideways scroll; the hotspots themselves (44px
   buttons, aria-expanded, one open card, Escape, outside tap, hover mode,
   block select, the card kept on screen, dots on the same spot of the
   picture at both widths); real product data (title, price, compare price,
   sold out, add to cart form); empty pickers. */
const assert = require('node:assert/strict');
const path = require('node:path');
const {launch, mount, schemaOf, schemaProblems, PANTS, OTHER, TALL} = require('./media-fixture.cjs');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const ASSETS = ['live-products-c.js'];
const SHOTS = process.env.SHOTS || '';
const IMG = {src: '/img/look.png', width: 800, height: 1000, aspect_ratio: 0.8, alt: 'Look picture'};
const IMG2 = {src: '/img/look-two.png', width: 1600, height: 900, aspect_ratio: 1.7778, alt: 'Second picture'};
const v0 = PANTS.variants[0];
const SINGLE = {...PANTS, id: 'single-id', title: 'Single Tote', url: '/products/single-tote', vendor: 'Tote Co', has_only_default_variant: true, variants: [{...v0, id: 'single-v'}], selected_or_first_available_variant: {...v0, id: 'single-v', available: true}, first_available_variant: {...v0, id: 'single-v'}};
const SOLD = {...SINGLE, id: 'sold-id', title: 'Sold Bag', url: '/products/sold-bag', available: false, variants: [{...v0, id: 'sold-v', available: false}], selected_or_first_available_variant: {...v0, id: 'sold-v', available: false}};
const VARIES = {...PANTS, id: 'varies-id', title: 'Varied Coat', price_varies: true};
const NOSALE = {...OTHER, id: 'nosale-id', title: 'Plain Tee', compare_at_price: 1000};
const C1 = '#010203', RGB1 = 'rgb(1, 2, 3)';
const SPOT = name => name === 'hotspotsection' ? 'product_item' : 'hotspot';
/* The first preset's blocks, one hotspot per product (extra ones get their own spot on the picture). */
function presetBlocks(name, products) {
  const {schema} = schemaOf(name), spots = schema.presets[0].blocks.filter(b => b.type === SPOT(name));
  return schema.presets[0].blocks.filter(b => b.type !== SPOT(name)).concat(products.map((product, i) => {
    if (spots[i]) return {...spots[i], settings: {...spots[i].settings, product}};
    const v = 20 + i * 14;
    return {type: SPOT(name), settings: {product, position_x: v, position_y: v, x_d: v, y_d: v, x_m: v, y_m: v, desktop_h_position: v, desktop_v_position: v, mobile_h_position: v, mobile_v_position: v}};
  }));
}

/* ---------- per section ---------- */
const SECTIONS = [
  {
    name: 'hotspot-image-product-2', root: '[data-pch="hsp2"]', pop: '.hsp2__pop', title: '.hsp2__pop-title', cta: '.hsp2__pop-cta', heading: '.hsp2__heading', text: '.hsp2__sub', img: '.hsp2__img',
    settings: {image: IMG}, products: [SOLD, PANTS, TALL],
    probes: [
      {id: 'color_scheme', v: 'alt-scheme', sel: '', prop: 'backgroundColor', expect: 'rgb(250, 250, 250)'},
      {id: 'section_width', v: 'container', sel: '.hsp2__inner', prop: 'maxWidth', expect: '1300px'},
      {id: 'reset_spacing', v: false, live: false, fn: 'el.parentElement.classList.contains("remove_spacing")', expect: false},
      {id: 'show_vendor', v: true, sel: '.hsp2__pop-vendor', prop: 'display', open: true, expect: 'block'},
      {id: 'show_price', v: false, sel: '.hsp2__pop-price', prop: 'display', open: true, expect: 'none'},
      {id: 'cta_label', v: 'Buy it', sel: '.hsp2__pop-cta', prop: 'text', open: true, expect: 'Buy it'},
      {id: 'sold_out_label', v: 'Gone', sel: '.pch-badge', prop: 'text', open: true, expect: 'Gone'},
      {id: 'text_align', v: 'left', sel: '.hsp2__head', prop: 'textAlign', expect: 'left'},
      {id: 'head_gap', v: 4, sel: '.hsp2__head', prop: 'marginBottom', expect: '4px'},
      {id: 'image', v: IMG2, sel: '.hsp2__img', prop: '@src', match: /look-two/},
      {id: 'image_aspect_desktop', v: '1 / 1', sel: '.hsp2__stage', prop: 'aspectRatio', expect: '1 / 1', w: 1366},
      {id: 'image_aspect_mobile', v: '1 / 1', sel: '.hsp2__stage', prop: 'aspectRatio', expect: '1 / 1', w: 375},
      {id: 'image_radius', v: 3, sel: '.hsp2__image-wrap', prop: 'borderTopLeftRadius', expect: '3px'},
      {id: 'interaction_mode', v: 'hover', sel: '', prop: '@data-pch-mode', expect: 'hover'},
      {id: 'dot_size', v: 50, sel: '.pch-dot__core', prop: 'width', expect: '50px', ew: 1366},
      {id: 'show_pulse', v: false, sel: '.pch-dot__core', prop: '::before.animationName', expect: 'none'},
      {id: 'pop_width', v: 300, sel: '.hsp2__pop', prop: 'width', open: true, expect: '300px'},
      {id: 'pop_radius', v: 3, sel: '.hsp2__pop', prop: 'borderTopLeftRadius', open: true, expect: '3px'},
      {id: 'enable_custom_style', v: true, with: {section_bg: C1}, sel: '', prop: 'backgroundColor', expect: RGB1},
      {id: 'section_bg', v: C1, custom: true, sel: '', prop: 'backgroundColor', expect: RGB1},
      {id: 'image_bg', v: C1, custom: true, sel: '.hsp2__image-wrap', prop: 'backgroundColor', expect: RGB1},
      {id: 'dot_bg', v: C1, custom: true, sel: '.pch-dot__core', prop: 'backgroundColor', expect: RGB1},
      {id: 'dot_color', v: C1, custom: true, sel: '.pch-dot__core', prop: 'color', expect: RGB1},
      {id: 'dot_border', v: C1, custom: true, sel: '.pch-dot__core', prop: 'borderTopColor', expect: RGB1},
      {id: 'dot_pulse_color', v: C1, custom: true, sel: '.pch-dot__core', prop: '::before.backgroundColor', expect: RGB1},
      {id: 'pop_bg', v: C1, custom: true, sel: '.hsp2__pop', prop: 'backgroundColor', open: true, expect: RGB1},
      {id: 'pop_color', v: C1, custom: true, sel: '.hsp2__pop', prop: 'color', open: true, expect: RGB1},
      {id: 'pop_title_color', v: C1, custom: true, sel: '.hsp2__pop-title', prop: 'color', open: true, expect: RGB1},
      {id: 'pop_price_color', v: C1, custom: true, sel: '.hsp2__pop-price', prop: 'color', open: true, expect: RGB1},
      {id: 'pop_cta_bg', v: C1, custom: true, sel: '.hsp2__pop-cta', prop: 'backgroundColor', open: true, expect: RGB1},
      {id: 'pop_cta_color', v: C1, custom: true, sel: '.hsp2__pop-cta', prop: 'color', open: true, expect: RGB1},
      {id: 'enable_custom_fonts', v: true, with: {heading_font: {family: 'Courier New'}}, sel: '.hsp2__heading', prop: 'fontFamily', match: /Courier New/},
      {id: 'heading_font', v: {family: 'Courier New'}, fonts: true, sel: '.hsp2__heading', prop: 'fontFamily', match: /Courier New/},
      {id: 'body_font', v: {family: 'Courier New'}, fonts: true, sel: '.hsp2__sub', prop: 'fontFamily', match: /Courier New/},
      {id: 'padding_top', v: 7, sel: '', prop: 'paddingTop', expect: '7px'},
      {id: 'padding_bottom', v: 7, sel: '', prop: 'paddingBottom', expect: '7px'},
      {id: 'side_padding_desktop', v: 7, sel: '', prop: 'paddingLeft', expect: '7px', w: 1366},
      {id: 'side_padding_mobile', v: 7, sel: '', prop: 'paddingLeft', expect: '7px', w: 375},
      {block: 'eyebrow', id: 'text', v: 'New in', sel: '.hsp2__eyebrow', prop: 'text', expect: 'New in'},
      {block: 'eyebrow', id: 'enable_custom_style', v: true, with: {color: C1}, sel: '.hsp2__eyebrow', prop: 'color', expect: RGB1},
      {block: 'eyebrow', id: 'color', v: C1, custom: true, sel: '.hsp2__eyebrow', prop: 'color', expect: RGB1},
      {block: 'eyebrow', id: 'size', v: 17, custom: true, sel: '.hsp2__eyebrow', prop: 'fontSize', expect: '17px'},
      {block: 'eyebrow', id: 'letter_spacing', v: 0, custom: true, sel: '.hsp2__eyebrow', prop: 'letterSpacing', expect: 'normal'},
      {block: 'heading', id: 'text', v: 'Wear <em>this</em>', sel: '.hsp2__heading', prop: 'text', expect: 'Wear this'},
      {block: 'heading', id: 'enable_custom_style', v: true, with: {color: C1}, sel: '.hsp2__heading', prop: 'color', expect: RGB1},
      {block: 'heading', id: 'color', v: C1, custom: true, sel: '.hsp2__heading', prop: 'color', expect: RGB1},
      {block: 'heading', id: 'size_desktop', v: 61, custom: true, sel: '.hsp2__heading', prop: 'fontSize', expect: '61px', w: 1366},
      {block: 'heading', id: 'size_mobile', v: 21, custom: true, sel: '.hsp2__heading', prop: 'fontSize', expect: '21px', w: 375},
      {block: 'subheading', id: 'text', v: '<p>Sub copy</p>', sel: '.hsp2__sub', prop: 'text', expect: 'Sub copy'},
      {block: 'subheading', id: 'max_width', v: 300, sel: '.hsp2__sub', prop: 'maxWidth', expect: '300px'},
      {block: 'subheading', id: 'enable_custom_style', v: true, with: {color: C1}, sel: '.hsp2__sub', prop: 'color', expect: RGB1},
      {block: 'subheading', id: 'color', v: C1, custom: true, sel: '.hsp2__sub', prop: 'color', expect: RGB1},
      {block: 'subheading', id: 'size', v: 19, custom: true, sel: '.hsp2__sub', prop: 'fontSize', expect: '19px'},
      {block: 'hotspot', id: 'product', v: NOSALE, live: false, sel: '.hsp2__pop-title', prop: 'text', open: true, expect: 'Plain Tee'},
      {block: 'hotspot', id: 'position_x', v: 10, sel: '.pch-spot', prop: 'left'},
      {block: 'hotspot', id: 'position_y', v: 90, sel: '.pch-spot', prop: 'top'},
    ],
    variants: [{id: 'section_width', sel: '.hsp2__inner', prop: 'content', w: 1700}, {id: 'image_aspect_desktop', sel: '.hsp2__stage', prop: 'height', w: 1366}, {id: 'image_aspect_mobile', sel: '.hsp2__stage', prop: 'height', w: 375}],
  },
  {
    name: 'hotspotsection', root: '[data-pch="hss"]', pop: '.hss__pop', title: '.hss__pop-title', cta: '.hss__btn', heading: '.hss__title', text: '.hss__text', img: '.hss__img--desktop',
    settings: {background_image: IMG, custom_mobile_image: IMG2}, products: [SINGLE, VARIES, SOLD],
    probes: [
      {id: 'color_scheme', v: 'alt-scheme', sel: '', prop: 'backgroundColor', expect: 'rgb(250, 250, 250)'},
      {id: 'is_fullwidth', v: true, sel: '.hss__container', prop: 'maxWidth', expect: 'none'},
      {id: 'container_max_width', v: 800, sel: '.hss__container', prop: 'maxWidth', expect: '800px'},
      {id: 'reset_spacing', v: false, live: false, fn: '[...el.closest(".shopify-section").querySelectorAll("style")].some(s => s.textContent.includes("margin-top: 0 !important"))', expect: false},
      {id: 'button_text', v: 'Add it', sel: '[data-pch-block$="-b1"] .hss__btn', prop: 'text', open: true, expect: 'Add it'},
      {id: 'choose_text', v: 'Pick a size', sel: '.hss__btn--choose', prop: 'text', open: true, expect: 'Pick a size'},
      {id: 'sold_out_text', v: 'Gone', sel: '.pch-badge', prop: 'text', open: true, expect: 'Gone'},
      {id: 'from_text', v: 'From', sel: '[data-pch-text="from_text"]', prop: 'text', open: true, expect: 'From'},
      {id: 'background_image', v: IMG2, sel: '.hss__img--desktop', prop: '@src', match: /look-two/},
      {id: 'image_radius', v: 9, sel: '.hss__media', prop: 'borderTopLeftRadius', expect: '9px'},
      {id: 'lazyload', v: false, sel: '.hss__img--desktop', prop: '@loading', expect: 'eager'},
      {id: 'interaction_mode', v: 'click', sel: '', prop: '@data-pch-mode', expect: 'click'},
      {id: 'choose_text_font_weight', v: 'bold', sel: '.hss__btn--choose', prop: 'fontWeight', open: true, expect: '700'},
      {id: 'enable_custom_style', v: true, with: {background_color: C1}, sel: '', prop: 'backgroundColor', expect: RGB1},
      {id: 'background_color', v: C1, custom: true, sel: '', prop: 'backgroundColor', expect: RGB1},
      {id: 'text_color', v: C1, custom: true, sel: '.hss__title', prop: 'color', expect: RGB1},
      {id: 'popup_bg_color', v: C1, custom: true, sel: '.hss__pop', prop: 'backgroundColor', open: true, expect: RGB1},
      {id: 'product_title_color', v: C1, custom: true, sel: '.hss__pop-title', prop: 'color', open: true, expect: RGB1},
      {id: 'price_color', v: C1, custom: true, sel: '.hss__price', prop: 'color', open: true, expect: RGB1},
      {id: 'accent_color', v: C1, custom: true, sel: '.hss__btn', prop: 'backgroundColor', open: true, expect: RGB1},
      {id: 'button_text_color', v: C1, custom: true, sel: '.hss__btn', prop: 'color', open: true, expect: RGB1},
      {id: 'enable_custom_fonts', v: true, with: {heading_font: {family: 'Courier New'}}, sel: '.hss__title', prop: 'fontFamily', match: /Courier New/},
      {id: 'heading_font', v: {family: 'Courier New'}, fonts: true, sel: '.hss__title', prop: 'fontFamily', match: /Courier New/},
      {id: 'body_font', v: {family: 'Courier New'}, fonts: true, sel: '.hss__text', prop: 'fontFamily', match: /Courier New/},
      {id: 'section_padding_top', v: 7, sel: '', prop: 'paddingTop', expect: '7px', w: 1366},
      {id: 'section_padding_bottom', v: 7, sel: '', prop: 'paddingBottom', expect: '7px', w: 1366},
      {id: 'enable_custom_mobile_image', v: true, sel: '.hss__img--mobile', prop: 'display', expect: 'block', w: 375},
      {id: 'custom_mobile_image', v: IMG, with: {enable_custom_mobile_image: true}, sel: '.hss__img--mobile', prop: '@src', match: /look\.png/},
      {id: 'custom_mobile_image_width', v: 300, with: {enable_custom_mobile_image: true}, sel: '.hss__img--mobile', prop: 'aspectRatio', expect: '300 / 400'},
      {id: 'custom_mobile_image_height', v: 300, with: {enable_custom_mobile_image: true}, sel: '.hss__img--mobile', prop: 'aspectRatio', expect: '400 / 300'},
      {id: 'section_padding_top_mobile', v: 7, sel: '', prop: 'paddingTop', expect: '7px', w: 375},
      {id: 'section_padding_bottom_mobile', v: 7, sel: '', prop: 'paddingBottom', expect: '7px', w: 375},
      {block: 'heading', id: 'heading_text', v: 'Wear <em>this</em>', sel: '.hss__title', prop: 'text', expect: 'Wear this'},
      {block: 'heading', id: 'section_text', v: 'Short line', sel: '.hss__text', prop: 'text', expect: 'Short line'},
      {block: 'heading', id: 'text_align', v: 'left', sel: '.hss__head', prop: 'textAlign', expect: 'left'},
      {block: 'heading', id: 'enable_custom_style', v: true, with: {heading_text_color: C1}, sel: '.hss__title', prop: 'color', expect: RGB1},
      {block: 'heading', id: 'heading_text_color', v: C1, custom: true, sel: '.hss__title', prop: 'color', expect: RGB1},
      {block: 'heading', id: 'subheading_text_color', v: C1, custom: true, sel: '.hss__text', prop: 'color', expect: RGB1},
      {block: 'heading', id: 'heading_font_size', v: 20, custom: true, sel: '.hss__title', prop: 'fontSize', expect: '20px'},
      {block: 'heading', id: 'enable_custom_font_weight', v: true, with: {heading_font_weight: '300'}, sel: '.hss__title', prop: 'fontWeight', expect: '300'},
      {block: 'heading', id: 'heading_font_weight', v: '300', with: {enable_custom_font_weight: true}, sel: '.hss__title', prop: 'fontWeight', expect: '300'},
      {block: 'product_item', id: 'product', v: NOSALE, live: false, sel: '[data-pch-block$="-b1"] .hss__pop-title', prop: 'text', open: true, expect: 'Plain Tee'},
      {block: 'product_item', id: 'desktop_h_position', v: 10, sel: '[data-pch-block$="-b1"]', prop: 'left', w: 1366},
      {block: 'product_item', id: 'desktop_v_position', v: 90, sel: '[data-pch-block$="-b1"]', prop: 'top', w: 1366},
      {block: 'product_item', id: 'mobile_h_position', v: 10, sel: '[data-pch-block$="-b1"]', prop: 'left', w: 375},
      {block: 'product_item', id: 'mobile_v_position', v: 90, sel: '[data-pch-block$="-b1"]', prop: 'top', w: 375},
    ],
    variants: [{id: 'choose_text_font_weight', sel: '.hss__btn--choose', prop: 'fontWeight', open: true}],
  },
  {
    name: 'shop-the-look', root: '[data-pch="stl"]', pop: '.stl__card', title: '.stl__card-title', cta: '.stl__card-link', heading: '.stl__card-title', text: '.stl__card-price', img: '.stl__img--desktop', ctaRole: 'secondary',
    settings: {image: IMG, image_mobile: IMG2}, products: [SOLD, PANTS],
    probes: [
      {id: 'color_scheme', v: 'alt-scheme', sel: '', prop: 'backgroundColor', expect: 'rgb(250, 250, 250)'},
      {id: 'width', v: 'container', sel: '.stl__inner', prop: 'maxWidth', match: /^13[0-9]{2}px$/},
      {id: 'show_price', v: false, sel: '.stl__card-price', prop: 'display', open: true, expect: 'none'},
      {id: 'link_label', v: 'Go', sel: '.stl__card-link', prop: 'text', open: true, expect: 'Go'},
      {id: 'sold_out_label', v: 'Gone', sel: '.pch-badge', prop: 'text', open: true, expect: 'Gone'},
      {id: 'image', v: IMG, sel: '.stl__img--desktop', prop: '@src', match: /look\.png/, start: IMG2},
      {id: 'image_mobile', v: IMG, sel: '.stl__img--mobile', prop: '@src', match: /look\.png/},
      {id: 'image_radius', v: 9, sel: '.stl__media', prop: 'borderTopLeftRadius', expect: '9px'},
      {id: 'interaction_mode', v: 'hover', sel: '', prop: '@data-pch-mode', expect: 'hover'},
      {id: 'dot_size', v: 30, sel: '.pch-dot__core', prop: 'width', expect: '30px'},
      {id: 'pulse', v: false, sel: '.pch-dot__core', prop: 'animationName', expect: 'none'},
      {id: 'show_labels', v: false, sel: '.stl__label', prop: 'visibility', expect: 'hidden', wait: 260},
      {id: 'enable_custom_style', v: true, with: {section_bg: C1}, sel: '', prop: 'backgroundColor', expect: RGB1},
      {id: 'section_bg', v: C1, custom: true, sel: '', prop: 'backgroundColor', expect: RGB1},
      {id: 'dot_color', v: C1, custom: true, sel: '.pch-dot__core', prop: 'backgroundColor', expect: RGB1},
      {id: 'card_bg', v: C1, custom: true, sel: '.stl__card', prop: 'backgroundColor', open: true, expect: RGB1},
      {id: 'card_text', v: C1, custom: true, sel: '.stl__card', prop: 'color', open: true, expect: RGB1},
      {id: 'card_title', v: C1, custom: true, sel: '.stl__card-title', prop: 'color', open: true, expect: RGB1},
      {id: 'card_border', v: C1, custom: true, sel: '.stl__card', prop: 'borderTopColor', open: true, expect: RGB1},
      {id: 'button_bg', v: C1, custom: true, sel: '.stl__card-link', prop: 'backgroundColor', open: true, expect: RGB1},
      {id: 'button_text', v: C1, custom: true, sel: '.stl__card-link', prop: 'color', open: true, expect: RGB1},
      {id: 'enable_custom_fonts', v: true, with: {body_font: {family: 'Courier New'}}, sel: '.stl__label-text', prop: 'fontFamily', match: /Courier New/},
      {id: 'heading_font', v: {family: 'Courier New'}, fonts: true, sel: '.stl__card-title', prop: 'fontFamily', open: true, match: /Courier New/},
      {id: 'body_font', v: {family: 'Courier New'}, fonts: true, sel: '.stl__label-text', prop: 'fontFamily', match: /Courier New/},
      {id: 'padding_top', v: 7, sel: '', prop: 'paddingTop', expect: '7px'},
      {id: 'padding_bottom', v: 7, sel: '', prop: 'paddingBottom', expect: '7px'},
      {block: 'hotspot', id: 'product', v: NOSALE, live: false, sel: '.stl__card-title', prop: 'text', open: true, expect: 'Plain Tee'},
      {block: 'hotspot', id: 'custom_label', v: 'Hat', sel: '.stl__label-text', prop: 'text', expect: 'Hat'},
      {block: 'hotspot', id: 'x_d', v: 10, sel: '.pch-spot', prop: 'left', w: 1366},
      {block: 'hotspot', id: 'y_d', v: 90, sel: '.pch-spot', prop: 'top', w: 1366},
      {block: 'hotspot', id: 'x_m', v: 10, sel: '.pch-spot', prop: 'left', w: 375},
      {block: 'hotspot', id: 'y_m', v: 90, sel: '.pch-spot', prop: 'top', w: 375},
    ],
    variants: [{id: 'width', sel: '.stl__inner', prop: 'content', w: 1700}],
  },
];

/* ---------- helpers ---------- */
async function measure(t, cfg, p, uid = 'test') {
  return t.page.evaluate(async ({root, p, uid}) => {
    const r = document.querySelector('#shopify-section-' + uid + ' ' + root);
    const el = p.sel ? r.querySelector(p.sel) : r;
    if (!el) return '<missing>';
    if (p.open) {
      const spot = el.closest('[data-pch-spot]') || r.querySelector('[data-pch-spot]:not([hidden])');
      const dot = spot.querySelector('[data-pch-dot]');
      if (dot.getAttribute('aria-expanded') !== 'true') { dot.click(); await new Promise(f => requestAnimationFrame(() => requestAnimationFrame(f))); }
    }
    if (p.fn) return new Function('el', 'return ' + p.fn)(r);
    if (p.prop === 'text') return el.textContent.trim().replace(/\s+/g, ' ');
    if (p.prop === '@src') return (el.getAttribute('src') || '').split('?')[0]; // the picture, whatever size the CDN is asked for
    if (p.prop[0] === '@') return el.getAttribute(p.prop.slice(1));
    if (p.prop.startsWith('::before.')) return getComputedStyle(el, '::before')[p.prop.slice(9)];
    if (p.prop === 'content') { const cs = getComputedStyle(el); return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); }
    return getComputedStyle(el)[p.prop];
  }, {root: cfg.root, p, uid});
}
/* What has to be on first (custom styling, custom fonts, a toggle the setting depends on), so the probe changes only its own setting. */
function preFor(p) {
  const out = {...(p.with || {})};
  if (p.custom) out.enable_custom_style = true;
  if (p.fonts) out.enable_custom_fonts = true;
  return out;
}
function original(t, p, keys) {
  const src = p.block ? t.rendered[0].section.blocks.find(b => b.type === p.block).settings : t.rendered[0].section.settings;
  return Object.fromEntries(keys.map(k => [k, src[k] === undefined ? '' : src[k]]));
}
async function apply(t, p, changes, how) {
  if (how === 'emit') return t.emit(changes, p.block ? t.blockId(p.block) : undefined);
  if (!p.block) return t.redraw({settings: changes});
  const r = t.rendered[0], first = r.section.blocks.find(b => b.type === p.block);
  return t.redraw({blocks: r.section.blocks.map(b => ({type: b.type, settings: b === first ? {...b.settings, ...changes} : b.settings}))});
}
const near = (a, b, d = 1.5) => Math.abs(a - b) <= d;

async function controls(browser, cfg, width) {
  const blocks = presetBlocks(cfg.name, cfg.products);
  const t = await mount(browser, cfg.name, {width, blocks, settings: cfg.settings, assets: ASSETS});
  const {schema} = t;
  // Every visible setting has a probe.
  const visible = [['', schema.settings], ...schema.blocks.map(b => [b.type, b.settings])].flatMap(([type, list]) => list.filter(x => x.id && !x.hidden).map(x => (type ? type + '.' : '') + x.id));
  const covered = new Set(cfg.probes.map(p => (p.block ? p.block + '.' : '') + p.id));
  for (const id of visible) ok(covered.has(id), `${cfg.name}: setting ${id} has a control check`);
  for (const p of cfg.probes) {
    const where = `${cfg.name}@${width} ${p.block ? p.block + '.' : ''}${p.id}`;
    const pre = preFor(p), preRestore = original(t, p, Object.keys(pre));
    if (p.start) await apply(t, p, {[p.id]: p.start}, 'redraw');
    const restore = p.start ? {[p.id]: p.start} : original(t, p, [p.id]);
    for (const how of p.live === false ? ['redraw'] : ['emit', 'redraw']) {
      if (Object.keys(pre).length) await apply(t, p, pre, how);
      const base = await measure(t, cfg, p);
      await apply(t, p, {[p.id]: p.v}, how);
      if (p.wait) await t.page.waitForTimeout(p.wait);
      const got = await measure(t, cfg, p);
      if (p.w && p.w !== width) { eq(got, base, `${where} (${how}): a ${p.w === 1366 ? 'desktop' : 'mobile'} value leaves this width alone`); }
      else {
        ok(got !== base, `${where} (${how}): changes its element (${base} -> ${got})`);
        if ('expect' in p && (!p.ew || p.ew === width)) eq(got, p.expect, `${where} (${how}) value`);
        if (p.match) ok(p.match.test(String(got)), `${where} (${how}) ${got} matches ${p.match}`);
      }
      await apply(t, p, restore, how);
      if (p.wait) await t.page.waitForTimeout(p.wait);
      eq(await measure(t, cfg, p), base, `${where} (${how}): back to where it was when undone`);
      if (Object.keys(pre).length) await apply(t, p, preRestore, how);
    }
  }
  eq(t.errors, [], `${cfg.name}@${width}: no errors while editing`);
  await t.page.close();
}

async function variants(browser, cfg) {
  const {schema} = schemaOf(cfg.name);
  for (const vdef of cfg.variants) {
    const opts = schema.settings.find(x => x.id === vdef.id).options.map(o => o.value);
    const t = await mount(browser, cfg.name, {width: vdef.w || 1366, blocks: presetBlocks(cfg.name, cfg.products), settings: cfg.settings, assets: ASSETS});
    const seen = [];
    for (const v of opts) { await t.redraw({settings: {[vdef.id]: v}}); seen.push(await measure(t, cfg, vdef)); }
    eq(new Set(seen).size, opts.length, `${cfg.name} ${vdef.id}: every option looks different (${seen.join(', ')})`);
    await t.page.close();
  }
}

async function hotspots(browser, cfg, width, editing) {
  const where = `${cfg.name}@${width}${editing ? ' editor' : ''}`;
  const blocks = presetBlocks(cfg.name, cfg.products);
  const t = await mount(browser, cfg.name, {width, editing, blocks, settings: cfg.settings, assets: ASSETS, instances: [{uid: 'a', blocks, settings: cfg.settings}, {uid: 'b', blocks, settings: cfg.settings}]});
  const {page} = t;
  const R = uid => '#shopify-section-' + uid + ' ' + cfg.root;
  const state = uid => page.$$eval(R(uid) + ' [data-pch-spot]', els => els.map(s => [s.querySelector('[data-pch-dot]').getAttribute('aria-expanded'), s.querySelector('[data-pch-pop]').hidden]));
  // Theme inheritance.
  ok(await page.$eval(R('a'), el => getComputedStyle(el).backgroundColor) === 'rgb(24, 32, 40)', `${where}: scheme background`);
  const hd = await page.$eval(R('a') + ' ' + cfg.heading, el => (el.closest('[data-pch-pop]') && el.closest('[data-pch-spot]').querySelector('[data-pch-dot]').click(), [getComputedStyle(el).color, getComputedStyle(el).fontFamily]));
  ok(hd[0] === 'rgb(255, 255, 255)' && /Georgia/.test(hd[1]), `${where}: heading in the scheme heading colour and heading font (${hd})`);
  const tx = await page.$eval(R('a') + ' ' + cfg.text, el => (el.closest('[data-pch-pop]') && el.closest('[data-pch-spot]').querySelector('[data-pch-dot]').click(), [getComputedStyle(el).color, getComputedStyle(el).fontFamily]));
  ok(tx[0] === 'rgb(204, 204, 204)' && /Arial/.test(tx[1]), `${where}: text in the scheme text colour and body font (${tx})`);
  // Dots: 44px buttons with aria-expanded/aria-controls naming their card.
  const dots = await page.$$eval(R('a') + ' [data-pch-spot]:not([hidden]) [data-pch-dot]', els => els.map(d => { const b = d.getBoundingClientRect(); return {w: b.width, h: b.height, tag: d.tagName, type: d.type, exp: d.getAttribute('aria-expanded'), ctl: !!document.getElementById(d.getAttribute('aria-controls')), name: d.textContent.trim()}; }));
  ok(dots.length >= 2, `${where}: dots drawn`);
  for (const d of dots) ok(d.w >= 44 && d.h >= 44 && d.tag === 'BUTTON' && d.type === 'button' && d.ctl && d.name, `${where}: dot is a named 44px button controlling its card ${JSON.stringify(d)}`);
  // Click opens one; another click opens the next and closes the first; b untouched.
  await page.evaluate(() => { document.querySelectorAll('[data-pch-dot][aria-expanded="true"]').forEach(d => d.click()); });
  await (await page.$$(R('a') + ' [data-pch-spot]:not([hidden]) [data-pch-dot]'))[0].click();
  let s = await state('a');
  ok(s[0][0] === 'true' && s[0][1] === false, `${where}: a click opens the card`);
  eq((await state('b')).filter(x => x[0] === 'true').length, 0, `${where}: the other instance stays closed`);
  const second = (await page.$$(R('a') + ' [data-pch-spot]:not([hidden]) [data-pch-dot]'))[1];
  await second.evaluate(d => d.click());
  await page.waitForTimeout(50);
  s = await state('a');
  eq(s.filter(x => x[0] === 'true').length, 1, `${where}: one card open at a time`);
  // The open card stays on the screen; no sideways scroll.
  for (const [i, dot] of (await page.$$(R('a') + ' [data-pch-spot]:not([hidden]) [data-pch-dot]')).entries()) {
    await dot.evaluate(d => { if (d.getAttribute('aria-expanded') !== 'true') d.click(); });
    await page.waitForTimeout(40);
    const box = await dot.evaluate(d => { const r = document.getElementById(d.getAttribute('aria-controls')).getBoundingClientRect(); return {l: r.left, r: r.right, w: document.documentElement.clientWidth}; });
    ok(box.l >= 0 && box.r <= box.w, `${where}: card ${i} inside the screen (${Math.round(box.l)}..${Math.round(box.r)} of ${box.w})`);
    ok(await t.noOverflow(), `${where}: card ${i} open, no sideways scroll`);
  }
  // Escape closes and returns focus to the dot.
  const first = (await page.$$(R('a') + ' [data-pch-spot]:not([hidden]) [data-pch-dot]'))[0];
  await first.focus();
  await page.keyboard.press('Enter');
  ok(await first.getAttribute('aria-expanded') === 'true', `${where}: Enter on a focused dot opens it`);
  await page.keyboard.press('Tab');
  ok(await page.evaluate(() => !!document.activeElement.closest('[data-pch-pop]')), `${where}: Tab moves into the open card`);
  await page.keyboard.press('Escape');
  ok(await first.getAttribute('aria-expanded') === 'false' && await first.evaluate(d => d === document.activeElement), `${where}: Escape closes and focus goes back to the dot`);
  await page.keyboard.press('Space');
  ok(await first.getAttribute('aria-expanded') === 'true', `${where}: Space opens it`);
  await page.mouse.click(2, 2);
  ok(await first.getAttribute('aria-expanded') === 'false', `${where}: a tap outside closes it`);
  // Close button where the card has one.
  if (await page.$(R('a') + ' [data-pch-close]')) {
    await first.click(); await page.click(R('a') + ' [data-pch-spot][data-open] [data-pch-close]');
    ok(await first.getAttribute('aria-expanded') === 'false' && await first.evaluate(d => d === document.activeElement), `${where}: the close button closes it`);
  }
  // Editor: selecting a hotspot block opens it.
  await page.$eval(R('a') + ' [data-pch-spot]:not([hidden])', el => el.dispatchEvent(new CustomEvent('shopify:block:select', {bubbles: true})));
  ok(await first.getAttribute('aria-expanded') === 'true', `${where}: selecting the block opens its card`);
  await page.$eval(R('a') + ' [data-pch-spot]:not([hidden])', el => el.dispatchEvent(new CustomEvent('shopify:block:deselect', {bubbles: true})));
  ok(await first.getAttribute('aria-expanded') === 'false', `${where}: deselecting closes it`);
  // Hover mode on a mouse.
  if (width === 1366) {
    await t.emit({interaction_mode: 'hover'}, undefined, 'a');
    await page.mouse.move(2, 2);
    await first.hover(); await page.waitForTimeout(40);
    ok(await first.getAttribute('aria-expanded') === 'true', `${where}: hover mode opens on hover`);
    await page.hover(R('a') + ' [data-pch-spot][data-open] [data-pch-pop]'); await page.waitForTimeout(260);
    ok(await first.getAttribute('aria-expanded') === 'true', `${where}: moving onto the card keeps it open`);
    await page.mouse.move(2, 2); await page.waitForTimeout(260);
    ok(await first.getAttribute('aria-expanded') === 'false', `${where}: leaving closes it`);
    await first.hover(); await page.waitForTimeout(40); await first.click(); await page.waitForTimeout(40);
    ok(await first.getAttribute('aria-expanded') === 'true', `${where}: a click right after hover keeps it open`);
    await t.emit({interaction_mode: 'click'}, undefined, 'a'); await page.mouse.move(2, 2); await page.mouse.click(2, 2);
    await first.hover(); await page.waitForTimeout(60);
    ok(await first.getAttribute('aria-expanded') === 'false', `${where}: click mode ignores hover`);
  }
  // Theme buttons: theme colours and radius, theme hover.
  await first.evaluate(d => d.click());
  const ctaSel = R('a') + ' [data-pch-spot][data-open] ' + cfg.cta;
  const btn = await page.$eval(ctaSel, el => ({bg: getComputedStyle(el).backgroundColor, r: getComputedStyle(el).borderTopLeftRadius, tb: el.dataset.themeButton, sl: el.hasAttribute('data-sl-button'), h: el.getBoundingClientRect().height}));
  ok(btn.tb === (cfg.ctaRole || 'primary') && btn.sl && btn.r === '12px' && btn.h >= 44, `${where}: card button follows the theme button contract ${JSON.stringify(btn)}`);
  if (!cfg.ctaRole) {
    ok(btn.bg === 'rgb(18, 52, 86)', `${where}: theme button background`);
    await page.hover(ctaSel); await page.waitForTimeout(60);
    eq(await page.$eval(ctaSel, el => getComputedStyle(el).backgroundColor), 'rgb(255, 0, 0)', `${where}: theme button hover`);
  }
  await page.mouse.click(2, 2);
  // Two instances: an edit to a leaves b alone.
  const [key, [csel, cprop]] = Object.entries(cfg.custom)[0], q = uid => R(uid) + (csel ? ' ' + csel : '');
  await t.emit({enable_custom_style: true, [key]: C1}, undefined, 'a');
  ok(await page.$eval(q('a'), (el, p) => getComputedStyle(el)[p], cprop) === RGB1, `${where}: edit lands on a`);
  ok(await page.$eval(q('b'), (el, p) => getComputedStyle(el)[p], cprop) !== RGB1, `${where}: b is unchanged`);
  // Colour scheme switch, live and after a redraw.
  await t.emit({color_scheme: 'alt-scheme'}, undefined, 'b');
  eq(await page.$eval(R('b'), el => getComputedStyle(el).backgroundColor), 'rgb(250, 250, 250)', `${where}: scheme switch live`);
  await t.redraw({uid: 'b', settings: {color_scheme: 'alt-scheme'}});
  eq(await page.$eval(R('b'), el => getComputedStyle(el).backgroundColor), 'rgb(250, 250, 250)', `${where}: scheme switch after redraw`);
  ok(await page.$eval(R('a'), el => getComputedStyle(el).backgroundColor) !== 'rgb(250, 250, 250)', `${where}: a keeps its own scheme`);
  // Redraws set up once: same number of roots and listeners.
  const before = await page.evaluate(() => window.MateriaProductsC.stats());
  for (let i = 0; i < 3; i++) await t.redraw({uid: 'b'});
  const after = await page.evaluate(() => window.MateriaProductsC.stats());
  ok(after.roots === before.roots && after.listeners === before.listeners, `${where}: redraws set up once (${JSON.stringify(before)} -> ${JSON.stringify(after)})`);
  await page.click(R('b') + ' [data-pch-spot]:not([hidden]) [data-pch-dot]');
  ok(await page.$eval(R('b') + ' [data-pch-spot]:not([hidden]) [data-pch-dot]', d => d.getAttribute('aria-expanded')) === 'true', `${where}: a redrawn section's dots work`);
  await page.mouse.click(2, 2);
  // An added hotspot block is drawn, opens, and is live.
  const type = cfg.name === 'hotspotsection' ? 'product_item' : 'hotspot';
  const added = [...t.rendered.find(r => r.section.id === 'b').section.blocks.map(b => ({type: b.type, settings: b.settings})), {type, settings: {product: OTHER}}];
  await t.redraw({uid: 'b', blocks: added});
  const newId = t.blockId(type, added.filter(b => b.type === type).length - 1, 'b');
  const nd = R('b') + ` [data-pch-block="${newId}"]`;
  await page.click(nd + ' [data-pch-dot]');
  ok(await page.$eval(nd + ' [data-pch-dot]', d => d.getAttribute('aria-expanded')) === 'true' && /Other Tee/.test(await page.$eval(nd + ' [data-pch-pop]', p => p.textContent)), `${where}: added hotspot opens with its product`);
  const posKey = {hotspot: cfg.name === 'shop-the-look' ? (width > 749 ? 'x_d' : 'x_m') : 'position_x', product_item: width > 749 ? 'desktop_h_position' : 'mobile_h_position'}[type];
  const l0 = await page.$eval(nd, el => el.getBoundingClientRect().left);
  await t.emit({[posKey]: 12}, newId, 'b');
  ok(!near(await page.$eval(nd, el => el.getBoundingClientRect().left), l0), `${where}: added hotspot moves live`);
  eq(t.errors, [], `${where}: no errors`);
  ok(await t.noOverflow(), `${where}: no sideways scroll`);
  await page.close();
}

async function liveSafety(browser, cfg, width) {
  const where = `${cfg.name}@${width}`;
  const blocks = presetBlocks(cfg.name, cfg.products);
  const t = await mount(browser, cfg.name, {width, blocks, settings: cfg.settings, assets: ASSETS});
  const {page} = t, R = '#shopify-section-test ' + cfg.root;
  await page.$eval(R + ' ' + cfg.img, el => { window.__img = el; window.__src = el.getAttribute('src'); });
  const anim = () => page.evaluate(() => document.getAnimations().filter(a => a.animationName && /pulse/.test(a.animationName)).map(a => a.startTime));
  const a0 = await anim();
  if (cfg.name !== 'hotspotsection') ok(a0.length > 0, `${where}: the dots pulse`);
  for (const ch of [{padding_top: 11}, {enable_custom_style: true}, {color_scheme: 'alt-scheme'}]) await t.emit(ch);
  await t.emit({[cfg.name === 'shop-the-look' ? 'custom_label' : cfg.name === 'hotspotsection' ? 'desktop_h_position' : 'position_x']: 20}, t.blockId(SPOT(cfg.name)));
  ok(await page.$eval(R + ' ' + cfg.img, el => el === window.__img && el.getAttribute('src') === window.__src), `${where}: no picture reload on unrelated edits`);
  eq(await anim(), a0, `${where}: pulse not restarted by edits`);
  await page.close();
  // First paint (no script) equals the hydrated paint.
  const snap = async assets => {
    const m = await mount(browser, cfg.name, {width, blocks, settings: cfg.settings, assets, inlineScripts: false});
    const out = await m.page.evaluate(root => [...document.querySelectorAll(root + ', ' + root + ' *')].filter(el => !el.closest('[hidden]') && !(el.closest('svg') && el.tagName !== 'svg')).map(el => { const b = el.getBoundingClientRect(), cs = getComputedStyle(el); return [el.className && el.className.baseVal === undefined ? el.className : el.tagName, Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height), cs.color, cs.backgroundColor, cs.fontFamily, cs.fontSize].join('|'); }), cfg.root);
    await m.page.close();
    return out;
  };
  const cold = await snap([]), warm = await snap(ASSETS);
  eq(warm, cold, `${where}: first paint equals the hydrated paint`);
  // Reduced motion: no pulse, cards appear without animation, everything visible.
  const rm = await mount(browser, cfg.name, {width, blocks, settings: cfg.settings, assets: ASSETS, reducedMotion: 'reduce'});
  eq(await rm.page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0, `${where}: reduced motion stops the pulse`);
  await rm.page.click('#shopify-section-test ' + cfg.root + ' [data-pch-spot]:not([hidden]) [data-pch-dot]');
  eq(await rm.page.$eval('#shopify-section-test [data-pch-spot][data-open] [data-pch-pop]', el => [getComputedStyle(el).animationName, getComputedStyle(el).opacity]), ['none', '1'], `${where}: reduced motion opens the card without animation`);
  eq(rm.errors, [], `${where}: no errors under reduced motion`);
  await rm.page.close();
}

async function productData(browser, cfg) {
  for (const editing of [true, false]) {
    const blocks = presetBlocks(cfg.name, cfg.name === 'hotspotsection' ? [SOLD, NOSALE, PANTS, '', SINGLE] : [SOLD, NOSALE, PANTS, '']);
    const t = await mount(browser, cfg.name, {width: 1366, editing, blocks, settings: cfg.settings, assets: ASSETS});
    const where = `${cfg.name}${editing ? ' editor' : ' storefront'}`;
    const spots = await t.page.$$eval('[data-pch-spot]', els => els.map(s => ({hidden: s.hidden, text: s.querySelector('[data-pch-pop]').textContent.replace(/\s+/g, ' ').trim(), links: [...s.querySelectorAll('[data-pch-pop] a')].map(a => a.getAttribute('href')), s: !!s.querySelector('[data-pch-pop] s'), badge: !!s.querySelector('.pch-badge'), form: s.querySelector('form') && {action: s.querySelector('form').getAttribute('action'), id: s.querySelector('form [name=id]').value, disabled: s.querySelector('form [type=submit]').disabled, tb: s.querySelector('form [type=submit]').dataset.themeButton}})));
    const by = title => spots.find(x => x.text.includes(title));
    ok(by('Sold Bag') && by('Sold Bag').badge && /R\$137\.77/.test(by('Sold Bag').text), `${where}: sold out product shows its price and the sold out badge`);
    ok(by('Plain Tee') && !by('Plain Tee').s && !by('Plain Tee').badge, `${where}: a lower compare price is not shown`);
    ok(by('Pants Down') && by('Pants Down').s && /R\$211\.93/.test(by('Pants Down').text) && by('Pants Down').links.includes('/products/pants-down'), `${where}: compare price shown when higher, links to the product`);
    const empty = spots.filter(x => /Choose a product/.test(x.text));
    ok(empty.length >= 1 && empty.every(x => x.hidden === !editing), `${where}: an empty picker shows a placeholder card in the editor and nothing on the storefront`);
    if (cfg.name === 'hotspotsection') {
      eq(by('Single Tote').form, {action: '/cart/add', id: 'single-v', disabled: false, tb: 'primary'}, `${where}: one-variant product gets an add to cart form`);
      ok(by('Sold Bag').form && by('Sold Bag').form.disabled && /Sold out/.test(by('Sold Bag').text), `${where}: sold out add to cart is disabled and says so`);
      ok(!by('Pants Down').form && /Choose options/.test(by('Pants Down').text), `${where}: a product with variants links to choose options`);
    }
    eq(t.errors, [], `${where}: no errors`);
    await t.page.close();
  }
}

async function onThePicture(browser) {
  // Hotspot Image Product 2 crops the picture to the frame; a dot stays on the same spot of the picture.
  for (const width of [375, 1366]) {
    const t = await mount(browser, 'hotspot-image-product-2', {width, settings: {image: IMG}, blocks: [{type: 'hotspot', settings: {position_x: 30, position_y: 40, product: PANTS}}, {type: 'hotspot', settings: {position_x: 70, position_y: 62, product: OTHER}}], assets: ASSETS});
    const pts = await t.page.evaluate(() => {
      const img = document.querySelector('.hsp2__img').getBoundingClientRect(), ar = 0.8;
      const boxAr = img.width / img.height, dispW = boxAr > ar ? img.width : img.height * ar, dispH = boxAr > ar ? img.width / ar : img.height;
      return [...document.querySelectorAll('[data-pch-spot]')].map(s => { const d = s.querySelector('[data-pch-dot]').getBoundingClientRect(), b = JSON.parse(s.dataset.pchSettings); return {got: [d.x + d.width / 2, d.y + d.height / 2], want: [img.x + (img.width - dispW) / 2 + dispW * b.position_x / 100, img.y + (img.height - dispH) / 2 + dispH * b.position_y / 100]}; });
    });
    for (const p of pts) ok(near(p.got[0], p.want[0]) && near(p.got[1], p.want[1]), `hotspot-image-product-2@${width}: dot on its spot of the picture ${JSON.stringify(p)}`);
    await t.page.close();
  }
  for (const [name, pos] of [['shop-the-look', ['x_d', 'y_d', 'x_m', 'y_m']], ['hotspotsection', ['desktop_h_position', 'desktop_v_position', 'mobile_h_position', 'mobile_v_position']]]) {
    for (const width of [375, 1366]) {
      const t = await mount(browser, name, {width, settings: name === 'shop-the-look' ? {image: IMG} : {background_image: IMG}, blocks: [{type: name === 'shop-the-look' ? 'hotspot' : 'product_item', settings: {product: PANTS, [pos[0]]: 20, [pos[1]]: 30, [pos[2]]: 70, [pos[3]]: 60}}], assets: ASSETS});
      const want = width > 749 ? [20, 30] : [70, 60];
      const got = await t.page.evaluate(() => { const img = document.querySelector('[data-pch-stage] img').getBoundingClientRect(), d = document.querySelector('[data-pch-dot]').getBoundingClientRect(); return [(d.x + d.width / 2 - img.x) / img.width * 100, (d.y + d.height / 2 - img.y) / img.height * 100]; });
      ok(near(got[0], want[0], .5) && near(got[1], want[1], .5), `${name}@${width}: dot at its ${width > 749 ? 'desktop' : 'mobile'} position on the picture (${got.map(Math.round)})`);
      await t.page.close();
    }
  }
}

async function library(browser, cfg) {
  for (const width of [375, 1366]) {
    const t = await mount(browser, cfg.name, {width, editing: true, assets: ASSETS});
    const h = await t.page.$eval('#shopify-section-test', el => el.getBoundingClientRect().height);
    ok(h > 200 && h < (width === 375 ? 1000 : 1150), `${cfg.name}@${width}: library preview has a real height (${Math.round(h)}px)`);
    const n = await t.page.$$eval('[data-pch-spot]:not([hidden])', els => els.length);
    ok(n >= 2, `${cfg.name}@${width}: library preview shows its hotspots`);
    ok(await t.noOverflow(), `${cfg.name}@${width}: library preview fits`);
    eq(t.errors, [], `${cfg.name}@${width}: library preview has no errors`);
    if (SHOTS) await t.page.screenshot({path: path.join(SHOTS, `${cfg.name}-library-${width}.png`), fullPage: true});
    await t.page.close();
  }
}

SECTIONS[0].custom = {dot_bg: ['.pch-dot__core', 'backgroundColor']};
SECTIONS[1].custom = {background_color: ['', 'backgroundColor']};
SECTIONS[2].custom = {dot_color: ['.pch-dot__core', 'backgroundColor']};

(async () => {
  const browser = await launch();
  try {
    for (const cfg of SECTIONS) {
      eq(schemaProblems(cfg.name), [], `${cfg.name}: schema checks`);
      const {schema} = schemaOf(cfg.name);
      const heads = schema.settings.filter(x => x.type === 'header').map(x => x.content);
      ok(heads[0] === 'General' && heads.indexOf('Appearance') < heads.indexOf('Typography'), `${cfg.name}: settings grouped in the shared order (${heads.join(' > ')})`);
      for (const list of [schema.settings, ...schema.blocks.map(b => b.settings)]) for (const x of list) if (x.type === 'color') ok(/enable_custom_style/.test(x.visible_if || ''), `${cfg.name}: colour ${x.id} waits for Enable custom styling`);
      await library(browser, cfg);
      for (const width of [375, 1366]) {
        await controls(browser, cfg, width);
        for (const editing of [true, false]) await hotspots(browser, cfg, width, editing);
        await liveSafety(browser, cfg, width);
      }
      await variants(browser, cfg);
      await productData(browser, cfg);
    }
    await onThePicture(browser);
  } finally { await browser.close(); }
  console.log(`theme-products-c: ${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
