/* Variant-scoped pickup requests. Never substitute a stock claim for missing data. */
if (!customElements.get('pickup-availability')) customElements.define('pickup-availability', class extends HTMLElement {
  connectedCallback() {
    this.errorHtml ||= this.querySelector('template')?.content.firstElementChild?.cloneNode(true);
    this.fetchAvailability(this.dataset.variantId);
  }
  disconnectedCallback() { this.request?.abort(); this.drawer?.hide(false); this.drawerHost?.remove(); }
  async fetchAvailability(variantId) {
    this.request?.abort();
    this.drawer?.hide(false); this.drawerHost?.remove();
    this.dataset.variantId = variantId || '';
    if (!variantId) { this.replaceChildren(); this.removeAttribute('available'); return; }
    const controller = this.request = new AbortController();
    this.setAttribute('aria-busy', 'true');
    try {
      const rootUrl = (this.dataset.rootUrl || '/').replace(/\/?$/, '/');
      const response = await fetch(rootUrl + 'variants/' + encodeURIComponent(variantId) + '/?section_id=pickup-availability', {signal:controller.signal});
      if (!response.ok) throw new Error('Pickup availability unavailable');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (controller !== this.request || !this.isConnected) return;
      this.renderPreview(doc);
    } catch (error) {
      if (controller !== this.request || error.name === 'AbortError' || !this.isConnected) return;
      this.replaceChildren(); this.removeAttribute('available');
      if (this.errorHtml) {
        this.append(this.errorHtml.cloneNode(true));
        this.querySelector('button')?.addEventListener('click', () => this.fetchAvailability(this.dataset.variantId), {once:true});
      }
    } finally {
      if (controller === this.request) this.removeAttribute('aria-busy');
    }
  }
  renderPreview(doc) {
    const preview = doc.querySelector('pickup-availability-preview');
    this.replaceChildren(); this.toggleAttribute('available', !!preview);
    if (!preview) return;
    this.append(preview);
    const host = doc.querySelector('.pickup-availability-drawer');
    if (!host) return;
    // Section responses have fixed IDs; each product instance owns its own copy.
    const suffix = 'pickup-' + (this.closest('[id]')?.id || '') + '-' + this.dataset.variantId;
    const ids = new Map();
    host.querySelectorAll('[id]').forEach(el => { ids.set(el.id, el.id + '-' + suffix); el.id += '-' + suffix; });
    host.querySelectorAll('[aria-labelledby]').forEach(el => el.setAttribute('aria-labelledby', ids.get(el.getAttribute('aria-labelledby')) || el.getAttribute('aria-labelledby')));
    const trigger = preview.querySelector('button');
    if (trigger) trigger.removeAttribute('id');
    this.drawerHost = host;
    this.drawer = host.querySelector('pickup-availability-drawer');
    if (!this.drawer) return;
    this.drawer.trigger = trigger;
    this.drawer.hidden = true;
    document.body.append(host);
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.addEventListener('click', () => this.drawer.show());
    host.querySelector('.overlay')?.addEventListener('click', () => this.drawer.hide());
  }
});
if (!customElements.get('pickup-availability-drawer')) customElements.define('pickup-availability-drawer', class extends HTMLElement {
  connectedCallback() {
    this.events?.abort(); this.events = new AbortController();
    this.querySelector('close-button')?.setAttribute('tabindex', '0');
    this.querySelector('close-button')?.setAttribute('role', 'button');
    this.addEventListener('click', e => { if (e.target.closest('close-button')) this.hide(); }, {signal:this.events.signal});
    this.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); this.hide(); }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('close-button')) { e.preventDefault(); this.hide(); }
      if (e.key !== 'Tab') return;
      const nodes = [...this.querySelectorAll('button,a[href],input,select,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = nodes[0] || this, last = nodes.at(-1) || this;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === this)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }, {signal:this.events.signal});
  }
  disconnectedCallback() { this.hide(false); this.events?.abort(); }
  show() {
    if (this.classList.contains('open')) return;
    clearTimeout(this.closeTimer);
    this.hidden = false;
    this.getBoundingClientRect();
    this.trigger?.setAttribute('aria-expanded', 'true');
    this.previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => { if (!this.isConnected || this.hidden) return; this.classList.add('open'); this.focus({preventScroll:true}); });
  }
  hide(restoreFocus = true) {
    if (this.hidden) return;
    clearTimeout(this.closeTimer);
    this.classList.remove('open');
    if (restoreFocus && !matchMedia('(prefers-reduced-motion: reduce)').matches) this.closeTimer = setTimeout(() => { this.hidden = true; }, 250);
    else this.hidden = true;
    this.trigger?.setAttribute('aria-expanded', 'false');
    if (document.documentElement.style.overflow === 'hidden') document.documentElement.style.overflow = this.previousOverflow || '';
    if (restoreFocus && this.trigger?.isConnected) this.trigger.focus({preventScroll:true});
  }
});
