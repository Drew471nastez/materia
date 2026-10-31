/* Materia Themes. Live editor updates and runtimes for the stats-reels Image and video sections:
   Image With Text Stats, Image With Text Steps, Reels Wall and Shoppable Video.
   One controller per section root ([data-msr]), painted at most once per frame. Each root keeps
   its settings, its blocks' settings and every listener, observer and timer it started, and
   drops them all when it leaves the page (a builder redraw replaces the root). */
(() => {
  if (window.MateriaMediaStatsReels) return;
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => { v = v && typeof v === 'object' && 'value' in v ? v.value : v; return v === true || v === 'true' || v === 1; };
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const H = () => window.MateriaHeroImageOne;
  const color = v => { const h = H(); if (h) return h.color(v, ''); return typeof v === 'string' && v && CSS.supports('color', v) && v !== 'transparent' ? v : ''; };
  const font = v => (v && (typeof v === 'object' ? v.family : v) && H()?.font(v)) || '';
  const url = (v, img) => H()?.url(v, img) || '';
  const desk = matchMedia('(min-width: 768px)'), reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const prop = (el, k, v) => { if (!el) return; if (v === '' || v == null) { if (el.style.getPropertyValue(k) !== '') el.style.removeProperty(k); } else if (el.style.getPropertyValue(k).trim() !== String(v)) el.style.setProperty(k, String(v)); };
  const cvar = (el, k, on, v) => prop(el, k, on ? color(v) : '');
  const text = (el, v) => { if (el && el.textContent !== String(v ?? '')) el.textContent = String(v ?? ''); };
  const plain = v => String(v ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const rich = (el, v, st) => { if (!el) return; if (!st.rich.has(el)) { st.rich.set(el, v); return; } if (H()) H().rich(el, v, st); else if (st.rich.get(el) !== v) { el.textContent = plain(v); st.rich.set(el, v); } };
  const hide = (el, on) => { if (el && el.hidden !== !!on) el.hidden = !!on; };
  const attr = (el, k, v) => { if (!el) return; if (v == null || v === false) { if (el.hasAttribute(k)) el.removeAttribute(k); } else if (el.getAttribute(k) !== String(v)) el.setAttribute(k, v); };
  const src = (img, next) => { if (img && next && img.getAttribute('src') !== next) { img.removeAttribute('srcset'); img.src = next; } };
  const fontVar = (el, k, on, v) => prop(el, k, on ? font(v) : '');
  const sectionId = v => String(v && typeof v === 'object' ? v.id : v || '').replace(/^shopify-section-/, '');
  const scheme = (root, s) => {
    const id = s.color_scheme && typeof s.color_scheme === 'object' ? s.color_scheme.id : s.color_scheme;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || root.classList.contains('color-' + id)) return;
    for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c);
    root.classList.add('color-' + id);
  };
  const margins = (root, s) => {
    const w = root.closest('.shopify-section'); if (!w) return;
    for (const [k, id] of [['--msr-mt-m', 'section_margin_top_mobile'], ['--msr-mb-m', 'section_margin_bottom_mobile'], ['--msr-mt-d', 'section_margin_top_desktop'], ['--msr-mb-d', 'section_margin_bottom_desktop']]) if (id in s) prop(w, k, px(s[id]));
  };
  const widthMax = w => ({container: 'calc(var(--page-width, 1300px) + 3rem)', fluid_container: 'calc(var(--fluid-container-width, 1500px) + 3rem)'}[w] || 'none');

  /* ---------- shared: video playback (muted autoplay only in view, never under reduced motion) ---------- */
  function videos(root, st, autoplayOf) {
    const seen = new WeakSet(), vis = new WeakMap();
    const want = v => vis.get(v) && !document.hidden && (v.dataset.msrUser === 'play' || (v.dataset.msrUser !== 'pause' && !reduce.matches && autoplayOf(v)));
    const button = v => v.closest('[data-msr-media]')?.querySelector('[data-msr-play]');
    const mark = v => { const b = button(v); if (!b) return; const on = !v.paused; b.classList.toggle('is-playing', on); attr(b, 'aria-pressed', String(on)); attr(b, 'aria-label', on ? b.dataset.labelPause || 'Pause' : b.dataset.labelPlay || 'Play'); };
    const embed = (f, play) => { try { const yt = /youtube/.test(f.src); f.contentWindow?.postMessage(yt ? JSON.stringify({event: 'command', func: play ? 'playVideo' : 'pauseVideo', args: ''}) : JSON.stringify({method: play ? 'play' : 'pause'}), '*'); } catch (_) {} };
    const sync = v => {
      if (v.tagName === 'IFRAME') { const on = !!want(v); if (v.dataset.msrPlaying !== String(on)) { v.dataset.msrPlaying = String(on); embed(v, on); } return; }
      if (want(v)) { if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } } else if (!v.paused) v.pause();
    };
    const io = new IntersectionObserver(es => { for (const e of es) { vis.set(e.target, e.isIntersecting); sync(e.target); } }, {threshold: 0.35});
    const all = () => root.querySelectorAll('video[data-msr-video], iframe[data-msr-embed]');
    const bind = () => {
      for (const v of all()) {
        if (seen.has(v)) continue; seen.add(v); io.observe(v);
        if (v.tagName === 'VIDEO') { v.addEventListener('play', () => mark(v), {signal: st.ac.signal}); v.addEventListener('pause', () => mark(v), {signal: st.ac.signal}); mark(v); }
        else v.addEventListener('load', () => { v.dataset.msrPlaying = ''; sync(v); }, {signal: st.ac.signal});
      }
    };
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-msr-play]'); if (!b || !root.contains(b)) return;
      e.preventDefault(); e.stopPropagation();
      const v = b.closest('[data-msr-media]')?.querySelector('video[data-msr-video]'); if (!v) return;
      v.dataset.msrUser = v.paused ? 'play' : 'pause';
      if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
    }, {signal: st.ac.signal});
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-msr-sound]'); if (!b || !root.contains(b)) return;
      e.preventDefault(); e.stopPropagation();
      const v = b.closest('[data-msr-media]')?.querySelector('video[data-msr-video]'); if (!v) return;
      v.muted = !v.muted; b.classList.toggle('is-on', !v.muted); attr(b, 'aria-pressed', String(!v.muted));
    }, {signal: st.ac.signal});
    document.addEventListener('visibilitychange', () => { for (const v of all()) sync(v); }, {signal: st.ac.signal});
    st.cleanup.push(() => io.disconnect());
    st.syncVideos = () => { bind(); for (const v of all()) sync(v); };
    bind();
  }

  /* ---------- shared: mouse drag on a horizontal scroller (touch scrolls natively) ---------- */
  function drag(track, st, cls) {
    let down = false, moved = false, x0 = 0, s0 = 0;
    const sig = {signal: st.ac.signal};
    track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; down = true; moved = false; x0 = e.clientX; s0 = track.scrollLeft; }, sig);
    window.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - x0; if (!moved && Math.abs(dx) < 6) return; if (!moved) { moved = true; track.classList.add(cls); } track.scrollLeft = s0 - dx; }, sig);
    const up = () => { if (!down) return; down = false; if (moved) { track.classList.remove(cls); track.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }, {capture: true, once: true}); const step = st.step ? st.step() : 0; if (step) track.scrollTo({left: Math.round(track.scrollLeft / step) * step, behavior: reduce.matches ? 'auto' : 'smooth'}); } };
    window.addEventListener('pointerup', up, sig); window.addEventListener('blur', up, sig);
    track.addEventListener('dragstart', e => e.preventDefault(), sig);
  }

  /* ---------- shared: autoplay timer that runs only in view, tab visible, not hovered/focused ---------- */
  function ticker(el, st, enabled, delay, tick) {
    let timer = 0, inView = false, held = false;
    const sig = {signal: st.ac.signal};
    const run = () => { const on = inView && !held && !document.hidden && !reduce.matches && enabled(); if (on && !timer) timer = setInterval(tick, Math.max(1500, delay())); else if (!on && timer) { clearInterval(timer); timer = 0; } };
    const io = new IntersectionObserver(es => { inView = es[es.length - 1].isIntersecting; run(); }, {threshold: 0.2});
    io.observe(el);
    for (const [n, h] of [['pointerenter', true], ['pointerleave', false], ['focusin', true], ['focusout', false]]) el.addEventListener(n, () => { held = h; run(); }, sig);
    document.addEventListener('visibilitychange', run, sig);
    st.cleanup.push(() => { io.disconnect(); clearInterval(timer); timer = 0; });
    return {sync: () => { if (timer) { clearInterval(timer); timer = 0; } run(); }, active: () => !!timer};
  }

  /* ================= Image With Text Stats ================= */
  const STATS = {
    init(root, st) {
      if (root.dataset.iwsReveal === 'pending') {
        const done = () => { root.dataset.iwsReveal = 'done'; io.disconnect(); };
        const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) done(); }, {threshold: 0.25});
        if (reduce.matches) done(); else io.observe(root);
        st.cleanup.push(() => io.disconnect());
      }
      const grid = root.querySelector('[data-iws-grid]'), fill = root.querySelector('[data-iws-progress]');
      videos(root, st, v => st.block(v.closest('[data-msr-block]'))?.autoplay !== false);
      if (!grid) return;
      st.step = () => { const slot = grid.querySelector('.iws__slot'); return slot ? slot.offsetWidth + num(st.s.media_gap, 12) : grid.clientWidth; };
      const carousel = () => grid.classList.contains('iws__media-grid--carousel');
      const progress = () => { const max = grid.scrollWidth - grid.clientWidth; prop(root, '--iws-progress', (max > 0 ? Math.min(100, Math.max(0, grid.scrollLeft / max * 100)) : 100).toFixed(1) + '%'); };
      let frame = 0;
      grid.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; progress(); }); }, {passive: true, signal: st.ac.signal});
      grid.addEventListener('keydown', e => { if (!carousel() || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return; e.preventDefault(); grid.scrollBy({left: (e.key === 'ArrowLeft' ? -1 : 1) * st.step(), behavior: reduce.matches ? 'auto' : 'smooth'}); }, {signal: st.ac.signal});
      drag(grid, st, 'iws--dragging');
      st.auto = ticker(grid, st, () => carousel() && bool(st.s.carousel_autoplay), () => num(st.s.carousel_autoplay_speed, 4) * 1000, () => {
        const max = grid.scrollWidth - grid.clientWidth; if (max <= 0) return;
        grid.scrollTo({left: grid.scrollLeft >= max - 2 ? 0 : Math.min(max, grid.scrollLeft + st.step()), behavior: 'smooth'});
      });
      st.progress = progress;
      st.cleanup.push(() => cancelAnimationFrame(frame));
      if (fill) progress();
    },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), P = (k, v) => prop(root, k, v);
      scheme(root, s); margins(root, s);
      attr(root, 'data-width', s.section_width || 'container');
      P('--iws-max', widthMax(s.section_width));
      for (const [k, id] of [['--iws-pt-m', 'padding_top_mobile'], ['--iws-pb-m', 'padding_bottom_mobile'], ['--iws-px-m', 'side_padding_mobile'], ['--iws-pt-d', 'padding_top_desktop'], ['--iws-pb-d', 'padding_bottom_desktop'], ['--iws-px-d', 'side_padding_desktop'], ['--iws-gap-m', 'gap_mobile'], ['--iws-gap-d', 'gap_desktop'], ['--iws-text-max', 'text_max_width'], ['--iws-content-gap', 'content_gap'], ['--iws-media-radius', 'media_radius'], ['--iws-media-gap', 'media_gap'], ['--iws-prog-h', 'progress_height'], ['--iws-prog-mt', 'progress_margin'], ['--iws-ring', 'ring_size'], ['--iws-pct-size', 'percent_size'], ['--iws-stat-size', 'stat_text_size'], ['--iws-stat-gap', 'stat_gap'], ['--iws-stat-py', 'stat_pad_y']]) P(k, px(s[id]));
      const ai = {center: 'center', right: 'flex-end'};
      P('--iws-dir', s.media_position === 'right' ? 'row-reverse' : 'row');
      P('--iws-ai-m', ai[s.content_align_mobile] || 'flex-start'); P('--iws-ta-m', s.content_align_mobile || 'left');
      P('--iws-ai-d', ai[s.content_align] || 'flex-start'); P('--iws-ta-d', s.content_align || 'left');
      P('--iws-media-w', num(s.media_column_width, 50) + '%');
      P('--iws-ratio', num(s.media_aspect_w, 3) + ' / ' + num(s.media_aspect_h, 4));
      for (const [k, id] of [['--iws-bg', 'section_bg'], ['--iws-text', 'text_color'], ['--iws-pct-color', 'heading_color'], ['--iws-accent', 'accent_color'], ['--iws-ring-bg', 'ring_bg'], ['--iws-divider', 'stat_divider'], ['--iws-stat-color', 'stat_text_color'], ['--iws-track', 'progress_track'], ['--iws-fill', 'progress_fill']]) cvar(root, k, c, s[id]);
      fontVar(root, '--iws-hfont', f, s.heading_font); fontVar(root, '--iws-bfont', f, s.body_font);
      /* media layout: Auto (1 single, 2 side by side, 3+ carousel) or a fixed number per row */
      const grid = root.querySelector('[data-iws-grid]'), count = grid ? grid.querySelectorAll('.iws__slot').length : 0;
      root.classList.toggle('iws--no-media', !count);
      if (grid) {
        let per = s.per_row || '1.2', layout;
        if (per === 'auto') { per = count <= 1 ? 1 : count === 2 ? 2 : 2.5; layout = count <= 1 ? 'single' : count === 2 ? 'side_by_side' : 'carousel'; }
        else { per = num(per, 1.2); layout = count > per ? 'carousel' : per <= 1 || count <= 1 ? 'single' : 'side_by_side'; }
        for (const l of ['single', 'side_by_side', 'carousel']) grid.classList.toggle('iws__media-grid--' + l, l === layout);
        P('--iws-slot-w', +(100 / per).toFixed(4) + '%');
        attr(grid, 'tabindex', layout === 'carousel' ? '0' : null); attr(grid, 'role', layout === 'carousel' ? 'region' : null);
        hide(root.querySelector('[data-iws-progress]'), !(layout === 'carousel' && count > 1));
        if (layout !== 'carousel' && grid.scrollLeft) grid.scrollLeft = 0;
        st.progress?.(); st.auto?.sync();
      }
      for (const el of root.querySelectorAll('[data-msr-block]')) {
        const b = st.block(el), type = el.dataset.msrType, own = bool(b.enable_custom_style);
        if (type === 'heading' || type === 'subheading' || type === 'footnote') {
          rich(el, b.text, st); hide(el, !plain(b.text));
          cvar(el, '--b-color', own, b.color);
          prop(el, '--b-weight', bool(b.weight_enable) ? b.weight : '');
          if (type === 'footnote') { prop(el, '--b-size', px(b.size, 13)); prop(el, '--b-mt', px(b.margin_top)); }
          else { prop(el, '--b-size-m', px(b.size_mobile, type === 'heading' ? 32 : 14)); prop(el, '--b-size-d', px(b.size_desktop, type === 'heading' ? 48 : 16)); }
          if (type === 'heading') prop(el, '--b-case', bool(b.uppercase) ? 'uppercase' : '');
        } else if (type === 'stat') {
          const pct = Math.max(0, Math.min(100, Math.round(num(b.percent, 0))));
          prop(el, '--iws-off', +(175.93 - 175.93 * pct / 100).toFixed(2));
          text(el.querySelector('[data-iws-percent]'), pct + '%');
          rich(el.querySelector('.iws__stat-body'), b.text, st);
          prop(el, '--b-weight', bool(b.weight_enable) ? b.weight : '');
        } else if (type === 'media') {
          const img = el.querySelector('img'), v = el.querySelector('video');
          if (img && (b.media_type || 'image') === 'image') { if (!st.placeholders.has(img)) st.placeholders.set(img, root.dataset.msrPlaceholder || img.getAttribute('src')); src(img, url(b.image, true) || st.placeholders.get(img)); attr(img, 'alt', b.image && typeof b.image === 'object' ? b.image.alt || '' : ''); }
          if (v) { if (v.muted !== (b.muted !== false)) v.muted = b.muted !== false; if (v.loop !== (b.loop !== false)) v.loop = b.loop !== false; if (v.controls !== bool(b.show_controls)) v.controls = bool(b.show_controls); }
        }
      }
      st.syncVideos?.();
    },
  };

  /* ================= Image With Text Steps ================= */
  const STEPS = {
    init() {},
    paint(root, st) {
      const s = st.s, c = bool(s.custom_colors), f = bool(s.enable_custom_fonts), P = (k, v) => prop(root, k, v), inner = root.querySelector('.iws');
      scheme(root, s);
      root.classList.toggle('remove_spacing', bool(s.reset_spacing));
      attr(inner, 'data-width', s.section_width || 'container');
      P('--st-max', ({fluid_container: 'var(--fluid-container-width, 1500px)', stretch_width: 'none', full_width: 'none'})[s.section_width] || 'var(--theme-page-width, var(--page-width, 1300px))');
      for (const [k, id] of [['--st-pt', 'padding_top'], ['--st-pb', 'padding_bottom'], ['--st-px-m', 'side_padding_mobile'], ['--st-px-d', 'side_padding_desktop'], ['--st-gap-m', 'gap_mobile'], ['--st-gap-d', 'gap_desktop'], ['--st-text-gap', 'text_gap'], ['--st-radius', 'image_radius'], ['--st-mk', 'marker_size'], ['--st-mk-font', 'marker_font_size'], ['--st-line-w', 'line_thickness'], ['--st-gap-inline', 'step_gap_inline'], ['--st-gap-below', 'step_gap_below'], ['--st-steps-mt', 'steps_margin_top'], ['--st-btn-mt', 'button_margin_top']]) P(k, px(s[id]));
      P('--st-dir', s.image_position === 'right' ? 'row-reverse' : 'row'); P('--st-valign', s.column_valign || 'center');
      P('--st-img-w', num(s.image_width_pct, 50) + '%'); P('--st-ratio-m', s.image_aspect || '4 / 5'); P('--st-ratio-d', s.image_aspect_desktop || '4 / 5');
      P('--st-line-style', ['solid', 'dashed', 'dotted'].includes(s.line_style) ? s.line_style : 'solid');
      for (const [k, id] of [['--st-bg', 'section_bg'], ['--st-mk-color', 'marker_color'], ['--st-mk-text', 'marker_text_color'], ['--st-line-color', 'line_color'], ['--st-title-color', 'step_title_color'], ['--st-desc-color', 'step_desc_color'], ['--st-img-bg', 'image_bg']]) cvar(root, k, c, s[id]);
      P('--st-title-size', c ? px(s.step_title_size, 18) : ''); P('--st-desc-size', c ? px(s.step_desc_size, 14) : '');
      fontVar(root, '--st-hfont', f, s.heading_font); fontVar(root, '--st-bfont', f, s.body_font);
      const img = root.querySelector('.iws__media img');
      if (img) { if (!st.placeholders.has(img)) st.placeholders.set(img, img.getAttribute('src')); src(img, url(s.image, true) || url(s.placeholder_url, true) || st.placeholders.get(img)); attr(img, 'alt', (url(s.image, true) || url(s.placeholder_url, true)) ? s.image_alt || '' : ''); }
      const style = s.step_style || 'dot';
      for (const el of root.querySelectorAll('[data-msr-block]')) {
        const b = st.block(el), type = el.dataset.msrType, own = bool(b.custom_style);
        if (type === 'eyebrow' || type === 'heading' || type === 'subheading') {
          rich(el, b.text, st); hide(el, !plain(b.text));
          cvar(el, '--b-color', own, b.color);
          if (type === 'heading') { attr(el, 'data-custom', own ? '' : null); prop(el, '--b-size-m', own ? px(b.size_mobile, 28) : ''); prop(el, '--b-size-d', own ? px(b.size_desktop, 40) : ''); prop(el, '--b-weight', own ? b.weight || 700 : ''); }
          else prop(el, '--b-size', own ? px(b.size, type === 'eyebrow' ? 12 : 15) : '');
          if (type === 'subheading') prop(el, '--b-max', px(b.max_width, 560));
        } else if (type === 'step') {
          const icon = url(b.icon, true), cls = icon ? 'icon' : style === 'icon' ? 'numbered_outline' : style;
          for (const k of [...el.classList]) if (k.startsWith('iws__step--') && k !== 'iws__step--' + cls) el.classList.remove(k);
          el.classList.add('iws__step--' + cls);
          const marker = el.querySelector('.iws__step-marker'); let mimg = marker.querySelector('img');
          if (icon && !mimg) { mimg = document.createElement('img'); mimg.alt = ''; mimg.width = 40; mimg.height = 40; mimg.loading = 'lazy'; marker.prepend(mimg); }
          if (mimg) { hide(mimg, !icon); src(mimg, icon); }
          const t = el.querySelector('.iws__step-text'); rich(t, b.title || '', st);
          const d = el.querySelector('.iws__step-desc'); rich(d, b.description, st); hide(d, !plain(b.description));
          const on = bool(b.enable_custom_style);
          cvar(el, '--b-mk', on, b.marker_color); cvar(el, '--b-title', on, b.title_color); cvar(el, '--b-desc', on, b.description_color);
        } else if (type === 'button') {
          text(el, b.label); hide(el, !b.label);
          if (!el.dataset.msrFallback) el.dataset.msrFallback = el.getAttribute('href');
          attr(el, 'href', url(b.url) || el.dataset.msrFallback);
          const geo = s.use_theme_button === false;
          for (const [k, v] of [['--mb-bg', c ? color(s.button_bg) : ''], ['--mb-border', c ? color(s.button_bg) : ''], ['--mb-text', c ? color(s.button_color) : ''], ['--mb-hover-bg', c ? color(s.button_bg_hover) : ''], ['--mb-hover-border', c ? color(s.button_bg_hover) : ''], ['--mb-hover-text', c ? color(s.button_color) : ''],
            ['--mb-radius', geo ? px(s.button_radius) : ''], ['--mb-padding-y', geo ? px(s.button_pad_y) : ''], ['--mb-padding-x', geo ? px(s.button_pad_x) : ''], ['--mb-font-size', geo ? px(s.button_size) : ''], ['--mb-weight', geo ? '600' : ''], ['--btn-border-width', geo ? '0px' : '']]) prop(el, k, v);
        }
      }
    },
  };

  /* ---------- shared: scroll-snap carousel (Reels Wall, Shoppable Video) ---------- */
  function carousel(root, st, opts) {
    const car = root.querySelector('[data-msr-carousel]'); if (!car) return;
    const track = car.querySelector('[data-msr-track]'), sig = {signal: st.ac.signal};
    const slides = () => track.querySelectorAll(':scope > [data-msr-slide]');
    const cols = () => Math.max(1, Math.floor(num(car.style.getPropertyValue(desk.matches ? '--msr-cols-d' : '--msr-cols-m'), 1)));
    const pages = () => Math.max(1, slides().length - cols() + 1);
    const grid = () => car.dataset.mode === 'grid';
    st.step = () => { const s = slides(); return s.length > 1 ? s[1].offsetLeft - s[0].offsetLeft : track.clientWidth || 1; };
    const index = () => Math.max(0, Math.min(pages() - 1, Math.round(track.scrollLeft / st.step())));
    const to = i => track.scrollTo({left: i * st.step(), behavior: reduce.matches ? 'auto' : 'smooth'});
    const go = i => { const n = pages(); to(opts.loop() ? (i % n + n) % n : Math.max(0, Math.min(n - 1, i))); };
    const update = () => {
      const i = grid() ? 0 : index(), n = pages(), loop = opts.loop();
      prop(car, '--msr-i', String(i));
      for (const d of car.querySelectorAll('[data-msr-dot]')) attr(d, 'aria-current', String(+d.dataset.msrDot === i));
      const prev = car.querySelector('[data-msr-prev]'), next = car.querySelector('[data-msr-next]');
      if (prev) prev.disabled = !loop && i <= 0;
      if (next) next.disabled = !loop && i >= n - 1;
    };
    let frame = 0;
    track.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); }, {passive: true, signal: st.ac.signal});
    car.addEventListener('click', e => {
      const t = e.target.closest('[data-msr-dot],[data-msr-prev],[data-msr-next]'); if (!t || !car.contains(t)) return;
      if (t.hasAttribute('data-msr-dot')) go(+t.dataset.msrDot); else go(index() + (t.hasAttribute('data-msr-next') ? 1 : -1));
    }, sig);
    track.addEventListener('keydown', e => {
      if (e.target !== track || grid()) return;
      const k = {ArrowLeft: index() - 1, ArrowRight: index() + 1, Home: 0, End: pages() - 1}[e.key];
      if (k === undefined) return; e.preventDefault(); go(k);
    }, sig);
    drag(track, st, 'is-dragging');
    const auto = ticker(track, st, () => !grid() && opts.autoplay() && pages() > 1, opts.delay, () => { const i = index(); to(i >= pages() - 1 ? 0 : i + 1); });
    st.cleanup.push(() => cancelAnimationFrame(frame));
    /* Applies columns, gap, pages, dots and arrows from settings; nothing is rebuilt. */
    st.layout = ({mode, cm, cd, gap, arrows, dots, mobileOnly, style, position}) => {
      const n = slides().length;
      attr(car, 'data-mode', mode);
      prop(car, '--msr-cols-m', String(cm)); prop(car, '--msr-cols-d', String(cd)); prop(car, '--msr-gap', px(gap));
      const pm = Math.max(1, n - Math.floor(cm) + 1), pd = Math.max(1, n - Math.floor(cd) + 1);
      prop(car, '--msr-p-m', String(pm)); prop(car, '--msr-p-d', String(pd));
      const ctl = car.querySelector('[data-msr-controls]');
      if (ctl) {
        attr(ctl, 'data-d', pd <= 1 ? '' : null); attr(ctl, 'data-m', pm <= 1 ? '' : null);
        attr(ctl, 'data-dots', dots); attr(ctl, 'data-style', style || 'pill'); attr(ctl, 'data-mobile-only', mobileOnly ? '' : null);
        prop(ctl, '--msr-pos', ({left: 'flex-start', right: 'flex-end'})[position] || 'center');
        hide(ctl.querySelector('[data-msr-arrows]'), !arrows);
        for (const d of ctl.querySelectorAll('[data-msr-dot]')) { const k = +d.dataset.msrDot; attr(d, 'data-d', k >= pd ? '' : null); attr(d, 'data-m', k >= pm ? '' : null); }
      }
      if (mode === 'grid' && track.scrollLeft) track.scrollLeft = 0;
      update(); auto.sync();
    };
  }
  const dotsMode = (s, video) => s.carousel_pagination === 'disable' ? 'none' : (video && s.carousel_pagination === 'show_progress_bar') || s.pagination_style === 'progress' ? 'progress' : 'dots';
  const linkOrButton = (el, href) => {
    const tag = href ? 'A' : 'BUTTON';
    if (el.tagName !== tag) { const next = document.createElement(tag); for (const a of el.attributes) next.setAttribute(a.name, a.value); next.replaceChildren(...el.childNodes); el.replaceWith(next); el = next; }
    if (href) { attr(el, 'href', href); attr(el, 'type', null); } else { attr(el, 'href', null); attr(el, 'type', 'button'); }
    return el;
  };
  const productUrl = p => url(p && typeof p === 'object' ? p.url : '');
  const sectionWidth = (el, w, fallback) => { for (const k of ['container', 'fluid_container', 'stretch_width', 'full_width']) el.classList.toggle(k, k === (w || fallback)); };
  const padding = (root, s) => { prop(root, '--section-pt', String(num(s.padding_top))); prop(root, '--section-pb', String(num(s.padding_bottom))); root.classList.toggle('pt-min', num(s.padding_top) < 30); root.classList.toggle('pb-min', num(s.padding_bottom) < 30); };

  /* ================= Reels Wall ================= */
  const REELS = {
    init(root, st) {
      videos(root, st, () => bool(st.s.autoplay_videos));
      carousel(root, st, {loop: () => false, autoplay: () => false, delay: () => 0});
      root.addEventListener('click', e => {
        const b = e.target.closest('.rw-action[data-action="like"], .rw-action[data-action="save"]'); if (!b || !root.contains(b)) return;
        e.preventDefault(); attr(b, 'aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
      }, {signal: st.ac.signal});
    },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), P = (k, v) => prop(root, k, v);
      scheme(root, s); margins(root, s); padding(root, s);
      sectionWidth(root.querySelector('.rw__inner'), s.section_width, 'fluid_container');
      P('--rw-align', ['center', 'right'].includes(s.header_alignment) ? s.header_alignment : 'left');
      P('--rw-overlay', String(num(s.overlay_strength) / 100));
      P('--rw-radius', ({square: '0px', pill: '28px'})[s.card_shape] || '18px');
      P('--rw-heading-size', px(s.custom_heading_size, 15)); P('--rw-caption-size', px(s.custom_caption_size, 12));
      cvar(root, '--rw-bg', c, color(s.custom_section_bg) || s.section_bg);
      for (const [k, id] of [['--rw-tile-bg', 'tile_bg'], ['--rw-accent', 'accent_color'], ['--rw-tile-text', 'custom_tile_text'], ['--rw-heading-color', 'custom_heading_color'], ['--rw-eyebrow-color', 'custom_eyebrow_color'], ['--mb-bg', 'custom_cta_bg'], ['--mb-border', 'custom_cta_bg'], ['--mb-text', 'custom_cta_text']]) cvar(root, k, c, s[id]);
      fontVar(root, '--rw-hfont', f, s.heading_font); fontVar(root, '--rw-bfont', f, s.body_font);
      attr(root, 'data-handle', String(bool(s.show_handle))); attr(root, 'data-actions', String(bool(s.show_actions))); attr(root, 'data-unmute', String(bool(s.show_unmute)));
      st.layout?.({mode: s.display_mode === 'grid' ? 'grid' : 'carousel', cm: num(s.columns_mobile, 1), cd: num(s.columns, 4), gap: s.column_gap, arrows: bool(s.show_arrow), dots: dotsMode(s), mobileOnly: s.carousel_pagination === 'show_dots_on_mobile', style: s.pagination_style, position: s.pagination_position});
      for (const el of root.querySelectorAll('[data-msr-block]')) {
        const b = st.block(el), type = el.dataset.msrType;
        if (type !== 'reel') {
          rich(el, b.text, st); hide(el, !plain(b.text));
          prop(el, '--b-size-m', px(b.font_size_mobile)); prop(el, '--b-size-d', px(b.font_size_desktop));
          prop(el, '--b-above', px(b.space_above)); prop(el, '--b-below', px(b.space_below));
          prop(el, '--b-weight', bool(b.enable_custom_weight) ? b.font_weight : '');
          continue;
        }
        const tile = el.querySelector('.rw-tile'), q = sel => tile.querySelector(sel);
        const href = url(b.cta_link) || productUrl(b.product);
        text(q('[data-rw-heading]'), b.heading); hide(q('[data-rw-heading]'), !b.heading);
        text(q('[data-rw-caption]'), b.caption); hide(q('[data-rw-caption]'), !b.caption);
        text(q('[data-rw-username]'), b.username); hide(q('[data-rw-handle]'), !b.username);
        const handle = q('[data-rw-handle]'), avatar = url(b.avatar, true);
        if (handle) {
          let img = handle.querySelector('img'), letter = handle.querySelector('.rw-handle__avatar-fallback');
          if (avatar && !img) { img = document.createElement('img'); img.alt = ''; img.width = 22; img.height = 22; img.loading = 'lazy'; handle.prepend(img); }
          if (img) { hide(img, !avatar); src(img, avatar); }
          if (!letter) { letter = document.createElement('span'); letter.className = 'rw-handle__avatar-fallback'; letter.setAttribute('aria-hidden', 'true'); handle.prepend(letter); }
          hide(letter, !!avatar); text(letter, String(b.username || '@').replace(/@/g, '').trim().slice(0, 1).toUpperCase());
        }
        for (const k of ['likes', 'shares', 'saves']) text(q('[data-rw-count="' + k + '"]'), b[k] || '0');
        hide(q('[data-rw-actions]'), b.show_block_actions === false);
        const link = q('[data-rw-link]'); hide(link, !href); attr(link, 'href', href || '#'); attr(link, 'aria-label', b.heading || b.cta_label || null);
        const cta = linkOrButton(q('[data-rw-cta]'), href); text(cta, b.cta_label); hide(cta, !b.cta_label);
        const poster = url(b.poster_image, true), still = q('img[data-rw-poster]') || q('img.rw-tile__placeholder');
        if (still) { if (!st.placeholders.has(still)) st.placeholders.set(still, still.getAttribute('src')); src(still, poster || st.placeholders.get(still)); }
        const v = q('video'); if (v && v.loop !== bool(s.loop_videos)) v.loop = bool(s.loop_videos);
      }
      st.syncVideos?.();
    },
  };

  /* ================= Shoppable Video ================= */
  const VIDEO = {
    init(root, st) {
      videos(root, st, () => bool(st.s.autoplay_videos));
      carousel(root, st, {loop: () => bool(st.s.infinite), autoplay: () => bool(st.s.autoplay_carousel), delay: () => num(st.s.autorotate_speed, 5) * 1000});
    },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), P = (k, v) => prop(root, k, v);
      scheme(root, s); margins(root, s); padding(root, s);
      sectionWidth(root.querySelector('.sv__inner'), s.section_width, 'fluid_container');
      P('--sv-align', ['center', 'right'].includes(s.header_alignment) ? s.header_alignment : 'left');
      const ratio = ({square: '1 / 1', tall: '9 / 16', landscape: '16 / 9', custom: String(s.custom_ratio || '3:4').replace(':', ' / ')})[s.image_ratio] || '3 / 4';
      P('--sv-ratio', CSS.supports('aspect-ratio', ratio) ? ratio : '3 / 4');
      P('--sv-radius', px(s.card_radius)); P('--sv-overlay', String(num(s.overlay_opacity) / 100)); P('--sv-card-padding', px(s.custom_card_padding)); P('--sv-heading-size', px(s.custom_heading_size, 18));
      cvar(root, '--sv-bg', c, color(s.custom_section_bg) || s.section_bg);
      for (const [k, id] of [['--sv-ink', 'custom_heading_color'], ['--sv-overlay-color', 'custom_card_overlay_color'], ['--mb-bg', 'custom_cta_bg'], ['--mb-border', 'custom_cta_bg'], ['--mb-text', 'custom_cta_text']]) cvar(root, k, c, s[id]);
      fontVar(root, '--sv-hfont', f, s.heading_font); fontVar(root, '--sv-bfont', f, s.body_font);
      attr(root, 'data-controls', String(bool(s.show_controls)));
      const head = root.querySelector('.sv__header');
      for (const [sel, v] of [['[data-sv-eyebrow]', s.subheading], ['[data-sv-heading]', s.heading], ['[data-sv-desc]', s.description]]) { const el = root.querySelector(sel); rich(el, v, st); hide(el, !plain(v)); }
      hide(head, !plain(s.subheading) && !plain(s.heading) && !plain(s.description));
      st.layout?.({mode: 'carousel', cm: num(s.columns_mobile, 1), cd: num(s.columns, 4), gap: s.column_gap, arrows: bool(s.show_arrow), dots: dotsMode(s, true), mobileOnly: s.carousel_pagination === 'show_dots_on_mobile', style: s.pagination_style, position: s.pagination_position});
      for (const el of root.querySelectorAll('[data-msr-block]')) {
        const b = st.block(el), card = el.querySelector('.sv-card'), q = sel => card.querySelector(sel);
        const href = url(b.cta_link) || productUrl(b.product), has = !!(b.heading || b.cta_label);
        hide(q('.sv-card__overlay'), !has); hide(q('.sv-card__content'), !has);
        attr(q('.sv-card__content'), 'data-pos', ['top', 'center'].includes(b.content_position) ? b.content_position : 'bottom');
        text(q('[data-sv-card-heading]'), b.heading); hide(q('[data-sv-card-heading]'), !b.heading);
        const cta = linkOrButton(q('[data-sv-cta]'), href); text(cta.querySelector('[data-sv-cta-label]'), b.cta_label); hide(cta, !b.cta_label);
        const poster = url(b.poster_image, true), still = q('img[data-sv-poster]') || q('img.sv-card__placeholder');
        if (still) {
          if (!st.placeholders.has(still)) st.placeholders.set(still, still.classList.contains('sv-card__placeholder') ? still.getAttribute('src') : root.dataset.msrPlaceholder);
          const fallback = st.placeholders.get(still);
          src(still, poster || fallback); attr(still, 'data-sv-poster', poster || !fallback ? '' : null);
          still.classList.toggle('sv-card__placeholder', !poster && !!fallback); card.classList.toggle('sv-card--has-media', !!poster || !!q('video, iframe'));
          attr(still, 'alt', poster ? (b.poster_image && b.poster_image.alt) || '' : '');
        }
        const v = q('video');
        if (v) {
          if (v.loop !== bool(s.loop_videos)) v.loop = bool(s.loop_videos);
          if (v.controls !== bool(s.show_controls)) v.controls = bool(s.show_controls);
          const muted = bool(s.muted) || bool(s.autoplay_videos); if (v.dataset.msrUser !== 'play' && v.muted !== muted) v.muted = muted;
        }
      }
      st.syncVideos?.();
    },
  };

  const TYPES = {stats: STATS, steps: STEPS, reels: REELS, video: VIDEO};

  /* ---------- registry ---------- */
  function register(root) {
    const type = TYPES[root.dataset.msr]; if (!type) return;
    const st = {
      type, raw: root.dataset.msrSettings, s: {...parse(root.dataset.msrDefaults), ...parse(root.dataset.msrSettings)},
      defaults: parse(root.dataset.msrBlockDefaults), blocks: new Map(), live: new Map(), rawBlocks: new Map(), rich: new WeakMap(), placeholders: new WeakMap(),
      ac: new AbortController(), cleanup: [], frame: 0,
    };
    st.block = el => {
      if (!el) return {};
      const id = el.dataset.msrBlock;
      if (st.rawBlocks.get(id) !== el.dataset.msrSettings) { st.rawBlocks.set(id, el.dataset.msrSettings); st.blocks.set(id, parse(el.dataset.msrSettings)); }
      return {...(st.defaults[el.dataset.msrType] || {}), ...st.blocks.get(id), ...st.live.get(id)};
    };
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    for (const m of [desk, reduce]) m.addEventListener('change', st.schedule, {signal: st.ac.signal});
    roots.set(root, st);
    try { type.init(root, st); } catch (e) { console.warn(e); }
    paint(root, st);
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.msrSettings) { st.raw = root.dataset.msrSettings; st.s = {...st.s, ...parse(st.raw)}; }
    try { st.type.paint(root, st); } catch (e) { console.warn(e); }
  }
  function drop(root, st) { st.ac.abort(); cancelAnimationFrame(st.frame); for (const f of st.cleanup) try { f(); } catch (_) {} roots.delete(root); }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll('[data-msr]')) { if (roots.has(root)) roots.get(root).schedule(); else register(root); }
  }

  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId);
    if (!id || !d.settings) return;
    const bid = d.block || d.blockId || d.block_id, key = bid ? String(bid && typeof bid === 'object' ? bid.id : bid) : '';
    for (const [root, st] of roots) {
      if (root.dataset.msrSection !== id) continue;
      if (key) st.live.set(key, {...st.live.get(key), ...d.settings});
      else Object.assign(st.s, d.settings);
      st.schedule();
    }
  });
  for (const n of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(n, scan);
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-msr],[data-msr-block]') || n.querySelector('[data-msr],[data-msr-block]'))))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-msr-settings']});
  window.MateriaMediaStatsReels = {scan, size: () => roots.size, state: root => roots.get(root)};
  scan();
})();
