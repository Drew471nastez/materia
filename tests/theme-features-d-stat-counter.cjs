/* Stat Counter: theme inheritance, header blocks (and the old header settings when a section has
   none), custom colours, fonts, weight and size under the theme priority rules, every control (live
   and after a redraw), card styles, two instances, added blocks, the once-only count up on the
   storefront, final values in the editor and under reduced motion.
   Run: node tests/theme-features-d-stat-counter.cjs */
const L = require('./theme-features-d-lib.cjs');
const {assert, DESK, read} = L;
const NAME = 'stat-counter';
const C = {pre: {enable_custom_style: true}};
const BC = {preBlock: true, pre: {enable_custom_style: true}};
const D = (d, m) => w => DESK(w) ? d : m;
const cols = n => new RegExp('^(\\S+ ){' + (n - 1) + '}\\S+$');
const ICON = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';

const TABLE = [
  {id: 'color_scheme', v: 'alt-scheme', sel: '.stat-counter-section', css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'container', sel: '.stat-counter-section > div', css: '@class', exp: 'container'},
  {id: 'reset_spacing', v: false, sel: '.stat-counter-section', css: '.className', exp: /^(?!.*remove_spacing)/},
  {id: 'layout', v: 'cards', sel: '.stat-counter__item', css: 'borderTopLeftRadius', exp: '16px'},
  {id: 'header_alignment', v: 'left', sel: '.fd-header', css: 'alignItems', exp: 'flex-start'},
  {id: 'alignment', v: 'right', sel: '.stat-counter__item', css: 'textAlign', exp: 'right'},
  {id: 'columns', v: 3, sel: '.stat-counter', css: 'gridTemplateColumns', exp: w => cols(DESK(w) ? 3 : 2)},
  {id: 'column_gap', v: 10, sel: '.stat-counter', css: 'columnGap', exp: '10px'},
  {id: 'row_gap', v: 11, sel: '.stat-counter', css: 'rowGap', exp: '11px'},
  {id: 'custom_inner_padding', v: 12, sel: '.stat-counter__item', css: 'paddingLeft', exp: '18px'},
  {id: 'custom_max_width', v: 600, sel: '.stat-counter__body', css: 'maxWidth', exp: '600px'},
  {id: 'divider', v: false, check: async (t, w) => assert.equal(await t.page.evaluate(() => getComputedStyle(document.querySelectorAll('#shopify-section-test .stat-counter__item')[1], '::before').content), 'none')},
  {id: 'card_radius', v: 4, pre: {layout: 'outline'}, sel: '.stat-counter__item', css: 'borderTopLeftRadius', exp: '4px'},
  {id: 'value_size', v: 70, sel: '.stat-counter__value', css: 'fontSize', exp: D('70px', '49px')},
  {id: 'label_size', v: 18, sel: '.stat-counter__label', css: 'fontSize', exp: '18px'},
  {id: 'icon_size', v: 30, sel: '.stat-counter__icon', css: 'width', exp: '30px'},
  {id: 'custom_uppercase_label', v: true, sel: '.stat-counter__label', css: 'textTransform', exp: 'uppercase'},
  {id: 'custom_section_bg', v: '#abcdef', ...C, sel: '.stat-counter-section', css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'custom_text_color', v: '#111111', ...C, sel: '.fd-heading', css: 'color', exp: 'rgb(17, 17, 17)'},
  {id: 'accent_color', v: '#ff00ff', ...C, sel: '.stat-counter__value', css: 'color', exp: 'rgb(255, 0, 255)'},
  {id: 'custom_label_color', v: '#123123', ...C, sel: '.stat-counter__label', css: 'color', exp: 'rgb(18, 49, 35)'},
  {id: 'divider_color', v: '#ff0000', pre: {enable_custom_style: true, layout: 'outline'}, sel: '.stat-counter__item', css: 'borderTopColor', exp: 'rgb(255, 0, 0)'},
  {id: 'card_bg', v: '#00ff00', pre: {enable_custom_style: true, layout: 'cards'}, sel: '.stat-counter__item', css: 'backgroundColor', exp: 'rgb(0, 255, 0)'},
  {id: 'value_weight', v: '400', sel: '.stat-counter__value', css: 'fontWeight', exp: '400'},
  {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.fd-heading', css: 'fontFamily', exp: /Verdana/},
  {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.stat-counter__label', css: 'fontFamily', exp: /Tahoma/},
  {id: 'animate', v: false, live: false, sel: '.stat-counter-section', css: '@data-fd-reveal', exp: null},
  {id: 'duration', v: 900, live: false, redraw: false, check: async () => {} /* timed on the storefront in after() */},
  {id: 'reveal', v: false, sel: '.stat-counter-section', css: '@data-ti-no-reveal', exp: ''},
  {id: 'padding_top', v: 70, sel: '.stat-counter-section', css: 'paddingTop', exp: /px$/, check: async t => assert.equal(await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .stat-counter-section')).getPropertyValue('--section-pt').trim()), '70')},
  {id: 'padding_bottom', v: 72, check: async t => assert.equal(await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .stat-counter-section')).getPropertyValue('--section-pb').trim()), '72')},
  {id: 'section_margin_top_desktop', v: 20, sel: ':wrapper', css: 'marginTop', exp: D('20px', '0px')},
  {id: 'section_margin_bottom_desktop', v: 22, sel: ':wrapper', css: 'marginBottom', exp: D('22px', '0px')},
  {id: 'columns_mobile', v: 1, sel: '.stat-counter', css: 'gridTemplateColumns', exp: w => cols(DESK(w) ? 4 : 1)},
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
  {block: 'stat', id: 'value', v: '4.8', sel: '.stat-counter__number', css: 'text', exp: '4.8'},
  {block: 'stat', id: 'prefix', v: '$', sel: '.stat-counter__prefix', css: 'text', exp: '$'},
  {block: 'stat', id: 'suffix', v: 'k', sel: '.stat-counter__suffix', css: 'text', exp: 'k'},
  {block: 'stat', id: 'label', v: 'Orders', sel: '.stat-counter__label', css: 'text', exp: 'Orders'},
  {block: 'stat', id: 'decimals', v: 1, sel: '.stat-counter__number', css: '@data-decimals', exp: '1'},
  {block: 'stat', id: 'icon', v: ICON, sel: '.stat-counter__icon circle', css: '@r', exp: '4'},
];
const FULL = L.SAMPLE[NAME];

L.suite({
  name: NAME, table: TABLE, extra: ['enable_custom_style', 'enable_custom_fonts'], full: FULL,
  snap: '#shopify-section-test :is(.stat-counter-section, .fd-header, .fd-eyebrow, .fd-heading, .fd-sub, .stat-counter, .stat-counter__item, .stat-counter__value, .stat-counter__label)',
  bgSel: '.stat-counter-section',
  async inherit(t, h) {
    h.eq(await read(t, '.stat-counter-section', 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background ' + h.tag);
    h.eq(await read(t, '.fd-heading', 'color'), 'rgb(255, 255, 255)', 'heading colour');
    h.match(await read(t, '.fd-heading', 'fontFamily'), /Georgia/, 'heading font');
    h.eq(await read(t, '.fd-heading', '.tagName'), 'H2', 'heading is h2');
    h.eq(await read(t, '.fd-sub', 'color'), 'rgb(204, 204, 204)', 'subheading text colour');
    h.eq(await read(t, '.stat-counter__value', 'color'), 'rgb(255, 255, 255)', 'number follows heading colour');
    h.match(await read(t, '.stat-counter__label', 'fontFamily'), /Arial/, 'label body font');
    h.match(await read(t, '.fd-eyebrow', 'fontFamily'), /Arial/, 'eyebrow body font');
  },
  custom: {
    on: {custom_section_bg: '#abcdef', accent_color: '#ff00ff', custom_label_color: '#123123', custom_text_color: '#111111'},
    checks: [['.stat-counter-section', 'backgroundColor', 'rgb(171, 205, 239)'], ['.stat-counter__value', 'color', 'rgb(255, 0, 255)'], ['.stat-counter__label', 'color', 'rgb(18, 49, 35)'], ['.fd-heading', 'color', 'rgb(17, 17, 17)']],
    off: [['.stat-counter-section', 'backgroundColor', 'rgb(24, 32, 40)'], ['.stat-counter__value', 'color', 'rgb(255, 255, 255)'], ['.stat-counter__label', 'color', 'rgb(204, 204, 204)'], ['.fd-heading', 'color', 'rgb(255, 255, 255)']],
  },
  fonts: {
    on: {heading_font: {family: 'Verdana'}, body_font: {family: 'Tahoma'}},
    checks: [['.fd-heading', /Verdana/], ['.stat-counter__value', /Verdana/], ['.stat-counter__label', /Tahoma/], ['.fd-eyebrow', /Tahoma/], ['.fd-sub p', /Tahoma/]],
    off: [['.fd-heading', /Georgia/], ['.stat-counter__label', /Arial/], ['.fd-sub p', /Arial/]],
  },
  extraBlock: {block: {type: 'stat', settings: {value: '77', label: 'Added stat'}}, async check(t, h) {
    h.eq(await read(t, '.stat-counter__item:last-child .stat-counter__label', 'text'), 'Added stat', 'added block renders');
    await t.emit({value: '88'}, t.rendered[0].section.blocks.filter(b => b.type === 'stat').pop().id);
    h.eq(await read(t, '.stat-counter__item:last-child .stat-counter__number', 'text'), '88', 'added block live');
  }},
  async each(t, width, editing, h) {
    /* Stat styles look different (inline, cards, outline) */
    const looks = {};
    for (const l of ['inline', 'cards', 'outline']) { await t.emit({layout: l}); looks[l] = await t.page.evaluate(() => { const c = getComputedStyle(document.querySelector('#shopify-section-test .stat-counter__item')); return [c.backgroundColor, c.borderTopWidth, c.paddingTop].join(); }); }
    h.eq(new Set(Object.values(looks)).size, 3, 'stat styles differ ' + JSON.stringify(looks));
    await t.emit({layout: 'inline'});
    if (DESK(width)) { h.eq(await t.page.evaluate(() => getComputedStyle(document.querySelectorAll('#shopify-section-test .stat-counter__item')[1], '::before').backgroundColor), 'rgb(68, 85, 102)', 'divider follows border'); await t.emit({enable_custom_style: true, divider_color: '#ff0000'}); h.eq(await t.page.evaluate(() => getComputedStyle(document.querySelectorAll('#shopify-section-test .stat-counter__item')[1], '::before').backgroundColor), 'rgb(255, 0, 0)', 'divider colour'); await t.emit({enable_custom_style: false}); }
    const xs = {};
    for (const al of ['left', 'center', 'right']) { await t.emit({alignment: al}); xs[al] = await t.page.evaluate(() => Math.round(document.querySelector('#shopify-section-test .stat-counter__value').getBoundingClientRect().x)); }
    h.eq(new Set(Object.values(xs)).size, 3, 'stat alignments differ');
    await t.emit({alignment: 'center'});
    /* Heading weight and font win under the theme rules on the h2 and inside it, live */
    await t.emit({weight_enable: true, weight: '400', enable_custom_fonts: true, font: {family: 'Courier New'}, text: 'Big <strong>wins</strong>'}, t.blockId('heading'));
    h.eq(await read(t, '.fd-heading', 'fontWeight'), '400', 'own weight wins ' + h.tag);
    h.match(await read(t, '.fd-heading strong', 'fontFamily'), /Courier New/, 'own font wins inside the heading');
    h.ok(await L.own(t, '.fd-heading', 'data-own-weight') && await L.own(t, '.fd-heading', 'data-own-font'), 'opt-out attributes present');
    await t.emit({weight_enable: false, enable_custom_fonts: false}, t.blockId('heading'));
    h.eq(await read(t, '.fd-heading', 'fontWeight'), '700', 'theme weight back');
    h.match(await read(t, '.fd-heading', 'fontFamily'), /Georgia/, 'theme font back');
    h.ok(!(await L.own(t, '.fd-heading', 'data-own-weight')) && !(await L.own(t, '.fd-heading', 'data-own-font')), 'opt-out attributes gone');
    /* Old header settings draw only while a section has no header blocks */
    await t.redraw({settings: {subheading: 'Old eyebrow', heading: 'Old heading', description: '<p>Old text</p>'}, blocks: FULL.filter(b => b.type === 'stat')});
    h.eq(await read(t, '[data-fd-legacy="heading"]', 'text'), 'Old heading', 'legacy heading without blocks');
    h.eq(await read(t, '[data-fd-legacy="subheading"]', 'text'), 'Old eyebrow', 'legacy eyebrow without blocks');
    h.eq(await read(t, '[data-fd-legacy="description"]', 'text'), 'Old text', 'legacy text without blocks');
    await t.emit({heading: 'Old heading edited'}); h.eq(await read(t, '[data-fd-legacy="heading"]', 'text'), 'Old heading edited', 'legacy heading live');
    await t.redraw({blocks: FULL});
    h.eq(await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test [data-fd-legacy]').length), 0, 'blocks replace the old header settings');
    /* Edits do not count again */
    await L.settled(t.page);
    for (const patch of [{value_size: 50}, {label_size: 15}]) await t.emit(patch);
    h.eq(await t.page.evaluate(() => window.MateriaFeaturesD.state(document.querySelector('#shopify-section-test [data-fd]')).counting.size), 0, 'no count on edits ' + h.tag);
    h.eq(await read(t, '.stat-counter__number', 'text'), '12,000', 'final value kept');
  },
  async two(two, h) {
    await two.emit({enable_custom_style: true, custom_section_bg: '#abcdef', value_size: 30}, undefined, 'a');
    await two.emit({label: 'Only A'}, two.blockId('stat', 0, 'a'), 'a');
    h.eq(await read(two, '.stat-counter-section', 'backgroundColor', 'a'), 'rgb(171, 205, 239)', 'a edited');
    h.eq(await read(two, '.stat-counter-section', 'backgroundColor', 'b'), 'rgb(24, 32, 40)', 'b untouched');
    h.eq(await read(two, '.stat-counter__label', 'text', 'b'), 'Happy customers', 'b label untouched');
  },
  async reduced(rm, h) {
    h.eq(await read(rm, '.stat-counter__number', 'opacity'), '1', 'number shown under reduced motion');
    h.eq(await read(rm, '.stat-counter__number', 'text'), '12,000', 'final number under reduced motion');
  },
  async after(browser, h) {
    const sf = await L.mount(browser, NAME, {width: 1366, height: 400, editing: false, assets: []});
    await sf.page.evaluate(() => { const s = document.createElement('div'); s.style.height = '2000px'; document.body.prepend(s); });
    await sf.page.addScriptTag({content: require('fs').readFileSync(require('path').join(__dirname, '../shopify/assets/' + L.ASSET), 'utf8')}); await sf.page.waitForTimeout(200);
    h.eq(await read(sf, '.stat-counter-section', '@data-fd-reveal'), 'pending', 'pending below the fold');
    h.eq(await read(sf, '.stat-counter__number', 'opacity'), '0', 'number hidden until in view');
    const w0 = await sf.page.evaluate(() => document.querySelector('#shopify-section-test .stat-counter__number').getBoundingClientRect().width);
    await sf.page.evaluate(() => document.getElementById('shopify-section-test').scrollIntoView());
    await sf.page.waitForTimeout(300);
    const mid = await read(sf, '.stat-counter__number', 'text');
    h.ok(/^\d[\d,]*$/.test(mid) && +mid.replace(/,/g, '') < 12000, 'counts up with separators: ' + mid);
    h.ok(Math.abs(await sf.page.evaluate(() => document.querySelector('#shopify-section-test .stat-counter__number').getBoundingClientRect().width) - w0) < 1, 'number keeps its width while counting');
    await sf.emit({value: '15,000'}, sf.blockId('stat'));
    await L.settled(sf.page);
    h.eq(await read(sf, '.stat-counter__number', 'text'), '15,000', 'edit during the count lands on the new value');
    await sf.emit({label_size: 12});
    h.eq(await sf.page.evaluate(() => window.MateriaFeaturesD.state(document.querySelector('#shopify-section-test [data-fd]')).counting.size), 0, 'live edit does not count again');
    await sf.page.close();
    /* Count duration: a short duration finishes sooner than a long one */
    for (const [ms, max] of [[300, 900], [3000, null]]) {
      const d = await L.mount(browser, NAME, {width: 1366, editing: false, settings: {duration: ms}, assets: [L.ASSET]});
      const t0 = Date.now(); await d.page.waitForFunction(() => window.MateriaFeaturesD && window.MateriaFeaturesD.state(document.querySelector('#shopify-section-test [data-fd]')).counting.size === 0 && document.querySelector('#shopify-section-test [data-fd]').dataset.fdReveal === 'done', null, {timeout: 9000});
      const took = Date.now() - t0;
      if (max) h.ok(took < max, 'duration 300ms finishes quickly: ' + took); else h.ok(took > 2000, 'duration 3000ms takes longer: ' + took);
      await d.page.close();
    }
    /* A value that is not a plain number shows as typed */
    const odd = await L.mount(browser, NAME, {width: 375, editing: false, blocks: [{type: 'stat', settings: {value: '24/7', label: 'Support'}}], assets: [L.ASSET]});
    await odd.page.waitForTimeout(300);
    h.eq(await read(odd, '.stat-counter__number', 'text'), '24/7', 'text value shown as typed');
    await odd.page.close();
  },
}).catch(e => { console.error(e); process.exit(1); });
