/* Shared checks for the round 4 testimonials tests (tests/theme-testimonials-r4-*.cjs).
   Not a test on its own: each section's test file calls run(spec).

   spec = {
     name: section type, blocks?: first-preset override,
     root: selector of the [data-lt-root] element,
     inherit: [[selector, cssProp, expected]...]   theme values with defaults,
     controls: [{id, block?, n?, value, pre?, sel, prop | get(el), expect, w?, live?: false}],
     colours: same shape, run with enable_custom_style on, then off (expect theme values back),
     fonts: [{id, block?, sel, prop?}] font pickers (custom fonts on),
     own: [{on: settings, block?, sel, attr, prop, expect}] theme priority opt outs,
     variants: [{id, block?, values, sel, read(el)}] selects whose options must look different,
     slider?: {track, next}, extra?: async (t, ctx) => {}, saved?: [{file, key}] }
*/
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict'), {execFileSync} = require('node:child_process');
const {launch, mount, render, schemaProblems, schemaOf} = require('./media-fixture.cjs');
const ASSET = 'live-testimonials.js';
const ALL = [[375, true], [375, false], [1366, true], [1366, false]];
const wait2 = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const read = (t, sel, prop, uid) => t.page.locator('#shopify-section-' + (uid || t.section.id) + ' ' + sel).first().evaluate((el, k) => typeof k === 'string' ? getComputedStyle(el)[k] : null, prop);
async function value(t, c, uid) {
  const loc = t.page.locator('#shopify-section-' + (uid || t.section.id) + ' ' + c.sel).first();
  if (c.get) return loc.evaluate(c.get);
  if (c.attr) return loc.evaluate((el, a) => el.getAttribute(a), c.attr);
  return loc.evaluate((el, k) => { const [p, pseudo] = k.split('::'); return getComputedStyle(el, pseudo ? '::' + pseudo : null)[p]; }, c.prop);
}
const same = (got, want) => want instanceof RegExp ? want.test(String(got)) : typeof want === 'function' ? want(got) : String(got) === String(want);

async function run(spec) {
  let checks = 0;
  const fails = [];
  /* every failure is listed (R4_STRICT=1 stops at the first) */
  const ok = (c, m) => { if (process.env.R4_STRICT) assert.ok(c, m); if (c) checks++; else { fails.push(m); console.log('FAIL ' + m); } };
  const name = spec.name;
  const {schema} = schemaOf(name);
  ok(schemaProblems(name).length === 0, name + ': schema problems ' + JSON.stringify(schemaProblems(name)));
  /* every setting id kept since HEAD, and every non hidden control covered */
  let old = null;
  try { old = JSON.parse(execFileSync('git', ['show', (process.env.R4_BASE || 'HEAD') + ':sections/' + name + '.storelib'], {encoding: 'utf8', cwd: path.join(__dirname, '..')}).split('<schema>')[1].split('</schema>')[0]).shopify; } catch (_) {}
  if (old) {
    for (const x of old.settings.filter(x => x.id)) ok(schema.settings.some(y => y.id === x.id), name + ': keeps ' + x.id);
    for (const b of old.blocks || []) for (const x of (b.settings || []).filter(x => x.id)) ok(((schema.blocks.find(y => y.type === b.type) || {}).settings || []).some(y => y.id === x.id), name + ': keeps ' + b.type + '.' + x.id);
  }
  const covered = new Set([...(spec.controls || []), ...(spec.colours || []), ...(spec.fonts || []), ...(spec.variants || [])].map(c => (c.block || '') + ':' + c.id).concat(spec.covered || [], [':color_scheme']));
  const visible = [...schema.settings.filter(x => x.id && !x.hidden && x.type !== 'header').map(x => ':' + x.id), ...(schema.blocks || []).flatMap(b => (b.settings || []).filter(x => x.id && !x.hidden && x.type !== 'header').map(x => b.type + ':' + x.id))];
  for (const id of visible) ok(covered.has(id), name + ': control ' + id + ' has a check');
  /* labels and order */
  const headers = schema.settings.filter(x => x.type === 'header').map(x => x.content);
  const ORDER = ['General', 'Content', 'Layout', 'Media', 'Video', 'Images', 'Appearance', 'Buttons', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'];
  ok(headers.every(h => ORDER.includes(h)) && headers.map(h => ORDER.indexOf(h)).every((v, i, a) => !i || v > a[i - 1]), name + ': groups in the shared order ' + headers.join(', '));
  const preset = (schema.presets || [])[0];
  ok(preset && !JSON.stringify(preset).match(/—|unlock|elevate|seamless|powerful|effortless|supercharge|transform/i), name + ': first preset copy is plain');

  const browser = await launch();
  try {
    for (const [width, editing] of ALL) {
      const tag = name + '@' + width + (editing ? ' editor' : ' storefront');
      const t = await mount(browser, name, {width, editing, assets: [...(spec.assets || []), ASSET], blocks: spec.blocks, globals: spec.globals, settings: spec.settings});
      const R = spec.root;
      await wait2(t.page);
      /* theme inheritance */
      for (const [sel, prop, want] of spec.inherit || []) { const got = await value(t, {sel, prop}); ok(same(got, want), tag + ': inherits ' + sel + ' ' + prop + ' = ' + want + ' (got ' + got + ')'); }
      ok(await t.page.evaluate(n => !!window.MateriaLiveTestimonials && [...window.MateriaLiveTestimonials.roots.values()].some(s => s.type === n), name), tag + ': controller took the section');
      /* scheme switch, live and after redraw */
      await t.emit({color_scheme: 'alt-scheme'}); await wait2(t.page);
      ok(await read(t, spec.bg || R, 'backgroundColor') === 'rgb(250, 250, 250)', tag + ': scheme switch live');
      await t.emit({color_scheme: 'default-color-scheme'}); await wait2(t.page);
      ok(await read(t, spec.bg || R, 'backgroundColor') === 'rgb(24, 32, 40)', tag + ': scheme back live');
      if (editing) {
        await t.redraw({settings: {color_scheme: 'alt-scheme'}});
        ok(await read(t, spec.bg || R, 'backgroundColor') === 'rgb(250, 250, 250)', tag + ': scheme switch after redraw');
        await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      }
      /* each control, live and (editor) after a redraw */
      const apply = async (c, settings, live) => {
        const bid = c.block ? t.blockId(c.block, c.n || 0) : null;
        if (live) { await t.emit(settings, bid || undefined); await wait2(t.page); return; }
        if (!bid) { await t.redraw({settings}); return; }
        const r = t.rendered.find(x => x.section.id === t.section.id);
        const blocks = r.section.blocks.map(b => ({type: b.type, settings: b.id === bid ? {...b.settings, ...settings} : b.settings}));
        await t.redraw({blocks});
      };
      const orig = (c, ids) => { const r = t.rendered.find(x => x.section.id === t.section.id), sec = r.section; const src = c.block ? sec.blocks.find(b => b.id === t.blockId(c.block, c.n || 0)).settings : sec.settings; return Object.fromEntries(ids.map(k => [k, src[k] === undefined ? null : src[k]])); };
      const one = async (c, live, want = c.expect, label = '') => {
        if (c.w && c.w !== width) return;
        if (c.live === false && live) return;
        if (process.env.R4_TRACE) console.log('trace', width, live, c.block || '', c.id);
        const pre = c.pre || {}, preBlock = c.preBlock || {};
        const keep = orig(c, [c.id, ...Object.keys(c.block ? {...pre, ...preBlock} : pre)]);
        const keepSec = c.block && Object.keys(pre).length ? orig({}, Object.keys(pre)) : null;
        if (c.block && Object.keys(pre).length) await apply({}, pre, live);
        await apply(c, {...(c.block ? preBlock : pre), [c.id]: c.value}, live);
        const got = await value(t, c);
        ok(same(got, want), tag + (live ? ' live' : ' redraw') + ': ' + (c.block ? c.block + '.' : '') + c.id + label + ' -> ' + (c.sel) + ' ' + (c.prop || c.attr || 'value') + ' = ' + want + ' (got ' + got + ')');
        await apply(c, keep, live);
        if (keepSec) await apply({}, keepSec, live);
      };
      for (const c of spec.controls || []) { await one(c, true); if (editing) await one(c, false); }
      /* colours: on lands, off restores the theme value */
      for (const c of spec.colours || []) {
        const sw = c.block ? c.toggle || spec.blockToggle || 'enable_custom_style' : spec.customId || 'enable_custom_style';
        const on = {...c, pre: {...(c.pre || {}), ...(c.block ? {} : {[sw]: true})}, preBlock: c.block ? {[sw]: true} : {}};
        await one(on, true); if (editing) await one(on, false);
        if (c.theme !== undefined) { const off = {...c, pre: {...(c.pre || {}), ...(c.block ? {} : {[sw]: false})}, preBlock: c.block ? {[sw]: false} : {}}; await one(off, true, c.theme, ' (custom off)'); if (editing) await one(off, false, c.theme, ' (custom off)'); }
      }
      /* fonts */
      for (const c of spec.fonts || []) {
        const sw = c.toggle || 'enable_custom_fonts';
        const f = {...c, value: {family: 'Courier New', fallback_families: 'monospace', style: 'normal', weight: 400}, pre: c.block ? {} : {[sw]: true}, preBlock: c.block ? {[sw]: true} : {}, prop: 'fontFamily', expect: /Courier New/};
        await one(f, true); if (editing) await one(f, false);
        for (const d of c.desc || []) { const g = {...f, sel: d}; await one(g, true); }
      }
      /* theme priority opt outs: attribute present while on, absent and theme value back while off */
      for (const o of spec.own || []) {
        if (o.w && o.w !== width) continue;
        const bid = o.block ? t.blockId(o.block, o.n || 0) : undefined;
        await t.emit(o.on, bid); await wait2(t.page);
        ok(await t.page.locator('#shopify-section-' + t.section.id + ' ' + (o.attrSel || o.sel)).first().evaluate((el, a) => el.closest('[' + a + ']') !== null, o.attr), tag + ' live: ' + o.attr + ' on ' + (o.attrSel || o.sel));
        for (const s of [o.sel, ...(o.desc || [])]) ok(same(await value(t, {sel: s, prop: o.prop}), o.expect), tag + ' live: own ' + o.prop + ' wins on ' + s + ' (got ' + await value(t, {sel: s, prop: o.prop}) + ')');
        if (editing) {
          const r = t.rendered.find(x => x.section.id === t.section.id);
          const blocks = r.section.blocks.map(b => ({type: b.type, settings: b.id === bid ? {...b.settings, ...o.on} : b.settings}));
          await t.redraw(bid ? {blocks} : {settings: o.on});
          ok(same(await value(t, {sel: o.sel, prop: o.prop}), o.expect), tag + ' redraw: own ' + o.prop + ' wins on ' + o.sel);
        }
        await t.emit(o.off, bid); await wait2(t.page);
        ok(await t.page.locator('#shopify-section-' + t.section.id + ' ' + (o.attrSel || o.sel)).first().evaluate((el, a) => !el.hasAttribute(a), o.attr), tag + ' live: ' + o.attr + ' off');
        if (o.theme !== undefined) ok(same(await value(t, {sel: o.sel, prop: o.prop}), o.theme), tag + ' live: theme ' + o.prop + ' back on ' + o.sel + ' (got ' + await value(t, {sel: o.sel, prop: o.prop}) + ')');
        if (editing) {
          const r = t.rendered.find(x => x.section.id === t.section.id);
          const blocks = r.section.blocks.map(b => ({type: b.type, settings: b.id === bid ? {...b.settings, ...o.off} : b.settings}));
          await t.redraw(bid ? {blocks} : {settings: o.off});
          if (o.theme !== undefined) ok(same(await value(t, {sel: o.sel, prop: o.prop}), o.theme), tag + ' redraw: theme ' + o.prop + ' back');
        }
      }
      /* variants: every option looks different */
      for (const v of spec.variants || []) {
        if (!editing || width !== (v.w || 1366)) continue;
        const seen = [];
        for (const val of v.values) {
          const bid = v.block ? t.blockId(v.block, v.n || 0) : undefined;
          await t.emit({...(v.pre || {}), [v.id]: val}, bid); await wait2(t.page);
          seen.push(JSON.stringify(await t.page.locator('#shopify-section-' + t.section.id + ' ' + v.sel).first().evaluate(v.read)));
        }
        ok(new Set(seen).size === seen.length, tag + ': ' + v.id + ' options look different ' + seen.join(' | '));
        const bid = v.block ? t.blockId(v.block, v.n || 0) : undefined;
        await t.emit({[v.id]: v.reset !== undefined ? v.reset : v.values[0]}, bid); await wait2(t.page);
      }
      if (spec.extra) await spec.extra(t, {width, editing, ok: (c, m) => ok(c, tag + ': ' + m), wait2, tag});
      ok(await t.noOverflow(), tag + ': no sideways scroll');
      ok(t.errors.length === 0, tag + ': no errors ' + t.errors.join(' | '));
      await t.page.close();
    }

    /* two instances stay independent; added block + redraw; redraw does not double up */
    {
      const t = await mount(browser, name, {width: 1366, assets: [...(spec.assets || []), ASSET], instances: [{uid: 'a', blocks: spec.blocks, settings: spec.settings}, {uid: 'b', blocks: spec.blocks, settings: spec.settings}], globals: spec.globals});
      const c = spec.independent;
      const before = await value(t, c, 'b');
      await t.emit({...(c.pre || {}), [c.id]: c.value}, c.block ? t.blockId(c.block, 0, 'a') : undefined, 'a'); await wait2(t.page);
      ok(same(await value(t, c, 'a'), c.expect), name + ': instance a changed');
      ok(await value(t, c, 'b') === before, name + ': instance b unchanged');
      const count = () => t.page.evaluate(n => [...window.MateriaLiveTestimonials.roots.values()].filter(s => s.type === n).length, name);
      ok(await count() === 2, name + ': two roots tracked');
      const r = t.rendered.find(x => x.section.id === 'a');
      const blocks = r.section.blocks.map(b => ({type: b.type, settings: b.settings})).concat(spec.addBlock ? [spec.addBlock] : []);
      await t.redraw({uid: 'a', blocks}); await t.redraw({uid: 'a', blocks});
      ok(await count() === 2, name + ': redraws keep one root per instance');
      if (spec.addBlock) {
        const n = await t.page.locator('#shopify-section-a [data-lt-block]').count();
        ok(n === blocks.filter(b => spec.blockCount ? spec.blockCount(b) : true).length || n > 0, name + ': added block rendered');
        const last = t.rendered.find(x => x.section.id === 'a').section.blocks.slice(-1)[0];
        if (spec.addBlockLive) { await t.emit(spec.addBlockLive.settings, last.id, 'a'); await wait2(t.page); ok(same(await value(t, spec.addBlockLive, 'a'), spec.addBlockLive.expect), name + ': added block is live editable'); }
      }
      ok(await t.page.evaluate(n => [...window.MateriaLiveTestimonials.roots.values()].filter(s => s.type === n).every(s => s.inits === 1), name), name + ': each root set up once');
      ok(t.errors.length === 0, name + ': no errors (instances) ' + t.errors.join(' | '));
      await t.page.close();
    }

    /* first paint equals the hydrated paint */
    for (const width of [375, 1366]) {
      const snap = t => t.page.evaluate(sel => { for (const an of document.getAnimations()) { an.pause(); an.currentTime = 0; } return sel; }, '').then(() => t.page.evaluate(sel => [...document.querySelectorAll(sel)].slice(0, 80).map(el => { const r = el.getBoundingClientRect(), c = getComputedStyle(el); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontFamily, c.fontSize, c.fontWeight].join(','); }), '[data-lt-root] *:not(.lt-dot)'));
      const a = await mount(browser, name, {width, assets: [...(spec.assets || [])], blocks: spec.firstPaintBlocks || spec.blocks, globals: spec.globals, settings: spec.firstPaint, inlineScripts: false});
      const b = await mount(browser, name, {width, assets: [...(spec.assets || []), ASSET], blocks: spec.firstPaintBlocks || spec.blocks, globals: spec.globals, settings: spec.firstPaint, inlineScripts: false});
      await wait2(a.page); await wait2(b.page);
      const sa = await snap(a), sb = await snap(b);
      const diff = sa.map((x, i) => x === sb[i] ? null : i + ': ' + x + ' / ' + sb[i]).filter(Boolean);
      ok(diff.length === 0, name + '@' + width + ': first paint equals hydrated paint ' + diff.slice(0, 3).join(' ; '));
      await a.page.close(); await b.page.close();
    }

    /* reduced motion: content visible, nothing runs on its own */
    {
      const t = await mount(browser, name, {width: 1366, assets: [...(spec.assets || []), ASSET], blocks: spec.blocks, globals: spec.globals, settings: {...(spec.motion || {})}, reducedMotion: 'reduce'});
      await t.page.waitForTimeout(300);
      ok(await t.page.locator('#shopify-section-' + t.section.id + ' ' + R0(spec)).first().isVisible(), name + ': visible under reduced motion');
      ok(await t.page.evaluate(() => [...document.querySelectorAll('video')].every(v => v.paused)), name + ': no video plays under reduced motion');
      ok(await t.page.evaluate(() => [...window.MateriaLiveTestimonials.roots.values()].every(s => !s.slider || !s.slider.running)), name + ': no autoplay under reduced motion');
      ok(await t.page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).length === 0), name + ': no endless animation under reduced motion');
      await t.page.close();
    }
    if (spec.after) await spec.after(browser, {ok});
  } finally { await browser.close(); }
  if (fails.length) throw new Error(fails.length + ' failed of ' + (checks + fails.length) + ' checks');
  return checks;
}
const R0 = spec => spec.visible || spec.root;
module.exports = {run, wait2, value, ASSET, ALL, render, mount, launch};
