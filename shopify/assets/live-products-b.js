/* Materia Themes. Live editor updates and runtimes for the products-b Products
   sections: Products Listing, Products carousel, Product Showcase and Product
   Spotlight Hero.

   Every root [data-pb-root] carries its settings, defaults and block defaults
   as JSON; every block carries its own. derive() turns settings into outputs
   (a CSS variable, an attribute, text, a class) per element. The Liquid
   prints the same outputs, so on load the first derive is only recorded,
   never painted. After that an output is written only when its value
   changes, one frame per root, so a picture never reloads, a carousel is
   never rebuilt and a slide never restarts for an unrelated edit. Settings
   that change the cards or the carousel's build (collection, products per
   row, autoplay...) wait for the builder's redraw. audit() compares the
   derived outputs with the markup (used by the tests).

   The Product Showcase slider lives here too (an inline script is not sure
   to run in the builder canvas): arrows, keyboard, swipe, autoplay that
   stops off screen, in a hidden tab and under reduced motion. */
(() => {
  if (window.MateriaProductsB) return;
  const SEL = '[data-pb-root]', BSEL = '[data-pb-block]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = v => num(v) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image = false) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };
  const fontCss = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : null;
    const fam = api() && api().font ? api().font(v) : '';
    return !fam || /^var\(/.test(fam) ? null : /,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const scrub = html => String(html || '').replace(/<[^>]*>/g, '');

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = scrub(value);
  }
  function link(el, href, st, plain = 'BUTTON') {
    const tag = href ? 'A' : plain;
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      st.last.set(next, st.last.get(el) || new Map());
      el = next;
    }
    if (href) { el.setAttribute('href', href); el.removeAttribute('type'); } else { el.removeAttribute('href'); if (tag === 'BUTTON') el.setAttribute('type', 'button'); }
    return el;
  }
  const WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width', 'custom'];
  function write(el, key, v, prev, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'width') { for (const c of WIDTHS) el.classList.remove(c); el.classList.add(v); }
    else if (key === 'href') return link(el, v, st);
    else if (key === 'textlink') return link(el, v, st, 'SPAN');
    else if (key === 'slot') {
      /* Move a button to the header or below the products, in block order. */
      const slot = st.root.querySelector('[data-pb-slot="' + v + '"]');
      if (slot && el.parentElement !== slot) { const n = +el.dataset.pbOrder || 0; slot.insertBefore(el, [...slot.children].find(c => (+c.dataset.pbOrder || 0) > n) || null); }
    }
    else if (key === 'src') { if (v && el.getAttribute('src') !== v) { el.removeAttribute('srcset'); el.src = v; } }
    else if (key === 'alt') el.alt = v || '';
    else if (key === 'picture') {
      /* An image setting: the same <img> gets the new address (no reload when unchanged); a placeholder becomes an <img>. */
      const d = parse(v); if (!d.src) return el;
      let img = el.querySelector('img');
      if (!img) { img = document.createElement('img'); img.decoding = 'async'; img.loading = 'lazy'; el.replaceChildren(img); }
      if (img.getAttribute('src') !== d.src) { img.removeAttribute('srcset'); img.src = d.src; }
      img.alt = d.alt || '';
      if (d.w && d.h) { img.width = d.w; img.height = d.h; } else { img.removeAttribute('width'); img.removeAttribute('height'); }
    }
    else if (key === 'svg') { const t = st.root.querySelector('template[data-pb-icon="' + CSS.escape(v) + '"]'); if (t) el.replaceChildren(t.content.cloneNode(true)); }
    return el;
  }

  /* ---------- shared derive pieces ---------- */
  const custom = s => bool(s.enable_custom_style);
  const own = (on, v, f) => on ? color(v, f) : null;
  function rootCommon(c, bpKey) {
    const {root, s, put, wrap, desktop} = c;
    const scheme = s.color_scheme && s.color_scheme.id || s.color_scheme;
    if (typeof scheme === 'string' && /^[\w-]+$/.test(scheme)) put(root, 'scheme', scheme);
    const fonts = bool(s.enable_custom_fonts);
    put(root, '--heading-font', fonts ? fontCss(s.heading_font) : null);
    put(root, '--body-font', fonts ? fontCss(s.body_font) : null);
    if (wrap && bpKey !== false) for (const side of ['top', 'bottom']) put(wrap, '!margin-' + side, px(s['section_margin_' + side + '_' + (desktop ? 'desktop' : 'mobile')]));
  }
  function textBlock(c, el, b, type) {
    const {put} = c, on = custom(b);
    put(el, type === 'eyebrow' ? 'text' : 'rich', b.text || '');
    put(el, 'hidden', !String(b.text || '').trim());
    put(el, '--pb-c', own(on, b.color, type === 'heading' ? 'var(--color-heading)' : 'var(--color-text)'));
    if (type === 'heading') { put(el, '--pb-fs-d', px(b.size_desktop)); put(el, '--pb-fs-m', px(b.size_mobile)); }
    else put(el, '--pb-fs', px(b.size));
  }
  /* A theme button: colours when custom styling is on, shape when the theme style is off. ids maps this section's setting ids. */
  function themeButton(c, el, b, ids, shapeOn) {
    const {put} = c, on = custom(b), cv = v => on ? color(v, '') : '';
    const bg = cv(b.bg), hb = cv(b.bg_hover);
    put(el, '--mb-bg', bg || null); put(el, '--mb-text', cv(b.color) || null); put(el, '--mb-border', cv(b.border_color) || bg || null);
    put(el, '--mb-hover-bg', hb || null); put(el, '--mb-hover-text', cv(b.color_hover) || null); put(el, '--mb-hover-border', cv(b.border_color_hover) || hb || null);
    for (const [k, id] of Object.entries(ids)) put(el, k, shapeOn && id ? (k === '--mb-weight' ? String(b[id] || 600) : px(b[id])) : null);
  }

  /* ---------- section types ---------- */
  const TYPES = {
    'products-listing': {
      bp: 768,
      derive(c) {
        const {root, s, put, q, blocks} = c;
        rootCommon(c);
        put(root, '.pt-min', num(s.padding_top) < 30);
        put(root, '.pb-min', num(s.padding_bottom) < 30);
        put(root, '.remove_spacing', bool(s.reset_spacing));
        put(root, '@data-align', s.header_alignment || 'left');
        put(root, '--section-pt', String(num(s.padding_top)));
        put(root, '--section-pb', String(num(s.padding_bottom)));
        put(root, '--pl-cols', String(num(s.items_per_row, 4)));
        put(root, '--pl-cols-mb', String(num(s.items_per_row_mobile, 2)));
        put(root, '--pl-col-gap', px(s.column_gap));
        put(root, '--pl-row-gap', px(s.row_gap));
        put(root, '--pl-hgap', px(s.heading_subtext_gap));
        put(root, '--pb-bg', own(custom(s), s.section_bg, 'var(--color-background)'));
        put(q('[data-pb-width]'), 'width', s.section_width || 'container');
        const grid = q('[data-pb-grid]');
        if (grid) [...grid.children].filter(n => !/^(SCRIPT|TEMPLATE|STYLE)$/.test(n.tagName)).forEach((n, i) => put(n, 'hidden', i >= num(s.items_to_show, 8)));
        const fallback = root.dataset.pbFallbackHref || '';
        let headerButtons = false, headerText = false;
        for (const x of blocks) {
          const b = x.b;
          if (x.type === 'button') {
            const el = put(x.el, 'href', url(b.link) || fallback);
            put(el, 'text', b.text || '');
            put(el, 'hidden', !String(b.text || '').trim());
            put(el, '@data-theme-button', b.button_style === 'secondary' ? 'secondary' : 'primary');
            themeButton(c, el, b, {'--mb-radius': 'radius', '--mb-padding-x': 'pad_x', '--mb-padding-y': 'pad_y', '--mb-font-size': 'size', '--btn-border-width': 'border_width'}, b.use_theme_button === false || b.use_theme_button === 'false');
            put(el, 'slot', b.position === 'header' ? 'header' : 'bottom');
            if (b.position === 'header' && String(b.text || '').trim()) headerButtons = true;
          } else {
            textBlock(c, x.el, b, x.type);
            if (String(b.text || '').trim()) headerText = true;
          }
        }
        for (const el of root.querySelectorAll('[data-pb-legacy]')) if (el.closest('[data-pb-slot="header"]')) headerButtons = true; else if (el.closest('.pl-header')) headerText = true;
        put(q('[data-pb-header]'), 'hidden', !headerText && !headerButtons);
      },
    },
    'products-carousel': {
      bp: 768,
      derive(c) {
        const {root, s, put, q, blocks} = c;
        rootCommon(c);
        put(root, '.pt-min', num(s.padding_top) < 30);
        put(root, '.pb-min', num(s.padding_bottom) < 30);
        put(root, '.remove_spacing', bool(s.reset_spacing));
        put(root, '@data-align', s.header_alignment || 'left');
        put(root, '@data-underline', bool(s.heading_underline) ? 'true' : 'false');
        put(root, '@data-width', s.section_width || 'fluid_container');
        put(root, '--section-pt', String(num(s.padding_top)));
        put(root, '--section-pb', String(num(s.padding_bottom)));
        put(root, '--pc-hgap', px(s.header_spacing));
        put(root, '--pc-gap-pag', px(s.gap_products_to_pagination));
        put(root, '--pc-gap-pag-btn', px(s.gap_pagination_to_button));
        put(root, '--pc-gap-btn', px(s.gap_products_to_button));
        put(root, '--pc-banner-w', num(s.banner_width, 30) + '%');
        put(root, '--pb-bg', own(custom(s), s.section_bg_override, 'var(--color-background)'));
        put(q('[data-pb-width]'), 'width', s.section_width || 'fluid_container');
        put(q('[data-pb-banner-row]'), '.flex-row-reverse', s.position === 'left');
        const banner = q('[data-pb-banner]');
        if (banner) {
          put(banner, '@data-sticky', bool(s.sticky_banner) ? 'true' : 'false');
          const href = s.banner_type === 'image' ? url(s.banner_link) : '';
          put(banner, '@href', href || null); put(banner, '@role', href ? null : 'link'); put(banner, '@aria-disabled', href ? null : 'true');
        }
        const pag = q('[data-pb-pagination]');
        if (pag) {
          for (const side of ['left', 'center', 'right']) put(pag, '.justify-content-' + side, (s.pagination_position || 'center') === side);
          put(pag, '.hidden-md', s.carousel_pagination === 'show_dots_on_mobile');
        }
        const fallback = root.dataset.pbFallbackHref || '';
        let headerButtons = false, headerText = false;
        for (const x of blocks) {
          const b = x.b;
          if (x.type === 'view_all') {
            const label = String(b.label || '').trim(), on = b.enabled !== false && b.enabled !== 'false';
            const el = put(x.el, 'href', url(b.link) || fallback);
            put(el, 'text', label);
            put(el, 'hidden', !on || !label);
            put(el, '@data-full', bool(b.full_width) ? 'true' : 'false');
            themeButton(c, el, b, {'--mb-radius': 'radius', '--mb-padding-x': 'padding_x', '--mb-padding-y': 'padding_y', '--mb-font-size': 'font_size', '--mb-weight': 'font_weight', '--btn-border-width': 'border_width'}, b.use_theme_button === false || b.use_theme_button === 'false');
            put(el, '--btn-text-transform', bool(b.uppercase) ? 'uppercase' : null);
            put(el, '--btn-letter-spacing', bool(b.uppercase) ? '0.04em' : null);
            put(el, 'slot', b.position === 'bottom' ? 'bottom' : 'header');
            if (b.position !== 'bottom' && on) headerButtons = true;
          } else {
            textBlock(c, x.el, b, x.type);
            if (String(b.text || '').trim()) headerText = true;
          }
        }
        if (root.querySelector('.pc-header [data-pb-legacy]')) headerText = true;
        put(q('[data-pb-header]'), 'hidden', !headerText && !headerButtons);
      },
      /* Auto-rotation runs only while the carousel is on screen, the tab is shown and motion is welcome. */
      init(root, st) {
        st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; TYPES['products-carousel'].motion(root, st); });
        st.io.observe(root);
        const slider = root.querySelector('[data-pb-slider]');
        if (slider) slider.addEventListener('pointerenter', () => { st.hover = true; }, {signal: st.abort.signal});
        if (slider) slider.addEventListener('pointerleave', () => { st.hover = false; TYPES['products-carousel'].motion(root, st); }, {signal: st.abort.signal});
        /* The theme builds the slider when it comes near the screen; wait for it, then stop polling. */
        st.motionTimer = setInterval(() => { const el = root.querySelector('[data-pb-slider]'); if (!el || el.globalSlide) { clearInterval(st.motionTimer); TYPES['products-carousel'].motion(root, st); } }, 250);
        this.motion(root, st);
        const v = root.querySelector('video[data-pb-autoplay]');
        if (v && st.reduced.matches) { v.autoplay = false; v.removeAttribute('autoplay'); try { v.pause(); } catch (_) {} }
      },
      motion(root, st) {
        const el = root.querySelector('[data-pb-slider]'), sw = el && el.globalSlide;
        const reduced = st.reduced.matches, stop = reduced || document.hidden || !st.visible;
        if (sw && !sw.destroyed) {
          sw.params.speed = reduced ? 0 : 500;
          if (sw.autoplay) {
            if (stop && sw.autoplay.running) sw.autoplay.stop();
            else if (!stop && !st.hover && el.dataset.autoplay === 'true' && !sw.autoplay.running) sw.autoplay.start();
          }
        }
        const v = root.querySelector('video[data-pb-autoplay]');
        if (v) {
          if (stop && !v.paused) { v.pause(); v.dataset.pbPaused = ''; }
          else if (!stop && 'pbPaused' in v.dataset) { delete v.dataset.pbPaused; const p = v.play && v.play(); if (p && p.catch) p.catch(() => {}); }
        }
      },
      stop(root, st) { clearInterval(st.motionTimer); },
    },
    'product-showcase': {
      bp: 750,
      derive(c) {
        const {root, s, put, blocks} = c, on = custom(s);
        rootCommon(c, false);
        const w = s.section_width || 'fluid_container';
        put(root, '@data-width', w);
        put(root, '@data-autoplay', bool(s.autoplay) ? 'true' : 'false');
        put(root, '@data-autoplay-speed', String(num(s.autoplay_speed, 6)));
        put(root, '--ps-pt', px(s.padding_top)); put(root, '--ps-pb', px(s.padding_bottom));
        put(root, '--ps-pt-m', px(s.padding_top_mobile)); put(root, '--ps-pb-m', px(s.padding_bottom_mobile));
        put(root, '--ps-maxw', w === 'container' ? 'calc(var(--page-width, 1300px) + 3rem)' : w === 'fluid_container' ? 'calc(var(--fluid-container-width, 1500px) + 3rem)' : w === 'custom' ? px(s.content_max_width) : 'none');
        put(root, '--ps-img-h', px(s.image_max_height)); put(root, '--ps-img-r', px(s.image_border_radius));
        put(root, '--ps-valign', s.left_vertical_align || 'center');
        put(root, '--ps-h-d', px(s.heading_size_desktop)); put(root, '--ps-h-m', px(s.heading_size_mobile));
        put(root, '--ps-h-ls', px(s.heading_letter_spacing)); put(root, '--ps-h-tt', s.heading_uppercase || 'none');
        put(root, '--ps-h-w', bool(s.heading_use_custom_weight) ? String(s.heading_weight || 800) : null);
        put(root, '--ps-d-d', px(s.description_size_desktop)); put(root, '--ps-d-m', px(s.description_size_mobile));
        put(root, '--ps-star-s', px(s.star_size)); put(root, '--ps-rev-s', px(s.reviews_size)); put(root, '--ps-ben-s', px(s.benefit_size)); put(root, '--ps-arrow-s', px(s.arrow_size));
        const bg = color(s.background_color, 'var(--color-background)');
        put(root, '--pb-bg', on ? (bool(s.enable_gradient) ? 'linear-gradient(' + (s.gradient_degrees || '135deg') + ', ' + color(s.gradient_color_1, 'var(--color-background)') + ', ' + color(s.gradient_color_2, 'var(--color-background)') + ')' : bg) : null);
        put(root, '--ps-bg-solid', on ? bg : null);
        for (const [k, id, f] of [['--ps-h-c', 'heading_color', 'heading'], ['--ps-d-c', 'description_color', 'text'], ['--ps-star-on', 'star_filled_color', 'primary'], ['--ps-star-off', 'star_unfilled_color', 'border'], ['--ps-rev-c', 'reviews_color', 'text'], ['--ps-ben-c', 'benefit_color', 'text'], ['--ps-check-c', 'check_color', 'heading'], ['--ps-arrow-c', 'arrow_color', 'heading'], ['--ps-arrow-b', 'arrow_border_color', 'border']]) put(root, k, own(on, s[id], 'var(--color-' + f + ')'));
        themeButton(c, root, {enable_custom_style: on, bg: s.button_bg_color, color: s.button_text_color, bg_hover: s.button_bg_hover_color, color_hover: s.button_text_hover_color, radius: s.button_radius, pv: s.button_padding_v, ph: s.button_padding_h, fs: s.button_font_size, bw: 0},
          {'--mb-radius': 'radius', '--mb-padding-y': 'pv', '--mb-padding-x': 'ph', '--mb-font-size': 'fs', '--btn-border-width': 'bw'}, s.use_theme_button === false || s.use_theme_button === 'false');
        const icon = ['check_circle', 'check_circle_filled', 'arrow', 'star', 'plus'].includes(s.check_icon_style) ? s.check_icon_style : 'check';
        const fallback = root.dataset.pbFallbackHref || '';
        for (const x of blocks) {
          const el = x.el, b = x.b, q = sel => el.querySelector(sel), hasProduct = el.dataset.pbProduct === 'true';
          put(q('[data-ps-arrows]'), 'hidden', !bool(s.show_arrows));
          /* A slide's own heading, text, picture and link; empty ones keep the product's (redraw). */
          const h = q('[data-ps-heading]');
          if (!hasProduct || String(b.heading || '').trim()) { put(h, 'rich', b.heading || ''); put(h, 'hidden', !scrub(b.heading).trim()); }
          const d = q('[data-ps-desc]');
          if (!hasProduct || String(b.description || '').trim()) { put(d, 'text', b.description || ''); put(d, 'hidden', !String(b.description || '').trim()); }
          const rating = num(b.star_rating), rev = String(b.reviews_text || '').trim();
          put(q('[data-ps-rating]'), 'hidden', !(rating > 0) && !rev);
          const stars = q('[data-ps-stars]');
          if (stars) { put(stars, 'hidden', !(rating > 0)); put(stars, '@aria-label', rating + ' / 5'); put(stars.querySelector('.ps-stars-fill'), '!width', rating * 20 + '%'); }
          const r = put(q('[data-ps-reviews]'), 'textlink', url(b.reviews_link));
          put(r, 'text', b.reviews_text || ''); put(r, 'hidden', !rev);
          let any = false;
          for (const li of el.querySelectorAll('[data-ps-benefit]')) {
            const v = String(b['benefit_' + li.dataset.psBenefit] || '');
            put(li.querySelector('[data-ps-benefit-text]'), 'text', v); put(li, 'hidden', !v.trim());
            put(li.querySelector('[data-ps-check]'), 'svg', icon);
            if (v.trim()) any = true;
          }
          put(q('[data-ps-benefits]'), 'hidden', !any);
          const btn = q('[data-ps-btn]');
          if (!hasProduct || url(b.button_link)) put(btn, '@href', url(b.button_link) || fallback);
          put(btn, 'text', b.button_text || ''); put(btn, 'hidden', !String(b.button_text || '').trim());
          const src = url(b.image, true);
          if (src) put(q('[data-ps-image]'), 'picture', JSON.stringify({src, w: b.image && b.image.width || 0, h: b.image && b.image.height || 0, alt: b.image && b.image.alt || scrub(b.heading).trim()}));
        }
      },
      init(root, st) {
        const T = TYPES['product-showcase'];
        st.index = 0; st.visible = true;
        const sig = {signal: st.abort.signal};
        const slides = () => [...root.querySelectorAll('[data-ps-slide]')];
        st.go = (to, user) => {
          const list = slides(), n = list.length; if (!n) return;
          const next = ((to % n) + n) % n, changed = next !== st.index;
          st.index = next;
          const track = root.querySelector('[data-ps-track]');
          track.style.transform = next ? 'translateX(' + (-next * 100) + '%)' : '';
          list.forEach((el, i) => {
            const on = i === next;
            el.classList.toggle('is-active', on);
            if (on && changed && !st.reduced.matches) { el.classList.remove('is-entering'); void el.offsetWidth; el.classList.add('is-entering'); }
            if (on) { el.removeAttribute('aria-hidden'); el.inert = false; } else { el.setAttribute('aria-hidden', 'true'); el.inert = true; }
          });
          if (user) T.motion(root, st, true);
        };
        root.addEventListener('animationend', e => { const s = e.target.closest('.is-entering'); if (s && e.target.classList.contains('ps-col-right')) s.classList.remove('is-entering'); }, sig);
        root.addEventListener('click', e => {
          const b = e.target.closest('[data-ps-prev],[data-ps-next]'); if (!b || !root.contains(b)) return;
          st.go(st.index + (b.hasAttribute('data-ps-next') ? 1 : -1), true);
          const keep = root.querySelector('.ps-slide.is-active ' + (b.hasAttribute('data-ps-next') ? '[data-ps-next]' : '[data-ps-prev]'));
          if (keep && document.activeElement !== keep && b.matches(':focus')) keep.focus({preventScroll: true});
        }, sig);
        root.addEventListener('keydown', e => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          if (e.target.closest('input,textarea,select,[contenteditable]')) return;
          e.preventDefault(); st.go(st.index + (e.key === 'ArrowRight' ? 1 : -1), true);
          const a = root.querySelector('.ps-slide.is-active ' + (e.key === 'ArrowRight' ? '[data-ps-next]' : '[data-ps-prev]'));
          if (a && root.contains(document.activeElement)) a.focus({preventScroll: true});
        }, sig);
        /* Swipe (touch and pen; a mouse drags too): horizontal moves the track, vertical scrolls the page. */
        const vp = root.querySelector('[data-ps-viewport]');
        if (vp) {
          let down = null;
          vp.addEventListener('pointerdown', e => { if (slides().length < 2 || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('a,button')) return; down = {x: e.clientX, y: e.clientY, dx: 0, lock: false, id: e.pointerId}; }, sig);
          vp.addEventListener('pointermove', e => {
            if (!down || e.pointerId !== down.id) return;
            const mx = e.clientX - down.x, my = e.clientY - down.y;
            if (!down.lock) { if (Math.abs(mx) < 6 && Math.abs(my) < 6) return; if (Math.abs(my) > Math.abs(mx)) { down = null; return; } down.lock = true; try { vp.setPointerCapture(e.pointerId); } catch (_) {} root.querySelector('[data-ps-track]').classList.add('is-dragging'); T.motion(root, st, true); }
            const n = slides().length; down.dx = (st.index === 0 && mx > 0) || (st.index === n - 1 && mx < 0) ? mx * 0.35 : mx;
            root.querySelector('[data-ps-track]').style.transform = 'translateX(calc(' + (-st.index * 100) + '% + ' + down.dx + 'px))';
          }, sig);
          const end = () => {
            if (!down) return; const d = down; down = null;
            const track = root.querySelector('[data-ps-track]'); track.classList.remove('is-dragging');
            if (!d.lock) return;
            const limit = (vp.clientWidth || 1) * 0.18;
            st.go(d.dx <= -limit ? st.index + 1 : d.dx >= limit ? st.index - 1 : st.index, true);
          };
          vp.addEventListener('pointerup', end, sig); vp.addEventListener('pointercancel', end, sig); vp.addEventListener('lostpointercapture', end, sig);
        }
        root.addEventListener('pointerenter', () => { st.hover = true; T.motion(root, st); }, sig);
        root.addEventListener('pointerleave', () => { st.hover = false; T.motion(root, st); }, sig);
        root.addEventListener('focusin', () => { st.focus = true; T.motion(root, st); }, sig);
        root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget)) { st.focus = false; T.motion(root, st); } }, sig);
        st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; T.motion(root, st); });
        st.io.observe(root);
        T.motion(root, st);
      },
      /* Auto-rotation: only with two or more slides, on screen, tab shown, no hover or focus, motion welcome. */
      motion(root, st, restart) {
        const s = st.s, n = root.querySelectorAll('[data-ps-slide]').length;
        const run = bool(s.autoplay) && n > 1 && st.visible && !document.hidden && !st.hover && !st.focus && !st.reduced.matches;
        const ms = Math.max(3, num(s.autoplay_speed, 6)) * 1000;
        if (st.timer && (!run || restart || st.timerMs !== ms)) { clearInterval(st.timer); st.timer = 0; }
        if (run && !st.timer) { st.timerMs = ms; st.timer = setInterval(() => { if (!root.isConnected) { clearInterval(st.timer); st.timer = 0; return; } st.go(st.index + 1); }, ms); }
        root.dataset.pbRunning = st.timer ? 'true' : 'false';
      },
      update(root, st) { TYPES['product-showcase'].motion(root, st); },
      stop(root, st) { clearInterval(st.timer); st.timer = 0; },
    },
    'featured-product2': {
      bp: 760,
      derive(c) {
        const {root, s, put, blocks, q} = c, on = custom(s);
        rootCommon(c, false);
        put(root, '.remove_spacing', bool(s.reset_spacing));
        put(root, '@data-width', s.section_width || 'full_width');
        put(root, '--psh-pt', px(s.padding_top)); put(root, '--psh-pb', px(s.padding_bottom));
        put(root, '--psh-px-d', px(s.side_padding_desktop)); put(root, '--psh-px-m', px(s.side_padding_mobile));
        put(root, '--psh-gap-d', px(s.gap_desktop)); put(root, '--psh-gap-m', px(s.gap_mobile));
        put(root, '--psh-dir', s.image_position === 'right' ? 'row-reverse' : 'row');
        put(root, '--psh-valign', s.column_valign || 'center');
        put(root, '--psh-img-w', num(s.image_width_pct, 50) + '%');
        put(root, '--psh-ar-d', s.image_aspect_desktop || '4 / 5'); put(root, '--psh-ar-m', s.image_aspect_mobile || '4 / 5');
        put(root, '--psh-r', px(s.image_radius)); put(root, '--psh-tgap', px(s.text_gap));
        put(root, '--psh-align', s.text_align === 'center' ? 'center' : s.text_align === 'right' ? 'flex-end' : 'flex-start');
        put(root, '--psh-talign', s.text_align || 'left');
        put(root, '--psh-sub-max', px(s.sub_max_width)); put(root, '--psh-desc-max', px(s.desc_max_width));
        put(root, '--psh-cta-mt', px(s.cta_margin_top)); put(root, '--psh-rating-fs', px(s.rating_size));
        put(root, '--psh-bg', own(on, s.section_bg, 'transparent'));
        put(root, '--psh-img-bg', own(on, s.image_bg, 'color-mix(in srgb, var(--color-heading) 6%, var(--color-background))'));
        put(root, '--psh-compare', own(on, s.price_compare_color, 'color-mix(in srgb, var(--color-text) 55%, transparent)'));
        put(root, '--psh-badge-bg', own(on, s.sale_badge_bg, 'var(--color-primary)'));
        put(root, '--psh-badge-c', own(on, s.sale_badge_color, 'var(--btn-primary-color)'));
        put(root, '--psh-rating-c', own(on, s.rating_color, 'var(--color-text)'));
        put(root, '--psh-star', own(on, s.rating_star_color, 'var(--color-primary)'));
        for (const [k, id] of [['--psh-cta-bg', 'cta_bg'], ['--psh-cta-c', 'cta_color'], ['--psh-cta-hbg', 'cta_bg_hover'], ['--psh-cta2-c', 'cta_secondary_color'], ['--psh-cta2-b', 'cta_secondary_border'], ['--psh-cta2-hbg', 'cta_secondary_hover_bg']]) put(root, k, on ? color(s[id], '') || null : null);
        const shape = s.use_theme_button === false || s.use_theme_button === 'false';
        put(root, '--mb-radius', shape ? px(s.cta_radius) : null); put(root, '--mb-padding-x', shape ? px(s.cta_pad_x) : null);
        put(root, '--mb-padding-y', shape ? px(s.cta_pad_y) : null); put(root, '--mb-font-size', shape ? px(s.cta_size) : null);
        const src = url(s.image, true);
        if (src) put(q('[data-pb-media]'), 'picture', JSON.stringify({src, alt: s.image && s.image.alt || root.dataset.pbName || ''}));
        const title = root.dataset.pbTitle || '', productUrl = root.dataset.pbProductUrl || '';
        for (const x of blocks) {
          const el = x.el, b = x.b, bon = custom(b);
          const fb = x.type === 'heading' ? 'var(--color-heading)' : x.type === 'price' ? 'var(--color-primary)' : 'var(--color-text)';
          if (['eyebrow', 'heading', 'subheading', 'price', 'description'].includes(x.type)) put(el, '--pb-c', own(bon, b.color, fb));
          if (x.type === 'eyebrow') { put(el, 'text', b.text || ''); put(el, 'hidden', !String(b.text || '').trim()); put(el, '--pb-fs', px(b.size)); }
          else if (x.type === 'heading') { put(el, scrub(b.text).trim() ? 'rich' : 'text', scrub(b.text).trim() ? b.text : title); put(el, '--pb-fs-d', px(b.size_desktop)); put(el, '--pb-fs-m', px(b.size_mobile)); }
          else if (x.type === 'subheading') { put(el, 'rich', b.text || ''); put(el, 'hidden', !scrub(b.text).trim()); put(el, '--pb-fs', px(b.size)); }
          else if (x.type === 'price') {
            put(el, '--pb-fs', px(b.size));
            const badge = el.querySelector('[data-pb-badge]');
            if (badge) { put(badge, 'hidden', !bool(b.show_sale_badge)); put(badge, 'text', (String(b.sale_badge_text || '').trim() || badge.dataset.save || 'Save') + ' ' + badge.dataset.pct + '%'); }
          }
          else if (x.type === 'description') {
            put(el, '--pb-fs', px(b.size));
            if (scrub(b.text).trim()) put(el, 'rich', b.text);
          }
          else if (x.type === 'rating') {
            const mine = el.dataset.pbOwnRating === 'true';
            if (mine) {
              const v = String(b.rating || '').trim(), n = String(b.reviews_count || '').trim();
              put(el, 'hidden', b.show === false || b.show === 'false' || !v);
              const pct = Math.min(100, num(v) * 20);
              put(el.querySelector('.psh__stars-fill'), '!width', pct + '%');
              put(el.querySelector('[data-pb-stars]'), '@aria-label', v + ' / 5');
              put(el.querySelector('[data-pb-rating-text]'), 'text', v + (n ? ' · ' + n + ' ' + (String(b.reviews_label || '').trim() || 'reviews') : ''));
            } else put(el, 'hidden', b.show === false || b.show === 'false');
          }
          else if (x.type === 'buttons') {
            const p = el.querySelector('[data-pb-primary]'), sec = el.querySelector('[data-pb-secondary]');
            if (p) {
              put(p, 'hidden', !String(b.primary_label || '').trim());
              if (p.tagName === 'A') { put(p, '@href', url(b.primary_url) || productUrl); put(p.querySelector('[data-pb-label]'), 'text', b.primary_label || ''); }
              else if (!p.disabled) put(p.querySelector('[data-pb-label]'), 'text', b.primary_label || '');
            }
            if (sec) { put(sec, '@href', url(b.secondary_url) || productUrl); put(sec, 'text', b.secondary_label || ''); put(sec, 'hidden', !String(b.secondary_label || '').trim()); }
          }
        }
      },
      stop(root, st) { clearInterval(st.timer); st.timer = 0; },
    },
  };

  /* ---------- engine ---------- */
  function derive(root, st, record) {
    const type = TYPES[root.dataset.pbRoot]; if (!type) return [];
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
    const blocks = [...root.querySelectorAll(BSEL)].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.pbBlock, t = el.dataset.pbType;
      if (st.rawBlocks.get(id) !== el.dataset.pbSettings) { st.rawBlocks.set(id, el.dataset.pbSettings); st.blocks.set(id, {...parse(el.dataset.pbSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: t, b: {...(st.blockDefaults[t] || {}), ...st.blocks.get(id)}};
    });
    const c = {root, st, s: st.s, put, blocks, wrap: root.closest('.shopify-section'), desktop: st.mq.matches, q: sel => root.querySelector(sel), record};
    type.derive(c);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.pbSettings) { st.raw = root.dataset.pbSettings; st.s = {...st.defaults, ...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    const type = TYPES[root.dataset.pbRoot];
    if (type.update) type.update(root, st);
  }
  function drop(root, st) {
    st.mq.removeEventListener('change', st.schedule); st.reduced.removeEventListener('change', st.onMotion);
    if (st.io) st.io.disconnect();
    cancelAnimationFrame(st.frame); if (st.abort) st.abort.abort();
    const type = TYPES[root.dataset.pbRoot]; if (type && type.stop) type.stop(root, st);
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.pbRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const defaults = parse(root.dataset.pbDefaults);
    const st = {root, defaults, live: {}, liveBlocks: new Map(), s: {...defaults, ...parse(root.dataset.pbSettings)}, raw: root.dataset.pbSettings, blocks: new Map(), rawBlocks: new Map(), blockDefaults: parse(root.dataset.pbBlockDefaults), last: new Map(), visible: true,
      mq: matchMedia('(min-width: ' + type.bp + 'px)'), reduced: matchMedia('(prefers-reduced-motion: reduce)'), abort: new AbortController()};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.onMotion = () => { if (type.motion) type.motion(root, st); st.schedule(); };
    st.mq.addEventListener('change', st.schedule); st.reduced.addEventListener('change', st.onMotion);
    roots.set(root, st);
    derive(root, st, true);
    if (type.init) type.init(root, st);
    st.schedule();
    root.dataset.pbReady = '';
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
      if (root.dataset.pbSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      const type = TYPES[root.dataset.pbRoot];
      if (type.live) type.live(root, st, d.settings, bid);
      st.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const [root, st] of roots) { const type = TYPES[root.dataset.pbRoot]; if (type.motion) type.motion(root, st); } });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',' + BSEL) || n.querySelector(SEL + ',' + BSEL));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',' + BSEL) : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-pb-settings']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false) { have = have !== null; } else want = v == null ? null : String(v); }
      else if (key[0] === '.') { have = el.classList.contains(key.slice(1)); want = !!v; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'width') { have = el.classList.contains(v); want = true; }
      else if (key === 'slot') { have = el.closest('[data-pb-slot]')?.dataset.pbSlot; }
      else continue;
      if (have !== want) bad.push((el.dataset.pbBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaProductsB = {scan, audit, roots, TYPES};
  scan();
})();
