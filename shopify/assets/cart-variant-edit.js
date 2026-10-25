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
    if (!res.ok || data.status >= 400 || data.errors) throw new Error(data.description || data.message || data.errors || 'Unable to update the product.');
    return data;
  };
  function renderSections(cart, sections) {
    if (!sections) return false;
    const drawer = document.querySelector('cart-notification');
    if (drawer && typeof drawer.applyCartState === 'function' && sections['minicart-form']) {
      drawer.applyCartState({...cart, sections});
      document.dispatchEvent(new CustomEvent('cart:refresh', {detail:{source:'variant-edit'}}));
      return true;
    }
    let updated = false;
    for (const [id, html] of Object.entries(sections)) {
      if (!html) continue;
      const pageCart = document.getElementById('main-cart-items');
      const target = document.getElementById(id) || (pageCart?.dataset.id === id ? pageCart : null);
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const fresh = parsed.getElementById(target?.id || id);
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
      document.querySelector('free-ship-progress-bar')?.init?.(cart.total_price);
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
      // Current options are pressed; a choice with no variant in stock for the
      // other options picked reads as unavailable before it is tapped.
      const syncChoices = () => this.querySelectorAll('[data-option-value]').forEach(button => {
        const index = Number(button.dataset.optionIndex);
        const select = this._selects[index];
        button.setAttribute('aria-pressed', String(select?.value === button.dataset.optionValue));
        const picked = this._selects.map(el => el.value);
        picked[index] = button.dataset.optionValue;
        const match = this._variants.find(v => picked.every((value, i) => String(v['option' + (i + 1)]) === String(value)));
        if (this._variants.length && (!match || !match.available)) button.setAttribute('aria-disabled', 'true');
        else button.removeAttribute('aria-disabled');
      });
      syncChoices();
      for (const select of this._selects) select.addEventListener('change', () => { syncChoices(); if (!this.hasAttribute('data-cart-page')) this.save(); }, {signal:this._events.signal});
      this.addEventListener('click', event => {
        if (event.target.closest('[data-variant-save]')) { this.save(); return; }
        const button = event.target.closest('[data-option-value]');
        if (!button || this._saving) return;
        const select = this._selects[Number(button.dataset.optionIndex)];
        if (!select) return;
        select.value = button.dataset.optionValue;
        syncChoices();
        if (!this.hasAttribute('data-cart-page')) this.save();
      }, {signal:this._events.signal});
      this.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        closeEditor();
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
      const pageCart = this.closest('#main-cart-items');
      const sectionIds = pageCart ? [pageCart.dataset.id || 'main-cart-items'] : notification?.getSectionsToRender?.().map(s => s.id) || ['minicart-form'];
      this._saving = true;
      const saveButton = this.querySelector('[data-variant-save]');
      if (saveButton) { saveButton.disabled = true; saveButton.classList.add('loading'); }
      this.setAttribute('aria-busy', 'true');
      this.classList.add('is-loading');
      this.showError('');
      try {
        // Add replacement first; do not delete the original when the replacement is unavailable.
        await request(paths.cart_add_url || base + '/add.js', body);
        let cart;
        try {
          cart = await request(paths.cart_change_url || base + '/change.js', {id, quantity:0, sections:sectionIds, sections_url:window.location.pathname});
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
        else {
          if (pageCart) document.querySelector('#main-cart-items .cart-item__details a')?.focus({preventScroll:true});
          else closeEditor(false);
        }
      } catch (err) {
        this.showError(err.message || 'Unable to update this variant.');
      } finally {
        this._saving = false;
        if (saveButton) { saveButton.disabled = false; saveButton.classList.remove('loading'); }
        this.removeAttribute('aria-busy');
        this.classList.remove('is-loading');
      }
    }
  }
  if (!customElements.get('cart-item-variant-switch')) customElements.define('cart-item-variant-switch', CartVariantEditor);
  /* The pencil opens the line's options in a bottom sheet, like the drawer's
     note and coupon sheets (same scrim, drag to close, Escape). The editor
     element moves into the sheet while it is open and back to its line after. */
  let current = null; // {picker, placeholder, button, sheet}
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sheetFor(cart) {
    const wrapper = cart.querySelector('.minicart__wrapper') || cart;
    let sheet = wrapper.querySelector(':scope > .cart-variant-sheet');
    if (sheet) return sheet;
    sheet = document.createElement('div');
    sheet.className = 'cart__addon-content cart-variant-sheet';
    sheet.id = 'cart-variant-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'cart-variant-sheet-title');
    sheet.tabIndex = -1;
    const grab = document.createElement('div');
    grab.className = 'cart-sheet__grab';
    grab.setAttribute('data-sheet-grab', '');
    grab.setAttribute('aria-hidden', 'true');
    const title = document.createElement('div');
    title.className = 'addon-title cart-variant-sheet__title';
    const label = document.createElement('span');
    label.id = 'cart-variant-sheet-title';
    title.append(label);
    const body = document.createElement('div');
    body.className = 'cart-variant-sheet__body';
    const actions = document.createElement('div');
    actions.className = 'addon-actions';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn-cancel btn-outline w-full';
    close.textContent = cart.querySelector('.cart__addon-content .btn-cancel')?.textContent.trim() || 'Close';
    actions.append(close);
    sheet.append(grab, title, body, actions);
    wrapper.append(sheet);
    // Every way a sheet closes (scrim, drag, Cancel, Escape) removes is-open.
    new MutationObserver(() => { if (!sheet.classList.contains('is-open')) settle(sheet); })
      .observe(sheet, {attributes: true, attributeFilter: ['class']});
    return sheet;
  }
  function restore(state) {
    if (!state) return;
    const {picker, placeholder} = state;
    if (placeholder?.isConnected) placeholder.replaceWith(picker);
    else { picker.remove(); placeholder?.remove(); }
    picker.hidden = true;
  }
  function settle(sheet) {
    const state = current;
    if (!state || state.sheet !== sheet) return;
    current = null;
    state.button?.setAttribute('aria-expanded', 'false');
    if (state.focus !== false && sheet.contains(document.activeElement) && state.button?.isConnected) state.button.focus({preventScroll: true});
    clearTimeout(sheet._restoreTimer);
    // After the slide down, the editor goes back into its line.
    sheet._restoreTimer = setTimeout(() => { if (current?.picker !== state.picker) restore(state); }, reduced() ? 0 : 340);
  }
  function closeEditor(focus = true) {
    if (!current) return;
    current.focus = focus;
    current.sheet.classList.remove('is-open');
  }
  function openEditor(button) {
    const row = button.closest('.cart-item');
    const picker = row?.querySelector('cart-item-variant-switch') || document.getElementById(button.getAttribute('aria-controls') || '');
    const cart = button.closest('cart-notification');
    if (!picker || !cart) return;
    if (current?.picker === picker) { closeEditor(); return; }
    const sheet = sheetFor(cart);
    if (current) { const previous = current; current = null; previous.button?.setAttribute('aria-expanded', 'false'); restore(previous); }
    clearTimeout(sheet._restoreTimer);
    // Another open drawer sheet gives way to this one.
    cart.querySelectorAll('.cart__addon-content.is-open').forEach(open => {
      if (open === sheet) return;
      open.classList.remove('is-open');
      const opener = cart.querySelector('.mini_cart_addon_btn[data-open="' + open.id + '"]');
      opener?.classList.remove('open'); opener?.setAttribute('aria-expanded', 'false');
    });
    const body = sheet.querySelector('.cart-variant-sheet__body');
    body.querySelectorAll('cart-item-variant-switch').forEach(old => old.remove());
    const placeholder = document.createComment('cart-variant-editor');
    picker.replaceWith(placeholder);
    picker.hidden = false;
    body.append(picker);
    sheet.querySelector('#cart-variant-sheet-title').textContent = row?.querySelector('.minicart__product-name')?.textContent.trim() || button.getAttribute('title') || '';
    current = {picker, placeholder, button, sheet};
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-controls', sheet.id);
    sheet.getBoundingClientRect();
    sheet.classList.add('is-open');
    requestAnimationFrame(() => {
      const target = picker.querySelector('[data-option-value][aria-pressed="true"]') || picker.querySelector('[data-option-value], select:not([hidden])');
      if (window.matchMedia('(pointer: coarse)').matches) sheet.focus({preventScroll: true});
      else target?.focus({preventScroll: true});
    });
  }
  document.addEventListener('click', e => {
    const button = e.target.closest?.('.cart-item__variant-edit');
    if (!button) return;
    e.preventDefault();
    openEditor(button);
  });
  window.materiaCloseVariantEditor = closeEditor;
})();
