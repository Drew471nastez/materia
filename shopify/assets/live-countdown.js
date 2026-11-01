/* Materia Themes. The countdown sections: Countdown Timer Flip
   (countdown-flip), Countdown Timer Inline (countdown-inline) and Countdown
   Timer Pro 1, 2 and 3 (countdown-timer1, -timer2, -timer3). Loaded on every
   page by layout/theme.storelib.

   Timers: one per section root [data-cd-root], counting on the visitor's
   clock. A timer ticks at most once a second, on the second, and only while
   its section is on screen and the tab is visible; coming back it shows the
   right time at once. A deadline that has passed sets data-cd-state="expired"
   (the section's ended look), a missing or impossible date sets "unset"
   (zeros and a hint in the editor, nothing for visitors). Pro 1 counts a
   fixed time per visitor and starts again when it ends (kept in
   localStorage per section, in memory when storage is blocked). Pro 2 can
   start again every day, week or month. Pro 3 shows its ended message, and
   hides the section when it ended unless the builder is open.

   Live edits: every root carries its settings as JSON and every block its
   own. derive() turns them into outputs (a CSS variable, an attribute, text)
   per element, the same values the Liquid prints, so on load the first
   derive is only recorded. After that an output is written only when its
   value changes, once per frame per root, so the timer never restarts for an
   unrelated edit. audit() lists outputs whose markup differs (tests). */
(() => {
  if (window.MateriaCountdown) return;
  const SEL = '[data-cd-root]', BLOCK = '[data-cd-block]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const str = (v, d = '') => v == null || v === '' ? d : String(v);
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const pick = (on, v, f) => on ? color(v, f) : f;
  const localUrl = v => { v = v && typeof v === 'object' ? v.url || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return ['http:', 'https:', 'mailto:', 'tel:', 'shopify:'].includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = v => { const a = api() && api().url ? api().url(v, false) : ''; return a || localUrl(v); };
  /* a font picker value, printed as the Liquid prints it: family, fallbacks */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    return typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
  };
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const design = () => document.documentElement.classList.contains('shopify-design-mode') || !!(window.Shopify && window.Shopify.designMode);

  /* ---------- dates ---------- */
  /* An impossible calendar date (2026-02-30) is no date: it would roll into March. */
  function calendarOk(s){var m=/^\s*(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s||''));if(!m)return true;var y=+m[1],mo=+m[2],d=+m[3];return mo>=1&&mo<=12&&d>=1&&d<=new Date(Date.UTC(y,mo,0)).getUTCDate();}
  const iso = v => { v = str(v).trim(); return v && calendarOk(v) ? Date.parse(v) : NaN; };
  /* Pro 2: a date (YYYY-MM-DD) and a time (HH:MM) on the visitor's clock */
  const local = (date, time) => { date = str(date).trim(); time = str(time, '00:00').trim() || '00:00'; if (!date) return NaN; const dt = date + 'T' + time; return calendarOk(dt) ? Date.parse(dt) : NaN; };
  /* Pro 3: MM-DD-YYYY and a time such as 11:30pm, on the visitor's clock */
  function mdy(date, time) {
    const p = str(date).trim().split('-'); if (p.length !== 3) return NaN;
    const [mo, d, y] = p.map(Number); if (!(y > 0) || !(mo >= 1 && mo <= 12) || !(d >= 1 && d <= new Date(y, mo, 0).getDate())) return NaN;
    const m = /(\d+)(?::(\d+))?\s*(am|pm)/i.exec(str(time)); let hh = 0, mm = 0;
    if (m) { hh = +m[1] % 12 + (m[3].toLowerCase() === 'pm' ? 12 : 0); mm = +(m[2] || 0); }
    return new Date(y, mo - 1, d, hh, mm, 0).getTime();
  }
  const pad = n => String(Math.max(0, Math.floor(n))).padStart(2, '0');

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.innerHTML = String(value || '');
  }
  function link(el, href, st) {
    const tag = href ? 'A' : 'BUTTON';
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      st.last.set(next, st.last.get(el) || new Map());
      el = next;
    }
    if (href) { el.setAttribute('href', href); el.removeAttribute('type'); } else { el.removeAttribute('href'); el.setAttribute('type', 'button'); }
    return el;
  }
  function write(el, key, v, prev, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') { if (prev) el.classList.remove(prev); if (v) el.classList.add(v); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'href') return link(el, v, st);
    else if (key === 'clock') { st.clockDirty = true; }
    return el;
  }

  /* ---------- shared derive pieces ---------- */
  const scheme = c => { const v = c.s.color_scheme && c.s.color_scheme.id || c.s.color_scheme; if (typeof v === 'string' && /^[\w-]+$/.test(v)) c.put(c.root, 'scheme', v); };
  const fam = (on, v) => on && font(v) || null;
  /* the units: shown or not, their label, and a colon only between two shown units */
  function units(c, show, label) {
    const {root, put} = c; let before = false;
    for (const u of ['d', 'h', 'm', 's']) {
      const on = show(u);
      const box = root.querySelector('[data-cd-show="' + u + '"]'); if (box) put(box, 'hidden', !on);
      const sep = root.querySelector('[data-cd-sep="' + u + '"]'); if (sep) put(sep, 'hidden', !(on && before));
      if (on) before = true;
      const l = root.querySelector('[data-cd-label="' + u + '"]');
      if (l && label) { const t = label(u); put(l, 'text', blank(t) ? l.dataset.cdFallback || '' : t); if (l.hasAttribute('data-cd-label-hide')) put(l, 'hidden', blank(t)); }
    }
  }
  /* a theme button: its link, label, the section's or block's colours (custom styling) and shape (theme style off) */
  function button(c, el, o) {
    const {put} = c;
    el = put(el, 'href', url(o.link) || '');
    put(el, 'text', o.label || '');
    put(el, 'hidden', blank(o.label));
    put(el, '--mb-bg', o.own ? color(o.bg, 'var(--btn-primary-bg-color)') : null);
    put(el, '--mb-text', o.own ? color(o.text, 'var(--btn-primary-color)') : null);
    put(el, '--mb-border', o.own ? color(o.border, 'var(--btn-primary-border-color, var(--btn-primary-bg-color))') : null);
    put(el, '--mb-hover-bg', o.own ? color(o.hoverBg, 'var(--btn-primary-hover-bg-color)') : null);
    put(el, '--mb-hover-text', o.own ? color(o.hoverText, 'var(--btn-primary-hover-color)') : null);
    if ('hoverBorder' in o) put(el, '--mb-hover-border', o.own ? color(o.hoverBorder, 'var(--btn-primary-hover-bg-color)') : null);
    put(el, '@data-own-shape', o.shape || null);
    put(el, '--mb-radius', o.shape ? o.radius : null);
    put(el, '--mb-padding-y', o.shape ? o.py : null);
    put(el, '--mb-padding-x', o.shape ? o.px : null);
    put(el, '--mb-font-size', o.shape ? o.fs : null);
    put(el, '--mb-border-width', o.shape ? o.bw : null);
    if ('weight' in o) { put(el, '--mb-weight', o.weight || null); put(el, '@data-own-weight', !!o.weight || null); }
    return el;
  }
  /* section margins on the section wrapper, live (the Liquid prints them as CSS) */
  function margins(c, t, b) {
    const wrap = c.root.closest('.shopify-section'); if (!wrap || c.audit) return;
    const reset = bool(c.s.reset_spacing);
    c.put(wrap, '!margin-top', reset ? '0px' : px(t)); c.put(wrap, '!margin-bottom', reset ? '0px' : px(b));
  }

  /* ---------- Countdown Timer Flip ---------- */
  function flip(c) {
    const {root, s, put} = c, o = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), v = (k, x) => put(root, '--cdf-' + k, x);
    const align = s.header_align || 'center';
    v('bg', pick(o, s.section_bg, 'var(--color-background)'));
    v('pt-m', px(s.padding_top_mobile)); v('pb-m', px(s.padding_bottom_mobile)); v('pt-d', px(s.padding_top_desktop)); v('pb-d', px(s.padding_bottom_desktop));
    v('w-m', px(s.section_max_width_mobile, 560)); v('w-t', px(s.section_max_width_tablet, 800)); v('w-d', px(s.section_max_width_desktop, 960));
    v('align', align); v('flex', align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center');
    v('hgap-m', px(s.heading_sub_gap_mobile)); v('hgap-d', px(s.heading_sub_gap_desktop));
    v('clock-gap-m', px(s.gap_subheading_clock_mobile)); v('clock-gap-d', px(s.gap_subheading_clock));
    v('unit-gap-m', px(s.unit_gap_mobile)); v('unit-gap-d', px(s.unit_gap_desktop));
    v('card-bg', pick(o, s.card_bg, 'var(--color-heading)')); v('digit', pick(o, s.digit_color, 'var(--color-background)'));
    v('split', pick(o, s.card_split_color, 'color-mix(in srgb, var(--color-background) 65%, transparent)'));
    v('label', pick(o, s.label_color, 'var(--color-text)')); v('sep', pick(o, s.separator_color, 'var(--color-heading)')); v('expired', pick(o, s.expired_color, 'var(--color-text)'));
    v('radius', px(s.card_radius)); v('shadow', str(s.card_shadow).trim() || 'none');
    v('card-w-m', px(s.card_width_mobile, 70)); v('card-h-m', px(s.card_height_mobile, 80)); v('card-w-d', px(s.card_width_desktop, 100)); v('card-h-d', px(s.card_height_desktop, 100));
    v('split-h', px(s.card_split_height));
    v('dw', str(s.digit_weight, '800')); v('ds-m', px(s.digit_size_mobile, 30)); v('ds-d', px(s.digit_size_desktop, 44));
    v('ls', px(s.label_size, 12)); v('lw', str(s.label_weight, '500')); v('lt', str(s.label_transform, 'none'));
    v('cta-gap', px(s.gap_clock_cta));
    v('hf', fam(f, s.heading_font)); v('bf', fam(f, s.body_font));
    put(root, '@data-cdf-width', str(s.section_width)); put(root, '@data-cdf-show', str(s.show_section_on, 'all'));
    put(root, '@data-cdf-highlight', bool(s.show_highlight) || null); put(root, '@data-cdf-seps', bool(s.show_separators) || null);
    units(c, u => bool(s[{d: 'show_days', h: 'show_hours', m: 'show_minutes', s: 'show_seconds'}[u]]), u => s[{d: 'label_days', h: 'label_hours', m: 'label_minutes', s: 'label_seconds'}[u]]);
    const ex = c.q('[data-cd-expired]'); if (ex) { put(ex, 'text', str(s.expired_message)); put(ex, 'hidden', blank(s.expired_message)); }
    put(root, 'clock', str(s.end_iso).trim());
    for (const x of c.blocks) {
      const b = x.b, el = x.el;
      if (x.type === 'heading') {
        const w = b.weight && b.weight !== 'theme' ? String(b.weight) : '', bf = bool(b.enable_custom_fonts), lh = bool(b.custom_line_height);
        put(el, 'rich', b.text || ''); put(el, 'hidden', blank(b.text));
        put(el, '--cdh-c', bool(b.enable_custom_style) ? color(b.color, 'var(--color-heading)') : null);
        put(el, '--cdh-fs-m', px(b.size_mobile, 24)); put(el, '--cdh-fs-d', px(b.size_desktop, 32));
        put(el, '--cdh-fw', w || null); put(el, '--cdh-lh', lh ? String(num(b.line_height, 1.2)) : null); put(el, '--cdh-ff', fam(bf, b.font));
        put(el, '@data-own-font', f || bf || null); put(el, '@data-own-weight', !!w || null); put(el, '@data-own-size', lh || null);
      } else if (x.type === 'subheading') {
        const bf = bool(b.enable_custom_fonts);
        put(el, 'rich', b.text || ''); put(el, 'hidden', blank(b.text));
        put(el, '--cds-c', bool(b.enable_custom_style) ? color(b.color, 'var(--color-text)') : null);
        put(el, '--cds-fs', px(b.size, 16)); put(el, '--cds-mw', px(b.max_width, 600)); put(el, '--cds-ff', fam(bf, b.font));
        put(el, '@data-own-font', f || bf || null);
      } else if (x.type === 'cta') {
        const shape = s.use_theme_button === false || s.use_theme_button === 'false';
        button(c, el, {link: b.link, label: b.text, own: o, bg: s.cta_bg, text: s.cta_color, border: s.cta_border_color, hoverBg: s.cta_bg_hover, hoverText: s.cta_color_hover,
          shape, radius: px(s.cta_radius), py: px(s.cta_pad_y, 12), px: px(s.cta_pad_x, 28), fs: px(s.cta_size, 15), bw: px(s.cta_border_width)});
      }
    }
    margins(c, c.desk() ? s.section_margin_top_desktop : s.section_margin_top_mobile, c.desk() ? s.section_margin_bottom_desktop : s.section_margin_bottom_mobile);
  }

  /* ---------- Countdown Timer Inline ---------- */
  function inline(c) {
    const {root, s, put} = c, o = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), v = (k, x) => put(root, '--cin-' + k, x);
    const align = s.align || 'center';
    v('bg', pick(o, s.section_bg, 'var(--color-background)'));
    v('pt-m', px(s.padding_top_mobile)); v('pb-m', px(s.padding_bottom_mobile)); v('pt-d', px(s.padding_top_desktop)); v('pb-d', px(s.padding_bottom_desktop));
    v('w-m', px(s.section_max_width_mobile, 560)); v('w-t', px(s.section_max_width_tablet, 900)); v('w-d', px(s.section_max_width_desktop, 1200));
    v('flex', align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center');
    v('gap-m', px(s.gap_inline_mobile, 13)); v('gap-d', px(s.gap_inline, 16)); v('timer-gap', px(s.timer_gap, 10));
    v('bar-bg', pick(o, s.bar_bg, 'var(--color-heading)')); v('bar-text', pick(o, s.bar_text, 'var(--color-background)')); v('bar-border', pick(o, s.bar_border_color, 'var(--color-heading)'));
    v('bar-bw', px(s.bar_border_width)); v('r-m', px(s.bar_radius_mobile)); v('r-d', px(s.bar_radius));
    v('px-m', px(s.bar_pad_x_mobile, 22)); v('py-m', px(s.bar_pad_y_mobile, 14)); v('px-d', px(s.bar_pad_x_desktop, 32)); v('py-d', px(s.bar_pad_y_desktop, 18));
    v('eb-bg', pick(o, s.eyebrow_bg, 'color-mix(in srgb, var(--color-background) 12%, transparent)')); v('eb-c', pick(o, s.eyebrow_color, 'var(--color-background)')); v('dot', pick(o, s.eyebrow_dot_color, 'var(--color-primary)'));
    v('mw', str(s.message_weight, '600')); v('ms-m', px(s.message_size_mobile, 14)); v('ms-d', px(s.message_size_desktop, 16));
    const box = o && color(s.digit_bg, '') !== '';
    v('digit', pick(o, s.digit_color, 'var(--color-background)')); v('digit-bg', pick(o, s.digit_bg, 'transparent')); v('digit-pad', box ? '4px 8px' : '0px');
    v('dw', str(s.digit_weight, '800')); v('ds-m', px(s.digit_size_mobile, 18)); v('ds-d', px(s.digit_size_desktop, 22));
    v('unit', pick(o, s.unit_label_color, 'color-mix(in srgb, var(--color-background) 65%, transparent)')); v('uw', str(s.unit_label_weight, '600')); v('us', px(s.unit_label_size, 12));
    v('expired', pick(o, s.expired_color, 'inherit'));
    v('hf', fam(f, s.heading_font)); v('bf', fam(f, s.body_font));
    put(root, '@data-cin-width', str(s.section_width)); put(root, '@data-cin-show', str(s.show_section_on, 'all'));
    units(c, u => bool(s[{d: 'show_days', h: 'show_hours', m: 'show_minutes', s: 'show_seconds'}[u]]), u => s[{d: 'label_days', h: 'label_hours', m: 'label_minutes', s: 'label_seconds'}[u]]);
    const ex = c.q('[data-cd-expired]'); if (ex) { put(ex, 'text', str(s.expired_message)); put(ex, 'hidden', blank(s.expired_message)); }
    put(root, 'clock', str(s.end_iso).trim());
    for (const x of c.blocks) {
      const b = x.b, el = x.el, bf = bool(b.enable_custom_fonts);
      if (x.type === 'eyebrow') {
        const t = el.querySelector('[data-cd-text]'); if (t) put(t, 'text', str(b.text));
        put(el, 'hidden', blank(b.text)); put(el.querySelector('[data-cd-dot]'), 'hidden', !bool(b.show_dot));
        put(el, '--cin-ebf', fam(bf, b.font)); put(el, '@data-own-font', bf || null);
      } else if (x.type === 'message') {
        put(el, 'rich', b.text || ''); put(el, 'hidden', blank(b.text));
        put(el, '--cim-c', bool(b.enable_custom_style) ? color(b.color, 'var(--cin-bar-text)') : null); put(el, '--cim-ff', fam(bf, b.font));
        put(el, '@data-own-font', f || bf || null);
      } else if (x.type === 'cta') {
        const shape = s.use_theme_button === false || s.use_theme_button === 'false';
        button(c, el, {link: b.link, label: b.text, own: o, bg: s.cta_bg, text: s.cta_color, border: s.cta_border_color, hoverBg: s.cta_bg_hover, hoverText: s.cta_color_hover,
          shape, radius: px(s.cta_radius), py: px(s.cta_pad_y, 8), px: px(s.cta_pad_x, 18), fs: px(s.cta_size, 13), bw: px(s.cta_border_width)});
      }
    }
    margins(c, c.desk() ? s.section_margin_top_desktop : s.section_margin_top_mobile, c.desk() ? s.section_margin_bottom_desktop : s.section_margin_bottom_mobile);
  }

  /* ---------- Countdown Timer Pro 2 ---------- */
  function timer2(c) {
    const {root, s, put} = c, o = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), v = (k, x) => put(root, '--cd2-' + k, x);
    const ma = s.content_alignment_mobile || 'center';
    v('dir', s.layout_direction === 'timer_right' ? 'row-reverse' : 'row'); v('valign', s.vertical_alignment === 'top' ? 'flex-start' : s.vertical_alignment === 'bottom' ? 'flex-end' : 'center'); v('gap', px(s.gap_columns));
    v('m-align', ma); v('m-flex', ma === 'left' ? 'flex-start' : ma === 'right' ? 'flex-end' : 'center');
    v('size-m', px(s.circle_size_mobile, 64)); v('size-d', px(s.circle_size_desktop, 90)); v('round', num(s.circle_radius) + '%');
    v('circle', pick(o, s.circle_bg_color, 'var(--color-heading)')); v('num', pick(o, s.circle_text_color, 'var(--color-background)')); v('label', pick(o, s.label_color, 'var(--color-text)'));
    v('ns-m', px(s.number_font_size_mobile, 20)); v('ns-d', px(s.number_font_size_desktop, 26)); v('ls-m', px(s.label_font_size_mobile, 12)); v('ls-d', px(s.label_font_size_desktop, 14));
    v('cgap-m', px(s.gap_circles_mobile, 10)); v('cgap-d', px(s.gap_circles_desktop, 18));
    v('pt-m', px(s.padding_top_mobile)); v('pb-m', px(s.padding_bottom_mobile)); v('pt-d', px(s.padding_top)); v('pb-d', px(s.padding_bottom));
    v('hf', fam(f, s.heading_font)); v('bf', fam(f, s.body_font));
    put(root, '@data-cd2-width', str(s.section_width));
    units(c, u => bool(s[{d: 'show_days', h: 'show_hours', m: 'show_minutes', s: 'show_seconds'}[u]]), u => s[{d: 'days_label', h: 'hours_label', m: 'minutes_label', s: 'seconds_label'}[u]]);
    put(root, 'clock', [s.end_date, s.end_time, s.restart_period].join('|'));
    for (const x of c.blocks) {
      const b = x.b, el = x.el;
      if (x.type === 'heading' || x.type === 'description') {
        const h = x.type === 'heading', t = h ? b.heading : b.description, bf = bool(b.enable_custom_fonts), w = bool(b.enable_custom_font_weight);
        put(el, 'rich', t || ''); put(el, 'hidden', blank(t));
        put(el, '--cdb-c', bool(b.enable_custom_style) ? color(b.color, h ? 'var(--color-heading)' : 'var(--color-text)') : null);
        put(el, '--cdb-fs-m', px(b.font_size_mobile)); put(el, '--cdb-fs-d', px(b.font_size_desktop)); put(el, '--cdb-gap', px(b.gap_below));
        put(el, '--cdb-fw', w ? str(b.font_weight) : null); put(el, '--cdb-ff', fam(bf, b.font));
        put(el, '@data-own-font', f || bf || null); put(el, '@data-own-weight', w || null);
      } else if (x.type === 'button') {
        const shape = b.use_theme_button === false || b.use_theme_button === 'false';
        const el2 = button(c, el, {link: b.button_url, label: b.button_label, own: bool(b.enable_custom_style), bg: b.button_bg_color, text: b.button_text_color, border: b.button_border_color, hoverBg: b.button_hover_bg_color, hoverText: b.button_hover_text_color, hoverBorder: b.button_hover_border_color,
          shape, radius: px(b.button_border_radius), py: px(b.button_padding_y, 14), px: px(b.button_padding_x, 28), fs: null, bw: px(b.button_border_width), weight: bool(b.enable_custom_font_weight) ? str(b.font_weight) : ''});
        put(el2, '--cdb-bfs-m', shape ? px(b.button_font_size_mobile, 14) : null); put(el2, '--cdb-bfs-d', shape ? px(b.button_font_size, 15) : null);
      }
    }
    margins(c, c.desk() ? s.section_margin_top_desktop : s.section_margin_top_mobile, c.desk() ? s.section_margin_bottom_desktop : s.section_margin_bottom_mobile);
  }

  /* ---------- Countdown Timer Pro 1 ---------- */
  function timer1(c) {
    const {root, s, put} = c, o = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), legacy = bool(s.override_fonts), v = (k, x) => put(root, '--cd1-' + k, x);
    const sub = c.blocks.find(x => x.type === 'subheading'), subFont = legacy && sub ? font(sub.b.text_font) : '';
    v('bg', pick(o, s.section_background_color, 'var(--color-background)')); v('wrap-bg', pick(o, s.section_bg, 'transparent')); v('box-bg', pick(o, s.container_background_color, 'transparent'));
    v('num-bg', pick(o, s.countdown_background_color, 'color-mix(in srgb, var(--color-heading) 8%, var(--color-background))')); v('num', pick(o, s.timer_color, 'var(--color-heading)'));
    v('g1', pick(o, s.gradient_start_color, 'color-mix(in srgb, var(--color-heading) 65%, var(--color-background))')); v('g2', pick(o, s.gradient_middle_color, 'var(--color-heading)')); v('g3', pick(o, s.gradient_end_color, 'var(--color-heading)'));
    v('gdeg', str(s.gradient_degrees, '180deg'));
    v('l1', pick(o, s.hours_text_color, 'var(--color-text)')); v('l2', pick(o, s.minutes_text_color, 'var(--color-text)')); v('l3', pick(o, s.seconds_text_color, 'var(--color-text)'));
    v('img-bg', pick(o, s.section_background_image_color, 'transparent')); v('img-fit', str(s.section_background_size, 'cover')); v('bright', num(s.background_image_brightness, 100) + '%');
    v('pt-d', px(s.section_padding_top)); v('pb-d', px(s.section_padding_bottom)); v('px-d', px(s.section_padding_left_right));
    v('pt-m', px(s.mobile_section_padding_top)); v('pb-m', px(s.mobile_section_padding_bottom)); v('px-m', px(s.mobile_section_padding_left_right));
    v('cpt-d', px(s.container_padding_top)); v('cpb-d', px(s.container_padding_bottom)); v('cpx-d', px(s.container_padding_left_right));
    v('cpt-m', px(s.mobile_container_padding_top)); v('cpb-m', px(s.mobile_container_padding_bottom)); v('cpx-m', px(s.mobile_container_padding_left_right));
    v('max', px(s.container_max_width, 800)); v('text-gap', px(s.headline_spacing)); v('el-gap', px(s.element_spacing));
    v('align-d', str(s.text_alignment, 'center')); v('align-m', str(s.mobile_text_alignment, 'center')); v('t-align', s.timer_alignment === 'left' ? 'start' : s.timer_alignment === 'right' ? 'end' : 'center');
    v('col', px(s.item_width, 90)); v('gap-d', px(s.grid_gap)); v('gap-m', px(s.grid_gap_mobile)); v('num-pad', px(s.countdown_padding)); v('num-r', px(s.countdown_background_border_radius));
    v('ns-d', px(s.timer_size, 41)); v('ns-m', px(s.timer_size_mobile, 41)); v('nw', s.countdown_font_weight === 'light' ? '300' : s.countdown_font_weight === 'bold' ? '700' : '400');
    v('ls-d', px(s.label_size, 16)); v('ls-m', px(s.mobile_label_size, 16));
    v('hf', f ? font(s.heading_font) || null : subFont || null); v('bf', f ? font(s.body_font) || null : subFont || null);
    const img = bool(s.enable_background_image_url) && s.section_background_image_url && s.section_background_image_url !== '/' ? s.section_background_image_url : s.section_background_image ? url(s.section_background_image) || (typeof s.section_background_image === 'object' ? s.section_background_image.src || s.section_background_image.url : '') : '';
    v('img', img ? 'url("' + img + '")' : null);
    put(root, '@data-cd1-width', str(s.section_width)); put(root, '@data-cd1-show', str(s.show_on_device, 'all'));
    const sec = c.q('.cd1'); put(sec, '@data-cd1-boxed', bool(s.enable_countdown_background) || null); put(sec, '@data-cd1-gradient', bool(s.enable_timer_gradient) || null);
    put(c.q('[data-cd-show="s"]'), 'hidden', s.show_seconds === false || s.show_seconds === 'false');
    for (const [u, k] of [['h', 'hours_text'], ['m', 'minutes_text'], ['s', 'seconds_text']]) put(c.q('[data-cd-label="' + u + '"]'), 'rich', s[k] || '');
    put(root, 'clock', [s.start_hours, s.start_minutes, s.start_seconds].join(':'));
    for (const x of c.blocks) {
      const b = x.b, el = x.el, bf = bool(b.enable_custom_fonts) || legacy, own = bool(b.enable_custom_style);
      if (x.type === 'heading') {
        const w = {light: '300', normal: '400', bold: '700'}[b.heading_text_weight] || null, lh = b.headline_line_height && b.headline_line_height !== 'inherit' ? String(b.headline_line_height) : null;
        put(el, 'rich', b.headline || ''); put(el, 'hidden', blank(b.headline));
        put(el, '--cdb-fs-d', px(b.headline_size, 35)); put(el, '--cdb-fs-m', px(b.mobile_headline_size, 35));
        put(el, '--cdb-c', own ? color(b.headline_color, 'var(--color-heading)') : null); put(el, '--cdb-fw', w); put(el, '--cdb-lh', lh); put(el, '--cdb-ff', fam(bf, b.headline_font));
        put(el, '@data-own-font', f || bf || null); put(el, '@data-own-weight', !!w || null); put(el, '@data-own-size', !!lh || null);
      } else if (x.type === 'subheading') {
        const lh = b.text_line_height && b.text_line_height !== 'inherit' ? String(b.text_line_height) : null;
        put(el, 'rich', b.text || ''); put(el, 'hidden', blank(b.text));
        put(el, '--cdb-fs-d', px(b.text_size, 16)); put(el, '--cdb-fs-m', px(b.mobile_text_size, 15));
        put(el, '--cdb-c', own ? color(b.text_color, 'var(--color-text)') : null); put(el, '--cdb-link', own ? color(b.link_color, 'var(--color-primary)') : null);
        put(el, '--cdb-lh', lh); put(el, '--cdb-ff', fam(bf, b.text_font)); put(el, '@data-own-font', f || bf || null);
      }
    }
    margins(c, c.desk() ? s.section_margin_top_desktop : s.section_margin_top_mobile, c.desk() ? s.section_margin_bottom_desktop : s.section_margin_bottom_mobile);
  }

  /* ---------- Countdown Timer Pro 3 ---------- */
  const CD3 = {small: ['20px', '24px', '12px', '12px'], medium: ['24px', '32px', '14px', '16px'], large: ['32px', '48px', '16px', '20px']};
  function timer3(c) {
    const {root, s, put} = c, o = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts), v = (k, x) => put(root, '--cd3-' + k, x);
    v('bg', pick(o, s.section_background, 'var(--color-background)')); v('done', pick(o, s.completed_message_color, 'var(--color-text)'));
    v('vm-m', px(s.vertical_margin_mobile)); v('vm-d', px(s.vertical_margin)); v('vp-m', px(s.vertical_padding_mobile)); v('vp-d', px(s.vertical_padding));
    v('align-m', str(s.text_alignment_mobile, 'center')); v('align-d', str(s.text_alignment, 'left'));
    const mw = str(s.section_max_width).trim().replace(/px$/, ''); v('max', !mw || mw === '0' ? 'none' : mw + 'px'); v('width', num(s.inner_width, 100) + '%');
    v('hf', fam(f, s.heading_font)); v('bf', fam(f, s.body_font));
    put(root, '@data-cd3-width', str(s.section_width)); put(root, '@data-cd3-desktop', str(s.timer_position_desktop, 'left')); put(root, '@data-cd3-mobile', str(s.timer_position_mobile, 'above'));
    put(root, '@data-cd3-hide', bool(s.hide_section) || null);
    const done = c.q('[data-cd-expired]'); if (done) put(done, 'text', str(s.completed_message));
    let texts = 0, timer = null;
    for (const x of c.blocks) {
      const b = x.b, el = x.el, bf = bool(b.enable_custom_fonts), own = bool(b.enable_custom_style);
      if (x.type !== 'timer' && x.type !== 'button') { put(el, '--cdb-ff', fam(bf, b.font)); put(el, '@data-own-font', f || bf || null); }
      if (x.type === 'heading') {
        const w = b.heading_style === 'regular' ? '400' : b.heading_style === 'bold' ? '600' : null;
        put(el, 'rich', b.heading || ''); put(el, 'hidden', blank(b.heading)); if (!blank(b.heading)) texts++;
        put(el, '--cdb-fs', px(b.heading_size, 32)); put(el, '--cdb-c', own ? color(b.heading_color, 'var(--color-heading)') : null); put(el, '--cdb-fw', w); put(el, '@data-own-weight', !!w || null);
      } else if (x.type === 'caption') {
        put(el, 'text', str(b.caption)); put(el, 'hidden', blank(b.caption)); if (!blank(b.caption)) texts++;
        put(el, '--cdb-fs', px(b.caption_size, 16)); put(el, '--cdb-fw', str(b.caption_weight, '400')); put(el, '--cdb-c', own ? color(b.caption_color, 'var(--color-text)') : null);
      } else if (x.type === 'text') {
        put(el, 'rich', b.description || ''); put(el, 'hidden', blank(b.description)); if (!blank(b.description)) texts++;
        put(el, '--cdb-fs', px(b.description_size, 16)); put(el, '--cdb-c', own ? color(b.description_color, 'var(--color-text)') : null);
      } else if (x.type === 'button') {
        put(el, 'hidden', blank(b.primary_button_label)); if (!blank(b.primary_button_label)) texts++;
        const btn = el.querySelector('[data-cd-btn]'); if (!btn) continue;
        const sty = b.primary_button_style || 'solid', lk = sty === 'link', shape = !lk && (b.use_theme_button === false || b.use_theme_button === 'false');
        const a = put(btn, 'href', url(b.primary_button_link) || '');
        put(a, 'text', str(b.primary_button_label));
        put(a, '@class', lk ? 'cd3__link cd3__btn--link' : 'cd3__btn cd3__btn--' + sty);
        put(a, '@data-theme-button', lk ? null : 'primary'); put(a, '@data-sl-button', !lk || null);
        put(a, '@data-button-appearance', sty === 'outline' ? 'outline' : null); put(a, '@data-own-shape', shape || null);
        put(a, '@target', bool(b.primary_new_tab) ? '_blank' : null); put(a, '@rel', bool(b.primary_new_tab) ? 'noopener noreferrer' : null);
        put(a, '--cdb-link', lk && own ? color(b.primary_text_color, 'var(--color-heading)') : null);
        put(a, '--mb-bg', !lk && own && sty === 'solid' ? color(b.primary_background_color, 'var(--btn-primary-bg-color)') : null);
        put(a, '--mb-border', !lk && own && sty !== 'solid' ? color(b.primary_border_color, 'var(--btn-primary-border-color, var(--btn-primary-bg-color))') : null);
        put(a, '--mb-text', !lk && own ? color(b.primary_text_color, 'var(--btn-primary-color)') : null);
        put(a, '--mb-radius', shape ? px(b.primary_button_corner) : null); put(a, '--mb-padding-y', shape ? '16px' : null); put(a, '--mb-padding-x', shape ? '20px' : null); put(a, '--mb-font-size', shape ? '14px' : null);
      } else if (x.type === 'timer') {
        timer = b;
        const z = CD3[b.countdown_size] || CD3.medium;
        put(el, '--cdt-num', own ? color(b.numbers_color, 'var(--color-heading)') : null); put(el, '--cdt-text', own ? color(b.text_color, 'var(--color-text)') : null);
        put(el, '--cdt-ns-m', z[0]); put(el, '--cdt-ns-d', z[1]); put(el, '--cdt-ts-m', z[2]); put(el, '--cdt-ts-d', z[3]);
        put(el, '--cdt-fw', b.numbers_style === 'regular' ? '400' : '600'); put(el, '--cdt-ff', fam(bf, b.font)); put(el, '@data-own-font', f || bf || null);
        const lab = {d: b.days_label, h: b.hours_label, m: b.minutes_label, s: b.seconds_label};
        for (const l of el.querySelectorAll('[data-cd-unit-label]')) { put(l, 'text', str(lab[l.dataset.cdLabel])); put(l, 'hidden', bool(b.show_numbers)); }
      }
    }
    put(root, '@data-cd3-only-timer', texts === 0 || null);
    put(root, 'clock', timer ? [timer.end_date, timer.end_time].join('|') : 'none');
    margins(c, c.desk() ? s.section_margin_top_desktop : s.section_margin_top_mobile, c.desk() ? s.section_margin_bottom_desktop : s.section_margin_bottom_mobile);
  }
  const timerBlock = st => { for (const [id, b] of st.blocks) { const el = st.root.querySelector('[data-cd-block="' + CSS.escape(id) + '"]'); if (el && el.dataset.cdType === 'timer') return b; } return null; };

  /* ---------- section types ---------- */
  const TYPES = {
    'countdown-flip': {derive: flip, bp: 768, clock: s => ({end: iso(s.end_iso)})},
    'countdown-inline': {derive: inline, bp: 768, clock: s => ({end: iso(s.end_iso)})},
    'countdown-timer1': {derive: timer1, bp: 801, clock: s => { const h = num(s.start_hours), m = num(s.start_minutes), x = num(s.start_seconds); return {total: (h * 3600 + m * 60 + x) * 1000, version: [h, m, x].join(':')}; }},
    'countdown-timer3': {derive: timer3, bp: 992, clock: (s, st) => { const b = timerBlock(st); return b ? {end: mdy(b.end_date, b.end_time)} : {none: true}; }},
    'countdown-timer2': {derive: timer2, bp: 768, clock: s => ({end: local(s.end_date, s.end_time), restart: str(s.restart_period, 'none')})},
  };

  /* ---------- the timer ---------- */
  const store = (() => {
    const mem = {};
    try { const t = '__cd__'; localStorage.setItem(t, '1'); localStorage.removeItem(t); return localStorage; } catch (_) { return {getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }}; }
  })();
  /* Pro 1: a fixed time per visitor; the end is kept per section until the time setting changes, then starts again */
  function loopEnd(st, now) {
    const c = st.clock, key = 'loudecomzCountdownTarget_' + st.id, ver = 'loudecomzCountdownVersion_' + st.id;
    let end = parseInt(store.getItem(key), 10);
    if (!Number.isFinite(end) || store.getItem(ver) !== c.version || end - now > c.total) { end = now + c.total; store.setItem(key, String(end)); store.setItem(ver, c.version); }
    if (end <= now) { end = now + c.total - ((now - end) % Math.max(1000, c.total)); store.setItem(key, String(end)); }
    return end;
  }
  function advance(end, period) {
    if (period === 'daily') return end + 86400000;
    if (period === 'weekly') return end + 7 * 86400000;
    if (period === 'monthly') { const d = new Date(end); d.setMonth(d.getMonth() + 1); return d.getTime(); }
    return NaN;
  }
  function tick(st) {
    clearTimeout(st.timer); st.timer = 0;
    const root = st.root; if (!root.isConnected) return;
    if (st.clockDirty || !st.clock) { st.clock = st.type.clock(st.s, st); st.clockDirty = false; st.loopTarget = 0; }
    const c = st.clock, now = Date.now();
    let state, left = 0, end = c.end;
    if (c.none) state = 'static';
    else if (c.total != null) {
      if (!(c.total > 0)) state = 'expired';
      else { end = loopEnd(st, now); left = Math.ceil((end - now) / 1000); state = 'running'; }
    } else if (!Number.isFinite(end)) state = 'unset';
    else {
      if (c.restart && c.restart !== 'none' && end <= now) {
        const step = c.restart === 'daily' ? 86400000 : c.restart === 'weekly' ? 7 * 86400000 : 0;
        if (step) end += Math.floor((now - end) / step + 1) * step;
        else { let guard = 0; while (end <= now && guard++ < 100000) end = advance(end, c.restart); }
        c.end = end;
      }
      left = Math.max(0, Math.floor((end - now) / 1000));
      state = left > 0 ? 'running' : 'expired';
    }
    const parts = c.total != null ? {d: 0, h: Math.floor(left / 3600), m: Math.floor(left % 3600 / 60), s: left % 60} : {d: Math.floor(left / 86400), h: Math.floor(left % 86400 / 3600), m: Math.floor(left % 3600 / 60), s: left % 60};
    for (const el of st.digits) {
      const t = pad(parts[el.dataset.cdUnit]);
      if (el.textContent !== t) {
        el.textContent = t;
        if (el.dataset.cdUnit === 's' && el.hasAttribute('data-cd-pulse') && !reduced.matches) { el.classList.remove('is-tick'); void el.offsetWidth; el.classList.add('is-tick'); }
      }
    }
    if (root.dataset.cdState !== state) { root.dataset.cdState = state; if (st.type.state) st.type.state(st, state); }
    st.ticks++;
    if (state === 'running' && st.visible && !document.hidden) st.timer = setTimeout(() => tick(st), 1000 - (Date.now() % 1000) + 8);
  }
  const running = st => { if (st.visible && !document.hidden) { if (!st.timer) tick(st); } else { clearTimeout(st.timer); st.timer = 0; } };

  /* ---------- reveal on scroll (Pro 1, 2, 3): once, on a visitor's page, never in the builder or under reduced motion ---------- */
  function reveal(st) {
    const el = st.root.matches('[data-cd-reveal]') ? st.root : st.root.querySelector('[data-cd-reveal]');
    if (!el || el.classList.contains('is-revealed')) return;
    if (reduced.matches || design()) { el.classList.add('is-revealed'); return; }
    if (st.visible) el.classList.add('is-revealed');
  }

  /* ---------- derive and paint ---------- */
  function derive(root, st, record) {
    const out = [];
    const put = (el, key, v) => {
      if (!el) return el;
      if (record === 'audit') { out.push([el, key, v]); return el; }
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      const prev = m.get(key); m.set(key, v);
      return write(el, key, v, prev, st) || el;
    };
    const blocks = [...root.querySelectorAll(BLOCK)].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.cdBlock;
      if (st.rawBlocks.get(id) !== el.dataset.cdSettings) { st.rawBlocks.set(id, el.dataset.cdSettings); st.blocks.set(id, {...parse(el.dataset.cdSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.cdType, b: st.blocks.get(id) || {}};
    });
    const c = {root, st, s: st.s, put, blocks, audit: record === 'audit', q: sel => root.querySelector(sel), desk: () => st.mq.matches};
    scheme(c);
    st.type.derive(c);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.cdSettings) { st.raw = root.dataset.cdSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    st.digits = [...root.querySelectorAll('[data-cd-unit]')];
    if (st.clockDirty) tick(st);
  }
  function drop(root, st) {
    clearTimeout(st.timer); st.timer = 0;
    st.mq.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame); if (st.io) st.io.disconnect(); roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.cdRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const st = {root, type, id: root.dataset.cdSection || '', live: {}, liveBlocks: new Map(), s: parse(root.dataset.cdSettings), raw: root.dataset.cdSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), mq: matchMedia('(min-width: ' + type.bp + 'px)'), visible: false, timer: 0, ticks: 0, clock: null};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule);
    roots.set(root, st);
    derive(root, st, true);
    st.clockDirty = false;
    st.digits = [...root.querySelectorAll('[data-cd-unit]')];
    if (design()) root.setAttribute('data-cd-editor', ''); else root.removeAttribute('data-cd-editor');
    if ('IntersectionObserver' in window) {
      st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; root.toggleAttribute('data-cd-paused', !st.visible); reveal(st); running(st); });
      st.io.observe(root);
    } else { st.visible = true; }
    tick(st);
    reveal(st);
    root.dataset.cdReady = '';
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll(SEL)) { const st = roots.get(root); if (st) st.schedule(); else add(root); }
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id || v.sectionId || '' : v || '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId || d.section_id); if (!id || !d.settings) return;
    const bRaw = d.block || d.blockId || d.block_id, bid = bRaw ? String(bRaw.id || bRaw) : '';
    for (const [root, st] of roots) {
      if (st.id !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const st of roots.values()) running(st); });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',' + BLOCK) || n.querySelector(SEL + ',' + BLOCK));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',' + BLOCK) : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-cd-settings']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'text') { have = el.textContent.trim(); want = String(v == null ? '' : v).trim(); }
      else if (key === 'href') { have = el.getAttribute('href') || ''; want = v || ''; }
      else continue;
      if (have !== want) bad.push((el.dataset.cdBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  const pending = () => [...roots.values()].filter(st => st.timer).length;
  window.MateriaCountdown = {scan, audit, roots, pending, calendarOk, parse: {iso, local, mdy}};
  scan();
})();
