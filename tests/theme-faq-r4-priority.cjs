/* Round 4, FAQ category, under the real theme priority rules
   (snippets/theme-controls: Typography > Use in every section and Buttons >
   Use shared button size and shape, both on in config/settings.json).
   For every custom font, weight, size (line height, letter spacing) and
   button shape switch, in the section and in its blocks: switch it on live
   and through a redraw, at 375 and 1366, in the builder and on the
   storefront, and read the computed style on the element that draws the
   text and on a descendant (a <strong> in a heading, a <p> in rich text);
   switch it off (live and redraw) and the theme value is back, with the
   data-own-* opt-out attribute present only while it is on. Then theme
   inheritance once with both priorities off. Runner shared with
   tests/theme-media-image-video-priority.cjs.

   LIQUIDJS=<path to liquidjs> node tests/theme-faq-r4-priority.cjs */
const assert = require('assert');
const {run, FONT, MONO} = require('./theme-media-image-video-priority.cjs');
const {schemaOf, launch, mount} = require('./media-fixture.cjs');

const A = 'live-faq.js';
const P = {faq: 'faq6', faq1: 'faq1', faq5: 'faq5', 'faq-pro': 'faq7', 'faq-side-image': 'fsi', 'faq-tabs': 'fqt', 'faq-floating': 'ffq'};
const BP = {'faq-side-image': 1024};
const assets = n => n === 'faq-pro' ? ['faq-pro.css', A] : [A];
const preset = n => JSON.parse(JSON.stringify(schemaOf(n).schema.presets[0].blocks));
/* a heading with a <strong> and rich text with a paragraph, so descendants are read too */
const blocks = n => preset(n).map(b => b.type === 'heading' ? {...b, settings: {...(b.settings || {}), text: 'Questions <strong>answered</strong>'}} : b);
const noHeadingBlocks = n => preset(n).filter(b => b.type !== 'heading' && b.type !== 'subheading');

const cases = [], offs = [];
for (const [name, p] of Object.entries(P)) {
  const m = {assets: assets(name), blocks: blocks(name)}, bp = BP[name] || 768, D = w => w >= bp;
  const H = '.' + p + '__heading', HS = H + ' strong', SUB = (name === 'faq-tabs' ? '.fqt__sub' : '.' + p + '__subheading') + ' p', ANS = '[data-faq-answer] p', Q = '[data-faq-question]';
  const tabs = name === 'faq-tabs';
  /* section custom fonts: headings and questions take the heading font, subheading and answers the body font */
  cases.push({name, asset: A, mount: m, label: 'section custom fonts', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily'], ['sp', SUB, 'fontFamily'], ['ap', ANS, 'fontFamily'], ['q', Q, 'fontFamily']],
    on: {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/, sp: /Courier New/, ap: /Courier New/, q: /Verdana/},
    attrs: [[H, 'data-own-font'], [ANS.replace(' p', ''), 'data-own-font']]});
  /* heading block: font, weight, size */
  cases.push({name, asset: A, mount: m, block: 'heading', label: 'heading custom font', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily']], on: {enable_custom_fonts: true, font: FONT}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/}, attrs: [[H, 'data-own-font']]});
  cases.push({name, asset: A, mount: m, block: 'heading', label: 'heading custom weight', probes: [['w', H, 'fontWeight'], ['ws', HS, 'fontWeight']],
    on: tabs ? {weight: '500'} : {weight_enable: true, weight: '300'}, off: tabs ? {weight: 'theme'} : {weight_enable: false}, want: {w: tabs ? '500' : '300'}, attrs: [[H, 'data-own-weight']]});
  cases.push({name, asset: A, mount: m, block: 'heading', label: 'heading custom size', probes: [['fs', H, 'fontSize'], ['lh', H, 'lh'], ['ls', H, 'letterSpacing'], ['lss', HS, 'letterSpacing']],
    on: tabs ? {size_enable: true, line_height: 1.7, tracking: 2} : {size_enable: true, size_desktop: 61, size_mobile: 21, line_height: 1.7, tracking: 2},
    off: {size_enable: false}, want: tabs ? {lh: '1.70', ls: '2px', lss: '2px'} : {fs: w => D(w) ? '61px' : '21px', lh: '1.70', ls: '2px', lss: '2px'}, attrs: [[H, 'data-own-size']]});
  /* subheading block: font (and weight and size where it has them) */
  cases.push({name, asset: A, mount: m, block: 'subheading', label: 'subheading custom font', probes: [['sp', SUB, 'fontFamily']], on: {enable_custom_fonts: true, font: MONO}, off: {enable_custom_fonts: false}, want: {sp: /Courier New/}, attrs: [[SUB.replace(' p', ''), 'data-own-font']]});
  if (!tabs) {
    cases.push({name, asset: A, mount: m, block: 'subheading', label: 'subheading custom weight', probes: [['w', SUB, 'fontWeight']], on: {weight_enable: true, weight: '700'}, off: {weight_enable: false}, want: {w: '700'}, attrs: [[SUB.replace(' p', ''), 'data-own-weight']]});
    cases.push({name, asset: A, mount: m, block: 'subheading', label: 'subheading custom size', probes: [['fs', SUB, 'fontSize'], ['lh', SUB, 'lh']], on: {size_enable: true, size: 23, line_height: 2}, off: {size_enable: false}, want: {fs: '23px', lh: '2.00'}, attrs: [[SUB.replace(' p', ''), 'data-own-size']]});
  }
  /* the section's own heading weight, on the older Heading setting (no heading block) and on a heading block */
  const lm = {assets: assets(name), blocks: noHeadingBlocks(name), settings: {heading: 'Older <strong>heading</strong>'}};
  if (['faq', 'faq1', 'faq5', 'faq-pro'].includes(name)) {
    cases.push({name, asset: A, mount: lm, label: 'section heading weight (older heading)', probes: [['w', H, 'fontWeight'], ['ws', HS, 'fontWeight']], on: {enable_custom_heading_weight: true, heading_weight: '300'}, off: {enable_custom_heading_weight: false}, want: {w: '300'}, attrs: [[H, 'data-own-weight']]});
    cases.push({name, asset: A, mount: m, label: 'section heading weight (heading block)', probes: [['w', H, 'fontWeight']], on: {enable_custom_heading_weight: true, heading_weight: '300'}, off: {enable_custom_heading_weight: false}, want: {w: '300'}, attrs: [[H, 'data-own-weight']]});
    cases.push({name, asset: A, mount: m, label: 'question weight', probes: [['w', Q, 'fontWeight']], on: {enable_custom_question_weight: true, question_weight: '400'}, off: {enable_custom_question_weight: false}, want: {w: '400'}});
  }
  if (['faq-side-image', 'faq-floating'].includes(name)) {
    cases.push({name, asset: A, mount: lm, label: 'heading weight (older heading)', probes: [['w', H, 'fontWeight'], ['ws', HS, 'fontWeight']], on: {heading_weight: '500'}, off: {heading_weight: 'theme'}, want: {w: '500'}, attrs: [[H, 'data-own-weight']]});
    cases.push({name, asset: A, mount: m, label: 'heading weight (heading block)', probes: [['w', H, 'fontWeight']], on: {heading_weight: '500'}, off: {heading_weight: 'theme'}, want: {w: '500'}, attrs: [[H, 'data-own-weight']]});
  }
  if (name === 'faq-floating') cases.push({name, asset: A, mount: m, label: 'card question weight', probes: [['w', '.ffq__card-q', 'fontWeight']], on: {q_weight: '500'}, off: {q_weight: 'theme'}, want: {w: '500'}, attrs: [['.ffq__card-q', 'data-own-weight']]});
  if (name === 'faq-pro') {
    const B = '[data-faq-btn]';
    cases.push({name, asset: A, mount: m, block: 'button', label: 'button own shape', probes: [['pl', B, 'paddingLeft'], ['pt', B, 'paddingTop'], ['r', B, 'borderTopLeftRadius'], ['fs', B, 'fontSize']],
      on: {use_theme_button: false, size: 'small', radius: 21}, off: {use_theme_button: true}, want: {pl: '18px', pt: '10px', r: '21px', fs: '13px'}, attrs: [[B, 'data-own-shape']]});
    cases.push({name, asset: A, mount: m, block: 'button', label: 'button own shape, large', probes: [['pl', B, 'paddingLeft'], ['pt', B, 'paddingTop'], ['r', B, 'borderTopLeftRadius']],
      on: {use_theme_button: false, size: 'large', radius: 3}, off: {use_theme_button: true}, want: {pl: '32px', pt: '16px', r: '3px'}, attrs: [[B, 'data-own-shape']]});
  }
  offs.push([name, [['h', H, 'fontFamily'], ['hw', H, 'fontWeight'], ['ap', ANS, 'fontFamily'], ['bg', '[data-faq-root]', 'backgroundColor']], {h: /Georgia/, hw: '700', ap: /Arial/, bg: 'rgb(24, 32, 40)'}]);
}

/* With both priorities off the theme still sets the defaults (FAQ 4 needs its stylesheet too). */
async function priorityOff() {
  const browser = await launch();
  let n = 0;
  try {
    for (const [name, probes, want] of offs) for (const width of [375, 1366]) {
      const t = await mount(browser, name, {width, editing: true, assets: assets(name), priority: 'off'});
      await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      for (const [label, sel, prop] of probes) {
        const v = await t.css(sel, prop), w = want[label];
        assert.ok(w instanceof RegExp ? w.test(v) : v === w, name + ' priority off @' + width + ' ' + label + ': ' + v); n++;
      }
      assert.deepStrictEqual(t.errors, [], name + ' priority off errors'); n++;
      await t.page.close();
    }
  } finally { await browser.close(); }
  console.log(n + ' FAQ priority-off inheritance checks passed');
}

(async () => {
  await run(cases, [], 'FAQ');
  if (process.exitCode) return;
  await priorityOff();
})().catch(e => { console.error(e); process.exit(1); });
