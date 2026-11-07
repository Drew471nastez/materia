/* Materia Themes. Social and Dividers: Divider (divider), Divider 3
   (divider3), Waves Divider 2 (waves-divider), Instagram Promo
   (instagram-promo), Social Icons Pro (social-icons-pro2) and Social Shop
   Grid (social-shop-grid). Loaded on every page by layout/theme.storelib.

   Live edits: every root [data-sd-root] carries its settings as JSON and
   every block [data-sd-block] its own. derive() turns them into outputs
   (a CSS variable, an attribute, a class, text, a picture) per element, the
   same values the Liquid prints, so on load the first derive is only
   recorded. After that an output is written only when its value changes,
   once per frame per root, so a picture never reloads and a running video
   or slider is never restarted by an unrelated edit. audit() lists outputs
   whose markup differs from the derived value (tests).

   Motion: tile videos in Social Shop Grid play only while on screen, never
   under reduced motion; the theme's slider (slide-section) is built again
   only when one of the data-* values it reads changes. */
(() => {
  if (window.MateriaSocialDividers) return;
  const SEL = '[data-sd-root]', BSEL = '[data-sd-block]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => localColor(v, f) || f;
  const url = v => { v = v && typeof v === 'object' ? v.url || v.value || '' : v; return typeof v === 'string' ? v.trim() : ''; };
  const imgSrc = v => { v = v && typeof v === 'object' ? v.src || v.url || '' : v; if (typeof v !== 'string' || !v) return ''; try { return ['http:', 'https:', 'data:'].includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  /* a font picker value: the Liquid prints "family, fallbacks" */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    return typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
  };
  const fontWeight = v => v && typeof v === 'object' && v.weight ? String(v.weight) : '';
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- writers ---------- */
  const INLINE = ['P', 'BR', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'A', 'U', 'S', 'SMALL', 'SUB', 'SUP', 'MARK'];
  const BLOCK = INLINE.concat(['UL', 'OL', 'LI', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);
  function rich(el, value, inline) {
    const t = document.createElement('template');
    t.innerHTML = String(value || '');
    t.content.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(n => n.remove());
    const ok = inline ? INLINE.filter(x => x !== 'P') : BLOCK;
    t.content.querySelectorAll('*').forEach(n => {
      if (!ok.includes(n.tagName)) { n.replaceWith(...n.childNodes); return; }
      const href = n.getAttribute('href'), title = n.getAttribute('title'), target = n.getAttribute('target');
      [...n.attributes].forEach(a => n.removeAttribute(a.name));
      if (n.tagName === 'A' && href && !/^\s*javascript:/i.test(href)) { n.setAttribute('href', href); if (title) n.setAttribute('title', title); if (target) n.setAttribute('target', target); }
    });
    el.replaceChildren(t.content);
  }
  /* an element whose tag follows a link: <a href> with a link, <span> (or the given tag) without */
  function link(el, href, st, bare) {
    const tag = href ? 'A' : (bare || 'SPAN');
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
  /* a picture slot: {t:'img', src, alt, w, h} or {t:'ph'} (the placeholder template of the root) */
  function media(el, v, prev, st) {
    const d = parse(v), p = parse(prev);
    const cur = el.querySelector(':scope > img[data-sd-img], :scope > [data-sd-ph]');
    if (cur && p.t === d.t && p.src === d.src) { if (d.t === 'img' && cur.tagName === 'IMG' && cur.alt !== (d.alt || '')) cur.alt = d.alt || ''; return; }
    let n;
    if (d.t === 'img') {
      n = document.createElement('img'); n.setAttribute('data-sd-img', ''); n.alt = d.alt || '';
      if (d.w && d.h) { n.width = d.w; n.height = d.h; }
      n.loading = 'lazy'; n.decoding = 'async';
      if (d.widths) { const q = d.src.includes('?') ? '&' : '?'; n.srcset = d.widths.map(w => d.src + q + 'width=' + w + ' ' + w + 'w').join(', '); }
      n.src = d.src;
      if (d.cls) n.className = d.cls;
    } else {
      const t = (st.root.closest('.shopify-section') || st.root).querySelector('template[data-sd-ph]');
      n = t ? t.content.firstElementChild.cloneNode(true) : document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      n.setAttribute('data-sd-ph', '');
    }
    if (cur) cur.replaceWith(n); else el.prepend(n);
  }
  function write(el, key, v, prev, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') { if (prev) for (const c of String(prev).split(' ')) if (c) el.classList.remove(c); if (v) for (const c of String(v).split(' ')) if (c) el.classList.add(c); }
    else if (key[0] === '~') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v, false);
    else if (key === 'inline') rich(el, v, true);
    else if (key === 'html') el.innerHTML = v == null ? '' : String(v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'media') media(el, v, prev, st);
    else if (key === 'href') return link(el, v, st);
    else if (key === 'hrefb') return link(el, v, st, 'BUTTON');
    else if (key === 'hrefd') return link(el, v, st, 'DIV');
    else if (key === 'hrefa') { if (v) { el.setAttribute('href', v); } else el.removeAttribute('href'); return el; }
    else if (key.startsWith('fn:')) { const f = st.type.fns && st.type.fns[key.slice(3)]; if (f) return f(el, v, prev, st) || el; }
    return el;
  }

  /* ---------- shared derive pieces ---------- */
  const custom = s => bool(s.enable_custom_style);
  const pick = (on, v, f) => on ? color(v, f) : f;
  const schemeOf = s => { const v = s.color_scheme && s.color_scheme.id || s.color_scheme; return typeof v === 'string' && /^[\w-]+$/.test(v) ? v : ''; };
  const WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width'];
  const own = (c, el, name, on) => c.put(el, '@data-own-' + name, on || null);
  /* The section wrapper: margins (desktop/mobile, Remove space between sections) and a background */
  function wrapper(c, {top, bottom, reset = true, bg}) {
    const wrap = c.root.closest('.shopify-section'); if (!wrap || c.record === 'audit') return;
    const r = reset && bool(c.s.reset_spacing);
    c.put(wrap, '!margin-top', r ? '0px' : px(top)); c.put(wrap, '!margin-bottom', r ? '0px' : px(bottom));
    if (bg !== undefined) c.put(wrap, '!background-color', bg || 'transparent');
  }
  const margins = (s, d) => [s['section_margin_top_' + (d ? 'desktop' : 'mobile')], s['section_margin_bottom_' + (d ? 'desktop' : 'mobile')]];

  /* ---------- Divider ---------- */
  function divider(c) {
    const {root, s, put} = c, o = custom(s), align = s.align || 'center';
    const lb = c.blocks.find(x => x.type === 'label');
    const b = lb ? lb.b : null;
    const text = b ? b.text : s.label, icon = b ? b.icon_svg : s.icon_svg;
    const lc = b ? (custom(b) ? b.color : '') : (o ? s.label_color : '');
    put(root, '--section-pt', String(num(s.padding_top))); put(root, '--section-pb', String(num(s.padding_bottom)));
    put(root, '~pt-min', num(s.padding_top) < 30); put(root, '~pb-min', num(s.padding_bottom) < 30); put(root, '~remove_spacing', bool(s.reset_spacing));
    put(root, '--div-thickness', px(s.thickness, 1));
    put(root, '!--div-color', pick(o, s.color_from, 'var(--color-border)'));
    put(root, '--div-color-to', pick(o, s.color_to, 'var(--color-border)'));
    put(root, '--div-width', num(s.width_pct, 100) + '%');
    put(root, '--div-gap', px(s.label_gap, 14));
    put(root, '!--div-label-color', color(lc, 'var(--color-text)'));
    put(root, '--div-label-size', px(b ? b.size : s.label_size, 12));
    put(root, '--div-justify', align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center');
    put(root, '@data-div-style', s.style || 'solid');
    put(c.q('[data-sd-width]'), '.width', s.section_width || 'full_width');
    const has = !blank(text) || !blank(icon);
    for (const el of c.all('[data-sd-label-part]')) put(el, 'hidden', !has);
    const lab = c.q('[data-sd-label]');
    if (lab) {
      put(lab, 'fn:label', JSON.stringify([icon || '', text || '']));
      const f = !!b && bool(b.enable_custom_fonts) && !!font(b.font);
      put(lab, '--div-label-font', f ? font(b.font) : null); put(lab, '--div-label-weight', f && fontWeight(b.font) || null);
      own(c, lab, 'font', f); own(c, lab, 'weight', f && !!fontWeight(b.font));
    }
    const [t, bt] = margins(s, c.st.mq.matches);
    wrapper(c, {top: t, bottom: bt, bg: o ? color(s.section_bg, '') : ''});
  }
  const dividerFns = {
    label(el, v) { const [icon, text] = parse(v); el.innerHTML = (icon || '') + esc(text || ''); },
  };


  /* ---------- Divider 3 ---------- */
  const D3_PX = {'--section-divider-thickness': 'divider_thickness', '--section-two-line-divider-thickness': 'two_line_divider_thickness', '--section-circle-divider-thickness': 'circle_divider_thickness', '--section-lines-divider-thickness': 'lines_divider_thickness', '--section-rectangles-divider-thickness': 'rectangles_divider_thickness', '--section-wave-line-divider-thickness': 'wave_line_divider_thickness', '--section-waves-divider-thickness': 'waves_divider_thickness', '--section-waves-2-divider-thickness': 'waves2_divider_thickness', '--section-marks-divider-thickness': 'marks_divider_thickness'};
  const D3_PCT = {'--section-leaf-divider-width': 'leaf_divider_width', '--section-brush-1-divider-width': 'brush1_divider_width', '--section-brush-2-divider-width': 'brush2_divider_width', '--section-pointed-stars-divider-width': 'pointed_stars_divider_width'};
  function divider3(c) {
    const {root, s, put} = c, o = custom(s), el = c.q('[data-sd-d3]');
    put(root, '.width', s.section_width || 'full_width');
    if (el) {
      put(el, '--section-margin-top-mobile', px(s.top_margin_mobile)); put(el, '--section-margin-bottom-mobile', px(s.bottom_margin_mobile));
      put(el, '--section-margin-top-desktop', px(s.top_margin_desktop)); put(el, '--section-margin-bottom-desktop', px(s.bottom_margin_desktop));
      put(el, '!--section-divider-color', pick(o, s.divider_color, 'var(--color-heading)'));
      put(el, '--section-width', num(s.inner_width, 50) + '%');
      put(el, '--section-divider-size-mobile', String(num(s.divider_size_mobile, 100))); put(el, '--section-divider-size-desktop', String(num(s.divider_size_desktop, 100)));
      for (const [k, id] of Object.entries(D3_PX)) put(el, k, px(s[id], 2));
      for (const [k, id] of Object.entries(D3_PCT)) put(el, k, num(s[id], 100) + '%');
      put(el, '~LoudzDividers--fullWidth', num(s.inner_width, 50) === 100);
      put(c.q('[data-sd-shape]'), 'fn:shape', s.divider_style || 'brush-2');
    }
    const [t, b] = margins(s, c.st.mq.matches);
    wrapper(c, {top: t, bottom: b, bg: o ? color(s.section_bg, '') : ''});
  }
  /* the builder keeps every shape in a <template data-sd-shapes>: swap it in */
  const d3Fns = {
    shape(el, v, prev, st) {
      const t = st.root.querySelector('template[data-sd-shapes="' + CSS.escape(v) + '"]');
      if (!t) return;
      el.replaceChildren(t.content.cloneNode(true));
      el.dataset.sdShape = v;
    },
  };


  /* ---------- Waves Divider 2 ---------- */
  const WAVES = {
    curve: 'M0,50 C 25,0 75,100 100,50 L100,100 L0,100 Z', fan: 'M0,100 L100,0 L100,100 Z', 'curve-opacity': 'M0,60 C 25,10 75,110 100,60 L100,100 L0,100 Z',
    mountains: 'M0,100 L20,40 L40,80 L60,20 L80,70 L100,100 Z', 'curve-asym': 'M0,60 C 15,10 85,90 100,40 L100,100 L0,100 Z', 'curve-asym-alt': 'M0,40 C 15,90 85,10 100,60 L100,100 L0,100 Z',
    tilt: 'M0,0 L100,20 L100,100 L0,100 Z', 'tilt-alt': 'M0,20 L100,0 L100,100 L0,100 Z', triangle: 'M0,100 L50,0 L100,100 Z',
    waves: 'M0,50 C 25,40 25,60 50,50 C 75,40 75,60 100,50 L100,100 L0,100 Z', 'waves-opacity': 'M0,50 C 25,30 25,70 50,50 C 75,30 75,70 100,50 L100,100 L0,100 Z', 'waves-opacity2': 'M0,50 C 20,40 40,60 60,50 C 80,40 80,60 100,50 L100,100 L0,100 Z',
    clouds: 'M0,70 C 15,70 15,40 35,40 C 55,40 55,70 75,70 C 95,70 95,40 100,40 L100,100 L0,100 Z', speech: 'M0,30 C0,0 100,0 100,30 L100,60 C100,80 80,80 70,90 L60,100 40,80 0,80 Z',
    blob: 'M0,50 C20,30 80,70 100,50 L100,100 L0,100 Z', arch: 'M0,50 C10,10 90,10 100,50 L100,100 L0,100 Z', 'arch-alt': 'M0,50 C10,90 90,90 100,50 L100,100 L0,100 Z',
    drops: 'M0,50 C20,20 20,80 50,50 C80,20 80,80 100,50 L100,100 L0,100 Z', 'drops-alt': 'M0,50 C15,25 35,75 50,50 C65,25 85,75 100,50 L100,100 L0,100 Z',
    'wave-slope': 'M0,50 C25,10 75,90 100,50 L100,100 L0,100 Z', 'wave-slope-alt': 'M0,50 C25,90 75,10 100,50 L100,100 L0,100 Z',
    slant: 'M0,30 L100,70 L100,100 L0,100 Z', 'slant-alt': 'M0,70 L100,30 L100,100 L0,100 Z', peak: 'M0,100 L20,30 L50,0 L80,30 L100,100 Z',
  };
  function waves(c) {
    const {root, s, put} = c, o = custom(s), el = c.q('[data-sd-waves]');
    put(root, '.width', s.section_width || 'container');
    if (el) {
      const wave = pick(o, s.wave_color, 'var(--color-heading)');
      put(el, '--wd-wave', wave);
      put(el, '--wd-wave-2', bool(s.enable_second_color) ? pick(o, s.wave_color_2, 'var(--color-primary)') : wave);
      put(el, '--wd-border', pick(o, s.border_color, 'var(--color-border)')); put(el, '--wd-bw', px(s.border_thickness));
      put(el, '--wd-bg', pick(o, s.background_color, 'var(--color-background)'));
      const g = o && String(s.background_gradient || '').trim();
      put(el, '--wd-gradient', g || 'none');
      put(el, '--wd-mt', String(num(s.margin_top))); put(el, '--wd-mb', String(num(s.margin_bottom)));
      put(el, '--wd-pt', String(num(s.padding_top))); put(el, '--wd-pb', String(num(s.padding_bottom)));
      put(el, '--wd-px-m', num(s.padding_horizontal_mobile) + 'rem'); put(el, '--wd-px-d', num(s.padding_horizontal) + 'rem');
      put(el, '--wd-h-m', px(s.wave_height_mobile)); put(el, '--wd-h-d', px(s.wave_height));
      put(el, '--wd-maxw', bool(s.full_width) ? 'none' : num(s.content_width) + 'rem');
      put(el, '--wd-rotate', bool(s.wave_rotate) ? 'rotate(180deg)' : 'none');
      put(c.q('[data-sd-wave-path]'), '@d', WAVES[s.wave_variant] || WAVES.curve);
    }
    const [t, b] = margins(s, c.st.mq.matches);
    wrapper(c, {top: t, bottom: b, bg: o ? color(s.section_bg, '') : ''});
  }


  /* ---------- Social Icons Pro ---------- */
  function sipText(c, x, s) {
    const {put} = c, b = x.b, h = x.type === 'headline', k = h ? 'h' : 'p';
    put(x.el, 'inline', b.text || '');
    put(x.el, '--sip-' + k + '-d', px(b.size)); put(x.el, '--sip-' + k + '-m', px(b.mobile_size));
    put(x.el, '--sip-' + k + '-color', custom(b) ? color(b.color, h ? 'var(--color-heading)' : 'var(--color-text)') : (h ? 'var(--color-heading)' : 'var(--color-text)'));
    const lh = b.line_height && b.line_height !== 'inherit' ? String(b.line_height) : null;
    put(x.el, '--sip-' + k + '-lh', lh); own(c, x.el, 'size', !!lh);
    const f = (bool(b.enable_custom_fonts) || bool(s.enable_custom_font)) && font(b.font) || '';
    const w = f && fontWeight(b.font) || '';
    put(x.el, '--sip-' + k + '-font', f || null); put(x.el, '--sip-' + k + '-weight', w || null);
    own(c, x.el, 'font', !!f); own(c, x.el, 'weight', !!w);
  }
  function sipIcon(c, x, so) {
    const {put} = c, b = x.b, platform = b.platform || 'instagram';
    const href = url(b.link) || (so.links || {})[platform] || '', label = (so.labels || {})[platform] || platform;
    const el = put(x.el, 'href', href);
    put(el, '@target', href ? '_blank' : null); put(el, '@rel', href ? 'noopener noreferrer' : null); put(el, '@aria-label', href ? label : null);
    put(el, '@data-sip-unlinked', !href);
    const ic = el.querySelector('.loud-icon'); if (!ic) return;
    put(ic, '.platform', 'loud-icon--' + platform); put(ic, '@aria-label', label);
    put(ic, '--loud-icon-color', custom(b) ? color(b.color, 'var(--color-heading)') : 'var(--color-heading)');
  }
  function socialIcons(c) {
    const {root, s, put} = c, o = custom(s), el = c.q('.loud-wrap');
    put(root, '.width', s.section_width || 'container');
    if (el) {
      put(el, '@data-sip-show', s.show_on_device || 'all');
      put(el, '--sip-bg', pick(o, s.section_background_color, 'var(--color-background)'));
      put(el, '--sip-py', px(s.section_padding_top_bottom)); put(el, '--sip-px', px(s.section_padding_left_right)); put(el, '--sip-py-m', px(s.mobile_section_padding_top_bottom)); put(el, '--sip-px-m', px(s.mobile_section_padding_left_right));
      put(el, '--sip-box-bg', pick(o, s.container_background_color, 'transparent')); put(el, '--sip-border', pick(o, s.container_border_color, 'var(--color-border)'));
      put(el, '--sip-bw', px(s.container_border_size)); put(el, '--sip-radius', px(s.container_radius)); put(el, '--sip-shadow', bool(s.container_shadow) ? '0 0 5px 0 rgba(0,0,0,0.20)' : 'none'); put(el, '--sip-maxw', px(s.container_max_width));
      put(el, '--sip-box-py', px(s.container_padding_top_bottom)); put(el, '--sip-box-px', px(s.container_padding_left_right)); put(el, '--sip-box-py-m', px(s.mobile_container_padding_top_bottom)); put(el, '--sip-box-px-m', px(s.mobile_container_padding_left_right));
      put(el, '--sip-hs', px(s.headline_spacing)); put(el, '--sip-gap', px(s.element_spacing)); put(el, '--sip-align', s.text_alignment || 'center'); put(el, '--sip-align-m', s.mobile_text_alignment || 'center');
      put(el, '--sip-icon-h', px(s.icon_height)); put(el, '--sip-icon-h-m', px(s.mobile_icon_height)); put(el, '--sip-icon-gap', px(s.icon_gap)); put(el, '--sip-icon-gap-m', px(s.mobile_icon_gap));
    }
    const so = parse(root.dataset.sdSocials);
    for (const x of c.blocks) {
      if (x.type === 'headline' || x.type === 'subheading') sipText(c, x, s);
      else if (x.type === 'icon') sipIcon(c, x, so);
    }
    for (const a of c.all('[data-sip-legacy]')) { const ic = a.querySelector('.loud-icon'); if (ic) put(ic, '--loud-icon-color', pick(o, s[a.dataset.sipLegacy + '_color'], 'var(--color-heading)')); }
    const [t, b] = margins(s, c.st.mq.matches);
    wrapper(c, {top: t, bottom: b});
  }


  /* ---------- Instagram Promo ---------- */
  const IG_SHADOW = {low: '0 2px 5px rgba(0,0,0,0.1)', medium: '0 4px 10px rgba(0,0,0,0.2)', high: '0 6px 15px rgba(0,0,0,0.3)'};
  const IG_SHOW = {no_devices: 'show-none hide-all', mobile_only: 'show-mobile', desktop_only: 'show-desktop'};
  function igButton(c, s, b, igLink, bodyFont) {
    const {put} = c, block = !!b, src = b || s;
    const label = block ? b.label : (s.button_text || 'Follow');
    const link = url(block ? b.link : s.button_link_url) || igLink;
    const mine = block ? custom(b) : custom(s);
    const shape = (block ? b.use_theme_button : s.use_theme_button) === false || (block ? b.use_theme_button : s.use_theme_button) === 'false';
    let el = c.q('[data-ig-button]'); if (!el) return;
    el = put(el, 'hrefb', link);
    put(el, '@target', link ? '_blank' : null); put(el, '@rel', link ? 'noopener' : null);
    put(el, 'text', label || '');
    const bg = block ? src.bg_color : s.button_bg_color, tx = block ? src.text_color : s.button_text_color, hb = block ? src.bg_color_hover : s.button_hover_bg_color, ht = block ? src.text_color_hover : s.button_text_hover_color;
    put(el, '--mb-bg', mine ? color(bg, 'var(--btn-primary-bg-color)') : null); put(el, '--mb-border', mine ? color(bg, 'var(--btn-primary-bg-color)') : null);
    put(el, '--mb-text', mine ? color(tx, 'var(--btn-primary-color)') : null);
    put(el, '--mb-hover-bg', mine ? color(hb, 'var(--btn-primary-hover-bg-color)') : null); put(el, '--mb-hover-border', mine ? color(hb, 'var(--btn-primary-hover-bg-color)') : null);
    put(el, '--mb-hover-text', mine ? color(ht, 'var(--btn-primary-hover-color)') : null);
    put(el, '--ig-btn-fs-d', shape ? px(block ? b.size_desktop : s.button_size_desktop) : null); put(el, '--ig-btn-fs-m', shape ? px(block ? b.size_mobile : s.button_size_mobile) : null);
    put(el, '--mb-weight', shape ? String((block ? b.font_weight : s.button_font_weight) || 700) : null);
    own(c, el, 'shape', shape); own(c, el, 'weight', shape);
    put(el, '--mb-font', bodyFont || null); own(c, el, 'font', !!bodyFont);
  }
  function instagram(c) {
    const {root, s, put} = c, o = custom(s), el = c.q('[data-sd-ig]');
    const igRaw = parse(root.dataset.sdSocials), igLink = typeof igRaw === 'string' ? igRaw : '';
    const fonts = bool(s.enable_custom_fonts), hf = fonts && font(s.heading_font) || '', bf = fonts && font(s.body_font) || '';
    put(root, '.width', s.section_width || 'container');
    if (el) {
      put(el, '.show', IG_SHOW[s.show_section_on] || 'show-all');
      put(el, '@data-ig-hover', s.image_hover_animation || 'none');
      put(el, '--ig-ml', px(s.margin_left)); put(el, '--ig-mr', px(s.margin_right));
      put(el, '--ig-bg', pick(o, s.background_color, 'var(--color-background)'));
      put(el, '--ig-pt-d', px(s.padding_top_desktop)); put(el, '--ig-pb-d', px(s.padding_bottom_desktop)); put(el, '--ig-px-d', bool(s.full_width_desktop) ? '0px' : px(s.padding_lr_desktop));
      put(el, '--ig-pt-m', px(s.padding_top_mobile)); put(el, '--ig-pb-m', px(s.padding_bottom_mobile)); put(el, '--ig-px-m', bool(s.full_width_mobile) ? '0px' : px(s.padding_lr_mobile));
      put(el, '--ig-gap-d', px(s.horizontal_gap_desktop)); put(el, '--ig-gap-m', px(s.vertical_gap_mobile));
      put(el, '--ig-iw-d', px(s.image_width_desktop)); put(el, '--ig-ih-d', px(s.image_height_desktop)); put(el, '--ig-iw-m', px(s.image_width_mobile)); put(el, '--ig-ih-m', px(s.image_height_mobile));
      put(el, '--ig-radius', bool(s.circular_images) ? '50%' : px(s.image_border_radius));
      put(el, '--ig-shadow', IG_SHADOW[s.image_shadow] || 'none');
      put(el, '--ig-hf', hf || null); put(el, '--ig-bf', bf || null);
    }
    let btn = null;
    for (const x of c.blocks) {
      const b = x.b, bc = custom(b) ? b.color : '';
      if (x.type === 'heading') {
        put(x.el, 'inline', b.text || '');
        put(x.el, '--ig-h-d', px(b.size_desktop)); put(x.el, '--ig-h-m', px(b.size_mobile)); put(x.el, '--ig-h-c', color(bc, 'var(--color-heading)'));
        let w = b.font_weight || 'theme'; if (w === 'theme' && hf && fontWeight(s.heading_font)) w = fontWeight(s.heading_font);
        put(x.el, '--ig-h-w', w !== 'theme' ? String(w) : null); own(c, x.el, 'weight', w !== 'theme'); own(c, x.el, 'font', !!hf);
      } else if (x.type === 'subheading') {
        put(x.el, 'fn:lines', b.text || '');
        put(x.el, '--ig-p-d', px(b.size_desktop)); put(x.el, '--ig-p-m', px(b.size_mobile)); put(x.el, '--ig-p-c', color(bc, 'var(--color-text)'));
        own(c, x.el, 'font', !!bf);
      } else if (x.type === 'image') {
        const link = url(b.link_url) || igLink;
        const tile = put(x.el.querySelector('[data-ig-tile]'), 'hrefd', link);
        if (!tile) continue;
        put(tile, '@target', link ? '_blank' : null); put(tile, '@rel', link ? 'noopener' : null); put(tile, '@aria-label', link ? b.alt_text || '' : null);
        const legacy = bool(b.enable_image_url) && b.image_url ? String(b.image_url) : '';
        const src = legacy || imgSrc(b.image);
        put(tile, 'media', JSON.stringify(src ? {t: 'img', src, alt: b.alt_text || '', w: !legacy && b.image && b.image.width || 0, h: !legacy && b.image && b.image.height || 0} : {t: 'ph'}));
      } else if (x.type === 'button') btn = b;
    }
    if (btn || bool(s.show_instagram_button)) igButton(c, s, btn, igLink, bf);
    const [t, b] = margins(s, c.st.mq.matches);
    wrapper(c, {top: t, bottom: b});
  }
  const igFns = {
    lines(el, v) { el.replaceChildren(); String(v).split(/\r?\n/).forEach((line, i) => { if (i) el.append(document.createElement('br')); el.append(line); }); },
  };


  /* ---------- Social Shop Grid ---------- */
  const SSG_RATIO = {portrait: '3/4', landscape: '4/3', tall: '9/16', wide: '16/9'};
  const productUrl = p => p && typeof p === 'object' ? p.url || (p.handle ? '/products/' + p.handle : '') : typeof p === 'string' && p ? '/products/' + p : '';
  function ssgTile(c, x, s, hf, bf) {
    const {put} = c, b = x.b;
    let tile = x.el.querySelector('[data-ssg-tile]'); if (!tile) return;
    const href = productUrl(b.product) || url(b.link);
    tile = put(tile, 'hrefd', href);
    put(tile, '@aria-label', href ? String(b.headline || b.username || 'Tile') : null);
    if (!b.video) {
      const src = imgSrc(b.image);
      put(tile, 'media', JSON.stringify(src ? {t: 'img', src, alt: b.headline || (b.image && b.image.alt) || '', w: b.image && b.image.width || 0, h: b.image && b.image.height || 0, widths: [300, 600, 900]} : {t: 'ph'}));
      const img = tile.querySelector(':scope > img[data-sd-img]');
      if (img) put(img, '@sizes', '(min-width: 768px) calc(100vw / ' + num(s.columns, 4) + '), calc(100vw / ' + num(s.columns_mobile, 2) + ')');
    }
    const showHandle = bool(s.show_handle) && !blank(b.username);
    const pill = tile.querySelector('[data-ssg-handle]');
    if (pill) {
      put(pill, 'hidden', !showHandle);
      put(pill.querySelector('[data-ssg-username]'), 'text', b.username || '');
      const av = pill.querySelector('[data-ssg-avatar]');
      if (av) put(av, 'fn:avatar', JSON.stringify({src: imgSrc(b.avatar), letter: String(b.username || '@').trim().replace(/@/g, '').slice(0, 1).toUpperCase()}));
    }
    put(tile.querySelector('[data-ssg-badge-slot]'), 'fn:badge', b.platform || 'none');
    const chip = tile.querySelector('[data-ssg-product]'), showChip = bool(s.show_product) && !!b.product;
    if (chip) { put(chip, 'hidden', !showChip); own(c, chip, 'font', !!bf); }
    const head = tile.querySelector('[data-ssg-headline]');
    if (head) { put(head, 'text', b.headline || ''); put(head, 'hidden', blank(b.headline)); own(c, head, 'font', !!hf); }
    put(tile.querySelector('[data-ssg-content]'), 'hidden', blank(b.headline) && !showChip);
  }
  function shopGrid(c) {
    const {root, s, put} = c, o = custom(s), fonts = bool(s.enable_custom_fonts);
    const hf = fonts && font(s.heading_font) || '', bf = fonts && font(s.body_font) || '', hw = hf && fontWeight(s.heading_font) || '';
    put(c.q('[data-sd-width]'), '.width', s.section_width || 'container');
    put(root, '~pt-min', num(s.padding_top) < 30); put(root, '~pb-min', num(s.padding_bottom) < 30); put(root, '~remove_spacing', bool(s.reset_spacing)); put(root, '~overflow-hidden', bool(s.reveal));
    put(root, '--section-pt', String(num(s.padding_top))); put(root, '--section-pb', String(num(s.padding_bottom)));
    put(root, '--ssg-cols', String(num(s.columns, 4))); put(root, '--ssg-cols-mb', String(num(s.columns_mobile, 2))); put(root, '--ssg-gap', px(s.column_gap, 8));
    put(root, '--ssg-radius', px(s.tile_radius)); put(root, '--ssg-overlay', String(num(s.overlay_strength)));
    put(root, '--ssg-accent', pick(o, s.accent_color, 'var(--color-primary)')); put(root, '--ssg-heading-c', pick(o, s.custom_heading_color, 'var(--color-heading)')); put(root, '--ssg-text-c', pick(o, s.custom_text_color, '#fff'));
    put(root, '--ssg-ratio', SSG_RATIO[s.image_ratio] || '1/1');
    const bg = o ? color(s.custom_section_bg, '') : '';
    put(root, '--ssg-bg', bg || null); put(root, '@data-ssg-bg', !!bg);
    put(root, '--ssg-hf', hf || null); put(root, '--ssg-hw', hw || null); put(root, '--ssg-bf', bf || null);
    put(root, '@data-ssg-mode', s.display_mode || 'grid'); put(root, '@data-ssg-hover', s.hover_style || 'fade');
    const head = c.q('[data-ssg-header]');
    if (head) put(head, '.align', 'text-' + (s.header_alignment || 'center'));
    let any = false;
    for (const el of c.all('[data-ssg-legacy]')) {
      any = true;
      const k = el.dataset.ssgLegacy;
      if (k === 'heading') { own(c, el, 'font', !!hf); own(c, el, 'weight', !!hw); put(el, '@data-ssg-hw', !!hw); }
      else own(c, el, 'font', !!bf);
    }
    for (const x of c.blocks) {
      const b = x.b;
      if (x.type === 'tile') { ssgTile(c, x, s, hf, bf); continue; }
      const col = custom(b) ? color(b.color, '') : '';
      put(x.el, '--ssg-c', col || null); put(x.el, '@data-ssg-c', !!col);
      if (x.type === 'eyebrow') { put(x.el, 'text', b.text || ''); put(x.el, 'hidden', blank(b.text)); own(c, x.el, 'font', !!bf); any = any || !blank(b.text); }
      else if (x.type === 'heading') { put(x.el, 'inline', b.text || ''); put(x.el, 'hidden', blank(b.text)); own(c, x.el, 'font', !!hf); own(c, x.el, 'weight', !!hw); put(x.el, '@data-ssg-hw', !!hw); any = true; }
      else if (x.type === 'subheading') { put(x.el, 'rich', b.text || ''); put(x.el, 'hidden', blank(b.text)); own(c, x.el, 'font', !!bf); any = true; }
      else if (x.type === 'button') {
        const link = url(b.link), el = put(x.el, 'hrefa', link);
        put(el, '@target', link ? '_blank' : null); put(el, '@rel', link ? 'noopener' : null);
        put(el.querySelector('strong'), 'text', b.label || ''); put(el, 'hidden', blank(b.label)); own(c, el, 'font', !!bf); any = true;
      }
    }
    if (head) put(head, 'hidden', !any);
    /* carousel: the theme's slider reads its data-* once, so a change builds it again */
    const sl = c.q('slide-section');
    if (sl) {
      const cols = num(s.columns, 4);
      put(sl, '@data-spacing', String(num(s.column_gap, 8))); put(sl, '@data-mobile', String(num(s.columns_mobile, 2))); put(sl, '@data-desktop', String(cols)); put(sl, '@data-tablet', String(cols > 3 ? 3 : cols));
      put(sl, '@data-pagination-style', s.pagination_style || 'pill');
      put(sl, '~reveal_on_scroll', bool(s.reveal));
      put(sl.querySelector('[data-ssg-arrows]'), 'hidden', !bool(s.show_arrow));
      const pg = sl.querySelector('[data-ssg-pagination]');
      if (pg) { put(pg, 'hidden', s.carousel_pagination !== 'show_dots'); put(pg, '.pos', 'justify-content-' + (s.pagination_position || 'center')); }
    }
    const [t, b] = margins(s, c.st.mq.matches);
    wrapper(c, {top: t, bottom: b});
  }
  const ssgFns = {
    avatar(el, v, prev, st) {
      const d = parse(v);
      if (d.src) { if (el.tagName === 'IMG') { if (el.getAttribute('src') !== d.src) el.src = d.src; return el; } const n = document.createElement('img'); n.src = d.src; n.alt = ''; n.width = 18; n.height = 18; n.loading = 'lazy'; n.setAttribute('data-ssg-avatar', ''); el.replaceWith(n); st.last.set(n, st.last.get(el)); return n; }
      if (el.tagName === 'IMG') { const n = document.createElement('span'); n.className = 'ssg-avatar'; n.setAttribute('aria-hidden', 'true'); n.setAttribute('data-ssg-avatar', ''); el.replaceWith(n); st.last.set(n, st.last.get(el)); el = n; }
      el.textContent = d.letter || '';
      return el;
    },
    badge(el, v, prev, st) {
      const t = st.root.parentElement && st.root.parentElement.querySelector('template[data-ssg-badges]');
      const src = t && t.content.querySelector('[data-ssg-badge="' + CSS.escape(v) + '"]');
      el.replaceChildren(...(src ? [src.cloneNode(true)] : []));
      el.dataset.ssgBadgeSlot = v;
    },
  };
  /* tile videos play while on screen, never under reduced motion */
  function ssgInit(root, st) {
    const vids = () => [...root.querySelectorAll('video[data-ssg-video]')];
    const sync = () => { for (const v of vids()) { const go = !reduced.matches && v.__sdOn && !document.hidden; if (go && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else if (!go && !v.paused) v.pause(); } };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { for (const e of es) e.target.__sdOn = e.isIntersecting; sync(); }, {threshold: 0.15});
      for (const v of vids()) io.observe(v);
      st.off.push(() => io.disconnect());
    }
    reduced.addEventListener('change', sync); document.addEventListener('visibilitychange', sync);
    st.off.push(() => { reduced.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); for (const v of vids()) v.pause(); });
    st.videos = sync;
    /* a slider built by the theme is built again when one of its data-* values changes */
    const sl = root.querySelector('slide-section');
    if (sl && 'MutationObserver' in window) {
      const mo = new MutationObserver(() => { if (typeof sl.initSlide === 'function' && sl.globalSlide) { try { sl.globalSlide.destroy(true, true); } catch (_) {} sl.globalSlide = null; sl.initSlide(); } });
      mo.observe(sl, {attributes: true, attributeFilter: ['data-spacing', 'data-mobile', 'data-desktop', 'data-tablet', 'data-pagination-style']});
      st.off.push(() => mo.disconnect());
    }
  }

  /* ---------- section types ---------- */
  const TYPES = {
    divider: {derive: divider, fns: dividerFns, bp: 768},
    divider3: {derive: divider3, fns: d3Fns, bp: 768},
    'waves-divider': {derive: waves, bp: 768},
    'social-icons-pro2': {derive: socialIcons, bp: 768},
    'instagram-promo': {derive: instagram, fns: igFns, bp: 768},
    'social-shop-grid': {derive: shopGrid, fns: ssgFns, init: ssgInit, bp: 768},
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
    const mine = el => el.closest(SEL) === root;
    const blocks = [...root.querySelectorAll(BSEL)].filter(mine).map(el => {
      const id = el.dataset.sdBlock;
      if (st.rawBlocks.get(id) !== el.dataset.sdSettings) { st.rawBlocks.set(id, el.dataset.sdSettings); st.blocks.set(id, {...parse(el.dataset.sdSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.sdType, b: st.blocks.get(id) || {}};
    });
    const c = {root, st, s: st.s, put, record, blocks, q: sel => [...root.querySelectorAll(sel)].find(mine) || null, all: sel => [...root.querySelectorAll(sel)].filter(mine)};
    const sc = schemeOf(st.s); if (sc) put(c.q('[data-sd-scheme]') || root, 'scheme', sc);
    type.derive(c);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.sdSettings) { st.raw = root.dataset.sdSettings; st.s = {...parse(st.raw), ...st.live}; }
    /* the settings are printed in the builder only (request.design_mode): without them nothing is painted here and the builder's redraw shows each change */
    if (root.hasAttribute('data-sd-settings')) derive(root, st, false);
    if (st.type.after) st.type.after(root, st);
  }
  function drop(root, st) {
    st.mq.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame);
    for (const f of st.off) f();
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.sdRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const st = {root, type, id: root.dataset.sdSection, live: {}, liveBlocks: new Map(), s: parse(root.dataset.sdSettings), raw: root.dataset.sdSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), off: [], mq: matchMedia('(min-width: ' + (type.bp || 768) + 'px)')};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule);
    roots.set(root, st);
    if (root.hasAttribute('data-sd-settings')) derive(root, st, true);
    if (type.init) type.init(root, st);
    root.dataset.sdReady = '';
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
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',' + BSEL) || n.querySelector(SEL + ',' + BSEL));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',' + BSEL) : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-sd-settings']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '!' && key[1] === '-') { have = el.style.getPropertyValue(key.slice(1)).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key[0] === '~') { have = el.classList.contains(key.slice(1)); want = !!v; }
      else if (key[0] === '.') { have = String(v || '').split(' ').filter(Boolean).every(x => el.classList.contains(x)); want = true; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'text') { have = el.textContent; want = v == null ? '' : String(v); }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else continue;
      if (have !== want) bad.push((el.dataset && el.dataset.sdBlock || (typeof el.className === 'string' ? el.className : '') || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaSocialDividers = {scan, audit, roots};
  scan();
})();