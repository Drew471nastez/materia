/* Shared checks for the stats-reels media sections (Image With Text Stats,
   Image With Text Steps, Reels Wall, Shoppable Video). Used by
   tests/theme-media-stats-reels-<section>.cjs; running this file alone does nothing. */
const assert = require('assert/strict');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'media-live-stats-reels.js';
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
    const el = sel === ':wrapper' ? scope : sel ? scope.querySelector(sel) : scope.querySelector('[data-msr]');
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

/* Bounding boxes and key styles of every [data-msr] descendant matching sel. */
async function snapshot(t, sel) {
  return t.page.evaluate(sel => [...document.querySelectorAll(sel)].map(el => { const r = el.getBoundingClientRect(), c = getComputedStyle(el); return [el.className && el.className.baseVal === undefined ? String(el.className).split(' ')[0] : el.tagName, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontSize, c.fontFamily, c.display].join('|'); }), sel);
}

/* Counts setInterval/clearInterval and play()/pause() from now on. */
async function instrument(page) {
  await page.evaluate(() => {
    if (window.__msrCount) return;
    const c = window.__msrCount = {intervals: new Set(), made: 0, play: 0, pause: 0};
    const si = window.setInterval, ci = window.clearInterval;
    window.setInterval = (...a) => { const id = si(...a); c.intervals.add(id); c.made++; return id; };
    window.clearInterval = id => { c.intervals.delete(id); return ci(id); };
    const play = HTMLMediaElement.prototype.play, pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function () { c.play++; return play.call(this).catch(() => {}); };
    HTMLMediaElement.prototype.pause = function () { c.pause++; return pause.call(this); };
  });
}
const counts = page => page.evaluate(() => ({active: window.__msrCount.intervals.size, made: window.__msrCount.made, play: window.__msrCount.play, pause: window.__msrCount.pause, roots: window.MateriaMediaStatsReels.size()}));

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

/* A 4 second, 16px H.264 clip, so playback (play in view, pause off screen) can be checked for real. */
const CLIP = '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';
async function serveVideo(page) { await page.route(/\.mp4(\?|$)/, r => r.fulfill({body: Buffer.from(CLIP, 'base64'), contentType: 'video/mp4'})); }
const playing = (t, sel) => t.page.evaluate(sel => { const v = document.querySelector(sel); return !!v && !v.paused; }, sel);

module.exports = {serveVideo, playing, launch, mount, schemaOf, schemaProblems, assert, ASSET, WIDTHS, DESK, visibleIds, read, emit, controls, coverage, snapshot, instrument, counts, hoverBg, smallTargets};
if (require.main === module) console.log('theme-media-stats-reels-lib: shared helpers, nothing to run');
