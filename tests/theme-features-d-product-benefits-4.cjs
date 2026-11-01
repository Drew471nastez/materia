/* Product Benefits 4: theme inheritance, the heading block (and the old heading settings when a
   section has none), custom colours, font and weight under the theme priority rules, button shape,
   every control (live and after a redraw), image animations, the phone slider, lines drawn in the
   editor and under reduced motion, looping motion paused off screen, two instances, added blocks.
   The saved home page instance is checked against HEAD by tests/theme-cleanup-sections-a.cjs.
   Run: node tests/theme-features-d-product-benefits-4.cjs */
const L = require('./theme-features-d-lib.cjs');
const {assert, DESK, read, hoverBg} = L;
const NAME = 'product-benefits-4';
const CSS = ['product-benefits-4.css', 'product-benefits-4.js'];
const C = {pre: {enable_custom_style: true}};
const BC = {preBlock: true, pre: {enable_custom_style: true}};
const D = (d, m) => w => DESK(w) ? d : m;
const IMG = {src: 'https://cdn.test/p.png', alt: 'Bottle', width: 800, height: 800};
const v = name => async (t, w, how, want) => t.page.evaluate(n => document.querySelector('#shopify-section-test [data-fd]').style.getPropertyValue(n).trim(), name);
const varIs = (name, want) => async t => assert.equal(await v(name)(t), want, name);
const themeButton = (t, prop) => t.page.evaluate(prop => { const a = document.createElement('a'); a.href = '#'; a.className = 'btn btn-primary'; a.setAttribute('data-theme-button', 'primary'); a.setAttribute('data-sl-button', ''); a.textContent = 'x'; document.querySelector('#shopify-section-test .pb4h__inner').append(a); const r = getComputedStyle(a)[prop]; a.remove(); return r; }, prop);

const TABLE = [
  {id: 'color_scheme', v: 'alt-scheme', sel: '.pb4h', css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'full_width', sel: '.pb4h__inner', css: 'maxWidth', exp: 'none'},
  {id: 'reset_spacing', v: false, live: false, check: async t => assert.equal(await t.page.evaluate(() => /\+\.shopify-section/.test(document.querySelector('#shopify-section-test style').textContent)), false)},
  {id: 'image_size_desktop', v: 300, sel: '.pb4h__product', css: 'maxWidth', exp: '300px'},
  {id: 'col_gap', v: 10, sel: '.pb4h__stage', css: 'columnGap', exp: w => w >= 992 ? '10px' : null /* the desktop stage only */},
  {id: 'tab_gap_desktop', v: 20, sel: '.pb4h__col', css: 'rowGap', exp: '20px'},
  {id: 'gap_thumb_to_title', v: 5, sel: '.pb4h__title', css: 'marginTop', exp: '5px'},
  {id: 'gap_header_to_grid', v: 9, sel: '.pb4h__header', css: 'marginBottom', exp: '9px'},
  {id: 'gap_grid_to_cta', v: 11, sel: '.pb4h__cta-wrap', css: 'marginTop', exp: '11px'},
  {id: 'product_image', v: IMG, sel: '.pb4h__product img', css: '@src', exp: /cdn\.test\/p\.png/},
  {id: 'product_image_animation', v: 'zoom', sel: '.pb4h__product img', css: 'animationName', exp: 'pb4hZoom'},
  {id: 'product_radius', v: 6, sel: '.pb4h__product', css: 'borderTopLeftRadius', exp: '6px'},
  {id: 'line_thickness', v: 4, sel: '.pb4h__line', css: 'strokeWidth', exp: '4px'},
  {id: 'dot_size', v: 20, sel: '.pb4h__dot', css: 'width', exp: '20px'},
  {id: 'thumb_size', v: 60, sel: '.pb4h__thumb', css: 'width', exp: '60px'},
  {id: 'thumb_radius', v: 3, sel: '.pb4h__thumb', css: 'borderTopLeftRadius', exp: '3px'},
  {id: 'thumb_shadow', v: false, sel: '.pb4h__thumb', css: 'boxShadow', exp: 'none'},
  {id: 'heading_size_desktop', v: 50, sel: '.pb4h__heading', css: 'fontSize', exp: D('50px', '32px')},
  {id: 'title_size', v: 22, sel: '.pb4h__title', css: 'fontSize', exp: '22px'},
  {id: 'desc_size', v: 17, sel: '.pb4h__desc', css: 'fontSize', exp: '17px'},
  {id: 'section_bg', v: '#abcdef', ...C, sel: '.pb4h', css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'heading_color', v: '#111111', ...C, sel: '.pb4h__heading', css: 'color', exp: 'rgb(17, 17, 17)'},
  {id: 'heading_accent_color', v: '#ff00ff', ...C, sel: '.pb4h__heading span', css: 'color', exp: 'rgb(255, 0, 255)'},
  {id: 'line_color', v: '#00ff00', ...C, sel: '.pb4h__line', css: 'stroke', exp: 'rgb(0, 255, 0)'},
  {id: 'product_bg', v: '#0000ff', ...C, sel: '.pb4h__product', css: 'backgroundColor', exp: 'rgb(0, 0, 255)'},
  {id: 'thumb_bg', v: '#123123', ...C, sel: '.pb4h__thumb', css: 'backgroundColor', exp: 'rgb(18, 49, 35)'},
  {id: 'mobile_card_bg', v: '#321321', ...C, sel: '.pb4h__slide', css: 'backgroundColor', exp: 'rgb(50, 19, 33)'},
  {id: 'heading_custom_font_enable', v: true, pre: {heading_font: {family: 'Verdana'}}, sel: '.pb4h__heading', css: 'fontFamily', exp: /Verdana/},
  {id: 'heading_font', v: {family: 'Verdana'}, pre: {heading_custom_font_enable: true}, sel: '.pb4h__heading span', css: 'fontFamily', exp: /Verdana/},
  {id: 'heading_font_weight', v: '300', pre: {heading_custom_font_enable: true}, sel: '.pb4h__heading', css: 'fontWeight', exp: '300'},
  {id: 'reveal', v: false, sel: '[data-fd]', css: '@data-ti-no-reveal', exp: ''},
  {id: 'padding_top_desktop', v: 70, sel: '.pb4h', css: 'paddingTop', exp: D('70px', '56px')},
  {id: 'padding_bottom_desktop', v: 72, sel: '.pb4h', css: 'paddingBottom', exp: D('72px', '56px')},
  {id: 'section_margin_top_desktop', v: 20, sel: ':wrapper', css: 'marginTop', exp: D('20px', '0px')},
  {id: 'section_margin_bottom_desktop', v: 22, sel: ':wrapper', css: 'marginBottom', exp: D('22px', '0px')},
  {id: 'heading_size_mobile', v: 20, sel: '.pb4h__heading', css: 'fontSize', exp: D('40px', '20px')},
  {id: 'mobile_line_reach', v: 50, check: varIs('--pb4h-reach', '50%')},
  {id: 'mobile_card_radius', v: 5, sel: '.pb4h__slide', css: 'borderTopLeftRadius', exp: '5px'},
  {id: 'padding_top_mobile', v: 30, sel: '.pb4h', css: 'paddingTop', exp: D('88px', '30px')},
  {id: 'padding_bottom_mobile', v: 31, sel: '.pb4h', css: 'paddingBottom', exp: D('88px', '31px')},
  {id: 'section_margin_top_mobile', v: 9, sel: ':wrapper', css: 'marginTop', exp: D('0px', '9px')},
  {id: 'section_margin_bottom_mobile', v: 8, sel: ':wrapper', css: 'marginBottom', exp: D('0px', '8px')},
  /* blocks */
  {block: 'heading', id: 'text', v: 'Why people pick it', sel: '.pb4h__heading', css: 'text', exp: 'Why people pick it'},
  {block: 'heading', id: 'accent', v: 'pick', pre: {text: 'Why people pick it'}, preBlock: true, sel: '.pb4h__heading span', css: 'text', exp: 'pick'},
  {block: 'heading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#cc0033'}, sel: '.pb4h__heading', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'heading', id: 'color', v: '#cc0033', ...BC, sel: '.pb4h__heading', css: 'color', exp: 'rgb(204, 0, 51)'},
  {block: 'heading', id: 'accent_color', v: '#00aa00', ...BC, sel: '.pb4h__heading span', css: 'color', exp: 'rgb(0, 170, 0)'},
  {block: 'spot', id: 'thumb', v: IMG, sel: '.pb4h__thumb img', css: '@src', exp: /cdn\.test\/p\.png/},
  {block: 'spot', id: 'title', v: 'Light', sel: '.pb4h__title', css: 'text', exp: 'Light'},
  {block: 'spot', id: 'description', v: 'Weighs less', sel: '.pb4h__slide-desc', css: 'text', exp: 'Weighs less'},
  {block: 'spot', id: 'enable_custom_style', v: true, preBlock: true, pre: {title_color: '#ff8800'}, sel: '.pb4h__slide-title', css: 'color', exp: 'rgb(255, 136, 0)'},
  {block: 'spot', id: 'title_color', v: '#ff8800', ...BC, sel: '.pb4h__title', css: 'color', exp: 'rgb(255, 136, 0)'},
  {block: 'spot', id: 'desc_color', v: '#118811', ...BC, sel: '.pb4h__desc', css: 'color', exp: 'rgb(17, 136, 17)'},
  {block: 'button', id: 'cta_label', v: 'Buy it', sel: '.pb4h__cta', css: 'text', exp: 'Buy it'},
  {block: 'button', id: 'cta_link', v: '/products/x', sel: '.pb4h__cta', css: '@href', exp: '/products/x'},
  {block: 'button', id: 'enable_custom_style', v: true, preBlock: true, pre: {cta_bg: '#aa0000'}, sel: '.pb4h__cta', css: 'backgroundColor', exp: 'rgb(170, 0, 0)'},
  {block: 'button', id: 'cta_bg', v: '#aa0000', ...BC, sel: '.pb4h__cta', css: 'backgroundColor', exp: 'rgb(170, 0, 0)'},
  {block: 'button', id: 'cta_bg_hover', v: '#0000aa', ...BC, check: async t => assert.equal(await hoverBg(t, '.pb4h__cta'), 'rgb(0, 0, 170)')},
  {block: 'button', id: 'cta_text', v: '#00aa00', ...BC, sel: '.pb4h__cta', css: 'color', exp: 'rgb(0, 170, 0)'},
  {block: 'button', id: 'use_theme_button', v: false, sel: '.pb4h__cta', css: 'borderTopLeftRadius', exp: '4px'},
  {block: 'button', id: 'cta_size', v: 22, preBlock: true, pre: {use_theme_button: false}, sel: '.pb4h__cta', css: 'fontSize', exp: '22px'},
  {block: 'button', id: 'cta_pad_x', v: 40, preBlock: true, pre: {use_theme_button: false}, sel: '.pb4h__cta', css: 'paddingLeft', exp: '40px'},
  {block: 'button', id: 'cta_pad_y', v: 20, preBlock: true, pre: {use_theme_button: false}, sel: '.pb4h__cta', css: 'paddingTop', exp: '20px'},
  {block: 'button', id: 'cta_radius', v: 9, preBlock: true, pre: {use_theme_button: false}, sel: '.pb4h__cta', css: 'borderTopLeftRadius', exp: '9px'},
];

L.suite({
  name: NAME, table: TABLE, css: CSS, extra: ['enable_custom_style'],
  snap: '#shopify-section-test :is(.pb4h, .pb4h__inner, .pb4h__header, .pb4h__heading, .pb4h__stage, .pb4h__col, .pb4h__tab, .pb4h__thumb, .pb4h__title, .pb4h__desc, .pb4h__product, .pb4h__mobile, .pb4h__slide, .pb4h__cta)',
  bgSel: '.pb4h',
  async inherit(t, h) {
    h.eq(await read(t, '.pb4h', 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background ' + h.tag);
    h.eq(await read(t, '.pb4h__heading', 'color'), 'rgb(255, 255, 255)', 'heading colour');
    h.match(await read(t, '.pb4h__heading', 'fontFamily'), /Georgia/, 'heading font');
    h.eq(await read(t, '.pb4h__heading', '.tagName'), 'H2', 'heading is h2');
    h.eq(await read(t, '.pb4h__heading span', 'color'), 'rgb(51, 102, 153)', 'accent follows primary');
    h.eq(await read(t, '.pb4h__line', 'stroke'), 'rgb(51, 102, 153)', 'lines follow primary');
    h.match(await read(t, '.pb4h__title', 'fontFamily'), /Georgia/, 'feature title heading font');
    h.match(await read(t, '.pb4h__desc', 'fontFamily'), /Arial/, 'feature text body font');
    h.eq(await read(t, '.pb4h__desc', 'color'), 'rgb(204, 204, 204)', 'feature text colour');
    h.eq(await read(t, '.pb4h__cta', 'backgroundColor'), 'rgb(18, 52, 86)', 'button follows the theme');
    for (const p of ['borderTopLeftRadius', 'paddingLeft', 'fontSize']) h.eq(await read(t, '.pb4h__cta', p), await themeButton(t, p), 'button ' + p + ' follows Theme settings > Buttons');
    if (DESK(h.width)) h.eq(await hoverBg(t, '.pb4h__cta'), 'rgb(255, 0, 0)', 'theme hover');
  },
  custom: {
    on: {section_bg: '#abcdef', line_color: '#00ff00', thumb_bg: '#123123', heading_color: '#111111'},
    checks: [['.pb4h', 'backgroundColor', 'rgb(171, 205, 239)'], ['.pb4h__line', 'stroke', 'rgb(0, 255, 0)'], ['.pb4h__thumb', 'backgroundColor', 'rgb(18, 49, 35)'], ['.pb4h__heading', 'color', 'rgb(17, 17, 17)']],
    off: [['.pb4h', 'backgroundColor', 'rgb(24, 32, 40)'], ['.pb4h__line', 'stroke', 'rgb(51, 102, 153)'], ['.pb4h__heading', 'color', 'rgb(255, 255, 255)']],
  },
  fonts: {
    key: 'heading_custom_font_enable', on: {heading_font: {family: 'Verdana'}, heading_font_weight: '300'},
    checks: [['.pb4h__heading', /Verdana/], ['.pb4h__heading span', /Verdana/]],
    off: [['.pb4h__heading', /Georgia/], ['.pb4h__heading span', /Georgia/]],
  },
  extraBlock: {block: {type: 'spot', settings: {title: 'Added', description: 'Added text'}}, async check(t, h) {
    h.eq(await read(t, '.pb4h__slide:last-child .pb4h__slide-title', 'text'), 'Added', 'added block renders');
    await t.emit({title: 'Edited'}, t.rendered[0].section.blocks.filter(b => b.type === 'spot').pop().id);
    h.eq(await read(t, '.pb4h__slide:last-child .pb4h__slide-title', 'text'), 'Edited', 'added block live');
  }},
  async each(t, width, editing, h) {
    /* Custom font and weight on and off under the theme rules (this section's toggle is heading_custom_font_enable) */
    for (const how of ['live', 'redraw']) {
      const on = {heading_custom_font_enable: true, heading_font: {family: 'Verdana'}, heading_font_weight: '300'};
      if (how === 'live') await t.emit(on); else await t.redraw({settings: on});
      h.match(await read(t, '.pb4h__heading span', 'fontFamily'), /Verdana/, 'own font inside the heading ' + how);
      h.eq(await read(t, '.pb4h__heading', 'fontWeight'), '300', 'own weight ' + how);
      h.ok(await L.own(t, '.pb4h__heading', 'data-own-font') && await L.own(t, '.pb4h__heading', 'data-own-weight'), 'opt-out attributes ' + how);
      if (how === 'live') await t.emit({heading_custom_font_enable: false}); else await t.redraw({settings: {heading_custom_font_enable: false}});
      h.match(await read(t, '.pb4h__heading', 'fontFamily'), /Georgia/, 'theme font back ' + how);
      h.eq(await read(t, '.pb4h__heading', 'fontWeight'), '700', 'theme weight back ' + how);
      h.ok(!(await L.own(t, '.pb4h__heading', 'data-own-weight')), 'weight attribute gone ' + how);
    }
    /* Image animations differ from each other */
    const anims = {};
    for (const a of ['none', 'float_up', 'float_right', 'float_diagonal', 'push', 'zoom', 'buzz', 'sway']) { await t.emit({product_image_animation: a}); anims[a] = await read(t, '.pb4h__product img', 'animationName'); }
    h.eq(new Set(Object.values(anims)).size, 8, 'image animations differ ' + JSON.stringify(anims));
    /* Looping motion rests off screen */
    await t.emit({product_image_animation: 'zoom'});
    h.eq(await read(t, '[data-fd]', '@data-fd-offscreen'), null, 'on screen: running');
    await t.page.evaluate(() => { const s = document.createElement('div'); s.id = 'fd-spacer'; s.style.height = '4000px'; document.body.append(s); window.scrollTo(0, 3500); });
    await t.page.waitForTimeout(250);
    h.eq(await read(t, '[data-fd]', '@data-fd-offscreen'), '', 'off screen: marked');
    h.eq(await read(t, '.pb4h__product img', 'animationPlayState'), 'paused', 'off screen: image animation paused');
    await t.page.evaluate(() => { document.getElementById('fd-spacer').remove(); window.scrollTo(0, 0); }); await t.page.waitForTimeout(250);
    h.eq(await read(t, '.pb4h__product img', 'animationPlayState'), 'running', 'back on screen: running');
    await t.emit({product_image_animation: 'none'});
    /* Section widths differ */
    const ws = {};
    for (const w of ['container', 'fluid_container', 'stretch_width', 'full_width']) { await t.emit({section_width: w}); ws[w] = await read(t, '.pb4h__inner', 'maxWidth') + await read(t, '.pb4h__inner', 'paddingLeft'); }
    h.ok(new Set(Object.values(ws)).size >= (width >= 992 ? 3 : 2), 'section widths differ ' + JSON.stringify(ws));
    await t.emit({section_width: 'container'});
    /* Lines are drawn in the editor at once */
    if (editing && width >= 992) h.eq(await read(t, '.pb4h__line', 'strokeDashoffset'), '0px', 'lines drawn in the editor');
    /* Phone slider arrows: 44px targets, move by one card */
    if (width < 992) {
      for (const sel of ['[data-pb4h-prev]', '[data-pb4h-next]']) h.eq(await read(t, sel, 'height'), '44px', 'arrow target ' + sel);
      await t.root('[data-pb4h-next]').click(); await t.page.waitForTimeout(700);
      h.ok(await read(t, '[data-pb4h-slider]', '.scrollLeft') > 0, 'next arrow moves the slider');
    }
    /* Old heading settings draw while the section has no heading block */
    await t.redraw({settings: {heading: 'Old heading here', heading_accent: 'here'}, blocks: L.schemaOf(NAME).schema.presets[0].blocks.filter(b => b.type !== 'heading')});
    h.eq(await read(t, '[data-fd-legacy="heading"]', 'text'), 'Old heading here', 'legacy heading');
    h.eq(await read(t, '.pb4h__heading span', 'text'), 'here', 'legacy accent word');
    await t.emit({heading: 'Old heading changed here'}); h.eq(await read(t, '.pb4h__heading', 'text'), 'Old heading changed here', 'legacy heading live');
    await t.redraw({blocks: L.schemaOf(NAME).schema.presets[0].blocks});
    h.eq(await read(t, '.pb4h__heading', 'text'), 'What sets it apart', 'the block replaces the old heading');
    /* Button shape wins under the theme rules */
    await t.emit({use_theme_button: false, cta_radius: 2, cta_size: 21}, t.blockId('button'));
    h.ok(await L.own(t, '.pb4h__cta', 'data-own-shape'), 'own shape attribute');
    h.eq(await read(t, '.pb4h__cta', 'fontSize'), '21px', 'own size wins'); h.eq(await read(t, '.pb4h__cta', 'fontWeight'), '700', 'own weight wins');
    await t.emit({use_theme_button: true}, t.blockId('button'));
    h.eq(await read(t, '.pb4h__cta', 'fontSize'), await themeButton(t, 'fontSize'), 'theme size back');
    /* Product image is not reloaded by unrelated edits */
    await t.redraw({settings: {product_image: IMG}});
    await t.page.evaluate(() => { window.__img = document.querySelector('#shopify-section-test .pb4h__product img'); window.__src = window.__img.src; });
    for (const patch of [{thumb_size: 70}, {col_gap: 30}]) await t.emit(patch);
    h.ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .pb4h__product img') === window.__img && window.__img.src === window.__src), 'image kept ' + h.tag);
    await t.redraw({settings: {product_image: ''}});
  },
  async two(two, h) {
    await two.emit({enable_custom_style: true, section_bg: '#abcdef', thumb_size: 50}, undefined, 'a');
    await two.emit({title: 'Only A'}, two.blockId('spot', 0, 'a'), 'a');
    h.eq(await read(two, '.pb4h', 'backgroundColor', 'a'), 'rgb(171, 205, 239)', 'a edited');
    h.eq(await read(two, '.pb4h', 'backgroundColor', 'b'), 'rgb(24, 32, 40)', 'b untouched');
    h.eq(await read(two, '.pb4h__thumb', 'width', 'b'), '80px', 'b thumb untouched');
    h.eq(await read(two, '.pb4h__slide-title', 'text', 'b'), 'Crafted with care', 'b title untouched');
  },
  async reduced(rm, h) {
    h.eq(await read(rm, '.pb4h__line', 'strokeDashoffset'), '0px', 'lines drawn under reduced motion');
    await rm.emit({product_image_animation: 'sway'});
    h.eq(await read(rm, '.pb4h__product img', 'animationName'), 'none', 'no image animation under reduced motion');
    h.eq(await read(rm, '.pb4h__slide-dot', 'animationName'), 'none', 'no pulsing dot under reduced motion');
  },
}).catch(e => { console.error(e); process.exit(1); });
