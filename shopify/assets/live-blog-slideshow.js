/* Materia Themes. Live builder controller for the blog and slideshow sections
   (sections/blog-posts.storelib, sections/slideshow.storelib). Loaded once for
   every page by layout/theme.storelib.

   Each section instance is its own state, found by its root and section id,
   so two on one page never touch each other. A storelib:settings-change for an
   instance is applied in the next frame; a storelib:section-load (a redraw)
   or a new root sets the instance up again, once.

   Slideshow: slideshow-live.js paints sizes, fonts, colours and layout and
   slideshow-pointer.js the pointer and scroll effects; the slider itself is
   global.js's <slide-section> (autoplay waits on hover, touch, focus, a hidden
   tab, off screen and is off under reduced motion). This file adds the rest
   of the live edits: the words and links of each slide, the opt-out
   attributes the theme's priority rules read (data-own-font, data-own-weight,
   data-own-shape), the text entrance, image effect and its intensity, arrows,
   pagination, height and width, and a restart of the slider when its change
   effect, loop or autoplay changes.

   Blog posts: every setting applies live (colours, fonts, weights, sizes,
   words, alignment, ratio, spacing); the carousel is set up again when its
   layout, loop or autoplay changes; autoplay stops off screen, in a hidden tab
   and under reduced motion. */
(() => {
  if (window.MateriaBlogSlideshow) return;
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (e) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, f = 0) => v != null && v !== '' && Number.isFinite(+v) ? +v : f;
  const api = () => window.MateriaHeroImageOne;
  const color = (v, f) => { const c = api()?.color; if (c) return c(v, f) || f; if (v && typeof v === 'object') v = v.hex || v.value; return typeof v === 'string' && v && v !== 'transparent' && v !== 'rgba(0,0,0,0)' ? v : f; };
  /* A font picker value: its own fallbacks when the value carries them (as Liquid prints it), else the shared helper's. */
  const font = v => { const f = api()?.font?.(v) || ''; return v && typeof v === 'object' && v.family && v.fallback_families && f ? JSON.stringify(String(v.family)) + ', ' + v.fallback_families : f; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sectionOf = d => { const id = d && (d.section ?? d.sectionId); return id == null ? '' : String(id.id || id).replace(/^shopify-section-/, ''); };
  const blockOf = d => { const b = d && (d.block ?? d.blockId ?? d.block_id); return b == null ? '' : String(b.id || b); };
  const setVar = (el, p, v) => { if (!el) return; if (v == null || v === '') { if (el.style.getPropertyValue(p)) el.style.removeProperty(p); } else if (el.style.getPropertyValue(p) !== String(v)) el.style.setProperty(p, v); };
  const setImp = (el, p, v) => { if (el && (el.style.getPropertyValue(p) !== String(v) || el.style.getPropertyPriority(p) !== 'important')) el.style.setProperty(p, v, 'important'); };
  const attr = (el, name, on) => { if (el && el.hasAttribute(name) !== !!on) el.toggleAttribute(name, !!on); };
  const swapClass = (el, prefix, value, list) => { if (!el) return; for (const c of [...el.classList]) if (list ? list.includes(c) : c.startsWith(prefix)) el.classList.remove(c); if (value) el.classList.add(prefix + value); };
  const show = (el, on) => { if (!el) return; if (on) { if (el.style.display === 'none') el.style.removeProperty('display'); } else if (el.style.display !== 'none') el.style.setProperty('display', 'none', 'important'); };
  const text = (el, v) => { if (el && el.textContent !== String(v ?? '')) el.textContent = String(v ?? ''); };
  const rich = (el, html, cache) => {
    if (!el || cache.get(el) === html) return;
    const r = api()?.rich;
    if (r) { r(el, html, {rich: new WeakMap()}); }
    else { const t = document.createElement('template'); t.innerHTML = String(html || ''); t.content.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(n => n.remove()); t.content.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name); })); el.replaceChildren(t.content); }
    cache.set(el, html);
  };
  const url = v => { const u = api()?.url; if (u) return u(v) || ''; const s = typeof v === 'string' ? v.trim() : v?.url || ''; return /^\s*javascript:/i.test(s) ? '' : s; };
  const scheme = (root, s) => { const id = s.color_scheme?.id || s.color_scheme; if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || root.classList.contains('color-' + id)) return; for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c); root.classList.add('color-' + id); };

  /* ---------- Slideshow ---------- */
  const SS = new Map();
  const EFFECTS = ['fade', 'slide', 'coverflow', 'creative', 'fade_scale', 'slide_push', 'stack_up', 'slide_over', 'zoom_reveal', 'cube', 'flip', 'cards'];
  const ENTRANCES = ['effect_fadein', 'effect_fadeinup', 'effect_fadeindown', 'effect_zoomin', 'effect_zoomout'];
  /* The same sums the section prints (image effect intensity 1 to 10). */
  const fxVars = n => { const i = num(n, 5), k = Math.round(i); return {
    '--ss-fx-par': String(i / 50), '--ss-fx-kb-dur': (14 - i) + 's', '--ss-fx-kb-scale': '1.' + (k * 2 + 5), '--ss-fx-tilt': i + 'deg', '--ss-fx-zoom': '1.' + (k * 2 + 3),
    '--ss-fx-pan-dur': (18 - i) + 's', '--ss-fx-blur': (i * 2) + 'px', '--ss-fx-vig': '.' + (k * 5), '--ss-fx-vig-dur': (8 - i + 6) + 's', '--ss-fx-fade-dur': (i / 10 + 0.4) + 's',
    '--ss-fx-zp-dur': (26 - i) + 's', '--ss-fx-zp-scale': String(i * 0.012 + 1.04), '--ss-fx-up-dur': (i / 8 + 0.5) + 's', '--ss-fx-up-clip': (i * 8 + 12) + '%'}; };
  const accentHTML = (heading, b) => {
    const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
    const words = String(heading || '').split(' ');
    if (!bool(b.enable_accent_heading) || !String(b.accent_heading_text || '').trim()) return null;
    const set = String(b.accent_heading_text).toLowerCase().split(' ').map(w => w.trim()).filter(Boolean);
    return words.map(w => { const cmp = w.toLowerCase().replace(/[,.!?:;]/g, '').trim(); return set.includes(cmp) ? '<span class="hero-accent">' + esc(w) + '</span>' : esc(w); }).join(' ');
  };
  function ssRestart(root, st) {
    const slider = root.querySelector('slide-section');
    if (!slider || typeof slider.initSlideshow !== 'function') return;
    const s = st.s, single = root.querySelectorAll('slide-section > .swiper-wrapper > .swiper-slide').length < 2;
    slider.dataset.effect = s.slide_effect || 'slide';
    slider.dataset.loop = String(!single && s.slide_loop !== false && s.slide_loop !== 'false');
    slider.dataset.autoplay = String(!single && bool(s.autoplay));
    slider.dataset.autoplaySpeed = String(num(s.autorotate_speed, 5));
    const key = [slider.dataset.effect, slider.dataset.loop, slider.dataset.autoplay].join('|');
    if (st.sliderKey === key && slider.globalSlide && !slider.globalSlide.destroyed) return;
    const first = st.sliderKey == null;
    st.sliderKey = key;
    if (first) return;
    const index = slider.globalSlide && !slider.globalSlide.destroyed ? slider.globalSlide.realIndex : 0;
    slider.stopSlideshow?.();
    slider.initSlideshow();
    const sw = slider.globalSlide;
    if (sw && !sw.destroyed && index) sw.params.loop ? sw.slideToLoop(index, 0) : sw.slideTo(index, 0);
  }
  function ssPaint(root, st) {
    const s = st.s, id = root.dataset.id;
    scheme(root, s);
    /* Change effect class on the root (the slideshow CSS reads it). */
    swapClass(root, '', s.slide_effect, EFFECTS.filter(e => e !== s.slide_effect));
    if (s.slide_effect && !root.classList.contains(s.slide_effect)) root.classList.add(s.slide_effect);
    /* Image effect and its intensity. */
    if (s.image_effect != null && root.dataset.slideshowPointer !== String(s.image_effect)) root.dataset.slideshowPointer = s.image_effect;
    /* a new effect: slideshow-pointer.js measures the scroll position once now (parallax), not on the next scroll */
    if (st.pointer !== undefined && st.pointer !== s.image_effect) dispatchEvent(new Event('scroll'));
    st.pointer = s.image_effect;
    for (const [p, v] of Object.entries(fxVars(s.image_effect_intensity))) setVar(root, p, v);
    /* Width, spacing, height. */
    const inner = root.firstElementChild;
    if (inner && s.section_width) { swapClass(inner, '', s.section_width, ['container', 'fluid_container', 'stretch_width', 'full_width'].filter(w => w !== s.section_width)); inner.classList.add(s.section_width); }
    if (s.section_width && root.dataset.ssWidth !== s.section_width) root.dataset.ssWidth = s.section_width;
    /* Mobile text sizes: the section's phone rules read these (0 = the desktop size). */
    for (const [sel, v, sz, mob] of [['.sec__content-subheading', '--font-size-mobile-sub', 'subheading_font_size', 'subheading_font_size_mobile'], ['.sec__content-heading', '--font-size-mobile-heading', 'heading_font_size', 'heading_font_size_mobile'], ['.sec__content-des', '--font-size-mobile-des', 'des_font_size', 'des_font_size_mobile']])
      for (const el of root.querySelectorAll(sel)) { setVar(el, '--font-size', String(num(s[sz]))); setVar(el, v, String(num(s[mob]) > 0 ? num(s[mob]) : num(s[sz]))); }
    setVar(root, '--section-pt', String(num(s.padding_top)));
    setVar(root, '--section-pb', String(num(s.padding_bottom)));
    root.classList.toggle('pt-min', num(s.padding_top) < 30);
    root.classList.toggle('pb-min', num(s.padding_bottom) < 30);
    root.classList.toggle('remove_spacing', bool(s.reset_spacing));
    const wrap = document.getElementById('shopify-section-' + id);
    if (wrap) {
      const desktop = matchMedia('(min-width: 768px)').matches, reset = bool(s.reset_spacing);
      setImp(wrap, 'margin-top', reset ? '0px' : num(desktop ? s.section_margin_top_desktop : s.section_margin_top_mobile) + 'px');
      setImp(wrap, 'margin-bottom', reset ? '0px' : num(desktop ? s.section_margin_bottom_desktop : s.section_margin_bottom_mobile) + 'px');
    }
    const height = s.slide_height || 'full_screen';
    if (height === 'custom') { setVar(root, '--height', num(s.mobile_height, 360) + 'px'); setVar(root, '--height-desktop', num(s.desktop_height, 800) + 'px'); }
    for (const el of root.querySelectorAll('.sec__inner')) swapClass(el, 'h-', height, ['h-full_screen', 'h-adapt', 'h-custom']);
    for (const el of root.querySelectorAll('.banner__media')) { el.classList.remove('h-full_screen'); if (height === 'full_screen') el.classList.add('h-full_screen'); }
    /* Arrows. */
    const actions = root.querySelector('.swiper-actions');
    if (actions) {
      actions.classList.toggle('show-arrow', s.arrow_visibility === 'always');
      actions.classList.toggle('show-on-mobile', bool(s.arrow_show_mobile));
      if (actions.dataset.arrowStyle !== (s.arrow_style || 'theme')) actions.dataset.arrowStyle = s.arrow_style || 'theme';
      setVar(actions, '--ss-arrow-radius', ({circle: '999px', rounded: '12px', square: '0px'})[s.arrow_shape] || 'initial');
      const custom = s.arrow_style === 'custom', c = (v) => custom ? color(v, 'initial') : 'initial';
      setVar(actions, '--ss-arrow-size', custom ? num(s.arrow_size, 48) + 'px' : 'initial');
      setVar(actions, '--ss-arrow-bg', c(s.arrow_bg)); setVar(actions, '--ss-arrow-icon', c(s.arrow_icon_color)); setVar(actions, '--ss-arrow-border', c(s.arrow_border_color));
      setVar(actions, '--ss-arrow-hover-bg', c(s.arrow_hover_bg)); setVar(actions, '--ss-arrow-hover-icon', c(s.arrow_hover_icon_color));
      show(actions, !(s.show_arrow === false || s.show_arrow === 'false'));
    }
    /* Pagination. */
    const pag = root.querySelector('slide-section > .swiper-pagination');
    if (pag) {
      swapClass(pag, 'justify-content-', s.pagination_position || 'center');
      pag.classList.toggle('hidden-md', s.carousel_pagination === 'show_dots_on_mobile');
      show(pag, s.carousel_pagination !== 'disable');
    }
    const slider = root.querySelector('slide-section');
    if (slider && slider.dataset.paginationStyle !== (s.pagination_style || 'dot')) slider.dataset.paginationStyle = s.pagination_style || 'dot';
    /* Slides: words, links, buttons, entrance and the opt-out attributes. */
    for (const slide of root.querySelectorAll('[data-slide-id]')) {
      const b = {...st.blockDefaults, ...parse(slide.dataset.slideSettings), ...(st.blocks.get(slide.dataset.slideId) || {})};
      const fonts = bool(b.enable_custom_fonts), weights = bool(b.enable_custom_font_weights);
      const sub = slide.querySelector('[data-ss-text="subheading"]');
      if (sub && st.touchedBlocks.has(slide.dataset.slideId)) text(sub, b.subheading);
      const h = slide.querySelector('[data-ss-text="heading"]');
      if (h && st.touchedBlocks.has(slide.dataset.slideId)) {
        const html = accentHTML(b.heading, b);
        const key = JSON.stringify([b.heading, html]);
        if (st.cache.get(h) !== key) { if (html == null) h.textContent = String(b.heading || ''); else h.innerHTML = html; st.cache.set(h, key); }
      }
      for (const a of slide.querySelectorAll('.hero-accent')) {
        if (bool(b.enable_accent_heading)) { setImp(a, 'color', color(b.accent_heading_color, 'inherit')); setImp(a, 'font-style', bool(b.accent_heading_italic) ? 'italic' : 'inherit'); }
        else { a.style.removeProperty('color'); a.style.removeProperty('font-style'); }
      }
      const des = slide.querySelector('[data-ss-text="description"]');
      if (des && st.touchedBlocks.has(slide.dataset.slideId)) rich(des, b.description, st.cache);
      for (const el of slide.querySelectorAll('[data-ss-text]')) {
        attr(el, 'data-own-font', fonts); attr(el, 'data-own-weight', weights);
        /* the slide's weight reaches the paragraphs inside, as the section's own rule does on first paint */
        for (const child of el.querySelectorAll('p, li, strong:not(.hero-accent), em, a')) { if (weights) setImp(child, 'font-weight', 'inherit'); else if (child.style.getPropertyValue('font-weight')) child.style.removeProperty('font-weight'); }
      }
      const content = slide.querySelector('.sec__content-inner');
      if (content && b.slider_effect && !content.classList.contains(b.slider_effect)) swapClass(content, '', b.slider_effect, ENTRANCES);
      const box = slide.querySelector('.sec__content');
      if (box) { const w = b.content_width || 'container'; swapClass(box, '', w, ['container', 'fluid_container', 'full_width'].filter(x => x !== w)); box.classList.add(w); box.classList.toggle('w-full', w === 'full_width'); box.classList.toggle('w-1024-full', w !== 'full_width'); }
      for (const [role, prefix] of [['primary', 'first'], ['secondary', 'second']]) {
        const btn = slide.querySelector('[data-button-role="' + role + '"]');
        if (!btn) continue;
        attr(btn, 'data-own-shape', bool(s.btn_custom_enable));
        if (st.touchedBlocks.has(slide.dataset.slideId)) {
          text(btn, b[prefix + '_button_label']);
          if (btn.getAttribute('aria-label') !== String(b[prefix + '_button_label'] || '')) btn.setAttribute('aria-label', b[prefix + '_button_label'] || '');
          show(btn, !!String(b[prefix + '_button_label'] || '').trim());
          const href = url(b[prefix + '_button_link']);
          if (href) { if (btn.getAttribute('href') !== href) btn.setAttribute('href', href); btn.removeAttribute('data-button-unlinked'); }
          else { btn.removeAttribute('href'); btn.setAttribute('data-button-unlinked', ''); }
          const outline = bool(b[prefix + '_button_style']);
          btn.classList.toggle('btn-outline', outline);
          btn.classList.toggle(role === 'primary' ? 'btn-primary' : 'btn-secondary', !outline);
          btn.dataset.buttonOutline = String(outline);
          btn.dataset.buttonLocalAppearance = outline ? 'outline' : 'theme';
          if (outline) btn.dataset.buttonAppearance = 'outline';
          else if (btn.dataset.buttonAppearance === 'outline' && role === 'primary') btn.dataset.buttonAppearance = document.body.dataset.btnStyle || 'solid';
        }
      }
      /* Trust badges: their words and star fill. */
      const badges = slide.querySelector('.banner__badges');
      if (badges && st.touchedBlocks.has(slide.dataset.slideId)) {
        const items = [...badges.querySelectorAll(':scope > .banner__badge')];
        let k = 0;
        for (let n = 1; n <= 3; n++) {
          const type = b['badge_' + n + '_type'];
          if (type === 'none' || (type === 'text' && !String(b['badge_' + n + '_text'] || '').trim())) continue;
          const item = items[k++]; if (!item) break;
          let t = item.querySelector('.banner__badge-text');
          if (!t && String(b['badge_' + n + '_text'] || '').trim()) { t = document.createElement('span'); t.className = 'banner__badge-text'; item.append(t); }
          if (t) { text(t, b['badge_' + n + '_text']); show(t, !!String(b['badge_' + n + '_text'] || '').trim()); }
          if (type === 'stars') item.hidden = !(num(b['badge_' + n + '_rating'], 0) > 0);
          const fg = item.querySelector('.badge-stars__fg'); if (fg) fg.style.width = num(b['badge_' + n + '_rating'], 0) * 20 + '%';
          const stars = item.querySelector('.badge-stars'); if (stars) stars.setAttribute('aria-label', num(b['badge_' + n + '_rating'], 0) + ' out of 5 stars');
        }
      }
    }
    ssRestart(root, st);
  }
  function ssInit(root) {
    if (SS.has(root)) return SS.get(root);
    const st = {s: {...parse(root.dataset.slideshowDefaults), ...parse(root.dataset.slideshowSettings)}, blockDefaults: parse(root.dataset.slideDefaults), blocks: new Map(), touched: new Set(), touchedBlocks: new Set(), cache: new WeakMap(), frame: 0};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) ssPaint(root, st); }); };
    st.dispose = () => { cancelAnimationFrame(st.frame); SS.delete(root); };
    SS.set(root, st);
    st.schedule();
    return st;
  }

  /* ---------- Blog posts ---------- */
  const BP = new Map();
  const RATIO = {square: '1/1', landscape: '4/3', portrait: '3/4'};
  function bpAllowed(st) { return bool(st.s.autoplay) && !reduced.matches && !document.hidden && st.inView; }
  function bpAutoplay(root, st) {
    const slider = root.querySelector('[data-bp-slider]'), sw = slider?.globalSlide;
    if (!sw || sw.destroyed || !sw.autoplay) return;
    if (reduced.matches && sw.params.speed !== 0) sw.params.speed = 0;
    if (st.wired !== sw) { st.wired = sw; sw.on('autoplayStart', () => { if (!bpAllowed(st)) sw.autoplay.stop(); }); }
    if (!bpAllowed(st)) { if (sw.autoplay.running) sw.autoplay.stop(); }
    else if (sw.params.autoplay?.enabled && !sw.autoplay.running) sw.autoplay.start();
  }
  function bpRestart(root, st) {
    const slider = root.querySelector('[data-bp-slider]'), s = st.s;
    if (!slider) return;
    const mobile = num(s.items_per_row_mobile, 1), gap = num(s.column_gap, 30);
    const data = {autoplay: String(bool(s.autoplay)), loop: String(bool(s.infinite)), autoplaySpeed: String(num(s.autorotate_speed, 5)), spacing: String(gap), mobile: String(mobile), desktop: String(num(s.items_per_row, 4)), paginationProgressbar: String(s.carousel_pagination === 'show_progress_bar'), paginationStyle: s.pagination_style || 'dot', freeScroll: mobile > 1 && mobile < 2 ? 'true' : ''};
    const key = JSON.stringify(data);
    /* The first paint keeps what the page printed; only a later change sets the carousel up again. */
    if (st.sliderKey == null || st.sliderKey === key) { st.sliderKey = key; return; }
    st.sliderKey = key;
    for (const [k, v] of Object.entries(data)) if (slider.dataset[k] !== v) slider.dataset[k] = v;
    setVar(slider, '--col-gap', (gap < 15 ? gap : 15) + 'px'); setVar(slider, '--col-gap-desktop', gap < 15 ? '' : gap + 'px');
    if (typeof slider.initSlide !== 'function' || !slider.globalSlide) return;
    if (!slider.globalSlide.destroyed) { try { slider._stopInView?.(); } catch (e) {} slider.globalSlide.destroy(true, true); }
    slider.globalSlide = null;
    slider.initSlide();
    st.wired = null;
  }
  function bpPaint(root, st) {
    const s = st.s;
    scheme(root, s);
    const inner = root.firstElementChild;
    if (inner) { const w = s.section_width || 'fluid_container'; swapClass(inner, '', w, ['container', 'fluid_container', 'stretch_width', 'full_width'].filter(x => x !== w)); inner.classList.add(w); }
    setVar(root, '--section-pt', String(num(s.padding_top)));
    setVar(root, '--section-pb', String(num(s.padding_bottom)));
    setVar(root, '--vertical-gap', num(s.vertical_gap, 30) + 'px');
    setVar(root, '--heading-font-size', num(s.heading_font_size, 24) + 'px');
    /* Custom styling: colours of the heading, text, titles, author and date, and the View all button. */
    const custom = bool(s.enable_custom_style);
    attr(root, 'data-bp-custom', custom);
    for (const [p, id] of [['--bp-heading', 'heading_color'], ['--bp-text', 'text_color'], ['--bp-title', 'title_color'], ['--bp-meta', 'meta_color']]) setVar(root, p, custom ? color(s[id], '') : '');
    for (const btn of root.querySelectorAll('[data-bp-view-all]')) {
      for (const [p, id] of [['--mb-bg', 'view_all_bg_color'], ['--mb-text', 'view_all_text_color'], ['--mb-hover-bg', 'view_all_hover_bg_color'], ['--mb-hover-text', 'view_all_hover_text_color']]) setVar(btn, p, custom ? color(s[id], '') : '');
      setVar(btn, '--mb-border', custom ? color(s.view_all_bg_color, '') : '');
      setVar(btn, '--mb-hover-border', custom ? color(s.view_all_hover_bg_color, '') : '');
      if (st.touched.has('view_all_label')) text(btn, String(s.view_all_label || '').trim() || st.viewAllDefault);
    }
    /* Fonts, heading weight, heading line height and letter spacing. */
    const fonts = bool(s.enable_custom_fonts), weight = bool(s.enable_custom_weight), size = bool(s.enable_custom_size);
    attr(root, 'data-bp-fonts', fonts); attr(root, 'data-own-font', fonts);
    setVar(root, '--bp-heading-font', fonts ? font(s.heading_font) : ''); setVar(root, '--bp-body-font', fonts ? font(s.body_font) : '');
    attr(root, 'data-bp-weight', weight); attr(root, 'data-bp-size', size);
    setVar(root, '--bp-heading-weight', weight ? String(s.heading_weight || 600) : '');
    setVar(root, '--bp-heading-lh', size ? String(num(s.heading_line_height, 1.2)) : '');
    setVar(root, '--bp-heading-ls', size ? num(s.heading_letter_spacing) + 'px' : '');
    const h2 = root.querySelector('.section__header-heading');
    attr(h2, 'data-own-weight', weight); attr(h2, 'data-own-size', size);
    /* Words. */
    if (h2 && st.touched.has('heading')) rich(h2, s.heading, st.cache);
    const des = root.querySelector('.section__header-des');
    if (des && st.touched.has('description')) rich(des, s.description, st.cache);
    /* Alignment, author and date, image ratio. */
    const header = root.querySelector('.section__header');
    if (header) swapClass(header, 'text-', s.header_alignment || 'left');
    const row = header?.firstElementChild;
    if (row && row.classList.contains('flex')) row.classList.toggle('flex-row-reverse', s.header_alignment === 'right');
    const align = s.content_alignment || 'left';
    for (const el of root.querySelectorAll('.blog-posts-info')) swapClass(el, 'text-', align);
    for (const el of root.querySelectorAll('.blog-posts-bottom')) swapClass(el, 'justify-content-', align);
    for (const el of root.querySelectorAll('.blog-posts-author')) show(el, bool(s.show_author));
    for (const el of root.querySelectorAll('.blog-posts-date')) show(el, bool(s.show_date));
    let ratio = RATIO[s.image_ratio] || '3/2';
    if (s.image_ratio === 'custom' && String(s.custom_ratio || '').trim()) ratio = String(s.custom_ratio).replace(':', '/');
    if (s.image_ratio !== 'adapt') for (const el of root.querySelectorAll('.blog-posts-image > a, .blog-posts-placeholder .blog-posts-image')) setVar(el, '--aspect-ratio', ratio);
    const pag = root.querySelector('[data-bp-slider] > .swiper-pagination');
    if (pag) { swapClass(pag, 'justify-content-', s.pagination_position || 'center'); pag.classList.toggle('hidden-md', s.carousel_pagination === 'show_dots_on_mobile'); show(pag, s.carousel_pagination !== 'disable'); }
    const slider = root.querySelector('[data-bp-slider]');
    if (slider) slider.classList.toggle('reveal_on_scroll', bool(s.reveal));
    bpRestart(root, st);
    bpAutoplay(root, st);
  }
  function bpInit(root) {
    if (BP.has(root)) return BP.get(root);
    const st = {s: parse(root.dataset.bpSettings), touched: new Set(), cache: new WeakMap(), frame: 0, inView: false, viewAllDefault: (root.querySelector('[data-bp-view-all]')?.textContent || '').trim()};
    if (String(st.s.view_all_label || '').trim() === st.viewAllDefault) st.viewAllDefault = 'View all';
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) bpPaint(root, st); }); };
    const slider = root.querySelector('[data-bp-slider]');
    st.io = new IntersectionObserver(entries => { st.inView = entries[entries.length - 1].isIntersecting; bpAutoplay(root, st); }, {threshold: 0.15});
    if (slider) st.io.observe(slider);
    /* The carousel is built when it comes near the screen (global.js); its autoplay is held to these rules once it is. */
    st.mo = new MutationObserver(() => { const sw = slider?.globalSlide; if (sw && st.wired !== sw) bpAutoplay(root, st); });
    if (slider) st.mo.observe(slider, {attributes: true, attributeFilter: ['class']});
    st.dispose = () => { cancelAnimationFrame(st.frame); st.io.disconnect(); st.mo.disconnect(); BP.delete(root); };
    BP.set(root, st);
    st.schedule();
    return st;
  }

  /* ---------- Shared wiring ---------- */
  function scan() {
    for (const [root, st] of SS) if (!root.isConnected) st.dispose();
    for (const [root, st] of BP) if (!root.isConnected) st.dispose();
    document.querySelectorAll('[data-slideshow-settings]').forEach(root => ssInit(root).schedule());
    document.querySelectorAll('[data-bp-root]').forEach(root => bpInit(root).schedule());
  }
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionOf(d), block = blockOf(d);
    if (!id || !d.settings) return;
    for (const [root, st] of SS) if (root.dataset.id === id) {
      if (block) { st.blocks.set(block, {...(st.blocks.get(block) || {}), ...d.settings}); st.touchedBlocks.add(block); }
      else { Object.assign(st.s, d.settings); for (const k of Object.keys(d.settings)) { st.touched.add(k); if (/margin|reset_spacing/.test(k)) st.touched.add('margins'); } }
      st.schedule();
    }
    for (const [root, st] of BP) if (root.dataset.bpSection === id && !block) {
      Object.assign(st.s, d.settings);
      for (const k of Object.keys(d.settings)) st.touched.add(k);
      st.schedule();
    }
  });
  const refresh = () => { for (const [root, st] of BP) bpAutoplay(root, st); };
  reduced.addEventListener?.('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  matchMedia('(min-width: 768px)').addEventListener?.('change', () => { for (const st of SS.values()) st.schedule(); });
  ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load'].forEach(t => document.addEventListener(t, scan));
  new MutationObserver(records => {
    if (records.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-slideshow-settings], [data-bp-root]') || n.querySelector('[data-slideshow-settings], [data-bp-root]'))))) scan();
  }).observe(document.documentElement, {childList: true, subtree: true});
  window.MateriaBlogSlideshow = {scan, slideshows: SS, blogs: BP};
  scan();
})();