/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-r6-product-blocks.cjs
   Product information blocks (Main product and Featured product), round 6:
   per block custom colours and custom fonts.

   Static: every block that draws text or a button has Enable custom fonts
   with native font pickers, and (unless it has its own colour switch)
   custom heading and text colours behind its custom styling switch, the
   same in both sections; snippets/product-info-blocks draws each block in a
   display: contents wrapper.

   Rendered in the real layout (Theme settings > Typography priority on) at
   375 and 1366, in the builder and on the storefront, each block on its own
   in Main product, and the same in Featured product:
   - off by default: no data-own-*, the theme's fonts and colours;
   - after a redraw with the switches on: the block's text in the picked
     fonts and colours, data-own-font/-weight/-size in the first paint;
   - live (storelib:settings-change with the block's id): the same as the
     redraw; switched off live: the theme's values back;
   - two blocks of the same kind: an edit to one leaves the other. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const L = require('./theme-r6-main-product-lib.cjs');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };

const main = L.mainSchema();
const feat = L.schemaText(fs.readFileSync(path.join(L.repo, 'sections/featured-product.storelib'), 'utf8')).shopify;
eq(main.blocks, feat.blocks, 'Main product and Featured product declare the same blocks');
const TYPES = main.blocks.filter(b => (b.settings || []).some(s => s.id === 'enable_custom_fonts')).map(b => b.type);
ok(TYPES.length >= 50, `custom fonts on ${TYPES.length} blocks`);
for (const b of main.blocks) {
  const S = id => (b.settings || []).find(s => s.id === id);
  if (['divider_pro', 'custom_liquid'].includes(b.type)) { ok(!S('enable_custom_fonts'), b.type + ': draws no text of its own'); continue; }
  ok(S('enable_custom_fonts').default === false, b.type + ': custom fonts off by default');
  for (const id of ['heading_font', 'body_font']) if (S(id)) ok(S(id).type === 'font_picker' && S(id).visible_if === '{{ block.settings.enable_custom_fonts }}', `${b.type}: ${id} is a font picker shown with custom fonts`);
  ok(S('heading_font') || S('body_font'), b.type + ': at least one font picker');
  const gate = S('enable_custom_style') ? 'enable_custom_style' : S('custom_style') ? 'custom_style' : null;
  if (gate) {
    if (gate === 'enable_custom_style' && !['countdown_timer', 'countdown_badge', 'infotables', 'lod_testimonials_block'].includes(b.type)) ok(S(gate).default === false, b.type + ': custom styling off by default');
    for (const id of ['own_heading_color', 'own_text_color']) if (S(id)) eq(S(id).visible_if, `{{ block.settings.${gate} }}`, `${b.type}: ${id} shows with ${gate}`);
  }
}
const pib = fs.readFileSync(path.join(L.repo, 'snippets/product-info-blocks.storelib'), 'utf8');
ok(/<div class="pib-own" data-pib-block="\{\{ block\.id \}\}"[^>]*style="display: contents">/.test(pib) && /\{%- endcase -%\}\n<\/div>\n<\/template>\s*$/.test(pib), 'every block drawn in its display: contents wrapper');

const GEORGIA = {family: 'Georgia', fallback_families: 'serif'}, COURIER = {family: 'Courier New', fallback_families: 'monospace'};
const ON = {enable_custom_style: true, custom_style: true, own_text_color: '#ff00aa', own_heading_color: '#00aa55', enable_custom_fonts: true, heading_font: GEORGIA, body_font: COURIER};
const OFF = {enable_custom_style: false, custom_style: false, enable_custom_fonts: false};
const schemaOf = type => main.blocks.find(b => b.type === type).settings;
const declared = (type, s) => Object.fromEntries(Object.entries(s).filter(([k]) => schemaOf(type).some(x => x.id === k)));

(async () => {
  if (!L.R5.Liquid) { console.log(`${checks} product block round 6 checks passed (render skipped)`); return; }
  const {chromium} = require('playwright');
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  /* What the block shows: font and colour of each drawn text, and its wrapper's own attributes. */
  const sig = (p, id) => p.evaluate(id => {
    const w = document.querySelector('[data-pib-block="' + id + '"]');
    if (!w) return null;
    for (const a of document.getAnimations()) if (a instanceof CSSTransition) a.finish();
    const out = [];
    for (const e of w.querySelectorAll('*')) {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || /^(STYLE|SCRIPT|SVG|PATH)$/i.test(e.tagName)) continue;
      if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const c = getComputedStyle(e);
      if (c.visibility === 'hidden' || +c.opacity === 0) continue;
      out.push(c.fontFamily + '|' + c.color);
    }
    return {texts: out, own: ['data-own-font', 'data-own-weight', 'data-own-size'].filter(a => w.hasAttribute(a)), display: getComputedStyle(w).display};
  }, id);
  const fails = [];
  try {
    /* the home page's saved Featured product looks as at c098384 */
    const oldTree = L.treeAt('c098384');
    for (const design of [false, true]) for (const width of [375, 1366]) {
      const looks = [];
      for (const tree of [oldTree, L.repo]) {
        const r = await L.renderFeatured({tree, design});
        const o = await L.open(browser, width, r.html, {tree, wait: 1500});
        looks.push((await L.look(o.p, r.id)).map(x => x.replace(/\|\d{1,2}$/, '|<digits>'))); /* a running countdown's digits */
        eq(o.p.errors, [], `saved Featured product ${width}: no page errors`);
        await o.ctx.close();
      }
      ok(looks[0].length > 50, 'the saved Featured product draws');
      eq(L.lookDiff(looks[0], looks[1]), [], `saved Featured product at ${width} (${design ? 'builder' : 'storefront'}) looks as at c098384`);
    }
    for (const [label, render] of [['main', L.renderMain], ['featured', L.renderFeatured]]) for (const design of [true, false]) for (const width of [375, 1366]) {
      const blocks = TYPES.map(t => ({id: 'b_' + t, type: t, settings: {}}));
      /* a second block of the same kind, to check independence */
      blocks.push({id: 'b_text_2', type: 'text', settings: {}});
      /* r00: everything off; gated: the block's custom styling switch on and nothing else (that switch
         may also turn on a block's own older colours, which the builder redraws); r1: all on. */
      const rOff = await render({blocks, design});
      const GATE = {enable_custom_style: true, custom_style: true};
      const gated = await render({blocks: blocks.map(b => ({...b, settings: declared(b.type, b.id === 'b_text_2' ? {} : GATE)})), design});
      const r1 = await render({blocks: blocks.map(b => ({...b, settings: declared(b.type, b.id === 'b_text_2' ? {} : ON)})), design});
      const {p, ctx} = await L.open(browser, width, rOff.html, {wait: 1500});
      const id = rOff.id, theme = {}, base = {}, drawn = {};
      for (const b of blocks) theme[b.id] = await sig(p, b.id);
      await L.redraw(p, id, gated.sectionHtml); await p.waitForTimeout(150);
      for (const b of blocks) base[b.id] = await sig(p, b.id);
      await L.redraw(p, id, r1.sectionHtml); await p.waitForTimeout(150);
      for (const b of blocks) drawn[b.id] = await sig(p, b.id);
      await L.redraw(p, id, gated.sectionHtml); await p.waitForTimeout(150);
      for (const b of blocks) eq(await sig(p, b.id), base[b.id], `${label} ${width} ${b.type}: a redraw takes the custom values away`);
      const LIVE = {own_text_color: ON.own_text_color, own_heading_color: ON.own_heading_color, enable_custom_fonts: true, heading_font: GEORGIA, body_font: COURIER};
      for (const b of blocks) if (b.id !== 'b_text_2') await L.emit(p, {section: id, block: b.id, settings: declared(b.type, LIVE), live: false});
      await p.waitForTimeout(50);
      for (const t of TYPES) {
        const bid = 'b_' + t, a = theme[bid], d = drawn[bid], live = await sig(p, bid);
        const tag = `${label} ${design ? 'builder' : 'storefront'} ${width} ${t}`;
        ok(a && a.display === 'contents', tag + ': drawn in its wrapper');
        eq(a.own, [], tag + ': theme first, no own attributes');
        if (!['countdown_timer', 'countdown_badge', 'infotables', 'lod_testimonials_block', 'upsell_pro', 'benefits_pills', 'bundle', 'quantity_offer'].includes(t) && a.texts.length && base[bid].texts.length) eq(base[bid].texts, a.texts, tag + ': the custom styling switch alone changes nothing');
        eq(d.own, ['data-own-font', 'data-own-weight', 'data-own-size'], tag + ': custom fonts mark the block in the first paint');
        eq(live.own, d.own, tag + ': and live');
        eq(live.texts, d.texts, tag + ': live is the redrawn result');
        if (!a.texts.length) continue; /* nothing drawn without data here */
        const wantFont = /Courier New|Georgia/;
        if (!d.texts.some(x => wantFont.test(x))) fails.push(tag + ': no text in the picked font ' + JSON.stringify(d.texts.slice(0, 4)));
        else checks++;
        if (schemaOf(t).some(s => s.id === 'own_text_color' || s.id === 'own_heading_color')) {
          if (!d.texts.some(x => /rgb\(255, 0, 170\)|rgb\(0, 170, 85\)/.test(x))) fails.push(tag + ': no text in the custom colours ' + JSON.stringify(d.texts.slice(0, 4)));
          else checks++;
        }
      }
      eq(await sig(p, 'b_text_2'), base.b_text_2, `${label} ${width}: a second Text block is left as it was`);
      for (const b of blocks) await L.emit(p, {section: id, block: b.id, settings: declared(b.type, {own_text_color: '', own_heading_color: '', enable_custom_fonts: false}), live: false});
      await p.waitForTimeout(50);
      for (const b of blocks) eq(await sig(p, b.id), base[b.id], `${label} ${width} ${b.type}: switched off live, the values before are back`);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${label} ${width}: no sideways scroll`);
      eq(p.errors, [], `${label} ${width}: no page errors`);
      await ctx.close();
    }
  } finally { await browser.close(); }
  if (fails.length) { console.log(fails.join('\n')); throw new Error(fails.length + ' blocks do not show their custom fonts or colours'); }
  console.log(`${checks} product block round 6 checks passed (custom colours and fonts on ${TYPES.length} block types, Main and Featured product, 375/1366, builder and storefront, first paint, live, off, two blocks)`);
})().catch(e => { console.error(e); process.exit(1); });
