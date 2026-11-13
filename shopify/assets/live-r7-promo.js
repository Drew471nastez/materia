/* Materia Themes. Announcement Code Bar and Product Drop Countdown.

   Only where one of the two is on the page ([data-r7p] roots), per section:

   1. The code bar's copy button. A tap copies the code (the Clipboard API,
      or the old copy command where that is missing), shows the "copied"
      words on the chip for two seconds and says the same in a polite status
      line for screen readers. When the browser copies nothing, the code is
      selected so the visitor can copy it by hand.

   2. The product drop timer. One per section, counting to the moment the
      section prints (data-end, data-tz: a UTC offset or "visitor" for each
      visitor's own clock). It ticks at most once a second, on the second,
      only while its section is on screen and the tab is visible, and shows
      the right time at once when it comes back. It writes data-state
      (unset, running, ended) on the root; the section's CSS does the rest
      (the on sale message, the sale label, hiding the section).

   3. Live paint in the builder. Each section prints its values as CSS
      variables and data attributes for the first paint; this file works out
      the same ones (same names, same fallbacks) when a setting changes, for
      that section only, at most once per frame, and writes only what
      changed. A page drawn for a visitor carries no settings, so nothing is
      painted there. A new product needs the builder's redraw. */
(() => {
  if (window.MateriaLiveR7Promo) return;
  const SEL = '[data-r7p]';
  const roots = new Map();
  const api = () => window.MateriaHeroImageOne;
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
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
  const pad = n => (n < 10 ? '0' : '') + n;

  /* ------------------------------------------------------------ the moment */
  /* 2026-12-31, 2026-12-31T18:00 or 2026-12-31T18:00:00, optionally with its own offset (Z, +02:00).
     Without one, the picked offset; with "visitor", the visitor's own clock. Impossible dates are no date. */
  function moment(raw, tz) {
    let v = String(raw ?? '').trim().replace(' ', 'T');
    if (v.length === 10) v += 'T00:00:00'; else if (v.length === 16) v += ':00';
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z|[+-]\d{2}:?\d{2})?$/.exec(v);
    if (!m) return NaN;
    const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
    if (mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate() || h > 23 || mi > 59 || s > 59) return NaN;
    let off = m[7] || (tz && tz !== 'visitor' ? tz : '');
    if (!off) return new Date(y, mo - 1, d, h, mi, s).getTime();
    if (off === 'Z') off = '+00:00';
    const o = /^([+-])(\d{2}):?(\d{2})$/.exec(off);
    if (!o) return NaN;
    return Date.UTC(y, mo - 1, d, h, mi, s) - (o[1] === '-' ? -1 : 1) * (+o[2] * 60 + +o[3]) * 60000;
  }

  /* ------------------------------------------------------------ the timer */
  function tick(state) {
    clearTimeout(state.timer); state.timer = 0;
    const root = state.root;
    if (!root.isConnected) return;
    const now = Date.now(), end = state.end;
    let left = 0, phase = 'unset';
    if (Number.isFinite(end)) { left = Math.max(0, Math.floor((end - now) / 1000)); phase = left > 0 ? 'running' : 'ended'; }
    const parts = {d: Math.floor(left / 86400), h: Math.floor(left % 86400 / 3600), m: Math.floor(left % 3600 / 60), s: left % 60};
    for (const el of root.querySelectorAll('[data-r7p-unit]')) if (el.closest(SEL) === root) text(el, pad(parts[el.dataset.r7pUnit]));
    attr(root, 'data-state', phase);
    state.ticks++;
    if (phase === 'running' && state.visible && !document.hidden) state.timer = setTimeout(() => tick(state), 1000 - (Date.now() % 1000) + 8);
  }
  const running = state => { if (state.visible && !document.hidden) { if (!state.timer) tick(state); } else { clearTimeout(state.timer); state.timer = 0; } };
  function clock(root, state) {
    const key = (root.dataset.end || '') + '|' + (root.dataset.tz || '');
    if (state.clockKey === key) return;
    state.clockKey = key;
    state.end = moment(root.dataset.end, root.dataset.tz);
    tick(state);
  }

  /* ------------------------------------------------------------ copying a code */
  function copyText(value) {
    if (navigator.clipboard?.writeText && window.isSecureContext !== false) return navigator.clipboard.writeText(value).catch(() => fallback(value));
    return fallback(value);
  }
  function fallback(value) {
    return new Promise((resolve, reject) => {
      const area = document.createElement('textarea');
      area.value = value; area.setAttribute('readonly', ''); area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.append(area); area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      area.remove();
      if (ok) resolve(); else reject(new Error('copy'));
    });
  }
  function copier(root, state) {
    root.addEventListener('click', event => {
      const btn = event.target.closest('[data-r7p-copy]');
      if (!btn || btn.closest(SEL) !== root) return;
      const code = btn.dataset.code;
      if (!code) return;
      const status = btn.parentElement.querySelector('[data-r7p-status]'), done = btn.querySelector('[data-r7p-done]');
      copyText(code).then(() => {
        btn.setAttribute('data-copied', '');
        text(status, (done?.textContent.trim() || 'Copied') + ': ' + code);
        clearTimeout(state.copied.get(btn));
        state.copied.set(btn, setTimeout(() => { btn.removeAttribute('data-copied'); text(status, ''); state.copied.delete(btn); }, 2000));
      }, () => {
        /* Nothing was copied: select the code so it can be copied by hand. */
        const value = btn.querySelector('[data-r7p-code]'), range = document.createRange(), selection = getSelection();
        if (!value || !selection) return;
        range.selectNodeContents(value); selection.removeAllRanges(); selection.addRange(range);
      });
    }, {signal: state.abort.signal});
  }

  /* ------------------------------------------------------------ live paint */
  /* What both sections share: scheme, margins (on the section wrapper), width, visibility, reveal. */
  function common(root, s, prefix) {
    scheme(root, s);
    const wrapper = root.closest('.shopify-section'), reset = bool(s.reset_spacing);
    if (wrapper) for (const [v, id] of [['mt-m', 'section_margin_top_mobile'], ['mb-m', 'section_margin_bottom_mobile'], ['mt-d', 'section_margin_top_desktop'], ['mb-d', 'section_margin_bottom_desktop']]) set(wrapper, '--' + prefix + '-' + v, reset ? '0px' : px(s[id]));
    attr(root, 'data-reset', reset);
    attr(root, 'data-show', s.show_section_on || 'all');
    own(root, 'font', bool(s.enable_custom_fonts));
    flag(root, 'data-ti-no-reveal', !bool(s.reveal));
  }

  function codeBar(root, state) {
    const s = state.s, custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
    common(root, s, 'acb');
    attr(root, 'data-width', s.section_width || 'full_width');
    attr(root, 'data-align', s.content_alignment === 'left' ? 'left' : 'center');
    const vars = {
      '--acb-bg': custom ? color(s.background_color, 'var(--color-background)') : 'var(--color-background)',
      '--acb-text': custom ? color(s.text_color, 'var(--color-text)') : 'var(--color-text)',
      '--acb-line': custom ? color(s.line_color, 'var(--color-border)') : 'var(--color-border)',
      '--acb-lw': bool(s.show_separator_line) ? '1px' : '0px',
      '--acb-ff': fonts ? font(s.body_font, 'var(--body-font)') : 'var(--body-font)',
      '--acb-fs-d': px(s.font_size, 14), '--acb-fs-m': px(s.mobile_font_size, 13),
      '--acb-pt-d': px(s.padding_top), '--acb-pb-d': px(s.padding_bottom), '--acb-pt-m': px(s.padding_top_mobile), '--acb-pb-m': px(s.padding_bottom_mobile),
    };
    for (const [p, v] of Object.entries(vars)) set(root, p, v);
    for (const {el, type, b} of blocksOf(root, state)) {
      const mine = bool(b.enable_custom_style);
      if (type === 'message') {
        rich(el, b.text, state); hide(el, !b.text);
        put(el, '--b-c', mine ? color(b.color, 'var(--acb-text)') : '');
        put(el, '--b-f', bool(b.enable_custom_fonts) ? font(b.font, '') : '');
        own(el, 'font', bool(b.enable_custom_fonts));
      } else if (type === 'code') {
        const btn = el.querySelector('[data-r7p-copy]'), code = String(b.code ?? '').trim();
        if (!btn) continue;
        attr(btn, 'data-code', code);
        flag(btn, 'data-empty', !code);
        attr(btn, 'aria-label', code ? (b.copy_label || 'Copy code') + ': ' + code : 'No code set yet');
        text(btn.querySelector('[data-r7p-code]'), code || 'Add a code');
        text(btn.querySelector('[data-r7p-done]'), b.copied_text || 'Copied');
        set(el, '--acb-chip-bg', mine ? color(b.bg_color, 'transparent') : 'transparent');
        set(el, '--acb-chip-hover', mine ? color(b.bg_color, 'color-mix(in srgb, currentColor 8%, transparent)') : 'color-mix(in srgb, currentColor 8%, transparent)');
        set(el, '--acb-chip-text', mine ? color(b.text_color, 'var(--color-heading)') : 'var(--color-heading)');
        set(el, '--acb-chip-line', mine ? color(b.border_color, 'currentColor') : 'currentColor');
      } else if (type === 'link') {
        text(el, b.label); hide(el, !b.label);
        const url = href(b.link);
        if (url) attr(el, 'href', url); else if (el.hasAttribute('href')) el.removeAttribute('href');
        put(el, '--b-c', mine ? color(b.color, 'var(--acb-text)') : '');
      }
    }
  }

  const WIDTH = {container: 'calc(var(--page-width, 1300px) + 48px)', fluid_container: 'calc(var(--fluid-container-width, 1500px) + 48px)'};
  function productDrop(root, state) {
    const s = state.s, custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
    common(root, s, 'pdc');
    const c = (id, f) => custom ? color(s[id], f) : f;
    const card = 'color-mix(in srgb, var(--color-text) 8%, var(--color-background))';
    const vars = {
      '--pdc-bg': c('section_bg', 'var(--color-background)'), '--pdc-card': c('card_bg', card),
      '--pdc-digit': c('digit_color', 'var(--color-heading)'), '--pdc-digit-bg': c('digit_bg', 'transparent'),
      '--pdc-label': c('label_color', 'var(--color-text)'), '--pdc-line': c('line_color', 'var(--color-border)'), '--pdc-price': c('price_color', 'var(--color-text)'),
      '--pdc-heading-font': fonts ? font(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)',
      '--pdc-body-font': fonts ? font(s.body_font, 'var(--body-font)') : 'var(--body-font)',
      '--pdc-max': WIDTH[s.section_width] || 'none', '--pdc-pad': s.section_width === 'full_width' ? 'max(20px, 4vw)' : '20px',
      '--pdc-ds-d': px(s.digit_size_desktop, 44), '--pdc-ds-m': px(s.digit_size_mobile, 30),
      '--pdc-pt-d': px(s.padding_top_desktop), '--pdc-pb-d': px(s.padding_bottom_desktop), '--pdc-pt-m': px(s.padding_top_mobile), '--pdc-pb-m': px(s.padding_bottom_mobile),
    };
    for (const [p, v] of Object.entries(vars)) set(root, p, v);
    attr(root, 'data-side', s.image_position === 'right' ? 'right' : 'left');
    attr(root, 'data-after', s.after_end === 'hide' ? 'hide' : 'live');
    attr(root, 'data-end', s.end_iso ?? '');
    attr(root, 'data-tz', s.time_zone || 'visitor');
    for (const el of root.querySelectorAll('[data-r7p-ended]')) if (el.closest(SEL) === root) text(el, s.expired_message);
    for (const {el, type, b} of blocksOf(root, state)) {
      const mine = bool(b.enable_custom_style), ownFont = bool(b.enable_custom_fonts);
      if (type === 'heading' || type === 'text') {
        const heading = type === 'heading';
        rich(el, b.text, state); hide(el, !b.text);
        put(el, '--hb-c', mine ? color(b.color, heading ? 'var(--color-heading)' : 'var(--color-text)') : '');
        put(el, '--hb-ff', ownFont ? font(b.font, '') : '');
        if (heading) { const size = bool(b.size_enable); put(el, '--hb-fs-d', size ? px(b.size_desktop, 40) : ''); put(el, '--hb-fs-m', size ? px(b.size_mobile, 28) : ''); }
        own(el, 'font', fonts || ownFont);
      } else if (type === 'timer') {
        for (const [unit, id] of [['d', 'label_days'], ['h', 'label_hours'], ['m', 'label_minutes'], ['s', 'label_seconds']]) text(el.querySelector('[data-r7p-label="' + unit + '"]'), b[id]);
        hide(el.querySelector('[data-r7p-seconds]'), !bool(b.show_seconds));
      } else if (type === 'button') {
        let btn = el.querySelector('[data-r7p-btn]');
        if (!btn) continue;
        hide(el, !b.label && !b.live_label);
        text(btn.querySelector('[data-r7p-before]'), b.label);
        text(btn.querySelector('[data-r7p-after]'), b.live_label);
        /* A button with a link (its own, or the product's page) is a link; without one it is a button. */
        const url = href(b.link) || el.dataset.productUrl || '', tag = url ? 'A' : 'BUTTON';
        if (btn.tagName !== tag) {
          const next = document.createElement(tag);
          for (const a of [...btn.attributes]) if (a.name !== 'href' && a.name !== 'type') next.setAttribute(a.name, a.value);
          if (tag === 'BUTTON') next.type = 'button';
          next.append(...btn.childNodes);
          btn.replaceWith(next); btn = next;
        }
        if (url) attr(btn, 'href', url);
        attr(btn, 'data-theme-button', b.style === 'secondary' ? 'secondary' : 'primary');
        const bg = mine ? color(b.bg_color, '') : '', hover = mine ? color(b.bg_color_hover, '') : '';
        put(btn, '--mb-bg', bg); put(btn, '--mb-border', bg);
        put(btn, '--mb-text', mine ? color(b.text_color, '') : '');
        put(btn, '--mb-hover-bg', hover); put(btn, '--mb-hover-border', hover);
        put(btn, '--mb-hover-text', mine ? color(b.text_color_hover, '') : '');
        const shape = b.use_theme_button === false || b.use_theme_button === 'false';
        put(btn, '--mb-radius', shape ? px(b.radius, 6) : ''); put(btn, '--mb-padding-x', shape ? px(b.pad_x, 28) : ''); put(btn, '--mb-padding-y', shape ? px(b.pad_y, 14) : ''); put(btn, '--mb-font-size', shape ? px(b.size, 16) : '');
        own(btn, 'shape', shape);
      }
    }
    clock(root, state);
  }
  const paints = {'announcement-code-bar': codeBar, 'countdown-product-drop': productDrop};

  /* ------------------------------------------------------------ lifecycle */
  function blocksOf(root, state) {
    const out = [];
    for (const el of root.querySelectorAll('[data-r7p-block]')) {
      if (el.closest(SEL) !== root) continue;
      const b = state.blocks.get(el.dataset.r7pBlock);
      if (b) out.push({el, type: el.dataset.r7pType, b});
    }
    return out;
  }
  function read(root, state) {
    if (state.raw !== root.dataset.r7pSettings) { state.raw = root.dataset.r7pSettings; state.s = {...parse(state.raw), ...state.liveS}; }
    for (const el of root.querySelectorAll('[data-r7p-block][data-r7p-settings]')) {
      if (el.closest(SEL) !== root) continue;
      const id = el.dataset.r7pBlock;
      if (state.rawBlocks.get(id) !== el.dataset.r7pSettings) { state.rawBlocks.set(id, el.dataset.r7pSettings); state.blocks.set(id, {...parse(el.dataset.r7pSettings), ...state.liveBlocks.get(id)}); }
    }
  }
  /* What the page was drawn with is already in the markup: rich text is replaced only once its value differs. */
  function prime(root, state) {
    for (const {el, type, b} of blocksOf(root, state)) if (type === 'message' || type === 'heading' || type === 'text') state.rich.set(el, b.text ?? '');
  }
  function drop(root, state) {
    state.abort.abort(); state.io?.disconnect(); clearTimeout(state.timer); cancelAnimationFrame(state.frame);
    for (const t of state.copied.values()) clearTimeout(t);
    roots.delete(root);
  }
  function add(root) {
    const type = root.dataset.r7p;
    if (!paints[type]) return;
    const state = {root, s: {}, liveS: {}, blocks: new Map(), liveBlocks: new Map(), rawBlocks: new Map(), rich: new WeakMap(), frame: 0, timer: 0, ticks: 0, visible: false, copied: new Map(), abort: new AbortController()};
    /* Only a section the builder drew carries its settings. */
    state.live = root.hasAttribute('data-r7p-settings');
    state.schedule = () => { if (state.live && !state.frame) state.frame = requestAnimationFrame(() => { state.frame = 0; if (!root.isConnected || !api()) return; read(root, state); paints[type](root, state); }); };
    roots.set(root, state);
    if (type === 'announcement-code-bar') copier(root, state);
    if (type === 'countdown-product-drop') {
      if ('IntersectionObserver' in window) {
        state.io = new IntersectionObserver(entries => { for (const e of entries) state.visible = e.isIntersecting; running(state); });
        state.io.observe(root);
      } else state.visible = true;
      clock(root, state);
    }
    if (state.live) { read(root, state); prime(root, state); state.schedule(); }
  }
  function scan() {
    for (const [root, state] of roots) if (!root.isConnected) drop(root, state);
    document.querySelectorAll(SEL).forEach(root => { const state = roots.get(root); if (state) state.schedule(); else add(root); });
  }
  const sectionOf = d => String(d?.id ?? d ?? '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', event => {
    const d = event.detail || {}, id = sectionOf(d.section || d.sectionId || d.section_id), block = d.block || d.blockId || d.block_id;
    if (!id || !d.settings) return;
    for (const [root, state] of roots) {
      if (root.dataset.r7pSection !== id || !state.live) continue;
      if (block) { const key = String(block.id || block); state.liveBlocks.set(key, {...state.liveBlocks.get(key), ...d.settings}); state.blocks.set(key, {...state.blocks.get(key), ...d.settings}); }
      else { Object.assign(state.liveS, d.settings); Object.assign(state.s, d.settings); }
      state.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const state of roots.values()) if (state.root.dataset.r7p === 'countdown-product-drop') running(state); });
  /* Sections come and go only in the builder: the page is watched there, and never on a visitor's page. */
  let watching = false;
  function watch() {
    if (watching) return;
    watching = true;
    new MutationObserver(records => {
      if (records.some(r => r.type === 'attributes' ? r.target.matches?.(SEL + ', ' + SEL + ' [data-r7p-block]') : [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))))) scan();
    }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-r7p-settings']});
  }
  const builder = () => !!window.Shopify?.designMode || document.documentElement.classList.contains('shopify-design-mode') || !!document.querySelector('[data-r7p-settings]');
  document.addEventListener('DOMContentLoaded', () => { if (builder()) watch(); scan(); });
  ['storelib:section-load', 'shopify:section:load'].forEach(name => document.addEventListener(name, () => { watch(); scan(); }));
  document.addEventListener('storelib:settings-change', watch, {once: true});
  const pending = () => [...roots.values()].filter(st => st.timer).length;
  window.MateriaLiveR7Promo = {scan, moment, count: () => roots.size, pending, ticks: () => [...roots.values()].reduce((n, st) => n + st.ticks, 0), watching: () => watching};
  if (builder()) watch();
  scan();
})();
