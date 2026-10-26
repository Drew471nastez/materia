/* Materia: money, number tweens and the free-shipping bar. Totals change in
   place: the text counts to its new value and the bar scales, nothing remounts. */
const materiaReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function materiaParseMoney(text) {
  const match = String(text || '').replace(/ /g, ' ').match(/\d[\d.,'\s]*/);
  if (!match) return null;
  const raw = match[0].trim().replace(/[\s']/g, '');
  const decimal = raw.match(/[.,](\d{1,2})$/);
  const whole = decimal ? raw.slice(0, -decimal[0].length) : raw;
  const cents = Number(whole.replace(/[.,]/g, '') || 0) * 100 + (decimal ? Number(decimal[1].padEnd(2, '0')) : 0);
  return Number.isFinite(cents) ? cents : null;
}
function materiaFormatMoney(cents, like) {
  cents = Math.round(Number(cents) || 0);
  const format = window.cartStrings?.money_format || window.themeGlobalVariables?.settings?.money_format;
  if (typeof window.Shopify?.formatMoney === 'function') {
    try { const value = window.Shopify.formatMoney(cents, format); if (value && !/NaN|undefined/.test(value)) return value; } catch (_) {}
  }
  // The server's own text is the template: same symbol, separators and spacing.
  const sample = String(like || document.querySelector('free-ship-progress-bar[data-money-sample]')?.dataset.moneySample || '').trim();
  const found = sample.match(/\d[\d.,'\s]*\d|\d/);
  const amount = Math.abs(cents) / 100;
  if (!found) return amount.toFixed(2);
  const digits = found[0];
  const dec = digits.match(/([.,])(\d{2})$/);
  const group = (digits.slice(0, dec ? -3 : undefined).match(/[.,'\s]/) || [''])[0];
  const [whole, fraction] = amount.toFixed(2).split('.');
  const body = whole.replace(/\B(?=(\d{3})+(?!\d))/g, group) + (dec ? dec[1] + fraction : '');
  return sample.slice(0, found.index) + body + sample.slice(found.index + digits.length);
}
function materiaTweenMoney(el, toCents, finalHTML) {
  if (!el) return;
  if (el._materiaTarget === toCents && (finalHTML == null || el._materiaFinal === finalHTML)) return;
  cancelAnimationFrame(el._materiaFrame);
  const template = el.textContent.trim();
  el._materiaTarget = null; el._materiaFinal = finalHTML; el._materiaCents = toCents;
  // Reveal the confirmed server amount immediately. Animate presentation,
  // never a sequence of intermediate prices that checkout would not charge.
  if (finalHTML != null) { if (el.innerHTML !== finalHTML) el.innerHTML = finalHTML; }
  else el.textContent = materiaFormatMoney(toCents, template);
  if (!materiaReduced() && el.animate) el.animate([{opacity:.72},{opacity:1}], {duration:180,easing:'ease-out'});

}
// Bars scale (transform) instead of resizing; ProgressBar keeps its width maths.
function materiaSyncShippingBar(bar) {
  const fill = bar?.querySelector?.('.cart_shipping__fill, .percent_shipping_bar');
  if (!fill) return;
  const width = parseFloat(fill.style.width);
  if (Number.isFinite(width)) fill.style.setProperty('--fs-progress', String(Math.max(0, Math.min(100, width)) / 100));
}
customElements.whenDefined('free-ship-progress-bar').then(() => {
  const Bar = customElements.get('free-ship-progress-bar');
  if (!Bar || Bar.prototype.__materiaScaled) return;
  const original = Bar.prototype.setProgressBar;
  Bar.prototype.setProgressBar = function (progress) {
    original.call(this, progress);
    materiaSyncShippingBar(this);
  };
  Bar.prototype.__materiaScaled = true;
  document.querySelectorAll('free-ship-progress-bar').forEach(materiaSyncShippingBar);
});

/* Server-confirmed removal only: pending requests keep their row and icon.
   Keep animation work local and honour reduced motion; never delay a failure. */
function materiaPruneRecommendationExtras(root) {
  root?.querySelectorAll('.qx, .gq, .cart-faq, .faq, .faqs, .faq-section, [class*="faq__"], [class*="faq-"], [class*="questions__"], [data-section-type*="faq"], [data-block-type*="faq"]').forEach(el => el.remove());
  // Some platform renders insert an unclassified question panel inside a
  // product card *after* the recommendations response was cleaned.
  root?.querySelectorAll('details').forEach(details => {
    let panel = details.parentElement;
    while(panel && panel!==root && !panel.matches('.product-item,.swiper-slide,.cart-upsell-item')) {
      if(panel.querySelector('h2,h3,h4,h5') && !panel.querySelector('img,form,button[type="submit"],[data-theme-button]')) { panel.remove(); return; }
      panel=panel.parentElement;
    }
    details.remove();
  });
}
// This file is imported as a module; the deferred safety script cannot see
// its lexical functions. Publish this narrow helper explicitly.
window.materiaPruneRecommendationExtras=materiaPruneRecommendationExtras;
document.dispatchEvent(new Event('materia:cart-tools-ready'));

async function materiaAnimateCartRemoval(row) {
  if (!row?.isConnected || !row.animate || materiaReduced()) return;
  const style = getComputedStyle(row);
  const height = row.getBoundingClientRect().height;
  row.classList.add('materia-row-exit');
  row.style.minHeight = '0';
  row.style.overflow = 'hidden';
  const animation = row.animate([
    {height:height+'px',opacity:1,transform:'translateX(0)',marginTop:style.marginTop,marginBottom:style.marginBottom,paddingTop:style.paddingTop,paddingBottom:style.paddingBottom},
    {height:'0px',opacity:0,transform:'translateX(-6px)',marginTop:'0px',marginBottom:'0px',paddingTop:'0px',paddingBottom:'0px'},
  ], {duration:110,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'});
  await animation.finished.catch(() => {});
}
// A new line (added from recommendations or a variant change) opens into place.
function materiaAnimateRowIn(row) {
  if (!row?.isConnected || !row.animate || materiaReduced()) return;
  const height = row.getBoundingClientRect().height;
  if (!height) return;
  const style = getComputedStyle(row);
  row.classList.add('materia-row-enter');
  row.style.overflow = 'hidden';
  const animation = row.animate([
    {height:'0px',opacity:0,transform:'translateY(-4px)',marginBottom:'0px',paddingBottom:'0px'},
    {height:height+'px',opacity:1,transform:'none',marginBottom:style.marginBottom,paddingBottom:style.paddingBottom},
  ], {duration:260,easing:'cubic-bezier(.22,1,.36,1)'});
  const clean = () => { row.classList.remove('materia-row-enter'); row.style.overflow = ''; };
  animation.onfinish = clean; animation.oncancel = clean;
}

function materiaUpdateCartValue(target, source) {
  if (!target || !source) return;
  if (target.matches('[data-cart-subtotal-price]')) {
    const cents = materiaParseMoney(source.textContent);
    if (cents != null && target._materiaFinal !== source.innerHTML) { materiaTweenMoney(target, cents, source.innerHTML); return; }
    if (target._materiaTarget != null) return;
  }
  if (target.innerHTML === source.innerHTML) return;
  target.innerHTML = source.innerHTML;
}

/* Materia: stable cart reconciliation. The previous full innerHTML replacement
   destroyed recommendations, quantity controls and images on every +/- tap.
   options.keep: line keys whose quantity the shopper changed after this
   response was requested; their number stays as typed. */
function materiaPatchDrawerCart(target, incoming, options = {}) {
  if (!target || !incoming) return false;
  const oldItems = target.querySelector('#minicart .minicart-body .items');
  const newItems = incoming.querySelector('#minicart .minicart-body .items');
  // Empty/filled state changed: allow the existing full rebuild path.
  if (!oldItems || !newItems) return false;
  const keep = options.keep || new Set();
  const oldRows = new Map(Array.from(oldItems.children).filter(el => el.id).map(el => [el.id, el]));
  const wanted = [], added = [];
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
        const pending = keep.has(currentQty.dataset.id);
        if (!pending) currentQty.value = nextQty.value;
        const editor = stableRow.querySelector('cart-item-variant-switch') || document.querySelector(`cart-item-variant-switch[data-line-key="${CSS.escape(currentQty.dataset.id || '')}"]`);
        if (editor && !pending) editor.dataset.quantity = nextQty.value;
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
      wanted.push(row); added.push(row);
    }
  }
  // Move reused nodes rather than destroying/recreating them; no image flashes.
  for (let i = 0; i < wanted.length; i++) {
    const row = wanted[i];
    if (oldItems.children[i] !== row) oldItems.insertBefore(row, oldItems.children[i] || null);
  }
  while (oldItems.children.length > wanted.length) oldItems.lastElementChild.remove();
  if (options.animate !== false) added.forEach(materiaAnimateRowIn);
  // Cart subtotal/discounts can change; payment icons and messages do not need a rebuild.
  for (const sel of ['[data-cart-subtotal-price]', '[data-discounts-list]', '.cart-discount__codes']) {
    const fresh = incoming.querySelectorAll(sel);
    target.querySelectorAll(sel).forEach((dst,index) => {
      if (options.skipSubtotal && dst.matches('[data-cart-subtotal-price]')) return;
      materiaUpdateCartValue(dst,fresh[index]);
    });
  }
  // Recalculate savings text when installed without remounting the panel.
  const savingsOld = target.querySelector('.cda-savings');
  const savingsNew = incoming.querySelector('.cda-savings');
  if (savingsOld && savingsNew && savingsOld.innerHTML !== savingsNew.innerHTML) savingsOld.innerHTML = savingsNew.innerHTML;
  // Recommendations follow the new lead product without going blank: the
  // mounted list stays until the new one has arrived.
  const recOld = target.querySelector('minicart-recommendations');
  const recNew = incoming.querySelector('minicart-recommendations');
  if (recOld && recNew && recOld.dataset.url !== recNew.dataset.url) {
    if (typeof recOld.refresh === 'function') recOld.refresh(recNew.dataset.url);
    else recOld.replaceWith(recNew.cloneNode(true));
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
    this.notification.addEventListener("change", (event) => this.onChange(event), {signal});
    this.notification.addEventListener("input", (event) => this.onQuantityInput(event), {signal});
    // Checkout waits until every quantity change has reached the cart.
    this.addEventListener("click", (event) => {
      if ((this._qtyBusy || this._qtyTimer || this._desired?.size) && event.target.closest(".btn-checkout,[name=\"checkout\"]")) {
        event.preventDefault(); event.stopImmediatePropagation();
        const go = event.target.closest(".btn-checkout,[name=\"checkout\"]");
        this._afterQuantities = () => go.click();
        if (this._qtyTimer) { clearTimeout(this._qtyTimer); this._qtyTimer = 0; this.pumpQuantities(); }
      }
    }, {capture: true, signal});
    this.notification.addEventListener("submit", (event) => {
      const form = event.target.closest?.("minicart-recommendations form, .cart-recommend form");
      if (!form || !this.contains(form)) return;
      event.preventDefault();
      event.stopPropagation();
      this.addFromRecommendation(form);
    }, {signal, capture: true});
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
    this.querySelectorAll(".cart-recommend").forEach(materiaPruneRecommendationExtras);
    // Another script (discount, gift wrap, editor) may have drawn new totals:
    // the next optimistic paint reads them again.
    if (!this._desired?.size) { this._confirmedSubtotal = null; this._confirmedOrder = null; }
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
      id: String(variant_id),
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
                cart_free_ship.init(cart.total_price);
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
    const input = event.target;
    if (input?.getAttribute?.("name") !== "updates[]" || !input.dataset.id) return;
    // +/- (the theme's synthetic change) coalesces fast taps; a typed number
    // is sent when the field is left or Enter is pressed.
    this.setLineQuantity(input.dataset.id, input.value, {delay: event.isTrusted ? 0 : 100, input});
  }

  onQuantityInput(event) {
    const input = event.target;
    if (input?.getAttribute?.("name") !== "updates[]" || !input.dataset.id || input.value === "") return;
    this.setLineQuantity(input.dataset.id, input.value, {delay: 350, input});
  }

  /* One cart request at a time; the newest number for each line wins.
     The number on screen changes at once, totals follow optimistically, and
     a response never writes over a line the shopper changed meanwhile. */
  setLineQuantity(key, quantity, {delay = 0, input} = {}) {
    if (!key) return;
    this._desired = this._desired || new Map();
    this._removing = this._removing || new Set();
    const qty = Math.max(0, parseInt(quantity, 10) || 0);
    // A second tap on a line already being removed does nothing.
    if (this._removing.has(String(key))) return;
    this._desired.set(String(key), qty);
    const field = input || this.querySelector(`input[name="updates[]"][data-id="${CSS.escape(String(key))}"]`);
    if (field && String(field.value) !== String(qty) && document.activeElement !== field) field.value = qty;
    this.clearLineError(key);
    this.paintOptimistic();
    if (qty !== 0) this.ensureCartState();
    else {
      const remove = this.querySelector('mini-cart-remove-button[data-index="' + CSS.escape(String(key)) + '"]');
      remove?.classList.add('loading');
      remove?.setAttribute('aria-busy', 'true');
    }
    clearTimeout(this._qtyTimer);
    this._qtyTimer = 0;
    if (delay > 0) this._qtyTimer = setTimeout(() => { this._qtyTimer = 0; this.pumpQuantities(); }, delay);
    else this.pumpQuantities();
  }

  updateQuantity(id, quantity) {
    this.setLineQuantity(id, quantity || 0, {delay: 0});
  }

  serverQuantity(key) {
    const input = this.querySelector(`input[name="updates[]"][data-id="${CSS.escape(String(key))}"]`);
    const value = parseInt(input?.dataset.value ?? input?.defaultValue, 10);
    if (Number.isFinite(value)) return value;
    return this._cart?.items?.find(item => item.key === key)?.quantity ?? null;
  }

  ensureCartState(force = false) {
    if ((this._cart && !force) || this._cartLoading) return this._cartLoading;
    const base = String(window.routes?.cart_url || "/cart").replace(/\/$/, "");
    this._cartLoading = fetch(base + ".js", {credentials: "same-origin", headers: {Accept: "application/json"}})
      .then(response => response.ok ? response.json() : null)
      .then(cart => {
        if (!cart || !Array.isArray(cart.items) || this._qtyBusy) return;
        this._cart = cart;
        this._recommendationAdded = new Set(cart.items.map(item => String(item.variant_id || item.id)));
        this.paintRecommendationStates();
        this._confirmedCount = cart.item_count;
        if (!this._desired?.size && cart.total_price != undefined) {
          this._confirmedOrder = Number(cart.total_price);
          const bar = document.querySelector("free-ship-progress-bar");
          if (bar) this._paintedOrder = bar.dataset.order;
          try { document.querySelector("header-total-price")?.updateTotal?.(cart); } catch (_) {}
        }
        this.paintOptimistic();
      })
      .catch(() => {})
      .finally(() => { this._cartLoading = null; });
    return this._cartLoading;
  }

  optimisticDelta() {
    let cents = 0, count = 0, known = true;
    for (const [key, qty] of this._desired || []) {
      const server = this.serverQuantity(key);
      if (server == null) { known = false; continue; }
      count += qty - server;
      const item = this._cart?.items?.find(line => line.key === key);
      if (!item) { if (qty !== server) known = false; continue; }
      // Prices can cross offer tiers. Only the server can price this change.
    }
    return {cents, count, known};
  }

  paintOptimistic() {
    const delta = this.optimisticDelta();
    const subtotal = this.querySelector("[data-cart-subtotal-price]");
    if (subtotal) {
      // A drawer redrawn by another script brings a new subtotal: read it again.
      if (!this._confirmedSubtotal || this._confirmedSubtotal.el !== subtotal) {
        // Mid-count, the value it is counting to is the confirmed one.
        this._confirmedSubtotal = {el: subtotal, cents: subtotal._materiaTarget ?? materiaParseMoney(subtotal._materiaFinal ?? subtotal.textContent), html: subtotal._materiaFinal ?? subtotal.innerHTML};
      }
      const base = this._confirmedSubtotal;
      if (base.cents != null) {
        // Prices of the changed lines are not known yet: show the confirmed
        // total rather than keep an older one.
        materiaTweenMoney(subtotal, base.cents, base.html);
      }
    }
    const bar = document.querySelector("free-ship-progress-bar");
    if (bar && typeof bar.init === "function") {
      const shown = bar.dataset.order;
      // Redrawn by someone else since we painted it: its amount is the base.
      if (shown != null && (this._confirmedOrder == null || (this._paintedOrder != null && shown !== String(this._paintedOrder)))) this._confirmedOrder = Number(shown) || 0;
      if (this._confirmedOrder != null) {
        // Unknown line prices: the confirmed amount, never a guess.
        const order = Math.max(0, Math.round(this._confirmedOrder));
        if (String(this._paintedOrder) !== String(order) || !bar.__materiaPainted) {
          this._paintedOrder = order;
          bar.__materiaPainted = true;
          try { bar.init(order); } catch (_) {}
        }
      }
    }
    const inputs = [...this.querySelectorAll('input[name="updates[]"]')];
    const base = inputs.length ? inputs.reduce((sum, input) => sum + (parseInt(input.dataset.value, 10) || 0), 0) : this._confirmedCount;
    if (base != null) this.writeCount(Math.max(0, base + delta.count));
  }

  writeCount(count) {
    document.querySelectorAll(".cart-count").forEach((el) => {
      const text = el.classList.contains("cart-count-drawer") ? `(${count})` : String(count > 100 ? "~" : count);
      if (el.textContent.trim() !== text) el.textContent = text;
    });
  }

  async pumpQuantities() {
    if (this._qtyBusy || this._qtyTimer || !this._desired?.size) return;
    const [key, quantity] = this._desired.entries().next().value;
    this._qtyBusy = true;
    if (Number(quantity) === 0) this._removing.add(String(key));
    try {
      await this.sendQuantity(key, quantity);
    } finally {
      this._qtyBusy = false;
      this._removing.delete(String(key));
    }
    if (this._desired.size && !this._qtyTimer) this.pumpQuantities();
    else if (!this._desired.size && !this._qtyTimer && this._afterQuantities) { const go = this._afterQuantities; this._afterQuantities = null; go(); }
  }

  async sendQuantity(id, quantity) {
    const body = JSON.stringify({
      id,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    });
    const removeButton = this.querySelector(`mini-cart-remove-button[data-index="${CSS.escape(String(id))}"]`);
    // Only a removal shows the remove button's spinner; +/- leaves its icon alone.
    if (removeButton && Number(quantity) === 0) removeButton.classList.add("loading");
    const config = typeof fetchConfig === "function" ? fetchConfig() : {method: "POST", headers: {"Content-Type": "application/json", Accept: "application/json"}};
    let parsedState = null;
    try {
      const response = await fetch(`${window.routes?.cart_change_url || "/cart/change.js"}`, {...config, body});
      const text = await response.text();
      try { parsedState = JSON.parse(text); } catch (_) {
        console.warn("[cart] /cart/change returned non-JSON", text ? text.slice(0, 200) : text);
      }
      if (!parsedState || parsedState.errors || parsedState.status >= 400 || parsedState.item_count == undefined) {
        const message = parsedState?.errors || parsedState?.description || parsedState?.message || window.cartStrings?.error || "Update failed";
        this.rejectQuantity(id, quantity, typeof message === "string" ? message : window.cartStrings?.error || "Update failed");
        return;
      }
      if (this._desired.get(String(id)) === quantity) this._desired.delete(String(id));
      await this.applyCartState(parsedState, {removed: Number(quantity) === 0 ? id : null});
    } catch (error) {
      console.error("[cart] Quantity update failed:", error);
      this.rejectQuantity(id, quantity, window.cartStrings?.error || error.message);
    } finally {
      removeButton?.classList.remove("loading");
      removeButton?.removeAttribute("aria-busy");
    }
  }

  rejectQuantity(id, quantity, message) {
    if (this._desired.get(String(id)) === quantity) this._desired.delete(String(id));
    const input = this.querySelector(`input[name="updates[]"][data-id="${CSS.escape(String(id))}"]`);
    if (input && !this._desired.has(String(id))) {
      const server = this.serverQuantity(id);
      if (server != null) input.value = server;
    }
    this.updateMessageErrors(id, message, input);
    this.paintOptimistic();
  }

  clearLineError(line) {
    const text = document.getElementById(`CartDrawer-LineItemError-${line}`)?.querySelector(".cart-item__error-text");
    if (text && text.textContent) text.textContent = "";
  }

  /* Draws a confirmed cart: rows patched in place, a removed row collapses,
     a new row opens, totals count to their values. Used by quantity changes,
     recommendations and the variant editor. */
  async applyCartState(parsedState, {removed = null} = {}) {
    if (Array.isArray(parsedState.items)) this._cart = parsedState;
    else this.ensureCartState(true);
    this._confirmedCount = parsedState.item_count ?? this._confirmedCount;
    if (parsedState.total_price != undefined) {
      this._confirmedOrder = Number(parsedState.total_price);
      const bar = document.querySelector("free-ship-progress-bar");
      if (bar) this._paintedOrder = bar.dataset.order;
    }
    try {
      const header = document.querySelector("header-total-price");
      if (header && typeof header.updateTotal === "function") header.updateTotal(parsedState);
    } catch (_) {}
    // PDP quantity badge sync (when this product is currently open)
    try {
      const label = document.querySelector(".quantity__label");
      if (label && Array.isArray(parsedState.items)) {
        const item = parsedState.items.find(line => String(line.variant_id) == label.getAttribute("data-pro-id"));
        const count = document.querySelector(".quantity-cart");
        if (count) count.textContent = item ? item.quantity : 0;
        label.classList.toggle("hidden", !item);
      }
    } catch (_) {}
    try {
      if (parsedState.item_count == 0) {
        this.cartCountDown?.querySelector("countdown-timer")?.remove();
        this.cartUpsellBeside?.classList.remove("is-open");
      }
    } catch (_) {}
    const keep = new Set(this._desired?.keys() || []);
    for (const section of this.getSectionsToRender()) {
      try {
        const elementToReplace = document.getElementById(section.id);
        const sectionHTML = parsedState.sections && parsedState.sections[section.id];
        if (!elementToReplace || !sectionHTML) continue;
        const html = new DOMParser().parseFromString(sectionHTML, "text/html");
        const minicartForm = html.querySelector("#minicart-form");
        if (!minicartForm) continue;
        // Totals first: they count to the new value while a removed row collapses.
        const freshSubtotal = minicartForm.querySelector("[data-cart-subtotal-price]");
        const liveSubtotal = elementToReplace.querySelector("[data-cart-subtotal-price]");
        if (freshSubtotal && liveSubtotal) this._confirmedSubtotal = {el: liveSubtotal, cents: materiaParseMoney(freshSubtotal.textContent), html: freshSubtotal.innerHTML};
        // The confirmed quantities are the base the optimistic totals add to.
        elementToReplace.querySelectorAll('input[name="updates[]"]').forEach(input => {
          const fresh = minicartForm.querySelector(`input[name="updates[]"][data-id="${CSS.escape(input.dataset.id || "")}"]`);
          input.dataset.value = fresh ? (fresh.dataset.value ?? fresh.value) : "0";
        });
        this.paintOptimistic();
        const row = removed != null && elementToReplace.querySelector("#" + CSS.escape("minicart__product-" + removed));
        if (row && !minicartForm.querySelector("#" + CSS.escape(row.id))) await materiaAnimateCartRemoval(row);
        if (!elementToReplace.isConnected) continue;
        const scroller = this.querySelector(".minicart-scroll");
        const scrollTop = scroller?.scrollTop;
        if (!materiaPatchDrawerCart(elementToReplace, minicartForm, {keep, skipSubtotal: true})) {
          elementToReplace.innerHTML = minicartForm.innerHTML;
          this._confirmedSubtotal = null;
        }
        if (scroller && scroller.isConnected && scrollTop != null && Math.abs(scroller.scrollTop - scrollTop) > 1) scroller.scrollTop = scrollTop;
        elementToReplace.querySelectorAll("img.bls-loading-image").forEach((img) => {
          if (img.complete && img.naturalWidth > 0) {
            img.closest("motion-element")?.classList.remove("bls-loading-image");
            img.classList.remove("bls-loading-image");
          }
        });
      } catch (perSectionErr) {
        console.warn("[cart] section render failed for", section.id, perSectionErr);
      }
    }
    this.paintOptimistic();
    try { this.cartAction(); } catch (_) {}
    try { if (typeof window.cdaTick === "function") window.cdaTick(); } catch (_) {}
    try { if (typeof BlsLazyloadImg !== "undefined" && BlsLazyloadImg?.init) BlsLazyloadImg.init(this); } catch (_) {}
    try {
      const cartRecommend = this.querySelector(".cart-recommend");
      if (cartRecommend && !cartRecommend.classList.contains("hidden-recommend") && cartRecommend.querySelector(".swiper-slide, .cart-upsell-item")) {
        requestAnimationFrame(() => { if (cartRecommend.isConnected) cartRecommend.classList.add("open"); });
      }
    } catch (_) {}
  }

  /* "You may also like" inside the drawer: add in place, the new line opens
     and nothing else is redrawn. */
  paintRecommendationStates() {
    this.querySelectorAll('minicart-recommendations form, .cart-recommend form').forEach(form => {
      const button = form.querySelector('[type="submit"]');
      const label = button?.querySelector('.pc-atc__label, .hidden-on-load:not(svg)');
      if (!label) return;
      label.dataset.addLabel ??= label.textContent;
      const id = form.querySelector('[name="id"]')?.value;
      const added = this._recommendationAdded?.has(String(id)) || false;
      button.dataset.added = String(added);
      label.textContent = added ? form.closest('[data-added-text]')?.dataset.addedText || window.cartStrings?.added || 'Added' : label.dataset.addLabel;
    });
  }
  async addFromRecommendation(form) {
    const button = form.querySelector('[type="submit"]');
    if (button?.getAttribute("aria-disabled") === "true" || form.dataset.adding === "true") return;
    const data = new FormData(form);
    const id = data.get("id");
    if (!id) return;
    form.dataset.adding = "true";
    button?.classList.add("loading");
    button?.setAttribute("aria-busy", "true");
    const sections = this.getSectionsToRender().map((section) => section.id);
    try {
      // Serialised with quantity changes.
      while (this._qtyBusy) await new Promise(resolve => setTimeout(resolve, 60));
      this._qtyBusy = true;
      const response = await fetch(`${window.routes?.cart_add_url || "/cart/add.js"}`, {
        method: "POST", credentials: "same-origin",
        headers: {"Content-Type": "application/json", Accept: "application/json", "X-Requested-With": "XMLHttpRequest"},
        body: JSON.stringify({id, quantity: Math.max(1, parseInt(data.get("quantity"), 10) || 1), sections, sections_url: window.location.pathname}),
      });
      const added = await response.json().catch(() => null);
      if (!response.ok || !added || added.status >= 400 || added.errors) throw new Error(added?.description || added?.message || window.cartStrings?.error || "Unable to add");
      const quantityAdded = Number(added.quantity) || 1;
      const state = {sections: added.sections || null, item_count: (this._cart?.item_count ?? 0) + quantityAdded};
      this._qtyBusy = false;
      await this.applyCartState(state);
      this._recommendationAdded ||= new Set();
      this._recommendationAdded.add(String(id));
      this.paintRecommendationStates();
      // Counts and the free-shipping bar settle from the cart itself.
      this.ensureCartState(true);
      document.dispatchEvent(new CustomEvent("cart:refresh", {detail: {source: "drawer-recommendation"}}));
    } catch (error) {
      this._qtyBusy = false;
      const message = error.message || window.cartStrings?.error;
      if (typeof showToast === "function" && message) showToast(message, 3000, "modal-error");
    } finally {
      this._qtyBusy = false;
      delete form.dataset.adding;
      button?.classList.remove("loading");
      button?.removeAttribute("aria-busy");
      if (this._desired?.size) this.pumpQuantities();
    }
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
      // Unit prices for the optimistic totals, read once the drawer is open.
      if (typeof this.ensureCartState === "function") setTimeout(() => this.ensureCartState(), 120);
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
    
    // A recommendations response can include the surrounding page in editor
    // previews. Never take an unrelated section's first slider/FAQ.
    const results = html.querySelector('[data-cart-upsell-results], .cart-upsell, #shopify-section-cart-upsell');
    const content = results?.querySelector(sourceSelector);
    if (content) {
      [...content.children].forEach(child => {
        if (!child.matches('.swiper-slide, .cart-upsell-item') || !child.querySelector('.product-item')) child.remove();
      });
      materiaPruneRecommendationExtras(content);
    }
    if (content?.querySelector('.swiper-slide, .cart-upsell-item')) {
      const target = this.querySelector(targetSelector);
      if (target) {
        if (target.innerHTML === content.innerHTML) { this.hidden = false; return; }
        const had = !!target.querySelector('.swiper-slide, .cart-upsell-item');
        target.innerHTML = content.innerHTML;
        if (had && target.animate && !materiaReduced()) target.animate([{opacity: .35}, {opacity: 1}], {duration: 220, easing: 'ease-out'});
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

  // A new lead product: keep the current list on screen until the new one is in.
  refresh(url) {
    if (!url || url === this.dataset.url) return;
    this.dataset.url = url;
    this.fetchAndUpdate(url, ".swiper-wrapper", ".swiper-wrapper");
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
