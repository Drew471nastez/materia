/* Round 7, FAQ category: the two new sections FAQ Search (faq-search) and
   FAQ With Contact Card (faq-contact-card), styled by
   shopify/assets/r7-faq.css and run by shopify/assets/live-r7-faq.js.

   Schema and copy; every non-hidden control of the section and of every
   block (live and after a server redraw, at 375 and 1366, the right width
   only, select options all different, markup equal to what the controller
   derives); theme inheritance, colour schemes, custom styling and fonts on
   and off, first paint equal to hydrated paint (editor and storefront);
   custom fonts, weights, sizes and button shape under the real theme
   priority rules, and off again; the questions (<details>: one open or
   several, keyboard, 44px targets, scripts off, builder block selection, taps
   and a finger swipe on a phone, a right-to-left page);
   the search (words, accents, capitals, extra search words, nothing found,
   the polite count, clear button, Escape and Enter, highlights, 16px field,
   no jump in the list); the contact card (beside the list and sticky on
   desktop, under it on a phone, either side, contact lines that link by
   themselves); two instances, redraws and added blocks; reveal, reduced
   motion; FAQPage structured data from the real blocks.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-faq.cjs [section ...] */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const {launch, mount, render, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const JS = 'live-r7-faq.js', CSS_FILE = 'r7-faq.css', ASSETS = [CSS_FILE, JS];
const NAMES = ['faq-search', 'faq-contact-card'];
const FONT = {family: 'Verdana', fallback_families: 'sans-serif', weight: 400, style: 'normal'}, MONO = {family: 'Courier New', fallback_families: 'monospace', weight: 400, style: 'normal'};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const clone = o => JSON.parse(JSON.stringify(o));
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const STILL = '*,*::before,*::after,*::details-content{transition:none!important}'; /* measure end states, not fades */
const R = '[data-r7f]', H = '.r7f__heading', SUB = '.r7f__subheading', Q = '[data-r7f-question]', A = '[data-r7f-answer]', B = '[data-r7f-btn]';

/* desk / mob: controls with no _desktop / _mobile in their id that act at one width only; bp: where. */
const CFG = {
  'faq-search': {desk: ['padding_top', 'padding_bottom'], mobNoop: ['max_content_width'], bp: {}},
  'faq-contact-card': {desk: ['padding_top', 'padding_bottom', 'card_position', 'card_sticky', 'col_gap'], mobNoop: ['max_content_width'], bp: {card_position: 900, card_sticky: 900, col_gap: 900}},
};
/* not a look: checked on their own below */
const OWN_TEST = ['reveal', 'structured_data'];
const WIDE = ['section_width']; /* the container widths only differ past 1500px */
const PRE = {reset_spacing: {section_margin_top_mobile: 20, section_margin_top_desktop: 20}};
/* a weight that is not the fixture theme's 700 and sizes that are not the defaults, so the switch shows */
const PREB = {'heading.weight_enable': {weight: '400'}, 'heading.size_enable': {size_desktop: 50, size_mobile: 30, line_height: 1.6}, 'subheading.size_enable': {size: 21}, 'subheading.weight_enable': {weight: '700'}, 'button.use_theme_button': {size: 'small', radius: 3}};

function valuesFor(x, cur = x.default) {
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return ['Edited text'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <strong>copy</strong></p>'];
    case 'url': return ['/pages/test'];
    case 'font_picker': return [FONT];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
/* Settings a control's visible_if asks for; all colours for a custom styling toggle; real font objects. */
function prereq(x, list, base) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true)|(-?\d+)))?/g)) {
    const [, id, op, str, lit, n] = m, want = str ?? (n !== undefined ? +n : lit === undefined ? true : lit === 'true');
    if (!op) out[id] = true;
    else if (op === '==') out[id] = want;
    else if (base[id] === want) { const s = list.find(y => y.id === id); out[id] = s.options.map(o => o.value).filter(v => v !== want).pop(); }
  }
  if (x.id === 'enable_custom_style') for (const y of list) if (y.type === 'color') out[y.id] = '#13579b';
  if (list.some(y => y.id === 'heading_font')) Object.assign(out, {heading_font: MONO, body_font: MONO});
  if (list.some(y => y.id === 'font' && y.type === 'font_picker')) out.font = MONO;
  return out;
}

/* A fingerprint of everything a visitor sees of one instance: computed styles, boxes, words and the attributes that carry meaning. */
async function addFp(page) {
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textDecorationLine', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap', 'order', 'alignItems', 'justifySelf', 'borderTopLeftRadius', 'display', 'gridTemplateColumns', 'transform', 'borderTopWidth', 'borderTopColor', 'borderBottomColor', 'width', 'height', 'maxWidth', 'minHeight', 'position', 'top'];
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-r7f]'), out = {}, seen = {};
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.ownerSVGElement || e.tagName === 'STYLE') continue;
        const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
        let k = (e.dataset && e.dataset.r7fBlock) || e.tagName + '.' + (cls.split(' ')[0] || '');
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const q of P) o[q] = cs[q];
        o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
        if (!e.children.length || /^(H\d|P|A|BUTTON|LABEL)$/.test(e.tagName)) o.text = e.textContent.trim().slice(0, 80);
        if (e.matches('[data-r7f-btn]')) for (const v of ['--mb-hover-bg', '--mb-hover-text']) o[v] = cs.getPropertyValue(v).trim();
        o.tag = e.tagName; o.open = !!e.open; o.hidden = e.hidden; o.cls = cls.split(/\s+/).filter(Boolean).sort().join(' ');
        for (const a of ['href', 'aria-expanded', 'data-theme-button', 'data-sl-button', 'data-own-shape', 'data-own-font', 'data-own-weight', 'data-own-size', 'type', 'name', 'placeholder', 'data-count', 'data-empty', 'data-r7f-keys', 'data-state', 'data-full']) o[a] = e.getAttribute(a);
        for (const pse of ['::before', '::after']) { const a = getComputedStyle(e, pse); if (a.content !== 'none') o[pse] = [a.backgroundColor, a.transform, a.opacity].join(); }
        o.blk = e.closest('[data-r7f-block]')?.dataset.r7fBlock || '';
        out[k] = o;
      }
      out.root = {hover: getComputedStyle(root).getPropertyValue('--r7f-hover').trim(), scheme: [...root.classList].filter(c => c.startsWith('color-')).join(), blk: ''};
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, blk: ''};
      return out;
    };
  });
}
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaR7Faq.audit(document.querySelector('#shopify-section-' + u + ' [data-r7f]')), uid);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const detail = (a, b, d) => d.map(k => k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(a[k] || {}).filter(([q, v]) => JSON.stringify(v) !== JSON.stringify((b[k] || {})[q])))));

/* ------------------------------------------------------------ schema and copy */
function schema(name) {
  const {schema: s, raw} = schemaOf(name);
  eq(schemaProblems(name), [], name + ' schema');
  for (const [where, list] of [['section', s.settings], ...s.blocks.map(b => ['block ' + b.type, b.settings])]) { const ids = list.filter(x => x.id).map(x => x.id); eq(new Set(ids).size, ids.length, name + ' ' + where + ' unique ids'); }
  ok(s.name.length <= 25, name + ' name fits the library card');
  const others = fs.readdirSync(path.join(__dirname, '../sections')).filter(f => f.endsWith('.storelib') && f !== name + '.storelib').filter(f => { try { const j = JSON.parse(fs.readFileSync(path.join(__dirname, '../sections', f), 'utf8').split('<schema>')[1].split('</schema>')[0]); return (j.shopify || j).name === s.name; } catch (_) { return false; } });
  eq(others, [], name + ' name is used by no other section');
  eq([s.presets[0].name, s.presets[0].category], [s.name, 'FAQ'], name + ' preset name and category');
  const lines = raw.split('\n');
  eq(lines[0], '<template compat="shopify">', name + ' line 1');
  eq(lines[1], `<script src="{{ '${JS}' | asset_url }}" defer="defer"></script>`, name + ' line 2 links the controller');
  eq(Object.keys(JSON.parse(raw.split('<schema>')[1].split('</schema>')[0])), ['shopify'], name + ' schema holds only the theme schema');
  /* plain ASCII, so the files read the same whatever encoding they are served in */
  for (const f of ['sections/' + name + '.storelib', 'shopify/assets/' + JS, 'shopify/assets/' + CSS_FILE, 'snippets/r7-faq-block.storelib', 'snippets/r7-faq-vars.storelib']) ok(!/[^\x00-\x7F]/.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')), f + ' is plain ASCII');
  /* General first, in the shared order; spacing ids, ranges and defaults as the category uses them */
  eq(s.settings.filter(x => x.id).slice(0, 3).map(x => x.id), ['color_scheme', 'section_width', 'reset_spacing'], name + ' General order');
  for (const [id, d] of [['padding_top', 60], ['padding_bottom', 60], ['padding_top_mobile', 56], ['padding_bottom_mobile', 56], ['section_margin_top_desktop', 0], ['section_margin_bottom_desktop', 0], ['section_margin_top_mobile', 0], ['section_margin_bottom_mobile', 0]]) {
    const x = s.settings.find(y => y.id === id);
    eq([x.type, x.min, x.max, x.step, x.default], ['range', 0, 200, 2, d], name + ' ' + id + ' as the category has it');
  }
  /* words a creator or visitor reads */
  const words = [];
  const walk = (n, k) => { if (typeof n === 'string') { if (['name', 'label', 'info', 'content', 'default', 'question', 'answer', 'text', 'heading', 'keywords'].includes(k)) words.push(n); } else if (Array.isArray(n)) n.forEach(v => walk(v, k)); else if (n && typeof n === 'object') for (const [key, v] of Object.entries(n)) walk(v, key); };
  walk(s);
  const bad = words.filter(w => /\u2014|\u2013|\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(w));
  eq(bad, [], name + ' copy: no em dash and none of the banned words');
  ok(!words.some(w => /\d+\s?%|\$\s?\d|\d+\s?(reviews|customers|orders)/i.test(w)), name + ' copy: no invented number, price or count');
}

/* ------------------------------------------------------------ every control */
async function everyControl(browser, name, width) {
  const cfg = CFG[name], {schema: sc} = schemaOf(name);
  const t = await mount(browser, name, {width, editing: true, blocks: presetBlocks(name), assets: ASSETS});
  await addFp(t.page);
  await t.page.addStyleTag({content: STILL});
  const base = clone(t.section.settings);
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  const cases = [];
  for (const x of sc.settings) if (x.id && !x.hidden && x.type !== 'header' && !OWN_TEST.includes(x.id)) cases.push({scope: -1, x, list: sc.settings});
  for (const bt of sc.blocks || []) {
    const i = baseBlocks.findIndex(b => b.type === bt.type);
    for (const x of bt.settings || []) if (x.id && !x.hidden && x.type !== 'header') { assert.ok(i >= 0, name + ': no preset block ' + bt.type); cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  }
  const covered = new Set();
  for (const c of cases) {
    const {x} = c, key = (c.btype ? c.btype + '.' : '') + x.id, vw = WIDE.includes(x.id) ? 1700 : 0;
    if (vw && width !== 1366) continue;
    if (vw) await t.page.setViewportSize({width: vw, height: 900});
    const W = vw || width;
    const blocks0 = clone(baseBlocks), S = clone(base);
    const bi = c.scope;
    const bBase = bi >= 0 ? blocks0[bi].settings : S;
    Object.assign(bBase, prereq(x, c.list, bBase), bi < 0 ? PRE[x.id] || {} : PREB[key] || {});
    const blockId = bi >= 0 ? 'test-b' + bi : undefined;
    const bp = cfg.bp[x.id] || 768;
    const isDesk = bi < 0 && cfg.desk.includes(x.id) || /_desktop$/.test(x.id), isMob = /_mobile$/.test(x.id);
    const shows = !(isDesk && W < bp) && !(isMob && W >= bp);
    /* a width cap wider than a phone: nothing to see at 375 (checked at 1366) */
    if (cfg.mobNoop.includes(key) && W < 768) continue;
    await t.redraw({settings: S, blocks: blocks0});
    const fp0 = await fp(t);
    eq(await audit(t), [], name + ' ' + key + ' base markup matches controller');
    const cur = bBase[x.id];
    const seen = [[JSON.stringify(cur ?? null), fp0]];
    for (const v of valuesFor(x, cur)) {
      const tag = name + ' @' + W + ' ' + key + '=' + JSON.stringify(v).slice(0, 40);
      await t.redraw({settings: S, blocks: blocks0});
      await t.emit({[x.id]: v}, blockId); await frames(t.page);
      const fpL = await fp(t);
      const blocks1 = clone(blocks0); if (bi >= 0) blocks1[bi].settings[x.id] = v;
      await t.redraw({settings: bi >= 0 ? S : {...S, [x.id]: v}, blocks: blocks1});
      const fpR = await fp(t);
      eq(await audit(t), [], tag + ': markup matches controller');
      const dR = diff(fp0, fpR), dL = diff(fp0, fpL);
      if (shows) {
        ok(dR.length > 0, tag + ': redraw changes nothing');
        if (bi >= 0) ok(dR.some(k => fpR[k]?.blk === blockId || fp0[k]?.blk === blockId), tag + ': does not change its own block (' + dR.slice(0, 4) + ')');
        if (bi < 0 && /^section_margin/.test(x.id)) ok(dR.includes('wrap'), tag + ': margin not on the section');
        eq(detail(fpL, fpR, diff(fpL, fpR)), [], tag + ': live differs from redraw');
        seen.push([JSON.stringify(v), fpR]);
      } else {
        eq(dR, [], tag + ': changes at the wrong width (redraw)');
        eq(dL, [], tag + ': changes at the wrong width (live)');
      }
      covered.add(key);
    }
    if (x.type === 'select' && shows) for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) ok(diff(seen[i][1], seen[j][1]).length > 0, name + ' @' + W + ' ' + key + ': ' + seen[i][0] + ' and ' + seen[j][0] + ' look the same');
    if (vw) await t.page.setViewportSize({width, height: 900});
  }
  eq(t.errors, [], name + ' @' + width + ' errors');
  await t.page.close();
  return covered.size;
}

/* ------------------------------------------------------------ theme first */
async function theme(browser, name, width, editing) {
  const tag = name + ' @' + width + (editing ? ' editor' : ' storefront'), card = name === 'faq-contact-card';
  const blocks = presetBlocks(name);
  if (card) blocks.find(b => b.type === 'contact_line').settings.text = 'help@materia.test';
  const t = await mount(browser, name, {width, editing, blocks, assets: [CSS_FILE]});
  await addFp(t.page);
  const before = await fp(t);
  await t.page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', JS), 'utf8')});
  await t.page.waitForTimeout(150); await frames(t.page);
  eq(detail(await fp(t), before, diff(before, await fp(t))), [], tag + ': first paint equals hydrated paint');
  if (editing) eq(await audit(t), [], tag + ': markup matches controller');
  eq(await t.css(R, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' scheme background');
  eq(await t.css(H, 'color'), 'rgb(255, 255, 255)', tag + ' heading colour');
  ok(/^Georgia/.test(await t.css(H, 'fontFamily')), tag + ' heading font');
  eq(await t.css(H, 'fontWeight'), '700', tag + ' heading weight');
  eq(await t.root(H).evaluate(el => el.tagName), 'H2', tag + ' the section heading is an h2');
  eq(await t.css(SUB, 'color'), 'rgb(204, 204, 204)', tag + ' subheading colour');
  ok(/^Arial/.test(await t.css(SUB + ' p', 'fontFamily')), tag + ' subheading font');
  eq(await t.css(Q, 'color'), 'rgb(255, 255, 255)', tag + ' question colour');
  ok(/^Georgia/.test(await t.css(Q, 'fontFamily')), tag + ' question font');
  eq(await t.root(Q).first().evaluate(el => [el.tagName, el.parentElement.tagName, el.closest('details') !== null]), ['H3', 'SUMMARY', true], tag + ' a question is an h3 in the summary of a details');
  eq(await t.css(A + ' p', 'color'), 'rgb(204, 204, 204)', tag + ' answer colour');
  ok(/^Arial/.test(await t.css(A + ' p', 'fontFamily')), tag + ' answer font');
  eq(await t.css('.r7f__item', 'borderBottomColor'), 'rgb(68, 85, 102)', tag + ' dividers in the scheme border colour');
  for (const b of await t.root('.r7f__summary').all()) ok((await b.boundingBox()).height >= 44, tag + ' question target 44px');
  if (!card) {
    const I = '[data-r7f-input]';
    eq(await t.css(I, 'color'), 'rgb(204, 204, 204)', tag + ' field text in the scheme colour');
    eq(await t.css(I, 'borderTopColor'), 'rgb(68, 85, 102)', tag + ' field border in the scheme colour');
    ok(/^Arial/.test(await t.css(I, 'fontFamily')), tag + ' field font');
    ok(parseFloat(await t.css(I, 'fontSize')) >= 16, tag + ' field text at least 16px (no zoom on a phone)');
    ok((await t.root(I).boundingBox()).height >= 44, tag + ' field target 44px');
    eq(await t.root(I).evaluate(el => [el.type, el.labels.length, el.labels[0].textContent.trim(), el.placeholder, el.getAttribute('autocomplete')]), ['search', 1, 'Search the questions', 'Search the questions', 'off'], tag + ' field has its label');
    ok(await t.root('[data-r7f-clear]').evaluate(el => el.hidden && !!el.getAttribute('aria-label') && el.type === 'button'), tag + ' clear button waits, labelled');
  } else {
    eq(await t.css('.r7f__card-heading', 'color'), 'rgb(255, 255, 255)', tag + ' card heading colour');
    ok(/^Georgia/.test(await t.css('.r7f__card-heading', 'fontFamily')), tag + ' card heading font');
    eq(await t.root('.r7f__card-heading').evaluate(el => el.tagName), 'H3', tag + ' the card heading is an h3');
    eq(await t.css('.r7f__card-body p', 'color'), 'rgb(204, 204, 204)', tag + ' card text colour');
    ok(/^Arial/.test(await t.css('.r7f__card-body p', 'fontFamily')), tag + ' card text font');
    eq(await t.css('.r7f__card', 'borderTopLeftRadius'), '6px', tag + ' card corners follow the theme card radius');
    eq(await t.css(B, 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' button colour');
    eq(await t.css(B, 'borderTopLeftRadius'), '12px', tag + ' button radius');
    ok(/^Arial/.test(await t.css(B, 'fontFamily')), tag + ' button font');
    eq(await t.root(B).evaluate(el => [el.tagName, el.getAttribute('href'), el.dataset.themeButton, el.hasAttribute('data-sl-button')]), ['A', '/pages/contact', 'primary', true], tag + ' button links to the contact page on the theme contract');
    await t.root(B).first().hover(); await t.page.waitForTimeout(40);
    eq(await t.root(B).first().evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(255, 0, 0)', tag + ' button hover');
    await t.page.mouse.move(0, 0);
    ok((await t.root(B).first().boundingBox()).height >= 44, tag + ' button target');
    /* a linked contact line keeps its height and takes the tap 44px tall */
    const link = t.root('a.r7f__line-value').first();
    await link.scrollIntoViewIfNeeded();
    ok(await link.evaluate(el => { const b = el.getBoundingClientRect(), x = b.x + Math.min(b.width / 2, 20), cy = b.y + b.height / 2; return [cy - 21, cy + 21].every(y => el.contains(document.elementFromPoint(x, y))); }), tag + ' contact link target 44px');
    await t.page.evaluate(() => scrollTo(0, 0));
  }
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  if (editing) {
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq(await t.css(R, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme live');
    eq(await t.css(H, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading live');
    eq(await t.css(A + ' p', 'color'), 'rgb(51, 51, 51)', tag + ' alt scheme answer live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await t.css(R, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme redraw');
    eq(await t.css(H, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    const hid = t.blockId('heading'), sid = t.blockId('subheading'), bid = t.blockId('button');
    await t.emit({enable_custom_style: true, section_bg: '#abcdef', question_color: '#110000', answer_color: '#001100', icon_color: '#000011', divider_color: '#112233', field_bg: '#fefefe', field_border_color: '#010203', field_text_color: '#040506', card_bg: '#eeeeee', card_border_color: '#0a0b0c', card_heading_color: '#221100', card_text_color: '#002211'});
    await t.emit({enable_custom_style: true, color: '#cc0033'}, hid);
    await t.emit({enable_custom_style: true, color: '#0033cc'}, sid);
    if (card) await t.emit({enable_custom_style: true, bg_color: '#00ff00', text_color: '#000000', bg_color_hover: '#0000ff'}, bid);
    await frames(t.page);
    eq(await t.css(R, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background');
    eq(await t.css(H, 'color'), 'rgb(204, 0, 51)', tag + ' custom heading');
    eq(await t.css(SUB, 'color'), 'rgb(0, 51, 204)', tag + ' custom subheading');
    eq(await t.css(SUB + ' p', 'color'), 'rgb(0, 51, 204)', tag + ' custom subheading paragraph');
    eq(await t.css(Q, 'color'), 'rgb(17, 0, 0)', tag + ' custom question');
    eq(await t.css(A + ' p', 'color'), 'rgb(0, 17, 0)', tag + ' custom answer');
    eq(await t.css('.r7f__icon', 'color'), 'rgb(0, 0, 17)', tag + ' custom icon');
    eq([await t.css('.r7f__item', 'borderBottomColor'), await t.css('.r7f__list', 'borderTopColor')], ['rgb(17, 34, 51)', 'rgb(17, 34, 51)'], tag + ' custom divider');
    if (!card) eq([await t.css('[data-r7f-input]', 'backgroundColor'), await t.css('[data-r7f-input]', 'borderTopColor'), await t.css('[data-r7f-input]', 'color'), await t.css('.r7f__search-icon', 'color')], ['rgb(254, 254, 254)', 'rgb(1, 2, 3)', 'rgb(4, 5, 6)', 'rgb(4, 5, 6)'], tag + ' custom field colours');
    else {
      eq([await t.css('.r7f__card', 'backgroundColor'), await t.css('.r7f__card', 'borderTopColor'), await t.css('.r7f__card-heading', 'color'), await t.css('.r7f__card-body p', 'color'), await t.css('.r7f__line-label', 'color'), await t.css('.r7f__line-value', 'color')], ['rgb(238, 238, 238)', 'rgb(10, 11, 12)', 'rgb(34, 17, 0)', 'rgb(0, 34, 17)', 'rgb(0, 34, 17)', 'rgb(34, 17, 0)'], tag + ' custom card colours');
      eq(await t.css(B, 'backgroundColor'), 'rgb(0, 255, 0)', tag + ' custom button');
      await t.root(B).first().hover(); await t.page.waitForTimeout(40);
      eq(await t.root(B).first().evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(0, 0, 255)', tag + ' custom button hover');
      await t.page.mouse.move(0, 0);
    }
    await t.emit({enable_custom_fonts: true, heading_font: FONT, body_font: MONO}); await frames(t.page);
    ok(/^Verdana/.test(await t.css(H, 'fontFamily')), tag + ' custom heading font');
    ok(/^Verdana/.test(await t.css(Q, 'fontFamily')), tag + ' custom question font');
    ok(/^"?Courier New/.test(await t.css(A + ' p', 'fontFamily')), tag + ' custom answer font');
    ok(/^"?Courier New/.test(await t.css(SUB + ' p', 'fontFamily')), tag + ' custom subheading font');
    /* the same through a redraw */
    await t.redraw({settings: {enable_custom_style: true, section_bg: '#abcdef', enable_custom_fonts: true, heading_font: FONT, body_font: MONO}});
    eq(await t.css(R, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background redraw');
    ok(/^"?Courier New/.test(await t.css(A + ' p', 'fontFamily')), tag + ' custom answer font redraw');
    await t.redraw({settings: {enable_custom_style: false, enable_custom_fonts: false}});
    await t.emit({enable_custom_style: false}, hid); await t.emit({enable_custom_style: false}, sid);
    if (card) await t.emit({enable_custom_style: false}, bid);
    await frames(t.page);
    const back = await fp(t), d = diff(before, back).filter(k => k !== 'wrap');
    eq(detail(back, before, d), [], tag + ': toggles off restore the theme exactly');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

/* ------------------------------------------------------------ the real theme priority rules */
function priorityCases(name) {
  const card = name === 'faq-contact-card', D = w => w >= 768;
  const blocks = presetBlocks(name).map(b => b.type === 'heading' ? {...b, settings: {...(b.settings || {}), text: 'Questions <strong>answered</strong>'}} : b);
  const HS = H + ' strong', SP = SUB + ' p', AP = A + ' p', cases = [];
  const sec = {label: 'section custom fonts', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily'], ['sp', SP, 'fontFamily'], ['ap', AP, 'fontFamily'], ['q', Q, 'fontFamily']],
    on: {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/, sp: /Courier New/, ap: /Courier New/, q: /Verdana/}, attrs: [[H, 'data-own-font'], [A, 'data-own-font'], [Q, 'data-own-font'], [SUB, 'data-own-font']]};
  if (card) { sec.probes.push(['ch', '.r7f__card-heading', 'fontFamily'], ['cp', '.r7f__card-body p', 'fontFamily'], ['lv', '.r7f__line-value', 'fontFamily']); Object.assign(sec.want, {ch: /Verdana/, cp: /Courier New/, lv: /Courier New/}); sec.attrs.push(['.r7f__card-heading', 'data-own-font'], ['.r7f__card-body', 'data-own-font']); }
  else { sec.probes.push(['in', '[data-r7f-input]', 'fontFamily'], ['st', '[data-r7f-status]', 'fontFamily']); Object.assign(sec.want, {in: /Courier New/, st: /Courier New/}); }
  cases.push(sec);
  cases.push({block: 'heading', label: 'heading custom font', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily']], on: {enable_custom_fonts: true, font: FONT}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/}, attrs: [[H, 'data-own-font']]});
  cases.push({block: 'heading', label: 'heading custom weight', probes: [['w', H, 'fontWeight'], ['ws', HS, 'fontWeight']], on: {weight_enable: true, weight: '300'}, off: {weight_enable: false}, want: {w: '300'}, attrs: [[H, 'data-own-weight']]});
  cases.push({block: 'heading', label: 'heading custom size', probes: [['fs', H, 'fontSize'], ['lh', H, 'lh'], ['ls', H, 'letterSpacing'], ['lss', HS, 'letterSpacing']], on: {size_enable: true, size_desktop: 61, size_mobile: 21, line_height: 1.7, tracking: 2}, off: {size_enable: false},
    want: {fs: w => D(w) ? '61px' : '21px', lh: '1.70', ls: '2px', lss: '2px'}, attrs: [[H, 'data-own-size']]});
  cases.push({block: 'subheading', label: 'subheading custom font', probes: [['sp', SP, 'fontFamily']], on: {enable_custom_fonts: true, font: MONO}, off: {enable_custom_fonts: false}, want: {sp: /Courier New/}, attrs: [[SUB, 'data-own-font']]});
  cases.push({block: 'subheading', label: 'subheading custom weight', probes: [['w', SP, 'fontWeight']], on: {weight_enable: true, weight: '700'}, off: {weight_enable: false}, want: {w: '700'}, attrs: [[SUB, 'data-own-weight']]});
  cases.push({block: 'subheading', label: 'subheading custom size', probes: [['fs', SP, 'fontSize'], ['lh', SP, 'lh']], on: {size_enable: true, size: 23, line_height: 2}, off: {size_enable: false}, want: {fs: '23px', lh: '2.00'}, attrs: [[SUB, 'data-own-size']]});
  cases.push({label: 'question weight', probes: [['w', Q, 'fontWeight']], on: {enable_custom_question_weight: true, question_weight: '400'}, off: {enable_custom_question_weight: false}, want: {w: '400'}, attrs: [[Q, 'data-own-weight']]});
  if (card) {
    cases.push({block: 'button', label: 'button own shape', probes: [['pl', B, 'paddingLeft'], ['pt', B, 'paddingTop'], ['r', B, 'borderTopLeftRadius'], ['fs', B, 'fontSize']], on: {use_theme_button: false, size: 'small', radius: 21}, off: {use_theme_button: true}, want: {pl: '18px', pt: '10px', r: '21px', fs: '13px'}, attrs: [[B, 'data-own-shape']]});
    cases.push({block: 'button', label: 'button own shape, large', probes: [['pl', B, 'paddingLeft'], ['pt', B, 'paddingTop'], ['r', B, 'borderTopLeftRadius']], on: {use_theme_button: false, size: 'large', radius: 3}, off: {use_theme_button: true}, want: {pl: '32px', pt: '16px', r: '3px'}, attrs: [[B, 'data-own-shape']]});
  }
  return cases.map(c => ({...c, name, blocks}));
}
async function probe(t, probes) {
  await frames(t.page);
  return t.page.evaluate(list => Object.fromEntries(list.map(([label, sel, prop]) => {
    const el = document.querySelector('#shopify-section-test ' + sel); if (!el) return [label, 'missing ' + sel];
    const cs = getComputedStyle(el);
    return [label, prop === 'lh' ? (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2) : cs[prop]];
  })), probes);
}
const has = (t, list) => t.page.evaluate(l => l.map(([sel, a]) => { const el = document.querySelector('#shopify-section-test ' + sel); return !!el && el.hasAttribute(a); }), list);
async function priority(browser, c, width, editing) {
  const t = await mount(browser, c.name, {width, editing, assets: ASSETS, blocks: clone(c.blocks)});
  const block = c.block ? t.blockId(c.block) : undefined;
  const redraw = s => c.block ? t.redraw({blocks: t.rendered[0].section.blocks.map(b => ({type: b.type, settings: b.id === block ? {...b.settings, ...s} : b.settings}))}) : t.redraw({settings: s});
  const tag = `${c.name} ${c.label} @${width} ${editing ? 'editor' : 'store'}`;
  await redraw(c.off);
  const base = await probe(t, c.probes);
  ok(!(await has(t, c.attrs)).some(Boolean), tag + ' no opt-out attribute while off');
  const on = async how => {
    const now = await probe(t, c.probes);
    for (const [label, w] of Object.entries(c.want)) {
      const want = typeof w === 'function' ? w(width) : w;
      if (want instanceof RegExp) ok(want.test(now[label]), `${tag} ${how} ${label}: ${now[label]}`); else eq(now[label], want, `${tag} ${how} ${label}`);
      ok(now[label] !== base[label], `${tag} ${how} ${label} differs from the theme value ${base[label]}`);
    }
    eq(await has(t, c.attrs), c.attrs.map(() => true), tag + ' ' + how + ' opt-out attributes');
  };
  const off = async how => { eq(await probe(t, c.probes), base, `${tag} ${how} theme values back`); ok(!(await has(t, c.attrs)).some(Boolean), tag + ' ' + how + ' attributes removed'); };
  /* emit() draws the section again on a visitor's page, which carries no settings JSON */
  await t.emit(c.on, block); await on('live on');
  await t.emit(c.off, block); await off('live off');
  await redraw(c.on); await on('redraw on');
  await t.emit(c.off, block); await off('redraw on, live off');
  await t.emit(c.on, block); await on('redraw on, live off, live on');
  await redraw(c.off); await off('redraw off');
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}
/* With both priorities off the theme still sets the defaults. */
async function priorityOff(browser, name) {
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: true, assets: ASSETS, priority: 'off'});
    await frames(t.page);
    const tag = name + ' priority off @' + width;
    ok(/^Georgia/.test(await t.css(H, 'fontFamily')), tag + ' heading font');
    eq(await t.css(H, 'fontWeight'), '700', tag + ' heading weight');
    ok(/^Georgia/.test(await t.css(Q, 'fontFamily')), tag + ' question font');
    ok(/^Arial/.test(await t.css(A + ' p', 'fontFamily')), tag + ' answer font');
    eq(await t.css(R, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' background');
    if (name === 'faq-contact-card') eq(await t.css(B, 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' button colour');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* ------------------------------------------------------------ the questions */
async function questions(browser, name) {
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const t = await mount(browser, name, {width, editing: true, instances: [{uid: 'a', blocks: presetBlocks(name)}, {uid: 'b', blocks: presetBlocks(name)}], assets: ASSETS});
    await addFp(t.page); await frames(t.page);
    const b0 = await fp(t, 'b');
    await t.emit({enable_custom_style: true, section_bg: '#abcdef', padding_top: 12, padding_top_mobile: 12}, undefined, 'a');
    await t.emit({text: 'Only in A'}, t.blockId('heading', 0, 'a'), 'a'); await frames(t.page);
    eq(diff(b0, await fp(t, 'b')), [], tag + ': an edit to one instance leaves the other alone');
    eq(await t.page.locator('#shopify-section-a ' + H).textContent(), 'Only in A', tag + ' heading A live');
    eq(await t.page.locator('#shopify-section-a ' + R).evaluate(el => getComputedStyle(el).paddingTop), '12px', tag + ' padding A live');
    const items = t.page.locator('#shopify-section-a [data-r7f-item]');
    const state = () => items.evaluateAll(els => els.map(e => e.open));
    const sum = n => items.nth(n).locator('summary');
    await sum(0).click(); await t.page.waitForTimeout(60);
    eq((await state())[0], true, tag + ' click opens');
    eq(await t.page.locator('#shopify-section-b [data-r7f-item]').evaluateAll(els => els.some(e => e.open)), false, tag + ' the other instance stays closed');
    await sum(1).click(); await t.page.waitForTimeout(60);
    eq((await state()).slice(0, 2), [false, true], tag + ' one open at a time');
    await t.emit({allow_multiple_open: true}, undefined, 'a'); await frames(t.page);
    await sum(0).click(); await t.page.waitForTimeout(60);
    eq((await state()).slice(0, 2), [true, true], tag + ' several open once allowed (live)');
    await t.emit({allow_multiple_open: false}, undefined, 'a'); await frames(t.page);
    eq((await state()).filter(Boolean).length, 1, tag + ' one open again once several are not allowed (live)');
    /* an open question stays open through an unrelated edit, live */
    const open = await state();
    await t.emit({item_padding_y: 30, question_size_desktop: 20, question_size_mobile: 17}, undefined, 'a'); await frames(t.page);
    eq(await state(), open, tag + ' an open question stays open through an unrelated edit');
    await t.emit({first_item_open: true}, undefined, 'a'); await frames(t.page);
    eq((await state())[0], true, tag + ' Open the first question, live');
    await t.emit({first_item_open: false}, undefined, 'a'); await frames(t.page);
    eq((await state())[0], false, tag + ' Open the first question off, live');
    /* keyboard */
    for (let i = 0; i < 3; i++) if ((await state())[i]) await sum(i).click();
    await sum(1).focus(); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(60);
    eq((await state())[1], true, tag + ' Enter opens');
    await t.page.keyboard.press('Space'); await t.page.waitForTimeout(60);
    eq((await state())[1], false, tag + ' Space closes');
    await t.page.keyboard.press('Tab'); await t.page.keyboard.press('Shift+Tab');
    eq(await sum(1).evaluate(el => [el === document.activeElement, getComputedStyle(el).outlineStyle, parseFloat(getComputedStyle(el).outlineWidth) >= 2]), [true, 'solid', true], tag + ' focus ring on the question');
    /* the answer grows with the browser's own details animation; a closed answer is out of the tab order */
    ok(/block-size|height/.test(await items.nth(1).evaluate(el => getComputedStyle(el, '::details-content').transitionProperty)), tag + ' the answer row transitions');
    await t.emit({answer: '<p>See <a href="/pages/x">the page</a></p>'}, await items.nth(2).getAttribute('data-r7f-block'), 'a'); await frames(t.page);
    await sum(1).focus(); await t.page.keyboard.press('Tab');
    eq(await t.page.evaluate(() => document.activeElement.closest('[data-r7f-item]') === document.querySelectorAll('#shopify-section-a [data-r7f-item]')[2] && document.activeElement.tagName), 'SUMMARY', tag + ' a link in a closed answer is skipped by Tab');
    /* the builder selects a block */
    const last = items.last(), lastId = await last.getAttribute('data-r7f-block');
    await t.page.evaluate(id => document.querySelector('[data-r7f-block="' + id + '"]').dispatchEvent(new CustomEvent('shopify:block:select', {bubbles: true, detail: {blockId: id, sectionId: 'a'}})), lastId);
    await t.page.waitForTimeout(60);
    eq(await last.evaluate(e => e.open), true, tag + ' block select opens the question');
    await t.page.evaluate(id => document.dispatchEvent(new CustomEvent('shopify:block:select', {detail: {blockId: id}})), await items.first().getAttribute('data-r7f-block'));
    await t.page.waitForTimeout(60);
    eq(await items.first().evaluate(e => e.open), true, tag + ' block select by id opens');
    /* redraws: one controller entry per root; a click still toggles once */
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
    eq(await t.page.evaluate(() => window.MateriaR7Faq.roots.size), 2, tag + ': redraws leave one controller per section');
    const it = t.page.locator('#shopify-section-a [data-r7f-item]').nth(1), was = await it.evaluate(e => e.open);
    await it.locator('summary').click(); await t.page.waitForTimeout(60);
    eq(await it.evaluate(e => e.open), !was, tag + ': one click toggles once after redraws');
    /* an added question block is drawn and live */
    const nb = [...presetBlocks(name), {type: 'faq_item', settings: {question: 'Added question', answer: '<p>Added</p>'}}];
    await t.redraw({uid: 'a', blocks: nb});
    const added = 'a-b' + (nb.length - 1);
    eq(await t.page.locator('[data-r7f-block="' + added + '"] ' + Q).textContent(), 'Added question', tag + ' added block drawn');
    await t.emit({question: 'Edited added'}, added, 'a'); await frames(t.page);
    eq(await t.page.locator('[data-r7f-block="' + added + '"] ' + Q).textContent(), 'Edited added', tag + ' added block live');
    eq(await audit(t, 'a'), [], tag + ' audit after edits');
    /* a question left empty shows the theme's own placeholder words, live and drawn */
    await t.emit({question: ''}, added, 'a'); await frames(t.page);
    ok((await t.page.locator('[data-r7f-block="' + added + '"] ' + Q).textContent()).trim().length > 0, tag + ' an empty question keeps placeholder words');
    eq(await audit(t, 'a'), [], tag + ' audit with an empty question');
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
  /* no blocks, one block, long words: tidy and inside the page */
  for (const [label, blocks] of [['no blocks', []], ['one question', [{type: 'faq_item', settings: {question: 'Only question', answer: '<p>Only answer</p>'}}]], ['long words', presetBlocks(name).map(b => b.type === 'faq_item' ? {...b, settings: {question: 'Averyveryverylongwordthatcannotbreakanywhereonaphonescreenwithoutwrapping and more words after it?', answer: '<p>https://materia.test/a/very/long/address/that/has/no/spaces/at/all/and/keeps/going/for/a/while</p>'}} : b.type === 'contact_line' ? {...b, settings: {label: 'Email', text: 'averyveryverylongmailboxnameforsupport@averylongdomainnameforastore.test'}} : b)]]) {
    const t = await mount(browser, name, {width: 375, editing: true, blocks, settings: {first_item_open: true}, assets: ASSETS});
    ok(await t.noOverflow(), name + ' ' + label + ': no sideways scroll at 375');
    eq(await t.root(R).evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, name + ' ' + label + ': nothing wider than the section');
    eq(t.errors, [], name + ' ' + label + ' errors');
    if (!blocks.length) eq(await t.root('[data-r7f-input], .r7f__list, .r7f__card, .r7f__header').count(), 0, name + ' no blocks: no empty field, list, card or header');
    await t.page.close();
  }
}

/* The questions with scripts off (a library card, a visitor without scripts): they still open, one at a time. */
async function scriptsOff(browser, name) {
  const r = await render(name, {editing: false, blocks: presetBlocks(name)});
  const ctx = await browser.newContext({javaScriptEnabled: false, viewport: {width: 375, height: 800}});
  const page = await ctx.newPage();
  await page.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><html><head><style>:root{--color-background:#fff;--color-heading:#111;--color-text:#333;--color-border:#ccc;--color-primary:#06c}body{margin:0}' + fs.readFileSync(path.join(__dirname, '../shopify/assets', CSS_FILE), 'utf8') + '</style></head><body><div id="shopify-section-x" class="shopify-section">' + r.html + '</div></body></html>'}));
  await page.goto('http://theme.test/');
  const items = page.locator('[data-r7f-item]');
  ok(await page.locator(H).isVisible() && await items.first().isVisible(), name + ' scripts off: heading and questions are drawn');
  await items.nth(0).locator('summary').click();
  eq(await items.evaluateAll(els => els.map(e => e.open)).then(a => a.slice(0, 2)), [true, false], name + ' scripts off: a question opens');
  await page.waitForTimeout(450); /* the answer grows for 320ms */
  ok(await items.nth(0).locator(A).isVisible() && (await items.nth(0).locator(A).boundingBox()).height > 20, name + ' scripts off: its answer shows');
  await items.nth(1).locator('summary').click();
  eq(await items.evaluateAll(els => els.map(e => e.open)).then(a => a.slice(0, 2)), [false, true], name + ' scripts off: one open at a time');
  if (name === 'faq-search') ok(await page.locator('[data-r7f-input]').isVisible() && await page.locator('[data-r7f-clear]').isHidden(), name + ' scripts off: the field is drawn, the clear button is not');
  await ctx.close();
}

/* A phone: taps open a question and work the search; a finger swipe that starts on the section scrolls the page. */
async function touch(browser, name) {
  const many = [...presetBlocks(name), ...Array.from({length: 12}, (_, i) => ({type: 'faq_item', settings: {question: 'Extra question ' + (i + 1) + '?', answer: '<p>Extra answer.</p>'}}))];
  const r = await render(name, {editing: false, blocks: many});
  const ctx = await browser.newContext({viewport: {width: 375, height: 667}, hasTouch: true, isMobile: true, deviceScaleFactor: 2});
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const read = f => fs.readFileSync(path.join(__dirname, '../shopify/assets', f), 'utf8');
  await page.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{--color-background:#fff;--color-heading:#111;--color-text:#333;--color-border:#ccc;--color-primary:#06c}html{font-size:62.5%}body{margin:0;font:16px Arial}' + read('theme-button-contract.css') + read(CSS_FILE) + '</style></head><body><div id="shopify-section-x" class="shopify-section">' + r.html + '</div><script>' + read(JS) + '</script></body></html>'}));
  await page.goto('http://theme.test/');
  const items = page.locator('[data-r7f-item]');
  await items.nth(1).locator('summary').tap();
  eq(await items.nth(1).evaluate(e => e.open), true, name + ' touch: a tap opens a question');
  await items.nth(1).locator('summary').tap();
  eq(await items.nth(1).evaluate(e => e.open), false, name + ' touch: a tap closes it');
  if (name === 'faq-search') {
    await page.locator('[data-r7f-input]').tap(); await page.keyboard.type('Retúrn');
    eq(await items.evaluateAll(els => els.filter(e => !e.hidden).length), 1, name + ' touch: typing filters the list');
    eq(await page.evaluate(() => visualViewport.scale), 1, name + ' touch: the page is not zoomed by the field');
    await page.locator('[data-r7f-clear]').tap();
    eq([await page.locator('[data-r7f-input]').inputValue(), await items.evaluateAll(els => els.filter(e => !e.hidden).length)], ['', many.filter(b => b.type === 'faq_item').length], name + ' touch: a tap on the clear button empties the field');
    await page.locator('[data-r7f-input]').blur();
  }
  /* a swipe up that starts on a question scrolls the page (nothing takes the gesture) */
  const box = await items.nth(3).boundingBox();
  const cdp = await ctx.newCDPSession(page);
  const y0 = await page.evaluate(() => scrollY);
  const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x, y}]});
  for (let d = 10; d <= 260; d += 10) { await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x, y: y - d}]}); await page.waitForTimeout(8); }
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => scrollY) - y0 >= 200, name + ' touch: a swipe on the list scrolls the page');
  eq(await items.nth(3).evaluate(e => e.open), false, name + ' touch: the swipe does not open the question under the finger');
  eq(await page.evaluate(() => [scrollX, document.documentElement.scrollWidth <= innerWidth + 1]), [0, true], name + ' touch: no sideways scroll');
  eq(errors, [], name + ' touch errors');
  await ctx.close();
}

/* A right-to-left page: the sides follow the reading direction and nothing leaves the page. */
async function rtl(browser, name) {
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: true, settings: {content_alignment: 'left', first_item_open: true}, assets: ASSETS});
    await t.page.evaluate(() => { document.documentElement.dir = 'rtl'; }); await frames(t.page);
    const tag = name + ' rtl @' + width, mid = async sel => { const b = await t.root(sel).first().boundingBox(); return b.x + b.width / 2; };
    ok(await t.noOverflow(), tag + ' no sideways scroll');
    eq(await t.css(H, 'textAlign'), 'start', tag + ' the header starts at the reading side');
    ok(await mid('.r7f__icon') < await mid(Q), tag + ' the icon sits after the question');
    if (name === 'faq-search') {
      await t.root('[data-r7f-input]').fill('order'); await frames(t.page);
      ok(await mid('.r7f__search-icon') > await mid('[data-r7f-input]') && await mid('[data-r7f-clear]') < await mid('[data-r7f-input]'), tag + ' the field icons swap sides');
    } else if (width === 1366) ok(await mid('.r7f__card') < await mid('.r7f__list'), tag + ' the card on the right in the settings sits at the end side');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* ------------------------------------------------------------ the search */
async function search(browser, width, editing) {
  const name = 'faq-search', tag = name + ' search @' + width + (editing ? ' editor' : ' storefront');
  const blocks = [...presetBlocks(name),
    {type: 'faq_item', settings: {question: 'Où est ma commande ?', answer: '<p>Livraison à <strong>Évora</strong> en deux jours ouvrés.</p>', keywords: ''}},
    {type: 'faq_item', settings: {question: 'Entrega em Sao Paulo', answer: '<p>Sim.</p>', keywords: 'frete'}}];
  const t = await mount(browser, name, {width, editing, instances: [{uid: 'a', blocks}, {uid: 'b', blocks: presetBlocks(name)}], assets: ASSETS});
  const S = '#shopify-section-a ', input = t.page.locator(S + '[data-r7f-input]'), status = t.page.locator(S + '[data-r7f-status]'), live = t.page.locator(S + '[data-r7f-live]'), clear = t.page.locator(S + '[data-r7f-clear]'), list = t.page.locator(S + '[data-r7f-list]');
  const shown = () => t.page.locator(S + '[data-r7f-item]').evaluateAll(els => els.filter(e => !e.hidden && e.offsetParent !== null).map(e => e.querySelector('[data-r7f-question]').textContent.trim()));
  const type = async v => { await input.fill(v); await frames(t.page); };
  const total = blocks.filter(b => b.type === 'faq_item').length;
  eq((await shown()).length, total, tag + ' every question shown before typing');
  eq([await status.textContent(), await status.getAttribute('aria-hidden'), await live.getAttribute('role'), await live.getAttribute('aria-live'), await live.textContent()], ['', 'true', 'status', 'polite', ''], tag + ' count line empty, live region polite');
  const listTop = (await list.boundingBox()).y;
  /* a word of a question */
  await type('return');
  eq(await shown(), ['Can I return an item?'], tag + ' a word in a question');
  eq(await status.textContent(), 'Showing 1 of ' + total + ' questions', tag + ' count line');
  eq((await list.boundingBox()).y, listTop, tag + ' the list does not move when the count appears');
  eq(await live.textContent(), '', tag + ' the live region waits for a pause');
  await t.page.waitForTimeout(520);
  eq(await live.textContent(), 'Showing 1 of ' + total + ' questions', tag + ' the count is read out after a pause');
  /* a word of an answer, capitals */
  await type('TRACKING LINK');
  eq(await shown(), ['When will my order ship?'], tag + ' words of an answer, capitals aside');
  /* extra search words */
  await type('refund');
  eq(await shown(), ['Can I return an item?'], tag + ' an extra search word');
  ok(!(await t.page.locator(S + '.r7f__list').textContent()).includes('refund'), tag + ' extra search words are not shown');
  /* every word must match, in any order */
  await type('email placed');
  eq(await shown(), ['How do I place an order?'], tag + ' every word typed must be there');
  /* accents, both ways */
  await type('ou evora');
  eq(await shown(), ['Où est ma commande ?'], tag + ' text with accents, typed without');
  await type('SÃO');
  eq(await shown(), ['Entrega em Sao Paulo'], tag + ' text without accents, typed with');
  /* the matching words are tinted (CSS Custom Highlight), accents kept */
  await type('evora');
  eq(await t.page.evaluate(() => [...CSS.highlights.get('r7f-match')].map(r => r.toString())), ['Évora'], tag + ' the match is highlighted as written');
  /* nothing found */
  await type('zzzz');
  eq(await shown(), [], tag + ' nothing found: no question left');
  eq([await status.textContent(), await status.getAttribute('data-state'), await list.isHidden()], ['No questions match your search. Try another word.', 'empty', true], tag + ' nothing found line from the setting');
  eq(await t.page.evaluate(() => CSS.highlights.get('r7f-match').size), 0, tag + ' no highlight left');
  await t.page.waitForTimeout(520);
  eq(await live.textContent(), 'No questions match your search. Try another word.', tag + ' nothing found is read out');
  ok(await t.noOverflow(), tag + ' no sideways scroll with nothing found');
  /* the other instance is not searched */
  eq(await t.page.locator('#shopify-section-b [data-r7f-item]').evaluateAll(els => els.filter(e => !e.hidden).length), 5, tag + ' the other instance keeps its questions');
  /* a theme with small body text still gives the field 16px, so a phone or tablet does not zoom the page */
  await t.page.addStyleTag({content: ':root{--body-font-size:13px}'});
  eq([await input.evaluate(el => getComputedStyle(el).fontSize), await t.page.locator(S + A + ' p').first().evaluate(el => parseFloat(getComputedStyle(el.closest('.shopify-section')).fontSize))], ['16px', 13], tag + ' the field stays at 16px under a 13px theme');
  /* clear button */
  eq(await clear.isVisible(), true, tag + ' clear button shows once there is text');
  const cb = await clear.boundingBox(), ib = await input.boundingBox();
  ok(cb.width >= 44 && cb.height >= 44 && cb.x >= ib.x && cb.x + cb.width <= ib.x + ib.width + 1, tag + ' clear button is 44px, inside the field');
  await clear.click(); await frames(t.page);
  eq([await input.inputValue(), (await shown()).length, await status.textContent(), await clear.isHidden(), await list.isVisible(), await input.evaluate(el => el === document.activeElement)], ['', total, '', true, true, true], tag + ' clear empties the field, shows every question and keeps the focus');
  /* Escape and Enter */
  await type('pay'); await input.press('Escape'); await frames(t.page);
  eq([await input.inputValue(), (await shown()).length], ['', total], tag + ' Escape empties the field');
  await type('contact'); await input.press('Enter');
  eq(await t.page.evaluate(() => { const a = document.activeElement; return a.tagName === 'SUMMARY' && !a.parentElement.hidden && a.textContent.trim(); }), 'How do I contact you?', tag + ' Enter moves to the first question left');
  /* typing never moves the page sideways or traps the scroll */
  eq(await t.page.evaluate(() => { let n = 0; for (const el of document.querySelectorAll('[data-r7f] *')) { const c = getComputedStyle(el); if (c.touchAction === 'none' || c.overscrollBehaviorY === 'none') n++; } return n; }), 0, tag + ' nothing takes the touch scroll');
  if (editing) {
    /* a typed search and an open question stay through an unrelated live edit; the words follow their settings live */
    await type('order');
    const before = await shown();
    await t.page.locator(S + '[data-r7f-item]:not([hidden]) summary').first().click();
    await t.emit({padding_top: 20, padding_top_mobile: 20, item_padding_y: 12}, undefined, 'a'); await frames(t.page);
    eq([await input.inputValue(), await shown(), await t.page.locator(S + '[data-r7f-item][open]').count()], ['order', before, 1], tag + ' a typed search and an open question stay through an unrelated edit');
    await t.emit({count_text: '[count] / [total] found'}, undefined, 'a'); await frames(t.page);
    eq(await status.textContent(), before.length + ' / ' + total + ' found', tag + ' count words live');
    await t.emit({search_label: 'Find an answer'}, undefined, 'a'); await frames(t.page);
    eq(await input.evaluate(el => [el.placeholder, el.labels[0].textContent]), ['Find an answer', 'Find an answer'], tag + ' field text live');
    await type('zzzz'); await t.emit({empty_text: 'Nothing here'}, undefined, 'a'); await frames(t.page);
    eq(await status.textContent(), 'Nothing here', tag + ' nothing found words live');
    /* a question edited live is found by its new words, and by new extra search words */
    const first = t.blockId('faq_item', 0, 'a');
    await t.emit({question: 'Do you sell gift cards?'}, first, 'a'); await frames(t.page);
    await type('gift'); eq(await shown(), ['Do you sell gift cards?'], tag + ' an edited question is found by its new words');
    await t.emit({keywords: 'voucher'}, first, 'a'); await frames(t.page);
    await type('voucher'); eq(await shown(), ['Do you sell gift cards?'], tag + ' new extra search words are found');
    /* the builder picks a question the search hides: the search is cleared and the question opens */
    await type('zzzz');
    await t.page.evaluate(id => document.dispatchEvent(new CustomEvent('shopify:block:select', {detail: {blockId: id}})), t.blockId('faq_item', 3, 'a')); await frames(t.page);
    eq([await input.inputValue(), (await shown()).length, await t.page.locator('[data-r7f-block="' + t.blockId('faq_item', 3, 'a') + '"]').evaluate(e => e.open)], ['', total, true], tag + ' selecting a hidden question clears the search and opens it');
    /* a redraw starts clean, with one set of listeners */
    await type('order'); await t.redraw({uid: 'a'});
    eq([await input.inputValue(), (await shown()).length, await t.page.evaluate(() => CSS.highlights.get('r7f-match').size)], ['', total, 0], tag + ' a redraw starts clean');
    await type('return'); eq(await shown(), ['Can I return an item?'], tag + ' the search works after a redraw');
    eq(await audit(t, 'a'), [], tag + ' audit');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

/* ------------------------------------------------------------ the contact card */
async function contactCard(browser) {
  const name = 'faq-contact-card';
  const many = n => [...presetBlocks(name).filter(b => b.type !== 'faq_item'), ...Array.from({length: n}, (_, i) => ({type: 'faq_item', settings: {question: 'Question number ' + (i + 1) + '?', answer: '<p>Answer ' + (i + 1) + '</p>'}}))];
  for (const editing of [true, false]) {
    const mode = editing ? ' editor' : ' storefront';
    /* desktop: beside the list, sticky */
    let t = await mount(browser, name, {width: 1366, height: 700, editing, blocks: many(24), assets: ASSETS});
    const box = sel => t.root(sel).first().boundingBox();
    let l = await box('.r7f__list'), c = await box('.r7f__card');
    ok(c.x >= l.x + l.width + 55 && Math.abs(c.y - l.y) <= 1, name + mode + ' @1366 the card sits beside the list, a column gap away');
    ok(c.width >= 300 && c.width <= 400 && l.width > c.width * 1.5, name + mode + ' @1366 the list is the wide column');
    eq([await t.css('.r7f__card', 'position'), await t.css('.r7f__card', 'top')], ['sticky', '24px'], name + mode + ' @1366 the card is sticky');
    await t.page.evaluate(() => scrollTo(0, 700)); await frames(t.page);
    c = await box('.r7f__card');
    ok(Math.abs(c.y - 24) <= 1, name + mode + ' @1366 the card stays in view while the list scrolls (' + c.y + ')');
    await t.page.evaluate(() => document.documentElement.setAttribute('data-header-stuck', '')); await frames(t.page);
    ok(Math.abs((await box('.r7f__card')).y - 88) <= 1, name + mode + ' @1366 the card stays under a header that stays on screen');
    await t.page.evaluate(() => { document.documentElement.removeAttribute('data-header-stuck'); scrollTo(0, 100000); }); await frames(t.page);
    const lb = await box('.r7f__list'); c = await box('.r7f__card');
    ok(c.y + c.height <= lb.y + lb.height + 1, name + mode + ' @1366 the card stops with the list');
    await t.page.evaluate(() => scrollTo(0, 0));
    await t.emit({card_sticky: false}); await frames(t.page);
    eq(await t.css('.r7f__card', 'position'), 'static', name + mode + ' @1366 Keep the card in view off');
    await t.emit({card_position: 'left'}); await frames(t.page);
    l = await box('.r7f__list'); c = await box('.r7f__card');
    ok(c.x + c.width <= l.x && Math.abs(c.y - l.y) <= 1, name + mode + ' @1366 the card on the left');
    eq(await t.root(R).evaluate(el => { const a = el.querySelector('.r7f__list'), b = el.querySelector('.r7f__card'); return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); }), true, name + mode + ' the questions come first in the page for a screen reader');
    eq(t.errors, [], name + mode + ' @1366 errors');
    await t.page.close();
    /* phone: under the list, not sticky, full width */
    t = await mount(browser, name, {width: 375, editing, blocks: many(6), settings: {card_position: 'left'}, assets: ASSETS});
    l = await t.root('.r7f__list').boundingBox(); c = await t.root('.r7f__card').boundingBox();
    ok(c.y >= l.y + l.height && Math.abs(c.x - l.x) <= 1 && Math.abs(c.width - l.width) <= 1, name + mode + ' @375 the card sits under the list, as wide');
    eq(await t.css('.r7f__card', 'position'), 'static', name + mode + ' @375 the card does not stick');
    ok(await t.noOverflow(), name + mode + ' @375 no sideways scroll');
    eq(t.errors, [], name + mode + ' @375 errors');
    await t.page.close();
  }
  /* contact lines: a link of their own, or the text when it is an email address or a phone number */
  const line = (text, link) => ({type: 'contact_line', settings: {label: 'Line', text, ...(link ? {link} : {})}});
  const LINES = [['help@materia.test', '', 'A', 'mailto:help@materia.test'], ['+351 912 345 678', '', 'A', 'tel:+351912345678'], ['(021) 555-0100', '', 'A', 'tel:0215550100'], ['Monday to Friday, 9 to 17', '', 'SPAN', null], ['Chat with us', '/pages/chat', 'A', '/pages/chat'], ['help@materia.test', '/pages/contact', 'A', '/pages/contact'], ['Room 12', '', 'SPAN', null], ['write to help@materia.test', '', 'SPAN', null]];
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: true, blocks: [...presetBlocks(name).filter(b => b.type !== 'contact_line'), ...LINES.map(([text, link]) => line(text, link))], assets: ASSETS});
    const read = () => t.root('[data-r7f-line-value]').evaluateAll(els => els.map(e => [e.textContent, e.tagName, e.getAttribute('href')]));
    eq(await read(), LINES.map(([text, , tagName, href]) => [text, tagName, href]), name + ' @' + width + ' contact lines link by themselves');
    eq(await audit(t), [], name + ' @' + width + ' contact lines match the controller');
    /* the same live, on one line: text to email to phone to words, then its own link */
    const id = t.blockId('contact_line', 3), sel = '[data-r7f-block="' + id + '"] [data-r7f-line-value]';
    const one = () => t.page.locator(sel).evaluate(e => [e.textContent, e.tagName, e.getAttribute('href')]);
    await t.emit({text: 'care@materia.test'}, id); await frames(t.page);
    eq(await one(), ['care@materia.test', 'A', 'mailto:care@materia.test'], name + ' @' + width + ' a typed email links, live');
    await t.emit({text: '0800 123 456'}, id); await frames(t.page);
    eq(await one(), ['0800 123 456', 'A', 'tel:0800123456'], name + ' @' + width + ' a typed phone number links, live');
    await t.emit({text: 'Every day'}, id); await frames(t.page);
    eq(await one(), ['Every day', 'SPAN', null], name + ' @' + width + ' plain words do not link, live');
    await t.emit({link: '/pages/hours'}, id); await frames(t.page);
    eq(await one(), ['Every day', 'A', '/pages/hours'], name + ' @' + width + ' its own link, live');
    await t.emit({text: '', label: ''}, id); await frames(t.page);
    eq(await t.page.locator('[data-r7f-block="' + id + '"]').isHidden(), true, name + ' @' + width + ' an empty line is not drawn');
    eq(await audit(t), [], name + ' @' + width + ' audit after line edits');
    /* button: a link when it has one, a button when not; Link style leaves the contract */
    const bid = t.blockId('button');
    await t.emit({link: ''}, bid); await frames(t.page);
    eq(await t.root(B).evaluate(e => [e.tagName, e.getAttribute('type'), e.getAttribute('href')]), ['BUTTON', 'button', null], name + ' @' + width + ' a button with no link is a button');
    await t.emit({link: '/pages/contact', style: 'text'}, bid); await frames(t.page);
    eq(await t.root(B).evaluate(e => [e.tagName, e.hasAttribute('data-theme-button'), getComputedStyle(e).textDecorationLine, getComputedStyle(e).backgroundColor]), ['A', false, 'underline', 'rgba(0, 0, 0, 0)'], name + ' @' + width + ' Link style is a plain underlined link');
    ok((await t.root(B).boundingBox()).height >= 44, name + ' @' + width + ' Link style target 44px');
    /* card text: an empty heading or text is not drawn */
    const cid = t.blockId('card_text');
    await t.emit({heading: ''}, cid); await frames(t.page);
    eq([await t.root('.r7f__card-heading').isHidden(), await t.root('.r7f__card-body').isVisible()], [true, true], name + ' @' + width + ' an empty card heading is not drawn');
    eq(t.errors, [], name + ' @' + width + ' card errors');
    await t.page.close();
  }
  /* without card blocks the list takes the width; without questions the card stands alone */
  let t = await mount(browser, name, {width: 1366, editing: true, blocks: presetBlocks(name).filter(b => !['card_text', 'button', 'contact_line'].includes(b.type)), assets: ASSETS});
  eq([await t.root('.r7f__card').count(), await t.root('.r7f__grid').getAttribute('data-r7f-cols')], [0, '1'], name + ' no card blocks: no card');
  ok(Math.abs((await t.root('.r7f__list').boundingBox()).width - (await t.root('.r7f__col').boundingBox()).width) <= 1, name + ' no card blocks: the list takes the width');
  await t.page.close();
  t = await mount(browser, name, {width: 1366, editing: true, blocks: presetBlocks(name).filter(b => b.type !== 'faq_item'), assets: ASSETS});
  eq([await t.root('.r7f__list').count(), await t.root('.r7f__card').count()], [0, 1], name + ' no questions: the card alone');
  eq(t.errors, [], name + ' card alone errors');
  await t.page.close();
}

/* ------------------------------------------------------------ reveal, reduced motion */
async function motion(browser, name) {
  const on = await render(name, {editing: false, theme: {scroll_animation: 'fade-in'}, settings: {reveal: true}});
  const off = await render(name, {editing: false, theme: {scroll_animation: 'fade-in'}, settings: {reveal: false}});
  ok(on.scripts.some(s => s.includes("classList.add('scroll-trigger'")) && !on.html.includes('data-ti-no-reveal'), name + ' Reveal on scroll: follows the theme reveal');
  ok(!off.scripts.some(s => s.includes('scroll-trigger')) && off.html.includes('data-ti-no-reveal'), name + ' Reveal on scroll off: no theme reveal');
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const t = await mount(browser, name, {width: 375, editing: true, theme: {scroll_animation: 'fade-in'}, settings: {reveal: true, first_item_open: true}, assets: ASSETS, reducedMotion});
    await t.page.waitForTimeout(200);
    ok(await t.root(R).evaluate(el => { for (let n = el; n; n = n.parentElement) if (+getComputedStyle(n).opacity < 1 || getComputedStyle(n).visibility === 'hidden') return false; return true; }), name + ' ' + reducedMotion + ': never hidden in the builder');
    ok(await t.root(A).first().isVisible(), name + ' ' + reducedMotion + ': the open answer is visible');
    if (reducedMotion === 'reduce') {
      const dur = await t.root('.r7f__item').first().evaluate(el => [getComputedStyle(el, '::details-content').transitionDuration, getComputedStyle(el.querySelector('.r7f__q')).transitionDuration, getComputedStyle(el.querySelector('.r7f__plus'), '::after').transitionDuration]);
      ok(dur.every(d => /^0s(, 0s)*$/.test(d)), name + ' reduced motion: nothing transitions (' + dur + ')');
    } else {
      const ms = await t.root('.r7f__item').first().evaluate(el => Math.max(...getComputedStyle(el, '::details-content').transitionDuration.split(',').map(parseFloat)) * 1000);
      ok(ms >= 150 && ms <= 400, name + ' the answer opens in 150 to 400ms (' + ms + ')');
    }
    eq(t.errors, [], name + ' motion errors');
    await t.page.close();
  }
}

/* ------------------------------------------------------------ FAQPage structured data */
async function structured(name) {
  const {schema: sc} = schemaOf(name), raw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8');
  const def = list => Object.fromEntries((list || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
  const draw = async (settings, blocks) => {
    const e = engine(); e.registerFilter('script_tag', () => '');
    const section = {id: 'ld', settings: {...def(sc.settings), ...settings}, blocks: blocks.map((b, i) => ({id: 'ld' + i, type: b.type, settings: {...def(sc.blocks.find(x => x.type === b.type).settings), ...(b.settings || {})}}))};
    const ctx = {section, settings: {scroll_animation: 'none'}, request: {design_mode: false}};
    return e.parseAndRender(raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, ''), ctx, {globals: ctx});
  };
  const blocks = [...presetBlocks(name), {type: 'faq_item', settings: {question: 'Is the "quote" kept?', answer: '<p>Yes, with a </script> inside & more.</p>'}}, {type: 'faq_item', settings: {question: '', answer: '<p>No question</p>'}}];
  ok(!(await draw({}, blocks)).includes('application/ld+json'), name + ' structured data off by default');
  const html = await draw({structured_data: true}, blocks);
  const m = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  ok(m, name + ' structured data printed when on');
  const data = JSON.parse(m[1]);
  const want = blocks.filter(b => b.type === 'faq_item').map(b => ({...def(sc.blocks.find(x => x.type === 'faq_item').settings), ...b.settings})).filter(s => s.question && s.answer);
  eq([data['@context'], data['@type']], ['https://schema.org', 'FAQPage'], name + ' FAQPage');
  eq(data.mainEntity.map(q => [q['@type'], q.name, q.acceptedAnswer['@type'], q.acceptedAnswer.text]), want.map(s => ['Question', s.question.replace(/<[^>]*>/g, '').trim(), 'Answer', s.answer.replace(/<[^>]*>/g, '').trim()]), name + ' one Question per real block, with its answer');
  ok(!/<\/script>[\s\S]*<\/script>/.test(m[0].slice(0, -9)), name + ' an answer cannot close the script');
  ok(!JSON.stringify(data).includes('refund'), name + ' extra search words stay out of the structured data');
  /* a visitor's page carries no settings JSON */
  ok(!/data-r7f-settings|data-r7f-bs/.test(html), name + ' no settings JSON on a visitor\'s page');
}

(async () => {
  const only = process.argv.slice(2), names = NAMES.filter(n => !only.length || only.includes(n));
  /* PART=controls,search ... runs some of the parts (for a quick look while changing a section) */
  const parts = (process.env.PART || '').split(',').filter(Boolean), part = p => !parts.length || parts.includes(p);
  const browser = await launch();
  try {
    for (const n of names) schema(n);
    if (part('structured')) for (const n of names) await structured(n);
    const covered = {};
    if (part('controls')) await Promise.all(names.map(async n => { for (const w of [375, 1366]) covered[n] = await everyControl(browser, n, w); }));
    if (part('theme')) await Promise.all(names.map(async n => { for (const w of [375, 1366]) for (const e of [true, false]) await theme(browser, n, w, e); }));
    if (part('priority')) await Promise.all(names.map(async n => { for (const c of priorityCases(n)) for (const w of [375, 1366]) for (const e of [true, false]) await priority(browser, c, w, e); await priorityOff(browser, n); }));
    if (part('questions')) await Promise.all(names.map(n => questions(browser, n)));
    if (part('off')) for (const n of names) await scriptsOff(browser, n);
    if (part('touch')) for (const n of names) await touch(browser, n);
    if (part('rtl')) for (const n of names) await rtl(browser, n);
    if (part('motion')) for (const n of names) await motion(browser, n);
    if (part('search') && names.includes('faq-search')) for (const w of [375, 1366]) for (const e of [true, false]) await search(browser, w, e);
    if (part('card') && names.includes('faq-contact-card')) await contactCard(browser);
    console.log(checks + ' round 7 FAQ checks passed (controls covered: ' + Object.entries(covered).map(([n, c]) => n + ' ' + c).join(', ') + ')');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
