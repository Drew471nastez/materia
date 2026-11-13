/* Hero Split (sections/hero-split-media) and Hero Collage (sections/hero-collage),
   run and painted live by shopify/assets/live-r7-hero.js.
   With the real theme priority rules on, at 375 and 1366, in the builder and
   on the storefront, for both sections:
   - the schema has no problems, unique ids, a first preset in "Hero and banners";
   - first paint equals the hydrated paint and the markup equals what the
     controller derives (audit); a visitor gets no settings JSON;
   - theme inheritance: scheme background and colours, theme fonts, buttons
     that match a plain theme button and its hover; again with priority off;
   - colour scheme live and on redraw;
   - every non-hidden section and block setting changes what is drawn after a
     redraw (at its own width for desktop/mobile settings, leaving the other
     width alone), and the same edit sent live paints exactly what the redraw
     paints (builder);
   - every option of every select looks different from the others;
   - custom fonts, weight, size, line height, letter spacing and button shape
     win under the theme priority, on the element and a descendant, live and
     on redraw, and off restores the theme;
   - two instances stay apart, a redraw sets up once, a block added by a
     redraw is live, pictures and the video are not loaded again by an
     unrelated edit;
   - Hero Split: the video plays only on screen, pauses with the button, the
     tab and reduced motion; link and no-link buttons; empty states;
   - Hero Collage: the picture row scrolls by touch-style scrollLeft, snaps,
     arrows and arrow keys move it, arrows disable at the ends, nothing
     traps the page's own scroll; the desktop offset grid for 1 to 4 pictures;
   - the heading is the page's h1 only for the first section; reduced motion;
     no sideways scroll at 375; no errors.
   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-hero.cjs [split|collage] */
const assert = require('assert/strict'), fs = require('fs'), path = require('path');
const {launch, mount, render, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'live-r7-hero.js';
const SECTIONS = {
  split: {name: 'hero-split-media', title: 'Hero Split', root: '.hsm', width: 'full_width'},
  collage: {name: 'hero-collage', title: 'Hero Collage', root: '.hcl', width: 'container'},
};
const clone = o => JSON.parse(JSON.stringify(o));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const frames = t => t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const IMG = {id: 'img1', src: 'https://theme.test/pic-a.png', url: 'https://theme.test/pic-a.png', width: 1600, height: 1000, alt: 'Sample picture'};
const IMG2 = {id: 'img2', src: 'https://theme.test/pic-b.png', url: 'https://theme.test/pic-b.png', width: 900, height: 1200, alt: 'Other picture'};
const VIDEO = {id: 'vid1', media_type: 'video', sources: [{format: 'm3u8', url: 'https://theme.test/clip.m3u8', mime_type: 'application/x-mpegURL'}, {format: 'mp4', url: 'https://theme.test/clip.mp4', mime_type: 'video/mp4'}]};
const FONT_H = {family: 'Courier New', fallback_families: 'monospace', weight: 400, style: 'normal'};
const FONT_B = {family: 'Verdana', fallback_families: 'sans-serif', weight: 400, style: 'normal'};
const FONT_X = {family: 'Tahoma', fallback_families: 'sans-serif', weight: 400, style: 'normal'};

/* A fingerprint of what is drawn: computed styles, box, words and the attributes a visitor meets, keyed by block id or class. */
const FP = () => {
  const P = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'display', 'order', 'alignItems', 'justifyContent', 'rowGap', 'columnGap', 'gridTemplateColumns', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'maxWidth', 'minHeight', 'borderTopWidth', 'borderTopColor', 'borderTopLeftRadius', 'objectFit', 'objectPosition', 'aspectRatio', 'top', 'opacity'];
  const V = ['--mb-bg', '--mb-text', '--mb-border', '--mb-hover-bg', '--mb-hover-text', '--mb-hover-border'];
  const bare = v => v == null ? null : String(v).replace(/([?&])width=\d+&?/, '$1').replace(/[?&]$/, '');
  window.__fp = uid => {
    const wrap = document.getElementById('shopify-section-' + uid), out = {}, seen = {};
    const w = getComputedStyle(wrap);
    out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, height: Math.round(wrap.getBoundingClientRect().height)};
    const root = wrap.querySelector('[data-r7h]'), r0 = wrap.getBoundingClientRect();
    for (const e of [root, ...root.querySelectorAll('*')]) {
      if (/^(style|script|svg|path)$/i.test(e.tagName)) continue;
      let k = e.dataset.r7hBlock || e.classList[0] || e.tagName;
      seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
      const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
      for (const p of P) o[p] = cs[p];
      for (const v of V) o[v] = cs.getPropertyValue(v).trim();
      o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
      let own = ''; for (const n of e.childNodes) if (n.nodeType === 3) own += n.textContent; o.text = own.replace(/\s+/g, ' ').trim();
      o.tag = e.tagName;
      for (const a of ['href', 'hidden', 'alt', 'data-theme-button']) o[a] = e.getAttribute(a);
      o.src = e.hasAttribute('data-r7h-empty') ? 'placeholder' : bare(e.getAttribute('src'));
      if (e.tagName === 'BUTTON') o.disabled = e.disabled;
      out[k] = o;
    }
    return out;
  };
};
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaR7Hero.audit(document.querySelector('#shopify-section-' + u + ' [data-r7h]')), uid);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
const diffDetail = (a, b) => diff(a, b).slice(0, 4).map(k => k + ': ' + (a[k] && b[k] ? Object.keys({...a[k], ...b[k]}).filter(p => JSON.stringify(a[k][p]) !== JSON.stringify(b[k][p])).map(p => p + ' ' + JSON.stringify(a[k][p]) + ' -> ' + JSON.stringify(b[k][p])).join('; ') : a[k] ? 'removed' : 'added')).join(' | ');
const seenBy = f => Object.fromEntries(Object.entries(f).map(([k, o]) => [k, {...o, hidden: undefined}]));
/* another rule gives the section a margin, which Remove section spacing takes away */
async function prep(t) { await t.page.evaluate(FP); await t.page.addStyleTag({content: ':is(#shopify-section-test,#shopify-section-a,#shopify-section-b,#shopify-section-two).shopify-section{margin-top:9px;margin-bottom:9px}'}); }

/* Settings that act at one width only (0: both). */
const ONLY = {section_width: 1366, image_position: 1366, vertical_align: 1366, show_arrows: 375};
/* The theme's width classes also set the phone gutter, so the other width is not held still for it. */
const LOOSE = ['section_width'];
const widthOf = id => id in ONLY ? ONLY[id] : /mobile/.test(id) ? 375 : /desktop/.test(id) ? 1366 : 0;
const VALUES = {content_max_width: [320], image: [IMG2], video: [VIDEO], video_url: ['/media/clip-b.mp4'], heading_font: [FONT_X], body_font: [FONT_X], alt: ['A described picture'], image_alt: ['A described picture']};
function valuesFor(x, cur) {
  if (VALUES[x.id]) return VALUES[x.id];
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'select': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return ['Edited words'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <em>text</em></p>'];
    case 'url': return ['/pages/edited'];
  }
  throw new Error('no value for ' + x.type + ' ' + x.id);
}
/* what a control needs beside its visible_if to show an effect */
const PRE = {
  enable_custom_style: {section_bg: '#13579b', image_radius: 30},
  enable_custom_fonts: {heading_font: FONT_H, body_font: FONT_B},
  heading_font: {heading_font: FONT_H, body_font: FONT_B},
  body_font: {heading_font: FONT_H, body_font: FONT_B},
  image_position_x: {image: IMG}, image_position_y: {image: IMG},
};
const PRE_BLOCK = {
  enable_custom_style: {color: '#13579b', bg: '#224466', border_color: '#aa6600', bg_hover: '#445566', color_hover: '#ffeedd'},
  size_enable: {size: 21, size_desktop: 71, size_mobile: 27, line_height: 1.9, tracking: 3},
  weight_enable: {weight: '400'},
  use_theme_button: {radius: 3, pad_x: 40, pad_y: 18, size: 21, border_width: 3},
};
function prereq(x, list, base, extra) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true)))?/g)) {
    const [, id, op, str, lit] = m, want = str ?? (lit === undefined ? true : lit === 'true');
    if (!op) out[id] = list.find(y => y.id === id).type === 'checkbox' ? true : base[id];
    else if (op === '==') out[id] = want;
  }
  return {...out, ...(extra[x.id] || {})};
}

async function everyControl(browser, sec, width, editing, seen) {
  const {schema} = schemaOf(sec.name);
  const t = await mount(browser, sec.name, {width, editing, assets: [ASSET]});
  await prep(t);
  /* a setting with no default starts empty, said outright so a redraw takes an earlier value away again */
  const blanks = list => Object.fromEntries(list.filter(x => x.id && x.default === undefined).map(x => [x.id, '']));
  const base = {...blanks(schema.settings), ...clone(t.section.settings)};
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: {...blanks(schema.blocks.find(x => x.type === b.type).settings), ...clone(b.settings)}}));
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden) cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks) { const i = baseBlocks.findIndex(b => b.type === bt.type); for (const x of bt.settings) if (x.id && !x.hidden) cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  for (const {scope, x, list, btype} of cases) {
    const key = (btype ? btype + '.' : '') + x.id;
    const blockBase = scope < 0 ? null : baseBlocks[scope].settings;
    const pre = prereq(x, list, scope < 0 ? base : blockBase, scope < 0 ? PRE : PRE_BLOCK);
    for (const dep of Object.keys(pre)) if ((scope < 0 ? PRE : PRE_BLOCK)[dep] && dep !== x.id) for (const [k, v] of Object.entries((scope < 0 ? PRE : PRE_BLOCK)[dep])) if (!(k in pre)) pre[k] = v;
    /* the control itself starts from its own value (a font picker from a real font, as the builder hands one over) */
    if (x.type !== 'font_picker') delete pre[x.id];
    const sBase = scope < 0 ? {...base, ...pre} : base, bBase = clone(baseBlocks); if (scope >= 0) Object.assign(bBase[scope].settings, pre);
    const cur = scope < 0 ? sBase[x.id] : bBase[scope].settings[x.id];
    await t.redraw({settings: sBase, blocks: bBase});
    const f0 = await fp(t);
    const w = widthOf(x.id), entry = seen[key] || (seen[key] = {opts: {}, changed: false});
    for (const v of valuesFor(x, cur)) {
      const change = {[x.id]: v}, sNext = scope < 0 ? {...sBase, ...change} : sBase, bNext = clone(bBase); if (scope >= 0) Object.assign(bNext[scope].settings, change);
      await t.redraw({settings: sNext, blocks: bNext});
      const f1 = await fp(t);
      /* the settings JSON is printed in the builder only: a visitor's markup has nothing to derive from */
      if (editing) eq(await audit(t), [], `${sec.name} ${key}=${JSON.stringify(v).slice(0, 60)} at ${width}: redrawn markup equals the derived paint`);
      const d = diff(f0, f1);
      if (d.length && (!w || w === width)) entry.changed = true;
      /* at the other width nothing a visitor sees moves (the hidden attribute of a part that width does not show is not a sight) */
      if (w && w !== width && !LOOSE.includes(x.id)) ok(!diff(seenBy(f0), seenBy(f1)).length, `${sec.name} ${key} (${w}px setting) leaves ${width} alone: ${diffDetail(seenBy(f0), seenBy(f1))}`);
      const wk = width + (editing ? 'e' : 's');
      if (!w || w === width) {
        (entry.opts[JSON.stringify(v)] = entry.opts[JSON.stringify(v)] || {})[wk] = JSON.stringify(f1);
        (entry.opts[JSON.stringify(cur)] = entry.opts[JSON.stringify(cur)] || {})[wk] = JSON.stringify(f0);
      }
      if (editing) {
        await t.redraw({settings: sBase, blocks: bBase});
        await t.emit(change, scope < 0 ? undefined : t.blockId(btype));
        await frames(t);
        const f2 = await fp(t);
        ok(!diff(f1, f2).length, `${sec.name} ${key}=${JSON.stringify(v).slice(0, 60)} at ${width}: live equals redraw: ${diffDetail(f1, f2)}`);
        eq(await audit(t), [], `${sec.name} ${key}=${JSON.stringify(v).slice(0, 60)} at ${width}: live markup equals the derived paint`);
      }
    }
  }
  eq(t.errors, [], `${sec.name} every control ${width}: no errors`);
  await t.page.close();
}

/* A plain theme button drawn beside the section: what Theme settings > Buttons give with nothing of the section's. */
const reference = (t, role) => t.page.evaluate(role => {
  let host = document.getElementById('r7-ref'); if (!host) { host = document.createElement('div'); host.id = 'r7-ref'; host.className = 'shopify-section'; document.body.append(host); }
  host.innerHTML = '<a href="/x" data-theme-button="' + role + '" data-sl-button>Theme</a>';
  const cs = getComputedStyle(host.firstChild), out = {};
  for (const p of ['backgroundColor', 'color', 'borderTopColor', 'borderTopWidth', 'borderTopLeftRadius', 'fontFamily', 'fontSize', 'fontWeight', 'paddingTop', 'paddingLeft', 'letterSpacing', 'textTransform']) out[p] = cs[p];
  host.remove();
  return out;
}, role);
const styleOf = (t, sel, uid = 'test') => t.page.locator('#shopify-section-' + uid + ' ' + sel).first().evaluate(el => { const cs = getComputedStyle(el), out = {}; for (const p of ['backgroundColor', 'color', 'borderTopColor', 'borderTopWidth', 'borderTopLeftRadius', 'fontFamily', 'fontSize', 'fontWeight', 'paddingTop', 'paddingLeft', 'letterSpacing', 'textTransform']) out[p] = cs[p]; return out; });

async function basics(browser, sec, width, editing) {
  const where = `${sec.name} ${width} ${editing ? 'builder' : 'storefront'}`;
  const a = await mount(browser, sec.name, {width, editing}); await prep(a);
  const b = await mount(browser, sec.name, {width, editing, assets: [ASSET]}); await prep(b);
  await frames(b);
  const fa = await fp(a), fb = await fp(b);
  ok(!diff(fa, fb).length, `${where}: first paint equals hydrated paint: ${diffDetail(fa, fb)}`);
  if (editing) eq(await audit(b), [], `${where}: markup equals derived paint`);
  else ok(!(await b.page.evaluate(() => !!document.querySelector('[data-r7h-settings],[data-r7h-block-settings]'))), `${where}: a visitor gets no settings JSON`);
  ok(await b.noOverflow(), `${where}: no sideways scroll`);
  /* theme inheritance */
  eq(await b.css(sec.root, 'backgroundColor'), 'rgb(24, 32, 40)', `${where}: background follows the scheme`);
  ok(await b.css('.r7h__heading', 'color') === 'rgb(255, 255, 255)' && /Georgia/.test(await b.css('.r7h__heading', 'fontFamily')) && await b.css('.r7h__heading', 'fontWeight') === '700', `${where}: heading follows the theme`);
  ok(await b.css('.r7h__text', 'color') === 'rgb(204, 204, 204)' && /Arial/.test(await b.css('.r7h__text p', 'fontFamily')) && await b.css('.r7h__text p', 'fontSize') === '16px', `${where}: text follows the theme`);
  ok(await b.css('.r7h__eyebrow', 'color') === 'rgb(204, 204, 204)' && /Arial/.test(await b.css('.r7h__eyebrow', 'fontFamily')), `${where}: eyebrow follows the theme`);
  eq(await styleOf(b, '.r7h__cta[data-theme-button="primary"]'), await reference(b, 'primary'), `${where}: primary button is the theme's button`);
  eq(await styleOf(b, '.r7h__cta[data-theme-button="secondary"]'), await reference(b, 'secondary'), `${where}: secondary button is the theme's button`);
  eq(await b.css('.r7h__cta', 'backgroundColor'), 'rgb(18, 52, 86)', `${where}: button background is the theme's`);
  await b.page.hover('#shopify-section-test .r7h__cta'); await frames(b);
  eq(await b.css('.r7h__cta', 'backgroundColor'), 'rgb(255, 0, 0)', `${where}: button takes the theme's hover colour`);
  await b.page.mouse.move(0, 0);
  for (const sel of ['.r7h__cta', ...(sec === SECTIONS.collage && width < 768 ? ['.hcl__arrow'] : [])]) for (const box of await b.page.locator('#shopify-section-test ' + sel).evaluateAll(els => els.filter(e => e.offsetParent).map(e => e.getBoundingClientRect().height))) ok(box >= 44, `${where}: ${sel} is a 44px target (${box})`);
  /* heading level and picture attributes */
  eq(await b.page.locator('#shopify-section-test .r7h__heading').evaluate(e => e.tagName), 'H1', `${where}: the heading of a first section is the h1`);
  ok(await b.page.locator('#shopify-section-test img').evaluateAll(els => els.every(i => i.hasAttribute('alt') && i.getAttribute('width') && i.getAttribute('height') && /^(lazy|eager)$/.test(i.getAttribute('loading')) && i.getAttribute('decoding') === 'async')), `${where}: every picture has alt, width, height and a loading hint`);
  /* colour scheme: live, then on redraw */
  await b.emit({color_scheme: 'alt-scheme'}); await frames(b);
  ok(await b.css(sec.root, 'backgroundColor') === 'rgb(250, 250, 250)' && await b.css('.r7h__heading', 'color') === 'rgb(16, 16, 16)', `${where}: scheme switches live`);
  await b.redraw({settings: {color_scheme: 'alt-scheme'}});
  ok(await b.css(sec.root, 'backgroundColor') === 'rgb(250, 250, 250)' && await b.css('.r7h__text', 'color') === 'rgb(51, 51, 51)', `${where}: scheme switches on redraw`);
  await b.redraw({settings: {color_scheme: 'default-color-scheme'}});
  /* section custom styling on and off */
  await b.emit({enable_custom_style: true, section_bg: '#102030'}); await frames(b);
  eq(await b.css(sec.root, 'backgroundColor'), 'rgb(16, 32, 48)', `${where}: custom background lands live`);
  await b.emit({enable_custom_style: false}); await frames(b);
  eq(await b.css(sec.root, 'backgroundColor'), 'rgb(24, 32, 40)', `${where}: custom styling off restores the scheme live`);
  await b.redraw({settings: {enable_custom_style: true, section_bg: '#102030'}});
  eq(await b.css(sec.root, 'backgroundColor'), 'rgb(16, 32, 48)', `${where}: custom background lands on redraw`);
  await b.redraw({settings: {enable_custom_style: false}});
  eq(await b.css(sec.root, 'backgroundColor'), 'rgb(24, 32, 40)', `${where}: custom styling off restores the scheme on redraw`);
  eq(a.errors.concat(b.errors), [], `${where}: no errors`);
  await a.page.close(); await b.page.close();
}

/* Round 3: every custom switch wins under the real theme rules, on the element and a descendant, and off gives the theme back. */
async function priority(browser, sec, width, editing) {
  const where = `${sec.name} ${width} ${editing ? 'builder' : 'storefront'} priority`;
  const {schema} = schemaOf(sec.name);
  const blocks = clone(schema.presets[0].blocks).map(b => b.type === 'heading' ? {type: 'heading', settings: {text: 'Plain and <em>slanted</em> words'}} : b.type === 'subheading' ? {type: 'subheading', settings: {text: '<p>First line with <strong>strong</strong> words.</p><ul><li>One point</li></ul>'}} : b);
  const t = await mount(browser, sec.name, {width, editing, blocks, assets: [ASSET]});
  await prep(t);
  const hid = t.blockId('heading'), sid = t.blockId('subheading'), eid = t.blockId('eyebrow'), bid = t.blockId('button');
  const size = width < 768 ? 27 : 71;
  const theme = {h: await styleOf(t, '.r7h__heading'), em: await styleOf(t, '.r7h__heading em'), p: await styleOf(t, '.r7h__text p'), li: await styleOf(t, '.r7h__text li'), eye: await styleOf(t, '.r7h__eyebrow'), btn: await styleOf(t, '.r7h__cta'), lh: await t.css('.r7h__heading', 'lineHeight'), plh: await t.css('.r7h__text p', 'lineHeight')};
  ok(/Georgia/.test(theme.h.fontFamily) && /Georgia/.test(theme.em.fontFamily) && /Arial/.test(theme.p.fontFamily) && /Arial/.test(theme.li.fontFamily), `${where}: theme fonts by default`);
  const on = async how => {
    const sectionOn = {enable_custom_fonts: true, heading_font: FONT_H, body_font: FONT_B};
    const headingOn = {weight_enable: true, weight: '400', size_enable: true, size_desktop: 71, size_mobile: 27, line_height: 1.9, tracking: 3, enable_custom_style: true, color: '#ab12cd'};
    const textOn = {size_enable: true, size: 21, line_height: 1.9, enable_custom_style: true, color: '#12cdab'};
    const eyeOn = {size_enable: true, size: 19, enable_custom_style: true, color: '#cd12ab'};
    const btnOn = {use_theme_button: false, radius: 3, pad_x: 40, pad_y: 18, size: 21, border_width: 3, enable_custom_style: true, bg: '#224466', color: '#ffeedd', border_color: '#aa6600', bg_hover: '#00aa55', color_hover: '#000000'};
    if (how === 'live') { await t.emit(sectionOn); await t.emit(headingOn, hid); await t.emit(textOn, sid); await t.emit(eyeOn, eid); await t.emit(btnOn, bid); await frames(t); }
    else await t.redraw({settings: sectionOn, blocks: t.section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...(b.id === hid ? headingOn : b.id === sid ? textOn : b.id === eid ? eyeOn : b.id === bid ? btnOn : {})}}))});
    const h = await styleOf(t, '.r7h__heading'), em = await styleOf(t, '.r7h__heading em'), p = await styleOf(t, '.r7h__text p'), li = await styleOf(t, '.r7h__text li'), strong = await styleOf(t, '.r7h__text strong'), eye = await styleOf(t, '.r7h__eyebrow'), btn = await styleOf(t, '.r7h__cta');
    ok(/Courier New/.test(h.fontFamily) && /Courier New/.test(em.fontFamily), `${where} ${how}: custom heading font on the heading and inside it (${h.fontFamily})`);
    ok(/Verdana/.test(p.fontFamily) && /Verdana/.test(li.fontFamily) && /Verdana/.test(strong.fontFamily) && /Verdana/.test(eye.fontFamily), `${where} ${how}: custom body font on the eyebrow, the text and inside it (${p.fontFamily})`);
    ok(h.fontWeight === '400' && em.fontWeight === '400', `${where} ${how}: custom heading weight on the heading and inside it (${h.fontWeight})`);
    ok(h.fontSize === size + 'px' && em.fontSize === size + 'px', `${where} ${how}: custom heading size (${h.fontSize})`);
    eq([await t.css('.r7h__heading', 'lineHeight'), await t.css('.r7h__heading em', 'lineHeight'), h.letterSpacing, em.letterSpacing].map(parseFloat).map(n => Math.round(n * 10) / 10), [Math.round(size * 19) / 10, Math.round(size * 19) / 10, 3, 3], `${where} ${how}: custom heading line height and letter spacing, inside it too`);
    eq([h.color, p.color, li.color, eye.color], ['rgb(171, 18, 205)', 'rgb(18, 205, 171)', 'rgb(18, 205, 171)', 'rgb(205, 18, 171)'], `${where} ${how}: block colours`);
    eq([p.fontSize, li.fontSize, parseFloat(await t.css('.r7h__text p', 'lineHeight')), eye.fontSize], ['21px', '21px', 39.9, '19px'], `${where} ${how}: custom text and eyebrow size and line height`);
    eq([btn.fontSize, btn.paddingTop, btn.paddingLeft, btn.borderTopLeftRadius, btn.borderTopWidth, btn.backgroundColor, btn.color, btn.borderTopColor], ['21px', '18px', '40px', '3px', '3px', 'rgb(34, 68, 102)', 'rgb(255, 238, 221)', 'rgb(170, 102, 0)'], `${where} ${how}: custom button shape and colours`);
    ok(/Arial/.test(btn.fontFamily), `${where} ${how}: the button keeps the theme's button font`);
    await t.page.hover('#shopify-section-test .r7h__cta'); await frames(t);
    eq([await t.css('.r7h__cta', 'backgroundColor'), await t.css('.r7h__cta', 'color')], ['rgb(0, 170, 85)', 'rgb(0, 0, 0)'], `${where} ${how}: custom button hover colours`);
    await t.page.mouse.move(0, 0);
    if (editing) eq(await audit(t), [], `${where} ${how}: markup equals the derived paint`);
  };
  const off = async how => {
    const sectionOff = {enable_custom_fonts: false}, blockOff = {weight_enable: false, size_enable: false, enable_custom_style: false, use_theme_button: true};
    if (how === 'live') { await t.emit(sectionOff); for (const id of [hid, sid, eid, bid]) await t.emit(blockOff, id); await frames(t); }
    else await t.redraw({settings: sectionOff, blocks: t.section.blocks.map(b => ({type: b.type, settings: {...b.settings, ...([hid, sid, eid, bid].includes(b.id) ? blockOff : {})}}))});
    eq({h: await styleOf(t, '.r7h__heading'), em: await styleOf(t, '.r7h__heading em'), p: await styleOf(t, '.r7h__text p'), li: await styleOf(t, '.r7h__text li'), eye: await styleOf(t, '.r7h__eyebrow'), btn: await styleOf(t, '.r7h__cta'), lh: await t.css('.r7h__heading', 'lineHeight'), plh: await t.css('.r7h__text p', 'lineHeight')}, theme, `${where} ${how}: every switch off gives the theme back`);
    ok(await t.page.evaluate(() => !document.querySelector('#shopify-section-test :is([data-own-font],[data-own-weight],[data-own-size],[data-own-shape])')), `${where} ${how}: no opt-out attribute is left`);
  };
  await on('redraw'); await off('redraw');
  await on('live'); await off('live');
  eq(t.errors, [], `${where}: no errors`);
  await t.page.close();
}

async function lifecycle(browser, sec) {
  const {schema} = schemaOf(sec.name), blocks = clone(schema.presets[0].blocks);
  const t = await mount(browser, sec.name, {width: 1366, instances: [{uid: 'a', blocks, settings: {image: IMG}}, {uid: 'b', blocks, settings: {image: IMG}}], assets: [ASSET]});
  await prep(t);
  const fb = await fp(t, 'b');
  await t.emit({padding_top_desktop: 120, color_scheme: 'alt-scheme', section_margin_top_desktop: 40}, undefined, 'a');
  await t.emit({text: 'Only in a'}, t.blockId('heading', 0, 'a'), 'a'); await frames(t);
  ok(await t.css(sec.root, 'backgroundColor', 'a') === 'rgb(250, 250, 250)' && (await t.page.locator('#shopify-section-a .r7h__heading').textContent()) === 'Only in a', `${sec.name}: instance a changes`);
  ok(!diff(fb, await fp(t, 'b')).length, `${sec.name}: instance b stays as it was`);
  const n0 = await t.page.evaluate(() => [window.MateriaR7Hero.roots.size, window.MateriaR7Hero.stats.setups]);
  await t.redraw({uid: 'a'}); await t.redraw({uid: 'a'});
  eq(await t.page.evaluate(() => [window.MateriaR7Hero.roots.size, window.MateriaR7Hero.stats.setups]), [n0[0], n0[1] + 2], `${sec.name}: a redraw sets its section up once and drops the old one`);
  eq(await audit(t, 'a'), [], `${sec.name}: redrawn markup equals derived paint`);
  eq(await t.page.evaluate(() => getComputedStyle(document.getElementById('shopify-section-a')).marginTop), '0px', `${sec.name}: a redraw takes the live margin off the wrapper`);
  /* a block added by a redraw is drawn and live */
  const fewer = blocks.filter(b => b.type !== 'subheading');
  await t.redraw({uid: 'a', blocks: fewer});
  eq(await t.page.locator('#shopify-section-a .r7h__text').count(), 0, `${sec.name}: a removed block is gone`);
  await t.redraw({uid: 'a', blocks: fewer.concat([{type: 'subheading'}])});
  const id = 'a-b' + fewer.length;
  eq(await t.page.locator(`[data-r7h-block="${id}"]`).count(), 1, `${sec.name}: an added block is drawn`);
  await t.emit({text: '<p>Added block copy</p>', enable_custom_style: true, color: '#ff0000'}, id, 'a'); await frames(t);
  ok((await t.page.locator(`[data-r7h-block="${id}"]`).textContent()).trim() === 'Added block copy' && await t.css('.r7h__text', 'color', 'a') === 'rgb(255, 0, 0)', `${sec.name}: the added block is live`);
  /* a button is a link with an address and a plain button without, live too; an empty label hides it */
  const btn = t.blockId('button', 0, 'a'), at = `#shopify-section-a [data-r7h-block="${btn}"]`;
  eq(await t.page.locator(at).evaluate(e => [e.tagName, e.getAttribute('type'), e.hasAttribute('href')]), ['BUTTON', 'button', false], `${sec.name}: a button without a link is a <button>`);
  await t.emit({link: '/pages/fit'}, btn, 'a'); await frames(t);
  eq(await t.page.locator(at).evaluate(e => [e.tagName, e.getAttribute('href'), e.getAttribute('data-theme-button'), e.hasAttribute('data-sl-button'), e.textContent]), ['A', '/pages/fit', 'primary', true, schema.blocks.find(b => b.type === 'button').settings[0].default], `${sec.name}: a link makes it an <a> live`);
  await t.emit({link: ''}, btn, 'a'); await frames(t);
  eq(await t.page.locator(at).evaluate(e => e.tagName), 'BUTTON', `${sec.name}: without the link it is a <button> again`);
  await t.redraw({uid: 'a', blocks: fewer.map(b => b.type === 'button' ? {type: 'button', settings: {...b.settings, link: '/collections/all'}} : b)});
  eq(await t.page.locator('#shopify-section-a .r7h__cta').first().evaluate(e => [e.tagName, e.getAttribute('href')]), ['A', '/collections/all'], `${sec.name}: a link is printed as an <a>`);
  await t.emit({text: ''}, btn, 'a'); await frames(t);
  ok(await t.page.locator(at).isHidden(), `${sec.name}: a button without a label is hidden live`);
  await t.emit({text: 'Back again'}, btn, 'a'); await frames(t);
  ok(await t.page.locator(at).isVisible(), `${sec.name}: the label brings it back`);
  /* an unrelated edit keeps the same elements and loads no picture again */
  await t.page.evaluate(() => { window.__keep = [...document.querySelectorAll('#shopify-section-a :is(img, video, .r7h__heading)')]; window.__src = window.__keep.map(e => e.getAttribute('src')); window.__loads = 0; for (const i of window.__keep) i.addEventListener('load', () => window.__loads++); });
  await t.emit({content_gap: 30, padding_bottom_desktop: 44}, undefined, 'a');
  await t.emit({text: 'Another heading'}, t.blockId('heading', 0, 'a'), 'a'); await frames(t); await t.page.waitForTimeout(60);
  ok(await t.page.evaluate(() => { const now = [...document.querySelectorAll('#shopify-section-a :is(img, video, .r7h__heading)')]; return now.length === window.__keep.length && now.every((e, i) => e === window.__keep[i] && e.getAttribute('src') === window.__src[i]) && window.__loads === 0; }), `${sec.name}: an unrelated edit keeps the same elements and loads no picture again`);
  eq(t.errors, [], `${sec.name} lifecycle: no errors`);
  await t.page.close();
}

/* The page's one h1 belongs to its first section. */
async function headingLevel(sec) {
  const first = await render(sec.name);
  for (const [index, tag] of [[1, 'h1'], [2, 'h2'], [5, 'h2']]) {
    const r = await render(sec.name, {globals: {section: {...first.section, index}}});
    ok(new RegExp('<' + tag + ' class="r7h__heading"').test(r.html) && !new RegExp('<' + (tag === 'h1' ? 'h2' : 'h1') + '\\b').test(r.html), `${sec.name}: section ${index} prints its heading as ${tag}`);
    ok(index > 2 ? !/loading="eager"/.test(r.html) : /loading="eager"/.test(r.html), `${sec.name}: section ${index} ${index > 2 ? 'loads its pictures lazily' : 'loads its first picture at once'}`);
  }
}

/* ------------------------------------------------------------ Hero Split */
async function splitLayout(browser, width, editing) {
  const sec = SECTIONS.split, where = `hero-split-media ${width} ${editing ? 'builder' : 'storefront'}`;
  const t = await mount(browser, sec.name, {width, editing, settings: {image: IMG, image_alt: 'A rail of shirts'}, assets: [ASSET]});
  await prep(t);
  const box = sel => t.page.locator('#shopify-section-test ' + sel).first().evaluate(e => { const r = e.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom)}; });
  let media = await box('.hsm__media'), content = await box('.hsm__content'), img = await box('.hsm__img');
  eq([img.x, img.y, img.w, img.h], [media.x, media.y, media.w, media.h], `${where}: the picture fills its half`);
  eq(await t.page.locator('#shopify-section-test .hsm__img').evaluate(e => [e.getAttribute('alt'), getComputedStyle(e).objectFit, /pic-a\.png\?width=1600/.test(e.getAttribute('src')), /750w.*2200w/.test(e.getAttribute('srcset'))]), ['A rail of shirts', 'cover', true, true], `${where}: the picture has its description, covers and offers sizes`);
  if (width >= 768) {
    ok(media.x === 683 && media.r === 1366 && media.y === 0 && media.h === 560 && content.x === 0 && content.w === 683, `${where}: media on the right, edge to edge, half the width (${JSON.stringify(media)})`);
    await t.redraw({settings: {image_position: 'left', media_width_desktop: 60}});
    media = await box('.hsm__media'); content = await box('.hsm__content');
    ok(media.x === 0 && media.w === Math.round(1366 * 0.6) && content.r === 1366, `${where}: media on the left at 60% (${JSON.stringify(media)})`);
    await t.redraw({settings: {full_height: true}});
    eq((await box('.hsm__grid')).h, 900, `${where}: fills the screen height`);
    await t.redraw({settings: {full_height: false, section_width: 'container'}});
    const grid = await box('.hsm__grid');
    const themeContainer = await t.page.evaluate(() => { const d = document.createElement('div'); d.className = 'container'; d.innerHTML = '<div style="height:1px"></div>'; document.body.append(d); const w = Math.round(d.firstChild.getBoundingClientRect().width); d.remove(); return w; });
    ok(grid.x > 0 && grid.r < 1366 && Math.abs(grid.w - themeContainer) <= 1, `${where}: the default width keeps the split inside the page width, as the theme's container does (${JSON.stringify(grid)} / ${themeContainer})`);
    eq([await t.css('.hsm__media', 'borderTopLeftRadius'), await t.css('.hsm__media', 'borderBottomRightRadius')], ['8px', '8px'], `${where}: inside the page width the media takes the theme radius`);
    await t.redraw({settings: {section_width: 'full_width'}});
    eq(await t.css('.hsm__media', 'borderTopLeftRadius'), '0px', `${where}: at full width the media has square corners`);
  } else {
    ok(media.y === 0 && media.x === 0 && media.w === 375 && media.h === 320 && content.y === 320, `${where}: stacked, media first, edge to edge (${JSON.stringify(media)})`);
    await t.redraw({settings: {mobile_image_first: false}});
    media = await box('.hsm__media'); content = await box('.hsm__content');
    ok(content.y === 0 && media.y === content.b && media.h === 320, `${where}: media last (${JSON.stringify(media)})`);
    await t.redraw({settings: {full_height: true}});
    media = await box('.hsm__media');
    ok((await box('.hsm__grid')).h === 900 && media.h > 320, `${where}: fills the screen height, the media takes the rest (${media.h})`);
  }
  /* empty states */
  await t.redraw({settings: {image: '', image_alt: '', section_width: 'full_width', full_height: false}, blocks: []});
  const emptyText = await t.page.locator('#shopify-section-test .hsm__content').evaluate(e => getComputedStyle(e).display);
  if (editing) ok(emptyText !== 'none' && await t.page.locator('#shopify-section-test .hero-preview-cover').count() === 1, `${where}: with no blocks the builder shows where the text goes`);
  else ok(emptyText === 'none' && (await box('.hsm__media')).w === (width >= 768 ? 1366 : 375), `${where}: with no blocks a visitor sees the media alone`);
  eq(await t.page.locator('#shopify-section-test .hsm__img').evaluate(e => [e.hasAttribute('data-r7h-empty'), e.getAttribute('alt'), /^data:image\/svg\+xml/.test(e.getAttribute('src'))]), [true, '', true], `${where}: with no picture the placeholder stands in`);
  ok(await t.noOverflow(), `${where}: no sideways scroll`);
  eq(t.errors, [], `${where}: no errors`);
  await t.page.close();
}

/* The video plays only on screen, with the tab visible and motion allowed; the button pauses and plays it. */
async function splitVideo(browser, width, reducedMotion) {
  const sec = SECTIONS.split, where = `hero-split-media ${width} video${reducedMotion === 'reduce' ? ' reduced motion' : ''}`;
  const t = await mount(browser, sec.name, {width, editing: true, settings: {image: IMG, video: VIDEO}, reducedMotion});
  await prep(t);
  eq(await t.page.locator('#shopify-section-test .hsm__video').evaluate(e => [e.getAttribute('src'), e.muted, e.loop, e.playsInline, e.hasAttribute('autoplay'), e.hasAttribute('controls'), e.getAttribute('preload'), e.hidden]), ['https://theme.test/clip.mp4', true, true, true, false, false, 'metadata', false], `${where}: the mp4 source, muted, looped, inline, started by the controller only`);
  ok(await t.page.locator('#shopify-section-test .hsm__toggle').isHidden(), `${where}: without the controller there is no dead button`);
  await t.page.evaluate(() => {
    window.__v = {play: 0, pause: 0};
    const proto = HTMLMediaElement.prototype;
    Object.defineProperty(proto, 'paused', {configurable: true, get() { return this.__paused !== false; }});
    proto.play = function () { window.__v.play++; this.__paused = false; return Promise.resolve(); };
    proto.pause = function () { if (this.__paused === false) window.__v.pause++; this.__paused = true; };
  });
  await t.page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', ASSET), 'utf8')});
  await t.page.waitForTimeout(200); await frames(t);
  const state = () => t.page.evaluate(() => { const v = document.querySelector('#shopify-section-test .hsm__video'), b = document.querySelector('#shopify-section-test .hsm__toggle'); return {playing: !v.paused, pressed: b.getAttribute('aria-pressed'), button: !b.hidden, plays: window.__v.play, pauses: window.__v.pause}; });
  let s = await state();
  const toggle = await t.page.locator('#shopify-section-test .hsm__toggle').boundingBox();
  ok(s.button && toggle.width >= 44 && toggle.height >= 44, `${where}: the pause button is a 44px target`);
  ok((await t.page.locator('#shopify-section-test .hsm__toggle').getAttribute('aria-label')).length > 3, `${where}: the pause button has a name`);
  if (reducedMotion === 'reduce') {
    eq([s.playing, s.pressed, s.plays], [false, 'false', 0], `${where}: the video does not start`);
    ok(await t.page.locator('#shopify-section-test .hsm__img').isVisible() && await t.page.locator('#shopify-section-test .r7h__heading').isVisible(), `${where}: the picture and the text are shown`);
    await t.page.click('#shopify-section-test .hsm__toggle'); await frames(t);
    s = await state();
    eq([s.playing, s.pressed], [true, 'true'], `${where}: the visitor can still start it`);
  } else {
    eq([s.playing, s.pressed, s.plays], [true, 'true', 1], `${where}: on screen the video plays`);
    await t.page.click('#shopify-section-test .hsm__toggle'); await frames(t);
    s = await state();
    eq([s.playing, s.pressed], [false, 'false'], `${where}: the button pauses it`);
    await t.page.focus('#shopify-section-test .hsm__toggle'); await t.page.keyboard.press('Enter'); await frames(t);
    s = await state();
    eq([s.playing, s.pressed], [true, 'true'], `${where}: and the keyboard plays it again`);
    /* off screen */
    await t.page.evaluate(() => { const d = document.createElement('div'); d.id = 'r7-spacer'; d.style.height = '3000px'; document.body.prepend(d); });
    await t.page.waitForTimeout(250); await frames(t);
    eq((await state()).playing, false, `${where}: off screen it pauses`);
    await t.page.evaluate(() => document.getElementById('r7-spacer').remove());
    await t.page.waitForTimeout(250); await frames(t);
    eq((await state()).playing, true, `${where}: back on screen it plays`);
    /* hidden tab */
    await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
    eq((await state()).playing, false, `${where}: a hidden tab pauses it`);
    await t.page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}); document.dispatchEvent(new Event('visibilitychange')); });
    eq((await state()).playing, true, `${where}: the tab coming back plays it`);
    /* an unrelated live edit leaves the video alone; removing it live hides it and its button */
    const before = await state();
    await t.page.evaluate(() => { window.__vid = document.querySelector('#shopify-section-test .hsm__video'); });
    await t.emit({content_gap: 30, image_position_x: 20}); await frames(t);
    const after = await state();
    ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .hsm__video') === window.__vid) && after.plays === before.plays && after.pauses === before.pauses && after.playing, `${where}: an unrelated edit does not restart the video`);
    eq(await t.css('.hsm__video', 'objectPosition'), '20% 50%', `${where}: the focus point moves the video too`);
    await t.emit({video: ''}); await frames(t);
    ok(await t.page.locator('#shopify-section-test .hsm__video').isHidden() && await t.page.locator('#shopify-section-test .hsm__toggle').isHidden(), `${where}: taking the video away live leaves the picture`);
    await t.emit({video_url: '/media/clip-b.mp4'}); await frames(t);
    eq(await t.page.locator('#shopify-section-test .hsm__video').evaluate(e => [e.getAttribute('src'), e.hidden]), ['/media/clip-b.mp4', false], `${where}: a video address is used when no video is uploaded`);
    /* a redraw sets the video up once */
    const plays = (await state()).plays;
    await t.redraw({settings: {video: VIDEO}}); await t.page.waitForTimeout(200); await frames(t);
    s = await state();
    ok(s.playing && s.plays === plays + 1 && s.button, `${where}: after a redraw the new video starts once (${s.plays - plays})`);
    await t.page.click('#shopify-section-test .hsm__toggle'); await frames(t);
    eq((await state()).playing, false, `${where}: and one press pauses it (one listener)`);
  }
  eq(t.errors, [], `${where}: no errors`);
  await t.page.close();
}

/* ---------------------------------------------------------- Hero Collage */
const tiles = n => Array.from({length: n}, (_, i) => ({type: 'image', settings: {image: i % 2 ? IMG2 : IMG, alt: 'Picture ' + (i + 1)}}));
async function collageDesktop(browser, editing) {
  const sec = SECTIONS.collage, where = `hero-collage 1366 ${editing ? 'builder' : 'storefront'}`, text = clone(schemaOf(sec.name).schema.presets[0].blocks).filter(b => b.type !== 'image');
  const t = await mount(browser, sec.name, {width: 1366, editing, settings: {image_aspect_ratio: 'portrait', collage_offset_desktop: 40}, blocks: text.concat(tiles(3)), assets: [ASSET]});
  await prep(t);
  const boxes = () => t.page.locator('#shopify-section-test .hcl__tile').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom)}; }));
  let b = await boxes();
  ok(b.length === 3 && b[1].x === b[2].x && b[1].x > b[0].x && b[1].y === b[0].y + 40 && b[2].y > b[1].b && Math.abs(b[0].h - (b[2].b - b[1].y)) <= 1 && b[1].w === b[0].w, `${where}: three pictures are one tall picture beside two stacked, the second column 40px lower (${JSON.stringify(b)})`);
  ok(await t.page.locator('#shopify-section-test .hcl__nav').isHidden() && !(await t.page.locator('#shopify-section-test .hcl__track').getAttribute('tabindex')) && await t.page.locator('#shopify-section-test .hcl__track').evaluate(e => e.scrollWidth <= e.clientWidth + 1), `${where}: no arrows and nothing to scroll on desktop`);
  const media = await t.page.locator('#shopify-section-test .hcl__media').boundingBox(), content = await t.page.locator('#shopify-section-test .hcl__content').boundingBox();
  ok(media.x > content.x && Math.round(b[2].b) <= Math.round(media.y + media.height) + 1, `${where}: pictures on the right, the offset stays inside the section`);
  await t.redraw({blocks: text.concat(tiles(2))});
  b = await boxes();
  ok(b.length === 2 && b[0].y + 40 === b[1].y && b[0].w === b[1].w && b[1].x > b[0].x && Math.abs(b[0].h - b[0].w * 1.25) <= 1, `${where}: two pictures side by side, the second lower, both portrait (${JSON.stringify(b)})`);
  await t.redraw({blocks: text.concat(tiles(4))});
  b = await boxes();
  ok(b.length === 4 && b[0].y + 40 === b[1].y && b[2].y + 40 === b[3].y && b[2].x === b[0].x && b[3].x === b[1].x && b[2].y > b[0].b, `${where}: four pictures in two columns, the second lower (${JSON.stringify(b)})`);
  await t.redraw({blocks: text.concat(tiles(1))});
  b = await boxes();
  ok(b.length === 1 && Math.abs(b[0].w - Math.round(media.width)) <= 1, `${where}: one picture takes the column (${JSON.stringify(b)})`);
  await t.redraw({blocks: text.concat(tiles(6))});
  eq((await boxes()).length, 4, `${where}: never more than four pictures`);
  await t.redraw({blocks: text});
  ok(await t.page.locator('#shopify-section-test .hcl__media').isHidden() && (await t.page.locator('#shopify-section-test .hcl__content').boundingBox()).width > content.width, `${where}: with no pictures the text has the row`);
  await t.redraw({blocks: tiles(3)});
  if (editing) eq(await t.page.locator('#shopify-section-test .hero-preview-cover').count(), 1, `${where}: with no text blocks the builder shows where the text goes`);
  else eq(await t.page.locator('#shopify-section-test .r7h__stack').evaluate(e => e.children.length), 0, `${where}: with no text blocks a visitor sees the pictures alone`);
  /* a picture with a link is a link, live too */
  await t.redraw({blocks: text.concat(tiles(3).map((x, i) => i === 1 ? {type: 'image', settings: {...x.settings, link: '/collections/shirts'}} : x))});
  eq(await t.page.locator('#shopify-section-test .hcl__tile').evaluateAll(els => els.map(e => e.tagName + (e.getAttribute('href') || ''))), ['DIV', 'A/collections/shirts', 'DIV'], `${where}: a picture with a link is a link`);
  eq(await t.page.locator('#shopify-section-test .hcl__img').evaluateAll(els => els.map(e => [e.getAttribute('alt'), e.getAttribute('loading')].join())), ['Picture 1,eager', 'Picture 2,lazy', 'Picture 3,lazy'], `${where}: descriptions, and only the first picture loads at once`);
  if (editing) {
    const id = t.blockId('image', 0);
    await t.page.evaluate(() => { window.__img = document.querySelector('#shopify-section-test .hcl__img'); });
    await t.emit({link: '/pages/lookbook'}, id); await frames(t);
    eq(await t.page.locator(`#shopify-section-test [data-r7h-block="${id}"]`).evaluate(e => [e.tagName, e.getAttribute('href'), e.querySelector('img') === window.__img]), ['A', '/pages/lookbook', true], `${where}: a link added live wraps the same picture`);
    await t.emit({link: ''}, id); await frames(t);
    eq(await t.page.locator(`#shopify-section-test [data-r7h-block="${id}"]`).evaluate(e => [e.tagName, e.hasAttribute('href'), e.querySelector('img') === window.__img]), ['DIV', false, true], `${where}: and taking it away unwraps it`);
    eq(await audit(t), [], `${where}: markup equals the derived paint`);
  }
  ok(await t.noOverflow(), `${where}: no sideways scroll`);
  eq(t.errors, [], `${where}: no errors`);
  await t.page.close();
}

/* The picture row on a phone: a native scroller with snap; arrows and keys only call scrollBy. */
async function collageScroller(browser, editing, reducedMotion) {
  const sec = SECTIONS.collage, where = `hero-collage 375 ${editing ? 'builder' : 'storefront'} row${reducedMotion === 'reduce' ? ' reduced motion' : ''}`, text = clone(schemaOf(sec.name).schema.presets[0].blocks).filter(b => b.type !== 'image');
  const t = await mount(browser, sec.name, {width: 375, height: 700, editing, instances: [{uid: 'test', blocks: text.concat(tiles(4))}, {uid: 'two', blocks: text.concat(tiles(3))}], assets: [ASSET], reducedMotion});
  await prep(t); await frames(t);
  await t.page.evaluate(() => { window.__by = []; const by = Element.prototype.scrollBy; Element.prototype.scrollBy = function (o) { window.__by.push({id: this.closest('.shopify-section').id, behavior: o && o.behavior}); return by.apply(this, arguments); }; });
  const track = '#shopify-section-test .hcl__track';
  const m = () => t.page.locator(track).evaluate(e => { const tile = e.querySelector('.hcl__tile').getBoundingClientRect(), cs = getComputedStyle(e); return {left: Math.round(e.scrollLeft), max: e.scrollWidth - e.clientWidth, step: tile.width + parseFloat(cs.columnGap), tile: Math.round(tile.width), w: e.clientWidth, prev: e.parentElement.querySelector('[data-r7h-prev]').disabled, next: e.parentElement.querySelector('[data-r7h-next]').disabled, tab: e.getAttribute('tabindex')}; });
  const settle = async () => { let last = -1; for (let i = 0; i < 40; i++) { await t.page.waitForTimeout(60); const now = (await m()).left; if (now === last) break; last = now; } await frames(t); return m(); };
  let s = await m();
  eq(await t.page.locator(track).evaluate(e => { const cs = getComputedStyle(e); return [cs.overflowX, cs.scrollSnapType, cs.overscrollBehaviorX, cs.touchAction, cs.scrollbarWidth, getComputedStyle(e.querySelector('.hcl__tile')).scrollSnapAlign]; }), ['auto', 'x mandatory', 'contain', 'pan-x pan-y', 'none', 'start'], `${where}: a native scroller with snap that leaves the page's own scroll alone`);
  ok(s.max > s.step * 2 && s.tile === Math.round((375 - 30) * 0.75) && s.prev && !s.next && s.tab === '0', `${where}: four pictures at 75% of the column scroll, starting at the first (${JSON.stringify(s)})`);
  ok(await t.page.locator('#shopify-section-test .hcl__tile').first().evaluate(e => Math.round(e.getBoundingClientRect().x)) === 15 && await t.page.locator(track).evaluate(e => Math.round(e.getBoundingClientRect().right)) === 375, `${where}: the row lines up with the text and runs to the screen edge`);
  /* touch-style: the finger leaves the row between two pictures, the row snaps to one */
  await t.page.locator(track).evaluate((e, x) => { e.scrollLeft = x; }, Math.round(s.step * 0.7));
  s = await settle();
  ok(Math.abs(s.left - s.step) <= 2 && !s.prev && !s.next, `${where}: a swipe snaps to the next picture and wakes the back arrow (${s.left} of step ${s.step})`);
  /* arrows */
  await t.page.click('#shopify-section-test [data-r7h-next]');
  s = await settle();
  ok(Math.abs(s.left - s.step * 2) <= 2, `${where}: the next arrow moves one picture (${s.left})`);
  await t.page.click('#shopify-section-test [data-r7h-prev]');
  s = await settle();
  ok(Math.abs(s.left - s.step) <= 2, `${where}: the back arrow moves one picture back (${s.left})`);
  eq(await t.page.evaluate(() => window.__by.map(x => x.id + ' ' + x.behavior)), Array(2).fill('shopify-section-test ' + (reducedMotion === 'reduce' ? 'auto' : 'smooth')), `${where}: each press is one scrollBy, ${reducedMotion === 'reduce' ? 'instant under reduced motion' : 'smooth'}`);
  /* keys on the focused row */
  await t.page.focus(track);
  await t.page.keyboard.press('ArrowRight'); s = await settle();
  ok(Math.abs(s.left - s.step * 2) <= 2, `${where}: the right arrow key moves one picture (${s.left})`);
  await t.page.keyboard.press('ArrowLeft'); s = await settle();
  ok(Math.abs(s.left - s.step) <= 2, `${where}: the left arrow key moves back (${s.left})`);
  const y0 = await t.page.evaluate(() => scrollY);
  await t.page.keyboard.press('ArrowDown'); await t.page.waitForTimeout(250);
  ok(await t.page.evaluate(() => scrollY) > y0, `${where}: the down key still scrolls the page`);
  await t.page.evaluate(() => scrollTo(0, 0));
  /* the ends */
  await t.page.locator(track).evaluate(e => { e.scrollLeft = e.scrollWidth; });
  s = await settle();
  ok(s.left >= s.max - 1 && s.next && !s.prev, `${where}: at the end the next arrow is off (${JSON.stringify(s)})`);
  await t.page.locator(track).evaluate(e => { e.scrollLeft = 0; });
  s = await settle();
  ok(s.left === 0 && s.prev && !s.next, `${where}: back at the start the back arrow is off`);
  /* the other instance did not move, and has its own arrows */
  eq(await t.page.locator('#shopify-section-two .hcl__track').evaluate(e => e.scrollLeft), 0, `${where}: the second section's row did not move`);
  await t.page.locator('#shopify-section-two [data-r7h-next]').scrollIntoViewIfNeeded();
  await t.page.click('#shopify-section-two [data-r7h-next]'); await settle(); await t.page.waitForTimeout(300);
  ok(await t.page.locator('#shopify-section-two .hcl__track').evaluate(e => e.scrollLeft) > 100 && (await m()).left === 0, `${where}: its arrow moves its own row only`);
  await t.page.evaluate(() => scrollTo(0, 0));
  /* a redraw sets the row up once */
  await t.page.evaluate(() => { window.__by = []; });
  await t.redraw({uid: 'test'}); await t.redraw({uid: 'test'}); await frames(t);
  await t.page.click('#shopify-section-test [data-r7h-next]');
  s = await settle();
  ok(Math.abs(s.left - s.step) <= 2 && await t.page.evaluate(() => window.__by.length) === 1, `${where}: after two redraws one press is still one move (${s.left})`);
  /* settings of the row */
  await t.redraw({uid: 'test', settings: {show_arrows: false}});
  ok(await t.page.locator('#shopify-section-test .hcl__nav').isHidden() && (await m()).max > 100, `${where}: the arrows can be turned off, the row still swipes`);
  await t.redraw({uid: 'test', settings: {show_arrows: true}, blocks: text.concat(tiles(1))});
  s = await m();
  ok(await t.page.locator('#shopify-section-test .hcl__nav').isHidden() && s.max <= 1 && s.tab === null && s.tile === s.w - 30, `${where}: one picture fills the row, with no arrows and no tab stop (${JSON.stringify(s)})`);
  await t.redraw({uid: 'test', settings: {mobile_image_first: true}, blocks: text.concat(tiles(3))});
  ok((await t.page.locator('#shopify-section-test .hcl__media').boundingBox()).y < (await t.page.locator('#shopify-section-test .hcl__content').boundingBox()).y, `${where}: pictures first on phones`);
  /* right to left: next still means further along the row */
  await t.page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await t.redraw({uid: 'test', settings: {mobile_image_first: false}, blocks: text.concat(tiles(4))}); await frames(t);
  await t.page.click('#shopify-section-test [data-r7h-next]');
  s = await settle();
  ok(Math.abs(Math.abs(await t.page.locator(track).evaluate(e => e.scrollLeft)) - s.step) <= 2 && !s.prev && !s.next, `${where}: right to left, the next arrow moves one picture along (${s.left})`);
  await t.page.evaluate(() => { document.documentElement.dir = 'ltr'; });
  if (reducedMotion === 'reduce') ok(parseFloat(await t.css('.hcl__img', 'transitionDuration')) === 0 && await t.page.locator('#shopify-section-test .hcl__tile').first().isVisible(), `${where}: no motion, every picture shown`);
  ok(await t.noOverflow(), `${where}: no sideways scroll`);
  eq(t.errors, [], `${where}: no errors`);
  await t.page.close();
}

(async () => {
  const only = process.argv.slice(2), run = Object.entries(SECTIONS).filter(([k]) => !only.length || only.includes(k)).map(([, v]) => v);
  const names = fs.readdirSync(path.join(__dirname, '../sections')).filter(f => f.endsWith('.storelib')).map(f => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '../sections', f), 'utf8').split('<schema>')[1].split('</schema>')[0]); } catch (_) { return {}; } }).map(j => (j.shopify || j).name);
  for (const sec of run) {
    const {raw, schema} = schemaOf(sec.name);
    eq(schemaProblems(sec.name), [], sec.name + ': schema problems');
    eq(Object.keys(JSON.parse(raw.split('<schema>')[1].split('</schema>')[0])), ['shopify'], sec.name + ': the schema holds the theme schema only');
    ok(schema.name === sec.title && schema.name.length <= 25 && names.filter(n => n === schema.name).length === 1, sec.name + ': its name is its own');
    eq([schema.presets[0].name, schema.presets[0].category], [sec.title, 'Hero and banners'], sec.name + ': first preset');
    ok(raw.split('\n')[1] === `<script src="{{ '${ASSET}' | asset_url }}" defer="defer"></script>`, sec.name + ': line 2 links the controller');
    const texts = JSON.stringify(schema).replace(/\\u2014/g, '—');
    ok(!/—|\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(texts), sec.name + ': plain copy');
    for (const list of [schema.settings, ...schema.blocks.map(b => b.settings)]) for (const x of list.filter(y => y.type === 'range')) ok((x.max - x.min) / x.step <= 101 && x.default >= x.min && x.default <= x.max && Math.abs((x.default - x.min) / x.step - Math.round((x.default - x.min) / x.step)) < 1e-9, `${sec.name} ${x.id}: a range the builder can draw`);
    await headingLevel(sec);
  }
  const browser = await launch();
  try {
    for (const sec of run) {
      for (const width of [375, 1366]) for (const editing of [true, false]) await basics(browser, sec, width, editing);
      for (const width of [375, 1366]) for (const editing of [true, false]) await priority(browser, sec, width, editing);
      /* theme inheritance once more with Theme settings > "Use in every section" and the shared button shape off */
      for (const width of [375, 1366]) {
        const t = await mount(browser, sec.name, {width, priority: 'off', assets: [ASSET]});
        ok(/Georgia/.test(await t.css('.r7h__heading', 'fontFamily')) && await t.css('.r7h__heading', 'fontWeight') === '700' && /Arial/.test(await t.css('.r7h__text p', 'fontFamily')) && await t.css(sec.root, 'backgroundColor') === 'rgb(24, 32, 40)', `${sec.name} ${width} priority off: still the theme's fonts and colours`);
        eq(await styleOf(t, '.r7h__cta'), await reference(t, 'primary'), `${sec.name} ${width} priority off: still the theme's button`);
        eq(t.errors, [], `${sec.name} ${width} priority off: no errors`);
        await t.page.close();
      }
      /* Theme settings > Animations: the section takes the theme's reveal once, and nothing is hidden waiting for it */
      for (const editing of [true, false]) {
        const t = await mount(browser, sec.name, {width: 1366, editing, theme: {scroll_animation: 'fade_up'}, assets: [ASSET]});
        await t.redraw(); await t.redraw();
        eq(await t.page.evaluate(() => { const w = document.getElementById('shopify-section-test'), cs = getComputedStyle(w); return [w.className.split(' ').filter(c => c === 'scroll-trigger' || c === 'fade_up').join(' '), cs.opacity, cs.visibility]; }), ['scroll-trigger fade_up', '1', 'visible'], `${sec.name} ${editing ? 'builder' : 'storefront'}: the theme reveal class is added once and the content shows`);
        eq(t.errors, [], `${sec.name} theme reveal: no errors`);
        await t.page.close();
      }
      const seen = {};
      for (const width of [375, 1366]) for (const editing of [true, false]) await everyControl(browser, sec, width, editing, seen);
      const same = [];
      for (const [key, e] of Object.entries(seen)) {
        ok(e.changed, `${sec.name} ${key} changes what is drawn`);
        const opts = Object.entries(e.opts);
        if (opts.length > 2) for (let i = 0; i < opts.length; i++) for (let j = i + 1; j < opts.length; j++) {
          const [vi, a] = opts[i], [vj, b] = opts[j];
          if (!Object.keys(a).some(k => b[k] && a[k] !== b[k])) same.push(`${key}: ${vi} and ${vj}`); else checks++;
        }
      }
      eq(same, [], sec.name + ': every option of every select looks different from the others');
      await lifecycle(browser, sec);
      if (sec === SECTIONS.split) {
        for (const width of [375, 1366]) for (const editing of [true, false]) await splitLayout(browser, width, editing);
        for (const width of [375, 1366]) { await splitVideo(browser, width, 'no-preference'); await splitVideo(browser, width, 'reduce'); }
      } else {
        for (const editing of [true, false]) { await collageDesktop(browser, editing); await collageScroller(browser, editing, 'no-preference'); }
        await collageScroller(browser, true, 'reduce');
      }
    }
    console.log(checks + ' Hero Split and Hero Collage checks passed (' + run.map(s => s.name).join(', ') + '): theme inheritance, priority, every control live equals redraw, lifecycle, video, picture row');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
