/* Image With Text Bento, Image With Icons, Image With Text Multirow and Image
   With Text Grid: theme inheritance, every visible control (live and after a
   redraw), desktop/mobile values, variants, instances, added blocks, first
   paint, reduced motion and overflow. Uses tests/media-fixture.cjs.
   LIQUIDJS=<path to liquidjs> node tests/theme-media-text-grid.cjs [section] */
const assert = require('assert/strict');
const {launch, mount, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'media-live-text-grid.js';
const IMG = {url: 'https://theme.test/photo-a.png', alt: 'Photo A', width: 800, height: 800};
const IMG2 = {url: 'https://theme.test/photo-b.png', alt: 'Photo B', width: 800, height: 800};
const SVG = '<svg viewBox="0 0 10 10"><circle data-x="1" cx="5" cy="5" r="4"/></svg>';
const THEME_SPACING = '.shopify-section{margin-top:40px}';
let checks = 0;
const ok = (cond, msg) => { assert(cond, msg); checks++; };

/* E(value or {settings}, selector, property, expected). Property: a computed style key, or
   @html @text @src @href @tag @exists @wratio (width / parent width) @hover:<style key>.
   Expected: string, RegExp, function(actual, width), or {d, m} per breakpoint (missing = not checked there). */
const E = (v, sel, p, e, opts = {}) => ({v, sel, p, e, ...opts});
const cols = n => v => v.split(' ').length === n;
const ratio = r => v => Math.abs(+v - r) < 0.02;
const common = ({heading, text = true}) => ({
  color_scheme: E('alt-scheme', '', 'backgroundColor', 'rgb(250, 250, 250)'),
  section_width: E('full_width', '.tg__inner', 'maxWidth', 'none'),
  reset_spacing: E(false, '@wrap', 'marginTop', '40px'),
  enable_custom_style: E({enable_custom_style: true, section_bg: '#abcdef'}, '', 'backgroundColor', 'rgb(171, 205, 239)'),
  section_bg: E({enable_custom_style: true, section_bg: '#123123'}, '', 'backgroundColor', 'rgb(18, 49, 35)'),
  ...(text ? {text_color: E({enable_custom_style: true, text_color: '#00ff00'}, '', 'color', 'rgb(0, 255, 0)')} : {}),
  enable_custom_fonts: E({enable_custom_fonts: true, heading_font: {family: 'Arial'}}, heading, 'fontFamily', /^Arial/),
  heading_font: E({enable_custom_fonts: true, heading_font: {family: 'Verdana'}}, heading, 'fontFamily', /^Verdana/),
  body_font: E({enable_custom_fonts: true, body_font: {family: 'Courier New'}}, '', 'fontFamily', /^"?Courier New/),
  padding_top_desktop: E(68, '', 'paddingTop', {d: '68px'}),
  padding_bottom_desktop: E(76, '', 'paddingBottom', {d: '76px'}),
  side_padding_desktop: E(40, '', 'paddingLeft', {d: '40px'}),
  section_margin_top_desktop: E(20, '@wrap', 'marginTop', {d: '20px'}),
  section_margin_bottom_desktop: E(24, '@wrap', 'marginBottom', {d: '24px'}),
  padding_top_mobile: E(34, '', 'paddingTop', {m: '34px'}),
  padding_bottom_mobile: E(38, '', 'paddingBottom', {m: '38px'}),
  side_padding_mobile: E(12, '', 'paddingLeft', {m: '12px'}),
  section_margin_top_mobile: E(10, '@wrap', 'marginTop', {m: '10px'}),
  section_margin_bottom_mobile: E(12, '@wrap', 'marginBottom', {m: '12px'}),
});
const textBlocks = (prefix, hd, hm, sd, sm) => ({
  eyebrow: {
    text: E('Just in', '', '@text', 'Just in'),
    enable_custom_style: E({enable_custom_style: true, color: '#ff0000'}, '', 'color', 'rgb(255, 0, 0)'),
    color: E({enable_custom_style: true, color: '#00ff00'}, '', 'color', 'rgb(0, 255, 0)'),
    size: E(15, '', 'fontSize', '15px'),
  },
  heading: {
    text: E('Made <em>here</em>', '', '@html', 'Made <em>here</em>'),
    enable_custom_style: E({enable_custom_style: true, color: '#ff0000'}, '', 'color', 'rgb(255, 0, 0)'),
    color: E({enable_custom_style: true, color: '#00ff00'}, '', 'color', 'rgb(0, 255, 0)'),
    size_desktop: E(52, '', 'fontSize', {d: '52px'}),
    size_mobile: E(26, '', 'fontSize', {m: '26px'}),
  },
  subheading: {
    text: E('<p>Short <strong>text</strong></p>', '', '@html', '<p>Short <strong>text</strong></p>'),
    enable_custom_style: E({enable_custom_style: true, color: '#ff0000'}, '', 'color', 'rgb(255, 0, 0)'),
    color: E({enable_custom_style: true, color: '#00ff00'}, '', 'color', 'rgb(0, 255, 0)'),
    size_desktop: E(20, '', 'fontSize', {d: '20px'}),
    size_mobile: E(13, '', 'fontSize', {m: '13px'}),
  },
  button: buttonSpec(''),
});
function buttonSpec(p) {
  const shape = (id, v, k, e) => E({use_theme_button: false, [p + id]: v}, '@btn', k, e);
  const c = (id, v, k, e) => E({enable_custom_style: true, [p + id]: v}, '@btn', k, e);
  return {
    [p ? 'btn_label' : 'label']: E(p ? {btn_label: 'Buy the pack'} : {label: 'Buy the pack'}, '@btn', '@text', 'Buy the pack'),
    [p ? 'btn_link' : 'link']: E(p ? {btn_link: '/pages/pack'} : {link: '/pages/pack'}, '@btn', '@href', '/pages/pack'),
    ...(p ? {} : {full_width: E(true, '@btn', '@wratio', ratio(1)), uppercase: E({uppercase: true, label: 'buy'}, '@btn', 'textTransform', 'uppercase')}),
    enable_custom_style: c('bg', '#00aa00', 'backgroundColor', 'rgb(0, 170, 0)'),
    [p + 'bg']: c('bg', '#0000aa', 'backgroundColor', 'rgb(0, 0, 170)'),
    [p + 'color']: c('color', '#aa0000', 'color', 'rgb(170, 0, 0)'),
    [p + 'border_color']: c('border_color', '#00ffff', 'borderTopColor', 'rgb(0, 255, 255)'),
    [p + 'bg_hover']: c('bg_hover', '#00ff00', '@hover:backgroundColor', 'rgb(0, 255, 0)'),
    [p + 'color_hover']: c('color_hover', '#0000ff', '@hover:color', 'rgb(0, 0, 255)'),
    [p + 'border_color_hover']: c('border_color_hover', '#ff00ff', '@hover:borderTopColor', 'rgb(255, 0, 255)'),
    use_theme_button: E({use_theme_button: false, [p + 'radius']: 3}, '@btn', 'borderTopLeftRadius', '3px'),
    [p + 'padding_x']: shape('padding_x', 40, 'paddingLeft', '40px'),
    [p + 'padding_y']: shape('padding_y', 20, 'paddingTop', '20px'),
    [p + 'radius']: shape('radius', 30, 'borderTopLeftRadius', '30px'),
    [p + 'border_width']: shape('border_width', 3, 'borderTopWidth', '3px'),
    [p + 'font_size']: shape('font_size', 21, 'fontSize', '21px'),
    [p + 'font_weight']: shape('font_weight', '700', 'fontWeight', '700'),
  };
}

const SECTIONS = {
  'image-with-text-bento': {
    bp: 768, heading: '.iwb__title', text: '[data-style="tint"] .iwb__body', button: null,
    extraBlocks: [{type: 'text_over_image', settings: {heading: 'Over a photo', body: '<p>Readable on any photo.</p>', caption: 'Look'}}],
    added: {type: 'text_card', settings: {heading: 'Added card'}}, addedSel: '.iwb__heading',
    section: {
      ...common({heading: '.iwb__title', text: false}),
      custom_max_width_desktop: E({section_width: 'custom', custom_max_width_desktop: 900}, '.tg__inner', 'maxWidth', '900px'),
      columns: E('4', '.iwb__grid', 'gridTemplateColumns', {d: cols(4), m: cols(1)}),
      gap_desktop: E(30, '.iwb__grid', 'columnGap', {d: '30px'}),
      row_height_desktop: E(400, '.iwb__grid', 'gridAutoRows', {d: /400px/}),
      head_gap: E({head_gap: 52, heading: 'Hi'}, '.iwb__head', 'marginBottom', '52px'),
      card_padding: E(40, '.iwb__card-content', 'paddingTop', '40px'),
      scale_desktop: E(110, '.iwb__grid', 'zoom', {d: '1.1'}),
      card_radius: E(10, '.iwb__card', 'borderTopLeftRadius', '10px'),
      section_heading_color: E({enable_custom_style: true, section_heading_color: '#ff0000', heading: 'Hi'}, '.iwb__title', 'color', 'rgb(255, 0, 0)'),
      section_subheading_color: E({enable_custom_style: true, section_subheading_color: '#00ff00', subheading: 'Hi'}, '.iwb__sub', 'color', 'rgb(0, 255, 0)'),
      section_heading_size_desktop: E({section_heading_size_desktop: 50, heading: 'Hi'}, '.iwb__title', 'fontSize', {d: '50px'}),
      card_heading_size_desktop: E(36, '.iwb__heading', 'fontSize', {d: '36px'}),
      card_body_size: E(18, '.iwb__body', 'fontSize', '18px'),
      gap_mobile: E(10, '.iwb__grid', 'rowGap', {m: '10px'}),
      row_height_mobile: E(300, '.iwb__card', 'minHeight', {m: '300px'}),
      section_heading_size_mobile: E({section_heading_size_mobile: 22, heading: 'Hi'}, '.iwb__title', 'fontSize', {m: '22px'}),
      card_heading_size_mobile: E(20, '.iwb__heading', 'fontSize', {m: '20px'}),
    },
    blocks: {
      heading: {
        text: E('Our <em>studio</em>', '', '@html', 'Our <em>studio</em>'),
        enable_custom_style: E({enable_custom_style: true, color: '#ff0000'}, '', 'color', 'rgb(255, 0, 0)'),
        color: E({enable_custom_style: true, color: '#00ff00'}, '', 'color', 'rgb(0, 255, 0)'),
        size_enable: E({size_enable: true, size_desktop: 52, size_mobile: 21}, '', 'fontSize', {d: '52px', m: '21px'}),
        size_desktop: E({size_enable: true, size_desktop: 56}, '', 'fontSize', {d: '56px', m: '28px'}),
        size_mobile: E({size_enable: true, size_mobile: 24}, '', 'fontSize', {d: '40px', m: '24px'}),
      },
      subheading: {
        text: E('<p>Small <strong>batches</strong></p>', '', '@html', '<p>Small <strong>batches</strong></p>'),
        enable_custom_style: E({enable_custom_style: true, color: '#ff0000'}, '', 'color', 'rgb(255, 0, 0)'),
        color: E({enable_custom_style: true, color: '#00ff00'}, '', 'color', 'rgb(0, 255, 0)'),
        size_enable: E({size_enable: true, size: 19}, '', 'fontSize', '19px'),
        size: E({size_enable: true, size: 13}, '', 'fontSize', '13px'),
      },
      text_card: {
        caption: E('New in', '.iwb__caption', '@text', 'New in'),
        heading: E('Card <em>one</em>', '.iwb__heading', '@html', 'Card <em>one</em>'),
        body: E('<p>Body <strong>copy</strong></p>', '.iwb__body', '@html', '<p>Body <strong>copy</strong></p>'),
        card_style: E('outline', '', 'borderTopColor', 'rgb(68, 85, 102)'),
        col_span_desktop: E('2', '', 'gridColumnStart', {d: 'span 2'}),
        row_span_desktop: E('2', '', 'gridRowStart', {d: 'span 2'}),
        enable_custom_style: E({enable_custom_style: true, bg: '#abcdef'}, '', 'backgroundColor', 'rgb(171, 205, 239)'),
        bg: E({enable_custom_style: true, bg: '#123456'}, '', 'backgroundColor', 'rgb(18, 52, 86)'),
        text_color: E({enable_custom_style: true, text_color: '#ff0000'}, '.iwb__body', 'color', 'rgb(255, 0, 0)'),
      },
      image_card: {
        image: E({image: IMG}, 'img', '@src', IMG.url),
        col_span_desktop: E('3', '', 'gridColumnStart', {d: 'span 3'}),
        row_span_desktop: E('1', '', 'gridRowStart', {d: 'span 1'}),
      },
      text_over_image: {
        image: E({image: IMG2}, 'img', '@src', IMG2.url),
        caption: E('Look', '.iwb__caption', '@text', 'Look'),
        heading: E('Over <em>it</em>', '.iwb__heading', '@html', 'Over <em>it</em>'),
        body: E('<p>Text <em>on</em> it</p>', '.iwb__body', '@html', '<p>Text <em>on</em> it</p>'),
        content_position: E('bottom', '.iwb__card-content', 'justifyContent', 'flex-end'),
        col_span_desktop: E('2', '', 'gridColumnStart', {d: 'span 2'}),
        row_span_desktop: E('2', '', 'gridRowStart', {d: 'span 2'}),
        overlay_opacity: E(70, '.iwb__overlay', 'opacity', '0.7'),
        enable_custom_style: E({enable_custom_style: true, text_color: '#ffff00'}, '.iwb__heading', 'color', 'rgb(255, 255, 0)'),
        text_color: E({enable_custom_style: true, text_color: '#00ffff'}, '.iwb__body', 'color', 'rgb(0, 255, 255)'),
        overlay_color: E({enable_custom_style: true, overlay_color: '#ff0000'}, '.iwb__overlay', 'backgroundColor', 'rgb(255, 0, 0)'),
      },
    },
    variantPre: {columns: {}, card_style: {}, content_position: {}},
  },

  'image-with-text-icons': {
    bp: 900, heading: '.iwi__heading', text: '.iwi__subheading', button: '.iwi__btn',
    extraBlocks: [{type: 'eyebrow'}, {type: 'button', settings: {label: 'Shop the store', link: '/collections/all'}}],
    added: {type: 'feature', settings: {label: 'Added feature', icon_library: 'gift'}}, addedSel: '.iwi__feature-label',
    section: {
      ...common({heading: '.iwi__heading'}),
      image_position: E('right', '.iwi__grid', 'flexDirection', {d: 'row-reverse', m: 'column'}),
      content_align: E('center', '.iwi__text', 'textAlign', {d: 'center', m: 'left'}),
      text_column_width: E(40, '.iwi__text', '@wratio', {d: ratio(0.4)}),
      gap_desktop: E(80, '.iwi__grid', 'columnGap', {d: '80px'}),
      content_gap: E(30, '.iwi__text', 'rowGap', '30px'),
      features_columns_desktop: E('3', '.iwi__features', 'gridTemplateColumns', {d: cols(3)}),
      features_gap_desktop: E(30, '.iwi__features', 'columnGap', {d: '30px'}),
      features_margin_top: E(20, '.iwi__features', 'marginTop', '20px'),
      icon_size: E(60, '.iwi__icon', 'width', '60px'),
      icon_radius_style: E('square', '.iwi__icon', 'borderTopLeftRadius', '0px'),
      icon_glyph_size: E(80, '.iwi__icon svg', 'width', /^35\.\d+px$/),
      feature_label_size: E(16, '.iwi__feature-label', 'fontSize', '16px'),
      feature_label_weight: E('600', '.iwi__feature-label', 'fontWeight', '600'),
      icon_bg: E({enable_custom_style: true, icon_bg: '#ff0000'}, '.iwi__icon', 'backgroundColor', 'rgb(255, 0, 0)'),
      icon_color: E({enable_custom_style: true, icon_color: '#00ff00'}, '.iwi__icon', 'color', 'rgb(0, 255, 0)'),
      feature_label_color: E({enable_custom_style: true, feature_label_color: '#0000ff'}, '.iwi__feature-label', 'color', 'rgb(0, 0, 255)'),
      content_align_mobile: E('right', '.iwi__text', 'textAlign', {m: 'right', d: 'left'}),
      gap_mobile: E(10, '.iwi__grid', 'rowGap', {m: '10px'}),
      features_columns_mobile: E('3', '.iwi__features', 'gridTemplateColumns', {m: cols(3)}),
      features_gap: E(10, '.iwi__features', 'columnGap', {m: '10px'}),
    },
    blocks: {
      image: {
        image: E({image: IMG}, 'img', '@src', IMG.url),
        aspect_w: E(16, '', 'aspectRatio', '16 / 3'),
        aspect_h: E(9, '', 'aspectRatio', '4 / 9'),
        fit: E({image: IMG, fit: 'contain'}, 'img', 'objectFit', 'contain'),
        radius: E(30, '', 'borderTopLeftRadius', '30px'),
      },
      ...textBlocks(),
      feature: {
        label: E('Free returns', '.iwi__feature-label', '@text', 'Free returns'),
        icon_type: E({icon_type: 'svg', icon_svg: SVG}, '.iwi__icon [data-x]', '@exists', 'true'),
        icon_library: E('truck', '.iwi__icon', '@html', /M14 18V6/, {editorOnly: true}),
        icon_svg: E({icon_type: 'svg', icon_svg: SVG.replace('r="4"', 'r="3"')}, '.iwi__icon circle[r="3"]', '@exists', 'true'),
        icon_image: E({icon_type: 'image', icon_image: IMG}, '.iwi__icon img', '@src', IMG.url),
        enable_custom_style: E({enable_custom_style: true, icon_bg: '#123456'}, '.iwi__icon', 'backgroundColor', 'rgb(18, 52, 86)'),
        icon_bg: E({enable_custom_style: true, icon_bg: '#ff00ff'}, '.iwi__icon', 'backgroundColor', 'rgb(255, 0, 255)'),
        icon_color: E({enable_custom_style: true, icon_color: '#00ffff'}, '.iwi__icon', 'color', 'rgb(0, 255, 255)'),
        label_color: E({enable_custom_style: true, label_color: '#ffff00'}, '.iwi__feature-label', 'color', 'rgb(255, 255, 0)'),
      },
    },
    variantPre: {icon_type: {icon_svg: SVG, icon_image: IMG}, font_weight: {use_theme_button: false}, fit: {image: IMG}},
  },

  'image-with-text-multirow': {
    bp: 900, heading: '.iwm__heading', text: '.iwm__body', button: '.iwm__btn',
    blocks0: [{type: 'row', settings: {image: IMG, heading: 'First'}}, {type: 'row', settings: {heading: 'Second'}}, {type: 'row', settings: {heading: 'Third'}}],
    added: {type: 'row', settings: {heading: 'Added row'}}, addedSel: '.iwm__heading',
    section: {
      ...common({heading: '.iwm__heading'}),
      alternate_rows: E(false, '.iwm__row:nth-child(2)', 'flexDirection', {d: 'row'}),
      content_align: E('center', '.iwm__text', 'textAlign', {d: 'center'}),
      text_column_width: E(40, '.iwm__text', '@wratio', {d: ratio(0.4)}),
      row_gap_desktop: E(100, '.iwm__rows', 'rowGap', {d: '100px'}),
      col_gap_desktop: E(80, '.iwm__row', 'columnGap', {d: '80px'}),
      content_gap: E(30, '.iwm__text', 'rowGap', '30px'),
      image_aspect_w: E(2, '.iwm__media', 'aspectRatio', '2 / 1'),
      image_aspect_h: E(3, '.iwm__media', 'aspectRatio', '1 / 3'),
      image_fit: E('contain', '.iwm__media img', 'objectFit', 'contain'),
      image_radius: E(30, '.iwm__media', 'borderTopLeftRadius', '30px'),
      image_bg: E({enable_custom_style: true, image_bg: '#ff0000'}, '.iwm__row:nth-child(2) .iwm__media', 'backgroundColor', 'rgb(255, 0, 0)'),
      caption_color: E({enable_custom_style: true, caption_color: '#00ff00'}, '.iwm__caption', 'color', 'rgb(0, 255, 0)'),
      heading_color: E({enable_custom_style: true, heading_color: '#0000ff'}, '.iwm__heading', 'color', 'rgb(0, 0, 255)'),
      body_color: E({enable_custom_style: true, body_color: '#ffff00'}, '.iwm__body', 'color', 'rgb(255, 255, 0)'),
      caption_size: E(16, '.iwm__caption', 'fontSize', '16px'),
      heading_size_desktop: E(50, '.iwm__heading', 'fontSize', {d: '50px'}),
      heading_weight: E('500', '.iwm__heading', 'fontWeight', '500'),
      body_size_desktop: E(20, '.iwm__body', 'fontSize', {d: '20px'}),
      content_align_mobile: E('center', '.iwm__text', 'textAlign', {m: 'center'}),
      row_gap_mobile: E(10, '.iwm__rows', 'rowGap', {m: '10px'}),
      col_gap_mobile: E(10, '.iwm__row', 'rowGap', {m: '10px'}),
      heading_size_mobile: E(24, '.iwm__heading', 'fontSize', {m: '24px'}),
      body_size_mobile: E(13, '.iwm__body', 'fontSize', {m: '13px'}),
    },
    blocks: {
      row: {
        image: E({image: IMG2}, '.iwm__media img', '@src', IMG2.url),
        caption: E('Step one', '.iwm__caption', '@text', 'Step one'),
        heading: E('Row <em>one</em>', '.iwm__heading', '@html', 'Row <em>one</em>'),
        body: E('<p>Row <strong>body</strong></p>', '.iwm__body', '@html', '<p>Row <strong>body</strong></p>'),
        image_position: E('right', '', 'flexDirection', {d: 'row-reverse'}),
        content_align_desktop: E('right', '.iwm__text', 'textAlign', {d: 'right'}),
        content_align_mobile: E('right', '.iwm__text', 'textAlign', {m: 'right'}),
        row_padding: E(20, '', 'paddingTop', '20px'),
        row_radius: E(16, '', 'borderTopLeftRadius', '16px'),
        row_bg: E({enable_custom_style: true, row_bg: '#ff0000'}, '', 'backgroundColor', 'rgb(255, 0, 0)'),
        ...buttonSpec('btn_'),
      },
    },
    variantPre: {btn_font_weight: {use_theme_button: false}},
    /* "Auto" follows the section's alternation, so compare the second row with alternation on and off. */
    variantAcross: {'row.image_position': {index: 1, section: [{alternate_rows: true}, {alternate_rows: false}]},
      'row.content_align_desktop': {index: 0, section: [{content_align: 'left'}, {content_align: 'center'}]}, 'row.content_align_mobile': {index: 0, section: [{content_align_mobile: 'left'}, {content_align_mobile: 'center'}]}},
  },

  imagewithtextgrid: {
    bp: 900, heading: '.iwtg__heading', text: '.iwtg__subheading', button: '.iwtg__btn',
    blocks0: [{type: 'thumb_image', settings: {image: IMG}}, {type: 'thumb_image'}, {type: 'thumb_image'}, {type: 'main_image', settings: {image: IMG}}, {type: 'eyebrow'}, {type: 'heading', settings: {text: 'The new collection'}}, {type: 'subheading'}, {type: 'button', settings: {label: 'Shop the collection'}}],
    added: {type: 'thumb_image', settings: {image: IMG2}}, addedSel: 'img',
    section: {
      ...common({heading: '.iwtg__heading'}),
      text_position: E('left', '.iwtg__grid', 'flexDirection', {d: 'row-reverse'}),
      layout: E('thumbs_right', '.iwtg__media-grid', 'flexDirection', {d: 'row-reverse'}),
      content_align: E('center', '.iwtg__text', 'textAlign', {d: 'center'}),
      text_column_width: E(40, '.iwtg__text', '@wratio', {d: ratio(0.4)}),
      gap_desktop: E(80, '.iwtg__grid', 'columnGap', {d: '80px'}),
      content_gap: E(30, '.iwtg__text', 'rowGap', '30px'),
      thumbs_width: E(30, '.iwtg__thumbs', '@wratio', {d: ratio(0.3)}),
      media_gap: E(24, '.iwtg__media-grid', 'columnGap', '24px'),
      thumbs_gap: E(20, '.iwtg__thumbs', 'rowGap', '20px'),
      image_radius: E(30, '.iwtg__main-wrap', 'borderTopLeftRadius', '30px'),
      main_aspect_w: E(4, '.iwtg__main-wrap', 'aspectRatio', '4 / 3'),
      main_aspect_h: E(5, '.iwtg__main-wrap', 'aspectRatio', '3 / 5'),
      thumb_aspect_w: E(2, '.iwtg__thumb', 'aspectRatio', '2 / 1'),
      thumb_aspect_h: E(3, '.iwtg__thumb', 'aspectRatio', '1 / 3'),
      main_fit: E('contain', '.iwtg__main-wrap img', 'objectFit', 'contain'),
      content_align_mobile: E('center', '.iwtg__text', 'textAlign', {m: 'center'}),
      gap_mobile: E(10, '.iwtg__grid', 'rowGap', {m: '10px'}),
      thumbs_mobile_width: E(40, '.iwtg__thumb', '@wratio', {m: ratio(0.4)}),
      hide_thumbs_on_mobile: E(true, '.iwtg__thumbs', 'display', {m: 'none', d: 'flex'}),
    },
    blocks: {
      main_image: {image: E({image: IMG2}, 'img', '@src', IMG2.url)},
      thumb_image: {image: E({image: IMG2}, 'img', '@src', IMG2.url)},
      ...textBlocks(),
    },
    variantPre: {font_weight: {use_theme_button: false}},
  },
};

/* ------------------------------------------------------------------ helpers */
async function read(t, uid, blockId, entry, width, bp) {
  const {page} = t;
  let sel = entry.sel;
  const base = '#shopify-section-' + uid;
  const scope = blockId ? base + ' [data-tg-block="' + blockId + '"]' : base + ' [data-tg-root]';
  let full;
  if (sel === '@wrap') full = base;
  else if (sel === '@btn') full = blockId ? (await page.locator(scope).evaluate(el => el.matches('[data-theme-button]'))) ? scope : scope + ' [data-theme-button]' : scope;
  else full = sel ? scope + ' ' + sel : scope;
  const loc = page.locator(full).first();
  if (entry.p === '@exists') return String(await page.locator(full).count() > 0);
  if (entry.p.startsWith('@hover:')) {
    await loc.hover(); await page.waitForTimeout(30);
    const v = await loc.evaluate((el, k) => getComputedStyle(el)[k], entry.p.slice(7));
    await page.mouse.move(0, 0); return v;
  }
  return loc.evaluate((el, p) => {
    if (p === '@html') return el.innerHTML.trim();
    if (p === '@text') return el.textContent.trim();
    if (p === '@src') return (el.getAttribute('src') || '').split('?')[0];
    if (p === '@href') return el.tagName + ' ' + el.getAttribute('href');
    if (p === '@wratio') return (el.getBoundingClientRect().width / el.parentElement.getBoundingClientRect().width).toFixed(3);
    return getComputedStyle(el)[p];
  }, entry.p);
}
function expectFor(entry, width, bp) {
  let e = entry.e;
  if (e && typeof e === 'object' && !(e instanceof RegExp) && ('d' in e || 'm' in e)) e = width >= bp ? e.d : e.m;
  if (entry.p === '@href' && typeof e === 'string') e = 'A ' + e;
  return e;
}
function matches(actual, e, width) {
  if (e === undefined) return true;
  if (e instanceof RegExp) return e.test(actual);
  if (typeof e === 'function') return e(actual, width);
  return actual === e;
}
const settingsOf = (id, entry) => entry.v && typeof entry.v === 'object' && !Array.isArray(entry.v) && !('url' in entry.v) && !('family' in entry.v) ? entry.v : {[id]: entry.v};
/* What a revert sets back: the values the instance had before the check. */
const revertOf = (changed, base) => Object.fromEntries(Object.keys(changed).map(k => [k, base[k] === undefined ? '' : base[k]]));

/* A visual signature of the section: box geometry and key computed styles of every element. */
const SIG = uid => {
  const root = document.getElementById('shopify-section-' + uid);
  return [...root.querySelectorAll('[data-tg-root], [data-tg-root] *')].filter(el => !el.closest('template') && el.tagName !== 'STYLE').map(el => {
    const r = el.getBoundingClientRect(), c = getComputedStyle(el);
    return [r.x, r.y, r.width, r.height].map(Math.round).join(',') + ';' + ['color', 'backgroundColor', 'borderTopColor', 'borderTopLeftRadius', 'fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'objectFit', 'display', 'opacity', 'textTransform', 'justifyContent', 'flexDirection', 'zoom', 'width'].map(k => c[k]).join(',') + (el.children.length && el.tagName !== 'svg' ? '' : '|' + el.innerHTML.slice(0, 400));
  }).join('\n');
};
const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const rgbOf = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

/* ------------------------------------------------------------------ per section */
async function testSection(browser, name, cfg) {
  ok(schemaProblems(name).length === 0, name + ' schema: ' + schemaProblems(name).join('; '));
  const opts = {blocks: cfg.blocks0, extraBlocks: cfg.extraBlocks || []};
  const s0 = (await mount(browser, name, {width: 375, ...opts, assets: [ASSET]}));
  const schema = s0.schema; await s0.page.close();
  const ids = new Set(); for (const x of schema.settings) if (x.id) { ok(!ids.has(x.id), 'unique ' + x.id); ids.add(x.id); }
  /* Coverage: every visible setting has a check. */
  for (const x of schema.settings) if (x.id && !x.hidden) ok(cfg.section[x.id], name + ': no check for section setting ' + x.id);
  for (const b of schema.blocks) for (const x of b.settings || []) if (x.id && !x.hidden) ok(cfg.blocks[b.type]?.[x.id], name + ': no check for block ' + b.type + '.' + x.id);

  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const tag = `${name} @${width} ${editing ? 'editor' : 'storefront'}`;
    const t = await mount(browser, name, {width, editing, ...opts, assets: [ASSET]});
    await t.page.addStyleTag({content: THEME_SPACING});
    await t.page.waitForTimeout(50);
    const uid = t.section.id, {page} = t;

    /* 2. Theme inheritance */
    ok(await t.css('[data-tg-root]', 'backgroundColor') === 'rgb(24, 32, 40)', tag + ' scheme background');
    const h = await page.locator('#shopify-section-' + uid + ' ' + cfg.heading).first();
    if (name === 'image-with-text-bento') await t.emit({heading: 'Theme heading'});
    ok(await h.evaluate(el => getComputedStyle(el).color) === 'rgb(255, 255, 255)', tag + ' heading colour');
    ok(/^Georgia/.test(await h.evaluate(el => getComputedStyle(el).fontFamily)), tag + ' heading font');
    const body = page.locator('#shopify-section-' + uid + ' ' + cfg.text).first();
    ok(await body.evaluate(el => getComputedStyle(el).color) === 'rgb(204, 204, 204)', tag + ' text colour ' + await body.evaluate(el => getComputedStyle(el).color));
    ok(/^Arial/.test(await body.evaluate(el => getComputedStyle(el).fontFamily)), tag + ' body font');
    ok(await page.evaluate(uid => getComputedStyle(document.getElementById('shopify-section-' + uid)).marginTop, uid) === '0px', tag + ' reset spacing on by default');
    if (cfg.button) {
      const btn = page.locator('#shopify-section-' + uid + ' ' + cfg.button).first();
      ok(await btn.evaluate(el => getComputedStyle(el).backgroundColor) === 'rgb(18, 52, 86)', tag + ' theme button colour');
      ok(await btn.evaluate(el => getComputedStyle(el).borderTopLeftRadius) === '12px', tag + ' theme button radius');
      ok(await btn.evaluate(el => el.matches('[data-theme-button="primary"][data-sl-button]')), tag + ' button contract');
      ok((await btn.boundingBox()).height >= 44, tag + ' button 44px');
      await btn.hover(); await page.waitForTimeout(30);
      ok(await btn.evaluate(el => getComputedStyle(el).backgroundColor) === 'rgb(255, 0, 0)', tag + ' theme button hover');
      await page.mouse.move(0, 0);
    }
    if (name === 'image-with-text-bento') await t.emit({heading: ''});

    /* 3/4/5/6. Every control, live and after a redraw, at this width */
    const baseS = {...t.section.settings};
    let rev = {};
    for (const [id, entry] of Object.entries(cfg.section)) {
      const ch = settingsOf(id, entry), e = expectFor(entry, width, cfg.bp);
      await t.emit({...rev, ...ch});
      const live = await read(t, uid, null, entry, width, cfg.bp);
      ok(matches(live, e, width), `${tag} live section.${id}: got ${live}`);
      rev = revertOf(ch, baseS);
    }
    await t.emit(rev); rev = {};
    for (const [id, entry] of Object.entries(cfg.section)) {
      const ch = settingsOf(id, entry), e = expectFor(entry, width, cfg.bp);
      await t.redraw({settings: {...rev, ...ch}});
      const got = await read(t, uid, null, entry, width, cfg.bp);
      ok(matches(got, e, width), `${tag} redraw section.${id}: got ${got}`);
      rev = revertOf(ch, baseS);
    }
    await t.redraw({settings: rev});
    /* Custom styling off restores theme values exactly. */
    await t.emit({enable_custom_style: true, section_bg: '#abcdef'});
    await t.emit({enable_custom_style: false});
    ok(await t.css('[data-tg-root]', 'backgroundColor') === 'rgb(24, 32, 40)', tag + ' custom style off restores');
    await t.emit({color_scheme: 'alt-scheme'});
    ok(await h.evaluate(el => getComputedStyle(el).color) === 'rgb(16, 16, 16)' || name === 'image-with-text-bento', tag + ' alt scheme heading');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    ok(await t.css('[data-tg-root]', 'backgroundColor') === 'rgb(250, 250, 250)', tag + ' alt scheme after redraw');
    await t.redraw({settings: {color_scheme: baseS.color_scheme, section_bg: ''}});

    /* Blocks: each block type's controls on its first instance, live and after a redraw. */
    for (const [type, spec] of Object.entries(cfg.blocks)) {
      const idx = t.section.blocks.findIndex(b => b.type === type);
      if (idx < 0) throw new Error(name + ': no ' + type + ' block in the test instance');
      const bid = t.section.blocks[idx].id, baseB = {...t.section.blocks[idx].settings};
      let brev = {};
      for (const [id, entry] of Object.entries(spec)) {
        if (entry.editorOnly && !editing) continue;
        const ch = settingsOf(id, entry), e = expectFor(entry, width, cfg.bp);
        await t.emit({...brev, ...ch}, bid);
        const live = await read(t, uid, bid, entry, width, cfg.bp);
        ok(matches(live, e, width), `${tag} live ${type}.${id}: got ${live}`);
        brev = revertOf(ch, baseB);
      }
      await t.emit(brev, bid);
      const blocksNow = () => t.rendered[0].section.blocks.map(b => ({type: b.type, settings: {...b.settings}}));
      for (const [id, entry] of Object.entries(spec)) {
        const ch = settingsOf(id, entry), e = expectFor(entry, width, cfg.bp);
        const list = blocksNow(); list[idx].settings = {...baseB, ...ch};
        await t.redraw({blocks: list});
        const got = await read(t, uid, t.rendered[0].section.blocks[idx].id, entry, width, cfg.bp);
        ok(matches(got, e, width), `${tag} redraw ${type}.${id}: got ${got}`);
      }
      const list = blocksNow(); list[idx].settings = baseB; await t.redraw({blocks: list});
    }

    /* 10. No image reload on an unrelated edit. */
    const img = page.locator('#shopify-section-' + uid + ' img').first();
    const before = await img.evaluate(el => { el.dataset.mark = 'same'; return el.getAttribute('src'); });
    await t.emit({padding_top_desktop: 90, padding_top_mobile: 50, content_gap: 22, card_padding: 30});
    ok(await img.evaluate(el => el.dataset.mark) === 'same' && await img.getAttribute('src') === before, tag + ' image node and src kept');

    /* 9. Added block renders, is live-editable; redraws do not duplicate listeners. */
    const list = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.settings})).concat([cfg.added]);
    for (let i = 0; i < 3; i++) await t.redraw({blocks: list});
    const added = t.rendered[0].section.blocks[t.rendered[0].section.blocks.length - 1].id;
    const addedLoc = page.locator(`#shopify-section-${uid} [data-tg-block="${added}"]`);
    ok(await addedLoc.count() === 1, tag + ' added block rendered');
    ok(await page.evaluate(() => [MateriaTextGrid.size(), MateriaTextGrid.listeners()].join()) === '1,1', tag + ' no duplicate roots/listeners');
    if (cfg.added.type === 'thumb_image') { await t.emit({image: IMG}, added); ok(await addedLoc.locator('img').getAttribute('src') === IMG.url, tag + ' added block live'); }
    else { const key = cfg.added.type === 'feature' ? 'label' : 'heading'; await t.emit({[key]: 'Edited live'}, added); ok((await addedLoc.locator(cfg.addedSel).textContent()).trim() === 'Edited live', tag + ' added block live'); }

    /* 13. Overflow, targets, errors */
    ok(await t.noOverflow(), tag + ' no horizontal overflow');
    ok(t.errors.length === 0, tag + ' errors: ' + t.errors.join(' | '));
    await page.close();
  }

  /* 7. Variant selects visibly distinct (geometry and styles at 375, 1366 and 1600). */
  {
    const t = await mount(browser, name, {width: 1366, ...opts, assets: [ASSET]});
    await t.page.addStyleTag({content: ':root{--heading-weight:400}'});
    const uid = t.section.id, sig = async () => { const out = []; for (const w of [1600, 1366, 375]) { await t.page.setViewportSize({width: w, height: 900}); await t.page.waitForTimeout(60); out.push(await t.page.evaluate(SIG, uid)); } return out.join('\n#\n'); };
    const selects = [[null, schema.settings]].concat(schema.blocks.map(b => [b.type, b.settings || []]));
    for (const [type, list] of selects) for (const x of list) {
      if (x.type !== 'select' || x.hidden) continue;
      const across = (cfg.variantAcross || {})[(type || 'section') + '.' + x.id];
      const bid = type && t.section.blocks.filter(b => b.type === type)[across ? across.index : 0]?.id;
      const pre = (cfg.variantPre || {})[x.id] || {};
      const seen = new Map();
      for (const o of x.options) {
        await t.emit({...pre, [x.id]: o.value}, bid || undefined);
        let s = '';
        for (const sec of across ? across.section : [null]) { if (sec) await t.emit(sec); s += await sig(); }
        ok(!seen.has(s), `${name} ${type || 'section'}.${x.id}: "${o.value}" looks the same as "${seen.get(s)}"`);
        seen.set(s, o.value);
      }
      await t.emit({[x.id]: x.default}, bid || undefined);
    }
    if (name === 'image-with-text-icons') {
      const bid = t.blockId('feature'), seen = new Set();
      const icons = schema.blocks.find(b => b.type === 'feature').settings.find(x => x.id === 'icon_library').options;
      for (const o of icons) { await t.emit({icon_type: 'library', icon_library: o.value}, bid); const svg = await t.page.locator(`[data-tg-block="${bid}"] .iwi__icon`).innerHTML(); ok(svg.includes('<svg') && !seen.has(svg), 'icon ' + o.value + ' distinct'); seen.add(svg); }
    }
    ok(t.errors.length === 0, name + ' variant errors: ' + t.errors.join(' | '));
    await t.page.close();
  }

  /* 8. Two instances stay independent. */
  {
    const t = await mount(browser, name, {width: 1366, instances: [{uid: 'a', ...opts}, {uid: 'b', ...opts}], assets: [ASSET]});
    await t.emit({padding_top_desktop: 140, enable_custom_style: true, section_bg: '#ff0000'}, undefined, 'a');
    const bidA = t.blockId(name === 'image-with-text-bento' ? 'text_card' : name === 'image-with-text-multirow' ? 'row' : 'heading', 0, 'a');
    await t.emit({heading: 'Only A', text: 'Only A'}, bidA, 'a');
    ok(await t.css('[data-tg-root]', 'backgroundColor', 'a') === 'rgb(255, 0, 0)' && await t.css('[data-tg-root]', 'backgroundColor', 'b') === 'rgb(24, 32, 40)', name + ' instance colours independent');
    ok(await t.css('[data-tg-root]', 'paddingTop', 'b') !== '140px', name + ' instance padding independent');
    ok(!(await t.page.locator('#shopify-section-b').innerText()).includes('Only A'), name + ' instance block independent');
    ok(t.errors.length === 0, name + ' instance errors');
    await t.page.close();
  }

  /* 11. First paint equals the hydrated paint. */
  for (const width of [375, 1366]) for (const custom of [false, true]) {
    const settings = custom ? {enable_custom_style: true, section_bg: '#334455', text_color: '#eeeeee', enable_custom_fonts: true, heading_font: {family: 'Verdana', weight: 700}, body_font: {family: 'Arial'}, section_margin_top_desktop: 12, section_margin_top_mobile: 6} : {};
    const t = await mount(browser, name, {width, settings, ...opts, assets: []});
    const a = await t.page.evaluate(SIG, t.section.id);
    await t.page.addScriptTag({content: require('fs').readFileSync(require('path').join(__dirname, '..', 'shopify/assets', ASSET), 'utf8')});
    await t.page.waitForTimeout(150);
    const b = await t.page.evaluate(SIG, t.section.id);
    if (a !== b) { const al = a.split('\n'), bl = b.split('\n'); const i = al.findIndex((l, n) => l !== bl[n]); console.error('first diff', al[i], '\n vs', bl[i]); }
    ok(a === b, `${name} @${width} first paint equals hydrated (custom ${custom})`);
    await t.page.close();
  }

  /* 12. Reduced motion + theme scroll animation: content visible in editor and storefront. */
  for (const editing of [true, false]) {
    const t = await mount(browser, name, {width: 375, editing, reducedMotion: 'reduce', theme: {scroll_animation: 'fade-in'}, ...opts, assets: [ASSET]});
    await t.page.waitForTimeout(400);
    const h = t.page.locator('#shopify-section-' + t.section.id + ' ' + cfg.text).first();
    ok(await h.isVisible() && await t.page.evaluate(uid => getComputedStyle(document.getElementById('shopify-section-' + uid)).opacity, t.section.id) === '1', name + ' reduced motion content visible');
    ok(t.errors.length === 0, name + ' reduced motion errors');
    await t.page.close();
  }

  /* Bento header blocks: block order, and the hidden legacy heading/subheading
     used only when no block of that type exists (saved instances). */
  if (name === 'image-with-text-bento') {
    const {schemaOf} = require('./media-fixture.cjs');
    const tiles = schemaOf(name).schema.presets[0].blocks.filter(b => !['heading', 'subheading'].includes(b.type));
    const kinds = t => t.page.evaluate(uid => [...document.querySelectorAll('#shopify-section-' + uid + ' .iwb__head > *')].map(e => (e.dataset.iwbLegacy ? 'legacy-' + e.dataset.iwbLegacy : e.dataset.tgType) + (e.hidden ? ':hidden' : '')).join(','), t.section.id);
    for (const width of [375, 1366]) {
      const tag = `${name} @${width}`;
      // Legacy path: no header blocks, saved section text renders and stays live.
      let t = await mount(browser, name, {width, blocks: tiles, settings: {heading: 'Saved <em>heading</em>', subheading: 'Saved sub'}, assets: [ASSET]});
      const uid = t.section.id, q = sel => t.page.locator('#shopify-section-' + uid + ' ' + sel);
      ok(await kinds(t) === 'legacy-heading,legacy-subheading', tag + ' legacy heading and subheading render: ' + await kinds(t));
      ok(await q('.iwb__title').innerHTML() === 'Saved <em>heading</em>' && (await q('.iwb__sub').textContent()).trim() === 'Saved sub', tag + ' legacy text');
      ok(await t.css('.iwb__title', 'color') === 'rgb(255, 255, 255)' && /^Georgia/.test(await t.css('.iwb__title', 'fontFamily')), tag + ' legacy heading theme colour and font');
      ok(await t.css('.iwb__title', 'fontSize') === (width >= 768 ? '40px' : '28px'), tag + ' legacy heading section size');
      await t.emit({heading: 'Live <strong>heading</strong>', enable_custom_style: true, section_subheading_color: '#00ff00'});
      ok(await q('.iwb__title').innerHTML() === 'Live <strong>heading</strong>', tag + ' legacy heading live');
      ok(await t.css('.iwb__sub', 'color') === 'rgb(0, 255, 0)', tag + ' legacy subheading custom colour');
      await t.emit({heading: '', subheading: '', enable_custom_style: false});
      ok(await t.css('.iwb__head', 'display') === 'none', tag + ' empty legacy header takes no space (live)');
      await t.redraw({settings: {heading: '', subheading: ''}});
      ok(await t.css('.iwb__head', 'display') === 'none', tag + ' empty legacy header takes no space (redraw)');
      await t.redraw({settings: {heading: 'Back', subheading: ''}});
      ok(await kinds(t) === 'legacy-heading,legacy-subheading:hidden', tag + ' legacy redraw: ' + await kinds(t));
      ok(t.errors.length === 0, tag + ' legacy errors: ' + t.errors.join(' | '));
      await t.page.close();
      // Mixed: a Subheading block with a saved section heading keeps the heading first.
      t = await mount(browser, name, {width, blocks: [...tiles.slice(0, 2), {type: 'subheading'}], settings: {heading: 'Saved heading', subheading: 'Not shown'}, assets: [ASSET]});
      ok(await kinds(t) === 'legacy-heading,subheading', tag + ' legacy heading above a Subheading block: ' + await kinds(t));
      await t.page.close();
      // Blocks path: header blocks in block order above the grid, tiles in the grid, legacy ignored.
      t = await mount(browser, name, {width, blocks: [{type: 'subheading'}, ...tiles.slice(0, 3), {type: 'heading', settings: {text: 'Block heading'}}], settings: {heading: 'Saved heading'}, assets: [ASSET]});
      ok(await kinds(t) === 'subheading,heading', tag + ' header blocks in block order: ' + await kinds(t));
      ok(await t.page.locator('#shopify-section-' + t.section.id + ' .iwb__grid > *').count() === 3, tag + ' only tiles in the grid');
      ok(await t.page.evaluate(uid => document.querySelector('#shopify-section-' + uid + ' .iwb__head').getBoundingClientRect().bottom <= document.querySelector('#shopify-section-' + uid + ' .iwb__grid').getBoundingClientRect().top, t.section.id), tag + ' header above the grid');
      await t.emit({heading: 'Ignored'});
      ok((await t.page.locator('#shopify-section-' + t.section.id + ' .iwb__title').textContent()).trim() === 'Block heading', tag + ' legacy edit leaves the Heading block');
      await t.redraw({blocks: [{type: 'heading', settings: {text: 'Block heading'}}, {type: 'subheading'}, ...tiles.slice(0, 3)]});
      ok(await kinds(t) === 'heading,subheading', tag + ' reordered after redraw: ' + await kinds(t));
      ok(t.errors.length === 0, tag + ' blocks errors: ' + t.errors.join(' | '));
      await t.page.close();
    }
  }

  /* Text over an image stays readable at the default overlay on a white or black photo. */
  if (name === 'image-with-text-bento') {
    for (const scheme of [undefined, 'alt-scheme']) {
      const t = await mount(browser, name, {width: 1366, settings: scheme ? {color_scheme: scheme} : {}, extraBlocks: cfg.extraBlocks, assets: [ASSET]});
      const card = t.page.locator('[data-tg-type="text_over_image"]');
      const [ov, op, fg] = await card.evaluate(el => [getComputedStyle(el.querySelector('.iwb__overlay')).backgroundColor, +getComputedStyle(el.querySelector('.iwb__overlay')).opacity, getComputedStyle(el.querySelector('.iwb__heading')).color]);
      for (const photo of [[255, 255, 255], [0, 0, 0]]) {
        const mix = rgbOf(ov).map((c, i) => c * op + photo[i] * (1 - op));
        const ratioV = contrast(rgbOf(fg), mix);
        ok(ratioV >= 3, `text over image heading contrast ${ratioV.toFixed(2)} (${scheme || 'default'} scheme, photo ${photo[0]})`);
      }
      await t.page.close();
    }
  }
}

(async () => {
  const only = process.argv[2];
  const browser = await launch();
  try {
    for (const [name, cfg] of Object.entries(SECTIONS)) if (!only || only === name) { const n = checks; await testSection(browser, name, cfg); console.log(name + ': ' + (checks - n) + ' checks'); }
    console.log(checks + ' text-grid checks passed (Bento, Icons, Multirow, Grid: theme, every control live and redrawn, desktop/mobile, variants, instances, added blocks, first paint, reduced motion, overflow)');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message || e); process.exit(1); });
