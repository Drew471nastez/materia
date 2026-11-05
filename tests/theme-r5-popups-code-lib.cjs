/* Shared helpers for the round-5 Popups and Custom Code tests
   (tests/theme-r5-popups-code-*.cjs): Custom HTML (custom-html), Custom code
   (custom-liquid), Order notification (fake-order), Promotion popup
   (promotion-popup) and Size Chart Popup (size-chart-popup), all run by
   shopify/assets/live-popups-code.js. Not a test on its own. */
const {launch, mount, render, schemaOf, schemaProblems, PANTS, OTHER} = require('./media-fixture.cjs');
const assert = require('assert/strict');
const ASSET = 'live-popups-code.js';
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'}, MONO = {family: 'Courier New', fallback_families: 'monospace'};
const NAMES = ['custom-html', 'custom-liquid', 'fake-order', 'promotion-popup', 'size-chart-popup'];
const clone = o => JSON.parse(JSON.stringify(o));
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const count = () => checks;

/* Preset blocks with the data each section needs to draw everything. */
function presetBlocks(name) {
  const list = clone(schemaOf(name).schema.presets[0].blocks || []);
  if (name === 'fake-order') for (const b of list) if (b.type === 'products') b.settings = {...(b.settings || {}), fake_product: [PANTS, OTHER]};
  if (name === 'size-chart-popup') list.push({type: 'html', settings: {html: '<p class="own">Measured flat</p>'}});
  if (name === 'promotion-popup') for (const b of list) if (b.type === 'coupon') b.settings = {...(b.settings || {}), code: 'WELCOME10'};
  return list;
}
const BASE = {
  'custom-liquid': {custom_liquid: '<p class="mine">Hello from <strong>my code</strong></p>'},
};
const GLOBALS = {'size-chart-popup': {product: PANTS}};
function opts(name, extra = {}) {
  return {blocks: presetBlocks(name), settings: clone(BASE[name] || {}), globals: GLOBALS[name] || {}, assets: [ASSET], ...extra};
}
/* The size chart's dialog is opened (in the page, as in the builder) so its look can be measured. */
async function prep(t, name, uid = 'test') {
  if (name === 'size-chart-popup') await t.page.evaluate(u => { const d = document.querySelector('#shopify-section-' + u + ' [data-scs-dialog]'); if (d && !d.open) d.show(); }, uid);
  await frames(t.page);
}

async function addFp(page) {
  /* measure end states: no colour fades, no dialog entrance */
  await page.addStyleTag({content: '*,*::before,*::after{transition:none!important}.pp__dialog,.scs__dialog{animation:none!important}'});
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'backgroundImage', 'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textDecorationLine', 'textTransform', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'display', 'width', 'height', 'maxWidth', 'borderTopLeftRadius', 'borderTopWidth', 'borderTopColor', 'columnGap', 'animationName', 'filter', 'backdropFilter', 'left', 'right', 'bottom', 'justifyContent', 'alignItems', 'flexBasis', 'opacity', 'visibility'];
    const SKIP_ATTR = ['style', 'class', 'data-pc-settings', 'data-pc-ready'];
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-pc-root]'), out = {}, seen = {};
      if (!root) return {none: {gone: true}};
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.closest('template, script, style') || (e.ownerSVGElement && e.tagName !== 'svg')) continue;
        const cls = typeof e.className === 'string' ? e.className : (e.className && e.className.baseVal) || '';
        let k = (e.dataset && e.dataset.pcBlock) || e.tagName + '.' + (cls.split(' ')[0] || '');
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const q of P) o[q] = cs[q];
        o.rect = r.width || r.height ? (e === root ? (cs.position === 'fixed' ? [r.x, r.y, r.width, r.height] : [r.x, r.width, r.height]) : [r.x - r0.x, r.y - r0.y, r.width, r.height]).map(Math.round).join(',') : 'none';
        if (!e.children.length || /^(H\d|P|A|BUTTON|LABEL|TH|TD)$/.test(e.tagName)) o.text = e.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
        o.attrs = [...e.attributes].filter(a => !SKIP_ATTR.includes(a.name)).map(a => a.name + '=' + (a.name === 'src' ? a.value.split('?')[0] : a.value)).sort().join(' ');
        o.cls = cls.split(/\s+/).filter(Boolean).sort().join(' ');
        o.vars = e.style ? [...e.style].map(p => p + ':' + e.style.getPropertyValue(p).trim()).sort().join(';') : '';
        o.hidden = !!e.hidden; o.open = !!e.open;
        if (e.tagName === 'IMG') o.src = (e.getAttribute('src') || '').split('?')[0];
        o.blk = e.closest('[data-pc-block]')?.dataset.pcBlock || '';
        out[k] = o;
      }
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, blk: ''};
      return out;
    };
  });
}
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => { const r = document.querySelector('#shopify-section-' + u + ' [data-pc-root]'); return r && r.hasAttribute('data-pc-settings') ? window.MateriaPopupsCode.audit(r) : []; }, uid);
/* only what a visitor sees: computed styles, boxes and text (no markers) */
const vis = f => Object.fromEntries(Object.entries(f).filter(([, o]) => o.rect !== 'none').map(([k, o]) => [k, Object.fromEntries(Object.entries(o).filter(([q]) => !['attrs', 'vars', 'cls'].includes(q)))]));
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const explain = (a, b, keys) => keys.map(k => k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(a[k] || {}).filter(([q, v]) => JSON.stringify(v) !== JSON.stringify((b[k] || {})[q])))).slice(0, 300));

function valuesFor(x, cur = x.default) {
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'number': return [9000];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return ['Edited text'];
    case 'textarea': return ['Ada | Ben'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <strong>copy</strong></p>'];
    case 'html': case 'liquid': return ['<p class="edited">Edited code</p>'];
    case 'url': return ['/pages/test'];
    case 'image_picker': return [IMG];
    case 'font_picker': return [FONT];
    case 'product_list': return [[OTHER]];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
/* Settings a control's visible_if asks for; all colours for a custom styling toggle; real font objects. */
function prereq(x, list, base) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true)|(-?\d+)))?/g)) {
    const [, id, op, str, lit, n] = m, want = str ?? (n !== undefined ? +n : lit === undefined ? true : lit === 'true');
    if (!op) out[id] = true;
    else if (op === '==') out[id] = want;
    else if (base[id] === want) { const s = list.find(y => y.id === id); out[id] = s.options.map(o => o.value).filter(v => v !== want).pop(); }
  }
  if (x.id === 'enable_custom_style') for (const y of list) if (y.type === 'color') out[y.id] = '#13579b';
  if (x.id === 'enable_custom_fonts') for (const y of list) if (y.type === 'font_picker') out[y.id] = MONO;
  for (const y of list) if (y.type === 'font_picker' && out.enable_custom_fonts) out[y.id] = out[y.id] || MONO;
  return out;
}

module.exports = {launch, mount, render, schemaOf, schemaProblems, PANTS, OTHER, ASSET, IMG, FONT, MONO, NAMES, clone, frames, ok, eq, count, presetBlocks, opts, prep, addFp, fp, audit, diff, explain, vis, valuesFor, prereq};

if (require.main === module) console.log('theme-r5-popups-code-lib: helpers only (run tests/theme-r5-popups-code-controls.cjs and tests/theme-r5-popups-code-behaviour.cjs)');
