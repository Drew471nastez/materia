/* Materia Themes. The FAQ sections: FAQ 1 (faq1), FAQ 2 (faq5), FAQ 3 (faq),
   FAQ 4 (faq-pro), FAQ 5 (faq-floating), FAQ 6 (faq-side-image) and FAQ Tabs
   (faq-tabs). Loaded on every page by layout/theme.storelib.

   Questions: a click on a question opens or closes it (one at a time unless
   the section allows several); the answer's grid row grows from 0fr to 1fr,
   so nothing below jumps. A closed answer with a link in it is inert, so
   the link is not in the tab order. Picking a question block in the builder opens it (and its
   tab in FAQ Tabs). The section's own reveal plays once on a visitor's page.

   Live edits: every root [data-faq-root] carries its settings as JSON and
   every block its own. derive() turns them into outputs (a CSS variable, an
   attribute, text, a picture) per element, the same values the Liquid
   prints, so on load the first derive is only recorded. After that an
   output is written only when its value changes, once per frame per root,
   so a picture never reloads and an open question never closes for an
   unrelated edit. audit() lists outputs whose markup differs (tests). */
(() => {
  if (window.MateriaFaq) return;
  const SEL = '[data-faq-root]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:', 'shopify:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image = false) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };
  /* a font picker value: the Liquid prints family, fallbacks */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    return typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
  };
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  const PH = p => '<svg class="' + p + '__ph" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><rect width="400" height="300" fill="currentColor" opacity=".08"/><g fill="currentColor" opacity=".35"><circle cx="172" cy="124" r="14"/><path d="M140 192l40-46 25 28 20-18 35 36z"/></g></svg>';
  const tpl = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = String(value || '').replace(/<[^>]*>/g, '');
  }
  function media(el, v, prev, st) {
    const d = parse(v), p = parse(prev);
    const cur = el.querySelector(':scope > img, :scope > svg');
    if (cur && p.t === d.t && p.src === d.src) { if (d.t === 'img' && cur.tagName === 'IMG') cur.alt = d.alt || ''; return; }
    let n;
    if (d.t === 'img') { n = document.createElement('img'); n.alt = d.alt || ''; if (d.w && d.h) { n.width = d.w; n.height = d.h; } n.loading = 'lazy'; n.decoding = 'async'; n.src = d.src; }
    else n = tpl(PH(st.type.p)).firstChild;
    if (cur) cur.replaceWith(n); else el.prepend(n);
  }
  function icon(el, v, st) {
    const t = st.root.querySelector('template[data-faq-icons]'), src = t && t.content.querySelector('[data-icon="' + CSS.escape(v || 'plus') + '"]');
    if (!src) return;
    const n = src.cloneNode(true); n.removeAttribute('data-icon');
    el.replaceChildren(n); el.dataset.faqIcon = v;
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
    else if (key === 'media') media(el, v, prev, st);
    else if (key === 'icon') icon(el, v, st);
    else if (key === 'href') return link(el, v, st);
    else if (key === 'first') openFirst(st, !!v);
    return el;
  }

  /* ---------- questions ---------- */
  const itemsOf = root => [...root.querySelectorAll('[data-faq-item]')].filter(el => el.closest(SEL) === root);
  const groupOf = item => item.closest('[data-fqt-panel]') || item.closest(SEL);
  function setOpen(item, on) {
    item.toggleAttribute('open', on);
    const t = item.querySelector('[data-faq-trigger]'); if (t) t.setAttribute('aria-expanded', on ? 'true' : 'false');
    /* a closed answer with a link in it is inert, so the link is not reached by Tab */
    const panel = item.querySelector('[data-faq-panel]'); if (panel) { const lock = !on && !!panel.querySelector('a[href], button, input, select, textarea, [tabindex]'); if (panel.inert !== lock) panel.inert = lock; }
  }
  function toggle(st, item, force) {
    const on = force == null ? !item.hasAttribute('open') : force;
    if (on && !st.type.multiple(st.s)) for (const other of itemsOf(st.root)) if (other !== item && other.hasAttribute('open') && groupOf(other) === groupOf(item)) setOpen(other, false);
    setOpen(item, on);
  }
  function single(st) {
    if (st.type.multiple(st.s)) return;
    const seen = new Set();
    for (const it of itemsOf(st.root)) if (it.hasAttribute('open')) { const g = groupOf(it); if (seen.has(g)) setOpen(it, false); else seen.add(g); }
  }
  /* Open the first question (in each tab) changed: open or close it. */
  function openFirst(st, on) {
    const firsts = new Map();
    for (const it of itemsOf(st.root)) { const g = groupOf(it); if (!firsts.has(g)) firsts.set(g, it); }
    for (const it of firsts.values()) toggle(st, it, on);
  }
  function reveal(root) {
    if (!root.matches('[data-faq-reveal], [data-faq7-reveal]') || root.classList.contains('is-revealed')) return null;
    if (reduced.matches || document.documentElement.classList.contains('shopify-design-mode') || !('IntersectionObserver' in window)) { root.classList.add('is-revealed'); return null; }
    const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { root.classList.add('is-revealed'); io.disconnect(); } }, {threshold: 0.12});
    io.observe(root);
    return io;
  }

  /* ---------- shared derive pieces ---------- */
  const custom = s => bool(s.enable_custom_style);
  const pick = (on, v, f) => on ? color(v, f) : f;
  const scheme = c => { const v = c.s.color_scheme && c.s.color_scheme.id || c.s.color_scheme; if (typeof v === 'string' && /^[\w-]+$/.test(v)) c.put(c.root, 'scheme', v); };
  const fontVar = (c, el, name, on, v) => c.put(el, name, on && font(v) || null);
  /* heading / subheading block (snippets/faq-live-header), or FAQ Tabs' own */
  function header(c, x) {
    const {put, s} = c, b = x.b, el = x.el, secFont = bool(s.enable_custom_fonts), own = custom(b), tabs = c.st.type.tabs;
    put(el, 'rich', b.text || '');
    put(el, 'hidden', blank(b.text));
    const bfont = bool(b.enable_custom_fonts);
    put(el, '@data-own-font', secFont || bfont || null);
    fontVar(c, el, '--fb-ff', bfont, b.font);
    if (x.type === 'heading') {
      put(el, '--fb-c', own ? color(b.color, 'var(--color-heading)') : null);
      if (tabs) {
        const w = b.weight || 'theme';
        put(el, '--fb-fw', w !== 'theme' ? w : null); put(el, '@data-own-weight', w !== 'theme' || null);
        put(el, '--fb-fs-d', px(b.size_desktop, 56)); put(el, '--fb-fs-m', px(b.size_mobile, 36));
      } else {
        put(el, '--fb-fw', bool(b.weight_enable) ? String(b.weight || 700) : null); put(el, '@data-own-weight', bool(b.weight_enable) || c.st.type.ownHw(s) || null);
        const z = bool(b.size_enable);
        put(el, '--fb-fs-d', z ? px(b.size_desktop, 36) : null); put(el, '--fb-fs-m', z ? px(b.size_mobile, 26) : null);
      }
      const z = bool(b.size_enable);
      put(el, '--fb-lh', z ? String(num(b.line_height, tabs ? 1.2 : 1.15)) : null); put(el, '--fb-ls', z ? px(b.tracking) : null); put(el, '@data-own-size', z || null);
    } else {
      put(el, '--fb-c', own ? color(b.color, 'var(--color-text)') : null);
      if (tabs) { put(el, '--fb-fs', px(b.size, 16)); put(el, '--fb-mw', px(b.max_width, 540)); }
      else {
        const z = bool(b.size_enable);
        put(el, '--fb-fw', bool(b.weight_enable) ? String(b.weight || 400) : null); put(el, '@data-own-weight', bool(b.weight_enable) || null);
        put(el, '--fb-fs', z ? px(b.size, 16) : null); put(el, '--fb-lh', z ? String(num(b.line_height, 1.5)) : null); put(el, '@data-own-size', z || null);
      }
    }
  }
  function legacy(c) {
    const {put, s, root} = c, secFont = bool(s.enable_custom_fonts);
    for (const el of root.querySelectorAll('[data-faq-legacy]')) {
      if (el.closest(SEL) !== root) continue;
      const k = el.dataset.faqLegacy;
      put(el, 'rich', s[k] || '');
      put(el, '@data-own-font', secFont || null);
      if (k === 'heading') put(el, '@data-own-weight', c.st.type.ownHw(s) || null);
    }
  }
  const SIZES = {small: ['13px', '10px', '18px'], large: ['16px', '16px', '32px']};
  function button(c, x) {
    const {put} = c, b = x.b, p = c.st.type.p, own = custom(b), shape = b.use_theme_button === false || b.use_theme_button === 'false';
    let el = x.el.querySelector('[data-faq-btn]'); if (!el) return;
    el = put(el, 'href', url(b.link) || '');
    put(el, 'text', b.label || 'Learn more');
    const style = b.style || 'primary', size = shape ? b.size || 'medium' : 'theme';
    put(el, '.style', p + '__btn--' + style); put(el, '.size', p + '__btn--' + size);
    /* Link style is a plain underlined link, outside the theme button contract */
    put(el, '@data-theme-button', style === 'text' ? null : style === 'secondary' ? 'secondary' : 'primary');
    put(el, '@data-sl-button', style !== 'text' || null);
    put(el, '@data-button-local-appearance', style === 'text' ? 'underline' : 'theme');
    put(el, '@data-full', bool(b.full_width) ? 'true' : 'false');
    put(el, '@data-own-shape', shape || null);
    put(el, '--mb-bg', own ? color(b.bg_color, 'var(--btn-primary-bg-color)') : null);
    put(el, '--mb-text', own ? color(b.text_color, 'var(--btn-primary-color)') : null);
    put(el, '--mb-border', own ? color(b.border_color, 'var(--btn-primary-border-color, var(--btn-primary-bg-color))') : null);
    put(el, '--mb-hover-bg', own ? color(b.bg_color_hover, 'var(--btn-primary-hover-bg-color)') : null);
    put(el, '--mb-hover-text', own ? color(b.text_color_hover, 'var(--btn-primary-hover-color)') : null);
    put(el, '--' + p + '-btn-border-width', shape ? null : 'var(--btn-border-width, 1px)');
    const z = SIZES[b.size] || ['14px', '13px', '24px'];
    put(el, '--mb-radius', shape ? px(b.radius, 100) : null);
    put(el, '--mb-font-size', shape ? z[0] : null); put(el, '--mb-padding-y', shape ? z[1] : null); put(el, '--mb-padding-x', shape ? z[2] : null);
  }
  function question(c, x, fallback) {
    const {put, s} = c, b = x.b;
    const q = x.el.querySelector('[data-faq-question]'), a = x.el.querySelector('[data-faq-answer]');
    if (q) put(q, 'text', b.question || fallback || '');
    if (a) { put(a, 'rich', b.answer || ''); put(a, '@data-own-font', bool(s.enable_custom_fonts) || null); }
    const ic = x.el.querySelector('[data-faq-icon]');
    if (ic && c.st.type.icons) put(ic, 'icon', s.open_icon || 'plus');
  }
  function image(c, el, v) {
    const src = url(v, true);
    c.put(el, 'media', JSON.stringify(src ? {t: 'img', src, alt: v && v.alt || '', w: v && v.width || 0, h: v && v.height || 0} : {t: 'ph'}));
  }

  /* FAQ 1 to FAQ 4: the same list as snippets/faq-live-vars */
  function accordion(c) {
    const {root, s, put} = c, p = c.st.type.p, o = custom(s), v = n => '--' + p + '-' + n, [cardBg, cardBorder] = c.st.type.card;
    const align = s.content_alignment || 'left';
    put(root, v('bg'), pick(o, s.section_bg, 'var(--color-background)'));
    put(root, v('pt'), px(s.padding_top, 60)); put(root, v('pb'), px(s.padding_bottom, 60)); put(root, v('col-gap'), px(s.col_gap, 60));
    put(root, v('align'), align); put(root, v('mi'), align === 'center' ? 'auto' : '0'); put(root, v('cta-justify'), align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center');
    put(root, v('gap-header'), px(s.gap_header_to_items, 32)); put(root, v('maxw'), px(s.max_content_width, 800));
    put(root, v('h-m'), px(s.heading_size_mobile, 26)); put(root, v('h-d'), px(s.heading_size_desktop, 36)); put(root, v('heading-color'), pick(o, s.heading_color, 'var(--color-heading)'));
    put(root, v('hw'), bool(s.enable_custom_heading_weight) ? String(s.heading_weight || 600) : null);
    put(root, v('gap-sub'), px(s.gap_heading_to_subheading, 12)); put(root, v('sub-m'), px(s.subheading_size_mobile, 14)); put(root, v('sub-d'), px(s.subheading_size_desktop, 16)); put(root, v('sub-color'), pick(o, s.subheading_color, 'var(--color-text)'));
    put(root, v('gap-items'), px(s.gap_between_items));
    put(root, v('card-bg'), pick(o, s.card_bg, cardBg)); put(root, v('card-border'), pick(o, s.card_border_color, cardBorder)); put(root, v('radius'), px(s.item_radius)); put(root, v('divider'), pick(o, s.divider_color, 'var(--color-border)'));
    put(root, v('py'), px(s.item_padding_y, 20)); put(root, v('px'), px(s.item_padding_x, 4));
    put(root, v('q-color'), pick(o, s.question_color, 'var(--color-heading)')); put(root, v('q-m'), px(s.question_size_mobile, 15)); put(root, v('q-d'), px(s.question_size_desktop, 18));
    put(root, v('qw'), bool(s.enable_custom_question_weight) ? String(s.question_weight || 600) : null);
    put(root, v('hover'), pick(o, s.hover_color, 'var(--color-primary)')); put(root, v('icon-color'), pick(o, s.icon_color, 'var(--color-heading)'));
    put(root, v('a-color'), pick(o, s.answer_color, 'var(--color-text)')); put(root, v('a-m'), px(s.answer_size_mobile, 14)); put(root, v('a-d'), px(s.answer_size_desktop, 15));
    const f = bool(s.enable_custom_fonts);
    fontVar(c, root, v('hf'), f, s.heading_font); fontVar(c, root, v('bf'), f, s.body_font);
    put(root, '@data-' + p + '-width', s.section_width || '');
    put(root, '@data-' + p + '-hw', bool(s.enable_custom_heading_weight) || null);
    put(root, '@data-' + p + '-qw', bool(s.enable_custom_question_weight) || null);
    put(root, '@data-' + p + '-dividers', (bool(s.show_dividers) && num(s.gap_between_items) === 0) || null);
    if (s.image_ratio != null && s.image_ratio !== '') {
      put(root, v('gap-m'), px(s.gap_mobile, 30)); put(root, v('gap-d'), px(s.gap_desktop, 60));
      put(root, v('ratio'), {portrait: '3/4', landscape: '4/3', wide: '16/9'}[s.image_ratio] || '1/1'); put(root, v('img-r'), px(s.image_radius, 16));
      put(root, '@data-' + p + '-side', s.image_position || 'left');
      const m = c.q('[data-faq-media]'); if (m) image(c, m, s.image);
    }
  }
  const RATIO = {'4_5': '4 / 5', '3_4': '3 / 4', '4_3': '4 / 3', '3_2': '3 / 2', '16_9': '16 / 9', auto: '4 / 5'};
  function sideImage(c) {
    const {root, s, put} = c, o = custom(s), hw = s.heading_weight || 'theme';
    put(root, '--fsi-bg', pick(o, s.section_bg, 'var(--color-background)'));
    put(root, '--fsi-pt-m', px(s.padding_top_mobile, 56)); put(root, '--fsi-pb-m', px(s.padding_bottom_mobile, 56)); put(root, '--fsi-pt-d', px(s.padding_top_desktop, 96)); put(root, '--fsi-pb-d', px(s.padding_bottom_desktop, 96));
    put(root, '--fsi-maxw', px(s.max_width, 1280));
    put(root, '--fsi-h-m', px(s.heading_size_mobile, 36)); put(root, '--fsi-h-d', px(s.heading_size_desktop, 56)); put(root, '--fsi-hw', hw !== 'theme' ? hw : 'var(--heading-weight, 700)');
    put(root, '--fsi-heading-color', pick(o, s.heading_color, 'var(--color-heading)')); put(root, '--fsi-sub-color', pick(o, s.sub_color, 'var(--color-text)'));
    put(root, '--fsi-list-bg', pick(o, s.list_bg, 'var(--color-background)')); put(root, '--fsi-list-border', pick(o, s.list_border, 'var(--color-border)')); put(root, '--fsi-divider', pick(o, s.divider_color, 'var(--color-border)'));
    put(root, '--fsi-list-r', px(s.list_radius, 12)); put(root, '--fsi-py', px(s.item_padding_y, 22)); put(root, '--fsi-px', px(s.item_padding_x, 24));
    put(root, '--fsi-icon', pick(o, s.icon_color, 'var(--color-heading)')); put(root, '--fsi-q-color', pick(o, s.q_color, 'var(--color-heading)')); put(root, '--fsi-q-size', px(s.q_size, 16)); put(root, '--fsi-q-weight', String(s.q_weight || 600));
    put(root, '--fsi-a-color', pick(o, s.a_color, 'var(--color-text)')); put(root, '--fsi-a-size', px(s.a_size, 15));
    put(root, '--fsi-img-bg', pick(o, s.image_bg, 'var(--color-background)')); put(root, '--fsi-img-r', px(s.image_radius)); put(root, '--fsi-ratio', RATIO[s.image_aspect] || '1 / 1'); put(root, '--fsi-fit', s.image_fit || 'cover'); put(root, '--fsi-img-minh', px(s.image_min_height_desktop));
    const f = bool(s.enable_custom_fonts);
    fontVar(c, root, '--fsi-hf', f, s.heading_font); fontVar(c, root, '--fsi-bf', f, s.body_font);
    put(root, '@data-fsi-width', s.section_width || 'full_width'); put(root, '@data-fsi-side', s.image_position || 'right');
    put(root, '@data-fsi-mobile-image', bool(s.show_image_on_mobile) ? 'true' : 'false'); put(root, '@data-fsi-aspect', s.image_aspect || '1_1');
    const m = c.q('[data-faq-media]'); if (m) image(c, m, s.image);
  }
  function tabs(c) {
    const {root, s, put} = c, o = custom(s), align = s.header_align || 'center';
    put(root, '--fqt-bg', pick(o, s.section_bg, 'var(--color-background)'));
    put(root, '--fqt-pt-m', px(s.padding_top_mobile, 56)); put(root, '--fqt-pb-m', px(s.padding_bottom_mobile, 56)); put(root, '--fqt-pt-d', px(s.padding_top_desktop, 96)); put(root, '--fqt-pb-d', px(s.padding_bottom_desktop, 96));
    put(root, '--fqt-w-m', px(s.section_max_width_mobile, 560)); put(root, '--fqt-w-t', px(s.section_max_width_tablet, 800)); put(root, '--fqt-w-d', px(s.section_max_width_desktop, 920));
    put(root, '--fqt-align', align); put(root, '--fqt-flex', align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center');
    put(root, '--fqt-hgap-m', px(s.heading_sub_gap_mobile, 12)); put(root, '--fqt-hgap-d', px(s.heading_sub_gap_desktop, 16)); put(root, '--fqt-gap-tabs-m', px(s.gap_subheading_tabs_mobile, 24)); put(root, '--fqt-gap-tabs-d', px(s.gap_subheading_tabs, 32)); put(root, '--fqt-gap-list', px(s.gap_tabs_list, 32));
    put(root, '--fqt-track', pick(o, s.tabs_track_bg, 'var(--color-background)')); put(root, '--fqt-shadow', String(s.tabs_shadow || '').trim() || 'none');
    put(root, '--fqt-active-bg', pick(o, s.tab_active_bg, 'var(--btn-primary-bg-color)')); put(root, '--fqt-active', pick(o, s.tab_active_color, 'var(--btn-primary-color)')); put(root, '--fqt-inactive', pick(o, s.tab_inactive_color, 'var(--color-text)'));
    put(root, '--fqt-tab-w', String(s.tab_weight || 600)); put(root, '--fqt-tab-s', px(s.tab_size, 15));
    put(root, '--fqt-divider', pick(o, s.divider_color, 'var(--color-border)')); put(root, '--fqt-py', px(s.item_padding_y, 22)); put(root, '--fqt-plus', pick(o, s.plus_color, 'var(--color-heading)'));
    put(root, '--fqt-q-color', pick(o, s.q_color, 'var(--color-heading)')); put(root, '--fqt-q-w', String(s.q_weight || 700)); put(root, '--fqt-q-s', px(s.q_size, 18));
    put(root, '--fqt-a-color', pick(o, s.a_color, 'var(--color-text)')); put(root, '--fqt-a-s', px(s.a_size, 16));
    const f = bool(s.enable_custom_fonts);
    fontVar(c, root, '--fqt-hf', f, s.heading_font); fontVar(c, root, '--fqt-bf', f, s.body_font);
    put(root, '@data-fqt-width', s.section_width || 'full_width'); put(root, '@data-fqt-show', s.show_section_on || 'all');
    for (const el of root.querySelectorAll('[data-fqt-label]')) { const t = s['tab_' + el.dataset.fqtLabel + '_label']; put(el, 'text', t || ''); put(el, 'hidden', blank(t)); }
  }
  function floating(c) {
    const {root, s, put} = c, o = custom(s), align = s.header_align || 'center', hw = s.heading_weight || 'theme', qw = s.q_weight || 'theme';
    put(root, '--ffq-bg', pick(o, s.section_bg, 'var(--color-background)'));
    put(root, '--ffq-pt-m', px(s.padding_top_mobile, 56)); put(root, '--ffq-pb-m', px(s.padding_bottom_mobile, 56)); put(root, '--ffq-pt-d', px(s.padding_top_desktop, 96)); put(root, '--ffq-pb-d', px(s.padding_bottom_desktop, 96));
    put(root, '--ffq-maxw', px(s.max_width, 1200)); put(root, '--ffq-align', align); put(root, '--ffq-flex', align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center');
    put(root, '--ffq-h-m', px(s.heading_size_mobile, 30)); put(root, '--ffq-h-d', px(s.heading_size_desktop, 48)); put(root, '--ffq-hw', hw !== 'theme' ? hw : 'var(--heading-weight, 700)');
    put(root, '--ffq-heading-color', pick(o, s.heading_color, 'var(--color-heading)')); put(root, '--ffq-sub-color', pick(o, s.sub_color, 'var(--color-text)'));
    put(root, '--ffq-img-w', px(s.image_width, 360)); put(root, '--ffq-img-r', px(s.image_radius, 24)); put(root, '--ffq-img-bg', pick(o, s.image_bg, 'var(--color-background)')); put(root, '--ffq-fit', s.image_fit || 'contain');
    put(root, '--ffq-card-r', px(s.card_radius, 18)); put(root, '--ffq-card-p', px(s.card_padding, 22)); put(root, '--ffq-card-mw', px(s.card_max_width, 320)); put(root, '--ffq-overlap', px(s.card_overlap, 36));
    put(root, '--ffq-q-size', px(s.q_size, 19)); put(root, '--ffq-q-w', qw !== 'theme' ? qw : 'var(--heading-weight, 700)'); put(root, '--ffq-a-size', px(s.a_size, 14));
    const f = bool(s.enable_custom_fonts);
    fontVar(c, root, '--ffq-hf', f, s.heading_font); fontVar(c, root, '--ffq-bf', f, s.body_font);
    put(root, '@data-ffq-mobile', s.mobile_layout || 'zigzag');
  }
  function card(c, x) {
    const {put, s} = c, b = x.b, el = x.el, own = custom(b), f = bool(s.enable_custom_fonts);
    const q = el.querySelector('[data-faq-question]'), a = el.querySelector('[data-faq-answer]');
    if (q) { put(q, 'text', b.question || ''); put(q, '@data-own-font', f || null); put(q, '@data-own-weight', (s.q_weight || 'theme') !== 'theme' || null); }
    if (a) { put(a, 'rich', b.answer || ''); put(a, '@data-own-font', f || null); }
    put(el, '@data-pos', b.position || 'top-left');
    put(el, '--ffq-card-bg', own ? color(b.bg_color, 'color-mix(in srgb, var(--color-heading) 6%, var(--color-background))') : null);
    put(el, '--ffq-card-fg', own ? color(b.text_color, 'var(--color-text)') : null);
    put(el, '--ffq-card-q', own ? color(b.q_color, 'var(--color-heading)') : null);
  }

  /* ---------- section types ---------- */
  const many = s => bool(s.allow_multiple_open);
  const famHw = s => bool(s.enable_custom_heading_weight);
  const ownSel = s => (s.heading_weight || 'theme') !== 'theme';
  const famMargins = (s, d) => [s['section_margin_top_' + (d ? 'desktop' : 'mobile')], s['section_margin_bottom_' + (d ? 'desktop' : 'mobile')]];
  const ACC = p => ({p, derive: accordion, multiple: many, ownHw: famHw, margins: famMargins, icons: true, first: s => bool(s.first_item_open)});
  const TYPES = {
    'faq-pro': {...ACC('faq7'), card: ['rgba(var(--color-heading-rgb), 0.04)', 'transparent']},
    faq: {...ACC('faq6'), card: ['transparent', 'transparent']},
    faq1: {...ACC('faq1'), card: ['var(--color-background)', 'var(--color-border)']},
    faq5: {...ACC('faq5'), card: ['transparent', 'transparent']},
    'faq-side-image': {p: 'fsi', derive: sideImage, multiple: many, ownHw: ownSel, margins: s => [s.section_margin_top, s.section_margin_bottom], icons: true, first: s => bool(s.open_first)},
    'faq-tabs': {p: 'fqt', tabs: true, derive: tabs, multiple: s => s.allow_multiple_open !== false && s.allow_multiple_open !== 'false', ownHw: () => false, margins: (s, d) => d ? [s.section_margin_top_desktop, s.section_margin_bottom_desktop] : [0, 0], first: s => bool(s.open_first)},
    'faq-floating': {p: 'ffq', derive: floating, multiple: () => true, ownHw: ownSel, margins: s => [s.section_margin_top, s.section_margin_bottom]},
  };

  function derive(root, st, record) {
    const type = st.type, out = [];
    const put = (el, key, v) => {
      if (!el) return el;
      if (record === 'audit') { out.push([el, key, v]); return el; }
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      const prev = m.get(key); m.set(key, v);
      return write(el, key, v, prev, st) || el;
    };
    const blocks = [...root.querySelectorAll('[data-faq-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.faqBlock;
      if (st.rawBlocks.get(id) !== el.dataset.faqSettings) { st.rawBlocks.set(id, el.dataset.faqSettings); st.blocks.set(id, {...parse(el.dataset.faqSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.faqType, b: st.blocks.get(id) || {}};
    });
    const c = {root, st, s: st.s, put, q: sel => root.querySelector(sel)};
    scheme(c);
    type.derive(c);
    legacy(c);
    const list = root.querySelector('[data-faq-list]');
    if (list) put(list, '@data-multiple', type.multiple(st.s) ? 'true' : 'false');
    if (type.first) put(root, 'first', type.first(st.s));
    for (const x of blocks) {
      if (x.type === 'heading' || x.type === 'subheading') header(c, x);
      else if (x.type === 'button') button(c, x);
      else if (x.type === 'faq_item') question(c, x, type.tabs ? '' : 'Question');
      else if (x.type === 'faq_card') card(c, x);
      else if (x.type === 'product_image') { const m = x.el.matches('[data-faq-media]') ? x.el : x.el.querySelector('[data-faq-media]'); if (m) image(c, m, x.b.image); }
    }
    const wrap = root.closest('.shopify-section');
    if (wrap && record !== 'audit') {
      const reset = bool(st.s.reset_spacing), [t, b] = type.margins(st.s, st.mq.matches);
      put(wrap, '!margin-top', reset ? '0px' : px(t)); put(wrap, '!margin-bottom', reset ? '0px' : px(b));
    }
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.faqSettings) { st.raw = root.dataset.faqSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    single(st);
  }
  function drop(root, st) {
    st.mq.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame); if (st.io) st.io.disconnect(); roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.faqRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const st = {root, type, live: {}, liveBlocks: new Map(), s: parse(root.dataset.faqSettings), raw: root.dataset.faqSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), mq: matchMedia('(min-width: 768px)')};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule);
    roots.set(root, st);
    derive(root, st, true);
    for (const it of itemsOf(root)) setOpen(it, it.hasAttribute('open'));
    st.io = reveal(root);
    root.dataset.faqReady = '';
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
      if (root.dataset.faqSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest && e.target.closest('[data-faq-trigger]'); if (!t) return;
    const root = t.closest(SEL), st = roots.get(root), item = t.closest('[data-faq-item]');
    if (!st || !item || item.closest(SEL) !== root) return;
    toggle(st, item);
  });
  /* The builder picked a block: open that question, and its tab. */
  document.addEventListener('shopify:block:select', e => {
    const d = e.detail || {}, id = d.blockId || d.block_id || '';
    let el = e.target && e.target.closest ? e.target.closest('[data-faq-block]') : null;
    if (!el && id) el = document.querySelector('[data-faq-block="' + CSS.escape(String(id)) + '"]');
    if (!el || !el.matches('[data-faq-item]')) return;
    const root = el.closest(SEL), st = roots.get(root); if (!st) return;
    const panel = el.closest('[data-fqt-panel]');
    if (panel) { const r = root.querySelector('[data-fqt-radio="' + panel.dataset.fqtPanel + '"]'); if (r && !r.checked) r.checked = true; }
    toggle(st, el, true);
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-faq-block]') || n.querySelector(SEL + ',[data-faq-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-faq-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-faq-settings']});
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
      else continue;
      if (have !== want) bad.push((el.dataset.faqBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaFaq = {scan, audit, roots, toggle: (root, item, on) => { const st = roots.get(root); if (st) toggle(st, item, on); }};
  scan();
})();
