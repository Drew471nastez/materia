/* Materia Themes. Cookies and consent: <cookie-consent> in snippets/content-bottom.
   The choice is kept in localStorage ("materia:consent": accepted, when, and
   when it expires) and announced as a `materia:consent` event on document
   with detail { accepted }. Other scripts can also read
   window.materiaConsent.get() (null until a choice is made). In the builder it
   shows only with "Show in the builder" on, and follows setting changes live. */
(() => {
  if (window.customElements?.get('cookie-consent')) return;
  const KEY = 'materia:consent';
  const CLOSED = 'materia:consent-closed';
  const DAY = 864e5;
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const read = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value || typeof value.accepted !== 'boolean' || !(Number(value.expires) > Date.now())) {
        localStorage.removeItem(KEY);
        return null;
      }
      return value;
    } catch (_) { return null; }
  };
  const write = (accepted, days) => {
    const now = Date.now();
    const value = { accepted, at: now, expires: now + Math.max(1, Number(days) || 180) * DAY };
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (_) {}
    return value;
  };
  const closedThisVisit = () => { try { return sessionStorage.getItem(CLOSED) === '1'; } catch (_) { return false; } };
  const rememberClosed = () => { try { sessionStorage.setItem(CLOSED, '1'); } catch (_) {} };
  const announce = (accepted, stored) => {
    document.dispatchEvent(new CustomEvent('materia:consent', { detail: { accepted, stored: Boolean(stored) } }));
  };

  window.materiaConsent = window.materiaConsent || {
    get: read,
    reset() {
      try { localStorage.removeItem(KEY); sessionStorage.removeItem(CLOSED); } catch (_) {}
    },
    open() { document.querySelector('cookie-consent')?.show(true); },
  };

  const colour = value => {
    if (value == null) return '';
    if (typeof value === 'object') value = value.hex || value.value || value.color || '';
    const text = String(value).trim();
    if (!text || text === 'transparent' || /^rgba\([^)]*,\s*0(\.0+)?\s*\)$/i.test(text) || /^#[0-9a-f]{6}00$/i.test(text)) return '';
    return text;
  };
  const yes = value => value === true || value === 'true';
  const LEGACY = { full: 'bottom_bar', 'card-left': 'bottom_left', 'card-right': 'bottom_right', top: 'top_bar' };

  class CookieConsent extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      this.panel = this.querySelector('[data-consent-panel]');
      this.design = this.dataset.design === 'true';
      this.closeWanted = !this.querySelector('[data-consent="close"]')?.hidden;
      this.onKey = this.onKey.bind(this);
      this.place = this.place.bind(this);
      this.addEventListener('click', event => {
        const action = event.target.closest?.('[data-consent]')?.dataset.consent;
        if (action === 'accept') this.choose(true);
        else if (action === 'decline') this.choose(false);
        else if (action === 'close') this.dismiss();
      });
      if (this.design) return this.startPreview();
      const stored = read();
      if (stored) { announce(stored.accepted, true); return; }
      if (this.dataset.enabled !== 'true' || this.dataset.pageOk === 'false') return;
      if (this.dataset.frequency === 'session' && closedThisVisit()) return;
      const delay = Math.max(0, Number(this.dataset.delay) || 0) * 1000;
      this.timer = setTimeout(() => this.show(), delay);
    }

    disconnectedCallback() {
      clearTimeout(this.timer);
      document.removeEventListener('keydown', this.onKey, true);
      window.removeEventListener('resize', this.place);
    }

    get modal() { return this.dataset.position === 'modal'; }
    get required() { return this.modal && this.dataset.require === 'true'; }

    /* Lift a bottom banner above the mobile navigation bar while that bar shows. */
    place() {
      let offset = 0;
      if (this.dataset.aboveNav !== 'false' && this.dataset.position !== 'top_bar') {
        const nav = document.querySelector('mobile-navigation-bar');
        if (nav && nav.getClientRects().length && getComputedStyle(nav).display !== 'none' && getComputedStyle(nav).visibility !== 'hidden') {
          const rect = nav.getBoundingClientRect();
          if (rect.height > 0 && rect.top < window.innerHeight && rect.bottom >= window.innerHeight - 4) offset = Math.round(window.innerHeight - rect.top);
        }
      }
      this.style.setProperty('--cookie-nav-offset', offset + 'px');
    }

    show(force) {
      if (this.isOpen) return;
      if (!force && this.design && this.dataset.preview !== 'true') return;
      clearTimeout(this.timer);
      clearTimeout(this.hideTimer);
      this.isOpen = true;
      this.lastFocus = document.activeElement;
      this.syncRole();
      this.hidden = false;
      this.place();
      window.addEventListener('resize', this.place, { passive: true });
      document.addEventListener('keydown', this.onKey, true);
      // One frame hidden-to-shown, so the entrance runs from its start.
      void this.offsetWidth;
      requestAnimationFrame(() => {
        this.setAttribute('data-open', '');
        if (this.modal) this.firstButton()?.focus({ preventScroll: true });
      });
    }

    hide() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.removeAttribute('data-open');
      document.removeEventListener('keydown', this.onKey, true);
      window.removeEventListener('resize', this.place);
      const hadFocus = this.contains(document.activeElement);
      const done = () => { if (!this.isOpen) this.hidden = true; };
      if (this.dataset.animation === 'none' || reduced()) done();
      else this.hideTimer = setTimeout(done, 340);
      if (hadFocus && this.lastFocus?.isConnected && this.lastFocus !== document.body) {
        try { this.lastFocus.focus({ preventScroll: true }); } catch (_) {}
      }
    }

    choose(accepted) {
      if (!this.design) write(accepted, this.dataset.expiry);
      announce(accepted, false);
      this.hide();
    }

    dismiss() {
      if (this.required) return;
      if (!this.design && this.dataset.frequency === 'session') rememberClosed();
      this.hide();
    }

    buttons() {
      return [...this.panel.querySelectorAll('a[href]:not([hidden]), button:not([hidden]):not(:disabled)')].filter(el => el.getClientRects().length);
    }
    firstButton() {
      return this.panel.querySelector('.cookie-consent__actions button:not([hidden])') || this.buttons()[0];
    }

    onKey(event) {
      if (!this.isOpen) return;
      if (event.key === 'Escape') {
        if (this.required) { event.preventDefault(); return; }
        if (this.modal || this.contains(document.activeElement)) { event.preventDefault(); this.dismiss(); }
        return;
      }
      if (event.key !== 'Tab' || !this.modal) return;
      const items = this.buttons();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (!this.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    syncRole() {
      if (this.modal) { this.panel.setAttribute('role', 'dialog'); this.panel.setAttribute('aria-modal', 'true'); }
      else { this.panel.setAttribute('role', 'region'); this.panel.removeAttribute('aria-modal'); }
      // A modal that needs a choice has no close button.
      const close = this.querySelector('[data-consent="close"]');
      if (close) close.hidden = !this.closeWanted || this.required;
    }

    /* Builder: the values it starts from, then every change to a cookie setting. */
    startPreview() {
      try { this.state = JSON.parse(document.querySelector('script[data-consent-settings]')?.textContent || '{}'); } catch (_) { this.state = {}; }
      if ('cookie_show_close' in this.state) this.closeWanted = yes(this.state.cookie_show_close);
      if (this.dataset.preview === 'true' && this.dataset.enabled === 'true') this.show();
      document.addEventListener('storelib:settings-change', event => {
        const changed = event.detail?.settings || event.detail || {};
        const keys = Object.keys(changed).filter(key => /^(enable_cookies|cookie_|heading_cookies|content_cookies|label_allow|label_refuse)/.test(key));
        if (!keys.length) return;
        keys.forEach(key => { this.state[key] = changed[key]; });
        this.applyPreview(changed);
        const on = yes(this.state.enable_cookies) && yes(this.state.cookie_show_in_builder);
        this.dataset.preview = String(on);
        if (on) { if (this.isOpen) this.syncRole(); else this.show(); }
        else this.hide();
      });
    }

    applyPreview(s) {
      const has = key => Object.prototype.hasOwnProperty.call(s, key);
      const data = (key, attr, map) => { if (has(key) && s[key] != null) this.dataset[attr] = map ? map(s[key]) : String(s[key]); };
      if (has('enable_cookies')) this.dataset.enabled = String(yes(s.enable_cookies));
      if (has('cookie_position') || has('cookie_style')) {
        const look = String(this.state.cookie_style || 'bar-center');
        let position = String(this.state.cookie_position || 'bottom_center');
        if (LEGACY[look] && position === 'bottom_center') position = LEGACY[look];
        this.dataset.position = position;
        this.dataset.look = LEGACY[look] ? 'bar-center' : look;
      }
      data('cookie_animation', 'animation');
      data('cookie_mobile_layout', 'mobile');
      data('cookie_modal_backdrop', 'backdrop', v => String(yes(v)));
      data('cookie_require_choice', 'require', v => String(yes(v)));
      data('cookie_above_mobile_nav', 'aboveNav', v => String(yes(v)));
      if (this.isOpen) this.place();
      const heading = this.querySelector('[data-consent-heading]');
      if (has('heading_cookies') && heading) { heading.textContent = s.heading_cookies || 'Cookies'; heading.hidden = !s.heading_cookies; }
      const message = this.querySelector('[data-consent-message]');
      if (has('content_cookies') && message) message.innerHTML = s.content_cookies || '';
      const accept = this.querySelector('[data-consent="accept"]');
      const decline = this.querySelector('[data-consent="decline"]');
      if (has('label_allow') && accept) accept.textContent = s.label_allow || 'Accept';
      if (has('label_refuse') && decline) decline.textContent = s.label_refuse || 'Decline';
      if (has('cookie_show_decline') && decline) decline.hidden = !yes(s.cookie_show_decline);
      if (has('cookie_show_close')) this.closeWanted = yes(s.cookie_show_close);
      this.syncRole();
      const link = this.querySelector('[data-consent-link]');
      if (link && (has('cookie_link_label') || has('cookie_link_url'))) {
        const url = this.state.cookie_link_url;
        const href = typeof url === 'object' && url ? (url.url || url.href || '') : (url || '');
        link.textContent = this.state.cookie_link_label || '';
        link.setAttribute('href', href || '#');
        link.hidden = !href || !this.state.cookie_link_label;
      }
      if (has('cookie_color_scheme')) {
        const scheme = s.cookie_color_scheme;
        const id = typeof scheme === 'object' && scheme ? scheme.id : scheme;
        [...this.classList].filter(name => name.startsWith('color-')).forEach(name => this.classList.remove(name));
        if (id) this.classList.add('color-' + id);
      }
      if (Object.keys(s).some(key => /^cookie_(custom_styling|bg_color|text_color|heading_color|btn_bg|btn_text|btn2_text|btn_radius)$/.test(key))) this.paintCustom();
    }

    paintCustom() {
      const s = this.state;
      const on = yes(s.cookie_custom_styling);
      const set = (el, name, value) => { if (!el) return; if (on && value) el.style.setProperty(name, value); else el.style.removeProperty(name); };
      set(this, '--cookie-bg', colour(s.cookie_bg_color));
      set(this, '--cookie-text', colour(s.cookie_text_color));
      set(this, '--cookie-heading', colour(s.cookie_heading_color));
      const accept = this.querySelector('[data-consent="accept"]');
      const decline = this.querySelector('[data-consent="decline"]');
      const radius = s.cookie_btn_radius != null && s.cookie_btn_radius !== '' ? Number(s.cookie_btn_radius) + 'px' : '';
      set(accept, '--mb-bg', colour(s.cookie_btn_bg));
      set(accept, '--mb-border', colour(s.cookie_btn_bg));
      set(accept, '--mb-text', colour(s.cookie_btn_text));
      set(decline, '--mb-text', colour(s.cookie_btn2_text));
      set(accept, '--mb-radius', radius);
      set(decline, '--mb-radius', radius);
    }
  }

  customElements.define('cookie-consent', CookieConsent);
})();
