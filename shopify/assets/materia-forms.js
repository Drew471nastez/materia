/* Materia Themes. Sign-up and contact forms, loaded by snippets/content-bottom.
   Storelib sends every form (the page's own submit handler posts it to
   /contact and draws the section again); this only adds what a shopper sees
   around it:
   - the button shows it is sending and the form takes one submit at a time;
   - a hidden trap field ("company", the name Storelib's contact form already
     treats as a script) and a minimum time on the page before a form may be
     sent: a script that trips either is told it worked and nothing is sent;
   - success is a small toast that fades in and goes after about 5 seconds;
     errors stay inline under the form or the field.
   Forms with their own success element (data-storelib-success: popups, the
   promo banner) keep their own success view.
   In the builder nothing is sent; there it redraws field colours live when
   Theme settings > Forms and fields change (snippets/field-colors does the
   same at render time). */
(() => {
  if (window.materiaForms) return;
  const html = document.documentElement;
  const design = () => html.classList.contains('shopify-design-mode') || Boolean(window.Shopify && window.Shopify.designMode);
  const MIN_MS = 2000;
  const TOAST_MS = 5000;
  const FORMS = 'form[data-storelib-form="subscribe"], form[data-storelib-form="contact"], form:has(input[name="form_type"][value="customer"]), form:has(input[name="form_type"][value="contact"])';
  const SUCCESS = '.newsletter-form__message--success, .form__message.success, .cfs__success, .cp-alert--ok, p.success, .form-status--success, .storelib-form-note[role="status"]';
  const ERROR = '.errors, .form__message.error, .newsletter-form__message.error, .cfs__errors, .cp-alert--err, .storelib-form-note[role="alert"], [role="alert"]:not(.mt-field-error)';
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const isForm = el => el instanceof HTMLFormElement && el.matches(FORMS);
  const ownSuccess = form => Boolean(form.querySelector('[data-storelib-success]'));
  const typeOf = form => form.querySelector('input[name="form_type"]')?.value || form.dataset.storelibForm || '';
  const visible = el => Boolean(el && !el.hidden && el.getClientRects().length);

  /* Trap: off screen, out of the tab order, hidden from assistive tech. */
  const arm = form => {
    if (!isForm(form) || form.querySelector('[data-mt-trap]') || form.querySelector('[name="company"]')) return;
    const trap = document.createElement('div');
    trap.className = 'mt-trap';
    trap.setAttribute('data-mt-trap', '');
    trap.setAttribute('aria-hidden', 'true');
    const label = document.createElement('label');
    label.textContent = 'Company';
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'company';
    input.tabIndex = -1;
    input.autocomplete = 'off';
    input.value = '';
    label.appendChild(input);
    trap.appendChild(label);
    form.appendChild(trap);
  };
  const armAll = (scope = document) => {
    if (scope.matches?.(FORMS)) arm(scope);
    scope.querySelectorAll?.(FORMS).forEach(arm);
  };

  /* Toast */
  let toastEl = null, toastTimer = 0, toastHideTimer = 0;
  const paint = (el, from) => {
    const cs = from && from.isConnected ? getComputedStyle(from) : null;
    const pick = name => (cs && cs.getPropertyValue(name).trim()) || '';
    el.style.setProperty('--mt-toast-bg', pick('--color-heading') || '#111111');
    el.style.setProperty('--mt-toast-text', pick('--color-background') || '#ffffff');
  };
  const navOffset = () => {
    const nav = document.querySelector('mobile-navigation-bar');
    if (!nav || !nav.getClientRects().length) return 0;
    const cs = getComputedStyle(nav);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    const r = nav.getBoundingClientRect();
    return r.height > 0 && r.top < innerHeight && r.bottom >= innerHeight - 4 ? Math.round(innerHeight - r.top) : 0;
  };
  const hideToast = () => {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.removeAttribute('data-show');
    clearTimeout(toastHideTimer);
    toastHideTimer = setTimeout(() => { if (toastEl && !toastEl.hasAttribute('data-show')) toastEl.hidden = true; }, reduced() ? 0 : 320);
  };
  const toast = (text, from) => {
    if (!text) return;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'mt-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      toastEl.setAttribute('aria-atomic', 'true');
      toastEl.hidden = true;
      toastEl.innerHTML = '<svg class="mt-toast__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="mt-toast__text"></span>';
      toastEl.addEventListener('mouseenter', () => clearTimeout(toastTimer));
      toastEl.addEventListener('mouseleave', () => { clearTimeout(toastTimer); toastTimer = setTimeout(hideToast, 2000); });
      document.body.appendChild(toastEl);
    }
    toastEl.querySelector('.mt-toast__text').textContent = text;
    paint(toastEl, from);
    toastEl.style.setProperty('--mt-toast-offset', navOffset() + 'px');
    clearTimeout(toastHideTimer);
    clearTimeout(toastTimer);
    toastEl.hidden = false;
    void toastEl.offsetWidth;
    toastEl.setAttribute('data-show', '');
    toastTimer = setTimeout(hideToast, TOAST_MS);
  };
  const thanks = form => typeOf(form) === 'contact'
    ? (form.dataset.successMessage || "Thanks for writing. We'll get back to you soon.")
    : (form.dataset.successMessage || 'Thanks for subscribing.');

  /* A success message drawn in or after the form becomes the toast. */
  const successOf = form => {
    if (!form) return null;
    const inside = [...form.querySelectorAll(SUCCESS)].find(visible);
    if (inside) return inside;
    const next = form.nextElementSibling;
    return next && next.matches('.storelib-form-note[role="status"]') ? next : null;
  };
  const errorOf = form => {
    if (!form) return null;
    if (form.dataset.state === 'error') return form;
    const inside = [...form.querySelectorAll(ERROR)].find(el => visible(el) && el.textContent.trim());
    if (inside) return inside;
    const next = form.nextElementSibling;
    return next && next.matches('.storelib-form-note[role="alert"]') ? next : null;
  };
  const toastFrom = (form, el) => {
    const text = (el && el.textContent.replace(/\s+/g, ' ').trim()) || thanks(form);
    if (el && el !== form) {
      if (el.matches('.storelib-form-note')) el.remove();
      else { el.classList.add('mt-form-msg--toasted'); el.setAttribute('aria-hidden', 'true'); }
    }
    toast(text, form);
  };

  /* Pending state and completion. */
  const pending = (form, button, on) => {
    if (!form) return;
    form.toggleAttribute('data-mt-sending', on);
    // aria-busy is Storelib's (and the theme reads it to block a second submit), so it is set after this submit has gone through.
    if (on) setTimeout(() => { if (form.hasAttribute('data-mt-sending')) form.setAttribute('aria-busy', 'true'); }, 0);
    else form.removeAttribute('aria-busy');
    const buttons = button ? [button] : [...form.querySelectorAll('button[type="submit"], button:not([type]), input[type="submit"]')];
    buttons.forEach(b => {
      if (!on || !ownSuccess(form)) b.classList.toggle('materia-form-pending', on);
      if (on) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    });
    if (!on) form.querySelectorAll('.materia-form-pending').forEach(b => b.classList.remove('materia-form-pending'));
  };

  const watch = (form, button) => {
    const section = form.closest('.shopify-section, [id^="shopify-section-"]') || form.parentElement || document.body;
    const forms = () => [...section.querySelectorAll(FORMS)];
    const index = forms().indexOf(form);
    const type = typeOf(form);
    const own = ownSuccess(form);
    let settled = false, sawSending = false;
    const finish = (target, ok) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(limit);
      pending(form, null, false);
      if (target && target !== form) pending(target, null, false);
      const shown = target || form;
      if (ok === true) {
        if (!own) toastFrom(shown, successOf(shown));
        shown.querySelectorAll('.mt-field-error').forEach(el => el.remove());
      } else if (ok === false) {
        const err = errorOf(shown);
        if (err && err !== shown) err.classList.add('mt-form-error');
        shown.querySelector('input[type="email"]')?.setAttribute('aria-invalid', 'true');
      }
    };
    const check = () => {
      if (form.isConnected) {
        if (form.dataset.state === 'done') return finish(form, true);
        if (form.dataset.state === 'error') return finish(form, false);
        if (form.dataset.state === 'sending') return;
        const next = form.nextElementSibling;
        if (next && next.matches('.storelib-form-note')) return finish(form, next.getAttribute('role') === 'status');
        if (form.hasAttribute('data-storelib-sending')) sawSending = true;
        else if (sawSending) return finish(form, null);
        return;
      }
      // Drawn again: the same form, by position among this section's forms of its type.
      const fresh = forms().filter(f => typeOf(f) === type)[Math.max(0, index)] || forms()[Math.max(0, index)];
      if (!fresh) return finish(null, null);
      armAll(fresh);
      if (successOf(fresh)) return finish(fresh, true);
      if (errorOf(fresh)) return finish(fresh, false);
      return finish(fresh, null);
    };
    const observer = new MutationObserver(() => queueMicrotask(check));
    observer.observe(section, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'data-storelib-sending', 'hidden', 'class'] });
    const limit = setTimeout(() => finish(form.isConnected ? form : null, null), 20000);
  };

  /* Field errors inline, not the browser's bubble. */
  const fieldError = (field, text) => {
    const form = field.form;
    if (!form || !isForm(form)) return;
    let id = field.getAttribute('data-mt-error');
    let note = id ? document.getElementById(id) : null;
    if (!note) {
      id = 'mt-err-' + Math.random().toString(36).slice(2, 9);
      note = document.createElement('p');
      note.id = id;
      note.className = 'mt-field-error';
      note.setAttribute('role', 'alert');
      field.setAttribute('data-mt-error', id);
      const host = field.closest('.field, .form-floating, .footer-newsletter-email, label') || field;
      host.insertAdjacentElement('afterend', note);
    }
    note.textContent = text;
    field.setAttribute('aria-invalid', 'true');
    const described = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!described.includes(id)) field.setAttribute('aria-describedby', described.concat(id).join(' '));
  };
  const clearFieldError = field => {
    const id = field.getAttribute('data-mt-error');
    if (!id) return;
    document.getElementById(id)?.remove();
    field.removeAttribute('data-mt-error');
    field.removeAttribute('aria-invalid');
    const rest = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(x => x && x !== id);
    if (rest.length) field.setAttribute('aria-describedby', rest.join(' ')); else field.removeAttribute('aria-describedby');
  };

  window.materiaForms = { toast, hideToast, arm: armAll, MIN_MS };

  if (!design()) {
    addEventListener('invalid', event => {
      const field = event.target;
      // Popups and the promo banner draw their own form states.
      if (!field?.form || !isForm(field.form) || ownSuccess(field.form)) return;
      event.preventDefault();
      fieldError(field, field.validationMessage);
      const first = field.form.querySelector(':invalid:not(fieldset)');
      if (first === field) { try { field.focus({ preventScroll: false }); } catch (_) {} }
    }, true);
    addEventListener('input', event => {
      const field = event.target;
      if (field?.getAttribute?.('data-mt-error') && field.checkValidity()) clearFieldError(field);
    }, true);

    // Window capture runs before the theme's and Storelib's document listeners.
    addEventListener('submit', event => {
      const form = event.target;
      if (!isForm(form)) return;
      if (form.hasAttribute('data-mt-sending') || form.hasAttribute('data-storelib-sending') || form.dataset.state === 'sending') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const trap = form.querySelector('[data-mt-trap] input');
      if ((trap && trap.value !== '') || performance.now() < MIN_MS) {
        // A script, by the trap or by its speed: it is told the form went, and nothing is sent.
        event.preventDefault();
        event.stopImmediatePropagation();
        form.setAttribute('data-mt-blocked', '');
        if (!ownSuccess(form)) toast(thanks(form), form);
        try { form.reset(); } catch (_) {}
        return;
      }
      form.querySelectorAll('[data-mt-error]').forEach(clearFieldError);
      form.querySelectorAll('.mt-form-error').forEach(el => el.classList.remove('mt-form-error'));
      form.parentNode?.querySelectorAll(':scope > .storelib-form-note').forEach(el => el.remove());
      pending(form, event.submitter || form.querySelector('[type="submit"]'), true);
      watch(form, event.submitter);
    }, true);

    // A page drawn after a full post (no script on the way there) still gets the toast.
    const init = () => {
      armAll();
      document.querySelectorAll(FORMS).forEach(form => {
        if (ownSuccess(form)) return;
        const done = successOf(form);
        if (done && !done.matches('.storelib-form-note')) toastFrom(form, done);
      });
      new MutationObserver(records => {
        for (const r of records) for (const node of r.addedNodes) if (node.nodeType === 1) armAll(node);
      }).observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
    return;
  }

  /* Builder: redraw readable field colours while Forms and fields change.
     Same rules as snippets/field-colors: the field background is the picked
     Background over the scheme (by its opacity), a light tint for Filled, or
     the scheme background; the text is the picked Text colour only at 4.5:1,
     else the scheme text, heading, black or white. */
  const FIELD_KEYS = ['field_text', 'field_background', 'field_style', 'storelib_input_border', 'storelib_input_radius'];
  let fieldState = {};
  try { fieldState = JSON.parse(document.querySelector('script[data-field-settings]')?.textContent || '{}') || {}; } catch (_) { fieldState = {}; }
  let probe = null;
  const rgba = value => {
    if (value == null || value === '') return null;
    if (typeof value === 'object') value = value.hex || value.value || value.color || '';
    const text = String(value).trim();
    if (!text) return null;
    if (!probe) { probe = document.createElement('i'); probe.style.display = 'none'; document.body.appendChild(probe); }
    probe.style.color = '';
    probe.style.color = text;
    if (!probe.style.color) return null;
    const m = getComputedStyle(probe).color.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const lin = v => { const c = v / 255; return c * (0.012522878 + c * (0.682171111 + c * 0.305306011)); };
  const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => { const x = lum(a) + 0.05, y = lum(b) + 0.05; return x > y ? x / y : y / x; };
  const mix = (a, b, w) => ({ r: a.r * w + b.r * (1 - w), g: a.g * w + b.g * (1 - w), b: a.b * w + b.b * (1 - w) });
  const css = c => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
  const schemeOf = el => {
    const cs = getComputedStyle(el);
    const get = name => rgba(cs.getPropertyValue(name).trim());
    return { bg: get('--color-background') || { r: 255, g: 255, b: 255 }, text: get('--color-text'), heading: get('--color-heading') };
  };
  const fieldsFor = (scheme, s) => {
    const style = String(s.field_style || 'outline');
    const own = rgba(s.field_text);
    const fb = rgba(s.field_background);
    let surface = scheme.bg;
    if (fb && fb.a > 0) surface = mix(fb, scheme.bg, Math.min(1, fb.a));
    else if (style === 'filled' && scheme.text) surface = mix(scheme.text, scheme.bg, 0.06);
    const list = [own && own.a > 0 ? own : null, scheme.text, scheme.heading].filter(Boolean);
    let text = list.find(c => ratio(c, surface) >= 4.5);
    if (!text) text = Math.pow(lum(surface) + 0.05, 2) > 0.0525 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
    let placeholder = text;
    for (const w of [0.62, 0.72, 0.82, 0.9]) { const c = mix(text, surface, w); if (ratio(c, surface) >= 4.5) { placeholder = c; break; } }
    let out = `--field-surface:${css(surface)} !important;--field-text:${css(text)} !important;--field-placeholder:${css(placeholder)} !important;--field-placeholder-opacity:1 !important;--input-color:var(--field-text) !important;--input-placeholder-color:var(--field-placeholder) !important;`;
    // Explicitly reset cleared pickers so the original saved color cannot leak
    // through the live preview. Keep the same per-scheme contrast protection.
    out += '--input-bg:' + (style === 'underline' && !(fb && fb.a > 0) ? 'transparent' : 'var(--field-surface)') + ' !important;';
    const border = rgba(s.storelib_input_border);
    out += '--input-border-color:' + (border ? `rgba(${border.r},${border.g},${border.b},${border.a})` : style === 'filled' ? 'transparent' : 'var(--color-border)') + ' !important;';
    return out;
  };
  const schemeClasses = () => {
    const found = new Set();
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (_) { continue; }
      for (const rule of rules || []) {
        if (!rule.selectorText || !rule.style?.getPropertyValue('--field-surface')) continue;
        (rule.selectorText.match(/\.color-[\w-]+/g) || []).forEach(c => found.add(c.slice(1)));
      }
    }
    document.querySelectorAll('[class*="color-"]').forEach(el => el.classList.forEach(c => { if (/^color-[\w-]+$/.test(c)) found.add(c); }));
    return [...found];
  };
  const redrawFields = () => {
    const s = fieldState;
    const style = String(s.field_style || 'outline');
    const radius = Number(s.storelib_input_radius);
    let out = 'html:root{';
    if (style === 'underline') out += '--field-border-widths:0 0 var(--inputs-border-width, 1px) 0 !important;' + (isFinite(radius) && radius >= 0 ? '' : '--input-border-radius:0px !important;');
    else out += '--field-border-widths:var(--inputs-border-width, 1px) !important;';
    out += fieldsFor(schemeOf(html), s) + '}';
    const holder = document.createElement('div');
    holder.style.display = 'none';
    document.body.appendChild(holder);
    for (const name of schemeClasses()) {
      holder.className = name;
      out += `html .${name}, .${name}.${name}{${fieldsFor(schemeOf(holder), s)}}`;
    }
    holder.remove();
    let tag = document.getElementById('materia-field-live');
    if (!tag) { tag = document.createElement('style'); tag.id = 'materia-field-live'; document.head.appendChild(tag); }
    tag.textContent = out;
  };
  document.addEventListener('storelib:settings-change', event => {
    const changed = event.detail?.settings || event.detail || {};
    const keys = Object.keys(changed).filter(k => FIELD_KEYS.includes(k) || k === 'color_schemes');
    if (!keys.length) return;
    keys.forEach(k => { fieldState[k] = changed[k]; });
    // After the theme's own live preview has written the scheme colours.
    requestAnimationFrame(redrawFields);
  });
  window.materiaForms.redrawFields = redrawFields;
})();
