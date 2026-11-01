/* Materia Themes. Live editor updates and runtimes for the product page
   extras: People Also Bought (related-products) and the Floating video
   (shopable-video-sticky).

   The other product page extras (bought together, product grouped, bundle
   item, pickup availability, review badge, media gallery grid/slide) are
   section renders that main-product.js, theme.js and pickup-availability.js
   fetch with ?section_id= and copy into the product page. They have no
   settings a creator edits, so nothing here touches them.

   related-products: the root [data-rp-root] carries its section id and the
   live settings as JSON (data-rp-settings). The Liquid prints the same
   classes, variables and attributes, so the first derive is only recorded,
   never painted. After that a value is written only when it changes, one
   frame per root: product cards are never rebuilt for a heading or colour
   edit. Card switches, products and the recommendation type change what the
   store returns, so they wait for the builder's redraw.

   shopable-video-sticky: the <shopable-video-sticky> element (defined here
   when the section's own script has not, so a redrawn section works in the
   builder) slides the video in after the visitor scrolls 300px, at once in
   the builder, with one passive scroll listener per element that is removed
   with it. Under reduced motion the video does not autoplay. Live edits move
   it (distance from bottom and side), switch the scheme and the stay-closed
   option. */
(() => {
  if (window.MateriaProductExtras) return;
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, f) => { const n = parseFloat(v); return Number.isFinite(n) ? n : f; };
  const api = () => window.MateriaHeroImageOne;
  const sid = v => { if (v && typeof v === 'object') v = v.id ?? v.sectionId; return v == null ? '' : String(v).replace(/^shopify-section-/, ''); };
  const color = v => {
    if (api() && api().color) return api().color(v, '') || '';
    if (v && typeof v === 'object') { if (v.alpha === 0) return ''; v = v.hex ?? v.value; }
    v = typeof v === 'string' ? v.trim() : '';
    return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : '';
  };
  const fontCss = v => {
    if (!v) return '';
    if (typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    if (/,/.test(v)) return v; /* already a CSS family list (first paint) */
    const fam = api() && api().font ? api().font(v) : '';
    return !fam || /^var\(/.test(fam) ? '' : fam;
  };
  const scheme = v => (v && typeof v === 'object' ? v.id : v) || 'default-color-scheme';
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const design = () => !!(window.Shopify && Shopify.designMode) || document.documentElement.classList.contains('shopify-design-mode');

  /* ---------- writers shared by both sections ---------- */
  const richState = {rich: new WeakMap()};
  function write(el, key, v) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key.startsWith('cls:')) el.classList.toggle(key.slice(4), !!v);
    else if (key.startsWith('grp:')) { for (const c of key.slice(4).split('|')) if (c) el.classList.remove(c); if (v) el.classList.add(v); }
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'rich') { if (api() && api().rich) api().rich(el, v, richState); else el.textContent = String(v || '').replace(/<[^>]*>/g, ''); }
    else if (key.startsWith('style:')) el.style[key.slice(6)] = v;
  }
  function paint(st) {
    st.frame = 0;
    if (!st.el.isConnected) return;
    for (const [el, key, v] of st.derive(st)) {
      if (!el) continue;
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (m.has(key) && m.get(key) === v) continue;
      m.set(key, v);
      write(el, key, v);
    }
  }
  const record = st => { for (const [el, key, v] of st.derive(st)) { if (!el) continue; let m = st.last.get(el); if (!m) st.last.set(el, m = new Map()); m.set(key, v); } };
  const schedule = st => { if (!st.frame) st.frame = requestAnimationFrame(() => paint(st)); };

  /* ---------- related-products ---------- */
  function rpDerive(st) {
    const r = st.el, s = st.s, out = [];
    const q = sel => r.querySelector(sel);
    const width = q('[data-rp-width]'), header = q('.section__header'), h2 = q('.section__header-heading'), hm = h2 && h2.closest('motion-element'), des = q('.section__header-des'), grid = q('[data-rp-grid]');
    const pt = num(s.padding_top, 0), pb = num(s.padding_bottom, 0), custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
    const hc = custom ? color(s.heading_color) : '', tc = custom ? color(s.text_color) : '', bg = custom ? color(s.background_color) : '';
    const hf = fonts ? fontCss(s.heading_font) : '', bf = fonts ? fontCss(s.body_font) : '';
    const heading = String(s.heading ?? ''), description = String(s.description ?? '');
    const blank = h => !String(h).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    out.push([r, 'scheme', scheme(s.color_scheme)]);
    out.push([r, '@data-rp-reset', bool(s.reset_spacing)], [r, 'cls:remove_spacing', bool(s.reset_spacing)]);
    out.push([r, '--section-pt', String(pt)], [r, '--section-pb', String(pb)], [r, 'cls:pt-min', pt < 30], [r, 'cls:pb-min', pb < 30]);
    out.push([r, '--rp-heading-color', hc], [r, '--rp-text-color', tc], [r, '--rp-bg', bg], [r, '@data-rp-bg', !!bg]);
    out.push([r, '--rp-heading-font', hf], [r, '--rp-body-font', bf]);
    out.push([width, 'grp:container|fluid_container|stretch_width|full_width', s.section_width || 'fluid_container']);
    out.push([header, 'grp:text-left|text-center|text-right', 'text-' + (s.header_alignment || 'left')], [header, 'cls:px-20', s.section_width === 'full_width'], [header, '@data-rp-hidden', blank(heading) && blank(description)]);
    out.push([hm, '@data-rp-hidden', blank(heading)], [h2, 'rich', heading], [h2, 'grp:h3|h1-size', s.header_size === 'small' ? 'h3' : s.header_size === 'large' ? 'h1-size' : ''], [h2, 'grp:mb-10|mb-0', blank(description) ? 'mb-0' : 'mb-10'], [h2, '@data-own-font', !!hf]);
    out.push([des, 'rich', description], [des, '@data-own-font', !!bf], [des, '@data-rp-hidden', blank(description)]);
    if (grid) {
      const d = num(s.items_per_row, 4), m = num(s.items_per_row_mobile, 2), g = num(s.column_gap, 30);
      out.push([grid, '--col-desktop', String(d)], [grid, '--col-number', String(m)], [grid, '--col-mobile', String(m)], [grid, '--col-tablet', String(d > 3 ? 3 : d)]);
      out.push([grid, '--col-gap', (g < 15 ? g : 15) + 'px'], [grid, '--col-gap-desktop', g < 15 ? '' : g + 'px']);
      out.push([grid, 'cls:row-gap-20', g < 31], [grid, 'cls:row-gap-md-30', g < 31], [grid, 'cls:grid_scroll', m > 1 && m < 2], [grid, '@data-free-scroll', m > 1 && m < 2 ? 'true' : false]);
    }
    return out;
  }
  /* The first paint prints computed values; keep the creator's raw values once an edit arrives. */
  function rpMerge(st, settings) {
    for (const [k, v] of Object.entries(settings)) st.s[k] = v;
  }

  /* ---------- shopable-video-sticky ---------- */
  function svsDerive(st) {
    const r = st.el, s = st.s, box = r.querySelector('.mini-video__video'), out = [];
    out.push([r, 'scheme', scheme(s.color_scheme)], [r, '@data-action-close', String(bool(s.action_close))]);
    if (box) out.push([box, 'style:bottom', num(s.offset_bottom, 150) + 'px'], [box, '--left', num(s.offset_left, 25) + 'px']);
    return out;
  }
  const COOKIE = 'video_sticky_closed';
  const closedCookie = () => document.cookie.split(';').some(c => c.trim() === COOKIE + '=true');
  const SVS = class extends HTMLElement {
    connectedCallback() {
      this.box = this.querySelector('.mini-video__video');
      this.closeButton = this.querySelector('.close-mini-video');
      this.closed = false;
      this.ac?.abort(); this.ac = new AbortController();
      const sig = {signal: this.ac.signal};
      this.onScroll = () => { if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.update(); }); };
      window.addEventListener('scroll', this.onScroll, {passive: true, ...sig});
      this.closeButton?.addEventListener('click', () => {
        this.closed = true; this.toggle(false);
        if (this.getAttribute('data-action-close') === 'true' && !design()) {
          const d = new Date(Date.now() + 864e5);
          document.cookie = COOKIE + '=true; expires=' + d.toUTCString() + '; path=/; SameSite=Lax';
        }
      }, sig);
      this.motion = matchMedia('(prefers-reduced-motion: reduce)');
      this.motion.addEventListener('change', () => this.video(), sig);
      this.video();
      this.update();
    }
    disconnectedCallback() { this.ac?.abort(); if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; }
    update() {
      if (this.closed) return;
      if (design()) return this.toggle(true);
      if (this.getAttribute('data-action-close') === 'true' && closedCookie()) return this.toggle(false);
      if (window.scrollY > 300) this.toggle(true);
    }
    toggle(on) { this.box?.classList.toggle('is-visible', !!on); }
    video() {
      const v = this.querySelector('video'); if (!v) return;
      if (reduce()) { v.autoplay = false; v.removeAttribute('autoplay'); v.pause(); }
      else if (!v.autoplay) { v.autoplay = true; v.muted = true; if (v.currentSrc || v.getAttribute('src')) v.play()?.catch(() => {}); }
    }
  };
  if (!customElements.get('shopable-video-sticky')) customElements.define('shopable-video-sticky', SVS);

  /* ---------- lifecycle ---------- */
  const KINDS = [
    {sel: '[data-rp-root]', id: el => el.dataset.rpSection, s: el => parse(el.dataset.rpSettings), derive: rpDerive, merge: rpMerge},
    {sel: '[data-svs-root]', id: el => el.dataset.svsSection, s: el => ({color_scheme: ([...el.classList].find(c => c.startsWith('color-')) || 'color-default-color-scheme').slice(6), action_close: el.getAttribute('data-action-close') === 'true', offset_bottom: parseFloat(el.querySelector('.mini-video__video')?.style.bottom) || 150, offset_left: parseFloat(el.querySelector('.mini-video__video')?.style.getPropertyValue('--left')) || 25}), derive: svsDerive, merge: (st, x) => Object.assign(st.s, x)},
  ];
  const roots = new Map();
  function scan() {
    for (const st of [...roots.values()]) if (!st.el.isConnected) { if (st.frame) cancelAnimationFrame(st.frame); roots.delete(st.el); }
    for (const k of KINDS) for (const el of document.querySelectorAll(k.sel)) if (!roots.has(el)) {
      const st = {el, kind: k, id: k.id(el) || '', s: k.s(el), derive: k.derive, last: new Map(), frame: 0};
      record(st);
      roots.set(el, st);
    }
  }
  const find = id => { for (const st of roots.values()) if (st.id === id && st.el.isConnected) return st; return null; };
  function onChange(e) {
    const d = e.detail || {}, id = sid(d.section);
    if (!id || !d.settings || typeof d.settings !== 'object') return;
    if (d.block ?? d.blockId ?? d.block_id) return; /* the floating video's block (product, poster, video) is drawn by the builder's redraw */
    let st = find(id);
    if (!st) { scan(); st = find(id); if (!st) return; }
    st.kind.merge(st, d.settings);
    schedule(st);
    if (st.kind.sel === '[data-svs-root]' && 'action_close' in d.settings) requestAnimationFrame(() => st.el.update && st.el.update());
  }
  /* Derived outputs that differ from the markup (tests). */
  function audit(el) {
    const st = roots.get(el); if (!st) return ['not initialised'];
    const bad = [];
    for (const [e, key, v] of st.derive(st)) {
      if (!e) continue;
      let have, want = v;
      if (key.startsWith('--')) { have = e.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v); }
      else if (key[0] === '@') { have = e.hasAttribute(key.slice(1)) ? e.getAttribute(key.slice(1)) : null; want = v === false || v == null ? null : v === true ? '' : String(v); }
      else if (key.startsWith('cls:')) { have = e.classList.contains(key.slice(4)); want = !!v; }
      else if (key.startsWith('grp:')) { have = key.slice(4).split('|').filter(c => c && e.classList.contains(c)).join(' '); want = v || ''; }
      else if (key === 'scheme') { have = ([...e.classList].find(c => c.startsWith('color-')) || '').slice(6); }
      else if (key === 'rich') { have = e.textContent.replace(/\s+/g, ' ').trim(); const t = document.createElement('template'); t.innerHTML = String(v || ''); want = t.content.textContent.replace(/\s+/g, ' ').trim(); }
      else if (key.startsWith('style:')) { have = e.style[key.slice(6)]; }
      if (have !== want) bad.push(key + ' on ' + e.tagName + '.' + String(e.className).split(' ')[0] + ': ' + JSON.stringify(have) + ' != ' + JSON.stringify(want));
    }
    return bad;
  }
  ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load'].forEach(n => document.addEventListener(n, scan));
  document.addEventListener('storelib:settings-change', onChange);
  const SEL = KINDS.map(k => k.sel).join(',');
  new MutationObserver(recs => { if (recs.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))))) scan(); }).observe(document.documentElement, {childList: true, subtree: true});
  window.MateriaProductExtras = {scan, audit, count: () => roots.size};
  scan();
})();
