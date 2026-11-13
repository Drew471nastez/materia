/* Round 7, Features: Feature Timeline and Guarantee Banner.

   For both sections, at 375 and 1366, in the builder (editing) and on the storefront:
   schema, every visible setting covered, first paint = hydrated paint, the controller's derive =
   the markup (audit), theme inheritance (scheme colours, theme fonts, h2/h3, theme buttons and
   hover), colour scheme switch, custom styling on and off, custom fonts / weight / size / button
   shape under the real theme priority rules (on the element and a descendant) and back to the
   theme, every section and block control live (storelib:settings-change) and after a redraw
   (storelib:section-load), desktop and mobile values at the right width, every select option
   distinct, two instances independent, an added block, one controller per root after redraws, no
   picture reload and no node replaced by an unrelated edit, reduced motion, tap targets, no
   sideways scroll, no errors. Then the timeline's scroll fill on the storefront, the first preset
   with scripts off, and the theme inheritance once with the theme priority off.

   On the storefront a section carries no settings JSON, so the fixture draws each change again
   (the builder's redraw); in the builder the live event paints it in place.

   Run: LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-features.cjs [feature-timeline|guarantee-banner] */
const assert = require('assert/strict');
const fixture = require('./media-fixture.cjs');
const {launch, schemaOf, schemaProblems} = fixture;
const ASSET = 'live-r7-features.js';
const WIDTHS = [375, 1366], DESK = w => w >= 768;
const D = (d, m) => w => DESK(w) ? d : m;
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const IMG = {src: 'https://cdn.test/pic-one.png', alt: 'A workshop table', width: 1200, height: 800};
const IMG2 = {src: 'https://cdn.test/pic-two.png', alt: '', width: 600, height: 600};

/* The fixture's mount; emit and redraw also wait two frames (the controller paints in requestAnimationFrame). */
async function mount(browser, name, opts) {
  const t = await fixture.mount(browser, name, opts), emit = t.emit, redraw = t.redraw;
  t.emit = async (...a) => { await emit(...a); await frames(t.page); };
  t.redraw = async (...a) => { const r = await redraw(...a); await frames(t.page); return r; };
  return t;
}
function visibleIds(name) {
  const {schema} = schemaOf(name), out = [];
  for (const x of schema.settings || []) if (x.id && !x.hidden) out.push(x.id);
  for (const b of schema.blocks || []) for (const x of b.settings || []) if (x.id && !x.hidden) out.push('block:' + b.type + ':' + x.id);
  return out;
}
/* A computed style, an attribute (@name), a property (.name), 'text', 'visible', 'count' or 'box' of the first match inside one section. */
async function read(t, sel, what, uid = t.section.id) {
  return t.page.evaluate(({sel, what, uid}) => {
    const scope = document.getElementById('shopify-section-' + uid);
    const el = sel ? scope.querySelector(sel) : scope.querySelector('[data-r7f]');
    if (what === 'count') return scope.querySelectorAll(sel).length;
    if (!el) return '<missing ' + sel + '>';
    if (what.startsWith('@')) return el.getAttribute(what.slice(1));
    if (what.startsWith('.')) { const v = el[what.slice(1)]; return typeof v === 'boolean' || typeof v === 'number' ? v : String(v); }
    if (what === 'visible') return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
    if (what === 'text') return el.textContent.trim();
    if (what === 'box') { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); }
    return getComputedStyle(el)[what];
  }, {sel, what, uid});
}
async function emit(t, entry, value, uid) {
  if (entry.block) await t.emit({[entry.id]: value}, t.blockId(entry.block, entry.n || 0, uid), uid);
  else await t.emit({[entry.id]: value}, undefined, uid);
}
/* Runs a control table: {id, v, block?, n?, sel, css, exp | exp(width), pre, preBlock, check(t, width, how), live, redraw}.
   Live: emit pre and the value, check, emit the old values back. Redraw: each entry in its own redraw. */
async function controls(t, width, entries) {
  let n = 0;
  const check = async (e, how) => {
    if (e.check) { await e.check(t, width, how); n++; return; }
    const want = typeof e.exp === 'function' ? e.exp(width) : e.exp; if (want === null || want === undefined) return;
    const got = await read(t, e.sel, e.css), msg = `${how} ${e.block ? e.block + '.' : ''}${e.id}=${JSON.stringify(e.v)} ${e.sel} ${e.css} @${width}`;
    if (want instanceof RegExp) assert.match(String(got), want, msg); else assert.equal(got, want, msg);
    n++;
  };
  const base = t.rendered[0].section, blockOf = e => base.blocks.filter(b => b.type === e.block)[e.n || 0];
  for (const e of entries) {
    if (e.live === false) continue;
    const before = e.block ? blockOf(e).settings[e.id] : base.settings[e.id];
    if (e.pre) for (const [k, v] of Object.entries(e.pre)) await emit(t, {id: k, block: e.preBlock ? e.block : undefined, n: e.n}, v);
    await emit(t, e, e.v);
    await check(e, 'live');
    await emit(t, e, before === undefined ? '' : before);
    if (e.pre) for (const k of Object.keys(e.pre)) { const old = e.preBlock ? blockOf(e).settings[k] : base.settings[k]; await emit(t, {id: k, block: e.preBlock ? e.block : undefined, n: e.n}, old === undefined ? '' : old); }
  }
  /* a setting with no default (a colour, a picture) is not in the first drawing: every redraw starts with those emptied, so one entry never leaks into the next */
  const blank = Object.fromEntries(entries.filter(e => !e.block || (e.pre && !e.preBlock)).flatMap(e => [...(e.block ? [] : [e.id]), ...Object.keys(e.pre && !(e.block && e.preBlock) ? e.pre : {})]).filter(k => !(k in base.settings)).map(k => [k, '']));
  const original = {settings: {...blank, ...base.settings}, blocks: base.blocks.map(b => ({type: b.type, settings: {...b.settings}}))};
  for (const e of entries.filter(e => e.redraw !== false)) {
    const settings = {...original.settings}, blocks = original.blocks.map(b => ({type: b.type, settings: {...b.settings}}));
    if (e.block) { const target = blocks.filter(b => b.type === e.block)[e.n || 0]; Object.assign(target.settings, e.preBlock ? e.pre : {}, {[e.id]: e.v}); if (e.pre && !e.preBlock) Object.assign(settings, e.pre); }
    else Object.assign(settings, e.pre || {}, {[e.id]: e.v});
    await t.redraw({settings, blocks});
    await check(e, 'redraw');
  }
  await t.redraw({settings: original.settings, blocks: original.blocks});
  return n;
}
function coverage(name, entries, extra = []) {
  const have = new Set(entries.map(e => e.block ? 'block:' + e.block + ':' + e.id : e.id).concat(extra));
  assert.deepEqual(visibleIds(name).filter(id => !have.has(id)), [], name + ': settings without a control check');
}
async function snapshot(t, sel) {
  return t.page.evaluate(sel => [...document.querySelectorAll(sel)].map(el => { const r = el.getBoundingClientRect(), c = getComputedStyle(el); return [typeof el.className === 'string' ? el.className.split(' ')[0] : el.tagName, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.color, c.backgroundColor, c.fontSize, c.fontFamily, c.fontWeight, c.display, c.opacity].join('|'); }), sel);
}
async function hoverBg(t, sel) {
  const el = t.root(sel).first();
  await el.scrollIntoViewIfNeeded(); await el.hover(); await t.page.waitForTimeout(60);
  const v = await el.evaluate(e => getComputedStyle(e).backgroundColor);
  await t.page.mouse.move(0, 0); await t.page.waitForTimeout(30);
  return v;
}
/* Links and buttons that stand alone (a link inside a sentence is not a target of its own). */
const smallTargets = t => t.page.evaluate(id => [...document.querySelectorAll('#shopify-section-' + id + ' :is(button, a):not(p a)')].filter(el => el.offsetWidth && getComputedStyle(el).visibility !== 'hidden').map(el => { const r = el.getBoundingClientRect(); return {cls: String(el.className).split(' ')[0], w: Math.round(r.width), h: Math.round(r.height)}; }).filter(r => r.w < 44 || r.h < 44), t.section.id);
const own = (t, sel, name) => t.page.evaluate(({sel, name, id}) => { const el = document.querySelector('#shopify-section-' + id + ' ' + sel); return el ? el.hasAttribute(name) : '<missing ' + sel + '>'; }, {sel, name, id: t.section.id});
const audit = (t, uid = t.section.id) => t.page.evaluate(uid => JSON.stringify(window.MateriaR7Features.audit(document.querySelector('#shopify-section-' + uid + ' [data-r7f]'))), uid);
const counts = page => page.evaluate(() => window.MateriaR7Features.count());
/* A theme button drawn inside the section: what Theme settings > Buttons give every button. */
const themeButton = (t, prop, role = 'primary') => t.page.evaluate(({prop, role}) => { const a = document.createElement('a'); a.href = '#'; a.setAttribute('data-theme-button', role); a.setAttribute('data-sl-button', ''); a.textContent = 'x'; document.querySelector('#shopify-section-test .r7s__inner').append(a); const v = getComputedStyle(a)[prop]; a.remove(); return v; }, {prop, role});
/* Every option of a select, drawn live: the looks must all differ. */
async function distinct(t, h, id, look, block) {
  const {schema} = schemaOf(h.name), list = block ? schema.blocks.find(b => b.type === block).settings : schema.settings, x = list.find(s => s.id === id);
  const before = block ? t.rendered[0].section.blocks.find(b => b.type === block).settings[id] : t.rendered[0].section.settings[id], looks = {};
  for (const o of x.options) { await emit(t, {id, block}, o.value); looks[o.value] = await t.page.evaluate(look); }
  await emit(t, {id, block}, before);
  h.eq(new Set(Object.values(looks)).size, x.options.length, `${block ? block + '.' : ''}${id}: every option looks different ${JSON.stringify(looks)} ${h.tag}`);
}

/* The checks both sections run. cfg: {name, root, table, extra, full, snap, inherit(t, h), custom, fonts, extraBlock, each(t, width, editing, h), two(two, h), reduced(rm, h), after(browser, h)} */
async function suite(cfg) {
  let checks = 0;
  const h = {
    name: cfg.name,
    ok: (cond, msg) => { assert.ok(cond, msg); checks++; },
    eq: (a, b, msg) => { assert.equal(a, b, msg); checks++; },
    match: (a, re, msg) => { assert.match(String(a), re, msg); checks++; },
    add: n => { checks += n; },
  };
  assert.deepEqual(schemaProblems(cfg.name), []); checks++;
  const {schema, raw} = schemaOf(cfg.name);
  h.ok(schema.name.length <= 25 && schema.presets[0].name === schema.name && schema.presets[0].category === 'Features', 'name, preset name and category');
  h.eq(raw.split('\n')[1], `<script src="{{ '${ASSET}' | asset_url }}" defer="defer"></script>`, 'line 2 links the controller');
  h.ok(!/[—–]|\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(JSON.stringify(schema)), 'no em dashes or banned words in the schema');
  coverage(cfg.name, cfg.table, cfg.extra || []); checks++;
  const browser = await launch();
  try {
    for (const width of WIDTHS) for (const editing of [true, false]) {
      const tag = `@${width} ${editing ? 'editor' : 'storefront'}`;
      h.tag = tag; h.width = width; h.editing = editing;
      /* First paint (no controller) equals the hydrated paint, for the preset and for every block type. */
      for (const blocks of [undefined, cfg.full]) {
        const cold = await mount(browser, cfg.name, {width, editing, blocks, assets: []});
        const a = await snapshot(cold, cfg.snap); await cold.page.close();
        const warm = await mount(browser, cfg.name, {width, editing, blocks, assets: [ASSET]});
        h.eq(JSON.stringify(await snapshot(warm, cfg.snap)), JSON.stringify(a), 'first paint equals hydrated paint ' + (blocks ? 'full ' : 'preset ') + tag);
        h.eq(await audit(warm), '[]', 'the controller derives what the markup holds ' + (blocks ? 'full ' : 'preset ') + tag);
        h.eq((await counts(warm.page)).paints, 0, 'nothing is painted on load ' + tag);
        h.eq(warm.errors.length, 0, 'no errors on load ' + warm.errors.join(' ') + tag);
        h.ok(await warm.noOverflow(), 'no horizontal overflow on load ' + tag);
        await warm.page.close();
      }
      const t = await mount(browser, cfg.name, {width, editing, blocks: cfg.full, assets: [ASSET]});
      h.eq(await read(t, null, '@data-r7f-settings') !== null, editing, 'settings JSON is printed in the builder only ' + tag);
      /* Theme inheritance */
      await cfg.inherit(t, h);
      /* Colour scheme live and after a redraw */
      await t.emit({color_scheme: 'alt-scheme'}); h.eq(await read(t, cfg.root, 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme live ' + tag);
      await t.redraw({settings: {color_scheme: 'alt-scheme'}}); h.eq(await read(t, cfg.root, 'backgroundColor'), 'rgb(250, 250, 250)', 'scheme redraw ' + tag);
      for (const [sel, prop, v] of cfg.schemeChecks || []) h.eq(await read(t, sel, prop), v, `scheme ${sel} ${prop} ${tag}`);
      await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
      /* Custom styling on: every colour lands; off: the scheme comes back exactly. Live and after a redraw. */
      for (const how of ['live', 'redraw']) {
        if (how === 'live') await t.emit({enable_custom_style: true, ...cfg.custom.on}); else await t.redraw({settings: {enable_custom_style: true, ...cfg.custom.on}});
        for (const [sel, prop, v] of cfg.custom.checks) h.eq(await read(t, sel, prop), v, `custom ${how} ${sel} ${prop} ${tag}`);
        if (how === 'live') await t.emit({enable_custom_style: false}); else await t.redraw({settings: {enable_custom_style: false}});
        for (const [sel, prop, v] of cfg.custom.off) h.eq(await read(t, sel, prop), v, `custom off ${how} ${sel} ${prop} ${tag}`);
      }
      await t.redraw({settings: Object.fromEntries(Object.keys(cfg.custom.on).map(k => [k, '']))});
      /* Custom fonts on and off under the theme priority rules, live and after a redraw. */
      for (const how of ['live', 'redraw']) {
        const on = {enable_custom_fonts: true, heading_font: {family: 'Verdana'}, body_font: {family: 'Tahoma'}};
        if (how === 'live') await t.emit(on); else await t.redraw({settings: on});
        h.ok(await own(t, '[data-r7f]', 'data-own-font'), `own font attribute ${how} ${tag}`);
        for (const [sel, re] of cfg.fonts.checks) h.match(await read(t, sel, 'fontFamily'), re, `font ${how} ${sel} ${tag}`);
        if (how === 'live') await t.emit({enable_custom_fonts: false}); else await t.redraw({settings: {enable_custom_fonts: false}});
        h.ok(!(await own(t, '[data-r7f]', 'data-own-font')), `own font attribute gone ${how} ${tag}`);
        for (const [sel, re] of cfg.fonts.off) h.match(await read(t, sel, 'fontFamily'), re, `font off ${how} ${sel} ${tag}`);
      }
      await t.redraw({settings: {heading_font: 'assistant_n4', body_font: 'assistant_n4'}});
      /* Every control, live and after a redraw */
      h.add(await controls(t, width, cfg.table));
      h.eq(await audit(t), '[]', 'after every control the controller and the markup agree ' + tag);
      /* The blocks both sections share: heading weight and size, subheading size, the button */
      await shared(t, width, editing, h);
      if (cfg.each) await cfg.each(t, width, editing, h);
      /* An added block, then redraws: one controller for the root, nothing left behind */
      await t.redraw({blocks: cfg.full.concat([cfg.extraBlock.block])});
      await cfg.extraBlock.check(t, h);
      for (let i = 0; i < 3; i++) await t.redraw({});
      h.eq((await counts(t.page)).roots, 1, 'one controller per root after redraws ' + tag);
      h.eq(await audit(t), '[]', 'audit after redraws ' + tag);
      h.eq(JSON.stringify((await smallTargets(t)).filter(x => x.h < 44)), '[]', 'links and buttons are at least 44px tall ' + tag);
      h.eq(t.errors.length, 0, 'no errors ' + t.errors.join(' ') + ' ' + tag);
      h.ok(await t.noOverflow(), 'no horizontal overflow ' + tag);
      await t.page.close();
      /* Two instances stay independent */
      const two = await mount(browser, cfg.name, {width, editing, instances: [{uid: 'a', blocks: cfg.full}, {uid: 'b', blocks: cfg.full}], assets: [ASSET]});
      await cfg.two(two, h);
      h.eq((await counts(two.page)).roots, 2, 'two roots ' + tag);
      h.eq(two.errors.length, 0, 'no errors with two instances ' + tag);
      await two.page.close();
      /* Reduced motion */
      const rm = await mount(browser, cfg.name, {width, editing, reducedMotion: 'reduce', blocks: cfg.full, assets: [ASSET]});
      await cfg.reduced(rm, h);
      h.eq(rm.errors.length, 0, 'no errors under reduced motion ' + tag);
      await rm.page.close();
      process.stdout.write('.');
    }
    /* Theme priority off: the same theme inheritance */
    h.tag = '@1366 priority off'; h.width = 1366; h.editing = true;
    const off = await mount(browser, cfg.name, {width: 1366, editing: true, priority: 'off', blocks: cfg.full, assets: [ASSET]});
    await cfg.inherit(off, h);
    await off.page.close();
    if (cfg.after) await cfg.after(browser, h);
  } finally { await browser.close(); }
  console.log(`\n${cfg.name}: ${checks} checks passed`);
  return checks;
}

/* Heading, subheading and button blocks (snippets/r7-features-block): the custom switches win under the theme rules and off restores the theme. */
async function shared(t, width, editing, h) {
  const tag = h.tag, H = t.blockId('heading'), S = t.blockId('subheading'), B = t.blockId('button');
  const themeWeight = await read(t, '.r7h__heading', 'fontWeight'), themeLine = await read(t, '.r7h__heading', 'lineHeight'), themeSize = await read(t, '.r7h__heading', 'fontSize');
  for (const how of ['live', 'redraw']) {
    const set = async (settings, id, type) => how === 'live' ? t.emit(settings, id) : t.redraw({blocks: t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.type === type ? {...b.settings, ...settings} : b.settings}))});
    await set({text: 'Kept <strong>for good</strong>', weight_enable: true, weight: '400', size_enable: true, size_desktop: 50, size_mobile: 30, line_height: 1.5, tracking: 2}, H, 'heading');
    h.ok(await own(t, '.r7h__heading', 'data-own-weight') && await own(t, '.r7h__heading', 'data-own-size'), `heading own attributes ${how} ${tag}`);
    h.eq(await read(t, '.r7h__heading', 'fontWeight'), '400', `heading weight wins ${how} ${tag}`);
    h.eq(await read(t, '.r7h__heading', 'fontSize'), DESK(width) ? '50px' : '30px', `heading size wins ${how} ${tag}`);
    h.eq(await read(t, '.r7h__heading', 'lineHeight'), DESK(width) ? '75px' : '45px', `heading line height wins ${how} ${tag}`);
    h.eq(await read(t, '.r7h__heading', 'letterSpacing'), '2px', `heading letter spacing wins ${how} ${tag}`);
    h.eq(await read(t, '.r7h__heading strong', 'letterSpacing'), '2px', `heading descendant keeps it ${how} ${tag}`);
    h.match(await read(t, '.r7h__heading strong', 'fontFamily'), /Georgia/, `heading descendant keeps the theme font ${how} ${tag}`);
    await set({weight_enable: false, size_enable: false}, H, 'heading');
    h.ok(!(await own(t, '.r7h__heading', 'data-own-weight')) && !(await own(t, '.r7h__heading', 'data-own-size')), `heading own attributes gone ${how} ${tag}`);
    h.eq(await read(t, '.r7h__heading', 'fontWeight'), themeWeight, `theme weight back ${how} ${tag}`);
    h.eq(await read(t, '.r7h__heading', 'lineHeight'), themeLine, `theme line height back ${how} ${tag}`);
    h.eq(await read(t, '.r7h__heading', 'fontSize'), themeSize, `theme heading size back ${how} ${tag}`);
    await set({size_enable: true, size: 21, text: '<p>Made <strong>daily</strong></p>'}, S, 'subheading');
    h.eq(await read(t, '.r7h__sub p', 'fontSize'), '21px', `subheading size on its paragraph ${how} ${tag}`);
    h.match(await read(t, '.r7h__sub strong', 'fontFamily'), /Arial/, `subheading descendant body font ${how} ${tag}`);
    await set({size_enable: false}, S, 'subheading');
    h.eq(await read(t, '.r7h__sub p', 'fontSize'), '16px', `theme body size back ${how} ${tag}`);
    /* Button: custom colours and shape win, off restores Theme settings > Buttons */
    await set({style: 'primary', enable_custom_style: true, bg: '#aa0000', color: '#00aa00', bg_hover: '#0000aa', use_theme_button: false, radius: 3, size: 21, pad_x: 40, pad_y: 20}, B, 'button');
    h.ok(await own(t, '.r7b', 'data-own-shape'), `button own shape ${how} ${tag}`);
    h.eq([await read(t, '.r7b', 'backgroundColor'), await read(t, '.r7b', 'color'), await read(t, '.r7b', 'borderTopLeftRadius'), await read(t, '.r7b', 'fontSize'), await read(t, '.r7b', 'paddingLeft'), await read(t, '.r7b', 'paddingTop')].join(' '), 'rgb(170, 0, 0) rgb(0, 170, 0) 3px 21px 40px 20px', `button colours and shape win ${how} ${tag}`);
    h.eq(await read(t, '.r7b__label', 'color'), 'rgb(0, 170, 0)', `button label colour ${how} ${tag}`);
    h.eq(await hoverBg(t, '.r7b'), 'rgb(0, 0, 170)', `button hover colour ${how} ${tag}`);
    await set({enable_custom_style: false, use_theme_button: true}, B, 'button');
    h.ok(!(await own(t, '.r7b', 'data-own-shape')), `button own shape gone ${how} ${tag}`);
    for (const p of ['backgroundColor', 'color', 'borderTopLeftRadius', 'fontSize', 'paddingLeft', 'paddingTop', 'fontFamily', 'fontWeight']) h.eq(await read(t, '.r7b', p), await themeButton(t, p), `button ${p} back to Theme settings > Buttons ${how} ${tag}`);
    h.eq(await hoverBg(t, '.r7b'), 'rgb(255, 0, 0)', `theme hover back ${how} ${tag}`);
    await set({style: 'secondary'}, B, 'button');
    for (const p of ['backgroundColor', 'color']) h.eq(await read(t, '.r7b', p), await themeButton(t, p, 'secondary'), `secondary ${p} follows the theme ${how} ${tag}`);
    /* Link style: off the button contract, a 44px text link in the heading colour; its custom colour applies */
    await set({style: 'link', enable_custom_style: true, color: '#00aa00', use_theme_button: false}, B, 'button');
    h.ok(!(await own(t, '.r7b', 'data-theme-button')) && !(await own(t, '.r7b', 'data-own-shape')), `link style leaves the contract ${how} ${tag}`);
    h.eq([await read(t, '.r7b', 'color'), await read(t, '.r7b', 'backgroundColor'), await read(t, '.r7b', 'paddingLeft'), await read(t, '.r7b__label', 'textDecorationLine'), await read(t, '.r7b__arrow', 'display')].join(' '), 'rgb(0, 170, 0) rgba(0, 0, 0, 0) 0px underline block', `link style ${how} ${tag}`);
    await set({enable_custom_style: false, use_theme_button: true}, B, 'button');
    h.eq(await read(t, '.r7b', 'color'), 'rgb(255, 255, 255)', `link follows the heading colour ${how} ${tag}`);
    h.ok(parseFloat(await read(t, '.r7b', 'height')) >= 44, `link is a 44px target ${how} ${tag}`);
    await set({style: 'primary'}, B, 'button');
    h.eq(await read(t, '.r7b', '@data-theme-button'), 'primary', `primary again ${how} ${tag}`);
  }
  /* A button with no link is a button, with a link an anchor, live and after a redraw; an empty label hides it */
  await t.emit({link: ''}, B); h.eq(await read(t, '.r7b', '.tagName'), 'BUTTON', 'no link: button ' + tag);
  h.eq(await read(t, '.r7b', '@type'), 'button', 'type=button ' + tag);
  await t.emit({link: '/pages/about'}, B); h.eq(await read(t, '.r7b', '.tagName') + ' ' + await read(t, '.r7b', '@href'), 'A /pages/about', 'link: anchor ' + tag);
  await t.emit({label: ''}, B); h.eq(await read(t, '.r7b', 'visible'), false, 'empty label hides the button ' + tag);
  await t.emit({label: 'Read our story'}, B); h.eq(await read(t, '.r7b', 'visible'), true, 'label shows it again ' + tag);
  if (editing) h.eq(await audit(t), '[]', 'audit after the button edits ' + tag);
  await distinct(t, h, 'style', () => { const b = document.querySelector('#shopify-section-test .r7b'), c = getComputedStyle(b); return [c.backgroundColor, c.color, c.paddingLeft].join(); }, 'button');
  await t.page.keyboard.press('Tab');
  h.match(await t.page.evaluate(() => { const b = document.querySelector('#shopify-section-test .r7b'); b.focus(); return b.matches(':focus-visible') ? getComputedStyle(b).outlineStyle + ' ' + getComputedStyle(b).outlineWidth : 'not focus-visible'; }), /solid [23]px/, 'visible focus ring on the button ' + tag);
}

const C = {pre: {enable_custom_style: true}};
const BC = {preBlock: true, pre: {enable_custom_style: true}};
const SPACING = (inner, root) => [
  {id: 'padding_top_desktop', v: 120, sel: inner, css: 'paddingTop', exp: D('120px', null)},
  {id: 'padding_bottom_desktop', v: 124, sel: inner, css: 'paddingBottom', exp: D('124px', null)},
  {id: 'padding_top_mobile', v: 30, sel: inner, css: 'paddingTop', exp: D(null, '30px')},
  {id: 'padding_bottom_mobile', v: 34, sel: inner, css: 'paddingBottom', exp: D(null, '34px')},
  {id: 'section_margin_top_desktop', v: 40, pre: {reset_spacing: false}, sel: root, css: 'marginTop', exp: D('40px', '0px')},
  {id: 'section_margin_bottom_desktop', v: 45, pre: {reset_spacing: false}, sel: root, css: 'marginBottom', exp: D('45px', '0px')},
  {id: 'section_margin_top_mobile', v: 25, pre: {reset_spacing: false}, sel: root, css: 'marginTop', exp: D('0px', '25px')},
  {id: 'section_margin_bottom_mobile', v: 20, pre: {reset_spacing: false}, sel: root, css: 'marginBottom', exp: D('0px', '20px')},
];
const GENERAL = root => [
  {id: 'color_scheme', v: 'alt-scheme', sel: root, css: 'backgroundColor', exp: 'rgb(250, 250, 250)'},
  {id: 'section_width', v: 'container', sel: root, css: 'maxWidth', exp: '1340px'},
  {id: 'show_section_on', v: 'mobile', sel: root, css: 'display', exp: D('none', 'block')},
  {id: 'reset_spacing', v: false, pre: {section_margin_top_desktop: 30, section_margin_top_mobile: 15}, sel: root, css: 'marginTop', exp: D('30px', '15px')},
];
const HEAD_BLOCKS = [
  {block: 'heading', id: 'text', v: 'How <em>it</em> works', sel: '.r7h__heading em', css: 'text', exp: 'it'},
  {block: 'heading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#00cc00'}, sel: '.r7h__heading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'heading', id: 'color', v: '#00cc00', ...BC, sel: '.r7h__heading', css: 'color', exp: 'rgb(0, 204, 0)'},
  {block: 'heading', id: 'weight_enable', v: true, preBlock: true, pre: {weight: '500'}, sel: '.r7h__heading', css: 'fontWeight', exp: '500'},
  {block: 'heading', id: 'weight', v: '800', preBlock: true, pre: {weight_enable: true}, sel: '.r7h__heading', css: 'fontWeight', exp: '800'},
  {block: 'heading', id: 'size_enable', v: true, preBlock: true, pre: {size_desktop: 52, size_mobile: 31}, sel: '.r7h__heading', css: 'fontSize', exp: D('52px', '31px')},
  {block: 'heading', id: 'size_desktop', v: 60, preBlock: true, pre: {size_enable: true, size_mobile: 20}, sel: '.r7h__heading', css: 'fontSize', exp: D('60px', '20px')},
  {block: 'heading', id: 'size_mobile', v: 22, preBlock: true, pre: {size_enable: true, size_desktop: 44}, sel: '.r7h__heading', css: 'fontSize', exp: D('44px', '22px')},
  {block: 'heading', id: 'line_height', v: 2, preBlock: true, pre: {size_enable: true, size_desktop: 40, size_mobile: 20}, sel: '.r7h__heading', css: 'lineHeight', exp: D('80px', '40px')},
  {block: 'heading', id: 'tracking', v: 3, preBlock: true, pre: {size_enable: true}, sel: '.r7h__heading', css: 'letterSpacing', exp: '3px'},
  {block: 'subheading', id: 'text', v: '<p>Made <strong>daily</strong></p>', sel: '.r7h__sub strong', css: 'text', exp: 'daily'},
  {block: 'subheading', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#0000cc'}, sel: '.r7h__sub', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'subheading', id: 'color', v: '#0000cc', ...BC, sel: '.r7h__sub p', css: 'color', exp: 'rgb(0, 0, 204)'},
  {block: 'subheading', id: 'color', v: '#00cc88', preBlock: true, pre: {enable_custom_style: true, text: '<p>Made <strong>daily</strong></p>'}, sel: '.r7h__sub strong', css: 'color', exp: 'rgb(0, 204, 136)'},
  {block: 'heading', id: 'color', v: '#00cc88', preBlock: true, pre: {enable_custom_style: true, text: 'Made <strong>daily</strong>'}, sel: '.r7h__heading strong', css: 'color', exp: 'rgb(0, 204, 136)'},
  {block: 'subheading', id: 'size_enable', v: true, preBlock: true, pre: {size: 23}, sel: '.r7h__sub', css: 'fontSize', exp: '23px'},
  {block: 'subheading', id: 'size', v: 19, preBlock: true, pre: {size_enable: true}, sel: '.r7h__sub', css: 'fontSize', exp: '19px'},
  {block: 'button', id: 'label', v: 'Start now', sel: '.r7b__label', css: 'text', exp: 'Start now'},
  {block: 'button', id: 'link', v: '/collections/all', sel: '.r7b', css: '@href', exp: '/collections/all'},
  {block: 'button', id: 'style', v: 'secondary', sel: '.r7b', css: '@data-theme-button', exp: 'secondary'},
  {block: 'button', id: 'enable_custom_style', v: true, preBlock: true, pre: {style: 'primary', bg: '#aa0000'}, sel: '.r7b', css: 'backgroundColor', exp: 'rgb(170, 0, 0)'},
  {block: 'button', id: 'bg', v: '#aa00aa', preBlock: true, pre: {style: 'primary', enable_custom_style: true}, sel: '.r7b', css: 'backgroundColor', exp: 'rgb(170, 0, 170)'},
  {block: 'button', id: 'color', v: '#00aa00', preBlock: true, pre: {style: 'primary', enable_custom_style: true}, sel: '.r7b', css: 'color', exp: 'rgb(0, 170, 0)'},
  {block: 'button', id: 'bg_hover', v: '#0000aa', preBlock: true, pre: {style: 'primary', enable_custom_style: true}, check: async t => assert.equal(await hoverBg(t, '.r7b'), 'rgb(0, 0, 170)')},
  {block: 'button', id: 'use_theme_button', v: false, preBlock: true, pre: {style: 'primary', radius: 77}, sel: '.r7b', css: 'borderTopLeftRadius', exp: '77px'},
  {block: 'button', id: 'radius', v: 3, preBlock: true, pre: {style: 'primary', use_theme_button: false}, sel: '.r7b', css: 'borderTopLeftRadius', exp: '3px'},
  {block: 'button', id: 'size', v: 21, preBlock: true, pre: {style: 'primary', use_theme_button: false}, sel: '.r7b', css: 'fontSize', exp: '21px'},
  {block: 'button', id: 'pad_x', v: 40, preBlock: true, pre: {style: 'primary', use_theme_button: false}, sel: '.r7b', css: 'paddingLeft', exp: '40px'},
  {block: 'button', id: 'pad_y', v: 20, preBlock: true, pre: {style: 'primary', use_theme_button: false}, sel: '.r7b', css: 'paddingTop', exp: '20px'},
];
const LONG = '<p>We started at a <strong>market stall</strong>, and a <a href="/pages/about">longer story</a> follows here to wrap over a few lines.</p>';

/* ------------------------------------------------------------ Feature Timeline */
const TIMELINE_FULL = [
  {type: 'eyebrow', settings: {text: 'Our story'}},
  {type: 'heading', settings: {text: 'How we got here'}},
  {type: 'subheading', settings: {text: '<p>The short version of a long road.</p>'}},
  {type: 'item', settings: {label: 'First', title: 'A market stall', text: LONG, image: IMG, image_alt: 'The stall'}},
  {type: 'item', settings: {label: 'Then', title: 'A workshop', text: '<p>More room to make things.</p>'}},
  {type: 'item', settings: {label: 'Now', title: 'An online store', text: '<p>Open every day.</p>'}},
  {type: 'button', settings: {label: 'Read our story', link: '/pages/about', style: 'primary'}},
];
const segFill = t => t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .ftl__item:not(:last-child) .ftl__fill')].map(f => { const m = getComputedStyle(f).transform; return getComputedStyle(f).display === 'none' ? 'none' : m === 'none' ? 1 : +(+m.split(',')[3]).toFixed(2); }));
const timeline = {
  name: 'feature-timeline', root: '.ftl', full: TIMELINE_FULL, extra: ['enable_custom_style', 'enable_custom_fonts'],
  snap: '#shopify-section-test :is(.ftl, .r7s__inner, .r7h, .r7h__eyebrow, .r7h__heading, .r7h__sub, .ftl__list, .ftl__item, .ftl__rail, .ftl__seg, .ftl__mk, .ftl__dot, .ftl__label, .ftl__body, .ftl__title, .ftl__text, .ftl__media, .ftl__img, .r7b)',
  table: [
    ...GENERAL('.ftl'),
    {id: 'layout', v: 'side', check: async (t, w) => { const one = await read(t, '.ftl__item:nth-child(2) .ftl__body', 'box'), cols = await read(t, '.ftl__item', 'gridTemplateColumns'); assert.equal(await read(t, '.ftl', '@data-layout'), 'side'); if (DESK(w)) { assert.equal(cols.split(' ').length, 3, cols); assert.ok(+one.split(',')[0] > +(await read(t, '.ftl__item:nth-child(2) .ftl__rail', 'box')).split(',')[0], 'the second item\'s text is right of the line: ' + one); } else assert.equal(cols.split(' ').length, 2, 'a phone keeps one column ' + cols); }},
    {id: 'text_align', v: 'left', sel: '.r7h', css: 'alignItems', exp: 'flex-start'},
    {id: 'content_max_width', v: 600, sel: '.ftl__list', css: 'maxWidth', exp: '600px'},
    {id: 'head_gap', v: 20, sel: '.ftl__head', css: 'marginBottom', exp: '20px'},
    {id: 'item_gap_desktop', v: 80, sel: '.ftl__list', css: 'rowGap', exp: D('80px', '36px')},
    {id: 'item_gap_mobile', v: 20, sel: '.ftl__list', css: 'rowGap', exp: D('56px', '20px')},
    {id: 'image_ratio', v: 'square', sel: '.ftl__img', css: 'aspectRatio', exp: '1 / 1'},
    {id: 'marker_style', v: 'number', sel: '.ftl__num', css: 'display', exp: 'block'},
    {id: 'marker_size', v: 24, sel: '.ftl__mk', css: 'width', exp: '24px'},
    {id: 'line_thickness', v: 4, sel: '.ftl__seg', css: 'width', exp: '4px'},
    {id: 'section_bg', v: '#abcdef', ...C, sel: '.ftl', css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
    {id: 'line_color', v: '#0000ff', ...C, sel: '.ftl__seg', css: 'backgroundColor', exp: 'rgb(0, 0, 255)'},
    {id: 'marker_color', v: '#ff00ff', ...C, sel: '.ftl__dot', css: 'backgroundColor', exp: 'rgb(255, 0, 255)'},
    {id: 'label_color', v: '#00ff00', ...C, sel: '.ftl__label', css: 'color', exp: 'rgb(0, 255, 0)'},
    {id: 'title_color', v: '#123123', ...C, sel: '.ftl__title', css: 'color', exp: 'rgb(18, 49, 35)'},
    {id: 'text_color', v: '#321321', ...C, sel: '.ftl__text p', css: 'color', exp: 'rgb(50, 19, 33)'},
    {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.ftl__title', css: 'fontFamily', exp: /Verdana/},
    {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.ftl__text p', css: 'fontFamily', exp: /Tahoma/},
    {id: 'fill_on_scroll', v: false, sel: '.ftl', css: '@data-fill_on_scroll', exp: 'false'},
    ...SPACING('.r7s__inner', '.ftl'),
    {block: 'eyebrow', id: 'text', v: 'Since day one', sel: '.r7h__eyebrow', css: 'text', exp: 'Since day one'},
    {block: 'eyebrow', id: 'enable_custom_style', v: true, preBlock: true, pre: {color: '#cc0033'}, sel: '.r7h__eyebrow', css: 'color', exp: 'rgb(204, 0, 51)'},
    {block: 'eyebrow', id: 'color', v: '#cc0033', ...BC, sel: '.r7h__eyebrow', css: 'color', exp: 'rgb(204, 0, 51)'},
    ...HEAD_BLOCKS,
    {block: 'item', id: 'label', v: 'Year one', sel: '.ftl__label', css: 'text', exp: 'Year one'},
    {block: 'item', id: 'title', v: 'Order <online>', sel: '.ftl__title', css: 'text', exp: 'Order <online>'},
    {block: 'item', id: 'text', v: '<p>Pick a <em>size</em></p>', sel: '.ftl__text em', css: 'text', exp: 'size'},
    {block: 'item', id: 'image', n: 1, v: IMG2, sel: '.ftl__item:nth-child(2) .ftl__img', css: '@src', exp: /pic-two\.png/},
    {block: 'item', id: 'image_alt', v: 'Hands at work', sel: '.ftl__img', css: '@alt', exp: 'Hands at work'},
    {block: 'item', id: 'enable_custom_style', v: true, preBlock: true, pre: {marker_color: '#ff8800'}, sel: '.ftl__dot', css: 'backgroundColor', exp: 'rgb(255, 136, 0)'},
    {block: 'item', id: 'marker_color', v: '#ff8800', ...BC, sel: '.ftl__dot', css: 'backgroundColor', exp: 'rgb(255, 136, 0)'},
    {block: 'item', id: 'title_color', v: '#118811', ...BC, sel: '.ftl__title', css: 'color', exp: 'rgb(17, 136, 17)'},
  ],
  async inherit(t, h) {
    h.eq(await read(t, '.ftl', 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background ' + h.tag);
    h.eq(await read(t, '.r7h__heading', 'color'), 'rgb(255, 255, 255)', 'heading colour ' + h.tag);
    h.match(await read(t, '.r7h__heading', 'fontFamily'), /Georgia/, 'heading font ' + h.tag);
    h.eq(await read(t, '.r7h__heading', '.tagName') + await read(t, '.ftl__title', '.tagName'), 'H2H3', 'the heading is an h2, item titles are h3 ' + h.tag);
    h.eq(await read(t, 'h1', 'count'), 0, 'no h1 ' + h.tag);
    h.match(await read(t, '.ftl__title', 'fontFamily'), /Georgia/, 'item title heading font ' + h.tag);
    h.eq(await read(t, '.ftl__title', 'fontWeight'), '700', 'item title theme weight ' + h.tag);
    h.eq(await read(t, '.ftl__title', 'color'), 'rgb(255, 255, 255)', 'item title colour ' + h.tag);
    h.match(await read(t, '.ftl__text p', 'fontFamily'), /Arial/, 'item text body font ' + h.tag);
    h.eq(await read(t, '.ftl__text p', 'color'), 'rgb(204, 204, 204)', 'item text colour ' + h.tag);
    h.eq(await read(t, '.ftl__text', 'fontSize'), '16px', 'item text follows the theme body size ' + h.tag);
    h.match(await read(t, '.r7h__sub p', 'fontFamily'), /Arial/, 'subheading body font ' + h.tag);
    h.eq(await read(t, '.ftl__label', 'color'), 'rgb(204, 204, 204)', 'label colour ' + h.tag);
    h.match(await read(t, '.ftl__label', 'fontFamily'), DESK(h.width) ? /Georgia/ : /Arial/, 'label font ' + h.tag);
    h.eq(await read(t, '.ftl__dot', 'backgroundColor'), 'rgb(51, 102, 153)', 'marker follows primary ' + h.tag);
    h.eq(await read(t, '.ftl__seg', 'backgroundColor'), 'rgb(68, 85, 102)', 'line follows the border colour ' + h.tag);
    h.eq(await read(t, '.ftl__media', 'borderTopLeftRadius'), '8px', 'picture uses the theme radius ' + h.tag);
    h.eq(await read(t, '.r7b', 'backgroundColor'), 'rgb(18, 52, 86)', 'button follows the theme ' + h.tag);
    for (const p of ['borderTopLeftRadius', 'paddingLeft', 'fontSize', 'fontFamily']) h.eq(await read(t, '.r7b', p), await themeButton(t, p), 'button ' + p + ' follows Theme settings > Buttons ' + h.tag);
    h.eq(await hoverBg(t, '.r7b'), 'rgb(255, 0, 0)', 'theme hover ' + h.tag);
  },
  schemeChecks: [['.ftl__title', 'color', 'rgb(16, 16, 16)'], ['.ftl__dot', 'backgroundColor', 'rgb(0, 136, 0)'], ['.ftl__seg', 'backgroundColor', 'rgb(221, 221, 221)']],
  custom: {
    on: {section_bg: '#abcdef', line_color: '#0000ff', marker_color: '#ff00ff', label_color: '#00ff00', title_color: '#123123', text_color: '#321321'},
    checks: [['.ftl', 'backgroundColor', 'rgb(171, 205, 239)'], ['.ftl__seg', 'backgroundColor', 'rgb(0, 0, 255)'], ['.ftl__dot', 'backgroundColor', 'rgb(255, 0, 255)'], ['.ftl__label', 'color', 'rgb(0, 255, 0)'], ['.ftl__title', 'color', 'rgb(18, 49, 35)'], ['.ftl__text p', 'color', 'rgb(50, 19, 33)'], ['.ftl__text strong', 'color', 'rgb(50, 19, 33)']],
    off: [['.ftl', 'backgroundColor', 'rgb(24, 32, 40)'], ['.ftl__seg', 'backgroundColor', 'rgb(68, 85, 102)'], ['.ftl__dot', 'backgroundColor', 'rgb(51, 102, 153)'], ['.ftl__label', 'color', 'rgb(204, 204, 204)'], ['.ftl__title', 'color', 'rgb(255, 255, 255)'], ['.ftl__text p', 'color', 'rgb(204, 204, 204)'], ['.ftl__text strong', 'color', 'rgb(255, 255, 255)']],
  },
  fonts: {
    checks: [['.r7h__heading', /Verdana/], ['.ftl__title', /Verdana/], ['.ftl__text p', /Tahoma/], ['.ftl__text a', /Tahoma/], ['.r7h__sub p', /Tahoma/], ['.r7h__eyebrow', /Tahoma/]],
    off: [['.r7h__heading', /Georgia/], ['.ftl__title', /Georgia/], ['.ftl__text p', /Arial/], ['.r7h__sub p', /Arial/], ['.r7h__eyebrow', /Arial/]],
  },
  extraBlock: {block: {type: 'item', settings: {label: 'Later', title: 'Added item', text: '<p>Added</p>'}}, async check(t, h) {
    h.eq(await read(t, '.ftl__item:last-child .ftl__title', 'text'), 'Added item', 'added block renders ' + h.tag);
    h.eq(await read(t, '.ftl__item', 'count'), 4, 'four items ' + h.tag);
    await t.emit({title: 'Edited item'}, t.rendered[0].section.blocks.filter(b => b.type === 'item').pop().id);
    h.eq(await read(t, '.ftl__item:last-child .ftl__title', 'text'), 'Edited item', 'added block live ' + h.tag);
  }},
  async each(t, width, editing, h) {
    const tag = h.tag;
    /* Layout: the line and the content sit where the design puts them */
    const geo = () => t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .ftl__item')].map(li => { const q = s => { const e = li.querySelector(s); if (!e || e.hidden || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return {x: Math.round(r.x), r: Math.round(r.right), y: Math.round(r.y), b: Math.round(r.bottom), cy: Math.round(r.y + r.height / 2)}; }; return {rail: q('.ftl__rail'), mk: q('.ftl__mk'), label: q('.ftl__label'), body: q('.ftl__body'), title: q('.ftl__title'), media: q('.ftl__media'), seg: q('.ftl__seg')}; }));
    let g = await geo();
    if (DESK(width)) {
      h.ok(g[0].label.r <= g[0].rail.x && g[0].body.x >= g[0].rail.r, 'first item: label left of the line, text right ' + tag);
      h.ok(g[1].body.r <= g[1].rail.x && g[1].label.x >= g[1].rail.r, 'second item: sides swapped ' + tag);
      h.ok(g[0].media.r <= g[0].rail.x && g[0].media.y >= g[0].label.b, 'the picture sits under the label, across the line from the text ' + tag);
      h.ok(Math.abs((g[0].rail.x + g[0].rail.r) / 2 - width / 2) <= 1, 'the line is centred ' + tag);
    } else {
      h.ok(g.every(i => i.rail.x < i.body.x && i.label.x === i.body.x && i.label.b <= i.body.y + 1), 'a phone shows one column with the line on the left ' + tag);
      h.ok(g[0].media.y >= g[0].body.b && g[0].media.x === g[0].body.x, 'the picture follows the text ' + tag);
    }
    h.ok(g.every(i => Math.abs(i.mk.cy - (DESK(width) ? i.title.y + (i.title.b - i.title.y) / 2 : i.label.y + (i.label.b - i.label.y) / 2)) <= 2 || (i.title.b - i.title.y) > 40), 'each marker is level with its first line ' + tag);
    h.ok(Math.abs(g[0].seg.b + 6 - g[1].mk.y) <= 1 && Math.abs(g[0].seg.y - g[0].mk.b - 6) <= 1, 'the line runs from one marker to the next ' + tag);
    h.eq(g[2].seg, null, 'no line after the last item ' + tag);
    await t.emit({layout: 'side'});
    g = await geo();
    if (DESK(width)) h.ok(g.every(i => i.label.r <= i.rail.x && i.body.x >= i.rail.r) && g[0].media.x === g[0].body.x && g[0].media.y >= g[0].body.b, 'one side: every label left, every text right, the picture under the text ' + tag);
    await t.emit({layout: 'alternate'});
    await distinct(t, h, 'layout', () => innerWidth >= 768 ? [...document.querySelectorAll('#shopify-section-test .ftl__body')].map(e => Math.round(e.getBoundingClientRect().x)).join() : document.querySelector('#shopify-section-test .ftl').dataset.layout);
    await distinct(t, h, 'text_align', () => Math.round(document.querySelector('#shopify-section-test .r7h__heading').getBoundingClientRect().x) + ',' + Math.round(document.querySelector('#shopify-section-test .r7b').getBoundingClientRect().x));
    await distinct(t, h, 'marker_style', () => { const d = document.querySelector('#shopify-section-test .ftl__dot'), c = getComputedStyle(d); return [c.width, c.backgroundColor, c.borderTopWidth, getComputedStyle(d.firstElementChild).display].join(); });
    await distinct(t, h, 'image_ratio', () => getComputedStyle(document.querySelector('#shopify-section-test .ftl__img')).aspectRatio);
    await distinct(t, h, 'section_width', () => { const r = document.querySelector('#shopify-section-test .ftl'), i = r.querySelector('.r7s__inner'); return getComputedStyle(r).maxWidth + ' ' + getComputedStyle(i).maxWidth; });
    await t.emit({show_section_on: 'desktop'}); h.eq(await read(t, '.ftl', 'display'), DESK(width) ? 'block' : 'none', 'only desktop ' + tag); await t.emit({show_section_on: 'all'});
    /* A number marker shows the item's place and grows the marker */
    await t.emit({marker_style: 'number'});
    h.eq(await read(t, '.ftl__item:nth-child(2) .ftl__num', 'text') + ' ' + await read(t, '.ftl__mk', 'width'), '2 28px', 'number markers ' + tag);
    h.eq(await read(t, '.ftl__rail', '@aria-hidden'), 'true', 'markers are decoration for assistive tech ' + tag);
    await t.emit({marker_style: 'dot'});
    /* Empty words hide their element, live; a block's marker colour stays on its own item */
    const I0 = t.blockId('item', 0);
    await t.emit({label: '', text: ''}, I0);
    h.eq([await read(t, '.ftl__label', 'visible'), await read(t, '.ftl__text', 'visible'), await read(t, '.ftl__title', 'visible')].join(), 'false,false,true', 'empty label and text are hidden ' + tag);
    await t.emit({label: 'First', text: LONG}, I0);
    await t.emit({enable_custom_style: true, marker_color: '#ff8800'}, I0);
    h.eq(await read(t, '.ftl__item:nth-child(2) .ftl__dot', 'backgroundColor'), 'rgb(51, 102, 153)', 'the next item keeps the section marker colour ' + tag);
    await t.emit({enable_custom_style: false, marker_color: ''}, I0);
    h.eq(await read(t, '.ftl__dot', 'backgroundColor'), 'rgb(51, 102, 153)', 'item custom styling off restores the scheme ' + tag);
    /* Pictures: alt from the setting, size reserved, lazy; picked and removed live; never loaded again by other edits */
    h.eq([await read(t, '.ftl__img', '@alt'), await read(t, '.ftl__img', '@loading'), await read(t, '.ftl__img', '@width'), await read(t, '.ftl__img', '@height')].join('|'), 'The stall|lazy|1200|800', 'picture attributes ' + tag);
    const I1 = t.blockId('item', 1);
    if (editing) {
      h.eq(await read(t, '.ftl__item:nth-child(2) .ftl__media', 'visible'), false, 'no picture, no box ' + tag);
      await t.emit({image: IMG2}, I1);
      h.eq(await read(t, '.ftl__item:nth-child(2) .ftl__media', 'visible'), true, 'a picked picture shows live ' + tag);
      await t.emit({image: ''}, I1);
      h.eq(await read(t, '.ftl__item:nth-child(2) .ftl__media', 'visible'), false, 'a removed picture hides live ' + tag);
    } else h.eq(await read(t, '.ftl__item:nth-child(2) .ftl__media', 'count'), 0, 'no picture, no markup on the storefront ' + tag);
    await t.page.evaluate(() => { const r = document.querySelector('#shopify-section-test'); window.__keep = {img: r.querySelector('.ftl__img'), src: r.querySelector('.ftl__img').src, item: r.querySelector('.ftl__item'), h2: r.querySelector('.r7h__heading')}; });
    if (editing) {
      for (const patch of [{marker_size: 20}, {item_gap_desktop: 60}, {layout: 'side'}, {text_align: 'left'}, {color_scheme: 'alt-scheme'}]) await t.emit(patch);
      await t.emit({title: 'Another title'}, I1);
      h.ok(await t.page.evaluate(() => { const r = document.querySelector('#shopify-section-test'); return r.querySelector('.ftl__img') === window.__keep.img && window.__keep.img.src === window.__keep.src && r.querySelector('.ftl__item') === window.__keep.item && r.querySelector('.r7h__heading') === window.__keep.h2; }), 'unrelated edits keep the picture and every node ' + tag);
      const before = (await counts(t.page)).paints;
      await t.emit({marker_size: 21, line_thickness: 3, head_gap: 40});
      h.eq((await counts(t.page)).paints - before, 1, 'one paint for one event ' + tag);
      await t.redraw({});
    }
    /* A narrow column on a wide window uses the phone layout (container query) */
    if (DESK(width)) {
      await t.page.evaluate(() => { document.getElementById('shopify-section-test').style.width = '500px'; }); await frames(t.page);
      h.eq((await read(t, '.ftl__item', 'gridTemplateColumns')).split(' ').length + ' ' + await read(t, '.r7s__inner', 'paddingTop'), '2 56px', 'a narrow column uses the phone layout and padding ' + tag);
      await t.page.evaluate(() => { document.getElementById('shopify-section-test').style.width = ''; });
    }
    /* Scroll fill: in the builder nothing animates; on the storefront it is CSS only */
    h.eq(await read(t, '.ftl__fill', 'animationName') + ' ' + await read(t, '.ftl__dot', 'animationName'), editing ? 'none none' : 'r7-ftl-fill r7-ftl-reach', 'scroll fill ' + (editing ? 'is off in the builder ' : 'is on ') + tag);
    if (editing) h.eq(await read(t, '.ftl__dot', 'opacity') + ' ' + await read(t, '.ftl__fill', 'display'), '1 none', 'the builder draws the plain line and full markers ' + tag);
    /* No items: the header and button still draw, nothing breaks */
    await t.redraw({blocks: TIMELINE_FULL.filter(b => b.type !== 'item')});
    h.eq(await read(t, '.ftl__list', 'count') + ' ' + await read(t, '.r7h__heading', 'visible'), '0 true', 'no items: no list, the header stays ' + tag);
    await t.redraw({blocks: []});
    h.ok(await read(t, '.ftl', 'visible') && t.errors.length === 0, 'no blocks at all draws an empty band without errors ' + tag);
    await t.redraw({blocks: TIMELINE_FULL});
  },
  async two(two, h) {
    await two.emit({enable_custom_style: true, section_bg: '#abcdef', marker_size: 24, layout: 'side'}, undefined, 'a');
    await two.emit({title: 'Only A'}, two.blockId('item', 0, 'a'), 'a');
    await two.emit({text: 'Only A heading'}, two.blockId('heading', 0, 'a'), 'a');
    h.eq(await read(two, '.ftl', 'backgroundColor', 'a') + ' ' + await read(two, '.ftl__title', 'text', 'a'), 'rgb(171, 205, 239) Only A', 'a edited ' + h.tag);
    h.eq([await read(two, '.ftl', 'backgroundColor', 'b'), await read(two, '.ftl__mk', 'width', 'b'), await read(two, '.ftl', '@data-layout', 'b'), await read(two, '.ftl__title', 'text', 'b'), await read(two, '.r7h__heading', 'text', 'b')].join('|'), 'rgb(24, 32, 40)|14px|alternate|A market stall|How we got here', 'b untouched ' + h.tag);
  },
  async reduced(rm, h) {
    h.eq(await read(rm, '.ftl__title', 'visible'), true, 'content visible under reduced motion ' + h.tag);
    h.eq([await read(rm, '.ftl__fill', 'animationName'), await read(rm, '.ftl__fill', 'display'), await read(rm, '.ftl__dot', 'animationName'), await read(rm, '.ftl__dot', 'opacity'), await read(rm, '.ftl__seg', 'visible')].join(' '), 'none none none 1 true', 'reduced motion: a plain line, every marker drawn ' + h.tag);
  },
  async after(browser, h) {
    /* The scroll fill on the storefront: the line grows as the page scrolls, markers light as it reaches them, nothing runs in script */
    for (const width of WIDTHS) {
      const t = await mount(browser, 'feature-timeline', {width, height: 700, editing: false, blocks: TIMELINE_FULL, assets: [ASSET]});
      await t.page.evaluate(() => { const pad = () => { const d = document.createElement('div'); d.style.height = '1400px'; return d; }; document.body.prepend(pad()); document.body.append(pad()); window.__anim = document.querySelector('#shopify-section-test .ftl__fill').getAnimations()[0]; });
      await frames(t.page);
      h.eq(JSON.stringify(await segFill(t)), '[0,0]', 'below the fold nothing is filled @' + width);
      h.eq(await read(t, '.ftl__dot', 'opacity'), '0.35', 'markers wait dimmed @' + width);
      h.eq(await read(t, '.ftl__title', 'opacity') + await read(t, '.ftl__text', 'opacity'), '11', 'the words are never dimmed @' + width);
      const y = await t.page.evaluate(() => { const s = document.querySelector('#shopify-section-test .ftl__seg').getBoundingClientRect(); return Math.round(s.top + scrollY + s.height / 2 - innerHeight * 0.62); });
      await t.page.evaluate(y => scrollTo(0, y), y); await frames(t.page);
      const mid = await segFill(t);
      h.ok(mid[0] > 0.4 && mid[0] < 0.6 && mid[1] === 0, 'half way down the first stretch the line is half filled ' + JSON.stringify(mid) + ' @' + width);
      h.eq(await read(t, '.ftl__dot', 'opacity') + ' ' + await read(t, '.ftl__item:nth-child(2) .ftl__dot', 'opacity'), '1 0.35', 'the first marker is lit, the second waits @' + width);
      h.ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .ftl__fill').getAnimations()[0] === window.__anim), 'the same animation keeps running (not restarted) @' + width);
      await t.page.evaluate(() => scrollTo(0, document.querySelector('#shopify-section-test').getBoundingClientRect().bottom + scrollY)); await frames(t.page);
      h.eq(JSON.stringify(await segFill(t)), '[1,1]', 'past the section the line is full @' + width);
      h.eq(await read(t, '.ftl__item:last-child .ftl__dot', 'opacity'), '1', 'every marker lit @' + width);
      h.match(await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .ftl__fill')).animationTimeline), /view\(.*62% 38%\)/, 'driven by the view timeline, no script @' + width);
      /* Off: the plain line */
      await t.redraw({settings: {fill_on_scroll: false}});
      h.eq(await read(t, '.ftl__fill', 'display') + ' ' + await read(t, '.ftl__dot', 'animationName') + ' ' + await read(t, '.ftl__dot', 'opacity'), 'none none 1', 'fill off: plain line and full markers @' + width);
      h.eq(t.errors.length, 0, 'no errors while scrolling @' + width);
      await t.page.close();
    }
    await presetNoScript(browser, h, 'feature-timeline', ['What happens after you order', 'Order confirmed', 'Delivered'], '.ftl__item', 4);
  },
};

/* The first preset with scripts off (an Add a section card): complete, no pictures asked for, nothing off screen. */
async function presetNoScript(browser, h, name, words, sel, n) {
  for (const width of WIDTHS) {
    const r = await fixture.render(name, {editing: true});
    const ctx = await browser.newContext({javaScriptEnabled: false, viewport: {width, height: 900}}), page = await ctx.newPage(), asked = [];
    page.on('request', q => { if (/\.(png|jpe?g|webp|gif|svg)(\?|$)/.test(q.url())) asked.push(q.url()); });
    await page.route('**/*', q => q.fulfill({contentType: 'text/html', body: q.request().url() === 'http://pv.test/' ? '<!doctype html><html><head><style>' + fixture.THEME_VARS + '</style></head><body><div id="shopify-section-test" class="shopify-section">' + r.html + '</div></body></html>' : ''}));
    await page.goto('http://pv.test/');
    const m = await page.evaluate(sel => { const w = document.getElementById('shopify-section-test'); return {text: w.innerText, n: w.querySelectorAll(sel).length, h: Math.round(w.getBoundingClientRect().height), ovf: document.documentElement.scrollWidth > innerWidth + 1, hidden: [...w.querySelectorAll(sel)].filter(e => !e.offsetHeight || getComputedStyle(e).opacity !== '1').length}; }, sel);
    for (const word of words) h.ok(m.text.toLowerCase().includes(word.toLowerCase()), `preset shows "${word}" with scripts off @${width}`);
    h.eq(m.n + ' ' + m.hidden + ' ' + m.ovf + ' ' + asked.length, n + ' 0 false 0', `preset: ${n} ${sel}, all visible, no overflow, no picture requested @${width}`);
    h.ok(m.h > 150 && m.h < 1200, 'preset height is a section, not a runway: ' + m.h + ' @' + width);
    await ctx.close();
  }
}

/* ------------------------------------------------------------ Guarantee Banner */
const BANNER_FULL = [
  {type: 'heading', settings: {text: 'Thirty days to decide'}},
  {type: 'subheading', settings: {text: '<p>Send it back if it is not right. Read the <a href="/pages/returns">details</a>.</p>'}},
  {type: 'button', settings: {label: 'Read our story', link: '/pages/about', style: 'primary'}},
  {type: 'point', settings: {text: 'Free returns'}},
  {type: 'point', settings: {text: 'Prepaid <strong>label</strong>'}},
  {type: 'point', settings: {text: 'Refund to your card'}},
];
const banner = {
  name: 'guarantee-banner', root: '.gbn', full: BANNER_FULL, extra: ['enable_custom_style', 'enable_custom_fonts'],
  snap: '#shopify-section-test :is(.gbn, .r7s__inner, .gbn__band, .gbn__seal, .gbn__icon, .gbn__main, .r7h__heading, .r7h__sub, .r7b, .gbn__points, .gbn__point, .gbn__tick, .gbn__ptext)',
  table: [
    ...GENERAL('.gbn'),
    {id: 'layout', v: 'stacked', sel: '.gbn__main', css: 'textAlign', exp: 'center'},
    {id: 'frame', v: 'lines', check: async t => assert.equal([await read(t, '.gbn__band', 'borderTopWidth'), await read(t, '.gbn__band', 'borderLeftWidth')].join(), '1px,0px')},
    {id: 'content_max_width', v: 700, sel: '.gbn__band', css: 'maxWidth', exp: '700px'},
    {id: 'icon', v: 'truck', check: async (t, w, how) => { assert.equal(await read(t, '.gbn__icon', '@data-r7f-icon'), 'truck'); assert.match(await t.page.evaluate(() => document.querySelector('#shopify-section-test .gbn__icon').innerHTML), /circle cx="17" cy="18"/, how + ' truck icon drawn'); }},
    {id: 'image', v: IMG, check: async (t, w, how) => { assert.match(await read(t, '.gbn__seal-img', '@src'), /pic-one\.png/); assert.equal(await read(t, '.gbn__seal-img', 'visible'), true, how); if (await read(t, '.gbn__icon', 'count')) assert.equal(await read(t, '.gbn__icon', 'visible'), false, how + ' the image takes the place of the icon'); }},
    {id: 'image_alt', v: 'Two year warranty seal', pre: {image: IMG}, sel: '.gbn__seal-img', css: '@alt', exp: 'Two year warranty seal'},
    {id: 'icon_size', v: 40, sel: '.gbn__seal', css: 'width', exp: '40px'},
    {id: 'point_style', v: 'dot', sel: '.gbn__tick svg', css: 'display', exp: 'none'},
    {id: 'section_bg', v: '#abcdef', ...C, sel: '.gbn', css: 'backgroundColor', exp: 'rgb(171, 205, 239)'},
    {id: 'icon_color', v: '#ff00ff', ...C, sel: '.gbn__icon svg', css: 'stroke', exp: 'rgb(255, 0, 255)'},
    {id: 'border_color', v: '#0000ff', ...C, sel: '.gbn__band', css: 'borderTopColor', exp: 'rgb(0, 0, 255)'},
    {id: 'point_color', v: '#123123', ...C, sel: '.gbn__ptext', css: 'color', exp: 'rgb(18, 49, 35)'},
    {id: 'marker_color', v: '#00ff00', ...C, sel: '.gbn__tick svg', css: 'stroke', exp: 'rgb(0, 255, 0)'},
    {id: 'heading_font', v: {family: 'Verdana'}, pre: {enable_custom_fonts: true}, sel: '.r7h__heading', css: 'fontFamily', exp: /Verdana/},
    {id: 'body_font', v: {family: 'Tahoma'}, pre: {enable_custom_fonts: true}, sel: '.gbn__point', css: 'fontFamily', exp: /Tahoma/},
    ...SPACING('.r7s__inner', '.gbn'),
    ...HEAD_BLOCKS,
    {block: 'point', id: 'text', v: 'Ships <em>tracked</em>', sel: '.gbn__ptext em', css: 'text', exp: 'tracked'},
  ],
  async inherit(t, h) {
    h.eq(await read(t, '.gbn', 'backgroundColor'), 'rgb(24, 32, 40)', 'scheme background ' + h.tag);
    h.eq(await read(t, '.r7h__heading', 'color') + ' ' + await read(t, '.r7h__heading', '.tagName'), 'rgb(255, 255, 255) H2', 'heading colour, an h2 ' + h.tag);
    h.eq(await read(t, 'h1', 'count'), 0, 'no h1 ' + h.tag);
    h.match(await read(t, '.r7h__heading', 'fontFamily'), /Georgia/, 'heading font ' + h.tag);
    h.eq(await read(t, '.r7h__heading', 'fontWeight'), '700', 'heading theme weight ' + h.tag);
    h.eq(await read(t, '.r7h__heading', 'fontSize'), DESK(h.width) ? '30px' : '24px', 'heading size from the theme scale ' + h.tag);
    h.match(await read(t, '.r7h__sub p', 'fontFamily'), /Arial/, 'text body font ' + h.tag);
    h.eq(await read(t, '.r7h__sub p', 'color') + ' ' + await read(t, '.r7h__sub', 'fontSize'), 'rgb(204, 204, 204) 16px', 'text colour and theme size ' + h.tag);
    h.match(await read(t, '.gbn__point', 'fontFamily'), /Arial/, 'points body font ' + h.tag);
    h.eq(await read(t, '.gbn__point', 'color'), 'rgb(255, 255, 255)', 'points follow the heading colour ' + h.tag);
    h.eq(await read(t, '.gbn__seal', 'color'), 'rgb(255, 255, 255)', 'seal follows the heading colour ' + h.tag);
    h.eq(await read(t, '.gbn__tick', 'color'), 'rgb(51, 102, 153)', 'point marker follows primary ' + h.tag);
    h.eq(await read(t, '.gbn__band', 'borderTopColor') + ' ' + await read(t, '.gbn__band', 'borderTopLeftRadius'), 'rgb(68, 85, 102) 8px', 'frame follows the border colour and theme radius ' + h.tag);
    h.eq(await read(t, '.r7b', 'backgroundColor'), 'rgb(18, 52, 86)', 'button follows the theme ' + h.tag);
    for (const p of ['borderTopLeftRadius', 'paddingLeft', 'fontSize', 'fontFamily']) h.eq(await read(t, '.r7b', p), await themeButton(t, p), 'button ' + p + ' follows Theme settings > Buttons ' + h.tag);
    h.eq(await hoverBg(t, '.r7b'), 'rgb(255, 0, 0)', 'theme hover ' + h.tag);
  },
  schemeChecks: [['.r7h__heading', 'color', 'rgb(16, 16, 16)'], ['.gbn__seal', 'color', 'rgb(16, 16, 16)'], ['.gbn__band', 'borderTopColor', 'rgb(221, 221, 221)'], ['.gbn__tick', 'color', 'rgb(0, 136, 0)']],
  custom: {
    on: {section_bg: '#abcdef', icon_color: '#ff00ff', border_color: '#0000ff', point_color: '#123123', marker_color: '#00ff00'},
    checks: [['.gbn', 'backgroundColor', 'rgb(171, 205, 239)'], ['.gbn__seal', 'color', 'rgb(255, 0, 255)'], ['.gbn__band', 'borderTopColor', 'rgb(0, 0, 255)'], ['.gbn__point:nth-child(2)', 'borderTopColor', 'rgb(0, 0, 255)'], ['.gbn__point', 'color', 'rgb(18, 49, 35)'], ['.gbn__point strong', 'color', 'rgb(18, 49, 35)'], ['.gbn__tick', 'color', 'rgb(0, 255, 0)']],
    off: [['.gbn', 'backgroundColor', 'rgb(24, 32, 40)'], ['.gbn__seal', 'color', 'rgb(255, 255, 255)'], ['.gbn__band', 'borderTopColor', 'rgb(68, 85, 102)'], ['.gbn__point', 'color', 'rgb(255, 255, 255)'], ['.gbn__tick', 'color', 'rgb(51, 102, 153)']],
  },
  fonts: {
    checks: [['.r7h__heading', /Verdana/], ['.r7h__sub p', /Tahoma/], ['.r7h__sub a', /Tahoma/], ['.gbn__point', /Tahoma/], ['.gbn__point strong', /Tahoma/]],
    off: [['.r7h__heading', /Georgia/], ['.r7h__sub p', /Arial/], ['.gbn__point', /Arial/]],
  },
  extraBlock: {block: {type: 'point', settings: {text: 'A fourth point'}}, async check(t, h) {
    h.eq(await read(t, '.gbn__point', 'count'), 3, 'three points at most ' + h.tag);
    await t.redraw({blocks: BANNER_FULL.slice(0, 5)});
    h.eq(await read(t, '.gbn__point', 'count'), 2, 'two points draw two ' + h.tag);
    await t.redraw({blocks: BANNER_FULL.slice(0, 4).concat([{type: 'point', settings: {text: 'Added point'}}])});
    h.eq(await read(t, '.gbn__point:last-child .gbn__ptext', 'text'), 'Added point', 'added block renders ' + h.tag);
    await t.emit({text: 'Edited point'}, t.rendered[0].section.blocks.filter(b => b.type === 'point').pop().id);
    h.eq(await read(t, '.gbn__point:last-child .gbn__ptext', 'text'), 'Edited point', 'added block live ' + h.tag);
    await t.redraw({blocks: BANNER_FULL});
  }},
  async each(t, width, editing, h) {
    const tag = h.tag;
    const box = sel => t.page.evaluate(sel => { const r = document.querySelector('#shopify-section-test ' + sel).getBoundingClientRect(); return {x: Math.round(r.x), r: Math.round(r.right), y: Math.round(r.y), b: Math.round(r.bottom), cx: Math.round(r.x + r.width / 2)}; }, sel);
    let seal = await box('.gbn__seal'), main = await box('.gbn__main'), pts = await box('.gbn__points');
    if (DESK(width)) h.ok(seal.r <= main.x && main.r <= pts.x && Math.abs((seal.y + seal.b) / 2 - (main.y + main.b) / 2) <= 1, 'side by side: seal, promise, points in one row ' + tag);
    else h.ok(seal.b <= main.y && main.b <= pts.y && seal.x === main.x, 'a phone stacks them, left aligned ' + tag);
    await t.emit({layout: 'stacked'});
    seal = await box('.gbn__seal'); main = await box('.gbn__main'); pts = await box('.gbn__points');
    h.ok(seal.b <= main.y && main.b <= pts.y && Math.abs(seal.cx - width / 2) <= 1 && Math.abs(main.cx - width / 2) <= 1 && Math.abs(pts.cx - width / 2) <= 1, 'centered: stacked on the middle ' + tag);
    if (DESK(width)) h.eq(new Set(await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .gbn__point')].map(p => Math.round(p.getBoundingClientRect().y)))).size, 1, 'centered: the points share a row ' + tag);
    await t.emit({layout: 'split'});
    await distinct(t, h, 'layout', () => Math.round(document.querySelector('#shopify-section-test .gbn__main').getBoundingClientRect().x) + getComputedStyle(document.querySelector('#shopify-section-test .gbn__main')).textAlign);
    await distinct(t, h, 'frame', () => { const c = getComputedStyle(document.querySelector('#shopify-section-test .gbn__band')); return [c.borderTopWidth, c.borderLeftWidth, c.paddingTop].join(); });
    await distinct(t, h, 'point_style', () => { const k = document.querySelector('#shopify-section-test .gbn__tick'); return [getComputedStyle(k).display, getComputedStyle(k.firstElementChild).display, getComputedStyle(k, '::before').content].join(); });
    await distinct(t, h, 'icon', () => { const k = document.querySelector('#shopify-section-test .gbn__icon'); return !k || k.hidden ? 'hidden' : k.innerHTML.replace(/\s+/g, ' '); });
    await distinct(t, h, 'section_width', () => { const r = document.querySelector('#shopify-section-test .gbn'), i = r.querySelector('.r7s__inner'); return getComputedStyle(r).maxWidth + ' ' + getComputedStyle(i).maxWidth; });
    await t.emit({show_section_on: 'desktop'}); h.eq(await read(t, '.gbn', 'display'), DESK(width) ? 'block' : 'none', 'only desktop ' + tag); await t.emit({show_section_on: 'all'});
    /* The seal: an icon, no icon, an image, live and after a redraw; never a wrong picture */
    h.eq(await read(t, '.gbn__icon', '@aria-hidden') + ' ' + await read(t, '.gbn__icon svg', 'count'), 'true 1', 'the icon is decoration ' + tag);
    await t.emit({icon: 'none'}); h.eq(await read(t, '.gbn__seal', editing ? 'visible' : 'count'), editing ? false : 0, 'no icon: no seal ' + tag);
    await t.emit({icon: 'badge_check'});
    h.eq(await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .gbn__icon svg [stroke="#ffffff"]')).stroke), 'rgb(24, 32, 40)', 'the check inside the filled seal takes the section background ' + tag);
    await t.emit({image: IMG, image_alt: ''});
    h.eq([await read(t, '.gbn__seal-img', '@alt'), await read(t, '.gbn__seal-img', '@loading'), await read(t, '.gbn__seal-img', 'objectFit'), await read(t, '.gbn__seal-img', 'width')].join('|'), 'A workshop table|lazy|contain|56px', 'seal image: alt from the picture, lazy, contained ' + tag);
    await t.emit({image_alt: 'Our seal'}); h.eq(await read(t, '.gbn__seal-img', '@alt'), 'Our seal', 'seal alt from the setting ' + tag);
    if (editing) {
      await t.page.evaluate(() => { const i = document.querySelector('#shopify-section-test .gbn__seal-img'); window.__keep = {img: i, src: i.src, h2: document.querySelector('#shopify-section-test .r7h__heading')}; });
      for (const patch of [{icon_size: 80}, {frame: 'lines'}, {layout: 'stacked'}, {color_scheme: 'alt-scheme'}, {icon: 'truck'}]) await t.emit(patch);
      await t.emit({text: 'Another point'}, t.blockId('point', 0));
      h.ok(await t.page.evaluate(() => { const i = document.querySelector('#shopify-section-test .gbn__seal-img'); return i === window.__keep.img && i.src === window.__keep.src && document.querySelector('#shopify-section-test .r7h__heading') === window.__keep.h2; }), 'unrelated edits keep the seal image and every node ' + tag);
      const before = (await counts(t.page)).paints;
      await t.emit({icon_size: 60, content_max_width: 900, frame: 'box'});
      h.eq((await counts(t.page)).paints - before, 1, 'one paint for one event ' + tag);
    }
    await t.emit({image: '', image_alt: ''});
    await t.redraw({});
    h.eq(await read(t, '.gbn__icon', 'visible'), true, 'image removed: the icon is back ' + tag);
    await t.redraw({settings: {icon: 'shield_check', icon_size: 56, frame: 'box', layout: 'split', color_scheme: 'default-color-scheme', content_max_width: 1100}});
    /* Seal size: the full size on a wide column, 72px at most on a phone */
    await t.emit({icon_size: 110}); h.eq(await read(t, '.gbn__seal', 'width'), DESK(width) ? '110px' : '72px', 'seal size ' + tag); await t.emit({icon_size: 56});
    /* Points: a list, an empty one hides, the rest stay */
    h.eq(await read(t, '.gbn__points', '.tagName') + ' ' + await read(t, '.gbn__points', '@role'), 'UL list', 'points are a list ' + tag);
    await t.emit({text: ''}, t.blockId('point', 1));
    h.eq(await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .gbn__point')].map(p => p.offsetHeight > 0).join()), 'true,false,true', 'an empty point is hidden ' + tag);
    await t.emit({text: 'Prepaid <strong>label</strong>'}, t.blockId('point', 1));
    /* A narrow column on a wide window stacks (container query) */
    if (DESK(width)) {
      await t.page.evaluate(() => { document.getElementById('shopify-section-test').style.width = '500px'; }); await frames(t.page);
      h.eq(await read(t, '.gbn__band', 'flexDirection') + ' ' + await read(t, '.r7s__inner', 'paddingTop'), 'column 40px', 'a narrow column stacks and uses the phone padding ' + tag);
      await t.page.evaluate(() => { document.getElementById('shopify-section-test').style.width = ''; });
    }
    h.eq(await t.page.evaluate(() => document.querySelector('#shopify-section-test').getAnimations({subtree: true}).length), 0, 'nothing animates in this band ' + tag);
    /* Parts left out: no points, no seal, heading only, nothing */
    await t.redraw({blocks: BANNER_FULL.filter(b => b.type !== 'point')});
    h.eq(await read(t, '.gbn__points', 'count') + ' ' + await read(t, '.r7h__heading', 'visible'), '0 true', 'no points: no list ' + tag);
    if (DESK(width)) h.ok((await box('.gbn__main')).r > width * 0.6, 'with no points the promise takes the row ' + tag);
    await t.redraw({blocks: [BANNER_FULL[0]]});
    h.eq(await read(t, '.r7h__sub', 'count') + ' ' + await read(t, '.r7b', 'count'), '0 0', 'heading only ' + tag);
    await t.redraw({blocks: []});
    h.ok(await read(t, '.gbn__seal', 'visible') && t.errors.length === 0, 'no blocks: the seal alone, no errors ' + tag);
    await t.redraw({blocks: BANNER_FULL});
  },
  async two(two, h) {
    await two.emit({enable_custom_style: true, section_bg: '#abcdef', frame: 'none', icon: 'truck', icon_size: 40}, undefined, 'a');
    await two.emit({text: 'Only A'}, two.blockId('point', 0, 'a'), 'a');
    await two.emit({text: 'Only A heading'}, two.blockId('heading', 0, 'a'), 'a');
    h.eq(await read(two, '.gbn', 'backgroundColor', 'a') + ' ' + await read(two, '.gbn__ptext', 'text', 'a') + ' ' + await read(two, '.gbn__icon', '@data-r7f-icon', 'a'), 'rgb(171, 205, 239) Only A truck', 'a edited ' + h.tag);
    h.eq([await read(two, '.gbn', 'backgroundColor', 'b'), await read(two, '.gbn__band', 'borderTopWidth', 'b'), await read(two, '.gbn__icon', '@data-r7f-icon', 'b'), await read(two, '.gbn__seal', 'width', 'b'), await read(two, '.gbn__ptext', 'text', 'b'), await read(two, '.r7h__heading', 'text', 'b')].join('|'), 'rgb(24, 32, 40)|1px|shield_check|56px|Free returns|Thirty days to decide', 'b untouched ' + h.tag);
  },
  async reduced(rm, h) {
    h.eq(await read(rm, '.r7h__heading', 'visible') + ' ' + await read(rm, '.gbn__point', 'visible'), 'true true', 'content visible under reduced motion ' + h.tag);
    await rm.emit({style: 'link'}, rm.blockId('button'));
    h.match(await read(rm, '.r7b__arrow', 'transitionDuration'), /^0s|0\.00001s|1e-05s$/, 'the link arrow does not move under reduced motion ' + h.tag);
  },
  async after(browser, h) {
    await presetNoScript(browser, h, 'guarantee-banner', ['Our guarantee', 'Read the full policy', 'Add your return window'], '.gbn__point', 3);
    /* The preset's link has no address yet: an inert button, in the Link style, 44px tall */
    const t = await mount(browser, 'guarantee-banner', {width: 375, editing: false, assets: [ASSET]});
    h.eq([await read(t, '.r7b', '.tagName'), await read(t, '.r7b', '@data-style'), await read(t, '.r7b', '@data-theme-button')].join(), 'BUTTON,link,', 'preset link: a button until a link is picked');
    h.ok(parseFloat(await read(t, '.r7b', 'height')) >= 44, 'preset link is a 44px target');
    h.eq(await read(t, 'template', 'count') + ' ' + await read(t, '.gbn__seal-img', 'count'), '0 0', 'the storefront carries no icon library and no empty image');
    await t.page.close();
  },
};

(async () => {
  const only = process.argv.slice(2);
  let total = 0;
  for (const cfg of [timeline, banner]) if (!only.length || only.includes(cfg.name)) total += await suite(cfg);
  console.log(`theme-r7-features: ${total} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
