/* Materia Themes. Popups and custom code: Custom HTML (custom-html), Custom
   code (custom-liquid), Order notification (fake-order), Promotion popup
   (promotion-popup) and Size Chart Popup (size-chart-popup). Loaded on every
   page by layout/theme.storelib.

   Live edits: every root [data-pc-root] carries its settings as JSON and
   every block its own ([data-pc-block]). derive() turns them into outputs (a
   CSS variable, an attribute, a class, text) per element, the same values
   the Liquid prints, so on load the first derive is only recorded. After
   that an output is written only when its value changes, once per frame per
   root: a picture never reloads, an open popup stays open and a running
   notification keeps its place for an unrelated edit. audit() lists outputs
   whose markup differs (tests).

   Custom HTML and Custom code: only the wrapper is touched (scheme, width,
   Show on, spacing). The creator's code is never rewritten here; the
   builder redraws it, so a script in it runs the way it was written.

   Popups: native <dialog>. On the live site showModal() (Escape, the close
   button and a click on the backdrop close it, focus goes back to what
   opened it, the page does not scroll behind it). In the builder nothing
   opens on a timer and nothing blocks the page: a popup opens in the page
   (show(), not modal) while its section or one of its blocks is selected or
   edited, and Escape or its close button closes it.

   Order notification: per card, first after "First one after", shown for
   "Each shows for" (the progress bar fills), then hidden for "Gap between",
   with a product picked from the store's own list each time. The timers stop
   while the tab is hidden and are cleared when the card leaves the page; in
   the builder the card shows without timers. Reduced motion: no movement. */
(() => {
  if (window.MateriaPopupsCode) return;
  const SEL = '[data-pc-root]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const off = v => v === false || v === 'false';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => { const c = api() && api().color ? api().color(v, f) : localColor(v, f); return c == null || c === '' ? f : c; };
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image = false) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };
  /* a font picker value, printed as the Liquid does: family, fallbacks */
  const font = v => v && typeof v === 'object' ? (v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '') : '';
  const strip = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '');
  const blank = v => !strip(v).trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const design = () => !!(window.Shopify && window.Shopify.designMode) || document.documentElement.classList.contains('shopify-design-mode');
  const store = {
    get(k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (_) { return null; } },
    set(k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (_) { /* private mode */ } },
  };

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = strip(value);
  }
  function cells(el, value, tag) {
    const list = String(value || '').split('|');
    el.replaceChildren(...list.map((c, i) => {
      const n = document.createElement(tag === 'head' ? 'th' : i === 0 ? 'th' : 'td');
      if (n.tagName === 'TH') n.scope = tag === 'head' ? 'col' : 'row';
      n.textContent = c.trim();
      return n;
    }));
  }
  function media(el, v) {
    const d = parse(v), cur = el.querySelector(':scope > img, :scope > svg');
    if (d.t === 'img' && cur && cur.tagName === 'IMG' && cur.getAttribute('src') === d.src) { cur.alt = d.alt || ''; return; }
    let n;
    if (d.t === 'img') { n = document.createElement('img'); n.alt = d.alt || ''; if (d.w && d.h) { n.width = d.w; n.height = d.h; } n.loading = 'lazy'; n.decoding = 'async'; n.src = d.src; }
    else { if (cur && cur.tagName !== 'IMG') return; const t = document.createElement('template'); t.innerHTML = '<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="400" height="300" fill="currentColor" opacity=".08"/><g fill="currentColor" opacity=".35"><circle cx="172" cy="124" r="14"/><path d="M140 192l40-46 25 28 20-18 35 36z"/></g></svg>'; n = t.content.firstChild; }
    if (cur) cur.replaceWith(n); else el.prepend(n);
  }
  function write(el, key, v, prev) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '?') el.classList.toggle(key.slice(1), !!v);
    else if (key[0] === '.') { if (prev) el.classList.remove(prev); if (v) el.classList.add(v); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'head') cells(el.querySelector('tr') || el.appendChild(document.createElement('tr')), v, 'head');
    else if (key === 'row') cells(el, v, 'row');
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'media') media(el, v);
  }

  /* ---------- shared derive pieces ---------- */
  const scheme = c => { const v = c.s.color_scheme && c.s.color_scheme.id || c.s.color_scheme; if (typeof v === 'string' && /^[\w-]+$/.test(v)) c.put(c.root, 'scheme', v); };
  const first = (c, type) => (c.blocks.find(x => x.type === type) || {}).b;

  /* Custom HTML / Custom code: the wrapper only */
  function code(c) {
    const {root, s, put} = c, pt = num(s.padding_top), pb = num(s.padding_bottom), w = s.section_width || 'fluid_container';
    scheme(c);
    put(root, '--section-pt', String(pt)); put(root, '--section-pb', String(pb));
    put(root, '?pt-min', pt < 30); put(root, '?pb-min', pb < 30); put(root, '?remove_spacing', bool(s.reset_spacing));
    put(root, '@data-pc-show', s.show_section_on || 'all');
    const inner = c.q('[data-pc-width]');
    put(inner, '.width', w); put(inner, '@data-pc-width', w);
  }

  /* Order notification: every setting is in a block */
  const ANIM = {'None': 'none', 'Zoom in - Zoom Out': 'zoom', 'Fade Up - Fade Down': 'up', 'Slide In - Slide Out': 'slide', 'Normal Original Animation': 'rise', 'Reveal In - Reveal Out': 'reveal'};
  function fakeOrder(c) {
    const {root, s, put, st} = c, L = first(c, 'layout'), A = first(c, 'animation'), P = first(c, 'products'), T = first(c, 'text'), G = first(c, 'background'), C = first(c, 'colors');
    const i18n = st.i18n || (st.i18n = parse(root.dataset.foI18n));
    scheme(c);
    put(root, '@data-fo-enabled', !off(s.section_enabled) ? 'true' : 'false');
    put(root, '@data-fo-side', L ? L.position || 'left' : 'left');
    put(root, '@data-fo-mobile', L && off(L.show_on_mobile_fake_order) ? 'false' : 'true');
    put(root, '--fo-radius', px(L ? L.border_radius : 5, 5));
    put(c.q('[data-fo-progress]'), 'hidden', !!(L && bool(L.disable_progress_bar)));
    const dur = A ? num(A.animation_duration, 15000) || 15000 : 15000;
    put(root, '@data-fo-anim', ANIM[A && A.notification_animation] || 'fade');
    put(root, '--fo-dur', dur + 'ms');
    put(root, '@data-anim-duration', String(dur));
    put(root, '@data-time-delay', String(A && A.delay_time !== '' && A.delay_time != null ? A.delay_time : '500'));
    put(root, '@data-show-gap', String(A ? num(A.show_gap_seconds, 10) || 10 : 10));
    /* buyers: only the names the creator typed */
    const users = String(P && P.fake_user || '').trim().split('|').map(x => x.trim()).filter(Boolean);
    st.users = users; st.fallback = P && P.buyer_fallback || 'Someone';
    if (!st.running) put(c.q('[data-user]'), 'text', users[0] || st.fallback);
    /* text */
    put(root, '@aria-label', strip(T ? T.heading_text || 'Latest Orders' : 'Latest Orders'));
    put(c.q('[data-fo-purchased]'), 'text', T && !blank(T.purchased_text) ? T.purchased_text : i18n.purchased || 'purchased');
    put(c.q('[data-fo-time-text]'), 'text', T && !blank(T.time_text) ? T.time_text : i18n.time || 'minutes ago');
    const verify = c.q('[data-fo-verify]'), vText = T ? T.text_verify : 'Verify';
    put(verify, 'hidden', blank(vText));
    put(c.q('[data-fo-verify-text]'), 'rich', vText || '');
    put(verify, '@href', T ? url(T.verify_text_url) || '/' : '/');
    put(c.q('[data-fo-arrow]'), '@hidden', !!(T && off(T.enable_verify_arrow)));
    put(root, '@data-fo-underline', T && bool(T.enable_underline_product_name_title) ? 'true' : 'false');
    put(c.q('[data-fo-close]'), 'hidden', !!(T && off(T.enable_close_button)));
    const ct = !!(T && bool(T.enable_custom_style));
    put(root, '--fo-link', ct ? color(T.verify_text_color, 'var(--color-primary)') : null);
    put(root, '--fo-link-hover', ct ? color(T.verify_text_hover_color, 'var(--color-heading)') : null);
    put(root, '--fo-close', ct ? color(T.close_button_color, 'var(--color-heading)') : null);
    put(root, '--fo-title', ct ? color(T.title_color, 'var(--color-heading)') : null);
    const f = !!(T && bool(T.enable_custom_fonts));
    put(root, '--fo-font', f && font(T.font) || null); put(root, '--fo-title-font', f && font(T.title_font) || null);
    const z = !!(T && bool(T.enable_custom_size));
    put(root, '--fo-fs', z ? px(T.text_size, 13) : null); put(root, '--fo-title-fs', z ? px(T.title_size, 15) : null);
    const tw = T && T.title_weight || 'theme';
    put(root, '--fo-title-fw', tw !== 'theme' ? tw : null);
    /* background */
    put(root, '@data-fo-bg', G ? (bool(G.enable_glassmorphism) ? 'glass' : off(G.enable_gradient) ? 'solid' : 'gradient') : 'gradient');
    put(root, '--fo-angle', (G && G.gradient_degrees || '45') + 'deg');
    put(root, '--fo-blur', px(G ? G.glassmorphism_blur : 10, 10)); put(root, '--fo-bright', String(num(G ? G.glassmorphism_brightness : 0.9, 0.9))); put(root, '--fo-gb-w', px(G ? G.glassmorphism_border_width : 1, 1));
    const cg = !!(G && bool(G.enable_custom_style));
    put(root, '--fo-g1', cg ? color(G.gradient_start_color, 'var(--color-background)') : null);
    put(root, '--fo-g2', cg ? color(G.gradient_middle_color, 'var(--color-background)') : null);
    put(root, '--fo-g3', cg ? color(G.gradient_end_color, 'var(--color-background)') : null);
    put(root, '--fo-gb-c', cg ? color(G.glassmorphism_border_color, 'var(--color-border)') : null);
    const cc = !!(C && bool(C.enable_custom_style));
    put(root, '--fo-bg', cc ? color(C.background_color, 'var(--color-background)') : null);
    put(root, '--fo-text', cc ? color(C.text_color, 'var(--color-text)') : null);
    put(root, '--fo-progress', cc ? color(C.progress_bar_color, 'var(--color-primary)') : null);
  }

  /* Promotion popup */
  function promo(c) {
    const {root, s, put, st} = c, o = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts);
    const i18n = st.i18n || (st.i18n = parse(root.dataset.ppI18n));
    scheme(c);
    put(root, '--pp-w', px(s.promotion_width, 690)); put(root, '--pp-banner', num(s.banner_width, 36.5) + '%');
    const align = s.text_align || 'center';
    put(root, '--pp-align', align); put(root, '@data-pp-align', align); put(root, '--pp-overlay-o', String(num(s.overlay_opacity, 50)));
    put(root, '--pp-bg', o ? color(s.popup_bg, 'var(--color-background)') : null);
    put(root, '--pp-heading', o ? color(s.heading_color, 'var(--color-heading)') : null);
    put(root, '--pp-text', o ? color(s.text_color, 'var(--color-text)') : null);
    put(root, '--pp-overlay', o ? color(s.overlay_color, '#000000') : null);
    put(root, '--pp-radius', o ? px(s.popup_radius, 0) : null);
    put(root, '--pp-hf', f && font(s.heading_font) || null); put(root, '--pp-bf', f && font(s.body_font) || null);
    const sel = s.show_promotion_select;
    put(root, '@data-pp-show', sel === 'hide_promotion' ? 'hidden' : sel === 'show_promotion_homepage' || sel == null ? (root.dataset.ppIndex === 'true' ? 'show-on-homepage' : 'hidden') : 'show-on-all-pages');
    put(root, '@data-pp-mobile', bool(s.show_promotion_mobile) ? 'true' : 'false');
    put(root, '@data-pp-preview', off(s.editor_preview) ? 'false' : 'true');
    put(root, '@data-pp-delay', String(num(s.delay, 15)));
    put(root, '@data-pp-days', String(num(s.hide_days, 1)));
    const m = c.q('[data-pp-media]'), src = url(s.promotion_banner, true);
    put(m, 'hidden', !src && !design());
    put(m, 'media', JSON.stringify(src ? {t: 'img', src, alt: s.promotion_banner && s.promotion_banner.alt || '', w: s.promotion_banner && s.promotion_banner.width || 0, h: s.promotion_banner && s.promotion_banner.height || 0} : {t: 'ph'}));
    const coupon = first(c, 'coupon'), code = coupon ? coupon.code || '' : s.promotion_code || '';
    for (const x of c.blocks) {
      const b = x.b, el = x.el, own = bool(b.enable_custom_style), bf = bool(b.enable_custom_fonts) && font(b.font), size = bool(b.size_enable);
      if (x.type === 'coupon') {
        const btn = el.querySelector('[data-pp-copy]'), shape = off(b.use_theme_button);
        put(el, 'hidden', blank(b.code) && !design());
        put(btn, '@data-code', b.code || '');
        put(btn, '@aria-label', b.copy_label || 'Copy the code');
        const v = el.querySelector('[data-pp-code-value]');
        if (blank(b.code)) put(v, 'rich', design() ? '<span class="pp__empty">Add a code in this block</span>' : ''); else put(v, 'text', b.code);
        put(el.querySelector('[data-pp-code-done]'), 'text', b.copied_text || i18n.copied || 'Copied');
        put(btn, '@data-own-font', !!bf); put(btn, '--mb-font', bf || null);
        put(btn, '@data-own-shape', shape);
        const bg = own ? color(b.bg_color, '') : '', hb = own ? color(b.bg_color_hover, '') : '';
        put(btn, '--mb-bg', bg || null); put(btn, '--mb-text', own && color(b.text_color, '') || null); put(btn, '--mb-border', bg || null);
        put(btn, '--mb-hover-bg', hb || null); put(btn, '--mb-hover-text', own && color(b.text_color_hover, '') || null); put(btn, '--mb-hover-border', hb || null);
        put(btn, '--mb-radius', shape ? px(b.radius, 0) : null); put(btn, '--mb-font-size', shape ? px(b.font_size, 14) : null);
        put(btn, '--mb-padding-y', shape ? px(b.padding_y, 14) : null); put(btn, '--mb-padding-x', shape ? px(b.padding_x, 26) : null);
        continue;
      }
      const target = x.type === 'dismiss' ? el.querySelector('span') : el;
      if (x.type === 'text') put(target, 'rich', String(b.text || '').split('[promotion_code]').join(code));
      else if (x.type === 'heading' || x.type === 'subheading') put(target, 'rich', b.text || '');
      else if (x.type === 'dismiss') put(target, 'text', b.text || '');
      else continue;
      put(el, 'hidden', blank(b.text));
      put(el, '--pb-c', own ? color(b.color, x.type === 'heading' ? 'var(--pp-heading, var(--color-heading))' : 'var(--pp-text, var(--color-text))') : null);
      put(el, '--pb-ff', bf || null);
      put(el, '@data-own-font', !!bf || (f && (x.type === 'heading' || x.type === 'text')));
      if (x.type === 'heading') {
        const w = bool(b.weight_enable);
        put(el, '--pb-fw', w ? String(b.weight || 700) : null); put(el, '@data-own-weight', w);
        put(el, '--pb-fs-d', size ? px(b.size_desktop, 40) : null); put(el, '--pb-fs-m', size ? px(b.size_mobile, 30) : null);
        put(el, '--pb-lh', size ? String(num(b.line_height, 1.15)) : null); put(el, '--pb-ls', size ? px(b.tracking, 0) : null);
        put(el, '@data-own-size', size);
      } else put(el, '--pb-fs', size ? px(b.size, 16) : null);
    }
    const lt = c.q('[data-pc-legacy="promotion_content"]');
    if (lt && !c.blocks.some(x => x.type === 'text')) put(lt, 'rich', String(s.promotion_content || '').split('[promotion_code]').join(code));
  }

  /* Size Chart Popup */
  function sizeChart(c) {
    const {root, s, put, st} = c, o = bool(s.enable_custom_style), f = bool(s.enable_custom_fonts);
    const i18n = st.i18n || (st.i18n = parse(root.dataset.scsI18n));
    scheme(c);
    put(root, '--scs-align', s.align || 'left'); put(root, '--scs-mt', px(s.margin_top)); put(root, '--scs-mb', px(s.margin_bottom));
    put(root, '--scs-trig-fs', px(s.trig_size, 16)); put(root, '--scs-trig-fw', String(s.trig_weight || '600')); put(root, '--scs-gap', px(s.trig_gap, 8));
    put(root, '--scs-pad-y', px(s.trig_pad_y, 8)); put(root, '--scs-pad-x', px(s.trig_pad_x, 0)); put(root, '--scs-icon', px(s.icon_size, 18));
    put(root, '--scs-title-fs', px(s.title_size, 20)); put(root, '--scs-pad', px(s.modal_padding, 24)); put(root, '--scs-mw-d', px(s.modal_width_d, 720)); put(root, '--scs-mw-m', px(s.modal_width_m, 360));
    put(root, '--scs-trig', o ? color(s.trig_color, 'var(--color-text)') : null);
    put(root, '--scs-icon-c', o ? color(s.icon_color, 'var(--scs-trig)') : null);
    put(root, '--scs-title', o ? color(s.title_color, 'var(--color-heading)') : null);
    put(root, '--scs-bg', o ? color(s.modal_bg, 'var(--color-background)') : null);
    put(root, '--scs-text', o ? color(s.text_color, 'var(--color-text)') : null);
    put(root, '--scs-tb', o ? color(s.table_border_color, 'var(--color-border)') : null);
    put(root, '--scs-ts', o ? color(s.table_stripe_color, 'color-mix(in srgb, var(--color-text) 5%, var(--color-background))') : null);
    put(root, '--scs-radius', o ? px(s.modal_radius, 16) : null);
    put(root, '--scs-hf', f && font(s.heading_font) || null); put(root, '--scs-bf', f && font(s.body_font) || null);
    for (const sel of ['[data-scs-open]', '[data-scs-title]', '.scs__body']) put(c.q(sel), '@data-own-font', f);
    put(root, '@data-scs-underline', bool(s.underline_text) ? 'true' : 'false');
    put(c.q('[data-scs-icon]'), 'hidden', !bool(s.show_icon));
    put(c.q('[data-scs-label]'), 'text', s.trig_text || i18n.title || 'Size Guide');
    put(c.q('[data-scs-title]'), 'text', s.modal_title || i18n.title || 'Size Guide');
    const table = c.q('[data-scs-table]');
    if (table) {
      const rows = c.blocks.filter(x => x.type === 'row');
      put(c.q('[data-scs-headers]'), 'hidden', blank(s.headers));
      put(c.q('[data-scs-headers]'), 'head', s.headers || '');
      const legacyRows = !rows.length && [1, 2, 3, 4, 5, 6, 7, 8].some(n => !blank(s['row_' + n]));
      put(table, 'hidden', blank(s.headers) && !rows.length && !legacyRows);
      for (const x of rows) { put(x.el, 'row', x.b.cells || ''); put(x.el, 'hidden', blank(x.b.cells)); }
    }
    for (const x of c.blocks) if (x.type === 'notes') { put(x.el, 'rich', x.b.text || ''); put(x.el, 'hidden', blank(x.b.text)); }
  }

  const TYPES = {
    'custom-html': {derive: code, margins: (s, d) => [s['section_margin_top_' + (d ? 'desktop' : 'mobile')], s['section_margin_bottom_' + (d ? 'desktop' : 'mobile')]], reset: s => bool(s.reset_spacing)},
    'custom-liquid': {derive: code, margins: (s, d) => [s['section_margin_top_' + (d ? 'desktop' : 'mobile')], s['section_margin_bottom_' + (d ? 'desktop' : 'mobile')]], reset: s => bool(s.reset_spacing)},
    'fake-order': {derive: fakeOrder, init: foInit, edit: foEdit, select: foPreview},
    'promotion-popup': {derive: promo, init: ppInit, edit: ppEdit, select: st => dialogOpen(st, st.root.querySelector('[data-pp-dialog]'))},
    'size-chart-popup': {derive: sizeChart, init: scsInit, edit: scsEdit, select: st => dialogOpen(st, st.root.querySelector('[data-scs-dialog]'))},
  };

  /* ---------- dialogs ---------- */
  let lastOpener = null;
  const openDialogs = new Set();
  function dialogOpen(st, dlg, opener) {
    if (!dlg || dlg.open) return;
    lastOpener = opener || (document.activeElement !== document.body ? document.activeElement : null);
    st.opener = lastOpener;
    if (design() || typeof dlg.showModal !== 'function') { dlg.show ? dlg.show() : dlg.setAttribute('open', ''); }
    else { try { dlg.showModal(); } catch (_) { dlg.show(); } document.documentElement.classList.add('pc-lock'); }
    openDialogs.add(dlg);
    const t = st.root.querySelector('[data-scs-open]'); if (t) t.setAttribute('aria-expanded', 'true');
    if (!design()) { const x = dlg.querySelector('[data-pp-close], [data-scs-close]'); if (x) requestAnimationFrame(() => { try { x.focus({preventScroll: true}); } catch (_) { /* gone */ } }); }
  }
  function dialogClose(st, dlg) {
    if (!dlg) return;
    if (dlg.open) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
    openDialogs.delete(dlg);
    if (![...openDialogs].some(d => d.open && d.matches(':modal'))) document.documentElement.classList.remove('pc-lock');
    const t = st.root.querySelector('[data-scs-open]'); if (t) t.setAttribute('aria-expanded', 'false');
    const back = st.opener; st.opener = null;
    if (back && back.isConnected && !design()) { try { back.focus({preventScroll: true}); } catch (_) { /* gone */ } }
  }
  function wireDialog(st, dlg, closeSel) {
    if (!dlg) return;
    const on = (el, type, fn) => { el.addEventListener(type, fn); st.cleanup.push(() => el.removeEventListener(type, fn)); };
    on(dlg, 'click', e => {
      if (e.target.closest(closeSel)) { e.preventDefault(); dialogClose(st, dlg); return; }
      /* a click on the backdrop lands on the dialog itself, outside its card */
      if (e.target === dlg && dlg.matches(':modal')) { const r = dlg.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom || !dlg.firstElementChild.contains(document.elementFromPoint(e.clientX, e.clientY))) dialogClose(st, dlg); }
    });
    on(dlg, 'cancel', e => { e.preventDefault(); dialogClose(st, dlg); });
    on(dlg, 'close', () => { openDialogs.delete(dlg); if (![...openDialogs].some(d => d.open && d.matches(':modal'))) document.documentElement.classList.remove('pc-lock'); const t = st.root.querySelector('[data-scs-open]'); if (t) t.setAttribute('aria-expanded', 'false'); });
  }
  /* Escape also closes a dialog drawn in the page (not modal), the builder's preview */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    const list = [...openDialogs].filter(d => d.open && !d.matches(':modal'));
    const dlg = list.pop();
    if (dlg) { const root = dlg.closest(SEL), st = roots.get(root); if (st) { e.preventDefault(); dialogClose(st, dlg); return; } }
    for (const st of roots.values()) if (st.type === TYPES['fake-order'] && st.root.dataset.foState === 'shown') foClose(st);
  });

  /* Promotion popup: the live site's trigger and memory */
  const ppKey = st => 'materia:pp:' + st.root.dataset.pcSection;
  function ppInit(st) {
    const root = st.root, dlg = root.querySelector('[data-pp-dialog]');
    wireDialog(st, dlg, '[data-pp-close]');
    const on = (el, type, fn) => { el.addEventListener(type, fn); st.cleanup.push(() => el.removeEventListener(type, fn)); };
    on(root, 'click', e => {
      const copy = e.target.closest('[data-pp-copy]');
      if (copy && root.contains(copy)) { e.preventDefault(); ppCopy(st, copy); return; }
      const dismiss = e.target.closest('[data-pp-dismiss]');
      if (dismiss && root.contains(dismiss)) { e.preventDefault(); ppRemember(st); dialogClose(st, dlg); }
    });
    on(dlg, 'close', () => { if (!design()) store.set(ppKey(st) + ':seen', '1', true); });
    if (design()) { if (root.dataset.ppPreview === 'true' && !dlg.open) dlg.show(); return; }
    ppArm(st);
  }
  function ppArm(st) {
    const root = st.root, dlg = root.querySelector('[data-pp-dialog]');
    clearTimeout(st.timer);
    if (root.dataset.ppShow === 'hidden' || dlg.open) return;
    const until = +store.get(ppKey(st)) || 0;
    if (until > Date.now() || store.get(ppKey(st) + ':seen', true)) return;
    if (root.dataset.ppMobile !== 'true' && !matchMedia('(min-width: 768px)').matches) return;
    const fire = () => {
      if (!root.isConnected) return;
      /* one popup at a time: wait while another modal or the cookie banner is open */
      if (document.querySelector('dialog[open]:modal, html[data-popup-open], cookie-consent[data-open]')) { st.timer = setTimeout(fire, 4000); return; }
      dialogOpen(st, dlg);
    };
    st.timer = setTimeout(fire, num(root.dataset.ppDelay, 15) * 1000);
  }
  function ppRemember(st) { if (!design()) store.set(ppKey(st), String(Date.now() + num(st.root.dataset.ppDays, 1) * 864e5)); }
  function ppCopy(st, btn) {
    const code = btn.dataset.code || '';
    if (!code) return;
    const done = () => {
      btn.setAttribute('data-copied', '');
      const status = btn.parentElement.querySelector('[data-pp-status]'), t = btn.querySelector('[data-pp-code-done]');
      if (status) status.textContent = t ? t.textContent : '';
      clearTimeout(st.copied); st.copied = setTimeout(() => { btn.removeAttribute('data-copied'); if (status) status.textContent = ''; }, 1500);
      ppRemember(st);
    };
    const fallback = () => { try { const ta = document.createElement('textarea'); ta.value = code; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'; btn.after(ta); ta.select(); document.execCommand && document.execCommand('copy'); ta.remove(); } catch (_) { /* copy refused */ } done(); };
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) navigator.clipboard.writeText(code).then(done, fallback); else fallback();
  }
  function ppEdit(st, keys) {
    const dlg = st.root.querySelector('[data-pp-dialog]');
    if (design()) { if (keys.includes('editor_preview') && st.root.dataset.ppPreview === 'false' && !st.selected) dialogClose(st, dlg); else if (!dlg.open) dialogOpen(st, dlg); }
    else if (keys.some(k => /^(show_promotion|delay|hide_days)/.test(k))) ppArm(st);
  }

  /* Size Chart Popup */
  function scsInit(st) {
    const root = st.root, dlg = root.querySelector('[data-scs-dialog]');
    wireDialog(st, dlg, '[data-scs-close]');
    const fn = e => { const t = e.target.closest('[data-scs-open]'); if (t && root.contains(t)) { e.preventDefault(); if (dlg.open) dialogClose(st, dlg); else dialogOpen(st, dlg, t); } };
    root.addEventListener('click', fn); st.cleanup.push(() => root.removeEventListener('click', fn));
  }
  const TRIGGER = /^(trig_|show_icon|underline_text|icon_|align|margin_)/;
  function scsEdit(st, keys, block) {
    if (design() && (block || keys.some(k => !TRIGGER.test(k)))) dialogOpen(st, st.root.querySelector('[data-scs-dialog]'));
  }

  /* Order notification */
  function foItems(st) { const el = st.root.querySelector('[data-fo-items]'); try { return JSON.parse(el ? el.textContent : '[]') || []; } catch (_) { return []; } }
  function foInit(st) {
    const root = st.root;
    const close = e => { if (e.target.closest('[data-fo-close]')) { e.preventDefault(); foClose(st); } };
    root.addEventListener('click', close); st.cleanup.push(() => root.removeEventListener('click', close));
    if (root.dataset.foEnabled === 'false') return;
    if (design()) { foPreview(st); return; }
    st.items = foItems(st);
    if (!st.items.length) return;
    const vis = () => { if (document.hidden) foStop(st); else if (!st.closed && !st.timer) foLater(st, num(root.dataset.showGap, 10) * 1000, foShow); };
    document.addEventListener('visibilitychange', vis); st.cleanup.push(() => document.removeEventListener('visibilitychange', vis));
    foLater(st, parseInt(root.dataset.timeDelay, 10) || 5000, foShow);
  }
  function foLater(st, ms, fn) { clearTimeout(st.timer); st.timer = setTimeout(() => { st.timer = 0; if (st.root.isConnected) fn(st); }, Math.max(0, ms)); }
  function foStop(st) { clearTimeout(st.timer); st.timer = 0; if (st.root.dataset.foState === 'shown' && !design()) st.root.dataset.foState = 'hidden'; }
  function foShow(st) {
    const root = st.root;
    if (st.closed || root.dataset.foEnabled === 'false') return;
    const items = st.items || [], users = st.users || [];
    if (!items.length) return;
    let i = Math.floor(Math.random() * items.length);
    if (items.length > 1 && i === st.last) i = (i + 1) % items.length;
    st.last = i; st.running = true;
    const it = items[i] || {}, title = root.querySelector('[data-title-fake]'), img = root.querySelector('[data-img]'), user = root.querySelector('[data-user]'), time = root.querySelector('[data-time]');
    if (title) title.textContent = it.title || '';
    for (const a of root.querySelectorAll('[data-url]')) if (it.url) a.href = it.url;
    if (img && it.img && img.getAttribute('src') !== it.img) img.src = it.img;
    if (user) user.textContent = users.length ? users[Math.floor(Math.random() * users.length)] : st.fallback || 'Someone';
    if (time) time.textContent = String(1 + Math.floor(Math.random() * 59));
    root.dataset.foState = 'shown';
    foLater(st, num(root.dataset.animDuration, 15000), () => {
      root.dataset.foState = 'hidden';
      foLater(st, num(root.dataset.showGap, 10) * 1000, foShow);
    });
  }
  function foClose(st) { st.closed = true; clearTimeout(st.timer); st.timer = 0; st.root.dataset.foState = 'hidden'; st.root.removeAttribute('data-fo-preview'); }
  function foPreview(st) {
    if (st.root.dataset.foEnabled === 'false') { st.root.dataset.foState = 'hidden'; return; }
    st.closed = false; st.root.dataset.foPreview = ''; st.root.dataset.foState = 'shown';
  }
  function foEdit(st) { if (design()) foPreview(st); }

  /* ---------- the engine ---------- */
  function derive(root, st, record) {
    const type = st.type, out = [];
    const put = (el, key, v) => {
      if (!el) return el;
      if (record === 'audit') { out.push([el, key, v]); return el; }
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      const prev = m.get(key); m.set(key, v);
      write(el, key, v, prev);
      return el;
    };
    const blocks = [...root.querySelectorAll('[data-pc-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.pcBlock;
      if (st.rawBlocks.get(id) !== el.dataset.pcSettings) { st.rawBlocks.set(id, el.dataset.pcSettings); st.blocks.set(id, {...parse(el.dataset.pcSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.pcType, b: st.blocks.get(id) || {}};
    });
    const c = {root, st, s: st.s, put, blocks, q: sel => root.querySelector(sel)};
    type.derive(c);
    const wrap = root.closest('.shopify-section');
    if (wrap && type.margins && record !== 'audit') {
      const [t, b] = type.margins(st.s, st.mq.matches), reset = type.reset(st.s);
      put(wrap, '!margin-top', reset ? '0px' : px(t)); put(wrap, '!margin-bottom', reset ? '0px' : px(b));
    }
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.pcSettings) { st.raw = root.dataset.pcSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
  }
  function drop(root, st) {
    st.mq.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame); clearTimeout(st.timer); clearTimeout(st.copied);
    for (const fn of st.cleanup.splice(0)) try { fn(); } catch (_) { /* gone */ }
    for (const d of root.querySelectorAll('dialog')) openDialogs.delete(d);
    if (![...openDialogs].some(d => d.open && d.matches(':modal'))) document.documentElement.classList.remove('pc-lock');
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.pcRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const st = {root, type, live: {}, liveBlocks: new Map(), s: parse(root.dataset.pcSettings), raw: root.dataset.pcSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), cleanup: [], mq: matchMedia('(min-width: 768px)')};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule);
    roots.set(root, st);
    derive(root, st, true);
    if (type.init) type.init(st);
    root.dataset.pcReady = '';
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
      if (root.dataset.pcSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      paint(root, st);
      if (st.type.edit) st.type.edit(st, Object.keys(d.settings), bid);
    }
  });
  /* The builder picked the section or one of its blocks: show its popup in the page. */
  const pick = (e, on) => {
    const d = e.detail || {}, id = sectionId(d.sectionId || d.section_id || d.section);
    for (const [root, st] of roots) {
      if (root.dataset.pcSection !== id && !(e.target && e.target.nodeType === 1 && root.contains(e.target))) continue;
      st.selected = on;
      if (on) { if (st.type.select) st.type.select(st); }
      else if (st.type === TYPES['fake-order']) { if (design()) { root.dataset.foState = 'hidden'; root.removeAttribute('data-fo-preview'); } }
      else if (st.type.select && !(st.type === TYPES['promotion-popup'] && root.dataset.ppPreview === 'true')) for (const dlg of root.querySelectorAll('dialog')) dialogClose(st, dlg);
    }
  };
  document.addEventListener('shopify:section:select', e => pick(e, true));
  document.addEventListener('shopify:block:select', e => pick(e, true));
  document.addEventListener('shopify:section:deselect', e => pick(e, false));
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-pc-block]') || n.querySelector(SEL + ',[data-pc-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-pc-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-pc-settings']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key[0] === '?') { have = el.classList.contains(key.slice(1)); want = !!v; }
      else if (key[0] === '.') { have = el.classList.contains(v); want = true; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'text') { have = el.textContent.trim(); want = String(v == null ? '' : v).trim(); }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else continue;
      if (have !== want) bad.push((el.dataset.pcBlock || el.getAttribute('class') || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaPopupsCode = {scan, audit, roots};
  scan();
})();
