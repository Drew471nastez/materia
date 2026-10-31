/* Round 3 for the benefits Image and video sections (Image & Video with Text,
   Image & Video Benefits, Image With Text Benefits, Image & Text Dual): every
   custom font, size, uppercase and button shape toggle wins over the real theme
   priority rules, live and after a redraw, at 375 and 1366, editor and
   storefront, and switching it off brings the theme value back. Runner:
   tests/theme-media-image-video-priority.cjs. */
const {run, FONT, MONO} = require('./theme-media-image-video-priority.cjs');
const {schemaOf} = require('./media-fixture.cjs');

const A = 'media-live-benefits.js';
const def = (name, type, id) => { const s = schemaOf(name).schema, list = type ? s.blocks.find(b => b.type === type).settings : s.settings; return list.find(x => x.id === id).default; };
const D = w => w >= 900;
const SECTIONS = {'image-and-video-text': 'ivt', 'image-text-benefits': 'ivb', 'image-with-text-benefits': 'iwb', 'dual-image-with-text': 'itd'};
const BENEFIT = {'image-text-benefits': ['.ivb__benefit-title', '.ivb__benefit-desc p'], 'image-with-text-benefits': ['.iwb__benefit-heading', '.iwb__benefit-text p']};
const SHAPE = {use_theme_button: false, padding_x: 40, padding_y: 20, radius: 21, border_width: 3, font_size: 20, font_weight: '700'};

const cases = [], offs = [];
for (const [name, p] of Object.entries(SECTIONS)) {
  const blocks = schemaOf(name).schema.presets[0].blocks.map(b => b.type);
  /* section custom fonts: headings, rich text paragraphs and benefit items take the pickers; heading weight stays the theme's */
  const fp = [['h', `.${p}__heading`, 'fontFamily'], ['hw', `.${p}__heading`, 'fontWeight']];
  const fw = {h: /Verdana/, hw: '700'};
  if (blocks.includes('subheading')) { fp.push(['sp', `.${p}__subheading p`, 'fontFamily']); fw.sp = /Courier New/; }
  if (BENEFIT[name]) { fp.push(['bt', BENEFIT[name][0], 'fontFamily'], ['bd', BENEFIT[name][1], 'fontFamily']); Object.assign(fw, {bt: /Verdana/, bd: /Courier New/}); }
  cases.push({name, asset: A, label: 'section custom fonts', probes: fp, on: {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, off: {enable_custom_fonts: false}, want: fw, same: ['hw'], attrs: [['.mlb', 'data-own-font']]});
  /* heading size */
  cases.push({name, asset: A, block: 'heading', label: 'heading size', probes: [['fs', `.${p}__heading`, 'fontSize']], on: {size_desktop: 61, size_mobile: 21}, off: {size_desktop: def(name, 'heading', 'size_desktop'), size_mobile: def(name, 'heading', 'size_mobile')}, want: {fs: w => D(w) ? '61px' : '21px'}});
  /* subheading size */
  if (blocks.includes('subheading')) {
    const ids = schemaOf(name).schema.blocks.find(b => b.type === 'subheading').settings.map(x => x.id);
    const on = ids.includes('size_desktop') ? {size_desktop: 23, size_mobile: 11} : {size: 23}, off = Object.fromEntries(Object.keys(on).map(k => [k, def(name, 'subheading', k)]));
    cases.push({name, asset: A, block: 'subheading', label: 'subheading size', probes: [['fs', `.${p}__subheading`, 'fontSize']], on, off, want: {fs: w => on.size || D(w) ? '23px' : '11px'}});
  }
  /* button shape and uppercase */
  if (blocks.includes('button')) {
    const bp = [['pl', `.${p}__btn`, 'paddingLeft'], ['pt', `.${p}__btn`, 'paddingTop'], ['r', `.${p}__btn`, 'borderTopLeftRadius'], ['bw', `.${p}__btn`, 'borderTopWidth'], ['fs', `.${p}__btn`, 'fontSize'], ['fw', `.${p}__btn`, 'fontWeight']];
    cases.push({name, asset: A, block: 'button', label: 'button own shape', probes: bp, on: SHAPE, off: {use_theme_button: true}, want: {pl: '40px', pt: '20px', r: '21px', bw: '3px', fs: '20px', fw: '700'}, attrs: [[`.${p}__btn`, 'data-own-shape'], [`.${p}__btn`, 'data-own-weight']]});
    cases.push({name, asset: A, block: 'button', label: 'button uppercase', probes: [['tt', `.${p}__btn`, 'textTransform']], on: {uppercase: true}, off: {uppercase: false}, want: {tt: 'uppercase'}});
    cases.push({name, asset: A, block: 'button', label: 'button own shape + uppercase together', probes: [['tt', `.${p}__btn`, 'textTransform'], ['fs', `.${p}__btn`, 'fontSize']], on: {...SHAPE, uppercase: true}, off: {use_theme_button: true, uppercase: false}, want: {tt: 'uppercase', fs: '20px'}});
  }
  offs.push([name, A, [['h', `.${p}__heading`, 'fontFamily'], ['hw', `.${p}__heading`, 'fontWeight'], ['bg', '.mlb', 'backgroundColor']].concat(blocks.includes('subheading') ? [['sp', `.${p}__subheading p`, 'fontFamily']] : []), {h: /Georgia/, hw: '700', bg: 'rgb(24, 32, 40)', ...(blocks.includes('subheading') ? {sp: /Arial/} : {})}]);
}
const IWB = 'image-with-text-benefits';
cases.push({name: IWB, asset: A, block: 'heading', label: 'heading uppercase', probes: [['tt', '.iwb__heading', 'textTransform']], on: {uppercase: true}, off: {uppercase: false}, want: {tt: 'uppercase'}});
cases.push({name: IWB, asset: A, label: 'benefit heading and text size', probes: [['hs', '.iwb__benefit-heading', 'fontSize'], ['ts', '.iwb__benefit-text', 'fontSize']], on: {benefit_heading_size: 26, benefit_text_size: 19}, off: {benefit_heading_size: def(IWB, null, 'benefit_heading_size'), benefit_text_size: def(IWB, null, 'benefit_text_size')}, want: {hs: '26px', ts: '19px'}});
cases.push({name: IWB, asset: A, block: 'footnote', label: 'footnote size', probes: [['fs', '.iwb__footnote', 'fontSize']], on: {size: 21}, off: {size: def(IWB, 'footnote', 'size')}, want: {fs: '21px'}});

run(cases, offs, 'benefits');
