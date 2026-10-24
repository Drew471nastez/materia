/* Materia Themes. One manager for the overlay popups (promotion, newsletter,
   coupon, countdown, spin wheel, image banner).

   A section registers its popup with MateriaPopups.register({...}) and keeps
   its own markup and look. The manager owns what every popup must do the same
   way:
   - triggers: immediate, delay, scroll %, exit intent (desktop pointer; touch
     screens fall back to the delay), inactivity, after N page views, manual
     ([data-popup-open="<section id>"] or a section's own selector);
   - frequency: every visit, once per session, again after N days, once ever
     (localStorage/sessionStorage, every access in try/catch);
   - one popup open at a time: the others wait in a queue, and nothing opens
     over an open cookie banner;
   - close button, Escape, backdrop click, focus moved in, kept in (Tab) and
     given back on close, page scroll locked while a modal is open;
   - the builder: no trigger runs; a popup opens when its section (or one of
     its blocks) is selected and closes on deselect, or stays open when the
     section's own "Show in the builder" setting is on.
   Sections' inline scripts run before this deferred file, so they queue their
   setup on window.MateriaPopupsQueue; it runs as soon as this file loads. */
(function () {
  'use strict';
  if (window.MateriaPopups && window.MateriaPopups.version) return;

  var store = {
    get: function (k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set: function (k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} },
    rm: function (k, s) { try { (s ? sessionStorage : localStorage).removeItem(k); } catch (e) {} }
  };
  var DAY = 864e5;
  var design = !!(window.Shopify && window.Shopify.designMode);
  var finePointer = function () {
    try { return matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) { return true; }
  };
  var reduced = function () {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };

  // Page views: counted once per page load, for the "after N page views" trigger.
  var views = (parseInt(store.get('materia:popup-views') || '0', 10) || 0) + 1;
  store.set('materia:popup-views', String(views));

  var entries = {};
  var current = null;
  var queue = [];
  var lastFocus = null;
  var scrollLock = null;

  function emit(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) {}
  }
  function key(entry) { return 'materia:popup:' + (entry.storageKey || entry.id); }

  // ---- frequency --------------------------------------------------------
  function suppressed(entry) {
    var f = entry.frequency || {};
    var k = key(entry);
    var raw = store.get(k);
    if (raw === 'never' || raw === 'done') return true;
    var until = parseInt(raw || '0', 10);
    if (until && Date.now() < until) return true;
    if ((f.mode === 'session' || f.session) && store.get(k, true)) return true;
    return false;
  }
  function remember(entry) {
    var f = entry.frequency || {};
    var k = key(entry);
    if (f.mode === 'session' || f.session) store.set(k, '1', true);
    if (f.mode === 'session') return;
    if (f.mode === 'once' || f.mode === 'never') store.set(k, 'never');
    else if (f.mode === 'after_days' && +f.days > 0) store.set(k, String(Date.now() + f.days * DAY));
  }

  // ---- focus & scroll ---------------------------------------------------
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function focusables(el) {
    return Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function (n) {
      return n.getClientRects().length && !n.closest('[hidden], [inert]');
    });
  }
  function lockScroll() {
    if (scrollLock || design) return;
    var html = document.documentElement;
    var gap = window.innerWidth - html.clientWidth;
    scrollLock = { overflow: html.style.overflow, pad: document.body.style.paddingRight };
    html.style.overflow = 'hidden';
    if (gap > 0) document.body.style.paddingRight = gap + 'px';
    html.setAttribute('data-popup-open', '');
  }
  function unlockScroll() {
    if (!scrollLock) return;
    document.documentElement.style.overflow = scrollLock.overflow;
    document.body.style.paddingRight = scrollLock.pad;
    document.documentElement.removeAttribute('data-popup-open');
    scrollLock = null;
  }

  // ---- open / close -----------------------------------------------------
  function blocked() {
    // A cookie banner asks first; popups wait for its answer (materia:consent).
    var consent = document.querySelector('cookie-consent[data-open]');
    return !!(consent && !consent.hidden && !design);
  }

  function show(entry, opts) {
    opts = opts || {};
    if (!entry || !entry.root || !entry.root.isConnected) return false;
    if (current === entry) return true;
    if (!opts.force && (suppressed(entry) || entry.shownThisPage)) return false;
    if (current) {
      if (opts.force) hide(current, { reason: 'replaced', instant: true });
      else { if (queue.indexOf(entry) < 0) queue.push(entry); return false; }
    }
    if (!opts.force && blocked()) { if (queue.indexOf(entry) < 0) queue.push(entry); return false; }
    current = entry;
    entry.shownThisPage = true;
    if (!opts.force && !design) remember(entry);
    if (!lastFocus || !lastFocus.isConnected) lastFocus = document.activeElement;
    if (entry.root.hidden) entry.root.hidden = false;
    entry.root.setAttribute('aria-hidden', 'false');
    entry.root.setAttribute('data-popup-state', 'open');
    try { entry.open && entry.open({ instant: !!opts.instant || reduced(), preview: !!opts.preview }); } catch (e) { console.error(e); }
    if (entry.modal !== false) lockScroll();
    if (!opts.preview && entry.focus !== false) {
      var dialog = entry.dialog || entry.root;
      requestAnimationFrame(function () {
        if (current !== entry) return;
        var first = dialog.querySelector('[data-popup-autofocus]') || dialog;
        if (first === dialog && !dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
        try { first.focus({ preventScroll: true }); } catch (e) {}
      });
    }
    emit('materia:popup-open', { id: entry.id });
    return true;
  }

  function hide(entry, opts) {
    opts = opts || {};
    entry = entry || current;
    if (!entry) return;
    var wasCurrent = current === entry;
    var qi = queue.indexOf(entry);
    if (qi > -1) queue.splice(qi, 1);
    if (!wasCurrent) return;
    current = null;
    entry.root.setAttribute('aria-hidden', 'true');
    entry.root.setAttribute('data-popup-state', 'closed');
    try { entry.close && entry.close({ instant: !!opts.instant || reduced(), reason: opts.reason || 'close' }); } catch (e) { console.error(e); }
    unlockScroll();
    if (opts.reason !== 'replaced' && !design && opts.reason !== 'deselect') remember(entry);
    var back = lastFocus; lastFocus = null;
    if (back && back.isConnected && opts.reason !== 'replaced' && opts.reason !== 'unload') {
      try { back.focus({ preventScroll: true }); } catch (e) {}
    }
    emit('materia:popup-close', { id: entry.id, reason: opts.reason || 'close' });
    if (opts.reason !== 'replaced') setTimeout(flush, entry.gap != null ? entry.gap : 600);
  }

  function flush() {
    if (current || blocked()) return;
    while (queue.length) {
      var next = queue.shift();
      if (next.root && next.root.isConnected && !suppressed(next) && !next.shownThisPage) { show(next); return; }
    }
  }

  // ---- triggers ---------------------------------------------------------
  function arm(entry) {
    var t = entry.trigger || {};
    var mode = t.mode || 'delay';
    var cleanups = entry.cleanups;
    var fire = function () { disarm(entry); show(entry); };
    var later = function (seconds) {
      var id = setTimeout(fire, Math.max(0, +seconds || 0) * 1000);
      cleanups.push(function () { clearTimeout(id); });
    };
    var listen = function (target, type, fn, o) {
      target.addEventListener(type, fn, o);
      cleanups.push(function () { target.removeEventListener(type, fn, o); });
    };
    var exitListen = function () {
      listen(document, 'mouseout', function (e) {
        if (!e.relatedTarget && e.clientY <= 8) fire();
      });
    };
    // Exit intent can also back up another trigger (desktop pointers only).
    if (t.exit && mode !== 'exit' && finePointer()) exitListen();
    if (mode === 'manual' || mode === 'click') return;
    if (mode === 'exit' && !finePointer()) { later(t.delay > 0 ? t.delay : 15); return; }
    switch (mode) {
      case 'immediate': later(0); break;
      case 'delay': later(t.delay); break;
      case 'pageviews':
        if (views >= Math.max(1, +t.views || 1)) later(t.delay);
        break;
      case 'scroll': {
        var pct = Math.min(100, Math.max(0, +t.scroll || 50));
        var check = function () {
          var max = document.documentElement.scrollHeight - window.innerHeight;
          var done = max <= 0 ? 100 : (window.scrollY / max) * 100;
          if (done >= pct) fire();
        };
        listen(window, 'scroll', check, { passive: true });
        check();
        break;
      }
      case 'exit': exitListen(); break;
      case 'inactivity': {
        var idle = Math.max(1, +t.idle || 10) * 1000;
        var timer = 0;
        var reset = function () { clearTimeout(timer); timer = setTimeout(fire, idle); };
        ['mousemove', 'keydown', 'scroll', 'touchstart', 'pointerdown'].forEach(function (ev) {
          listen(ev === 'scroll' ? window : document, ev, reset, { passive: true });
        });
        cleanups.push(function () { clearTimeout(timer); });
        reset();
        break;
      }
      default: later(t.delay);
    }
  }
  function disarm(entry) {
    var list = entry.cleanups.splice(0);
    list.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  // ---- registry ---------------------------------------------------------
  function register(cfg) {
    if (!cfg || !cfg.id || !cfg.root) return null;
    if (cfg.design != null) design = design || !!cfg.design;
    var old = entries[cfg.id];
    var wasOpen = old && current === old;
    var wasSelected = old && old.selected;
    if (old) unregister(cfg.id, true);
    var entry = Object.assign({ cleanups: [], modal: true }, cfg);
    entries[cfg.id] = entry;
    entry.root.setAttribute('data-popup-id', entry.id);

    // Close: buttons, backdrop, and any [data-popup-close] inside.
    entry.onClick = function (e) {
      var target = e.target;
      if (!target || !target.closest) return;
      if (target.closest('[data-popup-close]') || (entry.closeSelector && target.closest(entry.closeSelector))) {
        e.preventDefault(); hide(entry, { reason: 'close' }); return;
      }
      if (entry.backdrop && (target === entry.backdrop || (typeof entry.backdrop === 'string' && target.matches(entry.backdrop)))) {
        hide(entry, { reason: 'backdrop' });
      }
    };
    entry.root.addEventListener('click', entry.onClick);

    // Manual openers anywhere on the page.
    var openSel = '[data-popup-open="' + entry.id + '"]' + (entry.trigger && entry.trigger.selector ? ', ' + entry.trigger.selector : '');
    entry.onOpener = function (e) {
      var opener = e.target && e.target.closest && e.target.closest(openSel);
      if (!opener) return;
      e.preventDefault();
      lastFocus = opener;
      show(entry, { force: true });
    };
    document.addEventListener('click', entry.onOpener);

    if (design) {
      if (wasSelected || wasOpen) { entry.selected = !!wasSelected; show(entry, { force: true, instant: true, preview: true }); }
      else if (entry.preview) show(entry, { force: true, instant: true, preview: true });
    } else if (!suppressed(entry)) {
      arm(entry);
    }
    return {
      show: function (o) { return show(entry, Object.assign({ force: true }, o)); },
      hide: function (o) { hide(entry, o); },
      done: function (days) {
        // A conversion (signed up, copied a code): do not ask again for a while.
        if (design) return;
        store.set(key(entry), days ? String(Date.now() + days * DAY) : 'done');
      },
      reset: function () { store.rm(key(entry)); store.rm(key(entry), true); },
      isOpen: function () { return current === entry; },
      entry: entry
    };
  }
  function unregister(id, keepFocus) {
    var entry = entries[id];
    if (!entry) return;
    if (current === entry) hide(entry, { reason: keepFocus ? 'replaced' : 'unload', instant: true });
    var qi = queue.indexOf(entry);
    if (qi > -1) queue.splice(qi, 1);
    disarm(entry);
    entry.root.removeEventListener('click', entry.onClick);
    document.removeEventListener('click', entry.onOpener);
    delete entries[id];
  }

  // ---- global keys ------------------------------------------------------
  document.addEventListener('keydown', function (e) {
    if (!current) return;
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (current.escape === false) return;
      e.preventDefault();
      hide(current, { reason: 'escape' });
      return;
    }
    if (e.key === 'Tab' && current.modal !== false) {
      var dialog = current.dialog || current.root;
      var list = focusables(dialog);
      if (!list.length) { e.preventDefault(); dialog.focus(); return; }
      var first = list[0], last = list[list.length - 1];
      var active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog || !dialog.contains(active))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !dialog.contains(active))) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('materia:consent', function () { setTimeout(flush, 500); });

  // ---- builder: open on select, close on deselect ---------------------
  function sectionOf(e) {
    var d = e.detail || {};
    return d.sectionId != null ? String(d.sectionId) : '';
  }
  function onSelect(e) {
    var id = sectionOf(e);
    var entry = entries[id];
    if (!entry) return;
    entry.selected = true;
    show(entry, { force: true, preview: true });
  }
  function onDeselect(e) {
    var entry = entries[sectionOf(e)];
    if (!entry) return;
    entry.selected = false;
    if (!entry.preview) hide(entry, { reason: 'deselect' });
  }
  document.addEventListener('shopify:section:select', onSelect);
  document.addEventListener('shopify:block:select', onSelect);
  document.addEventListener('shopify:section:deselect', onDeselect);
  document.addEventListener('shopify:section:unload', function (e) {
    var id = sectionOf(e);
    if (entries[id] && !entries[id].root.isConnected) unregister(id);
  });

  // ---- coupon copy ------------------------------------------------------
  function copy(text) {
    return new Promise(function (resolve, reject) {
      if (!text) { reject(new Error('empty')); return; }
      var fallback = function () {
        try {
          var ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
          document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
          var ok = document.execCommand && document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) resolve(); else reject(new Error('copy refused'));
        } catch (err) { reject(err); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext !== false) {
        navigator.clipboard.writeText(text).then(resolve, fallback);
      } else fallback();
    });
  }

  // ---- what sits at the bottom of the screen ----------------------------
  // The mobile navigation bar and an open cookie banner take the bottom of
  // the screen; --materia-bottom-inset on <html> says how much, so floating
  // buttons and notifications sit above them instead of over them.
  var insetFrame = 0;
  function bottomInset() {
    var h = window.innerHeight, inset = 0;
    var parts = document.querySelectorAll('mobile-navigation-bar, .mobile-navigation-bar, cookie-consent[data-open] [data-consent-panel]');
    for (var i = 0; i < parts.length; i++) {
      var el = parts[i];
      if (!el.getClientRects().length) continue;
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      var r = el.getBoundingClientRect();
      // Only what sits low on the screen: a bar or a banner, not a full-screen modal or a top bar.
      if (r.height && r.top > h * 0.35 && r.bottom > h * 0.6 && r.top < h) inset = Math.max(inset, h - r.top);
    }
    return Math.round(inset);
  }
  function measureInset() {
    insetFrame = 0;
    var v = bottomInset() + 'px';
    if (document.documentElement.style.getPropertyValue('--materia-bottom-inset') !== v) {
      document.documentElement.style.setProperty('--materia-bottom-inset', v);
      emit('materia:bottom-inset', { inset: parseInt(v, 10) });
    }
  }
  function queueInset() { if (!insetFrame) insetFrame = requestAnimationFrame(measureInset); }
  window.addEventListener('resize', queueInset, { passive: true });
  window.addEventListener('scroll', queueInset, { passive: true });
  document.addEventListener('materia:consent', function () { setTimeout(queueInset, 450); });
  try {
    new MutationObserver(queueInset).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-open', 'hidden'] });
  } catch (e) {}
  // First measured while the page is idle after it is parsed (a frame at
  // DOMContentLoaded forced a layout of the whole page there), then whenever
  // the bar or the banner changes size: a ResizeObserver reports after
  // layout, so it never forces one (this was a second timed check at 1.2s).
  function watchInset() {
    if (typeof ResizeObserver === 'function') {
      var ro = new ResizeObserver(queueInset), seen = [];
      var watch = function () {
        var parts = document.querySelectorAll('mobile-navigation-bar, .mobile-navigation-bar, cookie-consent [data-consent-panel]');
        for (var i = 0; i < parts.length; i++) if (seen.indexOf(parts[i]) < 0) { seen.push(parts[i]); ro.observe(parts[i]); }
      };
      watch();
      document.addEventListener('materia:consent', watch);
      try { new MutationObserver(watch).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['data-open'] }); } catch (e) {}
    }
    queueInset();
  }
  var idleInset = function () {
    if (window.requestIdleCallback) requestIdleCallback(watchInset, { timeout: 1000 });
    else setTimeout(watchInset, 200);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', idleInset); else idleInset();

  window.MateriaPopups = {
    version: 1,
    register: register,
    unregister: unregister,
    open: function (id) { return show(entries[id], { force: true }); },
    close: function (id) { hide(id ? entries[id] : current); },
    current: function () { return current ? current.id : null; },
    queued: function () { return queue.map(function (e) { return e.id; }); },
    copy: copy,
    store: store,
    reduced: reduced,
    pageViews: function () { return views; },
    bottomInset: bottomInset,
    get design() { return design; }
  };

  var pending = window.MateriaPopupsQueue || [];
  window.MateriaPopupsQueue = { push: function (fn) { try { fn(window.MateriaPopups); } catch (e) { console.error(e); } } };
  pending.forEach(function (fn) { window.MateriaPopupsQueue.push(fn); });
})();
