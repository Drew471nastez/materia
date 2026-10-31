/* Materia Themes. Live editor updates and runtimes for the galleries-b Image
   and video sections: Image 2, Gallery Simple 4, Gallery Simple 5
   (gallerysimple2: mobile carousel buttons) and Gallery Scrolling Logos
   (images-carousel: seamless marquee, copies, pause, off-screen pause).
   One scoped controller per section root ([data-mgb]); edits are batched to
   one paint per frame and only change what changed. */
(() => {
  if (window.MateriaGalleriesB) return;
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const color = (v, f) => api()?.color(v, f) || f;
  const font = (v, f) => (api()?.font(v)) || f;
  const url = (v, image) => api()?.url(v, image) || '';
  const key = v => JSON.stringify(v ?? null);
  const set = (el, k, v) => { if (!el) return; v = String(v); if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v); };
  const attr = (el, k, v) => { if (!el) return; if (v == null || v === false) { if (el.hasAttribute(k)) el.removeAttribute(k); } else if (el.getAttribute(k) !== String(v)) el.setAttribute(k, v); };
  const hide = (el, h) => { if (el && el.hidden !== !!h) el.hidden = !!h; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function rich(el, html, state) { if (el) api()?.rich(el, html, state); }
  function scheme(root, s) {
    const id = s.color_scheme?.id || s.color_scheme;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id)) return;
    for (const c of [...root.classList]) if (c.startsWith('color-') && c !== 'color-' + id) root.classList.remove(c);
    root.classList.add('color-' + id);
  }
  /* Image node: only touched when its setting changed since the last paint. */
  function image(state, img, value, alt, slot) {
    if (!img) return;
    const k = key(value);
    if (state.imageKeys.get(slot) === undefined) state.imageKeys.set(slot, key(state.initial.get(slot)));
    if (state.imageKeys.get(slot) !== k) {
      state.imageKeys.set(slot, k);
      const src = url(value, true), next = src || state.root.dataset.mgbPlaceholderSrc;
      if (img.getAttribute('src') !== next) { img.removeAttribute('srcset'); img.src = next; }
      if (src) img.removeAttribute('data-mgb-placeholder'); else img.setAttribute('data-mgb-placeholder', '');
    }
    attr(img, 'alt', alt);
  }
  /* Wrap/unwrap a node in an <a> without recreating it (no image reload). */
  function link(container, child, href, cls, label) {
    let a = container.querySelector(':scope > a');
    if (href) {
      if (!a) { a = document.createElement('a'); a.className = cls; container.insertBefore(a, child); a.append(child); }
      attr(a, 'href', href); attr(a, 'aria-label', label || 'Open link');
    } else if (a) { a.replaceWith(...a.childNodes); }
  }
  function wrapperSpacing(root, s) {
    const wrap = root.closest('.shopify-section') || root.parentElement;
    for (const [v, id] of [['--mgb-mt-m', 'section_margin_top_mobile'], ['--mgb-mb-m', 'section_margin_bottom_mobile'], ['--mgb-mt-d', 'section_margin_top_desktop'], ['--mgb-mb-d', 'section_margin_bottom_desktop']]) if (id in s) set(wrap, v, px(s[id]));
    attr(root, 'data-mgb-reset', String(bool(s.reset_spacing)));
    if ('reveal' in s && wrap) {
      const anim = root.dataset.mgbAnim;
      if (s.reveal === false || s.reveal === 'false') { if (wrap.classList.contains('scroll-trigger')) wrap.classList.remove('scroll-trigger', anim); }
      else if (anim && anim !== 'none' && !wrap.classList.contains('scroll-trigger')) wrap.classList.add('scroll-trigger', anim);
    }
  }
  const fontVar = (on, v, f) => on ? font(v, f) : f;

  /* ---------- Image 2 ---------- */
  function image2(root, st) {
    const s = st.s, c = bool(s.enable_custom_style);
    scheme(root, s); wrapperSpacing(root, s);
    const v = {
      '--img2-bg': c ? color(s.section_bg, 'var(--color-background)') : 'var(--color-background)',
      '--img2-pt-m': px(s.padding_top_mobile), '--img2-pb-m': px(s.padding_bottom_mobile), '--img2-px-m': px(s.side_padding_mobile),
      '--img2-pt-d': px(s.padding_top_desktop), '--img2-pb-d': px(s.padding_bottom_desktop), '--img2-px-d': px(s.side_padding_desktop),
      '--img2-ratio': num(s.aspect_w, 16) + ' / ' + num(s.aspect_h, 9), '--img2-radius': px(s.radius),
      '--img2-fit': s.fit === 'contain' ? 'contain' : 'cover', '--img2-pos': s.focal || 'center',
    };
    for (const k in v) set(root, k, v[k]);
    attr(root, 'data-full', String(bool(s.full_bleed)));
    const media = root.querySelector('.img2__media'), img = media?.querySelector('img');
    const alt = s.image_alt || (s.image && typeof s.image === 'object' ? s.image.alt : '') || '';
    image(st, img, s.image, alt, 'image');
    link(media, img, url(s.link), 'img2__link', alt);
  }

  /* ---------- Gallery Simple 4 ---------- */
  function gs4(root, st) {
    const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts);
    scheme(root, s); wrapperSpacing(root, s);
    const box = (p, sfx) => ['top', 'right', 'bottom', 'left'].map(side => px(s[p + side + sfx])).join(' ');
    const v = {
      '--gs4-bg': c ? color(s.section_bg, 'var(--color-background)') : 'var(--color-background)',
      '--gs4-heading-font': fontVar(f, s.heading_font, 'var(--heading-font)'), '--gs4-body-font': fontVar(f, s.body_font, 'var(--body-font)'),
      '--gs4-max-d': px(s.section_width_desktop, 1200), '--gs4-max-m': px(s.section_width_mobile, 360),
      '--gs4-pad-d': box('padding_', '_desktop'), '--gs4-pad-m': box('padding_', '_mobile'),
      '--gs4-hpad-d': box('header_padding_', '_desktop'), '--gs4-hpad-m': box('header_padding_', '_mobile'),
      '--gs4-hgap': px(s.heading_sub_gap), '--gs4-sgap': px(s.sub_section_gap), '--gs4-gap': px(s.image_gap),
      '--gs4-cols-d': num(s.grid_desktop, 4), '--gs4-cols-m': num(s.grid_mobile, 2), '--gs4-h-d': px(s.image_height, 300), '--gs4-h-m': px(s.image_height_mobile, 200),
    };
    for (const k in v) set(root, k, v[k]);
    for (const [el, type, b] of blocks(root, st)) {
      if (type === 'heading' || type === 'subheading') {
        const fb = type === 'heading' ? 'var(--color-heading)' : 'var(--color-text)';
        rich(el, b.text, st); hide(el, !String(b.text || '').replace(/<[^>]*>/g, '').trim());
        set(el, '--gs4-color', bool(b.enable_custom_style) ? color(b.color, fb) : fb);
        set(el, '--gs4-size-d', px(b.font_size_desktop, 16)); set(el, '--gs4-size-m', px(b.font_size_mobile, 16));
        set(el, '--gs4-weight', !b.font_weight || b.font_weight === 'inherit' ? (type === 'heading' ? 'var(--heading-weight, 700)' : 'var(--body-weight, 400)') : b.font_weight);
      } else if (type === 'gallery_item') {
        const img = el.querySelector('img'), alt = b.image_alt || (b.image && typeof b.image === 'object' ? b.image.alt : '') || '';
        image(st, img, url(b.image, true) ? b.image : b.image_url, alt, el.dataset.mgbBlock);
        link(el, img, bool(b.enable_link) ? url(b.link_url) : '', 'gs4__link gallery-link-' + root.dataset.mgbSection, alt);
      }
    }
  }

  /* ---------- Gallery Simple 5 (gallerysimple2) ---------- */
  function gs2(root, st) {
    const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts);
    scheme(root, s); wrapperSpacing(root, s);
    const legacy = c ? color(s.section_bg, 'var(--color-background)') : 'var(--color-background)';
    let bg = c ? color(s.background_color, legacy) : legacy;
    if (c && typeof s.background_gradient === 'string' && s.background_gradient.trim() && CSS.supports('background', s.background_gradient)) bg = s.background_gradient;
    const v = {
      '--gs2-bg': bg,
      '--gs2-heading-font': fontVar(f, s.heading_font, 'var(--heading-font)'), '--gs2-body-font': fontVar(f, s.body_font, 'var(--body-font)'),
      '--gs2-tag-color': c ? color(s.tagline_text_color, 'var(--color-text)') : 'var(--color-text)',
      '--gs2-head-color': c ? color(s.heading_color, 'var(--color-heading)') : 'var(--color-heading)',
      '--gs2-arrow': c ? color(s.arrow_icon_color, 'var(--color-heading)') : 'var(--color-heading)',
      '--gs2-pad-d': px(s.desktop_top_padding) + ' ' + px(s.desktop_bottom_padding), '--gs2-pad-m': px(s.mobile_top_padding) + ' ' + px(s.mobile_bottom_padding),
      '--gs2-inner': px(s.inner_width_px, 1100), '--gs2-tag-size-d': px(s.desktop_tagline_size, 16), '--gs2-tag-size-m': px(s.mobile_tagline_size, 16),
      '--gs2-tag-weight': s.tagline_font_weight || 400, '--gs2-tag-pb-d': px(s.desktop_tagline_padding_bottom), '--gs2-tag-pb-m': px(s.mobile_tagline_padding_bottom),
      '--gs2-head-max-d': px(s.desktop_heading_max_width, 700), '--gs2-head-max-m': px(s.mobile_heading_max_width, 350),
      '--gs2-radius': px(s.image_border_radius), '--gs2-img-pb': px(s.mobile_image_bottom_padding), '--gs2-arrows-gap': px(s.arrows_gap),
      '--gs2-carousel-pb': px(s.carousel_bottom_padding), '--gs2-placement': s.image_placement_mobile === 'column-reverse' ? 'column-reverse' : 'column',
    };
    for (const k in v) set(root, k, v[k]);
    attr(root, 'data-width', s.section_width || 'full_width');
    attr(root, 'data-carousel', String(bool(s.carousel_on_mobile)));
    const container = root.querySelector('.gs2__container');
    if (container) {
      const id = String(s.html_id || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      attr(container, 'id', id || null);
      const extra = String(s.html_class || '').split(/[\s,]+/).filter(x => /^[\w-]+$/.test(x));
      if (key(extra) !== key(st.extraClasses || [])) { for (const x of st.extraClasses || []) container.classList.remove(x); container.classList.add(...extra); st.extraClasses = extra; }
    }
    /* Legacy tagline: only rendered when the section has no Eyebrow block. */
    const tag = root.querySelector('[data-mgb-tagline]');
    if (tag) { rich(tag, s.tagline, st); hide(tag, !String(s.tagline || '').replace(/<[^>]*>/g, '').trim()); }
    for (let [el, type, b] of blocks(root, st)) {
      if (type === 'eyebrow') {
        rich(el, b.text, st); hide(el, !String(b.text || '').replace(/<[^>]*>/g, '').trim());
        const ink = bool(b.enable_custom_style) ? color(b.color, '') : '';
        if (ink) set(el, '--gs2-tag-color', ink); else if (el.style.getPropertyValue('--gs2-tag-color')) el.style.removeProperty('--gs2-tag-color');
      } else if (type === 'heading') {
        rich(el, b.heading, st); hide(el, !String(b.heading || '').replace(/<[^>]*>/g, '').trim());
        let w = b.heading_weight; if (!w || w === 'inherit') w = s.heading_weight; if (!w || w === 'inherit') w = 'var(--heading-weight, 700)';
        set(el, '--gs2-h-weight', w); set(el, '--gs2-h-size-d', px(b.desktop_heading_size, 42)); set(el, '--gs2-h-size-m', px(b.mobile_heading_size, 32));
        set(el, '--gs2-h-pb-d', px(b.desktop_heading_padding_bottom)); set(el, '--gs2-h-pb-m', px(b.mobile_heading_padding_bottom));
      } else if (type === 'button') {
        const href = url(b.button_link), tagName = href ? 'A' : 'BUTTON';
        if (el.tagName !== tagName) { const next = document.createElement(tagName); for (const a of el.attributes) next.setAttribute(a.name, a.value); next.replaceChildren(...el.childNodes); el.replaceWith(next); el = next; }
        if (href) { attr(el, 'href', href); attr(el, 'type', null); attr(el, 'target', b.button_target === '_blank' ? '_blank' : null); attr(el, 'rel', b.button_target === '_blank' ? 'noopener' : null); }
        else { attr(el, 'href', null); attr(el, 'target', null); attr(el, 'rel', null); attr(el, 'type', 'button'); }
        if (el.textContent !== String(b.button_text || '')) el.textContent = b.button_text || '';
        hide(el, !b.button_text);
        for (const [p, val] of [['--mb-bg', s.button_background_color], ['--mb-text', s.button_text_color], ['--mb-hover-border', s.button_border_hover_color]]) { const x = c ? color(val, '') : ''; if (x) set(el, p, x); else el.style.removeProperty(p); }
        if (c && color(s.button_background_color, '')) set(el, '--mb-border', color(s.button_background_color, '')); else el.style.removeProperty('--mb-border');
        const own = b.use_theme_button === false || b.use_theme_button === 'false';
        attr(el, 'data-gs2-shape', own ? 'custom' : 'theme');
        attr(el, 'data-gs2-hover', own ? (b.button_hover || 'fade') : null);
        attr(el, 'data-button-hover', own ? ({invert: 'reverse', fade: 'fade'}[b.button_hover || 'fade'] || null) : null);
        const shape = {'--mb-radius': px(b.button_border_radius), '--mb-weight': b.button_font_weight || 500, '--gs2-btn-py-d': px(b.desktop_button_padding_vertical), '--gs2-btn-px-d': px(b.desktop_button_padding_horizontal), '--gs2-btn-size-d': px(b.button_font_size, 16), '--gs2-btn-py-m': px(b.mobile_button_padding_vertical), '--gs2-btn-px-m': px(b.mobile_button_padding_horizontal), '--gs2-btn-size-m': px(b.button_font_size_mobile, 14)};
        for (const p in shape) if (own) set(el, p, shape[p]); else el.style.removeProperty(p);
      } else if (type === 'gallery_image_02') {
        image(st, el.querySelector('img'), b.image, b.image_alt || (b.image && typeof b.image === 'object' ? b.image.alt : '') || '', el.dataset.mgbBlock);
      }
    }
  }
  function gs2Init(root, st) {
    const list = () => root.querySelector('[data-mgb-track]');
    st.onClick = e => {
      const btn = e.target.closest('[data-mgb-prev],[data-mgb-next]'); if (!btn || !root.contains(btn)) return;
      const l = list(); if (!l) return;
      const w = l.clientWidth || 1, max = l.scrollWidth - w, next = btn.hasAttribute('data-mgb-next');
      let to = Math.round(l.scrollLeft / w) * w + (next ? w : -w);
      if (to > max + 1) to = 0; else if (to < -1) to = max;
      l.scrollTo({left: to, behavior: reduced.matches ? 'auto' : 'smooth'});
    };
    root.addEventListener('click', st.onClick);
    st.cleanup.push(() => root.removeEventListener('click', st.onClick));
  }

  /* ---------- Gallery Scrolling Logos (images-carousel) ---------- */
  const MQ_WIDE = 2560, MQ_NARROW = 768;
  function mqCopies(s, count) {
    const sq = bool(s.make_images_square), w = sq ? 200 : num(s.image_width, 170);
    const ud = Math.max(1, w * num(s.slider_scale, 1) + Math.max(0, num(s.item_gap))), um = Math.max(1, w * num(s.overall_size_mobile, 0.9) + Math.max(0, num(s.item_gap_mobile)));
    const kd = Math.ceil(MQ_WIDE / (ud * count)) + 1, km = Math.ceil(MQ_NARROW / (um * count)) + 1;
    return Math.min(30, Math.max(2, kd, km));
  }
  function marquee(root, st) {
    const s = st.s, c = bool(s.enable_custom_style), sq = bool(s.make_images_square);
    scheme(root, s); wrapperSpacing(root, s);
    const d1 = num(s.speed), d1m = num(s.speed_mobile), d2 = num(s.speed_second_scrolling);
    const tracks = [...root.querySelectorAll('.mq__track')];
    /* Keep the loop phase when a duration changes: read progress, retime, restore. */
    const before = tracks.map(t => { const a = t.getAnimations?.()[0]; if (!a) return null; const dur = a.effect?.getComputedTiming?.().duration; return {a, p: dur > 0 ? ((a.currentTime || 0) % dur) / dur : 0, dur}; });
    const v = {
      '--mq-bg': c ? color(s.section_bg, 'var(--color-background)') : 'var(--color-background)',
      '--mq-wb': px(sq ? 200 : s.image_width, 170), '--mq-hb': px(sq ? 200 : s.image_height, 110),
      '--mq-scale-d': num(s.slider_scale, 1), '--mq-scale-m': num(s.overall_size_mobile, 0.9),
      '--mq-gap-d': Math.max(0, num(s.item_gap)) + 'px', '--mq-gap-m': Math.max(0, num(s.item_gap_mobile)) + 'px',
      '--mq-radius': px(s.image_border_radius), '--mq-fit': s.image_fit === 'contain' ? 'contain' : 'cover',
      '--mq-dur1-d': d1 + 's', '--mq-dur1-m': d1m + 's', '--mq-dur2': d2 + 's', '--mq-row-gap': px(s.scroll_gap),
      '--mq-pt': px(s.padding_top), '--mq-pb': px(s.padding_bottom),
    };
    for (const k in v) set(root, k, v[k]);
    attr(root, 'data-width', s.section_width || 'full_width');
    attr(root, 'data-pause-hover', String(bool(s.pause_on_hover)));
    attr(root, 'data-pause-button', String(s.show_pause_button !== false && s.show_pause_button !== 'false'));
    attr(root, 'data-static1', String(!(d1 > 0)));
    attr(root, 'data-static2', String(!(d2 > 0)));
    for (const row of root.querySelectorAll('.mq__row')) {
      attr(row, 'data-dir', (row.dataset.mqRow === '2' ? s.second_direction : s.direction) === 'right' ? 'right' : 'left');
      const track = row.querySelector('.mq__track'), groups = [...track.querySelectorAll(':scope > .mq__group')], first = groups[0];
      if (!first) continue;
      const k = mqCopies(s, first.children.length || 1);
      if (groups.length < k) for (let i = groups.length; i < k; i++) { const g = first.cloneNode(true); g.setAttribute('aria-hidden', 'true'); g.setAttribute('data-mq-clone', ''); g.removeAttribute('role'); for (const n of g.querySelectorAll('[data-mgb-settings],[role],[data-shopify-editor-block]')) { n.removeAttribute('data-mgb-settings'); n.removeAttribute('role'); n.removeAttribute('data-shopify-editor-block'); } for (const img of g.querySelectorAll('img')) img.alt = ''; track.append(g); }
      else if (groups.length > k) for (const g of groups.slice(k)) g.remove();
      set(track, '--mq-k', k);
    }
    tracks.forEach((t, i) => { const b = before[i]; if (!b) return; t.getAnimations(); const dur = b.a.effect?.getComputedTiming?.().duration; if (b.dur > 0 && dur > 0 && dur !== b.dur) b.a.currentTime = b.p * dur; });
    /* Block images: the original item carries the settings, copies follow it. */
    for (const [el, type, b] of blocks(root, st)) {
      if (type !== 'image_block') continue;
      const alt = b.image_alt || (b.image && typeof b.image === 'object' ? b.image.alt : '') || '';
      image(st, el.querySelector('img'), b.image, alt, el.dataset.mgbBlock);
      const src = el.querySelector('img')?.getAttribute('src');
      for (const copy of root.querySelectorAll('[data-mq-clone] [data-mgb-block="' + CSS.escape(el.dataset.mgbBlock) + '"] img')) {
        if (copy.getAttribute('src') !== src) { copy.removeAttribute('srcset'); copy.src = src; }
        attr(copy, 'data-mgb-placeholder', el.querySelector('img')?.hasAttribute('data-mgb-placeholder') ? '' : null);
      }
    }
    attr(root, 'data-offscreen', st.offscreen || document.hidden ? 'true' : 'false');
  }
  function marqueeInit(root, st) {
    st.offscreen = false;
    if ('IntersectionObserver' in window) {
      st.io = new IntersectionObserver(entries => { for (const e of entries) st.offscreen = !e.isIntersecting; st.schedule(); }, {rootMargin: '100px 0px'});
      st.io.observe(root);
      st.cleanup.push(() => st.io.disconnect());
    }
    st.onClick = e => {
      const btn = e.target.closest('[data-mq-pause]'); if (!btn || !root.contains(btn)) return;
      const paused = root.dataset.paused !== 'true';
      attr(root, 'data-paused', paused ? 'true' : null);
      attr(btn, 'aria-pressed', String(paused)); attr(btn, 'aria-label', paused ? 'Play scrolling' : 'Pause scrolling');
    };
    root.addEventListener('click', st.onClick);
    st.cleanup.push(() => root.removeEventListener('click', st.onClick));
  }

  const painters = {'image-2': [image2], gallerysimple4: [gs4], gallerysimple2: [gs2, gs2Init], 'images-carousel': [marquee, marqueeInit]};

  /* Blocks of this root (not of a nested root), merged over their defaults and live edits. */
  function* blocks(root, st) {
    for (const el of root.querySelectorAll('[data-mgb-block][data-mgb-settings]')) {
      if (el.closest('[data-mgb]') !== root) continue;
      const id = el.dataset.mgbBlock, raw = el.dataset.mgbSettings;
      if (st.rawBlocks.get(id) !== raw) { const first = !st.rawBlocks.has(id); st.rawBlocks.set(id, raw); if (!first) st.liveBlocks.delete(id); st.blocks.set(id, {...parse(raw), ...(st.liveBlocks.get(id) || {})}); if (!st.initial.has(id)) st.initial.set(id, imageValue(el.dataset.mgbType, parse(raw))); }
      const type = el.dataset.mgbType;
      yield [el, type, {...(st.blockDefaults[type] || {}), ...st.blocks.get(id)}];
    }
  }
  const imageValue = (type, b) => type === 'gallery_item' && !url(b.image, true) ? b.image_url : b.image;

  function paint(root, st) {
    if (!api()) { st.frame = requestAnimationFrame(() => { st.frame = 0; paint(root, st); }); return; }
    if (st.raw !== root.dataset.mgbSettings) { st.raw = root.dataset.mgbSettings; st.live = {}; st.s = {...st.defaults, ...parse(st.raw)}; }
    painters[root.dataset.mgb]?.[0](root, st);
  }
  function create(root) {
    const s0 = parse(root.dataset.mgbSettings);
    const st = {root, raw: root.dataset.mgbSettings, defaults: parse(root.dataset.mgbDefaults), blockDefaults: parse(root.dataset.mgbBlockDefaults), live: {}, liveBlocks: new Map(), blocks: new Map(), rawBlocks: new Map(), rich: new WeakMap(), imageKeys: new Map(), initial: new Map([['image', s0.image]]), cleanup: [], frame: 0};
    st.s = {...st.defaults, ...s0};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    painters[root.dataset.mgb]?.[1]?.(root, st);
    return st;
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) { cancelAnimationFrame(st.frame); st.cleanup.forEach(f => f()); roots.delete(root); }
    for (const root of document.querySelectorAll('[data-mgb]')) {
      if (!painters[root.dataset.mgb]) continue;
      if (roots.has(root)) { roots.get(root).schedule(); continue; }
      const st = create(root); roots.set(root, st); st.schedule();
    }
  }
  const sectionKey = v => String(v && typeof v === 'object' ? v.id : v ?? '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionKey(d.section ?? d.sectionId);
    if (!id || !d.settings) return;
    const b = d.block ?? d.blockId ?? d.block_id, bid = b == null ? '' : sectionKey(b);
    for (const [root, st] of roots) {
      if (root.dataset.mgbSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const st of roots.values()) st.schedule(); });
  reduced.addEventListener?.('change', () => { for (const st of roots.values()) st.schedule(); });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-mgb],[data-mgb-block]') || n.querySelector('[data-mgb],[data-mgb-block]'))))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-mgb-settings']});
  window.MateriaGalleriesB = {scan, roots};
  scan();
})();
