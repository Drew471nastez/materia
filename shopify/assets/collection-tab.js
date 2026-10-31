/* Materia Themes. Collection tabs (sections/collection-tab): the tab row and
   the reveal on scroll, for every instance on the page. Loaded once (deferred),
   it sets up each [data-collection-tab] root and sets a redrawn one up again on
   storelib:section-load / shopify:section:load. The row is measured only after
   layout (a ResizeObserver's first call), never right after a click or a
   redraw. */
(function () {
  if (window.MateriaCollectionTabs) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Run fn once layout is clean: a ResizeObserver reports right after layout. */
  function afterLayout(el, fn) {
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () { ro.disconnect(); fn(); });
      ro.observe(el);
    } else {
      window.requestAnimationFrame(fn);
    }
  }

  function initTabs(root) {
    if (!root || root.__tiTabs) return;
    root.__tiTabs = true;
    var nav = root.querySelector('.ti-tabs__nav');
    var panelsWrap = root.querySelector('.ti-tabs__panels');
    var btns = Array.prototype.slice.call(root.querySelectorAll('.ti-tabs__btn'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('.ti-tabs__panel'));
    if (!nav || !btns.length) return;
    var isRtl = function () { return getComputedStyle(nav).direction === 'rtl'; };
    var current = function () { return btns.filter(function (b) { return b.classList.contains('is-active'); })[0] || btns[0]; };

    function reveal(btn, smooth) {
      if (nav.scrollWidth <= nav.clientWidth + 1) return;
      var left = btn.offsetLeft - (nav.clientWidth - btn.offsetWidth) / 2;
      nav.scrollTo({ left: left, behavior: smooth && !reduce.matches ? 'smooth' : 'auto' });
    }

    function activate(btn, focus) {
      if (!btn) return;
      if (focus) btn.focus({ preventScroll: true });
      if (btn.classList.contains('is-active')) return;
      var blockId = btn.getAttribute('data-block-id');
      btns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      if (panelsWrap) panelsWrap.setAttribute('data-switched', '');
      panels.forEach(function (p) {
        var on = p.getAttribute('data-block-id') === blockId;
        p.classList.toggle('is-active', on);
        p.classList.toggle('active', on);
        p.removeAttribute('hidden');
        if (on) { p.removeAttribute('inert'); p.removeAttribute('aria-hidden'); }
        else { p.setAttribute('inert', ''); p.setAttribute('aria-hidden', 'true'); }
      });
      afterLayout(nav, function () { reveal(btn, true); });
    }

    nav.addEventListener('click', function (e) {
      var btn = e.target.closest('.ti-tabs__btn');
      if (btn && nav.contains(btn)) activate(btn, false);
    });
    nav.addEventListener('keydown', function (e) {
      var i = btns.indexOf(e.target.closest('.ti-tabs__btn'));
      if (i < 0) return;
      var step = isRtl() ? -1 : 1, next = null;
      if (e.key === 'ArrowRight') next = btns[(i + step + btns.length) % btns.length];
      else if (e.key === 'ArrowLeft') next = btns[(i - step + btns.length) % btns.length];
      else if (e.key === 'Home') next = btns[0];
      else if (e.key === 'End') next = btns[btns.length - 1];
      if (!next) return;
      e.preventDefault();
      activate(next, true);
    });
    if (current() !== btns[0]) afterLayout(nav, function () { reveal(current(), false); });
    root.addEventListener('shopify:block:select', function (e) {
      var id = e.target && e.target.getAttribute && e.target.getAttribute('data-block-id');
      var btn = id && btns.filter(function (b) { return b.getAttribute('data-block-id') === id; })[0];
      if (btn) activate(btn, false);
    });
  }

  function initReveal(section) {
    if (section.__ctReveal) return;
    section.__ctReveal = true;
    var animation = section.getAttribute('data-ct-animation');
    if (document.body.classList.contains('shopify-design-mode') || !('IntersectionObserver' in window)) {
      section.classList.add('is-revealed');
    } else if (animation && animation !== 'none') {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            section.classList.add('is-revealed');
            obs.unobserve(section);
          }
        });
      }, { threshold: 0.1 });
      io.observe(section);
    } else {
      section.classList.add('is-revealed');
    }
  }

  function setup(scope) {
    var list = [];
    if (scope.matches && scope.matches('[data-collection-tab]')) list.push(scope);
    Array.prototype.push.apply(list, scope.querySelectorAll('[data-collection-tab]'));
    list.forEach(function (section) {
      initTabs(section.querySelector('[data-ti-tabs]'));
      initReveal(section);
    });
  }

  function onLoad(e) {
    var target = e.target && e.target.nodeType === 1 ? e.target : null;
    var id = e.detail && e.detail.sectionId;
    var byId = id && document.getElementById('section-' + id);
    if (byId) setup(byId);
    if (target) setup(target);
    if (!byId && !target) setup(document);
  }

  /* The builder redraws a section by swapping its markup, which drops the
     section's own <link> until the copy in the new markup loads. A copy in
     <head> keeps the rules applied through the swap (same file, same rules). */
  function keepStyles() {
    var link = document.querySelector('link[href*="collection-tab.css"]');
    if (!link || link.parentNode === document.head || document.head.querySelector('link[data-ct-kept]')) return;
    var copy = link.cloneNode();
    copy.setAttribute('data-ct-kept', '');
    document.head.appendChild(copy);
  }

  window.MateriaCollectionTabs = { setup: setup };
  keepStyles();
  setup(document);
  ['storelib:section-load', 'shopify:section:load'].forEach(function (name) {
    document.addEventListener(name, onLoad);
  });
})();
