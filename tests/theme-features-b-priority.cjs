/* Round 3 bar for the features-b sections: every custom font, weight, size,
   line height, letter spacing and uppercase control wins over the real theme
   priority rules (snippets/theme-controls: Typography > Use in every section),
   live and through a redraw, at 375 and 1366, editor and storefront, on the
   element that draws the text and on a descendant (a <p> inside rich text,
   a <strong> inside a heading); switching it off brings the theme value back
   and removes the opt-out attribute. Theme inheritance once with both
   priorities off. Runner: tests/theme-media-image-video-priority.cjs. */
const {run, FONT, MONO} = require('./theme-media-image-video-priority.cjs');
const {schemaOf} = require('./media-fixture.cjs');

const A = 'live-features-b.js';
const def = (name, type, id) => { const s = schemaOf(name).schema, list = type ? s.blocks.find(b => b.type === type).settings : s.settings; return list.find(x => x.id === id).default; };
const D = bp => w => w >= bp;
const fonts = {enable_custom_fonts: true, heading_font: FONT, body_font: MONO};
const cases = [], offs = [];

/* Comparison Table: three font switches of its own (heading, column titles, row labels) */
const CT = 'comparison-table';
cases.push({name: CT, asset: A, label: 'heading font', probes: [['h', '.fbct__title', 'fontFamily'], ['hs', '.fbct__title strong', 'fontFamily']], mount: {blocks: [{type: 'heading', settings: {text: 'Compare <strong>us</strong>'}}, {type: 'column', settings: {title: 'A'}}, {type: 'column', settings: {title: 'B'}}, {type: 'item', settings: {row_heading: 'Row'}}]}, on: {heading_custom: true, heading_font: FONT}, off: {heading_custom: false}, want: {h: /Verdana/, hs: /Verdana/}, attrs: [['.fbct__title', 'data-own-font']]});
cases.push({name: CT, asset: A, label: 'column title font', probes: [['c', '.fbct__ct', 'fontFamily']], on: {table_heading_custom: true, table_heading_font: MONO}, off: {table_heading_custom: false}, want: {c: /Courier New/}, attrs: [['.fbct__ct', 'data-own-font']]});
cases.push({name: CT, asset: A, label: 'row label font', probes: [['r', '.fbct__rl', 'fontFamily']], on: {table_row_heading_custom: true, table_row_heading_font: MONO}, off: {table_row_heading_custom: false}, want: {r: /Courier New/}, attrs: [['.fbct__rl', 'data-own-font']]});
cases.push({name: CT, asset: A, block: 'heading', label: 'heading weight', probes: [['w', '.fbct__title', 'fontWeight']], on: {weight: 'normal'}, off: {weight: 'theme'}, want: {w: '400'}, attrs: [['.fbct__title', 'data-own-weight']]});
cases.push({name: CT, asset: A, block: 'heading', label: 'heading size and line height', probes: [['fs', '.fbct__title', 'fontSize'], ['lh', '.fbct__title', 'lh']], on: {size: 60, size_mobile: 20, line_height: 150}, off: {size: def(CT, 'heading', 'size'), size_mobile: def(CT, 'heading', 'size_mobile'), line_height: def(CT, 'heading', 'line_height')}, want: {fs: w => D(768)(w) ? '60px' : '20px', lh: '1.50'}});
cases.push({name: CT, asset: A, block: 'column', label: 'column title weight', probes: [['w', '.fbct__ct', 'fontWeight']], on: {weight: 'normal'}, off: {weight: 'theme'}, want: {w: '400'}, attrs: [['.fbct__ct', 'data-own-weight']]});
offs.push([CT, A, [['h', '.fbct__title', 'fontFamily'], ['hw', '.fbct__title', 'fontWeight'], ['bg', '.fbct', 'backgroundColor']], {h: /Georgia/, hw: '700', bg: 'rgb(24, 32, 40)'}]);

/* The others: one custom fonts switch for headings and body text */
const SEC = {
  'comparison-table-2': {p: 'fbt2', bp: 768, root: '.fbt2', body: [['b', 'tbody .fbt2__label', 'fontFamily'], ['bp', '.fbt2__sub p', 'fontFamily']], title: '.fbt2__ct', titleWeight: 'col_title_weight', heading: '.fbt2__heading', hsize: ['size_desktop', 'size_mobile']},
  'comparison-table-3': {p: 'fbt3', bp: 768, root: '.fbt3', body: [['b', 'tbody .fbt3__label', 'fontFamily'], ['bp', '.fbt3__sub p', 'fontFamily']], title: '.fbt3__colhead--a .fbt3__ct', titleWeight: 'col_title_weight', heading: '.fbt3__heading', hsize: ['size_desktop', 'size_mobile'], lh: true},
  'comparisons-table': {p: 'cmp', bp: 760, root: '.cmp', body: [['b', '.cmp__eyebrow', 'fontFamily'], ['bp', '.cmp__sub p', 'fontFamily']], heading: '.cmp__heading', hsize: ['size_desktop', 'size_mobile']},
  'comparison-cards': {p: 'ccd', bp: 768, root: '.ccd', body: [['b', '.ccd__row', 'fontFamily'], ['bp', '.ccd__sub p', 'fontFamily']], title: '.ccd__title', titleWeight: 'card_title_weight', heading: '.ccd__heading', hsize: ['size_desktop', 'size_mobile'], lh: true},
  'comparison-text': {p: 'ctx', bp: 768, root: '.ctx', body: [['b', '.ctx__row', 'fontFamily'], ['bp', '.ctx__sub p', 'fontFamily']], heading: '.ctx__heading', hsize: ['size_desktop', 'size_mobile'], lh: true},
};
for (const [name, c] of Object.entries(SEC)) {
  const probes = [['h', c.heading, 'fontFamily'], ...c.body], want = {h: /Verdana/, b: /Courier New/, bp: /Courier New/}, attrs = [[c.root, 'data-own-font'], [c.heading, 'data-own-font']];
  if (c.title) { probes.push(['t', c.title, 'fontFamily']); want.t = /Verdana/; }
  cases.push({name, asset: A, label: 'custom fonts', probes, on: fonts, off: {enable_custom_fonts: false}, want, attrs});
  const blocks = schemaOf(name).schema.blocks.find(b => b.type === 'heading').settings.map(x => x.id);
  if (blocks.includes('weight')) cases.push({name, asset: A, block: 'heading', label: 'heading weight', probes: [['w', c.heading, 'fontWeight']], on: {weight: '400'}, off: {weight: 'theme'}, want: {w: '400'}, attrs: [[c.heading, 'data-own-weight']]});
  cases.push({name, asset: A, block: 'heading', label: 'heading size', probes: [['fs', c.heading, 'fontSize']], on: {[c.hsize[0]]: 61, [c.hsize[1]]: 21}, off: {[c.hsize[0]]: def(name, 'heading', c.hsize[0]), [c.hsize[1]]: def(name, 'heading', c.hsize[1])}, want: {fs: w => D(c.bp)(w) ? '61px' : '21px'}});
  if (c.lh) cases.push({name, asset: A, block: 'heading', label: 'heading line height and letter spacing', probes: [['lh', c.heading, 'lh'], ['ls', c.heading, 'letterSpacing']], on: {line_height: 1.8, tracking: 3}, off: {line_height: def(name, 'heading', 'line_height'), tracking: def(name, 'heading', 'tracking')}, want: {lh: '1.80', ls: '3px'}});
  if (c.titleWeight) cases.push({name, asset: A, label: 'column title weight', probes: [['w', c.title, 'fontWeight']], on: {[c.titleWeight]: '500'}, off: {[c.titleWeight]: 'theme'}, want: {w: '500'}, attrs: [[c.title, 'data-own-weight']]});
  offs.push([name, A, [['h', c.heading, 'fontFamily'], ['hw', c.heading, 'fontWeight'], ['bg', c.root, 'backgroundColor'], ...c.body], {h: /Georgia/, hw: '700', bg: 'rgb(24, 32, 40)', b: /Arial/, bp: /Arial/}]);
}
/* Comparison Table 4: uppercase heading and eyebrow over the theme's capitalisation */
cases.push({name: 'comparisons-table', asset: A, block: 'heading', label: 'heading uppercase', probes: [['tt', '.cmp__heading', 'textTransform']], on: {uppercase: true}, off: {uppercase: false}, want: {tt: 'uppercase'}});
cases.push({name: 'comparisons-table', asset: A, block: 'eyebrow', label: 'eyebrow uppercase', probes: [['tt', '.cmp__eyebrow', 'textTransform']], on: {uppercase: true}, off: {uppercase: false}, want: {tt: 'uppercase'}});

run(cases, offs, 'features-b');
