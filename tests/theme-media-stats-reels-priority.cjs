/* Round 3: every custom font, weight, size and button shape switch of Image With Text Stats,
   Image With Text Steps, Reels Wall and Shoppable Video wins over the real Theme settings
   priority rules (snippets/theme-controls), live and after a redraw, at 375 and 1366, editor and
   storefront, on the element and a descendant; off restores the theme. Runs once more with the
   priorities off. Engine: tests/theme-media-text-grid-priority.cjs. */
const {run, H, B, BF} = require('./theme-media-text-grid-priority.cjs');
const A = 'media-live-stats-reels.js', D = w => w >= 768;
const FONTS = {enable_custom_fonts: true, heading_font: {family: 'Verdana'}, body_font: {family: 'Tahoma'}};
/* The theme's own h2 size at that width (critical.css heading scale), as a plain h2 in a section gets it. */
const H2 = w => w >= 768 ? /^3[4-6](\.\d+)?px$/ : '30px';
const fonts = (heads, bodies, attrSel) => ({name: 'custom fonts', on: FONTS, off: {enable_custom_fonts: false}, checks: [
  ...heads.map(sel => ({sel, css: 'fontFamily', on: H, theme: /Georgia/})),
  ...bodies.map(sel => ({sel, css: 'fontFamily', on: B, theme: /Arial/})),
  {sel: attrSel, css: '@data-own-font', on: '', off: null},
]});
const SECTIONS = [
  {name: 'image-with-text-stats', asset: A, blocks: {heading: {text: 'Real <strong>results</strong>'}},
    cases: [
      fonts(['.iws__heading', '.iws__heading strong', '.iws__stat-percent'], ['.iws__stat-body p', '.iws__footnote'], '.iws'),
      {name: 'heading weight', block: 'heading', on: {weight_enable: true, weight: '300'}, off: {weight_enable: false}, checks: [{sel: '.iws__heading', css: 'fontWeight', on: '300', theme: '700'}, {sel: '.iws__heading', css: '@data-own-weight', on: '', off: null}]},
      {name: 'heading UPPERCASE', block: 'heading', on: {uppercase: true}, off: {uppercase: false}, checks: [{sel: '.iws__heading', css: 'textTransform', on: 'uppercase', off: 'none', theme: 'uppercase'}]},
      {name: 'heading size', block: 'heading', on: {size_enable: true, size_desktop: 60, size_mobile: 22}, off: {size_enable: false}, checks: [{sel: '.iws__heading', css: 'fontSize', on: w => D(w) ? '60px' : '22px', theme: H2}]},
      {name: 'subheading-free weights', block: 'stat', on: {weight_enable: true, weight: '700'}, off: {weight_enable: false}, checks: [{sel: '.iws__stat-body', css: 'fontWeight', on: '700', theme: '400'}]},
      {name: 'footnote weight', block: 'footnote', on: {weight_enable: true, weight: '700'}, off: {weight_enable: false}, checks: [{sel: '.iws__footnote', css: 'fontWeight', on: '700', theme: '400'}]},
    ]},
  {name: 'image-with-text-steps', asset: A, blocks: {heading: {text: 'Built for <strong>results</strong>.'}},
    cases: [
      fonts(['.iws__heading', '.iws__heading strong', '.iws__step-title'], ['.iws__sub p', '.iws__step-desc p'], '.iws-steps'),
      {name: 'heading custom style', block: 'heading', on: {custom_style: true, weight: '400', size_desktop: 50, size_mobile: 26}, off: {custom_style: false}, checks: [
        {sel: '.iws__heading', css: 'fontWeight', on: '400', theme: '700'}, {sel: '.iws__heading', css: 'lh/fs', on: '1.15', theme: '1.20'},
        {sel: '.iws__heading', css: 'fontSize', on: w => D(w) ? '50px' : '26px'}, {sel: '.iws__heading', css: '@data-own-size', on: '', off: null}]},
      {name: 'button shape', on: {use_theme_button: false, button_radius: 3, button_size: 19}, off: {use_theme_button: true}, checks: [
        {sel: '.iws__btn', css: 'borderTopLeftRadius', on: '3px', theme: '12px'}, {sel: '.iws__btn', css: 'fontSize', on: '19px'}, {sel: '.iws__btn', css: 'fontWeight', on: '600'},
        {sel: '.iws__btn', css: 'borderTopWidth', on: '0px'}, {sel: '.iws__btn', css: '@data-own-shape', on: '', off: null}]},
    ]},
  {name: 'reels-wall', asset: A, blocks: {heading: {text: 'Trending <strong>reels</strong>'}, subheading: {text: '<p>Clips from the shop floor</p>'}},
    cases: [
      fonts(['.rw__heading', '.rw__heading strong', '.rw-content__heading'], ['.rw__eyebrow', '.rw__sub p'], '.rw'),
      {name: 'heading weight', block: 'heading', on: {enable_custom_weight: true, font_weight: '300'}, off: {enable_custom_weight: false}, checks: [{sel: '.rw__heading', css: 'fontWeight', on: '300', theme: '700'}, {sel: '.rw__heading', css: '@data-own-weight', on: '', off: null}]},
      {name: 'heading size', block: 'heading', on: {size_enable: true, font_size_desktop: 50, font_size_mobile: 26}, off: {size_enable: false}, checks: [{sel: '.rw__heading', css: 'fontSize', on: w => D(w) ? '50px' : '26px', theme: H2}]},
      {name: 'eyebrow weight', block: 'top_text', on: {enable_custom_weight: true, font_weight: '800'}, off: {enable_custom_weight: false}, checks: [{sel: '.rw__eyebrow', css: 'fontWeight', on: '800'}]},
      {name: 'subheading weight', block: 'subheading', on: {enable_custom_weight: true, font_weight: '700'}, off: {enable_custom_weight: false}, checks: [{sel: '.rw__sub', css: 'fontWeight', on: '700', theme: '400'}]},
    ]},
  {name: 'shopable-video', asset: A, blocks: {heading: {text: 'Watch <strong>and</strong> shop'}},
    cases: [
      fonts(['.sv__heading', '.sv__heading strong', '.sv-card__heading'], ['.sv__eyebrow', '.sv__desc p'], '.sv'),
      {name: 'heading font', block: 'heading', on: {enable_custom_fonts: true, font: {family: 'Times New Roman'}}, off: {enable_custom_fonts: false}, checks: [{sel: '.sv__heading', css: 'fontFamily', on: BF, theme: /Georgia/}, {sel: '.sv__heading strong', css: 'fontFamily', on: BF}]},
      {name: 'heading weight', block: 'heading', on: {weight_enable: true, weight: '400'}, off: {weight_enable: false}, checks: [{sel: '.sv__heading', css: 'fontWeight', on: '400', theme: '700'}]},
      {name: 'heading size', block: 'heading', on: {size_enable: true, size_desktop: 50, size_mobile: 26, line_height: 1.7}, off: {size_enable: false}, checks: [
        {sel: '.sv__heading', css: 'fontSize', on: w => D(w) ? '50px' : '26px'}, {sel: '.sv__heading', css: 'lh/fs', on: '1.70', theme: '1.20'}]},
      {name: 'eyebrow font and size', block: 'eyebrow', on: {enable_custom_fonts: true, font: {family: 'Times New Roman'}, size_enable: true, size: 19}, off: {enable_custom_fonts: false, size_enable: false}, checks: [{sel: '.sv__eyebrow', css: 'fontFamily', on: BF, theme: /Arial/}, {sel: '.sv__eyebrow', css: 'fontSize', on: '19px'}]},
      {name: 'subheading font and size', block: 'subheading', on: {enable_custom_fonts: true, font: {family: 'Times New Roman'}, size_enable: true, size: 19, line_height: 1.9}, off: {enable_custom_fonts: false, size_enable: false}, checks: [
        {sel: '.sv__desc p', css: 'fontFamily', on: BF, theme: /Arial/}, {sel: '.sv__desc p', css: 'fontSize', on: '19px'}, {sel: '.sv__desc p', css: 'lh/fs', on: '1.90'}]},
    ]},
];
run('stats-reels', SECTIONS).catch(e => { console.error(e); process.exit(1); });
