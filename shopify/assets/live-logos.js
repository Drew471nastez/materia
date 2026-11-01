/* Materia Themes. Live editor updates and behaviour for the Logos and trust
   sections: Brand info, Brand logo, Scrolling logo strip, Logos list,
   Payment icons and Testimonial logos.

   Every root [data-lg-root] carries its settings, defaults and block
   defaults as JSON; every block carries its own. derive() turns settings into
   a list of outputs (a CSS variable, an attribute, text, a picture...) per
   element. The Liquid prints the same outputs, so on load the first derive is
   only recorded, never painted. After that an output is written only when its
   value changes, one frame per root, so a logo never reloads and a marquee
   never restarts for an unrelated edit. audit() compares the derived outputs
   with what the markup carries (used by the tests).

   Behaviour the sections need lives here too, because a section's own inline
   script is not guaranteed to run in the builder canvas: the logo carousels
   (arrows, dots, autoplay, keyboard), the marquee (paused off screen), the
   testimonial tabs (click, arrow keys, autoplay) and reveal on scroll. Each
   is set up once per root, again only when its markup is replaced, paused off
   screen or in a hidden tab, and stopped under reduced motion. */
(() => {
  if (window.MateriaLogos) return;
  const SEL = '[data-lg-root]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const off = v => v === false || v === 'false';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = v => num(v) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.preview_image?.url || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image = false) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };
  const fontCss = (v, f) => {
    if (v && typeof v === 'object' && v.family) return v.family + ', ' + (v.fallback_families || 'sans-serif');
    const fam = api() && api().font ? api().font(v) : '';
    return !fam ? f : /^var\(|,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const fontWeight = (v, f) => v && typeof v === 'object' && v.weight ? String(v.weight) : typeof v === 'string' && /_[a-z](\d)$/.test(v) ? v.slice(-1) + '00' : f;
  const tpl = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const design = () => !!(window.Shopify && window.Shopify.designMode) || document.documentElement.classList.contains('shopify-design-mode');

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = String(value || '').replace(/<[^>]*>/g, '');
  }
  function image(el, v) {
    /* v: JSON {src, alt, ph}. Swaps between an <img> and the placeholder only when the picture changed. */
    const d = parse(v);
    const cur = el.querySelector(':scope > img, :scope > svg, :scope > [data-lg-ph]');
    const bare = v => String(v || '').replace(/[?#].*$/, '');
    if (cur && cur.tagName === 'IMG' && d.src && bare(cur.getAttribute('src')) === bare(d.src)) { if (cur.alt !== (d.alt || '')) cur.alt = d.alt || ''; return; }
    if (cur && cur.tagName !== 'IMG' && !d.src) return;
    let n;
    if (d.src) { n = document.createElement('img'); n.alt = d.alt || ''; n.loading = 'lazy'; n.decoding = 'async'; if (d.cls) n.className = d.cls; if (d.w && d.h) { n.width = d.w; n.height = d.h; } n.src = d.src; }
    else { const t = el.closest(SEL)?.querySelector('template[data-lg-ph]'); n = t ? t.content.firstElementChild.cloneNode(true) : document.createElement('span'); }
    if (cur) cur.replaceWith(n); else el.prepend(n);
  }
  function link(el, href, st) {
    const tag = href ? 'A' : (el.dataset.lgNoLink || 'BUTTON');
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      st.last.set(next, st.last.get(el) || new Map());
      el = next;
    }
    if (href) { el.setAttribute('href', href); el.removeAttribute('type'); el.removeAttribute('aria-disabled'); }
    else { el.removeAttribute('href'); if (tag === 'BUTTON') el.setAttribute('type', 'button'); }
    return el;
  }
  function write(el, key, v, prev, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'image') image(el, v);
    else if (key === 'href') return link(el, v, st);
    return el;
  }

  /* ---------- shared derive pieces ---------- */
  const pick = (own, v, f) => own ? color(v, f) : f;
  /* Colour scheme, custom colours, fonts and paddings of the root (snippets/logos-root). */
  function common(c, o) {
    const {root, s, put} = c, own = !!o.custom, fonts = !!o.fonts;
    const scheme = s.color_scheme && s.color_scheme.id || s.color_scheme;
    if (typeof scheme === 'string' && /^[\w-]+$/.test(scheme)) put(root, 'scheme', scheme);
    if (o.width !== undefined) put(root, '@data-width', o.width);
    put(root, '--lg-bg', pick(own, o.bg, 'var(--color-background)'));
    put(root, '--lg-text', pick(own, o.text, 'var(--color-text)'));
    put(root, '--lg-heading', pick(own, o.heading, 'var(--color-heading)'));
    put(root, '--lg-hf', fonts ? fontCss(o.hfont, 'var(--heading-font)') : 'var(--heading-font)');
    put(root, '--lg-bf', fonts ? fontCss(o.bfont, 'var(--body-font)') : 'var(--body-font)');
    put(root, '--lg-hw', fonts && fontCss(o.hfont, '') ? fontWeight(o.hfont, 'var(--heading-weight)') : 'var(--heading-weight)');
    put(root, '--lg-bw', fonts && fontCss(o.bfont, '') ? fontWeight(o.bfont, 'var(--body-weight)') : 'var(--body-weight)');
    /* Theme priority (Typography > Use in every section) leaves this section's text to its own fonts and weights while custom fonts are on. */
    put(root, '@data-own-font', fonts || null);
    put(root, '@data-own-weight', fonts || null);
    for (const k of ['pt_d', 'pb_d', 'pt_m', 'pb_m', 'px_d', 'px_m']) if (o[k] !== undefined) put(root, '--lg-' + k.replace('_', '-'), px(o[k]));
  }
  /* The section wrapper's own margins, desktop or mobile (printed by snippets/logos-style with a media query). */
  function margins(c) {
    const {s, wrap, put, desktop} = c;
    if (wrap) for (const side of ['top', 'bottom']) put(wrap, '!margin-' + side, px(s['section_margin_' + side + '_' + (desktop ? 'desktop' : 'mobile')]));
  }
  /* Remove default space between sections: snippets/logos-style keys the wrapper rules on data-reset. */
  function reset(c) {
    const {s, root, put} = c;
    if (s.reset_spacing !== undefined) put(root, '@data-reset', bool(s.reset_spacing) ? 'true' : 'false');
  }
  function headAlign(c, v) { c.put(c.root, '@data-head-align', v || 'center'); }
  function textBlock(c, el, b, kind) {
    const {put} = c, own = bool(b.enable_custom_style);
    put(el, 'rich', b.text || '');
    put(el, 'hidden', !String(b.text || '').trim());
    put(el, '--b-c', pick(own, b.color, kind === 'heading' ? 'var(--lg-heading)' : 'var(--lg-text)'));
    if (kind === 'eyebrow') { put(el, '--b-fs', px(b.size)); put(el, '--b-tt', off(b.uppercase) ? 'none' : 'uppercase'); }
    else { put(el, '--b-fs-m', px(b.size_mobile)); put(el, '--b-fs-d', px(b.size_desktop)); }
  }
  function button(c, el, b, fallbackHref = '') {
    const {put} = c, own = bool(b.enable_custom_style), shape = off(b.use_theme_button);
    el = put(el, 'href', url(b.link) || fallbackHref);
    put(el, 'text', b.label || '');
    put(el, 'hidden', !String(b.label || '').trim());
    put(el, '@data-theme-button', b.button_style === 'secondary' ? 'secondary' : 'primary');
    put(el, '@data-full', bool(b.full_width) ? 'true' : 'false');
    const cv = v => own ? color(v, '') : '';
    const bg = cv(b.bg), hb = cv(b.bg_hover);
    put(el, '--mb-bg', bg || null); put(el, '--mb-text', cv(b.color) || null); put(el, '--mb-border', cv(b.border_color) || bg || null);
    put(el, '--mb-hover-bg', hb || null); put(el, '--mb-hover-text', cv(b.color_hover) || null); put(el, '--mb-hover-border', cv(b.border_color_hover) || hb || null);
    put(el, '--mb-radius', shape ? px(b.radius) : null); put(el, '--mb-padding-y', shape ? px(b.padding_y) : null); put(el, '--mb-padding-x', shape ? px(b.padding_x) : null);
    put(el, '--mb-font-size', shape ? px(b.font_size) : null); put(el, '--mb-weight', shape ? String(b.font_weight || 600) : null); put(el, '--btn-border-width', shape ? px(b.border_width) : null); put(el, '--mb-border-width', shape ? px(b.border_width) : null);
    /* own size, padding, corners, border and weight win over Theme settings > Buttons priority only while the theme button is off */
    put(el, '@data-own-shape', shape || null); put(el, '@data-own-weight', shape || null);
    put(el, '--btn-text-transform', bool(b.uppercase) ? 'uppercase' : null);
  }
  /* Header blocks of a section, or its legacy header settings while it has no block of that type (see the section's Liquid). */
  function head(c, legacy = {}, fallbackHref = '') {
    for (const x of c.blocks) {
      if (x.type === 'button') button(c, x.el, x.b, fallbackHref);
      else if (['eyebrow', 'heading', 'subheading'].includes(x.type)) textBlock(c, x.el, x.b, x.type);
    }
    for (const [kind, fn] of Object.entries(legacy)) {
      const el = c.q('[data-lg-legacy="' + kind + '"]');
      if (el && !c.blocks.some(x => x.type === kind)) fn(el);
    }
  }
  const ratio = (r, custom, adapt) => {
    if (r === 'square') return '1 / 1';
    if (r === 'portrait') return '3 / 4';
    if (r === 'landscape') return '4 / 3';
    if (r === 'custom') { const m = String(custom || '').match(/^\s*(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)\s*$/); return m && +m[1] > 0 && +m[2] > 0 ? m[1] + ' / ' + m[2] : '3 / 2'; }
    return adapt;
  };
  const logoImg = (img, alt) => { const src = url(img, true); return JSON.stringify(src ? {src, alt: alt === '' ? '' : alt || (img && img.alt) || '', w: img && img.width || 0, h: img && img.height || 0} : {}); };

  /* ---------- logo carousel (Brand logo, Logos list) ---------- */
  function carouselVars(c, o) {
    const {put, q, blocks} = c, el = q('[data-lg-carousel]'); if (!el) return;
    const count = blocks.filter(x => x.type === o.item).length;
    const perD = num(o.perD, 6), perT = Math.min(perD, 3), perM = num(o.perM, 1);
    put(el, '--per-d', String(perD)); put(el, '--per-t', String(perT)); put(el, '--per-m', String(perM));
    put(el, '--gap-d', px(o.gapD)); put(el, '--gap-m', px(o.gapM)); put(el, '--count', String(Math.max(1, count)));
    put(el, '@data-fit-d', count <= perD ? 'true' : 'false'); put(el, '@data-fit-t', count <= perT ? 'true' : 'false'); put(el, '@data-fit-m', count <= perM ? 'true' : 'false');
    put(el, '@data-arrows', o.arrows); put(el, '@data-pagination', o.pagination || 'disable');
    if (o.pstyle !== undefined) put(el, '@data-pstyle', o.pstyle || 'dot');
    if (o.dots !== undefined) put(el, '--dots-justify', {left: 'flex-start', right: 'flex-end'}[o.dots] || 'center');
    put(el, '@data-loop', bool(o.loop) ? 'true' : 'false'); put(el, '@data-autoplay', bool(o.autoplay) ? 'true' : 'false'); put(el, '@data-speed', String(num(o.speed, 5)));
    /* dots follow the logos: one per logo */
    const dots = el.querySelector('[data-lg-dots]');
    if (dots && dots.children.length !== count) {
      const cur = Math.min(count - 1, Math.max(0, [...dots.children].findIndex(d => d.getAttribute('aria-current') === 'true')));
      dots.replaceChildren(...Array.from({length: count}, (_, i) => { const d = document.createElement('button'); d.type = 'button'; d.className = 'lgc__dot'; d.dataset.lgDot = String(i); d.setAttribute('aria-label', 'Show logo ' + (i + 1)); d.setAttribute('aria-controls', el.id); if (i === cur) d.setAttribute('aria-current', 'true'); const sp = document.createElement('span'); sp.textContent = String(i + 1); d.append(sp); return d; }));
    }
  }
  function carousel(root, st) {
    const el = root.querySelector('[data-lg-carousel]'), track = el && el.querySelector('.lgc__track');
    if (!track || st.track === track) return;
    st.track = track;
    if (st.carAbort) st.carAbort.abort();
    const ac = new AbortController(), sig = {signal: ac.signal}; st.carAbort = ac;
    const slides = () => [...track.children];
    const step = () => { const s = slides()[0]; return s ? s.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : track.clientWidth; };
    const max = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const index = () => Math.round(track.scrollLeft / Math.max(1, step()));
    const go = (i, smooth = true) => { const left = Math.min(max(), Math.max(0, i * step())); track.scrollTo({left, behavior: smooth && !reduced.matches ? 'smooth' : 'auto'}); };
    const next = () => { const m = max(); if (track.scrollLeft >= m - 2) { if (el.dataset.loop === 'true') go(0); } else go(index() + 1); };
    const prev = () => { if (track.scrollLeft <= 2) { if (el.dataset.loop === 'true') go(slides().length); } else go(index() - 1); };
    let tick = 0;
    const update = () => {
      const m = max(), p = m <= 0 ? 0 : Math.min(1, Math.max(0, track.scrollLeft / m)), i = Math.min(slides().length - 1, index());
      el.style.setProperty('--lgc-p', p.toFixed(3));
      for (const d of el.querySelectorAll('[data-lg-dot]')) { const on = +d.dataset.lgDot === i; if ((d.getAttribute('aria-current') === 'true') !== on) { if (on) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); } }
      const loop = el.dataset.loop === 'true';
      const pv = el.querySelector('[data-lg-prev]'), nx = el.querySelector('[data-lg-next]');
      if (pv) pv.setAttribute('aria-disabled', !loop && track.scrollLeft <= 2 ? 'true' : 'false');
      if (nx) nx.setAttribute('aria-disabled', !loop && track.scrollLeft >= m - 2 ? 'true' : 'false');
    };
    track.addEventListener('scroll', () => { if (!tick) tick = requestAnimationFrame(() => { tick = 0; update(); }); }, {passive: true, ...sig});
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-lg-prev],[data-lg-next],[data-lg-dot]'); if (!b || !el.contains(b)) return;
      if (b.hasAttribute('data-lg-prev')) prev(); else if (b.hasAttribute('data-lg-next')) next(); else go(+b.dataset.lgDot);
      restart();
    }, sig);
    track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); next(); restart(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); restart(); } }, sig);
    let hold = false;
    for (const [n, v] of [['pointerenter', true], ['pointerleave', false], ['focusin', true], ['focusout', false]]) el.addEventListener(n, () => { hold = v; }, sig);
    /* autoplay: one timer per carousel, only while it is on screen, the tab is visible and motion is allowed */
    const restart = () => {
      if (st.timer) { clearInterval(st.timer); st.timer = 0; }
      if (el.dataset.autoplay !== 'true' || reduced.matches || !st.visible || document.hidden || max() <= 0) return;
      st.timer = setInterval(() => { if (!hold && root.isConnected) next(); }, Math.max(2, num(el.dataset.speed, 5)) * 1000);
    };
    st.carousel = {update, restart, next, prev, go};
    update(); restart();
  }

  /* ---------- section types ---------- */
  const TYPES = {
    'brand-info': {
      bp: 769,
      derive(c) {
        const {root, s, put} = c, own = bool(s.override_colors), fonts = bool(s.override_fonts);
        common(c, {custom: own, fonts, width: s.section_width || 'container', bg: s.custom_background_color, text: s.custom_text_color, heading: s.custom_heading_color, hfont: s.heading_font, bfont: s.body_font, pt_d: s.padding_top, pb_d: s.padding_bottom, pt_m: s.padding_top_mobile, pb_m: s.padding_bottom_mobile, px_d: s.padding_horizontal, px_m: s.padding_horizontal_mobile});
        put(root, '--lg-link', pick(own, s.custom_link_color, 'var(--color-link, var(--color-heading))'));
        put(root, '--lg-link-h', pick(own, s.custom_link_hover_color, 'var(--color-link-hover, var(--color-text))'));
        put(root, '--lg-rule', pick(own, s.custom_rule_color, 'var(--color-border)'));
        const lw = num(s.left_column_width, 42);
        put(root, '--bi-lw', lw + 'fr'); put(root, '--bi-rw', (100 - lw) + 'fr');
        put(root, '--bi-cgap', px(s.column_gap)); put(root, '--bi-rgap-d', px(s.row_gap)); put(root, '--bi-rgap-m', px(s.row_gap_mobile));
        put(root, '--bi-va', s.vertical_align || 'center');
        put(root, '--bi-hls', px(s.heading_letter_spacing)); put(root, '--bi-plh', String(num(s.paragraph_line_height, 1.6)));
        put(root, '--bi-mt', px(s.margin_top)); put(root, '--bi-mb', px(s.margin_bottom));
        put(root, '@data-ta-l', s.left_text_align || 'left'); put(root, '@data-ta-r', s.right_text_align || 'left');
        put(root, '@data-ta-l-m', s.left_text_align_mobile || 'left'); put(root, '@data-ta-r-m', s.right_text_align_mobile || 'left');
        put(root, '@data-order-m', s.mobile_stack_order || 'left_first');
        /* blocks move between the columns in their saved order */
        const cols = {left: c.q('[data-lg-col="left"]'), right: c.q('[data-lg-col="right"]')};
        const order = c.blocks.slice().sort((a, b) => num(a.el.dataset.lgIndex) - num(b.el.dataset.lgIndex));
        for (const side of ['left', 'right']) {
          const col = cols[side]; if (!col) continue;
          const want = order.filter(x => (x.b.column === 'left' ? 'left' : 'right') === side).map(x => x.el);
          const have = [...col.children].filter(el => el.hasAttribute('data-lg-block'));
          if (want.length !== have.length || want.some((el, i) => have[i] !== el)) col.append(...want);
        }
      },
      block(c, el, b, type) {
        const {put, s} = c, own = bool(b.use_custom_color);
        const fb = type === 'heading' ? 'var(--lg-heading)' : type === 'link' ? 'var(--lg-link)' : 'var(--lg-text)';
        const bc = own ? color(b.custom_color, fb) : fb;
        const fw = b.font_weight && b.font_weight !== 'theme' ? String(b.font_weight) : null;
        if (type !== 'spacer') { put(el, '--b-mt', px(b.space_above)); put(el, '--b-mb', px(b.space_below)); }
        if (type === 'divider') { put(el, '--b-th', px(b.thickness || 1)); put(el, '--b-w', num(b.width, 100) + '%'); return true; }
        if (type === 'spacer') { put(el, '--b-h', px(b.height)); return true; }
        put(el, '--b-c', bc);
        put(el, '--b-fw', fw);
        if (type === 'link') {
          put(el, '--b-ch', own ? color(b.custom_color_hover, bc) : 'var(--lg-link-h)');
          put(el, '--b-fs-m', px(b.size)); put(el, '--b-fs-d', px(b.size)); put(el, '--b-ls', px(b.letter_spacing)); put(el, '--b-tt', b.text_transform || 'none');
          put(el, 'hidden', !String(b.text || '').trim());
          let a = el.querySelector('a');
          if (a) { a = put(a, 'href', url(b.url)); put(a, 'text', b.text || ''); put(a, '@role', url(b.url) ? null : 'link'); put(a, '@aria-disabled', url(b.url) ? null : 'true'); }
          return true;
        }
        put(el, '--b-fs-m', px(b.size_mobile != null ? b.size_mobile : b.size)); put(el, '--b-fs-d', px(b.size));
        put(el, 'rich', b.text || ''); put(el, 'hidden', !String(b.text || '').trim());
        if (type === 'eyebrow') put(el, '--b-ls', px(b.letter_spacing));
        if (type === 'heading') {
          put(el, '@data-own-weight', !!fw || null);
          put(el, '@data-own-size', num(s.heading_letter_spacing) !== 0 || null);
          put(el, '--heading-text-transform', b.text_transform && b.text_transform !== 'none' ? b.text_transform : null);
        }
        return true;
      },
    },
  };

  TYPES['brand-logo'] = {
    bp: 768,
    derive(c) {
      const {root, s, put} = c, fonts = bool(s.enable_custom_fonts);
      common(c, {fonts, width: s.section_width || 'fluid_container', hfont: s.heading_font, bfont: s.body_font, pt_d: s.padding_top, pb_d: s.padding_bottom, pt_m: s.padding_top, pb_m: s.padding_bottom, px_d: 24, px_m: 16});
      margins(c); headAlign(c, s.header_alignment);
      put(root, '@data-framed', bool(s.framed) ? 'true' : 'false');
      put(root, '@data-reveal', bool(s.reveal) ? 'true' : 'false');
      put(root, '--bl-w', px(num(s.img_width, 300))); put(root, '--bl-op', num(s.logo_opacity, 100) + '%');
      put(root, '--bl-ar', ratio(s.image_ratio, s.custom_ratio, 'auto'));
      carouselVars(c, {item: 'brand_items', perD: s.items_per_row, perM: s.items_per_row_mobile, gapD: s.column_gap, gapM: s.column_gap, arrows: bool(s.show_arrow) ? 'both' : 'hide', pagination: s.carousel_pagination, pstyle: s.pagination_style, dots: s.pagination_position, loop: s.infinite, autoplay: s.autoplay, speed: s.autorotate_speed});
      head(c);
    },
    block(c, el, b, type) {
      if (type !== 'brand_items') return;
      const {put, s} = c, href = url(b.link);
      let a = el.querySelector('.bl__link');
      if (!a) return;
      a = put(a, 'href', href);
      put(a, '@target', href && bool(s.open_link_newtab) ? '_blank' : null); put(a, '@rel', href && bool(s.open_link_newtab) ? 'noopener' : null);
      put(el.querySelector('[data-lg-img]'), 'image', logoImg(b.image));
    },
    init: carousel, after(root, st) { carousel(root, st); if (st.carousel) { st.carousel.update(); st.carousel.restart(); } }, visibility(root, st) { if (st.carousel) st.carousel.restart(); },
  };

  TYPES['logos-list'] = {
    bp: 768,
    derive(c) {
      const {root, s, put} = c, own = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
      common(c, {custom: own, fonts, width: s.section_width || 'fluid_container', hfont: s.heading_font, bfont: s.body_font, pt_d: s.padding_top, pb_d: s.padding_bottom, pt_m: s.padding_top, pb_m: s.padding_bottom, px_d: 0, px_m: 0});
      headAlign(c, s.header_alignment);
      put(root, '@data-round', bool(s.rounded_image) ? 'true' : 'false');
      put(root, '@data-hover', s.collection_hover_animation || 'none');
      put(root, '@data-reveal', bool(s.reveal) ? 'true' : 'false');
      put(root, '--ll-pl', px(s.padding_left)); put(root, '--ll-pr', px(s.padding_right)); put(root, '--ll-gap-top', px(s.information_spacing));
      put(root, '--ll-w-d', px(num(s.image_width_desktop, 150))); put(root, '--ll-w-m', px(num(s.image_width_mobile, 100)));
      put(root, '--ll-ar', ratio(s.image_ratio, s.custom_ratio, 'auto'));
      put(root, '--ll-arrow-bg', pick(own, s.arrow_bg_color, 'color-mix(in srgb, var(--color-heading) 10%, transparent)'));
      put(root, '--ll-arrow-c', pick(own, s.arrow_icon_color, 'var(--color-heading)'));
      const el = c.q('[data-lg-carousel]');
      if (el) {
        put(el, '--lgc-justify', {left: 'flex-start', right: 'flex-end'}[s.text_alignment] || 'center');
        put(el, '--arrow-size', px(num(s.arrow_bg_size, 40))); put(el, '--arrow-y-d', num(s.arrow_vertical_position_desktop, 50) + '%'); put(el, '--arrow-y-m', num(s.arrow_vertical_position_mobile, 50) + '%');
      }
      carouselVars(c, {item: 'collection', perD: s.items_per_row, perM: s.items_per_row_mobile, gapD: s.column_gap, gapM: s.column_gap_mobile, arrows: bool(s.enable_navigation_arrows) ? s.arrow_visibility || 'desktop_only' : 'hide', pagination: s.carousel_pagination, loop: s.infinite, autoplay: s.autoplay, speed: s.autorotate_speed});
      head(c);
    },
    block(c, el, b, type) {
      if (type !== 'collection') return;
      const {put, s} = c;
      let a = el.querySelector('.ll__link'); if (!a) return;
      a = put(a, 'href', url(b.collection_url));
      const holder = el.querySelector('[data-lg-img]');
      put(holder, 'image', logoImg(b.logo_image));
      const img = holder && holder.querySelector('img');
      if (img) put(img, '@loading', bool(s.enable_lazy_load) ? 'lazy' : null);
    },
    init: carousel, after(root, st) { carousel(root, st); if (st.carousel) { st.carousel.update(); st.carousel.restart(); } }, visibility(root, st) { if (st.carousel) st.carousel.restart(); },
  };

  TYPES.logo_scroll_strip = {
    bp: 768,
    derive(c) {
      const {root, s, put} = c, own = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
      common(c, {custom: own, fonts, width: s.max_width || 'wide', text: s.text_color, heading: s.heading_color, hfont: s.heading_font, bfont: s.body_font, pt_d: s.padding_top, pb_d: s.padding_bottom, pt_m: s.padding_top, pb_m: s.padding_bottom, px_d: 24, px_m: 20});
      headAlign(c, s.heading_alignment);
      put(root, '@data-style', s.logo_style || 'original'); put(root, '@data-auto', bool(s.auto_scroll) ? 'true' : 'false');
      put(root, '@data-direction', s.direction || 'left'); put(root, '@data-pause-hover', bool(s.pause_on_hover) ? 'true' : 'false'); put(root, '@data-fade', bool(s.edge_fade) ? 'true' : 'false');
      const v = {'--lg-hmb-d': px(s.heading_gap), '--lg-hmb-m': px(s.heading_gap_mobile), '--sls-head-width': px(num(s.heading_width, 640)), '--sls-speed': num(s.speed, 35) + 's', '--sls-h': px(num(s.logo_height, 48)), '--sls-h-m': px(num(s.logo_height_mobile, 32)), '--sls-w': px(num(s.logo_max_width, 220)), '--sls-w-m': px(num(s.logo_max_width_mobile, 180)), '--sls-gap': px(num(s.gap, 72)), '--sls-gap-m': px(num(s.gap_mobile, 44)), '--sls-fade': num(s.edge_fade_width, 8) + '%',
        '--sls-item-px': px(s.logo_padding_horizontal), '--sls-item-py': px(s.logo_padding_vertical), '--sls-item-radius': px(s.logo_radius), '--sls-item-border': px(s.logo_border_width), '--sls-item-bg': pick(own, s.logo_background, 'transparent'), '--sls-item-border-color': pick(own, s.logo_border_color, 'var(--color-border)'), '--sls-mono-opacity': num(s.monochrome_opacity, 60) + '%', '--sls-hover-scale': String(num(s.hover_scale, 1))};
      for (const k in v) put(root, k, v[k]);
      const empty = c.q('[data-lg-empty] .sls__ph'); if (empty) put(empty, 'text', s.empty_note || '');
      head(c);
    },
    block(c, el, b, type) {
      if (type !== 'logo') return;
      const {put, root} = c;
      for (const item of [el, ...root.querySelectorAll('[data-lg-copy="' + CSS.escape(el.dataset.lgBlock) + '"]')]) {
        const copy = item !== el, href = url(b.url);
        let a = item.querySelector('.sls__link'); if (!a) continue;
        a = put(a, 'href', href); if (copy) put(a, '@tabindex', href ? '-1' : null);
        const src = url(b.logo, true), img = a.querySelector('.sls__img'), ph = a.querySelector('.sls__ph');
        if (src) {
          if (img) { if (img.getAttribute('src').replace(/[?#].*$/, '') !== src.replace(/[?#].*$/, '')) img.src = src; put(img, '@alt', copy ? '' : b.alt || ''); }
          else { const n = document.createElement('img'); n.className = 'sls__img'; n.width = 200; n.height = 80; n.loading = 'lazy'; n.decoding = 'async'; n.alt = copy ? '' : b.alt || ''; n.src = src; (ph || a.firstChild) ? (ph || a.firstChild).replaceWith(n) : a.append(n); }
        } else if (img) { const n = document.createElement('span'); n.className = 'sls__ph'; n.textContent = b.name || ''; img.replaceWith(n); }
        else if (ph) put(ph, 'text', b.name || '');
      }
    },
    visibility(root, st) { const stop = !st.visible || document.hidden; if (stop) root.setAttribute('data-paused', ''); else root.removeAttribute('data-paused'); },
  };

  TYPES['payment-icons1'] = {
    bp: 801,
    derive(c) {
      const {root, s, put} = c, own = bool(s.enable_custom_style), fonts = bool(s.override_fonts);
      common(c, {custom: own, fonts, width: s.section_width, bg: s.section_background_color, text: s.text_color, heading: s.text_color, hfont: s.headline_font, bfont: s.text_font, pt_d: s.section_padding_top_bottom, pb_d: s.section_padding_top_bottom, pt_m: s.mobile_section_padding_top_bottom, pb_m: s.mobile_section_padding_top_bottom, px_d: 0, px_m: 0});
      margins(c);
      put(root, '@data-show', s.show_on_device || 'all'); put(root, '@data-align', s.text_alignment || 'center'); put(root, '@data-align-m', s.mobile_text_alignment || 'center');
      put(root, '@data-reveal', bool(s.reveal) ? 'true' : 'false');
      const ownLh = s.headline_line_height != null && s.headline_line_height !== '' && s.headline_line_height !== 'inherit';
      const v = {'--pi-px-d': px(s.section_padding_left_right), '--pi-px-m': px(s.mobile_section_padding_left_right), '--pi-gap': px(s.element_spacing), '--pi-head-gap': px(s.headline_spacing),
        '--pi-hlh': ownLh ? String(s.headline_line_height) : 'var(--heading-line-height, 1.2)', '--pi-tlh': s.text_line_height != null && s.text_line_height !== '' && s.text_line_height !== 'inherit' ? String(s.text_line_height) : 'var(--body-line-height, 1.6)',
        '--pi-icon-h-d': px(num(s.icon_height, 40)), '--pi-icon-h-m': px(num(s.mobile_icon_height, 29)), '--pi-icon-gap-d': px(s.icon_gap), '--pi-icon-gap-m': px(s.mobile_icon_gap)};
      for (const k in v) put(root, k, v[k]);
      for (const k of ['visa', 'mastercard', 'discover', 'paypal', 'apple_pay', 'google_pay', 'shop_pay']) put(c.q('[data-lg-pay="' + k + '"]'), 'hidden', !bool(s['show_' + k]));
      /* a line height of its own wins over Theme settings > Typography on the heading */
      for (const h of c.qa('.lg__heading')) put(h, '@data-own-size', ownLh || null);
      head(c);
    },
  };

  /* ---------- testimonial tabs ---------- */
  function tabs(root, st) {
    const list = root.querySelector('[role="tablist"]'), quotes = root.querySelector('[data-tlg-quotes]');
    if (!list || !quotes) return;
    if (st.tabList === list) return;
    st.tabList = list;
    if (st.tabAbort) st.tabAbort.abort();
    const ac = new AbortController(), sig = {signal: ac.signal}; st.tabAbort = ac;
    const tabEls = () => [...list.querySelectorAll('[role="tab"]')];
    const panels = () => [...quotes.querySelectorAll('[data-tlg-panel]')];
    let current = Math.max(0, tabEls().findIndex(t => t.getAttribute('aria-selected') === 'true')), pending = null, swap = 0, hold = false;
    const mark = i => tabEls().forEach((t, n) => { const on = n === i; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    const commit = () => {
      swap = 0; if (pending === null) return;
      const i = pending; pending = null; current = i;
      panels().forEach((p, n) => { p.hidden = n !== i; });
      quotes.classList.add('is-prep'); quotes.classList.remove('is-out'); void quotes.offsetWidth; quotes.classList.remove('is-prep');
    };
    const activate = i => {
      const n = tabEls().length; if (!n) return;
      i = Math.max(0, Math.min(i, n - 1));
      if (i === (pending === null ? current : pending)) return;
      pending = i; mark(i);
      clearTimeout(swap);
      const ms = reduced.matches ? 0 : parseFloat(getComputedStyle(quotes).transitionDuration) * 1000 || 0;
      if (ms <= 0) { commit(); return; }
      quotes.classList.add('is-out');
      swap = setTimeout(commit, ms);
    };
    list.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t && list.contains(t)) { activate(tabEls().indexOf(t)); restart(); } }, sig);
    list.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const n = tabEls().length; let i = pending === null ? current : pending;
      i = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : n - 1;
      i = (i + n) % n; tabEls()[i].focus(); activate(i); restart();
    }, sig);
    for (const [n, v] of [['pointerenter', true], ['pointerleave', false], ['focusin', true], ['focusout', false]]) root.addEventListener(n, () => { hold = v; }, sig);
    /* the editor shows the selected block's quote */
    document.addEventListener('shopify:block:select', e => { const t = e.target && e.target.closest && e.target.closest('[role="tab"]'); if (t && list.contains(t)) { st.editorHold = true; activate(tabEls().indexOf(t)); } }, sig);
    document.addEventListener('shopify:block:deselect', () => { st.editorHold = false; }, sig);
    const restart = () => {
      if (st.timer) { clearInterval(st.timer); st.timer = 0; }
      if (root.dataset.autoplay !== 'true' || design() || reduced.matches || !st.visible || document.hidden || tabEls().length < 2) return;
      st.timer = setInterval(() => { if (hold || st.editorHold || !root.isConnected) return; const n = tabEls().length; activate(((pending === null ? current : pending) + 1) % n); }, Math.max(3, num(root.dataset.interval, 6)) * 1000);
    };
    st.tabs = {activate, restart, sync: () => { const n = tabEls().length; if (current >= n) { current = 0; pending = null; } panels().forEach((p, k) => { p.hidden = k !== (pending === null ? current : pending); }); mark(pending === null ? current : pending); }};
    restart();
  }
  TYPES['testimonial-logos'] = {
    bp: 750,
    derive(c) {
      const {root, s, put} = c, own = bool(s.quote_color_custom), fonts = bool(s.enable_custom_fonts), body = s.quote_font === 'theme-body';
      common(c, {fonts, width: s.width || 'fluid_container', hfont: s.heading_font, bfont: s.body_font, pt_d: s.padding_top, pb_d: s.padding_bottom, pt_m: s.padding_top, pb_m: s.padding_bottom, px_d: 0, px_m: 0});
      put(root, '@data-logos', s.logos_position || 'below'); put(root, '@data-mark', bool(s.show_quote_mark) ? 'true' : 'false'); put(root, '@data-gray', bool(s.grayscale_inactive) ? 'true' : 'false');
      put(root, '@data-transition', s.transition_style || 'fade_up'); put(root, '@data-autoplay', bool(s.autoplay) ? 'true' : 'false'); put(root, '@data-interval', String(num(s.autoplay_interval, 6)));
      const gap = num(s.logo_gap, 40);
      const v = {'--tlg-qf': body ? 'var(--lg-bf)' : 'var(--lg-hf)', '--tlg-qw': body ? 'var(--lg-bw)' : 'var(--lg-hw)', '--tlg-qs-d': px(num(s.quote_size_d, 26)), '--tlg-qs-m': px(num(s.quote_size_m, 19)), '--tlg-qmax': px(num(s.quote_max_width, 900)),
        '--tlg-qc': pick(own, s.quote_color, 'var(--color-heading)'), '--tlg-ac': pick(own, s.author_color, 'var(--color-text)'), '--tlg-mark': pick(own, s.mark_color, 'var(--color-border)'),
        '--tlg-as-d': px(num(s.author_size_d, 13)), '--tlg-as-m': px(num(s.author_size_m, 12)), '--tlg-lh': px(num(s.logo_height, 28)), '--tlg-gap': px(gap), '--tlg-gap-m': px(Math.max(12, Math.round(gap * 0.65))), '--tlg-dim': num(s.inactive_opacity, 35) + '%', '--tlg-speed': num(s.transition_speed, 400) + 'ms'};
      for (const k in v) put(root, k, v[k]);
      /* the quote keeps the heading font under Typography > Use in every section */
      for (const q of c.qa('.tlg__quote-text')) put(q, '@data-own-font', !body || null);
    },
    block(c, el, b, type) {
      if (type !== 'testimonial') return;
      const {put, root} = c, panel = root.querySelector('[data-tlg-panel="' + CSS.escape(el.dataset.lgBlock) + '"]');
      put(el, 'image', logoImg(b.logo_image, ''));
      const alt = b.logo_image && b.logo_image.alt ? String(b.logo_image.alt).replace(/<[^>]*>/g, '').trim() : '';
      put(el, '@aria-label', alt || 'Testimonial ' + (num(el.dataset.index) + 1));
      if (panel) {
        put(panel.querySelector('.tlg__quote-text'), 'rich', b.quote || '');
        const au = panel.querySelector('.tlg__author'); put(au, 'text', b.author || ''); put(au, 'hidden', !String(b.author || '').trim());
      }
    },
    init: tabs, after(root, st) { tabs(root, st); if (st.tabs) { st.tabs.sync(); st.tabs.restart(); } }, visibility(root, st) { if (st.tabs) st.tabs.restart(); },
  };

  /* ---------- engine ---------- */
  function derive(root, st, record) {
    const type = TYPES[root.dataset.lgRoot]; if (!type) return [];
    const out = [];
    const put = (el, key, v) => {
      if (!el) return el;
      out.push([el, key, v]);
      if (record === 'audit') return el;
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      const prev = m.get(key); m.set(key, v);
      return write(el, key, v, prev, st) || el;
    };
    const blocks = [...root.querySelectorAll('[data-lg-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.lgBlock, t = el.dataset.lgType;
      if (st.rawBlocks.get(id) !== el.dataset.lgSettings) { st.rawBlocks.set(id, el.dataset.lgSettings); st.blocks.set(id, {...parse(el.dataset.lgSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: t, b: {...(st.blockDefaults[t] || {}), ...st.blocks.get(id)}};
    });
    const c = {root, st, s: st.s, put, blocks, wrap: root.closest('.shopify-section'), desktop: st.mq.matches, q: sel => root.querySelector(sel), qa: sel => [...root.querySelectorAll(sel)]};
    reset(c);
    type.derive(c);
    for (const x of blocks) if (type.block) type.block(c, x.el, x.b, x.type, x);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.lgSettings) { st.raw = root.dataset.lgSettings; st.s = {...st.defaults, ...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    const type = TYPES[root.dataset.lgRoot];
    if (type.after) type.after(root, st);
  }
  function drop(root, st) {
    st.io.disconnect(); st.mq.removeEventListener('change', st.schedule); reduced.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame); if (st.abort) st.abort.abort(); if (st.carAbort) st.carAbort.abort(); if (st.tabAbort) st.tabAbort.abort(); if (st.timer) clearInterval(st.timer); roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.lgRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const defaults = parse(root.dataset.lgDefaults);
    const st = {root, defaults, live: {}, liveBlocks: new Map(), s: {...defaults, ...parse(root.dataset.lgSettings)}, raw: root.dataset.lgSettings, blocks: new Map(), rawBlocks: new Map(), blockDefaults: parse(root.dataset.lgBlockDefaults), last: new Map(), visible: true, abort: new AbortController(),
      mq: matchMedia('(min-width: ' + type.bp + 'px)')};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule); reduced.addEventListener('change', st.schedule);
    st.io = new IntersectionObserver(es => { for (const e of es) { st.visible = e.isIntersecting; if (e.isIntersecting) reveal(root, st, true); } if (type.visibility) type.visibility(root, st); });
    st.io.observe(root);
    roots.set(root, st);
    derive(root, st, true);
    reveal(root, st, false);
    if (type.init) type.init(root, st);
    st.schedule();
    root.dataset.lgReady = '';
  }
  /* Reveal on scroll: only a section that starts below the fold waits, never in the editor or under reduced motion. */
  function reveal(root, st, seen) {
    if (root.dataset.reveal !== 'true') { root.removeAttribute('data-lg-reveal'); return; }
    if (seen || design() || reduced.matches) { root.dataset.lgReveal = 'done'; return; }
    if (!root.dataset.lgReveal) { const r = root.getBoundingClientRect(); root.dataset.lgReveal = r.top > innerHeight ? 'wait' : 'done'; }
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll(SEL)) { const st = roots.get(root); if (st) st.schedule(); else add(root); }
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id || v.sectionId || '' : v || '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId || d.section_id); if (!id || !d.settings) return;
    const bRaw = d.block || d.blockId || d.block_id, bid = bRaw ? String(bRaw.id || bRaw) : '';
    for (const [root, st] of roots) {
      if (root.dataset.lgSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const [root, st] of roots) { const t = TYPES[root.dataset.lgRoot]; if (t.visibility) t.visibility(root, st); } });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-lg-block]') || n.querySelector(SEL + ',[data-lg-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-lg-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-lg-settings']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false) { have = have !== null; } else want = v == null ? null : String(v); }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else continue;
      if (have !== want) bad.push((el.dataset.lgBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaLogos = {scan, audit, roots, TYPES};
  scan();
})();
