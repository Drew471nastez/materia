/* Materia Themes. Live editor updates for Main product (sections/main-product,
   markup in snippets/main-product-body).

   Every Main product root [data-mp-root="<section id>"] has, beside it, its
   settings as JSON (script[data-mp-settings]) and its own values as one
   <style data-mp-own> printed by the Liquid. While the creator edits, a
   storelib:settings-change for this section is merged into those settings
   and painted once per frame: the colour scheme, padding, gallery width and
   sticky gap are written on the elements that print them, and the own style
   is written again (style[data-mp-live]) from the same rules the Liquid
   uses, with the printed one switched off. Only what changed is written, so
   the gallery, its pictures and the buy buttons are never rebuilt for an
   unrelated edit. Block edits to the title and price sizes are written the
   same way. Everything else (the gallery layout, zoom, which blocks show)
   waits for the builder's redraw, after which the new root is picked up
   once: a redraw brings its own values, so what a live edit wrote goes.

   Two Main product sections on one page are independent. Nothing runs on
   the storefront beyond reading the markup once; the builder's events are
   the only writers. window.MateriaMainProduct.css(id) returns the rules for
   the current settings (used by the tests). */
(() => {
  if (window.MateriaMainProduct) return;
  const roots = new Map();
  /* Values painted here while a slider or colour moves (section, then title and price blocks). */
  const SLIDING = {
    section: new Set(['padding_top', 'padding_bottom', 'desktop_media_width', 'sticky_top_gap', 'content_gap_desktop', 'padding_left_desktop', 'padding_right_desktop',
      'padding_left_mobile', 'padding_right_mobile', 'sticky_padding_y', 'sticky_button_radius', 'title_color', 'price_color', 'text_color', 'sticky_bar_bg', 'sticky_border_color']),
    title: new Set(['title_font_size_desktop', 'title_font_size_mobile']),
    price: new Set(['price_font_size_desktop', 'price_font_size_mobile', 'compare_font_size_desktop', 'compare_font_size_mobile']),
  };
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const sectionId = v => String(v && typeof v === 'object' ? v.id || v.sectionId || '' : v || '').replace(/^shopify-section-/, '');
  const api = () => window.MateriaHeroImageOne;
  /* An empty or fully transparent colour is no colour (as snippets/scheme-color). */
  const color = v => {
    if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return ''; v = v.hex ?? v.value ?? v.color; }
    v = typeof v === 'string' ? v.trim() : '';
    if (!v || v === 'transparent' || /^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) || /^#[0-9a-f]{6}00$/i.test(v)) return '';
    return window.CSS && CSS.supports && !CSS.supports('color', v) ? '' : v;
  };
  /* A font picker value: {family, fallback_families} or a handle such as "playfair_display_n4". */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + (v.fallback_families ? ', ' + v.fallback_families : '') : '';
    if (typeof v !== 'string' || !v) return '';
    const fam = api() && api().font ? api().font(v) : v.replace(/_[nib]\d$/, '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return !fam ? '' : /^var\(|,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const schemeId = v => { const id = v && typeof v === 'object' ? v.id : v; return typeof id === 'string' && /^[\w-]+$/.test(id) ? id : ''; };

  /* The rules of <style data-mp-own> in snippets/main-product-body, from settings s. */
  function sectionCss(id, s) {
    const R = '#MainProduct-' + id, BAR = 'sticky-add-cart[data-section-id="' + id + '"]', out = [];
    const custom = bool(s.enable_custom_style), pick = k => custom ? color(s[k]) : '';
    if (bool(s.media_square)) out.push(`${R} sticky-add-cart .product-item__media--ratio { border-radius: 8px !important; }`);
    if (bool(s.enable_custom_media_gap)) { const g = num(s.content_gap_desktop) + 'px'; out.push(`@media (min-width: 1024px) { ${R} .main-product { --col-gap: ${g} !important; --col-gap-desktop: ${g} !important; gap: ${g} !important; } }`); }
    if (bool(s.enable_custom_padding)) {
      const W = `${R} > :is(.container, .fluid_container, .full_width, .stretch_width, skeleton-page)`;
      out.push(`@media (min-width: 1024px) { ${W} { padding-left: ${num(s.padding_left_desktop)}px !important; padding-right: ${num(s.padding_right_desktop)}px !important; } }`);
      out.push(`@media (max-width: 1023px) { ${W} { padding-left: ${num(s.padding_left_mobile)}px !important; padding-right: ${num(s.padding_right_mobile)}px !important; } }`);
    }
    const bg = pick('sticky_bar_bg'), border = pick('sticky_border_color');
    out.push(`${BAR} { --sticky-pad-y: ${num(s.sticky_padding_y, 12)}px;${bg ? ` background-color: ${bg} !important;` : ''}${border ? ` border-top-color: ${border} !important;` : ''} }`);
    if (s.sticky_use_theme_button === false || s.sticky_use_theme_button === 'false') out.push(`#StickyCart-${id} :is(.btn, .btn-primary, .btn-outline, button[type="submit"], .product-form__submit, button[name="add"], [data-sl-button]) { --mb-radius: ${num(s.sticky_button_radius, 8)}px; border-radius: ${num(s.sticky_button_radius, 8)}px !important; }`);
    if (!bool(s.sticky_show_quantity)) out.push(`${BAR} .product-form__quantity { display: none !important; }`);
    if (!bool(s.sticky_show_variant_picker)) out.push(`${BAR} .product-detail__variant-picker { display: none !important; }`);
    if (!bool(s.sticky_show_image)) out.push(`${BAR} .product-item__inner, ${BAR} .product-item__media { display: none !important; }`);
    if (!bool(s.sticky_show_title)) out.push(`${BAR} .product-item__information { display: none !important; }`);
    const text = pick('text_color'), title = pick('title_color'), price = pick('price_color');
    if (text) out.push(`${R} .product-detail__information { --color-text: ${text}; color: ${text}; }`);
    if (title) out.push(`${R} .product-detail__information .product-detail__title { color: ${title} !important; }`);
    if (price) out.push(`${R} .product-detail__information .product-detail__price :is(.price-regular, .price-regular *) { color: ${price} !important; }`);
    const fonts = ownFonts(s);
    if (fonts.heading || fonts.body) out.push(`${R}[data-own-font] {${fonts.heading ? ` --heading-font: ${fonts.heading};` : ''}${fonts.body ? ` --body-font: ${fonts.body}; font-family: var(--body-font);` : ''} }`);
    return out.join('\n');
  }
  const ownFonts = s => bool(s.enable_custom_fonts) ? {heading: font(s.heading_font), body: font(s.body_font)} : {heading: '', body: ''};

  /* Block sizes the builder changes while a slider moves (the title and price blocks' own rules). */
  function blockCss(id, blocks) {
    const out = [];
    for (const [, b] of blocks) {
      const s = b.s;
      if (b.type === 'title') {
        if ('title_font_size_mobile' in s) out.push(`#MainProduct-${id} .product-detail__information .product-detail__title { font-size: ${num(s.title_font_size_mobile, 20)}px !important; }`);
        if ('title_font_size_desktop' in s) out.push(`@media (min-width: 1024px) { #MainProduct-${id} .product-detail__information .product-detail__title { font-size: ${num(s.title_font_size_desktop, 24)}px !important; } }`);
      } else if (b.type === 'price') {
        const P = `#MainProduct-${id} #price-${id}`;
        const cur = `:is(.price-regular, .price-regular *, .price-item--last, .price-item:not(.compare-price):not(.price-item--compare))`;
        const was = `:is(.compare-price, .compare-price *, .price-item--compare, .price-item--compare *, s, s *, del, del *)`;
        if ('price_font_size_mobile' in s) out.push(`${P}, ${P} ${cur} { font-size: ${num(s.price_font_size_mobile, 18)}px !important; }`);
        if ('price_font_weight' in s) out.push(`${P}, ${P} ${cur} { font-weight: ${num(s.price_font_weight, 600)} !important; }`);
        if ('compare_font_size_mobile' in s) out.push(`${P} ${was} { font-size: ${num(s.compare_font_size_mobile, 14)}px !important; }`);
        if ('compare_font_weight' in s) out.push(`${P} ${was} { font-weight: ${num(s.compare_font_weight, 400)} !important; }`);
        if ('price_font_size_desktop' in s) out.push(`@media (min-width: 1024px) { ${P}, ${P} ${cur} { font-size: ${num(s.price_font_size_desktop, 20)}px !important; } }`);
        if ('compare_font_size_desktop' in s) out.push(`@media (min-width: 1024px) { ${P} ${was} { font-size: ${num(s.compare_font_size_desktop, 16)}px !important; } }`);
      }
    }
    return out.join('\n');
  }

  function set(el, prop, v) {
    if (!el) return;
    if (el.style.getPropertyValue(prop) !== v) el.style.setProperty(prop, v);
  }
  function paint(st) {
    const {root, id} = st, s = st.s;
    const wrap = root.closest('.shopify-section') || root.parentElement;
    const scheme = schemeId(s.color_scheme);
    if (scheme && !root.classList.contains('color-' + scheme)) {
      for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c);
      root.classList.add('color-' + scheme);
    }
    set(root, '--section-pt', String(num(s.padding_top)));
    set(root, '--section-pb', String(num(s.padding_bottom)));
    root.classList.toggle('pt-min', num(s.padding_top) < 30);
    root.classList.toggle('pb-min', num(s.padding_bottom) < 30);
    set(root.querySelector('.main-product'), '--col-width', num(s.desktop_media_width, 40) + '%');
    if (wrap) { set(wrap, '--mp-sticky-gap', num(s.sticky_top_gap, 24) + 'px'); touched.set(wrap, true); }
    const fonts = ownFonts(s), own = !!(fonts.heading || fonts.body);
    if (root.hasAttribute('data-own-font') !== own) root.toggleAttribute('data-own-font', own);
    /* The printed own style goes quiet; the live one holds the same rules for the current values. */
    const printed = document.querySelector('style[data-mp-own="' + CSS.escape(id) + '"]');
    if (printed && printed.media !== 'not all') printed.media = 'not all';
    let live = st.style;
    if (!live || !live.isConnected) {
      live = st.style = document.createElement('style');
      live.setAttribute('data-mp-live', id);
      (printed && printed.parentNode ? printed.parentNode : root.parentNode || document.head).insertBefore(live, printed ? printed.nextSibling : root);
    }
    const css = sectionCss(id, s) + '\n' + blockCss(id, st.blocks);
    if (live.textContent !== css) live.textContent = css;
  }

  function add(root) {
    const id = root.getAttribute('data-mp-root');
    const data = document.querySelector('script[data-mp-settings="' + CSS.escape(id) + '"]');
    const st = {root, id, s: parse(data && data.textContent), blocks: new Map(), frame: 0, style: null};
    /* A redraw brings its own values: what a live edit wrote on the section's wrapper goes. */
    const wrap = root.closest('.shopify-section') || root.parentElement;
    if (wrap && touched.get(wrap)) { wrap.style.removeProperty('--mp-sticky-gap'); touched.delete(wrap); }
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(st); }); };
    roots.set(root, st);
    root.setAttribute('data-mp-ready', '');
  }
  function drop(root, st) {
    cancelAnimationFrame(st.frame);
    if (st.style) st.style.remove();
    roots.delete(root);
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll('[data-mp-root]')) if (!roots.has(root)) add(root);
  }

  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId || d.section_id);
    if (!id || !d.settings) return;
    const bRaw = d.block || d.blockId || d.block_id, bid = bRaw ? String(bRaw.id || bRaw) : '';
    let kind = '';
    for (const [root, st] of roots) {
      if (st.id !== id || !root.isConnected) continue;
      if (bid) {
        const el = root.querySelector('[data-block-id="' + CSS.escape(bid) + '"]');
        const known = st.blocks.get(bid);
        const type = (d.block && d.block.type) || d.blockType || d.block_type || (known && known.type) || (el && el.closest('#price-' + CSS.escape(id)) ? 'price' : el && el.matches('.product-detail__title') ? 'title' : '');
        st.blocks.set(bid, {type, s: {...(known ? known.s : {}), ...d.settings}});
        kind = type;
      } else { Object.assign(st.s, d.settings); kind = 'section'; }
      st.schedule();
    }
    /* While a slider or colour moves, a value painted here needs no redraw per step; the builder draws once more on release. */
    const keys = SLIDING[kind];
    if (keys && d.live === true && Object.keys(d.settings).every(k => keys.has(k))) e.preventDefault();
  });
  /* ---------- every product information block (Main product, Featured product, theme blocks) ----------
     snippets/product-info-blocks draws each block in <div class="pib-own" data-pib-block data-pib-own>,
     display: contents. Its custom colours and fonts are painted here live, per block, into one
     style[data-pib-live] per section; the block's printed style[data-pib-style] goes quiet. A redraw
     brings new wrappers and drops what was written here. */
  const blockStates = new WeakMap();
  const OWN_KEYS = ['enable_custom_style', 'custom_style', 'own_text_color', 'own_heading_color', 'enable_custom_fonts', 'heading_font', 'body_font'];
  function blockRules(scope, s) {
    const out = [], gate = bool(s.enable_custom_style) || bool(s.custom_style);
    const text = gate ? color(s.own_text_color) : '', heading = gate ? color(s.own_heading_color) : '';
    if (text) out.push(`${scope} { --color-text: ${text}; color: ${text}; } ${scope} :where(p, li, span, div, a, label, strong, em, small, td, th, dt, dd, .rte *):not(.btn, [data-sl-button], button, [data-theme-button], :is(.btn, [data-sl-button], button, [data-theme-button], h1, h2, h3, h4, h5, h6, .heading, .heading-color) *) { color: ${text} !important; }`);
    if (heading) out.push(`${scope} { --color-heading: ${heading}; } ${scope} :is(h1, h2, h3, h4, h5, h6, .heading, .heading-color, .product-detail__title), ${scope} :is(h1, h2, h3, h4, h5, h6, .heading, .heading-color, .product-detail__title) * { color: ${heading} !important; }`);
    if (bool(s.enable_custom_fonts)) {
      const hf = font(s.heading_font), bf = font(s.body_font);
      if (hf) out.push(`${scope} { --heading-font: ${hf}; }`);
      if (bf) out.push(`${scope} { --body-font: ${bf}; --btn-font: ${bf}; --mb-font: ${bf}; font-family: var(--body-font); }`);
    }
    return out.join('\n');
  }
  function paintBlocks(sec) {
    const sid = sec.id.replace(/^shopify-section-/, '');
    let live = sec.querySelector(':scope > style[data-pib-live]');
    const css = [];
    for (const el of sec.querySelectorAll('[data-pib-block]')) {
      const st = blockStates.get(el); if (!st) continue;
      const bid = el.getAttribute('data-pib-block'), s = st.s;
      const fonts = bool(s.enable_custom_fonts);
      for (const a of ['data-own-font', 'data-own-weight', 'data-own-size']) if (el.hasAttribute(a) !== fonts) el.toggleAttribute(a, fonts);
      for (const printed of sec.querySelectorAll('style[data-pib-style="' + CSS.escape(bid) + '"]')) if (printed.media !== 'not all') printed.media = 'not all';
      css.push(blockRules('#shopify-section-' + CSS.escape(sid) + ' [data-pib-block="' + CSS.escape(bid) + '"]', s));
    }
    const text = css.filter(Boolean).join('\n');
    if (!live) { live = document.createElement('style'); live.setAttribute('data-pib-live', sid); sec.prepend(live); }
    if (live.textContent !== text) live.textContent = text;
  }
  const pendingSections = new Set();
  let blockFrame = 0;
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId || d.section_id);
    const bRaw = d.block || d.blockId || d.block_id, bid = bRaw ? String(bRaw.id || bRaw) : '';
    if (!id || !bid || !d.settings) return;
    const sec = document.getElementById('shopify-section-' + id);
    const el = sec && sec.querySelector('[data-pib-block="' + CSS.escape(bid) + '"]');
    if (!el || !Object.keys(d.settings).some(k => OWN_KEYS.includes(k))) return;
    let st = blockStates.get(el);
    if (!st) { st = {s: parse(el.getAttribute('data-pib-own'))}; blockStates.set(el, st); }
    Object.assign(st.s, d.settings);
    pendingSections.add(sec);
    if (!blockFrame) blockFrame = requestAnimationFrame(() => { blockFrame = 0; for (const x of pendingSections) if (x.isConnected) paintBlocks(x); pendingSections.clear(); });
    if (d.live === true && Object.keys(d.settings).every(k => k === 'own_text_color' || k === 'own_heading_color')) e.preventDefault();
  });
  /* A redraw brings its own values: the live block rules of that section go. */
  const clearBlocks = e => { const sec = e.target && e.target.closest && e.target.closest('.shopify-section'); const live = sec && sec.querySelector(':scope > style[data-pib-live]'); if (live && !sec.querySelector('style[data-pib-style][media="not all"]')) live.textContent = ''; };
  document.addEventListener('storelib:section-load', clearBlocks);
  document.addEventListener('shopify:section:load', clearBlocks);

  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches('[data-mp-root]') || n.querySelector('[data-mp-root]'));
  new MutationObserver(records => {
    if (records.some(r => [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true});
  window.MateriaMainProduct = {scan, roots, css: id => { for (const st of roots.values()) if (st.id === id) return sectionCss(id, st.s) + '\n' + blockCss(id, st.blocks); return ''; }};
  scan();
})();
