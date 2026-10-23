/* Materia Themes · inline cart variant editing.
   Add first, remove second: an out-of-stock or network error never destroys the original cart line.
   Uses the existing Shopify-compatible cart section endpoint and keeps the drawer mounted. */
(() => {
  if (window.__materiaVariantEditorLoaded) return;
  window.__materiaVariantEditorLoaded = true;
  const paths = window.routes || {};
  const base = String(paths.cart_url || '/cart').replace(/\/$/, '');
  const request = async (url, payload) => {
    const res = await fetch(url, {method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json', 'Accept':'application/json', 'X-Requested-With':'XMLHttpRequest'},
      body:JSON.stringify(payload)});
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status >= 400) throw new Error(data.description || data.message || 'Unable to update the product.');
    return data;
  };
  function renderSections(cart, sections) {
    if (!sections) return false;
    let updated = false;
    for (const [id, html] of Object.entries(sections)) {
      if (!html) continue;
      const target = document.getElementById(id);
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const fresh = parsed.getElementById(id);
      if (!target || !fresh) continue;
      // Replace only the contents: preserve the drawer custom element, its state and scroll.
      const scroller = target.closest('cart-notification')?.querySelector('.minicart-scroll');
      const oldScroll = scroller?.scrollTop ?? 0;
      // Patch rows in place when possible, so images and controls do not flash.
      if (!(typeof window.materiaPatchDrawerCart === 'function' && window.materiaPatchDrawerCart(target, fresh))) target.innerHTML = fresh.innerHTML;
      const nextScroller = target.closest('cart-notification')?.querySelector('.minicart-scroll');
      if (nextScroller) nextScroller.scrollTop = oldScroll;
      updated = true;
    }
    if (cart?.item_count != null) {
      document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = el.classList.contains('cart-count-drawer') ? ` (${cart.item_count})` : (cart.item_count > 100 ? '~' : String(cart.item_count));
      });
      document.querySelector('free-ship-progress-bar')?.init?.(cart.items_subtotal_price);
    }
    if (updated) {
      document.querySelector('cart-notification')?.cartAction?.();
      window.cdaTick?.();
      document.dispatchEvent(new CustomEvent('cart:refresh', {detail:{source:'variant-edit'}}));
    }
    return updated;
  }
  class CartVariantEditor extends HTMLElement {
    connectedCallback() {
      queueMicrotask(() => {
      if (!this.isConnected) return;
      this._events?.abort();
      this._events = new AbortController();
      this._selects = [...this.querySelectorAll('select')];
      try { this._variants = JSON.parse(this.querySelector('.cart-item__variants-json')?.textContent || '[]'); }
      catch { this._variants = []; }
      const current = this._variants.find(variant => String(variant.id) === this.dataset.currentVariant);
      if (current) this._selects.forEach((select, index) => {
        const value = current['option' + (index + 1)];
        if ([...select.options].some(option => option.value === String(value))) select.value = value;
      });
      const syncChoices = () => this.querySelectorAll('[data-option-value]').forEach(button => {
        const select = this._selects[Number(button.dataset.optionIndex)];
        button.setAttribute('aria-pressed', String(select?.value === button.dataset.optionValue));
      });
      syncChoices();
      for (const select of this._selects) select.addEventListener('change', () => { syncChoices(); this.save(); }, {signal:this._events.signal});
      this.addEventListener('click', event => {
        const button = event.target.closest('[data-option-value]');
        if (!button || this._saving) return;
        const select = this._selects[Number(button.dataset.optionIndex)];
        if (!select) return;
        select.value = button.dataset.optionValue;
        syncChoices();
        this.save();
      }, {signal:this._events.signal});
      this.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        togglePicker(this, false);
        const button = this.closest('.cart-item')?.querySelector('.cart-item__variant-edit');
        button?.setAttribute('aria-expanded', 'false');
        button?.focus({preventScroll:true});
      }, {signal:this._events.signal});
      });
    }
    disconnectedCallback() {
      this._events?.abort();
    }
    showError(message) {
      const error = this.querySelector('.cart-item__variant-error');
      if (error) { error.textContent = message; error.hidden = !message; }
    }
    findVariant() {
      const selected = this._selects.map(el => el.value);
      return this._variants.find(v => selected.every((value, index) => String(v['option'+(index+1)]) === String(value)));
    }
    async save() {
      if (this._saving) return;
      const variant = this.findVariant();
      if (!variant) { this.showError('This combination is not available.'); return; }
      if (!variant.available) { this.showError('This variant is out of stock.'); return; }
      if (String(variant.id) === this.dataset.currentVariant) { this.showError(''); return; }
      const id = this.dataset.lineKey;
      const quantity = Number(this.dataset.quantity) || 1;
      if (!id) return;
      let properties = null;
      try { properties = JSON.parse(this.dataset.properties || 'null'); } catch {}
      const body = {id:variant.id, quantity};
      if (properties && Object.keys(properties).length) body.properties = properties;
      if (this.dataset.sellingPlan) body.selling_plan = this.dataset.sellingPlan;
      const notification = this.closest('cart-notification');
      const sectionIds = notification?.getSectionsToRender?.().map(s => s.id) || ['minicart-form'];
      this._saving = true;
      this.classList.add('is-loading');
      this.showError('');
      try {
        // Add replacement first; do not delete the original when the replacement is unavailable.
        await request('/cart/add.js', body);
        let cart;
        try {
          cart = await request('/cart/change.js', {id, quantity:0, sections:sectionIds, sections_url:window.location.pathname});
        } catch (err) {
          this.showError('New option added, but the previous option could not be removed. Please review your cart.');
          return;
        }
        let sections = cart.sections;
        if (!sections || !sections[sectionIds[0]]) {
          const res = await fetch(base + '?sections=' + encodeURIComponent(sectionIds.join(',')), {credentials:'same-origin'});
          if (res.ok) sections = await res.json();
        }
        if (!renderSections(cart, sections)) this.showError('Product updated. Please reopen the cart to see the new option.');
      } catch (err) {
        this.showError(err.message || 'Unable to update this variant.');
      } finally {
        this._saving = false;
        this.classList.remove('is-loading');
      }
    }
  }
  if (!customElements.get('cart-item-variant-switch')) customElements.define('cart-item-variant-switch', CartVariantEditor);
  document.addEventListener('click', e => {
    const button = e.target.closest?.('.cart-item__variant-edit');
    if (!button) return;
    e.preventDefault();
    const picker = button.closest('.cart-item')?.querySelector('cart-item-variant-switch');
    if (!picker) return;
    const isOpening = picker.hasAttribute('hidden') || picker.dataset.closing === 'true';
    button.setAttribute('aria-expanded', String(isOpening));
    togglePicker(picker, isOpening);
    if (isOpening) picker.querySelector('[data-option-value][aria-pressed="true"], [data-option-value], select:not([hidden])')?.focus({preventScroll:true});
  });
  // Height and opacity ease open and closed; reduced motion switches instantly.
  function togglePicker(picker, open) {
    picker._animation?.cancel();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof picker.animate !== 'function';
    if (open) {
      delete picker.dataset.closing;
      picker.hidden = false;
      if (still) return;
      const height = picker.scrollHeight;
      picker.style.overflow = 'hidden';
      picker._animation = picker.animate([{height: '0px', opacity: 0, transform: 'translateY(-4px)'}, {height: height + 'px', opacity: 1, transform: 'none'}], {duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)'});
      picker._animation.onfinish = picker._animation.oncancel = () => { picker.style.overflow = ''; picker._animation = null; };
    } else {
      if (still) { picker.hidden = true; return; }
      picker.dataset.closing = 'true';
      picker.style.overflow = 'hidden';
      picker._animation = picker.animate([{height: picker.offsetHeight + 'px', opacity: 1}, {height: '0px', opacity: 0}], {duration: 200, easing: 'cubic-bezier(.4, 0, 1, 1)'});
      picker._animation.onfinish = () => { picker.hidden = true; delete picker.dataset.closing; picker.style.overflow = ''; picker._animation = null; };
      picker._animation.oncancel = () => { delete picker.dataset.closing; picker.style.overflow = ''; };
    }
  }
})();
