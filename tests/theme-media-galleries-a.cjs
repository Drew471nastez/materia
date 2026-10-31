/* Galleries A: Gallery Simple 1 (gallery-basic2), Gallery Grid 1 (gallery-grid1),
   Gallery Interactive 2 (gallery-interactive) and Gallery Simple 3
   (gallery-simple3), with the live controller shopify/assets/media-live-galleries-a.js.

   Every non-hidden setting is changed live (storelib:settings-change) and by a
   server-style redraw, and its effect is read from the element it controls.
   Also: theme inheritance, colour schemes, custom style/fonts on and off,
   desktop/mobile values, distinct variants, two instances, added blocks,
   no image reload, first paint equals hydrated paint, reduced motion, panel
   interaction by pointer, touch and keyboard, no overflow and no errors.

   Run: LIQUIDJS=<path to liquidjs> node tests/theme-media-galleries-a.cjs [section] */
const assert = require('assert/strict'), {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'media-live-galleries-a.js';
const IMG = {url: 'https://theme.test/photo-a.png', width: 800, height: 600, alt: 'Saved alt'};
const IMG2 = {url: 'https://theme.test/photo-b.png', width: 800, height: 800};
const VID = 'https://theme.test/clip.mp4';
const TEST_CSS = '.shopify-section{margin-top:40px}.shopify-section *{transition-duration:0s!important;transition-delay:0s!important}';
const only = process.argv[2];
let checks = 0;
const ok = (cond, msg) => { assert(cond, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };

const cols = v => v.split(' ').filter(Boolean).length;
const scale = m => { const x = /matrix\(([^,]+)/.exec(m); return x ? (+x[1]).toFixed(2) : m; };

/* Control tables. want: value or (width) => value. sel is inside the section root (#shopify-section-<id>). */
const W = (m, d) => w => w < 750 ? m : d;
const SECTIONS = {
  'gallery-basic2': {
    blocks: [{type: 'image', settings: {background_image: IMG, gallery_link_url: '/pages/a'}}, {type: 'image', settings: {background_image: IMG2, video_url: VID}}, {type: 'image'}],
    heading: null, button: null,
    controls: [
      {id: 'section_width', v: 'container', sel: '.mga__frame', prop: 'paddingLeft', want: '15px'},
      {id: 'reset_spacing', v: false, wrapper: 'marginTop', want: '40px'},
      {id: 'columns_desktop', v: 2, sel: '.mga-b2__grid', prop: 'gridTemplateColumns', map: cols, want: W(1, 2)},
      {id: 'gutter', v: 33, sel: '.mga-b2__grid', prop: 'columnGap', want: W('20px', '33px')},
      {id: 'container_max_width', v: 800, sel: '.mga-b2__inner', prop: 'maxWidth', want: '800px'},
      {id: 'img_proportion', v: '100%', sel: '.mga-b2__media', prop: 'aspectRatio', want: W('100 / 80', '100 / 100')},
      {id: 'image_border_radius', v: 17, sel: '.mga-b2__media', prop: 'borderTopLeftRadius', want: '17px'},
      {id: 'make_images_circle', v: true, sel: '.mga-b2__media', prop: 'borderTopLeftRadius', want: '50%'},
      {id: 'image_shadow', v: 'high', sel: '.mga-b2__media', prop: 'boxShadow', want: 'rgba(0, 0, 0, 0.3) 0px 6px 12px 0px'},
      {id: 'image_hover_animation', v: 'scale_up', hover: '.mga-b2__item:nth-child(1) .mga-b2__media', sel: '.mga-b2__item:nth-child(1) img', prop: 'transform', map: scale, want: '1.10'},
      {id: 'display_video_first', v: true, sel: '.mga-b2__item:nth-child(2) img', prop: 'opacity', want: '0', hover: '.mga-b2__item:nth-child(2) .mga-b2__media', hoverWant: '1'},
      {id: 'display_image_first', v: true, sel: '.mga-b2__item:nth-child(2) video', prop: 'opacity', want: '0', hover: '.mga-b2__item:nth-child(2) .mga-b2__media', hoverWant: '1'},
      {id: 'icon_size', v: 24, sel: '.mga-b2__link svg', prop: 'width', want: '24px'},
      {id: 'lazyload', v: false, sel: '.mga-b2__item:nth-child(1) img', attr: 'loading', want: 'eager'},
      {id: 'section_bg', v: '#abcdef', with: {enable_custom_style: true}, sel: '.mga', prop: 'backgroundColor', want: 'rgb(171, 205, 239)'},
      {id: 'background_color', v: '#123123', with: {enable_custom_style: true}, sel: '.mga-b2__frame', prop: 'backgroundColor', want: 'rgb(18, 49, 35)'},
      {id: 'link_bg', v: '#00ff00', with: {enable_custom_style: true}, sel: '.mga-b2__link', prop: 'backgroundColor', want: 'rgb(0, 255, 0)'},
      {id: 'link_color', v: '#ff00ff', with: {enable_custom_style: true}, sel: '.mga-b2__link', prop: 'color', want: 'rgb(255, 0, 255)'},
      {id: 'enable_custom_style', v: true, with: {section_bg: '#abcdef'}, sel: '.mga', prop: 'backgroundColor', want: 'rgb(171, 205, 239)'},
      {id: 'section_padding_top', v: 71, sel: '.mga', prop: 'paddingTop', want: W('50px', '71px')},
      {id: 'section_padding_bottom', v: 72, sel: '.mga', prop: 'paddingBottom', want: W('50px', '72px')},
      {id: 'columns_mobile', v: 2, sel: '.mga-b2__grid', prop: 'gridTemplateColumns', map: cols, want: W(2, 3)},
      {id: 'img_proportion_mobile', v: '100%', sel: '.mga-b2__media', prop: 'aspectRatio', want: W('100 / 100', '100 / 125')},
      {id: 'vertical_space_mobile', v: 13, sel: '.mga-b2__grid', prop: 'rowGap', want: W('13px', '20px')},
      {id: 'section_padding_top_mobile', v: 31, sel: '.mga', prop: 'paddingTop', want: W('31px', '50px')},
      {id: 'section_padding_bottom_mobile', v: 32, sel: '.mga', prop: 'paddingBottom', want: W('32px', '50px')},
      {id: 'custom_css', v: uid => '#shopify-section-' + uid + ' .mga-b2__grid{outline:3px solid rgb(1, 2, 3)}', sel: '.mga-b2__grid', prop: 'outlineColor', want: 'rgb(1, 2, 3)'},
      {block: 2, id: 'background_image', v: {url: 'https://theme.test/new.png'}, sel: '.mga-b2__item:nth-child(3) img', attr: 'src', map: v => /new\.png/.test(v || ''), want: true, visible: '.mga-b2__item:nth-child(3) img'},
      {block: 0, id: 'alt', v: 'A plain description', sel: '.mga-b2__item:nth-child(1) img', attr: 'alt', want: 'A plain description'},
      {block: 2, id: 'video_url', v: VID, sel: '.mga-b2__item:nth-child(3) video', attr: 'src', want: VID, visible: '.mga-b2__item:nth-child(3) video'},
      {block: 2, id: 'gallery_link_url', v: '/pages/c', sel: '.mga-b2__item:nth-child(3) a', attr: 'href', want: '/pages/c', visible: '.mga-b2__item:nth-child(3) a'},
      {block: 0, id: 'link_label', v: 'Open the lookbook', sel: '.mga-b2__item:nth-child(1) a', attr: 'aria-label', want: 'Open the lookbook'},
    ],
    variants: [
      {id: 'section_width', sig: ['.mga__frame', ['maxWidth', 'paddingLeft']]},
      {id: 'img_proportion', sig: ['.mga-b2__media', ['height']], width: 1366},
      {id: 'image_shadow', sig: ['.mga-b2__media', ['boxShadow']]},
      {id: 'image_hover_animation', sig: ['.mga-b2__item:nth-child(1) img', ['transform']], hover: '.mga-b2__item:nth-child(1) .mga-b2__media'},
    ],
    image: {block: 0, img: '.mga-b2__item:nth-child(1) img', video: '.mga-b2__item:nth-child(2) video'},
    added: {type: 'image', sel: '.mga-b2__item', setting: 'alt', attr: ['img', 'alt']},
  },
  'gallery-grid1': {
    settings: {background_image_1: IMG, video_url_2: VID, background_image_3: IMG2},
    controls: [
      {id: 'is_fullwidth', v: true, sel: '.mga-g1__frame', prop: 'maxWidth', want: 'none'},
      {id: 'display_section_on', v: 'mobile_only', sel: '.mga', prop: 'display', want: W('block', 'none')},
      {id: 'reset_spacing', v: false, wrapper: 'marginTop', want: '40px'},
      {id: 'container_max_width', v: 900, sel: '.mga-g1__frame', prop: 'maxWidth', want: '900px'},
      {id: 'gutter', v: 30, sel: '.mga-g1__grid', prop: 'columnGap', want: '30px'},
      {id: 'vertical_space_desktop', v: 33, sel: W('.mga-g1__grid', '.mga-g1__side'), prop: 'rowGap', want: W('20px', '33px')},
      ...[1, 2, 3, 4].flatMap(n => [
        {id: 'background_image_' + n, v: {url: 'https://theme.test/slot' + n + '.png'}, with: {['video_url_' + n]: ''}, sel: '[data-mga-slot="' + n + '"] img', attr: 'src', map: v => new RegExp('slot' + n).test(v || ''), want: true, visible: '[data-mga-slot="' + n + '"] img'},
        {id: 'alt_' + n, v: 'Slot ' + n, sel: '[data-mga-slot="' + n + '"] img', attr: 'alt', want: 'Slot ' + n},
        {id: 'video_url_' + n, v: 'https://theme.test/v' + n + '.mp4', sel: '[data-mga-slot="' + n + '"] video', attr: 'src', want: 'https://theme.test/v' + n + '.mp4', visible: '[data-mga-slot="' + n + '"] video'},
      ]),
      {id: 'image_border_radius', v: 19, sel: '[data-mga-slot="1"]', prop: 'borderTopLeftRadius', want: '19px'},
      {id: 'image_hover_animation', v: 'zoom-in', hover: '[data-mga-slot="1"]', sel: '[data-mga-slot="1"] img', prop: 'transform', map: scale, want: '1.10'},
      {id: 'lazyload', v: false, sel: '[data-mga-slot="1"] img', attr: 'loading', want: 'eager'},
      {id: 'enable_custom_style', v: true, with: {section_bg: '#abcdef'}, sel: '.mga', prop: 'backgroundColor', want: 'rgb(171, 205, 239)'},
      {id: 'section_bg', v: '#abcdef', with: {enable_custom_style: true}, sel: '.mga', prop: 'backgroundColor', want: 'rgb(171, 205, 239)'},
      {id: 'background_color', v: '#123123', with: {enable_custom_style: true}, sel: '.mga-g1__frame', prop: 'backgroundColor', want: 'rgb(18, 49, 35)'},
      {id: 'section_padding_top', v: 71, sel: '.mga', prop: 'paddingTop', want: W('50px', '71px')},
      {id: 'section_padding_bottom', v: 72, sel: '.mga', prop: 'paddingBottom', want: W('50px', '72px')},
      {id: 'padding_left_desktop', v: 41, sel: '.mga', prop: 'paddingLeft', want: W('10px', '41px')},
      {id: 'padding_right_desktop', v: 42, sel: '.mga', prop: 'paddingRight', want: W('10px', '42px')},
      {id: 'vertical_space_mobile', v: 13, sel: '.mga-g1__grid', prop: 'rowGap', want: W('13px', '0px')},
      {id: 'section_padding_top_mobile', v: 31, sel: '.mga', prop: 'paddingTop', want: W('31px', '50px')},
      {id: 'section_padding_bottom_mobile', v: 32, sel: '.mga', prop: 'paddingBottom', want: W('32px', '50px')},
      {id: 'padding_left_mobile', v: 21, sel: '.mga', prop: 'paddingLeft', want: W('21px', '25px')},
      {id: 'padding_right_mobile', v: 22, sel: '.mga', prop: 'paddingRight', want: W('22px', '25px')},
      {id: 'custom_css', v: uid => '#shopify-section-' + uid + ' .mga-g1__grid{outline:3px solid rgb(1, 2, 3)}', sel: '.mga-g1__grid', prop: 'outlineColor', want: 'rgb(1, 2, 3)'},
    ],
    variants: [
      {id: 'image_hover_animation', sig: ['[data-mga-slot="1"] img', ['transform', 'opacity']], hover: '[data-mga-slot="1"]'},
      {id: 'display_section_on', sig: ['.mga', ['display']], both: true},
    ],
    image: {img: '[data-mga-slot="1"] img', video: '[data-mga-slot="2"] video'},
  },
  'gallery-interactive': {
    blocks: [{type: 'heading'}, {type: 'subheading'}, {type: 'gallery_image', settings: {image: IMG}}, {type: 'gallery_image', settings: {image: IMG2}}, {type: 'gallery_image'}, {type: 'gallery_image'}],
    heading: '.mga-gi__heading', text: '.mga-gi__sub',
    controls: [
      {id: 'section_width', v: 'container', sel: '.mga__frame', prop: 'paddingLeft', want: '15px'},
      {id: 'display_section_on', v: 'desktop_only', sel: '.mga', prop: 'display', want: W('none', 'block')},
      {id: 'reset_spacing', v: false, wrapper: 'marginTop', want: '40px'},
      {id: 'gallery_height_desktop', v: 50, sel: '.mga-gi__wrap', prop: 'height', want: W('300px', '450px')},
      {id: 'expand_ratio', v: 3, click: '.mga-gi__item:nth-child(1)', sel: '.mga-gi__item:nth-child(1)', prop: 'flexGrow', want: '3'},
      {id: 'image_gap', v: 10, sel: '.mga-gi__wrap', prop: 'columnGap', want: '10px'},
      {id: 'vertical_space_title_subheading', v: 27, sel: '.mga-gi__head', prop: 'rowGap', want: '27px'},
      {id: 'vertical_space_subheading_gallery', v: 44, sel: '.mga-gi__head', prop: 'marginBottom', want: '44px'},
      {id: 'gallery_wrap_border_radius', v: 21, sel: '.mga-gi__wrap', prop: 'borderTopLeftRadius', want: '21px'},
      {id: 'gallery_wrap_shadow', v: 'high', sel: '.mga-gi__wrap', prop: 'boxShadow', want: 'rgba(0, 0, 0, 0.3) 0px 6px 12px 0px'},
      {id: 'enable_custom_style', v: true, with: {section_background_color: '#abcdef'}, sel: '.mga', prop: 'backgroundColor', want: 'rgb(171, 205, 239)'},
      {id: 'section_background_color', v: '#abcdef', with: {enable_custom_style: true}, sel: '.mga', prop: 'backgroundColor', want: 'rgb(171, 205, 239)'},
      {id: 'reveal', special: 'reveal'},
      {id: 'section_padding_top_desktop', v: 71, sel: '.mga', prop: 'paddingTop', want: W('40px', '71px')},
      {id: 'section_padding_bottom_desktop', v: 72, sel: '.mga', prop: 'paddingBottom', want: W('40px', '72px')},
      {id: 'section_padding_left_desktop', v: 73, sel: '.mga', prop: 'paddingLeft', want: W('25px', '73px')},
      {id: 'section_padding_right_desktop', v: 74, sel: '.mga', prop: 'paddingRight', want: W('25px', '74px')},
      {id: 'section_margin_top_desktop', v: 15, sel: '.mga', prop: 'marginTop', want: W('0px', '15px')},
      {id: 'section_margin_bottom_desktop', v: 16, sel: '.mga', prop: 'marginBottom', want: W('0px', '16px')},
      {id: 'gallery_height_mobile', v: 60, sel: '.mga-gi__wrap', prop: 'height', want: W('225px', '630px')},
      {id: 'section_padding_top_mobile', v: 31, sel: '.mga', prop: 'paddingTop', want: W('31px', '75px')},
      {id: 'section_padding_bottom_mobile', v: 32, sel: '.mga', prop: 'paddingBottom', want: W('32px', '65px')},
      {id: 'section_padding_left_mobile', v: 33, sel: '.mga', prop: 'paddingLeft', want: W('33px', '150px')},
      {id: 'section_padding_right_mobile', v: 34, sel: '.mga', prop: 'paddingRight', want: W('34px', '150px')},
      {id: 'section_margin_top_mobile', v: 11, sel: '.mga', prop: 'marginTop', want: W('11px', '0px')},
      {id: 'section_margin_bottom_mobile', v: 12, sel: '.mga', prop: 'marginBottom', want: W('12px', '0px')},
      ...['heading', 'subheading'].flatMap((type, i) => {
        const sel = i ? '.mga-gi__sub' : '.mga-gi__heading', text = i ? 'text' : 'title';
        return [
          {block: i, id: text, v: '<em>Edited ' + type + '</em>', sel: sel + ' em', text: true, want: 'Edited ' + type},
          {block: i, id: 'enable_custom_style', v: true, with: {color: '#cc0033'}, sel, prop: 'color', want: 'rgb(204, 0, 51)'},
          {block: i, id: 'color', v: '#cc0033', with: {enable_custom_style: true}, sel, prop: 'color', want: 'rgb(204, 0, 51)'},
          {block: i, id: 'enable_custom_fonts', v: true, with: {font: {family: 'Arial', fallback_families: 'sans-serif'}}, sel, prop: 'fontFamily', map: v => /^"?Arial/.test(v), want: true},
          {block: i, id: 'font', v: {family: 'Verdana', fallback_families: 'sans-serif'}, with: {enable_custom_fonts: true}, sel, prop: 'fontFamily', map: v => /^"?Verdana/.test(v), want: true},
          {block: i, id: 'font_weight', v: '300', sel, prop: 'fontWeight', want: '300'},
          {block: i, id: 'size_desktop', v: 50, sel, prop: 'fontSize', want: W(i ? '15px' : '30px', '50px')},
          {block: i, id: 'size_mobile', v: 22, sel, prop: 'fontSize', want: W('22px', i ? '16px' : '32px')},
        ];
      }),
      {block: 1, id: 'padding_left_desktop', v: 41, sel: '.mga-gi__sub', prop: 'paddingLeft', want: W('10px', '41px')},
      {block: 1, id: 'padding_right_desktop', v: 42, sel: '.mga-gi__sub', prop: 'paddingRight', want: W('10px', '42px')},
      {block: 1, id: 'padding_left_mobile', v: 21, sel: '.mga-gi__sub', prop: 'paddingLeft', want: W('21px', '20px')},
      {block: 1, id: 'padding_right_mobile', v: 22, sel: '.mga-gi__sub', prop: 'paddingRight', want: W('22px', '20px')},
      {block: 4, id: 'image', v: {url: 'https://theme.test/new.png'}, sel: '.mga-gi__item:nth-child(3) img', attr: 'src', map: v => /new\.png/.test(v || ''), want: true, visible: '.mga-gi__item:nth-child(3) img'},
      {block: 2, id: 'alt', v: 'Linen shirt on a chair', sel: '.mga-gi__item:nth-child(1)', attr: 'aria-label', want: 'Linen shirt on a chair'},
    ],
    variants: [
      {id: 'section_width', sig: ['.mga__frame', ['maxWidth', 'paddingLeft']]},
      {id: 'gallery_wrap_shadow', sig: ['.mga-gi__wrap', ['boxShadow']]},
      {id: 'display_section_on', sig: ['.mga', ['display']], both: true},
    ],
    image: {img: '.mga-gi__item:nth-child(1) img'},
    added: {type: 'gallery_image', sel: '.mga-gi__item', setting: 'alt', attr: [null, 'aria-label']},
  },
  'gallery-simple3': {
    blocks: [{type: 'heading'}, {type: 'subheading'}, {type: 'image', settings: {background_image: IMG, gallery_link_url: '/pages/a'}}, {type: 'image', settings: {background_image: IMG2}}, {type: 'image'}, {type: 'image'}],
    heading: '.mga-s3__title', text: '.mga-s3__sub', button: {sel: '.mga-s3__item:nth-child(1) .mga-s3__btn', hover: '.mga-s3__item:nth-child(1) .mga-s3__btn'},
    controls: [
      {id: 'is_fullwidth', v: false, sel: '.mga-s3__frame', prop: 'maxWidth', want: '1320px'},
      {id: 'reset_spacing', v: false, wrapper: 'marginTop', want: '40px'},
      {id: 'text_align', v: 'left', sel: '.mga-s3__title', prop: 'textAlign', want: 'left'},
      {id: 'container_max_width', v: 900, with: {is_fullwidth: false}, sel: '.mga-s3__frame', prop: 'maxWidth', want: '900px'},
      {id: 'columns_desktop', v: 3, sel: '.mga-s3__grid', prop: 'gridTemplateColumns', map: cols, want: W(2, 3)},
      {id: 'gutter', v: 26, sel: '.mga-s3__grid', prop: 'columnGap', want: '26px'},
      {id: 'img_proportion', v: '56%', sel: '.mga-s3__media', prop: 'aspectRatio', want: '100 / 56'},
      {id: 'image_border_radius', v: 18, sel: '.mga-s3__media', prop: 'borderTopLeftRadius', want: '18px'},
      {id: 'image_hover_animation', v: 'smooth-zoomin-long', hover: '.mga-s3__item:nth-child(2) .mga-s3__media', sel: '.mga-s3__item:nth-child(2) img', prop: 'transform', map: scale, want: '1.10'},
      {id: 'lazyload', v: false, sel: '.mga-s3__item:nth-child(1) img', attr: 'loading', want: 'eager'},
      {id: 'enable_custom_style', v: true, with: {section_bg: '#abcdef'}, sel: '.mga', prop: 'backgroundColor', want: 'rgb(171, 205, 239)'},
      {id: 'section_bg', v: '#abcdef', with: {enable_custom_style: true}, sel: '.mga', prop: 'backgroundColor', want: 'rgb(171, 205, 239)'},
      {id: 'background_color', v: '#123123', with: {enable_custom_style: true}, sel: '.mga-s3__frame', prop: 'backgroundColor', want: 'rgb(18, 49, 35)'},
      {id: 'text_color', v: '#ff8800', with: {enable_custom_style: true}, sel: '.mga-s3__title', prop: 'color', want: 'rgb(255, 136, 0)'},
      {id: 'button_text_color', v: '#00ff00', with: {enable_custom_style: true}, sel: '.mga-s3__item:nth-child(1) .mga-s3__btn', prop: 'color', want: 'rgb(0, 255, 0)'},
      {id: 'enable_custom_fonts', v: true, with: {heading_font: {family: 'Arial', fallback_families: 'sans-serif'}}, sel: '.mga-s3__title', prop: 'fontFamily', map: v => /^"?Arial/.test(v), want: true},
      {id: 'heading_font', v: {family: 'Verdana', fallback_families: 'sans-serif'}, with: {enable_custom_fonts: true}, sel: '.mga-s3__title', prop: 'fontFamily', map: v => /^"?Verdana/.test(v), want: true},
      {id: 'heading_size', v: 52, sel: '.mga-s3__title', prop: 'fontSize', want: W('28px', '52px')},
      {id: 'heading_font_weight', v: 'lighter', sel: '.mga-s3__title', prop: 'fontWeight', want: '100'},
      {id: 'section_padding_top', v: 71, sel: '.mga', prop: 'paddingTop', want: W('50px', '71px')},
      {id: 'section_padding_bottom', v: 72, sel: '.mga', prop: 'paddingBottom', want: W('50px', '72px')},
      {id: 'section_padding_left_desktop', v: 73, sel: '.mga', prop: 'paddingLeft', want: W('0px', '73px')},
      {id: 'section_padding_right_desktop', v: 74, sel: '.mga', prop: 'paddingRight', want: W('0px', '74px')},
      {id: 'columns_mobile', v: 1, sel: '.mga-s3__grid', prop: 'gridTemplateColumns', map: cols, want: W(1, 4)},
      {id: 'heading_size_mobile', v: 24, sel: '.mga-s3__title', prop: 'fontSize', want: W('24px', '35px')},
      {id: 'section_padding_top_mobile', v: 31, sel: '.mga', prop: 'paddingTop', want: W('31px', '50px')},
      {id: 'section_padding_bottom_mobile', v: 32, sel: '.mga', prop: 'paddingBottom', want: W('32px', '50px')},
      {id: 'section_padding_left_mobile', v: 21, sel: '.mga', prop: 'paddingLeft', want: W('21px', '100px')},
      {id: 'section_padding_right_mobile', v: 22, sel: '.mga', prop: 'paddingRight', want: W('22px', '100px')},
      {id: 'custom_class', v: 'lookbook-grid', sel: '.mga', classHas: 'lookbook-grid', want: true},
      {id: 'custom_css', v: uid => '#shopify-section-' + uid + ' .mga-s3__grid{outline:3px solid rgb(1, 2, 3)}', sel: '.mga-s3__grid', prop: 'outlineColor', want: 'rgb(1, 2, 3)'},
      {block: 0, id: 'text', v: '<em>New work</em>', sel: '.mga-s3__title em', text: true, want: 'New work'},
      {block: 0, id: 'enable_custom_style', v: true, with: {color: '#ff8800'}, sel: '.mga-s3__title', prop: 'color', want: 'rgb(255, 136, 0)'},
      {block: 0, id: 'color', v: '#ff8800', with: {enable_custom_style: true}, sel: '.mga-s3__title', prop: 'color', want: 'rgb(255, 136, 0)'},
      {block: 0, id: 'size_enable', v: true, with: {size_desktop: 50, size_mobile: 22}, sel: '.mga-s3__title', prop: 'fontSize', want: W('22px', '50px')},
      {block: 0, id: 'size_desktop', v: 50, with: {size_enable: true}, sel: '.mga-s3__title', prop: 'fontSize', want: W('28px', '50px')},
      {block: 0, id: 'size_mobile', v: 22, with: {size_enable: true}, sel: '.mga-s3__title', prop: 'fontSize', want: W('22px', '35px')},
      {block: 0, id: 'enable_custom_fonts', v: true, with: {font: {family: 'Arial', fallback_families: 'sans-serif'}}, sel: '.mga-s3__title', prop: 'fontFamily', map: v => /^"?Arial/.test(v), want: true},
      {block: 0, id: 'font', v: {family: 'Verdana', fallback_families: 'sans-serif'}, with: {enable_custom_fonts: true}, sel: '.mga-s3__title', prop: 'fontFamily', map: v => /^"?Verdana/.test(v), want: true},
      {block: 1, id: 'text', v: '<p>Shot in the <strong>studio</strong></p>', sel: '.mga-s3__sub strong', text: true, want: 'studio'},
      {block: 1, id: 'enable_custom_style', v: true, with: {color: '#00aa55'}, sel: '.mga-s3__sub', prop: 'color', want: 'rgb(0, 170, 85)'},
      {block: 1, id: 'color', v: '#00aa55', with: {enable_custom_style: true}, sel: '.mga-s3__sub', prop: 'color', want: 'rgb(0, 170, 85)'},
      {block: 1, id: 'size_enable', v: true, with: {size: 21}, sel: '.mga-s3__sub', prop: 'fontSize', want: '21px'},
      {block: 1, id: 'size', v: 13, with: {size_enable: true}, sel: '.mga-s3__sub', prop: 'fontSize', want: '13px'},
      {block: 1, id: 'enable_custom_fonts', v: true, with: {font: {family: 'Georgia', fallback_families: 'serif'}}, sel: '.mga-s3__sub', prop: 'fontFamily', map: v => /^"?Georgia/.test(v), want: true},
      {block: 1, id: 'font', v: {family: 'Verdana', fallback_families: 'sans-serif'}, with: {enable_custom_fonts: true}, sel: '.mga-s3__sub', prop: 'fontFamily', map: v => /^"?Verdana/.test(v), want: true},
      {block: 4, id: 'background_image', v: {url: 'https://theme.test/new.png'}, sel: '.mga-s3__item:nth-child(3) img', attr: 'src', map: v => /new\.png/.test(v || ''), want: true, visible: '.mga-s3__item:nth-child(3) img'},
      {block: 2, id: 'alt', v: 'Ceramic bowls', sel: '.mga-s3__item:nth-child(1) img', attr: 'alt', want: 'Ceramic bowls'},
      {block: 3, id: 'gallery_link_url', v: '/pages/b', sel: '.mga-s3__item:nth-child(2) a', attr: 'href', want: '/pages/b', visible: '.mga-s3__item:nth-child(2) a'},
      {block: 2, id: 'gallery_link_label', v: 'See the set', sel: '.mga-s3__item:nth-child(1) .mga-s3__btn', text: true, want: 'See the set'},
    ],
    variants: [
      {id: 'image_hover_animation', sig: ['.mga-s3__item:nth-child(2) .mga-s3__media', ['transform', 'boxShadow'], 'img', ['transform', 'opacity']], hover: '.mga-s3__item:nth-child(2) .mga-s3__media'},
      {id: 'img_proportion', sig: ['.mga-s3__media', ['height']]},
      {id: 'text_align', sig: ['.mga-s3__title', ['textAlign']]},
    ],
    image: {block: 2, img: '.mga-s3__item:nth-child(1) img'},
    added: {type: 'image', sel: '.mga-s3__item', setting: 'alt', attr: ['img', 'alt']},
  },
};

const visibleIds = s => {
  const out = [];
  for (const x of s.settings || []) if (x.id && !x.hidden) out.push('section.' + x.id);
  for (const b of s.blocks || []) for (const x of b.settings || []) if (x.id && !x.hidden) out.push(b.type + '.' + x.id);
  return out;
};

async function read(t, c, uid, width) {
  const root = '#shopify-section-' + uid;
  const sel = typeof c.sel === 'function' ? c.sel(width) : c.sel;
  return t.page.evaluate(({root, sel, c}) => {
    if (c.wrapper) return getComputedStyle(document.querySelector(root))[c.wrapper];
    const el = document.querySelector(root + ' ' + sel);
    if (!el) return '__missing__';
    if (c.attr) return el.getAttribute(c.attr);
    if (c.text) return el.textContent.trim();
    if (c.classHas) return el.classList.contains(c.classHas);
    return getComputedStyle(el)[c.prop];
  }, {root, sel, c: {wrapper: c.wrapper, attr: c.attr, text: c.text, classHas: c.classHas, prop: c.prop}});
}
const want = (c, w, key = 'want') => typeof c[key] === 'function' ? c[key](w) : c[key];
const mapv = (c, v) => c.map ? c.map(v) : v;

async function check(t, c, uid, width, how) {
  const label = t.name + ' ' + c.id + (c.block != null ? '@' + c.block : '') + ' ' + how + ' ' + width;
  if (c.click) { await t.page.click('#shopify-section-' + uid + ' ' + c.click); await t.page.waitForTimeout(40); }
  if (c.hover && !c.hoverWant) { await t.page.hover('#shopify-section-' + uid + ' ' + c.hover); await t.page.waitForTimeout(40); }
  eq(mapv(c, await read(t, c, uid, width)), want(c, width), label);
  if (c.visible) ok(await t.page.locator('#shopify-section-' + uid + ' ' + c.visible).isVisible(), label + ' visible');
  if (c.hoverWant) { await t.page.hover('#shopify-section-' + uid + ' ' + c.hover); await t.page.waitForTimeout(40); eq(mapv(c, await read(t, c, uid, width)), want(c, width, 'hoverWant'), label + ' hover'); }
  if (c.hover || c.click) { await t.page.mouse.move(1, 1); if (c.click) await t.page.click('#shopify-section-' + uid + ' ' + c.click); await t.page.mouse.move(1, 1); await t.page.waitForTimeout(40); }
}

const blank = v => v === undefined ? '' : v;
async function runControls(t, cfg, width) {
  const uid = t.section.id;
  for (const c of cfg.controls) {
    if (c.special) continue;
    const v = typeof c.v === 'function' ? c.v(uid) : c.v;
    const change = {...(c.with || {}), [c.id]: v};
    if (c.block == null) {
      const base = Object.fromEntries(Object.keys(change).map(k => [k, blank(t.section.settings[k])]));
      // Live edit, then restore.
      await t.emit(change); await check(t, c, uid, width, 'emit'); await t.emit(base);
      // Server redraw, then restore.
      await t.redraw({settings: change}); await check(t, c, uid, width, 'redraw'); await t.redraw({settings: base});
    } else {
      const blockId = t.section.blocks[c.block].id, prev = t.section.blocks[c.block].settings;
      const base = Object.fromEntries(Object.keys(change).map(k => [k, blank(prev[k])]));
      await t.emit(change, blockId); await check(t, c, uid, width, 'emit'); await t.emit(base, blockId);
      const blocks = cur => cur.section.blocks.map((b, i) => ({type: b.type, settings: i === c.block ? {...b.settings, ...change} : b.settings}));
      const saved = t.section.blocks.map(b => ({type: b.type, settings: {...b.settings}}));
      await t.redraw({blocks: blocks(t)}); await check(t, c, uid, width, 'redraw'); await t.redraw({blocks: saved});
    }
  }
}

async function signature(t, v, uid) {
  const [sel, props, sub, subProps] = v.sig;
  if (v.hover) { await t.page.hover('#shopify-section-' + uid + ' ' + v.hover); await t.page.waitForTimeout(40); }
  const out = await t.page.evaluate(({root, sel, props, sub, subProps}) => {
    const el = document.querySelector(root + ' ' + sel), cs = getComputedStyle(el), r = el.getBoundingClientRect();
    const a = props.map(p => p === 'height' ? Math.round(r.height) : cs[p]);
    if (sub) { const s = getComputedStyle(el.querySelector(sub)); a.push(...subProps.map(p => s[p])); }
    return a.join('|');
  }, {root: '#shopify-section-' + uid, sel, props, sub, subProps});
  if (v.hover) { await t.page.mouse.move(1, 1); await t.page.waitForTimeout(40); }
  return out;
}

const boxes = (t, uid) => t.page.evaluate(root => [...document.querySelectorAll(root + ' .mga, ' + root + ' .mga *')].filter(e => e.getClientRects().length && !['STYLE', 'path', 'circle'].includes(e.tagName)).map(e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return [e.className.baseVal ?? e.className, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.fontWeight, c.opacity, c.borderRadius, c.boxShadow].join('|'); }), '#shopify-section-' + uid);

async function section(browser, name) {
  const cfg = SECTIONS[name], {schema} = schemaOf(name);
  // 1. Schema.
  assert.deepEqual(schemaProblems(name), [], name + ' schema'); checks++;
  const covered = new Set(cfg.controls.map(c => (c.block == null ? 'section' : (cfg.blocks[c.block].type)) + '.' + c.id).concat(['section.color_scheme']));
  const missing = visibleIds(schema).filter(id => !covered.has(id));
  assert.deepEqual(missing, [], name + ' every visible setting has a control check'); checks++;
  const opts = {blocks: cfg.blocks, settings: cfg.settings || {}};
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const mode = name + ' ' + width + (editing ? ' editor' : ' storefront');
    // 11. First paint equals hydrated paint.
    const cold = await mount(browser, name, {width, editing, ...opts, assets: []});
    const before = await boxes(cold, 'test'); await cold.page.close();
    const t = await mount(browser, name, {width, editing, ...opts, assets: [ASSET]});
    t.name = name;
    await t.page.waitForTimeout(100);
    assert.deepEqual(await boxes(t, 'test'), before, mode + ' first paint equals hydrated'); checks++;
    const css = (sel, prop, uid = 'test') => t.css(sel, prop, uid);
    // 2. Theme inheritance.
    eq(await css('.mga', 'backgroundColor'), 'rgb(24, 32, 40)', mode + ' scheme background');
    ok(/Arial/.test(await css('.mga', 'fontFamily')), mode + ' body font');
    if (cfg.heading) { eq(await css(cfg.heading, 'color'), 'rgb(255, 255, 255)', mode + ' heading colour'); ok(/Georgia/.test(await css(cfg.heading, 'fontFamily')), mode + ' heading font'); }
    if (cfg.text) { eq(await css(cfg.text, 'color'), 'rgb(204, 204, 204)', mode + ' text colour'); ok(/Arial/.test(await css(cfg.text, 'fontFamily')), mode + ' text font'); }
    if (cfg.button) {
      eq(await css(cfg.button.sel, 'backgroundColor'), 'rgb(18, 52, 86)', mode + ' theme button bg'); eq(await css(cfg.button.sel, 'borderTopLeftRadius'), '12px', mode + ' theme button radius');
      await t.page.hover('#shopify-section-test ' + cfg.button.hover); await t.page.waitForTimeout(60); eq(await css(cfg.button.sel, 'backgroundColor'), 'rgb(255, 0, 0)', mode + ' theme button hover'); await t.page.mouse.move(1, 1);
      eq(await t.page.locator('#shopify-section-test ' + cfg.button.sel).evaluate(e => e.closest('a').tagName), 'A', mode + ' linked button is a link');
    }
    // 3. Colour scheme switch, live and redraw.
    await t.emit({color_scheme: 'alt-scheme'}); eq(await css('.mga', 'backgroundColor'), 'rgb(250, 250, 250)', mode + ' scheme live');
    if (cfg.heading) eq(await css(cfg.heading, 'color'), 'rgb(16, 16, 16)', mode + ' scheme heading live');
    await t.emit({color_scheme: t.section.settings.color_scheme});
    eq(await css('.mga', 'backgroundColor'), 'rgb(24, 32, 40)', mode + ' scheme back');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}}); eq(await css('.mga', 'backgroundColor'), 'rgb(250, 250, 250)', mode + ' scheme redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    // 4. Custom style off restores theme values.
    const colours = Object.fromEntries((schema.settings || []).filter(x => x.type === 'color' && !x.hidden).map(x => [x.id, '#0a0b0c']));
    await t.emit({enable_custom_style: true, ...colours}); eq(await css('.mga', 'backgroundColor'), 'rgb(10, 11, 12)', mode + ' custom on');
    await t.emit({enable_custom_style: false}); eq(await css('.mga', 'backgroundColor'), 'rgb(24, 32, 40)', mode + ' custom off restores scheme');
    if (cfg.heading) eq(await css(cfg.heading, 'color'), 'rgb(255, 255, 255)', mode + ' custom off heading');
    if (cfg.button) eq(await css(cfg.button.sel, 'color'), 'rgb(255, 255, 255)', mode + ' custom off button text');
    await t.emit(Object.fromEntries(Object.keys(colours).map(k => [k, ''])));
    // 5/6. Every control, live and redraw, at this width.
    await t.page.addStyleTag({content: TEST_CSS}); await t.page.waitForTimeout(30);
    await runControls(t, cfg, width);
    // 7. Variants are visibly distinct.
    for (const v of cfg.variants) {
      const field = schema.settings.find(x => x.id === v.id), sigs = [];
      for (const o of field.options) {
        await t.emit({[v.id]: o.value});
        let sig = await signature(t, v, 'test');
        if (v.both) { await t.page.setViewportSize({width: width < 750 ? 1366 : 375, height: 900}); await t.page.waitForTimeout(60); sig += '#' + await signature(t, v, 'test'); await t.page.setViewportSize({width, height: 900}); await t.page.waitForTimeout(60); }
        sigs.push(sig);
      }
      await t.emit({[v.id]: t.section.settings[v.id]});
      if (!v.width || v.width === width) eq(new Set(sigs).size, sigs.length, mode + ' ' + v.id + ' variants distinct: ' + sigs.join(' / '));
    }
    // 10. No image reload or video restart on unrelated edits.
    const im = cfg.image;
    await t.page.evaluate(({img, video}) => { window.__img = document.querySelector('#shopify-section-test ' + img); window.__src = window.__img.getAttribute('src'); window.__vid = video && document.querySelector('#shopify-section-test ' + video); window.__vsrc = window.__vid?.getAttribute('src'); }, im);
    await t.emit({enable_custom_style: true, [Object.keys(colours)[0]]: '#334455'}); await t.emit({enable_custom_style: false});
    if (im.block != null) await t.emit({alt: 'Changed alt only'}, t.section.blocks[im.block].id);
    ok(await t.page.evaluate(({img, video}) => { const i = document.querySelector('#shopify-section-test ' + img), v = video && document.querySelector('#shopify-section-test ' + video); return i === window.__img && i.getAttribute('src') === window.__src && /width=/.test(window.__src) && (!video || (v === window.__vid && v.getAttribute('src') === window.__vsrc)); }, im), mode + ' image and video kept');
    // 13. Overflow, errors.
    ok(await t.noOverflow(), mode + ' no overflow');
    assert.deepEqual(t.errors, [], mode + ' errors'); checks++;
    await t.page.close();
    // 8. Two instances stay independent.
    const two = await mount(browser, name, {width, editing, assets: [ASSET], instances: [{uid: 'a', ...opts}, {uid: 'b', ...opts}]});
    two.name = name;
    await two.emit({enable_custom_style: true, [Object.keys(colours)[0]]: '#abcdef'}, null, 'a');
    eq(await two.css('.mga', 'backgroundColor', 'a') !== 'rgb(24, 32, 40)' || await two.css('.mga > div', 'backgroundColor', 'a') !== 'rgb(24, 32, 40)', true, mode + ' instance a changed');
    eq(await two.css('.mga', 'backgroundColor', 'b'), 'rgb(24, 32, 40)', mode + ' instance b unchanged');
    const pad = cfg.controls.find(c => /padding_top/.test(c.id) && c.block == null && (width < 750) === /mobile/.test(c.id));
    const padB = await read(two, pad, 'b', width);
    await two.emit({[pad.id]: pad.v}, null, 'a');
    eq(await read(two, pad, 'a', width), pad.v + 'px', mode + ' instance a ' + pad.id);
    eq(await read(two, pad, 'b', width), padB, mode + ' instance b keeps ' + pad.id);
    const before2 = await two.page.evaluate(() => window.MateriaGalleriesA.stats());
    eq(before2.roots, 2, mode + ' two roots');
    // 9. Added block plus redraw, live editable, no duplicate listeners.
    if (cfg.added) {
      const blocksA = two.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.settings})).concat([{type: cfg.added.type, settings: {}}]);
      await two.redraw({uid: 'a', blocks: blocksA});
      const count = await two.page.locator('#shopify-section-a ' + cfg.added.sel).count();
      eq(count, (cfg.blocks.filter(b => b.type === cfg.added.type).length) + 1, mode + ' added block rendered');
      const newId = two.rendered[0].section.blocks.at(-1).id;
      await two.emit({[cfg.added.setting]: 'Added block text'}, newId, 'a');
      const [sub, attr] = cfg.added.attr;
      eq(await two.page.locator('#shopify-section-a ' + cfg.added.sel).last().evaluate((el, [sub, attr]) => (sub ? el.querySelector(sub) : el).getAttribute(attr), [sub, attr]), 'Added block text', mode + ' added block live edit');
    } else await two.redraw({uid: 'a'});
    await two.redraw({uid: 'a'});
    assert.deepEqual(await two.page.evaluate(() => window.MateriaGalleriesA.stats()), before2, mode + ' redraw keeps one controller per root'); checks++;
    eq(await two.css('.mga', 'backgroundColor', 'b'), 'rgb(24, 32, 40)', mode + ' b unchanged after a redraw');
    assert.deepEqual(two.errors, [], mode + ' two-instance errors'); checks++;
    await two.page.close();
    // 12. Reduced motion: no hover motion, no transitions, videos stopped, content visible.
    const rm = await mount(browser, name, {width, editing, ...opts, assets: [ASSET], reducedMotion: 'reduce'});
    await rm.page.waitForTimeout(100);
    ok(await rm.page.locator('#shopify-section-test .mga').isVisible(), mode + ' reduced motion visible');
    eq(await rm.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .mga *')].every(e => getComputedStyle(e).transitionDuration.split(',').every(d => parseFloat(d) === 0))), true, mode + ' reduced motion no transitions');
    eq(await rm.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test video')].every(v => v.paused && !v.autoplay)), true, mode + ' reduced motion videos stopped');
    const hov = cfg.controls.find(c => c.id.endsWith('hover_animation'));
    if (hov) { await rm.emit({[hov.id]: hov.v}); await rm.page.hover('#shopify-section-test ' + hov.hover); await rm.page.waitForTimeout(40); eq(await rm.css(hov.sel, 'transform'), 'none', mode + ' reduced motion no hover motion'); }
    assert.deepEqual(rm.errors, [], mode + ' reduced errors'); checks++;
    await rm.page.close();
  }
}

/* Library preview: the first preset with no images is tidy at both widths. */
async function preview(browser, name) {
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: true, assets: [ASSET]});
    const info = await t.page.evaluate(() => { const r = document.querySelector('.mga').getBoundingClientRect(); return {h: r.height, ph: [...document.querySelectorAll('.mga-ph')].filter(e => e.getClientRects().length).length, empty: [...document.querySelectorAll('.mga-media')].every(m => m.getBoundingClientRect().height > 40)}; });
    ok(info.h > 200 && info.h < 2000, name + ' preview height ' + info.h);
    ok(info.ph > 0 && info.empty, name + ' preview placeholders');
    ok(await t.noOverflow(), name + ' preview overflow');
    assert.deepEqual(t.errors, [], name + ' preview errors'); checks++;
    await t.page.close();
  }
}

/* Gallery Interactive 2: panels open by pointer, touch, keyboard; one at a time; per instance. */
async function interactive(browser) {
  const blocks = SECTIONS['gallery-interactive'].blocks;
  for (const width of [375, 1366]) {
    const t = await mount(browser, 'gallery-interactive', {width, editing: false, assets: [ASSET], instances: [{uid: 'a', blocks}, {uid: 'b', blocks}], theme: {}});
    await t.page.addStyleTag({content: TEST_CSS});
    const items = uid => t.page.locator('#shopify-section-' + uid + ' .mga-gi__item');
    const grow = (uid, i) => items(uid).nth(i).evaluate(e => getComputedStyle(e).flexGrow);
    const w = (uid, i) => items(uid).nth(i).evaluate(e => e.getBoundingClientRect().width);
    for (let i = 0; i < 4; i++) ok(await items('a').nth(i).evaluate(e => e.tagName === 'BUTTON' && e.getBoundingClientRect().width >= 44 && e.getBoundingClientRect().height >= 44), width + ' panel ' + i + ' is a 44px button');
    await items('a').nth(1).click(); await t.page.mouse.move(1, 1); await t.page.waitForTimeout(40);
    eq(await items('a').nth(1).getAttribute('aria-expanded'), 'true', width + ' click opens');
    ok(await w('a', 1) > (await w('a', 0)) * 3, width + ' opened panel is wider');
    eq(await grow('b', 1), '1', width + ' other instance unchanged');
    await items('a').nth(2).dispatchEvent('click'); await t.page.waitForTimeout(40);
    eq(await items('a').nth(1).getAttribute('aria-expanded'), 'false', width + ' one open at a time');
    eq(await items('a').nth(2).getAttribute('aria-expanded'), 'true', width + ' second opens');
    await items('a').nth(2).dispatchEvent('click'); eq(await items('a').nth(2).getAttribute('aria-expanded'), 'false', width + ' tap again closes');
    // Keyboard: focus opens (focus-visible), arrows move, Enter toggles.
    await items('b').nth(0).focus(); await t.page.keyboard.press('ArrowRight');
    eq(await t.page.evaluate(() => document.activeElement === document.querySelectorAll('#shopify-section-b .mga-gi__item')[1]), true, width + ' arrow key moves focus');
    await t.page.keyboard.press('End'); eq(await t.page.evaluate(() => document.activeElement === [...document.querySelectorAll('#shopify-section-b .mga-gi__item')].at(-1)), true, width + ' End key');
    await t.page.keyboard.press('Enter'); eq(await items('b').last().getAttribute('aria-expanded'), 'true', width + ' Enter opens');
    eq(await items('b').last().evaluate(e => getComputedStyle(e).outlineStyle), 'solid', width + ' focus ring');
    eq(await grow('b', 3), '7', width + ' focused panel grows');
    // Hover grows.
    if (width > 750) { await items('a').nth(0).hover(); eq(await grow('a', 0), '7', width + ' hover grows'); await t.page.mouse.move(1, 1); }
    assert.deepEqual(t.errors, [], width + ' interactive errors'); checks++;
    await t.page.close();
  }
  // Theme scroll animation follows the reveal setting (redraw).
  for (const reveal of [true, false]) {
    const t = await mount(browser, 'gallery-interactive', {width: 1366, editing: false, assets: [ASSET], theme: {scroll_animation: 'fade-up'}, settings: {reveal}});
    eq(await t.page.locator('#shopify-section-test').evaluate(e => e.classList.contains('scroll-trigger')), reveal, 'reveal ' + reveal + ' hooks the theme scroll animation');
    await t.page.close();
  }
}

/* Gallery Simple 1: media order with both image and video; touch shows the link. */
async function basic(browser) {
  const blocks = SECTIONS['gallery-basic2'].blocks;
  const t = await mount(browser, 'gallery-basic2', {width: 375, editing: false, assets: [ASSET], blocks});
  await t.page.addStyleTag({content: TEST_CSS});
  eq(await t.css('.mga-b2__item:nth-child(2) img', 'opacity'), '0', 'video only by default when both are set');
  ok(await t.page.locator('#shopify-section-test .mga-b2__item:nth-child(1) a').evaluate(e => { const r = e.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; }), 'link target is 44px');
  await t.page.locator('#shopify-section-test .mga-b2__item:nth-child(1) a').focus();
  eq(await t.css('.mga-b2__item:nth-child(1) a', 'opacity'), '1', 'keyboard focus shows the link');
  eq(await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test img')].every(i => i.hasAttribute('alt') && (i.hidden || (i.getAttribute('width') && i.getAttribute('height'))))), true, 'images have alt and size');
  eq(await t.page.locator('#shopify-section-test .mga-b2__item:nth-child(1) img').getAttribute('alt'), 'Saved alt', 'alt falls back to the image alt');
  await t.page.close();
}

/* Gallery Simple 3 header blocks: block order, and the hidden legacy heading_text
   used only when the section has no Heading block (saved instances). */
async function simple3Header(browser) {
  const images = SECTIONS['gallery-simple3'].blocks.filter(b => b.type === 'image');
  for (const width of [375, 1366]) {
    // Legacy path: no header blocks, the old section heading renders and stays live.
    const t = await mount(browser, 'gallery-simple3', {width, editing: true, assets: [ASSET], blocks: images, settings: {heading_text: 'Legacy <em>title</em>'}});
    const title = '#shopify-section-test .mga-s3__title';
    eq(await t.page.locator(title).count(), 1, width + ' legacy heading renders once');
    eq(await t.page.locator(title).getAttribute('data-mga-heading'), '', width + ' legacy heading is the section setting');
    eq(await t.page.locator(title + ' em').textContent(), 'title', width + ' legacy heading text');
    eq(await t.css('.mga-s3__title', 'color'), 'rgb(255, 255, 255)', width + ' legacy heading theme colour');
    ok(/Georgia/.test(await t.css('.mga-s3__title', 'fontFamily')), width + ' legacy heading theme font');
    await t.emit({heading_text: 'Live <strong>legacy</strong>'});
    eq(await t.page.locator(title + ' strong').textContent(), 'legacy', width + ' legacy heading live');
    await t.emit({enable_custom_style: true, text_color: '#ff8800'});
    eq(await t.css('.mga-s3__title', 'color'), 'rgb(255, 136, 0)', width + ' legacy heading custom colour');
    await t.emit({enable_custom_style: false});
    await t.emit({heading_text: ''});
    eq(await t.css('.mga-s3__head', 'display'), 'none', width + ' empty legacy heading leaves no header space (live)');
    await t.redraw({settings: {heading_text: ''}});
    eq(await t.css('.mga-s3__head', 'display'), 'none', width + ' empty legacy heading leaves no header space (redraw)');
    await t.redraw({settings: {heading_text: 'Back again'}});
    eq((await t.page.locator(title).textContent()).trim(), 'Back again', width + ' legacy heading redraw');
    assert.deepEqual(t.errors, [], width + ' legacy errors'); checks++;
    await t.page.close();
    // Blocks path: header blocks render in block order and the legacy value is ignored.
    const b = await mount(browser, 'gallery-simple3', {width, editing: true, assets: [ASSET], blocks: [{type: 'subheading'}, ...images.slice(0, 2), {type: 'heading', settings: {text: 'From the block'}}], settings: {heading_text: 'Legacy title'}});
    eq(await b.page.locator('#shopify-section-test [data-mga-heading]').count(), 0, width + ' legacy heading not rendered when a Heading block exists');
    eq(await b.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .mga-s3__head > *')].map(e => e.dataset.mgaType).join(',')), 'subheading,heading', width + ' header blocks in block order');
    eq(await b.page.locator('#shopify-section-test .mga-s3__item').count(), 2, width + ' image blocks fill the grid');
    ok(await b.page.evaluate(() => { const h = document.querySelector('#shopify-section-test .mga-s3__head').getBoundingClientRect(), g = document.querySelector('#shopify-section-test .mga-s3__grid').getBoundingClientRect(); return h.bottom <= g.top; }), width + ' header above the grid');
    await b.emit({heading_text: 'Ignored'});
    eq((await b.page.locator(title).textContent()).trim(), 'From the block', width + ' legacy edit does not touch the Heading block');
    await b.redraw({blocks: [images[0], {type: 'heading', settings: {text: 'From the block'}}, {type: 'subheading'}]});
    eq(await b.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .mga-s3__head > *')].map(e => e.dataset.mgaType).join(',')), 'heading,subheading', width + ' reordered header blocks after redraw');
    const sub = b.rendered[0].section.blocks.find(x => x.type === 'subheading').id;
    await b.emit({text: ''}, sub);
    eq(await b.page.locator('#shopify-section-test .mga-s3__sub').isVisible(), false, width + ' emptied subheading hides');
    assert.deepEqual(b.errors, [], width + ' blocks errors'); checks++;
    await b.page.close();
    // The first preset: a Heading block, then images.
    const p = await mount(browser, 'gallery-simple3', {width, editing: true, assets: [ASSET]});
    eq(await p.page.locator(title).getAttribute('data-mga-type'), 'heading', width + ' preset heading is a block');
    eq((await p.page.locator(title).textContent()).trim(), 'Gallery', width + ' preset heading text');
    await p.page.close();
  }
}

(async () => {
  const browser = await launch();
  try {
    for (const name of Object.keys(SECTIONS)) {
      if (only && only !== name) continue;
      await section(browser, name);
      await preview(browser, name);
      if (name === 'gallery-interactive') await interactive(browser);
      if (name === 'gallery-basic2') await basic(browser);
      if (name === 'gallery-simple3') await simple3Header(browser);
    }
    console.log(checks + ' galleries-a checks passed (Gallery Simple 1, Gallery Grid 1, Gallery Interactive 2, Gallery Simple 3 with header blocks and legacy heading: schema, theme, schemes, custom style/fonts, every control live and redraw, desktop/mobile, variants, instances, added blocks, no reload, first paint, reduced motion, interaction, previews)');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
