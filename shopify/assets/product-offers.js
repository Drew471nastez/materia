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
      try { const text=document.createElement('textarea');text.innerHTML=window.Shopify.formatMoney(value, format || window.cartStrings?.money_format);return text.value; } catch (_) {}
    }
    // Storelib/Shopify formats hundredths, including zero-decimal currencies.
    // Never guess a currency or perform another conversion here.
    return '';
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

  // One theme-owned label/spinner contract for legacy and Storelib offers.
  function actionLabel(button, addedText = 'Added') {
    let label = button.querySelector('[data-label], .po-button__text');
    if (!label) {
      label = document.createElement('span'); label.dataset.label = '';
      while (button.firstChild) label.append(button.firstChild);
      button.append(label);
    }
    button.classList.add('offer-action'); label.classList.add('hidden-on-load');
    button.dataset.idleLabel ||= label.textContent;
    if (!button.querySelector('.offer-action__sizer')) {
      const sizer = document.createElement('span'); sizer.className = 'offer-action__sizer';
      sizer.setAttribute('aria-hidden', 'true');
      for (const text of [button.dataset.idleLabel, addedText]) { const size = document.createElement('span'); size.dataset.labelSize = text; sizer.append(size); }
      button.append(sizer);
      const spinner = document.createElement('span'); spinner.className = 'icon-load';
      spinner.setAttribute('aria-hidden', 'true'); button.append(spinner);
    }
    return label;
  }
  function actionBusy(button, busy, addedText) {
    actionLabel(button, addedText);
    button.classList.toggle('loading', busy);
    if (busy) { button.setAttribute('aria-busy', 'true'); button.disabled = true; }
    else { button.removeAttribute('aria-busy'); button.disabled = false; }
  }
  const selectReady = select => !!select?.value && !!select.selectedOptions[0] && !select.selectedOptions[0].disabled;
  const selectionKey = items => JSON.stringify(items.map(i => [String(i.id), Number(i.quantity)||1]).sort((a,b)=>a[0].localeCompare(b[0])));

  async function post(url, body) {
    const response = await fetch(url, {method: 'POST', headers: jsonHeaders, body: JSON.stringify(body), credentials: 'same-origin'});
    let data = null;
    try { data = await response.json(); } catch (_) {}
    if (!response.ok || (data && data.status && Number(data.status) >= 400)) {
      const message = (data && (data.message || data.description || (typeof data.errors === 'string' && data.errors))) || '';
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
    const cached = offerCache.get(url);
    if (!cached || cached.expires <= Date.now()) {
      offerCache.set(url, {expires:Date.now()+60000, value:fetch(url, {headers: {Accept: 'application/json'}, credentials: 'same-origin'})
        .then(r => (r.ok ? r.json() : null)).catch(() => null)});
    }
    return offerCache.get(url).value;
  }

  function renderDrawer(cart, data) {
    if (!cart || !data || !data.sections) return false;
    let rendered = false;
    sectionIds(cart).forEach(id => {
      const target = document.getElementById(id);
      const markup = data.sections[id];
      if (!target || !markup) return;
      const html = new DOMParser().parseFromString(markup, 'text/html');
      const incoming = html.querySelector('#minicart-form') || html.getElementById(id);
      if (!incoming) return;
      rendered = true;
      if (!(typeof window.materiaPatchDrawerCart === 'function' && window.materiaPatchDrawerCart(target, incoming))) target.innerHTML = incoming.innerHTML;
    });
    try { cart.cartAction?.(); } catch (_) {}
    if (rendered) cart.classList.remove('is-empty');
    return rendered;
  }

  async function refreshCounts() {
    try {
      const cart = await (await fetch('/cart.js', {headers: {Accept: 'application/json'}, cache:'no-store'})).json();
      if (cart.item_count == null) return cart;
      document.querySelectorAll('.cart-count').forEach(el => {
        el.innerHTML = el.classList.contains('cart-count-drawer') ? `(${cart.item_count})` : (cart.item_count > 100 ? '~' : cart.item_count);
        el.classList.remove('hidden');
      });
      document.querySelector('header-total-price')?.updateTotal?.(cart);
      document.querySelector('free-ship-progress-bar')?.init?.(cart.total_price);
      document.dispatchEvent(new CustomEvent('cart:updated', {detail: {source: 'product-offers', cart}}));
      return cart;
    } catch (_) { return null; }
  }

  /* Drops empty properties so a plain line stays plain. */
  function cleanItems(items) {
    return items.map(item => {
      const line = {id: String(item.id), quantity: Math.max(1, parseInt(item.quantity, 10) || 1)};
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
    const rendered = renderDrawer(cart, data);
    // Bundled sections already contain authoritative totals and cart lines.
    // Header counts must not delay the drawer or the button's confirmation.
    if (rendered && options.open !== false) { try { await cart.open?.(); } catch (_) {} }
    const counts = refreshCounts();
    if (!rendered) {
      const confirmed = await counts;
      if (confirmed?.items && typeof cart.applyCartState === 'function') await cart.applyCartState(confirmed);
    }
    /* utils.js declares publish and PUB_SUB_EVENTS as page globals. */
    if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      try { publish(PUB_SUB_EVENTS.cartUpdate, {source: options.source || 'product-offers', cartData: data}); } catch (_) {}
    }
    if (!rendered && options.open !== false) { try { await cart.open?.(); } catch (_) {} }
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

  async function personalization(form) {
    if (!form) return {};
    if (!form.reportValidity()) throw new Error('Complete the required product fields.');
    const properties = {};
    for (const [name, value] of new FormData(form)) {
      const match = name.match(/^properties\[(.+)\]$/);
      if (!match) continue;
      if (value instanceof File) {
        if (!value.size) continue;
        const body = new FormData(); body.append('file', value);
        const response = await fetch('/cart/upload', {method:'POST',credentials:'same-origin',body});
        const result = await response.json();
        if (!response.ok || !result.upload?.value) throw new Error(result.message || result.description || 'Unable to upload this image.');
        properties[match[1]] = result.upload.value;
      } else if (value !== '') properties[match[1]] = value;
    }
    return properties;
  }

  class OfferBase extends HTMLElement {
    connectedCallback() {
      this.events?.abort();
      this.events = new AbortController();
      this.format = this.dataset.moneyFormat || '';
      this.button = this.querySelector('[data-offer-add]');
      this.message = this.querySelector('[data-message]');
      this.addedText = this.dataset.addedText || 'Added';
      if (this.button) actionLabel(this.button, this.addedText);
      this.addEventListener('change', () => {
        this.selectionVersion = (this.selectionVersion || 0) + 1;
        if (this.button) { this.button.dataset.added = 'false'; actionLabel(this.button, this.addedText).textContent = this.button.dataset.idleLabel; }
        this.say('');
      }, {signal:this.events.signal});
      this.button?.addEventListener('click', () => this.submit(), {signal: this.events.signal});
      document.addEventListener('cart:updated', event => {
        const items = event.detail?.cart?.items;
        if (!Array.isArray(items) || !this._addedItems || this.button?.dataset.added !== 'true') return;
        const present = this._addedItems.every(line => items.filter(item => String(item.variant_id || item.id) === String(line.id)).reduce((n,item) => n + Number(item.quantity || 0), 0) >= line.quantity);
        if (!present) { this.button.dataset.added = 'false'; actionLabel(this.button,this.addedText).textContent = this.button.dataset.idleLabel; this.say(''); }
      }, {signal:this.events.signal});
      document.addEventListener('change', event => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement || input instanceof HTMLSelectElement) || input.name !== 'id') return;
        const form = input.form || input.closest('form');
        /* form.id would be the form's own name="id" input, so read the attribute. */
        if (form && form.getAttribute('id') === this.dataset.formId) { this.selectionVersion = (this.selectionVersion || 0) + 1; if (this.button) { this.button.dataset.added='false'; actionLabel(this.button,this.addedText).textContent=this.button.dataset.idleLabel; } this.onVariant(String(input.value)); }
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
      this.message.classList.toggle('visually-hidden', tone === 'success');
    }
    async run(items, discountCode) {
      if (!this.button || this.button.getAttribute('aria-busy') === 'true') return;
      this.say('');
      const version = this.selectionVersion || 0;
      actionBusy(this.button, true, this.addedText);
      try {
        const properties = await personalization(this.form());
        if (items[0]) items[0].properties = {...properties,...items[0].properties};
        await addLines(items, {discountCode, source: this.localName});
        if ((this.selectionVersion || 0) === version) {
          this._addedItems = items.map(item => ({id:String(item.id),quantity:item.quantity}));
          this.button.dataset.added = 'true';
          actionLabel(this.button, this.addedText).textContent = this.addedText;
          this.say(this.addedText, 'success');
        }
      }
      catch (error) { this.say(error.userMessage || error.message || this.dataset.error || window.cartStrings?.error || '', 'error'); }
      finally { actionBusy(this.button, false, this.addedText); this.update(); }
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
      const data = await readOffers(`/api/offers?product=${encodeURIComponent(productId)}`);
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
        fullCents: full,
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
        if (this.dataset.currency && this.dataset.storeCurrency && this.dataset.currency!==this.dataset.storeCurrency) return 0;
        return total === this.offer.fullCents ? this.offer.amountCents : 0;
      }
      // Block settings are presentation, not a discount authorization.
      return 0;
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
      if (this.button) this.button.disabled = count === 0 || this.button.getAttribute('aria-busy') === 'true';
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
       them (docs/upsells-storelib.md, GET /api/offers?product=<id>). A tier
       with the same paid and free quantity shows the store's saving. */
    async syncStorelib() {
      const productId = this.dataset.productId;
      if (!productId || this.dataset.storelibSync === 'off') return;
      const data = await readOffers(`/api/offers?product=${encodeURIComponent(productId)}`);
      if (!this.isConnected || !data || !Array.isArray(data.quantityBreaks) || !data.quantityBreaks.length) return;
      const offer = data.quantityBreaks[0];
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
      const authorized = !!radio.dataset.offerId;
      const percent = authorized ? Math.min(100, Math.max(0, Number(radio.dataset.discount) || 0)) : 0;
      const amount = authorized ? Math.max(0, Number(radio.dataset.amount) || 0) : 0;
      const eachPaid = Math.round(variant.price * (100 - percent) / 100);
      const total = authorized ? Math.max(0, eachPaid * paid - amount) : variant.price * units;
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
        this.button.disabled = !variant.available || this.button.getAttribute('aria-busy') === 'true';
        const text = this.button.querySelector('.po-button__text');
        if (text) {
          if (!this.label) this.label = text.textContent;
          text.textContent = variant.available ? (this.button.dataset.added === 'true' ? this.addedText : this.button.dataset.idleLabel || this.label) : (this.dataset.soldOut || this.label);
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
      this.querySelectorAll('[data-upsell-add], [data-upsell-add-selected]').forEach(button => actionLabel(button, this.dataset.addedText || 'Added'));
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
        label.textContent = variant.available ? (added ? this.dataset.addedText || 'Added' : this.dataset.buttonText || button.dataset.idleLabel) : (this.dataset.soldoutText || button.dataset.idleLabel);
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
      card.querySelector('[data-action-error]')?.remove();
      const variantId = String(card.dataset.variantId);
      card.classList.add('is-loading');
      actionBusy(button, true, this.dataset.addedText || 'Added');
      try {
        await addLines([this.lineOf(card, groupId('upsell'))], {open: this.dataset.openDrawer === 'true', source: 'upsell-pro'});
        this.addedVariants.add(variantId);
        this.applyVariant(card);
      } catch (error) {
        let message = card.querySelector('[data-action-error]');
        if (!message) { message = document.createElement('p'); message.dataset.actionError = ''; message.className = 'upsell-pro__message'; message.setAttribute('role','alert'); card.append(message); }
        message.textContent = error.userMessage || this.dataset.errorText || error.message || text;
      } finally {
        card.classList.remove('is-loading');
        actionBusy(button, false, this.dataset.addedText || 'Added');
        button.disabled = card.hasAttribute('data-unavailable');
      }
    }
    async addSelected(button) {
      const picked = this.selectedCards();
      if (!picked.length || button.getAttribute('aria-busy') === 'true') return;
      const message = this.querySelector('[data-message]');
      if (message) { message.hidden = true; message.textContent = ''; }
      actionBusy(button, true, this.dataset.addedText || 'Added');
      const group = groupId('upsell');
      const lines = picked.map(card => this.lineOf(card, group));
      try {
        await addLines(lines, {open: this.dataset.openDrawer === 'true', source: 'upsell-pro'});
        lines.forEach(line => this.addedVariants.add(String(line.id)));
        this.cards.forEach(card => this.applyVariant(card));
        if (message) { message.textContent = this.dataset.addedText || 'Added'; message.hidden = false; message.dataset.tone = 'success'; message.classList.add('visually-hidden'); }
      } catch (error) {
        if (message) { message.textContent = error.userMessage || this.dataset.errorText || ''; message.hidden = !message.textContent; message.dataset.tone = 'error'; message.classList.remove('visually-hidden'); }
      } finally {
        actionBusy(button, false, this.dataset.addedText || 'Added');
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
      const label = actionLabel(button, this.dataset.addedText || 'Added');
      label.textContent = added ? (this.dataset.addedText || 'Added') : (this.dataset.buttonText || button.dataset.idleLabel);
    }
    async toggle(card, button) {
      if (!card || !card.dataset.variantId || button.getAttribute('aria-busy') === 'true') return;
      actionBusy(button, true, this.dataset.addedText || 'Added');
      try {
        if (button.classList.contains('is-added')) { await removeVariant(card.dataset.variantId); this.mark(card, false); }
        else {
          await addLines([{id: card.dataset.variantId, quantity: 1, properties: {_sl_offer: 'pair', _sl_group: groupId('pair'), _sl_block: this.dataset.blockId || '', _sl_source: this.dataset.productId || ''}}], {open: this.dataset.openDrawer === 'true', source: 'pair-with'});
          this.mark(card, true);
        }
      } catch (_) {
        button.classList.add('is-error');
        setTimeout(() => button.classList.remove('is-error'), reduceMotion() ? 0 : 700);
      } finally { actionBusy(button, false, this.dataset.addedText || 'Added'); button.disabled = variantFrom(card.querySelector('[data-variant-select]'))?.available === false; }
    }
  }

  const node = (tag, cls, text) => {
    const el = document.createElement(tag); if (cls) el.className = cls;
    if (text != null) el.textContent = String(text); return el;
  };
  const parse = value => { try { return JSON.parse(value || 'null'); } catch (_) { return null; } };
  let nativeOfferSequence=0;
  const tierPrice = (tier, variant) => {
    const paid = Math.max(1, Number(tier.quantity) || 1), free = Math.max(0, Number(tier.freeQuantity) || 0);
    const percent = tier.discountType === 'percent' ? Math.min(100, Math.max(0, Number(tier.discountValue) || 0)) : 0;
    const amount = tier.discountType === 'amount' ? Math.max(0, Number(tier.discountValue) || 0) : 0;
    const total = Math.max(0, Math.round(variant.price * (100-percent) / 100) * paid - amount);
    const plain = !free && !percent && !amount;
    const compare = (plain ? Math.max(variant.price, variant.compare || 0) : variant.price) * (paid+free);
    return {total,compare,quantity:paid+free,each:Math.round(total/(paid+free))};
  };
  class StorelibProductOffers extends HTMLElement {
    connectedCallback() {
      this.events?.abort(); this.events = new AbortController();
      this.instance ||= ++nativeOfferSequence;
      this.options = parse(this.dataset.options) || {};
      Object.keys(this.options).forEach(key=>{if(typeof this.options[key]==='string'){const text=document.createElement('textarea');text.innerHTML=this.options[key];this.options[key]=text.value;}});
      this.variants = (parse(this.dataset.variants) || []).map(v => ({id:String(v.id),price:Number(v.price ?? v.priceCents)||0,compare:Number(v.compare_at_price)||0,available:v.available!==false,title:v.title||v.name||''}));
      this.selected = this.dataset.selected;
      this.market = !!this.dataset.currency && !!this.dataset.storeCurrency && this.dataset.currency !== this.dataset.storeCurrency;
      const signal=this.events.signal;
      document.addEventListener('change',e=>{
        if (e.target.name==='id' && e.target.form?.getAttribute('id')===this.dataset.formId) { this.selected=String(e.target.value); this.paintPrices(); }
      },{signal});
      document.addEventListener('cart:updated',e=>{
        if (!Array.isArray(e.detail?.cart?.items)) return;
        this.cartRevision = (this.cartRevision || 0) + 1;
        this.confirmedCart=e.detail.cart;
        this.paintButtons();
        this.dataset.cartProductQuantity=String(e.detail.cart.items.filter(i=>String(i.product_id)===this.dataset.productId).reduce((n,i)=>n+Number(i.quantity||0),0));
      },{signal});
      const payload=parse(this.dataset.offers);
      if (payload && typeof payload==='object') this.draw(payload);
      else readOffers('/api/offers?product='+encodeURIComponent(this.dataset.productId)).then(data=>{if(this.isConnected && !signal.aborted && data)this.draw(data);});
    }
    disconnectedCallback(){
      this.events?.abort();
      this.form()?.querySelectorAll('[data-native-offer-owner="'+this.instance+'"]').forEach(input=>input.remove());
    }
    form(){return this.dataset.formId ? document.getElementById(this.dataset.formId) : null;}
    variant(){const id=this.form()?.querySelector('[name="id"]')?.value || this.selected;return this.variants.find(v=>v.id===String(id))||this.variants.find(v=>v.available)||this.variants[0];}
    amount(value){return money(value,this.dataset.moneyFormat);}
    draw(data){
      this.rows=[];
      const kind=this.dataset.kind, offers=kind==='quantity_offer'?data.quantityBreaks:kind==='bundle'?data.bundles:data.checkoutOffers;
      if(!Array.isArray(offers)||!offers.length)return;
      this.replaceChildren();
      this.actions=[];
      this.upsellChoices=[];
      const s=this.options;
      const box=node('div',kind==='upsell_pro'?'upsell-pro':'po po-bundle');box.dataset.style=s.style||'cards';
      const numeric=kind==='upsell_pro'?{padding_top:'--up-pt',padding_bottom:'--up-pb',gap:'--up-gap',image_size_px:'--up-img',heading_size:'--up-heading-size',heading_gap:'--up-heading-gap'}:{padding_top:'--po-pad-top',padding_bottom:'--po-pad-bottom'};
      Object.entries(numeric).forEach(([key,token])=>{if(s[key]!=null && Number.isFinite(Number(s[key])))box.style.setProperty(token,Math.max(0,Number(s[key]))+'px');});
      if(s.accent_color)box.style.setProperty('--po-accent',s.accent_color);
      if(s.custom_style){
        box.dataset.customStyle='';
        if(s.show_border)box.dataset.border='';if(s.show_shadow)box.dataset.shadow='';
        const tokens=kind==='upsell_pro'?{bg_color:'--up-bg',text_color:'--up-text',card_bg:'--up-card-bg',border_color:'--up-border',button_bg:'--up-btn-bg',button_text_color:'--up-btn-ink'}:{custom_bg:'--po-c-bg',custom_text:'--po-c-text',custom_heading:'--po-c-heading',custom_border:'--po-c-border',custom_selected:'--po-c-selected',custom_save:'--po-c-save',custom_badge_bg:'--po-c-badge-bg',custom_badge_text:'--po-c-badge-text'};
        Object.entries(tokens).forEach(([key,token])=>{if(s[key])box.style.setProperty(token,s[key]);});
        const dimensions=kind==='upsell_pro'?{card_radius:'--up-card-radius',button_radius:'--up-btn-radius'}:{custom_radius:'--po-c-radius',custom_gap:'--po-c-gap',custom_border_width:'--po-c-bw'};
        Object.entries(dimensions).forEach(([key,token])=>{if(s[key]!=null && Number.isFinite(Number(s[key])))box.style.setProperty(token,Math.max(0,Number(s[key]))+'px');});
      }
      if(s.caption)box.append(node('p','po-caption',s.caption));
      box.append(node('h3',kind==='upsell_pro'?'upsell-pro__heading':'po-heading h5',s.heading||offers[0].title||''));
      if(s.text||s.subheading)box.append(node('p',kind==='upsell_pro'?'upsell-pro__sub':'po-text',s.text||s.subheading));this.append(box);
      this.box=box;
      if(kind==='quantity_offer')this.quantity(offers[0]);
      else if(kind==='bundle')offers.forEach(offer=>this.bundle(offer));
      else {
        offers.slice(0,Number(s.max_products)||3).forEach(offer=>this.upsell(offer));
        if(s.add_mode==='selected'){
          const footer=node('div','upsell-pro__footer');box.append(footer);
          this.button(footer,s.add_selected_label||'Add chosen items',()=>this.upsellChoices.filter(c=>c.check.checked && selectReady(c.select)).map(c=>({id:c.select.value,quantity:1,properties:{_sl_offer_id:c.offer.offerId,_sl_offer:'upsell'}})));
        }
      }
      this.paintPrices();
    }
    button(parent,label,action){
      const button=node('button','btn btn-primary po-button');const text=node('span','po-button__text hidden-on-load',label);button.append(text);button.type='button';button.dataset.themeButton='primary';button.dataset.slButton='';button.dataset.buttonRole='primary';
      actionLabel(button, this.options.added_text || 'Added');
      this.actions ||= [];this.actions.push({button,text,label,action});
      const status=node('p','po-message');status.setAttribute('role','status');
      parent.append(button,status);
      button.addEventListener('click',async()=>{
        if(button.getAttribute('aria-busy')==='true')return;
        actionBusy(button,true,this.options.added_text || 'Added');status.textContent='';status.classList.remove('visually-hidden');
        try{
          const lines=action();if(!lines?.length)return;
          const props=await personalization(this.form());
          const own=lines.find(line=>this.variants.some(v=>v.id===String(line.id)));
          if(own)own.properties={...props,...own.properties};
          await addLines(lines,{open:this.dataset.kind==='upsell_pro'?safelyOpen(this.options):true,source:'storelib-offers'});
          button._addedSelection=selectionKey(lines);button._addedRevision=this.cartRevision || 0;button.dataset.added='true';text.textContent=this.options.added_text||'Added';status.textContent=text.textContent;status.classList.add('visually-hidden');
        }catch(error){status.textContent=error.userMessage||error.message||this.options.error_text||'';}
        finally{actionBusy(button,false,this.options.added_text || 'Added');this.paintPrices();}
      },{signal:this.events.signal});return button;
    }
    paintButtons(){
      for(const entry of this.actions||[]){
        const lines=entry.action();entry.button.disabled=!lines?.length||entry.button.getAttribute('aria-busy')==='true';
        if(!this.confirmedCart || entry.button._addedRevision === (this.cartRevision || 0)){const added=lines.length>0&&entry.button._addedSelection===selectionKey(lines);entry.button.dataset.added=String(added);entry.text.textContent=added?this.options.added_text||'Added':entry.label;continue;}
        const added=lines.length>0&&lines.every(line=>this.confirmedCart.items.filter(i=>String(i.variant_id||i.id)===String(line.id)).reduce((n,i)=>n+Number(i.quantity||0),0)>=line.quantity);
        entry.button.dataset.added=String(added);entry.text.textContent=added?this.options.added_text||'Added':entry.label;
      }
    }
    quantity(offer){
      const initial=Math.max(0,Math.min((offer.tiers?.length||1)-1,(Number(this.options.default_tier)||1)-1));
      const group=node('div','po-tiers');group.setAttribute('role','radiogroup');group.setAttribute('aria-label',offer.title||this.options.heading||'Quantity');this.box.append(group);
      (offer.tiers||[]).forEach((tier,i)=>{
        const label=node('label','po-tier'),radio=node('input','po-tier__radio');radio.type='radio';radio.name='native-tier-'+this.instance;radio.checked=i===initial;radio.value=String(Number(tier.quantity)+Number(tier.freeQuantity||0));
        const card=node('span','po-tier__card'),main=node('span','po-tier__main'),prices=node('span','po-tier__prices');
        main.append(node('span','po-tier__label',tier.label||radio.value));card.append(node('span','po-tier__dot'),main,prices);
        if(tier.badge)card.append(node('span','po-tier__badge',tier.badge));
        const total=node('span','po-tier__total'),compare=node('s','po-tier__compare'),each=node('span','po-tier__each');prices.append(total,compare,each);label.append(radio,card);group.append(label);
        radio.addEventListener('change',()=>{this.chosen=tier;this.syncQuantity();this.paintButtons();},{signal:this.events.signal});
        this.rows.push({tier,total,compare,each});
      });
      this.offerId=offer.offerId;this.chosen=offer.tiers?.[initial];this.syncQuantity();
      if(!this.form())this.variantPicker(this.box);
      this.addButton=this.button(this.box,this.options.button_label||'Add to cart',()=>{
        const variant=this.variant();if(!variant?.available||!this.chosen)return [];
        return [{id:variant.id,quantity:tierPrice(this.chosen,variant).quantity,properties:{_sl_offer_id:offer.offerId,_sl_offer:'quantity_break'}}];
      });
      if((this.dataset.compact==='true' && this.form()) || this.options.show_button===false)this.addButton.hidden=true;
    }
    syncQuantity(){
      if(!this.chosen)return;
      const form=this.form();if(!form)return;
      const quantity=Number(this.chosen.quantity)+Number(this.chosen.freeQuantity||0);
      let inputs=[...form.elements].filter(el=>el.name==='quantity');
      if(!inputs.length){const input=node('input');input.type='hidden';input.name='quantity';input.dataset.nativeOfferOwner=String(this.instance);form.append(input);inputs=[input];}
      inputs.forEach(input=>{input.value=String(quantity);input.dispatchEvent(new Event('change',{bubbles:true}));});
      let offerInput=form.querySelector('[data-native-offer-id]');
      if(!offerInput){offerInput=node('input');offerInput.type='hidden';offerInput.name='properties[_sl_offer_id]';offerInput.dataset.nativeOfferId='';form.append(offerInput);}
      offerInput.dataset.nativeOfferOwner=String(this.instance);
      offerInput.value=this.offerId||'';
    }
    variantPicker(parent,variants=this.variants){
      const wrap=node('span','po-select'),select=node('select');select.setAttribute('aria-label',this.options.option_label||'Variant');
      variants.forEach(v=>{const option=node('option','',v.title||v.name||'Default');option.value=String(v.id);option.disabled=v.available===false;select.append(option);});
      const tracksProduct=variants===this.variants;
      if(tracksProduct && [...select.options].some(o=>o.value===this.selected))select.value=this.selected;
      select.addEventListener('change',()=>{if(tracksProduct){this.selected=select.value;this.paintPrices();}},{signal:this.events.signal});wrap.append(select);parent.append(wrap);return select;
    }
    paintPrices(){
      this.paintButtons();
      const variant=this.variant();if(this.addButton)this.addButton.disabled=!variant?.available || this.addButton.getAttribute('aria-busy')==='true';
      if(!variant)return;
      for(const row of this.rows||[]){
        const p=tierPrice(row.tier,variant), monetary=!this.market||(!['amount','percent'].includes(row.tier.discountType));
        row.total.textContent=monetary?this.amount(p.total):(row.tier.label||'');row.compare.hidden=!monetary||p.compare<=p.total||this.options.show_compare===false;
        row.compare.textContent=monetary?this.amount(p.compare):'';row.each.textContent=monetary?this.amount(p.each)+(this.options.per_item_label?' '+this.options.per_item_label:''):'';
      }
    }
    bundle(offer){
      const list=node('ul','po-bundle__lines');this.box.append(list);const controls=[];
      (offer.items||[]).forEach(item=>{
        const row=node('li','po-line'),label=node('label','po-line__label'),check=node('input');check.type='checkbox';check.checked=true;check.setAttribute('aria-label',item.title||'Product');
        label.append(check);this.image(label,item);label.append(node('span','po-line__title',item.title));row.append(label);list.append(row);
        const variants=(item.variants?.length?item.variants:[{id:item.id,name:item.title,priceCents:item.priceCents}]).map(v=>({...v,title:v.name,price:v.priceCents}));
        const select=this.variantPicker(row,variants);controls.push({item,check,select,initial:select.value});
      });
      const price=node('p','po-summary__amount'),compare=node('s','po-summary__compare'),label=node('p','po-note',offer.label||'');
      const paint=()=>{const exact=!this.market&&controls.every(c=>c.check.checked&&c.select.value===c.initial);price.textContent=exact?this.amount(offer.priceCents):'';compare.textContent=exact?this.amount(offer.fullCents):'';compare.hidden=!exact||offer.fullCents<=offer.priceCents||this.options.show_compare===false;this.paintButtons();};
      list.addEventListener('change',paint,{signal:this.events.signal});this.box.append(compare,price,label);paint();
      this.button(this.box,this.options.button_label||'Add bundle to cart',()=>controls.some(c=>c.check.checked && !selectReady(c.select))?[]:controls.filter(c=>c.check.checked).map(c=>({id:c.select.value,quantity:1,properties:{_sl_offer_id:offer.offerId,_sl_offer:'bundle'}})));
    }
    upsell(offer){
      const item=offer.product;if(!item)return;
      const card=node('div','upsell-card'),info=node('div','upsell-card__info');this.image(card,item);info.append(node('span','upsell-card__title',item.title),node('span','upsell-card__sub',offer.label||''));card.append(info);this.box.append(card);
      const variants=item.variants?.length?item.variants:[{id:item.id,name:item.title}];const select=this.variantPicker(info,variants);
      if(this.options.show_variant_selector===false || variants.length<2)select.parentElement.hidden=true;
      const price=node('span','upsell-card__price');price.textContent=!this.market?this.amount(offer.offerPriceCents):'';info.append(price);
      price.hidden=this.options.show_price===false;
      select.addEventListener('change',()=>{price.textContent='';this.paintButtons();},{signal:this.events.signal});
      if(this.options.add_mode==='selected'){
        const label=node('label','upsell-card__pick'),check=node('input','native-up-check');check.type='checkbox';check.disabled=!selectReady(select);check.checked=this.options.preselect!==false && !check.disabled;check.setAttribute('aria-label',item.title||'Product');label.append(check);card.prepend(label);this.upsellChoices.push({check,select,offer});
        check.addEventListener('change',()=>{card.toggleAttribute('data-picked',check.checked);this.paintButtons();},{signal:this.events.signal});card.toggleAttribute('data-picked',check.checked);
      }else this.button(card,this.options.upsell_button_text||'Add',()=>selectReady(select)?[{id:select.value,quantity:1,properties:{_sl_offer_id:offer.offerId,_sl_offer:'upsell'}}]:[]);
    }
    image(parent,item){
      if(this.options.show_images===false||this.options.show_image===false||!item.imageUrl)return;
      try{const url=new URL(item.imageUrl,location.href);if(!['http:','https:'].includes(url.protocol))return;const img=node('img','po-line__media');img.src=url.href;img.alt='';img.width=56;img.height=56;img.loading='lazy';img.decoding='async';parent.append(img);}catch(_){}
    }
  }
  const safelyOpen = options => options.open_drawer_after_add === true;
  window.MateriaProductOffers = {addLines, removeVariant, money, tierPrice};
  if (!customElements.get('storelib-product-offers')) customElements.define('storelib-product-offers',StorelibProductOffers);
  if (!customElements.get('product-bundle')) customElements.define('product-bundle', ProductBundle);
  if (!customElements.get('quantity-offer')) customElements.define('quantity-offer', QuantityOffer);
  if (!customElements.get('upsell-pro')) customElements.define('upsell-pro', UpsellPro);
  if (!customElements.get('pair-with')) customElements.define('pair-with', PairWith);
})();
