/* Hero and banners (round 4 re-verification): custom typography and button
   shape win under the real theme priority rules (snippets/theme-controls),
   on every text element and its descendants (a <strong> or <em> inside a
   heading or a paragraph), at 375 and 1366, in the editor and on the
   storefront, both from the Liquid (redraw) and after live edits; with the
   switches off the theme fonts are back. Also: the saved home page instances
   look the same as before this round (rendered from git HEAD), and every
   schema passes the shared checks.

   With every custom switch on, a section must paint each text element the
   same with Theme settings priority on and off: anything the priority rule
   still overrides is a control that does nothing on the real site. */
const assert = require('assert/strict');
const fs = require('fs'), path = require('path'), {execSync} = require('child_process');
const {launch, mount, schemaOf, schemaProblems, render} = require('./media-fixture.cjs');
const {fingerprint} = require('./theme-logos-r4-lib.cjs');
const ASSETS = ['hero-pro-scrolling.css', 'marketing-sections.css', 'hero-product-three.css', 'hero-product-two.css', 'hero-image-one.css', 'hero-pro-scrolling.js', 'hero-product-two.js', 'hero-product-one.js', 'hero-product-three.js', 'marketing-sections.js', 'hero-benefits.js'];
const SECTIONS = ['banner3', 'hero-benefits', 'hero-image1', 'hero-pro-scrolling', 'hero-product2', 'hero-product3', 'hero-section-pro', 'heroproduct1', 'promo-banner-2', 'promo-banner-4', 'promotion-banner-pro-2'];
const FONT = {family: 'Courier New', fallback_families: 'monospace', weight: 300};
const only = process.argv[2];

/* every custom switch on, with values that differ from the theme */
function customize(list) {
  const out = {};
  for (const x of list || []) {
    if (!x.id) continue;
    if (x.type === 'checkbox' && /custom|override|own_/.test(x.id) && !/hide|disable/.test(x.id)) out[x.id] = true;
    if (x.type === 'checkbox' && /use_theme_button|theme_button|use_theme_font|inherit/.test(x.id)) out[x.id] = false;
    if (x.type === 'font_picker') out[x.id] = FONT;
    if (x.type === 'select' && /weight/.test(x.id)) { const o = x.options.map(o => o.value).find(v => /^[1-9]00$/.test(v) && v !== '700' && v !== '400'); if (o) out[x.id] = o; }
    if (x.type === 'select' && /(^font$|font_source|font_family|_font$|quote_font)/.test(x.id)) { const vals = x.options.map(o => o.value); const o = vals.find(v => v === 'courier_new_n4') || vals.find(v => /custom/.test(v)) || vals.find(v => v !== x.default && !/theme$|inherit/.test(v)); if (o) out[x.id] = o; }
    if (x.type === 'select' && /(transform|case)/.test(x.id)) { const o = x.options.map(o => o.value).find(v => v === 'uppercase'); if (o) out[x.id] = o; }
    if (x.type === 'range' && /letter|tracking|line_height|lineheight/.test(x.id)) out[x.id] = x.max;
    if (x.type === 'text' && /line_?height/.test(x.id)) out[x.id] = '2';
    if (x.type === 'range' && /^(font_size|radius|padding_x|padding_y)$/.test(x.id)) out[x.id] = x.min + Math.round((x.max - x.min) / 3);
  }
  return out;
}
/* rich text with inline markup, so descendants are checked too */
function richer(list, base) {
  const out = {...base};
  for (const x of list || []) {
    if (!x.id) continue;
    if (x.type === 'richtext' && x.default) out[x.id] = '<p>Line with <strong>bold</strong> and <em>soft</em> words</p>';
    if (x.type === 'inline_richtext' && x.default) out[x.id] = 'Words with <strong>bold</strong> text';
  }
  return out;
}
async function styles(page) {
  await page.waitForTimeout(250);
  return page.evaluate(() => {
    const out = [];
    const root = document.getElementById('shopify-section-test');
    for (const el of root.querySelectorAll('*')) {
      if (el.closest('style,script,template,svg,[data-countdown],[class*="countdown"]')) continue;
      const has = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || el.matches('[data-sl-button],[data-theme-button]');
      if (!has || el.getClientRects().length === 0) continue;
      const cs = getComputedStyle(el);
      out.push([el.tagName + '.' + [...el.classList].slice(0, 2).join('.'), [cs.fontFamily, cs.fontWeight, cs.lineHeight, cs.letterSpacing, cs.textTransform, cs.fontSize, el.matches('[data-sl-button],[data-theme-button]') ? [cs.borderTopLeftRadius, cs.paddingTop, cs.paddingLeft, cs.borderTopWidth].join(' ') : ''].join(' | ')]);
    }
    return out;
  });
}

(async () => {
  let checks = 0;
  const ok = (c, m) => { assert.ok(c, m); checks++; };
  const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
  const browser = await launch();
  try {
    for (const name of SECTIONS.filter(n => !only || n === only)) {
      const {schema} = schemaOf(name);
      eq(schemaProblems(name), [], name + ' schema problems');
      const sec = richer(schema.settings, customize(schema.settings));
      const types = (schema.blocks || []).map(b => b.type);
      const blocksOn = types.map(t => { const l = (schema.blocks.find(b => b.type === t) || {}).settings; return {type: t, settings: richer(l, customize(l))}; });
      const blocksPlain = types.map(t => { const l = (schema.blocks.find(b => b.type === t) || {}).settings; return {type: t, settings: richer(l, {})}; });
      for (const width of [375, 1366]) for (const editing of [true, false]) {
        const where = name + ' ' + width + (editing ? ' editor' : ' storefront');
        /* reference: the section's own paint with the theme priority switched off */
        const ref = await mount(browser, name, {width, editing, assets: ASSETS, settings: sec, blocks: blocksOn, priority: 'off'});
        const want = await styles(ref.page);
        await ref.page.close();
        const hasFonts = JSON.stringify(schema).includes('font_picker') || JSON.stringify(schema).includes('courier_new_n4');
        if (hasFonts) ok(want.some(([, v]) => /Courier/.test(v)), where + ' the custom font reaches the section');
        /* redraw path: the Liquid with every switch on, priority on */
        const t = await mount(browser, name, {width, editing, assets: ASSETS, settings: {}, blocks: blocksPlain});
        const plain = await styles(t.page);
        ok(!plain.some(([, v]) => /Courier/.test(v)), where + ' switches off: no custom font');
        ok(plain.some(([k, v]) => /^H[1-6]/.test(k) && /Georgia/.test(v)) || !plain.some(([k]) => /^H[1-6]/.test(k)), where + ' switches off: headings in the theme heading font');
        await t.redraw({settings: sec, blocks: blocksOn});
        const got = await styles(t.page);
        eq(got.length, want.length, where + ' redraw: same text elements');
        for (let i = 0; i < want.length; i++) eq(got[i], want[i], where + ' redraw: custom value wins on ' + want[i][0]);
        ok(got.some(([k, v]) => /^(STRONG|EM)/.test(k) && /Courier/.test(v)) || !want.some(([k]) => /^(STRONG|EM)/.test(k)), where + ' redraw: a <strong>/<em> inside the text keeps the custom font');
        /* back to theme by redraw */
        await t.redraw({settings: Object.fromEntries(Object.keys(sec).map(k => [k, (schema.settings.find(x => x.id === k) || {}).default ?? null])), blocks: blocksPlain});
        eq(await styles(t.page), plain, where + ' redraw: switches off restore the theme look');
        /* live path: the same switches through the editor events (banner3 has no live controller: the builder redraws it) */
        if (name !== 'banner3') {
        for (const [k, v] of Object.entries(sec)) await t.page.evaluate(({k, v}) => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'test', settings: {[k]: v}, live: true}})), {k, v});
        for (const [i, b] of blocksOn.entries()) { const id = t.rendered[0].section.blocks[i].id; await t.emit(b.settings, id); }
        await t.page.waitForTimeout(300);
        const live = await styles(t.page);
        eq(live.length, want.length, where + ' live: same text elements');
        for (let i = 0; i < want.length; i++) eq(live[i], want[i], where + ' live: custom value wins on ' + want[i][0]);
        }
        eq(t.errors, [], where + ' errors');
        await t.page.close();
      }
    }
    /* saved instances keep their look: HEAD file vs this file, same CSS and runtimes */
    const saved = [];
    for (const file of fs.readdirSync(path.join(__dirname, '../templates')).filter(f => f.endsWith('.json'))) {
      let tj; try { tj = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates', file), 'utf8')); } catch (_) { continue; }
      for (const [key, s] of Object.entries(tj.sections || {})) if (SECTIONS.concat(['brand-logo', 'brand-info', 'logo_scroll_strip', 'logos-list', 'payment-icons1', 'testimonial-logos']).includes(s.type) && (!only || s.type === only)) saved.push({file, key, s});
    }
    for (const {file, key, s} of saved) {
      let headRaw; try { headRaw = execSync('git show HEAD:sections/' + s.type + '.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 64 << 20}); } catch (_) { continue; }
      const nowPath = path.join(__dirname, '../sections', s.type + '.storelib'), nowRaw = fs.readFileSync(nowPath, 'utf8');
      if (headRaw === nowRaw) { ok(true, file + ' ' + key + ' unchanged file'); continue; }
      const blocks = (s.block_order || []).map(k => s.blocks[k]).filter(Boolean).map(b => ({type: b.type, settings: b.settings || {}}));
      for (const width of [375, 1366]) {
        const look = async raw => {
          /* render the given file text through the fixture by swapping it in memory */
          const real = fs.readFileSync; fs.readFileSync = (f, ...a) => String(f) === nowPath ? raw : real(f, ...a);
          let t; try { t = await mount(browser, s.type, {width, editing: false, assets: ASSETS.concat(['live-logos.js']), settings: s.settings || {}, blocks}); } finally { fs.readFileSync = real; }
          await t.page.waitForTimeout(300);
          const f = (await fingerprint(t.page, 'test')).map(x => x.replace(/data-[a-z0-9-]*settings=[^ |]*|data-[a-z0-9-]*defaults=[^ |]*/g, ''));
          await t.page.close();
          return f;
        };
        const was = await look(headRaw), now = await look(nowRaw);
        const strip = a => a.map(x => x.replace(/\|[^|]*\|/, '|'));
        ok(JSON.stringify(strip(was)) === JSON.stringify(strip(now)) || s.hidden === true, file + ' ' + key + ' (' + s.type + ') ' + width + ': saved instance looks the same as before');
      }
    }
    console.log(checks + ' hero and banner priority, descendant, live, redraw and saved-instance checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
