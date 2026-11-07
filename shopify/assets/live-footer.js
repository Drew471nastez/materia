/* Materia Themes. Footer and phone navigation: live builder edits for the
   Footer (sections/theme-footer.storelib, in the footer group on every page)
   and the Mobile navigation bar (sections/mobile-navigation-bar.storelib, in
   the overlay group). Loaded on every page by layout/theme.storelib.

   Each footer is a [data-ft-section] root and each bar a
   mobile-navigation-bar[data-mnb-section]; in the builder they carry their
   settings as JSON (data-ft-settings, data-mnb-settings). A
   storelib:settings-change for that section (or one of its blocks) is merged
   into the settings and the outputs it reaches (a CSS variable, an attribute,
   a class, text) are written once in the next frame, only where the value
   changed, so nothing is drawn twice and no picture reloads. What changes the
   markup itself (a menu, a picture, the social icons, the selectors, a
   payment badge, an icon) waits for the builder's redraw; a redrawn section
   (storelib:section-load) is picked up again once. The phone accordion of
   the footer columns is footer-section.js. Nothing here posts a form. */
(() => {
  if (window.MateriaLiveFooter) return;
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const strip = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  const color = v => {
    if (v && typeof v === 'object') { if (v.alpha === 0) return ''; v = v.hex || v.value || ''; }
    v = typeof v === 'string' ? v.trim() : '';
    if (!v || v === 'transparent' || /^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v.replace(/\s+/g, ' ')) || /^#[0-9a-f]{6}00$/i.test(v)) return '';
    return CSS.supports('color', v) ? v : '';
  };
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    const api = window.MateriaHeroImageOne;
    return typeof v === 'string' && v && api && api.font ? api.font(v) : '';
  };
  const schemeOf = v => { v = v && typeof v === 'object' ? v.id : v; return typeof v === 'string' && /^[\w-]+$/.test(v) ? v : ''; };
  const idOf = v => { v = v && typeof v === 'object' ? v.id : v; return v == null ? '' : String(v).replace(/^shopify-section-/, ''); };
  const sameId = (a, b) => !!a && !!b && (a === b || a.endsWith('__' + b) || b.endsWith('__' + a));

  /* Inline copy (copyright, newsletter text): only inline tags and links survive. */
  const INLINE = ['BR', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'A', 'U', 'S', 'SMALL', 'SUB', 'SUP', 'MARK'];
  const BLOCK = INLINE.concat(['P', 'UL', 'OL', 'LI']);
  function rich(el, value, inline) {
    const t = document.createElement('template');
    t.innerHTML = String(value == null ? '' : value);
    t.content.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(n => n.remove());
    const ok = inline ? INLINE : BLOCK;
    t.content.querySelectorAll('*').forEach(n => {
      if (!ok.includes(n.tagName)) { n.replaceWith(...n.childNodes); return; }
      const href = n.getAttribute('href'), target = n.getAttribute('target');
      [...n.attributes].forEach(a => n.removeAttribute(a.name));
      if (n.tagName === 'A' && href && !/^\s*javascript:/i.test(href)) { n.setAttribute('href', href); if (target) n.setAttribute('target', target); }
    });
    el.replaceChildren(t.content);
  }

  /* One write per element and output, only when the value differs from the last one. */
  function writer(st) {
    return (el, key, v) => {
      if (!el) return;
      let m = st.last.get(el);
      if (!m) st.last.set(el, m = new Map());
      if (m.has(key) && m.get(key) === v) return;
      m.set(key, v);
      if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else if (el.style.getPropertyValue(key).trim() !== String(v)) el.style.setProperty(key, String(v)); }
      else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else if (el.getAttribute(n) !== (v === true ? '' : String(v))) el.setAttribute(n, v === true ? '' : String(v)); }
      else if (key[0] === '~') el.classList.toggle(key.slice(1), !!v);
      else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v)); }
      else if (key === 'text') { const s = v == null ? '' : String(v); if (el.textContent !== s) el.textContent = s; }
      else if (key === 'inline') rich(el, v, true);
      else if (key === 'rich') rich(el, v, false);
      else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-') && c !== 'color-' + v) el.classList.remove(c); if (v) el.classList.add('color-' + v); }
      else if (key === 'width') { for (const c of WIDTHS) if (c !== v) el.classList.remove(c); if (v) el.classList.add(v); }
    };
  }
  const WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width'];

  /* ---------- Footer ---------- */
  function footer(st) {
    const root = st.root, s = st.s, put = writer(st), k = id => has(s, id);
    const q = sel => root.querySelector(sel), qa = sel => root.querySelectorAll(sel);
    if (k('color_scheme') && schemeOf(s.color_scheme)) put(root, 'scheme', schemeOf(s.color_scheme));
    if (k('section_width')) for (const el of qa(':scope > .footer__middle > div, :scope > .footer__bottom > div')) if (WIDTHS.some(c => el.classList.contains(c))) put(el, 'width', s.section_width);
    if (k('separator_line')) {
      const v = s.separator_line, home = root.getAttribute('data-ft-page') === 'index';
      put(root, '~border-top', v === 'all-page' || (v === 'homepage' && home) || (v === 'inner_page' && !home));
    }
    /* reset_spacing writes the wrapper's own margin rules: the redraw draws it. */
    const mid = q(':scope > .footer__middle'), fch = q('[data-ft-fch]');
    if (k('padding_top')) { put(root, '--section-pt', String(num(s.padding_top))); if (mid) put(mid, '~pt-min', num(s.padding_top) < 30); if (fch) put(fch, '--fch-pt', num(s.padding_top, 60) + 'px'); }
    if (k('padding_bottom')) { put(root, '--section-pb', String(num(s.padding_bottom))); if (mid) put(mid, '~pb-min', num(s.padding_bottom) < 30); }
    const custom = bool(s.enable_custom_style);
    if (k('link_hover_color') || k('enable_custom_style')) put(root, '--footer-link-hover', (custom && color(s.link_hover_color)) || 'var(--color-heading)');
    if (fch && (k('custom_text_color') || k('enable_custom_style'))) put(fch, '--fch-color', (custom && color(s.custom_text_color)) || 'var(--color-heading)');
    if (k('heading_weight')) put(root, '--footer-heading-weight', String(s.heading_weight || 600));
    if (k('heading_transform')) { const tt = s.heading_transform || 'none'; put(root, '--footer-heading-tt', tt); put(root, '@data-ft-tt', tt !== 'none'); }
    if (k('arrow_icon_size')) put(root, '--footer-arrow-size', num(s.arrow_icon_size, 14) + 'px');
    if (k('footer_heading_size')) for (const h of qa('.footer__block-heading')) put(h, '--font-size', String(s.footer_heading_size));
    if (k('enable_custom_fonts') || k('heading_font') || k('body_font')) {
      const on = bool(s.enable_custom_fonts), hf = on ? font(s.heading_font) : '', bf = on ? font(s.body_font) : '';
      put(root, '@data-own-weight', on); put(root, '@data-own-font', !!(hf || bf));
      put(root, '--ft-hf', hf); put(root, '--ft-bf', bf);
      for (const b of qa('.newsletter-form__button')) { put(b, '@data-own-font', !!bf); put(b, '--mb-font', bf ? 'var(--ft-bf)' : ''); }
    }
    const copy = q('[data-ft-copyright]');
    if (copy && k('copyright_text')) put(copy, 'inline', s.copyright_text);
    const big = q('[data-ft-big]');
    if (big && k('custom_text')) put(big, 'text', strip(s.custom_text));
    if (fch) {
      if (k('custom_text_italic')) put(fch, '--fch-style', bool(s.custom_text_italic) ? 'italic' : 'normal');
      if (k('custom_text_font_size_desktop')) put(fch, '--fch-text-d', num(s.custom_text_font_size_desktop, 200) + 'px');
      if (k('custom_text_font_size_mobile')) put(fch, '--fch-text-m', num(s.custom_text_font_size_mobile, 50) + 'px');
      if (k('custom_image_size_desktop')) put(fch, '--fch-img-d', num(s.custom_image_size_desktop, 200) + 'px');
      if (k('custom_image_size_mobile')) put(fch, '--fch-img-m', num(s.custom_image_size_mobile, 150) + 'px');
      if (k('custom_elements_gap')) put(fch, '--fch-gap', num(s.custom_elements_gap, 24) + 'px');
    }
    const bg = q('.background-footer');
    if (bg && k('footer_bg_brightness')) put(bg, '!filter', 'brightness(' + num(s.footer_bg_brightness, 100) + '%)');

    for (const [id, b] of st.b) {
      const el = root.querySelector('[data-ft-block="' + CSS.escape(id) + '"]');
      if (!el) continue;
      const type = el.getAttribute('data-ft-type'), bk = x => has(b, x);
      const head = el.querySelector('[data-ft-heading]');
      if (bk('content_width') && type !== 'payment_badges') put(el, '--col-width', b.content_width);
      if (type === 'link_list' && head && bk('heading')) put(head, 'text', strip(b.heading) || head.getAttribute('data-ft-fallback') || '');
      if (type === 'store_info') {
        if (head && bk('store_heading')) put(head, 'text', strip(b.store_heading));
        const d = el.querySelector('[data-ft-desc]'); if (d && bk('store_description')) put(d, 'rich', b.store_description);
        if (bk('top_offset')) put(el, '--store-info-top-offset', num(b.top_offset) + 'px');
      }
      if (type === 'newsletter') {
        if (head && bk('heading')) put(head, 'text', strip(b.heading));
        const d = el.querySelector('[data-ft-desc]'); if (d && bk('description')) put(d, 'inline', b.description);
        const n = el.querySelector('[data-ft-note]'); if (n && bk('note')) put(n, 'inline', b.note);
        const input = el.querySelector('input[type="email"]'), label = input && input.id && el.querySelector('label[for="' + CSS.escape(input.id) + '"]');
        if (input && bk('email_placeholder') && strip(b.email_placeholder)) { put(input, '@placeholder', strip(b.email_placeholder)); if (label) put(label, 'text', strip(b.email_placeholder)); }
        const btn = el.querySelector('.newsletter-form__button');
        if (btn && bk('button_label') && strip(b.button_label)) { put(btn, 'text', strip(b.button_label)); put(btn, '@aria-label', strip(b.button_label)); }
        const form = el.querySelector('form');
        if (form && bk('success_text')) put(form, '@data-success-message', strip(b.success_text) || 'Thanks for subscribing.');
        if (form && bk('error_text')) put(form, '@data-error-message', strip(b.error_text));
        const inner = el.querySelector('.newsletter-inner');
        if (inner && bk('content_width')) { put(inner, '~text-center', b.content_width === '100%'); put(inner, '~mx-auto', b.content_width === '100%'); }
      }
      if (type === 'payment_badges') {
        /* the same justify-content, margins and --pb-width (Badges area width) the markup writes */
        if (bk('alignment')) {
          const a = b.alignment || 'right';
          put(el, '!justify-content', a === 'left' ? 'flex-start' : a === 'center' ? 'center' : 'flex-end');
          put(el, '!margin-left', a === 'left' ? '' : 'auto');
          put(el, '!margin-right', a === 'center' ? 'auto' : '');
        }
        if (bk('content_width')) put(el, '--pb-width', b.content_width || '');
      }
    }
  }

  /* ---------- Mobile navigation bar ---------- */
  function bar(st) {
    const root = st.root, s = st.s, put = writer(st), k = id => has(s, id);
    if (k('color_scheme') && schemeOf(s.color_scheme)) put(root, 'scheme', schemeOf(s.color_scheme));
    if (k('height')) {
      const h = num(s.height, 62);
      put(root, '--mnb-height', h + 'px');
      const space = document.querySelector('style[data-mnb-space="' + CSS.escape(st.id) + '"]');
      const css = '@media (max-width:768px){body{--mnb-offset:' + h + 'px;padding-bottom:calc(' + h + 'px + env(safe-area-inset-bottom, 0px))!important}}';
      if (space && space.textContent !== css) space.textContent = css;
    }
    if (k('icon_size')) put(root, '--mnb-icon-size', num(s.icon_size, 22) + 'px');
    if (k('radius_top')) put(root, '--mnb-radius', num(s.radius_top) + 'px');
    if (k('show_labels')) put(root, '@data-mnb-labels-hidden', !bool(s.show_labels));
    if (k('border_top')) put(root, '@data-mnb-border-top', bool(s.border_top));
    if (k('shadow_enabled')) put(root, '@data-mnb-shadow', bool(s.shadow_enabled));
    if (['use_custom_colors', 'background_color', 'icon_color', 'label_color', 'active_color', 'border_color'].some(k)) {
      const on = bool(s.use_custom_colors), c = v => on ? color(v) : '';
      const bg = c(s.background_color), fg = c(s.icon_color), lb = c(s.label_color), ac = c(s.active_color), bd = c(s.border_color);
      put(root, '--mnb-bg', bg || 'var(--color-background)');
      put(root, '--mnb-fg', fg || 'var(--color-heading)');
      put(root, '--mnb-label', lb || fg || 'var(--color-heading)');
      put(root, '--mnb-active', ac || 'var(--mnb-fg, var(--color-heading))');
      put(root, '--mnb-active-opacity', ac ? '1' : '0.7');
      put(root, '--mnb-border', bd || 'rgba(0,0,0,0.06)');
    }
    if (k('enable_custom_fonts') || k('label_font')) {
      const f = bool(s.enable_custom_fonts) ? font(s.label_font) : '';
      put(root, '@data-own-font', !!f); put(root, '--mnb-font', f);
    }
    for (const [id, b] of st.b) {
      const el = root.querySelector('[data-mnb-block="' + CSS.escape(id) + '"]');
      if (!el || !has(b, 'label')) continue;
      const label = el.querySelector('[data-mnb-label]');
      const text = strip(b.label) || (label && label.getAttribute('data-mnb-std')) || '';
      if (label) put(label, 'text', text);
      if (el.tagName === 'A') put(el, '@aria-label', text);
    }
  }

  /* ---------- lifecycle ---------- */
  function add(root) {
    if (roots.has(root)) return;
    const isBar = root.hasAttribute('data-mnb-section');
    const id = root.getAttribute(isBar ? 'data-mnb-section' : 'data-ft-section') || '';
    roots.set(root, {root, id, kind: isBar ? 'bar' : 'footer', s: parse(root.getAttribute(isBar ? 'data-mnb-settings' : 'data-ft-settings')), b: new Map(), last: new Map(), frame: 0});
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) { if (st.frame) cancelAnimationFrame(st.frame); roots.delete(root); }
    document.querySelectorAll('[data-ft-section], mobile-navigation-bar[data-mnb-section]').forEach(add);
  }
  function schedule(st) {
    if (st.frame) return;
    st.frame = requestAnimationFrame(() => { st.frame = 0; if (!st.root.isConnected) return; (st.kind === 'bar' ? bar : footer)(st); });
  }
  function change(event) {
    const d = event.detail || {};
    const sid = idOf(d.section || d.sectionId || d.section_id), bid = idOf(d.block || d.blockId || d.block_id);
    if (!sid || !d.settings || typeof d.settings !== 'object') return;
    scan();
    for (const st of roots.values()) {
      if (!sameId(st.id, sid)) continue;
      if (bid) st.b.set(bid, Object.assign(st.b.get(bid) || {}, d.settings));
      else Object.assign(st.s, d.settings);
      schedule(st);
    }
  }
  let pending = 0;
  const later = () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; scan(); }); };
  window.MateriaLiveFooter = {scan, roots, count: () => roots.size};
  document.addEventListener('storelib:settings-change', change);
  document.addEventListener('storelib:section-load', later);
  document.addEventListener('shopify:section:load', later);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, {once: true}); else scan();
  if (window.MutationObserver) new MutationObserver(list => { for (const m of list) if (m.addedNodes.length || m.removedNodes.length) { later(); return; } }).observe(document.documentElement, {childList: true, subtree: true});
})();
