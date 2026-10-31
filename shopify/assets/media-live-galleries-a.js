/* Materia Themes. Live editor updates and interactions for the galleries-a
   Image and video sections: Gallery Simple 1 (gallery-basic2), Gallery Grid 1
   (gallery-grid1), Gallery Interactive 2 (gallery-interactive) and Gallery
   Simple 3 (gallery-simple3).

   The Liquid output paints the final look through CSS variables and data
   attributes on each root. This file computes the same values from the
   settings, so a live edit changes only what changed: a variable, an
   attribute, a text node, an image source. Each root is its own state;
   paints are batched to one per frame per root; removed roots are cleaned up. */
(() => {
  if (window.MateriaGalleriesA) return;
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const color = (v, f) => api()?.color(v, f) || f;
  const font = (v, f) => (v && api()?.font(v)) || f;
  const url = (v, image) => api()?.url(v, image) || '';
  const strip = v => String(v || '').replace(/<[^>]*>/g, '').trim();
  const video = v => { v = strip(v); return v ? url(v, true) : ''; };
  const SHADOWS = {none: 'none', low: '0 2px 4px rgba(0, 0, 0, 0.1)', medium: '0 4px 8px rgba(0, 0, 0, 0.2)', high: '0 6px 12px rgba(0, 0, 0, 0.3)'};
  const DESKTOP = '(min-width: 750px)';

  function setVar(el, k, v) { if (el && el.style.getPropertyValue(k) !== String(v)) el.style.setProperty(k, v); }
  function setAttr(el, k, v) { if (!el) return; if (v === null || v === false) { if (el.hasAttribute(k)) el.removeAttribute(k); } else if (el.getAttribute(k) !== String(v)) el.setAttribute(k, v); }
  function setHidden(el, h) { if (el && el.hidden !== !!h) el.hidden = !!h; }
  /* Apply only when the value differs from what the element last showed.
     The first value is what the server rendered (from the data attribute). */
  function sync(state, el, key, initial, current, apply) {
    if (!el) return;
    let m = state.memo.get(el); if (!m) { m = new Map(); state.memo.set(el, m); }
    if (!m.has(key)) m.set(key, initial);
    if (m.get(key) !== current) { m.set(key, current); apply(current); }
  }
  function rich(state, el, initial, current) { sync(state, el, 'rich', String(initial ?? ''), String(current ?? ''), v => api()?.rich(el, v, {rich: new WeakMap()})); }
  function image(state, img, initial, current, onSet) {
    sync(state, img, 'src', url(initial, true), url(current, true), v => {
      if (v) { img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src = v; } else { img.removeAttribute('srcset'); img.removeAttribute('src'); }
      if (onSet) onSet(v);
    });
  }
  function videoSrc(state, el, initial, current) {
    sync(state, el, 'src', video(initial), video(current), v => { if (v) el.src = v; else { el.removeAttribute('src'); try { el.load(); } catch (_) {} } });
  }
  function link(el, href) { if (!el) return; if (href) setAttr(el, 'href', href); else setAttr(el, 'href', null); setHidden(el, !href); }
  function scheme(root, s) {
    const id = s.color_scheme?.id || s.color_scheme;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || root.classList.contains('color-' + id)) return;
    for (const cls of [...root.classList]) if (cls.startsWith('color-')) root.classList.remove(cls);
    root.classList.add('color-' + id);
  }
  function customCss(root, css) { const el = root.querySelector(':scope > style[data-mga-custom-css]'); if (el && el.textContent !== String(css ?? '')) el.textContent = String(css ?? ''); }
  function vars(el, map) { for (const k in map) setVar(el, k, map[k]); }
  /* Like vars(), but null removes the property so the inherited value shows. */
  function overrides(el, map) { for (const k in map) { if (map[k] == null) { if (el.style.getPropertyValue(k)) el.style.removeProperty(k); } else setVar(el, k, map[k]); } }
  function show(v) { return {mobile_only: 'mobile', desktop_only: 'desktop', no_devices: 'none'}[v] || 'all'; }
  function spacing(s, keys) { const out = {}; for (const [k, id] of Object.entries(keys)) out[k] = px(s[id]); return out; }
  function maxWidth(v) { return num(v) > 0 ? num(v) + 'px' : 'none'; }
  function weight(v, f) { return !v || v === 'inherit' ? f : String(v); }

  /* Shared media handling: placeholders, lazy loading, autoplay videos that
     stop off screen, in a hidden tab and under reduced motion. */
  function videos(root, state) {
    const play = state.visible && !document.hidden && !state.reduced.matches;
    for (const v of root.querySelectorAll('video[data-mga-video]')) {
      v.autoplay = !state.reduced.matches;
      if (v.hidden || !v.getAttribute('src')) continue;
      if (play && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      else if (!play && !v.paused) v.pause();
    }
  }

  const TYPES = {
    'gallery-basic2': {
      vars(s, c) {
        return {
          '--mga-section-bg': c(s.section_bg, 'var(--color-background)'), '--mga-bg': c(s.background_color, 'var(--color-background)'),
          '--mga-link-bg': c(s.link_bg, 'var(--color-background)'), '--mga-link-color': c(s.link_color, 'var(--color-heading)'),
          '--mga-ratio-d': strip(s.img_proportion).replace('%', ''), '--mga-ratio-m': strip(s.img_proportion_mobile).replace('%', ''),
          '--mga-shadow': SHADOWS[s.image_shadow] || 'none', '--mga-radius': bool(s.make_images_circle) ? '50%' : px(s.image_border_radius),
          '--mga-cols-d': String(num(s.columns_desktop, 3)), '--mga-cols-m': String(num(s.columns_mobile, 1)),
          '--mga-gap-d': px(s.gutter), '--mga-gap-m': px(s.vertical_space_mobile), '--mga-max': maxWidth(s.container_max_width), '--mga-icon': px(s.icon_size),
          ...spacing(s, {'--mga-pt-d': 'section_padding_top', '--mga-pb-d': 'section_padding_bottom', '--mga-pt-m': 'section_padding_top_mobile', '--mga-pb-m': 'section_padding_bottom_mobile'}),
        };
      },
      attrs(s) { return {'data-mga-width': s.section_width || 'full_width', 'data-mga-reset': String(bool(s.reset_spacing)), 'data-mga-hover': s.image_hover_animation || 'none', 'data-mga-order': bool(s.display_video_first) ? 'video' : bool(s.display_image_first) ? 'image' : 'none'}; },
      block(root, state, el, b, init) {
        const media = el.querySelector('[data-mga-media]'), img = el.querySelector('img[data-mga-img]'), vid = el.querySelector('video[data-mga-video]'), a = el.querySelector('[data-mga-link]');
        image(state, img, init.background_image, b.background_image);
        videoSrc(state, vid, init.video_url, b.video_url);
        const hasImg = !!url(b.background_image, true), hasVid = !!video(b.video_url);
        setHidden(img, !hasImg); setHidden(vid, !hasVid);
        setAttr(media, 'data-media', hasImg && hasVid ? 'both' : hasImg ? 'image' : hasVid ? 'video' : 'none');
        setAttr(img, 'alt', strip(b.alt) || b.background_image?.alt || '');
        setAttr(img, 'loading', bool(state.s.lazyload) ? 'lazy' : 'eager');
        link(a, url(b.gallery_link_url)); setAttr(a, 'aria-label', strip(b.link_label) || 'View details');
      },
    },
    'gallery-grid1': {
      vars(s, c) {
        return {
          '--mga-section-bg': c(s.section_bg, 'var(--color-background)'), '--mga-bg': c(s.background_color, 'var(--color-background)'),
          '--mga-max': bool(s.is_fullwidth) ? 'none' : maxWidth(s.container_max_width), '--mga-gap': px(s.gutter), '--mga-row-gap-d': px(s.vertical_space_desktop), '--mga-row-gap-m': px(s.vertical_space_mobile),
          '--mga-radius': px(s.image_border_radius),
          ...spacing(s, {'--mga-pt-d': 'section_padding_top', '--mga-pb-d': 'section_padding_bottom', '--mga-pl-d': 'padding_left_desktop', '--mga-pr-d': 'padding_right_desktop', '--mga-pt-m': 'section_padding_top_mobile', '--mga-pb-m': 'section_padding_bottom_mobile', '--mga-pl-m': 'padding_left_mobile', '--mga-pr-m': 'padding_right_mobile'}),
        };
      },
      attrs(s) { return {'data-mga-reset': String(bool(s.reset_spacing)), 'data-mga-hover': s.image_hover_animation || 'none', 'data-mga-show': show(s.display_section_on)}; },
      section(root, state, s, init) {
        for (const slot of root.querySelectorAll('[data-mga-slot]')) {
          const n = slot.dataset.mgaSlot, img = slot.querySelector('img[data-mga-img]'), vid = slot.querySelector('video[data-mga-video]');
          image(state, img, init['background_image_' + n], s['background_image_' + n]);
          videoSrc(state, vid, init['video_url_' + n], s['video_url_' + n]);
          const hasImg = !!url(s['background_image_' + n], true), hasVid = !!video(s['video_url_' + n]);
          setHidden(img, !hasImg || hasVid); setHidden(vid, !hasVid);
          setAttr(slot, 'data-media', hasVid ? 'video' : hasImg ? 'image' : 'none');
          setAttr(img, 'alt', strip(s['alt_' + n]) || s['background_image_' + n]?.alt || '');
          setAttr(img, 'loading', bool(s.lazyload) ? 'lazy' : 'eager');
        }
      },
    },
    'gallery-interactive': {
      vars(s, c) {
        return {
          '--mga-bg': c(s.section_background_color, 'var(--color-background)'), '--mga-radius': px(s.gallery_wrap_border_radius), '--mga-shadow': SHADOWS[s.gallery_wrap_shadow] || 'none',
          '--mga-title-gap': px(s.vertical_space_title_subheading), '--mga-gallery-gap': px(s.vertical_space_subheading_gallery),
          '--mga-height-d': String(num(s.gallery_height_desktop, 70)), '--mga-height-m': String(num(s.gallery_height_mobile, 80)), '--mga-grow': String(num(s.expand_ratio, 7)), '--mga-item-gap': px(s.image_gap),
          ...spacing(s, {'--mga-pt-d': 'section_padding_top_desktop', '--mga-pb-d': 'section_padding_bottom_desktop', '--mga-pl-d': 'section_padding_left_desktop', '--mga-pr-d': 'section_padding_right_desktop', '--mga-mt-d': 'section_margin_top_desktop', '--mga-mb-d': 'section_margin_bottom_desktop', '--mga-pt-m': 'section_padding_top_mobile', '--mga-pb-m': 'section_padding_bottom_mobile', '--mga-pl-m': 'section_padding_left_mobile', '--mga-pr-m': 'section_padding_right_mobile', '--mga-mt-m': 'section_margin_top_mobile', '--mga-mb-m': 'section_margin_bottom_mobile'}),
        };
      },
      attrs(s) { return {'data-mga-width': s.section_width || 'full_width', 'data-mga-reset': String(bool(s.reset_spacing)), 'data-mga-show': show(s.display_section_on)}; },
      block(root, state, el, b, init, type) {
        if (type === 'gallery_image') {
          const img = el.querySelector('img[data-mga-img]');
          image(state, img, init.image, b.image);
          setHidden(img, !url(b.image, true)); setAttr(el, 'data-media', url(b.image, true) ? 'image' : 'none');
          const alt = strip(b.alt) || b.image?.alt || '';
          setAttr(img, 'alt', alt); setAttr(el, 'aria-label', alt || 'Gallery image ' + ([...root.querySelectorAll('[data-mga-type="gallery_image"]')].indexOf(el) + 1));
          return;
        }
        const heading = type === 'heading', own = bool(b.enable_custom_style), fonts = bool(b.enable_custom_fonts), text = el.querySelector('[data-mga-text]') || el;
        rich(state, text, heading ? init.title : init.text, heading ? b.title : b.text);
        setHidden(el, !strip(heading ? b.title : b.text));
        vars(el, {
          '--mga-color': own ? color(b.color, heading ? 'var(--color-heading)' : 'var(--color-text)') : heading ? 'var(--color-heading)' : 'var(--color-text)',
          '--mga-font': fonts ? font(b.font, heading ? 'var(--heading-font)' : 'var(--body-font)') : heading ? 'var(--heading-font)' : 'var(--body-font)',
          '--mga-weight': weight(b.font_weight, heading ? 'var(--heading-weight, 700)' : 'var(--body-weight, 400)'),
          '--mga-size-d': px(b.size_desktop), '--mga-size-m': px(b.size_mobile),
          ...(heading ? {} : {'--mga-pl-d': px(b.padding_left_desktop), '--mga-pr-d': px(b.padding_right_desktop), '--mga-pl-m': px(b.padding_left_mobile), '--mga-pr-m': px(b.padding_right_mobile)}),
        });
      },
      setup(root, state) {
        const items = () => [...root.querySelectorAll('[data-mga-item]')];
        const activate = item => { for (const it of items()) { const on = it === item && it.getAttribute('aria-expanded') !== 'true'; it.classList.toggle('is-active', on); it.setAttribute('aria-expanded', String(on)); } };
        state.on(root, 'click', e => { const item = e.target.closest('[data-mga-item]'); if (item && root.contains(item)) activate(item); });
        state.on(root, 'keydown', e => {
          const item = e.target.closest('[data-mga-item]'); if (!item || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
          const list = items(), i = list.indexOf(item), rtl = getComputedStyle(item).direction === 'rtl';
          const step = e.key === 'Home' ? -i : e.key === 'End' ? list.length - 1 - i : (e.key === 'ArrowRight') !== rtl ? 1 : -1;
          const next = list[Math.max(0, Math.min(list.length - 1, i + step))]; if (next && next !== item) { e.preventDefault(); next.focus(); }
        });
      },
    },
    'gallery-simple3': {
      vars(s, c, d) {
        return {
          '--mga-section-bg': c(s.section_bg, 'var(--color-background)'), '--mga-bg': c(s.background_color, 'var(--color-background)'),
          '--mga-heading-color': c(s.text_color, 'var(--color-heading)'), '--mga-text-color': c(s.text_color, 'var(--color-text)'),
          '--mga-heading-font': bool(s.enable_custom_fonts) ? font(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)',
          '--mga-heading-weight': weight(s.heading_font_weight, 'var(--heading-weight, 700)'), '--mga-heading-size-d': px(s.heading_size), '--mga-heading-size-m': px(s.heading_size_mobile, 28), '--mga-align': s.text_align || 'center',
          '--mga-max': bool(s.is_fullwidth) ? 'none' : maxWidth(s.container_max_width), '--mga-gap': px(s.gutter), '--mga-ratio': strip(s.img_proportion).replace('%', ''), '--mga-radius': px(s.image_border_radius),
          '--mga-cols-d': String(num(s.columns_desktop, 4)), '--mga-cols-m': String(num(s.columns_mobile, 2)),
          ...spacing(s, {'--mga-pt-d': 'section_padding_top', '--mga-pb-d': 'section_padding_bottom', '--mga-pl-d': 'section_padding_left_desktop', '--mga-pr-d': 'section_padding_right_desktop', '--mga-pt-m': 'section_padding_top_mobile', '--mga-pb-m': 'section_padding_bottom_mobile', '--mga-pl-m': 'section_padding_left_mobile', '--mga-pr-m': 'section_padding_right_mobile'}),
        };
      },
      attrs(s) { return {'data-mga-reset': String(bool(s.reset_spacing)), 'data-mga-hover': s.image_hover_animation || 'none'}; },
      section(root, state, s, init) {
        /* Legacy heading: only rendered when the section has no Heading block. */
        const h = root.querySelector('[data-mga-heading]');
        if (h) { rich(state, h, init.heading_text, s.heading_text); setHidden(h, !strip(s.heading_text)); }
        sync(state, root, 'class', strip(init.custom_class), strip(s.custom_class), v => {
          const tokens = x => String(x || '').split(/\s+/).filter(t => /^[\w-]+$/.test(t) && !t.startsWith('mga') && !t.startsWith('color-'));
          for (const cls of state.customClasses || tokens(init.custom_class)) root.classList.remove(cls);
          state.customClasses = tokens(v); root.classList.add(...state.customClasses);
        });
      },
      block(root, state, el, b, init, type) {
        if (type === 'heading' || type === 'subheading') {
          /* Header blocks: text, then their own overrides as inline variables
             over the section's (removed again when switched off). */
          const heading = type === 'heading', own = bool(b.enable_custom_style), size = bool(b.size_enable), f = bool(b.enable_custom_fonts) ? font(b.font, '') : '';
          rich(state, el, init.text, b.text); setHidden(el, !strip(b.text));
          const ink = own ? color(b.color, '') : '';
          overrides(el, heading ? {
            '--mga-heading-color': ink || null, '--mga-heading-font': f || null,
            '--mga-heading-size-d': size ? px(b.size_desktop, 35) : null, '--mga-heading-size-m': size ? px(b.size_mobile, 28) : null,
          } : {'--mga-sub-color': ink || null, '--mga-sub-font': f || null, '--mga-sub-size': size ? px(b.size, 16) : null});
          return;
        }
        const img = el.querySelector('img[data-mga-img]'), a = el.querySelector('[data-mga-link]'), label = el.querySelector('[data-mga-label]'), s = state.s, custom = bool(s.enable_custom_style);
        image(state, img, init.background_image, b.background_image);
        const hasImg = !!url(b.background_image, true); setHidden(img, !hasImg); setAttr(el.querySelector('[data-mga-media]'), 'data-media', hasImg ? 'image' : 'none');
        setAttr(img, 'alt', strip(b.alt) || b.background_image?.alt || '');
        setAttr(img, 'loading', bool(s.lazyload) ? 'lazy' : 'eager');
        link(a, url(b.gallery_link_url));
        if (label && label.textContent !== String(b.gallery_link_label || '')) label.textContent = String(b.gallery_link_label || '');
        setHidden(label, !strip(b.gallery_link_label));
        const ink = custom ? color(s.button_text_color, '') : '';
        if (label) { if (ink) setVar(label, '--mb-text', ink); else if (label.style.getPropertyValue('--mb-text')) label.style.removeProperty('--mb-text'); }
      },
    },
  };

  function paint(root, state) {
    if (!api()) return;
    if (state.raw !== root.dataset.mgaSettings) { state.raw = root.dataset.mgaSettings; state.init = {...state.defaults, ...parse(state.raw)}; state.edits = {}; state.s = {...state.init}; }
    const T = TYPES[root.dataset.mgaType], s = state.s, custom = bool(s.enable_custom_style), c = (v, f) => custom ? color(v, f) : f;
    scheme(root, s);
    for (const [k, v] of Object.entries(T.attrs(s))) setAttr(root, k, v);
    vars(root, T.vars(s, c));
    if ('custom_css' in s) customCss(root, s.custom_css);
    if (T.section) T.section(root, state, s, state.init);
    if (T.block) for (const el of root.querySelectorAll('[data-mga-block]')) {
      const id = el.dataset.mgaBlock, type = el.dataset.mgaType;
      if (state.rawBlocks.get(el) !== el.dataset.mgaSettings) { state.rawBlocks.set(el, el.dataset.mgaSettings); if (state.blockInit.has(id)) state.blockEdits.delete(id); state.blockInit.set(id, {...state.blockDefaults[type], ...parse(el.dataset.mgaSettings)}); }
      const init = state.blockInit.get(id);
      T.block(root, state, el, {...init, ...state.blockEdits.get(id)}, init, type);
    }
    videos(root, state);
  }

  let listeners = 0;
  function add(root) {
    const T = TYPES[root.dataset.mgaType]; if (!T) return;
    const state = {
      defaults: parse(root.dataset.mgaDefaults), blockDefaults: parse(root.dataset.mgaBlockDefaults), edits: {}, blockEdits: new Map(), blockInit: new Map(), rawBlocks: new WeakMap(),
      memo: new WeakMap(), visible: true, reduced: matchMedia('(prefers-reduced-motion: reduce)'), desktop: matchMedia(DESKTOP), off: [],
    };
    state.raw = root.dataset.mgaSettings; state.init = {...state.defaults, ...parse(state.raw)}; state.s = {...state.init};
    state.schedule = () => { if (!state.frame) state.frame = requestAnimationFrame(() => { state.frame = 0; if (root.isConnected) paint(root, state); }); };
    state.on = (el, name, fn, opts) => { el.addEventListener(name, fn, opts); listeners++; state.off.push(() => { el.removeEventListener(name, fn, opts); listeners--; }); };
    state.on(state.reduced, 'change', state.schedule);
    if ('IntersectionObserver' in window) { state.io = new IntersectionObserver(entries => { const v = entries[entries.length - 1].isIntersecting; if (v !== state.visible) { state.visible = v; state.schedule(); } }); state.io.observe(root); }
    if (T.setup) T.setup(root, state);
    roots.set(root, state);
    state.schedule();
  }
  function remove(root, state) { cancelAnimationFrame(state.frame); state.io?.disconnect(); for (const off of state.off) off(); for (const v of root.querySelectorAll('video')) { try { v.pause(); } catch (_) {} } roots.delete(root); }
  function scan() {
    for (const [root, state] of roots) if (!root.isConnected) remove(root, state);
    for (const root of document.querySelectorAll('[data-mga-section]')) { if (roots.has(root)) roots.get(root).schedule(); else add(root); }
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id ?? v.sectionId ?? '' : v ?? '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section ?? d.sectionId ?? d.section_id); if (!id || !d.settings) return;
    const blk = d.block ?? d.blockId ?? d.block_id, key = blk ? String(typeof blk === 'object' ? blk.id : blk) : '';
    for (const [root, state] of roots) {
      if (root.dataset.mgaSection !== id) continue;
      if (key) state.blockEdits.set(key, {...state.blockEdits.get(key), ...d.settings});
      else { Object.assign(state.edits, d.settings); Object.assign(state.s, d.settings); }
      state.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const state of roots.values()) state.schedule(); });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load', 'shopify:section:unload']) document.addEventListener(name, () => queueMicrotask(scan));
  const watched = '[data-mga-section],[data-mga-block]';
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(watched) || n.querySelector(watched))))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-mga-settings']});
  window.MateriaGalleriesA = {scan, stats: () => ({roots: roots.size, listeners})};
  scan();
})();
