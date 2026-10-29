/* Compositor-driven image reel. Text controls use the shared, theme-aware hero runtime. */
(() => {
  if (window.MateriaHeroScrolling) return;
  const states = new WeakMap(), active = new Set();
  const parse = value => { try { return JSON.parse(value || '{}'); } catch (_) { return {}; } };
  const bool = value => { value = value && typeof value === 'object' ? value.value : value; return value === true || value === 'true' || value === 1; };
  const num = (value, fallback = 0) => value !== '' && value != null && Number.isFinite(Number(value)) ? Number(value) : fallback;
  const url = value => { value = value && typeof value === 'object' ? value.src || value.url || value.preview_image?.src || value.preview_image?.url || value.value : value; try { return typeof value === 'string' && value && ['http:', 'https:'].includes(new URL(value, location.href).protocol) ? value : ''; } catch (_) { return ''; } };
  const color = value => { if (value && typeof value === 'object') { if (value.alpha === 0 || value.a === 0) return ''; value = value.hex || value.value || value.color; } return typeof value === 'string' && CSS.supports('color', value) ? value : ''; };
  const set = (el, name, value) => { if (el.style.getPropertyValue(name) !== String(value)) el.style.setProperty(name, value); };
  const attribute = (el, name, value) => { if (el.getAttribute(name) !== String(value)) el.setAttribute(name, value); };
  function clone(el) {
    const result = el.cloneNode(true);
    result.dataset.hpsClone = '';
    result.setAttribute('aria-hidden', 'true'); result.inert = true;
    for (const node of [result, ...result.querySelectorAll('*')]) {
      for (const attr of [...node.attributes]) if (attr.name === 'id' || attr.name === 'data-hps-originals' || attr.name.startsWith('data-shopify') || attr.name.startsWith('data-storelib') || attr.name.startsWith('data-hps-image')) node.removeAttribute(attr.name);
    }
    result.querySelectorAll('img').forEach(image => { image.alt = ''; image.loading = 'eager'; image.removeAttribute('fetchpriority'); });
    return result;
  }
  function init(root) {
    if (states.has(root)) return states.get(root);
    const state = { root, settings: { ...parse(root.dataset.hi1Defaults), ...parse(root.dataset.hi1Settings) }, raw: root.dataset.hi1Settings, images: new Map(), imageRaw: new Map(), near: true, userPaused: false, hover: false, focused: false, frame: 0, reduced: matchMedia('(prefers-reduced-motion:reduce)'), signature: '' };
    const schedule = () => { if (!state.frame) state.frame = requestAnimationFrame(() => { state.frame = 0; if (!root.isConnected) { dispose(); return; } paint(); }); };
    function playState() {
      const stopped = !state.near || document.hidden || state.userPaused || state.hover || state.focused || state.static;
      if (state.animation) { if (stopped) state.animation.pause(); else state.animation.play(); }
      const button = root.querySelector('[data-hps-motion]'); if (!button) return;
      button.hidden = !bool(state.settings.show_motion_control) || state.static;
      attribute(button, 'aria-pressed', String(state.userPaused));
      const label = state.userPaused ? state.settings.resume_label : state.settings.pause_label;
      if (button.textContent !== label) button.textContent = label || (state.userPaused ? 'Play gallery' : 'Pause gallery');
      root.dataset.hpsPaused = String(stopped);
    }
    function paint() {
      if (state.raw !== root.dataset.hi1Settings) { state.raw = root.dataset.hi1Settings; state.settings = { ...parse(root.dataset.hi1Defaults), ...parse(state.raw) }; }
      const s = state.settings, marquee = root.querySelector('.hps-marquee'), track = root.querySelector('.hps-track'), group = root.querySelector('[data-hps-originals]');
      if (!marquee || !track || !group) return;
      const desktop = root.clientWidth >= 768, width = root.querySelector('.hi1').clientWidth, pane = width * Math.max(10, Math.min(150, num(desktop ? s.pane_width_desktop : s.pane_width_mobile, 100))) / 100, gap = Math.max(0, num(s.image_gap));
      set(root, '--hps-pane', pane + 'px'); set(root, '--hps-gap', gap + 'px');
      marquee.hidden = bool(s.use_background_color); marquee.dataset.fade = String(bool(s.fade_edges)); attribute(marquee, 'aria-label', s.aria_label || 'Scrolling hero gallery');
      state.static = state.reduced.matches || !bool(s.enable_scrolling) || marquee.hidden;
      root.dataset.hpsStatic = String(state.static);
      marquee.tabIndex = state.static && !marquee.hidden ? 0 : -1;
      const originals = [...group.children].filter(el => !el.hasAttribute('data-hps-clone'));
      for (const el of originals) {
        if (!el.hasAttribute('data-hps-image')) continue;
        const id = el.dataset.hpsImage;
        if (state.imageRaw.get(id) !== el.dataset.hpsImageSettings) { state.imageRaw.set(id, el.dataset.hpsImageSettings); state.images.set(id, parse(el.dataset.hpsImageSettings)); }
        const b = state.images.get(id) || {}, image = el.querySelector('img'), picture = el.querySelector('picture');
        const src = url(desktop ? b.image : b.image_mobile || b.image) || url(b.image) || url(b.image_mobile) || image.dataset.hpsPlaceholder;
        if (src && image.getAttribute('src') !== src) image.src = src;
        attribute(image, 'data-hps-empty', String(src === image.dataset.hpsPlaceholder));
        attribute(image, 'alt', b.image_alt || (typeof b.image === 'object' ? b.image?.alt : '') || '');
        let source = picture.querySelector('source'); if (!source) { source = document.createElement('source'); picture.prepend(source); }
        const mobile = url(b.image_mobile); if (mobile) attribute(source, 'srcset', mobile); else source.removeAttribute('srcset'); attribute(source, 'media', !desktop && mobile ? 'all' : 'not all');
        set(el, '--hps-image-fit', b.image_fit === 'contain' ? 'contain' : 'cover'); set(el, '--hps-image-x', num(b.image_position_x, 50) + '%'); set(el, '--hps-image-y', num(b.image_position_y, 50) + '%');
        set(el, '--hps-image-radius', bool(b.enable_custom_style) ? num(b.radius) + 'px' : 'var(--rounded-radius,0px)'); set(el, '--hps-image-bg', bool(b.enable_custom_style) ? color(b.background) || 'var(--color-background)' : 'var(--color-background)');
      }
      // Rebuild only decorative copies when their content or geometry changes. Original images stay put.
      const signature = JSON.stringify([pane, gap, originals.map(el => [el.dataset.hpsImage, el.dataset.hpsImageSettings, state.images.get(el.dataset.hpsImage)])]);
      if (signature !== state.signature) {
        group.querySelectorAll(':scope > [data-hps-clone]').forEach(el => el.remove());
        track.querySelectorAll(':scope > [data-hps-clone]').forEach(el => el.remove());
        const copies = Math.max(1, Math.ceil(width / Math.max(1, originals.length * (pane + gap))));
        for (let i = 1; i < copies; i++) for (const el of originals) group.append(clone(el));
        track.append(clone(group)); state.signature = signature;
      }
      const distance = group.getBoundingClientRect().width, duration = Math.max(5, num(desktop ? s.speed_desktop : s.speed_mobile, 60)) * 1000;
      const direction = s.direction === 'right' ? 'reverse' : 'normal';
      if (!state.static && distance > 0) {
        if (!state.animation) state.animation = track.animate([{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${-distance}px,0,0)` }], { duration, iterations: Infinity, easing: 'linear', direction });
        else {
          const old = state.animation.effect.getTiming(), time = num(state.animation.currentTime), progress = time / old.duration;
          if (state.distance !== distance) state.animation.effect.setKeyframes([{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${-distance}px,0,0)` }]);
          if (old.duration !== duration || old.direction !== direction) {
            const next = old.direction !== direction ? Math.floor(progress) + 1 - (progress % 1) : progress;
            state.animation.effect.updateTiming({ duration, direction }); state.animation.currentTime = next * duration;
          }
        }
        state.distance = distance;
      } else if (state.animation) { state.animation.cancel(); state.animation = null; }
      state.hover = bool(s.pause_on_hover) && matchMedia('(hover:hover)').matches && root.matches(':hover');
      playState();
    }
    const enter = event => { if (event.pointerType !== 'touch' && bool(state.settings.pause_on_hover) && matchMedia('(hover:hover)').matches) { state.hover = true; playState(); } };
    const leave = () => { state.hover = false; playState(); };
    const focus = event => { state.focused = !event.target.closest('[data-hps-motion]'); playState(); };
    const blur = event => { if (!root.contains(event.relatedTarget)) { state.focused = false; playState(); } };
    const click = event => { if (event.target.closest('[data-hps-motion]')) { state.userPaused = !state.userPaused; playState(); } };
    const resize = new ResizeObserver(schedule); resize.observe(root); resize.observe(root.querySelector('.hi1'));
    const observer = new MutationObserver(records => { if (records.some(r => r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-hps-image],[data-hps-originals]') || n.querySelector('[data-hps-image]'))))) schedule(); });
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-hi1-settings', 'data-hps-image-settings'] });
    const intersection = new IntersectionObserver(entries => { state.near = entries[0].isIntersecting; playState(); }, { rootMargin: '150px' }); intersection.observe(root);
    root.addEventListener('pointerenter', enter); root.addEventListener('pointerleave', leave); root.addEventListener('focusin', focus); root.addEventListener('focusout', blur); root.addEventListener('click', click);
    state.reduced.addEventListener('change', schedule); document.addEventListener('visibilitychange', playState);
    function dispose() { resize.disconnect(); observer.disconnect(); intersection.disconnect(); state.animation?.cancel(); root.removeEventListener('pointerenter', enter); root.removeEventListener('pointerleave', leave); root.removeEventListener('focusin', focus); root.removeEventListener('focusout', blur); root.removeEventListener('click', click); state.reduced.removeEventListener('change', schedule); document.removeEventListener('visibilitychange', playState); active.delete(root); states.delete(root); }
    Object.assign(state, { schedule, dispose }); states.set(root, state); active.add(root); paint(); return state;
  }
  const scan = () => { for (const root of active) if (!root.isConnected) states.get(root)?.dispose(); document.querySelectorAll('[data-hero-scrolling]').forEach(root => init(root).schedule()); };
  document.addEventListener('storelib:settings-change', event => {
    const d = event.detail || {}, section = d.section || d.sectionId; if (!d.settings || !section) return;
    const id = String(typeof section === 'object' ? section.id : section).replace(/^shopify-section-/, '');
    for (const root of active) if (root.dataset.heroScrolling === id) {
      const state = states.get(root), block = d.block || d.blockId || d.block_id;
      if (block) { const key = String(typeof block === 'object' ? block.id : block); state.images.set(key, { ...state.images.get(key), ...d.settings }); } else Object.assign(state.settings, d.settings);
      state.schedule();
    }
  });
  ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load'].forEach(name => document.addEventListener(name, scan));
  new MutationObserver(records => { if (records.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-hero-scrolling]') || n.querySelector('[data-hero-scrolling]'))))) scan(); }).observe(document.documentElement, { childList: true, subtree: true });
  window.MateriaHeroScrolling = { scan }; scan();
})();
