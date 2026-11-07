/* Materia Themes. The cart and search page sections: Shopping cart
   (main-cart-items) and Search page (main-search). Loaded on every page by
   layout/theme.storelib.

   Live edits: every root [data-lcs-root] carries its settings as JSON and
   every block [data-lcs-block] its own. derive() turns them into outputs (a
   CSS variable, a style, an attribute, a class, text) per element, the same
   values the Liquid prints, so on load the first derive is only recorded.
   After that an output is written only when its value changes, once per frame
   per root, so a picture never reloads and a field keeps what was typed. An
   edit reaches only the root whose data-lcs-section is the edited section.
   A redraw (storelib:section-load) brings a new root, set up once; the old
   one is dropped.

   Settings that need the server (cart lines, search results, filters,
   pagination, a new picture, a block moved to the other column) wait for the
   builder's redraw. Checkout is the cart form's own submit to the theme's
   checkout path; this file never posts. It also defines <cart-faq> (the cart
   page questions) so they open when the section's inline script did not run.
   audit() lists outputs whose markup differs from the derived value (tests). */
(() => {
  if (window.MateriaCartSearch) return;
  const SEL = '[data-lcs-root]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const str = v => v == null ? '' : String(v);
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const api = () => window.MateriaHeroImageOne;
  /* the scheme-color snippet: empty or fully transparent prints the fallback */
  const color = (v, f) => {
    if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; }
    v = typeof v === 'string' ? v.trim() : '';
    if (!v || v === 'transparent' || /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(v) || /^#[0-9a-f]{6}00$/i.test(v) || !CSS.supports('color', v)) return f;
    return v;
  };
  /* a font picker value, as the Liquid prints it: family, fallbacks */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    return typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
  };
  const schemeOf = s => { const v = s.color_scheme && s.color_scheme.id || s.color_scheme; return typeof v === 'string' && /^[\w-]+$/.test(v) ? v : ''; };

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = String(value == null ? '' : value).replace(/<[^>]*>/g, '');
  }
  function icon(el, key, st) {
    const t = st.root.querySelector('template[data-lcs-icons]'), src = t && t.content.querySelector('[data-icon="' + CSS.escape(key) + '"]');
    if (!src) return;
    el.replaceChildren(...[...src.childNodes].map(n => n.cloneNode(true)));
  }
  function stars(el, total, filled) {
    total = Math.max(0, Math.round(num(total, 5))); filled = Math.min(num(filled), total);
    const full = Math.floor(filled), half = filled - full >= 0.5;
    const tpl = el.querySelector('.lcs-star');
    if (!tpl) return;
    const out = [];
    for (let i = 1; i <= total; i++) {
      const n = tpl.cloneNode(true);
      n.className = 'lcs-star' + (i <= full ? ' is-filled' : half && i === full + 1 ? ' is-half' : '');
      out.push(n);
    }
    el.replaceChildren(...out);
    el.setAttribute('aria-label', filled + ' / ' + total);
  }
  function message(el, text, accent) {
    const t = str(text), a = str(accent), i = a ? t.indexOf(a) : -1;
    if (i < 0) { el.textContent = t; return; }
    const span = document.createElement('span'); span.className = 'lcs-spa__accent'; span.textContent = a;
    el.replaceChildren(document.createTextNode(t.slice(0, i)), span, document.createTextNode(t.slice(i + a.length)));
  }
  function important(el, k, v) {
    if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important');
    let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k);
  }
  function write(el, key, v, prev, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') important(el, key.slice(1), v);
    else if (key.startsWith('style:')) { const k = key.slice(6); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') { for (const c of String(prev || '').split(' ')) if (c) el.classList.remove(c); for (const c of String(v || '').split(' ')) if (c) el.classList.add(c); }
    else if (key[0] === '~') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'icon') icon(el, v, st);
    else if (key === 'stars') { const [t, f] = String(v).split('/'); stars(el, t, f); }
    else if (key === 'message') { const [t, a] = JSON.parse(v); message(el, t, a); }
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); if (v) el.classList.add('color-' + v); }
    else if (key === 'cart-scheme') cartScheme(el, v, st);
    else if (key === 'reset') resetSpacing(el, v);
    return el;
  }

  /* reset_spacing: the printed rules switch off (media="not all") and the wrapper margins follow */
  function resetSpacing(root, on) {
    const wrap = root.closest('.shopify-section'); if (!wrap) return;
    for (const s of wrap.querySelectorAll('style')) {
      if (s.closest(SEL) && s.closest(SEL) !== root) continue;
      if (!/reset_spacing/.test(s.textContent)) continue;
      if (on) s.removeAttribute('media'); else s.setAttribute('media', 'not all');
    }
    important(wrap, 'margin-top', on ? '0px' : null); important(wrap, 'margin-bottom', on ? '0px' : null);
  }
  /* The cart's hard paint holds the scheme's own colours; a live scheme pick
     reads the picked scheme's variables from a probe and lays them over it. */
  const SCHEME_VARS = ['--color-background', '--color-text', '--color-heading', '--color-primary', '--color-border', '--btn-primary-color', '--btn-primary-bg-color', '--btn-primary-hover-color', '--btn-primary-hover-bg-color'];
  function cartScheme(root, id, st) {
    for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c);
    if (!id) { for (const k of [...SCHEME_VARS, '--gradient-background', 'background-color', 'color']) important(root, k, null); if (st.firstScheme) root.classList.add('color-' + st.firstScheme); return; }
    root.classList.add('color-' + id);
    const probe = document.createElement('div'); probe.className = 'color-' + id; probe.hidden = true;
    root.parentNode.insertBefore(probe, root);
    const cs = getComputedStyle(probe), vals = Object.fromEntries(SCHEME_VARS.map(k => [k, cs.getPropertyValue(k).trim()]));
    probe.remove();
    for (const k of SCHEME_VARS) important(root, k, vals[k] || null);
    important(root, '--gradient-background', vals['--color-background'] || null);
    important(root, 'background-color', vals['--color-background'] || null);
    important(root, 'color', vals['--color-text'] || null);
  }

  /* ---------- Shopping cart ---------- */
  const custom = b => bool(b.enable_custom_style);
  const ownFont = b => bool(b.enable_custom_fonts) && !!font(b.font);
  function blockFont(c, x) {
    const own = ownFont(x.b);
    c.put(x.el, '@data-own-font', own || null);
    c.put(x.el, '--lcs-ff', own ? font(x.b.font) : null);
  }
  const PILL_BADGES = {badge_visa: 'Visa', badge_master: 'Mastercard', badge_amex: 'American Express', badge_apple_pay: 'Apple Pay', badge_google_pay: 'Google Pay', badge_paypal: 'PayPal', badge_klarna: 'Klarna', badge_discover: 'Discover', badge_amazon: 'Amazon'};
  const CART = {
    simple_rating(c, x) {
      const {put} = c, b = x.b, el = x.el, on = custom(b);
      put(el, '--lcs-pt', px(b.padding_top)); put(el, '--lcs-pb', px(b.padding_bottom)); put(el, '--lcs-align', str(b.alignment || 'left'));
      put(el, '--lcs-star', px(b.star_size, 18)); put(el, '--lcs-fs-m', px(b.font_size_mobile, 14)); put(el, '--lcs-fs-d', px(b.font_size_desktop, 16)); put(el, '--lcs-fw', str(b.font_weight || 500));
      put(el, '--lcs-star-on', on ? color(b.filled_color, 'var(--color-heading)') : null);
      put(el, '--lcs-star-off', on ? color(b.unfilled_color, 'color-mix(in srgb, var(--color-text) 22%, transparent)') : null);
      put(el, '--lcs-text', on ? color(b.text_color, 'var(--color-text)') : null);
      blockFont(c, x);
      const s = el.querySelector('[data-lcs-stars]'); if (s) { put(s, 'stars', num(b.total_stars, 5) + '/' + num(b.filled_stars)); put(s, 'hidden', !(num(b.filled_stars) > 0)); }
      const t = el.querySelector('[data-lcs-text]'); if (t) { put(t, 'text', str(b.text)); put(t, 'hidden', blank(b.text)); }
      put(el, 'hidden', blank(b.text) && !(num(b.filled_stars) > 0) && !c.design);
    },
    happy_customers(c, x) {
      const {put} = c, b = x.b, el = x.el, on = custom(b);
      put(el, '--lcs-pt', px(b.padding_top)); put(el, '--lcs-pb', px(b.padding_bottom)); put(el, '--lcs-star', px(b.star_size, 14));
      put(el, '--lcs-av', px(b.avatar_size, 40)); put(el, '--lcs-av-overlap', str(num(b.avatar_overlap)));
      put(el, '--lcs-fs-m', px(b.font_size_mobile, 14)); put(el, '--lcs-fs-d', px(b.font_size_desktop, 16)); put(el, '--lcs-fw', str(b.font_weight || 600));
      put(el, '--lcs-star-on', on ? color(b.filled_color, 'var(--color-heading)') : null);
      put(el, '--lcs-star-off', on ? color(b.unfilled_color, 'color-mix(in srgb, var(--color-text) 22%, transparent)') : null);
      put(el, '--lcs-text', on ? color(b.text_color, 'var(--color-heading)') : null);
      blockFont(c, x);
      const av = el.querySelector('[data-lcs-avatars]'); if (av) put(av, 'hidden', !bool(b.show_avatars));
      for (const a of el.querySelectorAll('[data-lcs-avatar]')) put(a, 'hidden', num(a.dataset.lcsAvatar) > num(b.avatar_count, 4));
      const h = el.querySelector('[data-lcs-text]'); if (h) { put(h, 'text', str(b.heading)); put(h, 'hidden', blank(b.heading)); }
      const row = el.querySelector('[data-lcs-stars-row]'); if (row) put(row, 'hidden', !bool(b.show_stars) || !(num(b.filled_stars) > 0));
      const s = el.querySelector('[data-lcs-stars]'); if (s) put(s, 'stars', num(b.total_stars, 5) + '/' + num(b.filled_stars));
      const r = el.querySelector('[data-lcs-rating-text]'); if (r) { put(r, 'text', str(b.rating_text)); put(r, 'hidden', !bool(b.show_rating_text) || blank(b.rating_text)); }
      const pics = bool(b.show_avatars) && [...el.querySelectorAll('[data-lcs-avatar] img')].some(i => !i.closest('[hidden]'));
      put(el, 'hidden', !c.design && blank(b.heading) && !(bool(b.show_stars) && num(b.filled_stars) > 0) && !(bool(b.show_rating_text) && !blank(b.rating_text)) && !pics);
    },
    benefits_pills(c, x) {
      const {put} = c, b = x.b, el = x.el, on = bool(b.custom_style);
      put(el, '--lcs-pt', px(b.padding_top)); put(el, '--lcs-pb', px(b.padding_bottom)); put(el, '--lcs-justify', str(b.alignment || 'flex-start'));
      put(el, '--lcs-gap-x', px(b.gap_x)); put(el, '--lcs-gap-y', px(b.gap_y)); put(el, '--lcs-h-align', str(b.heading_alignment || 'left')); put(el, '--lcs-h-mb', px(b.heading_margin_bottom));
      put(el, '--lcs-h-fs-m', px(b.heading_size_mobile, 15)); put(el, '--lcs-h-fs-d', px(b.heading_size_desktop, 16)); put(el, '--lcs-h-fw', str(b.heading_weight || 700));
      put(el, '--lcs-fs-m', px(b.pill_font_size_mobile, 13)); put(el, '--lcs-fs-d', px(b.pill_font_size_desktop, 14)); put(el, '--lcs-fw', str(b.pill_font_weight || 600));
      put(el, '--lcs-radius', px(b.pill_radius)); put(el, '--lcs-px', px(b.pill_padding_x)); put(el, '--lcs-py', px(b.pill_padding_y)); put(el, '--lcs-icon-gap', px(b.pill_gap));
      put(el, '--lcs-icon-m', px(b.pill_icon_size_mobile, 14)); put(el, '--lcs-icon-d', px(b.pill_icon_size_desktop, 16));
      const bs = b.pill_border_style || 'none';
      put(el, '--lcs-border', bs !== 'none' && num(b.pill_border_width) > 0 ? num(b.pill_border_width) + 'px ' + bs : null);
      put(el, '--lcs-head', on ? color(b.heading_color, 'var(--color-heading)') : null);
      put(el, '--lcs-pill-text', on ? color(b.pill_text_color, 'var(--color-text)') : null);
      put(el, '--lcs-pill-bg', on ? color(b.pill_bg, 'color-mix(in srgb, var(--color-text) 6%, var(--color-background))') : null);
      put(el, '--lcs-pill-icon', on ? color(b.pill_icon_color, 'currentColor') : null);
      put(el, '--lcs-pill-border', on ? color(b.pill_border_color, 'var(--color-border)') : null);
      put(el, '@data-lcs-layout', str(b.mobile_layout || 'wrap')); put(el, '@data-lcs-shadow', bool(b.pill_shadow) || null);
      blockFont(c, x);
      const h = el.querySelector('[data-lcs-text]'); if (h) { put(h, 'text', str(b.heading_text)); put(h, 'hidden', !bool(b.show_heading) || blank(b.heading_text)); }
      let shown = 0;
      for (const li of el.querySelectorAll('[data-lcs-pill]')) {
        const i = li.dataset.lcsPill, k = n => b['pill' + i + '_' + n], show = bool(k('enable')) && !blank(k('text'));
        if (show) shown++;
        put(li, 'hidden', !show);
        const t = li.querySelector('[data-lcs-pill-text]'); if (t) put(t, 'text', str(k('text')));
        const src = k('icon_source') || 'preset', ic = li.querySelector('[data-lcs-pill-icon]');
        if (ic) {
          put(ic, 'hidden', src === 'none');
          /* a picture or pasted SVG needs the server; a preset swaps here */
          if (src === 'preset' || (src === 'image' && !k('icon_image')) || (src === 'svg' && blank(k('icon_svg')))) put(ic, 'icon', 'pill:' + (k('icon_preset') || 'check'));
        }
        const pc = (id, f) => on && !blank(k(id)) ? color(k(id), f) : null;
        put(li, '--lcs-pill-bg-i', pc('bg_color', 'var(--lcs-pill-bg)')); put(li, '--lcs-pill-text-i', pc('text_color', 'var(--lcs-pill-text)')); put(li, '--lcs-pill-icon-i', pc('icon_color', 'var(--lcs-pill-icon)'));
      }
      put(el, 'hidden', shown === 0 && !c.design);
    },
    info_box(c, x) {
      const {put} = c, b = x.b, el = x.el, on = custom(b);
      put(el, '--lcs-ib-bg', on ? color(b.box_bg, 'transparent') : 'transparent');
      put(el, '--lcs-ib-border', on ? color(b.border_color, 'var(--color-border)') : 'var(--color-border)');
      put(el, '--lcs-ib-text', on ? color(b.text_color, 'var(--color-heading)') : 'var(--color-heading)');
      put(el, '--lcs-ib-muted', on ? color(b.muted_color, 'var(--color-text)') : 'var(--color-text)');
      put(el, '--lcs-ib-icon', on ? color(b.top_icon_color, 'currentColor') : 'currentColor');
      blockFont(c, x);
      const ib = el.querySelector('.ib'); if (!ib) return;
      put(ib, '--ib-radius', px(b.box_radius, 12)); put(ib, '--ib-pad-y', px(b.row_pad_y, 16)); put(ib, '--ib-pad-x', px(b.row_pad_x, 18));
      put(ib, 'style:margin-top', px(b.margin_top, 16)); put(ib, 'style:margin-bottom', px(b.margin_bottom, 16));
      const top = ib.querySelector('.ib__top-text'); if (top) { put(top, 'rich', str(b.top_text)); put(top.closest('.ib__row'), 'hidden', blank(b.top_text)); }
      const tic = ib.querySelector('.ib__top-icon'); if (tic) put(tic, 'hidden', !bool(b.top_show_icon));
      const rows = ib.querySelectorAll('.ib__coll');
      [['collapse_title', 'collapse_body'], ['collapse2_title', 'collapse2_body']].forEach(([t, d], i) => {
        const r = [...rows].find(n => (n.dataset.mtAccKey || '').endsWith('-' + (i + 1))); if (!r) return;
        put(r, 'hidden', blank(b[t]));
        const ti = r.querySelector('.ib__title'); if (ti) put(ti, 'text', str(b[t]));
        const an = r.querySelector('.ib__answer'); if (an) put(an, 'rich', str(b[d]));
      });
      const badges = ib.querySelector('.ib__badges');
      if (badges) {
        put(badges.closest('.ib__row'), 'hidden', !bool(b.show_badges)); put(badges, '--ib-bh', px(b.badge_height, 24));
        for (const [k, label] of Object.entries(PILL_BADGES)) { const svg = badges.querySelector('svg[aria-label="' + label + '"]'); if (svg && svg.parentElement) put(svg.parentElement, 'hidden', !bool(b[k])); }
      }
    },
    divider(c, x) {
      const {put} = c, b = x.b, el = x.el;
      put(el, '--lcs-line', custom(b) ? color(b.color, 'var(--color-border)') : 'var(--color-border)');
      put(el, '--lcs-thick', px(b.thickness, 1)); put(el, '--lcs-mt', px(b.margin_top)); put(el, '--lcs-mb', px(b.margin_bottom));
    },
    guarantee_badge(c, x) {
      const {put} = c, b = x.b, el = x.el, on = custom(b);
      put(el, '--lcs-justify', str(b.alignment || 'flex-start')); put(el, '--lcs-mt', px(b.margin_top)); put(el, '--lcs-mb', px(b.margin_bottom));
      put(el, '--lcs-icon', px(b.icon_size, 18)); put(el, '--lcs-fs', px(b.font_size, 14)); put(el, '--lcs-fw', str(b.font_weight || 500));
      put(el, '--lcs-text', on ? color(b.text_color, 'var(--color-text)') : null); put(el, '--lcs-icon-c', on ? color(b.icon_color, 'currentColor') : null);
      blockFont(c, x);
      put(el, 'hidden', blank(b.text) && !c.design);
      const t = el.querySelector('[data-lcs-text]'); if (t) put(t, 'text', str(b.text));
      const ic = el.querySelector('[data-lcs-icon]'); if (ic) put(ic, 'icon', 'guarantee:' + (b.icon || 'shield_check'));
    },
    social_proof_avatars(c, x) {
      const {put} = c, b = x.b, el = x.el, on = custom(b);
      put(el, '--lcs-mt', px(b.margin_top)); put(el, '--lcs-gap-m', px(b.referral_inline_gap_mobile)); put(el, '--lcs-gap-d', px(b.referral_inline_gap_desktop));
      put(el, '--lcs-mb-m', px(b.referral_to_title_gap_mobile)); put(el, '--lcs-mb-d', px(b.referral_to_title_gap_desktop));
      put(el, '--lcs-av-m', px(b.ref_avatar_size_mobile, 32)); put(el, '--lcs-av-d', px(b.ref_avatar_size_desktop, 36));
      put(el, '--lcs-ov-m', px(b.ref_avatar_overlap_mobile)); put(el, '--lcs-ov-d', px(b.ref_avatar_overlap_desktop)); put(el, '--lcs-ring-w', px(b.ref_avatar_border_thickness));
      put(el, '--lcs-star-m', px(b.star_size_mobile, 16)); put(el, '--lcs-star-d', px(b.star_size_desktop, 18));
      put(el, '--lcs-fs-m', px(b.font_size_mobile, 14)); put(el, '--lcs-fs-d', px(b.font_size_desktop, 15));
      put(el, '--lcs-text', on ? color(b.referral_text_color, 'var(--color-text)') : null); put(el, '--lcs-accent', on ? color(b.referral_accent_color, 'var(--color-heading)') : null);
      put(el, '--lcs-star-on', on ? color(b.star_color, 'var(--color-heading)') : null); put(el, '--lcs-ring', on ? color(b.ref_avatar_border_color, 'var(--color-background)') : null);
      blockFont(c, x);
      put(el, 'hidden', blank(b.referral_text) && !c.design);
      const s = el.querySelector('[data-lcs-stars]'); if (s) put(s, 'hidden', !bool(b.show_stars));
      const m = el.querySelector('[data-lcs-text]'); if (m) put(m, 'message', JSON.stringify([str(b.referral_text), str(b.referral_accent_text)]));
    },
    payment_badges(c, x) {
      const {put} = c, b = x.b;
      put(x.el, 'hidden', !bool(b.show_payment_badges));
      for (const s of x.el.querySelectorAll('[data-lcs-badge]')) put(s, 'hidden', !bool(b[s.dataset.lcsBadge]));
    },
    faq_section(c, x) {
      const {put} = c, b = x.b;
      put(x.el, 'hidden', !bool(b.show_faq));
      const h = x.el.querySelector('[data-lcs-text]'); if (h) { put(h, 'text', str(b.faq_heading)); put(h, 'hidden', blank(b.faq_heading)); }
    },
    faq(c, x) {
      const q = x.el.querySelector('[data-lcs-question]'); if (q) c.put(q, 'text', str(x.b.question));
      const a = x.el.querySelector('[data-lcs-answer]'); if (a) c.put(a, 'rich', str(x.b.answer));
    },
  };
  for (const t of ['shipping_progress', 'order_note', 'estimate_shipping', 'coupon', 'subtotal_checkout']) CART[t] = (c, x) => { c.put(x.el, 'style:margin-top', px(x.b.margin_top)); c.put(x.el, 'style:margin-bottom', px(x.b.margin_bottom)); };

  function common(c) {
    const {root, s, put} = c;
    put(root, '@data-lcs-w', str(s.section_width));
    const w = c.q('[data-lcs-width]'); if (w) put(w, '.', str(s.section_width));
    put(root, '~pt-min', num(s.padding_top) < 30); put(root, '~pb-min', num(s.padding_bottom) < 30);
    put(root, '~remove_spacing', bool(s.reset_spacing));
    put(root, '--section-pt', str(num(s.padding_top))); put(root, '--section-pb', str(num(s.padding_bottom)));
    put(root, 'reset', bool(s.reset_spacing));
  }
  function cart(c) {
    common(c);
    c.put(c.root, 'cart-scheme', schemeOf(c.s));
    for (const x of c.blocks) if (CART[x.type]) CART[x.type](c, x);
  }

  /* ---------- Search page ---------- */
  function search(c) {
    const {root, s, put} = c, on = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
    common(c);
    put(root, 'scheme', schemeOf(s) || 'default-color-scheme');
    put(root, '--lcs-head', on ? color(s.heading_color, 'var(--color-heading)') : null);
    put(root, '--lcs-text', on ? color(s.text_color, 'var(--color-text)') : null); put(root, '@data-lcs-custom', on || null);
    const hf = fonts && font(s.heading_font) || null, bf = fonts && font(s.body_font) || null;
    put(root, '--lcs-hf', hf); put(root, '--lcs-bf', bf); put(root, '@data-lcs-bf', !!bf || null);
    const h = c.q('[data-lcs-heading]');
    if (h) { put(h, 'text', str(s.heading).trim() || h.dataset.lcsFallback || ''); put(h, '@data-own-font', !!hf || null); }
    for (const t of root.querySelectorAll('.facets-empty__title')) if (t.closest(SEL) === root) put(t, '@data-own-font', !!hf || null);
    const e = c.q('[data-lcs-empty-text]'); if (e) { put(e, 'text', str(s.empty_text)); put(e, 'hidden', blank(s.empty_text)); put(e, '@data-own-font', !!bf || null); }
    const a = c.q('[data-lcs-empty-link]'); if (a) { put(a, 'text', str(s.empty_link_label)); put(a, 'hidden', blank(s.empty_link_label)); put(a, '@href', str(s.empty_link_url) || a.dataset.lcsAll || '/collections/all'); }
    const grid = c.q('#product-grid');
    if (grid) {
      const d = num(s.items_per_row, 4);
      put(grid, '--cols-desktop', str(d)); put(grid, '--cols-tablet', str(d > 3 ? 3 : d)); put(grid, '--cols-mobile', str(num(s.items_per_row_mobile, 2)));
      put(grid, '--grid-gap', px(s.column_gap)); put(grid, '@data-view-mode', str(d));
    }
    const f = c.q('facets-root'); if (f) put(f, '~facets--end', s.vertical_posion === 'right');
    const count = c.q('.facets-toolbar__count'); if (count) put(count, 'hidden', !bool(s.number_products_per_page));
    const sort = c.q('.facets-sort'); if (sort) put(sort, 'hidden', !bool(s.sorting));
    const more = c.q('.hidden-on-load'); if (more && !blank(s.button_show_more)) put(more, 'text', str(s.button_show_more));
  }

  const TYPES = {'main-cart-items': {derive: cart}, 'main-search': {derive: search}};

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
    const blocks = [...root.querySelectorAll('[data-lcs-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.lcsBlock;
      if (st.rawBlocks.get(el) !== el.dataset.lcsSettings) { st.rawBlocks.set(el, el.dataset.lcsSettings); st.blocks.set(id, {...parse(el.dataset.lcsSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.lcsType, b: st.blocks.get(id) || {}};
    });
    const c = {root, st, s: st.s, put, record, blocks, design: !!(window.Shopify && Shopify.designMode) || root.querySelector('template[data-lcs-icons]') !== null, q: sel => { const el = root.querySelector(sel); return el && el.closest(SEL) === root ? el : null; }};
    st.type.derive(c);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.lcsSettings) { st.raw = root.dataset.lcsSettings; st.s = {...parse(st.raw), ...st.live}; }
    /* the settings are printed in the builder only (request.design_mode): without them nothing is painted here and the builder's redraw shows each change */
    if (root.hasAttribute('data-lcs-settings')) derive(root, st, false);
  }
  function drop(root, st) {
    cancelAnimationFrame(st.frame);
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.lcsRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const first = [...root.classList].find(k => k.startsWith('color-'));
    const st = {root, type, live: {}, liveBlocks: new Map(), s: parse(root.dataset.lcsSettings), raw: root.dataset.lcsSettings, blocks: new Map(), rawBlocks: new WeakMap(), last: new Map(), firstScheme: first ? first.slice(6) : ''};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    roots.set(root, st);
    if (root.hasAttribute('data-lcs-settings')) derive(root, st, true);
    root.dataset.lcsReady = '';
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
      if (root.dataset.lcsSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-lcs-block]') || n.querySelector(SEL + ',[data-lcs-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-lcs-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-lcs-settings']});

  /* ---------- <cart-faq>: one question open at a time ---------- */
  if (!customElements.get('cart-faq')) {
    customElements.define('cart-faq', class extends HTMLElement {
      connectedCallback() {
        if (this.lcsBound) return;
        this.lcsBound = true;
        this.addEventListener('click', e => {
          const btn = e.target.closest('.cart-faq__question'); if (!btn || !this.contains(btn)) return;
          e.preventDefault();
          const item = btn.closest('.cart-faq__item'), open = item.classList.contains('is-open');
          for (const o of this.querySelectorAll('.cart-faq__item.is-open')) if (o !== item) this.set(o, false);
          this.set(item, !open);
        });
      }
      set(item, open) {
        const panel = item.querySelector('.cart-faq__panel'), btn = item.querySelector('.cart-faq__question');
        item.classList.toggle('is-open', open); if (btn) btn.setAttribute('aria-expanded', String(open));
        if (!panel) return;
        if (reduced.matches) { panel.style.maxHeight = open ? 'none' : '0px'; return; }
        panel.style.maxHeight = panel.scrollHeight + 'px';
        if (open) {
          const end = ev => { if (ev.propertyName !== 'max-height') return; panel.removeEventListener('transitionend', end); if (item.classList.contains('is-open')) panel.style.maxHeight = 'none'; };
          panel.addEventListener('transitionend', end);
        } else requestAnimationFrame(() => { panel.style.maxHeight = '0px'; });
      }
    });
  }

  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key.startsWith('style:')) { const k = key.slice(6); have = el.style.getPropertyValue(k).trim(); want = v == null ? '' : String(v); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key[0] === '~') { have = el.classList.contains(key.slice(1)); want = !!v; }
      else if (key === '.') { have = String(v || '').split(' ').every(k => !k || el.classList.contains(k)); want = true; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'text') { have = el.textContent.trim(); want = String(v == null ? '' : v).trim(); }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'stars') { const [t, f] = String(v).split('/'); have = el.querySelectorAll('.lcs-star').length + '/' + el.querySelectorAll('.lcs-star.is-filled').length; want = Math.round(num(t, 5)) + '/' + Math.floor(Math.min(num(f), num(t, 5))); }
      else continue;
      if (have !== want) bad.push((el.dataset.lcsBlock || el.id || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaCartSearch = {scan, audit, roots};
  scan();
})();
