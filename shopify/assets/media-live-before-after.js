/* Materia Themes. Live editor updates and the comparison slider for the
   before/after Image and video sections: Before/After Images
   (data-bam-root="image"), Before and After Slider ("slider") and
   Before/After Slider 2 ("slider-2").
   - One controller per section root, kept in a Map; a root that leaves the
     page has its listeners aborted and its frames cancelled.
   - Settings arrive as storelib:settings-change for that section only and
     are painted once per frame. Values are CSS variables, data attributes,
     text and image sources, written only when they change, so an edit never
     reloads an image, rebuilds the slider or moves the handle.
   - The slider handle is a focusable role="slider": drag it with a pointer
     or touch, click the picture, or use the arrow keys, Page Up/Down, Home
     and End. Its position survives a server redraw of the section. */
(() => {
  if (window.MateriaBeforeAfterMedia) return;
  const roots = new Map(), memory = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const clamp = v => Math.min(100, Math.max(0, v));
  const api = () => window.MateriaHeroImageOne;
  const filled = v => typeof v === 'string' ? v.trim() !== '' : v != null && v !== false;
  const plain = v => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const col = (on, v, f) => on ? (api()?.color(v, f) || f) : f;
  const fam = (on, v, f) => { const x = on && v ? api()?.font(v) : ''; return x ? x + ', ' + f : f; };
  const imgUrl = v => api()?.url(v, true) || '';
  const sectionId = v => String(v && typeof v === 'object' ? v.id ?? '' : v ?? '').replace(/^shopify-section-/, '');

  /* Writers. put() keeps what was painted per element; the first paint only
     records it, because the Liquid output already shows those values. */
  function put(state, el, key, value) {
    if (!el) return;
    let map = state.vals.get(el);
    if (!map) state.vals.set(el, map = new Map());
    value = String(value);
    if (map.get(key) === value) return;
    map.set(key, value);
    if (!state.seeding) el.style.setProperty(key, value);
  }
  const inline = (el, key, value) => { if (!el) return; if (value === '' || value == null) { if (el.style.getPropertyValue(key)) el.style.removeProperty(key); } else if (el.style.getPropertyValue(key) !== String(value)) el.style.setProperty(key, String(value)); };
  const data = (el, key, value) => { if (el && el.dataset[key] !== String(value)) el.dataset[key] = String(value); };
  const attr = (el, key, value) => { if (!el) return; if (value == null) { if (el.hasAttribute(key)) el.removeAttribute(key); } else if (el.getAttribute(key) !== String(value)) el.setAttribute(key, String(value)); };
  const hide = (el, hidden) => { if (el && el.hidden !== !!hidden) el.hidden = !!hidden; };
  function once(state, el, key, value) {
    let map = state.seen.get(el);
    if (!map) state.seen.set(el, map = new Map());
    const next = JSON.stringify(value ?? null);
    if (!map.has(key)) { map.set(key, next); return state.seeding ? false : true; }
    if (map.get(key) === next) return false;
    map.set(key, next);
    return true;
  }
  function rich(state, el, value) { if (el && once(state, el, 'html', value) && api()) { state.rich.delete(el); api().rich(el, value || '', state); } }
  function text(state, el, value) { if (el && once(state, el, 'text', value) && el.textContent !== value) el.textContent = value; }
  function image(state, img, value, root) {
    if (!img || !once(state, img, 'src', value)) return;
    const next = imgUrl(value) || root.dataset.bamPlaceholder || img.getAttribute('src');
    if (img.getAttribute('src') === next) return;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    if (value && typeof value === 'object' && value.width && value.height) { img.width = value.width; img.height = value.height; }
    img.src = next;
  }
  const alt = (img, value, label) => attr(img, 'alt', filled(value) ? (value?.alt || label || '') : '');
  function retag(el, href) {
    const tag = href ? 'A' : 'BUTTON';
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      el = next;
    }
    if (href) { attr(el, 'href', href); attr(el, 'type', null); } else { attr(el, 'href', null); attr(el, 'type', 'button'); }
    return el;
  }
  /* --mb-* values the button-overrides snippet prints, in the same order. */
  function buttonVars(el, custom, c, shape) {
    const bg = custom ? api()?.color(c.bg, '') || '' : '', tx = custom ? api()?.color(c.text, '') || '' : '';
    const bd = custom ? api()?.color(c.border, '') || bg : '', hbg = custom ? api()?.color(c.hoverBg, '') || '' : '', htx = custom ? api()?.color(c.hoverText, '') || '' : '';
    inline(el, '--mb-bg', bg); inline(el, '--mb-text', tx); inline(el, '--mb-border', bd); inline(el, '--mb-hover-bg', hbg); inline(el, '--mb-hover-text', htx); inline(el, '--mb-hover-border', hbg);
    for (const k of ['radius', 'padding-y', 'padding-x', 'font-size', 'weight']) inline(el, '--mb-' + k, shape ? shape[k] ?? '' : '');
    inline(el, '--btn-border-width', shape ? shape.border ?? '' : '');
  }

  /* Shared section pieces: scheme, width, show on, margins, reset, reveal. */
  function common(root, state, s) {
    const scheme = s.color_scheme?.id || s.color_scheme;
    if (typeof scheme === 'string' && /^[\w-]+$/.test(scheme) && !root.classList.contains('color-' + scheme)) {
      for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c);
      root.classList.add('color-' + scheme);
    }
    data(root, 'width', s.section_width || 'full_width');
    const wrap = root.closest('[id^="shopify-section-"]') || root.parentElement;
    put(state, wrap, '--bam-mt-m', px(s.section_margin_top_mobile)); put(state, wrap, '--bam-mb-m', px(s.section_margin_bottom_mobile));
    put(state, wrap, '--bam-mt-d', px(s.section_margin_top_desktop)); put(state, wrap, '--bam-mb-d', px(s.section_margin_bottom_desktop));
    const reset = wrap?.querySelector(':scope > style[data-bam-reset-style]');
    if (reset) { const media = bool(s.reset_spacing) ? 'all' : 'not all'; if ((reset.getAttribute('media') || 'all') !== media) reset.setAttribute('media', media); }
    if ('reveal' in s && wrap) {
      let mark = wrap.querySelector(':scope > [data-ti-no-reveal]');
      if (s.reveal === false && !mark) { mark = document.createElement('span'); mark.dataset.tiNoReveal = ''; mark.hidden = true; wrap.prepend(mark); }
      else if (s.reveal !== false && mark) mark.remove();
    }
    return wrap;
  }
  function blocks(root, state, type) {
    const out = [];
    for (const el of root.querySelectorAll('[data-bam-block]')) {
      const id = el.dataset.bamBlock;
      if (!id) continue;
      if (state.rawBlocks.get(id) !== el.dataset.bamSettings) { if (state.rawBlocks.has(id)) state.liveBlocks.delete(id); state.rawBlocks.set(id, el.dataset.bamSettings); state.blocks.set(id, {...parse(el.dataset.bamSettings), ...state.liveBlocks.get(id)}); }
      out.push([el, {...state.blockDefaults[el.dataset.bamType || type], ...state.blocks.get(id)}]);
    }
    return out;
  }

  /* The comparison slider. */
  function position(state, now) {
    const apply = () => {
      state.posFrame = 0;
      const box = state.box, handle = state.handle;
      if (!box) return;
      const value = state.pos + '%';
      if (box.style.getPropertyValue('--bam-pos') !== value) box.style.setProperty('--bam-pos', value);
      attr(handle, 'aria-valuenow', Math.round(state.pos)); attr(handle, 'aria-valuetext', Math.round(state.pos) + '%');
    };
    if (now) { cancelAnimationFrame(state.posFrame); apply(); } else if (!state.posFrame) state.posFrame = requestAnimationFrame(apply);
  }
  function move(state, pos, now) {
    state.pos = Math.round(clamp(pos) * 10) / 10;
    memory.set(state.id, {pos: state.pos, start: state.start});
    position(state, now);
  }
  function startAt(state, start, now) {
    if (state.start === start) return;
    state.start = start;
    move(state, start, now);
  }
  function wire(root, state) {
    const box = state.box = root.querySelector('[data-bam-compare]'), handle = state.handle = box?.querySelector('[data-bam-handle]');
    if (!box || !handle) return;
    const signal = state.abort.signal, on = (el, name, fn, opts) => { el.addEventListener(name, fn, {...opts, signal}); state.listeners++; };
    let rect = null, pointer = null;
    const at = x => rect && rect.width ? (x - rect.left) / rect.width * 100 : state.pos;
    on(box, 'pointerdown', e => {
      if (e.button > 0 || pointer != null) return;
      rect = box.getBoundingClientRect();
      pointer = e.pointerId;
      try { box.setPointerCapture(pointer); } catch (_) {}
      box.classList.add('is-dragging');
      if (e.pointerType === 'mouse') e.preventDefault();
      if (document.activeElement !== handle) handle.focus({preventScroll: true});
      move(state, at(e.clientX));
    });
    on(box, 'pointermove', e => { if (e.pointerId === pointer) move(state, at(e.clientX)); });
    const end = e => { if (e.pointerId !== pointer) return; pointer = null; box.classList.remove('is-dragging'); try { box.releasePointerCapture(e.pointerId); } catch (_) {} };
    on(box, 'pointerup', end); on(box, 'pointercancel', end); on(box, 'lostpointercapture', end);
    on(box, 'dragstart', e => e.preventDefault());
    on(handle, 'keydown', e => {
      const step = e.shiftKey ? 10 : 1, rtl = getComputedStyle(box).direction === 'rtl' ? -1 : 1;
      const by = {ArrowLeft: -step * rtl, ArrowDown: -step, ArrowRight: step * rtl, ArrowUp: step, PageDown: -10, PageUp: 10}[e.key];
      let next;
      if (by != null) next = state.pos + by; else if (e.key === 'Home') next = 0; else if (e.key === 'End') next = 100; else return;
      e.preventDefault();
      move(state, next, true);
    });
  }
  function icon(root, state, knob, name) {
    if (!knob || knob.dataset.bamIconCurrent === name) return;
    const tpl = root.querySelector('template[data-bam-icon="' + CSS.escape(name) + '"]');
    if (!tpl) return;
    knob.replaceChildren(tpl.content.cloneNode(true));
    knob.dataset.bamIconCurrent = name;
  }

  /* Before/After Images */
  function paintImage(root, state, s) {
    common(root, state, s);
    const custom = bool(s.enable_custom_style), c = (v, f) => col(custom, v, f);
    const w = num(s.before_image_width, 570) > 0 ? num(s.before_image_width, 570) : 570, h = num(s.before_image_height, 460) > 0 ? num(s.before_image_height, 460) : 460;
    const vars = {
      '--bai-bg': c(s.background_color, 'var(--color-background)'), '--bai-before-color': c(s.before_text_color, 'var(--color-heading)'), '--bai-after-color': c(s.after_text_color, 'var(--color-heading)'),
      '--bai-font': fam(bool(s.enable_custom_fonts), s.body_font, 'var(--body-font)'), '--bai-max': px(s.content_max_width, 900), '--bai-gap-d': px(s.desktop_horizontal_gap), '--bai-gap-m': px(s.mobile_vertical_gap),
      '--bai-pair': px(s.pair_gap), '--bai-ratio': w + ' / ' + h, '--bai-radius': px(s.border_radius), '--bai-overlay': num(s.overlay_strength), '--bai-label-size': px(s.text_size, 57),
      '--bai-label-size-m': num(s.text_size, 57) / 1.5 + 'px', '--bai-label-pos-d': px(s.desktop_text_vertical_position), '--bai-label-pos-m': px(s.mobile_text_vertical_position), '--bai-pad-d': px(s.desktop_padding), '--bai-pad-m': px(s.mobile_padding),
    };
    for (const k in vars) put(state, root, k, vars[k]);
    data(root, 'shadow', s.image_shadow || 'none'); data(root, 'hover', s.hover_animation || 'none'); data(root, 'labels', s.show_text === false ? 'false' : 'true');
    for (const [el, b] of blocks(root, state, 'comparison')) {
      for (const side of ['before', 'after']) {
        const card = el.querySelector('.bai__card--' + side), img = card?.querySelector('[data-bam-image]'), label = b[side + '_text'] || (side === 'before' ? 'Before' : 'After');
        image(state, img, b[side + '_image'], root); alt(img, b[side + '_image'], label);
        text(state, card?.querySelector('[data-bam-text]'), label);
      }
      data(el.querySelector('.bai__card--before'), 'bw', bool(b.bw_before_image));
    }
  }

  /* Before and After Slider */
  function paintSlider(root, state, s) {
    common(root, state, s);
    const custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts), c = (v, f) => col(custom, v, f), q = sel => root.querySelector(sel);
    const ratio = s.media_aspect_ratio || '16 / 9', wide = ['21 / 9', '3 / 1'].includes(ratio) ? '3fr' : ['16 / 9', '3 / 2', '5 / 4'].includes(ratio) ? '2fr' : '1fr';
    const bg = imgUrl(s.section_background_image);
    const vars = {
      '--bas-bg': c(s.section_background_color, 'var(--color-background)'), '--bas-heading-color': c(s.headline_color, 'var(--color-heading)'), '--bas-text-color': c(s.content_text_color, 'var(--color-text)'),
      '--bas-label-bg': c(s.before_after_background_color, 'var(--color-background)'), '--bas-label-color': c(s.before_after_text_color, 'var(--color-heading)'), '--bam-line-color': c(s.bar_color, 'var(--color-heading)'),
      '--bam-knob-bg': c(s.circle_color, 'var(--color-background)'), '--bam-icon-color': c(s.circle_icon_color, 'var(--color-heading)'),
      '--bas-heading-font': fam(fonts, s.heading_font, 'var(--heading-font)'), '--bas-body-font': fam(fonts, s.body_font, 'var(--body-font)'),
      '--bas-heading-size-d': px(s.headline_size, 36), '--bas-heading-size-m': px(s.mobile_headline_size, 38), '--bas-heading-lh': s.headline_line_height || '1.0', '--bas-text-size': px(s.text_size, 17), '--bas-text-lh': s.text_line_height || '1.4',
      '--bas-align': s.text_alignment || 'center', '--bas-text-gap': px(s.headline_spacing), '--bas-el-gap': px(s.element_spacing), '--bas-col-gap': px(s.horizontal_gap),
      '--bas-cols': s.media_location === 'right' ? '1fr ' + wide : wide + ' 1fr', '--bas-max': px(s.container_max_width, 850),
      '--bas-pad-y-d': px(s.section_padding_top_bottom), '--bas-pad-x-d': px(s.section_padding_left_right), '--bas-pad-y-m': px(s.mobile_section_padding_top_bottom), '--bas-pad-x-m': px(s.mobile_section_padding_left_right),
      '--bas-cpad-y-d': px(s.container_padding_top_bottom), '--bas-cpad-x-d': px(s.container_padding_left_right), '--bas-cpad-y-m': px(s.mobile_container_padding_top_bottom), '--bas-cpad-x-m': px(s.mobile_container_padding_left_right),
      '--bam-ratio': ratio, '--bam-radius': px(s.media_radius), '--bam-line-w': px(s.vertical_line_weight, 3), '--bam-line-opacity': num(s.bar_opacity, 100) / 100, '--bam-knob-opacity': num(s.circle_opacity, 100) / 100,
    };
    for (const k in vars) put(state, root, k, vars[k]);
    if (once(state, root, 'bg-image', s.section_background_image)) root.style.setProperty('--bas-bg-image', bg ? 'url("' + bg.replace(/"/g, '%22') + '")' : 'none');
    data(root, 'show', s.show_on_device || 'all'); data(root, 'location', s.media_location || 'bottom'); data(root, 'shadow', s.image_shadow || 'none');
    const heading = q('.bas__heading'), content = q('.bas__content');
    rich(state, heading, s.headline); hide(heading, !filled(s.headline));
    rich(state, content, s.content); hide(content, !filled(s.content));
    const showButton = bool(s.enable_button) && filled(s.link_text);
    hide(q('.bas__actions'), !showButton); hide(q('.bas__text'), !(filled(s.headline) || filled(s.content) || showButton));
    let cta = q('[data-bam-cta]');
    if (cta) {
      cta = retag(cta, api()?.url(s.link) || (filled(s.link) && !api() ? s.link : ''));
      rich(state, cta, s.link_text);
      const own = s.use_theme_button === false;
      buttonVars(cta, custom, {bg: s.button_background_color, text: s.button_text_color}, own ? {radius: px(s.button_border_radius), 'padding-y': px(s.button_padding_tb), 'padding-x': px(s.button_padding_lr), 'font-size': px(s.button_text_size)} : null);
      attr(cta, 'data-hover-anim', own && s.button_hover_animation && s.button_hover_animation !== 'none' ? s.button_hover_animation : null);
    }
    const box = state.box;
    if (box) {
      data(box, 'bar', s.show_bar === false ? 'false' : 'true'); data(box, 'circle', s.show_circle === false ? 'false' : 'true');
      icon(root, state, box.querySelector('.bam-compare__knob'), s.circle_icon || 'icon2');
      for (const side of ['before', 'after']) {
        const img = box.querySelector('[data-bam-image="' + side + '_image"]'), label = box.querySelector('.bam-compare__label--' + side), caption = s[side + '_caption'];
        image(state, img, s[side + '_image'], root); alt(img, s[side + '_image'], plain(caption) || (side === 'before' ? 'Before' : 'After'));
        rich(state, label, caption); hide(label, !filled(caption));
      }
      startAt(state, clamp(num(s.start_percent, 50)), true);
    }
  }

  /* Before/After Slider 2 */
  function paintSliderTwo(root, state, s) {
    common(root, state, s);
    const custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts), c = (v, f) => col(custom, v, f);
    const fr = (v, d) => 'minmax(0, ' + num(v, d) + 'fr)', ratio = typeof s.image_aspect === 'string' && CSS.supports('aspect-ratio', s.image_aspect) ? s.image_aspect : '1 / 1';
    const empty = 'color-mix(in srgb, var(--color-heading) 12%, var(--color-background))';
    const vars = {
      '--ba2-bg': c(s.section_bg, 'var(--color-background)'), '--ba2-label-bg': c(s.label_bg, 'var(--color-background)'), '--ba2-label-color': c(s.label_color, 'var(--color-heading)'), '--bam-empty-after': c(s.image_bg, empty),
      '--bam-knob-bg': c(s.handle_bg, 'var(--color-background)'), '--bam-knob-border-color': c(s.handle_border_color, 'var(--color-border)'), '--bam-icon-color': c(s.handle_icon_color, 'var(--color-heading)'), '--bam-line-color': c(s.handle_line_color, 'var(--color-border)'),
      '--ba2-heading-font': fam(fonts, s.heading_font, 'var(--heading-font)'), '--ba2-body-font': fam(fonts, s.body_font, 'var(--body-font)'), '--ba2-max': px(s.section_max_width_desktop, 1200),
      '--ba2-cols': s.image_position === 'right' ? fr(s.content_col_fr, 1) + ' ' + fr(s.image_col_fr, 1) : fr(s.image_col_fr, 1) + ' ' + fr(s.content_col_fr, 1),
      '--ba2-gap-d': px(s.layout_gap_desktop), '--ba2-gap-m': px(s.layout_gap_mobile), '--ba2-content-gap': px(s.content_gap), '--ba2-align': s.content_align || 'left', '--ba2-items': {center: 'center', right: 'flex-end'}[s.content_align] || 'flex-start',
      '--ba2-pt-d': px(s.padding_top_desktop), '--ba2-pb-d': px(s.padding_bottom_desktop), '--ba2-pt-m': px(s.padding_top_mobile), '--ba2-pb-m': px(s.padding_bottom_mobile),
      '--ba2-label-size': px(s.label_size, 12), '--ba2-label-weight': s.label_weight || 700, '--ba2-label-track': px(s.label_tracking), '--ba2-label-case': s.label_transform || 'none',
      '--ba2-label-px': px(s.label_pad_x), '--ba2-label-py': px(s.label_pad_y), '--ba2-label-radius': px(s.label_radius), '--ba2-label-offset': px(s.label_offset),
      '--bam-ratio': ratio, '--bam-radius': px(s.image_radius), '--bam-knob-size': px(s.handle_size, 44), '--bam-knob-border-w': px(s.handle_border_width), '--bam-line-w': px(s.handle_line_width),
    };
    for (const k in vars) put(state, root, k, vars[k]);
    data(root, 'show', s.show_section_on || 'all'); data(root, 'position', s.image_position || 'left'); data(root, 'labels', bool(s.show_labels));
    if (state.box) { icon(root, state, state.box.querySelector('.bam-compare__knob'), s.handle_icon || 'arrows'); startAt(state, clamp(num(s.start_position, 50)), true); }
    for (let [el, b] of blocks(root, state)) {
      const type = el.dataset.bamType, own = bool(b.enable_custom_style), bc = (v, f) => col(own, v, f), bf = bool(b.enable_custom_fonts);
      if (type === 'slider') {
        for (const side of ['before', 'after']) {
          const img = el.querySelector('[data-bam-image="' + side + '_image"]'), label = b[side + '_label'] || (side === 'before' ? 'Before' : 'After');
          image(state, img, b[side + '_image'], root);
          attr(img, 'alt', filled(b[side + '_image']) ? (b[side + '_alt'] || b[side + '_image']?.alt || label) : '');
          text(state, el.querySelector('[data-bam-text="' + side + '_label"]'), label);
        }
      } else if (type === 'heading' || type === 'subheading') {
        rich(state, el, b.text); hide(el, !filled(b.text));
        data(el, 'size', bool(b.size_enable));
        put(state, el, '--ba2-c', bc(b.color, type === 'heading' ? 'var(--color-heading)' : 'var(--color-text)'));
        put(state, el, '--ba2-font', fam(bf, b.font, type === 'heading' ? 'var(--ba2-heading-font)' : 'var(--ba2-body-font)'));
        put(state, el, '--ba2-lh', num(b.line_height, type === 'heading' ? 1.1 : 1.5));
        if (type === 'heading') {
          data(el, 'weight', bool(b.weight_enable));
          put(state, el, '--ba2-w', b.weight || 700); put(state, el, '--ba2-size-d', px(b.size_desktop, 48)); put(state, el, '--ba2-size-m', px(b.size_mobile, 32)); put(state, el, '--ba2-track', px(b.tracking));
        } else { put(state, el, '--ba2-size', px(b.size, 16)); put(state, el, '--ba2-max-w', px(b.max_width, 460)); }
      } else if (type === 'button') {
        el = retag(el, api()?.url(b.link) || '');
        text(state, el, b.text || ''); hide(el, !filled(b.text));
        const shape = b.use_theme_button === false ? {radius: px(b.radius), 'padding-y': px(b.pad_y), 'padding-x': px(b.pad_x), 'font-size': px(b.size), weight: bool(b.weight_enable) ? b.weight : '', border: px(b.border_width)} : null;
        buttonVars(el, own, {bg: b.bg, text: b.color, border: b.border_color, hoverBg: b.bg_hover, hoverText: b.color_hover}, shape);
        inline(el, 'margin-top', px(b.gap_top));
      }
    }
  }

  const PAINT = {image: paintImage, slider: paintSlider, 'slider-2': paintSliderTwo};
  function paint(root, state) {
    if (state.raw !== root.dataset.bamSettings) { if (state.raw !== null) state.live = {}; state.raw = root.dataset.bamSettings; state.s = {...state.defaults, ...parse(state.raw), ...state.live}; }
    PAINT[state.type]?.(root, state, state.s);
  }
  function init(root) {
    const type = root.dataset.bamRoot, id = root.dataset.bamSection || '';
    const state = {type, id, raw: null, s: {}, live: {}, defaults: parse(root.dataset.bamDefaults), blockDefaults: parse(root.dataset.bamBlockDefaults), blocks: new Map(), rawBlocks: new Map(), liveBlocks: new Map(),
      vals: new WeakMap(), seen: new WeakMap(), rich: new WeakMap(), abort: new AbortController(), listeners: 0, frame: 0, posFrame: 0, seeding: true, pos: 50, start: null};
    state.schedule = () => { if (!state.frame) state.frame = requestAnimationFrame(() => { state.frame = 0; if (root.isConnected) paint(root, state); }); };
    roots.set(root, state);
    const wrap = root.closest('[id^="shopify-section-"]');
    if (wrap) for (const k of ['--bam-mt-m', '--bam-mb-m', '--bam-mt-d', '--bam-mb-d']) wrap.style.removeProperty(k);
    wire(root, state);
    if (state.box) {
      const s = {...state.defaults, ...parse(root.dataset.bamSettings)}, start = clamp(num(type === 'slider' ? s.start_percent : s.start_position, 50)), kept = memory.get(id);
      state.start = start;
      state.pos = kept && kept.start === start ? kept.pos : start;
      if (state.pos !== start) position(state, true);
    }
    paint(root, state);
    state.seeding = false;
  }
  function scan() {
    for (const [root, state] of roots) if (!root.isConnected) { state.abort.abort(); cancelAnimationFrame(state.frame); cancelAnimationFrame(state.posFrame); roots.delete(root); }
    for (const root of document.querySelectorAll('[data-bam-root]')) { if (roots.has(root)) roots.get(root).schedule(); else init(root); }
  }
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section ?? d.sectionId);
    if (!id || !d.settings || typeof d.settings !== 'object') return;
    const blockRef = d.block ?? d.blockId ?? d.block_id, block = blockRef != null && blockRef !== '' ? sectionId(blockRef) : '';
    for (const [root, state] of roots) {
      if (state.id !== id) continue;
      if (block) { state.liveBlocks.set(block, {...state.liveBlocks.get(block), ...d.settings}); state.blocks.set(block, {...state.blocks.get(block), ...d.settings}); }
      else { Object.assign(state.live, d.settings); Object.assign(state.s, d.settings); }
      state.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = '[data-bam-root],[data-bam-block]';
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(watched) : [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(watched) || n.querySelector(watched))))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-bam-settings']});
  window.MateriaBeforeAfterMedia = {scan, roots: () => [...roots.values()].map(s => ({id: s.id, type: s.type, listeners: s.listeners, pos: s.pos}))};
  scan();
})();
