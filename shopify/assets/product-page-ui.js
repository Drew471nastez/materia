/* Materia Themes. Product page UI shared by Main product and Featured product:
   smooth accordions, the size guide sheet, the media lightbox and gallery
   video play/pause. Every listener is delegated on document, so it keeps
   working after the builder draws a section again. Loaded once. */
(function () {
  "use strict";
  if (window.__mtProductUi) return;
  window.__mtProductUi = true;

  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  function reduced() {
    return !!(motionQuery && motionQuery.matches);
  }
  function supports(rule) {
    try {
      return !!(window.CSS && CSS.supports && CSS.supports(rule));
    } catch (e) {
      return false;
    }
  }
  // Browsers that animate <details> in CSS (::details-content + interpolate-size).
  var cssAccordion = supports("interpolate-size: allow-keywords") && supports("selector(::details-content)");

  // The builder canvas (an iframe, or Shopify-style design mode).
  var editor = (function () {
    try {
      return window.self !== window.top || !!(window.Shopify && window.Shopify.designMode) ||
        document.documentElement.classList.contains("shopify-design-mode");
    } catch (e) {
      return true;
    }
  })();
  // When a click was last handled here, so the builder fallback below does
  // not run the same action twice.
  var lastHandled = 0;
  function now() {
    return window.performance && performance.now ? performance.now() : Date.now();
  }

  /* ---------------------------------------------------------------------
     1. Accordions: <details class="mt-acc"><summary>..</summary>
        <div class="mt-acc__body">..</div></details>
     The summary click is handled here and the row is opened by setting
     details.open, so it never depends on the click's default action: the
     builder cancels that default on clicks inside a block (to select the
     block), which left the rows shut in the builder only. The height is
     animated in CSS (::details-content) where the browser can, here
     otherwise. Open rows are remembered and given back when the builder
     draws the section again.
     ------------------------------------------------------------------- */
  var accState = {};
  function accKey(details) {
    return details.getAttribute("data-mt-acc-key") || details.id || "";
  }
  function accBody(details) {
    for (var i = 0; i < details.children.length; i++) {
      if (details.children[i].classList.contains("mt-acc__body")) return details.children[i];
    }
    return null;
  }
  function accIsOpen(details) {
    return details.open && !details.classList.contains("is-closing");
  }
  function remember(details, open) {
    var key = accKey(details);
    if (!key) return;
    accState[key] = { open: open, def: details._mtDefault };
  }
  function setAcc(details, open, instant) {
    if (!details || open === accIsOpen(details)) return;
    remember(details, open);
    if (details._mtAnim) {
      details._mtAnim.cancel();
      details._mtAnim = null;
    }
    var body = accBody(details);
    if (instant || cssAccordion || reduced() || !body || typeof body.animate !== "function") {
      details.classList.remove("is-closing");
      details.open = open;
      return;
    }
    var from = details.open ? body.getBoundingClientRect().height : 0;
    details.open = true;
    details.classList.toggle("is-closing", !open);
    var to = open ? body.scrollHeight : 0;
    body.style.overflow = "hidden";
    var anim = body.animate(
      { height: [from + "px", to + "px"], opacity: open ? [0.4, 1] : [1, 0.4] },
      { duration: 320, easing: "cubic-bezier(.4,0,.2,1)" }
    );
    details._mtAnim = anim;
    anim.onfinish = function () {
      details._mtAnim = null;
      body.style.overflow = "";
      details.classList.remove("is-closing");
      if (!open) details.open = false;
    };
    anim.oncancel = function () {
      body.style.overflow = "";
    };
  }
  function summaryFor(target) {
    var summary = target && target.closest ? target.closest("details.mt-acc > summary") : null;
    if (!summary) return null;
    // A link or a control inside the summary keeps its own click.
    var inner = target.closest("a[href], button, input, select, textarea, label");
    if (inner && inner !== summary && summary.contains(inner)) return null;
    return summary;
  }
  function onSummaryClick(e) {
    var summary = summaryFor(e.target);
    if (!summary) return;
    e.preventDefault();
    if (e._mtAcc) return;
    e._mtAcc = true;
    lastHandled = now();
    var details = summary.parentElement;
    setAcc(details, !accIsOpen(details));
  }
  // Capture on window: this runs before handlers on the page, and before
  // the builder's own handlers on document or the block.
  window.addEventListener("click", onSummaryClick, true);
  document.addEventListener("toggle", function (e) {
    var d = e.target;
    if (d && d.matches && d.matches("details.mt-acc") && !d.classList.contains("is-closing")) remember(d, d.open);
  }, true);
  function markDefaults(root) {
    (root || document).querySelectorAll("details.mt-acc").forEach(function (d) {
      if (d._mtDefault === undefined) d._mtDefault = d.open;
    });
  }
  function restoreAccordions(root) {
    if (!root || !root.querySelectorAll) return;
    var list = root.querySelectorAll("details.mt-acc");
    list.forEach(function (d) {
      if (d._mtDefault === undefined) d._mtDefault = d.open;
      var saved = accState[accKey(d)];
      if (!saved) return;
      // The row's "open" setting changed: the new default wins.
      if (saved.def !== undefined && saved.def !== d._mtDefault) {
        delete accState[accKey(d)];
        return;
      }
      if (saved.open === d.open) return;
      d.classList.add("mt-acc--instant");
      d.open = saved.open;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          d.classList.remove("mt-acc--instant");
        });
      });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { markDefaults(document); });
  } else {
    markDefaults(document);
  }
  function onSectionRedraw(e) {
    var root = e && e.target && e.target.querySelectorAll ? e.target : document;
    restoreAccordions(root);
  }
  document.addEventListener("storelib:section-load", onSectionRedraw);
  document.addEventListener("shopify:section:load", onSectionRedraw);

  /* ---------------------------------------------------------------------
     2. Sheets: a button with data-mt-sheet-open and aria-controls naming a
        <dialog class="mt-sheet">. A bottom sheet on phones, a centred
        panel on larger screens. Closes on the backdrop, Escape and its
        close button.
     ------------------------------------------------------------------- */
  var lockOwners = new Set();
  function refreshLocks() {
    lockOwners.forEach(function (owner) {
      if (!owner.isConnected || !owner.open) lockOwners.delete(owner);
    });
    document.documentElement.classList.toggle("mt-lock", lockOwners.size > 0);
  }
  function lockPage(on, owner) {
    if (on) lockOwners.add(owner);
    else lockOwners.delete(owner);
    refreshLocks();
  }
  function openSheet(dialog, opener) {
    if (!dialog || (dialog.open && !dialog.classList.contains('is-closing'))) return;
    var reopening=dialog.open;
    dialog._mtCancelClose?.();
    var version=dialog._mtSheetVersion=(dialog._mtSheetVersion||0)+1;
    dialog._mtOpener = opener || null;
    if (!dialog._mtBound) {
      dialog._mtBound = true;
      dialog.addEventListener("cancel", function (ev) {
        ev.preventDefault();
        closeSheet(dialog);
      });
    }
    // The sheet lives in the section, so it keeps the section's colours.
    try {
      dialog.showModal();
    } catch (err) {
      dialog.setAttribute("open", "");
    }
    lockPage(true, dialog);
    dialog.classList.remove("is-closing");
    if(reopening)dialog.classList.add('is-open');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if(version!==dialog._mtSheetVersion || !dialog.open)return;
        dialog.classList.add("is-open");
      });
    });
    if (opener) opener.setAttribute("aria-expanded", "true");
  }
  function closeSheet(dialog) {
    if (!dialog || !dialog.open || dialog.classList.contains("is-closing")) return;
    var version=dialog._mtSheetVersion=(dialog._mtSheetVersion||0)+1;
    dialog.classList.remove("is-open");
    dialog.classList.add("is-closing");
    var done = false;
    function finish() {
      if (done || version!==dialog._mtSheetVersion) return;
      done = true;
      clearTimeout(closeTimer);
      dialog._mtCancelClose=null;
      dialog.classList.remove("is-closing");
      try {
        dialog.close();
      } catch (err) {
        dialog.removeAttribute("open");
      }
      lockPage(false, dialog);
      var opener = dialog._mtOpener;
      if (opener) {
        opener.setAttribute("aria-expanded", "false");
        if (document.contains(opener)) opener.focus({ preventScroll: true });
      }
    }
    var panel = dialog.querySelector(".mt-sheet__panel") || dialog;
    panel.style.transform = "";
    panel.style.transition = "";
    if (reduced()) return finish();
    // The panel's own slide ends it: a hover fade on a button inside, or the
    // quicker opacity fade on larger screens, must not cut it short.
    function onEnd(ev) {
      if (ev.target !== panel || ev.propertyName !== "transform") return;
      panel.removeEventListener("transitionend", onEnd);
      finish();
    }
    panel.addEventListener("transitionend", onEnd);
    var closeTimer=setTimeout(function () {
      panel.removeEventListener("transitionend", onEnd);
      finish();
    }, 420);
    dialog._mtCancelClose=function(){clearTimeout(closeTimer);panel.removeEventListener('transitionend',onEnd);done=true;dialog._mtCancelClose=null;};
  }

  /* On a phone the sheet follows a finger dragged down from its top bar or
     from a body scrolled to the top, and closes when let go past a quarter
     of its height or flicked down; otherwise it springs back. */
  var drag = null;
  document.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    var target = e.target;
    var panel = target && target.closest ? target.closest("dialog.mt-sheet.is-open .mt-sheet__panel") : null;
    if (!panel || window.matchMedia("(min-width: 768px)").matches) return;
    if (target.closest("button, a, input, select, textarea, label")) return;
    var body = panel.querySelector(".mt-sheet__body");
    var inHead = !!target.closest(".mt-sheet__head");
    if (!inHead && body && body.scrollTop > 0) return;
    var touch = e.touches[0];
    drag = { panel: panel, height:panel.offsetHeight, y: touch.clientY, x: touch.clientX, dy: 0, t: now(), v: 0, moving: false };
    // Only the open sheet listens to a moving finger, so the page keeps its
    // fast scrolling everywhere else.
    if (!panel._mtDrag) {
      panel._mtDrag = true;
      panel.addEventListener("touchmove", onDragMove, { passive: false });
    }
  }, { passive: true });
  function onDragMove(e) {
    if (!drag || drag.panel !== e.currentTarget) return;
    var touch = e.touches[0];
    var dy = touch.clientY - drag.y, dx = touch.clientX - drag.x;
    if (!drag.moving) {
      // A sideways swipe (a wide table) or a push upwards scrolls instead.
      if (Math.abs(dx) > Math.abs(dy) || dy < 0) {
        if (Math.abs(dx) > 6 || dy < -6) drag = null;
        return;
      }
      if (dy < 6) return;
      drag.moving = true;
      drag.panel.style.transition = "none";
    }
    if (e.cancelable) e.preventDefault();
    var t = now();
    var next = Math.max(0, dy);
    drag.v = (next - drag.dy) / Math.max(1, t - drag.t);
    drag.t = t;
    drag.dy = next;
    if(!drag.frame)drag.frame=requestAnimationFrame(function(){if(!drag)return;drag.frame=0;drag.panel.style.transform='translate3d(0,'+drag.dy+'px,0)';});
  }
  function endDrag(event) {
    if (!drag) return;
    var d = drag;
    if(d.frame)cancelAnimationFrame(d.frame);
    drag = null;
    if (!d.moving) return;
    var dialog = d.panel.closest("dialog");
    // Let go: carry on from where the finger left it, down and out or back.
    d.panel.getBoundingClientRect();
    d.panel.style.transition = "";
    if (event?.type!=='touchcancel' && (d.dy > d.height * 0.25 || (now()-d.t<120 && d.v > 0.5))) {
      lastHandled = now();
      dialog.classList.remove("is-open");
      d.panel.style.transform = "";
      closeSheet(dialog);
    } else {
      d.panel.style.transform = "";
    }
  }
  document.addEventListener("touchend", endDrag, { passive: true });
  document.addEventListener("touchcancel", endDrag, { passive: true });

  /* In the builder, selecting a size guide block opens its sheet so it can
     be seen while its settings change; leaving the block closes it. */
  if (editor) {
    ["shopify:block:select", "shopify:block:deselect"].forEach(function (type) {
      document.addEventListener(type, function (e) {
        var root = e.target;
        if (!root || !root.querySelector) return;
        var opener = root.matches && root.matches("[data-mt-sheet-open]") ? root : root.querySelector("[data-mt-sheet-open]");
        var dialog = opener && document.getElementById(opener.getAttribute("aria-controls"));
        if (!dialog || dialog.tagName !== "DIALOG" || !dialog.classList.contains("mt-sheet")) return;
        // A guide still waiting for its chart stays shut.
        if (type === "shopify:block:select") { if (!opener.closest("[hidden]")) openSheet(dialog, opener); }
        else closeSheet(dialog);
      });
    });
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var opener = t.closest("[data-mt-sheet-open]");
    if (opener) {
      var dialog = document.getElementById(opener.getAttribute("aria-controls"));
      if (dialog && dialog.tagName === "DIALOG") {
        e.preventDefault();
        lastHandled = now();
        openSheet(dialog, opener);
      }
      return;
    }
    var closer = t.closest("[data-mt-sheet-close]");
    if (closer) {
      e.preventDefault();
      closeSheet(closer.closest("dialog"));
      return;
    }
    // A click on the dialog itself, outside its panel, is the backdrop.
    if (t.tagName === "DIALOG" && t.classList.contains("mt-sheet")) closeSheet(t);
  });

  /* Tab and Shift+Tab go round the open sheet: a modal dialog alone lets
     focus leave for the browser's own bar after the last control. */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var open = document.querySelectorAll("dialog.mt-sheet[open]");
    var dialog = open[open.length - 1];
    if (!dialog) return;
    var items = Array.prototype.filter.call(
      dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetWidth || el.offsetHeight || el.getClientRects().length; }
    );
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    var active = document.activeElement;
    if (!dialog.contains(active)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  });

  /* Tabs inside a sheet (Size Chart Popup: Sizes / How to measure):
     [data-mt-tabs] holding [data-mt-tab] buttons whose aria-controls name
     their panels. Arrow keys, Home and End move between them. */
  function selectTab(tab, focus) {
    var list = tab && tab.closest("[data-mt-tabs]");
    if (!list) return;
    list.querySelectorAll("[data-mt-tab]").forEach(function (t) {
      var on = t === tab;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) {
        panel.hidden = !on;
        panel.classList.toggle("is-active", on);
      }
    });
    if (focus) tab.focus();
  }
  document.addEventListener("click", function (e) {
    var tab = e.target && e.target.closest ? e.target.closest("[data-mt-tab]") : null;
    if (!tab) return;
    e.preventDefault();
    lastHandled = now();
    selectTab(tab);
  });
  document.addEventListener("keydown", function (e) {
    var tab = e.target && e.target.closest ? e.target.closest("[data-mt-tab]") : null;
    if (!tab) return;
    var tabs = Array.prototype.slice.call(tab.closest("[data-mt-tabs]").querySelectorAll("[data-mt-tab]"));
    var i = tabs.indexOf(tab);
    var rtl = getComputedStyle(tab).direction === "rtl";
    var next = null;
    if (e.key === "ArrowRight") next = tabs[(i + (rtl ? -1 : 1) + tabs.length) % tabs.length];
    else if (e.key === "ArrowLeft") next = tabs[(i + (rtl ? 1 : -1) + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else if (e.key === "End") next = tabs[tabs.length - 1];
    if (!next) return;
    e.preventDefault();
    selectTab(next, true);
  });

  /* ---------------------------------------------------------------------
     3. Lightbox for product media: [data-mt-lightbox] marks a gallery whose
        pictures open full screen. Native scroll snap does the swipe, so it
        runs on the compositor; only opacity and transform are animated.
     ------------------------------------------------------------------- */
  var lb = null;
  function icon(path) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>";
  }
  function buildLightbox() {
    var d = document.createElement("dialog");
    d.className = "mt-lb";
    d.setAttribute("aria-label", "Media viewer");
    d.setAttribute("data-no-image-carry", "");
    d.innerHTML =
      '<div class="mt-lb__track" tabindex="-1"></div>' +
      '<p class="mt-lb__count" aria-live="polite"></p>' +
      '<button type="button" class="mt-lb__btn mt-lb__close" aria-label="Close">' + icon('<path d="M6 6l12 12M18 6 6 18"/>') + "</button>" +
      '<button type="button" class="mt-lb__btn mt-lb__prev" aria-label="Previous media">' + icon('<path d="m15 18-6-6 6-6"/>') + "</button>" +
      '<button type="button" class="mt-lb__btn mt-lb__next" aria-label="Next media">' + icon('<path d="m9 18 6-6-6-6"/>') + "</button>";
    document.body.appendChild(d);
    var track = d.querySelector(".mt-lb__track");
    var count = d.querySelector(".mt-lb__count");
    var state = { dialog: d, track: track, count: count, index: 0, total: 0, raf: 0 };
    function current() {
      var w = track.clientWidth || 1;
      return Math.max(0, Math.min(state.total - 1, Math.round(track.scrollLeft / w)));
    }
    function update() {
      state.raf = 0;
      state.index = current();
      count.textContent = state.total > 1 ? state.index + 1 + " / " + state.total : "";
      d.classList.toggle("is-first", state.index === 0);
      d.classList.toggle("is-last", state.index >= state.total - 1);
      track.querySelectorAll('.mt-lb__slide').forEach(function (slide, i) {
        slide.querySelectorAll('video').forEach(function (video) { if (i !== state.index) video.pause(); });
        slide.querySelectorAll('iframe[data-media-src]').forEach(function (frame) {
          if (i === state.index && !frame.getAttribute('src')) frame.src = frame.dataset.mediaSrc;
          else if (i !== state.index && frame.hasAttribute('src')) frame.removeAttribute('src');
        });
      });
    }
    state.go = function (i, instant) {
      i = Math.max(0, Math.min(state.total - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: instant || reduced() ? "auto" : "smooth" });
      if (instant) update();
    };
    track.addEventListener("scroll", function () {
      if (!state.raf) state.raf = requestAnimationFrame(update);
    }, { passive: true });
    d.querySelector(".mt-lb__prev").addEventListener("click", function () { state.go(current() - 1); });
    d.querySelector(".mt-lb__next").addEventListener("click", function () { state.go(current() + 1); });
    d.querySelector(".mt-lb__close").addEventListener("click", function () { closeLightbox(); });
    d.addEventListener("cancel", function (ev) {
      ev.preventDefault();
      closeLightbox();
    });
    d.addEventListener("keydown", function (ev) {
      if (ev.target.matches('video,input,select,textarea')) return;
      if (ev.key === "ArrowRight") { ev.preventDefault(); state.go(current() + 1); }
      else if (ev.key === "ArrowLeft") { ev.preventDefault(); state.go(current() - 1); }
    });
    // A tap on the empty area around a picture closes the viewer.
    track.addEventListener("click", function (ev) {
      if (ev.target === track || ev.target.classList.contains("mt-lb__slide")) closeLightbox();
    });
    window.addEventListener("resize", function () {
      if (d.open) state.go(state.index, true);
    });
    return state;
  }
  function galleryItems(gallery) {
    var seen = {};
    var list = [];
    gallery.querySelectorAll("[data-mt-src], .media-gallery__image, .media-gallery__local-video, .media-gallery__external-video").forEach(function (el) {
      if (el.closest(".media-thumb-swiper, .thumbnail-slide, .swiper-slide-duplicate")) return;
      var video = el.querySelector('video');
      var frame = el.querySelector('iframe');
      var img = el.querySelector('img');
      var kind = video ? 'video' : frame ? 'iframe' : 'image';
      var src = kind === 'video' ? video.currentSrc || video.getAttribute('src') || video.dataset.src || video.querySelector('source')?.src : kind === 'iframe' ? frame.src || frame.dataset.src : el.getAttribute('data-mt-src') || img?.dataset.zoom || img?.currentSrc || img?.src;
      if (kind !== 'image' && src) {
        try {
          var url = new URL(src, location.href);
          if (!['http:','https:','blob:'].includes(url.protocol)) return;
          if (kind === 'iframe') {
            if (!['www.youtube.com','youtube.com','www.youtube-nocookie.com','player.vimeo.com'].includes(url.hostname)) return;
            url.searchParams.set('autoplay','0'); url.searchParams.set('controls','1');
            src = url.href;
          }
        } catch (_) { return; }
      }
      if (!src || seen[src]) return;
      seen[src] = true;
      list.push({
        el: el,
        src: src,
        kind: kind,
        video: video,
        alt: img ? img.getAttribute("alt") || "" : "",
        w: parseInt(el.getAttribute("data-pswp-width"), 10) || 0,
        h: parseInt(el.getAttribute("data-pswp-height"), 10) || 0,
      });
    });
    return list;
  }
  function openLightbox(gallery, startEl) {
    if (!lb) lb = buildLightbox();
    if (lb.dialog.open && !lb.dialog.classList.contains("is-closing")) return;
    var items = galleryItems(gallery);
    if (!items.length) return;
    var start = 0;
    items.forEach(function (it, i) {
      if (it.el === startEl || it.src === startEl.getAttribute("data-mt-src")) start = i;
    });
    var d = lb.dialog;
    var cs = getComputedStyle(gallery);
    d.style.setProperty("--mt-lb-bg", cs.getPropertyValue("--color-background").trim() || "#fff");
    d.style.setProperty("--mt-lb-fg", cs.getPropertyValue("--color-heading").trim() || "#111");
    lb.track.innerHTML = "";
    items.forEach(function (it, i) {
      var fig = document.createElement("figure");
      fig.className = "mt-lb__slide";
      // The editor keeps re-drawn pictures by address; these are our own.
      fig.setAttribute("data-no-image-carry", "");
      if (it.kind === 'video') {
        var player = document.createElement('video');
        player.src = it.src; player.controls = true; player.playsInline = true;
        player.preload = i === start ? 'metadata' : 'none';
        player.poster = it.video.poster || ''; player.loop = it.video.loop;
        it.video.querySelectorAll('track').forEach(function (track) { player.appendChild(track.cloneNode(true)); });
        fig.appendChild(player);
      } else if (it.kind === 'iframe') {
        var frame = document.createElement('iframe');
        frame.dataset.mediaSrc = it.src; frame.title = it.alt || 'Product video';
        frame.allow = 'fullscreen; picture-in-picture'; frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        fig.appendChild(frame);
      } else {
      var img = document.createElement("img");
      img.src = it.src;
      img.alt = it.alt;
      img.decoding = "async";
      if (Math.abs(i - start) > 1) img.loading = "lazy";
      if (it.w && it.h) {
        img.width = it.w;
        img.height = it.h;
      }
      img.draggable = false;
      fig.appendChild(img);
      }
      lb.track.appendChild(fig);
    });
    lb.total = items.length;
    d.classList.toggle("is-single", items.length < 2);
    d.classList.remove("is-closing");
    try {
      d.showModal();
    } catch (err) {
      d.setAttribute("open", "");
    }
    lockPage(true, d);
    lb.opener = startEl;
    lb.go(start, true);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        d.classList.add("is-open");
      });
    });
    lb.track.focus({ preventScroll: true });
    pauseGalleryMedia(gallery);
  }
  function closeLightbox() {
    if (!lb || !lb.dialog.open || lb.dialog.classList.contains("is-closing")) return;
    var d = lb.dialog;
    lb.track.querySelectorAll('video').forEach(function (video) { video.pause(); });
    lb.track.querySelectorAll('iframe').forEach(function (frame) { frame.removeAttribute('src'); });
    d.classList.remove("is-open");
    d.classList.add("is-closing");
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      d.classList.remove("is-closing");
      try {
        d.close();
      } catch (err) {
        d.removeAttribute("open");
      }
      lockPage(false, d);
      lb.track.innerHTML = "";
      if (lb.opener && document.contains(lb.opener) && lb.opener.focus) lb.opener.focus({ preventScroll: true });
    }
    if (reduced()) return finish();
    d.addEventListener("transitionend", function onEnd(ev) {
      if (ev.target !== d) return;
      d.removeEventListener("transitionend", onEnd);
      finish();
    });
    setTimeout(finish, 320);
  }
  document.addEventListener("click", function (e) {
    var expand = e.target.closest?.('[data-mt-expand-video]');
    if (expand) {
      var media = expand.closest('.media-gallery__local-video, .media-gallery__external-video');
      var owner = expand.closest('[data-mt-lightbox], [data-mt-media-viewer]');
      if (owner && media) { e.preventDefault(); openLightbox(owner,media); return; }
    }
    var t = e.target;
    if (!t || !t.closest) return;
    var item = t.closest("[data-mt-src]");
    if (!item) return;
    var gallery = item.closest("[data-mt-lightbox]");
    if (!gallery) return;
    if (item.closest(".media-thumb-swiper, .thumbnail-slide")) return;
    if (t.closest("button, video, iframe, product-model, .cloudimage-360")) return;
    e.preventDefault();
    lastHandled = now();
    openLightbox(gallery, item);
  });
  // Keyboard: a picture in a lightbox gallery opens with Enter or Space.
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var item = e.target && e.target.closest ? e.target.closest("[data-mt-lightbox] [data-mt-src]") : null;
    if (!item || item !== e.target) return;
    e.preventDefault();
    openLightbox(item.closest("[data-mt-lightbox]"), item);
  });

  /* ---------------------------------------------------------------------
     Builder fallback. The builder may stop a click inside a block before
     it reaches the page (to select the block). A press that ends where it
     started with no click handled here then opens the row or the picture
     itself. Only in the builder; the live site uses the click alone.
     ------------------------------------------------------------------- */
  if (editor) {
    var press = null;
    var keyAt = 0;
    var actionFor = function (target) {
      var summary = summaryFor(target);
      if (summary) {
        var details = summary.parentElement;
        var wasOpen = accIsOpen(details);
        return function () {
          if (accIsOpen(details) !== wasOpen) return; // it toggled after all
          setAcc(details, !wasOpen);
        };
      }
      var tabBtn = target && target.closest ? target.closest("[data-mt-tab]") : null;
      if (tabBtn) {
        return function () {
          if (tabBtn.getAttribute("aria-selected") !== "true") selectTab(tabBtn);
        };
      }
      var opener = target && target.closest ? target.closest("[data-mt-sheet-open]") : null;
      if (opener) {
        return function () {
          var dialog = document.getElementById(opener.getAttribute("aria-controls"));
          if (dialog && dialog.tagName === "DIALOG" && !dialog.open) openSheet(dialog, opener);
        };
      }
      var videoExpand = target && target.closest ? target.closest('[data-mt-expand-video]') : null;
      if (videoExpand) return function () {
        var media = videoExpand.closest('.media-gallery__local-video,.media-gallery__external-video');
        var gallery = videoExpand.closest('[data-mt-lightbox], [data-mt-media-viewer]');
        if (media && gallery) openLightbox(gallery,media);
      };
      var item = target && target.closest ? target.closest("[data-mt-lightbox] [data-mt-src]") : null;
      if (item && !item.closest(".media-thumb-swiper, .thumbnail-slide") &&
          !target.closest("button, video, iframe, product-model, .cloudimage-360")) {
        return function () {
          if (lb && lb.dialog.open) return;
          openLightbox(item.closest("[data-mt-lightbox]"), item);
        };
      }
      // Add to wishlist: toggled here when the press changed nothing.
      var heart = target && target.closest ? target.closest("[data-mt-wishlist]") : null;
      if (heart) {
        var wasOn = wishlistHas(heart.dataset.productId);
        return function () {
          if (wishlistHas(heart.dataset.productId) !== wasOn) return;
          wishlistToggle(heart);
        };
      }
      return null;
    };
    /* A video's own controls are the browser's: the builder cancelling the
       click (to select the block) stops them. A press on a gallery video,
       or on a Product videos card, that changed nothing plays it here. */
    var videoActionFor = function (target, x, y) {
      var video = target && target.closest ? target.closest("video") : null;
      if (video && video.closest("[data-mt-video], .pv-inline, .pv-modal")) {
        var r = video.getBoundingClientRect();
        // The control bar: only its play button (bottom left) toggles.
        if (video.controls && y > r.bottom - 48 && x > r.left + 56) return null;
        var wasPaused = video.paused;
        return function () {
          if (video.paused !== wasPaused) return;
          if (video.paused) playWithSound(video);
          else video.pause();
        };
      }
      var card = target && target.closest ? target.closest(".pv-card[data-item]") : null;
      if (card && !target.closest(".pv-inline")) {
        var at = Date.now();
        return function () {
          var box = card.closest("[id^='PV-']");
          if (box && box.__pvLast >= at) return;
          if (typeof card.__pvOpen === "function") card.__pvOpen();
        };
      }
      return null;
    };
    window.addEventListener("pointerdown", function (e) {
      press = null;
      if (e.button !== 0 || e.isPrimary === false) return;
      var run = actionFor(e.target) || videoActionFor(e.target, e.clientX, e.clientY);
      if (run) press = { x: e.clientX, y: e.clientY, run: run };
    }, true);
    window.addEventListener("pointercancel", function () { press = null; }, true);
    window.addEventListener("pointerup", function (e) {
      var p = press;
      press = null;
      if (!p || Math.abs(e.clientX - p.x) > 6 || Math.abs(e.clientY - p.y) > 6) return;
      var at = now();
      setTimeout(function () {
        if (lastHandled >= at) return;
        p.run();
      }, 350);
    }, true);
    window.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && summaryFor(e.target) === e.target) keyAt = now();
    }, true);
    window.addEventListener("keyup", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (summaryFor(e.target) !== e.target || !keyAt) return;
      var at = keyAt;
      keyAt = 0;
      var run = actionFor(e.target);
      setTimeout(function () {
        if (lastHandled >= at || !run) return;
        run();
      }, 200);
    }, true);
  } else {
    /* Live site: a tap on a paused gallery video plays it. A phone's own
       controls only show themselves on the first tap, which read as the
       video not playing at all. A mouse click the controls already
       answered (the video changed) is left alone, so nothing runs twice. */
    var livePress = null;
    window.addEventListener("pointerdown", function (e) {
      livePress = null;
      if (e.button !== 0 || e.isPrimary === false) return;
      var video = e.target && e.target.closest ? e.target.closest("video") : null;
      if (!video || !video.closest("[data-mt-video]")) return;
      var r = video.getBoundingClientRect();
      if (video.controls && e.clientY > r.bottom - 48) return; // the control bar is the browser's
      livePress = { x: e.clientX, y: e.clientY, video: video, wasPaused: video.paused, touch: e.pointerType !== "mouse" };
    }, true);
    window.addEventListener("pointercancel", function () { livePress = null; }, true);
    window.addEventListener("pointerup", function (e) {
      var p = livePress;
      livePress = null;
      if (!p || Math.abs(e.clientX - p.x) > 6 || Math.abs(e.clientY - p.y) > 6) return;
      setTimeout(function () {
        var v = p.video;
        if (!v.isConnected || v.paused !== p.wasPaused) return; // the browser answered
        if (v.paused) playWithSound(v);
        else if (!p.touch || !v.controls) v.pause(); // a phone's controls carry their own pause
      }, 300);
    }, true);
  }

  /* ---------------------------------------------------------------------
     4. Gallery video: a video plays (muted) while it is on screen when the
        gallery says autoplay, and pauses as soon as its slide leaves.
     ------------------------------------------------------------------- */
  function postToFrame(frame, play) {
    if (!frame || !frame.contentWindow) return;
    var src = frame.getAttribute("src") || "";
    var msg = null;
    if (src.indexOf("youtube") > -1) {
      msg = JSON.stringify({ event: "command", func: play ? "playVideo" : "pauseVideo", args: "" });
    } else if (src.indexOf("vimeo") > -1) {
      msg = JSON.stringify({ method: play ? "play" : "pause" });
    }
    if (!msg) return;
    try {
      frame.contentWindow.postMessage(msg, "*");
    } catch (err) {}
  }
  function playMedia(el) {
    if (lb && lb.dialog.open) return;
    if (el.tagName === "VIDEO") {
      el.muted = true;
      var p = el.play();
      if (p && p.catch) p.catch(function () {});
    } else if (el.tagName === "IFRAME") {
      postToFrame(el, true);
      // The player may still be starting: ask again shortly.
      setTimeout(function () { if (el._mtVisible) postToFrame(el, true); }, 900);
    }
  }
  function pauseMedia(el) {
    if (el.tagName === "VIDEO") {
      if (!el.paused) el.pause();
    } else if (el.tagName === "IFRAME") {
      postToFrame(el, false);
    }
  }
  function pauseGalleryMedia(root) {
    root.querySelectorAll("video.media-video, iframe.media-video").forEach(pauseMedia);
  }
  /* A gallery video's own controls (play, the timeline, sound, full screen)
     can stop answering in Chrome once its slide has been moved into view
     by the slider: nothing plays, nothing scrubs, on the live site and in
     the builder alike. Turning the controls off and on again draws them
     afresh, so they are re-armed each time the video comes into view. */
  function rearmControls(el) {
    if (el.tagName !== "VIDEO" || !el.hasAttribute("controls")) return;
    el.controls = false;
    void el.offsetWidth;
    el.controls = true;
  }
  var observer = null;
  function onIntersect(entries) {
    entries.forEach(function (entry) {
      var el = entry.target;
      var visible = entry.isIntersecting && entry.intersectionRatio >= 0.6;
      if (visible && !el._mtVisible) rearmControls(el);
      el._mtVisible = visible;
      var gallery = el.closest("[data-mt-video]");
      var autoplay = gallery && gallery.getAttribute("data-mt-video") === "autoplay";
      if (visible && autoplay && !(lb && lb.dialog.open)) playMedia(el);
      else if (!visible) pauseMedia(el);
    });
  }
  function scanVideos(root) {
    if (!("IntersectionObserver" in window)) return;
    if (!observer) observer = new IntersectionObserver(onIntersect, { threshold: [0, 0.6] });
    (root || document).querySelectorAll("[data-mt-video] .media-video").forEach(function (el) {
      if (el._mtObserved) return;
      el._mtObserved = true;
      if (el.tagName === "IFRAME") {
        el.addEventListener("load", function () {
          if (el._mtVisible) {
            var g = el.closest("[data-mt-video]");
            if (g && g.getAttribute("data-mt-video") === "autoplay") playMedia(el);
          }
        });
      }
      observer.observe(el);
    });
  }
  function rescan(e) {
    if (lb && lb.dialog.open && lb.opener && !lb.opener.isConnected) closeLightbox();
    // A builder redraw may remove an open sheet without its close callback.
    // Release only disconnected owners, never another active dialog's lock.
    refreshLocks();
    var root = e && e.target && e.target.querySelectorAll ? e.target : document;
    scanVideos(root);
    scanVideoViewers(root);
  }
  function scanVideoViewers(root) {
    (root || document).querySelectorAll(':is([data-mt-lightbox], [data-mt-media-viewer]) :is(.media-gallery__local-video, .media-gallery__external-video)').forEach(function (media) {
      if (media.closest('.media-thumb-swiper, .thumbnail-slide, .swiper-slide-duplicate') || !media.querySelector('video,iframe') || media.querySelector('[data-mt-expand-video]')) return;
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'mt-media-expand'; button.dataset.mtExpandVideo = '';
      button.setAttribute('aria-label','Open video in media viewer');
      button.innerHTML = icon('<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>');
      media.appendChild(button);
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { rescan(); });
  } else {
    rescan();
  }
  window.addEventListener("load", function () { rescan(); });
  document.addEventListener("storelib:section-load", rescan);
  document.addEventListener("shopify:section:load", rescan);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) document.querySelectorAll("[data-mt-video] .media-video").forEach(pauseMedia);
  });

  // A press in the builder plays with sound; a browser that refuses plays muted.
  function playWithSound(video) {
    var p = video.play();
    if (p && p.catch) p.catch(function () {
      video.muted = true;
      var q = video.play();
      if (q && q.catch) q.catch(function () {});
    });
  }

  /* ---------------------------------------------------------------------
     5. Add to wishlist in the Buy buttons block (<button-wishlist
        data-mt-wishlist>). The theme's wishlist (theme.js MateriaWishlist
        and its <button-wishlist>) saves the product and fires
        materia:wishlist-change, which the header count follows. When it is
        not on the page this keeps the same list (materia__wishlist-items)
        and fires the same event. Every Add to wishlist button shows the
        saved state: pressed, the filled heart and its label.
     ------------------------------------------------------------------- */
  var WISHLIST_KEY = "materia__wishlist-items";
  var wishlistMemory = null;
  function wishlistItems() {
    if (window.MateriaWishlist && window.MateriaWishlist.read) return window.MateriaWishlist.read();
    try {
      var raw = window.localStorage.getItem(WISHLIST_KEY);
      if (raw === null) return wishlistMemory ? wishlistMemory.slice() : [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list.map(String) : [];
    } catch (e) {
      return wishlistMemory ? wishlistMemory.slice() : [];
    }
  }
  function wishlistHas(id) {
    return wishlistItems().indexOf(String(id)) !== -1;
  }
  function paintWishlist(root) {
    var items = wishlistItems();
    (root && root.querySelectorAll ? root : document).querySelectorAll("[data-mt-wishlist]").forEach(function (button) {
      var on = items.indexOf(String(button.dataset.productId)) !== -1;
      button.classList.toggle("active", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
      var label = button.querySelector(".pdp-wishlist__label");
      var text = on ? button.dataset.tooltipRemove : button.dataset.tooltipAdd;
      if (label && text && label.textContent !== text) label.textContent = text;
    });
  }
  function wishlistToggle(button) {
    var id = String(button.dataset.productId || "");
    if (!id) return;
    var adding = !wishlistHas(id);
    if (window.MateriaWishlist && window.MateriaWishlist.toggle) {
      window.MateriaWishlist.toggle(id); // saves, syncs every heart and fires the event
    } else {
      var items = wishlistItems().filter(function (x) { return x !== id; });
      if (adding) items.push(id);
      wishlistMemory = items.slice();
      try { window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items)); } catch (e) {}
      try {
        document.dispatchEvent(new CustomEvent("materia:wishlist-change", { detail: { items: items.slice(), count: items.length, id: id, added: adding } }));
      } catch (e) {}
    }
    if (adding) {
      button.classList.remove("is-toggled");
      void button.offsetWidth;
      button.classList.add("is-toggled");
    }
    paintWishlist();
  }
  // Without the theme's <button-wishlist> element the press is handled here.
  function wishlistOwnsPress() {
    return !(window.customElements && window.customElements.get("button-wishlist"));
  }
  document.addEventListener("click", function (e) {
    var button = e.target && e.target.closest ? e.target.closest("[data-mt-wishlist]") : null;
    if (!button) return;
    e.preventDefault();
    if (wishlistOwnsPress()) return wishlistToggle(button);
    // An older theme wishlist saves without telling anyone: say it changed.
    setTimeout(function () {
      if (!window.MateriaWishlist) {
        var items = wishlistItems();
        try {
          document.dispatchEvent(new CustomEvent("materia:wishlist-change", { detail: { items: items, count: items.length, id: String(button.dataset.productId), added: items.indexOf(String(button.dataset.productId)) !== -1 } }));
        } catch (err) {}
      }
      paintWishlist();
    }, 0);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var button = e.target && e.target.closest ? e.target.closest("[data-mt-wishlist]") : null;
    if (!button || button !== e.target || !wishlistOwnsPress()) return;
    e.preventDefault();
    wishlistToggle(button);
  });
  document.addEventListener("materia:wishlist-change", function () { paintWishlist(); });
  window.addEventListener("storage", function (e) { if (e.key === WISHLIST_KEY || e.key === null) paintWishlist(); });
  window.addEventListener("pageshow", function () { paintWishlist(); });
  document.addEventListener("storelib:section-load", function (e) { paintWishlist(e.target); });
  document.addEventListener("shopify:section:load", function (e) { paintWishlist(e.target); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { paintWishlist(); });
  else paintWishlist();

  /* ---------------------------------------------------------------------
     6. Sticky media (Main product, Featured product, the product spotlight):
        on a computer the gallery and the information column are both
        sticky under the header (product-page-ui.css), so whichever is
        shorter stays in view while the other scrolls. A column taller than
        the screen would have its end cut off, so it scrolls with the page
        until its end shows and sticks there (--mt-sticky-tall). Measured
        only when a column or the window changes size: nothing on scroll.
     ------------------------------------------------------------------- */
  var STICKY = "media-gallery.sticky.top-30, .product-detail__media > .sticky.top-30, .product-detail__information > .sticky.top-30, [data-mt-sticky]";
  var wideQuery = window.matchMedia ? window.matchMedia("(min-width: 768px)") : null;
  var stickyEls = new Set();
  var stickyRo = null;
  var stickyFrame = 0;
  function headerTop() {
    var css = getComputedStyle(document.documentElement);
    var productTop = parseFloat(css.getPropertyValue("--product-sticky-top"));
    var v = Number.isFinite(productTop) ? productTop : parseFloat(css.getPropertyValue("--sticky-top")) || 0;
    return v;
  }
  function measureSticky() {
    stickyFrame = 0;
    var on = !wideQuery || wideQuery.matches;
    var vh = window.innerHeight;
    var room = vh - headerTop() - 40;
    var writes = [];
    stickyEls.forEach(function (el) {
      if (!el.isConnected || (el.parentElement && el.parentElement.closest(STICKY))) {
        stickyEls.delete(el);
        if (stickyRo) stickyRo.unobserve(el);
        el.classList.remove('mt-sticky-tall');el.style.removeProperty('--mt-sticky-tall');
        return;
      }
      var h = el.offsetHeight;
      writes.push([el, on && h > room ? Math.round(vh - h - 20) + "px" : null]);
    });
    writes.forEach(function (w) {
      var el = w[0];
      if (w[1] == null) {
        if (el.classList.contains("mt-sticky-tall")) {
          el.classList.remove("mt-sticky-tall");
          el.style.removeProperty("--mt-sticky-tall");
        }
        return;
      }
      if (el.style.getPropertyValue("--mt-sticky-tall") !== w[1]) el.style.setProperty("--mt-sticky-tall", w[1]);
      if (!el.classList.contains("mt-sticky-tall")) el.classList.add("mt-sticky-tall");
    });
  }
  function scheduleSticky() {
    if (!stickyFrame) stickyFrame = requestAnimationFrame(measureSticky);
  }
  function scanSticky(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var found = Array.prototype.slice.call(scope.querySelectorAll(STICKY));
    if (scope.matches && scope.matches(STICKY)) found.push(scope);
    found.forEach(function (el) {
      if(el.parentElement && el.parentElement.closest(STICKY))return;
      if (stickyEls.has(el)) return;
      stickyEls.add(el);
      if (!stickyRo && "ResizeObserver" in window) stickyRo = new ResizeObserver(scheduleSticky);
      if (stickyRo) stickyRo.observe(el);
    });
    scheduleSticky();
  }
  window.addEventListener("resize", scheduleSticky);
  // Re-measure only when the visible header offset actually changes; never
  // retain the largest header height from an earlier editor/viewport state.
  var lastStickyOffset='';
  var stickyRootObserver = new MutationObserver(function(){
    var root=document.documentElement;
    if(!root)return;
    var offset=root.style.getPropertyValue('--product-sticky-top')+'|'+root.style.getPropertyValue('--sticky-top');
    if(offset!==lastStickyOffset){lastStickyOffset=offset;scheduleSticky();}
  });
  function watchStickyRoot(){
    stickyRootObserver.disconnect();lastStickyOffset='';
    if(!document.documentElement)return;
    stickyRootObserver.observe(document.documentElement,{attributes:true,attributeFilter:['style']});
    scheduleSticky();
  }
  watchStickyRoot();
  // A full canvas redraw may replace <html> without replacing the window.
  new MutationObserver(watchStickyRoot).observe(document,{childList:true});

  /* ---------------------------------------------------------------------
     7. Gallery health. A product gallery is never left blank: its pictures
        show as soon as they have loaded (the theme's reveal class could
        stay on a picture drawn again by the builder, an empty white box
        with only the arrows), the slider is built once the gallery is in
        view, built again if a redraw kept the element but reset its
        markup, and measured again when its slides or width changed.
        Runs for every gallery: on load, on each builder redraw (with or
        without an event, media-gallery tells it), after a new product is
        picked, and each time a gallery comes into view.
     ------------------------------------------------------------------- */
  function revealImage(img) {
    img.classList.remove("bls-loading-image");
    var motion = img.closest("motion-element");
    if (motion) motion.classList.remove("bls-loading-image");
  }
  // A picture the image service could not resize is asked for as uploaded.
  function originalOf(src) {
    var at = src ? src.indexOf("/_next/image?") : -1;
    if (at < 0) return "";
    try {
      return new URL(src, location.href).searchParams.get("url") || "";
    } catch (err) {
      return "";
    }
  }
  function settle(img) {
    var frame = img._mtFrame;
    if (frame) frame.classList.remove("mt-media-loading");
    var src = img.currentSrc || img.getAttribute("src");
    if (src) loadedGallerySrcs.add(src);
    revealImage(img);
  }
  function healImages(gallery) {
    gallery.querySelectorAll("img").forEach(function (img) {
      var src = img.currentSrc || img.getAttribute("src");
      if ((src && loadedGallerySrcs.has(src)) || img.complete) {
        if (img.complete && !img.naturalWidth && !img._mtRetried && img.getAttribute("src")) onError(img);
        else settle(img);
        return;
      }
      if (img._mtWatch) return;
      img._mtWatch = true;
      // Until it arrives the slide shows a soft placeholder, never a blank box.
      img._mtFrame = img.closest('[style*="--aspect-ratio"]');
      if (img._mtFrame) img._mtFrame.classList.add("mt-media-loading");
      img.addEventListener("load", function () { settle(img); });
      img.addEventListener("error", function () { onError(img); });
    });
  }
  function onError(img) {
    var original = img._mtRetried ? "" : originalOf(img.currentSrc || img.getAttribute("src"));
    img._mtRetried = true;
    if (original) {
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.src = original;
      return;
    }
    settle(img);
  }
  function rebuildSlider(holder) {
    try { if (holder.thumbnailSlide && !holder.thumbnailSlide.destroyed) holder.thumbnailSlide.destroy(true, true); } catch (err) {}
    try { if (holder.globalSlide && !holder.globalSlide.destroyed) holder.globalSlide.destroy(true, true); } catch (err) {}
    holder.globalSlide = null;
    holder.thumbnailSlide = null;
    if (typeof holder.start === "function") holder.start();
  }
  var galleryPositions = new Map();
  function galleryPositionKey(gallery) {
    var section=gallery?.closest('[id^="shopify-section-"], .shopify-section');
    var product=gallery?.getAttribute('data-mt-product-id');
    return section?.id && product ? section.id+':'+product : '';
  }
  const loadedGallerySrcs = new Set();
  window.MateriaGalleryState={
    initial:function(gallery,count){var saved=galleryPositions.get(galleryPositionKey(gallery));return saved!=null && saved<count ? saved : 0;},
    seen:function(gallery){return galleryPositions.has(galleryPositionKey(gallery));},
    bind:rememberGalleryPosition
  };
  function rememberGalleryPosition(gallery, sw) {
    if (sw._mtPositionBound) return;
    sw._mtPositionBound = true;
    var key=galleryPositionKey(gallery);
    if(!key)return;
    var saved = galleryPositions.get(key);
    if (saved != null && saved < sw.slides.length) sw.slideTo(saved, 0, false);
    var remember = function () {
      galleryPositions.set(key, sw.activeIndex);
      if (galleryPositions.size > 40) galleryPositions.delete(galleryPositions.keys().next().value);
    };
    sw.on?.('slideChange', remember);
    remember();
  }
  function healSlider(gallery, inView) {
    var holder = gallery.querySelector("slide-with-thumbs");
    if (!holder || !holder.isConnected) return;
    var el = holder.querySelector(".swiper-wrapper-preview");
    if (!el) return;
    var sw = el.swiper;
    if (!sw || sw.destroyed) {
      if (holder.globalSlide && (holder.globalSlide.destroyed || holder.globalSlide.el !== el)) {
        holder.globalSlide = null;
        holder.thumbnailSlide = null;
      }
      // In view and still not built (its near-view call was missed).
      if (inView && !holder.globalSlide && typeof holder.ensureStarted === "function" && window.Swiper) holder.ensureStarted();
      return;
    }
    // The element was kept but its markup drawn again: the slider lost its frame.
    if (!el.classList.contains("swiper-initialized")) {
      rebuildSlider(holder);
      return;
    }
    var slides = el.querySelectorAll(":scope > .swiper-wrapper > .swiper-slide:not(.swiper-slide-duplicate)");
    var liveSlides = [];
    for (var s = 0; s < sw.slides.length; s++) if (!sw.slides[s].classList.contains("swiper-slide-duplicate")) liveSlides.push(sw.slides[s]);
    var same = slides.length === liveSlides.length;
    for (var i = 0; same && i < slides.length; i++) if (slides[i] !== liveSlides[i]) same = false;
    // A settings change kept this gallery. Measuring it and calling update()
    // is what shifted the thumbnails on every slider drag.
    if (gallery._mtHeld && same && el.classList.contains("swiper-initialized")) {
      rememberGalleryPosition(gallery, sw);
      return;
    }
    var width = el.clientWidth;
    if (!same || (width && Math.abs((sw.width || 0) - width) > 8)) sw.update();
    if (!slides.length) return;
    rememberGalleryPosition(gallery, sw);
    if (sw.activeIndex > slides.length - 1) sw.slideTo(0, 0, false);
    if (!inView || !width) return;
    // The current slide must be inside the frame. A zero box is a frame
    // mid-redraw, not a slide that left the picture.
    var active = sw.slides[sw.activeIndex];
    if (!active) return;
    var a = active.getBoundingClientRect();
    var b = el.getBoundingClientRect();
    if (a.width < 1 || b.width < 1) return;
    var horizontal = typeof sw.isHorizontal !== "function" || sw.isHorizontal();
    var outside = horizontal ? (a.right <= b.left + 1 || a.left >= b.right - 1) : (a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
    if (outside) {
      sw.update();
      sw.slideTo(sw.activeIndex, 0, false);
    }
  }
  function healGallery(gallery, inView) {
    if (!gallery || !gallery.isConnected) return;
    healImages(gallery);
    try { healSlider(gallery, inView); } catch (err) {}
  }
  var galleryIo = null;
  var galleriesSeen = typeof WeakSet === "function" ? new WeakSet() : null;
  function watchGallery(gallery) {
    if (!gallery || gallery.nodeType !== 1) return;
    healImages(gallery);
    scanSticky(gallery);
    if (!("IntersectionObserver" in window)) { healGallery(gallery, true); return; }
    if (!galleryIo) {
      galleryIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var g = entry.target;
          // After the slider's own near-view build (a task) has had its turn.
          setTimeout(function () { healGallery(g, true); }, 60);
        });
      }, { rootMargin: "200px 0px" });
    }
    if (galleriesSeen) {
      if (galleriesSeen.has(gallery)) return;
      galleriesSeen.add(gallery);
    }
    galleryIo.observe(gallery);
  }
  function galleriesIn(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var list = Array.prototype.slice.call(scope.querySelectorAll("media-gallery"));
    if (scope.matches && scope.matches("media-gallery")) list.push(scope);
    return list;
  }
  function onRedraw(e) {
    var root = e && e.target && e.target.querySelectorAll ? e.target : document;
    scanSticky(root);
    galleriesIn(root).forEach(function (g) {
      watchGallery(g);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { healGallery(g, true); });
      });
    });
  }
  window.MateriaGalleryHeal = watchGallery;
  function firstScan() {
    scanSticky(document);
    galleriesIn(document).forEach(watchGallery);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", firstScan);
  else firstScan();
  window.addEventListener("load", function () {
    scheduleSticky();
    galleriesIn(document).forEach(function (g) { healImages(g); });
  });
  document.addEventListener("storelib:section-load", onRedraw);
  document.addEventListener("shopify:section:load", onRedraw);
  function refreshVsp(type) {
    document.querySelectorAll('[data-vsp][data-vsp-mode="theme"]').forEach(function(root){
      var fill=type==='variant_images'?'image':'color';
      root.querySelectorAll('.vsp__option--color .vsp__cell').forEach(function(cell){
        var chip=cell.querySelector('.vsp__chip');if(!chip)return;
        if(!cell._vspOriginal){cell._vspOriginal=chip.cloneNode(true);cell._vspFill=root.dataset.vspFill;}
        if(fill===cell._vspFill){chip.replaceWith(cell._vspOriginal.cloneNode(true));return;}
        var next=cell._vspOriginal.cloneNode(false);
        if(fill==='image' && cell.dataset.vspImage){
          var img=document.createElement('img');img.src=cell.dataset.vspImage;img.alt='';img.width=120;img.height=120;img.loading='lazy';next.className='vsp__chip vsp__chip--image';next.appendChild(img);
        }else{
          next.className='vsp__chip vsp__chip--dot';var color=cell.dataset.vspColorValue;
          if(color && CSS.supports('color',color))next.style.setProperty('--vsp-dot',color);
          else{next.classList.add('vsp__chip--text');next.textContent=cell.title;}
        }
        chip.replaceWith(next);
      });
    });
  }
  // A setting drawn in place (no redraw): its section's galleries are checked.
  document.addEventListener("storelib:settings-change", function (e) {
    var d = e && e.detail;
    if(d && !d.section && d.settings && d.settings.swatch_item_type)refreshVsp(d.settings.swatch_item_type);
    // A slider drag only changes a value. Rebuilding the product photos here
    // is what made the thumbnails jump on every adjustment.
    if (!d || !d.section || d.live) return;
    var keys = d.settings ? Object.keys(d.settings) : [];
    var touchesGallery = keys.some(function (key) {
      return /layout|thumbnail|image|media|gallery|zoom|ratio|crop/i.test(key);
    });
    if (keys.length && !touchesGallery) return;
    var section = document.getElementById("shopify-section-" + d.section);
    if (section) requestAnimationFrame(function () { onRedraw({ target: section }); });
  });

  window.MateriaProductUi = { openSheet: openSheet, closeSheet: closeSheet, openLightbox: openLightbox, closeLightbox: closeLightbox, scanVideos: scanVideos, paintWishlist: paintWishlist, healGallery: healGallery, scanSticky: scanSticky };
})();
