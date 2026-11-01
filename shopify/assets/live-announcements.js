/* Materia Themes. Live editor updates and behaviour for the Announcements
   sections: Marquee Bar, Announcement Bar Basic, Announcement Bar Pro 1
   (annoucment-bar-scrolling) and Announcement Bar Pro 2 (announcement-bar).
   Announcement Bar Pro 4 keeps its own runtime (announcement-pro-4.js).

   Every root [data-an-root] carries its settings, defaults and block
   defaults as JSON; every block carries its own. derive() turns settings into
   a list of outputs (a CSS variable, an attribute, text, a picture...) per
   element. The Liquid prints the same outputs, so on load the first derive is
   only recorded, never painted. After that an output is written only when its
   value changes, one frame per root, so a picture never reloads and a marquee
   never restarts for an unrelated edit. audit() compares the derived outputs
   with what the markup carries (used by the tests).

   Behaviour the sections need lives here too, because a section's own inline
   script is not guaranteed to run in the builder canvas: the marquees (paused
   off screen and in a hidden tab, still under reduced motion), the Pro 2
   rotator (arrows, keyboard, autoplay paused on hover, focus and off screen),
   the Pro 2 countdowns (one tick a second at most, per instance, paused off
   screen, expired state) and the close buttons (remembered on the
   storefront, never in the builder). Each is set up once per root, again only
   when its markup is replaced. */
(() => {
  if (window.MateriaAnnouncements) return;
  const SEL = '[data-an-root]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => { v = v && typeof v === 'object' && 'value' in v ? v.value : v; return v === true || v === 'true' || v === 1; };
  const off = v => v === false || v === 'false';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = v => num(v) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.preview_image?.url || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image = false) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };
  /* A font picker value, as the Liquid reads it (snippets/announce-font): a font with a family, else the fallback. */
  const fontCss = (v, f) => v && typeof v === 'object' && v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : f;
  const fontWeight = (v, f) => v && typeof v === 'object' && v.family && v.weight ? String(v.weight) : f;
  const handleize = v => String(v || '').toLowerCase().replace(/['"]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  const plain = v => String(v || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const design = () => !!(window.Shopify && window.Shopify.designMode) || document.documentElement.classList.contains('shopify-design-mode');

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = plain(value);
  }
  /* Inline SVG code from a textarea: only the <svg> and its drawing, nothing that runs. */
  function svg(el, value) {
    const t = document.createElement('template'); t.innerHTML = String(value || '');
    t.content.querySelectorAll('script, foreignObject, iframe, object, embed, link, meta').forEach(n => n.remove());
    t.content.querySelectorAll('*').forEach(n => { for (const a of [...n.attributes]) if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) n.removeAttribute(a.name); });
    el.replaceChildren(t.content);
  }
  function image(el, v) {
    /* v: JSON {src, alt, w, h, cls}. Swaps the <img> only when the picture changed. */
    const d = parse(v);
    const cur = el.querySelector(':scope > img');
    const bare = v => String(v || '').replace(/[?#].*$/, '');
    if (cur && d.src && bare(cur.getAttribute('src')) === bare(d.src)) { if (cur.alt !== (d.alt || '')) cur.alt = d.alt || ''; return; }
    if (!d.src) { if (cur) cur.remove(); return; }
    const n = document.createElement('img'); n.alt = d.alt || ''; n.loading = 'lazy'; n.decoding = 'async'; if (d.cls) n.className = d.cls; if (d.w) n.width = d.w; if (d.h) n.height = d.h; n.src = d.src;
    if (cur) cur.replaceWith(n); else el.prepend(n);
  }
  function link(el, href, st) {
    const tag = href ? 'A' : (el.dataset.anNoLink || 'BUTTON');
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      st.last.set(next, st.last.get(el) || new Map());
      el = next;
    }
    if (href) { el.setAttribute('href', href); if (tag === 'A') el.removeAttribute('type'); }
    else { el.removeAttribute('href'); if (tag === 'BUTTON') el.setAttribute('type', 'button'); }
    return el;
  }
  function write(el, key, v, prev, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'svg') svg(el, v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'image') image(el, v);
    else if (key === 'href') return link(el, v, st);
    else if (key === 'copies') copies(el, v, st);
    else if (key === 'icon') el.innerHTML = ICONS[v] || '';
    else if (key === 'barLink') barLink(el, v, st);
    else if (key === 'noReveal') { const m = el.querySelector(':scope > [data-ti-no-reveal]'); if (v === 'true' && !m) { const n = document.createElement('span'); n.setAttribute('data-ti-no-reveal', ''); n.hidden = true; el.prepend(n); } else if (v !== 'true' && m) m.remove(); }
    return el;
  }

  /* ---------- shared derive pieces ---------- */
  const pick = (own, v, f) => own ? color(v, f) : f;
  function scheme(c) {
    const s = c.s.color_scheme && c.s.color_scheme.id || c.s.color_scheme;
    if (typeof s === 'string' && /^[\w-]+$/.test(s)) c.put(c.root, 'scheme', s);
  }
  /* The wrapper's own margins, desktop or mobile, and the root's reset and width (snippets/announce-frame). */
  function frame(c, width = 'full_width') {
    const {s, root, wrap, put, desktop} = c;
    if (wrap) for (const side of ['top', 'bottom']) put(wrap, '!margin-' + side, px(s['section_margin_' + side + '_' + (desktop ? 'desktop' : 'mobile')]));
    put(root, '@data-reset', bool(s.reset_spacing) ? 'true' : 'false');
    put(root, '@data-width', s.section_width || width);
    /* Reveal on scroll off marks the section for the layout's reveal, as the Liquid does. */
    if (wrap && s.reveal !== undefined) put(wrap, 'noReveal', bool(s.reveal) ? 'false' : 'true');
  }
  const bg = (own, type, solid, start, end, angle) => type === 'gradient'
    ? 'linear-gradient(' + num(angle, 90) + 'deg, ' + pick(own, start, 'var(--color-background)') + ', ' + pick(own, end, 'var(--color-primary)') + ')'
    : pick(own, solid, 'var(--color-background)');
  const imgJson = (img, alt, w, cls) => { const src = url(img, true); if (!src) return '{}'; const h = img && img.width && img.height ? Math.round(img.height * w / img.width) : w; return JSON.stringify({src, alt: alt == null ? (img && img.alt) || '' : alt, w, h, cls}); };

  /* Silent copies of a marquee group: as many as asked, cloned from the first group, each kept on the
     first group's clock so the loop stays seamless. */
  function copies(track, n, st) {
    const groups = () => [...track.children].filter(g => g.classList.contains('scrolling__marquee-wrapper') || g.hasAttribute('data-an-group') || g.hasAttribute('data-an-copies'));
    const all = groups(), first = all.find(g => g.hasAttribute('data-an-group')) || all[0];
    if (!first) return;
    let have = all.length;
    while (have > Math.max(1, n)) { all[have - 1].remove(); have--; }
    while (have < n) {
      const copy = first.cloneNode(true);
      copy.removeAttribute('data-an-group'); copy.setAttribute('data-an-copies', ''); copy.setAttribute('aria-hidden', 'true');
      for (const el of copy.querySelectorAll('[data-an-block]')) {
        el.setAttribute('data-an-copy', el.dataset.anBlock);
        for (const a of [...el.attributes]) if (/^data-(an-block|an-type|an-settings|shopify)/.test(a.name)) el.removeAttribute(a.name);
      }
      for (const img of copy.querySelectorAll('img')) img.alt = '';
      for (const a of copy.querySelectorAll('a, button')) a.tabIndex = -1;
      track.append(copy); have++;
    }
    syncClock(track);
  }
  function syncClock(track) {
    const anims = [...track.children].map(g => g.getAnimations ? g.getAnimations().find(a => a.effect && a.effect.getTiming().iterations === Infinity) : null);
    const lead = anims[0]; if (!lead || lead.currentTime == null) return;
    for (const a of anims.slice(1)) if (a && a.currentTime !== lead.currentTime) a.currentTime = lead.currentTime;
  }
  const copiesOf = (root, id) => [...root.querySelectorAll('[data-an-copy="' + CSS.escape(id) + '"]')];

  /* ---------- marquee pause (all marquee sections) ---------- */
  function pauseWhenAway(root, st) {
    const stop = !st.visible || document.hidden;
    if (stop) root.setAttribute('data-paused', ''); else root.removeAttribute('data-paused');
  }

  /* ---------- section types ---------- */
  const TYPES = {};

  TYPES['marquee-bar'] = {
    bp: 768,
    derive(c) {
      const {root, s, put} = c, own = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
      scheme(c); frame(c, 'full_width');
      const grad = own && typeof s.background_gradient === 'string' && s.background_gradient.trim() ? s.background_gradient.trim() : '';
      const tw = s.text_weight && s.text_weight !== 'theme' ? String(s.text_weight) : (fonts ? fontWeight(s.body_font, 'var(--body-weight, 500)') : 'var(--body-weight, 500)');
      const v = {
        '--an-fs-m': px(s.mobile_text_size), '--an-fs-d': px(s.desktop_text_size), '--an-gap-m': px(s.mobile_item_gap), '--an-gap-d': px(s.desktop_item_gap),
        '--an-pt-m': px(s.mobile_top_padding), '--an-pt-d': px(s.desktop_top_padding), '--an-pb-m': px(s.mobile_bottom_padding), '--an-pb-d': px(s.desktop_bottom_padding),
        '--scrolling-background-color': grad || pick(own, s.background_color, 'var(--color-background)'),
        '--scrolling-text-color': pick(own, s.text_color, 'var(--color-text)'),
        '--scrolling-animation-duration': (num(s.duration) > 0 ? num(s.duration) : 30) + 's',
        '--scrolling-section-width': num(s.inner_width) > 0 ? px(s.inner_width) : 'none',
        '--scrolling-pause-on-hover': bool(s.pause_on_hover) ? 'paused' : 'running',
        '--scrolling-animation-direction': s.direction === 'normal' ? 'normal' : 'reverse',
        '--scrolling-font-weight': tw,
        '--an-bf': fonts ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)',
      };
      for (const k in v) put(root, k, v[k]);
      put(root, '@data-own-font', fonts || null); put(root, '@data-own-weight', fonts || null);
      put(root, '@data-pause-hover', bool(s.pause_on_hover) ? 'true' : 'false');
      put(root, '@data-own-reveal', String(bool(s.reveal) && root.dataset.anThemeAnim === 'none' && !design()));
      const track = c.q('[data-an-track]');
      if (track) {
        put(track, '@id', handleize(s.html_id) || null);
        put(track, '@class', ('scrolling__marquee ' + String(s.html_class || '').replace(/,/g, ' ')).trim());
        put(track, 'copies', Math.max(1, Math.round(num(s.repeat_count, 1))));
      }
    },
    block(c, el, b, type, x) {
      if (type !== 'marquee') return;
      const {put, root} = c, own = bool(b.enable_custom_style), hasSvg = !!String(b.svg_icon || '').trim();
      const font = bool(b.enable_custom_fonts) ? fontCss(b.font, '') : '';
      for (const t of [el, ...copiesOf(root, x.id)]) {
        const copy = t !== el;
        put(t, '--svg-size-mobile', px(b.svg_icon_size_mobile)); put(t, '--svg-size-desktop', px(b.svg_icon_size_desktop));
        put(t, '--svg-icon-offset-y', px(b.svg_icon_vertical_offset)); put(t, '--svg-color', color(b.svg_icon_color, 'currentColor'));
        put(t, '--scrolling-text-color', own ? color(b.text_color, 'var(--color-text)') : null);
        put(t, '--an-b-f', font || null); put(t, '--scrolling-font-weight', font ? fontWeight(b.font, '400') : null);
        put(t, '@data-own-font', !!font || null); put(t, '@data-own-weight', !!font || null);
        const text = t.querySelector('[data-an-text]'); put(text, 'rich', b.text || ''); put(text, 'hidden', !plain(b.text));
        const icon = t.querySelector('[data-an-icon]'); put(icon, 'hidden', !hasSvg);
        const wrap = icon && icon.querySelector('.scrolling__marquee-svg-wrap'); put(wrap, '@data-colorize', bool(b.enable_svg_icon_color) ? 'true' : 'false'); put(wrap, 'svg', b.svg_icon || '');
        const pic = t.querySelector('[data-an-pic]'); put(pic, 'hidden', hasSvg || !url(b.image, true)); put(pic, 'image', imgJson(b.image, copy ? '' : null, 60, 'scrolling__marquee-img'));
      }
    },
    after(root) { const t = root.querySelector('[data-an-track]'); if (t) syncClock(t); },
    visibility: pauseWhenAway,
  };

  /* ---------- close button (Basic, Pro 2) ---------- */
  /* Storefront: hides the bar and remembers it (days > 0 in localStorage until then, 0 for this tab).
     Builder: hides it only until the next edit, so the section can still be edited. */
  function closer(root, st, keys) {
    const store = (kind) => { try { return kind === 'local' ? localStorage : sessionStorage; } catch (_) { return null; } };
    if (!design()) {
      try {
        const until = +(store('local')?.getItem(keys.local) || 0);
        if ((until && Date.now() < until) || store('session')?.getItem(keys.session) === '1' || (keys.legacy && keys.legacy())) root.hidden = true;
      } catch (_) {}
    }
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-an-close]'); if (!b || !root.contains(b)) return;
      e.preventDefault();
      if (design()) { root.setAttribute('data-an-dismissed', ''); return; }
      root.hidden = true;
      const days = num(keys.days ? keys.days() : 0);
      try { if (days > 0) store('local')?.setItem(keys.local, String(Date.now() + days * 864e5)); else store('session')?.setItem(keys.session, '1'); } catch (_) {}
    }, {signal: st.abort.signal});
  }

  /* ---------- Announcement Bar Basic ---------- */
  function themeButton(c, el, b, o) {
    const {put} = c, own = bool(b.enable_custom_style), shape = off(b.use_theme_button), outline = b.style === 'outline';
    const cv = v => own ? color(v, '') || null : null;
    put(el, '@data-theme-button', outline ? 'secondary' : 'primary');
    const bgv = outline ? 'transparent' : cv(b.bg_color), tx = cv(b.text_color), hb = cv(b.bg_hover);
    put(el, '--mb-bg', bgv); put(el, '--mb-text', tx); put(el, '--mb-border', outline ? tx : bgv);
    put(el, '--mb-hover-bg', hb); put(el, '--mb-hover-text', cv(b.color_hover)); put(el, '--mb-hover-border', hb);
    put(el, '--mb-radius', shape ? px(b.radius) : null); put(el, '--mb-padding-y', shape ? px(b.padding_y) : null); put(el, '--mb-padding-x', shape ? px(b.padding_x) : null); put(el, '--mb-font-size', shape ? px(b.font_size) : null);
    put(el, '@data-own-shape', shape || null);
    put(el, '--mb-weight', o.weight || null); put(el, '@data-own-weight', !!o.weight || null);
    const f = bool(b.enable_custom_fonts) ? fontCss(b.font, '') : '';
    put(el, '--mb-font', f || null); put(el, '@data-own-font', !!f || null);
  }
  TYPES['announcement-bar-basic'] = {
    bp: 768,
    derive(c) {
      const {root, s, put} = c, own = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts), legacyFont = !fonts && bool(s.enable_custom_font), cw = bool(s.enable_custom_font_weight);
      scheme(c); frame(c, 'full_width');
      const align = s.content_alignment || 'center';
      const v = {
        '--ab-bg': bg(own, s.background_type, s.background_color, s.gradient_start_color, s.gradient_end_color, s.gradient_angle),
        '--ab-text': pick(own, s.text_color, 'var(--color-text)'),
        '--ab-border': pick(own, s.border_color, 'var(--color-border)'), '--ab-bw': bool(s.show_border_bottom) ? px(num(s.border_width, 1) || 1) : '0px',
        '--ab-justify': {left: 'flex-start', right: 'flex-end'}[align] || 'center', '--ab-ta': {left: 'start', right: 'end'}[align] || 'center',
        '--ab-gap': px(s.content_gap), '--ab-px': px(s.bar_padding_x), '--ab-px-m': bool(s.show_close_button_mobile) ? '36px' : '14px',
        '--ab-ls': px(s.letter_spacing), '--ab-tt': s.text_transform || 'none',
        '--ab-ff': fonts ? fontCss(s.body_font, 'inherit') : legacyFont ? '"' + (s.custom_font || '') + '"' : 'inherit',
        '--ab-fw': cw ? String(s.message_font_weight || 400) : fonts ? fontWeight(s.body_font, 'var(--body-weight, inherit)') : 'var(--body-weight, inherit)',
        '--ab-fs-d': px(s.font_size), '--ab-fs-m': px(s.mobile_font_size), '--ab-h-d': px(s.bar_height), '--ab-h-m': px(s.mobile_bar_height),
      };
      for (const k in v) put(root, k, v[k]);
      put(root, '@data-show', s.display_section_on || 'display_all');
      put(root, '@data-close-d', bool(s.show_close_button) ? 'true' : 'false'); put(root, '@data-close-m', bool(s.show_close_button_mobile) ? 'true' : 'false');
      put(root, '@data-close-days', String(num(s.close_persistence_days)));
      put(root, '@data-own-font', fonts || bool(s.enable_custom_font) || null); put(root, '@data-own-weight', fonts || bool(s.enable_custom_font) || cw || null);
      put(c.q('[data-an-close]'), '@aria-label', s.close_label || 'Close announcement');
      let legacy = c.q('[data-an-legacy="message"]');
      if (legacy && !c.blocks.length) {
        const href = url(s.link);
        legacy = put(legacy, 'href', href);
        put(legacy, '@target', href && bool(s.open_in_new_tab) ? '_blank' : null); put(legacy, '@rel', href && bool(s.open_in_new_tab) ? 'noopener' : null);
        put(legacy.querySelector('.ab-msg__d'), 'text', s.message || ''); put(legacy.querySelector('.ab-msg__m'), 'text', plain(s.message_mobile) ? s.message_mobile : s.message || '');
      }
    },
    block(c, el, b, type) {
      const {put, s, root} = c, tab = bool(b.open_in_new_tab);
      if (type === 'message') {
        const href = url(b.link);
        el = put(el, 'href', href);
        put(el, '@target', href && tab ? '_blank' : null); put(el, '@rel', href && tab ? 'noopener' : null);
        put(el, '@data-vis', b.visibility || 'all');
        put(el, 'hidden', !plain(b.text) && !plain(b.text_mobile));
        put(el, '--b-c', bool(b.enable_custom_style) ? color(b.color, 'var(--ab-text)') : null);
        const f = bool(b.enable_custom_fonts) ? fontCss(b.font, '') : '';
        put(el, '--b-f', f || null); put(el, '--b-w', f ? fontWeight(b.font, '400') : null);
        put(el, '@data-own-font', !!f || null); put(el, '@data-own-weight', !!f || null);
        put(el.querySelector('.ab-msg__d'), 'text', b.text || ''); put(el.querySelector('.ab-msg__m'), 'text', plain(b.text_mobile) ? b.text_mobile : b.text || '');
      } else if (type === 'button') {
        el = put(el, 'href', url(b.link) || root.dataset.anFallbackHref || '/collections/all');
        put(el, '@target', tab ? '_blank' : null); put(el, '@rel', tab ? 'noopener' : null);
        put(el, '@data-vis', b.visibility || 'all');
        put(el, 'text', b.label || ''); put(el, 'hidden', !plain(b.label));
        themeButton(c, el, b, {weight: bool(s.enable_custom_font_weight) ? String(s.button_font_weight || 600) : ''});
      }
    },
    init(root, st) {
      const id = root.dataset.anSection;
      closer(root, st, {local: 'announcementBarClosedUntil:' + id, session: 'announcementBarClosed:' + id, days: () => st.s.close_persistence_days});
    },
  };

  /* ---------- Announcement Bar Pro 1 (annoucment-bar-scrolling) ---------- */
  /* The separator shapes of snippets/announce-icon (an unknown name draws the sun, as the Liquid does). */
  const ICONS = {"fa-star":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01z\"/></svg>","fa-heart":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M12 21s-7.6-4.7-10-9.4C.6 8.4 2.6 4 6.6 4c2.2 0 3.6 1.1 5.4 3.2C13.8 5.1 15.2 4 17.4 4c4 0 6 4.4 4.6 7.6C19.6 16.3 12 21 12 21z\"/></svg>","fa-circle":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><circle fill=\"currentColor\" cx=\"12\" cy=\"12\" r=\"6\"/></svg>","fa-square":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><rect fill=\"currentColor\" x=\"6\" y=\"6\" width=\"12\" height=\"12\"/></svg>","fa-diamond":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M12 3l9 9-9 9-9-9z\"/></svg>","fa-bolt":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M13 2L4 14h7l-1 8 9-12h-7z\"/></svg>","fa-moon":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z\"/></svg>","fa-check":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M4 12.5l5 5L20 6.5\"/></svg>","fa-plus":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.6\" stroke-linecap=\"round\" d=\"M12 5v14M5 12h14\"/></svg>","fa-arrow-right":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M4 12h15M13 6l6 6-6 6\"/></svg>","fa-leaf":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M20 4C9 4 4 9 4 16c0 1.4.3 2.7.8 4 1.7-5 5.2-8.2 10.2-9.5-4 2-6.8 5-8 9 .9.3 1.9.5 3 .5 7 0 10-6 10-16z\"/></svg>","fa-fire":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4 0-6 1-9z\"/></svg>","fa-gift":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M3 8h18v5H3zM5 14h6v8H5zM13 14h6v8h-6zM11 8h2v5h-2zM12 8c-2-5-7-5-7-2s5 2 7 2zm0 0c2-5 7-5 7-2s-5 2-7 2z\"/></svg>","fa-truck":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M1 5h13v11H1zM15 9h4l4 4v3h-8zM6 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm12 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z\"/></svg>","fa-snowflake":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" d=\"M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7\"/></svg>","fa-sun":"<svg viewBox=\"0 0 24 24\" width=\"1em\" height=\"1em\" aria-hidden=\"true\" focusable=\"false\"><circle fill=\"currentColor\" cx=\"12\" cy=\"12\" r=\"4.5\"/><path fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" d=\"M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1\"/></svg>","none":""};
  function barLink(root, href, st) {
    const track = root.querySelector('[data-an-track]'); if (!track) return;
    const a = root.querySelector(':scope > [data-an-bar-link]');
    if (href && !a) { const n = document.createElement('a'); n.className = 'announcement-bar-link'; n.target = '_blank'; n.rel = 'noopener noreferrer'; n.setAttribute('data-an-bar-link', ''); n.href = href; track.replaceWith(n); n.append(track); }
    else if (href && a) a.setAttribute('href', href);
    else if (!href && a) a.replaceWith(track);
  }
  TYPES['annoucment-bar-scrolling'] = {
    bp: 769,
    derive(c) {
      const {root, s, put} = c, own = bool(s.enable_custom_style), fonts = bool(s.enable_custom_font);
      scheme(c); frame(c, 'full_width');
      const v = {
        '--ab1-h': px(s.bar_height), '--ab1-fs': px(s.font_size), '--ab1-gap': px(s.message_spacing), '--ab1-rep': px(s.repetition_spacing),
        '--ab1-dur': (num(s.scroll_speed, 1300) * 3 / 10) + 's',
        '--ab1-text': pick(own, s.message_text_color, 'var(--color-text)'),
        '--ab1-bg': bg(own, s.background_type, s.background_color, s.gradient_start_color, s.gradient_end_color, s.gradient_angle),
        '--ab1-sep': pick(own, s.separator_icon_color, 'var(--color-primary)'),
        '--ab1-ff': fonts ? fontCss(s.announcement_font, 'inherit') : 'inherit', '--ab1-fw': String(s.message_font_weight || 600), '--ab1-tt': off(s.uppercase) ? 'none' : 'uppercase',
      };
      for (const k in v) put(root, k, v[k]);
      put(root, '@data-autoplay', bool(s.autoplay) ? 'true' : 'false'); put(root, '@data-pause-hover', bool(s.pause_on_hover) ? 'true' : 'false');
      put(root, '@data-bg-anim', s.background_animation || 'none'); put(root, '@data-hover', s.hover_effect || 'none');
      put(root, '@data-own-font', fonts || null); put(root, '@data-own-weight', fonts || null);
      const icon = Object.prototype.hasOwnProperty.call(ICONS, s.separator_icon) ? s.separator_icon : 'fa-sun';
      for (const sep of c.qa('.separator-icon')) { put(sep, 'hidden', icon === 'none'); put(sep, 'icon', icon); }
      const linked = bool(s.enable_link_redirect) && url(s.redirect_url) ? url(s.redirect_url) : '';
      put(root, 'barLink', linked);
      if (!c.blocks.some(x => x.type === 'message')) for (let i = 1; i <= 4; i++) {
        const k = 'message_' + i;
        for (const el of c.qa('[data-an-legacy="' + k + '"], [data-an-legacy-copy="' + k + '"]')) { put(el, 'rich', s[k] || ''); put(el, 'hidden', !plain(s[k])); }
      }
    },
    block(c, el, b, type, x) {
      if (type !== 'message') return;
      const {put, root} = c, own = bool(b.enable_custom_style), f = bool(b.enable_custom_fonts) ? fontCss(b.font, '') : '';
      for (const t of [el, ...copiesOf(root, x.id)]) {
        put(t, 'rich', b.text || ''); put(t, 'hidden', !plain(b.text));
        put(t, '--b-c', own ? color(b.color, 'var(--ab1-text)') : null);
        put(t, '--b-f', f || null); put(t, '--b-w', f ? fontWeight(b.font, '400') : null);
        put(t, '@data-own-font', !!f || null); put(t, '@data-own-weight', !!f || null);
      }
    },
    visibility: pauseWhenAway,
  };

  /* ---------- Announcement Bar Pro 2 (announcement-bar) ---------- */
  /* A countdown end: month-day-year with an optional time (local), or anything Date.parse reads. */
  function deadline(v) {
    v = String(v || '').trim(); if (!v) return NaN;
    const m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const [mo, d, y, h, mi, sec] = [m[1], m[2], m[3], m[4] || 0, m[5] || 0, m[6] || 0].map(Number);
      const t = new Date(y, mo - 1, d, h, mi, sec);
      return mo >= 1 && mo <= 12 && t.getMonth() === mo - 1 && t.getDate() === d && h < 24 && mi < 60 && sec < 60 ? t.getTime() : NaN;
    }
    const t = Date.parse(v); return Number.isFinite(t) ? t : NaN;
  }
  /* Every countdown of a bar, one tick a second at most, only while the bar is on screen and the tab is shown. */
  function tick(root, st) {
    clearTimeout(st.tickTimer); st.tickTimer = 0;
    if (!root.isConnected) return;
    const now = Date.now(); let running = false;
    for (const t of root.querySelectorAll('[data-an-timer]')) {
      if (!String(t.dataset.end || '').trim()) continue;
      const end = deadline(t.dataset.end);
      if (!Number.isFinite(end)) { if (!t.hidden) t.hidden = true; t.dataset.invalid = 'true'; continue; }
      if (t.dataset.invalid) { delete t.dataset.invalid; t.hidden = false; }
      const left = Math.max(0, Math.floor((end - now) / 1000));
      const v = {d: Math.floor(left / 86400), h: Math.floor(left % 86400 / 3600), m: Math.floor(left % 3600 / 60), s: left % 60};
      for (const u of t.querySelectorAll('[data-u]')) { const x = String(v[u.dataset.u]).padStart(2, '0'); if (u.textContent !== x) u.textContent = x; }
      const ended = left === 0, e = t.querySelector('[data-an-ended]');
      if (t.dataset.ended !== String(ended)) t.dataset.ended = String(ended);
      if (e) { const show = ended && !!e.textContent.trim(); if (e.hidden === show) e.hidden = !show; }
      if (!ended) running = true;
    }
    if (running && st.visible && !document.hidden) st.tickTimer = setTimeout(() => tick(root, st), 1000 - now % 1000 + 10);
  }
  function rotator(root, st) {
    const box = root.querySelector('[data-an-slides]');
    if (!box || st.slideBox === box) return;
    st.slideBox = box;
    if (st.slideAbort) st.slideAbort.abort();
    const ac = new AbortController(), sig = {signal: ac.signal}; st.slideAbort = ac;
    const all = () => [...box.querySelectorAll('.ab2__slide')];
    const list = () => all().filter(x => !x.hidden);
    let hold = false;
    const multi = () => root.dataset.multi === 'true';
    const paint = active => { for (const x of all()) { const on = x === active; if (x.hasAttribute('data-active') !== on) x.toggleAttribute('data-active', on); const hide = multi() && !on; if ((x.getAttribute('aria-hidden') === 'true') !== hide) { if (hide) x.setAttribute('aria-hidden', 'true'); else x.removeAttribute('aria-hidden'); } } };
    const show = i => { const l = list(); if (!l.length) return; i = ((i % l.length) + l.length) % l.length; st.slide = l[i]; paint(l[i]); };
    const index = () => Math.max(0, list().indexOf(st.slide));
    st.slide = all().find(x => x.hasAttribute('data-active')) || list()[0];
    box.addEventListener('click', e => { const b = e.target.closest('[data-an-prev],[data-an-next]'); if (!b) return; show(index() + (b.hasAttribute('data-an-next') ? 1 : -1)); restart(); }, sig);
    box.addEventListener('keydown', e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); show(index() + (e.key === 'ArrowRight' ? 1 : -1)); restart(); }, sig);
    for (const [n, v] of [['pointerenter', true], ['pointerleave', false], ['focusin', true], ['focusout', false]]) box.addEventListener(n, () => { hold = v; }, sig);
    /* the editor shows the selected block's message */
    document.addEventListener('shopify:block:select', e => { const x = e.target && e.target.closest && e.target.closest('.ab2__slide'); if (x && box.contains(x)) { st.editorHold = true; st.slide = x; paint(x); } }, sig);
    document.addEventListener('shopify:block:deselect', () => { st.editorHold = false; }, sig);
    const restart = () => {
      if (st.slideTimer) { clearInterval(st.slideTimer); st.slideTimer = 0; }
      if (root.dataset.mode !== 'slide' || !multi() || design() || reduced.matches || !st.visible || document.hidden) return;
      st.slideTimer = setInterval(() => { if (!hold && !st.editorHold && root.isConnected) show(index() + 1); }, Math.max(2, num(st.s.change_every, 3)) * 1000);
    };
    st.rotator = {show, restart, sync: () => { const l = list(); if (!l.includes(st.slide)) st.slide = l[0]; paint(st.slide); }};
    restart();
  }
  TYPES['announcement-bar'] = {
    bp: 768,
    derive(c) {
      const {root, s, put} = c, own = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
      scheme(c); frame(c, 'full_width');
      const fw = s.font_weight === 'heading_weight' ? 'var(--heading-weight, 600)' : s.font_weight === 'subheading_weight' ? 'var(--subheading-weight, 600)' : fonts ? fontWeight(s.body_font, 'var(--body-weight, 400)') : 'var(--body-weight, 400)';
      const v = {
        '--ab2-fs': px(s.font_size), '--ab2-pt': px(s.padding_top), '--ab2-pb': px(s.padding_bottom), '--ab2-speed': num(s.speed, 15) + 's', '--ab2-gap': px(s.space_between),
        '--ab2-fw': fw, '--ab2-tt': bool(s.uppercase) ? 'uppercase' : 'none', '--ab2-ff': fonts ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)',
        '--ab2-text': pick(own, s.text_color, 'var(--color-text)'), '--ab2-bg': pick(own, s.background_color, 'var(--color-background)'),
        '--ab2-accent': pick(own, s.accent_color, 'var(--color-heading)'), '--ab2-line': pick(own, s.line_color, 'var(--color-border)'), '--ab2-lw': bool(s.show_separator_line) ? '1px' : '0px',
      };
      for (const k in v) put(root, k, v[k]);
      const shown = c.blocks.filter(x => x.type === 'announcement' && plain(x.b.text)).length;
      put(root, '@data-mode', s.announcement_actions === 'marquee' ? 'marquee' : 'slide'); put(root, '@data-multi', shown > 1 ? 'true' : 'false');
      put(root, '@data-home-only', bool(s.homepage_only) ? 'true' : 'false'); put(root, '@data-show-mobile', off(s.show_mobile) ? 'false' : 'true');
      put(root, '@data-close', bool(s.show_close) ? 'true' : 'false'); put(root, '@data-icon', s.icon_between_item || 'none');
      put(root, '@data-own-font', fonts || null); put(root, '@data-own-weight', fonts || null);
      for (const l of c.qa('[data-l]')) put(l, 'text', s[l.dataset.l] || '');
      for (const i of c.qa('.ab2__icon')) put(i, 'icon', s.icon_between_item === 'star' ? 'fa-star' : 'fa-circle');
    },
    block(c, el, b, type, x) {
      if (type !== 'announcement') return;
      const {put, root} = c, own = bool(b.enable_custom_style), f = bool(b.enable_custom_fonts) ? fontCss(b.font, '') : '', has = !!plain(b.text), end = String(b.countdown_deadline || '');
      put(el, 'hidden', !has);
      const items = copiesOf(root, x.id);
      for (const it of items) put(it, 'hidden', !has);
      for (const m of [el, ...items].map(n => n.querySelector('.ab2__msg')).filter(Boolean)) {
        put(m, '--b-c', own ? color(b.color, 'var(--ab2-text)') : null);
        put(m, '--b-f', f || null); put(m, '--b-w', f ? fontWeight(b.font, '400') : null);
        put(m, '@data-own-font', !!f || null); put(m, '@data-own-weight', !!f || null);
        put(m.querySelector('[data-an-text]'), 'rich', b.text || '');
        const t = m.querySelector('[data-an-timer]');
        put(t, '@data-end', end); put(t, 'hidden', !end.trim());
        put(t && t.querySelector('[data-an-ended]'), 'text', b.ended_text || '');
      }
    },
    init(root, st) {
      rotator(root, st);
      closer(root, st, {local: 'announcement_bar_until:' + root.dataset.anSection, session: 'announcement_bar:' + root.dataset.anSection, days: () => 0});
      tick(root, st);
    },
    after(root, st) { rotator(root, st); if (st.rotator) { st.rotator.sync(); st.rotator.restart(); } tick(root, st); },
    visibility(root, st) { pauseWhenAway(root, st); if (st.rotator) st.rotator.restart(); tick(root, st); },
    drop(root, st) { clearTimeout(st.tickTimer); if (st.slideTimer) clearInterval(st.slideTimer); if (st.slideAbort) st.slideAbort.abort(); },
  };

  /* ---------- engine ---------- */
  function derive(root, st, record) {
    const type = TYPES[root.dataset.anRoot]; if (!type) return [];
    const out = [];
    const put = (el, key, v) => {
      if (!el) return el;
      out.push([el, key, v]);
      if (record === 'audit') return el;
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      const prev = m.get(key); m.set(key, v);
      return write(el, key, v, prev, st) || el;
    };
    const blocks = [...root.querySelectorAll('[data-an-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.anBlock, t = el.dataset.anType;
      if (st.rawBlocks.get(id) !== el.dataset.anSettings) { st.rawBlocks.set(id, el.dataset.anSettings); st.blocks.set(id, {...parse(el.dataset.anSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: t, b: {...(st.blockDefaults[t] || {}), ...st.blocks.get(id)}};
    });
    const c = {root, st, s: st.s, put, blocks, wrap: root.closest('.shopify-section'), desktop: st.mq.matches, q: sel => root.querySelector(sel), qa: sel => [...root.querySelectorAll(sel)]};
    type.derive(c);
    for (const x of blocks) if (type.block) type.block(c, x.el, x.b, x.type, x);
    if (type.finish) type.finish(c);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.anSettings) { st.raw = root.dataset.anSettings; st.s = {...st.defaults, ...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    const type = TYPES[root.dataset.anRoot];
    if (type.after) type.after(root, st);
  }
  function drop(root, st) {
    st.io.disconnect(); st.mq.removeEventListener('change', st.schedule); reduced.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame); st.abort.abort(); for (const t of st.timers) clearTimeout(t); st.timers.clear();
    const type = TYPES[root.dataset.anRoot]; if (type && type.drop) type.drop(root, st);
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.anRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const defaults = parse(root.dataset.anDefaults);
    const st = {root, defaults, live: {}, liveBlocks: new Map(), s: {...defaults, ...parse(root.dataset.anSettings)}, raw: root.dataset.anSettings, blocks: new Map(), rawBlocks: new Map(), blockDefaults: parse(root.dataset.anBlockDefaults), last: new Map(), visible: true, abort: new AbortController(), timers: new Set(),
      mq: matchMedia('(min-width: ' + type.bp + 'px)')};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule); reduced.addEventListener('change', st.schedule);
    st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; if (type.visibility) type.visibility(root, st); });
    st.io.observe(root);
    roots.set(root, st);
    derive(root, st, true);
    if (type.init) type.init(root, st);
    st.schedule();
    root.dataset.anReady = '';
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
      if (root.dataset.anSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      if (design()) { st.dismissed = false; root.removeAttribute('data-an-dismissed'); }
      st.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const [root, st] of roots) { const t = TYPES[root.dataset.anRoot]; if (t.visibility) t.visibility(root, st); } });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-an-block]') || n.querySelector(SEL + ',[data-an-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-an-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-an-settings']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false) { have = have !== null; } else want = v == null ? null : String(v); }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'text') { have = el.textContent.trim(); want = String(v == null ? '' : v).trim(); }
      else continue;
      if (have !== want) bad.push((el.dataset.anBlock || el.dataset.anCopy || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaAnnouncements = {scan, audit, roots, TYPES};
  scan();
})();
