/* Materia Themes. Live editor updates and hotspots for the products-c Products
   sections: Hotspot Image Product 2 (data-pch="hsp2"), Hotspot Image Product
   (data-pch="hss"), Product Shop The Look 2 (data-pch="stl") and the colours,
   type and spacing of Product Tabs Navigation ([data-collection-tab]; its tabs
   and reveal stay in collection-tab.js).

   Hotspots: a dot is a <button aria-expanded aria-controls> with a 44px hit
   area; its card opens next to it, is kept inside the screen on phones, one
   card is open per section, and Escape, a tap outside, the close button or
   leaving the dot (hover mode) closes it. In the builder, selecting a hotspot
   block opens its card.

   Live edits: every root carries its settings as JSON (data-pch-settings /
   data-ct-settings) and every block its own. storelib:settings-change merges
   the new values into that one instance and paints it in the next frame. A
   value is written only when it differs from what the element carries, so a
   picture is never reloaded and a running pulse never restarts for an
   unrelated edit. A product picked in a hotspot needs the builder's redraw
   (its picture, title and price come from the store); the redrawn section is
   set up once, in place. */
(() => {
  if (window.MateriaProductsC) return;
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const colorOr = (v) => color(v, '');
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };
  const font = (v, f) => {
    if (v && typeof v === 'object' && v.family) return v.family + ', ' + (v.fallback_families || 'sans-serif');
    const fam = v && api() && api().font ? api().font(v) : '';
    return !fam ? f : /^var\(|,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const desktop = matchMedia('(min-width: 750px)');
  const ctDesktop = matchMedia('(min-width: 768px)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- writers: change only what differs ---------- */
  function put(el, key, v) {
    if (!el) return;
    if (key.startsWith('--')) {
      if (v == null || v === '' || v === false) { if (el.style.getPropertyValue(key) !== '') el.style.removeProperty(key); }
      else if (el.style.getPropertyValue(key).trim() !== String(v)) el.style.setProperty(key, String(v));
    } else if (key[0] === '@') {
      const n = key.slice(1);
      if (v == null || v === false) { if (el.hasAttribute(n)) el.removeAttribute(n); }
      else { const s = v === true ? '' : String(v); if (el.getAttribute(n) !== s) el.setAttribute(n, s); }
    } else if (key === 'hidden') { if (el.hidden !== !!v) el.hidden = !!v; }
    else if (key === 'text') { const s = v == null ? '' : String(v); if (el.textContent !== s) el.textContent = s; }
    else if (key === 'rich') rich(el, v);
    else if (key === 'scheme') { if (typeof v === 'string' && /^[\w-]+$/.test(v) && !el.classList.contains('color-' + v)) { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); } }
    else if (key === 'src') { if (v && el.getAttribute('src') !== v) { el.removeAttribute('srcset'); el.src = v; } }
  }
  const richMemo = new WeakMap();
  function rich(el, value) {
    const v = value == null ? '' : String(value);
    if (richMemo.get(el) === v) return;
    if (richMemo.has(el) || el.innerHTML.trim() !== v.trim()) {
      if (api() && api().rich) api().rich(el, v, {rich: new WeakMap()});
      else el.textContent = v.replace(/<[^>]*>/g, '');
    }
    richMemo.set(el, v);
  }
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  const scheme = s => s.color_scheme && s.color_scheme.id || s.color_scheme;
  const fonts = (s, root) => { const on = bool(s.enable_custom_fonts); put(root, '--pch-hf', on ? font(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)'); put(root, '--pch-bf', on ? font(s.body_font, 'var(--body-font)') : 'var(--body-font)'); };
  const pick = (own, v, f) => own ? color(v, f) : f;
  function cta(el, own, bg, text) {
    if (!el) return;
    const b = own ? colorOr(bg) : '', t = own ? colorOr(text) : '';
    put(el, '--mb-bg', b); put(el, '--mb-border', b); put(el, '--mb-text', t);
  }
  function shows(root, s) { for (const el of root.querySelectorAll('[data-pch-show]')) put(el, '@data-pch-hide', !bool(s[el.dataset.pchShow])); }
  function texts(root, s) {
    for (const el of root.querySelectorAll('[data-pch-text]')) {
      const v = s[el.dataset.pchText];
      put(el, 'text', v == null ? '' : v);
      if (el.matches('[data-pch-cta]')) put(el, 'hidden', blank(v));
    }
  }
  function mainImage(img, v, st) {
    if (!img) return;
    if (!st.placeholders.has(img)) st.placeholders.set(img, img.getAttribute('src'));
    const src = url(v, true);
    if (src) put(img, 'src', src); else if (v === '' || v == null) put(img, 'src', st.root.dataset.pchPlaceholder || st.placeholders.get(img));
    if (v && typeof v === 'object' && v.alt != null) img.alt = v.alt;
  }

  /* ---------- per section ---------- */
  const TYPES = {
    hsp2(st) {
      const {root, s} = st, own = bool(s.enable_custom_style);
      put(root, 'scheme', scheme(s));
      put(root, '@data-width', s.section_width || 'full_width');
      put(root, '@data-pulse', s.show_pulse === false || s.show_pulse === 'false' ? 'false' : 'true');
      put(root, '@data-pch-mode', s.interaction_mode || 'click');
      const align = s.text_align || 'center', ard = s.image_aspect_desktop || '16 / 9', arm = s.image_aspect_mobile || '4 / 5';
      const vars = {
        '--pch-pt': px(s.padding_top), '--pch-pb': px(s.padding_bottom), '--pch-px-d': px(s.side_padding_desktop), '--pch-px-m': px(s.side_padding_mobile),
        '--pch-bg': pick(own, s.section_bg, 'var(--gradient-background, var(--color-background))'),
        '--pch-align': align, '--pch-items': align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center', '--pch-head-gap': px(s.head_gap),
        '--pch-ar-d': ard, '--pch-ar-m': arm, '--pch-ba-d': 'calc(' + ard + ')', '--pch-ba-m': 'calc(' + arm + ')',
        '--pch-radius': px(s.image_radius), '--pch-img-bg': pick(own, s.image_bg, 'var(--color-border)'),
        '--pch-dot': px(s.dot_size, 32), '--pch-dot-bg': pick(own, s.dot_bg, 'var(--color-background)'), '--pch-dot-ink': pick(own, s.dot_color, 'var(--color-heading)'), '--pch-dot-line': pick(own, s.dot_border, 'var(--color-border)'), '--pch-pulse': pick(own, s.dot_pulse_color, 'var(--color-background)'),
        '--pch-pop-w': px(s.pop_width, 260), '--pch-pop-r': px(s.pop_radius, 14), '--pch-pop-bg': pick(own, s.pop_bg, 'var(--color-background)'), '--pch-pop-ink': pick(own, s.pop_color, 'var(--color-text)'), '--pch-title': pick(own, s.pop_title_color, 'var(--color-heading)'), '--pch-price': pick(own, s.pop_price_color, 'var(--color-text)'),
      };
      for (const k in vars) put(root, k, vars[k]);
      fonts(s, root);
      const img = root.querySelector('.hsp2__img');
      if (st.changed.has('image')) { mainImage(img, s.image, st); const a = s.image && (s.image.aspect_ratio || (s.image.width && s.image.height && s.image.width / s.image.height)); if (a) put(root, '--pch-ia', String(+a)); else if (!s.image) put(root, '--pch-ia', '1.3333'); }
      shows(root, s); texts(root, s);
      for (const el of root.querySelectorAll('[data-pch-cta]')) cta(el, own, s.pop_cta_bg, s.pop_cta_color);
      let any = false;
      for (const el of root.querySelectorAll('.hsp2__head [data-pch-block]')) {
        const b = st.block(el), mine = bool(b.enable_custom_style), type = el.dataset.pchType;
        put(el, 'rich', b.text || ''); put(el, 'hidden', blank(b.text)); if (!blank(b.text)) any = true;
        if (type === 'eyebrow') { put(el, '--b-c', pick(mine, b.color, 'var(--color-text)')); put(el, '--b-fs', mine ? px(b.size, 12) : '12px'); put(el, '--b-ls', mine ? num(b.letter_spacing, .2) + 'em' : '.2em'); }
        if (type === 'heading') { put(el, '--b-c', pick(mine, b.color, 'var(--color-heading)')); put(el, '--b-fs-d', mine ? px(b.size_desktop, 44) : null); put(el, '--b-fs-m', mine ? px(b.size_mobile, 28) : null); }
        if (type === 'subheading') { put(el, '--b-c', pick(mine, b.color, 'var(--color-text)')); put(el, '--b-max', px(b.max_width, 560)); put(el, '--b-fs', mine ? px(b.size, 15) : null); }
      }
      put(root.querySelector('.hsp2__head'), 'hidden', !any);
      for (const spot of root.querySelectorAll('[data-pch-spot]')) { const b = st.block(spot); put(spot, '--x', num(b.position_x, 50) + '%'); put(spot, '--y', num(b.position_y, 50) + '%'); }
    },
    stl(st) {
      const {root, s} = st, own = bool(s.enable_custom_style);
      put(root, 'scheme', scheme(s));
      put(root, '@data-width', s.width || 'fluid_container');
      put(root, '@data-pulse', bool(s.pulse) ? 'true' : 'false');
      put(root, '@data-labels', bool(s.show_labels) ? 'true' : 'false');
      put(root, '@data-pch-mode', s.interaction_mode || 'click');
      const vars = {
        '--pch-pt': px(s.padding_top), '--pch-pb': px(s.padding_bottom), '--pch-bg': pick(own, s.section_bg, 'var(--gradient-background, var(--color-background))'),
        '--pch-dot': px(s.dot_size, 18), '--pch-dot-bg': pick(own, s.dot_color, 'var(--color-background)'), '--pch-pop-bg': pick(own, s.card_bg, 'var(--color-background)'), '--pch-pop-ink': pick(own, s.card_text, 'var(--color-text)'), '--pch-title': pick(own, s.card_title, 'var(--color-heading)'), '--pch-line': pick(own, s.card_border, 'var(--color-border)'),
        '--pch-radius': px(s.image_radius),
      };
      for (const k in vars) put(root, k, vars[k]);
      fonts(s, root);
      if (st.changed.has('image')) mainImage(root.querySelector('.stl__img--desktop'), s.image, st);
      if (st.changed.has('image_mobile')) { mainImage(root.querySelector('.stl__img--mobile'), s.image_mobile, st); put(root, '@data-has-mobile', root.querySelector('.stl__img--mobile') && s.image_mobile ? 'true' : 'false'); }
      shows(root, s); texts(root, s);
      for (const el of root.querySelectorAll('[data-pch-cta]')) cta(el, own, s.button_bg, s.button_text);
      for (const spot of root.querySelectorAll('[data-pch-spot]')) {
        const b = st.block(spot), label = b.custom_label || b.title || 'Choose a product';
        for (const k of ['x_d', 'y_d', 'x_m', 'y_m']) put(spot, '--' + k.replace('_', '-'), num(b[k], 50) + '%');
        put(spot, '@data-flip-d', num(b.x_d, 50) > 50); put(spot, '@data-flip-m', num(b.x_m, 50) > 50);
        put(spot.querySelector('[data-pch-label]'), 'text', label); put(spot.querySelector('[data-pch-dot-label]'), 'text', label);
      }
    },
    hss(st) {
      const {root, s} = st, own = bool(s.enable_custom_style), full = bool(s.is_fullwidth);
      put(root, 'scheme', scheme(s));
      put(root, '@data-pch-mode', s.interaction_mode || 'hover');
      const vars = {
        '--pch-pt-d': px(s.section_padding_top), '--pch-pb-d': px(s.section_padding_bottom), '--pch-pt-m': px(s.section_padding_top_mobile), '--pch-pb-m': px(s.section_padding_bottom_mobile),
        '--pch-max': full ? 'none' : px(s.container_max_width, 1350), '--pch-gutter': full ? '0px' : '20px',
        '--pch-bg': pick(own, s.background_color, 'var(--gradient-background, var(--color-background))'), '--pch-heading': pick(own, s.text_color, 'var(--color-heading)'), '--pch-text': pick(own, s.text_color, 'var(--color-text)'),
        '--pch-pop-bg': pick(own, s.popup_bg_color, 'var(--color-background)'), '--pch-title': pick(own, s.product_title_color, 'var(--color-heading)'), '--pch-price': pick(own, s.price_color, 'var(--color-text)'), '--pch-accent': pick(own, s.accent_color, 'var(--color-primary)'),
        '--pch-radius': px(s.image_radius), '--pch-m-ar': num(s.custom_mobile_image_width, 400) + ' / ' + num(s.custom_mobile_image_height, 400),
      };
      for (const k in vars) put(root, k, vars[k]);
      fonts(s, root);
      const mobile = root.querySelector('.hss__img--mobile');
      put(root, '@data-mobile-image', bool(s.enable_custom_mobile_image) && mobile ? 'true' : 'false');
      const img = root.querySelector('.hss__img--desktop');
      if (st.changed.has('background_image')) mainImage(img, s.background_image, st);
      if (st.changed.has('custom_mobile_image')) mainImage(mobile, s.custom_mobile_image, st);
      if (st.changed.has('lazyload')) for (const el of root.querySelectorAll('.hss__img')) put(el, '@loading', s.lazyload === false || s.lazyload === 'false' ? 'eager' : 'lazy');
      texts(root, s);
      for (const el of root.querySelectorAll('.hss__btn')) cta(el, own, s.accent_color, s.button_text_color);
      for (const el of root.querySelectorAll('.hss__btn--choose')) put(el, '--mb-weight', s.choose_text_font_weight === 'bold' ? '700' : null);
      for (const el of root.querySelectorAll('.hss__head')) {
        const b = st.block(el), mine = bool(b.enable_custom_style);
        put(el, '--b-align', b.text_align || 'center'); put(el, '--b-c', pick(mine, b.heading_text_color, 'var(--pch-heading)')); put(el, '--b-c2', pick(mine, b.subheading_text_color, 'var(--pch-text)'));
        put(el, '--b-fs', mine ? px(b.heading_font_size, 32) : null); put(el, '--b-w', bool(b.enable_custom_font_weight) ? String(b.heading_font_weight || 400) : null);
        for (const part of el.querySelectorAll('[data-pch-rich]')) { const v = b[part.dataset.pchRich]; put(part, 'rich', v || ''); put(part, 'hidden', blank(v)); }
        put(el, 'hidden', blank(b.heading_text) && blank(b.section_text));
      }
      for (const spot of root.querySelectorAll('[data-pch-spot]')) {
        const b = st.block(spot);
        put(spot, '--x-d', num(b.desktop_h_position, 50) + '%'); put(spot, '--y-d', num(b.desktop_v_position, 50) + '%'); put(spot, '--x-m', num(b.mobile_h_position, 50) + '%'); put(spot, '--y-m', num(b.mobile_v_position, 50) + '%');
      }
    },
    ct(st) {
      const {root, s} = st, custom = bool(s.enable_custom_styling);
      const hEl = root.querySelector('[data-ct-type="heading"]'), sEl = root.querySelector('[data-ct-type="subheading"]');
      const hb = hEl ? st.block(hEl) : {}, sb = sEl ? st.block(sEl) : {};
      const hc = hEl && bool(hb.custom_style), sc = sEl && bool(sb.custom_style);
      const style = s.tab_style || 'pill', boxed = style === 'pill' || style === 'button';
      const legacy = {h1: 'h1', h2: 'h2', h3: 'h3'}[hb.heading_size] || 'h2';
      const hStyle = hb.text_style && hb.text_style !== 'medium' ? {large: 'h1', small: 'h3'}[hb.text_style] || 'h2' : legacy;
      put(root, 'scheme', scheme(s));
      const attrs = {'data-ct-width': s.section_width, 'data-ct-h': hEl ? hStyle : 'h2', 'data-ct-s': sEl ? sb.text_size || 'body' : 'body', 'data-ct-align': s.content_alignment || 'center', 'data-ct-tabs-align': s.tabs_alignment || 'center', 'data-ct-style': style, 'data-ct-switch': s.tab_switch_animation || 'fade', 'data-ct-hc': !!hc, 'data-ct-sc': !!sc, 'data-ct-line': bool(s.show_nav_bottom_border), 'data-ct-full': bool(s.tabs_full_width), 'data-ct-custom': custom, 'data-ct-hover-bg': custom && !!colorOr(s.tab_hover_bg_color), 'data-ct-hover-text': custom && !!colorOr(s.tab_hover_text_color)};
      for (const k in attrs) put(root, '@' + k, attrs[k]);
      const c = v => custom ? colorOr(v) : '';
      const bwOn = num(s.tab_checked_border_thickness);
      const vars = {
        '--ct-pt': px(s.padding_top, 30), '--ct-pb': px(s.padding_bottom, 30), '--ct-align': s.content_alignment || 'center',
        '--ct-hgap-m': px(s.vertical_gap_subheading_section_mobile, 18), '--ct-hgap-d': px(s.vertical_gap_subheading_section_desktop, 25), '--ct-hsgap': px(s.vertical_gap_heading_subheading, 10), '--ct-s-max': px(sb.max_width, 640),
        '--ct-h-weight': hc ? hb.heading_font_weight || '700' : null, '--ct-h-size-m': hc ? px(hb.heading_font_size_mobile, 24) : null, '--ct-h-size-d': hc ? px(hb.heading_font_size_desktop, 28) : null,
        '--ct-s-weight': sc ? sb.subheading_font_weight || '400' : null, '--ct-s-size-m': sc ? px(sb.subheading_font_size_mobile, 14) : null, '--ct-s-size-d': sc ? px(sb.subheading_font_size_desktop, 16) : null,
        '--ct-heading-color': hc ? colorOr(hb.heading_color) : null, '--ct-sub-color': sc ? colorOr(sb.subheading_color) : null,
        '--ct-tab-gap': px(s.tab_gap, 10), '--ct-tab-mb': px(s.gap_tabs_to_products, 30),
        '--ct-line-w': bool(s.show_nav_bottom_border) ? px(s.nav_bottom_border_thickness, 1) : null, '--ct-line-color': bool(s.show_nav_bottom_border) ? c(s.nav_bottom_border_color) : null,
        '--ct-tab-py': px(s.tab_padding_y, 10), '--ct-tab-px': px(s.tab_padding_x, 22),
        '--ct-tab-fs': custom ? px(s.tab_font_size, 14) : null, '--ct-tab-fw': custom ? String(s.tab_font_weight || 500) : null,
        '--ct-tab-text': c(s.tab_unchecked_text_color), '--ct-tab-text-on': c(s.tab_checked_text_color), '--ct-tab-border-on': c(s.tab_checked_border_color),
        '--ct-bw-off': boxed ? px(s.tab_unchecked_border_thickness) : null, '--ct-bw-on': boxed ? px(bwOn) : null, '--ct-radius': boxed ? (style === 'pill' ? '999px' : px(s.tab_border_radius, 8)) : null,
        '--ct-tab-bg': boxed ? c(s.tab_unchecked_bg_color) : null, '--ct-tab-border': boxed ? c(s.tab_unchecked_border_color) : null, '--ct-tab-bg-on': boxed ? c(s.tab_checked_bg_color) : null,
        '--ct-ul': style === 'underline' ? px(bwOn < 1 ? 2 : bwOn) : null,
        '--ct-hover-bg': attrs['data-ct-hover-bg'] ? colorOr(s.tab_hover_bg_color) : null, '--ct-hover-text': attrs['data-ct-hover-text'] ? colorOr(s.tab_hover_text_color) : null,
        '--ct-icon': px(s.tab_icon_size, 22), '--ct-empty-color': c(s.empty_state_text_color), '--ct-empty-fs': px(s.empty_state_font_size, 16), '--ct-loadmore-gap': px(s.gap_loadmore, 30),
      };
      for (const k in vars) put(root, k, vars[k]);
      if (hEl) { put(hEl, 'rich', hb.heading || ''); put(hEl, 'hidden', blank(hb.heading)); }
      if (sEl) { put(sEl, 'rich', sb.subheading || ''); put(sEl, 'hidden', blank(sb.subheading)); }
      for (const btn of root.querySelectorAll('[data-ct-type="collection"]')) {
        const b = st.block(btn), t = btn.querySelector('.ti-tabs__btn-text'), title = b.collection_title || btn.dataset.ctTitle || '';
        put(t, 'text', title); put(t, '@data-text', title);
        put(btn.querySelector('.ti-tabs__icon'), 'hidden', !bool(s.show_tab_icon));
        put(btn.querySelector('.ti-tabs__count'), 'hidden', !bool(s.show_product_count));
      }
      for (const grid of root.querySelectorAll('grid-custom')) {
        const per = Math.max(1, num(s.items_per_row, 4)), perM = num(s.items_per_row_mobile, 2), gap = num(s.column_gap, 20);
        put(grid, '--col-desktop', String(per)); put(grid, '--col-number', String(perM)); put(grid, '--col-mobile', String(perM)); put(grid, '--col-tablet', String(Math.min(per, 3)));
        put(grid, '--col-gap', gap < 15 ? gap + 'px' : '15px'); put(grid, '--col-gap-desktop', gap < 15 ? null : gap + 'px');
      }
      for (const el of root.querySelectorAll('.ti-tabs__empty')) if (s.empty_state_message) put(el, 'text', s.empty_state_message);
      const lm = root.querySelector('.load-more');
      if (lm && !root.querySelector('[data-ct-type="view_more"]')) { put(lm.querySelector('.hidden-on-load'), 'text', s.button_label || ''); }
    },
  };

  /* ---------- hotspots ---------- */
  function close(st, focus) {
    const spot = st.open;
    if (!spot) return;
    st.open = null;
    clearTimeout(st.leave);
    const dot = spot.querySelector('[data-pch-dot]'), pop = spot.querySelector('[data-pch-pop]');
    if (pop) pop.hidden = true;
    if (dot) dot.setAttribute('aria-expanded', 'false');
    spot.removeAttribute('data-open');
    if (focus && dot) dot.focus({preventScroll: true});
  }
  function place(st, spot, pop) {
    pop.style.removeProperty('--pch-shift');
    pop.removeAttribute('data-place');
    const vw = document.documentElement.clientWidth, edge = 8;
    const stage = (st.root.querySelector('[data-pch-stage]') || st.root).getBoundingClientRect();
    let r = pop.getBoundingClientRect();
    if (st.root.dataset.pchPlace === 'side') {
      if (r.right > vw - edge) { pop.setAttribute('data-place', 'left'); r = pop.getBoundingClientRect(); }
      if (r.left < edge) { const s = spot.getBoundingClientRect(); pop.setAttribute('data-place', s.top - stage.top > stage.bottom - s.bottom && s.top + scrollY > r.height + 30 ? 'above' : 'below'); r = pop.getBoundingClientRect(); }
      else return;
    } else {
      const s = spot.getBoundingClientRect(), above = s.top - stage.top, below = stage.bottom - s.bottom;
      if ((r.top < stage.top && below >= above) || r.top + scrollY < 0) { pop.setAttribute('data-place', 'below'); r = pop.getBoundingClientRect(); }
    }
    let shift = 0;
    if (r.left < edge) shift = edge - r.left; else if (r.right > vw - edge) shift = vw - edge - r.right;
    if (shift) pop.style.setProperty('--pch-shift', Math.round(shift) + 'px');
  }
  function open(st, spot) {
    if (st.open === spot || spot.hidden) return;
    close(st, false);
    const dot = spot.querySelector('[data-pch-dot]'), pop = spot.querySelector('[data-pch-pop]');
    if (!dot || !pop) return;
    st.open = spot;
    pop.hidden = false;
    spot.setAttribute('data-open', '');
    dot.setAttribute('aria-expanded', 'true');
    place(st, spot, pop);
  }
  function bindHotspots(st) {
    const {root} = st, on = (type, fn) => { root.addEventListener(type, fn); st.listeners++; };
    on('click', e => {
      const closeBtn = e.target.closest('[data-pch-close]');
      if (closeBtn && root.contains(closeBtn)) { close(st, true); return; }
      const dot = e.target.closest('[data-pch-dot]');
      if (!dot || !root.contains(dot)) return;
      e.preventDefault();
      const spot = dot.closest('[data-pch-spot]');
      if (st.open === spot && !(st.hoverOpened && Date.now() - st.hoverOpened < 400)) close(st, false); else open(st, spot);
      st.hoverOpened = 0;
    });
    const hoverable = () => root.dataset.pchMode === 'hover' && fine.matches;
    on('pointerover', e => {
      if (!hoverable() || e.pointerType === 'touch') return;
      const spot = e.target.closest('[data-pch-spot]');
      if (!spot || !root.contains(spot)) return;
      clearTimeout(st.leave);
      if (st.open !== spot && e.target.closest('[data-pch-dot]')) { open(st, spot); st.hoverOpened = Date.now(); }
    });
    on('pointerout', e => {
      if (!hoverable() || !st.open || e.pointerType === 'touch') return;
      if (e.relatedTarget && st.open.contains(e.relatedTarget)) return;
      if (!st.open.contains(e.target)) return;
      clearTimeout(st.leave);
      st.leave = setTimeout(() => { if (st.open && !st.open.matches(':hover') && !st.open.contains(document.activeElement)) close(st, false); }, 180);
    });
    on('shopify:block:select', e => { const spot = e.target.closest && e.target.closest('[data-pch-spot]'); if (spot && root.contains(spot)) open(st, spot); });
    on('shopify:block:deselect', () => close(st, false));
  }
  document.addEventListener('pointerdown', e => { for (const st of roots.values()) if (st.open && !st.open.contains(e.target)) close(st, false); }, true);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    for (const st of roots.values()) if (st.open) { const inside = st.open.contains(document.activeElement) || document.activeElement === document.body; close(st, inside); }
  });
  document.addEventListener('focusin', e => { for (const st of roots.values()) if (st.open && !st.open.contains(e.target)) close(st, false); });

  /* ---------- lifecycle ---------- */
  const SEL = '[data-pch],[data-collection-tab][data-ct-section]';
  function schedule(st) { if (st.frame) return; st.frame = requestAnimationFrame(() => { st.frame = 0; if (!st.root.isConnected) return; paint(st); }); }
  function paint(st) {
    if (st.raw !== st.attr()) { st.raw = st.attr(); st.s = {...parse(st.root.dataset[st.kind === 'ct' ? 'ctDefaults' : 'pchDefaults']), ...parse(st.raw), ...st.pending}; }
    TYPES[st.kind](st);
    st.changed.clear();
    st.paints++;
  }
  function setup(root) {
    const kind = root.dataset.pch || 'ct';
    if (!TYPES[kind]) return null;
    const ct = kind === 'ct';
    const st = {root, kind, frame: 0, open: null, leave: 0, listeners: 0, paints: 0, pending: {}, changed: new Set(), blocks: new Map(), placeholders: new WeakMap(), hoverOpened: 0};
    st.attr = () => root.getAttribute(ct ? 'data-ct-settings' : 'data-pch-settings');
    st.raw = st.attr();
    st.s = {...parse(root.dataset[ct ? 'ctDefaults' : 'pchDefaults']), ...parse(st.raw)};
    st.section = root.dataset[ct ? 'ctSection' : 'pchSection'];
    const bdefs = parse(root.dataset[ct ? 'ctBlockDefaults' : 'pchBlockDefaults']);
    st.block = el => {
      const id = el.dataset[ct ? 'ctBlock' : 'pchBlock'], raw = el.getAttribute(ct ? 'data-ct-block-settings' : 'data-pch-settings');
      let b = st.blocks.get(id);
      if (!b || b.raw !== raw) { b = {raw, s: {...(bdefs[el.dataset[ct ? 'ctType' : 'pchType']] || {}), ...parse(raw), ...((b && b.live) || {})}, live: (b && b.live) || {}}; st.blocks.set(id, b); }
      return b.s;
    };
    if (!ct) bindHotspots(st);
    roots.set(root, st);
    st.changed.clear();
    paint(st);
    return st;
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) { cancelAnimationFrame(st.frame); clearTimeout(st.leave); st.open = null; roots.delete(root); }
    for (const root of document.querySelectorAll(SEL)) if (!roots.has(root)) setup(root);
  }
  const idOf = v => v == null ? '' : String(typeof v === 'object' ? v.id ?? v.sectionId ?? '' : v).replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = idOf(d.section ?? d.sectionId);
    if (!id || !d.settings || typeof d.settings !== 'object') return;
    const blockId = idOf(d.block ?? d.blockId ?? d.block_id);
    for (const st of roots.values()) {
      if (st.section !== id || !st.root.isConnected) continue;
      if (blockId) {
        const el = [...st.root.querySelectorAll(st.kind === 'ct' ? '[data-ct-block]' : '[data-pch-block]')].find(n => n.dataset[st.kind === 'ct' ? 'ctBlock' : 'pchBlock'] === blockId);
        if (el) st.block(el);
        const b = st.blocks.get(blockId);
        if (b) { Object.assign(b.live, d.settings); Object.assign(b.s, d.settings); }
      } else {
        Object.assign(st.pending, d.settings); Object.assign(st.s, d.settings);
        for (const k of Object.keys(d.settings)) st.changed.add(k);
      }
      schedule(st);
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL));
  new MutationObserver(records => {
    let rescan = false;
    for (const r of records) {
      if (r.type === 'attributes') { const st = roots.get(r.target) || roots.get(r.target.closest && r.target.closest(SEL)); if (st) { if (r.target === st.root) st.pending = {}; schedule(st); } }
      else if ([...r.addedNodes, ...r.removedNodes].some(watched)) rescan = true;
    }
    if (rescan) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-pch-settings', 'data-ct-settings', 'data-ct-block-settings']});
  let wasDesktop = desktop.matches;
  desktop.addEventListener('change', () => { if (desktop.matches === wasDesktop) return; wasDesktop = desktop.matches; for (const st of roots.values()) if (st.open) close(st, false); });
  window.MateriaProductsC = {scan, stats: () => ({roots: roots.size, listeners: [...roots.values()].reduce((n, st) => n + st.listeners, 0), paints: [...roots.values()].map(st => st.paints)}), state: root => roots.get(root)};
  scan();
})();
