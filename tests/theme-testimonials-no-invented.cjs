/* LIQUIDJS=<path> node tests/theme-testimonials-no-invented.cjs
   Testimonial sections invent nothing: no preset or schema default holds a
   rating, star count, invented quote, handle, date or "Verified buyer" role,
   and the first preset as added draws no stars or score (editor and
   storefront). A rating typed in later draws its stars live. */
const assert = require('assert/strict');
const {launch, mount, schemaOf} = require('./media-fixture.cjs');
const SECTIONS = {
  reviews2: {block: 'review', rating: 'rating', asset: 'live-testimonials.js'},
  testimonials: {block: 'testimonial', rating: 'rating', asset: 'live-testimonials.js'},
  testimonials3: {block: 'testimonial', rating: 'rating', asset: 'live-testimonials.js'},
  testimonials4: {block: 'testimonial', rating: 'rating', asset: 'live-testimonials.js'},
  testimon4: {block: 'testimonials', rating: 'stars_count', asset: 'live-testimonials.js'},
  testimonial2: {block: 'testimonial', rating: 'stars_rating', asset: 'testimonial-quote.js'},
  'testimonial-video': {block: 'video_card', rating: 'rating', asset: 'live-testimonials.js'},
  comunitysldier: {block: null, asset: 'live-testimonials.js'},
};
const STARS = '.lt-stars, .tm-card__rating, .tq-rating, .t4__stars, .stars, .t4__score, .cfs__score';
const BAD = /verified|@\w|\b(19|20)\d\d\b|exceptional|john doe|\bbest\b/i;
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
(async () => {
  const browser = await launch();
  try {
    for (const [name, c] of Object.entries(SECTIONS)) {
      const {schema} = schemaOf(name);
      const defaults = [...schema.settings.map(x => ['', x]), ...(schema.blocks || []).flatMap(b => (b.settings || []).map(x => [b.type, x]))];
      for (const [bt, x] of defaults) {
        if (!x.id) continue;
        if (/^(rating|stars_count|stars_rating|overall_score_int)$/.test(x.id) && (bt || name === 'testimon4')) ok(!x.default, name + ' ' + bt + '.' + x.id + ': default draws no rating (' + x.default + ')');
        if (typeof x.default === 'string') ok(!BAD.test(x.default), name + ' ' + bt + '.' + x.id + ': default invents nothing (' + x.default + ')');
      }
      const preset = schema.presets[0];
      ok(!BAD.test(JSON.stringify(preset)), name + ': first preset invents nothing');
      for (const b of preset.blocks || []) ok(!Object.keys(b.settings || {}).some(k => /^(rating|stars_count|stars_rating|value|score|username|product_name)$/.test(k)), name + ': preset block ' + b.type + ' sets no rating, answer or handle');
      ok(!('rating' in (preset.settings || {})), name + ': preset sets no section rating');
      for (const editing of [true, false]) {
        const tag = name + (editing ? ' editor' : ' storefront');
        const t = await mount(browser, name, {editing, width: 1366, blocks: JSON.parse(JSON.stringify(preset.blocks || [])), settings: preset.settings || {}, assets: [c.asset]});
        await t.page.waitForTimeout(80);
        const vis = await t.page.evaluate(sel => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map(e => e.className), STARS);
        ok(vis.length === 0, tag + ': preset draws no stars or score (' + vis.slice(0, 3) + ')');
        const text = await t.page.evaluate(() => document.querySelector('[id^="shopify-section-"]').innerText);
        ok(!BAD.test(text), tag + ': no invented name, handle, date or role on the page');
        if (c.block && editing) {
          const id = t.blockId(c.block, 0);
          await t.emit({[c.rating]: 4}, id);
          await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
          const shown = await t.page.evaluate(([sel, id]) => { const el = document.querySelector('[data-lt-block="' + id + '"], [data-quote-block="' + id + '"], [data-tm-block="' + id + '"], [data-block-id="' + id + '"]') || document; return [...el.querySelectorAll(sel)].filter(e => e.getClientRects().length).length; }, [STARS, id]);
          ok(shown > 0, tag + ': a typed rating draws its stars live');
        }
        ok(t.errors.length === 0, tag + ': no errors ' + t.errors.slice(0, 2));
        await t.page.close();
      }
    }
    console.log(checks + ' testimonial no-invented checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
