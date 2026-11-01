/* LIQUIDJS=<path> node tests/theme-testimonials-r4-t4.cjs
   Testimonials 4 (sections/testimon4) with the round 4 bar: theme first,
   every one of its 110 controls live and after a redraw at 375 and 1366
   (editor and storefront), theme priority opt outs (heading and text fonts,
   button shape), fractional star tiles, the native slider that replaced
   Swiper (arrows, dots, keys, loop), Read more on phones, the theme button,
   two instances, first paint, reduced motion. */
const {run} = require('./theme-testimonials-r4-lib.cjs');
const RED = '#ff0000', R = 'rgb(255, 0, 0)';
const txt = el => el.textContent.trim();
const long = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree';
const blocks = [
  {type: 'testimonials', settings: {stars_count: 4.3, heading: 'First heading', text: long, author_date: 'First buyer, May'}},
  {type: 'testimonials', settings: {stars_count: 5, heading: 'Second heading', text: 'Short review', author_date: 'Second buyer'}},
  {type: 'testimonials', settings: {stars_count: 3.5, heading: 'Third heading', text: 'Third review', author_date: 'Third buyer'}},
  {type: 'testimonials', settings: {stars_count: 4, heading: 'Fourth heading', text: 'Fourth review', author_date: 'Fourth buyer'}},
];
const B = (id, value, sel, prop, expect, more = {}) => ({block: 'testimonials', id, value, sel, prop, expect, ...more});
const S = (id, value, sel, prop, expect, more = {}) => ({id, value, sel, prop, expect, ...more});
const D = 1366, M = 375;
const BTN = '.t4__btn', withBtn = {button: 'Shop now', button_url: '/collections/all'};
const V = '.t4';
(async () => {
  const checks = await run({
    name: 'testimon4', root: '.t4', blocks, settings: {button: 'Shop now', button_url: '/collections/all', arrow_show_mobile: true, dots_show_mobile: true, dots_show_desktop: true, border_thickness: 2, card_border_thickness: 1},
    inherit: [['.t4', 'backgroundColor', 'rgb(24, 32, 40)'], ['.t4__heading', 'color', 'rgb(255, 255, 255)'], ['.t4__heading', 'fontFamily', /Georgia/], ['.t4__copy p', 'fontFamily', /Arial/], ['.t4__card-heading', 'fontFamily', /Georgia/], ['.t4__review', 'fontFamily', /Arial/], ['.t4__card', 'borderTopColor', 'rgb(68, 85, 102)'], ['.t4', 'borderTopColor', 'rgb(68, 85, 102)'], ['.lt-star', 'backgroundImage', /51, 102, 153/], [BTN, 'backgroundColor', 'rgb(18, 52, 86)'], [BTN, 'borderTopLeftRadius', '12px']],
    controls: [
      S('full_width', false, '.t4__inner', 'maxWidth', '1500px', {pre: {content_width: 1500}}),
      S('content_width', 900, '.t4__inner', 'maxWidth', '900px', {pre: {full_width: false}}),
      S('reset_spacing', false, '.t4', null, false, {live: false, get: el => [...el.closest('.shopify-section').querySelectorAll('style')].some(x => /margin-top: 0 !important/.test(x.textContent))}),
      S('heading', 'New heading', '.t4__heading', null, 'New heading', {get: txt}),
      S('rating_text', 'Great', '.t4__rating-text', null, 'Great', {get: txt}),
      S('rating', 4.2, '.t4__score b', null, '4.2', {get: txt}),
      S('rating_text_hide', true, '.t4__rating-text', null, true, {get: el => el.hidden}),
      S('rating_hide', true, '.t4__score', null, true, {get: el => el.hidden}),
      S('text', '<p>New <strong>text</strong></p>', '.t4__copy', null, 'New text', {get: txt}),
      S('text_right_image', {src: '/img/badge.png', url: '/img/badge.png', width: 300, height: 96, alt: 'Badge'}, '.t4__text-img', null, /badge\.png/, {get: el => !el.hidden && el.querySelector('img')?.getAttribute('src')}),
      S('enable_profile_images', false, '.t4__profiles', null, true, {get: el => el.hidden}),
      ...[1, 2, 3, 4].map(n => S('profile_image_' + n, {src: '/img/p' + n + '.png', url: '/img/p' + n + '.png', width: 100, height: 100}, '.t4__profile:nth-child(' + n + ')', null, new RegExp('p' + n + '\\.png'), {get: el => el.querySelector('img')?.getAttribute('src')})),
      S('stars_icon', {src: '/img/star.png', url: '/img/star.png', width: 40, height: 40}, '.t4__card', null, 4, {live: false, get: el => el.querySelectorAll('.t4__stars img').length}),
      S('card_text_more', 'More', '.t4__more', null, 'More', {w: M, get: txt}),
      S('card_text_less', 'Fewer', '.t4__more', null, 'Fewer', {w: M, get: el => el.dataset.less}),
      S('card_count_words', 5, '.t4__short', null, 'one two three four five...', {get: txt}),
      S('button', 'Buy now', BTN, null, 'Buy now', {get: txt}),
      S('button_url', '', '.t4__btn-row', null, 'BUTTON', {get: el => el.querySelector('[data-lt-button]').tagName}),
      S('new_tab', true, BTN, null, '_blank', {get: el => el.getAttribute('target')}),
      S('heading_align', 'left', '.t4__heading', 'textAlign', 'left'),
      S('rating_text_mt', 40, '.t4__rating', 'marginTop', '40px', {w: D}), S('rating_text_mt', 40, '.t4__rating', 'marginTop', '30px', {w: M}),
      S('text_mt', 40, '.t4__text', 'marginTop', '40px', {w: D}), S('text_mt', 40, '.t4__text', 'marginTop', '30px', {w: M}),
      S('slider_width', 60, '.t4__slider', 'maxWidth', '60%'),
      {id: 'slider_view', value: 2, sel: '.t4__card', get: el => Math.round(el.getBoundingClientRect().width / el.parentElement.clientWidth * 100), expect: v => v > 45 && v < 50, w: D},
      S('slider_gap', 30, '.t4__track', 'columnGap', '30px'),
      S('slider_mt', 40, '.t4__slider', 'marginTop', '40px', {w: D}), S('slider_mt', 40, '.t4__slider', 'marginTop', '30px', {w: M}),
      S('stars_size', 30, '.lt-star', 'width', '30px', {w: D}), S('stars_size', 30, '.lt-star', 'width', '24px', {w: M}),
      S('stars_gap', 9, '.t4__card .lt-stars', 'columnGap', '9px'),
      S('profile_size', 44, '.t4__profile', 'width', '44px', {w: D}),
      S('profile_overlap', 10, '.t4__profile:nth-child(2)', 'marginLeft', '-10px'),
      S('profile_gap', 9, '.t4__profiles', 'columnGap', '9px'),
      S('card_padding_vertical', 40, '.t4__card', 'paddingTop', '40px', {w: D}), S('card_padding_vertical', 40, '.t4__card', 'paddingTop', '30px', {w: M}),
      S('card_padding_horizontal', 50, '.t4__card', 'paddingLeft', '50px', {w: D}), S('card_padding_horizontal', 50, '.t4__card', 'paddingLeft', '30px', {w: M}),
      S('card_radius', 3, '.t4__card', 'borderTopLeftRadius', '3px'),
      S('card_border_thickness', 3, '.t4__card', 'borderTopWidth', '3px'),
      S('card_shadow', false, '.t4__card', 'boxShadow', 'none'),
      S('card_heading_align', 'left', '.t4__card-heading', 'textAlign', 'left'),
      S('card_heading_mt', 40, '.t4__card-heading', 'marginTop', '40px', {w: D}), S('card_heading_mt', 40, '.t4__card-heading', 'marginTop', '30px', {w: M}),
      S('arrow_show_desktop', false, '.t4__arrow', 'display', 'none', {w: D}),
      S('arrow_size', 60, '.t4__arrow', 'width', '60px'),
      S('arrow_icon_size', 20, '.t4__arrow svg', 'width', '20px'),
      S('arrow_border_thickness', 3, '.t4__arrow', 'borderTopWidth', '3px'),
      S('dots_show_desktop', false, '.t4__dots', 'display', 'none', {w: D}),
      S('dots_size', 16, '.lt-dot', 'width::before', '16px'),
      S('button_mt', 50, '.t4__btn-row', 'marginTop', '50px'),
      S('border_thickness', 5, '.t4', 'borderTopWidth', '5px'),
      S('use_theme_button', false, BTN, 'borderTopLeftRadius', '8px'),
      S('button_size', 19, BTN, 'fontSize', '19px', {pre: {use_theme_button: false}}),
      S('button_padding_vertical', 21, BTN, 'paddingTop', '21px', {pre: {use_theme_button: false}}),
      S('button_padding_horizontal', 31, BTN, 'paddingLeft', '31px', {pre: {use_theme_button: false}}),
      S('button_radius', 0, BTN, 'borderTopLeftRadius', '0px', {pre: {use_theme_button: false}}),
      S('button_border_thickness', 3, BTN, 'borderTopWidth', '3px', {pre: {use_theme_button: false}}),
      S('heading_height', 200, '.t4__heading', 'lineHeight', v => parseFloat(v) > 70, {pre: {heading_custom: true}, w: D}),
      S('heading_size', 50, '.t4__heading', 'fontSize', '50px', {w: D}),
      S('rating_text_size', 30, '.t4__rating-text', 'fontSize', '30px', {w: D}),
      S('text_size', 30, '.t4__copy p', 'fontSize', '30px', {w: D}), S('text_size', 30, '.t4__copy p', 'fontSize', '24px', {w: M}),
      S('text_height', 200, '.t4__copy p', 'lineHeight', '40px', {w: D}), S('text_height', 200, '.t4__copy p', 'lineHeight', '32px', {w: M}),
      S('card_heading_size', 30, '.t4__card-heading', 'fontSize', '30px', {w: D}),
      S('card_text_size', 19, '.t4__review', 'fontSize', '19px'),
      S('card_text_height', 200, '.t4__review', 'lineHeight', '28px'),
      S('card_author_date_text_size', 22, '.t4__author', 'fontSize', '22px'),
      S('margin_top', 40, '.t4', 'marginTop', '40px', {w: D}), S('margin_top', 40, '.t4', 'marginTop', '30px', {w: M}),
      S('margin_bottom', 40, '.t4', 'marginBottom', '40px', {w: D}),
      S('padding_top', 40, '.t4__inner', 'paddingTop', '40px', {w: D}), S('padding_top', 40, '.t4__inner', 'paddingTop', '30px', {w: M}),
      S('padding_bottom', 40, '.t4__inner', 'paddingBottom', '40px', {w: D}),
      S('padding_horizontal', 2, '.t4__inner', 'paddingLeft', '20px', {w: D}),
      S('heading_size_mobile', 20, '.t4__heading', 'fontSize', '20px', {w: M}),
      S('rating_text_size_mobile', 15, '.t4__rating-text', 'fontSize', '15px', {w: M}),
      S('profile_size_mobile', 40, '.t4__profile', 'width', '40px', {w: M}),
      {id: 'slider_view_mobile', value: 2, sel: '.t4__card', get: el => Math.round(el.getBoundingClientRect().width / el.parentElement.clientWidth * 100), expect: v => v > 42 && v < 50, w: M},
      S('card_heading_size_mobile', 15, '.t4__card-heading', 'fontSize', '15px', {w: M}),
      S('arrow_show_mobile', false, '.t4__arrow', 'display', 'none', {w: M}),
      S('dots_show_mobile', false, '.t4__dots', 'display', 'none', {w: M}),
      S('padding_horizontal_mobile', 2, '.t4__inner', 'paddingLeft', '20px', {w: M}),
      B('stars_count', 2.6, '.t4__card .lt-stars', null, '2.6 / 5|0%|60%', {get: el => el.getAttribute('aria-label') + '|' + el.children[4].style.getPropertyValue('--lt-fill') + '|' + el.children[2].style.getPropertyValue('--lt-fill')}),
      B('heading', 'Changed heading', '.t4__card-heading', null, 'Changed heading', {get: txt}),
      B('text', 'Changed review', '.t4__full', null, 'Changed review', {get: txt}),
      B('author_date', 'Changed author', '.t4__author', null, 'Changed author', {get: txt}),
    ],
    colours: [
      S('background_color', RED, V, 'backgroundColor', R, {theme: 'rgb(24, 32, 40)'}),
      S('background_gradient', 'linear-gradient(180deg, rgb(255, 0, 0), rgb(0, 0, 255))', V, 'backgroundImage', /linear-gradient/, {theme: 'none'}),
      S('border_color', RED, V, 'borderTopColor', R, {theme: 'rgb(68, 85, 102)'}),
      S('heading_color', RED, '.t4__heading', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      S('rating_text_color', RED, '.t4__rating-text', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      S('text_color', RED, '.t4__copy p', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      S('stars_color', RED, '.lt-star svg', 'fill', R, {theme: 'rgb(24, 32, 40)'}),
      S('stars_bg_color', RED, '.lt-star', 'backgroundImage', /255, 0, 0\) 100%/, {theme: /51, 102, 153/}),
      S('stars_bg_half_color', RED, '.lt-star:last-child', 'backgroundImage', /255, 0, 0\) 30%/, {theme: v => !/255, 0, 0/.test(v)}),
      S('card_bg_color', RED, '.t4__card', 'backgroundColor', R, {theme: 'rgb(24, 32, 40)'}),
      S('card_border_color', RED, '.t4__card', 'borderTopColor', R, {theme: 'rgb(68, 85, 102)'}),
      S('card_shadow_color', RED, '.t4__card', 'boxShadow', /srgb 1 0 0/, {theme: /srgb 0\.8 0\.8 0\.8/}),
      S('card_heading_color', RED, '.t4__card-heading', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      S('card_text_color', RED, '.t4__review', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      S('card_author_date_text_color', RED, '.t4__author', 'color', R, {theme: 'rgb(204, 204, 204)'}),
      S('arrow_color', RED, '.t4__arrow', 'color', R, {theme: 'rgb(255, 255, 255)'}),
      {id: 'arrow_hover_color', value: RED, sel: V, get: el => getComputedStyle(el).getPropertyValue('--t4-arrow-c-h').trim(), expect: RED, theme: '#ffffff'},
      S('arrow_bg_color', RED, '.t4__arrow', 'backgroundColor', R, {theme: 'rgb(24, 32, 40)'}),
      {id: 'arrow_bg_hover_color', value: RED, sel: V, get: el => getComputedStyle(el).getPropertyValue('--t4-arrow-bg-h').trim(), expect: RED, theme: '#182028'},
      S('arrow_border_color', RED, '.t4__arrow', 'borderTopColor', R, {pre: {arrow_border_thickness: 2}, theme: 'rgb(68, 85, 102)'}),
      {id: 'arrow_border_hover_color', value: RED, sel: V, get: el => getComputedStyle(el).getPropertyValue('--t4-arrow-border-h').trim(), expect: RED, theme: '#ffffff'},
      S('dots_color', RED, '.lt-dot', 'backgroundColor::before', R, {theme: 'rgb(255, 255, 255)'}),
      S('button_color', RED, BTN, 'color', R, {theme: 'rgb(255, 255, 255)'}),
      {id: 'button_hover_color', value: RED, sel: BTN, get: el => getComputedStyle(el).getPropertyValue('--mb-hover-text').trim(), expect: RED, theme: ''},
      S('button_bg_color', RED, BTN, 'backgroundColor', R, {theme: 'rgb(18, 52, 86)'}),
      {id: 'button_bg_hover_color', value: RED, sel: BTN, get: el => getComputedStyle(el).getPropertyValue('--mb-hover-bg').trim(), expect: RED, theme: ''},
      {id: 'button_border_color', value: RED, sel: BTN, get: el => getComputedStyle(el).getPropertyValue('--mb-border').trim(), expect: RED, theme: ''},
      {id: 'button_border_hover_color', value: RED, sel: BTN, get: el => getComputedStyle(el).getPropertyValue('--mb-hover-border').trim(), expect: RED, theme: ''},
    ],
    fonts: [{id: 'heading_font', toggle: 'heading_custom', sel: '.t4__heading', desc: ['.t4__card-heading', '.t4__rating-text']}, {id: 'text_font', toggle: 'text_custom', sel: '.t4__copy p', desc: ['.t4__review', '.t4__author', BTN]}],
    own: [
      {on: {heading_custom: true, heading_font: {family: 'Courier New', weight: 300}}, off: {heading_custom: false}, sel: '.t4__heading', attrSel: '.t4', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Georgia/, desc: ['.t4__card-heading']},
      {on: {heading_custom: true, heading_font: {family: 'Courier New', weight: 300}}, off: {heading_custom: false}, sel: '.t4__heading', attr: 'data-own-weight', prop: 'fontWeight', expect: '300', theme: '700', desc: ['.t4__card-heading']},
      {on: {heading_custom: true, heading_height: 200, heading_size: 40}, off: {heading_custom: false}, w: 1366, sel: '.t4__heading', attr: 'data-own-size', prop: 'lineHeight', expect: '80px', theme: '48px'},
      {on: {text_custom: true, text_font: {family: 'Courier New'}}, off: {text_custom: false}, sel: '.t4__review', attrSel: '.t4', attr: 'data-own-font', prop: 'fontFamily', expect: /Courier/, theme: /Arial/, desc: ['.t4__copy p', BTN]},
      {on: {use_theme_button: false, button_radius: 2, button_size: 19, button_padding_horizontal: 33}, off: {use_theme_button: true}, sel: BTN, attr: 'data-own-shape', prop: 'paddingLeft', expect: '33px', theme: '24px'},
    ],
    variants: [
      {id: 'heading_align', values: ['left', 'center', 'right'], sel: '.t4__heading', read: el => getComputedStyle(el).textAlign, reset: 'center'},
      {id: 'card_heading_align', values: ['left', 'center', 'right'], sel: '.t4__card-heading', read: el => getComputedStyle(el).textAlign, reset: 'center'},
    ],
    covered: [':enable_custom_style', ':heading_custom', ':text_custom'],
    independent: S('padding_top', 7, '.t4__inner', 'paddingTop', '7px'),
    addBlock: {type: 'testimonials', settings: {heading: 'Added heading', stars_count: 3}},
    addBlockLive: {settings: {heading: 'Live heading'}, sel: '.t4__card:last-child .t4__card-heading', get: txt, expect: 'Live heading'},
    firstPaint: {button: 'Shop now', button_url: '/collections/all'},
    async extra(t, {width, ok, wait2}) {
      const sec = '#shopify-section-' + t.section.id, track = t.page.locator(sec + ' [data-lt-track]');
      const fills = await t.page.locator(sec + ' .t4__card').first().locator('.lt-star').evaluateAll(els => els.map(e => e.style.getPropertyValue('--lt-fill')));
      ok(fills.join() === '100%,100%,100%,100%,30%', 'fractional star tiles ' + fills);
      ok(await t.page.evaluate(() => !document.querySelector('.swiper')), 'no Swiper');
      await track.scrollIntoViewIfNeeded(); await wait2(t.page);
      await t.page.locator(sec + ' [data-lt-next]').click(); await t.page.waitForTimeout(600);
      ok(await track.evaluate(el => el.scrollLeft > 50), 'next moves the row');
      await track.evaluate(el => el.scrollTo({left: 0, behavior: 'instant'})); await t.page.waitForTimeout(80);
      await t.page.locator(sec + ' [data-lt-prev]').click(); await t.page.waitForTimeout(1200);
      ok(await track.evaluate(el => el.scrollLeft >= el.scrollWidth - el.clientWidth - 4), 'prev on the first card loops to the end');
      await track.evaluate(el => el.scrollTo({left: 0, behavior: 'instant'})); await t.page.waitForTimeout(80);
      if (width === 375) {
        const more = t.page.locator(sec + ' .t4__more').first();
        ok(await more.isVisible() && (await t.page.locator(sec + ' .t4__more').nth(1).isHidden()), 'Read more only on a long review');
        await more.click();
        ok(await more.getAttribute('aria-expanded') === 'true' && (await t.page.locator(sec + ' .t4__full').first().isVisible()) && (await more.textContent()).trim() === 'View less', 'Read more opens the review');
        await more.click();
        ok(await more.getAttribute('aria-expanded') === 'false' && (await t.page.locator(sec + ' .t4__short').first().isVisible()), 'and closes it');
        const ab = await t.page.locator(sec + ' [data-lt-next]').evaluate(el => { const r = el.getBoundingClientRect(); return [r.width, r.height]; });
        ok(ab[0] >= 44 && ab[1] >= 44, 'arrows are 44px targets');
      } else ok(await t.page.locator(sec + ' .t4__more').first().isHidden() && (await t.page.locator(sec + ' .t4__full').first().isVisible()), 'desktop shows the whole review');
      await t.emit({arrow_size: 30}); await wait2(t.page);
      ok(await t.page.locator(sec + ' [data-lt-next]').evaluate(el => { const r = el.getBoundingClientRect(), x = r.left + r.width / 2 + 20, y = r.top + r.height / 2; return document.elementFromPoint(x, y) === el; }), 'a small arrow keeps a 44px tap area');
      await t.emit({arrow_size: 50}); await wait2(t.page);
    },
  });
  console.log(checks + ' Testimonials 4 round 4 checks passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
