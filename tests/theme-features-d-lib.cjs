/* Shared checks for the features-d sections (Progress Benefits, Progress Circles,
   Stat Counter, Stat Counter Pro, Steps, Product Benefits 4). Used by
   tests/theme-features-d-<section>.cjs; running this file alone does nothing. */
const assert = require('assert/strict');
const fixture = require('./media-fixture.cjs');
const {launch, schemaOf, schemaProblems} = fixture;
/* The fixture's mount, with emit and redraw also waiting for two frames, so a busy machine
   (the controller paints in requestAnimationFrame) cannot read a value before it is painted. */
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
/* The shipped presets carry no numbers (a stat with no number draws nothing on the storefront, so no
   figure is ever invented for a store). These checks need stats with values to count, ring and lay out,
   so a section mounted without its own blocks gets these sample stat blocks: test data, never shipped. */
const SAMPLE = {"progress-benefits": [{"type": "heading", "settings": {"text": "What customers <em>noticed</em>"}}, {"type": "subheading", "settings": {"text": "<p>Add a short line about the product and what these numbers measure.</p>"}}, {"type": "stat", "settings": {"percent": 92, "text": "<p>Say what this first percentage measures.</p>"}}, {"type": "stat", "settings": {"percent": 88, "text": "<p>Say what this second percentage measures.</p>"}}, {"type": "stat", "settings": {"percent": 95, "text": "<p>Say what this third percentage measures.</p>"}}, {"type": "stat", "settings": {"percent": 84, "text": "<p>Say what this fourth percentage measures.</p>"}}, {"type": "footnote", "settings": {"text": "<p>Add where these numbers come from.</p>"}}], "progress-circles": [{"type": "heading", "settings": {"text": "Results you can <em>measure</em>"}}, {"type": "stat", "settings": {"percent": 85, "label": "First result"}}, {"type": "stat", "settings": {"percent": 80, "label": "Second result"}}, {"type": "stat", "settings": {"percent": 60, "label": "Third result"}}, {"type": "stat", "settings": {"percent": 99, "label": "Fourth result"}}, {"type": "footnote", "settings": {"text": "<p>Add where these numbers come from.</p>"}}], "stat-counter": [{"type": "eyebrow", "settings": {"text": "By the numbers"}}, {"type": "heading", "settings": {"text": "What our numbers say"}}, {"type": "subheading", "settings": {"text": "<p>Replace these with your own numbers.</p>"}}, {"type": "stat", "settings": {"value": "12,000", "suffix": "+", "label": "Happy customers"}}, {"type": "stat", "settings": {"value": "98", "suffix": "%", "label": "5-star reviews"}}, {"type": "stat", "settings": {"value": "50", "suffix": "+", "label": "Countries served"}}, {"type": "stat", "settings": {"value": "24", "suffix": "h", "label": "Avg. ship time"}}], "stat-counter-pro": [{"type": "eyebrow", "settings": {"text": "Why shop with us"}}, {"type": "heading", "settings": {"text": "What our numbers say"}}, {"type": "subheading", "settings": {"text": "<p>Replace these with your own numbers.</p>"}}, {"type": "stat", "settings": {"value": "98", "ring_max": "100", "suffix": "%", "label": "Five-star reviews", "trend_direction": "up", "trend_value": "+4% YoY"}}, {"type": "stat", "settings": {"value": "24", "ring_max": "48", "suffix": "h", "label": "Avg. ship time", "trend_direction": "down", "trend_value": "-30%"}}, {"type": "stat", "settings": {"value": "1,200", "ring_max": "1500", "suffix": "+", "label": "Happy customers", "trend_direction": "up", "trend_value": "+18%"}}, {"type": "stat", "settings": {"value": "50", "ring_max": "100", "suffix": "+", "label": "Countries served", "trend_direction": "flat", "trend_value": "Global"}}]};
function sample(name, opts = {}) {
  if (!SAMPLE[name]) return opts;
  if (opts.instances) return {...opts, instances: opts.instances.map(i => i.blocks ? i : {...i, blocks: SAMPLE[name]})};
  return opts.blocks ? opts : {...opts, blocks: SAMPLE[name]};
}
async function mount(browser, name, opts) {
  opts = sample(name, opts);
  const t = await fixture.mount(browser, name, opts), emit = t.emit, redraw = t.redraw;
  t.emit = async (...a) => { await emit(...a); await frames(t.page); };
  /* A redraw on the storefront draws a fresh pending section, which fills and counts again once:
     wait for that, and finish the ring transitions, so the values read are the final ones. */
  t.redraw = async (...a) => { const r = await redraw(...a); await frames(t.page); if (!(opts && opts.editing === true)) { await t.page.waitForTimeout(80); await settled(t.page); await t.page.evaluate(() => document.querySelectorAll('[data-fd] *').forEach(e => e.getAnimations().forEach(x => { if (x instanceof CSSTransition) x.finish(); }))); } return r; };
  return t;
}
const ASSET = 'live-features-d.js';
const WIDTHS = [375, 1366], DESK = w => w >= 768;

/* Every non-hidden setting id of the section and its blocks: 'id' or 'block:type:id'. */
function visibleIds(name) {
  const {schema} = schemaOf(name), out = [];
  for (const x of schema.settings || []) if (x.id && !x.hidden) out.push(x.id);
  for (const b of schema.blocks || []) for (const x of b.settings || []) if (x.id && !x.hidden) out.push('block:' + b.type + ':' + x.id);
  return out;
}

/* Reads a computed style, an attribute or a property of the first match inside one section. */
async function read(t, sel, what, uid = t.section.id) {
  return t.page.evaluate(({sel, what, uid}) => {
    const scope = document.getElementById('shopify-section-' + uid);
    const el = sel === ':wrapper' ? scope : sel ? scope.querySelector(sel) : scope.querySelector('[data-fd]');
    if (!el) return '<missing ' + sel + '>';
    if (what.startsWith('@')) return el.getAttribute(what.slice(1));
    if (what.startsWith('.')) { const v = el[what.slice(1)]; return typeof v === 'boolean' || typeof v === 'number' ? v : String(v); }
    if (what === 'visible') return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
    if (what === 'count') return scope.querySelectorAll(sel).length;
    if (what === 'text') return el.textContent.trim();
    if (what === 'box') { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); }
    return getComputedStyle(el)[what];
  }, {sel, what, uid});
}

/* Section setting or block setting through the live editor event. */
async function emit(t, entry, value, uid) {
  if (entry.block) await t.emit({[entry.id]: value}, t.blockId(entry.block, entry.n || 0, uid), uid);
  else await t.emit({[entry.id]: value}, undefined, uid);
  if (entry.wait) await t.page.waitForTimeout(entry.wait);
}
/* Runs a control table: each entry {id, v, block?, n?, sel, css, exp(w)|value, live (default true), solo, check(t,w)}.
   exp may return null to skip a width. Live: emit the value, check, emit the old value back.
   Redraw: each entry in its own redraw (entries marked batch share one). */
async function controls(t, width, entries, ctx = {}) {
  let n = 0;
  const expect = (e) => typeof e.exp === 'function' ? e.exp(width) : e.exp;
  const check = async (e, how) => {
    if (e.check) { await e.check(t, width, how); n++; return; }
    const want = expect(e); if (want === null || want === undefined) return;
    const got = await read(t, e.sel, e.css);
    if (want instanceof RegExp) assert.match(String(got), want, `${how} ${e.block ? e.block + '.' : ''}${e.id}=${JSON.stringify(e.v)} ${e.sel} ${e.css} @${width}`);
    else assert.equal(got, want, `${how} ${e.block ? e.block + '.' : ''}${e.id}=${JSON.stringify(e.v)} ${e.sel} ${e.css} @${width}`);
    n++;
  };
  const base = t.rendered[0].section;
  await t.page.mouse.move(0, 0); /* hovering a carousel pauses its autoplay */
  for (const e of entries) {
    if (e.live === false) continue;
    const before = e.block ? base.blocks.filter(b => b.type === e.block)[e.n || 0].settings[e.id] : base.settings[e.id];
    if (e.pre) for (const [k, v] of Object.entries(e.pre)) await emit(t, {id: k, block: e.preBlock ? e.block : undefined}, v);
    await emit(t, e, e.v);
    await check(e, 'live');
    await emit(t, e, before);
    if (e.pre) for (const k of Object.keys(e.pre)) await emit(t, {id: k, block: e.preBlock ? e.block : undefined}, e.preBlock ? base.blocks.filter(b => b.type === e.block)[e.n || 0].settings[k] : base.settings[k]);
  }
  const original = {settings: {...base.settings}, blocks: base.blocks.map(b => ({type: b.type, settings: {...b.settings}}))};
  const apply = async list => {
    const settings = {...original.settings, ...(ctx.redrawBase || {})}, blocks = original.blocks.map(b => ({type: b.type, settings: {...b.settings}}));
    for (const e of list) {
      if (e.block) { const target = blocks.filter(b => b.type === e.block)[e.n || 0]; Object.assign(target.settings, e.preBlock ? e.pre : {}, {[e.id]: e.v}); if (e.pre && !e.preBlock) Object.assign(settings, e.pre); }
      else Object.assign(settings, e.pre || {}, {[e.id]: e.v});
    }
    await t.redraw({settings, blocks});
  };
  const shared = entries.filter(e => e.batch && e.redraw !== false);
  if (shared.length) { await apply(shared); for (const e of shared) await check(e, 'redraw'); }
  for (const e of entries.filter(e => !e.batch && e.redraw !== false)) { await apply([e]); await check(e, 'redraw'); }
  await t.redraw({settings: original.settings, blocks: original.blocks});
  return n;
}

/* Asserts the table covers every non-hidden setting id of the schema. */
function coverage(name, entries, extra = []) {
  const have = new Set(entries.map(e => e.block ? 'block:' + e.block + ':' + e.id : e.id).concat(extra));
  const missing = visibleIds(name).filter(id => !have.has(id));
  assert.deepEqual(missing, [], name + ': settings without a control check');
}

/* Bounding boxes and key styles of every element matching sel. */
async function snapshot(t, sel) {
  return t.page.evaluate(sel => [...document.querySelectorAll(sel)].map(el => { const r = el.getBoundingClientRect(), c = getComputedStyle(el); return [el.className && el.className.baseVal === undefined ? String(el.className).split(' ')[0] : el.tagName, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontSize, c.fontFamily, c.display].join('|'); }), sel);
}

/* Counts setInterval/clearInterval and play()/pause() from now on. */
async function instrument(page) {
  await page.evaluate(() => {
    if (window.__fdCount) return;
    const c = window.__fdCount = {intervals: new Set(), made: 0, play: 0, pause: 0};
    const si = window.setInterval, ci = window.clearInterval;
    window.setInterval = (...a) => { const id = si(...a); c.intervals.add(id); c.made++; return id; };
    window.clearInterval = id => { c.intervals.delete(id); return ci(id); };
    const play = HTMLMediaElement.prototype.play, pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function () { c.play++; return play.call(this).catch(() => {}); };
    HTMLMediaElement.prototype.pause = function () { c.pause++; return pause.call(this); };
  });
}
const counts = page => page.evaluate(() => ({active: window.__fdCount.intervals.size, made: window.__fdCount.made, play: window.__fdCount.play, pause: window.__fdCount.pause, roots: window.MateriaFeaturesD.size()}));

async function hoverBg(t, sel) {
  const el = t.root(sel).first();
  await el.scrollIntoViewIfNeeded(); await el.hover(); await t.page.waitForTimeout(60);
  const v = await el.evaluate(e => getComputedStyle(e).backgroundColor);
  await t.page.mouse.move(0, 0); await t.page.waitForTimeout(30);
  return v;
}

/* Target sizes of every visible interactive control in one section. */
async function smallTargets(t) {
  return t.page.evaluate(id => [...document.querySelectorAll('#shopify-section-' + id + ' :is(button, a)')].filter(el => el.offsetWidth && getComputedStyle(el).visibility !== 'hidden').map(el => { const r = el.getBoundingClientRect(); return {cls: String(el.className).split(' ')[0], w: Math.round(r.width), h: Math.round(r.height)}; }).filter(r => r.w < 44 || r.h < 44), t.section.id);
}

/* Theme typography and button rules (snippets/theme-controls) loaded the way the layout prints them. */
const own = (t, sel, name) => t.page.evaluate(({sel, name, id}) => { const el = document.querySelector('#shopify-section-' + id + ' ' + sel); return el ? el.hasAttribute(name) : '<missing ' + sel + '>'; }, {sel, name, id: t.section.id});
/* Waits until every running count in the page has finished. */
const settled = page => page.waitForFunction(() => [...(window.MateriaFeaturesD ? document.querySelectorAll('[data-fd]') : [])].every(r => !window.MateriaFeaturesD.state(r) || !window.MateriaFeaturesD.state(r).counting.size), null, {timeout: 8000});
/* The section as it was before round 4 (git show BEFORE, the commit before these sections were
   reworked), served to the fixture in this process only under the name <name>-fdhead, so old and
   new can be drawn side by side. Nothing is written to disk. */
const BEFORE = '4b0142b';
function headCopy(name, ref = BEFORE) {
  const fs = require('fs'), path = require('path'), {execFileSync} = require('child_process');
  const src = execFileSync('git', ['-C', path.join(__dirname, '..'), 'show', ref + ':sections/' + name + '.storelib']).toString();
  const tmp = name + '-fdhead', file = path.join(__dirname, '..', 'sections', tmp + '.storelib');
  if (!fs.__fdHead) { const orig = fs.readFileSync; fs.__fdHead = new Map(); fs.readFileSync = function (f, ...a) { const v = fs.__fdHead.get(path.resolve(String(f))); return v === undefined ? orig.call(this, f, ...a) : (a[0] ? v : Buffer.from(v)); }; }
  fs.__fdHead.set(path.resolve(file), src);
  return tmp;
}

/* The standard checks every features-d section runs, at 375 and 1366, in the editor and on the storefront:
   schema, coverage, first paint = hydrated paint, theme inheritance, colour scheme (live and redraw),
   custom style on/off, custom fonts on/off (with the real theme priority rules, on the element and a
   descendant), every control (live and redraw), added block + redraws (one controller, nothing doubled),
   two instances, reduced motion, no overflow and no errors; then the inheritance once with priority off.
   cfg: {name, table, extra: [ids checked elsewhere], css: [section css assets], snap: selector list,
     mount: extra mount options, inherit(t, h), custom: {on: settings, checks: [[sel, css, value]], off: [[sel, css, value]]},
     fonts: {on: settings, checks: [[sel, family regexp]], off: [[sel, family regexp]]}, extraBlock: {block, check(t, h)},
     two(two, h), reduced(rm, h), each(t, width, editing, h), after(browser, h)} */
async function suite(cfg) {
  const fs = require('fs');
  let checks = 0;
  const h = {
    ok: (cond, msg) => { assert.ok(cond, msg); checks++; },
    eq: (a, b, msg) => { assert.equal(a, b, msg); checks++; },
    match: (a, re, msg) => { assert.match(String(a), re, msg); checks++; },
    add: n => { checks += n; },
  };
  const css = cfg.css || [];
  assert.deepEqual(schemaProblems(cfg.name), []); checks++;
  coverage(cfg.name, cfg.table, cfg.extra || []); checks++;
  const browser = await launch();
  const base = {...(cfg.mount || {})};
  try {
    for (const width of WIDTHS) for (const editing of [true, false]) {
      const tag = `@${width} ${editing ? 'editor' : 'storefront'}`;
      h.tag = tag; h.width = width; h.editing = editing;
      /* First paint (no controller) equals the hydrated paint, after any count has finished. */
      const cold = await mount(browser, cfg.name, {width, editing, assets: css, ...base}); await cold.page.waitForTimeout(1900);
      const a = await snapshot(cold, cfg.snap); await cold.page.close();
      const t = await mount(browser, cfg.name, {width, editing, assets: [...css, ASSET], ...base});
      await settled(t.page); await t.page.waitForTimeout(1900);
      h.eq(JSON.stringify(await snapshot(t, cfg.snap)), JSON.stringify(a), 'first paint equals hydrated paint ' + tag);
      await instrument(t.page);
      /* Theme inheritance */
      await cfg.inherit(t, h);
      /* Colour scheme live and after a redraw */
      const bg = cfg.bgSel || null;
      await t.emit({color_scheme: 'alt-scheme'}); h.eq(await read(t, bg, 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme live ' + tag);
      await t.redraw({settings: {color_scheme: 'alt-scheme'}}); h.eq(await read(t, bg, 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme redraw ' + tag);
      await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      /* Custom styling on: every colour lands; off: the scheme comes back exactly. Live and after a redraw. */
      for (const how of ['live', 'redraw']) {
        if (how === 'live') await t.emit({enable_custom_style: true, ...cfg.custom.on}); else await t.redraw({settings: {enable_custom_style: true, ...cfg.custom.on}});
        for (const [sel, prop, v] of cfg.custom.checks) h.eq(await read(t, sel, prop), v, `custom ${how} ${sel} ${prop} ${tag}`);
        if (how === 'live') await t.emit({enable_custom_style: false}); else await t.redraw({settings: {enable_custom_style: false}});
        for (const [sel, prop, v] of cfg.custom.off) h.eq(await read(t, sel, prop), v, `custom off ${how} ${sel} ${prop} ${tag}`);
      }
      await t.redraw({settings: Object.fromEntries(Object.keys(cfg.custom.on).map(k => [k, '']))});
      /* Custom fonts on/off under the theme priority rules, live and after a redraw. */
      for (const how of ['live', 'redraw']) {
        const fk = cfg.fonts.key || 'enable_custom_fonts';
        if (how === 'live') await t.emit({[fk]: true, ...cfg.fonts.on}); else await t.redraw({settings: {[fk]: true, ...cfg.fonts.on}});
        for (const [sel, re] of cfg.fonts.checks) h.match(await read(t, sel, 'fontFamily'), re, `font ${how} ${sel} ${tag}`);
        if (how === 'live') await t.emit({[fk]: false}); else await t.redraw({settings: {[fk]: false}});
        for (const [sel, re] of cfg.fonts.off) h.match(await read(t, sel, 'fontFamily'), re, `font off ${how} ${sel} ${tag}`);
      }
      /* Every control, live and after a redraw */
      if (cfg.full) await t.redraw({blocks: cfg.full});
      h.add(await controls(t, width, cfg.table));
      if (cfg.each) await cfg.each(t, width, editing, h);
      /* Added block + redraws: one controller per root, no running counts left behind */
      if (cfg.extraBlock) {
        const before = await counts(t.page);
        await t.redraw({blocks: (cfg.full || t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.settings}))).concat([cfg.extraBlock.block])});
        await cfg.extraBlock.check(t, h);
        for (let i = 0; i < 3; i++) await t.redraw({});
        await t.page.waitForTimeout(150);
        const after = await counts(t.page);
        h.eq(after.roots, before.roots, 'one controller per root after redraws ' + tag);
        h.eq(after.active, 0, 'no timers left running ' + tag);
      }
      h.eq(t.errors.length, 0, 'no errors ' + t.errors.join(' ') + ' ' + tag);
      h.ok(await t.noOverflow(), 'no horizontal overflow ' + tag);
      await t.page.close();
      /* Two instances stay independent */
      const two = await mount(browser, cfg.name, {width, editing, instances: [{uid: 'a', ...base}, {uid: 'b', ...base}], assets: [...css, ASSET]});
      await cfg.two(two, h);
      await two.page.close();
      /* Reduced motion: final values at once */
      const rm = await mount(browser, cfg.name, {width, editing, reducedMotion: 'reduce', assets: [...css, ASSET], ...base});
      await rm.page.waitForTimeout(120);
      await cfg.reduced(rm, h);
      h.eq(rm.errors.length, 0, 'no errors under reduced motion ' + tag);
      await rm.page.close();
      process.stdout.write('.');
    }
    /* Priority off: the same theme inheritance */
    h.tag = '@1366 priority off'; h.width = 1366; h.editing = true;
    const off = await mount(browser, cfg.name, {width: 1366, editing: true, priority: 'off', assets: [...css, ASSET], ...base});
    await cfg.inherit(off, h);
    await off.page.close();
    if (cfg.after) await cfg.after(browser, h);
  } finally { await browser.close(); }
  console.log(`\n${cfg.name}: ${checks} checks passed`);
  return checks;
}

module.exports = {SAMPLE, suite, own, settled, headCopy, launch, mount, schemaOf, schemaProblems, assert, ASSET, WIDTHS, DESK, visibleIds, read, emit, controls, coverage, snapshot, instrument, counts, hoverBg, smallTargets};
if (require.main === module) console.log('theme-features-d-lib: shared helpers, nothing to run');
