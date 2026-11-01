/* Steps: theme inheritance (colours, fonts, theme buttons), custom colours, fonts and button shape
   under the theme priority rules, every control (live and after a redraw), marker styles, container
   width layout, two instances, added blocks and redraws. Run: node tests/theme-features-d-steps.cjs */
const L = require('./theme-features-d-lib.cjs');
const {assert, DESK, read, hoverBg} = L;
const NAME = 'steps';
const C = {pre: {enable_custom_style: true}};
const BC = {preBlock: true, pre: {enable_custom_style: true}};
const G = {pre: {use_theme_button: false}};
const D = (d, m) => w => DESK(w) ? d : m;
const IMG = {src: 'https://cdn.test/icon.png', alt: '', width: 80, height: 80};
/* A theme button drawn next to the section: what Theme settings > Buttons give every button. */
const themeButton = (t, prop) => t.page.evaluate(prop => { const a = document.createElement('a'); a.href = '#'; a.setAttribute('data-theme-button', 'primary'); a.setAttribute('data-sl-button', ''); a.textContent = 'x'; document.querySelector('#shopify-section-test .stp__inner').append(a); const v = getComputedStyle(a)[prop]; a.remove(); return v; }, prop);

const TABLE = [
  {id: 'color_scheme', v: 'alt-scheme', sel: '.stp', css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'stretch_width', sel: '.stp__inner', css: 'maxWidth', exp: 'none'},
  {id: 'reset_spacing', v: false, sel: '[data-fd]', css: '.className', exp: /^(?!.*remove_spacing)/},
  {id: 'text_align', v: 'left', sel: '.stp__head', css: 'alignItems', exp: 'flex-start'},
  {id: 'head_gap', v: 12, sel: '.stp__head', css: 'marginBottom', exp: '12px'},
  {id: 'steps_max_width', v: 300, sel: '.stp__steps', css: 'maxWidth', exp: '300px'},
  {id: 'step_style', v: 'dot', sel: '.stp__step-marker', css: 'width', exp: '18px'},
  {id: 'line_style', v: 'dashed', check: async t => assert.equal(await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .stp__step'), '::before').borderLeftStyle), 'dashed')},
  {id: 'step_gap_inline', v: 30, sel: '.stp__step', css: 'columnGap', exp: '30px'},
  {id: 'step_gap_below', v: 40, sel: '.stp__step', css: 'paddingBottom', exp: '40px'},
  {id: 'button_margin_top', v: 33, sel: '.stp__buttons', css: 'marginTop', exp: '33px'},
  {id: 'marker_size', v: 50, sel: '.stp__step-marker', css: 'width', exp: '50px'},
  {id: 'marker_font_size', v: 20, sel: '.stp__step-marker', css: 'fontSize', exp: '20px'},
  {id: 'line_thickness', v: 5, check: async t => assert.equal(await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .stp__step'), '::before').borderLeftWidth), '5px')},
  {id: 'step_title_size', v: 26, sel: '.stp__step-title', css: 'fontSize', exp: '26px'},
  {id: 'step_desc_size', v: 17, sel: '.stp__step-desc', css: 'fontSize', exp: '17px'},
  {id: 'section_bg', v: '#abcdef', ...C, sel: '.stp', css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'marker_color', v: '#ff00ff', ...C, sel: '.stp__step-marker', css: 'backgroundColor', exp: 'rgb(255, 0, 255)'},
  {id: 'marker_text_color', v: '#00ff00', ...C, sel: '.stp__step-marker', css: 'color', exp: 'rgb(0, 255, 0)'},
  {id: 'line_color', v: '#0000ff', ...C, check: async t => assert.equal(await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .stp__step'), '::before').borderLeftColor), 'rgb(0, 0, 255)')},
  {id: 'step_title_color', v: '#123123', ...C, sel: '.stp__step-title', css: 'color', exp: 'rgb(18, 49, 35)'},
  {id: 'step_desc_color', v: '#321321', ...C, sel: '.stp__step-desc', css: 'color', exp: 'rgb(50, 19, 33)'},
  {id: 'button_bg', v: '#aa0000', ...C, sel: '.stp__btn', css: 'backgroundColor', exp: 'rgb(170, 0, 0)'},
  {id: 'button_color', v: '#00aa00', ...C, sel: '.stp__btn', css: 'color', exp: 'rgb(0, 170, 0)'},
  {id: 'button_bg_hover', v: '#0000aa', ...C, check: async t => assert.equal(await hoverBg(t, '.stp__btn'), 'rgb(0, 0, 170)')},
  {id: 'use_theme_button', v: false, sel: '.stp__btn', css: 'borderTopLeftRadius', exp: '100px'},
  {id: 'button_size', v: 22, ...G, sel: '.stp__btn', css: 'fontSize', exp: '22px'},
  {id: 'button_pad_x', v: 40, ...G, sel: '.stp__btn', css: 'paddingLeft', exp: '40px'},
  {id: 'button_pad_y', v: 20, ...G, sel: '.stp__btn', css: 'paddingTop', exp: '20px'},
  {id: 'button_radius', v: 3, ...G, sel: '.stp__btn', css: 'borderTopLeftRadius', exp: '3px'},
  {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.stp__step-title', css: 'fontFamily', exp: /Verdana/},
  {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.stp__step-desc p', css: 'fontFamily', exp: /Tahoma/},
  {id: 'padding_top', v: 70, sel: '.stp', css: 'paddingTop', exp: '70px'},
  {id: 'padding_bottom', v: 72, sel: '.stp', css: 'paddingBottom', exp: '72px'},
  {id: 'side_padding_desktop', v: 50, sel: '.stp__inner', css: 'paddingLeft', exp: D('50px', '16px')},
  {id: 'side_padding_mobile', v: 11, sel: '.stp__inner', css: 'paddingLeft', exp: D('24px', '11px')},
  /* blocks */
  {block: 'eyebrow', id: 'text', v: 'Simple', sel: '.stp__eyebrow', css: 'text', exp: 'Simple'},
  {block: 'eyebrow', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#cc0033'}, sel: '.stp__eyebrow', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'eyebrow', id: 'color', v: '#cc0033', ...BC, sel: '.stp__eyebrow', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'eyebrow', id: 'size', v: 18, sel: '.stp__eyebrow', css: 'fontSize', exp: '18px'},
  {block: 'heading', id: 'text', v: 'How <em>it</em> works', sel: '.stp__heading em', css: 'text', exp: 'it'},
  {block: 'heading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#00cc00'}, sel: '.stp__heading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'heading', id: 'color', v: '#00cc00', ...BC, sel: '.stp__heading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'heading', id: 'size_enable', v: true, sel: '.stp__heading', css: 'fontSize', exp: D('40px', '28px')},
  {block: 'heading', id: 'size_desktop', v: 60, preBlock: true, pre: {size_enable: true}, sel: '.stp__heading', css: 'fontSize', exp: D('60px', '28px')},
  {block: 'heading', id: 'size_mobile', v: 22, preBlock: true, pre: {size_enable: true}, sel: '.stp__heading', css: 'fontSize', exp: D('40px', '22px')},
  {block: 'subheading', id: 'text', v: '<p>Made <strong>daily</strong></p>', sel: '.stp__sub strong', css: 'text', exp: 'daily'},
  {block: 'subheading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#0000cc'}, sel: '.stp__sub', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'subheading', id: 'color', v: '#0000cc', ...BC, sel: '.stp__sub', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'subheading', id: 'size', v: 19, sel: '.stp__sub', css: 'fontSize', exp: '19px'},
  {block: 'subheading', id: 'max_width', v: 300, sel: '.stp__sub', css: 'maxWidth', exp: '300px'},
  {block: 'step', id: 'title', v: 'Order online', sel: '.stp__step-text', css: 'text', exp: 'Order online'},
  {block: 'step', id: 'description', v: '<p>Pick a <em>size</em></p>', sel: '.stp__step-desc em', css: 'text', exp: 'size'},
  {block: 'step', id: 'icon', v: IMG, sel: '.stp__step-marker img', css: '@src', exp: /icon\.png/},
  {block: 'step', id: 'enable_custom_style', v: true, preBlock: true, pre: {marker_color: '#ff8800'}, sel: '.stp__step-marker', css: 'backgroundColor', exp: 'rgb(255, 136, 0)'},
  {block: 'step', id: 'marker_color', v: '#ff8800', ...BC, sel: '.stp__step-marker', css: 'backgroundColor', exp: 'rgb(255, 136, 0)'},
  {block: 'step', id: 'title_color', v: '#118811', ...BC, sel: '.stp__step-title', css: 'color', exp: 'rgb(17, 136, 17)'},
  {block: 'step', id: 'description_color', v: '#881111', ...BC, sel: '.stp__step-desc', css: 'color', exp: 'rgb(136, 17, 17)'},
  {block: 'button', id: 'label', v: 'Start now', sel: '.stp__btn', css: 'text', exp: 'Start now'},
  {block: 'button', id: 'url', v: '/collections/all', sel: '.stp__btn', css: '@href', exp: '/collections/all'},
];
const FULL = [{type: 'eyebrow', settings: {text: 'How it works'}}, ...L.schemaOf(NAME).schema.presets[0].blocks, {type: 'button', settings: {label: 'Get started', url: '/products/x'}}];

L.suite({
  name: NAME, table: TABLE, extra: ['enable_custom_style', 'enable_custom_fonts'], full: FULL,
  mount: {blocks: FULL},
  snap: '#shopify-section-test :is(.stp, .stp__inner, .stp__head, .stp__heading, .stp__sub, .stp__steps, .stp__step, .stp__step-marker, .stp__step-title, .stp__step-desc, .stp__btn)',
  bgSel: '.stp',
  async inherit(t, h) {
    h.eq(await read(t, '.stp', 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background ' + h.tag);
    h.eq(await read(t, '.stp__heading', 'color'), 'rgb(255, 255, 255)', 'heading colour');
    h.match(await read(t, '.stp__heading', 'fontFamily'), /Georgia/, 'heading font');
    h.eq(await read(t, '.stp__heading', '.tagName'), 'H2', 'heading is h2');
    h.eq(await read(t, '.stp__step-title', '.tagName'), 'H3', 'step title is h3');
    h.match(await read(t, '.stp__step-title', 'fontFamily'), /Georgia/, 'step title heading font');
    h.match(await read(t, '.stp__step-desc p', 'fontFamily'), /Arial/, 'step text body font');
    h.eq(await read(t, '.stp__step-desc', 'color'), 'rgb(204, 204, 204)', 'step text colour');
    h.eq(await read(t, '.stp__step-marker', 'backgroundColor'), 'rgb(51, 102, 153)', 'marker follows primary');
    h.eq(await read(t, '.stp__btn', 'backgroundColor'), 'rgb(18, 52, 86)', 'button follows the theme');
    for (const p of ['borderTopLeftRadius', 'paddingLeft', 'fontSize', 'fontFamily']) h.eq(await read(t, '.stp__btn', p), await themeButton(t, p), 'button ' + p + ' follows Theme settings > Buttons');
    h.eq(await hoverBg(t, '.stp__btn'), 'rgb(255, 0, 0)', 'theme hover');
  },
  custom: {
    on: {section_bg: '#abcdef', marker_color: '#ff00ff', step_title_color: '#123123', button_bg: '#aa0000'},
    checks: [['.stp', 'backgroundColor', 'rgb(171, 205, 239)'], ['.stp__step-marker', 'backgroundColor', 'rgb(255, 0, 255)'], ['.stp__step-title', 'color', 'rgb(18, 49, 35)'], ['.stp__btn', 'backgroundColor', 'rgb(170, 0, 0)']],
    off: [['.stp', 'backgroundColor', 'rgb(24, 32, 40)'], ['.stp__step-marker', 'backgroundColor', 'rgb(51, 102, 153)'], ['.stp__step-title', 'color', 'rgb(255, 255, 255)'], ['.stp__btn', 'backgroundColor', 'rgb(18, 52, 86)']],
  },
  fonts: {
    on: {heading_font: {family: 'Verdana'}, body_font: {family: 'Tahoma'}},
    checks: [['.stp__heading', /Verdana/], ['.stp__step-title', /Verdana/], ['.stp__step-text', /Verdana/], ['.stp__step-desc p', /Tahoma/], ['.stp__eyebrow', /Tahoma/]],
    off: [['.stp__heading', /Georgia/], ['.stp__step-title', /Georgia/], ['.stp__step-desc p', /Arial/]],
  },
  extraBlock: {block: {type: 'step', settings: {title: 'Added step', description: '<p>Added</p>'}}, async check(t, h) {
    h.eq(await read(t, '.stp__step:last-child .stp__step-text', 'text'), 'Added step', 'added block renders');
    await t.emit({title: 'Edited step'}, t.rendered[0].section.blocks.filter(b => b.type === 'step').pop().id);
    h.eq(await read(t, '.stp__step:last-child .stp__step-text', 'text'), 'Edited step', 'added block live');
  }},
  async each(t, width, editing, h) {
    /* Marker styles look different from each other */
    const looks = {};
    for (const m of ['dot', 'dot_outline', 'numbered', 'numbered_outline', 'prefixed', 'icon']) {
      await t.emit({step_style: m});
      looks[m] = await t.page.evaluate(() => { const s = document.querySelector('#shopify-section-test .stp__step'), mk = s.querySelector('.stp__step-marker'), c = getComputedStyle(mk); return [c.width, c.backgroundColor, c.borderTopWidth, getComputedStyle(s.querySelector('.stp__step-num')).display, getComputedStyle(s.querySelector('.stp__step-prefix')).display].join(); });
    }
    h.eq(new Set(Object.values(looks)).size, 6, 'marker styles differ ' + JSON.stringify(looks));
    await t.emit({step_style: 'numbered'});
    const ls = {};
    for (const l of ['solid', 'dashed', 'dotted']) { await t.emit({line_style: l}); ls[l] = await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .stp__step'), '::before').borderLeftStyle); }
    h.eq(new Set(Object.values(ls)).size, 3, 'line styles differ');
    await t.emit({line_style: 'solid'});
    const xs = {};
    for (const al of ['left', 'center', 'right']) { await t.emit({text_align: al}); xs[al] = await t.page.evaluate(() => Math.round(document.querySelector('#shopify-section-test .stp__heading').getBoundingClientRect().x)); }
    h.eq(new Set(Object.values(xs)).size, 3, 'alignments differ');
    await t.emit({text_align: 'center'});
    const widths = {};
    for (const w of ['container', 'fluid_container', 'stretch_width', 'full_width']) { await t.emit({section_width: w}); widths[w] = await read(t, '.stp__inner', 'maxWidth'); }
    h.eq(new Set([widths.container, widths.fluid_container, widths.stretch_width]).size, 3, 'section widths differ ' + JSON.stringify(widths));
    await t.emit({section_width: 'full_width'});
    /* Button shape wins under the theme rules, then the theme comes back */
    await t.emit({use_theme_button: false, button_radius: 3, button_pad_x: 40, button_size: 22});
    h.ok(await L.own(t, '.stp__btn', 'data-own-shape'), 'own shape attribute');
    h.eq(await read(t, '.stp__btn', 'borderTopLeftRadius'), '3px', 'own radius wins'); h.eq(await read(t, '.stp__btn', 'fontSize'), '22px', 'own size wins');
    await t.emit({use_theme_button: true});
    h.ok(!(await L.own(t, '.stp__btn', 'data-own-shape')), 'own shape attribute gone');
    h.eq(await read(t, '.stp__btn', 'borderTopLeftRadius'), await themeButton(t, 'borderTopLeftRadius'), 'theme radius back');
    /* A button with no link is a button, with a link an anchor, live */
    await t.emit({url: ''}, t.blockId('button'));
    h.eq(await read(t, '.stp__btn', '.tagName'), 'BUTTON', 'no link: button');
    await t.emit({url: '/pages/about'}, t.blockId('button'));
    h.eq(await read(t, '.stp__btn', '.tagName'), 'A', 'link: anchor');
    h.eq(await read(t, '.stp__btn', '@href'), '/pages/about', 'link live');
    /* The phone layout follows the section's width */
    if (DESK(width)) { await t.page.evaluate(() => { document.getElementById('shopify-section-test').style.width = '500px'; }); await t.page.waitForTimeout(60); h.eq(await read(t, '.stp__inner', 'paddingLeft'), '16px', 'narrow column uses the mobile padding'); await t.page.evaluate(() => { document.getElementById('shopify-section-test').style.width = ''; }); }
    /* Images are not reloaded by unrelated edits */
    await t.redraw({blocks: FULL.map(b => b.type === 'step' ? {type: 'step', settings: {...b.settings, icon: IMG}} : b)});
    await t.page.evaluate(() => { window.__img = document.querySelector('#shopify-section-test .stp__step-marker img'); window.__src = window.__img.src; });
    for (const patch of [{marker_size: 40}, {step_title_size: 22}]) await t.emit(patch);
    h.ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .stp__step-marker img') === window.__img && window.__img.src === window.__src), 'icon kept ' + h.tag);
    /* Targets */
    h.eq(JSON.stringify((await L.smallTargets(t)).filter(x => x.h < 44)), '[]', 'buttons are at least 44px tall');
  },
  async two(two, h) {
    await two.emit({enable_custom_style: true, section_bg: '#abcdef', marker_size: 50}, undefined, 'a');
    await two.emit({title: 'Only A'}, two.blockId('step', 0, 'a'), 'a');
    h.eq(await read(two, '.stp', 'backgroundColor', 'a'), 'rgb(171, 205, 239)', 'a edited');
    h.eq(await read(two, '.stp', 'backgroundColor', 'b'), 'rgb(24, 32, 40)', 'b untouched');
    h.eq(await read(two, '.stp__step-marker', 'width', 'b'), '36px', 'b marker untouched');
    h.eq(await read(two, '.stp__step-text', 'text', 'b'), 'Choose your product', 'b step untouched');
  },
  async reduced(rm, h) {
    h.eq(await read(rm, '.stp__step-title', 'visible'), true, 'content visible under reduced motion');
  },
}).catch(e => { console.error(e); process.exit(1); });
