/* Materia Themes. Developed By Materia Themes. */
"use-strict";
import "./cart-components.js";

// Motion.animate when motion.min.js has loaded; otherwise jump straight to the
// final values so menus and search still open (and their .then still runs)
// instead of throwing halfway with the page already scroll-locked.
function motionAnimate(el, keyframes, options) {
  try {
    if (window.Motion && typeof window.Motion.animate === "function") {
      return window.Motion.animate(el, keyframes, options);
    }
  } catch (e) { console.error("[theme] animate", e); }
  const list = !el ? [] : (el.length !== undefined && !el.style) ? Array.from(el) : [el];
  list.forEach((node) => {
    if (!node || !node.style) return;
    Object.keys(keyframes || {}).forEach((key) => {
      let value = keyframes[key];
      if (Array.isArray(value)) value = value[value.length - 1];
      if (key === "y" || key === "x") {
        const unit = typeof value === "number" ? `${value}px` : value;
        node.style.transform = key === "y" ? `translateY(${unit})` : `translateX(${unit})`;
      } else {
        node.style[key] = value;
      }
    });
  });
  return Promise.resolve();
}

function initComparisons() {
  var x, i;
  x = document.getElementsByClassName("img-comp-overlay");
  for (i = 0; i < x.length; i++) {
    compareImages(x[i]);
  }
  function compareImages(img) {
    var slider,
      img,
      clicked = 0,
      w;
    w = img.offsetWidth;
    const icc = img.closest(".img-comp-container");
    if (icc) {
      slider = icc.querySelector(".image-comparison__button");
    }
    if (slider) {
      slider.addEventListener("touchstart", slideReady);
      slider.addEventListener("mousedown", slideReady);
    }
    window.addEventListener("mouseup", slideFinish);
    window.addEventListener("touchend", slideFinish);
    function slideReady(e) {
      e.preventDefault();
      clicked = 1;
      window.addEventListener("mousemove", slideMove);
      window.addEventListener("touchmove", slideMove);
    }
    function slideFinish() {
      clicked = 0;
    }
    function slideMove(e) {
      var pos;
      if (clicked == 0) return false;
      pos = getCursorPos(e);
      if (pos < 0) pos = 0;
      if (pos > w) pos = w;
      slide(pos);
    }
    function getCursorPos(e) {
      e = e.changedTouches ? e.changedTouches[0] : e;
      const a = img.getBoundingClientRect();
      let x = e.clientX - a.left + 14;
      x = Math.max(0, Math.min(x, w));

      return x;
    }

    function slide(x) {
      if (slider) {
        const sliderHalfWidth = slider.offsetWidth / 2;
        let percent = ((x - sliderHalfWidth) / w) * 100;
        let min = (sliderHalfWidth / icc.getBoundingClientRect().width) * 100;
        console.log(min - 0.1);
        percent = Math.max(min - 0.1, Math.min(percent, 100));
        img
          .closest(".img-comp-container")
          .setAttribute("style", "--percent: " + percent + "%;");
      }
    }
  }
}

try { initComparisons(); } catch (e) { console.error("[theme] comparisons init", e); }
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    initComparisons();
  }, 200);
});

function eventFlashingBrowseTab() {
  var enable = window.flashingBrowseTab?.enable,
    myTimer,
    message,
    titleTag = document.getElementsByTagName("title")[0],
    first_notification = window.flashingBrowseTab?.firstNotification,
    secondary_notification = window.flashingBrowseTab?.secondaryNotification;
  if (enable && titleTag) {
    var originalTitle = titleTag.innerText;
    var isActive = true;
    document.addEventListener("visibilitychange", () => {
      document.visibilityState === "visible"
        ? (function () {
            if (isActive) return;
            clearInterval(myTimer), (titleTag.innerText = originalTitle);
          })()
        : (function () {
            var i = 1;
            if (
              ((isActive = false),
              !first_notification || !secondary_notification)
            )
              return;
            myTimer = setInterval(function () {
              if (i == 1) {
                message = first_notification;
                i = 2;
              } else {
                message = secondary_notification;
                i = 1;
              }
              titleTag.innerText = message;
            }, 2000);
          })();
    });
  }
}
eventFlashingBrowseTab();

function initializeLazyLoad() {
  const videoPlaceholders = document.querySelectorAll(".lazy-video-link");
  const loadYouTubeVideo = (element) => {
    const videoId = element.getAttribute("data-video-id");
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${videoId}?controls=0&autoplay=1&mute=1&playsinline=1&loop=1&playlist=${videoId}`;
    iframe.allowFullscreen = true;
    iframe.frameBorder = "0";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    element.innerHTML = "";
    element.appendChild(iframe);
  };
  const loadVimeoVideo = (element) => {
    const videoId = element.getAttribute("data-video-id");
    const iframe = document.createElement("iframe");
    iframe.src = `https://player.vimeo.com/video/${videoId}?controls=0&background=1&autoplay=1&muted=1&loop=1`;
    iframe.allowFullscreen = true;
    iframe.allow = "autoplay; fullscreen; picture-in-picture";
    iframe.frameBorder = "0";
    element.innerHTML = "";
    element.appendChild(iframe);
  };
  const loadVideo = (element) => {
    const videoType = element.getAttribute("data-video-type");
    if (videoType === "youtube") {
      loadYouTubeVideo(element);
    } else if (videoType === "vimeo") {
      loadVimeoVideo(element);
    }
  };
  const lazyLoadVideos = () => {
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadVideo(entry.target);
          observer.unobserve(entry.target);
        }
      });
    });
    videoPlaceholders.forEach((videoPlaceholder) => {
      observer.observe(videoPlaceholder);
    });
  };
  lazyLoadVideos();
}
try { initializeLazyLoad(); } catch (e) { console.error("[theme] lazy video init", e); }

const slideAnime = (() => {
  let isAnimating = false;

  return (setOptions) => {
    const defaultOptions = {
      target: false,
      animeType: "slideToggle",
      duration: 250,
      easing: "ease",
      isDisplayStyle: "block",
      parent: false,
      addFunction: () => {},
    };
    const options = Object.assign({}, defaultOptions, setOptions);
    const target = options.target;
    const ownAnimate = options.ownAnimate;
    if (ownAnimate) {
      isAnimating = false;
    }
    const parent = options.parent;
    if (!target) {
      return;
    }

    if (isAnimating) {
      return;
    }
    isAnimating = true;
    parent.classList?.toggle("opened");

    let animeType = options.animeType;
    const styles = getComputedStyle(target);
    if (animeType === "slideToggle") {
      animeType = styles.display === "none" ? "slideDown" : "slideUp";
    }
    if (
      (animeType === "slideUp" && styles.display === "none") ||
      (animeType === "slideDown" && styles.display !== "none") ||
      (animeType !== "slideUp" && animeType !== "slideDown")
    ) {
      isAnimating = false;
      return false;
    }
    target.style.overflow = "hidden";
    const duration = options.duration;
    const easing = options.easing;
    const isDisplayStyle = options.isDisplayStyle;

    if (animeType === "slideDown") {
      target.style.display = isDisplayStyle;
    }
    const heightVal = {
      height: target.getBoundingClientRect().height + "px",
      marginTop: styles.marginTop,
      marginBottom: styles.marginBottom,
      paddingTop: styles.paddingTop,
      paddingBottom: styles.paddingBottom,
    };

    Object.keys(heightVal).forEach((key) => {
      if (parseFloat(heightVal[key]) === 0) {
        delete heightVal[key];
      }
    });
    if (Object.keys(heightVal).length === 0) {
      isAnimating = false;
      return false;
    }
    let slideAnime;
    if (animeType === "slideDown") {
      Object.keys(heightVal).forEach((key) => {
        target.style[key] = 0;
      });
      slideAnime = target.animate(heightVal, {
        duration: duration,
        easing: easing,
      });
    } else if (animeType === "slideUp") {
      Object.keys(heightVal).forEach((key) => {
        target.style[key] = heightVal[key];
        heightVal[key] = 0;
      });
      slideAnime = target.animate(heightVal, {
        duration: duration,
        easing: easing,
      });
    }
    slideAnime.finished.then(() => {
      options.addFunction();
      target.style.overflow = "";
      Object.keys(heightVal).forEach((key) => {
        target.style[key] = "";
      });
      if (animeType === "slideUp") {
        target.style.display = "none";
      }
      isAnimating = false;
    });
  };
})();

class CollectionOverviews extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.overviewEvents?.abort();
    this.overviewEvents = new AbortController();
    queueMicrotask(() => {
      if (this.isConnected) this.initSections();
    });
    // Delegate to the current blocks, including replacements made by the editor.
    const activate = (event) => {
      const block = event.target.closest(".content-overview-block");
      const section = block?.closest(".section__block-inner");
      if (!section || !this.contains(section)) return;
      section.querySelectorAll(".content-overview-block").forEach((item) =>
        item.classList.toggle("active", item === block));
      section.querySelectorAll(".banner__media-collection").forEach((item) =>
        item.classList.toggle("active", item.dataset.index === block.dataset.index));
    };
    this.addEventListener("pointerover", activate, { signal: this.overviewEvents.signal });
    this.addEventListener("focusin", activate, { signal: this.overviewEvents.signal });
  }

  disconnectedCallback() {
    this.overviewEvents?.abort();
  }

  initSections() {
    const sections = this.querySelectorAll(".section__block-inner");
    sections.forEach((section) => {
      this.initSection(section);
    });
  }

  initSection(section) {
    const blocks = section.querySelectorAll(".content-overview-block");
    const banners = section.querySelectorAll(".banner__media-collection");

    banners.forEach((banner) => {
      banner.classList.remove("active");
    });

    if (banners.length > 0) {
      banners[0].classList.add("active");
    }

    blocks.forEach((block) => {
      block.classList.remove("active");
    });

    if (blocks.length > 0) {
      blocks[0].classList.add("active");
    }

  }
}

customElements.define("collection-overviews", CollectionOverviews);

class MultiContent extends SlideSection {
  constructor() {
    super();
  }
  init() {
    if (!this.isConnected) return;
    this.resizeEvents?.abort();
    this.resizeEvents = new AbortController();
    if (this.enable == "true") {
      let width = window.innerWidth;
      window.addEventListener("resize", () => {
        const newWidth = window.innerWidth;
        if (newWidth <= 767 && width > 767) {
          this.actionOnMobile();
        }
        if (newWidth > 767 && width <= 767) {
          this.actionOutMobile();
        }
        width = newWidth;
      }, { signal: this.resizeEvents.signal });
      if (width <= 767) {
        this.actionOnMobile();
      } else {
        this.actionOutMobile();
      }
    }
  }
  connectedCallback() {
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.enable = this.dataset.enable;
      if (!this.classList.contains("swiper")) this.swiperSlideInnerHtml = this.innerHTML;
      this.init();
    });
  }
  disconnectedCallback() {
    this.resizeEvents?.abort();
    this.globalSlide?.destroy?.(true, true);
    this.globalSlide = null;
  }
  actionOnMobile() {
    if (this.classList.contains("swiper") && this.globalSlide && !this.globalSlide.destroyed) return;
    this.classList.add("swiper");
    const html = this.swiperSlideInnerHtml.replaceAll(
      "section__block",
      "swiper-slide"
    );
    const wrapper = `<div class='swiper-wrapper'>${html}</div> <div
    class="swiper-pagination  ${
      this.enable && this.dataset.mobile != 1.5 ? "flex" : "hidden"
    } px-15 lh-1 bottom-30 justify-content-center"
    style="--swiper-pagination-bottom: 3rem;--swiper-pagination-position: static;"
  ></div> `;
    this.innerHTML = wrapper;
    this.initSlide();
  }
  actionOutMobile() {
    if (this.classList.contains("swiper")) {
      this.globalSlide?.destroy?.(true, true);
      this.globalSlide = null;
      this.classList.remove("swiper");
      this.innerHTML = this.swiperSlideInnerHtml;
    }
  }
}
customElements.define("multi-content", MultiContent);
/* ── Wishlist store ──────────────────────────────────────────────────
   One list of saved product ids in localStorage ("materia__wishlist-items",
   the key Storelib keeps in step with the website's own wishlist). Every
   heart, the header count and the wishlist page read it through here.
   - read() never throws: a private window, blocked storage or a corrupt
     value read as an empty list (kept in memory for this page).
   - every change fires `materia:wishlist-change` on document with
     { items, count, id, added }, which the header bubble listens for.
   - another tab (storage event) and a page restored from the back/forward
     cache (pageshow) bring every heart back in step. */
var MateriaWishlist = window.MateriaWishlist || (function () {
  var KEY = "materia__wishlist-items";
  var memory = null;
  function clean(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (id) {
      if (id === null || id === undefined) return;
      id = String(id).trim();
      if (id && out.indexOf(id) === -1) out.push(id);
    });
    return out;
  }
  function read() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw === null) return memory ? memory.slice() : [];
      return clean(JSON.parse(raw));
    } catch (e) {
      return memory ? memory.slice() : [];
    }
  }
  function emit(items, extra) {
    var detail = { items: items.slice(), count: items.length };
    for (var k in extra || {}) detail[k] = extra[k];
    try {
      document.dispatchEvent(new CustomEvent("materia:wishlist-change", { detail: detail }));
    } catch (e) {}
  }
  function write(list, extra) {
    var items = clean(list);
    memory = items.slice();
    try { window.localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    sync();
    emit(items, extra);
    return items;
  }
  function has(id) { return read().indexOf(String(id)) !== -1; }
  function add(id) {
    id = String(id);
    var items = read();
    if (items.indexOf(id) === -1) items.push(id);
    return write(items, { id: id, added: true });
  }
  function remove(id) {
    id = String(id);
    return write(read().filter(function (x) { return x !== id; }), { id: id, added: false });
  }
  function toggle(id) {
    if (has(id)) { remove(id); return false; }
    add(id);
    return true;
  }
  function count() {
    var n = read().length;
    document.querySelectorAll(".wishlist-count").forEach(function (node) {
      if (node.textContent.trim() !== String(n)) node.textContent = n;
    });
  }
  /* Every heart on the page shows the saved state: .active, aria-pressed
     and the tooltip text. */
  function sync(root) {
    var items = read();
    (root || document).querySelectorAll("button-wishlist[data-product-id]").forEach(function (button) {
      var on = items.indexOf(String(button.dataset.productId)) !== -1;
      button.classList.toggle("active", on);
      if (!button.hasAttribute("data-wishlist-remove")) button.setAttribute("aria-pressed", on ? "true" : "false");
      var tip = button.querySelector(".tooltip-content");
      if (tip) {
        var text = on
          ? button.dataset.action === "go_to_page" ? button.dataset.tooltipRedirect : button.dataset.tooltipRemove
          : button.dataset.tooltipAdd;
        if (text) tip.textContent = text;
      }
    });
    count();
  }
  window.addEventListener("storage", function (event) {
    if (event.key !== KEY && event.key !== null) return;
    memory = null;
    var items = read();
    sync();
    emit(items, { source: "storage" });
  });
  window.addEventListener("pageshow", function (event) {
    sync();
    if (event.persisted) emit(read(), { source: "pageshow" });
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") sync();
  });
  document.addEventListener("storelib:section-load", function (event) { sync(event.target && event.target.querySelectorAll ? event.target : document); });
  document.addEventListener("shopify:section:load", function () { sync(); });
  return { key: KEY, read: read, write: write, has: has, add: add, remove: remove, toggle: toggle, sync: sync, count: count };
})();
window.MateriaWishlist = MateriaWishlist;
var wishlistHeader = (function () {
  return {
    init: function () { MateriaWishlist.count(); },
    handleCount: function () { MateriaWishlist.count(); },
  };
})();
try { wishlistHeader.init(); } catch (e) { console.error("[theme] wishlist init", e); }

function HoverIntent(exitTime, elements, userConfig) {
  const defaultOptions = {
    exitDelay: exitTime,
    interval: 100,
    sensitivity: 6,
  };
  let config = {};
  let currX, currY, prevX, prevY;
  let allElems, pollTimer, exitTimer;
  const extend = function (defaults, userArgs) {
    for (let i in userArgs) {
      defaults[i] = userArgs[i];
    }
    return defaults;
  };
  const mouseTrack = function (ev) {
    currX = ev.pageX;
    currY = ev.pageY;
  };
  const mouseCompare = function (targetElem) {
    const distX = prevX - currX,
      distY = prevY - currY;
    const distance = Math.sqrt(distX * distX + distY * distY);
    if (distance < config.sensitivity) {
      clearTimeout(exitTimer);
      for (let elem of allElems) {
        if (elem.isActive) {
          config.onExit(elem);
          elem.isActive = false;
        }
      }
      config.onEnter(targetElem);
      targetElem.isActive = true;
    } else {
      prevX = currX;
      prevY = currY;
      pollTimer = setTimeout(function () {
        mouseCompare(targetElem);
      }, config.interval);
    }
  };
  const init = function (exitTime, elements, userConfig) {
    if (!userConfig || !userConfig.onEnter || !userConfig.onExit) {
      throw "onEnter and onExit callbacks must be provided";
    }
    config = extend(defaultOptions, userConfig);
    allElems = elements;
    for (let elem of allElems) {
      if (!elem) return;
      elem.isActive = false;
      elem.addEventListener("mousemove", mouseTrack);
      elem.addEventListener("mouseenter", function (ev) {
        prevX = ev.pageX;
        prevY = ev.pageY;
        if (elem.isActive) {
          clearTimeout(exitTimer);
          return;
        }
        pollTimer = setTimeout(function () {
          mouseCompare(elem);
        }, config.interval);
      });
      elem.addEventListener("mouseleave", function (ev) {
        clearTimeout(pollTimer);
        if (!elem.isActive) return;
        exitTimer = setTimeout(function () {
          config.onExit(elem);
          elem.isActive = false;
        }, config.exitDelay);
      });
    }
  };
  init(exitTime, elements, userConfig);
}

/* materia-menu:start
   The phone menu drawer, its drill-down levels and the desktop dropdowns'
   keyboard support. Everything is handled once, on document, so a header the
   builder draws again (storelib:section-load, or a redraw with no event at
   all) works on the first tap, and running init again never adds a second
   listener. Open and close are idempotent: html.nav-open is the one state,
   every hamburger reflects it, and a close always clears the timers, the
   scroll lock and the open levels it set. */
(() => {
  if (window.MateriaMenu) return;
  const html = document.documentElement;
  const TOGGLE = '.nav-toggle, [data-action="toggle-nav"]';
  const KEY_BUTTONS = 'close-menu, back-menu, open-children-toggle[role="button"], [data-action="toggle-nav"]:not(button)';
  const phone = matchMedia("(max-width: 1024.98px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let settleTimer = 0;
  let lastToggle = -Infinity;
  const drawer = () => document.querySelector(".navigation.mobile");
  const lockTarget = () => document.body;
  const visibleToggle = () =>
    [...document.querySelectorAll(TOGGLE)].find((t) => t.getClientRects().length) ||
    document.querySelector(TOGGLE);
  const isOpen = () => html.classList.contains("nav-open");
  const otherDrawerOpen = () =>
    html.classList.contains("open-minicart") ||
    html.classList.contains("open-search") ||
    !!document.querySelector("#minicart_wrapper .minicart__wrapper.open");

  function sync() {
    const open = isOpen();
    document.querySelectorAll(TOGGLE).forEach((t) => {
      t.classList.toggle("open", open);
      if (t.getAttribute("aria-expanded") !== String(open)) t.setAttribute("aria-expanded", String(open));
    });
  }

  function resetLevels(scope) {
    (scope || document).querySelectorAll(".navigation menu-item.is-open").forEach((item) => {
      item.classList.remove("is-open");
      item.querySelectorAll('open-children-toggle[role="button"]').forEach((t) => t.setAttribute("aria-expanded", "false"));
    });
  }

  function open() {
    clearTimeout(settleTimer);
    settleTimer = 0;
    if (isOpen()) return sync();
    const bar = window.getScrollBarWidth?.init?.() || 0;
    if (bar) lockTarget().style.setProperty("padding-right", bar + "px");
    html.classList.add("nav-open", "open-drawer");
    if (!document.querySelector(".navigation.horizontal")) html.classList.add("nav-verticalmenu");
    sync();
    const nav = drawer();
    const first = nav?.querySelector("close-menu");
    if (first && document.activeElement?.matches?.(TOGGLE)) {
      requestAnimationFrame(() => { try { first.focus({ preventScroll: true }); } catch (e) {} });
    }
  }

  function close(immediate) {
    const wasOpen = isOpen();
    if (!wasOpen && !immediate) return sync();
    const focusInside = drawer()?.contains(document.activeElement);
    html.classList.remove("nav-open", "nav-verticalmenu");
    sync();
    clearTimeout(settleTimer);
    const settle = () => {
      settleTimer = 0;
      if (isOpen()) return;
      if (!otherDrawerOpen()) html.classList.remove("open-drawer");
      lockTarget().style.removeProperty("padding-right");
      resetLevels();
    };
    // The drawer slides shut first, then the page unlocks and the levels go
    // back to the top, so nothing jumps while it is still on screen.
    if (immediate || reduced.matches || !wasOpen) settle();
    else settleTimer = setTimeout(settle, 450);
    if (focusInside) {
      try { visibleToggle()?.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  function toggle() {
    // One tap is one toggle, whatever mix of touch, pointer and click events
    // the browser or an old listener produces for it.
    const now = performance.now();
    if (now - lastToggle < 250) return;
    lastToggle = now;
    isOpen() ? close() : open();
  }

  // Drill-down levels in the phone drawer.
  function levelToggle(el) {
    return el.closest("menu-item");
  }
  function openLevel(toggleEl, viaKeyboard) {
    const item = levelToggle(toggleEl);
    if (!item) return;
    const opening = !item.classList.contains("is-open");
    item.classList.toggle("is-open", opening);
    item.querySelectorAll('open-children-toggle[role="button"]').forEach((t) => t.setAttribute("aria-expanded", String(opening)));
    if (opening && viaKeyboard) {
      const back = item.nextElementSibling?.querySelector("back-menu");
      if (back) setTimeout(() => { try { back.focus({ preventScroll: true }); } catch (e) {} }, reduced.matches ? 0 : 60);
    }
  }
  function backLevel(backEl) {
    const level = backEl.closest(".submenu, .sub-children-menu");
    const item = level?.previousElementSibling?.matches?.("menu-item")
      ? level.previousElementSibling
      : backEl.closest(backEl.classList.contains("back-lv1") ? ".level-1" : ".level0")?.querySelector("menu-item");
    if (!item) return;
    const hadFocus = level?.contains(document.activeElement);
    item.classList.remove("is-open");
    const opener = item.querySelector('open-children-toggle[role="button"]');
    opener?.setAttribute("aria-expanded", "false");
    if (hadFocus && opener) { try { opener.focus({ preventScroll: true }); } catch (e) {} }
  }
  function deepestOpenLevel() {
    const items = drawer()?.querySelectorAll("menu-item.is-open");
    return items && items.length ? items[items.length - 1] : null;
  }

  // Keyboard: role="button" on the theme's custom elements (each one calls
  // this when it is connected, so a redrawn header is covered too), Enter and
  // Space press them.
  function upgradeEl(el) {
    if (!el || el.nodeType !== 1 || !el.closest(".navigation")) return;
    const tag = el.tagName;
    if (tag === "OPEN-CHILDREN-TOGGLE") {
      // Only the arrow beside the link in the phone drawer is a button; the
      // copy inside the link stays part of the link.
      if (!el.closest(".navigation.mobile") || el.closest("a") || el.parentElement?.tagName !== "MENU-ITEM") return;
      el.setAttribute("aria-expanded", String(el.parentElement.classList.contains("is-open")));
      if (!el.hasAttribute("aria-label")) {
        const text = el.parentElement.querySelector("a span")?.textContent.trim();
        if (text) el.setAttribute("aria-label", text);
      }
    } else if (tag === "CLOSE-MENU") {
      if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", el.dataset.label || "Close");
    } else if (tag !== "BACK-MENU") return;
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    if (el.getAttribute("role") !== "button") el.setAttribute("role", "button");
  }
  function upgrade(scope) {
    (scope || document).querySelectorAll(".navigation :is(close-menu, back-menu, open-children-toggle)").forEach(upgradeEl);
    (scope || document).querySelectorAll(TOGGLE).forEach((t) => {
      if (t.tagName !== "BUTTON") {
        if (!t.hasAttribute("tabindex")) t.setAttribute("tabindex", "0");
        t.setAttribute("role", "button");
      }
    });
    sync();
  }

  document.addEventListener("click", (event) => {
    const t = event.target.closest?.(TOGGLE);
    if (t) {
      event.preventDefault();
      toggle();
      return;
    }
    // A link in the drawer that leaves the page closes the drawer at once,
    // so the page it goes to (or comes back from) is never under it.
    const link = event.target.closest?.(".navigation.mobile a[href]");
    if (link && isOpen() && !event.target.closest("open-children-toggle") && !event.defaultPrevented) {
      const href = link.getAttribute("href") || "";
      if (href && href !== "#" && !href.startsWith("javascript:") && link.target !== "_blank") close(true);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const nav = drawer();
      if (isOpen() && phone.matches) {
        if (document.querySelector(".materia-localization-sheet.is-open")) return;
        const level = deepestOpenLevel();
        if (level) {
          const back = level.nextElementSibling?.querySelector("back-menu");
          if (back) backLevel(back);
          else level.classList.remove("is-open");
        } else {
          close();
        }
        event.stopImmediatePropagation();
        return;
      }
      // Desktop dropdown that holds focus: close it, focus its link.
      const item = document.activeElement?.closest?.(".navigation.horizontal:not(.mobile) li.menu-parent.visible");
      if (item) {
        desktopExit(item);
        item.querySelector(":scope > menu-item > a")?.focus();
      }
      return;
    }
    if ((event.key === "Enter" || event.key === " ") && event.target.matches?.(KEY_BUTTONS)) {
      event.preventDefault();
      event.target.click();
    }
  });

  // Desktop dropdowns from the keyboard: the same open and close as hover.
  const menuApi = () => { try { return BlsMainMenuShopify; } catch (e) { return null; } };
  function desktopEnter(item) {
    if (phone.matches || item.classList.contains("visible")) return;
    const api = menuApi();
    document.querySelectorAll(".navigation.horizontal:not(.mobile) li.menu-parent.visible").forEach((other) => {
      if (other !== item) desktopExit(other);
    });
    if (api?.menuEnter) api.menuEnter(item); else item.classList.add("visible");
    item.isActive = true;
  }
  function desktopExit(item) {
    const api = menuApi();
    if (api?.menuExit) api.menuExit(item); else item.classList.remove("visible");
    item.isActive = false;
  }
  document.addEventListener("focusin", (event) => {
    const item = event.target.closest?.(".navigation.horizontal:not(.mobile) li.menu-parent");
    if (item && event.target.matches(":focus-visible")) desktopEnter(item);
  });
  document.addEventListener("focusout", (event) => {
    const item = event.target.closest?.(".navigation.horizontal:not(.mobile) li.menu-parent.visible");
    if (item && !item.contains(event.relatedTarget) && !item.matches(":hover")) desktopExit(item);
  });

  function resetAll() {
    if (isOpen() || document.querySelector(".nav-toggle.open")) close(true);
    document.querySelectorAll(".navigation.horizontal li.menu-parent.visible").forEach(desktopExit);
  }
  // Back and forward restore the page as it was left: start closed.
  addEventListener("pageshow", (event) => { if (event.persisted) resetAll(); });
  addEventListener("popstate", () => { if (isOpen()) close(true); });
  addEventListener("hashchange", () => { if (isOpen()) close(); });
  // Leaving the phone layout with the drawer open would leave the page locked.
  phone.addEventListener?.("change", () => { if (!phone.matches && isOpen()) close(true); });

  window.MateriaMenu = { open, close, toggle, sync, upgrade, upgradeEl, resetAll, openLevel, backLevel, isOpen, phone };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => upgrade());
  else upgrade();
})();
/* materia-menu:end */

let BlsMainMenuShopify = (function () {
  return {
    init: function () {
      this.initMenu();
      this.initMainMenu();
      this.initMobileMenu();
      this.initVerticalMenu();
    },

    initMenu: function () {
      const header = document.querySelector("header");
      if (!header) return;

      // Cache DOM elements
      const elements = {
        categoriesListMenuMobile: document.querySelector(
          ".categories-list-menu-mobile"
        ),
        categoriesListMenu: document.querySelector(
          '[data-menu="categories-list"]'
        ),
        categoriesListMenuVertical: document.querySelector(
          '[data-menu="verticalmenu-list"]'
        ),
        categoriesListMenuVerticalMobile: document.querySelector(
          ".verticalmenu-mobile"
        ),
        horizontalList: document.querySelector("nav.mobile .horizontal-list"),
      };

      // Calculate section padding bottom value
      const sectionPbValue = this.calculateSectionPadding(header);

      // Initialize fade-in-down animation if present
      this.initFadeInDownAnimation(header, sectionPbValue);

      // Handle menu tab switching
      this.setupMenuTabSwitching(elements);

      // Initialize menu tab state based on window width
      this.updateMenuTabState(elements);
      this.updateMenuVerticalMobile(elements);

      // One resize listener for the page, reading the elements of the latest
      // init: a header redraw runs init again and must not stack listeners
      // that hold the replaced elements.
      this._menuElements = elements;
      if (!this._menuResizeBound) {
        this._menuResizeBound = true;
        window.addEventListener("resize", () => {
          this.updateMenuTabState(this._menuElements);
          this.updateMenuVerticalMobile(this._menuElements);
        }, { passive: true });
      }
    },

    calculateSectionPadding: function (header) {
      let sectionPbValue = parseInt(
        getComputedStyle(header).getPropertyValue("--section-pb").trim()
      );
      if (header.querySelector(".header__layout-2")) {
        sectionPbValue = 0;
      }
      return sectionPbValue;
    },

    initFadeInDownAnimation: function (header, sectionPbValue) {
      const fadeInDown = document.querySelector(".fade-in-down");
      // The same open and close the pointer uses, kept for the keyboard
      // (MateriaMenu opens a dropdown when focus enters it).
      const expanded = (item, open) => {
        const link = item.querySelector(":scope > menu-item > a");
        if (link && item.querySelector(".submenu, .sub-children-menu")) link.setAttribute("aria-expanded", String(open));
      };
      if (!fadeInDown) {
        // Simple hover intent for non-fade-in menus
        this.menuEnter = (item) => { item.classList.add("visible"); expanded(item, true); };
        this.menuExit = (item) => { item.classList.remove("visible"); expanded(item, false); };
        this.setupSimpleHoverIntent(180, ".menu-parent__horizontal");
        return;
      }
      this.menuEnter = (item) => { this.handleMenuEnter(item, header, sectionPbValue); expanded(item, true); };
      this.menuExit = (item) => { this.handleMenuExit(item, header); expanded(item, false); };

      HoverIntent(180, document.querySelectorAll(".menu-parent__horizontal"), {
        onEnter: (targetItem) => this.menuEnter(targetItem),
        onExit: (targetItem) => this.menuExit(targetItem),
      });
    },

    setupSimpleHoverIntent: function (time, selector) {
      HoverIntent(time, document.querySelectorAll(selector), {
        onEnter: function (targetItem) {
          targetItem.classList.add("visible");
          if (targetItem.querySelector(".submenu, .sub-children-menu")) targetItem.querySelector(":scope > menu-item > a")?.setAttribute("aria-expanded", "true");
        },
        onExit: function (targetItem) {
          targetItem.classList.remove("visible");
          if (targetItem.querySelector(".submenu, .sub-children-menu")) targetItem.querySelector(":scope > menu-item > a")?.setAttribute("aria-expanded", "false");
        },
      });
    },

    handleMenuEnter: function (targetItem, header, sectionPbValue) {
      const submenu = targetItem.querySelector(".submenu-horizontal");
      if (!submenu) return;

      const width = window.innerWidth;
      if (width < 1024) return;

      const sticky = header?.getAttribute("data-sticky");
      if (sticky == "on-scroll-up") {
        header.classList.add("open-submenu");
      }

      if (document.documentElement.classList.contains("open-search")) {
        this.handleMenuEnterWithSearchOpen(targetItem, submenu, sectionPbValue);
      } else {
        this.handleStandardMenuEnter(targetItem, submenu, header);
      }
    },

    handleStandardMenuEnter: function (targetItem, submenu, header) {
      const outerRect = header.getBoundingClientRect();
      const innerRect = targetItem.getBoundingClientRect();
      const heightScrollDown = outerRect.bottom - innerRect.bottom;

      motionAnimate(
        submenu,
        {
          y: ["-105%", heightScrollDown],
          visibility: ["hidden", "visible"],
        },
        {
          ease: [0.7, 0, 0.2, 1],
          duration: 0.35,
        }
      );

      targetItem.classList.add("visible");
      if (!header.classList.contains("border-bottom")) {
        header.classList.add("active");
      }
    },

    handleMenuEnterWithSearchOpen: function (
      targetItem,
      submenu,
      sectionPbValue
    ) {
      const ps = document.querySelector(".popup-search");
      const overlay_search = document.querySelector(".overlay_search");
      const sf = document.querySelector(".search-full");

      if (!ps || !overlay_search || !sf) return;

      overlay_search.classList.remove("open");
      let topCaculate = sf.getBoundingClientRect().bottom + 10;

      Promise.all([
        motionAnimate(
          ps,
          {
            y: [topCaculate, "-105%"],
            visibility: ["visible", "hidden"],
          },
          {
            ease: [0.7, 0, 0.2, 1],
            duration: 0.2,
          }
        ),
        motionAnimate(
          overlay_search,
          {
            opacity: [1, 0],
            visibility: ["visible", "hidden"],
          },
          {
            ease: [0.7, 0, 0.2, 1],
            duration: 0.2,
          }
        ),
      ]).then(() => {
        setTimeout(() => {
          // Update document classes
          if (document.documentElement.classList.contains("open-minicart")) {
            document.documentElement.classList.remove("open-search");
          } else {
            document.documentElement.classList.remove(
              "open-drawer",
              "open-search"
            );
            root.style.removeProperty("padding-right");
          }

          // Show submenu with animation
          motionAnimate(
            submenu,
            {
              y: ["-105%", sectionPbValue],
              visibility: ["hidden", "visible"],
            },
            {
              ease: [0.7, 0, 0.2, 1],
              duration: 0.35,
            }
          );
          targetItem.classList.add("visible");
        }, 20);
      });
    },

    handleMenuExit: function (targetItem, header) {
      const submenu = targetItem.querySelector(".submenu-horizontal");
      if (!submenu) return;

      const width = window.innerWidth;
      if (width < 1024) return;

      const sticky = header?.getAttribute("data-sticky");
      const outerRect = header.getBoundingClientRect();
      const innerRect = targetItem.getBoundingClientRect();
      const heightScrollDown = outerRect.bottom - innerRect.bottom;

      if (sticky == "on-scroll-up") {
        header.classList.remove("open-submenu");
      }

      motionAnimate(
        submenu,
        {
          y: [heightScrollDown, "-105%"],
          visibility: ["visible", "hidden"],
        },
        {
          ease: [0.7, 0, 0.2, 1],
          duration: 0.4,
        }
      );

      targetItem.classList.remove("visible");
      if (header.classList.contains("active")) {
        header.classList.remove("active");
      }
    },

    setupMenuTabSwitching: function (elements) {
      document.querySelectorAll(".menu-mobile-title a").forEach((tabToggle) => {
        tabToggle.addEventListener("click", (e) => {
          e.preventDefault();
          const target = e.currentTarget;
          const data = target.dataset.menu;

          // Reset active state on all tabs
          document
            .querySelectorAll(".menu-mobile-title a")
            .forEach((item) => item.classList.remove("active"));

          // Set current tab as active
          target.classList.add("active");

          // Show appropriate menu based on selected tab
          this.showMenuForTab(data, elements);
        });
      });
    },

    showMenuForTab: function (tabId, elements) {
      const { horizontalList, categoriesListMenuMobile } = elements;
      const categoriesListMenuVerticalMobile = document.querySelector(
        ".verticalmenu-mobile"
      );

      if (!horizontalList) return;

      // Hide horizontal list if we're showing a specific menu
      horizontalList.style.display =
        tabId !== "horizontal-list" ? "none" : "block";

      // Show appropriate menu based on tab
      if (tabId === "categories-list") {
        if (categoriesListMenuMobile)
          categoriesListMenuMobile.style.display = "block";
        if (categoriesListMenuVerticalMobile)
          categoriesListMenuVerticalMobile.style.display = "none";
      } else if (tabId === "verticalmenu-list") {
        if (categoriesListMenuMobile)
          categoriesListMenuMobile.style.display = "none";
        if (categoriesListMenuVerticalMobile)
          categoriesListMenuVerticalMobile.style.display = "block";
      } else {
        if (categoriesListMenuMobile)
          categoriesListMenuMobile.style.display = "none";
        if (categoriesListMenuVerticalMobile)
          categoriesListMenuVerticalMobile.style.display = "none";
      }
    },

    updateMenuVerticalMobile: function (elements) {
      const windowWidth = window.innerWidth;
      if (windowWidth <= 1024) {
        const headerVertical = document.querySelector(".header-vertical");
        const headerVerticalMobile = document.querySelector(
          ".verticalmenu-mobile"
        );
        const titleVertical = headerVerticalMobile?.dataset.title;
        const menuMobileTitle = document.querySelector(".menu-mobile-title");
        if (!headerVertical) return;
        if (!menuMobileTitle.querySelector('[data-menu="verticalmenu-list"]')) {
          const contentAppendTitleVertical = `
            <a
              class="no-underline heading-style py-10"
              data-menu="verticalmenu-list"
              role="link"
              aria-disabled="true"
            >
              ${titleVertical}
            </a>
          `;
          menuMobileTitle.insertAdjacentHTML(
            "beforeend",
            contentAppendTitleVertical
          );
          const newTabButton = menuMobileTitle.querySelector(
            '[data-menu="verticalmenu-list"]'
          );
          if (newTabButton) {
            newTabButton.addEventListener("click", (e) => {
              e.preventDefault();
              document
                .querySelectorAll(".menu-mobile-title a")
                .forEach((item) => item.classList.remove("active"));
              newTabButton.classList.add("active");
              this.showMenuForTab("verticalmenu-list", elements);
            });
          }
        }
        const wrapperVerticalmenu = document.querySelector(
          ".verticalmenu-mobile"
        );
        const navigationMenuContent = document.querySelector(
          ".navigation__menu-content-mobile"
        );
        if (!wrapperVerticalmenu || !navigationMenuContent) {
          return;
        }
        if (!navigationMenuContent.querySelector(".verticalmenu-mobile")) {
          const cloneWrapper = wrapperVerticalmenu.cloneNode(true);
          navigationMenuContent.appendChild(cloneWrapper);
        }
      }
    },

    updateMenuTabState: function (elements) {
      const windowWidth = window.innerWidth;
      const {
        horizontalList,
        categoriesListMenu,
        categoriesListMenuVertical,
        categoriesListMenuMobile,
        categoriesListMenuVerticalMobile,
      } = elements;

      if (!horizontalList || !categoriesListMenu) return;

      if (windowWidth <= 1024) {
        // Mobile view
        if (
          categoriesListMenu?.classList.contains("active") ||
          categoriesListMenuVertical?.classList.contains("active")
        ) {
          horizontalList.style.display = "none";
        }

        if (
          categoriesListMenuVerticalMobile &&
          categoriesListMenuVertical?.classList.contains("active")
        ) {
          categoriesListMenuVerticalMobile.style.display = "block";
        }
      } else {
        // Desktop view
        if (
          categoriesListMenuMobile &&
          categoriesListMenu?.classList.contains("active")
        ) {
          categoriesListMenuMobile.style.display = "none";
        }

        if (
          categoriesListMenuVerticalMobile &&
          categoriesListMenuVertical?.classList.contains("active")
        ) {
          categoriesListMenuVerticalMobile.style.display = "none";
        }

        if (
          categoriesListMenu?.classList.contains("active") ||
          categoriesListMenuVertical?.classList.contains("active")
        ) {
          horizontalList.style.display = "inline-flex";
        }
      }
    },

    initMainMenu: function () {
      const header = document.querySelector("header");
      if (!header) return;

      this.setupNavToggle();
      this.setupMenuMouseEvents();
      this.setupHeaderAttributes();
      this.initStickyHeader(header);
      this.initSubMenu();
    },

    setupNavToggle: function () {
      // The hamburger is handled once, on document, by MateriaMenu (below):
      // a listener on each button was lost when the builder redrew the
      // header, and stacked twice (open then close in one tap) when init ran
      // again over buttons that had not been replaced.
      window.MateriaMenu?.upgrade();
    },

    setupMenuMouseEvents: function () {
      let width = screen.width;
      if (width <= 1024) return;

      document
        .querySelectorAll("li.menu-parent .submenu")
        .forEach((menuItem) => {
          menuItem.addEventListener("mouseenter", (e) => {
            const target = e.currentTarget;
            target.closest(".menu-parent").classList.add("active-submenu");
          });

          menuItem.addEventListener("mouseleave", (e) => {
            const target = e.currentTarget;
            target.closest(".menu-parent").classList.remove("active-submenu");
          });
        });
    },

    setupHeaderAttributes: function () {
      // Calculate heights for CSS variables
      let announcement_bar =
        document.querySelector(".section-announcement-bar")?.clientHeight || 0;
      let top_bar =
        document.querySelector(".section-top-bar")?.clientHeight || 0;
      let headerpage = document.querySelector("header")?.clientHeight || 0;

      // Set the three values only: replacing the whole style attribute wiped
      // the scroll lock's padding and anything else set on <body> each time
      // the header was redrawn.
      const bodyStyle = document.body.style;
      bodyStyle.setProperty("--height-bar", `${announcement_bar}px`);
      bodyStyle.setProperty("--height-header", `${headerpage}px`);
      bodyStyle.setProperty("--height-topbar", `${top_bar}px`);
    },

    initStickyHeader: function (header) {
      window.StorelibHeaderSticky?.register(header);
    },

    updateStickyHeader: function () {
      window.StorelibHeaderSticky?.refresh();
    },

    initSubMenu: function () {
      const main_menu = document.querySelector(".navigation.horizontal");
      if (!main_menu || window.innerWidth <= 1024) return;

      this.addCssSubMenu();

      if (this._subMenuResizeBound) return;
      this._subMenuResizeBound = true;
      window.addEventListener("resize", () => {
        if (window.innerWidth > 1024) {
          this.addCssSubMenu();
        }
      }, { passive: true });
    },

    addCssSubMenu: function () {
      const bodyWidth =
        document.documentElement.clientWidth || document.body.clientWidth;
      const header = document.querySelector("header");
      const submenu_center = document.querySelector(".submenu-center");
      const width_sub_center = 800;

      if (!header || bodyWidth < 1024) return;

      const padding = 30;
      document
        .querySelectorAll(".horizontal-list .mega-menu-fix-width")
        .forEach((submenu) => {
          if (submenu_center) {
            // Handle center aligned submenu
            const submenu_data = submenu.getBoundingClientRect();
            const width = submenu_data.width;
            const left = submenu_data.left;
            const right = submenu_data.right;

            if (width_sub_center <= width) {
              const left_style = (left - (right - bodyWidth)) / 2;
              submenu.style.left = left_style + "px";
            }
          } else {
            // Handle default submenu positioning
            const elementWidth = submenu.clientWidth;
            const elementLeft = submenu.offsetLeft;

            if (bodyWidth - (elementWidth + elementLeft) < 0) {
              let left = bodyWidth - (elementWidth + elementLeft);
              left = left + elementLeft - padding;

              if (elementLeft < 0) {
                left = 0;
              }

              submenu.style.left = left + "px";
            }
          }
        });
    },

    initVerticalMenu: function () {
      const article = document.querySelector(".verticalmenu-html");
      if (!article) return;

      const verticalMenu = document.querySelector(".vertical-menu");
      if (!verticalMenu) return;
      verticalMenu.addEventListener("mouseenter", function () {
        setTimeout(function () {
          verticalMenu.classList.add("open-vertical");
        }, 150);
      });
      verticalMenu.addEventListener("mouseleave", function () {
        verticalMenu.classList.remove("open-vertical");
      });
      this.setupSimpleHoverIntent(1, ".menu-parent__vertical");
    },

    initMobileMenu: function () {
      // Reserved for mobile menu specific initialization
    },
  };
})();
// One failing init must not stop the rest of this module (search, cart,
// quantity inputs and every custom element defined further down).
try { BlsMainMenuShopify.init(); } catch (e) { console.error("[theme] menu init", e); }

// Re-initialize header behaviors after Theme Editor reloads the section
document.addEventListener("storelib:section-load", (event) => {
  const target = event.target;
  if (!target || target.nodeType !== 1) return;
  // The event may come from the section wrapper, the <header> itself or an
  // element inside it: find the section either way.
  const section = target.closest?.('[id^="shopify-section-"], .shopify-section') || target;
  if (!section.querySelector?.("header.header[data-sticky], .navigation.mobile") && !target.matches?.("header.header")) return;
  // The redrawn header has no open menu or search; the cart drawer is not part
  // of it and keeps its own state.
  const html = document.documentElement;
  if (window.MateriaMenu) window.MateriaMenu.close(true);
  html.classList.remove("nav-open", "open-search", "nav-verticalmenu");
  if (!document.querySelector("#minicart_wrapper .minicart__wrapper.open")) html.classList.remove("open-drawer", "open-minicart");
  try { BlsMainMenuShopify.init(); } catch (e) {}
  try { BlsSearchShopify && BlsSearchShopify.init && BlsSearchShopify.init(); } catch (e) {}
});
document.addEventListener("shopify:section:load", (event) => {
  const section = event.target;
  if (!section || !section.classList || !section.classList.contains("section-header")) return;
  // Close any drawer states left over from the re-render
  document.documentElement.classList.remove(
    "nav-open",
    "open-drawer",
    "open-minicart",
    "open-search",
    "nav-verticalmenu"
  );
  try { BlsMainMenuShopify.init(); } catch (e) {}
  try { BlsSearchShopify && BlsSearchShopify.init && BlsSearchShopify.init(); } catch (e) {}
});
document.addEventListener("shopify:section:unload", (event) => {
  const section = event.target;
  if (!section || !section.classList || !section.classList.contains("section-header")) return;
  document.documentElement.classList.remove(
    "nav-open",
    "open-drawer",
    "open-minicart",
    "open-search",
    "nav-verticalmenu"
  );
});

/* Search overlay (Theme settings > Search > Search type: popup or drawer).
   #search-form and .overlay_search are manual popovers (snippets/top-search):
   shown, they sit in the browser's top layer, so nothing on the page (the
   header, a sticky or pill header, the announcement bar, the mobile
   navigation bar) can be drawn over them. The popup is placed over the header
   bar as measured when it opens; the drawer is a full height side sheet. All
   motion is CSS (search-type-default.css); this only toggles classes.
   One delegated click listener serves every toggle, so a header redrawn in
   the builder (storelib:section-load) needs no new listeners. */
var BlsSearchShopify = (function () {
  const html = document.documentElement;
  const canPopover =
    typeof HTMLElement !== "undefined" &&
    typeof HTMLElement.prototype.showPopover === "function";
  const panel = () => document.getElementById("search-form");
  const scrim = () => document.querySelector(".overlay_search");
  const isDrawer = (f) => f && f.getAttribute("data-search-mode") === "drawer";
  const showLayer = (el) => {
    if (!canPopover || !el || !el.hasAttribute("popover")) return;
    try { if (!el.matches(":popover-open")) el.showPopover(); } catch (e) {}
  };
  const hideLayer = (el) => {
    if (!canPopover || !el || !el.hasAttribute("popover")) return;
    try { if (el.matches(":popover-open")) el.hidePopover(); } catch (e) {}
  };
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

  return {
    isOpen: false, // predictive results listbox
    panelOpen: false,

    init: function () {
      if (!this._wired) {
        this._wired = true;
        this._onKeydown = this.onPanelKeydown.bind(this);
        document.addEventListener("click", this.onDocumentClick.bind(this));
        // Whatever else closes the search by its <html> class (the cart
        // opening, a header redraw, the scroll-lock watchdog, back/forward
        // cache) closes the panel and its layers with it.
        new MutationObserver(() => {
          if (this.panelOpen && !html.classList.contains("open-search")) this.closePanel();
        }).observe(html, { attributes: true, attributeFilter: ["class"] });
        let frame = 0;
        window.addEventListener("resize", () => {
          if (!this.panelOpen || frame) return;
          frame = requestAnimationFrame(() => {
            frame = 0;
            const f = panel();
            if (this.panelOpen && f && !isDrawer(f)) this.placePopup(f);
          });
        }, { passive: true });
      }
      this.setupEventListeners();
    },

    onDocumentClick: function (e) {
      const t = e.target;
      if (!t || !t.closest) return;
      const toggle = t.closest(".top-search-toggle");
      // Search type "Search page only" is a plain link to /search.
      if (toggle && toggle.tagName !== "A") {
        if (!panel()) return;
        e.preventDefault();
        if (this.panelOpen) this.closePanel();
        else this.openPanel(toggle);
        return;
      }
      if (!this.panelOpen) return;
      if (t.closest("#search-form .btn-search-close") || t.closest(".overlay_search")) {
        e.preventDefault();
        this.closePanel();
      }
    },

    // The popup opens at the top of the screen, full width, and its bar
    // covers everything down to the bottom of the header as it is now:
    // announcement and top bars included. Scrolled past them (or with the
    // header hidden while scrolling, when it comes back pinned at the top)
    // the bar is the header's own height.
    placePopup: function (f) {
      const header =
        document.querySelector(".section-header header.header") ||
        document.querySelector("header.header") ||
        document.querySelector("header");
      const vh = window.innerHeight || 800;
      let height = 0;
      if (header) {
        const r = header.getBoundingClientRect();
        height = r.bottom > 0 && r.top < vh ? r.bottom : r.height;
      }
      height = Math.round(Math.min(Math.max(height || 72, 64), Math.max(120, vh * 0.4)));
      f.style.setProperty("--sh-height", height + "px");
    },

    setToggles: function (open) {
      document.querySelectorAll(".top-search-toggle").forEach((t) => {
        t.classList.toggle("open", open);
        if (t.tagName !== "A") t.setAttribute("aria-expanded", open ? "true" : "false");
      });
    },

    openPanel: function (trigger) {
      const f = panel();
      if (!f || this.panelOpen) return;
      clearTimeout(this._hideTimer);
      this.panelOpen = true;
      this._trigger = trigger || document.activeElement;
      if (!isDrawer(f)) this.placePopup(f);
      const s = scrim();
      // Scrim first, so the panel is above it in the top layer.
      showLayer(s);
      showLayer(f);
      html.classList.add("open-drawer", "open-search");
      if (s) s.classList.add("open");
      f.classList.add("open");
      this.setToggles(true);
      document.addEventListener("keydown", this._onKeydown, true);
      // Synchronously, inside the click, so phones raise the keyboard.
      const input = f.querySelector('input[type="search"]');
      if (input) {
        try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
      }
    },

    closePanel: function () {
      if (!this.panelOpen) return;
      this.panelOpen = false;
      const f = panel();
      const s = scrim();
      if (f) f.classList.remove("open");
      if (s) s.classList.remove("open");
      html.classList.remove("open-search");
      this.setToggles(false);
      document.removeEventListener("keydown", this._onKeydown, true);
      const trigger = this._trigger;
      this._trigger = null;
      if (f && f.contains(document.activeElement)) {
        if (trigger && trigger.isConnected) {
          try { trigger.focus({ preventScroll: true }); } catch (e) {}
        } else document.activeElement.blur();
      }
      clearTimeout(this._hideTimer);
      // Leave the top layer and unlock the page once the panel has gone.
      const durationText = f ? getComputedStyle(f).getPropertyValue('--search-dur').trim() : '320ms';
      const duration = (parseFloat(durationText) || 0) * (durationText.endsWith('ms') ? 1 : 1000);
      this._hideTimer = setTimeout(() => {
        if (this.panelOpen) return;
        hideLayer(f);
        hideLayer(s);
        if (!html.classList.contains("open-minicart") && !html.classList.contains("nav-open")) {
          html.classList.remove("open-drawer");
        }
        if (typeof root !== "undefined" && root && root.style) root.style.removeProperty("padding-right");
      }, duration + 30);
    },

    // Kept for anything that still calls the theme's original names.
    openDefaultSearch: function () { this.openPanel(); },
    closeDefaultSearch: function () { this.closePanel(); },

    onPanelKeydown: function (e) {
      if (!this.panelOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.closePanel();
        return;
      }
      if (e.key !== "Tab") return;
      const f = panel();
      if (!f) return;
      const items = [...f.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !f.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !f.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    },

    /* ---- Predictive search ---- */
    input: function () {
      const f = panel();
      return f ? f.querySelector('input[type="search"]') : null;
    },

    setupEventListeners: function () {
      const f = panel();
      const input = this.input();
      const form = input && input.form;
      if (!f || !input || !form || input._blsSearchWired) return;
      input._blsSearchWired = true;
      // What the panel shows before anything is typed (the suggested
      // collection): shown again under "No results" and when the field is
      // cleared.
      const target = f.querySelector("[data-predictive-search]");
      this._suggestMarkup = target ? target.innerHTML : "";
      form.addEventListener("submit", (e) => {
        if (!this.getQuery().length) e.preventDefault();
      });
      // Basic search type: a plain form, no requests while typing.
      if (!f.querySelector("#predictive-search")) return;
      input.addEventListener("input", this.debounce(() => this.onChange(), 250));
      input.addEventListener("focus", () => this.onFocus());
      input.addEventListener("keydown", (e) => this.onInputKeydown(e));
    },

    debounce: function (fn, wait) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    },

    getQuery: function () {
      const input = this.input();
      return input ? input.value.trim() : "";
    },

    onChange: function () {
      const searchTerm = this.getQuery();
      if (!searchTerm.length) {
        this.abortSearch();
        this.close(true);
        return;
      }
      this.getSearchResults(searchTerm);
    },

    onFocus: function () {
      const searchTerm = this.getQuery();
      if (!searchTerm.length) return;
      const predictive = document.querySelector("#search-form #predictive-search");
      if (!predictive) return;
      if (predictive.classList.contains("results")) this.open();
      else this.getSearchResults(searchTerm);
    },

    options: function () {
      const predictive = document.querySelector("#search-form #predictive-search");
      return predictive ? [...predictive.querySelectorAll('[role="option"]')] : [];
    },

    onInputKeydown: function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const list = this.options();
        if (!list.length) return;
        e.preventDefault();
        const current = list.findIndex((el) => el.getAttribute("aria-selected") === "true");
        const step = e.key === "ArrowDown" ? 1 : -1;
        const next = list[(current + step + list.length) % list.length];
        if (current > -1) list[current].setAttribute("aria-selected", "false");
        next.setAttribute("aria-selected", "true");
        if (next.id) e.currentTarget.setAttribute("aria-activedescendant", next.id);
        next.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        const selected = document.querySelector('#search-form [aria-selected="true"]');
        const link = selected && (selected.matches("a, button") ? selected : selected.querySelector("a, button"));
        if (link) {
          e.preventDefault();
          link.click();
        }
      }
    },

    abortSearch: function () {
      if (this._controller) this._controller.abort();
      this._controller = null;
    },

    getSearchResults: function (searchTerm) {
      // Basic search type: no predictive UI rendered, no request.
      if (
        document.querySelector("#search-form .search__type-basic") ||
        !document.querySelector("#search-form #predictive-search")
      ) {
        return;
      }
      const queryKey = searchTerm.replace(/\s+/g, " ").toLowerCase();
      this._cache = this._cache || new Map();
      if (this._cache.has(queryKey)) {
        this.abortSearch();
        this.renderSearchResults(this._cache.get(queryKey));
        return;
      }
      // Only the latest query may land: the one before it is cancelled.
      this.abortSearch();
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      this._controller = controller;
      this.setLiveRegionLoadingState();
      const collection_suggest = document.querySelector("#search-form .collection-suggest");
      if (collection_suggest) collection_suggest.style.display = "none";
      const section_id = "search-predictive-grid";
      const search_url =
        `${routes?.predictive_search_url}?q=${encodeURIComponent(searchTerm)}` +
        `&resources[options][fields]=title,tag,vendor,product_type,variants.title,variants.sku&resources[options][prefix]=last&resources[options][unavailable_products]=last&resources[type]=query,product,collection,page,article&section_id=${section_id}`;
      fetch(search_url, controller ? { signal: controller.signal } : undefined)
        .then((response) => {
          if (!response.ok) throw new Error(response.status);
          return response.text();
        })
        .then((text) => {
          if (controller && this._controller !== controller) return;
          this._controller = null;
          const section = new DOMParser()
            .parseFromString(text, "text/html")
            .querySelector("#shopify-section-" + section_id);
          const resultsMarkup = section ? section.innerHTML : "";
          this._cache.set(queryKey, resultsMarkup);
          if (this._cache.size > 30) this._cache.delete(this._cache.keys().next().value);
          // The field may have changed while this was on its way.
          if (this.getQuery().replace(/\s+/g, " ").toLowerCase() !== queryKey) return;
          this.renderSearchResults(resultsMarkup);
        })
        .catch((error) => {
          if (error && error.name === "AbortError") return;
          if (controller && this._controller !== controller) return;
          this._controller = null;
          this.setLiveRegionResults();
          this.close();
        });
    },

    setLiveRegionLoadingState: function () {
      const form = document.querySelector("#search-form #search_mini_form");
      const predictive = document.querySelector("#search-form #predictive-search");
      if (form) form.classList.add("loading");
      if (predictive) predictive.classList.add("loading");
    },

    setLiveRegionResults: function () {
      const form = document.querySelector("#search-form #search_mini_form");
      const predictive = document.querySelector("#search-form #predictive-search");
      if (form) form.classList.remove("loading");
      if (predictive) predictive.classList.remove("loading");
    },

    renderSearchResults: function (resultsMarkup) {
      const target = document.querySelector("#search-form [data-predictive-search]");
      const predictive = document.querySelector("#search-form #predictive-search");
      if (!target || !predictive) return;
      target.innerHTML = resultsMarkup;
      // Nothing matched: "No results for ..." where the results go, with the
      // trending searches and the suggested collection kept under it.
      const empty = target.querySelector("[data-search-empty]");
      if (empty && this._suggestMarkup) target.insertAdjacentHTML("beforeend", this._suggestMarkup);
      predictive.classList.add("results");
      predictive.classList.toggle("is-empty", !!empty);
      const status = predictive.querySelector(".predictive-search-status");
      if (status) {
        status.removeAttribute("aria-hidden");
        status.textContent = empty ? empty.textContent.trim() : "";
      }
      const notSuggest = document.querySelector("#search-form .search-not-sugges");
      if (notSuggest) notSuggest.classList.remove("search-hidden");
      const quick_search = document.querySelector("#search-form #quick-search");
      if (quick_search) quick_search.classList.toggle("hidden", !empty);
      this.setLiveRegionResults();
      if (typeof BlsLazyloadImg !== "undefined") {
        try { BlsLazyloadImg.init(target); } catch (e) {}
      }
      this.open();
    },

    open: function () {
      const input = this.input();
      if (input) input.setAttribute("aria-expanded", "true");
      this.isOpen = true;
    },

    close: function (clearSearchTerm = false) {
      const input = this.input();
      const predictive = document.querySelector("#search-form #predictive-search");
      this.setLiveRegionResults();
      if (clearSearchTerm) {
        if (input) input.value = "";
        if (predictive) {
          predictive.classList.remove("results", "is-empty");
          const target = predictive.querySelector("[data-predictive-search]");
          if (target && typeof this._suggestMarkup === "string") target.innerHTML = this._suggestMarkup;
          const status = predictive.querySelector(".predictive-search-status");
          if (status) status.textContent = "";
        }
        const notSuggest = document.querySelector("#search-form .search-not-sugges");
        if (notSuggest) notSuggest.classList.add("search-hidden");
        const quick_search = document.querySelector("#search-form #quick-search");
        if (quick_search) quick_search.classList.remove("hidden");
      }
      const selected = document.querySelector('#search-form [aria-selected="true"]');
      if (selected) selected.setAttribute("aria-selected", "false");
      if (input) {
        input.setAttribute("aria-activedescendant", "");
        input.setAttribute("aria-expanded", "false");
      }
      const target = document.querySelector("#search-form [data-predictive-search]");
      if (target) target.removeAttribute("style");
      this.isOpen = false;
    },
  };
})();
try { BlsSearchShopify.init(); } catch (e) { console.error("[theme] search init", e); }
// The search panel lives in the layout, outside the header; the element
// itself needs no behaviour of its own.
class HeaderSearch extends HTMLElement {}
customElements.define("header-search", HeaderSearch);
class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector("input");
    this.changeEvent = new Event("change", { bubbles: true });
    this.input.addEventListener("change", this.onInputChange.bind(this));
    this.querySelectorAll("button").forEach((button) =>
      button.addEventListener("click", this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.quantityUpdate,
      this.validateQtyRules.bind(this)
    );
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange() {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === "plus" ||
    event.target.closest("button").name === "plus"
      ? this.input.stepUp()
      : this.input.stepDown();
    if (previousValue !== this.input.value)
      this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle("disabled", value <= min);
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle("disabled", value >= max);
    }
  }
}

customElements.define("quantity-input", QuantityInput);

class ProgressBar extends HTMLElement {
  static get observedAttributes() { return ['data-order', 'data-fe-amount']; }
  constructor() {
    super();
  }
  connectedCallback() {
    queueMicrotask(() => { if (this.isConnected) this.init(this.dataset.order); });
  }
  attributeChangedCallback(name, previous, next) {
    if (previous !== next && this.isConnected) this.connectedCallback();
  }
  init(orders) {
    const rate = Number(window.Shopify?.currency?.rate) || 1;
    const min = Number(String(this.dataset.feAmount || '').replace(',', '.'));
    const order = Number(orders) / 100;
    if (!min || !Number.isFinite(order)) return;
    const cents = String(Math.round(Number(orders) || 0));
    if (this.dataset.order !== cents) this.dataset.order = cents;
    const minByCurrency = min * rate;
    const progress = Math.max(0, Math.min(100, (order / minByCurrency) * 100));
    this.setProgressBar(progress);
    this.setProgressBarTitle(order, minByCurrency, this.dataset.feUnavaiable, this.dataset.feAvaiable);
  }
  formatMoney(cents) {
    if (typeof window.Shopify?.formatMoney === 'function') {
      try {
        const format = window.cartStrings?.money_format || window.themeGlobalVariables?.settings?.money_format;
        const value = window.Shopify.formatMoney(cents, format);
        if (value && !/NaN|undefined/.test(value)) return value;
      } catch (_) {}
    }
    // The server renders 1234.56 in the shop's own format; reuse its symbol and separators.
    const sample = this.dataset.moneySample || '';
    const match = sample.match(/1(\D?)234(\D)56/);
    const amount = Math.max(0, Math.round(cents)) / 100;
    if (!match) return amount.toFixed(2);
    const [whole, fraction] = amount.toFixed(2).split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, match[1]);
    return sample.replace(match[0], grouped + match[2] + fraction);
  }
  setProgressBarTitle(order, minByCurrency, unavailable, available) {
    const title = this.querySelector(".free-shipping-message");
    if (!title) return;
    title.classList.remove("opacity-0");
    let html;
    if (order >= minByCurrency && order > 0) {
      html = available || '';
    } else if (unavailable) {
      const price = this.formatMoney((minByCurrency - order) * 100);
      html = unavailable.replace(/\[\[\s*amount\s*\]\]|\{\{\s*amount\s*\}\}/g, price);
      // A translation engine that already filled the amount leaves an empty price span.
      if (html === unavailable) html = unavailable.replace(/(<span class="price">)\s*(<\/span>)/, `$1${price}$2`);
    }
    // A template that reached us escaped (&lt;span) would print its tags as text.
    if (html && /&lt;\/?[a-z]/i.test(html)) {
      const decoder = document.createElement('textarea');
      decoder.innerHTML = html;
      html = decoder.value;
    }
    if (html && title.innerHTML.trim() !== html.trim()) title.innerHTML = html;
  }
  setProgressBar(progress) {
    const p = this.querySelector(".progress");
    const track = this.querySelector('[role="progressbar"]');
    if (p) p.style.width = progress + "%";
    track?.setAttribute('aria-valuenow', String(Math.round(progress)));
    this.classList.toggle("cart_shipping_free", progress >= 100);
  }
}
customElements.define("free-ship-progress-bar", ProgressBar);

class OpenChildrenToggle extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.onToggle.bind(this), false);
  }
  connectedCallback() {
    window.MateriaMenu?.upgradeEl(this);
  }
  onToggle(event) {
    // In the phone drawer a parent item opens its level, even where the
    // arrow sits inside the item's link: the tap must not also follow it.
    const menu = window.MateriaMenu;
    if (menu && this.closest(".navigation.mobile") && menu.phone.matches) {
      if (this.closest("a")) event.preventDefault();
      menu.openLevel(this, event.detail === 0);
      return;
    }
    const parent = this.parentElement;
    if (parent) {
      if (!parent.classList.contains("is-open")) {
        parent.classList.add("is-open");
      } else {
        parent.classList.remove("is-open");
      }
    }
  }
}
customElements.define("open-children-toggle", OpenChildrenToggle);

class CloseMenu extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.onClose.bind(this), false);
  }
  connectedCallback() {
    window.MateriaMenu?.upgradeEl(this);
  }
  onClose() {
    // One close for the drawer, however it was opened: every hamburger,
    // the scroll lock and the open levels are reset by MateriaMenu.
    if (window.MateriaMenu) return window.MateriaMenu.close();
    document.querySelectorAll(".nav-toggle").forEach((t) => t.classList.remove("open"));
    document.querySelectorAll("menu-item").forEach((item) => {
      item.classList.remove("is-open");
    });
    document.documentElement.classList.remove("nav-open");
    setTimeout(() => {
      document.documentElement.classList.remove("open-drawer");
      root.style.removeProperty("padding-right");
    }, 400);
  }
}
customElements.define("close-menu", CloseMenu);

class ReviewProduct extends HTMLElement {
  constructor() {
    super();
    this.productHandle = this.dataset.productHandle;

    if (document.body.classList.contains("index")) {
      this.fetchDataReviewProduct();
      window.addEventListener("scroll", () => {
        this.fetchDataReviewProduct();
      });
      let pos = window.pageYOffset;
      if (pos > 0 || document.body.classList.contains("review-lazy")) {
        this.fetchDataReviewProduct();
      }
    } else {
      this.fetchDataReviewProduct();
    }
  }
  fetchDataReviewProduct() {
    if (!this.classList.contains("review-product-added")) {
      return;
    }
    this.classList.remove("review-product-added");
    this.innerHTML = this.querySelector(".product-review-json").innerHTML;
    this.classList.remove("inline-loading");
  }
}
customElements.define("review-product", ReviewProduct);

class BackMenu extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.onBackMenu.bind(this), false);
  }
  connectedCallback() {
    window.MateriaMenu?.upgradeEl(this);
  }
  onBackMenu() {
    if (window.MateriaMenu) return window.MateriaMenu.backLevel(this);
    if (this.classList.contains("back-lv1")) {
      this.closest(".level-1")
        ?.querySelector("menu-item")
        ?.classList.remove("is-open");
    } else {
      this.closest(".level0")
        ?.querySelector("menu-item")
        ?.classList.remove("is-open");
    }
  }
}
customElements.define("back-menu", BackMenu);

var BlsLoginPopup = (function () {
  return {
    init: function () {
      this.showLogin();
    },
    clickTab: function (modal) {
      const hidden = document.querySelectorAll("[data-login-hidden]");
      const show = document.querySelectorAll("[data-login-show]");
      const iTitle = document.querySelector("#login-popup .login-heading");
      show.forEach((e) => {
        var s = e?.dataset.loginShow;
        e.addEventListener("click", function (el) {
          el.preventDefault();
          hidden.forEach((eh) => {
            var h = eh?.dataset.loginHidden;
            if (eh.getAttribute("aria-hidden") === "true" && s === h) {
              eh.setAttribute("aria-hidden", "false");
              if (iTitle) {
                iTitle.innerText = s;
              }
            } else {
              eh.setAttribute("aria-hidden", "true");
            }
          });
        });
      });
    },
    showLogin: function () {
      const action = document.querySelector(".action-login-popup");
      const _this = this;
      if (action) {
        action.addEventListener("click", (e) => {
          e.preventDefault();
          _this.fetchDataLogin();
        });
      }
    },
    fetchDataLogin: function () {
      const url = `${window.location.pathname}?section_id=login-popup`;
      const _this = this;
      fetch(url)
        .then((response) => response.text())
        .then((responseText) => {
          const html = parser.parseFromString(responseText, "text/html");
          const content = html.querySelector("#login-popup");
          if (content) {
            const modal = new tingle.modal({
              footer: false,
              stickyFooter: false,
              closeMethods: ["overlay", "button", "escape"],
              closeLabel: "Close",
              cssClass: ["login-popup-modal"],
              onOpen: function () {},
              onClose: function () {},
              beforeOpen: function () {},
              beforeClose: function () {
                return true;
              },
            });
            modal.setContent(content);
            modal.open();

            document
              .querySelectorAll(".login__popup-button-close")
              .forEach((navToggle) => {
                navToggle.addEventListener(
                  "click",
                  (e) => {
                    e.preventDefault();
                    modal.close();
                  },
                  false
                );
              });
          }
          _this.clickTab();
        })
        .catch((e) => {
          throw e;
        });
    },
  };
})();
try { BlsLoginPopup.init(); } catch (e) { console.error("[theme] login popup init", e); }

class BackToTop extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.backToTop.bind(this), false);
  }

  connectedCallback() {
    window.addEventListener("scroll", this.updateScrollPercentage.bind(this));
  }

  backToTop() {
    if (document.documentElement.scrollTop > 0 || document.body.scrollTop > 0) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }

  updateScrollPercentage() {
    const scrollHeight =
      document.documentElement.scrollHeight || document.body.scrollHeight;
    const scrollTop =
      document.documentElement.scrollTop || document.body.scrollTop;
    const clientHeight =
      document.documentElement.clientHeight || document.body.clientHeight;
    const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
    this.style.setProperty("--height", scrollPercentage.toFixed(2) + "%");
    const threshold = parseInt(this.dataset.showAfter, 10) || 200;
    if (scrollTop > threshold) {
      this.classList.add("show");
    } else {
      this.classList.remove("show");
    }
  }
}
customElements.define("back-to-top", BackToTop);

class LocalizationForm extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    queueMicrotask(() => {
      if (!this.isConnected || this._initialized) return;
      this._initialized = true;
      this.initialize();
    });
  }

  disconnectedCallback() {
    if (this._initialized) this.hidePanel();
    if (this._onResize) window.removeEventListener('resize', this._onResize);
  }

  initialize() {
    this.elements = {
      input: this.querySelector(
        'input[name="language_code"], input[name="country_code"]'
      ),
      button: this.querySelector(".button-localization"),
      panel: this.querySelector("ul"),
      list: this.querySelector(".disclosure__list"),
    };
    if (!this.elements.button || !this.elements.list || !this.elements.input) return;
    this.elements.button.addEventListener(
      "click",
      this.openSelector.bind(this)
    );
    // Closing on focusout before the customer selects an option can cancel taps,
    // especially when touch keyboards or mobile editor controls steal focus.
    // Click-away, Escape and the backdrop handle dismissal instead.
    this.addEventListener("keyup", this.onContainerKeyUp.bind(this));
    // One listener for every option. The list moves to <body> as a phone
    // sheet, and a country list is copied in only when it first opens.
    this.elements.list.addEventListener("click", (event) => {
      const item = event.target.closest?.("a[data-value]");
      if (item && this.elements.list.contains(item)) this.onItemClick(event, item);
    });
    this.onBodyClick = this.handleBodyClick.bind(this);
    if (!this.ensureOptions(false)) return;
    this.setupMobileSheet();
    this._onResize = () => {
      if (!window.matchMedia('(max-width: 1024.98px)').matches && this._sheetPortaled) this.hidePanel();
    };
    window.addEventListener('resize', this._onResize, {passive:true});
  }

  // Country lists are written once per page in template#materia-country-options.
  // Returns false while this list still waits for them (filled on first open).
  ensureOptions(fill = true) {
    const panel = this.elements.panel;
    if (!panel || !panel.hasAttribute("data-country-options") || panel.firstElementChild) return true;
    if (!fill) return false;
    const source = document.getElementById("materia-country-options");
    let rows = [];
    try { rows = JSON.parse(source?.textContent || "[]"); } catch (e) {}
    const current = source?.dataset.current || this.elements.input?.value;
    const flag = (code) => "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 24"><text x="16" y="19" font-size="20" text-anchor="middle">' +
      String(code).toUpperCase().replace(/[A-Z]/g, (c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0))) + "</text></svg>");
    const fragment = document.createDocumentFragment();
    for (const [code, name, currency, symbol, image] of rows) {
      const li = document.createElement("li");
      li.className = "disclosure__item py-4";
      li.tabIndex = -1;
      const a = document.createElement("a");
      a.href = "#";
      a.className = "no-underline reversed-links text-color hover-heading-color";
      if (code === current) a.setAttribute("aria-current", "true");
      a.dataset.value = code;
      a.setAttribute("aria-label", name);
      const row = document.createElement("span");
      row.className = "flex align-center gap-10";
      const holder = document.createElement("span");
      holder.className = "rounded-50 border localization-flags";
      const img = document.createElement("img");
      img.src = image || flag(code);
      img.alt = name;
      img.loading = "lazy";
      img.decoding = "async";
      holder.appendChild(img);
      const label = document.createElement("span");
      label.textContent = `${name} (${currency} ${symbol})`;
      row.append(holder, label);
      a.appendChild(row);
      li.appendChild(a);
      fragment.appendChild(li);
    }
    panel.appendChild(fragment);
    this.setupMobileSheet();
    return true;
  }

  setupMobileSheet() {
    const list = this.elements.list;
    if (!list || list.dataset.sheetReady) return;
    list.dataset.sheetReady = "1";
    const isMobile = () => window.matchMedia("(max-width: 1024.98px)").matches;

    // Sheet head: grab handle and a search field. Drag starts here, or from
    // the list when it is scrolled to the top, like a native iOS sheet.
    const head = document.createElement("div");
    head.className = "loc-sheet-head";
    const grab = document.createElement("div");
    grab.className = "sheet-grab-area";
    grab.setAttribute("aria-hidden", "true");
    head.appendChild(grab);
    const items = [...list.querySelectorAll(".disclosure__item")];
    if (items.length > 6) {
      const label = list.dataset.searchLabel || "Search";
      const field = document.createElement("label");
      field.className = "loc-sheet-search";
      // The pill is the field: the theme's field layer leaves [data-sheet-search] inputs bare.
      field.setAttribute("data-sheet-search", "");
      field.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      const input = document.createElement("input");
      input.type = "search";
      input.placeholder = label;
      input.setAttribute("aria-label", label);
      input.autocomplete = "off";
      input.enterKeyHint = "search";
      field.appendChild(input);
      head.appendChild(field);
      const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      items.forEach((li) => { li.dataset.search = norm(li.textContent.replace(/\s+/g, " ")); });
      input.addEventListener("input", () => {
        const q = norm(input.value.trim());
        let shown = 0;
        items.forEach((li) => { li.hidden = q !== "" && !li.dataset.search.includes(q); if (!li.hidden) shown++; });
        if (!this._sheetEmpty) {
          this._sheetEmpty = document.createElement("p");
          this._sheetEmpty.className = "loc-sheet-empty";
          this._sheetEmpty.setAttribute("role", "status");
          this._sheetEmpty.textContent = list.dataset.emptyLabel || "No matches";
          (this.elements.panel || list).after(this._sheetEmpty);
        }
        this._sheetEmpty.hidden = shown > 0;
        if (this.elements.panel) this.elements.panel.scrollTop = 0;
        list.scrollTop = 0;
      });
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        items.find((li) => !li.hidden)?.querySelector("a")?.click();
      });
      this._sheetSearch = input;
    }
    list.prepend(head);
    list.addEventListener("keyup", (e) => {
      if (e.key !== "Escape" || !this._sheetPortaled) return;
      this.hidePanel();
      this.elements.button?.focus({ preventScroll: true });
    });

    // Shared backdrop, shown in the top layer just before the sheet so it
    // sits above the open phone menu too.
    let bd = document.querySelector(".loc-sheet-backdrop");
    if (!bd) {
      bd = document.createElement("div");
      bd.className = "loc-sheet-backdrop";
      document.body.appendChild(bd);
      bd.addEventListener("click", () => {
        document.querySelectorAll("localization-form").forEach((lf) => {
          if (lf.querySelector(".button-localization.open")) lf.hidePanel();
        });
      });
    }
    this._backdrop = bd;

    const scroller = () => this.elements.panel;
    let startY = 0, lastY = 0, lastT = 0, velocity = 0, dy = 0;
    let tracking = false, dragging = false;
    const setDrag = (y) => {
      dy = y;
      list.style.setProperty("--sheet-drag-y", y + "px");
      const h = list.offsetHeight || 1;
      bd.style.opacity = String(Math.max(0, 1 - y / h));
    };
    const begin = (y, fromHead) => {
      if (!isMobile() || !this.elements.button.classList.contains("open")) return;
      tracking = true;
      dragging = fromHead;
      startY = lastY = y;
      lastT = performance.now();
      velocity = 0;
      dy = 0;
      if (dragging) list.classList.add("sheet-dragging");
    };
    const move = (y, e) => {
      if (!tracking) return;
      const sc = scroller();
      if (!dragging) {
        // From the list: only take over when it is at the top and pulled down.
        if (y - startY > 4 && (!sc || sc.scrollTop <= 0)) {
          dragging = true;
          startY = y;
          list.classList.add("sheet-dragging");
        } else if (Math.abs(y - startY) > 4) {
          tracking = false;
          return;
        } else return;
      }
      const now = performance.now();
      velocity = (y - lastY) / Math.max(1, now - lastT);
      lastY = y;
      lastT = now;
      const d = y - startY;
      setDrag(d > 0 ? d : d / 4);
      if (e && e.cancelable) e.preventDefault();
    };
    const finish = () => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      dragging = false;
      list.classList.remove("sheet-dragging");
      if (dy > list.offsetHeight * 0.3 || velocity > 0.5) {
        this.hidePanel();
      } else {
        setDrag(0);
        bd.style.removeProperty("opacity");
      }
    };
    list.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1 || e.target.closest("input")) return;
      begin(e.touches[0].clientY, !!e.target.closest(".loc-sheet-head"));
    }, { passive: true });
    list.addEventListener("touchmove", (e) => move(e.touches[0].clientY, e), { passive: false });
    list.addEventListener("touchend", finish);
    list.addEventListener("touchcancel", finish);
    // Mouse and pen drag from the handle.
    head.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" || e.target.closest("input")) return;
      begin(e.clientY, true);
      try { head.setPointerCapture(e.pointerId); } catch (err) {}
    });
    head.addEventListener("pointermove", (e) => { if (e.pointerType !== "touch") move(e.clientY, e); });
    head.addEventListener("pointerup", (e) => { if (e.pointerType !== "touch") finish(); });
    head.addEventListener("pointercancel", (e) => { if (e.pointerType !== "touch") finish(); });
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target != this && !target.closest("localization-form") && !target.closest('.materia-localization-sheet')) {
      this.hidePanel();
    }
  }

  _topLayer(el, show) {
    if (!el || !HTMLElement.prototype.showPopover) return;
    try {
      if (show) {
        if (!el.hasAttribute("popover")) el.setAttribute("popover", "manual");
        if (el.matches(":popover-open")) el.hidePopover();
        el.showPopover();
      } else if (el.hasAttribute("popover")) {
        if (el.matches(":popover-open")) el.hidePopover();
        el.removeAttribute("popover");
      }
    } catch (e) {}
  }

  // Colours for the sheet come from what is really painted behind the
  // selector, and the text is checked against it so it always reads.
  applySheetColors(list) {
    const parse = (c) => {
      const m = c && c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    let bg = null;
    for (let el = this; el && el.nodeType === 1; el = el.parentElement) {
      const c = parse(getComputedStyle(el).backgroundColor);
      if (c && c.a > 0.85) { bg = c; break; }
    }
    if (!bg) {
      const page = parse(getComputedStyle(document.body).backgroundColor);
      bg = page && page.a > 0.85 ? page : { r: 255, g: 255, b: 255, a: 1 };
    }
    let fg = parse(getComputedStyle(this.elements.button || this).color) || { r: 17, g: 17, b: 17, a: 1 };
    if (contrast(bg, fg) < 4.5) fg = lum(bg) > 0.35 ? { r: 17, g: 17, b: 17 } : { r: 255, g: 255, b: 255 };
    const css = (c) => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
    list.style.setProperty('--color-background', css(bg));
    list.style.setProperty('--color-heading', css(fg));
    list.style.setProperty('--color-text', css(fg));
    list.style.setProperty('--color-border', `color-mix(in srgb, ${css(fg)} 14%, transparent)`);
  }

  portalMobileSheet() {
    clearTimeout(this._portalRestoreTimer);
    const list = this.elements.list;
    if (!list) return;
    if (!this._sheetPortaled) {
      // A fixed sheet nested inside a sticky or transformed header is clipped
      // on iOS, so only the open panel moves to <body>.
      this.applySheetColors(list);
      list.classList.add('materia-localization-sheet');
      document.body.appendChild(list);
      this._sheetPortaled = true;
    }
    list.classList.remove('is-open');
    list.style.removeProperty('height');
    list.style.setProperty('--sheet-drag-y', '0px');
    this._backdrop?.style.removeProperty('opacity');
    this._topLayer(this._backdrop, true);
    this._topLayer(list, true);
    list.getBoundingClientRect();
    requestAnimationFrame(() => {
      if (!this._sheetPortaled || !this.elements.button?.classList.contains('open')) return;
      this._backdrop?.classList.add('open');
      list.classList.add('is-open');
      // Keep the height while searching so the sheet does not jump.
      list.style.height = list.offsetHeight + 'px';
      const current = list.querySelector('[aria-current="true"]');
      if (current && this.elements.panel) {
        this.elements.panel.scrollTop = Math.max(0, current.offsetTop - this.elements.panel.clientHeight / 2);
      }
    });
  }

  hidePanel() {
    document.body.removeEventListener("click", this.onBodyClick);
    this.elements.button?.classList.remove("open");
    this.elements.button?.setAttribute("aria-expanded", "false");
    const list = this.elements.list;
    const anyOpen = document.querySelector("localization-form .button-localization.open");
    if (!anyOpen && this._backdrop) {
      this._backdrop.classList.remove("open");
      this._backdrop.style.removeProperty("opacity");
    }
    if (!this._sheetPortaled && this._sheetSearch && this._sheetSearch.value) {
      this._sheetSearch.value = '';
      this._sheetSearch.dispatchEvent(new Event('input'));
    }
    if (this._sheetPortaled) {
      list.classList.remove('is-open', 'sheet-dragging');
      list.style.removeProperty('--sheet-drag-y');
      clearTimeout(this._portalRestoreTimer);
      this._portalRestoreTimer = setTimeout(() => {
        if (this.elements.button?.classList.contains('open')) return;
        this._topLayer(list, false);
        if (!document.querySelector("localization-form .button-localization.open")) this._topLayer(this._backdrop, false);
        if (this.elements.button?.isConnected) this.elements.button.after(list);
        else list.remove();
        list.classList.remove('materia-localization-sheet');
        list.style.removeProperty('height');
        ['--color-background','--color-heading','--color-text','--color-border'].forEach(name => list.style.removeProperty(name));
        if (this._sheetSearch && this._sheetSearch.value) {
          this._sheetSearch.value = '';
          this._sheetSearch.dispatchEvent(new Event('input'));
        }
        this._sheetPortaled = false;
      }, 420);
    }
  }

  onContainerKeyUp(event) {
    if (event.code.toUpperCase() !== "ESCAPE") return;
    this.hidePanel();
    this.elements.button.focus();
  }

  onItemClick(event, item = event.currentTarget) {
    event.preventDefault();
    const form = this.querySelector("form");
    this.elements.input.value = item.dataset.value;
    if (form) form.submit();
  }

  openSelector() {
    if (this.elements.button.classList.contains("open")) {
      this.hidePanel();
    } else {
      this.ensureOptions();
      document.body.addEventListener("click", this.onBodyClick);
      this.elements.button.focus({preventScroll:true});
      document.querySelectorAll('localization-form').forEach(form => {
        if (form !== this && form.elements?.button?.classList.contains('open')) form.hidePanel();
      });
      this.elements.button.classList.add("open");
      this.elements.button.setAttribute("aria-expanded", "true");
      // Portaled panels clear sticky-header containing blocks and render
      // ABOVE the page backdrop regardless of header/footer z-index.
      if (window.matchMedia("(max-width: 1024.98px)").matches) {
        this.portalMobileSheet();
        this._backdrop?.classList.add("open");
      } else if (this._sheetSearch) {
        setTimeout(() => this._sheetSearch?.focus({ preventScroll: true }), 60);
      }
    }
  }

  closeSelector(event) {
    const shouldClose =
      event.relatedTarget && event.relatedTarget.nodeName === "BUTTON";
    if (event.relatedTarget === null || shouldClose) {
      this.hidePanel();
    }
  }
}
customElements.define("localization-form", LocalizationForm);

class CollapsibleBlock extends HTMLElement {
  constructor() {
    super();
    const _this = this;
    const block = _this.querySelectorAll(".collapsible-heading");
    block.forEach((event) => {
      event.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const parent = target.parentElement;
        const footerContent = parent.querySelector(".collapsible-content");
        if (
          _this.closest(".collection-filter") &&
          _this
            .closest(".collection-filter")
            .classList.contains("horizontal") &&
          window.innerWidth > 1024
        ) {
          if (!_this.classList.contains("active")) {
            if (document.querySelector("collapsible-block.active")) {
              document
                .querySelector("collapsible-block.active")
                .classList.remove("active");
            }
            _this.classList.add("active");
          } else {
            _this.classList.remove("active");
          }
        } else {
          // On the search page, enforce single-open behavior: when a filter
          // collapsible is opened, close every other sibling in the same
          // filter sidebar (prevents multiple panels being open at once).
          const inSearch = _this.closest(".sec__search-main");
          if (inSearch && !_this.classList.contains("active")) {
            const siblings = inSearch.querySelectorAll(
              "collapsible-block.active"
            );
            siblings.forEach((sib) => {
              if (sib === _this) return;
              sib.classList.remove("active");
              const sibContent = sib.querySelector(".collapsible-content");
              if (sibContent) {
                slideAnime({ target: sibContent, animeType: "slideUp" });
              }
            });
          }
          slideAnime({
            target: footerContent,
            animeType: "slideToggle",
          });
          if (!_this.classList.contains("active")) {
            _this.classList.add("active");
          } else {
            _this.classList.remove("active");
          }
        }
      });
    });
    document.body.addEventListener("click", this.handleBodyClick.bind(this));
    if (this.classList.contains("collection")) {
      this.actionInMobile();
      window.addEventListener("resize", () => {
        this.actionInMobile();
      });
    }
  }

  actionInMobile() {
    var _this = this;
    var width = window.innerWidth;
    if (width <= 1024) {
      const footerContent = _this.querySelector(".collapsible-content");
      if (footerContent) footerContent.style.display = "block";
      _this.classList.add("active");
    }
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (
      target != this &&
      !target.closest("collapsible-block") &&
      document.querySelector(".collection-filter") &&
      document
        .querySelector(".collection-filter")
        .classList.contains("horizontal") &&
      window.innerWidth > 1024
    ) {
      const block = document
        .querySelector(".collection-filter")
        .querySelectorAll("collapsible-block");
      block.forEach((collapsible) => {
        collapsible.classList.remove("active");
      });
    }
  }
}
customElements.define("collapsible-block", CollapsibleBlock);

class StickyElement extends HTMLElement {
  constructor() {
    super();
    this.collapsibleHeading = this.querySelector(".collapsible-bundle");
    this.contentWrapper = this.querySelector(".bundle-items__wrapper");
    this.isOpen = true;
    this.isMobile = window.innerWidth <= 1024;
    this.init();
  }

  init() {
    if (this.isMobile) {
      this.setupCollapsible();
    }

    window.addEventListener("resize", this.onResize.bind(this));
  }

  setupCollapsible() {
    if (!this.collapsibleHeading || !this.contentWrapper) return;

    if (this.isMobile) {
      this.isOpen = false;
      this.contentWrapper.style.display = "none";
      this.classList.remove("opened");
    }

    if (!this.collapsibleHeading.hasEventListener) {
      this.collapsibleHeading.hasEventListener = true;
      this.collapsibleHeading.addEventListener(
        "click",
        this.toggleCollapse.bind(this)
      );
    }
  }

  toggleCollapse(event) {
    if (!this.isMobile) return;

    event.preventDefault();

    this.isOpen = !this.isOpen;

    slideAnime({
      target: this.contentWrapper,
      animeType: "slideToggle",
      parent: this,
    });
  }

  onResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 1024;

    if (wasMobile !== this.isMobile) {
      if (this.isMobile) {
        this.setupCollapsible();
      } else {
        if (this.contentWrapper) {
          this.contentWrapper.style.display = "block";
          this.contentWrapper.style.height = "auto";
        }
      }
    }
  }

  showContent() {
    if (this.isMobile && !this.isOpen && this.contentWrapper) {
      this.isOpen = true;
      slideAnime({
        target: this.contentWrapper,
        animeType: "slideDown",
        parent: this,
      });
      this.classList.add("opened");
    }
  }
}

customElements.define("sticky-element", StickyElement);

class AnnouncementBar extends HTMLElement {
  constructor() {
    super();
    const _this = this;
    const close = _this.querySelector(".announcement-bar-close");
    if (!close) {
      return;
    }
    close.addEventListener("click", (e) => {
      slideAnime({
        target: _this,
        animeType: "slideToggle",
      });
      sessionStorage.setItem("announcement_bar", "false");
    });
  }
}
customElements.define("announcement-bar", AnnouncementBar);

class VideoSection extends HTMLElement {
  constructor() {
    super();
    this.thumb = this.querySelector(".video-thumbnail");
    this.video_iframe = this.querySelector(".video-has-bg iframe");
    this.init();
  }

  init() {
    if (this.video_iframe) {
      this.video_iframe.addEventListener("load", () => {
        if (this.thumb) {
          this.thumb.remove();
        }
      });
    }
  }
}
customElements.define("video-section", VideoSection);

class AgeVerifier extends HTMLElement {
  constructor() {
    super();
    this.ageVerifyDetail = this.querySelector(".age-verify-detail");
    this.declineVerifyDetail = this.querySelector(".decline-verify-detail");
    this.init();
    this.mainFunction();
  }
  init() {
    const _this = this;
    if (!(window.Shopify && window.Shopify.designMode)) {
      if (!getCookie("age_verifier")) {
        this.classList.add("active");
        this.declineVerifyDetail.classList.add("hidden");
        this.ageVerifyDetail.classList.remove("hidden");
      } else {
        if (getCookie("age_verifier") == "false") {
          this.classList.add("active");
          this.declineVerifyDetail.classList.remove("hidden");
          this.ageVerifyDetail.classList.add("hidden");
        } else {
          this.remove();
        }
      }
    }
  }

  mainFunction() {
    const approve = this.querySelector(".age-verifier-approve");
    const decline = this.querySelector(".age-verifier-decline");
    const returnBtn = this.querySelector(".age-verifier-return");
    if (returnBtn) {
      returnBtn.addEventListener("click", () => this.handleReturn());
    }

    if (!approve || !decline) return;
    approve.addEventListener("click", () => this.handleApprove());
    decline.addEventListener("click", () => this.handleDecline());
  }
  handleReturn() {
    if (!(window.Shopify && window.Shopify.designMode)) {
      setCookie("age_verifier", "false", "-1");
      this.init();
    }
  }
  handleDecline() {
    if (!(window.Shopify && window.Shopify.designMode)) {
      setCookie("age_verifier", "false", "365");
      this.init();
    }
  }
  handleApprove() {
    setCookie("age_verifier", "true", "false");
    this.classList.add("fadeOut");
    setTimeout(() => {
      this.remove();
    }, 1000);
  }
}
customElements.define("age-verifier", AgeVerifier);

class PromotionPopup extends HTMLElement {
  constructor() {
    super();
    setTimeout(() => {
      this.init();
    }, 15000);
  }

  init() {
    const _this = this;
    const s = _this?.dataset.show;
    const m = _this?.dataset.showMb === "true";
    if (!(window.Shopify && window.Shopify.designMode)) {
      if (s === "show-on-all-pages" || s === "show-on-homepage") {
        if (getCookie("promotion-popup") === "") {
          const modal = new tingle.modal({
            footer: false,
            stickyFooter: false,
            closeMethods: ["overlay", "button", "escape"],
            closeLabel: "Close",
            cssClass: [
              `promotion-popup-modal`,
              `${m ? "enable-on-mobile" : "show-all"}`,
            ],
          });
          modal.setContent(_this.innerHTML);
          modal.open();
          _this.copyPromotion();
          _this.checkNotShowPromotion();
        }
      }
    }
  }
  checkNotShowPromotion() {
    const check = document.querySelector(
      ".promotion-popup-modal .do-not-show-again"
    );
    if (check) {
      check.addEventListener("click", (e) => {
        setCookie("promotion-popup", 1, 1);
        document
          .querySelector(".promotion-popup-modal .tingle-modal__close")
          .click();
      });
    }
  }
  copyPromotion() {
    const cp = document.querySelectorAll(".promotion-popup-modal .discount");
    if (cp !== null) {
      cp.forEach((e) => {
        e.addEventListener("click", (el) => {
          el.preventDefault();
          navigator.clipboard.writeText(e?.dataset.code);
          e.classList.add("action-copy");
          setTimeout(() => {
            e.classList.remove("action-copy");
          }, 1500);
        });
      });
    }
  }
}
customElements.define("promotion-popup", PromotionPopup);

class NewsletterPopup extends HTMLElement {
  constructor() {
    super();
    setTimeout(() => {
      this.init();
    }, 12000);
  }
  init() {
    const sectionId = this.dataset.sectionId;
    const url = `${window.location.pathname}?section_id=${sectionId}&ajax=1`;
    fetch(`${url}`)
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          throw error;
        }
        return response.text();
      })
      .then((responseText) => {
        const newSection = new DOMParser()
          .parseFromString(responseText, "text/html")
          .querySelector("newsletter-popup").innerHTML;
        document.querySelector("newsletter-popup").innerHTML = newSection;
      })
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        this.initPopup();
      });
  }

  initPopup() {
    const _this = this;
    const s = _this?.dataset.show;
    const m = _this?.dataset.showMb === "true";
    if (!(window.Shopify && window.Shopify.designMode)) {
      const cookie = getCookie("newsletter_popup");
      const width = window.innerWidth;
      if (!m && width < 768) {
        return false;
      }
      if ((s == "show_homepage" || s == "show_all_page") && cookie === "") {
        const modal = new tingle.modal({
          footer: false,
          stickyFooter: false,
          closeMethods: ["overlay", "button", "escape"],
          closeLabel: "Close",
          beforeOpen: function () {
            CloseAllPopup();
          },
          cssClass: [
            `newsletter-popup-modal`,
            `${m ? "show-all" : "disable-on-mobile"}`,
          ],
        });
        modal.setContent(_this.innerHTML);
        modal.open();
        _this.onShowNewletter();
      }
    }
  }

  onShowNewletter() {
    const _this = this;
    const setC = document.querySelector(
      ".newsletter-popup-modal .newsletter-popup__dont-show"
    );
    if (!setC) return;
    setC.addEventListener("click", _this.notShow.bind(_this));
    setC.addEventListener(
      "keypress",
      function (event) {
        if (event.key === "Enter") {
          _this.notShow.bind(_this)(event);
        }
      }.bind(_this),
      false
    );
  }

  notShow(e) {
    e.preventDefault();
    setCookie("newsletter_popup", 30, 1);
    document
      .querySelector(".newsletter-popup-modal .tingle-modal__close")
      .click();
  }
}
customElements.define("newsletter-popup", NewsletterPopup);

class TiktokVideo extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    const _this = this;
    window.addEventListener("scroll", () => {
      let wpy = window.scrollY;
      if (wpy > 0) {
        this.scrollLazyloadVideo();
      }
    });
    let pos = window.pageYOffset;
    if (pos > 40) {
      this.scrollLazyloadVideo();
    }
  }

  scrollLazyloadVideo() {
    const _this = this;
    if (!_this.classList.contains("tiktok-loading")) {
      return;
    }
    _this.classList.remove("tiktok-loading");
    const sectionId = _this.dataset.sectionId;
    const url = `${window.location.pathname}?section_id=${sectionId}&ajax=1`;
    fetch(`${url}`)
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          throw error;
        }
        return response.text();
      })
      .then((responseText) => {
        const newSection = new DOMParser()
          .parseFromString(responseText, "text/html")
          .querySelector("tiktok-video").innerHTML;
        _this.innerHTML = newSection;
      })
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://www.tiktok.com/embed.js";
        document.body.appendChild(script);
      });
  }
}
customElements.define("tiktok-video", TiktokVideo);

var returnMessageWhenSubmit = (function () {
  return {
    init: function () {
      this.checkUrlReturn();
    },
    checkUrlReturn: function () {
      const getUrl = window.location.href;
      if (
        getUrl.indexOf("customer_posted=true#newsletter-form") >= 1 ||
        getUrl.indexOf("customer_posted=true") >= 1
      ) {
        this.handleMessageSuccessPopup();
        setCookie("newsletter_popup", 30, 1);
        const newURL = location.href.split("?")[0];
        window.history.pushState("object", document.title, newURL);
      }

      if (
        getUrl.indexOf("contact%5Btags%5D=newsletter&form_type=customer") >= 1
      ) {
        this.handleMessageErrorPopup();
        const newURL = location.href.split("?")[0];
        window.history.pushState("object", document.title, newURL);
      }
    },

    handleMessageSuccessPopup: function () {
      const url = `${window.location.pathname}?section_id=form-message`;
      fetch(url)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(
            responseText,
            "text/html"
          );
          const elementSuccessMessage = html.querySelector(
            ".newsletter-form__success-message-wrapper"
          );
          showToast(elementSuccessMessage.innerHTML, 3000, "modal-success");
        })
        .catch((e) => {
          throw e;
        });
    },

    handleMessageErrorPopup: function () {
      const url = `${window.location.pathname}?section_id=form-message`;
      fetch(url)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(
            responseText,
            "text/html"
          );
          const elementErrorMessage = html.querySelector(
            ".newsletter-form__error-message-wrapper"
          );
          const elementMessage = elementErrorMessage.querySelector(
            ".newsletter-form__message"
          );
          showToast(elementErrorMessage.innerHTML, 3000, "modal-error");
        })
        .catch((e) => {
          throw e;
        });
    },
  };
})();
try { returnMessageWhenSubmit.init(); } catch (e) { console.error("[theme] form message init", e); }
class NavBar extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    document.body.classList.add("mobi-navigation-bar");
  }
}
customElements.define("mobile-navigation-bar", NavBar);

class CarouselMobile extends SlideSection {
  constructor() {
    super();
    this.enable = this.dataset.enable;
    this.swiperSlideInnerHtml = this.innerHTML;
    this.init();
  }
  init() {
    if (this.enable == "true") {
      let width = window.innerWidth;
      window.addEventListener("resize", () => {
        const newWidth = window.innerWidth;
        if (newWidth <= 767 && width > 767) {
          this.actionOnMobile();
        }
        if (newWidth > 767 && width <= 767) {
          this.actionOutMobile();
        }
        width = newWidth;
      });
      if (width <= 767) {
        this.actionOnMobile();
      } else {
        this.actionOutMobile();
      }
    }
  }
  actionOnMobile() {
    this.classList.add("swiper");
    this.classList.remove("grid", "grid-cols");
    const html = this.swiperSlideInnerHtml.replaceAll(
      "sec__icon-switch-slide",
      "swiper-slide"
    );
    const wrapper = `<div class='swiper-wrapper'>${html}</div> <div
    class="swiper-pagination  ${
      this.enable && this.dataset.mobile != 1.5 ? "flex" : "hidden"
    } px-15 lh-1 bottom-30 justify-content-center"
    style="--swiper-pagination-bottom: 3rem;--swiper-pagination-position: static;"
  ></div> `;
    this.innerHTML = wrapper;
    this.initSlide();
  }
  actionOutMobile() {
    this.classList.remove("swiper");
    this.classList.add("grid", "grid-cols");
    this.innerHTML = this.swiperSlideInnerHtml;
  }
}
customElements.define("carousel-mobile", CarouselMobile);

class PaginateLoadmore extends HTMLElement {
  constructor() {
    super();
    this.initLoadMore();
    if (this.classList.contains("collection-infinite-scroll")) {
      this.querySelector("a").addEventListener(
        "click",
        async (e) => {
          this.toggleLoading(e.currentTarget, true);
          await new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve();
              this.toggleLoading(e.currentTarget, false);
              this.remove();
            }, 400);
          });
          for (var item of document.querySelectorAll(
            ".sec__collections-list .collection-item.grid-custom-item"
          )) {
            item.classList.remove("hidden");
          }
          if (!this.hasAttribute("hold")) {
            Motion.animate(
              document.querySelectorAll(
                ".sec__collections-list .collection-item.grid-custom-item.trigger_slidein"
              ),
              {
                transform: ["translateY(3.5rem)", "translateY(0)"],
                opacity: [0.01, 1],
                visibility: ["hidden", "visible"],
              },
              {
                duration: 0.5,
                delay: Motion.stagger(0.1),
                easing: [0, 0, 0.3, 1],
              }
            );
          }
        },
        false
      );
    }
  }
  initLoadMore() {
    this.querySelectorAll(".actions-loadmore").forEach((loadMore) => {
      var _this = this;
      if (loadMore.classList.contains("infinit-scrolling")) {
        var observer = new IntersectionObserver(
          function (entries) {
            entries.forEach((entry) => {
              if (entry.intersectionRatio === 1) {
                _this.loadMoreItem(loadMore);
              }
            });
          },
          { threshold: 1.0 }
        );
        observer.observe(loadMore);
      } else {
        loadMore.addEventListener(
          "click",
          (event) => {
            event.preventDefault();
            const target = event.currentTarget;
            _this.loadMoreItem(target);
          },
          false
        );
      }
    });
  }
  loadMoreItem(target) {
    const loadMore_url = target.getAttribute("href");
    const _this = this;
    let sectionContainer = document.querySelector(`#product-grid`);
    sectionContainer?.classList.add("bls-image-js");
    _this.toggleLoading(target, true);
    fetch(`${loadMore_url}`)
      .then((response) => {
        if (!response.ok) {
          var error = new Error(response.status);
          throw error;
        }
        return response.text();
      })
      .then((responseText) => {
        const resultNodes = parser.parseFromString(responseText, "text/html");
        const resultNodesHtml = resultNodes.querySelectorAll(
          ".loadmore-lists .loadmore-item"
        );
        resultNodesHtml.forEach((prodNode) =>
          document.querySelector(".loadmore-lists").appendChild(prodNode)
        );
        const load_more = resultNodes.querySelector(".actions-loadmore");
        document.querySelector(".load-more-bar").innerHTML =
          resultNodes.querySelector(".load-more-bar").innerHTML;
        if (load_more) {
          target.setAttribute("href", load_more.getAttribute("href"));
        } else {
          target.remove();
        }
        _this.toggleLoading(target, false);
      })
      .catch((error) => {
        throw error;
      })
      .finally(async () => {
        initLazyloadItem();
        BlsLazyloadImg.init();
        setTimeout(() => {
          const grid_list = document.querySelector("grid-list");
          grid_list?.showGridItems();
        }, 100);
      });
  }
  toggleLoading(event, loading) {
    if (event) {
      const method = loading ? "add" : "remove";
      event.classList[method]("loading");
    }
  }
}
customElements.define("loadmore-button", PaginateLoadmore);

class SingleItem extends HTMLElement {
  constructor() {
    super();
    this.position = this.dataset.position;
    this.section = this.closest(".section-slide-single");
    this.init();
  }
  init() {
    this.addEventListener("click", this.onClick.bind(this));
  }
  onClick() {
    if (this.section && this.position) {
      const slideSEction = this.section.querySelector(`slide-section-single`);
      const allDots = this.section.querySelectorAll(`single-item`);
      allDots.forEach((dot) => {
        dot.classList.remove("active");
      });
      this.classList.add("active");
      if (slideSEction) {
        slideSEction.functionGoto(this.position);
      }
    }
  }
}
customElements.define("single-item", SingleItem);

class SlideSectionSingle extends SlideSection {
  constructor() {
    super();
    this.init();
  }
  init() {
    this.initSlide();
  }
  functionGoto(position) {
    this.globalSlide.slideToLoop(position - 1, 500);
  }
}
customElements.define("slide-section-single", SlideSectionSingle);
class VariantRadiosQuickEdit extends SwatchInit {
  constructor() {
    super();
    this.variantData = null;
    this.currentVariant = null;
    this.options = [];
    this.init();
  }

  init() {
    const swatchButtons = this.querySelectorAll(".product__color-swatches--js");
    swatchButtons.forEach((btn) => {
      this.checkSwatches(btn);
    });
    
    const optionSwatches = this.querySelectorAll(".option-swatch-js");
    optionSwatches.forEach((button) => {
      button.addEventListener(
        "click", 
        this.onVariantChange.bind(this), 
        false
      );
    });
  }

  onVariantChange(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const value = target.getAttribute("data-value");
    for (var item of target
      .closest("fieldset")
      .querySelectorAll(".option-swatch-js")) {
      item.classList.remove("active");
    }
    target.classList.toggle("active");
    target
      .closest("fieldset")
      .querySelector(".swatch-selected-value").textContent = value;
    this.options = Array.from(
      this.querySelectorAll(".option-swatch-js.active"),
      (select) => select.getAttribute("data-value")
    );
    this.updateMasterId();
    this.toggleAddButton(true, "", false);
    this.updateVariantStatuses();
    if (!this.currentVariant) {
      this.toggleAddButton(true, "", true);
      this.setUnavailable();
    } else {
      this.updateMedia();
      this.updateVariantInput();
      this.renderProductInfo();
    }
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateMedia() {
    if (!this.currentVariant) return;
    if (!this.currentVariant.featured_media) return;
    const form = document.getElementById(
      `product-form-quick-edit-${this.dataset.section}`
    );
    if (form.querySelector(".product__media img")) {
      form.querySelector(".product__media img").removeAttribute("srcset");
      form
        .querySelector(".product__media img")
        .setAttribute(
          "src",
          this.currentVariant.featured_media.preview_image.src
        );
    }
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-quick-edit-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  renderProductInfo() {
    if (!this.currentVariant) return;
    const compare_at_price = this.currentVariant.compare_at_price;
    const current_price = this.currentVariant.price;
    const price_format = Shopify.formatMoney(
      this.currentVariant.price,
      cartStrings?.money_format
    );
    const form = document.getElementById(
      `product-form-quick-edit-${this.dataset.section}`
    );
    form.querySelector(".price-regular .price").innerHTML = price_format;
    const price = form.querySelector(".price");
    const cardPrice = form.querySelector(".card-product-price");
    price.classList.remove("price--sold-out", "price--on-sale");
    price
      .querySelector(".price-regular .price")
      .classList.remove("special-price");
    const cpp = cardPrice.querySelector(".compare-price");
    if (compare_at_price && compare_at_price > current_price) {
      const compare_format = Shopify.formatMoney(
        compare_at_price,
        cartStrings?.money_format
      );
      if (!price.querySelector(".compare-price")) {
        var ps = document.createElement("div");
        var sp = document.createElement("span");
        var cp = document.createElement("s");
        cp.classList.add("price-item", "compare-price");
        sp.appendChild(cp);
        ps.appendChild(sp);
        ps.classList.add("price-regular");
        cardPrice.appendChild(ps);
      }
      if (price.querySelector(".compare-price")) {
        price.querySelector(".compare-price").innerHTML = compare_format;
      }
      price.classList.add("price--on-sale");
      price
        .querySelector(".price-regular .price")
        .classList.add("special-price", "primary-color");
    } else {
      if (cpp) {
        cpp.innerHTML = "";
      }
      if (cardPrice.querySelector(".price-regular")) {
        cardPrice
          .querySelector(".price-regular")
          .classList.remove("primary-color");
      }
      if (cardPrice.querySelector(".price-regular .price")) {
        cardPrice.querySelector(".price-regular .price").innerHTML =
          price_format;
        cardPrice
          .querySelector(".price-regular .price")
          .classList.remove("price--special", "primary-color");
      }
    }
    if (!this.currentVariant.available) {
      price.classList.add("price--sold-out");
    }
    this.toggleAddButton(
      !this.currentVariant.available,
      window.variantStrings?.soldOut
    );
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(
      `product-form-quick-edit-${this.dataset.section}`
    );
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    const buttonPayment = productForm.querySelector(
      ".product-dynamic-checkout"
    );
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute("disabled", "disabled");
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute("disabled");
      addButtonText.textContent = window.variantStrings?.addToCart;
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(
      `product-form-quick-edit-${this.dataset.section}`
    );
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings?.unavailable;
    if (price) price.classList.add("visibility-hidden");
  }

  setAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.dataset.value)) {
        input.classList.remove("option-disabled");
      } else {
        input.classList.add("option-disabled");
      }
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.getVariantData().filter(
      (variant) =>
        this.querySelector(".active").dataset.value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll(".product-form__input")];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll(".option-swatch-js")];
      const previousOptionSelected =
        inputWrappers[index - 1].querySelector(".active").dataset.value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter(
          (variant) =>
            variant.available &&
            variant[`option${index}`] === previousOptionSelected
        )
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}
customElements.define("variant-radios-quick-edit", VariantRadiosQuickEdit);

class VariantRadiosBundle extends SwatchInit {
  constructor() {
    super();
    this.init();
  }

  init() {
    this.querySelectorAll(".product__color-swatches--js").forEach((btn) => {
      this.checkSwatches(btn);
      this.variantHover(btn);
    });
    this.querySelectorAll(".option-swatch-js").forEach((button) =>
      button.addEventListener("click", this.onVariantChange.bind(this), false)
    );
  }

  onVariantChange(event) {
    event.preventDefault();
    this.productTarget = this.closest(".product__item-js");
    const variantQtyData = JSON.parse(
      this.productTarget.querySelector(".productVariantsQty").textContent
    );
    const target = event.currentTarget;
    const value = target.getAttribute("data-value");
    for (var item of target
      .closest("fieldset")
      .querySelectorAll(".option-swatch-js")) {
      item.classList.remove("active");
    }
    target.classList.toggle("active");
    target
      .closest("fieldset")
      .querySelector(".swatch-selected-value").textContent = value;
    this.options = Array.from(
      this.querySelectorAll(".option-swatch-js.active"),
      (select) => select.getAttribute("data-value")
    );
    this.updateMasterId();
    this.toggleAddButton(true, "", false);
    this.updateVariantStatuses();
    if (!this.currentVariant) {
      this.toggleAddButton(true, "", true);
      this.setUnavailable();
    } else {
      this.updateVariantInput();
      this.renderProductInfo(this.productTarget, variantQtyData, target);
      this.updateMedia();
    }
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  async updateMedia() {
    if (!this.currentVariant) return;
    if (
      !this.productTarget
        .querySelector(".product__media img")
        .classList.contains("hidden")
    ) {
      const productItem = this.productTarget
        .querySelector(".product__media img")
        .closest(".product-item");
      if (
        productItem.querySelector("video") ||
        productItem.querySelector("iframe")
      ) {
        this.productTarget
          .querySelector(".product__media img")
          .classList.add("hidden");
        productItem.querySelector("video")?.classList.remove("hidden");
        productItem.querySelector("iframe")?.classList.remove("hidden");
      }
    }
    if (!this.currentVariant.featured_media) return;
    if (this.productTarget.querySelector(".product__media img")) {
      this.productTarget
        .querySelector(".product__media img")
        .removeAttribute("srcset");
    }
    if (
      this.productTarget
        .querySelector(".product__media img")
        .classList.contains("hidden")
    ) {
      this.productTarget
        .querySelector(".product__media img")
        .classList.remove("hidden");
      const productItem = this.productTarget
        .querySelector(".product__media img")
        .closest(".product-item");
      if (
        productItem.querySelector("video") ||
        productItem.querySelector("iframe")
      ) {
        productItem.querySelector("video")?.classList.add("hidden");
        productItem.querySelector("iframe")?.classList.add("hidden");
      }
    }
    if (this.productTarget.querySelector(".product__media img")) {
      await Motion.animate(
        this.productTarget.querySelector(".product__media img"),
        { opacity: [1, 0] },
        { duration: 0.1, easing: "ease-in" }
      );
      this.productTarget
        .querySelector(".product__media img")
        .setAttribute(
          "src",
          this.currentVariant.featured_media.preview_image.src
        );
      await new Promise((resolve) => {
        this.productTarget.querySelector(".product__media img").onload = () => {
          resolve();
        };
      });
      Motion.animate(
        this.productTarget.querySelector(".product__media img"),
        { opacity: [0, 1] },
        { duration: 0.1, easing: "ease-in" }
      );
    }
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#quick-add-bundle-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  renderProductInfo(productTarget, variantQtyData, target) {
    if (!this.currentVariant) return;
    if (!productTarget) return;
    let qty = 0;
    let percent = 0;
    let sale = false;
    let soldOut = false;
    let pre_order = false;
    let av = this.currentVariant.available;
    let im = this.currentVariant.inventory_management;
    const compare_at_price = this.currentVariant.compare_at_price;
    const current_price = this.currentVariant.price;
    let avaiable = productTarget.querySelector(".available-value");
    const price_format = Shopify.formatMoney(
      this.currentVariant.price,
      cartStrings?.money_format
    );
    const typePercent = productTarget.querySelector(
      ".product__badges-type-percent"
    );
    productTarget.querySelector(".price-regular .price").innerHTML =
      price_format;
    const price = productTarget.querySelector(".price");
    price.classList.remove("price--sold-out", "price--on-sale");
    productTarget
      .querySelector(".price-regular .price")
      .classList.remove("special-price");
    variantQtyData.find((variantQty) => {
      if (variantQty.id === this.currentVariant.id) {
        qty = variantQty.qty;
      }
    });
    if (compare_at_price && compare_at_price > current_price) {
      sale = true;
      if (typePercent) {
        percent = ((compare_at_price - current_price) / compare_at_price) * 100;
      } else {
        percent = compare_at_price - current_price;
      }

      const compare_format = Shopify.formatMoney(
        compare_at_price,
        cartStrings?.money_format
      );
      if (!price.querySelector(".compare-price")) {
        var ps = price.querySelector(".price__sale");
        var sp = document.createElement("span");
        var cp = document.createElement("s");
        cp.classList.add("price-item", "compare-price");
        sp.appendChild(cp);
        if (ps) {
          ps.appendChild(sp);
        }
      }
      if (price.querySelector(".compare-price")) {
        price.querySelector(".compare-price").innerHTML = compare_format;
      }
      price.classList.add("price--on-sale");
      productTarget
        .querySelector(".price-regular .price")
        .classList.add("special-price");
    } else if (!this.currentVariant.available) {
      price.classList.add("price--sold-out");
    }
    if (im === null) {
      soldOut = false;
      pre_order = false;
      if (avaiable) {
        avaiable.innerHTML = window.variantStrings.inStock;
      }
    } else {
      if (av) {
        if (qty < 1) {
          pre_order = true;
          if (avaiable) {
            avaiable.innerHTML = window.variantStrings.preOrder;
          }
        } else {
          soldOut = false;
          pre_order = false;
          if (avaiable) {
            avaiable.innerHTML = window.variantStrings.inStock;
          }
          if (avaiable) {
            avaiable.innerHTML = window.variantStrings.inStock;
          }
        }
      } else {
        soldOut = true;
        if (avaiable) {
          avaiable.innerHTML = window.variantStrings.outStock;
        }
      }
    }
    this.toggleAddButton(
      !this.currentVariant.available,
      window.variantStrings?.soldOut
    );

    this.renderLabel(sale, pre_order, soldOut, percent, productTarget);
  }

  renderLabel(sale, pre_order, soldOut, percent, productTarget) {
    const label = productTarget.querySelector(".product__badges");
    const sale_badge = productTarget.querySelector(".sale_badge");
    const productBadgesScrolling = productTarget.querySelector(
      ".product__badges-sale-scrolling"
    );
    if (sale || pre_order || soldOut) {
      if (!label) {
        var element = document.createElement("div");
        element.classList.add(
          "product__badges",
          "fs-small",
          "flex",
          "flex-wrap",
          "gap-5",
          "uppercase"
        );
        if (sale_badge) {
          sale_badge.appendChild(element);
        }
      }
    }

    if (label) {
      const saleColor = label.dataset.saleColor;
      const soldOutColor = label.dataset.soldOutColor;
      const preOrderColor = label.dataset.preOrderColor;
      const saleBg = label.dataset.saleBg;
      const soldOutBg = label.dataset.soldOutBg;
      const preOrderBg = label.dataset.preOrderBg;
      const show_sale = label?.dataset.showSale === "true";
      const show_pre_order = label?.dataset.showPreorder === "true";
      const show_sold_out = label?.dataset.showSoldOut === "true";
      const prd = Shopify.formatMoney(
        percent,
        themeGlobalVariables.settings.money_format
      );
      const dsale = label.querySelector(".product__badges-sale");
      const dsoldout = label.querySelector(".product__badges-sold-out");
      const dpreorder = label.querySelector(".product__badges-pre-order");
      const typePrice = label.querySelector(".product__badges-type-price");
      const typePercent = label.querySelector(".product__badges-type-percent");
      if (sale && show_sale) {
        if (!dsale) {
          var elementsale = document.createElement("div");
          elementsale.classList.add(
            "product__badges-sale",
            "product__badges-inner",
            "py-8",
            "px-15",
            "align-self-start",
            "sale",
            "inline-flex",
            "content-center",
            "subheading_weight",
            "btn-rounded",
            "lh-normal",
            "text-center"
          );
          elementsale.style.setProperty("--badges-color", saleColor);
          elementsale.style.setProperty("--badges-bg", saleBg);
          elementsale.innerHTML = `${
            window.variantStrings.save ? window.variantStrings.save : "Save"
          } ${prd}`;
          if (dsoldout) {
            label.insertBefore(elementsale, dsoldout);
          } else if (dpreorder) {
            label.insertBefore(elementsale, dpreorder);
          } else {
            label.appendChild(elementsale);
          }
        } else {
          if (typePrice) {
            dsale.innerHTML = `${
              window.variantStrings.save ? window.variantStrings.save : "Save"
            } ${prd}`;
          } else if (typePercent) {
            dsale.innerHTML = -percent.toFixed(0) + "%";
          }
        }
      } else {
        dsale?.remove();
      }
      if (pre_order && show_pre_order) {
        if (!dpreorder) {
          var elementpo = document.createElement("div");
          elementpo.classList.add(
            "product__badges-pre-order",
            "product__badges-inner",
            "py-8",
            "px-15",
            "align-self-start",
            "pre-order",
            "inline-flex",
            "content-center",
            "subheading_weight",
            "btn-rounded",
            "lh-normal",
            "text-center"
          );
          elementpo.style.setProperty("--badges-color", preOrderColor);
          elementpo.style.setProperty("--badges-bg", preOrderBg);
          elementpo.innerHTML = window.variantStrings.preOrder
            ? window.variantStrings.preOrder
            : "Pre-order";
          label.appendChild(elementpo);
        } else {
          dpreorder.innerHTML = window.variantStrings.preOrder
            ? window.variantStrings.preOrder
            : "Pre-order";
        }
      } else {
        dpreorder?.remove();
      }
      if (soldOut && show_sold_out) {
        if (!dsoldout) {
          var elementso = document.createElement("div");
          elementso.classList.add(
            "product__badges-sold-out",
            "product__badges-inner",
            "py-8",
            "px-15",
            "align-self-start",
            "sold-out",
            "inline-flex",
            "content-center",
            "subheading_weight",
            "btn-rounded",
            "lh-normal",
            "text-center"
          );
          elementso.style.setProperty("--badges-color", soldOutColor);
          elementso.style.setProperty("--badges-bg", soldOutBg);
          elementso.innerHTML = window.variantStrings.soldOut
            ? window.variantStrings.soldOut
            : "Sold out";
          label.appendChild(elementso);
        } else {
          dsoldout.innerHTML = window.variantStrings.soldOut
            ? window.variantStrings.soldOut
            : "Sold out";
        }
      } else {
        dsoldout?.remove();
      }
    }

    if (productBadgesScrolling && sale) {
      const dataBadgesScrolling =
        productBadgesScrolling?.dataset.textProductScrolling;
      const allProductBadgesScrolling = productBadgesScrolling.querySelectorAll(
        ".content-badges-scrolling"
      );
      allProductBadgesScrolling.forEach((content) => {
        content.innerText = dataBadgesScrolling.replace(
          "[percent_sale]",
          percent.toFixed(0) + "%"
        );
      });
    }
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(
      `quick-add-bundle-${this.dataset.section}`
    );
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    const buttonPayment = productForm.querySelector(
      ".product-dynamic-checkout"
    );
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute("disabled", "disabled");
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute("disabled");
      if (addButtonText) {
        addButtonText.textContent = window.variantStrings?.addToCartBundle;
      }
    }

    if (!modifyClass) return;
  }

  setUnavailable() {
    const button = document.getElementById(
      `quick-add-bundle-${this.dataset.section}`
    );
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    if (!addButton) return;
    addButtonText.textContent = window.variantStrings?.unavailable;
    if (price) price.classList.add("visibility-hidden");
  }

  setAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      if (listOfAvailableOptions.includes(input.dataset.value)) {
        input.classList.remove("option-disabled");
      } else {
        input.classList.add("option-disabled");
      }
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.getVariantData().filter(
      (variant) =>
        this.querySelector(".active").dataset.value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll(".product-form__input")];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll(".option-swatch-js")];
      const previousOptionSelected =
        inputWrappers[index - 1].querySelector(".active").dataset.value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter(
          (variant) =>
            variant.available &&
            variant[`option${index}`] === previousOptionSelected
        )
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  getVariantData() {
    this.variantData =
      this.variantData ||
      JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }

  variantHover(e) {
    const productTarget = e.closest(".product-item");
    if (!productTarget) return;

    const swiperElement = e.closest(".swiper");
    if (!swiperElement) return;

    let timeout;

    const handleMouseOut = () => {
      swiperElement.classList.remove("show-tooltip");
    };

    const handleMouseOver = () => {
      swiperElement.classList.add("show-tooltip");
    };

    e.addEventListener("mouseout", handleMouseOut, false);
    e.addEventListener("mouseover", handleMouseOver, false);
    e.addEventListener("mouseenter", handleMouseOver, false);
    e.addEventListener("mouseleave", handleMouseOut, false);
  }
}
customElements.define("variant-radios-bundle", VariantRadiosBundle);

if (!customElements.get("product-form-bundle")) {
  customElements.define(
    "product-form-bundle",
    class ProductForm extends PopupBase {
      constructor() {
        super();
        this.form = this.querySelector("form");
        this.form.querySelector("[name=id]").disabled = false;
        this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
        this.cart =
          document.querySelector("cart-notification") ||
          document.querySelector("cart-drawer");
        this.submitButton = this.querySelector('[type="submit"]');
        this.hideErrors = this.dataset.hideErrors === "true";
        this.productItem =
          this.form.closest(".product-item") ||
          this.form.closest("sticky-add-cart");
      }

      updateBundleButtonStatus() {
        const productFormBundle = this.closest("product-form-bundle");
        const minimum = productFormBundle.dataset.minimum;
        const maximum = productFormBundle.dataset.maximum;
        const submitButton = document.querySelector("button-submit-bundle");
        if (!submitButton) return;

        const bundleItems = document.querySelectorAll(
          "[data-product-bundle-variant][data-variant-id]"
        );
        if (bundleItems.length >= minimum) {
          submitButton.classList.remove("disabled");
        } else {
          submitButton.classList.add("disabled");
        }
        const btnAddCart = this.closest("product-bundle").querySelectorAll(
          "product-form-bundle button"
        );
        if (bundleItems.length >= maximum) {
          btnAddCart.forEach((btn) => {
            btn.classList.add("disabled");
          });
        }
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute("aria-disabled") === "true") return;

        this.handleErrorMessage();

        this.submitButton.classList.add("disabled");
        this.submitButton.textContent =
          window.variantStrings?.addedToCartBundle;

        const formData = new FormData(this.form);
        const variantId = formData.get("id");
        const quantity = formData.get("quantity") || 1;
        const productHandle = this.dataset.handle || this.dataset.productHandle;

        fetch(
          `/products/${productHandle}?section_id=bundle-item&variant=${variantId}`
        )
          .then((response) => response.text())
          .then((responseText) => {
            const doc = parser.parseFromString(responseText, "text/html");
            const bundleContainers = document.querySelectorAll(
              "[data-product-bundle-variant]"
            );
            if (!bundleContainers.length) {
              console.error("No bundle container found");
              return;
            }

            let existingItemContainer = null;
            for (const container of bundleContainers) {
              if (container.getAttribute("data-variant-id") === variantId) {
                existingItemContainer = container;
                break;
              }
            }

            if (existingItemContainer) {
              const currentQty = parseInt(
                existingItemContainer.getAttribute("data-quantity") || 0
              );
              existingItemContainer.setAttribute(
                "data-quantity",
                currentQty + parseInt(quantity)
              );

              const quantityDisplay = existingItemContainer.querySelector(
                ".bundle-item-quantity"
              );
              if (quantityDisplay) {
                quantityDisplay.textContent = currentQty + parseInt(quantity);
              }

              existingItemContainer.classList.add("flash-highlight");
              setTimeout(() => {
                existingItemContainer.classList.remove("flash-highlight");
              }, 1500);
            } else {
              let targetContainer = null;
              for (const container of bundleContainers) {
                if (!container.hasAttribute("data-variant-id")) {
                  targetContainer = container;
                  break;
                }
              }

              if (!targetContainer) {
                this.handleErrorMessage(
                  "Bundle is full. Please remove an item first."
                );
                return;
              }

              const bundleImage = doc.querySelector(".bundle-image");
              const bundleContent = doc.querySelector(".bundle-content");
              const bundleRemoveButton = doc.querySelector(
                "bundle-cart-remove-button"
              );

              if (!bundleImage || !bundleContent) {
                console.error("Missing required elements in response", {
                  bundleImage,
                  bundleContent,
                });
                this.handleErrorMessage("Error processing product data");
                return;
              }

              targetContainer.setAttribute("data-variant-id", variantId);
              targetContainer.setAttribute("data-quantity", quantity);
              targetContainer.classList.add("bundle-item-dev");

              const mediaContainer = targetContainer.querySelector(
                "[data-product-bundle-variant-media]"
              );
              if (mediaContainer && bundleImage) {
                mediaContainer.classList.remove("skeleton");
                mediaContainer.innerHTML = bundleImage.innerHTML;
              }

              const contentContainer = targetContainer.querySelector(
                "[data-product-bundle-variant-content]"
              );
              if (contentContainer && bundleContent) {
                contentContainer
                  .querySelectorAll(".horizontal-product__skeleton")
                  .forEach((el) => el.remove());

                contentContainer.innerHTML = bundleContent.innerHTML;
                let bundleActionContainer =
                  targetContainer.querySelector(".bundle-action");
                if (!bundleActionContainer) {
                  bundleActionContainer = document.createElement("div");
                  bundleActionContainer.classList.add("bundle-action");
                  targetContainer.appendChild(bundleActionContainer);
                }
                if (bundleRemoveButton) {
                  const existingButtons =
                    bundleActionContainer.querySelectorAll(
                      "bundle-cart-remove-button"
                    );
                  existingButtons.forEach((button) => button.remove());
                  const removeButtonHTML = bundleRemoveButton.outerHTML;

                  bundleActionContainer.insertAdjacentHTML(
                    "beforeend",
                    removeButtonHTML
                  );

                  const newRemoveButton = bundleActionContainer.querySelector(
                    "bundle-cart-remove-button:last-child"
                  );

                  if (newRemoveButton) {
                    newRemoveButton.addEventListener("click", () => {
                      const _this = this;
                      targetContainer.removeAttribute("data-variant-id");
                      targetContainer.removeAttribute("data-quantity");

                      if (mediaContainer) {
                        mediaContainer.innerHTML = "";
                      }

                      if (contentContainer) {
                        contentContainer.innerHTML = `
                                                <span class="horizontal-product__skeleton skeleton-1"></span>
                                                <span class="horizontal-product__skeleton skeleton-2"></span>
                                                <span class="horizontal-product__skeleton skeleton-3"></span>
                                              `;
                      }
                      _this.submitButton.classList.remove("disabled");
                      _this.submitButton.textContent =
                        window.variantStrings?.addToCartBundle;
                      _this.updateContainerOrders();
                      _this.updateBundleTotal();
                      document.dispatchEvent(
                        new CustomEvent("bundle:item-changed")
                      );
                      const bundleItems = document.querySelectorAll(
                        "[data-product-bundle-variant][data-variant-id]"
                      );
                      const maximum = _this.closest("product-form-bundle")
                        .dataset.maximum;
                      if (bundleItems.length < maximum) {
                        const btnAddCart = _this
                          .closest("product-bundle")
                          .querySelectorAll(
                            "product-form-bundle button.disabled"
                          );
                        btnAddCart.forEach((btn) => {
                          const productForm = btn.closest(
                            "product-form-bundle"
                          );
                          const productId =
                            productForm.querySelector('input[name="id"]').value;
                          const isInBundle = Array.from(bundleItems).some(
                            (item) =>
                              item.getAttribute("data-variant-id") === productId
                          );
                          if (!isInBundle) {
                            btn.classList.remove("disabled");
                          }
                        });
                      }
                      _this.updateBundleButtonStatus();
                    });
                  }
                }
              }

              targetContainer.classList.add("flash-highlight");
              setTimeout(() => {
                targetContainer.classList.remove("flash-highlight");
              }, 1500);
            }

            this.form.reset();
            this.updateBundleTotal();
          })
          .catch((error) => {
            console.error("Error adding product to bundle:", error);
            this.handleErrorMessage("Could not add product to bundle");
          })
          .finally(() => {
            // this.submitButton.classList.remove('disabled');
            document.dispatchEvent(new CustomEvent("bundle:item-changed"));
            this.updateBundleButtonStatus();
          });
      }

      updateContainerOrders() {
        const bundleContainers = document.querySelectorAll(
          "[data-product-bundle-variant]"
        );

        bundleContainers.forEach((container) => {
          container.style.order = "";
        });

        let filledCount = 0;
        let emptyCount = 0;

        bundleContainers.forEach((container, index) => {
          if (container.hasAttribute("data-variant-id")) {
            container.style.order = filledCount.toString();
            filledCount++;
          } else {
            container.style.order = (
              bundleContainers.length + emptyCount
            ).toString();
            emptyCount++;
          }
        });
      }

      updateBundleTotal() {
        let totalPrice = 0;
        let itemTotalPrice = 0;
        const bundleItems = document.querySelectorAll(
          "[data-product-bundle-variant][data-variant-id]"
        );
        bundleItems.forEach((item) => {
          const priceElement = item.querySelector(".price-item--regular");
          const price = priceElement?.dataset.price;
          const quantity = parseInt(item.getAttribute("data-quantity")) || 1;
          itemTotalPrice += price * quantity;
          totalPrice = Shopify.formatMoney(
            itemTotalPrice,
            cartStrings?.money_format
          );
        });
        const totalElement = document.querySelector(".subtotal-price__bundle");
        if (itemTotalPrice > 0) {
          totalElement.textContent = totalPrice;
        } else {
          totalElement.textContent = Shopify.formatMoney(
            0,
            cartStrings?.money_format
          );
        }
      }

      getMainCartSectionRender() {
        return [
          {
            id: "main-cart-items",
            section: document.getElementById("main-cart-items")?.dataset.id,
            selector: ".js-contents",
          },
        ];
      }

      getSectionInnerHTML(html, selector) {
        return new DOMParser()
          .parseFromString(html, "text/html")
          .querySelector(selector).innerHTML;
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector(".product-form__error-message-wrapper");
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector(
            ".product-form__error-message"
          );

        this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      handleErrorMessagePopup(errorMessage = false) {
        const url = `${window.location.pathname}?section_id=form-message`;
        fetch(url)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(
              responseText,
              "text/html"
            );
            const elementErrorMessage = html.querySelector(
              ".product-form__error-message-wrapper"
            );
            const elementMessage = elementErrorMessage.querySelector(
              ".product-form__error-message"
            );
            elementMessage.textContent = errorMessage;
            showToast(elementErrorMessage.innerHTML, 3000, "modal-error");
          })
          .catch((e) => {
            throw e;
          });
      }
    }
  );
}

class QuantityInputBundle extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector("input");
    this.changeEvent = new Event("change", { bubbles: true });

    this.previousValue = parseInt(this.input.value) || 1;

    this.input.addEventListener("change", this.onInputChange.bind(this));
    this.querySelectorAll("button").forEach((button) =>
      button.addEventListener("click", this.onButtonClick.bind(this))
    );
  }

  onInputChange() {
    this.updateBundleQuantity();
  }

  onButtonClick(event) {
    event.preventDefault();
    this.previousValue = parseInt(this.input.value);

    event.target.name === "plus" ||
    event.target.closest("button").name === "plus"
      ? this.input.stepUp()
      : this.input.stepDown();

    if (this.previousValue !== parseInt(this.input.value)) {
      this.input.dispatchEvent(this.changeEvent);
      this.updateBundleQuantity();
    }
  }

  updateBundleQuantity() {
    const bundleContainer = this.closest("[data-product-bundle-variant]");
    if (!bundleContainer) return;

    const currentValue = parseInt(this.input.value) || 1;
    bundleContainer.setAttribute("data-quantity", currentValue);

    this.updateBundleTotal();
  }

  updateBundleTotal() {
    let itemTotalPrice = 0;
    const bundleItems = document.querySelectorAll(
      "[data-product-bundle-variant][data-variant-id]"
    );

    bundleItems.forEach((item) => {
      const priceElement = item.querySelector(".price-item--regular");
      if (!priceElement || !priceElement.dataset.price) return;

      const price = parseFloat(priceElement.dataset.price);
      const quantity = parseInt(item.getAttribute("data-quantity")) || 1;

      if (!isNaN(price) && !isNaN(quantity)) {
        itemTotalPrice += price * quantity;
      }
    });

    const totalElement = document.querySelector(".subtotal-price__bundle");
    if (totalElement) {
      if (itemTotalPrice > 0) {
        totalElement.textContent = Shopify.formatMoney(
          itemTotalPrice,
          cartStrings?.money_format
        );
      } else {
        totalElement.textContent = Shopify.formatMoney(
          0,
          cartStrings?.money_format
        );
      }
    }
  }
}

customElements.define("quantity-input-bundle", QuantityInputBundle);

class ButtonSubmitBundle extends HTMLElement {
  constructor() {
    super();
    this.submitButton = this;
    this.addEventListener("click", this.onSubmitHandler.bind(this));
    this.minimum = this.dataset.minimum;
    this.maximum = this.dataset.maximum;
  }

  onSubmitHandler(evt) {
    evt.preventDefault();

    if (this.classList.contains("loading")) return;

    this.classList.add("loading");
    this.setAttribute("disabled", "");
    this.querySelector("span").textContent =
      window.variantStrings?.addingToCart || "Adding to cart...";

    const bundleItems = document.querySelectorAll(
      "[data-product-bundle-variant][data-variant-id]"
    );

    if (!bundleItems.length) {
      this.handleErrorMessagePopup("Please add products to your bundle first");
      this.resetButton();
      return;
    }

    const items = Array.from(bundleItems).map((item) => {
      return {
        id: item.getAttribute("data-variant-id"),
        quantity: parseInt(item.getAttribute("data-quantity")) || 1,
      };
    });

    this.addItemsToCart(items);
  }

  addItemsToCart(items) {
    this.cart =
      document.querySelector("cart-notification") ||
      document.querySelector("cart-drawer");

    const formData = {
      items: items,
      sections: this.cart
        ? this.cart.getSectionsToRender().map((section) => section.id)
        : [],
      sections_url: window.location.pathname,
    };

    fetch(`${routes?.cart_add_url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => response.json())
      .then((response) => {
        if (response.status) {
          this.handleErrorMessagePopup(response.description);
          return;
        } else if (response.errors) {
          this.handleErrorMessagePopup(response.errors);
          return;
        }

        this.updateCartCount();

        this.clearBundle();

        if (this.cart) {
          this.updateCartSections(response);
        }

        if (this.cart) {
          this.cart.open();
        } else {
          window.location = window.routes.cart_url;
        }
      })
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        this.resetButton();
      });
  }

  updateCartCount() {
    fetch("/cart.json")
      .then((res) => res.json())
      .then((cart) => {
        if (cart.item_count !== undefined) {
          document.querySelectorAll(".cart-count").forEach((el) => {
            if (el.classList.contains("cart-count-drawer")) {
              el.innerHTML = `(${cart.item_count})`;
            } else {
              el.innerHTML = cart.item_count > 100 ? "~" : cart.item_count;
            }
          });

          if (document.querySelector("header-total-price")) {
            document.querySelector("header-total-price").updateTotal(cart);
          }

          const cartFreeShip = document.querySelector("free-ship-progress-bar");
          if (cartFreeShip) {
            cartFreeShip.init(cart.items_subtotal_price);
          }
        }
      })
      .catch((error) => {
        console.error("Error updating cart count:", error);
      });
  }

  updateCartSections(response) {
    this.cart.getSectionsToRender().forEach((section) => {
      const elementToReplace = document.getElementById(section.id);
      const html = new DOMParser().parseFromString(
        response.sections[section.id],
        "text/html"
      );

      if (elementToReplace) {
        const incoming = html.querySelector("#minicart-form");
        if (incoming && !window.materiaPatchDrawerCart?.(elementToReplace,incoming)) elementToReplace.innerHTML = incoming.innerHTML;
      }
    });

    if (this.cart && typeof this.cart.cartAction === "function") {
      this.cart.cartAction();
    }
  }

  clearBundle() {
    const bundleContainers = document.querySelectorAll(
      "[data-product-bundle-variant]"
    );
    bundleContainers.forEach((container) => {
      container.removeAttribute("data-variant-id");
      container.removeAttribute("data-quantity");

      const mediaContainer = container.querySelector(
        "[data-product-bundle-variant-media]"
      );
      if (mediaContainer) {
        mediaContainer.innerHTML = "";
      }

      const contentContainer = container.querySelector(
        "[data-product-bundle-variant-content]"
      );
      if (contentContainer) {
        contentContainer.innerHTML = `
          <span class="horizontal-product__skeleton skeleton-1"></span>
          <span class="horizontal-product__skeleton skeleton-2"></span>
          <span class="horizontal-product__skeleton skeleton-3"></span>
        `;
      }

      const actionContainer = container.querySelector(".bundle-action");
      if (actionContainer) {
        actionContainer.innerHTML = "";
      }
    });

    const totalElement = document.querySelector(".subtotal-price__bundle");
    if (totalElement) {
      totalElement.textContent = Shopify.formatMoney(
        0,
        cartStrings?.money_format
      );
    }

    this.updateButtonStatus();
    document.dispatchEvent(new CustomEvent("bundle:item-changed"));
  }

  handleErrorMessagePopup(errorMessage = false) {
    const url = `${window.location.pathname}?section_id=form-message`;
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, "text/html");
        const elementErrorMessage = html.querySelector(
          ".product-form__error-message-wrapper"
        );
        const elementMessage = elementErrorMessage.querySelector(
          ".product-form__error-message"
        );
        elementMessage.textContent = errorMessage;
        showToast(elementErrorMessage.innerHTML, 3000, "modal-error");
      })
      .catch((e) => {
        throw e;
      });
  }

  resetButton() {
    this.classList.remove("loading");
    this.removeAttribute("disabled");
    this.querySelector("span").textContent =
      window.variantStrings?.addAllToCart || "Add all to cart";
    this.updateButtonStatus();
  }

  updateButtonStatus() {
    const bundleItems = document.querySelectorAll(
      "[data-product-bundle-variant][data-variant-id]"
    );
    const sectionId = this.dataset.sectionId;
    const bundleBtnAddCart = document.querySelectorAll(
      `#product-bundle-${sectionId} product-form-bundle button`
    );
    bundleBtnAddCart.forEach((button) => {
      if (button.classList.contains("disabled")) {
        button.classList.remove("disabled");
      }
    });
    let itemCount = 0;
    if (bundleItems.length > 0) {
      itemCount = bundleItems.length + 1;
    }

    if (itemCount >= this.minimum) {
      this.classList.remove("disabled");
    } else {
      this.classList.add("disabled");
    }
  }
}

customElements.define("button-submit-bundle", ButtonSubmitBundle);

class ProgressBundleBar extends HTMLElement {
  constructor() {
    super();
    this.minimum = parseInt(this.dataset.minimum) || 1;
    this.updateBundleProgress();

    document.addEventListener("bundle:item-changed", () =>
      this.updateBundleProgress()
    );
  }

  updateBundleProgress() {
    const bundleItems = Array.from(
      this.closest("sticky-element").querySelectorAll(
        "[data-product-bundle-variant][data-variant-id]"
      )
    );
    const itemCount = bundleItems.length;

    let progressPercentage;
    if (itemCount >= this.minimum) {
      progressPercentage = 100;
    } else {
      progressPercentage = (itemCount / this.minimum) * 100;
    }

    this.style.setProperty("--progress-width", `${progressPercentage}%`);

    if (progressPercentage >= 100) {
      this.classList.add("complete");
    } else {
      this.classList.remove("complete");
    }
  }
}

customElements.define("progress-bundle-bar", ProgressBundleBar);

if (!customElements.get("product-form-quick-edit")) {
  customElements.define(
    "product-form-quick-edit",
    class ProductForm extends HTMLElement {
      constructor() {
        super();
        this.form = this.querySelector("form");
        this.form.querySelector("[name=id]").disabled = false;
        this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
        this.cart =
          document.querySelector("cart-notification") ||
          document.querySelector("cart-drawer");
        this.submitButton = this.querySelector('[type="submit"]');
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        this.submitButton.setAttribute("disabled", true);
        this.submitButton.classList.add("loading");
        const cartRecommend = document.querySelector(".cart-recommend");
        if (cartRecommend && cartRecommend.classList.contains("open")) {
          cartRecommend.classList.remove("open");
        }
        const quick = document.getElementById("product-form-quick-edit");
        const id = quick.getAttribute("data-line");
        const quantity = 0;
        const config_change = fetchConfig("json");
        config_change.body = JSON.stringify({
          id,
          quantity,
        });
        fetch(`${routes?.cart_change_url}`, config_change)
          .then((response) => {
            return response.text();
          })
          .catch((e) => {
            throw e;
          })
          .finally(() => {
            this.addCartAdd();
          });
      }

      addCartAdd() {
        const config = fetchConfig("json");
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        delete config.headers["Content-Type"];
        const formData = new FormData(this.form);
        if (this.cart) {
          formData.append(
            "sections",
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append("sections_url", window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;
        fetch(`${routes?.cart_add_url}`, config)
          .then((response) => {
            return response.text();
          })
          .then((state) => {
            this.submitButton.setAttribute("disabled", true);
            this.submitButton.querySelector("span").classList.add("hidden");
            fetch("/cart.json")
              .then((res) => res.json())
              .then((cart) => {
                if (cart.item_count != undefined) {
                  document.querySelectorAll(".cart-count").forEach((el) => {
                    if (el.classList.contains("cart-count-drawer")) {
                      el.innerHTML = `(${cart.item_count})`;
                    } else {
                      el.innerHTML =
                        cart.item_count > 100 ? "~" : cart.item_count;
                    }
                  });
                  if (document.querySelector("header-total-price")) {
                    document
                      .querySelector("header-total-price")
                      .updateTotal(cart);
                  }
                  const cart_free_ship = document.querySelector(
                    "free-ship-progress-bar"
                  );
                  if (cart_free_ship) {
                    cart_free_ship.init(cart.items_subtotal_price);
                  }
                }
              })
              .catch((error) => {
                throw error;
              });
            const parsedState = JSON.parse(state);
            if (!parsedState.errors) {
              this.cart.getSectionsToRender().forEach((section) => {
                const elementToReplace = document.getElementById(section.id);
                const html = new DOMParser().parseFromString(
                  parsedState.sections[section.id],
                  "text/html"
                );
                const incoming = html.querySelector("#minicart-form");
                if (incoming && !window.materiaPatchDrawerCart?.(elementToReplace,incoming)) elementToReplace.innerHTML = incoming.innerHTML;
              });
              if (this.cart && typeof this.cart.cartAction === "function") {
                this.cart.cartAction();
              }
              document.querySelector(".tingle-modal__close").click();
            } else {
              this.submitButton.removeAttribute("disabled");
              this.submitButton.classList.remove("loading");
              this.submitButton
                .querySelector("span")
                .classList.remove("hidden");
              this.updateMessageQuickErrors(parsedState.errors);
            }
          })
          .catch((e) => {
            throw e;
          })
          .finally(() => {
            BlsLazyloadImg.init();
            this.submitButton.removeAttribute("disabled");
            this.submitButton.querySelector("span").classList.remove("hidden");
            this.cart.open();
            const cartRecommend = document.querySelector(".cart-recommend");
            if (
              cartRecommend &&
              !cartRecommend.classList.contains("hidden-recommend")
            ) {
              if (cartRecommend.classList.contains("cart-recommend-custom")) {
                const cartUpsellItem =
                  document.querySelectorAll(".cart-upsell-item");
                const cartUpsellSlide = document.querySelectorAll(
                  ".swiper-cart-upsell .swiper-slide"
                );

                if (cartUpsellItem.length > 0) {
                  requestAnimationFrame(function () {
                    if (cartRecommend.isConnected) cartRecommend.classList.add("open");
                  });
                } else if (cartUpsellSlide.length === 0) {
                  cartRecommend.classList.remove("block");
                  cartRecommend.classList.add("hidden");
                }
              } else {
                requestAnimationFrame(function () {
                  if (cartRecommend.isConnected) cartRecommend.classList.add("open");
                });
              }
            }
          });
      }

      updateMessageQuickErrors(message) {
        this.querySelector(".cart-item__error-text").textContent = message;
      }
    }
  );
}

class ShowPassWord extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    this.addEventListener("click", this.onClick.bind(this));
  }
  onClick() {
    var input = this.closest(".form-field").querySelector("input");
    if (input.type === "password") {
      input.type = "text";
      this.classList.add("text");
    } else {
      input.type = "password";
      this.classList.remove("text");
    }
  }
}
customElements.define("show-pass-word", ShowPassWord);

class BeforeYouLeave extends HTMLElement {
  constructor() {
    super();
    setTimeout(() => {
      this.init();
    }, 10000);
  }
  init() {
    const sectionId = this.dataset.sectionId;
    const before_you_leave = document.querySelector(`#${sectionId}`).innerHTML;
    document.querySelector("before-you-leave").innerHTML = before_you_leave;
    setTimeout(() => {
      this.initPopup();
      BlsLazyloadImg.init();
    }, 500);
  }
  initPopup() {
    const element = document.querySelector("before-you-leave");
    const delay = element?.dataset.timeDelay;
    var action = 0;
    if (element !== null) {
      var getPopup = setTimeout(() => {
        getTimeOut();
      }, (delay - 10) * 1000);

      const addMultipleListeners = (
        el,
        types,
        listener,
        options,
        useCapture
      ) => {
        types.forEach((type) =>
          el.addEventListener(type, listener, options, useCapture)
        );
      };

      addMultipleListeners(
        document.querySelector("body"),
        ["scroll", "click", "mousemove", "keydown"],
        () => {
          setAction();
        }
      );
      const closeBefore = document.querySelectorAll(".close-before");
      closeBefore.forEach((event) => {
        event.addEventListener("click", () => {
          clearTimeout(getPopup);
          element.classList.remove("open");
          document.documentElement.classList.remove("open-byl");
          setTimeout(() => {
            document.documentElement.classList.remove("open-drawer");
            root.style.removeProperty("padding-right");
          }, 550);
        });
      });

      function getTimeOut() {
        action = action + 1;
        if (action >= 1) {
          document.documentElement.classList.add("open-drawer", "open-byl");
          root.style.setProperty(
            "padding-right",
            getScrollBarWidth.init() + "px"
          );
          element.classList.add("open");
          const cp = element.querySelectorAll(".discount");
          if (cp !== null) {
            cp.forEach((e) => {
              e.addEventListener("click", (el) => {
                el.preventDefault();
                navigator.clipboard.writeText(e?.dataset.code);
                e.classList.add("action-copy");
                setTimeout(() => {
                  e.classList.remove("action-copy");
                }, 1500);
              });
            });
          }
        }
      }
      function setAction() {
        action = action - 1;
      }
    }
  }
}
customElements.define("before-you-leave", BeforeYouLeave);

class MiniCartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", (event) => {
      event.preventDefault();
      try {
        /* Defensive everything. The previous version threw on:
           - localStorage("materia__wishlist-items") containing corrupt
             JSON (e.g. from a partial write) → JSON.parse throws on
             every subsequent click until the user clears storage or
             reloads. THIS was the "drawer bugs, need to refresh"
             pattern.
           - this.closest(".cart-item") returning null mid-section
             swap → reading .querySelector(...).style throws.
           - this.closest("cart-notification") returning null when the
             cart UI variant uses cart-drawer → .updateQuantity is
             called on null → TypeError.
           One try/catch around everything turns hard failures into a
           console warning, so the click handler stays alive on every
           subsequent click. */
        let wishlist_items = null;
        const raw = localStorage.getItem("materia__wishlist-items");
        if (raw) {
          try {
            wishlist_items = JSON.parse(raw);
          } catch (_) {
            // Storage was corrupt — clear it so we don't keep retrying.
            try { localStorage.removeItem("materia__wishlist-items"); } catch (_) {}
            wishlist_items = null;
          }
        }
        const productHandle = this.dataset.productHandle;
        const index = wishlist_items && Array.isArray(wishlist_items)
          ? wishlist_items.indexOf(productHandle)
          : undefined;

        const cartItems =
          this.closest("cart-notification") ||
          this.closest("cart-drawer") ||
          document.querySelector("cart-notification") ||
          document.querySelector("cart-drawer");

        if (this.classList.contains("action-add-wishlist") && (index === -1 || index === undefined)) {
          const item = this.closest(".cart-item");
          const wishlistEl = item && item.querySelector(".minicart__wishlist");
          const infoEl     = item && item.querySelector(".minicart__product-info");
          if (wishlistEl) wishlistEl.style.display = "block";
          if (infoEl)     infoEl.style.display = "none";
          return;
        }

        if (cartItems && typeof cartItems.updateQuantity === "function") {
          cartItems.updateQuantity(this.dataset.index, 0);
        } else {
          console.warn(
            "[cart] remove-button could not find a cart container; falling back to /cart/change.js"
          );
          // Fallback: post directly so the line is removed even if the
          // cart-notification element isn't reachable for any reason.
          fetch("/cart/change.js", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: JSON.stringify({ id: this.dataset.index, quantity: 0 }),
          })
            .then(() => window.location.reload())
            .catch(() => {});
        }
      } catch (err) {
        console.warn("[cart] remove-button click failed safely", err);
      }
    });
  }
}
customElements.define("mini-cart-remove-button", MiniCartRemoveButton);

class MiniCartWishlistAction extends HTMLElement {
  constructor() {
    super();
    this.actionRemoveWishlist();
    this.actionAddWishlist();
    this.actionClose();
  }

  actionRemoveWishlist() {
    this.querySelector(".btn-minicart__remove-js").addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        const target = event.currentTarget;
        this.eventRemove(target);
      }
    );
  }

  actionAddWishlist() {
    this.querySelector(".btn-minicart__add-wishlist-js").addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        const target = event.currentTarget;
        /* Saved through the one wishlist store: the header count and every
           heart on the page update with it. */
        if (target.dataset.productId) MateriaWishlist.add(target.dataset.productId);
        this.eventRemove(target);
      }
    );
  }

  eventRemove(target) {
    const cartItems = document.querySelector("cart-notification");
    cartItems.updateQuantity(target.dataset.index, 0);
  }

  actionClose() {
    document.querySelectorAll(".cart-close-wishlist").forEach((items) => {
      items.addEventListener("click", (e) => {
        const target = e.currentTarget;
        e.preventDefault();
        target
          .closest(".cart-item")
          .querySelector(".minicart__wishlist").style.display = "none";
        target
          .closest(".cart-item")
          .querySelector(".minicart__product-info").style.display = "block";
      });
    });
  }
}
customElements.define("minicart-wishlist-action", MiniCartWishlistAction);

class CookieBar extends HTMLElement {
  constructor() {
    super();
    this.init();
  }
  init() {
    var _this = this;
    if (!getCookie("cookie_bar")) {
      this.classList.remove("hidden");
    }
    this.querySelectorAll(".cookie-dismiss").forEach((closeCookie) => {
      closeCookie.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          const target = e.currentTarget;
          _this.remove();
          if (target.id == "cookie-refuse") {
            setCookie("cookie_bar", "dismiss", 7);
          } else {
            setCookie("cookie_bar", "dismiss", 30);
          }
        },
        false
      );
    });
  }
}
customElements.define("cookie-bar", CookieBar);

class TermsConditions extends PopupBase {
  constructor() {
    super();
    this.init();
  }
  init() {
    const terms = this.querySelector("a");
    if (terms) {
      terms.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const popup = document.querySelector("#popup-terms-conditions");
        if (popup) {
          const header = popup.getAttribute("data-text");
          this.initPopup(
            popup.querySelector(".terms-conditions-content").outerHTML,
            `<h3 class="title-popup h5 my-0 px-20 px-md-30 py-20 border-bottom">${header}</h3>`
          );
          target.href = "javascript: (function(){})();";
          target.target = "_self";
        }
      });
    }
    const conditions =
      this.querySelector(".conditions_form_minicart") ||
      this.querySelector(".conditions_form_product");
    const bpb = document.querySelector(".btn-checkout");
    const dynamicCheckout = this.closest("product-form")?.querySelector(
      ".btn-checkout-dynamic"
    );
    if (conditions) {
      if (getCookie("term_conditions")) {
        conditions.setAttribute("checked", "");
        if (bpb) {
          bpb.removeAttribute("disabled");
        }
        if (dynamicCheckout) {
          dynamicCheckout.classList.remove("disabled");
        }
      }
      conditions.addEventListener("change", (event) => {
        if (bpb) {
          if (event.currentTarget.checked) {
            bpb.removeAttribute("disabled");
            setCookie("term_conditions", 1, 1);
          } else {
            bpb.setAttribute("disabled", "");
            deleteCookie("term_conditions");
          }
        }
        if (dynamicCheckout) {
          if (event.currentTarget.checked) {
            dynamicCheckout.classList.remove("disabled");
            setCookie("term_conditions", 1, 1);
          } else {
            dynamicCheckout.classList.add("disabled");
            deleteCookie("term_conditions");
          }
        }
      });
    }
  }
}
customElements.define("terms-conditions", TermsConditions);

class QuickView extends PopupBase {
  constructor() {
    super();
    this.html = null;
  }

  onThisClick() {
    this.classList.add("loading");
    fetch(this.url)
      .then((response) => response.text())
      .then((text) => {
        this.html = parser
          .parseFromString(text, "text/html")
          .querySelector(
            "#shopify-section-product-quickview .product-quickview__content"
          );
        if (!this.html) return;
        // Load scripts in the HTML content
        this.loadScripts(this.html);
        this.html.classList.remove("hidden");
        this.initPopup(this.html);
      })
      .finally(() => {
        Shopify.PaymentButton.init();
        if (!document.querySelector('div[data-animation="slide_in"')) {
          BlsLazyloadImg.init();
        }
        this.classList.remove("loading");
      })
      .catch((e) => {
        this.classList.remove("loading");
        console.error(e);
      });
  }

  loadScripts(html) {
    const scripts = html.querySelectorAll("script");
    scripts.forEach((script) => {
      const newScript = document.createElement("script");
      newScript.src = script.src;
      newScript.textContent = script.textContent;
      document.body.appendChild(newScript).parentNode.removeChild(newScript);
    });
  }
}

class ButtonQuickView extends QuickView {
  constructor() {
    super();
    this.url = this.dataset.url;
    this.init();
  }

  init() {
    this.addEventListener("click", this.onThisClick.bind(this));
  }
}
customElements.define("button-quickview", ButtonQuickView);

class ButtonSelectOptions extends QuickView {
  constructor() {
    super();
    this.url = this.dataset.url;
    this.init();
  }

  init() {
    this.addEventListener("click", this.onThisClick.bind(this));
  }
}
customElements.define("select-option", ButtonSelectOptions);

class ButtonWishlist extends HTMLElement {
  static get observedAttributes() { return ['data-product-id']; }

  attributeChangedCallback() {
    this.productId = (this.dataset.productId || '').trim();
    this.hidden = !this.productId;
    this.setAttribute('aria-disabled', this.productId ? 'false' : 'true');
    if (!this.productId) this.setAttribute('tabindex', '-1');
    else if (this.isConnected) this.connectedCallback();
  }

  constructor() {
    super();
    this.productId = this.dataset.productId;
    this.action = this.dataset.action || "remove";
    this.addTooltip = this.dataset.tooltipAdd || "Add to wishlist";
    this.removeTooltip = this.dataset.tooltipRemove || "Remove from wishlist";
    this.redirectTooltip = this.dataset.tooltipRedirect || "Browse wishlist";
    this.tooltipDiv = this.querySelector(".tooltip-content");
    this.init();
  }

  init() {
    this.addEventListener("click", this.onThisClick.bind(this));
    /* A custom element is not a button: Enter and Space press it. */
    this.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      this.click();
    });
  }

  connectedCallback() {
    this.productId = (this.dataset.productId || '').trim();
    this.hidden = !this.productId;
    this.setAttribute('aria-disabled', this.productId ? 'false' : 'true');
    if (!this.productId) { this.setAttribute('tabindex', '-1'); return; }
    this.setAttribute('tabindex', '0');
    if (!this.hasAttribute("role")) this.setAttribute("role", "button");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "0");
    if (!this.hasAttribute("aria-label") && this.dataset.tooltipAdd) this.setAttribute("aria-label", this.dataset.tooltipAdd);
    const on = MateriaWishlist.has(this.productId);
    this.classList.toggle("active", on);
    if (!this.hasAttribute("data-wishlist-remove")) this.setAttribute("aria-pressed", on ? "true" : "false");
    if (this.tooltipDiv) this.tooltipDiv.textContent = on ? (this.action === "remove" ? this.removeTooltip : this.redirectTooltip) : this.addTooltip;
  }

  wishlistUrl() {
    const routes = window.routes || {};
    if (routes.wishlist_url) return routes.wishlist_url;
    const root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";
    return `${root}wishlist`;
  }

  onThisClick(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    this.productId = (this.dataset.productId || '').trim();
    if (!this.productId) return;
    const onPage = !!this.closest(".wishlist-page-main");
    if (MateriaWishlist.has(this.productId)) {
      /* The product page's heart can open the wishlist instead
         (Theme settings > Wishlist); card hearts and the wishlist page's
         remove button always take the product out. */
      if (this.action === "go_to_page" && !onPage) {
        window.location.href = this.wishlistUrl();
        return;
      }
      MateriaWishlist.remove(this.productId);
    } else {
      MateriaWishlist.add(this.productId);
      this.classList.remove("is-toggled");
      void this.offsetWidth;
      this.classList.add("is-toggled");
    }
  }
}
customElements.define("button-wishlist", ButtonWishlist);
document.addEventListener("animationend", (event) => {
  // The card plays the pop on the heart inside the button.
  const button = event.target && event.target.closest && event.target.closest("button-wishlist.is-toggled");
  if (button) button.classList.remove("is-toggled");
});

class ButtonCompare extends HTMLElement {
  constructor() {
    super();
    this.productId = this.dataset.productId;
    this.action = this.dataset.action || "remove";
    this.addTooltip = this.dataset.tooltipAdd || "Compare";
    this.removeTooltip = this.dataset.tooltipRemove || "Remove from compare";
    this.redirectTooltip = this.dataset.tooltipRedirect || "Browse compare";
    this.tooltipDiv = this.querySelector(".tooltip-content");
    this.action = this.dataset.action || "remove";
    this.init();
  }

  init() {
    this.initializeCompareStatus();
    this.addEventListener("click", this.onThisClick.bind(this));
  }

  initializeCompareStatus() {
    const localListProductIds = localStorage.getItem("materia__compare-items");
    if (!localListProductIds) return;
    const parseLocalListProductIds = JSON.parse(localListProductIds);
    const isProductIdContained = parseLocalListProductIds.includes(
      this.productId
    );
    if (isProductIdContained) {
      this.classList.add("active");
      if (this.tooltipDiv) {
        if (this.action === "remove") {
          this.tooltipDiv.textContent = this.removeTooltip;
        } else {
          this.tooltipDiv.textContent = this.redirectTooltip;
        }
      }
    }
  }

  actionWhenClicked(allThisProductIds, isAdd) {
    allThisProductIds.forEach((_this) => {
      if (isAdd === true) {
        _this.classList.add("active");
        const tooltipDiv = _this.querySelector(".tooltip-content");
        if (tooltipDiv) {
          if (this.action === "remove") {
            tooltipDiv.textContent = this.removeTooltip;
          } else {
            tooltipDiv.textContent = this.redirectTooltip;
          }
        }
      } else {
        const tooltipDiv = _this.querySelector(".tooltip-content");
        if (tooltipDiv) {
          tooltipDiv.textContent = this.addTooltip;
        }
        _this.classList.remove("active");
      }
    });
  }

  onThisClick() {
    const localListProductIds = localStorage.getItem("materia__compare-items");
    const allThisProductIds = document.querySelectorAll(
      `button-compare[data-product-id="${this.productId}"]`
    );
    let listProductIds = [];
    if (!this.productId) return;
    if (localListProductIds && allThisProductIds.length > 0) {
      // compare localstorage exists
      const parseLocalListProductIds = JSON.parse(localListProductIds);
      let isProductIdContained = parseLocalListProductIds.includes(
        this.productId
      );
      if (!isProductIdContained) {
        // case item is not in compare
        listProductIds.push(...parseLocalListProductIds, this.productId);
        this.actionWhenClicked(allThisProductIds, true);
      } else {
        // case item is in compare
        if (this.action) {
          if (this.action === "remove") {
            const indexOfProductId = parseLocalListProductIds.indexOf(
              this.productId
            );
            parseLocalListProductIds.splice(indexOfProductId, 1);
            listProductIds.push(...parseLocalListProductIds);
            this.actionWhenClicked(allThisProductIds, false);
          } else {
            listProductIds.push(...parseLocalListProductIds);
            window.location.href = `${window.shopUrl}${window.Shopify.routes.root}pages/compare`;
          }
        } else {
          listProductIds.push(...parseLocalListProductIds);
        }
      }
    } else {
      // compare localstorage not exists ==> create new local storage
      listProductIds.push(this.productId);
      this.actionWhenClicked(allThisProductIds, true);
    }
    const stringifyListProductIds = JSON.stringify(listProductIds);
    localStorage.setItem("materia__compare-items", stringifyListProductIds);
  }
}
customElements.define("button-compare", ButtonCompare);

class SwatchFunctions extends SwatchInit {
  constructor() {
    super();
    this.init();
  }

  showColorSwatch() {
    const _this = this;
    if (_this.show_color_swatch != null) {
      _this.show_color_swatch.addEventListener("click", (e) => {
        e.currentTarget.classList.add("hidden");
        _this
          .querySelectorAll(".product__color-swatches--js.hidden")
          .forEach((btn) => {
            btn.classList.remove("hidden");

            setTimeout(() => {
              console.log(btn);
              btn.classList.remove("opacity-0");
            }, 100);
          });
      });
    }
  }

  init() {
    this.querySelectorAll(".product__color-swatches--js").forEach((btn) => {
      this.checkSwatches(btn);
    });
    this.initAction();
  }

  initAction() {
    this.addEventListener("change", this.onVariantChange);
  }

  // Once in the page: grey out the values with no variant in stock, so the
  // first state is right even if the page could not work it out.
  connectedCallback() {
    this.markNamedColours();
    if (!this._onPeerChange) {
      this._onPeerChange = (e) => {
        const detail = e.detail || {};
        if (e.target === this || !detail.variant) return;
        if (String(detail.sectionId) !== String(this.dataset.section)) return;
        this.applyVariant(detail.variant);
      };
    }
    document.addEventListener("variant:change", this._onPeerChange);
    if (!this.querySelector(".product-form__input")) return;
    try {
      this.updateVariantStatuses();
    } catch (err) {}
  }
  disconnectedCallback() {
    if (this._onPeerChange)
      document.removeEventListener("variant:change", this._onPeerChange);
  }
  // A colour swatch with no picture and no swatch colour shows its name
  // when the name is not a colour the browser knows.
  markNamedColours() {
    if (!window.CSS || typeof CSS.supports !== "function") return;
    this.querySelectorAll("[data-vsp-color]").forEach((chip) => {
      const name = chip.getAttribute("data-vsp-color");
      chip.classList.toggle("vsp__chip--text", !name || !CSS.supports("color", name));
    });
  }
  // Another picker of the same section chose a variant: show it here too,
  // without announcing it again.
  applyVariant(variant) {
    const fieldsets = this.querySelectorAll("fieldset");
    fieldsets.forEach((fieldset, index) => {
      const value =
        variant[`option${index + 1}`] ??
        (Array.isArray(variant.options) ? variant.options[index] : null);
      if (value == null) return;
      fieldset.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.checked = String(input.value) === String(value);
      });
      // A dropdown picker keeps its option list in a select.
      fieldset.querySelectorAll("select").forEach((sel) => {
        if ([...sel.options].some((o) => String(o.value) === String(value))) sel.value = value;
      });
    });
    const select = this.querySelector("select");
    if (select && !select.closest("fieldset")) {
      const opt = [...select.options].find(
        (o) => String(o.dataset.variantId) === String(variant.id)
      );
      if (opt) opt.selected = true;
    }
    try {
      this.updateOptions();
      this.updateMasterId();
      this.updateOptionLabels(null);
      this.updateVariantStatuses();
    } catch (err) {}
  }

  onVariantChange(e) {
    const target = e.target;
    // Only option inputs drive a variant change (quantity, gift card and
    // other inputs inside the picker must not).
    if (!target || !target.matches || !target.matches('input[type="radio"], select')) return;
    // The sticky bar's picker lives in <body>: its product is the section
    // with the same id.
    this.productTarget =
      this.closest(".product__item-js") ||
      (this.dataset.section &&
        document.querySelector(
          `.product__item-js[data-section="${CSS.escape(String(this.dataset.section))}"]`
        )) ||
      this.closest(".shopify-section, [id^='shopify-section-'], section") ||
      document.body;
    // Storelib can render the quantity list with blank values, which is
    // not valid JSON. A broken list must never stop the variant change.
    let variantQtyData = [];
    const qtyScript = this.productTarget.querySelector(".productVariantsQty");
    if (qtyScript) {
      try {
        variantQtyData = JSON.parse(qtyScript.textContent) || [];
      } catch (err) {
        variantQtyData = [];
      }
    }
    if (!Array.isArray(variantQtyData) || variantQtyData.length === 0) {
      variantQtyData = this.getVariantData().map((v) => ({
        id: v.id,
        qty: Number(v.inventory_quantity) || (v.available ? 1 : 0),
        available: !!v.available,
      }));
    }
    this.groupFunctionsInit();
    // The picked value has no variant with the other choices: move to the
    // closest one that has it, in stock first, so a tap always selects.
    if (!this.currentVariant && target.matches('input[type="radio"], fieldset select')) {
      const fieldsets = [...this.querySelectorAll("fieldset")];
      const index = fieldsets.indexOf(target.closest("fieldset"));
      if (index > -1) {
        const key = `option${index + 1}`;
        const chosen = this.options || [];
        const score = (v) => chosen.reduce((n, val, i) => n + (String(v[`option${i + 1}`]) === String(val) ? 1 : 0), 0);
        const matches = this.getVariantData()
          .filter((v) => String(v[key]) === String(target.value))
          .sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0) || score(b) - score(a));
        if (matches[0]) {
          this.applyVariant(matches[0]);
          this.groupFunctionsInit();
        }
      }
    }
    this.updateOptionLabels(target);
    if (!this.currentVariant) {
      this.groupFunctionsUnavailable(target);
      // Still move the gallery to the picked colour's picture.
      if (typeof this.updateMedia === "function") this.updateMedia(false, target);
    } else {
      this.groupFunctionsAvailable(variantQtyData, target);
    }
    this.dispatchEvent(
      new CustomEvent("variant:change", {
        bubbles: true,
        detail: {
          variant: this.currentVariant || null,
          sectionId: this.dataset.section,
          source: "variant-picker",
        },
      })
    );
  }
  // Writes the chosen value next to each option name ("Size: M").
  updateOptionLabels(target) {
    const fieldsets = this.querySelectorAll("fieldset");
    fieldsets.forEach((fieldset, index) => {
      const checked = fieldset.querySelector("input:checked");
      const fsSelect = fieldset.querySelector("select");
      const value =
        (this.currentVariant && this.currentVariant[`option${index + 1}`]) ||
        (checked ? checked.value : fsSelect ? fsSelect.value : "");
      if (!value) return;
      fieldset.querySelectorAll(".option_value").forEach((el) => {
        el.textContent = value;
      });
    });
    const dropdown = target && target.closest && target.closest("swatch-dropdown");
    if (dropdown) dropdown.classList.remove("active");
  }
  // Re-reads variant data and swatch styles after the builder redraws.
  refreshPicker() {
    this.variantData = null;
    this.priceMap = null;
    this.markNamedColours();
    this.querySelectorAll(".product__color-swatches--js").forEach((btn) => {
      try {
        this.checkSwatches(btn);
      } catch (err) {}
    });
  }
  groupFunctionsInit() {
    this.updateOptions();
    this.updateMasterId();
    this.updatePickupAvailability();
    this.updateVariantStatuses();
    this.updateMediaSticky();
  }
  groupFunctionsUnavailable(target) {
    this.toggleAddButton(true, "", true);
    this.setUnavailable(target);
  }
  groupFunctionsAvailable(variantQtyData, target) {
    this.updateURL();
    this.updateVariantInput();
    this.updatePrice(this.productTarget);
    this.renderProductInfor(this.productTarget, variantQtyData, target);
    this.updateShareUrl();
    this.setAvailable();
  }
  updatePrice(productTarget) {
    if (!this.currentVariant) return;
    if (!productTarget) return;
    const p = document.getElementById(`price-${this.dataset.section}`);
    if (p) p.classList.remove("visibility-hidden");
    const compare_at_price = this.currentVariant.compare_at_price;
    const price = this.currentVariant.price;
    const unit_price = this.currentVariant.unit_price;
    const unit_price_measurement = this.currentVariant.unit_price_measurement;
    const price_format = this.formatVariantMoney(this.currentVariant, "price");
    // The price block of this section first, so a price elsewhere in the
    // section (upsell, sticky bar) is never the one rewritten.
    const priceScope = p || productTarget;
    if (unit_price && unit_price_measurement) {
      const price_num = this.formatVariantMoney(this.currentVariant, "unit_price");
      const price_unit =
        unit_price_measurement.reference_value != 1
          ? unit_price_measurement.reference_value
          : unit_price_measurement.reference_unit;
      if (priceScope.querySelector(".unit-price .number")) {
        priceScope.querySelector(".unit-price .number").innerHTML =
          price_num;
      }
      if (priceScope.querySelector(".unit-price .unit")) {
        priceScope.querySelector(".unit-price .unit").innerHTML = price_unit;
      }
    }
    if (priceScope.querySelector(".price-regular .price")) {
      priceScope.querySelector(".price-regular .price").innerHTML =
        price_format;
    }
    if (productTarget.classList.contains("video-item__popup")) {
      productTarget.querySelector(
        ".shopable-video__product-information .price-regular .price"
      ).innerHTML = price_format;
    }
    let bls__price = priceScope.querySelector(".card-product-price");
    if (productTarget.classList.contains("video-item__popup")) {
      bls__price = productTarget.querySelector(
        ".shopable-video__product-information .card-product-price"
      );
    }
    const sticky = this.stickyBar(productTarget);
    if (sticky) {
      sticky.querySelectorAll(".price-regular .price").forEach((el) => {
        el.innerHTML = price_format;
      });
    }
    if (bls__price) {
      if (!bls__price.querySelector(".compare-price")) {
        var ps = document.createElement("div");
        var sp = document.createElement("span");
        var cp = document.createElement("s");
        cp.classList.add("price-item", "compare-price");
        sp.appendChild(cp);
        ps.appendChild(sp);
        ps.classList.add("price-regular");
        bls__price.appendChild(ps);
      }
      const cpp = bls__price.querySelector(".compare-price");

      if (cpp) {
        if (compare_at_price && Number(compare_at_price) > Number(price)) {
          const compare_format = this.formatVariantMoney(
            this.currentVariant,
            "compare_at_price"
          );
          cpp.innerHTML = compare_format;
          if (bls__price.querySelector(".price-regular")) {
            bls__price
              .querySelector(".price-regular")
              .classList.add("primary-color");
          }
          if (bls__price.querySelector(".price-regular .price")) {
            bls__price
              .querySelector(".price-regular .price")
              .classList.add("price--special", "primary-color");
          }
        } else {
          cpp.innerHTML = "";
          if (bls__price.querySelector(".price-regular")) {
            bls__price
              .querySelector(".price-regular")
              .classList.remove("primary-color");
          }
          if (bls__price.querySelector(".price-regular .price")) {
            bls__price.querySelector(".price-regular .price").innerHTML =
              price_format;
            bls__price
              .querySelector(".price-regular .price")
              .classList.remove("price--special", "primary-color");
          }
        }
        if (!this.currentVariant.available) {
          bls__price.classList.add("price--sold-out");
        }
      }
    }
  }
  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute("disabled", "disabled");
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute("disabled");
      addButtonText.textContent = window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }
  setUnavailable(target) {
    const button = document.getElementById(
      `product-form-${this.dataset.section}`
    );
    const addButton = button ? button.querySelector('[name="add"]') : null;
    const addButtonText = button
      ? button.querySelector('[name="add"] > span')
      : null;
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(
      `Inventory-${this.dataset.section}`
    );
    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const pricePerItem = document.getElementById(
      `Price-Per-Item-${this.dataset.section}`
    );
    const volumeNote = document.getElementById(
      `Volume-Note-${this.dataset.section}`
    );
    const volumeTable = document.getElementById(
      `Volume-${this.dataset.section}`
    );
    const qtyRules = document.getElementById(
      `Quantity-Rules-${this.dataset.section}`
    );

    if (target && target.closest) {
      const fieldset = target.closest("fieldset");
      const optionSelected = fieldset
        ? fieldset.querySelector(".option_value")
        : null;
      if (optionSelected) optionSelected.textContent = target.value;
    }
    // Every add button of this product reads Unavailable, not only the form's.
    if (this.productTarget) {
      this.productTarget
        .querySelectorAll(".product_submit_button")
        .forEach((btn) => {
          btn.disabled = true;
          const label = btn.querySelector(".btn-label");
          if (label && window.variantStrings)
            label.textContent = window.variantStrings.unavailable;
        });
    }
    if (!addButton || !addButtonText) return;
    addButtonText.textContent = window.variantStrings.unavailable;
    if (price) price.classList.add("hidden");
    if (inventory) inventory.classList.add("hidden");
    if (sku) sku.classList.add("hidden");
    if (pricePerItem) pricePerItem.classList.add("hidden");
    if (volumeNote) volumeNote.classList.add("hidden");
    if (volumeTable) volumeTable.classList.add("hidden");
    if (qtyRules) qtyRules.classList.add("hidden");
  }

  setAvailable() {
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(
      `Inventory-${this.dataset.section}`
    );
    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const pricePerItem = document.getElementById(
      `Price-Per-Item-${this.dataset.section}`
    );
    const volumeNote = document.getElementById(
      `Volume-Note-${this.dataset.section}`
    );
    const volumeTable = document.getElementById(
      `Volume-${this.dataset.section}`
    );
    const qtyRules = document.getElementById(
      `Quantity-Rules-${this.dataset.section}`
    );

    if (price && price.classList.contains("hidden"))
      price.classList.remove("hidden");
    if (inventory && inventory.classList.contains("hidden"))
      inventory.classList.remove("hidden");
    if (sku && sku.classList.contains("hidden")) sku.classList.remove("hidden");
    if (pricePerItem && pricePerItem.classList.contains("hidden"))
      pricePerItem.classList.remove("hidden");
    if (volumeNote && volumeNote.classList.contains("hidden"))
      volumeNote.classList.remove("hidden");
    if (volumeTable && volumeTable.classList.contains("hidden"))
      volumeTable.classList.remove("hidden");
    if (qtyRules && qtyRules.classList.contains("hidden"))
      qtyRules.classList.remove("hidden");
  }
  // The variant to show pictures for: the chosen one, or, when that
  // combination does not exist, the first one with the value just picked.
  variantForTarget(target) {
    if (this.currentVariant) return this.currentVariant;
    if (!target || !target.closest) return null;
    const fieldset = target.closest("fieldset");
    const fieldsets = [...this.querySelectorAll("fieldset")];
    const pos = fieldsets.indexOf(fieldset) + 1;
    if (pos < 1) return null;
    const value = String(target.value);
    const list = this.getVariantData();
    return (
      list.find((v) => String(v[`option${pos}`]) === value && v.available) ||
      list.find((v) => String(v[`option${pos}`]) === value) ||
      null
    );
  }
  // A picture's address without size, crop or query, to compare two of them.
  mediaKey(url) {
    if (!url || typeof url !== "string") return "";
    let file = url.split("?")[0].split("#")[0].split("/").pop() || "";
    file = file.replace(/\.(jpe?g|png|gif|webp|avif|heic)$/i, "");
    file = file.replace(/_(\d+x\d*|x\d+|\d+x)(_crop_[a-z]+)?(@\dx)?$/i, "");
    return file.toLowerCase();
  }
  findVariantMediaSlide(scope, variant, target) {
    if (!scope) return null;
    const slides = [...scope.querySelectorAll("[data-media-id]")].filter(
      (el) => !el.closest(".media-thumb-swiper, .thumbnail-slide, .swiper-slide-duplicate")
    );
    if (!slides.length) return null;
    const section = this.dataset.section;
    const ids = [];
    const info = typeof this.variantMediaInfo === "function" ? this.variantMediaInfo(variant) : null;
    if (info && info.id !== "" && info.id != null) ids.push(String(info.id));
    if (variant) {
      if (variant.featured_media && variant.featured_media.id != null)
        ids.push(String(variant.featured_media.id));
      if (variant.featured_image && variant.featured_image.id != null)
        ids.push(String(variant.featured_image.id));
      if (variant.image_id != null) ids.push(String(variant.image_id));
    }
    for (const id of ids) {
      const hit = slides.find((el) => {
        const mid = el.getAttribute("data-media-id") || "";
        return mid === `${section}-${id}` || mid.endsWith(`-${id}`) || mid === id;
      });
      if (hit) return hit;
    }
    const urls = [];
    if (variant) {
      const fm = variant.featured_media;
      if (fm && fm.preview_image && fm.preview_image.src) urls.push(fm.preview_image.src);
      if (fm && fm.src) urls.push(fm.src);
      const fi = variant.featured_image;
      if (fi && typeof fi === "object" && fi.src) urls.push(fi.src);
      if (typeof fi === "string") urls.push(fi);
      if (typeof variant.image === "string") urls.push(variant.image);
      if (variant.image && variant.image.src) urls.push(variant.image.src);
    }
    if (info && info.src) urls.push(info.src);
    // The picture on the chosen swatch: the one just picked, then every
    // checked one.
    const picked = [];
    if (target && target.id) picked.push(target);
    if (typeof this.querySelectorAll === "function") {
      this.querySelectorAll('input[type="radio"]:checked').forEach((input) => {
        if (input !== target && input.id) picked.push(input);
      });
    }
    picked.forEach((input) => {
      const label = this.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if (label && label.dataset.image) urls.push(label.dataset.image);
    });
    const keys = urls.map((u) => this.mediaKey(u)).filter(Boolean);
    if (!keys.length) return null;
    // Each slide's picture names, from every address its image may carry.
    const slideKeys = slides.map((el) => {
      const img = el.querySelector("img");
      if (!img) return [];
      const srcs = [
        img.currentSrc,
        img.getAttribute("src"),
        img.getAttribute("data-src"),
        el.getAttribute("data-mt-src"),
      ];
      [img.getAttribute("srcset"), img.getAttribute("data-srcset")].forEach((set) => {
        (set || "").split(",").forEach((part) => srcs.push(part.trim().split(" ")[0]));
      });
      return srcs.map((u) => this.mediaKey(u)).filter(Boolean);
    });
    // The surest name first: the variant's own picture before a swatch's.
    for (const key of keys) {
      const i = slideKeys.findIndex((list) => list.includes(key));
      if (i > -1) return slides[i];
    }
    return null;
  }
  updateMedia(variantGroup = false, target = null) {
    if (!this.productTarget) return;
    const variant = this.variantForTarget(target);
    if (!variant) return;
    const gallery = this.productTarget.querySelector("media-gallery");
    if (!gallery) return;
    const slide = this.findVariantMediaSlide(gallery, variant, target);
    if (!slide) return;
    SwatchFunctions.goToMedia(gallery, slide);
  }
  // The variant's picture as the page lists it (script[data-variant-media]),
  // for when the variant data has no media id.
  variantMediaInfo(variant) {
    if (!variant || !this.productTarget) return null;
    if (this._variantMediaFrom !== this.productTarget) {
      this._variantMediaFrom = this.productTarget;
      this._variantMedia = null;
      const el = this.productTarget.querySelector("script[data-variant-media]");
      if (el) {
        try {
          this._variantMedia = JSON.parse(el.textContent);
        } catch (err) {
          this._variantMedia = null;
        }
      }
    }
    return (this._variantMedia && this._variantMedia[String(variant.id)]) || null;
  }
  // Brings a gallery picture to the front every time: the slider slides to
  // it, a sideways row scrolls to it, a column of pictures scrolls the page
  // to it. Nothing moves when it is already there.
  static goToMedia(gallery, slide) {
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reduce ? "auto" : "smooth";
    const speed = reduce ? 0 : 500;
    const holder = gallery.querySelector("slide-with-thumbs");
    const slideEl = slide.closest(".swiper-slide") || slide;
    const live = (sw) => (sw && !sw.destroyed && sw.slides ? sw : null);
    const mainEl = holder && holder.querySelector(".swiper-wrapper-preview");
    const main = live(mainEl && mainEl.swiper) || live(holder && holder.globalSlide);
    if (main && main.el && main.el.contains(slideEl)) {
      const list = Array.from(main.slides);
      const index = list.indexOf(slideEl);
      if (index < 0) return;
      const loop = !!(main.params && main.params.loop);
      const realAttr = slideEl.getAttribute("data-swiper-slide-index");
      const real = realAttr != null && realAttr !== "" ? Number(realAttr) : index;
      const current = loop ? main.realIndex : main.activeIndex;
      if ((loop ? real : index) !== current) {
        if (loop && typeof main.slideToLoop === "function") main.slideToLoop(real, speed);
        else main.slideTo(index, speed);
      }
      const thumbs = live(holder.thumbnailSlide);
      if (thumbs && typeof thumbs.slideTo === "function") {
        const ti = loop ? real : index;
        const thumb = thumbs.slides[ti];
        if (!thumb || !thumb.classList.contains("swiper-slide-visible")) thumbs.slideTo(ti, speed);
      }
      return;
    }
    // A row that scrolls sideways (phones, grid and stack layouts).
    const scroller = slideEl.closest(".grid_scroll, .swiper-wrapper, [data-scroll-row]");
    if (scroller && scroller.scrollWidth > scroller.clientWidth + 1) {
      const sRect = scroller.getBoundingClientRect();
      const rect = slideEl.getBoundingClientRect();
      const pad = parseFloat(getComputedStyle(scroller).paddingLeft) || 0;
      const rtl = getComputedStyle(scroller).direction === "rtl";
      const delta = rtl
        ? rect.right - sRect.right + (parseFloat(getComputedStyle(scroller).paddingRight) || 0)
        : rect.left - sRect.left - pad;
      if (Math.abs(delta) > 2) {
        scroller.scrollTo({ left: scroller.scrollLeft + delta, behavior });
      }
      return;
    }
    // A column of pictures: scroll the page so the picture sits under the
    // sticky header, unless it is already fully in view.
    const rect = slideEl.getBoundingClientRect();
    const topOffset =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sticky-top")) || 0;
    const viewTop = topOffset;
    const viewBottom = window.innerHeight;
    const fits = rect.height <= viewBottom - viewTop;
    const inView = fits
      ? rect.top >= viewTop - 1 && rect.bottom <= viewBottom + 1
      : rect.top <= viewTop + 1 && rect.bottom >= viewBottom - 1;
    if (inView) return;
    const y = window.scrollY + rect.top - viewTop - 20;
    window.scrollTo({ top: Math.max(0, y), behavior });
  }
  // The section's sticky add to cart bar. It moves itself to <body> (so it
  // stays fixed to the viewport), out of the section, so it is found by
  // the section id as well.
  stickyBar(scope) {
    const inScope = scope && scope.querySelector ? scope.querySelector("sticky-add-cart") : null;
    if (inScope) return inScope;
    const id = this.dataset && this.dataset.section;
    if (!id) return null;
    return document.querySelector(`sticky-add-cart[data-section-id="${CSS.escape(String(id))}"]`);
  }
  updateMediaSticky() {
    if (!this.productTarget) return;
    if (!this.currentVariant) return;
    const stickyAddCart = this.stickyBar(this.productTarget);
    if (!stickyAddCart) return;
    const fm = this.currentVariant.featured_media;
    const src =
      (fm && fm.preview_image && fm.preview_image.src) ||
      (this.currentVariant.featured_image && this.currentVariant.featured_image.src);
    if (!src) return;
    const imgQuery = stickyAddCart.querySelector("img");
    if (!imgQuery) return;
    imgQuery.src = src;
    imgQuery.removeAttribute("srcset");
    imgQuery.removeAttribute("sizes");
  }
  renderProductInfor(productTarget, variantQtyData, target) {
    if (!this.currentVariant) return;
    if (!productTarget) return;
    let qty = 0;
    let percent = 0;
    let sale = false;
    let soldOut = false;
    let pre_order = false;
    let av = this.currentVariant.available;
    let sku = this.currentVariant.sku;
    let im = this.currentVariant.inventory_management;
    const compare_at_price = this.currentVariant.compare_at_price;
    const price = this.currentVariant.price;
    let avaiable = productTarget.querySelector(".available-value");
    let sku_area = productTarget.querySelector(".product__sku");
    // Option labels are written per fieldset by updateOptionLabels(), so a
    // second picker in the section (sticky bar, selector pro) is untouched.

    if (sku_area) sku_area.innerHTML = sku ? sku : "N/A";
    (variantQtyData || []).find((variantQty) => {
      if (String(variantQty.id) === String(this.currentVariant.id)) {
        qty = Number(variantQty.qty) || 0;
      }
    });

    const countdown = document.querySelector("stock-countdown");
    if (countdown) {
      const itemsLeft = countdown.dataset.itemsLeft;
      const message = countdown.dataset.message;
      if (itemsLeft >= qty && message && qty >= 1) {
        countdown.classList.add("block");
        countdown.classList.remove("hidden");
        const qt = countdown.querySelector("span.count");
        const progressbar = countdown.querySelector(".progressbar-stock");
        let widthProgress;
        if ((qty / itemsLeft) * 100 > 100) {
          widthProgress = 100;
        } else {
          widthProgress = (qty / itemsLeft) * 100;
        }
        progressbar.style.setProperty("--percent", `100%`);

        setTimeout(() => {
          progressbar.style.setProperty("--percent", `${widthProgress}%`);
        }, 850);
        if (qt) {
          qt.innerHTML = qty;
        }
      } else {
        countdown.classList.remove("block");
        countdown.classList.add("hidden");
      }
    }

    const typePercent =
      productTarget.querySelector(".product__badges")?.dataset.saleBadgeType;
    if (compare_at_price && compare_at_price > price && typePercent) {
      sale = true;
      if (typePercent === "percent") {
        percent = ((compare_at_price - price) / compare_at_price) * 100;
      } else if (typePercent === "price") {
        percent = compare_at_price - price;
      }
    }
    if (im === null) {
      soldOut = false;
      pre_order = false;
      if (avaiable) {
        avaiable.innerHTML = window.variantStrings.inStock;
      }
    } else {
      if (av) {
        if (qty < 1) {
          pre_order = true;
          if (avaiable) {
            avaiable.innerHTML = window.variantStrings.preOrder;
          }
        } else {
          soldOut = false;
          pre_order = false;
          if (avaiable) {
            avaiable.innerHTML = window.variantStrings.inStock;
          }
          if (avaiable) {
            avaiable.innerHTML = window.variantStrings.inStock;
          }
        }
      } else {
        soldOut = true;
        if (avaiable) {
          avaiable.innerHTML = window.variantStrings.outStock;
        }
      }
    }
    this.renderLabel(sale, pre_order, soldOut, percent, productTarget);
    this.renderBtnStatus(productTarget, im, av, qty);
  }
  renderLabel(sale, pre_order, soldOut, percent, productTarget) {
    const label = productTarget.querySelector(".product__badges");
    const sale_badge = productTarget.querySelector(".sale_badge");
    const productBadgesScrolling = productTarget.querySelector(
      ".product__badges-sale-scrolling"
    );
    if (sale || pre_order || soldOut) {
      if (!label) {
        var element = document.createElement("div");
        element.classList.add(
          "product__badges",
          "fs-small",
          "flex",
          "flex-wrap",
          "gap-5",
          "uppercase"
        );
        if (sale_badge) {
          sale_badge.appendChild(element);
        }
      }
    }

    if (label) {
      const saleColor = label.dataset.saleColor;
      const soldOutColor = label.dataset.soldOutColor;
      const preOrderColor = label.dataset.preOrderColor;
      const saleBg = label.dataset.saleBg;
      const soldOutBg = label.dataset.soldOutBg;
      const preOrderBg = label.dataset.preOrderBg;
      const show_sale = label?.dataset.showSale === "true";
      const show_pre_order = label?.dataset.showPreorder === "true";
      const show_sold_out = label?.dataset.showSoldOut === "true";
      const saleBadgeType = label?.dataset.saleBadgeType;
      const prd = Shopify.formatMoney(
        percent,
        themeGlobalVariables.settings.money_format
      );
      const dsale = label.querySelector(".product__badges-sale");
      const dsoldout = label.querySelector(".product__badges-sold-out");
      const dpreorder = label.querySelector(".product__badges-pre-order");
      if (sale && show_sale) {
        if (!dsale) {
          var elementsale = document.createElement("div");
          elementsale.classList.add(
            "product__badges-sale",
            "product__badges-inner",
            "py-8",
            "px-15",
            "align-self-start",
            "sale",
            "inline-flex",
            "content-center",
            "subheading_weight",
            "btn-rounded",
            "lh-normal",
            "text-center",
            `${
              saleBadgeType === "percent"
                ? "product__badges-type-percent"
                : "badges"
            }`
          );
          elementsale.style.setProperty("--badges-color", saleColor);
          elementsale.style.setProperty("--badges-bg", saleBg);
          if (saleBadgeType === "price") {
            elementsale.innerHTML = `${
              window.variantStrings.save ? window.variantStrings.save : "Save"
            } ${prd}`;
          } else if (saleBadgeType === "percent") {
            elementsale.innerHTML = -percent.toFixed(0) + "%";
          } else {
            elementsale.innerHTML = `${
              window.variantStrings.sale ? window.variantStrings.sale : "Sale"
            }`;
          }
          if (dsoldout) {
            label.insertBefore(elementsale, dsoldout);
          } else if (dpreorder) {
            label.insertBefore(elementsale, dpreorder);
          } else {
            label.appendChild(elementsale);
          }
        } else {
          if (saleBadgeType === "price") {
            dsale.innerHTML = `${
              window.variantStrings.save ? window.variantStrings.save : "Save"
            } ${prd}`;
          } else if (saleBadgeType === "percent") {
            dsale.innerHTML = -percent.toFixed(0) + "%";
          } else {
            dsale.innerHTML = `${
              window.variantStrings.sale ? window.variantStrings.sale : "Sale"
            }`;
          }
        }
      } else {
        dsale?.remove();
      }
      if (pre_order && show_pre_order) {
        if (!dpreorder) {
          var elementpo = document.createElement("div");
          elementpo.classList.add(
            "product__badges-pre-order",
            "product__badges-inner",
            "py-8",
            "px-15",
            "align-self-start",
            "pre-order",
            "inline-flex",
            "content-center",
            "subheading_weight",
            "btn-rounded",
            "lh-normal",
            "text-center"
          );
          elementpo.style.setProperty("--badges-color", preOrderColor);
          elementpo.style.setProperty("--badges-bg", preOrderBg);
          elementpo.innerHTML = window.variantStrings.preOrder
            ? window.variantStrings.preOrder
            : "Pre-order";
          label.appendChild(elementpo);
        } else {
          dpreorder.innerHTML = window.variantStrings.preOrder
            ? window.variantStrings.preOrder
            : "Pre-order";
        }
      } else {
        dpreorder?.remove();
      }
      if (soldOut && show_sold_out) {
        if (!dsoldout) {
          var elementso = document.createElement("div");
          elementso.classList.add(
            "product__badges-sold-out",
            "product__badges-inner",
            "py-8",
            "px-15",
            "align-self-start",
            "sold-out",
            "inline-flex",
            "content-center",
            "subheading_weight",
            "btn-rounded",
            "lh-normal",
            "text-center"
          );
          elementso.style.setProperty("--badges-color", soldOutColor);
          elementso.style.setProperty("--badges-bg", soldOutBg);
          elementso.innerHTML = window.variantStrings.soldOut
            ? window.variantStrings.soldOut
            : "Sold out";
          label.appendChild(elementso);
        } else {
          dsoldout.innerHTML = window.variantStrings.soldOut
            ? window.variantStrings.soldOut
            : "Sold out";
        }
      } else {
        dsoldout?.remove();
      }
    }

    if (productBadgesScrolling && sale) {
      const dataBadgesScrolling =
        productBadgesScrolling?.dataset.textProductScrolling;
      const allProductBadgesScrolling = productBadgesScrolling.querySelectorAll(
        ".content-badges-scrolling"
      );
      allProductBadgesScrolling.forEach((content) => {
        content.innerText = dataBadgesScrolling.replace(
          "[percent_sale]",
          percent.toFixed(0) + "%"
        );
      });
    }
  }
  renderBtnStatus(productTarget, im, av, qty) {
    if (!productTarget) return;
    let btns_add_cart = productTarget.querySelectorAll(
      ".product_submit_button"
    );
    btns_add_cart.forEach((btn_add_cart) => {
      if (btn_add_cart.querySelector(".btn-label")) {
        if (im === null) {
          btn_add_cart.querySelector(".btn-label").innerHTML =
            window.variantStrings.addToCart;
          btn_add_cart.disabled = false;
        } else {
          if (av) {
            if (qty < 1) {
              btn_add_cart.querySelector(".btn-label").innerHTML =
                window.variantStrings.preOrder;
              btn_add_cart.disabled = false;
            } else {
              btn_add_cart.querySelector(".btn-label").innerHTML =
                window.variantStrings.addToCart;
              btn_add_cart.disabled = false;
            }
          } else {
            btn_add_cart.querySelector(".btn-label").innerHTML =
              window.variantStrings.soldOut;
            btn_add_cart.disabled = true;
          }
        }
      }
    });
  }
  // Greys out the values that make no available variant with the values
  // chosen in the options before them. Every option is checked, the first
  // one against stock alone.
  updateVariantStatuses() {
    const variants = this.getVariantData();
    const inputWrappers = [...this.querySelectorAll(".product-form__input")];
    const chosen = inputWrappers.map((wrapper) => {
      const checked = wrapper.querySelector("input:checked");
      const sel = checked ? null : wrapper.querySelector("select");
      return checked ? String(checked.value) : sel ? String(sel.value) : null;
    });
    inputWrappers.forEach((wrapper, index) => {
      const optionInputs = [
        ...wrapper.querySelectorAll('input[type="radio"], option'),
      ];
      const availableValues = variants
        .filter((variant) => {
          if (!variant.available) return false;
          for (let i = 0; i < index; i++) {
            if (chosen[i] != null && String(variant[`option${i + 1}`]) !== chosen[i])
              return false;
          }
          return true;
        })
        .map((variant) => String(variant[`option${index + 1}`]));
      this.setInputAvailability(optionInputs, availableValues);
    });
  }
  setInputAvailability(elementList, availableValuesList) {
    elementList.forEach((element) => {
      const value = element.getAttribute("value");
      const availableElement = availableValuesList.includes(value);

      if (element.tagName === "INPUT") {
        element.classList.toggle("option-disabled", !availableElement);
      } else if (element.tagName === "OPTION") {
        const strings = window.variantStrings || {};
        element.innerText =
          availableElement || !strings.unavailable_with_option
            ? value
            : strings.unavailable_with_option.replace("[value]", value);
      }
    });
  }
  updateOptions() {
    this.options = [];
    Array.from(this.querySelectorAll("select, fieldset"), (element) => {
      if (element.tagName === "SELECT") {
        // A select inside a fieldset is read with that fieldset.
        if (element.closest("fieldset")) return;
        let array = element.value.split(" / ");
        array.forEach((item) => this.options.push(item));
      }
      if (element.tagName === "FIELDSET") {
        const select = element.querySelector("select");
        const checked = Array.from(element.querySelectorAll("input")).find(
          (radio) => radio.checked
        );
        this.options.push(checked ? checked.value : select ? select.value : undefined);
      }
    });
  }
  updateMasterId() {
    const chosen = this.options || [];
    this.currentVariant = this.getVariantData().find((variant) =>
      chosen.every(
        (value, index) =>
          value == null || String(variant[`option${index + 1}`]) === String(value)
      )
    );
  }
  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === "false") return;
    const base = this.dataset.url || window.location.pathname;
    try {
      const url = new URL(base, window.location.href);
      if (url.origin !== window.location.origin) return;
      url.searchParams.set("variant", this.currentVariant.id);
      window.history.replaceState(window.history.state, "", url.toString());
    } catch (err) {}
  }
  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #sticky-addcart-form-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      if (!input) return;
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  updateShareUrl() {
    const copyButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!copyButton || !copyButton.updateUrl) return;
    copyButton.updateUrl(
      `${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`
    );
    const copyParent = copyButton.closest(".share__content");
    if (!copyParent) return;
    const copySpan = copyParent.querySelector(".copy__url");
    if (!copySpan) return;
    copySpan.innerHTML = `${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`;
  }
  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector("pickup-availability");
    if (!pickUpAvailability) return;
    if (typeof pickUpAvailability.fetchAvailability !== "function") return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute("available");
      pickUpAvailability.innerHTML = "";
    }
  }
  // Variants as the picker needs them, whatever shape the page wrote:
  // option1..option3 and options[] both filled, ids and stock settled.
  getVariantData() {
    if (this.variantData) return this.variantData;
    let list = null;
    const own = this.querySelector(
      'script[type="application/json"]:not([data-variant-prices])'
    );
    if (own) {
      try {
        list = JSON.parse(own.textContent);
      } catch (err) {
        list = null;
      }
    }
    if (!Array.isArray(list)) {
      const scope = this.closest(".product__item-js") || document;
      const productJson = scope.querySelector("[data-product-json]");
      if (productJson) {
        try {
          const product = JSON.parse(productJson.textContent);
          list = product && Array.isArray(product.variants) ? product.variants : null;
        } catch (err) {
          list = null;
        }
      }
    }
    this.variantData = SwatchFunctions.normalizeVariants(list || []);
    return this.variantData;
  }
  static normalizeVariants(list) {
    return list
      .filter((v) => v && typeof v === "object")
      .map((v) => {
        const variant = Object.assign({}, v);
        let options = Array.isArray(v.options) ? v.options.slice() : null;
        if (options && options.length && typeof options[0] === "object") {
          options = options.map((o) => (o && (o.value ?? o.name)) ?? "");
        }
        if (!options || !options.length) {
          options = [v.option1, v.option2, v.option3].filter(
            (o) => o !== undefined && o !== null && o !== ""
          );
        }
        if ((!options || !options.length) && typeof v.title === "string") {
          options = v.title.split(" / ");
        }
        options = options.map((o) => String(o));
        variant.options = options;
        for (let i = 0; i < 3; i++) {
          const key = `option${i + 1}`;
          if (variant[key] === undefined || variant[key] === null || variant[key] === "") {
            variant[key] = options[i] !== undefined ? options[i] : null;
          } else {
            variant[key] = String(variant[key]);
          }
        }
        if (variant.available === undefined) {
          variant.available =
            variant.inventory_quantity === undefined ||
            Number(variant.inventory_quantity) > 0 ||
            variant.inventory_policy === "continue";
        } else {
          variant.available =
            variant.available === true || variant.available === "true" || variant.available === 1;
        }
        if (
          variant.inventory_management === undefined ||
          variant.inventory_management === ""
        ) {
          variant.inventory_management = null;
        }
        if (typeof variant.id === "string" && /^\d+$/.test(variant.id)) {
          variant.id = Number(variant.id);
        }
        return variant;
      });
  }
  // Money as the page printed it for this variant when it can, so the
  // shop's own currency format is kept; otherwise the theme's formatter.
  formatVariantMoney(variant, key) {
    if (!variant) return "";
    if (this.priceMap === undefined || this.priceMap === null) {
      this.priceMap = {};
      const el = this.querySelector("script[data-variant-prices]");
      if (el) {
        try {
          this.priceMap = JSON.parse(el.textContent) || {};
        } catch (err) {
          this.priceMap = {};
        }
      }
    }
    const printed = this.priceMap[String(variant.id)];
    if (printed && printed[key]) return printed[key];
    const cents = variant[key];
    const format =
      (window.themeGlobalVariables &&
        themeGlobalVariables.settings &&
        themeGlobalVariables.settings.money_format) ||
      "${{amount}}";
    try {
      if (window.Shopify && typeof Shopify.formatMoney === "function") {
        return Shopify.formatMoney(cents, format);
      }
    } catch (err) {}
    return String(cents == null ? "" : cents);
  }
}
// The builder redraws a section in place; the pickers in it read their
// variants and swatches again so a changed product or setting shows.
if (!window.__materiaPickerReload) {
  window.__materiaPickerReload = true;
  const refreshPickers = (event) => {
    const root =
      (event && event.target && event.target.querySelectorAll && event.target) ||
      document;
    const scope = root === document ? document : root;
    scope
      .querySelectorAll(
        "variant-radios-detail, variant-radios-single, variant-group-detail, variant-radios-sticky, variant-group-sticky"
      )
      .forEach((picker) => {
        if (typeof picker.refreshPicker === "function") {
          picker.refreshPicker();
          try {
            picker.updateVariantStatuses();
          } catch (err) {}
        }
      });
  };
  document.addEventListener("storelib:section-load", refreshPickers);
  document.addEventListener("shopify:section:load", refreshPickers);
}
//Function click dropdown variant
class SwatchDropdownSelectValue extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", this.activeFilterSort.bind(this), false);
  }

  activeFilterSort() {
    // Remove active class from all elements except the clicked one
    document.querySelectorAll(".select-custom.active").forEach((element) => {
      if (element !== this.closest(".select-custom")) {
        element.classList.remove("active");
      }
    });

    // Toggle active class on the clicked element
    if (this.closest(".select-custom").classList.contains("active")) {
      this.closest(".select-custom").classList.remove("active");
    } else {
      this.closest(".select-custom").classList.add("active");
    }
  }
}
customElements.define(
  "swatch-dropdown-select-value",
  SwatchDropdownSelectValue
);

// Function to remove active class when clicking outside
function handleClickOutside(event) {
  if (!event.target.closest(".select-custom")) {
    document.querySelectorAll(".select-custom.active").forEach((element) => {
      element.classList.remove("active");
    });
  }
}

// Add event listener to the document
document.addEventListener("click", handleClickOutside);
// End function click dropdown variant

class VariantRadios extends SwatchFunctions {
  constructor() {
    super();
    this.show_color_swatch = this.querySelector(".show_color_swatch");
    this.showColorSwatch();
  }

  init() {
    this.querySelectorAll(".product__color-swatches--js").forEach((btn) => {
      this.checkSwatches(btn);
      this.variantHover(btn);
      btn.addEventListener("click", this.onVariantChange.bind(this), false);
    });
  }

  variantHover(e) {
    const productTarget = e.closest(".product-item");
    if (!productTarget) return;

    const swiperElement = e.closest(".swiper");
    if (!swiperElement) return;

    let timeout;

    const handleMouseOut = () => {
      swiperElement.classList.remove("show-tooltip");
    };

    const handleMouseOver = () => {
      swiperElement.classList.add("show-tooltip");
    };

    e.addEventListener("mouseout", handleMouseOut, false);
    e.addEventListener("mouseover", handleMouseOver, false);
    e.addEventListener("mouseenter", handleMouseOver, false);
    e.addEventListener("mouseleave", handleMouseOut, false);
  }
  onVariantChange(e) {
    e.preventDefault();
    const target = e.currentTarget;
    this.productTarget = this.closest(".product__item-js");
    this.position_swatch = target.dataset.position;
    const variantQtyData = JSON.parse(
      this.productTarget.querySelector(".productItemVariantsQty").textContent
    );
    if (!target.classList.contains("active")) {
      const activeSwatches = target
        .closest(".product__color-swatches")
        .querySelectorAll(".product__color-swatches--js");
      activeSwatches.forEach((el) => {
        el.classList.remove("active");
      });
      target.classList.toggle("active");
      this.groupFunctionsInit(this.getVariantData());
      if (this.currentVariant) {
        this.groupFunctionsAvailable(variantQtyData);
      }
    }
  }
  groupFunctionsInit(variantData) {
    this.updateOptions();
    this.updateMasterId(variantData);
  }
  groupFunctionsAvailable(variantQtyData) {
    this.updatePrice();
    this.updateMedia();
    this.renderProductInfor(variantQtyData);
  }
  updatePrice() {
    if (!this.currentVariant) return;
    if (!this.productTarget) return;
    const p = document.getElementById(`price-${this.dataset.section}`);
    if (p) p.classList.remove("visibility-hidden");
    const compare_at_price = this.currentVariant.compare_at_price;
    const price = this.currentVariant.price;
    const unit_price = this.currentVariant.unit_price;
    const unit_price_measurement = this.currentVariant.unit_price_measurement;
    const price_format = Shopify.formatMoney(
      this.currentVariant.price,
      themeGlobalVariables.settings.money_format
    );
    if (unit_price && unit_price_measurement) {
      const price_num = Shopify.formatMoney(
        unit_price,
        themeGlobalVariables.settings.money_format
      );
      const price_unit =
        unit_price_measurement.reference_value != 1
          ? unit_price_measurement.reference_value
          : unit_price_measurement.reference_unit;
      if (this.productTarget.querySelector(".unit-price .number")) {
        this.productTarget.querySelector(".unit-price .number").innerHTML =
          price_num;
      }
      if (this.productTarget.querySelector(".unit-price .unit")) {
        this.productTarget.querySelector(".unit-price .unit").innerHTML =
          price_unit;
      }
    }
    if (this.productTarget.querySelector(".price-regular .price")) {
      this.productTarget.querySelector(".price-regular .price").innerHTML =
        price_format;
    }
    const bls__price = this.productTarget.querySelector(".card-product-price");
    if (bls__price) {
      if (!bls__price.querySelector(".compare-price")) {
        var ps = document.createElement("div");
        var sp = document.createElement("span");
        var cp = document.createElement("s");
        cp.classList.add("price-item", "dark-gray", "compare-price");
        sp.appendChild(cp);
        ps.appendChild(sp);
        ps.classList.add("price-sale");
        if (this.productTarget.querySelector(".card-product-price")) {
          this.productTarget
            .querySelector(".card-product-price")
            .appendChild(ps);
        }
      }
      const cpp = bls__price.querySelector(".compare-price");
      if (cpp) {
        if (compare_at_price && compare_at_price > price) {
          const compare_format = Shopify.formatMoney(
            compare_at_price,
            themeGlobalVariables.settings.money_format
          );
          cpp.innerHTML = compare_format;
          if (bls__price.querySelector(".price-regular")) {
            bls__price
              .querySelector(".price-regular")
              .classList.add("primary-color");
          }
          if (bls__price.querySelector(".price-regular .price")) {
            bls__price
              .querySelector(".price-regular .price")
              .classList.add("price--special");
          }
        } else {
          cpp.innerHTML = "";
          if (bls__price.querySelector(".price-regular")) {
            bls__price
              .querySelector(".price-regular")
              .classList.remove("primary-color");
          }
          if (bls__price.querySelector(".price-regular .price")) {
            bls__price
              .querySelector(".price-regular .price")
              .classList.remove("price--special");
            bls__price.querySelector(".price-regular .price").innerHTML =
              price_format;
          }
        }
        if (!this.currentVariant.available) {
          bls__price.classList.add("price--sold-out");
        }
      }
    }
  }
  renderProductInfor(variantQtyData) {
    if (!this.currentVariant) return;
    if (!this.productTarget) return;
    let qty = 0;
    let percent = 0;
    let sale = false;
    let soldOut = false;
    let pre_order = false;
    let av = false;
    let im = false;
    const compare_at_price = this.currentVariant.compare_at_price;
    const price = this.currentVariant.price;
    const productTarget = this.productTarget;
    const productBadgesScrolling = productTarget.querySelector(
      ".product__badges-sale-scrolling"
    );
    const typePercent = productTarget.querySelector(
      ".product__badges-type-percent"
    );
    const vqd = variantQtyData.reduce((acc, item) => {
      const existingItem = acc.find((i) => i.option === item.option);
      if (existingItem) {
        existingItem.qty += item.qty;
        if (item.available === true) {
          existingItem.available = true;
        }
        if (item.mamagement === "") {
          existingItem.mamagement = "";
        }
      } else {
        acc.push(item);
      }
      return acc;
    }, []);
    vqd.find((variantQty) => {
      if (variantQty.option === this.currentVariant.option1) {
        qty = variantQty.qty;
        av = variantQty.available;
        im = variantQty.mamagement;
      }
    });
    if (compare_at_price && compare_at_price > price) {
      sale = true;
      if (productBadgesScrolling || typePercent) {
        percent = ((compare_at_price - price) / compare_at_price) * 100;
      } else {
        percent = compare_at_price - price;
      }
    }
    if (im === "") {
      soldOut = false;
      pre_order = false;
    } else {
      if (av && qty < 1) {
        pre_order = true;
      } else if (!av) {
        soldOut = true;
      }
    }
    this.renderLabel(sale, pre_order, soldOut, percent, this.productTarget);
  }
  updateMasterId(variantData) {
    return (this.currentVariant = variantData.find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    }));
  }
  updateOptions() {
    this.options = Array.from(
      this.productTarget.querySelectorAll(
        ".product__color-swatches--js.active"
      ),
      (select) => select.getAttribute("data-value")
    );

    this.variantData.find((variant) => {
      if (this.options.length == 1) {
        const variantOptions = {
          1: variant.option1,
          2: variant.option2,
          3: variant.option3,
        };
        if (variantOptions[this.position_swatch] === this.options[0]) {
          this.options = variant.options;
        }
      }
    });
  }
  async updateMedia() {
    if (!this.currentVariant) return;
    if (
      !this.productTarget
        .querySelector(".product__media img")
        .classList.contains("hidden")
    ) {
      const productItem = this.productTarget
        .querySelector(".product__media img")
        .closest(".product-item");
      if (
        productItem.querySelector("video") ||
        productItem.querySelector("iframe")
      ) {
        this.productTarget
          .querySelector(".product__media img")
          .classList.add("hidden");
        productItem.querySelector("video")?.classList.remove("hidden");
        productItem.querySelector("iframe")?.classList.remove("hidden");
      }
    }
    if (!this.currentVariant.featured_media) return;
    if (this.productTarget.querySelector(".product__media img")) {
      this.productTarget
        .querySelector(".product__media img")
        .removeAttribute("srcset");
    }
    if (
      this.productTarget
        .querySelector(".product__media img")
        .classList.contains("hidden")
    ) {
      this.productTarget
        .querySelector(".product__media img")
        .classList.remove("hidden");
      const productItem = this.productTarget
        .querySelector(".product__media img")
        .closest(".product-item");
      if (
        productItem.querySelector("video") ||
        productItem.querySelector("iframe")
      ) {
        productItem.querySelector("video")?.classList.add("hidden");
        productItem.querySelector("iframe")?.classList.add("hidden");
      }
    }
    if (this.productTarget.querySelector(".product__media img")) {
      await Motion.animate(
        this.productTarget.querySelector(".product__media img"),
        { opacity: [1, 0] },
        { duration: 0.1, easing: "ease-in" }
      );
      this.productTarget
        .querySelector(".product__media img")
        .setAttribute(
          "src",
          this.currentVariant.featured_media.preview_image.src
        );
      await new Promise((resolve) => {
        this.productTarget.querySelector(".product__media img").onload = () => {
          resolve();
        };
      });
      Motion.animate(
        this.productTarget.querySelector(".product__media img"),
        { opacity: [0, 1] },
        { duration: 0.1, easing: "ease-in" }
      );
    }
  }
}
customElements.define("variant-radios", VariantRadios);

class VariantRadiosDetail extends SwatchFunctions {
  constructor() {
    super();
  }
  groupFunctionsAvailable(variantQtyData, target) {
    this.updateURL();
    this.updateVariantInput();
    this.updatePrice(this.productTarget);
    this.renderProductInfor(this.productTarget, variantQtyData, target);
    this.updateMedia(false, target);
    this.updateShareUrl();
    this.mapStickyDropdown();
    this.setAvailable();
  }
  mapStickyDropdown() {
    if (!this.currentVariant || !this.productTarget) return;

    const stickyAddCart = this.stickyBar(this.productTarget);
    if (!stickyAddCart) return;

    const select = stickyAddCart.querySelector("select");
    const detailRadio = this.productTarget.querySelector(
      "variant-radios-detail, variant-group-detail"
    );
    if (!select || !detailRadio) return;

    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      if (
        String(opt.dataset.variantId) === String(this.currentVariant.id) ||
        opt.value === this.currentVariant.title
      ) {
        select.options[i].selected = true;

        detailRadio.querySelectorAll("fieldset").forEach((fieldset, index) => {
          fieldset.querySelectorAll("input").forEach((input) => {
            input.removeAttribute("checked");
            if (input.value === this.currentVariant[`option${index + 1}`]) {
              input.checked = true;
            }
          });
          const fsSelect = fieldset.querySelector("select");
          const want = this.currentVariant[`option${index + 1}`];
          if (fsSelect && want != null && fsSelect.value !== String(want)) fsSelect.value = want;
        });
        break;
      }
    }
  }
}
customElements.define("variant-radios-detail", VariantRadiosDetail);

class VariantRadiosSingle extends SwatchFunctions {
  constructor() {
    super();
  }
  groupFunctionsAvailable(variantQtyData, target) {
    this.updateVariantInput();
    this.updatePrice(this.productTarget);
    this.renderProductInfor(this.productTarget, variantQtyData);
    this.updateMedia(false, target);
  }
}
customElements.define("variant-radios-single", VariantRadiosSingle);

class VariantGroupDetail extends VariantRadiosDetail {
  constructor() {
    super();
  }

  onVariantChange(e) {
    this.productTarget =
      this.closest(".product__item-js") ||
      (this.dataset.section &&
        document.querySelector(
          `.product__item-js[data-section="${CSS.escape(String(this.dataset.section))}"]`
        ));
    if (!this.productTarget) return;
    let variantQtyData = [];
    try {
      variantQtyData = JSON.parse(
        this.productTarget.querySelector(".productVariantsQty").textContent
      );
    } catch (err) {
      variantQtyData = [];
    }
    this.groupFunctionsInit();

    if (!this.currentVariant) {
      this.groupFunctionsUnavailable(e.target);
      this.checkColorGroup(e);
    } else {
      this.checkColorGroup(e);
      this.updateURL();
      this.updateVariantInput();
      this.updatePrice(this.productTarget);
      this.renderProductInfor(this.productTarget, variantQtyData, e.target);
      this.updateShareUrl();
      this.mapStickyDropdown();
      this.setAvailable();
    }
  }

  checkColorGroup(e) {
    const colorString = this.productTarget.dataset.colorTrigger;
    if (colorString) {
      const colorArray = colorString.split(",");
      const colorSelector = this.productTarget.querySelector(
        `[data-value="${CSS.escape(e.target.value)}"]`
      );
      const dataName = colorSelector?.dataset.name;
      const isColorInput = colorArray.includes(
        dataName ? dataName : e.target.name
      );
      if (isColorInput) {
        const dataValue = colorSelector?.dataset.colorValue;
        this.updateMediaGroup(dataValue ? dataValue : e.target.value);
      } else {
        this.updateMedia();
      }
    }
  }

  updateMediaGroup(altValue) {
    const productHandle = this.dataset.productHandle;
    const desktopLayout = this.productTarget.dataset.desktopLayout;
    const mobileLayout = this.productTarget.dataset.mobileLayout;
    const zoom = this.productTarget.dataset.zoom;
    const sectionId = this.productTarget.dataset.section;
    const zoomAction = this.productTarget.querySelector("zoom-action");
    const elementFeatureProduct = this.productTarget.dataset.typeElement;
    if (!productHandle || !sectionId || !desktopLayout) return;
    if (
      desktopLayout !== "grid_1_column" &&
      desktopLayout !== "grid_2_column" &&
      desktopLayout !== "stack"
    ) {
      fetch(`/products/${productHandle}?section_id=media-gallery-slide`)
        .then((response) => response.text())
        .then((text) => {
          const html = parser.parseFromString(text, "text/html");
          if (!html) return;
          let parentDiv = html.querySelector("slide-with-thumbs");
          parentDiv.classList.add(desktopLayout);
          if (desktopLayout === "thumbnail_left") {
            parentDiv.classList.add(
              "flex-md",
              "gap-10",
              "overflow-hidden",
              "justify-content-right"
            );
          }
          parentDiv.dataset.thumbDirection =
            desktopLayout === "thumbnail_left" ? "vertical" : "horizontal";
          let parentContainer = parentDiv.querySelector(
            ".media-main-swiper .swiper-wrapper"
          );
          let wrapperFeatureProduct =
            this.productTarget.querySelector("slide-with-thumbs");
          let slidePreviewFeatureProduct = wrapperFeatureProduct.querySelector(
            ".media-main-swiper .swiper-wrapper"
          );
          if (zoom === "no_zoom") {
            const noZoomItems = html.querySelectorAll(
              "div.media-gallery__image[data-pane-container]"
            );
            noZoomItems.forEach((item) => {
              if (
                (item.dataset.alt && item.dataset.alt == altValue) ||
                !this.getAllButtonValue().includes(item.dataset.alt)
              ) {
                const mediaDefaultId = item.dataset.media;
                if (mediaDefaultId) {
                  item.setAttribute(
                    "data-media-id",
                    `${sectionId}-${mediaDefaultId}`
                  );
                }
                parentContainer.innerHTML += item.outerHTML;
              }
              if (elementFeatureProduct) {
                slidePreviewFeatureProduct.innerHTML =
                  parentContainer.innerHTML;
                wrapperFeatureProduct.updateSlide();
              }
            });
          } else if (zoom !== "open_lightbox") {
            const driftZoomItems = html.querySelectorAll(
              "div.media-gallery__image[data-pane-container]"
            );
            driftZoomItems.forEach((item) => {
              if (
                (item.dataset.alt && item.dataset.alt == altValue) ||
                !this.getAllButtonValue().includes(item.dataset.alt)
              ) {
                const mediaDefaultId = item.dataset.media;
                if (mediaDefaultId) {
                  item.setAttribute(
                    "data-media-id",
                    `${sectionId}-${mediaDefaultId}`
                  );
                }
                parentDiv.querySelector(".swiper-wrapper").innerHTML +=
                  item.outerHTML;
              }
            });
          } else {
            const zoomItems = html.querySelectorAll("a.media-gallery__image");
            zoomItems.forEach((item) => {
              if (
                (item.dataset.alt && item.dataset.alt == altValue) ||
                !this.getAllButtonValue().includes(item.dataset.alt)
              ) {
                const mediaDefaultId = item.dataset.media;
                if (mediaDefaultId) {
                  item.setAttribute(
                    "data-media-id",
                    `${sectionId}-${mediaDefaultId}`
                  );
                }
                parentContainer.innerHTML += item.outerHTML;
              }
            });
          }
          if (desktopLayout !== "hidden_thumbnail") {
            let thumbHtml = html.querySelector(
              ".media-gallery__append .media-thumb-swiper"
            );
            let thumbHtmlWrapper = thumbHtml.querySelector(".swiper-wrapper");
            let thumbHtmlFeatureProduct = wrapperFeatureProduct.querySelector(
              ".media-thumb-swiper .swiper-wrapper"
            );
            if (!thumbHtml || !thumbHtmlFeatureProduct) return;
            if (mobileLayout !== "show_thumbnails") {
              thumbHtml
                .querySelector(".thumbnail-slide")
                .classList.add("thumbnail-slide__mobile--hidden");
              parentDiv.innerHTML +=
                html.querySelector(".swiper-pagination").outerHTML;
            }
            if (desktopLayout === "thumbnail_bottom") {
              thumbHtml
                .querySelector(".thumbnail-slide")
                .classList.add("mt-10", "thumb-bottom");
              thumbHtml
                .querySelector(".thumbnail-slide")
                .setAttribute("style", "--gap: 15px");
            }
            if (desktopLayout === "thumbnail_left") {
              thumbHtml.classList.add("mt-10");
              if (
                thumbHtml
                  .querySelector(".thumbnail-slide")
                  ?.classList.contains("swiper-horizontal")
              ) {
                thumbHtml
                  .querySelector(".thumbnail-slide")
                  ?.classList.remove("swiper-horizontal");
                thumbHtml
                  .querySelector(".thumbnail-slide")
                  ?.classList.add("swiper-vertical");
              }
            }
            const noZoomItems = html.querySelectorAll(
              "div.media-gallery__image:not([data-pane-container])"
            );
            noZoomItems.forEach((item) => {
              if (
                (item.dataset.alt && item.dataset.alt == altValue) ||
                !this.getAllButtonValue().includes(item.dataset.alt)
              ) {
                const mediaDefaultId = item.dataset.media;
                if (mediaDefaultId) {
                  item.setAttribute(
                    "data-media-id",
                    `${sectionId}-${mediaDefaultId}`
                  );
                }
                thumbHtmlWrapper.innerHTML += item.outerHTML;
              }
            });
            parentDiv.innerHTML += thumbHtml.outerHTML;
            if (elementFeatureProduct) {
              thumbHtmlFeatureProduct.innerHTML = thumbHtmlWrapper.innerHTML;
              wrapperFeatureProduct.updateThumbSlide();
            }
          } else {
            parentDiv.innerHTML +=
              html.querySelector(".swiper-pagination").outerHTML;
          }
          if (!zoomAction) return;
          zoomAction.innerHTML = parentDiv.outerHTML;
          zoomAction.drift = null;
        })
        .finally(() => {
          this.updateMedia(true);
          BlsLazyloadImg.init();
          if (!zoomAction) return;
          if (zoom !== "open_lightbox" && zoom !== "no_zoom") {
            zoomAction.initDrift();
          }
          if (zoom === "open_lightbox" && zoom !== "no_zoom") {
            zoomAction.initLightBox();
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      fetch(`/products/${productHandle}?section_id=media-gallery-grid`)
        .then((response) => response.text())
        .then((text) => {
          const html = parser.parseFromString(text, "text/html");
          if (!html) return;
          let parentDiv = document.createElement("div");
          if (desktopLayout === "stack") {
            parentDiv.classList.add(
              "stacked",
              "grid",
              "gap-10",
              "grid_scroll",
              "grid-cols"
            );
          }
          if (
            desktopLayout === "grid_1_column" ||
            desktopLayout === "grid_2_column"
          ) {
            parentDiv.classList.add("grid-cols", "grid", "gap", "grid_scroll");
          }
          if (
            desktopLayout === "stack" ||
            desktopLayout === "grid_1_column" ||
            desktopLayout === "grid_2_column"
          ) {
            parentDiv.id = `GalleryViewer-${sectionId}`;
          }
          if (desktopLayout === "grid_1_column") {
            parentDiv.setAttribute(
              "style",
              "--col-number: 1;--col-desktop: 1;--col-tablet: 1;--col-gap: 10px;"
            );
          }
          if (desktopLayout === "grid_2_column" || desktopLayout === "stack") {
            if (window.innerWidth > 768) {
              parentDiv.setAttribute(
                "style",
                "--col-number: 2;--col-tablet: 2;--col-gap: 10px;"
              );
            } else {
              parentDiv.setAttribute(
                "style",
                "--col-number: 1.2;--col-tablet: 2;--col-gap: 10px;"
              );
            }
          }
          if (zoom === "no_zoom") {
            const noZoomItems = html.querySelectorAll(
              "div.media-gallery__image:not([data-pane-container])"
            );
            noZoomItems.forEach((item) => {
              if (
                (item.dataset.alt && item.dataset.alt == altValue) ||
                !this.getAllButtonValue().includes(item.dataset.alt)
              ) {
                const mediaDefaultId = item.dataset.media;
                if (mediaDefaultId) {
                  item.setAttribute(
                    "data-media-id",
                    `${sectionId}-${mediaDefaultId}`
                  );
                }
                parentDiv.innerHTML += item.outerHTML;
              }
            });
            if (elementFeatureProduct) {
              const wrapperGrid = this.productTarget.querySelector(
                `#GalleryViewer-${sectionId}`
              );
              wrapperGrid.innerHTML = parentDiv.innerHTML;
            }
          } else if (zoom !== "open_lightbox") {
            const driftZoomItems = html.querySelectorAll(
              "div.media-gallery__image[data-pane-container]"
            );
            driftZoomItems.forEach((item) => {
              if (
                (item.dataset.alt && item.dataset.alt == altValue) ||
                !this.getAllButtonValue().includes(item.dataset.alt)
              ) {
                const mediaDefaultId = item.dataset.media;
                if (mediaDefaultId) {
                  item.setAttribute(
                    "data-media-id",
                    `${sectionId}-${mediaDefaultId}`
                  );
                }
                parentDiv.innerHTML += item.outerHTML;
              }
            });
          } else {
            const zoomItems = html.querySelectorAll("a.media-gallery__image");
            zoomItems.forEach((item) => {
              if (
                (item.dataset.alt && item.dataset.alt == altValue) ||
                !this.getAllButtonValue().includes(item.dataset.alt)
              ) {
                const mediaDefaultId = item.dataset.media;
                if (mediaDefaultId) {
                  item.setAttribute(
                    "data-media-id",
                    `${sectionId}-${mediaDefaultId}`
                  );
                }
                parentDiv.innerHTML += item.outerHTML;
              }
            });
          }
          if (!zoomAction) return;
          zoomAction.innerHTML = parentDiv.outerHTML;
          zoomAction.drift = null;
        })
        .finally(() => {
          this.updateMedia(true);
          BlsLazyloadImg.init();
          if (!zoomAction) return;
          if (zoom !== "open_lightbox" && zoom !== "no_zoom") {
            zoomAction.initDrift();
          }
          if (zoom === "open_lightbox" && zoom !== "no_zoom") {
            zoomAction.initLightBox();
          }
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }
  getAllButtonValue() {
    const buttonArray = [];
    this.querySelectorAll(
      ".product__color-swatches--js, .product-sticky-js"
    ).forEach((btn) => {
      if (
        btn.classList.contains("product__color-swatches--js") &&
        btn.dataset.value
      ) {
        buttonArray.push(btn.dataset.value);
      } else if (
        btn.classList.contains("product-sticky-js") &&
        btn.dataset.colorValue
      ) {
        buttonArray.push(btn.dataset.colorValue);
      }
    });
    return buttonArray;
  }
}
customElements.define("variant-group-detail", VariantGroupDetail);

class VariantRadiosSticky extends VariantRadiosDetail {
  constructor() {
    super();
  }
}
customElements.define("variant-radios-sticky", VariantRadiosSticky);

class VariantGroupSticky extends VariantGroupDetail {
  constructor() {
    super();
  }
}
customElements.define("variant-group-sticky", VariantGroupSticky);

class CountdownTimer extends HTMLElement {
  static get observedAttributes() { return ['data-minutes-left', 'data-endtime', 'data-timeout-message', 'data-format']; }
  constructor() {
    super();
    this.interval = null;
  }
  connectedCallback() {
    if (this.pendingTimerInit) return;
    this.pendingTimerInit = true;
    queueMicrotask(() => {
      this.pendingTimerInit = false;
      if (!this.isConnected) return;
      this.timeoutMessage = this.dataset.timeoutMessage;
      this.format = this.dataset.format || "dd:hh:mm:ss";
      this.init();
    });
  }
  disconnectedCallback() {
    clearInterval(this.interval);
  }
  attributeChangedCallback() {
    if (this.isConnected) this.connectedCallback();
  }
  init() {
    clearInterval(this.interval);
    const cddl = this.dataset?.endtime;

    const minutesLeft = this.dataset.minutesLeft;
    const countdownAppend = this.querySelector(".countdown-inner");
    if (countdownAppend) {
      countdownAppend.innerHTML = this.appendChildHtml(minutesLeft).innerHTML;
    } else {
      this.innerHTML = this.appendChildHtml(minutesLeft).innerHTML;
    }

    if (cddl) {
      let isoDate = "";
      if (this.isISODate(cddl)) {
        isoDate = cddl;
        this.mainFunction(isoDate, minutesLeft);
      } else {
        if (this.isValidDateTime(cddl)) {
          isoDate = new Date(cddl).toISOString();
          this.mainFunction(isoDate, minutesLeft);
        } else if (this.isValidDate(cddl)) {
          const dateParts = cddl.split("-");
          isoDate =
            dateParts[2] +
            "-" +
            dateParts[0].padStart(2, "0") +
            "-" +
            dateParts[1].padStart(2, "0") +
            "T00:00:00Z";
          this.mainFunction(isoDate, minutesLeft);
        } else {
          this.mainFunction(isoDate, minutesLeft);
        }
      }
    } else {
      let isoDate = "";
      this.mainFunction(isoDate, minutesLeft);
    }
  }

  mainFunction(isoDate, minutesLeft) {
    let timeLeft = {};
    const calculateTimeLeft = (difference) => {
      let timeLeft = {};

      if (this.format.includes("dd")) {
        timeLeft.days_timer = Math.floor(difference / (1000 * 60 * 60 * 24));
      }

      if (this.format.includes("hh")) {
        if (this.format.includes("dd")) {
          timeLeft.hours_timer = Math.floor(
            (difference / (1000 * 60 * 60)) % 24
          );
        } else {
          timeLeft.hours_timer = Math.floor(difference / (1000 * 60 * 60));
        }
      }

      if (this.format.includes("mm")) {
        if (this.format === "mm:ss") {
          timeLeft.minutes_timer = Math.floor(difference / 1000 / 60);
        } else {
          timeLeft.minutes_timer = Math.floor((difference / 1000 / 60) % 60);
        }
      }

      if (this.format.includes("ss")) {
        timeLeft.seconds_timer = Math.floor((difference / 1000) % 60);
      }

      return timeLeft;
    };

    if (Date.parse(isoDate) || minutesLeft) {
      let deadline = new Date(isoDate);
      if (minutesLeft) {
        deadline = new Date(Date.now() + parseInt(minutesLeft) * 60000);
      }
      const updateCountdown = () => {
        // A timer whose element was replaced (cart drawer redraw) stops,
        // instead of ticking forever on a detached copy.
        if (this.isConnected) this._wasConnected = true;
        else if (this._wasConnected) { clearInterval(this.interval); return; }
        const now = new Date();
        const difference = deadline - now;
        if (difference > 0) {
          timeLeft = calculateTimeLeft(difference);
        } else {
          timeLeft = calculateTimeLeft(0);
        }

        if (
          timeLeft.days_timer > 0 ||
          timeLeft.hours_timer > 0 ||
          timeLeft.minutes_timer > 0 ||
          timeLeft.seconds_timer > 0 ||
          !this.timeoutMessage
        ) {
          Object.entries(timeLeft).forEach(([key, value]) => {
            const slot = this.querySelector("." + key);
            if (slot) {
              const text = value.toString().padStart(2, "0");
              // Only digits that changed are written.
              if (slot.textContent !== text) slot.textContent = text;
            }
          });
        } else if (this.timeoutMessage) {
          this.innerHTML = this.timeoutMessage;
          clearInterval(this.interval);
        } else {
          clearInterval(this.interval);
        }
        // Touch the class lists only when they change: each write is a
        // mutation every page-wide class observer hears, once a second.
        if (this.classList.contains("hidden")) this.classList.remove("hidden");
        const badgesCountdown = this.closest(".product__badges-sale-countdown");
        if (badgesCountdown && (badgesCountdown.classList.contains("hidden") || !badgesCountdown.classList.contains("inline-flex"))) {
          badgesCountdown.classList.remove("hidden");
          badgesCountdown.classList.add("inline-flex");
        }
      };
      this.interval = setInterval(updateCountdown, 1000);
      // Chạy ngay lập tức để tránh bị trễ
      updateCountdown();
    } else {
      timeLeft = calculateTimeLeft(0);
      Object.entries(timeLeft).forEach(([key, value]) => {
        if (this.querySelector("." + key)) {
          this.querySelector("." + key).innerHTML = value
            .toString()
            .padStart(2, "0");
        }
      });
    }
  }

  appendChildHtml(minutesLeft) {
    const days = this.dataset?.days;
    const hours = this.dataset?.hours;
    const mins = this.dataset?.mins;
    const secs = this.dataset?.secs;
    const container = document.createElement("div");
    container.innerHTML = `${
      !minutesLeft
        ? `${
            this.format.includes("dd")
              ? `<div class="countdown--container"><span class="days_timer count-timer"></span><span class="timer_announcementbar--text"> ${
                  days ? days : ""
                }</span></div>`
              : ""
          }${
            this.format.includes("hh")
              ? `<div class="countdown--container"><span class="hours_timer count-timer"></span><span class="timer_announcementbar--text"> ${
                  hours ? hours : ""
                }</span></div>`
              : ""
          }`
        : ""
    }<div class="countdown--container"><span class="minutes_timer count-timer"></span><span class="timer_announcementbar--text">${
      minutesLeft ? "m" : mins ? " " + mins : ""
    }</span></div><div class="countdown--container"><span class="seconds_timer count-timer"></span><span class="timer_announcementbar--text">${
      minutesLeft ? "s" : secs ? " " + secs : ""
    }</span></div>`;
    return container;
  }
  isISODate(dateString) {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    return isoRegex.test(dateString);
  }
  isValidDateTime(dateString) {
    const dateTimeRegex = /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/;
    return dateTimeRegex.test(dateString);
  }
  isValidDate(dateString) {
    var regex = /^\d{2}-\d{2}-\d{4}$/;
    if (regex.test(dateString)) {
      return true;
    } else {
      return false;
    }
  }
}
customElements.define("countdown-timer", CountdownTimer);

// js for product form - not done yet
if (!customElements.get("product-form")) {
  customElements.define(
    "product-form",
    class ProductForm extends PopupBase {
      constructor() {
        super();
        this.form = this.querySelector("form");
        this.form.querySelector("[name=id]").disabled = false;
        this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
        this.cart =
          document.querySelector("cart-notification") ||
          document.querySelector("cart-drawer");
        this.submitButton = this.querySelector('[type="submit"]');
        this.hideErrors = this.dataset.hideErrors === "true";
        this.productItem =
          this.form.closest(".product-item") ||
          this.form.closest("sticky-add-cart");
        this.cartPage = document.body.classList.contains("template-cart");
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute("aria-disabled") === "true") return;
        // Editor updates can replace or remove the drawer after this form mounted.
        this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');

        this.handleErrorMessage();
        this.submitButton.setAttribute("aria-disabled", true);
        const cartRecommend = document.querySelector(".cart-recommend");
        if (cartRecommend && cartRecommend.classList.contains("open")) {
          cartRecommend.classList.remove("open");
        }
        this.submitButton.classList.add("loading");
        const config = fetchConfig("javascript");
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        delete config.headers["Content-Type"];

        const formData = new FormData(this.form);
        const productInfo = this.form.closest(".product-detail__information");
        if (productInfo) {
          productInfo
            .querySelectorAll("product-property input")
            .forEach((property) => {
              if (property.classList.contains("file") && property.files[0]) {
                formData.append(property.name, property.files[0]);
              } else if (
                property.classList.contains("text") &&
                property.value
              ) {
                formData.append(property.name, property.value);
              }
            });
        }
        if (this.cart) {
          formData.append(
            "sections",
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append("sections_url", window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        if (this.cartPage) {
          formData.append(
            "sections",
            this.getMainCartSectionRender().map((section) => section.id)
          );
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: "product-form",
                productVariantId: formData.get("id"),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);
              if (this.productItem) {
                this.handleErrorMessagePopup(response.description);
              }
              return;
            } else if (response.sections) {
              if (!response.id && !response.items) {
                this.handleErrorMessagePopup(window.cartStrings.error);
                return;
              }
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            fetch("/cart.json")
              .then((res) => res.json())
              .then((cart) => {
                if (cart.item_count != undefined) {
                  document.querySelectorAll(".cart-count").forEach((el) => {
                    if (el.classList.contains("cart-count-drawer")) {
                      el.innerHTML = `(${cart.item_count})`;
                    } else {
                      el.innerHTML =
                        cart.item_count > 100 ? "~" : cart.item_count;
                    }
                  });
                  if (document.querySelector("header-total-price")) {
                    document
                      .querySelector("header-total-price")
                      .updateTotal(cart);
                  }
                  const cart_free_ship = document.querySelector(
                    "free-ship-progress-bar"
                  );
                  if (cart_free_ship) {
                    cart_free_ship.init(cart.items_subtotal_price);
                  }
                }
              })
              .catch((error) => {
                throw error;
              });

            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: "product-form",
              productVariantId: formData.get("id"),
              cartData: response,
            });
            const modalQuickview = document.querySelector(
              ".tingle-modal--visible.tingle-modal.quickview .tingle-modal__close"
            );
            const modalShopableVideo = document.querySelector(
              ".tingle-modal--visible.tingle-modal.shopable-video .tingle-modal__close"
            );
            let time = 0;
            if (modalQuickview || modalShopableVideo) {
              if (
                document.documentElement
                  .querySelector("body")
                  .classList.contains("tingle-enabled")
              ) {
                document.documentElement
                  .querySelector("body")
                  .classList.remove("tingle-enabled");
              }
              if (modalShopableVideo) {
                time += 250;
                modalShopableVideo.click();
              }
              if (modalQuickview) {
                time += 250;
                modalQuickview.click();
              }
            }
            if (!this.cartPage) {
              if (!response.errors) {
                this.cart.getSectionsToRender().forEach((section) => {
                  const elementToReplace = document.getElementById(section.id);
                  const html = new DOMParser().parseFromString(
                    response.sections[section.id],
                    "text/html"
                  );
                  if (elementToReplace) {
                    const incoming = html.querySelector("#minicart-form");
                    if (incoming && !window.materiaPatchDrawerCart?.(elementToReplace,incoming)) elementToReplace.innerHTML = incoming.innerHTML;
                  }
                });
                this.cart.cartAction();
                if (this.cart && this.cart.classList.contains("is-empty")) {
                  this.cart.classList.remove("is-empty");
                }

                setTimeout(() => {
                  this.submitButton.classList.remove("loading");
                  this.submitButton.removeAttribute("aria-disabled");
                  this.cart.open();
                  const cartRecommend =
                    document.querySelector(".cart-recommend");
                  if (
                    cartRecommend &&
                    !cartRecommend.classList.contains("hidden-recommend")
                  ) {
                    if (
                      cartRecommend.classList.contains("cart-recommend-custom")
                    ) {
                      const cartUpsellItem =
                        document.querySelectorAll(".cart-upsell-item");
                      const cartUpsellSlide = document.querySelectorAll(
                        ".swiper-cart-upsell .swiper-slide"
                      );
                      if (cartUpsellItem.length > 0) {
                        requestAnimationFrame(function () {
                          if (cartRecommend.isConnected) cartRecommend.classList.add("open");
                        });
                      } else if (cartUpsellSlide.length === 0) {
                        cartRecommend.classList.remove("block");
                        cartRecommend.classList.add("hidden");
                      }
                    } else {
                      requestAnimationFrame(function () {
                        if (cartRecommend.isConnected) cartRecommend.classList.add("open");
                      });
                    }
                  }
                }, time);
              }
            } else {
              if (!response.errors) {
                this.getMainCartSectionRender().forEach((section) => {
                  if (section.selector != undefined) {
                    const elementToReplace =
                      document
                        .getElementById(section.id)
                        .querySelector(section.selector) ||
                      document.getElementById(section.id);
                    elementToReplace.innerHTML = this.getSectionInnerHTML(
                      response.sections[section.id],
                      section.selector
                    );
                    const cart_gift_html = new DOMParser()
                      .parseFromString(
                        response.sections[section.id],
                        "text/html"
                      )
                      .querySelector("#gift");
                    const cart_gift = document.getElementById("gift");
                    if (cart_gift) {
                      cart_gift.innerHTML = cart_gift_html.innerHTML;
                      const gift_form_minicart =
                        document.getElementById("gift_form_minicart");
                      if (gift_form_minicart) {
                        gift_form_minicart.addEventListener(
                          "change",
                          (event) => {
                            if (event.currentTarget.checked) {
                              this.addGiftwrapCartClick(gift_form_minicart);
                            } else {
                              this.updateQuantity(
                                event.currentTarget.dataset.index,
                                0
                              );
                            }
                          }
                        );
                      }
                    }
                  }
                });
                var wrapperDiv = document.createElement("div");
                var messageDiv = document.createElement("div");
                messageDiv.className = `mt-10 newsletter-form__message--success success form__message inline-flex align-center`;
                messageDiv.setAttribute("tabindex", "-1");
                messageDiv.innerHTML = `
               <svg width="18" height="18" fill="none">
              <g stroke="#137F24" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.3"><path d="m6.033 8.992 1.972 1.98 3.952-3.96"/><path d="M7.973 1.178c.565-.482 1.49-.482 2.062 0l1.293 1.113c.245.213.704.385 1.03.385h1.392c.867 0 1.579.712 1.579 1.579v1.39c0 .32.172.786.384 1.032l1.113 1.292c.483.565.483 1.49 0 2.062l-1.113 1.293a1.813 1.813 0 0 0-.384 1.03v1.392c0 .867-.712 1.579-1.58 1.579h-1.39c-.32 0-.786.172-1.031.384l-1.293 1.113c-.564.483-1.489.483-2.062 0L6.681 15.71a1.813 1.813 0 0 0-1.031-.384H4.234c-.867 0-1.579-.712-1.579-1.58v-1.398c0-.32-.172-.778-.376-1.023l-1.105-1.301c-.474-.565-.474-1.48 0-2.045L2.28 6.677c.204-.246.376-.704.376-1.023V4.247c0-.868.712-1.58 1.58-1.58H5.65c.319 0 .785-.171 1.03-.384l1.293-1.105Z"/></g>
            </svg>
              `;
                var span = document.createElement("span");
                span.className = "ml-5";
                span.textContent = window.variantStrings.addSuccess;
                messageDiv.appendChild(span);
                wrapperDiv.appendChild(messageDiv);
                if (this.cartPage) {
                  showToast(wrapperDiv.innerHTML, 3000, "modal-success");
                }

                const totals = this.getSectionInnerHTML(
                  response.sections["main-cart-items"],
                  ".cart-info .totals"
                );
                const totals_content =
                  document.querySelector(".cart-info .totals");
                if (totals && totals_content) totals_content.innerHTML = totals;
              }
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.cart?.removeAttribute("aria-busy");
            requestAnimationFrame(() => BlsLazyloadImg.init());
            if (document.documentElement.classList.contains("open-popup")) {
              document.documentElement.classList.remove("open-popup");
            }
            this.submitButton.classList.remove("loading");
            if (this.cart && this.cart.classList.contains("is-empty"))
              this.cart.classList.remove("is-empty");
            this.submitButton.removeAttribute("aria-disabled");
          });
      }

      getMainCartSectionRender() {
        return [
          {
            id: "main-cart-items",
            section: document.getElementById("main-cart-items")?.dataset.id,
            selector: ".js-contents",
          },
        ];
      }

      getSectionInnerHTML(html, selector) {
        return new DOMParser()
          .parseFromString(html, "text/html")
          .querySelector(selector).innerHTML;
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector(".product-form__error-message-wrapper");
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector(
            ".product-form__error-message"
          );

        this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      handleErrorMessagePopup(errorMessage = false) {
        const url = `${window.location.pathname}?section_id=form-message`;
        fetch(url)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(
              responseText,
              "text/html"
            );
            const elementErrorMessage = html.querySelector(
              ".product-form__error-message-wrapper"
            );
            const elementMessage = elementErrorMessage.querySelector(
              ".product-form__error-message"
            );
            elementMessage.textContent = errorMessage;
            showToast(elementErrorMessage.innerHTML, 3000, "modal-error");
          })
          .catch((e) => {
            throw e;
          });
      }
    }
  );
}

// js loadmor product for collection and section product grid
class Loadmore extends HTMLElement {
  constructor() {
    super();
    this.button = this.querySelector("button");
    this.collectionUrl = this.dataset.collectionUrl;
    this.sectionId = this.dataset.sectionId;
    this.all = this.dataset.allProducts;
    this.limit = this.dataset.limit;
    this.blockId = this.dataset.blockId;
    this.init();
  }
  init() {
    const _this = this;
    if (!this.button) return;
    this.button.addEventListener("click", function () {
      _this.scanData();
    });
  }
  scanData() {
    const _this = this;
    let url = this.dataset.url;
    if (!url) return;
    let sectionContainer = document.querySelector(
      `#shopify-section-${this.sectionId}`
    );
    sectionContainer?.classList.add("bls-image-js");
    this.querySelector("button").classList.add("loading");
    fetch(this.collectionUrl + url + `&section_id=${this.sectionId}`)
      .then((response) => response.text())
      .then((text) => {
        const html = parser.parseFromString(text, "text/html");
        let parentDiv = this.closest(".sec__products-loadmore");
        if (!parentDiv) return;
        let elements,
          itemDiv,
          fetchDiv,
          page,
          times,
          limit,
          remainder,
          end_load;
        if (this.blockId) {
          itemDiv = parentDiv.querySelector(
            `.collection-tab-${this.blockId} .product-ajax__append`
          );
          fetchDiv = html.querySelector(
            `.sec__products-loadmore .collection-tab-${this.blockId} .product-ajax__append`
          );
          elements = fetchDiv.querySelectorAll(".grid-custom-item");
        } else {
          itemDiv = parentDiv.querySelector(".product-ajax__append");
          fetchDiv = html.querySelector(
            ".sec__products-loadmore .product-ajax__append"
          );
          elements = fetchDiv.querySelectorAll(".grid-custom-item");
        }
        if (!itemDiv || !fetchDiv) return;
        page = Number(this.dataset.url.replace("?page=", ""));
        times = page * this.limit;
        limit = this.limit;
        end_load = false;
        if (times >= this.all) {
          end_load = true;
          limit = this.limit - (times - this.all);
        }
        elements.forEach((prodNode, index) => {
          index = index + 1;
          if (end_load && limit < index) {
            return;
          }
          itemDiv.appendChild(prodNode);
        });
      })
      .finally(() => {
        _this.updateUrl(Number(this.dataset.url.replace("?page=", "")));
        this.querySelector("button")?.classList.remove("loading");
        BlsAnimations.init();
        initLazyloadItem();
        BlsLazyloadImg.init();
      })
      .catch((e) => {
        console.error(e);
      });
  }
  updateUrl(e) {
    if (this.all && this.limit && this.all > 0) {
      const times = ~~(this.all / this.limit);
      const remainder = this.all % this.limit;
      let pages = times;
      if (remainder > 0) {
        pages = times + 1;
      }
      if (e < pages) {
        this.dataset.url = "?page=" + ++e;
      } else {
        const btn = this.querySelector("button");
        if (btn) {
          btn.remove();
        }
      }
    }
  }

  handleCountItemToShow(pages) {
    if (this.all && this.limit && pages) {
      if (Number(this.all) < Number(this.limit) * pages) {
        const itemsNeedToRemove = Number(this.limit) * pages - Number(this.all);
        return itemsNeedToRemove;
      }
    }
    return 0;
  }
}
customElements.define("loadmore-function", Loadmore);

// js lookbook item
class LookbookItem extends HTMLElement {
  constructor() {
    super();
    this.itemPopup = this.querySelector(".lookbook-item__popup");
    this.type = this.dataset.type;
    this.position = this.dataset.productPosition;
    this.lookbookProductDiv = this.closest(".sec__lookbook-product");
    this.instagramShop = this.closest(".popup-content");
    this.allDots = this.closest(".sec__lookbook-product");
    this.currentAnimation = null;
    this.activeTooltip = null;
    this.isAnimating = false;
    this.init();
    document.body.addEventListener("click", this.onClickOutside.bind(this));
  }
  init() {
    if (this.type === "open" || this.type === "slide") {
      const atag = this.querySelector("a");
      if (!atag) return;
      atag.addEventListener("click", this.onClick.bind(this));
      this.addEventListener("mouseover", this.onMouseoverPopup.bind(this));
      this.addEventListener("mouseleave", this.hideProductInfo.bind(this));
      const closeButton = this.querySelector("icon-close");
      if (!closeButton) return;
      closeButton.addEventListener("click", this.onClose.bind(this));
    }
  }
  onClickOutside(event) {
    if (!event.target.closest("lookbook-item")) {
      this.onClose();
    }
  }
  onClick() {
    if (this.type === "open") {
      if (this.itemPopup) {
        const thisSection = this.closest("section");
        if (!thisSection) return;
        const allPopups = thisSection.querySelectorAll(".lookbook-item__popup");
        if (window.innerWidth >= 1024) {
          allPopups.forEach((popup) => {
            if (popup !== this.itemPopup) {
              popup.classList.add("invisible");
              const thisClosest = popup.closest("lookbook-item");
              if (thisClosest) {
                thisClosest.classList.remove("open");
              }
            }
          });
          this.onToggle();
        } else {
          const modal = new tingle.modal({
            footer: false,
            stickyFooter: false,
            closeMethods: ["overlay", "button", "escape"],
            closeLabel: "Close",
            cssClass: ["lookbook-modal"],
            onOpen: function () {},
            onClose: function () {},
            beforeClose: function () {
              return true;
            },
          });
          modal.setContent(
            this.itemPopup.querySelector(".product-item").innerHTML
          );
          modal.open();
        }
      }
    } else {
      if (this.lookbookProductDiv && this.position) {
        const slideSEction = this.lookbookProductDiv.querySelector(
          "slide-section-lookbook"
        );
        const allDots = this.lookbookProductDiv.querySelectorAll(
          `lookbook-item[data-type="slide"]`
        );
        allDots.forEach((dot) => {
          dot.classList.remove("active");
        });
        this.classList.add("active");
        if (slideSEction) {
          slideSEction.functionGoto(this.position);
        }
      } else if (this.instagramShop && this.position) {
        const slideSEction = this.instagramShop.querySelector(
          "slide-section-instagram"
        );
        if (slideSEction) {
          slideSEction.functionGoto(this.position);
        }
        const allDots = this.instagramShop.querySelectorAll(
          `lookbook-item[data-type="slide"]`
        );
        allDots.forEach((dot) => {
          dot.classList.remove("active");
        });
        this.classList.add("active");
      }
    }
  }
  onToggle() {
    this.itemPopup?.classList.toggle("invisible");
    this.classList.toggle("open");
  }
  onClose() {
    this.itemPopup?.classList.add("invisible");
    this.classList.remove("open");
  }
  onMouseoverPopup(e) {
    const _this = this;
    if (window.innerWidth < 1024) return;
    _this.showProductInfo(this);
  }
  showProductInfo(container) {
    const existingTooltip = document.querySelector(".product-tooltip");
    if (existingTooltip) {
      return;
    }

    if (this.isAnimating) {
      this.forceCleanupTooltips();
    }
    const template = container.querySelector("template");
    const content = document.createElement("div");
    content.className = "product-tooltip";
    content.appendChild(template.content.firstElementChild.cloneNode(true));

    content.style.opacity = "0";
    content.style.transform = "translateY(20px)";

    const tooltip = document.body.appendChild(content);
    this.activeTooltip = tooltip;

    const triggerRect = container.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth;
    tooltip.style.zIndex = "9999";
    tooltip.style.left =
      24 + triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2 + "px";
    tooltip.style.top = triggerRect.bottom + 10 + window.scrollY + "px";

    tooltip.setAttribute("tabindex", "-1");

    setTimeout(() => {
      if (this.activeTooltip === tooltip) {
        this.isAnimating = true;
        this.currentAnimation = Motion.animate(
          tooltip,
          {
            opacity: 1,
            y: 0,
          },
          {
            duration: 0.2,
            easing: "ease-out",
            onComplete: () => {
              tooltip
                .querySelector(".lookbook-item__hover")
                .classList.add("active");
              this.isAnimating = false;
              this.currentAnimation = null;
            },
          }
        );
      }
    }, 10);
  }
  forceCleanupTooltips() {
    const tooltips = document.querySelectorAll(".product-tooltip");
    tooltips.forEach((tooltip) => {
      if (tooltip.parentNode) {
        Motion.animate(
          tooltip,
          {
            opacity: 0,
            y: 20,
          },
          {
            duration: 0.3,
            easing: "ease-in",
            onComplete: () => {
              if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
              }
            },
          }
        );
      }
    });

    if (this.currentAnimation) {
      this.currentAnimation.cancel();
      this.currentAnimation = null;
    }
    this.isAnimating = false;
    this.activeTooltip = null;
  }
  hideProductInfo() {
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
      this.currentAnimation = null;
    }

    const tooltip = document.querySelector(".product-tooltip");
    if (tooltip) {
      if (this.isAnimating) {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
        this.isAnimating = false;
        this.activeTooltip = null;
        return;
      }

      this.isAnimating = true;
      this.currentAnimation = Motion.animate(
        tooltip,
        {
          opacity: 0,
          y: 20,
        },
        {
          duration: 0.2,
          easing: "ease-in",
          onComplete: () => {
            if (tooltip.parentNode) {
              tooltip.parentNode.removeChild(tooltip);
            }
            this.isAnimating = false;
            this.currentAnimation = null;
            this.activeTooltip = null;
          },
        }
      );
    }
  }
}
customElements.define("lookbook-item", LookbookItem);

// js lookbook item
class SectionSlideLookbook extends SlideSection {
  constructor() {
    super();
    this.init();
  }
  init() {
    this.initSlide();
  }
  functionGoto(position) {
    this.globalSlide.slideTo(position - 1, 500);
  }
}
customElements.define("slide-section-lookbook", SectionSlideLookbook);

class SectionSlideInstagramShop extends SlideSection {
  constructor() {
    super();
    this.init();
  }
  init() {
    this.initSlide();
  }
  functionGoto(position) {
    this.globalSlide.slideTo(position - 1, 500);
  }
}
customElements.define("slide-section-instagram", SectionSlideInstagramShop);

// js for tab item
class TabItems extends HTMLElement {
  constructor() {
    super();
    this.tabs = this.querySelectorAll(".collection-tab__tab-item");
    this.select = this.querySelector(".select-collection-tab");
    this.content = this.querySelectorAll(".collection-tab__tab-content");
    this.select_li = this.querySelectorAll(".collection_title_input");
    this.type = this.dataset.type;
    this.init();
  }
  init() {
    if (this.type === "horizontal") {
      const self = this;
      this.tabs.forEach((tab) => {
        tab.addEventListener("click", function () {
          self.onClick(this);
        });
      });
    } else {
      const self = this;
      this.select.addEventListener("click", function (e) {
        if (e.target.classList.contains("select__selected_title")) {
          let select__dropdown = this.querySelector(".select-custom__content");
          this.classList.toggle("active");
          select__dropdown.classList.toggle("invisible");
        }
      });
      document.addEventListener("click", function (event) {
        if (!event.target.closest(".select-collection-tab")) {
          self.select.classList.remove("active");
          document
            .querySelectorAll(".select-collection-tab .select-custom__content")
            ?.forEach((item) => {
              item.classList.add("invisible");
            });
        }
      });
      this.select_li.forEach((item) => {
        item.addEventListener("click", function () {
          self.onClickBySelect(this);
          self.select.classList.remove("active");
          document
            .querySelectorAll(".select-collection-tab .select-custom__content")
            ?.forEach((item) => {
              item.classList.add("invisible");
            });
        });
      });
    }
  }
  onClick(tab) {
    const blockId = tab.dataset.blockId;
    this.showContent(blockId);
    this.tabs.forEach((t) => {
      t.classList.remove("active");
    });
    tab.classList.add("active");
  }

  onClickBySelect(selectedBlockId) {
    let select__selected_title = this.querySelector(".select__selected_title");
    select__selected_title.innerHTML =
      selectedBlockId.innerHTML +
      `<svg class="icon-down transition active-rotated" width="10" height="6">
    <use href="#icon-arrow-down"></use>
  </svg>`;
    this.showContent(selectedBlockId.dataset.id);
  }

  showContent(blockId) {
    this.content.forEach((content) => {
      if (content.dataset.blockId === blockId) {
        content.classList.add("active");
        let motion_element = content.querySelectorAll("motion-element");
        motion_element.forEach((motion) => {
          Motion.refreshAnimation();
        });
      } else {
        content.classList.remove("active");
      }
    });
  }
}
customElements.define("tab-items", TabItems);

// js for shopable video
class ShopableVideo extends PopupBase {
  constructor() {
    super();
    this.popupDiv = this.querySelector(".video-item__popup");
    this.productPopupDiv = this.querySelector(".video-item__product-mobile");
    this.init();
  }
  init() {
    if (this.popupDiv || !this.classList.contains("instagram-item")) {
      window.addEventListener("resize", this.responsive.bind(this));
      window.addEventListener("load", this.responsive.bind(this));
      this.addEventListener("click", this.onClick.bind(this));
      this.connectedCallback();
    }
    if (this.productPopupDiv) {
      this.productPopupDiv.addEventListener(
        "click",
        this.onClickMobile.bind(this.productPopupDiv)
      );
    }
  }
  onClick() {
    if (this.popupDiv) {
      const html = this.popupDiv;
      const popup = document.querySelector(".tingle-modal.shopable-video");
      if (!html || popup) return;
      html.classList.remove("hidden");
      this.initPopup(html);
    } else {
      if (this.classList.contains("instagram-item")) {
        const sectionId = this.dataset.sectionId;
        const index = this.dataset.index;
        const url = `${window.location.pathname}?section_id=${sectionId}&ajax=1`;
        var _this = this;
        fetch(`${url}`)
          .then((response) => {
            if (!response.ok) {
              var error = new Error(response.status);
              throw error;
            }
            return response.text();
          })
          .then((responseText) => {
            const newSection = new DOMParser()
              .parseFromString(responseText, "text/html")
              .querySelector(`.popup-index-${index}`);
            _this.appendChild(newSection);
          })
          .catch((error) => {
            throw error;
          })
          .finally(() => {
            const html = _this.querySelector(".popup-content");
            if (html) {
              html.classList.remove("hidden");
              this.initPopup(html);
            }
          });
      }
    }
  }
  onCloseEvent() {
    const popup = document.querySelector(".tingle-modal.shopable-video");
    if (!popup) return;
    const productInformation = popup.querySelector(
      ".shopable-video__product-information"
    );
    if (!productInformation) return;
    productInformation.classList.add("hidden");
  }
  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      const videos = this.querySelectorAll("video");
      videos.forEach((video) => {
        const dataSrc = video.dataset.src;
        if (dataSrc) {
          video.src = dataSrc;
          video.removeAttribute("data-src");
        }
      });
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 200px 0px",
    }).observe(this);
  }
  responsive() {
    const productDivs = document.querySelectorAll(
      ".shopable-video__product-information"
    );
    if (productDivs.length != 0) {
      if (window.innerWidth >= 768) {
        const flexDiv = this.popupDiv?.querySelector(
          ".video-item__popup--flex"
        );
        if (!flexDiv) return;
        productDivs.forEach((div) => {
          div.classList.remove("hidden");
        });
      } else {
        const flexDiv = this.popupDiv?.querySelector(
          ".video-item__popup--flex"
        );
        if (!flexDiv) return;
        productDivs.forEach((div) => {
          div.classList.add("hidden");
        });
      }
    }
  }
  onClickMobile() {
    const popup = this.closest(".video-item__popup");
    if (!popup) return;
    const productInformation = popup.querySelector(
      ".shopable-video__product-information"
    );
    if (!productInformation) return;
    productInformation.classList.toggle("hidden");
  }
}
customElements.define("shopable-video", ShopableVideo);

// js for shopable video
class InstagramShop extends ShopableVideo {
  constructor() {
    super();
    this.popupDiv = this.querySelector(".popup-content");
    if (this.popupDiv || this.classList.contains("instagram-item")) {
      this.addEventListener("click", this.onClick.bind(this));
    }
  }
}
customElements.define("instagram-shop", InstagramShop);

// js for grid custom
class GridCustom extends SlideSection {
  constructor() {
    super();
    this.enable = this.dataset.enable;
    this.parentElementt = document.querySelector(
      `#shopify-section-${this.dataset?.sectionId}`
    );
    this.loadmore = this.parentElementt?.querySelectorAll("loadmore-function");
    this.viewAll = this.parentElementt?.querySelector(".view_all");
    this.swiperSlideInnerHtml = this.innerHTML;
    this.init();
  }
  init() {
    if (this.enable == "true") {
      let width = window.innerWidth;
      window.addEventListener("resize", () => {
        const newWidth = window.innerWidth;
        if (newWidth <= 767 && width > 767) {
          this.actionOnMobile();
        }
        if (newWidth > 767 && width <= 767) {
          this.actionOutMobile();
        }
        width = newWidth;
      });
      if (width <= 767) {
        this.actionOnMobile();
      }
    }
  }
  actionOnMobile() {
    this.classList.add("swiper");
    this.classList.remove("grid", "grid-cols");
    if (this.viewAll) {
      this.viewAll.classList.add("hidden");
    }
    if (this.loadmore && this.loadmore.length > 0) {
      this.loadmore.forEach((button) => {
        button.classList.add("hidden");
        button.classList.remove("block");
      });
    }
    const html = this.swiperSlideInnerHtml.replaceAll(
      "grid-custom-item",
      "swiper-slide"
    );
    const wrapper = `<div class='swiper-wrapper'>${html}</div> <div
    class="swiper-pagination  ${
      this.enable && this.dataset.mobile != 1.5 ? "flex" : "hidden"
    } px-15 lh-1 bottom-30 justify-content-center"
    style="--swiper-pagination-bottom: 3rem;--swiper-pagination-position: static;"
  ></div> `;
    this.innerHTML = wrapper;
    this.initSlide();
  }
  actionOutMobile() {
    this.classList.remove("swiper");
    this.classList.add("grid", "grid-cols");
    if (this.viewAll) {
      this.viewAll.classList.remove("hidden");
    }
    this.innerHTML = this.swiperSlideInnerHtml;
    if (this.loadmore && this.loadmore.length > 0) {
      this.loadmore.forEach((button) => {
        button.classList.add("block");
        button.classList.remove("hidden");
      });
    }
  }
}
customElements.define("grid-custom", GridCustom);

// js for slide with thumbnails
class SlideWithThumbs extends HTMLElement {
  constructor() {
    super();
    this.globalSlide = null;
    this.thumbnailSlide = null;
    this.init();
  }
  /* The product gallery first, its thumbnails in a later task: building
     both sliders at once was one long task (~400ms) on the product page. */
  init() {
    const nothumb = this.dataset?.nothumb;
    this.initSlide();
    this.pauseMedia();
    this.playMedia();
    if (nothumb || !this.querySelector(".thumbnail-slide")) return;
    const later = window.requestIdleCallback
      ? (fn) => window.requestIdleCallback(fn, { timeout: 250 })
      : (fn) => setTimeout(fn, 0);
    later(() => this.connectThumbs());
  }

  connectThumbs() {
    if (!this.isConnected || this.thumbnailSlide) return;
    this.initThumbnail();
    const main = this.globalSlide;
    if (!main || main.destroyed || !this.thumbnailSlide || !main.thumbs) return;
    main.params.thumbs = Object.assign({}, main.params.thumbs, { swiper: this.thumbnailSlide });
    main.thumbs.init();
    main.thumbs.update(true);
  }

  initSlide() {
    var autoplaying = this?.dataset.autoplay === "true";
    const loop = this?.dataset.loop === "true";
    const itemMobile = this?.dataset.mobile ? this?.dataset.mobile : 1;
    const itemDesktop = this?.dataset.desktop ? this?.dataset.desktop : 4;
    var itemTablet = this?.dataset.tablet ? this?.dataset.tablet : "";
    var direction = this?.dataset.direction
      ? this?.dataset.direction
      : "horizontal";
    var autoplaySpeed = this?.dataset.autoplaySpeed
      ? this?.dataset.autoplaySpeed * 1000
      : 3000;
    var speed = this?.dataset.speed ? this?.dataset.speed : 400;
    const effect = this?.dataset.effect ? this?.dataset.effect : "slide";
    var spacing = this?.dataset.spacing ? this?.dataset.spacing : 30;
    spacing = Number(spacing);
    autoplaySpeed = Number(autoplaySpeed);
    speed = Number(speed);
    if (autoplaying) {
      autoplaying = { delay: autoplaySpeed };
    }
    if (window.innerWidth < 767) {
      direction = "horizontal";
    }
    const container = this.querySelector(".main-slide__navigation");
    const initSwiper = this.querySelector(".swiper-wrapper-preview");
    var _this = this;
    this.globalSlide = new Swiper(initSwiper, {
      slidesPerView: itemMobile,
      spaceBetween: spacing >= 15 ? 15 : spacing,
      autoplay: autoplaying,
      direction: direction,
      loop: loop,
      effect: effect,
      speed: speed,
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
      navigation: {
        nextEl: container?.querySelector(".swiper-button-next"),
        prevEl: container?.querySelector(".swiper-button-prev"),
      },
      pagination: {
        clickable: true,
        el: this.querySelector(".swiper-pagination"),
        type: "custom",
        renderCustom: function (swiper, current, total) {
          return current + "/" + total;
        },
      },
      breakpoints: {
        768: {
          slidesPerView: itemTablet,
        },
        1025: {
          slidesPerView: itemDesktop,
        },
      },
      on: {
        init: function () {
          var slide_visibles = _this.querySelectorAll(
            ".swiper-slide:not(.swiper-slide-visible) motion-element"
          );
          slide_visibles?.forEach((slide) => {
            if (typeof slide?.initialize === "function") slide?.initialize();
          });
          const currentSlide = this.slides[this.activeIndex];
          if (
            currentSlide &&
            currentSlide.classList.contains("cloudimage-360")
          ) {
            this.allowTouchMove = false;
          } else {
            this.allowTouchMove = true;
          }
        },
        slideChange: function () {
          const currentSlide = this.slides[this.activeIndex];
          if (currentSlide) {
            if (
              currentSlide.classList.contains("media-gallery__model") ||
              currentSlide.classList.contains("cloudimage-360")
            ) {
              this.allowTouchMove = false;
            } else {
              this.allowTouchMove = true;
            }
          }
        },
      },
      thumbs: {
        swiper: this.thumbnailSlide ? this.thumbnailSlide : null,
      },
    });
  }

  initThumbnail() {
    const container = this.querySelector(".thumbnail-slide");
    if (!container) return;
    var direction = this.dataset.thumbDirection
      ? this.dataset.thumbDirection
      : "horizontal";
    const slidesPerView = this.dataset.thumbSlidesPerView
      ? this.dataset.thumbSlidesPerView
      : 4;
    const spaceBetween = this.dataset.thumbSpaceBetween
      ? this.dataset.thumbSpaceBetween
      : 10;
    const watchSlidesVisibility = this.dataset.thumbWatchSlidesVisibility
      ? this.dataset.thumbWatchSlidesVisibility
      : true;
    const watchOverflow = this.dataset.thumbWatchOverflow
      ? this.dataset.thumbWatchOverflow
      : true;
    this.thumbnailSlide = new Swiper(container, {
      // centeredSlides: true,
      // centeredSlidesBounds: true,
      direction: "horizontal",
      spaceBetween: spaceBetween,
      slidesPerView: 5,
      watchSlidesVisibility: watchSlidesVisibility,
      watchSlidesProgress: true,
      watchOverflow: watchOverflow,
      breakpoints: {
        768: {
          direction: direction,
          slidesPerView: direction == "vertical" ? 10 : 6,
        },
      },
    });
  }

  // Pauses this gallery's videos when its slide changes (not every video
  // on the page).
  pauseMedia() {
    const root = this;
    this.globalSlide.on("slideChange", function () {
      root.querySelectorAll("video").forEach((v) => {
        try {
          v.pause();
        } catch (e) {}
      });
      root.querySelectorAll("iframe.js-youtube, iframe.js-vimeo").forEach((f) => {
        if (!f.contentWindow) return;
        const msg = f.classList.contains("js-youtube")
          ? '{"event":"command","func":"pauseVideo","args":""}'
          : '{"method":"pause"}';
        try {
          f.contentWindow.postMessage(msg, "*");
        } catch (e) {}
      });
    });
  }

  // With autoplay on, the video of the slide that comes in plays muted.
  playMedia() {
    const autoplay = this?.dataset.autoPlayVideo === "true";
    if (!autoplay) return;
    this.globalSlide.on("slideChangeTransitionEnd", function () {
      const activeSlide = this.slides[this.activeIndex];
      const video = activeSlide && activeSlide.querySelector(".media-video");
      if (!video) return;
      if (video.tagName === "VIDEO") {
        video.muted = true;
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      } else if (video.tagName === "IFRAME" && video.contentWindow) {
        const msg = video.src.includes("youtube")
          ? '{"event":"command","func":"playVideo","args":""}'
          : '{"method":"play"}';
        try {
          video.contentWindow.postMessage(msg, "*");
        } catch (e) {}
      }
    });
  }

  playActiveSlideVideo(swiper) {}

  functionGoto(position) {
    this.globalSlide.slideTo(position, 500);
  }

  updateSlide() {
    this.globalSlide.update();
  }

  updateThumbSlide() {
    this.thumbnailSlide?.update();
  }

  appendSlide(item) {
    this.globalSlide.appendSlide(item);
  }
}
customElements.define("slide-with-thumbs", SlideWithThumbs);

class ProductRecentlyViewed extends SlideSection {
  constructor() {
    super();
  }
  init() {
    this.call();
  }
  initData() {
    var savedProductsArr = JSON.parse(
      localStorage.getItem("materia__recently-viewed-products")
    );
    this.getStoredProducts(savedProductsArr);
  }
  getStoredProducts(p) {
    const limit = this.dataset?.limit;

    if (limit) {
      var query = "";
      var productAjaxURL = "";

      if (p && p.length > 0) {
        const sortedIds = p.slice();
        const idsToUse = sortedIds.slice(0, limit);
        query = idsToUse.join("%20OR%20id:");
        productAjaxURL = `&q=id:${query}`;
      }
    }
    fetch(`${this.dataset.url}${productAjaxURL}`)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement("div");
        html.innerHTML = text;
        const recentlyViewedProducts = html.querySelector(
          "recently-viewed-products"
        );
        if (
          recentlyViewedProducts &&
          recentlyViewedProducts.innerHTML.trim().length
        ) {
          this.innerHTML = recentlyViewedProducts.innerHTML;
        }
        if (recentlyViewedProducts.innerHTML.trim().length === 0) {
          this.remove();
        }
      })
      .finally(() => {
        if (this.querySelector(".swiper-wrapper")) {
          this.initSlide();
        }
        initLazyloadItem();
        BlsLazyloadImg.init();
      })
      .catch((e) => {
        console.error(e);
      });
  }
  call() {
    const __this = this;
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      __this.initData();
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 400px 0px",
    }).observe(this);
  }
}
customElements.define("recently-viewed-products", ProductRecentlyViewed);

// js gallery
class MediaGallery extends HTMLElement {
  constructor() {
    super();
  }
  setActiveMedia(mediaId, prepend) {
    const activeMedia = this.querySelector(
      '[id^="GalleryViewer"]'
    ).querySelector(`[data-media-id="${mediaId}"]`);
    if (!activeMedia) return;
    this.querySelector('[id^="GalleryViewer"]')
      .querySelectorAll("[data-media-id]")
      .forEach((element) => {
        element.classList.remove("is-active");
      });
    activeMedia.classList.add("is-active");

    if (prepend) {
      activeMedia.parentElement.prepend(activeMedia);
    }
  }
}
customElements.define("media-gallery", MediaGallery);

function pauseAllMedia() {
  document.querySelectorAll(".js-youtube").forEach((video) => {
    video.contentWindow.postMessage(
      '{"event":"command","func":"' + "pauseVideo" + '","args":""}',
      "*"
    );
  });
  document.querySelectorAll(".js-vimeo").forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', "*");
  });
  document.querySelectorAll("video").forEach((video) => video.pause());
  document.querySelectorAll("product-model").forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}
window.pauseAllMedia = pauseAllMedia;

var BlsCustomer = (function () {
  return {
    init: function () {
      this.toggleForm(), this.deleteAddresses(), this.addAddresses();
    },
    toggleForm: function () {
      const e = document.querySelector(".add-address");
      const c = document.querySelector(".cancel-add");
      if (e !== null && c !== null) {
        e.addEventListener("click", () => {
          if (e.getAttribute("aria-expanded") === "false") {
            e.setAttribute("aria-expanded", "true");
            e.closest(".bls-customer__address").classList.add("active");
          } else {
            e.setAttribute("aria-expanded", "false");
            e.closest(".bls-customer__address").classList.remove("active");
          }
        });
        c.addEventListener("click", () => {
          if (
            c.closest(".bls-customer__address").classList.contains("active")
          ) {
            e.closest(".bls-customer__address").classList.remove("active");
            e.closest(".add-address").setAttribute("aria-expanded", "false");
          }
        });
      }
    },
    deleteAddresses: function () {
      const btn = document.querySelectorAll(".address-delete");
      btn.forEach((e) => {
        e.addEventListener("click", () => {
          const id = e?.dataset.formId;
          const msg = e?.dataset.confirmMessage;
          if (confirm(msg || "Are you sure you wish to delete this address?")) {
            Shopify.postLink("/account/addresses/" + id, {
              parameters: { _method: "delete" },
            });
          }
        });
      });
    },
    addAddresses: function () {
      if (Shopify && document.getElementById("AddressCountryNew")) {
        new Shopify.CountryProvinceSelector(
          "AddressCountryNew",
          "AddressProvinceNew",
          {
            hideElement: "AddressProvinceNewContainer",
          }
        );
      }
      const edit = document.querySelectorAll(".edit-country-option");
      edit.forEach((e) => {
        const formId = e?.dataset.formId;
        const editCountry = "AddressCountry_" + formId;
        const editProvince = "AddressProvince_" + formId;
        const editContainer = "AddressProvinceContainer_" + formId;
        new Shopify.CountryProvinceSelector(editCountry, editProvince, {
          hideElement: editContainer,
        });
      });
    },
  };
})();
try { BlsCustomer.init(); } catch (e) { console.error("[theme] customer init", e); }
class IdeaProducts extends PopupBase {
  constructor() {
    super();
    this.view_idea_product = this.querySelector(".view_idea_product");
    this.content = this.querySelector(".idea-product-list");
    this.close = this.querySelector(".close");
    this.header = this.dataset.contentHeader;
    this.popup = this.dataset.popup == "true";
    this.init();
  }
  init() {
    const _this = this;
    this.view_idea_product.addEventListener("click", (e) => {
      _this.toggleViewIdeaProducts("show");
    });
    this.close.addEventListener("click", (e) => {
      _this.toggleViewIdeaProducts.bind(_this)();
    });
    document.addEventListener(
      "modal:opened",
      this.handleModalOpened.bind(this)
    );
  }

  toggleViewIdeaProducts(type = "hidden") {
    if (type == "hidden") {
      this.classList.remove("active");
    } else {
      if (this.popup) {
        if (window.innerWidth <= 767) {
          const content =
            this.querySelector("template").content.firstElementChild.cloneNode(
              true
            ).outerHTML;
          if (content) {
            this.initPopup(
              content,
              `<h3 class="title-popup h5 my-0 px-20 px-md-30 py-20 border-bottom">${this.header}</h3>`,
              "popup-idea-product"
            );
          }
        } else {
          this.classList.add("active");
        }
      } else {
        this.classList.add("active");
      }
    }
  }

  handleModalOpened() {
    BlsLazyloadImg.init();
  }
}

customElements.define("idea-product", IdeaProducts);

const outfit_idea = document.querySelector(".outfit_idea");
if (outfit_idea) {
  document.body.addEventListener("click", function (event) {
    if (!event.target.closest(".idea-product")) {
      const ideaProductInstances = document.querySelectorAll("idea-product");
      ideaProductInstances.forEach((instance) => {
        instance.toggleViewIdeaProducts();
      });
    }
  });
}

class GridList extends HTMLElement {
  connectedCallback() {
    if (this.motionDisabled) { this.revealGrid(); return; }
    if (!this.hasAttribute("hold") && !this._stopGridView) {
      this._stopGridView = Motion.inView(this, this.showGridItems.bind(this), {
        margin: "0px 0px -5px 0px",
      });
    }
  }

  disconnectedCallback() {
    this._stopGridView?.();
    this._stopGridView = null;
  }

  get motionDisabled() {
    return document.body.dataset.scrollAnimation === 'none' || window.Shopify?.designMode ||
      document.documentElement.classList.contains('shopify-design-mode') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  revealGrid() {
    this.querySelectorAll('motion-element').forEach(el => {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.transform = 'none';
    });
  }

  get gridItems() {
    return this.querySelectorAll(
      "motion-element[hold]:not([data-image]):not([style*='opacity: 1'])"
    );
  }

  get visibleGridItems() {
    return this.querySelectorAll(
      "motion-element:not([data-image])[style*='opacity: 1']"
    );
  }
  hideGrid() {
    if (this.motionDisabled) { this.revealGrid(); return; }
    Motion.animate(
      this.gridItems,
      { transform: "translateY(3.5rem)", opacity: 0.01, visibility: "hidden" },
      { duration: 0 }
    );
  }

  hideGridItems() {
    if (this.motionDisabled) { this.revealGrid(); return; }
    if (!this.hasAttribute("hold")) {
      Motion.animate(
        this.visibleGridItems,
        {
          transform: ["translateY(0)", "translateY(3.5rem)"],
          opacity: [1, 0.01],
          visibility: ["visible", "hidden"],
        },
        {
          duration: 0.4,
          delay: Motion.stagger(0.1),
          easing: [0, 0, 0.3, 1],
        }
      );
    }
  }

  showGridItems() {
    if (this.motionDisabled) { this.revealGrid(); return; }
    if (!this.hasAttribute("hold")) {
      Motion.animate(
        this.gridItems,
        {
          transform: ["translateY(3.5rem)", "translateY(0)"],
          opacity: [0.01, 1],
          visibility: ["hidden", "visible"],
        },
        {
          duration: 0.47,
          delay: Motion.stagger(0.15, { startDelay: 0.1 }),
          easing: [0, 0, 0.3, 1],
        }
      );
    }
  }
}
customElements.define("grid-list", GridList);
class ProgressStockBar extends HTMLElement {
  constructor() {
    super();
    Motion.inView(this, this.init.bind(this), { margin: "0px 0px -10px 0px" });
  }

  init() {
    this.style.setProperty("--percent", `100%`);

    setTimeout(() => {
      this.style.setProperty("--percent", `${this.dataset.progress}%`);
    }, 200);
  }
}
customElements.define("progress-stock-bar", ProgressStockBar);
class HeaderTotalPrice extends HTMLElement {
  constructor() {
    super();
  }
  updateTotal(cart) {
    this.minicart_total = this.querySelector("[data-cart-subtotal-price]");
    if (!this.minicart_total) return;
    if (cart.total_price == undefined) return;
    const price_format = Shopify.formatMoney(
      cart.total_price,
      cartStrings?.money_format
    );
    this.minicart_total.innerHTML = price_format;
  }
}
customElements.define("header-total-price", HeaderTotalPrice);
class ProductWithBanner extends HTMLElement {
  constructor() {
    super();
    this.bannerImages = this.querySelectorAll(".product-banner__image");
    this.init();
  }

  init() {
    this.waitForSlideSection();
  }

  waitForSlideSection() {
    const slideSection = this.querySelector("slide-section");
    // No slider here, or it was removed: stop (this used to poll every 100ms
    // for the life of the page). A slider that starts late (on the home page
    // sliders wait for the first interaction) is checked less and less often.
    if (!slideSection || !this.isConnected) return;
    if (!slideSection.globalSlide) {
      this._slideWait = Math.min((this._slideWait || 100) * 1.5, 1000);
      setTimeout(() => this.waitForSlideSection(), this._slideWait);
      return;
    }
    slideSection.updateActiveBanner = () => {};
    slideSection.globalSlide.on("slideChange", () => {
      this.updateActiveBanner(slideSection.globalSlide);
    });
    this.updateActiveBanner(slideSection.globalSlide, true);
  }

  updateActiveBanner(swiper, isInitial = false) {
    if (!swiper || !this.bannerImages || this.bannerImages.length <= 0) return;
    if (isInitial) {
    } else {
      const activeSlide = swiper.slides[swiper.activeIndex];
      if (!activeSlide) return;
      const blockIdFromSlide = activeSlide.dataset.blockId;
      const backgroundColor = activeSlide.dataset.backgroundColor;
      this.style.setProperty(
        "--content_bg_color",
        backgroundColor || "#ffffff"
      );
      const blockId =
        blockIdFromSlide ||
        activeSlide.querySelector(".block-content__item")?.dataset.blockId ||
        this.querySelectorAll(".swiper-slide")[swiper.realIndex]?.dataset
          .blockId;
      this.bannerImages.forEach((image) => {
        image.classList.remove("active");
      });
      let matchingBanner;
      if (blockId) {
        matchingBanner = Array.from(this.bannerImages).find(
          (image) => image.dataset.blockId === blockId
        );
      }

      if (matchingBanner) {
        matchingBanner.classList.add("active");
      } else {
        const index = swiper.realIndex;
        if (this.bannerImages[index]) {
          this.bannerImages[index].classList.add("active");
        }
      }
    }
  }
}
customElements.define("product-with-banner", ProductWithBanner);

/* ──────────────────────────────────────────────────────────────────────
   Secondary Image — mobile "peek" bootstrap

   Desktop reveals the alt product image on hover via CSS. Mobile / touch
   devices have no hover, so this observer briefly applies a
   `.peek-secondary` class to each `.product__media.show_secondary` card
   as it scrolls into view, then removes it ~1.6s later. The class is
   styled in assets/product-card.css to cross-fade primary → secondary.

   Why an IntersectionObserver instead of CSS-only:
   • Pure CSS can't trigger a time-limited reveal on scroll.
   • `:active` (tap-and-hold) is already handled in the CSS; this script
     ONLY provides the auto-hint on viewport-entry.

   Why MutationObserver:
   • Cards added by load-more / tab-switch / AJAX swap need to be picked
     up after the initial DOMContentLoaded scan.

   Why `window.__materiaSecondaryPeek` guard:
   • Theme JS can be evaluated more than once after a Shopify section
     reload — the flag keeps observers single-instance.
   ────────────────────────────────────────────────────────────────── */
(function () {
  if (window.__materiaSecondaryPeek) return;
  window.__materiaSecondaryPeek = true; return; /* materia: auto-peek disabled (scroll jank fix) */

  // Desktop with true hover already reveals the alt image on mouseover —
  // skip the auto-peek there. Everything else (small viewports, real touch
  // devices, theme-editor mobile preview) still benefits.
  if (window.matchMedia && window.matchMedia("(min-width: 1025px) and (hover: hover)").matches) return;

  var PEEK_MS = 2400;       // how long .peek-secondary stays on the card
  var THRESHOLD = 0.4;      // % of card that must be visible before peek

  function observeCard(el) {
    if (!el || el.__peekObserved) return;
    el.__peekObserved = true;
    try {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !el.__peeked) {
            el.__peeked = true;
            // small delay so the reveal reads as deliberate, not instant
            setTimeout(function () {
              el.classList.add("peek-secondary");
              setTimeout(function () {
                el.classList.remove("peek-secondary");
              }, PEEK_MS);
            }, 250);
            io.unobserve(e.target);
          }
        });
      }, { threshold: THRESHOLD });
      io.observe(el);
    } catch (err) { /* IntersectionObserver unsupported — silent no-op */ }
  }

  function scan(root) {
    (root || document).querySelectorAll(".product__media.show_secondary").forEach(observeCard);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { scan(); });
  } else {
    scan();
  }

  // Catch dynamically-added cards (load-more, tab switch, search AJAX, etc.)
  var mo = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (!n || n.nodeType !== 1) return;
        if (n.matches && n.matches(".product__media.show_secondary")) observeCard(n);
        if (n.querySelectorAll) {
          n.querySelectorAll(".product__media.show_secondary").forEach(observeCard);
        }
      });
    });
  });
  if (document.body) {
    mo.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      mo.observe(document.body, { childList: true, subtree: true });
    });
  }
})();
