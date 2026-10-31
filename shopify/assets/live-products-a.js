/* Materia Themes. Live editor updates for the products-a Products sections:
   Featured product, Product Info Box and Product information tabs.

   Every root [data-pa-root] carries its section id and current settings as
   JSON; every block [data-pa-block] carries its own. derive() turns settings
   into outputs (a CSS variable, a class, an attribute, text...) per element.
   The Liquid prints the same outputs, so on load the first derive is only
   recorded, never painted. After that an output is written only when its
   value changes, one frame per root, so a picture never reloads and the
   product gallery is never rebuilt for an unrelated edit. Settings that
   change the markup itself (the product, the gallery layout, zoom, badges
   picked one by one, what a tab shows) wait for the builder's redraw, after
   which the new root is picked up once.

   Also the runtime of two of these sections, on the storefront too: Product
   Info Box's expandable rows and the information tabs (click, arrow keys,
   Home and End), each root on its own. audit() compares the derived outputs
   with the markup (used by the tests). */
(() => {
  if (window.MateriaProductsA) return;
  const SEL = '[data-pa-root]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const on = v => !(v === false || v === 'false');
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = v => num(v) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const fontCss = (v, f) => {
    if (v && typeof v === 'object' && v.family) return v.family + ', ' + (v.fallback_families || 'sans-serif');
    const fam = api() && api().font ? api().font(v) : '';
    return !fam ? f : /^var\(|,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const schemeId = v => { const id = v && typeof v === 'object' ? v.id : v; return typeof id === 'string' && /^[\w-]+$/.test(id) ? id : ''; };
  const WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width'];

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = String(value || '').replace(/<[^>]*>/g, '');
  }
  function write(el, key, v, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); if (st && el === st.wrap) { let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(key); } }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') el.classList.toggle(key.slice(1), !!v);
    else if (key === 'width') { for (const w of WIDTHS) el.classList.toggle(w, w === v); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'scheme') { if (!v) return; for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'icon') {
      const tpl = st.root.querySelector('template[data-pib-icons]'), svg = tpl && tpl.content.querySelector('svg[data-icon="' + CSS.escape(v) + '"]');
      if (svg) el.replaceChildren(svg.cloneNode(true));
    }
  }

  /* ---------- section types ---------- */
  const TYPES = {
    'featured-product': {
      bp: 768,
      derive(c) {
        const {root, s, put, q, wrap} = c;
        put(root, 'scheme', schemeId(s.color_scheme));
        put(root, '--section-pt', String(num(s.padding_top)));
        put(root, '--section-pb', String(num(s.padding_bottom)));
        put(root, '.pt-min', num(s.padding_top) < 30);
        put(root, '.pb-min', num(s.padding_bottom) < 30);
        put(root, '.feature_product-center', bool(s.center));
        put(root, '@data-fp-thumbs', on(s.show_thumbnails) ? 'true' : 'false');
        put(root, '@data-fp-size-chart', on(s.enable_size_chart) ? 'true' : 'false');
        put(root, '@data-fp-checkout', on(s.enable_dynamic_checkout) ? 'true' : 'false');
        const content = q('.featured-product__content');
        if (content) {
          if (WIDTHS.includes(s.section_width)) put(content, 'width', s.section_width);
          const row = content.querySelector(':scope > div');
          if (row) { put(row, '--col-width', num(s.desktop_media_width, 50) + '%'); put(row, '.flex-row-reverse', s.desktop_main_image_position === 'right'); }
        }
        const info = q('.product-detail__information > div');
        if (info) { const sticky = on(s.enable_sticky_content_on_desktop); put(info, '.sticky', sticky); put(info, '.top-30', sticky); }
        const link = q('.pdp-view-link');
        if (link) { put(link, 'hidden', !bool(s.show_view_link)); const label = link.querySelector('[data-fp-view-label]'); if (label) put(label, 'text', String(s.view_link_label || '').trim() || 'View product'); }
        if (wrap) for (const [k, id] of [['--fp-mt-m', 'section_margin_top_mobile'], ['--fp-mb-m', 'section_margin_bottom_mobile'], ['--fp-mt-d', 'section_margin_top_desktop'], ['--fp-mb-d', 'section_margin_bottom_desktop']]) put(wrap, k, px(s[id]));
      },
    },
    'product-info-box': {
      bp: 768,
      derive(c) {
        const {root, s, put} = c, own = bool(s.enable_custom_style), pick = (v, f) => own ? color(v, f) : f;
        const muted = 'color-mix(in srgb, var(--color-text) 75%, transparent)';
        put(root, 'scheme', schemeId(s.color_scheme));
        put(root, '@data-width', s.section_width || 'full_width');
        put(root, '--pib-bg', pick(s.box_bg, 'var(--color-background)'));
        put(root, '--pib-border', pick(s.border_color, 'var(--color-border)'));
        put(root, '--pib-text', pick(s.text_color, 'var(--color-text)'));
        put(root, '--pib-muted', pick(s.muted_color, muted));
        put(root, '--pib-radius', px(s.box_radius));
        put(root, '--pib-row-pad-y', px(s.row_pad_y));
        put(root, '--pib-row-pad-x', px(s.row_pad_x));
        put(root, '--pib-pt', px(s.margin_top));
        put(root, '--pib-pb', px(s.margin_bottom));
        put(root, '--pib-msg-fs', px(num(s.message_size, 15)));
        put(root, '--pib-title-fs', px(num(s.title_size, 15)));
        put(root, '--pib-body-fs', px(num(s.body_size, 14)));
        put(root, '--pib-font', bool(s.enable_custom_fonts) ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)');
      },
      block(c, el, b, type) {
        const {put} = c;
        if (type === 'top_row') {
          const ic = el.querySelector('.pib__top-icon'), t = el.querySelector('.pib__top-text');
          if (ic) { put(ic, 'hidden', !bool(b.show_icon)); put(ic, 'icon', b.icon || 'info'); put(ic, '--pib-icon', bool(b.enable_custom_style) ? color(b.icon_color, 'var(--color-heading)') : 'var(--color-heading)'); }
          if (t) put(t, 'rich', b.text || '');
        } else if (type === 'collapsible') {
          const btn = el.querySelector('[data-pib-toggle]'), t = el.querySelector('.pib__summary-text'), a = el.querySelector('.pib__answer');
          if (t) put(t, 'text', b.title || '');
          if (a) put(a, 'rich', b.body || '');
          put(el, '@data-open', bool(b.open_default) ? '1' : null);
          if (btn) put(btn, '@aria-expanded', bool(b.open_default) ? 'true' : 'false');
        } else if (type === 'badges') {
          const row = el.querySelector('.pib__badges');
          if (row) put(row, '--pib-badge-h', px(num(b.badge_height, 24)));
        }
      },
    },
    'product-information-tab': {
      bp: 768,
      derive(c) {
        const {root, s, put, q} = c, own = bool(s.enable_custom_style), pick = (v, f) => own ? color(v, f) : f;
        put(root, 'scheme', schemeId(s.color_scheme));
        put(root, '@data-align', s.tab_alignment || 'left');
        put(root, '--section-pt', String(num(s.padding_top)));
        put(root, '--section-pb', String(num(s.padding_bottom)));
        put(root, '.pt-min', num(s.padding_top) < 30);
        put(root, '.pb-min', num(s.padding_bottom) < 30);
        put(root, '--pit-tab', pick(s.tab_color, 'color-mix(in srgb, var(--color-heading) 60%, transparent)'));
        put(root, '--pit-tab-active', pick(s.tab_active_color, 'var(--color-heading)'));
        put(root, '--pit-text', pick(s.text_color, 'var(--color-text)'));
        put(root, '--pit-tab-fs', px(num(s.tab_size, 16)));
        put(root, '--pit-gap-d', px(num(s.tab_gap, 60)));
        put(root, '--pit-gap-m', px(num(s.tab_gap_mobile, 30)));
        const w = q('[data-pit-width]');
        if (w && WIDTHS.includes(s.section_width)) put(w, 'width', s.section_width);
      },
      block(c, el, b, type) {
        const {put, root} = c, a = el.querySelector('a[role="tab"]');
        if (type === 'description' && a) put(a, 'text', String(b.title || '').trim() || 'Description');
        if (type === 'custom_tab') {
          if (a) put(a, 'text', b.title || '');
          const panel = root.querySelector('#proTabs' + CSS.escape(el.dataset.paBlock)), body = panel && panel.querySelector('[data-pit-rich]'), note = panel && panel.querySelector('[data-pit-empty]');
          if (body) put(body, 'rich', b.content_rich || '');
          if (note) put(note, 'hidden', !!String(b.content_rich || '').replace(/<[^>]*>/g, '').trim());
        }
      },
    },
  };

  /* ---------- engine ---------- */
  function derive(root, st, record) {
    const type = TYPES[root.dataset.paRoot]; if (!type) return [];
    const out = [];
    const put = (el, key, v) => {
      if (!el) return el;
      out.push([el, key, v]);
      if (record === 'audit') return el;
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      m.set(key, v);
      write(el, key, v, st);
      return el;
    };
    const blocks = [...root.querySelectorAll('[data-pa-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.paBlock;
      if (st.rawBlocks.get(id) !== el.dataset.paSettings) { st.rawBlocks.set(id, el.dataset.paSettings); st.blocks.set(id, {...parse(el.dataset.paSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.paType, b: st.blocks.get(id) || {}};
    });
    const c = {root, st, s: st.s, put, blocks, wrap: st.wrap, desktop: st.mq.matches, q: sel => root.querySelector(sel)};
    type.derive(c);
    if (type.block) for (const x of blocks) type.block(c, x.el, x.b, x.type);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.paSettings) { st.raw = root.dataset.paSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
  }

  /* ---------- runtimes ---------- */
  function boxRuntime(root, st) {
    root.addEventListener('click', e => {
      const btn = e.target.closest('[data-pib-toggle]');
      if (!btn || btn.closest(SEL) !== root) return;
      const row = btn.closest('[data-pib-coll]'); if (!row) return;
      const open = row.getAttribute('data-open') !== '1';
      if (open) row.setAttribute('data-open', '1'); else row.removeAttribute('data-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }, {signal: st.ac.signal});
  }
  function selectTab(root, tab, focus) {
    const tabs = [...root.querySelectorAll('a[role="tab"]')].filter(t => t.closest(SEL) === root);
    for (const t of tabs) {
      const sel = t === tab, li = t.closest('.data.item'), panel = root.querySelector('#' + CSS.escape(t.getAttribute('aria-controls') || ''));
      t.setAttribute('aria-selected', sel ? 'true' : 'false');
      t.tabIndex = sel ? 0 : -1;
      if (li) li.classList.toggle('active', sel);
      if (panel) {
        panel.classList.toggle('active', sel);
        panel.hidden = !sel;
        const inner = panel.querySelector(':scope > .tab-panel'); if (inner) inner.style.display = sel ? 'block' : 'none';
      }
    }
    if (focus) { tab.focus({preventScroll: true}); tab.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); }
  }
  function tabsRuntime(root, state) {
    const sig = {signal: state.ac.signal};
    const tabs = () => [...root.querySelectorAll('a[role="tab"]')].filter(t => t.closest(SEL) === root);
    root.addEventListener('click', e => {
      const tab = e.target.closest('a[role="tab"]');
      if (!tab || tab.closest(SEL) !== root) return;
      e.preventDefault();
      if (tab.getAttribute('aria-selected') !== 'true') selectTab(root, tab, false);
    }, sig);
    root.addEventListener('keydown', e => {
      const tab = e.target.closest && e.target.closest('a[role="tab"]');
      if (!tab || tab.closest(SEL) !== root) return;
      const list = tabs(), i = list.indexOf(tab);
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = list[(i + 1) % list.length];
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = list[(i - 1 + list.length) % list.length];
      else if (e.key === 'Home') next = list[0];
      else if (e.key === 'End') next = list[list.length - 1];
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); selectTab(root, tab, false); return; }
      if (!next) return;
      e.preventDefault();
      selectTab(root, next, true);
    }, sig);
  }

  function drop(root, state) {
    state.ac.abort(); state.mq.removeEventListener('change', state.schedule);
    cancelAnimationFrame(state.frame); roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.paRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    /* A redraw brings its own values: what a live edit wrote on the section's wrapper goes. */
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const state = {root, wrap, live: {}, liveBlocks: new Map(), s: parse(root.dataset.paSettings), raw: root.dataset.paSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), ac: new AbortController(),
      mq: matchMedia('(min-width: ' + type.bp + 'px)'), reduced: matchMedia('(prefers-reduced-motion: reduce)')};
    state.schedule = () => { if (!state.frame) state.frame = requestAnimationFrame(() => { state.frame = 0; if (root.isConnected) paint(root, state); }); };
    state.mq.addEventListener('change', state.schedule);
    roots.set(root, state);
    derive(root, state, true);
    if (root.dataset.paRoot === 'product-info-box') boxRuntime(root, state);
    if (root.dataset.paRoot === 'product-information-tab') tabsRuntime(root, state);
    root.dataset.paReady = '';
  }
  function scan() {
    for (const [root, state] of roots) if (!root.isConnected) drop(root, state);
    for (const root of document.querySelectorAll(SEL)) { const state = roots.get(root); if (state) state.schedule(); else add(root); }
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id || v.sectionId || '' : v || '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId || d.section_id); if (!id || !d.settings) return;
    const bRaw = d.block || d.blockId || d.block_id, bid = bRaw ? String(bRaw.id || bRaw) : '';
    for (const [root, state] of roots) {
      if (root.dataset.paSection !== id) continue;
      if (bid) { state.liveBlocks.set(bid, {...state.liveBlocks.get(bid), ...d.settings}); state.blocks.set(bid, {...state.blocks.get(bid), ...d.settings}); }
      else { Object.assign(state.live, d.settings); Object.assign(state.s, d.settings); }
      state.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-pa-block]') || n.querySelector(SEL + ',[data-pa-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-pa-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-pa-settings']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const state = roots.get(root); if (!state) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, state, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = (el === state.wrap ? getComputedStyle(el) : el.style).getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); want = v == null || v === false ? null : String(v); }
      else if (key[0] === '.') { have = el.classList.contains(key.slice(1)); want = !!v; }
      else if (key === 'width') { have = el.classList.contains(v); want = true; }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { if (!v) continue; have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'text') { have = el.textContent.trim(); want = String(v == null ? '' : v).trim(); }
      else continue;
      if (have !== want) bad.push((el.dataset.paBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaProductsA = {scan, audit, roots, selectTab};
  scan();
})();
