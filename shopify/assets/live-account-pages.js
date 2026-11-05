/* Materia Themes. The account, password and utility page sections: Sign in
   (main-login), Create account (main-register), Activate account
   (main-activate-account), Reset password (main-reset-password), Account
   (main-account), Addresses (main-addresses), Order (main-order), Sign in
   popup (login-popup), Password header and footer (main-password-header,
   main-password-footer), Coming soon (coming-soon), 404 page (page-404),
   Compare products (page-compare), Contact page (page-contact), Page content
   (page-default), Wishlist (page-wishlist), Store locations
   (pages-store-location) and Form message (form-message). Loaded on every
   page by layout/theme.storelib.

   Live edits: every root [data-ap-root] carries its settings as JSON and
   every block [data-ap-block] its own. derive() turns them into outputs (a
   CSS variable, an attribute, a class, text) per element, the same values
   the Liquid prints, so on load the first derive is only recorded. After
   that an output is written only when its value changes, once per frame per
   root, so a picture never reloads and a field keeps what was typed. Two
   instances on a page are independent: an edit reaches only the root whose
   data-ap-section is the edited section. A redraw (storelib:section-load)
   brings a new root, which is set up once; the old one is dropped.

   The forms keep their real paths (the store's customer_login,
   create_customer, contact and customer forms, which Storelib signs in with
   an emailed code, sends to the inbox or saves as a subscriber); this file
   never posts. Settings that need the server (a picture, a video, a map
   embed code) wait for the builder's redraw. audit() lists outputs whose
   markup differs from the derived value (tests). */
(() => {
  if (window.MateriaAccountPages) return;
  const SEL = '[data-ap-root]';
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
  /* a raw colour value as Liquid prints it ({{ x }}), only when it is not blank */
  const raw = v => { if (v && typeof v === 'object') v = v.hex ?? v.value ?? v.color; return typeof v === 'string' && v.trim() ? v.trim() : null; };
  /* a font picker value: the Liquid prints family, fallbacks */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    return typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
  };
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  /* Liquid's default filter: only nil, false and empty fall back (0 stays 0) */
  const dflt = (v, d) => v == null || v === '' || v === false ? d : v;
  const plain = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '');
  const url = v => { const s = str(v).trim(); return s && api() && api().url ? api().url(s) : s; };

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = plain(value);
  }
  function write(el, key, v, prev) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') { for (const c of String(prev || '').split(' ')) if (c) el.classList.remove(c); for (const c of String(v || '').split(' ')) if (c) el.classList.add(c); }
    else if (key[0] === '~') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'value') { if (el.value !== v && document.activeElement !== el) el.value = v; }
  }

  /* ---------- shared pieces ---------- */
  const schemeOf = s => { const v = s.color_scheme && s.color_scheme.id || s.color_scheme; return typeof v === 'string' && /^[\w-]+$/.test(v) ? v : 'default-color-scheme'; };
  const custom = s => bool(s.enable_custom_style);
  /* the elements of this root (not of a nested root) */
  const own = (c, sel) => [...c.root.querySelectorAll(sel)].filter(el => el.closest(SEL) === c.root);
  /* the words of a setting, with the element's fallback; an optional element hides when there are none */
  function words(c, el, value, mode) {
    const fb = el.dataset.apFallback;
    const v = blank(value) && fb != null ? fb : value;
    c.put(el, mode, v == null ? '' : v);
    if (el.hasAttribute('data-ap-opt')) c.put(el, 'hidden', blank(v));
  }
  /* section level text, attributes, links and switches (outside blocks) */
  function common(c) {
    /* data-ap-* always names a section setting, also inside a block (block settings use data-ap-b*) */
    const {s, put} = c, out = () => true;
    for (const el of own(c, '[data-ap-text]')) if (out(el)) words(c, el, s[el.dataset.apText], 'text');
    for (const el of own(c, '[data-ap-rich]')) if (out(el)) words(c, el, s[el.dataset.apRich], 'rich');
    for (const el of own(c, '[data-ap-attr-placeholder]')) put(el, '@placeholder', str(s[el.dataset.apAttrPlaceholder]));
    for (const el of own(c, '[data-ap-href]')) if (out(el)) put(el, '@href', url(s[el.dataset.apHref]) || el.dataset.apHrefFallback || el.getAttribute('href'));
    for (const el of own(c, '[data-ap-aria]')) put(el, '@aria-label', str(s[el.dataset.apAria]) || 'Account');
    for (const el of own(c, '[data-ap-show]')) if (out(el)) put(el, 'hidden', !bool(s[el.dataset.apShow]));
    for (const el of own(c, '[data-ap-hide]')) if (out(el)) put(el, 'hidden', bool(s[el.dataset.apHide]));
  }
  /* block level text and switches */
  function blockWords(c, x) {
    const {put} = c, b = x.b, mine = el => el.closest('[data-ap-block]') === x.el;
    const list = sel => [x.el, ...x.el.querySelectorAll(sel)].filter(el => el.matches(sel) && mine(el));
    for (const el of list('[data-ap-btext]')) words(c, el, b[el.dataset.apBtext], 'text');
    for (const el of list('[data-ap-brich]')) words(c, el, b[el.dataset.apBrich], 'rich');
    for (const el of list('[data-ap-bph]')) put(el, '@placeholder', str(b[el.dataset.apBph]) || el.dataset.apFallback || '');
    for (const el of list('[data-ap-bshow]')) put(el, 'hidden', !bool(b[el.dataset.apBshow]));
  }
  /* scheme, width, the space between sections, custom colours and fonts */
  function frame(c, {width, heading = 'heading_color', text = 'text_color', colours = true} = {}) {
    const {root, s, put} = c, on = custom(s);
    put(root, 'scheme', schemeOf(s));
    const w = c.q('[data-ap-width]');
    if (w) put(w, '.w', width !== undefined ? width : (s.section_width || 'container'));
    put(root, '@data-ap-reset', bool(s.reset_spacing));
    if (colours) {
      put(root, '--ap-h-c', on && heading && raw(s[heading]) || null);
      put(root, '--ap-t-c', on && text && raw(s[text]) || null);
    }
    const f = bool(s.enable_custom_fonts), hf = f && s.heading_font && s.heading_font.family ? font(s.heading_font) : null, bf = f && s.body_font && s.body_font.family ? font(s.body_font) : null;
    put(root, '--heading-font', hf); put(root, '--body-font', bf); put(root, '--mb-font', bf);
  }
  /* the .ap padding: computer and phone */
  function pads(c, k = {}) {
    const {root, s, put} = c;
    put(root, '--ap-pt', px(s[k.t || 'padding_top'])); put(root, '--ap-pb', px(s[k.b || 'padding_bottom']));
    put(root, '--ap-pt-m', px(s[k.tm || 'padding_top_mobile'])); put(root, '--ap-pb-m', px(s[k.bm || 'padding_bottom_mobile']));
  }
  /* the theme's .section padding (--section-pt as a number, pt-min under 30) */
  function sectionPads(c, min = true) {
    const {root, s, put} = c;
    put(root, '--section-pt', str(s.padding_top)); put(root, '--section-pb', str(s.padding_bottom));
    if (min) { put(root, '~pt-min', num(s.padding_top) < 30); put(root, '~pb-min', num(s.padding_bottom) < 30); }
  }
  /* the wrapper margins of Sign in: [top, bottom] for this width; reset wins */
  function margins(c) {
    const wrap = c.root.closest('.shopify-section'); if (!wrap || c.record) return;
    const s = c.s, d = c.st.mq.matches, reset = bool(s.reset_spacing);
    c.put(wrap, '!margin-top', reset ? '0px' : px(s['section_margin_top_' + (d ? 'desktop' : 'mobile')]));
    c.put(wrap, '!margin-bottom', reset ? '0px' : px(s['section_margin_bottom_' + (d ? 'desktop' : 'mobile')]));
  }
  const ALIGN = {left: 'flex-start', right: 'flex-end', center: 'center'};
  /* the gradient stops Liquid prints: the colours set, one colour twice */
  const stops = (o, k) => { const l = [1, 2, 3].map(i => raw(o[k + i])).filter(Boolean); return l.length === 1 ? l.concat(l) : l; };

  /* ---------- the sections ---------- */
  function login(c) {
    const {root, s, put} = c;
    frame(c, {heading: 'heading_color', text: 'subtext_color'});
    pads(c);
    put(root, '--ap-hfs-d', px(s.heading_font_size_desktop, 30)); put(root, '--ap-hfs-m', px(s.heading_font_size_mobile, 24));
    put(root, '--ap-tfs-d', px(s.subtext_font_size_desktop, 16)); put(root, '--ap-tfs-m', px(s.subtext_font_size_mobile, 14));
    put(root, '--ap-gap-d', px(s.column_gap)); put(root, '--ap-gap-m', px(s.column_gap_mobile));
    put(root, '--ap-align', s.content_alignment || 'left');
    put(root, '--heading-weight', bool(s.enable_custom_font_weight_heading) ? str(dflt(s.font_weight_heading, 600)) : null);
    common(c); margins(c);
  }
  function form(c) {
    const {root, s, put} = c;
    frame(c); pads(c);
    put(root, '--ap-hfs-d', px(s.heading_size_desktop, 30)); put(root, '--ap-hfs-m', px(s.heading_size_mobile, 24));
    put(root, '--ap-tfs-d', px(s.text_size_desktop, 16)); put(root, '--ap-tfs-m', px(s.text_size_mobile, 14));
    put(root, '--ap-maxw', px(s.form_width, 560)); put(root, '--ap-align', s.content_alignment || 'center');
    common(c);
  }
  function account(c) {
    const {root, s, put} = c;
    const map = {'strecth-width': 'stretch_width', 'full-width': 'full_width', 'container-fluid': 'fluid_container'};
    frame(c, c.type === 'main-account' ? {width: map[s.container] || s.container || 'container'} : {});
    pads(c);
    put(root, '--ap-hfs-d', px(s.heading_size_desktop, 30)); put(root, '--ap-hfs-m', px(s.heading_size_mobile, 24));
    common(c);
  }
  /* the tab names assets/theme.js reads to switch tabs and fill the heading */
  function popup(c) {
    const {s, put} = c, li = str(s.login_title), rg = str(s.register_title);
    frame(c); common(c);
    const login = c.q('.bls-login'), reg = c.q('.bls-register');
    if (login) { put(login, '@data-title-default', li); put(login, '@data-login-hidden', li); }
    if (reg) put(reg, '@data-login-hidden', rg);
    for (const b of own(c, '[data-login-show]')) put(b, '@data-login-show', b.closest('.bls-register') ? li : rg);
  }
  function passwordFooter(c) {
    const {root, s, put} = c;
    frame(c); pads(c);
    put(root, 'hidden', s.show_footer === false || s.show_footer === 'false');
    put(root, '--ap-tfs-d', px(s.text_size, 13)); put(root, '--ap-tfs-m', px(s.text_size, 13));
    const a = c.q('[data-ap-href="owner_login_url"]');
    if (a) put(a, 'hidden', !bool(s.show_owner_login));
    common(c);
  }
  function passwordHeader(c) {
    const {root, s, put} = c;
    frame(c, {text: null}); pads(c);
    put(root, '--ap-logo-d', px(s.logo_width, 160)); put(root, '--ap-logo-m', px(s.logo_width_mobile, 120));
    put(root, '--ap-justify', ALIGN[s.logo_alignment] || 'center');
    common(c);
  }
  function formMessage(c) { frame(c, {colours: false}); common(c); }
  function pageDefault(c) {
    const {root, s, put} = c;
    frame(c); sectionPads(c);
    put(root, '--ap-title-align', s.title_alignment || 'center');
    put(root, '--ap-text-w', num(s.text_width) > 0 ? px(s.text_width) : null);
    const t = c.q('.page-title'); if (t) put(t, 'hidden', s.show_title === false || s.show_title === 'false');
  }
  function wishlist(c) {
    const {root, s, put} = c;
    frame(c, {colours: false}); sectionPads(c, false);
    if (root.hasAttribute('data-removed-message')) put(root, '@data-removed-message', str(s.removed_message) || 'Removed from your wishlist');
    common(c);
  }
  function compare(c) { frame(c, {colours: false}); sectionPads(c); common(c); }
  function contact(c) {
    const {root, s, put} = c;
    frame(c); sectionPads(c);
    put(root, '~remove_spacing', bool(s.reset_spacing));
    put(root, '--column_gap', px(s.column_gap));
    for (const x of c.blocks) {
      blockWords(c, x);
      if (x.type === 'contact') { const box = x.el.querySelector('.contact-privacy__input'); if (box) put(box, '@required', bool(x.b.show_privacy)); }
    }
  }
  function storeLocation(c) {
    const {root, s, put} = c, on = custom(s);
    frame(c); sectionPads(c);
    put(root, '--ap-align', s.header_alignment || 'center'); put(root, '--ap-gap', px(s.card_gap, 24));
    put(root, '--ap-card-bg', on && raw(s.card_background) || null); put(root, '--ap-card-border', on && raw(s.card_border) || null);
    const head = c.q('[data-ap-header]');
    if (head) { put(head, 'hidden', blank(s.heading) && blank(s.description)); put(head, '~px-20', s.section_width === 'full_width'); }
    const h = c.q('.section__header-heading'); if (h) put(h, '.size', {small: 'h3', large: 'h1-size'}[s.header_size] || '');
    common(c);
    for (const x of c.blocks) {
      blockWords(c, x);
      const b = x.b, tel = x.el.querySelector('[data-ap-tel]'), maps = x.el.querySelector('[data-ap-maps]');
      const dl = x.el.querySelector('[data-ap-text="directions_label"]'); if (dl) put(dl, 'text', str(s.directions_label));
      if (tel) put(tel, '@href', 'tel:' + str(b.store_phone).replace(/[\s().-]/g, ''));
      if (maps) {
        const q = str(b.store_lat).trim() && str(b.store_lng).trim() ? b.store_lat + ',' + b.store_lng : encodeURIComponent(str(b.store_address).replace(/\r?\n/g, '')).replace(/%20/g, '+');
        put(maps, '@href', 'https://www.google.com/maps/search/?api=1&query=' + q); put(maps, 'hidden', !q);
      }
    }
  }
  const SIZE_FS = v => v > 41 ? 'fs-big' : v > 24 ? 'fs-medium' : 'fs-custom';
  const SIZE_MB = v => v > 41 ? 'mb-big' : v > 30 ? 'mb-medium' : 'mb-custom';
  function page404(c) {
    const {root, s, put} = c, on = custom(s);
    frame(c); sectionPads(c);
    put(root, '--ap-icon', px(dflt(s.icon_size, 120))); put(root, '--ap-icon-gap', px(dflt(s.icon_spacing_bottom, 24)));
    put(root, '--ap-icon-c', on && isColor(s.icon_color) ? color(s.icon_color, 'var(--color-heading)') : null);
    const size = num(dflt(s.icon_size, 120)), svg = c.q('.page-404__icon-wrap svg'), img = c.q('.page-404__icon-wrap img');
    if (svg) { put(svg, '@width', str(size)); put(svg, '@height', str(size)); }
    if (img) {
      if (!img.dataset.apRatio) img.dataset.apRatio = String((+img.getAttribute('width') || 1) / (+img.getAttribute('height') || 1));
      put(img, '@width', str(size)); put(img, '@height', str(Math.round(size / +img.dataset.apRatio)));
    }
    common(c);
    for (const x of c.blocks) {
      const b = x.b, el = x.el;
      if (x.type === 'heading' || x.type === 'subheading' || x.type === 'description') {
        blockWords(c, x);
        put(el, '--font-size', str(b.font_size)); put(el, '--space-bottom', str(b.spacing_bottom));
        put(el, '.fs', SIZE_FS(num(b.font_size))); put(el, '.mb', SIZE_MB(num(b.spacing_bottom)));
        put(el, '~uppercase', bool(b.uppercase));
        const cw = x.type === 'description' || bool(b.custom_weight);
        put(el, '.wt', cw ? str(b.font_weight) : '');
        if (x.type !== 'description') put(el, '@data-own-weight', bool(b.custom_weight));
      } else if (x.type === 'button') {
        const a = el.querySelector('a');
        put(el, 'hidden', blank(b.first_button_label)); put(el, '--space-bottom', str(b.spacing_bottom)); put(el, '.mb', SIZE_MB(num(b.spacing_bottom)));
        if (a) {
          put(a, 'text', str(b.first_button_label));
          const link = url(b.first_button_link);
          put(a, '@href', link || null); put(a, '@role', link ? null : 'link'); put(a, '@aria-disabled', link ? null : 'true');
          put(a, '@target', bool(b.open_link) ? '_blank' : null); put(a, '@rel', bool(b.open_link) ? 'noopener' : null);
          put(a, '.type', 'btn-' + (b.first_button_type || 'primary'));
          put(a, '@data-button-local-appearance', b.first_button_type === 'outline' ? 'outline' : 'theme');
        }
      }
    }
  }
  /* Coming soon: the --pw-* variables of snippets/password-launch-content */
  function comingSoon(c) {
    const {root, s, put} = c, on = custom(s);
    frame(c, {colours: false});
    put(root, '.w', s.section_width || '');
    put(root, '@data-fill-screen', s.fill_screen === false || s.fill_screen === 'false' ? 'false' : 'true');
    put(root, '--pw-align', s.content_alignment || 'center'); put(root, '--pw-valign', s.vertical_alignment || 'center');
    put(root, '--pw-vh', str(dflt(s.viewport_height, 84))); put(root, '--pw-gap', px(dflt(s.block_gap, 24)));
    put(root, '--pw-content-bg', on && raw(s.content_background) || null);
    put(root, '--pw-content-pad', on ? px(s.content_padding) : null); put(root, '--pw-content-radius', on ? px(s.content_radius) : null);
    put(root, '--pw-email-gap', px(dflt(s.email_gap_top_mobile, 20))); put(root, '--pw-email-gap-d', px(dflt(s.email_gap_top, 20)));
    put(root, '--pw-width', px(dflt(s.content_width, 640)));
    const p = (k, d) => px(dflt(s[k], d));
    put(root, '--pw-top', p('padding_top_mobile', 32)); put(root, '--pw-bottom', p('padding_bottom_mobile', 32)); put(root, '--pw-left', p('padding_left_mobile', 20)); put(root, '--pw-right', p('padding_right_mobile', 20));
    put(root, '--pw-top-d', p('padding_top_desktop', 64)); put(root, '--pw-bottom-d', p('padding_bottom_desktop', 64)); put(root, '--pw-left-d', p('padding_left_desktop', 24)); put(root, '--pw-right-d', p('padding_right_desktop', 24));
    put(root, '--pw-logo', p('logo_size_mobile', 100)); put(root, '--pw-logo-d', p('logo_size_desktop', 160));
    const bs = stops(s, 'bg_gradient_color'), grad = 'linear-gradient(' + dflt(s.bg_gradient_degree, 90) + 'deg,' + bs.join(',') + ')';
    put(root, '--pw-bg', on && bool(s.enable_bg_gradient) ? (bs.length ? grad : null) : on && raw(s.background_color) || null);
    for (const m of own(c, '[data-pw-media]')) put(m, '!filter', null);
    common(c);
    const owner = c.q('.pw-launch__owner');
    if (owner) {
      put(owner, 'hidden', !bool(s.show_owner_login));
      put(owner, '@href', url(s.owner_login_url) || 'https://storelib.com');
      const tab = s.owner_open_new_tab !== false && s.owner_open_new_tab !== 'false';
      put(owner, '@target', tab ? '_blank' : null); put(owner, '@rel', tab ? 'noopener' : null);
    }
    for (const x of c.blocks) {
      const b = x.b, el = x.el;
      if (x.type === 'heading') {
        const h = el.querySelector('.pw-launch__heading'); if (!h) continue;
        put(h, 'rich', b.heading || '');
        const hs = stops(b, 'heading_gradient_color'), g = on && bool(b.enable_heading_gradient) && hs.length > 0;
        put(h, '@data-pw-custom', on); put(h, '@data-pw-grad', g);
        put(h, '--pw-h-size', on ? px(dflt(b.heading_font_size, 48)) : null); put(h, '--pw-h-c', on && raw(b.heading_color) || null);
        put(h, '--pw-h-grad', g ? 'linear-gradient(' + dflt(b.heading_gradient_degree, 90) + 'deg,' + hs.join(',') + ')' : null);
      } else if (x.type === 'subheading') {
        const d = el.querySelector('.pw-launch__description'); if (!d) continue;
        put(d, 'rich', b.subheading || '');
        put(d, '@data-pw-custom', on); put(d, '--pw-s-size', on ? px(dflt(b.subheading_font_size, 16)) : null); put(d, '--pw-s-c', on && raw(b.subheading_color) || null);
      } else if (x.type === 'countdown') {
        const n = el.querySelector('.pw-launch__countdown'); if (!n) continue;
        if (str(b.countdown_date)) put(n, '@data-launch-date', str(b.countdown_date));
        put(n, '--pw-count-bg', on && raw(b.countdown_unit_bg_color) || null); put(n, '--pw-count-text', on && raw(b.countdown_text_color) || null); put(n, '--pw-count-border', on && raw(b.countdown_border_color) || null);
        put(n, '--pw-count-radius', on ? px(dflt(b.countdown_border_radius, 8)) : null);
        put(n, '--pw-count-size', on ? dflt(b.countdown_size_mobile, 1.5) + 'rem' : null); put(n, '--pw-count-size-d', on ? dflt(b.countdown_size_desktop, 2) + 'rem' : null);
      } else if (x.type === 'email') {
        const f = el.querySelector('.pw-launch__fields'), i = el.querySelector('input[type=email]'), btn = el.querySelector('button[type=submit]'), w = el.querySelector('[data-mt-words]'), mode = el.querySelector('[data-preview-mode]');
        if (f) {
          put(f, '@data-signup-layout', s.signup_layout || 'inline');
          put(f, '--input-bg', on && bool(b.enable_email_input_bg) && raw(b.email_input_bg_color) || null);
          put(f, '--input-border-color', on && raw(b.email_input_border_color) || null); put(f, '--field-placeholder', on && raw(b.placeholder_color) || null); put(f, '--field-text', on && raw(b.email_text_color) || null);
        }
        if (i) put(i, '@placeholder', str(s.email_placeholder) || 'you@example.com');
        if (btn) {
          const set = k => on && isColor(b[k]) ? raw(b[k]) : null;
          put(btn, '--mb-bg', set('button_bg_color')); put(btn, '--mb-text', set('button_text_color')); put(btn, '--mb-border', set('button_bg_color'));
          put(btn, '--mb-hover-bg', set('button_hover_bg')); put(btn, '--mb-hover-text', set('button_hover_text')); put(btn, '--mb-hover-border', set('button_hover_bg'));
        }
        if (w) {
          put(w, '@data-success-message', str(s.success_text) || 'Thanks for subscribing.'); put(w, '@data-error-message', str(s.error_text) || 'Unable to subscribe. Please try again.');
          put(w, '@data-preview-success-message', str(s.preview_success_text) || 'Preview complete. No email was saved.'); put(w, '@data-preview-subscribed-label', str(s.preview_subscribed_label) || 'Subscribed (preview)');
        }
        if (mode) put(mode, '@data-preview-mode', s.preview_submit_mode || 'live');
      }
    }
  }

  const TYPES = {
    'main-login': {derive: login},
    'main-register': {derive: form}, 'main-activate-account': {derive: form}, 'main-reset-password': {derive: form},
    'main-account': {derive: account}, 'main-addresses': {derive: account}, 'main-order': {derive: account},
    'login-popup': {derive: popup},
    'main-password-footer': {derive: passwordFooter}, 'main-password-header': {derive: passwordHeader},
    'form-message': {derive: formMessage},
    'page-default': {derive: pageDefault}, 'page-wishlist': {derive: wishlist}, 'page-compare': {derive: compare},
    'page-contact': {derive: contact}, 'pages-store-location': {derive: storeLocation}, 'page-404': {derive: page404},
    'coming-soon': {derive: comingSoon},
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
      write(el, key, v, prev);
      return el;
    };
    const blocks = [...root.querySelectorAll('[data-ap-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.apBlock;
      if (st.rawBlocks.get(id) !== el.dataset.apSettings) { st.rawBlocks.set(id, el.dataset.apSettings); st.blocks.set(id, {...parse(el.dataset.apSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.apType, b: st.blocks.get(id) || {}};
    });
    const c = {root, st, s: st.s, put, record, blocks, type: root.dataset.apRoot, q: sel => { const el = root.querySelector(sel); return el && el.closest(SEL) === root ? el : null; }};
    st.type.derive(c);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.apSettings) { st.raw = root.dataset.apSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
  }
  function drop(root, st) {
    st.mq.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame);
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.apRoot]; if (!type) return;
    /* the settings are printed in the builder only (request.design_mode): without them the builder's redraw shows each change */
    if (!root.hasAttribute('data-ap-settings')) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const st = {root, type, live: {}, liveBlocks: new Map(), s: parse(root.dataset.apSettings), raw: root.dataset.apSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), mq: matchMedia('(min-width: 768px)')};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule);
    roots.set(root, st);
    derive(root, st, true);
    root.dataset.apReady = '';
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
      if (root.dataset.apSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-ap-block]') || n.querySelector(SEL + ',[data-ap-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-ap-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-ap-settings']});
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
      if (have !== want) bad.push((el.dataset.apBlock || el.id || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaAccountPages = {scan, audit, roots};
  scan();
})();
