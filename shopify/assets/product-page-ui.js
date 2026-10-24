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
    d.setAttribute("data-no-image-carry", "");
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
      var opener = target && target.closest ? target.closest("[data-mt-sheet-open]") : null;
      if (opener) {
        return function () {
          var dialog = document.getElementById(opener.getAttribute("aria-controls"));
          if (dialog && dialog.tagName === "DIALOG" && !dialog.open) openSheet(dialog, opener);
        };
      }
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

  window.MateriaProductUi = { openSheet: openSheet, closeSheet: closeSheet, openLightbox: openLightbox, closeLightbox: closeLightbox, scanVideos: scanVideos, paintWishlist: paintWishlist };
})();
