/* Materia Themes. Live editor updates and video playback for the image-video
   Image and video sections: Image (image-section), Video (video), Video 2
   (video-2). One scoped controller: a Map of section roots, one paint per frame
   per root, only what changed is written, a playing video is never reloaded or
   restarted unless its source changes, autoplay only while on screen and never
   under reduced motion. */
(() => {
  if (window.MateriaMediaImageVideo) return;
  const roots = new Map(), players = new Map(), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stats = {listeners: 0, paints: 0, builds: 0};
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const color = (v, f) => (api() ? api().color(v, f) : f) || f;
  /* A picker object prints as Liquid does (family, fallbacks); the helper also loads the face for live previews. */
  const font = (v, f) => { const loaded = api() && api().font(v); if (v && typeof v === 'object' && typeof v.family === 'string' && /^[\w\s-]+$/.test(v.family)) return v.family + ', ' + (typeof v.fallback_families === 'string' && v.fallback_families ? v.fallback_families : 'sans-serif'); return loaded || f; };
  const url = (v, image) => api() ? api().url(v, image) : (typeof v === 'string' ? v : '');
  const set = (el, k, v) => { if (el && el.style.getPropertyValue(k) !== String(v)) el.style.setProperty(k, v); };
  const unset = (el, k) => { if (el && el.style.getPropertyValue(k) !== '') el.style.removeProperty(k); };
  const vars = (el, map) => { for (const k in map) set(el, k, map[k]); };
  const cls = (el, c, on) => { if (el && el.classList.contains(c) !== !!on) el.classList.toggle(c, !!on); };
  const hide = (el, h) => { if (el && el.hidden !== !!h) el.hidden = !!h; };
  const attr = (el, k, v) => { if (!el) return; if (v == null || v === false) { if (el.hasAttribute(k)) el.removeAttribute(k); } else if (el.getAttribute(k) !== String(v)) el.setAttribute(k, v); };
  const listen = (el, type, fn, opts) => { el.addEventListener(type, fn, opts); stats.listeners++; return () => { el.removeEventListener(type, fn, opts); stats.listeners--; }; };

  function scheme(root, s) {
    const id = s.color_scheme && typeof s.color_scheme === 'object' ? s.color_scheme.id : s.color_scheme;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || root.classList.contains('color-' + id)) return;
    for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c);
    root.classList.add('color-' + id);
  }
  function resetSpacing(root, s) {
    const wrap = root.closest('.shopify-section');
    if (wrap) for (const style of wrap.querySelectorAll('style[data-iv-reset]')) attr(style, 'media', bool(s.reset_spacing) ? null : 'not all');
    return wrap;
  }
  function rich(el, html, state) { if (api()) api().rich(el, html, state); else if (state.rich.get(el) !== html) { el.textContent = String(html || '').replace(/<[^>]*>/g, ''); state.rich.set(el, html); } }

  /* ---------- player ---------- */
  function videoSource(v) {
    if (v && typeof v === 'object') {
      const list = Array.isArray(v.sources) ? v.sources : [];
      const s = list.find(x => x && (x.format === 'mp4' || x.mime_type === 'video/mp4')) || list[0];
      return url(s ? s.url || s.src : v.url || v.src || v.value, true);
    }
    return '';
  }
  function source(p) {
    const file = videoSource(p.video);
    if (file) return {kind: 'file', src: file};
    const raw = typeof p.url === 'string' ? p.url.trim() : url(p.url);
    if (!raw) return {kind: 'none', src: ''};
    let m = raw.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
    if (m) return {kind: 'youtube', src: m[1]};
    m = raw.match(/vimeo\.com\/(?:[^?#]*\/)?(\d+)/i);
    if (m) return {kind: 'vimeo', src: m[1]};
    const file2 = url(raw, true);
    return file2 ? {kind: 'file', src: file2} : {kind: 'none', src: ''};
  }
  function posterOf(p) { return url(p.poster, true) || (p.video && typeof p.video === 'object' ? url(p.video.preview_image, true) : ''); }
  function frameSrc(kind, id, p) {
    const auto = p.autoplay && !reduced.matches ? 1 : 0, mute = p.autoplay || p.muted ? 1 : 0, loop = p.loop ? 1 : 0, controls = p.controls || !auto ? 1 : 0;
    return kind === 'youtube'
      ? 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=' + auto + '&mute=' + mute + '&loop=' + loop + '&playlist=' + id + '&controls=' + controls + '&playsinline=1&rel=0&modestbranding=1'
      : 'https://player.vimeo.com/video/' + id + '?autoplay=' + auto + '&muted=' + mute + '&loop=' + loop + '&controls=' + controls + '&playsinline=1&dnt=1';
  }
  function playerState(box, p) {
    let ps = players.get(box);
    if (ps) return ps;
    const src = source(p);
    ps = {box, key: src.kind + '|' + src.src, kind: box.dataset.kind || src.kind, poster: posterOf(p), visible: false, seen: false, userPaused: false, userPlayed: false, resume: false, autoTried: false, autoplay: null, mute: null, off: []};
    const toggle = () => { const v = box.querySelector('video'); if (!v) return; if (v.paused || v.ended) { ps.userPlayed = true; ps.userPaused = false; if (!ps.p.autoplay && !ps.p.muted) v.muted = false; v.play()?.catch(() => {}); } else { ps.userPaused = true; ps.userPlayed = false; v.pause(); } };
    ps.off.push(listen(box, 'click', e => {
      if (e.target.closest('[data-iv-play]')) { e.preventDefault(); toggle(); }
      else if (e.target.closest('[data-iv-mute]')) { const v = box.querySelector('video'); if (v) { v.muted = !v.muted; ps.userSound = !v.muted; } }
      else if (e.target.tagName === 'VIDEO' && !e.target.controls && ps.p.play !== 'none') toggle();
    }));
    const sync = () => { const v = box.querySelector('video'), playing = !!v && !v.paused && !v.ended; box.dataset.state = playing ? 'playing' : 'paused'; const play = box.querySelector('[data-iv-play]'); attr(play, 'aria-label', playing ? 'Pause video' : 'Play video'); const mute = box.querySelector('[data-iv-mute]'); if (mute && v) { attr(mute, 'aria-pressed', String(!v.muted)); attr(mute, 'aria-label', v.muted ? 'Turn sound on' : 'Turn sound off'); } };
    for (const type of ['play', 'playing', 'pause', 'ended', 'volumechange']) ps.off.push(listen(box, type, sync, true));
    ps.sync = sync;
    players.set(box, ps);
    io.observe(box);
    return ps;
  }
  function build(box, ps, src, p) {
    stats.builds++;
    for (const old of box.querySelectorAll('.ivp__video, .ivp__frame')) { if (old.tagName === 'VIDEO') { old.pause(); old.removeAttribute('src'); } old.remove(); }
    const cover = box.querySelector('.ivp__cover');
    let el = null;
    if (src.kind === 'file') {
      el = document.createElement('video'); el.className = 'ivp__video'; el.playsInline = true; el.setAttribute('playsinline', ''); el.preload = p.lazy ? 'none' : 'metadata';
      el.muted = !!(p.autoplay || p.muted); if (el.muted) el.setAttribute('muted', '');
      el.src = src.src;
    } else if (src.kind !== 'none') {
      el = document.createElement('iframe'); el.className = 'ivp__frame'; el.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen'); el.allowFullscreen = true; el.loading = 'lazy'; el.dataset.id = src.src;
    }
    if (el) cover.after(el);
    box.dataset.kind = src.kind; box.dataset.state = 'paused';
    Object.assign(ps, {kind: src.kind, autoTried: false, userPaused: false, userPlayed: false, resume: false, mute: null});
  }
  function player(box, p) {
    const ps = playerState(box, p), src = source(p), key = src.kind + '|' + src.src;
    ps.p = p;
    if (key !== ps.key) { ps.key = key; build(box, ps, src, p); }
    const kind = ps.kind, video = box.querySelector('video.ivp__video'), frame = box.querySelector('iframe.ivp__frame'), cover = box.querySelector('.ivp__cover');
    const poster = posterOf(p), posterChanged = poster !== ps.poster;
    ps.poster = poster;
    cls(box, 'ivp--contain', p.fit === 'contain');
    for (const style of ['circle', 'outline', 'none']) cls(box, 'ivp--play-' + style, p.play === style);
    if (cover) {
      const show = kind !== 'file' && !!poster;
      if (show && (posterChanged || !cover.getAttribute('src'))) { cover.removeAttribute('srcset'); cover.src = poster; }
      hide(cover, !show); attr(cover, 'alt', p.label || ''); attr(cover, 'loading', p.lazy ? 'lazy' : null);
    }
    hide(box.querySelector('.ivp__ph'), kind !== 'none' || !!poster);
    hide(box.querySelector('[data-iv-play]'), !(kind === 'file' && p.play !== 'none' && !p.controls));
    hide(box.querySelector('[data-iv-mute]'), !(p.muteBtn && kind === 'file'));
    if (video) {
      if (video.loop !== !!p.loop) video.loop = !!p.loop;
      if (video.controls !== !!p.controls) video.controls = !!p.controls;
      const preload = p.lazy ? 'none' : 'metadata'; if (video.getAttribute('preload') !== preload) video.preload = preload;
      if (posterChanged || (poster && !video.getAttribute('poster'))) { if (poster) video.poster = poster; else video.removeAttribute('poster'); }
      attr(video, 'aria-label', p.label || null); attr(video, 'title', p.title || null);
      const mute = (p.autoplay ? 'a' : '') + (p.muted ? 'm' : '');
      if (ps.mute !== null && mute !== ps.mute) { video.muted = !!(p.autoplay || p.muted); ps.userSound = false; }
      ps.mute = mute;
      if (ps.autoplay !== null && ps.autoplay !== !!p.autoplay) {
        if (p.autoplay) { ps.userPaused = false; ps.autoTried = false; }
        else if (!ps.userPlayed && !video.paused) video.pause();
      }
      ps.autoplay = !!p.autoplay;
      ps.sync();
    }
    if (frame) {
      const want = frameSrc(kind, frame.dataset.id || src.src, p);
      if (ps.seen && frame.getAttribute('src') !== want) frame.src = want;
      attr(frame, 'title', p.title || p.label || 'Video');
    }
    playback(ps);
  }
  function playback(ps) {
    const v = ps.box.querySelector('video.ivp__video');
    if (!v || !ps.p) return;
    const active = ps.visible && !document.hidden;
    if (!active) { if (!v.paused) { ps.resume = true; v.pause(); } return; }
    if (ps.resume) { ps.resume = false; if (!(reduced.matches && !ps.userPlayed)) v.play()?.catch(() => {}); return; }
    if (reduced.matches) { if (!ps.userPlayed && !v.paused) v.pause(); return; }
    if (ps.p.autoplay && !ps.userPaused && !ps.autoTried && v.paused && !v.ended) { ps.autoTried = true; if (!ps.userSound) v.muted = true; v.play()?.catch(() => {}); }
  }
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      const ps = players.get(e.target); if (!ps) continue;
      ps.visible = e.isIntersecting; if (e.isIntersecting && !ps.seen) { ps.seen = true; const root = ps.box.closest('[data-iv]'); roots.get(root)?.schedule(); }
      playback(ps);
    }
  }, {threshold: 0.15});

  /* ---------- sections ---------- */
  const paints = {
    'image-section'(root, state) {
      const s = state.s, custom = bool(s.enable_custom_style), q = sel => root.querySelector(sel);
      scheme(root, s); resetSpacing(root, s);
      attr(root, 'data-iv-show', s.display_on || 'all');
      cls(root, 'iv-img--full', bool(s.is_fullwidth)); cls(root, 'iv-img--auto-d', num(s.img_min_height) === 0); cls(root, 'iv-img--auto-m', num(s.img_min_height_mobile) === 0);
      const fontFamily = bool(s.enable_custom_fonts) ? font(s.body_font, 'var(--body-font)') : 'var(--body-font)';
      vars(root, {
        '--iv-bg': custom ? color(s.section_bg, 'var(--gradient-background, var(--color-background))') : 'var(--gradient-background, var(--color-background))',
        '--iv-pt-d': px(s.section_padding_top), '--iv-pb-d': px(s.section_padding_bottom), '--iv-pt-m': px(s.section_padding_top_mobile), '--iv-pb-m': px(s.section_padding_bottom_mobile),
        '--iv-px-d': px(s.padding_lr_desktop), '--iv-px-m': px(s.padding_lr_mobile), '--iv-max': px(s.container_max_width, 1300),
        '--iv-h-d': String(num(s.img_min_height)), '--iv-h-m': String(num(s.img_min_height_mobile)), '--iv-mt': px(s.image_margin_top), '--iv-mb': px(s.image_margin_bottom), '--iv-radius': px(s.image_border_radius),
        '--iv-pos-d': num(s.background_position_x, 50) + '% ' + num(s.background_position_y, 50) + '%', '--iv-pos-m': num(s.background_position_x_mobile, 50) + '% ' + num(s.background_position_y_mobile, 50) + '%',
        '--iv-cap': custom ? color(s.image_description_text_color, 'var(--color-heading)') : 'var(--color-heading)', '--iv-cap-bg': custom ? color(s.image_text_background_color, 'var(--color-background)') : 'var(--color-background)',
        '--iv-cap-o': String(num(s.image_text_background_opacity) / 100), '--iv-cap-radius': px(s.image_text_border_radius), '--iv-cap-fz-d': px(s.image_description_fz), '--iv-cap-fz-m': px(s.image_description_fz_mobile),
        '--iv-cap-x-d': num(s.image_text_horizontal_position_desktop) + '%', '--iv-cap-x-m': num(s.image_text_horizontal_position_mobile) + '%', '--iv-cap-font': fontFamily,
      });
      const css = typeof s.custom_css === 'string' && s.custom_css.trim() ? '#shopify-section-' + root.dataset.ivSection + ' .loudecomz-section__' + root.dataset.ivSection + ' { ' + s.custom_css.replace(/<\/?style/gi, '') + ' }' : '';
      const custom_css = root.parentElement.querySelector('style[data-iv-custom-css]'); if (custom_css && custom_css.textContent !== css) custom_css.textContent = css;
      const media = q('.iv-img__media'), useVideo = bool(s.use_video) && !!String(s.video_url || '').trim(), photo = url(s.background_image, true), alt = s.image_alt || (s.background_image && typeof s.background_image === 'object' ? s.background_image.alt : '') || '';
      let img = media.querySelector(':scope > img');
      if (state.photo === undefined && img) state.photo = photo;
      if (!useVideo && photo) {
        if (!img) { img = document.createElement('img'); img.className = 'iv-img__img'; img.decoding = 'async'; media.prepend(img); state.photo = null; }
        if (state.photo !== photo) { img.removeAttribute('srcset'); img.removeAttribute('width'); img.removeAttribute('height'); img.src = photo; }
        attr(img, 'alt', alt); attr(img, 'loading', bool(s.lazyload) ? 'lazy' : 'eager'); hide(img, false);
      } else if (img) hide(img, true);
      state.photo = photo;
      hide(q('.iv-img__ph'), useVideo || !!photo);
      const vbox = q('.iv-img__video');
      hide(vbox, !useVideo);
      const box = vbox && vbox.querySelector('[data-iv-player]');
      if (box) player(box, {video: '', url: useVideo ? s.video_url : '', poster: s.background_image, autoplay: true, loop: true, controls: false, muted: true, label: alt, title: '', play: 'circle', muteBtn: false, lazy: false, fit: 'cover'});
      const cap = q('[data-iv-caption]');
      if (cap) { rich(cap, s.image_description, state); hide(cap, !String(s.image_description || '').replace(/<[^>]*>/g, '').trim()); const pos = String(s.image_description_position || 'bottom-left').toLowerCase().replace(/ /g, '-'); for (const c of ['bottom-left', 'bottom-center', 'bottom-right']) cls(cap, 'position-' + c, pos === c); cls(cap, 'iv-img__caption--bg', bool(s.enable_image_text_background)); }
    },
    'video-2'(root, state) {
      const s = state.s, custom = bool(s.enable_custom_style);
      scheme(root, s); resetSpacing(root, s);
      for (const w of ['container', 'fluid_container', 'stretch_width', 'full_width']) cls(root, 'vid2--w-' + w, (s.section_width || 'full_width') === w);
      cls(root, 'vid2--bleed', bool(s.full_bleed));
      vars(root, {
        '--iv-bg': custom ? color(s.section_bg, 'var(--color-background)') : 'var(--color-background)',
        '--iv-pt-d': px(s.padding_top_desktop), '--iv-pb-d': px(s.padding_bottom_desktop), '--iv-px-d': px(s.side_padding_desktop), '--iv-pt-m': px(s.padding_top_mobile), '--iv-pb-m': px(s.padding_bottom_mobile), '--iv-px-m': px(s.side_padding_mobile),
        '--iv-ratio': num(s.aspect_w, 16) + ' / ' + num(s.aspect_h, 9), '--iv-radius': px(s.radius),
        '--iv-overlay': custom ? color(s.overlay_color, 'var(--color-background)') : 'var(--color-background)', '--iv-overlay-o': String(num(s.overlay_opacity) / 100),
      });
      const box = root.querySelector('[data-iv-player]');
      if (box) player(box, {video: s.video, url: s.video_url, poster: s.poster, autoplay: bool(s.autoplay), loop: bool(s.loop), controls: bool(s.show_controls), muted: bool(s.muted), label: s.video_alt || '', title: '', play: s.play_button_style || 'circle', muteBtn: bool(s.show_mute_btn), lazy: false, fit: 'cover'});
    },
    video(root, state) {
      const s = state.s, custom = bool(s.enable_custom_style), c = (v, f) => custom ? color(v, f) : f, q = sel => root.querySelector(sel);
      scheme(root, s);
      const wrap = resetSpacing(root, s);
      if (wrap) vars(wrap, {'--iv-mt-d': px(s.section_margin_top_desktop), '--iv-mb-d': px(s.section_margin_bottom_desktop), '--iv-mt-m': px(s.section_margin_top_mobile), '--iv-mb-m': px(s.section_margin_bottom_mobile)});
      for (const w of ['container', 'fluid_container', 'stretch_width', 'full_width']) cls(root, w, (s.section_width || 'container') === w);
      attr(root, 'data-iv-show', s.show_on_device || 'all');
      const ratio = s.video_aspect_ratio && s.video_aspect_ratio !== 'none' ? String(s.video_aspect_ratio).replace(':', ' / ') : 'none';
      const bgImage = url(s.section_background_image, true), shadow = {low: '0 2px 4px rgba(0,0,0,.1)', medium: '0 4px 8px rgba(0,0,0,.2)', high: '0 6px 12px rgba(0,0,0,.3)'}[s.video_shadow] || 'none';
      if (state.bgImage === undefined) state.bgImage = bgImage;
      if (bgImage !== state.bgImage) { state.bgImage = bgImage; set(root, '--iv-bg-image', bgImage ? 'url("' + bgImage.replace(/"/g, '%22') + '")' : 'none'); }
      vars(root, {
        '--iv-bg': c(s.section_bg || s.section_background_color, 'var(--color-background)'), '--iv-backdrop': c(s.section_background_image_color, 'transparent'), '--iv-bg-size': s.section_background_size || 'cover',
        '--iv-pv-d': px(s.section_padding_top_bottom), '--iv-ph-d': px(s.section_padding_left_right), '--iv-pv-m': px(s.mobile_section_padding_top_bottom), '--iv-ph-m': px(s.mobile_section_padding_left_right),
        '--iv-box-max': px(s.container_max_width), '--iv-box-pv-d': px(s.container_padding_top_bottom), '--iv-box-ph-d': px(s.container_padding_left_right), '--iv-box-pv-m': px(s.mobile_container_padding_top_bottom), '--iv-box-ph-m': px(s.mobile_container_padding_left_right),
        '--iv-box-bg': c(s.container_background_color, 'transparent'), '--iv-box-bw': px(s.container_border_size), '--iv-box-bc': c(s.container_border_color, 'var(--color-border)'), '--iv-box-radius': px(s.container_radius), '--iv-link': c(s.link_color, 'var(--color-primary)'),
        '--iv-spacing': px(s.element_spacing), '--iv-gap-d': px(s.desktop_spacing_gap), '--iv-gap-m': px(s.mobile_spacing_gap), '--iv-align-d': s.text_alignment || 'center', '--iv-align-m': s.mobile_text_alignment || 'center',
        '--iv-v-mt-d': px(s.desktop_video_margin_top), '--iv-v-mb-d': px(s.desktop_video_margin_bottom), '--iv-v-mt-m': px(s.mobile_video_margin_top), '--iv-v-mb-m': px(s.mobile_video_margin_bottom),
        '--iv-vw-d': px(s.desktop_video_width), '--iv-vh-d': px(s.desktop_video_height), '--iv-vw-m': px(s.mobile_video_width), '--iv-vh-m': px(s.mobile_video_height), '--iv-ratio': ratio,
        '--iv-media-radius': px(s.media_radius), '--iv-media-shadow': shadow, '--iv-overlay': c(s.overlay_color, 'var(--color-background)'), '--iv-overlay-o': String(num(s.overlay_opacity) / 100),
      });
      cls(q('.loud-container'), 'loud-container--shadow', bool(s.container_shadow));
      cls(q('.loud-media'), 'loud-media--ratio', ratio !== 'none');
      let shown = 0;
      for (const el of root.querySelectorAll('[data-iv-block]')) {
        const id = el.dataset.ivBlock, type = el.dataset.ivType, heading = type === 'headline';
        if (state.rawBlocks.get(id) !== el.dataset.ivSettings) { const first = !state.rawBlocks.has(id); state.rawBlocks.set(id, el.dataset.ivSettings); state.blocks.set(id, {...parse(el.dataset.ivSettings), ...(first ? state.blocks.get(id) : {})}); }
        const b = {...state.blockDefaults[type], ...state.blocks.get(id)}, value = heading ? b.headline : b.text, lh = heading ? b.headline_line_height : b.text_line_height, f = heading ? b.headline_font : b.text_font;
        rich(el, value, state); const empty = !String(value || '').replace(/<[^>]*>/g, '').trim(); hide(el, empty); if (!empty) shown++;
        if (bool(b.enable_custom_style)) set(el, '--iv-color', color(heading ? b.headline_text_color : b.text_color, heading ? 'var(--color-heading)' : 'var(--color-text)')); else unset(el, '--iv-color');
        const family = bool(b.override_font) ? font(f, '') : '';
        if (family) { set(el, '--iv-font', family); set(el, '--iv-weight', String(heading ? b.font_weight || (f && f.weight) || 400 : (f && f.weight) || 400)); } else { unset(el, '--iv-font'); unset(el, '--iv-weight'); }
        if (lh && lh !== 'inherit') set(el, '--iv-lh', String(lh)); else unset(el, '--iv-lh');
        const sized = bool(b.enable_custom_size); cls(el, 'loud-block--sized', sized);
        if (sized) { set(el, '--iv-size-d', px(heading ? b.headline_size : b.text_size)); set(el, '--iv-size-m', px(heading ? b.mobile_headline_size : b.mobile_text_size)); } else { unset(el, '--iv-size-d'); unset(el, '--iv-size-m'); }
      }
      hide(q('.loud-headline'), shown === 0);
      const useUrl = bool(s.enable_custom_url_video) && String(s.custom_video_url || '').trim();
      const box = root.querySelector('[data-iv-player]');
      if (box) player(box, {video: useUrl ? '' : s.video, url: useUrl ? s.custom_video_url : '', poster: s.video_poster, autoplay: bool(s.video_autoplay), loop: bool(s.video_loop), controls: bool(s.video_controls), muted: bool(s.video_muted), label: s.video_alt || '', title: s.video_metadata || '', play: bool(s.big_play_pause_button) ? s.play_button_style || 'circle' : 'none', muteBtn: false, lazy: bool(s.enable_lazy_loading), fit: s.video_fit || 'cover'});
    },
  };

  function paint(root, state) {
    stats.paints++;
    if (state.raw !== root.dataset.ivSettings) { state.raw = root.dataset.ivSettings; state.s = {...state.defaults, ...parse(state.raw)}; }
    paints[root.dataset.iv]?.(root, state);
  }
  function cleanup() {
    for (const [root, s] of roots) if (!root.isConnected) { cancelAnimationFrame(s.frame); roots.delete(root); }
    for (const [box, ps] of players) if (!box.isConnected) { io.unobserve(box); for (const off of ps.off) off(); const v = box.querySelector('video'); if (v) v.pause(); players.delete(box); }
  }
  function scan() {
    cleanup();
    for (const root of document.querySelectorAll('[data-iv]')) {
      if (!paints[root.dataset.iv]) continue;
      if (roots.has(root)) { roots.get(root).schedule(); continue; }
      const defaults = parse(root.dataset.ivDefaults);
      const state = {defaults, s: {...defaults, ...parse(root.dataset.ivSettings)}, raw: root.dataset.ivSettings, blocks: new Map(), rawBlocks: new Map(), blockDefaults: parse(root.dataset.ivBlockDefaults), rich: new WeakMap(), frame: 0};
      state.schedule = () => { if (!state.frame) state.frame = requestAnimationFrame(() => { state.frame = 0; if (root.isConnected) paint(root, state); }); };
      roots.set(root, state);
      paint(root, state);
    }
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id : v || '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId);
    if (!id || !d.settings) return;
    const blockRaw = d.block || d.blockId || d.block_id, block = blockRaw ? sectionId(blockRaw) : '';
    for (const [root, state] of roots) {
      if (root.dataset.ivSection !== id) continue;
      if (block) state.blocks.set(block, {...state.blocks.get(block), ...d.settings});
      else Object.assign(state.s, d.settings);
      state.schedule();
    }
  });
  const rescan = () => scan();
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, rescan);
  document.addEventListener('visibilitychange', () => { for (const ps of players.values()) playback(ps); });
  reduced.addEventListener('change', () => { for (const state of roots.values()) state.schedule(); });
  let queued = 0;
  new MutationObserver(records => {
    if (queued) return;
    if (records.some(r => r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-iv],[data-iv-block],[data-iv-player]') || n.querySelector('[data-iv],[data-iv-block],[data-iv-player]'))))) queued = requestAnimationFrame(() => { queued = 0; scan(); });
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-iv-settings']});
  window.MateriaMediaImageVideo = {scan, stats: () => ({roots: roots.size, players: players.size, ...stats})};
  scan();
})();
