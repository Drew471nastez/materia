/* Shared checks for the features-b sections (Comparison Cards, Comparison
   Table, Comparison Table 2, Comparison Table 3, Comparison Table 4 and Text
   Comparisons), run by tests/theme-features-b.cjs:

   - schema: shared order checks, unique ids;
   - every non-hidden section and block control, at 375 and 1366: a server
     redraw changes the section, a live edit gives the same paint as the
     redraw (for every setting the root's data-fb-spec names as live), the
     markup equals what assets/live-features-b.js derives, desktop and mobile
     values change only at their own width, select options all look different;
   - theme inheritance (scheme colours, theme fonts), scheme switch live and
     after a redraw, custom styling on and off, first paint equals the
     hydrated paint, editor and storefront;
   - two instances stay independent, redraws keep one controller per root,
     an added block is drawn and live, no picture reload on unrelated edits;
   - tables: the scroller is a focusable region that scrolls sideways inside
     itself at 375 (never the page), keyboard scrolls it, the first column
     stays in view, check and cross are visibly different;
   - reduced motion and no overflow at 375. */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'live-features-b.js';
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const SVG = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16"/></svg>';
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const clone = o => JSON.parse(JSON.stringify(o));
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);

function valuesFor(x, cur = x.default) {
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_background': return ['linear-gradient(90deg, #ff0000, #0000ff)'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return [/alt$/.test(x.id) ? 'Described image' : /url$/.test(x.id) ? 'https://theme.test/logo.png' : /values/.test(x.id) ? 'no,yes,no' : 'Edited text'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <strong>copy</strong></p>'];
    case 'textarea': return [/svg/.test(x.id) ? SVG : 'Edited longer text'];
    case 'html': return [SVG];
    case 'url': return ['/pages/test'];
    case 'image_picker': return [IMG];
    case 'font_picker': return [FONT];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
/* Settings a control's visible_if asks for, plus all colours when it is a custom styling toggle. */
function prereq(x, list, base) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true|blank)))?/g)) {
    const [, id, op, str, lit] = m, want = str ?? (lit === undefined ? true : lit === 'blank' ? '' : lit === 'true');
    if (lit === 'blank') { if (op === '==') out[id] = ''; else if (!base[id]) out[id] = 'Picked words'; continue; }
    if (!op) out[id] = true;
    else if (op === '==') out[id] = want;
    else if (base[id] === want) { const s = list.find(y => y.id === id); out[id] = s.options.map(o => o.value).filter(v => v !== want).pop(); }
  }
  if (x.id === 'enable_custom_style') for (const y of list) if (y.type === 'color') out[y.id] = '#13579b';
  if (x.type === 'font_picker' || /_custom$|custom_fonts/.test(x.id)) for (const y of list) if (y.type === 'font_picker') out[y.id] = {family: 'Courier New', fallback_families: 'monospace'};
  return out;
}

async function addFp(page) {
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'backgroundImage', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textTransform', 'textAlign', 'letterSpacing', 'lineHeight', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap', 'flexDirection', 'order', 'alignItems', 'justifyContent', 'borderTopLeftRadius', 'borderBottomRightRadius', 'opacity', 'display', 'gridTemplateColumns', 'transform', 'boxShadow', 'borderTopWidth', 'borderTopColor', 'borderBottomWidth', 'borderBottomColor', 'borderLeftWidth', 'borderLeftColor', 'width', 'height', 'maxWidth', 'fill', 'stroke', 'position', 'visibility'];
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-fb-root]'), out = {}, seen = {};
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
        let k = e.tagName + '.' + (cls.split(' ')[0] || '');
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const p of P) o[p] = cs[p];
        o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
        if (!e.children.length || /^(H\d|P|A|BUTTON|TH|TD)$/.test(e.tagName)) o.text = e.textContent.trim().slice(0, 80);
        for (const a of ['href', 'alt', 'src', 'aria-label', 'd', 'points']) o[a] = a === 'src' ? (e.getAttribute(a) || '').split('?')[0] : e.getAttribute(a);
        o.blk = e.closest('[data-fb-block]')?.dataset.fbBlock || '';
        out[k] = o;
      }
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, paddingTop: w.paddingTop, backgroundColor: w.backgroundColor, blk: ''};
      return out;
    };
  });
}
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaFeaturesB.audit(document.querySelector('#shopify-section-' + u + ' [data-fb-root]')), uid);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const SPACING = '.shopify-section{padding-top:7px;padding-bottom:7px;margin-top:9px;margin-bottom:9px}';

/* Which settings the root names as live (data-fb-spec / data-fb-bspec). */
async function liveIds(t) {
  return t.page.evaluate(() => {
    const r = document.querySelector('[data-fb-root]'), spec = JSON.parse(r.dataset.fbSpec), bspec = JSON.parse(r.dataset.fbBspec);
    const ids = sp => { const out = new Set(['enable_custom_style']); for (const [k, v] of Object.entries(sp)) for (const e of String(v).split(',').filter(Boolean)) { if (k === 'f') e.split(':').forEach(x => out.add(x)); else out.add(e.split(':')[0]); } return [...out]; };
    return {section: ids(spec).concat('color_scheme'), blocks: Object.fromEntries(Object.entries(bspec).map(([k, v]) => [k, ids(v)]))};
  });
}

async function everyControl(browser, cfg, width) {
  const name = cfg.name, {schema} = schemaOf(name);
  const t = await mount(browser, name, {width, editing: true, blocks: cfg.blocks(), assets: [ASSET]});
  await t.page.addStyleTag({content: SPACING}); await addFp(t.page);
  const live = await liveIds(t);
  const base = clone(t.section.settings);
  for (const x of schema.settings) if (x.id && !(x.id in base)) base[x.id] = x.type === 'checkbox' ? false : '';
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header') cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks || []) {
    const i = baseBlocks.findIndex(b => b.type === bt.type);
    for (const x of bt.settings || []) if (x.id && !x.hidden && x.type !== 'header') { assert.ok(i >= 0, name + ': no base block ' + bt.type); cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  }
  let covered = 0;
  for (const c of cases) {
    const {x} = c, key = (c.btype ? c.btype + '.' : '') + x.id;
    if (process.env.FB_ONLY && !process.env.FB_ONLY.split(',').includes(key)) continue;
    let blocks0 = clone(baseBlocks); const S = clone(base);
    const bi = c.scope;
    const bBase = bi >= 0 ? blocks0[bi].settings : S;
    const pre = {...prereq(x, c.list, bBase), ...((cfg.pre || {})[key] || {})};
    if (bi >= 0) Object.assign(blocks0[bi].settings, pre); else Object.assign(S, pre);
    if (cfg.preBlocks && cfg.preBlocks[key]) blocks0 = cfg.preBlocks[key](blocks0);
    const blockId = bi >= 0 ? 'test-b' + bi : undefined;
    const isDesk = (cfg.desk || []).includes(key) || /_desktop$|_desk$/.test(x.id) || /\(desktop/.test(x.label || ''), isMob = (cfg.mob || []).includes(key) || /_mobile$|_mob$/.test(x.id) || /\(mobile/.test(x.label || '');
    const shows = !(cfg.never || []).includes(key) && !(isDesk && width < cfg.bp) && !(isMob && width >= cfg.bp) && !(cfg.wideOnly || []).includes(key) || (cfg.both || []).includes(key);
    const isLive = (bi >= 0 ? live.blocks[c.btype] || [] : live.section).includes(x.id) && !(cfg.structural || []).concat('reset_spacing').includes(key); /* reset_spacing also changes the neighbour sections on the builder's redraw */
    await t.redraw({settings: S, blocks: blocks0}); await frames(t.page);
    const fp0 = await fp(t);
    eq(await audit(t), [], name + ' ' + key + ' base markup matches controller');
    const cur = bi >= 0 ? blocks0[bi].settings[x.id] : S[x.id];
    const seen = [[JSON.stringify(cur ?? null), fp0]];
    for (const v of (cfg.values || {})[key] || valuesFor(x, cur)) {
      const tag = name + ' @' + width + ' ' + key + '=' + JSON.stringify(v).slice(0, 40);
      let fpL = null;
      if (isLive) { await t.emit({[x.id]: v}, blockId); await frames(t.page); fpL = await fp(t); }
      const blocks1 = clone(blocks0); if (bi >= 0) blocks1[bi].settings[x.id] = v;
      await t.redraw({settings: bi >= 0 ? S : {...S, [x.id]: v}, blocks: blocks1}); await frames(t.page);
      const fpR = await fp(t);
      eq(await audit(t), [], tag + ': markup matches controller');
      const dR = diff(fp0, fpR);
      if (shows) {
        if (!dR.length && process.env.FB_DEBUG) console.log(JSON.stringify({S: bi >= 0 ? blocks0[bi].settings : S}).slice(0, 3000));
        const alike = (cfg.same || []).some(([k, a, b]) => k === key && [a, b].includes(cur) && [a, b].includes(v));
        if (!alike) ok(dR.length > 0, tag + ': redraw changes nothing');
        if (bi >= 0 && !alike && !(cfg.blockElsewhere || []).includes(key)) ok(dR.some(k => fpR[k]?.blk === blockId || fp0[k]?.blk === blockId), tag + ': does not change its own block (' + dR.slice(0, 4) + ')');
        if (isLive) {
          const d = diff(fpL, fpR);
          eq(d.map(k => k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(fpL[k] || {}).filter(([p, val]) => JSON.stringify(val) !== JSON.stringify((fpR[k] || {})[p]))))), [], tag + ': live differs from redraw');
        }
        seen.push([JSON.stringify(v), fpR]);
      } else {
        eq(dR, [], tag + ': changes at the wrong width (redraw)');
        if (fpL) eq(diff(fp0, fpL), [], tag + ': changes at the wrong width (live)');
      }
      await t.redraw({settings: S, blocks: blocks0});
    }
    covered++;
    if ((x.type === 'select') && shows) {
      for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
        if ((cfg.same || []).some(([k, a, b]) => k === key && [a, b].includes(JSON.parse(seen[i][0])) && [a, b].includes(JSON.parse(seen[j][0])))) continue;
        ok(diff(seen[i][1], seen[j][1]).length > 0, name + ' ' + key + ': ' + seen[i][0] + ' and ' + seen[j][0] + ' look the same');
      }
    }
  }
  eq(t.errors, [], name + ' @' + width + ' errors');
  await t.page.close();
  return covered;
}

/* Theme inheritance, schemes, custom styling, first paint, overflow. */
async function theme(browser, cfg, width, editing, priority = true) {
  const name = cfg.name, tag = name + ' @' + width + (editing ? ' editor' : ' storefront') + (priority === 'off' ? ' priority off' : '');
  const t = await mount(browser, name, {width, editing, blocks: cfg.blocks(), assets: [], priority});
  await addFp(t.page);
  const before = await fp(t);
  await t.page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', ASSET), 'utf8')});
  await t.page.waitForTimeout(120); await frames(t.page);
  eq(diff(before, await fp(t)), [], tag + ': first paint equals hydrated paint');
  eq(await audit(t), [], tag + ': markup matches controller');
  const R = '[data-fb-root]';
  eq(await t.css(R, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' scheme background');
  eq(await t.css(cfg.heading, 'color'), 'rgb(255, 255, 255)', tag + ' heading colour');
  ok(/^Georgia/.test(await t.css(cfg.heading, 'fontFamily')), tag + ' heading font');
  eq(await t.css(cfg.heading, 'fontWeight'), '700', tag + ' heading weight');
  ok(/^Arial/.test(await t.css(cfg.text, 'fontFamily')), tag + ' body font');
  eq(await t.css(cfg.text, 'color'), 'rgb(204, 204, 204)', tag + ' text colour');
  for (const [sel, prop, want] of cfg.themeProbes || []) eq(await t.css(sel, prop), want, tag + ' theme ' + sel + ' ' + prop);
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  if (editing && priority !== 'off') {
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq(await t.css(R, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme live');
    eq(await t.css(cfg.heading, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await t.css(R, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme redraw');
    eq(await t.css(cfg.heading, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    /* custom styling on: every colour reaches its element, then off restores the theme exactly */
    const {schema} = schemaOf(name), fp0 = await fp(t);
    const colours = Object.fromEntries(schema.settings.filter(x => x.type === 'color' && !x.hidden).map(x => [x.id, '#a1b2c3']));
    await t.emit({enable_custom_style: true, ...colours, ...(cfg.customOn || {})}); await frames(t.page);
    for (const [sel, prop, want] of cfg.customProbes || []) eq(await t.css(sel, prop), want, tag + ' custom ' + sel + ' ' + prop);
    const fpOn = await fp(t);
    ok(diff(fp0, fpOn).length > 0, tag + ' custom styling changes the section');
    const blocksWithColour = (schema.blocks || []).filter(b => (b.settings || []).some(x => x.id === 'enable_custom_style'));
    for (const b of blocksWithColour) { const id = t.blockId(b.type); if (!id) continue; const cols = Object.fromEntries(b.settings.filter(x => x.type === 'color').map(x => [x.id, '#0a0b0c'])); await t.emit({enable_custom_style: true, ...cols}, id); }
    await frames(t.page);
    for (const [type, sel, prop] of cfg.blockColourProbes || []) eq(await t.css(sel, prop), 'rgb(10, 11, 12)', tag + ' block ' + type + ' custom colour ' + sel);
    await t.emit({enable_custom_style: false, ...(cfg.customOff || {})});
    for (const b of blocksWithColour) { const id = t.blockId(b.type); if (id) await t.emit({enable_custom_style: false}, id); }
    await frames(t.page);
    eq(diff(fp0, await fp(t)), [], tag + ': custom styling off restores the theme exactly');
    eq(await audit(t), [], tag + ': markup matches controller after toggles');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

async function lifecycle(browser, cfg) {
  const name = cfg.name;
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const withImg = cfg.imgBlocks ? cfg.imgBlocks(cfg.blocks()) : cfg.blocks();
    const t = await mount(browser, name, {width, editing: true, instances: [{uid: 'a', blocks: withImg}, {uid: 'b', blocks: cfg.blocks()}], assets: [ASSET]});
    await addFp(t.page);
    const b0 = await fp(t, 'b');
    await t.emit({...cfg.edit, enable_custom_style: true}, undefined, 'a');
    const [btype, field, sel] = cfg.textEdit;
    await t.emit({[field]: 'Only in A'}, t.blockId(btype, 0, 'a'), 'a'); await frames(t.page);
    eq(diff(b0, await fp(t, 'b')), [], tag + ': an edit to one instance leaves the other alone');
    eq((await t.page.locator('#shopify-section-a ' + sel).first().textContent()).trim(), 'Only in A', tag + ' text A');
    if (cfg.imgSel) {
      ok(await t.page.locator('#shopify-section-a ' + cfg.imgSel).count() > 0, tag + ' picture drawn');
      await t.page.evaluate(s => { const i = document.querySelector('#shopify-section-a ' + s); i.__mark = 1; i.__src = i.getAttribute('src'); }, cfg.imgSel);
      await t.emit(cfg.unrelated, undefined, 'a'); await frames(t.page);
      ok(await t.page.evaluate(s => { const i = document.querySelector('#shopify-section-a ' + s); return i.__mark === 1 && i.__src === i.getAttribute('src'); }, cfg.imgSel), tag + ': picture element and address kept on unrelated edits');
    }
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
    const count = await t.page.evaluate(() => window.MateriaFeaturesB.count());
    eq(count.roots, 2, tag + ': redraws leave one controller per section');
    eq(count.scrollers, cfg.scrollers * 2, tag + ': redraws leave one scroller runtime per table');
    const blocks = [...withImg, ...cfg.added];
    await t.redraw({uid: 'a', blocks});
    const last = 'a-b' + (blocks.length - 1);
    const [aSel, aField, aText] = cfg.addedCheck;
    eq((await t.page.locator('#shopify-section-a [data-fb-block="' + last + '"]' + aSel).first().textContent()).trim(), aText, tag + ' added block drawn');
    await t.emit({[aField]: 'Edited added'}, last, 'a'); await frames(t.page);
    eq((await t.page.locator('#shopify-section-a [data-fb-block="' + last + '"]' + aSel).first().textContent()).trim(), 'Edited added', tag + ' added block live');
    eq(await audit(t, 'a'), [], tag + ' audit after edits');
    eq(await audit(t, 'b'), [], tag + ' audit b');
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* Tables: scroll inside the frame, focusable region, sticky first column, keyboard, distinct marks. */
async function table(browser, cfg) {
  if (!cfg.table) return;
  const {scroll, label, check, cross, wide} = cfg.table;
  for (const width of [375, 1366]) for (const reducedMotion of ['no-preference', 'reduce']) {
    const tag = cfg.name + ' table @' + width + ' ' + reducedMotion;
    const t = await mount(browser, cfg.name, {width, editing: false, blocks: wide ? wide() : cfg.blocks(), assets: [ASSET], reducedMotion});
    const sc = t.root(scroll).first();
    eq(await sc.getAttribute('tabindex'), '0', tag + ' scroller is focusable');
    eq(await sc.getAttribute('role'), 'region', tag + ' scroller is a region');
    ok(await sc.evaluate(el => (el.getAttribute('aria-label') || (document.getElementById(el.getAttribute('aria-labelledby')) || {}).textContent || '').trim().length > 0), tag + ' region has a name');
    ok(await t.noOverflow(), tag + ' the page does not scroll sideways');
    const m = await sc.evaluate(el => ({sw: el.scrollWidth, cw: el.clientWidth}));
    if (width === 375 && cfg.table.fits) ok(m.sw <= m.cw + 1, tag + ' the table fits a phone without scrolling');
    if (width === 375 && !cfg.table.fits) {
      ok(m.sw > m.cw + 10, tag + ' wide table scrolls inside its frame (' + m.sw + ' > ' + m.cw + ')');
      const x0 = await t.root(label).first().evaluate(el => el.getBoundingClientRect().left);
      await sc.focus();
      await t.page.keyboard.press('ArrowRight'); await t.page.keyboard.press('ArrowRight'); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(400);
      ok(await sc.evaluate(el => el.scrollLeft) > 0, tag + ' arrow keys scroll the table');
      ok(await sc.evaluate(el => el.matches(':focus-visible')), tag + ' focus ring shows');
      const x1 = await t.root(label).first().evaluate(el => el.getBoundingClientRect().left), sl = await sc.evaluate(el => el.scrollLeft), sx = await sc.evaluate(el => el.getBoundingClientRect().left);
      ok(x1 >= sx - 1 && x0 - x1 < Math.min(sl, 24), tag + ' the first column stays in view (moved ' + (x0 - x1) + ' of ' + sl + ')');
      ok(await sc.evaluate(el => el.hasAttribute('data-overflow')), tag + ' overflow state set');
      if (cfg.table.progress) {
        const p = await t.root(cfg.table.progress).first().evaluate(el => +el.style.getPropertyValue('--fb-p'));
        ok(p > 0, tag + ' progress follows the scroll');
      }
      if (reducedMotion === 'no-preference') {
        await sc.evaluate(el => { el.scrollLeft = 0; }); await t.page.waitForTimeout(100);
        const box = await sc.boundingBox();
        await t.page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2); await t.page.mouse.down();
        await t.page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, {steps: 8}); await t.page.mouse.up(); await t.page.waitForTimeout(200);
        ok(await sc.evaluate(el => el.scrollLeft) > 0, tag + ' mouse drag scrolls');
      }
    }
    if (check && cross) {
      const sig = s => t.root(s).first().evaluate(el => { const v = [...el.querySelectorAll('svg, img')].filter(n => n.getBoundingClientRect().width > 0); return v.map(n => n.outerHTML.replace(/\s+/g, ' ')).join('') + '|' + getComputedStyle(el).color + getComputedStyle(el).backgroundColor; });
      const a = await sig(check), b = await sig(cross);
      ok(a !== b && a.length > 3 && b.length > 3, tag + ' check and cross look different');
      const sr = s => t.root(s).first().evaluate(el => [...el.querySelectorAll('.fb-vh')].filter(n => getComputedStyle(n).display !== 'none' && getComputedStyle(n.parentElement).display !== 'none').map(n => n.textContent.trim()).join('|'));
      const ra = await sr(check), rb = await sr(cross);
      ok(ra && rb && ra !== rb, tag + ' check and cross are named for screen readers (' + ra + ' / ' + rb + ')');
    }
    if (cfg.table.highlight) {
      const [on, off] = cfg.table.highlight;
      ok(await t.css(on, 'backgroundColor') !== await t.css(off, 'backgroundColor') || await t.css(on, 'borderTopColor') !== await t.css(off, 'borderTopColor'), tag + ' highlighted column stands out');
    }
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

async function run(CFGS, extra) {
  const only = process.argv.slice(2), list = CFGS.filter(c => !only.length || only.includes(c.name));
  const browser = await launch();
  const covered = {};
  try {
    for (const c of list) { eq(schemaProblems(c.name), [], c.name + ' schema'); for (const s of [schemaOf(c.name).schema.settings, ...(schemaOf(c.name).schema.blocks || []).map(b => b.settings || [])]) { const ids = s.filter(x => x.id).map(x => x.id); eq(new Set(ids).size, ids.length, c.name + ' unique ids'); } }
    const P = (process.env.FB_PHASES || 'theme,life,table,controls,extra').split(',');
    for (const c of list) {
      if (P.includes('theme')) { for (const w of [375, 1366]) for (const e of [true, false]) await theme(browser, c, w, e); await theme(browser, c, 1366, true, 'off'); }
      if (P.includes('life')) await lifecycle(browser, c);
      if (P.includes('table')) await table(browser, c);
      if (P.includes('controls')) for (const w of (process.env.FB_WIDTHS || '375,1366').split(',').map(Number)) covered[c.name] = (covered[c.name] || 0) + await everyControl(browser, c, w);
      if (P.includes('extra') && extra && extra[c.name]) await extra[c.name](browser, {ok, eq, mount, fp, addFp, audit, diff, frames});
    }
    console.log(checks + ' features-b checks passed (controls covered x 2 widths: ' + Object.entries(covered).map(([n, c]) => n + ' ' + c / 2).join(', ') + ')');
  } finally { await browser.close(); }
}

module.exports = {run, IMG, SVG, FONT, presetBlocks, clone, ASSET, get checks() { return checks; }, ok, eq};
