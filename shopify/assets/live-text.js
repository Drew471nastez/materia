/* Materia Themes. Live editor paint for three Text sections: Inline Image
   Heading, Quote Banner and Scrolling Text. Each section prints its values as
   CSS variables for the first paint; this file works out the same variables
   (same names, same fallbacks) when the builder changes a setting, for that
   section only, at most once per frame. It changes only what changed: no
   picture is loaded again and the scrolling row keeps moving. */
(() => {
  if (window.MateriaLiveText) return;
  const roots = new Map();
  const api = () => window.MateriaHeroImageOne;
  const parse = v => { try { return JSON.parse(v || '{}'); } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, f = 0) => v != null && v !== '' && Number.isFinite(+v) ? +v : f;
  const px = (v, f = 0) => num(v, f) + 'px';
  const color = (v, f) => api()?.color(v, f) || f;
  const font = (v, f) => api()?.font(v) || f;
  const src = v => api()?.url(v, true) || '';
  const href = v => api()?.url(v) || '';
  const themed = v => v == null || v === '' || v === 'theme';
  const set = (el, p, v) => { if (el && el.style.getPropertyValue(p) !== String(v)) el.style.setProperty(p, v); };
  const unset = (el, p) => { if (el && el.style.getPropertyValue(p)) el.style.removeProperty(p); };
  const text = (el, v) => { if (el && el.textContent !== String(v ?? '')) el.textContent = v ?? ''; };
  const hide = (el, on) => { if (el && el.hidden !== !!on) el.hidden = !!on; };
  const flag = (el, name, on) => { if (el && el.hasAttribute(name) !== !!on) el.toggleAttribute(name, !!on); };
  /* Theme settings > Typography and Buttons win with !important unless an element opts out (snippets/theme-controls). */
  const own = (el, kind, on) => flag(el, 'data-own-' + kind, on);
  const rich = (el, value, state) => { if (el && api() && state.rich.get(el) !== value) { api().rich(el, value, state); state.rich.set(el, value); } };
  const scheme = (root, s) => { const id = s.color_scheme?.id || s.color_scheme; if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || root.classList.contains('color-' + id)) return; for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c); root.classList.add('color-' + id); };
  /* Section margins live on the theme's section wrapper; reset spacing makes them 0. */
  const margins = (wrapper, s, prefix) => {
    if (!wrapper) return;
    const reset = bool(s.reset_spacing);
    for (const [v, id] of [['mt-m', 'section_margin_top_mobile'], ['mb-m', 'section_margin_bottom_mobile'], ['mt-d', 'section_margin_top_desktop'], ['mb-d', 'section_margin_bottom_desktop']]) set(wrapper, '--' + prefix + '-' + v, reset ? '0px' : px(s[id]));
    set(wrapper, '--' + prefix + '-mobile-display', s.show_on_mobile === false ? 'none' : 'block');
  };
  const widths = {container: 'calc(var(--page-width, 1300px) + 3rem)', fluid_container: 'calc(var(--fluid-container-width, 1500px) + 3rem)', narrow: '1040px'};
  function image(holder, value, cls, alt, placeholder) {
    let img = holder.querySelector('img');
    const url = src(value);
    if (!url) {
      if (img) img.remove();
      /* The Inline Image Heading keeps a round placeholder where no picture is chosen. */
      if (placeholder && !holder.querySelector('svg')) { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', placeholder); svg.setAttribute('viewBox', '0 0 525 525'); svg.setAttribute('aria-hidden', 'true'); svg.dataset.placeholder = 'image'; holder.append(svg); }
      return null;
    }
    if (!img) { img = document.createElement('img'); img.className = cls; img.loading = 'lazy'; img.decoding = 'async'; img.width = 220; img.height = 220; holder.querySelector('svg')?.remove(); holder.append(img); }
    if (img.getAttribute('src') !== url) { img.removeAttribute('srcset'); img.src = url; }
    if (alt != null && img.alt !== alt) img.alt = alt;
    return img;
  }

  function inlineImageHeading(root, state) {
    const s = state.s, custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts), size = bool(s.enable_custom_size);
    scheme(root, s); margins(root.closest('.shopify-section'), s, 'iih');
    const vars = {
      '--iih-bg': custom ? color(s.section_background, 'var(--color-background)') : 'var(--color-background)',
      '--iih-ink': custom ? color(s.heading_color, 'var(--color-heading)') : 'var(--color-heading)',
      '--iih-font': fonts ? font(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)',
      '--iih-body-font': fonts ? font(s.body_font, 'var(--body-font)') : 'var(--body-font)',
      '--iih-weight': {body_weight: 'var(--body-weight, 400)', subheading_weight: 'var(--subheading-weight, 500)'}[s.heading_weight] || 'var(--heading-weight, 700)',
      '--iih-lh': size ? String(num(s.heading_line_height, 1.15)) : 'var(--heading-line-height, 1.2)',
      '--iih-ls': size ? px(s.heading_letter_spacing) : 'var(--heading-letter-spacing, normal)',
      '--iih-size-d': px(s.heading_size, 56), '--iih-size-m': px(s.heading_size_mobile, 30),
      '--iih-img-d': px(s.image_size, 64), '--iih-img-m': px(s.image_size_mobile, 40), '--iih-gap': px(s.image_gap), '--iih-offset': px(s.image_offset_y),
      '--iih-pt-d': px(s.padding_top), '--iih-pb-d': px(s.padding_bottom), '--iih-pt-m': px(s.padding_top_mobile), '--iih-pb-m': px(s.padding_bottom_mobile),
      '--iih-align': s.content_alignment || 'center', '--iih-max': widths[s.section_width] || 'none',
      '--iih-pad': s.section_width === 'stretch_width' ? '1.5rem' : s.section_width === 'full_width' ? '4vw' : '22px',
      '--iih-pad-wide': s.section_width === 'stretch_width' ? '3rem' : s.section_width === 'full_width' ? '4vw' : '22px',
    };
    for (const [p, v] of Object.entries(vars)) set(root, p, v);
    own(root, 'font', fonts);
    const heading = root.querySelector('.iih__heading');
    own(heading, 'font', fonts); own(heading, 'weight', !!s.heading_weight && s.heading_weight !== 'heading_weight'); own(heading, 'size', size);
    const eyebrowVars = (el, o, ink, fontOn) => {
      set(el, '--iih-eyebrow-ink', ink); set(el, '--iih-eyebrow-size-d', px(o.size, 14)); set(el, '--iih-eyebrow-size-m', px(o.size_mobile, 13));
      set(el, '--iih-eyebrow-weight', o.weight); set(el, '--iih-eyebrow-ls', px(o.letter_spacing)); set(el, '--iih-eyebrow-case', o.uppercase ? 'uppercase' : 'none'); set(el, '--iih-eyebrow-gap', px(o.spacing_below));
      if (fontOn) set(el, '--iih-eyebrow-font', fontOn); else unset(el, '--iih-eyebrow-font');
    };
    const legacy = root.querySelector('[data-lt-legacy-eyebrow]');
    if (legacy) {
      text(legacy, s.eyebrow); hide(legacy, !bool(s.show_eyebrow) || !s.eyebrow); own(legacy, 'font', fonts);
      eyebrowVars(legacy, {size: s.eyebrow_size, size_mobile: s.eyebrow_size_mobile, weight: {heading_weight: 'var(--heading-weight, 700)', subheading_weight: 'var(--subheading-weight, 500)'}[s.eyebrow_weight] || 'var(--body-weight, 400)', letter_spacing: s.eyebrow_letter_spacing, uppercase: bool(s.eyebrow_uppercase), spacing_below: s.eyebrow_spacing_below}, custom ? color(s.eyebrow_color, 'var(--color-text)') : 'var(--color-text)');
    }
    for (const el of root.querySelectorAll('[data-lt-block]')) {
      const b = state.block(el), type = el.dataset.ltType;
      if (type === 'eyebrow') {
        text(el, b.text); hide(el, !b.text); own(el, 'font', bool(b.enable_custom_fonts) || fonts);
        eyebrowVars(el, {...b, uppercase: bool(b.uppercase), weight: themed(b.weight) ? 'var(--body-weight, 400)' : b.weight}, bool(b.enable_custom_style) ? color(b.color, 'var(--color-text)') : 'var(--color-text)', bool(b.enable_custom_fonts) ? font(b.font, '') : '');
      } else if (type === 'text') {
        rich(el, b.text, state); hide(el, !b.text);
      } else if (type === 'image') {
        if (num(b.size_override) > 0) set(el, '--iih-d', px(b.size_override)); else unset(el, '--iih-d');
        const collection = b.collection && typeof b.collection === 'object' ? b.collection : null, link = href(collection?.url);
        let a = el.querySelector('a.iih__link');
        if (link && !a) { a = document.createElement('a'); a.className = 'iih__link'; a.append(...el.childNodes); el.append(a); }
        if (!link && a) a.replaceWith(...a.childNodes), a = null;
        if (a) { if (a.getAttribute('href') !== link) a.href = link; a.setAttribute('aria-label', collection?.title || ''); }
        image(a || el, b.image || collection?.image || collection?.featured_image, 'iih__img', b.image?.alt || collection?.title || '', 'iih__img iih__placeholder');
      }
    }
  }

  function quoteBanner(root, state) {
    const s = state.s, custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts), wrapper = root.closest('.shopify-section');
    scheme(root, s); margins(wrapper, s, 'qb');
    if (wrapper) {
      set(wrapper, '--qb-wrap-max', {container: widths.container, fluid_container: widths.fluid_container}[s.section_width] || 'none');
      set(wrapper, '--qb-wrap-pad', s.section_width === 'full_width' ? '0px' : '1.5rem');
      set(wrapper, '--qb-wrap-pad-wide', s.section_width === 'full_width' ? '0px' : s.section_width === 'stretch_width' ? '3rem' : '1.5rem');
    }
    const justify = v => v === 'center' ? 'center' : 'flex-start';
    const vars = {
      '--qb-section-bg': custom ? color(s.section_bg, 'var(--color-background)') : 'var(--color-background)',
      '--qb-bg': custom ? color(s.bg_color, 'var(--color-heading)') : 'var(--color-heading)',
      '--qb-radius': custom ? px(s.radius) : 'var(--rounded-radius, 0px)',
      '--qb-shadow': custom && bool(s.enable_shadow) ? '0 8px 28px rgba(0,0,0,.18)' : 'none',
      '--qb-max': s.max_width === 'full' ? '100%' : px(s.custom_max_width, 1080), '--qb-text-max': px(s.text_max_width, 1200), '--qb-gap-top': px(s.gap_top),
      '--qb-align-d': s.text_align_desktop || 'center', '--qb-align-m': s.text_align_mobile || 'left', '--qb-justify-d': justify(s.text_align_desktop), '--qb-justify-m': justify(s.text_align_mobile),
      '--qb-pt-d': px(s.top_padding_desktop), '--qb-pb-d': px(s.bottom_padding_desktop), '--qb-px-d': px(s.pad_x_desktop), '--qb-pt-m': px(s.top_padding_mobile), '--qb-pb-m': px(s.bottom_padding_mobile), '--qb-px-m': px(s.pad_x_mobile),
      '--qb-heading-font': fonts ? font(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)', '--qb-body-font': fonts ? font(s.body_font, 'var(--body-font)') : 'var(--body-font)',
    };
    for (const [p, v] of Object.entries(vars)) set(root, p, v);
    own(root, 'font', fonts);
    for (const el of root.querySelectorAll('[data-lt-block]')) {
      const b = state.block(el);
      if (el.dataset.ltType === 'quote') {
        if (state.quotes.get(el) !== b.quote_text) { const lines = String(b.quote_text ?? '').split('\n'); el.replaceChildren(...lines.flatMap((l, i) => i ? [document.createElement('br'), l] : [l])); state.quotes.set(el, b.quote_text); }
        el.classList.toggle('qb-quote--curly', bool(b.use_curly_quotes)); own(el, 'font', bool(b.enable_custom_fonts) || fonts);
        set(el, '--qb-quote-ink', bool(b.enable_custom_style) ? color(b.quote_color, 'var(--color-background)') : 'var(--color-background)');
        set(el, '--qb-quote-size-d', px(b.quote_size, 32)); set(el, '--qb-quote-size-m', px(b.quote_size_mobile, 20)); set(el, '--qb-quote-weight', themed(b.quote_weight) ? 'var(--heading-weight, 700)' : b.quote_weight);
        const picked = bool(b.enable_custom_fonts) ? font(b.font, '') : ''; if (picked) set(el, '--qb-quote-font', picked); else unset(el, '--qb-quote-font');
      } else if (el.dataset.ltType === 'author') {
        text(el.querySelector('.qb-author-name'), b.author_name); text(el.querySelector('.qb-author-role'), b.author_role);
        hide(el.querySelector('.qb-author-role'), !b.author_role); hide(el.querySelector('.qb-author-sep'), !b.author_role);
        set(el, '--qb-author-ink', bool(b.enable_custom_style) ? color(b.author_color, 'var(--color-background)') : 'var(--color-background)');
        set(el, '--qb-author-size-d', px(b.author_size, 18)); set(el, '--qb-author-size-m', px(b.author_size_mobile, 16)); set(el, '--qb-avatar', px(b.avatar_size, 44));
        set(el, '--qb-sig-d', px(b.signature_size_desktop, 150)); set(el, '--qb-sig-m', px(b.signature_size_mobile, 100));
        if (el.dataset.signaturePosition !== (b.signature_position || 'right')) el.dataset.signaturePosition = b.signature_position || 'right';
        const avatar = el.querySelector('.qb-avatar'); hide(avatar, !src(b.avatar)); const face = image(avatar, b.avatar, '', b.author_name || '');
        if (face) { face.width = num(b.avatar_size, 44); face.height = num(b.avatar_size, 44); }
        const signed = bool(b.enable_signature) && !!src(b.signature_image);
        for (const holder of [el.querySelector('.qb-signature--inline'), root.querySelector('[data-lt-signature-below]')]) { if (!holder) continue; set(holder, '--qb-sig-d', px(b.signature_size_desktop, 150)); set(holder, '--qb-sig-m', px(b.signature_size_mobile, 100)); hide(holder, !signed); if (signed) image(holder, b.signature_image, '', holder.querySelector('img')?.alt || 'Signature'); else holder.querySelector('img')?.remove(); }
      }
    }
  }

  function scrollingText(root, state) {
    const s = state.s, custom = bool(s.use_custom_text_color), fonts = bool(s.use_custom_font), body = s.base_font === 'body';
    scheme(root, s); margins(root.closest('.shopify-section'), s, 'stm');
    const legacy = fonts && s.custom_font_url && s.custom_font_family && /^[\w -]+$/.test(s.custom_font_family) ? "'" + s.custom_font_family + "', sans-serif" : '';
    const ink = custom ? color(s.text_color, 'var(--color-text)') : 'var(--color-text)';
    const vars = {
      '--stm-font': legacy || (fonts ? font(s.custom_font, '') : '') || (body ? 'var(--body-font)' : 'var(--heading-font)'),
      '--stm-weight': themed(s.font_weight) ? (body ? 'var(--body-weight, 400)' : 'var(--heading-weight, 700)') : s.font_weight,
      '--stm-lh': String(num(s.line_height, 105) / 100), '--stm-ls': px(s.letter_spacing), '--stm-tt': s.text_transform || 'none', '--stm-color': ink,
      '--stm-sep-color': custom ? color(s.separator_color, 'var(--stm-color)') : 'var(--stm-color)', '--stm-sep-scale': String(num(s.separator_size, 50) / 100),
      '--stm-border': bool(s.show_borders) ? '1px solid ' + (custom ? color(s.border_color, 'color-mix(in srgb, var(--stm-color) 18%, transparent)') : 'color-mix(in srgb, var(--stm-color) 18%, transparent)') : '0 solid transparent',
      '--stm-fade': px(s.edge_fade), '--stm-size-d': px(s.text_size, 80), '--stm-size-m': px(s.text_size_mobile, 40), '--stm-gap-d': px(s.item_gap, 64), '--stm-gap-m': px(s.item_gap_mobile, 32),
      '--stm-pt-d': px(s.padding_top), '--stm-pb-d': px(s.padding_bottom), '--stm-pt-m': px(s.padding_top_mobile), '--stm-pb-m': px(s.padding_bottom_mobile),
      '--stm-duration': num(s.duration, 40) + 's', '--stm-direction': s.direction === 'reverse' ? 'reverse' : 'normal', '--stm-pause': bool(s.pause_on_hover) ? 'paused' : 'running',
      '--stm-max': {container: widths.container, fluid_container: widths.fluid_container}[s.section_width] || 'none',
      '--stm-pad': s.section_width === 'full_width' ? '0px' : '1.5rem', '--stm-pad-wide': s.section_width === 'full_width' ? '0px' : s.section_width === 'stretch_width' ? '3rem' : '1.5rem',
    };
    for (const [p, v] of Object.entries(vars)) set(root, p, v);
    own(root, 'font', fonts); flag(root, 'data-lt-reveal', bool(s.reveal));
    /* Words and separators: refill each track in place (the tracks, and their movement, stay). */
    const sep = {dot: '•', star: '✦', slash: '/', plus: '+', custom: s.separator_text || ''}[s.separator] || '';
    const order = state.order.filter(id => state.blocks.has(id)), words = order.map(id => [id, state.blocks.get(id)]).filter(([, b]) => b.text);
    const signature = JSON.stringify([sep, words.map(([id, b]) => [id, b.text])]);
    if (signature !== state.words) {
      state.words = signature;
      root.querySelectorAll('.stm__track').forEach((track, i) => {
        const nodes = [];
        for (const [id, b] of words) {
          const item = document.createElement('span'); item.className = 'stm__item'; item.dataset.ltBlock = id; item.dataset.ltType = 'word'; item.textContent = b.text; nodes.push(item);
          if (i === 0) item.dataset.ltSettings = JSON.stringify(b);
          if (sep) { const mark = document.createElement('span'); mark.className = 'stm__sep'; mark.setAttribute('aria-hidden', 'true'); mark.textContent = sep; nodes.push(mark); }
        }
        if (nodes.length || track.querySelector('[data-lt-block]')) track.replaceChildren(...nodes);
      });
    }
    for (const item of root.querySelectorAll('.stm__item[data-lt-block]')) {
      const b = state.blocks.get(item.dataset.ltBlock) || {}, word = bool(b.enable_custom_style) ? color(b.color, '') : '';
      flag(item, 'data-outline', bool(b.use_outline_text)); set(item, '--stm-outline', px(b.outline_width, 2));
      if (word) set(item, '--stm-word-ink', word); else unset(item, '--stm-word-ink');
    }
    flag(root, 'data-lt-offscreen', !state.near || document.hidden);
  }

  const paints = {'inline-image-heading': inlineImageHeading, quotebanner: quoteBanner, 'scrolling-text': scrollingText};
  function read(root, state) {
    if (state.raw !== root.dataset.ltSettings) { state.raw = root.dataset.ltSettings; state.edits = {}; state.s = parse(state.raw); }
    for (const el of root.querySelectorAll('[data-lt-block][data-lt-settings]')) {
      const id = el.dataset.ltBlock;
      if (state.rawBlocks.get(id) !== el.dataset.ltSettings) { state.rawBlocks.set(id, el.dataset.ltSettings); state.blockEdits.delete(id); state.blocks.set(id, parse(el.dataset.ltSettings)); }
      if (!state.order.includes(id)) state.order.push(id);
    }
  }
  function scan() {
    for (const [root, state] of roots) if (!root.isConnected) { state.intersection.disconnect(); cancelAnimationFrame(state.frame); roots.delete(root); }
    document.querySelectorAll('[data-live-text]').forEach(root => {
      if (roots.has(root)) { roots.get(root).schedule(); return; }
      const state = {s: {}, edits: {}, blocks: new Map(), blockEdits: new Map(), rawBlocks: new Map(), order: [], rich: new WeakMap(), quotes: new WeakMap(), near: true, frame: 0};
      root.querySelectorAll('[data-lt-block][data-lt-settings]').forEach(el => state.order.push(el.dataset.ltBlock));
      state.block = el => state.blocks.get(el.dataset.ltBlock) || {};
      state.schedule = () => { if (!state.frame) state.frame = requestAnimationFrame(() => { state.frame = 0; if (!root.isConnected || !api()) return; read(root, state); paints[root.dataset.liveText]?.(root, state); }); };
      state.intersection = new IntersectionObserver(entries => { const near = entries.at(-1).isIntersecting; if (near !== state.near) { state.near = near; state.schedule(); } }, {rootMargin: '200px 0px'});
      state.intersection.observe(root);
      roots.set(root, state);
      read(root, state);
      state.schedule();
    });
  }
  const sectionOf = d => String(d?.id ?? d ?? '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', event => {
    const d = event.detail || {}, id = sectionOf(d.section || d.sectionId), block = d.block || d.blockId || d.block_id;
    if (!id || !d.settings) return;
    for (const [root, state] of roots) {
      if (root.dataset.ltSection !== id) continue;
      if (block) { const key = String(block.id || block); state.blockEdits.set(key, {...state.blockEdits.get(key), ...d.settings}); state.blocks.set(key, {...state.blocks.get(key), ...d.settings}); if (!state.order.includes(key)) state.order.push(key); }
      else { Object.assign(state.edits, d.settings); Object.assign(state.s, d.settings); }
      state.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const state of roots.values()) state.schedule(); });
  ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load'].forEach(name => document.addEventListener(name, scan));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches?.('[data-live-text]') : [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-live-text]') || n.querySelector('[data-live-text]'))))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-lt-settings']});
  window.MateriaLiveText = {scan, count: () => roots.size};
  scan();
})();
