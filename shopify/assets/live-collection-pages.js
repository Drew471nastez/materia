/* Materia Themes. Live builder controller for the collection and blog page
   sections: breadcrumb, page-heading, main-collection-heading,
   main-collection-product, main-list-collections, subcollection-list,
   main-blog, main-article and featured-blog-header (Hero Banner 2). Loaded
   once for every page by layout/theme.storelib.

   Each section prints its root with data-lcp="<type>", data-lcp-id (the
   section id) and data-lcp-settings (its settings as JSON); each block it
   draws carries data-lcp-block (the block id) and data-lcp-block-settings.
   Every value a setting changes is a CSS variable, a class or an attribute
   that the section also prints with the page, so the first paint and a live
   edit look the same.

   A storelib:settings-change for an instance is applied to that instance
   only, in the next frame (one paint per frame per root). A
   storelib:section-load (a redraw) or a new root sets the instance up again,
   once; a root that leaves the page is forgotten. Settings that change which
   elements exist (the blog picked, pagination, filters) wait for the
   builder's redraw. */
(() => {
  if (window.MateriaCollectionPages) return;
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (e) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, f = 0) => v != null && v !== '' && Number.isFinite(+v) ? +v : f;
  const api = () => window.MateriaHeroImageOne;
  /* The same rule as snippets/scheme-color: empty or transparent prints the fallback. */
  const color = (v, f) => {
    if (v && typeof v === 'object') v = v.hex || v.value || '';
    if (typeof v !== 'string' || !v.trim()) return f;
    const c = v.replace(/\s+/g, '').toLowerCase();
    if (c === 'transparent' || c === 'rgba(0,0,0,0)' || c === '#00000000') return f;
    return v;
  };
  /* A font picker value: its own fallbacks when it carries them (as Liquid prints it), else the shared helper's. */
  const font = v => {
    if (v && typeof v === 'object' && v.family) return String(v.family) + (v.fallback_families ? ', ' + v.fallback_families : '');
    return api()?.font?.(v) || '';
  };
  const sectionOf = d => { const id = d && (d.section ?? d.sectionId); return id == null ? '' : String(id.id || id).replace(/^shopify-section-/, ''); };
  const blockOf = d => { const b = d && (d.block ?? d.blockId ?? d.block_id); return b == null ? '' : String(b.id || b); };
  const setVar = (el, p, v) => { if (!el) return; if (v == null || v === '') { if (el.style.getPropertyValue(p)) el.style.removeProperty(p); } else if (el.style.getPropertyValue(p) !== String(v)) el.style.setProperty(p, String(v)); };
  const attr = (el, name, on, value = '') => { if (!el) return; if (!on) { if (el.hasAttribute(name)) el.removeAttribute(name); } else if (el.getAttribute(name) !== String(value)) el.setAttribute(name, String(value)); };
  const swap = (el, list, value) => { if (!el) return; for (const c of list) if (c !== value && el.classList.contains(c)) el.classList.remove(c); if (value && !el.classList.contains(value)) el.classList.add(value); };
  const swapPrefix = (el, prefix, value) => { if (!el) return; for (const c of [...el.classList]) if (c.startsWith(prefix) && c !== prefix + value) el.classList.remove(c); if (value != null && value !== '' && !el.classList.contains(prefix + value)) el.classList.add(prefix + value); };
  const text = (el, v) => { if (el && el.textContent !== String(v ?? '')) el.textContent = String(v ?? ''); };
  const show = (el, on) => { if (!el) return; if (on) { if (el.hidden) el.hidden = false; if (el.style.display === 'none') el.style.removeProperty('display'); } else if (el.style.display !== 'none') el.style.setProperty('display', 'none', 'important'); };
  const clean = html => {
    const t = document.createElement('template');
    t.innerHTML = String(html || '');
    t.content.querySelectorAll('script,style,iframe,object,embed,link,meta,base').forEach(n => n.remove());
    t.content.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src|xlink:href|action|formaction)$/i.test(a.name) && /^\s*(javascript|data):/i.test(a.value))) n.removeAttribute(a.name); }));
    return t.content;
  };
  const rich = (el, html, cache) => { if (!el || cache.get(el) === html) return; el.replaceChildren(clean(html)); cache.set(el, html); };
  const url = v => { const s = typeof v === 'string' ? v.trim() : (v && (v.url || v.href)) || ''; return /^\s*(javascript|data):/i.test(s) ? '' : s; };
  const link = (a, v, fallback = '') => { if (!a) return; const href = url(v) || fallback; if (href) { if (a.getAttribute('href') !== href) a.setAttribute('href', href); } else if (a.hasAttribute('href')) a.removeAttribute('href'); };
  const scheme = (el, s) => {
    if (!el) return;
    const id = s.color_scheme?.id || s.color_scheme;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || el.classList.contains('color-' + id)) return;
    for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c);
    el.classList.add('color-' + id);
  };
  /* The theme's small-padding classes (padding under 30px). */
  const pads = (root, s) => { root.classList.toggle('pt-min', num(s.padding_top) < 30); root.classList.toggle('pb-min', num(s.padding_bottom) < 30); };
  const WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width', 'default'];
  const width = (el, w) => { if (el && w) swap(el, WIDTHS, w); };
  const ALIGN = {left: 'flex-start', center: 'center', right: 'flex-end'};
  /* The block's settings: printed ones, then every live edit sent for it. */
  const blockSettings = (st, el) => ({...parse(el.dataset.lcpBlockSettings), ...(st.blocks.get(el.dataset.lcpBlock) || {})});
  const blocksIn = (root, st, type) => [...root.querySelectorAll('[data-lcp-block]')].filter(el => !type || el.dataset.lcpBlockType === type).map(el => [el, blockSettings(st, el)]);

  /* ---------- A breadcrumb trail (the Breadcrumbs section and the breadcrumb block of the two heading sections) ---------- */
  const PATHS = {
    arrow: {prev: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>', next: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'},
    chevron: {prev: '<path d="m15 18-6-6 6-6"/>', next: '<path d="m9 18 6-6-6-6"/>'},
  };
  function trail(nav, b, align, custom) {
    if (!nav) return;
    attr(nav, 'data-bc-sep', true, b.separator || 'chevron');
    attr(nav, 'data-bc-upper', bool(b.uppercase));
    setVar(nav, '--bc-size', num(b.font_size, 13) + 'px');
    setVar(nav, '--bc-justify', ALIGN[align] || 'flex-start');
    setVar(nav, '--bc-link', custom ? color(b.link_color, 'color-mix(in srgb, var(--color-text) 72%, transparent)') : 'color-mix(in srgb, var(--color-text) 72%, transparent)');
    setVar(nav, '--bc-current', custom ? color(b.current_color, 'var(--color-heading)') : 'var(--color-heading)');
  }
  function fontOn(el, on, family, varName) {
    const f = on ? font(family) : '';
    attr(el, 'data-own-font', !!f);
    setVar(el, varName, f);
  }

  const T = {};
  T.breadcrumb = (root, st) => {
    const s = st.s;
    scheme(root, s);
    width(root.firstElementChild, s.section_width);
    trail(root, s, s.alignment || 'left', bool(s.enable_custom_style));
    fontOn(root, bool(s.enable_custom_fonts), s.font, '--bc-font');
    const pad = bool(s.enable_custom_padding);
    setVar(root, '--bc-pt-d', (pad ? num(s.padding_top_desktop, 20) : 18) + 'px');
    setVar(root, '--bc-pb-d', (pad ? num(s.padding_bottom_desktop, 20) : 18) + 'px');
    setVar(root, '--bc-pt-m', (pad ? num(s.padding_top_mobile, 12) : 12) + 'px');
    setVar(root, '--bc-pb-m', (pad ? num(s.padding_bottom_mobile, 12) : 12) + 'px');
    const icons = PATHS[s.next_prev_icon] || PATHS.chevron;
    for (const svg of root.querySelectorAll('svg[data-bc-dir]')) { const html = icons[svg.dataset.bcDir]; if (html && svg.innerHTML !== html) svg.innerHTML = html; }
  };

  /* ---------- Page heading and Collection banner ---------- */
  const SIZES = ['h3', 'h1-size'];
  const prop = (el, p, v) => { if (!el) return; if (v == null || v === '') { if (el.style.getPropertyValue(p)) el.style.removeProperty(p); } else if (el.style.getPropertyValue(p) !== String(v)) el.style.setProperty(p, String(v)); };
  function blockFont(el, b) { const f = bool(b.enable_custom_fonts) ? font(b.font) : ''; attr(el, 'data-own-font', !!f); prop(el, 'font-family', f); }
  const heading = kind => (root, st) => {
    const s = st.s, align = s.alignment || 'center';
    scheme(root, s);
    width(root.querySelector(':scope > div:not(.overlay-bg)'), s.section_width);
    swapPrefix(root, 'justify-content-', align);
    if (root.hasAttribute('data-align')) attr(root, 'data-align', true, align);
    swapPrefix(root.querySelector('.heading-content'), 'text-', align);
    setVar(root, '--section-pt', String(num(s.padding_top)));
    setVar(root, '--section-pb', String(num(s.padding_bottom)));
    setVar(root, '--overlay-opacity', num(s.overlay_opacity) + '%');
    for (const [el, b] of blocksIn(root, st)) {
      const touched = st.touchedBlocks.has(el.dataset.lcpBlock);
      if (el.dataset.lcpBlockType === 'heading') {
        const h = el.querySelector('.heading-title');
        if (!h) continue;
        if (touched) text(h, String(b.page_title || '').trim() ? b.page_title : h.dataset.lcpFallback || '');
        swap(h, SIZES, b.header_size === 'small' ? 'h3' : b.header_size === 'large' ? 'h1-size' : '');
        blockFont(h, b);
        prop(h, 'font-size', b.header_size === 'medium' ? num(b.heading_font_size, 34) + 'px' : '');
        if (kind === 'page') {
          prop(h, 'margin-bottom', num(b.vertical_gap) + 'px');
          prop(h, 'color', bool(b.enable_heading_color) ? color(b.heading_color, 'var(--color-heading)') : '');
        }
      } else if (el.dataset.lcpBlockType === 'description') {
        blockFont(el, b);
        if (kind === 'page') {
          prop(el, 'color', bool(b.enable_custom_style) ? color(b.description_color, 'var(--color-text)') : 'var(--color-text)');
          prop(el, 'font-size', num(b.description_font_size, 15) + 'px');
          if (touched) {
            const has = !!String(b.description || '').replace(/<[^>]*>/g, '').trim();
            if (has) { show(el, true); rich(el, b.description, st.cache); }
            else if (!el.hasAttribute('data-lcp-has-fallback')) show(el, false);
          }
        }
      } else if (el.dataset.lcpBlockType === 'breadcrumb') {
        trail(el.querySelector('nav.bc'), b, align, true);
      }
    }
  };
  T['page-heading'] = heading('page');
  T['main-collection-heading'] = heading('collection');

  /* ---------- Blog posts page (main-blog) ---------- */
  const RATIO = {square: '1/1', landscape: '4/3', portrait: '3/4'};
  /* The grid sums sections/main-blog prints on #blog-articles. */
  function gridVars(el, s, rowGap) {
    if (!el) return;
    const d = num(s.items_per_row, 4), m = num(s.items_per_row_mobile, 1), gap = num(s.column_gap, 30);
    setVar(el, '--col-desktop', String(d)); setVar(el, '--col-number', String(m));
    setVar(el, '--col-tablet', String(d > 3 ? 3 : d)); setVar(el, '--col-mobile', String(m));
    setVar(el, '--col-gap', (gap < 15 ? gap : 15) + 'px'); setVar(el, '--col-gap-desktop', gap + 'px');
    if (rowGap) setVar(el, '--row-gap', rowGap);
  }
  function fonts(root, s, headVar, bodyVar) {
    const on = bool(s.enable_custom_fonts);
    attr(root, 'data-own-font', on);
    setVar(root, headVar, on ? font(s.heading_font) : '');
    setVar(root, bodyVar, on ? font(s.body_font) : '');
  }
  T['main-blog'] = (root, st) => {
    const s = st.s, custom = bool(s.enable_custom_style), align = s.content_alignment || 'center';
    scheme(root, s);
    width(root.firstElementChild, s.section_width);
    setVar(root, '--section-mt', num(s.margin_top) + 'px');
    setVar(root, '--section-mb', num(s.margin_bottom) + 'px');
    setVar(root, '--badge-vertical-position', num(s.badge_vertical_position) + 'px');
    setVar(root, '--badge-horizontal-position', num(s.badge_horizontal_position) + 'px');
    setVar(root, '--badge-width', num(s.badge_width) + 'px');
    setVar(root, '--badge-height', num(s.badge_height) + 'px');
    setVar(root, '--badge-font-size', num(s.badge_text_font_size) + 'px');
    setVar(root, '--badge-radius', num(s.badge_border_radius) + 'px');
    setVar(root, '--badge-bg', custom ? color(s.badge_background_color, 'var(--color-primary)') : 'var(--color-primary)');
    setVar(root, '--badge-color', custom ? color(s.badge_text_color, 'var(--btn-primary-color)') : 'var(--btn-primary-color)');
    for (const b of root.querySelectorAll('[data-mbl-badge]')) text(b, s.badge_text);
    fonts(root, s, '--mbl-heading-font', '--mbl-body-font');
    gridVars(root.querySelector('#blog-articles'), s);
    for (const el of root.querySelectorAll('.blog-posts-info, .blog-posts-category')) swapPrefix(el, 'text-', align);
    for (const el of root.querySelectorAll('.blog-posts-bottom')) swapPrefix(el, 'justify-content-', align);
    for (const el of root.querySelectorAll('.blog-posts-readmore')) swap(el, ['btn-primary', 'btn-secondary'], 'btn-' + (s.readmore_type || 'primary'));
    let ratio = RATIO[s.image_ratio] || '3/2';
    if (s.image_ratio === 'custom' && String(s.custom_ratio || '').trim()) ratio = String(s.custom_ratio).replace(':', '/');
    if (s.image_ratio !== 'adapt') for (const el of root.querySelectorAll('.blog-posts-image > a')) setVar(el, '--aspect-ratio', ratio);
    const empty = root.querySelector('[data-main-blog-empty]');
    if (empty) {
      attr(empty, 'data-align', true, align);
      const h = empty.querySelector('.main-blog-empty__title'), p = empty.querySelector('.main-blog-empty__text'), a = empty.querySelector('.main-blog-empty__action');
      if (st.touched.has('empty_heading')) { text(h, s.empty_heading); h.hidden = !String(s.empty_heading || '').trim(); }
      if (st.touched.has('empty_text')) { rich(p, s.empty_text, st.cache); p.hidden = !String(s.empty_text || '').replace(/<[^>]*>/g, '').trim(); }
      if (a) { if (st.touched.has('empty_button_label')) { text(a, s.empty_button_label); a.hidden = !String(s.empty_button_label || '').trim(); } if (st.touched.has('empty_button_url')) link(a, s.empty_button_url, '/collections/all'); }
    }
  };

  /* ---------- Blog post (main-article) ---------- */
  const HERO = ['adapt', 'small', 'medium', 'large'];
  function emptyNote(box, s, st, prefix, fallbackUrl) {
    if (!box) return;
    const h = box.querySelector('.' + prefix + '__title'), p = box.querySelector('.' + prefix + '__text'), a = box.querySelector('.' + prefix + '__action');
    if (h && st.touched.has('empty_heading')) { text(h, s.empty_heading); h.hidden = !String(s.empty_heading || '').trim(); }
    if (p && st.touched.has('empty_text')) { rich(p, s.empty_text, st.cache); p.hidden = !String(s.empty_text || '').replace(/<[^>]*>/g, '').trim(); }
    if (a && st.touched.has('empty_button_label')) { text(a, s.empty_button_label); a.hidden = !String(s.empty_button_label || '').trim(); }
    if (a && st.touched.has('empty_button_url')) link(a, s.empty_button_url, fallbackUrl);
  }
  T['main-article'] = (root, st) => {
    const s = st.s;
    scheme(root, s);
    width(root.firstElementChild, s.section_width);
    setVar(root, '--section-pt', String(num(s.padding_top)));
    setVar(root, '--section-pb', String(num(s.padding_bottom)));
    pads(root, s);
    setVar(root, '--ma-content-width', num(s.content_width_desktop, 800) + 'px');
    setVar(root, '--ma-author-ml', num(s.author_margin_left) + 'px');
    setVar(root, '--ma-author-mr', num(s.author_margin_right) + 'px');
    emptyNote(root.querySelector('[data-ma-empty]'), s, st, 'ma-empty', root.dataset.lcpBack || '/');
    for (const [el, b] of blocksIn(root, st)) {
      const custom = bool(b.enable_custom_style);
      switch (el.dataset.lcpBlockType) {
        case 'title': setVar(el, '--ma-title-size', num(b.blog_title_font_size, 40) + 'px'); blockFont(el.querySelector('h1'), b); break;
        case 'category':
          setVar(el, '--ma-pill-bg', custom ? color(b.category_background_color, 'rgba(var(--color-text-rgb), 0.06)') : 'rgba(var(--color-text-rgb), 0.06)');
          setVar(el, '--ma-pill-radius', num(b.category_border_radius) + 'px'); break;
        case 'blog_meta':
          setVar(el, '--ma-meta-bg', custom ? color(b.blog_meta_background_color, 'rgba(var(--color-text-rgb), 0.06)') : 'rgba(var(--color-text-rgb), 0.06)');
          setVar(el, '--ma-date-bg', custom ? color(b.date_pill_background_color, 'rgba(var(--color-text-rgb), 0.1)') : 'rgba(var(--color-text-rgb), 0.1)');
          setVar(el, '--ma-meta-radius', num(b.blog_meta_border_radius) + 'px'); break;
        case 'content_article': blockFont(el, b); break;
        case 'featured_image': {
          prop(el, 'padding-top', num(b.featured_image_top_padding) + 'px');
          prop(el, 'padding-bottom', num(b.featured_image_bottom_padding) + 'px');
          setVar(el, '--ma-hero-radius', num(b.featured_image_border_radius) + 'px');
          const hero = el.querySelector('[data-ma-hero]');
          if (hero) {
            const hgt = HERO.includes(b.image_height) ? b.image_height : 'adapt';
            swap(hero, HERO.map(x => 'article-template__hero-' + x), 'article-template__hero-' + hgt);
            setVar(hero, '--aspect-ratio', hgt === 'adapt' ? (hero.querySelector('img:not(.placeholder-svg)') ? 'adapt' : '16/9') : '');
          }
          break;
        }
        case 'author_highlight': {
          setVar(el, '--ma-author-size', num(b.author_image_size, 80) + 'px');
          const img = el.querySelector('img.author-highlight__image');
          if (img) { attr(img, 'width', true, num(b.author_image_size, 80)); attr(img, 'height', true, num(b.author_image_size, 80)); }
          if (st.touchedBlocks.has(el.dataset.lcpBlock)) text(el.querySelector('[data-ma-author-text]'), b.author_text);
          break;
        }
      }
    }
  };

  /* ---------- Shared wiring ---------- */
  const S = new Map();
  function init(root) {
    if (S.has(root)) return S.get(root);
    const st = {type: root.dataset.lcp, id: root.dataset.lcpId, s: parse(root.dataset.lcpSettings), blocks: new Map(), touched: new Set(), touchedBlocks: new Set(), cache: new WeakMap(), frame: 0, root};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected && T[st.type]) T[st.type](root, st); }); };
    st.dispose = () => { cancelAnimationFrame(st.frame); st.frame = 0; S.delete(root); };
    S.set(root, st);
    return st;
  }
  function scan() {
    for (const [root, st] of S) if (!root.isConnected) st.dispose();
    document.querySelectorAll('[data-lcp][data-lcp-id]').forEach(root => init(root));
  }
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionOf(d), block = blockOf(d);
    if (!id || !d.settings || typeof d.settings !== 'object') return;
    scan();
    for (const st of S.values()) if (st.id === id) {
      if (block) { st.blocks.set(block, {...(st.blocks.get(block) || {}), ...d.settings}); st.touchedBlocks.add(block); }
      else { Object.assign(st.s, d.settings); for (const k of Object.keys(d.settings)) st.touched.add(k); }
      st.schedule();
    }
  });
  ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load'].forEach(t => document.addEventListener(t, scan));
  new MutationObserver(records => {
    if (records.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-lcp]') || n.querySelector('[data-lcp]'))))) scan();
  }).observe(document.documentElement, {childList: true, subtree: true});
  window.MateriaCollectionPages = {scan, roots: S, painters: T};
  scan();
})();
