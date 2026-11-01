/* Round 5, Countdowns: Countdown Timer Flip (countdown-flip), Inline
   (countdown-inline) and Pro 1, 2, 3 (countdown-timer1, -timer2, -timer3),
   run by shopify/assets/live-countdown.js.

   Schema (shared order, no HTML tag pickers, the date rule in each section
   the same as the controller's); every non-hidden section and block control,
   live and after a server redraw, at 375 and 1366 (and the tablet or wide
   width where a control only shows there), changing its own element, at the
   right width only, select options all different, markup equal to what the
   controller derives; theme inheritance, colour schemes, custom styling and
   fonts on and off, first paint equal to hydrated paint (editor and
   storefront); the timers (one tick a second at most, paused off screen and
   in a hidden tab, right at once when back, live date edits, restart, the
   per-visitor loop, ended and unset states, impossible dates, editor hint);
   two instances; redraws and added blocks; reduced motion and the reveal.
   Priority (custom fonts, weights, line heights, button shape over the
   theme's priority rules): tests/theme-r5-countdown-priority.cjs.

   LIQUIDJS=<path to liquidjs> node tests/theme-r5-countdown.cjs [section ...] */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'live-countdown.js';
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'}, MONO = {family: 'Courier New', fallback_families: 'monospace'};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const clone = o => JSON.parse(JSON.stringify(o));
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* dates on the visitor's clock (the fixture browser and this process share it) */
const pad = n => String(n).padStart(2, '0');
const at = ms => { const d = new Date(Date.now() + ms); return {d, iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`, date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, mdy: `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`}; };
const DAY = 86400000, FUTURE = at(3 * DAY + 5 * 3600000), PAST = at(-2 * DAY);
const H12 = d => { const h = d.getHours() % 12 || 12, m = d.getMinutes(); return h + (m ? ':' + pad(m) : '') + (d.getHours() < 12 ? 'am' : 'pm'); };
/* the timer3 end time is a list of half hours: pick a date and one of them */
const T3 = ms => { const d = new Date(Date.now() + ms); d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0); return {end_date: `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`, end_time: H12(d), d}; };

/* Per section: where its date lives, its class prefix, its breakpoint and controls that only show at one width. */
const CFG = {
  'countdown-flip': {p: 'cdf', bp: 768, date: ms => ({end_iso: at(ms).iso}), bad: {end_iso: '2026-02-30T10:00:00'},
    desk: ['gap_subheading_clock'], vw: {section_max_width_tablet: 900, section_width: 1700}, vals: {section_max_width_mobile: [280], card_shadow: ['0 0 0 4px rgb(255, 0, 0)']},
    mobNoop: [], same: {375: [['all', 'mobile']], 1366: [['all', 'desktop']], 1700: []}, H: '.cdf__heading', T: '.cdf__sub', btn: '.cdf__cta'},
  'countdown-inline': {p: 'cin', bp: 768, date: ms => ({end_iso: at(ms).iso}), bad: {end_iso: '2026-04-31T10:00:00'},
    desk: ['gap_inline', 'bar_radius'], vw: {section_max_width_tablet: 900, section_width: 1700}, vals: {section_max_width_mobile: [280]},
    mobNoop: [], same: {375: [['all', 'mobile']], 1366: [['all', 'desktop']], 1700: []}, T: '.cin__message', btn: '.cin__cta'},
  'countdown-timer1': {p: 'cd1', bp: 801, date: () => ({}), loop: true,
    desk: ['text_alignment', 'timer_alignment', 'item_width', 'grid_gap', 'timer_size', 'label_size', 'section_padding_top', 'section_padding_bottom', 'section_padding_left_right', 'container_padding_top', 'container_padding_bottom', 'container_padding_left_right', 'headline_size', 'text_size'],
    vw: {section_width: 1700}, vals: {container_max_width: [300]}, mobNoop: [], same: {375: [['all', 'mobile']], 1366: [['all', 'desktop']], 1700: [['stretch_width', 'full_width']]}, sameAll: [['theme', 'bold']], H: '.cd1__heading', T: '.cd1__sub'},
  'countdown-timer2': {p: 'ti-cd', bp: 768, date: ms => { const x = at(ms); return {end_date: x.date, end_time: x.time}; }, bad: {end_date: '2027-02-29'},
    desk: ['layout_direction', 'vertical_alignment', 'gap_columns', 'padding_top', 'padding_bottom', 'button_font_size'], mob: ['content_alignment_mobile'],
    vw: {section_width: 1700}, vals: {}, mobNoop: [], same: {375: [], 1366: [], 1700: [['stretch_width', 'full_width']]}, H: '.ti-cd__heading', T: '.ti-cd__description', btn: '.ti-cd__button'},
  'countdown-timer3': {p: 'cd3', bp: 992, blockDate: true, date: ms => T3(ms), bad: {end_date: '02-30-2027'},
    desk: ['timer_position_desktop', 'text_alignment', 'vertical_padding', 'vertical_margin', 'inner_width', 'section_max_width'], mob: ['timer_position_mobile', 'text_alignment_mobile'],
    vw: {section_width: 1700}, vals: {section_max_width: ['300']}, mobNoop: [], same: {375: [], 1366: [], 1700: [['stretch_width', 'full_width']]}, H: '.cd3__heading', T: '.cd3__description', btn: '[data-cd-btn]'},
};
/* timing, reveal and ended settings: checked on their own below */
const OWN = ['end_iso', 'end_date', 'end_time', 'restart_period', 'start_hours', 'start_minutes', 'start_seconds', 'hide_section', 'reveal', 'scroll_animation'];
const STRUCTURAL = ['reset_spacing'];
const PRE = {reset_spacing: {section_margin_top_mobile: 20, section_margin_top_desktop: 20}};
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);
/* the section's settings and blocks with a running date */
function dated(name, ms = 3 * DAY + 5 * 3600000) {
  const cfg = CFG[name], blocks = presetBlocks(name);
  if (cfg.blockDate) { const tb = blocks.find(b => b.type === 'timer'); const {end_date, end_time} = cfg.date(ms); tb.settings = {...(tb.settings || {}), end_date, end_time}; return {settings: {}, blocks}; }
  return {settings: cfg.date(ms), blocks};
}

function valuesFor(x, cur = x.default) {
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'text_alignment': return ['left', 'center', 'right'].filter(v => v !== cur);
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
  for (const y of list) if (y.type === 'font_picker') out[y.id] = MONO;
  return out;
}

async function addFp(page) {
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'backgroundImage', 'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'textTransform', 'textDecorationLine', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap', 'alignItems', 'justifyContent', 'flexDirection', 'borderTopLeftRadius', 'borderTopWidth', 'borderTopColor', 'display', 'boxShadow', 'width', 'height', 'maxWidth', 'gridAutoColumns', 'webkitTextFillColor'];
    const PS = ['content', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'filter', 'height'];
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-cd-root]'), out = {}, seen = {};
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.tagName === 'STYLE' || e.closest('template')) continue;
        const cls = typeof e.className === 'string' ? e.className : '';
        let k = (e.dataset && e.dataset.cdBlock) || e.tagName + '.' + (cls.split(' ')[0] || '');
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const q of P) o[q] = cs[q];
        o.backgroundImage = o.backgroundImage.replace(/\?[^")]*/g, '');
        o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
        if (e.hasAttribute('data-cd-unit')) { delete o.width; o.rect = r.width || r.height ? [r.y - r0.y, r.height].map(Math.round).join(',') : 'none'; }
        if (!e.hasAttribute('data-cd-unit') && (!e.children.length || /^(H\d|P|A|BUTTON|SPAN)$/.test(e.tagName))) o.text = e.hasAttribute('data-cd-unit') ? '' : e.textContent.replace(/\d{2}/g, e.closest('[data-cd-clock]') ? '##' : '$&').trim().slice(0, 80);
        if (e.matches('[data-theme-button]')) for (const v of ['--mb-hover-bg', '--mb-hover-text']) o[v] = cs.getPropertyValue(v).trim();
        o.tag = e.tagName; o.hidden = e.hidden;
        for (const a of ['href', 'target', 'data-theme-button', 'data-button-appearance', 'type']) o[a] = e.getAttribute(a);
        for (const pse of ['::before', '::after']) { const a = getComputedStyle(e, pse); if (a.content !== 'none') o[pse] = PS.map(q => String(a[q]).replace(/\?[^")]*/g, '')).join('|'); }
        o.blk = e.closest('[data-cd-block]')?.dataset.cdBlock || '';
        out[k] = o;
      }
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, blk: ''};
      return out;
    };
  });
}
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaCountdown.audit(document.querySelector('#shopify-section-' + u + ' [data-cd-root]')), uid);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const show = (a, b, keys) => keys.slice(0, 4).map(k => k + ' ' + JSON.stringify(Object.fromEntries(Object.entries(b[k] || {}).filter(([q, v]) => JSON.stringify(v) !== JSON.stringify((a[k] || {})[q]))))).join('; ');
const still = page => page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});

/* Every non-hidden control, section and block: live, then redraw. */
async function everyControl(browser, name, width) {
  const cfg = CFG[name], {schema} = schemaOf(name), start = dated(name);
  const t = await mount(browser, name, {width, editing: true, settings: start.settings, blocks: start.blocks, assets: [ASSET]});
  await addFp(t.page); await still(t.page);
  const base = clone(t.section.settings);
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && !OWN.includes(x.id)) cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks || []) {
    const i = baseBlocks.findIndex(b => b.type === bt.type);
    for (const x of bt.settings || []) if (x.id && !x.hidden && !OWN.includes(x.id)) { assert.ok(i >= 0, name + ': no preset block ' + bt.type); cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  }
  const covered = new Set();
  for (const c of cases) {
    const {x} = c, key = (c.btype ? c.btype + '.' : '') + x.id, vw = (cfg.vw || {})[x.id];
    if (vw && width !== 1366) continue;
    if (vw) await t.page.setViewportSize({width: vw, height: 900});
    const W = vw || width, bp = cfg.bp;
    const blocks0 = clone(baseBlocks), S = clone(base), bi = c.scope;
    const bBase = bi >= 0 ? blocks0[bi].settings : S;
    Object.assign(bBase, prereq(x, c.list, bBase), bi < 0 ? PRE[x.id] || {} : {});
    const blockId = bi >= 0 ? 'test-b' + bi : undefined;
    const isDesk = (cfg.desk || []).includes(x.id) || /_desktop$/.test(x.id) || (vw && W > 1366), isMob = (cfg.mob || []).includes(x.id) || /(_mobile$|^mobile_)/.test(x.id);
    const shows = !(isDesk && W < bp) && !(isMob && W >= bp) && !(vw && W < 1366 && W !== vw);
    await t.redraw({settings: S, blocks: blocks0}); await frames(t.page);
    const fp0 = await fp(t);
    eq(await audit(t), [], name + ' ' + key + ' base markup matches controller');
    const cur = bBase[x.id];
    const seen = [[JSON.stringify(cur ?? null), fp0]];
    const same = [...((cfg.same || {})[W] || []), ['theme', '700'], ...(cfg.sameAll || [])];
    for (const v of (cfg.vals || {})[x.id] || valuesFor(x, cur)) {
      const tag = name + ' @' + W + ' ' + key + '=' + JSON.stringify(v).slice(0, 40);
      await t.redraw({settings: S, blocks: blocks0}); await frames(t.page);
      await t.emit({[x.id]: v}, blockId); await frames(t.page);
      const fpL = await fp(t);
      const blocks1 = clone(blocks0); if (bi >= 0) blocks1[bi].settings[x.id] = v;
      await t.redraw({settings: bi >= 0 ? S : {...S, [x.id]: v}, blocks: blocks1}); await frames(t.page);
      const fpR = await fp(t);
      eq(await audit(t), [], tag + ': markup matches controller');
      const dR = diff(fp0, fpR), dL = diff(fp0, fpL);
      const quiet = x.type === 'select' && same.some(pair => pair.includes(v) && pair.includes(cur));
      if (shows && !quiet) {
        ok(dR.length > 0, tag + ': redraw changes nothing');
        if (bi >= 0) ok(dR.some(k => fpR[k]?.blk === blockId || fp0[k]?.blk === blockId), tag + ': does not change its own block (' + dR.slice(0, 4) + ')');
        if (bi < 0 && /^section_margin/.test(x.id)) ok(dR.includes('wrap'), tag + ': margin not on the section');
        if (!STRUCTURAL.includes(x.id)) eq(show(fpL, fpR, diff(fpL, fpR)), '', tag + ': live differs from redraw');
      } else if (!shows) {
        eq(dR, [], tag + ': changes at the wrong width (redraw) ' + show(fp0, fpR, dR));
        eq(dL, [], tag + ': changes at the wrong width (live) ' + show(fp0, fpL, dL));
      }
      if (shows) seen.push([JSON.stringify(v), fpR]);
      covered.add(key);
    }
    if ((x.type === 'select' || x.type === 'text_alignment') && shows) {
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
  const cfg = CFG[name], tag = name + ' @' + width + (editing ? ' editor' : ' storefront'), start = dated(name);
  const t = await mount(browser, name, {width, editing, settings: start.settings, blocks: start.blocks, assets: []});
  await addFp(t.page); await still(t.page);
  const before = await fp(t);
  await t.page.addScriptTag({content: read('shopify/assets/' + ASSET)});
  await t.page.waitForTimeout(150); await frames(t.page);
  eq(show(before, await fp(t), diff(before, await fp(t))), '', tag + ': first paint equals hydrated paint');
  eq(await audit(t), [], tag + ': markup matches controller');
  const R = '[data-cd-root]', bgEl = name === 'countdown-timer1' ? '.cd1' : R;
  eq(await t.root(R).evaluate(el => el.dataset.cdState), 'running', tag + ' running');
  ok(await t.root(R).isVisible(), tag + ' visible');
  eq(await t.css(bgEl, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' scheme background');
  if (cfg.H) { eq(await t.css(cfg.H, 'color'), 'rgb(255, 255, 255)', tag + ' heading colour'); ok(/^Georgia/.test(await t.css(cfg.H, 'fontFamily')), tag + ' heading font'); eq(await t.css(cfg.H, 'fontWeight'), '700', tag + ' heading weight'); }
  if (cfg.T) {
    const T = name === 'countdown-timer2' || name === 'countdown-flip' || name === 'countdown-timer3' ? cfg.T + ' p' : cfg.T;
    if (name !== 'countdown-inline') eq(await t.css(T, 'color'), 'rgb(204, 204, 204)', tag + ' text colour');
    ok(/^Arial/.test(await t.css(T, 'fontFamily')), tag + ' text font');
  }
  if (cfg.btn) {
    const B = cfg.btn;
    eq(await t.css(B, 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' button colour');
    ok(/^Arial/.test(await t.css(B, 'fontFamily')), tag + ' button font');
    await t.root(B).first().hover(); await t.page.waitForTimeout(60);
    eq(await t.root(B).first().evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgb(255, 0, 0)', tag + ' button hover');
    await t.page.mouse.move(0, 0);
    ok((await t.root(B).first().boundingBox()).height >= 44, tag + ' button target');
  }
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  if (editing) {
    await t.emit({color_scheme: 'alt-scheme'}); await frames(t.page);
    eq(await t.css(bgEl, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme live');
    if (cfg.H) eq(await t.css(cfg.H, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await t.css(bgEl, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    /* custom styling on: the section background; off: everything back */
    const bgKey = {'countdown-flip': 'section_bg', 'countdown-inline': 'section_bg', 'countdown-timer1': 'section_background_color', 'countdown-timer2': null, 'countdown-timer3': 'section_background'}[name];
    if (bgKey) {
      await t.emit({enable_custom_style: true, [bgKey]: '#abcdef'}); await frames(t.page);
      eq(await t.css(bgEl, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background live');
      await t.redraw({settings: {enable_custom_style: true, [bgKey]: '#abcdef'}});
      eq(await t.css(bgEl, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background redraw');
      await t.emit({enable_custom_style: false}); await frames(t.page);
      eq(await t.css(bgEl, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' custom background off restores the theme');
      await t.redraw({settings: {enable_custom_style: false}});
    }
    if (name === 'countdown-timer2') {
      await t.emit({enable_custom_style: true, circle_bg_color: '#abcdef'}); await frames(t.page);
      eq(await t.css('.ti-cd__num', 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom circle');
      await t.emit({enable_custom_style: false}); await frames(t.page);
      eq(await t.css('.ti-cd__num', 'backgroundColor'), 'rgb(255, 255, 255)', tag + ' circle back to the scheme heading colour');
    }
    if (cfg.btn) {
      const bt = name === 'countdown-timer2' || name === 'countdown-timer3' ? t.blockId('button') : undefined;
      const on = name === 'countdown-timer2' ? {enable_custom_style: true, button_bg_color: '#00ff00', button_hover_bg_color: '#0000ff'} : name === 'countdown-timer3' ? {enable_custom_style: true, primary_background_color: '#00ff00'} : {enable_custom_style: true, cta_bg: '#00ff00', cta_bg_hover: '#0000ff'};
      await t.emit(on, bt); await frames(t.page);
      eq(await t.css(cfg.btn, 'backgroundColor'), 'rgb(0, 255, 0)', tag + ' custom button');
      await t.emit({enable_custom_style: false}, bt); await frames(t.page);
      eq(await t.css(cfg.btn, 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' theme button back');
    }
    await t.emit({enable_custom_fonts: true, heading_font: FONT, body_font: MONO}); await frames(t.page);
    if (cfg.H) ok(/^Verdana/.test(await t.css(cfg.H, 'fontFamily')), tag + ' custom heading font');
    ok(/^"?(Verdana|Courier New)/.test(await t.css('[data-cd-unit]', 'fontFamily')), tag + ' custom number font');
    await t.redraw({settings: {enable_custom_fonts: true, heading_font: FONT, body_font: MONO}});
    if (cfg.H) ok(/^Verdana/.test(await t.css(cfg.H, 'fontFamily')), tag + ' custom heading font redraw');
    await t.emit({enable_custom_fonts: false}); await frames(t.page);
    if (cfg.H) ok(/^Georgia/.test(await t.css(cfg.H, 'fontFamily')), tag + ' theme heading font back');
    await t.redraw({settings: {enable_custom_fonts: false}}); await frames(t.page);
    const back = await fp(t);
    eq(show(before, back, diff(before, back).filter(k => k !== 'wrap')), '', tag + ': toggles off restore the theme exactly');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

/* The timers. */
const state = (t, uid = 'test') => t.page.evaluate(u => { const r = document.querySelector('#shopify-section-' + u + ' [data-cd-root]'); return {state: r.dataset.cdState, digits: [...r.querySelectorAll('[data-cd-unit]')].map(e => e.dataset.cdUnit + e.textContent).join(' '), visible: r.getBoundingClientRect().height > 0 && getComputedStyle(r).display !== 'none'}; }, uid);
const secondsLeft = s => { const m = {}; for (const p of s.digits.split(' ')) m[p[0]] = +p.slice(1); return (m.d || 0) * 86400 + (m.h || 0) * 3600 + (m.m || 0) * 60 + (m.s || 0); };
async function timers(browser, name) {
  const cfg = CFG[name], tag = name;
  /* running: ticks once a second at most, the time left is right */
  {
    const ms = 2 * DAY + 3 * 3600000 + 125000, st = dated(name, ms);
    const t = await mount(browser, name, {width: 375, editing: false, settings: st.settings, blocks: st.blocks, assets: [ASSET]});
    const s0 = await state(t);
    eq(s0.state, 'running', tag + ' running');
    if (!cfg.loop) {
      const want = cfg.blockDate ? Math.floor((st.blocks.find(b => b.type === 'timer').settings && T3(ms).d - Date.now()) / 1000) : Math.floor(ms / 1000);
      ok(Math.abs(secondsLeft(s0) - want) <= 70, tag + ' time left is right: ' + s0.digits + ' vs ' + want + 's');
    } else eq(s0.digits.replace(/\d+/g, '#'), 'h# m# s#', tag + ' hours, minutes, seconds');
    const t0 = await t.page.evaluate(() => [...window.MateriaCountdown.roots.values()][0].ticks);
    await t.page.waitForTimeout(3200);
    const t1 = await t.page.evaluate(() => [...window.MateriaCountdown.roots.values()][0].ticks), s1 = await state(t);
    ok(t1 - t0 >= 2 && t1 - t0 <= 4, tag + ' ticks once a second (' + (t1 - t0) + ' in 3.2s)');
    ok(secondsLeft(s1) < secondsLeft(s0), tag + ' counts down: ' + s0.digits + ' then ' + s1.digits);
    eq(await t.page.evaluate(() => window.MateriaCountdown.pending()), 1, tag + ' one timer pending');
    /* off screen: paused; back: right at once */
    await t.page.evaluate(() => { const s = document.createElement('div'); s.id = 'spacer'; s.style.height = '4000px'; document.body.prepend(s); });
    await t.page.waitForTimeout(250);
    eq(await t.page.evaluate(() => window.MateriaCountdown.pending()), 0, tag + ' paused off screen');
    const p0 = await t.page.evaluate(() => [...window.MateriaCountdown.roots.values()][0].ticks);
    await t.page.waitForTimeout(1300);
    eq(await t.page.evaluate(() => [...window.MateriaCountdown.roots.values()][0].ticks), p0, tag + ' no ticks off screen');
    if (name === 'countdown-inline') { await t.page.evaluate(() => {}); ok(await t.root('[data-cd-root]').evaluate(el => el.hasAttribute('data-cd-paused') && getComputedStyle(el.querySelector('.cin__eyebrow-dot')).animationPlayState === 'paused'), tag + ' pulsing dot paused off screen'); }
    await t.page.evaluate(() => document.getElementById('spacer').remove());
    await t.page.waitForTimeout(200);
    const s2 = await state(t);
    ok(secondsLeft(s2) <= secondsLeft(s1) - 1, tag + ' right at once when back: ' + s1.digits + ' then ' + s2.digits);
    eq(await t.page.evaluate(() => window.MateriaCountdown.pending()), 1, tag + ' running again on screen');
    /* hidden tab */
    await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
    eq(await t.page.evaluate(() => window.MateriaCountdown.pending()), 0, tag + ' paused in a hidden tab');
    await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange')); });
    eq(await t.page.evaluate(() => window.MateriaCountdown.pending()), 1, tag + ' running when the tab is back');
    eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
  if (cfg.loop) {
    /* Pro 1: a fixed time per visitor that starts again, kept per section; a new time starts it again */
    const t = await mount(browser, name, {width: 1366, editing: true, settings: {start_hours: 0, start_minutes: 0, start_seconds: 3}, assets: [ASSET]});
    const a = await state(t);
    ok(secondsLeft(a) <= 3 && secondsLeft(a) >= 2, tag + ' starts from the set time: ' + a.digits);
    await t.page.waitForTimeout(3600);
    const b = await state(t);
    ok(secondsLeft(b) >= 1 && secondsLeft(b) <= 3 && b.state === 'running', tag + ' starts again when it runs out: ' + b.digits);
    ok(await t.page.evaluate(() => !!localStorage.getItem('loudecomzCountdownTarget_test')), tag + ' kept for the visitor');
    await t.redraw({settings: {start_hours: 0, start_minutes: 0, start_seconds: 3}});
    const c = await state(t);
    ok(Math.abs(secondsLeft(c) - secondsLeft(await state(t))) <= 1 && secondsLeft(c) <= 3, tag + ' a redraw keeps the visitor\'s time');
    await t.emit({start_hours: 2, start_minutes: 30}); await frames(t.page);
    const d = await state(t);
    ok(secondsLeft(d) > 2 * 3600 + 29 * 60 && secondsLeft(d) <= 2 * 3600 + 30 * 60 + 3, tag + ' a new time starts it again (live): ' + d.digits);
    await t.emit({show_seconds: false}); await frames(t.page);
    eq(await t.root('[data-cd-show="s"]').isVisible(), false, tag + ' seconds hidden live');
    eq(t.errors, [], tag + ' loop errors');
    await t.page.close();
    return;
  }
  /* ended, unset and impossible dates; editor and storefront */
  for (const editing of [true, false]) {
    const m = editing ? 'editor' : 'storefront';
    const past = dated(name, -2 * DAY);
    const extra = name === 'countdown-timer3' ? {hide_section: true} : {};
    const t = await mount(browser, name, {width: 375, editing, settings: {...past.settings, ...extra}, blocks: past.blocks, assets: [ASSET]});
    const e = await state(t);
    eq(e.state, 'expired', tag + ' ' + m + ' ended');
    ok(/^(\w0+ ?)+$/.test(e.digits), tag + ' ' + m + ' stops at zero: ' + e.digits);
    eq(await t.page.evaluate(() => window.MateriaCountdown.pending()), 0, tag + ' ' + m + ' no timer once ended');
    if (name === 'countdown-flip' || name === 'countdown-inline') {
      ok(!(await t.root('[data-cd-clock]').isVisible()), tag + ' ' + m + ' clock hidden when ended');
      ok(await t.root('[data-cd-expired]').isVisible(), tag + ' ' + m + ' ended message shown');
      eq((await t.root('[data-cd-expired]').textContent()).trim(), 'This offer has ended.', tag + ' ended message text');
      await t.emit({expired_message: 'All gone'}); await frames(t.page);
      eq((await t.root('[data-cd-expired]').textContent()).trim(), 'All gone', tag + ' ended message live');
    }
    if (name === 'countdown-timer3') {
      if (editing) { ok(await t.root('[data-cd-expired]').isVisible(), tag + ' editor shows the ended message'); eq((await t.root('[data-cd-expired]').textContent()).trim(), 'This offer has ended.', tag + ' ended message text'); }
      eq(e.visible, editing, tag + ' ' + m + ' Hide section when ended: ' + (editing ? 'still shown in the builder' : 'hidden for visitors'));
      await t.emit({hide_section: false}); await frames(t.page);
      ok((await state(t)).visible, tag + ' ' + m + ' shown with Hide section when ended off');
      ok(await t.root('[data-cd-expired]').isVisible(), tag + ' ' + m + ' ended message shown');
    }
    if (name === 'countdown-timer2') {
      ok(e.visible, tag + ' ' + m + ' stays at zero');
      await t.emit({restart_period: 'daily'}); await frames(t.page);
      const r = await state(t);
      eq(r.state, 'running', tag + ' ' + m + ' Start again every day runs again (live)');
      ok(secondsLeft(r) > 0 && secondsLeft(r) <= 86400, tag + ' ' + m + ' less than a day left: ' + r.digits);
      await t.emit({restart_period: 'weekly'}); await frames(t.page);
      ok(secondsLeft(await state(t)) > 86400 * 4, tag + ' ' + m + ' every week');
      await t.emit({restart_period: 'monthly'}); await frames(t.page);
      ok(secondsLeft(await state(t)) > 86400 * 20, tag + ' ' + m + ' every month');
    }
    /* a new date, live: right at once */
    const fut = cfg.date(2 * DAY + 3600000);
    if (cfg.blockDate) await t.emit(fut, t.blockId('timer')); else await t.emit(fut);
    await frames(t.page);
    const n = await state(t);
    eq(n.state, 'running', tag + ' ' + m + ' a new date runs (live)');
    ok(Math.abs(secondsLeft(n) - (cfg.blockDate ? Math.floor((T3(2 * DAY + 3600000).d - Date.now()) / 1000) : 2 * 86400 + 3600)) <= 70, tag + ' ' + m + ' new date right at once: ' + n.digits);
    eq(await t.page.evaluate(() => window.MateriaCountdown.pending()), 1, tag + ' ' + m + ' one timer');
    /* an impossible date: no timer; the editor shows a hint, visitors see nothing */
    if (cfg.blockDate) await t.emit(cfg.bad, t.blockId('timer')); else await t.emit(cfg.bad);
    await frames(t.page);
    const u = await state(t);
    eq(u.state, 'unset', tag + ' ' + m + ' impossible date: no timer');
    eq(u.visible, editing, tag + ' ' + m + ' impossible date: ' + (editing ? 'shown with a hint' : 'hidden'));
    if (editing) ok(await t.root('[data-cd-hint]').isVisible(), tag + ' hint shown');
    eq(await t.page.evaluate(() => window.MateriaCountdown.pending()), 0, tag + ' ' + m + ' no timer for an impossible date');
    /* the same through redraws: no date at all */
    const none = cfg.blockDate ? {blocks: presetBlocks(name)} : {settings: Object.fromEntries(Object.keys(cfg.bad).map(k => [k, '']))};
    await t.redraw(none);
    const z = await state(t);
    eq([z.state, z.visible], ['unset', editing], tag + ' ' + m + ' no date (redraw): ' + (editing ? 'editor shows zeros and a hint' : 'visitors see nothing'));
    eq(t.errors, [], tag + ' ' + m + ' errors');
    await t.page.close();
  }
}

/* Two instances; redraws; an added block. */
async function instances(browser, name) {
  const cfg = CFG[name];
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const a = dated(name, 5 * DAY), b = dated(name, 1 * DAY);
    const t = await mount(browser, name, {width, editing: true, instances: [{uid: 'a', ...a}, {uid: 'b', ...b}], assets: [ASSET]});
    await addFp(t.page); await still(t.page); await frames(t.page);
    const sa = await state(t, 'a'), sb = await state(t, 'b');
    if (!cfg.loop) ok(secondsLeft(sa) - secondsLeft(sb) > 3 * 86400, tag + ': each instance counts to its own date');
    const b0 = await fp(t, 'b');
    const hType = (schemaOf(name).schema.blocks || []).find(x => ['heading', 'caption'].includes(x.type)).type, hText = {heading: {'countdown-timer1': 'headline', 'countdown-timer2': 'heading', 'countdown-timer3': 'heading'}[name] || 'text'}[hType] || 'text';
    await t.emit({enable_custom_style: true, padding_top_mobile: 12, padding_top_desktop: 12, section_padding_top: 12, mobile_section_padding_top: 12, padding_top: 12, vertical_padding: 3, vertical_padding_mobile: 3}, undefined, 'a');
    await t.emit({[hText]: 'Only in A'}, t.blockId(hType, 0, 'a'), 'a'); await frames(t.page);
    eq(diff(b0, await fp(t, 'b')), [], tag + ': an edit to one instance leaves the other alone');
    eq((await t.page.locator('#shopify-section-a [data-cd-type="' + hType + '"]').textContent()).trim(), 'Only in A', tag + ' heading A live');
    if (!cfg.loop) {
      const fut = cfg.date(DAY / 2);
      if (cfg.blockDate) await t.emit(fut, t.blockId('timer', 0, 'a'), 'a'); else await t.emit(fut, undefined, 'a');
      await frames(t.page);
      ok(secondsLeft(await state(t, 'a')) < 86400 && secondsLeft(await state(t, 'b')) > 86400 - 120, tag + ': a date edit in one instance leaves the other timer alone');
    }
    /* redraws: one controller entry and one timer per root */
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
    await frames(t.page);
    eq(await t.page.evaluate(() => window.MateriaCountdown.roots.size), 2, tag + ': redraws leave one controller per section');
    eq(await t.page.evaluate(() => window.MateriaCountdown.pending()), 2, tag + ': redraws leave one timer per section');
    const ticks = await t.page.evaluate(() => [...window.MateriaCountdown.roots.values()].map(s => s.ticks));
    await t.page.waitForTimeout(2100);
    const ticks2 = await t.page.evaluate(() => [...window.MateriaCountdown.roots.values()].map(s => s.ticks));
    ok(ticks2.every((n, i) => n - ticks[i] >= 1 && n - ticks[i] <= 3), tag + ': each timer ticks once a second after redraws (' + ticks + ' -> ' + ticks2 + ')');
    /* an added block is drawn and live */
    const extra = {'countdown-flip': null, 'countdown-inline': {type: 'eyebrow', settings: {text: 'Added chip'}}, 'countdown-timer1': {type: 'subheading', settings: {text: 'Added text'}}, 'countdown-timer2': {type: 'button', settings: {button_label: 'Added text'}}, 'countdown-timer3': {type: 'text', settings: {description: '<p>Added text</p>'}}}[name];
    if (extra) {
      const nb = [...t.rendered.find(r => r.section.id === 'a').section.blocks.map(x => ({type: x.type, settings: x.settings})), extra];
      await t.redraw({uid: 'a', blocks: nb}); await frames(t.page);
      const added = 'a-b' + (nb.length - 1), key = Object.keys(extra.settings)[0];
      ok((await t.page.locator('[data-cd-block="' + added + '"]').textContent()).includes(extra.settings[key].replace(/<[^>]+>/g, '')), tag + ' added block drawn');
      await t.emit({[key]: key === 'description' ? '<p>Edited added</p>' : 'Edited added'}, added, 'a'); await frames(t.page);
      ok((await t.page.locator('[data-cd-block="' + added + '"]').textContent()).includes('Edited added'), tag + ' added block live');
    }
    eq(await audit(t, 'a'), [], tag + ' audit after edits'); eq(await audit(t, 'b'), [], tag + ' audit b');
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* Reduced motion; the reveal (Pro 2's own, Pro 1 and 3 the theme's); never hidden in the builder. */
async function motion(browser, name) {
  const cfg = CFG[name], st = dated(name);
  for (const reducedMotion of ['no-preference', 'reduce']) {
    const own = name === 'countdown-timer2' ? {reveal: true, scroll_animation: 'blur_up'} : {};
    const t = await mount(browser, name, {width: 375, height: 700, editing: false, settings: {...st.settings, ...own}, blocks: st.blocks, assets: [ASSET], reducedMotion});
    await t.page.waitForTimeout(250);
    if (name === 'countdown-timer2') {
      const c = t.root('[data-cd-reveal]');
      ok(await c.count() === 1, name + ' reveal marked on the storefront');
      ok(await c.evaluate(el => el.classList.contains('is-revealed')), name + ' ' + reducedMotion + ': revealed once in view');
      await t.page.waitForTimeout(900);
      eq(await c.evaluate(el => getComputedStyle(el).opacity), '1', name + ' ' + reducedMotion + ': fully visible');
      if (reducedMotion === 'reduce') {
        await t.page.waitForTimeout(1100);
        eq(await t.root('[data-cd-unit="s"]').evaluate(el => getComputedStyle(el).animationName), 'none', name + ' reduced motion: no pulse on the seconds');
      } else {
        await t.page.waitForTimeout(1100);
        ok(await t.root('[data-cd-unit="s"]').evaluate(el => el.classList.contains('is-tick')), name + ' the seconds circle pulses');
      }
    }
    if (name === 'countdown-inline') eq(await t.root('.cin__eyebrow-dot').evaluate(el => getComputedStyle(el).animationName), reducedMotion === 'reduce' ? 'none' : 'cin-pulse', name + ' ' + reducedMotion + ': pulsing dot');
    ok(await t.root('[data-cd-clock]').isVisible(), name + ' ' + reducedMotion + ': timer visible');
    eq(t.errors, [], name + ' motion errors');
    await t.page.close();
  }
  if (name === 'countdown-timer2') {
    const t = await mount(browser, name, {width: 375, editing: true, settings: {...st.settings, reveal: true, scroll_animation: 'blur_up'}, blocks: st.blocks, assets: [ASSET]});
    eq(await t.root('.ti-cd__inner-content').evaluate(el => getComputedStyle(el).opacity), '1', name + ' builder: never hidden for a reveal');
    ok(!(await t.root('[data-cd-reveal]').count()), name + ' builder: no reveal');
    await t.page.close();
    /* every reveal starts differently */
    const looks = [];
    for (const anim of ['fade-in', 'fade', 'slide-in', 'blur_up', 'slide_side', 'mask_reveal', 'smooth-fade-up']) {
      const u = await mount(browser, name, {width: 375, height: 300, editing: false, settings: {...st.settings, reveal: true, scroll_animation: anim, padding_top_mobile: 200}, blocks: st.blocks, assets: [], inlineScripts: false});
      looks.push([anim, await u.root('[data-cd-reveal]').evaluate(el => { const c = getComputedStyle(el); return [c.opacity, c.transform, c.filter, c.clipPath, c.transitionDuration].join('|'); })]);
      await u.page.close();
    }
    for (let i = 0; i < looks.length; i++) for (let j = i + 1; j < looks.length; j++) ok(looks[i][1] !== looks[j][1], name + ' reveals ' + looks[i][0] + ' and ' + looks[j][0] + ' differ');
  }
  if (name === 'countdown-timer1' || name === 'countdown-timer3') {
    /* the theme's reveal: Reveal on scroll off leaves the section out of it */
    for (const reveal of [true, false]) {
      const t = await mount(browser, name, {width: 375, editing: false, settings: {...st.settings, reveal}, blocks: st.blocks, assets: [ASSET], theme: {scroll_animation: 'fade-up', animation_duration: 700}});
      eq(await t.page.evaluate(() => document.getElementById('shopify-section-test').classList.contains('scroll-trigger')), reveal, name + ' theme reveal ' + (reveal ? 'on' : 'off'));
      await t.page.close();
    }
  }
}

/* The library preview: the first preset with no date, at 375 and 1366 in the builder. */
async function preview(browser, name) {
  for (const width of [375, 1366]) {
    const t = await mount(browser, name, {width, editing: true, assets: [ASSET]});
    await frames(t.page);
    const r = t.root('[data-cd-root]'), box = await r.boundingBox();
    ok(box && box.height > 60 && box.height < 900, name + ' @' + width + ' preview has a real height: ' + (box && Math.round(box.height)));
    ok(await t.noOverflow(), name + ' @' + width + ' preview no overflow');
    ok(await t.root('[data-cd-clock]').isVisible(), name + ' @' + width + ' preview shows the timer');
    if (!CFG[name].loop) ok(await t.root('[data-cd-hint]').isVisible(), name + ' @' + width + ' preview says to add a date');
    eq(t.errors, [], name + ' preview errors');
    if (process.env.SHOTS) await t.page.screenshot({path: path.join(process.env.SHOTS, name + '-' + width + '.png'), fullPage: true});
    await t.page.close();
  }
}

function statics(name) {
  eq(schemaProblems(name), [], name + ' schema');
  const {schema} = schemaOf(name), ids = schema.settings.filter(x => x.id).map(x => x.id);
  eq(new Set(ids).size, ids.length, name + ' unique ids');
  /* the shared order: General, Content, Layout, ..., Mobile */
  const ORDER = ['General', 'Content', 'Layout', 'Background image', 'Appearance', 'Button', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'];
  const heads = schema.settings.filter(x => x.type === 'header').map(x => x.content);
  eq(heads.filter(h => ORDER.includes(h)), heads, name + ' only shared group names');
  eq([...heads].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), heads, name + ' groups in the shared order');
  /* opt-in: every colour hides until custom styling is on */
  for (const x of schema.settings) if (x.type === 'color' && !x.hidden) ok(/enable_custom_style/.test(x.visible_if || ''), name + ' ' + x.id + ' waits for custom styling');
  for (const b of schema.blocks || []) for (const x of b.settings) if (x.type === 'color') ok(/enable_custom_style/.test(x.visible_if || ''), name + ' ' + b.type + '.' + x.id + ' waits for the block\'s custom styling');
  for (const b of schema.blocks || []) for (const x of b.settings) if (x.type === 'font_picker') ok(/enable_custom_fonts/.test(x.visible_if || ''), name + ' ' + b.type + '.' + x.id + ' waits for custom font');
  /* no deadline is invented in a default */
  for (const x of [...schema.settings, ...(schema.blocks || []).flatMap(b => b.settings)]) if (/^end_(iso|date)$/.test(x.id)) eq(x.default || '', '', name + ' ' + x.id + ' has no default date');
  /* words */
  const visible = JSON.stringify(schema);
  ok(!/—|\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(visible.replace(/"(transform|text-transform)"/g, '')), name + ' plain defaults');
  ok(!/lorem ipsum|\d+% off/i.test(visible), name + ' no filler or invented discounts');
  /* the timers live in the controller: no inline timers left */
  const tpl = read('sections/' + name + '.storelib').split('<schema>')[0];
  ok(!/setInterval|customElements\.define|localStorage/.test(tpl), name + ' no timer in the section markup');
  /* the date rule the section documents is the controller's */
  const own = tpl.match(/function calendarOk\(s\)\{[^\n]*?\}(?=\n)/), ctl = read('shopify/assets/' + ASSET).match(/function calendarOk\(s\)\{[^\n]*?\}(?=\n)/);
  if (own) eq(own[0], ctl[0], name + ' date rule matches live-countdown.js');
  /* no saved instance uses it */
  for (const f of fs.readdirSync(path.join(__dirname, '../templates')).map(f => 'templates/' + f).concat(fs.readdirSync(path.join(__dirname, '../sections')).filter(f => f.endsWith('.json')).map(f => 'sections/' + f))) ok(!read(f).includes('"type": "' + name + '"') && !read(f).includes('"type":"' + name + '"'), name + ' not saved in ' + f);
}

(async () => {
  const only = process.argv.slice(2), names = Object.keys(CFG).filter(n => !only.length || only.includes(n));
  const parts = (process.env.PARTS || 'statics,controls,theme,timers,instances,motion,preview').split(',');
  const browser = await launch();
  try {
    if (parts.includes('statics')) for (const n of names) statics(n);
    const covered = {};
    if (parts.includes('controls')) for (const n of names) for (const w of [375, 1366]) covered[n] = Math.max(covered[n] || 0, await everyControl(browser, n, w));
    if (parts.includes('theme')) for (const n of names) for (const w of [375, 1366]) for (const e of [true, false]) await theme(browser, n, w, e);
    if (parts.includes('timers')) for (const n of names) await timers(browser, n);
    if (parts.includes('instances')) for (const n of names) await instances(browser, n);
    if (parts.includes('motion')) for (const n of names) await motion(browser, n);
    if (parts.includes('preview')) for (const n of names) await preview(browser, n);
    console.log(checks + ' countdown checks passed' + (Object.keys(covered).length ? ' (controls covered: ' + Object.entries(covered).map(([n, c]) => n + ' ' + c).join(', ') + ')' : ''));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
