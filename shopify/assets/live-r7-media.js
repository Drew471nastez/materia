/* Materia Themes. The round 7 Image and video sections: Lightbox Gallery
   (media-lightbox-gallery) and Video Playlist (video-playlist). Linked by the
   two sections themselves, so a page without them never loads it.

   Lightbox Gallery: the pictures open in the theme's own media viewer (the
   <dialog> of product-page-ui.js). Its script and styles are asked for when
   the gallery comes near the screen, or on the first press if that is
   sooner; the press is then given again once they are in. The caption of the
   picture on show is written into the viewer from the gallery's own markup.

   Video Playlist: one player (snippets/media-iv-player), a list of clips.
   Picking a clip puts its source in the player and plays it; nothing plays
   before a visitor presses play, an embed is not loaded before that, a
   playing file pauses when the player leaves the screen, and the next clip
   follows a finished one unless reduced motion is asked for. The list is a
   native scroller: the arrows and the arrow keys only call scrollBy/scrollTo
   and the position is read in one passive, frame-throttled listener.

   Live edits (builder only): every root [data-r7m] carries its settings as
   JSON and every block its own. derive() turns them into outputs (a CSS
   variable, an attribute, text, a picture) per element, the same values the
   markup prints, so the first derive is only recorded. After that an output
   is written only when its value changes, once per frame per root, so a
   picture never reloads and a playing video never restarts for an unrelated
   edit. audit() lists outputs whose markup differs (tests). */
(() => {
  if (window.MateriaR7Media) return;
  const SEL = '[data-r7m]';
  const roots = new Map();
  const stats = {paints: 0, writes: 0, builds: 0};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 900px)');
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = v => num(v) + 'px';
  const text = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const localUrl = v => { v = v && typeof v === 'object' ? v.src || v.url || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return ['http:', 'https:', 'data:', 'blob:'].includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return ''; } };
  const url = v => { const a = api() && api().url ? api().url(v, true) : ''; return a || localUrl(v); };
  const fontCss = (v, f) => {
    if (v && typeof v === 'object' && v.family) return v.family + ', ' + (v.fallback_families || 'sans-serif');
    const fam = api() && api().font ? api().font(v) : '';
    return !fam ? f : /^var\(|,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const rich = (el, value) => { if (api() && api().rich) api().rich(el, value, {rich: new WeakMap()}); else el.textContent = text(value); };
  const smooth = () => reduced.matches ? 'auto' : 'smooth';
  const on = (st, el, type, fn, opts) => { el.addEventListener(type, fn, {...opts, signal: st.ac.signal}); st.listeners++; };

  /* ---------- outputs ---------- */
  const read = (el, key) => key[0] === '-' ? el.style.getPropertyValue(key) : key[0] === '@' ? el.getAttribute(key.slice(1)) : key[0] === '?' ? el.hidden : key[0] === '.' ? el.classList.contains(key.slice(1)) : undefined;
  function write(st, el, key, v) {
    const c = key[0];
    if (c === '-') el.style.setProperty(key, v);
    else if (c === '@') { if (v == null) el.removeAttribute(key.slice(1)); else el.setAttribute(key.slice(1), v); }
    else if (c === '?') el.hidden = !!v;
    else if (c === '.') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'text') el.textContent = v;
    else if (key === 'html') rich(el, v);
    else if (key === 'image') paintImage(el, parse(v));
    else if (key === 'clip') paintClip(st, el, parse(v));
  }
  function put(st, el, key, value) {
    if (!el) return;
    if (st.mode === 'audit') { const have = st.root.contains(el) ? read(el, key) : undefined; if (have !== undefined && have !== value) st.diff.push(key + ': ' + JSON.stringify(have) + ' is not ' + JSON.stringify(value)); return; }
    let m = st.out.get(el);
    if (!m) st.out.set(el, m = new Map());
    if (m.has(key) && m.get(key) === value) return;
    m.set(key, value);
    if (st.mode === 'record') return;
    stats.writes++;
    write(st, el, key, value);
  }
  function scheme(root, s) {
    const id = s.color_scheme && typeof s.color_scheme === 'object' ? s.color_scheme.id : s.color_scheme;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || root.classList.contains('color-' + id)) return;
    for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c);
    root.classList.add('color-' + id);
  }

  /* ---------- derive: the same values the markup prints ---------- */
  const placeholder = n => 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 400%22 data-n=%22' + String(n).replace(/[^\w-]/g, '') + '%22%3E%3Crect width=%22400%22 height=%22400%22 fill=%22%23808080%22 fill-opacity=%22.14%22/%3E%3Ccircle cx=%22172%22 cy=%22174%22 r=%2214%22 fill=%22%23808080%22 fill-opacity=%22.5%22/%3E%3Cpath d=%22M140 242l40-46 25 28 20-18 35 36z%22 fill=%22%23808080%22 fill-opacity=%22.5%22/%3E%3C/svg%3E';
  function paintImage(item, d) {
    const tile = item.querySelector('[data-r7m-tile]'), img = tile && tile.querySelector('img'), ph = tile && tile.querySelector('svg');
    if (!img) return;
    if (d.src) {
      img.removeAttribute('srcset'); img.removeAttribute('sizes');
      if (d.w && d.h) { img.width = d.w; img.height = d.h; }
      img.src = d.src; img.hidden = false;
      if (ph) ph.setAttribute('hidden', '');
      tile.setAttribute('href', d.src); tile.setAttribute('data-mt-src', d.src); tile.dataset.empty = 'false';
      tile.setAttribute('data-pswp-width', d.w || 1600); tile.setAttribute('data-pswp-height', d.h || 1600);
    } else {
      img.hidden = true; img.removeAttribute('src'); img.removeAttribute('srcset');
      if (ph) ph.removeAttribute('hidden');
      tile.removeAttribute('href'); tile.setAttribute('data-mt-src', placeholder(item.dataset.r7mBlock)); tile.dataset.empty = 'true';
      tile.setAttribute('data-pswp-width', 400); tile.setAttribute('data-pswp-height', 400);
    }
  }
  function paintClip(st, item, d) {
    const btn = item.querySelector('[data-vp-clip]'), thumb = item.querySelector('.vpl__thumb'), img = thumb && thumb.querySelector('img'), ph = thumb && thumb.querySelector('svg');
    if (!btn) return;
    btn.dataset.vpFile = d.file || ''; btn.dataset.vpUrl = d.url || ''; btn.dataset.vpPoster = d.poster || '';
    if (img) {
      if (d.poster) { if (img.getAttribute('src') !== d.poster) img.src = d.poster; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }
      if (ph) { if (d.poster) ph.setAttribute('hidden', ''); else ph.removeAttribute('hidden'); }
    }
    if (st.vp) st.vp.refresh(item);
  }
  const videoFile = v => {
    if (!v || typeof v !== 'object') return '';
    const list = Array.isArray(v.sources) ? v.sources : [];
    const s = list.find(x => x && (x.format === 'mp4' || x.mime_type === 'video/mp4')) || list[0];
    return url(s ? s.url || s.src : v.url || v.src || v.value);
  };
  function derive(root, st) {
    const s = st.s, own = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts), wrap = root.closest('.shopify-section');
    const c = (v, f) => own ? color(v, f) : f;
    if (st.mode !== 'audit') scheme(root, s);
    if (wrap) {
      for (const el of wrap.querySelectorAll('style[data-r7m-reset]')) put(st, el, '@media', bool(s.reset_spacing) ? null : 'not all');
      for (const side of ['top', 'bottom']) for (const at of ['mobile', 'desktop']) put(st, wrap, '--r7-m' + side[0] + '-' + at[0], px(s['section_margin_' + side + '_' + at]));
    }
    put(st, root, '@data-width', s.section_width || 'container');
    put(st, root, '@data-align', s.content_align || 'left');
    put(st, root, '@data-align-m', s.content_align_mobile || 'left');
    put(st, root, '@data-own-font', fonts ? '' : null);
    put(st, root, '--r7-bg', c(s.section_bg, 'var(--color-background)'));
    put(st, root, '--r7-text', c(s.text_color, 'var(--color-text)'));
    put(st, root, '--r7-hf', fonts ? fontCss(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)');
    put(st, root, '--r7-bf', fonts ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)');
    for (const [k, id] of [['pt-m', 'padding_top_mobile'], ['pb-m', 'padding_bottom_mobile'], ['pt-d', 'padding_top_desktop'], ['pb-d', 'padding_bottom_desktop'], ['px-m', 'side_padding_mobile'], ['px-d', 'side_padding_desktop'], ['cgap', 'content_gap']]) put(st, root, '--r7-' + k, px(s[id]));

    const gallery = st.type === 'lightbox-gallery';
    if (gallery) {
      const ratio = s.image_ratio || 'square';
      put(st, root, '@data-ratio', ratio);
      put(st, root, '--mlg-cols-d', String(num(s.columns_desktop, 4)));
      put(st, root, '--mlg-cols-m', String(num(s.columns_mobile, 2)));
      put(st, root, '--mlg-gap-d', px(s.gap_desktop));
      put(st, root, '--mlg-gap-m', px(s.gap_mobile));
      put(st, root, '--mlg-ar', {portrait: '4 / 5', landscape: '4 / 3'}[ratio] || '1 / 1');
      put(st, root, '--mlg-r', px(s.image_radius));
    } else {
      const ratio = s.video_ratio || 'landscape';
      put(st, root, '@data-ratio', ratio);
      put(st, root, '@data-list', s.list_position || 'beside');
      put(st, root, '@data-next', String(bool(s.autoplay_next)));
      put(st, root, '--vp-ar', {portrait: '9 / 16', square: '1 / 1'}[ratio] || '16 / 9');
      put(st, root, '--vp-r', {portrait: '0.5625', square: '1'}[ratio] || '1.7778');
      put(st, root, '--vp-radius', px(s.media_radius));
      put(st, root, '--vp-gap-d', px(s.gap_desktop));
      put(st, root, '--vp-gap-m', px(s.gap_mobile));
      put(st, root, '--vp-title', c(s.title_color, 'var(--color-heading)'));
      put(st, root, '--vp-accent', c(s.accent_color, 'var(--color-heading)'));
      put(st, root.querySelector('[data-iv-player]'), '.ivp--contain', s.video_fit === 'contain');
    }

    let n = 0;
    for (const el of root.querySelectorAll('[data-r7m-block]')) {
      const id = el.dataset.r7mBlock, type = el.dataset.r7mType;
      if (st.rawBlocks.get(id) !== el.dataset.r7mSettings) { const first = !st.rawBlocks.has(id); st.rawBlocks.set(id, el.dataset.r7mSettings); st.blocks.set(id, {...parse(el.dataset.r7mSettings), ...(first ? st.blocks.get(id) : {})}); }
      const b = {...st.blockDefaults[type], ...st.blocks.get(id)};
      if (type === 'heading' || type === 'subheading') {
        const head = type === 'heading';
        put(st, el, 'html', String(b.text == null ? '' : b.text));
        put(st, el, '?', !text(b.text));
        const base = head ? 'var(--color-heading)' : 'var(--r7-text)';
        put(st, el, '--b-c', bool(b.enable_custom_style) ? color(b.color, base) : base);
        put(st, el, '--b-fs-m', num(b.size_mobile, head ? 28 : 15) + 'px');
        put(st, el, '--b-fs-d', num(b.size_desktop, head ? 40 : 17) + 'px');
      } else if (type === 'image') {
        n++;
        const tile = el.querySelector('[data-r7m-tile]'), cap = el.querySelector('[data-r7m-caption]');
        const src = url(b.image), meta = b.image && typeof b.image === 'object' ? b.image : {};
        const alt = text(b.image_alt) || (src ? text(meta.alt) : ''), caption = text(b.caption);
        put(st, el, 'image', JSON.stringify({src, w: num(meta.width), h: num(meta.height)}));
        put(st, tile && tile.querySelector('img'), '@alt', alt);
        put(st, tile, '@aria-label', alt || caption || (root.dataset.r7mLabel || '') + ' ' + n);
        put(st, cap, 'text', caption);
        put(st, cap, '?', !caption);
      } else if (type === 'clip') {
        n++;
        const btn = el.querySelector('[data-vp-clip]'), cap = el.querySelector('[data-vp-caption]');
        const title = text(b.title), caption = text(b.caption), preview = b.video && typeof b.video === 'object' ? b.video.preview_image : '';
        put(st, el, 'clip', JSON.stringify({file: videoFile(b.video), url: typeof b.video_url === 'string' ? b.video_url.trim() : url(b.video_url), poster: url(b.poster) || url(preview)}));
        put(st, btn, 'text', title);
        put(st, btn, '@aria-label', title ? null : (root.dataset.r7mLabel || '') + ' ' + n);
        put(st, cap, 'text', caption);
        put(st, cap, '?', !caption);
      }
    }
  }
  function paint(root, st) {
    stats.paints++;
    if (st.raw !== root.dataset.r7mSettings) { st.raw = root.dataset.r7mSettings; st.s = {...st.defaults, ...parse(st.raw)}; }
    derive(root, st);
    if (st.vp) st.vp.layout();
  }

  /* ---------- Lightbox Gallery: the theme's media viewer ---------- */
  let viewer = null, lastTile = null;
  function loadViewer(root) {
    if (viewer) return viewer;
    const css = root.dataset.r7mViewerCss, js = root.dataset.r7mViewerJs;
    const wait = new Promise(done => setTimeout(done, 6000));
    const style = new Promise(done => {
      if (!css || document.querySelector('link[rel="stylesheet"][href*="product-page-ui.css"]')) return done();
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = css; l.onload = l.onerror = () => done(); document.head.append(l);
    });
    const script = new Promise(done => {
      if (window.__mtProductUi) return done();
      const old = document.querySelector('script[src*="product-page-ui.js"]');
      if (!old && !js) return done();
      const s = old || document.createElement('script');
      s.addEventListener('load', () => done()); s.addEventListener('error', () => done());
      if (!old) { s.src = js; document.head.append(s); }
    });
    viewer = Promise.race([Promise.all([style, script]), wait]).then(() => { const ok = !!window.__mtProductUi; if (!ok) viewer = null; return ok; });
    return viewer;
  }
  /* A press before the viewer is in: hold it, bring the viewer in, press again. */
  function hold(e, tile) {
    e.preventDefault(); e.stopPropagation();
    const root = tile.closest(SEL);
    if (!root) return;
    loadViewer(root).then(ok => {
      if (!tile.isConnected) return;
      if (ok) tile.click();
      else if (tile.getAttribute('href') && !root.hasAttribute('data-r7m-settings')) location.assign(tile.href);
    });
  }
  const tileOf = e => e.target && e.target.closest ? e.target.closest('[data-r7m="lightbox-gallery"] [data-r7m-tile]') : null;
  for (const type of ['pointerdown', 'focusin']) document.addEventListener(type, e => { const tile = tileOf(e); if (tile) { lastTile = tile; if (!window.__mtProductUi) loadViewer(tile.closest(SEL)); } }, true);
  document.addEventListener('click', e => { const tile = tileOf(e); if (!tile) return; lastTile = tile; if (!window.__mtProductUi && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button)) hold(e, tile); }, true);
  document.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const tile = tileOf(e); if (!tile || tile !== e.target) return; lastTile = tile; if (!window.__mtProductUi) hold(e, tile); }, true);
  /* The caption of the picture on show, read from the gallery that opened the viewer. */
  let watching = false;
  function watchViewer() {
    if (watching) return;
    watching = true;
    const hook = () => {
      const d = document.querySelector('dialog.mt-lb'), track = d && d.querySelector('.mt-lb__track');
      if (!track) return false;
      const cap = document.createElement('p');
      cap.className = 'r7-lb-cap'; cap.setAttribute('aria-live', 'polite');
      d.append(cap);
      let map = null, frame = 0;
      const show = () => {
        frame = 0;
        const slides = track.children, i = Math.max(0, Math.min(slides.length - 1, Math.round(Math.abs(track.scrollLeft) / (track.clientWidth || 1))));
        const img = slides[i] && slides[i].querySelector('img'), words = map && img ? map.get(img.getAttribute('src')) || '' : '';
        if (cap.textContent !== words) cap.textContent = words;
      };
      const fill = () => {
        map = null;
        const root = lastTile && lastTile.isConnected ? lastTile.closest(SEL) : null, srcs = [...track.querySelectorAll('img')].map(i => i.getAttribute('src'));
        if (root && srcs.length) {
          const m = new Map();
          for (const tile of root.querySelectorAll('[data-r7m-tile]')) { const c = tile.closest('[data-r7m-block]'), el = c && c.querySelector('[data-r7m-caption]'); m.set(tile.getAttribute('data-mt-src'), el && !el.hidden ? el.textContent.trim() : ''); }
          if (srcs.every(s => m.has(s))) map = m;
        }
        show();
      };
      new MutationObserver(fill).observe(track, {childList: true});
      track.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(show); }, {passive: true});
      fill();
      return true;
    };
    if (hook()) return;
    const mo = new MutationObserver(() => { if (hook()) mo.disconnect(); });
    mo.observe(document.body, {childList: true});
  }
  function gallery(root, st) {
    watchViewer();
    if (window.__mtProductUi || !('IntersectionObserver' in window)) return;
    st.io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { st.io.disconnect(); loadViewer(root); } }, {rootMargin: '300px 0px'});
    st.io.observe(root);
  }

  /* ---------- Video Playlist ---------- */
  function source(d) {
    if (d.file) return {kind: 'file', src: d.file};
    const raw = String(d.url || '').trim();
    if (!raw) return {kind: 'none', src: ''};
    let m = raw.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
    if (m) return {kind: 'youtube', src: m[1]};
    m = raw.match(/vimeo\.com\/(?:[^?#]*\/)?(\d+)/i);
    if (m) return {kind: 'vimeo', src: m[1]};
    const file = url(raw);
    return file ? {kind: 'file', src: file} : {kind: 'none', src: ''};
  }
  const frameSrc = src => src.kind === 'youtube'
    ? 'https://www.youtube-nocookie.com/embed/' + src.src + '?autoplay=0&mute=0&loop=0&playlist=' + src.src + '&controls=1&playsinline=1&rel=0&modestbranding=1'
    : 'https://player.vimeo.com/video/' + src.src + '?autoplay=0&muted=0&loop=0&controls=1&playsinline=1&dnt=1';
  function playlist(root, st) {
    const stage = root.querySelector('[data-vp-stage]'), track = root.querySelector('[data-vp-track]'), box = stage && stage.querySelector('[data-iv-player]');
    if (!box || !track) return;
    const playBtn = stage.querySelector('[data-vp-play]'), prev = root.querySelector('[data-vp-prev]'), next = root.querySelector('[data-vp-next]');
    const items = () => [...root.querySelectorAll('[data-vp-item]')];
    const data = item => { const b = item.querySelector('[data-vp-clip]'); return {file: b.dataset.vpFile || '', url: b.dataset.vpUrl || '', poster: b.dataset.vpPoster || '', title: b.textContent.trim()}; };
    const keyOf = d => { const src = source(d); return src.kind + '|' + src.src + '|' + d.poster; };
    const row = () => !(desktop.matches && root.dataset.list === 'beside');
    const state = v => { if (stage.dataset.state !== v) stage.dataset.state = v; };
    /* back to the cover and the play button: the browser's controls show only once a clip was started */
    const idle = () => { const v = box.querySelector('video.ivp__video'); if (v && v.controls) v.controls = false; state('idle'); };
    const first = items()[0];
    const vp = st.vp = {index: 0, key: first ? keyOf(data(first)) : ''};

    function build(d) {
      stats.builds++;
      const src = source(d), cover = box.querySelector('.ivp__cover'), ph = box.querySelector('.ivp__ph');
      for (const old of box.querySelectorAll('.ivp__video, .ivp__frame')) { if (old.tagName === 'VIDEO') { old.pause(); old.removeAttribute('src'); old.load(); } old.remove(); }
      let el = null;
      if (src.kind === 'file') {
        el = document.createElement('video'); el.className = 'ivp__video'; el.playsInline = true; el.setAttribute('playsinline', ''); el.preload = 'metadata';
        if (d.poster) el.poster = d.poster;
        if (d.title) { el.setAttribute('aria-label', d.title); el.title = d.title; }
        el.src = src.src;
      } else if (src.kind !== 'none') {
        el = document.createElement('iframe'); el.className = 'ivp__frame'; el.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen'); el.allowFullscreen = true; el.title = d.title || root.dataset.r7mLabel || 'Video'; el.dataset.src = frameSrc(src);
      }
      if (cover) {
        const show = src.kind !== 'file' && !!d.poster;
        if (show && cover.getAttribute('src') !== d.poster) { cover.removeAttribute('srcset'); cover.removeAttribute('width'); cover.removeAttribute('height'); cover.src = d.poster; }
        cover.hidden = !show; cover.alt = d.title || '';
        if (el) cover.after(el);
      } else if (el) box.prepend(el);
      if (ph) ph.hidden = src.kind !== 'none' || !!d.poster;
      box.dataset.kind = src.kind;
      if (playBtn) playBtn.hidden = src.kind === 'none';
      state('idle');
    }
    function start() {
      const v = box.querySelector('video.ivp__video'), f = box.querySelector('iframe.ivp__frame');
      if (v) { v.controls = true; const p = v.play(); if (p && p.catch) p.catch(() => { if (v.isConnected && v.paused) idle(); }); state('playing'); }
      else if (f) { const want = (f.dataset.src || '').replace('autoplay=0', 'autoplay=1'); if (want && f.getAttribute('src') !== want) f.src = want; state('playing'); }
    }
    function reveal(item) {
      const t = track.getBoundingClientRect(), r = item.getBoundingClientRect();
      if (row()) { if (r.left < t.left + 5 || r.right > t.right - 5) track.scrollTo({left: track.scrollLeft + r.left - t.left - 6, behavior: smooth()}); }
      else if (r.top < t.top || r.bottom > t.bottom) track.scrollTo({top: track.scrollTop + r.top - t.top, behavior: smooth()});
    }
    function select(i, play) {
      const list = items();
      if (!list[i]) return;
      const d = data(list[i]), key = keyOf(d);
      list.forEach((item, n) => {
        const now = String(n === i), b = item.querySelector('[data-vp-clip]');
        if (item.dataset.active !== now) item.dataset.active = now;
        if (b && b.getAttribute('aria-current') !== now) b.setAttribute('aria-current', now);
      });
      if (i !== vp.index || key !== vp.key) { vp.index = i; vp.key = key; build(d); }
      reveal(list[i]);
      if (play) start();
    }
    let frame = 0;
    const arrows = () => {
      frame = 0;
      if (!prev || !next || !root.isConnected) return;
      /* the arrows are drawn from 900px up, beside the row only */
      const max = track.scrollWidth - track.clientWidth, x = Math.abs(track.scrollLeft), off = !desktop.matches || !row() || max <= 1;
      const p = off || x <= 1, n = off || x >= max - 1;
      if (prev.disabled !== p) prev.disabled = p;
      if (next.disabled !== n) next.disabled = n;
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(arrows); };
    const card = () => { const item = root.querySelector('[data-vp-item]'); return item ? item.offsetWidth + 16 : 200; };
    const dir = () => getComputedStyle(track).direction === 'rtl' ? -1 : 1;
    const page = by => { const w = card(); track.scrollBy({left: by * dir() * Math.max(w, track.clientWidth - w), behavior: smooth()}); };

    vp.select = item => { const i = items().indexOf(item); if (i > -1 && i !== vp.index) select(i, false); else if (i > -1) reveal(item); };
    vp.refresh = item => { if (items().indexOf(item) !== vp.index) return; const d = data(item), key = keyOf(d); if (key !== vp.key) { vp.key = key; build(d); } };
    vp.layout = queue;

    on(st, root, 'click', e => {
      const t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('[data-vp-play]')) { start(); return; }
      const clip = t.closest('[data-vp-clip]');
      if (clip) { select(items().indexOf(clip.closest('[data-vp-item]')), true); return; }
      if (t.closest('[data-vp-prev]')) page(-1);
      else if (t.closest('[data-vp-next]')) page(1);
    });
    on(st, track, 'scroll', queue, {passive: true});
    on(st, track, 'keydown', e => {
      if ((e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') || !row()) return;
      const by = (e.key === 'ArrowRight' ? 1 : -1) * dir(), clip = e.target.closest ? e.target.closest('[data-vp-clip]') : null;
      e.preventDefault();
      if (clip) { const list = items(), to = list[list.indexOf(clip.closest('[data-vp-item]')) + by], b = to && to.querySelector('[data-vp-clip]'); if (b) { b.focus({preventScroll: true}); reveal(to); } }
      else track.scrollBy({left: by * dir() * card(), behavior: smooth()});
    });
    for (const type of ['play', 'playing']) on(st, stage, type, () => state('playing'), {capture: true});
    on(st, stage, 'pause', e => { if (!e.target.ended) state('paused'); }, {capture: true});
    on(st, stage, 'ended', () => {
      if (root.dataset.next === 'true' && !reduced.matches && vp.index < items().length - 1) select(vp.index + 1, true);
      else idle();
    }, {capture: true});
    if ('IntersectionObserver' in window) {
      st.io = new IntersectionObserver(entries => { for (const e of entries) if (!e.isIntersecting) { const v = box.querySelector('video'); if (v && !v.paused) v.pause(); } });
      st.io.observe(stage);
    }
    if ('ResizeObserver' in window) { st.ro = new ResizeObserver(queue); st.ro.observe(track); }
    queue();
  }
  const runtimes = {'lightbox-gallery': gallery, 'video-playlist': playlist};

  /* ---------- roots ---------- */
  function drop(root, st) {
    cancelAnimationFrame(st.frame);
    st.ac.abort();
    if (st.io) st.io.disconnect();
    if (st.ro) st.ro.disconnect();
    roots.delete(root);
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll(SEL)) {
      const known = roots.get(root);
      if (known) { if (known.editable && known.raw !== root.dataset.r7mSettings) known.schedule(); continue; }
      if (!runtimes[root.dataset.r7m]) continue;
      const defaults = parse(root.dataset.r7mDefaults);
      const st = {root, type: root.dataset.r7m, editable: root.hasAttribute('data-r7m-settings'), defaults, raw: root.dataset.r7mSettings, blockDefaults: parse(root.dataset.r7mBlockDefaults), blocks: new Map(), rawBlocks: new Map(), out: new WeakMap(), mode: 'record', diff: [], frame: 0, listeners: 0, ac: new AbortController(), io: null, ro: null, vp: null};
      st.s = {...defaults, ...parse(st.raw)};
      st.schedule = () => { if (st.editable && !st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
      /* The wrapper outlives a redraw: margins written on it for the old root would hide the new markup's own. */
      const wrap = root.closest('.shopify-section');
      if (wrap) for (const k of ['--r7-mt-m', '--r7-mb-m', '--r7-mt-d', '--r7-mb-d']) wrap.style.removeProperty(k);
      roots.set(root, st);
      runtimes[st.type](root, st);
      if (st.editable) derive(root, st);
      st.mode = 'live';
    }
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id : v || '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId);
    if (!id || !d.settings) return;
    const blockRaw = d.block || d.blockId || d.block_id, block = blockRaw ? sectionId(blockRaw) : '';
    for (const [root, st] of roots) {
      if (root.dataset.r7mSection !== id || !st.editable) continue;
      if (block) st.blocks.set(block, {...st.blocks.get(block), ...d.settings});
      else Object.assign(st.s, d.settings);
      st.schedule();
    }
  });
  /* Picking a Clip block in the builder shows that clip in the player. */
  document.addEventListener('shopify:block:select', e => {
    const item = e.target && e.target.closest ? e.target.closest('[data-vp-item]') : null, st = item && roots.get(item.closest(SEL));
    if (st && st.vp) st.vp.select(item);
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, () => scan());
  desktop.addEventListener('change', () => { for (const st of roots.values()) if (st.vp) st.vp.layout(); });
  let queued = 0;
  new MutationObserver(records => {
    if (queued) return;
    if (records.some(r => r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))))) queued = requestAnimationFrame(() => { queued = 0; scan(); });
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-r7m-settings']});
  window.MateriaR7Media = {
    scan,
    stats: () => ({roots: roots.size, listeners: [...roots.values()].reduce((n, st) => n + st.listeners, 0), ...stats}),
    /* outputs whose markup differs from what the settings derive (tests) */
    audit: () => { const out = []; for (const [root, st] of roots) { if (!st.editable) continue; st.mode = 'audit'; st.diff = []; derive(root, st); st.mode = 'live'; for (const d of st.diff) out.push(root.dataset.r7mSection + ' ' + d); } return out; },
  };
  scan();
})();
