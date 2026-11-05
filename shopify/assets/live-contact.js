/* Materia Themes. The contact sections: Contact Form Simple
   (contact-form-simple), Contact Form Simple 2 (contactformsimple2), Google
   map (google-map) and Newsletter (newsletter). Loaded on every page by
   layout/theme.storelib.

   Live edits: every root [data-ct-root] carries its settings as JSON and
   every block [data-ct-block] its own. derive() turns them into outputs (a
   CSS variable, an attribute, a class, text, an icon, a field) per element,
   the same values the Liquid prints, so on load the first derive is only
   recorded. After that an output is written only when its value changes,
   once per frame per root, so a picture never reloads, a typed address is
   kept and a field keeps focus for an unrelated edit. Two instances on a
   page are independent: an edit reaches only the root whose
   data-ct-section is the edited section. A redraw (storelib:section-load)
   brings a new root, which is set up once; the old one is dropped.

   The forms keep their real submit path: the theme's contact form tag (and
   data-storelib-form="subscribe" on the newsletter); this file never posts.
   Settings that need the server (a new map embed code, a picture) wait for
   the builder's redraw. audit() lists outputs whose markup differs from the
   derived value (tests). */
(() => {
  if (window.MateriaContact) return;
  const SEL = '[data-ct-root]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const str = v => v == null ? '' : String(v);
  const api = () => window.MateriaHeroImageOne;
  /* the scheme-color snippet: empty or fully transparent prints the fallback */
  const color = (v, f) => {
    if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; }
    v = typeof v === 'string' ? v.trim() : '';
    if (!v || v === 'transparent' || /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(v) || /^#[0-9a-f]{6}00$/i.test(v) || !CSS.supports('color', v)) return f;
    return v;
  };
  const isColor = v => color(v, '') !== '';
  /* a font picker value: the Liquid prints family, fallbacks */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    return typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
  };
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const plain = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '');

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = plain(value);
  }
  function icon(el, v, st) {
    const t = st.root.querySelector('template[data-ct-icons]'), src = t && (t.content.querySelector('[data-icon="' + CSS.escape(v || '') + '"]') || t.content.querySelector('[data-icon-default]'));
    if (!src) return;
    const n = src.cloneNode(true); n.removeAttribute('data-icon'); n.removeAttribute('data-icon-default');
    el.replaceChildren(n);
  }
  /* swap an element for another tag, keeping its attributes and children */
  function retag(el, tag, st) {
    if (el.tagName === tag) return el;
    const next = document.createElement(tag);
    for (const a of el.attributes) next.setAttribute(a.name, a.value);
    next.replaceChildren(...el.childNodes);
    el.replaceWith(next);
    st.last.set(next, st.last.get(el) || new Map());
    return next;
  }
  function write(el, key, v, prev, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') { for (const c of String(prev || '').split(' ')) if (c) el.classList.remove(c); for (const c of String(v || '').split(' ')) if (c) el.classList.add(c); }
    else if (key[0] === '~') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'icon') icon(el, v, st);
    else if (key === 'tag') return retag(el, v, st);
    else if (key === 'value') { if (el.value !== v && document.activeElement !== el) el.value = v; }
    return el;
  }

  /* ---------- shared pieces ---------- */
  const custom = s => bool(s.enable_custom_style);
  const pick = (on, v, f) => on ? color(v, f) : f;
  const schemeOf = s => { const v = s.color_scheme && s.color_scheme.id || s.color_scheme; return typeof v === 'string' && /^[\w-]+$/.test(v) ? v : 'default-color-scheme'; };
  const own = (s, k) => s[k] === false || s[k] === 'false';
  const fontVar = (c, el, name, on, v) => c.put(el, name, on && font(v) || null);
  /* the header blocks of Google map and Newsletter (snippets/contact-live-header) */
  function headerBlock(c, x, secFont) {
    const {put} = c, b = x.b, el = x.el.querySelector('[data-ct-el]'); if (!el) return;
    put(x.el, 'hidden', blank(b.text));
    put(el, 'rich', b.text || '');
    const bf = bool(b.enable_custom_fonts), z = bool(b.size_enable), w = bool(b.weight_enable);
    put(el, '@data-own-font', secFont || bf || null);
    put(el, '@data-own-weight', w || null);
    put(el, '@data-own-size', z || null);
    put(el, '--ch-ff', bf && font(b.font) || null);
    if (x.type === 'heading') {
      put(el, '--ch-c', custom(b) ? color(b.color, 'var(--color-heading)') : null);
      put(el, '--ch-fw', w ? str(b.weight || 700) : null);
      put(el, '--ch-fs-d', z ? px(b.size_desktop, 36) : null); put(el, '--ch-fs-m', z ? px(b.size_mobile, 26) : null);
      put(el, '--ch-lh', z ? str(num(b.line_height, 1.15)) : null); put(el, '--ch-ls', z ? px(b.tracking) : null);
    } else {
      put(el, '--ch-c', custom(b) ? color(b.color, 'var(--color-text)') : null);
      put(el, '--ch-fw', w ? str(b.weight || 400) : null);
      put(el, '--ch-fs', z ? px(b.size, 16) : null); put(el, '--ch-lh', z ? str(num(b.line_height, 1.5)) : null);
    }
  }
  /* the older Heading / Description settings, drawn while there is no such block */
  function legacyHeader(c, secFont) {
    const {put, s, root} = c;
    for (const el of root.querySelectorAll('[data-ct-legacy]')) {
      if (el.closest(SEL) !== root) continue;
      const k = el.dataset.ctLegacy;
      put(el, 'rich', s[k] || '');
      put(el.parentElement, 'hidden', blank(s[k]));
      put(el, '@data-own-font', secFont || null);
    }
  }
  /* the header holds something to show */
  function headerShown(c, el) {
    if (!el) return;
    const any = [...el.children].some(ch => ch.tagName !== 'STYLE' && ch.tagName !== 'TEMPLATE' && !ch.hidden);
    c.put(el, 'hidden', !any);
  }
  const SIZE = {small: 'h3', large: 'h1-size'};
  const ALIGN_FLEX = {left: 'flex-start', right: 'flex-end', center: 'center'};
  /* the wrapper margins: [top, bottom] for this width */
  function margins(c, reset, wins) {
    const wrap = c.root.closest('.shopify-section'); if (!wrap || c.record === 'audit') return;
    const s = c.s, d = c.st.mq.matches;
    const t = num(s['section_margin_top_' + (d ? 'desktop' : 'mobile')]), b = num(s['section_margin_bottom_' + (d ? 'desktop' : 'mobile')]);
    let top = reset ? 0 : t, bottom = reset ? 0 : b;
    if (wins) { const tm = num(s.section_margin_top_mobile), bm = num(s.section_margin_bottom_mobile); top = t > 0 ? t : (d && tm > 0) ? 0 : reset ? 0 : t; bottom = b > 0 ? b : (d && bm > 0) ? 0 : reset ? 0 : b; }
    c.put(wrap, '!margin-top', px(top)); c.put(wrap, '!margin-bottom', px(bottom));
  }
  const width = (c, v) => { c.put(c.root, '@data-ct-w', v || ''); const w = c.root.matches('[data-ct-width]') ? c.root : c.q('[data-ct-width]'); if (w) c.put(w, '.w', v || ''); };
  /* the button-overrides snippet: the colours a creator set, a border following its background */
  function buttonColours(c, el, on, k) {
    const {put, s} = c, set = id => on && isColor(s[id]) ? color(s[id], '') : null;
    const bg = set(k.bg), hbg = set(k.hover_bg);
    put(el, '--mb-bg', bg); put(el, '--mb-text', set(k.text)); put(el, '--mb-border', (k.border && set(k.border)) || bg);
    put(el, '--mb-hover-bg', hbg); put(el, '--mb-hover-text', set(k.hover_text)); put(el, '--mb-hover-border', hbg);
  }

  /* ---------- Google map ---------- */
  function googleMap(c) {
    const {root, s, put} = c, secFont = bool(s.enable_custom_fonts);
    put(root, 'scheme', schemeOf(s));
    width(c, s.section_width);
    put(root, '~pt-min', num(s.padding_top) < 30); put(root, '~pb-min', num(s.padding_bottom) < 30);
    put(root, '~remove_spacing', bool(s.reset_spacing));
    put(root, '--section-pt', str(num(s.padding_top))); put(root, '--section-pb', str(num(s.padding_bottom)));
    fontVar(c, root, '--ct-hf', secFont, s.heading_font); fontVar(c, root, '--ct-bf', secFont, s.body_font);
    const inner = c.q('[data-ct-inner]');
    if (inner) {
      const h = num(s.map_height, 500), hm = num(s.map_height_mobile) || h;
      put(inner, '--map-height', h + 'px'); put(inner, '--map-height-m', hm !== h ? hm + 'px' : null);
      put(inner, '--gm-radius', num(s.map_radius) > 0 ? px(s.map_radius) : null);
    }
    const head = c.q('[data-ct-header]');
    if (head) { put(head, '.align', 'text-' + (s.header_alignment || 'center')); put(head, '~px-20', s.section_width === 'full_width'); }
    c.header(secFont, SIZE[s.header_size] || '');
    headerShown(c, head);
    margins(c, bool(s.reset_spacing), false);
  }

  /* ---------- Newsletter ---------- */
  function newsletter(c) {
    const {root, s, put} = c, secFont = bool(s.enable_custom_fonts), on = custom(s), horiz = s.form_layout === 'horizontal', align = s.header_alignment || 'center';
    const sec = c.q('[data-ct-scheme]') || root;
    width(c, s.section_width);
    put(root, '@data-nl-layout', s.form_layout || 'vertical');
    put(sec, 'scheme', schemeOf(s));
    put(sec, '~pt-min', num(s.padding_top) < 30); put(sec, '~pb-min', num(s.padding_bottom) < 30);
    put(sec, '~remove_spacing', bool(s.reset_spacing));
    put(sec, '--section-pt', str(num(s.padding_top))); put(sec, '--section-pb', str(num(s.padding_bottom)));
    fontVar(c, sec, '--ct-hf', secFont, s.heading_font); fontVar(c, sec, '--ct-bf', secFont, s.body_font);
    const ov = c.q('[data-nl-overlay]');
    if (ov) { put(ov, '--nl-ov-c', s.bg_overlay_color || '#000000'); put(ov, '--nl-ov', str(num(s.bg_overlay_opacity) / 100)); put(ov, 'hidden', num(s.bg_overlay_opacity) <= 0); }
    const box = c.q('[data-nl-box]');
    if (box) {
      put(box, '.layout', horiz ? 'flex-md-nowrap gap-30' : 'flex-column');
      put(box, '.box', bool(s.show_content_background) ? 'content-box relative p-30 p-1025-50' : '');
      put(box, '--content-bg', pick(on, s.content_background, 'var(--color-background)'));
      put(box, '--opacity', num(s.content_box_opacity, 100) + '%');
    }
    const head = c.q('[data-ct-header]');
    if (head) { put(head, '.align', 'text-' + align); put(head, '.vert', horiz ? '' : 'mb-30' + (s.section_width === 'full_width' ? ' px-20' : '')); }
    const ic = c.q('[data-nl-icon]');
    if (ic) {
      put(ic, 'hidden', !bool(s.show_icon)); put(ic, '.align', 'justify-content-' + align);
      put(ic, '--nl-icon', px(s.icon_size, 40)); put(ic, '--nl-icon-c', on ? color(s.icon_color, 'var(--color-heading)') : null);
      const g = ic.querySelector('[data-nl-glyph]'); if (g) put(g, 'icon', s.icon || 'envelope');
    }
    c.header(secFont, SIZE[s.header_size] || '');
    headerShown(c, head);
    const sub = c.q('[data-nl-submit]');
    if (sub) { put(sub, '.layout', horiz ? 'flex-grow' : 'max-w-custom mx-auto'); put(sub, '.align', 'text-' + align + ' justify-content-' + align); }
    const words = c.q('[data-mt-words]');
    if (words) {
      put(words, '@data-success-message', s.success_text || "Thanks, you're on the list.");
      put(words, '@data-already-message', str(s.already_text)); put(words, '@data-invalid-message', str(s.invalid_text)); put(words, '@data-error-message', str(s.error_text));
      put(words, '@data-success-ms', str(num(s.success_duration, 5) * 1000));
    }
    // The form's own messages (data-state done / error, and the hint under the field).
    const nlMsg = (sel, v, d) => { const el = c.q(sel); if (el) put(el, 'text', str(v) !== '' ? str(v) : d); };
    nlMsg('[data-nl-msg="done"]', s.success_text, "Thanks, you're on the list.");
    nlMsg('[data-nl-msg="error"]', s.error_text, 'That did not go through. Check your connection and try again.');
    nlMsg('[data-nl-hint]', s.invalid_text, 'Enter a valid email address.');
    const fields = c.q('[data-nl-fields]');
    if (fields) {
      put(fields, '.align', 'justify-content-' + align);
      const ownField = own(s, 'use_theme_fields'), set = id => ownField && isColor(s[id]) ? color(s[id], '') : null;
      put(fields, '--input-bg', set('field_bg')); put(fields, '--field-text', set('field_text')); put(fields, '--field-placeholder', set('field_text'));
      put(fields, '--input-border-color', set('field_border')); put(fields, '--input-focus-color', set('field_focus'));
      put(fields, '--input-border-radius', ownField ? px(s.field_radius, 4) : null); put(fields, '--input-height', ownField ? px(s.field_height, 50) : null);
    }
    const label = c.q('[data-nl-fields] label');
    if (label) put(label, 'text', str(s.email_label).trim() || s.email_placeholder || 'Email');
    const input = c.q('.subcribe-input');
    if (input) { put(input, '@placeholder', str(s.email_placeholder)); put(input, '.layout', horiz ? 'col' : 'input-vertical'); put(input, '@data-own-font', secFont || null); }
    const btn = c.q('.subcribe-button');
    if (btn) {
      const style = s.button_style === 'secondary' ? 'secondary' : 'primary', shape = own(s, 'use_theme_button');
      put(btn, '.style', style === 'secondary' ? 'btn-secondary' : 'btn-primary'); put(btn, '@data-theme-button', s.button_style || 'primary');
      put(btn, '@data-own-shape', shape || null); put(btn, '@data-own-font', secFont || null);
      buttonColours(c, btn, on, {bg: 'button_bg', text: 'button_text', border: 'button_border', hover_bg: 'button_bg_hover', hover_text: 'button_text_hover'});
      put(btn, '--mb-radius', shape ? px(s.button_radius, 4) : null); put(btn, '--mb-font-size', shape ? px(s.button_size, 15) : null);
      put(btn, '--mb-padding-x', shape ? px(s.button_pad_x, 28) : null); put(btn, '--mb-padding-y', shape ? px(s.button_pad_y, 12) : null);
      put(btn, '--mb-font', secFont && font(s.body_font) ? 'var(--ct-bf)' : null);
      const l = btn.querySelector('[data-inline-label]');
      if (l && !btn.hasAttribute('data-subscribed')) put(l, 'text', str(s.btn_text).trim() || l.dataset.ctDefault || 'Subscribe');
      const sl = btn.querySelector('[data-subscribed-label]'); if (sl) put(sl, 'text', s.subscribed_button_text || 'Subscribed');
    }
    const note = c.q('[data-nl-note]');
    if (note) { put(note, 'rich', s.note || ''); put(note, 'hidden', blank(s.note)); put(note, '@data-own-font', secFont || null); }
    margins(c, bool(s.reset_spacing), true);
  }

  /* ---------- Contact Form Simple 2 ---------- */
  const GRAD = 'linear-gradient(135deg, var(--cp-grad-a), var(--cp-grad-b))';
  function cp2(c) {
    const {root, s, put} = c, on = custom(s), secFont = bool(s.enable_custom_fonts), sec = c.q('[data-ct-scheme]') || root;
    const w = s.section_width || 'container';
    put(root, '@data-ct-w', w); put(root, '.w', w);
    put(sec, 'scheme', schemeOf(s));
    const cv = (k, id, f) => put(sec, k, on ? color(s[id], f) : null);
    cv('--cp-bg', 'bg_color', 'var(--color-background)'); cv('--cp-grad-a', 'bg_grad_a', 'var(--color-primary)'); cv('--cp-grad-b', 'bg_grad_b', 'var(--color-heading)');
    cv('--cp-card', 'card_color', 'var(--color-background)'); cv('--cp-text', 'text_color', 'var(--color-text)'); cv('--cp-heading', 'text_color', 'var(--color-heading)');
    cv('--cp-muted', 'muted_color', 'color-mix(in srgb, var(--color-text) 72%, transparent)'); cv('--cp-accent', 'accent_color', 'var(--color-primary)'); cv('--cp-icon-color', 'icon_color', 'var(--color-primary)');
    put(sec, '--cp-surface', on ? (bool(s.enable_bg_gradient) ? GRAD : 'var(--cp-bg)') : null);
    for (const [k, id] of [['--cp-radius', 'radius'], ['--cp-pad-x', 'pad_x'], ['--cp-pad-top', 'pad_top'], ['--cp-pad-bottom', 'pad_bottom'], ['--cp-gap', 'col_gap'], ['--cp-desc-info-gap', 'desc_info_gap'], ['--cp-info-gap', 'info_gap'], ['--cp-field-gap', 'field_gap'], ['--cp-btn-gap', 'btn_gap'], ['--cp-icon-min', 'icon_size_mobile'], ['--cp-icon-max', 'icon_size_desktop'], ['--cp-maxw', 'max_width']]) put(sec, k, px(s[id]));
    put(sec, '--cp-shadow', bool(s.enable_shadow) ? '0 6px 24px rgba(0,0,0,.08)' : 'none');
    fontVar(c, sec, '--ct-hf', secFont, s.heading_font); fontVar(c, sec, '--ct-bf', secFont, s.body_font);
    const btnSet = on && isColor(s.button_bg), grad = on && bool(s.enable_button_gradient);
    put(sec, '@data-cp-own-button', btnSet || grad || null);
    put(sec, '@data-cp-flat', !bool(s.enable_right_card) || null);
    for (const x of c.blocks) {
      const b = x.b, el = x.el, bf = bool(b.enable_custom_fonts) && font(b.font), bon = custom(b);
      put(el, '@data-own-font', secFont || bool(b.enable_custom_fonts) || null);
      put(el, '--cp-ff', bf || null);
      if (x.type === 'heading') {
        const fw = b.font_weight && b.font_weight !== 'theme' ? str(b.font_weight) : null;
        put(el, 'hidden', blank(b.text)); put(el, 'rich', b.text || '');
        put(el, '--cp-h-m', px(b.font_size_mobile)); put(el, '--cp-h-d', px(b.font_size_desktop));
        put(el, '--cp-h-fw', fw); put(el, '@data-own-weight', !!fw || null);
        put(el, '--cp-h-c', bon ? color(b.color, 'var(--cp-heading, var(--color-heading))') : null);
      } else if (x.type === 'description') {
        put(el, 'hidden', blank(b.text)); put(el, 'rich', b.text || '');
        put(el, '--cp-d-m', px(b.font_size_mobile)); put(el, '--cp-d-d', px(b.font_size_desktop));
        put(el, '--cp-d-c', bon ? color(b.color, 'var(--cp-muted, var(--color-text))') : null);
      } else if (x.type === 'info') {
        put(el, 'hidden', blank(b.line1) && blank(b.line2));
        for (const [k, id] of [['--cp-l1-m', 'line1_size_mobile'], ['--cp-l1-d', 'line1_size_desktop'], ['--cp-l2-m', 'line2_size_mobile'], ['--cp-l2-d', 'line2_size_desktop']]) put(el, k, px(b[id]));
        put(el, '--cp-i-c', bon ? color(b.icon_color, 'var(--cp-icon-color, var(--color-primary))') : null);
        put(el, '--cp-l1-c', bon ? color(b.line1_color, 'var(--cp-text, var(--color-text))') : null);
        put(el, '--cp-l2-c', bon ? color(b.line2_color, 'var(--cp-muted, var(--color-text))') : null);
        const ic = el.querySelector('[data-cp-icon]'); if (ic) put(ic, 'icon', b.icon || 'mail');
        const l1 = el.querySelector('.cp-line1'), l2 = el.querySelector('.cp-line2');
        if (l1) { put(l1, 'text', str(b.line1)); put(l1, 'hidden', blank(b.line1)); }
        if (l2) { put(l2, 'text', str(b.line2)); put(l2, 'hidden', blank(b.line2)); }
      }
    }
    const fields = c.q('[data-cp-fields]');
    if (fields) {
      const f = own(s, 'use_theme_fields'), set = id => f && isColor(s[id]) ? color(s[id], '') : null;
      put(fields, '--input-bg', set('input_bg')); put(fields, '--field-text', set('input_text')); put(fields, '--field-placeholder', set('input_text'));
      put(fields, '--input-border-color', set('input_border'));
      put(fields, '--input-border-radius', f ? px(s.field_radius, 10) : null); put(fields, '--input-height', f ? px(s.field_height, 46) : null);
      put(fields, '@data-own-font', secFont || null);
      const labels = {name: 'Name', email: 'Email', website: 'Website', message: 'Message'};
      for (const l of fields.querySelectorAll('[data-cp-label]')) {
        const k = l.dataset.cpLabel;
        put(l, 'text', s['label_' + k] || labels[k]); put(l, '~visually-hidden', !bool(s.show_labels));
        if (k === 'website') put(l, 'hidden', !bool(s.show_website));
      }
      const ph = {ContactName: 'ph_name', ContactEmail: 'ph_email', ContactWebsite: 'ph_website', ContactMessage: 'ph_message'};
      for (const i of fields.querySelectorAll('input[id], textarea[id]')) { const k = ph[i.id.split('-')[0]]; if (k) put(i, '@placeholder', str(s[k])); }
      const web = fields.querySelector('[id^="ContactWebsite-"]');
      if (web) { put(web, 'hidden', !bool(s.show_website)); put(web, '@disabled', !bool(s.show_website) || null); }
      const btn = fields.querySelector('.cp-submit');
      if (btn) {
        const shape = own(s, 'use_theme_button'), bg = grad ? GRAD : btnSet ? color(s.button_bg, '') : null, txt = on && isColor(s.button_text) ? color(s.button_text, '') : null;
        put(btn, '--mb-bg', bg); put(btn, '--mb-hover-bg', bg); put(btn, '--mb-border', grad ? 'transparent' : bg); put(btn, '--mb-hover-border', grad ? 'transparent' : bg);
        put(btn, '--mb-text', txt); put(btn, '--mb-hover-text', txt);
        put(btn, '@data-own-shape', shape || null); put(btn, '@data-own-font', secFont || null);
        put(btn, '--mb-radius', shape ? px(s.button_radius, 12) : null); put(btn, '--mb-font-size', shape ? px(s.button_size, 16) : null); put(btn, '--mb-padding-y', shape ? px(s.button_pad_y, 12) : null);
        put(btn, '--mb-font', secFont && font(s.body_font) ? 'var(--ct-bf)' : null);
        put(btn, 'text', str(s.btn_text));
      }
    }
    margins(c, bool(s.reset_spacing), false);
  }

  /* ---------- Contact Form Simple ---------- */
  const FLEX = {left: 'flex-start', right: 'flex-end'};
  /* a field block's control, as the Liquid draws it */
  function fieldControl(b, id, word) {
    const type = b.field_type || 'text', name = b.name || b.label || word;
    const attr = type === 'email' ? 'contact[email]' : type === 'textarea' ? 'contact[body]' : 'contact[' + name + ']';
    const tag = type === 'textarea' ? 'TEXTAREA' : type === 'select' ? 'SELECT' : 'INPUT';
    const want = {tag, cls: tag === 'TEXTAREA' ? 'cfs__textarea' : tag === 'SELECT' ? 'cfs__select' : 'cfs__input', type: tag === 'INPUT' ? (type === 'email' || type === 'tel' ? type : 'text') : null, name: attr,
      auto: type === 'email' ? 'email' : type === 'tel' ? 'tel' : null, ph: tag === 'SELECT' ? null : str(b.placeholder), req: bool(b.required),
      opts: tag === 'SELECT' ? JSON.stringify([str(b.placeholder), String(b.options || '').split(',').map(o => o.trim()).filter(Boolean)]) : ''};
    return want;
  }
  function applyField(c, x, word) {
    const {put} = c, b = x.b, el = x.el, id = 'cfs-' + c.root.dataset.ctSection + '-' + x.id, w = fieldControl(b, id, word);
    put(el, '@data-half', (bool(b.half_width) && b.field_type !== 'textarea') || null);
    const label = el.querySelector('.cfs__label');
    if (label) {
      put(label, '~visually-hidden', blank(b.label));
      const t = label.querySelector('[data-cfs-label]'); if (t) put(t, 'text', str(b.label) || str(b.placeholder) || b.name || word);
      const r = label.querySelector('.cfs__label-required'); if (r) put(r, 'hidden', !w.req);
    }
    let ctl = el.querySelector('input, textarea, select');
    if (!ctl) return;
    if (c.record) return;
    if (ctl.tagName !== w.tag) { const n = document.createElement(w.tag); n.id = ctl.id; ctl.replaceWith(n); ctl = n; c.st.last.delete(ctl); }
    ctl.className = w.cls;
    const set = (k, v) => { if (v == null || v === false) { if (ctl.hasAttribute(k)) ctl.removeAttribute(k); } else if (ctl.getAttribute(k) !== (v === true ? '' : v)) ctl.setAttribute(k, v === true ? '' : v); };
    set('type', w.type); set('name', w.name); set('placeholder', w.ph); set('autocomplete', w.auto); set('required', w.req);
    if (w.tag === 'SELECT' && ctl.dataset.cfsOpts !== w.opts) {
      const [ph, list] = JSON.parse(w.opts), out = [];
      if (ph) { const o = document.createElement('option'); o.value = ''; o.textContent = ph; out.push(o); }
      for (const v of list) { const o = document.createElement('option'); o.value = v; o.textContent = v; out.push(o); }
      ctl.replaceChildren(...out); ctl.dataset.cfsOpts = w.opts;
    }
  }
  function applyInfo(c, x, shop) {
    const {put} = c, b = x.b, el = x.el, icon = b.icon || 'mail';
    let value = str(b.value), link = str(b.link);
    if (!value.trim()) value = icon === 'mail' || icon === 'message' ? shop[0] : icon === 'phone' ? shop[1] : icon === 'pin' ? shop[2] : '';
    if (!link.trim() && value) link = icon === 'mail' || icon === 'message' ? 'mailto:' + value : icon === 'phone' ? 'tel:' + value.replace(/[ ()-]/g, '') : '';
    put(el, 'hidden', blank(b.label) && !value);
    const ic = el.querySelector('[data-cfs-icon]'); if (ic) put(ic, 'icon', icon);
    const l = el.querySelector('.cfs__info-label'); if (l) { put(l, 'text', str(b.label)); put(l, 'hidden', blank(b.label)); }
    const v = el.querySelector('.cfs__info-value');
    if (v) {
      put(v, 'hidden', !value);
      if (c.record) return;
      let inner = v.firstElementChild;
      const tag = link ? 'A' : 'SPAN';
      if (!inner || inner.tagName !== tag) { const n = document.createElement(tag); v.replaceChildren(n); inner = n; }
      if (link) { if (inner.getAttribute('href') !== link) inner.setAttribute('href', link); }
      if (inner.textContent !== value) inner.textContent = value;
    }
  }
  function cfs(c) {
    const {root, s, put} = c, on = custom(s), secFont = bool(s.enable_custom_fonts), align = s.header_align || 'center';
    const ownField = own(s, 'use_theme_fields'), shape = own(s, 'use_theme_button'), lw = s.label_weight || 'theme';
    put(root, 'scheme', schemeOf(s)); width(c, s.section_width);
    put(root, '@data-cfs-show', s.show_section_on || 'all'); put(root, '@data-cfs-side', s.side_column_position || 'right');
    const v = (k, val) => put(root, k, val);
    v('--cfs-pt-m', px(s.padding_top_mobile, 56)); v('--cfs-pb-m', px(s.padding_bottom_mobile, 56)); v('--cfs-pt-d', px(s.padding_top_desktop, 96)); v('--cfs-pb-d', px(s.padding_bottom_desktop, 96));
    v('--cfs-w-m', px(s.section_max_width_mobile, 560)); v('--cfs-w-t', px(s.section_max_width_tablet, 900)); v('--cfs-w-d', px(s.section_max_width_desktop, 1100));
    v('--cfs-align', align); v('--cfs-flex', FLEX[align] || 'center');
    v('--cfs-hgap-m', px(s.heading_sub_gap_mobile, 8)); v('--cfs-hgap-d', px(s.heading_sub_gap_desktop, 14)); v('--cfs-gap-m', px(s.gap_subheading_content_mobile, 32)); v('--cfs-gap-d', px(s.gap_subheading_content, 56));
    v('--cfs-cols', (s.form_col_ratio || '3fr') + ' ' + (s.side_col_ratio || '2fr')); v('--cfs-col-gap-m', px(s.col_gap_mobile, 32)); v('--cfs-col-gap-d', px(s.col_gap_desktop, 48));
    v('--cfs-field-gap', px(s.field_gap, 16)); v('--cfs-label-size', px(s.label_size, 14)); v('--cfs-ta-h', px(s.textarea_min_height, 140)); v('--cfs-img-r', px(s.side_image_radius, 16));
    v('--cfs-label-weight', lw !== 'theme' ? str(lw) : null);
    const boxed = on && isColor(s.form_bg);
    v('--cfs-form-pad', boxed ? px(s.form_padding, 32) : null); v('--cfs-form-r', boxed ? px(s.form_radius, 16) : null);
    const cv = (k, id, f) => v(k, on ? color(s[id], f) : null);
    cv('--cfs-bg', 'section_bg', 'var(--color-background)'); cv('--cfs-form-bg', 'form_bg', 'transparent'); cv('--cfs-label-c', 'label_color', 'var(--color-text)'); cv('--cfs-req-c', 'required_color', 'var(--color-primary)');
    cv('--cfs-ib', 'info_icon_bg', 'color-mix(in srgb, var(--color-heading) 8%, transparent)'); cv('--cfs-ic', 'info_icon_color', 'var(--color-heading)');
    cv('--cfs-il', 'info_label_color', 'color-mix(in srgb, var(--color-text) 72%, transparent)'); cv('--cfs-iv', 'info_value_color', 'var(--color-heading)'); cv('--cfs-id', 'info_border_color', 'var(--color-border)');
    fontVar(c, root, '--ct-hf', secFont, s.heading_font); fontVar(c, root, '--ct-bf', secFont, s.body_font);
    const word = root.dataset.cfsWord || 'field', shop = String(root.dataset.cfsShop || '||').split('|');
    let header = false;
    for (const x of c.blocks) {
      const b = x.b, el = x.el, bf = bool(b.enable_custom_fonts);
      if (x.type === 'heading' || x.type === 'subheading') {
        const h = x.type === 'heading', z = bool(b.size_enable);
        put(el, 'hidden', blank(b.text)); put(el, 'rich', b.text || ''); if (!blank(b.text)) header = true;
        put(el, '@data-own-font', secFont || bf || null); put(el, '@data-own-size', z || null);
        put(el, '--cfs-ff', bf && font(b.font) || null);
        if (h) {
          const fw = b.weight && b.weight !== 'theme' ? str(b.weight) : null;
          put(el, '@data-own-weight', !!fw || null); put(el, '--cfs-h-fw', fw);
          put(el, '--cfs-h-c', custom(b) ? color(b.color, 'var(--color-heading)') : null);
          put(el, '--cfs-h-m', z ? px(b.size_mobile, 30) : null); put(el, '--cfs-h-d', z ? px(b.size_desktop, 44) : null);
          put(el, '--cfs-h-lh', z ? str(num(b.line_height, 1.2)) : null); put(el, '--cfs-h-ls', z ? px(b.tracking) : null);
        } else {
          const w = bool(b.weight_enable);
          put(el, '@data-own-weight', w || null); put(el, '--cfs-s-fw', w ? str(b.weight || 400) : null);
          put(el, '--cfs-s-mw', px(b.max_width, 600));
          put(el, '--cfs-s-c', custom(b) ? color(b.color, 'var(--color-text)') : null);
          put(el, '--cfs-s-fs', z ? px(b.size, 16) : null); put(el, '--cfs-s-lh', z ? str(num(b.line_height, 1.5)) : null);
        }
      } else if (x.type === 'field') applyField(c, x, word);
      else if (x.type === 'info') { put(el, '@data-own-font', secFont || null); applyInfo(c, x, shop); }
      else if (x.type === 'side_image' && el.tagName === 'IMG') put(el, '@alt', str(b.alt));
    }
    const head = c.q('[data-ct-header]'); if (head) put(head, 'hidden', !header);
    const form = c.q('[data-cfs-form]');
    if (form) {
      put(form, '@data-cfs-own-field', ownField || null); put(form, '@data-own-font', secFont || null); put(form, '@data-own-weight', lw !== 'theme' || null);
      const fv = (k, val) => put(form, k, ownField ? val : null), set = id => ownField && isColor(s[id]) ? color(s[id], '') : null;
      fv('--input-border-radius', px(s.input_radius, 10)); fv('--input-padding', px(s.input_padding_y, 14) + ' ' + px(s.input_padding_x, 16));
      fv('--inputs-border-width', px(s.input_border_width, 1)); fv('--field-border-widths', px(s.input_border_width, 1)); fv('--cfs-in-size', px(s.input_size, 16));
      put(form, '--input-bg', set('input_bg')); put(form, '--field-text', set('input_text_color'));
      put(form, '--field-placeholder', set('placeholder_color')); put(form, '--field-placeholder-opacity', set('placeholder_color') ? '1' : null);
      put(form, '--input-border-color', set('input_border_color')); put(form, '--input-focus-color', set('input_focus_color'));
      const send = root.dataset.cfsSend || 'Send message';
      for (const btn of form.querySelectorAll('.cfs__submit')) {
        put(btn, '@data-cfs-full', bool(s.submit_full_width) || null); put(btn, '@data-own-shape', shape || null); put(btn, '@data-own-font', secFont || null);
        buttonColours(c, btn, on, {bg: 'submit_bg', text: 'submit_color', hover_bg: 'submit_bg_hover', hover_text: 'submit_color'});
        put(btn, '--mb-radius', shape ? px(s.submit_radius, 100) : null); put(btn, '--mb-font-size', shape ? px(s.submit_size, 16) : null);
        put(btn, '--mb-padding-x', shape ? px(s.submit_pad_x, 32) : null); put(btn, '--mb-padding-y', shape ? px(s.submit_pad_y, 16) : null);
        put(btn, '--mb-font', secFont && font(s.body_font) ? 'var(--ct-bf)' : null);
        if (btn.hasAttribute('data-cfs-default-submit')) put(btn, 'text', str(s.submit_label) || send);
        else { const x = c.blocks.find(y => y.el === btn); if (x) put(btn, 'text', str(x.b.label) || send); }
      }
    }
    margins(c, bool(s.reset_spacing), false);
  }

  const TYPES = {
    'contact-form-simple': {derive: cfs},
    contactformsimple2: {derive: cp2},
    'google-map': {derive: googleMap},
    newsletter: {derive: newsletter},
  };

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
    const blocks = [...root.querySelectorAll('[data-ct-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.ctBlock;
      if (st.rawBlocks.get(id) !== el.dataset.ctSettings) { st.rawBlocks.set(id, el.dataset.ctSettings); st.blocks.set(id, {...parse(el.dataset.ctSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.ctType, b: st.blocks.get(id) || {}};
    });
    const c = {root, st, s: st.s, put, record, blocks, q: sel => { const el = root.querySelector(sel); return el && el.closest(SEL) === root ? el : null; }};
    /* heading / subheading blocks and the older header settings, with the Heading size class */
    c.header = (secFont, sizeClass) => {
      for (const x of blocks) if (x.type === 'heading' || x.type === 'subheading') headerBlock(c, x, secFont);
      legacyHeader(c, secFont);
      for (const h of root.querySelectorAll('.ct-h')) if (h.closest(SEL) === root) put(h, '.size', sizeClass);
    };
    st.type.derive(c);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.ctSettings) { st.raw = root.dataset.ctSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    if (st.type.after) st.type.after(root, st);
  }
  function drop(root, st) {
    st.mq.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame);
    if (st.type.drop) st.type.drop(root, st);
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.ctRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const st = {root, type, live: {}, liveBlocks: new Map(), s: parse(root.dataset.ctSettings), raw: root.dataset.ctSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), mq: matchMedia('(min-width: 768px)')};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule);
    roots.set(root, st);
    derive(root, st, true);
    if (type.init) type.init(root, st);
    root.dataset.ctReady = '';
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
      if (root.dataset.ctSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-ct-block]') || n.querySelector(SEL + ',[data-ct-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-ct-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-ct-settings']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key[0] === '~') { have = el.classList.contains(key.slice(1)); want = !!v; }
      else if (key[0] === '.') { have = String(v || '').split(' ').every(k => !k || el.classList.contains(k)); want = true; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else continue;
      if (have !== want) bad.push((el.dataset.ctBlock || el.id || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaContact = {scan, audit, roots, isColor};
  scan();
})();