/* Progress Benefits: theme inheritance, custom colours and fonts under the theme priority rules,
   every control (live and after a redraw), desktop/mobile values, two instances, added blocks,
   the once-only ring fill and count up on the storefront, final values in the editor and under
   reduced motion, and the saved product page instance drawn as it was before round 4.
   Run: node tests/theme-features-d-progress-benefits.cjs */
const L = require('./theme-features-d-lib.cjs');
const {assert, DESK, read} = L;
const NAME = 'progress-benefits';
const C = {pre: {enable_custom_style: true}};
const BC = {preBlock: true, pre: {enable_custom_style: true}};
const D = (d, m) => w => DESK(w) ? d : m;

const TABLE = [
  {id: 'color_scheme', v: 'alt-scheme', sel: '.pgc', css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'full_width', sel: '.pgc', css: 'width', exp: w => w + 'px'},
  {id: 'reset_spacing', v: false, live: false, check: async t => assert.equal(await t.page.evaluate(() => /padding-top: 0 !important/.test(document.querySelector('#shopify-section-test style[data-rs-bulletproof]').textContent)), false)},
  {id: 'text_position', v: 'right', check: async (t, w) => { const x = await t.page.evaluate(() => { const r = s => document.querySelector('#shopify-section-test ' + s).getBoundingClientRect(); return [r('.pgc__col-text').x, r('.pgc__col-stats').x]; }); assert.ok(DESK(w) ? x[0] > x[1] : x[0] === x[1], 'text side ' + x); }},
  {id: 'text_align', v: 'center', sel: '.pgc__col-text', css: 'textAlign', exp: D('center', 'left')},
  {id: 'text_column_width', v: 30, check: async (t, w) => { const r = await t.page.evaluate(() => document.querySelector('#shopify-section-test .pgc__col-text').getBoundingClientRect().width / document.querySelector('#shopify-section-test .pgc__grid').getBoundingClientRect().width); assert.ok(DESK(w) ? r < 0.3 && r > 0.2 : r > 0.99, 'text column ' + r); }},
  {id: 'gap_desktop', v: 40, sel: '.pgc__grid', css: 'columnGap', exp: D('40px', '36px')},
  {id: 'text_gap', v: 10, sel: '.pgc__col-text', css: 'rowGap', exp: '10px'},
  {id: 'heading_subheading_gap', v: 18, sel: '.pgc__subheading', css: 'marginTop', exp: '-4px'},
  {id: 'stats_per_row_desktop', v: '3', sel: '.pgc__stats', css: 'gridTemplateColumns', exp: w => DESK(w) ? /^(\S+ ){2}\S+$/ : /^\S+$/},
  {id: 'stat_gap_desktop', v: 12, sel: '.pgc__stats', css: 'rowGap', exp: D('12px', '28px')},
  {id: 'stat_gap_x_desktop', v: 14, sel: '.pgc__stats', css: 'columnGap', exp: D('14px', '20px')},
  {id: 'stat_inner_gap', v: 3, sel: '.pgc__stat', css: 'rowGap', exp: '3px'},
  {id: 'percent_ring_gap', v: 21, sel: '.pgc__stat-row', css: 'columnGap', exp: '21px'},
  {id: 'ring_size', v: 50, sel: '.pgc__stat-ring', css: 'width', exp: '50px'},
  {id: 'percent_size_desktop', v: 60, sel: '.pgc__stat-percent', css: 'fontSize', exp: D('60px', '40px')},
  {id: 'label_size', v: 17, sel: '.pgc__stat-label', css: 'fontSize', exp: '17px'},
  {id: 'section_bg', v: '#abcdef', ...C, sel: '.pgc', css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'text_color', v: '#111111', ...C, sel: '.pgc__subheading', css: 'color', exp: 'rgb(17, 17, 17)'},
  {id: 'percent_color', v: '#ff00ff', ...C, sel: '.pgc__stat-percent', css: 'color', exp: 'rgb(255, 0, 255)'},
  {id: 'ring_color', v: '#00ff00', ...C, sel: '.pgc__ring-fill', css: 'stroke', exp: 'rgb(0, 255, 0)'},
  {id: 'ring_track', v: '#0000ff', ...C, sel: '.pgc__ring-bg', css: 'stroke', exp: 'rgb(0, 0, 255)'},
  {id: 'stat_text_color', v: '#123123', ...C, sel: '.pgc__stat-label', css: 'color', exp: 'rgb(18, 49, 35)'},
  {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.pgc__heading', css: 'fontFamily', exp: /Verdana/},
  {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.pgc__stat-label p', css: 'fontFamily', exp: /Tahoma/},
  {id: 'animate', v: false, live: false, sel: '.pgc', css: '@data-fd-reveal', exp: null},
  {id: 'padding_top_desktop', v: 70, sel: '.pgc', css: 'paddingTop', exp: D('70px', '60px')},
  {id: 'padding_bottom_desktop', v: 72, sel: '.pgc', css: 'paddingBottom', exp: D('72px', '60px')},
  {id: 'side_padding_desktop', v: 50, sel: '.pgc', css: 'paddingLeft', exp: D('50px', '20px')},
  {id: 'section_margin_top_desktop', v: 20, sel: ':wrapper', css: 'marginTop', exp: D('20px', '0px')},
  {id: 'section_margin_bottom_desktop', v: 22, sel: ':wrapper', css: 'marginBottom', exp: D('22px', '0px')},
  {id: 'text_align_mobile', v: 'right', sel: '.pgc__col-text', css: 'textAlign', exp: D('left', 'right')},
  {id: 'gap_mobile', v: 12, sel: '.pgc__grid', css: 'rowGap', exp: D('80px', '12px')},
  {id: 'stats_per_row_mobile', v: '2', sel: '.pgc__stats', css: 'gridTemplateColumns', exp: w => /^\S+ \S+$/},
  {id: 'stat_gap_mobile', v: 9, sel: '.pgc__stats', css: 'rowGap', exp: D('40px', '9px')},
  {id: 'stat_gap_x_mobile', v: 7, pre: {stats_per_row_mobile: '2'}, sel: '.pgc__stats', css: 'columnGap', exp: D('32px', '7px')},
  {id: 'percent_size_mobile', v: 30, sel: '.pgc__stat-percent', css: 'fontSize', exp: D('48px', '30px')},
  {id: 'padding_top_mobile', v: 30, sel: '.pgc', css: 'paddingTop', exp: D('100px', '30px')},
  {id: 'padding_bottom_mobile', v: 31, sel: '.pgc', css: 'paddingBottom', exp: D('100px', '31px')},
  {id: 'side_padding_mobile', v: 11, sel: '.pgc', css: 'paddingLeft', exp: D('32px', '11px')},
  {id: 'section_margin_top_mobile', v: 9, sel: ':wrapper', css: 'marginTop', exp: D('0px', '9px')},
  {id: 'section_margin_bottom_mobile', v: 8, sel: ':wrapper', css: 'marginBottom', exp: D('0px', '8px')},
  /* blocks */
  {block: 'heading', id: 'text', v: 'Real <em>results</em>', sel: '.pgc__heading em', css: 'text', exp: 'results'},
  {block: 'heading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#cc0033'}, sel: '.pgc__heading', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'heading', id: 'color', v: '#cc0033', ...BC, sel: '.pgc__heading', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'heading', id: 'accent_color', v: '#00aa00', ...BC, sel: '.pgc__heading em', css: 'color', exp: 'rgb(0, 170, 0)'},
  {block: 'heading', id: 'size_desktop', v: 60, sel: '.pgc__heading', css: 'fontSize', exp: D('60px', '32px')},
  {block: 'heading', id: 'size_mobile', v: 22, sel: '.pgc__heading', css: 'fontSize', exp: D('44px', '22px')},
  {block: 'heading', id: 'uppercase', v: true, sel: '.pgc__heading', css: 'textTransform', exp: 'uppercase'},
  {block: 'subheading', id: 'text', v: '<p>Made <strong>daily</strong></p>', sel: '.pgc__subheading strong', css: 'text', exp: 'daily'},
  {block: 'subheading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#00cc00'}, sel: '.pgc__subheading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'subheading', id: 'color', v: '#00cc00', ...BC, sel: '.pgc__subheading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'subheading', id: 'size_desktop', v: 21, sel: '.pgc__subheading', css: 'fontSize', exp: D('21px', '14px')},
  {block: 'subheading', id: 'size_mobile', v: 12, sel: '.pgc__subheading', css: 'fontSize', exp: D('16px', '12px')},
  {block: 'stat', id: 'percent', v: 50, check: async t => { await L.settled(t.page); await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test .pgc__ring-fill').forEach(c => c.getAnimations().forEach(a => a.finish()))); assert.equal(await read(t, '.pgc__stat-percent', 'text'), '50%'); assert.ok(Math.abs(parseFloat(await read(t, '.pgc__ring-fill', 'strokeDashoffset')) - 87.97) < 0.05, 'ring half full'); }},
  {block: 'stat', id: 'text', v: '<p>of orders <strong>ship</strong></p>', sel: '.pgc__stat-label strong', css: 'text', exp: 'ship'},
  {block: 'stat', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#ff8800'}, sel: '.pgc__ring-fill', css: 'stroke', exp: 'rgb(255, 136, 0)'},
  {block: 'stat', id: 'color', v: '#ff8800', ...BC, sel: '.pgc__ring-fill', css: 'stroke', exp: 'rgb(255, 136, 0)'},
  {block: 'footnote', id: 'text', v: 'From <em>store</em> data', sel: '.pgc__footnote em', css: 'text', exp: 'store'},
  {block: 'footnote', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#0000cc'}, sel: '.pgc__footnote', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'footnote', id: 'color', v: '#0000cc', ...BC, sel: '.pgc__footnote', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'footnote', id: 'size', v: 17, sel: '.pgc__footnote', css: 'fontSize', exp: '17px'},
  {block: 'footnote', id: 'margin_top', v: 30, sel: '.pgc__footnote', css: 'marginTop', exp: '30px'},
];
const h2 = t => t.page.evaluate(() => { const h = document.createElement('h2'); document.querySelector('#shopify-section-test .pgc').append(h); const v = getComputedStyle(h).fontFamily; h.remove(); return v; });

L.suite({
  name: NAME, table: TABLE, extra: ['enable_custom_style', 'enable_custom_fonts'],
  snap: '#shopify-section-test :is(.pgc, .pgc__grid, .pgc__col-text, .pgc__heading, .pgc__subheading, .pgc__stats, .pgc__stat, .pgc__stat-percent, .pgc__stat-ring, .pgc__stat-label, .pgc__footnote)',
  bgSel: '.pgc',
  async inherit(t, h) {
    h.eq(await read(t, '.pgc', 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background ' + h.tag);
    h.eq(await read(t, '.pgc__heading', 'color'), 'rgb(255, 255, 255)', 'heading colour');
    h.match(await read(t, '.pgc__heading', 'fontFamily'), /Georgia/, 'heading font');
    h.eq(await read(t, '.pgc__heading', '.tagName'), 'H2', 'heading is h2');
    h.eq(await read(t, '.pgc__heading em', 'color'), 'rgb(51, 102, 153)', 'accent follows primary');
    h.eq(await read(t, '.pgc__subheading', 'color'), 'rgb(204, 204, 204)', 'text colour');
    h.match(await read(t, '.pgc__stat-label p', 'fontFamily'), /Arial/, 'body font');
    h.match(await read(t, '.pgc__stat-percent', 'fontFamily'), /Georgia/, 'percent uses the heading font');
    h.eq(await read(t, '.pgc__ring-fill', 'stroke'), 'rgb(51, 102, 153)', 'ring follows primary');
    h.eq(await read(t, '.pgc__ring-bg', 'stroke'), 'rgb(68, 85, 102)', 'track follows border');
  },
  custom: {
    on: {section_bg: '#abcdef', ring_color: '#00ff00', percent_color: '#ff00ff', text_color: '#111111'},
    checks: [['.pgc', 'backgroundColor', 'rgb(171, 205, 239)'], ['.pgc__ring-fill', 'stroke', 'rgb(0, 255, 0)'], ['.pgc__stat-percent', 'color', 'rgb(255, 0, 255)'], [':wrapper', 'backgroundColor', 'rgb(171, 205, 239)']],
    off: [['.pgc', 'backgroundColor', 'rgb(24, 32, 40)'], ['.pgc__ring-fill', 'stroke', 'rgb(51, 102, 153)'], ['.pgc__stat-percent', 'color', 'rgb(255, 255, 255)'], [':wrapper', 'backgroundColor', 'rgba(0, 0, 0, 0)'], ['.pgc__subheading', 'color', 'rgb(204, 204, 204)']],
  },
  fonts: {
    on: {heading_font: {family: 'Verdana'}, body_font: {family: 'Tahoma'}},
    checks: [['.pgc__heading', /Verdana/], ['.pgc__heading em', /Verdana/], ['.pgc__stat-percent', /Verdana/], ['.pgc__subheading p', /Tahoma/], ['.pgc__stat-label p', /Tahoma/], ['.pgc__footnote p', /Tahoma/]],
    off: [['.pgc__heading', /Georgia/], ['.pgc__subheading p', /Arial/], ['.pgc__stat-label p', /Arial/]],
  },
  extraBlock: {block: {type: 'stat', settings: {percent: 33, text: '<p>Added stat</p>'}}, async check(t, h) {
    h.eq(await read(t, '.pgc__stat:last-child .pgc__stat-label', 'text'), 'Added stat', 'added block renders');
    await t.emit({percent: 44}, t.rendered[0].section.blocks.filter(b => b.type === 'stat').pop().id);
    h.eq(await read(t, '.pgc__stat:last-child .pgc__stat-percent', 'text'), '44%', 'added block live');
  }},
  async each(t, width, editing, h) {
    /* Layout variants differ: stats per row */
    const cols = {};
    for (const n of ['1', '2', '3', '4']) { await t.emit({stats_per_row_desktop: n, stats_per_row_mobile: n === '1' ? '1' : '2'}); cols[n] = await read(t, '.pgc__stats', 'gridTemplateColumns'); }
    h.eq(new Set(Object.values(cols)).size, DESK(width) ? 4 : 2, 'stats per row differ ' + JSON.stringify(cols));
    await t.emit({stats_per_row_desktop: '2', stats_per_row_mobile: '1'});
    const xs = {};
    for (const al of ['left', 'center', 'right']) { await t.emit({text_align: al, text_align_mobile: al}); xs[al] = await t.page.evaluate(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('#shopify-section-test .pgc__heading')); return Math.round(r.getClientRects()[0].x); }); }
    h.eq(new Set(Object.values(xs)).size, 3, 'alignments differ');
    await t.emit({text_align: 'left', text_align_mobile: 'left'});
    /* Legacy: a heading saved with the old <p> wrapper prints no paragraph inside the h2 */
    await t.redraw({blocks: [{type: 'heading', settings: {text: '<p>Old <em>saved</em> heading</p>'}}, {type: 'stat'}]});
    h.eq(await read(t, '.pgc__heading p', 'text'), '<missing .pgc__heading p>', 'no paragraph inside the heading');
    h.eq(await read(t, '.pgc__heading', 'text'), 'Old saved heading', 'saved heading text kept');
    /* Unrelated edits do not replay the rings or the numbers */
    await t.redraw({blocks: L.schemaOf(NAME).schema.presets[0].blocks});
    await L.settled(t.page);
    await t.page.evaluate(() => { window.__fdText = document.querySelector('#shopify-section-test .pgc__stat-percent').firstChild; });
    for (const patch of [{ring_size: 40}, {label_size: 15}, {percent_size_desktop: 50}]) await t.emit(patch);
    h.ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .pgc__stat-percent').textContent === '92%' && document.querySelector('#shopify-section-test .pgc__ring-fill').getAnimations().length === 0), 'no replay on edits ' + h.tag);
    h.eq(await read(t, '.pgc', '@data-fd-reveal'), editing ? null : 'done', 'reveal state ' + h.tag);
  },
  async two(two, h) {
    await two.emit({enable_custom_style: true, section_bg: '#abcdef', ring_size: 55}, undefined, 'a');
    await two.emit({text: 'Only A'}, two.blockId('heading', 0, 'a'), 'a');
    h.eq(await read(two, '.pgc', 'backgroundColor', 'a'), 'rgb(171, 205, 239)', 'a edited');
    h.eq(await read(two, '.pgc', 'backgroundColor', 'b'), 'rgb(24, 32, 40)', 'b untouched');
    h.eq(await read(two, '.pgc__stat-ring', 'width', 'b'), '37px', 'b ring untouched');
    h.eq(await read(two, '.pgc__heading', 'text', 'b'), 'What customers noticed', 'b heading untouched');
  },
  async reduced(rm, h) {
    h.eq(await read(rm, '.pgc__stat-percent', 'opacity'), '1', 'number shown under reduced motion');
    h.eq(await read(rm, '.pgc__stat-percent', 'text'), '92%', 'final number under reduced motion');
    h.ok(Math.abs(parseFloat(await read(rm, '.pgc__ring-fill', 'strokeDashoffset')) - 14.07) < 0.1, 'ring final under reduced motion');
  },
  async after(browser, h) {
    /* Storefront: pending below the fold, fills and counts once in view, a live edit does not replay. */
    const sf = await L.mount(browser, NAME, {width: 1366, height: 400, editing: false, assets: []});
    await sf.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '2000px'; document.body.prepend(s); });
    await sf.page.addScriptTag({content: require('fs').readFileSync(require('path').join(__dirname, '../shopify/assets/' + L.ASSET), 'utf8')}); await sf.page.waitForTimeout(200);
    h.eq(await read(sf, '.pgc', '@data-fd-reveal'), 'pending', 'pending below the fold');
    h.eq(await read(sf, '.pgc__stat-percent', 'opacity'), '0', 'number hidden until in view');
    h.ok(Math.abs(parseFloat(await read(sf, '.pgc__ring-fill', 'strokeDashoffset')) - 175.93) < 0.1, 'ring empty until in view');
    await sf.page.evaluate(() => document.getElementById('shopify-section-test').scrollIntoView());
    await sf.page.waitForTimeout(250);
    const mid = parseInt(await read(sf, '.pgc__stat-percent', 'text'));
    h.ok(mid < 92, 'number counts up from 0: ' + mid);
    await sf.emit({label_size: 16});
    await L.settled(sf.page); await sf.page.waitForTimeout(1500);
    h.eq(await read(sf, '.pgc', '@data-fd-reveal'), 'done', 'revealed once');
    h.eq(await read(sf, '.pgc__stat-percent', 'text'), '92%', 'counted to the final value');
    await sf.emit({percent: 70}, sf.blockId('stat'));
    h.eq(await read(sf, '.pgc__stat-percent', 'text'), '70%', 'edit after the count shows at once');
    h.eq(await sf.page.evaluate(() => window.MateriaFeaturesD.state(document.querySelector('#shopify-section-test [data-fd]')).counting.size), 0, 'edit does not count again');
    await sf.page.close();
    /* The saved product page instance: same colours with the custom toggles the lead sets. */
    const inst = require('../templates/product.json').sections.progress_benefits_k4FdAe;
    const blocks = inst.block_order.map(k => ({type: inst.blocks[k].type, settings: {...inst.blocks[k].settings, enable_custom_style: true}}));
    for (const width of [375, 1366]) {
      const t = await L.mount(browser, NAME, {width, editing: true, settings: {...inst.settings, enable_custom_style: true}, blocks, assets: [L.ASSET]});
      const o = await L.mount(browser, L.headCopy(NAME), {width, editing: true, settings: inst.settings, blocks: inst.block_order.map(k => inst.blocks[k]), assets: []});
      for (const [sel, prop] of [['.pgc', 'backgroundColor'], ['.pgc__heading', 'color'], ['.pgc__heading em', 'color'], ['.pgc__subheading', 'color'], ['.pgc__subheading', 'fontSize'], ['.pgc__stat-percent', 'color'], ['.pgc__stat-percent', 'fontSize'], ['.pgc__stat-label', 'color'], ['.pgc__stat-ring', 'width'], ['.pgc__ring-bg', 'stroke'], ['.pgc__stats', 'gridTemplateColumns'], ['.pgc__stats', 'rowGap'], ['.pgc', 'paddingTop'], ['.pgc', 'paddingLeft']]) {
        h.eq(await read(t, sel, prop), await read(o, sel, prop), `saved instance ${sel} ${prop} @${width}`);
      }
      h.eq(await read(t, '.pgc__ring-fill', 'stroke'), 'rgb(23, 65, 159)', 'saved ring colour @' + width);
      await t.page.close(); await o.page.close();
    }
  },
}).catch(e => { console.error(e); process.exit(1); });
