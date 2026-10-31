/* Materia Themes. Footer (sections/theme-footer.storelib).
   Footer columns on phones: one click handler on document for every footer,
   so a footer the builder draws again (storelib:section-load) works at once
   and is never bound twice. A tap toggles .is-open; CSS animates it. */
(function () {
  if (window.MateriaFooterAccordion) return;
  var mq = window.matchMedia('(max-width: 767.98px)');
  function sync(scope) {
    var buttons = (scope && scope.querySelectorAll ? scope : document).querySelectorAll('[data-footer-acc-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i], acc = b.closest('[data-footer-acc]');
      b.setAttribute('aria-expanded', mq.matches ? String(!!(acc && acc.classList.contains('is-open'))) : 'true');
      if (mq.matches) b.removeAttribute('tabindex'); else b.setAttribute('tabindex', '-1');
    }
  }
  window.MateriaFooterAccordion = { sync: sync };
  document.addEventListener('click', function (event) {
    var b = event.target.closest && event.target.closest('[data-footer-acc-toggle]');
    if (!b || !mq.matches) return;
    event.preventDefault();
    var acc = b.closest('[data-footer-acc]');
    if (!acc) return;
    var open = !acc.classList.contains('is-open');
    acc.classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', String(open));
  });
  if (mq.addEventListener) mq.addEventListener('change', function () { sync(); });
  document.addEventListener('storelib:section-load', function (event) { sync(event.target); });
  sync(document);
})();
