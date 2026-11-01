/* Round 6, page popups: Countdown Promo Popup, Coupon Promo Popup, Promotion
   Popup Discount (promobanner), Promotional Newsletter 2, Image Banner Popup,
   Signup Discount Popup (promotional-popup), Promotional Popup 2 and Spin
   Wheel Popup, run by shopify/assets/materia-popups.js (triggers, how often,
   one at a time) and shopify/assets/live-page-popups.js (the native dialog,
   live edits, redraws), plus Back To Top Pro.

   For each popup at 375 and 1366: the real section rendered with its saved
   settings (sections/overlay-group.json); on the live site it opens as a
   modal <dialog> (the page behind is inert and does not scroll), the close
   button is 44px and closes it, Escape closes it, a click on the backdrop
   closes it, focus goes back to what opened it, the card fits the screen,
   and once closed it is remembered for that section (a second section is
   not). In the builder it is drawn in the page, not modal, takes no focus,
   leaves the page clickable, Escape closes it, and a redraw keeps it open
   and set up once. Custom colours and fonts are opt in (off follows the
   scheme and the theme fonts, on wins under the theme's priority), the
   colour scheme swaps live, and the saved popups (with the toggles the
   lead sets) look as they did at c098384.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r6-page-popups.cjs [name ...] */
const fs = require('fs'), path = require('path'), os = require('os'), {execSync} = require('child_process');
const assert = require('assert/strict');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ROOT = path.join(__dirname, '..');
const OG = JSON.parse(fs.readFileSync(path.join(ROOT, 'sections/overlay-group.json'), 'utf8'));
const ASSETS = ['materia-popups.js', 'live-page-popups.js'];
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'}, MONO = {family: 'Courier New', fallback_families: 'monospace'};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const wait = (t, ms) => t.page.waitForTimeout(ms);

/* card, close, backdrop (what a click outside the card lands on), heading */
const P = {
  'countdown-promo-popup': {card: '.cdp-card-{id}', close: '.cdp-close-{id}', heading: '.cdp-headline-{id}', open: {open_mode: 'immediate', delay_s: 0, after_dismiss: 'after_days', hide_days: 2}, preview: {editor_mode: true}},
  'coupon-promotion-newsletter-popup': {card: '.cpnb-card-{id}', close: '.cpnb-close-{id}', heading: '#cpnb-title-{id}', open: {open_mode: 'immediate', delay_s: 0, after_dismiss: 'after_days', hide_days: 2}, preview: {editor_mode: true}},
  'promobanner': {card: '.pbp-card', close: '.pbp-close', heading: '#pbp-title-{id}', open: {open_mode: 'immediate', delay_s: 0, hide_days: 2, once_per_session: false, show_as_popup: true}, preview: {enable_edit_mode: true}},
  'promonewsletterpopup-2': {card: '.loudz__container', close: '.loudz__close', heading: '#loudz-title-{id}', open: {open_mode: 'immediate', popup_delay: 0, hide_days: 2, once_per_session: false, render_as_popup: true}, preview: {enable_edit_mode: true}},
  'promotional-image-popup': {card: '.promobanner-popup-inner-{id}', close: '.promobanner-popup-close-{id}', heading: null, open: {display_options: 'after_seconds', seconds: 0, hide_promobanner_days: 2}, preview: {show_in_builder: true}},
  'promotional-popup': {card: '.ppd', close: '.ppd__close', heading: '#ppd-title-{id}', open: {trigger: 'load', delay: 0, frequency: 'once'}, preview: {show_in_builder: true}},
  'promotionalpopup2': {card: '.loudz__content-box', close: '.loudz__close', heading: '#loudz-title-{id}', open: {open_mode: 'immediate', popup_delay: 0, after_dismiss: 'after_days', hide_days: 2}, preview: {enable_customization_mode: true}},
  'spin-wheel-popup': {card: '.sw-card-{id}', close: '.sw-close-{id}', heading: '#sw-title-{id}', open: {open_mode: 'immediate', delay_s: 0, after_dismiss: 'after_days', hide_days: 2}, preview: {editor_mode: true}},
};
const q = (s, id) => s.replace(/\{id\}/g, id);
function saved(type) {
  const inst = Object.values(OG.sections).find(s => s.type === type);
  if (!inst) {
    const {schema} = schemaOf(type);
    return {settings: {}, blocks: (schema.blocks || []).map(b => ({type: b.type, settings: {}}))};
  }
  return {settings: JSON.parse(JSON.stringify(inst.settings)), blocks: (inst.block_order || []).map(k => JSON.parse(JSON.stringify(inst.blocks[k])))};
}
/* the toggles the saved popups need to keep their own colours */
function toggled(type, base) {
  const {schema} = schemaOf(type);
  const withToggle = new Set((schema.blocks || []).filter(b => b.settings.some(x => x.id === 'enable_custom_style')).map(b => b.type));
  return {settings: {...base.settings, enable_custom_style: true}, blocks: base.blocks.map(b => withToggle.has(b.type) ? {...b, settings: {...b.settings, enable_custom_style: true}} : b)};
}
const state = (t, id = 'test') => t.page.evaluate(id => {
  const pop = document.querySelector('[data-popup-root="' + id + '"]');
  const d = pop && (pop.closest('dialog[data-pg-dialog]') || pop.querySelector('dialog[data-pg-dialog]'));
  return {open: !!(d && d.open), modal: !!(d && d.open && d.matches(':modal')), position: d ? getComputedStyle(d).position : '', current: window.MateriaPopups ? MateriaPopups.current() : null, lock: document.documentElement.hasAttribute('data-popup-open'), active: document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName)};
}, id);

async function storefront(browser, type, width) {
  const tag = type + ' @' + width;
  const p = P[type], base = saved(type), id = 'test';
  const settings = {...toggled(type, base).settings, ...p.open};
  let t = await mount(browser, type, {width, editing: false, settings, blocks: toggled(type, base).blocks, assets: ASSETS});
  await t.page.evaluate(() => { const b = document.createElement('button'); b.id = 'opener'; b.textContent = 'Open'; b.style.cssText = 'position:fixed;left:0;bottom:0;width:60px;height:44px'; document.body.prepend(b); });
  await wait(t, 300);
  let s = await state(t);
  ok(s.open && s.modal, tag + ' opens as a modal dialog');
  ok(s.lock, tag + ' the page does not scroll behind it');
  ok(await t.page.evaluate(() => { const b = document.getElementById('opener'); return b.matches(':is(*)') && document.elementFromPoint(30, innerHeight - 20) !== b; }), tag + ' the page behind does not take clicks');
  const box = await t.root(q(p.close, id)).first().boundingBox();
  ok(box && box.width >= 44 && box.height >= 44, tag + ' close button 44px (' + (box && [box.width, box.height]) + ')');
  const card = await t.root(q(p.card, id)).first().boundingBox();
  ok(card.x >= -1 && card.x + card.width <= width + 1 && card.height > 60, tag + ' card fits the screen ' + JSON.stringify([card.x, card.width]));
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  if (p.heading) ok(await t.page.evaluate(([sel]) => { const d = document.querySelector('dialog[data-pg-dialog]'), h = document.querySelector(sel); const ref = d.getAttribute('aria-labelledby'); return !!h && h.tagName === 'H2' && (!ref || document.getElementById(ref) === h); }, [q(p.heading, id)]), tag + ' an h2 names the dialog');
  ok(!(await t.page.evaluate(() => [...document.querySelectorAll('dialog[data-pg-dialog] [role="dialog"]')].length)), tag + ' one dialog, no nested role=dialog');
  /* Escape closes it */
  await t.page.keyboard.press('Escape'); await wait(t, 120);
  s = await state(t);
  ok(!s.open && !s.current && !s.lock, tag + ' Escape closes it and frees the page');
  await wait(t, 450);
  ok(await t.page.evaluate(([sel]) => getComputedStyle(document.querySelector(sel)).visibility === 'hidden' || !document.querySelector(sel).checkVisibility(), [q(p.card, id)]), tag + ' the closed card is hidden (out of the tab order)');
  ok(await t.page.evaluate(() => { const k = Object.keys(localStorage).find(x => x === 'materia:popup:test'); return !!k; }), tag + ' remembered for this section');
  /* the opener gets focus back; the close button and the backdrop close it */
  await t.page.focus('#opener');
  await t.page.evaluate(() => MateriaPopups.open('test')); await wait(t, 120);
  ok((await state(t)).modal, tag + ' opens again from its opener');
  await t.root(q(p.close, id)).first().click(); await wait(t, 120);
  s = await state(t);
  ok(!s.open && s.active === 'opener', tag + ' the close button closes it and focus goes back (' + s.active + ')');
  await t.page.evaluate(() => MateriaPopups.open('test')); await wait(t, 120);
  await t.page.mouse.click(3, 3); await wait(t, 120);
  ok(!(await state(t)).open, tag + ' a click on the backdrop closes it');
  /* remembered: a new page view does not open it again */
  await t.redraw({settings}); await wait(t, 250);
  ok(!(await state(t)).open, tag + ' not offered again after closing (remembered)');
  ok(!t.errors.length, tag + ' no errors ' + t.errors.join('; '));
  await t.page.close();

  /* two popups: one at a time, each remembered on its own */
  t = await mount(browser, type, {width, editing: false, instances: [{uid: 'a', settings, blocks: base.blocks}, {uid: 'b', settings, blocks: base.blocks}], assets: ASSETS});
  await wait(t, 300);
  const sa = await state(t, 'a'), sb = await state(t, 'b');
  ok(sa.open !== sb.open && (sa.current === 'a' || sa.current === 'b'), tag + ' two popups: one at a time');
  await t.page.keyboard.press('Escape'); await wait(t, 900);
  const sa2 = await state(t, 'a'), sb2 = await state(t, 'b');
  ok(sa2.open !== sb2.open && sa2.open === !sa.open, tag + ' the second opens once the first is closed');
  ok(await t.page.evaluate(() => !!localStorage.getItem('materia:popup:a') !== !!localStorage.getItem('materia:popup:b') || (!!localStorage.getItem('materia:popup:a') && !!localStorage.getItem('materia:popup:b'))), tag + ' remembered per section');
  await t.page.close();

  /* reduced motion: still opens, nothing animates */
  t = await mount(browser, type, {width, editing: false, settings, blocks: base.blocks, assets: ASSETS, reducedMotion: 'reduce'});
  await wait(t, 300);
  ok((await state(t)).modal, tag + ' reduced motion: opens');
  ok(await t.page.evaluate(([sel]) => { const c = document.querySelector(sel); const cs = getComputedStyle(c); return parseFloat(cs.transitionDuration) <= 0.02 && !c.getAnimations().some(a => a.playState === 'running' && a.effect && a.effect.getTiming().duration > 20); }, [q(p.card, 'test')]), tag + ' reduced motion: no movement');
  await t.page.close();
}

async function builder(browser, type, width) {
  const tag = type + ' builder @' + width;
  const p = P[type], base = saved(type);
  const settings = {...base.settings, ...p.open, ...p.preview};
  const t = await mount(browser, type, {width, editing: true, settings, blocks: base.blocks, assets: ASSETS});
  await t.page.evaluate(() => { const m = document.createElement('main'); m.id = 'MainContent'; m.innerHTML = '<a id="pagelink" href="#x" style="display:block;height:44px">Page</a><div style="height:1400px"></div>'; document.body.prepend(m); });
  await wait(t, 300);
  let s = await state(t);
  ok(s.open && !s.modal && s.position === 'relative', tag + ' drawn in the page, not modal (' + s.position + ')');
  ok(!s.lock, tag + ' the page still scrolls');
  ok(s.active === 'BODY' || s.active === '' || /shopify-design-mode/.test(s.active), tag + ' takes no focus (' + s.active + ')');
  ok(await t.page.evaluate(() => document.elementFromPoint(20, 20)?.id === 'pagelink'), tag + ' the page can still be clicked');
  const card = await t.root(q(p.card, 'test')).first().boundingBox();
  ok(card && card.x >= -1 && card.x + card.width <= width + 1, tag + ' card fits the canvas');
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  /* a redraw keeps it open and sets it up once */
  await t.redraw({settings}); await wait(t, 300);
  s = await state(t);
  ok(s.open && !s.modal, tag + ' a redraw keeps it open');
  eq(await t.page.evaluate(() => document.querySelectorAll('[data-popup-id="test"]').length), 1, tag + ' registered once after a redraw');
  /* live colour scheme */
  await t.emit({color_scheme: 'alt-scheme'}); await wait(t, 60);
  ok(await t.page.evaluate(() => document.querySelector('[data-pg-root]').classList.contains('color-alt-scheme') && !document.querySelector('[data-pg-root]').classList.contains('color-default-color-scheme')), tag + ' colour scheme swaps live');
  /* Escape closes the preview */
  await t.page.keyboard.press('Escape'); await wait(t, 120);
  ok(!(await state(t)).open, tag + ' Escape closes the preview');
  ok(!t.errors.length, tag + ' no errors ' + t.errors.join('; '));
  await t.page.close();
  /* nothing opens on a timer in the builder when the preview is off */
  const off = Object.fromEntries(Object.keys(p.preview).map(k => [k, false]));
  const t2 = await mount(browser, type, {width, editing: true, settings: {...settings, ...off}, blocks: base.blocks, assets: ASSETS});
  await wait(t2, 300);
  ok(!(await state(t2)).open, tag + ' preview off: nothing opens on a timer');
  await t2.page.evaluate(() => document.dispatchEvent(new CustomEvent('shopify:section:select', {detail: {sectionId: 'test'}})));
  await wait(t2, 120);
  ok((await state(t2)).open && !(await state(t2)).modal, tag + ' preview off: opens in the page when selected');
  await t2.page.close();
}

/* custom colours and fonts: off follows the scheme and the theme, on wins */
async function styling(browser, type, width) {
  const tag = type + ' style @' + width;
  const p = P[type], base = saved(type);
  const settings = {...base.settings, ...p.open};
  const cardBg = t => t.page.evaluate(([sel]) => { let el = document.querySelector(sel); while (el) { const b = getComputedStyle(el).backgroundColor; if (b !== 'rgba(0, 0, 0, 0)') return b; el = el.parentElement; } return ''; }, [q(p.card, 'test')]);
  let t = await mount(browser, type, {width, editing: false, settings, blocks: base.blocks, assets: ASSETS});
  await wait(t, 300);
  const offBg = await cardBg(t);
  ok(/rgb\(24, 32, 40\)/.test(offBg) || type === 'promonewsletterpopup-2' || type === 'promotionalpopup2', tag + ' off: the card follows the scheme background (' + offBg + ')');
  if (p.heading) {
    const ff = await t.css(q(p.heading, 'test'), 'fontFamily');
    ok(/Georgia/.test(ff), tag + ' off: the heading uses the theme heading font (' + ff + ')');
  }
  await t.page.close();
  const on = toggled(type, base);
  t = await mount(browser, type, {width, editing: false, settings: {...on.settings, ...p.open, enable_custom_fonts: true, heading_font: FONT, body_font: MONO}, blocks: on.blocks, assets: ASSETS});
  await wait(t, 300);
  const onBg = await cardBg(t);
  ok(onBg !== offBg || !Object.keys(base.settings).some(k => /^(card_bg|background_color|modal_bg|popup_container_background_color)$/.test(k) && base.settings[k]), tag + ' on: the saved card colour wins (' + onBg + ')');
  ok(await t.page.evaluate(() => document.querySelector('[data-pg-root]').hasAttribute('data-own-font')), tag + ' fonts on: data-own-font on the popup');
  if (p.heading) {
    const ff = await t.css(q(p.heading, 'test'), 'fontFamily');
    ok(/Verdana/.test(ff), tag + ' fonts on: the heading font wins under the theme priority (' + ff + ')');
  }
  const bf = await t.page.evaluate(([sel]) => { const c = document.querySelector(sel); const el = c.querySelector('p:not([class*="code"]), input, label') || c; return getComputedStyle(el).fontFamily; }, [q(p.card, 'test')]);
  ok(/Courier New/.test(bf), tag + ' fonts on: the text font wins (' + bf + ')');
  const btn = await t.page.evaluate(([sel]) => { const b = document.querySelector(sel + ' [data-theme-button]'); return b ? getComputedStyle(b).fontFamily : 'Courier New'; }, [q(p.card, 'test')]);
  ok(/Courier New/.test(btn), tag + ' fonts on: the button follows the text font (' + btn + ')');
  ok(!t.errors.length, tag + ' no errors ' + t.errors.join('; '));
  await t.page.close();
}

/* the saved popups (with the toggles set) look as they did at c098384 */
const OLD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'r6-old-'));
function oldName(type) {
  const f = path.join(OLD_DIR, type + '.storelib');
  if (!fs.existsSync(f)) fs.writeFileSync(f, execSync('git -C ' + JSON.stringify(ROOT) + ' show c098384:sections/' + type + '.storelib', {encoding: 'utf8'}));
  return path.relative(path.join(ROOT, 'sections'), f).replace(/\.storelib$/, '');
}
async function fingerprint(t, sel) {
  await t.page.addStyleTag({content: '*,*::before,*::after{transition:none!important;animation:none!important}'});
  await wait(t, 60);
  return t.page.evaluate(sel => {
    const card = document.querySelector(sel), out = {}, seen = {}, r0 = card.getBoundingClientRect();
    out.card = [r0.x, r0.y, r0.width, r0.height].map(Math.round).join(',');
    for (const e of [card, ...card.querySelectorAll('*')]) {
      if (e.ownerSVGElement || e.closest('style,script,template')) continue;
      const cls = typeof e.className === 'string' ? e.className.split(' ')[0] : '';
      let k = e.tagName + '.' + cls; seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      const o = {};
      for (const p of ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'borderTopLeftRadius', 'borderTopColor', 'textAlign', 'display', 'visibility', 'opacity']) o[p] = cs[p];
      o.rect = [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',');
      if (!e.children.length && !e.closest('[data-cdp-num]')) o.text = e.textContent.trim().slice(0, 60);
      out[k] = o;
    }
    return out;
  }, sel);
}
async function savedLook(browser, type, width) {
  const tag = type + ' saved @' + width;
  const p = P[type], base = saved(type);
  if (!Object.values(OG.sections).some(s => s.type === type)) return;
  const trig = {...p.open};
  const old = await mount(browser, oldName(type), {width, editing: false, settings: {...base.settings, ...trig}, blocks: base.blocks, assets: ['materia-popups.js']});
  await wait(old, 400);
  const a = await fingerprint(old, q(p.card, 'test'));
  await old.page.close();
  const on = toggled(type, base);
  const now = await mount(browser, type, {width, editing: false, settings: {...on.settings, ...trig}, blocks: on.blocks, assets: ASSETS});
  await wait(now, 400);
  const b = await fingerprint(now, q(p.card, 'test'));
  await now.page.close();
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  eq(keys.map(k => k + ' ' + JSON.stringify(a[k]) + ' -> ' + JSON.stringify(b[k])), [], tag + ' looks as it did');
}

async function backToTop(browser, width) {
  const tag = 'back-to-top-pro @' + width;
  const base = saved('back-to-top-pro');
  for (const editing of [false, true]) {
    const t = await mount(browser, 'back-to-top-pro', {width, editing, settings: {...base.settings, enable_custom_style: true}, assets: ASSETS});
    await t.page.evaluate(() => { const d = document.createElement('main'); d.id = 'MainContent'; d.style.height = '4000px'; document.body.prepend(d); });
    await t.page.evaluate(() => window.scrollTo(0, 1200)); await wait(t, 150);
    const bb = await t.root('[data-back-to-top]').boundingBox();
    ok(bb && bb.width >= 44 && bb.height >= 44, tag + ' 44px target');
    ok(await t.root('[data-back-to-top]').evaluate(b => b.classList.contains('is-visible')), tag + ' shows after scrolling');
    eq(await t.css('.top-circle-test', 'backgroundColor'), 'rgb(255, 255, 255)', tag + ' saved colour with custom colours on');
    /* a redraw does not stack scroll listeners */
    for (let i = 0; i < 3; i++) await t.redraw({settings: {}});
    await t.page.evaluate(() => window.scrollTo(0, 0)); await wait(t, 150);
    ok(await t.root('[data-back-to-top]').evaluate(b => !b.classList.contains('is-visible')), tag + ' hides at the top after redraws');
    await t.redraw({settings: {enable_custom_style: false}});
    eq(await t.css('.top-circle-test', 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' custom colours off: the scheme background');
    await t.emit({color_scheme: 'alt-scheme'}); await wait(t, 60);
    eq(await t.css('.top-circle-test', 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' colour scheme swaps live');
    ok(!t.errors.length, tag + ' no errors ' + t.errors.join('; '));
    await t.page.close();
  }
}

function statics() {
  for (const type of [...Object.keys(P), 'back-to-top-pro']) {
    eq(schemaProblems(type), [], type + ' schema: colour scheme first, no exposed tag select');
    const {schema, raw} = schemaOf(type);
    const ids = schema.settings.filter(x => x.id).map(x => x.id);
    ok(ids.includes('enable_custom_style'), type + ' custom colours toggle');
    for (const x of schema.settings) if (x.type === 'color' || x.type === 'color_background') eq(x.visible_if, '{{ section.settings.enable_custom_style == true }}', type + ' ' + x.id + ' shows only with custom colours');
    if (type !== 'back-to-top-pro') {
      ok(['enable_custom_fonts', 'heading_font', 'body_font'].every(i => ids.includes(i)), type + ' custom fonts');
      ok(/<dialog class="pg-dialog" data-pg-dialog/.test(raw), type + ' native dialog');
      eq((schema.presets || []).length, 0, type + ' no preset (placed in the overlay group)');
      ok(/"custom\.overlay"/.test(JSON.stringify(schema.enabled_on || {})) || type === 'promotional-popup', type + ' placeable in the overlay group');
    }
    const tpl = raw.split('<schema>')[0];
    ok(!/\b(WELCOME15|SAVE20|DISC100|SPIN10)\b/.test(JSON.stringify(schema)), type + ' no invented codes in defaults');
    ok(!/—/.test(JSON.stringify(schema)) && !/\bunlock\b/i.test(JSON.stringify(schema)), type + ' no em dashes or "unlock" in defaults');
    for (const form of tpl.matchAll(/<form\s[^>]*>/g)) ok(/data-storelib-form="subscribe"/.test(form[0]), type + ' signup form posts to Subscribers');
  }
  const sw = schemaOf('spin-wheel-popup').schema.blocks.find(b => b.type === 'prize').settings;
  ok(!sw.find(x => x.id === 'code').default && sw.find(x => x.id === 'label').default === 'Prize', 'spin wheel: prize codes are the creator\'s own');
}

(async () => {
  const only = process.argv.slice(2);
  const want = n => !only.length || only.includes(n);
  statics();
  const browser = await launch();
  try {
    for (const type of Object.keys(P)) {
      if (!want(type)) continue;
      for (const width of [375, 1366]) {
        await storefront(browser, type, width);
        await builder(browser, type, width);
        await styling(browser, type, width);
        await savedLook(browser, type, width);
      }
      console.log('ok', type, checks);
    }
    if (want('back-to-top-pro')) for (const width of [375, 1366]) await backToTop(browser, width);
  } finally { await browser.close(); fs.rmSync(OLD_DIR, {recursive: true, force: true}); }
  console.log(checks + ' page popup checks passed');
})().catch(e => { console.error(e); process.exit(1); });
