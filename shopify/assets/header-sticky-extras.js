/* Materia Themes. The parts of snippets/header-sticky-controller that only
   answer the shopper (a drawer or search closing, the Back button, the phone
   menu opening), moved into a cached file loaded deferred by that snippet.
   None of them can act before the theme's own deferred scripts have run. */
(() => {
  /* The announcement and top bar stay under the page dimming until it has
     faded out, so they brighten with the rest of the page, not before it. */
  if (!window.StorelibOverlayFade) {
    const root = document.documentElement;
    let wasOpen = root.matches('.open-search, .open-minicart');
    let fadeTimer;
    new MutationObserver(() => {
      const open = root.matches('.open-search, .open-minicart');
      if (wasOpen && !open) {
        root.classList.add('overlay-closing');
        clearTimeout(fadeTimer);
        fadeTimer = setTimeout(() => root.classList.remove('overlay-closing'), 650);
      } else if (open && root.classList.contains('overlay-closing')) {
        clearTimeout(fadeTimer);
        root.classList.remove('overlay-closing');
      }
      wasOpen = open;
    }).observe(root, {attributes: true, attributeFilter: ['class']});
    window.StorelibOverlayFade = true;
  }

  /* Coming back with the Back button can restore a page frozen with a drawer
     open and the page locked. Start clean. */
  if (!window.StorelibPageshowUnlock) {
    window.StorelibPageshowUnlock = true;
    addEventListener('pageshow', e => {
      if (!e.persisted) return;
      const root = document.documentElement;
      ['nav-open', 'open-drawer', 'open-minicart', 'open-search', 'nav-verticalmenu', 'overlay-closing']
        .forEach(c => { if (root.classList.contains(c)) root.classList.remove(c); });
      root.style.removeProperty('padding-right');
      document.querySelectorAll('#minicart_wrapper.open, #minicart_wrapper .minicart__wrapper.open').forEach(el => el.classList.remove('open'));
      document.querySelectorAll('.loc-sheet-backdrop.open').forEach(el => el.classList.remove('open'));
    });
  }

  /* Phone menu in the top layer. The theme opens it by adding .nav-open to
     <html>; the drawer is shown as a popover for as long as it is open or
     sliding shut, then hidden again. */
  if (!window.StorelibMenuLayer && HTMLElement.prototype.showPopover) {
    const root = document.documentElement;
    const phone = matchMedia('(max-width: 1024.98px)');
    let closeTimer;
    const drawers = () => [...document.querySelectorAll('.navigation.mobile')];
    const show = nav => {
      if (!nav.hasAttribute('popover')) nav.setAttribute('popover', 'manual');
      if (nav.matches(':popover-open')) return;
      nav.style.transition = 'none';
      nav.style.transform = getComputedStyle(root).direction === 'rtl' ? 'translateX(105%)' : 'translateX(-105%)';
      try { nav.showPopover(); } catch (e) { nav.style.transition = nav.style.transform = ''; return; }
      nav.getBoundingClientRect();
      nav.style.transition = nav.style.transform = '';
    };
    const hide = nav => {
      try { if (nav.matches(':popover-open')) nav.hidePopover(); } catch (e) {}
      nav.removeAttribute('popover');
    };
    const sync = () => {
      clearTimeout(closeTimer);
      if (root.classList.contains('nav-open') && phone.matches) {
        drawers().forEach(show);
      } else {
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        closeTimer = setTimeout(() => {
          if (!root.classList.contains('nav-open') || !phone.matches) drawers().forEach(hide);
        }, reduce ? 0 : 580);
      }
    };
    new MutationObserver(sync).observe(root, {attributes: true, attributeFilter: ['class']});
    phone.addEventListener?.('change', sync);
    document.addEventListener('keydown', e => {
      // theme.js (MateriaMenu) closes the open level first, then the drawer.
      if (window.MateriaMenu) return;
      if (e.key === 'Escape' && root.classList.contains('nav-open') && !document.querySelector('.materia-localization-sheet.is-open')) document.querySelector('.navigation.mobile close-menu')?.click();
    });
    window.StorelibMenuLayer = {sync};
  }
})();
