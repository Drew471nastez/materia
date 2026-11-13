/* LIQUIDJS=<path> LIVE=0 node tests/theme-r7-testimonials.cjs [testimonial-wall|testimonial-product]
   The two round 7 Testimonials sections, Testimonial Wall
   (sections/testimonial-wall) and Testimonial With Product
   (sections/testimonial-product), with their controller
   shopify/assets/live-r7-testimonials.js.

   For both, at 375 and 1366, in the editor and on the storefront: schema
   (order, unique ids, names, nothing invented in defaults), theme
   inheritance with the real Theme settings priority rules on (and once with
   them off), colour scheme switch, every section and block control live and
   after a redraw, custom colours on and off, custom fonts winning over the
   theme rules and going back, desktop and mobile values at their width,
   every select option looking different, two instances, an added block,
   one set up per redraw, no picture loaded again, first paint equal to the
   hydrated paint, reduced motion, no sideways scroll and no errors.
   Testimonial Wall: the Show more button (clip, label, aria, phones only by
   default, never under five quotes, open for a new or edited quote in the
   builder). Testimonial With Product: real product data, the empty picker,
   and the row (touch style scrollLeft, snap, arrows, keys, ends). */
const assert = require('node:assert/strict');
const {launch, mount, render, schemaProblems, schemaOf, PANTS, OTHER, EMPTY} = require('./media-fixture.cjs');
const ASSET = 'live-r7-testimonials.js';
const ALL = [[375, true], [375, false], [1366, true], [1366, false]];
const RED = '#ff0000', R = 'rgb(255, 0, 0)', BG = 'rgb(24, 32, 40)', WHITE = 'rgb(255, 255, 255)', TEXT = 'rgb(204, 204, 204)';
const wait2 = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const txt = el => el.textContent.trim();
const IMG = name => ({src: '/img/' + name + '.png', url: '/img/' + name + '.png', width: 800, height: 600, alt: name + ' alt'});
const B = (block, id, value, sel, prop, expect, more = {}) => ({block, id, value, sel, prop, expect, ...more});
const S = (id, value, sel, prop, expect, more = {}) => ({id, value, sel, prop, expect, ...more});
const same = (got, want) => want instanceof RegExp ? want.test(String(got)) : typeof want === 'function' ? want(got) : String(got) === String(want);
async function value(t, c, uid) {
  const loc = t.page.locator('#shopify-section-' + (uid || t.section.id) + ' ' + c.sel).first();
  if (c.get) return loc.evaluate(c.get);
  if (c.attr) return loc.evaluate((el, a) => el.getAttribute(a), c.attr);
  return loc.evaluate((el, k) => { const [p, pseudo] = k.split('::'); return getComputedStyle(el, pseudo ? '::' + pseudo : null)[p]; }, c.prop);
}
const settle = async (page, sel) => page.evaluate(sel => new Promise(res => { const el = document.querySelector(sel); let last = el.scrollLeft, still = 0, n = 0; const tick = () => { const now = el.scrollLeft; still = now === last ? still + 1 : 0; last = now; if (still > 8 || ++n > 240) res(now); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); }), sel);

let checks = 0;
const fails = [];
const ok = (c, m) => { if (process.env.R7_STRICT) assert.ok(c, m); if (c) checks++; else { fails.push(m); console.log('FAIL ' + m); } };

/* ---------- what both sections share ---------- */
const HEAD_BLOCKS = [
  {type: 'eyebrow', settings: {text: 'Eyebrow words'}},
  {type: 'heading', settings: {text: 'Heading <strong>words</strong>'}},
  {type: 'subheading', settings: {text: '<p>Subheading words.</p>'}},
];
const BTN = {type: 'button', settings: {label: 'Button words', link: '/collections/all'}};
const sharedInherit = [
  ['.r7t', 'backgroundColor', BG], ['.r7t', 'color', TEXT],
  ['.r7t__heading', 'color', WHITE], ['.r7t__heading', 'fontFamily', /Georgia/], ['.r7t__heading', 'fontWeight', '700'],
  ['.r7t__eyebrow', 'fontFamily', /Arial/], ['.r7t__sub p', 'fontFamily', /Arial/], ['.r7t__sub p', 'color', TEXT],
  ['.r7t-card__quote', 'fontFamily', /Arial/], ['.r7t-card__quote', 'color', WHITE],
  ['.r7t-card__name', 'fontFamily', /Georgia/], ['.r7t-card__name', 'color', WHITE],
  ['.r7t-card', 'borderTopLeftRadius', '8px'], ['.r7t-star', 'backgroundColor::before', 'rgb(51, 102, 153)'],
  ['.r7t__btn', 'backgroundColor', 'rgb(18, 52, 86)'], ['.r7t__btn', 'borderTopLeftRadius', '12px'], ['.r7t__btn', 'fontSize', '16px'],
];
const sharedControls = name => [
  S('section_width', 'fluid_container', '.r7t__frame', 'maxWidth', '1530px'),
  S('reset_spacing', false, '.r7t', 'marginTop', '36px', {pre: {section_margin_top_desktop: 36}, w: 1366}),
  S('reset_spacing', true, '.r7t', 'marginTop', '0px', {pre: {section_margin_top_desktop: 36}, w: 1366}),
  S('text_align', name === 'testimonial-wall' ? 'left' : 'center', '.r7t__head', 'textAlign', name === 'testimonial-wall' ? 'start' : 'center'),
  S('card_gap', 32, name === 'testimonial-wall' ? '.r7w__wall' : '.r7p__track', 'columnGap', '32px'),
  S('card_style', 'outline', '.r7t-card', 'backgroundColor', 'rgba(0, 0, 0, 0)'),
  S('card_style', 'plain', '.r7t-card', 'paddingLeft', '0px'),
  S('quote_size', 21, '.r7t-card__quote', 'fontSize', '21px', {w: 1366}),
  S('quote_size_mobile', 13, '.r7t-card__quote', 'fontSize', '13px', {w: 375}),
  S('padding_top', 12, '.r7t', 'paddingTop', '12px', {w: 1366}),
  S('padding_bottom', 16, '.r7t', 'paddingBottom', '16px', {w: 1366}),
  S('padding_top_mobile', 8, '.r7t', 'paddingTop', '8px', {w: 375}),
  S('padding_bottom_mobile', 4, '.r7t', 'paddingBottom', '4px', {w: 375}),
  S('section_margin_top_desktop', 44, '.r7t', 'marginTop', '44px', {pre: {reset_spacing: false}, w: 1366}),
  S('section_margin_bottom_desktop', 48, '.r7t', 'marginBottom', '48px', {pre: {reset_spacing: false}, w: 1366}),
  S('section_margin_top_mobile', 20, '.r7t', 'marginTop', '20px', {pre: {reset_spacing: false}, w: 375}),
  S('section_margin_bottom_mobile', 24, '.r7t', 'marginBottom', '24px', {pre: {reset_spacing: false}, w: 375}),
  /* a padding or margin for the other width leaves this width alone */
  S('padding_top_mobile', 8, '.r7t', 'paddingTop', '60px', {w: 1366}),
  S('padding_top', 12, '.r7t', 'paddingTop', '40px', {w: 375}),
  S('section_margin_top_desktop', 44, '.r7t', 'marginTop', '0px', {pre: {reset_spacing: false}, w: 375}),
  B('eyebrow', 'text', 'Changed eyebrow', '.r7t__eyebrow', null, 'Changed eyebrow', {get: txt}),
  B('eyebrow', 'text', '', '.r7t__eyebrow', null, true, {get: el => el.hidden}),
  B('heading', 'text', 'New <em>heading</em>', '.r7t__heading', null, 'New heading', {get: txt}),
  B('heading', 'size', 52, '.r7t__heading', 'fontSize', '52px', {w: 1366}),
  B('heading', 'size_mobile', 21, '.r7t__heading', 'fontSize', '21px', {w: 375}),
  B('heading', 'size', 52, '.r7t__heading', 'fontSize', '26px', {w: 375}),
  B('subheading', 'text', '<p>New sub</p>', '.r7t__sub', null, 'New sub', {get: txt}),
  B('subheading', 'size', 19, '.r7t__sub p', 'fontSize', '19px'),
  B('testimonial', 'body', 'Changed quote', '.r7t-card__quote', null, 'Changed quote', {get: txt}),
  B('testimonial', 'body', '', '.r7t-card__quote', null, true, {get: el => el.hidden}),
  B('testimonial', 'name', 'Changed name', '.r7t-card__name', null, 'Changed name', {get: txt}),
  B('testimonial', 'role', 'Changed line', '.r7t-card__role', null, 'Changed line|false', {get: el => el.textContent.trim() + '|' + el.hidden}),
  B('testimonial', 'role', '', '.r7t-card__role', null, true, {get: el => el.hidden}),
  B('testimonial', 'rating', 2.5, '.r7t-card .r7t-stars', null, '2.5 / 5|false|100%|50%|0%', {get: el => el.getAttribute('aria-label') + '|' + el.hidden + '|' + el.children[1].style.getPropertyValue('--r7t-fill') + '|' + el.children[2].style.getPropertyValue('--r7t-fill') + '|' + el.children[4].style.getPropertyValue('--r7t-fill')}),
  B('testimonial', 'rating', 0, '.r7t-card .r7t-stars', null, true, {get: el => el.hidden}),
  B('testimonial', 'avatar', IMG('other'), '.r7t-card__avatar', null, /other\.png.*\|false\|$/, {get: el => (el.querySelector('img') ? el.querySelector('img').getAttribute('src') : 'none') + '|' + el.hidden + '|' + (el.querySelector('img') ? el.querySelector('img').alt : '')}),
  B('testimonial', 'avatar', '', '.r7t-card__avatar', null, 'none|true', {get: el => (el.querySelector('img') ? 'img' : 'none') + '|' + el.hidden}),
  B('button', 'label', 'New label', '.r7t__btn', null, 'New label', {get: txt}),
  B('button', 'label', '', '.r7t__btn', null, true, {get: el => el.hidden}),
  B('button', 'link', '/pages/reviews', '.r7t__btn', null, 'A|/pages/reviews', {get: el => el.tagName + '|' + el.getAttribute('href')}),
  B('button', 'link', '', '.r7t__btn', null, 'BUTTON|button|null', {get: el => el.tagName + '|' + el.getAttribute('type') + '|' + el.getAttribute('href')}),
  B('button', 'button_style', 'secondary', '.r7t__btn', 'backgroundColor', WHITE),
];
const sharedColours = [
  S('section_bg', RED, '.r7t', 'backgroundColor', R, {theme: BG}),
  S('text_color', RED, '.r7t', 'color', R, {theme: TEXT}),
  S('card_bg', RED, '.r7t-card', 'backgroundColor', R, {theme: v => v !== R && v !== 'rgba(0, 0, 0, 0)'}),
  S('card_border_color', RED, '.r7t-card', 'borderTopColor', R, {pre: {card_style: 'outline'}, theme: 'rgb(68, 85, 102)'}),
  S('card_border_color', RED, '.r7t-card', 'borderTopColor', R, {pre: {card_style: 'plain'}, theme: 'rgb(68, 85, 102)'}),
  S('quote_color', RED, '.r7t-card__quote', 'color', R, {theme: WHITE}),
  S('name_color', RED, '.r7t-card__name', 'color', R, {theme: WHITE}),
  S('star_color', RED, '.r7t-star', 'backgroundColor::before', R, {theme: 'rgb(51, 102, 153)'}),
  S('star_empty_color', RED, '.r7t-star svg', 'fill', R, {theme: v => v !== R}),
  S('card_radius', 22, '.r7t-card', 'borderTopLeftRadius', '22px', {theme: '8px'}),
  B('eyebrow', 'color', RED, '.r7t__eyebrow', 'color', R, {theme: TEXT}),
  B('heading', 'color', RED, '.r7t__heading', 'color', R, {theme: WHITE}),
  B('subheading', 'color', RED, '.r7t__sub p', 'color', R, {theme: TEXT}),
  B('button', 'bg', RED, '.r7t__btn', 'backgroundColor', R, {theme: 'rgb(18, 52, 86)'}),
  B('button', 'text_color', RED, '.r7t__btn', 'color', R, {theme: WHITE}),
  {block: 'button', id: 'bg_hover', value: '#00ff00', sel: '.r7t__btn', get: el => el.style.getPropertyValue('--mb-hover-bg'), expect: '#00ff00', theme: ''},
  {block: 'button', id: 'text_hover', value: '#00ff00', sel: '.r7t__btn', get: el => el.style.getPropertyValue('--mb-hover-text'), expect: '#00ff00', theme: ''},
];
const sharedFonts = [
  {id: 'heading_font', sel: '.r7t__heading', desc: ['.r7t__heading strong', '.r7t-card__name']},
  {id: 'body_font', sel: '.r7t__sub p', desc: ['.r7t-card__quote', '.r7t-card__role', '.r7t__eyebrow']},
];
const sharedOwn = [
  {on: {enable_custom_fonts: true, heading_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.r7t__heading', attrSel: '.r7t', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Georgia/, desc: ['.r7t__heading strong', '.r7t-card__name']},
  {on: {enable_custom_fonts: true, body_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.r7t__sub p', attrSel: '.r7t', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Arial/, desc: ['.r7t-card__quote', '.r7t-card__role']},
];
const sharedVariants = name => [
  {id: 'section_width', values: ['container', 'fluid_container', 'stretch_width', 'full_width'], sel: '.r7t__frame', read: el => [getComputedStyle(el).maxWidth, getComputedStyle(el).paddingLeft], reset: 'container'},
  {id: 'card_style', values: ['filled', 'outline', 'plain'], sel: '.r7t-card', read: el => { const c = getComputedStyle(el); return [c.backgroundColor, c.borderTopColor, c.paddingLeft]; }, reset: 'filled'},
  {id: 'text_align', values: ['left', 'center'], sel: '.r7t__heading', read: el => Math.round(el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2), reset: name === 'testimonial-wall' ? 'center' : 'left'},
  {id: 'button_style', block: 'button', values: ['primary', 'secondary'], sel: '.r7t__btn', read: el => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color], reset: 'primary'},
];
const sharedCovered = [':enable_custom_style', ':enable_custom_fonts', ':reveal', 'eyebrow:enable_custom_style', 'heading:enable_custom_style', 'subheading:enable_custom_style', 'button:enable_custom_style'];

/* ---------- the two sections ---------- */
/* the share of the wall that shows, in percent (the wall closed, its transition skipped) */
const PART = root => { const el = root.querySelector('.r7w__clip'), wall = root.querySelector('.r7w__wall'), was = root.dataset.open; root.dataset.open = 'false'; el.style.transition = 'none'; const v = Math.round(el.getBoundingClientRect().height / (wall.getBoundingClientRect().height - parseFloat(getComputedStyle(wall).columnGap)) * 100); root.dataset.open = was; void el.offsetHeight; el.style.transition = ''; return v; };
const quotes = n => Array.from({length: n}, (_, i) => ({type: 'testimonial', settings: {rating: i === 0 ? 4.5 : i === 2 ? 3 : 0, name: 'Buyer ' + (i + 1), role: i % 2 ? '' : 'Line ' + (i + 1), body: 'Quote number ' + (i + 1) + (i % 3 === 1 ? ', a longer one that runs over a few lines so the cards in the wall are not all the same height, the way real quotes never are.' : '.')}}));
const WALL = {
  name: 'testimonial-wall', root: '.r7w',
  blocks: [...HEAD_BLOCKS, ...quotes(7).map((q, i) => i === 0 ? {...q, settings: {...q.settings, avatar: IMG('first-face'), image: IMG('first-photo')}} : q), BTN],
  inherit: [...sharedInherit, ['.r7w__wall', 'columnGap', '20px'], ['.r7t__more', 'fontSize', '16px']],
  controls: [
    ...sharedControls('testimonial-wall'),
    S('columns', 2, '.r7w__wall', 'columnCount', '2', {w: 1366}),
    S('columns', 4, '.r7w__wall', 'columnCount', '4', {w: 1366}),
    S('columns', 4, '.r7w__wall', 'columnCount', '1', {w: 375}),
    S('collapse', 'always', '.r7t__more', 'display', 'flex'),
    S('collapse', 'none', '.r7t__more', 'display', 'none'),
    S('collapse', 'mobile', '.r7t__more', 'display', 'none', {w: 1366}),
    S('collapse', 'mobile', '.r7t__more', 'display', 'flex', {w: 375}),
    {id: 'collapsed_part', value: 60, pre: {collapse: 'always'}, sel: '.r7w', get: PART, expect: v => Math.abs(v - 60) <= 1},
    {id: 'collapsed_part', value: 25, pre: {collapse: 'always'}, sel: '.r7w', get: PART, expect: v => Math.abs(v - 25) <= 1},
    S('more_label', 'More quotes', '.r7t__more', null, 'More quotes', {pre: {collapse: 'always'}, get: txt}),
    S('more_label', '', '.r7t__more', null, 'Show more', {pre: {collapse: 'always'}, get: txt}),
    S('less_label', '', '.r7w', null, 'false', {attr: 'data-less'}),
    S('less_label', 'Fewer', '.r7t__more', null, 'Fewer', {attr: 'data-less'}),
    B('testimonial', 'image', IMG('photo'), '.r7w__photo', null, /photo\.png.*\|false$/, {n: 1, sel: '.r7w__item:nth-child(2) .r7w__photo', get: el => (el.querySelector('img') ? el.querySelector('img').getAttribute('src') : 'none') + '|' + el.hidden}),
    B('testimonial', 'image', '', '.r7w__photo', null, 'none|true', {get: el => (el.querySelector('img') ? 'img' : 'none') + '|' + el.hidden}),
    B('testimonial', 'image_alt', 'A described photo', '.r7w__photo img', null, 'A described photo', {get: el => el.alt}),
    B('testimonial', 'image_alt', '', '.r7w__photo img', null, 'first-photo alt', {get: el => el.alt}),
  ],
  colours: sharedColours, fonts: sharedFonts, own: sharedOwn,
  variants: [...sharedVariants('testimonial-wall'),
    {id: 'collapse', values: ['none', 'mobile'], w: 375, sel: '.r7w', read: el => [getComputedStyle(el.querySelector('.r7t__more')).display, el.querySelector('.r7w__clip').getBoundingClientRect().height < el.querySelector('.r7w__wall').getBoundingClientRect().height - 40], reset: 'mobile'},
    {id: 'collapse', values: ['mobile', 'always'], sel: '.r7w', read: el => getComputedStyle(el.querySelector('.r7t__more')).display, reset: 'mobile'},
  ],
  covered: sharedCovered,
  independent: S('padding_top', 8, '.r7t', 'paddingTop', '8px'),
  addBlock: {type: 'testimonial', settings: {name: 'Added buyer', body: 'Added quote', rating: 3}},
  addBlockLive: {settings: {name: 'Live name'}, sel: '.r7w__item:last-child .r7t-card__name', get: txt, expect: 'Live name'},
  cardSel: '.r7w__card',
  async extra(t, {width, editing, ok}) {
    const sec = '#shopify-section-' + t.section.id, q = s => t.page.locator(sec + ' ' + s).first();
    const state = () => t.page.evaluate(sec => { const r = document.querySelector(sec + ' .r7w'), clip = r.querySelector('.r7w__clip'), wall = r.querySelector('.r7w__wall'), more = r.querySelector('.r7t__more'), c = getComputedStyle(clip); return {open: r.dataset.open, expanded: more.getAttribute('aria-expanded'), label: more.textContent.trim(), shown: getComputedStyle(more).display !== 'none', clip: Math.round(clip.getBoundingClientRect().height), wall: Math.round(wall.getBoundingClientRect().height - parseFloat(getComputedStyle(wall).columnGap)), mask: c.maskImage || c.webkitMaskImage, controls: more.getAttribute('aria-controls') === clip.id, h: Math.round(more.getBoundingClientRect().height)}; }, sec);
    const still = () => t.page.waitForTimeout(520);
    /* the builder remembers an open wall (a quote edited under its fold opens it): start from the closed wall */
    if ((await state()).open === 'true') { await t.page.evaluate(sec => document.querySelector(sec + ' .r7t__more').click(), sec); await wait2(t.page); await wait2(t.page); }
    /* phones only by default: at 375 the wall shows its first part, at 1366 all of it */
    let s = await state();
    if (width === 375) {
      ok(s.shown && s.open === 'false' && s.expanded === 'false' && s.label === 'Show more', 'the wall starts closed on a phone with a Show more button ' + JSON.stringify(s));
      ok(Math.abs(s.clip - Math.round(s.wall * 0.4)) <= 2 && /gradient/.test(s.mask), 'the closed wall shows 40% of itself and fades out ' + JSON.stringify(s));
      ok(s.controls && s.h >= 44, 'the button names the wall it opens and is 44px tall');
      const y0 = await t.page.evaluate(sec => [...document.querySelectorAll(sec + ' .r7w__card')].map(c => Math.round(c.offsetTop)), sec);
      await q('.r7t__more').click(); await still(); s = await state();
      ok(s.open === 'true' && s.expanded === 'true' && s.label === 'Show less' && Math.abs(s.clip - s.wall) <= 2 && !/gradient/.test(s.mask), 'Show more opens the whole wall ' + JSON.stringify(s));
      ok(JSON.stringify(y0) === JSON.stringify(await t.page.evaluate(sec => [...document.querySelectorAll(sec + ' .r7w__card')].map(c => Math.round(c.offsetTop)), sec)), 'no card moves when the wall opens');
      await q('.r7t__more').click(); await wait2(t.page); s = await state();
      ok(s.open === 'false' && s.expanded === 'false' && s.label === 'Show more' && Math.abs(s.clip - Math.round(s.wall * 0.4)) <= 2, 'Show less closes it again at once ' + JSON.stringify(s));
      ok(await q('.r7t__more').evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'the button is still on screen after closing');
      /* keyboard: the button is a real button */
      await q('.r7t__more').focus(); await t.page.keyboard.press('Enter'); await still();
      ok((await state()).open === 'true', 'Enter on the button opens the wall');
      await t.page.keyboard.press('Space'); await wait2(t.page);
      ok((await state()).open === 'false', 'Space closes it');
    } else {
      ok(!s.shown && Math.abs(s.clip - s.wall) <= 2 && !/gradient/.test(s.mask), 'a desktop shows the whole wall and no button by default ' + JSON.stringify(s));
      await t.emit({collapse: 'always'}); await wait2(t.page); await still(); s = await state();
      ok(s.shown && Math.abs(s.clip - Math.round(s.wall * 0.4)) <= 2, 'Always clips the wall on a desktop too ' + JSON.stringify(s));
      const x0 = await t.page.evaluate(sec => [...document.querySelectorAll(sec + ' .r7w__card')].map(c => Math.round(c.getBoundingClientRect().x) + ':' + Math.round(c.offsetTop)), sec);
      await q('.r7t__more').click(); await still(); s = await state();
      ok(s.open === 'true' && Math.abs(s.clip - s.wall) <= 2, 'and the button opens it ' + JSON.stringify(s));
      ok(JSON.stringify(x0) === JSON.stringify(await t.page.evaluate(sec => [...document.querySelectorAll(sec + ' .r7w__card')].map(c => Math.round(c.getBoundingClientRect().x) + ':' + Math.round(c.offsetTop)), sec)), 'no card changes column or place when the wall opens');
      await q('.r7t__more').click(); await wait2(t.page);
      await t.emit({collapse: 'mobile'}); await wait2(t.page);
    }
    /* an empty Show less label: the button goes away once the wall is open */
    await t.emit({collapse: 'always', less_label: ''}); await wait2(t.page);
    if ((await state()).open === 'true') { /* storefront redraw starts closed; the builder remembers an open wall */ } else { await q('.r7t__more').click(); await still(); }
    s = await state();
    ok(s.open === 'true' && !s.shown, 'no Show less label: the button is gone once open ' + JSON.stringify(s));
    await t.emit({collapse: 'mobile', less_label: 'Show less'}); await wait2(t.page);
    if (editing) {
      /* the builder: an open wall stays open over a redraw, a quote edited under the fold opens it, and so does a quote that was just added */
      await t.emit({collapse: 'always'}); await wait2(t.page);
      ok((await state()).open === 'true', 'the builder keeps the wall open after it was opened');
      await t.redraw({settings: {collapse: 'always'}}); await wait2(t.page);
      ok((await state()).open === 'true', 'and over a redraw');
      await t.page.evaluate(sec => document.querySelector(sec + ' .r7t__more').click(), sec); await wait2(t.page);
      ok((await state()).open === 'false', 'closed again by the button');
      /* the card that sits lowest in the wall (the last one on a phone, the foot of a column on a desktop) */
      const low = await t.page.evaluate(sec => { const cards = [...document.querySelectorAll(sec + ' .r7w__card')], clip = document.querySelector(sec + ' .r7w__clip'), tops = cards.map(c => c.getBoundingClientRect().top - clip.getBoundingClientRect().top), i = tops.indexOf(Math.max(...tops)); return {i, under: tops[i] > clip.clientHeight - 60}; }, sec);
      ok(low.under, 'the lowest card starts under the fold of the closed wall');
      await t.emit({name: 'Edited under the fold'}, t.blockId('testimonial', low.i)); await wait2(t.page); await still();
      ok((await state()).open === 'true', 'editing a quote under the fold opens the wall');
      await t.page.evaluate(sec => document.querySelector(sec + ' .r7t__more').click(), sec); await wait2(t.page);
      await t.emit({name: 'Edited at the top'}, t.blockId('testimonial', 0)); await wait2(t.page); await still();
      ok((await state()).open === 'false', 'editing the first quote leaves it closed');
      const r = t.rendered.find(x => x.section.id === t.section.id);
      await t.redraw({blocks: r.section.blocks.map(b => ({type: b.type, settings: b.settings})).concat([{type: 'testimonial', settings: {name: 'Just added', body: 'New quote'}}])}); await wait2(t.page);
      ok((await state()).open === 'true', 'a quote that was just added opens the wall');
      await t.redraw({settings: {collapse: 'mobile'}}); await wait2(t.page);
    }
  },
  async after(browser) {
    /* under five quotes the wall never collapses, whatever the setting */
    for (const editing of [true, false]) {
      const t = await mount(browser, 'testimonial-wall', {width: 375, editing, assets: [ASSET], blocks: [...HEAD_BLOCKS, ...quotes(4)], settings: {collapse: 'always'}});
      const s = await t.page.evaluate(() => { const r = document.querySelector('.r7w'); return [r.dataset.collapse, getComputedStyle(r.querySelector('.r7t__more')).display, Math.round(r.querySelector('.r7w__clip').getBoundingClientRect().height - r.querySelector('.r7w__wall').getBoundingClientRect().height + parseFloat(getComputedStyle(r.querySelector('.r7w__wall')).columnGap))]; });
      ok(s[0] === 'none' && s[1] === 'none' && Math.abs(s[2]) <= 2, 'wall ' + (editing ? 'editor' : 'storefront') + ': four quotes are never collapsed ' + s);
      if (editing) { await t.emit({collapse: 'mobile'}); await wait2(t.page); ok(await t.page.evaluate(() => document.querySelector('.r7w').dataset.collapse) === 'none', 'wall: still not collapsed after a live edit'); }
      ok(t.errors.length === 0, 'wall: no errors with four quotes ' + t.errors);
      await t.page.close();
    }
    /* no quotes and one quote: a tidy section, nothing broken */
    for (const n of [0, 1]) {
      const t = await mount(browser, 'testimonial-wall', {width: 375, assets: [ASSET], blocks: [...HEAD_BLOCKS, ...quotes(n)]});
      ok(await t.page.locator('.r7w__card').count() === n && await t.page.locator('.r7t__heading').isVisible() && await t.noOverflow() && t.errors.length === 0, 'wall: ' + n + ' quotes draws cleanly');
      ok(await t.page.evaluate(() => { const a = document.querySelector('.r7t__actions'); return a.getBoundingClientRect().height; }) === 0, 'wall: no empty button row with ' + n + ' quotes');
      await t.page.close();
    }
    /* fewer quotes than columns: as many columns as quotes, at a card's width, under the heading (live too) */
    for (const [n, align] of [[1, 'center'], [2, 'center'], [2, 'left']]) {
      const t = await mount(browser, 'testimonial-wall', {width: 1366, assets: [ASSET], blocks: [...HEAD_BLOCKS, ...quotes(n)], settings: {text_align: align}});
      const read = () => t.page.evaluate(() => { const w = document.querySelector('.r7w__wall'), c = [...document.querySelectorAll('.r7w__card')].map(x => x.getBoundingClientRect()), h = document.querySelector('.r7t__heading').getBoundingClientRect(); return {count: getComputedStyle(w).columnCount, width: Math.round(c[0].width), mid: Math.round((c[0].left + c[c.length - 1].right) / 2), tops: new Set(c.map(x => Math.round(x.top))).size, headMid: Math.round((h.left + h.right) / 2), left: Math.round(c[0].left), headLeft: Math.round(h.left)}; });
      let s = await read();
      ok(s.count === String(n) && s.width <= 441 && s.width >= 300 && s.tops === 1 && (align === 'center' ? Math.abs(s.mid - s.headMid) <= 2 : s.left === s.headLeft), 'wall: ' + n + ' quotes in a 3 column wall sit ' + (align === 'center' ? 'centred under' : 'in line with') + ' the heading ' + JSON.stringify(s));
      await t.emit({columns: 4}); await wait2(t.page); s = await read();
      ok(s.count === String(n) && s.width <= 441, 'wall: still ' + n + ' columns after a live columns edit ' + JSON.stringify(s));
      await t.page.close();
    }
    /* without scripts the whole wall shows (html.no-js) and the dead button is hidden */
    {
      const t = await mount(browser, 'testimonial-wall', {width: 375, assets: [], blocks: [...HEAD_BLOCKS, ...quotes(7)], inlineScripts: false});
      await t.page.evaluate(() => document.documentElement.classList.add('no-js')); await wait2(t.page);
      const s = await t.page.evaluate(() => { const r = document.querySelector('.r7w'), c = getComputedStyle(r.querySelector('.r7w__clip')); return [Math.round(r.querySelector('.r7w__clip').getBoundingClientRect().height - r.querySelector('.r7w__wall').getBoundingClientRect().height + parseFloat(getComputedStyle(r.querySelector('.r7w__wall')).columnGap)), getComputedStyle(r.querySelector('.r7t__more')).display, c.maskImage || c.webkitMaskImage]; });
      ok(Math.abs(s[0]) <= 2 && s[1] === 'none' && !/gradient/.test(s[2]), 'wall: without scripts every quote shows and the button is hidden ' + s);
      await t.page.close();
    }
    /* a photo keeps its proportions and reserves its space; long words wrap */
    {
      const t = await mount(browser, 'testimonial-wall', {width: 375, assets: [ASSET], blocks: [...HEAD_BLOCKS, {type: 'testimonial', settings: {name: 'Averyveryveryveryveryveryveryveryverylongnamewithoutspaces', body: 'Averyveryveryveryveryveryveryveryveryveryveryveryverylongwordwithoutanyspacesatall', image: IMG('wide'), role: 'Line'}}]});
      ok(await t.noOverflow() && await t.page.evaluate(() => { const c = document.querySelector('.r7w__card').getBoundingClientRect(); return [...document.querySelectorAll('.r7w__card *')].every(e => e.getBoundingClientRect().right <= c.right + 1); }), 'wall: long words and a photo stay inside the card at 375');
      ok(await t.page.evaluate(() => { const i = document.querySelector('.r7w__photo img'); return i.getAttribute('loading') === 'lazy' && i.alt === 'wide alt'; }), 'wall: the photo is lazy and has its alt text');
      await t.page.close();
    }
  },
};

const withProducts = quotes(5).map((q, i) => ({...q, settings: {...q.settings, product: [PANTS, OTHER, EMPTY, null, PANTS][i], ...(i === 0 ? {avatar: IMG('first-face')} : {})}}));
const PRODUCT = {
  name: 'testimonial-product', root: '.r7p',
  blocks: [...HEAD_BLOCKS, ...withProducts, BTN],
  inherit: [...sharedInherit, ['.r7p__track', 'columnGap', '20px'], ['.r7p__ptitle', 'color', WHITE], ['.r7p__arrow', 'color', WHITE], ['.r7p__arrow', 'borderTopColor', 'rgb(68, 85, 102)']],
  controls: [
    ...sharedControls('testimonial-product'),
    {id: 'cards_desktop', value: 2, w: 1366, sel: '.r7p__track', get: el => Math.round((el.clientWidth - 2 * parseFloat(getComputedStyle(el).paddingLeft) + parseFloat(getComputedStyle(el).columnGap)) / (el.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap)) * 100) / 100, expect: 2},
    {id: 'cards_desktop', value: 4, w: 1366, sel: '.r7p__track', get: el => Math.round((el.clientWidth - 2 * parseFloat(getComputedStyle(el).paddingLeft) + parseFloat(getComputedStyle(el).columnGap)) / (el.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap)) * 100) / 100, expect: 4},
    {id: 'cards_desktop', value: 4, w: 375, sel: '.r7p__track', get: el => Math.round(el.firstElementChild.getBoundingClientRect().width), expect: v => v > 250 && v < 320},
    S('show_arrows', false, '.r7p__arrows', 'display', 'none'),
    S('show_progress', false, '.r7p__bar', 'visibility', 'hidden'),
    S('show_progress', false, '.r7p__nav', 'display', 'none', {pre: {show_arrows: false}}),
    {id: 'mobile_peek', value: false, w: 375, sel: '.r7p__track', get: el => Math.round(el.firstElementChild.getBoundingClientRect().width - (el.clientWidth - 2 * parseFloat(getComputedStyle(el).paddingLeft))), expect: 0},
    {id: 'mobile_peek', value: true, w: 375, sel: '.r7p__track', get: el => Math.round((el.clientWidth - 2 * parseFloat(getComputedStyle(el).paddingLeft)) / el.firstElementChild.getBoundingClientRect().width * 100) / 100, expect: v => v > 1.1 && v < 1.2},
    {id: 'mobile_peek', value: false, w: 1366, sel: '.r7p__track', get: el => Math.round((el.clientWidth - 2 * parseFloat(getComputedStyle(el).paddingLeft) + parseFloat(getComputedStyle(el).columnGap)) / (el.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap)) * 100) / 100, expect: 3},
    /* the product is drawn by the store's data, so it changes with a redraw */
    B('testimonial', 'product', OTHER, '.r7p__card .r7p__product', null, 'A|/products/other-tee|Other Tee|R$211.93R$137.77|/img/red.svg?width=168||lazy', {live: false, get: el => [el.tagName, el.getAttribute('href'), el.querySelector('.r7p__ptitle').textContent.trim(), el.querySelector('.r7p__price').textContent.trim(), el.querySelector('img').getAttribute('src'), el.querySelector('img').alt, el.querySelector('img').getAttribute('loading')].join('|')}),
  ],
  colours: [...sharedColours, S('name_color', RED, '.r7p__ptitle', 'color', R, {theme: WHITE}), S('name_color', RED, '.r7p__arrow', 'color', R, {theme: WHITE, settle: 260}), S('text_color', RED, '.r7p__price', 'color', R, {theme: TEXT})],
  fonts: sharedFonts, own: sharedOwn,
  variants: sharedVariants('testimonial-product'),
  covered: sharedCovered,
  independent: S('padding_top', 8, '.r7t', 'paddingTop', '8px'),
  addBlock: {type: 'testimonial', settings: {name: 'Added buyer', body: 'Added quote', rating: 3, product: OTHER}},
  addBlockLive: {settings: {name: 'Live name'}, sel: '.r7p__card:last-child .r7t-card__name', get: txt, expect: 'Live name'},
  cardSel: '.r7p__card',
  async extra(t, {width, editing, ok}) {
    const sec = '#shopify-section-' + t.section.id, T = sec + ' .r7p__track', q = s => t.page.locator(sec + ' ' + s).first();
    const m = () => t.page.evaluate(T => { const el = document.querySelector(T), c = el.firstElementChild, g = parseFloat(getComputedStyle(el).columnGap); return {left: Math.round(el.scrollLeft), max: el.scrollWidth - el.clientWidth, step: c.getBoundingClientRect().width + g, x: Math.round(c.getBoundingClientRect().x), pad: parseFloat(getComputedStyle(el).paddingLeft), frame: Math.round(el.parentElement.getBoundingClientRect().x + parseFloat(getComputedStyle(el.parentElement).paddingLeft))}; }, T);
    const nav = () => t.page.evaluate(sec => { const r = document.querySelector(sec + ' .r7p'); return {prev: r.querySelector('[data-r7t-prev]').disabled, next: r.querySelector('[data-r7t-next]').disabled, f: r.querySelector('[data-r7t-fill]').style.getPropertyValue('--r7p-f'), w: Math.round(r.querySelector('[data-r7t-fill]').getBoundingClientRect().width), bar: Math.round(r.querySelector('.r7p__bar').getBoundingClientRect().width), shown: getComputedStyle(r.querySelector('.r7p__nav')).display !== 'none', size: Math.round(r.querySelector('[data-r7t-next]').getBoundingClientRect().width)}; }, sec);
    /* real product data, linked, lazy; the builder marks an empty picker, the storefront leaves it out */
    const chips = await t.page.evaluate(sec => [...document.querySelectorAll(sec + ' .r7p__card')].map(c => { const p = c.querySelector('.r7p__product'); return p ? [p.tagName, p.getAttribute('href') || '', (p.querySelector('.r7p__ptitle') || {}).textContent || '', (p.querySelector('.r7p__price') || {}).textContent || '', !!p.querySelector('img'), Math.round(p.getBoundingClientRect().height)].join('|') : 'none'; }), sec);
    ok(/^A\|\/products\/pants-down\|Pants Down\|R\$211\.93R\$137\.77\|true\|/.test(chips[0]), 'the picked product shows its own link, title, compare price and price ' + chips[0]);
    ok(/^A\|\/products\/no-pics\|No Pictures\|.*\|false\|/.test(chips[2]), 'a product without a picture shows a placeholder, not a broken image ' + chips[2]);
    ok(editing ? /^DIV\|\|\|\|false\|/.test(chips[3]) : chips[3] === 'none', 'an empty picker: ' + (editing ? 'the builder shows where the product goes' : 'the storefront shows the quote alone') + ' ' + chips[3]);
    ok(chips.filter(c => c.startsWith('A|')).every(c => +c.split('|').pop() >= 44), 'the product link is at least 44px tall');
    ok(await t.page.evaluate(sec => [...document.querySelectorAll(sec + ' .r7p__card')].every((c, i, a) => Math.abs(c.getBoundingClientRect().height - a[0].getBoundingClientRect().height) < 1), sec), 'the cards of the row are the same height');
    /* the row is a native scroller */
    const css = await q('.r7p__track').evaluate(el => { const c = getComputedStyle(el); return [c.overflowX, c.scrollSnapType, c.overscrollBehaviorX, c.scrollbarWidth, c.touchAction, getComputedStyle(el.firstElementChild).scrollSnapAlign, el.tabIndex, el.getAttribute('role'), el.getAttribute('aria-label')].join('|'); });
    ok(css === 'auto|x mandatory|contain|none|pan-x pan-y|start|0|region|Heading words', 'the row scrolls natively, snaps and never traps the page ' + css);
    let a = await m(), n = await nav();
    ok(a.left === 0 && a.x === a.frame && n.prev && !n.next && n.shown && n.size >= 44, 'starts at the first card, aligned with the heading, previous arrow off ' + JSON.stringify([a, n]));
    ok(n.f === '' && Math.abs(n.w / n.bar - (width === 375 ? 1.15 : 3) / 5) < 0.02, 'the progress line starts at cards in view over cards, printed by the CSS ' + JSON.stringify(n));
    /* a finger: scrollLeft moves it, and it snaps to a card */
    await t.page.evaluate(T => { document.querySelector(T).scrollLeft = document.querySelector(T).firstElementChild.getBoundingClientRect().width * 0.8; }, T);
    await settle(t.page, T); a = await m(); n = await nav();
    ok(Math.abs(a.left - a.step) <= 2, 'a touch style scroll snaps to the second card (' + a.left + ' / ' + Math.round(a.step) + ')');
    ok(!n.prev && n.f !== '' && n.w / n.bar > (width === 375 ? 1.15 : 3) / 5 + 0.05, 'the previous arrow wakes up and the progress line grows ' + JSON.stringify(n));
    /* arrows */
    await q('[data-r7t-next]').click(); await settle(t.page, T); a = await m();
    ok(Math.abs(a.left - Math.min(a.max, 2 * a.step)) <= 2, 'next moves one card on (' + a.left + ')');
    await q('[data-r7t-prev]').click(); await settle(t.page, T); a = await m();
    ok(Math.abs(a.left - a.step) <= 2, 'previous moves one card back (' + a.left + ')');
    /* keys on the focused row */
    await q('.r7p__track').focus();
    await t.page.keyboard.press('ArrowRight'); await settle(t.page, T); a = await m();
    ok(Math.abs(a.left - Math.min(a.max, 2 * a.step)) <= 2, 'the right arrow key moves one card on (' + a.left + ')');
    await t.page.keyboard.press('ArrowLeft'); await settle(t.page, T); a = await m();
    ok(Math.abs(a.left - a.step) <= 2, 'the left arrow key moves one card back (' + a.left + ')');
    await t.page.keyboard.press('End'); await settle(t.page, T); a = await m(); n = await nav();
    ok(Math.abs(a.left - a.max) <= 2 && n.next && !n.prev && Math.abs(n.w - n.bar) <= 2, 'End goes to the last card: next arrow off, progress line full ' + JSON.stringify([a.left, a.max, n]));
    await t.page.keyboard.press('Home'); await settle(t.page, T); a = await m(); n = await nav();
    ok(a.left === 0 && n.prev && !n.next && n.f === '', 'Home goes back to the start: previous arrow off ' + JSON.stringify(n));
    /* an unrelated live edit keeps the row where it is */
    await t.page.evaluate(T => { const el = document.querySelector(T); el.style.scrollBehavior = 'auto'; el.scrollLeft = el.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap); }, T);
    await settle(t.page, T); const before = (await m()).left;
    if (editing) {
      await t.emit({padding_top: 64}); await t.emit({name: 'Still here'}, t.blockId('testimonial', 1)); await wait2(t.page);
      ok((await m()).left === before && before > 0, 'a live edit keeps the row where it is (' + before + ')');
      await t.emit({padding_top: 60});
    }
    await t.page.evaluate(T => { const el = document.querySelector(T); el.scrollLeft = 0; el.style.scrollBehavior = ''; }, T); await settle(t.page, T);
    /* the page still scrolls up and down with the pointer over the row (nothing is prevented) */
    ok(await t.page.evaluate(T => { const el = document.querySelector(T); let prevented = false; const e = new WheelEvent('wheel', {deltaY: 60, bubbles: true, cancelable: true}); el.dispatchEvent(e); prevented = e.defaultPrevented; const te = new Event('touchmove', {bubbles: true, cancelable: true}); el.dispatchEvent(te); return !prevented && !te.defaultPrevented; }, T), 'wheel and touchmove over the row are never prevented');
  },
  async after(browser) {
    /* everything fits: no arrows, no line; one card and no cards draw cleanly */
    for (const [n, width, want] of [[3, 1366, false], [4, 1366, true], [2, 800, false], [3, 800, true], [1, 375, false], [2, 375, true], [0, 375, null]]) {
      const t = await mount(browser, 'testimonial-product', {width, assets: [ASSET], blocks: [...HEAD_BLOCKS, ...quotes(n)]});
      await wait2(t.page);
      const shown = n ? await t.page.evaluate(() => getComputedStyle(document.querySelector('.r7p__nav')).display !== 'none') : null;
      ok(shown === want && await t.noOverflow() && t.errors.length === 0, 'product: ' + n + ' cards at ' + width + (want ? ' show' : ' hide') + ' the arrows and line (' + shown + ') ' + t.errors);
      if (n) ok(await t.page.evaluate(() => { const el = document.querySelector('.r7p__track'); return el.scrollWidth - el.clientWidth > 2; }) === want, 'product: ' + n + ' cards at ' + width + (want ? ' scroll' : ' do not scroll'));
      if (!n) ok(await t.page.locator('.r7t__heading').isVisible() && await t.page.locator('.r7p__track').count() === 0, 'product: no quotes leaves the heading and no empty row');
      await t.page.close();
    }
    /* cards that all fit sit under a centred heading */
    {
      const t = await mount(browser, 'testimonial-product', {width: 1366, assets: [ASSET], blocks: [...HEAD_BLOCKS, ...quotes(1)], settings: {text_align: 'center'}});
      const s = await t.page.evaluate(() => { const c = document.querySelector('.r7p__card').getBoundingClientRect(), h = document.querySelector('.r7t__heading').getBoundingClientRect(); return [Math.round((c.left + c.right) / 2), Math.round((h.left + h.right) / 2)]; });
      ok(Math.abs(s[0] - s[1]) <= 2, 'product: one card sits under a centred heading ' + s);
      await t.emit({text_align: 'left'}); await wait2(t.page);
      ok(await t.page.evaluate(() => Math.round(document.querySelector('.r7p__card').getBoundingClientRect().left) === Math.round(document.querySelector('.r7t__heading').getBoundingClientRect().left)), 'product: and in line with a left heading');
      await t.page.close();
    }
    /* sold out and no compare price */
    {
      const sold = {...OTHER, available: false, compare_at_price: 0, title: 'Sold <b>Tee</b>'};
      const t = await mount(browser, 'testimonial-product', {width: 1366, assets: [ASSET], blocks: [...HEAD_BLOCKS, {type: 'testimonial', settings: {name: 'Buyer', body: 'Quote', product: sold}}]});
      const s = await t.page.evaluate(() => { const p = document.querySelector('.r7p__product'); return [p.querySelector('.r7p__ptitle').textContent, !!p.querySelector('.r7p__ptitle b'), !!p.querySelector('s'), !!p.querySelector('.r7p__soldout'), p.querySelector('.r7p__price').textContent.trim()].join('|'); });
      ok(/^Sold <b>Tee<\/b>\|false\|false\|true\|R\$137\.77/.test(s), 'product: a sold out product says so, shows no compare price and its title is escaped ' + s);
      await t.page.close();
    }
    /* reduced motion: the arrows move the row at once */
    {
      const t = await mount(browser, 'testimonial-product', {width: 1366, assets: [ASSET], blocks: [...HEAD_BLOCKS, ...quotes(6)], reducedMotion: 'reduce'});
      await t.page.locator('[data-r7t-next]').click(); await wait2(t.page);
      const s = await t.page.evaluate(() => { const el = document.querySelector('.r7p__track'); return [Math.round(el.scrollLeft), Math.round(el.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap))]; });
      ok(Math.abs(s[0] - s[1]) <= 2, 'product: under reduced motion an arrow moves the row without animating ' + s);
      await t.page.close();
    }
    /* right to left: the arrows still move one card */
    {
      const t = await mount(browser, 'testimonial-product', {width: 1366, assets: [ASSET], blocks: [...HEAD_BLOCKS, ...quotes(6)]});
      await t.page.evaluate(() => { document.documentElement.dir = 'rtl'; }); await wait2(t.page); await t.page.evaluate(() => window.dispatchEvent(new Event('resize'))); await wait2(t.page);
      await t.page.locator('[data-r7t-next]').click(); const left = await settle(t.page, '.r7p__track');
      const step = await t.page.evaluate(() => { const el = document.querySelector('.r7p__track'); return el.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap); });
      ok(Math.abs(Math.abs(left) - step) <= 2 && await t.page.evaluate(() => !document.querySelector('[data-r7t-prev]').disabled), 'product: right to left, next moves one card (' + left + ')');
      await t.page.close();
    }
  },
};

/* ---------- the run ---------- */
async function run(spec, browser) {
  const name = spec.name, R0 = spec.root;
  const {schema, raw} = schemaOf(name);
  ok(schemaProblems(name).length === 0, name + ': schema problems ' + JSON.stringify(schemaProblems(name)));
  /* the file: line 1, the controller on line 2, the theme type snippet, a schema that holds only "shopify" */
  const lines = raw.split('\n');
  ok(lines[0] === '<template compat="shopify">' && lines[1] === "<script src=\"{{ 'live-r7-testimonials.js' | asset_url }}\" defer=\"defer\"></script>" && lines[2] === "{% render 'theme-type' %}", name + ': first three lines');
  ok(Object.keys(JSON.parse(raw.split('<schema>')[1].split('</schema>')[0])).join() === 'shopify', name + ': the schema holds only "shopify"');
  ok(schema.name.length <= 25 && schema.presets[0].name === schema.name && schema.presets[0].category === 'Testimonials', name + ': name, preset name and category');
  const others = require('fs').readdirSync(require('path').join(__dirname, '../sections')).filter(f => f.endsWith('.storelib') && f !== name + '.storelib').filter(f => { try { return JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../sections', f), 'utf8').split('<schema>')[1].split('</schema>')[0]).shopify?.name === schema.name; } catch (_) { return false; } });
  ok(others.length === 0, name + ': no other section is called ' + schema.name + ' ' + others);
  /* every non hidden control has a check */
  const covered = new Set([...(spec.controls || []), ...(spec.colours || []), ...(spec.fonts || []), ...(spec.variants || [])].map(c => (c.block || '') + ':' + c.id).concat(spec.covered || [], [':color_scheme']));
  const visible = [...schema.settings.filter(x => x.id && !x.hidden && x.type !== 'header').map(x => ':' + x.id), ...(schema.blocks || []).flatMap(b => (b.settings || []).filter(x => x.id && !x.hidden && x.type !== 'header').map(x => b.type + ':' + x.id))];
  for (const id of visible) ok(covered.has(id), name + ': control ' + id + ' has a check');
  for (const b of schema.blocks) for (const x of b.settings.filter(x => x.id)) ok([...(spec.controls || []), ...(spec.colours || []), ...(spec.variants || [])].some(c => c.block === b.type && c.id === x.id) || spec.covered.includes(b.type + ':' + x.id), name + ': block setting ' + b.type + '.' + x.id + ' is tested');
  /* groups in the shared order, colour scheme first, the category's spacing ids */
  const headers = schema.settings.filter(x => x.type === 'header').map(x => x.content);
  const ORDER = ['General', 'Content', 'Layout', 'Media', 'Appearance', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'];
  ok(headers.every(h => ORDER.includes(h)) && headers.map(h => ORDER.indexOf(h)).every((v, i, a) => !i || v > a[i - 1]), name + ': groups in the shared order ' + headers.join(', '));
  ok(schema.settings.filter(x => x.id).slice(0, 3).map(x => x.id).join() === 'color_scheme,section_width,reset_spacing', name + ': General starts with colour scheme, width, reset spacing');
  for (const id of ['padding_top', 'padding_bottom', 'padding_top_mobile', 'padding_bottom_mobile', 'section_margin_top_desktop', 'section_margin_bottom_desktop', 'section_margin_top_mobile', 'section_margin_bottom_mobile', 'enable_custom_style', 'enable_custom_fonts', 'heading_font', 'body_font']) ok(schema.settings.some(x => x.id === id), name + ': has ' + id);
  for (const x of [...schema.settings, ...schema.blocks.flatMap(b => b.settings)].filter(x => x.type === 'select' && x.options.length <= 3)) ok(x.options.every(o => o.label.split(' ').length <= 2), name + ': ' + x.id + ' options fit a row of buttons');
  /* nothing invented: no rating, review, name, price, count or date in a default or the preset */
  const BAD = /verified|@\w|\b(19|20)\d\d\b|\d+\s*(%|stars?|reviews?|customers?|orders?)|[$€£]\s*\d|—|unlock|elevate|seamless|powerful|effortless|supercharge|transform|\bbest\b|\bjohn\b|\bjane\b|\bsarah\b/i;
  for (const [bt, x] of [...schema.settings.map(x => ['', x]), ...schema.blocks.flatMap(b => b.settings.map(x => [b.type, x]))]) {
    if (!x.id) continue;
    if (x.id === 'rating') ok(x.default === 0, name + ': ' + bt + '.rating defaults to no stars');
    if (typeof x.default === 'string' && /text|richtext|textarea/.test(x.type)) ok(!BAD.test(x.default), name + ': ' + bt + '.' + x.id + ' default invents nothing (' + x.default + ')');
    for (const k of ['label', 'info']) if (x[k]) ok(!/—|shopify|liquid/i.test(x[k]), name + ': ' + bt + '.' + x.id + ' ' + k + ' is plain');
  }
  const preset = schema.presets[0];
  ok(!BAD.test(JSON.stringify(preset)), name + ': the preset invents nothing');
  ok(preset.blocks.every(b => !b.settings || Object.keys(b.settings).every(k => k === 'body')), name + ': the preset sets only guidance words, no rating, name or product');
  ok(!preset.settings, name + ': the preset is the schema defaults');
  /* reveal: the scroll animation hook is printed only when Theme settings animate and Reveal on scroll is on */
  for (const [anim, reveal, want] of [['fade_in', true, true], ['fade_in', false, false], ['none', true, false]]) {
    const r = await render(name, {theme: {scroll_animation: anim}, settings: {reveal}});
    ok(r.scripts.some(s => /scroll-trigger/.test(s)) === want, name + ': reveal ' + reveal + ' with theme animation ' + anim + (want ? ' hooks' : ' does not hook') + ' the scroll animation');
  }

  /* the preset as it is added: tidy, nothing invented on the page, no stars, no pictures needed */
  for (const [width, editing] of ALL) {
    const tag = name + '@' + width + (editing ? ' editor' : ' storefront') + ' preset';
    const t = await mount(browser, name, {width, editing, assets: [ASSET]});
    await wait2(t.page);
    const s = await t.page.evaluate(() => { const r = document.querySelector('[data-r7t-root]'); return {text: r.innerText, stars: [...r.querySelectorAll('.r7t-stars')].filter(e => e.getClientRects().length).length, imgs: r.querySelectorAll('img').length, cards: r.querySelectorAll('.r7t-card').length, h2: r.querySelectorAll('h2').length, h1: r.querySelectorAll('h1').length, h3: r.querySelectorAll('h3').length, height: Math.round(r.getBoundingClientRect().height)}; });
    ok(s.stars === 0 && s.imgs === 0 && !BAD.test(s.text), tag + ': no stars, no pictures, nothing invented');
    ok(s.cards === preset.blocks.filter(b => b.type === 'testimonial').length && s.h2 === 1 && s.h1 === 0 && s.h3 === s.cards, tag + ': one h2, an h3 for each card ' + JSON.stringify(s));
    ok(s.height > 200 && s.height < (width === 375 ? 1200 : 900), tag + ': a sensible height (' + s.height + ')');
    ok(await t.noOverflow() && t.errors.length === 0, tag + ': no sideways scroll, no errors ' + t.errors);
    await t.page.close();
  }

  for (const [width, editing] of ALL) {
    const tag = name + '@' + width + (editing ? ' editor' : ' storefront');
    const t = await mount(browser, name, {width, editing, assets: [ASSET], blocks: spec.blocks});
    await wait2(t.page);
    /* theme inheritance, with the real Theme settings priority rules on */
    for (const [sel, prop, want] of spec.inherit) { const got = await value(t, {sel, prop}); ok(same(got, want), tag + ': inherits ' + sel + ' ' + prop + ' = ' + want + ' (got ' + got + ')'); }
    await t.page.hover('#shopify-section-' + t.section.id + ' .r7t__btn'); await wait2(t.page);
    ok(await value(t, {sel: '.r7t__btn', prop: 'backgroundColor'}) === R, tag + ': the theme button turns to the theme hover colour');
    await t.page.mouse.move(0, 0);
    ok(await t.page.evaluate(() => !!window.MateriaLiveR7Testimonials && window.MateriaLiveR7Testimonials.count() === 1), tag + ': the controller took the section');
    ok(await t.page.evaluate(() => !!document.querySelector('[data-r7t-root]').hasAttribute('data-r7t-settings')) === editing, tag + ': settings JSON is printed in the builder only');
    /* scheme switch, live and after a redraw */
    await t.emit({color_scheme: 'alt-scheme'}); await wait2(t.page);
    ok(await value(t, {sel: R0, prop: 'backgroundColor'}) === 'rgb(250, 250, 250)' && await value(t, {sel: '.r7t__heading', prop: 'color'}) === 'rgb(16, 16, 16)', tag + ': scheme switch live');
    await t.emit({color_scheme: 'default-color-scheme'}); await wait2(t.page);
    ok(await value(t, {sel: R0, prop: 'backgroundColor'}) === BG, tag + ': scheme back live');
    if (editing) {
      await t.redraw({settings: {color_scheme: 'alt-scheme'}});
      ok(await value(t, {sel: R0, prop: 'backgroundColor'}) === 'rgb(250, 250, 250)', tag + ': scheme switch after redraw');
      await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    }
    const apply = async (c, settings, live) => {
      const bid = c.block ? t.blockId(c.block, c.n || 0) : null;
      if (live) { await t.emit(settings, bid || undefined); await wait2(t.page); return; }
      if (!bid) { await t.redraw({settings}); return; }
      const r = t.rendered.find(x => x.section.id === t.section.id);
      await t.redraw({blocks: r.section.blocks.map(b => ({type: b.type, settings: b.id === bid ? {...b.settings, ...settings} : b.settings}))});
    };
    const orig = (c, ids) => { const sec = t.rendered.find(x => x.section.id === t.section.id).section; const src = c.block ? sec.blocks.find(b => b.id === t.blockId(c.block, c.n || 0)).settings : sec.settings; return Object.fromEntries(ids.map(k => [k, src[k] === undefined ? null : src[k]])); };
    const one = async (c, live, want = c.expect, label = '') => {
      if (c.w && c.w !== width) return;
      if (c.live === false && live) return;
      const pre = c.pre || {}, preBlock = c.preBlock || {};
      const keep = orig(c, [c.id, ...Object.keys(c.block ? preBlock : pre)]);
      const keepSec = c.block && Object.keys(pre).length ? orig({}, Object.keys(pre)) : null;
      if (c.block && Object.keys(pre).length) await apply({}, pre, live);
      await apply(c, {...(c.block ? preBlock : pre), [c.id]: c.value}, live);
      /* an element with a colour transition is read once it has finished */
      if (c.settle) await t.page.waitForTimeout(c.settle);
      const got = await value(t, c);
      ok(same(got, want), tag + (live ? ' live' : ' redraw') + ': ' + (c.block ? c.block + '.' : '') + c.id + label + ' = ' + JSON.stringify(c.value).slice(0, 30) + ' -> ' + c.sel + ' ' + (c.prop || c.attr || 'value') + ' = ' + want + ' (got ' + got + ')');
      await apply(c, keep, live);
      if (keepSec) await apply({}, keepSec, live);
    };
    for (const c of spec.controls) { await one(c, true); if (editing) await one(c, false); }
    /* colours: on lands, off gives the theme value back */
    for (const c of spec.colours) {
      const on = {...c, pre: {...(c.pre || {}), ...(c.block ? {} : {enable_custom_style: true})}, preBlock: c.block ? {enable_custom_style: true} : {}};
      await one(on, true); if (editing) await one(on, false);
      const off = {...c, pre: {...(c.pre || {}), ...(c.block ? {} : {enable_custom_style: false})}, preBlock: c.block ? {enable_custom_style: false} : {}};
      await one(off, true, c.theme, ' (custom off)'); if (editing) await one(off, false, c.theme, ' (custom off)');
    }
    /* fonts: the picked family reaches the element and what is inside it */
    for (const c of spec.fonts) {
      const f = {...c, value: {family: 'Courier New', fallback_families: 'monospace', style: 'normal', weight: 400}, pre: {enable_custom_fonts: true}, prop: 'fontFamily', expect: /Courier New/};
      await one(f, true); if (editing) await one(f, false);
      for (const d of c.desc || []) await one({...f, sel: d}, true);
    }
    /* theme priority: data-own-font while on (the custom font wins over the !important theme rule), gone and the theme font back while off */
    for (const o of spec.own) {
      await t.emit(o.on); await wait2(t.page);
      ok(await t.page.locator('#shopify-section-' + t.section.id + ' ' + o.attrSel).first().evaluate((el, a) => el.hasAttribute(a), o.attr), tag + ' live: ' + o.attr + ' on ' + o.attrSel);
      for (const s of [o.sel, ...(o.desc || [])]) { const got = await value(t, {sel: s, prop: o.prop}); ok(same(got, o.expect), tag + ' live: own ' + o.prop + ' wins on ' + s + ' (got ' + got + ')'); }
      if (editing) { await t.redraw({settings: o.on}); for (const s of [o.sel, ...(o.desc || [])]) ok(same(await value(t, {sel: s, prop: o.prop}), o.expect), tag + ' redraw: own ' + o.prop + ' wins on ' + s); ok(await t.page.locator('#shopify-section-' + t.section.id + ' ' + o.attrSel).first().evaluate((el, a) => el.hasAttribute(a), o.attr), tag + ' redraw: ' + o.attr + ' printed'); }
      await t.emit(o.off); await wait2(t.page);
      ok(await t.page.locator('#shopify-section-' + t.section.id + ' ' + o.attrSel).first().evaluate((el, a) => !el.hasAttribute(a), o.attr), tag + ' live: ' + o.attr + ' off');
      for (const s of [o.sel, ...(o.desc || [])]) { const got = await value(t, {sel: s, prop: o.prop}); ok(same(got, o.theme), tag + ' live: theme ' + o.prop + ' back on ' + s + ' (got ' + got + ')'); }
      if (editing) { await t.redraw({settings: o.off}); ok(same(await value(t, {sel: o.sel, prop: o.prop}), o.theme), tag + ' redraw: theme ' + o.prop + ' back'); }
    }
    /* every option of a select looks different */
    for (const v of spec.variants) {
      if (!editing || width !== (v.w || 1366)) continue;
      const seen = [], bid = v.block ? t.blockId(v.block, 0) : undefined;
      for (const val of v.values) { await t.emit({[v.id]: val}, bid); await wait2(t.page); await t.page.waitForTimeout(v.id === 'collapse' ? 450 : 0); seen.push(JSON.stringify(await t.page.locator('#shopify-section-' + t.section.id + ' ' + v.sel).first().evaluate(v.read))); }
      ok(new Set(seen).size === seen.length, tag + ': ' + v.id + ' options look different ' + seen.join(' | '));
      await t.emit({[v.id]: v.reset !== undefined ? v.reset : v.values[0]}, bid); await wait2(t.page);
    }
    /* no picture is loaded again by an unrelated edit */
    {
      const mark = () => t.page.evaluate(sel => [...document.querySelectorAll(sel + ' img')].map(i => { i.__r7 = i.__r7 || Math.random(); return i.__r7 + '|' + i.getAttribute('src'); }), '#shopify-section-' + t.section.id + ' ' + spec.cardSel);
      const a = await mark();
      if (editing) {
        await t.emit({padding_top: 72, card_gap: 24, enable_custom_style: true, quote_color: RED}); await t.emit({name: 'Another name', rating: 2, role: 'Another line'}, t.blockId('testimonial', 0)); await t.emit({text: 'Another heading'}, t.blockId('heading')); await wait2(t.page);
        ok(a.length > 0 && JSON.stringify(a) === JSON.stringify(await mark()), tag + ': unrelated edits keep every picture element and its address (' + a.length + ')');
        await t.emit({padding_top: 60, card_gap: 20, enable_custom_style: false, quote_color: ''}); await t.emit({name: 'Buyer 1', rating: 4.5, role: 'Line 1'}, t.blockId('testimonial', 0)); await t.emit({text: 'Heading <strong>words</strong>'}, t.blockId('heading')); await wait2(t.page);
      } else ok(a.length > 0, tag + ': pictures drawn (' + a.length + ')');
    }
    if (spec.extra) await spec.extra(t, {width, editing, ok: (c, m) => ok(c, tag + ': ' + m)});
    /* tap targets and focus rings */
    ok(await t.page.evaluate(() => [...document.querySelectorAll('[data-r7t-root] :is(a, button)')].filter(e => e.getClientRects().length).every(e => e.getBoundingClientRect().height >= 44)), tag + ': every link and button is at least 44px tall');
    ok(await t.noOverflow(), tag + ': no sideways scroll');
    ok(t.errors.length === 0, tag + ': no errors ' + t.errors.join(' | '));
    await t.page.close();
  }

  /* the theme rules switched off (Theme settings > Typography and Buttons priority off): the section still follows the theme */
  {
    const t = await mount(browser, name, {width: 1366, assets: [ASSET], blocks: spec.blocks, priority: 'off'});
    await wait2(t.page);
    for (const [sel, prop, want] of spec.inherit) { const got = await value(t, {sel, prop}); ok(same(got, want), name + ' priority off: inherits ' + sel + ' ' + prop + ' = ' + want + ' (got ' + got + ')'); }
    await t.page.close();
  }

  /* two instances stay independent; an added block; a redraw sets the section up once */
  {
    const t = await mount(browser, name, {width: 1366, assets: [ASSET], instances: [{uid: 'a', blocks: spec.blocks}, {uid: 'b', blocks: spec.blocks}]});
    const c = spec.independent, before = await value(t, c, 'b'), beforeName = await value(t, {sel: '.r7t-card__name', get: txt}, 'b');
    await t.emit({[c.id]: c.value}, undefined, 'a'); await t.emit({name: 'Only in a'}, t.blockId('testimonial', 0, 'a'), 'a'); await wait2(t.page);
    ok(same(await value(t, c, 'a'), c.expect) && await value(t, {sel: '.r7t-card__name', get: txt}, 'a') === 'Only in a', name + ': instance a changed');
    ok(await value(t, c, 'b') === before && await value(t, {sel: '.r7t-card__name', get: txt}, 'b') === beforeName, name + ': instance b unchanged');
    ok(await t.page.evaluate(() => document.querySelectorAll('[id]').length === new Set([...document.querySelectorAll('[id]')].map(e => e.id)).size), name + ': no id is used twice with two instances');
    const count = () => t.page.evaluate(() => window.MateriaLiveR7Testimonials.count());
    ok(await count() === 2, name + ': two roots tracked');
    const r = t.rendered.find(x => x.section.id === 'a');
    const blocks = r.section.blocks.filter(b => b.type !== 'button').map(b => ({type: b.type, settings: b.settings})).concat([spec.addBlock]);
    await t.redraw({uid: 'a', blocks}); await t.redraw({uid: 'a', blocks}); await wait2(t.page);
    ok(await count() === 2, name + ': redraws keep one root for each instance');
    ok(await t.page.evaluate(() => [...window.MateriaLiveR7Testimonials.roots.values()].every(s => s.inits === 1)), name + ': each root set up once');
    ok(await t.page.locator('#shopify-section-a ' + spec.cardSel).count() === blocks.filter(b => b.type === 'testimonial').length, name + ': the added block is drawn');
    const last = t.rendered.find(x => x.section.id === 'a').section.blocks.slice(-1)[0];
    await t.emit(spec.addBlockLive.settings, last.id, 'a'); await wait2(t.page);
    ok(same(await value(t, spec.addBlockLive, 'a'), spec.addBlockLive.expect), name + ': the added block is live editable');
    /* one listener after two redraws: one click is one move */
    if (name === 'testimonial-wall') {
      await t.emit({collapse: 'always'}, undefined, 'a'); await wait2(t.page);
      const open0 = await t.page.evaluate(() => document.querySelector('#shopify-section-a .r7w').dataset.open);
      await t.page.locator('#shopify-section-a .r7t__more').click(); await wait2(t.page);
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-a .r7w').dataset.open) !== open0, name + ': one click flips the wall once after two redraws');
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-b .r7w').dataset.open) === 'false', name + ': the other wall did not open');
    } else {
      await t.page.locator('#shopify-section-a [data-r7t-next]').click(); const left = await settle(t.page, '#shopify-section-a .r7p__track');
      const step = await t.page.evaluate(() => { const el = document.querySelector('#shopify-section-a .r7p__track'); return el.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap); });
      ok(Math.abs(left - step) <= 2, name + ': one click moves one card after two redraws (' + left + ' / ' + Math.round(step) + ')');
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-b .r7p__track').scrollLeft) === 0, name + ': the other row did not move');
    }
    /* a removed section is forgotten */
    await t.page.evaluate(() => document.getElementById('shopify-section-b').remove()); await wait2(t.page); await wait2(t.page);
    ok(await count() === 1, name + ': a removed section is cleaned up');
    ok(t.errors.length === 0, name + ': no errors (instances) ' + t.errors.join(' | '));
    await t.page.close();
  }

  /* first paint equals the hydrated paint */
  for (const width of [375, 800, 1366]) {
    const snap = t => t.page.evaluate(() => [...document.querySelectorAll('[data-r7t-root], [data-r7t-root] *')].map(el => { const r = el.getBoundingClientRect(), c = getComputedStyle(el); return [el.className && el.className.baseVal === undefined ? el.className : el.tagName, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.fontWeight, c.display, c.opacity, el.disabled === true].join(','); }));
    for (const blocks of [spec.blocks, undefined]) {
      const a = await mount(browser, name, {width, assets: [], blocks, inlineScripts: false});
      const b = await mount(browser, name, {width, assets: [ASSET], blocks, inlineScripts: false});
      await wait2(a.page); await wait2(b.page); await b.page.waitForTimeout(120);
      const sa = await snap(a), sb = await snap(b);
      const diff = sa.map((x, i) => x === sb[i] ? null : i + ': ' + x + ' / ' + sb[i]).filter(Boolean);
      ok(sa.length > 10 && sa.length === sb.length && diff.length === 0, name + '@' + width + (blocks ? ' filled' : ' preset') + ': first paint equals hydrated paint ' + diff.slice(0, 3).join(' ; '));
      await a.page.close(); await b.page.close();
    }
  }

  /* a font whose fallback families are quoted does not break the style attribute it is printed in */
  {
    const t = await mount(browser, name, {width: 1366, assets: [ASSET], blocks: spec.blocks, settings: {enable_custom_fonts: true, heading_font: {family: 'Courier New', fallback_families: '"Arial Black", monospace'}, body_font: {family: 'Courier New', fallback_families: "'Arial Black', monospace"}}});
    const s = await t.page.evaluate(() => { const r = document.querySelector('[data-r7t-root]'); return [r.dataset.sectionId, r.dataset.card, getComputedStyle(r.querySelector('.r7t__heading')).fontFamily, getComputedStyle(r.querySelector('.r7t-card__quote')).fontFamily, r.style.getPropertyValue('--r7t-pt')].join('|'); });
    ok(/^test\|filled\|"Courier New", "Arial Black", monospace\|"Courier New", "Arial Black", monospace\|60px$/.test(s), name + ': quoted fallback fonts are printed safely ' + s);
    await t.page.close();
  }

  /* reduced motion: everything shows, nothing moves on its own, nothing animates */
  {
    const t = await mount(browser, name, {width: 375, assets: [ASSET], blocks: spec.blocks, reducedMotion: 'reduce'});
    await t.page.waitForTimeout(200);
    ok(await t.page.locator('#shopify-section-' + t.section.id + ' ' + R0).first().isVisible() && await t.page.locator('.r7t-card').first().isVisible(), name + ': visible under reduced motion');
    ok(await t.page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length === 0), name + ': nothing animates under reduced motion');
    ok(await t.page.evaluate(() => [...document.querySelectorAll('[data-r7t-root] *')].every(e => { const c = getComputedStyle(e); return !(parseFloat(c.transitionDuration) > 0 && /grid|transform/.test(c.transitionProperty)); })), name + ': no layout or movement transition under reduced motion');
    await t.page.close();
  }
  if (spec.after) await spec.after(browser);
}

(async () => {
  const only = process.argv.slice(2);
  const browser = await launch();
  try {
    for (const spec of [WALL, PRODUCT]) if (!only.length || only.includes(spec.name)) await run(spec, browser);
  } finally { await browser.close(); }
  if (fails.length) { console.log(fails.length + ' failed of ' + (checks + fails.length) + ' round 7 testimonials checks'); process.exitCode = 1; return; }
  console.log(checks + ' round 7 testimonials checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
