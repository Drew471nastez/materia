/* Round 3 rules for Features group c: every custom font, weight, size, line
   height, letter spacing and capitalisation control wins over the real theme
   priority rules (snippets/theme-controls), live and after a redraw, at 375
   and 1366, editor and storefront, on the element and a descendant, and
   switching it off brings the theme value back. Theme inheritance once more
   with both priorities off. Runner: tests/theme-media-image-video-priority.cjs.

   LIQUIDJS=<path to liquidjs> node tests/theme-features-c-priority.cjs */
const {run, FONT, MONO} = require('./theme-media-image-video-priority.cjs');
const A = 'live-features-c.js';
const D = bp => w => w >= bp;
const size = (bp, d, m) => w => w >= bp ? d + 'px' : m + 'px';
const FONTS = {heading_font: FONT, body_font: MONO};
const cases = [
  /* Content Tabs */
  {name: 'content-tabs', asset: A, label: 'section custom fonts', probes: [['h', '.ctabs__heading', 'fontFamily'], ['t', '.ctabs__title', 'fontFamily'], ['d', '.ctabs__desc', 'fontFamily'], ['f', '.ctabs__footer p', 'fontFamily'], ['hl', '.ctabs__highlight', 'fontFamily'], ['tw', '.ctabs__title', 'fontWeight']],
    on: {enable_custom_fonts: true, ...FONTS}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, t: /Verdana/, d: /Courier New/, f: /Courier New/, hl: /Courier New/, tw: '700'}, same: ['tw'], attrs: [['.ctabs', 'data-own-font']]},
  {name: 'content-tabs', asset: A, block: 'heading', label: 'heading custom font and weight', probes: [['h', '.ctabs__heading', 'fontFamily'], ['hw', '.ctabs__heading', 'fontWeight'], ['s', '.ctabs__heading strong', 'fontFamily']],
    on: {heading_custom_font_enable: true, heading_font: FONT, heading_font_weight: '300', heading: 'Inside <strong>the</strong> formula'}, off: {heading_custom_font_enable: false, heading: 'Inside <strong>the</strong> formula'}, want: {h: /Verdana/, hw: '300', s: /Verdana/}, attrs: [['.ctabs__heading', 'data-own-font'], ['.ctabs__heading', 'data-own-weight']]},
  {name: 'content-tabs', asset: A, block: 'heading', label: 'heading size', probes: [['fs', '.ctabs__heading', 'fontSize']], on: {heading_size_desktop: 61, heading_size_mobile: 21}, off: {heading_size_desktop: 44, heading_size_mobile: 30}, want: {fs: size(768, 61, 21)}},
  {name: 'content-tabs', asset: A, label: 'card and highlight sizes', probes: [['t', '.ctabs__title', 'fontSize'], ['d', '.ctabs__desc', 'fontSize'], ['hl', '.ctabs__highlight', 'fontSize']], on: {card_title_size: 31, card_text_size: 19, highlights_size: 21}, off: {card_title_size: 24, card_text_size: 15, highlights_size: 16}, want: {t: '31px', d: '19px', hl: '21px'}},
  {name: 'content-tabs', asset: A, block: 'footer', label: 'footer size', probes: [['fs', '.ctabs__footer p', 'fontSize']], on: {footer_size: 19}, off: {footer_size: 15}, want: {fs: '19px'}},
  /* How To Use */
  {name: 'how-to-use', asset: A, label: 'section custom fonts', probes: [['h', '.htu__heading', 'fontFamily'], ['t', '.htu__title', 'fontFamily'], ['n', '.htu__num', 'fontFamily'], ['d', '.htu__desc p', 'fontFamily']],
    on: {enable_custom_fonts: true, ...FONTS}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, t: /Verdana/, n: /Verdana/, d: /Courier New/}, attrs: [['.htu-wrap', 'data-own-font']]},
  {name: 'how-to-use', asset: A, block: 'heading', label: 'heading size', probes: [['fs', '.htu__heading', 'fontSize']], on: {size_desktop: 61, size_mobile: 21}, off: {size_desktop: 40, size_mobile: 28}, want: {fs: size(768, 61, 21)}},
  {name: 'how-to-use', asset: A, label: 'step sizes', probes: [['t', '.htu__title', 'fontSize'], ['d', '.htu__desc p', 'fontSize'], ['n', '.htu__num', 'fontSize']], on: {title_size_desktop: 29, title_size_mobile: 13, desc_size_desktop: 21, desc_size_mobile: 12, number_size: 37}, off: {title_size_desktop: 20, title_size_mobile: 18, desc_size_desktop: 16, desc_size_mobile: 15, number_size: 22}, want: {t: size(768, 29, 13), d: size(768, 21, 12), n: '37px'}},
  /* Benefits Bar 3 */
  {name: 'ingredients-highlight-bar', asset: A, label: 'section custom fonts', probes: [['h', '.ihb__heading', 'fontFamily'], ['t', '.ihb__top', 'fontFamily'], ['b', '.ihb__bottom', 'fontFamily']],
    on: {enable_custom_fonts: true, ...FONTS}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, t: /Courier New/, b: /Courier New/}, attrs: [['.ihb', 'data-own-font']]},
  {name: 'ingredients-highlight-bar', asset: A, block: 'heading', label: 'heading weight', probes: [['w', '.ihb__heading', 'fontWeight'], ['e', '.ihb__heading em', 'fontWeight']], on: {heading_weight: '300', heading: 'Our <em>mission</em>'}, off: {heading_weight: 'theme', heading: 'Our <em>mission</em>'}, want: {w: '300', e: '300'}, attrs: [['.ihb__heading', 'data-own-weight']]},
  {name: 'ingredients-highlight-bar', asset: A, block: 'heading', label: 'heading letter spacing', probes: [['ls', '.ihb__heading', 'letterSpacing'], ['e', '.ihb__heading em', 'letterSpacing']], on: {heading_letter_spacing: 4, heading: 'Our <em>mission</em>'}, off: {heading_letter_spacing: 0, heading: 'Our <em>mission</em>'}, want: {ls: '4px', e: '4px'}, attrs: [['.ihb__heading', 'data-own-size']]},
  {name: 'ingredients-highlight-bar', asset: A, block: 'heading', label: 'heading uppercase', probes: [['tt', '.ihb__heading', 'textTransform']], on: {heading_uppercase: true}, off: {heading_uppercase: false}, want: {tt: 'uppercase'}},
  {name: 'ingredients-highlight-bar', asset: A, block: 'heading', label: 'heading size', probes: [['fs', '.ihb__heading', 'fontSize']], on: {heading_size_desktop: 41, heading_size_mobile: 13}, off: {heading_size_desktop: 26, heading_size_mobile: 22}, want: {fs: size(992, 41, 13)}},
  {name: 'ingredients-highlight-bar', asset: A, label: 'label size and weights', probes: [['ts', '.ihb__top', 'fontSize'], ['tw', '.ihb__top', 'fontWeight'], ['bw', '.ihb__bottom', 'fontWeight']], on: {label_size: 21, label_top_weight: '600', label_bottom_weight: '400'}, off: {label_size: 16, label_top_weight: '400', label_bottom_weight: '700'}, want: {ts: '21px', tw: '600', bw: '400'}},
  /* Count Up Banner */
  {name: 'number-stats', asset: A, label: 'section custom fonts', probes: [['h', '.ns__headline', 'fontFamily'], ['c', '.loudecoms-col h3', 'fontFamily'], ['s', '.ns__sub', 'fontFamily'], ['t', '.loudecoms-col p', 'fontFamily']],
    on: {override_fonts: true, headline_font: FONT, text_font: MONO}, off: {override_fonts: false}, want: {h: /Verdana/, c: /Verdana/, s: /Courier New/, t: /Courier New/}, attrs: [['.ns', 'data-own-font']]},
  {name: 'number-stats', asset: A, block: 'headline', label: 'headline weight and line height', probes: [['w', '.ns__headline', 'fontWeight'], ['lh', '.ns__headline', 'lh'], ['e', '.ns__headline em', 'fontWeight']], on: {font_weight: '300', line_height: '1.7', content: 'Numbers <em>matter</em>'}, off: {font_weight: 'inherit', line_height: 'inherit', content: 'Numbers <em>matter</em>'}, want: {w: '300', lh: '1.70', e: '300'}, attrs: [['.ns__headline', 'data-own-weight'], ['.ns__headline', 'data-own-size']]},
  {name: 'number-stats', asset: A, block: 'headline', label: 'headline size', probes: [['fs', '.ns__headline', 'fontSize']], on: {size: 61, mobile_size: 21}, off: {size: 32, mobile_size: 31}, want: {fs: size(801, 61, 21)}},
  {name: 'number-stats', asset: A, label: 'number weight and size', probes: [['w', '.loudecoms-col h3', 'fontWeight'], ['n', '.loudecoms-count-up', 'fontWeight'], ['fs', '.loudecoms-col h3', 'fontSize']], on: {count_font_weight: 'light', count_size: 70, mobile_count_size: 30}, off: {count_font_weight: 'theme', count_size: 48, mobile_count_size: 48}, want: {w: '300', n: '300', fs: size(801, 70, 30)}, attrs: [['.loudecoms-col h3', 'data-own-weight']]},
  /* Product Benefits 2 */
  {name: 'product-benefits-2', asset: A, label: 'section custom fonts', probes: [['h', '.pb2c__heading', 'fontFamily'], ['t', '.pb2c__tab-title', 'fontFamily'], ['d', '.pb2c__tab-desc', 'fontFamily'], ['s', '.pb2c__sub', 'fontFamily'], ['top', '.pb2c__top', 'fontFamily']],
    on: {enable_custom_fonts: true, ...FONTS}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, t: /Verdana/, d: /Courier New/, s: /Courier New/, top: /Courier New/}, attrs: [['.pb2c-wrap', 'data-own-font']]},
  {name: 'product-benefits-2', asset: A, block: 'heading', label: 'heading weight', probes: [['w', '.pb2c__heading', 'fontWeight'], ['e', '.pb2c__heading em', 'fontWeight']], on: {weight: '300', text: 'Built for <em>everyday</em> use'}, off: {weight: 'theme', text: 'Built for <em>everyday</em> use'}, want: {w: '300', e: '300'}, attrs: [['.pb2c__heading', 'data-own-weight']]},
  {name: 'product-benefits-2', asset: A, block: 'heading', label: 'heading size', probes: [['fs', '.pb2c__heading', 'fontSize']], on: {size_desktop: 62, size_mobile: 20}, off: {size_desktop: 42, size_mobile: 28}, want: {fs: size(768, 62, 20)}},
  {name: 'product-benefits-2', asset: A, label: 'benefit sizes', probes: [['t', '.pb2c__tab-title', 'fontSize'], ['d', '.pb2c__tab-desc', 'fontSize']], on: {tab_title_size: 25, tab_desc_size: 19}, off: {tab_title_size: 16, tab_desc_size: 14}, want: {t: '25px', d: '19px'}},
  /* Product Benefits 3 */
  {name: 'product-benefits-3', asset: A, label: 'section custom fonts', probes: [['h', '.pb3__heading', 'fontFamily'], ['t', '.pb3__item-title', 'fontFamily'], ['d', '.pb3__item-desc', 'fontFamily'], ['p', '.pb3__desc', 'fontFamily']],
    on: {enable_custom_fonts: true, ...FONTS}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, t: /Verdana/, d: /Courier New/, p: /Courier New/}, attrs: [['.pb3-wrap', 'data-own-font']]},
  {name: 'product-benefits-3', asset: A, block: 'heading', label: 'heading weight', probes: [['w', '.pb3__heading', 'fontWeight'], ['e', '.pb3__heading em', 'fontWeight']], on: {weight: '300', text: 'Crafted <em>with</em> care'}, off: {weight: 'theme', text: 'Crafted <em>with</em> care'}, want: {w: '300', e: '300'}, attrs: [['.pb3__heading', 'data-own-weight']]},
  {name: 'product-benefits-3', asset: A, block: 'heading', label: 'heading size', probes: [['fs', '.pb3__heading', 'fontSize']], on: {size_desktop: 62, size_mobile: 20}, off: {size_desktop: 44, size_mobile: 32}, want: {fs: size(768, 62, 20)}},
  {name: 'product-benefits-3', asset: A, block: 'description', label: 'description size', probes: [['fs', '.pb3__desc', 'fontSize']], on: {size_desktop: 23, size_mobile: 12}, off: {size_desktop: 17, size_mobile: 15}, want: {fs: size(768, 23, 12)}},
];
const offs = [
  ['content-tabs', A, [['h', '.ctabs__heading', 'fontFamily'], ['hw', '.ctabs__heading', 'fontWeight'], ['d', '.ctabs__desc', 'fontFamily'], ['bg', '.ctabs', 'backgroundColor']], {h: /Georgia/, hw: '700', d: /Arial/, bg: 'rgb(24, 32, 40)'}],
  ['how-to-use', A, [['h', '.htu__heading', 'fontFamily'], ['d', '.htu__desc p', 'fontFamily'], ['bg', '.htu', 'backgroundColor']], {h: /Georgia/, d: /Arial/, bg: 'rgb(24, 32, 40)'}],
  ['ingredients-highlight-bar', A, [['h', '.ihb__heading', 'fontFamily'], ['t', '.ihb__top', 'fontFamily'], ['bg', '.ihb', 'backgroundColor']], {h: /Georgia/, t: /Arial/, bg: 'rgb(24, 32, 40)'}],
  ['number-stats', A, [['h', '.ns__headline', 'fontFamily'], ['t', '.loudecoms-col p', 'fontFamily'], ['bg', '.loudecoms-section', 'backgroundColor']], {h: /Georgia/, t: /Arial/, bg: 'rgb(24, 32, 40)'}],
  ['product-benefits-2', A, [['h', '.pb2c__heading', 'fontFamily'], ['d', '.pb2c__tab-desc', 'fontFamily'], ['bg', '.pb2c', 'backgroundColor']], {h: /Georgia/, d: /Arial/, bg: 'rgb(24, 32, 40)'}],
  ['product-benefits-3', A, [['h', '.pb3__heading', 'fontFamily'], ['d', '.pb3__item-desc', 'fontFamily'], ['bg', '.pb3', 'backgroundColor']], {h: /Georgia/, d: /Arial/, bg: 'rgb(24, 32, 40)'}],
];
run(cases, offs, 'features-c');
