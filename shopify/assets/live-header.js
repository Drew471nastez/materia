/* Materia Themes. Live builder controller for the header group: Header
   (sections/theme-header) and Announcement Bar Pro 3 (sections/top-bar).
   Loaded on every page with defer by layout/theme.storelib.

   1. The top bar's message rotator, <announcement-rotator-v2>: one per bar,
      paused off screen, in a hidden tab, on hover and focus, and under
      reduced motion. Defined here (not in an inline script) so a bar the
      builder draws again rotates without one; a redrawn bar is a new element
      and starts once.
   2. storelib:settings-change for these two sections: every value that is a
      class, an attribute, a custom property or a text is written in the next
      frame on THAT instance only, the same value the Liquid prints, so the
      redraw that follows changes nothing. A value is written only when it
      differs, so pictures never reload and the rotator is never restarted.
      Settings that change the markup (the menu, a block's link title, the
      pill and glass block) wait for the builder's redraw.
   Header heights and the dropdown sliders are applied by header-section.js;
   the top bar's colours by announcement-three-colors.js. */
(() => {
  if (window.MateriaLiveHeader) return;

  /* ---------- 1. rotator ---------- */
  if (!customElements.get('announcement-rotator-v2')) customElements.define('announcement-rotator-v2', class extends HTMLElement {
    connectedCallback() {
      queueMicrotask(() => {
        if (!this.isConnected || this.cleanup) return;
        const slides = [...this.querySelectorAll('.topbar-message')];
        const controls = this.parentElement;
        if (!slides.length) return;
        let index = 0, target = 0, timer, visible = true, animating = false, animation, disposed = false;
        const motion = matchMedia('(prefers-reduced-motion: reduce)');
        const stop = () => clearTimeout(timer);
        const schedule = () => {
          stop();
          if (disposed || animating || slides.length < 2 || motion.matches || !visible || document.hidden ||
              controls.matches(':hover') || controls.contains(document.activeElement)) return;
          timer = setTimeout(() => show(index + 1), Math.max(1, Number(this.dataset.delay) || 5) * 1000);
        };
        const apply = next => {
          index = next;
          slides.forEach((slide, i) => {
            slide.classList.toggle('is-active', i === index);
            slide.setAttribute('aria-hidden', String(i !== index));
            slide.inert = i !== index;
          });
        };
        /* Fade out fully before fading in; rapid clicks move the destination
           without restarting a fade. */
        const transition = async () => {
          animating = true;
          this.dataset.transitioning = 'true';
          const duration = Math.max(120, Number(this.dataset.duration) || 700) / 2;
          try {
            animation = slides[index].animate([{opacity: 1}, {opacity: 0}], {duration, easing: 'ease-in-out', fill: 'forwards'});
            await animation.finished;
            if (disposed) return;
            const outgoing = animation;
            apply(target);
            animation = slides[index].animate([{opacity: 0}, {opacity: 1}], {duration, easing: 'ease-in-out', fill: 'forwards'});
            outgoing.cancel();
            await animation.finished;
          } catch (error) {
            if (error.name !== 'AbortError') throw error;
          } finally {
            animation?.cancel();
            animation = null;
            animating = false;
            this.dataset.transitioning = 'false';
            if (!disposed) {
              if (target !== index) show(target);
              else schedule();
            }
          }
        };
        const show = next => {
          target = (next + slides.length) % slides.length;
          this.dataset.activeIndex = target;
          stop();
          if (motion.matches || typeof this.animate !== 'function') { apply(target); schedule(); return; }
          if (!animating && target !== index) transition();
          else if (!animating) schedule();
        };
        const motionChange = () => {
          if (motion.matches) { animation?.cancel(); apply(target); }
          schedule();
        };
        const click = event => {
          const button = event.target.closest('.topbar-slider-arrow');
          if (!button || !controls.contains(button)) return;
          event.preventDefault();
          show(target + (button.classList.contains('topbar-slider-arrow--prev') ? -1 : 1));
        };
        const focusOut = () => queueMicrotask(schedule);
        let startX;
        const down = event => { startX = event.clientX; };
        const up = event => {
          if (startX != null && Math.abs(event.clientX - startX) > 40) show(target + (event.clientX < startX ? 1 : -1));
          startX = null;
        };
        controls.addEventListener('click', click);
        controls.addEventListener('pointerenter', stop);
        controls.addEventListener('pointerleave', schedule);
        controls.addEventListener('focusin', stop);
        controls.addEventListener('focusout', focusOut);
        this.addEventListener('pointerdown', down);
        this.addEventListener('pointerup', up);
        document.addEventListener('visibilitychange', schedule);
        motion.addEventListener('change', motionChange);
        const observer = new IntersectionObserver(entries => {
          visible = entries[0].isIntersecting;
          schedule();
        });
        observer.observe(this);
        controls.querySelectorAll('.topbar-slider-arrow').forEach(button => { button.disabled = slides.length < 2; });
        /* Time per message changed in the builder: the next turn uses it. */
        const delayWatch = new MutationObserver(schedule);
        delayWatch.observe(this, {attributes: true, attributeFilter: ['data-delay']});
        this.cleanup = () => {
          disposed = true;
          stop(); animation?.cancel(); observer.disconnect(); delayWatch.disconnect();
          controls.removeEventListener('click', click);
          controls.removeEventListener('pointerenter', stop);
          controls.removeEventListener('pointerleave', schedule);
          controls.removeEventListener('focusin', stop);
          controls.removeEventListener('focusout', focusOut);
          this.removeEventListener('pointerdown', down);
          this.removeEventListener('pointerup', up);
          document.removeEventListener('visibilitychange', schedule);
          motion.removeEventListener('change', motionChange);
        };
        apply(0);
        this.dataset.activeIndex = '0';
        this.dataset.transitioning = 'false';
        schedule();
      });
    }
    disconnectedCallback() { this.cleanup?.(); this.cleanup = null; }
  });

  /* ---------- helpers ---------- */
  const api = () => window.MateriaHeroImageOne;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const bool = v => { if (v && typeof v === 'object' && 'value' in v) v = v.value; return v === true || v === 'true' || v === 1; };
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f = '') => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  /* a font picker value as the Liquid prints it: family, fallbacks */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    return typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
  };
  const scheme = v => { v = v && typeof v === 'object' ? v.id : v; return typeof v === 'string' && /^[\w-]+$/.test(v) ? v : ''; };
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const plain = v => String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  function rich(el, html) {
    if (!el) return;
    if (api() && api().rich) { api().rich(el, html || '', {rich: new WeakMap()}); return; }
    const t = document.createElement('template'); t.innerHTML = String(html || '');
    t.content.querySelectorAll('script, style, iframe, object, embed').forEach(n => n.remove());
    t.content.querySelectorAll('*').forEach(n => { for (const a of [...n.attributes]) if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name); });
    if (el.innerHTML !== t.innerHTML) el.replaceChildren(t.content);
  }
  const text = (el, v) => { if (el && el.textContent !== String(v == null ? '' : v)) el.textContent = String(v == null ? '' : v); };
  const prop = (el, name, v, important) => {
    if (!el) return;
    if (v == null || v === '') { if (el.style.getPropertyValue(name)) el.style.removeProperty(name); return; }
    v = String(v);
    if (el.style.getPropertyValue(name) !== v || (important && el.style.getPropertyPriority(name) !== 'important')) el.style.setProperty(name, v, important ? 'important' : '');
  };
  const attr = (el, name, v) => {
    if (!el) return;
    if (v == null || v === false) { if (el.hasAttribute(name)) el.removeAttribute(name); return; }
    v = v === true ? '' : String(v);
    if (el.getAttribute(name) !== v) el.setAttribute(name, v);
  };
  const cls = (el, name, on) => { if (el && el.classList.contains(name) !== !!on) el.classList.toggle(name, !!on); };
  const swap = (el, list, value) => { if (!el) return; for (const c of list) if (c !== value) cls(el, c, false); if (value) cls(el, value, true); };
  const swapPrefix = (el, prefix, value) => { if (!el) return; for (const c of [...el.classList]) if (c.startsWith(prefix) && c !== prefix + value) el.classList.remove(c); if (value) cls(el, prefix + value, true); };
  const show = (el, on) => { if (!el) return; if (on) prop(el, 'display', ''); else prop(el, 'display', 'none', true); };
  /* the shared country / language pickers, told apart by their form field */
  const COUNTRY = 'localization-form:has(input[name="country_code"])', LANGUAGE = 'localization-form:has(input[name="language_code"])';
  const all = (root, sel) => root ? [...root.querySelectorAll(sel)] : [];
  const idOf = v => { if (v && typeof v === 'object') v = v.id; return v == null ? '' : String(v).replace(/^shopify-section-/, ''); };
  const blocksOf = el => Object.fromEntries(String(el.getAttribute('data-header-blocks') || el.getAttribute('data-tb-blocks') || '').trim().split(/\s+/).filter(Boolean).map(p => { const i = p.lastIndexOf(':'); return [p.slice(0, i), p.slice(i + 1)]; }));

  /* ---------- 2a. header ---------- */
  const WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width'];
  const ANIMS = ['fade-in', 'fade-in-down', 'down-to-up', 'soft-slide', 'pop-in', 'blur-in'];
  const RETIRED = ['background', 'slide_up', 'glow', 'double_line', 'uppercase', 'scale', 'subtle_fade'];
  const SHADOWS = {none: 'none', medium: '0 12px 32px -8px rgba(0, 0, 0, 0.16)', strong: '0 22px 48px -12px rgba(0, 0, 0, 0.28)'};
  const BADGES = ['hot', 'new', 'sale', 'popular', 'custom_1', 'custom_2'];
  const MEGA = ['menu_promotion', 'menu_product', 'menu_collection', 'menu_collections_only', 'menu_categories'];

  function headerState(H) {
    if (!H.__lh) {
      const t = parse(H.getAttribute('data-menu-type'));
      const hc = H.style.getPropertyValue('--menu-hover-color').trim();
      H.__lh = {
        hover: H.hasAttribute('data-menu-hover-theme') ? 'inherit' : H.getAttribute('data-menu-hover'),
        hoverColor: /^var\(/.test(hc) ? '' : hc,
        fonts: !!t.on, font: /\w/.test(String(t.font || '').split(',')[0]) ? t.font : '', size: t.size, weight: t.weight || 'theme',
        blocks: {},
      };
    }
    return H.__lh;
  }
  function hoverColor(H, st) {
    const hv = H.getAttribute('data-menu-hover');
    prop(H, '--menu-hover-color', st.hoverColor || (hv === 'color' ? 'var(--color-primary, currentColor)' : 'var(--color-link-hover, currentColor)'));
  }
  function menuType(H, st) {
    const on = st.fonts, f = on ? st.font : '', w = on && st.weight && st.weight !== 'theme' ? st.weight : '';
    attr(H, 'data-own-size', on);
    attr(H, 'data-own-font', !!f);
    attr(H, 'data-own-weight', !!w);
    prop(H, '--menu-font', f);
    prop(H, '--hs-menu-size', on ? px(st.size, 15) : '');
    prop(H, '--hs-menu-weight', w);
  }
  function mmColors(H, bg, fg) {
    const nav = H.querySelector('nav.navigation.mobile');
    if (bg != null) {
      document.documentElement.style.setProperty('--hs-mnav-title-bg', bg);
      prop(nav, '--mm-title-bg', bg);
      for (const el of all(H, '.menu-mobile-title')) { prop(el, 'background', bg, true); prop(el, '--mm-title-bg', bg); }
      for (const el of all(H, '.mm-sub-title-bar')) prop(el, 'background', bg, true);
    }
    if (fg != null) {
      document.documentElement.style.setProperty('--hs-mnav-title-color', fg);
      prop(nav, '--mm-title-color', fg);
      for (const el of all(H, '.menu-mobile-title')) { prop(el, 'color', fg, true); prop(el, '--color-heading', fg); prop(el, '--mm-title-color', fg); }
      for (const el of all(H, '.menu-mobile-title > a[data-menu]')) prop(el, 'color', fg, true);
      for (const el of all(nav, ':scope > close-menu svg')) { prop(el, 'color', fg, true); prop(el, '--color-heading', fg); }
      for (const el of all(H, '.mm-sub-title-bar')) { prop(el, 'color', fg); prop(el, '--color-heading', fg); }
    }
  }
  function applyHeader(H, s) {
    const S = H.closest('.shopify-section') || H.parentElement, st = headerState(H), index = H.hasAttribute('data-page-index');
    const inner = H.querySelector('header-inner'), widthBox = H.querySelector('.header__inner > div'), navs = all(H, 'nav.navigation'), action = H.querySelector('.header__action');
    for (const k of Object.keys(s)) {
      const v = s[k];
      switch (k) {
        case 'logo_width_desktop': prop(S, '--hs-logo-width', px(v, 120)); break;
        case 'logo_width_mobile': prop(S, '--hs-logo-width-mobile', px(v, 100)); break;
        case 'logo_position': if (inner && ['left', 'center'].includes(v)) { swap(inner, ['logo-left', 'logo-center'], 'logo-' + v); for (const sub of all(H, '.navigation .level0 > .submenu.custom-scrollbar.submenu-horizontal')) cls(sub, 'left-0', v === 'left'); } break;
        case 'color_scheme': if (scheme(v)) swapPrefix(H, 'color-', scheme(v)); break;
        case 'separator_line': cls(H, 'border-bottom', v === 'all-page' || (v === 'homepage' && index) || (v === 'inner_page' && !index)); break;
        case 'header_height': prop(S, '--hs-logo-max-height', px(num(v, 64) - 16)); prop(S, '--hs-logo-box-height', px(v, 64)); break;
        case 'section_width': if (WIDTHS.includes(v)) swap(widthBox, WIDTHS, v); break;
        case 'menu_hover_style': {
          st.hover = v || 'inherit';
          let value = RETIRED.includes(st.hover) || st.hover === 'inherit' ? H.getAttribute('data-theme-hover') || 'underline' : st.hover;
          if (RETIRED.includes(value)) value = 'underline';
          attr(H, 'data-menu-hover', value);
          attr(H, 'data-menu-hover-theme', RETIRED.includes(st.hover) || st.hover === 'inherit');
          hoverColor(H, st);
          break;
        }
        case 'menu_hover_color': st.hoverColor = color(v, ''); hoverColor(H, st); break;
        case 'dropdowns_animation': if (ANIMS.includes(v)) { for (const n of navs) swap(n, ANIMS, v); for (const ul of all(H, '.navigation .horizontal-list')) swap(ul, ANIMS.map(x => 'animation-' + x), 'animation-' + v); } break;
        case 'dropdown_shadow': prop(H, '--dd-shadow', SHADOWS[v] || '0 5px 30px 0 rgba(0, 0, 0, 0.05)'); break;
        case 'uppercase_first':
          for (const a of all(H, '.navigation .level0 > menu-item > a, .navigation .level0.hidden-1025 > a.border-bottom-1025-0, .navigation .level0 > a.border-bottom-1025-0, .mobile-nav-actions__login, .header__action .header-action-text')) cls(a, 'uppercase', bool(v));
          break;
        case 'mega_column_dividers': attr(H, 'data-mega-dividers', bool(v)); break;
        case 'mega_card_label': attr(H, 'data-mega-label', v || 'button'); for (const el of all(H, '[data-mega-card-label]')) { const c = (v || 'button') === 'button' ? 'btn inline-block bg-white heading-color py-15 px-30 text-center' : 'menu-card__label'; if (el.className !== c) el.className = c; } break;
        case 'mega_card_label_bg': prop(H, '--mega-label-bg', color(v, '')); break;
        case 'mega_card_label_color': prop(H, '--mega-label-color', color(v, '')); break;
        case 'show_search': show(action && action.querySelector('.header_search'), bool(v)); break;
        case 'show_account_icon': show(action && action.querySelector('.header_account'), bool(v)); break;
        case 'show_wishlist_icon': show(action && action.querySelector('.header__wishlist'), bool(v)); break;
        case 'show_shopping_cart': show(action && action.querySelector('.minicart'), bool(v)); break;
        case 'show_currency': for (const el of all(action, '.lang__currency-desktop ' + COUNTRY)) show(el, bool(v)); break;
        case 'show_language': for (const el of all(action, '.lang__currency-desktop ' + LANGUAGE)) show(el, bool(v)); break;
        case 'actions_as_text': attr(H, 'data-actions-text', bool(v)); break;
        case 'sticky_header_type': if (['none', 'always', 'on-scroll-up'].includes(v)) attr(H, 'data-sticky', v); break;
        case 'sticky_header_mobile': attr(H, 'data-sticky-mobile', String(bool(v))); break;
        case 'transparent_text_icon_color': prop(H, '--transparent-color', color(v, 'var(--color-heading)')); break;
        case 'transparent_hover_fill_color': prop(S, '--hs-hover-fill', color(v, '#FFFFFF')); break;
        case 'disable_white_fill_on_hover': cls(H, 'no-hover-fill', bool(v)); break;
        case 'menu_mobile_color': mmColors(H, null, color(v, '#ffffff')); break;
        case 'menu_mobile_background': mmColors(H, color(v, '#242424'), null); break;
        case 'menu_mobile_logo_height': for (const img of all(H, '.menu-mobile-title__logo')) prop(img, 'height', px(v, 28)); break;
        case 'menu_mobile_dividers': attr(H, 'data-mm-no-dividers', !bool(v)); break;
        case 'menu_dropdown_tinted_bg': attr(H, 'data-dd-tinted', bool(v)); break;
        case 'menu_mobile_chevrons': attr(H, 'data-mm-chevrons', bool(v)); break;
        case 'reset_spacing': attr(H, 'data-reset-spacing', bool(v)); break;
        case 'section_margin_top_mobile': prop(S, '--hs-margin-top', px(v)); break;
        case 'section_margin_bottom_mobile': prop(S, '--hs-margin-bottom', px(v)); break;
        case 'section_margin_top_desktop': prop(S, '--hs-margin-top-desktop', px(v)); break;
        case 'section_margin_bottom_desktop': prop(S, '--hs-margin-bottom-desktop', px(v)); break;
        case 'enable_custom_fonts': st.fonts = bool(v); menuType(H, st); break;
        case 'menu_custom_font': st.font = font(v) || st.font; menuType(H, st); break;
        case 'menu_font_size': st.size = num(v, 15); menuType(H, st); break;
        case 'menu_font_weight': st.weight = v || 'theme'; menuType(H, st); break;
      }
    }
  }
  function applyHeaderBlock(H, id, type, s) {
    const st = headerState(H), bs = st.blocks[id] || (st.blocks[id] = {});
    if (type === 'menu_badges') {
      const navs = all(H, 'nav.navigation[data-badge-style]');
      const map = {menu_badge_style: 'data-badge-style', badge_shape: 'data-badge-shape', badge_font: 'data-badge-font', badge_case: 'data-badge-case', badge_position: 'data-badge-pos'};
      for (const k of Object.keys(s)) {
        const v = s[k];
        if (map[k]) { for (const n of navs) attr(n, map[k], v || (k === 'menu_badge_style' ? 'pill' : k === 'badge_position' ? 'above' : 'style')); continue; }
        if (k === 'badge_hover') { for (const n of navs) attr(n, 'data-badge-lift', v !== false && v !== 'false'); continue; }
        if (k === 'badge_size') { for (const n of navs) prop(n, '--mb-badge-size', px(v, 10)); continue; }
        if (k === 'badge_border') { for (const n of navs) prop(n, '--mb-badge-border', px(v, 1)); continue; }
        if (BADGES.includes(k)) { for (const l of all(H, '.menu_label.' + k)) { text(l, v || ''); l.hidden = !plain(v); } continue; }
        const m = k.match(/^label_(color|background)_(.+)$/);
        if (m && BADGES.includes(m[2])) for (const n of navs) prop(n, '--' + m[2] + (m[1] === 'color' ? '-cl' : '-bg-cl'), typeof v === 'string' ? v : color(v, ''));
      }
      return;
    }
    const lis = all(H, 'li.level0').filter(li => (li.getAttribute('data-mm-blocks') || '').split(/\s+/).includes(id));
    if (type === 'menu_link_style') {
      for (const k of ['link_color', 'link_hover_color']) if (has(s, k)) bs[k] = color(s[k], '');
      for (const li of lis) {
        if (has(bs, 'link_color')) prop(li, '--menu-link-color', bs.link_color);
        if (has(bs, 'link_hover_color')) prop(li, '--menu-link-hover-color', bs.link_hover_color);
        cls(li, 'has-link-color', !!(li.style.getPropertyValue('--menu-link-color') || li.style.getPropertyValue('--menu-link-hover-color')));
      }
      return;
    }
    if (MEGA.includes(type)) {
      if (has(s, 'mega_custom_width')) for (const li of lis) for (const sub of li.querySelectorAll(':scope > .submenu')) prop(sub, '--mega_custom_width', px(s.mega_custom_width));
      return;
    }
    if (type === 'menu_mobile_banner') {
      for (const el of all(H, '[data-lh-block="' + CSS.escape(id) + '"]')) {
        const vars = {banner_bg: '--mmb-bg', banner_text: '--mmb-color', button_bg: '--mmb-btn-bg', button_color: '--mmb-btn-color'};
        for (const k of Object.keys(s)) {
          const v = s[k];
          if (vars[k]) prop(el, vars[k], color(v, ''));
          else if (k === 'radius') prop(el, '--mmb-radius', px(v, 16));
          else if (k === 'label') text(el.querySelector('.menu-mobile-banner__label'), v);
          else if (k === 'heading') text(el.querySelector('.menu-mobile-banner__heading'), v);
          else if (k === 'button_label') text(el.querySelector('.menu-mobile-banner__button'), v);
          else if (k === 'body') { const p = el.querySelector('.menu-mobile-banner__text'); if (p) { const parts = String(v || '').split('\n'); const nodes = []; parts.forEach((t, i) => { if (i) nodes.push(document.createElement('br')); nodes.push(document.createTextNode((i ? '\n' : '') + t)); }); if (p.textContent !== parts.join('\n') || p.querySelectorAll('br').length !== parts.length - 1) p.replaceChildren(...nodes); } }
          else if (k === 'button_link') { const a = el.querySelector('.menu-mobile-banner__button'); if (a) { if (v) { attr(a, 'href', String(v).replace('#_blank', '')); attr(a, 'role', null); attr(a, 'aria-disabled', null); } else { attr(a, 'href', null); attr(a, 'role', 'link'); attr(a, 'aria-disabled', 'true'); } } }
        }
      }
    }
  }

  /* ---------- 2b. top bar ---------- */
  const WEIGHTS = ['body_weight', 'heading_weight', 'subheading_weight'];
  function barState(T) {
    if (!T.__lh) {
      const b = String(T.getAttribute('data-tb-border') || 'bottom:1').split(':'), pos = String(T.getAttribute('data-tb-pos') || 'false:0').split(':'), I = T.querySelector('.topbar__section-inner');
      T.__lh = {
        border: b[0], borderWidth: num(b[1], 1), custom: pos[0] === 'true', offset: num(pos[1]),
        fonts: !!(I && I.hasAttribute('data-own-font')), font: I && I.getAttribute('data-tb-font') || '',
        showMobile: !(T.hasAttribute('data-tb-off-mobile')), allHidden: T.hasAttribute('data-tb-all-hidden'),
        blocks: {},
      };
    }
    return T.__lh;
  }
  function barBorder(T, st) {
    const w = px(st.borderWidth, 1);
    prop(T, 'border-top-width', st.border === 'top' || st.border === 'both' ? w : '0px');
    prop(T, 'border-bottom-width', st.border === 'bottom' || st.border === 'both' ? w : '0px');
    prop(T, 'border-top-style', 'solid'); prop(T, 'border-bottom-style', 'solid');
  }
  function barMobile(T, st) { const hide = !st.showMobile || st.allHidden; cls(T, 'hidden', hide); cls(T, 'block-1025', hide); }
  function applyBar(T, s) {
    const st = barState(T), S = T.closest('.shopify-section') || T.parentElement, I = T.querySelector('.topbar__section-inner');
    const slides = all(T, '.text-slide');
    for (const k of Object.keys(s)) {
      const v = s[k];
      switch (k) {
        case 'color_scheme': if (scheme(v)) swapPrefix(T, 'color-', scheme(v)); break;
        case 'section_width': if (WIDTHS.includes(v)) { swap(T.firstElementChild, WIDTHS, v); attr(T, 'data-tb-width', v); } break;
        case 'sticky_top':
          attr(T, 'data-sticky-announcement', String(bool(v)));
          prop(T, 'position', bool(v) ? 'relative' : '');
          if (bool(v)) { prop(S, 'position', 'sticky', true); prop(S, 'top', 'var(--storelib-announcement-top, 0px)', true); prop(S, 'z-index', '12'); }
          else { prop(S, 'position', 'relative', true); prop(S, 'top', 'auto', true); prop(S, 'z-index', ''); }
          break;
        case 'show_mobile': st.showMobile = bool(v); barMobile(T, st); break;
        case 'text_align': prop(T, '--tb-justify', v === 'left' ? 'flex-start' : v === 'right' ? 'flex-end' : 'center'); prop(T, '--tb-align', ['left', 'right'].includes(v) ? v : 'center'); break;
        case 'uppercase': cls(T, 'uppercase', bool(v)); break;
        case 'font_size': prop(I, '--font-size', String(num(v, 13))); break;
        case 'font_weight': if (WEIGHTS.includes(v)) swap(I, WEIGHTS, v); break;
        case 'letter_spacing': prop(I, 'letter-spacing', px(v)); break;
        case 'enable_custom_fonts': st.fonts = bool(v); attr(I, 'data-own-font', st.fonts && !!st.font); prop(I, '--tb-font', st.fonts ? st.font : ''); break;
        case 'font': st.font = font(v) || st.font; attr(I, 'data-tb-font', st.font); attr(I, 'data-own-font', st.fonts && !!st.font); prop(I, '--tb-font', st.fonts ? st.font : ''); break;
        case 'border_position': st.border = v || 'bottom'; barBorder(T, st); break;
        case 'border_width': st.borderWidth = num(v, 1); barBorder(T, st); break;
        case 'show_arrows': for (const el of slides) { cls(el, 'topbar-has-arrows', bool(v) && !!el.querySelector('.topbar-slider-arrow')); for (const b of el.querySelectorAll('.topbar-slider-arrow')) show(b, bool(v)); } break;
        case 'show_arrows_mobile': for (const el of slides) cls(el, 'topbar-mobile-arrows', bool(v)); break;
        case 'transition_speed': for (const r of all(T, 'announcement-rotator-v2')) attr(r, 'data-duration', String(num(v, 700))); break;
        case 'change_every': for (const r of all(T, '[data-tb-messages] announcement-rotator-v2')) attr(r, 'data-delay', String(num(v, 5))); break;
        case 'padding_top': prop(T, '--section-pt', String(num(v))); cls(T, 'pt-min', num(v) < 30); break;
        case 'padding_bottom': prop(T, '--section-pb', String(num(v))); cls(T, 'pb-min', num(v) < 30); break;
        case 'enable_custom_position': case 'desktop_horizontal_offset':
          if (k === 'enable_custom_position') st.custom = bool(v); else st.offset = num(v);
          attr(T, 'data-tb-offset', st.custom && st.offset !== 0);
          prop(T, '--tb-offset', st.custom && st.offset !== 0 ? st.offset + '%' : '');
          break;
        case 'section_margin_top_mobile': prop(S, '--tb-mt', px(v)); break;
        case 'section_margin_bottom_mobile': prop(S, '--tb-mb', px(v)); break;
        case 'section_margin_top_desktop': prop(S, '--tb-mt-d', px(v)); break;
        case 'section_margin_bottom_desktop': prop(S, '--tb-mb-d', px(v)); break;
      }
    }
  }
  function applyBarBlock(T, id, type, s) {
    const st = barState(T), bs = st.blocks[id] || (st.blocks[id] = {});
    if (type === 'message') {
      const slide = T.querySelector('.topbar-message[data-tb-block="' + CSS.escape(id) + '"]');
      if (!slide) return;
      if (!has(bs, 'mobileOwn')) Object.assign(bs, {mobileOwn: slide.hasAttribute('data-tb-mobile-own'), custom: slide.hasAttribute('data-tb-own-color'), color: slide.getAttribute('data-tb-color') || ''});
      if (has(s, 'text')) { bs.text = s.text; rich(slide.querySelector('[data-tb-text]'), s.text); if (!bs.mobileOwn) rich(slide.querySelector('[data-tb-text-mobile]'), s.text); }
      if (has(s, 'text_mobile')) { bs.mobileOwn = !!plain(s.text_mobile); attr(slide, 'data-tb-mobile-own', bs.mobileOwn); rich(slide.querySelector('[data-tb-text-mobile]'), bs.mobileOwn ? s.text_mobile : (has(bs, 'text') ? bs.text : slide.querySelector('[data-tb-text]').innerHTML)); }
      if (has(s, 'link')) { const a = slide.querySelector('[data-tb-link]'); if (a && s.link) attr(a, 'href', s.link); }
      if (has(s, 'enable_custom_style')) bs.custom = bool(s.enable_custom_style);
      if (has(s, 'text_color')) { bs.color = color(s.text_color, ''); attr(slide, 'data-tb-color', bs.color); }
      if (has(s, 'enable_custom_style') || has(s, 'text_color')) { const on = bs.custom && !!bs.color; attr(slide, 'data-tb-own-color', on); prop(slide, '--tb-msg-color', on ? bs.color : ''); }
      return;
    }
    const el = T.querySelector('[data-tb-block="' + CSS.escape(id) + '"]');
    if (!el) return;
    if (has(s, 'hidden_on_mobile')) {
      const off = bool(s.hidden_on_mobile);
      if (type === 'socials' || type === 'text_slider') { cls(el, 'hidden', off); cls(el, 'block-1025', off); }
      else { cls(el, 'hidden', off); cls(el, 'flex-1025', off); cls(el, 'flex', !off); }
    }
    if (type === 'text_slider') {
      if (has(s, 'change_every')) attr(el.querySelector('announcement-rotator-v2'), 'data-delay', String(num(s.change_every, 5)));
      for (const n of [1, 2, 3]) {
        const slide = el.querySelector('[data-tb-slide="' + n + '"]');
        if (!slide) continue;
        const k = 'text' + n, km = k + '_mobile';
        if (!has(bs, km)) bs[km] = slide.hasAttribute('data-tb-mobile-own');
        if (has(s, k)) { const lg = slide.querySelector('[data-tb-text]'); if (lg) rich(lg, s[k]); if (!bs[km]) rich(slide.querySelector('[data-tb-text-mobile]'), s[k]); bs[k] = s[k]; }
        if (has(s, km)) { bs[km] = !!plain(s[km]); attr(slide, 'data-tb-mobile-own', bs[km]); const lg = slide.querySelector('[data-tb-text]'); rich(slide.querySelector('[data-tb-text-mobile]'), bs[km] ? s[km] : (has(bs, k) ? bs[k] : lg ? lg.innerHTML : '')); }
      }
    }
    if (type === 'store_information') {
      if (has(s, 'show_phone')) show(el.querySelector('a[href^="tel:"]'), bool(s.show_phone));
      if (has(s, 'show_email')) show(el.querySelector('a[href^="mailto:"]'), bool(s.show_email));
    }
    if (type === 'cur_lang') {
      if (has(s, 'show_currency')) for (const f of all(el, COUNTRY)) show(f, bool(s.show_currency));
      if (has(s, 'show_language')) for (const f of all(el, LANGUAGE)) show(f, bool(s.show_language));
    }
  }

  /* ---------- events, once per frame per instance ---------- */
  const pending = new Map();
  let frame = 0;
  function flush() {
    frame = 0;
    for (const [root, job] of pending) {
      if (!root.isConnected) continue;
      const isHeader = root.matches('header.header');
      if (Object.keys(job.s).length) (isHeader ? applyHeader : applyBar)(root, job.s);
      if (job.b.size) {
        const types = blocksOf(root);
        for (const [id, bs] of job.b) { const type = job.t.get(id) || types[id]; if (type) (isHeader ? applyHeaderBlock : applyBarBlock)(root, id, type, bs); }
      }
    }
    pending.clear();
  }
  function rootOf(id) {
    const css = CSS.escape(id);
    return document.querySelector('header.header[data-section-id="' + css + '"]') || document.querySelector('[data-announcement-three="' + css + '"]');
  }
  document.addEventListener('storelib:settings-change', event => {
    const d = event.detail || {}, id = idOf(d.section ?? d.sectionId);
    if (!id || !d.settings || typeof d.settings !== 'object') return;
    const root = rootOf(id);
    if (!root) return;
    let job = pending.get(root);
    if (!job) pending.set(root, job = {s: {}, b: new Map(), t: new Map()});
    const bid = idOf(d.block ?? d.blockId ?? d.block_id);
    if (bid) {
      job.b.set(bid, Object.assign(job.b.get(bid) || {}, d.settings));
      const bt = d.block && typeof d.block === 'object' ? d.block.type : d.blockType || d.block_type;
      if (bt) job.t.set(bid, bt);
    } else Object.assign(job.s, d.settings);
    if (!frame) frame = requestAnimationFrame(flush);
  });
  /* A redrawn section is new markup from the Liquid; the state of the one it
     replaced goes with it. Nothing else to set up again here. */
  window.MateriaLiveHeader = {applyHeader, applyHeaderBlock, applyBar, applyBarBlock, flush: () => { cancelAnimationFrame(frame); flush(); }};
})();