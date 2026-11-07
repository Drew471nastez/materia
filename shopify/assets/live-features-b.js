/* Materia Themes. Live editor updates and runtimes for the features-b
   sections: Comparison Cards, Comparison Table, Comparison Table 2,
   Comparison Table 3, Comparison Table 4 (comparisons-table) and Text
   Comparisons.

   Every root [data-fb-root] carries its section id, its settings as JSON and
   a spec (data-fb-spec, and data-fb-bspec per block type) naming which
   settings are CSS variables (--fb-<id>), colours (only with custom styling
   on), weights, fonts, attributes, text and pictures. snippets/features-b-vars
   prints the same variables from the same lists, so the first derive on load
   is only recorded, never painted. After that an output is written only when
   its value changes, one frame per root: a picture never reloads and the
   table never rebuilds for an unrelated edit. Settings outside the spec
   (block count, custom icon code, legacy fallbacks) wait for the builder's
   redraw.

   Runtimes per instance: the table scroller (keyboard focusable region,
   mouse drag when it overflows, scroll progress bar), set up once per root
   and removed with it. audit() compares derived outputs with the markup
   (used by tests/theme-features-b*.cjs). */
(() => {
  if (window.MateriaFeaturesB) return;
  const SEL = '[data-fb-root]';
  const roots = new Map();
  let listeners = 0;
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
  const bool = v => v === true || v === 'true';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => { const l = localColor(v, f); return l === f ? f : (api() && api().color ? api().color(v, f) : l) || f; };
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image = false) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };
  const fontCss = v => {
    if (v && typeof v === 'object') return v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : null;
    const fam = api() && api().font ? api().font(v) : '';
    return !fam || /^var\(/.test(fam) ? null : /,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const scrub = html => String(html || '').replace(/<[^>]*>/g, '');
  const sid = v => { if (v && typeof v === 'object') v = v.id ?? v.sectionId; return v == null ? '' : String(v).replace(/^shopify-section-/, ''); };

  /* ---------- derive: settings -> [element, key, value] ---------- */
  function scopeOut(out, els, s, spec, gate, binds) {
    const on = bool(s[spec.g || 'enable_custom_style']);
    for (const el of els) {
      for (const k of list(spec.px)) { const [id, u0] = k.split(':'), u = u0 === undefined ? 'px' : u0 === 'n' ? '' : u0; const v = s[id]; out.push([el, '--fb-' + id, (v === '' || v == null ? 0 : v) + u]); }
      for (const id of list(spec.c)) { const v = s[id]; out.push([el, '--fb-' + id, !on ? null : typeof v === 'string' && /gradient\(/.test(v) ? v.trim() : color(v, null)]); }
      for (const id of list(spec.w)) { const v = s[id]; out.push([el, '--fb-' + id, v && v !== 'theme' ? String(v) : null]); }
      for (const k of list(spec.f)) { const [g, id] = k.split(':'); out.push([el, '--fb-' + id, bool(s[g]) ? fontCss(s[id]) : null]); }
      for (const id of list(spec.a)) out.push([el, '@data-' + id, s[id] === undefined || s[id] === null ? '' : String(s[id])]);
    }
    for (const id of list(spec.w)) { const v = s[id]; for (const el of binds('w', id)) out.push([el, '@data-own-weight', !!(v && v !== 'theme')]); }
    for (const k of list(spec.f)) { const [g, id] = k.split(':'); const own = bool(s[g]) && !!fontCss(s[id]); for (const el of binds('f', id)) out.push([el, '@data-own-font', own]); }
    for (const id of list(spec.t)) for (const el of binds('t', id)) out.push([el, 'text', s[id] == null ? '' : String(s[id])]);
    for (const id of list(spec.r)) for (const el of binds('t', id)) out.push([el, 'rich', s[id] == null ? '' : String(s[id])]);
    for (const id of list(spec.v)) for (const el of binds('v', id)) out.push([el, '@data-v', s[id] == null ? '' : String(s[id])]);
    for (const id of list(spec.csv)) { const vals = String(s[id] || '').split(','); for (const el of binds('csv', id)) out.push([el, '@data-v', (vals[+el.dataset.i] || 'no').trim() || 'no']); }
    for (const id of list(spec.i)) for (const el of binds('i', id)) out.push([el, 'img', url(s[id], true)]);
    for (const k of list(spec.split)) { const [a, b] = k.split(':'); for (const el of binds('split', a)) out.push([el, 'split', JSON.stringify([String(s[a] ?? ''), String(s[b] ?? '')])]); }
  }
  function derive(st) {
    const out = [], r = st.el, s = st.s;
    const cid = s.color_scheme && typeof s.color_scheme === 'object' ? s.color_scheme.id : s.color_scheme;
    out.push([r, 'scheme', cid || 'default-color-scheme']);
    const own = (attr, id) => { const q = '[data-fb-' + attr + '~="' + id + '"]'; return (r.matches(q) ? [r] : []).concat([...r.querySelectorAll(q)]); };
    scopeOut(out, [r], s, st.spec, null, own);
    for (const [id, b] of st.blocks) {
      const spec = st.bspec[b.type]; if (!spec) continue;
      const els = [...r.querySelectorAll('[data-fb-block="' + id + '"]')];
      const bind = (attr, k) => [...r.querySelectorAll('[data-fb-b' + attr + '~="' + id + ':' + k + '"]')];
      scopeOut(out, els, b.s, spec, null, bind);
    }
    return out;
  }

  /* ---------- writers ---------- */
  function read(el, key) {
    if (key.startsWith('--')) return el.style.getPropertyValue(key).trim() || null;
    if (key[0] === '@') { const n = key.slice(1); return el.hasAttribute(n) ? el.getAttribute(n) : null; }
    if (key === 'text' || key === 'rich' || key === 'split') return el.textContent.trim();
    if (key === 'img') return el.getAttribute('src') || '';
    if (key === 'scheme') return ([...el.classList].find(c => c.startsWith('color-')) || '').slice(6);
    return null;
  }
  function norm(key, v) {
    if (key[0] === '@') return v === false || v == null ? null : v === true ? '' : String(v);
    if (key.startsWith('--')) return v == null || v === '' ? null : String(v).trim();
    if (key === 'text') return String(v).trim();
    if (key === 'split') return JSON.parse(v)[0].trim();
    if (key === 'rich') return scrub(v).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    return v;
  }
  function write(el, key, v) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') { if (api() && api().rich) api().rich(el, v, {rich: new WeakMap()}); else el.textContent = scrub(v); }
    else if (key === 'split') {
      /* A heading with one phrase picked out (the swoosh sits under it): the phrase gets the underline from the block's template. */
      const [t, h0] = JSON.parse(v), h = h0.trim(), i = h ? t.indexOf(h) : -1, wrap = el.closest('[data-fb-type]'), tpl = wrap && wrap.querySelector('template');
      if (i < 0) el.textContent = t;
      else { const span = document.createElement('span'); span.className = 'cmp__hl'; span.textContent = h; if (tpl) span.append(tpl.content.cloneNode(true)); el.replaceChildren(document.createTextNode(t.slice(0, i)), span, document.createTextNode(t.slice(i + h.length))); }
      if (wrap) wrap.dataset.hl = String(i >= 0);
    }
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'img') {
      const src = v || el.dataset.fbPh || '';
      if ((el.getAttribute('src') || '').split('?')[0] !== src.split('?')[0]) { el.removeAttribute('srcset'); if (src) el.setAttribute('src', src); else el.removeAttribute('src'); }
      el.hidden = !src;
      el.toggleAttribute('data-fb-empty', !v);
    }
  }
  function paint(st) {
    st.frame = 0;
    if (!st.el.isConnected) return;
    for (const [el, key, v] of derive(st)) {
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (m.has(key) && m.get(key) === v) continue;
      m.set(key, v);
      write(el, key, v);
    }
    refresh(st);
  }
  const schedule = st => { if (!st.frame) st.frame = requestAnimationFrame(() => paint(st)); };

  /* ---------- table scroller: drag, progress, overflow state ---------- */
  function scroller(st, sc) {
    const bar = st.el.querySelector('[data-fb-progress]');
    let raf = 0, drag = null;
    const update = () => {
      raf = 0;
      const max = sc.scrollWidth - sc.clientWidth, over = max > 1;
      sc.toggleAttribute('data-overflow', over);
      if (bar) { bar.toggleAttribute('data-overflow', over); bar.toggleAttribute('data-fit', !over); bar.style.setProperty('--fb-p', over ? String(Math.max(0, Math.min(1, Math.abs(sc.scrollLeft) / max))) : '0'); }
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
    const down = e => { if (e.pointerType === 'touch' || e.button !== 0 || sc.scrollWidth <= sc.clientWidth + 1) return; drag = {x: e.clientX, l: sc.scrollLeft, id: e.pointerId, moved: false}; };
    const move = e => { if (!drag || e.pointerId !== drag.id) return; const dx = e.clientX - drag.x; if (!drag.moved && Math.abs(dx) < 6) return; if (!drag.moved) { drag.moved = true; sc.setAttribute('data-dragging', ''); try { sc.setPointerCapture(e.pointerId); } catch (_) {} } sc.scrollLeft = drag.l - dx; };
    const up = e => { if (!drag) return; if (drag.moved) { try { sc.releasePointerCapture(e.pointerId); } catch (_) {} } drag = null; sc.removeAttribute('data-dragging'); };
    const nodrag = e => e.preventDefault();
    sc.addEventListener('scroll', queue, {passive: true});
    sc.addEventListener('pointerdown', down); sc.addEventListener('pointermove', move); sc.addEventListener('pointerup', up); sc.addEventListener('pointercancel', up); sc.addEventListener('dragstart', nodrag);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(queue) : null;
    if (ro) { ro.observe(sc); if (sc.firstElementChild) ro.observe(sc.firstElementChild); }
    listeners++;
    update();
    st.refresh.push(queue);
    st.cleanup.push(() => { listeners--; if (raf) cancelAnimationFrame(raf); if (ro) ro.disconnect(); sc.removeEventListener('scroll', queue); sc.removeEventListener('pointerdown', down); sc.removeEventListener('pointermove', move); sc.removeEventListener('pointerup', up); sc.removeEventListener('pointercancel', up); sc.removeEventListener('dragstart', nodrag); });
  }
  const refresh = st => { for (const f of st.refresh) f(); };

  /* ---------- lifecycle ---------- */
  function init(el) {
    const st = {el, id: el.dataset.fbSection || '', s: parse(el.dataset.fbSettings), spec: parse(el.dataset.fbSpec), bspec: parse(el.dataset.fbBspec), blocks: new Map(), last: new Map(), frame: 0, cleanup: [], refresh: []};
    for (const b of el.querySelectorAll('[data-fb-bs]')) st.blocks.set(b.dataset.fbBlock, {type: b.dataset.fbType, s: parse(b.dataset.fbBs)});
    /* the settings are printed in the builder only (request.design_mode): without them nothing is painted here and the builder's redraw shows each change */
    if (el.hasAttribute('data-fb-settings')) for (const [e, key, v] of derive(st)) { let m = st.last.get(e); if (!m) st.last.set(e, m = new Map()); m.set(key, v); }
    for (const sc of el.querySelectorAll('[data-fb-scroll]')) scroller(st, sc);
    roots.set(el, st);
  }
  function drop(st) { if (st.frame) cancelAnimationFrame(st.frame); for (const f of st.cleanup) f(); roots.delete(st.el); }
  function scan() {
    for (const st of [...roots.values()]) if (!st.el.isConnected) drop(st);
    for (const el of document.querySelectorAll(SEL)) if (!roots.has(el)) init(el);
  }
  const find = id => { for (const st of roots.values()) if (st.id === id && st.el.isConnected) return st; return null; };
  function onChange(e) {
    const d = e.detail || {}, id = sid(d.section);
    if (!id || !d.settings || typeof d.settings !== 'object') return;
    let st = find(id);
    if (!st) { scan(); st = find(id); if (!st) return; }
    if (!st.el.hasAttribute('data-fb-settings')) return;
    const bid = sid(d.block ?? d.blockId ?? d.block_id);
    if (bid) { const b = st.blocks.get(bid); if (!b) return; Object.assign(b.s, d.settings); }
    else Object.assign(st.s, d.settings);
    schedule(st);
  }

  /* Outputs that differ from the markup (tests). */
  function audit(el) {
    const st = roots.get(el); if (!st) return ['not initialised'];
    const bad = [];
    for (const [e, key, v] of derive(st)) {
      if (key === 'img') { const want = (v || e.dataset.fbPh || '').split('?')[0]; if ((e.getAttribute('src') || '').split('?')[0] !== want) bad.push(key + ' ' + e.className + ': ' + e.getAttribute('src') + ' != ' + want); continue; }
      const have = read(e, key), want = norm(key, v);
      if (key === 'text' || key === 'rich' || key === 'split') { if (have.replace(/\s+/g, ' ') !== String(want).replace(/\s+/g, ' ')) bad.push(key + ' ' + e.className + ': ' + JSON.stringify(have) + ' != ' + JSON.stringify(want)); continue; }
      if (key.startsWith('--') && have != null && want != null && have.replace(/\s+/g, '').toLowerCase() === want.replace(/\s+/g, '').toLowerCase()) continue;
      if (have !== want) bad.push(key + ' on ' + (e.tagName + '.' + (typeof e.className === 'string' ? e.className.split(' ')[0] : '')) + ': ' + JSON.stringify(have) + ' != ' + JSON.stringify(want));
    }
    return bad;
  }

  ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load'].forEach(n => document.addEventListener(n, scan));
  document.addEventListener('storelib:settings-change', onChange);
  new MutationObserver(recs => { if (recs.some(r => [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches(SEL) || n.querySelector(SEL))))) scan(); }).observe(document.documentElement, {childList: true, subtree: true});
  window.MateriaFeaturesB = {scan, audit, count: () => ({roots: roots.size, scrollers: listeners})};
  scan();
})();
