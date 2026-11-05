/* Round 3: custom typography and button shape win over the real theme priority
   rules (snippets/theme-controls: Typography > Use in every section and
   Buttons > Use shared button size and shape, both on in config/settings.json).
   For every custom toggle: switch it on live and through a redraw, at 375 and
   1366, in editor and storefront, and assert the computed style on the element
   that draws the text and on a descendant; switch it off (live and redraw) and
   assert the theme value is back. Also theme inheritance once with priority off.
   Image (image-section) and Video (video). Video 2 has no typography or button
   controls, so it only gets the priority-off inheritance check.
   run(cases) is shared with tests/theme-media-benefits-priority.cjs. */
const assert = require('assert');
const {launch, mount} = require('./media-fixture.cjs');

let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); checks++; };
const FONT = {family: 'Verdana', fallback_families: 'sans-serif', weight: 400, style: 'normal'};
const MONO = {family: 'Courier New', fallback_families: 'monospace', weight: 400, style: 'normal'};

/* probe: [label, selector, property | 'lh' (line height / font size)] */
async function read(t, probes) {
  /* let the controller's frame-batched paint land first (the runs are parallel, so frames can lag) */
  await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const out = {};
  for (const [label, sel, prop] of probes) out[label] = await t.page.evaluate(({sel, prop, uid}) => {
    const el = document.querySelector('#shopify-section-' + uid + ' ' + sel); if (!el) return 'missing ' + sel;
    const cs = getComputedStyle(el);
    return prop === 'lh' ? (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2) : cs[prop];
  }, {sel, prop, uid: t.section.id});
  return out;
}
const attrs = (t, list) => t.page.evaluate(({list, uid}) => list.map(([sel, a]) => { const el = document.querySelector('#shopify-section-' + uid + ' ' + sel); return !!el && el.hasAttribute(a); }), {list, uid: t.section.id});
const match = (have, want, m) => { if (want instanceof RegExp) ok(want.test(have), m + ': ' + have + ' !~ ' + want); else eq(have, want, m); };

/* A case: {name, label, block?, on, off, want: {label: value | RegExp | (width) => value}, probes, attrs, bp} */
async function one(browser, c, width, editing) {
  const t = await mount(browser, c.name, {width, editing, assets: [c.asset], ...(c.mount || {})});
  const block = c.block ? t.blockId(c.block) : undefined;
  const redraw = async s => c.block
    ? t.redraw({blocks: t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.id === block ? {...b.settings, ...s} : b.settings}))})
    : t.redraw({settings: s});
  const tag = `${c.name} ${c.label} @${width} ${editing ? 'editor' : 'store'}`;
  await redraw(c.off);
  const theme = await read(t, c.probes);
  ok(!(await attrs(t, c.attrs || [])).some(Boolean), tag + ' no opt-out attribute while off');
  const check = async how => {
    const now = await read(t, c.probes);
    for (const [label, w] of Object.entries(c.want)) {
      const want = typeof w === 'function' ? w(width) : w;
      match(now[label], want, `${tag} ${how} ${label}`);
      if (!c.same || !c.same.includes(label)) ok(now[label] !== theme[label], `${tag} ${how} ${label} differs from the theme value ${theme[label]}`);
    }
    eq(await attrs(t, c.attrs || []), (c.attrs || []).map(() => true), tag + ' ' + how + ' opt-out attributes');
  };
  const back = async how => { eq(await read(t, c.probes), theme, `${tag} ${how} theme values back`); ok(!(await attrs(t, c.attrs || [])).some(Boolean), tag + ' ' + how + ' attributes removed'); };
  /* A section whose settings JSON is printed in the builder only (request.design_mode) is edited live
     in the builder; a visitor's page only ever gets the redrawn markup. */
  const live = editing || await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test *')].some(e => [...e.attributes].some(a => /^data-[a-z0-9-]+-settings$/.test(a.name))));
  if (live) {
    await t.emit(c.on, block); await check('live on');
    await t.emit(c.off, block); await back('live off');
  }
  await redraw(c.on); await check('redraw on');
  if (live) {
    await t.emit(c.off, block); await back('redraw on, live off');
    await t.emit(c.on, block); await check('redraw on, live off, live on');
  }
  await redraw(c.off); await back('redraw off');
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

/* With both priorities off the theme still sets the defaults. */
async function priorityOff(browser, name, asset, probes, want) {
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: true, assets: [asset], priority: 'off'});
    const now = await read(t, probes);
    for (const [label, w] of Object.entries(want)) match(now[label], w, `${name} priority off @${width} ${label}`);
    eq(t.errors, [], name + ' priority off errors');
    await t.page.close();
  }
}

async function run(cases, offs, title) {
  const browser = await launch();
  try {
    const jobs = [];
    for (const c of cases) jobs.push((async () => { for (const width of [375, 1366]) for (const editing of [true, false]) await one(browser, c, width, editing); })());
    for (let i = 0; i < jobs.length; i += 6) await Promise.all(jobs.slice(i, i + 6));
    for (const o of offs) await priorityOff(browser, ...o);
    console.log(checks + ' ' + title + ' priority checks passed (' + cases.length + ' custom toggles x 2 widths x 2 modes, live and redraw, on and off; ' + offs.length + ' priority-off inheritance runs)');
  } catch (e) { console.error(e); process.exitCode = 1; } finally { await browser.close(); }
}

const IV = 'media-live-image-video.js';
const VP = [['h', '.loud-title', 'fontFamily'], ['hw', '.loud-title', 'fontWeight'], ['hb', '.loud-title strong', 'fontFamily'], ['hbw', '.loud-title strong', 'fontWeight'], ['hlh', '.loud-title', 'lh'], ['hfs', '.loud-title', 'fontSize'], ['t', '.loud-text', 'fontFamily'], ['tlh', '.loud-text', 'lh'], ['tfs', '.loud-text', 'fontSize']];
const CASES = [
  {name: 'video', asset: IV, block: 'headline', label: 'headline custom font + weight', probes: VP, on: {override_font: true, headline_font: FONT, font_weight: '300', headline: 'Video <strong>Heading</strong>'}, off: {override_font: false, headline: 'Video <strong>Heading</strong>'}, want: {h: /Verdana/, hw: '300', hb: /Verdana/}, attrs: [['.loud-title', 'data-own-font'], ['.loud-title', 'data-own-weight']]},
  {name: 'video', asset: IV, block: 'headline', label: 'headline line height', probes: VP, on: {headline_line_height: '1.7'}, off: {headline_line_height: 'inherit'}, want: {hlh: '1.70'}, attrs: [['.loud-title', 'data-own-size']]},
  {name: 'video', asset: IV, block: 'headline', label: 'headline custom size', probes: VP, on: {enable_custom_size: true, headline_size: 60, mobile_headline_size: 22}, off: {enable_custom_size: false}, want: {hfs: w => w >= 801 ? '60px' : '22px'}},
  {name: 'video', asset: IV, block: 'subtext', label: 'subtext custom font', probes: VP, on: {override_font: true, text_font: MONO}, off: {override_font: false}, want: {t: /Courier New/}, attrs: [['.loud-text', 'data-own-font']]},
  {name: 'video', asset: IV, block: 'subtext', label: 'subtext line height', probes: VP, on: {text_line_height: '2.0'}, off: {text_line_height: 'inherit'}, want: {tlh: '2.00'}, attrs: [['.loud-text', 'data-own-size']]},
  {name: 'video', asset: IV, block: 'subtext', label: 'subtext custom size', probes: VP, on: {enable_custom_size: true, text_size: 24, mobile_text_size: 12}, off: {enable_custom_size: false}, want: {tfs: w => w >= 801 ? '24px' : '12px'}},
  {name: 'image-section', asset: IV, label: 'caption custom font', probes: [['c', '.iv-img__caption', 'fontFamily'], ['cs', '.iv-img__caption strong', 'fontFamily']], on: {enable_custom_fonts: true, body_font: FONT, image_description: 'Caption <strong>text</strong>'}, off: {enable_custom_fonts: false, image_description: 'Caption <strong>text</strong>'}, want: {c: /Verdana/, cs: /Verdana/}, attrs: [['.iv-img__caption', 'data-own-font']]},
  {name: 'image-section', asset: IV, label: 'caption size', probes: [['fs', '.iv-img__caption', 'fontSize']], on: {image_description_fz: 40, image_description_fz_mobile: 11}, off: {image_description_fz: 23, image_description_fz_mobile: 17}, want: {fs: w => w >= 750 ? '40px' : '11px'}, same: []},
];
const OFFS = [
  ['video', IV, [['h', '.loud-title', 'fontFamily'], ['hw', '.loud-title', 'fontWeight'], ['t', '.loud-text', 'fontFamily'], ['c', '.loud-title', 'color']], {h: /Georgia/, hw: '700', t: /Arial/, c: 'rgb(255, 255, 255)'}],
  ['image-section', IV, [['c', '.iv-img__caption', 'fontFamily']], {c: /Arial/}],
  ['video-2', IV, [['bg', '.vid2', 'backgroundColor']], {bg: 'rgb(24, 32, 40)'}],
];

module.exports = {run, FONT, MONO};
if (require.main === module) run(CASES, OFFS, 'image-video');
