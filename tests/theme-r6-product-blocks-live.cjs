/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-r6-product-blocks-live.cjs
   Product information blocks, round 6: a block setting changed in the
   builder is shown live, from shopify/assets/live-main-product.js, and is the
   same as after the builder's redraw.

   The builder sends storelib:settings-change with the block's id; the
   controller paints the block's custom colours and fonts and the title and
   price sizes itself, and for every other setting asks ?section_id= (the
   builder answers it with the section as it is being edited, which the
   fixture does here from the same Liquid) and puts only that block back in
   place. Checked for every product block type, several settings each (a
   colour, a size, a choice, a text, a switch), in Main product at 375 and
   1366 and in Featured product at 1366: the block shows what a full redraw
   shows (fonts, colours, text, boxes); the gallery and the other blocks are
   the same elements as before; no page errors. Every setting's markup
   change itself is checked by theme-r6-product-block-data. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const L = require('./theme-r6-main-product-lib.cjs');
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };

const {PANTS, OTHER, TALL} = L.R5;
const PROD = {...PANTS, rating: 4.6, review_count: 12};
const G = {collections: {all: {title: 'All', handle: 'all', products: [OTHER, TALL], products_count: 2}}, all_products: {'other-tee': OTHER, 'tall-coat': TALL}};
const IMG = {src: '/img/red.svg', url: '/img/red.svg', width: 800, height: 1000, aspect_ratio: 0.8, alt: 'Red'};
const alt = (x, cur) => {
  switch (x.type) {
    case 'checkbox': return !cur;
    case 'range': return cur === x.max ? x.min : x.max;
    case 'number': return (Number(cur) || 0) + 7;
    case 'select': { const o = (x.options || []).find(o => o.value !== cur); return o && o.value; }
    case 'color': return '#ff00aa';
    case 'text': case 'textarea': return 'Zq words';
    case 'richtext': return '<p>Zq words</p>';
    case 'inline_richtext': return 'Zq words';
    case 'image_picker': return IMG;
    default: return undefined;
  }
};
const main = L.mainSchema();
/* per block: up to six settings of different kinds, each visible with the block's defaults */
const SAMPLE = [];
for (const b of main.blocks) {
  if (b.type === 'custom_liquid') continue;
  const defs = L.defaultsOf(b.settings), seen = new Set();
  for (const x of b.settings || []) {
    if (!x.id || x.hidden || /header|paragraph/.test(x.type) || x.visible_if || ['enable_custom_style', 'custom_style', 'enable_custom_fonts', 'heading_font', 'body_font', 'own_text_color', 'own_heading_color'].includes(x.id)) continue;
    const v = alt(x, defs[x.id]);
    if (v === undefined || seen.has(x.type)) continue;
    seen.add(x.type);
    SAMPLE.push({type: b.type, id: x.id, value: v});
    if (seen.size >= 6) break;
  }
}

(async () => {
  if (!L.R5.Liquid) { console.log('render skipped'); return; }
  const {chromium} = require('playwright');
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  const view = (p, bid) => p.evaluate(bid => {
    const w = document.querySelector('[data-pib-block="' + bid + '"]');
    if (!w) return null;
    for (const a of document.getAnimations()) { if (a instanceof CSSTransition) a.finish(); else { a.pause(); a.currentTime = 0; } }
    const out = [];
    for (const e of w.querySelectorAll('*')) {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height || /^(STYLE|SCRIPT)$/.test(e.tagName)) continue;
      const c = getComputedStyle(e);
      out.push([e.tagName, Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.fontWeight, c.borderRadius, c.borderTopWidth, c.textTransform].join('|'));
    }
    const walk = document.createTreeWalker(w, NodeFilter.SHOW_TEXT, {acceptNode: n => n.parentElement.closest('style, script') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
    let text = ''; while (walk.nextNode()) text += walk.currentNode.textContent;
    return {text: text.replace(/\s+/g, ' ').trim(), out};
  }, bid);
  let swapped = 0;
  try {
    for (const [label, render, width] of [['main', L.renderMain, 1366], ['main', L.renderMain, 375], ['featured', L.renderFeatured, 1366]]) {
      const types = [...new Set(SAMPLE.map(s => s.type))];
      const state = types.map(t => ({id: 'b_' + t, type: t, settings: {}}));
      const draw = async () => (await render({blocks: state, design: true, product: PROD, globals: G})).sectionHtml;
      const r0 = await render({blocks: state, design: true, product: PROD, globals: G});
      const {p, ctx} = await L.open(browser, width, r0.html, {wait: 1500, onSection: draw});
      for (const s of SAMPLE.filter((s, i) => label === 'featured' || width === 1366 ? i % 2 === 0 : i % 2 === 1)) {
        const bid = 'b_' + s.type, blk = state.find(b => b.id === bid);
        const before = await p.evaluate(bid => { const w = document.querySelector('[data-pib-block="' + bid + '"]'); window.__others = [...document.querySelectorAll('[data-pib-block]')].filter(x => x !== w); return w ? w.innerHTML : null; }, bid);
        blk.settings = {...blk.settings, [s.id]: s.value};
        await L.emit(p, {section: r0.id, block: bid, settings: {[s.id]: s.value}, live: true});
        /* wait for the block to be drawn again (or for the request to come back with nothing new) */
        await p.waitForFunction(([bid, before]) => { const w = document.querySelector('[data-pib-block="' + bid + '"]'); return w && w.innerHTML !== before; }, [bid, before], {timeout: 1500}).catch(() => {});
        await p.waitForTimeout(120);
        const live = await view(p, bid);
        const kept = await p.evaluate(() => window.__others.every(x => x.isConnected));
        const html = await draw();
        /* the builder's redraw, which runs the section's inline scripts again */
        await L.redraw(p, r0.id, html);
        await p.evaluate(id => { for (const old of document.querySelectorAll('#shopify-section-' + id + ' script:not([type]), #shopify-section-' + id + ' script[type="text/javascript"]')) { const sc = document.createElement('script'); sc.textContent = old.textContent; old.replaceWith(sc); } }, r0.id);
        await p.waitForTimeout(150);
        const drawn = await view(p, bid);
        const tag = `${label} ${width} ${s.type}.${s.id}`;
        eq(live, drawn, tag + ': live is the redrawn result');
        ok(kept, tag + ': the other blocks were not drawn again');
        swapped++;
      }
      ok(p.sectionRequests > 0, `${label} ${width}: blocks were drawn again from ?section_id= (${p.sectionRequests} requests)`);
      eq(p.errors, [], `${label} ${width}: no page errors`);
      await ctx.close();
    }
  } finally { await browser.close(); }
  console.log(`${checks} product block live checks passed (${swapped} block setting edits, every block type, Main product 375/1366 and Featured product 1366, live equals redraw, other blocks kept)`);
})().catch(e => { console.error(e); process.exit(1); });
