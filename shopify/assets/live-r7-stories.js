/* Materia Themes. Blog Spotlight (blog-featured-list) and Card Slideshow
   (slideshow-cards). Linked by the two sections themselves; nothing runs for
   a page that has neither.

   Card Slideshow: the row is a native scroller, so the finger, the trackpad
   and the Tab key move it and it snaps to a card with no script. This file
   adds what HTML cannot: the two arrows (shown on a desktop pointer once the
   row is wider than the page, disabled at each end), the dots (one for each
   place the row can rest, the current one marked), the left and right arrow
   keys on the focused row, and autoplay. Autoplay moves one card at a time
   and waits while the row is off screen, the tab is hidden, a pointer is over
   it, focus is in it or a finger is on it, and never runs under reduced
   motion. The scroll position is read in a passive listener, once a frame.

   Live edits (builder only: the sections print their settings as JSON there
   and nowhere else). Every root [data-r7s] carries its settings and every
   block [data-r7s-block] its own. derive() turns them into outputs (a CSS
   variable, an attribute, words, a picture, a link), the same values the
   section prints, so on load the first derive is only recorded, never
   painted. After that an output is written only when its value changes, once
   per frame per root: a picture never reloads and the row never jumps for an
   unrelated edit. A blog, post or count picked, or a block added, waits for
   the builder's redraw (storelib:section-load), which sets the root up again
   once. */
(() => {
  if (window.MateriaR7Stories) return;
  const SEL = '[data-r7s]', BSEL = '[data-r7s-block]';
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = v => v !== '' && v != null && v !== false && v !== true && Number.isFinite(+v) ? +v : null;
  const api = () => window.MateriaHeroImageOne;
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  const trim = v => String(v == null ? '' : v).trim();
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
  /* A link setting: an address that is not script. */
  const link = v => { v = v && typeof v === 'object' ? v.url || v.href || '' : v; v = typeof v === 'string' ? v.trim() : ''; return /^\s*(javascript|data|vbscript):/i.test(v) ? '' : v; };
  /* A font picker value: the family and its fallbacks, as the section prints them. */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    const fam = typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
    return !fam || /^var\(/.test(fam) ? '' : /,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const PH = {
    sc: '<svg class="sc__ph" data-r7s-ph viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><circle cx="50" cy="62" r="6" fill="currentColor"/><path d="M34 92l18-21 11 12 8-7 17 16z" fill="currentColor"/></svg>',
  };
  const fromHTML = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content.firstChild; };

  /* What each section's settings turn into. vars: a variable holding the number (unit added);
     attrs: an attribute holding the value (or its default); flags: an attribute holding true or false. */
  const TYPES = {
    'blog-featured-list': {
      p: 'bfl',
      vars: {padding_top: ['pt', ''], padding_bottom: ['pb', ''], padding_top_mobile: ['pt-m', ''], padding_bottom_mobile: ['pb-m', '']},
      attrs: {section_width: ['data-width', 'fluid_container'], featured_position: ['data-feature', 'left'], image_ratio: ['data-ratio', 'landscape'], title_size: ['data-title-size', 'medium']},
      flags: {show_date: 'data-date', show_excerpt: 'data-excerpt', show_list_images: 'data-thumbs'},
    },
    'slideshow-cards': {
      p: 'sc',
      vars: {card_width: ['w', '%'], card_width_mobile: ['w-m', '%'], gap: ['gap', 'px'], gap_mobile: ['gap-m', 'px'], padding_top: ['pt', ''], padding_bottom: ['pb', ''], padding_top_mobile: ['pt-m', ''], padding_bottom_mobile: ['pb-m', '']},
      attrs: {section_width: ['data-width', 'fluid_container'], card_style: ['data-style', 'overlay'], image_ratio: ['data-ratio', 'portrait'], heading_size: ['data-heading-size', 'medium']},
      flags: {show_arrows: 'data-arrows', show_dots: 'data-dots', autoplay: 'data-autoplay'},
    },
  };

  /* ---------- writers ---------- */
  const swapTag = (el, tag) => {
    const n = document.createElement(tag);
    for (const a of el.attributes) if (a.name !== 'href' && a.name !== 'type') n.setAttribute(a.name, a.value);
    if (tag === 'button') n.type = 'button';
    n.append(...el.childNodes);
    el.replaceWith(n);
    return n;
  };
  function write(el, key, v, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'css') el.textContent = v;
    else if (key === 'text') el.textContent = v;
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); if (v) el.classList.add('color-' + v); }
    else if (key === 'rich') { if (api() && api().rich) api().rich(el, v, {rich: new WeakMap()}); else el.textContent = String(v || '').replace(/<[^>]*>/g, ''); }
    else if (key === 'link') {
      /* A button with a link is a link; with none it is a button. */
      let b = el;
      if (v) { if (b.tagName !== 'A') b = swapTag(b, 'a'); if (b.getAttribute('href') !== v) b.setAttribute('href', v); }
      else if (b.tagName === 'A') swapTag(b, 'button');
    }
    else if (key === 'href') { if (v) { if (el.getAttribute('href') !== v) el.setAttribute('href', v); } else el.removeAttribute('href'); }
    else if (key === 'img') {
      /* The same <img> gets the new address; a placeholder becomes an <img>, and comes back when the picture goes. */
      const cls = st.type.p + '__img'; let img = el.querySelector('img.' + cls); const ph = el.querySelector('[data-r7s-ph]');
      if (v) {
        if (!img) { img = document.createElement('img'); img.className = cls; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; if (ph) ph.replaceWith(img); else el.prepend(img); }
        if (img.getAttribute('src') !== v) { img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src = v; }
      } else { if (img) img.remove(); if (!ph && PH[st.type.p]) el.prepend(fromHTML(PH[st.type.p])); }
    }
  }

  /* ---------- outputs ---------- */
  function spaceCss(st) {
    const s = st.s, sel = st.wrap && /^shopify-section-/.test(st.wrap.id) ? '#' + CSS.escape(st.wrap.id) : '#shopify-section-' + CSS.escape(st.id), n = k => num(s[k]) || 0;
    return sel + '{margin-top:' + n('section_margin_top_mobile') + 'px;margin-bottom:' + n('section_margin_bottom_mobile') + 'px}@media (min-width:768px){' + sel + '{margin-top:' + n('section_margin_top_desktop') + 'px;margin-bottom:' + n('section_margin_bottom_desktop') + 'px}}'
      + (bool(s.reset_spacing) ? sel + '{margin-top:0!important;margin-bottom:0!important}' + sel + ' + .shopify-section{margin-top:0!important}' : '');
  }
  function common(st, put) {
    const {root, s, type: t} = st, v = '--' + t.p + '-';
    put(root, 'scheme', (s.color_scheme && s.color_scheme.id) || s.color_scheme || '');
    put(root, '.remove_spacing', bool(s.reset_spacing));
    for (const id in t.vars) { const [name, unit] = t.vars[id], n = num(s[id]); put(root, v + name, n == null ? null : n + unit); }
    for (const id in t.attrs) { const [name, d] = t.attrs[id]; put(root, '@' + name, s[id] == null || s[id] === '' ? d : String(s[id])); }
    for (const id in t.flags) put(root, '@' + t.flags[id], bool(s[id]) ? 'true' : 'false');
    const fonts = bool(s.enable_custom_fonts), hf = fonts ? font(s.heading_font) : '', bf = fonts ? font(s.body_font) : '';
    put(root, '--heading-font', hf || null);
    put(root, '--body-font', bf || null);
    put(root, '@data-own-font', !!(hf || bf));
    if (st.space) put(st.space, 'css', spaceCss(st));
  }
  function deriveBlog(st, put) {
    const {root, s} = st, custom = bool(s.enable_custom_style);
    const C = {heading_color: ['heading', 'var(--color-heading)'], text_color: ['text', 'var(--color-text)'], title_color: ['title', 'var(--color-heading)'], meta_color: ['meta', 'color-mix(in srgb, var(--color-text) 80%, var(--color-background))'], border_color: ['border', 'var(--color-border)']};
    for (const id in C) put(root, '--bfl-' + C[id][0], custom ? color(s[id]) || C[id][1] : null);
    const read = trim(s.button_label);
    for (const el of root.querySelectorAll('[data-r7s-read]')) { put(el, 'text', read); put(el, 'hidden', !read); }
    const href = link(s.view_all_link) || root.dataset.r7sBlogUrl || '', showAll = bool(s.show_view_all) && !!href;
    const all = root.querySelector('[data-r7s-all]');
    if (all) { put(all, 'text', trim(s.view_all_label) || root.dataset.r7sAllDefault || 'View all'); put(all, 'href', href); put(all, 'hidden', !showAll); }
    let words = 0;
    for (const b of st.blocks.values()) {
      const {el, s: bs, type} = b, key = type === 'heading' ? 'heading' : 'text';
      put(el, 'rich', bs[key] == null ? '' : String(bs[key]));
      put(el, 'hidden', blank(bs[key]));
      if (!blank(bs[key])) words++;
      put(el, '--bfl-b-color', bool(bs.enable_custom_style) ? color(bs.color) || (type === 'heading' ? 'var(--color-heading)' : 'var(--color-text)') : null);
    }
    const header = root.querySelector('[data-r7s-header]');
    if (header) put(header, 'hidden', words === 0 && !showAll);
  }
  function deriveCards(st, put) {
    const {root, s} = st, custom = bool(s.enable_custom_style), o = num(s.overlay_opacity);
    put(root, '--sc-shade', o == null ? null : String(o / 100));
    put(root, '--sc-ink', custom ? color(s.text_color) || null : null);
    put(root, '--sc-shade-color', custom ? color(s.overlay_color) || null : null);
    const bg = custom && (s.card_style || 'overlay') === 'below' ? color(s.card_bg) : '';
    put(root, '--sc-card-bg', bg || null);
    put(root, '@data-card-bg', !!bg);
    put(root, '@data-speed', String(num(s.autorotate_speed) || 5));
    let label = '';
    for (const b of st.blocks.values()) {
      const {el, s: bs, type} = b;
      if (type === 'heading') {
        put(el, 'rich', bs.heading == null ? '' : String(bs.heading));
        put(el, 'hidden', blank(bs.heading));
        if (!blank(bs.heading)) label = String(bs.heading).replace(/<[^>]*>/g, '').trim();
        put(el, '--sc-b-color', bool(bs.enable_custom_style) ? color(bs.color) || 'var(--color-heading)' : null);
      } else if (type === 'card') {
        const media = el.querySelector('.sc__media'), title = el.querySelector('.sc__title'), text = el.querySelector('.sc__text'), btn = el.querySelector('.sc__btn');
        if (media) put(media, 'img', picture(bs.image));
        if (title) { put(title, 'rich', bs.heading == null ? '' : String(bs.heading)); put(title, 'hidden', blank(bs.heading)); }
        if (text) { put(text, 'rich', bs.text == null ? '' : String(bs.text)); put(text, 'hidden', blank(bs.text)); }
        if (btn) { put(btn, 'text', trim(bs.button_label)); put(btn, 'hidden', !trim(bs.button_label)); put(btn, 'link', link(bs.button_link)); }
      }
    }
    if (st.track) put(st.track, '@aria-label', label || 'Cards');
  }
  function apply(st, paint) {
    let wrote = false;
    const put = (el, key, value) => {
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (m.has(key) && m.get(key) === value) return;
      m.set(key, value);
      if (paint) { write(el, key, value, st); wrote = true; }
    };
    common(st, put);
    if (st.type.p === 'bfl') deriveBlog(st, put); else deriveCards(st, put);
    if (wrote && st.after) st.after();
  }
  function schedule(st) {
    if (st.frame) return;
    st.frame = requestAnimationFrame(() => { st.frame = 0; if (st.root.isConnected) apply(st, true); });
  }

  /* ---------- Card Slideshow: the row, arrows, dots, keys and autoplay ---------- */
  function slider(st) {
    const root = st.root, track = root.querySelector('[data-r7s-track]');
    if (!track) return;
    st.track = track;
    const sig = {signal: st.ac.signal}, passive = {passive: true, signal: st.ac.signal};
    const prev = () => root.querySelector('[data-r7s-prev]'), next = () => root.querySelector('[data-r7s-next]');
    const smooth = () => reduced.matches ? 'auto' : 'smooth';
    const max = () => Math.max(0, track.scrollWidth - track.clientWidth);
    /* Where the row can rest: each card's start, the last ones folded into the end of the row. */
    const stops = () => {
      const m = max(), box = track.getBoundingClientRect(), edge = parseFloat(getComputedStyle(track).paddingInlineStart) || 0, x = track.scrollLeft, out = [];
      for (const it of track.querySelectorAll(':scope > .sc__card')) {
        const p = Math.round(Math.min(m, Math.max(0, it.getBoundingClientRect().left - box.left + x - edge)));
        if (!out.length || p > out[out.length - 1] + 1) out.push(p);
      }
      return out.length ? out : [0];
    };
    const nearest = (list, x) => list.reduce((b, p, i) => Math.abs(p - x) < Math.abs(list[b] - x) ? i : b, 0);
    const go = left => { track.scrollTo({left, behavior: smooth()}); };
    const step = dir => { const list = stops(), x = track.scrollLeft; const to = dir > 0 ? list.find(p => p > x + 2) : [...list].reverse().find(p => p < x - 2); if (to != null) go(to); return to != null; };
    const measure = () => {
      st.queued = 0;
      if (!track.isConnected) return;
      const m = max(), x = track.scrollLeft, over = m > 1, list = stops();
      if (root.getAttribute('data-over') !== String(over)) root.setAttribute('data-over', String(over));
      const p = prev(), n = next();
      if (p && p.disabled !== (!over || x <= 1)) p.disabled = !over || x <= 1;
      if (n && n.disabled !== (!over || x >= m - 1)) n.disabled = !over || x >= m - 1;
      /* A row that scrolls takes the keyboard itself; one that fits is not a tab stop. */
      if (over !== track.hasAttribute('tabindex')) { if (over) track.setAttribute('tabindex', '0'); else track.removeAttribute('tabindex'); }
      const at = x >= m - 1 && over ? list.length - 1 : nearest(list, x);
      const dots = root.querySelectorAll('[data-r7s-dot]');
      dots.forEach((d, i) => {
        const hide = list.length < 2 || i >= list.length;
        if (d.hidden !== hide) d.hidden = hide;
        const cur = String(i === at);
        if (d.getAttribute('aria-current') !== cur) d.setAttribute('aria-current', cur);
      });
      arm();
    };
    st.after = st.measure = () => { if (!st.queued) st.queued = requestAnimationFrame(measure); };
    track.addEventListener('scroll', st.measure, passive);
    if ('ResizeObserver' in window) { st.ro = new ResizeObserver(st.measure); st.ro.observe(track); }
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-r7s-prev], [data-r7s-next], [data-r7s-dot]');
      if (!b || !root.contains(b) || b.disabled) return;
      if (b.hasAttribute('data-r7s-dot')) { const list = stops(), i = Math.min(+b.getAttribute('data-r7s-dot') || 0, list.length - 1); go(list[i]); }
      else step(b.hasAttribute('data-r7s-next') ? 1 : -1);
    }, sig);
    track.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.target !== track) return;
      const rtl = getComputedStyle(track).direction === 'rtl';
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir || max() <= 1) return;
      e.preventDefault();
      step(rtl ? -dir : dir);
    }, sig);

    /* Autoplay: one card at a time, from the end back to the start. */
    const play = st.play = {hover: false, focus: false, touch: false, seen: false, timer: 0};
    const allowed = () => root.getAttribute('data-autoplay') === 'true' && !reduced.matches && !document.hidden && play.seen && !play.hover && !play.focus && !play.touch && !st.picked && max() > 1;
    const arm = st.arm = () => {
      clearTimeout(play.timer); play.timer = 0;
      if (!allowed()) return;
      play.timer = setTimeout(() => {
        play.timer = 0;
        if (!allowed() || !track.isConnected) return;
        if (track.scrollLeft >= max() - 1) go(0); else step(1);
        arm();
      }, (num(root.getAttribute('data-speed')) || 5) * 1000);
    };
    root.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { play.hover = true; arm(); } }, passive);
    root.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { play.hover = false; arm(); } }, passive);
    root.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { play.touch = true; arm(); } }, passive);
    const lift = e => { if (play.touch && e.pointerType !== 'mouse') { play.touch = false; arm(); } };
    document.addEventListener('pointerup', lift, passive);
    document.addEventListener('pointercancel', lift, passive);
    root.addEventListener('focusin', () => { play.focus = true; arm(); }, sig);
    root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget)) { play.focus = false; arm(); } }, sig);
    if ('IntersectionObserver' in window) {
      st.io = new IntersectionObserver(entries => { play.seen = entries[entries.length - 1].isIntersecting; arm(); }, {threshold: 0.25});
      st.io.observe(track);
    } else play.seen = true;
    /* A card picked in the builder is brought into view and the row holds still while it is picked. */
    st.pick = (el, on) => {
      st.picked = on;
      if (on && el) { const list = stops(), cards = [...track.querySelectorAll(':scope > .sc__card')], i = cards.indexOf(el); if (i >= 0) go(list[Math.min(i, list.length - 1)]); }
      arm();
    };
    st.measure();
  }

  /* ---------- lifecycle ---------- */
  function setup(root) {
    const type = TYPES[root.dataset.r7s];
    if (!type) return;
    const wrap = root.closest('.shopify-section') || root.parentElement;
    const st = {root, type, wrap, id: root.dataset.r7sSection || '', ac: new AbortController(), last: new WeakMap(), blocks: new Map(), frame: 0, queued: 0,
      live: root.hasAttribute('data-r7s-settings'), s: parse(root.dataset.r7sSettings), raw: root.dataset.r7sSettings};
    st.space = wrap ? wrap.querySelector('style[data-r7s-space]') : null;
    for (const el of root.querySelectorAll(BSEL)) st.blocks.set(el.dataset.r7sBlock, {el, type: el.dataset.r7sType, s: parse(el.dataset.r7sSettings)});
    roots.set(root, st);
    if (type.p === 'sc') slider(st);
    if (st.live) {
      apply(st, false);
      /* The builder may rewrite the settings attribute itself. */
      st.mo = new MutationObserver(() => { const raw = root.dataset.r7sSettings; if (raw === st.raw) return; st.raw = raw; st.s = parse(raw); schedule(st); });
      st.mo.observe(root, {attributes: true, attributeFilter: ['data-r7s-settings']});
    }
  }
  function drop(root) {
    const st = roots.get(root);
    if (!st) return;
    st.ac.abort();
    if (st.ro) st.ro.disconnect();
    if (st.io) st.io.disconnect();
    if (st.mo) st.mo.disconnect();
    if (st.play) clearTimeout(st.play.timer);
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
  const all = fn => () => { for (const st of roots.values()) if (st.arm) fn(st); };
  let scanFrame = 0;
  const touches = n => n.nodeType === 1 && (n.matches(SEL) || !!n.querySelector(SEL));
  new MutationObserver(records => {
    if (scanFrame) return;
    if (!records.some(r => [...r.addedNodes].some(touches) || (roots.size > 0 && [...r.removedNodes].some(touches)))) return;
    scanFrame = requestAnimationFrame(() => { scanFrame = 0; scan(); });
  }).observe(document.documentElement, {childList: true, subtree: true});
  for (const n of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(n, scan);
  document.addEventListener('storelib:settings-change', onChange);
  document.addEventListener('visibilitychange', all(st => st.arm()));
  if (reduced.addEventListener) reduced.addEventListener('change', all(st => st.arm()));
  const picked = (e, on) => {
    const el = e.target && e.target.closest ? e.target.closest('.sc__card') : null, root = el && el.closest(SEL), st = root && roots.get(root);
    if (st && st.pick) st.pick(el, on);
  };
  document.addEventListener('shopify:block:select', e => picked(e, true));
  document.addEventListener('shopify:block:deselect', e => picked(e, false));
  window.MateriaR7Stories = {scan, roots, count: () => roots.size};
  scan();
})();
