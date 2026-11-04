/* Round 6, page popups: every visible section and block setting of the 8
   popups, applied live by shopify/assets/live-page-popups.js
   (storelib:settings-change) and drawn again by the section's Liquid
   (redraw), at 375 and 1366, in the builder and on the live site.

   For each setting and each value (every option of a select): emit the
   change live, take a fingerprint of the whole section (computed styles,
   boxes, text, attributes, the popup's trigger config); draw the section
   again with that value and take it again. They must be equal (live is the
   same as the redraw), and the setting must change something (a style, a
   box, a text, an attribute or the trigger config). The popups start from
   their saved settings (sections/overlay-group.json) with custom colours
   and custom fonts on, so turning those off is one of the cases: off must
   give back the theme's own look, live and redrawn alike.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r6-page-popups-live.cjs [name ...] [--width=375] [--mode=editor|storefront] */
const fs = require('fs'), path = require('path');
const assert = require('assert/strict');
const {launch, mount, schemaOf} = require('./media-fixture.cjs');
const ROOT = path.join(__dirname, '..');
const OG = JSON.parse(fs.readFileSync(path.join(ROOT, 'sections/overlay-group.json'), 'utf8'));
const ASSETS = ['materia-popups.js', 'live-page-popups.js'];
const IMG = {url: 'https://theme.test/live.png', src: 'https://theme.test/live.png', width: 800, height: 600, alt: 'Live alt'};
const HF = {family: 'Times New Roman', fallback_families: 'serif'}, BF = {family: 'Tahoma', fallback_families: 'sans-serif'};
const NAMES = ['countdown-promo-popup', 'coupon-promotion-newsletter-popup', 'promobanner', 'promonewsletterpopup-2', 'promotional-image-popup', 'promotional-popup', 'promotionalpopup2', 'spin-wheel-popup'];
/* the builder preview switch and how each popup is opened at once */
const OPEN = {
  'countdown-promo-popup': {editor_mode: true}, 'coupon-promotion-newsletter-popup': {editor_mode: true}, 'promobanner': {enable_edit_mode: true, show_as_popup: true},
  'promonewsletterpopup-2': {enable_edit_mode: true, render_as_popup: true}, 'promotional-image-popup': {show_in_builder: true}, 'promotional-popup': {show_in_builder: true},
  'promotionalpopup2': {enable_customization_mode: true}, 'spin-wheel-popup': {editor_mode: true},
};
let checks = 0;
const failures = [];
const ok = (c, m) => { if (c) checks++; else { failures.push(m); console.log('FAIL ' + m); } };

function base(type) {
  const {schema} = schemaOf(type);
  const inst = Object.values(OG.sections).find(s => s.type === type);
  const withToggle = new Set((schema.blocks || []).filter(b => b.settings.some(x => x.id === 'enable_custom_style')).map(b => b.type));
  let settings = {}, blocks;
  if (inst) { settings = JSON.parse(JSON.stringify(inst.settings)); blocks = (inst.block_order || []).map(k => JSON.parse(JSON.stringify(inst.blocks[k]))); }
  else blocks = (schema.blocks || []).map(b => ({type: b.type, settings: {}}));
  /* a block type the saved popup does not use is added, so its settings are tested too */
  for (const b of schema.blocks || []) if (!blocks.some(x => x.type === b.type)) blocks.push({type: b.type, settings: {}});
  blocks = blocks.map(b => withToggle.has(b.type) ? {...b, settings: {...b.settings, enable_custom_style: true}} : b);
  const pic = {url: 'https://theme.test/base.png', src: 'https://theme.test/base.png', width: 800, height: 600, alt: 'Base alt'};
  for (const x of schema.settings) if (x.type === 'image_picker' && !settings[x.id]) settings[x.id] = pic;
  blocks = blocks.map(b => { const d = (schema.blocks || []).find(q => q.type === b.type); const s2 = {...b.settings}; for (const x of (d && d.settings) || []) if (x.type === 'image_picker' && !s2[x.id]) s2[x.id] = pic; return {...b, settings: s2}; });
  const bb = BASE_BLOCKS[type] || {};
  blocks = blocks.map(b => bb[b.type] ? {...b, settings: {...b.settings, ...bb[b.type]}} : b);
  /* own colours that differ from the theme's, so the custom colour switches show */
  for (const x of schema.settings) if (x.type === 'color') settings[x.id] = '#b1c2d3';
  blocks = blocks.map(b => { const d = (schema.blocks || []).find(q => q.type === b.type); const s2 = {...b.settings}; for (const x of (d && d.settings) || []) if (x.type === 'color' && !(type === 'spin-wheel-popup' && b.type === 'prize')) s2[x.id] = '#b1c2d3'; return {...b, settings: s2}; });
  return {settings: {...settings, enable_custom_style: true, enable_custom_fonts: true, heading_font: HF, body_font: BF, ...OPEN[type]}, blocks};
}

const TEXT = {text: 'Live words seven', textarea: 'Live words seven', inline_richtext: 'Live <em>words</em> seven', richtext: '<p>Live <strong>words</strong> seven</p>', html: '<p>Live seven</p>', url: '/collections/live'};
function values(x, cur) {
  if (cur === undefined) cur = x.default;
  switch (x.type) {
    case 'checkbox': return [!(cur === true || cur === 'true')];
    case 'range': case 'number': {
      const min = x.min ?? 0, max = x.max ?? (num(cur) + 20), step = x.step || 1;
      const mid = min + Math.round(((max - min) * 0.63) / step) * step;
      const v = [mid, max, min].map(n => +n.toFixed(4)).find(n => n !== +cur);
      return v === undefined ? [] : [v];
    }
    case 'select': case 'radio': return (x.options || []).map(o => o.value).filter(v => v !== cur);
    case 'color': return ['#3c5a7e'];
    case 'color_background': return ['linear-gradient(90deg, #112233 0%, #445566 100%)'];
    case 'image_picker': return [IMG];
    case 'font_picker': return [{family: 'Verdana', fallback_families: 'sans-serif'}];
    case 'color_scheme': return ['alt-scheme'];
    default: if (/country/.test(x.id)) return ['GB']; return TEXT[x.type] ? [TEXT[x.type]] : [];
  }
}
const num = v => Number.isFinite(+v) ? +v : 0;
/* visible_if as the builder reads it: {{ section|block.settings.x [== value] }} */
/* the setting that has to hold for a hidden one to show: [where, id, value] */
function needs(x) {
  const m = x.visible_if && x.visible_if.match(/^\{\{ (section|block)\.settings\.(\w+)(?: (==) ('([^']*)'|true|false))? \}\}$/);
  if (!m) return null;
  return [m[1], m[2], m[3] ? (m[5] !== undefined ? m[5] : m[4] === 'true') : true];
}
function shown(x, s, b) {
  if (!x.visible_if) return true;
  const m = x.visible_if.match(/^\{\{ (section|block)\.settings\.(\w+)(?: (==|!=) ('([^']*)'|true|false))? \}\}$/);
  if (!m) return true;
  const v = (m[1] === 'section' ? s : b)[m[2]];
  if (!m[3]) return !!v;
  const want = m[5] !== undefined ? m[5] : m[4] === 'true';
  return m[3] === '==' ? v === want : v !== want;
}
/* a setting that changed nothing in one run (a phone setting at 1366, the
   backdrop in the builder) must change something in another */
const NOCHANGE = new Map();
/* field size and weight settings must change the field itself (its computed font), not only a variable */
const FIELD = {'promonewsletterpopup-2': ['input_size_desktop', 'input_size_mobile', 'input_weight'], 'promotionalpopup2': ['input_size_desktop', 'input_size_mobile', 'input_weight'], 'promotional-popup': ['input_size']};
/* on phones a field never goes below 16px (no zoom when tapped): the phone size shows as max(16px, value) */
const PHONE_SIZE = {'promonewsletterpopup-2': 'input_size_mobile', 'promotionalpopup2': 'input_size_mobile', 'promotional-popup': 'input_size'};
const FIELD_SEEN = new Map();
const fieldFont = fp => Object.entries(fp).filter(([k]) => /^INPUT\./.test(k)).map(([k, o]) => k + ':' + o.fontSize + '/' + o.fontWeight).join('|');
/* settings whose look depends on something the fixture leaves off */
/* the saved popups switch some parts off; they are switched on here so their settings show */
const BASE_BLOCKS = {'promonewsletterpopup-2': {image: {disable_icon: false, custom_svg_code: '<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'}, top_text: {enabled: true}}};
/* values a setting is tried with where the general pick would be capped (six prizes cap the label size at 10) */
const VALUES = {'spin-wheel-popup': {label_font_size: [7]}};
/* a setting that shows only with another one set a certain way (beyond visible_if) */
const CASE_PRE = {'promotional-popup': {placeholder_url: {image: null}}, 'promonewsletterpopup-2': {input_size_desktop: {use_theme_fields: false}, input_size_mobile: {use_theme_fields: false}, input_weight: {use_theme_fields: false}}};
const EXEMPT = {reveal: 'the theme scroll reveal (Theme settings > Animation), off in the fixture'};

async function fingerprint(t, uid = 'test') {
  return t.page.evaluate(uid => {
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    const wrap = document.getElementById('shopify-section-' + uid), out = {}, seen = {}, w0 = wrap.getBoundingClientRect();
    const P = ['color', 'backgroundColor', 'backgroundImage', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'textTransform', 'textDecorationLine', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'display', 'visibility', 'opacity', 'width', 'height', 'maxWidth', 'borderTopLeftRadius', 'borderBottomRightRadius', 'borderTopWidth', 'borderTopColor', 'borderTopStyle', 'gap', 'justifyContent', 'alignItems', 'flexDirection', 'gridTemplateColumns', 'order', 'objectFit', 'objectPosition', 'filter', 'boxShadow', 'fill', 'stroke', 'transform', 'top', 'left', 'right', 'bottom', 'aspectRatio', 'zIndex', 'outlineColor'];
    const SKIP = ['style', 'data-pg-settings', 'data-popup-id', 'data-popup-state', 'srcset', 'sizes', 'width', 'height', 'decoding', 'fetchpriority', 'tabindex'];
    for (const e of [wrap, ...wrap.querySelectorAll('*')]) {
      if (e.closest('template, style, script') || e.tagName === 'STYLE' || e.tagName === 'SCRIPT' || e.tagName === 'TEMPLATE') continue;
      if (e.ownerSVGElement && !/^(text|path|circle|rect)$/.test(e.tagName)) continue;
      const cls = typeof e.className === 'string' ? e.className : (e.className && e.className.baseVal) || '';
      let k = e.tagName + '.' + (cls.split(' ')[0] || '') + '.' + (e.dataset && (e.dataset.pgBlock || '') || '');
      seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
      if (!e.getClientRects().length && cs.display !== 'contents') { o.nobox = true; o.hidden = !!e.hidden; if (!e.children.length && !e.hasAttribute('data-cdp-num')) o.text = e.textContent.trim().replace(/\s+/g, ' ').slice(0, 120); out[k] = o; continue; }
      for (const p of P) o[p] = cs[p];
      /* the section's own spacing (auto margins of flex items read back unreliably, so only here) */
      if (e === wrap) { o.marginTop = cs.marginTop; o.marginBottom = cs.marginBottom; }
      for (const pe of ['::before', '::after']) { const c2 = getComputedStyle(e, pe); if (c2.content && c2.content !== 'none') o[pe] = [c2.content, c2.backgroundColor, c2.color, c2.borderTopColor, c2.width, c2.height].join('|'); }
      /* boxes against the section itself (another section moving it is not its own change); fixed parts against the screen */
      const fixed = cs.position === 'fixed' || e.closest('dialog:modal');
      o.rect = (e === wrap ? [r.width, r.height] : fixed ? [r.x, r.y, r.width, r.height] : [r.x - w0.x, r.y - w0.y, r.width, r.height]).map(Math.round).join(',');
      if ((!e.children.length || /^(H\d|P|A|BUTTON|LABEL|SPAN)$/.test(e.tagName)) && !e.hasAttribute('data-cdp-num')) o.text = e.textContent.trim().replace(/\s+/g, ' ').slice(0, 120);
      o.attrs = [...e.attributes].filter(a => !SKIP.includes(a.name)).map(a => {
        let v = a.value;
        if (a.name === 'src' || a.name === 'href') v = v.split('?')[0];
        if (a.name === 'data-popup-config') { try { const s = x => x && typeof x === 'object' ? Object.keys(x).sort().reduce((m, q) => (m[q] = s(x[q]), m), {}) : x; v = JSON.stringify(s(JSON.parse(v))); } catch (_) { /* as is */ } }
        if (a.name === 'class') v = v.split(/\s+/).filter(Boolean).sort().join(' ');
        return a.name + '=' + v;
      }).sort().join(' ');
      o.hidden = !!e.hidden;
      if (e.tagName === 'SELECT') o.value = e.value;
      /* the element's own CSS variables: what only shows on hover, after a copy or when the countdown ends */
      o.vars = e.style ? [...e.style].filter(q => q.startsWith('--')).map(q => q + ':' + e.style.getPropertyValue(q).trim()).sort().join(';') : '';
      out[k] = o;
    }
    return out;
  }, uid);
}
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const explain = (a, b, keys) => keys.slice(0, 4).map(k => k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(a[k] || {gone: 1}).filter(([q, v]) => JSON.stringify(v) !== JSON.stringify((b[k] || {})[q])).map(([q, v]) => [q, [v, (b[k] || {})[q]]]))).slice(0, 400)).join('\n   ');

async function settle(t, editing, reopen = true) {
  if (!editing && reopen) await t.page.evaluate(() => { if (window.MateriaPopups && MateriaPopups.current() !== 'test') MateriaPopups.open('test'); });
  await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}

async function run(browser, type, width, editing) {
  const tag = type + ' @' + width + (editing ? ' builder' : ' site');
  const {schema} = schemaOf(type);
  const b0 = base(type);
  const t = await mount(browser, type, {width, editing, settings: b0.settings, blocks: b0.blocks, assets: ASSETS});
  await t.page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
  await settle(t, editing);
  const full = (list, s) => { const o = {}; for (const x of list) if (x.id) o[x.id] = s[x.id] === undefined ? null : s[x.id]; return {...s, ...o}; };
  let cur = {settings: full(schema.settings, t.section.settings), blocks: t.section.blocks.map(b => ({type: b.type, id: b.id, settings: full(((schema.blocks || []).find(q => q.type === b.type) || {settings: []}).settings, b.settings)}))};
  const redrawWith = async st => { await t.redraw({settings: st.settings, blocks: st.blocks.map(b => ({type: b.type, settings: b.settings}))}); await t.page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'}); await settle(t, editing); };
  const audit = () => t.page.evaluate(() => { const r = document.querySelector('#shopify-section-test [data-pg-root]'); return r ? MateriaPagePopups.audit(r) : ['no root']; });
  const a0 = await audit();
  ok(!a0.length, tag + ' the controller reads the first paint as drawn: ' + a0.slice(0, 5).join('; '));
  const baseFp = await fingerprint(t);
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header') {
    let pre = shown(x, cur.settings, cur.settings) ? null : needs(x);
    if (!pre && !shown(x, cur.settings, cur.settings)) continue;
    const extra = (CASE_PRE[type] || {})[x.id];
    if (extra) { const [k, val] = Object.entries(extra)[0]; pre = ['section', k, val]; }
    for (const v of (VALUES[type] || {})[x.id] || values(x, cur.settings[x.id])) cases.push({id: x.id, v, x, pre});
  }
  for (const bdef of schema.blocks || []) {
    const inst = cur.blocks.find(b => b.type === bdef.type);
    if (!inst) continue;
    for (const x of bdef.settings) if (x.id && !x.hidden && x.type !== 'header') {
      let pre = shown(x, cur.settings, inst.settings) ? null : needs(x);
      if (!pre && !shown(x, cur.settings, inst.settings)) continue;
      const extra = (CASE_PRE[type] || {})[x.id];
      if (extra) { const [k, val] = Object.entries(extra)[0]; pre = ['section', k, val]; }
      for (const v of values(x, inst.settings[x.id])) cases.push({id: x.id, v, x, block: inst.id, btype: bdef.type, pre});
    }
  }
  const unchanged = [];
  for (const c of cases) {
    const label = tag + ' ' + (c.block ? c.btype + '.' : '') + c.id + '=' + JSON.stringify(c.v).slice(0, 40);
    const start = JSON.parse(JSON.stringify(cur));
    if (c.pre) { if (c.pre[0] === 'block') start.blocks.find(b => b.id === c.block).settings[c.pre[1]] = c.pre[2]; else start.settings[c.pre[1]] = c.pre[2]; await redrawWith(start); }
    const next = JSON.parse(JSON.stringify(start));
    if (c.block) next.blocks.find(b => b.id === c.block).settings[c.id] = c.v; else next.settings[c.id] = c.v;
    const before = await fingerprint(t);
    await t.emit({[c.id]: c.v}, c.block);
    await settle(t, editing, false);
    const live = await fingerprint(t);
    await redrawWith(next);
    const drawn = await fingerprint(t);
    const d = diff(live, drawn);
    ok(!d.length, label + ': live is the same as the redraw\n   ' + explain(live, drawn, d));
    if (width < 768 && PHONE_SIZE[type] === c.id && typeof c.v === 'number') {
      const sizes = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test input[type="email"]')].filter(i => i.getClientRects().length).map(i => getComputedStyle(i).fontSize));
      ok(sizes.length && sizes.every(sz => sz === Math.max(16, c.v) + 'px'), label + ': the phone field is max(16px, ' + c.v + 'px) (' + sizes.join(',') + ')');
    }
    if ((FIELD[type] || []).includes(c.id)) { const k = c.id + '=' + JSON.stringify(c.v); FIELD_SEEN.set(k, (FIELD_SEEN.get(k) || false) || fieldFont(before) !== fieldFont(drawn)); }
    if (!diff(before, drawn).length) unchanged.push(c.id + (c.block ? '@' + c.btype : '') + '=' + JSON.stringify(c.v).slice(0, 30));
    else checks++;
    /* back to the base, live (the next case starts from a live state) */
    const back = c.block ? start.blocks.find(b => b.id === c.block).settings[c.id] : start.settings[c.id];
    await t.emit({[c.id]: back === undefined ? null : back}, c.block);
    await redrawWith(cur);
  }
  const now = await fingerprint(t);
  ok(!diff(baseFp, now).length, tag + ' back to the start after every case\n   ' + explain(baseFp, now, diff(baseFp, now)));
  for (const u of unchanged) NOCHANGE.set(u, (NOCHANGE.get(u) || 0) + 1);
  ok(!t.errors.length, tag + ' no errors ' + t.errors.slice(0, 3).join('; '));
  await t.page.close();
  return cases.length;
}

/* Two of the same popup on one page: an edit to one, live or drawn again,
   leaves the other exactly as it was, and their own values never mix
   (every rule is scoped to its section). */
async function independence(browser, type) {
  const tag = type + ' two on a page';
  const {schema} = schemaOf(type);
  const b0 = base(type);
  const t = await mount(browser, type, {width: 1366, editing: true, instances: [{uid: 'a', settings: b0.settings, blocks: b0.blocks}, {uid: 'b', settings: b0.settings, blocks: b0.blocks}], assets: ASSETS});
  await t.page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
  /* one popup is open at a time in the builder too, so both are compared closed (every part is still drawn, hidden) */
  const openBoth = () => t.page.evaluate(() => { for (let i = 0; i < 3 && window.MateriaPopups && MateriaPopups.current(); i++) MateriaPopups.close(); document.querySelectorAll('dialog[data-pg-dialog][open]').forEach(d => d.removeAttribute('open')); }).then(() => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))));
  await openBoth();
  await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const picks = schema.settings.filter(x => x.id && !x.hidden && /^(range|select|color|color_scheme)$/.test(x.type) && shown(x, b0.settings, b0.settings)).slice(0, 12);
  const bBefore = await fingerprint(t, 'b'), aBefore = await fingerprint(t, 'a');
  const change = {};
  for (const x of picks) { const v = values(x, b0.settings[x.id])[0]; if (v !== undefined) change[x.id] = v; }
  await t.emit(change, undefined, 'a');
  await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  ok(diff(aBefore, await fingerprint(t, 'a')).length > 0, tag + ': a live edit changes the popup it is for');
  const bLive = await fingerprint(t, 'b');
  ok(!diff(bBefore, bLive).length, tag + ': a live edit to one leaves the other\n   ' + explain(bBefore, bLive, diff(bBefore, bLive)));
  await t.redraw({uid: 'a', settings: {...b0.settings, ...change}});
  await openBoth();
  const bDrawn = await fingerprint(t, 'b');
  ok(!diff(bBefore, bDrawn).length, tag + ': a redraw of one leaves the other\n   ' + explain(bBefore, bDrawn, diff(bBefore, bDrawn)));
  ok(!t.errors.length, tag + ' no errors ' + t.errors.join('; '));
  await t.page.close();
}

(async () => {
  const args = process.argv.slice(2);
  const only = args.filter(a => !a.startsWith('--'));
  const widths = (args.find(a => a.startsWith('--width=')) || '--width=375,1366').slice(8).split(',').map(Number);
  const modes = (args.find(a => a.startsWith('--mode=')) || '--mode=editor,storefront').slice(7).split(',');
  try { new Function(fs.readFileSync(path.join(ROOT, 'shopify/assets/live-page-popups.js'), 'utf8')); checks++; } catch (e) { failures.push('live-page-popups.js does not parse: ' + e.message); console.log('FAIL controller does not parse: ' + e.message); }
  const browser = await launch();
  try {
    for (const type of NAMES) {
      if (only.length && !only.includes(type)) continue;
      let n = 0;
      NOCHANGE.clear(); FIELD_SEEN.clear();
      let runs = 0;
      if (!args.includes('--two')) for (const width of widths) for (const mode of modes) { n = await run(browser, type, width, mode === 'editor'); runs++; }
      const never = !runs ? [] : [...NOCHANGE].filter(([u, k]) => k === runs && !EXEMPT[u.split('=')[0]]).map(([u]) => u);
      ok(!never.length, type + ' every setting changes something at some width or mode; these never did: ' + never.join(', '));
      if (runs && FIELD[type]) {
        const flat = [...FIELD_SEEN].filter(([, seen]) => !seen).map(([k]) => k);
        ok(FIELD_SEEN.size > 0 && !flat.length, type + ' the field size and weight settings change the field\'s own font; these did not: ' + flat.join(', '));
      }
      if (args.includes('--two') || !args.some(a => a.startsWith('--width=') || a.startsWith('--mode='))) await independence(browser, type);
      console.log('ok', type, n + ' cases', checks);
    }
  } finally { await browser.close(); }
  if (failures.length) { console.log(failures.length + ' failed, ' + checks + ' passed'); process.exit(1); }
  console.log(checks + ' live page popup checks passed');
})().catch(e => { console.error(e.message.slice(0, 3000)); process.exit(1); });
