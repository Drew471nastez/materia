/* Materia Themes. FAQ (sections/faq-pro.storelib).
   Opens and closes the questions (one at a time unless the list allows
   several) and plays the section's own reveal. Sets up every FAQ on the
   page, once each, and again for a section the builder draws again. */
(function () {
  if (window.MateriaFaqPro) return;

  function setup(root) {
    var list = root.querySelector('[data-faq7-list]');
    if (!list || list.__faq7Init) return;
    list.__faq7Init = true;
    var multiple = list.dataset.multiple === 'true';
    list.addEventListener('click', function (e) {
      var trig = e.target.closest('[data-faq7-trigger]');
      if (!trig) return;
      var item = trig.closest('[data-faq7-item]');
      if (!item) return;
      var isOpen = item.hasAttribute('open');
      if (!multiple) {
        list.querySelectorAll('[data-faq7-item][open]').forEach(function (it) {
          if (it !== item) {
            it.removeAttribute('open');
            var btn = it.querySelector('[data-faq7-trigger]');
            if (btn) btn.setAttribute('aria-expanded', 'false');
          }
        });
      }
      if (isOpen) { item.removeAttribute('open'); trig.setAttribute('aria-expanded', 'false'); }
      else { item.setAttribute('open', ''); trig.setAttribute('aria-expanded', 'true'); }
    });
    var animation = root.getAttribute('data-faq7-anim');
    var revealEl = root;
    if (document.body.classList.contains('shopify-design-mode')) {
      revealEl.classList.add('is-revealed');
    } else if (animation && animation !== 'none') {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            revealEl.classList.add('is-revealed');
            obs.unobserve(revealEl);
          }
        });
      }, { threshold: 0.12 });
      io.observe(revealEl);
    } else {
      revealEl.classList.add('is-revealed');
    }
  }

  function init(scope) {
    var s = scope && scope.querySelectorAll ? scope : document;
    if (s.matches && s.matches('[data-faq7-root]')) setup(s);
    s.querySelectorAll('[data-faq7-root]').forEach(setup);
  }

  window.MateriaFaqPro = { init: init };
  init(document);
  document.addEventListener('storelib:section-load', function (e) { init(e.target); });
})();
