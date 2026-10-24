/* Materia Themes. Product information blocks built for Storelib: Bundle and
   Quantity offer (snippets/product-offers.storelib).
   Both add to the cart with one POST to /cart/add.js carrying items[], the
   way the theme's own cart code does, then redraw and open the cart drawer.
   A discount code set on the block is applied afterwards with the cart's own
   discount request (POST /cart/update.js with "discount", as cart-discount.js
   sends it). Prices shown are for display: Storelib checkout prices the order. */
(function () {
  if (window.MateriaProductOffers) return;

  const money = (cents, format) => {
    const value = Math.max(0, Math.round(Number(cents) || 0));
    if (window.Shopify && typeof window.Shopify.formatMoney === 'function') {
      try { return window.Shopify.formatMoney(value, format || window.cartStrings?.money_format); } catch (_) {}
    }
    const currency = window.Shopify?.currency?.active || 'USD';
    try { return new Intl.NumberFormat(document.documentElement.lang || undefined, {style: 'currency', currency}).format(value / 100); }
    catch (_) { return (value / 100).toFixed(2); }
  };

  const addUrl = () => String(window.routes?.cart_add_url || '/cart/add').replace(/\.js$/, '') + '.js';
  const updateUrl = () => String(window.routes?.cart_update_url || '/cart/update').replace(/\.js$/, '') + '.js';
  const jsonHeaders = {'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest'};
  const findCart = () => document.querySelector('cart-notification') || document.querySelector('cart-drawer');
  const sectionIds = cart => (cart && typeof cart.getSectionsToRender === 'function') ? cart.getSectionsToRender().map(s => s.id) : [];

  async function post(url, body) {
    const response = await fetch(url, {method: 'POST', headers: jsonHeaders, body: JSON.stringify(body), credentials: 'same-origin'});
    let data = null;
    try { data = await response.json(); } catch (_) {}
    if (!response.ok || (data && data.status && Number(data.status) >= 400)) {
      const message = (data && (data.description || data.message || (typeof data.errors === 'string' && data.errors))) || '';
      const error = new Error(message || 'HTTP ' + response.status);
      error.userMessage = message;
      throw error;
    }
    return data || {};
  }

  function renderDrawer(cart, data) {
    if (!cart || !data || !data.sections) return;
    sectionIds(cart).forEach(id => {
      const target = document.getElementById(id);
      const markup = data.sections[id];
      if (!target || !markup) return;
      const html = new DOMParser().parseFromString(markup, 'text/html');
      const incoming = html.querySelector('#minicart-form') || html.getElementById(id);
      if (!incoming) return;
      if (!(typeof window.materiaPatchDrawerCart === 'function' && window.materiaPatchDrawerCart(target, incoming))) target.innerHTML = incoming.innerHTML;
    });
    try { cart.cartAction?.(); } catch (_) {}
    cart.classList.remove('is-empty');
  }

  async function refreshCounts() {
    try {
      const cart = await (await fetch('/cart.json', {headers: {Accept: 'application/json'}})).json();
      if (cart.item_count == null) return cart;
      document.querySelectorAll('.cart-count').forEach(el => {
        el.innerHTML = el.classList.contains('cart-count-drawer') ? `(${cart.item_count})` : (cart.item_count > 100 ? '~' : cart.item_count);
      });
      document.querySelector('header-total-price')?.updateTotal?.(cart);
      document.querySelector('free-ship-progress-bar')?.init?.(cart.items_subtotal_price);
      return cart;
    } catch (_) { return null; }
  }

  /** Adds every line in one request, applies an optional code, opens the drawer. */
  async function addLines(items, options = {}) {
    const cart = findCart();
    const ids = sectionIds(cart);
    const body = {items};
    if (ids.length && !options.discountCode) { body.sections = ids; body.sections_url = window.location.pathname; }
    let data = await post(addUrl(), body);
    if (options.discountCode) {
      let codes = [];
      try {
        const current = await (await fetch('/cart.js', {headers: {Accept: 'application/json'}})).json();
        codes = (current.discount_codes || []).map(d => d && d.code).filter(Boolean);
      } catch (_) {}
      if (!codes.some(code => code.toLowerCase() === options.discountCode.toLowerCase())) codes.push(options.discountCode);
      const update = {discount: codes.join(',')};
      if (ids.length) { update.sections = ids; update.sections_url = window.location.pathname; }
      try { data = await post(updateUrl(), update); } catch (_) { /* the items are in; a refused code is shown in the cart */ }
    }
    if (!cart) { window.location.href = window.routes?.cart_url || '/cart'; return data; }
    renderDrawer(cart, data);
    refreshCounts();
    /* utils.js declares publish and PUB_SUB_EVENTS as page globals. */
    if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      try { publish(PUB_SUB_EVENTS.cartUpdate, {source: 'product-offers', cartData: data}); } catch (_) {}
    }
    try { await cart.open?.(); } catch (_) {}
    return data;
  }

  class OfferBase extends HTMLElement {
    connectedCallback() {
      this.events?.abort();
      this.events = new AbortController();
      this.format = this.dataset.moneyFormat || '';
      this.button = this.querySelector('[data-offer-add]');
      this.message = this.querySelector('[data-message]');
      this.button?.addEventListener('click', () => this.submit(), {signal: this.events.signal});
      document.addEventListener('change', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement) || input.name !== 'id') return;
        const form = input.form || input.closest('form');
        /* form.id would be the form's own name="id" input, so read the attribute. */
        if (form && form.getAttribute('id') === this.dataset.formId) this.onVariant(String(input.value));
      }, {signal: this.events.signal});
      this.setup();
    }
    disconnectedCallback() { this.events?.abort(); }
    form() { return this.dataset.formId ? document.getElementById(this.dataset.formId) : null; }
    formVariant() {
      const input = this.form()?.querySelector('[name="id"]');
      return input && input.value ? String(input.value) : '';
    }
    say(text, tone) {
      if (!this.message) return;
      this.message.textContent = text || '';
      this.message.hidden = !text;
      this.message.dataset.tone = tone || '';
    }
    async run(items, discountCode) {
      if (!this.button || this.button.getAttribute('aria-busy') === 'true') return;
      this.say('');
      this.button.setAttribute('aria-busy', 'true');
      this.button.classList.add('loading');
      try { await addLines(items, {discountCode}); }
      catch (error) { this.say(error.userMessage || this.dataset.error || window.cartStrings?.error || '', 'error'); }
      finally { this.button.removeAttribute('aria-busy'); this.button.classList.remove('loading'); }
    }
    setup() {}
    onVariant() {}
  }

  class ProductBundle extends OfferBase {
    setup() {
      this.lines = [...this.querySelectorAll('[data-line]')];
      this.addEventListener('change', event => {
        if (event.target.matches('[data-line-check], [data-line-variant]')) this.update();
      }, {signal: this.events.signal});
      const current = this.formVariant();
      if (current) this.onVariant(current); else this.update();
    }
    onVariant(id) {
      const select = this.querySelector('[data-main-line] select[data-line-variant]');
      if (select && [...select.options].some(o => o.value === id) && select.value !== id) select.value = id;
      this.update();
    }
    variantOf(line) {
      const control = line.querySelector('[data-line-variant]');
      if (!control) return null;
      const source = control.tagName === 'SELECT' ? control.selectedOptions[0] : control;
      if (!source) return null;
      return {id: String(control.value), price: Number(source.dataset.price) || 0, compare: Number(source.dataset.compare) || 0, available: source.dataset.available !== 'false'};
    }
    update() {
      const percent = Math.min(90, Math.max(0, Number(this.dataset.discount) || 0));
      const showCompare = this.dataset.showCompare === 'true';
      let total = 0; let count = 0; let complete = true;
      this.lines.forEach(line => {
        const variant = this.variantOf(line);
        const check = line.querySelector('[data-line-check]');
        const usable = !!variant && variant.available;
        line.toggleAttribute('data-unavailable', !usable);
        const included = usable && check?.checked;
        line.toggleAttribute('data-excluded', !included);
        if (!included) complete = false;
        if (variant) {
          const price = line.querySelector('[data-line-price]');
          const compare = line.querySelector('[data-line-compare]');
          if (price) price.textContent = money(variant.price, this.format);
          if (compare) {
            const show = showCompare && variant.compare > variant.price;
            compare.hidden = !show;
            compare.textContent = show ? money(variant.compare, this.format) : '';
          }
        }
        if (included) { total += variant.price; count += 1; }
      });
      /* The saving is shown for a complete set, as Storelib's bundles take it off. */
      const saving = complete && percent > 0 ? Math.round(total * percent / 100) : 0;
      const totalEl = this.querySelector('[data-total]');
      const compareEl = this.querySelector('[data-total-compare]');
      const savingEl = this.querySelector('[data-saving]');
      if (totalEl) totalEl.textContent = money(total - saving, this.format);
      if (compareEl) { compareEl.hidden = !saving; compareEl.textContent = saving ? money(total, this.format) : ''; }
      if (savingEl) {
        savingEl.hidden = !saving;
        const amount = savingEl.querySelector('[data-saving-amount]');
        if (amount) amount.textContent = money(saving, this.format);
      }
      this.complete = complete;
      if (this.button) this.button.disabled = count === 0;
    }
    submit() {
      const items = [];
      this.lines.forEach(line => {
        const variant = this.variantOf(line);
        if (variant && variant.available && line.querySelector('[data-line-check]')?.checked) items.push({id: variant.id, quantity: 1});
      });
      if (!items.length) return;
      this.run(items, this.complete ? (this.dataset.discountCode || '') : '');
    }
  }

  class QuantityOffer extends OfferBase {
    setup() {
      try { this.variants = JSON.parse(this.querySelector('script[data-variants]')?.textContent || '[]'); } catch (_) { this.variants = []; }
      try { this.selected = String(JSON.parse(this.querySelector('script[data-selected]')?.textContent || '""')); } catch (_) { this.selected = ''; }
      this.radios = [...this.querySelectorAll('.po-tier__radio')];
      if (this.radios.length && !this.radios.some(r => r.checked)) this.radios[0].checked = true;
      this.addEventListener('change', event => {
        if (event.target.matches('.po-tier__radio')) { this.update(); this.syncForm(); }
      }, {signal: this.events.signal});
      this.selected = this.formVariant() || this.selected;
      this.update();
      this.syncForm();
    }
    onVariant(id) { this.selected = id; this.update(); }
    variant() {
      return this.variants.find(v => String(v.id) === this.selected) || this.variants.find(v => v.available) || this.variants[0] || null;
    }
    tier() { return this.radios.find(r => r.checked) || this.radios[0] || null; }
    update() {
      const variant = this.variant();
      if (!variant) return;
      const showCompare = this.dataset.showCompare === 'true';
      this.radios.forEach(radio => {
        const qty = Math.max(1, parseInt(radio.value, 10) || 1);
        const percent = Math.min(90, Math.max(0, Number(radio.dataset.discount) || 0));
        const each = Math.round(variant.price * (100 - percent) / 100);
        const compareEach = percent > 0 ? variant.price : Math.max(variant.price, variant.compare || 0);
        const card = radio.closest('.po-tier');
        const total = card.querySelector('[data-tier-total]');
        const compare = card.querySelector('[data-tier-compare]');
        const eachEl = card.querySelector('[data-tier-each]');
        if (total) total.textContent = money(each * qty, this.format);
        if (eachEl) eachEl.textContent = money(each, this.format);
        if (compare) {
          const show = showCompare && compareEach * qty > each * qty;
          compare.hidden = !show;
          compare.textContent = show ? money(compareEach * qty, this.format) : '';
        }
      });
      if (this.button) {
        this.button.disabled = !variant.available;
        const text = this.button.querySelector('.po-button__text');
        if (text) {
          if (!this.label) this.label = text.textContent;
          text.textContent = variant.available ? this.label : (this.dataset.soldOut || this.label);
        }
      }
    }
    /* The tier sets the product form's quantity, so the main Add to cart and
       Buy now use it too. A form without a quantity field gets a hidden one. */
    syncForm() {
      if (this.dataset.syncForm !== 'true') return;
      const form = this.form();
      const tier = this.tier();
      if (!form || !tier) return;
      const qty = String(Math.max(1, parseInt(tier.value, 10) || 1));
      let inputs = [...new Set([...document.querySelectorAll(`input[name="quantity"][form="${CSS.escape(this.dataset.formId)}"]`), ...form.querySelectorAll('input[name="quantity"]')])];
      if (!inputs.length) {
        const hidden = document.createElement('input');
        hidden.type = 'hidden'; hidden.name = 'quantity'; hidden.dataset.quantityOffer = '';
        form.appendChild(hidden);
        inputs = [hidden];
      }
      inputs.forEach(input => {
        if (input.value === qty) return;
        input.value = qty;
        input.dispatchEvent(new Event('input', {bubbles: true}));
        input.dispatchEvent(new Event('change', {bubbles: true}));
      });
    }
    submit() {
      const variant = this.variant();
      const tier = this.tier();
      if (!variant || !variant.available || !tier) return;
      const quantity = Math.max(1, parseInt(tier.value, 10) || 1);
      this.run([{id: String(variant.id), quantity}], tier.dataset.discountCode || '');
    }
  }

  window.MateriaProductOffers = {addLines, money};
  if (!customElements.get('product-bundle')) customElements.define('product-bundle', ProductBundle);
  if (!customElements.get('quantity-offer')) customElements.define('quantity-offer', QuantityOffer);
})();
