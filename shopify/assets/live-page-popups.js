/* Materia Themes. Page popups: Countdown Promo Popup (countdown-promo-popup),
   Coupon Promo Popup (coupon-promotion-newsletter-popup), Promotion Popup
   Discount (promobanner), Promotional Newsletter 2 (promonewsletterpopup-2),
   Image Banner Popup (promotional-image-popup), Signup Discount Popup
   (promotional-popup), Promotional Popup 2 (promotionalpopup2), Spin Wheel
   Popup (spin-wheel-popup) and Back To Top Pro (back-to-top-pro). Loaded on
   every page by layout/theme.storelib.

   Each popup's own script registers it with shopify/assets/materia-popups.js
   (triggers, how often, one popup at a time, focus kept in and given back,
   remembered per section). This file puts that popup in the native <dialog>
   the section draws round it (snippets/page-popup-dialog):
   - on the live site it opens with showModal(): the page behind is inert,
     Escape (the dialog's cancel) closes it through the manager, so the
     close is remembered and focus goes back to what opened it;
   - in the builder it opens with show(): drawn in the page, never over it,
     the page still scrolls and every section can still be clicked;
   - closing is the manager's: its close button, Escape, a click on the
     backdrop, "no thanks".

   Live edits: a section's colour scheme is swapped on its root the moment
   it changes (storelib:settings-change). Every other setting is drawn by the
   builder again (storelib:section-load); a popup that was open in the
   builder opens again in its new markup without a flash, and its own script
   sets it up once (a redraw whose inline script did not run is set up from
   here, from that same script). Under reduced motion nothing animates. */
(() => {
  if (window.MateriaPagePopups) return;
  const NAMES = ['countdown-promo-popup', 'coupon-promotion-newsletter-popup', 'promobanner', 'promonewsletterpopup-2', 'promotional-image-popup', 'promotional-popup', 'promotionalpopup2', 'spin-wheel-popup', 'back-to-top-pro'];
  const SEL = '[data-pg-root]';
  const design = () => !!(window.Shopify && window.Shopify.designMode) || document.documentElement.classList.contains('shopify-design-mode') || !!(window.MateriaPopups && window.MateriaPopups.design);
  const opened = new Map();
  const sidOf = v => {
    if (v == null) return '';
    if (typeof v === 'object') v = v.id != null ? v.id : v.sectionId;
    return String(v == null ? '' : v).replace(/^shopify-section-/, '');
  };
  const rootFor = id => {
    const wrap = document.getElementById('shopify-section-' + id);
    return (wrap && wrap.querySelector(SEL)) || document.querySelector(SEL + '[data-pg-section="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  };
  const dialogFor = id => {
    const popup = document.querySelector('[data-popup-root="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (!popup) return null;
    return popup.closest('dialog[data-pg-dialog]') || popup.querySelector('dialog[data-pg-dialog]');
  };

  /* ---------- the dialog follows the manager ---------- */
  function openDialog(id) {
    const dlg = dialogFor(id);
    if (!dlg) return;
    const prev = opened.get(id);
    if (prev && prev !== dlg && prev.open) prev.close();
    opened.set(id, dlg);
    const modal = !design() && typeof dlg.showModal === 'function';
    if (dlg.open && dlg.matches(':modal') === modal) return;
    if (dlg.open) dlg.close();
    /* in the builder the open attribute alone: drawn in the page, and no
       focus is taken from the sidebar while the creator types */
    if (modal) { try { dlg.showModal(); } catch (_) { dlg.setAttribute('open', ''); } } else dlg.setAttribute('open', '');
  }
  function closeDialog(id) {
    const dlg = opened.get(id);
    opened.delete(id);
    if (dlg && dlg.open) { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
  }
  document.addEventListener('materia:popup-open', e => { const id = sidOf(e.detail); if (id) openDialog(id); });
  document.addEventListener('materia:popup-close', e => { const id = sidOf(e.detail); if (id) closeDialog(id); });
  /* Escape: the manager closes it (remembered, focus given back) */
  document.addEventListener('cancel', e => {
    const dlg = e.target;
    if (!dlg || !dlg.matches || !dlg.matches('dialog[data-pg-dialog]')) return;
    e.preventDefault();
    const popup = dlg.matches('[data-popup-root]') ? dlg : dlg.querySelector('[data-popup-root]') || dlg.closest('[data-popup-root]');
    const id = popup && popup.getAttribute('data-popup-root');
    const P = window.MateriaPopups;
    if (P && id && P.current() === id) P.close(id); else if (dlg.open) dlg.close();
  }, true);
  /* a dialog closed by the browser (not by the manager) tells the manager */
  document.addEventListener('close', e => {
    const dlg = e.target;
    if (!dlg || !dlg.matches || !dlg.matches('dialog[data-pg-dialog]')) return;
    for (const [id, d] of opened) if (d === dlg) { opened.delete(id); const P = window.MateriaPopups; if (P && P.current() === id) P.close(id); }
  }, true);

  /* ---------- live settings: the engine ----------
     Every root carries its settings (data-pg-settings) and every block
     element its own (data-pg-block, data-pg-type, data-pg-settings). A type's
     derive(c) turns the settings into outputs, the same values the Liquid
     prints: put(el, key, value) where key is a CSS variable (--x), an
     attribute (@name), a class toggle (?name), hidden, text, html, img (a
     picture: {src, alt}) or scheme. On load the first derive is only
     recorded; after that an output is written only when it changes, once
     per frame per root, so a picture never reloads and an open popup stays
     open for an unrelated edit. */
  const roots = new Map();
  const TYPES = {};
  let c0 = {};
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const off = v => v === false || v === 'false';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const colorOk = v => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return ''; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; if (!v || v === 'transparent' || /^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) || /^#[0-9a-f]{6}00$/i.test(v)) return ''; return v; };
  /* scheme-color snippet: an empty or transparent colour prints the fallback */
  const color = (v, f) => colorOk(v) || f;
  const font = v => v && typeof v === 'object' && v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
  const imgSrc = v => { v = v && typeof v === 'object' ? v.src || v.url || '' : v; return typeof v === 'string' ? v : ''; };
  const strip = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '');
  const blank = v => v == null || v === '' || (typeof v === 'string' && !v.trim()) || (typeof v === 'object' && !Object.keys(v).length);
  const esc = v => String(v == null ? '' : v);
  function write(el, key, v) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '?') el.classList.toggle(key.slice(1), !!v);
    else if (key.startsWith('style:')) { const n = key.slice(6); if (v == null || v === '') el.style.removeProperty(n); else el.style.setProperty(n, String(v)); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'html') el.innerHTML = v == null ? '' : String(v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (/^color-/.test(c)) el.classList.remove(c); if (v) el.classList.add('color-' + v); }
    else if (key === 'img') {
      const d = parse(v), cur = el.querySelector(':scope > img, :scope > svg, :scope > a > img, :scope > a > svg');
      if (d.src && cur && cur.tagName === 'IMG' && (cur.getAttribute('src') || '').split('?')[0] === d.src.split('?')[0]) { cur.alt = d.alt || ''; return; }
      let n;
      if (d.src) { n = document.createElement('img'); n.src = d.src; n.alt = d.alt || ''; if (d.cls) n.className = d.cls; if (d.lazy) n.loading = 'lazy'; if (d.w && d.h) { n.width = d.w; n.height = d.h; } }
      else { const tp = el.querySelector('template[data-pg-ph]'); if (!tp) return; n = tp.content.firstElementChild.cloneNode(true); }
      if (cur) cur.replaceWith(n); else { const a = el.querySelector(':scope > a'); (a || el).prepend(n); }
    }
  }
  /* snippets/button-overrides: a section's own button values on the theme contract */
  function buttonVars(put, el, o) {
    const bg = colorOk(o.bg), tx = colorOk(o.text), bd = colorOk(o.border), hb = colorOk(o.hover_bg), ht = colorOk(o.hover_text), hbd = colorOk(o.hover_border);
    put(el, '--mb-bg', bg || null); put(el, '--mb-text', tx || null); put(el, '--mb-border', bd || bg || null);
    put(el, '--mb-hover-bg', hb || null); put(el, '--mb-hover-text', ht || null); put(el, '--mb-hover-border', hbd || hb || null);
    const set = v => o.custom && v != null && v !== '';
    put(el, '--mb-radius', set(o.radius) ? o.radius + 'px' : null); put(el, '--mb-padding-y', set(o.padding_y) ? o.padding_y + 'px' : null);
    put(el, '--mb-padding-x', set(o.padding_x) ? o.padding_x + 'px' : null); put(el, '--mb-font-size', set(o.font_size) ? o.font_size + 'px' : null);
    put(el, '--mb-weight', set(o.weight) ? String(o.weight) : null); put(el, '--btn-border-width', set(o.border_width) ? o.border_width + 'px' : null);
    put(el, '--btn-text-transform', o.transform || null);
  }
  const ownColor = (b, k) => bool(b.enable_custom_style) ? b[k] : '';
  function derive(root, st, record) {
    const put = (el, key, v) => {
      if (!el) return el;
      if (record === 'audit') { st.audit.push([el, key, v]); return el; }
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      m.set(key, v); write(el, key, v); return el;
    };
    const els = [...root.querySelectorAll('[data-pg-block]')].filter(el => el.closest(SEL) === root);
    const byId = new Map();
    for (const el of els) {
      const id = el.dataset.pgBlock;
      if (!byId.has(id)) {
        if (el.dataset.pgSettings != null && st.rawBlocks.get(id) !== el.dataset.pgSettings) { st.rawBlocks.set(id, el.dataset.pgSettings); st.blocks.set(id, {...parse(el.dataset.pgSettings), ...(st.liveBlocks.get(id) || {})}); }
        byId.set(id, {id, type: el.dataset.pgType, el, els: [], b: st.blocks.get(id) || {}});
      }
      byId.get(id).els.push(el);
    }
    const blocks = [...byId.values()];
    const s = st.s;
    const c = {root, st, s, put, blocks, q: sel => root.querySelector(sel), qa: sel => [...root.querySelectorAll(sel)], first: type => blocks.find(x => x.type === type),
      custom: bool(s.enable_custom_style), fonts: bool(s.enable_custom_fonts), design: design(), recording: !!record};
    const v = s.color_scheme && s.color_scheme.id || s.color_scheme || 'default-color-scheme';
    if (st.rootScheme == null) st.rootScheme = [...root.classList].some(x => /^color-/.test(x));
    if (typeof v === 'string' && /^[\w-]+$/.test(v)) for (const el of [...(st.rootScheme ? [root] : []), ...root.querySelectorAll('[data-pg-scheme]')]) put(el, 'scheme', v);
    /* custom fonts: the root's font variables and the opt-out of the theme priority */
    put(root, '@data-pg-fonts', c.fonts); put(root, '@data-own-font', c.fonts);
    const hf = c.fonts && font(s.heading_font), bf = c.fonts && font(s.body_font);
    put(root, '--heading-font', hf || null); put(root, '--body-font', bf || null); put(root, '--btn-font', bf || null); 
    c0 = c;
    if (st.type.derive) st.type.derive(c);
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.pgSettings) { st.raw = root.dataset.pgSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
  }
  function add(root) {
    if (roots.has(root)) return;
    const type = TYPES[root.getAttribute('data-pg-root')] || {};
    const st = {root, id: root.getAttribute('data-pg-section'), type, live: {}, liveBlocks: new Map(), raw: root.dataset.pgSettings, s: parse(root.dataset.pgSettings), blocks: new Map(), rawBlocks: new Map(), last: new Map(), frame: 0, audit: []};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq = matchMedia('(min-width: 750px)');
    /* a wrapper kept across a redraw drops what an earlier live edit wrote on it */
    const wrap = root.closest('.shopify-section');
    if (wrap && root.getAttribute('data-pg-root') === 'promobanner') { wrap.style.removeProperty('margin-top'); wrap.style.removeProperty('margin-bottom'); }
    roots.set(root, st);
    derive(root, st, true);
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) { cancelAnimationFrame(st.frame); roots.delete(root); }
    for (const root of document.querySelectorAll(SEL)) add(root);
  }
  /* test helper: outputs whose markup differs from the derived value */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not set up'];
    st.audit = []; derive(root, st, 'audit');
    const bad = [];
    for (const [el, key, v] of st.audit) {
      if (!root.contains(el)) continue;
      let have, want;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key === '@data-popup-config') { have = JSON.stringify(parse(el.getAttribute('data-popup-config'))); want = JSON.stringify(parse(v)); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key[0] === '?') { have = el.classList.contains(key.slice(1)); want = !!v; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'text') { have = el.textContent.trim(); want = String(v == null ? '' : v).trim(); }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else continue;
      if (have !== want) bad.push((el.dataset.pgBlock || el.getAttribute('class') || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }

  /* A redraw whose inline script did not run: run that same script once. */
  function ensure(id) {
    const wrap = document.getElementById('shopify-section-' + id);
    if (!wrap) return;
    const popup = wrap.querySelector('[data-popup-root]');
    const btt = wrap.querySelector('[data-back-to-top]');
    const ready = () => (popup ? popup.hasAttribute('data-popup-id') || !!popup.__pgRun : true) && (btt ? !!(btt.__btt || btt.__pgRun) : true);
    if (!popup && !btt) return;
    setTimeout(() => {
      if (!wrap.isConnected || ready()) return;
      if (popup) popup.__pgRun = true;
      if (btt) btt.__pgRun = true;
      if (!window.MateriaPopups) {
        const ext = wrap.querySelector('script[src*="materia-popups"]');
        if (ext && !document.querySelector('script[data-pg-loaded]')) { const s = document.createElement('script'); s.src = ext.src; s.defer = true; s.setAttribute('data-pg-loaded', ''); document.head.appendChild(s); }
      }
      for (const old of wrap.querySelectorAll('script:not([src])')) {
        if (old.type && !/javascript/.test(old.type)) continue;
        const s = document.createElement('script');
        s.textContent = old.textContent;
        old.replaceWith(s);
      }
    }, 400);
  }

  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {};
    const id = sidOf(d.section != null ? d.section : (d.sectionId != null ? d.sectionId : d.section_id));
    if (!id || !d.settings) return;
    const root = rootFor(id);
    if (!root) return;
    add(root);
    const st = roots.get(root);
    const bRaw = d.block || d.blockId || d.block_id, bid = bRaw ? String(bRaw.id || bRaw) : '';
    if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
    else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
    st.schedule();
  });
  const onLoad = e => {
    const id = sidOf(e.detail && (e.detail.sectionId != null ? e.detail.sectionId : e.detail.section)) || sidOf(e.target && e.target.id);
    scan();
    if (id && rootFor(id)) ensure(id);
  };
  document.addEventListener('storelib:section-load', onLoad);
  document.addEventListener('shopify:section:load', onLoad);
  try {
    new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))) { scan(); return; } }).observe(document.documentElement, {childList: true, subtree: true});
  } catch (_) { /* old browser */ }

  /* ---------- the sections ---------- */
  /* Image Banner Popup */
  TYPES['promotional-image-popup'] = {derive(c) {
    const {root, s, put} = c, blk = c.first('image'), im = blk ? blk.b : s;
    const modes = {after_seconds: 'delay', after_scrolling: 'scroll', mouse_close: 'exit', pageviews: 'pageviews'};
    const days = num(s.hide_promobanner_days, 0);
    put(root, '@data-ib-mode', s.display_options || '');
    put(root, '@data-ib-phone-off', bool(s.hide_on_mobile));
    put(root, '@data-ib-hover', im.image_hover_animation || 'none');
    put(root, '--ib-pad-t', px(s.section_padding_top)); put(root, '--ib-pad-b', px(s.section_padding_bottom));
    put(root, '--ib-v', s.promobanner_vertical_position_mobile || 'center'); put(root, '--ib-h', s.promobanner_horizontal_position_mobile || 'center');
    put(root, '--ib-overlay-o', String(num(s.promobanner_overlay) * 0.01));
    put(root, '--ib-w-m', num(s.promobanner_width_mobile, 100) + '%'); put(root, '--ib-w-d', num(s.promobanner_width, 60) + '%');
    put(root, '--ib-border', px(s.promobanner_border_thickness)); put(root, '--ib-radius', px(s.promobanner_radius));
    put(root, '--ib-img-radius', px(im.image_border_radius));
    put(root, '--ib-iw-d', num(im.image_width_desktop, 100) + '%'); put(root, '--ib-ih-d', px(im.image_height_desktop, 300));
    put(root, '--ib-iw-m', num(im.image_width_mobile, 100) + '%'); put(root, '--ib-ih-m', px(im.image_height_mobile, 200));
    put(root, '--ib-bg', c.custom ? color(s.popup_container_background_color, 'var(--color-background)') : null);
    put(root, '--ib-close', c.custom ? color(s.close_button_color, '#ffffff') : null);
    const btn = c.q('[data-ib-button]'); put(btn, 'text', s.button_label || 'See the offer');
    /* "Hide on phones" on the live site: a phone does not keep it open */
    if (!c.recording && !c.design && bool(s.hide_on_mobile) && !matchMedia('(min-width: 1024px)').matches && window.MateriaPopups && MateriaPopups.current() === c.st.id) MateriaPopups.close(c.st.id);
    const alt = blank(s.image_alt) ? root.dataset.pgI18n || '' : s.image_alt;
    put(c.q('dialog[data-pg-dialog]'), '@aria-label', alt);
    put(c.q('[data-popup-root]'), '@data-popup-config', JSON.stringify({design: c.design, preview: !!bool(s.show_in_builder), phoneOff: bool(s.hide_on_mobile),
      trigger: {mode: modes[s.display_options] || 'manual', delay: num(s.seconds, 0), scroll: num(s.percent, 50), views: num(s.page_views, 2)},
      frequency: {mode: days > 0 ? 'after_days' : 'always', days}}));
    for (const view of c.qa('[data-ib-view]')) {
      const desk = view.dataset.ibView === 'desktop', src = imgSrc(desk ? im.image_desktop : (im.image_mobile || im.image_desktop));
      put(view, 'img', JSON.stringify({src, alt, lazy: bool(im.lazy)}));
      const a = view.querySelector('[data-ib-link]'); put(a, '@href', blank(im.image_link) ? null : im.image_link);
      const img = view.querySelector('img'); if (img) put(img, '@loading', bool(im.lazy) ? 'lazy' : null);
    }
  }};
  /* Countdown Promo Popup */
  const calendarOk = v => { const m = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(v || '')); if (!m) return true; const y = +m[1], mo = +m[2], d = +m[3]; return mo >= 1 && mo <= 12 && d >= 1 && d <= new Date(Date.UTC(y, mo, 0)).getUTCDate(); };
  TYPES['countdown-promo-popup'] = {derive(c) {
    const {root, s, put} = c, cu = c.custom;
    put(root, '@data-cdp-side', s.image_side || 'image-left'); put(root, '@data-cdp-mobile-image', s.mobile_image_position || 'above');
    put(root, '--cdp-overlay-o', String(num(s.overlay_opacity, 60) * 0.01)); put(root, '--cdp-w', px(s.popup_width, 900)); put(root, '--cdp-gutter', px(s.mobile_gutter, 32));
    put(root, '--cdp-radius', px(s.popup_radius, 12)); put(root, '--cdp-cell-radius', px(s.cd_cell_radius, 4)); put(root, '--cdp-cd-gap', px(s.cd_gap, 8));
    put(root, '--cdp-gap-e', px(s.gap_after_eyebrow, 18)); put(root, '--cdp-gap-h', px(s.gap_after_headline, 22)); put(root, '--cdp-gap-c', px(s.gap_after_coupon, 24));
    put(root, '--cdp-gap-cd', px(s.gap_after_countdown, 24)); put(root, '--cdp-gap-cta', px(s.gap_after_cta, 16));
    put(root, '--cdp-overlay', cu ? color(s.overlay_color, '#000000') : null);
    put(root, '--cdp-bg', cu ? color(s.card_bg, 'var(--color-background)') : null);
    put(root, '--cdp-text', cu ? color(s.text_color, 'var(--color-text)') : null);
    put(root, '--cdp-close', cu ? color(s.close_color, 'var(--color-heading)') : null);
    put(root, '--cdp-cell-bg', cu ? color(s.cd_cell_bg, 'color-mix(in srgb, var(--color-heading) 8%, var(--color-background))') : null);
    put(root, '--cdp-cell-color', cu ? color(s.cd_cell_color, 'var(--color-heading)') : null);
    put(root, '--cdp-status', cu ? color(s.cd_status_color, 'color-mix(in srgb, var(--color-text) 75%, transparent)') : null);
    put(root, '@data-popup-config', JSON.stringify({design: c.design, preview: bool(s.editor_mode), hideEnded: !off(s.hide_when_ended),
      trigger: {mode: s.open_mode || 'delay', delay: num(s.delay_s, 5), scroll: num(s.scroll_pct, 50), views: num(s.page_views, 2)},
      frequency: {mode: s.after_dismiss || 'after_days', days: num(s.hide_days, 1)}}));
    for (const x of c.blocks) {
      const b = x.b, el = x.el;
      if (x.type === 'eyebrow' || x.type === 'disclaimer') {
        put(el, 'hidden', blank(b.text)); put(el, 'html', b.text || '');
        put(el, 'style:color', color(ownColor(b, 'color'), x.type === 'eyebrow' ? 'var(--color-text)' : 'color-mix(in srgb, var(--color-text) 75%, transparent)'));
        if (x.type === 'eyebrow') put(el, 'style:font-size', px(b.size, 13));
      } else if (x.type === 'headline') {
        put(el, 'hidden', blank(b.text)); put(el, 'html', b.text || '');
        put(el, '--cdp-h-size', px(b.size, 32)); put(el, 'style:color', color(ownColor(b, 'color'), 'var(--color-heading)'));
      } else if (x.type === 'coupon') {
        put(el, 'hidden', blank(b.code)); put(el, '@data-cdp-code', b.code || ''); put(el.querySelector('[data-cdp-code-text]'), 'html', b.code || '');
        put(el, 'style:color', color(ownColor(b, 'color'), 'var(--color-heading)'));
      } else if (x.type === 'countdown') {
        const cells = x.els.find(e => e.hasAttribute('data-cdp-countdown')), status = x.els.find(e => e.tagName === 'P');
        const end = b.end_datetime || '', done = b.completed_text || (cells && cells.dataset.pgI18n) || '';
        const target = calendarOk(end) ? Date.parse(end) : NaN;
        put(cells, '@data-cdp-end', end); put(cells, '@data-cdp-status', done); put(cells, 'hidden', blank(end));
        put(cells, 'style:display', blank(end) || isNaN(target) ? 'none' : '');
        const labels = String(b.labels || 'DAYS|HOURS|MIN|SEC').split('|'), def = ['DAYS', 'HOURS', 'MIN', 'SEC'];
        if (cells) for (const l of cells.querySelectorAll('[data-cdp-label]')) { const i = +l.dataset.cdpLabel; put(l, 'html', String(labels[i] || def[i]).trim()); }
        put(status, 'html', done);
        if (!c.recording && !isNaN(target)) {
          const ended = target - Date.now() <= 0;
          root.toggleAttribute('data-cd-ended', ended); if (status) status.hidden = !ended;
        }
      } else if (x.type === 'cta') {
        const custom = off(b.use_theme_button);
        put(el, 'hidden', blank(b.label)); put(el, 'html', b.label || '');
        put(el, '@href', blank(b.link) ? el.dataset.pgDefaultHref || '' : b.link);
        put(el, '@data-own-shape', custom);
        buttonVars(put, el, {bg: ownColor(b, 'bg'), text: ownColor(b, 'text_color'), hover_bg: ownColor(b, 'bg_hover'), hover_text: ownColor(b, 'text_hover'), custom, radius: b.radius, padding_y: b.padding_y, padding_x: b.padding_x, font_size: b.size});
      } else if (x.type === 'image') {
        put(el, 'img', JSON.stringify({src: imgSrc(b.image), alt: b.alt || root.dataset.pgI18n || '', lazy: true}));
      }
    }
  }};
  /* the shared phone field (snippets/cpnb-phone-field) */
  function phone(put, wrap, b) {
    if (!wrap) return;
    const on = bool(b.collect_phone), cc = wrap.querySelector('[data-cpnb-phone-cc]'), local = wrap.querySelector('[data-cpnb-phone-local]');
    put(wrap, 'hidden', !on); put(cc, '@disabled', !on); put(local, '@disabled', !on);
    put(local, '@required', bool(b.phone_required));
    const ph = b.phone_placeholder || 'Phone number';
    put(local, '@placeholder', ph); put(local, '@aria-label', ph);
    if (cc) { const iso = b.phone_default_country || 'US'; for (const o of cc.options) put(o, '@selected', o.dataset.iso === iso); if (!c0.recording) { const o = [...cc.options].find(q => q.dataset.iso === iso); if (o) cc.value = o.value; } }
  }
  /* Coupon Promo Popup */
  TYPES['coupon-promotion-newsletter-popup'] = {derive(c) {
    const {root, s, put} = c, cu = c.custom; c0 = c;
    put(root, '@data-cpnb-side', s.image_side || 'image-right'); put(root, '@data-cpnb-mobile-image', s.mobile_image_position || 'above');
    put(root, '@data-cpnb-ratio', s.image_ratio || 'auto'); put(root, '@data-cpnb-mh', s.mobile_image_height_mode || 'auto');
    put(root, '@data-cpnb-align', s.text_align || 'left'); put(root, '@data-cpnb-gate', bool(s.gate_coupon) ? 'true' : 'false');
    put(root, '--cpnb-overlay-o', String(num(s.overlay_opacity, 50) * 0.01)); put(root, '--cpnb-gutter', px(s.mobile_gutter, 32)); put(root, '--cpnb-w', px(s.popup_width, 880));
    put(root, '--cpnb-radius', px(s.popup_radius, 14)); put(root, '--cpnb-pad-v', px(s.card_padding_v, 24)); put(root, '--cpnb-pad-h', px(s.card_padding_h, 28));
    put(root, '--cpnb-fit', s.image_fit || 'cover'); put(root, '--cpnb-pos', s.image_position || 'center'); put(root, '--cpnb-mh-px', px(s.mobile_image_height, 180));
    put(root, '--cpnb-dismiss-align', s.dismiss_align || 'center');
    put(root, '--cpnb-overlay', cu ? color(s.overlay_color, '#000000') : null);
    put(root, '--cpnb-bg', cu ? color(s.card_bg, 'var(--color-background)') : null);
    put(root, '--cpnb-text', cu ? color(s.text_color, 'var(--color-text)') : null);
    put(root, '--cpnb-close', cu ? color(s.close_color, 'var(--color-heading)') : null);
    put(root, '@data-popup-config', JSON.stringify({design: c.design, preview: bool(s.editor_mode), gate: bool(s.gate_coupon), replay: num(s.post_subscribe_duration_s, 15),
      trigger: {mode: s.open_mode || 'delay', delay: num(s.delay_s, 0), scroll: num(s.scroll_pct, 50), views: num(s.page_views, 2)},
      frequency: {mode: s.after_dismiss || 'after_days', days: num(s.hide_days, 1)}}));
    for (const x of c.blocks) {
      const b = x.b, el = x.el;
      if (x.type === 'eyebrow') {
        put(el, 'hidden', blank(b.text)); put(el, 'html', b.text || '');
        put(el, 'style:font-size', px(b.size_desktop, 12)); put(el, 'style:color', color(ownColor(b, 'color'), 'var(--color-text)'));
      } else if (x.type === 'headline' || x.type === 'subheading') {
        const h = x.type === 'headline';
        put(el, 'hidden', blank(b.text)); put(el, 'html', b.text || '');
        put(el, '--cpnb-size', px(b.size_desktop, h ? 32 : 15));
        put(el, 'style:color', color(ownColor(b, 'color'), h ? 'var(--color-heading)' : 'var(--color-text)'));
        if (h) put(el, 'style:font-weight', blank(b.weight) || b.weight === 'theme' ? 'var(--heading-weight, 800)' : String(b.weight));
      } else if (x.type === 'coupon') {
        for (const row of x.els) {
          put(row, 'hidden', blank(b.code));
          const l = row.querySelector('[class^="cpnb-code-label-"]'); put(l, 'hidden', blank(b.label)); put(l, 'html', b.label || '');
          const btn = row.querySelector('button'); put(btn, '@data-code', b.code || ''); put(btn, 'text', b.code || '');
        }
      } else if (x.type === 'form') {
        const i18n = parse(el.dataset.pgI18n), success = x.els.find(e => e.tagName === 'P');
        if (success) { put(success, 'html', b.success_text || 'Thanks! Here is your code:'); }
        if (el.tagName === 'P') continue;
        const ph = b.placeholder || i18n.placeholder || '', input = el.querySelector('input[type="email"]');
        put(el.querySelector('label'), 'text', ph); put(input, '@placeholder', ph);
        put(input, 'style:border-radius', off(b.use_theme_field) ? px(b.input_radius, 8) : null);
        phone(put, el.querySelector('[data-cpnb-phone]'), b);
        const btn = el.querySelector('button[type="submit"]'), custom = off(b.use_theme_button);
        put(btn, 'text', b.button_text || i18n.submit || ''); put(btn, '@data-own-shape', custom);
        buttonVars(put, btn, {bg: ownColor(b, 'button_bg'), text: ownColor(b, 'button_text_color'), hover_bg: ownColor(b, 'button_bg_hover'), hover_text: ownColor(b, 'button_text_hover'), custom, radius: b.button_radius, weight: b.button_weight});
      } else if (x.type === 'dismiss') {
        put(el, 'hidden', blank(b.text)); put(el.querySelector('button'), 'html', b.text || '');
      } else if (x.type === 'image') {
        put(el, 'img', JSON.stringify({src: imgSrc(b.image), alt: b.alt || el.dataset.pgI18n || '', lazy: true}));
      }
    }
  }};
  /* Promotion Popup Discount */
  TYPES['promobanner'] = {derive(c) {
    const {root, s, put} = c, cu = c.custom, popup = !off(s.show_as_popup);
    const get = type => (c.first(type) || {b: {}}).b;
    const eb = get('eyebrow'), hb = get('headline'), bb = get('body'), cb = get('coupon'), btb = get('button'), ib = get('image');
    const wrap = root.closest('.shopify-section');
    if (wrap) { const d = matchMedia('(min-width: 768px)').matches; put(wrap, 'style:margin-top', px(d ? s.section_margin_top_desktop : s.section_margin_top_mobile)); put(wrap, 'style:margin-bottom', px(d ? s.section_margin_bottom_desktop : s.section_margin_bottom_mobile)); }
    /* drawn in the page: no popup is open */
    if (!popup && !c.recording) { const P = window.MateriaPopups, dlg = c.q('dialog[data-pg-dialog]'); if (P && P.current() === c.st.id) P.close(c.st.id); if (dlg && dlg.open) dlg.removeAttribute('open'); }
    put(root, '@data-pg-inline', !popup); put(root, '@data-pbp-reset', bool(s.reset_spacing));
    put(root, '@data-pbp-mobile-image', ib.mobile_position || 'above'); put(root, '@data-pbp-cimg-d', bool(ib.enable_custom_desktop)); put(root, '@data-pbp-cimg-m', bool(ib.enable_custom_mobile));
    put(root, '?promo-banner-pro--as-popup', popup);
    for (const w of ['container', 'fluid_container', 'stretch_width', 'full_width']) put(root, '?' + w, !popup && s.section_width === w);
    put(root, '@aria-hidden', popup ? (root.classList.contains('pbp-open') ? 'false' : 'true') : null);
    const yes = v => bool(v) ? 'true' : 'false';
    put(root, '@data-hide-days', s.hide_days == null ? '' : String(s.hide_days)); put(root, '@data-open-mode', s.open_mode || ''); put(root, '@data-delay', s.delay_s == null ? '' : String(s.delay_s));
    put(root, '@data-inactivity', s.inactivity_s == null ? '' : String(s.inactivity_s)); put(root, '@data-exit-intent', yes(s.exit_intent));
    put(root, '@data-append-discount', yes(btb.append_discount)); put(root, '@data-discount-code', cb.code || '');
    put(root, '@data-show-once-per-session', yes(s.once_per_session)); put(root, '@data-edit-mode', yes(s.enable_edit_mode));
    const days = num(s.hide_days, 0);
    put(root, '@data-popup-config', JSON.stringify({design: c.design, preview: bool(s.enable_edit_mode),
      trigger: {mode: s.open_mode || 'exit', delay: num(s.delay_s, 0), idle: num(s.inactivity_s, 10), scroll: num(s.scroll_pct, 50), views: num(s.page_views, 2), exit: bool(s.exit_intent)},
      frequency: {mode: days > 0 ? 'after_days' : bool(s.once_per_session) ? 'session' : 'always', days, session: bool(s.once_per_session)}}));
    const v = (k, val) => put(root, k, val);
    v('--pbp-overlay-opacity', String(num(s.overlay_opacity) * 0.01)); v('--pbp-radius', px(s.radius)); v('--pbp-popup-radius', px(s.popup_radius)); v('--pbp-popup-w', px(s.popup_width, 750));
    v('--pbp-pad', px(s.card_padding)); v('--pbp-top-pad', px(s.top_padding)); v('--pbp-bottom-pad', px(s.bottom_padding)); v('--pbp-mtop-pad', px(s.mobile_top_padding)); v('--pbp-mbottom-pad', px(s.mobile_bottom_padding));
    v('--pbp-mh-pad', px(s.mobile_h_padding)); v('--pbp-gutter', px(s.mobile_side_gutter, 32)); v('--pbp-gap', px(s.col_gap));
    v('--pbp-text-l-pad', px(s.text_left_pad_desktop)); v('--pbp-text-r-pad', px(s.text_right_pad_desktop)); v('--pbp-text-l-pad-m', px(s.text_left_pad_mobile)); v('--pbp-text-r-pad-m', px(s.text_right_pad_mobile));
    v('--pbp-bg', cu ? color(s.card_bg, 'var(--color-background)') : 'var(--color-background)'); v('--pbp-text', cu ? color(s.text_color, 'var(--color-text)') : 'var(--color-text)');
    v('--pbp-overlay', cu ? color(s.overlay_color, '#000000') : '#000000'); v('--pbp-close-color', cu ? color(s.close_color, 'var(--color-heading)') : 'var(--color-heading)');
    v('--pbp-eyebrow-ls', num(eb.letter_spacing) + 'em'); v('--pbp-eyebrow-size', px(eb.size_desktop, 12)); v('--pbp-eyebrow-size-m', px(eb.size_mobile, 14)); v('--pbp-eyebrow-color', color(ownColor(eb, 'color'), 'inherit'));
    v('--pbp-headline-size', px(hb.size_desktop, 56)); v('--pbp-headline-size-m', px(hb.size_mobile, 40)); v('--pbp-headline-w', String(hb.weight || 700)); v('--pbp-headline-color', color(ownColor(hb, 'color'), 'var(--color-heading)'));
    v('--pbp-body-size', px(bb.size_desktop, 16)); v('--pbp-body-size-m', px(bb.size_mobile, 16)); v('--pbp-body-color', color(ownColor(bb, 'color'), 'inherit'));
    v('--pbp-code-size', px(cb.code_size, 18));
    const cc = (k, f) => color(ownColor(cb, k), f);
    v('--pbp-code-bg', cc('code_bg', 'var(--color-background)')); v('--pbp-code-bg-copied', cc('code_bg_copied', 'color-mix(in srgb, var(--color-heading) 6%, var(--color-background))'));
    v('--pbp-code-border', cc('code_border', 'var(--color-border)')); v('--pbp-code-border-copied', cc('code_border_copied', 'var(--color-heading)'));
    v('--pbp-code-color', cc('code_color', 'var(--color-heading)')); v('--pbp-code-color-copied', cc('code_color_copied', 'var(--color-primary)'));
    v('--pbp-copy-bg', cc('copy_bg', 'var(--color-background)')); v('--pbp-copy-bg-copied', cc('copy_bg_copied', 'var(--color-heading)'));
    v('--pbp-copy-border', cc('copy_border', 'var(--color-border)')); v('--pbp-copy-border-copied', cc('copy_border_copied', 'var(--color-heading)'));
    v('--pbp-copy-color', cc('copy_color', 'color-mix(in srgb, var(--color-text) 70%, transparent)')); v('--pbp-copy-color-copied', cc('copy_color_copied', 'var(--color-background)'));
    v('--pbp-btn-w', num(btb.width) > 0 ? px(btb.width) : 'auto');
    v('--pbp-img-radius', px(ib.radius)); v('--pbp-img-w', bool(ib.enable_custom_desktop) ? px(ib.desktop_w) : '100%'); v('--pbp-img-h', bool(ib.enable_custom_desktop) ? px(ib.desktop_h) : '100%');
    v('--pbp-img-w-m', bool(ib.enable_custom_mobile) ? px(ib.mobile_w) : '100%'); v('--pbp-img-h-m', bool(ib.enable_custom_mobile) ? px(ib.mobile_h) : '100%');
    put(c.q('.pbp-card'), '?pbp-card--inline', !popup);
    const grid = c.q('.pbp-grid'); put(grid, '?image-left', (ib.side || 'image-right') === 'image-left'); put(grid, '?image-right', (ib.side || 'image-right') === 'image-right');
    const text = c.q('.pbp-text');
    for (const a of ['left', 'center']) { put(text, '?pbp-align-desktop-' + a, s.align_desktop === a); put(text, '?pbp-align-mobile-' + a, s.align_mobile === a); }
    for (const x of c.blocks) {
      const b = x.b, el = x.el;
      if (x.type === 'eyebrow' || x.type === 'headline' || x.type === 'body') { put(el, 'hidden', blank(b.text)); put(el, 'html', b.text || ''); }
      else if (x.type === 'coupon') {
        put(el, 'hidden', blank(b.code) && blank(b.label));
        const l = el.querySelector('.pbp-code-label'); put(l, 'hidden', blank(b.label)); put(l, 'html', b.label || '');
        const code = el.querySelector('.pbp-code'); put(code, 'hidden', blank(b.code)); put(code, '@data-code', b.code || ''); put(code, 'text', b.code || '');
        put(el.querySelector('.pbp-copy'), 'hidden', blank(b.code));
      } else if (x.type === 'button') {
        const custom = off(b.use_theme_button);
        let href = b.link || '';
        if (bool(b.append_discount) && !blank(cb.code) && !blank(href)) href = '/discount/' + cb.code + '?redirect=' + b.link;
        if (blank(href)) href = el.dataset.pgDefaultHref || '';
        put(el, 'hidden', blank(b.label)); put(el, 'html', b.label || ''); put(el, '@href', href); put(el, '@data-own-shape', custom);
        buttonVars(put, el, {bg: ownColor(b, 'bg'), text: ownColor(b, 'text_color'), hover_bg: ownColor(b, 'bg_hover'), hover_text: ownColor(b, 'text_hover'), custom, radius: b.radius, font_size: b.size, weight: 800, transform: custom ? 'uppercase' : ''});
        put(el, '--btn-anim-duration', custom ? num(b.hover_transition, 200) + 'ms' : null);
      } else if (x.type === 'newsletter') {
        const i18n = parse(el.dataset.pgI18n), ph = b.email_placeholder || i18n.placeholder || '';
        put(el, '--pbp-nl-input-bg', color(ownColor(b, 'input_bg'), 'var(--input-bg)')); put(el, '--pbp-nl-input-text', color(ownColor(b, 'input_text'), 'var(--input-color)')); put(el, '--pbp-nl-input-border', color(ownColor(b, 'input_border'), 'var(--color-border)'));
        const input = el.querySelector('.pbp-nl-email'); put(input, '@placeholder', ph); put(input, '@aria-label', ph);
        phone(put, el.querySelector('[data-cpnb-phone]'), b);
        const btn = el.querySelector('.pbp-nl-submit'); put(btn, 'html', b.button_label || i18n.submit || '');
        buttonVars(put, btn, {bg: ownColor(b, 'submit_bg'), text: ownColor(b, 'submit_text'), hover_bg: ownColor(b, 'submit_bg_hover'), hover_text: ownColor(b, 'submit_text_hover')});
        put(el.querySelector('.pbp-nl-success'), 'html', b.success_text || i18n.success || '');
      } else if (x.type === 'image') {
        put(el, 'img', JSON.stringify({src: imgSrc(b.image), alt: b.alt || '', lazy: true, cls: 'pbp-img-el'}));
      }
    }
  }};
  /*@TYPES@*/

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  window.MateriaPagePopups = {NAMES, TYPES, scan, roots, dialogFor, design, audit};
})();
