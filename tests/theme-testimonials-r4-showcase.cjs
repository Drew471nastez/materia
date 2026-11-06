/* LIQUIDJS=<path> node tests/theme-testimonials-r4-showcase.cjs
   Testimonials Showcase (sections/testimonials3) with the round 4 bar: theme
   first, every control live and after a redraw at 375 and 1366 in the editor
   and on the storefront, theme priority opt outs, fractional stars, the
   slider row (arrows, dots, keyboard, swipe), videos muted, inline and paused
   off screen, two instances, first paint, reduced motion. */
const {run, wait2} = require('./theme-testimonials-r4-lib.cjs');
const RED = '#ff0000', R = 'rgb(255, 0, 0)';
const txt = el => el.textContent.trim();
const blocks = [
  {type: 'eyebrow', settings: {text: 'Reviews'}},
  {type: 'heading', settings: {text: 'What customers say <strong>now</strong>'}},
  {type: 'subheading', settings: {text: '<p>Quotes from buyers.</p>'}},
  {type: 'testimonial', settings: {rating: 4.3, name: 'First buyer', date: '2025', body: 'First quote'}},
  {type: 'testimonial', settings: {rating: 5, name: 'Second buyer', date: '2025', body: 'Second quote'}},
  {type: 'testimonial', settings: {rating: 4, name: 'Third buyer', date: '2025', body: 'Third quote', video_url: 'https://cdn.test/a.mp4', video_autoplay: true}},
  {type: 'testimonial', settings: {rating: 3.5, name: 'Fourth buyer', body: 'Fourth quote'}},
];
const B = (block, id, value, sel, prop, expect, more = {}) => ({block, id, value, sel, prop, expect, ...more});
const S = (id, value, sel, prop, expect, more = {}) => ({id, value, sel, prop, expect, ...more});
(async () => {
  const checks = await run({
    name: 'testimonials3', root: '.tsh', blocks,
    /* a playing video swaps its play icon for pause, so the paint comparison uses picture cards */
    firstPaintBlocks: blocks.map(b => b.settings.video_url ? {type: b.type, settings: {...b.settings, video_url: ''}} : b),
    inherit: [['.tsh', 'backgroundColor', 'rgb(24, 32, 40)'], ['.tsh', 'color', 'rgb(204, 204, 204)'], ['.tsh__heading', 'color', 'rgb(255, 255, 255)'], ['.tsh__heading', 'fontFamily', /Georgia/], ['.tsh__sub p', 'fontFamily', /Arial/], ['.tsh__name', 'fontFamily', /Georgia/], ['.tsh__text', 'fontFamily', /Arial/], ['.lt-star', 'backgroundColor::before', 'rgb(51, 102, 153)'], ['.lt-arrow', 'borderTopColor', 'rgb(68, 85, 102)']],
    controls: [
      S('section_width', 'container', '.lt-frame', 'maxWidth', '1330px', {w: 1366}),
      S('text_align', 'left', '.tsh__head', 'textAlign', 'left'),
      S('max_width', 900, '.tsh__wrap', 'maxWidth', '900px'),
      S('card_gap', 30, '.tsh__track', 'columnGap', '30px'),
      S('card_radius', 4, '.tsh__card', 'borderTopLeftRadius', '4px'),
      S('name_size', 22, '.tsh__name', 'fontSize', '22px'),
      S('star_size', 24, '.lt-star', 'width', '24px'),
      S('show_nav', false, '.tsh__nav', 'display', 'none'),
      S('show_dots', true, '.lt-dots', 'display', 'flex'),
      S('padding_top', 12, '.tsh', 'paddingTop', '12px'),
      S('padding_bottom', 14, '.tsh', 'paddingBottom', '14px'),
      {id: 'mobile_per_view', value: '2', sel: '.tsh__card', get: el => Math.round(el.getBoundingClientRect().width / el.parentElement.clientWidth * 100), expect: v => v < 55, w: 375},
      B('eyebrow', 'text', 'Changed eyebrow', '.tsh__eyebrow', null, 'Changed eyebrow', {get: txt}),
      B('heading', 'text', 'New <em>heading</em>', '.tsh__heading', null, 'New heading', {get: txt}),
      B('heading', 'size', 50, '.tsh__heading', 'fontSize', '50px', {w: 1366}),
      B('heading', 'size_mobile', 21, '.tsh__heading', 'fontSize', '21px', {w: 375}),
      B('subheading', 'text', '<p>New sub</p>', '.tsh__sub', null, 'New sub', {get: txt}),
      B('subheading', 'size', 19, '.tsh__sub', 'fontSize', '19px', {w: 1366}),
      B('subheading', 'size_mobile', 13, '.tsh__sub', 'fontSize', '13px', {w: 375}),
      B('eyebrow', 'weight', '300', '.tsh__eyebrow', 'fontWeight', '300', {preBlock: {weight_enable: true}}),
      B('eyebrow', 'weight_enable', true, '.tsh__eyebrow', 'fontWeight', '700'),
      B('heading', 'weight', '300', '.tsh__heading', 'fontWeight', '300', {preBlock: {weight_enable: true}}),
      B('heading', 'weight_enable', true, '.tsh__heading', 'fontWeight', '800'),
      B('subheading', 'weight', '600', '.tsh__sub', 'fontWeight', '600', {preBlock: {weight_enable: true}}),
      B('subheading', 'weight_enable', true, '.tsh__sub', 'fontWeight', '400'),
      B('testimonial', 'rating', 2.6, '.tsh__card .lt-stars', null, '2.6 / 5|0%|60%', {get: el => el.getAttribute('aria-label') + '|' + el.children[4].style.getPropertyValue('--lt-fill') + '|' + el.children[2].style.getPropertyValue('--lt-fill')}),
      B('testimonial', 'body', 'Changed quote', '.tsh__text', null, 'Changed quote', {get: txt}),
      B('testimonial', 'name', 'Changed name', '.tsh__name', null, 'Changed name', {get: txt}),
      B('testimonial', 'date_prefix', 'Posted', '.tsh__date', null, 'Posted 2025', {get: txt}),
      B('testimonial', 'date', '', '.tsh__date', null, true, {get: el => el.hidden}),
      B('testimonial', 'image', {src: '/img/face.png', url: '/img/face.png', width: 800, height: 600, alt: ''}, '.tsh__media', null, /face\.png/, {get: el => el.querySelector('img')?.getAttribute('src')}),
      B('testimonial', 'video_url', 'https://cdn.test/b.mp4', '.tsh__media', null, /b\.mp4/, {live: false, get: el => el.querySelector('video source')?.getAttribute('src')}),
      B('testimonial', 'shopify_video', {sources: [{url: 'https://cdn.test/c.mp4', mime_type: 'video/mp4'}]}, '.tsh__media', null, /c\.mp4/, {live: false, get: el => el.querySelector('video source')?.getAttribute('src')}),
      B('testimonial', 'video_autoplay', false, '.tsh__card:nth-child(3) video', null, false, {n: 2, get: el => el.hasAttribute('data-lt-autoplay')}),
      B('testimonial', 'video_loop', false, '.tsh__card:nth-child(3) video', null, false, {n: 2, get: el => el.hasAttribute('loop')}),
      B('testimonial', 'video_sound_on', true, '.tsh__card:nth-child(3) video', null, false, {n: 2, preBlock: {video_autoplay: false}, get: el => el.muted}),
      B('testimonial', 'video_controls', true, '.tsh__card:nth-child(3) video', null, 'true|true', {n: 2, get: el => el.hasAttribute('controls') + '|' + el.parentElement.querySelector('[data-lt-play]').hidden}),
      B('testimonial', 'body_size_desktop', 18, '.tsh__text', 'fontSize', '18px', {w: 1366}),
      B('testimonial', 'body_size_mobile', 12, '.tsh__text', 'fontSize', '12px', {w: 375}),
    ],
    colours: [
      S('section_bg', RED, '.tsh', 'backgroundColor', R, {theme: 'rgb(24, 32, 40)'}),
      S('text_color', RED, '.tsh', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      S('card_bg', RED, '.tsh__card', 'backgroundColor', R, {theme: v => v !== R}),
      S('name_color', RED, '.tsh__name', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      S('body_color', RED, '.tsh__text', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      S('muted_color', RED, '.tsh__date', 'color', R, {theme: v => v !== R}),
      S('star_color', RED, '.lt-star', 'backgroundColor::before', R, {theme: 'rgb(51, 102, 153)'}),
      S('star_empty_color', RED, '.lt-star svg', 'fill', R, {theme: v => v !== R}),
      S('arrow_bg', RED, '.lt-arrow', 'backgroundColor', R, {theme: 'rgb(24, 32, 40)'}),
      S('arrow_color', RED, '.lt-arrow', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      S('arrow_border', RED, '.lt-arrow', 'borderTopColor', R, {theme: 'rgb(68, 85, 102)'}),
      {id: 'arrow_bg_hover', value: RED, sel: '.tsh', get: el => getComputedStyle(el).getPropertyValue('--lt-arrow-bg-h').trim(), expect: RED, theme: '#ffffff'},
      {id: 'arrow_color_hover', value: RED, sel: '.tsh', get: el => getComputedStyle(el).getPropertyValue('--lt-arrow-c-h').trim(), expect: RED, theme: '#182028'},
      {id: 'dot_color', value: RED, sel: '.tsh', get: el => getComputedStyle(el).getPropertyValue('--lt-dot').trim(), expect: RED, theme: v => v !== RED},
      {id: 'dot_active_color', value: RED, sel: '.tsh', get: el => getComputedStyle(el).getPropertyValue('--lt-dot-active').trim(), expect: RED, theme: '#ffffff'},
      B('eyebrow', 'color', RED, '.tsh__eyebrow', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      B('heading', 'color', RED, '.tsh__heading', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      B('subheading', 'color', RED, '.tsh__sub p', 'color', R, {theme: 'rgb(204, 204, 204)'}),
    ],
    fonts: [{id: 'heading_font', sel: '.tsh__heading', desc: ['.tsh__heading strong', '.tsh__name']}, {id: 'body_font', sel: '.tsh__sub p', desc: ['.tsh__text', '.tsh__eyebrow', '.tsh__date']}],
    own: [
      {on: {enable_custom_fonts: true, heading_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.tsh__heading', attrSel: '.tsh', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Georgia/, desc: ['.tsh__name']},
      {on: {enable_custom_fonts: true, body_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.tsh__sub p', attrSel: '.tsh', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Arial/, desc: ['.tsh__text', '.tsh__eyebrow']},
      {block: 'heading', on: {weight_enable: true, weight: '300'}, off: {weight_enable: false}, sel: '.tsh__heading', attr: 'data-own-weight', prop: 'fontWeight', expect: '300', theme: '700'},
    ],
    variants: [
      {id: 'section_width', values: ['container', 'fluid_container', 'stretch_width', 'full_width'], sel: '.lt-frame', read: el => [getComputedStyle(el).maxWidth, getComputedStyle(el).paddingLeft], reset: 'full_width'},
      {id: 'text_align', values: ['left', 'center', 'right'], sel: '.tsh__head', read: el => getComputedStyle(el).textAlign, reset: 'center'},
      {id: 'weight', block: 'heading', pre: {weight_enable: true}, values: ['300', '400', '500', '600', '700', '800'], sel: '.tsh__heading', read: el => getComputedStyle(el).fontWeight},
      {id: 'weight', block: 'eyebrow', pre: {weight_enable: true}, values: ['300', '400', '500', '600', '700', '800'], sel: '.tsh__eyebrow', read: el => getComputedStyle(el).fontWeight},
      {id: 'weight', block: 'subheading', pre: {weight_enable: true}, values: ['300', '400', '500', '600', '700'], sel: '.tsh__sub', read: el => getComputedStyle(el).fontWeight},
      {id: 'mobile_per_view', w: 375, values: ['1', '1.2', '1.5', '2'], sel: '.tsh__card', read: el => Math.round(el.getBoundingClientRect().width), reset: '1'},
    ],
    covered: [':enable_custom_style', ':enable_custom_fonts', ':reveal', 'eyebrow:enable_custom_style', 'heading:enable_custom_style', 'subheading:enable_custom_style'],
    independent: S('padding_top', 7, '.tsh', 'paddingTop', '7px'),
    addBlock: {type: 'testimonial', settings: {name: 'Added buyer', rating: 3}},
    addBlockLive: {settings: {name: 'Live name'}, sel: '.tsh__card:last-child .tsh__name', get: txt, expect: 'Live name'},
    async extra(t, {width, editing, ok, wait2}) {
      let n = 0;
      const sec = '#shopify-section-' + t.section.id;
      const track = t.page.locator(sec + ' [data-lt-track]');
      /* fractional stars: 4.3 fills four and 30% of the fifth */
      const fills = await t.page.locator(sec + ' .tsh__card').first().locator('.lt-star').evaluateAll(els => els.map(e => e.style.getPropertyValue('--lt-fill')));
      ok(fills.join() === '100%,100%,100%,100%,30%', 'fractional star fill ' + fills); n++;
      const clip = await t.page.locator(sec + ' .tsh__card .lt-star').nth(4).evaluate(el => getComputedStyle(el, '::before').clipPath);
      ok(/70%/.test(clip), 'fifth star clipped to 30% ' + clip); n++;
      /* videos: muted, inline */
      ok(await t.page.locator(sec + ' video').evaluateAll(vs => vs.every(v => v.muted && v.playsInline && v.hasAttribute('playsinline'))), 'videos muted and inline'); n++;
      /* slider */
      if (width === 375) {
        await track.scrollIntoViewIfNeeded(); await wait2(t.page);
        ok(await t.page.locator(sec + ' [data-lt-prev]').isDisabled(), 'prev disabled at the start'); n++;
        await t.page.locator(sec + ' [data-lt-next]').click(); await t.page.waitForTimeout(500);
        ok(await track.evaluate(el => el.scrollLeft > 100), 'next moves one card'); n++;
        await track.evaluate(el => el.scrollTo({left: 0, behavior: 'instant'})); await t.page.waitForTimeout(60);
        await track.focus(); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(500);
        ok(await track.evaluate(el => el.scrollLeft > 100), 'arrow key moves one card'); n++;
        await t.page.keyboard.press('Home'); await t.page.waitForTimeout(400);
        ok(await track.evaluate(el => el.scrollLeft < 2), 'Home goes back'); n++;
        const box = await t.page.locator(sec + ' [data-lt-next]').boundingBox();
        ok(box.width >= 44 && box.height >= 44, 'arrow is a 44px target'); n++;
        await t.emit({show_dots: true}); await wait2(t.page);
        ok(await t.page.locator(sec + ' .lt-dot').count() === 4, 'one dot per card on a phone'); n++;
        await t.page.locator(sec + ' .lt-dot').nth(2).click(); await t.page.waitForTimeout(500);
        ok(await t.page.locator(sec + ' .lt-dot').nth(2).getAttribute('aria-current') === 'true', 'dot moves the row and marks itself'); n++;
        await t.emit({show_dots: false}); await wait2(t.page);
        /* off screen video pauses */
        const paused = await t.page.evaluate(async s => {
          const v = document.querySelector(s + ' video'); let state = false; Object.defineProperty(v, 'paused', {configurable: true, get: () => !state}); v.play = () => { state = true; return Promise.resolve(); }; v.pause = () => { state = false; };
          v.play(); const pad = document.createElement('div'); pad.style.height = '4000px'; document.body.append(pad); scrollTo(0, 99999);
          await new Promise(r => setTimeout(r, 300)); const off = !state; scrollTo(0, 0); pad.remove(); return off;
        }, sec);
        /* the edits above redraw a visitor's page (no settings JSON there), which a visitor never gets; the editor run checks the pause */
        if (editing) { ok(paused, 'a playing video pauses off screen'); n++; }
      }
      return n;
    },
    async after(browser, {ok}) {
      const {mount} = require('./media-fixture.cjs');
      const t = await mount(browser, 'testimonials3', {theme: {scroll_animation: 'fade_in'}, settings: {reveal: true}, assets: ['live-testimonials.js']});
      ok(await t.page.locator('#shopify-section-test').evaluate(el => el.classList.contains('scroll-trigger')), 'reveal hooks Theme settings > Animations');
      await t.page.close();
      const u = await mount(browser, 'testimonials3', {theme: {scroll_animation: 'fade_in'}, settings: {reveal: false}, assets: ['live-testimonials.js']});
      ok(!(await u.page.locator('#shopify-section-test').evaluate(el => el.classList.contains('scroll-trigger'))), 'reveal off leaves the section still');
      await u.page.close();
      return 2;
    },
  });
  console.log(checks + ' Testimonials Showcase round 4 checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
