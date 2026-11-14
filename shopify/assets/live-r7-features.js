/* Materia Themes. Live editor updates for Feature Timeline and Guarantee
   Banner (sections/feature-timeline.storelib, sections/guarantee-banner.storelib).
   Linked by those two sections only, so it loads on no other page.

   Both sections are HTML and CSS on the storefront: the timeline's line fills
   with a CSS scroll-driven animation, nothing here listens to scroll, touch
   or resize. This file only keeps the builder's canvas in step with the
   sidebar without a redraw.

   A root [data-r7e] carries its section id and, in the builder only, its
   settings as JSON (data-r7e-settings), a spec of which settings are CSS
   variables (--r7-<id>), colours (only with custom styling on), fonts,
   attributes, words and pictures (data-r7e-spec, and data-r7e-bspec for each
   block type). snippets/r7-features-vars prints the same variables from the
   same lists, so the first derive on load is only recorded, never painted.
   After that an output is written only when its value changed, one frame for
   each root: a picture is never loaded again for an unrelated edit. On the
   storefront there is no settings JSON and nothing is painted.

   What needs the server (a block added, removed or moved) waits for the
   builder's redraw; the new root is picked up once on storelib:section-load
   and the old one is dropped. audit() lists outputs that differ from the
   markup (tests/theme-r7-features.cjs). */
(() => {
  if (window.MateriaR7Features) return;
  const SEL = '[data-r7e]';
  const roots = new Map();
  let paints = 0;
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
  const bool = v => v === true || v === 'true';
  const str = v => v == null ? '' : String(v);
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f = null) => { const l = localColor(v, f); return l === f ? f : (api() && api().color ? api().color(v, f) : l) || f; };
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || (v.preview_image && (v.preview_image.src || v.preview_image.url)) || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image = false) => (api() && api().url ? api().url(v, image) : '') || localUrl(v, image);
  const fontCss = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : null;
    const fam = api() && api().font ? api().font(v) : '';
    return !fam || /^var\(/.test(fam) ? null : /,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const scrub = html => String(html || '').replace(/<[^>]*>/g, '');
  const sid = v => { if (v && typeof v === 'object') v = v.id ?? v.sectionId; return v == null ? '' : String(v).replace(/^shopify-section-/, ''); };
  const base = u => String(u || '').split('?')[0];
  const px = v => (v === '' || v == null ? 0 : v) + 'px';

  /* ---------- derive: settings -> [element, key, value] ---------- */
  function scope(out, els, s, spec, binds) {
    const on = bool(s.enable_custom_style);
    for (const el of els) {
      for (const k of list(spec.px)) { const [id, u0, g] = k.split(':'), u = u0 === undefined || u0 === '' ? 'px' : u0 === 'n' ? '' : u0, v = s[id]; out.push([el, '--r7-' + id, g && !bool(s[g]) ? null : (v === '' || v == null ? 0 : v) + u]); }
      for (const id of list(spec.c)) out.push([el, '--r7-' + id, on ? color(s[id]) : null]);
      for (const k of list(spec.w)) { const [id, g] = k.split(':'); out.push([el, '--r7-' + id, (!g || bool(s[g])) && s[id] ? String(s[id]) : null]); }
      for (const k of list(spec.f)) { const [g, id] = k.split(':'); out.push([el, '--r7-' + id, bool(s[g]) ? fontCss(s[id]) : null]); }
      for (const id of list(spec.a)) out.push([el, '@data-' + id, str(s[id])]);
      for (const k of list(spec.own)) { const [name, g] = k.split(':'); out.push([el, '@data-own-' + name, bool(s[g])]); }
    }
    for (const id of list(spec.t)) for (const el of binds('t', id)) out.push([el, 'text', str(s[id])]);
    for (const id of list(spec.r)) for (const el of binds('t', id)) out.push([el, 'rich', str(s[id])]);
    for (const k of list(spec.i)) { const [id, alt] = k.split(':'), v = s[id]; for (const el of binds('i', id)) out.push([el, 'img', JSON.stringify([url(v, true), str(s[alt]) || str(v && v.alt), v && v.width || 0, v && v.height || 0])]); }
  }
  /* A button block: its tag follows the link (see fit), its look the style. */
  function button(out, el, s) {
    const style = s.style === 'secondary' || s.style === 'link' ? s.style : 'primary', link = style === 'link';
    const on = bool(s.enable_custom_style), geo = !link && (s.use_theme_button === false || s.use_theme_button === 'false');
    const bg = on && !link ? color(s.bg) : null, hover = on && !link ? color(s.bg_hover) : null;
    out.push([el, '@data-style', style], [el, '@data-theme-button', link ? null : style], [el, '@data-sl-button', !link], [el, '@data-own-shape', geo]);
    out.push([el, '--mb-bg', bg], [el, '--mb-border', bg], [el, '--mb-text', on && !link ? color(s.color) : null], [el, '--mb-hover-bg', hover], [el, '--mb-hover-border', hover], [el, '--r7-color', on && link ? color(s.color) : null]);
    out.push([el, '--mb-radius', geo ? px(s.radius) : null], [el, '--mb-padding-y', geo ? px(s.pad_y) : null], [el, '--mb-padding-x', geo ? px(s.pad_x) : null], [el, '--mb-font-size', geo ? px(s.size) : null]);
    if (el.tagName === 'A') out.push([el, '@href', url(s.link) || null]);
    for (const t of el.querySelectorAll('[data-r7e-bt$=":label"]')) out.push([t, 'text', str(s.label)]);
  }
  /* The seal of Guarantee Banner: a picked image, else the icon, else nothing. */
  function seal(out, r, s, k) {
    const [icon, image, alt] = k.split(':'), holder = r.querySelector('[data-r7e-seal]');
    if (!holder) return;
    const src = url(s[image], true), name = str(s[icon]) || 'shield_check', img = holder.querySelector('[data-r7e-i="' + image + '"]'), box = holder.querySelector('[data-r7e-icon]');
    out.push([holder, '@hidden', !src && name === 'none']);
    if (img) out.push([img, 'img', JSON.stringify([src, str(s[alt]) || str(s[image] && s[image].alt), s[image] && s[image].width || 0, s[image] && s[image].height || 0])]);
    if (box) out.push([box, 'icon', name], [box, '@hidden', !!src || name === 'none']);
  }
  function derive(st) {
    const out = [], r = st.el, s = st.s;
    const cid = s.color_scheme && typeof s.color_scheme === 'object' ? s.color_scheme.id : s.color_scheme;
    out.push([r, 'scheme', cid || 'default-color-scheme']);
    scope(out, [r], s, st.spec, (kind, id) => [...r.querySelectorAll('[data-r7e-' + kind + '~="' + id + '"]')]);
    if (st.spec.seal) seal(out, r, s, st.spec.seal);
    for (const [id, b] of st.blocks) {
      const spec = st.bspec[b.type]; if (!spec) continue;
      const els = [...r.querySelectorAll('[data-r7e-block="' + id + '"]')];
      if (spec.kind === 'button') { for (const el of els) button(out, el, b.s); continue; }
      scope(out, els, b.s, spec, (kind, k) => [...r.querySelectorAll('[data-r7e-b' + kind + '~="' + id + ':' + k + '"]')]);
    }
    return out;
  }

  /* ---------- writers ---------- */
  const host = el => el.closest('[data-r7e-hide]') || el;
  function write(st, el, key, v) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key === 'text') { el.textContent = v; host(el).hidden = !v.trim(); }
    else if (key === 'rich') { if (api() && api().rich) api().rich(el, v, st); else el.textContent = scrub(v); host(el).hidden = !scrub(v).trim(); }
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'icon') { const t = st.el.querySelector('template[data-r7e-icon-src="' + v + '"]'); el.replaceChildren(...(t ? [t.content.cloneNode(true)] : [])); el.dataset.r7eIcon = v; }
    else if (key === 'img') {
      const [src, alt, w, h] = JSON.parse(v), wrap = el.closest('[data-r7e-media]');
      if (base(el.getAttribute('src')) !== base(src)) {
        el.removeAttribute('srcset'); el.removeAttribute('sizes');
        if (src) { el.setAttribute('src', src); if (w && h) { el.setAttribute('width', w); el.setAttribute('height', h); } else { el.removeAttribute('width'); el.removeAttribute('height'); } }
        else el.removeAttribute('src');
      }
      el.alt = alt; el.hidden = !src && !wrap;
      if (wrap) wrap.hidden = !src;
    }
  }
  /* The markup's value for an output, for audit(). */
  function read(el, key) {
    if (key.startsWith('--')) return el.style.getPropertyValue(key).trim() || null;
    if (key[0] === '@') { const n = key.slice(1); return el.hasAttribute(n) ? el.getAttribute(n) : null; }
    if (key === 'text' || key === 'rich') return el.textContent.trim();
    if (key === 'scheme') return ([...el.classList].find(c => c.startsWith('color-')) || '').slice(6);
    if (key === 'icon') return el.dataset.r7eIcon || '';
    return null;
  }
  const decode = t => t.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  function norm(key, v) {
    if (key[0] === '@') return v === false || v == null ? null : v === true ? '' : String(v);
    if (key.startsWith('--')) return v == null || v === '' ? null : String(v).trim();
    if (key === 'text') return String(v).trim();
    if (key === 'rich') return decode(scrub(v)).trim();
    return v;
  }

  /* A button block is an <a> with a link and a <button> without one: swap the tag, keep everything else. */
  function fit(st) {
    for (const [id, b] of st.blocks) {
      if ((st.bspec[b.type] || {}).kind !== 'button') continue;
      for (const el of st.el.querySelectorAll('[data-r7e-block="' + id + '"]')) {
        const want = url(b.s.link) ? 'A' : 'BUTTON';
        if (el.tagName === want) continue;
        const next = document.createElement(want);
        for (const a of [...el.attributes]) if (a.name !== 'href' && a.name !== 'type') next.setAttribute(a.name, a.value);
        if (want === 'A') next.setAttribute('href', url(b.s.link)); else next.type = 'button';
        next.append(...el.childNodes);
        const kept = st.last.get(el); if (kept) { st.last.delete(el); st.last.set(next, kept); }
        el.replaceWith(next);
      }
    }
  }
  function paint(st) {
    st.frame = 0;
    if (!st.el.isConnected) return;
    fit(st);
    for (const [el, key, v] of derive(st)) {
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (m.has(key) && m.get(key) === v) continue;
      m.set(key, v);
      write(st, el, key, v);
    }
    paints++;
  }
  const schedule = st => { if (!st.frame) st.frame = requestAnimationFrame(() => paint(st)); };

  /* ---------- lifecycle ---------- */
  function init(el) {
    const st = {el, type: el.dataset.r7e, id: el.dataset.r7eSection || '', s: parse(el.dataset.r7eSettings), spec: parse(el.dataset.r7eSpec), bspec: parse(el.dataset.r7eBspec), blocks: new Map(), last: new Map(), rich: new WeakMap(), frame: 0};
    for (const b of el.querySelectorAll('[data-r7e-bs]')) st.blocks.set(b.dataset.r7eBlock, {type: b.dataset.r7eType, s: parse(b.dataset.r7eBs)});
    /* the settings are printed in the builder only (request.design_mode): without them nothing is painted here and the builder's redraw shows each change */
    if (el.hasAttribute('data-r7e-settings')) for (const [e, key, v] of derive(st)) { let m = st.last.get(e); if (!m) st.last.set(e, m = new Map()); m.set(key, v); }
    roots.set(el, st);
  }
  function drop(st) { if (st.frame) cancelAnimationFrame(st.frame); st.last.clear(); st.blocks.clear(); roots.delete(st.el); }
  function scan() {
    for (const st of [...roots.values()]) if (!st.el.isConnected) drop(st);
    for (const el of document.querySelectorAll(SEL)) if (!roots.has(el)) init(el);
  }
  const find = id => { for (const st of roots.values()) if (st.id === id && st.el.isConnected) return st; return null; };
  function onChange(e) {
    const d = e.detail || {}, id = sid(d.section ?? d.sectionId);
    if (!id || !d.settings || typeof d.settings !== 'object') return;
    let st = find(id);
    if (!st) { scan(); st = find(id); if (!st) return; }
    if (!st.el.hasAttribute('data-r7e-settings')) return;
    const bid = sid(d.block ?? d.blockId ?? d.block_id);
    if (bid) { const b = st.blocks.get(bid); if (!b) return; Object.assign(b.s, d.settings); }
    else Object.assign(st.s, d.settings);
    schedule(st);
  }

  /* Outputs that differ from the markup (tests). */
  function audit(el) {
    const st = roots.get(el); if (!st) return ['not initialised'];
    const bad = [], name = e => e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '');
    for (const [e, key, v] of derive(st)) {
      if (key === 'img') { const [src, alt] = JSON.parse(v); if (base(e.getAttribute('src')) !== base(src)) bad.push('img ' + name(e) + ': ' + e.getAttribute('src') + ' != ' + src); if ((e.getAttribute('alt') || '') !== alt) bad.push('alt ' + name(e) + ': ' + e.getAttribute('alt') + ' != ' + alt); continue; }
      const have = read(e, key), want = norm(key, v);
      if (key === 'text' || key === 'rich') { if (have.replace(/\s+/g, ' ') !== String(want).replace(/\s+/g, ' ')) bad.push(key + ' ' + name(e) + ': ' + JSON.stringify(have) + ' != ' + JSON.stringify(want)); if (host(e).hidden !== !String(want).trim()) bad.push('hidden ' + name(e)); continue; }
      if (key.startsWith('--') && have != null && want != null && have.replace(/\s+/g, '').toLowerCase() === want.replace(/\s+/g, '').toLowerCase()) continue;
      if (have !== want) bad.push(key + ' on ' + name(e) + ': ' + JSON.stringify(have) + ' != ' + JSON.stringify(want));
    }
    for (const [id, b] of st.blocks) if ((st.bspec[b.type] || {}).kind === 'button') for (const e of el.querySelectorAll('[data-r7e-block="' + id + '"]')) if (e.tagName !== (url(b.s.link) ? 'A' : 'BUTTON')) bad.push('button tag ' + e.tagName);
    return bad;
  }

  ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load'].forEach(n => document.addEventListener(n, scan));
  document.addEventListener('storelib:settings-change', onChange);
  new MutationObserver(recs => { if (recs.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))))) scan(); }).observe(document.documentElement, {childList: true, subtree: true});
  window.MateriaR7Features = {scan, audit, count: () => ({roots: roots.size, paints})};
  scan();
})();
