/* Materia Themes. Developed By Materia Themes. */
"use-strict";
var BlsLazyloadImg = (function () {
  return {
    init: function (scope = document) {
      this.lazyReady(scope);
    },
    lazyReady: function (scope = document) {
      const images = selector => [
        ...(scope.matches?.(selector) ? [scope] : []),
        ...scope.querySelectorAll(selector),
      ];
      // Immediately clear loading state on already-cached images (prevents
      // gray-thumbnail flash when cart re-renders images that are in cache).
      images(".bls-image-js img.bls-loading-image").forEach((img) => {
        if (img.complete) {
          img.closest("motion-element")?.classList.remove("bls-loading-image");
          img.classList.remove("bls-loading-image");
        }
      });
      if (!!window.IntersectionObserver) {
        this._observedImages ||= new WeakMap();
        this._imageObserver ||= new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const target = entry.target;
                // Fast path: if already cached, reveal instantly.
                if (target.complete) {
                  target
                    ?.closest("motion-element")
                    ?.classList.remove("bls-loading-image");
                  target?.classList.remove("bls-loading-image");
                  observer.unobserve(target);
                  return;
                }
                const onImageLoad = (e) => {
                  const t = e.currentTarget;
                  t?.closest("motion-element")?.classList.remove("bls-loading-image");
                  t?.classList.remove("bls-loading-image");
                  t.removeEventListener("load", onImageLoad);
                  t.removeEventListener("error", onImageLoad);
                };
                // Preserve intrinsic dimensions and authored responsive sizes during editor updates.
                if (!target.hasAttribute('sizes') && entry.boundingClientRect.width > 0) {
                  target.sizes = `${Math.ceil(entry.boundingClientRect.width)}px`;
                }
                target.addEventListener("load", onImageLoad);
                target.addEventListener("error", onImageLoad);
                observer.unobserve(target);
              }
            });
          },
          { rootMargin: "10px" }
        );
        images(".bls-image-js img").forEach((img) => {
          const source = `${img.getAttribute('src')}|${img.getAttribute('srcset')}`;
          if (this._observedImages.get(img) === source || img.complete) return;
          this._observedImages.set(img, source);
          this._imageObserver.observe(img);
        });
      } else {
        images('.bls-image-js .bls-loading-image').forEach(img => {
          img.classList.remove('bls-loading-image');
          img.closest('motion-element')?.classList.remove('bls-loading-image');
        });
      }
    },
  };
})();
BlsLazyloadImg.init();

/* THEME EDITOR FIX — when the editor re-renders a section
   (shopify:section:load swaps the section's DOM), freshly rendered product
   images come back with the `bls-loading-image` pre-reveal class
   (snippets/responsive-image.liquid) and card videos with `lazy-video-item`,
   but the initializers that strip those classes only ran on the initial
   page load — so re-rendered card media is stranded at opacity 0.01
   (assets/critical.css `.bls-image-js .bls-loading-image`).
   Every AJAX path in the theme (filters in collection.js, load-more in
   theme.js, cart re-renders) re-calls these initializers after replacing
   DOM; this adds the missing call for the theme editor. Idempotent across
   repeated events: class removal is a no-op once done and the observers
   unobserve targets after firing. Storefront is untouched (designMode only). */
if (window.Shopify && Shopify.designMode) {
  ["shopify:section:load", "shopify:section:select"].forEach((evt) => {
    document.addEventListener(evt, event => {
      BlsLazyloadImg.init(event.target?.querySelectorAll ? event.target : document);
      if (typeof initLazyloadItem === "function") initLazyloadItem();
    });
  });
}
function CloseAllPopup(data) {
  publish("closeCanvas", data);
}

const imageReady = (imageOrArray) => {
  if (!imageOrArray) {
    return Promise.resolve();
  }
  imageOrArray =
    imageOrArray instanceof Element ? [imageOrArray] : Array.from(imageOrArray);
  return Promise.all(
    imageOrArray.map((image) => {
      return new Promise((resolve) => {
        let timer;
        const done = () => {
          clearTimeout(timer);
          image.removeEventListener('load', done);
          image.removeEventListener('error', done);
          image.closest('motion-element')?.classList.remove('bls-loading-image');
          image.classList.remove('bls-loading-image');
          resolve();
        };
        if (image.tagName !== 'IMG' || image.complete || !image.offsetParent) done();
        else {
          image.addEventListener('load', done, {once: true});
          image.addEventListener('error', done, {once: true});
          timer = setTimeout(done, 2000);
        }
      });
    })
  );
};
class MotionElement extends HTMLElement {
  connectedCallback() {
    if (this.motionDisabled || this._played) { this.finishMotion(); return; }
    if (this.isHold || this.dataset.noview || this._observer) return;
    const rect = this.getBoundingClientRect();
    if (rect.top < window.innerHeight || !('IntersectionObserver' in window)) {
      this.finishMotion();
      return;
    }
    this.preInitialize();
    this._observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      this._observer.disconnect();
      this._observer = null;
      this.initialize();
    }, {root: this.dataset.parent ? this.closest(`.${this.dataset.parent}`) : null});
    this._observer.observe(this);
  }

  disconnectedCallback() {
    this._motionGeneration = (this._motionGeneration || 0) + 1;
    this._observer?.disconnect();
    this._observer = null;
    this._animation?.cancel();
    this.style.removeProperty('opacity');
    this.style.removeProperty('transform');
  }

  get motionDisabled() {
    return document.body.dataset.scrollAnimation === 'none' ||
      !!this.closest('.product-detail__information, .product-single__information') ||
      !!this.closest('.scroll-trigger') ||
      document.documentElement.classList.contains('shopify-design-mode') ||
      window.Shopify?.designMode ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  get isHold() { return this.hasAttribute('hold'); }
  get isInstant() { return this.hasAttribute('data-instantly'); }
  get mediaElements() { return [...this.querySelectorAll('img')]; }
  get animationType() { return this.dataset.motion || 'fade-up'; }
  get animationDelay() { return (parseInt(this.dataset.motionDelay, 10) || 0) / 1000; }
  set animationDelay(value) { this.dataset.motionDelay = value; }
  get transition() {
    const values = this.getAttribute('data-transition')?.split(',').map(Number);
    return values?.length === 4 && values.every(Number.isFinite) ? `cubic-bezier(${values.join(',')})` : 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  }

  finishMotion() {
    this._played = true;
    this._observer?.disconnect();
    this._observer = null;
    // Product information and titles ship with opacity-0. The final state must
    // override that initial class, including disabled/editor/reconnect paths.
    this.classList.remove('opacity-0');
    this.style.opacity = '1';
    this.style.removeProperty('transform');
  }

  preInitialize() {
    if (this.motionDisabled || this.isHold) return;
    this.style.opacity = '0';
    this.style.transform = this.animationType.startsWith('zoom') ? 'scale(0.985)' :
      this.animationType === 'fade-in' ? 'none' : 'translateY(12px)';
  }

  async initialize() {
    if (this.motionDisabled) { this.finishMotion(); return; }
    if (this.isHold || this._played) return;
    this._played = true;
    const generation = this._motionGeneration = (this._motionGeneration || 0) + 1;
    if (this.hasAttribute('data-image') && !this.isInstant) await imageReady(this.mediaElements);
    if (!this.isConnected || generation !== this._motionGeneration) return;
    if (this.motionDisabled || !this.animate) { this.finishMotion(); return; }
    const css = getComputedStyle(this);
    const duration = parseFloat(css.getPropertyValue('--animation-duration')) || 700;
    const delay = parseFloat(css.getPropertyValue('--animation-delay-base')) || 0;
    const animation = this._animation = this.animate([
      {opacity: 0, transform: this.style.transform || 'none'},
      {opacity: 1, transform: 'none'}
    ], {duration, delay: delay + this.animationDelay * 1000, easing: this.transition, fill: 'both'});
    try { await animation.finished; } catch (_) { /* Removed sections cancel their animation. */ }
    if (generation !== this._motionGeneration) return;
    animation.cancel();
    this.finishMotion();
  }

  refreshAnimation() {
    this.removeAttribute('hold');
    if (this.motionDisabled) { this.finishMotion(); return; }
    this._animation?.cancel();
    this._played = false;
    this.preInitialize();
    this.initialize();
  }
}
customElements.define("motion-element", MotionElement);

class SlideSection extends HTMLElement {
  constructor() {
    super();
    this.globalSlide = null;
    // A slideshow parsed outside the page (a builder redraw, a template)
    // starts once it is in the page and has a size.
    if (!this.classList.contains("slideshow") || this.isConnected) this.init();
  }

  init() {
    if (this.classList.contains('slideshow')) { this.initSlideshow(); return; }
    if (this.classList.contains('swiper-cart-upsell')) { this.initSlide(); return; }
    if (document.body.classList.contains("index")) {
      let pos = window.pageYOffset;
      if (pos > 0 || document.body.classList.contains("swiper-lazy")) {
        this.initSlide();
      } else {
        if (this.classList.contains("lazy-loading-swiper-before")) {
          this.initSlide();
        } else {
          this.classList.add("lazy-loading-swiper-after");
        }
      }
    } else {
      this.initSlide();
    }
  }

  // Slide effects by schema value. The creative presets keep the slide being
  // left fully opaque and held behind (translateZ -1); only the slide coming
  // in moves or fades over it, so the section background never shows through.
  static effectOptions(effect) {
    const creative = {
      creative: {
        prev: { shadow: false, translate: ["-20%", 0, -1] },
        next: { translate: ["100%", 0, 0] },
      },
      fade_scale: {
        prev: { shadow: false, opacity: 1, scale: 1, translate: [0, 0, -1] },
        next: { shadow: false, opacity: 0, scale: 0.94, translate: [0, 0, 0] },
      },
      slide_push: {
        prev: { shadow: false, opacity: 1, translate: ["-22%", 0, -1] },
        next: { shadow: false, translate: ["100%", 0, 0] },
      },
      stack_up: {
        prev: { shadow: false, opacity: 1, scale: 1, translate: [0, 0, -1] },
        next: { shadow: false, opacity: 0, scale: 0.94, translate: [0, "18%", 0] },
      },
      slide_over: {
        prev: { shadow: false, opacity: 1, translate: [0, 0, -1] },
        next: { shadow: false, translate: ["100%", 0, 0] },
      },
      zoom_reveal: {
        prev: { shadow: false, opacity: 1, scale: 1, translate: [0, 0, -1] },
        next: { shadow: false, opacity: 0, scale: 1.12, translate: [0, 0, 0] },
      },
    };
    if (creative[effect]) return { effect: "creative", options: { creativeEffect: creative[effect] } };
    if (effect === "coverflow") return { effect, options: { coverflowEffect: { rotate: 30, stretch: 0, depth: 120, modifier: 1, slideShadows: false } } };
    if (effect === "cube") return { effect, options: { cubeEffect: { shadow: false, slideShadows: false, shadowOffset: 20, shadowScale: 0.94 } } };
    if (effect === "flip") return { effect, options: { flipEffect: { slideShadows: false, limitRotation: true } } };
    // Fade without cross-fade: the slide coming in fades over the one it
    // replaces, so the two are never both half transparent.
    if (effect === "fade") return { effect, options: { fadeEffect: { crossFade: false } } };
    return { effect: effect || "slide", options: {} };
  }

  initSlide() {
    if (this.classList.contains("slideshow")) { this.initSlideshow(); return; }
    if (this.globalSlide && !this.globalSlide.destroyed) return;
    const _this = this;
    var autoplaying = _this?.dataset.autoplay === "true";
    const loop = _this?.dataset.loop === "true";
    const itemDesktop = _this?.dataset.desktop ? _this?.dataset.desktop : 4;
    var itemTablet = _this?.dataset.tablet ? _this?.dataset.tablet : "";
    const itemMobile = _this?.dataset.mobile ? _this?.dataset.mobile : 1;
    const direction = _this?.dataset.direction
      ? _this?.dataset.direction
      : "horizontal";
    var autoplaySpeed = _this?.dataset.autoplaySpeed
      ? _this?.dataset.autoplaySpeed * 1000
      : 3000;
    var speed = _this?.dataset.speed ? _this?.dataset.speed : 400;
    // Topbar: under reduced motion nothing turns by itself and a change is a cut.
    const reducedTopbarMotion = _this.classList.contains("topbar-slider") &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedTopbarMotion) {
      autoplaying = false;
      speed = 0;
    }
    const effect = _this?.dataset.effect ? _this?.dataset.effect : "slide";
    const row = _this?.dataset.row ? _this?.dataset.row : 1;
    var spacing = _this?.dataset.spacing ? _this?.dataset.spacing : 30;
    const progressbar = _this?.dataset.paginationProgressbar === "true";
    const autoItem = _this?.dataset.itemMobile === "true";
    const autoHeight = _this?.dataset.autoHeight === "true";
    const arrowCenterimage = _this?.dataset.arrowCenterimage
      ? _this?.dataset.arrowCenterimage
      : 0;
    spacing = Number(spacing);
    autoplaySpeed = Number(autoplaySpeed);
    speed = Number(speed);
    if (autoplaying) {
      autoplaying = {
        delay: autoplaySpeed,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      };
    }
    if (!itemTablet) {
      if (itemDesktop < 2) {
        itemTablet = 1;
      } else if (itemDesktop < 3) {
        itemTablet = 2;
      } else {
        itemTablet = 3;
      }
    }
    if (direction == "vertical") {
      _this.style.maxHeight = _this.offsetHeight + "px";
    }
    const fx = SlideSection.effectOptions(effect);
    this.globalSlide = new Swiper(_this, {
      slidesPerView: autoItem ? "auto" : itemMobile,
      spaceBetween: spacing >= 15 ? 15 : spacing,
      autoplay: autoplaying,
      direction: direction,
      loop: loop,
      effect: fx.effect,
      ...fx.options,
      autoHeight: autoHeight,
      speed: speed,
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
      grabCursor: true,
      grid: {
        rows: row,
        fill: "row",
      },
      navigation: {
        nextEl: (_this.classList.contains("topbar-slider") ? _this.parentElement : _this).querySelector(".swiper-button-next"),
        prevEl: (_this.classList.contains("topbar-slider") ? _this.parentElement : _this).querySelector(".swiper-button-prev"),
      },
      pagination: {
        clickable: true,
        el:
          _this.querySelector(".parent-pagination") ||
          _this.querySelector(".swiper-pagination"),
        type: progressbar ? "progressbar" : "bullets",
      },
      breakpoints: {
        768: {
          slidesPerView: itemTablet,
          spaceBetween: spacing >= 30 ? 30 : spacing,
          type: progressbar ? "progressbar" : "bullets",
          autoHeight: false,
        },
        1025: {
          slidesPerView: itemDesktop,
          spaceBetween: spacing,
          type: progressbar ? "progressbar" : "bullets",
          autoHeight: false,
        },
      },
      thumbs: {
        swiper: this.thumbnailSlide ? this.thumbnailSlide : null,
      },

      on: {
        init: function (e) {
          var sec__tiktok = _this.closest(".sec__tiktok-video");
          var slide_visibles = _this.querySelectorAll(
            ".swiper-slide:not(.swiper-slide-visible) motion-element:not([data-image]),motion-element.swiper-slide:not(.swiper-slide-visible)"
          );
          slide_visibles?.forEach((slide) => {
            if (slide && typeof slide.initialize === "function") {
              slide.initialize();
            }
          });
          e.autoplay.stop();
          if (_this?.dataset.autoplay === "true" && !reducedTopbarMotion) {
            _this._stopInView = Motion.inView(
              _this,
              async () => {
                e.autoplay.start();
              },
              { margin: "0px 0px -50px 0px" }
            );
          }

          if (sec__tiktok) {
            _this.initSecTiktok(sec__tiktok);
            window.addEventListener("resize", function () {
              setTimeout(() => {
                _this.initSecTiktok(sec__tiktok);
              }, 150);
            });
          }
          if (arrowCenterimage) {
            var items_slide = _this.querySelectorAll(
              ".product-item__media--ratio"
            );
            if (items_slide.length != 0) {
              var oH = [];
              items_slide.forEach((e) => {
                oH.push(e.offsetHeight / 2);
              });
              var max = Math.max(...oH);
              var arrowsOffset = "--arrows-offset-top: " + max + "px";
              if (_this.querySelectorAll(".swiper-arrow")) {
                _this.querySelectorAll(".swiper-arrow").forEach((arrow) => {
                  arrow.setAttribute("style", arrowsOffset);
                });
              }
            }
          }
        },
        realIndexChange: function () {
          _this.querySelectorAll(".swiper-slide motion-element:not([data-image])").forEach((slide) => {
            if (!slide.hasAttribute("hold")) slide.setAttribute("hold", true);
          });
        },
        slideChange: function () {
          const index_currentSlide = this.realIndex + 1;
          if (_this.closest(".sec__testimonials-single")) {
            const allDots = _this
              .closest(".sec__testimonials-single")
              .querySelectorAll(`single-item`);
            allDots.forEach((dot) => {
              dot.classList.remove("active");
            });
            _this
              .closest(".sec__testimonials-single")
              .querySelector(
                ".testimonials-author-image[data-position='" +
                  index_currentSlide +
                  "']"
              )
              .classList.add("active");
          }
        },
      },
    });
  }

  // ───────── Slideshow (sections/slideshow) ─────────
  // Each slide's words carry their state on the slide, as data-content:
  //   rest  - shown as they are, no entrance;
  //   enter - the entrance plays, once (it becomes rest when it is done);
  //   none  - hidden.
  // The first slide rests on landing. A slide reached by an arrow, a dot, the
  // keyboard or autoplay enters. Slides seen while a finger or the mouse drags
  // rest, so nothing hides and replays under the finger. A slide keeps its
  // state while it is still in view, and every slide but the active one is
  // cleared once the slider settles. One slide: no loop, arrows, dots, drag or
  // autoplay; it looks exactly like the first slide of many.
  initSlideshow() {
    if (this.globalSlide && !this.globalSlide.destroyed) return;
    const el = this;
    const d = el.dataset;
    const slideEls = el.querySelectorAll(":scope > .swiper-wrapper > .swiper-slide");
    if (!slideEls.length || typeof Swiper !== "function") return;
    const single = slideEls.length < 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effect = d.effect || "slide";
    const speed = reduce ? 0 : Number(d.speed) || 700;
    const fx = SlideSection.effectOptions(effect);
    const actions = el.querySelector(":scope > .swiper-actions");
    const pagination = el.querySelector(":scope > .swiper-pagination");
    const autoplay = !single && !reduce && d.autoplay === "true";
    // Fade-type effects jumping across several slides (a dot click) would
    // flick through the ones between; those are hidden for that change.
    const skipBetween = ["fade", "fade_scale", "stack_up", "zoom_reveal"].includes(effect);
    el.classList.toggle("is-single", single);
    this._dragging = false;
    this._touching = false;
    this._pause = new Set(["offscreen"]);

    const swiper = this.globalSlide = new Swiper(el, {
      slidesPerView: 1,
      spaceBetween: Number(d.spacing) || 0,
      speed,
      loop: !single && d.loop !== "false",
      effect: fx.effect,
      ...fx.options,
      watchSlidesProgress: true,
      allowTouchMove: !single,
      grabCursor: !single,
      // The finger leads; vertical page scrolling keeps its native feel.
      threshold: 8,
      touchAngle: 35,
      resistanceRatio: 0.65,
      longSwipesRatio: 0.25,
      longSwipesMs: 250,
      followFinger: true,
      // Swiper's default: a mouse drag never starts a native picture drag or
      // a text selection. Touch scrolling is still the page's (touch-action).
      touchStartPreventDefault: true,
      navigation: !single && actions
        ? { nextEl: actions.querySelector(".swiper-button-next"), prevEl: actions.querySelector(".swiper-button-prev") }
        : { enabled: false },
      pagination: !single && pagination
        ? { el: pagination, clickable: true, type: "bullets" }
        : { enabled: false },
      autoplay: autoplay
        ? { delay: (Number(d.autoplaySpeed) || 5) * 1000, disableOnInteraction: false, pauseOnMouseEnter: false }
        : false,
      on: {
        init: (sw) => {
          const active = sw.slides[sw.activeIndex];
          if (active) active.setAttribute("data-content", "rest");
          this._shownSlide = active;
        },
        touchStart: () => {
          this._touching = true;
          this.pauseSlideshow("touch", true);
        },
        sliderFirstMove: (sw) => {
          this._dragging = true;
          el.classList.add("is-dragging", "is-moving");
          sw.slides.forEach((slide) => {
            if (!slide.hasAttribute("data-content")) slide.setAttribute("data-content", "rest");
          });
        },
        touchEnd: (sw) => {
          this._touching = false;
          this.pauseSlideshow("touch", false);
          clearTimeout(this._settleTimer);
          // A drag let go where it started has no transition to end.
          if (this._dragging) this._settleTimer = setTimeout(() => this.settleSlideshow(), sw.params.speed + 120);
        },
        slideChangeTransitionStart: (sw) => {
          const incoming = sw.slides[sw.activeIndex];
          const outgoing = this._shownSlide;
          if (sw.params.speed > 0) el.classList.add("is-moving");
          if (incoming && !incoming.hasAttribute("data-content")) {
            incoming.setAttribute("data-content", this._dragging ? "rest" : "enter");
          }
          if (skipBetween && !this._dragging && outgoing && incoming && outgoing !== incoming) {
            const from = sw.slides.indexOf(outgoing);
            const to = sw.activeIndex;
            if (from > -1) {
              sw.slides.forEach((slide, i) => {
                if (i > Math.min(from, to) && i < Math.max(from, to) && !slide.hasAttribute("data-content")) slide.setAttribute("data-skip", "");
              });
            }
          }
          this._shownSlide = incoming;
        },
        transitionEnd: () => this.settleSlideshow(),
      },
    });
    swiper.__materiaSwipe = true;
    this.pauseSlideshow();

    if (!this._wired) {
      this._wired = true;
      // An entrance that has finished rests, so nothing can replay it.
      el.addEventListener("animationend", (e) => {
        const slide = e.target.closest && e.target.closest(".swiper-slide");
        if (!slide || slide.getAttribute("data-content") !== "enter" || typeof slide.getAnimations !== "function") return;
        const running = slide.getAnimations({ subtree: true }).some((a) => {
          const end = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming().endTime : 0;
          return a.playState === "running" && end !== Infinity;
        });
        if (!running) slide.setAttribute("data-content", "rest");
      });
      el.addEventListener("keydown", (e) => {
        const sw = this.globalSlide;
        if (!sw || sw.destroyed || el.classList.contains("is-single") || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
        if (e.key === "ArrowLeft") { e.preventDefault(); sw.slidePrev(); }
        else if (e.key === "ArrowRight") { e.preventDefault(); sw.slideNext(); }
      });
      el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") this.pauseSlideshow("hover", true); });
      el.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") this.pauseSlideshow("hover", false); });
      el.addEventListener("focusin", (e) => { if (e.target.matches && e.target.matches(":focus-visible")) this.pauseSlideshow("focus", true); });
      el.addEventListener("focusout", (e) => { if (!el.contains(e.relatedTarget)) this.pauseSlideshow("focus", false); });
    }
    if (autoplay) {
      this._onVisibility = () => this.pauseSlideshow("hidden", document.hidden);
      document.addEventListener("visibilitychange", this._onVisibility);
      this._onVisibility();
      if ("IntersectionObserver" in window) {
        this._viewObserver = new IntersectionObserver((entries) => {
          this.pauseSlideshow("offscreen", !entries[entries.length - 1].isIntersecting);
        }, { threshold: 0.25 });
        this._viewObserver.observe(el);
      } else {
        this.pauseSlideshow("offscreen", false);
      }
    }
    this.loadSlideshowVideos();
  }

  // Autoplay runs only with no reason to wait: hover, touch, keyboard focus,
  // off screen, a hidden tab or a slide picked in the builder.
  pauseSlideshow(reason, on) {
    const sw = this.globalSlide;
    if (reason) on ? this._pause.add(reason) : this._pause.delete(reason);
    if (!sw || sw.destroyed || !sw.autoplay || !sw.params.autoplay || !sw.params.autoplay.enabled) return;
    if (this._pause.size) { if (sw.autoplay.running) sw.autoplay.stop(); }
    else if (!sw.autoplay.running) sw.autoplay.start();
  }

  settleSlideshow() {
    const sw = this.globalSlide;
    if (!sw || sw.destroyed || sw.animating || this._touching) return;
    clearTimeout(this._settleTimer);
    this._dragging = false;
    this.classList.remove("is-dragging", "is-moving");
    const active = sw.slides[sw.activeIndex];
    sw.slides.forEach((slide) => {
      slide.removeAttribute("data-skip");
      if (slide !== active) slide.removeAttribute("data-content");
    });
    if (active && !active.hasAttribute("data-content")) active.setAttribute("data-content", "rest");
    this._shownSlide = active;
  }

  // The builder: a picked slide block is shown and autoplay waits for it.
  selectSlide(slide, selected) {
    const sw = this.globalSlide;
    this.pauseSlideshow("selected", selected);
    if (!selected || !slide || !sw || sw.destroyed) return;
    if (sw.params.loop) sw.slideToLoop(Number(slide.getAttribute("data-swiper-slide-index")) || 0);
    else if (sw.slides.indexOf(slide) > -1) sw.slideTo(sw.slides.indexOf(slide));
  }

  // The builder redraws a section in place: a slider whose slides changed
  // under it starts again on the new ones.
  refreshSlideshow() {
    const sw = this.globalSlide;
    const slides = [...this.querySelectorAll(":scope > .swiper-wrapper > .swiper-slide")];
    const stale = !sw || sw.destroyed || !this.classList.contains("swiper-initialized") ||
      slides.length !== sw.slides.length || slides.some((slide) => !sw.slides.includes(slide));
    if (!stale) return;
    this.stopSlideshow();
    this.initSlideshow();
  }

  stopSlideshow() {
    clearTimeout(this._settleTimer);
    this._viewObserver?.disconnect();
    this._viewObserver = null;
    if (this._onVisibility) document.removeEventListener("visibilitychange", this._onVisibility);
    this._onVisibility = null;
    if (this.globalSlide && !this.globalSlide.destroyed) this.globalSlide.destroy(true, true);
    this.classList.remove("is-dragging", "is-moving", "is-single");
    this.querySelectorAll(":scope > .swiper-wrapper > .swiper-slide").forEach((slide) => {
      slide.removeAttribute("data-content");
      slide.removeAttribute("data-skip");
    });
  }

  loadSlideshowVideos() {
    if (this._videoObserver || !this.querySelector("video.slideshow[data-src]")) return;
    const load = () => this.querySelectorAll("video[data-src]").forEach((video) => {
      video.src = video.dataset.src;
      video.removeAttribute("data-src");
    });
    if (!("IntersectionObserver" in window)) { load(); return; }
    this._videoObserver = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: "0px 0px 200px 0px" });
    this._videoObserver.observe(this);
  }

  // A slideshow redrawn by the builder is a new element; the old one stops its
  // Swiper (autoplay timer, listeners) here. Moved, not removed: it starts again.
  disconnectedCallback() {
    if (this.classList.contains("slideshow")) { this.stopSlideshow(); return; }
    // Every other slider (product carousels, testimonials, logos) stops too:
    // a Swiper left running keeps its document listeners and autoplay timer,
    // and each redraw in the builder used to add another set. Checked a frame
    // later, so an element that is only moved keeps its slider.
    requestAnimationFrame(() => {
      if (this.isConnected || !this.globalSlide || this.globalSlide.destroyed) return;
      try { this.globalSlide.destroy(true, false); } catch (e) {}
    });
  }

  connectedCallback() {
    if (!this.classList.contains("slideshow")) {
      if (this.globalSlide && this.globalSlide.destroyed && typeof this.initSlide === "function") this.initSlide();
      return;
    }
    if (!this.globalSlide || this.globalSlide.destroyed) this.initSlideshow();
  }

  initSecTiktok(sec) {
    sec.querySelectorAll(".swiper-slide").forEach((arrow) => {
      const tiktok = arrow.querySelector(".section_tiktok-image");
      let width = "--item-width: " + arrow.offsetWidth;
      tiktok.setAttribute("style", width);
    });
  }
}
customElements.define("slide-section", SlideSection);
// Builder events reach the slideshow they belong to.
["shopify:block:select", "shopify:block:deselect"].forEach((type) => {
  document.addEventListener(type, (event) => {
    const target = event.target;
    const slider = target && target.closest ? target.closest("slide-section.slideshow") : null;
    if (slider && typeof slider.selectSlide === "function") slider.selectSlide(target.closest(".swiper-slide"), type === "shopify:block:select");
  });
});
document.addEventListener("storelib:section-load", (event) => {
  const root = event.target;
  if (!root || root.nodeType !== 1) return;
  const sliders = root.matches("slide-section.slideshow") ? [root] : root.querySelectorAll("slide-section.slideshow");
  sliders.forEach((slider) => typeof slider.refreshSlideshow === "function" && slider.refreshSlideshow());
});

class PopupBase extends HTMLElement {
  constructor() {
    super();
    this.customClass = this.dataset.customClass;
    this.modal = null;
  }

  initPopup(content, text, customClass) {
    const _this = this;
    this.modal = new tingle.modal({
      footer: false,
      stickyFooter: false,
      closeMethods: ["overlay", "button", "escape"],
      cssClass: [this.customClass || customClass],
      onOpen: function () {
        document.dispatchEvent(new CustomEvent("modal:opened"));
        document.documentElement.classList.add("open-popup");
        root.style.setProperty(
          "padding-right",
          getScrollBarWidth.init() + "px"
        );
        const video = this.modalBox.querySelector("video");
        if (!video) return;
        video.play();
        if (this.modal.classList.contains("shopable-video")) {
          video.muted = false;
        }
      },
      onClose: function () {
        document.dispatchEvent(new CustomEvent("modal:closed"));
        document.documentElement.classList.remove("open-popup");
        root.style.removeProperty("padding-right");
      },
      beforeClose: function () {
        _this.onCloseEvent();
        document.documentElement.classList.remove("open-popup");
        root.style.removeProperty("padding-right");
        return true;
      },
    });
    this.modal.setHeader = function (content) {
      let popup_content = this.modalBoxContent;
      let popup_header = document.createElement("div");
      popup_header.classList.add("tingle-modal-box__header");
      popup_header.innerHTML = content;
      let parentElement = popup_content.parentNode;
      parentElement.insertBefore(popup_header, popup_content);
    };
    if (text) {
      this.modal.setHeader(text);
    }

    this.modal.setContent(content);
    this.modal.open();
  }

  onClose() {
    this.modal.close();
  }
  onCloseEvent() {}
}

class SwatchInit extends HTMLElement {
  constructor() {
    super();
    this.options = null;
    this.init();
  }

  init() {
    const _this = this;
    this.querySelectorAll(".product__color-swatches--js").forEach((btn) => {
      _this.checkSwatches(btn);
    });
  }
  checkSwatches(e) {
    const { color, image, customValue, swatchType, optionSwatchValue } =
      e.dataset;
    if (color) {
      if (swatchType != "variant_images") {
        if (optionSwatchValue.length == 0 || optionSwatchValue == null) {
          if (this.checkColor(color)) {
            e.style.backgroundColor = color;
            e.classList.add(customValue);
          } else {
            e.classList.add(customValue);
            if (image) {
              e.classList.add("color__" + color.replace(" ", "-"));
              e.style.backgroundColor = null;
              e.style.backgroundImage = "url('" + image + "')";
              e.style.backgroundSize = "cover";
              e.style.backgroundRepeat = "no-repeat";
            }
          }
        } else {
          e.style.setProperty("--swatch--background", optionSwatchValue);
        }
      } else {
        // Variant images: the variant's own picture first, then the
        // option's swatch, then the colour by name.
        if (image || optionSwatchValue == null || optionSwatchValue.length == 0) {
          if (image) {
            e.classList.add("color__" + color.replace(" ", "-"));
            e.style.backgroundColor = null;
            e.style.backgroundImage = "url('" + image + "')";
            e.style.backgroundSize = "cover";
            e.style.backgroundRepeat = "no-repeat";
          } else if (this.checkColor(color)) {
            e.style.backgroundColor = color;
            e.classList.add(customValue);
          } else {
            e.classList.add(customValue);
          }
        } else {
          e.style.setProperty("--swatch--background", optionSwatchValue);
        }
      }
    }
  }
  // Theme settings > Variant swatches > Display style, live in the builder.
  refreshSwatches(type) {
    this.querySelectorAll(".product__color-swatches--js").forEach((btn) => {
      if (btn.classList.contains("color_swatches") || btn.classList.contains("variant_images")) {
        btn.classList.remove("color_swatches", "variant_images");
        btn.classList.add(type);
      }
      btn.dataset.swatchType = type;
      ["background-color", "background-image", "background-size", "background-repeat", "--swatch--background"].forEach((p) => btn.style.removeProperty(p));
      this.checkSwatches(btn);
    });
  }
  checkColor(strColor) {
    var s = new Option().style;
    s.color = strColor;
    return s.color == strColor;
  }
  updateOptions() {
    this.options = Array.from(
      this.querySelectorAll(".product__color-swatches--js.active"),
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
  updateMasterId(variantData) {
    return (this.currentVariant = variantData.find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    }));
  }
}

// js for 3d product - not done yet
class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener("click", this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute("loaded")) {
      const content = document.createElement("div");
      content.appendChild(
        this.querySelector("template").content.firstElementChild.cloneNode(true)
      );

      this.setAttribute("loaded", true);
      const deferredElement = this.appendChild(
        content.querySelector("video, model-viewer, iframe")
      );
      if (focus) deferredElement.focus();
      if (
        deferredElement.nodeName == "VIDEO" &&
        deferredElement.getAttribute("autoplay")
      ) {
        deferredElement.play();
      }
    }
  }
}

function handleErrorMessagePopup(errorMessage = false) {
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
      showToast(elementErrorMessage.innerHTML, 5000, "modal-error");
    })
    .catch((e) => {
      throw e;
    });
}

function showToast(message, duration = 3000, customClass = "") {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast show ${customClass}`;
  toast.innerHTML = message;
  toastContainer.appendChild(toast);

  Motion.animate(
    toast,
    {
      opacity: [0, 1],
      scale: [0.3, 1],
    },
    {
      duration: 0.3,
      easing: "ease-out",
    }
  );

  setTimeout(() => {
    closeToast(toast);
  }, duration);
}

function closeToast(toast) {
  Motion.animate(
    toast,
    { opacity: 0, scale: 0.5 },
    { duration: 0.2, easing: "ease-in" }
  ).then(() => {
    toast.remove();
  });
}

class SlideLazyLoad {
  constructor(e) {
    (this.triggerEventsJs = e),
      (this.eventOptionsJs = { passive: !0 }),
      (this.userEventListenerJs = this.triggerListenerJs.bind(this)),
      (this.delayedScriptsJs = { normal: [], async: [], defer: [] });
  }
  triggerListenerJs() {
    this._removeUserInteractionListenerJs(this),
      "loading" === document.readyState
        ? document.addEventListener(
            "DOMContentLoaded",
            this._loadEverythingReadyNow.bind(this)
          )
        : this._loadEverythingReadyNow();
  }
  _removeUserInteractionListenerJs(e) {
    this.triggerEventsJs.forEach((t) =>
      window.removeEventListener(t, e.userEventListenerJs, e.eventOptionsJs)
    );
  }
  _addUserInteractionListenerJs(e) {
    this.triggerEventsJs.forEach((t) =>
      window.addEventListener(t, e.userEventListenerJs, e.eventOptionsJs)
    );
  }
  _preloadAllScriptsJs() {
    document.body.classList.add("swiper-lazy");
    document.body.classList.add("review-lazy");
    const loadingSwiper = document.querySelectorAll(
      ".lazy-loading-swiper-after"
    );
    loadingSwiper.forEach((el) => {
      el.classList.remove("lazy-loading-swiper-after");
      this.initSlide(el);
    });
    const reviewProduct = document.querySelectorAll(".review-product-added");
    reviewProduct.forEach((el) => {
      el.classList.remove("review-product-added");
      el.innerHTML = el.querySelector(".product-review-json").innerHTML;
      el.classList.remove("inline-loading");
    });
  }

  initSlide(el) {
    const _this = el;
    var autoplaying = _this?.dataset.autoplay === "true";
    const loop = _this?.dataset.loop === "true";
    const itemDesktop = _this?.dataset.desktop ? _this?.dataset.desktop : 4;
    var itemTablet = _this?.dataset.tablet ? _this?.dataset.tablet : "";
    const itemMobile = _this?.dataset.mobile ? _this?.dataset.mobile : 1;
    const direction = _this?.dataset.direction
      ? _this?.dataset.direction
      : "horizontal";
    var autoplaySpeed = _this?.dataset.autoplaySpeed
      ? _this?.dataset.autoplaySpeed * 1000
      : 3000;
    var speed = _this?.dataset.speed ? _this?.dataset.speed : 400;
    const effect = _this?.dataset.effect ? _this?.dataset.effect : "slide";
    const row = _this?.dataset.row ? _this?.dataset.row : 1;
    var spacing = _this?.dataset.spacing ? _this?.dataset.spacing : 30;
    const progressbar = _this?.dataset.paginationProgressbar === "true";
    const autoItem = _this?.dataset.itemMobile === "true";
    const arrowCenterimage = _this?.dataset.arrowCenterimage
      ? _this?.dataset.arrowCenterimage
      : 0;
    spacing = Number(spacing);
    autoplaySpeed = Number(autoplaySpeed);
    speed = Number(speed);
    if (autoplaying) {
      autoplaying = {
        delay: autoplaySpeed,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      };
    }
    if (!itemTablet) {
      if (itemDesktop < 2) {
        itemTablet = 1;
      } else if (itemDesktop < 3) {
        itemTablet = 2;
      } else {
        itemTablet = 3;
      }
    }
    if (direction == "vertical") {
      _this.style.maxHeight = _this.offsetHeight + "px";
    }
    _this.globalSlide = new Swiper(el, {
      slidesPerView: autoItem ? "auto" : itemMobile,
      spaceBetween: spacing >= 15 ? 15 : spacing,
      autoplay: autoplaying,
      direction: direction,
      loop: loop,
      effect: effect,
      speed: speed,
      watchSlidesProgress: true,
      watchSlidesVisibility: true,
      grid: {
        rows: row,
        fill: "row",
      },
      navigation: {
        nextEl: _this.querySelector(".swiper-button-next"),
        prevEl: _this.querySelector(".swiper-button-prev"),
      },
      pagination: {
        clickable: true,
        el:
          _this.querySelector(".parent-pagination") ||
          _this.querySelector(".swiper-pagination"),
        type: progressbar ? "progressbar" : "bullets",
      },
      breakpoints: {
        768: {
          slidesPerView: itemTablet,
          spaceBetween: spacing >= 30 ? 30 : spacing,
          pagination: {
            type: progressbar ? "progressbar" : "bullets",
          },
        },
        1025: {
          slidesPerView: itemDesktop,
          spaceBetween: spacing,
          pagination: {
            type: progressbar ? "progressbar" : "bullets",
          },
        },
      },
      thumbs: {
        swiper: this.thumbnailSlide ? this.thumbnailSlide : null,
      },

      on: {
        init: function (e) {
          var slide_visibles = _this.querySelectorAll(
            ".swiper-slide:not(.swiper-slide-visible) motion-element:not([data-image]),motion-element.swiper-slide:not(.swiper-slide-visible)"
          );
          slide_visibles?.forEach((slide) => {
            slide?.initialize();
          });
          e.autoplay.stop();
          if (_this?.dataset.autoplay === "true") {
            Motion.inView(
              _this,
              async () => {
                e.autoplay.start();
              },
              { margin: "0px 0px -50px 0px" }
            );
          }
          var sec__tiktok = _this.closest(".sec__tiktok-video");
          if (sec__tiktok) {
            _this.initSecTiktok(sec__tiktok);
            window.addEventListener("resize", function () {
              setTimeout(() => {
                _this.initSecTiktok(sec__tiktok);
              }, 150);
            });
          }
          if (arrowCenterimage) {
            var items_slide = _this.querySelectorAll(
              ".product-item__media--ratio"
            );
            if (items_slide.length != 0) {
              var oH = [];
              items_slide.forEach((e) => {
                oH.push(e.offsetHeight / 2);
              });
              var max = Math.max(...oH);
              var arrowsOffset = "--arrows-offset-top: " + max + "px";
              if (_this.querySelectorAll(".swiper-arrow")) {
                _this.querySelectorAll(".swiper-arrow").forEach((arrow) => {
                  arrow.setAttribute("style", arrowsOffset);
                });
              }
            }
          }
        },
        realIndexChange: function (swiper) {
          var slide_visibles = _this.querySelectorAll(
            ".swiper-slide motion-element:not([data-image])"
          );
          slide_visibles?.forEach((slide) => {
            if (!slide.hasAttribute("hold")) {
              slide?.setAttribute("hold", true);
            }
          });
        },
        slideChange: function () {
          const index_currentSlide = this.realIndex + 1;
          if (_this.closest(".sec__testimonials-single")) {
            const allDots = _this
              .closest(".sec__testimonials-single")
              .querySelectorAll(`single-item`);
            allDots.forEach((dot) => {
              dot.classList.remove("active");
            });
            _this
              .closest(".sec__testimonials-single")
              .querySelector(
                ".testimonials-author-image[data-position='" +
                  index_currentSlide +
                  "']"
              )
              .classList.add("active");
          }
        },
      },
    });
  }

  async _loadEverythingReadyNow() {
    this._preloadAllScriptsJs(),
      await this._loadScriptsFromListJs(this.delayedScriptsJs.normal),
      await this._loadScriptsFromListJs(this.delayedScriptsJs.defer),
      await this._loadScriptsFromListJs(this.delayedScriptsJs.async),
      await this._triggerDOMContentLoadedJs(),
      await this._triggerWindowLoadJs(),
      window.dispatchEvent(new Event("materiaspeed-allScriptsLoaded"));
  }
  async _loadScriptsFromListJs(e) {
    const t = e.shift();
    return t
      ? (await this._transformScript(t), this._loadScriptsFromListJs(e))
      : Promise.resolve();
  }
  async _transformScript(e) {
    return (
      await this._requestAnimFrame(),
      new Promise((t) => {
        const s = document.createElement("script");
        let n;
        [...e.attributes].forEach((e) => {
          let t = e.nodeName;
          "type" !== t &&
            ("data-materialazy-type" === t && ((t = "type"), (n = e.nodeValue)),
            s.setAttribute(t, e.nodeValue));
        }),
          e.hasAttribute("src")
            ? (s.addEventListener("load", t), s.addEventListener("error", t))
            : ((s.text = e.text), t()),
          e.parentNode.replaceChild(s, e);
      })
    );
  }
  async _triggerDOMContentLoadedJs() {
    (this.domReadyFired = !0),
      await this._requestAnimFrame(),
      document.dispatchEvent(new Event("materiaspeed-DOMContentLoaded")),
      await this._requestAnimFrame(),
      window.dispatchEvent(new Event("materiaspeed-DOMContentLoaded")),
      await this._requestAnimFrame(),
      document.dispatchEvent(new Event("materiaspeed-readystatechange")),
      await this._requestAnimFrame(),
      document.materiaonreadystatechange && document.materiaonreadystatechange();
  }
  async _triggerWindowLoadJs() {
    await this._requestAnimFrame(),
      window.dispatchEvent(new Event("materiaspeed-load")),
      await this._requestAnimFrame(),
      window.materiaonload && window.materiaonload(),
      await this._requestAnimFrame(),
      window.dispatchEvent(new Event("materiaspeed-pageshow")),
      await this._requestAnimFrame(),
      window.materiaonpageshow && window.materiaonpageshow();
  }
  async _requestAnimFrame() {
    return new Promise((e) => requestAnimationFrame(e));
  }
  static run() {
    const e = new SlideLazyLoad([
      "keydown",
      "mousemove",
      "touchmove",
      "touchstart",
      "touchend",
      "wheel",
    ]);
    e._addUserInteractionListenerJs(e);
  }
}
SlideLazyLoad.run();

// js for copy button
class CopyButton extends HTMLElement {
  constructor() {
    super();
    this.content = this.dataset.content;
    this.init();
  }
  init() {
    if (this.content) {
      this.addEventListener("click", this.onClick.bind(this));
    }
  }
  onClick() {
    navigator.clipboard.writeText(this.content);
    this.classList.add("copied");
  }
  updateUrl(newContent) {
    this.content = newContent;
  }
}
customElements.define("copy-button", CopyButton);

/* Theme settings > Variant swatches, live in the builder: Display style
   redraws every swatch, Maximum swatches shows or folds the extra ones
   behind "+N" on product cards. */
(function () {
  if (window.__materiaSwatchLive) return;
  window.__materiaSwatchLive = true;
  function hosts() {
    var set = new Set();
    document.querySelectorAll(".product__color-swatches--js").forEach(function (btn) {
      var host = btn.parentElement;
      while (host && typeof host.refreshSwatches !== "function") host = host.parentElement;
      if (host) set.add(host);
    });
    return set;
  }
  function limit(value) {
    var max = value === "default" ? Infinity : parseInt(value, 10) || Infinity;
    document.querySelectorAll("variant-radios.product__color-swatches").forEach(function (group) {
      var items = group.querySelectorAll(".product__color-swatches--js");
      var more = group.querySelector(".show_color_swatch");
      items.forEach(function (btn, i) {
        var hide = i >= max;
        btn.classList.toggle("hidden", hide);
        btn.classList.toggle("opacity-0", hide);
      });
      var left = items.length - max;
      if (left > 0) {
        if (!more) {
          more = document.createElement("span");
          more.className = "show_color_swatch pointer";
          more.addEventListener("click", function () {
            more.classList.add("hidden");
            group.querySelectorAll(".product__color-swatches--js.hidden").forEach(function (btn) {
              btn.classList.remove("hidden", "opacity-0");
            });
          });
          group.appendChild(more);
        }
        more.textContent = " + " + left + " ";
        more.classList.remove("hidden");
      } else if (more) {
        more.remove();
      }
    });
  }
  document.addEventListener("storelib:settings-change", function (event) {
    var s = (event.detail && event.detail.settings) || {};
    if (Object.prototype.hasOwnProperty.call(s, "swatch_item_type")) {
      hosts().forEach(function (host) { host.refreshSwatches(s.swatch_item_type); });
    }
    if (Object.prototype.hasOwnProperty.call(s, "limit_color")) limit(String(s.limit_color));
  });
})();
