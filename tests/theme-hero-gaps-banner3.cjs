/* Promo Banner 3 (sections/banner3) painted live by shopify/assets/live-hero-gaps.js.
   With the real theme priority rules, at 375 and 1366:
   - the schema keeps every id it had at HEAD and has no problems;
   - first paint equals the hydrated paint and the markup equals what the
     controller derives (audit), in the editor and on the storefront;
   - every non-hidden section and block setting changes what is drawn after
     a redraw (at its own width for desktop/mobile settings, leaving the
     other width alone), and the same edit sent live paints exactly what the
     redraw paints (editor; reveal settings also on the storefront);
   - every option of every select looks different from the others;
   - colour scheme live and on redraw, two instances stay apart, a redraw
     sets up once, a block added by a redraw is live, reduced motion;
   - the saved home page instance looks the same as at HEAD.
   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-hero-gaps-banner3.cjs */
const assert = require('assert/strict'), fs = require('fs'), path = require('path'), {execSync} = require('child_process');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const NAME = 'banner3', ASSET = 'live-hero-gaps.js';
const clone = o => JSON.parse(JSON.stringify(o));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const frames = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

const FP = () => {
  const P = ['color', 'backgroundColor', 'backgroundImage', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'display', 'alignItems', 'rowGap', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'maxWidth', 'width', 'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderTopLeftRadius', 'boxShadow', 'opacity', 'transitionDuration', 'animationName', 'animationRangeEnd', 'transform'];
  window.__fp = uid => {
    const wrap = document.getElementById('shopify-section-' + uid), out = {}, seen = {};
    const w = getComputedStyle(wrap);
    out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, display: w.display, noReveal: !!wrap.querySelector(':scope > [data-ti-no-reveal]')};
    const root = wrap.querySelector('.rm3'), r0 = wrap.getBoundingClientRect();
    for (const e of [root, ...root.querySelectorAll('*')]) {
      if (e.tagName === 'STYLE' || e.tagName === 'SCRIPT') continue;
      let k = (e.dataset.hgBlock) || e.tagName + '.' + (e.classList[0] || '');
      seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
      for (const p of P) o[p] = cs[p];
      for (const v of ['--mb-bg', '--mb-text', '--mb-border', '--rm-reveal-from-y', '--rm-reveal-from-scale']) o[v] = cs.getPropertyValue(v).trim();
      o.before = ['background-color', 'opacity'].map(p => getComputedStyle(e, '::before').getPropertyValue(p)).join();
      o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
      o.text = e.children.length ? '' : e.textContent.trim();
      o.tag = e.tagName;
      for (const a of ['href', 'hidden']) o[a] = e.getAttribute(a);
      out[k] = o;
    }
    return out;
  };
};
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaHeroGaps.audit(document.querySelector('#shopify-section-' + u + ' [data-hg]')), uid);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const diffDetail = (a, b) => diff(a, b).slice(0, 4).map(k => k + ': ' + (a[k] && b[k] ? Object.keys({...a[k], ...b[k]}).filter(p => JSON.stringify(a[k][p]) !== JSON.stringify(b[k][p])).map(p => p + ' ' + JSON.stringify(a[k][p]) + ' -> ' + JSON.stringify(b[k][p])).join('; ') : a[k] ? 'removed' : 'added')).join(' | ');
async function prep(t) { await t.page.evaluate(FP); await t.page.addStyleTag({content: '.shopify-section{margin-top:9px;margin-bottom:9px}.shopify-section > section{margin-top:7px;margin-bottom:7px}'}); }

/* desktop- or mobile-only settings */
const ONLY = {section_padding_top: 1366, section_padding_bottom: 1366, section_pad_left: 1366, section_pad_right: 1366, text_align: 0};
const widthOf = id => id in ONLY ? ONLY[id] : /mobile/.test(id) || /_m$/.test(id) ? 375 : /desktop/.test(id) || /_d$/.test(id) ? 1366 : 0;
/* values that differ from the base for each setting */
const VALUES = {lineheight: ['2'], text: ['Edited words'], label: ['Book a fitting'], link: ['/pages/test'], bg_gradient: ['linear-gradient(90deg, #ab12cd, #13579b)', '#335577']};
function valuesFor(x, cur) {
  if (VALUES[x.id]) return VALUES[x.id];
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
  }
  throw new Error('no value for ' + x.type + ' ' + x.id);
}
/* what a control's visible_if needs, and a visible effect for toggles */
const PRE = {
  banner_border_color: {banner_border_width: 4},
  use_custom_text: {heading_color: '#13579b', text_color: '#995533'},
  use_custom_bg: {section_bg_color: '#13579b', bg_color: '#995533', overlay_opacity: 30, overlay_color: '#ff0000'},
  enable_bg_gradient: {bg_gradient: 'linear-gradient(90deg, #ab12cd, #13579b)'},
  bg_gradient: {enable_bg_gradient: true},
  overlay_color: {overlay_opacity: 40},
  mobile_text_align: {text_align: 'left'},
  reveal: {}, reset_spacing: {},
};
const PRE_BLOCK = {
  enable_custom_style: {color: '#13579b', size_d: 41, size_m: 23, weight: '800', transform: 'uppercase', bg: '#224466', text_color: '#ffffff', border_color: '#aa6600', use_theme_button: false},
  use_theme_button: {radius: 3, pad_h: 40, pad_v: 18, size_d: 21, size_m: 19, border_width: 3},
};
function prereq(x, list, base, extra) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true)))?/g)) {
    const [, id, op, str, lit] = m, want = str ?? (lit === undefined ? true : lit === 'true');
    if (!op) out[id] = list.find(y => y.id === id).type === 'checkbox' ? true : base[id];
    else if (op === '==') out[id] = want;
  }
  return {...out, ...(extra[x.id] || {})};
}
/* settings where the effect needs the storefront (the editor turns the reveal off) */
const STOREFRONT = ['reveal', 'reveal_style', 'reveal_range'];

async function everyControl(browser, width, editing, seen) {
  const {schema} = schemaOf(NAME);
  const t = await mount(browser, NAME, {width, editing, settings: {reveal: true}, assets: [ASSET]});
  await prep(t);
  const base = clone(t.section.settings);
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header') cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks) { const i = baseBlocks.findIndex(b => b.type === bt.type); for (const x of bt.settings) if (x.id && !x.hidden && x.type !== 'header') cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  for (const {scope, x, list, btype} of cases) {
    const key = (btype ? btype + '.' : '') + x.id;
    const blockBase = scope < 0 ? null : baseBlocks[scope].settings;
    const pre = prereq(x, list, scope < 0 ? base : blockBase, scope < 0 ? PRE : PRE_BLOCK);
    if (btype && x.visible_if && /enable_custom_style/.test(x.visible_if)) Object.assign(pre, PRE_BLOCK.enable_custom_style);
    if (btype && x.id === 'use_theme_button') Object.assign(pre, PRE_BLOCK.use_theme_button);
    if (pre[x.id] !== undefined && x.id !== 'enable_custom_style') delete pre[x.id];
    const sBase = scope < 0 ? {...base, ...pre} : base, bBase = clone(baseBlocks); if (scope >= 0) Object.assign(bBase[scope].settings, pre);
    const cur = scope < 0 ? sBase[x.id] : bBase[scope].settings[x.id];
    await t.redraw({settings: sBase, blocks: bBase});
    const f0 = await fp(t);
    const w = widthOf(x.id), entry = seen[key] || (seen[key] = {opts: {}, changed: false});
    for (const v of valuesFor(x, cur)) {
      const change = {[x.id]: v}, sNext = scope < 0 ? {...sBase, ...change} : sBase, bNext = clone(bBase); if (scope >= 0) Object.assign(bNext[scope].settings, change);
      await t.redraw({settings: sNext, blocks: bNext});
      const f1 = await fp(t);
      eq(await audit(t), [], `${key}=${JSON.stringify(v)} at ${width}: redrawn markup equals the derived paint`);
      const d = diff(f0, f1);
      if (d.length && (!w || w === width)) entry.changed = true;
      if (w && w !== width) ok(!d.length, `${key} (${w}px setting) leaves ${width} alone: ${diffDetail(f0, f1)}`);
      const wk = width + (editing ? 'e' : 's');
      (entry.opts[JSON.stringify(v)] = entry.opts[JSON.stringify(v)] || {})[wk] = JSON.stringify(f1);
      (entry.opts[JSON.stringify(cur)] = entry.opts[JSON.stringify(cur)] || {})[wk] = JSON.stringify(f0);
      if (editing || STOREFRONT.includes(x.id)) {
        await t.redraw({settings: sBase, blocks: bBase});
        await t.emit(change, scope < 0 ? undefined : t.blockId(btype));
        await frames(t);
        const f2 = await fp(t);
        ok(!diff(f1, f2).length, `${key}=${JSON.stringify(v)} at ${width} ${editing ? 'editor' : 'storefront'}: live equals redraw: ${diffDetail(f1, f2)}`);
        eq(await audit(t), [], `${key}=${JSON.stringify(v)} at ${width}: live markup equals the derived paint`);
      }
    }
  }
  eq(t.errors, [], `every control ${width}: no errors`);
  await t.page.close();
}

async function basics(browser, width, editing) {
  const a = await mount(browser, NAME, {width, editing}); await prep(a);
  const b = await mount(browser, NAME, {width, editing, assets: [ASSET]}); await prep(b);
  await frames(b);
  const fa = await fp(a), fb = await fp(b);
  ok(!diff(fa, fb).length, `${width} ${editing ? 'editor' : 'storefront'}: first paint equals hydrated paint: ${diffDetail(fa, fb)}`);
  eq(await audit(b), [], `${width}: markup equals derived paint`);
  ok(await b.noOverflow(), `${width}: no sideways scroll`);
  const tap = await b.page.locator('.rm-hero__btn').boundingBox();
  ok(tap.height >= 44, `${width}: button is a 44px target`);
  ok(await b.css('.rm3', 'backgroundColor') === 'rgb(24, 32, 40)', `${width}: background follows the scheme`);
  ok(await b.css('.rm-hero__heading', 'color') === 'rgb(255, 255, 255)' && /Georgia/.test(await b.css('.rm-hero__heading', 'fontFamily')), `${width}: heading follows the theme`);
  ok(await b.css('.rm-hero__sub', 'color') === 'rgb(204, 204, 204)' && /Arial/.test(await b.css('.rm-hero__sub', 'fontFamily')), `${width}: text follows the theme`);
  await b.emit({color_scheme: 'alt-scheme'}); await frames(b);
  ok(await b.css('.rm3', 'backgroundColor') === 'rgb(250, 250, 250)' && await b.css('.rm-hero__heading', 'color') === 'rgb(16, 16, 16)', `${width}: scheme switches live`);
  await b.redraw({settings: {color_scheme: 'alt-scheme'}});
  ok(await b.css('.rm3', 'backgroundColor') === 'rgb(250, 250, 250)' && await b.css('.rm-hero__sub', 'color') === 'rgb(51, 51, 51)', `${width}: scheme switches on redraw`);
  /* custom block styling under the theme priority, then off again, live */
  const hid = b.blockId('heading');
  await b.emit({enable_custom_style: true, font: 'body', weight: '300', size_d: 44, size_m: 22, lineheight: '1.9', letterspace: 0.1, transform: 'uppercase', color: '#abcdef'}, hid); await frames(b);
  const size = width < 750 ? 22 : 44;
  ok(/Arial/.test(await b.css('.rm-hero__heading', 'fontFamily')) && await b.css('.rm-hero__heading', 'fontWeight') === '300' && await b.css('.rm-hero__heading', 'fontSize') === size + 'px' && await b.css('.rm-hero__heading', 'textTransform') === 'uppercase' && await b.css('.rm-hero__heading', 'color') === 'rgb(171, 205, 239)', `${width}: custom heading wins live under priority`);
  await b.emit({enable_custom_style: false}, hid); await frames(b);
  ok(/Georgia/.test(await b.css('.rm-hero__heading', 'fontFamily')) && await b.css('.rm-hero__heading', 'fontWeight') === '700' && await b.css('.rm-hero__heading', 'color') === 'rgb(16, 16, 16)', `${width}: custom heading off restores the theme live`);
  eq(a.errors.concat(b.errors), [], `${width}: no errors`);
  await a.page.close(); await b.page.close();
}

async function lifecycle(browser) {
  const {schema} = schemaOf(NAME), blocks = clone(schema.presets[0].blocks);
  const t = await mount(browser, NAME, {width: 1366, instances: [{uid: 'a', blocks}, {uid: 'b', blocks}], assets: [ASSET]});
  await prep(t);
  const fb = await fp(t, 'b');
  await t.emit({pad_top_desktop: 120, color_scheme: 'alt-scheme'}, undefined, 'a');
  await t.emit({text: 'Only in a'}, 'a-b1', 'a'); await frames(t);
  ok(await t.css('.rm3', 'backgroundColor', 'a') === 'rgb(250, 250, 250)' && (await t.page.locator('#shopify-section-a .rm-hero__heading').textContent()) === 'Only in a', 'instance a changes');
  ok(!diff(fb, await fp(t, 'b')).length, 'instance b stays as it was');
  const n0 = await t.page.evaluate(() => window.MateriaHeroGaps.roots.size);
  await t.redraw({uid: 'a'}); await t.redraw({uid: 'a'});
  eq(await t.page.evaluate(() => window.MateriaHeroGaps.roots.size), n0, 'redraws keep one controller per instance');
  eq(await audit(t, 'a'), [], 'redrawn markup equals derived paint');
  /* a block added by a redraw is drawn and live */
  const fewer = blocks.filter(b => b.type !== 'subheading');
  await t.redraw({uid: 'a', blocks: fewer});
  ok(await t.page.locator('#shopify-section-a .rm-hero__sub').count() === 0, 'a removed block is gone');
  await t.redraw({uid: 'a', blocks: fewer.concat([{type: 'subheading'}])});
  const id = 'a-b' + fewer.length;
  ok(await t.page.locator(`[data-hg-block="${id}"]`).count() === 1, 'an added block is drawn');
  await t.emit({text: 'Added block copy', enable_custom_style: true, color: '#ff0000'}, id, 'a'); await frames(t);
  ok((await t.page.locator(`[data-hg-block="${id}"]`).textContent()) === 'Added block copy' && await t.css('.rm-hero__sub', 'color', 'a') === 'rgb(255, 0, 0)', 'the added block is live');
  /* text and button visibility follow their content, live */
  await t.emit({link: ''}, 'a-b3', 'a'); await frames(t);
  ok(await t.page.locator('#shopify-section-a .rm-hero__btn').isHidden(), 'a button without a link is hidden live');
  await t.emit({link: '/pages/fit'}, 'a-b3', 'a'); await frames(t);
  ok(await t.page.locator('#shopify-section-a .rm-hero__btn').getAttribute('href') === '/pages/fit' && await t.page.locator('#shopify-section-a .rm-hero__btn').isVisible(), 'the link comes back live');
  /* an unrelated edit leaves the heading element in place */
  await t.page.evaluate(() => { window.__h = document.querySelector('#shopify-section-a .rm-hero__heading'); });
  await t.emit({stack_gap: 30}, undefined, 'a'); await frames(t);
  ok(await t.page.evaluate(() => document.querySelector('#shopify-section-a .rm-hero__heading') === window.__h), 'an unrelated edit keeps the same elements');
  eq(t.errors, [], 'lifecycle: no errors');
  await t.page.close();
  /* reduced motion: no reveal animation, everything visible */
  const r = await mount(browser, NAME, {width: 375, editing: false, settings: {reveal: true, hover_lift: true}, assets: [ASSET], reducedMotion: 'reduce'});
  ok(await r.css('.rm-hero', 'animationName') === 'none' && await r.css('.rm-hero', 'opacity') === '1' && parseFloat(await r.css('.rm-hero', 'transitionDuration')) === 0, 'reduced motion: no reveal and no lift');
  eq(r.errors, [], 'reduced motion: no errors');
  await r.page.close();
}

async function saved(browser) {
  const tj = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates/home.json'), 'utf8'));
  const nowPath = path.join(__dirname, '../sections/banner3.storelib'), nowRaw = fs.readFileSync(nowPath, 'utf8');
  const headRaw = execSync('git show HEAD:sections/banner3.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8'});
  for (const [key, s] of Object.entries(tj.sections).filter(([, s]) => s.type === NAME)) {
    const blocks = s.block_order.map(k => s.blocks[k]).map(b => ({type: b.type, settings: b.settings || {}}));
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const look = async (raw, assets) => {
        const real = fs.readFileSync; fs.readFileSync = (f, ...a) => String(f) === nowPath ? raw : real(f, ...a);
        let t; try { t = await mount(browser, NAME, {width, editing, settings: s.settings, blocks, assets}); } finally { fs.readFileSync = real; }
        await prep(t); await frames(t);
        const f = await fp(t); await t.page.close(); return f;
      };
      const was = await look(headRaw, []), now = await look(nowRaw, [ASSET]);
      ok(!diff(was, now).length, `home.json ${key} ${width} ${editing ? 'editor' : 'storefront'}: saved instance looks the same as at HEAD: ${diffDetail(was, now)}`);
    }
  }
}

(async () => {
  const {schema} = schemaOf(NAME);
  eq(schemaProblems(NAME), [], 'schema problems');
  const head = JSON.parse(execSync('git show HEAD:sections/banner3.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8'}).split('<schema>')[1].split('</schema>')[0]).shopify;
  const ids = l => l.filter(x => x.id).map(x => x.id);
  eq(ids(head.settings).filter(id => !ids(schema.settings).includes(id)), [], 'keeps every section setting id');
  for (const hb of head.blocks) eq(ids(hb.settings).filter(id => !ids(schema.blocks.find(b => b.type === hb.type).settings).includes(id)), [], 'keeps every ' + hb.type + ' setting id');
  const browser = await launch();
  try {
    for (const width of [375, 1366]) for (const editing of [true, false]) await basics(browser, width, editing);
    const seen = {};
    for (const width of [375, 1366]) for (const editing of [true, false]) await everyControl(browser, width, editing, seen);
    for (const [key, e] of Object.entries(seen)) {
      ok(e.changed, key + ' changes what is drawn');
      const opts = Object.entries(e.opts);
      if (opts.length > 2) for (let i = 0; i < opts.length; i++) for (let j = i + 1; j < opts.length; j++) {
        const [vi, a] = opts[i], [vj, b] = opts[j];
        ok(Object.keys(a).some(k => b[k] && a[k] !== b[k]), `${key}: ${vi} and ${vj} look different`);
      }
    }
    await lifecycle(browser);
    await saved(browser);
    console.log(checks + ' Promo Banner 3 live controller, every-control live-equals-redraw, lifecycle and saved-instance checks passed');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
