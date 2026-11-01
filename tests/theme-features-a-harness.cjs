/* Shared checks for the features-a sections (Benefits Bar, Benefits Bar 2,
   Benefits Bar Pro, Benefits Circles, Benefits Icons, Benefits Tabs, Product
   Benefits Pro), painted live by shopify/assets/live-features-a.js.
   Each tests/theme-features-a-<section>.cjs calls run(cfg). With priority on
   (the real theme-controls rules), at 375 and 1366, in the editor and on the
   storefront:
   - the schema keeps every id it had at HEAD, has no problems, and labels
     and visible_if are in order;
   - the first paint equals the hydrated paint, the markup equals what the
     controller derives (audit), no overflow, no errors, a clean preset;
   - the theme decides colours and fonts by default, the colour scheme can be
     switched live and on a redraw;
   - every non-hidden setting of the section and of every block changes what
     is drawn after a redraw, live equals redraw, desktop and mobile settings
     change only their own width, and every option of every select looks
     different from the others;
   - two instances stay apart, an added block draws and is live, a redraw
     sets up once, reduced motion keeps everything visible;
   - cfg.extra(ctx) adds the section's own checks (priority opt-outs, tabs,
     carousels, saved instances).
   LIQUIDJS=<path to liquidjs> node tests/theme-features-a-<section>.cjs */
const assert = require('assert/strict'), {execSync} = require('child_process');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'live-features-a.js';
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const SVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/><path d="M2 2h4"/></svg>';
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'}, MONO = {family: 'Courier New', fallback_families: 'monospace'};
const clone = o => JSON.parse(JSON.stringify(o));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };

function valuesFor(x, cur = x.default, cfg = {}) {
  if (cfg.values && cfg.values[x.id]) return cfg.values[x.id];
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': case 'radio': { const v = x.options.map(o => o.value).filter(v => v !== cur); return v.length > 6 ? v.slice(0, 3) : v; }
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_background': return ['linear-gradient(90deg, #ab12cd, #13579b)'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return [/alt$/.test(x.id) ? 'Described image' : 'Edited text'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <strong>copy</strong></p>'];
    case 'textarea': return ['Edited longer text'];
    case 'html': return [SVG];
    case 'url': return ['/pages/test'];
    case 'image_picker': return [IMG];
    case 'font_picker': return [FONT];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
/* Settings a control's visible_if asks for (and every colour of a custom styling toggle). */
function prereq(x, list, base) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true)))?/g)) {
    const [, id, op, str, lit] = m, want = str ?? (lit === undefined ? true : lit === 'true');
    if (!op) out[id] = true;
    else if (op === '==') out[id] = want;
    else if (base[id] === want) { const s = list.find(y => y.id === id); out[id] = s.type === 'checkbox' ? !want : s.options.map(o => o.value).filter(v => v !== want).pop(); }
  }
  if (/^(enable_custom_style|custom_text_colors|custom_colors)$/.test(x.id)) for (const y of list) if (y.type === 'color') out[y.id] = '#13579b';
  return out;
}

const FP = () => {
  const P = ['color', 'backgroundColor', 'backgroundImage', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'display', 'flexDirection', 'alignItems', 'justifyContent', 'gridTemplateColumns', 'columnGap', 'rowGap', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'maxWidth', 'borderTopWidth', 'borderTopColor', 'borderBottomWidth', 'borderTopLeftRadius', 'boxShadow', 'opacity', 'transform', 'strokeWidth', 'objectFit', 'overflowX', 'visibility'];
  window.__fp = uid => {
    const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-fa]'), out = {}, seen = {};
    const r0 = root.getBoundingClientRect();
    for (const e of [root, ...root.querySelectorAll('*')]) {
      if (e.closest('template') || e.ownerSVGElement || e.tagName === 'STYLE' || e.tagName === 'SCRIPT') continue;
      const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
      let k = (e.dataset && e.dataset.faBlock) || e.tagName + '.' + (cls.split(' ')[0] || '');
      seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
      for (const p of P) o[p] = cs[p];
      o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
      for (const v of ['--mb-bg', '--mb-text', '--mb-hover-bg', '--mb-hover-text']) o[v] = cs.getPropertyValue(v).trim();
      if (!e.children.length || /^(H\d|P|A|BUTTON|SUMMARY)$/.test(e.tagName)) o.text = e.textContent.trim().replace(/\s+/g, ' ').slice(0, 80);
      o.tag = e.tagName;
      for (const a of ['href', 'alt', 'hidden', 'open', 'tabindex', 'aria-label', 'data-theme-button', 'type']) o[a] = e.getAttribute(a);
      if (e.tagName === 'IMG') o.src = (e.getAttribute('src') || '').split('?')[0];
      if (e.tagName === 'svg') { let h = 0; for (const ch of e.innerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ')) h = (h * 31 + ch.charCodeAt(0)) | 0; o.sig = h; }
      for (const pse of ['::before', '::after']) { const a = getComputedStyle(e, pse); if (a.content !== 'none') o[pse] = [a.content, a.display, a.backgroundColor, a.borderTopColor, a.borderTopWidth, a.width, a.height, a.top].join(); }
      out[k] = o;
    }
    const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom};
    return out;
  };
};
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaFeaturesA.audit(document.querySelector('#shopify-section-' + u + ' [data-fa]')), uid);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const diffDetail = (a, b) => diff(a, b).slice(0, 4).map(k => k + ': ' + (a[k] && b[k] ? Object.keys({...a[k], ...b[k]}).filter(p => JSON.stringify(a[k][p]) !== JSON.stringify(b[k][p])).map(p => p + ' ' + JSON.stringify(a[k][p]) + ' -> ' + JSON.stringify(b[k][p])).join('; ') : a[k] ? 'removed' : 'added')).join(' | ');
const widthOf = (id, cfg) => (cfg.only && cfg.only[id]) || (/(^|_)mobile(_|$)|_m$|mobile/.test(id) ? 375 : /(^|_)desktop(_|$)|_d$|desktop/.test(id) ? 1366 : 0);

/* the wrappers get a margin so Reset spacing has something to reset */
async function prep(t, cfg) { await t.page.evaluate(FP); await t.page.addStyleTag({content: '.shopify-section{margin-top:9px;margin-bottom:9px}' + (cfg.css || '')}); }

/* Every non-hidden control at one width, in the editor (live and redraw) or on the storefront (redraw). */
async function everyControl(browser, cfg, width, editing, seen) {
  const {name} = cfg, {schema} = schemaOf(name);
  const t = await mount(browser, name, {width, editing, settings: cfg.settings || {}, blocks: cfg.blocks ? cfg.blocks() : undefined, assets: [ASSET]});
  await prep(t, cfg);
  const base = clone(t.section.settings);
  for (const x of schema.settings) if (x.id && !(x.id in base)) base[x.id] = '';
  /* the fixture's font picker defaults are handles; the real ones are font objects */
  const TAHOMA = {family: 'Tahoma', fallback_families: 'sans-serif'};
  for (const x of schema.settings) if (x.type === 'font_picker' && typeof base[x.id] !== 'object') base[x.id] = TAHOMA;
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  for (const b of baseBlocks) for (const x of (schema.blocks.find(y => y.type === b.type) || {}).settings || []) if (x.type === 'font_picker' && typeof b.settings[x.id] !== 'object') b.settings[x.id] = TAHOMA;
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header') cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks || []) {
    const i = baseBlocks.findIndex(b => b.type === bt.type);
    for (const x of bt.settings || []) if (x.id && !x.hidden && x.type !== 'header') { assert.ok(i >= 0, name + ': no base block ' + bt.type); cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  }
  for (const {scope, x, list, btype} of cases) {
    const key = (btype ? btype + '.' : '') + x.id;
    if ((cfg.skip || []).includes(key)) continue;
    const cur = scope < 0 ? base[x.id] : baseBlocks[scope].settings[x.id];
    const pre = {...prereq(x, list, scope < 0 ? base : baseBlocks[scope].settings), ...((scope < 0 ? cfg.pre : cfg.preBlock) || {})[key]};
    const preSection = (cfg.preSectionFor || {})[key] || {};
    const sBase = {...base, ...preSection, ...(scope < 0 ? pre : {})};
    const bBase = clone(baseBlocks); if (scope >= 0) Object.assign(bBase[scope].settings, pre);
    const hover = (cfg.hover || {})[key];
    const snap = async () => { if (hover) { await t.page.hover('#shopify-section-test ' + hover); await t.page.waitForTimeout(700); } const f = await fp(t); if (hover) { await t.page.mouse.move(1, 1); await t.page.waitForTimeout(50); } return f; };
    await t.redraw({settings: sBase, blocks: bBase});
    const f0 = await snap();
    const entry = seen[key] || (seen[key] = {fps: [JSON.stringify(f0) + width], differs: false, live: !['reset_spacing'].concat(cfg.redrawOnly || []).includes(key)});
    if (!entry.fps.includes(JSON.stringify(f0) + width)) entry.fps.push(JSON.stringify(f0) + width);
    for (const v of valuesFor(x, cur, cfg)) {
      const change = {[x.id]: v};
      const sNext = scope < 0 ? {...sBase, ...change} : sBase, bNext = clone(bBase); if (scope >= 0) Object.assign(bNext[scope].settings, change);
      await t.redraw({settings: sNext, blocks: bNext});
      const f1 = await snap();
      eq(await audit(t), [], `${name} ${key}=${JSON.stringify(v)} at ${width}: markup equals the derived paint`);
      const d = diff(f0, f1);
      if (d.length) entry.differs = entry.differs || width === widthOf(key.split('.').pop(), cfg) || !widthOf(key.split('.').pop(), cfg);
      const w = widthOf(key.split('.').pop(), cfg);
      if (w && w === width) ok(d.length > 0, `${name} ${key}=${JSON.stringify(v)} changes the section at ${width}`);
      if (w && w !== width && !(cfg.both || []).includes(key)) ok(!d.length, `${name} ${key} (${w}px setting) leaves ${width} alone: ${diffDetail(f0, f1)}`);
      entry.fps.push(JSON.stringify(f1) + width + key + v);
      const o = entry.opts = entry.opts || {}, wk = width + (editing ? 'e' : 's');
      (o[JSON.stringify(v)] = o[JSON.stringify(v)] || {})[wk] = JSON.stringify(f1);
      (o[JSON.stringify(cur)] = o[JSON.stringify(cur)] || {})[wk] = JSON.stringify(f0);
      if (editing && entry.live) {
        await t.redraw({settings: sBase, blocks: bBase});
        await t.emit(change, scope < 0 ? undefined : t.blockId(btype));
        await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        if ((cfg.settle || {})[key]) await t.page.waitForTimeout(cfg.settle[key]); /* a transition the setting starts */
        await t.page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.constructor.name === 'CSSTransition').map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 1200))]));
        const f2 = await snap();
        ok(!diff(f1, f2).length, `${name} ${key}=${JSON.stringify(v)} at ${width}: live equals redraw: ${diffDetail(f1, f2)}`);
      }
    }
  }
  eq(t.errors, [], name + ' every control: no errors');
  await t.page.close();
}

async function basics(browser, cfg, width, editing) {
  const {name} = cfg;
  const opts = {width, editing, settings: cfg.settings || {}, blocks: cfg.blocks ? cfg.blocks() : undefined};
  /* first paint = hydrated, markup = derived, no overflow, no errors */
  const a = await mount(browser, name, {...opts, assets: []}); await prep(a, cfg);
  const b = await mount(browser, name, {...opts, assets: [ASSET]}); await prep(b, cfg);
  await b.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const fa = await fp(a), fb = await fp(b);
  ok(!diff(fa, fb).length, `${name} ${width} ${editing ? 'editor' : 'storefront'}: first paint equals hydrated paint: ${diffDetail(fa, fb)}`);
  eq(await audit(b), [], `${name} ${width}: markup equals derived paint`);
  ok(await b.noOverflow(), `${name} ${width}: no sideways scroll`);
  eq(a.errors.concat(b.errors), [], `${name} ${width}: no errors`);
  /* theme first */
  const T = cfg.theme || {};
  ok(await b.css('[data-fa]', 'backgroundColor') === (T.bg || 'rgb(24, 32, 40)'), `${name} ${width}: background follows the scheme`);
  for (const [sel, kind] of T.probes || []) {
    const [c, f] = [await b.css(sel, 'color'), await b.css(sel, 'fontFamily')];
    ok(c === (kind === 'h' ? 'rgb(255, 255, 255)' : 'rgb(204, 204, 204)') || (T.colorFree || []).includes(sel), `${name} ${width}: ${sel} takes the scheme ${kind === 'h' ? 'heading' : 'text'} colour (got ${c})`);
    ok(kind === 'h' ? /Georgia/.test(f) : /Arial/.test(f), `${name} ${width}: ${sel} takes the theme ${kind === 'h' ? 'heading' : 'body'} font (got ${f})`);
  }
  /* colour scheme live and after a redraw */
  await b.emit({color_scheme: 'alt-scheme'});
  await b.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  if (editing) ok(await b.css('[data-fa]', 'backgroundColor') === 'rgb(250, 250, 250)', `${name} ${width}: scheme switches live`);
  await b.redraw({settings: {color_scheme: 'alt-scheme'}});
  ok(await b.css('[data-fa]', 'backgroundColor') === 'rgb(250, 250, 250)', `${name} ${width}: scheme switches on redraw`);
  for (const [sel, kind] of T.probes || []) if (!(T.colorFree || []).includes(sel)) ok(await b.css(sel, 'color') === (kind === 'h' ? 'rgb(16, 16, 16)' : 'rgb(51, 51, 51)'), `${name} ${width}: ${sel} follows the alt scheme`);
  await a.page.close(); await b.page.close();
  /* priority off: the theme still decides */
  const c = await mount(browser, name, {...opts, assets: [ASSET], priority: 'off'}); await prep(c, cfg);
  for (const [sel, kind] of T.probes || []) ok(kind === 'h' ? /Georgia/.test(await c.css(sel, 'fontFamily')) : /Arial/.test(await c.css(sel, 'fontFamily')), `${name} ${width} priority off: ${sel} theme font`);
  eq(c.errors, [], name + ' priority off: no errors');
  await c.page.close();
}

async function lifecycle(browser, cfg) {
  const {name} = cfg, {schema} = schemaOf(name), blocks = cfg.blocks ? cfg.blocks() : clone(schema.presets[0].blocks || []);
  /* two instances */
  const t = await mount(browser, name, {width: 1366, instances: [{uid: 'a', settings: cfg.settings || {}, blocks}, {uid: 'b', settings: cfg.settings || {}, blocks}], assets: [ASSET]});
  await prep(t, cfg);
  const fb = await fp(t, 'b');
  const twoKey = cfg.twoKey || ['padding_top_desktop', 'padding_top'].find(k => schema.settings.some(x => x.id === k));
  await t.emit({[twoKey]: 77, color_scheme: 'alt-scheme'}, undefined, 'a');
  await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  ok(await t.css('[data-fa]', 'backgroundColor', 'a') === 'rgb(250, 250, 250)', name + ': instance a changes');
  ok(!diff(fb, await fp(t, 'b')).length, name + ': instance b stays as it was');
  /* a redraw sets up once */
  const n0 = await t.page.evaluate(() => window.MateriaFeaturesA.roots.size);
  await t.redraw({uid: 'a'}); await t.redraw({uid: 'a'});
  eq(await t.page.evaluate(() => window.MateriaFeaturesA.roots.size), n0, name + ': redraws keep one controller per instance');
  eq(await audit(t, 'a'), [], name + ': redrawn markup equals derived paint');
  /* an added block draws and is live */
  const extra = cfg.extraBlock || (schema.blocks || []).find(x => !x.limit || x.limit > 1)?.type;
  if (extra) {
    const more = blocks.concat([{type: extra}]);
    await t.redraw({uid: 'a', blocks: more});
    const id = 'a-b' + (more.length - 1);
    ok(await t.page.locator(`[data-fa-block="${id}"]`).count() === 1, name + ': an added block is drawn');
    const bt = schema.blocks.find(x => x.type === extra), txt = bt.settings.find(x => x.id && /^(text|inline_richtext|textarea)$/.test(x.type) && !x.hidden);
    if (txt) {
      await t.emit({[txt.id]: 'Added block copy'}, id, 'a');
      await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      ok((await t.page.locator(`[data-fa-block="${id}"]`).textContent()).includes('Added block copy'), name + ': the added block is live');
    }
  }
  /* no picture reload on an unrelated edit */
  if (cfg.image) {
    const [type, id, sel, more] = cfg.image;
    const bl = clone(blocks); const i = bl.findIndex(b => b.type === type); bl[i].settings = {...bl[i].settings, ...(more || {}), [id]: IMG};
    await t.redraw({uid: 'a', blocks: bl});
    await t.page.evaluate(s => { window.__img = document.querySelector('#shopify-section-a ' + s); }, sel);
    ok(await t.page.evaluate(() => !!window.__img), name + ': the picture is drawn');
    await t.emit({[twoKey]: 12}, undefined, 'a'); await t.emit({[twoKey]: 13}, undefined, 'a');
    ok(await t.page.evaluate(s => document.querySelector('#shopify-section-a ' + s) === window.__img && window.__img.isConnected, sel), name + ': an unrelated edit keeps the same picture');
  }
  eq(t.errors, [], name + ' lifecycle: no errors');
  await t.page.close();
  /* reduced motion */
  const r = await mount(browser, name, {width: 375, blocks, settings: cfg.settings || {}, assets: [ASSET], reducedMotion: 'reduce'}); await prep(r, cfg);
  ok(await r.page.evaluate(() => [...document.querySelectorAll('[data-fa] *')].every(e => getComputedStyle(e).transitionDuration.split(',').every(d => parseFloat(d) === 0) || !e.getAnimations().length)), name + ': reduced motion runs no animation');
  eq(r.errors, [], name + ' reduced motion: no errors');
  await r.page.close();
}

/* Static: ids kept from HEAD, schema problems, hidden HTML tag selects, short select labels. */
function statics(cfg) {
  const {name} = cfg, s = schemaOf(name).schema;
  eq(schemaProblems(name), [], name + ': schema problems');
  let head = null; try { head = JSON.parse(execSync(`git -C ${__dirname}/.. show HEAD:sections/${name}.storelib`).toString().split('<schema>')[1].split('</schema>')[0]).shopify; } catch (_) {}
  if (head) {
    const ids = l => (l || []).filter(x => x.id).map(x => x.id);
    for (const id of ids(head.settings)) ok(ids(s.settings).includes(id), `${name}: keeps section setting ${id}`);
    for (const hb of head.blocks || []) { const nb = (s.blocks || []).find(b => b.type === hb.type); ok(!!nb, `${name}: keeps block ${hb.type}`); for (const id of ids(hb.settings)) ok(ids(nb.settings).includes(id), `${name}: keeps ${hb.type}.${id}`); }
  }
  const lists = [s.settings, ...(s.blocks || []).map(b => b.settings)];
  for (const l of lists) for (const x of l) if (x.type === 'color' && !x.hidden) ok(!!x.visible_if, `${name}: colour ${x.id} shows only with custom styling`);
  for (const l of lists) for (const x of l) if (x.type === 'font_picker' && !x.hidden) ok(/enable_custom_fonts|enable_custom_style/.test(x.visible_if || ''), `${name}: font ${x.id} shows only with custom fonts`);
  const heads = s.settings.filter(x => x.type === 'header').map(x => x.content);
  const ORDER = ['General', 'Content', 'Layout', 'Media', 'Appearance', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'];
  const idx = heads.map(h => ORDER.findIndex(o => h.startsWith(o)));
  ok(idx.every(i => i >= 0) && idx.every((v, i) => !i || v > idx[i - 1]), `${name}: groups in the shared order (${heads.join(', ')})`);
  const raw = schemaOf(name).raw.split('<schema>')[0];
  ok(!/—|\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(JSON.stringify(s.presets) + JSON.stringify(lists.flat().map(x => x.default))), `${name}: plain preset copy`);
  ok(!/<link\b|fontawesome|fonts\.googleapis/i.test(raw), `${name}: no external stylesheet`);
}

async function run(cfg) {
  const browser = await launch();
  const t0 = Date.now();
  try {
    statics(cfg);
    for (const editing of [true, false]) for (const width of [375, 1366]) await basics(browser, cfg, width, editing);
    const seen = {};
    for (const editing of cfg.quick ? [true] : [true, false]) for (const width of [375, 1366]) await everyControl(browser, cfg, width, editing, seen);
    for (const [key, e] of Object.entries(seen)) {
      if ((cfg.noEffect || []).includes(key)) continue;
      ok(e.differs, `${cfg.name} ${key}: changes the section at some width`);
      const o = e.opts || {}, vals = Object.keys(o);
      const sch = schemaOf(cfg.name).schema, id = key.split('.').pop(), list = key.includes('.') ? sch.blocks.find(b => b.type === key.split('.')[0]).settings : sch.settings, x = list.find(y => y.id === id);
      if (x && (x.type === 'select' || x.type === 'radio') && !(cfg.sameOk || []).includes(key)) {
        for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) ok(JSON.stringify(o[vals[i]]) !== JSON.stringify(o[vals[j]]), `${cfg.name} ${key}: ${vals[i]} and ${vals[j]} look different`);
      }
    }
    /* long selects (icon libraries): every option draws something different */
    const {render} = require('./media-fixture.cjs'), sch = schemaOf(cfg.name).schema, base = cfg.blocks ? cfg.blocks() : clone(sch.presets[0].blocks || []);
    const strip = h => h.replace(/ data-fa-settings="[^"]*"/g, '').replace(/<template data-fa-icon[\s\S]*?<\/template>/g, '');
    for (const [scope, list] of [[null, sch.settings], ...(sch.blocks || []).map(b => [b.type, b.settings])]) for (const x of list) {
      if (x.type !== 'select' || x.hidden || x.options.length <= 6 || (cfg.sameOk || []).includes((scope ? scope + '.' : '') + x.id)) continue;
      const seenHtml = new Map();
      for (const o of x.options) {
        const blocks = clone(base), i = blocks.findIndex(b => b.type === scope);
        if (scope) blocks[i].settings = {...blocks[i].settings, ...((cfg.preBlock || {})[scope + '.' + x.id] || {}), [x.id]: o.value};
        const html = strip((await render(cfg.name, {editing: false, blocks, settings: scope ? cfg.settings || {} : {...cfg.settings, [x.id]: o.value}})).html);
        ok(!seenHtml.has(html), `${cfg.name} ${scope || 'section'}.${x.id}: ${o.value} draws something different from ${seenHtml.get(html)}`);
        seenHtml.set(html, o.value);
      }
    }
    await lifecycle(browser, cfg);
    if (cfg.extra) await cfg.extra({browser, mount, ASSET, ok, eq, fp, audit, diff, diffDetail, prep: t => prep(t, cfg), IMG, SVG, FONT, MONO, clone, schemaOf});
  } finally { await browser.close(); }
  console.log(`${checks} features-a checks passed for ${cfg.name} (${Math.round((Date.now() - t0) / 1000)}s)`);
}
module.exports = {run, IMG, SVG, FONT, MONO, clone};
