/* Stat Counter Pro: theme inheritance, header blocks (and the old header settings when a section has
   none), custom colours, fonts, weight and size under the theme priority rules, every control (live
   and after a redraw), card styles, two instances, added blocks, the once-only count up on the
   storefront, final values in the editor and under reduced motion.
   Run: node tests/theme-features-d-stat-counter-pro.cjs */
const L = require('./theme-features-d-lib.cjs');
const {assert, DESK, read} = L;
const NAME = 'stat-counter-pro';
const C = {pre: {enable_custom_style: true}};
const BC = {preBlock: true, pre: {enable_custom_style: true}};
const D = (d, m) => w => DESK(w) ? d : m;
const cols = n => new RegExp('^(\\S+ ){' + (n - 1) + '}\\S+$');
const ICON = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';

const TABLE = [
  {id: 'color_scheme', v: 'alt-scheme', sel: '.scp-section', css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'container', sel: '.scp-section > div', css: '@class', exp: 'container'},
  {id: 'reset_spacing', v: false, sel: '.scp-section', css: '.className', exp: /^(?!.*remove_spacing)/},
  {id: 'style_mode', v: 'card', sel: '.scp-item', css: 'borderTopLeftRadius', exp: '18px'},
  {id: 'header_alignment', v: 'left', sel: '.fd-header', css: 'alignItems', exp: 'flex-start'},
  {id: 'columns', v: 3, sel: '.scp-grid', css: 'gridTemplateColumns', exp: w => cols(DESK(w) ? 3 : 2)},
  {id: 'column_gap', v: 10, sel: '.scp-grid', css: 'columnGap', exp: '10px'},
  {id: 'custom_item_padding', v: 12, sel: '.scp-item', css: 'paddingLeft', exp: '15px'},
  {id: 'custom_max_width', v: 600, sel: '.scp-body', css: 'maxWidth', exp: '600px'},
  {id: 'card_radius', v: 4, pre: {style_mode: 'card'}, sel: '.scp-item', css: 'borderTopLeftRadius', exp: '4px'},
  {id: 'ring_size', v: 100, sel: '.scp-ring', css: 'width', exp: '100px'},
  {id: 'ring_thickness', v: 9, sel: '.scp-ring__fill', css: 'strokeWidth', exp: '9px'},
  {id: 'value_size', v: 50, sel: '.scp-value', css: 'fontSize', exp: '50px'},
  {id: 'label_size', v: 18, sel: '.scp-label', css: 'fontSize', exp: '18px'},
  {id: 'custom_uppercase_label', v: false, sel: '.scp-label', css: 'textTransform', exp: 'none'},
  {id: 'custom_section_bg', v: '#abcdef', ...C, sel: '.scp-section', css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'custom_text_color', v: '#111111', ...C, sel: '.scp-label', css: 'color', exp: 'rgb(17, 17, 17)'},
  {id: 'accent_color', v: '#ff00ff', ...C, sel: '.scp-ring__fill', css: 'stroke', exp: 'rgb(255, 0, 255)'},
  {id: 'track_color', v: '#0000ff', ...C, sel: '.scp-ring__track', css: 'stroke', exp: 'rgb(0, 0, 255)'},
  {id: 'card_bg', v: '#00ff00', pre: {enable_custom_style: true, style_mode: 'card'}, sel: '.scp-item', css: 'backgroundColor', exp: 'rgb(0, 255, 0)'},
  {id: 'custom_trend_up_bg', v: '#ff0000', ...C, sel: '.scp-trend--up', css: 'color', exp: 'rgb(255, 0, 0)'},
  {id: 'custom_trend_down_bg', v: '#00aa00', ...C, sel: '.scp-trend--down', css: 'color', exp: 'rgb(0, 170, 0)'},
  {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.scp-value', css: 'fontFamily', exp: /Verdana/},
  {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.scp-label', css: 'fontFamily', exp: /Tahoma/},
  {id: 'animate', v: false, live: false, sel: '.scp-section', css: '@data-fd-reveal', exp: null},
  {id: 'duration', v: 900, check: async t => assert.equal(await t.page.evaluate(() => document.querySelector('#shopify-section-test .scp-section').style.getPropertyValue('--fd-dur').trim()), '900ms')},
  {id: 'reveal', v: false, sel: '.scp-section', css: '@data-ti-no-reveal', exp: ''},
  {id: 'padding_top', v: 70, check: async t => assert.equal(await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .scp-section')).getPropertyValue('--section-pt').trim()), '70')},
  {id: 'padding_bottom', v: 72, check: async t => assert.equal(await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .scp-section')).getPropertyValue('--section-pb').trim()), '72')},
  {id: 'section_margin_top_desktop', v: 20, sel: ':wrapper', css: 'marginTop', exp: D('20px', '0px')},
  {id: 'section_margin_bottom_desktop', v: 22, sel: ':wrapper', css: 'marginBottom', exp: D('22px', '0px')},
  {id: 'columns_mobile', v: 1, sel: '.scp-grid', css: 'gridTemplateColumns', exp: w => cols(DESK(w) ? 4 : 1)},
  {id: 'section_margin_top_mobile', v: 9, sel: ':wrapper', css: 'marginTop', exp: D('0px', '9px')},
  {id: 'section_margin_bottom_mobile', v: 8, sel: ':wrapper', css: 'marginBottom', exp: D('0px', '8px')},
  /* blocks */
  {block: 'eyebrow', id: 'text', v: 'Since 2019', sel: '.fd-eyebrow', css: 'text', exp: 'Since 2019'},
  {block: 'eyebrow', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#cc0033'}, sel: '.fd-eyebrow', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'eyebrow', id: 'color', v: '#cc0033', ...BC, sel: '.fd-eyebrow', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'eyebrow', id: 'size_enable', v: true, sel: '.fd-eyebrow', css: 'fontSize', exp: '14px'},
  {block: 'eyebrow', id: 'size', v: 20, preBlock: true, pre: {size_enable: true}, sel: '.fd-eyebrow', css: 'fontSize', exp: '20px'},
  {block: 'heading', id: 'text', v: 'Our <strong>numbers</strong>', sel: '.fd-heading strong', css: 'text', exp: 'numbers'},
  {block: 'heading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#00cc00'}, sel: '.fd-heading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'heading', id: 'color', v: '#00cc00', ...BC, sel: '.fd-heading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'heading', id: 'weight_enable', v: true, sel: '.fd-heading', css: 'fontWeight', exp: '700'},
  {block: 'heading', id: 'weight', v: '400', preBlock: true, pre: {weight_enable: true}, sel: '.fd-heading', css: 'fontWeight', exp: '400'},
  {block: 'heading', id: 'size_enable', v: true, sel: '.fd-heading', css: 'fontSize', exp: D('40px', '28px')},
  {block: 'heading', id: 'size_desktop', v: 60, preBlock: true, pre: {size_enable: true}, sel: '.fd-heading', css: 'fontSize', exp: D('60px', '28px')},
  {block: 'heading', id: 'size_mobile', v: 22, preBlock: true, pre: {size_enable: true}, sel: '.fd-heading', css: 'fontSize', exp: D('40px', '22px')},
  {block: 'heading', id: 'enable_custom_fonts', v: true, preBlock: true, pre: {font: {family: 'Courier New'}}, sel: '.fd-heading', css: 'fontFamily', exp: /Courier New/},
  {block: 'heading', id: 'font', v: {family: 'Courier New'}, preBlock: true, pre: {enable_custom_fonts: true}, sel: '.fd-heading', css: 'fontFamily', exp: /Courier New/},
  {block: 'subheading', id: 'text', v: '<p>Made <em>daily</em></p>', sel: '.fd-sub em', css: 'text', exp: 'daily'},
  {block: 'subheading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#0000cc'}, sel: '.fd-sub', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'subheading', id: 'color', v: '#0000cc', ...BC, sel: '.fd-sub', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'subheading', id: 'size_enable', v: true, sel: '.fd-sub', css: 'fontSize', exp: '16px'},
  {block: 'subheading', id: 'size', v: 19, preBlock: true, pre: {size_enable: true}, sel: '.fd-sub', css: 'fontSize', exp: '19px'},
  {block: 'subheading', id: 'max_width', v: 300, sel: '.fd-sub', css: 'maxWidth', exp: '300px'},
  {block: 'stat', id: 'value', v: '50', check: async t => { await L.settled(t.page); await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test .scp-ring__fill').forEach(c => c.getAnimations().forEach(a => a.finish()))); assert.equal(await read(t, '.scp-number', 'text'), '50'); assert.ok(Math.abs(parseFloat(await read(t, '.scp-ring__fill', 'strokeDashoffset')) - 144.52) < 0.1, 'ring half full'); }},
  {block: 'stat', id: 'ring_max', v: '196', check: async t => { await L.settled(t.page); await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test .scp-ring__fill').forEach(c => c.getAnimations().forEach(a => a.finish()))); assert.ok(Math.abs(parseFloat(await read(t, '.scp-ring__fill', 'strokeDashoffset')) - 144.52) < 0.1, 'ring half full at 98 / 196'); }},
  {block: 'stat', id: 'prefix', v: '$', sel: '.scp-prefix', css: 'text', exp: '$'},
  {block: 'stat', id: 'suffix', v: 'k', sel: '.scp-suffix', css: 'text', exp: 'k'},
  {block: 'stat', id: 'label', v: 'Orders', sel: '.scp-label', css: 'text', exp: 'Orders'},
  {block: 'stat', id: 'trend_value', v: '+9%', sel: '.scp-trend__text', css: 'text', exp: '+9%'},
  {block: 'stat', id: 'trend_direction', v: 'down', sel: '.scp-trend', css: 'color', exp: 'rgb(220, 38, 38)'},
  {block: 'stat', id: 'decimals', v: 1, sel: '.scp-number', css: '@data-decimals', exp: '1'},
  {block: 'stat', id: 'icon', v: ICON, sel: '.scp-icon circle', css: '@r', exp: '4'},
];
const FULL = L.SAMPLE[NAME];

L.suite({
  name: NAME, table: TABLE, extra: ['enable_custom_style', 'enable_custom_fonts'], full: FULL,
  snap: '#shopify-section-test :is(.scp-section, .fd-header, .fd-eyebrow, .fd-heading, .fd-sub, .scp-grid, .scp-item, .scp-ring, .scp-value, .scp-label, .scp-trend)',
  bgSel: '.scp-section',
  async inherit(t, h) {
    h.eq(await read(t, '.scp-section', 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background ' + h.tag);
    h.eq(await read(t, '.fd-heading', 'color'), 'rgb(255, 255, 255)', 'heading colour');
    h.match(await read(t, '.fd-heading', 'fontFamily'), /Georgia/, 'heading font');
    h.eq(await read(t, '.fd-heading', '.tagName'), 'H2', 'heading is h2');
    h.eq(await read(t, '.fd-sub', 'color'), 'rgb(204, 204, 204)', 'subheading text colour');
    h.eq(await read(t, '.scp-value', 'color'), 'rgb(51, 102, 153)', 'number follows primary');
    h.eq(await read(t, '.scp-ring__fill', 'stroke'), 'rgb(51, 102, 153)', 'ring follows primary');
    h.eq(await read(t, '.scp-ring__track', 'stroke'), 'rgb(68, 85, 102)', 'track follows border');
    h.match(await read(t, '.scp-label', 'fontFamily'), /Arial/, 'label body font');
    h.match(await read(t, '.fd-eyebrow', 'fontFamily'), /Arial/, 'eyebrow body font');
  },
  custom: {
    on: {custom_section_bg: '#abcdef', accent_color: '#ff00ff', track_color: '#0000ff', custom_text_color: '#111111'},
    checks: [['.scp-section', 'backgroundColor', 'rgb(171, 205, 239)'], ['.scp-value', 'color', 'rgb(255, 0, 255)'], ['.scp-ring__track', 'stroke', 'rgb(0, 0, 255)'], ['.scp-label', 'color', 'rgb(17, 17, 17)']],
    off: [['.scp-section', 'backgroundColor', 'rgb(24, 32, 40)'], ['.scp-value', 'color', 'rgb(51, 102, 153)'], ['.scp-ring__track', 'stroke', 'rgb(68, 85, 102)'], ['.scp-label', 'color', 'rgb(204, 204, 204)']],
  },
  fonts: {
    on: {heading_font: {family: 'Verdana'}, body_font: {family: 'Tahoma'}},
    checks: [['.fd-heading', /Verdana/], ['.scp-value', /Verdana/], ['.scp-label', /Tahoma/], ['.fd-eyebrow', /Tahoma/], ['.fd-sub p', /Tahoma/]],
    off: [['.fd-heading', /Georgia/], ['.scp-label', /Arial/], ['.fd-sub p', /Arial/]],
  },
  extraBlock: {block: {type: 'stat', settings: {value: '77', label: 'Added stat'}}, async check(t, h) {
    h.eq(await read(t, '.scp-item:last-child .scp-label', 'text'), 'Added stat', 'added block renders');
    await t.emit({value: '88'}, t.rendered[0].section.blocks.filter(b => b.type === 'stat').pop().id);
    h.eq(await read(t, '.scp-item:last-child .scp-number', 'text'), '88', 'added block live');
  }},
  async each(t, width, editing, h) {
    /* Stat styles look different, live and after a redraw; the number moves, nothing is rebuilt */
    await t.page.evaluate(() => { window.__num = document.querySelector('#shopify-section-test .scp-number'); });
    const looks = {};
    for (const m of ['ring', 'badge', 'card']) {
      await t.emit({style_mode: m});
      looks[m] = await t.page.evaluate(() => { const i = document.querySelector('#shopify-section-test .scp-item'), v = i.querySelector('.scp-value'), c = getComputedStyle(i), cv = getComputedStyle(v); return [c.backgroundColor, cv.backgroundColor, cv.fontSize, i.querySelector('.scp-ring').hidden, !!v.closest('.scp-ring')].join(); });
    }
    h.eq(new Set(Object.values(looks)).size, 3, 'stat styles differ ' + JSON.stringify(looks));
    h.ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .scp-number') === window.__num), 'number element kept when the style changes');
    for (const m of ['badge', 'card', 'ring']) {
      await t.redraw({settings: {style_mode: m}});
      h.eq(await t.page.evaluate(() => { const i = document.querySelector('#shopify-section-test .scp-item'), v = i.querySelector('.scp-value'), c = getComputedStyle(i), cv = getComputedStyle(v); return [c.backgroundColor, cv.backgroundColor, cv.fontSize, i.querySelector('.scp-ring').hidden, !!v.closest('.scp-ring')].join(); }), looks[m], 'redraw draws the same ' + m);
    }
    /* Trend directions differ */
    const tr = {};
    for (const d of ['up', 'down', 'flat']) { await t.emit({trend_direction: d}, t.blockId('stat')); tr[d] = await read(t, '.scp-trend', 'color') + (await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .scp-trend svg')].findIndex(x => getComputedStyle(x).display !== 'none'))); }
    h.eq(new Set(Object.values(tr)).size, 3, 'trend directions differ ' + JSON.stringify(tr));
    await t.emit({trend_direction: 'up'}, t.blockId('stat'));
    /* Heading weight and font win under the theme rules on the h2 and inside it, live */
    await t.emit({weight_enable: true, weight: '400', enable_custom_fonts: true, font: {family: 'Courier New'}, text: 'Big <strong>wins</strong>'}, t.blockId('heading'));
    h.eq(await read(t, '.fd-heading', 'fontWeight'), '400', 'own weight wins ' + h.tag);
    h.match(await read(t, '.fd-heading strong', 'fontFamily'), /Courier New/, 'own font wins inside the heading');
    await t.emit({weight_enable: false, enable_custom_fonts: false}, t.blockId('heading'));
    h.eq(await read(t, '.fd-heading', 'fontWeight'), '700', 'theme weight back');
    h.match(await read(t, '.fd-heading', 'fontFamily'), /Georgia/, 'theme font back');
    /* Old header settings draw only while a section has no header blocks */
    await t.redraw({settings: {subheading: 'Old eyebrow', heading: 'Old heading', description: '<p>Old text</p>'}, blocks: FULL.filter(b => b.type === 'stat')});
    h.eq(await read(t, '[data-fd-legacy="heading"]', 'text'), 'Old heading', 'legacy heading without blocks');
    h.eq(await read(t, '[data-fd-legacy="description"]', 'text'), 'Old text', 'legacy text without blocks');
    await t.redraw({blocks: FULL});
    h.eq(await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test [data-fd-legacy]').length), 0, 'blocks replace the old header settings');
    await L.settled(t.page);
    for (const patch of [{value_size: 30}, {ring_size: 120}]) await t.emit(patch);
    h.ok(await t.page.evaluate(() => window.MateriaFeaturesD.state(document.querySelector('#shopify-section-test [data-fd]')).counting.size === 0 && document.querySelector('#shopify-section-test .scp-ring__fill').getAnimations().length === 0), 'no replay on edits ' + h.tag);
  },
  async two(two, h) {
    await two.emit({enable_custom_style: true, custom_section_bg: '#abcdef', ring_size: 90}, undefined, 'a');
    await two.emit({label: 'Only A'}, two.blockId('stat', 0, 'a'), 'a');
    h.eq(await read(two, '.scp-section', 'backgroundColor', 'a'), 'rgb(171, 205, 239)', 'a edited');
    h.eq(await read(two, '.scp-section', 'backgroundColor', 'b'), 'rgb(24, 32, 40)', 'b untouched');
    h.eq(await two.page.evaluate(() => document.querySelector('#shopify-section-b .scp-section').style.getPropertyValue('--scp-ring').trim()), '140px', 'b ring untouched');
    h.eq(await read(two, '.scp-label', 'text', 'b'), 'Five-star reviews', 'b label untouched');
  },
  async reduced(rm, h) {
    h.eq(await read(rm, '.scp-number', 'opacity'), '1', 'number shown under reduced motion');
    h.eq(await read(rm, '.scp-number', 'text'), '98', 'final number under reduced motion');
    h.ok(Math.abs(parseFloat(await read(rm, '.scp-ring__fill', 'strokeDashoffset')) - 5.78) < 0.1, 'ring final under reduced motion');
  },
  async after(browser, h) {
    const sf = await L.mount(browser, NAME, {width: 1366, height: 400, editing: false, assets: []});
    await sf.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '2000px'; document.body.prepend(s); });
    await sf.page.addScriptTag({content: require('fs').readFileSync(require('path').join(__dirname, '../shopify/assets/' + L.ASSET), 'utf8')}); await sf.page.waitForTimeout(200);
    h.eq(await read(sf, '.scp-section', '@data-fd-reveal'), 'pending', 'pending below the fold');
    h.eq(await read(sf, '.scp-number', 'opacity'), '0', 'number hidden until in view');
    h.ok(Math.abs(parseFloat(await read(sf, '.scp-ring__fill', 'strokeDashoffset')) - 289.03) < 0.1, 'ring empty until in view');
    await sf.page.evaluate(() => document.getElementById('shopify-section-test').scrollIntoView());
    await sf.page.waitForTimeout(300);
    h.ok(+(await read(sf, '.scp-number', 'text')) < 98, 'number counts up');
    await L.settled(sf.page); await sf.page.waitForTimeout(1900);
    h.eq(await read(sf, '.scp-number', 'text'), '98', 'counted to the final value');
    h.ok(Math.abs(parseFloat(await read(sf, '.scp-ring__fill', 'strokeDashoffset')) - 5.78) < 0.1, 'ring filled to 98 / 100');
    await sf.emit({ring_thickness: 8});
    h.ok(await sf.page.evaluate(() => window.MateriaFeaturesD.state(document.querySelector('#shopify-section-test [data-fd]')).counting.size === 0 && document.querySelector('#shopify-section-test .scp-ring__fill').getAnimations().length === 0), 'live edit does not replay');
    await sf.page.close();
  },
}).catch(e => { console.error(e); process.exit(1); });
