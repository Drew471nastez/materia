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
  function syncButtons(scope = document) {
    const purchase = '.product-detail__buy-buttons :is(button[name="add"], .shopify-payment-button__button:not(.shopify-payment-button__button--branded)), .product-detail__information :is(.btn-primary, .btn-secondary, .btn-outline, [data-sl-button]):not(.btn-reset):not(.icon-btn):not(.quantity__button), .product-item__button-submit, .footer__newsletter button[type="submit"], #minicart_wrapper .cart__addon-content :is(.btn-save, .coupon-apply, .add-giftwrap, .btn-cancel), #minicart_wrapper .drawer-bottom :is(.btn-primary, .btn-outline, .btn-secondary)';
    const shared = '.shopify-section :is(a, button, input[type="submit"]):is(.btn-primary, .btn-secondary, .btn-outline):not(.btn-reset):not(.icon-btn):not(.btn-icon--circle)';
    scope.querySelectorAll(purchase + ', ' + shared).forEach(button => {
      const role = button.dataset.themeButton || (button.matches('.shopify-payment-button__button, .btn-secondary, .btn-outline, .btn-cancel') ? 'secondary' : 'primary');
      button.setAttribute('data-theme-button', role);
      button.setAttribute('data-sl-button', '');
    });
    document.querySelectorAll('[data-theme-button]').forEach(button => {
      const role = button.getAttribute('data-theme-button');
      const extraHover = document.body?.dataset.slBtnHover;
      button.dataset.buttonHover = extraHover && extraHover !== 'theme' ? extraHover : (document.body?.dataset.btnHover || 'fade');
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
  document.addEventListener('DOMContentLoaded', () => syncButtons());
  document.addEventListener('storelib:section-load', () => syncButtons());
  document.addEventListener('shopify:section:load', () => syncButtons());
  document.addEventListener('storelib:settings-change', () => {
    if (!window.__materiaThemeLive) requestAnimationFrame(() => syncButtons());
  });
  // theme-live applies settings in its own animation frame, after the original
  // Storelib event. Read appearance/effect attributes only once they are current.
  document.addEventListener('materia:theme-applied', () => syncButtons());
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
  const scan = (scope = document) => scope.querySelectorAll('[data-address="root"]').forEach(prepare);
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan());
  else scan();
})();
