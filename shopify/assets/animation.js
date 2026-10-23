/* Storelib theme reveals: initialize once and keep editor updates visible. */
const SCROLL_ANIMATION_TRIGGER_CLASSNAME = '.scroll-trigger';
const SCROLL_ANIMATION_OFFSCREEN_CLASSNAME = 'scroll-trigger--offscreen';
const SCROLL_ANIMATION_DONE_ATTR = 'data-animation-done';
const revealInitialized = new WeakSet();
const zoomInitialized = new WeakSet();
const visibleZoom = new Set();
const zoomObserver = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(({target, isIntersecting}) => isIntersecting ? visibleZoom.add(target) : visibleZoom.delete(target));
}) : null;

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
window.addEventListener('scroll', () => {
  if (zoomFrame || reducedMotion()) return;
  zoomFrame = requestAnimationFrame(() => {
    visibleZoom.forEach(el => {
      if (!el.isConnected) { visibleZoom.delete(el); zoomObserver?.unobserve(el); return; }
      const rect = el.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
      el.style.setProperty('--zoom-in-ratio', 1 + 0.2 * progress);
    });
    zoomFrame = 0;
  });
}, {passive:true});

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

function markDone(el) {
  el.setAttribute(SCROLL_ANIMATION_DONE_ATTR, '');
  el.setAttribute('animation-end', '');
  el.classList.remove('scroll-trigger--offscreen', 'scroll-trigger--armed');
}

const revealObserver = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  entries.forEach(({target, isIntersecting}) => {
    if (!isIntersecting) return;
    revealObserver.unobserve(target);
    target.classList.remove('scroll-trigger--offscreen');
    const end = event => {
      if (event.target !== target) return;
      target.removeEventListener('animationend', end);
      markDone(target);
    };
    target.addEventListener('animationend', end);
    const css = getComputedStyle(target);
    const ms = value => value.trim().endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
    const duration = Math.max(...css.animationDuration.split(',').map(ms), 0);
    const delay = Math.max(...css.animationDelay.split(',').map(ms), 0);
    setTimeout(() => { target.removeEventListener('animationend', end); markDone(target); }, duration + delay + 100);
  });
}, {threshold: 0}) : null;

function initializeScrollAnimationTrigger(root = document, editorEvent = false) {
  initializeScrollZoomAnimationTrigger(root);
  const elements = [...root.querySelectorAll(SCROLL_ANIMATION_TRIGGER_CLASSNAME)];
  if (root.matches?.(SCROLL_ANIMATION_TRIGGER_CLASSNAME)) elements.unshift(root);
  const editor = editorEvent || document.documentElement.classList.contains('shopify-design-mode') || window.Shopify?.designMode;
  const productInformation = '.product-detail__information, .product-single__information';
  const fresh = [];
  elements.forEach(el => {
    const essentialProductContent = el.closest(productInformation) || el.querySelector(productInformation);
    if (essentialProductContent || editor || reducedMotion() || !revealObserver || el.hasAttribute(SCROLL_ANIMATION_DONE_ATTR)) {
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
    el.classList.add('scroll-trigger--offscreen', 'scroll-trigger--armed');
    revealObserver.observe(el);
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initializeScrollAnimationTrigger(), {once:true});
else initializeScrollAnimationTrigger();

['shopify:section:load', 'shopify:section:select', 'shopify:section:reorder'].forEach(name => {
  document.addEventListener(name, event => initializeScrollAnimationTrigger(event.target, true));
});
document.addEventListener('shopify:section:unload', event => {
  [event.target, ...event.target.querySelectorAll(SCROLL_ANIMATION_TRIGGER_CLASSNAME)].forEach(el => revealObserver?.unobserve(el));
  [event.target, ...event.target.querySelectorAll('.animate--zoom-in')].forEach(el => { zoomObserver?.unobserve(el); visibleZoom.delete(el); });
});
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => initializeScrollAnimationTrigger());
