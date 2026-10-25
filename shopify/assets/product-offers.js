/* Materia Themes. Product offers built for Storelib's cart and checkout:
   Bundle and Quantity offer (snippets/product-offers.storelib), Upsell Pro
   (snippets/upsell-pro.storelib) and Pair with (product-info-blocks).

   Every add is one POST to /cart/add.js carrying items[] with variant ids as
   strings (Storelib ids are not numbers), then the cart drawer is redrawn and,
   where the block says so, opened.

   Each line an offer adds carries line item properties that say which offer
   it came from (docs/upsells-storelib.md has the contract):
     _sl_offer        bundle | quantity_break | upsell | pair
     _sl_offer_id     the Storelib offer id, when the store has a matching one
     _sl_group        one id per press, shared by every line of that add
     _sl_block        the block that added it
     _sl_source       the product whose page it was added from
     _sl_tier, _sl_paid_qty, _sl_free_qty, _sl_discount   quantity breaks
   Properties starting with "_" are hidden in the cart. Storelib checkout
   prices the order again on the server; nothing here changes a charge.

   A discount code set on a block is applied after the add with the cart's
   own discount request (POST /cart/update.js with "discount"). */
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
  const changeUrl = () => String(window.routes?.cart_change_url || '/cart/change').replace(/\.js$/, '') + '.js';
  const jsonHeaders = {'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest'};
  const findCart = () => document.querySelector('cart-notification') || document.querySelector('cart-drawer');
  const sectionIds = cart => (cart && typeof cart.getSectionsToRender === 'function') ? cart.getSectionsToRender().map(s => s.id) : [];
  let groupSeq = 0;
  const groupId = prefix => `${prefix}-${Date.now().toString(36)}${(++groupSeq).toString(36)}`;
  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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

  /* Reads a Storelib offers endpoint once per address. A store or a platform
     without it answers 404 and the block keeps its own settings. */
  const offerCache = new Map();
  function readOffers(url) {
    if (!offerCache.has(url)) {
      offerCache.set(url, fetch(url, {headers: {Accept: 'application/json'}, credentials: 'same-origin'})
        .then(r => (r.ok ? r.json() : null)).catch(() => null));
    }
    return offerCache.get(url);
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
        el.classList.remove('hidden');
      });
      document.querySelector('header-total-price')?.updateTotal?.(cart);
      document.querySelector('free-ship-progress-bar')?.init?.(cart.items_subtotal_price);
      document.dispatchEvent(new CustomEvent('cart:updated', {detail: {source: 'product-offers', cart}}));
      return cart;
    } catch (_) { return null; }
  }

  /* Drops empty properties so a plain line stays plain. */
  function cleanItems(items) {
    return items.map(item => {
      const line = {id: String(item.id), quantity: Math.max(1, Math.min(99, parseInt(item.quantity, 10) || 1))};
      const props = {};
      Object.entries(item.properties || {}).forEach(([k, v]) => { if (v !== '' && v != null) props[k] = String(v); });
      if (Object.keys(props).length) line.properties = props;
      return line;
    });
  }

  /** Adds every line in one request, applies an optional code, redraws the
      drawer and opens it unless open is false. */
  async function addLines(items, options = {}) {
    const cart = findCart();
    const ids = sectionIds(cart);
    const body = {items: cleanItems(items)};
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
    if (!cart) {
      if (options.open !== false) window.location.href = window.routes?.cart_url || '/cart';
      else refreshCounts();
      return data;
    }
    renderDrawer(cart, data);
    refreshCounts();
    /* utils.js declares publish and PUB_SUB_EVENTS as page globals. */
    if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      try { publish(PUB_SUB_EVENTS.cartUpdate, {source: options.source || 'product-offers', cartData: data}); } catch (_) {}
    }
    if (options.open !== false) { try { await cart.open?.(); } catch (_) {} }
    return data;
  }

  /** Takes one variant out of the cart again (Pair with's second press). */
  async function removeVariant(id) {
    const cart = findCart();
    const ids = sectionIds(cart);
    const body = {id: String(id), quantity: 0};
    if (ids.length) { body.sections = ids; body.sections_url = window.location.pathname; }
    const data = await post(changeUrl(), body);
    if (cart) renderDrawer(cart, data);
    refreshCounts();
    return data;
  }

  /* A variant as an <option> or a hidden input describes it. */
  function variantFrom(control) {
    if (!control) return null;
    const source = control.tagName === 'SELECT' ? control.selectedOptions[0] : control;
    if (!source) return null;
    return {
      id: String(control.value),
      price: Number(source.dataset.price) || 0,
      compare: Number(source.dataset.compare) || 0,
      available: source.dataset.available !== 'false',
    };
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
      try { await addLines(items, {discountCode, source: this.localName}); }
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
      this.syncStorelib();
    }
    /* A bundle the store made under Products > Upsells and bundles with exactly
       these products is the one checkout takes off: show its saving and tag
       the lines with its id. */
    async syncStorelib() {
      const productId = this.dataset.productId;
      if (!productId || this.dataset.storelibSync === 'off') return;
      const data = await readOffers(`/api/offers/bundles?product=${encodeURIComponent(productId)}`);
      if (!this.isConnected || !data || !Array.isArray(data.bundles)) return;
      const mine = this.lines.map(l => String(l.dataset.productId)).sort().join(',');
      const match = data.bundles.find(b => Array.isArray(b.items) && b.items.map(i => String(i.id)).sort().join(',') === mine);
      if (!match) return;
      const full = Number(match.fullCents) || 0; const price = Number(match.priceCents) || 0;
      this.offer = {
        id: String(match.offerId || ''),
        type: match.discountType === 'amount' ? 'amount' : 'percent',
        value: Number(match.discountValue) || 0,
        /* An amount off each set, in cents, as the store priced the set. */
        amountCents: full > price ? full - price : 0,
      };
      this.dataset.offerId = this.offer.id;
      this.toggleAttribute('data-storelib-offer', true);
      const note = this.querySelector('[data-offer-note]');
      if (note) note.hidden = false;
      this.update();
    }
    onVariant(id) {
      const select = this.querySelector('[data-main-line] select[data-line-variant]');
      if (select && [...select.options].some(o => o.value === id) && select.value !== id) select.value = id;
      this.update();
    }
    variantOf(line) { return variantFrom(line.querySelector('[data-line-variant]')); }
    saving(total, count) {
      if (this.offer) {
        /* Storelib takes a percent off each item, or an amount off each set. */
        if (this.offer.type === 'amount') return Math.min(total, this.offer.amountCents);
        return Math.round(total * Math.min(100, Math.max(0, this.offer.value)) / 100);
      }
      const percent = Math.min(90, Math.max(0, Number(this.dataset.discount) || 0));
      return Math.round(total * percent / 100);
    }
    update() {
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
      const saving = complete ? this.saving(total, count) : 0;
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
      const countEl = this.querySelector('[data-count]');
      if (countEl) countEl.textContent = String(count);
      this.complete = complete;
      this.shownSaving = saving;
      if (this.button) this.button.disabled = count === 0;
    }
    submit() {
      const group = groupId('bundle');
      const lines = this.lines.filter(line => {
        const variant = this.variantOf(line);
        return variant && variant.available && line.querySelector('[data-line-check]')?.checked;
      });
      if (!lines.length) return;
      const items = lines.map(line => {
        const variant = this.variantOf(line);
        const properties = this.complete ? {
          _sl_offer: 'bundle',
          _sl_offer_id: this.offer?.id || '',
          _sl_group: group,
          _sl_block: this.dataset.blockId || '',
          _sl_source: this.dataset.productId || '',
          _sl_discount: this.offer ? `${this.offer.type}:${this.offer.value}` : (Number(this.dataset.discount) > 0 ? `percent:${Number(this.dataset.discount)}` : ''),
        } : {
          _sl_offer: 'bundle_partial',
          _sl_group: group,
          _sl_block: this.dataset.blockId || '',
          _sl_source: this.dataset.productId || '',
        };
        return {id: variant.id, quantity: 1, properties};
      });
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
      this.syncStorelib();
    }
    /* Quantity breaks the store set up in Storelib, when the platform lists
       them (docs/upsells-storelib.md, GET /api/offers/quantity-breaks). A tier
       with the same paid and free quantity shows the store's saving. */
    async syncStorelib() {
      const productId = this.dataset.productId;
      if (!productId || this.dataset.storelibSync === 'off') return;
      const data = await readOffers(`/api/offers/quantity-breaks?product=${encodeURIComponent(productId)}`);
      if (!this.isConnected || !data || !Array.isArray(data.offers) || !data.offers.length) return;
      const offer = data.offers[0];
      let matched = false;
      this.radios.forEach(radio => {
        const paid = this.paidOf(radio); const free = this.freeOf(radio);
        const tier = (offer.tiers || []).find(t => Number(t.quantity) === paid && (Number(t.freeQuantity) || 0) === free);
        if (!tier) return;
        matched = true;
        radio.dataset.offerId = String(offer.offerId || '');
        if (tier.discountType === 'percent') radio.dataset.discount = String(Number(tier.discountValue) || 0);
        else if (tier.discountType === 'amount') { radio.dataset.discount = '0'; radio.dataset.amount = String(Number(tier.discountValue) || 0); }
        else if (tier.discountType === 'free' || tier.discountType == null) radio.dataset.discount = '0';
      });
      if (matched) {
        this.toggleAttribute('data-storelib-offer', true);
        const note = this.querySelector('[data-offer-note]');
        if (note) note.hidden = false;
        this.update();
        this.syncForm();
      }
    }
    onVariant(id) { this.selected = id; this.update(); }
    variant() {
      return this.variants.find(v => String(v.id) === this.selected) || this.variants.find(v => v.available) || this.variants[0] || null;
    }
    tier() { return this.radios.find(r => r.checked) || this.radios[0] || null; }
    paidOf(radio) { return Math.max(1, parseInt(radio.dataset.paid || radio.value, 10) || 1); }
    freeOf(radio) { return Math.max(0, parseInt(radio.dataset.free || '0', 10) || 0); }
    unitsOf(radio) { return this.paidOf(radio) + this.freeOf(radio); }
    /* What a tier costs for this variant: paid units at the tier's price, free units at nothing. */
    priceOf(radio, variant) {
      const paid = this.paidOf(radio); const free = this.freeOf(radio); const units = paid + free;
      const percent = Math.min(90, Math.max(0, Number(radio.dataset.discount) || 0));
      const amount = Math.max(0, Number(radio.dataset.amount) || 0);
      const eachPaid = Math.round(variant.price * (100 - percent) / 100);
      const total = Math.max(0, eachPaid * paid - amount);
      const plain = percent === 0 && free === 0 && amount === 0;
      const compareEach = plain ? Math.max(variant.price, variant.compare || 0) : variant.price;
      const compare = compareEach * units;
      return {paid, free, units, percent, total, each: Math.round(total / units), compare, saving: Math.max(0, compare - total)};
    }
    update() {
      const variant = this.variant();
      if (!variant) return;
      const showCompare = this.dataset.showCompare === 'true';
      this.radios.forEach(radio => {
        const p = this.priceOf(radio, variant);
        const card = radio.closest('.po-tier');
        const total = card.querySelector('[data-tier-total]');
        const compare = card.querySelector('[data-tier-compare]');
        const eachEl = card.querySelector('[data-tier-each]');
        const save = card.querySelector('[data-tier-saving]');
        if (total) total.textContent = money(p.total, this.format);
        if (eachEl) eachEl.textContent = money(p.each, this.format);
        if (compare) {
          const show = showCompare && p.compare > p.total;
          compare.hidden = !show;
          compare.textContent = show ? money(p.compare, this.format) : '';
        }
        if (save) {
          save.hidden = !(p.saving > 0);
          const amount = save.querySelector('[data-tier-saving-amount]');
          if (amount) amount.textContent = money(p.saving, this.format);
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
    propertiesOf(radio, group) {
      const variant = this.variant();
      if (!variant) return {};
      const p = this.priceOf(radio, variant);
      if (p.units === 1 && p.percent === 0 && !Number(radio.dataset.amount)) return {};
      return {
        _sl_offer: 'quantity_break',
        _sl_offer_id: radio.dataset.offerId || '',
        _sl_group: group,
        _sl_block: this.dataset.blockId || '',
        _sl_source: this.dataset.productId || '',
        _sl_tier: String(this.radios.indexOf(radio) + 1),
        _sl_paid_qty: String(p.paid),
        _sl_free_qty: String(p.free),
        _sl_discount: Number(radio.dataset.amount) ? `amount:${radio.dataset.amount}` : (p.percent ? `percent:${p.percent}` : (p.free ? 'free' : '')),
      };
    }
    /* The tier sets the product form's quantity, so the main Add to cart and
       Buy now use it too, and puts the tier's properties in the form. A form
       without a quantity field gets a hidden one. */
    syncForm() {
      if (this.dataset.syncForm !== 'true') return;
      const form = this.form();
      const tier = this.tier();
      if (!form || !tier) return;
      const qty = String(this.unitsOf(tier));
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
      form.querySelectorAll('input[data-quantity-offer-property]').forEach(el => el.remove());
      Object.entries(this.propertiesOf(tier, groupId('qty'))).forEach(([key, value]) => {
        if (value === '') return;
        const hidden = document.createElement('input');
        hidden.type = 'hidden'; hidden.name = `properties[${key}]`; hidden.value = value;
        hidden.dataset.quantityOfferProperty = '';
        form.appendChild(hidden);
      });
    }
    submit() {
      const variant = this.variant();
      const tier = this.tier();
      if (!variant || !variant.available || !tier) return;
      this.run([{id: String(variant.id), quantity: this.unitsOf(tier), properties: this.propertiesOf(tier, groupId('qty'))}], tier.dataset.discountCode || '');
    }
  }

  /* Upsell Pro: an Add button on each card, or tick cards and add them together. */
  class UpsellPro extends HTMLElement {
    connectedCallback() {
      this.events?.abort();
      this.events = new AbortController();
      const signal = this.events.signal;
      this.format = this.dataset.moneyFormat || '';
      this.cards = [...this.querySelectorAll('[data-upsell-card]')];
      this.addedVariants ||= new Set();
      try {
        const variants = JSON.parse(this.querySelector('[data-upsell-cart-variants]')?.textContent || '[]');
        if (Array.isArray(variants)) variants.forEach(id => this.addedVariants.add(String(id)));
      } catch (_) {}
      this.addEventListener('change', event => {
        const card = event.target.closest('[data-upsell-card]');
        if (!card) return;
        if (event.target.matches('[data-upsell-variant]')) this.applyVariant(card);
        this.updateTotal();
      }, {signal});
      this.addEventListener('click', event => {
        const button = event.target.closest('[data-upsell-add]');
        if (button && this.contains(button)) { event.preventDefault(); this.addOne(button.closest('[data-upsell-card]'), button); return; }
        const all = event.target.closest('[data-upsell-add-selected]');
        if (all && this.contains(all)) { event.preventDefault(); this.addSelected(all); }
      }, {signal});
      this.cards.forEach(card => this.applyVariant(card));
      document.addEventListener('cart:updated', event => {
        const items = event.detail?.cart?.items;
        if (!Array.isArray(items)) return;
        this.addedVariants = new Set(items.map(item => String(item.variant_id || item.id)));
        this.cards.forEach(card => this.applyVariant(card));
        this.updateTotal();
      }, {signal});
      this.updateTotal();
    }
    disconnectedCallback() { this.events?.abort(); }
    applyVariant(card) {
      const control = card.querySelector('[data-upsell-variant]');
      const variant = variantFrom(control);
      if (!variant) return;
      card.dataset.variantId = variant.id;
      card.dataset.price = String(variant.price);
      card.toggleAttribute('data-unavailable', !variant.available);
      const price = card.querySelector('[data-upsell-price]');
      const compare = card.querySelector('[data-upsell-compare]');
      const badge = card.querySelector('[data-upsell-sale]');
      if (price) price.textContent = money(variant.price, this.format);
      const onSale = variant.compare > variant.price;
      if (compare) { compare.hidden = !(onSale && this.dataset.showCompare === 'true'); compare.textContent = onSale ? money(variant.compare, this.format) : ''; }
      if (badge) badge.hidden = !onSale;
      const button = card.querySelector('[data-upsell-add]');
      if (button) {
        const added = this.addedVariants.has(String(variant.id));
        card.classList.toggle('is-added', added);
        button.setAttribute('aria-pressed', String(added));
        button.disabled = !variant.available || card.classList.contains('is-loading');
        const label = button.querySelector('[data-label]') || button;
        label.textContent = variant.available ? (added ? this.dataset.addedText || 'Added' : this.dataset.buttonText || label.textContent) : (this.dataset.soldoutText || label.textContent);
      }
      const check = card.querySelector('[data-upsell-check]');
      if (check) { check.disabled = !variant.available; if (!variant.available) check.checked = false; }
    }
    selectedCards() {
      return this.cards.filter(card => card.querySelector('[data-upsell-check]')?.checked && !card.hasAttribute('data-unavailable') && card.dataset.variantId);
    }
    updateTotal() {
      const picked = this.selectedCards();
      const total = picked.reduce((sum, card) => sum + (Number(card.dataset.price) || 0), 0);
      const totalEl = this.querySelector('[data-upsell-total]');
      if (totalEl) totalEl.textContent = money(total, this.format);
      const countEl = this.querySelector('[data-upsell-count]');
      if (countEl) countEl.textContent = String(picked.length);
      const all = this.querySelector('[data-upsell-add-selected]');
      if (all) {
        all.disabled = picked.length === 0 || all.getAttribute('aria-busy') === 'true';
        const added = picked.length > 0 && picked.every(card => this.addedVariants.has(String(card.dataset.variantId)));
        all.dataset.added = String(added);
        const label = all.querySelector('[data-label]') || all.querySelector('span');
        if (label) {
          this.selectedLabel ||= label.textContent;
          label.textContent = added ? this.dataset.addedText || 'Added' : this.selectedLabel;
        }
      }
      this.cards.forEach(card => card.toggleAttribute('data-picked', !!card.querySelector('[data-upsell-check]')?.checked));
    }
    lineOf(card, group) {
      return {id: card.dataset.variantId, quantity: 1, properties: {
        _sl_offer: 'upsell', _sl_group: group, _sl_block: this.dataset.blockId || '', _sl_source: this.dataset.productId || '',
      }};
    }
    async addOne(card, button) {
      if (!card || card.classList.contains('is-loading') || card.hasAttribute('data-unavailable') || !card.dataset.variantId) return;
      const label = button.querySelector('[data-label]') || button;
      const text = this.dataset.buttonText || label.textContent;
      const variantId = String(card.dataset.variantId);
      card.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
      button.disabled = true;
      try {
        await addLines([this.lineOf(card, groupId('upsell'))], {open: this.dataset.openDrawer === 'true', source: 'upsell-pro'});
        this.addedVariants.add(variantId);
        this.applyVariant(card);
      } catch (error) {
        label.textContent = error.userMessage || this.dataset.errorText || text;
      } finally {
        card.classList.remove('is-loading');
        button.removeAttribute('aria-busy');
        button.disabled = card.hasAttribute('data-unavailable');
      }
    }
    async addSelected(button) {
      const picked = this.selectedCards();
      if (!picked.length || button.getAttribute('aria-busy') === 'true') return;
      const message = this.querySelector('[data-message]');
      if (message) { message.hidden = true; message.textContent = ''; }
      button.setAttribute('aria-busy', 'true');
      button.classList.add('loading');
      button.disabled = true;
      const group = groupId('upsell');
      const lines = picked.map(card => this.lineOf(card, group));
      try {
        await addLines(lines, {open: this.dataset.openDrawer === 'true', source: 'upsell-pro'});
        lines.forEach(line => this.addedVariants.add(String(line.id)));
        this.cards.forEach(card => this.applyVariant(card));
        if (message) { message.textContent = this.dataset.addedText || 'Added'; message.hidden = false; message.dataset.tone = 'success'; }
      } catch (error) {
        if (message) { message.textContent = error.userMessage || this.dataset.errorText || ''; message.hidden = !message.textContent; message.dataset.tone = 'error'; }
      } finally {
        button.removeAttribute('aria-busy');
        button.classList.remove('loading');
        this.updateTotal();
      }
    }
  }

  /* Pair with: each card adds its chosen option, a second press takes it out. */
  class PairWith extends HTMLElement {
    connectedCallback() {
      this.events?.abort();
      this.events = new AbortController();
      const signal = this.events.signal;
      this.format = this.dataset.moneyFormat || '';
      this.addEventListener('change', event => {
        if (event.target.matches('[data-variant-select]')) this.applyVariant(event.target.closest('.pw-card'));
      }, {signal});
      this.addEventListener('click', event => {
        const button = event.target.closest('[data-add-btn]');
        if (button && this.contains(button)) this.toggle(button.closest('.pw-card'), button);
      }, {signal});
      this.cards = [...this.querySelectorAll('.pw-card')];
      this.cards.forEach(card => this.applyVariant(card));
      fetch('/cart.js', {headers: {Accept: 'application/json'}}).then(r => r.json()).then(cart => {
        const inCart = new Set((cart.items || []).map(i => String(i.variant_id || i.id)));
        this.cards.forEach(card => this.mark(card, inCart.has(String(card.dataset.variantId))));
      }).catch(() => {});
    }
    disconnectedCallback() { this.events?.abort(); }
    applyVariant(card) {
      if (!card) return;
      const variant = variantFrom(card.querySelector('[data-variant-select]'));
      if (!variant) return;
      card.dataset.variantId = variant.id;
      const price = card.querySelector('.pw-price [data-price]');
      const compare = card.querySelector('.pw-price [data-compare]');
      if (price) price.textContent = money(variant.price, this.format);
      if (compare) { compare.hidden = !(variant.compare > variant.price); compare.textContent = variant.compare > variant.price ? money(variant.compare, this.format) : ''; }
      const button = card.querySelector('[data-add-btn]');
      if (button) button.disabled = !variant.available;
      this.mark(card, false);
    }
    mark(card, added) {
      const button = card.querySelector('[data-add-btn]');
      if (!button) return;
      button.classList.toggle('is-added', added);
      button.setAttribute('aria-pressed', added ? 'true' : 'false');
      button.textContent = added ? (this.dataset.addedText || button.textContent) : (this.dataset.buttonText || button.textContent);
    }
    async toggle(card, button) {
      if (!card || !card.dataset.variantId || button.getAttribute('aria-busy') === 'true') return;
      button.setAttribute('aria-busy', 'true');
      try {
        if (button.classList.contains('is-added')) { await removeVariant(card.dataset.variantId); this.mark(card, false); }
        else {
          await addLines([{id: card.dataset.variantId, quantity: 1, properties: {_sl_offer: 'pair', _sl_group: groupId('pair'), _sl_block: this.dataset.blockId || '', _sl_source: this.dataset.productId || ''}}], {open: this.dataset.openDrawer === 'true', source: 'pair-with'});
          this.mark(card, true);
        }
      } catch (_) {
        button.classList.add('is-error');
        setTimeout(() => button.classList.remove('is-error'), reduceMotion() ? 0 : 700);
      } finally { button.removeAttribute('aria-busy'); }
    }
  }

  window.MateriaProductOffers = {addLines, removeVariant, money};
  if (!customElements.get('product-bundle')) customElements.define('product-bundle', ProductBundle);
  if (!customElements.get('quantity-offer')) customElements.define('quantity-offer', QuantityOffer);
  if (!customElements.get('upsell-pro')) customElements.define('upsell-pro', UpsellPro);
  if (!customElements.get('pair-with')) customElements.define('pair-with', PairWith);
})();
