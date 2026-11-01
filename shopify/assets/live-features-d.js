/* Materia Themes. Live editor updates and runtimes for the features-d sections:
   Progress Benefits, Progress Circles, Stat Counter, Stat Counter Pro, Steps and
   Product Benefits 4 (whose lines and slider stay in product-benefits-4.js).
   One controller per section root ([data-fd]), painted at most once per frame. Each root
   keeps its settings, its blocks' settings and every listener, observer and timer it
   started, and drops them all when it leaves the page (a builder redraw replaces the root).

   Rings and counters: on the storefront a root drawn with data-fd-reveal="pending" fills
   its rings and counts its numbers up once, the first time it comes into view; the numbers
   count only while the section is on screen. In the builder (no data-fd-reveal) and under
   reduced motion the final values show at once, and a live edit never replays them. */
(() => {
  if (window.MateriaFeaturesD) return;
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => { v = v && typeof v === 'object' && 'value' in v ? v.value : v; return v === true || v === 'true' || v === 1; };
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const H = () => window.MateriaHeroImageOne;
  const color = v => { const h = H(); if (h) return h.color(v, ''); return typeof v === 'string' && v && CSS.supports('color', v) && v !== 'transparent' ? v : ''; };
  const font = v => (v && (typeof v === 'object' ? v.family : v) && H()?.font(v)) || '';
  const url = (v, img) => H()?.url(v, img) || '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const prop = (el, k, v) => { if (!el) return; if (v === '' || v == null) { if (el.style.getPropertyValue(k) !== '') el.style.removeProperty(k); } else if (el.style.getPropertyValue(k).trim() !== String(v)) el.style.setProperty(k, String(v)); };
  const cvar = (el, k, on, v) => prop(el, k, on ? color(v) : '');
  const text = (el, v) => { if (el && el.textContent !== String(v ?? '')) el.textContent = String(v ?? ''); };
  const plain = v => String(v ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const inline = v => String(v ?? '').replace(/<\/?p>/g, '');
  const rich = (el, v, st) => { if (!el) return; if (!st.rich.has(el)) { st.rich.set(el, v); return; } if (H()) H().rich(el, v, st); else if (st.rich.get(el) !== v) { el.textContent = plain(v); st.rich.set(el, v); } };
  const hide = (el, on) => { if (el && el.hidden !== !!on) el.hidden = !!on; };
  const attr = (el, k, v) => { if (!el) return; if (v == null || v === false) { if (el.hasAttribute(k)) el.removeAttribute(k); } else if (el.getAttribute(k) !== String(v)) el.setAttribute(k, v); };
  const fontVar = (el, k, on, v) => prop(el, k, on ? font(v) : '');
  /* Theme priority opt-outs (snippets/theme-controls): present only while the element's own value is on. */
  const flag = (el, k, on) => { if (el && el.hasAttribute(k) !== !!on) el.toggleAttribute(k, !!on); };
  const sectionId = v => String(v && typeof v === 'object' ? v.id : v || '').replace(/^shopify-section-/, '');
  const scheme = (root, s) => {
    const id = s.color_scheme && typeof s.color_scheme === 'object' ? s.color_scheme.id : s.color_scheme;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id) || root.classList.contains('color-' + id)) return;
    for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c);
    root.classList.add('color-' + id);
  };
  const margins = (root, s) => {
    const w = root.closest('.shopify-section'); if (!w) return;
    for (const [k, id] of [['--fd-mt-m', 'section_margin_top_mobile'], ['--fd-mb-m', 'section_margin_bottom_mobile'], ['--fd-mt-d', 'section_margin_top_desktop'], ['--fd-mb-d', 'section_margin_bottom_desktop']]) if (id in s) prop(w, k, px(s[id]));
  };
  /* The section's custom background also paints the section wrapper, so a theme width class on the root still reads edge to edge. */
  const wrapBg = (root, on, v) => prop(root.closest('.shopify-section'), '--fd-wrap-bg', on ? color(v) : '');
  const sectionWidth = (el, w, fallback) => { for (const k of ['container', 'fluid_container', 'stretch_width', 'full_width']) el.classList.toggle(k, k === (w || fallback)); };
  const widthMax = w => ({container: 'calc(var(--page-width, 1300px) + 3rem)', fluid_container: 'calc(var(--fluid-container-width, 1500px) + 3rem)'}[w] || 'none');
  const align = v => ({center: 'center', right: 'flex-end'})[v] || 'flex-start';
  const vars = (el, s, list) => { for (const [k, id, unit, d] of list) prop(el, k, unit === 'px' ? px(s[id], d) : unit === '%' ? num(s[id], d) + '%' : String(s[id] ?? d)); };

  /* ---------- shared: a number counted up from 0 to its value ---------- */
  /* A value is countable when, without its thousands separators, it is a plain number. */
  const countable = raw => { const v = String(raw ?? '').replace(/[,\s]/g, ''); return /^-?\d+(\.\d+)?$/.test(v) ? +v : null; };
  const format = (n, decimals, grouped) => { const v = decimals > 0 ? n.toFixed(decimals) : String(Math.round(n)); return grouped ? Number(v).toLocaleString('en-US', {minimumFractionDigits: Math.max(0, decimals), maximumFractionDigits: Math.max(0, decimals)}) : v; };
  /* Final text of a [data-fd-count] element: data-final (the value as typed) or data-to plus data-suffix. */
  const finalText = el => el.dataset.final ?? (el.dataset.to ?? '') + (el.dataset.suffix || '');
  function count(el, st, ms) {
    const to = countable(el.dataset.to), dec = Math.max(0, Math.round(num(el.dataset.decimals))), grouped = /,/.test(el.dataset.final || '');
    if (to === null || ms <= 0) { text(el, finalText(el)); return; }
    const t0 = performance.now(), w = el.getBoundingClientRect().width;
    if (w) el.style.minWidth = Math.ceil(w) + 'px';
    const job = {el, frame: 0};
    const step = now => {
      if (!el.isConnected) return;
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      if (p < 1) { text(el, format(to * e, dec, grouped) + (el.dataset.suffix || '')); job.frame = requestAnimationFrame(step); }
      else { text(el, finalText(el)); el.style.removeProperty('min-width'); st.counting.delete(job); }
    };
    st.counting.add(job);
    text(el, format(0, dec, grouped) + (el.dataset.suffix || ''));
    job.frame = requestAnimationFrame(step);
  }
  /* Stops every running count and shows the final values. */
  const settle = st => { for (const j of st.counting) { cancelAnimationFrame(j.frame); j.el.style.removeProperty('min-width'); text(j.el, finalText(j.el)); } st.counting.clear(); };
  /* The once-only reveal: pending until the root is a quarter in view, then done for good. */
  function reveal(root, st, duration) {
    if (root.dataset.fdReveal !== 'pending') return;
    const done = () => {
      if (root.dataset.fdReveal !== 'pending') return;
      io.disconnect(); root.dataset.fdReveal = 'done';
      const ms = reduce.matches ? 0 : duration();
      for (const el of root.querySelectorAll('[data-fd-count]')) count(el, st, ms);
    };
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) done(); }, {threshold: 0.25});
    if (reduce.matches) done(); else io.observe(root);
    st.cleanup.push(() => io.disconnect());
    st.settle = () => settle(st);
  }
  /* Writes a counter's value: during a count only its target changes, so an edit never replays it. */
  const counter = (el, st, to, finalStr, extra = {}) => {
    if (!el) return;
    attr(el, 'data-to', to); attr(el, 'data-final', finalStr); for (const [k, v] of Object.entries(extra)) attr(el, k, v);
    if ([...st.counting].some(j => j.el === el)) return;
    if (el.closest('[data-fd-reveal="pending"]')) return;
    text(el, finalText(el));
  };
  /* Stroke offset of a ring (circumference c) at pct percent. */
  const offset = (c, pct) => +(c - c * Math.max(0, Math.min(100, pct)) / 100).toFixed(2);

  /* ================= Progress Benefits ================= */
  const PGC = {
    init(root, st) { reveal(root, st, () => 1400); },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), P = (k, v) => prop(root, k, v);
      scheme(root, s); margins(root, s);
      attr(root, 'data-width', s.section_width || 'container'); sectionWidth(root, s.section_width, 'container'); wrapBg(root, c, s.section_bg);
      vars(root, s, [['--pgc-pt-m', 'padding_top_mobile', 'px'], ['--pgc-pb-m', 'padding_bottom_mobile', 'px'], ['--pgc-px-m', 'side_padding_mobile', 'px'], ['--pgc-pt-d', 'padding_top_desktop', 'px'], ['--pgc-pb-d', 'padding_bottom_desktop', 'px'], ['--pgc-px-d', 'side_padding_desktop', 'px'],
        ['--pgc-text-w', 'text_column_width', '%', 42], ['--pgc-gap-m', 'gap_mobile', 'px'], ['--pgc-gap-d', 'gap_desktop', 'px'], ['--pgc-text-gap', 'text_gap', 'px'], ['--pgc-head-gap', 'heading_subheading_gap', 'px'],
        ['--pgc-cols-m', 'stats_per_row_mobile', '', 1], ['--pgc-cols-d', 'stats_per_row_desktop', '', 2], ['--pgc-row-m', 'stat_gap_mobile', 'px'], ['--pgc-row-d', 'stat_gap_desktop', 'px'], ['--pgc-col-m', 'stat_gap_x_mobile', 'px'], ['--pgc-col-d', 'stat_gap_x_desktop', 'px'],
        ['--pgc-inner-gap', 'stat_inner_gap', 'px'], ['--pgc-ring-gap', 'percent_ring_gap', 'px'], ['--pgc-pct-m', 'percent_size_mobile', 'px', 40], ['--pgc-pct-d', 'percent_size_desktop', 'px', 48], ['--pgc-ring', 'ring_size', 'px', 37], ['--pgc-label', 'label_size', 'px', 14]]);
      P('--pgc-dir', s.text_position === 'right' ? 'row-reverse' : 'row');
      P('--pgc-ai-m', align(s.text_align_mobile)); P('--pgc-ta-m', s.text_align_mobile || 'left'); P('--pgc-ai-d', align(s.text_align)); P('--pgc-ta-d', s.text_align || 'left');
      for (const [k, id] of [['--pgc-bg', 'section_bg'], ['--pgc-text', 'text_color'], ['--pgc-pct-color', 'percent_color'], ['--pgc-ring-color', 'ring_color'], ['--pgc-track', 'ring_track'], ['--pgc-label-color', 'stat_text_color']]) cvar(root, k, c, s[id]);
      fontVar(root, '--pgc-hfont', f, s.heading_font); fontVar(root, '--pgc-bfont', f, s.body_font); flag(root, 'data-own-font', f);
      for (const el of root.querySelectorAll('[data-fd-block]')) {
        const b = st.block(el), type = el.dataset.fdType, own = bool(b.enable_custom_style);
        if (type === 'heading') {
          rich(el, inline(b.text), st); hide(el, !plain(b.text));
          cvar(el, '--b-color', own, b.color); cvar(el, '--b-accent', own, b.accent_color);
          prop(el, '--b-size-m', px(b.size_mobile, 32)); prop(el, '--b-size-d', px(b.size_desktop, 44));
          const up = bool(b.uppercase) ? 'uppercase' : ''; prop(el, '--b-case', up); prop(el, '--heading-text-transform', up);
        } else if (type === 'subheading') {
          rich(el, b.text, st); hide(el, !plain(b.text)); cvar(el, '--b-color', own, b.color);
          prop(el, '--b-size-m', px(b.size_mobile, 14)); prop(el, '--b-size-d', px(b.size_desktop, 16));
        } else if (type === 'footnote') {
          rich(el, b.text, st); hide(el, !plain(b.text)); cvar(el, '--b-color', own, b.color);
          prop(el, '--b-size', px(b.size, 12)); prop(el, '--b-mt', px(b.margin_top));
        } else if (type === 'stat') {
          const pct = Math.max(0, Math.min(100, Math.round(num(b.percent))));
          prop(el, '--fd-off', offset(175.93, pct)); cvar(el, '--b-ring', own, b.color);
          counter(el.querySelector('[data-fd-count]'), st, pct, pct + '%');
          const label = el.querySelector('.pgc__stat-label'); rich(label, b.text, st); hide(label, !plain(b.text));
        }
      }
    },
  };

  /* ================= Progress Circles ================= */
  const PGR = {
    init(root, st) { reveal(root, st, () => 1400); },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), P = (k, v) => prop(root, k, v);
      scheme(root, s); margins(root, s); sectionWidth(root, s.section_width, 'container'); wrapBg(root, c, s.section_bg);
      vars(root, s, [['--pgr-pt-m', 'padding_top_mobile', 'px'], ['--pgr-pb-m', 'padding_bottom_mobile', 'px'], ['--pgr-px-m', 'side_padding_mobile', 'px'], ['--pgr-pt-d', 'padding_top_desktop', 'px'], ['--pgr-pb-d', 'padding_bottom_desktop', 'px'], ['--pgr-px-d', 'side_padding_desktop', 'px'],
        ['--pgr-head-gap', 'heading_subheading_gap', 'px'], ['--pgr-grid-gap', 'heading_to_grid_gap', 'px'], ['--pgr-cols-m', 'per_row_mobile', '', 2], ['--pgr-cols-d', 'per_row_desktop', '', 4],
        ['--pgr-row-m', 'row_gap_mobile', 'px'], ['--pgr-row-d', 'row_gap_desktop', 'px'], ['--pgr-col-m', 'col_gap_mobile', 'px'], ['--pgr-col-d', 'col_gap_desktop', 'px'], ['--pgr-label-gap', 'ring_to_label_gap', 'px'],
        ['--pgr-ring-m', 'ring_size_mobile', 'px', 110], ['--pgr-ring-d', 'ring_size_desktop', 'px', 137], ['--pgr-thick', 'ring_thickness', '', 4], ['--pgr-pct-m', 'percent_size_mobile', 'px', 29], ['--pgr-pct-d', 'percent_size_desktop', 'px', 32],
        ['--pgr-label-m', 'label_size_mobile', 'px', 14], ['--pgr-label-d', 'label_size_desktop', 'px', 16], ['--pgr-label-max', 'label_max_width', 'px', 240], ['--pgr-label-weight', 'label_weight', '', 500]]);
      const a = ['left', 'right'].includes(s.text_align) ? s.text_align : 'center';
      P('--pgr-ai', a === 'center' ? 'center' : align(a)); P('--pgr-ta', a);
      for (const [k, id] of [['--pgr-bg', 'section_bg'], ['--pgr-text', 'text_color'], ['--pgr-pct-color', 'percent_color'], ['--pgr-ring-color', 'ring_color'], ['--pgr-track', 'ring_track'], ['--pgr-label-color', 'label_color']]) cvar(root, k, c, s[id]);
      fontVar(root, '--pgr-hfont', f, s.heading_font); fontVar(root, '--pgr-bfont', f, s.body_font); flag(root, 'data-own-font', f);
      for (const el of root.querySelectorAll('[data-fd-block]')) {
        const b = st.block(el), type = el.dataset.fdType, own = bool(b.enable_custom_style);
        if (type === 'heading') {
          rich(el, inline(b.text), st); hide(el, !plain(b.text));
          cvar(el, '--b-color', own, b.color); cvar(el, '--b-accent', own, b.accent_color);
          prop(el, '--b-size-m', px(b.size_mobile, 30)); prop(el, '--b-size-d', px(b.size_desktop, 42));
          const up = bool(b.uppercase) ? 'uppercase' : ''; prop(el, '--b-case', up); prop(el, '--heading-text-transform', up);
        } else if (type === 'subheading') {
          rich(el, b.text, st); hide(el, !plain(b.text)); cvar(el, '--b-color', own, b.color);
          prop(el, '--b-size-m', px(b.size_mobile, 14)); prop(el, '--b-size-d', px(b.size_desktop, 16));
        } else if (type === 'footnote') {
          rich(el, b.text, st); hide(el, !plain(b.text)); cvar(el, '--b-color', own, b.color);
          prop(el, '--b-size', px(b.size, 12)); prop(el, '--b-mt', px(b.margin_top));
        } else if (type === 'stat') {
          const pct = Math.max(0, Math.min(100, Math.round(num(b.percent))));
          prop(el, '--fd-off', offset(175.93, pct)); cvar(el, '--b-ring', own, b.color);
          counter(el.querySelector('[data-fd-count]'), st, pct, pct + '%');
          const label = el.querySelector('.pgr__label'); text(label, plain(b.label)); hide(label, !plain(b.label));
        }
      }
    },
  };

  /* ---------- shared: header blocks (snippets/features-d-header) ---------- */
  function header(root, st) {
    const s = st.s, head = root.querySelector('[data-fd-header]'); if (!head) return;
    for (const [k, id] of [['subheading', 'subheading'], ['heading', 'heading']]) text(head.querySelector('[data-fd-legacy="' + k + '"]'), s[id]);
    rich(head.querySelector('[data-fd-legacy="description"]'), s.description, st);
    for (const el of head.querySelectorAll('[data-fd-block]')) {
      const b = st.block(el), type = el.dataset.fdType;
      cvar(el, '--b-color', bool(b.enable_custom_style), b.color);
      if (type === 'eyebrow') { text(el, b.text); hide(el, !plain(b.text)); prop(el, '--b-size', bool(b.size_enable) ? px(b.size, 14) : ''); }
      else if (type === 'heading') {
        rich(el, inline(b.text), st); hide(el, !plain(b.text));
        const size = bool(b.size_enable), w = bool(b.weight_enable), f = bool(b.enable_custom_fonts);
        prop(el, '--b-size-m', size ? px(b.size_mobile, 28) : ''); prop(el, '--b-size-d', size ? px(b.size_desktop, 40) : '');
        prop(el, '--b-weight', w ? String(b.weight || 700) : ''); flag(el, 'data-own-weight', w);
        fontVar(el, '--b-font', f, b.font); flag(el, 'data-own-font', f);
      } else if (type === 'subheading') {
        rich(el, b.text, st); hide(el, !plain(b.text));
        prop(el, '--b-size', bool(b.size_enable) ? px(b.size, 16) : ''); prop(el, '--b-max', px(b.max_width, 640));
      }
    }
    for (const a of ['left', 'center', 'right']) head.classList.toggle('text-' + a, a === (s.header_alignment || 'center'));
    hide(head, ![...head.children].some(c => !c.hidden));
  }
  /* Theme section padding (--section-pt/pb and the pt-min/pb-min classes the theme reads). */
  const padding = (root, s) => { prop(root, '--section-pt', String(num(s.padding_top))); prop(root, '--section-pb', String(num(s.padding_bottom))); root.classList.toggle('pt-min', num(s.padding_top) < 30); root.classList.toggle('pb-min', num(s.padding_bottom) < 30); };
  /* A stat's number: the value as typed is the final text; it counts when it is a plain number. */
  const statNumber = (el, st, b) => { const raw = String(b.value ?? '0').trim() || '0'; counter(el, st, raw.replace(/[,\s]/g, ''), raw, {'data-decimals': String(Math.max(0, Math.round(num(b.decimals))))}); };
  /* An inline SVG icon from an html setting, rewritten only when it changed. */
  const icons = (el, st, v) => { if (!el) return; v = v || ''; if (!st.icons.has(el)) st.icons.set(el, v); else if (st.icons.get(el) !== v) { st.icons.set(el, v); el.innerHTML = v; } hide(el, !v); };
  const piece = (el, v) => { text(el, v || ''); hide(el, !v); };

  /* ================= Stat Counter ================= */
  const COUNTER = {
    init(root, st) { reveal(root, st, () => num(st.s.duration, 1800)); },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), P = (k, v) => prop(root, k, v);
      scheme(root, s); margins(root, s); padding(root, s); sectionWidth(root.firstElementChild, s.section_width, 'full_width');
      root.classList.toggle('remove_spacing', bool(s.reset_spacing));
      vars(root, s, [['--counter-cols', 'columns', '', 4], ['--counter-cols-mb', 'columns_mobile', '', 2], ['--counter-gap', 'column_gap', 'px'], ['--counter-row-gap', 'row_gap', 'px'],
        ['--counter-value-size', 'value_size', 'px', 56], ['--counter-label-size', 'label_size', 'px', 14], ['--counter-value-weight', 'value_weight', '', '700'], ['--counter-icon', 'icon_size', 'px', 44],
        ['--counter-card-radius', 'card_radius', 'px'], ['--counter-item-padding', 'custom_inner_padding', 'px'], ['--counter-max-width', 'custom_max_width', 'px', 1280]]);
      P('--counter-value-size-mb', Math.round(num(s.value_size, 56) * 0.7) + 'px');
      const a = ['left', 'right'].includes(s.alignment) ? s.alignment : 'center'; P('--counter-align', a); P('--counter-ai', a === 'center' ? 'center' : align(a));
      const up = bool(s.custom_uppercase_label); P('--counter-case', up ? 'uppercase' : 'none'); P('--counter-tracking', up ? '0.06em' : 'normal');
      attr(root, 'data-layout', ['cards', 'outline'].includes(s.layout) ? s.layout : 'inline'); attr(root, 'data-divider', String(bool(s.divider)));
      for (const [k, id] of [['--counter-section-bg', 'custom_section_bg'], ['--counter-text', 'custom_text_color'], ['--counter-accent', 'accent_color'], ['--counter-label', 'custom_label_color'], ['--counter-divider', 'divider_color'], ['--counter-card-bg', 'card_bg']]) cvar(root, k, c, s[id]);
      fontVar(root, '--counter-hfont', f, s.heading_font); fontVar(root, '--counter-bfont', f, s.body_font); flag(root, 'data-own-font', f);
      if (root.hasAttribute('data-ti-no-reveal') === bool(s.reveal)) root.toggleAttribute('data-ti-no-reveal', !bool(s.reveal));
      header(root, st);
      for (const el of root.querySelectorAll('[data-fd-type="stat"]')) {
        const b = st.block(el), icon = el.querySelector('.stat-counter__icon');
        icons(icon, st, b.icon);
        piece(el.querySelector('.stat-counter__prefix'), b.prefix); piece(el.querySelector('.stat-counter__suffix'), b.suffix); piece(el.querySelector('.stat-counter__label'), b.label);
        statNumber(el.querySelector('[data-fd-count]'), st, b);
      }
    },
  };

  /* ================= Stat Counter Pro ================= */
  const PRO = {
    init(root, st) { reveal(root, st, () => num(st.s.duration, 1800)); },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), P = (k, v) => prop(root, k, v);
      scheme(root, s); margins(root, s); padding(root, s); sectionWidth(root.firstElementChild, s.section_width, 'full_width');
      root.classList.toggle('remove_spacing', bool(s.reset_spacing));
      vars(root, s, [['--scp-cols', 'columns', '', 4], ['--scp-cols-mb', 'columns_mobile', '', 2], ['--scp-gap', 'column_gap', 'px'], ['--scp-ring', 'ring_size', 'px', 140], ['--scp-ring-th', 'ring_thickness', 'px', 6],
        ['--scp-value', 'value_size', 'px', 36], ['--scp-label', 'label_size', 'px', 13], ['--scp-card-radius', 'card_radius', 'px'], ['--scp-item-padding', 'custom_item_padding', 'px'], ['--scp-max-width', 'custom_max_width', 'px', 1280]]);
      P('--fd-dur', num(s.duration, 1800) + 'ms');
      const up = bool(s.custom_uppercase_label); P('--scp-case', up ? 'uppercase' : 'none'); P('--scp-tracking', up ? '0.04em' : 'normal');
      const mode = ['badge', 'card'].includes(s.style_mode) ? s.style_mode : 'ring'; attr(root, 'data-style', mode);
      for (const [k, id] of [['--scp-section-bg', 'custom_section_bg'], ['--scp-text', 'custom_text_color'], ['--scp-accent', 'accent_color'], ['--scp-track', 'track_color'], ['--scp-card-bg', 'card_bg'], ['--scp-trend-up', 'custom_trend_up_bg'], ['--scp-trend-down', 'custom_trend_down_bg']]) cvar(root, k, c, s[id]);
      fontVar(root, '--scp-hfont', f, s.heading_font); fontVar(root, '--scp-bfont', f, s.body_font); flag(root, 'data-own-font', f);
      if (root.hasAttribute('data-ti-no-reveal') === bool(s.reveal)) root.toggleAttribute('data-ti-no-reveal', !bool(s.reveal));
      header(root, st);
      for (const el of root.querySelectorAll('[data-fd-type="stat"]')) {
        const b = st.block(el), q = sel => el.querySelector(sel);
        for (const k of [...el.classList]) if (k.startsWith('scp-item--') && k !== 'scp-item--' + mode) el.classList.remove(k);
        el.classList.add('scp-item--' + mode);
        /* The number sits inside the ring, or above the label for badge and card: the same node moves. */
        const value = q('[data-scp-value]'), slot = q('[data-scp-slot="' + (mode === 'ring' ? 'ring' : 'flat') + '"]');
        if (value && slot && value.parentElement !== slot) slot.append(value);
        hide(q('.scp-ring'), mode !== 'ring'); hide(q('[data-scp-slot="flat"]'), mode === 'ring');
        icons(q('.scp-icon'), st, b.icon);
        piece(q('.scp-prefix'), b.prefix); piece(q('.scp-suffix'), b.suffix); piece(q('.scp-label'), b.label);
        statNumber(q('[data-fd-count]'), st, b);
        const to = countable(b.value) ?? 0, max = countable(b.ring_max) || to || 1;
        prop(el, '--fd-off', offset(289.03, Math.max(0, Math.min(1, to / max)) * 100));
        const trend = q('.scp-trend'), dir = ['up', 'down'].includes(b.trend_direction) ? b.trend_direction : 'flat';
        if (trend) { for (const d of ['up', 'down', 'flat']) trend.classList.toggle('scp-trend--' + d, d === dir); text(trend.querySelector('.scp-trend__text'), b.trend_value || ''); hide(trend, !b.trend_value); }
      }
    },
  };

  /* ================= Steps ================= */
  const linkOrButton = (el, href) => {
    const tag = href ? 'A' : 'BUTTON';
    if (el.tagName !== tag) { const next = document.createElement(tag); for (const a of el.attributes) next.setAttribute(a.name, a.value); next.replaceChildren(...el.childNodes); el.replaceWith(next); el = next; }
    if (href) { attr(el, 'href', href); attr(el, 'type', null); } else { attr(el, 'href', null); attr(el, 'type', 'button'); }
    return el;
  };
  const STEPS = {
    init() {},
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), box = root.querySelector('.stp'), P = (k, v) => prop(box, k, v);
      scheme(root, s); sectionWidth(root, s.section_width, 'full_width'); root.classList.toggle('remove_spacing', bool(s.reset_spacing));
      attr(box, 'data-width', s.section_width || 'full_width');
      P('--stp-max', ({fluid_container: 'var(--fluid-container-width, 1500px)', stretch_width: 'none'})[s.section_width] || 'var(--page-width, 1100px)');
      const a = ['center', 'right'].includes(s.text_align) ? s.text_align : 'left';
      P('--stp-align', a); P('--stp-ai', align(a)); P('--stp-steps-ml', a === 'left' ? '0' : 'auto'); P('--stp-steps-mr', a === 'center' ? 'auto' : '0');
      vars(box, s, [['--stp-pt', 'padding_top', 'px'], ['--stp-pb', 'padding_bottom', 'px'], ['--stp-px-d', 'side_padding_desktop', 'px'], ['--stp-px-m', 'side_padding_mobile', 'px'], ['--stp-head-gap', 'head_gap', 'px'], ['--stp-steps-max', 'steps_max_width', 'px', 720],
        ['--stp-mk', 'marker_size', 'px', 36], ['--stp-mk-font', 'marker_font_size', 'px', 15], ['--stp-line-w', 'line_thickness', 'px', 2], ['--stp-gap-inline', 'step_gap_inline', 'px'], ['--stp-gap-below', 'step_gap_below', 'px'],
        ['--stp-title-size', 'step_title_size', 'px', 20], ['--stp-desc-size', 'step_desc_size', 'px', 14], ['--stp-btn-mt', 'button_margin_top', 'px']]);
      P('--stp-line-style', ['dashed', 'dotted'].includes(s.line_style) ? s.line_style : 'solid');
      for (const [k, id] of [['--stp-bg', 'section_bg'], ['--stp-marker', 'marker_color'], ['--stp-marker-text', 'marker_text_color'], ['--stp-line', 'line_color'], ['--stp-title', 'step_title_color'], ['--stp-desc', 'step_desc_color']]) cvar(box, k, c, s[id]);
      fontVar(box, '--stp-hfont', f, s.heading_font); fontVar(box, '--stp-bfont', f, s.body_font); flag(root, 'data-own-font', f);
      const style = ['dot', 'dot_outline', 'numbered_outline', 'prefixed', 'icon'].includes(s.step_style) ? s.step_style : 'numbered';
      const geo = s.use_theme_button === false || s.use_theme_button === 'false';
      for (const el of root.querySelectorAll('[data-fd-block]')) {
        const b = st.block(el), type = el.dataset.fdType, own = bool(b.enable_custom_style);
        if (type === 'eyebrow' || type === 'heading' || type === 'subheading') {
          cvar(el, '--b-color', own, b.color);
          if (type === 'heading') { rich(el, inline(b.text), st); const z = bool(b.size_enable); prop(el, '--b-size-m', z ? px(b.size_mobile, 28) : ''); prop(el, '--b-size-d', z ? px(b.size_desktop, 40) : ''); }
          else if (type === 'eyebrow') { text(el, b.text); prop(el, '--b-size', px(b.size, 12)); }
          else { rich(el, b.text, st); prop(el, '--b-size', px(b.size, 15)); prop(el, '--b-max', px(b.max_width, 600)); }
          hide(el, !plain(b.text));
        } else if (type === 'step') {
          const icon = url(b.icon, true), cls = icon ? 'icon' : style;
          for (const k of [...el.classList]) if (k.startsWith('stp__step--') && k !== 'stp__step--' + cls) el.classList.remove(k);
          el.classList.add('stp__step--' + cls);
          const marker = el.querySelector('.stp__step-marker'); let img = marker.querySelector('img');
          if (icon && !img) { img = document.createElement('img'); img.alt = ''; img.width = 40; img.height = 40; img.loading = 'lazy'; marker.prepend(img); }
          if (img) { hide(img, !icon); if (icon && img.getAttribute('src') !== icon) { img.removeAttribute('srcset'); img.src = icon; } }
          text(el.querySelector('.stp__step-text'), b.title || el.querySelector('.stp__step-text').textContent);
          const d = el.querySelector('.stp__step-desc'); rich(d, b.description, st); hide(d, !plain(b.description));
          cvar(el, '--b-mk', own, b.marker_color); cvar(el, '--b-title', own, b.title_color); cvar(el, '--b-desc', own, b.description_color);
        } else if (type === 'button') {
          const b2 = linkOrButton(el, url(b.url)); text(b2, b.label); hide(b2, !b.label);
          for (const [k, v] of [['--mb-bg', c ? color(s.button_bg) : ''], ['--mb-border', c ? color(s.button_bg) : ''], ['--mb-text', c ? color(s.button_color) : ''], ['--mb-hover-bg', c ? color(s.button_bg_hover) : ''], ['--mb-hover-border', c ? color(s.button_bg_hover) : ''], ['--mb-hover-text', c ? color(s.button_color) : ''],
            ['--mb-radius', geo ? px(s.button_radius, 999) : ''], ['--mb-padding-y', geo ? px(s.button_pad_y, 14) : ''], ['--mb-padding-x', geo ? px(s.button_pad_x, 26) : ''], ['--mb-font-size', geo ? px(s.button_size, 15) : '']]) prop(b2, k, v);
          flag(b2, 'data-own-shape', geo);
        }
      }
      const head = root.querySelector('.stp__head'); if (head) hide(head, ![...head.children].some(x => !x.hidden));
    },
  };

  /* ================= Product Benefits 4 ================= */
  /* The lines and the phone slider are product-benefits-4.js; this paints settings and pauses looping motion off screen. */
  const PB4_ANIM = {float_up: 'pb4hFloatUp 4s ease-in-out infinite', float_right: 'pb4hFloatRight 4s ease-in-out infinite', float_diagonal: 'pb4hFloatDiag 4.5s ease-in-out infinite', push: 'pb4hPush 3s ease-in-out infinite', zoom: 'pb4hZoom 3.5s ease-in-out infinite', buzz: 'pb4hBuzz 0.7s linear infinite', sway: 'pb4hSway 4s ease-in-out infinite'};
  const PB4 = {
    init(root, st) {
      const io = new IntersectionObserver(es => { const e = es[es.length - 1]; attr(root, 'data-fd-offscreen', e.isIntersecting ? null : ''); }, {threshold: 0});
      io.observe(root); st.cleanup.push(() => io.disconnect());
    },
    paint(root, st) {
      const s = st.s, c = bool(s.enable_custom_style), P = (k, v) => prop(root, k, v);
      scheme(root, s); margins(root, s);
      attr(root, 'data-pb4h-width', s.section_width || 'container');
      if (root.hasAttribute('data-ti-no-reveal') === bool(s.reveal)) root.toggleAttribute('data-ti-no-reveal', !bool(s.reveal));
      vars(root, s, [['--pb4h-pt-m', 'padding_top_mobile', 'px', 56], ['--pb4h-pb-m', 'padding_bottom_mobile', 'px', 56], ['--pb4h-pt-d', 'padding_top_desktop', 'px', 88], ['--pb4h-pb-d', 'padding_bottom_desktop', 'px', 88], ['--pb4h-gap-header', 'gap_header_to_grid', 'px', 32],
        ['--pb4h-h-m', 'heading_size_mobile', 'px', 32], ['--pb4h-h-d', 'heading_size_desktop', 'px', 56], ['--pb4h-img', 'image_size_desktop', 'px', 460], ['--pb4h-col-gap', 'col_gap', 'px', 24], ['--pb4h-tab-gap', 'tab_gap_desktop', 'px', 64],
        ['--pb4h-thumb', 'thumb_size', 'px', 80], ['--pb4h-thumb-r', 'thumb_radius', 'px', 16], ['--pb4h-gap-title', 'gap_thumb_to_title', 'px', 12], ['--pb4h-title', 'title_size', 'px', 18], ['--pb4h-desc', 'desc_size', 'px', 14],
        ['--pb4h-prod-r', 'product_radius', 'px', 24], ['--pb4h-line', 'line_thickness', '', 2], ['--pb4h-line-w', 'line_thickness', 'px', 2], ['--pb4h-dot', 'dot_size', 'px', 12], ['--pb4h-card-r', 'mobile_card_radius', 'px', 18], ['--pb4h-reach', 'mobile_line_reach', '%', 30], ['--pb4h-cta-gap', 'gap_grid_to_cta', 'px', 36]]);
      /* Liquid's divided_by on whole numbers rounds down; the live values match it. */
      P('--pb4h-line-half', Math.floor(num(s.line_thickness, 2) / 2) + 'px'); P('--pb4h-dot-mr', '-' + Math.floor(num(s.dot_size, 12) / 2) + 'px');
      P('--pb4h-thumb-shadow', bool(s.thumb_shadow) ? '0 6px 18px -8px rgba(0,0,0,.18)' : 'none');
      const mix = 'color-mix(in srgb, var(--color-text) 5%, var(--color-background))';
      P('--pb4h-bg', (c && color(s.section_bg)) || 'var(--color-background)'); P('--pb4h-thumb-bg', (c && color(s.thumb_bg)) || mix);
      P('--pb4h-prod-bg', (c && color(s.product_bg)) || 'var(--color-background)'); P('--pb4h-card-bg', (c && color(s.mobile_card_bg)) || 'var(--color-background)');
      const accent = (c && color(s.line_color)) || 'var(--color-primary)'; P('--pb4h-accent', accent);
      const anim = PB4_ANIM[s.product_image_animation] || ''; P('--pb4h-anim', anim); attr(root, 'data-pb4h-anim', anim ? s.product_image_animation : null);
      /* Heading: a Heading block, or the old section text. The accent word is coloured where it appears. */
      const h = root.querySelector('.pb4h__heading');
      if (h) {
        /* Colours: the block's own when its custom styling is on, else the section's when the section's is on. */
        const blk = h.dataset.fdBlock ? st.block(h) : null, mine = !!blk && bool(blk.enable_custom_style), own = mine || c;
        const txt = blk ? blk.text : s.heading, acc = blk ? blk.accent : s.heading_accent;
        const hc = (own && color(mine ? blk.color : s.heading_color)) || 'var(--color-heading)', ac = (own && color(mine ? blk.accent_color : s.heading_accent_color)) || accent;
        if (h.style.getPropertyValue('color') !== hc || h.style.getPropertyPriority('color') !== 'important') h.style.setProperty('color', hc, 'important');
        const key = JSON.stringify([txt, acc, ac]);
        if (st.headKey === undefined) st.headKey = key;
        else if (st.headKey !== key) {
          st.headKey = key;
          const span = () => { const x = document.createElement('span'); x.style.color = ac; x.textContent = acc; return x; };
          const t = String(txt || ''), at = acc ? t.indexOf(acc) : -1;
          if (at >= 0) h.replaceChildren(t.slice(0, at), span(), t.slice(at + acc.length)); else if (!t && acc) h.replaceChildren(span()); else h.replaceChildren(t);
        }
        hide(h, !txt && !acc);
        const f = bool(s.heading_custom_font_enable) && !!font(s.heading_font), w = bool(s.heading_custom_font_enable) && s.heading_font_weight && s.heading_font_weight !== 'inherit';
        prop(h, 'font-family', f ? font(s.heading_font) : ''); flag(h, 'data-own-font', f);
        prop(h, 'font-weight', w ? String(s.heading_font_weight) : f && s.heading_font && s.heading_font.weight ? String(s.heading_font.weight) : ''); flag(h, 'data-own-weight', w);
      }
      for (const el of root.querySelectorAll('[data-fd-type="spot"]')) {
        const b = st.block(el), own = bool(b.enable_custom_style), q = sel => el.querySelector(sel);
        for (const [sel, v, k, fb] of [['.pb4h__title, .pb4h__slide-title', b.title, 'title_color', 'var(--color-heading)'], ['.pb4h__desc, .pb4h__slide-desc', b.description, 'desc_color', 'var(--color-text)']]) {
          const t = q(sel); if (!t) continue;
          text(t, v); hide(t, !v);
          const col = (own && color(b[k])) || fb; if (t.style.getPropertyValue('color') !== col) t.style.setProperty('color', col, 'important');
        }
        const img = q('.pb4h__thumb img, .pb4h__slide-thumb img'), u = url(b.thumb, true);
        if (img) { if (!st.placeholders.has(img)) st.placeholders.set(img, img.getAttribute('src')); const next = u || st.placeholders.get(img); if (img.getAttribute('src') !== next) img.src = next; if (u && img.closest('.pb4h__thumb')) attr(img, 'alt', (b.thumb && b.thumb.alt) || b.title || ''); }
      }
      const pimg = url(s.product_image, true);
      for (const img of root.querySelectorAll('.pb4h__product img, .pb4h__slide-product img')) { if (!st.placeholders.has(img)) st.placeholders.set(img, img.getAttribute('src')); const next = pimg || st.placeholders.get(img); if (img.getAttribute('src') !== next) img.src = next; }
      for (const el of root.querySelectorAll('[data-fd-type="button"]')) {
        const b = st.block(el), own = bool(b.enable_custom_style), geo = b.use_theme_button === false || b.use_theme_button === 'false';
        text(el, b.cta_label); attr(el, 'href', url(b.cta_link) || '/collections/all');
        for (const [k, v] of [['--mb-bg', own ? color(b.cta_bg) : ''], ['--mb-border', own ? color(b.cta_bg) : ''], ['--mb-text', own ? color(b.cta_text) : ''], ['--mb-hover-bg', own ? color(b.cta_bg_hover) : ''], ['--mb-hover-border', own ? color(b.cta_bg_hover) : ''],
          ['--mb-radius', geo ? px(b.cta_radius, 4) : ''], ['--mb-padding-y', geo ? px(b.cta_pad_y, 16) : ''], ['--mb-padding-x', geo ? px(b.cta_pad_x, 36) : ''], ['--mb-font-size', geo ? px(b.cta_size, 16) : ''], ['--mb-weight', geo ? '700' : '']]) prop(el, k, v);
        flag(el, 'data-own-shape', geo); flag(el, 'data-own-weight', geo);
      }
    },
  };

  const TYPES = {pgc: PGC, pgr: PGR, counter: COUNTER, pro: PRO, steps: STEPS, pb4: PB4};

  /* ---------- registry ---------- */
  function register(root) {
    const type = TYPES[root.dataset.fd]; if (!type) return;
    const st = {
      type, raw: root.dataset.fdSettings, s: parse(root.dataset.fdSettings),
      blocks: new Map(), live: new Map(), rawBlocks: new Map(), rich: new WeakMap(), placeholders: new WeakMap(), counting: new Set(), icons: new WeakMap(),
      ac: new AbortController(), cleanup: [], frame: 0,
    };
    st.block = el => {
      if (!el) return {};
      const id = el.dataset.fdBlock;
      if (st.rawBlocks.get(id) !== el.dataset.fdSettings) { st.rawBlocks.set(id, el.dataset.fdSettings); st.blocks.set(id, parse(el.dataset.fdSettings)); }
      return {...st.blocks.get(id), ...st.live.get(id)};
    };
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    reduce.addEventListener('change', () => { if (reduce.matches) st.settle?.(); st.schedule(); }, {signal: st.ac.signal});
    roots.set(root, st);
    try { type.init(root, st); } catch (e) { console.warn(e); }
    paint(root, st);
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.fdSettings) { st.raw = root.dataset.fdSettings; st.s = {...st.s, ...parse(st.raw)}; }
    try { st.type.paint(root, st); } catch (e) { console.warn(e); }
  }
  function drop(root, st) { st.ac.abort(); cancelAnimationFrame(st.frame); for (const j of st.counting) cancelAnimationFrame(j.frame); for (const f of st.cleanup) try { f(); } catch (_) {} roots.delete(root); }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll('[data-fd]')) { if (roots.has(root)) roots.get(root).schedule(); else register(root); }
  }

  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId);
    if (!id || !d.settings) return;
    const bid = d.block || d.blockId || d.block_id, key = bid ? String(bid && typeof bid === 'object' ? bid.id : bid) : '';
    for (const [root, st] of roots) {
      if (root.dataset.fdSection !== id) continue;
      if (key) st.live.set(key, {...st.live.get(key), ...d.settings});
      else Object.assign(st.s, d.settings);
      st.schedule();
    }
  });
  for (const n of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(n, scan);
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-fd],[data-fd-block]') || n.querySelector('[data-fd],[data-fd-block]'))))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-fd-settings']});
  window.MateriaFeaturesD = {scan, size: () => roots.size, state: root => roots.get(root)};
  scan();
})();
