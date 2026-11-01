/* Round 6, account and page group: the shared checks for the account,
   password and utility page sections (main-login, main-register,
   main-activate-account, main-reset-password, main-account, main-addresses,
   main-order, login-popup, main-password-header, main-password-footer,
   coming-soon, page-404, page-compare, page-contact, page-default,
   page-wishlist, pages-store-location, form-message), run by
   shopify/assets/live-account-pages.js. Used by tests/theme-r6-account-*.cjs.
   Built on tests/theme-r5-contact-lib.cjs (the same suite, pointed at
   [data-ap-root] and window.MateriaAccountPages):

   suite(name, cfg) runs, with the real theme-controls priority on:
   - the schema (shared order, short labels, hidden HTML tag selects,
     dependent controls hidden with visible_if, unique ids);
   - every non-hidden section and block setting, at 375 and 1366 in the
     builder and 1366 on the storefront: a live edit changes the section,
     the server redraw with the same value draws exactly what the live edit
     drew, and the markup equals what the controller derives (audit). Each
     option of a select draws differently from every other option;
   - theme first (cfg.theme), the alt scheme live and after a redraw;
   - cfg.priority: custom fonts, weights and sizes win over the theme's
     priority rules, live and after a redraw, and the theme returns when off;
   - first paint equals the hydrated paint; two instances stay independent;
     an added block draws and is live; a redraw sets the section up once;
     reduced motion keeps everything visible; labelled fields and 44px
     targets; no sideways scroll at 375; no errors.
   savedLook(...) compares a saved instance against the section at c098384,
   the commit before round 6. */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process'), assert = require('assert/strict');
/* the engine with the few filters the account pages print, before the fixture takes it */
const FP = require('./theme-featured-product-round5.cjs');
const baseEngine = FP.engine;
const withFilters = e => {
  e.registerFilter('format_address', a => a ? [a.name, a.address1, a.address2, [a.zip, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).map(x => '<span>' + x + '</span>').join('<br>') : '');
  e.registerFilter('default_errors', v => v && v.messages ? '<ul>' + Object.values(v.messages).map(m => '<li>' + m + '</li>').join('') + '</ul>' : '');
  return e;
};
FP.engine = (...a) => withFilters(baseEngine(...a));
const {launch, mount, render, schemaOf, schemaProblems, themeControls, THEME_VARS} = require('./media-fixture.cjs');
const engine = FP.engine;
const BEFORE = 'c098384';
const ASSETS = ['live-account-pages.js'];
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
const MAP = '<iframe src="https://www.google.com/maps?q=Rome&output=embed" width="100%" height="450" style="border:0;" loading="lazy" title="Map"></iframe>';
const NO_MOTION = '*,*::before,*::after{transition:none!important;animation-duration:0s!important;animation-delay:0s!important}';
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const clone = o => JSON.parse(JSON.stringify(o));
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

/* ---------- page probes ---------- */
/* Everything a creator can see of a section: computed styles, attributes and own text of every element, and the wrapper's margins. */
function snapshot(page, uid) {
  return page.evaluate(uid => {
    const W = document.getElementById('shopify-section-' + uid); if (!W) return null;
    const P = ['color', 'backgroundColor', 'backgroundImage', 'fontFamily', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing', 'textAlign', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap', 'width', 'height', 'maxWidth', 'minHeight', 'borderTopLeftRadius', 'borderTopWidth', 'borderBottomWidth', 'borderTopColor', 'display', 'justifyContent', 'alignItems', 'alignSelf', 'flexDirection', 'flexWrap', 'gridTemplateColumns', 'opacity', 'boxShadow', 'order', 'visibility', 'filter', 'overflow'];
    const V = ['--mb-hover-bg', '--mb-hover-text', '--mb-hover-border', '--input-focus-color', '--cp-accent', '--cfs-focus', '--cfs-sub-hover', '--cfs-ph'];
    const A = /^(placeholder|hidden|disabled|required|type|name|href|for|class|data-theme-button|data-own-[\w-]+|data-(?!ap-settings|ap-ready)[\w-]+|aria-[\w-]+|role|alt|src|width|height)$/;
    const out = [];
    const all = [W, ...W.querySelectorAll('*')].filter(e => !e.closest('style, script, template') && !e.closest('svg') || e.tagName === 'svg');
    for (const el of all) {
      if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT' || el.tagName === 'TEMPLATE') continue;
      const cs = getComputedStyle(el), r = [el.tagName], box = el.getBoundingClientRect();
      r.push('x' + Math.round(box.left));
      for (const p of P) r.push(cs[p]);
      for (const v of V) r.push(cs.getPropertyValue(v).trim());
      r.push(...[...el.attributes].filter(a => A.test(a.name)).map(a => a.name + '=' + (a.name === 'class' ? a.value.split(/\s+/).filter(c => c && !/^(is-|scroll-trigger|animate)/.test(c)).sort().join(' ') : a.value)).sort());
      if (el.tagName === 'svg') r.push(el.innerHTML.replace(/\s+/g, ' '));
      { const b = getComputedStyle(el, '::before'); if (b.content !== 'none') r.push('before:' + b.opacity + ' ' + b.backgroundColor); }
      if (el.matches('input, textarea')) { r.push(getComputedStyle(el, '::placeholder').color); r.push(el.value); }
      r.push([...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim());
      out.push(r.join('|'));
    }
    return out;
  }, uid);
}
const diff = (a, b) => { if (!a || !b) return 'missing'; if (a.length !== b.length) return 'element count ' + a.length + ' vs ' + b.length; const i = a.findIndex((x, k) => x !== b[k]); return i < 0 ? '' : '#' + i + '\n  ' + a[i].slice(0, 900) + '\n  ' + b[i].slice(0, 900); };
const same = (a, b) => diff(a, b) === '';
const audit = (page, uid) => page.evaluate(uid => { const r = document.querySelector('#shopify-section-' + uid + ' [data-ap-root]'); return r ? window.MateriaAccountPages.audit(r) : ['no root']; }, uid);
const css = (page, uid, sel, prop, pseudo) => page.evaluate(({uid, sel, prop, pseudo}) => { const el = document.querySelector('#shopify-section-' + uid + ' ' + sel); return el ? getComputedStyle(el, pseudo || null)[prop] : null; }, {uid, sel, prop, pseudo});

/* ---------- schema helpers ---------- */
const visibleIf = x => x.visible_if ? x.visible_if.replace(/^\{\{\s*|\s*\}\}$/g, '') : '';
/* Settings that turn this one on: {section: {...}, block: {...}} from its visible_if. */
function prereq(x) {
  const out = {section: {}, block: {}}, v = visibleIf(x); if (!v) return out;
  for (const term of v.split(/\s+and\s+/)) {
    const m = /^(section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(.+))?$/.exec(term.trim()); if (!m) continue;
    const [, where, id, op, raw] = m, t = out[where];
    if (!op) t[id] = true;
    else if (raw === 'blank') t[id] = op === '==' ? '' : '__fill__';
    else if (raw === 'false' || raw === 'true') t[id] = (raw === 'true') === (op === '==');
    else if (/^'.*'$/.test(raw)) t[id] = op === '==' ? raw.slice(1, -1) : '__other__';
    else if (/^\d+$/.test(raw)) t[id] = op === '==' ? +raw : +raw + 1;
  }
  return out;
}
/* Values to test a setting with: different from its default, chosen to show. */
function probes(x, vals) {
  if (vals && vals[x.id]) return vals[x.id];
  const d = x.default;
  switch (x.type) {
    case 'checkbox': return [!d];
    case 'range': { const v = d === x.max ? x.min : x.max; return [v]; }
    case 'select': case 'radio': return x.options.map(o => o.value).filter(v => v !== d);
    case 'color': return ['#ff0000'];
    case 'color_scheme': return ['alt-scheme'];
    case 'font_picker': return [FONT];
    case 'image_picker': return [IMG];
    case 'url': return ['/pages/probe'];
    case 'richtext': return ['<p>Probe <strong>text</strong></p>'];
    case 'inline_richtext': return ['Probe <em>text</em>'];
    case 'textarea': return ['Probe, text, here'];
    default: return ['Probe text'];
  }
}
const fill = (list, id) => { const x = list.find(s => s.id === id); return x ? probes(x)[0] : 'x'; };
/* The settings this control needs on (its visible_if), and, for a switch, its dependents filled in. */
function context(x, list, blockList) {
  const p = prereq(x), sec = {}, blk = {};
  for (const [k, v] of Object.entries(p.section)) sec[k] = v === '__fill__' ? fill(list, k) : v === '__other__' ? (list.find(s => s.id === k).options.map(o => o.value).find(o => o !== list.find(s => s.id === k).default)) : v;
  for (const [k, v] of Object.entries(p.block)) blk[k] = v === '__fill__' ? fill(blockList || [], k) : v === '__other__' ? ((blockList || []).find(s => s.id === k).options.map(o => o.value).find(o => o !== (blockList || []).find(s => s.id === k).default)) : v;
  /* a switch: give the settings it reveals a value, so turning it on shows */
  const own = blockList || list, ref = new RegExp('(?:section|block)\\.settings\\.' + x.id + '\\b');
  for (const y of own) if (y.id && y.id !== x.id && ref.test(visibleIf(y)) && !y.hidden) {
    const pp = prereq(y), mine = blockList ? pp.block : pp.section;
    const others = Object.entries(mine).filter(([k]) => k !== x.id);
    if (others.every(([k, v]) => v === true ? true : false) || !others.length) { const t = blockList ? blk : sec; if (t[y.id] === undefined) t[y.id] = probes(y)[0]; for (const [k, v] of others) if (t[k] === undefined) t[k] = v; }
  }
  if (x.type === 'checkbox') { const t = blockList ? blk : sec; if (Object.values(prereq(x)[blockList ? 'block' : 'section']).length === 0) delete t[x.id]; }
  return {sec, blk};
}

/* ---------- the suite ---------- */
async function suite(name, cfg = {}) {
  const {schema: s} = schemaOf(name);
  const preset = (s.presets || [])[0] || {};
  /* A font picker reaches Liquid as a font object (family, fallback families), as on the real site. */
  const ASSISTANT = {family: 'Assistant', fallback_families: 'sans-serif'};
  const fonts = list => Object.fromEntries((list || []).filter(x => x.type === 'font_picker').map(x => [x.id, ASSISTANT]));
  const withFonts = bl => bl.map(b => ({...b, settings: {...fonts(((s.blocks || []).find(d => d.type === b.type) || {}).settings), ...(b.settings || {})}}));
  const blocksOf = () => withFonts(clone(preset.blocks || cfg.blocks || []));
  const opts = (o = {}) => {
    const out = {assets: ASSETS.concat(cfg.css || []), ...cfg.mountOpts, ...o};
    out.settings = {...fonts(s.settings), ...(o.settings || {})};
    out.blocks = withFonts(o.blocks ? clone(o.blocks) : blocksOf());
    if (o.instances) out.instances = o.instances.map(i => ({...i, settings: {...fonts(s.settings), ...(i.settings || {})}, blocks: withFonts(i.blocks ? clone(i.blocks) : blocksOf())}));
    return out;
  };
  const browser = await launch();
  const covered = {live: 0, redraw: 0, options: 0};
  const tag = (w, ed) => name + ' @' + w + (ed ? ' builder' : ' storefront');
  const quiet = async t => { await t.page.addStyleTag({content: NO_MOTION}); await frames(t.page); };
  try {
    /* schema */
    eq(schemaProblems(name), [], name + ' schema');
    const lists = [['section', s.settings], ...(s.blocks || []).map(b => ['block ' + b.type, b.settings])];
    for (const [where, list] of lists) {
      for (const x of list) {
        if ((x.type === 'select' || x.type === 'radio') && !x.hidden && x.options.length <= 3) ok(x.options.every(o => String(o.label).split(/\s+/).length <= 3), where + ' ' + x.id + ': short option labels');
        if (x.label && !x.hidden) ok(!/\u2014|\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(x.label + ' ' + (x.info || '') + ' ' + (typeof x.default === 'string' ? x.default : '')), where + ' ' + x.id + ': plain words');
        if (/^t:/.test(x.label || '')) ok(false, where + ' ' + x.id + ': label is a translation key');
      }
      const headers = list.filter(x => x.type === 'header').map(x => x.content);
      const order = ['General', 'Content', 'Messages', 'Layout', 'Media', 'Appearance', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'];
      if (where === 'section') { const idx = headers.map(h => order.indexOf(h)); ok(idx.every(i => i >= 0) && idx.every((v, i) => !i || v > idx[i - 1]), name + ' section groups in the shared order: ' + headers.join(', ')); }
    }
    ok(!/\u2014/.test(JSON.stringify(preset)) && !/\u2014/.test(s.name || ''), name + ' preset without em dashes');

    /* first paint, theme first, audit, overflow, at both widths, builder and storefront */
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const bare = await mount(browser, name, opts({width, editing, assets: ASSETS.concat(cfg.css || []).filter(a => a.endsWith('.css'))}));
      await quiet(bare);
      const first = await snapshot(bare.page, 'test');
      await bare.page.close();
      const t = await mount(browser, name, opts({width, editing}));
      await quiet(t);
      ok(same(first, await snapshot(t.page, 'test')), tag(width, editing) + ': first paint equals the hydrated paint ' + diff(first, await snapshot(t.page, 'test')));
      eq(await audit(t.page, 'test'), [], tag(width, editing) + ': markup equals the derived values');
      ok(await t.noOverflow(), tag(width, editing) + ': no sideways scroll');
      if (cfg.theme) await cfg.theme(t, {ok, eq, css: (sel, p, pseudo) => css(t.page, 'test', sel, p, pseudo), width, editing, tag: tag(width, editing)});
      /* every visible input has a label; buttons and fields are 44px */
      const a11y = await t.page.evaluate(() => {
        const W = document.getElementById('shopify-section-test'), bad = [];
        for (const i of W.querySelectorAll('input:not([type=hidden]), textarea, select')) { if (i.hidden || i.closest('[hidden]') || i.closest('[data-mt-trap]') || !i.getClientRects().length) continue; const l = i.id && W.querySelector('label[for="' + i.id + '"]'); if (!l || !l.textContent.trim()) bad.push('no label ' + (i.id || i.name)); if (i.getBoundingClientRect().height < 44) bad.push('short ' + i.id); }
        for (const b of W.querySelectorAll('button, [data-sl-button]')) if (!b.closest('[hidden]') && b.getClientRects().length && b.getBoundingClientRect().height < 44) bad.push('small button');
        return bad;
      });
      eq(a11y, [], tag(width, editing) + ': labelled fields and 44px targets');
      eq(t.errors, [], tag(width, editing) + ': no errors');
      await t.page.close();
    }
    /* theme first with priority off */
    { const t = await mount(browser, name, opts({width: 1366, priority: 'off'})); await quiet(t); eq(await audit(t.page, 'test'), [], name + ' priority off: audit'); if (cfg.theme) await cfg.theme(t, {ok, eq, css: (sel, p, pseudo) => css(t.page, 'test', sel, p, pseudo), width: 1366, editing: true, tag: name + ' priority off'}); await t.page.close(); }

    /* every control: live, redraw, live equals redraw, options pairwise distinct */
    const structural = new Set(cfg.structural || []), skip = new Set([...(cfg.skip || []), 'reveal', ...(cfg.messages ? cfg.messages.slice(0, 2) : [])]);
    /* Reveal on scroll: with the theme's reveal on, the section's parts take it; off, none do */
    if (s.settings.some(x => x.id === 'reveal')) {
      const t = await mount(browser, name, opts({width: 1366, editing: false, theme: {scroll_animation: 'fade_up', animation_duration: 700}}));
      const n = () => t.page.evaluate(() => { const W = document.getElementById('shopify-section-test'); return (W.classList.contains('scroll-trigger') ? 1 : 0) + W.querySelectorAll('.scroll-trigger').length; });
      ok(await n() > 0, name + ': Reveal on scroll uses the theme reveal');
      await t.redraw({settings: {reveal: false}});
      await t.page.evaluate(() => document.getElementById('shopify-section-test').classList.remove('scroll-trigger', 'fade_up'));
      await t.redraw({settings: {reveal: false}});
      ok(await n() === 0, name + ': Reveal on scroll off draws no reveal');
      await t.page.close();
    }
    const items = [];
    for (const x of s.settings) if (x.id && !x.hidden && !skip.has(x.id)) items.push({x, list: s.settings});
    for (const b of s.blocks || []) for (const x of b.settings) if (x.id && !x.hidden && !skip.has(b.type + '.' + x.id)) items.push({x, list: s.settings, block: b});
    const widths = [[375, true], [1366, true], [1366, false]];
    for (const [width, editing] of widths) {
      const t = await mount(browser, name, opts({width, editing, blocks: blocksOf().concat(cfg.sweepBlocks || [])}));
      await quiet(t);
      /* every id spelled out, so a redraw (which keeps the settings it is not given) starts clean */
      const base = {settings: {...Object.fromEntries(s.settings.filter(x => x.id).map(x => [x.id, null])), ...clone(t.rendered[0].section.settings)}, blocks: t.rendered[0].section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}))};
      for (const it of items) {
        const {x, block} = it, key = (block ? block.type + '.' : '') + x.id;
        let bi = block ? base.blocks.findIndex(b => b.type === block.type) : -1;
        const extra = [];
        if (block && bi < 0) { bi = base.blocks.length; extra.push({type: block.type, settings: {}}); }
        const ctx = context(x, s.settings, block ? block.settings : null);
        if (block) Object.assign(ctx.sec, prereq(x).section);
        const mk = v => {
          const settings = {...base.settings, ...(cfg.ctx && cfg.ctx[key] || {}), ...ctx.sec}, blocks = base.blocks.concat(extra).map(b => ({type: b.type, settings: {...b.settings}}));
          if (block) Object.assign(blocks[bi].settings, (cfg.bctx || {})[key] || {}, ctx.blk, v === undefined ? {} : {[x.id]: v}); else if (v !== undefined) settings[x.id] = v;
          return {settings, blocks};
        };
        /* start from the context, drawn by the server */
        const start = mk(undefined);
        await t.redraw({settings: start.settings, blocks: start.blocks}); await frames(t.page);
        const before = await snapshot(t.page, 'test');
        const shots = [];
        const values = probes(x, cfg.vals);
        for (const v of values) {
          const want = mk(v);
          let live = null;
          if (!structural.has(key)) {
            await t.emit(block ? {[x.id]: v} : {[x.id]: v}, block ? t.blockId(block.type) : undefined); await frames(t.page);
            live = await snapshot(t.page, 'test');
            eq(await audit(t.page, 'test'), [], tag(width, editing) + ' ' + key + '=' + JSON.stringify(v) + ': live markup equals the derived values');
          }
          await t.redraw({settings: want.settings, blocks: want.blocks}); await frames(t.page);
          const drawn = await snapshot(t.page, 'test');
          if (live) { ok(same(live, drawn), tag(width, editing) + ' ' + key + '=' + JSON.stringify(v) + ': the live edit draws what the redraw draws ' + diff(live, drawn)); covered.live++; }
          shots.push([v, drawn, same(before, drawn)]);
          covered.redraw++;
          /* back to the start for the next value */
          await t.redraw({settings: start.settings, blocks: start.blocks}); await frames(t.page);
        }
        /* it changes the section at the width it is for */
        const forWidth = /mobile/.test(x.id) ? width === 375 : /desktop/.test(x.id) ? width === 1366 : true;
        const noop = (cfg.noop || {})[width] || [];
        if (forWidth && !noop.includes(key)) for (const [v, , unchanged] of shots) ok(!unchanged, tag(width, editing) + ' ' + key + '=' + JSON.stringify(v) + ' changes the section');
        if ((x.type === 'select' || x.type === 'radio') && forWidth && !noop.includes(key)) {
          const sameOk = (cfg.same || {})[width] || [];
          for (let i = 0; i < shots.length; i++) for (let j = i + 1; j < shots.length; j++) {
            if (sameOk.some(([a, b]) => (a === shots[i][0] && b === shots[j][0]) || (a === shots[j][0] && b === shots[i][0]))) continue;
            ok(!same(shots[i][1], shots[j][1]), tag(width, editing) + ' ' + key + ': ' + shots[i][0] + ' and ' + shots[j][0] + ' draw differently');
            covered.options++;
          }
        }
      }
      eq(t.errors, [], tag(width, editing) + ': no errors in the control sweep');
      await t.page.close();
    }

    /* custom type and shape over the theme priority */
    for (const pr of cfg.priority || []) for (const width of [375, 1366]) for (const editing of [true, false]) {
      const t = await mount(browser, name, opts({width, editing, blocks: blocksOf()}));
      await quiet(t);
      const label = tag(width, editing) + ' priority ' + pr.name;
      if (pr.base) { await t.redraw({settings: {...(pr.base.section || {})}, blocks: t.rendered[0].section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...((pr.base.blocks || {})[b.type] || {})}}))}); await frames(t.page); }
      const theme = [];
      for (const [sel, prop, , pseudo] of pr.checks) theme.push(await css(t.page, 'test', sel, prop, pseudo));
      const want = pr.checks.map(c => typeof c[2] === 'function' ? c[2](width) : c[2]);
      /* live */
      if (pr.section) await t.emit(pr.section);
      for (const [type, set] of Object.entries(pr.blocks || {})) await t.emit(set, t.blockId(type));
      await frames(t.page);
      for (let i = 0; i < pr.checks.length; i++) { const [sel, prop, , pseudo] = pr.checks[i]; const got = await css(t.page, 'test', sel, prop, pseudo); ok(want[i] instanceof RegExp ? want[i].test(got) : got === want[i], label + ' live: ' + sel + ' ' + prop + ' = ' + got + ' (want ' + want[i] + ')'); }
      eq(await audit(t.page, 'test'), [], label + ' live audit');
      /* redraw */
      const blocks = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...((pr.blocks || {})[b.type] || {})}}));
      await t.redraw({settings: {...(pr.section || {})}, blocks}); await frames(t.page);
      for (let i = 0; i < pr.checks.length; i++) { const [sel, prop, , pseudo] = pr.checks[i]; const got = await css(t.page, 'test', sel, prop, pseudo); ok(want[i] instanceof RegExp ? want[i].test(got) : got === want[i], label + ' redraw: ' + sel + ' ' + prop + ' = ' + got); }
      /* off: live, then redraw */
      if (pr.off.section) await t.emit(pr.off.section);
      for (const [type, set] of Object.entries(pr.off.blocks || {})) await t.emit(set, t.blockId(type));
      await frames(t.page);
      for (let i = 0; i < pr.checks.length; i++) { const [sel, prop, , pseudo] = pr.checks[i]; eq(await css(t.page, 'test', sel, prop, pseudo), theme[i], label + ' off live: ' + sel + ' ' + prop + ' back to the theme'); }
      const offBlocks = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...((pr.off.blocks || {})[b.type] || {})}}));
      await t.redraw({settings: {...(pr.off.section || {})}, blocks: offBlocks}); await frames(t.page);
      for (let i = 0; i < pr.checks.length; i++) { const [sel, prop, , pseudo] = pr.checks[i]; eq(await css(t.page, 'test', sel, prop, pseudo), theme[i], label + ' off redraw: ' + sel + ' ' + prop + ' back to the theme'); }
      eq(t.errors, [], label + ': no errors');
      await t.page.close();
    }

    /* colour scheme: live and after a redraw */
    {
      const t = await mount(browser, name, opts({width: 1366}));
      await quiet(t);
      const bg = () => t.page.evaluate(() => { const r = document.querySelector('#shopify-section-test [data-ap-root]'); return getComputedStyle(r).backgroundColor; });
      ok(/24, 32, 40/.test(await bg()), name + ': the scheme background');
      await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
      ok(/250, 250, 250/.test(await bg()), name + ': alt scheme live');
      await t.redraw({settings: {color_scheme: 'alt-scheme'}});
      ok(/250, 250, 250/.test(await bg()), name + ': alt scheme after a redraw');
      await t.page.close();
    }

    /* two instances, an added block, one setup per redraw */
    {
      const t = await mount(browser, name, opts({width: 1366, instances: [{uid: 'a'}, {uid: 'b'}]}));
      await quiet(t);
      const b0 = await snapshot(t.page, 'b'), a0 = await snapshot(t.page, 'a');
      const pick = cfg.twoInstances || {padding_top: 90};
      await t.emit(pick, undefined, 'a'); await frames(t.page);
      ok(!same(a0, await snapshot(t.page, 'a')), name + ': an edit reaches instance a');
      ok(same(b0, await snapshot(t.page, 'b')), name + ': instance b is untouched ' + diff(b0, await snapshot(t.page, 'b')));
      if (cfg.blockEdit) {
        const [type, set] = cfg.blockEdit;
        await t.emit(set, t.blockId(type, 0, 'a'), 'a'); await frames(t.page);
        ok(same(b0, await snapshot(t.page, 'b')), name + ': a block edit in a leaves b untouched');
      }
      const count = () => t.page.evaluate(() => ({map: window.MateriaAccountPages.roots.size, dom: document.querySelectorAll('[data-ap-root]').length, ready: document.querySelectorAll('[data-ap-root][data-ap-ready]').length}));
      for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
      const c = await count();
      ok(c.map === c.dom && c.dom === 2 && c.ready === 2, name + ': each redraw sets the section up once ' + JSON.stringify(c));
      if (cfg.extraBlock) {
        const [type, set, live] = cfg.extraBlock;
        const blocks = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.settings})).concat([{type, settings: set}]);
        await t.redraw({uid: 'a', blocks}); await frames(t.page);
        const id = t.rendered[0].section.blocks[blocks.length - 1].id;
        ok(await t.page.evaluate(id => !!document.querySelector('[data-ap-block="' + id + '"]'), id), name + ': an added ' + type + ' block draws');
        const before = await snapshot(t.page, 'a');
        await t.emit(live, id, 'a'); await frames(t.page);
        ok(!same(before, await snapshot(t.page, 'a')), name + ': the added block is live');
        eq(await audit(t.page, 'a'), [], name + ': the added block audit');
      }
      eq(t.errors, [], name + ': instances, no errors');
      await t.page.close();
    }

    /* reduced motion with the theme reveal on: everything visible, nothing moving */
    for (const editing of [true, false]) {
      const t = await mount(browser, name, opts({width: 1366, editing, reducedMotion: 'reduce', theme: {scroll_animation: 'fade_up', animation_duration: 700}}));
      await t.page.waitForTimeout(250);
      const r = await t.page.evaluate(() => { const W = document.getElementById('shopify-section-test'); return [...W.querySelectorAll('h1, h2, h3, .ap__h, .ap__t, p, a, input, button')].filter(e => !e.closest('[hidden]') && !e.closest('.visually-hidden')).map(e => { let o = 1; for (let n = e; n && n !== W.parentElement; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; }); });
      ok(r.length > 0 && r.every(o => o === 1), name + (editing ? ' builder' : ' storefront') + ': reduced motion keeps the content visible ' + JSON.stringify(r));
      eq(t.errors, [], name + ': reduced motion, no errors');
      await t.page.close();
    }

    /* the form's own messages: the success message after a post, the error message with the store's field errors */
    if (cfg.messages) {
      const [succ, err, okSel, errSel] = cfg.messages;
      const errors = Object.assign(['email'], {messages: {email: 'Email is invalid'}});
      for (const [form, id, sel, text] of [[{'posted_successfully?': true, posted_successfully: true}, succ, okSel, 'Thanks, we got it.'], [{errors}, err, errSel, 'Fix these fields:']]) {
        const t = await mount(browser, name, opts({width: 375, editing: false, settings: {[id]: text}, globals: {...((cfg.mountOpts || {}).globals || {}), form}}));
        const got = await t.page.evaluate(sel => { const e = document.querySelector('#shopify-section-test ' + sel); return e ? {text: e.textContent.replace(/\s+/g, ' ').trim(), role: e.getAttribute('role')} : null; }, sel);
        ok(got && got.text.startsWith(text) && /status|alert/.test(got.role || ''), name + ': ' + id + ' shows the setting\'s words: ' + JSON.stringify(got));
        await t.page.close();
      }
    }
    if (cfg.extra) await cfg.extra(browser, {ok, eq, snapshot, audit, css, frames, quiet, opts, blocksOf, diff, same});
  } finally {
    await browser.close();
  }
  return {checks, covered};
}
function blockDefault(block, id, ctxBlk) { if (ctxBlk && id in ctxBlk) return ctxBlk[id]; const x = block.settings.find(s => s.id === id); return x ? x.default : undefined; }

/* ---------- a saved instance against the section before this work ---------- */
function fillSchema(raw, sec, toggles = {}, blockToggles = {}) {
  const schema = JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify;
  const d = list => Object.fromEntries((list || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
  const settings = {...d(schema.settings), ...sec.settings, ...toggles};
  const blocks = (sec.block_order || []).map(k => ({id: k, type: sec.blocks[k].type, settings: {...d((schema.blocks.find(b => b.type === sec.blocks[k].type) || {}).settings), ...sec.blocks[k].settings, ...(blockToggles[sec.blocks[k].type] || {})}}));
  return {id: 'S', settings, blocks, blocks_by_id: Object.fromEntries(blocks.map(b => [b.id, b]))};
}
async function renderRaw(raw, section, {editing = false} = {}) {
  const e = engine(); e.registerFilter('script_tag', () => ''); e.registerFilter('img_url', v => v?.url || v || '');
  const ctx = {section, settings: {scroll_animation: 'none'}, request: {design_mode: editing}, shop: {name: 'Materia Themes'}, routes: {root_url: '/'}};
  const tpl = raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '');
  return (await e.parseAndRender(tpl, ctx, {globals: ctx})).replace(/<script\b[\s\S]*?<\/script>/g, '');
}
/* the look of a section: text, colours, fonts, sizes and boxes of the elements a visitor reads */
async function look(browser, html, width, {assets = [], js = false} = {}) {
  const page = await browser.newPage({viewport: {width, height: 900}});
  await page.route('**/*', r => r.fulfill({body: r.request().url() === 'http://theme.test/' ? '<!doctype html><html><head></head><body></body></html>' : '', contentType: 'text/html'}));
  await page.goto('http://theme.test/');
  await page.addStyleTag({content: await themeControls()}); await page.addStyleTag({content: THEME_VARS});
  for (const f of ['critical.css', 'theme.css', 'theme-button-contract.css', ...assets]) await page.addStyleTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', f), 'utf8')});
  await page.addStyleTag({content: NO_MOTION});
  await page.evaluate(h => { const w = document.createElement('div'); w.id = 'shopify-section-S'; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w); }, html);
  if (js) { await page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets/hero-image-one.js'), 'utf8')}); await page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets/live-account-pages.js'), 'utf8')}); }
  await page.waitForTimeout(80);
  const r = await page.evaluate(() => {
    const W = document.getElementById('shopify-section-S'), top = W.getBoundingClientRect().top;
    const P = ['color', 'backgroundColor', 'backgroundImage', 'fontFamily', 'fontWeight', 'fontSize', 'lineHeight', 'textAlign', 'borderTopLeftRadius', 'borderTopColor', 'boxShadow'];
    const list = [...W.querySelectorAll('h1, h2, h3, p, li, label, input, textarea, button, a, iframe, img, svg, section, .section, .rte, .pw-launch__countdown, .pw-launch__content, .section__header-des, .sec__content-subheading, .sec__content-des, .support_customer, .contact_form, .wishlist-page__empty, [data-wishlist-items]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(e).visibility !== 'hidden'; });
    const own = e => [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
    return {height: Math.round(W.getBoundingClientRect().height), els: list.map(e => { const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return [e.tagName, own(e) || e.getAttribute('placeholder') || '', ...P.map(p => cs[p]), Math.round(b.left), Math.round(b.top - top), Math.round(b.width), Math.round(b.height)].join('|'); })};
  });
  await page.close();
  return r;
}
async function savedLook(browser, {name, template, key, toggles = {}, blockToggles = {}, assets = [], tolerate}) {
  let oldRaw; try { oldRaw = execSync('git show ' + BEFORE + ':sections/' + name + '.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}); } catch (_) { console.log('saved ' + name + ': the commit before this work is not in this clone, comparison skipped'); return 0; }
  const newRaw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8');
  const sec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', template), 'utf8')).sections[key];
  let n = 0;
  for (const width of [375, 1366]) {
    const a = await look(browser, await renderRaw(oldRaw, fillSchema(oldRaw, sec)), width, {assets});
    const b = await look(browser, await renderRaw(newRaw, fillSchema(newRaw, sec, toggles, blockToggles)), width, {assets, js: true});
    const fix = x => tolerate ? x.map(tolerate) : x;
    /* boxes may round a pixel differently; everything else is the same */
    const close = (p, q) => p === q || (p.split('|').length === q.split('|').length && p.split('|').every((v, i) => { const w = q.split('|')[i]; return v === w || (/^-?\d+$/.test(v) && /^-?\d+$/.test(w) && Math.abs(v - w) <= 1); }));
    const A = fix(a.els), B = fix(b.els);
    ok(A.length === B.length && A.every((v, i) => close(v, B[i])), name + ' saved ' + key + ' @' + width + ': same text, colours, fonts, sizes and layout\n' + B.filter((v, i) => !close(v, A[i] || '')).map((v, i) => 'new ' + v + '\nold ' + A[B.indexOf(v)]).join('\n'));
    ok(Math.abs(b.height - a.height) <= 1, name + ' saved ' + key + ' @' + width + ': same height ' + b.height + ' vs ' + a.height);
    n++;
  }
  return n;
}

module.exports = {suite, savedLook, snapshot, audit, css, frames, ok, eq, IMG, FONT, MAP, NO_MOTION, ASSETS, count: () => checks, launch, mount, render, schemaOf};
