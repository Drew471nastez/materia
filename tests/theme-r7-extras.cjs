/* Dividers and Promotional Popup, round 7: Divider With Text
   (divider-text-line) and Bottom Sheet Popup (popup-bottom-sheet).

   For both, at 375 and 1366, in the builder and on the storefront: the file
   and the schema, theme inheritance (with the theme's font and button
   priority on and off), the colour scheme switch (live and redrawn), custom
   colours and fonts winning under the real theme rules and restoring the
   theme when off, every section and block control (live, back again, and
   after a server redraw, with the live result equal to the redrawn one),
   controls that belong to one width, every select option looking
   different, two instances staying apart, an added block, redraws that set
   the section up once, a picture kept on unrelated edits, first paint equal
   to the hydrated paint, reduced motion, tap targets, headings, no
   overflow at 375 and no errors.

   Divider With Text: where the text, the lines and the link sit for each
   text position, an empty text leaving a plain line, long text wrapping.
   Bottom Sheet Popup through the theme's popup manager: every trigger
   (on load, delay, scroll, from a link, page views), waiting behind another
   popup and behind an open cookie banner, how often it comes back, Escape,
   the 44px close button and the focus given back, the dimmed page and a
   swipe down closing the sheet on a phone (a short swipe springs back), the
   page left usable round the corner card on a computer, the button
   remembered as done, and the builder (no trigger runs; drawn in the page,
   or shown while selected).

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-extras.cjs [section ...] */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const ROOT = path.join(__dirname, '..');
const FP = require('./theme-featured-product-round5.cjs');
if (!FP.Liquid) { console.log('extras round 7 skipped: liquidjs not installed (LIQUIDJS=<path to liquidjs>)'); return; }
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'live-r7-extras.js', MANAGER = 'materia-popups.js';
const only = process.argv.slice(2);

const pic = (n, alt = '') => ({url: 'https://theme.test/' + n + '.png', src: 'https://theme.test/' + n + '.png', width: 1200, height: 675, alt});
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
const FONT2 = {family: 'Courier New', fallback_families: 'monospace'};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const rgb = {bg: 'rgb(24, 32, 40)', heading: 'rgb(255, 255, 255)', text: 'rgb(204, 204, 204)', border: 'rgb(68, 85, 102)', altBg: 'rgb(250, 250, 250)', altHeading: 'rgb(16, 16, 16)', altText: 'rgb(51, 51, 51)', altBorder: 'rgb(221, 221, 221)', btn: 'rgb(18, 52, 86)', hover: 'rgb(255, 0, 0)'};

/* ------------------------------------------------------------ probes (run in the page) */
const PROBES = {
  'divider-text-line': uid => {
    const w = document.getElementById('shopify-section-' + uid), root = w && w.querySelector('.dtl');
    if (!root) return {present: false};
    const cs = (el, k) => el ? getComputedStyle(el)[k] : null, r1 = n => Math.round(n * 2) / 2, top = root.getBoundingClientRect().top;
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); if (!r.width && !r.height) return null; return {x: r1(r.x), y: r1(r.y - top), w: r1(r.width), h: r1(r.height)}; };
    const line = el => el && {shown: cs(el, 'display') !== 'none', style: cs(el, 'borderTopStyle'), width: cs(el, 'borderTopWidth'), color: cs(el, 'borderTopColor'), box: box(el)};
    const t = root.querySelector('.dtl__text'), a = root.querySelector('.dtl__link'), row = root.querySelector('.dtl__row');
    return {present: true, scheme: [...root.classList].filter(c => c.startsWith('color-')).join(' '), spacing: root.classList.contains('remove_spacing'), width: root.dataset.width, pos: root.dataset.pos, align: root.dataset.align, noReveal: root.hasAttribute('data-ti-no-reveal'),
      bg: cs(root, 'backgroundColor'), pt: cs(root, 'paddingTop'), pb: cs(root, 'paddingBottom'), mt: cs(w, 'marginTop'), mb: cs(w, 'marginBottom'),
      inner: box(root.querySelector('.dtl__inner')), row: box(row), gap: cs(row, 'columnGap'),
      lead: line(root.querySelector('.dtl__line--lead')), tail: line(root.querySelector('.dtl__line--tail')),
      text: t && {text: t.textContent, shown: !t.hidden && cs(t, 'display') !== 'none', color: cs(t, 'color'), family: cs(t, 'fontFamily'), size: cs(t, 'fontSize'), transform: cs(t, 'textTransform'), weight: cs(t, 'fontWeight'), style: t.dataset.style, own: t.hasAttribute('data-own-font'), box: box(t)},
      link: a && {text: a.textContent, shown: !a.hidden && cs(a, 'display') !== 'none', href: a.getAttribute('href'), color: cs(a, 'color'), family: cs(a, 'fontFamily'), box: box(a)}};
  },
  'popup-bottom-sheet': uid => {
    const w = document.getElementById('shopify-section-' + uid), root = w && w.querySelector('.pbs');
    if (!root) return {present: false};
    const cs = (el, k) => el ? getComputedStyle(el)[k] : null, r1 = n => Math.round(n * 2) / 2;
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); if (!r.width && !r.height) return null; return {x: r1(r.x), y: r1(r.y), w: r1(r.width), h: r1(r.height)}; };
    const dlg = root.querySelector('dialog'), card = root.querySelector('.pbs__card'), scrim = root.querySelector('.pbs__scrim'), h = root.querySelector('.pbs__heading'), tx = root.querySelector('.pbs__text'), p = tx && (tx.querySelector('p') || tx), b = root.querySelector('.pbs__button'), media = root.querySelector('[data-pbs-media]'), img = media && media.querySelector('img');
    let config = {}; try { config = JSON.parse(root.dataset.pbsConfig); } catch (_) { /* none */ }
    return {present: true, scheme: [...root.classList].filter(c => c.startsWith('color-')).join(' '), corner: root.dataset.corner, align: root.dataset.align, own: root.hasAttribute('data-own-font'), config,
      open: dlg.open, modal: dlg.matches(':modal'), ariaHidden: root.getAttribute('aria-hidden'), scrimVar: root.style.getPropertyValue('--pbs-scrim-o').trim(),
      card: {bg: cs(card, 'backgroundColor'), color: cs(card, 'color'), radius: cs(card, 'borderTopLeftRadius'), radiusB: cs(card, 'borderBottomLeftRadius'), align: cs(card, 'textAlign'), box: box(card)},
      scrim: {display: cs(scrim, 'display'), opacity: cs(scrim, 'opacity'), bg: cs(scrim, 'backgroundColor')},
      heading: h && {html: h.innerHTML, hidden: h.hidden, color: cs(h, 'color'), family: cs(h, 'fontFamily'), size: cs(h, 'fontSize'), weight: cs(h, 'fontWeight')},
      text: tx && {html: tx.innerHTML, hidden: tx.hidden, color: cs(p, 'color'), family: cs(p, 'fontFamily')},
      button: b && {text: b.textContent, hidden: b.hidden, href: b.getAttribute('href'), kind: b.dataset.themeButton, primary: b.classList.contains('btn-primary'), bg: cs(b, 'backgroundColor'), family: cs(b, 'fontFamily'), radius: cs(b, 'borderTopLeftRadius'), box: box(b)},
      media: {hidden: media.hidden, src: img ? img.getAttribute('src').replace(/\?.*$/, '') : null, alt: img ? img.getAttribute('alt') : null, box: box(media)}};
  },
};
const probe = (t, name, uid = 'test') => t.page.evaluate(PROBES[name], uid);
/* Two frames for the controller's one paint per frame, then any animation is run to its end. */
const frames = (t, n = 2) => t.page.evaluate(n => new Promise(r => { const f = () => n-- > 0 ? requestAnimationFrame(f) : (document.getAnimations().forEach(a => { try { a.finish(); } catch (_) {} }), requestAnimationFrame(() => r())); f(); }), n);
const settle = async (t, ms = 60) => { await t.page.waitForTimeout(ms); await frames(t); };

/* ------------------------------------------------------------ what every control must do */
const CUSTOM = {enable_custom_style: true};
/* the storefront popup opens on load and every visit, so each redraw shows it again */
const OPEN = {open_mode: 'immediate', after_dismiss: 'every_visit'};
const CFG = {
  'divider-text-line': {
    assets: [ASSET], base: () => ({}),
    blocks: () => [{type: 'label'}, {type: 'link'}],
    section: (W) => ({
      color_scheme: {v: 'alt-scheme', ok: q => q.scheme === 'color-alt-scheme' && q.bg === rgb.altBg && q.tail.color === rgb.altBorder},
      section_width: {v: 'full_width', ok: (q, b) => q.width === 'full_width' && (W === 1366 ? q.inner.w > b.inner.w + 20 : true)},
      reset_spacing: {v: false, pre: {section_margin_top_desktop: 40, section_margin_top_mobile: 20, section_margin_bottom_desktop: 36, section_margin_bottom_mobile: 16}, ok: q => q.mt === (W === 375 ? '20px' : '40px') && q.mb === (W === 375 ? '16px' : '36px') && !q.spacing},
      text_position: {v: 'center', ok: q => q.pos === 'center' && q.lead.shown && q.lead.box.x < q.text.box.x && q.text.box.x < q.tail.box.x && q.tail.box.x < q.link.box.x},
      width_pct: {v: 50, ok: (q, b) => Math.abs(q.row.w - b.row.w / 2) <= 2},
      align: {v: 'left', pre: {width_pct: 50}, ok: (q, b) => q.align === 'left' && Math.abs(q.row.x - b.inner.x - (q.inner.w - q.row.w) / 2) > 20 && Math.abs(q.row.x - q.inner.x - parseFloat(W === 375 ? 20 : 24)) <= 1},
      label_gap: {v: 40, ok: q => q.gap === '40px'},
      style: {v: 'dashed', ok: q => q.tail.style === 'dashed'},
      thickness: {v: 6, ok: q => q.tail.width === '6px'},
      enable_custom_style: {v: true, pre: {color_from: '#ff8800', section_bg: '#abcdef'}, ok: q => q.tail.color === 'rgb(255, 136, 0)' && q.bg === 'rgb(171, 205, 239)'},
      color_from: {v: '#ff8800', pre: CUSTOM, ok: q => q.tail.color === 'rgb(255, 136, 0)' && q.bg === rgb.bg},
      section_bg: {v: '#abcdef', pre: CUSTOM, ok: q => q.bg === 'rgb(171, 205, 239)' && q.tail.color === rgb.border},
      reveal: {v: false, ok: q => q.noReveal},
      padding_top: {v: 80, at: 1366, ok: q => q.pt === '80px'},
      padding_bottom: {v: 90, at: 1366, ok: q => q.pb === '90px'},
      section_margin_top_desktop: {v: 40, at: 1366, pre: {reset_spacing: false}, ok: q => q.mt === '40px'},
      section_margin_bottom_desktop: {v: 44, at: 1366, pre: {reset_spacing: false}, ok: q => q.mb === '44px'},
      padding_top_mobile: {v: 60, at: 375, ok: q => q.pt === '60px'},
      padding_bottom_mobile: {v: 70, at: 375, ok: q => q.pb === '70px'},
      section_margin_top_mobile: {v: 24, at: 375, pre: {reset_spacing: false}, ok: q => q.mt === '24px'},
      section_margin_bottom_mobile: {v: 28, at: 375, pre: {reset_spacing: false}, ok: q => q.mb === '28px'},
    }),
    block: () => ({
      label: {
        text: {v: 'From the studio', ok: q => q.text.text === 'From the studio' && q.text.shown},
        text_style: {v: 'heading', ok: q => q.text.style === 'heading' && /Georgia/.test(q.text.family) && q.text.color === rgb.heading && q.text.transform === 'none'},
        enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.text.color === 'rgb(255, 0, 0)'},
        color: {v: '#00ff00', pre: CUSTOM, ok: q => q.text.color === 'rgb(0, 255, 0)'},
        enable_custom_fonts: {v: true, pre: {font: FONT}, ok: q => /Verdana/.test(q.text.family) && q.text.own},
        font: {v: FONT2, pre: {enable_custom_fonts: true}, ok: q => /Courier/.test(q.text.family)},
        size: {v: 30, at: 1366, ok: q => q.text.size === '30px'},
        size_mobile: {v: 22, at: 375, ok: q => q.text.size === '22px'},
      },
      link: {
        label: {v: 'See the collection', ok: q => q.link.text === 'See the collection' && q.link.shown},
        link: {v: '/collections/summer', ok: q => q.link.href === '/collections/summer'},
        enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.link.color === 'rgb(255, 0, 0)'},
        color: {v: '#00ff00', pre: CUSTOM, ok: q => q.link.color === 'rgb(0, 255, 0)'},
      },
    }),
    selects: {section_width: [1366], text_position: [0], align: [0, {width_pct: 50}], style: [0]},
    blockSelects: {label: {text_style: [0]}},
  },
  'popup-bottom-sheet': {
    assets: [MANAGER, ASSET], base: editing => editing ? {} : OPEN,
    blocks: () => [{type: 'heading'}, {type: 'text'}, {type: 'button'}],
    section: (W, editing) => ({
      color_scheme: {v: 'alt-scheme', ok: q => q.scheme === 'color-alt-scheme' && q.card.bg === rgb.altBg && q.heading.color === rgb.altHeading && q.text.color === rgb.altText},
      open_mode: {v: 'manual', ok: q => q.config.trigger.mode === 'manual' && (editing ? q.open : !q.open)},
      delay_s: {v: 30, pre: {open_mode: 'delay'}, ok: q => q.config.trigger.delay === 30 && (editing ? q.open : !q.open)},
      scroll_pct: {v: 80, pre: {open_mode: 'scroll'}, ok: q => q.config.trigger.scroll === 80 && q.config.trigger.mode === 'scroll'},
      page_views: {v: 5, pre: {open_mode: 'pageviews'}, ok: q => q.config.trigger.views === 5 && (editing ? q.open : !q.open)},
      after_dismiss: {v: 'never', ok: q => q.config.frequency.mode === 'never'},
      hide_days: {v: 9, pre: {after_dismiss: 'after_days'}, ok: q => q.config.frequency.days === 9},
      editor_mode: {v: false, ok: q => q.config.preview === false && (editing ? !q.open && q.ariaHidden === 'true' : q.open)},
      corner: {v: 'left', at: 1366, ok: q => q.corner === 'left' && q.card.box.x === 24},
      card_width: {v: 440, at: 1366, ok: q => q.card.box.w === 440},
      text_align: {v: 'center', ok: q => q.card.align === 'center'},
      image: {v: pic('pbs-a'), ok: q => !q.media.hidden && q.media.src === 'https://theme.test/pbs-a.png' && q.media.box.h > 100},
      image_alt: {v: 'A shelf of new arrivals', pre: {image: pic('pbs-a')}, ok: q => q.media.alt === 'A shelf of new arrivals'},
      enable_custom_style: {v: true, pre: {card_bg: '#abcdef', text_color: '#222222'}, ok: q => q.card.bg === 'rgb(171, 205, 239)' && q.text.color === 'rgb(34, 34, 34)'},
      card_bg: {v: '#abcdef', pre: CUSTOM, ok: q => q.card.bg === 'rgb(171, 205, 239)'},
      text_color: {v: '#222222', pre: CUSTOM, ok: q => q.text.color === 'rgb(34, 34, 34)' && q.heading.color === rgb.heading},
      overlay_color: {v: '#336600', pre: CUSTOM, ok: q => (q.modal ? q.scrim.bg === 'rgb(51, 102, 0)' : true) && q.card.bg === rgb.bg, mark: true},
      enable_custom_fonts: {v: true, pre: {heading_font: FONT, body_font: FONT2}, ok: q => /Verdana/.test(q.heading.family) && /Courier/.test(q.text.family) && /Courier/.test(q.button.family) && q.own},
      heading_font: {v: FONT, pre: {enable_custom_fonts: true, body_font: FONT2}, ok: q => /Verdana/.test(q.heading.family) && !/Verdana/.test(q.text.family)},
      body_font: {v: FONT2, pre: {enable_custom_fonts: true, heading_font: FONT}, ok: q => /Courier/.test(q.text.family) && !/Courier/.test(q.heading.family)},
      overlay_opacity: {v: 70, ok: q => q.scrimVar === '0.7' && (q.modal ? q.scrim.opacity === '0.7' : true)},
    }),
    block: () => ({
      heading: {
        text: {v: 'Our <em>autumn</em> edit', ok: q => q.heading.html === 'Our <em>autumn</em> edit' && !q.heading.hidden},
        enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.heading.color === 'rgb(255, 0, 0)'},
        color: {v: '#00ff00', pre: CUSTOM, ok: q => q.heading.color === 'rgb(0, 255, 0)'},
        size: {v: 34, at: 1366, ok: q => q.heading.size === '34px'},
        size_mobile: {v: 28, at: 375, ok: q => q.heading.size === '28px'},
      },
      text: {
        text: {v: '<p>Ships <strong>Monday</strong>.</p>', ok: q => q.text.html === '<p>Ships <strong>Monday</strong>.</p>' && !q.text.hidden},
        enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.text.color === 'rgb(255, 0, 0)'},
        color: {v: '#00ff00', pre: CUSTOM, ok: q => q.text.color === 'rgb(0, 255, 0)'},
      },
      button: {
        label: {v: 'See the edit', ok: q => q.button.text === 'See the edit' && !q.button.hidden},
        link: {v: '/collections/autumn', ok: q => q.button.href === '/collections/autumn'},
        style: {v: 'secondary', ok: q => q.button.kind === 'secondary' && !q.button.primary && q.button.bg !== rgb.btn},
      },
    }),
    selects: {open_mode: [0], after_dismiss: [0], corner: [1366], text_align: [0]},
    blockSelects: {button: {style: [0]}},
  },
};
const visible = list => (list || []).filter(x => x.id && x.hidden !== true && x.visible_if !== '{{ false }}');
const mountOf = (browser, name, o = {}) => { const cfg = CFG[name], editing = o.editing !== false; return mount(browser, name, {blocks: cfg.blocks(), assets: cfg.assets, ...o, settings: {...cfg.base(editing), ...(o.settings || {})}}); };

/* ------------------------------------------------------------ static */
function statics(name) {
  const {raw, schema: s} = schemaOf(name), lines = raw.split('\n');
  eq(lines[0], '<template compat="shopify">', name + ': line 1');
  eq(lines[1], `<script src="{{ '${ASSET}' | asset_url }}" defer="defer"></script>`, name + ': line 2 links the controller');
  eq(lines[2], "{% render 'theme-type' %}", name + ': theme-type right after');
  eq(lines.filter(l => /^\s*<\/template>\s*$/.test(l)).length, 1, name + ': one closing template line');
  eq(Object.keys(JSON.parse(raw.split('<schema>')[1].split('</schema>')[0])), ['shopify'], name + ': the schema holds only the theme\'s own object');
  eq(schemaProblems(name), [], name + ': schema problems');
  ok(s.name.length <= 25, name + ': name fits the builder');
  const others = fs.readdirSync(path.join(ROOT, 'sections')).filter(f => f.endsWith('.storelib') && f !== name + '.storelib').filter(f => { try { return schemaOf(f.slice(0, -9)).schema.name === s.name; } catch (_) { return false; } });
  eq(others, [], name + ': no other section has this name');
  const popup = name === 'popup-bottom-sheet';
  eq([s.presets.length, s.presets[0].name, s.presets[0].category], [1, s.name, popup ? 'Promotional Popup' : 'Dividers'], name + ': preset name and category');
  const order = s.settings.filter(x => x.type === 'header').map(x => x.content);
  const want = ['General', 'Trigger', 'Behaviour', 'Content', 'Layout', 'Media', 'Appearance', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'].filter(x => order.includes(x));
  eq(order, want, name + ': groups in the shared order');
  eq(s.settings.find(x => x.id).id, 'color_scheme', name + ': colour scheme first');
  /* the category's own controls, copied */
  const find = (l, id) => l.find(x => x.id === id), mine = s.settings, pick = (x, ks) => ks.map(k => x && x[k]);
  if (popup) {
    const cd = schemaOf('countdown-promo-popup').schema.settings;
    for (const id of ['open_mode', 'delay_s', 'scroll_pct', 'page_views', 'after_dismiss', 'hide_days']) eq(pick(find(mine, id), ['type', 'min', 'max', 'step', 'default', 'unit']).concat([JSON.stringify((find(mine, id).options || []).map(o => o.value))]), pick(find(cd, id), ['type', 'min', 'max', 'step', 'default', 'unit']).concat([JSON.stringify((find(cd, id).options || []).map(o => o.value))]), name + ': ' + id + ' matches Countdown Promo Popup');
    eq(s.enabled_on, {groups: ['custom.overlay']}, name + ': only in the overlay group, like the other popups');
  } else {
    const dv = schemaOf('divider').schema.settings;
    for (const id of ['section_width', 'reset_spacing', 'reveal', 'padding_top', 'padding_bottom', 'section_margin_top_desktop', 'section_margin_bottom_desktop', 'section_margin_top_mobile', 'section_margin_bottom_mobile', 'width_pct', 'label_gap', 'thickness'])
      eq(pick(find(mine, id), ['type', 'min', 'max', 'step', 'default', 'unit']).concat([JSON.stringify(find(mine, id).options)]), pick(find(dv, id), ['type', 'min', 'max', 'step', 'default', 'unit']).concat([JSON.stringify(find(dv, id).options)]), name + ': ' + id + ' matches Divider');
    for (const id of ['padding_top_mobile', 'padding_bottom_mobile']) eq(pick(find(mine, id), ['min', 'max', 'step', 'default', 'unit']), pick(find(dv, 'padding_top'), ['min', 'max', 'step', 'default', 'unit']), name + ': ' + id + ' has the range of Divider\'s padding');
    eq(find(mine, 'style').options.map(o => o.value), ['solid', 'dashed', 'dotted'], name + ': line style options are Divider\'s first three');
    eq(s.blocks.find(b => b.type === 'label').settings.filter(x => ['text', 'enable_custom_style', 'color', 'enable_custom_fonts', 'font'].includes(x.id)).map(x => x.type), ['text', 'checkbox', 'color', 'checkbox', 'font_picker'], name + ': the text block keeps Divider\'s label ids');
  }
  for (const b of s.blocks) for (const x of b.settings) if (/image|picture/.test(x.id || '')) eq(x.type, 'image_picker', name + ': ' + b.type + '.' + x.id + ' is an image picker');
  const words = JSON.stringify(s) + raw.split('<schema>')[0].replace(/\{%-?\s*comment[\s\S]*?endcomment\s*-?%\}/g, '');
  ok(!/—|–/.test(words), name + ': no dashes in copy');
  ok(!/\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(JSON.stringify(s)), name + ': no banned words');
  ok(!/\d/.test(JSON.stringify(s.blocks.map(b => b.settings.filter(x => ['text', 'textarea', 'richtext', 'inline_richtext'].includes(x.type)).map(x => x.default || '')))), name + ': no number (price, count, date, discount) in a text default');
  ok(!/<link\b|<iframe\b|onclick=|fetch\(|localStorage|sessionStorage/i.test(raw), name + ': no link, iframe, inline handler, fetch or storage in the section');
  const css = raw.split('<schema>')[0].match(/<style[^>]*>[\s\S]*?<\/style>/g).join('\n');
  eq(css.match(/#[0-9a-fA-F]{3,8}\b/g) || [], [], name + ': no hard-coded colours');
  ok(!/linear-gradient|radial-gradient|backdrop-filter|touch-action:\s*none/.test(css), name + ': no gradient, glass or touch-action none');
  const cfg = CFG[name], sec = cfg.section(1366, true), blk = cfg.block();
  eq(visible(s.settings).map(x => x.id).filter(id => !sec[id]), [], name + ': every section setting has a check');
  for (const b of s.blocks) eq(visible(b.settings).map(x => x.id).filter(id => !(blk[b.type] || {})[id]), [], name + ': every ' + b.type + ' setting has a check');
}
function controllerStatics() {
  const js = fs.readFileSync(path.join(ROOT, 'shopify/assets', ASSET), 'utf8');
  ok(/^\/\*[\s\S]*?\*\/\s*\(\(\) => \{\s*if \(window\.MateriaR7Extras\) return;/.test(js), 'controller: one IIFE behind a window flag');
  ok(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|preventDefault\(\)[^;]*touchmove|addEventListener\('(wheel|touchmove)'/.test(js), 'controller: no fetch, no storage of its own, no wheel or touchmove handlers');
  ok(/AbortController/.test(js) && /MateriaPopupsQueue/.test(js) && /\.register\(/.test(js), 'controller: listeners per root with an AbortController, the popup through the theme manager');
}

/* ------------------------------------------------------------ every control, live and redrawn */
async function controls(browser, name, W, editing) {
  const cfg = CFG[name], s = schemaOf(name).schema, tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`;
  const t = await mountOf(browser, name, {width: W, editing});
  await settle(t);
  const base = await probe(t, name);
  ok(base.present, tag + ': draws');
  eq(await t.page.evaluate(() => !!document.querySelector('[data-r7x-settings]')), editing, tag + ': settings JSON only in the builder');
  const orig = t.section;
  const run = async (id, spec, block) => {
    /* each check starts as a first visit: what the popup manager remembered of the last one is forgotten */
    const forget = () => t.page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (_) { /* none */ } });
    await forget();
    const where = block ? block + '.' + id : id, bid = block ? t.blockId(block) : undefined;
    const from = block ? orig.blocks.find(b => b.id === bid).settings : orig.settings;
    const change = {...(spec.pre || {}), [id]: spec.v}, back = Object.fromEntries(Object.keys(change).map(k => [k, from[k] === undefined ? '' : from[k]]));
    const want = !spec.at || spec.at === W;
    let live = null;
    if (editing) {
      await t.emit(change, bid); await settle(t);
      live = await probe(t, name);
      eq(!!spec.ok(live, base), want, `${tag}: ${where} live ${want ? 'changes its element' : 'leaves this width alone'} ` + (process.env.DEBUG ? JSON.stringify(live) : ''));
      await t.emit(back, bid); await settle(t);
      eq(await probe(t, name), base, `${tag}: ${where} back to the start, live`);
    }
    const blocksWith = set => orig.blocks.map(b => ({type: b.type, settings: b.id === bid ? {...b.settings, ...set} : b.settings}));
    await t.redraw(block ? {blocks: blocksWith(change)} : {settings: {...orig.settings, ...change}}); await settle(t);
    const drawn = await probe(t, name);
    eq(!!spec.ok(drawn, base), want, `${tag}: ${where} redrawn ${want ? 'changes its element' : 'leaves this width alone'} ` + (process.env.DEBUG ? JSON.stringify(drawn) : ''));
    if (live) eq(live, drawn, `${tag}: ${where} live equals the redraw`);
    await forget();
    await t.redraw(block ? {blocks: blocksWith({})} : {settings: {...orig.settings, ...back}}); await settle(t);
    eq(await probe(t, name), base, `${tag}: ${where} back to the start after a redraw`);
  };
  const sec = cfg.section(W, editing), blk = cfg.block();
  for (const x of visible(s.settings)) await run(x.id, sec[x.id]);
  for (const b of s.blocks) for (const x of visible(b.settings)) await run(x.id, blk[b.type][x.id], b.type);
  ok(await t.noOverflow(), tag + ': no sideways page scroll');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* ------------------------------------------------------------ theme, schemes, custom, priority */
async function theme(browser, name, W, editing) {
  const tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`, popup = name === 'popup-bottom-sheet';
  const read = q => popup ? {bg: q.card.bg, heading: q.heading.color, text: q.text.color, hf: /Georgia/.test(q.heading.family), bf: /Arial/.test(q.text.family), weight: q.heading.weight, btn: q.button.bg, radius: q.button.radius}
    : {bg: q.bg, line: q.tail.color, text: q.text.color, bf: /Arial/.test(q.text.family), link: q.link.color, lf: /Arial/.test(q.link.family)};
  for (const priority of [true, 'off']) {
    const t = await mountOf(browser, name, {width: W, editing, priority});
    await settle(t);
    const q = await probe(t, name);
    eq(read(q), popup ? {bg: rgb.bg, heading: rgb.heading, text: rgb.text, hf: true, bf: true, weight: '700', btn: rgb.btn, radius: '12px'} : {bg: rgb.bg, line: rgb.border, text: rgb.text, bf: true, link: rgb.heading, lf: true}, `${tag} priority ${priority}: the colour scheme, the theme fonts${popup ? ' and the theme button' : ''}`);
    if (popup) {
      await t.page.hover('#shopify-section-test .pbs__button');
      eq(await t.css('.pbs__button', 'backgroundColor'), rgb.hover, `${tag} priority ${priority}: the button takes the theme hover`);
      await t.page.mouse.move(1, 1);
    } else {
      await t.emit({text_style: 'heading'}, t.blockId('label')); if (!editing) await settle(t); await frames(t);
      const h = await probe(t, name);
      ok(/Georgia/.test(h.text.family) && h.text.color === rgb.heading && h.text.weight === '700', `${tag} priority ${priority}: the Heading style follows the theme heading font, weight and colour`);
    }
    eq(t.errors, [], `${tag} priority ${priority}: no errors`);
    await t.page.close();
  }
  /* scheme switch, live and redrawn */
  const t = await mountOf(browser, name, {width: W, editing});
  await settle(t);
  await t.emit({color_scheme: 'alt-scheme'}); await settle(t);
  let q = await probe(t, name);
  eq(popup ? [q.card.bg, q.heading.color, q.text.color] : [q.bg, q.tail.color, q.text.color], popup ? [rgb.altBg, rgb.altHeading, rgb.altText] : [rgb.altBg, rgb.altBorder, rgb.altText], tag + ': alternate scheme, live');
  await t.redraw({settings: {color_scheme: 'alt-scheme'}}); await settle(t);
  eq(await probe(t, name), q, tag + ': alternate scheme, redrawn');
  await t.redraw({settings: {color_scheme: 'default-color-scheme'}}); await settle(t);
  /* custom fonts on an element and a descendant, under the real theme rules, then off */
  const fam = () => t.page.evaluate(popup => { const r = document.querySelector('#shopify-section-test'), f = sel => { const el = r.querySelector(sel); return el ? getComputedStyle(el).fontFamily : ''; }; return popup ? {h: f('.pbs__heading'), em: f('.pbs__heading em'), p: f('.pbs__text p'), strong: f('.pbs__text strong'), btn: f('.pbs__button')} : {t: f('.dtl__text')}; }, popup);
  if (popup) {
    await t.redraw({blocks: [{type: 'heading', settings: {text: 'Our <em>autumn</em> edit'}}, {type: 'text', settings: {text: '<p>Ships <strong>Monday</strong>.</p>'}}, {type: 'button'}]}); await settle(t);
    const fonts = {enable_custom_fonts: true, heading_font: FONT, body_font: FONT2};
    for (const how of ['live', 'redrawn']) {
      if (how === 'live') await t.emit(fonts); else await t.redraw({settings: fonts});
      await settle(t);
      const f = await fam();
      ok(/Verdana/.test(f.h) && /Verdana/.test(f.em) && /Courier/.test(f.p) && /Courier/.test(f.strong) && /Courier/.test(f.btn), `${tag}: custom fonts win on the heading, its <em>, the text's <p> and <strong>, and the button, ${how}`);
      if (how === 'live') await t.emit({enable_custom_fonts: false}); else await t.redraw({settings: {enable_custom_fonts: false}});
      await settle(t);
      const g = await fam();
      ok(/Georgia/.test(g.h) && /Georgia/.test(g.em) && /Arial/.test(g.p) && /Arial/.test(g.btn), `${tag}: fonts off restores the theme, ${how}`);
    }
    const colours = {enable_custom_style: true, card_bg: '#abcdef', text_color: '#222222', overlay_color: '#336600'};
    for (const how of ['live', 'redrawn']) {
      if (how === 'live') await t.emit(colours); else await t.redraw({settings: colours});
      await settle(t);
      q = await probe(t, name);
      eq([q.card.bg, q.text.color, q.heading.color], ['rgb(171, 205, 239)', 'rgb(34, 34, 34)', rgb.heading], `${tag}: every custom colour lands, the heading keeps the scheme, ${how}`);
      if (how === 'live') await t.emit({card_bg: '', text_color: 'rgba(0, 0, 0, 0)'}); else await t.redraw({settings: {card_bg: '', text_color: 'rgba(0, 0, 0, 0)'}});
      await settle(t);
      q = await probe(t, name);
      eq([q.card.bg, q.text.color], [rgb.bg, rgb.text], `${tag}: an empty custom colour falls back to the scheme, ${how}`);
      if (how === 'live') await t.emit({enable_custom_style: false, card_bg: '#abcdef'}); else await t.redraw({settings: {enable_custom_style: false, card_bg: '#abcdef', text_color: '#222222'}});
      await settle(t);
      q = await probe(t, name);
      eq([q.card.bg, q.text.color], [rgb.bg, rgb.text], `${tag}: custom styling off restores the theme, ${how}`);
      if (how === 'live') await t.emit({card_bg: '', text_color: '', overlay_color: ''}); else await t.redraw({settings: {card_bg: '', text_color: '', overlay_color: ''}});
    }
  } else {
    const id = t.blockId('label');
    for (const how of ['live', 'redrawn']) {
      for (const style of ['label', 'heading']) {
        const on = {enable_custom_fonts: true, font: FONT, text_style: style};
        if (how === 'live') await t.emit(on, id); else await t.redraw({blocks: [{type: 'label', settings: {...t.section.blocks[0].settings, ...on}}, {type: 'link'}]});
        await settle(t);
        ok(/Verdana/.test((await fam()).t), `${tag}: the custom font wins on the ${style} text, ${how}`);
        const off = {enable_custom_fonts: false, text_style: style};
        if (how === 'live') await t.emit(off, id); else await t.redraw({blocks: [{type: 'label', settings: {...t.section.blocks[0].settings, ...off}}, {type: 'link'}]});
        await settle(t);
        ok(new RegExp(style === 'heading' ? 'Georgia' : 'Arial').test((await fam()).t), `${tag}: font off restores the theme's ${style === 'heading' ? 'heading' : 'body'} font, ${how}`);
      }
    }
    await t.redraw({blocks: CFG[name].blocks()}); await settle(t);
    const colours = {enable_custom_style: true, color_from: '#ff8800', section_bg: '#abcdef'};
    for (const how of ['live', 'redrawn']) {
      if (how === 'live') await t.emit(colours); else await t.redraw({settings: colours});
      await settle(t);
      q = await probe(t, name);
      eq([q.bg, q.tail.color, q.text.color], ['rgb(171, 205, 239)', 'rgb(255, 136, 0)', rgb.text], `${tag}: every custom colour lands, ${how}`);
      if (how === 'live') await t.emit({color_from: 'rgba(0, 0, 0, 0)', section_bg: ''}); else await t.redraw({settings: {color_from: 'rgba(0, 0, 0, 0)', section_bg: ''}});
      await settle(t);
      q = await probe(t, name);
      eq([q.bg, q.tail.color], [rgb.bg, rgb.border], `${tag}: an empty custom colour falls back to the scheme, ${how}`);
      if (how === 'live') await t.emit({enable_custom_style: false, color_from: '#ff8800'}); else await t.redraw({settings: {enable_custom_style: false, color_from: '#ff8800', section_bg: '#abcdef'}});
      await settle(t);
      q = await probe(t, name);
      eq([q.bg, q.tail.color], [rgb.bg, rgb.border], `${tag}: custom styling off restores the theme, ${how}`);
      if (how === 'live') await t.emit({color_from: '', section_bg: ''}); else await t.redraw({settings: {color_from: '', section_bg: ''}});
    }
  }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* ------------------------------------------------------------ select options look different */
async function selects(browser, name, W) {
  const cfg = CFG[name], s = schemaOf(name).schema, tag = `${name} ${W}`;
  const all = [...Object.entries(cfg.selects).map(([id, v]) => [null, id, v]), ...Object.entries(cfg.blockSelects).flatMap(([b, o]) => Object.entries(o).map(([id, v]) => [b, id, v]))];
  for (const [block, id, [only, pre = {}]] of all) {
    if (only && only !== W) continue;
    const t = await mountOf(browser, name, {width: W, editing: true, settings: pre});
    await settle(t);
    const list = block ? s.blocks.find(b => b.type === block).settings : s.settings, x = list.find(y => y.id === id), bid = block ? t.blockId(block) : undefined, seen = [];
    for (const how of ['live', 'redrawn']) {
      const sigs = [];
      for (const o of x.options) {
        if (how === 'live') await t.emit({[id]: o.value}, bid);
        else await t.redraw(block ? {blocks: t.section.blocks.map(b => ({type: b.type, settings: b.id === bid ? {...b.settings, [id]: o.value} : b.settings}))} : {settings: {[id]: o.value}});
        await settle(t);
        const q = await probe(t, name);
        delete q.width;
        sigs.push(JSON.stringify(q));
      }
      eq(new Set(sigs).size, x.options.length, `${tag}: every ${block ? block + '.' : ''}${id} option looks different, ${how}`);
      seen.push(sigs);
      if (how === 'live') await t.emit({[id]: x.default}, bid);
    }
    eq(seen[0], seen[1], `${tag}: ${id} options, live equals redrawn`);
    eq(t.errors, [], tag + ': ' + id + ': no errors');
    await t.page.close();
  }
}

/* ------------------------------------------------------------ lifecycle */
async function lifecycle(browser, name, W) {
  const cfg = CFG[name], tag = `${name} ${W}`, popup = name === 'popup-bottom-sheet';
  const t = await mountOf(browser, name, {width: W, editing: true, instances: [{uid: 'a', blocks: cfg.blocks()}, {uid: 'b', blocks: cfg.blocks()}]});
  await settle(t);
  const b0 = await probe(t, name, 'b');
  await t.emit(popup ? {color_scheme: 'alt-scheme', card_width: 300, text_align: 'center'} : {color_scheme: 'alt-scheme', padding_top: 12, padding_top_mobile: 12, style: 'dotted'}, undefined, 'a'); await settle(t);
  await t.emit(popup ? {text: 'Only in A'} : {text: 'Only in A'}, t.blockId(popup ? 'heading' : 'label', 0, 'a'), 'a'); await settle(t);
  const a1 = await probe(t, name, 'a');
  ok(a1.scheme === 'color-alt-scheme' && (popup ? a1.heading.html === 'Only in A' && a1.align === 'center' : a1.text.text === 'Only in A' && a1.pt === '12px' && a1.tail.style === 'dotted'), tag + ': the edits land in instance A');
  eq(await probe(t, name, 'b'), b0, tag + ': instance B is untouched');
  eq(await t.page.evaluate(() => window.MateriaR7Extras.count()), 2, tag + ': two roots');
  /* other shapes of the event: an object, a prefixed id, blockId */
  await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: {id: 'b'}, settings: {color_scheme: 'alt-scheme'}, live: true}})));
  await t.page.evaluate(({id, popup}) => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'shopify-section-b', blockId: id, settings: popup ? {text: 'Only in B'} : {text: 'Only in B'}, live: false}})), {id: t.blockId(popup ? 'heading' : 'label', 0, 'b'), popup});
  await settle(t);
  const b2 = await probe(t, name, 'b');
  ok(b2.scheme === 'color-alt-scheme' && (popup ? b2.heading.html : b2.text.text) === 'Only in B', tag + ': section as an object, a prefixed id and blockId are understood');
  eq((await probe(t, name, 'a'))[popup ? 'heading' : 'text'][popup ? 'html' : 'text'], 'Only in A', tag + ': and A keeps its own');
  await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {settings: {color_scheme: 'default-color-scheme'}, live: true}})));
  await settle(t);
  eq((await probe(t, name, 'a')).scheme, 'color-alt-scheme', tag + ': a theme setting change is left alone');
  eq(t.errors, [], tag + ': no errors with two instances');
  await t.page.close();

  /* an added block; redraws set up once; a picture kept on unrelated edits */
  const first = popup ? [{type: 'heading'}] : [{type: 'label'}];
  const u = await mountOf(browser, name, {width: W, editing: true, blocks: first, settings: popup ? {image: pic('kept')} : {}});
  await settle(u);
  const added = popup ? [{type: 'text', settings: {text: '<p>An added line.</p>'}}, {type: 'button', settings: {label: 'Added button', link: '/pages/added'}}] : [{type: 'link', settings: {label: 'Added link', link: '/pages/added'}}];
  await u.redraw({blocks: first.concat(added)}); await settle(u);
  const q = await probe(u, name);
  ok(popup ? q.text.html === '<p>An added line.</p>' && q.button.text === 'Added button' && q.button.href === '/pages/added' : q.link.text === 'Added link' && q.link.href === '/pages/added' && q.link.shown, tag + ': added blocks draw');
  const lastId = 'test-b' + added.length;
  await u.emit(popup ? {label: 'Added and edited'} : {label: 'Added and edited'}, lastId); await settle(u);
  eq((await probe(u, name))[popup ? 'button' : 'link'].text, 'Added and edited', tag + ': the added block is live');
  if (popup) {
    await u.page.evaluate(() => { const i = document.querySelector('#shopify-section-test .pbs__media img'); i.__kept = true; window.__src = i.getAttribute('src'); window.__opens = 0; document.addEventListener('materia:popup-open', () => window.__opens++); });
    await u.emit({card_width: 420, text_align: 'center', color_scheme: 'alt-scheme', enable_custom_style: true, card_bg: '#334455', image_alt: 'Kept'}); await settle(u);
    await u.emit({text: 'Edited'}, 'test-b0'); await settle(u);
    eq(await u.page.evaluate(() => { const i = document.querySelector('#shopify-section-test .pbs__media img'), d = document.querySelector('#shopify-section-test dialog'); return [i.__kept === true, i.getAttribute('src') === window.__src, i.alt, d.open, window.__opens]; }), [true, true, 'Kept', true, 0], tag + ': the picture is the same element with the same address, and the open popup is not closed or opened again, on unrelated edits');
  }
  for (let i = 0; i < 3; i++) await u.redraw();
  await settle(u);
  eq(await u.page.evaluate(() => [window.MateriaR7Extras.count(), document.querySelectorAll('[data-r7x]').length]), [1, 1], tag + ': redraws leave one root set up');
  if (popup) {
    /* one open event per opener click after several redraws: the manager holds one entry */
    await u.emit({editor_mode: false}); await settle(u);
    await u.page.evaluate(() => { window.__opens = 0; document.addEventListener('materia:popup-open', () => window.__opens++); const a = document.createElement('a'); a.href = '#bottom-sheet'; a.id = 'opener'; a.textContent = 'open'; document.body.prepend(a); });
    await u.page.click('#opener'); await settle(u);
    eq(await u.page.evaluate(() => [window.__opens, document.querySelector('#shopify-section-test dialog').open]), [1, true], tag + ': a link to #bottom-sheet opens it once after several redraws');
  }
  /* a section swapped in with no event is found too */
  await u.page.evaluate(() => { const w = document.getElementById('shopify-section-test'), html = w.innerHTML; w.innerHTML = ''; w.innerHTML = html; });
  await frames(u, 4);
  eq(await u.page.evaluate(() => [window.MateriaR7Extras.count(), [...window.MateriaR7Extras.roots.keys()].every(r => r.isConnected)]), [1, true], tag + ': a section put in without an event is picked up, the old one dropped');
  eq(u.errors, [], tag + ': no errors in the lifecycle');
  await u.page.close();
}

/* ------------------------------------------------------------ first paint, reduced motion, phone feel */
async function paint(browser, name, W, editing) {
  const cfg = CFG[name], tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`, popup = name === 'popup-bottom-sheet';
  const extras = popup ? (editing ? [{}, {image: pic('first'), text_align: 'center', corner: 'left'}] : [{open_mode: 'manual'}]) : [{}, {text_position: 'center', style: 'dashed', width_pct: 60, align: 'right'}, {text_position: 'end'}];
  for (const extra of extras) {
    const raw = await mount(browser, name, {width: W, editing, settings: {...cfg.base(editing), ...extra}, blocks: cfg.blocks(), assets: [], inlineScripts: false});
    const first = await probe(raw, name);
    await raw.page.close();
    const t = await mountOf(browser, name, {width: W, editing, settings: extra});
    await settle(t);
    eq(await probe(t, name), first, tag + ': first paint equals the hydrated paint ' + JSON.stringify(extra));
    await t.page.close();
  }
  const t = await mountOf(browser, name, {width: W, editing});
  await settle(t);
  const targets = await t.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test :is(a[href], button)')].filter(el => el.getClientRects().length).map(el => { const r = el.getBoundingClientRect(); return [el.className, Math.round(r.width), Math.round(r.height)]; }));
  eq(targets.filter(([, w, h]) => w < 44 || h < 44), [], tag + ': every link and button is at least 44px');
  eq(await t.page.evaluate(() => [document.querySelectorAll('#shopify-section-test h1').length, document.querySelectorAll('#shopify-section-test h2').length]), [0, popup ? 1 : 0], tag + (popup ? ': the heading is one h2' : ': a divider prints no heading'));
  ok(await t.noOverflow(), tag + ': no sideways page scroll');
  if (!popup) {
    /* where things sit for each position; an empty text leaves a plain line; a long text wraps */
    const at = async set => { await t.emit(set); if (!editing) await settle(t); await frames(t); return probe(t, name); };
    let q = await at({text_position: 'start'});
    ok(!q.lead.shown && q.text.box.x < q.tail.box.x && q.tail.box.x < q.link.box.x && Math.abs(q.text.box.x - q.row.x) <= 1, tag + ': Start: the text, the line, then the link');
    q = await at({text_position: 'end'});
    ok(!q.tail.shown && q.link.box.x < q.lead.box.x && q.lead.box.x < q.text.box.x && Math.abs(q.text.box.x + q.text.box.w - q.row.x - q.row.w) <= 1, tag + ': End: the link, the line, then the text');
    q = await at({text_position: 'center'});
    ok(Math.abs(q.lead.box.w - q.tail.box.w) < q.link.box.w + 60, tag + ': Center: a line on each side of the text');
    await at({text_position: 'start'});
    await t.emit({text: ''}, t.blockId('label')); await t.emit({label: ''}, t.blockId('link')); if (!editing) await settle(t); await frames(t);
    q = await probe(t, name);
    ok(!q.text.shown && !q.link.shown && q.tail.shown && Math.abs(q.tail.box.w - q.row.w) <= 1, tag + ': with no text and no link it is a plain line across');
    await t.emit({text: 'A much longer line of words that a creator might type into the divider text'}, t.blockId('label')); await t.emit({label: 'Shop all'}, t.blockId('link')); if (!editing) await settle(t); await frames(t);
    q = await probe(t, name);
    ok((W === 375 ? q.text.box.h > 20 : q.text.box.w <= q.row.w * 0.72 + 1) && q.tail.box.w >= 24 && q.link.box.x + q.link.box.w <= q.row.x + q.row.w + 1, tag + ': a long text wraps (or stays within its share of the row), and the line and the link keep their room');
    ok(await t.noOverflow(), tag + ': no sideways page scroll with a long text');
  }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();

  /* the theme's reveal on scroll */
  if (!popup) {
    const a = await mountOf(browser, name, {width: W, editing, theme: {scroll_animation: 'fade_up'}});
    const reveal = () => a.page.evaluate(() => { const w = document.getElementById('shopify-section-test'); return [w.classList.contains('scroll-trigger'), w.classList.contains('fade_up'), getComputedStyle(w).opacity]; });
    eq(await reveal(), [true, true, '1'], tag + ': the theme reveal hook is on the section and the content shows');
    await a.page.close();
    const n = await mountOf(browser, name, {width: W, editing, theme: {scroll_animation: 'fade_up'}, settings: {reveal: false}});
    eq(await n.page.evaluate(() => [document.getElementById('shopify-section-test').classList.contains('scroll-trigger'), !!document.querySelector('#shopify-section-test [data-ti-no-reveal]')]), [false, true], tag + ': Reveal on scroll off: no theme reveal, and the layout reveal skips it');
    await n.page.close();
  }

  /* reduced motion */
  const r = await mountOf(browser, name, {width: W, editing, reducedMotion: 'reduce'});
  await settle(r);
  if (popup) {
    eq(await r.page.evaluate(() => { const c = document.querySelector('#shopify-section-test .pbs__card'), d = c.closest('dialog'); return [d.open, getComputedStyle(c).animationName, getComputedStyle(d).animationName, getComputedStyle(c).opacity]; }), [true, 'none', 'none', '1'], tag + ': reduced motion: drawn at once, nothing animates');
    if (!editing) {
      await r.page.click('#shopify-section-test .pbs__close');
      eq(await r.page.evaluate(() => [document.querySelector('#shopify-section-test dialog').open, document.querySelector('#shopify-section-test .pbs').hasAttribute('data-closing')]), [false, false], tag + ': reduced motion: it closes at once');
    }
  } else {
    eq(await r.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test .dtl__link svg')).transitionDuration), '0s', tag + ': reduced motion: the link arrow does not move');
  }
  eq(r.errors, [], tag + ': no errors under reduced motion');
  await r.page.close();
}

/* ------------------------------------------------------------ the popup's behaviour through the theme manager */
async function behaviour(browser, W) {
  const name = 'popup-bottom-sheet', tag = `${name} ${W}`, phone = W === 375;
  const isOpen = t => t.page.evaluate(() => document.querySelector('#shopify-section-test dialog').open);
  const current = t => t.page.evaluate(() => window.MateriaPopups.current());
  /* on load, as a sheet (phone) or a corner card (computer) */
  let t = await mountOf(browser, name, {width: W, editing: false});
  await settle(t, 150);
  let q = await probe(t, name);
  ok(q.open && q.modal === phone && q.ariaHidden === 'false' && await current(t) === 'test', tag + ': On page load opens it through the manager, ' + (phone ? 'as a modal sheet' : 'as a card that is not modal'));
  if (phone) {
    ok(q.card.box.y + q.card.box.h === 900 && q.card.box.w === 375 && q.card.radiusB === '0px' && q.card.radius === '8px' && q.scrim.display === 'block', tag + ': the sheet sits on the bottom edge, full width, rounded at the top, over a dimmed page');
    eq(await t.page.evaluate(() => [document.documentElement.style.overflow, getComputedStyle(document.querySelector('#shopify-section-test .pbs__grip')).touchAction]), ['hidden', 'pan-x'], tag + ': the page behind is held still; the handle never holds a vertical page scroll (pan-x, not none)');
    ok(await t.page.evaluate(() => { const g = document.querySelector('#shopify-section-test .pbs__grip').getBoundingClientRect(); return g.width >= 44 && g.height >= 24; }), tag + ': the handle is a wide target');
  } else {
    ok(q.card.box.x + q.card.box.w === W - 24 && q.card.box.y + q.card.box.h === 900 - 24 && q.scrim.display === 'none', tag + ': the card sits 24px from the bottom right corner, with no dimmed page');
    eq(await t.page.evaluate(() => [document.documentElement.style.overflow, document.documentElement.hasAttribute('data-popup-open')]), ['', false], tag + ': the page stays usable behind the corner card');
    await t.page.evaluate(() => { const b = document.createElement('button'); b.id = 'behind'; b.textContent = 'behind'; b.style.cssText = 'position:fixed;top:10px;left:10px;width:80px;height:44px'; document.body.append(b); b.addEventListener('click', () => { window.__behind = true; }); });
    await t.page.click('#behind');
    ok(await t.page.evaluate(() => window.__behind === true) && await isOpen(t), tag + ': a click on the page behind works and leaves the card open');
  }
  /* Escape */
  await t.page.keyboard.press('Escape'); await settle(t, 320);
  eq([await isOpen(t), await current(t)], [false, null], tag + ': Escape closes it');
  eq(await t.page.evaluate(() => [document.documentElement.style.overflow, !!document.querySelector('#shopify-section-test .pbs[data-closing]')]), ['', false], tag + ': the page is let go and the closing is finished');
  eq(t.errors, [], tag + ': no errors on load and Escape');
  await t.page.close();

  /* from a link: focus moves in, close button, focus given back */
  t = await mountOf(browser, name, {width: W, editing: false, settings: {open_mode: 'manual'}});
  await settle(t, 300);
  ok(!await isOpen(t), tag + ': From a link: nothing opens by itself');
  await t.page.evaluate(() => { const a = document.createElement('a'); a.href = '/pages/info#bottom-sheet'; a.id = 'opener'; a.textContent = 'Open the note'; document.body.prepend(a); });
  await t.page.focus('#opener'); await t.page.keyboard.press('Enter'); await settle(t, 100);
  ok(await isOpen(t) && await t.page.evaluate(() => document.querySelector('#shopify-section-test .pbs__card').contains(document.activeElement)), tag + ': a link to #bottom-sheet opens it and the focus moves in');
  const close = await t.page.evaluate(() => { const r = document.querySelector('#shopify-section-test .pbs__close').getBoundingClientRect(); return [r.width, r.height]; });
  ok(close[0] >= 44 && close[1] >= 44, tag + ': the close button is 44px');
  if (phone) {
    await t.page.keyboard.press('Tab'); await t.page.keyboard.press('Tab'); await t.page.keyboard.press('Tab');
    ok(await t.page.evaluate(() => document.querySelector('#shopify-section-test .pbs__card').contains(document.activeElement)), tag + ': Tab stays in the sheet');
  }
  await t.page.click('#shopify-section-test .pbs__close'); await settle(t, 320);
  eq([await isOpen(t), await t.page.evaluate(() => document.activeElement && document.activeElement.id)], [false, 'opener'], tag + ': the close button closes it and the focus goes back to the link');
  eq(t.errors, [], tag + ': no errors from a link');
  await t.page.close();

  /* after a delay, on scroll, after page views */
  t = await mountOf(browser, name, {width: W, editing: false, settings: {open_mode: 'delay', delay_s: 1}});
  await t.page.waitForTimeout(400);
  ok(!await isOpen(t), tag + ': After a delay: not before the delay');
  await t.page.waitForTimeout(1000); await frames(t);
  ok(await isOpen(t), tag + ': After a delay: open after it');
  await t.page.close();
  t = await mountOf(browser, name, {width: W, editing: false, settings: {open_mode: 'scroll', scroll_pct: 50}});
  await t.page.evaluate(() => { document.body.style.minHeight = '4000px'; });
  await settle(t, 200);
  ok(!await isOpen(t), tag + ': On scroll: not at the top');
  await t.page.evaluate(() => window.scrollTo(0, 2500)); await settle(t, 200);
  ok(await isOpen(t), tag + ': On scroll: open past the chosen share of the page');
  await t.page.close();
  t = await mountOf(browser, name, {width: W, editing: false, settings: {open_mode: 'pageviews', page_views: 3, delay_s: 0}});
  await settle(t, 200);
  ok(!await isOpen(t) && await t.page.evaluate(() => window.MateriaPopups.pageViews()) === 1, tag + ': After page views: not on the first page');
  await t.page.close();

  /* one popup at a time, and never over the cookie banner */
  t = await mountOf(browser, name, {width: W, editing: false, settings: {open_mode: 'delay', delay_s: 0}, inlineScripts: false, assets: []});
  await t.page.addScriptTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', MANAGER), 'utf8')});
  await t.page.evaluate(() => { const r = document.createElement('div'); r.id = 'other'; document.body.append(r); window.__other = window.MateriaPopups.register({id: 'other', root: r, trigger: {mode: 'manual'}, frequency: {mode: 'always'}, modal: false, focus: false}); window.__other.show(); });
  await t.page.addScriptTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', ASSET), 'utf8')});
  await settle(t, 200);
  eq([await isOpen(t), await current(t), await t.page.evaluate(() => window.MateriaPopups.queued())], [false, 'other', ['test']], tag + ': it waits in the queue while another popup is open');
  await t.page.evaluate(() => window.__other.hide()); await settle(t, 800);
  eq([await isOpen(t), await current(t)], [true, 'test'], tag + ': and opens once the other one closes');
  await t.page.close();
  t = await mountOf(browser, name, {width: W, editing: false, settings: {open_mode: 'delay', delay_s: 0}, inlineScripts: false, assets: []});
  await t.page.evaluate(() => { const c = document.createElement('cookie-consent'); c.setAttribute('data-open', ''); c.textContent = 'cookies'; c.style.display = 'block'; document.body.append(c); });
  await t.page.addScriptTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', MANAGER), 'utf8')});
  await t.page.addScriptTag({content: fs.readFileSync(path.join(ROOT, 'shopify/assets', ASSET), 'utf8')});
  await settle(t, 300);
  ok(!await isOpen(t), tag + ': nothing opens over an open cookie banner');
  await t.page.evaluate(() => { document.querySelector('cookie-consent').removeAttribute('data-open'); document.dispatchEvent(new CustomEvent('materia:consent')); });
  await settle(t, 800);
  ok(await isOpen(t), tag + ': it opens once the visitor has answered the banner');
  eq(t.errors, [], tag + ': no errors in the queue');
  await t.page.close();

  /* how often it comes back */
  for (const [mode, again, stored] of [['after_days', false, 'days'], ['never', false, 'never'], ['every_visit', true, null]]) {
    t = await mountOf(browser, name, {width: W, editing: false, settings: {open_mode: 'immediate', after_dismiss: mode, hide_days: 3}});
    await settle(t, 150);
    await t.page.click('#shopify-section-test .pbs__close'); await settle(t, 320);
    const v = await t.page.evaluate(() => localStorage.getItem('materia:popup:test'));
    ok(stored === 'days' ? +v > Date.now() + 2.9 * 864e5 && +v < Date.now() + 3.1 * 864e5 : v === stored, `${tag}: Show again ${mode}: remembered as ${stored}`);
    await t.redraw(); await settle(t, 150);
    eq(await isOpen(t), again, `${tag}: Show again ${mode}: ${again ? 'shows again' : 'not shown again'} on the next page`);
    await t.page.close();
  }
  /* the button: done for the chosen days, and the popup closes */
  t = await mountOf(browser, name, {width: W, editing: false, settings: {open_mode: 'immediate', after_dismiss: 'after_days', hide_days: 5}});
  await settle(t, 150);
  await t.page.evaluate(() => document.addEventListener('click', e => { if (e.target.closest('a')) e.preventDefault(); }));
  await t.page.click('#shopify-section-test .pbs__button'); await settle(t, 100);
  const kept = await t.page.evaluate(() => +localStorage.getItem('materia:popup:test'));
  ok(!await isOpen(t) && kept > Date.now() + 4.9 * 864e5, tag + ': the button closes it and it is not offered again for the chosen days');
  await t.page.close();

  if (phone) {
    /* the dimmed page and a swipe down close the sheet; a short swipe springs back */
    t = await mountOf(browser, name, {width: W, editing: false});
    await settle(t, 150);
    await t.page.mouse.click(180, 100); await settle(t, 320);
    ok(!await isOpen(t), tag + ': a tap on the dimmed page closes the sheet');
    await t.page.close();
    t = await mountOf(browser, name, {width: W, editing: false});
    await settle(t, 150);
    const grip = await t.page.evaluate(() => { const r = document.querySelector('#shopify-section-test .pbs__grip').getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; });
    const drag = async dy => {
      await t.page.mouse.move(grip.x, grip.y); await t.page.mouse.down();
      for (let i = 1; i <= 6; i++) await t.page.mouse.move(grip.x, grip.y + dy * i / 6);
      await frames(t, 1);
      const mid = await t.page.evaluate(() => [document.querySelector('#shopify-section-test .pbs__card').style.transform, getComputedStyle(document.querySelector('#shopify-section-test .pbs__scrim')).opacity]);
      await t.page.mouse.up();
      return mid;
    };
    let mid = await drag(30);
    eq(mid[0], 'translateY(30px)', tag + ': the sheet follows the finger down');
    await settle(t, 300);
    eq([await isOpen(t), await t.page.evaluate(() => document.querySelector('#shopify-section-test .pbs__card').style.transform)], [true, ''], tag + ': a short swipe springs back');
    mid = await drag(160);
    ok(mid[0] === 'translateY(160px)' && +mid[1] < 0.4, tag + ': the dimmed page lightens as the sheet goes down');
    await settle(t, 400);
    eq([await isOpen(t), await current(t)], [false, null], tag + ': a long swipe down closes the sheet through the manager');
    eq(t.errors, [], tag + ': no errors with the swipe');
    await t.page.close();
  }

  /* the builder: no trigger runs; drawn in the page, or shown while selected */
  t = await mountOf(browser, name, {width: W, editing: true, settings: {open_mode: 'immediate', editor_mode: false}});
  await settle(t, 200);
  ok(!await isOpen(t), tag + ': builder: no trigger runs');
  await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('shopify:section:select', {detail: {sectionId: 'test'}})));
  await settle(t);
  q = await probe(t, name);
  ok(q.open && !q.modal && await t.page.evaluate(() => getComputedStyle(document.querySelector('#shopify-section-test dialog')).position) === 'relative', tag + ': builder: selected, it is drawn in the page, never over it');
  ok(await t.page.evaluate(() => !document.querySelector('#shopify-section-test .pbs__card').contains(document.activeElement)), tag + ': builder: the focus stays in the sidebar');
  await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('shopify:section:deselect', {detail: {sectionId: 'test'}})));
  await settle(t);
  ok(!await isOpen(t), tag + ': builder: deselected, it goes');
  await t.emit({editor_mode: true}); await settle(t);
  ok(await isOpen(t), tag + ': builder: Show in the builder on, live, draws it');
  await t.emit({editor_mode: false}); await settle(t);
  ok(!await isOpen(t), tag + ': builder: and off, live, takes it away');
  eq(t.errors, [], tag + ': no errors in the builder');
  await t.page.close();
}

/* ------------------------------------------------------------ run */
(async () => {
  const names = Object.keys(CFG).filter(n => !only.length || only.includes(n));
  controllerStatics();
  for (const name of names) statics(name);
  const browser = await launch();
  try {
    for (const name of names) {
      for (const W of [375, 1366]) {
        for (const editing of [true, false]) {
          await controls(browser, name, W, editing);
          await theme(browser, name, W, editing);
          await paint(browser, name, W, editing);
        }
        await selects(browser, name, W);
        await lifecycle(browser, name, W);
        if (name === 'popup-bottom-sheet') await behaviour(browser, W);
      }
    }
  } finally { await browser.close(); }
  console.log(`extras round 7 (${names.join(', ')}): ${checks} checks passed`);
})().catch(e => { console.error(e); process.exitCode = 1; });
