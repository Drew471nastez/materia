/* Shared helpers for the image-video group tests (Image, Video, Video 2).
   Not a test on its own: the three theme-media-image-video-*.cjs files use it. */
const assert = require('assert/strict');
const {launch, mount, schemaProblems, schemaOf} = require('./media-fixture.cjs');
const ASSET = 'media-live-image-video.js';
/* A 3 second 32x18 VP8 clip, so playback is real in Chromium. */
const CLIP = Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAASYEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggEeTbuMU6uEHFO7a1OsggSC7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjAuMTYuMTAwV0GNTGF2ZjYwLjE2LjEwMESJiECncAAAAAAAFlSua8GuAQAAAAAAADjXgQFzxYif9iMFi4E7yJyBACK1nIN1bmSIgQCGhVZfVlA4g4EBI+ODhAX14QDgibCBILqBEpqBAhJUw2f8c3OgY8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2MC4xNi4xMDBzc9ZjwItjxYif9iMFi4E7yGfIoUWjh0VOQ09ERVJEh5RMYXZjNjAuMzEuMTAyIGxpYnZweGfIoUWjiERVUkFUSU9ORIeTMDA6MDA6MDMuMDAwMDAwMDAwAB9DtnVC3eeBAKO9gQAAgNACAJ0BKiAAEgAARwiFhYiFhIgCAgJ1qgP4AgghCD0A/v9NEv/8WFfxYV/FhX/xYV/8/M7txfzmAKOVgQBkALEBAAEQEAAYABhYL/QACHAAo5WBAMgAsQEAARAQABgAGFgv9AAIcACjlYEBLACxAQABEBAAGAAYWC/0AAhwAKOVgQGQALEBAAEQEAAYABhYL/QACHAAo5WBAfQAsQEAARAQABgAGFgv9AAIcACjlYECWACxAQABEBAAGAAYWC/0AAhwAKOVgQK8ALEBAAEQEBRgAGFgv9AAIcAAo5WBAyAAsQEAARAQABgAGFgv9AAIcACjlYEDhACxAQABEBAAGAAYWC/0AAhwAKOVgQPoALEBAAEQEAAYABhYL/QACHAAo5WBBEwAsQEAARAQABgAGFgv9AAIcACjlYEEsACxAQABEBAAGAAYWC/0AAhwAKOVgQUUALEBAAEQEAAYABhYL/QACHAAo5WBBXgAsQEAARAQABgAGFgv9AAIcACjlYEF3ACxAQABEBAAGAAYWC/0AAhwAKOVgQZAALEBAAEQEAAYABhYL/QACHAAo5WBBqQAsQEAARAQABgAGFgv9AAIcACjlYEHCACxAQABEBAUYABhYL/QACHAAKOVgQdsALEBAAEQEAAYABhYL/QACHAAo5WBB9AAsQEAARAQABgAGFgv9AAIcACjlYEINACxAQABEBAAGAAYWC/0AAhwAKOVgQiYALEBAAEQEAAYABhYL/QACHAAo5WBCPwAsQEAARAQABgAGFgv9AAIcACjlYEJYACxAQABEBAAGAAYWC/0AAhwAKOVgQnEALEBAAEQEAAYABhYL/QACHAAo5WBCigAsQEAARAQABgAGFgv9AAIcACjlYEKjACxAQABEBAAGAAYWC/0AAhwAKOVgQrwALEBAAEQEAAYABhYL/QACHAAo5WBC1QAsQEAARAQFGAAYWC/0AAhwAAcU7trkbuPs4EAt4r3gQHxggGf8IED', 'base64');
const CLIP_URL = 'http://theme.test/clip.webm';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let count = 0;
const ok = (cond, msg) => { assert(cond, msg); count++; };
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); count++; };

/* Mount with the group asset, a real clip on *.webm, and spies on video load()/play(). */
async function open(browser, name, opts = {}) {
  const t = await mount(browser, name, {assets: [ASSET], ...opts});
  /* Measure settled values, not theme colour transitions in flight. */
  await t.page.addStyleTag({content: '*,*::before,*::after{transition-duration:0s!important;transition-delay:0s!important}'});
  await t.page.route('**/*.webm', r => r.fulfill({body: CLIP, contentType: 'video/webm'}));
  await t.page.evaluate(() => {
    window.__iv = {loads: 0, plays: 0, loadstart: 0};
    const P = HTMLMediaElement.prototype, load = P.load, play = P.play;
    P.load = function () { window.__iv.loads++; return load.call(this); };
    P.play = function () { window.__iv.plays++; return play.call(this); };
    document.addEventListener('loadstart', () => window.__iv.loadstart++, true);
  });
  t.stats = () => t.page.evaluate(() => window.MateriaMediaImageVideo.stats());
  t.spy = () => t.page.evaluate(() => ({...window.__iv}));
  t.wrap = (uid = t.section.id) => t.page.locator('#shopify-section-' + uid);
  const q = (sel, uid, fn, arg) => t.page.evaluate(([s, fn, arg]) => { const el = document.querySelector(s); return el ? new Function('el', 'arg', 'return (' + fn + ')(el, arg)')(el, arg) : null; }, ['#shopify-section-' + (uid || t.section.id) + ' ' + sel, fn.toString(), arg]);
  t.style = (sel, prop, pseudo, uid) => q(sel, uid, (el, [k, p]) => getComputedStyle(el, p || null)[k], [prop, pseudo]);
  t.box = (sel, uid) => q(sel, uid, el => { const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(','); });
  t.visible = async (sel, uid) => !!(await q(sel, uid, el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; }));
  t.attr = (sel, a, uid) => q(sel, uid, (el, a) => el.getAttribute(a), a);
  t.count = sel => t.page.evaluate(s => document.querySelectorAll(s).length, '#shopify-section-' + t.section.id + ' ' + sel);
  t.video = () => t.page.evaluate(id => { const v = document.querySelector('#shopify-section-' + id + ' video'); return v && {paused: v.paused, time: v.currentTime, muted: v.muted, loop: v.loop, controls: v.controls, src: v.getAttribute('src'), preload: v.getAttribute('preload'), label: v.getAttribute('aria-label'), title: v.getAttribute('title'), poster: v.getAttribute('poster')}; }, t.section.id);
  return t;
}

/* Every non-hidden setting id of a list, so the control table must cover it. */
const visibleIds = list => (list || []).filter(x => x.id && !x.hidden).map(x => x.id);

/* Runs one control both live (emit) and through a server redraw, and checks:
   - the intended probe changes (or stays when the control is for the other width)
   - an exact expectation when given
   - the live result equals the redraw result. */
async function control(t, width, bp, id, c, initial, blockType) {
  const block = blockType ? t.blockId(blockType) : undefined;
  const value = typeof c.v === 'function' ? c.v(width) : c.v;
  const keys = [...Object.keys(c.pre || {}), id];
  const back = Object.fromEntries(keys.map(k => [k, initial[k] ?? null]));
  const side = width >= bp ? 'd' : 'm';
  const wait = c.wait || 0;
  if (c.pre) await t.emit(c.pre, block);
  await sleep(wait);
  const before = await c.probe(t);
  await t.emit({[id]: value}, block);
  await sleep(wait);
  const live = await c.probe(t);
  if (c.only && c.only !== side) eq(live, before, `${id} must not change at ${width}`);
  else {
    assert.notDeepEqual(live, before, `${id} live change at ${width}: ${JSON.stringify(before)}`); count++;
    if (c.expect !== undefined) { const e = typeof c.expect === 'function' ? c.expect(width) : c.expect; if (e instanceof RegExp) ok(e.test(String(live)), `${id} live ${live} !~ ${e}`); else eq(live, e, `${id} live at ${width}`); }
  }
  await t.emit(back, block);
  if (c.liveOnly) return;
  const settings = {...(c.pre || {}), [id]: value};
  if (blockType) await t.redraw({blocks: t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.id === block ? {...b.settings, ...settings} : b.settings}))});
  else await t.redraw({settings});
  await sleep(wait);
  const drawn = await c.probe(t);
  if (!c.noRedrawEqual) eq(drawn, live, `${id} redraw equals live at ${width}`);
  if (blockType) await t.redraw({blocks: t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.id === block ? {...b.settings, ...back} : b.settings}))});
  else await t.redraw({settings: back});
}

/* Key boxes and computed styles, for first paint == hydrated paint. */
async function snapshot(t, sels, props) {
  const out = {};
  for (const sel of sels) {
    if (!(await t.count(sel))) { out[sel] = null; continue; }
    out[sel] = [await t.box(sel)];
    for (const p of props) out[sel].push(await t.style(sel, p));
  }
  return out;
}

module.exports = {assert, launch, open, schemaProblems, schemaOf, visibleIds, control, snapshot, ok, eq, sleep, CLIP_URL, total: () => count};
