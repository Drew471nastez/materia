/* Materia Themes. Text Columns and Sticky Heading Text.

   Two jobs, both per section and only where one of the two is on the page:

   1. The swipe row of Text Columns on a phone. The row is a native scroller
      (overflow-x with scroll snap), so the finger moves it and nothing here
      listens to touch. The arrows and the arrow keys call scrollBy, and a
      passive scroll listener, read once per frame, switches the arrows off
      at each end.

   2. Live paint in the builder. Each section prints its values as CSS
      variables and data attributes for the first paint; this file works out
      the same ones (same names, same fallbacks) when a setting changes, for
      that section only, at most once per frame, and writes only what
      changed. A page drawn for a visitor carries no settings, so nothing is
      painted there. */
(() => {
  if (window.MateriaLiveR7Text) return;
  const SEL = '[data-r7t]';
  const roots = new Map();
  const api = () => window.MateriaHeroImageOne;
  const parse = v => { try { return JSON.parse(v || '{}'); } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, f = 0) => v != null && v !== '' && Number.isFinite(+v) ? +v : f;
  const px = (v, f = 0) => num(v, f) + 'px';
  const color = (v, f) => api()?.color(v, f) || f;
  const font = (v, f) => api()?.font(v) || f;
  const href = v => api()?.url(v) || '';
  const set = (el, p, v) => { if (el && el.style.getPropertyValue(p) !== String(v)) el.style.setProperty(p, v); };
  const unset = (el, p) => { if (el && el.style.getPropertyValue(p)) el.style.removeProperty(p); };
  /* A value while its switch is on, nothing (the stylesheet's fallback) while it is off. */
  const put = (el, p, v) => { if (v === '' || v == null) unset(el, p); else set(el, p, v); };
  const text = (el, v) => { if (el && el.textContent !== String(v ?? '')) el.textContent = v ?? ''; };
  const hide = (el, on) => { if (el && el.hidden !== !!on) el.hidden = !!on; };
  const flag = (el, name, on) => { if (el && el.hasAttribute(name) !== !!on) el.toggleAttribute(name, !!on); };
  const attr = (el, name, v) => { if (el && el.getAttribute(name) !== String(v)) el.setAttribute(name, v); };
  /* Theme settings > Typography and Buttons win with !important unless an element opts out (snippets/theme-controls). */
  const own = (el, kind, on) => flag(el, 'data-own-' + kind, on);
  const rich = (el, value, state) => { if (el && api()) api().rich(el, value ?? '', state); };
  const scheme = (root, s) => { const id = s.color_scheme?.id || s.color_scheme; if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || root.classList.contains('color-' + id)) return; for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c); root.classList.add('color-' + id); };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const WIDTHS = {container: ['calc(var(--page-width, 1300px) + 48px)', '24px'], stretch_width: ['none', '30px'], full_width: ['none', 'max(24px, 4vw)']};
  const FLUID = ['calc(var(--fluid-container-width, 1500px) + 48px)', '24px'];

  /* ------------------------------------------------------------ live paint */
  /* What both sections share: scheme, margins, width, padding, background, fonts, text and link colours. */
  function common(root, s) {
    const custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts), wrapper = root.closest('.shopify-section');
    scheme(root, s);
    if (wrapper) {
      const reset = bool(s.reset_spacing);
      for (const [v, id] of [['mt-m', 'section_margin_top_mobile'], ['mb-m', 'section_margin_bottom_mobile'], ['mt-d', 'section_margin_top_desktop'], ['mb-d', 'section_margin_bottom_desktop']]) set(wrapper, '--r7t-' + v, reset ? '0px' : px(s[id]));
      set(wrapper, '--r7t-mobile-display', s.show_on_mobile === false || s.show_on_mobile === 'false' ? 'none' : 'block');
    }
    const [max, pad] = WIDTHS[s.section_width] || FLUID;
    const vars = {
      '--r7t-bg': custom ? color(s.section_bg, 'var(--color-background)') : 'var(--color-background)',
      '--r7t-link-ink': custom ? color(s.link_color, 'var(--color-link, var(--color-heading))') : 'var(--color-link, var(--color-heading))',
      '--r7t-heading-font': fonts ? font(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)',
      '--r7t-body-font': fonts ? font(s.body_font, 'var(--body-font)') : 'var(--body-font)',
      '--r7t-max': max, '--r7t-pad-wide': pad,
      '--r7t-pt-d': px(s.padding_top), '--r7t-pb-d': px(s.padding_bottom), '--r7t-pt-m': px(s.padding_top_mobile), '--r7t-pb-m': px(s.padding_bottom_mobile),
    };
    for (const [p, v] of Object.entries(vars)) set(root, p, v);
    /* Only while it is custom: bold words then follow it instead of the theme's heading colour. */
    put(root, '--r7t-text-ink', custom ? color(s.text_color, '') : '');
    own(root, 'font', fonts);
    flag(root, 'data-ti-no-reveal', !bool(s.reveal));
    return {custom, fonts};
  }

  /* The eyebrow, heading, subheading and button blocks (snippets/r7-text-header). */
  function header(el, b, type, fonts, state) {
    const custom = bool(b.enable_custom_style), ownFont = bool(b.enable_custom_fonts), weight = bool(b.weight_enable), size = bool(b.size_enable);
    if (type === 'eyebrow') {
      text(el, b.text); hide(el, !b.text);
      put(el, '--hb-c', custom ? color(b.color, 'var(--color-text)') : '');
    } else if (type === 'heading' || type === 'subheading') {
      const heading = type === 'heading';
      rich(el, b.text, state); hide(el, !b.text);
      put(el, '--hb-c', custom ? color(b.color, heading ? 'var(--color-heading)' : 'var(--color-text)') : '');
      put(el, '--hb-fw', weight ? String(b.weight || (heading ? 700 : 400)) : '');
      if (heading) { put(el, '--hb-fs-d', size ? px(b.size_desktop, 40) : ''); put(el, '--hb-fs-m', size ? px(b.size_mobile, 30) : ''); put(el, '--hb-ls', size ? px(b.tracking) : ''); }
      else put(el, '--hb-fs', size ? px(b.size, 17) : '');
      put(el, '--hb-lh', size ? String(num(b.line_height, heading ? 1.15 : 1.6)) : '');
      put(el, '--hb-ff', ownFont ? font(b.font, '') : '');
      own(el, 'font', fonts || ownFont); own(el, 'weight', weight); own(el, 'size', size);
    } else if (type === 'button') {
      let btn = el.querySelector('[data-r7t-btn]');
      if (!btn) return;
      hide(el, !b.label);
      /* A button with a link is a link; without one it is a button. */
      const url = href(b.link), tag = url ? 'A' : 'BUTTON';
      if (btn.tagName !== tag) {
        const next = document.createElement(tag);
        for (const a of [...btn.attributes]) if (a.name !== 'href' && a.name !== 'type') next.setAttribute(a.name, a.value);
        if (tag === 'BUTTON') next.type = 'button';
        next.textContent = btn.textContent;
        btn.replaceWith(next); btn = next;
      }
      if (url) attr(btn, 'href', url);
      text(btn, b.label);
      attr(btn, 'data-theme-button', b.style === 'secondary' ? 'secondary' : 'primary');
      const bg = custom ? color(b.bg_color, '') : '', hoverBg = custom ? color(b.bg_color_hover, '') : '';
      put(btn, '--mb-bg', bg); put(btn, '--mb-text', custom ? color(b.text_color, '') : '');
      put(btn, '--mb-border', custom ? color(b.border_color, '') || bg : '');
      put(btn, '--mb-hover-bg', hoverBg); put(btn, '--mb-hover-border', hoverBg); put(btn, '--mb-hover-text', custom ? color(b.text_color_hover, '') : '');
      const shape = b.use_theme_button === false || b.use_theme_button === 'false';
      put(btn, '--mb-radius', shape ? px(b.radius) : ''); put(btn, '--mb-padding-x', shape ? px(b.pad_x, 28) : ''); put(btn, '--mb-padding-y', shape ? px(b.pad_y, 14) : ''); put(btn, '--mb-font-size', shape ? px(b.size, 16) : '');
      own(btn, 'shape', shape);
    }
  }
  /* A Column or a Text block: small label (columns only), heading, text and link. */
  function item(el, b, state) {
    const label = el.querySelector('[data-r7t-label]'), title = el.querySelector('[data-r7t-title]'), body = el.querySelector('[data-r7t-text]'), link = el.querySelector('[data-r7t-link]');
    if (label) { text(label, b.label); hide(label, !b.label); }
    if (title) { rich(title, b.heading, state); hide(title, !b.heading); }
    if (body) { rich(body, b.text, state); hide(body, !b.text); }
    if (link) {
      text(link, b.link_label); hide(link, !b.link_label);
      const url = href(b.link);
      if (url) attr(link, 'href', url); else if (link.hasAttribute('href')) link.removeAttribute('href');
    }
  }
  function blocks(root, state, fonts) {
    for (const el of root.querySelectorAll('[data-r7t-block]')) {
      if (el.closest(SEL) !== root) continue;
      const b = state.blocks.get(el.dataset.r7tBlock), type = el.dataset.r7tType;
      if (!b) continue;
      if (type === 'column' || type === 'text') item(el, b, state); else header(el, b, type, fonts, state);
    }
  }

  function textColumns(root, state) {
    const s = state.s, {custom, fonts} = common(root, s), center = s.content_alignment === 'center';
    const colsD = Math.min(4, Math.max(2, num(s.columns_desktop, 3))), colsT = Math.min(3, Math.max(1, num(s.columns_tablet, 2)));
    const vars = {
      '--txc-label-ink': custom ? color(s.label_color, 'var(--color-text)') : 'var(--color-text)',
      '--txc-title-ink': custom ? color(s.item_heading_color, 'var(--color-heading)') : 'var(--color-heading)',
      '--txc-divider': custom ? color(s.divider_color, 'var(--color-border)') : 'var(--color-border)',
      '--r7t-align': center ? 'center' : 'left', '--r7t-items': center ? 'center' : 'flex-start',
      '--txc-cols-d': String(colsD), '--txc-cols-t': String(colsT),
      '--txc-gap': px(s.column_gap, 48), '--txc-header-gap': px(s.header_gap, 48),
      '--txc-title-d': px(s.item_heading_size, 22), '--txc-title-m': px(s.item_heading_size_mobile, 20),
    };
    for (const [p, v] of Object.entries(vars)) set(root, p, v);
    attr(root, 'data-cols-d', colsD); attr(root, 'data-cols-t', colsT);
    attr(root, 'data-dividers', bool(s.show_dividers)); attr(root, 'data-arrows', bool(s.show_arrows));
    /* One column alone has nothing to swipe to. */
    attr(root, 'data-mobile', s.mobile_layout === 'swipe' && root.querySelectorAll('[data-r7t-track] > [data-r7t-block]').length > 1 ? 'swipe' : 'stack');
    attr(root, 'data-align', center ? 'center' : 'left');
    blocks(root, state, fonts);
    state.measure?.();
  }

  function stickyHeadingText(root, state) {
    const s = state.s, {custom, fonts} = common(root, s), right = s.heading_position === 'right';
    const head = Math.min(50, Math.max(30, num(s.heading_width, 40))), a = 'minmax(0, ' + head + 'fr)', b = 'minmax(0, ' + (100 - head) + 'fr)';
    const vars = {
      '--sht-num-ink': custom ? color(s.number_color, 'var(--color-text)') : 'var(--color-text)',
      '--sht-title-ink': custom ? color(s.item_heading_color, 'var(--color-heading)') : 'var(--color-heading)',
      '--sht-divider': custom ? color(s.divider_color, 'var(--color-border)') : 'var(--color-border)',
      '--sht-cols': right ? b + ' ' + a : a + ' ' + b,
      '--sht-col-gap': px(s.column_gap, 80), '--sht-offset': px(s.sticky_offset, 32), '--sht-item-gap': px(s.item_gap, 32),
      '--sht-title-d': px(s.item_heading_size, 24), '--sht-title-m': px(s.item_heading_size_mobile, 20),
    };
    for (const [p, v] of Object.entries(vars)) set(root, p, v);
    attr(root, 'data-side', right ? 'right' : 'left'); attr(root, 'data-sticky', bool(s.sticky));
    attr(root, 'data-dividers', bool(s.show_dividers)); attr(root, 'data-numbers', bool(s.show_numbers));
    blocks(root, state, fonts);
  }
  const paints = {'text-columns': textColumns, 'sticky-heading-text': stickyHeadingText};

  /* ------------------------------------------------------------ the swipe row */
  function scroller(root, state) {
    const track = root.querySelector('[data-r7t-track]'), nav = root.querySelector('[data-r7t-nav]'), prev = root.querySelector('[data-r7t-prev]'), next = root.querySelector('[data-r7t-next]');
    if (!track) return;
    const signal = state.abort.signal;
    const rtl = () => getComputedStyle(track).direction === 'rtl' ? -1 : 1;
    /* One column and the space after it. */
    const step = () => { const cols = track.querySelectorAll(':scope > [data-r7t-block]'); return cols.length > 1 ? Math.abs(cols[1].offsetLeft - cols[0].offsetLeft) : track.clientWidth; };
    const move = dir => track.scrollBy({left: dir * rtl() * step(), behavior: reduced.matches ? 'auto' : 'smooth'});
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (!track.isConnected) return;
      const max = track.scrollWidth - track.clientWidth, x = Math.abs(track.scrollLeft), slides = max > 2;
      /* Arrows that are not shown (a desktop, stacked columns, Show arrows off) stay as they were drawn. */
      const shown = !!nav && nav.getClientRects().length > 0;
      const atStart = !shown || !slides || x <= 2, atEnd = shown && (!slides || x >= max - 2);
      /* An arrow about to switch off hands the keyboard to the other one. */
      if (shown && prev && next) {
        if (atEnd && !atStart && document.activeElement === next) prev.disabled = false, prev.focus({preventScroll: true});
        if (atStart && !atEnd && document.activeElement === prev) next.disabled = false, next.focus({preventScroll: true});
      }
      if (prev && prev.disabled !== atStart) prev.disabled = atStart;
      if (next && next.disabled !== atEnd) next.disabled = atEnd;
      /* The row takes the keyboard only while it really scrolls (a phone with Swipe on). */
      if (slides) { attr(track, 'tabindex', '0'); attr(track, 'role', 'group'); const name = root.querySelector('[data-r7t-type="heading"]')?.textContent.trim(); if (name) attr(track, 'aria-label', name); }
      else for (const n of ['tabindex', 'role', 'aria-label']) if (track.hasAttribute(n)) track.removeAttribute(n);
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(measure); };
    state.measure = queue;
    state.stop = () => cancelAnimationFrame(frame);
    track.addEventListener('scroll', queue, {passive: true, signal});
    track.addEventListener('keydown', event => {
      if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey) return;
      const dir = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!dir || track.scrollWidth - track.clientWidth <= 2) return;
      event.preventDefault(); move(dir * rtl());
    }, {signal});
    prev?.addEventListener('click', () => move(-1), {signal});
    next?.addEventListener('click', () => move(1), {signal});
    state.resize = new ResizeObserver(queue);
    state.resize.observe(track);
    queue();
  }

  /* ------------------------------------------------------------ lifecycle */
  function read(root, state) {
    if (state.raw !== root.dataset.r7tSettings) { state.raw = root.dataset.r7tSettings; state.s = parse(state.raw); }
    for (const el of root.querySelectorAll('[data-r7t-block][data-r7t-settings]')) {
      if (el.closest(SEL) !== root) continue;
      const id = el.dataset.r7tBlock;
      if (state.rawBlocks.get(id) !== el.dataset.r7tSettings) { state.rawBlocks.set(id, el.dataset.r7tSettings); state.blocks.set(id, parse(el.dataset.r7tSettings)); }
    }
  }
  /* What the page was drawn with is already in the markup: rich text is replaced only once its value differs. */
  function prime(root, state) {
    for (const el of root.querySelectorAll('[data-r7t-block]')) {
      const b = state.blocks.get(el.dataset.r7tBlock), type = el.dataset.r7tType;
      if (!b) continue;
      if (type === 'heading' || type === 'subheading') state.rich.set(el, b.text ?? '');
      else if (type === 'column' || type === 'text') { const title = el.querySelector('[data-r7t-title]'), body = el.querySelector('[data-r7t-text]'); if (title) state.rich.set(title, b.heading ?? ''); if (body) state.rich.set(body, b.text ?? ''); }
    }
  }
  function drop(root, state) {
    state.abort.abort(); state.resize?.disconnect(); state.stop?.(); cancelAnimationFrame(state.frame); roots.delete(root);
  }
  function scan() {
    for (const [root, state] of roots) if (!root.isConnected) drop(root, state);
    document.querySelectorAll(SEL).forEach(root => {
      if (roots.has(root)) { roots.get(root).schedule(); return; }
      const state = {s: {}, blocks: new Map(), rawBlocks: new Map(), rich: new WeakMap(), frame: 0, abort: new AbortController()};
      /* Only a section the builder drew carries its settings. */
      state.live = root.hasAttribute('data-r7t-settings');
      state.schedule = () => { if (state.live && !state.frame) state.frame = requestAnimationFrame(() => { state.frame = 0; if (!root.isConnected || !api()) return; read(root, state); paints[root.dataset.r7t]?.(root, state); }); };
      roots.set(root, state);
      if (root.dataset.r7t === 'text-columns') scroller(root, state);
      if (state.live) { read(root, state); prime(root, state); state.schedule(); }
    });
  }
  const sectionOf = d => String(d?.id ?? d ?? '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', event => {
    const d = event.detail || {}, id = sectionOf(d.section || d.sectionId), block = d.block || d.blockId || d.block_id;
    if (!id || !d.settings) return;
    for (const [root, state] of roots) {
      if (root.dataset.r7tSection !== id || !state.live) continue;
      if (block) { const key = String(block.id || block); state.blocks.set(key, {...state.blocks.get(key), ...d.settings}); }
      else Object.assign(state.s, d.settings);
      state.schedule();
    }
  });
  /* Sections come and go only in the builder: the page is watched there, and never on a visitor's page. */
  let watching = false;
  function watch() {
    if (watching) return;
    watching = true;
    new MutationObserver(records => {
      if (records.some(r => r.type === 'attributes' ? r.target.matches?.(SEL + ', ' + SEL + ' [data-r7t-block]') : [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))))) scan();
    }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-r7t-settings']});
  }
  const builder = () => !!window.Shopify?.designMode || document.documentElement.classList.contains('shopify-design-mode') || !!document.querySelector('[data-r7t-settings]');
  document.addEventListener('DOMContentLoaded', () => { if (builder()) watch(); scan(); });
  ['storelib:section-load', 'shopify:section:load'].forEach(name => document.addEventListener(name, () => { watch(); scan(); }));
  document.addEventListener('storelib:settings-change', watch, {once: true});
  window.MateriaLiveR7Text = {scan, count: () => roots.size, watching: () => watching};
  if (builder()) watch();
  scan();
})();
