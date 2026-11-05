/* LIQUIDJS=<path> node tests/theme-testimonials-r4-carousel-pro.cjs
   Testimonial Carousel Pro (sections/reviews2) with the round 4 bar: theme
   first, every control live and after a redraw at 375 and 1366 (editor and
   storefront), theme priority opt outs (fonts, weights, button shape),
   fractional star tiles, the drifting rows (not restarted by an edit,
   paused off screen and on hover, still and scrollable under reduced
   motion), the theme button, two instances, first paint. */
const {run} = require('./theme-testimonials-r4-lib.cjs');
const RED = '#ff0000', R = 'rgb(255, 0, 0)';
const txt = el => el.textContent.trim();
const blocks = [
  {type: 'eyebrow', settings: {text: 'Reviews'}},
  {type: 'heading', settings: {text: 'What customers say <strong>now</strong>'}},
  {type: 'subheading', settings: {text: '<p>Quotes from buyers.</p>'}},
  {type: 'review', settings: {rating: 4.3, name: 'First buyer', role: 'Verified buyer', body: 'First quote'}},
  {type: 'review', settings: {rating: 5, name: 'Second buyer', role: 'Verified buyer', body: 'Second quote'}},
  {type: 'review', settings: {rating: 3.5, name: 'Third buyer', role: 'Verified buyer', body: 'Third quote'}},
  {type: 'review', settings: {rating: 4, name: 'Fourth buyer', role: 'Verified buyer', body: 'Fourth quote'}},
  {type: 'cta', settings: {label: 'Read more reviews', link: '/pages/reviews'}},
];
const B = (block, id, value, sel, prop, expect, more = {}) => ({block, id, value, sel, prop, expect, ...more});
const S = (id, value, sel, prop, expect, more = {}) => ({id, value, sel, prop, expect, ...more});
const BTN = '.tcp__btn';
(async () => {
  const checks = await run({
    name: 'reviews2', root: '.tcp', blocks,
    inherit: [['.tcp', 'backgroundColor', 'rgb(24, 32, 40)'], ['.tcp', 'color', 'rgb(204, 204, 204)'], ['.tcp__heading', 'color', 'rgb(255, 255, 255)'], ['.tcp__heading', 'fontFamily', /Georgia/], ['.tcp__sub p', 'fontFamily', /Arial/], ['.tcp__name', 'fontFamily', /Georgia/], ['.tcp__body', 'fontFamily', /Arial/], [BTN, 'backgroundColor', 'rgb(18, 52, 86)'], [BTN, 'borderTopLeftRadius', '12px']],
    controls: [
      S('section_width', 'container', '.lt-frame', 'maxWidth', '1330px', {w: 1366}),
      S('heading_align', 'left', '.tcp__head', 'textAlign', 'left'),
      S('heading_to_grid_gap', 20, '.tcp__head', 'marginBottom', '20px'),
      S('card_width', 360, '.tcp__card', 'width', '360px', {w: 1366}),
      S('card_width_mobile', 240, '.tcp__card', 'width', '240px', {w: 375}),
      S('card_gap', 30, '.tcp__track', 'columnGap', '30px'),
      S('row_gap', 30, '.tcp__rows', 'rowGap', '30px'),
      S('card_radius', 3, '.tcp__card', 'borderTopLeftRadius', '3px'),
      S('star_size', 20, '.lt-star', 'width', '20px'),
      S('edge_fade', false, '.tcp__row', 'content::before', 'none'),
      S('edge_fade_size', 20, '.tcp__row', 'width::before', v => parseFloat(v) > 60),
      S('speed_s', 30, '.tcp__track', 'animationDuration', '30s'),
      S('padding_top', 12, '.tcp', 'paddingTop', '12px'),
      S('padding_bottom', 14, '.tcp', 'paddingBottom', '14px'),
      B('eyebrow', 'text', 'Changed eyebrow', '.tcp__eyebrow', null, 'Changed eyebrow', {get: txt}),
      B('eyebrow', 'size_desktop', 15, '.tcp__eyebrow', 'fontSize', '15px', {w: 1366}),
      B('eyebrow', 'size_mobile', 10, '.tcp__eyebrow', 'fontSize', '10px', {w: 375}),
      B('eyebrow', 'enable_custom_weight', true, '.tcp__eyebrow', 'fontWeight', '700', {preBlock: {font_weight: '700'}}),
      B('eyebrow', 'font_weight', '300', '.tcp__eyebrow', 'fontWeight', '300', {preBlock: {enable_custom_weight: true}}),
      B('eyebrow', 'space_above', 10, '.tcp__eyebrow', 'marginTop', '10px'),
      B('eyebrow', 'space_below', 20, '.tcp__eyebrow', 'marginBottom', '20px'),
      B('heading', 'text', 'New <em>heading</em>', '.tcp__heading', null, 'New heading', {get: txt}),
      B('heading', 'size', 50, '.tcp__heading', 'fontSize', '50px', {w: 1366}),
      B('heading', 'size_mobile', 21, '.tcp__heading', 'fontSize', '21px', {w: 375}),
      B('heading', 'enable_custom_weight', true, '.tcp__heading', 'fontWeight', '800'),
      B('heading', 'font_weight', '300', '.tcp__heading', 'fontWeight', '300', {preBlock: {enable_custom_weight: true}}),
      B('heading', 'space_above', 6, '.tcp__heading', 'marginTop', '6px'),
      B('heading', 'space_below', 22, '.tcp__heading', 'marginBottom', '22px'),
      B('subheading', 'text', '<p>New sub</p>', '.tcp__sub', null, 'New sub', {get: txt}),
      B('subheading', 'size', 19, '.tcp__sub', 'fontSize', '19px', {w: 1366}),
      B('subheading', 'size_mobile', 13, '.tcp__sub', 'fontSize', '13px', {w: 375}),
      B('subheading', 'enable_custom_weight', true, '.tcp__sub', 'fontWeight', '400'),
      B('subheading', 'font_weight', '600', '.tcp__sub', 'fontWeight', '600', {preBlock: {enable_custom_weight: true}}),
      B('subheading', 'space_above', 4, '.tcp__sub', 'marginTop', '4px'),
      B('subheading', 'space_below', 8, '.tcp__sub', 'marginBottom', '8px'),
      B('review', 'body', 'Changed quote', '.tcp__body', null, 'Changed quote|Changed quote|Changed quote|Changed quote', {get: el => [...el.closest('.tcp').querySelectorAll('[data-lt-block="' + el.closest('[data-lt-block]').dataset.ltBlock + '"] .tcp__body')].map(n => n.textContent.trim()).join('|')}),
      B('review', 'rating', 2.6, '.tcp__card .lt-stars', null, '2.6 / 5|0%|60%', {get: el => el.getAttribute('aria-label') + '|' + el.children[4].style.getPropertyValue('--lt-fill') + '|' + el.children[2].style.getPropertyValue('--lt-fill')}),
      B('review', 'name', 'Changed name', '.tcp__name', null, 'Changed name', {get: txt}),
      B('review', 'role', '', '.tcp__role', null, true, {get: el => el.hidden}),
      B('review', 'avatar', {src: '/img/face.png', url: '/img/face.png', width: 150, height: 150, alt: ''}, '.tcp__avatar', null, /^\/img\/face\.png(\?[^ ]*)?$/, {get: el => (el.querySelector('img')?.getAttribute('src') || '') + (el.querySelector('svg') ? ' and placeholder' : '')}),
      B('cta', 'label', 'See every review', BTN, null, 'See every review', {get: txt}),
      B('cta', 'link', '', '.tcp__cta', null, 'BUTTON', {get: el => el.querySelector('[data-lt-button]').tagName}),
      B('cta', 'use_theme_button', false, BTN, 'borderTopLeftRadius', '100px'),
      B('cta', 'size', 19, BTN, 'fontSize', '19px', {preBlock: {use_theme_button: false}}),
      B('cta', 'padding_x', 40, BTN, 'paddingLeft', '40px', {preBlock: {use_theme_button: false}}),
      B('cta', 'padding_y', 20, BTN, 'paddingTop', '20px', {preBlock: {use_theme_button: false}}),
      B('cta', 'radius', 0, BTN, 'borderTopLeftRadius', '0px', {preBlock: {use_theme_button: false}}),
    ],
    colours: [
      S('section_bg', RED, '.tcp', 'backgroundColor', R, {theme: 'rgb(24, 32, 40)'}),
      S('text_color', RED, '.tcp', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      S('card_bg', RED, '.tcp__card', 'backgroundColor', R, {theme: v => v !== R}),
      S('card_text_color', RED, '.tcp__body', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      S('role_color', RED, '.tcp__role', 'color', R, {theme: v => v !== R}),
      S('star_bg', RED, '.lt-star', 'backgroundImage', /255, 0, 0/, {theme: /51, 102, 153/}),
      S('star_empty_bg', RED, '.lt-star:last-child', 'backgroundImage', /255, 0, 0\) 30%/, {theme: v => !/255, 0, 0/.test(v)}),
      S('edge_fade_color', RED, '.tcp__row', 'backgroundImage::before', /255, 0, 0/, {theme: /24, 32, 40/}),
      B('eyebrow', 'color', RED, '.tcp__eyebrow', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      B('heading', 'color', RED, '.tcp__heading', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      B('subheading', 'color', RED, '.tcp__sub p', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      B('cta', 'bg', RED, BTN, 'backgroundColor', R, {theme: 'rgb(18, 52, 86)'}),
      B('cta', 'text_color', RED, BTN, 'color', R, {theme: 'rgb(255, 255, 255)'}),
      {block: 'cta', id: 'bg_hover', value: RED, sel: BTN, get: el => getComputedStyle(el).getPropertyValue('--mb-hover-bg').trim(), expect: RED, theme: ''},
      {block: 'cta', id: 'text_hover', value: RED, sel: BTN, get: el => getComputedStyle(el).getPropertyValue('--mb-hover-text').trim(), expect: RED, theme: ''},
    ],
    fonts: [{id: 'heading_font', sel: '.tcp__heading', desc: ['.tcp__heading strong', '.tcp__name']}, {id: 'body_font', sel: '.tcp__sub p', desc: ['.tcp__body', '.tcp__eyebrow', '.tcp__role']}],
    own: [
      {on: {enable_custom_fonts: true, heading_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.tcp__heading', attrSel: '.tcp', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Georgia/, desc: ['.tcp__name']},
      {on: {enable_custom_fonts: true, body_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.tcp__body', attrSel: '.tcp', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Arial/, desc: ['.tcp__sub p']},
      {block: 'heading', on: {enable_custom_weight: true, font_weight: '300'}, off: {enable_custom_weight: false}, sel: '.tcp__heading', attr: 'data-own-weight', prop: 'fontWeight', expect: '300', theme: '700'},
      {block: 'subheading', on: {enable_custom_weight: true, font_weight: '700'}, off: {enable_custom_weight: false}, sel: '.tcp__sub', attr: 'data-own-weight', prop: 'fontWeight', expect: '700', theme: '400', desc: ['.tcp__sub p']},
      {block: 'cta', on: {use_theme_button: false, radius: 2, size: 19, padding_x: 33, padding_y: 9}, off: {use_theme_button: true}, sel: BTN, attr: 'data-own-shape', prop: 'paddingLeft', expect: '33px', theme: '24px'},
      {block: 'cta', on: {use_theme_button: false, radius: 2, size: 19}, off: {use_theme_button: true}, sel: BTN, attr: 'data-own-shape', prop: 'fontSize', expect: '19px', theme: '16px'},
    ],
    variants: [
      {id: 'section_width', values: ['container', 'fluid_container', 'stretch_width', 'full_width'], sel: '.lt-frame', read: el => [getComputedStyle(el).maxWidth, getComputedStyle(el).paddingLeft], reset: 'full_width'},
      {id: 'heading_align', values: ['left', 'center', 'right'], sel: '.tcp__head', read: el => getComputedStyle(el).textAlign, reset: 'center'},
      {id: 'font_weight', block: 'heading', pre: {enable_custom_weight: true}, values: ['300', '400', '500', '600', '700', '800'], sel: '.tcp__heading', read: el => getComputedStyle(el).fontWeight},
      {id: 'font_weight', block: 'eyebrow', pre: {enable_custom_weight: true}, values: ['300', '400', '500', '600', '700', '800'], sel: '.tcp__eyebrow', read: el => getComputedStyle(el).fontWeight},
      {id: 'font_weight', block: 'subheading', pre: {enable_custom_weight: true}, values: ['300', '400', '500', '600', '700', '800'], sel: '.tcp__sub', read: el => getComputedStyle(el).fontWeight},
    ],
    covered: [':enable_custom_style', ':enable_custom_fonts', ':reveal', 'eyebrow:enable_custom_style', 'heading:enable_custom_style', 'subheading:enable_custom_style', 'cta:enable_custom_style'],
    independent: S('padding_top', 7, '.tcp', 'paddingTop', '7px'),
    addBlock: {type: 'review', settings: {name: 'Added buyer', rating: 3}},
    addBlockLive: {settings: {name: 'Live name'}, sel: '.tcp__name', get: el => [...el.closest('.tcp').querySelectorAll('.tcp__name')].some(n => n.textContent.trim() === 'Live name'), expect: true},
    async extra(t, {width, editing, ok, wait2}) {
      const sec = '#shopify-section-' + t.section.id;
      const fills = await t.page.locator(sec + ' .tcp__card').first().locator('.lt-star').evaluateAll(els => els.map(e => e.style.getPropertyValue('--lt-fill')));
      ok(fills.join() === '100%,100%,100%,100%,30%', 'fractional star tile fill ' + fills);
      ok(await t.page.locator(sec + ' .tcp__card[data-copy]').evaluateAll(els => els.length > 0 && els.every(e => e.getAttribute('aria-hidden') === 'true')), 'the looped copies are hidden from screen readers');
      /* an edit does not restart the drift */
      const a = await t.page.locator(sec + ' .tcp__track').first().evaluate(el => { const an = el.getAnimations()[0]; window.__ltAnim = an; return an.currentTime; });
      await t.emit({text: 'Edited heading'}, t.blockId('heading')); await wait2(t.page); await t.page.waitForTimeout(120);
      if (editing) ok(await t.page.locator(sec + ' .tcp__track').first().evaluate((el, before) => el.getAnimations()[0] === window.__ltAnim && el.getAnimations()[0].currentTime > before, a), 'the rows keep moving through an edit');
      if (editing && width === 1366) {
        const off = await t.page.evaluate(async s => { const pad = document.createElement('div'); pad.style.height = '5000px'; document.body.append(pad); scrollTo(0, 99999); await new Promise(r => setTimeout(r, 300)); const st = getComputedStyle(document.querySelector(s + ' .tcp__track')).animationPlayState; scrollTo(0, 0); pad.remove(); await new Promise(r => setTimeout(r, 200)); return st + '|' + getComputedStyle(document.querySelector(s + ' .tcp__track')).animationPlayState; }, sec);
        ok(off === 'paused|running', 'rows pause off screen and run again ' + off);
        { const rb = await t.page.locator(sec + ' .tcp__row').first().boundingBox(); await t.page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2); await t.page.waitForTimeout(50); }
        ok(await t.page.locator(sec + ' .tcp__track').first().evaluate(el => getComputedStyle(el).animationPlayState) === 'paused', 'rows pause on hover');
        await t.page.mouse.move(5, 899);
      }
      const box = await t.page.locator(sec + ' ' + BTN).boundingBox();
      ok(box.height >= 44, 'button is a 44px target');
    },
    async after(browser, {ok}) {
      const {mount} = require('./media-fixture.cjs');
      const t = await mount(browser, 'reviews2', {width: 375, blocks, assets: ['live-testimonials.js'], reducedMotion: 'reduce'});
      ok(await t.page.locator('.tcp__card[data-copy]').evaluateAll(els => els.every(e => getComputedStyle(e).display === 'none')), 'reduced motion: the copies are gone');
      ok(await t.page.locator('.tcp__row').first().evaluate(el => getComputedStyle(el).overflowX === 'auto' && el.scrollWidth > el.clientWidth), 'reduced motion: a row scrolls by hand');
      await t.page.close();
    },
  });
  console.log(checks + ' Testimonial Carousel Pro round 4 checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
