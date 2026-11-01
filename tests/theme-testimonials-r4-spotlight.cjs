/* LIQUIDJS=<path> node tests/theme-testimonials-r4-spotlight.cjs
   Testimonial Spotlight (sections/testimonials4) with the round 4 bar: theme
   first, every control live and after a redraw at 375 and 1366 (editor and
   storefront), theme priority opt outs, fractional stars, one quote per
   view with arrows, dots, keys and auto advance that stops off screen, on
   hover and under reduced motion, two instances, first paint. */
const {run} = require('./theme-testimonials-r4-lib.cjs');
const RED = '#ff0000', R = 'rgb(255, 0, 0)';
const txt = el => el.textContent.trim();
const blocks = [
  {type: 'eyebrow', settings: {text: 'Featured review'}},
  {type: 'heading', settings: {text: 'What customers say <strong>now</strong>'}},
  {type: 'subheading', settings: {text: '<p>Quotes from buyers.</p>'}},
  {type: 'testimonial', settings: {rating: 4.3, name: 'First buyer', role: 'Verified buyer', body: 'First quote'}},
  {type: 'testimonial', settings: {rating: 5, name: 'Second buyer', role: 'Verified buyer', body: 'Second quote'}},
  {type: 'testimonial', settings: {rating: 3.5, name: 'Third buyer', role: '', body: 'Third quote'}},
];
const B = (block, id, value, sel, prop, expect, more = {}) => ({block, id, value, sel, prop, expect, ...more});
const S = (id, value, sel, prop, expect, more = {}) => ({id, value, sel, prop, expect, ...more});
(async () => {
  const checks = await run({
    name: 'testimonials4', root: '.tsp', blocks, settings: {autoplay_s: 0},
    inherit: [['.tsp', 'backgroundColor', 'rgb(24, 32, 40)'], ['.tsp', 'color', 'rgb(204, 204, 204)'], ['.tsp__heading', 'color', 'rgb(255, 255, 255)'], ['.tsp__heading', 'fontFamily', /Georgia/], ['.tsp__quote', 'fontFamily', /Arial/], ['.tsp__quote', 'color', 'rgb(255, 255, 255)'], ['.tsp__name', 'fontFamily', /Georgia/], ['.lt-star', 'backgroundColor::before', 'rgb(51, 102, 153)']],
    controls: [
      S('section_width', 'container', '.lt-frame', 'maxWidth', '1330px', {w: 1366}),
      S('text_align', 'left', '.tsp__wrap', 'textAlign', 'left'),
      S('max_width', 600, '.tsp__wrap', 'maxWidth', '600px'),
      S('star_size', 30, '.lt-star', 'width', '30px'),
      S('quote_size', 34, '.tsp__quote', 'fontSize', '34px', {w: 1366}),
      S('quote_size_mobile', 17, '.tsp__quote', 'fontSize', '17px', {w: 375}),
      S('padding_top', 12, '.tsp', 'paddingTop', '12px'),
      S('padding_bottom', 14, '.tsp', 'paddingBottom', '14px'),
      {id: 'autoplay_s', value: 2, sel: '.tsp', get: el => window.MateriaLiveTestimonials.state(el).slider.running, expect: v => v === true || v === false},
      B('eyebrow', 'text', 'Changed eyebrow', '.tsp__eyebrow', null, 'Changed eyebrow', {get: txt}),
      B('heading', 'text', 'New <em>heading</em>', '.tsp__heading', null, 'New heading', {get: txt}),
      B('heading', 'size', 50, '.tsp__heading', 'fontSize', '50px', {w: 1366}),
      B('heading', 'size_mobile', 21, '.tsp__heading', 'fontSize', '21px', {w: 375}),
      B('subheading', 'text', '<p>New sub</p>', '.tsp__sub', null, 'New sub', {get: txt}),
      B('subheading', 'size', 19, '.tsp__sub', 'fontSize', '19px'),
      B('testimonial', 'rating', 2.6, '.tsp__card .lt-stars', null, '2.6 / 5|0%|60%', {get: el => el.getAttribute('aria-label') + '|' + el.children[4].style.getPropertyValue('--lt-fill') + '|' + el.children[2].style.getPropertyValue('--lt-fill')}),
      B('testimonial', 'body', 'Changed quote', '.tsp__quote', null, 'Changed quote', {get: txt}),
      B('testimonial', 'name', 'Changed name', '.tsp__name', null, 'Changed name', {get: txt}),
      B('testimonial', 'role', '', '.tsp__role', null, true, {get: el => el.hidden}),
      B('testimonial', 'avatar', {src: '/img/face.png', url: '/img/face.png', width: 120, height: 120, alt: ''}, '.tsp__avatar', null, /face\.png/, {get: el => el.querySelector('img')?.getAttribute('src') + (el.querySelector('svg') ? ' and placeholder' : '')}),
    ],
    colours: [
      S('section_bg', RED, '.tsp', 'backgroundColor', R, {theme: 'rgb(24, 32, 40)'}),
      S('text_color', RED, '.tsp', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      S('quote_color', RED, '.tsp__quote', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      S('name_color', RED, '.tsp__name', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      S('role_color', RED, '.tsp__role', 'color', R, {theme: v => v !== R}),
      S('star_color', RED, '.lt-star', 'backgroundColor::before', R, {theme: 'rgb(51, 102, 153)'}),
      S('star_empty_color', RED, '.lt-star svg', 'fill', R, {theme: v => v !== R}),
      S('arrow_bg', RED, '.lt-arrow', 'backgroundColor', R, {theme: 'rgb(24, 32, 40)'}),
      S('arrow_color', RED, '.lt-arrow', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      S('arrow_border', RED, '.lt-arrow', 'borderTopColor', R, {theme: 'rgb(68, 85, 102)'}),
      {id: 'arrow_bg_hover', value: RED, sel: '.tsp', get: el => getComputedStyle(el).getPropertyValue('--lt-arrow-bg-h').trim(), expect: RED, theme: '#ffffff'},
      {id: 'arrow_color_hover', value: RED, sel: '.tsp', get: el => getComputedStyle(el).getPropertyValue('--lt-arrow-c-h').trim(), expect: RED, theme: '#182028'},
      S('dot_color', RED, '.lt-dot:nth-child(2)', 'backgroundColor::before', R, {theme: v => v !== R}),
      S('dot_active_color', RED, '.lt-dot', 'backgroundColor::before', R, {theme: 'rgb(255, 255, 255)'}),
      B('eyebrow', 'color', RED, '.tsp__eyebrow', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      B('heading', 'color', RED, '.tsp__heading', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      B('subheading', 'color', RED, '.tsp__sub p', 'color', R, {theme: 'rgb(204, 204, 204)'}),
    ],
    fonts: [{id: 'heading_font', sel: '.tsp__heading', desc: ['.tsp__heading strong', '.tsp__name', '.tsp__quote']}, {id: 'body_font', sel: '.tsp__sub p', desc: ['.tsp__role', '.tsp__eyebrow']}],
    own: [
      {on: {enable_custom_fonts: true, heading_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.tsp__heading', attrSel: '.tsp', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Georgia/, desc: ['.tsp__name', '.tsp__quote']},
      {on: {enable_custom_fonts: true, body_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.tsp__sub p', attrSel: '.tsp', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Arial/, desc: ['.tsp__role']},
    ],
    variants: [
      {id: 'section_width', values: ['container', 'fluid_container', 'stretch_width', 'full_width'], sel: '.lt-frame', read: el => [getComputedStyle(el).maxWidth, getComputedStyle(el).paddingLeft], reset: 'full_width'},
      {id: 'text_align', values: ['left', 'center'], sel: '.tsp__meta', read: el => [getComputedStyle(el.parentElement.parentElement).textAlign, Math.round(el.getBoundingClientRect().x)], reset: 'center'},
    ],
    covered: [':enable_custom_style', ':enable_custom_fonts', ':reveal', 'eyebrow:enable_custom_style', 'heading:enable_custom_style', 'subheading:enable_custom_style'],
    independent: S('padding_top', 7, '.tsp', 'paddingTop', '7px'),
    addBlock: {type: 'testimonial', settings: {name: 'Added buyer', rating: 3}},
    addBlockLive: {settings: {name: 'Live name'}, sel: '.tsp__card:last-child .tsp__name', get: txt, expect: 'Live name'},
    motion: {autoplay_s: 1},
    async extra(t, {width, editing, ok, wait2}) {
      const sec = '#shopify-section-' + t.section.id, track = t.page.locator(sec + ' [data-lt-track]');
      const fills = await t.page.locator(sec + ' .tsp__card').first().locator('.lt-star').evaluateAll(els => els.map(e => e.style.getPropertyValue('--lt-fill')));
      ok(fills.join() === '100%,100%,100%,100%,30%', 'fractional star fill ' + fills);
      ok(await t.page.locator(sec + ' .lt-dot').count() === 3, 'one dot per quote');
      await track.scrollIntoViewIfNeeded(); await wait2(t.page);
      await t.page.locator(sec + ' [data-lt-next]').click(); await t.page.waitForTimeout(500);
      const w = await track.evaluate(el => el.clientWidth);
      ok(Math.abs(await track.evaluate(el => el.scrollLeft) - w) < 4, 'next shows the second quote');
      ok(await t.page.locator(sec + ' .lt-dot').nth(1).getAttribute('aria-current') === 'true', 'dot follows');
      await t.page.locator(sec + ' [data-lt-next]').click(); await t.page.waitForTimeout(500);
      await t.page.locator(sec + ' [data-lt-next]').click(); await t.page.waitForTimeout(1200);
      ok(await track.evaluate(el => el.scrollLeft) < 4, 'next on the last quote goes back to the first');
      await t.page.locator(sec + ' [data-lt-prev]').click(); await t.page.waitForTimeout(1200);
      ok(await track.evaluate(el => el.scrollLeft > el.clientWidth), 'prev on the first quote goes to the last');
      await t.page.locator(sec + ' .lt-dot').first().click(); await t.page.waitForTimeout(500);
      await track.focus(); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(500);
      ok(Math.abs(await track.evaluate(el => el.scrollLeft) - w) < 4, 'arrow key moves one quote');
      if (width === 1366 && editing) {
        /* auto advance moves on while visible and stops when hovered or focused */
        await track.evaluate(el => el.blur());
        await t.page.evaluate(() => { document.body.style.paddingTop = '60px'; });
        await t.page.mouse.move(5, 5);
        await t.page.locator(sec + ' .lt-dot').first().click(); await t.page.waitForTimeout(1200);
        await t.page.evaluate(() => document.activeElement && document.activeElement.blur());
        await t.page.mouse.move(5, 5);
        await t.emit({autoplay_s: 1}); await wait2(t.page);
        await t.page.waitForTimeout(1600);
        ok(await track.evaluate(el => el.scrollLeft > 4), 'auto advance moves on');
        await t.page.locator(sec + ' .tsp__quote').first().hover();
        ok(await t.page.evaluate(s => !window.MateriaLiveTestimonials.state(document.querySelector(s + ' [data-lt-root]')).slider.running, sec), 'auto advance pauses on hover');
        await t.page.mouse.move(5, 5);
        ok(await t.page.evaluate(s => window.MateriaLiveTestimonials.state(document.querySelector(s + ' [data-lt-root]')).slider.running, sec), 'and starts again');
        const off = await t.page.evaluate(async s => { const pad = document.createElement('div'); pad.style.height = '5000px'; document.body.append(pad); scrollTo(0, 99999); await new Promise(r => setTimeout(r, 300)); const run = window.MateriaLiveTestimonials.state(document.querySelector(s + ' [data-lt-root]')).slider.running; scrollTo(0, 0); pad.remove(); return run; }, sec);
        ok(off === false, 'auto advance stops off screen');
        await t.emit({autoplay_s: 0}); await wait2(t.page);
        ok(await t.page.evaluate(s => !window.MateriaLiveTestimonials.state(document.querySelector(s + ' [data-lt-root]')).slider.running, sec), 'auto advance 0 stops');
      }
    },
  });
  console.log(checks + ' Testimonial Spotlight round 4 checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
