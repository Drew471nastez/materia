/* Materia Themes. The header's scripts that do not have to run before the
   page is drawn (sections/theme-header). Loaded once, deferred; each part
   sets itself up once per page and follows a redrawn header through
   storelib:section-load. */
(function () {
  /* Count bubbles stay current: the wishlist from its saved list (this tab,
     another tab, or after any wishlist button), the cart from cart events.
     A changed number gets the bubble's animation. Runs once per page. */
  if (window.__materiaCountBubbles) return;
  window.__materiaCountBubbles = true;
  var KEY = 'materia__wishlist-items';
  function wishlistCount() {
    try {
      var items = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(items) ? items.length : 0;
    } catch (e) { return null; }
  }
  function write(selector, value) {
    if (value == null) return;
    var nodes = document.querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].textContent.trim() !== String(value)) nodes[i].textContent = value;
    }
  }
  function syncWishlist() { write('.wishlist-count', wishlistCount()); }
  function bump(node) {
    if (!node || !node.classList || !node.classList.contains('h-count')) return;
    node.classList.remove('is-count-bump');
    void node.offsetWidth;
    node.classList.add('is-count-bump');
  }
  var seen = new WeakMap();
  var observer = new MutationObserver(function (records) {
    for (var r = 0; r < records.length; r++) {
      var target = records[r].target;
      var node = (target.nodeType === 1 ? target : target.parentElement);
      node = node && node.closest('.h-count');
      if (!node) continue;
      var now = node.textContent.trim();
      if (seen.get(node) !== now) bump(node);
      seen.set(node, now);
    }
  });
  /* Only the bubbles are watched; a redrawn header brings new ones. */
  function watch() {
    var nodes = document.querySelectorAll('.h-count');
    for (var i = 0; i < nodes.length; i++) {
      if (seen.has(nodes[i])) continue;
      seen.set(nodes[i], nodes[i].textContent.trim());
      observer.observe(nodes[i], { childList: true, characterData: true, subtree: true });
    }
  }
  document.addEventListener('storelib:section-load', function () { watch(); syncWishlist(); });
  document.addEventListener('shopify:section:load', function () { watch(); syncWishlist(); });
  document.addEventListener('animationend', function (event) {
    if (event.target.classList && event.target.classList.contains('is-count-bump')) event.target.classList.remove('is-count-bump');
  });
  window.addEventListener('storage', function (event) { if (event.key === KEY || event.key === null) syncWishlist(); });
  document.addEventListener('materia:wishlist-change', syncWishlist);
  /* The theme's wishlist buttons save, then the count is read once after the click. */
  document.addEventListener('click', function (event) {
    if (event.target.closest && event.target.closest('button-wishlist, minicart-wishlist-action, .minicart__wishlist, [data-wishlist], .wishlist-page-main')) setTimeout(syncWishlist, 0);
  });
  window.addEventListener('pageshow', syncWishlist);
  function onCart(event) {
    var data = event.detail && (event.detail.data || event.detail.cart || event.detail);
    var count = data && data.item_count;
    if (typeof count === 'number') write('.cart-count.h-count', count > 100 ? '~' : count);
  }
  document.addEventListener('cart:refresh', onCart);
  document.addEventListener('cart:updated', onCart);
  function start() { watch(); syncWishlist(); }
  /* As when this was inline in the header: the bubbles are first read once
     the page has arrived (DOMContentLoaded, after every deferred script), so
     a number another script writes while the page starts is not a change.
     The load listener only covers a copy of this file added after that. */
  if (document.readyState === 'complete') start();
  else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
    window.addEventListener('load', watch, { once: true });
  }
  window.addEventListener('load', syncWishlist, { once: true });
})();

/* Header > Main navigation and Dropdowns & mega menus in the builder: apply
   slider drags to the variables sections/theme-header writes, once per
   frame, without rebuilding the header, measuring it or rebinding its menu.
   The existing resize observer keeps sticky offsets in step with the
   resulting layout. Only the builder sends storelib:settings-change. */
(() => {
  if (window.MateriaHeaderDimensions) return;
  window.MateriaHeaderDimensions = true;
  let frame, pending = {};
  const px = v => Number(v) + 'px';
  const ease = v => {
    const s = Math.min(100, Math.max(0, Number(v))) / 100, r = n => Math.round(n * 1000) / 1000;
    return `cubic-bezier(${r(0.25 - 0.09 * s)}, ${r(0.25 + 0.75 * s)}, ${r(0.75 - 0.45 * s)}, ${r(0.75 + 0.25 * s)})`;
  };
  const MENU_VARS = {
    dropdowns_speed: ['--dd-duration', v => Number(v) + 'ms'],
    dropdowns_smoothness: ['--dd-ease', ease],
    dropdown_width: ['--dd-width', px],
    dropdown_padding: [['--dd-pad-y', px], ['--dd-pad-x', v => Math.round(Number(v) * 1.5) + 'px']],
    dropdown_link_spacing: ['--dd-link-space', px],
    dropdown_radius: ['--dd-radius', px],
    mega_column_gap: ['--mega-gap', px],
    mega_card_radius: ['--mega-card-radius', px],
  };
  document.addEventListener('storelib:settings-change', event => {
    const detail = event.detail || {}, settings = detail.settings || {};
    const own = detail.section ? document.querySelector(`#shopify-section-${CSS.escape(detail.section)} > header.header`) : null;
    if (own) {
      for (const [key, spec] of Object.entries(MENU_VARS)) {
        if (!Object.prototype.hasOwnProperty.call(settings, key) || !Number.isFinite(Number(settings[key]))) continue;
        for (const [name, fn] of Array.isArray(spec[0]) ? spec : [spec]) own.style.setProperty(name, fn(settings[key]));
      }
    }
    for (const key of ['header_height', 'header_height_mobile']) {
      if (Object.prototype.hasOwnProperty.call(settings, key)) pending[key] = settings[key];
    }
    if (!Object.keys(pending).length || frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const header = document.querySelector('header.header');
      const section = header?.closest('.section-header, [id^="shopify-section-"]');
      for (const [key, value] of Object.entries(pending)) {
        const height = Number(value);
        if (section && Number.isFinite(height)) section.style.setProperty(
          key === 'header_height' ? '--header-height-desktop' : '--header-height-mobile',
          Math.min(160, Math.max(48, height)) + 'px'
        );
      }
      pending = {};
    });
  });
})();
