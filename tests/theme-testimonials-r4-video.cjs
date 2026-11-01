/* LIQUIDJS=<path> node tests/theme-testimonials-r4-video.cjs
   Video Testimonials 5 (sections/testimonial-video) with the round 4 bar:
   theme first, every control live and after a redraw at 375 and 1366
   (editor and storefront), theme priority opt outs (fonts, block weight and
   size, button shape), stars filled to the exact rating, the rail and its
   progress bar run from the controller when the inline script did not run,
   videos muted, inline and still under reduced motion, two instances, first
   paint. The saved instances are checked by theme-testimonials-r4-saved. */
const {run} = require('./theme-testimonials-r4-lib.cjs');
const {PANTS} = require('./media-fixture.cjs');
const RED = '#ff0000', R = 'rgb(255, 0, 0)';
const txt = el => el.textContent.trim();
const blocks = [
  {type: 'heading', settings: {heading: 'Seen on <strong>customers</strong>'}},
  {type: 'subheading', settings: {subheading: '<p>Short clips from buyers.</p>'}},
  {type: 'video_card', settings: {product: PANTS, rating: 3.5, username: '@first'}},
  {type: 'video_card', settings: {image: {src: '/img/clip.png', url: '/img/clip.png', width: 600, height: 960}, rating: 5, username: '@second', product_name: 'Second product'}},
  {type: 'video_card', settings: {video_url: 'https://cdn.test/a.mp4', rating: 4, username: '@third', product_name: 'Third product'}},
  {type: 'video_card', settings: {product: PANTS, rating: 4, username: '@fourth'}},
];
const B = (block, id, value, sel, prop, expect, more = {}) => ({block, id, value, sel, prop, expect, ...more});
const S = (id, value, sel, prop, expect, more = {}) => ({id, value, sel, prop, expect, ...more});
const BTN = '.custom-button', D = 1366, M = 375;
(async () => {
  const checks = await run({
    name: 'testimonial-video', root: '.ctv', blocks, customId: 'enable_custom_styling', blockToggle: 'custom_style', settings: {enable_button: true, button_text: 'View product'},
    firstPaintBlocks: blocks.filter(b => !b.settings.video_url),
    inherit: [['.ctv', 'backgroundColor', 'rgb(24, 32, 40)'], ['.ctv__heading', 'color', 'rgb(255, 255, 255)'], ['.ctv__heading', 'fontFamily', /Georgia/], ['.ctv__subheading p', 'fontFamily', /Arial/], ['.ctv__subheading', 'color', 'rgb(204, 204, 204)'], ['.ctv__progress', 'backgroundColor', 'rgb(68, 85, 102)'], [BTN, 'backgroundColor', 'rgb(18, 52, 86)'], [BTN, 'borderTopLeftRadius', '12px'], ['.star.filled', 'color', 'rgb(255, 215, 0)']],
    controls: [
      S('section_width', 'container', '.lt-frame', 'maxWidth', '1330px', {w: D}),
      S('reset_spacing', false, '.ctv', null, false, {live: false, get: el => [...el.closest('.shopify-section').querySelectorAll('style')].some(x => /margin-top: 0 !important/.test(x.textContent))}),
      S('hide_addons', true, '.product-info', 'display', 'none'),
      S('enable_button', false, BTN, 'display', 'none'),
      S('button_text', 'Shop the look', BTN, null, 'Shop the look', {get: txt}),
      S('show_progress_bar', false, '.ctv__progress', 'display', 'none'),
      S('padding_top', 12, '.ctv', 'paddingTop', '12px'),
      S('padding_bottom', 14, '.ctv', 'paddingBottom', '14px'),
      S('video_card_size', 260, '.ctv__slide', 'flexBasis', '260px', {w: D}),
      S('card_corner_radius', 3, '.video-card', 'borderTopLeftRadius', '3px'),
      S('progress_bar_height', 6, '.ctv__progress', 'height', '6px'),
      S('progress_bar_max_width', 60, '.ctv__progress', 'width', v => Math.abs(parseFloat(v) / 1 - 0) > 0, {get: el => Math.round(el.getBoundingClientRect().width / el.parentElement.getBoundingClientRect().width * 100), expect: 60}),
      S('hide_progress_bar_desktop', true, '.ctv__progress', 'display', 'none', {w: D}),
      S('video_overlay_color_selector', 'white', '.video-overlay', 'backgroundColor', 'rgba(255, 255, 255, 0.3)'),
      S('video_overlay_opacity', 0.6, '.video-overlay', 'backgroundColor', 'rgba(0, 0, 0, 0.6)'),
      S('use_theme_button', false, BTN, 'borderTopLeftRadius', '25px'),
      S('button_border_radius', 4, BTN, 'borderTopLeftRadius', '4px', {pre: {use_theme_button: false}}),
      S('desktop_padding_left', 40, '.ctv__inner', 'paddingLeft', '40px', {w: D}),
      S('desktop_padding_right', 40, '.ctv__inner', 'paddingRight', '40px', {w: D}),
      S('video_cards_gap_desktop', 30, '.ctv__rail', 'columnGap', '30px', {w: D}),
      {id: 'mobile_column_count', value: 1, sel: '.ctv__slide', get: el => Math.round(el.getBoundingClientRect().width), expect: v => v > 300, w: M},
      S('video_cards_gap_mobile', 20, '.ctv__rail', 'columnGap', '20px', {w: M}),
      S('mobile_padding_left', 30, '.ctv__inner', 'paddingLeft', '30px', {w: M}),
      S('mobile_padding_right', 30, '.ctv__inner', 'paddingRight', '30px', {w: M}),
      B('heading', 'heading', 'New <em>heading</em>', '.ctv__heading', null, 'New heading', {get: txt}),
      B('heading', 'custom_style', true, '.ctv__heading', 'fontSize', '29px', {w: D}),
      B('heading', 'heading_font_weight', '300', '.ctv__heading', 'fontWeight', '300', {preBlock: {custom_style: true}}),
      B('heading', 'heading_font_size_desktop', 40, '.ctv__heading', 'fontSize', '40px', {preBlock: {custom_style: true}, w: D}),
      B('heading', 'heading_font_size_mobile', 20, '.ctv__heading', 'fontSize', '20px', {preBlock: {custom_style: true}, w: M}),
      B('heading', 'space_below_desktop', 50, '.ctv__heading', 'marginBottom', '50px', {w: D}),
      B('heading', 'space_below_mobile', 5, '.ctv__heading', 'marginBottom', '5px', {w: M}),
      B('subheading', 'subheading', '<p>New sub</p>', '.ctv__subheading', null, 'New sub', {get: txt}),
      B('subheading', 'text_size', 'body_small', '.ctv__subheading', 'fontSize', '14px'),
      B('subheading', 'custom_style', true, '.ctv__subheading', 'fontSize', '16px', {w: D, preBlock: {text_size: 'body_small'}}),
      B('subheading', 'subheading_font_weight', '700', '.ctv__subheading', 'fontWeight', '700', {preBlock: {custom_style: true}}),
      B('subheading', 'subheading_font_size_desktop', 20, '.ctv__subheading', 'fontSize', '20px', {preBlock: {custom_style: true}, w: D}),
      B('subheading', 'subheading_font_size_mobile', 12, '.ctv__subheading', 'fontSize', '12px', {preBlock: {custom_style: true}, w: M}),
      B('subheading', 'space_below_desktop', 10, '.ctv__subheading', 'marginBottom', '10px', {w: D}),
      B('subheading', 'space_below_mobile', 8, '.ctv__subheading', 'marginBottom', '8px', {w: M}),
      B('video_card', 'username', '@changed', '.username', null, '@changed', {get: txt}),
      B('video_card', 'product_name', 'Changed name', '.product-name', null, 'Changed name', {get: txt}),
      B('video_card', 'rating', 2.5, '.stars', null, '2.5 / 5|is-part|50%', {get: el => el.getAttribute('aria-label') + '|' + el.children[2].className.split(' ').pop() + '|' + el.children[2].style.getPropertyValue('--lt-fill')}),
      B('video_card', 'product_link', '/products/other', '.ctv__card-link', null, '/products/other', {get: el => el.getAttribute('href')}),
      B('video_card', 'button_link', '/products/button', BTN, null, '/products/button', {get: el => el.getAttribute('href')}),
      B('video_card', 'product', {...PANTS, title: 'Other title', url: '/products/other-title'}, '.product-name', null, 'Other title', {get: txt}),
      B('video_card', 'image', {src: '/img/new.png', url: '/img/new.png', width: 600, height: 960}, '.video-card', null, /new\.png/, {n: 1, sel: '.ctv__slide:nth-child(2) .video-card', get: el => el.querySelector('img.media-content')?.getAttribute('src')}),
      B('video_card', 'video_url', 'https://cdn.test/b.mp4', '.video-card', null, /b\.mp4/, {live: false, get: el => el.querySelector('video source')?.getAttribute('src')}),
      B('video_card', 'video', {sources: [{url: 'https://cdn.test/c.mp4', mime_type: 'video/mp4'}], preview_image: {src: '/img/p.png'}}, '.video-card', null, v => v === true, {live: false, get: el => !!el.querySelector('video')}),
    ],
    colours: [
      {id: 'background_color', value: RED, sel: '.ctv', prop: 'backgroundColor', expect: R, theme: 'rgb(24, 32, 40)'},
      {id: 'product_name_color', value: RED, sel: '.product-info', prop: 'color', expect: R, theme: 'rgb(255, 255, 255)'},
      {id: 'product_price_color', value: RED, sel: '.star.filled', prop: 'color', expect: R, theme: 'rgb(255, 215, 0)'},
      {id: 'pagination_bullet_color', value: RED, sel: '.ctv__progress', prop: 'backgroundColor', expect: R, theme: 'rgb(68, 85, 102)'},
      {id: 'pagination_bullet_active_color', value: RED, sel: '.ctv__progress-fill', prop: 'backgroundColor', expect: R, theme: 'rgb(255, 255, 255)'},
      {id: 'button_background_color', value: RED, sel: BTN, prop: 'backgroundColor', expect: R, theme: 'rgb(18, 52, 86)'},
      {id: 'button_text_color', value: RED, sel: BTN, prop: 'color', expect: R, theme: 'rgb(255, 255, 255)'},
      B('heading', 'heading_color', RED, '.ctv__heading', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      B('subheading', 'subheading_color', RED, '.ctv__subheading', 'color', R, {theme: 'rgb(204, 204, 204)'}),
    ],
    fonts: [{id: 'heading_font', sel: '.ctv__heading', desc: ['.ctv__heading strong']}, {id: 'body_font', sel: '.ctv__subheading p', desc: ['.product-name']}],
    own: [
      {on: {enable_custom_fonts: true, heading_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.ctv__heading', attrSel: '.ctv', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Georgia/},
      {on: {enable_custom_fonts: true, body_font: {family: 'Courier New'}}, off: {enable_custom_fonts: false}, sel: '.ctv__subheading p', attrSel: '.ctv', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Arial/, desc: ['.username']},
      {block: 'heading', on: {custom_style: true, heading_font_weight: '300'}, off: {custom_style: false}, sel: '.ctv__heading', attr: 'data-own-weight', prop: 'fontWeight', expect: '300', theme: '700'},
      {on: {use_theme_button: false, button_border_radius: 3}, off: {use_theme_button: true}, sel: BTN, attr: 'data-own-shape', prop: 'paddingLeft', expect: '16px', theme: '24px'},
    ],
    variants: [
      {id: 'video_overlay_color_selector', values: ['none', 'black', 'white', 'gray', 'light-gray', 'dark-gray'], sel: '.video-overlay', read: el => getComputedStyle(el).backgroundColor, reset: 'black'},
      {id: 'text_size', block: 'subheading', values: ['body_large', 'body', 'body_small'], sel: '.ctv__subheading', read: el => getComputedStyle(el).fontSize, reset: 'body'},
      {id: 'hover_animation', values: ['none', 'smooth-zoom', 'scale-in', 'scale-in-up', 'subtle-shadow', 'subtle-white-glow-pulse', 'subtle-gray-glow-pulse'], sel: '.ctv__slide:nth-child(2) .video-card', read: el => { const card = getComputedStyle(el), media = el.querySelector('.media-content'); return [el.closest('[data-hover]').dataset.hover, card.transform, card.boxShadow.slice(0, 22), media ? getComputedStyle(media).transform : '', card.animationName]; }, reset: 'none'},
    ],
    covered: [':enable_custom_styling', ':enable_custom_fonts', 'heading:custom_style', 'subheading:custom_style'],
    independent: S('padding_top', 7, '.ctv', 'paddingTop', '7px'),
    addBlock: {type: 'video_card', settings: {username: '@added', rating: 3}},
    addBlockLive: {settings: {username: '@live'}, sel: '.ctv__slide:last-child .username', get: txt, expect: '@live'},
    async extra(t, {width, editing, ok, wait2}) {
      const sec = '#shopify-section-' + t.section.id;
      ok(await t.page.locator(sec + ' video').evaluateAll(vs => vs.length > 0 && vs.every(v => v.muted && v.playsInline)), 'videos muted and inline');
      ok(await t.page.evaluate(s => document.querySelector(s + ' [data-lt-root]').__ctvInited === true, sec), 'the rail is set up once (inline script or controller)');
      const rail = t.page.locator(sec + ' [data-ctv-rail]');
      await rail.evaluate(el => el.scrollTo({left: el.scrollWidth, behavior: 'instant'})); await wait2(t.page); await t.page.waitForTimeout(60);
      const now = await t.page.locator(sec + ' [data-ctv-progress]').getAttribute('aria-valuenow');
      ok(now === '100' || await t.page.locator(sec + ' [data-ctv-viewport]').evaluate(el => el.classList.contains('is-static')), 'progress follows the rail (' + now + ')');
      await rail.evaluate(el => el.scrollTo({left: 0, behavior: 'instant'}));
      if (width === 1366 && editing) {
        /* hover effect changes the card while hovered */
        await t.emit({hover_animation: 'scale-in-up'}); await wait2(t.page);
        const card = t.page.locator(sec + ' .ctv__slide:nth-child(2) .video-card');
        await card.hover(); await t.page.waitForTimeout(400);
        ok(await card.evaluate(el => getComputedStyle(el).transform !== 'none'), 'hover lifts the card');
        await t.page.mouse.move(1, 1);
        await t.emit({hover_animation: 'none'}); await wait2(t.page);
      }
    },
    after: async (browser, {ok}) => {
      /* the section's inline script did not run (a builder redraw): the controller sets up the rail */
      const {mount} = require('./media-fixture.cjs');
      const t = await mount(browser, 'testimonial-video', {width: 375, blocks, assets: ['live-testimonials.js'], inlineScripts: false});
      await t.page.waitForTimeout(200);
      ok(await t.page.evaluate(() => document.querySelector('[data-lt-root]').__ctvInited === true && document.querySelector('[data-ctv-viewport]').tabIndex === 0), 'controller sets up the rail without the inline script');
      await t.page.locator('[data-ctv-rail]').evaluate(el => el.scrollTo({left: el.scrollWidth, behavior: 'instant'})); await t.page.waitForTimeout(150);
      ok(await t.page.locator('[data-ctv-progress]').getAttribute('aria-valuenow') === '100', 'controller progress bar follows the rail');
      await t.page.close();
      const u = await mount(browser, 'testimonial-video', {width: 375, blocks, assets: ['live-testimonials.js'], reducedMotion: 'reduce'});
      await u.page.waitForTimeout(300);
      ok(await u.page.evaluate(() => [...document.querySelectorAll('video')].every(v => v.paused && !v.autoplay)), 'reduced motion (inline script): videos stay still');
      await u.page.close();
    },
  });
  console.log(checks + ' Video Testimonials 5 round 4 checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
