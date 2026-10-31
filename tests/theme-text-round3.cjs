/* Round 3: every custom font, weight, size and button shape control of the
   nine Text sections wins over the real theme rules (snippets/theme-controls,
   priority on), on first paint, after a live edit and after a redraw, and the
   theme values come back when the switch is off. Every select option changes
   its element. Run: LIQUIDJS=<path> node tests/theme-text-round3.cjs [names...] */
const assert = require('assert/strict'), {launch, mount, schemaOf} = require('./media-fixture.cjs');
const F = family => ({family});
const OWN = ['inline-image-heading', 'quotebanner', 'scrolling-text'];
const TEXT_ASSETS = ['text-section-controls.css', 'scroll-text-reveal.js', 'text-section-controls.js'];
const LIVE_ASSETS = ['live-text.js'];
const assetsFor = name => OWN.includes(name) ? LIVE_ASSETS : TEXT_ASSETS;
const HEAD = /^Georgia$/, BODY = /^Arial$/, TAHOMA = /^"?Tahoma"?,/, COURIER = /^"?Courier New"?,/, VERDANA = /^"?Verdana"?,/;
const BTN = {fontSize: '16px', borderRadius: '12px', padding: '12px 24px', fontWeight: '500'};

/* Each case: on/off = {section: {...}, blocks: {type: {...}}}; checks = [selector, property | 'attr:<name>', when on, when off]. */
const rich = [
  {label: 'section custom fonts', on: {section: {enable_custom_font: true, heading_font: F('Courier New'), body_font: F('Verdana')}}, off: {section: {enable_custom_font: false}},
    checks: [['[data-tx-type=title]', 'fontFamily', COURIER, HEAD], ['[data-tx-type=title]', 'attr:data-own-font', true, false], ['[data-tx-type=description] p', 'fontFamily', VERDANA, BODY], ['[data-tx-type=description] strong', 'fontFamily', VERDANA, BODY]]},
  {label: 'title block font', on: {blocks: {title: {enable_custom_fonts: true, custom_font_title: F('Tahoma')}}}, off: {blocks: {title: {enable_custom_fonts: false}}},
    checks: [['[data-tx-type=title]', 'fontFamily', TAHOMA, HEAD], ['[data-tx-type=title]', 'attr:data-own-font', true, false]]},
  {label: 'title weight', on: {blocks: {title: {title_font_weight: '300'}}}, off: {blocks: {title: {title_font_weight: 'theme'}}},
    checks: [['[data-tx-type=title]', 'fontWeight', '300', '700'], ['[data-tx-type=title]', 'attr:data-own-weight', true, false]]},
  {label: 'description block font', on: {blocks: {description: {enable_custom_fonts: true, custom_font_description_button: F('Tahoma')}}}, off: {blocks: {description: {enable_custom_fonts: false}}},
    checks: [['[data-tx-type=description] p', 'fontFamily', TAHOMA, BODY], ['[data-tx-type=description] strong', 'fontFamily', TAHOMA, BODY]]},
  {label: 'button own shape', on: {blocks: {button: {use_theme_button: false, button_text_size: 22, button_border_radius: 2, button_font_weight: '300'}}}, off: {blocks: {button: {use_theme_button: true}}},
    checks: [['[data-tx-type=button]', 'fontSize', '22px', BTN.fontSize], ['[data-tx-type=button]', 'borderRadius', '2px', BTN.borderRadius], ['[data-tx-type=button]', 'fontWeight', '300', BTN.fontWeight], ['[data-tx-type=button]', 'padding', '12px 24px', BTN.padding], ['[data-tx-type=button]', 'attr:data-own-shape', true, false]]},
];
const descText = {description_text: '<p>Real <strong>text</strong> here</p>'};
const CASES = {
  richtext1: rich, richtext2: rich,
  'scroll-text-banner': [
    {label: 'section custom fonts', on: {section: {enable_custom_fonts: true, heading_font: F('Courier New')}}, off: {section: {enable_custom_fonts: false}},
      checks: [['.stw__text p', 'fontFamily', COURIER, HEAD], ['.stw__text strong', 'fontFamily', COURIER, HEAD]]},
    {label: 'text block font', on: {blocks: {text: {enable_custom_fonts: true, font: F('Tahoma')}}}, off: {blocks: {text: {enable_custom_fonts: false}}},
      checks: [['.stw__text p', 'fontFamily', TAHOMA, HEAD], ['[data-tx-type=text]', 'attr:data-own-font', true, false]]},
    {label: 'mono style', on: {section: {font_style: 'mono'}}, off: {section: {font_style: 'heading'}}, checks: [['.stw__text p', 'fontFamily', /monospace/, HEAD]]},
    {label: 'bold, spacing, line height', on: {section: {bold: false, letter_spacing: 3, line_height: 2, uppercase: false}}, off: {section: {bold: true, letter_spacing: 0, line_height: 1.4, uppercase: true}},
      checks: [['.stw__text p', 'fontWeight', '400', '700'], ['.stw__text p', 'letterSpacing', '3px', 'normal'], ['.stw__text p', 'textTransform', 'none', 'uppercase'], ['.stw__text', 'lineHeight', l => /^(48|80)px$/.test(l), l => /^(33\.6|56)px$/.test(l)]]},
  ],
  'text-heading': [
    {label: 'section custom font', on: {section: {enable_custom_font: true, custom_font_title: F('Courier New')}}, off: {section: {enable_custom_font: false}},
      checks: [['[data-tx-type=title]', 'fontFamily', COURIER, HEAD], ['[data-tx-type=title]', 'attr:data-own-font', true, false]]},
    {label: 'title block font', on: {blocks: {title: {enable_custom_fonts: true, font: F('Tahoma')}}}, off: {blocks: {title: {enable_custom_fonts: false}}}, checks: [['[data-tx-type=title]', 'fontFamily', TAHOMA, HEAD]]},
    {label: 'title weight', on: {section: {title_font_weight: '300'}}, off: {section: {title_font_weight: 'theme'}}, checks: [['[data-tx-type=title]', 'fontWeight', '300', '700'], ['[data-tx-type=title]', 'attr:data-own-weight', true, false]]},
    {label: 'title line height', on: {section: {title_line_height: '2'}}, off: {section: {title_line_height: '1.2'}}, checks: [['[data-tx-type=title]', 'lineHeight', l => /^(60|80)px$/.test(l), l => /^(36|48)px$/.test(l)]]},
    {label: 'second text font and weight', on: {section: {enable_second_text: true, second_text: 'Two', enable_custom_font: true, second_text_font: F('Verdana'), second_text_font_weight: '300'}}, off: {section: {enable_second_text: true, second_text: 'Two', enable_custom_font: false, second_text_font_weight: 'theme'}},
      checks: [['.rt-elements-pro-1-title-second', 'fontFamily', VERDANA, BODY], ['.rt-elements-pro-1-title-second', 'fontWeight', '300', '400']]},
  ],
  titleandsubtitle: [
    {label: 'section custom fonts', on: {section: {enable_custom_fonts: true, heading_font: F('Courier New'), body_font: F('Verdana'), subheading_text: '<p>Sub <strong>text</strong></p>'}}, off: {section: {enable_custom_fonts: false}},
      checks: [['[data-tx-type=title]', 'fontFamily', COURIER, HEAD], ['[data-tx-type=subtitle]', 'fontFamily', COURIER, HEAD], ['[data-tx-subheading] p', 'fontFamily', VERDANA, BODY], ['[data-tx-subheading] strong', 'fontFamily', VERDANA, BODY]]},
    {label: 'section weights', on: {section: {title_font_weight: '300', subtitle_font_weight: '300'}}, off: {section: {title_font_weight: 'theme', subtitle_font_weight: 'theme'}},
      checks: [['[data-tx-type=title]', 'fontWeight', '300', '700'], ['[data-tx-type=subtitle]', 'fontWeight', '300', '700']]},
    {label: 'title block custom style', on: {blocks: {title: {enable_custom_style: true, font_weight: '900', letter_spacing: 4, line_height: 2, text_case: 'uppercase'}}}, off: {blocks: {title: {enable_custom_style: false}}},
      checks: [['[data-tx-type=title]', 'fontWeight', '900', '700'], ['[data-tx-type=title]', 'letterSpacing', '4px', 'normal'], ['[data-tx-type=title]', 'lineHeight', l => /^(70|74)px$/.test(l), l => /^(42|44\.4)px$/.test(l)], ['[data-tx-type=title]', 'textTransform', 'uppercase', 'none'], ['[data-tx-type=title]', 'attr:data-own-size', true, false]]},
    {label: 'subtitle block custom style', on: {blocks: {subtitle: {enable_custom_style: true, font_weight: '300', letter_spacing: 2, text_case: 'lowercase'}}}, off: {blocks: {subtitle: {enable_custom_style: false}}},
      checks: [['[data-tx-type=subtitle]', 'fontWeight', '300', '700'], ['[data-tx-type=subtitle]', 'letterSpacing', '2px', 'normal'], ['[data-tx-type=subtitle]', 'textTransform', 'lowercase', 'none']]},
    {label: 'block fonts', on: {blocks: {title: {enable_custom_fonts: true, font: F('Tahoma')}, subtitle: {enable_custom_fonts: true, font: F('Tahoma')}}}, off: {blocks: {title: {enable_custom_fonts: false}, subtitle: {enable_custom_fonts: false}}},
      checks: [['[data-tx-type=title]', 'fontFamily', TAHOMA, HEAD], ['[data-tx-type=subtitle]', 'fontFamily', TAHOMA, HEAD]]},
  ],
  wavyrichtextbanner: [
    {label: 'section custom fonts', on: {section: {enable_custom_fonts: true, heading_font: F('Courier New'), body_font: F('Verdana')}}, off: {section: {enable_custom_fonts: false}},
      checks: [['[data-tx-type=heading]', 'fontFamily', COURIER, HEAD], ['[data-tx-type=caption]', 'fontFamily', VERDANA, BODY], ['[data-tx-type=text] p', 'fontFamily', VERDANA, BODY]]},
    {label: 'heading block font and weight', on: {blocks: {heading: {heading_alternative_font: true, heading_font: F('Tahoma'), heading_weight: '300'}}}, off: {blocks: {heading: {heading_alternative_font: false, heading_weight: 'theme'}}},
      checks: [['[data-tx-type=heading]', 'fontFamily', TAHOMA, HEAD], ['[data-tx-type=heading]', 'fontWeight', '300', '700'], ['[data-tx-type=heading]', 'attr:data-own-weight', true, false]]},
    {label: 'caption block font and weight', on: {blocks: {caption: {caption_alternative_font: true, caption_font: F('Tahoma'), caption_weight: '600'}}}, off: {blocks: {caption: {caption_alternative_font: false, caption_weight: 'theme'}}},
      checks: [['[data-tx-type=caption]', 'fontFamily', TAHOMA, BODY], ['[data-tx-type=caption]', 'fontWeight', '600', '400']]},
    {label: 'text block font', on: {blocks: {text: {description_alternative_font: true, description_font: F('Tahoma')}}}, off: {blocks: {text: {description_alternative_font: false}}},
      checks: [['[data-tx-type=text] p', 'fontFamily', TAHOMA, BODY]]},
    {label: 'buttons own shape', on: {blocks: {buttons: {use_theme_button: false, primary_button_corner: 3, button_font_weight: '300'}}}, off: {blocks: {buttons: {use_theme_button: true}}},
      checks: [['.LoudzTextButtonButtons__Primary', 'borderRadius', '3px', BTN.borderRadius], ['.LoudzTextButtonButtons__Primary', 'fontWeight', '300', BTN.fontWeight], ['.LoudzTextButtonButtons__Primary', 'fontSize', '14px', BTN.fontSize], ['.LoudzTextButtonButtons__Primary', 'padding', '16px 20px', BTN.padding], ['.LoudzTextButtonButtons__Primary', 'attr:data-own-shape', true, false]]},
  ],
};
CASES.richtext1 = CASES.richtext2 = rich.map(c => c.label === 'description block font' ? {...c, on: {blocks: {description: {...c.on.blocks.description, ...descText}}}, off: {blocks: {description: {...c.off.blocks.description, ...descText}}}} : c.label === 'section custom fonts' ? {...c, on: {...c.on, blocks: {description: descText}}, off: {...c.off, blocks: {description: descText}}} : c);

/* Theme inheritance with both priorities off, once per section: [selector, property, wanted]. */
const THEME = {
  richtext1: [['[data-tx-type=title]', 'fontFamily', HEAD], ['[data-tx-type=description]', 'fontFamily', BODY], ['[data-tx-type=button]', 'borderRadius', BTN.borderRadius]],
  'scroll-text-banner': [['.stw__text', 'fontFamily', HEAD], ['[data-text-controls]', 'backgroundColor', 'rgb(24, 32, 40)']],
  'text-heading': [['[data-tx-type=title]', 'fontFamily', HEAD], ['[data-tx-type=title]', 'color', 'rgb(255, 255, 255)']],
  titleandsubtitle: [['[data-tx-type=title]', 'fontFamily', HEAD], ['[data-tx-subheading]', 'fontFamily', BODY], ['[data-tx-subheading]', 'color', 'rgb(204, 204, 204)']],
  wavyrichtextbanner: [['[data-tx-type=heading]', 'fontFamily', HEAD], ['[data-tx-type=caption]', 'fontFamily', BODY], ['.LoudzTextButtonButtons__Primary', 'borderRadius', BTN.borderRadius]],
};
THEME.richtext2 = THEME.richtext1;

/* Settings a select needs before its options can show (gradient on, etc.). */
const NEEDS = {
  badge_gradient_degrees: {section: {enable_custom_style: true, enable_badge: true, badge_text: 'New', badge_enable_gradient: true, badge_gradient_color1: '#ff0000', badge_gradient_color2: '#00ff00', badge_gradient_color3: '#0000ff'}},
  'title.gradient_direction': {blocks: {title: {enable_custom_style: true, enable_title_gradient: true, gradient_start_color: '#ff0000', gradient_end_color: '#0000ff', enable_gradient: true, gradient_start: '#ff0000', gradient_middle: '#00ff00', gradient_end: '#0000ff'}}},
  'subtitle.gradient_direction': {blocks: {subtitle: {enable_custom_style: true, enable_gradient: true, gradient_start: '#ff0000', gradient_middle: '#00ff00', gradient_end: '#0000ff'}}},
  gradient_direction: {section: {enable_custom_style: true, enable_title_gradient: true, gradient_start_color: '#ff0000', gradient_middle_color: '#00ff00', gradient_end_color: '#0000ff'}},
  'button.button_font_weight': {blocks: {button: {use_theme_button: false}}},
  'button.button_hover_animation': {blocks: {button: {use_theme_button: false}}, hover: '[data-tx-type=button]'},
  'buttons.button_font_weight': {blocks: {buttons: {use_theme_button: false}}},
  'buttons.primary_button_style': {blocks: {buttons: {use_theme_button: false}}},
  'buttons.secondary_button_style': {blocks: {buttons: {use_theme_button: false, secondary_button_label: 'More'}}},
  second_text_font_weight: {section: {enable_second_text: true, second_text: 'Two'}},
  'title.font_weight': {blocks: {title: {enable_custom_style: true}}}, 'title.text_case': {blocks: {title: {enable_custom_style: true}}},
  'subtitle.font_weight': {blocks: {subtitle: {enable_custom_style: true}}}, 'subtitle.text_case': {blocks: {subtitle: {enable_custom_style: true}}},
  separator_size: {}, 'heading.heading_weight': {}, 'caption.caption_weight': {},
};
/* Desktop-only and mobile-only selects are compared at their own width. */
/* Option pairs that CSS defines as the same direction (both kept: saved content uses them). */
const SAME = [['to bottom', '180deg']];
/* Container widths only differ past the fluid container (1548px). */
const widthFor = id => /mobile|_m$/.test(id) ? 375 : /^(section_)?width$/.test(id) ? 1700 : 1366;
/* Theme weights that no select option uses, so 'theme' is told apart from a number. */
const THEME_WEIGHTS = ':root{--heading-weight:650;--body-weight:450;--btn-font-weight:550;--heading-text-transform:none}';

const has = (want, got) => want instanceof RegExp ? want.test(got) : typeof want === 'function' ? want(got) : want === got;
const merge = (rendered, change = {}) => rendered.section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...((change.blocks || {})[b.type] || {})}}));

async function read(t, sel, prop) {
  const el = t.root(sel).first();
  if (!(await el.count())) return '(missing ' + sel + ')';
  if (prop.startsWith('attr:')) return el.evaluate((e, a) => e.hasAttribute(a), prop.slice(5));
  return el.evaluate((e, k) => getComputedStyle(e)[k], prop);
}

async function fingerprint(t, hover) {
  if (hover) await t.root(hover).first().hover().catch(() => {});
  await t.page.waitForTimeout(hover ? 350 : 0);
  return t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test, #shopify-section-test *')].filter(e => !e.closest('svg') || e.tagName === 'svg').map(e => {
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    return [e.tagName, e.getAttribute('href'), Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.fontFamily, c.fontWeight, c.fontSize, c.lineHeight, c.letterSpacing, c.textTransform, c.color, c.backgroundColor, c.backgroundImage, c.borderRadius, c.borderTopWidth, c.borderTopColor, c.padding, c.textAlign, c.justifyContent, c.flexDirection, c.animationName, c.transform, c.boxShadow, c.textDecorationLine, e.childElementCount ? '' : e.textContent.trim().slice(0, 30)].join(',');
  }).join('|'));
}

(async () => {
  const only = process.argv.slice(2), browser = await launch(), fails = [];
  let checks = 0;
  const ok = (cond, msg) => { if (cond) checks++; else fails.push(msg); };
  try {
    for (const name of Object.keys(CASES).filter(n => !only.length || only.includes(n))) {
      const assets = assetsFor(name), css = assets.filter(a => a.endsWith('.css'));
      for (const width of [375, 1366]) for (const editing of [true, false]) {
        const where = `${name} ${width} ${editing ? 'editor' : 'storefront'}`;
        const t = await mount(browser, name, {width, editing, assets});
        for (const c of CASES[name]) {
          const verify = async (state, path) => { for (const [sel, prop, on, off] of c.checks) { const got = await read(t, sel, prop); ok(has(state === 'on' ? on : off, got), `${where} ${c.label} ${state} (${path}): ${sel} ${prop} = ${got}`); } };
          /* Live: section settings, then each block of the named types. */
          const live = async change => {
            if (change.section) await t.emit(change.section);
            for (const [type, settings] of Object.entries(change.blocks || {})) for (const b of t.rendered[0].section.blocks.filter(b => b.type === type)) await t.emit(settings, b.id);
            await t.page.waitForTimeout(40);
          };
          await live(c.on); await verify('on', 'live');
          await live(c.off); await verify('off', 'live');
          await t.redraw({settings: c.on.section || {}, blocks: merge(t.rendered[0], c.on)}); await verify('on', 'redraw');
          await t.redraw({settings: c.off.section || {}, blocks: merge(t.rendered[0], c.off)}); await verify('off', 'redraw');
          /* First paint: the Liquid alone, no script. */
          const base = await mount(browser, name, {width, editing, assets: css, inlineScripts: false});
          const fp = await mount(browser, name, {width, editing, assets: css, inlineScripts: false, settings: c.on.section || {}, blocks: merge(base.rendered[0], c.on)});
          await base.page.close();
          for (const [sel, prop, on] of c.checks) { const got = await read(fp, sel, prop); ok(has(on, got), `${where} ${c.label} on (first paint): ${sel} ${prop} = ${got}`); }
          await fp.page.close();
        }
        ok(t.errors.length === 0, `${where} errors: ${t.errors.join('; ')}`);
        ok(await t.noOverflow(), `${where} overflows at ${width}`);
        await t.page.close();
      }
      /* Theme inheritance with priority off. */
      const p = await mount(browser, name, {width: 1366, editing: true, assets, priority: 'off'});
      for (const [sel, prop, want] of THEME[name] || []) { const got = await read(p, sel, prop); ok(has(want, got), `${name} priority off: ${sel} ${prop} = ${got}`); }
      await p.page.close();
      /* Every select option changes its element, priority on. */
      const {schema} = schemaOf(name);
      const lists = [[null, schema.settings]].concat((schema.blocks || []).map(b => [b.type, b.settings]));
      for (const [type, list] of lists) for (const x of list.filter(x => (x.type === 'select' || x.type === 'radio') && !x.hidden && x.options?.length > 1)) {
        const key = type ? type + '.' + x.id : x.id, need = NEEDS[key] || NEEDS[x.id] || {}, width = widthFor(x.id);
        const t = await mount(browser, name, {width, editing: false, assets, settings: need.section || {}});
        await t.page.addStyleTag({content: THEME_WEIGHTS});
        if (type && !t.rendered[0].section.blocks.some(b => b.type === type)) { await t.page.close(); continue; }
        const prints = [];
        for (const o of x.options) {
          const change = type ? {blocks: {...(need.blocks || {}), [type]: {...((need.blocks || {})[type] || {}), [x.id]: o.value}}} : {section: {...(need.section || {}), [x.id]: o.value}, blocks: need.blocks};
          await t.redraw({settings: change.section || {}, blocks: merge(t.rendered[0], change)});
          await t.page.mouse.move(0, 0);
          prints.push([o.value, await fingerprint(t, need.hover)]);
        }
        for (let i = 0; i < prints.length; i++) for (let j = i + 1; j < prints.length; j++) ok(prints[i][1] !== prints[j][1] || SAME.some(p => p.includes(prints[i][0]) && p.includes(prints[j][0])), `${name} select ${key} at ${width}: "${prints[i][0]}" and "${prints[j][0]}" look the same`);
        await t.page.close();
      }
    }
  } finally { await browser.close(); }
  if (fails.length) { console.error(fails.slice(0, 80).join('\n') + (fails.length > 80 ? `\n... ${fails.length - 80} more` : '')); console.error(`${fails.length} failed, ${checks} passed`); process.exit(1); }
  console.log(`${checks} round 3 typography, button shape, first paint, live, redraw, theme-off and select checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
