/* Round 7, Contact and Social: the two new sections Newsletter Split
   (newsletter-split, Contact) and Follow Us (social-follow-cta, Social),
   styled by shopify/assets/r7-connect.css and run by
   shopify/assets/live-r7-connect.js.

   Schema and copy; every non-hidden control of the section and of every
   block (live and after a server redraw, at 375 and 1366, the right width
   only, select options all different, markup equal to what the controller
   derives); theme inheritance, colour schemes, custom styling and fonts on
   and off, first paint equal to hydrated paint (editor and storefront);
   custom fonts, weights, sizes and button shape under the real theme
   priority rules, and off again; two instances, redraws and added blocks;
   the sign-up (the store's customer form, data-storelib-form="subscribe",
   sent once by materia-forms.js: the section's own hint, thanks, Subscribed
   and error words); the follow buttons (one per network set in Theme
   settings, the theme's new tab choice, none set: nothing on a visitor's
   page and a hint in the builder); the picture row (a native scroller a
   finger swipes and snaps on a phone, arrows and keys that move it and
   disable at the ends, a page swipe that is never trapped, right to left);
   scripts off, reveal and reduced motion, no sideways scroll.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-connect.cjs [section ...]
   PART=controls,theme,... runs some of the parts. */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const {launch, mount, render, schemaOf, schemaProblems, THEME_VARS} = require('./media-fixture.cjs');
const {engine} = require('./theme-featured-product-round5.cjs');
const JS = 'live-r7-connect.js', CSS_FILE = 'r7-connect.css', ASSETS = [CSS_FILE, JS];
const NAMES = ['newsletter-split', 'social-follow-cta'];
const CATEGORY = {'newsletter-split': 'Contact', 'social-follow-cta': 'Social'};
const FONT = {family: 'Verdana', fallback_families: 'sans-serif', weight: 400, style: 'normal'}, MONO = {family: 'Courier New', fallback_families: 'monospace', weight: 400, style: 'normal'};
const IMG = {id: 'img1', src: 'https://theme.test/pic-a.png', url: 'https://theme.test/pic-a.png', width: 1200, height: 1200, aspect_ratio: 1, alt: 'Own description', presentation: {focal_point: '30% 40%'}};
/* the networks a store has set in Theme settings > Social media (test data, never a default) */
const NET = {instagram: 'https://instagram.com/materia', tiktok: 'https://www.tiktok.com/@materia', youtube: 'https://youtube.com/@materia', facebook: '#', pinterest: ''};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const clone = o => JSON.parse(JSON.stringify(o));
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const STILL = '*,*::before,*::after{transition:none!important;scroll-behavior:auto!important}';
const R = '[data-r7c]', H = '.r7c__heading', SUB = '.r7c__subheading', BTN = '[data-r7c-submit]', FB = '[data-r7c-fbtn]', IN = '[data-r7c-input]', NOTE = '[data-r7c-note]';
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const opts = (name, o = {}) => ({theme: NET, assets: ASSETS, ...o});

/* desk / mob: controls with no _desktop / _mobile in their id that act at one width only. same: options that look like the default at a width. */
const CFG = {
  'newsletter-split': {desk: ['padding_top', 'padding_bottom', 'image_position', 'image_width', 'column_gap'], mob: ['show_image_mobile'], same: {375: {show_section_on: 'mobile'}, 1366: {show_section_on: 'desktop'}}},
  'social-follow-cta': {desk: ['padding_top', 'padding_bottom'], mob: ['show_arrows'], same: {375: {show_section_on: 'mobile'}, 1366: {show_section_on: 'desktop'}}},
};
const OWN_TEST = ['reveal'];
const WIDE = ['section_width']; /* the container widths only differ past 1500px */
/* a picture is drawn by the builder's redraw (it is not loaded again live) */
const STRUCTURAL = ['image', 'image.image'];
const PRE = {reset_spacing: {section_margin_top_mobile: 20, section_margin_top_desktop: 20}, image_alt: {image: IMG}};
const PREB = {'heading.weight_enable': {weight: '400'}, 'heading.size_enable': {size_desktop: 50, size_mobile: 30, line_height: 1.6}, 'subheading.size_enable': {size: 21}, 'subheading.weight_enable': {weight: '700'}, 'image.alt': {image: IMG}};

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
    case 'image_picker': return [IMG];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
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

/* A fingerprint of everything a visitor sees of one instance. */
async function addFp(page) {
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap', 'order', 'alignItems', 'justifyContent', 'borderTopLeftRadius', 'display', 'gridTemplateColumns', 'flexDirection', 'borderTopWidth', 'borderTopColor', 'width', 'height', 'maxWidth', 'objectPosition', 'aspectRatio'];
    const A = ['href', 'alt', 'src', 'target', 'data-theme-button', 'data-sl-button', 'data-own-shape', 'data-own-font', 'data-own-weight', 'data-own-size', 'type', 'placeholder', 'aria-label', 'data-success-message', 'data-already-message', 'data-invalid-message', 'data-error-message', 'data-success-ms'];
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-r7c]'), out = {}, seen = {};
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.ownerSVGElement || e.tagName === 'STYLE') continue;
        const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
        let k = (e.dataset && e.dataset.r7cBlock) || e.tagName + '.' + (cls.split(' ')[0] || '');
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const q of P) o[q] = cs[q];
        o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
        if (!e.children.length || /^(H\d|P|A|BUTTON|LABEL)$/.test(e.tagName)) o.text = e.textContent.trim().slice(0, 80);
        if (e.matches('[data-r7c-submit], [data-r7c-fbtn]')) for (const v of ['--mb-hover-bg', '--mb-hover-text', '--mb-hover-border']) o[v] = cs.getPropertyValue(v).trim();
        if (e.matches('[data-r7c]')) o.done = cs.getPropertyValue('--r7c-done').trim();
        o.tag = e.tagName; o.hidden = e.hidden; o.cls = cls.split(/\s+/).filter(Boolean).sort().join(' ');
        for (const a of A) o[a] = e.getAttribute(a);
        o.blk = e.closest('[data-r7c-block]')?.dataset.r7cBlock || '';
        out[k] = o;
      }
      out.root = {scheme: [...root.classList].filter(c => c.startsWith('color-')).join(), blk: ''};
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, blk: ''};
      return out;
    };
  });
}
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaR7Connect.audit(document.querySelector('#shopify-section-' + u + ' [data-r7c]')), uid);
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
  eq([s.presets[0].name, s.presets[0].category], [s.name, CATEGORY[name]], name + ' preset name and category');
  const lines = raw.split('\n');
  eq(lines[0], '<template compat="shopify">', name + ' line 1');
  eq(lines[1], `<script src="{{ '${JS}' | asset_url }}" defer="defer"></script>`, name + ' line 2 links the controller');
  eq(Object.keys(JSON.parse(raw.split('<schema>')[1].split('</schema>')[0])), ['shopify'], name + ' schema holds only the theme schema');
  for (const f of ['sections/' + name + '.storelib', 'shopify/assets/' + JS, 'shopify/assets/' + CSS_FILE, 'snippets/r7-connect-block.storelib', 'snippets/r7-connect-vars.storelib', 'snippets/r7-connect-network.storelib']) ok(!/[^\x00-\x7F]/.test(read(f)), f + ' is plain ASCII');
  eq(s.settings.filter(x => x.id).slice(0, 4).map(x => x.id), ['color_scheme', 'section_width', 'show_section_on', 'reset_spacing'], name + ' General order');
  /* spacing as the category's finished sections have it (Newsletter: step 1; Social Shop Grid: step 2) */
  const stepP = name === 'newsletter-split' ? 1 : 2;
  for (const [id, d, step, max] of [['padding_top', 60, stepP, 100], ['padding_bottom', 60, stepP, 100], ['padding_top_mobile', 40, stepP, 100], ['padding_bottom_mobile', 40, stepP, 100], ['section_margin_top_desktop', 0, 4, 300], ['section_margin_bottom_desktop', 0, 4, 300], ['section_margin_top_mobile', 0, 4, 300], ['section_margin_bottom_mobile', 0, 4, 300]]) {
    const x = s.settings.find(y => y.id === id);
    eq([x.type, x.min, x.max, x.step, x.default], ['range', 0, max, step, d], name + ' ' + id + ' as the category has it');
  }
  /* setting ids shared with the category's sections, so content carries over */
  const shared = name === 'newsletter-split' ? ['email_label', 'email_placeholder', 'btn_text', 'note', 'subscribed_button_text', 'success_text', 'success_duration', 'already_text', 'invalid_text', 'error_text', 'form_layout', 'button_style', 'use_theme_button', 'button_radius', 'button_size', 'button_pad_x', 'button_pad_y', 'enable_custom_style', 'button_bg', 'button_text', 'button_border', 'button_bg_hover', 'button_text_hover', 'enable_custom_fonts', 'heading_font', 'body_font', 'reveal'] : ['enable_custom_style', 'enable_custom_fonts', 'heading_font', 'body_font', 'reveal', 'button_style', 'use_theme_button'];
  const nl = schemaOf('newsletter').schema;
  for (const id of shared) ok(s.settings.some(x => x.id === id), name + ' has ' + id);
  if (name === 'newsletter-split') for (const id of ['email_label', 'btn_text', 'success_text', 'invalid_text', 'error_text', 'success_duration', 'button_size']) eq(s.settings.find(x => x.id === id).type, nl.settings.find(x => x.id === id).type, name + ' ' + id + ' has the Newsletter type');
  eq(s.blocks.find(b => b.type === 'heading').settings.map(x => x.id).filter(Boolean), nl.blocks.find(b => b.type === 'heading').settings.map(x => x.id).filter(Boolean).filter(id => id !== 'tag'), name + ' heading block ids as Newsletter');
  eq(s.blocks.find(b => b.type === 'subheading').settings.map(x => x.id).filter(Boolean), nl.blocks.find(b => b.type === 'subheading').settings.map(x => x.id).filter(Boolean), name + ' subheading block ids as Newsletter');
  const words = [];
  const walk = (n, k) => { if (typeof n === 'string') { if (['name', 'label', 'info', 'content', 'default', 'text', 'heading'].includes(k)) words.push(n); } else if (Array.isArray(n)) n.forEach(v => walk(v, k)); else if (n && typeof n === 'object') for (const [key, v] of Object.entries(n)) walk(v, key); };
  walk(s);
  eq(words.filter(w => /—|–|\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(w)), [], name + ' copy: no em dash and none of the banned words');
  ok(!words.some(w => /\d+\s?%|\$\s?\d|\d+\s?(reviews|customers|orders|followers|subscribers)|@\w/i.test(w)), name + ' copy: no invented number, price, count or handle');
  const tpl = raw.split('<schema>')[0];
  if (name === 'newsletter-split') {
    ok(/\{%- form 'customer'[^%]*data-nl-form: ''[^%]*data-mt-inline-subscribe: 'true'[^%]*data-storelib-form: 'subscribe'/.test(tpl) && /name="contact\[email\]"/.test(tpl), name + ' the sign-up is the store customer form, data-storelib-form="subscribe", sent by materia-forms');
    ok(/data-mt-trap>[\s\S]{0,300}name="company"/.test(tpl), name + ' the honeypot is the one materia-forms checks');
    ok(/data-nl-msg="done"[^>]*>\{\{ st\.success_text/.test(tpl) && /data-nl-msg="error"[^>]*>\{\{ st\.error_text/.test(tpl) && /data-nl-hint[^>]*>\{\{ st\.invalid_text/.test(tpl), name + ' its messages are settings');
    ok(/form\.posted_successfully\?[\s\S]{0,80}st\.success_text/.test(tpl), name + ' a page drawn after a post without script thanks the visitor');
  } else {
    ok(/settings\[key\]/.test(tpl) && !/instagram\.com|tiktok\.com|facebook\.com/.test(tpl + JSON.stringify(s)), name + ' links come from Theme settings, never typed in');
  }
}

/* ------------------------------------------------------------ every control */
async function everyControl(browser, name, width) {
  const cfg = CFG[name], {schema: sc} = schemaOf(name);
  const t = await mount(browser, name, opts(name, {width, editing: true, blocks: presetBlocks(name)}));
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
    const isDesk = bi < 0 && cfg.desk.includes(x.id) || /_desktop$/.test(x.id), isMob = bi < 0 && cfg.mob.includes(x.id) || /_mobile$/.test(x.id);
    const shows = !(isDesk && W < 768) && !(isMob && W >= 768);
    const structural = STRUCTURAL.includes(key);
    await t.redraw({settings: S, blocks: blocks0});
    const fp0 = await fp(t);
    eq(await audit(t), [], name + ' ' + key + ' base markup matches controller');
    const cur = bBase[x.id];
    const seen = [[JSON.stringify(cur ?? null), fp0]];
    for (const v of valuesFor(x, cur)) {
      const tag = name + ' @' + W + ' ' + key + '=' + JSON.stringify(v).slice(0, 40);
      const same = bi < 0 && (cfg.same[width] || {})[x.id] === v;
      await t.redraw({settings: S, blocks: blocks0});
      await t.emit({[x.id]: v}, blockId); await frames(t.page);
      const fpL = await fp(t);
      const blocks1 = clone(blocks0); if (bi >= 0) blocks1[bi].settings[x.id] = v;
      await t.redraw({settings: bi >= 0 ? S : {...S, [x.id]: v}, blocks: blocks1});
      const fpR = await fp(t);
      eq(await audit(t), [], tag + ': markup matches controller');
      const dR = diff(fp0, fpR), dL = diff(fp0, fpL);
      if (shows && !same) {
        ok(dR.length > 0, tag + ': redraw changes nothing');
        if (bi >= 0) ok(dR.some(k => fpR[k]?.blk === blockId || fp0[k]?.blk === blockId), tag + ': does not change its own block (' + dR.slice(0, 4) + ')');
        if (bi < 0 && /^section_margin/.test(x.id)) ok(dR.includes('wrap'), tag + ': margin not on the section');
        if (!structural) eq(detail(fpL, fpR, diff(fpL, fpR)), [], tag + ': live differs from redraw');
        seen.push([JSON.stringify(v), fpR]);
      } else {
        eq(detail(fpR, fp0, dR), [], tag + ': changes where it should not (redraw)');
        if (!structural) eq(detail(fpL, fp0, dL), [], tag + ': changes where it should not (live)');
      }
      covered.add(key);
    }
    if (x.type === 'select') for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) ok(diff(seen[i][1], seen[j][1]).length > 0, name + ' @' + W + ' ' + key + ': ' + seen[i][0] + ' and ' + seen[j][0] + ' look the same');
    if (vw) await t.page.setViewportSize({width, height: 900});
  }
  eq(t.errors, [], name + ' @' + width + ' errors');
  await t.page.close();
  return covered.size;
}

/* ------------------------------------------------------------ theme first */
async function theme(browser, name, width, editing) {
  const tag = name + ' @' + width + (editing ? ' editor' : ' storefront'), split = name === 'newsletter-split';
  const t = await mount(browser, name, opts(name, {width, editing, blocks: presetBlocks(name), assets: [CSS_FILE]}));
  await addFp(t.page);
  const before = await fp(t);
  await t.page.addScriptTag({content: read('shopify/assets/' + JS)});
  await t.page.waitForTimeout(150); await frames(t.page);
  eq(detail(await fp(t), before, diff(before, await fp(t))), [], tag + ': first paint equals hydrated paint');
  if (editing) eq(await audit(t), [], tag + ': markup matches controller');
  eq(await t.css(R, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' scheme background');
  eq(await t.css(H, 'color'), 'rgb(255, 255, 255)', tag + ' heading colour');
  ok(/^Georgia/.test(await t.css(H, 'fontFamily')), tag + ' heading font');
  eq(await t.css(H, 'fontWeight'), '700', tag + ' heading weight');
  eq(await t.root(H).evaluate(el => el.tagName), 'H2', tag + ' the section heading is an h2');
  eq(await t.css(SUB + ' p', 'color'), 'rgb(204, 204, 204)', tag + ' subheading colour');
  ok(/^Arial/.test(await t.css(SUB + ' p', 'fontFamily')), tag + ' subheading font');
  if (split) {
    eq(await t.css(IN, 'color'), 'rgb(204, 204, 204)', tag + ' field text in the scheme colour');
    eq(await t.css(IN, 'borderTopColor'), 'rgb(68, 85, 102)', tag + ' field border in the scheme colour');
    ok(/^Arial/.test(await t.css(IN, 'fontFamily')), tag + ' field font');
    ok(parseFloat(await t.css(IN, 'fontSize')) >= 16, tag + ' field text at least 16px (no zoom on a phone)');
    ok((await t.root(IN).boundingBox()).height >= 44, tag + ' field target 44px');
    eq(await t.root(IN).evaluate(el => [el.type, el.name, el.required, el.labels.length, el.labels[0].textContent.trim(), el.placeholder, el.autocomplete]), ['email', 'contact[email]', true, 1, 'Email address', 'Your email address', 'email'], tag + ' the email field has its label');
    eq(await t.css(BTN, 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' button colour');
    eq(await t.css(BTN, 'borderTopLeftRadius'), '12px', tag + ' button radius');
    ok(/^Arial/.test(await t.css(BTN, 'fontFamily')), tag + ' button font');
    eq(await t.root(BTN).evaluate(el => [el.type, el.dataset.themeButton, el.hasAttribute('data-sl-button')]), ['submit', 'primary', true], tag + ' a submit button on the theme contract');
    await t.root(BTN).hover(); await t.page.waitForTimeout(40);
    eq(await t.root(BTN).evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(255, 0, 0)', tag + ' button hover');
    await t.page.mouse.move(0, 0);
    ok((await t.root(BTN).boundingBox()).height >= 44, tag + ' button target');
    eq(await t.css(NOTE, 'color'), 'rgb(204, 204, 204)', tag + ' note in the scheme text colour');
    ok(/^Arial/.test(await t.css(NOTE, 'fontFamily')), tag + ' note font');
    const box = await t.root('[data-r7c-media]').boundingBox();
    ok(Math.abs(box.width - box.height) <= 1, tag + ' the picture keeps its shape (square)');
    if (width >= 768) { const b = await t.root('.r7c__body').boundingBox(); ok(b.x > box.x + box.width && Math.abs((b.y + b.height / 2) - (box.y + box.height / 2)) < 2, tag + ' the words sit beside the picture, centred'); }
    else { const b = await t.root('.r7c__body').boundingBox(); ok(b.y >= box.y + box.height, tag + ' a phone stacks the words under the picture'); }
    eq(await t.root('.r7c__hint, .r7c__msg--error, .r7c__msg--done').evaluateAll(els => els.map(e => getComputedStyle(e).display)), ['none', 'none', 'none'], tag + ' no message before a sign-up');
  } else {
    const n = await t.root(FB).count();
    eq(n, 3, tag + ' a button for each network set (a # or an empty link is not set)');
    eq(await t.root(FB).evaluateAll(els => els.map(e => [e.querySelector('.r7c__fname').textContent, e.getAttribute('href'), e.target, e.dataset.themeButton, e.hasAttribute('data-sl-button'), !!e.querySelector('svg')])), [['Instagram', NET.instagram, '_self', 'secondary', true, true], ['YouTube', NET.youtube, '_self', 'secondary', true, true], ['TikTok', NET.tiktok, '_self', 'secondary', true, true]], tag + ' name, link, the theme\'s new tab choice, theme contract and icon');
    eq([await t.css(FB, 'backgroundColor'), await t.css(FB, 'color'), await t.css(FB, 'borderTopLeftRadius')], ['rgb(255, 255, 255)', 'rgb(18, 52, 86)', '12px'], tag + ' follow buttons are the theme secondary button');
    ok(/^Arial/.test(await t.css(FB, 'fontFamily')), tag + ' follow button font');
    for (const b of await t.root(FB).all()) ok((await b.boundingBox()).height >= 48, tag + ' follow button is large (48px or more)');
    eq(await t.root('.r7c__ficon svg').first().evaluate(el => getComputedStyle(el).color), await t.css(FB, 'color'), tag + ' the icon takes the button colour');
    const before2 = await t.root(FB).first().evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el, '::before').backgroundColor, getComputedStyle(el).color].join());
    await t.root(FB).first().hover(); await t.page.waitForTimeout(60);
    ok(await t.root(FB).first().evaluate(el => [getComputedStyle(el).backgroundColor, getComputedStyle(el, '::before').backgroundColor, getComputedStyle(el).color].join()) !== before2, tag + ' follow button hover follows the theme');
    await t.page.mouse.move(0, 0);
    const tiles = await t.root('[data-r7c-tile]').all();
    eq(tiles.length, 4, tag + ' four pictures in the preset');
    const tb = await tiles[0].boundingBox();
    ok(Math.abs(tb.width - tb.height) <= 1, tag + ' square pictures');
    if (width >= 768) { const all = await Promise.all(tiles.map(x => x.boundingBox())); ok(all.every(b => Math.abs(b.y - all[0].y) < 1 && Math.abs(b.width - all[0].width) < 1), tag + ' one row of equal pictures'); ok(await t.root('[data-r7c-nav]').evaluate(el => getComputedStyle(el).display === 'none'), tag + ' no arrows on desktop'); }
    else { ok(await t.root('[data-r7c-track]').evaluate(el => el.scrollWidth > el.clientWidth + 10), tag + ' the row scrolls sideways on a phone'); for (const a of await t.root('.r7c__arrow').all()) { const b = await a.boundingBox(); ok(b.width >= 44 && b.height >= 44, tag + ' arrow target 44px'); } }
  }
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  if (editing) {
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq(await t.css(R, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme live');
    eq(await t.css(H, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading live');
    eq(await t.css(SUB + ' p', 'color'), 'rgb(51, 51, 51)', tag + ' alt scheme text live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await t.css(R, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    const hid = t.blockId('heading'), sid = t.blockId('subheading');
    const cols = {enable_custom_style: true, section_bg: '#abcdef', button_bg: '#00ff00', button_text: '#000000', button_border: '#0a0b0c', button_bg_hover: '#0000ff', button_text_hover: '#ffff00'};
    if (split) cols.text_color = '#112233';
    await t.emit(cols);
    await t.emit({enable_custom_style: true, color: '#cc0033'}, hid);
    await t.emit({enable_custom_style: true, color: '#0033cc'}, sid);
    await frames(t.page);
    const B = split ? BTN : FB;
    eq(await t.css(R, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background');
    eq(await t.css(H, 'color'), 'rgb(204, 0, 51)', tag + ' custom heading');
    eq(await t.css(SUB + ' p', 'color'), 'rgb(0, 51, 204)', tag + ' custom subheading paragraph');
    eq([await t.css(B, 'backgroundColor'), await t.css(B, 'color'), await t.css(B, 'borderTopColor')], ['rgb(0, 255, 0)', 'rgb(0, 0, 0)', 'rgb(10, 11, 12)'], tag + ' custom button colours');
    if (split) eq(await t.css(NOTE, 'color'), 'rgb(17, 34, 51)', tag + ' custom note colour');
    else eq(await t.root('.r7c__ficon svg').first().evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)', tag + ' custom icon colour follows the button text');
    await t.root(B).first().hover(); await t.page.waitForTimeout(60);
    eq(await t.root(B).first().evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(0, 0, 255)', tag + ' custom button hover');
    await t.page.mouse.move(0, 0);
    await t.emit({enable_custom_fonts: true, heading_font: FONT, body_font: MONO}); await frames(t.page);
    ok(/^Verdana/.test(await t.css(H, 'fontFamily')), tag + ' custom heading font');
    ok(/^"?Courier New/.test(await t.css(SUB + ' p', 'fontFamily')), tag + ' custom subheading font');
    ok(/^"?Courier New/.test(await t.css(B, 'fontFamily')), tag + ' custom button font');
    if (split) { ok(/^"?Courier New/.test(await t.css(IN, 'fontFamily')), tag + ' custom field font'); ok(/^"?Courier New/.test(await t.css(NOTE, 'fontFamily')), tag + ' custom note font'); }
    await t.redraw({settings: {enable_custom_style: true, section_bg: '#abcdef', enable_custom_fonts: true, heading_font: FONT, body_font: MONO}});
    eq(await t.css(R, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background redraw');
    ok(/^"?Courier New/.test(await t.css(B, 'fontFamily')), tag + ' custom button font redraw');
    await t.redraw({settings: {enable_custom_style: false, enable_custom_fonts: false}});
    await t.emit({enable_custom_style: false}, hid); await t.emit({enable_custom_style: false}, sid);
    await frames(t.page);
    const back = await fp(t), d = diff(before, back).filter(k => k !== 'wrap');
    eq(detail(back, before, d), [], tag + ': toggles off restore the theme exactly');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

/* ------------------------------------------------------------ the real theme priority rules */
function priorityCases(name) {
  const split = name === 'newsletter-split', D = w => w >= 768, B = split ? BTN : FB;
  const blocks = presetBlocks(name).map(b => b.type === 'heading' ? {...b, settings: {...(b.settings || {}), text: 'Join <strong>us</strong>'}} : b.type === 'subheading' ? {...b, settings: {text: '<p>News <strong>now and then</strong></p>'}} : b);
  const HS = H + ' strong', SP = SUB + ' p', SS = SUB + ' strong', cases = [];
  const sec = {label: 'section custom fonts', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily'], ['sp', SP, 'fontFamily'], ['b', B, 'fontFamily']],
    on: {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/, sp: /Courier New/, b: /Courier New/}, attrs: [[H, 'data-own-font'], [SUB, 'data-own-font']]};
  if (split) { sec.probes.push(['in', IN, 'fontFamily'], ['note', NOTE, 'fontFamily'], ['msg', '.r7c__hint', 'fontFamily'], ['lab', '[data-r7c-email-label]', 'fontFamily']); Object.assign(sec.want, {in: /Courier New/, note: /Courier New/, msg: /Courier New/, lab: /Courier New/}); sec.attrs.push(['[data-r7c-signup]', 'data-own-font']); }
  else { sec.probes.push(['fn', '.r7c__fname', 'fontFamily']); sec.want.fn = /Courier New/; sec.attrs.push([FB, 'data-own-font']); }
  cases.push(sec);
  cases.push({block: 'heading', label: 'heading custom font', probes: [['h', H, 'fontFamily'], ['hs', HS, 'fontFamily']], on: {enable_custom_fonts: true, font: FONT}, off: {enable_custom_fonts: false}, want: {h: /Verdana/, hs: /Verdana/}, attrs: [[H, 'data-own-font']]});
  cases.push({block: 'heading', label: 'heading custom weight', probes: [['w', H, 'fontWeight']], on: {weight_enable: true, weight: '300'}, off: {weight_enable: false}, want: {w: '300'}, attrs: [[H, 'data-own-weight']]});
  cases.push({block: 'heading', label: 'heading custom size', probes: [['fs', H, 'fontSize'], ['lh', H, 'lh'], ['ls', H, 'letterSpacing'], ['lss', HS, 'letterSpacing']], on: {size_enable: true, size_desktop: 61, size_mobile: 21, line_height: 1.7, tracking: 2}, off: {size_enable: false},
    want: {fs: w => D(w) ? '61px' : '21px', lh: '1.70', ls: '2px', lss: '2px'}, attrs: [[H, 'data-own-size']]});
  cases.push({block: 'subheading', label: 'subheading custom font', probes: [['sp', SP, 'fontFamily'], ['ss', SS, 'fontFamily']], on: {enable_custom_fonts: true, font: MONO}, off: {enable_custom_fonts: false}, want: {sp: /Courier New/, ss: /Courier New/}, attrs: [[SUB, 'data-own-font']]});
  cases.push({block: 'subheading', label: 'subheading custom weight', probes: [['w', SP, 'fontWeight']], on: {weight_enable: true, weight: '700'}, off: {weight_enable: false}, want: {w: '700'}, attrs: [[SUB, 'data-own-weight']]});
  cases.push({block: 'subheading', label: 'subheading custom size', probes: [['fs', SP, 'fontSize'], ['lh', SP, 'lh']], on: {size_enable: true, size: 23, line_height: 2}, off: {size_enable: false}, want: {fs: '23px', lh: '2.00'}, attrs: [[SUB, 'data-own-size']]});
  if (split) cases.push({label: 'button own shape', probes: [['pl', B, 'paddingLeft'], ['pt', B, 'paddingTop'], ['r', B, 'borderTopLeftRadius'], ['fs', B, 'fontSize']], on: {use_theme_button: false, button_radius: 21, button_size: 19, button_pad_x: 41, button_pad_y: 7}, off: {use_theme_button: true}, want: {pl: '41px', pt: '7px', r: '21px', fs: '19px'}, attrs: [[B, 'data-own-shape']]});
  else {
    cases.push({label: 'button own shape, small', probes: [['pl', B, 'paddingLeft'], ['pt', B, 'paddingTop'], ['r', B, 'borderTopLeftRadius'], ['fs', B, 'fontSize']], on: {use_theme_button: false, button_size: 'small', button_radius: 21}, off: {use_theme_button: true}, want: {pl: '18px', pt: '10px', r: '21px', fs: '14px'}, attrs: [[B, 'data-own-shape']]});
    cases.push({label: 'button own shape, large', probes: [['pl', B, 'paddingLeft'], ['pt', B, 'paddingTop'], ['r', B, 'borderTopLeftRadius'], ['fs', B, 'fontSize']], on: {use_theme_button: false, button_size: 'large', button_radius: 3}, off: {use_theme_button: true}, want: {pl: '30px', pt: '18px', r: '3px', fs: '18px'}, attrs: [[B, 'data-own-shape']]});
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
  const t = await mount(browser, c.name, opts(c.name, {width, editing, blocks: clone(c.blocks)}));
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
  await t.emit(c.on, block); await on('live on');
  await t.emit(c.off, block); await off('live off');
  await redraw(c.on); await on('redraw on');
  await t.emit(c.off, block); await off('redraw on, live off');
  await t.emit(c.on, block); await on('redraw on, live off, live on');
  await redraw(c.off); await off('redraw off');
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}
async function priorityOff(browser, name) {
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, opts(name, {width, editing: true, priority: 'off'}));
    await frames(t.page);
    const tag = name + ' priority off @' + width, B = name === 'newsletter-split' ? BTN : FB;
    ok(/^Georgia/.test(await t.css(H, 'fontFamily')), tag + ' heading font');
    eq(await t.css(H, 'fontWeight'), '700', tag + ' heading weight');
    ok(/^Arial/.test(await t.css(SUB + ' p', 'fontFamily')), tag + ' text font');
    eq(await t.css(R, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' background');
    eq(await t.css(B, 'backgroundColor'), name === 'newsletter-split' ? 'rgb(18, 52, 86)' : 'rgb(255, 255, 255)', tag + ' button colour');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* ------------------------------------------------------------ instances, redraws, blocks */
async function instances(browser, name) {
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const t = await mount(browser, name, opts(name, {width, editing: true, instances: [{uid: 'a', blocks: presetBlocks(name)}, {uid: 'b', blocks: presetBlocks(name)}]}));
    await addFp(t.page); await frames(t.page);
    const b0 = await fp(t, 'b');
    await t.emit({enable_custom_style: true, section_bg: '#abcdef', padding_top: 12, padding_top_mobile: 12, button_style: name === 'newsletter-split' ? 'secondary' : 'primary'}, undefined, 'a');
    await t.emit({text: 'Only in A'}, t.blockId('heading', 0, 'a'), 'a'); await frames(t.page);
    eq(diff(b0, await fp(t, 'b')), [], tag + ': an edit to one instance leaves the other alone');
    eq(await t.page.locator('#shopify-section-a ' + H).textContent(), 'Only in A', tag + ' heading A live');
    eq(await t.page.locator('#shopify-section-a ' + R).evaluate(el => getComputedStyle(el).paddingTop), '12px', tag + ' padding A live');
    /* the ids a form or a row carries are its own */
    const ids = await t.page.evaluate(() => [...document.querySelectorAll('[id]')].map(e => e.id));
    eq(ids.length, new Set(ids).size, tag + ' no id is used twice on a page with two instances');
    if (name === 'newsletter-split') {
      /* a typed address stays typed through an unrelated edit, and the field is never replaced */
      const input = t.page.locator('#shopify-section-a ' + IN);
      await input.fill('someone@example.com');
      const h = await input.elementHandle();
      await t.emit({btn_text: 'Join', note: 'Changed note', column_gap: 20}, undefined, 'a'); await frames(t.page);
      eq(await input.inputValue(), 'someone@example.com', tag + ' a typed address stays through an edit');
      ok(await h.evaluate(el => el.isConnected), tag + ' the field element is kept through an edit');
      eq(await t.page.locator('#shopify-section-a [data-r7c-label]').textContent(), 'Join', tag + ' button label live');
    } else {
      /* an unchanged picture is never loaded again */
      await t.redraw({uid: 'a', blocks: presetBlocks(name).map(b => b.type === 'image' ? {...b, settings: {image: IMG}} : b)});
      const img = await t.page.locator('#shopify-section-a .r7c__tile-img').first().elementHandle(), src = await img.evaluate(e => e.currentSrc || e.src);
      await t.emit({image_gap: 20, button_prefix: 'Follow us on'}, undefined, 'a'); await frames(t.page);
      eq([await img.evaluate(e => e.isConnected), await img.evaluate(e => e.currentSrc || e.src)], [true, src], tag + ' the picture is not loaded again on an unrelated edit');
      eq(await t.page.locator('#shopify-section-a .r7c__fname').first().textContent(), 'Follow us on Instagram', tag + ' words before the name, live');
    }
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
    eq(await t.page.evaluate(() => window.MateriaR7Connect.roots.size), 2, tag + ': redraws leave one controller per section');
    /* an added block is drawn and live */
    const type = name === 'newsletter-split' ? 'subheading' : 'image';
    const nb = name === 'newsletter-split' ? [{type: 'heading'}] .concat([{type: 'subheading', settings: {text: '<p>Added text</p>'}}]) : [...presetBlocks(name), {type: 'image', settings: {link: '/pages/added'}}];
    await t.redraw({uid: 'a', blocks: nb});
    const added = 'a-b' + (nb.length - 1);
    if (type === 'subheading') {
      eq(await t.page.locator('[data-r7c-block="' + added + '"]').textContent(), 'Added text', tag + ' added block drawn');
      await t.emit({text: '<p>Edited added</p>'}, added, 'a'); await frames(t.page);
      eq(await t.page.locator('[data-r7c-block="' + added + '"]').textContent(), 'Edited added', tag + ' added block live');
    } else {
      eq(await t.page.locator('[data-r7c-block="' + added + '"]').evaluate(e => [e.tagName, e.getAttribute('href')]), ['A', '/pages/added'], tag + ' added picture drawn as a link');
      await t.emit({link: ''}, added, 'a'); await frames(t.page);
      eq(await t.page.locator('[data-r7c-block="' + added + '"]').evaluate(e => [e.tagName, e.hasAttribute('href')]), ['DIV', false], tag + ' a picture without a link is not a link, live');
      await t.emit({link: '/pages/again'}, added, 'a'); await frames(t.page);
      eq(await t.page.locator('[data-r7c-block="' + added + '"]').evaluate(e => [e.tagName, e.getAttribute('href')]), ['A', '/pages/again'], tag + ' and a link again, live');
      eq(await t.page.locator('#shopify-section-a [data-r7c]').getAttribute('data-r7c-count'), '5', tag + ' the row counts its pictures');
    }
    eq(await audit(t, 'a'), [], tag + ' audit after edits');
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* ------------------------------------------------------------ contents: none, one, many, long */
async function contents(browser, name) {
  const long = 'Averyveryverylongwordthatcannotbreakanywhereonaphonescreenwithoutwrapping and more words after it';
  const sets = name === 'newsletter-split'
    ? [['no blocks', [], {}], ['one heading', [{type: 'heading'}], {}], ['long words', [{type: 'heading', settings: {text: long}}, {type: 'subheading', settings: {text: '<p>' + long + '</p>'}}], {btn_text: 'Subscribe to the weekly letter', note: long, image: IMG}], ['stacked, centred, no picture on a phone', presetBlocks(name), {form_layout: 'vertical', content_alignment: 'center', show_image_mobile: false}]]
    : [['no blocks', [], {}], ['one picture', [{type: 'image', settings: {image: IMG, link: '/pages/a'}}], {}], ['six pictures', [...presetBlocks(name), {type: 'image'}, {type: 'image'}], {button_prefix: 'Follow us on', buttons_layout: 'grid'}], ['long words', [{type: 'heading', settings: {text: long}}, {type: 'subheading', settings: {text: '<p>' + long + '</p>'}}], {button_prefix: long}]];
  for (const [label, blocks, settings] of sets) for (const width of [375, 1366]) {
    const t = await mount(browser, name, opts(name, {width, editing: true, blocks, settings}));
    await frames(t.page);
    const tag = name + ' ' + label + ' @' + width;
    ok(await t.noOverflow(), tag + ': no sideways scroll');
    ok(await t.root(R).evaluate(el => el.scrollWidth <= el.clientWidth + 1), tag + ': nothing wider than the section');
    eq(t.errors, [], tag + ' errors');
    if (!blocks.length) eq(await t.root('.r7c__header').count(), 0, tag + ': no empty header');
    if (label === 'six pictures' && width === 375) {
      eq(await t.root('[data-r7c-tile]').count(), 6, tag + ' six pictures');
      const cols = await t.root('.r7c__follow').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      eq(cols, 2, tag + ' equal width buttons: two per row on a phone');
    }
    if (label === 'one picture') ok(await t.root('[data-r7c-nav]').evaluate(el => getComputedStyle(el).display === 'none'), tag + ' one picture: no arrows');
    if (label.startsWith('stacked') && width === 375) {
      ok(await t.root('[data-r7c-media]').evaluate(el => getComputedStyle(el).display === 'none'), tag + ' no picture on a phone');
      const [i, b] = [await t.root(IN).boundingBox(), await t.root(BTN).boundingBox()];
      ok(b.y > i.y + i.height - 1 && Math.abs(b.width - i.width) < 1, tag + ' stacked: the button under the field, as wide');
    }
    if (label.startsWith('stacked') && width === 1366) ok(await t.root('[data-r7c-media]').evaluate(el => getComputedStyle(el).display !== 'none'), tag + ' the picture still shows on desktop');
    if (label === 'long words' && name === 'newsletter-split') eq(await t.root('[data-r7c-img]').evaluate(e => [e.alt, e.getAttribute('loading'), +e.getAttribute('width') > 0, +e.getAttribute('height') > 0, getComputedStyle(e).objectPosition]), ['Own description', 'lazy', true, true, '30% 40%'], tag + ' a picked picture: its description, lazy, sized, focal point');
    await t.page.close();
  }
  if (name === 'social-follow-cta') {
    /* no network set: nothing on a visitor's page, a hint in the builder */
    const none = {instagram: '', tiktok: '#', youtube: ''};
    const s = await render(name, {editing: false, theme: none});
    ok(!s.html.includes('data-r7c-follow') && !s.html.includes('data-r7c-nohint'), name + ' no network set: no buttons and no hint on a visitor\'s page');
    const e = await render(name, {editing: true, theme: none});
    ok(!e.html.includes('data-r7c-follow') && /data-r7c-nohint>Add your social links in Theme settings &gt; Social media/.test(e.html), name + ' no network set: a hint in the builder');
    const tab = await render(name, {editing: false, theme: {...NET, social_open_new_tab: true}});
    ok((tab.html.match(/target="_blank" rel="noopener"/g) || []).length === 3, name + ' Open social links in a new tab is followed');
    const all = await render(name, {editing: false, theme: Object.fromEntries(['facebook', 'instagram', 'twitter', 'youtube', 'tiktok', 'pinterest', 'vimeo', 'linkedin', 'whatsapp', 'tumblr', 'snapchat', 'social_threads', 'social_x', 'social_telegram', 'social_discord', 'social_spotify', 'social_reddit'].map(k => [k, 'https://example.test/' + k]))});
    eq((all.html.match(/data-r7c-net=/g) || []).length, 17, name + ' every network of Theme settings > Social media has its button');
    eq((all.html.match(/<span class="r7c__ficon"><svg/g) || []).length, 17, name + ' and its icon');
  }
}

/* With scripts off (a library card, a visitor without scripts): everything is drawn; the row still scrolls. */
async function scriptsOff(browser, name) {
  for (const width of [390, 1366]) {
    const r = await render(name, {editing: false, theme: NET, blocks: presetBlocks(name)});
    const ctx = await browser.newContext({javaScriptEnabled: false, viewport: {width, height: 900}});
    const page = await ctx.newPage();
    await page.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><html><head><style>' + THEME_VARS + read('shopify/assets/theme-button-contract.css') + read('shopify/assets/' + CSS_FILE) + '</style></head><body><div id="shopify-section-x" class="shopify-section">' + r.html + '</div></body></html>'}));
    await page.goto('http://theme.test/');
    const tag = name + ' scripts off @' + width;
    ok(await page.locator(H).isVisible() && await page.locator(SUB).isVisible(), tag + ': heading and text are drawn');
    if (name === 'newsletter-split') ok(await page.locator(IN).isVisible() && await page.locator(BTN).isVisible() && await page.locator('[data-r7c-media] img').isVisible(), tag + ': the field, the button and the placeholder picture are drawn');
    else {
      ok(await page.locator(FB).first().isVisible() && await page.locator('[data-r7c-tile]').first().isVisible(), tag + ': follow buttons and pictures are drawn');
      if (width < 768) { await page.locator('[data-r7c-track]').evaluate(el => { el.scrollLeft = 400; }); ok(await page.locator('[data-r7c-track]').evaluate(el => el.scrollLeft > 0), tag + ': the row scrolls without scripts'); }
    }
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), tag + ': no sideways scroll');
    await ctx.close();
  }
}

/* ------------------------------------------------------------ the sign-up */
async function signup(browser) {
  const name = 'newsletter-split', {schema: sc, raw} = schemaOf(name);
  const def = list => Object.fromEntries((list || []).filter(x => x.id && x.default !== undefined).map(x => [x.id, x.default]));
  /* What Storelib draws for {% form 'customer' %}: the post goes to /contact. */
  const draw = async (settings, design) => {
    const e = engine(); e.registerFilter('script_tag', () => '');
    e.registerTag('form', {
      parse(tok, remain) { this.cls = (/class:\s*'([^']*)'/.exec(tok.args) || [])[1] || ''; this.data = [...tok.args.matchAll(/(data-[\w-]+):\s*'([^']*)'/g)].map(m => ` ${m[1]}="${m[2]}"`).join(''); this.tpls = []; const s = this.liquid.parser.parseStream(remain); s.on('tag:endform', () => s.stop()).on('template', t => this.tpls.push(t)).on('end', () => { throw new Error('unclosed form'); }); s.start(); },
      * render(ctx, em) { em.write(`<form method="post" action="/contact#contact_form" accept-charset="UTF-8" class="${this.cls}"${this.data}><input type="hidden" name="form_type" value="customer">`); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, em); em.write('</form>'); },
    });
    const section = {id: 'ns', settings: {...def(sc.settings), ...settings}, blocks: sc.presets[0].blocks.map((b, i) => ({id: 'ns' + i, type: b.type, settings: def(sc.blocks.find(x => x.type === b.type).settings)}))};
    const ctx = {section, settings: {scroll_animation: 'none'}, request: {design_mode: design}, shop: {name: 'Materia Themes'}};
    return e.parseAndRender(raw.split('<schema>')[0].replace(/^<template compat="shopify">/, '').replace(/<\/template>\s*$/, ''), ctx, {globals: ctx});
  };
  const css = [THEME_VARS, ...['critical.css', 'theme-button-contract.css', 'materia-forms.css', CSS_FILE].filter(f => fs.existsSync(path.join(__dirname, '../shopify/assets', f))).map(f => read('shopify/assets/' + f))].join('\n');
  let reply = {ok: true}, delay = 300, calls = [];
  const open = async (settings, {width = 375, design = false} = {}) => {
    const html = await draw(settings, design);
    const ctx = await browser.newContext({viewport: {width, height: 900}});
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('**/*', async r => {
      const req = r.request(), u = new URL(req.url());
      if (req.method() === 'POST' && u.pathname === '/contact') { calls.push(req.postData() || ''); await new Promise(res => setTimeout(res, delay)); return r.fulfill({status: reply.ok ? 200 : 422, contentType: 'application/json', body: JSON.stringify({form_type: 'customer', ...reply})}); }
      if (u.pathname === '/') return r.fulfill({contentType: 'text/html', body: `<!doctype html><html${design ? ' class="shopify-design-mode"' : ''}><head><meta name="viewport" content="width=device-width"><style>${css}</style></head><body><div id="shopify-section-ns" class="shopify-section">${html}</div><script>${read('shopify/assets/materia-forms.js')}</script><script>${read('shopify/assets/' + JS)}</script></body></html>`});
      return r.fulfill({status: 204, body: ''});
    });
    calls = [];
    await p.goto('http://materia.test/');
    await p.waitForFunction(() => window.materiaForms && window.MateriaR7Connect);
    return {p, ctx, errs};
  };
  const look = p => p.evaluate(() => {
    const f = document.querySelector('#shopify-section-ns form'), shown = el => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0;
    return {state: f.dataset.state || '', msgs: [...f.querySelectorAll('.r7c__msg')].filter(shown).map(el => el.textContent.trim()), label: shown(f.querySelector('[data-r7c-label]')), subscribed: shown(f.querySelector('[data-r7c-subscribed]')), spinner: shown(f.querySelector('.r7c__spinner')), toast: !!document.querySelector('.mt-toast[data-show]')};
  });
  const words = {success_text: 'Welcome in. The next letter is on its way.', error_text: 'Could not send it. Try again.', invalid_text: 'That address does not look right.', subscribed_button_text: 'On the list', success_duration: 2};
  {
    const {p, ctx, errs} = await open(words);
    ok(await p.evaluate(() => document.querySelectorAll('#shopify-section-ns input[name="company"]').length === 1), 'sign-up: one honeypot');
    await p.fill('#NewsletterSplitEmail-ns', 'not-an-address'); await p.click('#shopify-section-ns button[type=submit]'); await p.waitForTimeout(80);
    let l = await look(p);
    eq([calls.length, l.msgs], [0, [words.invalid_text]], 'sign-up: an address the field will not take shows the section\'s hint and sends nothing');
    await p.fill('#NewsletterSplitEmail-ns', 'test+r7@example.com'); await p.click('#shopify-section-ns button[type=submit]'); await p.waitForTimeout(60);
    l = await look(p);
    ok(l.state === 'sending' && l.spinner && !l.label, 'sign-up: sending shows the spinner in the button: ' + JSON.stringify(l));
    await p.waitForFunction(() => document.querySelector('#shopify-section-ns form').dataset.state === 'done', null, {timeout: 5000});
    l = await look(p);
    ok(calls.length === 1 && /test%2Br7%40example\.com|test\+r7@example\.com/.test(calls[0]) && /form_type=customer|name="form_type"/.test(calls[0]), 'sign-up: one post to /contact with the address');
    eq([l.msgs, l.subscribed, l.label, l.toast], [[words.success_text], true, false, false], 'sign-up: the section\'s thanks, once, the button reads its Subscribed words, no toast');
    await p.waitForTimeout(2700);
    l = await look(p);
    ok(l.label && !l.subscribed && l.msgs.length === 0, 'sign-up: after the section\'s time the button reads its label again: ' + JSON.stringify(l));
    eq(errs, [], 'sign-up errors');
    await ctx.close();
  }
  {
    reply = {ok: false, message: 'Server said no', code: 'server'};
    const {p, ctx, errs} = await open(words, {width: 1366});
    await p.fill('#NewsletterSplitEmail-ns', 'test+r7@example.com'); await p.click('#shopify-section-ns button[type=submit]');
    await p.waitForFunction(() => document.querySelector('#shopify-section-ns form').dataset.state === 'error', null, {timeout: 5000});
    const l = await look(p);
    eq([l.msgs, l.label], [[words.error_text], true], 'sign-up: a refused post shows the section\'s error words and the button its label');
    eq(errs, [], 'sign-up error errors');
    await ctx.close();
    reply = {ok: true};
  }
  {
    /* the builder: the success state is previewed (nothing is sent unless the creator asked for live sends) */
    const {p, ctx, errs} = await open(words, {design: true});
    await p.fill('#NewsletterSplitEmail-ns', 'test+r7@example.com'); await p.click('#shopify-section-ns button[type=submit]'); await p.waitForTimeout(300);
    const l = await look(p);
    eq([l.state, l.msgs, l.subscribed, calls.length], ['done', [words.success_text], true, 0], 'sign-up in the builder: the success state is shown and nothing is sent');
    eq(errs, [], 'sign-up builder errors');
    await ctx.close();
  }
}

/* ------------------------------------------------------------ the picture row */
async function row(browser) {
  const name = 'social-follow-cta';
  const blocks = [...presetBlocks(name), {type: 'image'}, {type: 'image'}];
  for (const dir of ['ltr', 'rtl']) {
    const r = await render(name, {editing: false, theme: NET, blocks});
    const ctx = await browser.newContext({viewport: {width: 375, height: 667}, hasTouch: true, isMobile: true, deviceScaleFactor: 2});
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.fulfill({contentType: 'text/html', body: `<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${THEME_VARS}${read('shopify/assets/theme-button-contract.css')}${read('shopify/assets/' + CSS_FILE)}</style></head><body><div style="height:300px"></div><div id="shopify-section-x" class="shopify-section">${r.html}</div><div style="height:1200px"></div><script>${read('shopify/assets/' + JS)}</script></body></html>`}));
    await page.goto('http://theme.test/');
    const tag = name + ' row ' + dir;
    const T = page.locator('[data-r7c-track]'), prev = page.locator('[data-r7c-prev]'), next = page.locator('[data-r7c-next]');
    await T.scrollIntoViewIfNeeded();
    const css = await T.evaluate(el => { const c = getComputedStyle(el); return [c.overflowX, c.scrollSnapType, c.overscrollBehaviorX, c.scrollbarWidth, c.touchAction, getComputedStyle(el.firstElementChild).scrollSnapAlign]; });
    eq(css, ['auto', 'x mandatory', 'contain', 'none', 'pan-x pan-y', 'start'], tag + ': a native scroller with snap points');
    const pos = () => T.evaluate(el => Math.abs(el.scrollLeft));
    const step = await T.evaluate(el => { const t = el.querySelectorAll('[data-r7c-tile]'); return Math.abs(t[1].getBoundingClientRect().left - t[0].getBoundingClientRect().left); });
    eq([await prev.isDisabled(), await next.isDisabled()], [true, false], tag + ': at the start, back is disabled');
    /* a finger swipe sideways moves the row and it snaps to a picture */
    const box = await T.boundingBox(), cdp = await ctx.newCDPSession(page);
    const y = Math.round(box.y + box.height / 2), x0 = Math.round(box.x + box.width * (dir === 'rtl' ? .2 : .8));
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x0, y}]});
    for (let d = 10; d <= 130; d += 10) { await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x0 + (dir === 'rtl' ? d : -d), y}]}); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await page.waitForTimeout(900);
    const p1 = await pos();
    ok(p1 > 20, tag + ': a finger swipe moves the row (' + p1 + ')');
    ok(Math.abs(p1 / step - Math.round(p1 / step)) < 0.05, tag + ': the row snaps to a picture (' + p1 + ' / ' + step + ')');
    ok(!(await prev.isDisabled()), tag + ': back is enabled once moved');
    /* the arrows and the keys move it one picture */
    await T.evaluate(el => { el.style.scrollBehavior = 'auto'; el.scrollLeft = 0; }); await page.waitForTimeout(150);
    await next.tap(); await page.waitForTimeout(700);
    ok(Math.abs(await pos() - step) < 3, tag + ': next moves one picture');
    await prev.tap(); await page.waitForTimeout(700);
    ok(await pos() < 3, tag + ': back moves one picture');
    await T.focus(); await page.keyboard.press(dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'); await page.waitForTimeout(700);
    ok(Math.abs(await pos() - step) < 3, tag + ': the forward arrow key moves one picture');
    await page.keyboard.press('End'); await page.waitForTimeout(800);
    eq([await prev.isDisabled(), await next.isDisabled()], [false, true], tag + ': at the end, next is disabled');
    await page.keyboard.press('Home'); await page.waitForTimeout(800);
    eq([await pos() < 2, await prev.isDisabled()], [true, true], tag + ': Home goes back to the start');
    eq(await T.evaluate(el => [getComputedStyle(el).outlineStyle, parseFloat(getComputedStyle(el).outlineWidth) >= 2]), ['solid', true], tag + ': the focused row shows a ring');
    /* a swipe up that starts on the row scrolls the page */
    const y0 = await page.evaluate(() => scrollY), b2 = await T.boundingBox(), xm = Math.round(b2.x + b2.width / 2), ym = Math.round(b2.y + b2.height / 2);
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: xm, y: ym}]});
    for (let d = 10; d <= 200; d += 10) { await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: xm, y: ym - d}]}); await page.waitForTimeout(8); }
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await page.waitForTimeout(400);
    ok(await page.evaluate(() => scrollY) - y0 >= 120, tag + ': a vertical swipe on the row scrolls the page');
    eq(await page.evaluate(() => [scrollX, document.documentElement.scrollWidth <= innerWidth + 1]), [0, true], tag + ': no sideways page scroll');
    /* a tap on a follow button is a link tap */
    eq(await page.locator(FB).first().evaluate(el => [el.tagName, el.getAttribute('href')]), ['A', NET.instagram], tag + ': a follow button is a link');
    eq(errors, [], tag + ' errors');
    await ctx.close();
  }
  /* the builder picks a picture block: it comes into view in the row */
  const t = await mount(browser, name, opts(name, {width: 375, editing: true, blocks}));
  await t.page.addStyleTag({content: STILL});
  const last = 'test-b' + (blocks.length - 1);
  await t.page.evaluate(id => document.querySelector('[data-r7c-block="' + id + '"]').dispatchEvent(new CustomEvent('shopify:block:select', {bubbles: true, detail: {blockId: id}})), last);
  await t.page.waitForTimeout(150);
  ok(await t.page.evaluate(id => { const el = document.querySelector('[data-r7c-block="' + id + '"]'), tr = el.closest('[data-r7c-track]'); const a = el.getBoundingClientRect(), b = tr.getBoundingClientRect(); return a.left >= b.left - 1 && a.left < b.right; }, last), name + ' block select brings the picture into view');
  eq(await t.page.evaluate(() => document.querySelector('[data-r7c-next]').disabled), true, name + ' and the arrows follow');
  eq(t.errors, [], name + ' block select errors');
  await t.page.close();
}

/* ------------------------------------------------------------ reveal and reduced motion */
async function motion(browser, name) {
  const on = await render(name, {editing: false, theme: {...NET, scroll_animation: 'fade-in'}, settings: {reveal: true}});
  const off = await render(name, {editing: false, theme: {...NET, scroll_animation: 'fade-in'}, settings: {reveal: false}});
  ok(on.scripts.some(s => s.includes("classList.add('scroll-trigger'")) && !on.html.includes('data-ti-no-reveal'), name + ' Reveal on scroll: follows the theme reveal');
  ok(!off.scripts.some(s => s.includes('scroll-trigger')) && off.html.includes('data-ti-no-reveal'), name + ' Reveal on scroll off: no theme reveal');
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const t = await mount(browser, name, opts(name, {width: 375, editing: true, theme: {...NET, scroll_animation: 'fade-in'}, settings: {reveal: true}, reducedMotion}));
    await t.page.waitForTimeout(200);
    ok(await t.root(R).evaluate(el => { for (let n = el; n; n = n.parentElement) if (+getComputedStyle(n).opacity < 1 || getComputedStyle(n).visibility === 'hidden') return false; return true; }), name + ' ' + reducedMotion + ': never hidden in the builder');
    if (name === 'social-follow-cta') {
      const r = await t.root('[data-r7c-track]').evaluate(el => [getComputedStyle(el).scrollBehavior, getComputedStyle(el.querySelector('.r7c__tile-img')).transitionDuration, getComputedStyle(document.querySelector('.r7c__arrow')).transitionDuration]);
      if (reducedMotion === 'reduce') eq([r[0], /^0s(, 0s)*$/.test(r[1]), /^0s(, 0s)*$/.test(r[2])], ['auto', true, true], name + ' reduced motion: the row jumps, nothing transitions');
      else { eq(r[0], 'smooth', name + ' the row glides'); ok(Math.max(...r[1].split(',').map(parseFloat)) * 1000 >= 150 && Math.max(...r[1].split(',').map(parseFloat)) * 1000 <= 400, name + ' picture hover in 150 to 400ms'); }
    } else {
      const d = await t.root('.r7c__spinner').evaluate(el => getComputedStyle(el).animationPlayState);
      eq(d, 'paused', name + ' ' + reducedMotion + ': the spinner waits for a sign-up');
    }
    eq(t.errors, [], name + ' motion errors');
    await t.page.close();
  }
}

(async () => {
  const only = process.argv.slice(2), names = NAMES.filter(n => !only.length || only.includes(n));
  const parts = (process.env.PART || '').split(',').filter(Boolean), part = p => !parts.length || parts.includes(p);
  const browser = await launch();
  try {
    for (const n of names) schema(n);
    const covered = {};
    if (part('controls')) await Promise.all(names.map(async n => { for (const w of [375, 1366]) covered[n] = await everyControl(browser, n, w); }));
    if (part('theme')) await Promise.all(names.map(async n => { for (const w of [375, 1366]) for (const e of [true, false]) await theme(browser, n, w, e); }));
    if (part('priority')) await Promise.all(names.map(async n => { for (const c of priorityCases(n)) for (const w of [375, 1366]) for (const e of [true, false]) await priority(browser, c, w, e); await priorityOff(browser, n); }));
    if (part('instances')) await Promise.all(names.map(n => instances(browser, n)));
    if (part('contents')) for (const n of names) await contents(browser, n);
    if (part('off')) for (const n of names) await scriptsOff(browser, n);
    if (part('signup') && names.includes('newsletter-split')) await signup(browser);
    if (part('row') && names.includes('social-follow-cta')) await row(browser);
    if (part('motion')) for (const n of names) await motion(browser, n);
    console.log(checks + ' round 7 Contact and Social checks passed (controls covered: ' + Object.entries(covered).map(([n, c]) => n + ' ' + c).join(', ') + ')');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
