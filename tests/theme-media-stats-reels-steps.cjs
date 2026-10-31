/* Image With Text Steps: theme inheritance, the saved home page instance, every control (live and
   after a redraw), desktop/mobile values, marker styles, two instances, added blocks, first paint,
   reduced motion. Run: node tests/theme-media-stats-reels-steps.cjs */
const L = require('./theme-media-stats-reels-lib.cjs');
const {assert, ASSET, WIDTHS, DESK, read, controls, coverage, snapshot, instrument, counts, hoverBg} = L;
const NAME = 'image-with-text-steps';
const C = {pre: {custom_colors: true}}, G = {pre: {use_theme_button: false}};
const own = (k = 'custom_style') => ({preBlock: true, pre: {[k]: true}});
const IMG = {src: 'https://cdn.test/a.png', alt: 'A', width: 800, height: 1000}, IMG2 = {src: 'https://cdn.test/b.png', width: 800, height: 1000};
const pseudo = (t, prop) => t.page.evaluate(p => getComputedStyle(document.querySelector('#shopify-section-test .iws__step'), '::before')[p], prop);
const ratio = async t => t.page.evaluate(() => { const q = s => document.querySelector('#shopify-section-test ' + s).getBoundingClientRect().width; return (q('.iws__media') + 32) / q('.iws__inner'); });
const ROOT = '[data-msr]';

const TABLE = [
  {id: 'color_scheme', v: 'alt-scheme', sel: ROOT, css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'fluid_container', sel: '.iws__inner', css: 'maxWidth', exp: '1500px'},
  {id: 'reset_spacing', v: false, check: async (t, w, how) => { assert.equal(await read(t, ROOT, '.className').then(c => /remove_spacing/.test(c)), false); if (how === 'redraw') assert.equal(await t.page.evaluate(() => /margin-top: 0/.test(document.querySelector('#shopify-section-test style[data-rs-bulletproof]').textContent)), false); }},
  {id: 'image_position', v: 'right', sel: '.iws__inner', css: 'flexDirection', exp: w => DESK(w) ? 'row-reverse' : 'column'},
  {id: 'column_valign', v: 'flex-start', sel: '.iws__inner', css: 'alignItems', exp: w => DESK(w) ? 'flex-start' : 'normal'},
  {id: 'image_width_pct', v: 40, check: async (t, w) => { const r = await ratio(t); assert.ok(DESK(w) ? Math.abs(r - 0.4) < 0.01 : r > 1, 'image column ' + r); }},
  {id: 'gap_desktop', v: 40, sel: '.iws__inner', css: 'rowGap', exp: w => DESK(w) ? '40px' : '32px'},
  {id: 'text_gap', v: 10, sel: '.iws__col', css: 'rowGap', exp: '10px'},
  {id: 'image', v: IMG, sel: '.iws__media img', css: '@src', exp: /a\.png/},
  {id: 'image_alt', v: 'Shaker on a bench', pre: {image: IMG}, sel: '.iws__media img', css: '@alt', exp: 'Shaker on a bench'},
  {id: 'placeholder_url', v: IMG2, sel: '.iws__media img', css: '@src', exp: /b\.png/},
  {id: 'image_aspect_desktop', v: '1 / 1', sel: '.iws__media', css: 'aspectRatio', exp: w => DESK(w) ? '1 / 1' : '4 / 5'},
  {id: 'image_radius', v: 5, sel: '.iws__media', css: 'borderTopLeftRadius', exp: '5px'},
  {id: 'step_style', v: 'numbered', sel: '.iws__step-num', css: 'visible', exp: true},
  {id: 'marker_size', v: 40, sel: '.iws__step', css: 'gridTemplateColumns', exp: /^40px /},
  {id: 'marker_font_size', v: 18, sel: '.iws__step-marker', css: 'fontSize', exp: '18px'},
  {id: 'line_style', v: 'dashed', check: async t => assert.equal(await pseudo(t, 'borderLeftStyle'), 'dashed')},
  {id: 'line_thickness', v: 4, check: async t => assert.equal(await pseudo(t, 'borderLeftWidth'), '4px')},
  {id: 'step_gap_inline', v: 30, sel: '.iws__step', css: 'columnGap', exp: '30px'},
  {id: 'step_gap_below', v: 10, sel: '.iws__step', css: 'paddingBottom', exp: '10px'},
  {id: 'steps_margin_top', v: 25, sel: '.iws__steps', css: 'marginTop', exp: '25px'},
  {id: 'custom_colors', v: true, pre: {section_bg: '#abcdef'}, sel: ROOT, css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'section_bg', v: '#abcdef', ...C, sel: ROOT, css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
  {id: 'marker_color', v: '#ff00ff', ...C, sel: '.iws__step-marker', css: 'backgroundColor', exp: 'rgb(255, 0, 255)'},
  {id: 'marker_text_color', v: '#00ff00', pre: {custom_colors: true, step_style: 'numbered'}, sel: '.iws__step-marker', css: 'color', exp: 'rgb(0, 255, 0)'},
  {id: 'line_color', v: '#0000ff', ...C, check: async t => assert.equal(await pseudo(t, 'borderLeftColor'), 'rgb(0, 0, 255)')},
  {id: 'step_title_color', v: '#111111', ...C, sel: '.iws__step-title', css: 'color', exp: 'rgb(17, 17, 17)'},
  {id: 'step_desc_color', v: '#222222', ...C, sel: '.iws__step-desc', css: 'color', exp: 'rgb(34, 34, 34)'},
  {id: 'image_bg', v: '#333333', ...C, sel: '.iws__media', css: 'backgroundColor', exp: 'rgb(51, 51, 51)'},
  {id: 'step_title_size', v: 24, ...C, sel: '.iws__step-title', css: 'fontSize', exp: '24px'},
  {id: 'step_desc_size', v: 17, ...C, sel: '.iws__step-desc', css: 'fontSize', exp: '17px'},
  {id: 'button_bg', v: '#00aa00', ...C, sel: '.iws__btn', css: 'backgroundColor', exp: 'rgb(0, 170, 0)'},
  {id: 'button_color', v: '#010203', ...C, sel: '.iws__btn', css: 'color', exp: 'rgb(1, 2, 3)'},
  {id: 'button_bg_hover', v: '#0000aa', ...C, check: async t => assert.equal(await hoverBg(t, '.iws__btn'), 'rgb(0, 0, 170)')},
  {id: 'use_theme_button', v: false, sel: '.iws__btn', css: 'borderTopLeftRadius', exp: '100px'},
  {id: 'button_size', v: 19, ...G, sel: '.iws__btn', css: 'fontSize', exp: '19px'},
  {id: 'button_pad_x', v: 40, ...G, sel: '.iws__btn', css: 'paddingLeft', exp: '40px'},
  {id: 'button_pad_y', v: 20, ...G, sel: '.iws__btn', css: 'paddingTop', exp: '20px'},
  {id: 'button_radius', v: 5, ...G, sel: '.iws__btn', css: 'borderTopLeftRadius', exp: '5px'},
  {id: 'button_margin_top', v: 30, sel: '.iws__btn', css: 'marginTop', exp: '30px'},
  {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.iws__heading', css: 'fontFamily', exp: /Verdana/},
  {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.iws__step-desc', css: 'fontFamily', exp: /Tahoma/},
  {id: 'padding_top', v: 70, sel: '.iws', css: 'paddingTop', exp: '70px'},
  {id: 'padding_bottom', v: 71, sel: '.iws', css: 'paddingBottom', exp: '71px'},
  {id: 'side_padding_desktop', v: 50, sel: '.iws', css: 'paddingLeft', exp: w => DESK(w) ? '50px' : '16px'},
  {id: 'image_aspect', v: '1 / 1', sel: '.iws__media', css: 'aspectRatio', exp: w => DESK(w) ? '4 / 5' : '1 / 1'},
  {id: 'gap_mobile', v: 12, sel: '.iws__inner', css: 'rowGap', exp: w => DESK(w) ? '64px' : '12px'},
  {id: 'side_padding_mobile', v: 10, sel: '.iws', css: 'paddingLeft', exp: w => DESK(w) ? '24px' : '10px'},
  {block: 'eyebrow', id: 'text', v: 'Why <em>Prime1</em>', sel: '.iws__eyebrow em', css: 'text', exp: 'Prime1'},
  {block: 'eyebrow', id: 'custom_style', v: true, preBlock: true, pre: {color: '#ff0000'}, sel: '.iws__eyebrow', css: 'color', exp: 'rgb(255, 0, 0)'},
  {block: 'eyebrow', id: 'color', v: '#ff0000', ...own(), sel: '.iws__eyebrow', css: 'color', exp: 'rgb(255, 0, 0)'},
  {block: 'eyebrow', id: 'size', v: 16, ...own(), sel: '.iws__eyebrow', css: 'fontSize', exp: '16px'},
  {block: 'heading', id: 'text', v: 'Your <strong>morning</strong>', sel: '.iws__heading strong', css: 'text', exp: 'morning'},
  {block: 'heading', id: 'custom_style', v: true, preBlock: true, pre: {color: '#00ff00'}, sel: '.iws__heading', css: 'color', exp: 'rgb(0, 255, 0)'},
  {block: 'heading', id: 'color', v: '#00ff00', ...own(), sel: '.iws__heading', css: 'color', exp: 'rgb(0, 255, 0)'},
  {block: 'heading', id: 'weight', v: '400', ...own(), sel: '.iws__heading', css: 'fontWeight', exp: '400'},
  {block: 'heading', id: 'size_desktop', v: 50, ...own(), sel: '.iws__heading', css: 'fontSize', exp: w => DESK(w) ? '50px' : '28px'},
  {block: 'heading', id: 'size_mobile', v: 20, ...own(), sel: '.iws__heading', css: 'fontSize', exp: w => DESK(w) ? '40px' : '20px'},
  {block: 'subheading', id: 'text', v: '<p>Four <em>steps</em></p>', sel: '.iws__sub em', css: 'text', exp: 'steps'},
  {block: 'subheading', id: 'max_width', v: 300, sel: '.iws__sub', css: 'maxWidth', exp: '300px'},
  {block: 'subheading', id: 'custom_style', v: true, preBlock: true, pre: {color: '#0000ff'}, sel: '.iws__sub', css: 'color', exp: 'rgb(0, 0, 255)'},
  {block: 'subheading', id: 'color', v: '#0000ff', ...own(), sel: '.iws__sub', css: 'color', exp: 'rgb(0, 0, 255)'},
  {block: 'subheading', id: 'size', v: 20, ...own(), sel: '.iws__sub', css: 'fontSize', exp: '20px'},
  {block: 'step', id: 'title', v: 'Mix <em>well</em>', sel: '.iws__step-text em', css: 'text', exp: 'well'},
  {block: 'step', id: 'description', v: '<p>Cold <strong>water</strong></p>', sel: '.iws__step-desc strong', css: 'text', exp: 'water'},
  {block: 'step', id: 'icon', v: IMG, check: async t => { assert.match(await read(t, '.iws__step-marker img', '@src'), /a\.png/); assert.match(await read(t, '.iws__step', '.className'), /iws__step--icon/); }},
  {block: 'step', id: 'enable_custom_style', v: true, preBlock: true, pre: {title_color: '#123456'}, sel: '.iws__step-title', css: 'color', exp: 'rgb(18, 52, 86)'},
  {block: 'step', id: 'title_color', v: '#123456', ...own('enable_custom_style'), sel: '.iws__step-title', css: 'color', exp: 'rgb(18, 52, 86)'},
  {block: 'step', id: 'description_color', v: '#654321', ...own('enable_custom_style'), sel: '.iws__step-desc', css: 'color', exp: 'rgb(101, 67, 33)'},
  {block: 'step', id: 'marker_color', v: '#abcabc', ...own('enable_custom_style'), sel: '.iws__step-marker', css: 'backgroundColor', exp: 'rgb(171, 202, 188)'},
  {block: 'button', id: 'label', v: 'Shop Prime1', sel: '.iws__btn', css: 'text', exp: 'Shop Prime1'},
  {block: 'button', id: 'url', v: '/products/prime1', sel: '.iws__btn', css: '@href', exp: '/products/prime1'},
];

(async () => {
  let checks = 0;
  const ok = (c, m) => { assert.ok(c, m); checks++; }, eq = (a, b, m) => { assert.equal(a, b, m); checks++; };
  eq(L.schemaProblems(NAME).length, 0, 'schema');
  coverage(NAME, TABLE, ['enable_custom_fonts']); checks++;
  const preset = L.schemaOf(NAME).schema.presets[0].blocks, full = [{type: 'eyebrow'}, ...preset];
  const home = require('../templates/home.json').sections.image_with_text_steps_Hz6cqV, saved = home.block_order.map(id => home.blocks[id]);
  const browser = await L.launch();
  try {
    for (const width of WIDTHS) for (const editing of [true, false]) {
      const tag = `@${width} ${editing ? 'editor' : 'storefront'}`;
      const SEL = '#shopify-section-test :is([data-msr], .iws, .iws__inner, .iws__media, .iws__col, .iws__heading, .iws__sub, .iws__step, .iws__step-marker, .iws__step-title, .iws__step-desc, .iws__btn)';
      const cold = await L.mount(browser, NAME, {width, editing, blocks: full, assets: []}), a = await snapshot(cold, SEL); await cold.page.close();
      const t = await L.mount(browser, NAME, {width, editing, blocks: full, assets: [ASSET]}); await t.page.waitForTimeout(150);
      assert.deepEqual(await snapshot(t, SEL), a, 'first paint equals hydrated paint ' + tag); checks++;
      await instrument(t.page);
      /* Theme inheritance and the theme button contract */
      eq(await read(t, ROOT, 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme bg ' + tag);
      eq(await read(t, '.iws__heading', 'color'), 'rgb(255, 255, 255)'); ok(/Georgia/.test(await read(t, '.iws__heading', 'fontFamily')));
      eq(await read(t, '.iws__heading', '.tagName'), 'H2');
      eq(await read(t, '.iws__step-desc', 'color'), 'rgb(204, 204, 204)'); ok(/Arial/.test(await read(t, '.iws__step-desc', 'fontFamily')));
      eq(await read(t, '.iws__step-marker', 'backgroundColor'), 'rgb(255, 255, 255)', 'marker follows heading colour');
      eq(await read(t, '.iws__btn', 'backgroundColor'), 'rgb(18, 52, 86)'); eq(await read(t, '.iws__btn', 'borderTopLeftRadius'), '12px');
      eq(await hoverBg(t, '.iws__btn'), 'rgb(255, 0, 0)', 'theme hover');
      ok(parseFloat(await read(t, '.iws__btn', 'height')) >= 44, '44px button');
      /* Scheme switch live and after redraw */
      await t.emit({color_scheme: 'alt-scheme'}); eq(await read(t, ROOT, 'backgroundColor'), 'rgb(250, 250, 250)'); eq(await read(t, '.iws__step-title', 'color'), 'rgb(16, 16, 16)');
      await t.redraw({settings: {color_scheme: 'alt-scheme'}}); eq(await read(t, ROOT, 'backgroundColor'), 'rgb(250, 250, 250)');
      await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      /* Custom styling off restores the theme exactly */
      await t.emit({custom_colors: true, marker_color: '#ff00ff', step_title_size: 25, button_bg: '#00aa00'});
      eq(await read(t, '.iws__step-marker', 'backgroundColor'), 'rgb(255, 0, 255)');
      await t.emit({custom_colors: false});
      eq(await read(t, '.iws__step-marker', 'backgroundColor'), 'rgb(255, 255, 255)'); eq(await read(t, '.iws__step-title', 'fontSize'), '18px'); eq(await read(t, '.iws__btn', 'backgroundColor'), 'rgb(18, 52, 86)');
      /* Unrelated edits keep the image element and its source */
      await t.redraw({settings: {image: IMG}});
      await t.page.evaluate(() => { window.__img = document.querySelector('#shopify-section-test .iws__media img'); window.__src = window.__img.src; });
      for (const p of [{padding_top: 40}, {marker_size: 30}, {image_radius: 2}, {text_gap: 12}]) await t.emit(p);
      ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .iws__media img') === window.__img && window.__img.src === window.__src), 'image kept');
      await t.redraw({settings: {image: null, padding_top: 60, marker_size: 32, image_radius: 16, text_gap: 18}});
      /* Every control */
      checks += await controls(t, width, TABLE);
      /* Marker styles are visibly different */
      const sig = async () => t.page.evaluate(() => { const st = document.querySelector('#shopify-section-test .iws__step'), m = st.querySelector('.iws__step-marker'), c = getComputedStyle(m), r = m.getBoundingClientRect(); return [Math.round(r.width), c.backgroundColor, c.borderTopWidth, c.display, getComputedStyle(st.querySelector('.iws__step-num')).display, getComputedStyle(st.querySelector('.iws__step-prefix')).display, getComputedStyle(st, '::before').display].join('|'); });
      const styles = {}; for (const v of ['dot', 'dot_outline', 'numbered', 'numbered_outline', 'prefixed', 'icon']) { await t.emit({step_style: v}); styles[v] = await sig(); }
      eq(new Set(Object.values(styles)).size, 5, 'marker styles differ ' + JSON.stringify(styles));
      eq(styles.icon, styles.numbered_outline, 'icon without an icon picture falls back to the outlined number');
      const lines = new Set(); for (const v of ['solid', 'dashed', 'dotted']) { await t.emit({step_style: 'dot', line_style: v}); lines.add(await pseudo(t, 'borderLeftStyle')); } eq(lines.size, 3, 'line styles differ');
      if (DESK(width)) { const ys = new Set(); for (const v of ['flex-start', 'center', 'stretch']) { await t.emit({column_valign: v, image_aspect_desktop: '16 / 9'}); ys.add(await t.page.evaluate(() => { const r = document.querySelector('#shopify-section-test .iws__media').getBoundingClientRect(); return Math.round(r.y) + ':' + Math.round(r.height); })); } eq(ys.size, 3, 'vertical alignments differ'); }
      /* Added block + redraw; no duplicate controllers */
      const before = await counts(t.page);
      await t.redraw({blocks: full.concat([{type: 'step', settings: {title: 'Added step'}}])});
      eq(await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test .iws__step').length), 4);
      await t.emit({title: 'Edited step'}, t.blockId('step', 3)); eq(await t.page.evaluate(() => document.querySelectorAll('#shopify-section-test .iws__step-text')[3].textContent), 'Edited step');
      for (let i = 0; i < 3; i++) await t.redraw({});
      eq((await counts(t.page)).roots, before.roots, 'one controller per root');
      eq(t.errors.length, 0, 'no errors ' + t.errors.join(' ')); ok(await t.noOverflow(), 'no overflow ' + tag);
      await t.page.close();
      /* Two instances */
      const two = await L.mount(browser, NAME, {width, editing, instances: [{uid: 'a'}, {uid: 'b'}], assets: [ASSET]});
      await two.emit({custom_colors: true, section_bg: '#abcdef', marker_size: 48}, undefined, 'a'); await two.emit({title: 'Only A'}, two.blockId('step', 0, 'a'), 'a');
      eq(await read(two, ROOT, 'backgroundColor', 'a'), 'rgb(171, 205, 239)'); eq(await read(two, ROOT, 'backgroundColor', 'b'), 'rgb(24, 32, 40)');
      ok(!/^48px/.test(await read(two, '.iws__step', 'gridTemplateColumns', 'b')), 'b marker untouched'); eq(await read(two, '.iws__step-text', 'text', 'b'), 'Made with care');
      await two.page.close();
      /* The saved home page instance (custom colours off): scheme colours, theme button, saved spacing */
      const sv = await L.mount(browser, NAME, {width, editing, settings: home.settings, blocks: saved, assets: [ASSET]});
      eq(await read(sv, '.iws__step-title', 'color'), 'rgb(255, 255, 255)', 'saved step colours stay off'); eq(await read(sv, '.iws__btn', 'borderTopLeftRadius'), '12px', 'saved button follows theme');
      eq(await read(sv, '.iws__heading', 'color'), 'rgb(255, 255, 255)'); eq(await read(sv, '.iws', 'paddingTop'), '62px'); eq(await read(sv, '.iws', 'paddingBottom'), '82px');
      eq(await read(sv, '.iws__btn', '@href'), '/products'); eq(await read(sv, '.iws__btn', 'text'), 'Shop Prime1');
      eq(await sv.page.evaluate(() => document.querySelectorAll('#shopify-section-test .iws__step').length), 4);
      await sv.page.close();
      /* Reduced motion: nothing hidden */
      const rm = await L.mount(browser, NAME, {width, editing, reducedMotion: 'reduce', assets: [ASSET]});
      ok(await read(rm, '.iws__step-title', 'visible'), 'visible under reduced motion'); eq(rm.errors.length, 0); await rm.page.close();
      process.stdout.write('.');
    }
  } finally { await browser.close(); }
  console.log(`\n${NAME}: ${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
