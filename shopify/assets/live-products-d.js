/* Materia Themes. Live editor updates and runtimes for the products-d Products
   sections: Quick Add to Cart (data-pd-root="atc"), Discount Price ("price"),
   Products set ("set") and Product Shop The Look ("look").
   One controller per section root, frame-batched, scoped to its own section:
   storelib:settings-change applies section and block settings to that root
   only, storelib:section-load / shopify:section:load and a MutationObserver
   pick up redrawn and added roots and blocks, disconnected roots are cleaned
   up. Each paint sets a value only when it differs, so pictures, running
   carousels and forms are kept. */
(() => {
  if (window.MateriaProductsD) return;
  const roots = new Map(), PAINT = {}, SETUP = {};
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const DESK = '(min-width: 768px)';
  /* A colour setting's value, or null when it is empty or transparent. */
  const col = v => api() ? api().color(v, null) : (typeof v === 'string' && v ? v : null);
  const fontCss = (v, fallback) => { const fam = api() && api().font(v); return fam && !/^var\(/.test(fam) ? fam + ', ' + ((v && typeof v === 'object' && v.fallback_families) || 'sans-serif') : fallback; };
  const setVar = (el, k, v) => { if (!el) return; if (v == null || v === '') { if (el.style.getPropertyValue(k) !== '') el.style.removeProperty(k); } else if (el.style.getPropertyValue(k) !== String(v)) el.style.setProperty(k, String(v)); };
  const setImp = (el, k, v) => { if (el && (el.style.getPropertyValue(k) !== String(v) || el.style.getPropertyPriority(k) !== 'important')) el.style.setProperty(k, String(v), 'important'); };
  const vars = (el, map) => { for (const [k, v] of Object.entries(map)) setVar(el, k, v); };
  const attr = (el, k, v) => { if (!el) return; if (v == null || v === false) { if (el.hasAttribute(k)) el.removeAttribute(k); } else if (el.getAttribute(k) !== String(v)) el.setAttribute(k, String(v)); };
  const text = (el, v) => { if (el && el.textContent !== String(v)) el.textContent = String(v); };
  const hide = (el, h) => { if (el && el.hidden !== !!h) el.hidden = !!h; };
  const rich = (el, v, st) => { if (api()) api().rich(el, v, st); };
  const href = v => (api() ? api().url(v) : v) || '';

  function scheme(root, s) {
    const id = s.color_scheme && typeof s.color_scheme === 'object' ? s.color_scheme.id : s.color_scheme;
    if (typeof id !== 'string' || !/^[\w-]+$/.test(id)) return;
    for (const c of [...root.classList]) if (c.startsWith('color-') && c !== 'color-' + id) root.classList.remove(c);
    if (!root.classList.contains('color-' + id)) root.classList.add('color-' + id);
  }
  /* Section margins on the wrapper, like the section's own <style>. */
  function margins(root, s, st) {
    const wrap = root.closest('.shopify-section'); if (!wrap) return;
    const d = st.mq.matches;
    for (const side of ['top', 'bottom']) setImp(wrap, 'margin-' + side, bool(s.reset_spacing) ? '0px' : px(s['section_margin_' + side + '_' + (d ? 'desktop' : 'mobile')]));
  }
  function widthVars(s) {
    return {
      '--pd-maxw': {container: 'calc(var(--page-width, 1300px) + 3rem)', fluid_container: 'calc(var(--fluid-container-width, 1500px) + 3rem)'}[s.section_width] || 'none',
      '--pd-px': s.section_width === 'full_width' ? '0px' : '1.5rem',
    };
  }
  function fontVars(s) {
    const on = bool(s.enable_custom_fonts);
    return {'--pd-hf': on ? fontCss(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)', '--pd-bf': on ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)'};
  }
  /* snippets/button-overrides: only what the creator set. */
  function buttonOverrides(o) {
    const out = {'--mb-bg': null, '--mb-text': null, '--mb-border': null, '--mb-hover-bg': null, '--mb-hover-text': null, '--mb-hover-border': null};
    const bg = col(o.bg), tx = col(o.text), br = col(o.border), hb = col(o.hover_bg), ht = col(o.hover_text), hbr = col(o.hover_border);
    if (bg) out['--mb-bg'] = bg; if (tx) out['--mb-text'] = tx;
    if (br) out['--mb-border'] = br; else if (bg) out['--mb-border'] = bg;
    if (hb) out['--mb-hover-bg'] = hb; if (ht) out['--mb-hover-text'] = ht;
    if (hbr) out['--mb-hover-border'] = hbr; else if (hb) out['--mb-hover-border'] = hb;
    return out;
  }
  /* Heading / text blocks shared by the sections: text, custom colour and size. */
  function textBlock(el, b, st, kind) {
    rich(el, b.text, st); hide(el, !b.text);
    setVar(el, '--pd-c', bool(b.enable_custom_style) ? col(b.color) : null);
    const size = bool(b.size_enable);
    if (kind === 'heading') { setVar(el, '--pd-fs-d', size ? px(b.size_desktop) : null); setVar(el, '--pd-fs-m', size ? px(b.size_mobile) : null); }
    else setVar(el, '--pd-fs', size ? px(b.size) : null);
  }

  /* ---------- Quick Add to Cart ---------- */
  const GRAD = {
    radial: (a, b, c) => `radial-gradient(circle, ${a}, ${b}, ${c})`, angular: (a, b, c) => `conic-gradient(${a}, ${b}, ${c})`,
    diagonal: (a, b, c) => `linear-gradient(45deg, ${a}, ${b}, ${c})`, vertical: (a, b, c) => `linear-gradient(180deg, ${a}, ${b}, ${c})`,
    horizontal: (a, b, c) => `linear-gradient(270deg, ${a}, ${b}, ${c})`, cool: (a, b, c) => `linear-gradient(135deg, ${a}, ${b}, ${c})`,
    warm: (a, b, c) => `linear-gradient(45deg, ${c}, ${b}, ${a})`, pastel: (a, b, c) => `linear-gradient(60deg, ${a} 0%, ${b} 70%, ${c} 100%)`,
  };
  function atcLabel(buy, root) {
    const btn = buy.querySelector('.pd-atc__button'), label = buy.querySelector('.pd-atc__label');
    if (btn && label) text(label, btn.dataset.available === 'false' ? root.dataset.pdSoldOut || 'Sold out' : buy.dataset.label || '');
  }
  PAINT.atc = (root, st) => {
    const s = st.s, custom = bool(s.enable_custom_style), grad = custom && bool(s.enable_gradient);
    scheme(root, s); margins(root, s, st);
    const map = {'--pd-pt': px(s.padding_top), '--pd-pb': px(s.padding_bottom), '--pd-gap': px(s.content_gap), '--pd-flex': {left: 'flex-start', right: 'flex-end'}[s.alignment] || 'center', '--pd-ta': s.alignment || 'center', ...widthVars(s), ...fontVars(s)};
    Object.assign(map, buttonOverrides(custom ? (grad ? {text: s.button_text_color, border: s.button_border_color} : {bg: s.button_bg_color, text: s.button_text_color, border: s.button_border_color, hover_bg: s.button_hover_color}) : {}));
    if (grad) { const g = (GRAD[s.gradient_selector] || ((a, b, c) => `linear-gradient(90deg, ${a}, ${b}, ${c})`))(col(s.gradient_color_1) || 'var(--btn-primary-bg-color)', col(s.gradient_color_2) || 'var(--btn-primary-hover-bg-color)', col(s.gradient_color_3) || 'var(--color-primary)'); map['--mb-bg'] = g; map['--mb-hover-bg'] = g; }
    const shape = s.use_theme_button === false || s.use_theme_button === 'false';
    Object.assign(map, {'--mb-radius': shape ? px(s.button_border_radius) : null, '--mb-padding-y': shape ? '15px' : null, '--mb-padding-x': shape ? '25px' : null, '--mb-font-size': shape ? px(s.button_font_size) : null, '--mb-weight': shape ? ({light: 300, bold: 700}[s.button_font_weight] || 400) : null, '--btn-border-width': shape ? px(s.button_border_thickness) : null, '--pd-btn-scale': shape ? String(num(s.button_overall_size, 100) / 100) : null});
    vars(root, map); attr(root, 'data-gradient', grad ? 'true' : 'false');
    for (const el of root.querySelectorAll('[data-pd-block]')) {
      const b = st.block(el);
      if (el.dataset.pdType === 'heading' || el.dataset.pdType === 'subheading') textBlock(el, b, st, el.dataset.pdType);
      else if (el.dataset.pdType === 'button') { el.dataset.label = b.text || s.button_text || ''; atcLabel(el, root); }
    }
    const legacy = root.querySelector('[data-pd-legacy]'); if (legacy) { legacy.dataset.label = s.button_text || ''; atcLabel(legacy, root); }
  };
  /* The variant picker: the form posts the selected variant; a sold out one disables the button. */
  document.addEventListener('change', e => {
    const sel = e.target.closest && e.target.closest('[data-pd-variant]'); if (!sel) return;
    const form = sel.form, btn = form && form.querySelector('.pd-atc__button'), opt = sel.selectedOptions[0], root = sel.closest('[data-pd-root]');
    if (!btn || !opt) return;
    const ok = opt.dataset.available !== 'false';
    btn.dataset.available = String(ok); btn.disabled = !ok; attr(btn, 'aria-disabled', ok ? null : 'true');
    const buy = sel.closest('.pd-atc__buy'); if (buy && root) atcLabel(buy, root);
  });

  /* ---------- Discount Price ---------- */
  PAINT.price = (root, st) => {
    const s = st.s, custom = bool(s.enable_custom_style), c = (v, f) => (custom && col(v)) || f;
    scheme(root, s); margins(root, s, st);
    const pf = bool(s.enable_custom_fonts) ? fontCss(s.price_font, 'var(--body-font)') : 'var(--body-font)';
    vars(root, {
      ...widthVars(s), '--pd-f': pf,
      '--pd-bg': c(s.background_color, 'var(--color-background)'), '--pd-oc': c(s.original_price_color, 'var(--color-text)'), '--pd-lc': c(s.original_price_line_color, 'var(--color-primary)'),
      '--pd-dc': c(s.discounted_price_color, 'var(--color-heading)'), '--pd-cc': c(s.currency_color, 'var(--color-heading)'),
      '--pd-lw': px(s.original_price_line_weight), '--pd-ll': num(s.original_price_line_length) + '%', '--pd-lo': px(s.original_price_line_vertical_offset), '--pd-dy': px(s.discounted_price_vertical_position),
      '--pd-ow': s.original_price_font_weight, '--pd-dw': s.discounted_price_font_weight,
      '--pd-os-d': num(s.original_price_size_desktop) + 'rem', '--pd-ds-d': num(s.discounted_price_size_desktop) + 'rem', '--pd-os-m': num(s.original_price_size_mobile) + 'rem', '--pd-ds-m': num(s.discounted_price_size_mobile) + 'rem',
      '--pd-h-d': px(s.section_height), '--pd-h-m': px(s.section_height_mobile), '--pd-sc-d': String(num(s.overall_size_desktop, 100) / 100), '--pd-sc-m': String(num(s.overall_size_mobile, 100) / 100),
      '--pd-pv-d': px(s.desktop_padding), '--pd-pl-d': px(s.left_padding_desktop), '--pd-pr-d': px(s.right_padding_desktop), '--pd-pv-m': px(s.mobile_padding), '--pd-pl-m': px(s.left_padding_mobile), '--pd-pr-m': px(s.right_padding_mobile),
    });
    attr(root, 'data-show-on', s.display_on_devices || 'all_devices');
    hide(root.querySelector('.pd-price__currency'), !bool(s.show_currency_symbol));
    if (root.dataset.mode === 'legacy') {
      rich(root.querySelector('[data-pd-original]'), s.original_price, st); rich(root.querySelector('[data-pd-sale]'), s.discounted_price, st);
      hide(root.querySelector('.pd-price__original'), !s.original_price);
      const cur = root.querySelector('.pd-price__currency'); if (cur && s.currency) text(cur, s.currency);
    }
  };

  /* ---------- Products set ---------- */
  let timers = 0;
  PAINT.set = (root, st) => {
    const s = st.s, per = v => num(v, 1);
    scheme(root, s);
    vars(root, {'--pd-pt': px(s.padding_top), '--pd-pb': px(s.padding_bottom), '--pd-n-d': String(per(s.items_per_row)), '--pd-n-m': String(per(s.items_per_row_mobile)), '--pd-gap-d': px(s.column_gap), '--pd-gap-m': px(Math.min(num(s.column_gap), 15)),
      '--pd-hs': {small: '1.8rem', large: '3rem'}[s.header_size] || '2rem', ...widthVars(s), ...fontVars(s)});
    attr(root, 'data-align', s.header_alignment || 'left'); attr(root, 'data-pager', s.carousel_pagination || 'disable'); attr(root, 'data-pager-pos', s.pagination_position || 'right');
    attr(root, 'data-arrows', String(bool(s.show_arrow))); attr(root, 'data-loop', String(bool(s.infinite))); attr(root, 'data-autoplay', String(bool(s.autoplay))); attr(root, 'data-speed', String(num(s.autorotate_speed, 5)));
    attr(root.querySelector('.pd-set__pager'), 'data-style', s.pagination_style || 'pill');
    const n = st.slides ? st.slides().length : 0;
    attr(root, 'data-fit-d', String(n <= per(s.items_per_row))); attr(root, 'data-fit-m', String(n <= per(s.items_per_row_mobile)));
    for (const el of root.querySelectorAll('.pd-set__text [data-pd-block]')) textBlock(el, st.block(el), st, el.dataset.pdType);
    const lh = root.querySelector('[data-pd-legacy="heading"]'); if (lh) text(lh, s.heading || '');
    const ld = root.querySelector('[data-pd-legacy="description"]'); if (ld) rich(ld, s.description, st);
    const hb = root.querySelector('.pd-set__text [data-pd-type="heading"]');
    attr(root.querySelector('.pd-set__track'), 'aria-label', (hb ? hb.textContent : s.heading || '').trim());
    if (st.sync) st.sync();
  };
  SETUP.set = (root, st) => {
    const track = root.querySelector('.pd-set__track'); if (!track) return;
    const slides = () => [...track.children].filter(el => el.classList.contains('pd-set__slide'));
    const fit = () => root.dataset[st.mq.matches ? 'fitD' : 'fitM'] === 'true';
    const max = () => track.scrollWidth - track.clientWidth;
    const atEnd = () => !fit() && track.scrollLeft >= max() - 2, atStart = () => track.scrollLeft <= 2;
    const index = () => { const sl = slides(); if (!sl.length) return 0; if (atEnd()) return sl.length - 1; const x = track.scrollLeft, o = sl[0].offsetLeft; let best = 0, bd = Infinity; sl.forEach((el, i) => { const d = Math.abs(el.offsetLeft - o - x); if (d < bd) { bd = d; best = i; } }); return best; };
    const go = i => { const sl = slides(); if (!sl.length) return; const n = sl.length; i = root.dataset.loop === 'true' ? (i + n) % n : Math.max(0, Math.min(n - 1, i)); track.scrollTo({left: Math.min(max(), sl[i].offsetLeft - sl[0].offsetLeft), behavior: st.reduced.matches ? 'auto' : 'smooth'}); };
    const step = dir => { const loop = root.dataset.loop === 'true', n = slides().length; if (dir > 0 && atEnd()) { if (loop) go(0); return; } if (dir < 0 && atStart()) { if (loop) go(n - 1); return; } go(index() + dir); };
    const update = () => {
      const sl = slides(), i = index(), loop = root.dataset.loop === 'true';
      root.querySelectorAll('.pd-set__dot').forEach((d, k) => attr(d, 'aria-current', k === i ? 'true' : null));
      text(root.querySelector('[data-pd-current]'), i + 1);
      setVar(root.querySelector('.pd-set__bar > span'), '--pd-progress', (sl.length ? Math.round((i + 1) / sl.length * 100) : 0) + '%');
      const prev = root.querySelector('.pd-set__arrow--prev'), next = root.querySelector('.pd-set__arrow--next');
      if (prev && prev.disabled !== (!loop && atStart())) prev.disabled = !loop && atStart();
      if (next && next.disabled !== (!loop && atEnd())) next.disabled = !loop && atEnd();
    };
    let frame = 0, timer = 0, visible = false, paused = false, drag = null, moved = false;
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); }); };
    const stop = () => { if (timer) { clearTimeout(timer); timer = 0; timers--; } };
    const run = () => {
      stop();
      if (root.dataset.autoplay !== 'true' || st.reduced.matches || !visible || paused || document.hidden || fit() || slides().length < 2) return;
      timers++; timer = setTimeout(() => { timer = 0; timers--; if (atEnd()) go(0); else go(index() + 1); run(); }, num(root.dataset.speed, 5) * 1000);
    };
    st.slides = slides; st.step = step; st.go = go;
    st.sync = () => { update(); if (!!timer !== (root.dataset.autoplay === 'true' && !st.reduced.matches && visible && !paused && !document.hidden && !fit() && slides().length > 1) || st.speed !== root.dataset.speed) { st.speed = root.dataset.speed; run(); } };
    root.addEventListener('click', e => {
      const a = e.target.closest('.pd-set__arrow, .pd-set__dot');
      if (moved && track.contains(e.target)) { e.preventDefault(); e.stopPropagation(); moved = false; return; }
      if (!a || !root.contains(a)) return;
      if (a.classList.contains('pd-set__dot')) go(num(a.dataset.index)); else step(num(a.dataset.dir, 1));
    }, true);
    track.addEventListener('scroll', onScroll, {passive: true});
    track.addEventListener('keydown', e => { if (e.target !== track) return; if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); } });
    /* Mouse drag; touch and trackpads scroll natively. */
    track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag = {x: e.clientX, left: track.scrollLeft}; moved = false; });
    track.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (!moved && Math.abs(dx) > 5) { moved = true; track.style.scrollSnapType = 'none'; track.style.scrollBehavior = 'auto'; } if (moved) track.scrollLeft = drag.left - dx; });
    const end = () => { if (!drag) return; drag = null; if (moved) { track.style.removeProperty('scroll-snap-type'); track.style.removeProperty('scroll-behavior'); go(index()); setTimeout(() => { moved = false; }, 0); } };
    track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end); track.addEventListener('pointerleave', end);
    track.addEventListener('dragstart', e => e.preventDefault());
    const pause = v => () => { paused = v; run(); };
    root.addEventListener('pointerenter', pause(true)); root.addEventListener('pointerleave', pause(false));
    root.addEventListener('focusin', pause(true)); root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget)) pause(false)(); });
    const io = new IntersectionObserver(es => { visible = es.some(x => x.isIntersecting); run(); });
    io.observe(root);
    const vis = () => run(); document.addEventListener('visibilitychange', vis);
    st.cleanup.push(() => { stop(); io.disconnect(); document.removeEventListener('visibilitychange', vis); cancelAnimationFrame(frame); });
  };

  /* ---------- Product Shop The Look ---------- */
  const LOOK_COLORS = {section_bg: '--pd-bg', image_bg: '--pd-img-bg', card_bg: '--pd-cbg', card_border: '--pd-cb', card_border_hover: '--pd-cbh', card_image_bg: '--pd-cibg', card_title_color: '--pd-ctc', vendor_color: '--pd-vc', price_color: '--pd-pc', price_compare_color: '--pd-pcc', cta_bg: '--pd-ctabg', cta_color: '--pd-ctac', cta_bg_hover: '--pd-ctabgh'};
  PAINT.look = (root, st) => {
    const s = st.s, custom = bool(s.enable_custom_style);
    scheme(root, s);
    const map = {
      '--pd-pt': px(s.padding_top), '--pd-pb': px(s.padding_bottom), '--pd-sp-d': px(s.side_padding_desktop), '--pd-sp-m': px(s.side_padding_mobile), '--pd-xp': s.section_width === 'stretch_width' ? '1.5rem' : '0px',
      '--pd-maxw': {container: 'var(--page-width, 1300px)', fluid_container: 'var(--fluid-container-width, 1500px)'}[s.section_width] || 'none',
      '--pd-dir': s.image_position === 'right' ? 'row-reverse' : 'row', '--pd-valign': s.column_valign || 'flex-start', '--pd-iw': num(s.image_width_pct, 50) + '%', '--pd-gap-d': px(s.gap_desktop), '--pd-gap-m': px(s.gap_mobile), '--pd-tgap': px(s.text_gap),
      '--pd-ar-m': s.image_aspect || '4 / 5', '--pd-ar-d': s.image_aspect_desktop || 'auto', '--pd-ih': px(s.image_min_height, 520), '--pd-ir': px(s.image_radius),
      '--pd-cis': px(s.card_image_size), '--pd-cir': px(s.card_image_radius), '--pd-cr': px(s.card_radius), '--pd-cp': px(s.card_padding), '--pd-cg': px(s.card_gap), '--pd-cts': px(s.card_title_size), '--pd-vs': px(s.vendor_size), '--pd-ps': px(s.price_size), '--pd-pg': px(s.product_gap), '--pd-pmt': px(s.products_margin_top),
      ...fontVars(s),
    };
    for (const [id, k] of Object.entries(LOOK_COLORS)) map[k] = custom ? col(s[id]) : null;
    vars(root, map);
    attr(root, 'data-aspect-d', (s.image_aspect_desktop || 'auto') === 'auto' ? 'auto' : 'ratio');
    /* The lifestyle picture: swap only when the address changes. */
    const media = root.querySelector('.pstl__media'), src = api() && api().url(s.image, true);
    if (media && src) {
      let img = media.querySelector('img');
      if (!img) { img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async'; media.replaceChildren(img); }
      if ((img.getAttribute('src') || '').split('?')[0] !== src.split('?')[0]) { img.removeAttribute('srcset'); img.src = src; }
      const alt = s.image && typeof s.image === 'object' ? s.image.alt || '' : img.alt; if (img.alt !== alt) img.alt = alt;
    }
    for (const el of root.querySelectorAll('.pstl__card')) {
      hide(el.querySelector('.pstl__card-price'), !bool(s.show_price));
      const v = el.querySelector('.pstl__card-vendor'); if (v && !el.classList.contains('pstl__card--empty')) hide(v, !bool(s.show_vendor) || !v.textContent.trim());
    }
    for (const el of root.querySelectorAll('.pstl__col > [data-pd-block]')) {
      const b = st.block(el), t = el.dataset.pdType, c = bool(b.enable_custom_style) ? col(b.color) : null;
      rich(el, b.text, st); hide(el, !b.text); setVar(el, '--pd-c', c);
      if (t === 'eyebrow') { setVar(el, '--pd-fs', px(b.size, 12)); setVar(el, '--pd-ls', num(b.letter_spacing) + 'em'); }
      else if (t === 'heading') { setVar(el, '--pd-fs-m', px(b.size_mobile, 28)); setVar(el, '--pd-fs-d', px(b.size_desktop, 40)); }
      else if (t === 'subheading') { setVar(el, '--pd-fs', px(b.size, 15)); setVar(el, '--pd-mw', px(b.max_width, 560)); }
    }
  };

  /* ---------- core ---------- */
  function setup(root) {
    const st = {s: {...parse(root.dataset.pdDefaults), ...parse(root.dataset.pdSettings)}, raw: root.dataset.pdSettings, blocks: new Map(), rawBlocks: new Map(), bdefaults: parse(root.dataset.pdBlockDefaults), rich: new WeakMap(), mq: matchMedia(DESK), reduced: matchMedia('(prefers-reduced-motion: reduce)'), cleanup: []};
    st.block = el => {
      const id = el.dataset.pdBlock;
      if (st.rawBlocks.get(id) !== el.dataset.pdSettings) { if (st.rawBlocks.has(id)) st.blocks.delete(id + ':live'); st.rawBlocks.set(id, el.dataset.pdSettings); st.blocks.set(id, parse(el.dataset.pdSettings)); }
      return {...(st.bdefaults[el.dataset.pdType] || {}), ...st.blocks.get(id), ...st.blocks.get(id + ':live')};
    };
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (!root.isConnected) return; if (st.raw !== root.dataset.pdSettings) { st.raw = root.dataset.pdSettings; st.s = {...parse(root.dataset.pdDefaults), ...parse(st.raw)}; } (PAINT[root.dataset.pdRoot] || (() => {}))(root, st); }); };
    st.mq.addEventListener('change', st.schedule); st.reduced.addEventListener('change', st.schedule);
    st.cleanup.push(() => { st.mq.removeEventListener('change', st.schedule); st.reduced.removeEventListener('change', st.schedule); cancelAnimationFrame(st.frame); });
    if (SETUP[root.dataset.pdRoot]) SETUP[root.dataset.pdRoot](root, st);
    roots.set(root, st);
    st.schedule();
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) { for (const f of st.cleanup) f(); roots.delete(root); }
    for (const root of document.querySelectorAll('[data-pd-root]')) { if (roots.has(root)) { const st = roots.get(root); if (st.rescan) st.rescan(); st.schedule(); } else setup(root); }
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id || v.sectionId || '' : v || '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId || d.section_id); if (!id || !d.settings) return;
    const b = d.block || d.blockId || d.block_id;
    for (const [root, st] of roots) {
      if (root.dataset.pdSection !== id) continue;
      if (b) { const key = sectionId(b) + ':live'; st.blocks.set(key, {...st.blocks.get(key), ...d.settings}); }
      else Object.assign(st.s, d.settings);
      if (st.onSettings) st.onSettings(d.settings, b ? sectionId(b) : null);
      st.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-pd-root],[data-pd-block]') || n.querySelector('[data-pd-root],[data-pd-block]'))))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-pd-settings']});
  window.MateriaProductsD = {scan, roots, PAINT, timers: () => timers};
  scan();
})();
