/* Storelib theme reveals: initialize once and keep editor updates visible.
   One shared IntersectionObserver; nothing is measured on scroll. */
const SCROLL_ANIMATION_TRIGGER_CLASSNAME = '.scroll-trigger';
const SCROLL_ANIMATION_OFFSCREEN_CLASSNAME = 'scroll-trigger--offscreen';
const SCROLL_ANIMATION_DONE_ATTR = 'data-animation-done';
const REVEAL_MAX_STAGGER = 6;
const revealInitialized = new WeakSet();
const zoomInitialized = new WeakSet();
const visibleZoom = new Set();
// Browsers with scroll-driven animations zoom .animate--zoom-in in CSS alone.
const zoomInCss = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
const zoomObserver = !zoomInCss && 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(({target, isIntersecting}) => isIntersecting ? visibleZoom.add(target) : visibleZoom.delete(target));
}) : null;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function initializeScrollZoomAnimationTrigger(root = document) {
  if (reducedMotion() || window.Shopify?.designMode || !zoomObserver) return;
  const elements = [...root.querySelectorAll('.animate--zoom-in')];
  if (root.matches?.('.animate--zoom-in')) elements.unshift(root);
  elements.forEach(el => {
    if (zoomInitialized.has(el)) return;
    zoomInitialized.add(el);
    zoomObserver.observe(el);
  });
}
let zoomFrame = 0;
if (zoomObserver) window.addEventListener('scroll', () => {
  if (zoomFrame || !visibleZoom.size || reducedMotion()) return;
  zoomFrame = requestAnimationFrame(() => {
    zoomFrame = 0;
    // Read every box first, then write: one layout per frame, not one per image.
    const height = window.innerHeight;
    const reads = [];
    visibleZoom.forEach(el => {
      if (!el.isConnected) { visibleZoom.delete(el); zoomObserver.unobserve(el); return; }
      reads.push([el, el.getBoundingClientRect()]);
    });
    reads.forEach(([el, rect]) => {
      const progress = Math.max(0, Math.min(1, (height - rect.top) / (height + rect.height)));
      el.style.setProperty('--zoom-in-ratio', (1 + 0.2 * progress).toFixed(4));
    });
  });
}, {passive: true});

function markDone(el) {
  el.setAttribute(SCROLL_ANIMATION_DONE_ATTR, '');
  el.setAttribute('animation-end', '');
  el.classList.remove('scroll-trigger--offscreen', 'scroll-trigger--armed');
  el.style.removeProperty('--reveal-order');
}

const msOf = value => value.trim().endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;

const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  // Things that come into view together play in reading order, a short
  // stagger apart; the order comes from the observer's own boxes.
  const entering = entries.filter(entry => entry.isIntersecting)
    .sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left));
  entering.forEach(({target}, index) => {
    revealObserver.unobserve(target);
    if (index) target.style.setProperty('--reveal-order', String(Math.min(index, REVEAL_MAX_STAGGER)));
    target.classList.remove('scroll-trigger--offscreen');
  });
  // Styles are read after every class change, in one pass.
  entering.forEach(({target}) => {
    const end = event => {
      if (event.target !== target) return;
      target.removeEventListener('animationend', end);
      markDone(target);
    };
    target.addEventListener('animationend', end);
    const css = getComputedStyle(target);
    const duration = Math.max(...css.animationDuration.split(',').map(msOf), 0);
    const delay = Math.max(...css.animationDelay.split(',').map(msOf), 0);
    setTimeout(() => { target.removeEventListener('animationend', end); markDone(target); }, duration + delay + 100);
  });
}, {threshold: 0, rootMargin: '0px 0px -6% 0px'}) : null;

function initializeScrollAnimationTrigger(root = document, editorEvent = false) {
  initializeScrollZoomAnimationTrigger(root);
  const elements = [...root.querySelectorAll(SCROLL_ANIMATION_TRIGGER_CLASSNAME)];
  if (root.matches?.(SCROLL_ANIMATION_TRIGGER_CLASSNAME)) elements.unshift(root);
  const editor = editorEvent || document.documentElement.classList.contains('shopify-design-mode') || window.Shopify?.designMode;
  const productInformation = '.product-detail__information, .product-single__information';
  const fresh = [];
  elements.forEach(el => {
    const essentialProductContent = el.closest(productInformation) || el.querySelector(productInformation);
    // A wrapper whose cards reveal themselves does not animate as well: one
    // movement per element, never a fade inside a fade.
    const container = !!el.querySelector(SCROLL_ANIMATION_TRIGGER_CLASSNAME);
    if (essentialProductContent || container || editor || reducedMotion() || !revealObserver || el.hasAttribute(SCROLL_ANIMATION_DONE_ATTR)) {
      revealObserver?.unobserve(el);
      markDone(el);
      return;
    }
    if (revealInitialized.has(el)) return;
    revealInitialized.add(el);
    fresh.push(el);
  });
  // Measure every element first, then change classes: one layout for the whole
  // page instead of one per section. Content in the first screen (or above it)
  // shows at once; only what is below the fold waits to reveal on scroll.
  const fold = window.innerHeight;
  const below = fresh.map(el => el.getBoundingClientRect().top >= fold);
  fresh.forEach((el, i) => {
    if (!below[i]) { markDone(el); return; }
    // A motion element that gave way to this reveal pinned itself visible.
    if (el.tagName === 'MOTION-ELEMENT') el.style.removeProperty('opacity');
    el.classList.add('scroll-trigger--offscreen', 'scroll-trigger--armed');
    revealObserver.observe(el);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initializeScrollAnimationTrigger(), {once: true});
else initializeScrollAnimationTrigger();

// storelib:section-load is the builder redrawing a section in place: it shows
// at once, never replays its entrance.
['shopify:section:load', 'storelib:section-load', 'shopify:section:select', 'shopify:section:reorder'].forEach(name => {
  document.addEventListener(name, event => initializeScrollAnimationTrigger(event.target, true));
});
document.addEventListener('shopify:section:unload', event => {
  [event.target, ...event.target.querySelectorAll(SCROLL_ANIMATION_TRIGGER_CLASSNAME)].forEach(el => revealObserver?.unobserve(el));
  [event.target, ...event.target.querySelectorAll('.animate--zoom-in')].forEach(el => { zoomObserver?.unobserve(el); visibleZoom.delete(el); });
});
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => initializeScrollAnimationTrigger());
