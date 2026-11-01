/* Materia Themes. Live editor paint and behaviour for seven Features sections:
   Benefits Bar, Benefits Bar 2, Benefits Bar Pro, Benefits Circles, Benefits
   Icons, Benefits Tabs and Product Benefits Pro (benefits2).

   Every root [data-fa] carries its section id and settings as JSON, every
   block [data-fa-block] its own. derive() turns settings into outputs per
   element (a CSS variable, an attribute, text, an icon, a link). The Liquid
   prints the same outputs, so on load the first derive is only recorded,
   never painted. After that an output is written only when its value
   changes, at most once per frame per root: a picture never reloads and a
   running carousel or open tab is left alone by an unrelated edit.
   Behaviour (the tabs' open and close, the carousels' autoplay and arrows)
   is set up here per instance, once, and again when a section is drawn
   again; timers stop off screen, in a hidden tab and under reduced motion.
   audit(root) lists outputs whose markup differs from the derived value
   (used by the tests). */
(() => {
  if (window.MateriaFeaturesA) return;
  const SEL = '[data-fa]';
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => {
    if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; }
    v = typeof v === 'string' ? v.trim() : '';
    if (!v || v === 'transparent' || /^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) || /^#(?:[0-9a-f]{3}0|[0-9a-f]{6}00)$/i.test(v) || !CSS.supports('color', v)) return f;
    return v;
  };
  const color = (v, f) => { const a = api(); return (a && a.color ? a.color(v, f) : localColor(v, f)) || f; };
  const localUrl = (v, image) => {
    v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.value : v;
    if (typeof v !== 'string' || !v || v === '#') return '';
    if (/^\/(?!\/)/.test(v) || /^#/.test(v)) return v;
    try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return ''; }
  };
  const url = (v, image = false) => { const a = api(); return (a && a.url ? a.url(v, image) : '') || localUrl(v, image); };
  const imgSrc = v => { if (!v) return ''; if (typeof v === 'object') return url(v.src || v.url || v.preview_image?.src || '', true); return url(v, true); };
  const fontCss = (v, f) => {
    if (v && typeof v === 'object' && v.family) return v.family + ', ' + (v.fallback_families || 'sans-serif');
    const a = api(), fam = a && a.font && v ? a.font(v) : '';
    return !fam ? f : /^var\(|,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const tpl = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };
  const scheme = s => { const v = s.color_scheme && s.color_scheme.id || s.color_scheme; return typeof v === 'string' && /^[\w-]+$/.test(v) ? v : ''; };
  const has = v => String(v ?? '').replace(/<[^>]*>/g, '').trim() !== '';

  /* ---------- writers ---------- */
  function rich(el, value, st) {
    if (st.rich.get(el) === value) return;
    st.rich.set(el, value);
    const a = api();
    if (a && a.rich) { a.rich(el, value || '', {rich: new WeakMap()}); return; }
    el.textContent = String(value || '').replace(/<[^>]*>/g, '');
  }
  function cleanSvg(code) {
    const svg = tpl(String(code || '')).querySelector('svg');
    if (!svg) return null;
    svg.querySelectorAll('script,foreignObject').forEach(n => n.remove());
    for (const n of [svg, ...svg.querySelectorAll('*')]) for (const a of [...n.attributes]) if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) n.removeAttribute(a.name);
    return svg;
  }
  /* icon: {t:'lib', n} from a <template data-fa-icon> the section prints in the builder, {t:'svg', code}, {t:'img', src, alt}, {t:'none'}. */
  function icon(el, v, st) {
    const d = parse(v);
    if (d.t === 'img') {
      let img = el.querySelector(':scope > img');
      if (!img) { img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async'; img.width = 120; img.height = 120; if (d.cls) img.className = d.cls; el.replaceChildren(img); }
      if (img.getAttribute('src') !== d.src) { img.removeAttribute('srcset'); img.src = d.src; }
      img.alt = d.alt || '';
      return;
    }
    let n = null;
    if (d.t === 'svg') n = cleanSvg(d.code);
    else if (d.t === 'lib') { const t = st.root.querySelector('template[data-fa-icon="' + CSS.escape(d.n || '') + '"]'); if (t) n = t.content.cloneNode(true); }
    if (n) el.replaceChildren(n); else el.replaceChildren();
  }
  /* media: {t:'video', src}, {t:'img', src, alt} or {t:'ph'} (the <template data-fa-icon="__media"> the section prints in the builder). The same element is kept when only its source changes. */
  function media(el, v, st) {
    const d = parse(v), cur = el.firstElementChild;
    if (d.t === 'video') {
      if (cur && cur.tagName === 'VIDEO') { if (cur.getAttribute('src') !== d.src) cur.setAttribute('src', d.src); return; }
      const n = document.createElement('video'); n.muted = true; n.loop = true; n.playsInline = true;
      for (const a of ['autoplay', 'muted', 'loop', 'playsinline']) n.setAttribute(a, '');
      n.setAttribute('preload', 'metadata'); n.setAttribute('aria-hidden', 'true'); n.setAttribute('src', d.src); el.replaceChildren(n); return;
    }
    if (d.t === 'img') {
      if (cur && cur.tagName === 'IMG') { if ((cur.getAttribute('src') || '').split('?')[0] !== d.src.split('?')[0]) { cur.removeAttribute('srcset'); cur.src = d.src; } cur.alt = d.alt || ''; return; }
      const n = document.createElement('img'); n.alt = d.alt || ''; n.width = 500; n.height = 600; n.loading = 'lazy'; n.decoding = 'async'; n.src = d.src; el.replaceChildren(n); return;
    }
    const t = st.root.querySelector('template[data-fa-icon="__media"]');
    if (cur && cur.tagName.toLowerCase() === 'svg') return;
    el.replaceChildren(t ? t.content.cloneNode(true) : '');
  }
  /* A link wrapper that is an <a> with a link and a <div>/<span> (or <button>) without one. */
  function link(el, href, st) {
    const none = el.dataset.faNolink || 'DIV', tag = href ? 'A' : none.toUpperCase();
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      st.last.set(next, st.last.get(el) || new Map());
      el = next;
    }
    if (href) { el.setAttribute('href', href); if (el.getAttribute('type') === 'button') el.removeAttribute('type'); }
    else { el.removeAttribute('href'); if (tag === 'BUTTON') el.setAttribute('type', 'button'); }
    return el;
  }
  function write(el, key, v, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') { if (el.textContent !== String(v ?? '')) el.textContent = v ?? ''; }
    else if (key === 'rich') rich(el, v, st);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); if (v) el.classList.add('color-' + v); }
    else if (key === 'src') { const cur = el.getAttribute('src') || ''; if (cur.split('?')[0] !== String(v || '').split('?')[0]) { el.removeAttribute('srcset'); el.setAttribute('src', v || ''); } }
    else if (key === 'icon') icon(el, v, st);
    else if (key === 'media') media(el, v, st);
    else if (key === 'href') return link(el, v, st);
    return el;
  }

  /* ---------- shared pieces ---------- */
  const custom = s => bool(s.enable_custom_style);
  const pick = (own, v, f) => own ? color(v, f) : f;
  const WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width'];
  /* scheme, width, background, spacing and fonts every section prints on its root (snippet features-a-root). */
  function common(c, o = {}) {
    const {root, s, put} = c, own = custom(s), fonts = bool(s.enable_custom_fonts);
    put(root, 'scheme', scheme(s) || 'default-color-scheme');
    const w = s[o.width || 'section_width'];
    put(root, '@data-width', WIDTHS.includes(w) ? w : (o.widthDefault || 'full_width'));
    if (o.bg !== false) put(root, '--fa-bg', pick(own, s[o.bg || 'section_bg'], 'var(--color-background)'));
    put(root, '--fa-hf', fonts ? fontCss(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)');
    put(root, '--fa-bf', fonts ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)');
    put(root, '@data-own-font', fonts || null);
    const P = o.pad || ['padding_top_mobile', 'padding_bottom_mobile', 'padding_top_desktop', 'padding_bottom_desktop'];
    ['--fa-pt-m', '--fa-pb-m', '--fa-pt-d', '--fa-pb-d'].forEach((k, i) => put(root, k, px(s[P[i]])));
    const reset = bool(s.reset_spacing);
    ['--fa-mt-m', '--fa-mb-m', '--fa-mt-d', '--fa-mb-d'].forEach((k, i) => put(root, k, reset ? '0px' : px(s[['section_margin_top_mobile', 'section_margin_bottom_mobile', 'section_margin_top_desktop', 'section_margin_bottom_desktop'][i]])));
  }
  /* A theme button: colours only with custom style, shape only with use_theme_button off. */
  function button(c, el, b, o = {}) {
    const {put} = c, own = custom(b), shape = b.use_theme_button === false || b.use_theme_button === 'false';
    el = put(el, 'href', url(b.link));
    put(el, '@data-theme-button', b.button_style === 'secondary' ? 'secondary' : 'primary');
    const cv = v => own ? color(v, '') : '';
    const bg = cv(b[o.bg || 'bg']), hb = cv(b[o.hoverBg || 'bg_hover']);
    put(el, '--mb-bg', bg || null); put(el, '--mb-text', cv(b[o.text || 'text_color']) || null); put(el, '--mb-border', bg || null);
    put(el, '--mb-hover-bg', hb || null); put(el, '--mb-hover-text', cv(b[o.hoverText || 'text_color_hover']) || null); put(el, '--mb-hover-border', hb || null);
    put(el, '--mb-radius', shape ? px(b.radius) : null);
    put(el, '--mb-padding-y', shape ? px(b.pad_y) : null);
    put(el, '--mb-padding-x', shape ? px(b.pad_x) : null);
    put(el, '--mb-font-size', shape ? px(b.size) : null);
    put(el, '@data-own-shape', shape || null);
    return el;
  }
  /* The icon value a library/svg/image choice prints. */
  const iconValue = (source, b, o) => {
    if (source === 'none') return JSON.stringify({t: 'none'});
    if (source === 'image') { const src = imgSrc(b[o.image]); return src ? JSON.stringify({t: 'img', src, alt: o.alt || '', cls: o.cls || ''}) : JSON.stringify({t: o.emptyImage || 'none', n: b[o.lib]}); }
    if (source === 'svg') return String(b[o.svg] || '').trim() ? JSON.stringify({t: 'svg', code: b[o.svg]}) : JSON.stringify({t: 'none'});
    return JSON.stringify({t: 'lib', n: b[o.lib] || 'none'});
  };

  /* ---------- sections ---------- */
  const TYPES = {};
  window.MateriaFeaturesA = {TYPES, roots, helpers: {bool, num, px, color, url, imgSrc, fontCss, has, custom, pick, common, button, iconValue, scheme}};

  /* ---------- engine ---------- */
  function derive(root, st, record) {
    const type = TYPES[root.dataset.fa], out = [];
    const put = (el, key, v) => {
      if (!el) return el;
      out.push([el, key, v]);
      if (record === 'audit') return el;
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      m.set(key, v);
      return write(el, key, v, st) || el;
    };
    const blocks = [...root.querySelectorAll('[data-fa-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.faBlock;
      if (st.rawBlocks.get(id) !== el.dataset.faSettings) { st.rawBlocks.set(id, el.dataset.faSettings); st.blocks.set(id, {...parse(el.dataset.faSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.faType, b: st.blocks.get(id)};
    });
    const c = {root, st, s: st.s, put, blocks, q: (sel, scope = root) => scope.querySelector(sel), qa: (sel, scope = root) => [...scope.querySelectorAll(sel)], H: window.MateriaFeaturesA.helpers};
    if (type && type.derive) type.derive(c);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.faSettings) { st.raw = root.dataset.faSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    const type = TYPES[root.dataset.fa];
    if (type && type.refresh) type.refresh(st);
  }
  function drop(root, st) {
    cancelAnimationFrame(st.frame);
    st.ac.abort();
    if (st.io) st.io.disconnect();
    for (const t of st.timers) clearInterval(t);
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.fa]; if (!type) return;
    const ac = new AbortController();
    const st = {root, live: {}, liveBlocks: new Map(), s: parse(root.dataset.faSettings), raw: root.dataset.faSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), rich: new WeakMap(),
      ac, signal: ac.signal, timers: new Set(), visible: true, reduced: matchMedia('(prefers-reduced-motion: reduce)')};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.reduced.addEventListener('change', () => type.refresh && type.refresh(st), {signal: st.signal});
    st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; if (type.refresh) type.refresh(st); });
    st.io.observe(root);
    roots.set(root, st);
    derive(root, st, true);
    if (type.setup) type.setup(st);
    root.dataset.faReady = '';
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
      if (root.dataset.faSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); if (st.blocks.has(bid)) st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const [root, st] of roots) { const t = TYPES[root.dataset.fa]; if (t && t.refresh) t.refresh(st); } });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-fa-block]') || n.querySelector(SEL + ',[data-fa-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-fa-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-fa-settings']});
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim().replace(/\s+/g, ' '); want = v == null ? '' : String(v).trim().replace(/\s+/g, ' '); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key[0] === '.') { have = el.classList.contains(key.slice(1)); want = !!v; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'text') { have = el.textContent.trim(); want = String(v ?? '').trim(); }
      else if (key === 'href') { have = el.getAttribute('href') || ''; want = v || ''; }
      else if (key === 'src') { have = (el.getAttribute('src') || '').split('?')[0]; want = String(v || '').split('?')[0]; }
      else continue;
      if (have !== want) bad.push((el.dataset.faBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaFeaturesA.scan = scan;
  window.MateriaFeaturesA.audit = audit;
  window.MateriaFeaturesA.define = (name, def) => { TYPES[name] = def; };
  /* The section types below register synchronously; the first scan runs right after this file. */
  Promise.resolve().then(scan);
})();

/* ---------- Benefits Bar Pro ---------- */
(() => {
  const A = window.MateriaFeaturesA; if (!A || A.TYPES['benefits-bar-pro']) return;
  const {bool, num, px, color, url, imgSrc, common, iconValue} = A.helpers;
  const BG = 'color-mix(in srgb, var(--color-heading) 7%, transparent)';
  A.define('benefits-bar-pro', {
    derive(c) {
      const {root, s, put, q} = c, own = bool(s.custom_text_colors), center = s.align === 'center', mobile = s.mobile_layout || 'two_column';
      common(c, {width: 'width', widthDefault: 'fluid_container', bg: false, pad: ['padding_top', 'padding_bottom', 'padding_top', 'padding_bottom']});
      put(root, '@data-icon-style', s.icon_style || 'rounded_square');
      put(root, '@data-mobile', mobile);
      put(root, '@data-dividers', bool(s.show_dividers) ? 'true' : 'false');
      const pick = (v, f) => own ? color(v, f) : f;
      const vars = {'--bbp-cols': String(num(s.columns_desktop, 4)), '--bbp-gap': px(s.item_gap), '--bbp-icon-size': px(s.icon_size, 30), '--bbp-stroke': px((num(s.icon_stroke, 1) - 1) * 10),
        '--bbp-align': center ? 'center' : 'left', '--bbp-justify': center ? 'center' : 'flex-start',
        '--bbp-icon-color': pick(s.icon_color, 'var(--color-heading)'), '--bbp-icon-bg': pick(s.icon_bg_color, BG), '--bbp-divider': pick(s.divider_color, 'var(--color-border)'),
        '--bbp-title': pick(s.title_color, 'var(--color-heading)'), '--bbp-sub': pick(s.subtitle_color, 'var(--color-text)'), '--bbp-sub-o': own && s.subtitle_color ? '1' : '0.7',
        '--bbp-ts-d': px(s.title_size_d, 15), '--bbp-ts-m': px(s.title_size_m, 14), '--bbp-ss-d': px(s.subtitle_size_d, 13), '--bbp-ss-m': px(s.subtitle_size_m, 12)};
      for (const k in vars) put(root, k, vars[k]);
      put(q('.bbp__list'), '@tabindex', mobile === 'carousel_scroll' ? '0' : null);
      for (const {el, type, b} of c.blocks) {
        if (type === 'heading') {
          put(el, 'rich', b.heading || ''); put(el, 'hidden', !A.helpers.has(b.heading));
          put(el, '--bbp-hd', px(b.heading_size_d, 30)); put(el, '--bbp-hm', px(b.heading_size_m, 22));
          put(el, '--bbp-hc', bool(b.enable_custom_style) ? color(b.heading_color, 'var(--color-heading)') : 'var(--color-heading)');
        } else if (type === 'benefit') {
          const href = url(b.link), a = put(q('.bbp__link', el), 'href', href);
          put(a, '@aria-label', href && b.title ? String(b.title).replace(/<[^>]*>/g, '') : null);
          put(q('.bbp__icon', el), 'icon', iconValue(imgSrc(b.icon_image) ? 'image' : 'lib', b, {image: 'icon_image', lib: 'icon'}));
          const t = q('.bbp__title', el); put(t, 'text', b.title || ''); put(t, 'hidden', !String(b.title || '').trim());
          const sub = q('.bbp__subtitle', el); put(sub, 'rich', b.subtitle || ''); put(sub, 'hidden', !A.helpers.has(b.subtitle));
        }
      }
    },
  });
})();

/* ---------- Benefits Bar 2 (and the phone carousel's autoplay) ---------- */
(() => {
  const A = window.MateriaFeaturesA; if (!A || A.TYPES['benefits-bar-2']) return;
  const {bool, num, px, color, common, iconValue, custom} = A.helpers;
  const phone = matchMedia('(max-width: 767px)');
  /* One timer per instance, running only when the carousel and autoplay are on, on a phone, on screen, in a visible tab, without reduced motion, and not while the visitor holds or focuses it. */
  function autoplay(st) {
    const root = st.root, grid = root.querySelector('.bb2__grid'), secs = num(root.dataset.autoplay, 0);
    const want = secs > 0 && phone.matches && !st.reduced.matches && st.visible && !document.hidden && !st.held && grid ? secs : 0;
    if (want === st.playing) return;
    if (st.timer) { clearInterval(st.timer); st.timers.delete(st.timer); st.timer = 0; }
    st.playing = want;
    if (!want) return;
    st.timer = setInterval(() => {
      const item = grid.querySelector('.bb2__item'); if (!item) return;
      const max = grid.scrollWidth - grid.clientWidth;
      if (grid.scrollLeft >= max - 2) grid.scrollTo({left: 0}); else grid.scrollBy({left: item.getBoundingClientRect().width + (parseFloat(getComputedStyle(grid).columnGap) || 0)});
    }, want * 1000);
    st.timers.add(st.timer);
  }
  A.define('benefits-bar-2', {
    derive(c) {
      const {root, s, put, q} = c, own = custom(s), car = bool(s.enable_mobile_carousel);
      common(c, {widthDefault: 'container'});
      put(root, '@data-layout', s.layout === 'horizontal' ? 'horizontal' : 'vertical');
      put(root, '@data-align', s.alignment === 'left' || s.alignment === 'right' ? s.alignment : 'center');
      put(root, '@data-carousel', car ? 'true' : 'false');
      put(root, '@data-autoplay', car && bool(s.carousel_autoplay) ? String(num(s.carousel_autoplay_speed, 4)) : '0');
      put(root, '@data-dividers', bool(s.show_dividers) ? 'true' : 'false');
      put(root, '@data-top', bool(s.show_top_border) ? 'true' : 'false');
      put(root, '@data-bottom', bool(s.show_bottom_border) ? 'true' : 'false');
      const v = {'--bb2-line': own ? color(s.divider_color, 'var(--color-border)') : 'var(--color-border)', '--bb2-cols-d': String(num(s.cols_desktop, 4)), '--bb2-cols-m': String(num(s.cols_mobile, 2)),
        '--bb2-gap-d': px(s.gap_desktop), '--bb2-cgap-d': px(s.col_gap_desktop), '--bb2-gap-m': px(s.gap_mobile), '--bb2-cgap-m': px(s.col_gap_mobile), '--bb2-ipv': String(num(s.mobile_items_per_view, 1.2)),
        '--bb2-item-gap': px(s.item_gap), '--bb2-pad-y': px(s.item_padding), '--bb2-pad-x': px(s.item_pad_x), '--bb2-box': px(s.icon_box_size, 40), '--bb2-radius': px(s.icon_box_radius),
        '--bb2-icon-size': px(s.icon_size, 22), '--bb2-title-size': px(s.title_size, 14), '--bb2-tracking': px(s.title_letter_spacing), '--bb2-desc-size': px(s.desc_size, 13),
        '--heading-text-transform': bool(s.title_uppercase) ? 'uppercase' : null};
      for (const k in v) put(root, k, v[k]);
      const grid = q('.bb2__grid'); put(grid, '@tabindex', car ? '0' : null); put(grid, '@aria-label', car ? 'Benefits' : null);
      const tracking = num(s.title_letter_spacing) !== 0;
      for (const {el, type, b} of c.blocks) {
        if (type !== 'item') continue;
        const bo = custom(b), pick = (x, f) => bo ? color(x, f) : f;
        put(el, '--bb2-icon', pick(b.icon_color, 'var(--color-heading)')); put(el, '--bb2-icon-bg', pick(b.icon_box_bg, 'transparent'));
        put(el, '--bb2-title', pick(b.title_color, 'var(--color-heading)')); put(el, '--bb2-desc', pick(b.desc_color, 'var(--color-text)'));
        const src = b.icon_source || 'icon', ic = q('.bb2__icon', el);
        put(ic, 'hidden', src === 'none');
        put(ic, 'icon', iconValue(src, b, {image: 'image', svg: 'svg_code', lib: 'icon'}));
        const t = q('.bb2__title', el); put(t, 'text', b.title || ''); put(t, 'hidden', !String(b.title || '').trim()); put(t, '@data-own-size', tracking || null);
        const d = q('.bb2__desc', el); put(d, 'text', b.description || ''); put(d, 'hidden', !String(b.description || '').trim());
      }
    },
    setup(st) {
      const grid = st.root.querySelector('.bb2__grid'), sig = {signal: st.signal, passive: true};
      const hold = on => () => { st.held = on; autoplay(st); };
      if (grid) { for (const e of ['pointerdown', 'mouseenter', 'focusin']) grid.addEventListener(e, hold(true), sig); for (const e of ['pointerup', 'mouseleave', 'focusout']) grid.addEventListener(e, hold(false), sig); }
      phone.addEventListener('change', () => autoplay(st), {signal: st.signal});
      autoplay(st);
    },
    refresh: autoplay,
  });
})();

/* ---------- Benefits Icons ---------- */
(() => {
  const A = window.MateriaFeaturesA; if (!A || A.TYPES['benefits-icons2']) return;
  const {bool, num, px, color, imgSrc, common, custom, has} = A.helpers;
  /* The same order of choice as the Liquid: an upload wins when the type says so, then SVG code, a library icon, an image, a placeholder. */
  const iconOf = b => {
    let icon = b.icon, fa = String(b.font_awesome || '').trim(); const ci = imgSrc(b.custom_icon);
    if (b.icon_type === 'upload' && ci) { icon = 'none'; fa = ''; }
    if (fa) return JSON.stringify({t: 'svg', code: fa});
    if (icon && icon !== 'none') return JSON.stringify({t: 'lib', n: icon});
    if (ci) return JSON.stringify({t: 'img', src: ci, alt: ''});
    return JSON.stringify({t: 'lib', n: '__placeholder'});
  };
  A.define('benefits-icons2', {
    derive(c) {
      const {root, s, put, q} = c, own = custom(s), mobile = s.icons_mobile_layout || '2', pick = (v, f) => own ? color(v, f) : f;
      common(c, {bg: 'section_background'});
      put(root, '@data-mobile', mobile);
      put(root, '@data-circle', bool(s.make_icons_circle) ? 'true' : 'false');
      const v = {'--bic-w': num(s.inner_width, 100) + '%', '--bic-vm-d': px(s.vertical_margin), '--bic-vm-m': px(s.vertical_margin_mobile), '--bic-cols-d': String(num(s.icons_per_row_desktop, 4)),
        '--bic-cols-m': mobile === '1' || mobile === '3' ? mobile : '2', '--bic-gap': px(s.space_between_icons), '--bic-icon-d': px(s.icon_size, 50), '--bic-icon-m': px(s.icon_size_mobile, 38),
        '--bic-title-d': px(s.icon_title_size, 20), '--bic-title-m': px(s.icon_title_size_mobile, 16), '--bic-desc-d': px(s.icon_description_size, 14), '--bic-desc-m': px(s.icon_description_size_mobile, 12),
        '--bic-icon-color': pick(s.icon_color, 'var(--color-heading)'), '--bic-icon-bg': 'color-mix(in srgb, var(--bic-icon-color) 9%, transparent)',
        '--bic-title-color': pick(s.icon_title_color, 'var(--color-heading)'), '--bic-desc-color': pick(s.icon_description_color, 'var(--color-text)')};
      for (const k in v) put(root, k, v[k]);
      const list = q('.bic__list'); put(list, '@tabindex', mobile === 'slider' ? '0' : null); put(list, '@aria-label', mobile === 'slider' ? 'Benefits' : null);
      let heading = false;
      for (const {el, type, b} of c.blocks) {
        if (type === 'heading' && !heading) {
          heading = true;
          const ob = custom(b), al = b.heading_alignment === 'left' || b.heading_alignment === 'right' ? b.heading_alignment : 'center';
          put(el, 'rich', b.text || ''); put(el, 'hidden', !has(b.text)); put(el, '@data-own-weight', ob || null);
          put(el, '--bic-h-d', px(b.heading_size, 32)); put(el, '--bic-h-m', px(b.heading_size_mobile, 24)); put(el, '--bic-h-align', al);
          put(el, '--bic-h-above', px(b.space_above)); put(el, '--bic-h-below', px(b.space_below));
          put(el, '--bic-h-color', ob ? color(b.heading_color, 'var(--color-heading)') : 'var(--color-heading)');
          put(el, '--bic-h-w', b.heading_style === 'bold' ? '700' : '400');
        } else if (type === 'icon') {
          put(q('.bic__icon', el), 'icon', iconOf(b));
          const t = q('.bic__title', el); put(t, 'text', b.icon_title || ''); put(t, 'hidden', !String(b.icon_title || '').trim());
          const d = q('.bic__desc', el); put(d, 'rich', b.icon_description || ''); put(d, 'hidden', !has(b.icon_description));
        }
      }
    },
  });
})();

/* ---------- Benefits Tabs (and the cards' open and close) ---------- */
(() => {
  const A = window.MateriaFeaturesA; if (!A || A.TYPES['benefits-tabs']) return;
  const {bool, num, px, color, imgSrc, common, custom, has, iconValue, button} = A.helpers;
  const TINT = 'color-mix(in srgb, var(--color-heading) 6%, var(--color-background))', ICON_BG = 'color-mix(in srgb, var(--color-heading) 8%, transparent)';
  const EMPTY = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  /* Open: draw the content folded (data-opening), then let it unfold. Close: fold first, then close. Reduced motion: at once. */
  function toggle(item, st) {
    const panel = item.querySelector('.btab__panel');
    if (st.reduced.matches || !panel) { item.removeAttribute('data-closing'); item.removeAttribute('data-opening'); item.open = !item.open; return; }
    if (item.open && !item.hasAttribute('data-closing')) {
      item.removeAttribute('data-opening'); item.setAttribute('data-closing', '');
      let done = false; const end = () => { if (done || !item.hasAttribute('data-closing')) return; done = true; item.removeAttribute('data-closing'); item.open = false; };
      panel.addEventListener('transitionend', end, {once: true}); setTimeout(end, 520);
    } else {
      item.removeAttribute('data-closing'); item.setAttribute('data-opening', ''); item.open = true;
      requestAnimationFrame(() => requestAnimationFrame(() => item.removeAttribute('data-opening')));
    }
  }
  A.define('benefits-tabs', {
    derive(c) {
      const {root, s, put, q} = c, own = custom(s), pick = (v, f) => own ? color(v, f) : f;
      common(c, {widthDefault: 'container'});
      const v = {'--btab-cols-d': String(num(s.cols_desktop, 4)), '--btab-cols-m': String(s.cols_mobile) === '2' ? '2' : '1', '--btab-gap-m': px(s.tab_gap, 16), '--btab-gap-d': px(s.tab_gap_desktop, 20),
        '--btab-pad': px(s.tab_padding, 18), '--btab-radius': px(s.tab_radius), '--btab-bw': px(s.tab_border_width), '--btab-title-size': px(s.tab_title_size, 16), '--btab-desc-size': px(s.tab_desc_size, 14),
        '--btab-box': px(s.icon_box_size, 40), '--btab-icon-size': px(s.icon_size, 22), '--btab-hgap': px(s.gap_header_blocks, 14), '--btab-to-tabs': px(s.gap_header_to_tabs, 32), '--btab-to-cta': px(s.gap_tabs_to_cta),
        '--btab-bg': pick(s.tab_bg, TINT), '--btab-border': pick(s.tab_border_color, 'var(--color-border)'), '--btab-chev': pick(s.tab_chev_color, 'var(--color-primary)'), '--btab-desc': pick(s.tab_desc_color, 'var(--color-text)')};
      for (const k in v) put(root, k, v[k]);
      put(q('details[data-first]'), '@open', bool(s.open_first_by_default) || null);
      for (const {el, type, b} of c.blocks) {
        const ob = custom(b);
        if (type === 'top_icon') {
          const src = imgSrc(b.image);
          put(el, 'src', src || EMPTY); put(el, '@alt', (b.image && typeof b.image === 'object' && b.image.alt) || ''); put(el, '.is-empty', !src); put(el, '--btab-top', px(b.size, 64)); put(el, '@width', String(num(b.size, 64))); put(el, '@height', String(num(b.size, 64)));
        } else if (type === 'heading') {
          put(el, 'rich', b.text || ''); put(el, 'hidden', !has(b.text)); put(el, '@data-own-weight', ob || null);
          put(el, '--btab-h-d', px(b.size_desktop, 44)); put(el, '--btab-h-m', px(b.size_mobile, 32)); put(el, '--btab-h-w', String(b.weight || 700));
          put(el, '--btab-h-color', ob ? color(b.color, 'var(--color-heading)') : 'var(--color-heading)');
        } else if (type === 'subheading') {
          put(el, 'text', b.text || ''); put(el, 'hidden', !String(b.text || '').trim());
          put(el, '--btab-s-d', px(b.size_desktop, 17)); put(el, '--btab-s-m', px(b.size_mobile, 15));
          put(el, '--btab-s-color', ob ? color(b.color, 'var(--color-text)') : 'var(--color-text)');
        } else if (type === 'tab') {
          const p2 = (x, f) => ob ? color(x, f) : f;
          put(el, '--btab-icon', p2(b.icon_color, 'var(--color-heading)')); put(el, '--btab-icon-bg', p2(b.icon_box_bg, ICON_BG)); put(el, '--btab-title', p2(b.title_color, 'var(--color-heading)'));
          const src = b.icon_source || 'icon', ic = q('.btab__icon', el);
          put(ic, 'hidden', src === 'none'); put(ic, 'icon', iconValue(src, b, {image: 'image', svg: 'svg_code', lib: 'icon'}));
          put(q('.btab__title', el), 'text', b.title || '');
          const d = q('.btab__desc', el); put(d, 'text', b.description || ''); put(d, 'hidden', !String(b.description || '').trim());
        } else if (type === 'cta') {
          put(el, 'hidden', !String(b.label || '').trim());
          const btn = button(c, q('.btab__cta', el), b, {bg: 'bg', hoverBg: 'bg_hover', text: 'text_color', hoverText: 'text_color_hover'});
          put(btn, 'text', b.label || '');
        }
      }
    },
    setup(st) {
      st.root.addEventListener('click', e => {
        const sum = e.target.closest('summary'), item = sum && sum.parentElement;
        if (!item || !item.matches('details.btab__item') || !st.root.contains(item)) return;
        e.preventDefault(); toggle(item, st);
      }, {signal: st.signal});
    },
  });
})();

/* ---------- Benefits Circles ---------- */
(() => {
  const A = window.MateriaFeaturesA; if (!A || A.TYPES['benefits-circles']) return;
  const {bool, num, px, color, url, imgSrc, common, custom, has} = A.helpers;
  A.define('benefits-circles', {
    derive(c) {
      const {root, s, put, q} = c, own = custom(s), align = s.header_align === 'left' || s.header_align === 'right' ? s.header_align : 'center';
      common(c);
      put(root, '@data-show', s.show_section_on === 'mobile' || s.show_section_on === 'desktop' ? s.show_section_on : 'all');
      put(root, '@data-hover', s.hover_effect || 'none');
      put(root, '@data-connector', bool(s.show_connector) ? 'true' : 'false');
      const v = {'--bcir-w-d': px(s.section_max_width_desktop, 1200), '--bcir-w-t': px(s.section_max_width_tablet, 900), '--bcir-w-m': px(s.section_max_width_mobile, 560),
        '--bcir-cols-d': String(num(s.cols_desktop, 4)), '--bcir-cols-m': String(num(s.cols_mobile, 2)), '--bcir-col-d': px(s.col_gap_desktop), '--bcir-col-m': px(s.col_gap_mobile),
        '--bcir-row-d': px(s.row_gap_desktop), '--bcir-row-m': px(s.row_gap_mobile), '--bcir-item-max': px(s.item_max_width, 220), '--bcir-align': align,
        '--bcir-flex': align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center', '--bcir-hgap-d': px(s.gap_header), '--bcir-hgap-m': px(s.gap_header_mobile),
        '--bcir-hs-d': px(s.heading_sub_gap_desktop), '--bcir-hs-m': px(s.heading_sub_gap_mobile), '--bcir-l-max': px(s.label_max_width, 200), '--bcir-lgap-d': px(s.label_gap), '--bcir-lgap-m': px(s.label_gap_mobile),
        '--bcir-sgap': px(s.sublabel_gap), '--bcir-c-d': px(s.circle_size_desktop, 96), '--bcir-c-m': px(s.circle_size_mobile, 80), '--bcir-bw': px(s.circle_border_width), '--bcir-i-d': px(s.icon_size_desktop, 36), '--bcir-i-m': px(s.icon_size_mobile, 32)};
      Object.assign(v, own ? {'--bcir-c-bg-s': color(s.circle_bg, 'var(--color-background)'), '--bcir-c-border-s': color(s.circle_border_color, 'var(--color-border)'), '--bcir-c-icon-s': color(s.icon_color, 'var(--color-heading)'),
        '--bcir-connector': color(s.connector_color, 'var(--color-primary)'), '--bcir-l-color': color(s.label_color, 'var(--color-heading)'), '--bcir-sl-color': color(s.sublabel_color, 'var(--color-text)'),
        '--bcir-shadow': String(s.circle_shadow || 'none').replace(/;/g, '').replace(/"/g, ''), '--bcir-l-w': String(s.label_weight || 600), '--bcir-l-d': px(s.label_size_desktop, 16), '--bcir-l-m': px(s.label_size_mobile, 14),
        '--bcir-l-lh': String(num(s.label_line_height, 1.4)), '--bcir-sl-size': px(s.sublabel_size, 13)}
        : {'--bcir-c-bg-s': 'var(--color-background)', '--bcir-c-border-s': 'var(--color-border)', '--bcir-c-icon-s': 'var(--color-heading)', '--bcir-connector': 'var(--color-border)', '--bcir-l-color': 'var(--color-heading)',
          '--bcir-sl-color': 'var(--color-text)', '--bcir-shadow': 'var(--btn-shadow, none)', '--bcir-l-w': '600', '--bcir-l-d': 'var(--body-font-size, 16px)', '--bcir-l-m': 'var(--body-font-size, 16px)',
          '--bcir-l-lh': 'var(--body-line-height, 1.5)', '--bcir-sl-size': 'var(--body-font-size, 16px)'});
      for (const k in v) put(root, k, v[k]);
      for (const {el, type, b} of c.blocks) {
        const ob = custom(b);
        if (type === 'heading') {
          put(el, 'rich', b.text || ''); put(el, 'hidden', !has(b.text)); put(el, '@data-own-weight', ob || null); put(el, '@data-own-size', ob || null);
          const hv = ob ? {'--bcir-h-color': color(b.color, 'var(--color-heading)'), '--bcir-h-w': String(b.weight || 700), '--bcir-h-d': px(b.size_desktop, 48), '--bcir-h-m': px(b.size_mobile, 30), '--bcir-h-lh': String(num(b.line_height, 1.2)), '--bcir-h-ls': px(b.tracking)}
            : {'--bcir-h-color': 'var(--color-heading)', '--bcir-h-w': 'var(--heading-weight, 700)', '--bcir-h-d': 'var(--h2-size, 32px)', '--bcir-h-m': 'var(--h2-size, 32px)', '--bcir-h-lh': 'var(--heading-line-height, 1.2)', '--bcir-h-ls': 'var(--heading-letter-spacing, normal)'};
          for (const k in hv) put(el, k, hv[k]);
        } else if (type === 'subheading') {
          put(el, 'rich', b.text || ''); put(el, 'hidden', !has(b.text)); put(el, '--bcir-s-max', px(b.max_width, 580));
          const sv = ob ? {'--bcir-s-color': color(b.color, 'var(--color-text)'), '--bcir-s-size': px(b.size, 16), '--bcir-s-lh': String(num(b.line_height, 1.5))} : {'--bcir-s-color': 'var(--color-text)', '--bcir-s-size': 'var(--body-font-size, 16px)', '--bcir-s-lh': 'var(--body-line-height, 1.5)'};
          for (const k in sv) put(el, k, sv[k]);
        } else if (type === 'circle') {
          put(el, '--bcir-c-bg', ob ? color(b.circle_bg, 'var(--bcir-c-bg-s)') : null); put(el, '--bcir-c-border', ob ? color(b.circle_border_color, 'var(--bcir-c-border-s)') : null); put(el, '--bcir-c-icon', ob ? color(b.icon_color, 'var(--bcir-c-icon-s)') : null);
          put(q('.bcir__item', el), 'href', url(b.link));
          const t = b.icon_type || 'preset', src = imgSrc(b.icon_image);
          put(q('.bcir__circle', el), '.bcir__circle--full', t === 'image' && !!src && bool(b.icon_fill_circle));
          put(q('.bcir__icon', el), 'icon', JSON.stringify(t === 'svg' ? (String(b.icon_svg || '').trim() ? {t: 'svg', code: b.icon_svg} : {t: 'none'}) : t === 'image' ? (src ? {t: 'img', src, alt: ''} : {t: 'none'}) : {t: 'lib', n: b.icon_preset || 'check'}));
          const l = q('.bcir__label', el); put(l, 'rich', b.label || ''); put(l, 'hidden', !has(b.label)); put(l, '@data-own-weight', own || null); put(l, '@data-own-size', own || null);
          const sl = q('.bcir__sublabel', el); put(sl, 'rich', b.sublabel || ''); put(sl, 'hidden', !has(b.sublabel));
        }
      }
    },
  });
})();

/* ---------- Product Benefits Pro (benefits2) ---------- */
(() => {
  const A = window.MateriaFeaturesA; if (!A || A.TYPES['benefits2']) return;
  const {bool, num, px, color, url, imgSrc, common, custom, has} = A.helpers;
  const SHADOW = {low: '0 1px 3px rgba(0, 0, 0, 0.1)', medium: '0 4px 6px rgba(0, 0, 0, 0.1)', high: '0 10px 20px rgba(0, 0, 0, 0.2)'};
  const CIRCLE = 'color-mix(in srgb, var(--color-heading) 8%, transparent)';
  /* The video plays only on screen, in a visible tab and without reduced motion. */
  function video(st) {
    const v = st.root.querySelector('.pbp__media video'); if (!v) return;
    if (st.reduced.matches || !st.visible || document.hidden) { v.autoplay = false; v.removeAttribute('autoplay'); if (!v.paused) v.pause(); }
    else if (v.paused) { v.muted = true; const p = v.play && v.play(); if (p && p.catch) p.catch(() => {}); }
  }
  A.define('benefits2', {
    derive(c) {
      const {root, s, put, q} = c, own = custom(s), fonts = bool(s.enable_custom_fonts), pick = (v, f) => own ? color(v, f) : f;
      common(c);
      put(root, '@data-hover', s.image_hover_animation || 'none');
      const v = {'--pbp-radius': px(s.image_border_radius), '--pbp-shadow': SHADOW[s.image_shadow] || 'none', '--pbp-title-size': px(s.feature_title_font_size, 20), '--pbp-desc-size': px(s.feature_description_font_size, 14),
        '--pbp-title-w': s.feature_title_font_weight === 'lighter' ? '300' : s.feature_title_font_weight === 'bold' ? '700' : '400',
        '--pbp-title': pick(s.feature_title_color, 'var(--color-heading)'), '--pbp-desc': pick(s.feature_description_color, 'var(--color-text)')};
      for (const k in v) put(root, k, v[k]);
      const vid = bool(s.enable_centered_video) && String(s.video_url || '').trim() ? url(String(s.video_url).trim(), true) : '', img = imgSrc(s.center_image);
      put(q('.pbp__media'), 'media', JSON.stringify(vid ? {t: 'video', src: vid} : img ? {t: 'img', src: img, alt: (s.center_image && s.center_image.alt) || ''} : {t: 'ph'}));
      for (const {el, type, b} of c.blocks) {
        if (type !== 'feature') continue;
        const ob = custom(b);
        put(el, '@data-circle', bool(b.enable_icon_circle_bg) ? 'true' : 'false');
        put(el, '--pbp-icon', ob ? color(b.icon_color, 'var(--color-heading)') : 'var(--color-heading)');
        put(el, '--pbp-circle-bg', ob ? color(b.icon_circle_bg_color, CIRCLE) : CIRCLE);
        put(el, '--pbp-icon-size', px(b.svg_icon_size, 40)); put(el, '--pbp-circle-size', px(b.icon_circle_bg_size, 50)); put(el, '--pbp-circle-radius', num(b.icon_circle_border_radius) + '%');
        put(q('.pbp__icon', el), 'icon', JSON.stringify(String(b.svg_icon_code || '').trim() ? {t: 'svg', code: b.svg_icon_code} : {t: 'lib', n: b.icon || 'none'}));
        const t = q('.pbp__title', el); put(t, 'rich', b.title || ''); put(t, 'hidden', !has(b.title)); put(t, '@data-own-weight', fonts || null);
        const d = q('.pbp__desc', el); put(d, 'text', b.description || ''); put(d, 'hidden', !String(b.description || '').trim());
      }
    },
    setup: video,
    refresh: video,
  });
})();

/* ---------- Benefits Bar (its static rules are benefits-bar.css) ---------- */
(() => {
  const A = window.MateriaFeaturesA; if (!A || A.TYPES['benefits-bar']) return;
  const {bool, num, color, imgSrc, common, custom, has} = A.helpers;
  const raw = v => (v == null ? '' : String(v)) + 'px';
  const iconOf = b => {
    let icon = b.icon, fa = String(b.font_awesome || '').trim(); const ci = imgSrc(b.custom_icon);
    if (b.icon_type === 'upload' && ci) { icon = 'none'; fa = ''; }
    if (fa) return JSON.stringify({t: 'svg', code: fa});
    if (icon && icon !== 'none') return JSON.stringify({t: 'lib', n: icon});
    if (ci) return JSON.stringify({t: 'img', src: ci, alt: ''});
    return JSON.stringify({t: 'lib', n: '__placeholder'});
  };
  /* "Mobile layout: slider": one benefit at a time on a phone, the arrows step through them (the same as benefits-bar.js, which marks a list it has set up). */
  function slider(st) {
    const list = st.root.querySelector('.LoudzValueIconsBarList--mobileLayout-slider');
    if (!list || list.__bbInit) return;
    list.__bbInit = true;
    const slides = [...st.root.querySelectorAll('.LoudzValueIconsBarBlock__Slide')], prev = st.root.querySelector('.LoudzValueIconsBarContainer__Btn--prev'), next = st.root.querySelector('.LoudzValueIconsBarContainer__Btn--next');
    if (slides.length <= 1) { if (prev) prev.style.display = 'none'; if (next) next.style.display = 'none'; return; }
    let i = 0;
    const show = n => { i = (n + slides.length) % slides.length; slides.forEach((s, k) => s.classList.toggle('LoudzValueIconsBarBlock__Slide-IsVisible', k === i)); };
    if (prev) prev.addEventListener('click', () => show(i - 1), {signal: st.signal});
    if (next) next.addEventListener('click', () => show(i + 1), {signal: st.signal});
    show(0);
  }
  A.define('benefits-bar', {
    derive(c) {
      const {root, s, put, q} = c, own = custom(s), pick = (v, f) => own ? color(v, f) : f;
      common(c, {bg: false, pad: ['-', '-', '-', '-']});
      for (const w of ['container', 'fluid_container', 'stretch_width', 'full_width']) put(root, '.' + w, s.section_width === w);
      put(root, '.remove_spacing', bool(s.reset_spacing));
      put(root, '.LoudzValueIconsBar--fullWidth', num(s.bar_width) === 100);
      const style = own && s.section_background_style === 'gradient' ? 'gradient' : 'color', box = q('.LoudzValueIconsBarContainer');
      put(box, '.LoudzValueIconsBarContainer--backgroundStyle-color', style === 'color'); put(box, '.LoudzValueIconsBarContainer--backgroundStyle-gradient', style === 'gradient');
      const v = {'--section-top-margin': '0px', '--section-bottom-margin': '0px', '--section-top-margin-mobile': '0px', '--section-bottom-margin-mobile': '0px', '--section-left-margin': raw(s.left_margin_desktop), '--section-right-margin': raw(s.right_margin_desktop), '--section-top-padding': raw(s.top_padding_desktop), '--section-bottom-padding': raw(s.bottom_padding_desktop),
        '--section-left-padding': raw(s.left_padding_desktop), '--section-right-padding': raw(s.right_padding_desktop), '--section-left-margin-mobile': raw(s.left_margin_mobile), '--section-right-margin-mobile': raw(s.right_margin_mobile),
        '--section-top-padding-mobile': raw(s.top_padding_mobile), '--section-bottom-padding-mobile': raw(s.bottom_padding_mobile), '--section-left-padding-mobile': raw(s.left_padding_mobile), '--section-right-padding-mobile': raw(s.right_padding_mobile),
        '--section-width': (s.bar_width ?? '') + '%', '--horizontal-gap-desktop': raw(s.horizontal_gap_desktop), '--horizontal-gap-mobile': raw(s.horizontal_gap_mobile), '--vertical-gap-mobile': raw(s.vertical_gap_mobile),
        '--section-background-color': pick(s.section_background, 'var(--color-background)'), '--section-background-gradient': own ? String(s.section_gradient || 'none') : 'none',
        '--section-icon-color': pick(s.icon_color, 'var(--color-heading)'), '--section-icon-title-color': pick(s.icon_title_color, 'var(--color-heading)'),
        '--section-icon-title-weight': !s.icon_title_style || s.icon_title_style === 'theme' ? 'var(--subheading-weight, 500)' : String(s.icon_title_style),
        '--section-icon-size': raw(s.icon_size), '--section-icon-title-size': raw(s.icon_title_size), '--icon-border-radius': bool(s.enable_circle_icons) ? '50%' : '0', '--section-icons-per-row-desktop': String(s.icons_per_row_desktop ?? '')};
      for (const k in v) put(root, k, v[k]);
      for (const {el, type, b} of c.blocks) {
        if (type !== 'icon') continue;
        put(q('.LoudzValueIconsBarBlock__Icon', el), 'icon', iconOf(b));
        const t = q('.LoudzValueIconsBarBlock__Heading', el); put(t, 'rich', b.icon_title || ''); put(t, 'hidden', !has(b.icon_title));
      }
    },
    setup: slider,
  });
})();
