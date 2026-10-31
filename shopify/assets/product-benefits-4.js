/* Materia Themes. Product Benefits 4 (sections/product-benefits-4.storelib).
   Draws the desktop lines once the stage is in view and moves the phone
   slider by one card with the arrows. Sets up every instance on the page,
   once each, and again for a section the builder draws again. */
(function () {
  if (window.MateriaPb4) return;

  function setup(root) {
    var stage = root.querySelector('[data-pb4h-stage]');
    if (stage && !stage.__pb4hInit) {
      stage.__pb4hInit = true;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            stage.classList.add('pb4h--revealed');
            io.disconnect();
          }
        });
      }, { threshold: 0.25, rootMargin: '0px 0px -80px 0px' });
      io.observe(stage);
    }

    var slider = root.querySelector('[data-pb4h-slider]');
    if (slider && !slider.__pb4hInit) {
      slider.__pb4hInit = true;
      var prev = root.querySelector('[data-pb4h-prev]');
      var next = root.querySelector('[data-pb4h-next]');
      var scrollByCard = function (dir) {
        var card = slider.querySelector('.pb4h__slide');
        if (!card) return;
        var w = card.getBoundingClientRect().width + 16;
        slider.scrollBy({ left: dir * w, behavior: 'smooth' });
      };
      if (prev) prev.addEventListener('click', function () { scrollByCard(-1); });
      if (next) next.addEventListener('click', function () { scrollByCard(1); });
    }
  }

  function init(scope) {
    var s = scope && scope.querySelectorAll ? scope : document;
    if (s.matches && s.matches('[data-pb4h-root]')) setup(s);
    s.querySelectorAll('[data-pb4h-root]').forEach(setup);
  }

  window.MateriaPb4 = { init: init };
  init(document);
  document.addEventListener('storelib:section-load', function (e) { init(e.target); });
})();
