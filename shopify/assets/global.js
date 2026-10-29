/* Materia Themes. Developed By Materia Themes. */
"use-strict";
/* Every slider follows the mouse one-to-one. Swiper waits 5px before it moves,
   so a drag lagged behind the cursor. Touch still yields to a vertical scroll
   (touchAngle). A slider that turns dragging off keeps that. */
(() => {
  const Native = window.Swiper;
  if (!Native || Native.__materiaDrag) return;
  function Swiper(el, params) {
    const next = Object.assign({}, params);
    if (next.allowTouchMove !== false) {
      next.simulateTouch = true;
      next.followFinger = true;
      next.threshold = 0;
      next.touchRatio = 1;
      next.longSwipesRatio = 0.15;
      next.longSwipesMs = 180;
      if (next.grabCursor !== false) next.grabCursor = true;
    }
    return new Native(el, next);
  }
  Object.setPrototypeOf(Swiper, Native);
  Swiper.prototype = Native.prototype;
  Swiper.__materiaDrag = true;
  window.Swiper = Swiper;
})();
/* Mouse drag for sideways scrollers (testimonials, product rows, and the
   other snap tracks). Touch already scrolls them. A mouse does not, and
   scroll-snap was pulling the row to the next card instead of following
   the cursor. */
(() => {
  if (window.__materiaMouseDrag) return;
  window.__materiaMouseDrag = true;
  let drag = null, suppressClick = null;
  const blocked = 'button, input, textarea, select, label, summary, [contenteditable="true"]';
  const rowOf = (node) => {
    let el = node instanceof Element ? node : null;
    if (!el || el.closest(blocked)) return null;
    while (el && el !== document.documentElement) {
      // Swiper owns transform tracks. Never start a second drag on them.
      if (el.classList.contains('swiper')) return null;
      const style = getComputedStyle(el);
      if ((style.scrollSnapType.startsWith('x') || el.hasAttribute('data-testimonial-row') || el.hasAttribute('data-drag-scroll')) && el.scrollWidth > el.clientWidth + 8) return el;
      el = el.parentElement;
    }
    return null;
  };
  const finish = event => {
    if (!drag || (event?.pointerId != null && event.pointerId !== drag.id)) return;
    const current=drag;drag=null;
    if(current.moved)suppressClick={row:current.row,until:performance.now()+400};
    current.row.classList.toggle('is-dragging',current.wasDragging);
    for(const [property,value,priority] of current.styles){if(value)current.row.style.setProperty(property,value,priority);else current.row.style.removeProperty(property);}
    try{if(current.row.hasPointerCapture(current.id))current.row.releasePointerCapture(current.id);}catch(_){}
    if(event?.type==='pointerup' && current.moved && current.row.hasAttribute('data-testimonial-row')){
      const card=current.row.firstElementChild,step=(card?.getBoundingClientRect().width||0)+(parseFloat(getComputedStyle(current.row).columnGap)||0);
      const velocity=performance.now()-current.lastTime<90?current.velocity:0;
      const distance=current.position-current.start;
      if(step>0 && Math.abs(distance)>24 && (Math.abs(velocity)>.25 || Math.abs(distance)>=step*.15)){
        const range=current.row.scrollWidth-current.row.clientWidth;
        const projected=current.position+Math.max(-step*.75,Math.min(step*.75,velocity*140));
        let snap=Math.round(projected/step);
        if(snap===Math.round(current.start/step))snap+=Math.sign(distance);
        const target=Math.max(current.rtl?-range:0,Math.min(current.rtl?0:range,snap*step));
        current.row.scrollTo({left:target,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
      }
    }
  };
  document.addEventListener('pointerdown', event => {
    if (drag || event.pointerType !== 'mouse' || event.button !== 0) return;
    const row=rowOf(event.target);if(!row)return;
    suppressClick=null;
    drag={row,id:event.pointerId,x:event.clientX,lastX:event.clientX,position:row.scrollLeft,start:row.scrollLeft,lastTime:performance.now(),velocity:0,rtl:getComputedStyle(row).direction==='rtl',moved:false,wasDragging:row.classList.contains('is-dragging'),styles:['scroll-snap-type','scroll-behavior','user-select'].map(p=>[p,row.style.getPropertyValue(p),row.style.getPropertyPriority(p)])};
    row.style.setProperty('scroll-snap-type','none','important');
    row.style.setProperty('scroll-behavior','auto','important');
    row.style.setProperty('user-select','none','important');
    row.scrollTo({left:row.scrollLeft,behavior:'instant'});
  },true);
  document.addEventListener('pointermove', event => {
    if(!drag || event.pointerId!==drag.id)return;
    if(!drag.row.isConnected || event.buttons===0){finish(event);return;}
    if(!drag.moved){
      if(Math.abs(event.clientX-drag.x)<2)return;
      drag.moved=true;drag.row.classList.add('is-dragging');
      try{drag.row.setPointerCapture(event.pointerId);}catch(_){}
    }
    // Incremental movement reverses immediately at either edge. An absolute
    // origin accumulates overshoot and appears frozen when reversing direction.
    const range=Math.max(0,drag.row.scrollWidth-drag.row.clientWidth);
    const previous=drag.position,now=performance.now();
    drag.position=Math.min(drag.rtl?0:range,Math.max(drag.rtl?-range:0,drag.position-(event.clientX-drag.lastX)));
    drag.velocity=(drag.position-previous)/Math.max(1,now-drag.lastTime);drag.lastTime=now;
    drag.row.scrollLeft=drag.position;
    drag.lastX=event.clientX;
    event.preventDefault();
  },{passive:false,capture:true});
  document.addEventListener('dragstart',event=>{if(drag && drag.row.contains(event.target))event.preventDefault();},true);
  document.addEventListener('click',event=>{
    if(!suppressClick || performance.now()>suppressClick.until)return;
    if(suppressClick.row.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();suppressClick=null;}
  },true);
  document.addEventListener('pointerup',finish,true);
  document.addEventListener('pointercancel',finish,true);
  document.addEventListener('lostpointercapture',finish,true);
  window.addEventListener('blur',()=>finish());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
})();
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
/* Gallery videos (snippets/product-media-layout) are written with their file
   in data-src and preload="none": an autoplaying video with a src downloaded
   in full as the page was read, wherever it was (a featured product far down
   the home page took 300 KB from the first picture on a phone). The poster
   shows; the file is given once the page has loaded and the video comes
   within a screen of view (a slide in a gallery when it is slid in), and
   then plays as before. Slideshow videos have their own start (SlideSection). */
(function () {
  const SELECTOR = "video[data-src]:not(.slideshow)";
  let io = null;
  const start = (video) => {
    const src = video.getAttribute("data-src");
    video.removeAttribute("data-src");
    if (!src) return;
    video.preload = "metadata";
    video.src = src;
  };
  const watch = (root) => {
    if (root.tagName !== "VIDEO" && !(root.getElementsByTagName && root.getElementsByTagName("video").length)) return;
    const list = [];
    if (root.matches && root.matches(SELECTOR)) list.push(root);
    if (root.querySelectorAll) list.push(...root.querySelectorAll(SELECTOR));
    if (!list.length) return;
    if (!("IntersectionObserver" in window)) { list.forEach(start); return; }
    io ||= new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        start(entry.target);
      });
    }, { rootMargin: "200px 0px" });
    list.forEach((video) => io.observe(video));
  };
  const begin = () => {
    watch(document);
    // Galleries drawn later (quick view, a builder redraw, the cart) are
    // watched as they arrive.
    if ("MutationObserver" in window) {
      new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) if (node.nodeType === 1) watch(node);
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  };
  // Asked for before then (a tap, its play button, a script's play()): it
  // gets its file at once and plays.
  const now = (e) => {
    const video = e.target && e.target.closest && e.target.closest(SELECTOR);
    if (!video) return;
    if (io) io.unobserve(video);
    start(video);
    if (e.type === "play") { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
  };
  document.addEventListener("play", now, true);
  document.addEventListener("pointerdown", now, true);
  if (document.readyState === "complete") begin();
  else window.addEventListener("load", begin, { once: true });
})();
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

// Swiper measures a slider again when its box changes. Its own observer
// compares the observer's fractional size with the whole pixels Swiper
// measured itself (clientWidth), so a gallery 591.94px wide ran the whole
// resize (updateSlides, 40-90ms) once right after it was built although
// nothing had moved, and a horizontal slider ran it again when only its
// height changed (the dots appearing under a slideshow). This observer
// compares whole pixels, and for a horizontal slider only its width (a
// vertical slider or a cube both). Window resizes still reach Swiper directly
// (resizeObserver off makes Swiper listen to the window).
(function () {
  if (typeof Swiper !== "function" || typeof ResizeObserver === "undefined" || Swiper.__materiaResize) return;
  Swiper.__materiaResize = true;
  Swiper.extendDefaults({ resizeObserver: false });
  Swiper.use(function materiaResize({ swiper, on, emit }) {
    let ro = null;
    let frame = 0;
    on("init", () => {
      if (swiper.params.resizeObserver || !swiper.el) return;
      ro = new ResizeObserver((entries) => {
        const entry = entries.find((e) => e.target === swiper.el);
        if (!entry) return;
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!swiper || swiper.destroyed || !swiper.initialized) return;
          const box = entry.contentRect;
          const both = !swiper.isHorizontal() || swiper.params.effect === "cube";
          const moved = Math.abs(box.width - (swiper.width || 0)) >= 1 || (both && Math.abs(box.height - (swiper.height || 0)) >= 1);
          if (!moved) return;
          emit("beforeResize");
          emit("resize");
        });
      });
      ro.observe(swiper.el);
    });
    on("destroy", () => {
      cancelAnimationFrame(frame);
      if (ro) ro.disconnect();
      ro = null;
    });
  });
})();

class SlideSection extends HTMLElement {
  constructor() {
    super();
    this.globalSlide = null;
    // A slideshow parsed outside the page (a builder redraw, a template)
    // starts once it is in the page and has a size.
    if (!this.classList.contains("slideshow") || this.isConnected) this.init();
  }

  // The slideshow and the announcement bar start at once; the cart's
  // recommendations too (the drawer opens them). Every other slider is built
  // when it comes within a screen of the viewport, each in its own task: at
  // load only the ones in or near view are built, a hidden one (a closed tab,
  // a display:none layout) waits until it is shown, and nothing is built
  // twice. This used to build every slider of a product page at load, and on
  // the home page the rest all at once on the first mouse move or touch.
  init() {
    if (this.classList.contains('slideshow')) { SlideSection.afterFirstPicture(this, () => this.initSlideshow()); return; }
    if (this.classList.contains('swiper-cart-upsell') || this.classList.contains('topbar-slider')) { this.initSlide(); return; }
    SlideSection.whenNear(this, () => this.initSlide());
  }

  // The page draws a slideshow's first slide by itself (it rests on landing,
  // nothing enters). Swiper measures the whole page and clones the slides, so
  // while the page loads it starts only once the first slide's picture has
  // been painted: built at once, it held that picture (the page's largest)
  // back by a long frame. A press on the slideshow, the builder, a page that
  // has already loaded or 1.5s start it at once.
  static afterFirstPicture(el, start) {
    const root = document.documentElement;
    if (document.readyState === "complete" || root.classList.contains("shopify-design-mode") || window.Shopify?.designMode) { start(); return; }
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { if (el.isConnected) start(); }, 0)));
    };
    const timer = setTimeout(go, 1500);
    ["pointerdown", "focusin", "keydown"].forEach((type) => el.addEventListener(type, go, { once: true, passive: true }));
    const img = el.querySelector(":scope > .swiper-wrapper > .swiper-slide img");
    if (!img || img.complete) go();
    else {
      img.addEventListener("load", go, { once: true });
      img.addEventListener("error", go, { once: true });
    }
  }

  // Runs start() once el is within a screen of the viewport (or at once
  // without IntersectionObserver). The observer's first report comes after
  // the page's first layout, so nothing here forces one.
  static whenNear(el, start) {
    if (!("IntersectionObserver" in window)) { start(); return; }
    const S = SlideSection;
    if (!S._near) {
      S._nearWaiting = new Map();
      S._nearQueue = [];
      S._near = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || !S._nearWaiting.has(entry.target)) return;
          S._near.unobserve(entry.target);
          S._nearQueue.push(entry.target);
        });
        S._drainNear();
      }, { rootMargin: "100% 0px" });
    }
    S._nearWaiting.set(el, start);
    S._near.observe(el);
  }

  // One slider per task, so several coming into view never make one long task.
  static _drainNear() {
    const S = SlideSection;
    if (S._nearTimer || !S._nearQueue.length) return;
    S._nearTimer = setTimeout(() => {
      S._nearTimer = 0;
      const el = S._nearQueue.shift();
      const start = el && S._nearWaiting.get(el);
      if (el) S._nearWaiting.delete(el);
      if (start && el.isConnected) {
        try { start(); } catch (e) { console.error(e); }
      }
      S._drainNear();
    }, 0);
  }

  // Builds a waiting slider now (a script needs it before it is in view).
  static startNow(el) {
    const S = SlideSection;
    const start = S._nearWaiting && S._nearWaiting.get(el);
    if (!start) return false;
    S._nearWaiting.delete(el);
    S._near.unobserve(el);
    start();
    return true;
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
    // Topbar and testimonials: reduced motion disables rotation and slide movement.
    const reducedTopbarMotion = (_this.classList.contains("topbar-slider") || _this.classList.contains("testimonials-slider")) &&
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
    if (this._videoObserver || !this.querySelector(":is(video, iframe).slideshow[data-src]")) return;
    // The poster (or the slide's picture) is what the first screen paints; the
    // video itself starts after the page has loaded and gone quiet, so it
    // never takes the connection from the first picture, the styles or the
    // scripts.
    const start = () => this.querySelectorAll(":is(video, iframe)[data-src]").forEach((video) => {
      video.src = video.dataset.src;
      video.removeAttribute("data-src");
    });
    const load = () => {
      const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
      const later = () => idle(start, { timeout: 1500 });
      if (document.readyState === "complete") later();
      else window.addEventListener("load", later, { once: true });
    };
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
      if (!this.isConnected && SlideSection._nearWaiting && SlideSection._nearWaiting.delete(this)) {
        SlideSection._near.unobserve(this);
        this._nearDropped = true;
      }
      if (this.isConnected || !this.globalSlide || this.globalSlide.destroyed) return;
      try { this.globalSlide.destroy(true, false); } catch (e) {}
    });
  }

  connectedCallback() {
    if (!this.classList.contains("slideshow")) {
      if (this.globalSlide && this.globalSlide.destroyed && typeof this.initSlide === "function") this.initSlide();
      else if (this._nearDropped) { this._nearDropped = false; this.init(); }
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
// Other sliders (the product gallery in theme.js) wait for the viewport the same way.
window.MateriaNearView = { when: (el, start) => SlideSection.whenNear(el, start), now: (el) => SlideSection.startNow(el) };
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
    const previewType = e.closest('[data-swatch-override]')?.dataset.swatchOverride || window.__materiaSwatchSettings?.swatch_item_type;
    if (previewType && e.hasAttribute('data-color')) {
      e.dataset.swatchType = previewType;
      e.classList.remove('color_swatches','variant_images');
      e.classList.add(previewType);
    }
    const { color, image, customValue, swatchType, optionSwatchValue } =
      e.dataset;
    // Custom colour rules use !important. They must not mask the variant's
    // photograph after switching away from colour mode.
    if (swatchType === 'variant_images' && image && customValue) e.classList.remove(customValue);
    if (color) {
      if (swatchType != "variant_images") {
        if (!optionSwatchValue) {
          if (this.checkColor(color)) {
            e.style.backgroundColor = color;
            if (customValue) e.classList.add(customValue);
          } else {
            if (customValue) e.classList.add(customValue);
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
        if (image || !optionSwatchValue) {
          if (image) {
            e.classList.add("color__" + color.replace(" ", "-"));
            e.style.backgroundColor = null;
            e.style.backgroundImage = "url('" + image + "')";
            e.style.backgroundSize = "cover";
            e.style.backgroundRepeat = "no-repeat";
          } else if (this.checkColor(color)) {
            e.style.backgroundColor = color;
            if (customValue) e.classList.add(customValue);
          } else {
            if (customValue) e.classList.add(customValue);
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
      if (!btn.hasAttribute('data-color')) return;
      btn.classList.remove("color_swatches", "variant_images");
      btn.classList.add(type);
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
  const state = (window.__materiaSwatchSettings ||= {});
  let frame = 0, full = false;
  const scopes = new Set();
  function schedule(scope) {
    if (scope === document) full = true;
    else if (scope?.querySelectorAll) scopes.add(scope);
    if (frame) return;
    frame = requestAnimationFrame(function () {
      frame = 0;
      const roots = full ? [document] : [...scopes];
      full = false; scopes.clear();
      const readyHosts = new Set();
      roots.forEach(root => {
        const buttons = [...root.querySelectorAll('.product__color-swatches--js')];
        if (root.matches?.('.product__color-swatches--js')) buttons.push(root);
        buttons.forEach(button => {
          let host = button.parentElement;
          while (host && typeof host.refreshSwatches !== 'function') host = host.parentElement;
          if (host) readyHosts.add(host);
        });
      });
      if (state.swatch_item_type) readyHosts.forEach(host => host.refreshSwatches(state.swatch_item_type));
      if (state.limit_color != null) limit(String(state.limit_color));
    });
  }
  document.addEventListener("storelib:settings-change", function (event) {
    var s = (event.detail && event.detail.settings) || {};
    if (event.detail?.section) return;
    let changed = false;
    if (['color_swatches','variant_images'].includes(s.swatch_item_type)) { state.swatch_item_type = s.swatch_item_type; changed = true; }
    if (Object.prototype.hasOwnProperty.call(s, 'limit_color')) { state.limit_color = s.limit_color; changed = true; }
    if (changed) schedule(document);
  });
  ['storelib:section-load','shopify:section:load'].forEach(name => document.addEventListener(name, event => {
    if (Object.keys(state).length) schedule(event.target?.nodeType === 1 ? event.target : document);
  }));
  new MutationObserver(records => {
    if (!Object.keys(state).length) return;
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === 1 && (node.matches?.('.product__color-swatches--js') || node.querySelector?.('.product__color-swatches--js'))) schedule(node);
    }
  }).observe(document.documentElement, {childList:true,subtree:true});
})();
