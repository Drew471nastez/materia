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
  const TYPES = ['countdown-promo-popup', 'coupon-promotion-newsletter-popup', 'promobanner', 'promonewsletterpopup-2', 'promotional-image-popup', 'promotional-popup', 'promotionalpopup2', 'spin-wheel-popup', 'back-to-top-pro'];
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

  /* ---------- roots ---------- */
  const roots = new Map();
  function schemeOf(v) { return v && typeof v === 'object' ? (v.id || '') : String(v || ''); }
  function setScheme(st, value) {
    const id = schemeOf(value);
    if (!id) return;
    for (const el of st.root.querySelectorAll('[data-pg-scheme]').length ? [st.root, ...st.root.querySelectorAll('[data-pg-scheme]')] : [st.root]) {
      for (const c of [...el.classList]) if (/^color-/.test(c)) el.classList.remove(c);
      el.classList.add('color-' + id);
    }
  }
  function apply(st) {
    st.frame = 0;
    const s = st.pending; st.pending = {};
    if ('color_scheme' in s) setScheme(st, s.color_scheme);
  }
  function queue(st, settings) {
    Object.assign(st.pending, settings);
    if (!st.frame) st.frame = requestAnimationFrame(() => apply(st));
  }
  function add(root) {
    if (roots.has(root)) return;
    roots.set(root, {root, id: root.getAttribute('data-pg-section'), type: root.getAttribute('data-pg-root'), pending: {}, frame: 0});
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) { cancelAnimationFrame(st.frame); roots.delete(root); }
    for (const root of document.querySelectorAll(SEL)) add(root);
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
    const id = sidOf(d.section);
    if (!id || !d.settings) return;
    const root = rootFor(id);
    if (!root) return;
    add(root);
    queue(roots.get(root), d.settings);
  });
  const onLoad = e => {
    const id = sidOf(e.detail && (e.detail.sectionId != null ? e.detail.sectionId : e.detail.section)) || sidOf(e.target && e.target.id);
    scan();
    if (id && rootFor(id)) ensure(id);
  };
  document.addEventListener('storelib:section-load', onLoad);
  document.addEventListener('shopify:section:load', onLoad);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  try {
    new MutationObserver(muts => { for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))) { scan(); return; } }).observe(document.documentElement, {childList: true, subtree: true});
  } catch (_) { /* old browser */ }

  window.MateriaPagePopups = {TYPES, scan, roots, dialogFor, design};
})();
