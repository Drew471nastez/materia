/* Round 6, shared helpers for the collection and blog page section tests
   (tests/theme-r6-collection-pages-*.cjs): a sweep of every visible section
   and block setting (a redraw looks different, the same change sent live
   looks like the redraw, the old value sent back restores it), first paint
   against the hydrated paint, two instances, and old-against-new looks of the
   saved instances (the section at commit c098384 against the working file).

   Uses tests/media-fixture.cjs (liquidjs, the real theme-controls priority
   rules, the theme CSS) and shopify/assets/live-collection-pages.js. */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process'), assert = require('assert/strict');
const {launch, mount, render, schemaOf, schemaProblems, themeControls, THEME_VARS} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const ROOT = path.join(__dirname, '..');
const BEFORE = 'c098384';
const CTRL = 'live-collection-pages.js';
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'}, MONO = {family: 'Courier New', fallback_families: 'monospace'};
const counter = {checks: 0};
const ok = (c, m) => { assert.ok(c, m); counter.checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); counter.checks++; };
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const settle = page => page.evaluate(() => document.getAnimations().forEach(a => { if (a instanceof CSSTransition) a.finish(); }));
const diff = (a, b, p = '') => { const o = []; if (JSON.stringify(a) === JSON.stringify(b)) return o; if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o.push(...diff(a[k], b[k], p + '.' + k)); return o; } return [p + ': ' + JSON.stringify(a) + ' / ' + JSON.stringify(b)]; };
const headSchema = name => { try { return JSON.parse(execSync('git show ' + BEFORE + ':sections/' + name + '.storelib', {cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).split('<schema>')[1].split('</schema>')[0]).shopify; } catch (_) { return null; } };

/* Every id at c098384 is still there (section and blocks), the shared problems are none, and the groups come in the shared order. */
function schemaChecks(name, headers) {
  eq(schemaProblems(name), [], name + ': schema problems');
  const s = schemaOf(name).schema, head = headSchema(name);
  if (head) {
    for (const id of head.settings.filter(x => x.id && x.type !== 'header').map(x => x.id)) ok(s.settings.some(x => x.id === id), name + ' kept ' + id);
    for (const b of head.blocks || []) {
      const nb = (s.blocks || []).find(x => x.type === b.type);
      ok(nb, name + ' kept block ' + b.type);
      for (const id of (b.settings || []).filter(x => x.id && x.type !== 'header').map(x => x.id)) ok(nb.settings.some(x => x.id === id), name + ' kept ' + b.type + '.' + id);
    }
  }
  const all = [s.name, ...s.settings.map(x => x.label || x.content || ''), ...(s.blocks || []).flatMap(b => [b.name, ...(b.settings || []).map(x => x.label || x.content || '')])];
  eq(all.filter(l => /^t:/.test(String(l))), [], name + ': no untranslated t: labels');
  const order = ['General', 'Content', 'Layout', 'Media', 'Badge', 'Appearance', 'Buttons', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'];
  const got = s.settings.filter(x => x.type === 'header').map(x => x.content);
  if (headers) eq(got, headers, name + ': groups');
  const idx = got.map(h => order.indexOf(h));
  ok(idx.every(i => i >= 0) && idx.every((v, i) => !i || v > idx[i - 1]), name + ': groups in the shared order ' + JSON.stringify(got));
  for (const x of [...s.settings, ...(s.blocks || []).flatMap(b => b.settings || [])]) if (x.type === 'select' && x.options.length <= 3) ok(x.options.every(o => o.label.split(' ').length <= 3), name + ': ' + x.id + ' button labels are a word or two');
}

function values(x, cur) {
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return ['Edited words'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <em>text</em></p>'];
    case 'textarea': return ['Edited text'];
    case 'font_picker': return [FONT];
    case 'url': return ['/pages/edited'];
    case 'image_picker': return [{src: 'https://theme.test/edited.png', url: 'https://theme.test/edited.png', width: 1600, height: 800, aspect_ratio: 2, alt: 'Edited'}];
    default: return [];
  }
}

/* For each visible setting (section, then each block type present) and each value at 375 and 1366:
   a redraw with the value differs from the base (unless same), a live emit of it looks like that
   redraw (unless structural), and the default sent back looks like the base again.
   opts: {base, globals, blocks, sig(page) -> object, pre: {id: settings}, structural: Set('id' | 'id:value' | 'type.id'),
          same: {375: Set, 1366: Set}, skip: Set, editing} */
async function sweep(browser, name, opts) {
  const {schema} = schemaOf(name), fails = [], only = opts.only || [];
  const base = opts.base || {}, pre = opts.pre || {}, structural = opts.structural || new Set(), same = opts.same || {}, skip = opts.skip || new Set();
  const RESET = Object.fromEntries(schema.settings.filter(x => x.id).map(x => [x.id, x.default]));
  const baseBlocks = opts.blocks || ((schema.presets || [])[0] || {}).blocks || [];
  const bdef = t => Object.fromEntries(((schema.blocks || []).find(b => b.type === t)?.settings || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
  const items = [];
  for (const x of schema.settings) if (x.id && !x.hidden && !/\{\{ false \}\}/.test(x.visible_if || '')) items.push({scope: 'section', x, key: x.id});
  baseBlocks.forEach((b, n) => { if (baseBlocks.findIndex(o => o.type === b.type) !== n) return; for (const x of ((schema.blocks || []).find(t => t.type === b.type)?.settings || [])) if (x.id && !x.hidden && !/\{\{ false \}\}/.test(x.visible_if || '')) items.push({scope: 'block', n, type: b.type, x, key: b.type + '.' + x.id}); });
  for (const width of opts.widths || [375, 1366]) {
    const common = {width, editing: opts.editing !== false, assets: opts.assets || [CTRL], settings: base, blocks: baseBlocks, globals: opts.globals || {}};
    const L = await mount(browser, name, common), R = await mount(browser, name, common);
    for (const it of items) {
      const {x, key} = it;
      if (skip.has(key) || (only.length && !only.includes(key) && !only.includes(x.id))) continue;
      const p = pre[key] || pre[x.id] || {};
      const sp = it.scope === 'section' ? p : (p.section || {}), bp = it.scope === 'block' ? (p.block || p) : {};
      const blocksWith = extra => baseBlocks.map((b, n) => ({type: b.type, settings: {...bdef(b.type), ...(b.settings || {}), ...(it.scope === 'block' && n === it.n ? {...bp, ...extra} : {})}}));
      const cur = it.scope === 'section' ? ({...RESET, ...base, ...sp})[x.id] : ({...bdef(it.type), ...(baseBlocks[it.n].settings || {}), ...bp})[x.id];
      for (const v of (opts.values?.[key] || values(x, cur))) {
        const tag = key + '=' + JSON.stringify(v).slice(0, 30) + '@' + width;
        const isSame = (same[width] || new Set()).has(key) || (same[width] || new Set()).has(key + ':' + v) || (same.all || new Set()).has(key) || (same.all || new Set()).has(key + ':' + v);
        await L.redraw({settings: {...RESET, ...base, ...sp}, blocks: blocksWith({})}); await frames(L.page); await settle(L.page);
        const before = await opts.sig(L.page);
        await R.redraw({settings: {...RESET, ...base, ...sp, ...(it.scope === 'section' ? {[x.id]: v} : {})}, blocks: blocksWith(it.scope === 'block' ? {[x.id]: v} : {})}); await frames(R.page); await settle(R.page);
        const redrawn = await opts.sig(R.page);
        if (!isSame && !diff(before, redrawn).length) fails.push(tag + ': no visible change after a redraw');
        if (isSame && diff(before, redrawn).length && !opts.lenientSame) fails.push(tag + ': listed as no change but changed: ' + diff(before, redrawn).slice(0, 3).join(' | '));
        counter.checks++;
        if (structural.has(key) || structural.has(key + ':' + v) || structural.has(x.id)) continue;
        const blockId = it.scope === 'block' ? L.blockId(it.type, 0) : undefined;
        await L.emit({[x.id]: v}, blockId); await frames(L.page); await settle(L.page); await L.page.waitForTimeout(40);
        const live = await opts.sig(L.page);
        const d = diff(live, redrawn);
        if (d.length) fails.push(tag + ': live differs from redraw: ' + d.slice(0, 4).join(' | '));
        await L.emit({[x.id]: cur ?? (x.type === 'checkbox' ? false : '')}, blockId); await frames(L.page); await settle(L.page); await L.page.waitForTimeout(40);
        const back = await opts.sig(L.page);
        const d2 = diff(back, before);
        if (d2.length) fails.push(tag + ': sending the old value back does not restore: ' + d2.slice(0, 4).join(' | '));
        counter.checks++;
      }
    }
    const errs = L.errors.concat(R.errors);
    if (errs.length) fails.push('errors: ' + errs.slice(0, 3).join(' | '));
    await L.page.close(); await R.page.close();
  }
  if (fails.length) console.log(fails.join('\n'));
  eq(fails, [], name + ': every control live and after a redraw');
}

/* The page as it prints, with and without the controller: the same look. */
async function firstPaint(browser, name, {settings = {}, blocks, globals = {}, sig, label = ''} = {}) {
  for (const width of [375, 1366]) for (const editing of [true, false]) {
    const a = await mount(browser, name, {width, editing, settings, blocks, globals, assets: []}); await settle(a.page); const s1 = await sig(a.page); await a.page.close();
    const b = await mount(browser, name, {width, editing, settings, blocks, globals, assets: [CTRL]}); await frames(b.page); await settle(b.page); const s2 = await sig(b.page);
    eq(diff(s1, s2), [], name + ' first paint equals hydrated ' + label + width + (editing ? ' editor' : ' storefront'));
    ok(await b.noOverflow(), name + ' no sideways scroll ' + label + width);
    eq(b.errors, [], name + ' no errors ' + label + width);
    await b.page.close();
  }
}

/* Two instances on one page: an edit to b leaves a alone; redraws set up once. */
async function twoInstances(browser, name, {settings = {}, blocks, globals = {}, edit, read, blockType}) {
  const t = await mount(browser, name, {width: 1366, assets: [CTRL], globals, instances: [{uid: 'a', settings, blocks}, {uid: 'b', settings, blocks}]});
  const a0 = await read(t, 'a');
  await t.emit(edit, blockType ? t.blockId(blockType, 0, 'b') : undefined, 'b'); await frames(t.page); await settle(t.page);
  const a1 = await read(t, 'a'), b1 = await read(t, 'b');
  eq(a1, a0, name + ': an edit to b leaves a as it was');
  ok(JSON.stringify(b1) !== JSON.stringify(a0), name + ': b took the edit');
  await t.redraw({uid: 'b'}); await t.redraw({uid: 'b'}); await frames(t.page);
  eq(await t.page.evaluate(() => [...window.MateriaCollectionPages.roots.values()].filter(s => s.root.isConnected).length), 2, name + ': redraws set up once');
  eq(await t.page.evaluate(() => window.MateriaCollectionPages.roots.size), 2, name + ': a redrawn root is forgotten');
  eq(t.errors, [], name + ': no errors with two instances');
  await t.page.close();
}

/* Saved instances: the file at c098384 and the working file, with the saved settings (plus the toggles the lead sets), look the same.
   inst: {settings, blocks: [{type, settings}], toggles: {section settings}, blockToggles: {type: settings}} */
async function saved(browser, name, {inst, globals = {}, look, label = '', assets = [], widths = [375, 1366], ref = BEFORE}) {
  let oldRaw; try { oldRaw = execSync('git show ' + ref + ':sections/' + name + '.storelib', {cwd: ROOT, encoding: 'utf8'}); } catch (_) { return; }
  const newRaw = fs.readFileSync(path.join(ROOT, 'sections/' + name + '.storelib'), 'utf8'), controls = await themeControls();
  const fill = (raw, toggles) => {
    const s = JSON.parse(raw.split('<schema>')[1].split('</schema>')[0]).shopify, d = l => Object.fromEntries((l || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
    const blocks = (inst.blocks || []).map((b, i) => ({id: 'B' + i, type: b.type, shopify_attributes: '', settings: {...d((s.blocks || []).find(x => x.type === b.type)?.settings), ...b.settings, ...(toggles ? (inst.blockToggles?.[b.type] || {}) : {})}}));
    return {id: 'S', settings: {...d(s.settings), ...inst.settings, ...(toggles ? inst.toggles || {} : {})}, blocks};
  };
  const html = async (raw, toggles, editing) => { const e = engine(); e.registerFilter('script_tag', () => ''); e.registerFilter('img_url', v => v?.url || v?.src || v || ''); const ctx = {section: fill(raw, toggles), settings: {scroll_animation: 'none'}, request: {design_mode: editing}, routes: {root_url: '/', all_products_collection_url: '/collections/all'}, shop: {name: 'Materia Themes'}, ...globals}; return (await e.parseAndRender(raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, ''), ctx, {globals: ctx})).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, m => /application\/(ld\+)?json/.test(m) ? '' : '').replace(/<link\b[^>]*>/g, ''); };
  for (const editing of [false, true]) for (const width of widths) {
    const view = async (h, js) => {
      const page = await browser.newPage({viewport: {width, height: 900}});
      await page.route('**/*', r => r.request().url() === 'http://theme.test/' ? r.fulfill({body: '<!doctype html><html><head></head><body></body></html>', contentType: 'text/html'}) : r.fulfill({body: ''}));
      await page.goto('http://theme.test/');
      await page.addStyleTag({content: controls}); await page.addStyleTag({content: THEME_VARS});
      for (const f of ['critical.css', 'theme.css', 'theme-button-contract.css', 'animation.css', ...assets.filter(a => a.endsWith('.css'))]) await page.addStyleTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', f), 'utf8')});
      await page.evaluate(h => { const w = document.createElement('div'); w.id = 'shopify-section-S'; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w); }, h);
      for (const f of ['hero-image-one.js', ...js]) await page.addScriptTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', f), 'utf8')});
      await page.waitForTimeout(200);
      await settle(page);
      const r = await look(page);
      await page.close(); return r;
    };
    const before = await view(await html(oldRaw, false, editing), []), after = await view(await html(newRaw, true, editing), [CTRL]);
    const d = diff(before, after);
    if (d.length) console.log(d.join('\n'));
    eq(d, [], name + ' saved ' + label + ' at ' + width + (editing ? ' editor' : ' storefront') + ' looks as it did');
  }
}

module.exports = {launch, mount, render, schemaOf, schemaProblems, themeControls, THEME_VARS, engine, ROOT, BEFORE, CTRL, FONT, MONO, counter, ok, eq, frames, settle, diff, schemaChecks, values, sweep, firstPaint, twoInstances, saved, read: f => fs.readFileSync(path.join(ROOT, f), 'utf8')};
