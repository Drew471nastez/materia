/* Materia Themes. Developed By Materia Themes.
   The Floating video (sections/shopable-video-sticky). live-product-extras.js,
   which every page loads, defines the same element with the builder's live
   updates; this file is the fallback for a page without it. One passive
   scroll listener per element, removed with it; shown at once in the
   builder; no autoplay under reduced motion. */
(() => {
  if (customElements.get('shopable-video-sticky')) return;
  const COOKIE = 'video_sticky_closed';
  const closedCookie = () => document.cookie.split(';').some(c => c.trim() === COOKIE + '=true');
  const design = () => !!(window.Shopify && Shopify.designMode) || document.documentElement.classList.contains('shopify-design-mode');
  customElements.define('shopable-video-sticky', class extends HTMLElement {
    connectedCallback() {
      this.box = this.querySelector('.mini-video__video');
      this.closed = false;
      this.ac?.abort(); this.ac = new AbortController();
      const sig = {signal: this.ac.signal};
      window.addEventListener('scroll', () => { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.update(); }); }, {passive: true, ...sig});
      this.querySelector('.close-mini-video')?.addEventListener('click', () => {
        this.closed = true; this.box?.classList.remove('is-visible');
        if (this.getAttribute('data-action-close') === 'true' && !design()) document.cookie = COOKIE + '=true; expires=' + new Date(Date.now() + 864e5).toUTCString() + '; path=/; SameSite=Lax';
      }, sig);
      const v = this.querySelector('video');
      if (v && matchMedia('(prefers-reduced-motion: reduce)').matches) { v.autoplay = false; v.removeAttribute('autoplay'); v.pause(); }
      this.update();
    }
    disconnectedCallback() { this.ac?.abort(); if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
    update() {
      if (this.closed) return;
      const on = design() || (!(this.getAttribute('data-action-close') === 'true' && closedCookie()) && window.scrollY > 300);
      if (on) this.box?.classList.add('is-visible');
    }
  });
})();
