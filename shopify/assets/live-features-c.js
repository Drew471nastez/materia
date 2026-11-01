/* Materia Themes. Live editor paint and runtimes for six Features sections:
   Content Tabs, How To Use, Benefits Bar 3 (ingredients-highlight-bar),
   Count Up Banner (number-stats), Product Benefits 2 and Product Benefits 3.
   Each section prints its values as CSS variables and data attributes for the
   first paint; this file works out the same values when the builder changes a
   setting, for that copy of the section only, at most once per frame, and
   changes only what changed (no picture loads again, no counter replays). It
   also runs what the sections do on the page (carousels, arrows, autoplay,
   count up, videos), once per copy, set up again after a redraw, paused off
   screen and stopped under reduced motion. Section inline scripts are not
   relied on: the builder canvas may not run them. */
(() => {
  if (window.MateriaFeaturesC) return;
  const roots = new Map();
  const api = () => window.MateriaHeroImageOne;
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, f = 0) => v != null && v !== '' && Number.isFinite(+v) ? +v : f;
  const px = (v, f = 0) => num(v, f) + 'px';
  const blank = v => v == null || v === '' || (typeof v === 'string' && !v.trim());
  const color = (v, f) => api()?.color(v, f) || f;
  const custom = (on, v, f) => on ? color(v, f) : f;
  const fontOf = v => { if (blank(v)) return ''; if (typeof v === 'object' && v.family) return /^[\w ,'"-]+$/.test(v.family) ? v.family + ', ' + (v.fallback_families || 'sans-serif') : ''; return api()?.font(v) || ''; };
  const src = v => api()?.url(v, true) || '';
  const href = v => api()?.url(v) || '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const design = () => !!(window.Shopify && window.Shopify.designMode) || document.documentElement.classList.contains('shopify-design-mode');
  const set = (el, p, v) => { if (el && el.style.getPropertyValue(p) !== String(v)) el.style.setProperty(p, v); };
  const unset = (el, p) => { if (el && el.style.getPropertyValue(p) !== '') el.style.removeProperty(p); };
  const vars = (el, o) => { for (const [p, v] of Object.entries(o)) v == null ? unset(el, p) : set(el, p, v); };
  const text = (el, v) => { if (el && el.textContent !== String(v ?? '')) el.textContent = v ?? ''; };
  const hide = (el, on) => { if (el && el.hasAttribute('hidden') !== !!on) el.toggleAttribute('hidden', !!on); };
  const flag = (el, name, on) => { if (el && el.hasAttribute(name) !== !!on) el.toggleAttribute(name, !!on); };
  const data = (el, k, v) => { if (el && el.dataset[k] !== String(v)) el.dataset[k] = v; };
  const attr = (el, k, v) => { if (!el) return; if (v == null) { if (el.hasAttribute(k)) el.removeAttribute(k); } else if (el.getAttribute(k) !== String(v)) el.setAttribute(k, v); };
  /* Theme settings > Typography and Buttons win with !important unless an element opts out (snippets/theme-controls). */
  const own = (el, kind, on) => flag(el, 'data-own-' + kind, on);
  const rich = (el, value, st) => { if (!el || !api()) return; const v = String(value ?? ''); if (st.rich.get(el) === v) return; api().rich(el, v, {rich: new WeakMap()}); st.rich.set(el, v); };
  const scheme = (root, s) => { const id = s.color_scheme?.id || s.color_scheme; if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || root.classList.contains('color-' + id)) return; for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c); root.classList.add('color-' + id); };
  const fonts = (s, on) => ({h: (on && fontOf(s.heading_font)) || 'var(--heading-font)', b: (on && fontOf(s.body_font)) || 'var(--body-font)'});
  /* A picture in a holder: an <img> made or updated only when its address changes; the placeholder shows when there is none. */
  function picture(holder, value, {cls = '', alt = '', w, h, sel = 'img'} = {}) {
    if (!holder) return null;
    const url = src(value), ph = holder.querySelector(':scope > svg, :scope > .fc-ph');
    let img = holder.querySelector(sel);
    if (!url) { if (img && !img.dataset.fcDemo) img.remove(), img = null; hide(ph, !!img); return img; }
    if (!img || img.dataset.fcDemo) { img?.remove(); img = document.createElement('img'); if (cls) img.className = cls; img.loading = 'lazy'; img.decoding = 'async'; holder.prepend(img); }
    if ((img.getAttribute('src') || '').split('?')[0] !== url.split('?')[0]) { img.removeAttribute('srcset'); img.src = url; }
    if (typeof value === 'object' && value) { if (value.width) attr(img, 'width', w || value.width); if (value.height) attr(img, 'height', h || value.height); }
    attr(img, 'alt', alt);
    hide(ph, true);
    return img;
  }
  /* An icon from the section's own <template data-fc-icons> (printed in the editor only). */
  function icon(root, holder, name, st) {
    if (!holder || holder.dataset.fcIcon === String(name)) return;
    const lib = root.querySelector('template[data-fc-icons]');
    const pick = lib?.content.querySelector('[data-icon="' + CSS.escape(String(name)) + '"]');
    if (!pick && name !== 'none' && name !== '') return;
    holder.replaceChildren(...(pick ? [...pick.cloneNode(true).childNodes] : []));
    holder.dataset.fcIcon = name;
  }
  /* Swap an element for one with another tag (a button with a link is an <a>), keeping its attributes and children. */
  function retag(el, tag) {
    if (!el || el.tagName.toLowerCase() === tag) return el;
    const next = document.createElement(tag);
    for (const a of el.attributes) next.setAttribute(a.name, a.value);
    next.append(...el.childNodes);
    el.replaceWith(next);
    return next;
  }
  function button(el, b, {label = 'label', link = 'link', customOn, colours}) {
    const url = href(b[link]);
    el = retag(el, url ? 'a' : 'button');
    if (url) { attr(el, 'href', url); attr(el, 'type', null); } else { attr(el, 'href', null); attr(el, 'type', 'button'); }
    text(el, b[label]); hide(el, blank(b[label]));
    const c = customOn ? colours : {};
    const pick = v => v && color(v, '') ? color(v, '') : null;
    vars(el, {'--mb-bg': pick(c.bg), '--mb-text': pick(c.text), '--mb-border': pick(c.border) || pick(c.bg), '--mb-hover-bg': pick(c.hover_bg), '--mb-hover-text': pick(c.hover_text), '--mb-hover-border': pick(c.hover_border) || pick(c.hover_bg)});
    return el;
  }
  /* Scroll a track by one item; smooth unless the visitor asked for less motion. */
  const behaviour = () => reduce.matches ? 'auto' : 'smooth';
  function stepOf(track, item) {
    const card = track.querySelector(item);
    if (!card) return track.clientWidth;
    const cs = getComputedStyle(track);
    return card.getBoundingClientRect().width + (parseFloat(cs.columnGap || cs.gap) || 0);
  }
  /* Drag with a mouse or pen (touch keeps native momentum scrolling); swallow the click after a real drag. */
  function draggable(track, signal) {
    let down = false, dragged = false, startX = 0, startScroll = 0;
    track.addEventListener('pointerdown', e => { if (e.pointerType === 'touch' || e.button) return; down = true; dragged = false; startX = e.clientX; startScroll = track.scrollLeft; }, {signal});
    track.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - startX; if (!dragged && Math.abs(dx) > 4) { dragged = true; track.classList.add('is-dragging'); try { track.setPointerCapture(e.pointerId); } catch (_) {} } if (dragged) { track.scrollLeft = startScroll - dx; e.preventDefault(); } }, {signal});
    const end = e => { if (!down) return; down = false; track.classList.remove('is-dragging'); try { track.releasePointerCapture(e.pointerId); } catch (_) {} };
    for (const n of ['pointerup', 'pointercancel', 'pointerleave']) track.addEventListener(n, end, {signal});
    track.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, {capture: true, signal});
    track.addEventListener('dragstart', e => e.preventDefault(), {signal});
  }
  /* Arrow keys, Home and End move a scrolling row one item at a time. */
  function keys(track, item, signal) {
    track.addEventListener('keydown', e => {
      if (e.target !== track && !track.contains(e.target)) return;
      const step = stepOf(track, item), max = track.scrollWidth - track.clientWidth, rtl = getComputedStyle(track).direction === 'rtl' ? -1 : 1;
      const to = {ArrowRight: track.scrollLeft + step * rtl, ArrowLeft: track.scrollLeft - step * rtl, Home: 0, End: max * rtl}[e.key];
      if (to === undefined) return;
      e.preventDefault();
      track.scrollTo({left: to, behavior: behaviour()});
    }, {signal});
  }

  /* ---------------------------------------------------------------- Content Tabs */
  const contentTabs = {
    paint(root, st) {
      const s = st.s, on = bool(s.enable_custom_style), f = fonts(s, bool(s.enable_custom_fonts));
      scheme(root, s); data(root, 'width', s.section_width || 'container'); own(root, 'font', bool(s.enable_custom_fonts));
      const head = root.querySelector('[data-fc-type="heading"]'), hb = head ? st.block(head) : {};
      const ta = v => ['left', 'right'].includes(v) ? v : 'center', fx = v => ({left: 'flex-start', right: 'flex-end'})[v] || 'center';
      const tad = head ? ta(hb.text_align) : 'center', tam = head ? ta(hb.text_align_mobile) : 'center';
      vars(root, {
        '--ct-bg': custom(on, s.background, 'var(--gradient-background, var(--color-background))'),
        '--ct-hl-color': custom(on, s.highlights_color, 'var(--color-heading)'),
        '--ct-arrow-ink': custom(on, s.arrow_icon_color, 'var(--color-heading)'), '--ct-arrow-line': custom(on, s.arrow_border_color, 'var(--color-border)'),
        '--ct-hf': f.h, '--ct-bf': f.b,
        '--ct-hl-size': px(s.highlights_size, 16), '--ct-hl-gap': px(s.highlights_gap, 32),
        '--ct-per-d': String(s.cards_desktop || '3.5'), '--ct-per-m': String(s.cards_mobile || '1.5'),
        '--ct-gap': px(s.card_gap), '--ct-h-d': px(s.card_height_desktop, 230), '--ct-h-m': px(s.card_height_mobile, 260),
        '--ct-radius': px(s.card_radius), '--ct-pad': px(s.card_padding, 22), '--ct-title-size': px(s.card_title_size, 24), '--ct-text-size': px(s.card_text_size, 15),
        '--ct-g1': px(s.gap_heading_to_highlights), '--ct-g2': px(s.gap_highlights_to_cards), '--ct-g3': px(s.gap_cards_to_arrows), '--ct-g4': px(s.gap_arrows_to_button), '--ct-g5': px(s.gap_button_to_footer),
        '--ct-pt-d': px(s.padding_top_desktop), '--ct-pb-d': px(s.padding_bottom_desktop), '--ct-pt-m': px(s.padding_top_mobile), '--ct-pb-m': px(s.padding_bottom_mobile),
        '--ct-mt-d': px(s.section_margin_top_desktop), '--ct-mb-d': px(s.section_margin_bottom_desktop), '--ct-mt-m': px(s.section_margin_top_mobile), '--ct-mb-m': px(s.section_margin_bottom_mobile),
        '--ct-ta-d': tad, '--ct-ta-m': tam, '--ct-jc-d': fx(tad), '--ct-ai-m': fx(tam),
      });
      if (head) {
        const h = head.querySelector('.ctabs__heading'), hf = bool(hb.heading_custom_font_enable), w = hf && !blank(hb.heading_font_weight) && hb.heading_font_weight !== 'inherit';
        rich(h, hb.heading, st); hide(head, blank(hb.heading));
        vars(head, {'--ct-h-color': custom(bool(hb.enable_custom_style), hb.heading_color, 'var(--color-heading)'), '--ct-h-size-d': px(hb.heading_size_desktop, 44), '--ct-h-size-m': px(hb.heading_size_mobile, 30), '--ct-h-font': hf ? fontOf(hb.heading_font) || null : null, '--ct-h-weight': w ? String(hb.heading_font_weight) : null});
        own(h, 'font', hf); own(h, 'weight', w);
        attr(root.querySelector('[data-ctabs-track]'), 'aria-label', (h.textContent || '').trim() || 'Cards');
      }
      for (const el of root.querySelectorAll('[data-fc-type="highlight"]')) { const b = st.block(el); text(el.querySelector('[data-fc-text]'), b.text); icon(root, el.querySelector('.ctabs__icon'), b.icon || 'check', st); }
      for (const el of root.querySelectorAll('[data-fc-type="tab"]')) {
        const b = st.block(el), c = bool(b.enable_custom_style);
        vars(el, {'--ctabs-ovl': custom(c, b.overlay_color, 'var(--color-heading)'), '--ctabs-ovl-op': String(num(b.overlay_opacity)), '--ctabs-bri': num(b.image_brightness, 100) + '%',
          '--ctabs-title': custom(c, b.title_color, 'var(--color-background)'), '--ctabs-text': custom(c, b.text_color, 'var(--color-background)'),
          '--ctabs-badge-bg': custom(c, b.badge_bg, 'var(--color-background)'), '--ctabs-badge-c': custom(c, b.badge_text_color, 'var(--color-heading)')});
        const t = el.querySelector('.ctabs__title'), d = el.querySelector('.ctabs__desc');
        text(t, b.title); hide(t, blank(b.title)); text(d, b.description); hide(d, blank(b.description));
        for (const n of [1, 2]) { const badge = el.querySelector('[data-fc-badge="' + n + '"]'); text(badge, b['badge_' + n]); hide(badge, blank(b['badge_' + n])); }
        attr(el, 'href', href(b.link) || null);
        if ('image' in st.blockEdits(el)) picture(el.querySelector('.ctabs__media'), b.image, {alt: b.image?.alt || b.title || ''});
      }
      hide(root.querySelector('.ctabs__nav'), !bool(s.show_arrows));
      for (let el of root.querySelectorAll('[data-fc-type="button"]')) {
        const b = st.block(el), outline = b.style === 'outline';
        el = button(el, b, {customOn: bool(b.custom_colors), colours: {bg: b.bg, text: b.text_color, hover_bg: b.bg_hover, hover_text: b.text_color}});
        data(el, 'themeButton', outline ? 'secondary' : 'primary'); data(el, 'full', bool(b.full_width) ? 'true' : 'false');
        el.classList.toggle('btn-outline', outline); el.classList.toggle('btn-primary', !outline);
      }
      for (const el of root.querySelectorAll('[data-fc-type="footer"]')) {
        const b = st.block(el);
        rich(el, b.footer_text, st); hide(el, blank(b.footer_text));
        vars(el, {'--ct-f-color': custom(bool(b.enable_custom_style), b.footer_color, 'var(--color-text)'), '--ct-f-size': px(b.footer_size, 15)});
      }
      st.update?.();
    },
    start(root, st, signal) {
      const track = root.querySelector('[data-ctabs-track]');
      if (!track) return;
      const prev = root.querySelector('[data-ctabs-prev]'), next = root.querySelector('[data-ctabs-next]');
      const update = () => { if (!prev || !next || !track.isConnected) return; const max = track.scrollWidth - track.clientWidth - 2; prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= max; };
      st.update = () => requestAnimationFrame(update);
      prev?.addEventListener('click', () => track.scrollBy({left: -stepOf(track, '.ctabs__card'), behavior: behaviour()}), {signal});
      next?.addEventListener('click', () => track.scrollBy({left: stepOf(track, '.ctabs__card'), behavior: behaviour()}), {signal});
      track.addEventListener('scroll', st.update, {passive: true, signal});
      const ro = new ResizeObserver(() => update()); ro.observe(track); signal.addEventListener('abort', () => ro.disconnect());
      draggable(track, signal); keys(track, '.ctabs__card', signal);
    },
  };


  /* Accent words: the heading's own rich text with each match of the phrase wrapped in a span. */
  function accent(el, html, phrase, cls, st) {
    if (!el || !api()) return;
    const key = JSON.stringify([html ?? '', phrase ?? '']);
    if (st.rich.get(el) === key) return;
    api().rich(el, String(html ?? ''), {rich: new WeakMap()});
    const words = String(phrase ?? '').trim();
    if (words) {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
      while (walk.nextNode()) nodes.push(walk.currentNode);
      for (const node of nodes) {
        const parts = node.textContent.split(words);
        if (parts.length < 2) continue;
        const frag = document.createDocumentFragment();
        parts.forEach((part, i) => { if (i) { const span = document.createElement('span'); span.className = cls; span.textContent = words; frag.append(span); } if (part) frag.append(document.createTextNode(part)); });
        node.replaceWith(frag);
      }
    }
    st.rich.set(el, key);
  }
  /* A creator's own SVG code, kept to SVG drawing elements. */
  function svgCode(holder, code) {
    const t = document.createElement('template');
    t.innerHTML = String(code || '');
    const svg = t.content.querySelector('svg');
    if (!svg) return holder.replaceChildren();
    svg.querySelectorAll('script, foreignObject, style, a').forEach(n => n.remove());
    for (const n of [svg, ...svg.querySelectorAll('*')]) for (const a of [...n.attributes]) if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name);
    holder.replaceChildren(svg);
  }
  const iconKey = b => { const source = b.icon_source || 'icon'; return JSON.stringify([source, source === 'icon' ? b.icon : '', source === 'image' ? src(b.image) : '', source === 'svg' ? b.svg_code : '']); };
  /* the server drew each benefit icon: remember what it drew */
  const iconKeys = (root, st, sel) => { for (const el of root.querySelectorAll('[data-fc-type]')) { const h = el.querySelector(sel); if (h) h.dataset.fcKey = iconKey(st.block(el)); } };
  /* A benefit icon: none, a line icon from the section's library, a picture or SVG code. */
  function benefitIcon(root, holder, b, st, cover) {
    if (!holder) return;
    const source = b.icon_source || 'icon', key = iconKey(b);
    hide(holder, source === 'none');
    if (cover !== undefined) holder.classList.toggle('is-cover', !!cover && source === 'image' && !!src(b.image));
    if (holder.dataset.fcKey === key) return;
    holder.dataset.fcKey = key;
    if (source === 'image') { const url = src(b.image); if (!url) return holder.replaceChildren(); let img = holder.querySelector('img'); if (!img) { img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 40; img.height = 40; holder.replaceChildren(img); } if ((img.getAttribute('src') || '').split('?')[0] !== url.split('?')[0]) img.src = url; }
    else if (source === 'svg') svgCode(holder, b.svg_code);
    else if (source === 'icon') { delete holder.dataset.fcIcon; icon(root, holder, b.icon || 'none', st); }
    else holder.replaceChildren();
  }
  const margins = (s, p) => ({['--' + p + '-mt-d']: px(s.section_margin_top_desktop), ['--' + p + '-mb-d']: px(s.section_margin_bottom_desktop), ['--' + p + '-mt-m']: px(s.section_margin_top_mobile), ['--' + p + '-mb-m']: px(s.section_margin_bottom_mobile)});
  const pads = (s, p) => ({['--' + p + '-pt-d']: px(s.padding_top_desktop), ['--' + p + '-pb-d']: px(s.padding_bottom_desktop), ['--' + p + '-pt-m']: px(s.padding_top_mobile), ['--' + p + '-pb-m']: px(s.padding_bottom_mobile)});
  const SOFT = 'color-mix(in srgb, var(--color-text) 5%, var(--color-background))';
  const PH = {
    'how-to-use': 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Ccircle cx=%22172%22 cy=%22124%22 r=%2214%22 fill=%22%23888%22 fill-opacity=%22.35%22/%3E%3Cpath d=%22M140 192l40-46 25 28 20-18 35 36z%22 fill=%22%23888%22 fill-opacity=%22.35%22/%3E%3C/svg%3E',
    'product-benefits-2': 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22%3E%3Ccircle cx=%22172%22 cy=%22174%22 r=%2214%22 fill=%22%23888%22 fill-opacity=%22.35%22/%3E%3Cpath d=%22M140 242l40-46 25 28 20-18 35 36z%22 fill=%22%23888%22 fill-opacity=%22.35%22/%3E%3C/svg%3E',
    'product-benefits-3': 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 500%22%3E%3Ccircle cx=%22172%22 cy=%22224%22 r=%2214%22 fill=%22%23888%22 fill-opacity=%22.35%22/%3E%3Cpath d=%22M140 292l40-46 25 28 20-18 35 36z%22 fill=%22%23888%22 fill-opacity=%22.35%22/%3E%3C/svg%3E',
  };
  /* One picture that always exists: the chosen image, or the section's placeholder. */
  function framed(img, value, ph, alt) {
    if (!img) return;
    const url = src(value) || ph, cur = img.getAttribute('src') || '';
    if (cur !== url && cur.split('?')[0] !== url.split('?')[0]) { img.removeAttribute('srcset'); img.src = url; }
    if (value && typeof value === 'object' && value.width && value.height) { attr(img, 'width', value.width); attr(img, 'height', value.height); }
    flag(img, 'data-fc-ph', !src(value));
    attr(img, 'alt', src(value) ? alt : '');
  }

  /* ---------------------------------------------------------------- How To Use */
  const howToUse = {
    paint(root, st) {
      const s = st.s, on = bool(s.enable_custom_style), f = fonts(s, bool(s.enable_custom_fonts)), center = s.content_align === 'center';
      scheme(root, s); data(root, 'width', s.section_width || 'container'); data(root, 'carousel', bool(s.enable_mobile_carousel) ? 'true' : 'false'); own(root, 'font', bool(s.enable_custom_fonts));
      vars(root, {
        '--htu-bg': custom(on, s.section_bg, 'var(--gradient-background, var(--color-background))'), '--htu-media-bg': custom(on, s.image_bg, 'var(--color-background)'),
        '--htu-bc': custom(on, s.image_border_color, 'var(--color-border)'), '--htu-bw': bool(s.image_border) ? '1px' : '0px',
        '--htu-num-color': custom(on, s.number_color, 'var(--color-primary)'), '--htu-title-color': custom(on, s.title_color, 'var(--color-heading)'), '--htu-desc-color': custom(on, s.desc_color, 'var(--color-text)'),
        '--htu-hf': f.h, '--htu-bf': f.b, '--htu-cols': String(num(s.cols_desktop, 3)), '--htu-ipv': String(num(s.mobile_items_per_view, 1.1)),
        '--htu-cgap-d': px(s.col_gap_desktop), '--htu-rgap-d': px(s.gap_desktop), '--htu-cgap-m': px(s.col_gap_mobile), '--htu-rgap-m': px(s.gap_mobile),
        '--htu-align': center ? 'center' : 'left', '--htu-items': center ? 'center' : 'stretch', '--htu-justify': center ? 'center' : 'flex-start',
        '--htu-ratio': String(s.image_ratio || '4/3'), '--htu-fit': s.image_fit || 'cover', '--htu-radius': px(s.image_radius),
        '--htu-num-size': px(s.number_size, 22), '--htu-title-d': px(s.title_size_desktop, 20), '--htu-title-m': px(s.title_size_mobile, 18), '--htu-desc-d': px(s.desc_size_desktop, 16), '--htu-desc-m': px(s.desc_size_mobile, 15),
        ...pads(s, 'htu'), '--htu-mt': px(s.margin_top), '--htu-mb': px(s.margin_bottom),
      });
      for (const h of root.querySelectorAll('[data-fc-type="heading"]')) {
        const b = st.block(h), c = bool(b.enable_custom_style);
        accent(h, b.text, bool(b.enable_accent) ? b.accent_text : '', 'htu__accent', st); hide(h, blank(b.text));
        vars(h, {'--htu-h-align': b.align || 'center', '--htu-h-color': custom(c, b.color, 'var(--color-heading)'), '--htu-h-d': px(b.size_desktop, 40), '--htu-h-m': px(b.size_mobile, 28), '--htu-h-gap': px(b.gap_below),
          '--htu-acc-color': custom(c, b.accent_color, 'var(--color-primary)'), '--htu-acc-style': bool(b.accent_italic) ? 'italic' : 'normal'});
      }
      root.querySelectorAll('[data-fc-type="step"]').forEach((el, i) => {
        const b = st.block(el), t = el.querySelector('.htu__title'), d = el.querySelector('.htu__desc');
        text(el.querySelector('.htu__num'), blank(b.number) ? String(i + 1) : b.number);
        text(t, b.title); hide(t, blank(b.title)); rich(d, b.description, st); hide(d, blank(b.description));
        if ('image' in st.blockEdits(el) || 'title' in st.blockEdits(el)) framed(el.querySelector('.htu__img'), b.image, PH['how-to-use'], b.image?.alt || b.title || '');
      });
      data(root.querySelector('[data-htu-track]'), 'htuAutoplay', bool(s.enable_mobile_carousel) && bool(s.carousel_autoplay) ? String(Math.max(2, num(s.carousel_autoplay_speed, 4)) * 1000) : '0');
      st.autoplay?.();
    },
    start(root, st, signal) {
      const grid = root.querySelector('[data-htu-track]'), phone = matchMedia('(max-width: 767px)');
      let timer = 0, paused = false;
      const on = () => root.dataset.carousel === 'true' && phone.matches;
      const stop = () => { clearInterval(timer); timer = 0; };
      st.autoplay = () => {
        stop();
        if (on()) grid.tabIndex = 0; else grid.removeAttribute('tabindex');
        const delay = num(grid.dataset.htuAutoplay);
        if (!on() || !delay || reduce.matches || !st.near || document.hidden || paused) return;
        timer = setInterval(() => {
          if (!grid.isConnected) return stop();
          const max = grid.scrollWidth - grid.clientWidth;
          if (grid.scrollLeft >= max - 2) grid.scrollTo({left: 0, behavior: behaviour()}); else grid.scrollBy({left: stepOf(grid, '.htu__step'), behavior: behaviour()});
        }, delay);
      };
      st.timer = () => timer;
      for (const n of ['pointerdown', 'mouseenter', 'focusin', 'touchstart']) grid.addEventListener(n, () => { paused = true; stop(); }, {passive: true, signal});
      for (const n of ['mouseleave', 'focusout', 'touchend']) grid.addEventListener(n, () => { paused = false; st.autoplay(); }, {passive: true, signal});
      phone.addEventListener('change', () => st.autoplay(), {signal}); reduce.addEventListener('change', () => st.autoplay(), {signal});
      signal.addEventListener('abort', stop);
      keys(grid, '.htu__step', signal);
      st.autoplay();
    },
    visible(root, st) { st.autoplay?.(); },
  };

  /* ---------------------------------------------------------------- Benefits Bar 3 */
  const WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width'];
  const benefitsBar = {
    paint(root, st) {
      const s = st.s, on = bool(s.use_custom_background), f = fonts(s, bool(s.enable_custom_fonts));
      scheme(root, s); data(root, 'mobileLayout', s.mobile_layout || 'scroll'); own(root, 'font', bool(s.enable_custom_fonts));
      const inner = root.querySelector('.ihb__inner'), width = WIDTHS.includes(s.section_width) ? s.section_width : 'full_width';
      for (const w of WIDTHS) inner.classList.toggle(w, w === width);
      vars(root, {
        '--ihb-bg': custom(on, s.background_color, 'var(--gradient-background, var(--color-background))'), '--ihb-icon-color': custom(on, s.icon_color, 'var(--color-heading)'),
        '--ihb-text-color': custom(on, s.text_color, 'var(--color-text)'), '--ihb-accent-color': custom(on, s.accent_color, 'var(--color-heading)'),
        '--ihb-hf': f.h, '--ihb-bf': f.b, '--ihb-accent-h': px(s.accent_height, 6), '--ihb-stroke': String(num(s.icon_stroke, 1.6)),
        '--ihb-icon-d': px(s.icon_size, 40), '--ihb-icon-m': px(s.icon_size_mobile, 34), '--ihb-gap-d': px(s.item_gap_desktop, 28), '--ihb-gap-m': px(s.item_gap_mobile, 16),
        ...pads(s, 'ihb'), '--ihb-label-size': px(s.label_size, 16), '--ihb-top-w': String(s.label_top_weight || 400), '--ihb-bottom-w': String(s.label_bottom_weight || 700),
        '--ihb-mpv': String(num(s.mobile_per_view, 2.2)), '--ihb-malign': s.mobile_align || 'center', '--ihb-mjustify': s.mobile_align === 'flex-start' ? 'flex-start' : 'center',
        '--ihb-justify-d': bool(s.center_items) ? 'safe center' : 'safe flex-end',
      });
      hide(root.querySelector('.ihb__accent'), !bool(s.show_accent_bar));
      for (const h of root.querySelectorAll('[data-fc-type="heading"]')) {
        const b = st.block(h), w = !blank(b.heading_weight) && b.heading_weight !== 'theme', ls = num(b.heading_letter_spacing) !== 0;
        rich(h, b.heading, st); hide(h, blank(b.heading)); data(h, 'hideMobile', bool(b.heading_hide_mobile) ? 'true' : 'false');
        own(h, 'weight', w); own(h, 'size', ls);
        vars(h, {'--ihb-h-size': px(b.heading_size_desktop, 26), '--ihb-h-size-m': px(b.heading_size_mobile, 22), '--ihb-h-color': custom(bool(b.enable_custom_style), b.heading_color, 'var(--color-heading)'),
          '--ihb-h-weight': w ? String(b.heading_weight) : null, '--ihb-h-ls': ls ? px(b.heading_letter_spacing) : null, '--heading-text-transform': bool(b.heading_uppercase) ? 'uppercase' : null});
      }
      for (const el of root.querySelectorAll('[data-fc-type="item"]')) {
        const b = st.block(el), top = el.querySelector('.ihb__top'), bottom = el.querySelector('.ihb__bottom');
        text(top, b.top_label); hide(top, blank(b.top_label)); text(bottom, b.bottom_label); hide(bottom, blank(b.bottom_label)); hide(el.querySelector('.ihb__text'), blank(b.top_label) && blank(b.bottom_label));
        const holder = el.querySelector('.ihb__icon'), url = b.icon_source === 'image' ? src(b.custom_image) : '';
        if (url) { let img = holder.querySelector('img'); if (!img) { img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 40; img.height = 40; holder.replaceChildren(img); } const cur = img.getAttribute('src') || ''; if (cur.split('?')[0] !== url.split('?')[0]) { img.removeAttribute('srcset'); img.src = url; } }
        else { let svg = holder.querySelector('.ihb__svg'); if (!svg) { svg = document.createElement('span'); svg.className = 'ihb__svg'; holder.replaceChildren(svg); } icon(root, svg, b.icon || 'check', st); }
      }
      st.update?.();
    },
    start(root, st, signal) {
      const track = root.querySelector('[data-ihb-track]'), prev = root.querySelector('.ihb__arrow--prev'), next = root.querySelector('.ihb__arrow--next'), desk = matchMedia('(min-width: 992px)');
      if (!track || !prev || !next) return;
      const update = () => {
        if (!track.isConnected) return;
        const max = track.scrollWidth - track.clientWidth;
        if (!desk.matches || max <= 1) { hide(prev, true); hide(next, true); } else { hide(prev, track.scrollLeft <= 2); hide(next, track.scrollLeft >= max - 2); }
        const scrolls = max > 1; if (scrolls) track.tabIndex = 0; else track.removeAttribute('tabindex');
      };
      st.update = () => requestAnimationFrame(update);
      prev.addEventListener('click', () => track.scrollBy({left: -track.clientWidth * 0.7, behavior: behaviour()}), {signal});
      next.addEventListener('click', () => track.scrollBy({left: track.clientWidth * 0.7, behavior: behaviour()}), {signal});
      track.addEventListener('scroll', st.update, {passive: true, signal});
      desk.addEventListener('change', st.update, {signal});
      track.addEventListener('load', st.update, {capture: true, signal});
      const ro = new ResizeObserver(() => update()); ro.observe(track); signal.addEventListener('abort', () => ro.disconnect());
      keys(track, '.ihb__item', signal);
    },
  };

  /* ---------------------------------------------------------------- Count Up Banner */
  const groups = (n, sep) => { const v = Math.round(num(n)), s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, sep); return (v < 0 ? '-' : '') + s; };
  const countUp = {
    paint(root, st) {
      const s = st.s, on = bool(s.enable_custom_style), fo = bool(s.override_fonts), sep = bool(s.enable_dot_spacer) ? '.' : ',';
      scheme(root, s); data(root, 'width', s.section_width || 'full_width'); own(root, 'font', fo);
      const box = root.querySelector('.loudecoms-section'), img = src(s.section_background_image);
      data(box, 'image', img ? 'true' : 'false');
      const weight = {light: '300', normal: '400', bold: '700'}[s.count_font_weight] || null, align = s.count_alignment || 'center';
      const cbg = on && !blank(s.container_background_color) && typeof s.container_background_color === 'string' ? s.container_background_color : 'transparent';
      vars(root, {
        '--ns-bg': custom(on, s.section_background_custom_color, 'var(--color-background)'), '--ns-c-bg': cbg,
        '--ns-c-bc': custom(on, s.container_border_color, 'var(--color-border)'), '--ns-count-color': custom(on, s.count_color, 'var(--color-heading)'), '--ns-desc-color': custom(on, s.description_text_color, 'var(--color-text)'),
        '--ns-hf': (fo && fontOf(s.headline_font)) || 'var(--heading-font)', '--ns-bf': (fo && fontOf(s.text_font)) || 'var(--body-font)',
        '--ns-img': img ? 'url(' + JSON.stringify(img) + ')' : 'none', '--ns-img-size': s.section_background_size || 'cover', '--ns-img-bri': num(s.section_bg_image_brightness, 100) + '%',
        '--ns-c-radius': px(s.container_radius), '--ns-c-bw': px(s.container_border_size), '--ns-c-max': px(s.container_max_width, 1000),
        '--ns-c-py-d': px(s.container_padding_top_bottom), '--ns-c-px-d': px(s.container_padding_left_right), '--ns-c-py-m': px(s.mobile_container_padding_top_bottom), '--ns-c-px-m': px(s.mobile_container_padding_left_right),
        '--ns-pt-d': px(s.section_padding_top), '--ns-pb-d': px(s.section_padding_bottom), '--ns-px-d': px(s.section_padding_left_right),
        '--ns-pt-m': px(s.mobile_section_padding_top), '--ns-pb-m': px(s.mobile_section_padding_bottom), '--ns-px-m': px(s.mobile_section_padding_left_right),
        ...margins(s, 'ns'), '--ns-head-gap': px(s.headline_spacing), '--ns-ta-d': s.text_alignment || 'center', '--ns-ta-m': s.mobile_text_alignment || 'center',
        '--ns-hgap-d': px(s.heading_subheading_gap), '--ns-hgap-m': px(s.mobile_heading_subheading_gap), '--ns-vgap-d': px(s.vertical_gap), '--ns-vgap-m': px(s.mobile_vertical_gap),
        '--ns-count-d': px(s.count_size, 48), '--ns-count-m': px(s.mobile_count_size, 48), '--ns-count-w': weight, '--ns-count-gap': px(s.count_spacing),
        '--ns-count-align': align, '--ns-count-justify': {left: 'flex-start', right: 'flex-end'}[align] || 'center',
        '--ns-desc-d': px(s.description_size, 15), '--ns-desc-m': px(s.mobile_description_size, 15), '--ns-plus-size': px(s.plus_size, 37),
      });
      for (const el of root.querySelectorAll('[data-fc-type="headline"]')) {
        const b = st.block(el), w = !blank(b.font_weight) && b.font_weight !== 'inherit', lh = !blank(b.line_height) && b.line_height !== 'inherit';
        rich(el, b.content, st); hide(el, blank(b.content)); own(el, 'weight', w); own(el, 'size', lh);
        vars(el, {'--ns-h-size-d': px(b.size, 32), '--ns-h-size-m': px(b.mobile_size, 31), '--ns-h-color': custom(bool(b.enable_custom_style), b.color, 'var(--color-heading)'), '--ns-h-weight': w ? String(b.font_weight) : null, '--ns-h-lh': lh ? String(b.line_height) : null});
      }
      for (const el of root.querySelectorAll('[data-fc-type="subheadline"]')) {
        const b = st.block(el), lh = !blank(b.line_height) && b.line_height !== 'inherit';
        rich(el, b.content, st); hide(el, blank(b.content));
        vars(el, {'--ns-s-size-d': px(b.size, 15), '--ns-s-size-m': px(b.mobile_size, 15), '--ns-s-color': custom(bool(b.enable_custom_style), b.color, 'var(--color-text)'), '--ns-s-lh': lh ? String(b.line_height) : null});
      }
      /* an edit shows the final numbers at once: a count never replays */
      if (Object.keys(st.edits).length || st.edits_b.size) st.done = true;
      for (const el of root.querySelectorAll('[data-fc-type="count_box"]')) {
        const b = st.block(el), n = el.querySelector('.loudecoms-count-up');
        data(n, 'value', String(Math.round(num(b.number))));
        text(n, groups(b.number, sep)); text(el.querySelector('p'), b.text);
        own(el.querySelector('h3'), 'weight', !!weight); hide(el.querySelector('.loudecoms-plus'), !bool(s.enable_plus_sign));
      }
    },
    start(root, st, signal) {
      /* Final numbers stay in the editor (and the library preview) and under reduced motion. */
      if (design() || reduce.matches) return;
      const items = [...root.querySelectorAll('.loudecoms-count-up')], sep = bool(st.s.enable_dot_spacer) ? '.' : ',';
      if (!items.length) return;
      st.done = false;
      for (const el of items) el.textContent = groups(0, sep);
      let frame = 0;
      const finish = () => { cancelAnimationFrame(frame); for (const el of items) el.textContent = groups(el.dataset.value, bool(st.s.enable_dot_spacer) ? '.' : ','); };
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if (st.done || reduce.matches) return finish();
        const t0 = performance.now();
        const step = now => {
          if (st.done || !root.isConnected) return finish();
          const t = Math.min((now - t0) / 2000, 1), e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          for (const el of items) { const v = groups(num(el.dataset.value) * e, sep); if (el.textContent !== v) el.textContent = v; }
          if (t < 1) frame = requestAnimationFrame(step); else { st.done = true; finish(); }
        };
        frame = requestAnimationFrame(step);
      }, {threshold: 0.5, rootMargin: '0px 0px -10% 0px'});
      io.observe(root.querySelector('.loudecoms-section') || root);
      reduce.addEventListener('change', () => { st.done = true; finish(); }, {signal});
      signal.addEventListener('abort', () => { io.disconnect(); cancelAnimationFrame(frame); });
    },
  };

  /* ---------------------------------------------------------------- Product Benefits 2 */
  const SHAPES = {square: '0px', rounded: '32px', 'extra-rounded': '56px', pill: '999px', circle: '50%', 'tab-top': '999px 999px 16px 16px', arch: '999px 999px 0 0', leaf: '0 80% 0 80%', blob: '60% 40% 50% 50% / 50% 60% 40% 50%'};
  const benefits2 = {
    init(root, st) { iconKeys(root, st, '.pb2c__tab-icon'); },
    paint(root, st) {
      const s = st.s, on = bool(s.enable_custom_style), f = fonts(s, bool(s.enable_custom_fonts)), align = ['left', 'right'].includes(s.content_alignment) ? s.content_alignment : 'center';
      scheme(root, s); data(root, 'width', s.section_width || 'container'); data(root, 'variant', s.style_variant || 'clean'); data(root, 'shape', s.image_shape || 'soft'); data(root, 'mobile', s.mobile_layout || 'image_middle');
      own(root, 'font', bool(s.enable_custom_fonts)); flag(root, 'data-ti-no-reveal', !bool(s.reveal));
      vars(root, {
        '--pb2-bg': custom(on, s.section_bg, 'var(--color-background)'), '--pb2-img-bg': custom(on, s.image_bg, SOFT), '--pb2-tab-bg': custom(on, s.tab_bg, SOFT),
        '--pb2-tab-line': custom(on, s.tab_border, 'var(--color-border)'), '--pb2-tab-accent': custom(on, s.tab_accent, 'var(--color-primary)'),
        '--pb2-ib-bg': custom(on, s.benefit_icon_box_bg, SOFT), '--pb2-icon-color': custom(on, s.benefit_icon_color, 'var(--color-heading)'),
        '--pb2-title-color': custom(on, s.benefit_title_color, 'var(--color-heading)'), '--pb2-desc-color': custom(on, s.benefit_desc_color, 'var(--color-text)'),
        '--pb2-hf': f.h, '--pb2-bf': f.b,
        '--pb2-radius': bool(s.image_radius_custom_enabled) ? px(s.image_radius_custom) : SHAPES[s.image_shape] || '16px', '--pb2-img-d': px(s.image_size_desktop, 460), '--pb2-img-m': px(s.image_size_mobile, 280),
        '--pb2-align': align, '--pb2-items': {left: 'flex-start', right: 'flex-end'}[align] || 'center', '--pb2-header-gap': px(s.gap_header_to_grid), '--pb2-block-gap': px(s.gap_between_header_blocks),
        '--pb2-gap': px(s.tab_gap), '--pb2-gap-d': px(s.tab_gap_desktop), '--pb2-tab-pad': px(s.tab_padding, 18), '--pb2-tab-radius': px(s.tab_radius),
        '--pb2-title-size': px(s.tab_title_size, 16), '--pb2-desc-size': px(s.tab_desc_size, 14), '--pb2-ib': px(s.icon_box_size, 44), '--pb2-ib-r': px(s.icon_box_radius), '--pb2-icon': px(s.icon_size, 22),
        ...pads(s, 'pb2'), ...margins(s, 'pb2'),
      });
      if ('image' in st.edits) framed(root.querySelector('[data-fc-media] img'), s.image, PH['product-benefits-2'], s.image?.alt || 'Product image');
      for (const el of root.querySelectorAll('[data-fc-type]')) {
        const b = st.block(el), c = bool(b.enable_custom_style), type = el.dataset.fcType;
        if (type === 'top_text') { text(el, b.text); hide(el, blank(b.text)); vars(el, {'--pb2-top-size': px(b.size, 13), '--pb2-top-color': custom(c, b.color, 'var(--color-primary)')}); }
        else if (type === 'heading') {
          const w = !blank(b.weight) && b.weight !== 'theme';
          accent(el, b.text, bool(b.enable_accent) ? b.accent_text : '', 'pb2c__accent', st); hide(el, blank(b.text)); own(el, 'weight', w);
          vars(el, {'--pb2-h-color': custom(c, b.color, 'var(--color-heading)'), '--pb2-h-d': px(b.size_desktop, 42), '--pb2-h-m': px(b.size_mobile, 28), '--pb2-h-weight': w ? String(b.weight) : null, '--pb2-acc-color': custom(c, b.accent_color, 'var(--color-primary)'), '--pb2-acc-style': bool(b.accent_italic) ? 'italic' : 'normal'});
        } else if (type === 'subheading') { text(el, b.text); hide(el, blank(b.text)); vars(el, {'--pb2-sub-size': px(b.size, 16), '--pb2-sub-color': custom(c, b.color, 'var(--color-text)')}); }
        else if (type === 'tab') {
          const t = el.querySelector('.pb2c__tab-title'), d = el.querySelector('.pb2c__tab-desc');
          text(t, b.title); hide(t, blank(b.title)); text(d, b.description); hide(d, blank(b.description));
          benefitIcon(root, el.querySelector('.pb2c__tab-icon'), b, st, bool(b.image_cover));
        }
      }
    },
  };

  /* ---------------------------------------------------------------- Product Benefits 3 */
  const RADII = {square: 0, rounded: 32, 'extra-rounded': 56};
  const benefits3 = {
    init(root, st) { iconKeys(root, st, '.pb3__item-icon'); },
    paint(root, st) {
      const s = st.s, on = bool(s.enable_custom_style), f = fonts(s, bool(s.enable_custom_fonts));
      scheme(root, s); data(root, 'width', s.section_width || 'container'); data(root, 'layout', s.layout || 'image_left'); data(root, 'panel', s.panel_style || 'glass');
      own(root, 'font', bool(s.enable_custom_fonts)); flag(root, 'data-ti-no-reveal', !bool(s.reveal));
      vars(root, {
        '--pb3-bg': custom(on, s.section_bg, 'var(--color-background)'), '--pb3-img-bg': custom(on, s.image_bg, SOFT), '--pb3-panel-bg': custom(on, s.panel_bg, SOFT), '--pb3-panel-line': custom(on, s.panel_border, 'var(--color-border)'),
        '--pb3-hf': f.h, '--pb3-bf': f.b,
        '--pb3-radius': px(bool(s.image_radius_custom_enabled) ? num(s.image_radius_custom) : RADII[s.image_shape] ?? 16), '--pb3-ar-d': String(s.image_aspect_desktop || '3 / 4'), '--pb3-ar-m': String(s.image_aspect_mobile || '4 / 5'),
        '--pb3-img-col': num(s.image_column_ratio, 40) + 'fr', '--pb3-txt-col': num(s.content_column_ratio, 60) + 'fr', '--pb3-cgap-d': px(s.column_gap_desktop), '--pb3-cgap-m': px(s.column_gap),
        '--pb3-content-gap': px(s.content_gap), '--pb3-align': s.text_align || 'left', '--pb3-hd-gap': px(s.gap_heading_to_desc), '--pb3-panel-top': px(s.gap_header_to_panel),
        '--pb3-panel-r': px(s.panel_radius), '--pb3-panel-pd': px(s.panel_padding_desktop), '--pb3-panel-pm': px(s.panel_padding_mobile),
        '--pb3-ib': px(s.icon_box_size, 36), '--pb3-ib-r': px(s.icon_box_radius), '--pb3-icon': px(s.icon_size, 20),
        '--pb3-title-size': px(s.benefit_title_size, 16), '--pb3-desc-size': px(s.benefit_desc_size, 14), '--pb3-bgap': px(s.benefit_gap), '--pb3-igap': px(s.benefit_inner_gap),
        ...pads(s, 'pb3'), ...margins(s, 'pb3'),
      });
      if ('image' in st.edits) framed(root.querySelector('[data-fc-media] > img'), s.image, PH['product-benefits-3'], s.image?.alt || 'Product image');
      for (const el of root.querySelectorAll('[data-fc-type]')) {
        const b = st.block(el), c = bool(b.enable_custom_style), type = el.dataset.fcType;
        if (type === 'heading') { const w = !blank(b.weight) && b.weight !== 'theme'; rich(el, b.text, st); hide(el, blank(b.text)); own(el, 'weight', w); vars(el, {'--pb3-h-color': custom(c, b.color, 'var(--color-heading)'), '--pb3-h-d': px(b.size_desktop, 44), '--pb3-h-m': px(b.size_mobile, 32), '--pb3-h-weight': w ? String(b.weight) : null}); }
        else if (type === 'description') { text(el, b.text); hide(el, blank(b.text)); vars(el, {'--pb3-d-color': custom(c, b.color, 'var(--color-text)'), '--pb3-d-d': px(b.size_desktop, 17), '--pb3-d-m': px(b.size_mobile, 15)}); }
        else if (type === 'benefit') {
          const t = el.querySelector('.pb3__item-title'), d = el.querySelector('.pb3__item-desc');
          text(t, b.title); hide(t, blank(b.title)); text(d, b.description); hide(d, blank(b.description));
          vars(el, {'--pb3-ic': custom(c, b.icon_color, 'var(--color-heading)'), '--pb3-ib-bg': custom(c, b.icon_box_bg, 'var(--color-background)'), '--pb3-t-color': custom(c, b.title_color, 'var(--color-heading)'), '--pb3-dc': custom(c, b.desc_color, 'var(--color-text)')});
          benefitIcon(root, el.querySelector('.pb3__item-icon'), b, st);
        }
      }
      st.play?.();
    },
    start(root, st, signal) {
      const video = root.querySelector('[data-pb3-video]');
      if (!video) return;
      video.muted = true;
      st.play = () => { if (!video.isConnected) return; if (reduce.matches || !st.near || document.hidden) { if (!video.paused) video.pause(); } else if (video.paused) video.play()?.catch(() => {}); };
      reduce.addEventListener('change', () => st.play(), {signal});
      st.play();
    },
    visible(root, st) { st.play?.(); },
  };

  const TYPES = {'content-tabs': contentTabs, 'how-to-use': howToUse, 'ingredients-highlight-bar': benefitsBar, 'number-stats': countUp, 'product-benefits-2': benefits2, 'product-benefits-3': benefits3};
  window.MateriaFeaturesCTypes = TYPES;

  /* ---------------------------------------------------------------- lifecycle */
  function read(root, st) {
    if (st.raw !== root.dataset.fcSettings) { st.raw = root.dataset.fcSettings; st.s = {...parse(st.raw), ...st.edits}; }
    for (const el of root.querySelectorAll('[data-fc-block][data-fc-settings]')) {
      const id = el.dataset.fcBlock;
      if (st.rawBlocks.get(id) !== el.dataset.fcSettings) { st.rawBlocks.set(id, el.dataset.fcSettings); st.blocks.set(id, {...parse(el.dataset.fcSettings), ...(st.edits_b.get(id) || {})}); }
    }
  }
  function paint(root, st) { if (!root.isConnected || !api()) return; read(root, st); TYPES[root.dataset.fcRoot]?.paint(root, st); }
  function drop(root, st) { st.abort.abort(); cancelAnimationFrame(st.frame); roots.delete(root); }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    document.querySelectorAll('[data-fc-root]').forEach(root => {
      if (roots.has(root)) { const old = roots.get(root); if (old.raw !== root.dataset.fcSettings) old.schedule(); return; }
      const type = TYPES[root.dataset.fcRoot];
      if (!type) return;
      const st = {s: {}, edits: {}, edits_b: new Map(), blocks: new Map(), rawBlocks: new Map(), rich: new WeakMap(), frame: 0, abort: new AbortController(), near: true};
      st.rich = new WeakMap();
      st.block = el => st.blocks.get(el.dataset.fcBlock) || {};
      st.blockEdits = el => st.edits_b.get(el.dataset.fcBlock) || {};
      st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; paint(root, st); }); };
      roots.set(root, st);
      read(root, st);
      /* the first paint is the server's: remember it so a live edit only changes what differs */
      root.querySelectorAll('[data-fc-type]').forEach(el => { const r = el.matches('[data-fc-rich]') ? el : null; if (r) st.rich.set(r, r.innerHTML); });
      try { type.init?.(root, st); type.start?.(root, st, st.abort.signal); } catch (e) { console.warn('live-features-c', e); }
      if (type.visible) {
        const io = new IntersectionObserver(entries => { const near = entries.at(-1).isIntersecting; if (near !== st.near) { st.near = near; type.visible(root, st, near); } }, {rootMargin: '100px 0px'});
        io.observe(root); st.abort.signal.addEventListener('abort', () => io.disconnect());
      }
      st.ready = true;
    });
  }
  const sectionOf = d => String(d?.id ?? d ?? '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', event => {
    const d = event.detail || {}, id = sectionOf(d.section || d.sectionId), block = d.block || d.blockId || d.block_id;
    if (!id || !d.settings || typeof d.settings !== 'object') return;
    for (const [root, st] of roots) {
      if (root.dataset.fcSection !== id) continue;
      if (block) { const key = String(block.id || block); st.edits_b.set(key, {...st.edits_b.get(key), ...d.settings}); st.blocks.set(key, {...st.blocks.get(key), ...d.settings}); }
      else { Object.assign(st.edits, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
      TYPES[root.dataset.fcRoot]?.edited?.(root, st, d.settings, block ? String(block.id || block) : null);
    }
  });
  document.addEventListener('visibilitychange', () => { for (const [root, st] of roots) TYPES[root.dataset.fcRoot]?.visible?.(root, st, st.near); });
  ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load'].forEach(name => document.addEventListener(name, scan));
  new MutationObserver(records => {
    if (records.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-fc-root]') || n.querySelector('[data-fc-root]'))))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true});
  window.MateriaFeaturesC = {scan, count: () => roots.size, listeners: () => [...roots.values()].filter(s => !s.abort.signal.aborted).length};
  scan();
})();
