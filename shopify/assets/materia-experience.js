/* Materia: one drag-to-dismiss for every bottom sheet (cart note, estimate,
   coupon, gift wrap, variant edit, country picker). The sheet follows the
   finger 1:1 (transform written once per frame, no transition while held);
   a flick or a long pull closes it at the release speed, anything else
   springs back. The backdrop fades with the pull.
   materiaSheetDrag({root, sheet(target), handle(target, sheet), blocked(target),
   scroller(sheet, target), progress(sheet, p, dragging), dismiss(sheet),
   onStart(sheet), onEnd(sheet)}) */
(() => {
  if (typeof window.materiaSheetDrag === 'function') return;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function materiaSheetDrag(opts) {
    const root = opts.root || document;
    let drag = null, pending = null;
    const write = (sheet, y) => { sheet.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)'; };
    const clear = sheet => { sheet.style.removeProperty('transform'); sheet.style.removeProperty('transition'); };
    const paint = () => {
      if (!drag) return;
      drag.frame = 0;
      write(drag.sheet, drag.dy);
      opts.progress?.(drag.sheet, Math.max(0, drag.dy) / drag.h, true);
    };
    const settleTo = (sheet, y, ms, ease, done) => {
      sheet._materiaSettle?.();
      let finished = false, timer = 0;
      const finish = () => {
        if (finished) return;
        finished = true; clearTimeout(timer);
        sheet.removeEventListener('transitionend', onEnd);
        sheet._materiaSettle = null;
        done?.();
      };
      const onEnd = event => { if (event.target === sheet && event.propertyName === 'transform') finish(); };
      sheet._materiaSettle = () => { finished = true; clearTimeout(timer); sheet.removeEventListener('transitionend', onEnd); sheet._materiaSettle = null; };
      if (!ms) { write(sheet, y); finish(); return; }
      sheet.getBoundingClientRect();
      sheet.style.transition = 'transform ' + ms + 'ms ' + ease;
      write(sheet, y);
      sheet.addEventListener('transitionend', onEnd);
      timer = setTimeout(finish, ms + 80);
    };
    const start = (sheet, y, id, kind) => {
      sheet._materiaSettle?.();
      drag = {sheet, startY: y, dy: 0, h: Math.max(1, sheet.getBoundingClientRect().height), samples: [{y, t: performance.now()}], frame: 0, id, kind};
      sheet.style.transition = 'none';
      sheet.classList.add('is-dragging');
      opts.onStart?.(sheet);
    };
    const move = y => {
      if (!drag) return;
      const raw = y - drag.startY;
      // Down is 1:1 with the finger; up stretches a little and stops.
      drag.dy = raw >= 0 ? raw : -Math.min(24, Math.sqrt(-raw) * 2.2);
      const now = performance.now();
      drag.samples.push({y, t: now});
      while (drag.samples.length > 2 && now - drag.samples[0].t > 100) drag.samples.shift();
      if (!drag.frame) drag.frame = requestAnimationFrame(paint);
    };
    const end = cancelled => {
      const d = drag;
      if (!d) return;
      drag = null;
      if (d.frame) cancelAnimationFrame(d.frame);
      write(d.sheet, d.dy);
      const first = d.samples[0], last = d.samples[d.samples.length - 1];
      const resting = performance.now() - last.t > 120;
      const velocity = resting ? 0 : (last.y - first.y) / Math.max(1, last.t - first.t);
      const dismiss = !cancelled && (d.dy > Math.min(140, d.h * 0.32) || (velocity > 0.45 && d.dy > 12));
      d.sheet.classList.remove('is-dragging');
      opts.onEnd?.(d.sheet, dismiss);
      const still = reduced();
      if (dismiss) {
        const distance = d.h + 32 - d.dy;
        const ms = still ? 0 : Math.round(Math.max(150, Math.min(320, distance / Math.max(velocity, 1.2))));
        opts.progress?.(d.sheet, 1, false, ms);
        settleTo(d.sheet, d.h + 32, ms, 'cubic-bezier(.25,.8,.35,1)', () => {
          opts.dismiss(d.sheet);
          requestAnimationFrame(() => { if (!drag || drag.sheet !== d.sheet) clear(d.sheet); });
        });
      } else {
        const ms = still ? 0 : 440;
        opts.progress?.(d.sheet, 0, false, ms);
        settleTo(d.sheet, 0, ms, 'cubic-bezier(.2,1.25,.4,1)', () => clear(d.sheet));
      }
    };
    const scrolledToTop = (sheet, target) => {
      const scroller = opts.scroller?.(sheet, target) || sheet;
      return !scroller || scroller.scrollTop <= 0;
    };
    // Mouse and pen: from the handle only.
    root.addEventListener('pointerdown', event => {
      if (drag || event.pointerType === 'touch' || event.button !== 0) return;
      const sheet = opts.sheet(event.target);
      if (!sheet || !opts.handle(event.target, sheet) || opts.blocked?.(event.target)) return;
      event.preventDefault();
      start(sheet, event.clientY, event.pointerId, 'pointer');
      try { event.target.setPointerCapture(event.pointerId); } catch (_) {}
    });
    root.addEventListener('pointermove', event => { if (drag?.kind === 'pointer' && drag.id === event.pointerId) move(event.clientY); }, {passive: true});
    root.addEventListener('pointerup', event => { if (drag?.kind === 'pointer' && drag.id === event.pointerId) end(false); });
    root.addEventListener('pointercancel', event => { if (drag?.kind === 'pointer' && drag.id === event.pointerId) end(true); });
    // Touch: the handle drags at once; the body drags once it is pulled down
    // from the top of its scroll. Only the sheet listens non-passively, and
    // only while a finger is on it.
    function touchMove(event) {
      const touch = event.touches[0];
      if (!touch) return;
      if (drag?.kind === 'touch') { if (event.cancelable) event.preventDefault(); move(touch.clientY); return; }
      if (!pending) return;
      const dx = touch.clientX - pending.x, dy = touch.clientY - pending.y;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (pending.handle || (dy > 0 && Math.abs(dy) > Math.abs(dx) && scrolledToTop(pending.sheet, pending.target))) {
        start(pending.sheet, pending.y, null, 'touch');
        if (event.cancelable) event.preventDefault();
        move(touch.clientY);
      }
      pending = null;
    }
    function touchEnd(event) {
      const sheet = event.currentTarget;
      pending = null;
      sheet.removeEventListener('touchmove', touchMove);
      sheet.removeEventListener('touchend', touchEnd);
      sheet.removeEventListener('touchcancel', touchEnd);
      if (drag?.kind === 'touch' && !event.touches.length) end(event.type === 'touchcancel');
    }
    root.addEventListener('touchstart', event => {
      if (drag || event.touches.length !== 1) return;
      const sheet = opts.sheet(event.target);
      if (!sheet || opts.blocked?.(event.target)) return;
      const touch = event.touches[0];
      pending = {sheet, target: event.target, x: touch.clientX, y: touch.clientY, handle: opts.handle(event.target, sheet)};
      sheet.addEventListener('touchmove', touchMove, {passive: false});
      sheet.addEventListener('touchend', touchEnd);
      sheet.addEventListener('touchcancel', touchEnd);
    }, {passive: true});
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && drag) end(true); }, true);
    return {get dragging() { return !!drag; }, cancel: () => end(true)};
  }
  window.materiaSheetDrag = materiaSheetDrag;

  /* The cart drawer's sheets, also the ones a cart update draws again. */
  const SHEET = '#minicart_wrapper .cart__addon-content.is-open';
  const wrapperOf = sheet => sheet.closest('.minicart__wrapper');
  materiaSheetDrag({
    root: document,
    sheet: target => target.closest?.(SHEET) || null,
    handle: target => !!target.closest?.('[data-sheet-grab], .cart-sheet__grab, .addon-title'),
    blocked: target => !!target.closest?.('input, textarea, select, .cart-item__variant-choices, .mcp'),
    scroller: (sheet, target) => {
      for (let el = target; el && el !== sheet; el = el.parentElement) if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)) return el;
      return sheet;
    },
    onStart: sheet => { document.activeElement?.blur?.(); wrapperOf(sheet)?.classList.add('is-sheet-dragging'); },
    onEnd: sheet => wrapperOf(sheet)?.classList.remove('is-sheet-dragging'),
    progress: (sheet, p, dragging) => {
      const wrapper = wrapperOf(sheet);
      if (!wrapper) return;
      if (dragging || p > 0) wrapper.style.setProperty('--cart-sheet-progress', p.toFixed(3));
      else wrapper.style.removeProperty('--cart-sheet-progress');
    },
    dismiss: sheet => {
      const cart = sheet.closest('cart-notification');
      sheet.classList.remove('is-open');
      const opener = cart?.querySelector('.mini_cart_addon_btn[data-open="' + sheet.id + '"]');
      opener?.classList.remove('open');
      opener?.setAttribute('aria-expanded', 'false');
      setTimeout(() => wrapperOf(sheet)?.style.removeProperty('--cart-sheet-progress'), 420);
    },
  });
})();
/* Materia: event delegation survives cart re-rendering and theme-editor section replacement. */
(() => {
  if (window.__materiaExperienceReady) return;
  window.__materiaExperienceReady = true;
  // Native links navigate without a JS delay, but acknowledge the tapped item
  // immediately. Back/forward restores an idle navigation bar.
  let navPendingTimer;
  const clearNavPending = () => {
    clearTimeout(navPendingTimer);
    document.querySelectorAll('mobile-navigation-bar [data-nav-pending]').forEach(link => link.removeAttribute('data-nav-pending'));
  };
  document.addEventListener('click', event => {
    const link = event.target.closest?.('mobile-navigation-bar a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search) || link.matches('[data-storelib-cart], [data-storelib-search], [data-storelib-menu], .cart-icon, .search-icon')) return;
    clearNavPending();
    link.setAttribute('data-nav-pending', '');
    navPendingTimer = setTimeout(clearNavPending, 8000);
  });
  window.addEventListener('pageshow', clearNavPending);
  let pressedNav, pressedTimer;
  const releaseNav = () => {
    clearTimeout(pressedTimer);
    pressedNav?.removeAttribute('data-nav-pressed');
    pressedNav = null;
  };
  document.addEventListener('pointerdown', event => {
    const action = event.target.closest?.('mobile-navigation-bar :is(a,button,[role="button"])');
    if (!action || event.button !== 0) return;
    releaseNav(); pressedNav = action; action.setAttribute('data-nav-pressed','');
  }, {passive:true});
  document.addEventListener('pointerup', () => { if (pressedNav) pressedTimer = setTimeout(releaseNav,120); }, {passive:true});
  document.addEventListener('pointercancel', releaseNav, {passive:true});
  window.addEventListener('pageshow', releaseNav);
  function syncButtons(scope = document) {
    const select = selector => [
      ...(scope.matches?.(selector) ? [scope] : []),
      ...scope.querySelectorAll(selector),
    ];
    const attr = (node, name, value) => {
      if (node.getAttribute(name) !== value) node.setAttribute(name, value);
    };
    select('.cart-discount-remove[data-theme-button]').forEach(button => {
      ['data-theme-button','data-sl-button','data-button-appearance','data-button-hover'].forEach(name => button.removeAttribute(name));
    });
    const purchase = '.product-detail__buy-buttons :is(button[name="add"], .shopify-payment-button__button:not(.shopify-payment-button__button--branded)), .product-detail__information :is(.btn-primary, .btn-secondary, .btn-outline, [data-sl-button]):not(.btn-reset):not(.icon-btn):not(.quantity__button), .product-item__button-submit, .footer__newsletter button[type="submit"], #minicart_wrapper .cart__addon-content :is(.btn-save, .coupon-apply, .add-giftwrap, .btn-cancel), #minicart_wrapper .drawer-bottom :is(.btn-primary, .btn-outline, .btn-secondary)';
    const shared = ':is(a, button, input[type="submit"]):is(.btn, .btn-white, .btn-primary, .btn-secondary, .btn-outline, [data-sl-button], [data-button-role]):not(.btn-reset):not(.icon-btn):not(.btn-icon--circle):not(.quantity__button):not(.swiper-arrow):not(.cart-discount-remove)';
    select(purchase + ', ' + shared).forEach(button => {
      const declared = button.dataset.buttonRole;
      const role = button.dataset.themeButton || (['primary','secondary'].includes(declared) ? declared : (button.matches('.shopify-payment-button__button, .btn-secondary, .btn-outline, .btn-cancel') ? 'secondary' : 'primary'));
      attr(button, 'data-theme-button', role);
      attr(button, 'data-sl-button', '');
    });
    select('[data-theme-button]').forEach(button => {
      const role = button.getAttribute('data-theme-button');
      // Extra movement is additive. "None" must not cancel the main effect.
      attr(button, 'data-button-hover', document.body?.dataset.btnHover || 'fade');
      let wrapper = button.closest('[data-atc-appearance]');
      const sticky = button.closest('sticky-add-cart');
      if (sticky) {
        const source = document.getElementById('shopify-section-' + sticky.dataset.sectionId);
        wrapper = source?.querySelector('[data-atc-appearance]') || wrapper;
        const original = wrapper?.querySelector(role === 'secondary' ? '.shopify-payment-button__button:not(.shopify-payment-button__button--branded)' : 'button[name="add"]');
        const weight = original && getComputedStyle(original).getPropertyValue('--mb-weight').trim();
        if (weight && button.style.getPropertyValue('--mb-weight') !== weight) button.style.setProperty('--mb-weight', weight);
        else if (!weight && button.style.getPropertyValue('--mb-weight')) button.style.removeProperty('--mb-weight');
      }
      const local = button.dataset.buttonLocalAppearance || (button.dataset.buttonOutline === 'true' ? 'outline' : null) || wrapper?.dataset[role === 'secondary' ? 'buyAppearance' : 'atcAppearance'];
      const appearance = local && local !== 'theme' ? local : document.body?.getAttribute(role === 'secondary' ? 'data-btn-secondary-style' : 'data-btn-style');
      attr(button, 'data-button-appearance', appearance || (role === 'secondary' ? 'outline' : 'solid'));
    });
  }
  /* Search opens from the header: --search-top is the header's bottom edge
     at the moment it opens (0 when the header is out of view). */
  const searchTop = () => {
    const header = document.querySelector('.section-header header.header, header.header');
    const bottom = header ? header.getBoundingClientRect().bottom : 0;
    const top = bottom > 0 && bottom < innerHeight * 0.6 ? Math.round(bottom) : 0;
    document.documentElement.style.setProperty('--search-top', top + 'px');
  };
  let searchOpen = document.documentElement.classList.contains('open-search');
  new MutationObserver(() => {
    const open = document.documentElement.classList.contains('open-search');
    if (open && !searchOpen) searchTop();
    searchOpen = open;
  }).observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
  addEventListener('resize', () => { if (searchOpen) searchTop(); }, {passive: true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => syncButtons(), {once:true});
  const sectionButtons = event => {
    const id = event.detail?.sectionId;
    const scope = event.target?.nodeType === 1 ? event.target : (id && document.getElementById('shopify-section-' + id));
    syncButtons(scope || document);
    // Sticky purchase bars may be portaled outside their source section.
    if (scope?.matches?.('[data-atc-appearance]') || scope?.querySelector('[data-atc-appearance]')) {
      document.querySelectorAll('sticky-add-cart').forEach(sticky => syncButtons(sticky));
    }
  };
  document.addEventListener('storelib:section-load', sectionButtons);
  document.addEventListener('shopify:section:load', sectionButtons);
  document.addEventListener('storelib:settings-change', () => {
    if (!window.__materiaThemeLive) requestAnimationFrame(() => syncButtons());
  });
  // theme-live applies settings in its own animation frame, after the original
  // Storelib event. Read appearance/effect attributes only once they are current.
  document.addEventListener('materia:theme-applied', event => {
    const changed = event.detail?.settings;
    if (!changed || ['btn_style','btn_secondary_style','btn_hover_effect','storelib_button_hover_effect','btn_font_weight'].some(key => Object.prototype.hasOwnProperty.call(changed,key))) syncButtons();
    if (changed && Object.prototype.hasOwnProperty.call(changed, 'cart_drawer_recommend_pagination')) {
      const mode = ['dots','progress','none'].includes(changed.cart_drawer_recommend_pagination) ? changed.cart_drawer_recommend_pagination : 'dots';
      document.querySelectorAll('.swiper-cart-upsell').forEach(slider => {
        slider.dataset.recommendPagination = mode;
        slider.dataset.paginationProgressbar = String(mode === 'progress');
        const swiper = slider.globalSlide;
        if (!swiper?.pagination) return;
        swiper.pagination.destroy();
        swiper.params.pagination.type = mode === 'progress' ? 'progressbar' : 'bullets';
        swiper.pagination.init();
        swiper.pagination.render();
        swiper.pagination.update();
      });
    }
  });
  new MutationObserver(records => {
    const scopes = new Set();
    const controls = '.shopify-payment-button__button, [data-theme-button], [data-sl-button], .btn-primary, .btn-secondary, .btn-outline';
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === 1 && (node.matches(controls) || node.querySelector(controls))) scopes.add(node);
    }
    scopes.forEach(scope => { if (scope.isConnected) syncButtons(scope); });
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
  const drawerButtons = () => syncButtons(document.querySelector('#minicart_wrapper, cart-notification, cart-drawer') || document);
  document.addEventListener('cart:updated', drawerButtons);
  document.addEventListener('materia:cart-drawer-updated', drawerButtons);
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
  syncTerms();
  initStickyTopbars();
})();

/* Shipping estimate, Storelib's own. The cart page and drawer forms used
   Shopify's country list and /cart/shipping_rates.json, neither of which
   exists here. Countries come from the browser (named in the visitor's
   language), rates from Theme settings > Shopping Cart > Shipping rates
   ("DE, AT = 4.90", "* = 9.90"), free shipping from the free-shipping
   amount. A country without a rate is told shipping is set at checkout. */
(() => {
  if (window.__materiaShippingReady) return;
  window.__materiaShippingReady = true;
  const CODES = 'AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
  let data = null;
  const read = () => {
    if (data) return data;
    try { data = JSON.parse(document.getElementById('materia-shipping-data')?.textContent || '{}'); } catch (e) { data = {}; }
    data.text = data.text || {};
    return data;
  };
  const lang = () => document.documentElement.lang || navigator.language || 'en';
  const names = (() => { try { return new Intl.DisplayNames([lang()], {type: 'region'}); } catch (e) { return null; } })();
  const nameOf = code => (names && names.of(code)) || code;
  const fill = (text, values) => String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => values[k] ?? '');
  const money = (amount, currency) => {
    try { return new Intl.NumberFormat(lang(), {style: 'currency', currency: currency || 'EUR'}).format(amount); }
    catch (e) { return amount.toFixed(2) + ' ' + (currency || ''); }
  };
  /* "DE, AT, FR = 4.90" per line; "*" is every other country. */
  const rateFor = (code) => {
    let fallback = null;
    for (const line of String(read().rates || '').split(/\r?\n/)) {
      const [left, right] = line.split('=');
      if (right == null) continue;
      const price = parseFloat(right.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isFinite(price)) continue;
      const codes = left.split(/[,\s]+/).map(c => c.trim().toUpperCase()).filter(Boolean);
      if (codes.includes(code)) return price;
      if (codes.includes('*')) fallback = price;
    }
    return fallback;
  };
  const visitorCountry = () => {
    const set = String(read().country || '').toUpperCase();
    if (CODES.includes(set)) return set;
    const region = (navigator.language || '').split('-')[1];
    return region && CODES.includes(region.toUpperCase()) ? region.toUpperCase() : '';
  };
  function prepare(root) {
    if (root.dataset.materiaShipping) return;
    root.dataset.materiaShipping = 'ready';
    const select = root.querySelector('select[name="address[country]"]');
    if (!select) return;
    select.removeAttribute('data-default');
    const chosen = select.value && CODES.includes(select.value) ? select.value : visitorCountry();
    const options = CODES.map(code => [code, nameOf(code)]).sort((a, b) => a[1].localeCompare(b[1], lang()));
    select.innerHTML = '';
    const blank = new Option(read().text.choose || '', '');
    blank.disabled = true;
    select.add(blank);
    for (const [code, label] of options) select.add(new Option(label, code));
    select.value = chosen || '';
    if (!select.value) blank.selected = true;
  }
  async function subtotal() {
    try {
      const res = await fetch((window.routes?.cart_url || '/cart') + '.js', {headers: {Accept: 'application/json'}});
      const cart = await res.json();
      if (typeof cart.total_price === 'number') return {cents: cart.total_price, currency: cart.currency};
    } catch (e) {}
    return {cents: Number(read().subtotal) || 0, currency: read().currency};
  }
  async function estimate(button) {
    const box = button.closest('cart-estimate, .cart__addon-content, #shipping') || document;
    const root = box.querySelector('[data-address="root"]');
    const select = root?.querySelector('select[name="address[country]"]');
    const out = box.querySelector('.addon-message') || (() => { const d = document.createElement('div'); d.className = 'addon-message mt-15'; box.querySelector('.addon-actions')?.after(d); return d; })();
    const d = read(), t = d.text;
    out.setAttribute('role', 'status');
    out.classList.add('materia-ship-result');
    if (!select || !select.value) { out.textContent = t.choose || ''; select?.focus(); return; }
    const code = select.value, country = nameOf(code);
    const price = rateFor(code);
    if (price == null) { out.textContent = fill(t.atCheckout, {country}); return; }
    button.setAttribute('aria-busy', 'true');
    const {cents, currency} = await subtotal();
    button.removeAttribute('aria-busy');
    const cur = currency || d.currency;
    const freeMin = parseFloat(String(box.closest('#minicart_wrapper, cart-notification') ? d.freeDrawer : d.freePage).replace(',', '.'));
    const free = price === 0 || (isFinite(freeMin) && freeMin > 0 && cents / 100 >= freeMin);
    out.innerHTML = '';
    const line = document.createElement('p');
    line.className = 'materia-ship-result__line';
    const label = document.createElement('span');
    label.textContent = fill(t.rateTo, {country});
    const value = document.createElement('strong');
    value.textContent = free ? (t.free || '0') : money(price, cur);
    line.append(label, value);
    out.append(line);
    if (d.delivery) { const p = document.createElement('p'); p.className = 'materia-ship-result__note'; p.textContent = d.delivery; out.append(p); }
    if (!free && isFinite(freeMin) && freeMin > 0) { const p = document.createElement('p'); p.className = 'materia-ship-result__note'; p.textContent = fill(t.freeOver, {amount: money(freeMin, cur)}); out.append(p); }
  }
  /* Country picker. The native select stays in the form as the value the
     estimate reads; this draws the choice like the theme's own country and
     language selector: a dropdown under the field on desktop, a bottom sheet
     with a handle, search and drag to close on phones. Without script the
     select is shown as it is. */
  const pickers = new WeakMap();
  const MOBILE = '(max-width: 1024.98px)';
  const isMobile = () => window.matchMedia(MOBILE).matches;
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canPop = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  let pickerSeq = 0, openPicker = null;
  const layer = (el, show) => {
    if (!el || !canPop || !el.hasAttribute('popover')) return;
    try { if (show) { if (!el.matches(':popover-open')) el.showPopover(); } else if (el.matches(':popover-open')) el.hidePopover(); } catch (e) {}
  };
  const chevron = '<svg class="mcp-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const lens = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function buildPicker(select) {
    const n = ++pickerSeq, id = 'mcp-' + n;
    const wrap = document.createElement('div');
    wrap.className = 'mcp';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = id + '-trigger';
    trigger.className = 'mcp-trigger form-control';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', id + '-panel');
    trigger.innerHTML = '<span class="mcp-value"></span>' + chevron;
    const label = select.id && select.closest('form, [data-address="root"], body')?.querySelector('label[for="' + CSS.escape(select.id) + '"]');
    if (label) {
      if (!label.id) label.id = id + '-label';
      trigger.setAttribute('aria-labelledby', label.id + ' ' + id + '-trigger');
    }
    const panel = document.createElement('div');
    panel.id = id + '-panel';
    panel.className = 'mcp-panel';
    panel.hidden = true;
    if (canPop) panel.setAttribute('popover', 'manual');
    const searchLabel = select.dataset.searchLabel || 'Search';
    panel.innerHTML = '<div class="mcp-head"><div class="mcp-grab" aria-hidden="true"></div><label class="mcp-search">' + lens + '<input type="search" autocomplete="off" spellcheck="false" enterkeyhint="search"></label></div><div class="mcp-list" role="listbox" tabindex="-1"></div><p class="mcp-empty" role="status" hidden></p>';
    const input = panel.querySelector('input');
    input.placeholder = searchLabel;
    input.setAttribute('aria-label', searchLabel);
    input.setAttribute('aria-controls', id + '-list');
    input.setAttribute('aria-autocomplete', 'list');
    const list = panel.querySelector('.mcp-list');
    list.id = id + '-list';
    if (label) list.setAttribute('aria-labelledby', label.id);
    const empty = panel.querySelector('.mcp-empty');
    empty.textContent = select.dataset.emptyLabel || 'No matches';
    // The backdrop lives beside the panel, so a tap on it stays inside the
    // drawer or form and closes only the picker.
    const backdrop = document.createElement('div');
    backdrop.className = 'mcp-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    if (canPop) backdrop.setAttribute('popover', 'manual');
    backdrop.addEventListener('click', event => { event.stopPropagation(); api.close(true); });
    wrap.append(trigger, backdrop, panel);
    select.after(wrap);
    select.classList.add('mcp-native');
    select.setAttribute('tabindex', '-1');
    select.setAttribute('aria-hidden', 'true');

    let items = [], active = -1, closeTimer = 0, built = '';
    const visible = () => items.filter(item => !item.hidden);
    const sync = () => {
      const opt = select.options[select.selectedIndex];
      const text = opt && opt.value ? opt.textContent.trim() : (select.dataset.placeholder || read().text.choose || opt?.textContent.trim() || '');
      const value = trigger.firstElementChild;
      if (value.textContent !== text) value.textContent = text;
      trigger.classList.toggle('is-placeholder', !(opt && opt.value));
    };
    const fillList = () => {
      const key = [...select.options].map(o => o.value + ':' + o.textContent).join('|');
      if (key !== built) {
        built = key;
        list.textContent = '';
        items = [];
        [...select.options].forEach((opt, i) => {
          if (!opt.value || opt.disabled) return;
          const item = document.createElement('div');
          item.className = 'mcp-option';
          item.id = id + '-o' + i;
          item.setAttribute('role', 'option');
          item.dataset.value = opt.value;
          item.dataset.search = norm(opt.textContent + ' ' + opt.value);
          item.textContent = opt.textContent.trim();
          list.appendChild(item);
          items.push(item);
        });
      }
      items.forEach(item => item.setAttribute('aria-selected', item.dataset.value === select.value ? 'true' : 'false'));
    };
    const setActive = (index, scroll = true) => {
      const shown = visible();
      items.forEach(item => item.classList.remove('is-active'));
      if (!shown.length) { active = -1; list.removeAttribute('aria-activedescendant'); input.removeAttribute('aria-activedescendant'); return; }
      active = Math.max(0, Math.min(shown.length - 1, index));
      const item = shown[active];
      item.classList.add('is-active');
      list.setAttribute('aria-activedescendant', item.id);
      input.setAttribute('aria-activedescendant', item.id);
      if (scroll) {
        const top = item.offsetTop, bottom = top + item.offsetHeight;
        if (top < list.scrollTop) list.scrollTop = top;
        else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
      }
    };
    const filter = () => {
      const q = norm(input.value);
      let shown = 0;
      items.forEach(item => { item.hidden = q !== '' && !item.dataset.search.includes(q); if (!item.hidden) shown++; });
      empty.hidden = shown > 0;
      list.scrollTop = 0;
      setActive(0, false);
    };
    const place = () => {
      if (panel.classList.contains('is-sheet')) return;
      const r = trigger.getBoundingClientRect();
      const gap = 6, below = innerHeight - r.bottom - gap - 8, above = r.top - gap - 8;
      const up = below < 240 && above > below;
      panel.style.left = Math.round(Math.max(8, Math.min(r.left, innerWidth - r.width - 8))) + 'px';
      panel.style.width = Math.round(r.width) + 'px';
      panel.style.maxHeight = Math.round(Math.min(360, Math.max(160, up ? above : below))) + 'px';
      if (up) { panel.style.top = 'auto'; panel.style.bottom = Math.round(innerHeight - r.top + gap) + 'px'; }
      else { panel.style.bottom = 'auto'; panel.style.top = Math.round(r.bottom + gap) + 'px'; }
      panel.classList.toggle('is-up', up);
    };
    const onOutside = event => {
      if (wrap.contains(event.target)) return;
      api.close(false);
    };
    const onViewport = event => { if (!api.isOpen || (event?.type === 'scroll' && panel.contains(event.target))) return; if (isMobile() !== panel.classList.contains('is-sheet')) api.close(false); else place(); };
    const api = {
      wrap, select, sync, isOpen: false,
      open(seed) {
        if (api.isOpen) return;
        if (openPicker && openPicker !== api) openPicker.close(false);
        openPicker = api;
        api.isOpen = true;
        clearTimeout(closeTimer);
        fillList();
        const sheet = isMobile();
        panel.classList.toggle('is-sheet', sheet);
        panel.classList.toggle('is-dropdown', !sheet);
        panel.classList.remove('is-open', 'is-dragging');
        panel.style.removeProperty('--mcp-drag');
        ['left', 'top', 'bottom', 'width', 'maxHeight', 'height', 'transform', 'transition'].forEach(p => { panel.style[p] = ''; });
        input.value = seed || '';
        panel.dataset.nav = seed ? 'key' : 'none';
        filter();
        trigger.setAttribute('aria-expanded', 'true');
        wrap.classList.add('is-open');
        layer(panel, false);
        if (sheet) {
          backdrop.style.removeProperty('opacity');
          layer(backdrop, true);
          requestAnimationFrame(() => { if (api.isOpen) backdrop.classList.add('open'); });
        }
        panel.hidden = false;
        layer(panel, true);
        place();
        const current = visible().findIndex(item => item.dataset.value === select.value);
        setActive(seed ? 0 : Math.max(0, current), false);
        panel.getBoundingClientRect();
        requestAnimationFrame(() => {
          if (!api.isOpen) return;
          panel.classList.add('is-open');
          if (sheet) panel.style.height = panel.offsetHeight + 'px';
          const item = visible()[active];
          if (item) list.scrollTop = Math.max(0, item.offsetTop - list.clientHeight / 2 + item.offsetHeight / 2);
        });
        // Phones keep the keyboard down until the search is tapped.
        (sheet && !seed ? list : input).focus({preventScroll: true});
        document.addEventListener('pointerdown', onOutside, true);
        addEventListener('resize', onViewport, {passive: true});
        addEventListener('scroll', onViewport, {passive: true, capture: true});
      },
      close(focus) {
        if (!api.isOpen) return;
        api.isOpen = false;
        if (openPicker === api) openPicker = null;
        document.removeEventListener('pointerdown', onOutside, true);
        removeEventListener('resize', onViewport);
        removeEventListener('scroll', onViewport, {capture: true});
        trigger.setAttribute('aria-expanded', 'false');
        wrap.classList.remove('is-open');
        panel.classList.remove('is-open', 'is-dragging');
        panel.style.removeProperty('--mcp-drag');
        backdrop.classList.remove('open');
        backdrop.style.removeProperty('opacity');
        const done = () => {
          if (api.isOpen) return;
          layer(panel, false);
          panel.hidden = true;
          layer(backdrop, false);
        };
        clearTimeout(closeTimer);
        if (reduced()) done(); else closeTimer = setTimeout(done, panel.classList.contains('is-sheet') ? 420 : 200);
        if (focus && trigger.isConnected) trigger.focus({preventScroll: true});
      },
      choose(item) {
        if (!item) return;
        const changed = select.value !== item.dataset.value;
        select.value = item.dataset.value;
        sync();
        api.close(true);
        if (changed) {
          select.dispatchEvent(new Event('input', {bubbles: true}));
          select.dispatchEvent(new Event('change', {bubbles: true}));
        }
      },
    };
    trigger.addEventListener('click', () => (api.isOpen ? api.close(true) : api.open()));
    trigger.addEventListener('keydown', event => {
      if (api.isOpen) return;
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); api.open(); }
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && /\S/.test(event.key)) { event.preventDefault(); api.open(event.key); }
    });
    // A click on the label lands on the hidden select; send it to the picker.
    select.addEventListener('focus', () => trigger.focus({preventScroll: true}));
    input.addEventListener('input', filter);
    panel.addEventListener('keyup', event => { if (event.key === 'Escape') event.stopPropagation(); });
    panel.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'].includes(event.key)) panel.dataset.nav = 'key';
      const shown = visible();
      switch (event.key) {
        case 'ArrowDown': event.preventDefault(); setActive(active + 1); break;
        case 'ArrowUp': event.preventDefault(); setActive(active - 1); break;
        case 'Home': if (event.target !== input) { event.preventDefault(); setActive(0); } break;
        case 'End': if (event.target !== input) { event.preventDefault(); setActive(shown.length - 1); } break;
        case 'PageDown': event.preventDefault(); setActive(active + 8); break;
        case 'PageUp': event.preventDefault(); setActive(active - 8); break;
        case 'Enter': event.preventDefault(); api.choose(shown[active]); break;
        case 'Escape': event.preventDefault(); event.stopPropagation(); api.close(true); break;
        case 'Tab': api.close(false); break;
        default:
          // Typing on the list (phones, before the search is tapped) searches.
          if (event.target !== input && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            input.value += event.key;
            input.focus({preventScroll: true});
            filter();
            event.preventDefault();
          }
      }
    });
    list.addEventListener('click', event => api.choose(event.target.closest?.('.mcp-option')));
    list.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      panel.dataset.nav = 'pointer';
      const item = event.target.closest?.('.mcp-option');
      const index = item ? visible().indexOf(item) : -1;
      if (index > -1 && index !== active) setActive(index, false);
    });

    // Drag to close, from the handle or from the list once it is at the top:
    // the shared sheet drag, as the cart drawer's sheets.
    window.materiaSheetDrag?.({
      root: panel,
      sheet: () => (api.isOpen && panel.classList.contains('is-sheet') ? panel : null),
      handle: target => !!target.closest?.('.mcp-head') && !target.closest('input'),
      blocked: target => !!target.closest?.('input'),
      scroller: () => list,
      progress: (sheet, p, dragging) => {
        if (dragging) { backdrop.style.transition = 'none'; backdrop.style.opacity = String(Math.max(0, 1 - p)); }
        else { backdrop.style.removeProperty('transition'); if (p === 0) backdrop.style.removeProperty('opacity'); }
      },
      dismiss: () => api.close(true),
    });

    pickers.set(wrap, api);
    sync();
    return api;
  }
  /* Safe to run again and again: a redrawn form gets a new picker, a copy of
     an old picker that lost its script is replaced, a live one is synced. */
  function enhance(root) {
    root.querySelectorAll('select[name="address[country]"]').forEach(select => {
      let wrap = select.nextElementSibling;
      if (wrap && wrap.classList.contains('mcp')) {
        const api = pickers.get(wrap);
        if (api && api.select === select) { api.sync(); return; }
        wrap.remove();
      }
      buildPicker(select);
    });
  }
  document.addEventListener('change', event => {
    const select = event.target;
    if (!select?.matches?.('select[name="address[country]"]')) return;
    const wrap = select.nextElementSibling;
    if (wrap?.classList.contains('mcp')) pickers.get(wrap)?.sync();
  });
  const scan = (scope = document) => {
    if (openPicker && !openPicker.wrap.isConnected) { const gone = openPicker; openPicker = null; gone.close(false); }
    scope.querySelectorAll('[data-address="root"]').forEach(root => { prepare(root); enhance(root); });
  };
  /* Capture phase: answer before the theme's Shopify-only handlers. */
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action="shipping"], .btn-save[data-action="shipping"]');
    if (!button || !button.closest('cart-estimate, .cart__addon-content, #shipping')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    scan(button.closest('cart-estimate, .cart__addon-content, #shipping'));
    estimate(button);
  }, true);
  /* Opening the drawer's shipping sheet or redrawing the cart brings new forms. */
  let queued = 0;
  new MutationObserver(() => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; scan(); }); })
    .observe(document.documentElement, {childList: true, subtree: true});
  /* A section the builder draws again brings its own form. */
  document.addEventListener('storelib:section-load', event => scan(event.target?.nodeType === 1 ? event.target : document));
  document.addEventListener('shopify:section:load', event => scan(event.target?.nodeType === 1 ? event.target : document));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan());
  else scan();
})();
