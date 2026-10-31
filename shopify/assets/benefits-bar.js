/* Materia Themes. Benefits bar (sections/benefits-bar.storelib).
   With "Mobile layout: slider" the phone shows one benefit at a time and the
   arrows step through them. Sets up every bar on the page, once each, and
   again for a section the builder draws again. */
(function () {
  if (window.MateriaBenefitsBar) return;

  function setup(section) {
    var list = section.querySelector('.LoudzValueIconsBarList--mobileLayout-slider');
    if (!list || list.__bbInit) return;
    list.__bbInit = true;
    var slides = section.querySelectorAll('.LoudzValueIconsBarBlock__Slide');
    var prevBtn = section.querySelector('.LoudzValueIconsBarContainer__Btn--prev');
    var nextBtn = section.querySelector('.LoudzValueIconsBarContainer__Btn--next');
    if (slides.length <= 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      return;
    }
    var currentIndex = 0;
    var totalSlides = slides.length;
    function showSlide(index) {
      slides.forEach(function (slide, i) {
        slide.classList.toggle('LoudzValueIconsBarBlock__Slide-IsVisible', i === index);
      });
    }
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        showSlide(currentIndex);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        currentIndex = (currentIndex + 1) % totalSlides;
        showSlide(currentIndex);
      });
    }
    showSlide(0);
  }

  function init(scope) {
    var s = scope && scope.querySelectorAll ? scope : document;
    if (s.matches && s.matches('.LoudzValueIconsBar')) setup(s);
    s.querySelectorAll('.LoudzValueIconsBar').forEach(setup);
  }

  window.MateriaBenefitsBar = { init: init };
  init(document);
  document.addEventListener('storelib:section-load', function (e) { init(e.target); });
})();
