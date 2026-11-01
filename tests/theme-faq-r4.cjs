/* Round 4, FAQ category: FAQ 1 (faq1), FAQ 2 (faq5), FAQ 3 (faq), FAQ 4
   (faq-pro), FAQ 5 (faq-floating), FAQ 6 (faq-side-image) and FAQ Tabs
   (faq-tabs), run by shopify/assets/live-faq.js.

   Schema; every non-hidden control (live and after a server redraw, at 375
   and 1366, the right width only, select options all different, markup
   equal to what the controller derives); theme inheritance, colour schemes,
   custom styling and fonts on and off, first paint equal to hydrated paint
   (editor and storefront); questions (one open or several, keyboard, 44px
   targets, smooth row transition, builder block selection, tabs); two
   instances, redraws and added blocks; the section reveal and reduced
   motion; FAQPage structured data from the real blocks; the saved FAQ 4 and
   FAQ Tabs instances against the sections as they were (HEAD) with the
   toggles the lead sets. Priority (custom type and button shape over the
   theme's priority rules): tests/theme-faq-r4-priority.cjs.

   LIQUIDJS=<path to liquidjs> node tests/theme-faq-r4.cjs [section ...] */
const fs = require('fs'), path = require('path'), {execSync} = require('child_process'), assert = require('assert/strict');
const {launch, mount, render, schemaOf, schemaProblems, THEME_VARS} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const ASSET = 'live-faq.js';
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'}, MONO = {family: 'Courier New', fallback_families: 'monospace'};
let checks = 0, savedCompared = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const clone = o => JSON.parse(JSON.stringify(o));
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

const FAM = {desk: ['col_gap', 'image_position'], mobNoop: ['max_content_width']};
const CFG = {
  faq: {p: 'faq6', ...FAM},
  faq1: {p: 'faq1', ...FAM},
  faq5: {p: 'faq5', ...FAM},
  'faq-pro': {p: 'faq7', ...FAM, assets: ['faq-pro.css']},
  'faq-side-image': {p: 'fsi', desk: ['image_position'], mob: ['show_image_on_mobile'], mobNoop: ['max_width'], same: {375: [['auto', '4_5']]}},
  'faq-tabs': {p: 'fqt', sub: '.fqt__sub', desk: ['gap_subheading_tabs', 'reset_spacing'], vw: {section_max_width_tablet: 900}, vals: {section_max_width_mobile: [300]}, mobNoop: ['subheading.max_width'],
    structural: ['tab_4_label', 'tab_5_label', 'faq_item.tab'], same: {375: [['all', 'mobile']], 1366: [['all', 'desktop']], 1700: [['stretch_width', 'full_width']]}},
  'faq-floating': {p: 'ffq', desk: ['card_overlap'], mob: ['mobile_layout'], mobNoop: ['max_width'], vals: {card_max_width: [220], image_width: [200]}},
};
const assetsOf = n => [...(CFG[n].assets || []), ASSET];
/* not a look: checked on their own below */
const OWN_TEST = ['reveal', 'scroll_animation', 'structured_data', 'allow_multiple_open'];
const STRUCTURAL = ['reset_spacing']; /* the neighbour's spacing follows on the builder's redraw */
const WIDE = ['section_width'];
/* a margin to remove, so Remove space between sections shows */
/* a weight that is not the fixture theme's 700, so the switch shows */
const PREB = {'heading.weight_enable': {weight: '400'}, 'heading.size_enable': {size_desktop: 50, size_mobile: 30, line_height: 1.6}, 'subheading.size_enable': {size: 21}};
const PRE = {reset_spacing: {section_margin_top_mobile: 20, section_margin_top_desktop: 20, section_margin_top: 20}, show_dividers: {enable_custom_style: true, divider_color: '#ee1122'}}; /* fluid and full width only differ past 1500px */

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
    case 'image_picker': return [IMG];
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

async function addFp(page) {
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textDecorationLine', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap', 'order', 'alignItems', 'justifySelf', 'borderTopLeftRadius', 'aspectRatio', 'objectFit', 'display', 'gridTemplateColumns', 'gridTemplateRows', 'transform', 'boxShadow', 'borderTopWidth', 'borderTopColor', 'borderBottomColor', 'width', 'height', 'maxWidth', 'minHeight'];
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-faq-root]'), out = {}, seen = {}, p = root.className.split(' ')[0];
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.closest('template') || e.ownerSVGElement || e.tagName === 'STYLE') continue;
        const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
        let k = (e.dataset && e.dataset.faqBlock) || e.tagName + '.' + (cls.split(' ')[0] || '');
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const q of P) o[q] = cs[q];
        o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
        if (!e.children.length || /^(H\d|P|A|BUTTON|LABEL)$/.test(e.tagName)) o.text = e.textContent.trim().slice(0, 80);
        if (e.matches('[data-faq-btn]')) for (const v of ['--mb-hover-bg', '--mb-hover-text']) o[v] = cs.getPropertyValue(v).trim();
        o.tag = e.tagName; o.open = e.hasAttribute('open'); o.hidden = e.hidden;
        for (const a of ['href', 'alt', 'aria-expanded', 'data-theme-button', 'type']) o[a] = e.getAttribute(a);
        if (e.tagName === 'IMG') o.src = (e.getAttribute('src') || '').split('?')[0];
        if (/__icon$/.test(cls.split(' ')[0] || '')) o.sig = e.innerHTML.replace(/\s+/g, ' ');
        for (const pse of ['::before', '::after']) { const a = getComputedStyle(e, pse); if (a.content !== 'none') o[pse] = [a.backgroundColor, a.transform].join(); }
        o.blk = e.closest('[data-faq-block]')?.dataset.faqBlock || '';
        out[k] = o;
      }
      out.root = {hover: getComputedStyle(root).getPropertyValue('--' + p + '-hover').trim(), blk: ''};
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, blk: ''};
      return out;
    };
  });
}
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaFaq.audit(document.querySelector('#shopify-section-' + u + ' [data-faq-root]')), uid);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));

/* Every non-hidden control, section and block: live, then redraw. */
async function everyControl(browser, name, width) {
  const cfg = CFG[name], {schema} = schemaOf(name);
  const t = await mount(browser, name, {width, editing: true, blocks: presetBlocks(name), assets: assetsOf(name)});
  await addFp(t.page);
  await t.page.addStyleTag({content: '*,*::before,*::after{transition:none!important}'}); /* measure end states, not colour fades */
  const base = clone(t.section.settings);
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header' && !OWN_TEST.includes(x.id)) cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks || []) {
    const i = baseBlocks.findIndex(b => b.type === bt.type);
    for (const x of bt.settings || []) if (x.id && !x.hidden && x.type !== 'header') { assert.ok(i >= 0, name + ': no preset block ' + bt.type); cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  }
  const covered = new Set();
  for (const c of cases) {
    const {x} = c, key = (c.btype ? c.btype + '.' : '') + x.id, vw = WIDE.includes(x.id) ? 1700 : (cfg.vw || {})[x.id];
    if (vw && width !== 1366) continue;
    if (vw) await t.page.setViewportSize({width: vw, height: 900});
    const W = vw || width;
    const blocks0 = clone(baseBlocks), S = clone(base);
    const bi = c.scope;
    const bBase = bi >= 0 ? blocks0[bi].settings : S;
    Object.assign(bBase, prereq(x, c.list, bBase), bi < 0 ? PRE[x.id] || {} : PREB[key] || {});
    const blockId = bi >= 0 ? 'test-b' + bi : undefined;
    const bp = name === 'faq-side-image' ? 1024 : name === 'faq-floating' && /overlap|position/.test(x.id) ? 900 : 768;
    const isDesk = (cfg.desk || []).includes(x.id) || /_desktop$/.test(x.id) || /_tablet$/.test(x.id), isMob = (cfg.mob || []).includes(x.id) || /_mobile$/.test(x.id);
    const shows = !(isDesk && W < bp) && !(isMob && W >= bp);
    /* a width cap wider than a phone: nothing to see at 375 (checked at 1366) */
    if ((cfg.mobNoop || []).includes(key) && W < 768) { if (vw) await t.page.setViewportSize({width, height: 900}); continue; }
    await t.redraw({settings: S, blocks: blocks0});
    const fp0 = await fp(t);
    eq(await audit(t), [], name + ' ' + key + ' base markup matches controller');
    const cur = bBase[x.id];
    const seen = [[JSON.stringify(cur ?? null), fp0]];
    for (const v of (cfg.vals || {})[x.id] || valuesFor(x, cur)) {
      if (x.type === 'select' && [...((cfg.same || {})[W] || []), ['theme', '700']].some(pair => pair.includes(v) && pair.includes(cur))) continue;
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
        if (![...STRUCTURAL, ...(cfg.structural || [])].includes(key)) {
          const d = diff(fpL, fpR);
          eq(d.map(k => k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(fpL[k] || {}).filter(([q, val]) => JSON.stringify(val) !== JSON.stringify((fpR[k] || {})[q]))))), [], tag + ': live differs from redraw');
        }
        seen.push([JSON.stringify(v), fpR]);
      } else {
        eq(dR, [], tag + ': changes at the wrong width (redraw)');
        eq(dL, [], tag + ': changes at the wrong width (live)');
      }
      covered.add(key);
    }
    if (x.type === 'select' && shows) {
      /* the fixture theme's heading weight is 700, so Theme and Bold draw alike here */
      const same = [...((cfg.same || {})[W] || []), ['theme', '700']];
      for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
        const a = JSON.parse(seen[i][0]), b = JSON.parse(seen[j][0]);
        if (same.some(pair => pair.includes(a) && pair.includes(b))) continue;
        ok(diff(seen[i][1], seen[j][1]).length > 0, name + ' @' + W + ' ' + key + ': ' + seen[i][0] + ' and ' + seen[j][0] + ' look the same');
      }
    }
    if (vw) await t.page.setViewportSize({width, height: 900});
  }
  eq(t.errors, [], name + ' @' + width + ' errors');
  await t.page.close();
  return covered.size;
}

/* Theme inheritance, schemes, custom styling and fonts, first paint, buttons, targets, overflow. */
async function theme(browser, name, width, editing) {
  const cfg = CFG[name], p = cfg.p, tag = name + ' @' + width + (editing ? ' editor' : ' storefront');
  const H = '.' + p + '__heading', SUB = cfg.sub || '.' + p + '__subheading', Q = '[data-faq-question]', A = '[data-faq-answer] p', root = '[data-faq-root]';
  const t = await mount(browser, name, {width, editing, blocks: presetBlocks(name), assets: cfg.assets || []});
  await addFp(t.page);
  const before = await fp(t);
  await t.page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', ASSET), 'utf8')});
  await t.page.waitForTimeout(150); await frames(t.page);
  eq(diff(before, await fp(t)), [], tag + ': first paint equals hydrated paint');
  eq(await audit(t), [], tag + ': markup matches controller');
  eq(await t.css(root, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' scheme background');
  eq(await t.css(H, 'color'), 'rgb(255, 255, 255)', tag + ' heading colour');
  ok(/^Georgia/.test(await t.css(H, 'fontFamily')), tag + ' heading font');
  eq(await t.css(SUB, 'color'), 'rgb(204, 204, 204)', tag + ' subheading colour');
  ok(/^Arial/.test(await t.css(SUB + ' p', 'fontFamily')), tag + ' subheading font');
  eq(await t.css(Q, 'color'), 'rgb(255, 255, 255)', tag + ' question colour');
  eq(await t.css(A, 'color'), 'rgb(204, 204, 204)', tag + ' answer colour');
  ok(/^Arial/.test(await t.css(A, 'fontFamily')), tag + ' answer font');
  const trig = t.root('[data-faq-trigger]');
  if (await trig.count()) for (const b of await trig.all()) ok((await b.boundingBox() || {height: 99}).height >= 44 || !(await b.isVisible()), tag + ' question target 44px');
  /* FAQ Tabs: the pill keeps its size and its ::after takes the 44px tap */
  if (name === 'faq-tabs') for (const l of await t.root('.fqt__tab').all()) if (await l.isVisible()) ok(await l.evaluate(el => { const b = el.getBoundingClientRect(), x = Math.min(b.x + b.width / 2, innerWidth - 2), cy = b.y + b.height / 2; return [cy - 21, cy + 21].every(y => el.contains(document.elementFromPoint(x, y))); }), tag + ' tab target 44px');
  const hasBtn = await t.root('[data-faq-btn]').count() > 0;
  if (hasBtn) {
    const B = '[data-faq-btn]';
    eq(await t.css(B, 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' button colour');
    ok(/^Arial/.test(await t.css(B, 'fontFamily')), tag + ' button font');
    await t.root(B).first().hover(); await t.page.waitForTimeout(40);
    eq(await t.root(B).first().evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(255, 0, 0)', tag + ' button hover');
    await t.page.mouse.move(0, 0);
    ok((await t.root(B).first().boundingBox()).height >= 44, tag + ' button target');
  }
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  if (editing) {
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq(await t.css(root, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme live');
    eq(await t.css(H, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading live');
    eq(await t.css(A, 'color'), 'rgb(51, 51, 51)', tag + ' alt scheme answer live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await t.css(root, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme redraw');
    eq(await t.css(H, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    const hid = t.blockId('heading'), sid = t.blockId('subheading'), bid = t.blockId('button');
    const colours = {name: {'faq-side-image': ['q_color', 'a_color'], 'faq-tabs': ['q_color', 'a_color']}[name] || ['question_color', 'answer_color']};
    const [qc, ac] = colours.name;
    if (name === 'faq-floating') await t.emit({enable_custom_style: true, bg_color: '#ffffff', q_color: '#220000', text_color: '#002200'}, t.blockId('faq_card'));
    await t.emit({enable_custom_style: true, section_bg: '#abcdef', [qc]: '#110000', [ac]: '#001100'});
    await t.emit({enable_custom_style: true, color: '#cc0033'}, hid);
    await t.emit({enable_custom_style: true, color: '#0033cc'}, sid);
    if (hasBtn) await t.emit({enable_custom_style: true, bg_color: '#00ff00', text_color: '#000000', bg_color_hover: '#0000ff'}, bid);
    await frames(t.page);
    eq(await t.css(root, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background');
    eq(await t.css(H, 'color'), 'rgb(204, 0, 51)', tag + ' custom heading');
    eq(await t.css(SUB, 'color'), 'rgb(0, 51, 204)', tag + ' custom subheading');
    eq(await t.css(Q, 'color'), name === 'faq-floating' ? 'rgb(34, 0, 0)' : 'rgb(17, 0, 0)', tag + ' custom question');
    eq(await t.css(A, 'color'), name === 'faq-floating' ? 'rgb(0, 34, 0)' : 'rgb(0, 17, 0)', tag + ' custom answer');
    if (hasBtn) { eq(await t.css('[data-faq-btn]', 'backgroundColor'), 'rgb(0, 255, 0)', tag + ' custom button'); await t.root('[data-faq-btn]').first().hover(); await t.page.waitForTimeout(40); eq(await t.root('[data-faq-btn]').first().evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(0, 0, 255)', tag + ' custom button hover'); await t.page.mouse.move(0, 0); }
    await t.emit({enable_custom_fonts: true, heading_font: FONT, body_font: MONO}); await frames(t.page);
    ok(/^Verdana/.test(await t.css(H, 'fontFamily')), tag + ' custom heading font');
    ok(/^Verdana/.test(await t.css(Q, 'fontFamily')), tag + ' custom question font');
    ok(/^"?Courier New/.test(await t.css(A, 'fontFamily')), tag + ' custom answer font');
    ok(/^"?Courier New/.test(await t.css(SUB + ' p', 'fontFamily')), tag + ' custom subheading font');
    /* the same through a redraw */
    const on = {enable_custom_style: true, section_bg: '#abcdef', enable_custom_fonts: true, heading_font: FONT, body_font: MONO};
    await t.redraw({settings: on});
    eq(await t.css(root, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background redraw');
    ok(/^"?Courier New/.test(await t.css(A, 'fontFamily')), tag + ' custom answer font redraw');
    await t.redraw({settings: {enable_custom_style: false, enable_custom_fonts: false}});
    await t.emit({enable_custom_style: false}, hid); await t.emit({enable_custom_style: false}, sid);
    if (hasBtn) await t.emit({enable_custom_style: false}, bid);
    if (name === 'faq-floating') await t.emit({enable_custom_style: false}, t.blockId('faq_card'));
    await frames(t.page);
    const back = await fp(t), d = diff(before, back).filter(k => k !== 'wrap');
    eq(d.map(k => k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(back[k] || {}).filter(([q, v]) => JSON.stringify(v) !== JSON.stringify((before[k] || {})[q]))))), [], tag + ': toggles off restore the theme exactly');
    if (hasBtn) eq(await t.css('[data-faq-btn]', 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' theme button back');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

/* Questions: one open or several, keyboard, builder selection, tabs; instances, redraws, added blocks. */
async function questions(browser, name) {
  const cfg = CFG[name];
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const blocks = presetBlocks(name);
    const settings = name === 'faq5' || name === 'faq-side-image' ? {image: IMG} : {};
    if (name === 'faq-floating') blocks.find(b => b.type === 'product_image').settings = {image: IMG};
    const t = await mount(browser, name, {width, editing: true, instances: [{uid: 'a', blocks, settings}, {uid: 'b', blocks: presetBlocks(name)}], assets: assetsOf(name)});
    await addFp(t.page); await frames(t.page);
    const b0 = await fp(t, 'b');
    await t.emit({enable_custom_style: true, section_bg: '#abcdef', padding_top: 12, padding_top_mobile: 12, padding_top_desktop: 12}, undefined, 'a');
    await t.emit({text: 'Only in A'}, t.blockId('heading', 0, 'a'), 'a'); await frames(t.page);
    eq(diff(b0, await fp(t, 'b')), [], tag + ': an edit to one instance leaves the other alone');
    eq(await t.page.locator('#shopify-section-a [data-faq-type="heading"]').textContent(), 'Only in A', tag + ' heading A live');
    const imgSel = name === 'faq-floating' ? '.ffq__image-wrap img' : '[data-faq-media] img';
    if (name === 'faq5' || name === 'faq-side-image' || name === 'faq-floating') {
      await t.page.evaluate(s => { document.querySelector('#shopify-section-a ' + s).__mark = 1; }, imgSel);
      await t.emit({padding_bottom: 10, padding_bottom_mobile: 10, padding_bottom_desktop: 10, image_radius: 3, section_margin_top_mobile: 5}, undefined, 'a'); await frames(t.page);
      ok(await t.page.evaluate(s => document.querySelector('#shopify-section-a ' + s).__mark === 1, imgSel), tag + ': picture element kept on unrelated edits');
    }
    const items = t.page.locator('#shopify-section-a [data-faq-item]');
    if (name !== 'faq-floating') {
      const state = () => items.evaluateAll(els => els.map(e => [e.hasAttribute('open'), e.querySelector('[data-faq-trigger]').getAttribute('aria-expanded')]));
      const trig = n => items.nth(n).locator('[data-faq-trigger]');
      const single = name !== 'faq-tabs';
      await trig(0).click(); await t.page.waitForTimeout(80);
      eq((await state())[0], [true, 'true'], tag + ' click opens');
      await trig(1).click(); await t.page.waitForTimeout(80);
      eq((await state()).slice(0, 2), single ? [[false, 'false'], [true, 'true']] : [[true, 'true'], [true, 'true']], tag + (single ? ' one open at a time' : ' several open (tabs default)'));
      await t.emit({allow_multiple_open: single}, undefined, 'a'); await frames(t.page);
      if (single) { await trig(0).click(); await t.page.waitForTimeout(80); eq((await state()).slice(0, 2), [[true, 'true'], [true, 'true']], tag + ' several open once allowed (live)'); }
      else eq((await state()).slice(0, 2).filter(s => s[0]).length, 1, tag + ' one open once several are not allowed (live)');
      await t.emit({allow_multiple_open: !single}, undefined, 'a'); await frames(t.page);
      /* keyboard */
      for (let i = 0; i < 2; i++) if ((await state())[i][0]) await trig(i).click();
      await t.page.waitForTimeout(60);
      await trig(1).focus(); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(60);
      eq((await state())[1], [true, 'true'], tag + ' Enter opens');
      await t.page.keyboard.press('Space'); await t.page.waitForTimeout(60);
      eq((await state())[1], [false, 'false'], tag + ' Space closes');
      ok(await trig(1).evaluate(el => getComputedStyle(el).outlineStyle !== 'none' || el.matches(':focus-visible')), tag + ' focus ring');
      /* smooth: the row grows, nothing jumps */
      const wrap = items.nth(1).locator('[data-faq-panel]');
      eq(await wrap.evaluate(el => getComputedStyle(el).transitionProperty), 'grid-template-rows', tag + ' answer row transitions');
      /* a closed answer with a link is out of the tab order */
      await t.emit({answer: '<p>See <a href="/pages/x">the page</a></p>'}, await items.nth(1).getAttribute('data-faq-block'), 'a'); await frames(t.page);
      await trig(1).click(); await t.page.waitForTimeout(60); await trig(1).click(); await t.page.waitForTimeout(60);
      ok(await wrap.evaluate(el => el.inert), tag + ' closed answer with a link is inert');
      await trig(1).click(); await t.page.waitForTimeout(60);
      ok(await wrap.evaluate(el => !el.inert), tag + ' open answer is not inert');
      /* the builder selects a block */
      const last = items.last(), lastId = await last.getAttribute('data-faq-block');
      await t.page.evaluate(id => document.querySelector('[data-faq-block="' + id + '"]').dispatchEvent(new CustomEvent('shopify:block:select', {bubbles: true, detail: {blockId: id, sectionId: 'a'}})), lastId);
      await t.page.waitForTimeout(80);
      eq(await last.evaluate(e => e.hasAttribute('open')), true, tag + ' block select opens the question');
      ok(await last.isVisible(), tag + ' selected question visible (its tab shown)');
      await t.page.evaluate(id => document.dispatchEvent(new CustomEvent('shopify:block:select', {detail: {blockId: id}})), await items.first().getAttribute('data-faq-block'));
      await t.page.waitForTimeout(80);
      eq(await items.first().evaluate(e => e.hasAttribute('open')), true, tag + ' block select by id opens');
      if (name === 'faq-tabs') {
        await t.page.locator('#shopify-section-a .fqt__tab--2').click(); await t.page.waitForTimeout(60);
        ok(await t.page.locator('#shopify-section-a .fqt__panel--2').isVisible() && !(await t.page.locator('#shopify-section-a .fqt__panel--1').isVisible()), tag + ' a tab shows its questions');
        await t.page.locator('#shopify-section-a .fqt__r--2').focus(); await t.page.keyboard.press('ArrowRight'); await t.page.waitForTimeout(60);
        ok(await t.page.locator('#shopify-section-a .fqt__panel--3').isVisible(), tag + ' arrow keys move between tabs');
        eq(await t.page.locator('#shopify-section-a .fqt__r--3').evaluate(el => getComputedStyle(document.querySelector('#shopify-section-a .fqt__tab--3')).outlineStyle), 'solid', tag + ' focused tab shows a ring');
        await t.emit({tab_2_label: 'Live tab'}, undefined, 'a'); await frames(t.page);
        eq(await t.page.locator('#shopify-section-a .fqt__tab--2').textContent(), 'Live tab', tag + ' tab label live');
      }
    }
    /* redraws: one controller entry per root; a click still toggles once */
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
    eq(await t.page.evaluate(() => window.MateriaFaq.roots.size), 2, tag + ': redraws leave one controller per section');
    if (name !== 'faq-floating') {
      const it = t.page.locator('#shopify-section-a [data-faq-item]').nth(1);
      const was = await it.evaluate(e => e.hasAttribute('open'));
      await it.locator('[data-faq-trigger]').click(); await t.page.waitForTimeout(60);
      eq(await it.evaluate(e => e.hasAttribute('open')), !was, tag + ': one click toggles once after redraws');
    }
    /* an added question block is drawn and live */
    const extra = name === 'faq-floating' ? {type: 'faq_card', settings: {question: 'Added question', answer: '<p>Added</p>', position: 'bottom-right'}} : {type: 'faq_item', settings: {question: 'Added question', answer: '<p>Added</p>', tab: '1'}};
    const nb = [...blocks, extra];
    await t.redraw({uid: 'a', blocks: nb});
    const added = 'a-b' + (nb.length - 1);
    eq(await t.page.locator('[data-faq-block="' + added + '"] [data-faq-question]').textContent(), 'Added question', tag + ' added block drawn');
    await t.emit({question: 'Edited added'}, added, 'a'); await frames(t.page);
    eq(await t.page.locator('[data-faq-block="' + added + '"] [data-faq-question]').textContent(), 'Edited added', tag + ' added block live');
    eq(await audit(t, 'a'), [], tag + ' audit after edits');
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* The section's own reveal on a visitor's page, reduced motion, and the builder (never hidden). */
async function motion(browser, name) {
  const cfg = CFG[name], has = schemaOf(name).schema.settings.some(x => x.id === 'scroll_animation');
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const t = await mount(browser, name, {width: 375, height: 700, editing: false, settings: has ? {reveal: true, scroll_animation: 'blur_up'} : {}, assets: assetsOf(name), reducedMotion});
    await t.page.waitForTimeout(250);
    const root = t.root('[data-faq-root]');
    if (has) {
      ok(await root.evaluate(el => el.hasAttribute('data-faq-reveal') || el.hasAttribute('data-faq7-reveal')), name + ' reveal marked on the storefront');
      ok(await root.evaluate(el => el.classList.contains('is-revealed')), name + ' ' + reducedMotion + ': revealed once in view');
      await t.page.waitForTimeout(900);
      eq(await root.evaluate(el => getComputedStyle(el).opacity), '1', name + ' ' + reducedMotion + ': fully visible');
    }
    if (reducedMotion === 'reduce' && name !== 'faq-floating') {
      const w = t.root('[data-faq-panel]').first();
      ok(/^(0s|none)/.test(await w.evaluate(el => getComputedStyle(el).transitionDuration + '')), name + ' reduced motion: answers open without a transition');
    }
    eq(t.errors, [], name + ' motion errors');
    await t.page.close();
  }
  if (has) {
    const t = await mount(browser, name, {width: 375, editing: true, settings: {reveal: true, scroll_animation: 'blur_up'}, assets: assetsOf(name)});
    eq(await t.root('[data-faq-root]').evaluate(el => getComputedStyle(el).opacity), '1', name + ' builder: never hidden for a reveal');
    await t.page.close();
  }
}

/* FAQPage structured data: printed only when on, from the real question blocks. */
async function structured(name) {
  const {schema} = schemaOf(name), raw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8');
  const draw = async (settings, blocks) => {
    const e = engine(); e.registerFilter('script_tag', () => ''); e.registerFilter('img_url', v => v || '');
    const def = list => Object.fromEntries((list || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
    const section = {id: 'ld', settings: {...def(schema.settings), ...settings}, blocks: blocks.map((b, i) => ({id: 'ld' + i, type: b.type, settings: {...def(schema.blocks.find(x => x.type === b.type).settings), ...(b.settings || {})}}))};
    const ctx = {section, settings: {scroll_animation: 'none'}, request: {design_mode: false}};
    return e.parseAndRender(raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, ''), ctx, {globals: ctx});
  };
  const qType = name === 'faq-floating' ? 'faq_card' : 'faq_item';
  const blocks = [...presetBlocks(name), {type: qType, settings: {question: 'Is the <b>"quote"</b> kept?', answer: '<p>Yes, with a </script> inside & more.</p>'}}, {type: qType, settings: {question: '', answer: '<p>No question</p>'}}];
  const off = await draw({}, blocks);
  ok(!off.includes('application/ld+json'), name + ' structured data off by default');
  const html = await draw({structured_data: true}, blocks);
  const m = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  ok(m, name + ' structured data printed when on');
  const data = JSON.parse(m[1]);
  const want = blocks.filter(b => b.type === qType).map(b => ({...Object.fromEntries((schema.blocks.find(x => x.type === qType).settings || []).filter(x => x.id).map(x => [x.id, x.default])), ...b.settings})).filter(s => s.question && s.answer);
  eq(data['@type'], 'FAQPage', name + ' FAQPage');
  eq(data.mainEntity.map(q => q.name), want.map(s => s.question.replace(/<[^>]*>/g, '').trim()), name + ' one Question per real block with a question');
  eq(data.mainEntity.map(q => q.acceptedAnswer.text), want.map(s => s.answer.replace(/<[^>]*>/g, '').trim()), name + ' answers from the blocks');
  ok(!/<\/script>[\s\S]*<\/script>/.test(m[0].slice(0, -9)), name + ' an answer cannot close the script');
}

/* The saved instances, with the toggles the lead sets, against the sections as they were (HEAD). */
async function saved(browser) {
  const CASES = [
    ['faq-pro', 'home', 'faq_pro_A33MNp', ['.faq7', '.faq7__heading', '.faq7__subheading', '.faq7__item', '.faq7__q', '.faq7__a', '.faq7__btn', '.faq7__header', '.faq7__list', '.faq7__icon']],
    ['faq-pro', 'product', 'faq_pro_JAWLEV', ['.faq7', '.faq7__heading', '.faq7__subheading', '.faq7__item', '.faq7__q', '.faq7__a', '.faq7__btn', '.faq7__header', '.faq7__list', '.faq7__icon']],
    ['faq-tabs', 'faqs', 'faq_tabs_DAXkfF', ['.fqt', '.fqt__heading', '.fqt__sub', '.fqt__tabs', '.fqt__item', '.fqt__summary', '.fqt__answer', '.fqt__header', '.fqt__plus']],
  ];
  const toggles = sec => { const s = clone(sec); s.settings.enable_custom_style = true; for (const b of Object.values(s.blocks)) if (['button', 'heading', 'subheading'].includes(b.type)) b.settings.enable_custom_style = true; return s; };
  const PROPS = ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'paddingTop', 'paddingLeft', 'borderTopLeftRadius', 'borderTopColor', 'borderBottomColor', 'borderTopWidth', 'marginTop', 'marginBottom', 'width', 'height', 'boxShadow', 'textAlign'];
  for (const [name, file, key, sels] of CASES) {
    let oldRaw, oldCss = '';
    try { oldRaw = execSync('git show HEAD:sections/' + name + '.storelib', {cwd: path.join(__dirname, '..'), encoding: 'utf8'}); if (name === 'faq-pro') oldCss = execSync('git show HEAD:shopify/assets/faq-pro.css', {cwd: path.join(__dirname, '..'), encoding: 'utf8'}); } catch (_) { return; }
    if (oldRaw.includes('data-faq-root')) { console.log('saved instances: HEAD already has this change, comparison skipped'); return; }
    const newRaw = fs.readFileSync(path.join(__dirname, '../sections', name + '.storelib'), 'utf8'), newCss = name === 'faq-pro' ? fs.readFileSync(path.join(__dirname, '../shopify/assets/faq-pro.css'), 'utf8') : '';
    const tj = JSON.parse(fs.readFileSync(path.join(__dirname, '../templates', file + '.json'), 'utf8'));
    const renderRaw = async (raw, schema, sec) => {
      const e = engine(); e.registerFilter('script_tag', () => ''); e.registerFilter('img_url', v => v || '');
      const def = list => Object.fromEntries((list || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
      const section = {id: 'S', settings: {...def(schema.settings), ...sec.settings}, blocks: sec.block_order.map(k => ({id: k, type: sec.blocks[k].type, settings: {...def((schema.blocks.find(b => b.type === sec.blocks[k].type) || {}).settings), ...sec.blocks[k].settings}}))};
      const ctx = {section, settings: {scroll_animation: 'none'}, request: {design_mode: false}};
      const tpl = raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, '');
      return (await e.parseAndRender(tpl, ctx, {globals: ctx})).replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<link\b[^>]*>/g, '');
    };
    const oldSchema = JSON.parse(oldRaw.split('<schema>')[1].split('</schema>')[0]).shopify, newSchema = schemaOf(name).schema;
    for (const width of [375, 1366]) {
      const look = async (html, css) => {
        const page = await browser.newPage({viewport: {width, height: 900}});
        await page.route('**/*', r => r.fulfill({body: r.request().url() === 'http://theme.test/' ? '<!doctype html><html><head></head><body></body></html>' : '', contentType: 'text/html'}));
        await page.goto('http://theme.test/');
        await page.addStyleTag({content: THEME_VARS});
        for (const f of ['critical.css', 'theme.css', 'theme-button-contract.css']) await page.addStyleTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', f), 'utf8')});
        if (css) await page.addStyleTag({content: css});
        await page.evaluate(h => { const w = document.createElement('div'); w.id = 'shopify-section-S'; w.className = 'shopify-section'; w.innerHTML = h; document.body.append(w); }, html);
        await page.waitForTimeout(50);
        const r = await page.evaluate(({sels, PROPS}) => Object.fromEntries(sels.map(s => { const e = document.querySelector('#shopify-section-S ' + s); if (!e) return [s, 'missing']; const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return [s, [...PROPS.map(p => cs[p]), [b.x, b.y, b.width, b.height].map(Math.round).join(','), e.innerText.trim().replace(/\s+/g, ' ').slice(0, 60)]]; })), {sels, PROPS});
        await page.close();
        return r;
      };
      const s = tj.sections[key];
      const was = await look(await renderRaw(oldRaw, oldSchema, s), oldCss), now = await look(await renderRaw(newRaw, newSchema, toggles(s)), newCss);
      const tabMin = name === 'faq-tabs';
      
      for (const sel of sels) {
        let a = was[sel], b = now[sel];
        /* FAQ Tabs: a question's button reaches 44px into its own padding (padding and negative margin); the box around it is unchanged */
        if (tabMin && sel === '.fqt__summary' && Array.isArray(a)) { const skip = ['paddingTop', 'marginTop', 'marginBottom', 'height']; a = a.filter((_, i) => !skip.includes(PROPS[i])).slice(0, -2); b = b.filter((_, i) => !skip.includes(PROPS[i])).slice(0, -2); }
        /* FAQ Tabs: the tab strip is centred under the heading now (it sat 15px left of centre at 1366: width 100% with uneven negative margins) */
        if (tabMin && sel === '.fqt__tabs' && Array.isArray(a)) { const [ax, ...ar] = a[a.length - 2].split(','), [bx, ...br] = b[b.length - 2].split(','); eq(br, ar, key + ' @' + width + ' tab strip size'); ok(Math.abs(+bx + +br[1] / 2 - width / 2) <= 1 || width < 600, key + ' @' + width + ' tab strip centred'); a = a.slice(0, -2); b = b.slice(0, -2); }
        eq(b, a, file + ' ' + key + ' @' + width + ' ' + sel + ' looks as before with the custom styling toggles on');
      }
      const plain = await look(await renderRaw(newRaw, newSchema, s), newCss);
      ok(JSON.stringify(plain) !== JSON.stringify(now), key + ' without the toggles it follows the theme (so the toggles are needed)');
      savedCompared++;
    }
  }
}

(async () => {
  const only = process.argv.slice(2), names = Object.keys(CFG).filter(n => !only.length || only.includes(n));
  const browser = await launch();
  try {
    for (const n of names) { eq(schemaProblems(n), [], n + ' schema'); const ids = schemaOf(n).schema.settings.filter(x => x.id).map(x => x.id); eq(new Set(ids).size, ids.length, n + ' unique ids'); }
    for (const n of names) await structured(n);
    const covered = {};
    for (let i = 0; i < names.length; i += 3) await Promise.all(names.slice(i, i + 3).map(async n => { for (const w of [375, 1366]) covered[n] = await everyControl(browser, n, w); }));
    for (let i = 0; i < names.length; i += 3) await Promise.all(names.slice(i, i + 3).map(async n => { for (const w of [375, 1366]) for (const e of [true, false]) await theme(browser, n, w, e); }));
    for (let i = 0; i < names.length; i += 3) await Promise.all(names.slice(i, i + 3).map(n => questions(browser, n)));
    for (const n of names) await motion(browser, n);
    if (!only.length || names.some(n => n === 'faq-pro' || n === 'faq-tabs')) await saved(browser);
    console.log(checks + ' FAQ checks passed (controls covered: ' + Object.entries(covered).map(([n, c]) => n + ' ' + c).join(', ') + (savedCompared ? '; saved instances compared with HEAD: ' + savedCompared : '') + ')');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
