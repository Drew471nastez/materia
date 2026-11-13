/* Materia Themes. Divider With Text (divider-text-line) and Bottom Sheet
   Popup (popup-bottom-sheet), round 7. Linked by the two sections.

   Divider With Text needs nothing here to be seen: the line, the words and
   the link are drawn by the section.

   Bottom Sheet Popup is registered with the theme's popup manager
   (shopify/assets/materia-popups.js), which owns the triggers, how often it
   comes back, one popup at a time (it waits behind another popup or an
   open cookie banner), Escape, the close button, the dimmed page, the focus
   kept in and given back. This file opens and closes the native <dialog>
   for it: on a phone with showModal() as a sheet from the bottom (drag the
   handle down to close it: pointer events on the handle only, so the page
   and the sheet's own scroll are never held), on a computer with show() as
   a card in a corner that leaves the page usable. In the builder it is
   drawn in the page, never over it, and no trigger runs.

   Live edits (builder only: the sections print their settings as JSON
   there and nowhere else). Every root [data-r7x] carries its settings and
   every block [data-r7x-block] its own. derive() turns them into outputs (a
   CSS variable, an attribute, a class, text, a picture), the same values
   the section prints, so on load the first derive is only recorded, never
   painted. After that an output is written only when its value changes,
   once per frame per root: a picture never reloads and an open popup stays
   open for an unrelated edit. A block added waits for the builder's redraw. */
(() => {
  if (window.MateriaR7Extras) return;
  const SEL = '[data-r7x]', BSEL = '[data-r7x-block]';
  const roots = new Map();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = null) => v !== '' && v != null && v !== false && v !== true && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const plain = v => String(v == null ? '' : v);
  const blank = v => !plain(v).replace(/<[^>]*>/g, '').trim();
  const api = () => window.MateriaHeroImageOne;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width: 767.98px)');
  /* A colour setting, or '' when it is empty, clear or not a colour (the theme's own colour then shows). */
  const color = v => {
    if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return ''; v = v.hex ?? v.value ?? v.color; }
    v = typeof v === 'string' ? v.trim() : '';
    return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : '';
  };
  /* A picture setting: an address, or an object that holds one. */
  const picture = v => {
    v = v && typeof v === 'object' ? v.src || v.url || v.value : v;
    if (typeof v !== 'string' || !v || v === '#') return '';
    try { return ['http:', 'https:', 'data:'].includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return ''; }
  };
  /* A link setting: an address the page can follow, or '' for none. */
  const link = v => {
    v = v && typeof v === 'object' ? v.url || v.href || '' : v;
    v = typeof v === 'string' ? v.trim() : '';
    if (!v) return '';
    if (/^[#/?]/.test(v)) return v;
    try { return /^(https?:|mailto:|tel:)$/.test(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return ''; }
  };
  /* A font picker value: the family and its fallbacks, as the section prints them. */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    const fam = typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
    return !fam || /^var\(/.test(fam) ? '' : /,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const scheme = s => (s.color_scheme && s.color_scheme.id) || s.color_scheme || '';

  /* ---------- writers ---------- */
  function write(el, key, v, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'css' || key === 'text') el.textContent = v == null ? '' : v;
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); if (v) el.classList.add('color-' + v); }
    else if (key === 'rich') { if (api() && api().rich) api().rich(el, v, st.rich); else el.textContent = plain(v).replace(/<[^>]*>/g, ''); }
    else if (key === 'img') {
      /* One <img> in the picture box, keyed on the picture's address alone: a new address on the same
         element, so an unchanged picture (or a change of its description) never reloads it. */
      let img = el.querySelector('img');
      if (!v) { if (img) img.remove(); return; }
      if (!img) { img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async'; img.width = 960; img.height = 540; img.alt = plain(st.s.image_alt); el.append(img); }
      img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.src = v;
    }
    else if (key === 'alt') { const img = el.querySelector('img'); if (img && img.getAttribute('alt') !== v) img.setAttribute('alt', v); }
  }

  /* ---------- what the settings turn into ---------- */
  function spaceCss(st) {
    const s = st.s, sel = st.wrap && /^shopify-section-/.test(st.wrap.id) ? '#' + CSS.escape(st.wrap.id) : '#shopify-section-' + CSS.escape(st.id), n = k => num(s[k], 0);
    return sel + '{margin-top:' + n('section_margin_top_mobile') + 'px;margin-bottom:' + n('section_margin_bottom_mobile') + 'px}@media (min-width:768px){' + sel + '{margin-top:' + n('section_margin_top_desktop') + 'px;margin-bottom:' + n('section_margin_bottom_desktop') + 'px}}'
      + (bool(s.reset_spacing) ? sel + '{margin-top:0!important;margin-bottom:0!important}' + sel + ' + .shopify-section{margin-top:0!important}' : '');
  }
  const TYPES = {
    'divider-text-line'(st, put) {
      const {root, s} = st, custom = bool(s.enable_custom_style);
      put(root, 'scheme', scheme(s));
      put(root, '.remove_spacing', bool(s.reset_spacing));
      put(root, '@data-width', plain(s.section_width) || 'full_width');
      put(root, '@data-pos', plain(s.text_position) || 'start');
      put(root, '@data-align', plain(s.align) || 'center');
      put(root, '@data-ti-no-reveal', s.reveal === false || s.reveal === 'false');
      put(root, '--dtl-pt', px(s.padding_top)); put(root, '--dtl-pb', px(s.padding_bottom));
      put(root, '--dtl-pt-m', px(s.padding_top_mobile)); put(root, '--dtl-pb-m', px(s.padding_bottom_mobile));
      put(root, '--dtl-w', num(s.width_pct, 100) + '%');
      put(root, '--dtl-gap', px(s.label_gap));
      put(root, '--dtl-t', px(s.thickness, 1));
      put(root, '--dtl-style', plain(s.style) || 'solid');
      put(root, '--dtl-line', custom ? color(s.color_from) || null : null);
      put(root, '--dtl-bg', custom ? color(s.section_bg) || null : null);
      if (st.space) put(st.space, 'css', spaceCss(st));
      for (const b of st.blocks.values()) {
        const {el, s: bs, type} = b, own = bool(bs.enable_custom_style);
        if (type === 'label') {
          const f = bool(bs.enable_custom_fonts) ? font(bs.font) : '';
          put(el, 'text', plain(bs.text));
          put(el, 'hidden', !plain(bs.text).trim());
          put(el, '@data-style', plain(bs.text_style) || 'label');
          put(el, '--dtl-size', px(bs.size, 13)); put(el, '--dtl-size-m', px(bs.size_mobile, 12));
          put(el, '--dtl-tc', own ? color(bs.color) || null : null);
          put(el, '--dtl-font', f || null);
          put(el, '@data-own-font', !!f);
        } else if (type === 'link') {
          const label = el.querySelector('[data-r7x-label]');
          if (label) put(label, 'text', plain(bs.label));
          put(el, 'hidden', !plain(bs.label).trim());
          put(el, '@href', link(bs.link) || el.dataset.r7xDefaultHref || '/collections/all');
          put(el, '--dtl-lc', own ? color(bs.color) || null : null);
        }
      }
    },
    'popup-bottom-sheet'(st, put) {
      const {root, s} = st, custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
      put(root, 'scheme', scheme(s));
      put(root, '@data-corner', plain(s.corner) || 'right');
      put(root, '@data-align', plain(s.text_align) || 'left');
      put(root, '--pbs-w', px(s.card_width, 360));
      put(root, '--pbs-scrim-o', String(num(s.overlay_opacity, 0) / 100));
      put(root, '--pbs-bg', custom ? color(s.card_bg) || 'var(--color-background)' : null);
      put(root, '--pbs-text', custom ? color(s.text_color) || 'var(--color-text)' : null);
      put(root, '--pbs-scrim', custom ? color(s.overlay_color) || 'rgb(0 0 0)' : null);
      const hf = fonts ? font(s.heading_font) : '', bf = fonts ? font(s.body_font) : '';
      put(root, '--heading-font', hf || null);
      put(root, '--body-font', bf || null);
      put(root, '--btn-font', bf || null);
      put(root, '@data-own-font', !!(hf || bf));
      put(root, '@data-pbs-config', JSON.stringify(popupConfig(s)));
      const media = root.querySelector('[data-pbs-media]'), src = picture(s.image);
      if (media) { put(media, 'img', src); put(media, 'alt', plain(s.image_alt)); put(media, 'hidden', !src); }
      for (const b of st.blocks.values()) {
        const {el, s: bs, type} = b, own = bool(bs.enable_custom_style);
        if (type === 'heading') {
          put(el, 'rich', plain(bs.text)); put(el, 'hidden', blank(bs.text));
          put(el, '--pbs-hs', px(bs.size, 22)); put(el, '--pbs-hs-m', px(bs.size_mobile, 20));
          put(el, '--pb-c', own ? color(bs.color) || null : null);
        } else if (type === 'text') {
          put(el, 'rich', plain(bs.text)); put(el, 'hidden', blank(bs.text));
          put(el, '--pb-c', own ? color(bs.color) || null : null);
        } else if (type === 'button') {
          const kind = plain(bs.style) || 'primary';
          put(el, 'text', plain(bs.label)); put(el, 'hidden', !plain(bs.label).trim());
          put(el, '@href', link(bs.link) || el.dataset.r7xDefaultHref || '/collections/all');
          put(el, '@data-theme-button', kind);
          put(el, '.btn-primary', kind === 'primary'); put(el, '.btn-secondary', kind === 'secondary');
        }
      }
    },
  };
  function apply(st, paint) {
    derive(st, paint);
    if (paint && st.after) st.after();
  }
  function derive(st, paint) {
    TYPES[st.type](st, (el, key, value) => {
      if (!el) return;
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (m.has(key) && m.get(key) === value) return;
      m.set(key, value);
      if (paint) write(el, key, value, st);
    });
  }
  function schedule(st) {
    if (st.frame) return;
    st.frame = requestAnimationFrame(() => { st.frame = 0; if (st.root.isConnected) apply(st, true); });
  }

  /* ---------- Bottom Sheet Popup ---------- */
  function popupConfig(s) {
    const n = (k, d) => num(s[k], d);
    return {trigger: {mode: plain(s.open_mode) || 'delay', delay: n('delay_s', 0), scroll: n('scroll_pct', 50), views: n('page_views', 2)}, frequency: {mode: plain(s.after_dismiss) || 'after_days', days: n('hide_days', 1)}, preview: bool(s.editor_mode)};
  }
  /* A section the builder added runs none of its script tags: fetch the manager once from the address the section names. */
  function ensureManager(st) {
    if (window.MateriaPopups || document.querySelector('script[data-r7x-popups]')) return;
    const own = (st.wrap || st.root).querySelector('script[src*="materia-popups"]') || document.querySelector('script[src*="materia-popups"]');
    if (!own || !own.src) return;
    const s = document.createElement('script');
    s.src = own.src; s.defer = true; s.setAttribute('data-r7x-popups', '');
    document.head.appendChild(s);
  }
  function popup(st) {
    const root = st.root, dlg = root.querySelector('[data-pbs-dialog]'), card = root.querySelector('[data-pbs-card]'), scrim = root.querySelector('[data-pbs-scrim]'), grip = root.querySelector('[data-pbs-grip]');
    if (!dlg || !card) return;
    const id = root.dataset.popupRoot || st.id, sig = {signal: st.ac.signal};
    const design = root.hasAttribute('data-pbs-design') || !!(window.Shopify && window.Shopify.designMode);
    const p = st.pop = {dlg, card, scrim, id, design, timer: 0, drag: null, api: null};
    const clean = () => { clearTimeout(p.timer); p.timer = 0; root.removeAttribute('data-closing'); card.style.removeProperty('transition'); card.style.removeProperty('transform'); card.style.removeProperty('opacity'); if (scrim) scrim.style.removeProperty('opacity'); };
    const modalNow = () => !design && phone.matches;
    const open = () => {
      clean();
      const modal = modalNow();
      if (p.api) p.api.entry.modal = modal;
      if (dlg.open && dlg.matches(':modal') === modal) return;
      if (dlg.open) dlg.close();
      if (modal && typeof dlg.showModal === 'function') { try { dlg.showModal(); } catch (_) { dlg.setAttribute('open', ''); } }
      else if (design || typeof dlg.show !== 'function') dlg.setAttribute('open', '');
      else dlg.show();
    };
    const close = o => {
      if (!dlg.open) { clean(); return; }
      const shut = () => { clean(); if (dlg.open) { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); } };
      if ((o && o.instant) || reduced.matches || design) { shut(); return; }
      const modal = dlg.matches(':modal');
      if (scrim) scrim.style.removeProperty('opacity');
      root.setAttribute('data-closing', '');
      card.style.transition = 'transform .24s cubic-bezier(.4, 0, 1, 1), opacity .2s ease';
      if (modal) card.style.transform = 'translateY(100%)';
      else { card.style.opacity = '0'; card.style.transform = 'translateY(12px)'; }
      clearTimeout(p.timer);
      p.timer = setTimeout(shut, 260);
    };
    const register = P => {
      if (!root.isConnected || roots.get(root) !== st) return;
      const c = parse(root.dataset.pbsConfig), t = c.trigger || {}, f = c.frequency || {};
      p.api = P.register({
        id, root, dialog: card, backdrop: design ? null : scrim, design, preview: design && !!c.preview, modal: modalNow(), gap: 600,
        trigger: {mode: t.mode || 'delay', delay: num(t.delay, 0), scroll: num(t.scroll, 50), views: num(t.views, 1), selector: 'a[href$="#bottom-sheet"]'},
        frequency: {mode: f.mode === 'every_visit' ? 'always' : f.mode || 'after_days', days: num(f.days, 1)},
        open, close,
      });
      /* Redrawn with "Show in the builder" off: open again only while the section is selected. */
      if (design && !c.preview && !p.api.entry.selected && p.api.isOpen()) p.api.hide({reason: 'deselect', instant: true});
    };
    /* Escape on the sheet, and a dialog the browser closed itself: the manager closes it, so it is remembered and the focus goes back. */
    dlg.addEventListener('cancel', e => { e.preventDefault(); if (p.api && p.api.isOpen()) p.api.hide({reason: 'escape'}); else close({instant: true}); }, sig);
    dlg.addEventListener('close', () => { if (p.api && p.api.isOpen()) p.api.hide({reason: 'close'}); }, sig);
    /* The button: not offered again for the chosen days (or ever), then the page it links to. */
    root.addEventListener('click', e => {
      const cta = e.target.closest && e.target.closest('[data-pbs-cta]');
      if (!cta || !root.contains(cta) || !p.api || design) return;
      const f = parse(root.dataset.pbsConfig).frequency || {};
      if (f.mode === 'after_days') p.api.done(num(f.days, 1)); else if (f.mode === 'never') p.api.done();
      p.api.hide({reason: 'cta', instant: true});
    }, sig);
    /* Drag the handle down to close the sheet; a short drag springs back. */
    if (grip) {
      let frame = 0;
      const paint = () => { frame = 0; const d = p.drag; if (!d) return; card.style.transform = 'translateY(' + d.dy + 'px)'; if (scrim) scrim.style.opacity = String(d.o * Math.max(0, 1 - d.dy / d.h)); };
      grip.addEventListener('pointerdown', e => {
        if (!dlg.matches(':modal') || (e.pointerType === 'mouse' && e.button !== 0)) return;
        p.drag = {y0: e.clientY, dy: 0, h: card.offsetHeight || 1, o: scrim ? parseFloat(getComputedStyle(scrim).opacity) || 0 : 0, y: e.clientY, t: e.timeStamp, v: 0, id: e.pointerId};
        card.style.transition = 'none';
        try { grip.setPointerCapture(e.pointerId); } catch (_) { /* no capture */ }
      }, sig);
      grip.addEventListener('pointermove', e => {
        const d = p.drag;
        if (!d || e.pointerId !== d.id) return;
        const dt = e.timeStamp - d.t;
        if (dt > 0) d.v = (e.clientY - d.y) / dt;
        d.y = e.clientY; d.t = e.timeStamp; d.dy = Math.max(0, e.clientY - d.y0);
        if (!frame) frame = requestAnimationFrame(paint);
      }, sig);
      const end = e => {
        const d = p.drag;
        if (!d || e.pointerId !== d.id) return;
        p.drag = null;
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        if (e.type === 'pointerup' && (d.dy > Math.min(120, d.h * 0.3) || (d.dy > 16 && d.v > 0.5))) { if (p.api && p.api.isOpen()) p.api.hide({reason: 'swipe'}); else close(); return; }
        card.style.transition = reduced.matches ? 'none' : 'transform .2s cubic-bezier(.2, .8, .2, 1)';
        card.style.transform = '';
        if (scrim) scrim.style.removeProperty('opacity');
      };
      grip.addEventListener('pointerup', end, sig);
      grip.addEventListener('pointercancel', end, sig);
    }
    (window.MateriaPopupsQueue = window.MateriaPopupsQueue || []).push(register);
    ensureManager(st);
  }
  function popupEdit(st, keys) {
    const p = st.pop;
    if (!p || !p.api || !keys.includes('editor_mode')) return;
    const on = bool(st.s.editor_mode);
    p.api.entry.preview = on;
    if (on) p.api.show({instant: true, preview: true});
    else if (!p.api.entry.selected) p.api.hide({reason: 'deselect', instant: true});
  }

  /* ---------- lifecycle ---------- */
  function setup(root) {
    const type = root.dataset.r7x;
    if (!TYPES[type]) return;
    const wrap = root.closest('.shopify-section') || root.parentElement;
    const st = {root, type, wrap, id: root.dataset.r7xSection || '', ac: new AbortController(), last: new WeakMap(), rich: {rich: new WeakMap()}, blocks: new Map(), frame: 0,
      live: root.hasAttribute('data-r7x-settings'), s: parse(root.dataset.r7xSettings), raw: root.dataset.r7xSettings};
    st.space = wrap ? wrap.querySelector('style[data-r7x-space]') : null;
    for (const el of root.querySelectorAll(BSEL)) st.blocks.set(el.dataset.r7xBlock, {el, type: el.dataset.r7xType, s: parse(el.dataset.r7xSettings)});
    roots.set(root, st);
    if (type === 'popup-bottom-sheet') popup(st);
    if (st.live) {
      derive(st, false);
      /* The builder may rewrite the settings attribute itself. */
      st.mo = new MutationObserver(() => { const raw = root.dataset.r7xSettings; if (raw === st.raw) return; st.raw = raw; const before = st.s; st.s = parse(raw); schedule(st); if (type === 'popup-bottom-sheet') popupEdit(st, Object.keys(st.s).filter(k => JSON.stringify(st.s[k]) !== JSON.stringify(before[k]))); });
      st.mo.observe(root, {attributes: true, attributeFilter: ['data-r7x-settings']});
    }
  }
  function drop(root) {
    const st = roots.get(root);
    if (!st) return null;
    st.ac.abort();
    if (st.mo) st.mo.disconnect();
    if (st.frame) cancelAnimationFrame(st.frame);
    if (st.pop) clearTimeout(st.pop.timer);
    roots.delete(root);
    return st.pop ? st.pop.id : null;
  }
  function scan() {
    const gone = [];
    for (const root of [...roots.keys()]) if (!root.isConnected) { const id = drop(root); if (id) gone.push(id); }
    for (const root of document.querySelectorAll(SEL)) if (!roots.has(root)) setup(root);
    /* A popup whose section was redrawn registers again under its id (the manager keeps it open); one whose section is gone is let go. */
    const P = window.MateriaPopups;
    if (P) for (const id of gone) if (![...roots.values()].some(st => st.pop && st.pop.id === id)) P.unregister(id);
  }
  const ident = v => String((v && typeof v === 'object' ? v.id : v) ?? '').replace(/^shopify-section-/, '');
  function onChange(e) {
    const d = e.detail || {}, sec = ident(d.section ?? d.sectionId ?? d.section_id), blk = ident(d.block ?? d.blockId ?? d.block_id);
    if (!sec || !d.settings || typeof d.settings !== 'object') return;
    for (const st of roots.values()) {
      if (!st.live || st.id !== sec && !(st.wrap && st.wrap.id === 'shopify-section-' + sec)) continue;
      if (blk) { const b = st.blocks.get(blk); if (!b) continue; Object.assign(b.s, d.settings); } else Object.assign(st.s, d.settings);
      schedule(st);
      if (!blk && st.pop) popupEdit(st, Object.keys(d.settings));
    }
  }
  let scanFrame = 0;
  const touches = n => n.nodeType === 1 && (n.matches(SEL) || !!n.querySelector(SEL));
  new MutationObserver(records => {
    if (scanFrame) return;
    if (!records.some(r => [...r.addedNodes].some(touches) || (roots.size > 0 && [...r.removedNodes].some(touches)))) return;
    scanFrame = requestAnimationFrame(() => { scanFrame = 0; scan(); });
  }).observe(document.documentElement, {childList: true, subtree: true});
  for (const n of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(n, scan);
  document.addEventListener('storelib:settings-change', onChange);
  window.MateriaR7Extras = {scan, roots, count: () => roots.size};
  scan();
})();
