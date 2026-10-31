/* Materia Themes. Keeps testimonials.css applied while the builder redraws the
   section: a redraw swaps the section's markup, dropping its own <link> until
   the copy in the new markup loads, so one copy is kept in <head> (same file,
   same rules). Loaded once (deferred). */
(function () {
  var link = document.querySelector('link[href*="/testimonials.css"]');
  if (!link || link.parentNode === document.head || document.head.querySelector('link[data-kept-styles="testimonials"]')) return;
  var copy = link.cloneNode();
  copy.setAttribute('data-kept-styles', 'testimonials');
  document.head.appendChild(copy);
})();
