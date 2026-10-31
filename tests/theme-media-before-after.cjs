/* Before/After Images, Before and After Slider and Before/After Slider 2:
   schema, theme inheritance, every control (live and after a redraw),
   desktop/mobile values, variants, two instances, added blocks, the
   comparison slider (pointer, touch, keyboard, alignment, position kept
   through live edits and redraws), first paint = hydrated paint, reduced
   motion, overflow and errors, at 375 and 1366, editor and storefront.
   LIQUIDJS=<path to liquidjs> node tests/theme-media-before-after.cjs */
const assert = require('assert/strict');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');

const JS = ['media-live-before-after.js'];
const IMG = {src: 'https://theme.test/a.png', width: 800, height: 600, alt: 'Saved alt'};
const IMG2 = {src: 'https://theme.test/b.png', width: 800, height: 600};
const VERDANA = {family: 'Verdana', fallback_families: 'sans-serif'}, TAHOMA = {family: 'Tahoma', fallback_families: 'sans-serif'};
const SAME = Symbol('same');
const BG = 'rgb(24, 32, 40)', HEAD = 'rgb(255, 255, 255)', TEXT = 'rgb(204, 204, 204)', BORDER = 'rgb(68, 85, 102)';
const wait = (p, ms) => p.waitForTimeout(ms);
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const same = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++; };

/* Computed style of an element in the section (':wrap' is the section wrapper). */
const style = (sel, prop, pseudo) => async (t, uid = 'test') => t.page.evaluate(([sel, prop, pseudo, uid]) => {
  const w = document.getElementById('shopify-section-' + uid), el = sel === ':wrap' ? w : w.querySelector(sel);
  return el ? getComputedStyle(el, pseudo || null)[prop] : null;
}, [sel, prop, pseudo || null, uid]);
const attrOf = (sel, name) => t => t.page.evaluate(([sel, name]) => document.querySelector('#shopify-section-test ' + sel)?.getAttribute(name) ?? null, [sel, name]);
const textOf = sel => t => t.page.evaluate(sel => document.querySelector('#shopify-section-test ' + sel)?.innerHTML.trim() ?? null, sel);
const visible = sel => t => t.page.evaluate(sel => { const el = document.querySelector('#shopify-section-test ' + sel); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }, sel);
const rect = sel => t => t.page.evaluate(sel => { const r = document.querySelector('#shopify-section-test ' + sel).getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; }, sel);
const hovered = (sel, read) => async t => {
  await t.page.hover('#shopify-section-test ' + sel, {force: true}); await wait(t.page, 450);
  const v = await read(t); await t.page.mouse.move(1, 1); await wait(t.page, 450); return v;
};
const pos = t => t.page.evaluate(() => parseFloat(document.querySelector('#shopify-section-test [data-bam-compare]').style.getPropertyValue('--bam-pos')));
const resetSibling = t => t.page.evaluate(() => { let n = document.getElementById('bam-next'); if (!n) { n = document.createElement('div'); n.id = 'bam-next'; n.className = 'shopify-section'; n.style.cssText = 'margin-top:30px;height:10px'; document.getElementById('shopify-section-test').after(n); } return getComputedStyle(n).marginTop; });

/* want: a value, RegExp, predicate, SAME (unchanged), or {d, m} per width. */
function matches(want, got, base, width) {
  if (want && typeof want === 'object' && !(want instanceof RegExp) && ('d' in want || 'm' in want)) want = width >= want.bp ? want.d : want.m;
  if (want === SAME) return JSON.stringify(got) === JSON.stringify(base);
  if (want instanceof RegExp) return want.test(String(got));
  if (typeof want === 'function') return want(got, base, width);
  return JSON.stringify(got) === JSON.stringify(want);
}

const SECTIONS = {
  'before-and-after-image': {
    bp: 992,
    settle: 350,
    blocks: [{type: 'comparison'}, {type: 'comparison', settings: {before_text: 'Week one', after_text: 'Week six'}}],
    specs: [
      {id: 'color_scheme', v: 'alt-scheme', p: style('.bai', 'backgroundColor'), want: 'rgb(250, 250, 250)'},
      {id: 'section_width', v: 'container', p: style('.bai', 'maxWidth'), want: '1330px'},
      {id: 'reset_spacing', v: false, p: resetSibling, want: '30px'},
      {id: 'show_text', v: false, p: visible('.bai__label'), want: false},
      {id: 'content_max_width', v: 600, p: style('.bai__inner', 'maxWidth'), want: {d: '600px', m: SAME}},
      {id: 'desktop_horizontal_gap', v: 50, p: style('.bai__pair', 'columnGap'), want: {d: '50px', m: SAME}},
      {id: 'pair_gap', v: 64, p: style('.bai__pair + .bai__pair', 'marginTop'), want: '64px'},
      {id: 'before_image_width', v: 600, p: style('.bai__card', 'aspectRatio'), want: {d: '600 / 460', m: SAME}},
      {id: 'before_image_height', v: 300, p: style('.bai__card', 'aspectRatio'), want: {d: '570 / 300', m: SAME}},
      {id: 'border_radius', v: 21, p: style('.bai__card', 'borderTopLeftRadius'), want: '21px'},
      {id: 'image_shadow', v: 'high', p: style('.bai__card', 'boxShadow'), want: /rgba\(0, 0, 0, 0\.3\) 0px 6px 12px/},
      {id: 'overlay_strength', v: 0.8, p: style('.bai__card', 'backgroundImage', '::before'), want: /rgba\(0, 0, 0, 0\.8\)/},
      {id: 'hover_animation', v: 'scale_in', p: hovered('.bai__card--after', style('.bai__card--after', 'transform')), want: /matrix\(1\.05/},
      {id: 'enable_custom_style', v: true, with: {background_color: '#abcdef'}, p: style('.bai', 'backgroundColor'), want: 'rgb(171, 205, 239)'},
      {id: 'background_color', v: '#112233', with: {enable_custom_style: true}, p: style('.bai', 'backgroundColor'), want: 'rgb(17, 34, 51)'},
      {id: 'before_text_color', v: '#ff0000', with: {enable_custom_style: true}, p: style('.bai__card--before .bai__label', 'color'), want: 'rgb(255, 0, 0)'},
      {id: 'after_text_color', v: '#00ff00', with: {enable_custom_style: true}, p: style('.bai__card--after .bai__label', 'color'), want: 'rgb(0, 255, 0)'},
      {id: 'enable_custom_fonts', v: true, with: {body_font: VERDANA}, p: style('.bai__label', 'fontFamily'), want: /^Verdana/},
      {id: 'body_font', v: TAHOMA, with: {enable_custom_fonts: true}, p: style('.bai__label', 'fontFamily'), want: /^Tahoma/},
      {id: 'text_size', v: 60, p: style('.bai__label', 'fontSize'), want: {d: '60px', m: '40px'}},
      {id: 'desktop_text_vertical_position', v: 44, p: style('.bai__label', 'bottom'), want: {d: '44px', m: SAME}},
      {id: 'reveal', v: false, p: t => t.page.evaluate(() => !!document.querySelector('#shopify-section-test > [data-ti-no-reveal]')), want: true},
      {id: 'desktop_padding', v: 100, p: style('.bai', 'paddingTop'), want: {d: '100px', m: SAME}},
      {id: 'section_margin_top_desktop', v: 24, p: style(':wrap', 'marginTop'), want: {d: '24px', m: SAME}},
      {id: 'section_margin_bottom_desktop', v: 28, p: style(':wrap', 'marginBottom'), want: {d: '28px', m: SAME}},
      {id: 'mobile_vertical_gap', v: 30, p: style('.bai__pair', 'rowGap'), want: {d: SAME, m: '30px'}},
      {id: 'mobile_text_vertical_position', v: 12, p: style('.bai__label', 'bottom'), want: {d: SAME, m: '12px'}},
      {id: 'mobile_padding', v: 50, p: style('.bai', 'paddingTop'), want: {d: SAME, m: '50px'}},
      {id: 'section_margin_top_mobile', v: 16, p: style(':wrap', 'marginTop'), want: {d: SAME, m: '16px'}},
      {id: 'section_margin_bottom_mobile', v: 12, p: style(':wrap', 'marginBottom'), want: {d: SAME, m: '12px'}},
      {block: 'comparison', id: 'before_image', v: IMG, p: attrOf('.bai__card--before img', 'src'), want: /^https:\/\/theme\.test\/a\.png/},
      {block: 'comparison', id: 'before_text', v: 'Day 1', p: textOf('.bai__card--before .bai__label'), want: 'Day 1'},
      {block: 'comparison', id: 'bw_before_image', v: true, p: style('.bai__card--before img', 'filter'), want: 'grayscale(1)'},
      {block: 'comparison', id: 'after_image', v: IMG2, p: attrOf('.bai__card--after img', 'src'), want: /^https:\/\/theme\.test\/b\.png/},
      {block: 'comparison', id: 'after_text', v: 'Day 30', p: textOf('.bai__card--after .bai__label'), want: 'Day 30'},
    ],
    variants: [
      ['image_shadow', ['none', 'low', 'medium', 'high'], style('.bai__card', 'boxShadow')],
      ['hover_animation', ['none', 'fade_in', 'scale_in', 'zoom_in', 'shadow'], hovered('.bai__card--after', t => t.page.evaluate(() => { const c = document.querySelector('#shopify-section-test .bai__card--after'), s = getComputedStyle(c); return [s.opacity, s.transform, s.boxShadow, getComputedStyle(c.querySelector('img')).transform].join('|'); }))],
      ['section_width', ['container', 'fluid_container', 'full_width'], t => t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .bai')).maxWidth), 1366],
    ],
    images: ['.bai__card--before img', '.bai__card--after img'],
    unrelated: {desktop_padding: 90, mobile_padding: 40, border_radius: 9},
  },
  'before-and-after-slider': {
    bp: 900,
    specs: [
      {id: 'color_scheme', v: 'alt-scheme', p: style('.bas', 'backgroundColor'), want: 'rgb(250, 250, 250)'},
      {id: 'section_width', v: 'fluid_container', p: style('.bas', 'maxWidth'), want: '1530px'},
      {id: 'show_on_device', v: 'mobile', p: visible('.bas__container'), want: {d: false, m: true}},
      {id: 'reset_spacing', v: false, p: resetSibling, want: '30px'},
      {id: 'before_caption', v: 'Old', p: textOf('.bam-compare__label--before'), want: 'Old'},
      {id: 'after_caption', v: 'New', p: textOf('.bam-compare__label--after'), want: 'New'},
      {id: 'text_alignment', v: 'left', p: style('.bas__text', 'textAlign'), want: 'left'},
      {id: 'media_location', v: 'left', p: t => t.page.evaluate(() => { const m = document.querySelector('#shopify-section-test .bas__media').getBoundingClientRect(), x = document.querySelector('#shopify-section-test .bas__text').getBoundingClientRect(); return m.right <= x.left ? 'media-left' : x.bottom <= m.top ? 'text-above' : 'other'; }), want: {d: 'media-left', m: 'text-above'}},
      {id: 'horizontal_gap', v: 40, with: {media_location: 'right'}, p: style('.bas__grid', 'columnGap'), want: {d: '40px', m: SAME}},
      {id: 'container_max_width', v: 600, p: style('.bas__container', 'maxWidth'), want: '600px'},
      {id: 'element_spacing', v: 30, p: style('.bas__text', 'rowGap'), want: '30px'},
      {id: 'headline_spacing', v: 25, p: style('.bas__text', 'paddingBottom'), want: '25px'},
      {id: 'before_image', v: IMG, p: attrOf('.bam-compare__before img', 'src'), want: /^https:\/\/theme\.test\/a\.png/},
      {id: 'after_image', v: IMG2, p: attrOf('[data-bam-image="after_image"]', 'src'), want: /^https:\/\/theme\.test\/b\.png/},
      {id: 'media_aspect_ratio', v: '1 / 1', p: rect('.bam-compare'), want: r => Math.abs(r.w - r.h) <= 1},
      {id: 'media_radius', v: 14, p: style('.bam-compare', 'borderTopLeftRadius'), want: '14px'},
      {id: 'image_shadow', v: 'medium', p: style('.bam-compare', 'boxShadow'), want: /rgba\(0, 0, 0, 0\.5\) 4px 4px 10px/},
      {id: 'section_background_image', v: IMG2, p: style('.bas', 'backgroundImage'), want: /theme\.test\/b\.png/},
      {id: 'start_percent', v: 30, p: t => t.page.evaluate(() => { const b = document.querySelector('#shopify-section-test [data-bam-compare]'), h = b.querySelector('[data-bam-handle]'), r = b.getBoundingClientRect(), hr = h.getBoundingClientRect(); return [h.getAttribute('aria-valuenow'), Math.round(hr.left + hr.width / 2 - r.left - r.width * .3)]; }), want: ['30', 0]},
      {id: 'show_bar', v: false, p: style('.bam-compare__bar', 'display'), want: 'none'},
      {id: 'vertical_line_weight', v: 6, p: style('.bam-compare__bar', 'width'), want: '6px'},
      {id: 'bar_opacity', v: 40, p: style('.bam-compare__bar', 'opacity'), want: '0.4'},
      {id: 'show_circle', v: false, p: style('.bam-compare__knob', 'display'), want: 'none'},
      {id: 'circle_icon', v: 'icon3', p: attrOf('.bam-compare__knob', 'data-bam-icon-current'), want: 'icon3', editorOnly: true},
      {id: 'circle_opacity', v: 50, p: style('.bam-compare__knob', 'opacity'), want: '0.5'},
      {id: 'enable_custom_style', v: true, with: {section_background_color: '#abcdef'}, p: style('.bas', 'backgroundColor'), want: 'rgb(171, 205, 239)'},
      {id: 'section_background_color', v: '#112233', with: {enable_custom_style: true}, p: style('.bas', 'backgroundColor'), want: 'rgb(17, 34, 51)'},
      {id: 'headline_color', v: '#ff0000', with: {enable_custom_style: true}, p: style('.bas__heading', 'color'), want: 'rgb(255, 0, 0)'},
      {id: 'content_text_color', v: '#00ff00', with: {enable_custom_style: true}, p: style('.bas__content p', 'color'), want: 'rgb(0, 255, 0)'},
      {id: 'before_after_background_color', v: '#0000ff', with: {enable_custom_style: true}, p: style('.bam-compare__label--after', 'backgroundColor'), want: 'rgb(0, 0, 255)'},
      {id: 'before_after_text_color', v: '#ff00ff', with: {enable_custom_style: true}, p: style('.bam-compare__label--after', 'color'), want: 'rgb(255, 0, 255)'},
      {id: 'bar_color', v: '#00ffff', with: {enable_custom_style: true}, p: style('.bam-compare__bar', 'backgroundColor'), want: 'rgb(0, 255, 255)'},
      {id: 'circle_color', v: '#ffff00', with: {enable_custom_style: true}, p: style('.bam-compare__knob', 'backgroundColor'), want: 'rgb(255, 255, 0)'},
      {id: 'circle_icon_color', v: '#ff8800', with: {enable_custom_style: true}, p: style('.bam-compare__knob', 'color'), want: 'rgb(255, 136, 0)'},
      {id: 'enable_custom_fonts', v: true, with: {heading_font: VERDANA, body_font: TAHOMA}, p: t => Promise.all([style('.bas__heading', 'fontFamily')(t), style('.bas__content', 'fontFamily')(t)]), want: v => /^Verdana/.test(v[0]) && /^Tahoma/.test(v[1])},
      {id: 'heading_font', v: VERDANA, with: {enable_custom_fonts: true}, p: style('.bas__heading', 'fontFamily'), want: /^Verdana/},
      {id: 'body_font', v: TAHOMA, with: {enable_custom_fonts: true}, p: style('.bas__content', 'fontFamily'), want: /^Tahoma/},
      {id: 'headline_size', v: 50, p: style('.bas__heading', 'fontSize'), want: {d: '50px', m: SAME}},
      {id: 'headline_line_height', v: '1.6', p: t => Promise.all([style('.bas__heading', 'lineHeight')(t), style('.bas__heading', 'fontSize')(t)]), want: ([lh, fs]) => Math.abs(parseFloat(lh) - 1.6 * parseFloat(fs)) < 1},
      {id: 'text_size', v: 20, p: style('.bas__content p', 'fontSize'), want: '20px'},
      {id: 'text_line_height', v: '2.0', p: style('.bas__content p', 'lineHeight'), want: '34px'},
      {id: 'reveal', v: false, p: t => t.page.evaluate(() => !!document.querySelector('#shopify-section-test > [data-ti-no-reveal]')), want: true},
      {id: 'section_padding_top_bottom', v: 44, p: style('.bas', 'paddingTop'), want: {d: '44px', m: SAME}},
      {id: 'section_padding_left_right', v: 36, p: style('.bas', 'paddingLeft'), want: {d: '36px', m: SAME}},
      {id: 'container_padding_top_bottom', v: 22, p: style('.bas__container', 'paddingTop'), want: {d: '22px', m: SAME}},
      {id: 'container_padding_left_right', v: 18, p: style('.bas__container', 'paddingLeft'), want: {d: '18px', m: SAME}},
      {id: 'section_margin_top_desktop', v: 24, p: style(':wrap', 'marginTop'), want: {d: '24px', m: SAME}},
      {id: 'section_margin_bottom_desktop', v: 28, p: style(':wrap', 'marginBottom'), want: {d: '28px', m: SAME}},
      {id: 'mobile_headline_size', v: 26, p: style('.bas__heading', 'fontSize'), want: {d: SAME, m: '26px'}},
      {id: 'mobile_section_padding_top_bottom', v: 14, p: style('.bas', 'paddingTop'), want: {d: SAME, m: '14px'}},
      {id: 'mobile_section_padding_left_right', v: 12, p: style('.bas', 'paddingLeft'), want: {d: SAME, m: '12px'}},
      {id: 'mobile_container_padding_top_bottom', v: 6, p: style('.bas__container', 'paddingTop'), want: {d: SAME, m: '6px'}},
      {id: 'mobile_container_padding_left_right', v: 8, p: style('.bas__container', 'paddingLeft'), want: {d: SAME, m: '8px'}},
      {id: 'section_margin_top_mobile', v: 16, p: style(':wrap', 'marginTop'), want: {d: SAME, m: '16px'}},
      {id: 'section_margin_bottom_mobile', v: 12, p: style(':wrap', 'marginBottom'), want: {d: SAME, m: '12px'}},
      {block: 'heading', id: 'text', v: '<em>Edited</em> heading', p: textOf('.bas__heading'), want: '<em>Edited</em> heading'},
      {block: 'heading', id: 'enable_custom_style', v: true, with: {color: '#cc0033'}, p: style('.bas__heading', 'color'), want: 'rgb(204, 0, 51)'},
      {block: 'heading', id: 'color', v: '#00cc33', with: {enable_custom_style: true}, p: style('.bas__heading', 'color'), want: 'rgb(0, 204, 51)'},
      {block: 'heading', id: 'weight_enable', v: true, with: {weight: '400'}, p: style('.bas__heading', 'fontWeight'), want: '400'},
      {block: 'heading', id: 'weight', v: '500', with: {weight_enable: true}, p: style('.bas__heading', 'fontWeight'), want: '500'},
      {block: 'heading', id: 'size_enable', v: true, p: style('.bas__heading', 'fontSize'), want: {d: '36px', m: '30px'}},
      {block: 'heading', id: 'size_desktop', v: 56, with: {size_enable: true}, p: style('.bas__heading', 'fontSize'), want: {d: '56px', m: '30px'}},
      {block: 'heading', id: 'size_mobile', v: 26, with: {size_enable: true}, p: style('.bas__heading', 'fontSize'), want: {d: '36px', m: '26px'}},
      {block: 'heading', id: 'line_height', v: 1.5, with: {size_enable: true}, p: style('.bas__heading', 'lineHeight'), want: {d: '54px', m: '45px'}},
      {block: 'heading', id: 'tracking', v: 2, with: {size_enable: true}, p: style('.bas__heading', 'letterSpacing'), want: '2px'},
      {block: 'heading', id: 'enable_custom_fonts', v: true, with: {font: VERDANA}, p: style('.bas__heading', 'fontFamily'), want: /^Verdana/},
      {block: 'heading', id: 'font', v: TAHOMA, with: {enable_custom_fonts: true}, p: style('.bas__heading', 'fontFamily'), want: /^Tahoma/},
      {block: 'subheading', id: 'text', v: '<p>One <strong>coat</strong>.</p>', p: textOf('.bas__content'), want: '<p>One <strong>coat</strong>.</p>'},
      {block: 'subheading', id: 'enable_custom_style', v: true, with: {color: '#cc0033'}, p: style('.bas__content p', 'color'), want: 'rgb(204, 0, 51)'},
      {block: 'subheading', id: 'color', v: '#00cc33', with: {enable_custom_style: true}, p: style('.bas__content p', 'color'), want: 'rgb(0, 204, 51)'},
      {block: 'subheading', id: 'weight_enable', v: true, with: {weight: '700'}, p: style('.bas__content p', 'fontWeight'), want: '700'},
      {block: 'subheading', id: 'weight', v: '300', with: {weight_enable: true}, p: style('.bas__content p', 'fontWeight'), want: '300'},
      {block: 'subheading', id: 'size_enable', v: true, with: {size: 21}, p: style('.bas__content p', 'fontSize'), want: '21px'},
      {block: 'subheading', id: 'size', v: 20, with: {size_enable: true}, p: style('.bas__content p', 'fontSize'), want: '20px'},
      {block: 'subheading', id: 'line_height', v: 2, with: {size_enable: true, size: 20}, p: style('.bas__content p', 'lineHeight'), want: '40px'},
      {block: 'subheading', id: 'enable_custom_fonts', v: true, with: {font: VERDANA}, p: style('.bas__content p', 'fontFamily'), want: /^Verdana/},
      {block: 'subheading', id: 'font', v: TAHOMA, with: {enable_custom_fonts: true}, p: style('.bas__content p', 'fontFamily'), want: /^Tahoma/},
      {block: 'button', id: 'text', v: 'Buy the kit', p: textOf('.bas__cta'), want: 'Buy the kit'},
      {block: 'button', id: 'link', v: '', p: t => t.page.evaluate(() => document.querySelector('#shopify-section-test .bas__cta').tagName + ' ' + document.querySelector('#shopify-section-test .bas__cta').getAttribute('type')), want: 'BUTTON button'},
      {block: 'button', id: 'enable_custom_style', v: true, with: {bg: '#224466'}, p: style('.bas__cta', 'backgroundColor'), want: 'rgb(34, 68, 102)'},
      {block: 'button', id: 'bg', v: '#336633', with: {enable_custom_style: true}, p: style('.bas__cta', 'backgroundColor'), want: 'rgb(51, 102, 51)'},
      {block: 'button', id: 'color', v: '#ffcc00', with: {enable_custom_style: true}, p: style('.bas__cta', 'color'), want: 'rgb(255, 204, 0)'},
      {block: 'button', id: 'bg_hover', v: '#00ff00', with: {enable_custom_style: true}, p: hovered('.bas__cta', style('.bas__cta', 'backgroundColor')), want: 'rgb(0, 255, 0)'},
      {block: 'button', id: 'color_hover', v: '#000000', with: {enable_custom_style: true}, p: hovered('.bas__cta', style('.bas__cta', 'color')), want: 'rgb(0, 0, 0)'},
      {block: 'button', id: 'border_color', v: '#ff00ff', with: {enable_custom_style: true}, p: style('.bas__cta', 'borderTopColor'), want: 'rgb(255, 0, 255)'},
      {block: 'button', id: 'use_theme_button', v: false, p: style('.bas__cta', 'borderTopLeftRadius'), want: '5px'},
      {block: 'button', id: 'border_width', v: 3, with: {use_theme_button: false}, p: style('.bas__cta', 'borderTopWidth'), want: '3px'},
      {block: 'button', id: 'radius', v: 30, with: {use_theme_button: false}, p: style('.bas__cta', 'borderTopLeftRadius'), want: '30px'},
      {block: 'button', id: 'size', v: 20, with: {use_theme_button: false}, p: style('.bas__cta', 'fontSize'), want: '20px'},
      {block: 'button', id: 'weight_enable', v: true, with: {use_theme_button: false, weight: '700'}, p: style('.bas__cta', 'fontWeight'), want: '700'},
      {block: 'button', id: 'weight', v: '400', with: {use_theme_button: false, weight_enable: true}, p: style('.bas__cta', 'fontWeight'), want: '400'},
      {block: 'button', id: 'pad_x', v: 40, with: {use_theme_button: false}, p: style('.bas__cta', 'paddingLeft'), want: '40px'},
      {block: 'button', id: 'pad_y', v: 20, with: {use_theme_button: false}, p: style('.bas__cta', 'paddingTop'), want: '20px'},
    ],
    variants: [
      ['image_shadow', ['none', 'low', 'medium', 'high'], style('.bam-compare', 'boxShadow')],
      ['media_location', ['left', 'right', 'bottom'], t => t.page.evaluate(() => { const m = document.querySelector('#shopify-section-test .bas__media').getBoundingClientRect(); return [Math.round(m.x), Math.round(m.y), Math.round(m.width)].join(); }), 1366],
      ['circle_icon', ['icon1', 'icon2', 'icon3', 'icon10', 'icon11', 'icon12', 'icon13', 'icon14'], t => t.page.locator('#shopify-section-test .bam-compare__knob').screenshot().then(b => b.toString('base64'))],
    ],
    /* Saved instances from before the blocks: no blocks, text in the old section settings. */
    legacy: {
      blocks: [],
      settings: {headline: '<strong>Before and after</strong>', content: '<p>Present comparisons between two images.</p>', link_text: 'Shop the kit', link: '/collections/all'},
      specs: [
        {id: 'headline', v: '<em>Clean results</em>', p: textOf('.bas__heading'), want: '<em>Clean results</em>'},
        {id: 'content', v: '<p>Two weeks <strong>apart</strong>.</p>', p: textOf('.bas__content'), want: '<p>Two weeks <strong>apart</strong>.</p>'},
        {id: 'enable_button', v: false, p: visible('.bas__cta'), want: false},
        {id: 'link_text', v: 'Buy the set', p: textOf('.bas__cta'), want: 'Buy the set'},
        {id: 'link', v: '/pages/kit', p: attrOf('.bas__cta', 'href'), want: '/pages/kit'},
        {id: 'use_theme_button', v: false, p: style('.bas__cta', 'borderTopLeftRadius'), want: '5px'},
        {id: 'button_text_size', v: 20, with: {use_theme_button: false}, p: style('.bas__cta', 'fontSize'), want: '20px'},
        {id: 'button_padding_tb', v: 15, with: {use_theme_button: false}, p: style('.bas__cta', 'paddingTop'), want: '15px'},
        {id: 'button_padding_lr', v: 31, with: {use_theme_button: false}, p: style('.bas__cta', 'paddingLeft'), want: '31px'},
        {id: 'button_border_radius', v: 9, with: {use_theme_button: false}, p: style('.bas__cta', 'borderTopLeftRadius'), want: '9px'},
        {id: 'button_hover_animation', v: 'shadow', with: {use_theme_button: false}, p: hovered('.bas__cta', style('.bas__cta', 'boxShadow')), want: /rgba\(0, 0, 0, 0\.3\) 0px 4px 10px/},
        {id: 'button_background_color', v: '#224466', with: {enable_custom_style: true}, p: style('.bas__cta', 'backgroundColor'), want: 'rgb(34, 68, 102)'},
        {id: 'button_text_color', v: '#ffcc00', with: {enable_custom_style: true}, p: style('.bas__cta', 'color'), want: 'rgb(255, 204, 0)'},
      ],
      variants: [
        ['button_hover_animation', ['none', 'fade-in', 'shadow'], hovered('.bas__cta', t => t.page.evaluate(() => { const s = getComputedStyle(document.querySelector('#shopify-section-test .bas__cta')); return s.opacity + '|' + s.boxShadow; })), 0, {use_theme_button: false}],
      ],
    },
    images: ['[data-bam-image="before_image"]', '[data-bam-image="after_image"]'],
    unrelated: {section_padding_top_bottom: 40, mobile_section_padding_top_bottom: 20, media_radius: 9, headline: 'Edited heading'},
  },
  'before-and-after-slider-2': {
    bp: 992,
    specs: [
      {id: 'color_scheme', v: 'alt-scheme', p: style('.ba2', 'backgroundColor'), want: 'rgb(250, 250, 250)'},
      {id: 'section_width', v: 'container', p: style('.ba2', 'maxWidth'), want: '1330px'},
      {id: 'show_section_on', v: 'desktop', p: visible('.ba2__inner'), want: {d: true, m: false}},
      {id: 'reset_spacing', v: false, p: resetSibling, want: '30px'},
      {id: 'section_max_width_desktop', v: 900, p: style('.ba2__inner', 'maxWidth'), want: '900px'},
      {id: 'image_position', v: 'right', p: t => t.page.evaluate(() => { const m = document.querySelector('#shopify-section-test .ba2__media').getBoundingClientRect(), c = document.querySelector('#shopify-section-test .ba2__content').getBoundingClientRect(); return m.left >= c.right ? 'right' : m.right <= c.left ? 'left' : 'stacked'; }), want: {d: 'right', m: 'stacked'}},
      {id: 'image_col_fr', v: 2, p: t => t.page.evaluate(() => { const m = document.querySelector('#shopify-section-test .ba2__media').getBoundingClientRect().width, c = document.querySelector('#shopify-section-test .ba2__content').getBoundingClientRect().width; return Math.round(m / c * 10) / 10; }), want: {d: 2, m: SAME}},
      {id: 'content_col_fr', v: 2, p: t => t.page.evaluate(() => { const m = document.querySelector('#shopify-section-test .ba2__media').getBoundingClientRect().width, c = document.querySelector('#shopify-section-test .ba2__content').getBoundingClientRect().width; return Math.round(c / m * 10) / 10; }), want: {d: 2, m: SAME}},
      {id: 'layout_gap_desktop', v: 80, p: style('.ba2__layout', 'columnGap'), want: {d: '80px', m: SAME}},
      {id: 'content_gap', v: 30, p: style('.ba2__content', 'rowGap'), want: '30px'},
      {id: 'content_align', v: 'right', p: t => Promise.all([style('.ba2__content', 'textAlign')(t), style('.ba2__content', 'alignItems')(t)]), want: {d: ['right', 'flex-end'], m: SAME}},
      {id: 'image_aspect', v: '4 / 5', p: style('.bam-compare', 'aspectRatio'), want: '4 / 5'},
      {id: 'image_radius', v: 20, p: style('.bam-compare', 'borderTopLeftRadius'), want: '20px'},
      {id: 'start_position', v: 25, p: attrOf('[data-bam-handle]', 'aria-valuenow'), want: '25'},
      {id: 'handle_icon', v: 'dots', p: attrOf('.bam-compare__knob', 'data-bam-icon-current'), want: 'dots', editorOnly: true},
      {id: 'handle_size', v: 60, p: style('.bam-compare__knob', 'width'), want: '60px'},
      {id: 'handle_border_width', v: 4, p: style('.bam-compare__knob', 'borderTopWidth'), want: '4px'},
      {id: 'handle_line_width', v: 5, p: style('.bam-compare__bar', 'width'), want: '5px'},
      {id: 'show_labels', v: true, p: visible('.bam-compare__label--after'), want: true},
      {id: 'label_size', v: 16, with: {show_labels: true}, p: style('.bam-compare__label--after', 'fontSize'), want: '16px'},
      {id: 'label_weight', v: '500', with: {show_labels: true}, p: style('.bam-compare__label--after', 'fontWeight'), want: '500'},
      {id: 'label_tracking', v: 2, with: {show_labels: true}, p: style('.bam-compare__label--after', 'letterSpacing'), want: '2px'},
      {id: 'label_transform', v: 'lowercase', with: {show_labels: true}, p: style('.bam-compare__label--after', 'textTransform'), want: 'lowercase'},
      {id: 'label_pad_x', v: 20, with: {show_labels: true}, p: style('.bam-compare__label--after', 'paddingLeft'), want: '20px'},
      {id: 'label_pad_y', v: 10, with: {show_labels: true}, p: style('.bam-compare__label--after', 'paddingTop'), want: '10px'},
      {id: 'label_radius', v: 4, with: {show_labels: true}, p: style('.bam-compare__label--after', 'borderTopLeftRadius'), want: '4px'},
      {id: 'label_offset', v: 30, with: {show_labels: true}, p: t => Promise.all([style('.bam-compare__label--before', 'left')(t), style('.bam-compare__label--after', 'top')(t)]), want: ['30px', '30px']},
      {id: 'enable_custom_style', v: true, with: {section_bg: '#abcdef'}, p: style('.ba2', 'backgroundColor'), want: 'rgb(171, 205, 239)'},
      {id: 'section_bg', v: '#112233', with: {enable_custom_style: true}, p: style('.ba2', 'backgroundColor'), want: 'rgb(17, 34, 51)'},
      {id: 'image_bg', v: '#ff0000', with: {enable_custom_style: true}, p: style('.bam-compare', 'backgroundColor'), want: 'rgb(255, 0, 0)'},
      {id: 'handle_bg', v: '#ffff00', with: {enable_custom_style: true}, p: style('.bam-compare__knob', 'backgroundColor'), want: 'rgb(255, 255, 0)'},
      {id: 'handle_border_color', v: '#00ff00', with: {enable_custom_style: true}, p: style('.bam-compare__knob', 'borderTopColor'), want: 'rgb(0, 255, 0)'},
      {id: 'handle_icon_color', v: '#ff8800', with: {enable_custom_style: true}, p: style('.bam-compare__knob', 'color'), want: 'rgb(255, 136, 0)'},
      {id: 'handle_line_color', v: '#00ffff', with: {enable_custom_style: true}, p: style('.bam-compare__bar', 'backgroundColor'), want: 'rgb(0, 255, 255)'},
      {id: 'label_bg', v: '#0000ff', with: {enable_custom_style: true, show_labels: true}, p: style('.bam-compare__label--after', 'backgroundColor'), want: 'rgb(0, 0, 255)'},
      {id: 'label_color', v: '#ff00ff', with: {enable_custom_style: true, show_labels: true}, p: style('.bam-compare__label--after', 'color'), want: 'rgb(255, 0, 255)'},
      {id: 'enable_custom_fonts', v: true, with: {heading_font: VERDANA, body_font: TAHOMA}, p: t => Promise.all([style('.ba2__heading', 'fontFamily')(t), style('.ba2__sub', 'fontFamily')(t)]), want: v => /^Verdana/.test(v[0]) && /^Tahoma/.test(v[1])},
      {id: 'heading_font', v: VERDANA, with: {enable_custom_fonts: true}, p: style('.ba2__heading', 'fontFamily'), want: /^Verdana/},
      {id: 'body_font', v: TAHOMA, with: {enable_custom_fonts: true}, p: style('.ba2__sub', 'fontFamily'), want: /^Tahoma/},
      {id: 'padding_top_desktop', v: 40, p: style('.ba2', 'paddingTop'), want: {d: '40px', m: SAME}},
      {id: 'padding_bottom_desktop', v: 44, p: style('.ba2', 'paddingBottom'), want: {d: '44px', m: SAME}},
      {id: 'section_margin_top_desktop', v: 24, p: style(':wrap', 'marginTop'), want: {d: '24px', m: SAME}},
      {id: 'section_margin_bottom_desktop', v: 28, p: style(':wrap', 'marginBottom'), want: {d: '28px', m: SAME}},
      {id: 'layout_gap_mobile', v: 12, p: style('.ba2__layout', 'rowGap'), want: {d: SAME, m: '12px'}},
      {id: 'padding_top_mobile', v: 20, p: style('.ba2', 'paddingTop'), want: {d: SAME, m: '20px'}},
      {id: 'padding_bottom_mobile', v: 22, p: style('.ba2', 'paddingBottom'), want: {d: SAME, m: '22px'}},
      {id: 'section_margin_top_mobile', v: 16, p: style(':wrap', 'marginTop'), want: {d: SAME, m: '16px'}},
      {id: 'section_margin_bottom_mobile', v: 12, p: style(':wrap', 'marginBottom'), want: {d: SAME, m: '12px'}},
      {block: 'slider', id: 'before_image', v: IMG, p: attrOf('[data-bam-image="before_image"]', 'src'), want: /^https:\/\/theme\.test\/a\.png/},
      {block: 'slider', id: 'before_label', v: 'Old', with: {}, p: textOf('.bam-compare__label--before'), want: 'Old'},
      {block: 'slider', id: 'before_alt', v: 'Dull floor', with: {before_image: IMG}, p: attrOf('[data-bam-image="before_image"]', 'alt'), want: 'Dull floor'},
      {block: 'slider', id: 'after_image', v: IMG2, p: attrOf('[data-bam-image="after_image"]', 'src'), want: /^https:\/\/theme\.test\/b\.png/},
      {block: 'slider', id: 'after_label', v: 'New', p: textOf('.bam-compare__label--after'), want: 'New'},
      {block: 'slider', id: 'after_alt', v: 'Clean floor', with: {after_image: IMG2}, p: attrOf('[data-bam-image="after_image"]', 'alt'), want: 'Clean floor'},
      {block: 'heading', id: 'text', v: '<em>Edited</em> heading', p: textOf('.ba2__heading'), want: '<em>Edited</em> heading'},
      {block: 'heading', id: 'enable_custom_style', v: true, with: {color: '#cc0033'}, p: style('.ba2__heading', 'color'), want: 'rgb(204, 0, 51)'},
      {block: 'heading', id: 'color', v: '#00cc33', with: {enable_custom_style: true}, p: style('.ba2__heading', 'color'), want: 'rgb(0, 204, 51)'},
      {block: 'heading', id: 'weight_enable', v: true, with: {weight: '400'}, p: style('.ba2__heading', 'fontWeight'), want: '400'},
      {block: 'heading', id: 'weight', v: '500', with: {weight_enable: true}, p: style('.ba2__heading', 'fontWeight'), want: '500'},
      {block: 'heading', id: 'size_enable', v: true, p: style('.ba2__heading', 'fontSize'), want: {d: '48px', m: '32px'}},
      {block: 'heading', id: 'size_desktop', v: 56, with: {size_enable: true}, p: style('.ba2__heading', 'fontSize'), want: {d: '56px', m: '32px'}},
      {block: 'heading', id: 'size_mobile', v: 26, with: {size_enable: true}, p: style('.ba2__heading', 'fontSize'), want: {d: '48px', m: '26px'}},
      {block: 'heading', id: 'line_height', v: 1.5, with: {size_enable: true}, p: style('.ba2__heading', 'lineHeight'), want: {d: '72px', m: '48px'}},
      {block: 'heading', id: 'tracking', v: 2, with: {size_enable: true}, p: style('.ba2__heading', 'letterSpacing'), want: '2px'},
      {block: 'heading', id: 'enable_custom_fonts', v: true, with: {font: VERDANA}, p: style('.ba2__heading', 'fontFamily'), want: /^Verdana/},
      {block: 'heading', id: 'font', v: TAHOMA, with: {enable_custom_fonts: true}, p: style('.ba2__heading', 'fontFamily'), want: /^Tahoma/},
      {block: 'subheading', id: 'text', v: '<p>One <strong>coat</strong>.</p>', p: textOf('.ba2__sub'), want: '<p>One <strong>coat</strong>.</p>'},
      {block: 'subheading', id: 'enable_custom_style', v: true, with: {color: '#cc0033'}, p: style('.ba2__sub', 'color'), want: 'rgb(204, 0, 51)'},
      {block: 'subheading', id: 'color', v: '#00cc33', with: {enable_custom_style: true}, p: style('.ba2__sub', 'color'), want: 'rgb(0, 204, 51)'},
      {block: 'subheading', id: 'size_enable', v: true, p: style('.ba2__sub', 'fontSize'), want: '16px'},
      {block: 'subheading', id: 'size', v: 20, with: {size_enable: true}, p: style('.ba2__sub', 'fontSize'), want: '20px'},
      {block: 'subheading', id: 'line_height', v: 2, with: {size_enable: true, size: 20}, p: style('.ba2__sub', 'lineHeight'), want: '40px'},
      {block: 'subheading', id: 'enable_custom_fonts', v: true, with: {font: VERDANA}, p: style('.ba2__sub', 'fontFamily'), want: /^Verdana/},
      {block: 'subheading', id: 'font', v: TAHOMA, with: {enable_custom_fonts: true}, p: style('.ba2__sub', 'fontFamily'), want: /^Tahoma/},
      {block: 'subheading', id: 'max_width', v: 300, p: style('.ba2__sub', 'maxWidth'), want: '300px'},
      {block: 'button', id: 'text', v: 'Buy the kit', p: textOf('.ba2__btn'), want: 'Buy the kit'},
      {block: 'button', id: 'link', v: '', p: t => t.page.evaluate(() => document.querySelector('#shopify-section-test .ba2__btn').tagName + ' ' + document.querySelector('#shopify-section-test .ba2__btn').getAttribute('type')), want: 'BUTTON button'},
      {block: 'button', id: 'enable_custom_style', v: true, with: {bg: '#224466'}, p: style('.ba2__btn', 'backgroundColor'), want: 'rgb(34, 68, 102)'},
      {block: 'button', id: 'bg', v: '#336633', with: {enable_custom_style: true}, p: style('.ba2__btn', 'backgroundColor'), want: 'rgb(51, 102, 51)'},
      {block: 'button', id: 'color', v: '#ffcc00', with: {enable_custom_style: true}, p: style('.ba2__btn', 'color'), want: 'rgb(255, 204, 0)'},
      {block: 'button', id: 'bg_hover', v: '#00ff00', with: {enable_custom_style: true}, p: hovered('.ba2__btn', style('.ba2__btn', 'backgroundColor')), want: 'rgb(0, 255, 0)'},
      {block: 'button', id: 'color_hover', v: '#000000', with: {enable_custom_style: true}, p: hovered('.ba2__btn', style('.ba2__btn', 'color')), want: 'rgb(0, 0, 0)'},
      {block: 'button', id: 'border_color', v: '#ff00ff', with: {enable_custom_style: true}, p: style('.ba2__btn', 'borderTopColor'), want: 'rgb(255, 0, 255)'},
      {block: 'button', id: 'use_theme_button', v: false, p: style('.ba2__btn', 'borderTopLeftRadius'), want: '100px'},
      {block: 'button', id: 'border_width', v: 3, with: {use_theme_button: false}, p: style('.ba2__btn', 'borderTopWidth'), want: '3px'},
      {block: 'button', id: 'radius', v: 30, with: {use_theme_button: false}, p: style('.ba2__btn', 'borderTopLeftRadius'), want: '30px'},
      {block: 'button', id: 'size', v: 20, with: {use_theme_button: false}, p: style('.ba2__btn', 'fontSize'), want: '20px'},
      {block: 'button', id: 'weight_enable', v: true, with: {use_theme_button: false, weight: '700'}, p: style('.ba2__btn', 'fontWeight'), want: '700'},
      {block: 'button', id: 'weight', v: '400', with: {use_theme_button: false, weight_enable: true}, p: style('.ba2__btn', 'fontWeight'), want: '400'},
      {block: 'button', id: 'pad_x', v: 40, with: {use_theme_button: false}, p: style('.ba2__btn', 'paddingLeft'), want: '40px'},
      {block: 'button', id: 'pad_y', v: 20, with: {use_theme_button: false}, p: style('.ba2__btn', 'paddingTop'), want: '20px'},
      {block: 'button', id: 'gap_top', v: 20, p: style('.ba2__btn', 'marginTop'), want: '20px'},
    ],
    variants: [
      ['handle_icon', ['arrows', 'chevrons', 'lines', 'dots', 'plus'], t => t.page.locator('#shopify-section-test .bam-compare__knob').screenshot().then(b => b.toString('base64'))],
      ['image_position', ['left', 'right'], t => t.page.evaluate(() => Math.round(document.querySelector('#shopify-section-test .ba2__media').getBoundingClientRect().x)), 1366],
      ['content_align', ['left', 'center', 'right'], t => t.page.evaluate(() => Math.round(document.querySelector('#shopify-section-test .ba2__heading').getBoundingClientRect().x)), 1366],
      ['label_transform', ['none', 'uppercase', 'lowercase', 'capitalize'], t => t.page.evaluate(() => Math.round(document.querySelector('#shopify-section-test .bam-compare__label--after').getBoundingClientRect().width * 10)), 0, {show_labels: true}, ['slider', {after_label: 'aFTER photo'}]],
    ],
    images: ['[data-bam-image="before_image"]', '[data-bam-image="after_image"]'],
    unrelated: {padding_top_desktop: 40, padding_top_mobile: 20, image_radius: 9},
  },
};

const current = t => t.rendered[0].section;
async function apply(t, spec, value, how) {
  const patch = {...spec.with, [spec.id]: value};
  if (how === 'live') return t.emit(patch, spec.block ? t.blockId(spec.block) : undefined);
  const sec = current(t);
  if (!spec.block) return t.redraw({settings: patch});
  return t.redraw({blocks: sec.blocks.map(b => ({type: b.type, settings: b.type === spec.block ? {...b.settings, ...patch} : b.settings}))});
}
async function restore(t, spec, base, how) {
  const keys = Object.keys({...spec.with, [spec.id]: 1});
  if (how === 'live') {
    const src = spec.block ? base.blocks.find(b => b.type === spec.block).settings : base.settings;
    return t.emit(Object.fromEntries(keys.map(k => [k, src[k] ?? null])), spec.block ? t.blockId(spec.block) : undefined);
  }
  if (!spec.block) return t.redraw({settings: {...Object.fromEntries(keys.map(k => [k, undefined])), ...base.settings}});
  return t.redraw({blocks: base.blocks.map(b => ({type: b.type, settings: b.settings}))});
}

async function controls(t, name, cfg, width, editing) {
  const base = JSON.parse(JSON.stringify(current(t)));
  for (const how of editing ? ['live', 'redraw'] : ['live']) for (const spec of cfg.specs) {
    if (how === 'live' && spec.editorOnly && !editing) continue;
    const before = await spec.p(t);
    await apply(t, spec, spec.v, how);
    if (cfg.settle) await wait(t.page, cfg.settle);
    const got = await spec.p(t);
    const want = spec.want && typeof spec.want === 'object' && ('d' in spec.want) ? {...spec.want, bp: cfg.bp} : spec.want;
    ok(matches(want, got, before, width), `${name} ${width} ${how}: ${spec.block ? spec.block + '.' : ''}${spec.id}=${JSON.stringify(spec.v)} gave ${JSON.stringify(got)} (was ${JSON.stringify(before)})`);
    await restore(t, spec, base, how);
    if (cfg.settle) await wait(t.page, cfg.settle);
    if (how === 'live') same(await spec.p(t), before, `${name} ${width} live restore of ${spec.id}`);
  }
}

async function variants(t, name, cfg, width) {
  for (const [id, values, probe, onlyWidth, extra, blockExtra] of cfg.variants) {
    if (onlyWidth && onlyWidth !== width) continue;
    if (extra) await t.emit(extra);
    if (blockExtra) await t.emit(blockExtra[1], t.blockId(blockExtra[0]));
    const seen = [];
    for (const v of values) { await t.emit({[id]: v}); await wait(t.page, 360); seen.push(await probe(t)); }
    for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) assert.notDeepEqual(seen[i], seen[j], `${name} ${width}: ${id} ${values[i]} and ${values[j]} look the same`);
    checks++;
    await t.emit({[id]: current(t).settings[id] ?? null, ...(extra ? Object.fromEntries(Object.keys(extra).map(k => [k, current(t).settings[k] ?? null])) : {})});
  }
}

/* Key boxes and styles, to compare the Liquid paint with the hydrated one. */
const snapshot = page => page.evaluate(() => [...document.querySelectorAll('#shopify-section-test, #shopify-section-test *:not(style):not(script):not(template):not(path):not(polyline):not(line):not(circle):not(g)')].map(el => {
  const r = el.getBoundingClientRect(), s = getComputedStyle(el);
  return [el.className?.baseVal ?? el.className, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), s.color, s.backgroundColor, s.fontFamily, s.fontSize, s.fontWeight, s.display, s.opacity, s.clipPath, s.borderRadius, s.boxShadow].join('|');
}));

async function slider(browser, name, width, editing) {
  const t = await mount(browser, name, {width, editing, assets: JS, settings: {before_caption: 'Before', after_caption: 'After'}});
  const box = '#shopify-section-test [data-bam-compare]', handle = box + ' [data-bam-handle]';
  const geo = () => t.page.evaluate(sel => { const b = document.querySelector(sel), r = b.getBoundingClientRect(), imgs = [...b.querySelectorAll('.bam-compare__img')].map(i => { const q = i.getBoundingClientRect(); return [q.x, q.y, q.width, q.height].map(Math.round).join(); }), h = b.querySelector('[data-bam-handle]').getBoundingClientRect(); return {r: [r.x, r.width], box: [r.x, r.y, r.width, r.height].map(Math.round).join(), imgs, hx: h.left + h.width / 2, hw: h.width, hh: h.height, clip: getComputedStyle(b.querySelector('.bam-compare__before')).clipPath}; }, box);
  // Handle target and aria
  const g0 = await geo();
  ok(g0.hw >= 44 && g0.hh >= 44, `${name} ${width}: handle target ${g0.hw}x${g0.hh}`);
  same(await t.page.getAttribute(handle, 'role'), 'slider', `${name} role`);
  ok(await t.page.getAttribute(handle, 'tabindex') === '0' && await t.page.getAttribute(handle, 'aria-label'), `${name} focusable and labelled`);
  // Images stay aligned with no gap at every position
  for (const p of [0, 12.5, 50, 77, 100]) {
    await t.emit({[name === 'before-and-after-slider' ? 'start_percent' : 'start_position']: p});
    const g = await geo();
    ok(g.imgs.length === 2 && g.imgs[0] === g.imgs[1] && g.imgs[0] === g.box, `${name} ${width}: images aligned at ${p}% ${g.imgs}`);
    ok(Math.abs(g.hx - (g.r[0] + g.r[1] * p / 100)) <= 1, `${name} ${width}: handle at ${p}%`);
    ok(new RegExp('inset\\(0px (calc\\(.*\\)|' + (100 - p) + '%) 0px 0px\\)').test(g.clip) || g.clip.includes(String(100 - p)), `${name} ${width}: before layer clipped at ${p}%: ${g.clip}`);
  }
  await t.emit({[name === 'before-and-after-slider' ? 'start_percent' : 'start_position']: 50});
  // Pointer drag
  const r = await t.page.locator(box).boundingBox();
  await t.page.mouse.move(r.x + r.width * .5, r.y + r.height * .5); await t.page.mouse.down();
  await t.page.mouse.move(r.x + r.width * .3, r.y + r.height * .5, {steps: 4}); await t.page.mouse.move(r.x + r.width * .2, r.y + r.height * .52, {steps: 3}); await wait(t.page, 50);
  ok(Math.abs(await pos(t) - 20) <= 1, `${name} ${width}: mouse drag to 20% gave ${await pos(t)}`);
  await t.page.mouse.up();
  same(await t.page.getAttribute(handle, 'aria-valuenow'), String(Math.round(await pos(t))), `${name} aria-valuenow follows drag`);
  // Click anywhere on the picture
  await t.page.mouse.click(r.x + r.width * .8, r.y + r.height * .5); await wait(t.page, 50);
  ok(Math.abs(await pos(t) - 80) <= 1, `${name} ${width}: click moves to 80%`);
  // Touch drag (pointer events of type touch)
  await t.page.evaluate(([sel, rr]) => { const b = document.querySelector(sel), ev = (type, x) => b.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: rr.y + rr.height / 2, button: 0})); ev('pointerdown', rr.x + rr.width * .6); ev('pointermove', rr.x + rr.width * .45); ev('pointermove', rr.x + rr.width * .35); ev('pointerup', rr.x + rr.width * .35); }, [box, r]); await wait(t.page, 50);
  ok(Math.abs(await pos(t) - 35) <= 1, `${name} ${width}: touch drag to 35% gave ${await pos(t)}`);
  // Keyboard on the focused handle
  await t.page.focus(handle);
  await t.page.keyboard.press('Home'); same(await pos(t), 0, 'Home');
  await t.page.keyboard.press('ArrowRight'); same(await pos(t), 1, 'ArrowRight steps once (one listener)');
  await t.page.keyboard.press('Shift+ArrowRight'); same(await pos(t), 11, 'Shift+ArrowRight');
  await t.page.keyboard.press('PageUp'); same(await pos(t), 21, 'PageUp');
  await t.page.keyboard.press('ArrowLeft'); same(await pos(t), 20, 'ArrowLeft');
  await t.page.keyboard.press('End'); same(await pos(t), 100, 'End');
  await t.page.keyboard.press('PageDown'); same(await pos(t), 90, 'PageDown');
  same(await t.page.getAttribute(handle, 'aria-valuenow'), '90', `${name} keyboard aria-valuenow`);
  ok(/rgb/.test(await t.page.evaluate(sel => getComputedStyle(document.querySelector(sel + ' .bam-compare__knob')).boxShadow, handle)) && await t.page.evaluate(sel => document.querySelector(sel).matches(':focus-visible'), handle), `${name}: visible keyboard focus ring`);
  // Live edits never move the handle or reload images; a redraw keeps the position
  await t.page.keyboard.press('Home'); for (let i = 0; i < 3; i++) await t.page.keyboard.press('Shift+ArrowRight');
  const imgs = await t.page.evaluate(sel => { const list = [...document.querySelectorAll(sel + ' img')]; window.__bamImgs = list; return list.map(i => i.getAttribute('src')); }, box);
  for (const [k, v] of Object.entries(SECTIONS[name].unrelated)) { await t.emit({[k]: v}); same(await pos(t), 30, `${name}: live ${k} keeps the handle`); }
  ok(await t.page.evaluate(([sel, srcs]) => { const list = [...document.querySelectorAll(sel + ' img')]; return list.every((img, i) => img === window.__bamImgs[i] && img.getAttribute('src') === srcs[i]); }, [box, imgs]), `${name}: no image swapped on unrelated edits`);
  await t.redraw({settings: SECTIONS[name].unrelated});
  same(await pos(t), 30, `${name}: position kept through a redraw`);
  same(await t.page.evaluate(() => window.MateriaBeforeAfterMedia.roots()).then(list => list.map(x => x.listeners)), [7], `${name}: one controller, 7 listeners after redraw`);
  await t.page.focus(handle); await t.page.keyboard.press('ArrowRight'); same(await pos(t), 31, `${name}: one step per key after redraw`);
  await t.emit({[name === 'before-and-after-slider' ? 'start_percent' : 'start_position']: 64}); same(await pos(t), 64, `${name}: editing the start position moves the handle`);
  same(t.errors, [], `${name} slider errors`);
  await t.page.close();
}

/* Before and After Slider: heading, subheading and button blocks. Order,
   add, remove, live edits, two instances, first paint, and the legacy
   section text drawn only for a type that has no block. */
async function sliderBlocks(browser, name, cfg) {
  const order = t => t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .bas__text > *')].filter(el => !el.hidden).map(el => el.dataset.bamType || el.querySelector('[data-bam-type]')?.dataset.bamType || el.dataset.bamText || (el.matches('[data-bam-legacy-button]') ? 'legacy-button' : el.className)));
  const blocks = t => current(t).blocks.map(b => ({type: b.type, settings: b.settings}));
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, assets: JS});
    const tag = `${name} blocks ${width}`;
    same(await order(t), ['heading', 'subheading', 'button'], tag + ' preset draws heading, subheading, button in order');
    same(await t.page.locator('#shopify-section-test [data-bam-text="headline"], #shopify-section-test [data-bam-text="content"], #shopify-section-test [data-bam-legacy-button]').count(), 0, tag + ' no legacy elements while every block type exists');
    // Reorder
    const [h, sub, btn] = blocks(t);
    await t.redraw({blocks: [btn, h, sub]});
    same(await order(t), ['button', 'heading', 'subheading'], tag + ' reorder follows block order');
    const geo = await t.page.evaluate(() => ['.bas__actions', '.bas__heading', '.bas__content'].map(s => Math.round(document.querySelector('#shopify-section-test ' + s).getBoundingClientRect().y)));
    ok(geo[0] < geo[1] && geo[1] < geo[2], tag + ' reordered blocks stack in that order ' + geo);
    // Remove the subheading: no text paragraph, and the empty legacy default stays hidden
    await t.redraw({blocks: [h, btn]});
    same(await order(t), ['heading', 'button'], tag + ' removed block is gone');
    same(await visible('.bas__content')(t), false, tag + ' removed subheading leaves no text');
    // Add it back, edit it live
    await t.redraw({blocks: [h, btn, {type: 'subheading', settings: {text: '<p>Added text</p>'}}]});
    const id = current(t).blocks[2].id;
    same(await order(t), ['heading', 'button', 'subheading'], tag + ' added block renders last');
    await t.emit({text: '<p>Edited added</p>'}, id);
    same(await textOf(`[data-bam-block="${id}"]`)(t), '<p>Edited added</p>', tag + ' added block is live');
    await t.emit({size_enable: true, size: 22}, id);
    same(await style(`[data-bam-block="${id}"] p`, 'fontSize')(t), '22px', tag + ' added block size is live');
    await t.redraw(); await t.redraw();
    same((await t.page.evaluate(() => window.MateriaBeforeAfterMedia.roots())).map(r => r.listeners), [7], tag + ' one controller, no extra listeners after redraws');
    // Live edits of every block in the same frame, then all empty hides the text column
    await t.emit({text: 'Live heading'}, t.blockId('heading'));
    await t.emit({text: 'Live button', link: '/pages/a'}, t.blockId('button'));
    same([await textOf('.bas__heading')(t), await textOf('.bas__cta')(t), await attrOf('.bas__cta', 'href')(t)], ['Live heading', 'Live button', '/pages/a'], tag + ' live block text and link');
    for (const type of ['heading', 'button', 'subheading']) await t.emit({text: ''}, t.blockId(type));
    same(await t.page.evaluate(() => document.querySelector('#shopify-section-test .bas__text').hidden), true, tag + ' empty blocks hide the text column');
    if (width === 1366) {
      await t.emit({media_location: 'left'});
      same(await style('.bas__grid', 'display')(t), 'flex', tag + ' image takes the full row with no text');
      await t.emit({text: 'Back'}, t.blockId('heading'));
      same(await style('.bas__grid', 'display')(t), 'grid', tag + ' text column returns beside the image');
    }
    same(t.errors, [], tag + ' errors');
    await t.page.close();
  }
  // Layout settings apply to the block stack
  {
    const t = await mount(browser, name, {width: 1366, assets: JS, settings: {media_location: 'right', text_alignment: 'right', element_spacing: 30}});
    const r = await t.page.evaluate(() => { const q = s => document.querySelector('#shopify-section-test ' + s).getBoundingClientRect(); return {text: q('.bas__text'), media: q('.bas__media'), h: q('.bas__heading'), sub: q('.bas__content'), btn: q('.bas__cta')}; });
    ok(r.text.right <= r.media.left, 'slider blocks: image right puts the block stack on the left');
    ok(Math.abs(r.btn.right - r.text.right) <= 1, 'slider blocks: right alignment moves the button');
    same(Math.round(r.sub.top - r.h.bottom), 30, 'slider blocks: element spacing between blocks');
    await t.page.close();
  }
  // Legacy fallback per type: only the type with no block uses the old setting
  {
    const t = await mount(browser, name, {width: 1366, assets: JS, settings: {headline: 'Saved heading', content: '<p>Saved text</p>', link_text: 'Saved button', link: '/pages/saved'}, blocks: [{type: 'heading', settings: {text: 'Block heading'}}]});
    same(await t.page.locator('#shopify-section-test .bas__heading').count(), 1, 'slider legacy: one heading when a heading block exists');
    same([await textOf('.bas__heading')(t), await textOf('.bas__content')(t), await textOf('.bas__cta')(t), await attrOf('.bas__cta', 'href')(t)], ['Block heading', '<p>Saved text</p>', 'Saved button', '/pages/saved'], 'slider legacy: block heading, saved text and saved button');
    same(await order(t), ['content', 'heading', 'legacy-button'], 'slider legacy: saved text, block, saved button');
    await t.emit({headline: 'Ignored'});
    same(await textOf('.bas__heading')(t), 'Block heading', 'slider legacy: the old heading setting does not touch the block');
    await t.emit({content: '<p>Saved text, edited</p>', link_text: 'Saved, edited'});
    same([await textOf('.bas__content')(t), await textOf('.bas__cta')(t)], ['<p>Saved text, edited</p>', 'Saved, edited'], 'slider legacy: old settings still live where no block exists');
    same(t.errors, [], 'slider legacy errors');
    await t.page.close();
  }
  // Two instances: a block edit in a leaves b alone
  {
    const two = await mount(browser, name, {width: 1366, assets: JS, instances: [{uid: 'a'}, {uid: 'b'}]});
    await two.emit({text: 'Only in a', enable_custom_style: true, color: '#ff0000'}, two.blockId('heading', 0, 'a'), 'a');
    same(await two.page.evaluate(() => ['a', 'b'].map(u => { const h = document.querySelector('#shopify-section-' + u + ' .bas__heading'); return h.textContent + '|' + getComputedStyle(h).color; })), ['Only in a|rgb(255, 0, 0)', 'Before and after|' + HEAD], 'slider blocks: instance a edit stays in a');
    same(two.errors, [], 'slider two instance block errors');
    await two.page.close();
  }
  // First paint equals hydrated paint with custom block values
  const customBlocks = [
    {type: 'button', settings: {enable_custom_style: true, bg: '#224466', color: '#ffcc00', border_color: '#ff00ff', use_theme_button: false, radius: 20, size: 18, weight_enable: true, weight: '700', pad_x: 30, pad_y: 12, border_width: 2}},
    {type: 'heading', settings: {enable_custom_style: true, color: '#cc0033', weight_enable: true, weight: '500', size_enable: true, size_desktop: 50, size_mobile: 28, line_height: 1.3, tracking: 1, enable_custom_fonts: true, font: VERDANA}},
    {type: 'subheading', settings: {enable_custom_style: true, color: '#00cc33', weight_enable: true, weight: '600', size_enable: true, size: 19, line_height: 1.8, enable_custom_fonts: true, font: TAHOMA}},
  ];
  for (const width of [375, 1366]) {
    const a = await mount(browser, name, {width, assets: [], blocks: customBlocks}), b = await mount(browser, name, {width, assets: JS, blocks: customBlocks});
    await wait(b.page, 100);
    const sa = await snapshot(a.page), sb = await snapshot(b.page);
    same(sb, sa, `${name} ${width}: custom blocks first paint equals hydrated paint`);
    const fonts = [await style('.bas__heading', 'fontFamily')(b), await style('.bas__content p', 'fontFamily')(b), await style('.bas__cta', 'borderTopLeftRadius')(b)];
    ok(/^Verdana/.test(fonts[0]) && /^Tahoma/.test(fonts[1]) && fonts[2] === '20px', `${name} ${width}: custom block fonts and shape ${fonts}`);
    await a.page.close(); await b.page.close();
  }
}

(async () => {
  const browser = await launch();
  try {
    for (const [name, cfg] of Object.entries(SECTIONS).filter(([n]) => !process.env.BAM_ONLY || n.endsWith(process.env.BAM_ONLY))) {
      // 1. Schema
      same(schemaProblems(name), [], name + ' schema problems');
      const {schema} = schemaOf(name);
      const all = [['', schema.settings], ...(schema.blocks || []).map(b => [b.type, b.settings])];
      for (const [type, list] of all) for (const s of list) if (s.id && !s.hidden) ok(cfg.specs.some(x => x.id === s.id && (x.block || '') === type), `${name}: no control test for ${type || 'section'}.${s.id}`);
      for (const [type, list] of all) for (const s of list) if (s.type === 'color') ok(/enable_custom_style/.test(s.visible_if || ''), `${name}: ${type}.${s.id} colour waits for custom styling`);
      const tpl = require('fs').readFileSync(require('path').join(__dirname, '../sections', name + '.storelib'), 'utf8');
      const defaults = JSON.parse(tpl.match(/data-bam-defaults='([^']*)'/)[1]);
      same(defaults, Object.fromEntries(schema.settings.filter(s => s.id && s.default !== undefined).map(s => [s.id, s.default])), name + ' embedded defaults match the schema');
      const blockDefaults = tpl.match(/data-bam-block-defaults='([^']*)'/);
      if (blockDefaults) same(JSON.parse(blockDefaults[1]), Object.fromEntries((schema.blocks || []).map(b => [b.type, Object.fromEntries(b.settings.filter(s => s.id && s.default !== undefined).map(s => [s.id, s.default]))])), name + ' embedded block defaults match the schema');

      for (const width of [375, 1366]) for (const editing of [true, false]) {
        const t = await mount(browser, name, {width, editing, assets: JS, settings: cfg.settings, blocks: cfg.blocks});
        const tag = `${name} ${width} ${editing ? 'editor' : 'storefront'}`;
        await resetSibling(t);
        // 2. Theme inheritance
        const root = {image: '.bai', slider: '.bas', 'slider-2': '.ba2'}[name.replace('before-and-after-', '')];
        same(await style(root, 'backgroundColor')(t), BG, tag + ' scheme background');
        if (name !== 'before-and-after-image') {
          const h = name === 'before-and-after-slider' ? '.bas__heading' : '.ba2__heading', p = name === 'before-and-after-slider' ? '.bas__content p' : '.ba2__sub p', btn = name === 'before-and-after-slider' ? '.bas__cta' : '.ba2__btn';
          same([await style(h, 'color')(t), await style(h, 'fontFamily')(t), await t.page.evaluate(sel => document.querySelector('#shopify-section-test ' + sel).tagName, h)], [HEAD, 'Georgia', 'H2'], tag + ' heading inherits');
          same([await style(p, 'color')(t), await style(p, 'fontFamily')(t)], [TEXT, 'Arial'], tag + ' text inherits');
          same([await style(btn, 'backgroundColor')(t), await style(btn, 'borderTopLeftRadius')(t)], ['rgb(18, 52, 86)', '12px'], tag + ' theme button');
          same(await hovered(btn, style(btn, 'backgroundColor'))(t), 'rgb(255, 0, 0)', tag + ' theme button hover');
        } else {
          same([await style('.bai__label', 'color')(t), await style('.bai__label', 'fontFamily')(t)], [HEAD, 'Arial'], tag + ' label inherits');
        }
        // 3. Colour scheme live and after redraw
        await t.emit({color_scheme: 'alt-scheme'}); same(await style(root, 'backgroundColor')(t), 'rgb(250, 250, 250)', tag + ' live scheme');
        await t.emit({color_scheme: 'default-color-scheme'}); same(await style(root, 'backgroundColor')(t), BG, tag + ' scheme back');
        if (editing) { await t.redraw({settings: {color_scheme: 'alt-scheme'}}); same(await style(root, 'backgroundColor')(t), 'rgb(250, 250, 250)', tag + ' redraw scheme'); await t.redraw({settings: {color_scheme: 'default-color-scheme'}}); }
        // 4. Custom style on then off restores the theme
        const colours = schema.settings.filter(s => s.type === 'color').map(s => s.id);
        await t.emit({enable_custom_style: true, ...Object.fromEntries(colours.map(id => [id, '#123123']))});
        ok(await style(root, 'backgroundColor')(t) === 'rgb(18, 49, 35)', tag + ' custom background');
        await t.emit({enable_custom_style: false});
        same(await style(root, 'backgroundColor')(t), BG, tag + ' custom off restores the scheme');
        await t.emit(Object.fromEntries(colours.map(id => [id, null])));
        // 5 and 6. Every control, live (and redrawn in the editor), at the right width
        await controls(t, name, cfg, width, editing);
        // 7. Variants
        if (editing) await variants(t, name, cfg, width);
        // 13. Overflow and errors
        ok(await t.noOverflow(), tag + ' no sideways scroll');
        same(t.errors, [], tag + ' errors');
        await t.page.close();
      }

      // Legacy text settings (no blocks): every old control still works, live and redrawn
      if (cfg.legacy) for (const width of [375, 1366]) for (const editing of [true, false]) {
        const t = await mount(browser, name, {width, editing, assets: JS, settings: cfg.legacy.settings, blocks: cfg.legacy.blocks});
        const tag = `${name} legacy ${width} ${editing ? 'editor' : 'storefront'}`;
        same([await t.page.locator('#shopify-section-test [data-bam-block]').count(), await t.page.locator('#shopify-section-test .bas__heading').count()], [0, 1], tag + ' draws the legacy heading only');
        same([await style('.bas__heading', 'color')(t), await style('.bas__heading', 'fontFamily')(t), await style('.bas__content p', 'color')(t), await style('.bas__cta', 'backgroundColor')(t)], [HEAD, 'Georgia', TEXT, 'rgb(18, 52, 86)'], tag + ' legacy text inherits the theme');
        await controls(t, name, {...cfg, specs: cfg.legacy.specs}, width, editing);
        if (editing) await variants(t, name, {...cfg, variants: cfg.legacy.variants}, width);
        ok(await t.noOverflow(), tag + ' no sideways scroll');
        same(t.errors, [], tag + ' errors');
        await t.page.close();
      }
      if (name === 'before-and-after-slider') await sliderBlocks(browser, name, cfg);

      // 8. Two instances stay independent
      const two = await mount(browser, name, {width: 1366, assets: JS, instances: [{uid: 'a', settings: cfg.settings, blocks: cfg.blocks}, {uid: 'b', settings: cfg.settings, blocks: cfg.blocks}]});
      const root = {image: '.bai', slider: '.bas', 'slider-2': '.ba2'}[name.replace('before-and-after-', '')];
      await two.emit({enable_custom_style: true, [{image: 'background_color', slider: 'section_background_color', 'slider-2': 'section_bg'}[name.replace('before-and-after-', '')]]: '#abcdef'}, undefined, 'a');
      same([await style(root, 'backgroundColor')(two, 'a'), await style(root, 'backgroundColor')(two, 'b')], ['rgb(171, 205, 239)', BG], name + ' instance a edit stays in a');
      if (name !== 'before-and-after-image') {
        await two.page.focus('#shopify-section-b [data-bam-handle]'); await two.page.keyboard.press('End');
        same(await two.page.evaluate(() => ['a', 'b'].map(u => document.querySelector('#shopify-section-' + u + ' [data-bam-compare]').style.getPropertyValue('--bam-pos'))), ['50%', '100%'], name + ' handles move independently');
      }
      same(two.errors, [], name + ' two instance errors');
      await two.page.close();

      // 9. Added block, redraw, live edit; no duplicate controllers
      if (name !== 'before-and-after-slider') {
        const start = name === 'before-and-after-image' ? cfg.blocks : [{type: 'slider'}, {type: 'heading'}, {type: 'subheading'}];
        const t = await mount(browser, name, {width: 1366, assets: JS, blocks: start});
        const added = name === 'before-and-after-image' ? {type: 'comparison', settings: {before_text: 'Added before'}} : {type: 'button', settings: {text: 'Added button'}};
        await t.redraw({blocks: [...current(t).blocks.map(b => ({type: b.type, settings: b.settings})), added]});
        const id = current(t).blocks[current(t).blocks.length - 1].id;
        ok(await t.page.locator(`#shopify-section-test [data-bam-block="${id}"]`).count() === 1, name + ' added block renders');
        await t.emit(name === 'before-and-after-image' ? {before_text: 'Edited added'} : {text: 'Edited added'}, id);
        ok((await t.page.locator(`#shopify-section-test [data-bam-block="${id}"]`).textContent()).includes('Edited added'), name + ' added block is live');
        await t.redraw(); await t.redraw();
        same((await t.page.evaluate(() => window.MateriaBeforeAfterMedia.roots())).length, 1, name + ' one controller after redraws');
        same(t.errors, [], name + ' added block errors');
        await t.page.close();
      }

      // 10. No image reload on unrelated edits
      {
        const imgSettings = name === 'before-and-after-slider' ? {...cfg.settings, before_image: IMG, after_image: IMG2} : cfg.settings;
        const blocks = name === 'before-and-after-image' ? [{type: 'comparison', settings: {before_image: IMG, after_image: IMG2}}] : name === 'before-and-after-slider-2' ? [{type: 'slider', settings: {before_image: IMG, after_image: IMG2}}, {type: 'heading'}] : undefined;
        const t = await mount(browser, name, {width: 1366, assets: JS, settings: imgSettings, blocks});
        const loads = [];
        t.page.on('request', r => { if (/theme\.test\/[ab]\.png/.test(r.url())) loads.push(r.url()); });
        await t.page.evaluate(sels => { window.__imgs = sels.map(s => document.querySelector('#shopify-section-test ' + s)); window.__srcs = window.__imgs.map(i => i.getAttribute('src')); }, cfg.images);
        for (const [k, v] of Object.entries(cfg.unrelated)) await t.emit({[k]: v});
        if (name !== 'before-and-after-slider') await t.emit(name === 'before-and-after-image' ? {before_text: 'Renamed'} : {before_label: 'Renamed'}, t.blockId(name === 'before-and-after-image' ? 'comparison' : 'slider'));
        ok(await t.page.evaluate(sels => sels.every((s, i) => document.querySelector('#shopify-section-test ' + s) === window.__imgs[i] && window.__imgs[i].getAttribute('src') === window.__srcs[i]), cfg.images), name + ' images untouched by unrelated edits');
        same(loads, [], name + ' no image requests on unrelated edits');
        await t.page.close();
      }

      // 11. First paint equals hydrated paint (defaults, and custom values)
      const custom = {enable_custom_style: true, enable_custom_fonts: true, ...Object.fromEntries(schema.settings.filter(s => s.type === 'color').map((s, i) => [s.id, '#' + (0x102030 + i * 0x0a0b0c).toString(16).slice(-6)])), ...Object.fromEntries(schema.settings.filter(s => s.type === 'font_picker').map(s => [s.id, VERDANA]))};
      for (const width of [375, 1366]) for (const settings of [cfg.settings || {}, {...cfg.settings, ...custom}]) {
        const a = await mount(browser, name, {width, assets: [], settings, blocks: cfg.blocks}), b = await mount(browser, name, {width, assets: JS, settings, blocks: cfg.blocks});
        await wait(b.page, 100);
        const sa = await snapshot(a.page), sb = await snapshot(b.page);
        same(sb.length, sa.length, name + ' same elements');
        for (let i = 0; i < sa.length; i++) assert.equal(sb[i], sa[i], `${name} ${width}: hydrated paint differs at ${i}`);
        checks++;
        await a.page.close(); await b.page.close();
      }

      // 12. Reduced motion: nothing animates, content visible
      {
        const t = await mount(browser, name, {width: 1366, assets: JS, reducedMotion: 'reduce', settings: cfg.settings, blocks: cfg.blocks});
        const moving = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test *')].filter(el => { const s = getComputedStyle(el); return s.animationName !== 'none' || (s.transitionDuration.split(',').some(d => parseFloat(d) > 0) && !el.matches('[data-theme-button]')); }).map(el => el.className));
        same(moving, [], name + ' reduced motion: no animation or transition');
        ok(await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test img')].every(i => getComputedStyle(i).opacity === '1')), name + ' content visible under reduced motion');
        await t.page.close();
      }

      // Comparison slider interaction
      if (name !== 'before-and-after-image') for (const width of [375, 1366]) for (const editing of [true, false]) await slider(browser, name, width, editing);
    }
  } finally { await browser.close(); }
  console.log(`${checks} Before/After Images, Before and After Slider and Before/After Slider 2 checks passed (schema, theme, every control live and redrawn, widths, variants, instances, blocks, slider pointer/touch/keyboard, first paint, reduced motion)`);
})().catch(e => { console.error(e); process.exit(1); });
