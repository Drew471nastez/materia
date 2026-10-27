/* Shared block lifecycles: editor replacements initialise like storefront HTML. */
(() => {
  if (window.MateriaBlockRuntime) return;
  const badges = new Set();
  function deadline(value) {
    const input=String(value||'').trim().replace(/^(\d{4}-\d\d-\d\d)\s+/, '$1T');
    const match=input.match(/^(\d{4})-(\d\d)-(\d\d)(?:T(\d\d):(\d\d)(?::(\d\d))?(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)?)?$/);
    if(!match)return NaN;
    const [,y,m,d,h='0',minute='0',second='0']=match;
    if(+m<1||+m>12||+d<1||+d>new Date(Date.UTC(+y,+m,0)).getUTCDate()||+h>23||+minute>59||+second>59)return NaN;
    return Date.parse(input);
  }
  const put = (el, value) => {
    if (!el) return;
    const text = String(value).padStart(2, '0');
    if (el.firstChild?.nodeType === 3 && !el.firstChild.nextSibling) {
      if (el.firstChild.nodeValue !== text) el.firstChild.nodeValue = text;
    } else if (el.textContent !== text) el.textContent = text;
  };
  class ProductCountdownBadge extends HTMLElement {
    static get observedAttributes() { return ['data-end', 'data-on-end', 'data-restart']; }
    connectedCallback() { badges.add(this); queueMicrotask(() => this.tick()); visibility?.observe(this); }
    disconnectedCallback() { badges.delete(this); visibility?.unobserve(this); }
    attributeChangedCallback() { if (this.isConnected) { this._offscreen=false;queueMicrotask(() => this.tick()); } }
    tick() {
      if (!this.isConnected || document.hidden || this._offscreen) return;
      const end = deadline(this.dataset.end);
      // Missing configuration is never turned into a fabricated sale deadline.
      const invalid=String(!Number.isFinite(end));if(this.dataset.invalid!==invalid)this.dataset.invalid=invalid;
      let diff = Number.isFinite(end) ? Math.max(0, end - Date.now()) : 0;
      const repeat = Number(this.dataset.restart) * 1000;
      if (Number.isFinite(end) && end <= Date.now() && this.dataset.onEnd === 'restart' && repeat > 0) {
        diff = repeat - ((Date.now() - end) % repeat);
      }
      const seconds = Math.floor(diff / 1000);
      [['days', Math.floor(seconds / 86400)], ['hours', Math.floor(seconds / 3600) % 24], ['mins', Math.floor(seconds / 60) % 60], ['secs', seconds % 60]].forEach(([key, n]) => put(this.querySelector('[data-cd="' + key + '"]'), n));
      const expired = Number.isFinite(end) && diff <= 0 && this.dataset.onEnd === 'ended';
      const hide=Number.isFinite(end)&&diff<=0&&this.dataset.onEnd==='hide';if(this.hidden!==hide)this.hidden=hide;
      const ended = this.querySelector('.cd-ended'), row = this.querySelector('.cd-row');
      if (ended) ended.hidden = !expired;
      if (row) row.hidden = expired;
    }
  }
  const visibility = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(({target, isIntersecting}) => { target._offscreen = !isIntersecting; if (isIntersecting) target.tick(); })) : null;
  class ProductTestimonials extends HTMLElement {
    connectedCallback() {
      if (this._bound) {
        this.row = this.querySelector('[data-testimonial-row]');
        grab(this.row);
        this.row?.addEventListener('scroll', this._update, {passive:true});
        this._resize?.observe(this); this._update(); return;
      }
      this._bound = true;
      this.row = this.querySelector('[data-testimonial-row]');
      grab(this.row);
      this._update = () => {
        if (!this.row) return;
        const end = this.row.scrollWidth - this.row.clientWidth;
        const position = Math.abs(this.row.scrollLeft);
        this.querySelector('[data-testimonial-prev]')?.classList.toggle('hidden', position < 2);
        this.querySelector('[data-testimonial-next]')?.classList.toggle('hidden', position >= end - 2);
      };
      this.addEventListener('click', event => {
        const button = event.target.closest('[data-testimonial-prev],[data-testimonial-next]');
        if (!button || !this.row) return;
        const card = this.row.firstElementChild, gap = parseFloat(getComputedStyle(this.row).columnGap) || 0;
        const direction = getComputedStyle(this.row).direction === 'rtl' ? -1 : 1;
        this.row.scrollBy({left:(card?.getBoundingClientRect().width + gap || this.row.clientWidth) * (button.hasAttribute('data-testimonial-prev') ? -1 : 1) * direction, behavior:matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth'});
      });
      this.row?.addEventListener('scroll', this._update, {passive:true});
      this._resize = 'ResizeObserver' in window ? new ResizeObserver(this._update) : null;
      this._resize?.observe(this);
      this._update();
    }
    disconnectedCallback() { this._resize?.disconnect(); }
  }
  function grab(){ /* Mouse drag for these rows is one handler in global.js. */ }
  if (!customElements.get('product-testimonials')) customElements.define('product-testimonials', ProductTestimonials);
  if (!customElements.get('product-countdown-badge')) customElements.define('product-countdown-badge', ProductCountdownBadge);
  setInterval(() => { if (!document.hidden) badges.forEach(badge => badge.tick()); }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) badges.forEach(badge => badge.tick()); });

  // Custom columns are a maximum, not full-width stretched controls. Measure
  // the natural cells and fit fewer columns when a product has long options.
  const grids = new Set();
  function layout(grid) {
    if (!grid.isConnected) { resize?.unobserve(grid); grids.delete(grid); return; }
    const cells = [...grid.querySelectorAll(':scope > .vsp__cell')];
    if (!cells.length) return;
    const style = getComputedStyle(grid), gap = parseFloat(style.columnGap) || 0;
    const requested = Math.max(1, parseInt(style.getPropertyValue('--vsp-cols')) || 4);
    const width = Math.max(44, ...cells.map(cell => Math.min(grid.clientWidth, Math.ceil(cell.getBoundingClientRect().width))));
    const columns = Math.min(requested, cells.length, Math.max(1, Math.floor((grid.clientWidth + gap) / (width + gap))));
    const value = String(columns);
    if (grid.style.getPropertyValue('--vsp-fit-cols') !== value) grid.style.setProperty('--vsp-fit-cols', value);
  }
  const resize = 'ResizeObserver' in window ? new ResizeObserver(entries => entries.forEach(({target}) => layout(target))) : null;
  function scan() {
    document.querySelectorAll('product-testimonials').forEach(root => root.connectedCallback());
    grids.forEach(layout);
    document.querySelectorAll('[data-vsp-custom] .vsp__values').forEach(grid => { if (!grids.has(grid)) { grids.add(grid); resize?.observe(grid); } layout(grid); });
  }
  window.addEventListener('resize', scan, {passive:true});
  ['storelib:section-load', 'shopify:section:load', 'storelib:settings-change'].forEach(name => document.addEventListener(name, () => requestAnimationFrame(scan)));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  window.MateriaBlockRuntime = {scan};
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const panel = document.querySelector('.mt-product-dialog:popover-open');
    if (!panel) return;
    const items = [...panel.querySelectorAll('button:not([disabled]),input:not([type=hidden]):not([disabled]),textarea,select,a[href]')].filter(el=>el.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (!first) return;
    if (!panel.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last) || (event.shiftKey && document.activeElement === first)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  });
  document.addEventListener('click', async event => {
    const share = event.target.closest?.('[data-product-share]');
    const copy = event.target.closest?.('[data-copy-product-url]');
    if (share) {
      event.preventDefault();
      const url = new URL(share.dataset.shareUrl, location.href).href;
      const panel = document.getElementById(share.dataset.sharePanel);
      if (panel) { panel.querySelector('[data-share-value]').value = url;if(window.MateriaProductDialogs)MateriaProductDialogs.open(panel,share);else panel.showPopover(); }
    }
    if (copy) {
      const panel = copy.closest('.mt-product-dialog'), input = panel.querySelector('[data-share-value]'), status = panel.querySelector('[data-copy-status]');
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(input.value);
        else { input.select(); if (!document.execCommand('copy')) throw new Error('copy'); }
        status.textContent = status.dataset.copied;
      } catch { input.select(); status.textContent = status.dataset.copyError; }
    }
  });
})();
