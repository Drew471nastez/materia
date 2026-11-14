/* Materia Themes. Logo Wall (logo-grid-heading) and Press Mentions
   (press-mentions), Logos and trust, round 7. Linked by the two sections.

   Nothing here is needed to see either section: the wall is a wrapping
   grid, the mentions a list or cards, all drawn by the section. On a phone
   the Press Mentions cards can be a native scroller (the finger moves it,
   the browser snaps it); this file adds the left and right arrow keys on
   it, makes it a tab stop only while it is wider than the screen, and
   brings a block picked in the builder into view. The scroll position is
   read in a passive listener, once per frame.

   Live edits (builder only: the sections print their settings as JSON
   there and nowhere else). Every root [data-r7g] carries its settings and
   every block [data-r7g-block] its own. derive() turns them into outputs (a
   CSS variable, an attribute, text, a picture), the same values the
   section prints, so on load the first derive is only recorded, never
   painted. After that an output is written only when its value changes,
   once per frame per root: a logo never reloads and the row never jumps
   for an unrelated edit. A block added waits for the builder's redraw. */
(() => {
  if (window.MateriaR7Trust) return;
  const SEL = '[data-r7g]', BSEL = '[data-r7g-block]';
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = v => v !== '' && v != null && v !== false && v !== true && Number.isFinite(+v) ? +v : null;
  const px = v => { const n = num(v); return n == null ? null : n + 'px'; };
  const api = () => window.MateriaHeroImageOne;
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  const plain = v => String(v == null ? '' : v);
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
  /* A link setting: an address the page can follow, or '' for none. */
  const link = v => {
    v = v && typeof v === 'object' ? v.url || v.href || '' : v;
    v = typeof v === 'string' ? v.trim() : '';
    if (!v) return '';
    try { return /^(https?:|mailto:|tel:)$/.test(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return ''; }
  };
  /* A font picker value: the family and its fallbacks, as the section prints them. */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    const fam = typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
    return !fam || /^var\(/.test(fam) ? '' : /,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* What each section's settings turn into. px: a length variable; count: a plain number variable;
     attrs: an attribute holding the value; colors: a variable set only while Enable custom styling is
     on; fonts: the theme's own font variable, set only while Enable custom fonts is on. */
  const TYPES = {
    'logo-grid-heading': {
      p: 'lw',
      px: {logo_height: 'h', logo_height_mobile: 'h-m', padding_top: 'pt', padding_bottom: 'pb', padding_top_mobile: 'pt-m', padding_bottom_mobile: 'pb-m'},
      count: {columns: 'cols', columns_mobile: 'cols-m'},
      attrs: {section_width: 'data-width', alignment: 'data-align', tile_style: 'data-tiles', logo_style: 'data-style'},
      colors: {line_color: ['line', 'var(--color-border)'], tile_bg: ['tile', 'color-mix(in srgb, var(--color-text) 7%, var(--color-background))']},
    },
    'press-mentions': {
      p: 'pm',
      px: {logo_height: 'h', logo_height_mobile: 'h-m', title_size: 'ts', title_size_mobile: 'ts-m', padding_top: 'pt', padding_bottom: 'pb', padding_top_mobile: 'pt-m', padding_bottom_mobile: 'pb-m'},
      count: {columns: 'cols'},
      attrs: {section_width: 'data-width', alignment: 'data-align', layout: 'data-layout', mobile_layout: 'data-mobile', logo_style: 'data-style'},
      colors: {title_color: ['title', 'var(--color-heading)'], line_color: ['line', 'var(--color-border)'], card_bg: ['card', 'transparent']},
    },
  };
  const FONTS = {heading_font: '--heading-font', body_font: '--body-font'};

  /* ---------- writers ---------- */
  function placeholder(st) {
    const t = st.root.querySelector('template[data-r7g-ph]');
    return t && t.content.firstElementChild ? t.content.firstElementChild.cloneNode(true) : document.createElement('span');
  }
  function write(el, key, v, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'css' || key === 'text') el.textContent = v == null ? '' : v;
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); if (v) el.classList.add('color-' + v); }
    else if (key === 'rich') { if (api() && api().rich) api().rich(el, v, {rich: new WeakMap()}); else el.textContent = String(v || '').replace(/<[^>]*>/g, ''); }
    else if (key === 'logo') {
      /* The logo box holds one of: the picture, the name in letters, or the theme's placeholder.
         The same <img> gets a new address, so an unchanged logo is never loaded again. */
      const {src, alt, name, cls} = JSON.parse(v);
      const cur = el.querySelector(':scope > img, :scope > .pm__name, :scope > svg, :scope > span');
      if (src) {
        let img = cur && cur.tagName === 'IMG' ? cur : null;
        if (!img) { img = document.createElement('img'); img.className = cls; img.loading = 'lazy'; img.decoding = 'async'; if (cur) cur.replaceWith(img); else el.prepend(img); }
        if (img.getAttribute('src') !== src) { img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.removeAttribute('width'); img.removeAttribute('height'); img.src = src; }
        if (img.getAttribute('alt') !== alt) img.setAttribute('alt', alt);
      } else if (name) {
        let n = cur && cur.classList && cur.classList.contains('pm__name') ? cur : null;
        if (!n) { n = document.createElement('span'); n.className = 'pm__name'; if (cur) cur.replaceWith(n); else el.prepend(n); }
        if (n.textContent !== name) n.textContent = name;
      } else if (!cur || cur.tagName === 'IMG' || (cur.classList && cur.classList.contains('pm__name'))) {
        const ph = placeholder(st);
        if (cur) cur.replaceWith(ph); else el.prepend(ph);
      }
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
    for (const id in t.count) { const n = num(s[id]); put(root, v + t.count[id], n == null ? null : String(n)); }
    for (const id in t.attrs) put(root, '@' + t.attrs[id], s[id] == null || s[id] === '' ? null : String(s[id]));
    const bg = custom ? color(s.section_bg) : '';
    put(root, v + 'bg', bg || null);
    put(root, '@data-bg', !!bg);
    for (const id in t.colors) put(root, v + t.colors[id][0], custom ? color(s[id]) || t.colors[id][1] : null);
    let own = false;
    for (const id in FONTS) { const f = fonts ? font(s[id]) : ''; own = own || !!f; put(root, FONTS[id], f || null); }
    put(root, '@data-own-font', own);
    if (st.space) put(st.space, 'css', spaceCss(st));
    const label = plain(s.link_label).trim();
    for (const b of st.blocks.values()) {
      const {el, s: bs, type: bt} = b;
      if (bt === 'heading' || bt === 'subheading') {
        put(el, 'rich', plain(bs.text));
        put(el, 'hidden', blank(bs.text));
        put(el, '--b-c', bool(bs.enable_custom_style) ? color(bs.color) || null : null);
        put(el, '--b-fs-m', px(bs.size_mobile));
        put(el, '--b-fs-d', px(bs.size_desktop));
      } else if (bt === 'logo') {
        const tile = el.querySelector('.lw__tile');
        if (!tile) continue;
        put(tile, '@href', link(bs.url) || null);
        const src = picture(bs.logo), alt = plain(bs.alt).trim() || el.dataset.r7gOwnAlt || '';
        put(tile, 'logo', JSON.stringify({src, alt, name: '', cls: 'lw__img'}));
      } else if (bt === 'mention') {
        const a = el.querySelector('.pm__link');
        if (!a) continue;
        put(a, '@href', link(bs.url) || null);
        const pub = plain(bs.publication).trim();
        put(el.querySelector('.pm__logo'), 'logo', JSON.stringify({src: picture(bs.logo), alt: pub, name: pub, cls: 'pm__img'}));
        const title = el.querySelector('.pm__title'), date = el.querySelector('.pm__date'), more = el.querySelector('.pm__more'), ml = el.querySelector('.pm__more-label');
        put(title, 'rich', plain(bs.title));
        put(title, 'hidden', blank(bs.title));
        put(date, 'text', plain(bs.date));
        put(date, 'hidden', !plain(bs.date).trim());
        if (ml) put(ml, 'text', label);
        if (more) put(more, 'hidden', !label);
      }
    }
  }
  function apply(st, paint) {
    let wrote = false;
    derive(st, (el, key, value) => {
      if (!el) return;
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

  /* ---------- the swiped row of cards (Press Mentions on a phone) ---------- */
  function scroller(st) {
    const root = st.root, track = root.querySelector('[data-r7g-track]');
    if (!track) return;
    const sig = {signal: st.ac.signal};
    const rtl = () => getComputedStyle(track).direction === 'rtl';
    const smooth = () => reduced.matches ? 'auto' : 'smooth';
    const over = () => getComputedStyle(track).overflowX === 'auto' && track.scrollWidth - track.clientWidth > 1;
    const step = () => { const it = track.querySelector('.pm__item'); return it ? it.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : track.clientWidth; };
    const measure = () => {
      st.queued = 0;
      if (!track.isConnected) return;
      /* A row that scrolls can take the keyboard itself; a list or grid that fits is not a tab stop. */
      const o = over();
      if (o !== track.hasAttribute('tabindex')) { if (o) { track.setAttribute('tabindex', '0'); track.setAttribute('aria-label', root.querySelector('.pm__heading:not([hidden])')?.textContent.trim() || 'Press mentions'); } else { track.removeAttribute('tabindex'); track.removeAttribute('aria-label'); } }
    };
    st.measure = () => { if (!st.queued) st.queued = requestAnimationFrame(measure); };
    if ('ResizeObserver' in window) { st.ro = new ResizeObserver(st.measure); st.ro.observe(track); }
    track.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir || !over()) return;
      e.preventDefault();
      track.scrollBy({left: step() * dir * (rtl() ? -1 : 1), behavior: smooth()});
      /* Focus on a card moves with the row. */
      const a = e.target.closest ? e.target.closest('a.pm__link[href]') : null;
      if (a) { const all = [...track.querySelectorAll('a.pm__link[href]')], n = all[all.indexOf(a) + dir]; if (n) n.focus({preventScroll: true}); }
    }, sig);
    st.reveal = el => {
      if (!over()) return;
      const a = el.getBoundingClientRect(), b = track.getBoundingClientRect(), edge = parseFloat(getComputedStyle(track).paddingInlineStart) || 0;
      const d = a.left < b.left + edge ? a.left - b.left - edge : a.right > b.right - edge ? a.right - b.right + edge : 0;
      if (d) track.scrollBy({left: d, behavior: smooth()});
    };
    st.measure();
  }

  /* ---------- lifecycle ---------- */
  function setup(root) {
    const type = TYPES[root.dataset.r7g];
    if (!type) return;
    const wrap = root.closest('.shopify-section') || root.parentElement;
    const st = {root, type, wrap, id: root.dataset.r7gSection || '', ac: new AbortController(), last: new WeakMap(), blocks: new Map(), frame: 0, queued: 0,
      live: root.hasAttribute('data-r7g-settings'), s: parse(root.dataset.r7gSettings), raw: root.dataset.r7gSettings};
    st.space = wrap ? wrap.querySelector('style[data-r7g-space]') : null;
    for (const el of root.querySelectorAll(BSEL)) st.blocks.set(el.dataset.r7gBlock, {el, type: el.dataset.r7gType, s: parse(el.dataset.r7gSettings)});
    roots.set(root, st);
    if (type.p === 'pm') scroller(st);
    if (st.live) {
      apply(st, false);
      /* The builder may rewrite the settings attribute itself. */
      st.mo = new MutationObserver(() => { const raw = root.dataset.r7gSettings; if (raw === st.raw) return; st.raw = raw; st.s = parse(raw); schedule(st); });
      st.mo.observe(root, {attributes: true, attributeFilter: ['data-r7g-settings']});
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
  /* A Mention block picked in the builder is brought into view in its row. */
  document.addEventListener('shopify:block:select', e => {
    const el = e.target && e.target.closest ? e.target.closest('.pm__item') : null, root = el && el.closest(SEL), st = root && roots.get(root);
    if (st && st.reveal) st.reveal(el);
  });
  window.MateriaR7Trust = {scan, roots, count: () => roots.size};
  scan();
})();
