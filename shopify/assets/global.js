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
    this.init();
  }

  init() {
    if (this.classList.contains('slideshow')) { this.initSlide(); return; }
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

  initSlide() {
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
    // Topbar and slideshow: under reduced motion nothing turns by itself and a
    // change is a cut.
    const reducedTopbarMotion = (_this.classList.contains("topbar-slider") || _this.classList.contains("slideshow")) &&
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
    const effectOpts = {};
    // The 3 modern transitions (fade_scale / slide_push / stack_up) are all built on
    // Swiper EffectCreative. We map the schema value to a creativeEffect config and
    // then normalize the effect NAME to 'creative' so Swiper loads the right module.
    // ZERO-BLEED RULE for every preset: the OUTGOING slide must stay FULLY OPAQUE
    // (held beneath via translateZ -1) and only the INCOMING slide may fade in over
    // it. If both slides are semi-transparent mid-transition the section background
    // ghosts through the slideshow — that is the "background shows through" bug.
    const creativePresets = {
      // Soft modern dissolve: incoming fades + settles up from .94 OVER the held,
      // fully-opaque outgoing slide. No background ghosting by construction.
      fade_scale: {
        prev: { shadow: false, opacity: 1, scale: 1, translate: [0, 0, -1] },
        next: { shadow: false, opacity: 0, scale: 0.94, translate: [0, 0, 0] },
      },
      // Parallax push: outgoing eases left (fully opaque) while the incoming slide
      // sweeps in from the right edge, always covering the frame.
      slide_push: {
        prev: { shadow: false, opacity: 1, translate: ["-22%", 0, -1] },
        next: { shadow: false, translate: ["100%", 0, 0] },
      },
      // Stack up: outgoing holds in place underneath; incoming rises from below
      // with a soft fade + scale and stacks over it.
      stack_up: {
        prev: { shadow: false, opacity: 1, scale: 1, translate: [0, 0, -1] },
        next: { shadow: false, opacity: 0, scale: 0.94, translate: [0, "18%", 0] },
      },
      // Slide over: outgoing holds perfectly still; incoming covers it from the
      // right like a sheet. The cleanest possible move — nothing ever uncovered.
      slide_over: {
        prev: { shadow: false, opacity: 1, translate: [0, 0, -1] },
        next: { shadow: false, translate: ["100%", 0, 0] },
      },
      // Zoom reveal: incoming starts slightly zoomed-in + transparent and settles
      // into place over the held outgoing slide. Cinematic, zero bleed.
      zoom_reveal: {
        prev: { shadow: false, opacity: 1, scale: 1, translate: [0, 0, -1] },
        next: { shadow: false, opacity: 0, scale: 1.12, translate: [0, 0, 0] },
      },
    };
    let effectName = effect;
    if (creativePresets[effect]) {
      effectName = "creative";
      effectOpts.creativeEffect = creativePresets[effect];
    } else if (effect === "coverflow") {
      effectOpts.coverflowEffect = {
        rotate: 30,
        stretch: 0,
        depth: 120,
        modifier: 1,
        slideShadows: false,
      };
    } else if (effect === "creative") {
      effectOpts.creativeEffect = {
        prev: { shadow: false, translate: ["-20%", 0, -1] },
        next: { translate: ["100%", 0, 0] },
      };
    } else if (effect === "cube") {
      effectOpts.cubeEffect = {
        shadow: false,
        slideShadows: false,
        shadowOffset: 20,
        shadowScale: 0.94,
      };
    } else if (effect === "flip") {
      effectOpts.flipEffect = { slideShadows: false, limitRotation: true };
    }
    // Fade without cross-fade: the incoming slide fades in over the one it
    // replaces (going back, the outgoing one fades off the slide beneath), so
    // the two are never both half transparent over the section background.
    if (effectName === "fade") {
      effectOpts.fadeEffect = { crossFade: false };
    }
    this.globalSlide = new Swiper(_this, {
      slidesPerView: autoItem ? "auto" : itemMobile,
      spaceBetween: spacing >= 15 ? 15 : spacing,
      autoplay: autoplaying,
      direction: direction,
      loop: loop,
      effect: effectName,
      ...effectOpts,
      autoHeight: autoHeight,
      speed: speed,
      // Let Swiper own the drag; vertical page scrolling keeps its native feel.
      ...(_this.classList.contains('slideshow') ? {
        threshold: 8, touchAngle: 35, resistanceRatio: .65,
        longSwipesRatio: .25, longSwipesMs: 250,
        followFinger: true, touchStartPreventDefault: false,
      } : {}),
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
          if (_this.classList.contains("slideshow")) {
            const motionElement = _this.querySelectorAll(
              `.swiper-slide.swiper-slide-active  motion-element.effect_fadeinup`
            );
            setTimeout(() => {
              motionElement &&
                motionElement.forEach((item) => {
                  item.refreshAnimation();
                });
            }, 350);
          }
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
          var video = _this.querySelector("video.slideshow");
          if (video) {
            const handleIntersection = (entries, observer) => {
              if (!entries[0].isIntersecting) return;
              observer.unobserve(_this);
              const videos = _this.querySelectorAll("video");
              videos.forEach((video) => {
                const dataSrc = video.dataset.src;
                if (dataSrc) {
                  video.src = dataSrc;
                  video.removeAttribute("data-src");
                }
              });
            };
            new IntersectionObserver(handleIntersection.bind(_this), {
              rootMargin: "0px 0px 200px 0px",
            }).observe(_this);
          }
        },
        slideChangeTransitionStart: function (swiper) {
          // Drive the glitch-free entrance image-effects (fade_in / reveal_up). We add
          // a stable `is-entering` state class for the duration of the slide change so
          // the CSS uses an INTERRUPTIBLE transition (not a restartable keyframe).
          // Rapid arrow clicks therefore re-ease smoothly instead of snapping.
          if (!_this.classList.contains("slideshow")) return;
          if (_this.classList.contains('is-dragging')) return;
          // The slide arriving by arrow, dot or autoplay plays its picture
          // entrance (fade_in / reveal_up) once; the others rest.
          const arriving = swiper && swiper.slides ? swiper.slides[swiper.activeIndex] : null;
          if (swiper && swiper.slides) swiper.slides.forEach((slide) => { if (slide !== arriving) slide.removeAttribute("data-fx-enter"); });
          if (arriving && !arriving.hasAttribute("data-fx-enter")) arriving.setAttribute("data-fx-enter", "");
          _this.classList.add("is-entering");
          clearTimeout(_this._enterTimer);
          // Fallback removal in case TransitionEnd is skipped on a fast interrupt.
          _this._enterTimer = setTimeout(function () {
            _this.classList.remove("is-entering");
          }, (swiper && swiper.params && swiper.params.speed ? swiper.params.speed : speed) + 60);
        },
        slideChangeTransitionEnd: function () {
          if (!_this.classList.contains("slideshow")) return;
          clearTimeout(_this._enterTimer);
          _this.classList.remove("is-entering");
        },
        realIndexChange: function (swiper) {
          if (_this?.dataset.autoplay) {
            var slide_visibles = _this.querySelectorAll(
              ".swiper-slide motion-element:not([data-image])"
            );
            slide_visibles?.forEach((slide) => {
              if (!slide.hasAttribute("hold")) {
                slide?.setAttribute("hold", true);
              }
            });
          } else {
            var slide_visibles = _this.querySelectorAll(
              ".swiper-slide motion-element:not([data-image])"
            );
            slide_visibles?.forEach((slide) => {
              if (!slide.hasAttribute("hold")) {
                slide?.setAttribute("hold", true);
              }
            });
          }

          setTimeout(() => {
            if (_this.classList.contains("slideshow") && !_this.classList.contains('is-dragging')) {
              const motionElement = _this.querySelectorAll(
                `.swiper-slide.swiper-slide-active  motion-element.effect_fadeinup, .swiper-slide.swiper-slide-active  motion-element.motion-image`
              );
              motionElement &&
                motionElement.forEach((item) => {
                  item.refreshAnimation();
                });
            }
          }, 50);
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

  // A slideshow redrawn by the builder is a new element; the old one stops its
  // Swiper (autoplay timer, listeners) here. Moved, not removed: it starts again.
  disconnectedCallback() {
    if (!this.classList.contains("slideshow")) return;
    clearTimeout(this._enterTimer);
    if (typeof this._stopInView === "function") this._stopInView();
    this._stopInView = null;
    if (this.globalSlide && !this.globalSlide.destroyed) {
      this.globalSlide.destroy(true, true);
      this._restart = true;
    }
    this.classList.remove("is-entering", "is-dragging");
  }

  connectedCallback() {
    if (!this._restart) return;
    this._restart = false;
    this.initSlide();
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
        if (optionSwatchValue == null || optionSwatchValue.length == 0) {
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
