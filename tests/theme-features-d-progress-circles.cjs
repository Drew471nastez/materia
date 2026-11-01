/* Progress Circles: theme inheritance, custom colours and fonts under the theme priority rules,
   every control (live and after a redraw), desktop/mobile values, two instances, added blocks,
   the once-only ring fill and count up on the storefront, and final values in the editor and
   under reduced motion. Run: node tests/theme-features-d-progress-circles.cjs */
const L = require('./theme-features-d-lib.cjs');
const {assert, DESK, read} = L;
const NAME = 'progress-circles';
const C = {pre: {enable_custom_style: true}};
const BC = {preBlock: true, pre: {enable_custom_style: true}};
const D = (d, m) => w => DESK(w) ? d : m;
const cols = n => new RegExp('^(\\S+ ){' + (n - 1) + '}\\S+$');

const TABLE = [
  {id: 'color_scheme', v: 'alt-scheme', sel: '.pgr', css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'full_width', sel: '.pgr', css: 'width', exp: w => w + 'px'},
  {id: 'reset_spacing', v: false, live: false, check: async t => assert.equal(await t.page.evaluate(() => /padding-top: 0 !important/.test(document.querySelector('#shopify-section-test style[data-rs-bulletproof]').textContent)), false)},
  {id: 'text_align', v: 'left', sel: '.pgr__inner', css: 'alignItems', exp: 'flex-start'},
  {id: 'heading_subheading_gap', v: 6, sel: '.pgr__subheading', css: 'marginTop', exp: '-30px'},
  {id: 'heading_to_grid_gap', v: 12, sel: '.pgr__inner', css: 'rowGap', exp: '12px'},
  {id: 'per_row_desktop', v: '3', sel: '.pgr__row', css: 'gridTemplateColumns', exp: w => cols(DESK(w) ? 3 : 2)},
  {id: 'row_gap_desktop', v: 12, sel: '.pgr__row', css: 'rowGap', exp: D('12px', '28px')},
  {id: 'col_gap_desktop', v: 14, sel: '.pgr__row', css: 'columnGap', exp: D('14px', '16px')},
  {id: 'ring_to_label_gap', v: 7, sel: '.pgr__item', css: 'rowGap', exp: '7px'},
  {id: 'label_max_width', v: 90, sel: '.pgr__label', css: 'maxWidth', exp: '90px'},
  {id: 'ring_size_desktop', v: 160, sel: '.pgr__ring', css: 'width', exp: D('160px', '110px')},
  {id: 'ring_thickness', v: 9, sel: '.pgr__ring-fill', css: 'strokeWidth', exp: '9px'},
  {id: 'percent_size_desktop', v: 40, sel: '.pgr__percent', css: 'fontSize', exp: D('40px', '29px')},
  {id: 'label_size_desktop', v: 20, sel: '.pgr__label', css: 'fontSize', exp: D('20px', '14px')},
  {id: 'section_bg', v: '#abcdef', ...C, sel: '.pgr', css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'text_color', v: '#111111', ...C, sel: '.pgr__subheading', css: 'color', exp: 'rgb(17, 17, 17)'},
  {id: 'percent_color', v: '#ff00ff', ...C, sel: '.pgr__percent', css: 'color', exp: 'rgb(255, 0, 255)'},
  {id: 'ring_color', v: '#00ff00', ...C, sel: '.pgr__ring-fill', css: 'stroke', exp: 'rgb(0, 255, 0)'},
  {id: 'ring_track', v: '#0000ff', ...C, sel: '.pgr__ring-bg', css: 'stroke', exp: 'rgb(0, 0, 255)'},
  {id: 'label_color', v: '#123123', ...C, sel: '.pgr__label', css: 'color', exp: 'rgb(18, 49, 35)'},
  {id: 'label_weight', v: '700', sel: '.pgr__label', css: 'fontWeight', exp: '700'},
  {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.pgr__heading', css: 'fontFamily', exp: /Verdana/},
  {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.pgr__label', css: 'fontFamily', exp: /Tahoma/},
  {id: 'animate', v: false, live: false, sel: '.pgr', css: '@data-fd-reveal', exp: null},
  {id: 'padding_top_desktop', v: 70, sel: '.pgr', css: 'paddingTop', exp: D('70px', '60px')},
  {id: 'padding_bottom_desktop', v: 72, sel: '.pgr', css: 'paddingBottom', exp: D('72px', '60px')},
  {id: 'side_padding_desktop', v: 50, sel: '.pgr', css: 'paddingLeft', exp: D('50px', '20px')},
  {id: 'section_margin_top_desktop', v: 20, sel: ':wrapper', css: 'marginTop', exp: D('20px', '0px')},
  {id: 'section_margin_bottom_desktop', v: 22, sel: ':wrapper', css: 'marginBottom', exp: D('22px', '0px')},
  {id: 'per_row_mobile', v: '1', sel: '.pgr__row', css: 'gridTemplateColumns', exp: w => cols(DESK(w) ? 4 : 1)},
  {id: 'row_gap_mobile', v: 9, sel: '.pgr__row', css: 'rowGap', exp: D('40px', '9px')},
  {id: 'col_gap_mobile', v: 7, sel: '.pgr__row', css: 'columnGap', exp: D('32px', '7px')},
  {id: 'ring_size_mobile', v: 90, sel: '.pgr__ring', css: 'width', exp: D('137px', '90px')},
  {id: 'percent_size_mobile', v: 22, sel: '.pgr__percent', css: 'fontSize', exp: D('32px', '22px')},
  {id: 'label_size_mobile', v: 12, sel: '.pgr__label', css: 'fontSize', exp: D('16px', '12px')},
  {id: 'padding_top_mobile', v: 30, sel: '.pgr', css: 'paddingTop', exp: D('92px', '30px')},
  {id: 'padding_bottom_mobile', v: 31, sel: '.pgr', css: 'paddingBottom', exp: D('92px', '31px')},
  {id: 'side_padding_mobile', v: 11, sel: '.pgr', css: 'paddingLeft', exp: D('32px', '11px')},
  {id: 'section_margin_top_mobile', v: 9, sel: ':wrapper', css: 'marginTop', exp: D('0px', '9px')},
  {id: 'section_margin_bottom_mobile', v: 8, sel: ':wrapper', css: 'marginBottom', exp: D('0px', '8px')},
  /* blocks */
  {block: 'heading', id: 'text', v: 'Real <em>results</em>', sel: '.pgr__heading em', css: 'text', exp: 'results'},
  {block: 'heading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#cc0033'}, sel: '.pgr__heading', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'heading', id: 'color', v: '#cc0033', ...BC, sel: '.pgr__heading', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'heading', id: 'accent_color', v: '#00aa00', ...BC, sel: '.pgr__heading em', css: 'color', exp: 'rgb(0, 170, 0)'},
  {block: 'heading', id: 'size_desktop', v: 60, sel: '.pgr__heading', css: 'fontSize', exp: D('60px', '30px')},
  {block: 'heading', id: 'size_mobile', v: 22, sel: '.pgr__heading', css: 'fontSize', exp: D('42px', '22px')},
  {block: 'heading', id: 'uppercase', v: true, sel: '.pgr__heading', css: 'textTransform', exp: 'uppercase'},
  {block: 'subheading', id: 'text', v: '<p>Made <strong>daily</strong></p>', sel: '.pgr__subheading strong', css: 'text', exp: 'daily'},
  {block: 'subheading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#00cc00'}, sel: '.pgr__subheading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'subheading', id: 'color', v: '#00cc00', ...BC, sel: '.pgr__subheading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'subheading', id: 'size_desktop', v: 21, sel: '.pgr__subheading', css: 'fontSize', exp: D('21px', '14px')},
  {block: 'subheading', id: 'size_mobile', v: 12, sel: '.pgr__subheading', css: 'fontSize', exp: D('16px', '12px')},
  {block: 'stat', id: 'percent', v: 50, check: async t => { await L.settled(t.page); await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test .pgr__ring-fill').forEach(c => c.getAnimations().forEach(a => a.finish()))); assert.equal(await read(t, '.pgr__percent', 'text'), '50%'); assert.ok(Math.abs(parseFloat(await read(t, '.pgr__ring-fill', 'strokeDashoffset')) - 87.97) < 0.05, 'ring half full'); }},
  {block: 'stat', id: 'label', v: 'Softer feel', sel: '.pgr__label', css: 'text', exp: 'Softer feel'},
  {block: 'stat', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#ff8800'}, sel: '.pgr__ring-fill', css: 'stroke', exp: 'rgb(255, 136, 0)'},
  {block: 'stat', id: 'color', v: '#ff8800', ...BC, sel: '.pgr__ring-fill', css: 'stroke', exp: 'rgb(255, 136, 0)'},
  {block: 'footnote', id: 'text', v: 'From <em>store</em> data', sel: '.pgr__footnote em', css: 'text', exp: 'store'},
  {block: 'footnote', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#0000cc'}, sel: '.pgr__footnote', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'footnote', id: 'color', v: '#0000cc', ...BC, sel: '.pgr__footnote', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'footnote', id: 'size', v: 17, sel: '.pgr__footnote', css: 'fontSize', exp: '17px'},
  {block: 'footnote', id: 'margin_top', v: 30, sel: '.pgr__footnote', css: 'marginTop', exp: '30px'},
];
const FULL = [{type: 'heading'}, {type: 'subheading'}, ...L.schemaOf(NAME).schema.presets[0].blocks.filter(b => b.type !== 'heading')];

L.suite({
  name: NAME, table: TABLE, extra: ['enable_custom_style', 'enable_custom_fonts'], full: FULL,
  snap: '#shopify-section-test :is(.pgr, .pgr__inner, .pgr__heading, .pgr__row, .pgr__item, .pgr__ring, .pgr__percent, .pgr__label, .pgr__footnote)',
  bgSel: '.pgr',
  async inherit(t, h) {
    h.eq(await read(t, '.pgr', 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background ' + h.tag);
    h.eq(await read(t, '.pgr__heading', 'color'), 'rgb(255, 255, 255)', 'heading colour');
    h.match(await read(t, '.pgr__heading', 'fontFamily'), /Georgia/, 'heading font');
    h.eq(await read(t, '.pgr__heading', '.tagName'), 'H2', 'heading is h2');
    h.eq(await read(t, '.pgr__heading em', 'color'), 'rgb(51, 102, 153)', 'accent follows primary');
    h.eq(await read(t, '.pgr__label', 'color'), 'rgb(255, 255, 255)', 'label follows heading colour');
    h.match(await read(t, '.pgr__label', 'fontFamily'), /Arial/, 'body font');
    h.match(await read(t, '.pgr__percent', 'fontFamily'), /Georgia/, 'percent uses the heading font');
    h.eq(await read(t, '.pgr__ring-fill', 'stroke'), 'rgb(51, 102, 153)', 'ring follows primary');
    h.eq(await read(t, '.pgr__ring-bg', 'stroke'), 'rgb(68, 85, 102)', 'track follows border');
    h.eq(await read(t, '.pgr__footnote', 'color'), 'rgb(204, 204, 204)', 'footnote follows text');
  },
  custom: {
    on: {section_bg: '#abcdef', ring_color: '#00ff00', percent_color: '#ff00ff', label_color: '#111111'},
    checks: [['.pgr', 'backgroundColor', 'rgb(171, 205, 239)'], ['.pgr__ring-fill', 'stroke', 'rgb(0, 255, 0)'], ['.pgr__percent', 'color', 'rgb(255, 0, 255)'], ['.pgr__label', 'color', 'rgb(17, 17, 17)']],
    off: [['.pgr', 'backgroundColor', 'rgb(24, 32, 40)'], ['.pgr__ring-fill', 'stroke', 'rgb(51, 102, 153)'], ['.pgr__percent', 'color', 'rgb(255, 255, 255)'], ['.pgr__label', 'color', 'rgb(255, 255, 255)'], [':wrapper', 'backgroundColor', 'rgba(0, 0, 0, 0)']],
  },
  fonts: {
    on: {heading_font: {family: 'Verdana'}, body_font: {family: 'Tahoma'}},
    checks: [['.pgr__heading', /Verdana/], ['.pgr__heading em', /Verdana/], ['.pgr__percent', /Verdana/], ['.pgr__label', /Tahoma/], ['.pgr__footnote p', /Tahoma/]],
    off: [['.pgr__heading', /Georgia/], ['.pgr__label', /Arial/], ['.pgr__footnote p', /Arial/]],
  },
  extraBlock: {block: {type: 'stat', settings: {percent: 33, label: 'Added ring'}}, async check(t, h) {
    h.eq(await read(t, '.pgr__item:last-child .pgr__label', 'text'), 'Added ring', 'added block renders');
    await t.emit({percent: 44}, t.rendered[0].section.blocks.filter(b => b.type === 'stat').pop().id);
    h.eq(await read(t, '.pgr__item:last-child .pgr__percent', 'text'), '44%', 'added block live');
  }},
  async each(t, width, editing, h) {
    const seen = {};
    for (const n of ['2', '3', '4', '5', '6']) { await t.emit({per_row_desktop: n}); seen[n] = await read(t, '.pgr__row', 'gridTemplateColumns'); }
    h.eq(new Set(Object.values(seen)).size, DESK(width) ? 5 : 1, 'rings per row differ ' + JSON.stringify(seen));
    await t.emit({per_row_desktop: '4'});
    const xs = {};
    for (const al of ['left', 'center', 'right']) { await t.emit({text_align: al}); xs[al] = await t.page.evaluate(() => Math.round(document.querySelector('#shopify-section-test .pgr__heading').getBoundingClientRect().x)); }
    h.eq(new Set(Object.values(xs)).size, 3, 'alignments differ');
    await t.emit({text_align: 'center'});
    const ws = {};
    for (const w of ['400', '500', '600', '700']) { await t.emit({label_weight: w}); ws[w] = await read(t, '.pgr__label', 'fontWeight'); }
    h.eq(new Set(Object.values(ws)).size, 4, 'label weights differ');
    await t.emit({label_weight: '500'});
    await t.redraw({blocks: FULL}); await L.settled(t.page);
    for (const patch of [{ring_size_desktop: 120}, {label_size_mobile: 15}, {ring_thickness: 6}]) await t.emit(patch);
    h.ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .pgr__percent').textContent === '85%' && document.querySelector('#shopify-section-test .pgr__ring-fill').getAnimations().length === 0), 'no replay on edits ' + h.tag);
  },
  async two(two, h) {
    await two.emit({enable_custom_style: true, section_bg: '#abcdef', ring_size_mobile: 70, ring_size_desktop: 70}, undefined, 'a');
    await two.emit({label: 'Only A'}, two.blockId('stat', 0, 'a'), 'a');
    h.eq(await read(two, '.pgr', 'backgroundColor', 'a'), 'rgb(171, 205, 239)', 'a edited');
    h.eq(await read(two, '.pgr', 'backgroundColor', 'b'), 'rgb(24, 32, 40)', 'b untouched');
    h.eq(await read(two, '.pgr__ring', 'width', 'b'), DESK(h.width) ? '137px' : '110px', 'b ring untouched');
    h.eq(await read(two, '.pgr__label', 'text', 'b'), 'First result', 'b label untouched');
  },
  async reduced(rm, h) {
    h.eq(await read(rm, '.pgr__percent', 'opacity'), '1', 'number shown under reduced motion');
    h.eq(await read(rm, '.pgr__percent', 'text'), '85%', 'final number under reduced motion');
    h.ok(Math.abs(parseFloat(await read(rm, '.pgr__ring-fill', 'strokeDashoffset')) - 26.39) < 0.1, 'ring final under reduced motion');
  },
  async after(browser, h) {
    const sf = await L.mount(browser, NAME, {width: 1366, height: 400, editing: false, assets: []});
    await sf.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '2000px'; document.body.prepend(s); });
    await sf.page.addScriptTag({content: require('fs').readFileSync(require('path').join(__dirname, '../shopify/assets/' + L.ASSET), 'utf8')}); await sf.page.waitForTimeout(200);
    h.eq(await read(sf, '.pgr', '@data-fd-reveal'), 'pending', 'pending below the fold');
    h.eq(await read(sf, '.pgr__percent', 'opacity'), '0', 'number hidden until in view');
    await sf.page.evaluate(() => document.getElementById('shopify-section-test').scrollIntoView());
    await sf.page.waitForTimeout(250);
    h.ok(parseInt(await read(sf, '.pgr__percent', 'text')) < 85, 'number counts up');
    await L.settled(sf.page); await sf.page.waitForTimeout(1500);
    h.eq(await read(sf, '.pgr__percent', 'text'), '85%', 'counted to the final value');
    await sf.emit({ring_thickness: 8});
    h.eq(await sf.page.evaluate(() => document.querySelector('#shopify-section-test .pgr__ring-fill').getAnimations().length), 0, 'live edit does not replay');
    await sf.page.close();
  },
}).catch(e => { console.error(e); process.exit(1); });
