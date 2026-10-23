/* Materia: event delegation survives cart re-rendering and theme-editor section replacement. */
(() => {
  if (window.__materiaExperienceReady) return;
  window.__materiaExperienceReady = true;
  function syncButtons(scope = document) {
    const purchase = '.product-detail__buy-buttons :is(button[name="add"], .shopify-payment-button__button:not(.shopify-payment-button__button--branded)), .product-detail__information :is(.btn-primary, .btn-secondary, .btn-outline, [data-sl-button]):not(.btn-reset):not(.icon-btn):not(.quantity__button), .product-item__button-submit, .footer__newsletter button[type="submit"]';
    scope.querySelectorAll(purchase).forEach(button => {
      const role = button.matches('.shopify-payment-button__button, .btn-secondary, .btn-outline') ? 'secondary' : 'primary';
      button.setAttribute('data-theme-button', role);
      button.setAttribute('data-sl-button', '');
    });
    document.querySelectorAll('[data-theme-button]').forEach(button => {
      const role = button.getAttribute('data-theme-button');
      let wrapper = button.closest('[data-atc-appearance]');
      const sticky = button.closest('sticky-add-cart');
      if (sticky) {
        const source = document.getElementById('shopify-section-' + sticky.dataset.sectionId);
        wrapper = source?.querySelector('[data-atc-appearance]') || wrapper;
        const original = wrapper?.querySelector(role === 'secondary' ? '.shopify-payment-button__button:not(.shopify-payment-button__button--branded)' : 'button[name="add"]');
        const weight = original && getComputedStyle(original).getPropertyValue('--mb-weight').trim();
        if (weight) button.style.setProperty('--mb-weight', weight);
        else button.style.removeProperty('--mb-weight');
      }
      const local = button.dataset.buttonLocalAppearance || wrapper?.dataset[role === 'secondary' ? 'buyAppearance' : 'atcAppearance'];
      const appearance = local && local !== 'theme' ? local : document.body?.getAttribute(role === 'secondary' ? 'data-btn-secondary-style' : 'data-btn-style');
      button.setAttribute('data-button-appearance', appearance || (role === 'secondary' ? 'outline' : 'solid'));
    });
  }
  document.addEventListener('DOMContentLoaded', () => syncButtons());
  document.addEventListener('storelib:section-load', () => syncButtons());
  document.addEventListener('shopify:section:load', () => syncButtons());
  document.addEventListener('storelib:settings-change', () => requestAnimationFrame(() => syncButtons()));
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === 1 && (node.matches('.shopify-payment-button__button') || node.querySelector('.shopify-payment-button__button'))) syncButtons(node.parentElement || document);
    }
  }).observe(document.documentElement, {childList: true, subtree: true});
  syncButtons();
  // Give native and Storelib-managed forms immediate feedback without replacing
  // their submission handler, validation, captcha, or server confirmation.
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!form.matches('form.newsletter-form, form.footer__newsletter, form[data-storelib-form="subscribe"], form:has(input[name="contact[email]"])')) return;
    if (form.getAttribute('aria-busy') === 'true') { event.preventDefault(); return; }
    const button = event.submitter || form.querySelector('[type="submit"]');
    form.setAttribute('aria-busy', 'true');
    button?.classList.add('materia-form-pending');
    const done = () => { form.removeAttribute('aria-busy'); button?.classList.remove('materia-form-pending'); watch.disconnect(); };
    const watch = new MutationObserver(() => {
      if (form.querySelector('[role="alert"], .form__message, .newsletter-form__message--success')?.getClientRects().length) done();
    });
    watch.observe(form, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'data-state']});
    window.addEventListener('pageshow', done, {once: true});
    form.addEventListener('reset', done, {once: true});
  }, true);
  // Checkout permission is a checkout decision, not an arbitrary styling state.
  function syncTerms(scope = document) {
    const drawer = scope.querySelector?.('#cart-terms-agree-drawer') || document.getElementById('cart-terms-agree-drawer');
    const page = scope.querySelector?.('#cart-terms-agree') || document.getElementById('cart-terms-agree');
    for (const [key, box] of [['drawer', drawer], ['page', page]]) {
      for (const action of document.querySelectorAll('[data-requires-terms="' + key + '"]')) {
        const agreed = Boolean(box?.checked);
        action.setAttribute('aria-disabled', agreed ? 'false' : 'true');
        if ('disabled' in action) action.disabled = !agreed;
        if (action.matches('a')) {
          if (!agreed) { action.tabIndex = -1; }
          else action.removeAttribute('tabindex');
        }
      }
    }
  }
  document.addEventListener('change', e => {
    if (e.target?.matches?.('#cart-terms-agree-drawer, #cart-terms-agree')) syncTerms();
  });
  document.addEventListener('click', e => {
    const action = e.target.closest?.('a[data-requires-terms]');
    if (action && action.getAttribute('aria-disabled') === 'true') e.preventDefault();
  }, true);
  document.addEventListener('submit', e => {
    const form = e.target;
    if (!form.matches?.('#minicart, #cart, form[action*="/cart"]')) return;
    const submitter = e.submitter;
    if (submitter?.matches?.('[data-requires-terms]') && submitter.disabled) e.preventDefault();
  }, true);
  const refresh = () => { syncTerms(); };
  document.addEventListener('cart:updated', () => syncButtons());
  document.addEventListener('materia:cart-drawer-updated', () => syncButtons());
  document.addEventListener('DOMContentLoaded', refresh);
  document.addEventListener('cart:refresh', refresh);
  document.addEventListener('cart:updated', refresh);
  document.addEventListener('shopify:section:load', refresh);
  // Watch only additions; no redundant full-document scans on every mutation.
  if (document.documentElement) {
    // Reopening the drawer after an editor re-render belongs to the drawer's own
    // helper (cart-drawer-polish), which restores it in place without animating.
    const observer = new MutationObserver(records => {
      let hasNewControls = false;
      for (const record of records) {
        hasNewControls ||= [...record.addedNodes].some(node => node.nodeType === 1 &&
          (node.matches?.('#minicart_wrapper, #minicart-form, .drawer-bottom, #cart-terms-agree-drawer') ||
           node.querySelector?.('[data-requires-terms], #cart-terms-agree-drawer')));
      }
      if (hasNewControls) refresh();
    });
    observer.observe(document.documentElement, {childList:true, subtree:true});
  }
  // One coordinated offset for the pinned announcement bar and sticky header.
  // The placeholder remains in the original flow, avoiding a jump when the bar pins.
  const topbarControllers = new WeakMap();
  function initStickyTopbars() {
    document.querySelectorAll('[data-materia-sticky-topbar="true"]').forEach(bar => {
      const section = bar.closest('[id^="shopify-section-"]');
      if (!section || topbarControllers.has(section)) return;
      const spacer = document.createElement('div');
      spacer.className = 'materia-topbar-placeholder';
      spacer.setAttribute('aria-hidden', 'true');
      section.before(spacer);
      let pinned = false, raf = 0;
      const root = document.documentElement;
      const header = () => document.querySelector('.section-header');
      const height = () => Math.ceil(bar.getBoundingClientRect().height || section.getBoundingClientRect().height);
      const resetHeader = () => {
        const h = header();
        if (h) {
          h.style.removeProperty('--materia-topbar-header-offset');
          if (h.dataset.materiaPillOffset === 'true') { h.style.removeProperty('top'); delete h.dataset.materiaPillOffset; }
        }
        root.style.removeProperty('--materia-pinned-topbar-height');
        root.classList.remove('materia-topbar-pinned');
      };
      const refresh = () => {
        if (!section.isConnected || !spacer.isConnected) return;
        const visible = getComputedStyle(bar).display !== 'none' && bar.getClientRects().length > 0;
        // Always measure the spacer's normal in-flow position, including once fixed.
        const threshold = spacer.getBoundingClientRect().top + window.scrollY;
        const next = visible && window.scrollY > threshold + 1;
        const h = height();
        if (next) {
          spacer.style.height = h + 'px';
          spacer.style.display = 'block';
          section.style.setProperty('position', 'fixed', 'important');
          section.style.setProperty('top', '0px', 'important');
          section.style.setProperty('left', '0px', 'important');
          section.style.setProperty('right', '0px', 'important');
          section.style.setProperty('width', '100%', 'important');
          section.style.setProperty('z-index', '60', 'important');
          root.style.setProperty('--materia-pinned-topbar-height', h + 'px');
          root.classList.add('materia-topbar-pinned');
          const sticky = header();
          if (sticky) {
            sticky.style.setProperty('--materia-topbar-header-offset', h + 'px');
            if (sticky.querySelector('.header.is-pill')) {
              sticky.style.setProperty('top', h + 'px', 'important');
              sticky.dataset.materiaPillOffset = 'true';
            }
          }
        } else if (pinned) {
          ['position','top','left','right','width','z-index'].forEach(p => section.style.removeProperty(p));
          spacer.style.height = '0px';
          resetHeader();
        }
        pinned = next;
      };
      const schedule = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = 0; refresh(); });
      };
      window.addEventListener('scroll', schedule, {passive:true});
      window.addEventListener('resize', schedule, {passive:true});
      const resize = 'ResizeObserver' in window ? new ResizeObserver(schedule) : null;
      resize?.observe(bar);
      const cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        resize?.disconnect();
        resetHeader();
        spacer.remove();
        topbarControllers.delete(section);
      };
      topbarControllers.set(section, cleanup);
      schedule();
    });
  }
  document.addEventListener('DOMContentLoaded', initStickyTopbars);
  document.addEventListener('shopify:section:load', initStickyTopbars);
  document.addEventListener('shopify:section:unload', event => {
    const section = event.target?.matches?.('[id^="shopify-section-"]') ? event.target : event.target?.closest?.('[id^="shopify-section-"]');
    topbarControllers.get(section)?.();
  });
  // Drawers start below visible announcement chrome. One ResizeObserver writes
  // a single root variable; opening a drawer never measures or rearranges it.
  let announcementResize;
  function syncAnnouncementHeight() {
    announcementResize?.disconnect();
    const candidates = [...document.querySelectorAll('.section-announcement-bar, [id*="announcement-bar"], [data-sticky-announcement], [data-sticky-topbar], announcement-bar, .unique-announcement-bar, .abp4')];
    const bars = candidates.map(node => node.closest('.shopify-section') || node)
      .filter((node, index, all) => all.indexOf(node) === index)
      .filter((node, _index, all) => !all.some(other => other !== node && other.contains(node)));
    bars.forEach(node => node.setAttribute('data-materia-announcement', ''));
    const measure = () => {
      const height = bars.reduce((total, node) => {
        if (!node.isConnected || getComputedStyle(node).display === 'none') return total;
        return total + Math.ceil(node.getBoundingClientRect().height);
      }, 0);
      document.documentElement.style.setProperty('--materia-announcement-height', height + 'px');
    };
    announcementResize = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
    bars.forEach(node => announcementResize?.observe(node));
    measure();
  }
  document.addEventListener('DOMContentLoaded', syncAnnouncementHeight);
  document.addEventListener('shopify:section:load', syncAnnouncementHeight);
  document.addEventListener('storelib:section-load', syncAnnouncementHeight);
  syncTerms();
  initStickyTopbars();
  syncAnnouncementHeight();
})();
