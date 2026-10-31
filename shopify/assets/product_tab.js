/* Materia Themes. Developed By Materia Themes.
   Product information tabs are run by live-products-a.js, which every page
   loads. This file is kept for a page cached with the old script tag: it
   only binds tab lists that live-products-a.js does not run, and each list
   only switches its own panels. */
(function () {
  if (window.__materiaProductTabLegacy) return;
  window.__materiaProductTabLegacy = true;
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.nav-tabs a[data-block-id]');
    if (!a) return;
    var root = a.closest('.bls__product-tabs, .bls__products-tabs, .bls__product-tabs-content');
    if (!root || root.closest('[data-pa-root]') || root.matches('[data-pa-root]')) return;
    e.preventDefault();
    var li = a.closest('.data.item');
    if (!li || li.classList.contains('active')) return;
    root.querySelectorAll('.data.item').forEach(function (it) { it.classList.remove('active'); });
    root.querySelectorAll('.tab-content .tab-item').forEach(function (it) {
      it.classList.remove('active');
      var p = it.querySelector('.tab-panel'); if (p) p.style.display = 'none';
    });
    var panel = root.querySelector('#' + CSS.escape(a.getAttribute('data-block-id')));
    if (panel) {
      panel.classList.add('active');
      var pp = panel.querySelector('.tab-panel'); if (pp) pp.style.display = 'block';
    }
    li.classList.add('active');
  });
})();
