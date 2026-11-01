/* Materia Themes. The testimonials sections' runtime and live editor updates:
   Testimonials Showcase, Testimonial Spotlight, Testimonial Carousel Pro,
   Testimonials 4, Community Feedback Slider, Video Testimonials 5 and
   Testimonials Grid.

   Every root [data-lt-root] carries its section settings as JSON
   (data-lt-settings) and every block [data-lt-block] its own. The Liquid
   prints the first paint (CSS variables, attributes, text), so nothing is
   painted on load: this file only sets up the behaviour each section needs
   (slider rows with arrows, dots, keyboard and autoplay; videos that play
   muted and inline and pause off screen; read more buttons), once per
   instance, and undoes it when the section is removed or drawn again.

   When the builder changes a setting (storelib:settings-change), the
   section's paint() works out the same variables and writes only what
   changed, at most once per frame, for that instance only: no picture is
   loaded again, a running slider or marquee keeps its place. */
(() => {
  if (window.MateriaLiveTestimonials) return;
  /* Testimonials Grid names its attributes data-tm-* (testimonials.css and its cleanup test read data-tm-*). */
  const SEL = '[data-lt-root], [data-tm-root]', BSEL = '[data-lt-block], [data-tm-block]';
  const bid = n => n.dataset.ltBlock || n.dataset.tmBlock, btype = n => n.dataset.ltType || n.dataset.tmType, bset = n => n.dataset.ltSettings || n.dataset.tmSettings;
  const roots = new Map();
  const api = () => window.MateriaHeroImageOne;
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const localColor = (v, f) => {
    if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; }
    v = typeof v === 'string' ? v.trim() : '';
    return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f;
  };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const pick = (on, v, f) => on ? color(v, f) : f;
  const fontCss = (v, f) => {
    if (v && typeof v === 'object' && v.family) return v.family + ', ' + (v.fallback_families || 'sans-serif');
    const fam = api() && api().font ? api().font(v) : '';
    return !fam ? f : /^var\(|,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const localUrl = (v, image) => {
    v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.preview_image?.url || v.value : v;
    if (typeof v !== 'string' || !v || v === '#') return '';
    try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; }
  };
  const url = (v, image = false) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };

  /* ---------- writers: each writes only when the value differs ---------- */
  const set = (el, p, v) => { if (!el) return; if (v == null || v === '') { if (el.style.getPropertyValue(p)) el.style.removeProperty(p); } else if (el.style.getPropertyValue(p) !== String(v)) el.style.setProperty(p, String(v)); };
  const text = (el, v) => { if (el && el.textContent !== String(v ?? '')) el.textContent = v ?? ''; };
  const hide = (el, on) => { if (el && el.hidden !== !!on) el.hidden = !!on; };
  const attr = (el, n, v) => { if (!el) return; if (v == null || v === false) { if (el.hasAttribute(n)) el.removeAttribute(n); } else { const s = v === true ? '' : String(v); if (el.getAttribute(n) !== s) el.setAttribute(n, s); } };
  /* Theme settings > Typography and Buttons win with !important unless the element opts out (snippets/theme-controls). */
  const own = (el, kind, on) => attr(el, 'data-own-' + kind, on ? true : null);
  const rich = (el, v, st) => {
    if (!el) return;
    v = v == null ? '' : String(v);
    if (st.rich.get(el) === v) return;
    if (api() && api().rich) api().rich(el, v, {rich: new WeakMap()}); else el.textContent = v.replace(/<[^>]*>/g, '');
    st.rich.set(el, v);
  };
  const scheme = (el, s) => {
    const id = s.color_scheme && s.color_scheme.id || s.color_scheme;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || el.classList.contains('color-' + id)) return;
    for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c);
    el.classList.add('color-' + id);
  };
  const frame = (root, s) => { const f = root.closest('.lt-frame'); if (f) attr(f, 'data-width', s.section_width || 'full_width'); };
  /* Five stars filled to a rating, the same fills snippets/live-testimonials-stars prints. */
  function stars(row, rating) {
    if (!row) return;
    const r = Math.max(0, Math.min(5, num(rating)));
    attr(row, 'aria-label', r + ' / 5');
    [...row.querySelectorAll('.lt-star')].forEach((s, i) => set(s, '--lt-fill', Math.round(Math.max(0, Math.min(1, r - i)) * 100) + '%'));
  }
  /* An image inside a holder: same src keeps the element (no reload). */
  function image(holder, v, alt, ph) {
    if (!holder) return;
    const src = url(v, true);
    let img = holder.querySelector(':scope > img');
    if (!src) { if (img && ph) { img.remove(); if (!holder.querySelector(':scope > [data-lt-ph]')) holder.insertAdjacentHTML('beforeend', ph); } return; }
    if (!img) { holder.querySelector(':scope > [data-lt-ph]')?.remove(); img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async'; if (v && v.width && v.height) { img.width = v.width; img.height = v.height; } holder.prepend(img); }
    const base = img.getAttribute('src') || '';
    if (base !== src && base.split('?')[0] !== src.split('?')[0]) { img.removeAttribute('srcset'); img.src = src; }
    if (alt != null && img.alt !== alt) img.alt = alt;
  }
  const link = (el, v) => { if (!el) return; const h = url(v); if (h) attr(el, 'href', h); };

  /* ---------- behaviour pieces, per instance ---------- */
  /* A native scroll row with arrows, dots, keyboard and optional autoplay.
     Mouse dragging comes from global.js ([data-testimonial-row]); touch is native. */
  function slider(st, track, opts = {}) {
    if (!track) return null;
    const root = st.el;
    const prev = opts.prev || root.querySelector('[data-lt-prev]'), next = opts.next || root.querySelector('[data-lt-next]'), dots = opts.dots || root.querySelector('[data-lt-dots]');
    let raf = 0, timer = 0, visible = false, hovered = false, focused = false, ms = 0, loop = false;
    const rtl = () => getComputedStyle(track).direction === 'rtl';
    const cards = () => [...track.children].filter(c => !c.hidden);
    const step = () => { const c = cards()[0]; return (c ? c.getBoundingClientRect().width : track.clientWidth) + (parseFloat(getComputedStyle(track).columnGap) || 0); };
    const max = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const at = () => Math.abs(track.scrollLeft);
    const go = left => track.scrollTo({left: Math.max(0, Math.min(max(), left)) * (rtl() ? -1 : 1), behavior: reduced() ? 'instant' : 'smooth'});
    const page = () => { const s = step(); return s > 0 ? Math.round(at() / s) : 0; };
    const move = dir => { const last = max(), s = step(); if (loop && dir > 0 && at() >= last - 2) go(0); else if (loop && dir < 0 && at() <= 2) go(last); else go((page() + dir) * s); };
    function update() {
      raf = 0;
      if (!track.isConnected) return;
      const last = max(), s = step(), pos = at(), pages = last > 1 && s > 0 ? Math.ceil((last - 2) / s) + 1 : 1, index = Math.min(pages - 1, Math.round(pos / Math.max(1, s)));
      if (prev) prev.disabled = !loop && pos < 2 || pages < 2;
      if (next) next.disabled = !loop && pos >= last - 2 || pages < 2;
      attr(root, 'data-scrolls', pages > 1 ? 'true' : 'false');
      if (dots) {
        if (dots.children.length !== pages) {
          const label = dots.dataset.label || 'Go to slide';
          dots.replaceChildren(...Array.from({length: pages}, (_, i) => { const d = document.createElement('button'); d.type = 'button'; d.className = 'lt-dot'; d.setAttribute('aria-label', label + ' ' + (i + 1)); d.dataset.index = i; return d; }));
        }
        [...dots.children].forEach((d, i) => attr(d, 'aria-current', i === index ? 'true' : 'false'));
      }
      if (opts.onUpdate) opts.onUpdate({pos, last, index, pages});
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onPrev = () => move(-1), onNext = () => move(1);
    const onDot = e => { const d = e.target.closest('.lt-dot'); if (d) go(num(d.dataset.index) * step()); };
    const onKey = e => {
      if (e.target !== track) return;
      const k = e.key, dir = rtl() ? -1 : 1;
      if (k === 'ArrowRight' || k === 'ArrowLeft') { move((k === 'ArrowRight' ? 1 : -1) * dir); e.preventDefault(); }
      else if (k === 'Home') { go(0); e.preventDefault(); } else if (k === 'End') { go(max()); e.preventDefault(); }
    };
    prev && prev.addEventListener('click', onPrev);
    next && next.addEventListener('click', onNext);
    dots && dots.addEventListener('click', onDot);
    track.addEventListener('keydown', onKey);
    track.addEventListener('scroll', schedule, {passive: true});
    const ro = 'ResizeObserver' in window ? new ResizeObserver(schedule) : null;
    if (ro) { ro.observe(track); for (const c of track.children) ro.observe(c); } else requestAnimationFrame(schedule);
    /* Autoplay: only while on screen, the tab is shown, nothing is hovered or focused, and motion is allowed. */
    const stop = () => { if (timer) { clearInterval(timer); timer = 0; } };
    const start = () => { stop(); if (ms > 0 && visible && !hovered && !focused && !document.hidden && !reduced() && track.isConnected) timer = setInterval(() => { if (!track.isConnected) return stop(); move(1); }, ms); };
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { for (const e of es) visible = e.isIntersecting; start(); }) : null;
    if (io) io.observe(track); else visible = true;
    const hold = e => { if (e.type === 'pointerenter' || e.type === 'pointerleave') hovered = e.type === 'pointerenter'; else focused = e.type === 'focusin'; start(); };
    const evs = ['pointerenter', 'pointerleave', 'focusin', 'focusout'];
    for (const t of evs) root.addEventListener(t, hold);
    const vis = () => start();
    document.addEventListener('visibilitychange', vis);
    const ctl = {
      el: track, update: schedule, go, move,
      get running() { return !!timer; },
      config(o) { ms = Math.max(0, num(o.autoplay)) ; loop = !!o.loop; start(); schedule(); },
      refresh() { if (ro) for (const c of track.children) ro.observe(c); schedule(); },
      destroy() { stop(); cancelAnimationFrame(raf); ro && ro.disconnect(); io && io.disconnect(); prev && prev.removeEventListener('click', onPrev); next && next.removeEventListener('click', onNext); dots && dots.removeEventListener('click', onDot); track.removeEventListener('keydown', onKey); track.removeEventListener('scroll', schedule); for (const t of evs) root.removeEventListener(t, hold); document.removeEventListener('visibilitychange', vis); },
    };
    ctl.config(opts);
    st.off.push(() => ctl.destroy());
    return ctl;
  }
  /* Videos: muted and inline; an autoplay video plays only while on screen and motion is allowed, and pauses off screen. */
  function videos(st, scope = st.el) {
    const list = [...scope.querySelectorAll('video')].filter(v => !st.videos.has(v));
    if (!list.length) return;
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
      for (const e of es) {
        const v = e.target;
        v.__ltSeen = e.isIntersecting;
        if (!e.isIntersecting) { if (!v.paused) { v.__ltOff = true; v.pause(); } }
        else if (v.hasAttribute('data-lt-autoplay') && !reduced() && (v.__ltOff || v.paused && !v.__ltUser)) { v.__ltOff = false; v.muted = v.muted || !v.__ltSound; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      }
    }, {threshold: 0.15}) : null;
    for (const v of list) {
      st.videos.add(v);
      if (v.hasAttribute('muted')) v.muted = true;
      v.playsInline = true; v.setAttribute('playsinline', '');
      if (reduced() || !('IntersectionObserver' in window)) { v.autoplay = false; v.removeAttribute('autoplay'); if (reduced()) v.pause(); }
      else if (v.hasAttribute('data-lt-autoplay')) { v.autoplay = false; v.removeAttribute('autoplay'); }
      const box = v.parentElement, play = box && box.querySelector(':scope > [data-lt-play]'), mute = box && box.querySelector(':scope > [data-lt-mute]');
      const sync = () => { attr(play, 'data-state', v.paused ? 'paused' : 'playing'); attr(mute, 'data-state', v.muted ? 'muted' : 'unmuted'); attr(play, 'aria-pressed', v.paused ? 'false' : 'true'); attr(mute, 'aria-pressed', v.muted ? 'true' : 'false'); };
      const onPlay = e => { e.preventDefault(); v.__ltUser = !v.paused; if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); };
      const onMute = e => { e.preventDefault(); v.muted = !v.muted; sync(); };
      play && play.addEventListener('click', onPlay);
      mute && mute.addEventListener('click', onMute);
      for (const t of ['play', 'pause', 'volumechange']) v.addEventListener(t, sync);
      sync();
      io && io.observe(v);
      st.off.push(() => { io && io.unobserve(v); play && play.removeEventListener('click', onPlay); mute && mute.removeEventListener('click', onMute); for (const t of ['play', 'pause', 'volumechange']) v.removeEventListener(t, sync); });
    }
    if (io) st.off.push(() => io.disconnect());
  }
  /* A video's player settings, live. */
  function videoSettings(v, b) {
    if (!v) return;
    const auto = bool(b.video_autoplay), sound = bool(b.video_sound_on) && !auto;
    attr(v, 'data-lt-autoplay', auto); attr(v, 'loop', bool(b.video_loop)); v.loop = bool(b.video_loop);
    attr(v, 'controls', bool(b.video_controls)); v.controls = bool(b.video_controls);
    v.__ltSound = sound;
    if (!auto && !v.paused && !v.__ltUser) v.pause();
    if (!sound && !v.muted) v.muted = true;
    if (sound && v.paused) v.muted = false;
    attr(v, 'muted', !sound);
    const box = v.parentElement;
    for (const btn of box ? box.querySelectorAll(':scope > .lt-vbtn') : []) hide(btn, bool(b.video_controls));
    if (auto && v.__ltSeen && v.paused && !reduced()) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
  }

  /* ---------- section types ---------- */
  const PH_IMG = '<div class="tsh__ph" data-lt-ph><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
  const PH_AVATAR = '<svg viewBox="0 0 52 52" aria-hidden="true" focusable="false" data-lt-ph><circle cx="26" cy="21" r="9" fill="currentColor"/><path d="M6 48c0-10 9-15 20-15s20 5 20 15" fill="currentColor"/></svg>';
  const TYPES = {};

  /* Testimonials Showcase */
  TYPES.testimonials3 = {
    init(root, st) { st.slider = slider(st, root.querySelector('[data-lt-track]')); videos(st); },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts);
      scheme(root, s); frame(root, s);
      const v = {
        '--tsh-bg': pick(c, s.section_bg, 'var(--color-background)'), '--tsh-text': pick(c, s.text_color, 'var(--color-text)'),
        '--tsh-card-bg': pick(c, s.card_bg, 'color-mix(in srgb, var(--color-text) 4%, var(--color-background))'),
        '--tsh-name-c': pick(c, s.name_color, 'var(--color-heading)'), '--tsh-body-c': pick(c, s.body_color, 'var(--color-text)'),
        '--tsh-muted-c': pick(c, s.muted_color, 'color-mix(in srgb, var(--color-text) 70%, transparent)'),
        '--lt-star-on': pick(c, s.star_color, 'var(--color-primary)'), '--lt-star-off': pick(c, s.star_empty_color, 'color-mix(in srgb, var(--color-text) 20%, transparent)'),
        '--lt-arrow-bg': pick(c, s.arrow_bg, 'var(--color-background)'), '--lt-arrow-c': pick(c, s.arrow_color, 'var(--color-heading)'), '--lt-arrow-border': pick(c, s.arrow_border, 'var(--color-border)'),
        '--lt-arrow-bg-h': pick(c, s.arrow_bg_hover, 'var(--color-heading)'), '--lt-arrow-c-h': pick(c, s.arrow_color_hover, 'var(--color-background)'),
        '--lt-dot': pick(c, s.dot_color, 'color-mix(in srgb, var(--color-text) 30%, transparent)'), '--lt-dot-active': pick(c, s.dot_active_color, 'var(--color-heading)'),
        '--tsh-hf': f ? fontCss(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)', '--tsh-bf': f ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)',
        '--tsh-pt': px(s.padding_top), '--tsh-pb': px(s.padding_bottom), '--tsh-max': px(s.max_width, 1280), '--tsh-gap': px(s.card_gap, 20),
        '--tsh-align': s.text_align || 'center', '--tsh-mpv': String(s.mobile_per_view || 1), '--tsh-radius': px(s.card_radius), '--tsh-name-size': px(s.name_size, 17), '--lt-star-size': px(s.star_size, 18),
      };
      for (const [k, x] of Object.entries(v)) set(root, k, x);
      own(root, 'font', f);
      attr(root, 'data-nav', bool(s.show_nav) ? 'true' : 'false'); attr(root, 'data-dots', bool(s.show_dots) ? 'true' : 'false');
      for (const el of root.querySelectorAll('[data-lt-block]')) {
        const b = st.block(el), t = el.dataset.ltType, bc = bool(b.enable_custom_style);
        if (t === 'eyebrow' || t === 'heading' || t === 'subheading') {
          if (t === 'eyebrow') text(el, b.text); else rich(el, b.text, st);
          hide(el, !String(b.text || '').replace(/<[^>]*>/g, '').trim());
          set(el, '--b-c', pick(bc, b.color, t === 'heading' ? 'var(--color-heading)' : 'var(--color-text)'));
          set(el, '--b-w', bool(b.weight_enable) ? String(b.weight) : null); own(el, 'weight', bool(b.weight_enable));
          if (t !== 'eyebrow') { set(el, '--b-fs-m', px(b.size_mobile, t === 'heading' ? 28 : 15)); set(el, '--b-fs-d', px(b.size, t === 'heading' ? 44 : 16)); }
        } else if (t === 'testimonial') {
          stars(el.querySelector('[data-lt-stars]'), b.rating);
          text(el.querySelector('[data-lt-name]'), b.name || 'Customer');
          const d = el.querySelector('[data-lt-date]'); text(d, (b.date_prefix || 'Published') + ' ' + (b.date || '')); hide(d, !b.date);
          const body = el.querySelector('[data-lt-text]'); text(body, b.body); hide(body, !b.body);
          set(body, '--b-fs-m', px(b.body_size_mobile, 14)); set(body, '--b-fs-d', px(b.body_size_desktop, 14));
          const media = el.querySelector('[data-lt-media]'), vid = media && media.querySelector('video');
          if (vid) videoSettings(vid, b); else image(media, b.image, b.name || '', PH_IMG);
        }
      }
      st.slider && st.slider.refresh();
    },
  };

  /* Testimonial Spotlight */
  TYPES.testimonials4 = {
    init(root, st) { st.slider = slider(st, root.querySelector('[data-lt-track]'), {autoplay: num(st.s.autoplay_s) * 1000, loop: true}); },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts);
      scheme(root, s); frame(root, s);
      const v = {
        '--tsp-bg': pick(c, s.section_bg, 'var(--color-background)'), '--tsp-text': pick(c, s.text_color, 'var(--color-text)'),
        '--tsp-quote-c': pick(c, s.quote_color, 'var(--color-heading)'), '--tsp-name-c': pick(c, s.name_color, 'var(--color-heading)'),
        '--tsp-role-c': pick(c, s.role_color, 'color-mix(in srgb, var(--color-text) 75%, transparent)'),
        '--lt-star-on': pick(c, s.star_color, 'var(--color-primary)'), '--lt-star-off': pick(c, s.star_empty_color, 'color-mix(in srgb, var(--color-text) 20%, transparent)'),
        '--lt-arrow-bg': pick(c, s.arrow_bg, 'var(--color-background)'), '--lt-arrow-c': pick(c, s.arrow_color, 'var(--color-heading)'), '--lt-arrow-border': pick(c, s.arrow_border, 'var(--color-border)'),
        '--lt-arrow-bg-h': pick(c, s.arrow_bg_hover, 'var(--color-heading)'), '--lt-arrow-c-h': pick(c, s.arrow_color_hover, 'var(--color-background)'),
        '--lt-dot': pick(c, s.dot_color, 'color-mix(in srgb, var(--color-text) 30%, transparent)'), '--lt-dot-active': pick(c, s.dot_active_color, 'var(--color-heading)'),
        '--tsp-hf': f ? fontCss(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)', '--tsp-bf': f ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)',
        '--tsp-pt': px(s.padding_top), '--tsp-pb': px(s.padding_bottom), '--tsp-max': px(s.max_width, 880), '--tsp-align': s.text_align || 'center',
        '--tsp-q-d': px(s.quote_size, 28), '--tsp-q-m': px(s.quote_size_mobile, 20), '--lt-star-size': px(s.star_size, 22),
      };
      for (const [k, x] of Object.entries(v)) set(root, k, x);
      own(root, 'font', f);
      attr(root, 'data-align', s.text_align || 'center');
      for (const el of root.querySelectorAll('[data-lt-block]')) {
        const b = st.block(el), t = el.dataset.ltType, bc = bool(b.enable_custom_style);
        if (t === 'eyebrow' || t === 'heading' || t === 'subheading') {
          if (t === 'eyebrow') text(el, b.text); else rich(el, b.text, st);
          hide(el, !String(b.text || '').replace(/<[^>]*>/g, '').trim());
          set(el, '--b-c', pick(bc, b.color, t === 'heading' ? 'var(--color-heading)' : 'var(--color-text)'));
          if (t === 'heading') { set(el, '--b-fs-d', px(b.size, 44)); set(el, '--b-fs-m', px(b.size_mobile, 24)); }
          if (t === 'subheading') set(el, '--b-fs', px(b.size, 16));
        } else if (t === 'testimonial') {
          stars(el.querySelector('[data-lt-stars]'), b.rating);
          text(el.querySelector('[data-lt-text]'), b.body);
          text(el.querySelector('[data-lt-name]'), b.name || 'Customer');
          const r = el.querySelector('[data-lt-role]'); text(r, b.role); hide(r, !b.role);
          image(el.querySelector('[data-lt-media]'), b.avatar, b.name || '', PH_AVATAR);
        }
      }
      if (st.slider) { st.slider.config({autoplay: num(s.autoplay_s) * 1000, loop: true}); st.slider.refresh(); }
    },
  };

  /* A theme button (data-theme-button): link or <button>, label, the creator's colours while custom styling is on, own shape while the theme button is off. */
  function button(el, b, map) {
    if (!el) return el;
    const h = url(b[map.link || 'link']), tag = h ? 'A' : 'BUTTON';
    if (el.tagName !== tag) {
      const n = document.createElement(tag);
      for (const a of el.attributes) n.setAttribute(a.name, a.value);
      n.replaceChildren(...el.childNodes);
      el.replaceWith(n); el = n;
    }
    if (h) { attr(el, 'href', h); attr(el, 'type', null); } else { attr(el, 'href', null); attr(el, 'type', 'button'); }
    if (map.target) attr(el, 'target', bool(b[map.target]) && h ? '_blank' : null);
    text(el, b[map.label || 'label'] || '');
    const c = map.custom != null ? map.custom : bool(b.enable_custom_style), cv = k => c && map[k] ? color(b[map[k]], '') : '';
    const bg = cv('bg'), hb = cv('hoverBg');
    set(el, '--mb-bg', bg); set(el, '--mb-text', cv('text')); set(el, '--mb-border', cv('border') || bg);
    set(el, '--mb-hover-bg', hb); set(el, '--mb-hover-text', cv('hoverText')); set(el, '--mb-hover-border', cv('hoverBorder') || hb);
    const shape = map.shape != null ? map.shape : b.use_theme_button === false || b.use_theme_button === 'false';
    const sz = (k, d) => shape && map[k] ? px(b[map[k]], d) : null;
    set(el, '--mb-radius', sz('radius')); set(el, '--mb-padding-y', sz('padY')); set(el, '--mb-padding-x', sz('padX')); set(el, '--mb-font-size', sz('size'));
    set(el, '--mb-border-width', sz('borderWidth')); set(el, '--btn-border-width', sz('borderWidth'));
    own(el, 'shape', shape);
    return el;
  }

  /* Testimonial Carousel Pro */
  TYPES.reviews2 = {
    init(root, st) {
      /* the rows drift only while on screen */
      if (!('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver(es => { for (const e of es) attr(root, 'data-lt-paused', e.isIntersecting ? null : true); });
      io.observe(root);
      st.off.push(() => io.disconnect());
    },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts);
      scheme(root, s); frame(root, s);
      const v = {
        '--tcp-bg': pick(c, s.section_bg, 'var(--color-background)'), '--tcp-text': pick(c, s.text_color, 'var(--color-text)'),
        '--tcp-card-bg': pick(c, s.card_bg, 'color-mix(in srgb, var(--color-text) 5%, var(--color-background))'), '--tcp-card-c': pick(c, s.card_text_color, 'var(--color-text)'),
        '--tcp-role-c': pick(c, s.role_color, 'color-mix(in srgb, var(--color-text) 70%, transparent)'),
        '--lt-star-on': pick(c, s.star_bg, 'var(--color-primary)'), '--lt-star-off': pick(c, s.star_empty_bg, 'color-mix(in srgb, var(--color-primary) 20%, var(--color-background))'),
        '--tcp-fade': pick(c, s.edge_fade_color, 'var(--tcp-bg)'),
        '--tcp-hf': f ? fontCss(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)', '--tcp-bf': f ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)',
        '--tcp-pt': px(s.padding_top), '--tcp-pb': px(s.padding_bottom), '--tcp-align': s.heading_align || 'center', '--tcp-head-gap': px(s.heading_to_grid_gap),
        '--tcp-row-gap': px(s.row_gap), '--tcp-gap': px(s.card_gap, 16), '--tcp-card-w': px(s.card_width, 320), '--tcp-card-w-m': px(s.card_width_mobile, 280),
        '--tcp-radius': px(s.card_radius), '--lt-star-size': px(s.star_size, 26), '--tcp-speed': num(s.speed_s, 60) + 's', '--tcp-fade-size': num(s.edge_fade_size, 8) + '%',
      };
      for (const [k, x] of Object.entries(v)) set(root, k, x);
      own(root, 'font', f);
      attr(root, 'data-fade', bool(s.edge_fade) ? 'true' : 'false');
      for (const el of root.querySelectorAll('[data-lt-block]')) {
        const b = st.block(el), t = el.dataset.ltType, bc = bool(b.enable_custom_style);
        if (t === 'eyebrow' || t === 'heading' || t === 'subheading') {
          if (t === 'eyebrow') text(el, b.text); else rich(el, b.text, st);
          hide(el, !String(b.text || '').replace(/<[^>]*>/g, '').trim());
          set(el, '--b-c', pick(bc, b.color, t === 'heading' ? 'var(--color-heading)' : 'var(--color-text)'));
          const w = bool(b.enable_custom_weight); set(el, '--b-w', w ? String(b.font_weight) : null); own(el, 'weight', w);
          const d = {eyebrow: [b.size_desktop, 12, 12], heading: [b.size, 44, 26], subheading: [b.size, 16, 15]}[t];
          set(el, '--b-fs-d', px(d[0], d[1])); set(el, '--b-fs-m', px(b.size_mobile, d[2]));
          set(el, '--b-above', px(b.space_above)); set(el, '--b-below', px(b.space_below));
        } else if (t === 'review') {
          text(el.querySelector('[data-lt-name]'), b.name || 'Customer');
          const r = el.querySelector('[data-lt-role]'); text(r, b.role); hide(r, !b.role);
          const body = el.querySelector('[data-lt-text]'); text(body, b.body); hide(body, !b.body);
          stars(el.querySelector('[data-lt-stars]'), b.rating);
          image(el.querySelector('[data-lt-media]'), b.avatar, b.name || '', PH_AVATAR);
        } else if (t === 'cta') {
          hide(el, !b.label);
          button(el.querySelector('[data-lt-button]'), b, {bg: 'bg', text: 'text_color', hoverBg: 'bg_hover', hoverText: 'text_hover', radius: 'radius', padY: 'padding_y', padX: 'padding_x', size: 'size'});
        }
      }
    },
  };

  /* Community Feedback Slider */
  TYPES.comunitysldier = {
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts);
      scheme(root, s); frame(root, s);
      const v = {
        '--cfs-bg': pick(c, s.section_bg, 'var(--color-background)'), '--cfs-text': pick(c, s.text_color, 'var(--color-text)'),
        '--cfs-card-bg': pick(c, s.card_bg, 'color-mix(in srgb, var(--color-text) 4%, var(--color-background))'), '--cfs-score-c': pick(c, s.score_color, 'var(--color-heading)'),
        '--cfs-q-c': pick(c, s.question_color, 'var(--color-heading)'), '--cfs-muted-c': pick(c, s.muted_color, 'color-mix(in srgb, var(--color-text) 72%, transparent)'),
        '--lt-star-on': pick(c, s.star_color, 'var(--color-primary)'), '--lt-star-off': pick(c, s.star_empty_color, 'var(--color-border)'),
        '--cfs-track': pick(c, s.bar_track_color, 'var(--color-border)'), '--cfs-fill': pick(c, s.bar_fill_color, 'var(--color-heading)'), '--cfs-marker-c': pick(c, s.marker_color, 'var(--color-heading)'),
        '--cfs-hf': f ? fontCss(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)', '--cfs-bf': f ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)',
        '--cfs-pt': px(s.padding_top), '--cfs-pb': px(s.padding_bottom), '--cfs-max': px(s.max_width, 760), '--cfs-radius': px(s.card_radius), '--cfs-bar-h': px(s.bar_height, 4), '--cfs-marker': px(s.marker_size, 18),
      };
      for (const [k, x] of Object.entries(v)) set(root, k, x);
      own(root, 'font', f);
      const legacy = root.querySelector('[data-lt-legacy]');
      if (legacy) {
        hide(legacy, !bool(s.show_header));
        text(legacy.querySelector('[data-lt-score]'), s.overall_score);
        stars(legacy.querySelector('[data-lt-stars]'), s.overall_score_int);
        const n = legacy.querySelector('[data-lt-count]'), o = legacy.querySelector('[data-lt-note]');
        text(n, s.review_count); hide(n, !s.review_count); text(o, s.source_note); hide(o, !s.source_note);
      }
      for (const el of root.querySelectorAll('[data-lt-block]')) {
        const b = st.block(el), t = el.dataset.ltType;
        if (t === 'heading') {
          rich(el, b.text, st); hide(el, !String(b.text || '').replace(/<[^>]*>/g, '').trim());
          set(el, '--b-c', pick(bool(b.enable_custom_style), b.color, 'var(--color-heading)')); set(el, '--b-fs-d', px(b.size, 36)); set(el, '--b-fs-m', px(b.size_mobile, 26));
        } else if (t === 'summary') {
          const sc = el.querySelector('[data-lt-score]'); text(sc, b.score); hide(sc, !b.score);
          stars(el.querySelector('[data-lt-stars]'), parseFloat(String(b.score || '0').replace(',', '.')) || 0);
          const n = el.querySelector('[data-lt-count]'), o = el.querySelector('[data-lt-note]');
          text(n, b.count); hide(n, !b.count); text(o, b.note); hide(o, !b.note);
        } else if (t === 'question') {
          const val = Math.max(0, Math.min(100, num(b.value)));
          set(el, '--v', val + '%');
          const q = b.question || 'Question', lo = b.left_label || 'Low', hi = b.right_label || 'High';
          text(el.querySelector('[data-lt-q]'), q); text(el.querySelector('[data-lt-left]'), lo); text(el.querySelector('[data-lt-right]'), hi);
          const bar = el.querySelector('[data-lt-bar]'); attr(bar, 'aria-valuenow', val); attr(bar, 'aria-label', q); attr(bar, 'aria-valuetext', val + '% (' + lo + ' to ' + hi + ')');
        }
      }
    },
  };

  /* Testimonials 4 */
  const words = (t, n) => { const w = String(t || '').trim().split(/\s+/).filter(Boolean); return w.length > n ? w.slice(0, n).join(' ') + '...' : w.join(' '); };
  TYPES.testimon4 = {
    init(root, st) {
      st.slider = slider(st, root.querySelector('[data-lt-track]'), {loop: true});
      /* Read more: phones and tablets show the first words of each review */
      const onMore = e => {
        const btn = e.target.closest('[data-lt-more]');
        if (!btn || !root.contains(btn)) return;
        const p = btn.closest('[data-lt-review]'), open = !p.hasAttribute('data-open');
        attr(p, 'data-open', open || null); attr(btn, 'aria-expanded', open ? 'true' : 'false');
        text(btn, open ? btn.dataset.less : btn.dataset.more);
      };
      root.addEventListener('click', onMore);
      st.off.push(() => root.removeEventListener('click', onMore));
    },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), hf = bool(s.heading_custom), tf = bool(s.text_custom), shape = s.use_theme_button === false || s.use_theme_button === 'false';
      scheme(root, s);
      const al = s.heading_align || 'center', cal = s.card_heading_align || 'center', j = a => a === 'left' ? 'flex-start' : a === 'right' ? 'flex-end' : 'center';
      const view = num(s.slider_view, 3), lh = (v, d) => String(num(v, d) / 100);
      const v = {
        '--t4-bg': pick(c, s.background_color, 'var(--color-background)'), '--t4-bg-img': c && s.background_gradient ? s.background_gradient : 'none',
        '--t4-border': pick(c, s.border_color, 'var(--color-border)'), '--t4-border-w': px(s.border_thickness),
        '--t4-heading-c': pick(c, s.heading_color, 'var(--color-heading)'), '--t4-rating-c': pick(c, s.rating_text_color, 'var(--color-heading)'), '--t4-text': pick(c, s.text_color, 'var(--color-text)'),
        '--t4-star-glyph': pick(c, s.stars_color, 'var(--btn-primary-color, #fff)'), '--lt-star-on': pick(c, s.stars_bg_color, 'var(--color-primary)'), '--lt-star-off': pick(c, s.stars_bg_half_color, 'var(--color-border)'),
        '--t4-card-bg': pick(c, s.card_bg_color, 'var(--color-background)'), '--t4-card-border': pick(c, s.card_border_color, 'var(--color-border)'),
        '--t4-shadow': bool(s.card_shadow) ? '0 0 20px 0 color-mix(in srgb, ' + pick(c, s.card_shadow_color, 'var(--color-text)') + ' 20%, transparent)' : 'none',
        '--t4-ch-c': pick(c, s.card_heading_color, 'var(--color-heading)'), '--t4-ct-c': pick(c, s.card_text_color, 'var(--color-text)'), '--t4-au-c': pick(c, s.card_author_date_text_color, 'var(--color-text)'),
        '--t4-arrow-c': pick(c, s.arrow_color, 'var(--color-heading)'), '--t4-arrow-c-h': pick(c, s.arrow_hover_color, 'var(--color-heading)'), '--t4-arrow-bg': pick(c, s.arrow_bg_color, 'var(--color-background)'), '--t4-arrow-bg-h': pick(c, s.arrow_bg_hover_color, 'var(--color-background)'),
        '--t4-arrow-border': pick(c, s.arrow_border_color, 'var(--color-border)'), '--t4-arrow-border-h': pick(c, s.arrow_border_hover_color, 'var(--color-heading)'), '--t4-dot-c': pick(c, s.dots_color, 'var(--color-heading)'),
        '--t4-hf': hf ? fontCss(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)', '--t4-hw': hf && s.heading_font && s.heading_font.weight ? String(s.heading_font.weight) : 'var(--heading-weight, 700)', '--t4-tf': tf ? fontCss(s.text_font, 'var(--body-font)') : 'var(--body-font)',
        '--t4-h-lh': hf ? lh(s.heading_height, 130) : 'var(--heading-line-height, 1.2)', '--t4-t-lh': lh(s.text_height, 130), '--t4-ct-lh': lh(s.card_text_height, 150),
        '--t4-max': bool(s.full_width) ? 'none' : px(s.content_width, 1500), '--t4-align': al, '--t4-justify': j(al), '--t4-card-align': cal, '--t4-card-justify': j(cal),
        '--t4-mt': px(s.margin_top), '--t4-mb': px(s.margin_bottom), '--t4-pt': px(s.padding_top), '--t4-pb': px(s.padding_bottom), '--t4-px': num(s.padding_horizontal) + 'rem', '--t4-px-m': num(s.padding_horizontal_mobile) + 'rem',
        '--t4-h': px(s.heading_size, 40), '--t4-h-m': px(s.heading_size_mobile, 24), '--t4-r': px(s.rating_text_size, 22), '--t4-r-m': px(s.rating_text_size_mobile, 20), '--t4-rating-mt': px(s.rating_text_mt),
        '--t4-prof': px(s.profile_size, 34), '--t4-prof-m': px(s.profile_size_mobile, 32), '--t4-overlap': px(s.profile_overlap), '--t4-prof-gap': px(s.profile_gap),
        '--t4-t': px(s.text_size, 20), '--t4-t-m': Math.round(num(s.text_size, 20) * 0.8) + 'px', '--t4-text-mt': px(s.text_mt), '--t4-star': px(s.stars_size, 20), '--t4-star-m': Math.round(num(s.stars_size, 20) * 0.8) + 'px', '--lt-star-gap': px(s.stars_gap),
        '--t4-slider-w': num(s.slider_width, 100) + '%', '--t4-slider-mt': px(s.slider_mt), '--t4-gap': px(s.slider_gap), '--t4-pv': String(view), '--t4-pv-t': String(Math.max(1, Math.round(view * 0.5))), '--t4-pv-m': String(num(s.slider_view_mobile, 1)),
        '--t4-cpy': px(s.card_padding_vertical), '--t4-cpx': px(s.card_padding_horizontal), '--t4-card-r': px(s.card_radius), '--t4-card-bw': px(s.card_border_thickness), '--t4-card-mt': px(s.card_heading_mt),
        '--t4-ch': px(s.card_heading_size, 24), '--t4-ch-m': px(s.card_heading_size_mobile, 20), '--t4-ct': px(s.card_text_size, 14), '--t4-au': px(s.card_author_date_text_size, 16),
        '--t4-arrow': px(s.arrow_size, 50), '--t4-arrow-icon': px(s.arrow_icon_size, 28), '--t4-arrow-bw': px(s.arrow_border_thickness), '--t4-dot': px(s.dots_size, 12), '--t4-btn-mt': px(s.button_mt),
      };
      for (const [k, x] of Object.entries(v)) set(root, k, x);
      own(root, 'font', hf || tf);
      attr(root, 'data-card-align', cal);
      for (const [a, k] of [['data-arrows-d', 'arrow_show_desktop'], ['data-arrows-m', 'arrow_show_mobile'], ['data-dots-d', 'dots_show_desktop'], ['data-dots-m', 'dots_show_mobile']]) attr(root, a, bool(s[k]) ? 'true' : 'false');
      const h = root.querySelector('[data-lt-heading]'); text(h, s.heading); hide(h, !s.heading); own(h, 'size', hf); own(h, 'weight', hf);
      const rt = root.querySelector('[data-lt-rating-text]'), sc = root.querySelector('[data-lt-score]');
      text(rt, s.rating_text); hide(rt, bool(s.rating_text_hide)); text(sc && sc.querySelector('b'), s.rating); hide(sc, bool(s.rating_hide));
      hide(root.querySelector('[data-lt-rating]'), bool(s.rating_text_hide) && bool(s.rating_hide));
      hide(root.querySelector('[data-lt-profiles]'), !bool(s.enable_profile_images));
      for (const p of root.querySelectorAll('[data-lt-profile]')) image(p, s[p.dataset.ltProfile], '', PH_AVATAR);
      const row = root.querySelector('[data-lt-textrow]'); rich(row && row.querySelector('[data-lt-copy]'), s.text, st); hide(row, !String(s.text || '').replace(/<[^>]*>/g, '').trim());
      const ti = root.querySelector('[data-lt-media]'); image(ti, s.text_right_image, (s.text_right_image && s.text_right_image.alt) || ''); hide(ti, !url(s.text_right_image, true));
      const n = Math.max(1, num(s.card_count_words, 20));
      root.dataset.words = n;
      for (const el of root.querySelectorAll('[data-lt-block]')) {
        const b = st.block(el);
        const starRow = el.querySelector('[data-lt-stars]'); stars(starRow, b.stars_count); hide(starRow, num(b.stars_count) === 0);
        const icons = el.querySelector('[data-lt-icon-stars]'); if (icons) attr(icons, 'aria-label', num(b.stars_count) + ' / 5');
        const ch = el.querySelector('[data-lt-card-heading]'); text(ch, b.heading); hide(ch, !b.heading); own(ch, 'size', hf); own(ch, 'weight', hf);
        const plain = String(b.text || '').replace(/<[^>]*>/g, '').trim(), rv = el.querySelector('[data-lt-review]');
        if (rv) {
          hide(rv, !plain);
          text(rv.querySelector('.t4__short'), words(plain, n)); text(rv.querySelector('.t4__full'), plain);
          const more = rv.querySelector('[data-lt-more]'), long = plain.split(/\s+/).filter(Boolean).length > n;
          hide(more, !long); more.dataset.more = s.card_text_more || ''; more.dataset.less = s.card_text_less || '';
          text(more, rv.hasAttribute('data-open') ? s.card_text_less : s.card_text_more);
        }
        const au = el.querySelector('[data-lt-author]'); text(au, b.author_date); hide(au, !b.author_date);
      }
      const br = root.querySelector('[data-lt-btn-row]');
      hide(br, !s.button);
      const btn = button(br && br.querySelector('[data-lt-button]'), s, {label: 'button', link: 'button_url', target: 'new_tab', custom: c, bg: 'button_bg_color', text: 'button_color', border: 'button_border_color', hoverBg: 'button_bg_hover_color', hoverText: 'button_hover_color', hoverBorder: 'button_border_hover_color', shape, radius: 'button_radius', padY: 'button_padding_vertical', padX: 'button_padding_horizontal', size: 'button_size', borderWidth: 'button_border_thickness'});
      if (btn) { set(btn, '--mb-font', tf ? fontCss(s.text_font, '') : null); own(btn, 'font', tf); attr(btn, 'rel', bool(s.new_tab) && url(s.button_url) ? 'noopener' : null); }
      if (st.slider) st.slider.refresh();
    },
  };

  /* Video Testimonials 5. Its own inline script runs the row on the storefront and sets __ctvInited;
     when the builder drew the section without running it, the same rail runs from here. */
  const OVERLAY = {none: '0,0,0', white: '255,255,255', gray: '128,128,128', 'light-gray': '211,211,211', 'dark-gray': '169,169,169'};
  function rail(st, section) {
    const viewport = section.querySelector('[data-ctv-viewport]'), track = section.querySelector('[data-ctv-rail]');
    const progress = section.querySelector('[data-ctv-progress]'), fill = section.querySelector('[data-ctv-progress-fill]');
    if (!viewport || !track) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!track.isConnected) return;
      const max = track.scrollWidth - track.clientWidth, fits = max <= 1;
      track.classList.toggle('is-centered', fits); viewport.classList.toggle('is-static', fits);
      if (!progress || !fill) return;
      const pct = fits ? 0 : Math.max(0, Math.min(100, Math.abs(track.scrollLeft) / max * 100));
      fill.style.width = pct + '%'; progress.setAttribute('aria-valuenow', Math.round(pct));
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onClick = e => { const r = progress.getBoundingClientRect(), pct = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); track.scrollTo({left: (track.scrollWidth - track.clientWidth) * pct, behavior: reduced() ? 'instant' : 'smooth'}); };
    const onKey = e => { const step = track.clientWidth * 0.8; if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { track.scrollBy({left: e.key === 'ArrowRight' ? step : -step, behavior: reduced() ? 'instant' : 'smooth'}); e.preventDefault(); } };
    progress && progress.addEventListener('click', onClick);
    track.addEventListener('scroll', schedule, {passive: true});
    viewport.tabIndex = 0;
    viewport.addEventListener('keydown', onKey);
    const ro = 'ResizeObserver' in window ? new ResizeObserver(schedule) : null;
    if (ro) { ro.observe(track); for (const c of track.children) ro.observe(c); } else requestAnimationFrame(schedule);
    st.off.push(() => { cancelAnimationFrame(raf); ro && ro.disconnect(); progress && progress.removeEventListener('click', onClick); track.removeEventListener('scroll', schedule); viewport.removeEventListener('keydown', onKey); });
  }
  function glyphStars(row, rating) {
    if (!row) return;
    const r = Math.max(0, Math.min(5, num(rating)));
    attr(row, 'aria-label', r + ' / 5');
    [...row.children].forEach((sp, i) => {
      const part = Math.round(Math.max(0, Math.min(1, r - i)) * 100);
      const cls = part >= 100 ? 'star filled' : part > 0 ? 'star is-part' : 'star';
      if (sp.className !== cls) sp.className = cls;
      text(sp, part > 0 ? '★' : '☆');
      set(sp, '--lt-fill', part > 0 && part < 100 ? part + '%' : null);
    });
  }
  TYPES['testimonial-video'] = {
    init(root, st) {
      if (root.__ctvInited) return;
      root.__ctvInited = true;
      for (const v of root.querySelectorAll('video')) if (v.hasAttribute('autoplay')) v.setAttribute('data-lt-autoplay', '');
      videos(st);
      rail(st, root);
    },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_styling), f = bool(s.enable_custom_fonts), shape = s.use_theme_button === false || s.use_theme_button === 'false';
      scheme(root, s); frame(root, s);
      const sel = s.video_overlay_color_selector || 'black', op = sel === 'none' ? 0 : num(s.video_overlay_opacity, 0.3);
      const v = {
        '--ctv-bg': pick(c, s.background_color, 'var(--color-background)'), '--ctv-pt': px(s.padding_top, 60), '--ctv-pb': px(s.padding_bottom, 60),
        '--ctv-pl-d': px(s.desktop_padding_left, 15), '--ctv-pr-d': px(s.desktop_padding_right, 15), '--ctv-pl-m': px(s.mobile_padding_left, 10), '--ctv-pr-m': px(s.mobile_padding_right, 10),
        '--ctv-cols': String(num(s.mobile_column_count, 1.5)), '--ctv-gap-m': px(s.video_cards_gap_mobile, 12), '--ctv-gap-d': px(s.video_cards_gap_desktop, 16), '--ctv-card-w': px(s.video_card_size, 220), '--ctv-radius': px(s.card_corner_radius, 12),
        '--ctv-overlay': 'rgba(' + (OVERLAY[sel] || '0,0,0') + ',' + op + ')', '--ctv-card-text': pick(c, s.product_name_color, '#ffffff'), '--star-on': pick(c, s.product_price_color, '#FFD700'),
        '--ctv-track': pick(c, s.pagination_bullet_color, 'var(--color-border)'), '--ctv-fill': pick(c, s.pagination_bullet_active_color, 'var(--color-heading)'),
        '--ctv-pbar-w': num(s.progress_bar_max_width, 90) + '%', '--ctv-pbar-h': px(s.progress_bar_height, 2),
        '--ctv-bf': f ? fontCss(s.body_font, 'var(--body-font, inherit)') : 'var(--body-font, inherit)',
      };
      for (const [k, x] of Object.entries(v)) set(root, k, x);
      own(root, 'font', f);
      attr(root, 'data-hover', s.hover_animation || 'none'); attr(root, 'data-addons', bool(s.hide_addons) ? 'false' : 'true');
      attr(root, 'data-button', bool(s.enable_button) && s.button_text ? 'true' : 'false');
      attr(root, 'data-progress', s.show_progress_bar === false || s.show_progress_bar === 'false' ? 'false' : 'true'); attr(root, 'data-progress-d', bool(s.hide_progress_bar_desktop) ? 'false' : 'true');
      const TS = {h1: [56, 36], h3: [24, 20]}, SS = {body_large: 18, body_small: 14};
      for (const el of root.querySelectorAll('[data-lt-block]')) {
        const b = st.block(el), t = el.dataset.ltType;
        if (t === 'heading') {
          const cs = bool(b.custom_style), hs = b.heading_size || 'h2', fb = TS[hs] || [36, 30];
          rich(el, b.heading, st); hide(el, !String(b.heading || '').replace(/<[^>]*>/g, '').trim());
          set(el, '--h-ff', f ? fontCss(s.heading_font, 'var(--heading-font, inherit)') : 'var(--type-' + hs + '-font, var(--heading-font, inherit))');
          set(el, '--h-ls', 'var(--type-' + hs + '-letter-spacing, normal)'); set(el, '--h-tt', 'var(--type-' + hs + '-transform, none)');
          set(el, '--h-mb-m', px(b.space_below_mobile, 10)); set(el, '--h-mb-d', px(b.space_below_desktop, 20)); set(el, '--h-c', pick(cs, b.heading_color, 'var(--color-heading)'));
          set(el, '--h-w', cs ? String(b.heading_font_weight || '700') : 'var(--type-' + hs + '-weight, 700)'); set(el, '--h-lh', cs ? '1.2' : 'var(--type-' + hs + '-line-height, 1.2)');
          set(el, '--h-fs-m', cs ? px(b.heading_font_size_mobile, 25) : 'var(--type-' + hs + '-size, ' + fb[1] + 'px)'); set(el, '--h-fs-d', cs ? px(b.heading_font_size_desktop, 29) : 'var(--type-' + hs + '-size, ' + fb[0] + 'px)');
          own(el, 'weight', cs); own(el, 'size', cs);
        } else if (t === 'subheading') {
          const cs = bool(b.custom_style), ss = b.text_size || 'body', fb = SS[ss] || 16;
          rich(el, b.subheading, st); hide(el, !String(b.subheading || '').replace(/<[^>]*>/g, '').trim());
          set(el, '--s-ff', f ? fontCss(s.body_font, 'var(--body-font, inherit)') : 'var(--type-' + ss + '-font, var(--body-font, inherit))');
          set(el, '--s-mb-m', px(b.space_below_mobile, 30)); set(el, '--s-mb-d', px(b.space_below_desktop, 40)); set(el, '--s-c', pick(cs, b.subheading_color, 'var(--color-text)'));
          set(el, '--s-w', cs ? String(b.subheading_font_weight || '400') : 'var(--type-' + ss + '-weight, 400)'); set(el, '--s-lh', cs ? '1.5' : 'var(--type-' + ss + '-line-height, 1.6)');
          set(el, '--s-fs-m', cs ? px(b.subheading_font_size_mobile, 14) : 'var(--type-' + ss + '-size, ' + fb + 'px)'); set(el, '--s-fs-d', cs ? px(b.subheading_font_size_desktop, 16) : 'var(--type-' + ss + '-size, ' + fb + 'px)');
          own(el, 'weight', cs); own(el, 'size', cs);
        } else if (t === 'video_card') {
          const prod = b.product && typeof b.product === 'object' ? b.product : null;
          const pname = b.product_name || (prod && prod.title) || '';
          const u = el.querySelector('[data-lt-username]'); text(u, b.username); hide(u, !b.username);
          const pn = el.querySelector('[data-lt-pname]'); text(pn, pname); hide(pn, !pname);
          glyphStars(el.querySelector('[data-lt-glyph-stars]'), b.rating);
          const plink = (b.product_link && b.product_link !== '/' ? b.product_link : prod && prod.url) || b.product_link || '/';
          const cl = el.querySelector('[data-lt-card-link]'); if (cl) { attr(cl, 'href', url(plink) || '/'); attr(cl, 'aria-label', pname || 'View'); }
          const img = el.querySelector(':scope > img.media-content'); if (img) { const src = url(b.image, true); if (src && img.getAttribute('src').split('?')[0] !== src.split('?')[0]) img.src = src; if (img.alt !== pname) img.alt = pname; }
          const btn = el.querySelector('[data-lt-button]');
          if (btn) {
            text(btn, s.button_text || '');
            attr(btn, 'href', url((b.button_link && b.button_link !== '/' ? b.button_link : plink)) || '/');
          }
        }
      }
      /* button colours and corners come from the section */
      for (const btn of root.querySelectorAll('[data-lt-button]')) {
        set(btn, '--mb-bg', c ? color(s.button_background_color, '') : null); set(btn, '--mb-border', c ? color(s.button_background_color, '') : null); set(btn, '--mb-text', c ? color(s.button_text_color, '') : null);
        set(btn, '--mb-radius', shape ? px(s.button_border_radius, 25) : null); set(btn, '--mb-padding-y', shape ? '8px' : null); set(btn, '--mb-padding-x', shape ? '16px' : null); set(btn, '--mb-font-size', shape ? '14px' : null);
        own(btn, 'shape', shape);
      }
    },
  };

  /* Testimonials Grid: its rules are in testimonials.css, its carousel is the theme's slide-section (Swiper). */
  const STAR = '<path d="M10 1.5l2.6 5.27 5.82.84-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79L1.58 7.6l5.82-.84z"/>';
  const tmStars = r => { let h = ''; for (let i = 1; i <= 5; i++) { const part = Math.round(Math.max(0, Math.min(1, r - i + 1)) * 100); h += i <= r ? '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">' + STAR + '</svg>' : part > 0 ? '<span class="tm-star-part" style="--tm-fill: ' + part + '%;" aria-hidden="true"><svg viewBox="0 0 20 20" fill="currentColor" class="star--off">' + STAR + '</svg><svg viewBox="0 0 20 20" fill="currentColor" class="tm-star-fill">' + STAR + '</svg></span>' : '<svg viewBox="0 0 20 20" fill="currentColor" class="star--off" aria-hidden="true">' + STAR + '</svg>'; } return h; };
  const tmHeadCss = (id, sid, b) => {
    if (!bool(b.enable_custom_typography)) return '';
    const sel = sfx => ['', ' p', ' span', ' a'].map(x => '#shopify-section-' + sid + '#shopify-section-' + sid + ' .tm-head-' + id + x + sfx).join(',');
    const fam = bool(b.custom_font) && b.font && b.font.family ? 'font-family: ' + b.font.family + ', ' + (b.font.fallback_families || 'sans-serif') + ' !important;' : '';
    const w = b.font_weight && b.font_weight !== 'default' ? 'font-weight: ' + b.font_weight + ' !important;' : '';
    return sel('') + '{font-size: ' + px(b.font_size_mobile) + ' !important;' + w + fam + '}@media (min-width: 768px){' + sel('') + '{font-size: ' + px(b.font_size_desktop) + ' !important;}}';
  };
  TYPES.testimonials = {
    init(root, st) {
      const wrap = root.closest('.shopify-section'), mq = matchMedia('(min-width: 768px)');
      /* a redraw brings the Liquid margins again: drop the ones a live edit wrote */
      if (wrap && wrap.dataset.tmLiveMargins) { wrap.style.removeProperty('margin-top'); wrap.style.removeProperty('margin-bottom'); delete wrap.dataset.tmLiveMargins; }
      st.margins = () => {
        if (!wrap) return;
        const s = st.s, reset = bool(s.reset_spacing), d = mq.matches;
        wrap.dataset.tmLiveMargins = '1';
        wrap.style.setProperty('margin-top', reset ? '0px' : px(s[d ? 'section_margin_top_desktop' : 'section_margin_top_mobile']), 'important');
        wrap.style.setProperty('margin-bottom', reset ? '0px' : px(s[d ? 'section_margin_bottom_desktop' : 'section_margin_bottom_mobile']), 'important');
      };
      const onMq = () => { if (st.painted) st.margins(); };
      mq.addEventListener('change', onMq);
      st.off.push(() => mq.removeEventListener('change', onMq));
      /* Auto rotate runs only while the carousel is on screen */
      const sl = root.querySelector('slide-section');
      if (sl && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(es => { for (const e of es) { const a = sl.globalSlide && sl.globalSlide.autoplay; if (!a || sl.dataset.autoplay !== 'true') continue; if (e.isIntersecting && !reduced()) a.start && a.start(); else a.stop && a.stop(); } });
        io.observe(sl);
        st.off.push(() => io.disconnect());
      }
    },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_colors), sid = st.id;
      st.painted = true;
      scheme(root, s);
      const cols = num(s.columns, 3), colsM = num(s.columns_mobile, 1), pos = s.pagination_position || 'center';
      let pag = s.pagination_style || 'pill';
      if (pag === 'progress' || s.carousel_pagination === 'show_progress_bar') pag = 'progress';
      const v = {
        '--section-pt': String(num(s.padding_top)), '--section-pb': String(num(s.padding_bottom)), '--tm-col-gap': px(s.column_gap, 24),
        '--tm-card-bg': c ? color(s.card_bg, 'color-mix(in srgb, var(--color-text) 4%, transparent)') : 'color-mix(in srgb, var(--color-text) 4%, var(--color-background))',
        '--tm-card-border': pick(c, s.card_border_color, 'var(--color-border)'), '--tm-quote-color': pick(c, s.quote_color, 'var(--color-heading)'),
        '--tm-card-radius': px(s.card_radius, 16), '--tm-cols': String(cols), '--tm-cols-mb': String(Math.max(1, Math.floor(colsM))), '--tm-avatar-size': px(s.avatar_size, 56),
        '--tm-hs-m': px(s.header_spacing_mobile, 24), '--tm-hs-d': px(s.header_spacing_desktop, 36), '--tm-align': s.card_align || 'left', '--tm-pad': px(s.card_padding, 24), '--tm-gap': px(s.card_content_gap, 14),
        '--tm-quote-size': bool(s.enable_custom_typography) ? px(s.quote_size, 16) : null, '--tm-below-m': px(s.space_below_cards_mobile), '--tm-below-d': px(s.space_below_cards_desktop), '--tm-pag-space': px(s.pagination_spacing, 30),
        '--tm-pag-justify': pos === 'left' ? 'flex-start' : pos === 'right' ? 'flex-end' : 'center', '--tm-pag-mi': pos === 'left' ? '0 auto' : pos === 'right' ? 'auto 0' : 'auto',
      };
      for (const [k, x] of Object.entries(v)) set(root, k, x);
      attr(root, 'data-tm-card', s.card_style || 'boxed'); attr(root, 'data-tm-align', s.card_align || 'left'); attr(root, 'data-tm-avatar', s.avatar_shape || 'circle'); attr(root, 'data-tm-pag', pag);
      root.classList.toggle('pt-min', num(s.padding_top) < 30); root.classList.toggle('pb-min', num(s.padding_bottom) < 30);
      const inner = root.querySelector(':scope > div');
      if (inner) for (const w of ['container', 'fluid_container', 'stretch_width', 'full_width']) inner.classList.toggle(w, (s.section_width || 'container') === w);
      const head = root.querySelector('.tm-header');
      if (head) for (const a of ['left', 'center', 'right']) head.classList.toggle('text-' + a, (s.header_alignment || 'center') === a);
      st.margins && st.margins();
      /* header blocks: text and their own typography */
      let css = '';
      for (const el of root.querySelectorAll('[data-tm-block]')) {
        const b = st.block(el), t = btype(el), id = bid(el);
        if (t === 'eyebrow' || t === 'heading' || t === 'subheading') {
          if (t === 'subheading') rich(el, b.text, st); else text(el, b.text);
          hide(el, !bool(b.enabled) || !String(b.text || '').replace(/<[^>]*>/g, '').trim());
          css += tmHeadCss(id, sid, b);
          if (!st.ownCss) for (const x of root.parentElement.querySelectorAll('style')) if (x.textContent.includes('.tm-head-' + id)) x.media = 'not all';
        } else if (t === 'testimonial') {
          const card = el.querySelector('.tm-card');
          if (!card) continue;
          const q = card.querySelector('.tm-card__quote'); if (q) { rich(q, b.quote, st); hide(q, !b.quote); }
          const n = card.querySelector('.tm-card__name'); if (n) text(n, b.name);
          const r = card.querySelector('.tm-card__role'); if (r) text(r, b.role);
          let mark = card.querySelector('.tm-card__quote-mark');
          if (bool(s.show_quote_mark) && !mark) card.insertAdjacentHTML('afterbegin', '<span class="tm-card__quote-mark" aria-hidden="true">“</span>'); else if (!bool(s.show_quote_mark) && mark) mark.remove();
          let row = card.querySelector('[data-tm-stars]');
          const rating = num(b.rating);
          if (bool(s.show_rating) && rating > 0) {
            if (!row) { row = document.createElement('div'); row.className = 'tm-card__rating'; row.setAttribute('data-tm-stars', ''); const m = card.querySelector('.tm-card__quote-mark'); if (m) m.after(row); else card.prepend(row); }
            if (row.dataset.r !== String(rating)) { row.innerHTML = tmStars(rating); row.dataset.r = String(rating); attr(row, 'aria-label', 'Rated ' + rating + ' out of 5'); }
          } else if (row) row.remove();
          let av = card.querySelector('.tm-card__avatar'); const src = url(b.avatar, true), au = card.querySelector('.tm-card__author');
          if (!av && src && au) { av = document.createElement('img'); av.className = 'tm-card__avatar'; av.loading = 'lazy'; av.width = 80; av.height = 80; av.src = src; au.prepend(av); }
          if (av && src && av.getAttribute('src').split('?')[0] !== src.split('?')[0]) av.src = src;
          if (av && av.alt !== (b.name || 'Avatar')) av.alt = b.name || 'Avatar';
        }
      }
      let live = root.querySelector(':scope > style[data-tm-live]');
      if (!live) { live = document.createElement('style'); live.setAttribute('data-tm-live', ''); root.prepend(live); }
      if (live.textContent !== css) live.textContent = css;
      st.ownCss = true;
      for (const x of root.querySelectorAll('.tm-head')) { const b = st.block(x); own(x, 'font', bool(b.enable_custom_typography) && bool(b.custom_font)); own(x, 'weight', bool(b.enable_custom_typography) && b.font_weight && b.font_weight !== 'default'); }
      /* carousel: the theme's slider reads its data-* once, so a change builds it again */
      const sl = root.querySelector('slide-section');
      if (sl) {
        const next = {autoplay: String(bool(s.autoplay)), loop: String(bool(s.infinite)), autoplaySpeed: String(num(s.autorotate_speed, 5)), spacing: String(num(s.column_gap, 24)), mobile: String(colsM), desktop: String(cols), tablet: String(cols > 3 ? 3 : cols), paginationProgressbar: String(pag === 'progress'), paginationStyle: pag};
        let changed = false;
        for (const [k, x] of Object.entries(next)) if (sl.dataset[k] !== x) { sl.dataset[k] = x; changed = true; }
        let actions = sl.querySelector(':scope > .swiper-actions');
        if (bool(s.show_arrow) && !actions) { sl.insertAdjacentHTML('afterbegin', '<div class="swiper-actions flex content-center gap-10"><button type="button" class="swiper-arrow swiper-button-prev icon-btn" aria-label="Previous"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><use href="#icon-slider-prev" /></svg></button><button type="button" class="swiper-arrow swiper-button-next icon-btn" aria-label="Next"><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><use href="#icon-slider-next" /></svg></button></div>'); changed = true; }
        else if (!bool(s.show_arrow) && actions) { actions.remove(); changed = true; }
        let vis = s.carousel_pagination || 'show';
        if (vis === 'show_progress_bar' || vis === 'show_dots') vis = 'show'; if (vis === 'show_dots_on_mobile') vis = 'mobile';
        let pg = sl.querySelector(':scope > .tm-pagination');
        if (vis !== 'disable' && !pg) { sl.insertAdjacentHTML('beforeend', '<div class="swiper-pagination tm-pagination" style="--swiper-pagination-position: static;"></div>'); pg = sl.querySelector(':scope > .tm-pagination'); changed = true; }
        else if (vis === 'disable' && pg) { pg.remove(); pg = null; changed = true; }
        if (pg) pg.classList.toggle('hidden-md', vis === 'mobile');
        if (sl.globalSlide) st.slBuilt = true;
        if (changed && typeof sl.initSlide === 'function' && st.slBuilt) { try { sl.globalSlide && sl.globalSlide.destroy(true, true); } catch (_) {} sl.globalSlide = null; sl.initSlide(); }
      }
    },
  };

  /* ---------- registry and lifecycle ---------- */
  function add(el) {
    const type = el.dataset.ltRoot || el.dataset.tmRoot, T = TYPES[type];
    if (!T) return;
    const st = {el, type, id: el.dataset.sectionId || el.dataset.tmSection, s: parse(el.dataset.ltSettings || el.dataset.tmSettings), blocks: new Map(), off: [], videos: new WeakSet(), rich: new WeakMap(), raf: 0, inits: 0};
    st.block = node => { const id = bid(node); if (!st.blocks.has(id)) st.blocks.set(id, parse(bset(node))); return st.blocks.get(id); };
    roots.set(el, st);
    if (T.init) T.init(el, st);
    st.inits++;
  }
  function remove(el, st) { cancelAnimationFrame(st.raf); for (const f of st.off.splice(0)) { try { f(); } catch (_) {} } roots.delete(el); }
  function scan() {
    for (const [el, st] of roots) if (!el.isConnected) remove(el, st);
    for (const el of document.querySelectorAll(SEL)) if (!roots.has(el)) add(el);
  }
  const idOf = v => { if (v && typeof v === 'object') v = v.id; return v == null ? '' : String(v).replace(/^shopify-section-/, ''); };
  function find(id) {
    if (!id) return null;
    for (const [el, st] of roots) if (el.isConnected && st.id === id) return st;
    return null;
  }
  function paint(st) { st.raf = 0; if (!st.el.isConnected) return; const T = TYPES[st.type]; if (T.paint) T.paint(st.el, st); }
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {};
    if (!d.settings || typeof d.settings !== 'object') return;
    scan();
    const st = find(idOf(d.section ?? d.sectionId ?? d.section_id));
    if (!st) return;
    const blockId = idOf(d.block ?? d.blockId ?? d.block_id);
    if (blockId) {
      const node = [...st.el.querySelectorAll(BSEL)].find(n => bid(n) === blockId);
      if (!node) return;
      Object.assign(st.block(node), d.settings);
    } else Object.assign(st.s, d.settings);
    if (!st.raf) st.raf = requestAnimationFrame(() => paint(st));
  });
  let queued = 0;
  const later = () => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; scan(); }); };
  document.addEventListener('storelib:section-load', scan);
  document.addEventListener('shopify:section:load', scan);
  document.addEventListener('shopify:section:unload', later);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, {once: true}); else scan();
  new MutationObserver(ms => { for (const m of ms) for (const n of [...m.addedNodes, ...m.removedNodes]) if (n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))) return later(); }).observe(document.documentElement, {childList: true, subtree: true});
  window.MateriaLiveTestimonials = {scan, roots, TYPES, count: () => roots.size, state: el => roots.get(el)};
})();
