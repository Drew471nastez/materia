/* Shared checks for the Logos and trust sections (round 4). Not a test on
   its own: tests/theme-logos-r4-<section>.cjs call run(spec).

   For a section it checks, at 375 and 1366, in the editor and on the
   storefront, with Theme settings priority on (the real theme-controls):
   schema problems, theme inheritance, the markup matching the controller
   (first paint = hydrated), no overflow, no errors; colour scheme switch live
   and after a redraw; and for EVERY non-hidden section and block setting, that
   a changed value changes the computed look of the section live and that a
   redraw with the same value looks exactly like the live result. Every option
   of every select is visibly distinct. Then two instances, an added block,
   redraw lifecycle, reduced motion and priority 'off'. spec.extra(t, ctx)
   adds the section's own targeted checks. */
const assert = require('assert/strict');
const {launch, mount, schemaProblems, schemaOf} = require('./media-fixture.cjs');

const IMG = {url: 'https://img.test/logo-a.png', src: 'https://img.test/logo-a.png', width: 300, height: 120, alt: 'Logo A'};
const IMG2 = {url: 'https://img.test/logo-b.png', src: 'https://img.test/logo-b.png', width: 320, height: 100, alt: 'Logo B'};
const FONT = {family: 'Courier New', fallback_families: 'monospace', weight: 300};
const PROPS = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform', 'textAlign', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'width', 'height', 'maxWidth', 'columnGap', 'rowGap', 'borderTopWidth', 'borderTopColor', 'borderTopLeftRadius', 'opacity', 'filter', 'display', 'justifyContent', 'alignItems', 'gridTemplateColumns', 'order', 'aspectRatio', 'objectFit', 'animationName', 'animationDuration', 'animationDirection', 'maskImage', 'transitionDuration', 'flexDirection', 'top', 'left', 'visibility', 'transform'];

let NO_RECT = '';
async function fingerprint(page, uid) {
  /* let finite transitions finish first */
  await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 1500))]));
  return page.evaluate(({uid, PROPS, NO_RECT}) => {
    const wrap = document.getElementById('shopify-section-' + uid);
    const out = [];
    const skip = /^(style|data-lg-ready|data-lg-reveal|data-lg-settings|data-lg-defaults|data-lg-block-defaults|tabindex|aria-current|aria-selected|data-active|class)$/;
    const w = wrap.getBoundingClientRect();
    for (const el of [wrap, ...wrap.querySelectorAll('*')]) {
      if (el.closest('template, style, script')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' && el !== wrap) { out.push(el.tagName + ':none'); continue; }
      const attrs = [...el.attributes].filter(a => !skip.test(a.name)).map(a => a.name + '=' + (a.name === 'src' || a.name === 'srcset' ? a.value.replace(/\?[^ ]*/g, '') : a.value)).sort().join(' ');
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
      const cls = [...el.classList].filter(c => !/^(is-|swiper|revealed|scroll-trigger)/.test(c)).sort().join('.');
      const r = NO_RECT && el.closest(NO_RECT) ? {left: 0, top: 0} : el.getBoundingClientRect();
      out.push(el.tagName + '.' + cls + '|' + attrs + '|' + own + '|' + Math.round(r.left - w.left) + ',' + Math.round(r.top - w.top) + '|' + PROPS.map(p => p === 'transform' && el.getAnimations().some(a => a.effect && a.effect.getTiming().iterations === Infinity) ? 'looping' : cs[p]).join(';') + '|' + ['::before', '::after'].map(p => { const s = getComputedStyle(el, p); return s.content + s.fontSize + s.color + s.backgroundColor + s.width + s.borderTopLeftRadius + s.opacity; }).join(''));
    }
    return out;
  }, {uid, PROPS, NO_RECT});
}
const diffAt = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return 'el ' + i + '\n   live  : ' + (a[i] || '').slice(0, 900) + '\n   redraw: ' + (b[i] || '').slice(0, 900); return ''; };

/* A value different from v for setting x. */
function changed(x, v) {
  switch (x.type) {
    case 'range': { const lo = x.min, hi = x.max; return num(v) === hi ? lo : hi; }
    case 'number': return num(v) + 7;
    case 'checkbox': return !(v === true || v === 'true');
    case 'select': case 'radio': case 'text_alignment': { const opts = (x.options || [{value: 'left'}, {value: 'center'}, {value: 'right'}]).map(o => o.value); return opts.find(o => o !== v && !/^(theme|inherit)$/.test(o)) ?? opts.find(o => o !== v) ?? v; }
    case 'color': return v === '#ab1234' ? '#12ab34' : '#ab1234';
    case 'color_scheme': return 'alt-scheme';
    case 'text': case 'inline_richtext': return 'Changed ' + x.id;
    case 'textarea': return 'Changed ' + x.id;
    case 'richtext': return '<p>Changed ' + x.id + '</p>';
    case 'url': return '/collections/changed-' + x.id;
    case 'image_picker': return v && (v.url || v.src) === IMG.url ? IMG2 : IMG;
    case 'font_picker': return v && v.family === FONT.family ? {family: 'Verdana', fallback_families: 'sans-serif', weight: 400} : FONT;
    default: return undefined;
  }
}
function num(v, d = 0) { return v !== '' && v != null && Number.isFinite(+v) ? +v : d; }
/* Settings that make x visible: parses visible_if like {{ section.settings.a }}, == 'v', == false, != 'v'. */
function visibleBase(x, scope) {
  const out = {};
  if (!x.visible_if) return out;
  for (const part of x.visible_if.replace(/^\{\{|\}\}$/g, '').split(/\bor\b/)[0].split(/\band\b/)) {
    const m = part.trim().match(new RegExp('^' + scope + "\\.settings\\.(\\w+)(?:\\s*(==|!=)\\s*(.+))?$"));
    if (!m) continue;
    const [, id, op, raw] = m;
    if (!op) { out[id] = true; continue; }
    const val = raw.trim().replace(/^'|'$/g, '');
    const lit = val === 'false' ? false : val === 'true' ? true : val;
    if (op === '==') out[id] = lit;
    else if (lit === false) out[id] = true;
    else if (lit === true) out[id] = false;
  }
  return out;
}

async function run(spec) {
  const {name, blockTypes = [], extra, hover = {}, values = {}, skipEveryControl = {}, liveOnly = {}, bp = 768, button = false, globals = {}, heading = '.lg__heading', text = null, baseSettings = {}, baseBlocks, imageBlocks = {}} = spec;
  let checks = 0;
  const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
  const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++; };
  const {schema} = schemaOf(name);
  eq(schemaProblems(name), [], name + ' schema problems');
  for (const list of [schema.settings, ...(schema.blocks || []).map(b => b.settings)]) { const ids = list.filter(x => x.id).map(x => x.id); eq(new Set(ids).size, ids.length, name + ' unique ids'); }
  const VALUES = values;
  NO_RECT = spec.noRectWithin || '';
  const browser = await launch();
  const blocksWithImages = () => (baseBlocks || (schema.presets[0].blocks || [])).map(b => ({type: b.type, settings: {...(b.settings || {}), ...(imageBlocks[b.type] || {})}}));
  try {
    /* 1. inheritance, audit, overflow, errors: 375/1366 x editor/storefront */
    for (const width of [375, 1366]) for (const editing of [true, false]) {
      const t = await mount(browser, name, {width, editing, assets: ['live-logos.js'], globals, settings: baseSettings, blocks: baseBlocks});
      await t.page.waitForTimeout(80);
      const where = name + ' ' + width + (editing ? ' editor' : ' storefront');
      eq(t.errors, [], where + ' errors');
      eq(await t.page.evaluate(() => [...document.querySelectorAll('[data-lg-root][data-lg-settings]')].flatMap(r => window.MateriaLogos.audit(r))), [], where + ' markup = controller'); /* a visitor gets no settings JSON (request.design_mode only), except Brand info */
      ok(await t.noOverflow(), where + ' no horizontal overflow');
      eq(await t.css('[data-lg-root]', 'backgroundColor'), 'rgb(24, 32, 40)', where + ' scheme background');
      if (heading) { eq(await t.css(heading, 'color'), 'rgb(255, 255, 255)', where + ' heading colour'); ok(/Georgia/.test(await t.css(heading, 'fontFamily')), where + ' heading font'); }
      if (text) { eq(await t.css(text, 'color'), 'rgb(204, 204, 204)', where + ' text colour'); ok(/Arial/.test(await t.css(text, 'fontFamily')), where + ' text font'); }
      if (button) {
        eq(await t.css('[data-theme-button]', 'backgroundColor'), 'rgb(18, 52, 86)', where + ' theme button');
        if (!editing && width === 1366) { await t.root('[data-theme-button]').first().hover(); await t.page.waitForTimeout(80); eq(await t.css('[data-theme-button]', 'backgroundColor'), 'rgb(255, 0, 0)', where + ' theme button hover'); }
      }
      if (spec.inherit) checks += await spec.inherit(t, {width, editing, eq, ok}) || 0;
      await t.page.close();
    }
    /* 2. first paint = hydrated */
    for (const width of [375, 1366]) {
      const a = await mount(browser, name, {width, assets: [], globals, settings: baseSettings, blocks: baseBlocks, inlineScripts: false});
      const b = await mount(browser, name, {width, assets: ['live-logos.js'], globals, settings: baseSettings, blocks: baseBlocks});
      await b.page.waitForTimeout(120);
      const fa = await fingerprint(a.page, 'test'), fb = await fingerprint(b.page, 'test');
      ok(JSON.stringify(fa) === JSON.stringify(fb), name + ' ' + width + ' first paint equals hydrated paint: ' + diffAt(fa, fb));
      await a.page.close(); await b.page.close();
    }
    /* 3. every control, live and redraw, both widths; select options distinct */
    const presetBlocks = blocksWithImages();
    const types = [...new Set([...presetBlocks.map(b => b.type), ...blockTypes])];
    const allBlocks = presetBlocks.concat(blockTypes.filter(ty => !presetBlocks.some(b => b.type === ty)).map(type => ({type, settings: imageBlocks[type] || {}})));
    const pages = {};
    for (const width of [375, 1366]) { pages[width] = await mount(browser, name, {width, assets: ['live-logos.js'], globals, settings: baseSettings, blocks: allBlocks}); await pages[width].page.addStyleTag({content: '.shopify-section{padding-top:11px;padding-bottom:13px}'}); await pages[width].page.waitForTimeout(80); }
    const targets = [['section', null, schema.settings]].concat(types.map(ty => ['block', ty, (schema.blocks.find(b => b.type === ty) || {}).settings || []]));
    let controls = 0;
    for (const [scope, ty, list] of targets) {
      for (const x of list) {
        if (!x.id || x.hidden || x.type === 'header' || x.type === 'paragraph') continue;
        const key = (ty ? ty + '.' : '') + x.id;
        if (skipEveryControl[key]) continue;
        const results = [];
        const variants = (x.type === 'select' || x.type === 'radio') ? x.options.map(o => o.value) : null;
        for (const width of [375, 1366]) {
          const t = pages[width], blockId = ty ? t.blockId(ty) : undefined;
          const snap = JSON.parse(JSON.stringify({settings: t.rendered[0].section.settings, blocks: t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.settings}))}));
          const cur = t.rendered[0].section, curVal = ty ? cur.blocks.find(b => b.id === blockId).settings[x.id] : cur.settings[x.id];
          const base = visibleBase(x, scope === 'section' ? 'section' : 'block');
          /* a switch that only reveals other controls is checked with those controls set */
          if (x.type === 'checkbox') for (const y of list) if (y.id && y.visible_if && new RegExp('settings\\.' + x.id + '\\b').test(y.visible_if) && !/==\s*false/.test(y.visible_if)) { const cv = ty ? cur.blocks.find(b => b.id === blockId).settings[y.id] : cur.settings[y.id]; base[y.id] = changed(y, cv); }
          const baseRedraw = async extraSec => {
            const s = scope === 'section' ? {...base, ...(extraSec || {})} : {};
            const blocks = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.id === blockId ? {...b.settings, ...base, ...(scope === 'block' ? extraSec || {} : {})} : b.settings}));
            await t.redraw({settings: s, blocks});
            await t.page.waitForTimeout(60);
          };
          const baseVal = {...visibleBase(x, scope)}[x.id];
          const values = variants || [key in VALUES ? VALUES[key] : changed(x, curVal)];
          const prints = [];
          const fp = async () => { if (hover[key]) { await t.page.mouse.move(-20, -20); await t.root(hover[key]).first().hover({force: true}); await t.page.waitForTimeout(120); } else await t.page.mouse.move(-20, -20); return fingerprint(t.page, 'test'); };
          await baseRedraw();
          const before = await fp();
          for (const v of values) {
            await t.emit({[x.id]: v}, blockId);
            await t.page.waitForTimeout(40);
            const live = await fp();
            await baseRedraw({[x.id]: v});
            const redrawn = await fp();
            if (!liveOnly[key]) ok(JSON.stringify(live) === JSON.stringify(redrawn), name + ' ' + width + ' ' + key + '=' + JSON.stringify(v) + ': live equals redraw ' + diffAt(live, redrawn));
            prints.push(JSON.stringify(redrawn));
            results.push(JSON.stringify(redrawn) !== JSON.stringify(before) || (variants && v === curVal));
            await baseRedraw({[x.id]: curVal});
          }
          await t.redraw({settings: {...Object.fromEntries(schema.settings.filter(y => y.id).map(y => [y.id, null])), ...snap.settings}, blocks: snap.blocks});
          if (variants) results.push(prints);
          void baseVal;
        }
        if (variants) {
          const [p375, p1366] = results.filter(Array.isArray);
          for (let i = 0; i < variants.length; i++) for (let j = i + 1; j < variants.length; j++) if (!/^(theme|inherit)$/.test(variants[i]) && !(spec.samePairs || []).includes(key + ':' + variants[i] + '=' + variants[j])) ok(p375[i] !== p375[j] || p1366[i] !== p1366[j], name + ' ' + key + ': options ' + variants[i] + ' and ' + variants[j] + ' look different');
        } else ok(results.some(Boolean), name + ' ' + key + ' changes the section');
        controls++;
      }
    }
    for (const w of [375, 1366]) { eq(pages[w].errors, [], name + ' ' + w + ' errors in the control sweep'); await pages[w].page.close(); }
    /* 4. colour scheme live and redraw */
    {
      const t = await mount(browser, name, {width: 1366, assets: ['live-logos.js'], globals, settings: baseSettings, blocks: baseBlocks});
      await t.emit({color_scheme: 'alt-scheme'}); await t.page.waitForTimeout(40);
      eq(await t.css('[data-lg-root]', 'backgroundColor'), 'rgb(250, 250, 250)', name + ' scheme switch live');
      if (heading) eq(await t.css(heading, 'color'), 'rgb(16, 16, 16)', name + ' scheme heading live');
      await t.redraw({settings: {color_scheme: 'alt-scheme'}});
      eq(await t.css('[data-lg-root]', 'backgroundColor'), 'rgb(250, 250, 250)', name + ' scheme switch redraw');
      await t.page.close();
    }
    /* 5. two instances stay independent; an added block renders and is live; redraw initialises once */
    {
      const t = await mount(browser, name, {width: 1366, assets: ['live-logos.js'], globals, instances: [{uid: 'a', settings: baseSettings, blocks: baseBlocks}, {uid: 'b', settings: baseSettings, blocks: baseBlocks}]});
      const bBefore = await fingerprint(t.page, 'b');
      await t.emit({color_scheme: 'alt-scheme', ...(spec.instanceEdit || {})}, undefined, 'a'); await t.page.waitForTimeout(40);
      ok(JSON.stringify(await fingerprint(t.page, 'b')) === JSON.stringify(bBefore), name + ' editing instance a leaves b alone');
      eq(await t.css('[data-lg-root]', 'backgroundColor', 'a'), 'rgb(250, 250, 250)', name + ' instance a changed');
      const addType = spec.addType || types[types.length - 1];
      const blocks = t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.settings})).concat([{type: addType, settings: imageBlocks[addType] || {}}]);
      for (let i = 0; i < 3; i++) await t.redraw({uid: 'a', blocks});
      eq(await t.page.evaluate(() => window.MateriaLogos.roots.size), 2, name + ' redraws keep one controller per section');
      const added = t.rendered[0].section.blocks[t.rendered[0].section.blocks.length - 1];
      ok(await t.page.locator('[data-lg-block="' + added.id + '"]').count() >= 1, name + ' added block renders');
      if (spec.addedEdit) { await t.emit(spec.addedEdit.settings, added.id, 'a'); await t.page.waitForTimeout(40); checks += await spec.addedEdit.check(t, added.id, {eq, ok}) || 0; }
      eq(t.errors, [], name + ' two-instance errors');
      await t.page.close();
    }
    /* 6. reduced motion: content visible, no running animation */
    {
      const t = await mount(browser, name, {width: 1366, editing: false, reducedMotion: 'reduce', assets: ['live-logos.js'], globals, settings: {...baseSettings, ...(spec.motionSettings || {})}, blocks: baseBlocks});
      await t.page.waitForTimeout(150);
      eq(await t.page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).length), 0, name + ' reduced motion stops looping animation');
      eq(await t.page.evaluate(() => [...document.querySelectorAll('[data-lg-root] *')].filter(el => getComputedStyle(el).opacity === '0' && el.getBoundingClientRect().height > 0 && !el.closest('[aria-hidden="true"]') && !el.hidden).length), 0, name + ' reduced motion keeps content visible');
      eq(t.errors, [], name + ' reduced motion errors');
      await t.page.close();
    }
    /* 7. priority off: theme inheritance still holds */
    {
      const t = await mount(browser, name, {width: 1366, priority: 'off', assets: ['live-logos.js'], globals, settings: baseSettings, blocks: baseBlocks});
      eq(await t.css('[data-lg-root]', 'backgroundColor'), 'rgb(24, 32, 40)', name + ' priority off background');
      if (heading) ok(/Georgia/.test(await t.css(heading, 'fontFamily')), name + ' priority off heading font');
      if (text) ok(/Arial/.test(await t.css(text, 'fontFamily')), name + ' priority off text font');
      await t.page.close();
    }
    if (extra) checks += await extra({browser, mount, fingerprint, eq, ok, IMG, IMG2, FONT}) || 0;
    console.log(checks + ' ' + name + ' checks passed (' + controls + ' controls swept live and by redraw at 375 and 1366)');
  } finally { await browser.close(); }
  return checks;
}

module.exports = {run, fingerprint, IMG, IMG2, FONT};
if (require.main === module) console.log('theme-logos-r4-lib: shared helpers, run a tests/theme-logos-r4-<section>.cjs file');
