/* Materia Themes. Collection Circles (collection-circles) and Collection
   Mosaic (collection-mosaic). Linked by the two sections themselves.

   The row of circles is a native scroller: the finger, the trackpad and the
   Tab key move it with no script. This file adds what HTML cannot: the two
   arrows (shown on a desktop pointer only while the row is wider than the
   page, disabled at each end), the left and right arrow keys, and the row
   following a block picked in the builder. The scroll position is read in a
   passive listener, once per frame.

   Live edits (builder only: the sections print their settings as JSON there
   and nowhere else). Every root [data-r7c] carries its settings and every
   block [data-r7c-block] its own. derive() turns them into outputs (a CSS
   variable, an attribute, text, a picture), the same values the section
   prints, so on load the first derive is only recorded, never painted. After
   that an output is written only when its value changes, once per frame per
   root, so a picture never reloads and the row never jumps for an unrelated
   edit. A collection picked or a block added waits for the builder's redraw. */
(() => {
  if (window.MateriaR7Collections) return;
  const SEL = '[data-r7c]', BSEL = '[data-r7c-block]';
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = v => v !== '' && v != null && v !== false && v !== true && Number.isFinite(+v) ? +v : null;
  const px = v => { const n = num(v); return n == null ? null : n + 'px'; };
  const api = () => window.MateriaHeroImageOne;
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  /* A colour setting, or '' when it is empty, clear or not a colour (the theme's own colour then shows). */
  const color = v => {
    if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return ''; v = v.hex ?? v.value ?? v.color; }
    v = typeof v === 'string' ? v.trim() : '';
    return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : '';
  };
  /* A picture setting: an address, or an object that holds one. */
  const picture = v => {
    v = v && typeof v === 'object' ? v.src || v.url || (v.preview_image && v.preview_image.src) || v.value : v;
    if (typeof v !== 'string' || !v || v === '#') return '';
    try { return ['http:', 'https:', 'data:'].includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return ''; }
  };
  /* A font picker value: the family and its fallbacks, as the section prints them. */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    const fam = typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
    return !fam || /^var\(/.test(fam) ? '' : /,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const PH = cls => { const t = document.createElement('template'); t.innerHTML = '<svg class="' + cls + '" data-r7c-ph viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="47" cy="48" r="7" fill="currentColor"/><path d="M28 84l22-25 13 14 10-9 19 20z" fill="currentColor"/></svg>'; return t.content.firstChild; };

  /* What each section's settings turn into. px: a length variable; attrs: an attribute holding the
     value; flags: an attribute holding true or false; colors: a variable set only while Enable custom
     styling is on; fonts: the theme's own font variable, set only while Enable custom fonts is on. */
  const TYPES = {
    'collection-circles': {
      p: 'cc', media: '.cc__pic', img: 'cc__img', ph: 'cc__ph',
      px: {circle_size: 'size', gap: 'gap', font_size: 'font', circle_size_mobile: 'size-m', gap_mobile: 'gap-m', font_size_mobile: 'font-m', padding_top_desktop: 'pt', padding_bottom_desktop: 'pb', padding_top_mobile: 'pt-m', padding_bottom_mobile: 'pb-m'},
      attrs: {section_width: 'data-width', show_section_on: 'data-show-on', alignment: 'data-align', header_size: 'data-heading-size'},
      flags: {show_ring: 'data-ring', show_arrows: 'data-arrows'},
      colors: {title_color: 'title', ring_color: 'ring', image_bg: 'image-bg'},
      fonts: {heading_font: '--heading-font'},
    },
    'collection-mosaic': {
      p: 'cm', media: '.cm__media', img: 'cm__img', ph: 'cm__ph',
      px: {grid_height: 'h', gap: 'gap', font_size: 'font', tile_height_mobile: 'h-m', font_size_mobile: 'font-m', padding_top_desktop: 'pt', padding_bottom_desktop: 'pb', padding_top_mobile: 'pt-m', padding_bottom_mobile: 'pb-m'},
      attrs: {section_width: 'data-width', show_section_on: 'data-show-on', header_alignment: 'data-align', large_position: 'data-large', collection_information_position: 'data-text', mobile_layout: 'data-mobile', header_size: 'data-heading-size'},
      flags: {},
      colors: {title_color: 'title', overlay_color: 'overlay', image_bg: 'image-bg'},
      fonts: {heading_font: '--heading-font', body_font: '--body-font'},
    },
  };

  /* ---------- writers ---------- */
  function write(el, key, v, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'css') el.textContent = v;
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); if (v) el.classList.add('color-' + v); }
    else if (key === 'rich') { if (api() && api().rich) api().rich(el, v, {rich: new WeakMap()}); else el.textContent = String(v || '').replace(/<[^>]*>/g, ''); }
    else if (key === 'img') {
      /* The same <img> gets the new address; a placeholder becomes an <img>, and comes back when the picture goes. */
      const t = st.type; let img = el.querySelector('img.' + t.img); const ph = el.querySelector('[data-r7c-ph]');
      if (v) {
        if (!img) { img = document.createElement('img'); img.className = t.img; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; if (ph) ph.replaceWith(img); else el.prepend(img); }
        if (img.getAttribute('src') !== v) { img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src = v; }
      } else { if (img) img.remove(); if (!ph) el.prepend(PH(t.ph)); }
    }
  }

  /* ---------- outputs ---------- */
  function spaceCss(st) {
    const s = st.s, sel = st.wrap && /^shopify-section-/.test(st.wrap.id) ? '#' + CSS.escape(st.wrap.id) : '#shopify-section-' + CSS.escape(st.id), n = k => num(s[k]) || 0;
    return sel + '{margin-top:' + n('section_margin_top_mobile') + 'px;margin-bottom:' + n('section_margin_bottom_mobile') + 'px}@media (min-width:768px){' + sel + '{margin-top:' + n('section_margin_top_desktop') + 'px;margin-bottom:' + n('section_margin_bottom_desktop') + 'px}}'
      + (bool(s.reset_spacing) ? sel + '{margin-top:0!important;margin-bottom:0!important}' + sel + ' + .shopify-section{margin-top:0!important}' : '');
  }
  function derive(st, put) {
    const {root, s, type: t} = st, v = '--' + t.p + '-', custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
    put(root, 'scheme', (s.color_scheme && s.color_scheme.id) || s.color_scheme || '');
    put(root, '.remove_spacing', bool(s.reset_spacing));
    for (const id in t.px) put(root, v + t.px[id], px(s[id]));
    for (const id in t.attrs) put(root, '@' + t.attrs[id], s[id] == null || s[id] === '' ? null : String(s[id]));
    for (const id in t.flags) put(root, '@' + t.flags[id], bool(s[id]) ? 'true' : 'false');
    const bg = custom ? color(s.section_bg) : '';
    put(root, v + 'bg', bg || null);
    put(root, '@data-bg', !!bg);
    for (const id in t.colors) put(root, v + t.colors[id], custom ? color(s[id]) || null : null);
    let own = false;
    for (const id in t.fonts) { const f = fonts ? font(s[id]) : ''; own = own || !!f; put(root, t.fonts[id], f || null); }
    put(root, '@data-own-font', own);
    if (st.space) put(st.space, 'css', spaceCss(st));
    if (t.p === 'cm') {
      put(root, v + 'shade', num(s.image_overlay_opacity) == null ? null : String(num(s.image_overlay_opacity) / 100));
      put(root, v + 'radius', custom ? px(s.border_radius) : null);
    }
    let texts = 0;
    for (const b of st.blocks.values()) {
      const {el, s: bs, type: bt} = b;
      if (bt === 'heading' || bt === 'subheading') {
        put(el, 'rich', bs.text == null ? '' : String(bs.text));
        put(el, 'hidden', blank(bs.text));
        if (!blank(bs.text)) texts++;
        put(el, v.slice(0, -1) + 'b-color', bool(bs.enable_custom_style) ? color(bs.color) || null : null);
      } else if (bt === 'collection') {
        const src = picture(bs.image) || el.dataset.r7cOwn || '';
        const box = el.querySelector(t.media);
        if (box) put(box, 'img', src);
        if (t.p === 'cm') { put(el, '@data-nopic', !src); const c = el.querySelector('.cm__count'); if (c) put(c, 'hidden', !bool(s.show_product_count)); }
      }
    }
    if (st.header) put(st.header, 'hidden', texts === 0);
  }
  function apply(st, paint) {
    let wrote = false;
    derive(st, (el, key, value) => {
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (m.has(key) && m.get(key) === value) return;
      m.set(key, value);
      if (paint) { write(el, key, value, st); wrote = true; }
    });
    if (wrote && st.measure) st.measure();
  }
  function schedule(st) {
    if (st.frame) return;
    st.frame = requestAnimationFrame(() => { st.frame = 0; if (st.root.isConnected) apply(st, true); });
  }

  /* ---------- the row of circles ---------- */
  function scroller(st) {
    const root = st.root, track = root.querySelector('[data-r7c-track]');
    if (!track) return;
    const prev = root.querySelector('[data-r7c-prev]'), next = root.querySelector('[data-r7c-next]'), sig = {signal: st.ac.signal};
    const rtl = () => getComputedStyle(track).direction === 'rtl';
    const smooth = () => reduced.matches ? 'auto' : 'smooth';
    const step = () => { const it = track.querySelector('.cc__item'); return it ? it.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : track.clientWidth; };
    const measure = () => {
      st.queued = 0;
      if (!track.isConnected) return;
      const max = track.scrollWidth - track.clientWidth, x = Math.abs(track.scrollLeft), over = max > 1, show = over && root.dataset.arrows !== 'false';
      for (const [b, end] of [[prev, x <= 1], [next, x >= max - 1]]) {
        if (!b) continue;
        if (b.hidden !== !show) b.hidden = !show;
        if (b.disabled !== (!show || end)) b.disabled = !show || end;
      }
      /* A row that scrolls can take the keyboard itself; one that fits is not a tab stop. */
      if (over !== track.hasAttribute('tabindex')) { if (over) track.setAttribute('tabindex', '0'); else track.removeAttribute('tabindex'); }
    };
    st.measure = () => { if (!st.queued) st.queued = requestAnimationFrame(measure); };
    track.addEventListener('scroll', st.measure, {passive: true, signal: st.ac.signal});
    if ('ResizeObserver' in window) { st.ro = new ResizeObserver(st.measure); st.ro.observe(track); }
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-r7c-prev], [data-r7c-next]');
      if (!b || !root.contains(b) || b.disabled) return;
      const s = step(), edge = parseFloat(getComputedStyle(track).paddingInlineStart) || 0;
      const page = Math.max(s, Math.floor((track.clientWidth - edge * 2) / s) * s);
      track.scrollBy({left: page * (b === next ? 1 : -1) * (rtl() ? -1 : 1), behavior: smooth()});
    }, sig);
    track.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir || track.scrollWidth - track.clientWidth <= 1) return;
      e.preventDefault();
      track.scrollBy({left: step() * dir, behavior: smooth()});
      /* Focus on a circle moves with the row. */
      const link = e.target.closest ? e.target.closest('a.cc__link') : null;
      if (link) { const all = [...track.querySelectorAll('a.cc__link')], n = all[all.indexOf(link) + dir * (rtl() ? -1 : 1)]; if (n) n.focus({preventScroll: true}); }
    }, sig);
    st.reveal = el => {
      const a = el.getBoundingClientRect(), b = track.getBoundingClientRect(), edge = parseFloat(getComputedStyle(track).paddingInlineStart) || 0;
      const d = a.left < b.left + edge ? a.left - b.left - edge : a.right > b.right - edge ? a.right - b.right + edge : 0;
      if (d) track.scrollBy({left: d, behavior: smooth()});
    };
    st.measure();
  }

  /* ---------- lifecycle ---------- */
  function setup(root) {
    const type = TYPES[root.dataset.r7c];
    if (!type) return;
    const wrap = root.closest('.shopify-section') || root.parentElement;
    const st = {root, type, wrap, id: root.dataset.r7cSection || '', ac: new AbortController(), last: new WeakMap(), blocks: new Map(), frame: 0, queued: 0,
      live: root.hasAttribute('data-r7c-settings'), s: parse(root.dataset.r7cSettings), raw: root.dataset.r7cSettings};
    st.space = wrap ? wrap.querySelector('style[data-r7c-space]') : null;
    st.header = root.querySelector('.' + type.p + '__header');
    for (const el of root.querySelectorAll(BSEL)) st.blocks.set(el.dataset.r7cBlock, {el, type: el.dataset.r7cType, s: parse(el.dataset.r7cSettings)});
    roots.set(root, st);
    if (type.p === 'cc') scroller(st);
    if (st.live) {
      apply(st, false);
      /* The builder may rewrite the settings attribute itself. */
      st.mo = new MutationObserver(() => { const raw = root.dataset.r7cSettings; if (raw === st.raw) return; st.raw = raw; st.s = parse(raw); schedule(st); });
      st.mo.observe(root, {attributes: true, attributeFilter: ['data-r7c-settings']});
    }
  }
  function drop(root) {
    const st = roots.get(root);
    if (!st) return;
    st.ac.abort();
    if (st.ro) st.ro.disconnect();
    if (st.mo) st.mo.disconnect();
    if (st.frame) cancelAnimationFrame(st.frame);
    if (st.queued) cancelAnimationFrame(st.queued);
    roots.delete(root);
  }
  function scan() {
    for (const root of [...roots.keys()]) if (!root.isConnected) drop(root);
    for (const root of document.querySelectorAll(SEL)) if (!roots.has(root)) setup(root);
  }
  const ident = v => String((v && typeof v === 'object' ? v.id : v) ?? '').replace(/^shopify-section-/, '');
  function onChange(e) {
    const d = e.detail || {}, sec = ident(d.section ?? d.sectionId ?? d.section_id), blk = ident(d.block ?? d.blockId ?? d.block_id);
    if (!sec || !d.settings || typeof d.settings !== 'object') return;
    for (const st of roots.values()) {
      if (!st.live || st.id !== sec && !(st.wrap && st.wrap.id === 'shopify-section-' + sec)) continue;
      if (blk) { const b = st.blocks.get(blk); if (!b) continue; Object.assign(b.s, d.settings); } else Object.assign(st.s, d.settings);
      schedule(st);
    }
  }
  let scanFrame = 0;
  const touches = n => n.nodeType === 1 && (n.matches(SEL) || !!n.querySelector(SEL));
  new MutationObserver(records => {
    if (scanFrame) return;
    if (!records.some(r => [...r.addedNodes].some(touches) || (roots.size > 0 && [...r.removedNodes].some(touches)))) return;
    scanFrame = requestAnimationFrame(() => { scanFrame = 0; scan(); });
  }).observe(document.documentElement, {childList: true, subtree: true});
  for (const n of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(n, scan);
  document.addEventListener('storelib:settings-change', onChange);
  /* A Collection block picked in the builder is brought into view in its row. */
  document.addEventListener('shopify:block:select', e => {
    const el = e.target && e.target.closest ? e.target.closest('.cc__item') : null, root = el && el.closest(SEL), st = root && roots.get(root);
    if (st && st.reveal) st.reveal(el);
  });
  window.MateriaR7Collections = {scan, roots, count: () => roots.size};
  scan();
})();
