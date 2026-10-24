
/* Server-confirmed removal only: pending requests keep their row and icon.
   Keep animation work local and honour reduced motion; never delay a failure. */
async function materiaAnimateCartRemoval(row) {
  if (!row?.isConnected || !row.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const style = getComputedStyle(row);
  row.classList.add('materia-row-exit');
  row.style.minHeight = '0';
  row.style.overflow = 'hidden';
  const animation = row.animate([
    {height:row.getBoundingClientRect().height+'px',opacity:1,transform:'translateX(0)',marginTop:style.marginTop,marginBottom:style.marginBottom,paddingTop:style.paddingTop,paddingBottom:style.paddingBottom},
    {height:'0px',opacity:0,transform:'translateX(-6px)',marginTop:'0px',marginBottom:'0px',paddingTop:'0px',paddingBottom:'0px'},
  ], {duration:220,easing:'cubic-bezier(.22,.61,.36,1)',fill:'forwards'});
  await animation.finished.catch(() => {});
}

function materiaUpdateCartValue(target, source) {
  if (!target || !source || target.innerHTML === source.innerHTML) return;
  target.innerHTML = source.innerHTML;
  if (target.matches('[data-cart-subtotal-price]') && target.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.animate([{opacity:.65},{opacity:1}], {duration:180,easing:'ease-out'});
  }
}

/* Materia: stable cart reconciliation. The previous full innerHTML replacement
   destroyed recommendations, quantity controls and images on every +/- tap. */
function materiaPatchDrawerCart(target, incoming) {
  if (!target || !incoming) return false;
  const oldItems = target.querySelector('#minicart .minicart-body .items');
  const newItems = incoming.querySelector('#minicart .minicart-body .items');
  // Empty/filled state changed: allow the existing full rebuild path.
  if (!oldItems || !newItems) return false;
  const oldRows = new Map(Array.from(oldItems.children).filter(el => el.id).map(el => [el.id, el]));
  const wanted = [];
  const entering = [];
  for (const freshRow of Array.from(newItems.children)) {
    let stableRow = freshRow.id && oldRows.get(freshRow.id);
    if (stableRow) {
      // Update price and quantity only; leave media, trash and edit controls mounted.
      for (const sel of ['.minicart__item-prices','.discounts','.cart-item__error']) {
        const dst = stableRow.querySelector(sel);
        const src = freshRow.querySelector(sel);
        if (dst && src && dst.innerHTML !== src.innerHTML) dst.innerHTML = src.innerHTML;
      }
      const currentQty = stableRow.querySelector('input[name="updates[]"]');
      const nextQty = freshRow.querySelector('input[name="updates[]"]');
      if (currentQty && nextQty) {
        if (!currentQty.hasAttribute('data-materia-desired-quantity')) currentQty.value = nextQty.value;
        const editor = stableRow.querySelector('cart-item-variant-switch');
        if (editor) editor.dataset.quantity = nextQty.value;
        currentQty.defaultValue = nextQty.defaultValue;
        for (const {name,value} of Array.from(nextQty.attributes)) {
          if (name.startsWith('data-') || name === 'max' || name === 'min') currentQty.setAttribute(name,value);
        }
      }
      // A variant change can replace the line ID: it is inserted as a new row below.
      wanted.push(stableRow);
      oldRows.delete(freshRow.id);
    } else {
      const row = freshRow.cloneNode(true);
      wanted.push(row);
      entering.push(row);
    }
  }
  // Move reused nodes rather than destroying/recreating them; no image flashes.
  for (let i = 0; i < wanted.length; i++) {
    const row = wanted[i];
    if (oldItems.children[i] !== row) oldItems.insertBefore(row, oldItems.children[i] || null);
  }
  while (oldItems.children.length > wanted.length) oldItems.lastElementChild.remove();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    entering.forEach(row => row.animate?.([
      {opacity:0,transform:'translateY(4px)'},
      {opacity:1,transform:'translateY(0)'},
    ], {duration:180,easing:'ease-out'}));
  }
  // Cart subtotal/discounts can change; payment icons and messages do not need a rebuild.
  for (const sel of ['[data-cart-subtotal-price]', '[data-discounts-list]', '.cart-discount__codes']) {
    const fresh = incoming.querySelectorAll(sel);
    target.querySelectorAll(sel).forEach((dst,index) => materiaUpdateCartValue(dst,fresh[index]));
  }
  // Recalculate savings text when installed without remounting the panel.
  const savingsOld = target.querySelector('.cda-savings');
  const savingsNew = incoming.querySelector('.cda-savings');
  if (savingsOld && savingsNew && savingsOld.innerHTML !== savingsNew.innerHTML) savingsOld.innerHTML = savingsNew.innerHTML;
  // Only replace recommendation markup if the lead product actually changed.
  const recOld = target.querySelector('minicart-recommendations');
  const recNew = incoming.querySelector('minicart-recommendations');
  if (recOld && recNew && recOld.dataset.url !== recNew.dataset.url) {
    recOld.replaceWith(recNew.cloneNode(true));
  }
  return true;
}

// theme.js loads this file as a module; the variant editor reuses the patcher.
window.materiaPatchDrawerCart = materiaPatchDrawerCart;
/* Materia Themes. Developed By Materia Themes. */
"use-strict";
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
// Performance monitoring utility
class PerformanceMonitor {
  static measurements = new Map();
  
  static startMeasurement(name) {
    this.measurements.set(name, performance.now());
  }
  
  static endMeasurement(name, logResult = false) {
    const startTime = this.measurements.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.measurements.delete(name);
      
      if (logResult) {
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    return 0;
  }
  
  static measureAsync(name, asyncFn) {
    return async (...args) => {
      this.startMeasurement(name);
      try {
        const result = await asyncFn(...args);
        return result;
      } finally {
        this.endMeasurement(name, true);
      }
    };
  }
}

// Enhanced Error Handler
class ErrorHandler {
  static handleFetchError(error, context = '') {
    console.error(`[${context}] Fetch error:`, error);
    
    // Show user-friendly message based on error type
    if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      this.showUserMessage('Network error. Please check your connection.');
    } else if (error.message.includes('404')) {
      this.showUserMessage('Content not found.');
    } else if (error.message.includes('500')) {
      this.showUserMessage('Server error. Please try again later.');
    }
    
    // Report to analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'exception', {
        description: `${context}: ${error.message}`,
        fatal: false
      });
    }
  }
  
  static showUserMessage(message) {
    // Use existing toast notification if available
    if (typeof showToast !== 'undefined') {
      showToast(message, 3000, "modal-error");
    } else {
      console.warn('Toast notification not available:', message);
    }
  }

  static async handleAsyncOperation(operation, context = '') {
    try {
      return await operation();
    } catch (error) {
      this.handleFetchError(error, context);
      throw error; // Re-throw to allow calling code to handle if needed
    }
  }
}

class CartNotification extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.initialize();
    });
  }

  disconnectedCallback() {
    this.cartEvents?.abort();
    this.actionEvents?.abort();
    document.body?.removeEventListener('click', this.onBodyClick);
  }

  initialize() {
    this.cartEvents?.abort();
    this.cartEvents = new AbortController();
    const signal = this.cartEvents.signal;
    this.notification = this;
    this.addEventListener('keydown', event => {
      const panel = this.querySelector('.cart__addon-content.is-open');
      if (!panel) return;
      const opener = this.querySelector(`.mini_cart_addon_btn[data-open="${panel.id}"]`);
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        panel.classList.remove('is-open'); opener?.classList.remove('open');
        opener?.setAttribute('aria-expanded', 'false'); opener?.focus({preventScroll:true});
      } else if (event.key === 'Tab') {
        const focusable = [...panel.querySelectorAll('button, input, textarea, select, a[href]')].filter(el => !el.disabled && el.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }, {signal});
    this.giftwrap = document.querySelector(".add-giftwrap");
    this.cartCountDown = document.querySelector(".cart-countdown-time");
    this.minicart__wrapper =
      this.notification.querySelector(".minicart__wrapper");
    this.cartUpsellBeside = document.querySelector(".recommendations-beside");
    this.startTime = Date.now();
    this.querySelectorAll(".minicart__wrapper .close-cart-button").forEach(
      (closeButton) =>
        closeButton.addEventListener("click", this.close.bind(this), {signal})
    );
    document.addEventListener('click', (e) => {
          if (!e.target.closest('.minicart__action')) return;
          e.preventDefault();
          if (
            this.notification
              .querySelector(".minicart__wrapper")
              .classList.contains("open")
          ) {
            this.close();
          } else {
            this.open();
          }
        }, {signal});
    this.currentItemCount = Array.from(
      this.querySelectorAll('[name="updates[]"]')
    ).reduce(
      (total, quantityInput) => total + parseInt(quantityInput.value),
      0
    );
    this.onBodyClick = this.handleBodyClick.bind(this);
    this.notification.addEventListener(
      "change",
      event => this.onChange(event), {signal}
    );
    this.addEventListener('click', event => {
      if (this._quantityRunning && event.target.closest('.btn-checkout,[name="checkout"]')) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, {capture:true,signal});
    this.addEventListener('submit', event => {
      if (this._quantityRunning) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, {capture:true,signal});
    this.cartAction();
    this.addonsUpdate();
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (
      target != this &&
      !target.closest(".header__minicart") &&
      !target.closest("cart-notification") &&
      !target.closest(".cart-quick-edit-modal") &&
      !target.closest(".tingle-modal")
    ) {
      this.close();
    }
  }

  cartAction() {
    this.actionEvents?.abort();
    this.actionEvents = new AbortController();
    document.dispatchEvent(new CustomEvent('materia:cart-drawer-updated'));
    const signal = this.actionEvents.signal;
    this.querySelectorAll(".close-cart").forEach((navToggle) => {
      navToggle.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          if (
            this.notification
              .querySelector(".minicart__wrapper")
              .classList.contains("open")
          ) {
            this.close();
          }
        },
        {signal}
      );
    });
    this.querySelectorAll(".cart-addons button").forEach((button) => {
      button.addEventListener("click", this.cartAddons.bind(this), {signal});
    });

    this.querySelectorAll(".addon-actions .btn-save").forEach((button) => {
      button.addEventListener("click", this.cartAddonsSave.bind(this), {signal});
    });

    this.querySelectorAll(".add-giftwrap").forEach((giftwrap) => {
      giftwrap.addEventListener(
        "click",
        this.addGiftwrapClick.bind(this),
        {signal}
      );
    });

    this.querySelectorAll(".addon-actions .btn-cancel").forEach(
      (addonCancel) => {
        addonCancel.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            this.closeAddon(e.currentTarget.closest(".cart__addon-content"));
          },
          {signal}
        );
      }
    );
  }

  addonsUpdate() {
    const address_country = document.getElementById("address_country");
    const address_province = document.getElementById("address_province");
    if (address_country && address_province && typeof window.Shopify?.CountryProvinceSelector === "function" && address_country.options.length) {
      new Shopify.CountryProvinceSelector(
        "address_country",
        "address_province",
        { hideElement: "address_province_container" }
      );
    }

    const discount_code = document.querySelector(".discount_code");
    let code;
    try { code = localStorage.getItem("discount_code"); } catch (_) { /* Storage may be unavailable in previews. */ }
    if (code && discount_code) {
      document.querySelector(".discount_code").value = code;
    }
  }

  cartAddons(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const open = target.getAttribute("data-open");
    const panel = this.querySelector(`#${open}`);
    if (!panel) return;
    if (!panel.classList.contains("is-open")) {
      this.querySelectorAll('.cart__addon-content.is-open').forEach(el => el.classList.remove('is-open'));
      this.querySelectorAll('.mini_cart_addon_btn.open').forEach(el => { el.classList.remove('open'); el.setAttribute('aria-expanded', 'false'); });
      panel.classList.add("is-open");
      target.classList.add("open");
      target.setAttribute('aria-expanded', 'true');
      target.setAttribute('aria-controls', open);
      // Touch screens: focus the sheet, not a field, so the keyboard does not jump up mid-slide.
      const touch = window.matchMedia?.('(pointer: coarse)').matches;
      if (touch) { if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1'); panel.focus({preventScroll:true}); }
      else panel.querySelector('textarea, input:not([type="hidden"]), select, button')?.focus({preventScroll:true});
      if (open == "shipping") {
        const address_country = document.getElementById("address_country");
        const address_province = document.getElementById("address_province");
        if (address_country && address_province && typeof window.Shopify?.CountryProvinceSelector === "function" && address_country.options.length) {
          new Shopify.CountryProvinceSelector(
            "address_country",
            "address_province",
            { hideElement: "address_province_container" }
          );
        }
      }
    } else {
      panel.classList.remove("is-open");
      target.classList.remove("open");
      target.setAttribute('aria-expanded', 'false');
    }
  }

  closeAddon(panel, focusOpener = true) {
    if (!panel) return;
    panel.classList.remove("is-open");
    const opener = this.querySelector(`.mini_cart_addon_btn[data-open="${panel.id}"]`);
    opener?.classList.remove("open");
    opener?.setAttribute("aria-expanded", "false");
    if (focusOpener) opener?.focus({ preventScroll: true });
  }

  fetchConfig(type = "json") {
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: `application/${type}`,
      },
    };
  }

  cartAddonsSave(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const action = target.getAttribute("data-action");
    if (action == "note") {
      const panel = target.closest(".cart__addon-content");
      const field = panel?.querySelector(".cart-note") || this.querySelector(".cart-note");
      const body = JSON.stringify({ note: field ? field.value : "" });
      target.disabled = true;
      target.setAttribute("aria-busy", "true");
      fetch(`${window.routes?.cart_update_url || "/cart/update.js"}`, {
        ...this.fetchConfig(),
        ...{ body },
      })
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          if (field) field.defaultValue = field.value;
          this.closeAddon(panel);
        })
        .catch(() => {
          if (typeof showToast === "function" && window.cartStrings?.error) showToast(window.cartStrings.error, 3000, "modal-error");
        })
        .finally(() => {
          target.disabled = false;
          target.removeAttribute("aria-busy");
        });
    } else if (action == "shipping") {
      var e = {};
      (e.zip = document.querySelector("#AddressZip").value || ""),
        (e.country = document.querySelector("#address_country").value || ""),
        (e.province = document.querySelector("#address_province").value || ""),
        this._getCartShippingRatesForDestination(e);
    }
  }

  _getCartShippingRatesForDestination(event) {
    fetch(
      `${window.Shopify.routes.root}cart/shipping_rates.json?shipping_address%5Bzip%5D=${encodeURIComponent(event.zip)}&shipping_address%5Bcountry%5D=${encodeURIComponent(event.country)}&shipping_address%5Bprovince%5D=${encodeURIComponent(event.province)}`
    )
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const message = document.querySelector(".addon-message");
        // Clear previous output (legacy <p> nodes + new shipping cards/headers)
        message
          .querySelectorAll("p, .shipping-rates, .shipping-summary")
          .forEach((n) => n.remove());
        const { showDeliveryDays, deliveryDayOne, deliveryDaysOther } =
          message.dataset;
        const parsedState = JSON.parse(state);
        const escapeHtml = (s = "") =>
          String(s).replace(/[&<>"']/g, (c) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c]);
        if (parsedState && parsedState.shipping_rates) {
          if (parsedState.shipping_rates.length > 0) {
            message.classList.remove("error", "warning");
            message.classList.add("success");
            // Header summary
            const summary = document.createElement("div");
            summary.className = "shipping-summary";
            const addressLabel =
              event.zip + ", " + event.country + " " + event.province;
            summary.innerHTML =
              '<svg class="shipping-summary__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/><path d="M19 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/><path d="M3 6h11v11H9"/><path d="M14 9h4l3 4v4h-2"/></svg>' +
              '<span class="shipping-summary__text">' +
              (cartStrings?.shipping_rate || "Estimated rates for {{address}}").replace(
                "{{address}}",
                "<strong>" + escapeHtml(addressLabel) + "</strong>"
              ) +
              "</span>";
            message.appendChild(summary);

            // Rates list
            const list = document.createElement("ul");
            list.className = "shipping-rates";
            parsedState.shipping_rates.forEach((rate) => {
              let daysHtml = "";
              if (rate.delivery_days.length > 0 && showDeliveryDays == "true") {
                let typeDay = deliveryDayOne;
                const day = rate.delivery_days[0];
                const dayAt = rate.delivery_days.at(-1);
                if (day > 1) typeDay = deliveryDaysOther;
                const range = day === dayAt ? day : day + "–" + dayAt;
                daysHtml =
                  '<span class="shipping-rate__eta">' +
                  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' +
                  range +
                  " " +
                  escapeHtml(typeDay) +
                  "</span>";
              }
              const li = document.createElement("li");
              li.className = "shipping-rate";
              li.innerHTML =
                '<span class="shipping-rate__name">' +
                escapeHtml(rate.name) +
                "</span>" +
                '<span class="shipping-rate__meta">' +
                daysHtml +
                '<span class="shipping-rate__price">' +
                Shopify.formatMoney(rate.price, cartStrings?.money_format) +
                "</span>" +
                "</span>";
              list.appendChild(li);
            });
            message.appendChild(list);
          } else {
            message.classList.remove("error", "success");
            message.classList.add("warning");
            const p = document.createElement("p");
            p.innerText = cartStrings?.no_shipping;
            message.appendChild(p);
          }
        } else {
          message.classList.remove("success", "warning");
          message.classList.add("error");
          Object.entries(parsedState).map((error) => {
            const message_error = `${error[1][0]}`;
            const p = document.createElement("p");
            p.innerText = message_error;
            message.appendChild(p);
          });
        }
      })
      .catch((error) => {
        throw error;
      });
  }

  addGiftwrapClick(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const variant_id = target.getAttribute("data-variant-id");
    const config = fetchConfig("json");
    config.body = JSON.stringify({
      id: Number(variant_id),
      quantity: 1,
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    });
    target.classList.add("loading");
    fetch(`${routes?.cart_add_url}`, config)
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        fetch("/cart.json")
          .then((res) => res.json())
          .then((cart) => {
            if (cart.item_count != undefined) {
              document.querySelectorAll(".cart-count").forEach((el) => {
                if (el.classList.contains("cart-count-drawer")) {
                  el.innerHTML = `(${cart.item_count})`;
                } else {
                  el.innerHTML = cart.item_count > 100 ? "~" : cart.item_count;
                }
              });
              if (document.querySelector("header-total-price")) {
                document.querySelector("header-total-price").updateTotal(cart);
              }
              const cart_free_ship = document.querySelector(
                "free-ship-progress-bar"
              );
              if (cart_free_ship) {
                cart_free_ship.init(cart.items_subtotal_price);
              }
            }
          })
          .catch((error) => {
            throw error;
          });
        this.getSectionsToRender().forEach((section) => {
          const elementToReplace = document.getElementById(section.id);
          if (!elementToReplace) return;
          const sectionHTML = parsedState.sections && parsedState.sections[section.id];
          if (!sectionHTML) return;
          const html = new DOMParser().parseFromString(sectionHTML, "text/html");
          const minicartForm = html.querySelector("#minicart-form");
          if (!minicartForm) return;
          if (!materiaPatchDrawerCart(elementToReplace, minicartForm)) elementToReplace.innerHTML = minicartForm.innerHTML;
        });
        this.cartAction();
        /* Cart drawer addons: re-tick urgency timer immediately so the
           freshly injected DOM doesn't wait up to 1s before showing time. */
        if (typeof window.cdaTick === "function") window.cdaTick();
      })
      .catch((e) => {
        throw e;
      })
      .finally(() => {
        BlsLazyloadImg.init();
        document.querySelector(".add-giftwrap").classList.remove("loading");
        if (typeof window.cdaTick === "function") window.cdaTick();
      });
  }

  onChange(event) {
    if (event.target.getAttribute("name") == "updates[]")
      this.updateQuantity(
        event.target.dataset.id,
        event.target.value,
        event.target.dataset.value,
        event.target,
        document.activeElement.getAttribute("name")
      );
  }

  updateQuantity(id, quantity, currentQuantity, _this, name) {
    quantity = Number(quantity);
    if (!Number.isInteger(quantity) || quantity < 0) return Promise.resolve(false);
    this._quantityQueue ||= new Map();
    this._quantityQueue.set(String(id), [id,quantity,currentQuantity,_this,name]);
    const input = this.querySelector(`input[name="updates[]"][data-id="${CSS.escape(String(id))}"]`);
    if (input && quantity > 0) {
      input.setAttribute('data-materia-desired-quantity', String(quantity));
      input.setAttribute('aria-busy','true');
    }
    if (this._quantityRunning) return this._quantityDrain;
    this._quantityRunning = true;
    this.setAttribute('aria-busy','true');
    this._quantityDrain = this.drainQuantityUpdates();
    return this._quantityDrain;
  }

  async drainQuantityUpdates() {
    try {
      while (this._quantityQueue.size && this.isConnected) {
        const [key,args] = this._quantityQueue.entries().next().value;
        this._quantityQueue.delete(key);
        await this.performQuantityUpdate(...args);
        if (!this._quantityQueue.has(key)) {
          const input = this.querySelector(`input[name="updates[]"][data-id="${CSS.escape(key)}"]`);
          if (input) {
            input.removeAttribute('data-materia-desired-quantity');
            input.removeAttribute('aria-busy');
            if (input.dataset.value != null) input.value = input.dataset.value;
          }
        }
      }
    } finally {
      this._quantityQueue.clear();
      this._quantityRunning = false;
      this.removeAttribute('aria-busy');
    }
  }

  performQuantityUpdate(id, quantity, currentQuantity, _this, name) {
    quantity = quantity ? quantity : 0;
    const body = JSON.stringify({
      id,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    });
    const selector = `mini-cart-remove-button[data-index="${id}"]`;
    const cart_select = `minicart-wishlist-action[data-index="${id}"]`;

    const minicart_wishlist_action = this.querySelector(cart_select);
    if (minicart_wishlist_action) {
      minicart_wishlist_action.classList.add("loading");
    }
    /* Defensive null-check — when the cart is in a transient state
       (mid-refresh, last-item delete race, or empty cart re-paint) the
       remove-button for `id` may not be in the DOM. Guarding avoids a
       hard TypeError that bricks the drawer. */
    const cart_item = this.querySelector(selector);
    // Only a removal shows the remove button's spinner; +/- leaves its icon alone.
    if (cart_item && Number(quantity) === 0) cart_item.classList.add("loading");
    const cartRecommend = document.querySelector(".cart-recommend");
    // Keep open recommendations mounted while quantity changes.
    // Tag the whole cart-items element as "refreshing" so the fade /
    // spinner overlay covers the full list and stays visible across
    // the HTML swap — no flicker, smooth cross-fade.
    this.classList.add("cart-refreshing");
    /* Watchdog — absolute last line of defense. If the fetch hangs,
       gets aborted, or any cleanup path fails to remove the
       cart-refreshing class within 8s, this force-clears it so the
       drawer never gets stuck un-clickable. Without this, a rogue
       request can leave .pointer-events:none on the cart-items
       element until page reload — which is exactly the "I have to
       refresh the page" pattern shoppers report. */
    const _watchdog = setTimeout(() => {
      try { this.classList.remove("cart-refreshing"); } catch (_) {}
    }, 8000);
    /* Stash on the element so .finally can clear it on success. */
    this.__cartWatchdog = _watchdog;
    return fetch(`${routes?.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        if (response.ok === false) throw new Error(`Cart update failed: HTTP ${response.status}`);
        return response.text();
      })
      .then(async (state) => {
        /* Defensive JSON parse — Shopify can return an HTML error page
           (e.g. throttled, server hiccup, invalid session). Without
           this try/catch the parse throws, the rest of the flow
           silently aborts, and the user sees the loading state stuck
           forever. Now we degrade gracefully — log the body to the
           console for debugging, then let .finally clean up the UI. */
        let parsedState;
        try {
          parsedState = JSON.parse(state);
        } catch (parseErr) {
          console.warn(
            "[cart] /cart/change returned non-JSON; aborting refresh",
            state ? state.slice(0, 200) : state
          );
          return false;
        }
        if (parsedState.errors) {
          this.updateMessageErrors(id, parsedState.errors, _this);
          return false;
        }

        /* === ISOLATED CLEANUP BLOCKS ============================
           Each step below is wrapped in its own try/catch so a single
           failure (broken addon, removed DOM node, stale cache) can
           NEVER prevent the section-render that follows from running.
           Previously a throw in ANY of these short blocks killed the
           whole .then and the cart-drawer never re-rendered after a
           delete, leaving the deleted item visible until page reload.
           ====================================================== */

        // Count + header total
        try {
          if (parsedState.item_count != undefined) {
            document.querySelectorAll(".cart-count").forEach((el) => {
              if (el.classList.contains("cart-count-drawer")) {
                el.innerHTML = `(${parsedState.item_count})`;
              } else {
                el.innerHTML =
                  parsedState.item_count > 100 ? "~" : parsedState.item_count;
              }
            });
            if (document.querySelector("header-total-price")) {
              document
                .querySelector("header-total-price")
                .updateTotal(parsedState);
            }
          }
        } catch (_) {}

        // PDP quantity badge sync (when this product is currently open)
        try {
          if (document.querySelector(".quantity__label")) {
            const items = parsedState.items || [];
            const pro_id = document
              .querySelector(".quantity__label")
              .getAttribute("data-pro-id");
            var variant_id, variant_quantity;
            items.forEach(function (item) {
              variant_id = item.variant_id;
              if (variant_id == pro_id) {
                const cartCountEl = document.querySelector(".quantity-cart");
                const labelEl = document.querySelector(".quantity__label");
                if (cartCountEl) cartCountEl.innerHTML = item.quantity;
                if (labelEl) labelEl.classList.remove("hidden");
                variant_quantity = pro_id;
                return;
              }
            });
            if (!variant_quantity) {
              const cartCountEl = document.querySelector(".quantity-cart");
              const labelEl = document.querySelector(".quantity__label");
              if (cartCountEl) cartCountEl.innerHTML = 0;
              if (labelEl) labelEl.classList.add("hidden");
            }
          }
        } catch (_) {}

        // Free-shipping progress follows the new subtotal even when no section HTML is returned.
        try {
          const bar = document.querySelector("free-ship-progress-bar");
          if (bar && parsedState.items_subtotal_price != undefined) bar.init(parsedState.items_subtotal_price);
        } catch (_) {}

        // Countdown timer removal on empty cart
        try {
          if (parsedState.item_count == 0 && this.cartCountDown) {
            const timerEl = this.cartCountDown.querySelector("countdown-timer");
            if (timerEl) timerEl.remove();
          }
        } catch (_) {}

        // Upsell-beside close on empty cart
        try {
          if (parsedState.item_count == 0 && this.cartUpsellBeside) {
            if (this.cartUpsellBeside.classList.contains("is-open")) {
              this.cartUpsellBeside.classList.remove("is-open");
            }
          }
        } catch (_) {}

        /* === SECTION RENDER ================================
           This is what visually removes the deleted line from the
           cart drawer. Wrapped in its own try/catch and the forEach
           callback is itself defensive — every step has a null guard.
           ================================================ */
        try {
          if (!parsedState.error && parsedState.item_count != undefined) {
            for (const section of this.getSectionsToRender()) {
              try {
                const elementToReplace = document.getElementById(section.id);
                if (!elementToReplace) continue;
                const sectionHTML = parsedState.sections && parsedState.sections[section.id];
                if (!sectionHTML) continue;
                const html = new DOMParser().parseFromString(sectionHTML, "text/html");
                const minicartForm = html.querySelector("#minicart-form");
                if (!minicartForm) continue;
                const row = Number(quantity) === 0 && cart_item?.closest('.cart-item');
                if (row?.id && !minicartForm.querySelector('#' + CSS.escape(row.id))) await materiaAnimateCartRemoval(row);
                if (!elementToReplace.isConnected) continue;
                if (!materiaPatchDrawerCart(elementToReplace, minicartForm)) elementToReplace.innerHTML = minicartForm.innerHTML;
                // Instantly un-gray already-cached thumbnails so there's no
                // flash between skeleton → new content on qty updates.
                elementToReplace
                  .querySelectorAll("img.bls-loading-image")
                  .forEach((img) => {
                    if (img.complete && img.naturalWidth > 0) {
                      img.closest("motion-element")?.classList.remove("bls-loading-image");
                      img.classList.remove("bls-loading-image");
                    }
                  });
                // Stable keyed rows preserve their paint layer and scroll position.
              } catch (perSectionErr) {
                console.warn("[cart] section render failed for", section.id, perSectionErr);
              }
            }
          }
        } catch (renderErr) {
          console.warn("[cart] section render block threw", renderErr);
        }

        try { this.cartAction(); } catch (_) {}
        try { if (typeof window.cdaTick === "function") window.cdaTick(); } catch (_) {}
        return parsedState.item_count != null;
      })
      .catch((e) => {
        console.error('[cart] Quantity update failed:', e);
        this.updateMessageErrors(id, window.cartStrings?.error || e.message, _this);
        return false;
      })
      .finally(() => {
        /* CRITICAL — clear the .cart-refreshing class FIRST so the
           drawer becomes interactive again no matter what happens
           later. The CSS sets `pointer-events: none` on this class;
           if any subsequent line throws and the class stays set, the
           user can't click anything in the drawer until they reload
           the page. We also remove it synchronously here (instead of
           waiting for two rAFs) so even a frozen rAF callback can't
           strand the drawer.

           Each remaining cleanup step is wrapped in try/catch so a
           throw in one (e.g. BlsLazyloadImg.init() on a stale DOM,
           or addons re-init) can't bubble and skip the rest. */
        try { this.classList.remove("cart-refreshing"); } catch (_) {}
        try { if (this.__cartWatchdog) { clearTimeout(this.__cartWatchdog); this.__cartWatchdog = null; } } catch (_) {}
        try {
          if (typeof BlsLazyloadImg !== "undefined" && BlsLazyloadImg && BlsLazyloadImg.init) {
            BlsLazyloadImg.init(this);
          }
        } catch (_) {}
        try { if (cart_item) cart_item.classList.remove("loading"); } catch (_) {}
        try {
          if (minicart_wishlist_action) {
            minicart_wishlist_action.classList.remove("loading");
          }
        } catch (_) {}
        try {
          const cartRecommend = document.querySelector(".cart-recommend");
          if (
            cartRecommend &&
            !cartRecommend.classList.contains("hidden-recommend")
          ) {
            if (cartRecommend.classList.contains("cart-recommend-custom")) {
              const cartUpsellItem =
                document.querySelectorAll(".cart-upsell-item");
              const cartUpsellSlide = document.querySelectorAll(
                ".swiper-cart-upsell .swiper-slide"
              );
              if (cartUpsellItem.length > 0) {
                requestAnimationFrame(() => { if (cartRecommend.isConnected) cartRecommend.classList.add('open'); });
              } else if (cartUpsellSlide.length === 0) {
                cartRecommend.classList.remove("block");
                cartRecommend.classList.add("hidden");
              }
            } else {
              requestAnimationFrame(() => { if (cartRecommend.isConnected) cartRecommend.classList.add('open'); });
            }
          }
        } catch (_) {}
      });
  }

  updateMessageErrors(line, message, target) {
    /* `target` is the qty input that triggered the change. When the
       caller is MiniCartRemoveButton (trash icon) there's no qty input
       — target is undefined. Guard so an error response from Shopify
       (e.g. "no valid id or line parameter" after a stale line key)
       doesn't blow up the whole drawer flow. */
    if (target && target.dataset) {
      const val = target.dataset.value;
      if (val !== undefined) target.value = target.dataset.materiaDesiredQuantity ?? val;
    }
    const lineItemError = document.getElementById(
      `CartDrawer-LineItemError-${line}`
    );
    if (lineItemError) {
      const textEl = lineItemError.querySelector(".cart-item__error-text");
      if (textEl) textEl.textContent = message;
    }
  }

  async open() {
    const opening = this._openRevision = (this._openRevision || 0) + 1;
    this._closingUntil = 0;
    // A close started just before must not run its delayed steps on top of
    // this open (it used to remove `open`/`open-drawer` from the reopened drawer).
    (this._closeTimers || []).forEach(clearTimeout);
    this._closeTimers = [];
    if (!this.notification.classList.contains("go_to_cart_page")) {
      if (this.classList.contains("show_popup") && this.minicart__wrapper) {
        this.cart_icon = document.querySelector("header");
        if (this.cart_icon) {
          this.minicart__wrapper.style.top = `calc(${
            this.cart_icon.getBoundingClientRect().bottom
          }px)`;
        }
      }
      // Close search and start the cart in the same frame. Never serialize two
      // independent CSS transitions into a half-second pause.
      if (document.documentElement.classList.contains("open-search")) {
        document.documentElement.classList.remove('open-search');
        document.getElementById('search-form')?.classList.remove('open');
      }
      if (!this.isConnected || opening !== this._openRevision) return;
      this.notification
        .querySelector(".minicart__wrapper")
        .classList.add("open");
      this.notification.classList.add("open");
      // Lock the page in the same frame the drawer starts moving: no dead time
      // before the slide. The page keeps its scrollbar space (scrollbar-gutter).
      if (!this.classList.contains("show_popup")) {
        document.documentElement.classList.add("open-drawer", "open-minicart");
      }

      // Initialize only the drawer's images after its entrance starts; leave
      // the rest of the storefront untouched.
      requestAnimationFrame(() => window.BlsLazyloadImg?.init?.(this));
    } else {
      this.notification.querySelector("a").click();
    }
    this.notification.addEventListener(
      "transitionend",
      () => {
        // Never scroll the page to the drawer's place in the document.
        this.notification.focus({ preventScroll: true });
      },
      { once: true }
    );
    document.body.addEventListener("click", this.onBodyClick);
  }

  close() {
    this._openRevision = (this._openRevision || 0) + 1;
    // One close at a time: the bound buttons and the shared handler can both fire.
    if (this._closingUntil && Date.now() < this._closingUntil) return;
    const wrapper = this.notification.querySelector(".minicart__wrapper");
    if (!wrapper) return;
    wrapper.classList.add("open");
    const cartRecommend = document.querySelector(".cart-recommend");
    let time = 0;
    if (cartRecommend && cartRecommend.classList.contains("open")) {
      time = 500;
      cartRecommend.classList.remove("open");
    }
    this._closingUntil = Date.now() + time + 120;
    (this._closeTimers || []).forEach(clearTimeout);
    this._closeTimers = [];

    this._closeTimers.push(setTimeout(() => {
      this.notification.classList.remove("open");
      this.notification
        .querySelector(".minicart__wrapper")
        ?.classList.remove("open");
      document.documentElement.classList.remove("open-minicart");
    }, time));
    this._closeTimers.push(setTimeout(() => {
      root.style.removeProperty("padding-right");
      // Another drawer (menu, search) may have opened meanwhile: keep its lock.
      const html = document.documentElement;
      if (!html.classList.contains("open-search") && !html.classList.contains("nav-open") && !html.classList.contains("open-minicart")) {
        html.classList.remove("open-drawer");
      }
      if (document.querySelector("minicart-recommendations-beside")) {
        document
          .querySelector("minicart-recommendations-beside")
          .classList.remove("open");
      }
    }, time + 550));
    document.body?.removeEventListener("click", this.onBodyClick);
    for (var item of document.querySelectorAll(".addon")) {
      item.classList.remove("is-open");
    }
  }

  getSectionsToRender() {
    return [
      {
        id: "minicart-form",
      },
    ];
  }

  getSectionInnerHTML(html, selector = ".shopify-section") {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}
customElements.define("cart-notification", CartNotification);

// Base class for components that fetch and update content
class BaseFetcher extends HTMLElement {
  static htmlCache = new Map();
  static inFlight = new Map();

  async fetchAndUpdate(url, sourceSelector, targetSelector) {
    if (!url || this._loadingUrl === url) return;
    const revision = this._requestRevision = (this._requestRevision || 0) + 1;
    const cacheKey = url;
    if (!this.querySelector('.swiper-slide, .cart-upsell-item')) this.hidden = true;
    const cached = BaseFetcher.htmlCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 15000) {
      this.updateContent(cached.html, sourceSelector, targetSelector);
      this.initializeLazyLoading();
      return;
    }
    this._loadingUrl = url;
    try {
      if (!BaseFetcher.inFlight.has(url)) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const request = fetch(url, {signal:controller.signal,credentials:'same-origin'})
          .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.text(); })
          .then(html => {
            BaseFetcher.htmlCache.set(cacheKey, {html, at:Date.now()});
            if (BaseFetcher.htmlCache.size > 12) BaseFetcher.htmlCache.delete(BaseFetcher.htmlCache.keys().next().value);
            return html;
          }).finally(() => { clearTimeout(timeout); BaseFetcher.inFlight.delete(url); });
        BaseFetcher.inFlight.set(url, request);
      }
      const html = await BaseFetcher.inFlight.get(url);
      if (!this.isConnected || revision !== this._requestRevision) return;
      this.updateContent(html, sourceSelector, targetSelector);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('[Materia recommendations] Request failed:', error);
        if (!this.querySelector('.swiper-slide, .cart-upsell-item')) this.hidden = true;
      }
    } finally {
      if (revision === this._requestRevision) {
        this._loadingUrl = null;
        this.initializeLazyLoading();
      }
    }
  }

  updateContent(text, sourceSelector, targetSelector) {
    const html = document.createElement("div");
    html.innerHTML = text;
    
    const content = html.querySelector(sourceSelector);
    if (content?.querySelector('.swiper-slide, .cart-upsell-item')) {
      const target = this.querySelector(targetSelector);
      if (target) {
        target.innerHTML = content.innerHTML;
        this.hidden = false;
        this.classList.remove('hidden', 'no-js-hidden');
        this.classList.add('open');
        this.querySelector('slide-section')?.globalSlide?.update();
        document.dispatchEvent(new CustomEvent('materia:cart-drawer-updated'));
      }
    } else {
      this.hidden = true;
    }
  }

  initializeLazyLoading() {
    if (typeof BlsLazyloadImg !== 'undefined') {
      BlsLazyloadImg.init(this);
    }
  }

  disconnectedCallback() {
    // A shared request may still serve the other layout. Ignore stale results
    // here without aborting the request that layout is waiting for.
    this._requestRevision = (this._requestRevision || 0) + 1;
    this._loadingUrl = null;
  }
}

class CartUpsell extends BaseFetcher {
  constructor() {
    super();
  }
  
  init() {
    this.connectedCallback();
  }
  
  connectedCallback() {
    this.fetchAndUpdate(
      this.dataset.url,
      ".swiper-wrapper",
      ".swiper-wrapper"
    );
  }
}
customElements.define("minicart-recommendations", CartUpsell);

class CartUpsellBeside extends BaseFetcher {
  constructor() {
    super();
  }
  
  init() {
    this.connectedCallback();
  }
  
  connectedCallback() {
    this.fetchAndUpdate(
      this.dataset.url,
      ".cart-upsell-wrapper",
      ".cart-upsell-wrapper"
    );
  }
}
customElements.define("minicart-recommendations-beside", CartUpsellBeside);

class CartUpsellHeading extends HTMLElement {
  constructor() {
    super();
    if (this.querySelector(".button-close-beside")) {
      this.querySelector(".button-close-beside").addEventListener(
        "click",
        (e) => {
          const target = e.currentTarget;
          const closeBeside = target.closest(".cart-recommend");
          closeBeside.classList.remove("open");
        },
        false
      );
    }
  }
}
customElements.define("minicart-recommendations-heading", CartUpsellHeading);

class MinicartItemEdit extends PopupBase {
  constructor() {
    super();
    this.addEventListener("click", (event) => {
      event.preventDefault();
      const key = this.getAttribute("data-key");
      const quantity = this.getAttribute("data-quantity");
      const href = this.getAttribute("href");
      const variant =
        href.indexOf("?") > -1 ||
        href.indexOf("?variant=") > -1 ||
        href.indexOf("&variant=") > -1
          ? "&"
          : "/?";
      fetch(`${window.shopUrl}${href}${variant}section_id=cart-quick-edit`)
        .then((response) => {
          if (!response.ok) {
            var error = new Error(response.status);
            throw error;
          }
          return response.text();
        })
        .then((response) => {
          const resultsMarkup = new DOMParser()
            .parseFromString(response, "text/html")
            .getElementById("shopify-section-cart-quick-edit");
          this.initPopup(
            resultsMarkup,
            `<h3 class="title-popup h5 my-0 px-20 px-md-30 py-20 border-bottom">${this.dataset?.textHeader}</h3>`
          );
        })
        .catch((error) => {
          throw error;
        })
        .finally(() => {
          BlsLazyloadImg.init();
          if (document.querySelector("[data-template-quick-cart-edit]")) {
            document
              .querySelector("[data-template-quick-cart-edit]")
              .setAttribute("data-line", key);
          }
          if (
            document.querySelector(
              ".product-form-quick-edit quantity-input input"
            )
          ) {
            document.querySelector(
              ".product-form-quick-edit quantity-input input"
            ).value = quantity;
          }
        });
    });
  }
}
customElements.define("minicart-item-edit", MinicartItemEdit)
