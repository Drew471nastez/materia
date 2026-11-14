/* Materia Themes. Recently Viewed (sections/recently-viewed.storelib) and
   Product Duo (sections/product-duo.storelib). Loaded by those sections only.

   Recently Viewed. The list is product ids in the visitor's browser
   (localStorage "materia__recently-viewed-products", newest first, 25 at
   most: the key the product page already writes; this file writes it too
   when the section sits on a product page). On a visitor's page the section
   is drawn hidden; the cards are asked for once:
     /search?q=id:<id> OR id:<id>&type=product&section_id=recently-viewed
   which answers the section drawn with search.results, so they are the
   theme's own product cards. The answer is kept for the page. No ids, no
   answer or no connection: the section stays hidden. The product being
   viewed is never in the row. In the builder nothing is asked for: the
   sample cards the section drew stay.

   The rows (Recently Viewed, and Product Duo's Swipe layout on phones) are
   native scrollers. The arrows and the arrow keys call scrollBy; the scroll
   position is read in one passive listener, once a frame.

   Live edits. Every root [data-r7k-root] carries its settings as JSON in the
   builder, every block its own. derive() turns them into outputs (a CSS
   variable, an attribute, text) per element, the same values the section
   prints, so on load the first derive is only recorded. After that an output
   is written only when its value changes, one frame per root, so a picture
   never reloads and the row keeps its place for an unrelated edit. What
   changes the cards themselves (a picked product, its picture, the button's
   action, more sample products) waits for the builder's redraw. */
(() => {
  if (window.MateriaR7Products) return;
  const SEL = '[data-r7k-root]', BSEL = '[data-r7k-block]';
  const KEY = 'materia__recently-viewed-products', MAX = 25;
  const roots = new Map();
  const touched = new WeakMap();
  const cache = new Map();
  const desktop = matchMedia('(min-width: 768px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = v => num(v) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const fontCss = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : null;
    const fam = api() && api().font ? api().font(v) : '';
    return !fam || /^var\(/.test(fam) ? null : /,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  const sectionId = v => String(v && typeof v === 'object' ? v.id || '' : v || '').replace(/^shopify-section-/, '');
  const WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width'];

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = String(value || '').replace(/<[^>]*>/g, '');
  }
  function write(el, key, v) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'width') { for (const c of WIDTHS) el.classList.remove(c); el.classList.add(v); }
  }

  /* ---------- derive ---------- */
  const custom = s => bool(s.enable_custom_style);
  const own = (on, v, f) => on ? color(v, f) : null;
  function common(c) {
    const {root, s, put, wrap, q} = c;
    const scheme = s.color_scheme && s.color_scheme.id || s.color_scheme;
    if (typeof scheme === 'string' && /^[\w-]+$/.test(scheme)) put(root, 'scheme', scheme);
    const fonts = bool(s.enable_custom_fonts);
    put(root, '--heading-font', fonts ? fontCss(s.heading_font) : null);
    put(root, '--body-font', fonts ? fontCss(s.body_font) : null);
    if (wrap) for (const side of ['top', 'bottom']) put(wrap, '!margin-' + side, px(s['section_margin_' + side + '_' + (desktop.matches ? 'desktop' : 'mobile')]));
    put(root, '.pt-min', num(s.padding_top) < 30);
    put(root, '.pb-min', num(s.padding_bottom) < 30);
    put(root, '.remove_spacing', bool(s.reset_spacing));
    put(root, '--section-pt', String(num(s.padding_top)));
    put(root, '--section-pb', String(num(s.padding_bottom)));
    put(root, '--r7k-hgap', px(s.header_spacing));
    put(root, '@data-align', s.header_alignment || 'left');
    const w = WIDTHS.includes(s.section_width) ? s.section_width : null;
    if (w) { put(root, '@data-width', w); const inner = q('[data-r7k-width]'); if (inner) put(inner, 'width', w); }
    put(root, '--r7k-bg', own(custom(s), s.section_bg_override, 'var(--color-background)'));
  }
  function textBlock(c, el, b, type) {
    const {put} = c, on = custom(b);
    put(el, type === 'eyebrow' ? 'text' : 'rich', b.text || '');
    put(el, 'hidden', blank(b.text));
    put(el, '--r7k-c', own(on, b.color, type === 'heading' ? 'var(--color-heading)' : 'var(--color-text)'));
    if (type === 'heading') { put(el, '--r7k-fs-d', px(b.size_desktop)); put(el, '--r7k-fs-m', px(b.size_mobile)); }
    else put(el, '--r7k-fs', px(b.size));
  }
  const TEXT = ['eyebrow', 'heading', 'subheading'];

  const TYPES = {
    'recently-viewed': {
      derive(c) {
        const {root, s, put, blocks, st} = c;
        common(c);
        const cols = num(s.items_per_row, 5), colsM = num(s.items_per_row_mobile, 2), gap = num(s.column_gap);
        put(root, '--rv-cols', String(cols));
        put(root, '--rv-cols-m', String(colsM));
        put(root, '--rv-gap', px(gap));
        put(root, '--rv-gap-m', px(Math.min(gap, 15)));
        put(root, '@data-arrows', bool(s.show_arrows) ? 'true' : 'false');
        put(root, '@data-progress', bool(s.show_progress) ? 'true' : 'false');
        put(root, '--r7k-ink', own(custom(s), s.arrow_color, 'var(--color-heading)'));
        put(root, '@data-rv-cols', String(cols));
        put(root, '@data-rv-cols-m', String(colsM));
        /* The sample cards: fewer show at once; more wait for the builder's redraw. */
        const limit = Math.max(1, num(s.products_to_show, 8));
        put(root, '@data-rv-limit', String(limit));
        const cards = [...root.querySelectorAll('[data-rv-card]')];
        cards.forEach((card, i) => put(card, 'hidden', i >= limit));
        counts(c, Math.min(cards.length, limit), cols, colsM);
        for (const [el, b, type] of blocks) if (TEXT.includes(type)) textBlock(c, el, b, type);
      },
    },
    'product-duo': {
      derive(c) {
        const {root, s, put, q, blocks} = c, on = custom(s), cv = v => on ? color(v, '') : '';
        common(c);
        put(root, '--duo-gap', px(s.column_gap));
        put(root, '--duo-ratio', s.image_ratio === 'portrait' ? '4 / 5' : s.image_ratio === 'landscape' ? '4 / 3' : '1 / 1');
        put(root, '--duo-title', px(s.title_size));
        put(root, '--duo-text', px(s.text_size));
        put(root, '@data-content-align', s.content_alignment || 'left');
        put(root, '@data-card', s.card_style || 'plain');
        put(root, '@data-mobile', s.mobile_layout || 'stack');
        put(root, '--duo-card-bg', own(on, s.card_bg, 'color-mix(in srgb, var(--color-heading) 5%, var(--color-background))'));
        put(root, '--duo-line', own(on, s.line_color, 'var(--color-border)'));
        put(root, '--duo-title-c', own(on, s.title_color, 'var(--color-heading)'));
        put(root, '--duo-text-c', own(on, s.text_color, 'var(--color-text)'));
        put(root, '--duo-price-c', own(on, s.price_color, 'var(--color-heading)'));
        /* Theme buttons: colours when custom styling is on, shape when Match theme button is off. */
        const bg = cv(s.button_bg), hb = cv(s.button_bg_hover);
        put(root, '--mb-bg', bg || null); put(root, '--mb-text', cv(s.button_text) || null); put(root, '--mb-border', bg || null);
        put(root, '--mb-hover-bg', hb || null); put(root, '--mb-hover-text', cv(s.button_text_hover) || null); put(root, '--mb-hover-border', hb || null);
        const shape = s.use_theme_button === false || s.use_theme_button === 'false';
        put(root, '--mb-radius', shape ? px(s.button_radius) : null);
        put(root, '--mb-padding-y', shape ? px(s.button_padding_v) : null);
        put(root, '--mb-padding-x', shape ? px(s.button_padding_h) : null);
        put(root, '--mb-font-size', shape ? px(s.button_font_size || 15) : null);
        for (const btn of root.querySelectorAll('[data-r7k-btn]')) put(btn, '@data-own-shape', shape || null);
        const grid = q('[data-r7k-track]'), word = String(s.divider_text || '').trim();
        if (grid) put(grid, '@data-or', word ? 'text' : (s.card_style || 'plain') === 'plain' ? 'line' : 'none');
        const or = q('[data-r7k-or-text]'); if (or) put(or, 'text', word);
        for (const [el, b, type] of blocks) {
          if (TEXT.includes(type)) textBlock(c, el, b, type);
          else if (type === 'point') { put(el, 'rich', b.text || ''); put(el, 'hidden', blank(b.text)); }
          else if (type === 'product') {
            const label = el.querySelector('[data-r7k-label]');
            if (label) { put(label, 'text', b.label || ''); put(label, 'hidden', !String(b.label || '').trim()); }
            const act = el.querySelector('[data-r7k-action]'), btn = el.querySelector('[data-r7k-btn]');
            if (btn) put(btn, '@data-theme-button', b.button_style === 'secondary' ? 'secondary' : 'primary');
            /* The label is the creator's only while the button opens the product page, as drawn. */
            const text = btn && btn.querySelector('[data-r7k-btn-label]'), drawn = act ? act.dataset.r7kAction : '';
            if (text && drawn !== 'cart' && b.button_action !== 'cart') { put(text, 'text', b.button_label || ''); put(btn, 'hidden', !String(b.button_label || '').trim()); }
          }
        }
      },
    },
  };

  /* Recently Viewed: how many cards show decides whether the row scrolls at each width. */
  function counts(c, count, cols, colsM) {
    const {root, put} = c, overD = count > cols, overM = count > colsM;
    put(root, '@data-over-d', overD ? 'true' : 'false');
    put(root, '@data-over-m', overM ? 'true' : 'false');
    put(root, '--rv-f-d', String(overD ? cols / count : 1));
    put(root, '--rv-f-m', String(overM ? (colsM + 0.15) / count : 1));
  }

  function derive(root, st, mode) {
    const out = [];
    const put = (el, key, value) => { if (el) out.push([el, key, value]); };
    const q = sel => { const el = root.querySelector(sel); return el && el.closest(SEL) === root ? el : null; };
    const blocks = [];
    for (const el of root.querySelectorAll(BSEL)) {
      if (el.closest(SEL) !== root) continue;
      const id = el.dataset.r7kBlock;
      if (!st.blocks.has(id)) st.blocks.set(id, {...parse(el.dataset.r7kSettings), ...(st.liveBlocks.get(id) || {})});
      blocks.push([el, st.blocks.get(id), el.dataset.r7kType]);
    }
    st.type.derive({root, st, s: st.s, put, q, blocks, wrap: st.wrap, mode});
    return out;
  }
  function paint(root, st, first) {
    for (const [el, key, v] of derive(root, st)) {
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      const val = v == null ? null : typeof v === 'boolean' ? v : String(v);
      if (m.has(key) && m.get(key) === val) continue;
      m.set(key, val);
      /* The section printed these values itself: the first pass only records them. */
      if (!first) write(el, key, v);
    }
  }

  /* ---------- the rows ---------- */
  const trackOf = root => { const t = root.querySelector('[data-r7k-track]'); return t && t.closest(SEL) === root ? t : null; };
  const rtl = el => getComputedStyle(el).direction === 'rtl';
  function scrolls(root, st) {
    if (st.name === 'recently-viewed') return root.dataset[desktop.matches ? 'overD' : 'overM'] === 'true';
    const grid = trackOf(root);
    return !desktop.matches && root.dataset.mobile === 'swipe' && !!grid && grid.dataset.count !== '1';
  }
  /* One card and its gap, and how many fit: read only on an arrow, a key or a block pick. */
  function stride(track) {
    const item = [...track.children].find(el => !el.hidden && el.offsetWidth && !el.matches('.r7duo__or'));
    if (!item) return {one: track.clientWidth, page: track.clientWidth};
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0, one = item.offsetWidth + gap;
    return {one, page: Math.max(1, Math.floor((track.clientWidth + gap) / one)) * one};
  }
  function move(track, by, to) {
    const behavior = reduced.matches ? 'auto' : 'smooth', sign = rtl(track) ? -1 : 1;
    if (to != null) track.scrollTo({left: to * sign, behavior}); else track.scrollBy({left: by * sign, behavior});
  }
  /* The scroll position: the progress line and which arrow is at its end. Reads, then writes only what changed. */
  function measure(root, st) {
    st.frame = 0;
    const track = trackOf(root); if (!track || !track.isConnected) return;
    const max = track.scrollWidth - track.clientWidth, at = Math.abs(track.scrollLeft);
    const p = max > 1 ? Math.min(1, Math.max(0, at / max)) : 0;
    const key = Math.round(p * 1000) / 1000;
    if (st.p !== key) {
      st.p = key;
      const bar = root.querySelector('[data-r7k-progress]');
      if (bar) { if (key) bar.style.setProperty('--rv-p', String(key)); else bar.style.removeProperty('--rv-p'); }
    }
    const prev = root.querySelector('[data-r7k-prev]'), next = root.querySelector('[data-r7k-next]');
    const start = at <= 1, end = max <= 1 || at >= max - 1;
    if (prev && prev.disabled !== start) prev.disabled = start;
    if (next && next.disabled !== end) next.disabled = end;
  }
  const queue = (root, st) => { if (!st.frame) st.frame = requestAnimationFrame(() => measure(root, st)); };
  /* A row that does not scroll at this width is not a tab stop. */
  function focusable(root, st) {
    const track = trackOf(root); if (!track) return;
    const on = scrolls(root, st);
    if (on && !track.hasAttribute('tabindex')) track.setAttribute('tabindex', '0');
    else if (!on && track.hasAttribute('tabindex')) track.removeAttribute('tabindex');
    if (st.name === 'product-duo') {
      if (on && !track.hasAttribute('role')) { track.setAttribute('role', 'group'); const h = root.querySelector('.r7k-heading:not([hidden])'); if (h && h.id) track.setAttribute('aria-labelledby', h.id); }
      else if (!on && track.getAttribute('role') === 'group') { track.removeAttribute('role'); track.removeAttribute('aria-labelledby'); }
    }
  }
  function bindTrack(root, st) {
    const track = trackOf(root); if (!track) return;
    track.addEventListener('scroll', () => queue(root, st), {passive: true, signal: st.ac.signal});
    if (window.ResizeObserver) { st.ro = new ResizeObserver(() => queue(root, st)); st.ro.observe(track); }
    focusable(root, st);
  }

  /* ---------- Recently Viewed: the visitor's list ---------- */
  const okId = id => /^[\w-]{1,64}$/.test(id);
  function readIds() {
    try { const v = JSON.parse(window.localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.map(String).filter(okId) : []; } catch (_) { return []; }
  }
  function record(id) {
    id = String(id || ''); if (!okId(id)) return;
    try {
      const ids = readIds();
      if (ids[0] === id) return;
      window.localStorage.setItem(KEY, JSON.stringify([id, ...ids.filter(x => x !== id)].slice(0, MAX)));
    } catch (_) {}
  }
  /* One request for a list of ids, kept for the page (a second section, a redraw and the back button reuse it). */
  function cards(url, ids) {
    const q = ids.map(id => 'id:' + id).join(' OR ');
    const href = url + (url.includes('?') ? '&' : '?') + 'q=' + encodeURIComponent(q) + '&type=product&options%5Bunavailable_products%5D=last&section_id=recently-viewed';
    if (!cache.has(href)) {
      cache.set(href, fetch(href, {credentials: 'same-origin', headers: {Accept: 'text/html'}})
        .then(r => { if (!r.ok) throw new Error('recently viewed ' + r.status); return r.text(); })
        .then(html => {
          const doc = new DOMParser().parseFromString(html, 'text/html'), found = new Map();
          for (const card of doc.querySelectorAll('[data-rv-card][data-rv-id]')) if (!found.has(card.dataset.rvId)) found.set(card.dataset.rvId, card);
          const from = doc.querySelector('[data-r7k-root="recently-viewed"]');
          return {found, sid: from ? from.dataset.r7kSection || '' : ''};
        })
        .catch(e => { cache.delete(href); throw e; }));
    }
    return cache.get(href);
  }
  /* The answer's cards carry the answer's section id in their form ids: give them this section's, so two rows never share an id. */
  const IDREFS = ['id', 'for', 'form', 'aria-controls', 'aria-labelledby', 'aria-describedby'];
  function adopt(card, from, to) {
    const node = document.importNode(card, true);
    if (from && to && from !== to) for (const el of node.querySelectorAll('[' + IDREFS.join('],[') + ']')) for (const a of IDREFS) { const v = el.getAttribute(a); if (v && v.includes(from)) el.setAttribute(a, v.split(from).join(to)); }
    return node;
  }
  function setCount(root, st, count) {
    const out = [], put = (el, key, v) => out.push([el, key, v]);
    counts({root, put}, count, num(root.dataset.rvCols, 5), num(root.dataset.rvColsM, 2));
    for (const [el, key, v] of out) write(el, key, v);
    focusable(root, st);
  }
  function hide(root, st) {
    const track = trackOf(root);
    if (track) { track.replaceChildren(); track.removeAttribute('aria-busy'); }
    root.hidden = true;
  }
  function load(root, st) {
    const track = trackOf(root); if (!track) return;
    const current = root.dataset.rvCurrent || '', limit = Math.max(1, num(root.dataset.rvLimit, 8));
    const ids = readIds().filter(id => id !== current).slice(0, limit), key = ids.join(',');
    if (st.listKey === key) return;
    st.listKey = key;
    if (!ids.length) { hide(root, st); return; }
    /* Hold the row's place while the cards are on their way. */
    if (!track.querySelector('[data-rv-card]')) {
      const ghosts = ids.map(() => { const li = document.createElement('li'); li.className = 'r7rv__item r7rv__ghost'; li.setAttribute('aria-hidden', 'true'); return li; });
      track.replaceChildren(...ghosts);
    }
    track.setAttribute('aria-busy', 'true');
    setCount(root, st, ids.length);
    root.hidden = false;
    cards(root.dataset.rvUrl || '/search', ids).then(({found, sid}) => {
      if (st.listKey !== key || !root.isConnected) return;
      const mine = root.dataset.r7kSection || '', list = [];
      for (const id of ids) if (found.has(id)) list.push(adopt(found.get(id), sid, mine));
      if (!list.length) { hide(root, st); return; }
      track.replaceChildren(...list);
      track.removeAttribute('aria-busy');
      track.scrollLeft = 0;
      setCount(root, st, list.length);
      queue(root, st);
      if (!reduced.matches && typeof track.animate === 'function') track.animate([{opacity: 0}, {opacity: 1}], {duration: 260, easing: 'ease-out'});
      /* The theme's own card set-up: lazy pictures and the wishlist hearts. */
      for (const fn of [() => window.initLazyloadItem && window.initLazyloadItem(), () => window.BlsLazyloadImg && window.BlsLazyloadImg.init && window.BlsLazyloadImg.init(), () => window.MateriaWishlist && window.MateriaWishlist.sync && window.MateriaWishlist.sync(root)]) { try { fn(); } catch (_) {} }
    }).catch(error => {
      if (st.listKey !== key || !root.isConnected) return;
      console.warn('[recently viewed] could not load the products', error);
      hide(root, st);
      st.listKey = null;
      /* The list is still there: draw it when the connection is back. */
      window.addEventListener('online', () => { if (roots.get(root) === st) load(root, st); }, {once: true, signal: st.ac.signal});
    });
  }
  const waiting = root => root.dataset.r7kRoot === 'recently-viewed' && root.dataset.rvState === 'wait';
  const reload = () => { for (const [root, st] of roots) if (waiting(root)) load(root, st); };

  /* ---------- lifecycle ---------- */
  function init(root) {
    const name = root.dataset.r7kRoot, type = TYPES[name]; if (!type) return;
    const raw = root.dataset.r7kSettings || '';
    const st = {name, type, root, raw, live: {}, liveBlocks: new Map(), blocks: new Map(), last: new Map(), s: raw ? parse(raw) : null, wrap: root.closest('.shopify-section'), ac: new AbortController(), frame: 0, paintFrame: 0, p: 0};
    st.schedule = () => { if (!st.s || st.paintFrame) return; st.paintFrame = requestAnimationFrame(() => { st.paintFrame = 0; if (root.isConnected) { paint(root, st, false); focusable(root, st); queue(root, st); } }); };
    roots.set(root, st);
    if (st.s) paint(root, st, true);
    bindTrack(root, st);
    if (waiting(root)) { record(root.dataset.rvCurrent); load(root, st); }
  }
  function drop(root, st) {
    st.ac.abort();
    if (st.ro) st.ro.disconnect();
    if (st.frame) cancelAnimationFrame(st.frame);
    if (st.paintFrame) cancelAnimationFrame(st.paintFrame);
    if (st.wrap && st.wrap.isConnected) { const set = touched.get(st.wrap); if (set) for (const k of set) st.wrap.style.removeProperty(k); }
    roots.delete(root);
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll(SEL)) {
      const st = roots.get(root);
      if (!st) { init(root); continue; }
      /* The builder wrote new settings on the same element. */
      const raw = root.dataset.r7kSettings || '';
      let changed = raw !== st.raw;
      if (changed) { st.raw = raw; st.s = raw ? {...parse(raw), ...st.live} : null; }
      for (const el of root.querySelectorAll(BSEL)) {
        const id = el.dataset.r7kBlock, b = el.dataset.r7kSettings || '';
        if (el.__r7kRaw !== undefined && el.__r7kRaw !== b) { st.blocks.set(id, {...parse(b), ...(st.liveBlocks.get(id) || {})}); changed = true; }
        el.__r7kRaw = b;
      }
      if (changed) st.schedule();
    }
  }

  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId || d.section_id); if (!id || !d.settings) return;
    const bRaw = d.block || d.blockId || d.block_id, bid = bRaw ? String(bRaw.id || bRaw) : '';
    for (const [root, st] of roots) {
      if (root.dataset.r7kSection !== id || !st.s) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); if (st.blocks.has(bid)) st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest && e.target.closest('[data-r7k-prev],[data-r7k-next]'); if (!btn || btn.disabled) return;
    const root = btn.closest(SEL), track = root && roots.has(root) ? trackOf(root) : null; if (!track) return;
    move(track, stride(track).page * (btn.matches('[data-r7k-next]') ? 1 : -1));
  });
  /* The arrow keys move a focused row by one card; Home and End go to its ends. */
  document.addEventListener('keydown', e => {
    const track = e.target; if (!track || !track.matches || !track.matches('[data-r7k-track]') || e.altKey || e.ctrlKey || e.metaKey) return;
    const root = track.closest(SEL), st = roots.get(root); if (!st || !scrolls(root, st)) return;
    const flip = rtl(track) ? -1 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(track, stride(track).one * (e.key === 'ArrowRight' ? 1 : -1) * flip); }
    else if (e.key === 'Home') { e.preventDefault(); move(track, 0, 0); }
    else if (e.key === 'End') { e.preventDefault(); move(track, 0, track.scrollWidth); }
  });
  /* The builder picked a block: bring its card into view in a row that scrolls. */
  document.addEventListener('shopify:block:select', e => {
    const d = e.detail || {}, id = d.blockId || d.block_id || '';
    let el = e.target && e.target.closest ? e.target.closest(BSEL) : null;
    if (!el && id) el = document.querySelector('[data-r7k-block="' + CSS.escape(String(id)) + '"]');
    const root = el && el.closest(SEL), st = root && roots.get(root); if (!st || !scrolls(root, st)) return;
    const track = trackOf(root), card = el.closest('.r7duo__card, .r7rv__item'); if (!track || !card || !track.contains(card)) return;
    move(track, 0, Math.max(0, Math.abs(card.offsetLeft - track.offsetLeft) - (parseFloat(getComputedStyle(track).paddingLeft) || 0)));
  });
  const onWidth = () => { for (const [root, st] of roots) { if (st.s) st.schedule(); else { focusable(root, st); queue(root, st); } } };
  if (desktop.addEventListener) desktop.addEventListener('change', onWidth); else if (desktop.addListener) desktop.addListener(onWidth);
  /* The list changed in another tab, or the page came back from the back/forward cache. */
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) reload(); });
  window.addEventListener('pageshow', e => { if (e.persisted) reload(); });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',' + BSEL) || n.querySelector(SEL + ',' + BSEL));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',' + BSEL) : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-r7k-settings']});

  /* Test helper: outputs whose markup differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised']; if (!st.s) return [];
    const bad = [], norm = v => String(v).replace(/\s+/g, ' ').trim().toLowerCase();
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = norm(el.style.getPropertyValue(key)); want = v == null ? '' : norm(v); if (have !== want && Number.isFinite(+have) && Number.isFinite(+want) && Math.abs(+have - +want) < 1e-6) continue; }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key[0] === '.') { have = el.classList.contains(key.slice(1)); want = !!v; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'text') { have = el.textContent.trim(); want = String(v == null ? '' : v).trim(); }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'width') { have = el.classList.contains(v); want = true; }
      else continue;
      if (have !== want) bad.push((el.dataset.r7kBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaR7Products = {scan, audit, roots, readIds, record, reload, key: KEY};
  scan();
})();
