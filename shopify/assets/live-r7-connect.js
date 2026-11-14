/* Materia Themes. Newsletter Split (sections/newsletter-split.storelib) and
   Follow Us (sections/social-follow-cta.storelib). Linked by those two
   sections only, so it runs on pages that have one.

   The sign-up of Newsletter Split is sent by materia-forms.js (the same path
   as the Newsletter section); this file does not touch it.

   Follow Us pictures: on a phone the row is a native scroller (scroll snap)
   that a finger moves. The arrows and the arrow keys on the focused row move
   it by one picture (smoothly, at once under reduced motion), and an arrow
   is disabled at its end, read in a passive, frame-throttled scroll listener.

   Live edits (builder only): every root [data-r7n] carries its settings as
   JSON and every block its own. derive() turns them into outputs (a CSS
   variable, an attribute, text) per element, the same values the templates
   print, so on load the first derive is only recorded. After that an output
   is written only when its value changes, once per frame per root, so a
   typed address stays typed and an unchanged picture is never loaded again.
   audit() lists outputs whose markup differs (tests). */
(() => {
  if (window.MateriaR7Connect) return;
  const SEL = '[data-r7n]';
  const TYPES = {'newsletter-split': {kind: 'split', align: 'left', pd: 60, pm: 40}, 'social-follow-cta': {kind: 'follow', align: 'center', pd: 60, pm: 40}};
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const localUrl = v => { v = v && typeof v === 'object' ? v.url || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return ['http:', 'https:', 'mailto:', 'tel:', 'shopify:'].includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = v => (api() && api().url ? api().url(v, false) : '') || localUrl(v);
  /* a font picker value: the templates print family, fallbacks */
  const font = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : '';
    return typeof v === 'string' && v && api() && api().font ? api().font(v) : '';
  };
  const blank = v => !String(v == null ? '' : v).replace(/<[^>]*>/g, '').trim();
  const str = v => String(v == null ? '' : v);
  const mine = (root, sel) => [...root.querySelectorAll(sel)].filter(el => el.closest(SEL) === root);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- the picture row of Follow Us ---------- */
  const rtl = el => getComputedStyle(el).direction === 'rtl';
  function step(track) {
    const tile = track.querySelector('[data-r7n-tile]');
    if (!tile) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return tile.getBoundingClientRect().width + gap;
  }
  function arrows(root) {
    const track = root.querySelector('[data-r7n-track]'); if (!track) return;
    const prev = root.querySelector('[data-r7n-prev]'), next = root.querySelector('[data-r7n-next]');
    const max = track.scrollWidth - track.clientWidth, at = Math.abs(track.scrollLeft);
    const start = at <= 1, end = max <= 1 || at >= max - 1;
    if (prev && prev.disabled !== start) prev.disabled = start;
    if (next && next.disabled !== end) next.disabled = end;
  }
  function move(root, dir) {
    const track = root.querySelector('[data-r7n-track]'); if (!track) return;
    track.scrollBy({left: dir * step(track) * (rtl(track) ? -1 : 1), behavior: reduced.matches ? 'auto' : 'smooth'});
  }
  function bindTrack(root, st) {
    const track = root.querySelector('[data-r7n-track]');
    if (st.track === track) return;
    if (st.ac) st.ac.abort();
    if (st.ro) st.ro.disconnect();
    st.track = track; st.ac = null; st.ro = null;
    if (!track) return;
    st.ac = new AbortController();
    let frame = 0;
    track.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; arrows(root); }); }, {passive: true, signal: st.ac.signal});
    if (window.ResizeObserver) { st.ro = new ResizeObserver(() => arrows(root)); st.ro.observe(track); }
    arrows(root);
  }
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-r7n-prev], [data-r7n-next]'); if (!b || b.disabled) return;
    const root = b.closest(SEL); if (root) move(root, b.hasAttribute('data-r7n-prev') ? -1 : 1);
  });
  document.addEventListener('keydown', e => {
    const track = e.target && e.target.matches && e.target.matches('[data-r7n-track]') ? e.target : null; if (!track) return;
    const root = track.closest(SEL); if (!root || track.scrollWidth - track.clientWidth <= 1) return;
    const back = rtl(track) ? 'ArrowRight' : 'ArrowLeft', fwd = rtl(track) ? 'ArrowLeft' : 'ArrowRight';
    const behavior = reduced.matches ? 'auto' : 'smooth';
    if (e.key === back || e.key === fwd) { e.preventDefault(); move(root, e.key === fwd ? 1 : -1); }
    else if (e.key === 'Home') { e.preventDefault(); track.scrollTo({left: 0, behavior}); }
    else if (e.key === 'End') { e.preventDefault(); track.scrollTo({left: (rtl(track) ? -1 : 1) * track.scrollWidth, behavior}); }
  });
  /* The builder picked a picture block: bring it into view in its row. */
  document.addEventListener('shopify:block:select', e => {
    const d = e.detail || {}, id = d.blockId || d.block_id || '';
    let el = e.target && e.target.closest ? e.target.closest('[data-r7n-tile]') : null;
    if (!el && id) el = document.querySelector('[data-r7n-tile][data-r7n-block="' + CSS.escape(String(id)) + '"]');
    const track = el && el.closest('[data-r7n-track]'); if (!track) return;
    const t = el.getBoundingClientRect(), r = track.getBoundingClientRect();
    if (t.left < r.left || t.right > r.right) track.scrollBy({left: t.left - r.left, behavior: 'auto'});
  });

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = String(value || '').replace(/<[^>]*>/g, '');
  }
  /* a tile is an <a> with a link and a <div> without: the same element kept when the tag does not change */
  function link(el, href, st) {
    const tag = href ? 'A' : 'DIV';
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      st.last.set(next, st.last.get(el) || new Map());
      el = next;
    }
    if (href) el.setAttribute('href', href); else el.removeAttribute('href');
    return el;
  }
  function write(el, key, v, prev, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key[0] === '.') { if (prev) el.classList.remove(prev); if (v) el.classList.add(v); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'href') return link(el, v, st);
    return el;
  }

  /* ---------- derive ---------- */
  const custom = s => bool(s.enable_custom_style);
  const pick = (on, v, f) => on ? color(v, f) : f;
  /* snippets/button-overrides: only the colours the creator set; a border left empty follows the background */
  function overrides(put, el, s) {
    const on = custom(s), c = k => on ? color(s[k], null) : null;
    const bg = c('button_bg'), hb = c('button_bg_hover');
    put(el, '--mb-bg', bg); put(el, '--mb-text', c('button_text')); put(el, '--mb-border', c('button_border') || bg);
    put(el, '--mb-hover-bg', hb); put(el, '--mb-hover-text', c('button_text_hover')); put(el, '--mb-hover-border', hb);
  }
  const SIZES = {small: ['14px', '10px', '18px'], large: ['18px', '18px', '30px']};
  function section(c) {
    const {root, s, put} = c, o = custom(s), type = c.st.type, f = bool(s.enable_custom_fonts);
    const v = s.color_scheme && s.color_scheme.id || s.color_scheme;
    if (typeof v === 'string' && /^[\w-]+$/.test(v)) put(root, 'scheme', v);
    put(root, '--r7n-bg', pick(o, s.section_bg, 'var(--color-background)'));
    put(root, '--r7n-pt-m', px(s.padding_top_mobile, type.pm)); put(root, '--r7n-pb-m', px(s.padding_bottom_mobile, type.pm));
    put(root, '--r7n-pt-d', px(s.padding_top, type.pd)); put(root, '--r7n-pb-d', px(s.padding_bottom, type.pd));
    put(root, '--r7n-hf', f && font(s.heading_font) || null); put(root, '--r7n-bf', f && font(s.body_font) || null);
    put(root, '@data-r7n-width', s.section_width || 'fluid_container');
    put(root, '@data-r7n-show', s.show_section_on || 'all');
    put(root, '@data-r7n-align', s.content_alignment || type.align);
    const shape = s.use_theme_button === false || s.use_theme_button === 'false';
    const bodyFont = f && font(s.body_font) || null;
    if (type.kind === 'split') split(c, o, f, shape, bodyFont);
    else follow(c, f, shape, bodyFont);
  }
  function split(c, o, f, shape, bodyFont) {
    const {root, s, put, q} = c;
    put(root, '--r7n-media-w', num(s.image_width, 50) + '%'); put(root, '--r7n-gap', px(s.column_gap, 64));
    put(root, '--r7n-done', num(s.success_duration, 5) + 's');
    put(root, '--r7n-text', pick(o, s.text_color, 'var(--color-text)'));
    put(root, '@data-r7n-side', s.image_position || 'left');
    put(root, '@data-r7n-ratio', s.image_ratio || 'square');
    put(root, '@data-r7n-mimg', s.show_image_mobile === false || s.show_image_mobile === 'false' ? 'false' : 'true');
    put(root, '@data-r7n-form-layout', s.form_layout || 'horizontal');
    const img = q('[data-r7n-img]');
    if (img) put(img, '@alt', str(s.image_alt) || (s.image && typeof s.image === 'object' && s.image.alt) || '');
    put(q('[data-r7n-signup]'), '@data-own-font', f || null);
    const input = q('[data-r7n-input]'), label = q('[data-r7n-email-label]');
    put(label, 'text', str(s.email_label).trim() || str(s.email_placeholder) || 'Email');
    put(input, '@placeholder', str(s.email_placeholder));
    put(input, '--body-font', bodyFont);
    const btn = q('[data-r7n-submit]');
    if (btn) {
      const style = s.button_style === 'secondary' ? 'secondary' : 'primary';
      put(btn, '.style', 'btn-' + style); put(btn, '@data-theme-button', style);
      put(btn, '@data-own-shape', shape || null);
      overrides(put, btn, s);
      put(btn, '--mb-radius', shape ? px(s.button_radius, 4) : null); put(btn, '--mb-font-size', shape ? px(s.button_size, 15) : null);
      put(btn, '--mb-padding-x', shape ? px(s.button_pad_x, 28) : null); put(btn, '--mb-padding-y', shape ? px(s.button_pad_y, 12) : null);
      put(btn, '--mb-font', bodyFont);
      const l = q('[data-r7n-label]'); if (l) put(l, 'text', str(s.btn_text).trim() || l.dataset.fallback || '');
      put(q('[data-r7n-subscribed]'), 'text', str(s.subscribed_button_text) || 'Subscribed');
    }
    const ok = str(s.success_text) || "Thanks, you're on the list.", bad = str(s.invalid_text) || 'Enter a valid email address.';
    put(q('[data-r7n-hint]'), 'text', bad);
    put(q('[data-r7n-msg="error"]'), 'text', str(s.error_text) || 'That did not go through. Check your connection and try again.');
    put(q('[data-r7n-msg="done"]'), 'text', ok);
    const words = q('[data-r7n-words]');
    put(words, '@data-success-message', ok); put(words, '@data-already-message', str(s.already_text)); put(words, '@data-invalid-message', str(s.invalid_text));
    put(words, '@data-error-message', str(s.error_text)); put(words, '@data-success-ms', String(num(s.success_duration, 5) * 1000));
    const note = q('[data-r7n-note]'); put(note, 'rich', s.note || ''); put(note, 'hidden', blank(s.note));
  }
  function follow(c, f, shape, bodyFont) {
    const {root, s, put} = c;
    put(root, '--r7n-tile-gap', px(s.image_gap, 12));
    put(root, '@data-r7n-buttons', s.buttons_layout || 'inline');
    put(root, '@data-r7n-ratio', s.image_ratio || 'square');
    put(root, '@data-r7n-arrows', s.show_arrows === false || s.show_arrows === 'false' ? 'false' : 'true');
    const style = s.button_style === 'primary' ? 'primary' : 'secondary', z = SIZES[s.button_size] || ['16px', '14px', '24px'];
    const prefix = str(s.button_prefix).trim();
    for (const btn of mine(root, '[data-r7n-fbtn]')) {
      put(btn, '@data-theme-button', style);
      put(btn, '@data-own-shape', shape || null); put(btn, '@data-own-font', f || null);
      overrides(put, btn, s);
      put(btn, '--mb-radius', shape ? px(s.button_radius, 4) : null);
      put(btn, '--mb-font-size', shape ? z[0] : null); put(btn, '--mb-padding-y', shape ? z[1] : null); put(btn, '--mb-padding-x', shape ? z[2] : null);
      put(btn, '--mb-font', bodyFont);
      const name = btn.querySelector('[data-r7n-fname]');
      if (name) put(name, 'text', prefix ? prefix + ' ' + name.dataset.name : name.dataset.name);
    }
  }
  function header(c, x) {
    const {put, s} = c, b = x.b, el = x.el, own = custom(b), bfont = bool(b.enable_custom_fonts), z = bool(b.size_enable), w = bool(b.weight_enable), h = x.type === 'heading';
    put(el, 'rich', b.text || '');
    put(el, 'hidden', blank(b.text));
    put(el, '@data-own-font', bool(s.enable_custom_fonts) || bfont || null);
    put(el, '--fb-ff', bfont && font(b.font) || null);
    put(el, '--fb-c', own ? color(b.color, h ? 'var(--color-heading)' : 'var(--color-text)') : null);
    put(el, '--fb-fw', w ? String(b.weight || (h ? 700 : 400)) : null); put(el, '@data-own-weight', w || null);
    if (h) { put(el, '--fb-fs-d', z ? px(b.size_desktop, 36) : null); put(el, '--fb-fs-m', z ? px(b.size_mobile, 26) : null); put(el, '--fb-ls', z ? px(b.tracking) : null); }
    else put(el, '--fb-fs', z ? px(b.size, 16) : null);
    put(el, '--fb-lh', z ? String(num(b.line_height, h ? 1.15 : 1.5)) : null); put(el, '@data-own-size', z || null);
  }
  function tile(c, x) {
    const {put} = c, b = x.b;
    const el = put(x.el, 'href', url(b.link) || '');
    const img = el.querySelector('[data-r7n-tile-img]');
    if (img) put(img, '@alt', str(b.alt) || (b.image && typeof b.image === 'object' && b.image.alt) || '');
  }
  const BLOCKS = {heading: header, subheading: header, image: tile};

  function derive(root, st, record) {
    const out = [];
    const put = (el, key, v) => {
      if (!el) return el;
      if (record === 'audit') { out.push([el, key, v]); return el; }
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      const prev = m.get(key); m.set(key, v);
      return write(el, key, v, prev, st) || el;
    };
    const blocks = mine(root, '[data-r7n-block]').map(el => {
      const id = el.dataset.r7nBlock;
      if (st.rawBlocks.get(id) !== el.dataset.r7nBs) { st.rawBlocks.set(id, el.dataset.r7nBs); st.blocks.set(id, {...parse(el.dataset.r7nBs), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.r7nType, b: st.blocks.get(id) || {}};
    });
    const c = {root, st, s: st.s, put, q: sel => mine(root, sel)[0] || null};
    section(c);
    for (const x of blocks) if (BLOCKS[x.type]) BLOCKS[x.type](c, x);
    const wrap = root.closest('.shopify-section');
    if (wrap && record !== 'audit') {
      const reset = bool(st.s.reset_spacing), d = st.mq.matches ? 'desktop' : 'mobile';
      put(wrap, '!margin-top', reset ? '0px' : px(st.s['section_margin_top_' + d])); put(wrap, '!margin-bottom', reset ? '0px' : px(st.s['section_margin_bottom_' + d]));
    }
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.r7nSettings) { st.raw = root.dataset.r7nSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    bindTrack(root, st); arrows(root);
  }
  function drop(root, st) {
    st.mq.removeEventListener('change', st.schedule);
    if (st.ac) st.ac.abort();
    if (st.ro) st.ro.disconnect();
    cancelAnimationFrame(st.frame); roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.r7n]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    /* a visitor's page carries no settings JSON: only the picture row runs there */
    const editable = root.hasAttribute('data-r7n-settings');
    const st = {root, type, editable, live: {}, liveBlocks: new Map(), s: parse(root.dataset.r7nSettings), raw: root.dataset.r7nSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), mq: matchMedia('(min-width: 768px)'), frame: 0, track: undefined};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (!root.isConnected) return; if (editable) paint(root, st); else { bindTrack(root, st); arrows(root); } }); };
    st.mq.addEventListener('change', st.schedule);
    roots.set(root, st);
    if (editable) derive(root, st, true);
    bindTrack(root, st);
    root.dataset.r7nReady = '';
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll(SEL)) { const st = roots.get(root); if (st) st.schedule(); else add(root); }
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id || v.sectionId || '' : v || '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId || d.section_id); if (!id || !d.settings) return;
    const bRaw = d.block || d.blockId || d.block_id, bid = bRaw ? String(bRaw.id || bRaw) : '';
    for (const [root, st] of roots) {
      if (root.dataset.r7nSection !== id || !st.editable) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-r7n-block]') || n.querySelector(SEL + ',[data-r7n-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-r7n-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-r7n-settings', 'data-r7n-bs']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'text') { have = el.textContent.trim(); want = v == null ? '' : String(v).trim(); }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'href') { have = el.getAttribute('href') || ''; want = v || ''; }
      else if (key[0] === '.') { have = el.classList.contains(v); want = true; }
      else continue;
      if (have !== want) bad.push((el.dataset.r7nBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaR7Connect = {scan, audit, roots, arrows, move};
  scan();
})();
