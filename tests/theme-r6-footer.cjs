/* Run: LIQUIDJS=<path to liquidjs> node tests/theme-r6-footer.cjs
   Round 6, footer and phone navigation: every setting of the Footer
   (sections/theme-footer) and of each footer block, and of the Mobile
   navigation bar and its tabs, on the real layout with Theme settings >
   Typography "Use in every section" on, in the builder, at 375 and 1366.

   For each control: the builder's live event (storelib:settings-change,
   applied by shopify/assets/live-footer.js) and the builder's redraw
   (storelib:section-load) must give the same page, and the redraw must
   visibly change something (a box, a computed style, text or an attribute
   a visitor or a screen reader meets). Controls that change the markup
   itself (a menu, a picture, social icons, a payment badge, an icon) wait
   for the redraw; the live event must then leave the page as it was.
   Also: schema order and labels (no untranslated t: keys, every id kept
   since c098384), theme inheritance and the opt-in custom colours and fonts
   (on wins under the theme priority, off restores the theme), the newsletter
   posts to Storelib (data-storelib-form="subscribe") with its own messages,
   the phone accordion after a redraw, one controller per section after
   redraws, 44px targets at 375, reduced motion, and Custom colors and Size
   chart data still do their job. */
const assert = require('node:assert/strict');
const L = require('./theme-r6-footer-lib.cjs');
const {read, readHead} = L;
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const FOOTER = 'sections/theme-footer.storelib', BAR = 'sections/mobile-navigation-bar.storelib';

/* ---------- static ---------- */
for (const f of [FOOTER, BAR]) {
  const now = L.schemaOf(f), was = L.schemaOf(f, true);
  const ids = list => (list || []).filter(s => s.id).map(s => s.id);
  ok(ids(now.settings)[0] === 'color_scheme', `${f}: color_scheme is the first setting`);
  ok(ids(was.settings).every(id => ids(now.settings).includes(id)), `${f}: every section setting id kept`);
  for (const b of was.blocks) {
    const nb = now.blocks.find(x => x.type === b.type);
    ok(nb && ids(b.settings).every(id => ids(nb.settings).includes(id)), `${f} ${b.type}: block kept with every setting id`);
  }
  const all = [['section', now.settings], ...now.blocks.map(b => [b.type, b.settings])];
  for (const [w, list] of all) { const i = ids(list); ok(new Set(i).size === i.length, `${f} ${w}: ids unique`); }
  const text = JSON.stringify(now);
  ok(!/"t:/.test(text), `${f}: no untranslated t: keys in names, labels or paragraphs`);
  ok(!/\u2014|\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(text.replace(/"(id|value)":"[^"]*"/g, '')), `${f}: plain labels`);
  for (const [w, list] of all) for (const s of list) if (s.visible_if) ok(/^\{\{[\s\S]*\}\}$/.test(s.visible_if), `${f} ${w} ${s.id}: visible_if is a {{ }} expression`);
  for (const [w, list] of all) for (const s of list) if ((s.type === 'select' || s.type === 'radio') && s.options.length <= 3 && !s.hidden) ok(s.options.every(o => o.label.length <= 12), `${f} ${w} ${s.id}: button labels a word or two`);
}
{
  const src = read(FOOTER);
  ok(/form 'customer'[^%]*data-storelib-form: 'subscribe'/.test(src), 'footer newsletter posts to Storelib: data-storelib-form="subscribe"');
  ok(/<label class="visually-hidden" for="NewsletterForm--\{\{ section\.id \}\}">/.test(src), 'footer newsletter: the email field has a label');
  ok(!/\{%-? form 'customer'[^%]*\bpassword\b/.test(src), 'footer: no payment or password form');
  const layout = read('layout/theme.storelib');
  if (!/live-footer\.js/.test(layout)) console.log('note: layout/theme.storelib does not load live-footer.js yet; the tests add it the way the layout will');
}

if (!L.Liquid) { console.log(`${checks} footer checks passed (render skipped: set LIQUIDJS=<path to liquidjs>)`); process.exit(0); }
const {chromium} = require('playwright');
const FSEL = '#shopify-section-footer', BSEL = '#shopify-section-mobile_navigation_bar_GG8UWc';
const ATTRS = ['placeholder', 'aria-label', 'aria-expanded', 'data-success-message', 'data-error-message', 'href', 'src', 'hidden'];
async function sig(p, sel) {
  return p.evaluate(([sel, ATTRS]) => {
    for (const a of document.getAnimations()) { try { a.finish(); } catch (_) { /* infinite */ } }
    const root = document.querySelector(sel);
    if (!root) return ['missing'];
    const props = ['color', 'backgroundColor', 'backgroundImage', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'textTransform', 'display', 'visibility', 'opacity', 'filter', 'borderTopWidth', 'borderTopColor', 'borderTopLeftRadius', 'boxShadow', 'justifyContent', 'textAlign', 'marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'width', 'height'];
    const out = ['body pb ' + getComputedStyle(document.body).paddingBottom, 'link hover ' + (root.querySelector('[data-theme-footer]') ? getComputedStyle(root.querySelector('[data-theme-footer]')).getPropertyValue('--footer-link-hover').trim() : '')];
    for (const e of [root, ...root.querySelectorAll('*')]) {
      if (/^(SCRIPT|STYLE|LINK|TEMPLATE|path)$/.test(e.tagName)) continue;
      const c = getComputedStyle(e), r = e.getBoundingClientRect();
      const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
      out.push([e.tagName, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), ...props.map(k => c[k]), own, ...ATTRS.map(a => e.getAttribute(a) ?? '')].join('|'));
    }
    return out;
  }, [sel, ATTRS]);
}
const same = (a, b) => L.diff(a, b).length === 0;
const frames = p => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
async function emit(p, detail) { await p.evaluate(d => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: d})), detail); await frames(p); await p.waitForTimeout(40); await frames(p); }

/* the value each setting is changed to, and what must be on for it to show */
const IMG = L.img('Changed', 600, 400);
const value = (s, cur, schemes) => {
  if (s.type === 'color_scheme') return (schemes.find(x => x.id !== (cur && cur.id || cur)) || {}).id;
  if (s.type === 'image_picker') return IMG;
  if (s.type === 'link_list') return cur === 'main-menu' ? 'footer' : 'main-menu';
  if (s.type === 'liquid') return '<p class="custom-code">Hello</p>';
  if (s.type === 'range' && s.id === 'top_offset') return 40;
  return L.changed(s, cur);
};
function needs(s, scope) {
  const out = L.enabling(s, scope) || {};
  for (const [k, v] of Object.entries(out)) if (/image|background_image/.test(k) && v === true) out[k] = IMG;
  if (s.id && /^custom_image_size/.test(s.id)) out.custom_image = IMG;
  if (s.id === 'custom_elements_gap') { out.enable_custom_image = true; out.custom_image = IMG; }
  if (s.id === 'enable_custom_image') out.custom_image = IMG;
  return out;
}

/* Footer section settings: live (applied by the controller), partial (live
   when the element is already drawn, else on redraw), anything else redraw. */
const F_LIVE = new Set(['color_scheme', 'section_width', 'separator_line', 'padding_top', 'padding_bottom', 'link_hover_color', 'enable_custom_style', 'custom_text_color', 'heading_weight', 'heading_transform', 'arrow_icon_size', 'footer_heading_size', 'enable_custom_fonts', 'heading_font', 'body_font', 'copyright_text', 'custom_text', 'custom_text_italic', 'custom_text_font_size_desktop', 'custom_text_font_size_mobile', 'custom_image_size_desktop', 'custom_image_size_mobile', 'custom_elements_gap', 'footer_bg_brightness']);
/* what may not show at one width: the arrow and the phone sizes at 1366, desktop sizes and widths at 375 */
const F_QUIET = {375: new Set(['custom_text_font_size_desktop', 'custom_image_size_desktop', 'section_width', 'padding_bottom']), 1366: new Set(['arrow_icon_size', 'custom_text_font_size_mobile', 'custom_image_size_mobile'])};
const B_LIVE = {
  link_list: new Set(['heading', 'content_width']),
  newsletter: new Set(['heading', 'description', 'email_placeholder', 'button_label', 'note', 'success_text', 'error_text', 'content_width']),
  store_info: new Set(['store_heading', 'store_description', 'top_offset', 'content_width']),
  payment_badges: new Set(['alignment', 'content_width']),
  custom_liquid: new Set(['content_width']),
};
const B_PARTIAL = new Set(['store_heading', 'store_description', 'note']);
const B_QUIET = {375: new Set(['content_width', 'top_offset', 'alignment']), 1366: new Set([])};
const M_LIVE = new Set(['color_scheme', 'height', 'icon_size', 'radius_top', 'show_labels', 'border_top', 'shadow_enabled', 'use_custom_colors', 'background_color', 'icon_color', 'label_color', 'active_color', 'border_color', 'enable_custom_fonts', 'label_font']);

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args: ['--no-sandbox']});
  const quietSeen = [];
  try {
    /* ---------- every footer control, live and after redraw ---------- */
    for (const width of [375, 1366]) {
      const {p, ctx, errors, r} = await L.open(browser, {design_mode: true}, width);
      const known = errors.length; /* the layout's own script errors in this liquidjs render, the same before this round */
      const settings = {...r.fset};
      let blocks = r.fblocks.concat([{id: 'custom_liquid_x', type: 'custom_liquid', settings: {custom_liquid: '<p class="custom-code">Code</p>'}}]);
      const draw = async (s, b = blocks) => { await L.redraw(p, 'footer', await r.renderFooter(s, b)); };
      await draw(settings);
      ok(await p.evaluate(() => window.MateriaLiveFooter && window.MateriaLiveFooter.count()) === 2, `${width}: the controller holds the footer and the bar`);
      /* no-op: the current values sent live change nothing (the first paint is the hydrated paint) */
      const s0 = await sig(p, FSEL);
      await emit(p, {section: 'footer', settings: {...settings, color_scheme: settings.color_scheme}, live: false});
      for (const b of blocks) await emit(p, {section: 'footer', block: b.id, settings: b.settings});
      ok(same(s0, await sig(p, FSEL)), `${width}: every saved value sent live changes nothing\n` + L.explain(L.diff(s0, await sig(p, FSEL))));
      for (const s of r.fsch.settings) {
        if (!s.id || s.hidden || /\{\{\s*false\s*\}\}/.test(s.visible_if || '')) continue;
        const pre = {...settings, ...needs(s, 'section')};
        const v = value(s, pre[s.id], r.schemes);
        await draw(pre);
        const before = await sig(p, FSEL);
        await emit(p, {section: 'footer', settings: {[s.id]: v}, live: true});
        const live = await sig(p, FSEL);
        await draw({...pre, [s.id]: v});
        const after = await sig(p, FSEL);
        if (same(before, after)) { ok(F_QUIET[width].has(s.id), `${width} footer ${s.id}: changing it to ${JSON.stringify(v)} shows`); quietSeen.push(`${width} ${s.id}`); }
        else checks++;
        if (F_LIVE.has(s.id)) ok(same(live, after), `${width} footer ${s.id}: live equals the redraw\n` + L.explain(L.diff(live, after)));
        else ok(same(live, before), `${width} footer ${s.id}: waits for the redraw without a half-applied state\n` + L.explain(L.diff(before, live)));
      }
      await draw(settings);
      /* every block setting */
      for (const b of blocks) {
        const sch = r.fsch.blocks.find(x => x.type === b.type);
        for (const s of sch.settings) {
          if (!s.id || s.hidden) continue;
          const pre = {...b.settings, ...needs(s, 'block')};
          const v = value(s, pre[s.id] && pre[s.id].handle || pre[s.id], r.schemes);
          const with_ = st => blocks.map(x => x.id === b.id ? {...x, settings: st} : x);
          await draw(settings, with_(pre));
          const before = await sig(p, FSEL);
          await emit(p, {section: 'footer', block: b.id, settings: {[s.id]: v}, live: true});
          const live = await sig(p, FSEL);
          await draw(settings, with_({...pre, [s.id]: v}));
          const after = await sig(p, FSEL);
          if (same(before, after)) { ok(B_QUIET[width].has(s.id), `${width} ${b.type} ${s.id}: changing it to ${JSON.stringify(v)} shows`); quietSeen.push(`${width} ${b.type}.${s.id}`); }
          else checks++;
          if (B_LIVE[b.type].has(s.id)) ok(same(live, after) || (B_PARTIAL.has(s.id) && same(live, before)), `${width} ${b.type} ${s.id}: live equals the redraw\n` + L.explain(L.diff(live, after)));
          else ok(same(live, before), `${width} ${b.type} ${s.id}: waits for the redraw\n` + L.explain(L.diff(before, live)));
        }
        await draw(settings);
      }
      /* two menu columns are independent */
      const [m1, m2] = blocks.filter(b => b.type === 'link_list');
      await emit(p, {section: 'footer', block: {id: m1.id}, settings: {heading: 'Help'}});
      ok(await p.evaluate(([a, b]) => [document.querySelector(`[data-ft-block="${a}"] [data-ft-heading]`).textContent, document.querySelector(`[data-ft-block="${b}"] [data-ft-heading]`).textContent], [m1.id, m2.id]).then(([a, b]) => a === 'Help' && b === 'Main'), `${width}: an edit to one menu column leaves the other`);
      /* an added block after a redraw is drawn and live */
      blocks = blocks.concat([{id: 'link_list_new', type: 'link_list', settings: {menu: 'footer', heading: 'Added', content_width: '16%'}}]);
      await draw(settings);
      await emit(p, {section: 'shopify-section-footer', block_id: 'link_list_new', settings: {heading: 'Added live'}});
      ok(await p.locator('[data-ft-block="link_list_new"] [data-ft-heading]').textContent() === 'Added live', `${width}: a block added by a redraw is drawn and live-editable`);
      for (let i = 0; i < 3; i++) await draw(settings);
      ok(await p.evaluate(() => window.MateriaLiveFooter.count()) === 2, `${width}: redraws keep one controller entry per section`);
      ok(errors.length === known, `${width}: no new page errors (${errors.slice(known).join('; ')})`);
      await ctx.close();
    }

    /* ---------- theme first, custom colours and fonts on and off (storefront) ---------- */
    for (const width of [375, 1366]) {
      const {p, ctx} = await L.open(browser, {design_mode: false}, width);
      const t = await p.evaluate(() => {
        const f = document.querySelector('[data-theme-footer]'), cs = getComputedStyle(f);
        const h = getComputedStyle(document.querySelector('.footer__block-heading')), a = getComputedStyle(document.querySelector('.footer__blocks .reversed-links'));
        const btn = getComputedStyle(document.querySelector('.newsletter-form__button'));
        return {bg: cs.backgroundColor, scheme: cs.getPropertyValue('--color-background').trim(), heading: h.fontFamily, headingVar: cs.getPropertyValue('--heading-font').trim(), weight: h.fontWeight, themeWeight: cs.getPropertyValue('--heading-weight').trim(), link: a.fontFamily, bodyVar: cs.getPropertyValue('--body-font').trim(), btnBg: btn.backgroundColor, btnFont: btn.fontFamily, btnVar: cs.getPropertyValue('--btn-font').trim() || cs.getPropertyValue('--body-font').trim()};
      });
      ok(t.bg === 'rgb(19, 19, 19)', `${width}: the footer paints its colour scheme (${t.bg})`);
      ok(t.heading.replace(/"/g, '') === t.headingVar.replace(/"/g, ''), `${width}: column headings use the theme heading font (${t.heading})`);
      ok(String(t.weight) === t.themeWeight, `${width}: column headings use the theme heading weight (${t.weight} / ${t.themeWeight})`);
      ok(t.link.replace(/"/g, '') === t.bodyVar.replace(/"/g, ''), `${width}: links use the theme body font (${t.link})`);
      ok(t.btnBg === 'rgb(255, 255, 255)', `${width}: the newsletter button paints Theme settings > Buttons for its scheme (${t.btnBg})`);
      await ctx.close();
      for (const on of [true, false]) {
        const {p: q, ctx: c2} = await L.open(browser, {design_mode: false, footer: {enable_custom_fonts: on, heading_font: {family: 'Georgia', fallback_families: 'serif'}, body_font: {family: 'Courier New', fallback_families: 'monospace'}, heading_weight: '700', heading_transform: 'uppercase', enable_custom_style: on, link_hover_color: '#d21f3c'}}, width);
        const f = await q.evaluate(() => {
          const g = s => getComputedStyle(document.querySelector(s));
          return {h: g('.footer__block-heading').fontFamily, w: g('.footer__block-heading').fontWeight, tt: g('.footer__block-heading [data-ft-heading]').textTransform, li: g('.footer__blocks li').fontFamily, a: g('.footer__blocks .reversed-links').fontFamily, input: g('.footer-newsletter-email input').fontFamily, btn: g('.newsletter-form__button').fontFamily, big: g('.footer__custom-text').fontFamily, hover: g('[data-theme-footer]').getPropertyValue('--footer-link-hover').trim(), heading: g('[data-theme-footer]').getPropertyValue('--color-heading').trim()};
        });
        if (on) {
          ok(/Georgia/.test(f.h) && /Georgia/.test(f.big), `${width} custom fonts on: headings and the big text use the picked heading font (${f.h})`);
          ok(f.w === '700', `${width} custom fonts on: the column heading weight wins over the theme (${f.w})`);
          ok([f.li, f.a, f.input, f.btn].every(x => /Courier New/.test(x)), `${width} custom fonts on: links, the email field and the button use the picked text font (${[f.li, f.a, f.input, f.btn].join(' / ')})`);
          ok(f.hover === '#d21f3c', `${width} custom styling on: link hover colour applies (${f.hover})`);
        } else {
          ok(!/Georgia|Courier/.test(f.h + f.li + f.a + f.btn + f.big), `${width} custom fonts off: the theme fonts are back (${f.h} / ${f.li})`);
          ok(f.w !== '700', `${width} custom fonts off: the theme heading weight is back (${f.w})`);
          ok(f.hover !== '#d21f3c' && f.hover === f.heading, `${width} custom styling off: link hover follows the scheme (${f.hover})`);
        }
        ok(f.tt === 'uppercase', `${width}: Column heading case wins over Theme settings > Typography (${f.tt})`);
        await c2.close();
      }
    }

    /* ---------- the phone bar ---------- */
    {
      const {p, ctx, errors, r} = await L.open(browser, {design_mode: true}, 375);
      const known = errors.length;
      const settings = {...r.bset}, blocks = r.bblocks.concat([{id: 'search_x', type: 'search', settings: {icon: 'search', label: ''}}]);
      const draw = async (s, b = blocks) => { await L.redraw(p, r.bid, await r.renderBar(s, b)); };
      await draw(settings);
      const s0 = await sig(p, BSEL);
      await emit(p, {section: r.bid, settings, live: false});
      for (const b of blocks) await emit(p, {section: r.bid, block: b.id, settings: b.settings});
      ok(same(s0, await sig(p, BSEL)), '375 bar: every saved value sent live changes nothing\n' + L.explain(L.diff(s0, await sig(p, BSEL))));
      const targets = await p.evaluate(() => [...document.querySelectorAll('mobile-navigation-bar > a, mobile-navigation-bar > div')].map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }));
      ok(targets.length === 6 && targets.every(([w, h]) => w >= 44 && h >= 44), `375 bar: every tab is at least 44px (${JSON.stringify(targets)})`);
      for (const s of r.bsch.settings) {
        if (!s.id || s.hidden || /\{\{\s*false\s*\}\}/.test(s.visible_if || '')) continue;
        /* the wrapper margins show only with Remove space between sections off, and that switch only with a margin */
        const pre = {...settings, ...needs(s, 'section'), ...(/^section_margin/.test(s.id) ? {reset_spacing: false} : {}), ...(s.id === 'reset_spacing' ? {section_margin_top_mobile: 24} : {})};
        const v = value(s, pre[s.id], r.schemes);
        await draw(pre);
        const before = await sig(p, BSEL);
        await emit(p, {section: r.bid, settings: {[s.id]: v}, live: true});
        const live = await sig(p, BSEL);
        await draw({...pre, [s.id]: v});
        const after = await sig(p, BSEL);
        ok(!same(before, after), `375 bar ${s.id}: changing it to ${JSON.stringify(v)} shows`);
        if (M_LIVE.has(s.id)) ok(same(live, after), `375 bar ${s.id}: live equals the redraw\n` + L.explain(L.diff(live, after)));
        else ok(same(live, before), `375 bar ${s.id}: waits for the redraw\n` + L.explain(L.diff(before, live)));
      }
      await draw(settings);
      for (const b of blocks) {
        const sch = r.bsch.blocks.find(x => x.type === b.type);
        for (const s of sch.settings) {
          if (!s.id) continue;
          const with_ = st => blocks.map(x => x.id === b.id ? {...x, settings: st} : x);
          const v = s.id === 'label' ? 'Tab ' + b.type : s.options.find(o => o.value !== 'auto' && o.value !== b.settings[s.id] && o.value !== s.default).value;
          await draw(settings);
          const before = await sig(p, BSEL);
          await emit(p, {section: r.bid, block: b.id, settings: {[s.id]: v}});
          const live = await sig(p, BSEL);
          await draw(settings, with_({...b.settings, [s.id]: v}));
          const after = await sig(p, BSEL);
          const changedIcon = s.id === 'icon' ? await p.evaluate(id => document.querySelector(`[data-mnb-block="${id}"] svg`).outerHTML, b.id) : '';
          if (s.id === 'icon') { await draw(settings); const was = await p.evaluate(id => document.querySelector(`[data-mnb-block="${id}"] svg`).outerHTML, b.id); ok(was !== changedIcon, `375 bar ${b.type} icon: ${v} draws another icon`); }
          else ok(!same(before, after), `375 bar ${b.type} ${s.id}: shows`);
          if (s.id === 'label') ok(same(live, after), `375 bar ${b.type} label: live equals the redraw\n` + L.explain(L.diff(live, after)));
          else ok(same(live, before), `375 bar ${b.type} ${s.id}: waits for the redraw`);
        }
      }
      /* a cleared label goes back to the standard one, live */
      await draw(settings, blocks.map(x => x.type === 'cart' ? {...x, settings: {...x.settings, label: 'Bag'}} : x));
      const cart = blocks.find(x => x.type === 'cart').id;
      await emit(p, {section: r.bid, block: cart, settings: {label: ''}});
      ok(await p.locator(`[data-mnb-block="${cart}"] [data-mnb-label]`).textContent() === 'cart', '375 bar: a cleared label goes back to the standard label live');
      ok(errors.length === known, `375 bar: no new page errors (${errors.slice(known).join('; ')})`);
      await ctx.close();
      const {p: d, ctx: c2} = await L.open(browser, {design_mode: false}, 1366);
      ok(await d.evaluate(() => getComputedStyle(document.querySelector('mobile-navigation-bar')).display) === 'none', '1366: the bar is phones only');
      await c2.close();
    }

    /* ---------- accordion, keyboard and reduced motion at 375 ---------- */
    for (const reduced of [false, true]) {
      const {p, ctx, r} = await L.open(browser, {design_mode: true}, 375, {reduced});
      await L.redraw(p, 'footer', await r.renderFooter(r.fset, r.fblocks));
      const btn = p.locator('[data-footer-acc-toggle]').nth(1);
      const box = await btn.boundingBox();
      ok(box.height >= 44, `375${reduced ? ' reduced' : ''}: a column heading is a 44px button (${box.height})`);
      await btn.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
      ok(await btn.getAttribute('aria-expanded') === 'true', `375${reduced ? ' reduced' : ''}: Enter opens a column after a redraw (aria-expanded)`);
      const vis = await p.evaluate(() => { const panel = document.querySelectorAll('[data-footer-acc]')[1].querySelector('.footer-acc__panel'); return [getComputedStyle(panel).visibility, getComputedStyle(panel).transitionDuration]; });
      ok(vis[0] === 'visible', `375${reduced ? ' reduced' : ''}: the opened column shows its links`);
      if (reduced) ok(/^0s/.test(vis[1]), `375 reduced: the column opens without motion (${vis[1]})`);
      const links = await p.evaluate(() => [...document.querySelectorAll('[data-footer-acc].is-open .footer-block.collapsible-content li > a')].map(a => Math.round(a.getBoundingClientRect().height)));
      ok(links.length > 0 && links.every(h => h >= 44), `375: menu links are 44px targets (${links.join(',')})`);
      await ctx.close();
    }

    /* ---------- Custom colors and Size chart data ---------- */
    {
      const {p, ctx} = await L.open(browser, {design_mode: false, colorBlocks: [{id: 'c1', type: 'color', settings: {heading: 'Azure', color_code: '#3366ff', color_image: ''}}]}, 1366);
      ok(await p.evaluate(() => getComputedStyle(document.querySelector('.custom__color-swatches--azure')).backgroundColor) === 'rgb(51, 102, 255)', 'Custom colors: a colour block paints the swatch of that option value');
      await ctx.close();
      const blank = await L.renderPage({});
      ok(!/data-custom-colors/.test(blank.html), 'Custom colors: the saved empty colour prints no rule');
      const e = L.engine();
      const t = read('sections/size-chart-data.storelib');
      const out = await e.parseAndRender(L.clean(L.body(t)), {product: {id: 42, metafields: {}}}, {globals: {product: {id: 42}}});
      ok(/<div data-size-chart-data data-product="42" hidden>/.test(out), 'Size chart data: draws the hidden chart holder for the product');
      ok(t === readHead('sections/size-chart-data.storelib') && read('sections/custom-colors.storelib') === readHead('sections/custom-colors.storelib'), 'Custom colors and Size chart data are unchanged');
    }
  } finally { await browser.close(); }
  console.log(`${checks} footer and phone navigation checks passed (every control live and after redraw at 375 and 1366; quiet where expected: ${quietSeen.join(', ') || 'none'})`);
})().catch(e => { console.error(e); process.exit(1); });
