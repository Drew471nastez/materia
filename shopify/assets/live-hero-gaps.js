/* Materia Themes. Live editor paint for Promo Banner 3 (sections/banner3).

   The root [data-hg] carries its section id and settings as JSON, every
   block [data-hg-block] its own. derive() turns settings into outputs per
   element (a CSS variable, a style, an attribute, a class, text, a link).
   The Liquid prints the same outputs, so on load the first derive is only
   recorded, never painted. After that an output is written only when its
   value changes, at most once per frame per root, so an unrelated edit
   leaves the rest of the section alone. A redraw (storelib:section-load)
   brings a new root, which is set up once; roots that leave the page are
   dropped. audit(root) lists outputs whose markup differs from the derived
   value (used by the tests). */
(() => {
  if (window.MateriaHeroGaps) return;
  const SEL = '[data-hg]';
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const isFalse = v => v === false || v === 'false';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const raw = v => v == null ? '' : String(v);
  const dflt = (v, d) => v == null || v === '' ? d : v;
  const blank = v => v == null || (typeof v === 'string' && v.trim() === '');
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => {
    if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; }
    v = typeof v === 'string' ? v.trim() : '';
    if (!v || v === 'transparent' || /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(v) || /^#00000000$/i.test(v) || !CSS.supports('color', v)) return f;
    return v;
  };
  const color = (v, f) => { const a = api(); return (a && a.color ? a.color(v, f) : localColor(v, f)) || f; };
  const localUrl = v => {
    v = v && typeof v === 'object' ? v.url || v.href || v.value : v;
    if (typeof v !== 'string' || !v) return '';
    if (/^\/(?!\/)/.test(v) || /^#/.test(v)) return v;
    try { return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return ''; }
  };
  const url = v => { const a = api(); return (a && a.url ? a.url(v, false) : '') || localUrl(v); };
  const scheme = s => { const v = s.color_scheme && s.color_scheme.id || s.color_scheme; return typeof v === 'string' && /^[\w-]+$/.test(v) ? v : ''; };

  /* ---------- writers ---------- */
  function noReveal(wrap, on) {
    const m = wrap.querySelector(':scope > span[data-ti-no-reveal]');
    if (on && !m) { const n = document.createElement('span'); n.setAttribute('data-ti-no-reveal', ''); n.hidden = true; wrap.prepend(n); }
    else if (!on && m) m.remove();
  }
  function write(el, key, v) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '$') { const p = key.slice(1); if (v == null || v === '') el.style.removeProperty(p); else el.style.setProperty(p, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '~') { const pre = key.slice(1); for (const c of [...el.classList]) if (c.startsWith(pre)) el.classList.remove(c); if (v) el.classList.add(pre + v); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') { if (el.textContent !== raw(v)) el.textContent = raw(v); }
    else if (key === 'href') { if (v) el.setAttribute('href', v); else el.removeAttribute('href'); }
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); if (v) el.classList.add('color-' + v); }
    else if (key === 'noReveal') noReveal(el, !!v);
  }

  /* ---------- section types ---------- */
  const TYPES = {};
  const px = v => raw(v) + 'px';
  const FLEX = {left: 'flex-start', right: 'flex-end'};
  const SHADOW = {sm: '0 1px 3px rgba(0,0,0,0.08)', md: '0 6px 20px rgba(0,0,0,0.08)', lg: '0 16px 40px rgba(0,0,0,0.12)'};
  TYPES.banner3 = {
    /* a redraw keeps the wrapper: margins a live edit wrote there give way to the new markup */
    setup(root) { const w = root.parentElement; if (w) for (const k of ['--rm3-mt-m', '--rm3-mb-m', '--rm3-mt-d', '--rm3-mb-d']) w.style.removeProperty(k); },
    derive({root, s, put, blocks, q}) {
      const wrap = root.parentElement, hero = q('.rm-hero'), themeAnim = root.hasAttribute('data-theme-anim');
      const customText = bool(s.use_custom_text), customBg = bool(s.use_custom_bg);
      /* wrapper: margins, reveal marker */
      if (wrap) {
        put(wrap, '--rm3-mt-m', dflt(s.section_margin_top_mobile, 0) + 'px');
        put(wrap, '--rm3-mb-m', dflt(s.section_margin_bottom_mobile, 0) + 'px');
        put(wrap, '--rm3-mt-d', dflt(s.section_margin_top_desktop, 0) + 'px');
        put(wrap, '--rm3-mb-d', dflt(s.section_margin_bottom_desktop, 0) + 'px');
        put(wrap, 'noReveal', isFalse(s.reveal));
      }
      /* outer section */
      put(root, 'scheme', scheme(s) || 'default-color-scheme');
      put(root, '@data-reset-spacing', bool(s.reset_spacing));
      put(root, '@data-hide-mobile', isFalse(s.show_mobile));
      put(root, '@data-hide-desktop', isFalse(s.show_desktop));
      put(root, '--rm-heading-c', customText ? color(s.heading_color, 'var(--color-heading, currentColor)') : 'var(--color-heading, currentColor)');
      put(root, '--rm-text-c', customText ? color(s.text_color, 'var(--color-text, currentColor)') : 'var(--color-text, currentColor)');
      put(root, '--rm3-bg', customBg ? color(s.section_bg_color, 'var(--color-background, transparent)') : 'var(--color-background, transparent)');
      put(root, '--rm3-pt-m', dflt(s.section_padding_top_mobile, 40) + 'px');
      put(root, '--rm3-pb-m', dflt(s.section_padding_bottom_mobile, 40) + 'px');
      put(root, '--rm3-pt-d', dflt(s.section_padding_top, 60) + 'px');
      put(root, '--rm3-pb-d', dflt(s.section_padding_bottom, 60) + 'px');
      put(q('.rm3__container'), '~rm3__container--', dflt(s.section_width, 'stretch_width'));
      /* banner card */
      if (hero) {
        let grad = '', solid = '';
        if (customBg && bool(s.enable_bg_gradient) && !blank(s.bg_gradient)) { if (String(s.bg_gradient).includes('gradient')) grad = String(s.bg_gradient); else solid = String(s.bg_gradient); }
        const surface = dflt(s.banner_surface, 'soft'), tint = dflt(s.banner_tint, 6);
        const bg = solid || (customBg && !blank(s.bg_color) ? color(s.bg_color, 'var(--color-background)')
          : surface === 'soft' ? 'color-mix(in srgb, var(--rm-text-c) ' + tint + '%, var(--color-background, #ffffff))' : 'var(--color-background, transparent)');
        const align = raw(s.text_align), mAlign = !blank(s.mobile_text_align) && s.mobile_text_align !== 'inherit' ? raw(s.mobile_text_align) : align;
        put(hero, '@data-hover-lift', bool(s.hover_lift));
        put(hero, '@data-button-full-mobile', bool(s.mobile_button_full));
        put(hero, '@data-reveal', bool(s.reveal) && !themeAnim ? dflt(s.reveal_style, 'fade') : null);
        put(hero, '--rm-bg', bg);
        put(hero, '--rm-gradient', grad || 'none');
        put(hero, '--rm-overlay', color(s.overlay_color, '#000000'));
        put(hero, '--rm-overlay-opacity', customBg ? num(s.overlay_opacity, 0) / 100 : 0);
        put(hero, '--rm-content-max', px(s.max_width));
        put(hero, '--rm-align', align);
        put(hero, '--rm-flex', FLEX[align] || 'center');
        put(hero, '--rm-align-m', mAlign);
        put(hero, '--rm-flex-m', FLEX[mAlign] || 'center');
        put(hero, '--rm-gap', px(s.stack_gap));
        put(hero, '--rm-pt', px(s.pad_top_desktop));
        put(hero, '--rm-pb', px(s.pad_bottom_desktop));
        put(hero, '--rm-pt-m', px(s.pad_top_mobile));
        put(hero, '--rm-pb-m', px(s.pad_bottom_mobile));
        put(hero, '--rm-section-pad-left', px(s.section_pad_left));
        put(hero, '--rm-section-pad-right', px(s.section_pad_right));
        put(hero, '--rm-section-pad-left-m', px(s.section_pad_left_mobile));
        put(hero, '--rm-section-pad-right-m', px(s.section_pad_right_mobile));
        put(hero, '--rm-section-radius', bool(s.use_theme_radius) ? 'var(--rounded-radius, var(--card-corner-radius, var(--theme-card-radius, var(--border-radius, 8px))))' : px(s.section_border_radius));
        put(hero, '--rm-border-w', dflt(s.banner_border_width, 0) + 'px');
        put(hero, '--rm-border-c', color(s.banner_border_color, 'var(--color-border, rgba(0,0,0,0.12))'));
        put(hero, '--rm-shadow', SHADOW[s.banner_shadow] || 'none');
        put(hero, '--rm-sub-btn-gap', px(s.sub_btn_gap));
        put(hero, '--rm-inner-pad', px(s.side_padding));
        put(hero, '--rm-reveal-range', dflt(s.reveal_range, 60) + '%');
      }
      /* blocks */
      for (const {el, type, b} of blocks) {
        const own = bool(b.enable_custom_style), on = v => own ? v : null;
        const v = n => '--rm-' + (type === 'subheading' ? 'sub' : type) + '-' + n;
        if (type === 'button') {
          const shape = own && isFalse(b.use_theme_button), cv = x => own ? color(x, '') || null : null;
          put(el, 'text', b.label);
          put(el, 'href', blank(b.link) ? null : url(b.link));
          put(el, 'hidden', blank(b.label) || blank(b.link));
          put(el, '@data-custom', own); put(el, '@data-own-weight', own); put(el, '@data-own-shape', shape);
          put(el, '--mb-bg', cv(b.bg)); put(el, '--mb-text', cv(b.text_color)); put(el, '--mb-border', cv(b.border_color) || cv(b.bg));
          put(el, '$background-color', own && !blank(b.bg) ? color(b.bg, 'transparent') : null);
          put(el, '$color', own && !blank(b.text_color) ? color(b.text_color, 'currentColor') : null);
          put(el, '$border-color', own && !blank(b.border_color) ? color(b.border_color, 'transparent') : null);
          put(el, '--mb-weight', on(raw(b.weight)));
          const sp = x => shape ? px(x) : null;
          put(el, '--btn-border-width', sp(b.border_width)); put(el, '--mb-radius', sp(b.radius));
          put(el, '--mb-padding-y', sp(b.pad_v)); put(el, '--mb-padding-x', sp(b.pad_h));
          put(el, '--rm-btn-size-d', sp(b.size_d)); put(el, '--rm-btn-size-m', sp(b.size_m));
          continue;
        }
        if (!['eyebrow', 'heading', 'subheading'].includes(type)) continue;
        put(el, 'text', b.text);
        put(el, 'hidden', blank(b.text));
        put(el, '@data-custom', own); put(el, '@data-own-font', own); put(el, '@data-own-weight', own); put(el, '@data-own-size', own);
        if (type !== 'eyebrow') put(el, '$max-width', num(b.max_width) > 0 ? raw(b.max_width) + 'ch' : null);
        /* heading defaults to the heading font, eyebrow and subheading to the body font */
        const headingFont = type === 'heading' ? b.font !== 'body' : b.font === 'heading';
        const themeWeight = b.weight === 'theme' || (type === 'subheading' && blank(b.weight));
        put(el, v('color'), on(color(b.color, type === 'subheading' ? 'var(--rm-text-c)' : 'var(--rm-heading-c)')));
        put(el, v('font'), on(headingFont ? 'var(--rm-font-heading)' : 'var(--rm-font-body)'));
        put(el, v('weight'), on(themeWeight ? (headingFont ? 'var(--rm-weight-heading)' : 'var(--rm-weight-body)') : raw(b.weight)));
        put(el, v('transform'), on(dflt(b.transform, 'none')));
        put(el, v('letterspace'), on((type === 'subheading' ? dflt(b.letterspace, 0) : raw(b.letterspace)) + 'em'));
        put(el, v('lineheight'), on(dflt(b.lineheight, {eyebrow: '1.4', heading: '1.15', subheading: '1.5'}[type])));
        if (type !== 'heading') put(el, v('opacity'), on(num(b.opacity, 0) / 100));
        put(el, v('size-d'), on(px(b.size_d)));
        put(el, v('size-m'), on(px(b.size_m)));
      }
    }
  };

  /* ---------- engine ---------- */
  function derive(root, st, record) {
    const type = TYPES[root.dataset.hg], out = [];
    const put = (el, key, v) => {
      if (!el) return;
      out.push([el, key, v]);
      if (record === 'audit') return;
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return; }
      if (m.has(key) && m.get(key) === v) return;
      m.set(key, v);
      write(el, key, v);
    };
    const blocks = [...root.querySelectorAll('[data-hg-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.hgBlock;
      if (st.rawBlocks.get(id) !== el.dataset.hgSettings) { st.rawBlocks.set(id, el.dataset.hgSettings); st.blocks.set(id, {...parse(el.dataset.hgSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.hgType, b: st.blocks.get(id)};
    });
    if (type) type.derive({root, st, s: st.s, put, blocks, q: (sel, scope = root) => scope.querySelector(sel)});
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.hgSettings) { st.raw = root.dataset.hgSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
  }
  function drop(root, st) { cancelAnimationFrame(st.frame); roots.delete(root); }
  function add(root) {
    if (!TYPES[root.dataset.hg]) return;
    const st = {root, live: {}, liveBlocks: new Map(), s: parse(root.dataset.hgSettings), raw: root.dataset.hgSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), frame: 0};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    roots.set(root, st);
    if (TYPES[root.dataset.hg].setup) TYPES[root.dataset.hg].setup(root);
    derive(root, st, true);
    root.dataset.hgReady = '';
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
      if (root.dataset.hgSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); if (st.blocks.has(bid)) st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-hg-block]') || n.querySelector(SEL + ',[data-hg-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-hg-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-hg-settings']});

  /* ---------- audit (tests) ---------- */
  const norm = v => String(v ?? '').trim().replace(/\s+/g, ' ').replace(/-?\d*\.?\d+/g, n => String(+n));
  const probe = document.createElement('i');
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = norm(el === root.parentElement ? getComputedStyle(el).getPropertyValue(key) : el.style.getPropertyValue(key)); want = v == null ? '' : norm(v); }
      else if (key[0] === '$') { const p = key.slice(1); have = el.style.getPropertyValue(p); probe.style.cssText = ''; if (v != null && v !== '') probe.style.setProperty(p, String(v)); want = probe.style.getPropertyValue(p); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key[0] === '~') { have = el.classList.contains(key.slice(1) + v); want = true; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'text') { have = el.textContent.trim(); want = raw(v).trim(); }
      else if (key === 'href') { have = el.getAttribute('href') || ''; want = v || ''; }
      else if (key === 'noReveal') { have = !!el.querySelector(':scope > [data-ti-no-reveal]'); want = !!v; }
      else continue;
      if (have !== want) bad.push((el.dataset.hgBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaHeroGaps = {TYPES, roots, scan, audit};
  Promise.resolve().then(scan);
})();
