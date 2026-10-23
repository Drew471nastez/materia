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

  /* ---------------------------------------------------------------------
     1. Accordions: <details class="mt-acc"><summary>..</summary>
        <div class="mt-acc__body">..</div></details>
     Native details open and close with no script. Here the height is
     animated where CSS cannot do it.
     ------------------------------------------------------------------- */
  document.addEventListener("click", function (e) {
    var summary = e.target && e.target.closest ? e.target.closest("details.mt-acc > summary") : null;
    if (!summary) return;
    if (e.target.closest("a[href]") && e.target.closest("a[href]") !== summary) return;
    var details = summary.parentElement;
    if (cssAccordion || reduced() || typeof details.animate !== "function") return;
    var body = null;
    for (var i = 0; i < details.children.length; i++) {
      if (details.children[i].classList.contains("mt-acc__body")) body = details.children[i];
    }
    if (!body) return;
    e.preventDefault();
    var opening = !details.open || details.classList.contains("is-closing");
    var from = details.open ? body.getBoundingClientRect().height : 0;
    if (details._mtAnim) details._mtAnim.cancel();
    details.open = true;
    details.classList.toggle("is-closing", !opening);
    var to = opening ? body.scrollHeight : 0;
    body.style.overflow = "hidden";
    var anim = body.animate(
      { height: [from + "px", to + "px"], opacity: opening ? [0.4, 1] : [1, 0.4] },
      { duration: 320, easing: "cubic-bezier(.4,0,.2,1)" }
    );
    details._mtAnim = anim;
    anim.onfinish = function () {
      details._mtAnim = null;
      body.style.overflow = "";
      details.classList.remove("is-closing");
      if (!opening) details.open = false;
    };
    anim.oncancel = function () {
      body.style.overflow = "";
    };
  });

  /* ---------------------------------------------------------------------
     2. Sheets: a button with data-mt-sheet-open and aria-controls naming a
        <dialog class="mt-sheet">. A bottom sheet on phones, a centred
        panel on larger screens. Closes on the backdrop, Escape and its
        close button.
     ------------------------------------------------------------------- */
  var lockCount = 0;
  function lockPage(on) {
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    document.documentElement.classList.toggle("mt-lock", lockCount > 0);
  }
  function openSheet(dialog, opener) {
    if (!dialog || dialog.open) return;
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
    lockPage(true);
    dialog.classList.remove("is-closing");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        dialog.classList.add("is-open");
      });
    });
    if (opener) opener.setAttribute("aria-expanded", "true");
  }
  function closeSheet(dialog) {
    if (!dialog || !dialog.open || dialog.classList.contains("is-closing")) return;
    dialog.classList.remove("is-open");
    dialog.classList.add("is-closing");
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      dialog.classList.remove("is-closing");
      try {
        dialog.close();
      } catch (err) {
        dialog.removeAttribute("open");
      }
      lockPage(false);
      var opener = dialog._mtOpener;
      if (opener) {
        opener.setAttribute("aria-expanded", "false");
        if (document.contains(opener)) opener.focus({ preventScroll: true });
      }
    }
    if (reduced()) return finish();
    var panel = dialog.querySelector(".mt-sheet__panel") || dialog;
    panel.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, 380);
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var opener = t.closest("[data-mt-sheet-open]");
    if (opener) {
      var dialog = document.getElementById(opener.getAttribute("aria-controls"));
      if (dialog && dialog.tagName === "DIALOG") {
        e.preventDefault();
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
    d.setAttribute("aria-label", "Image viewer");
    d.innerHTML =
      '<div class="mt-lb__track" tabindex="-1"></div>' +
      '<p class="mt-lb__count" aria-live="polite"></p>' +
      '<button type="button" class="mt-lb__btn mt-lb__close" aria-label="Close">' + icon('<path d="M6 6l12 12M18 6 6 18"/>') + "</button>" +
      '<button type="button" class="mt-lb__btn mt-lb__prev" aria-label="Previous image">' + icon('<path d="m15 18-6-6 6-6"/>') + "</button>" +
      '<button type="button" class="mt-lb__btn mt-lb__next" aria-label="Next image">' + icon('<path d="m9 18 6-6-6-6"/>') + "</button>";
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
    gallery.querySelectorAll("[data-mt-src]").forEach(function (el) {
      if (el.closest(".media-thumb-swiper, .thumbnail-slide, .swiper-slide-duplicate")) return;
      var src = el.getAttribute("data-mt-src");
      if (!src || seen[src]) return;
      seen[src] = true;
      var img = el.querySelector("img");
      list.push({
        el: el,
        src: src,
        alt: img ? img.getAttribute("alt") || "" : "",
        w: parseInt(el.getAttribute("data-pswp-width"), 10) || 0,
        h: parseInt(el.getAttribute("data-pswp-height"), 10) || 0,
      });
    });
    return list;
  }
  function openLightbox(gallery, startEl) {
    if (!lb) lb = buildLightbox();
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
    lockPage(true);
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
      lockPage(false);
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
    var t = e.target;
    if (!t || !t.closest) return;
    var item = t.closest("[data-mt-src]");
    if (!item) return;
    var gallery = item.closest("[data-mt-lightbox]");
    if (!gallery) return;
    if (item.closest(".media-thumb-swiper, .thumbnail-slide")) return;
    if (t.closest("button, video, iframe, product-model, .cloudimage-360")) return;
    e.preventDefault();
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
  var observer = null;
  function onIntersect(entries) {
    entries.forEach(function (entry) {
      var el = entry.target;
      var visible = entry.isIntersecting && entry.intersectionRatio >= 0.6;
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
    var root = e && e.target && e.target.querySelectorAll ? e.target : document;
    scanVideos(root);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { scanVideos(document); });
  } else {
    scanVideos(document);
  }
  window.addEventListener("load", function () { scanVideos(document); });
  document.addEventListener("storelib:section-load", rescan);
  document.addEventListener("shopify:section:load", rescan);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) document.querySelectorAll("[data-mt-video] .media-video").forEach(pauseMedia);
  });

  window.MateriaProductUi = { openSheet: openSheet, closeSheet: closeSheet, openLightbox: openLightbox, closeLightbox: closeLightbox, scanVideos: scanVideos };
})();
