/* Hero Benefits custom fonts: native font pickers (heading_font_picker,
   body_font_picker, the heading block's heading_font_picker) with the old
   font lists kept as hidden legacy ids that still draw a saved font while the
   picker is on its default. With the real theme priority rules, at 375 and
   1366, in the editor and on the storefront:
   - the schema keeps every id, the pickers show only with custom fonts and
     the legacy lists never show;
   - first paint (Liquid, no script) equals the hydrated paint
     (shopify/assets/hero-benefits.js) for pickers, legacy handles and a
     heading block's own font, data-own-font included;
   - live edits paint what a redraw paints, and custom fonts off restores the
     theme fonts and drops data-own-font;
   - the saved home page instance looks the same as at HEAD.
   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-hero-gaps-hero-benefits.cjs */
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), {execSync} = require('child_process');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const NAME = 'hero-benefits', ASSET = 'hero-benefits.js';
const VERDANA = {family: 'Verdana', fallback_families: 'sans-serif'}, COURIER = {family: 'Courier New', fallback_families: 'monospace'}, TAHOMA = {family: 'Tahoma', fallback_families: 'sans-serif'};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const frames = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const fam = v => v.replace(/"/g, '').split(',')[0].trim();

/* fonts of every text element, plus who opts out of the theme priority */
const look = t => t.page.evaluate(() => {
  const root = document.querySelector('#shopify-section-test [data-hero-benefits]'), f = el => el ? getComputedStyle(el).fontFamily : null;
  const q = s => root.querySelector(s);
  return {heading: f(q('.hb__heading')), accent: f(q('.hb__accent')), title: f(q('.hb__benefit-title')), desc: f(q('.hb__benefit-desc p')), strong: f(q('.hb__benefit-desc strong')),
    rootOwn: root.hasAttribute('data-own-font'), headOwn: !!q('[data-hb-heading-block][data-own-font]'), weight: getComputedStyle(q('.hb__heading')).fontWeight, size: getComputedStyle(q('.hb__heading')).fontSize};
});
const BLOCKS = (heading = {}) => [
  {type: 'heading', settings: {heading: 'Fabric that lasts', accent_word: 'lasts', ...heading}},
  {type: 'image', settings: {}},
  {type: 'benefit', settings: {title: 'Free returns', description: '<p>Send it back within <strong>30 days</strong>.</p>'}},
  {type: 'benefit', settings: {title: 'Made to order', description: '<p>Cut and sewn after you order.</p>'}},
];

(async () => {
  const {schema} = schemaOf(NAME);
  eq(schemaProblems(NAME), [], 'schema problems');
  const head = JSON.parse(execSync('git show HEAD:sections/hero-benefits.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 64 << 20}).split('<schema>')[1].split('</schema>')[0]).shopify;
  const ids = l => l.filter(x => x.id).map(x => x.id);
  eq(ids(head.settings).filter(id => !ids(schema.settings).includes(id)), [], 'keeps every section id');
  for (const hb of head.blocks) eq(ids(hb.settings).filter(id => !ids(schema.blocks.find(b => b.type === hb.type).settings).includes(id)), [], 'keeps every ' + hb.type + ' id');
  const S = id => schema.settings.find(x => x.id === id), HB = id => schema.blocks.find(b => b.type === 'heading').settings.find(x => x.id === id);
  for (const [x, cond] of [[S('heading_font_picker'), 'section.settings.enable_custom_fonts'], [S('body_font_picker'), 'section.settings.enable_custom_fonts'], [HB('heading_font_picker'), 'block.settings.enable_custom_fonts']]) ok(x && x.type === 'font_picker' && x.visible_if === '{{ ' + cond + ' }}', 'a native font picker that shows with custom fonts: ' + (x && x.id));
  for (const x of [S('heading_font'), S('body_font'), HB('heading_font')]) ok(x.type === 'select' && x.visible_if === '{{ false }}' && /Legacy/.test(x.info), 'legacy font list ' + x.id + ' stays, never shown');

  const CASES = [
    ['theme', {}, {}, {heading: 'Georgia', title: 'Georgia', desc: 'Arial', rootOwn: false, headOwn: false}],
    ['pickers', {enable_custom_fonts: true, heading_font_picker: VERDANA, body_font_picker: COURIER}, {}, {heading: 'Verdana', title: 'Verdana', desc: 'Courier New', rootOwn: true, headOwn: false}],
    ['legacy handles', {enable_custom_fonts: true, heading_font: 'open_sans_n4', body_font: 'playfair_display_n4'}, {}, {heading: 'Open Sans', title: 'Open Sans', desc: 'Playfair Display', rootOwn: true, headOwn: false}],
    ['legacy theme fonts', {enable_custom_fonts: true, heading_font: 'theme_body', body_font: 'theme_heading'}, {}, {heading: 'Arial', title: 'Arial', desc: 'Georgia', rootOwn: true, headOwn: false}],
    ['picker over legacy', {enable_custom_fonts: true, heading_font_picker: TAHOMA, heading_font: 'open_sans_n4'}, {}, {heading: 'Tahoma', title: 'Tahoma', desc: 'Assistant', rootOwn: true, headOwn: false}],
    ['heading block font', {}, {enable_custom_fonts: true, heading_font_picker: TAHOMA}, {heading: 'Tahoma', title: 'Georgia', desc: 'Arial', rootOwn: false, headOwn: true}],
    ['heading block legacy', {enable_custom_fonts: true, heading_font_picker: VERDANA}, {enable_custom_fonts: true, heading_font: 'lora_n4'}, {heading: 'Lora', title: 'Verdana', desc: 'Assistant', rootOwn: true, headOwn: true}],
  ];
  const browser = await launch();
  try {
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const where = width + (editing ? ' editor' : ' storefront');
      for (const [label, settings, heading, want] of CASES) {
        const opts = {width, editing, settings, blocks: BLOCKS(heading)};
        const a = await mount(browser, NAME, opts), b = await mount(browser, NAME, {...opts, assets: [ASSET]});
        await frames(b);
        const la = await look(a), lb = await look(b);
        eq(la, lb, `${where} ${label}: first paint equals hydrated paint`);
        const got = {heading: fam(lb.heading), title: fam(lb.title), desc: fam(lb.desc), rootOwn: lb.rootOwn, headOwn: lb.headOwn};
        eq(got, want, `${where} ${label}: fonts land on their elements under the theme priority`);
        ok(lb.strong === lb.desc && lb.accent === lb.heading, `${where} ${label}: bold and accent words keep the font`);
        eq(a.errors.concat(b.errors), [], `${where} ${label}: no errors`);
        await a.page.close(); await b.page.close();
      }
      if (!editing) continue;
      /* live equals redraw, and off restores the theme */
      const t = await mount(browser, NAME, {width, editing, blocks: BLOCKS(), assets: [ASSET]});
      const base = await look(t);
      for (const [label, settings, heading] of CASES.slice(1)) {
        await t.emit(settings); if (Object.keys(heading).length) await t.emit(heading, t.blockId('heading')); await frames(t);
        const live = await look(t);
        const r = await mount(browser, NAME, {width, editing, settings, blocks: BLOCKS(heading), assets: [ASSET]}); await frames(r);
        eq(live, await look(r), `${where} ${label}: live equals redraw`);
        await r.page.close();
        await t.emit({enable_custom_fonts: false, heading_font_picker: 'assistant_n4', body_font_picker: 'assistant_n4', heading_font: 'assistant_n4', body_font: 'assistant_n4'});
        await t.emit({enable_custom_fonts: false, heading_font_picker: 'assistant_n4', heading_font: 'assistant_n4'}, t.blockId('heading')); await frames(t);
        eq(await look(t), base, `${where} ${label}: custom fonts off restores the theme live`);
      }
      eq(t.errors, [], where + ' live: no errors');
      await t.page.close();
      /* priority off: the theme fonts still decide by default */
      const p = await mount(browser, NAME, {width, editing, blocks: BLOCKS(), assets: [ASSET], priority: 'off'}); await frames(p);
      const lp = await look(p); ok(fam(lp.heading) === 'Georgia' && fam(lp.desc) === 'Arial', where + ' priority off: theme fonts');
      await p.page.close();
    }
    /* the saved home instance (custom fonts off) looks the same as at HEAD */
    const tj = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates/home.json'), 'utf8'));
    const nowPath = path.join(__dirname, '../sections/hero-benefits.storelib'), nowRaw = fs.readFileSync(nowPath, 'utf8');
    const headRaw = execSync('git show HEAD:sections/hero-benefits.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 64 << 20});
    const headJs = execSync('git show HEAD:shopify/assets/hero-benefits.js', {cwd: path.join(__dirname, '..'), encoding: 'utf8'});
    const jsPath = path.join(__dirname, '../shopify/assets/hero-benefits.js');
    const {fingerprint} = require('./theme-logos-r4-lib.cjs');
    for (const [key, s] of Object.entries(tj.sections).filter(([, s]) => s.type === NAME)) {
      const blocks = s.block_order.map(k => s.blocks[k]).map(b => ({type: b.type, settings: b.settings || {}}));
      for (const width of [375, 1366]) for (const editing of [true, false]) {
        const draw = async (raw, js) => {
          const real = fs.readFileSync; fs.readFileSync = (f, ...a) => String(f) === nowPath ? raw : String(f) === jsPath ? js : real(f, ...a);
          let t; try { t = await mount(browser, NAME, {width, editing, settings: s.settings, blocks, assets: [ASSET]}); } finally { fs.readFileSync = real; }
          await frames(t); await t.page.waitForTimeout(200);
          const f = (await fingerprint(t.page, 'test')).map(x => x.replace(/\|[^|]*\|/, '|')); await t.page.close(); return f;
        };
        const was = await draw(headRaw, headJs), now = await draw(nowRaw, fs.readFileSync(jsPath, 'utf8'));
        eq(now, was, `home.json ${key} ${width} ${editing ? 'editor' : 'storefront'}: saved instance looks the same as at HEAD`);
      }
    }
    console.log(checks + ' Hero Benefits font picker, legacy font, first paint, live, priority and saved-instance checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
