/* LIQUIDJS=<path> node tests/theme-testimonials-r4-grid.cjs
   Testimonials Grid (sections/testimonials) with the round 4 bar, with the
   real theme slider (global.js slide-section + Swiper) and testimonials.css:
   theme first, every control live and after a redraw at 375 and 1366
   (editor and storefront), header block typography winning under the theme
   priority rules (live and redraw, on and off), half stars, the carousel
   built again when one of its settings changes, two instances, first
   paint, reduced motion. tests/theme-testimonials-grid.cjs and
   theme-cleanup-sections-b.cjs keep covering the cached stylesheet. */
const {run} = require('./theme-testimonials-r4-lib.cjs');
const RED = '#ff0000', R = 'rgb(255, 0, 0)';
const txt = el => el.textContent.trim();
const blocks = [
  {type: 'eyebrow', settings: {text: 'Reviews'}},
  {type: 'heading', settings: {text: 'What customers say'}},
  {type: 'subheading', settings: {text: '<p>Quotes from buyers.</p>'}},
  {type: 'testimonial', settings: {quote: '<p>First quote</p>', rating: 4.5, name: 'First buyer', role: 'Verified buyer'}},
  {type: 'testimonial', settings: {quote: '<p>Second quote</p>', rating: 5, name: 'Second buyer', role: 'Verified buyer'}},
  {type: 'testimonial', settings: {quote: '<p>Third quote</p>', rating: 3, name: 'Third buyer', role: 'Verified buyer'}},
  {type: 'testimonial', settings: {quote: '<p>Fourth quote</p>', rating: 4, name: 'Fourth buyer', role: 'Verified buyer'}},
];
const B = (block, id, value, sel, prop, expect, more = {}) => ({block, id, value, sel, prop, expect, ...more});
const S = (id, value, sel, prop, expect, more = {}) => ({id, value, sel, prop, expect, ...more});
const D = 1366, M = 375, ROOT = '[data-testimonials]', HEAD = t => '.tm-head--' + (t === 'subheading' ? 'sub' : t);
const slideW = el => Math.round(el.getBoundingClientRect().width);
(async () => {
  const checks = await run({
    name: 'testimonials', root: ROOT, blocks, settings: {display_mode: 'carousel', show_arrow: true},
    assets: ['testimonials.css', 'swiper-bundle.min.css', 'swiper-bundle.min.js', 'global.js'],
    customId: 'enable_custom_colors',
    inherit: [[ROOT, 'backgroundColor', 'rgb(24, 32, 40)'], ['.tm-head--heading', 'color', 'rgb(255, 255, 255)'], ['.tm-head--heading', 'fontFamily', /Georgia/], ['.tm-card__quote p', 'fontFamily', /Arial/], ['.tm-card', 'color', 'rgb(204, 204, 204)'], ['.tm-card__rating', 'color', 'rgb(255, 255, 255)']],
    controls: [
      S('section_width', 'container', '.tm-header', null, v => v > 1290 && v < 1340, {w: D, get: el => Math.round(el.parentElement.getBoundingClientRect().width)}),
      S('reset_spacing', false, ROOT, null, '5px', {pre: {section_margin_top_desktop: 5, section_margin_top_mobile: 5}, get: el => getComputedStyle(el.closest('.shopify-section')).marginTop}),
      S('display_mode', 'grid', '.tm-cards-wrap', null, true, {live: false, get: el => !!el.querySelector('.tm-grid')}),
      S('show_quote_mark', false, '.tm-card', null, 0, {get: el => el.querySelectorAll('.tm-card__quote-mark').length}),
      S('show_rating', false, '.tm-card', null, 0, {get: el => el.querySelectorAll('.tm-card__rating').length}),
      {id: 'columns', value: 2, sel: '.swiper-slide', get: slideW, expect: v => v > 550, w: D},
      S('column_gap', 40, '.swiper-slide', 'marginRight', '40px', {w: D}),
      S('header_alignment', 'left', '.tm-header', 'textAlign', /left|start/),
      S('card_style', 'outline', '.tm-card', 'borderTopWidth', '1px'),
      S('card_align', 'center', '.tm-card', 'textAlign', 'center'),
      S('card_padding', 40, '.tm-card', 'paddingTop', '40px'),
      S('card_content_gap', 30, '.tm-card', 'rowGap', '30px'),
      S('card_radius', 3, '.tm-card', 'borderTopLeftRadius', '3px'),
      S('avatar_shape', 'square', ROOT, null, 'square', {get: el => el.dataset.tmAvatar}),
      S('avatar_size', 80, ROOT, null, '80px', {get: el => getComputedStyle(el).getPropertyValue('--tm-avatar-size').trim()}),
      S('show_arrow', false, '.tm-cards-wrap', null, 0, {get: el => el.querySelectorAll('.swiper-arrow').length}),
      S('carousel_pagination', 'disable', '.tm-cards-wrap', null, 0, {get: el => el.querySelectorAll('.tm-pagination').length}),
      S('pagination_style', 'dot', ROOT, null, 'dot', {get: el => el.dataset.tmPag + ''}),
      S('pagination_position', 'right', ROOT, null, 'flex-end', {get: el => getComputedStyle(el).getPropertyValue('--tm-pag-justify').trim()}),
      S('pagination_spacing', 50, ROOT, null, '50px', {get: el => getComputedStyle(el).getPropertyValue('--tm-pag-space').trim()}),
      S('quote_size', 24, '.tm-card__quote', 'fontSize', '24px', {pre: {enable_custom_typography: true}}),
      S('enable_custom_typography', true, '.tm-card__quote', 'fontSize', '16px', {pre: {quote_size: 16}}),
      S('autoplay', true, 'slide-section', null, 'true', {get: el => el.dataset.autoplay}),
      S('autorotate_speed', 8, 'slide-section', null, '8', {get: el => el.dataset.autoplaySpeed}),
      S('infinite', true, 'slide-section', null, 'true', {get: el => el.dataset.loop}),
      S('padding_top', 12, ROOT, null, '12', {get: el => getComputedStyle(el).getPropertyValue('--section-pt').trim()}),
      S('padding_bottom', 14, ROOT, null, '14', {get: el => getComputedStyle(el).getPropertyValue('--section-pb').trim()}),
      S('header_spacing_desktop', 50, '.tm-header', 'marginBottom', '50px', {w: D}),
      S('space_below_cards_desktop', 20, ROOT, null, '20px', {get: el => getComputedStyle(el).getPropertyValue('--tm-below-d').trim()}),
      S('section_margin_top_desktop', 12, ROOT, null, '12px', {w: D, pre: {reset_spacing: false}, get: el => getComputedStyle(el.closest('.shopify-section')).marginTop}),
      S('section_margin_bottom_desktop', 12, ROOT, null, '12px', {w: D, pre: {reset_spacing: false}, get: el => getComputedStyle(el.closest('.shopify-section')).marginBottom}),
      {id: 'columns_mobile', value: 1.5, sel: '.swiper-slide', get: slideW, expect: v => v < 300, w: M},
      S('header_spacing_mobile', 10, '.tm-header', 'marginBottom', '10px', {w: M}),
      S('space_below_cards_mobile', 20, ROOT, null, '20px', {get: el => getComputedStyle(el).getPropertyValue('--tm-below-m').trim()}),
      S('section_margin_top_mobile', 12, ROOT, null, '12px', {w: M, pre: {reset_spacing: false}, get: el => getComputedStyle(el.closest('.shopify-section')).marginTop}),
      S('section_margin_bottom_mobile', 12, ROOT, null, '12px', {w: M, pre: {reset_spacing: false}, get: el => getComputedStyle(el.closest('.shopify-section')).marginBottom}),
      ...['eyebrow', 'heading', 'subheading'].flatMap(t => [
        B(t, 'enabled', false, '.tm-header', null, true, {get: new Function('el', "const e = el.querySelector('.tm-head--" + (t === 'subheading' ? 'sub' : t) + "'); return !e || e.hidden;")}),
        B(t, 'text', t === 'subheading' ? '<p>New sub</p>' : 'New ' + t, HEAD(t), null, t === 'subheading' ? 'New sub' : 'New ' + t, {get: txt}),
        B(t, 'enable_custom_typography', true, HEAD(t), 'fontSize', '30px', {preBlock: {font_size_desktop: 30, font_size_mobile: 30}}),
        B(t, 'font_size_desktop', 40, HEAD(t), 'fontSize', '40px', {preBlock: {enable_custom_typography: true}, w: D}),
        B(t, 'font_size_mobile', 20, HEAD(t), 'fontSize', '20px', {preBlock: {enable_custom_typography: true}, w: M}),
        B(t, 'font_weight', '300', HEAD(t), 'fontWeight', '300', {preBlock: {enable_custom_typography: true}}),
        B(t, 'custom_font', true, HEAD(t), 'fontFamily', /Courier/, {preBlock: {enable_custom_typography: true, font: {family: 'Courier New', fallback_families: 'monospace'}}}),
        B(t, 'font', {family: 'Courier New', fallback_families: 'monospace'}, HEAD(t), 'fontFamily', /Courier/, {preBlock: {enable_custom_typography: true, custom_font: true}}),
      ]),
      B('testimonial', 'quote', '<p>Changed quote</p>', '.tm-card__quote', null, 'Changed quote', {get: txt}),
      B('testimonial', 'rating', 2.5, '.tm-card__rating', null, '3|50%', {get: el => el.querySelectorAll('.star--off').length + '|' + (el.querySelector('.tm-star-part')?.style.getPropertyValue('--tm-fill') || '')}),
      B('testimonial', 'name', 'Changed name', '.tm-card__name', null, 'Changed name', {get: txt}),
      B('testimonial', 'role', 'Changed role', '.tm-card__role', null, 'Changed role', {get: txt}),
      B('testimonial', 'avatar', {src: '/img/face.png', url: '/img/face.png', width: 160, height: 160}, '.tm-card', null, /face\.png/, {get: el => el.querySelector('.tm-card__avatar')?.getAttribute('src')}),
    ],
    colours: [
      S('card_bg', RED, '.tm-card', 'backgroundColor', R, {theme: v => v !== R}),
      S('card_border_color', RED, '.tm-card', 'borderTopColor', R, {pre: {card_style: 'outline'}, theme: v => v !== R}),
      S('quote_color', RED, '.tm-card__rating', 'color', R, {theme: 'rgb(255, 255, 255)'}),
    ],
    own: [
      {block: 'heading', on: {enable_custom_typography: true, custom_font: true, font: {family: 'Courier New'}, font_weight: '300'}, off: {enable_custom_typography: false}, sel: '.tm-head--heading', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Georgia/},
      {block: 'heading', on: {enable_custom_typography: true, font_weight: '300'}, off: {enable_custom_typography: false}, sel: '.tm-head--heading', attr: 'data-own-weight', prop: 'fontWeight', expect: '300', theme: '700'},
      {block: 'subheading', on: {enable_custom_typography: true, custom_font: true, font: {family: 'Courier New'}}, off: {enable_custom_typography: false}, sel: '.tm-head--sub', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Arial/, desc: ['.tm-head--sub p']},
    ],
    variants: [
      {id: 'card_style', values: ['clean', 'boxed', 'outline'], sel: '.tm-card', read: el => [getComputedStyle(el).paddingTop, getComputedStyle(el).borderTopWidth, getComputedStyle(el).backgroundColor], reset: 'boxed'},
      {id: 'card_align', values: ['left', 'center', 'right'], sel: '.tm-card', read: el => getComputedStyle(el).textAlign, reset: 'left'},
      {id: 'avatar_shape', values: ['circle', 'rounded', 'square'], pre: {}, sel: '.tm-card__avatar', read: el => getComputedStyle(el).borderTopLeftRadius, reset: 'circle'},
      {id: 'header_alignment', values: ['left', 'center', 'right'], sel: '.tm-header', read: el => getComputedStyle(el).textAlign, reset: 'center'},
      {id: 'pagination_position', values: ['left', 'center', 'right'], sel: '.tm-pagination', read: el => Math.round(el.getBoundingClientRect().x), reset: 'center'},
      {id: 'pagination_style', values: ['dot', 'pill', 'line', 'square', 'ring', 'number', 'progress'], sel: '.tm-pagination', read: el => { const b = el.querySelector('.swiper-pagination-bullet-active, .swiper-pagination-progressbar-fill') || el; const c = getComputedStyle(b); return [el.className.includes('progressbar'), c.width, c.height, c.borderTopLeftRadius, c.borderTopWidth, b.textContent]; }, reset: 'pill'},
      {id: 'section_width', values: ['container', 'fluid_container', 'stretch_width', 'full_width'], sel: '.tm-header', read: el => [Math.round(el.parentElement.getBoundingClientRect().width), getComputedStyle(el.parentElement).paddingLeft], reset: 'container'},
    ],
    covered: [':enable_custom_colors', ':reveal'],
    independent: S('card_radius', 2, '.tm-card', 'borderTopLeftRadius', '2px'),
    addBlock: {type: 'testimonial', settings: {quote: '<p>Added</p>', name: 'Added buyer', rating: 3}},
    addBlockLive: {settings: {name: 'Live name'}, sel: '.tm-card__name', get: el => [...el.closest('[data-testimonials]').querySelectorAll('.tm-card__name')].some(n => n.textContent.trim() === 'Live name'), expect: true},
    firstPaint: {display_mode: 'grid'},
    async extra(t, {ok, wait2}) {
      const sec = '#shopify-section-' + t.section.id;
      const part = await t.page.locator(sec + ' .tm-star-part').first().evaluate(el => [el.style.getPropertyValue('--tm-fill'), getComputedStyle(el.querySelector('.tm-star-fill')).clipPath]);
      ok(part[0] === '50%' && /50%/.test(part[1]), 'a 4.5 rating fills half the fifth star ' + part);
      ok(await t.page.evaluate(s => !!document.querySelector(s + ' slide-section').globalSlide, sec), 'the theme slider is built');
      await t.emit({columns: 2}); await wait2(t.page); await t.page.waitForTimeout(100);
      ok(await t.page.evaluate(s => String(document.querySelector(s + ' slide-section').globalSlide.params.breakpoints[1024]?.slidesPerView ?? document.querySelector(s + ' slide-section').globalSlide.params.slidesPerView), sec) !== '', 'the slider is built again with the new columns');
      await t.emit({columns: 3}); await wait2(t.page);
    },
  });
  console.log(checks + ' Testimonials Grid round 4 checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
