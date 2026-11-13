/* Materia Themes. Testimonial Wall and Testimonial With Product: their
   behaviour and the builder's live edits.

   Every root [data-r7t-root] names its section type. The Liquid prints the
   first paint (CSS variables, attributes, words), so nothing is painted on
   load. This file only sets up what each section needs, once per instance,
   and undoes it when the section is removed or drawn again:

   - Testimonial Wall: the Show more button (the wall's clip is CSS; the
     button flips data-open and its own label).
   - Testimonial With Product: the arrows, the arrow keys and the progress
     line of a native scroll row. The row itself is moved by the browser
     (finger, trackpad, snap); the scroll position is read in one passive
     listener, once per frame.

   In the builder the root also carries its settings as JSON
   (data-r7t-settings) and every block its own. On storelib:settings-change
   the same variables the Liquid prints are worked out again and only what
   differs is written, once per frame, for that instance only: no picture
   is loaded again and the row keeps its place. Nothing here runs on a page
   without one of the two sections. */
(() => {
  if (window.MateriaLiveR7Testimonials) return;
  const SEL = '[data-r7t-root]', BSEL = '[data-r7t-block]';
  const roots = new Map();
  /* what the builder session knows about a section across redraws: the wall stays open once opened, and opens for a block that was just added */
  const memory = new Map();
  const api = () => window.MateriaHeroImageOne;
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const localColor = (v, f) => {
    if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; }
    v = typeof v === 'string' ? v.trim() : '';
    return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f;
  };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const pick = (on, v, f) => on ? color(v, f) : f;
  const fontCss = (v, f) => {
    if (v && typeof v === 'object' && v.family) return v.family + ', ' + (v.fallback_families || 'sans-serif');
    const fam = api() && api().font ? api().font(v) : '';
    return !fam ? f : /^var\(|,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const localUrl = (v, image) => {
    v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.preview_image?.url || v.value : v;
    if (typeof v !== 'string' || !v || v === '#') return '';
    try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; }
  };
  const url = (v, image = false) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };

  /* ---------- writers: each writes only when the value differs ---------- */
  const set = (el, p, v) => { if (!el) return; if (v == null || v === '') { if (el.style.getPropertyValue(p)) el.style.removeProperty(p); } else if (el.style.getPropertyValue(p) !== String(v)) el.style.setProperty(p, String(v)); };
  const text = (el, v) => { if (el && el.textContent !== String(v ?? '')) el.textContent = v ?? ''; };
  const hide = (el, on) => { if (el && el.hidden !== !!on) el.hidden = !!on; };
  const attr = (el, n, v) => { if (!el) return; if (v == null || v === false) { if (el.hasAttribute(n)) el.removeAttribute(n); } else { const s = v === true ? '' : String(v); if (el.getAttribute(n) !== s) el.setAttribute(n, s); } };
  const flag = (el, n, on) => attr(el, n, on ? 'true' : 'false');
  const plain = v => String(v ?? '').replace(/<[^>]*>/g, '').trim();
  const rich = (el, v, st) => {
    if (!el) return;
    v = v == null ? '' : String(v);
    if (st.rich.get(el) === v) return;
    if (api() && api().rich) api().rich(el, v, {rich: new WeakMap()}); else el.textContent = v.replace(/<[^>]*>/g, '');
    st.rich.set(el, v);
  };
  const scheme = (el, s) => {
    const id = s.color_scheme && s.color_scheme.id || s.color_scheme;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || el.classList.contains('color-' + id)) return;
    for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c);
    el.classList.add('color-' + id);
  };
  /* Five stars filled to a rating, the fills snippets/r7-testimonial-stars prints; no rating (0) shows none. */
  function stars(row, rating) {
    if (!row) return;
    const r = Math.max(0, Math.min(5, num(rating)));
    attr(row, 'aria-label', r + ' / 5'); hide(row, r <= 0);
    [...row.querySelectorAll('.r7t-star')].forEach((s, i) => set(s, '--r7t-fill', Math.round(Math.max(0, Math.min(1, r - i)) * 100) + '%'));
  }
  /* A picture in its holder: the same address keeps the element (no reload); none hides the holder. */
  function image(holder, v, alt, sizes) {
    if (!holder) return;
    const src = url(v, true);
    let img = holder.querySelector(':scope > img');
    if (!src) { if (img) img.remove(); hide(holder, true); return; }
    if (!img) {
      img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async';
      if (sizes) { img.width = sizes[0]; img.height = sizes[1]; } else if (v && v.width && v.height) { img.width = v.width; img.height = v.height; }
      holder.append(img);
    }
    const base = img.getAttribute('src') || '';
    if (base !== src && base.split('?')[0] !== src.split('?')[0]) { img.removeAttribute('srcset'); img.removeAttribute('sizes'); if (!sizes && v && v.width && v.height) { img.width = v.width; img.height = v.height; } img.src = src; }
    if (img.alt !== alt) img.alt = alt;
    hide(holder, false);
  }
  /* A theme button block: a link while it has one, a plain button when not; its own colours only while custom styling is on. */
  function button(el, b) {
    const h = url(b.link), tag = h ? 'A' : 'BUTTON';
    if (el.tagName !== tag) {
      const n = document.createElement(tag);
      for (const a of el.attributes) n.setAttribute(a.name, a.value);
      n.replaceChildren(...el.childNodes);
      el.replaceWith(n); el = n;
    }
    if (h) { attr(el, 'href', h); attr(el, 'type', null); } else { attr(el, 'href', null); attr(el, 'type', 'button'); }
    text(el, b.label || ''); hide(el, !String(b.label || '').trim());
    attr(el, 'data-theme-button', b.button_style === 'secondary' ? 'secondary' : 'primary');
    const c = bool(b.enable_custom_style), cv = v => c ? color(v, '') : '';
    const bg = cv(b.bg), hb = cv(b.bg_hover);
    set(el, '--mb-bg', bg); set(el, '--mb-text', cv(b.text_color)); set(el, '--mb-border', bg);
    set(el, '--mb-hover-bg', hb); set(el, '--mb-hover-text', cv(b.text_hover)); set(el, '--mb-hover-border', hb);
    return el;
  }

  /* ---------- what both sections paint ---------- */
  const FONT_KEYS = ['enable_custom_fonts', 'heading_font', 'body_font'];
  function common(root, st) {
    const s = st.s, c = bool(s.enable_custom_style);
    scheme(root, s);
    attr(root.querySelector('.r7t__frame'), 'data-width', s.section_width || 'container');
    attr(root, 'data-card', s.card_style || 'filled');
    flag(root, 'data-reset', bool(s.reset_spacing));
    const v = {
      '--r7t-bg': pick(c, s.section_bg, 'var(--color-background)'), '--r7t-text': pick(c, s.text_color, 'var(--color-text)'),
      '--r7t-card-bg': pick(c, s.card_bg, 'color-mix(in srgb, var(--color-text) 6%, var(--color-background))'),
      '--r7t-card-border': pick(c, s.card_border_color, 'var(--color-border)'),
      '--r7t-quote-c': pick(c, s.quote_color, 'var(--color-heading)'), '--r7t-name-c': pick(c, s.name_color, 'var(--color-heading)'),
      '--r7t-star-on': pick(c, s.star_color, 'var(--color-primary)'), '--r7t-star-off': pick(c, s.star_empty_color, 'color-mix(in srgb, var(--color-text) 22%, transparent)'),
      '--r7t-radius': c ? px(s.card_radius) : 'var(--rounded-radius, 0px)',
      '--r7t-gap': px(s.card_gap, 20), '--r7t-q-d': px(s.quote_size, 16), '--r7t-q-m': px(s.quote_size_mobile, 15),
      '--r7t-pt': px(s.padding_top), '--r7t-pb': px(s.padding_bottom), '--r7t-pt-m': px(s.padding_top_mobile), '--r7t-pb-m': px(s.padding_bottom_mobile),
      '--r7t-mt': px(s.section_margin_top_desktop), '--r7t-mb': px(s.section_margin_bottom_desktop), '--r7t-mt-m': px(s.section_margin_top_mobile), '--r7t-mb-m': px(s.section_margin_bottom_mobile),
    };
    for (const [k, x] of Object.entries(v)) set(root, k, x);
    /* the fonts are written only when a font control changed, so a font the page already printed is left as it is */
    if (FONT_KEYS.some(k => st.touched('', k))) {
      const f = bool(s.enable_custom_fonts);
      set(root, '--r7t-hf', f ? fontCss(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)');
      set(root, '--r7t-bf', f ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)');
      /* Theme settings > Typography wins with !important unless the section opts out (snippets/theme-controls) */
      attr(root, 'data-own-font', f ? true : null);
    }
    for (let el of root.querySelectorAll(BSEL)) {
      const b = st.block(el), id = el.dataset.r7tBlock, t = el.dataset.r7tType;
      if (t === 'eyebrow' || t === 'heading' || t === 'subheading') {
        if (t === 'eyebrow') text(el, b.text); else rich(el, b.text, st);
        hide(el, !plain(b.text));
        set(el, '--b-c', pick(bool(b.enable_custom_style), b.color, t === 'heading' ? 'var(--color-heading)' : 'var(--color-text)'));
        if (t === 'heading') { set(el, '--b-fs-d', px(b.size, 40)); set(el, '--b-fs-m', px(b.size_mobile, 26)); }
        if (t === 'subheading') set(el, '--b-fs', px(b.size, 16));
      } else if (t === 'testimonial') {
        stars(el.querySelector('[data-r7t-stars]'), b.rating);
        const body = el.querySelector('[data-r7t-text]'); text(body, b.body); hide(body, !String(b.body || '').trim());
        const name = el.querySelector('[data-r7t-name]'); text(name, b.name); hide(name, !String(b.name || '').trim());
        const role = el.querySelector('[data-r7t-role]'); text(role, b.role); hide(role, !String(b.role || '').trim());
        const av = el.querySelector('[data-r7t-avatar]');
        if (st.touched(id, 'avatar')) image(av, b.avatar, '', [40, 40]);
        hide(el.querySelector('[data-r7t-by]'), !String(b.name || '').trim() && !String(b.role || '').trim() && (!av || av.hidden));
        const photo = el.querySelector('[data-r7t-photo]');
        if (photo) {
          if (st.touched(id, 'image')) { image(photo, b.image, b.image_alt || (b.image && b.image.alt) || ''); const ar = b.image && typeof b.image === 'object' ? num(b.image.aspect_ratio) || (num(b.image.width) && num(b.image.height) ? num(b.image.width) / num(b.image.height) : 0) : 0; set(photo, '--r7w-ar', ar ? String(Math.round(ar * 1000) / 1000) : null); }
          else if (st.touched(id, 'image_alt')) { const img = photo.querySelector(':scope > img'); if (img) img.alt = b.image_alt || (b.image && b.image.alt) || ''; }
        }
      } else if (t === 'button') button(el, b);
    }
  }

  const TYPES = {};

  /* ---------- Testimonial Wall ---------- */
  function wallOpen(root, open, instant) {
    const more = root.querySelector('[data-r7t-more]');
    if (instant) attr(root, 'data-instant', true);
    flag(root, 'data-open', open);
    if (more) { attr(more, 'aria-expanded', open ? 'true' : 'false'); text(more, open && more.dataset.less ? more.dataset.less : more.dataset.more || 'Show more'); }
    const id = root.dataset.sectionId, m = memory.get(id) || {};
    m.open = open; memory.set(id, m);
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => attr(root, 'data-instant', null)));
  }
  const wallIsOpen = root => root.dataset.open === 'true';
  /* true while the wall is showing only its first part at this width */
  const wallClipped = root => !wallIsOpen(root) && (root.dataset.collapse === 'always' || root.dataset.collapse === 'mobile' && matchMedia('(max-width: 767px)').matches);
  TYPES['testimonial-wall'] = {
    init(root, st) {
      const more = root.querySelector('[data-r7t-more]');
      if (more) more.addEventListener('click', () => {
        const open = !wallIsOpen(root);
        /* closing is not animated: the page is far down the wall, so the button is brought back into view at once */
        wallOpen(root, open, !open || reduced());
        if (!open) { const r = more.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) more.scrollIntoView({block: 'center', behavior: 'instant'}); }
      }, {signal: st.ac.signal});
      /* in the builder: stay open across redraws once opened, and open for a quote that was just added (it would sit under the fold of the wall) */
      const ids = [...root.querySelectorAll('[data-r7t-type="testimonial"]')].map(n => n.dataset.r7tBlock), m = memory.get(st.id) || {};
      const added = st.builder && m.ids && ids.some(i => !m.ids.includes(i));
      if (st.builder && (m.open || added)) wallOpen(root, true, true);
      memory.set(st.id, {...(memory.get(st.id) || {}), ids});
    },
    paint(root, st) {
      const s = st.s;
      common(root, st);
      attr(root, 'data-align', s.text_align || 'center');
      const total = root.querySelectorAll('[data-r7t-type="testimonial"]').length, wanted = Math.max(1, Math.round(num(s.columns, 3)));
      /* fewer quotes than columns: as many columns as quotes */
      const cols = Math.max(1, Math.min(wanted, total));
      flag(root, 'data-few', total < wanted);
      set(root, '--r7w-cols', String(cols)); set(root, '--r7w-cols-l', String(Math.min(cols, 3))); set(root, '--r7w-cols-t', String(Math.min(cols, 2)));
      set(root, '--r7w-part', num(s.collapsed_part, 40) / 100 + 'fr');
      attr(root, 'data-collapse', total < 5 ? 'none' : s.collapse || 'mobile');
      flag(root, 'data-less', !!String(s.less_label || '').trim());
      const more = root.querySelector('[data-r7t-more]');
      if (more) {
        attr(more, 'data-more', String(s.more_label || '').trim() || 'Show more'); attr(more, 'data-less', String(s.less_label || '').trim() || null);
        text(more, wallIsOpen(root) && more.dataset.less ? more.dataset.less : more.dataset.more);
      }
      /* a quote being edited under the fold of the wall: open it so the change can be seen */
      if (st.lastBlock && wallClipped(root)) {
        const card = [...root.querySelectorAll('[data-r7t-type="testimonial"]')].find(n => n.dataset.r7tBlock === st.lastBlock), clip = root.querySelector('[data-r7t-clip]');
        if (card && clip && card.getBoundingClientRect().top - clip.getBoundingClientRect().top > clip.clientHeight - 60) wallOpen(root, true, reduced());
      }
      st.lastBlock = '';
    },
    select(root, st, card) { if (card && wallClipped(root)) wallOpen(root, true, true); },
  };

  /* ---------- Testimonial With Product ---------- */
  /* A native scroll row: arrows, arrow keys and the progress line. The finger moves the row; nothing here drags it. */
  function row(st, track) {
    const root = st.el, prev = root.querySelector('[data-r7t-prev]'), next = root.querySelector('[data-r7t-next]'), fill = root.querySelector('[data-r7t-fill]');
    let raf = 0, max = 0, base = 1;
    const rtl = () => getComputedStyle(track).direction === 'rtl';
    const at = () => Math.abs(track.scrollLeft);
    const step = () => { const c = track.firstElementChild; return c ? c.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : track.clientWidth; };
    const go = left => track.scrollTo({left: Math.max(0, Math.min(max, left)) * (rtl() ? -1 : 1), behavior: reduced() ? 'instant' : 'smooth'});
    const move = dir => { const s = step(); if (s > 0) go((Math.round(at() / s) + dir) * s); };
    /* sizes are read when the row or the layout changes, never while it scrolls */
    function measure() {
      max = Math.max(0, track.scrollWidth - track.clientWidth);
      const n = parseFloat(getComputedStyle(root).getPropertyValue('--r7p-n')) || 1, count = Math.max(1, track.children.length);
      base = Math.min(1, n / count);
      update();
    }
    function update() {
      raf = 0;
      if (!track.isConnected) return;
      const pos = at();
      if (prev) prev.disabled = pos < 2;
      if (next) next.disabled = pos >= max - 2;
      /* at the start the fill is the one the CSS prints (cards in view / cards), so nothing moves when this file loads */
      set(fill, '--r7p-f', pos < 2 || max <= 0 ? null : (base + Math.min(1, pos / max) * (1 - base)).toFixed(4));
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const o = {signal: st.ac.signal};
    prev && prev.addEventListener('click', () => move(-1), o);
    next && next.addEventListener('click', () => move(1), o);
    track.addEventListener('keydown', e => {
      if (e.target !== track) return;
      const k = e.key, dir = rtl() ? -1 : 1;
      if (k === 'ArrowRight' || k === 'ArrowLeft') { move((k === 'ArrowRight' ? 1 : -1) * dir); e.preventDefault(); }
      else if (k === 'Home') { go(0); e.preventDefault(); } else if (k === 'End') { go(max); e.preventDefault(); }
    }, o);
    track.addEventListener('scroll', schedule, {passive: true, signal: st.ac.signal});
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => measure()) : null;
    if (ro) { ro.observe(track); st.off.push(() => ro.disconnect()); } else measure();
    st.off.push(() => cancelAnimationFrame(raf));
    return {el: track, measure, move, go, show(card) { if (card) go(card.offsetLeft - track.offsetLeft - (parseFloat(getComputedStyle(track).paddingInlineStart) || 0)); }};
  }
  TYPES['testimonial-product'] = {
    init(root, st) { const track = root.querySelector('[data-r7t-track]'); st.row = track ? row(st, track) : null; },
    paint(root, st) {
      const s = st.s;
      common(root, st);
      attr(root, 'data-align', s.text_align || 'left');
      const pv = Math.max(1, Math.round(num(s.cards_desktop, 3))), pvt = Math.min(pv, 2), total = root.querySelectorAll('[data-r7t-type="testimonial"]').length;
      set(root, '--r7p-pv', String(pv)); set(root, '--r7p-pv-t', String(pvt)); set(root, '--r7p-pv-m', bool(s.mobile_peek) ? '1.15' : '1');
      flag(root, 'data-arrows', bool(s.show_arrows)); flag(root, 'data-progress', bool(s.show_progress));
      flag(root, 'data-fit-m', total <= 1); flag(root, 'data-fit-t', total <= pvt); flag(root, 'data-fit-d', total <= pv);
      st.row && st.row.measure();
    },
    select(root, st, card) { if (card && st.row) st.row.show(card); },
  };

  /* ---------- registry and lifecycle ---------- */
  function add(el) {
    const type = el.dataset.r7tRoot, T = TYPES[type];
    if (!T) return;
    const st = {el, type, id: el.dataset.sectionId, builder: el.hasAttribute('data-r7t-settings'), s: parse(el.dataset.r7tSettings), blocks: new Map(), dirty: new Map(), off: [], ac: new AbortController(), rich: new WeakMap(), raf: 0, inits: 0, lastBlock: ''};
    st.block = node => { const id = node.dataset.r7tBlock; if (!st.blocks.has(id)) st.blocks.set(id, parse(node.dataset.r7tSettings)); return st.blocks.get(id); };
    st.touched = (block, key) => { const d = st.dirty.get(block || ''); return !!d && d.has(key); };
    roots.set(el, st);
    if (T.init) T.init(el, st);
    st.inits++;
  }
  function remove(el, st) { cancelAnimationFrame(st.raf); st.ac.abort(); for (const f of st.off.splice(0)) { try { f(); } catch (_) {} } roots.delete(el); }
  function scan() {
    for (const [el, st] of roots) if (!el.isConnected) remove(el, st);
    for (const el of document.querySelectorAll(SEL)) if (!roots.has(el)) add(el);
  }
  const idOf = v => { if (v && typeof v === 'object') v = v.id; return v == null ? '' : String(v).replace(/^shopify-section-/, ''); };
  function find(id) {
    if (!id) return null;
    for (const [el, st] of roots) if (el.isConnected && st.id === id) return st;
    return null;
  }
  function paint(st) { st.raf = 0; if (!st.el.isConnected) return; const T = TYPES[st.type]; if (T.paint) T.paint(st.el, st); st.dirty.clear(); }
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {};
    if (!d.settings || typeof d.settings !== 'object') return;
    scan();
    const st = find(idOf(d.section ?? d.sectionId ?? d.section_id));
    /* the settings are printed in the builder only: without them nothing is painted here and the builder's redraw shows the change */
    if (!st || !st.builder) return;
    const blockId = idOf(d.block ?? d.blockId ?? d.block_id);
    if (blockId) {
      const node = [...st.el.querySelectorAll(BSEL)].find(n => n.dataset.r7tBlock === blockId);
      if (!node) return;
      Object.assign(st.block(node), d.settings);
      st.lastBlock = blockId;
    } else Object.assign(st.s, d.settings);
    const dirty = st.dirty.get(blockId) || new Set();
    for (const k of Object.keys(d.settings)) dirty.add(k);
    st.dirty.set(blockId, dirty);
    if (!st.raf) st.raf = requestAnimationFrame(() => paint(st));
  });
  /* the builder selected a block: bring its card into view (open the wall, or move the row to it) */
  document.addEventListener('shopify:block:select', e => {
    const card = e.target && e.target.closest ? e.target.closest('[data-r7t-type="testimonial"]') : null, el = card && card.closest(SEL), st = el && roots.get(el);
    if (st && TYPES[st.type].select) TYPES[st.type].select(el, st, card);
  });
  let queued = 0;
  const later = () => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; scan(); }); };
  document.addEventListener('storelib:section-load', scan);
  document.addEventListener('shopify:section:load', scan);
  document.addEventListener('shopify:section:unload', later);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, {once: true}); else scan();
  new MutationObserver(ms => { for (const m of ms) for (const n of [...m.addedNodes, ...m.removedNodes]) if (n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))) return later(); }).observe(document.documentElement, {childList: true, subtree: true});
  window.MateriaLiveR7Testimonials = {scan, roots, TYPES, count: () => roots.size, state: el => roots.get(el)};
})();
