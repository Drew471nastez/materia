/* Materia Themes. Live editor updates and behaviour for the Announcements
   sections: Marquee Bar, Announcement Bar Basic, Announcement Bar Pro 1
   (annoucment-bar-scrolling) and Announcement Bar Pro 2 (announcement-bar).
   Announcement Bar Pro 4 keeps its own runtime (announcement-pro-4.js).

   Every root [data-an-root] carries its settings, defaults and block
   defaults as JSON; every block carries its own. derive() turns settings into
   a list of outputs (a CSS variable, an attribute, text, a picture...) per
   element. The Liquid prints the same outputs, so on load the first derive is
   only recorded, never painted. After that an output is written only when its
   value changes, one frame per root, so a picture never reloads and a marquee
   never restarts for an unrelated edit. audit() compares the derived outputs
   with what the markup carries (used by the tests).

   Behaviour the sections need lives here too, because a section's own inline
   script is not guaranteed to run in the builder canvas: the marquees (paused
   off screen and in a hidden tab, still under reduced motion), the Pro 2
   rotator (arrows, keyboard, autoplay paused on hover, focus and off screen),
   the Pro 2 countdowns (one tick a second at most, per instance, paused off
   screen, expired state) and the close buttons (remembered on the
   storefront, never in the builder). Each is set up once per root, again only
   when its markup is replaced. */
(() => {
  if (window.MateriaAnnouncements) return;
  const SEL = '[data-an-root]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => { v = v && typeof v === 'object' && 'value' in v ? v.value : v; return v === true || v === 'true' || v === 1; };
  const off = v => v === false || v === 'false';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = v => num(v) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.preview_image?.url || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image = false) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };
  /* A font picker value, as the Liquid reads it (snippets/announce-font): a font with a family, else the fallback. */
  const fontCss = (v, f) => v && typeof v === 'object' && v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : f;
  const fontWeight = (v, f) => v && typeof v === 'object' && v.family && v.weight ? String(v.weight) : f;
  const handleize = v => String(v || '').toLowerCase().replace(/['"]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  const plain = v => String(v || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const design = () => !!(window.Shopify && window.Shopify.designMode) || document.documentElement.classList.contains('shopify-design-mode');

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = plain(value);
  }
  /* Inline SVG code from a textarea: only the <svg> and its drawing, nothing that runs. */
  function svg(el, value) {
    const t = document.createElement('template'); t.innerHTML = String(value || '');
    t.content.querySelectorAll('script, foreignObject, iframe, object, embed, link, meta').forEach(n => n.remove());
    t.content.querySelectorAll('*').forEach(n => { for (const a of [...n.attributes]) if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) n.removeAttribute(a.name); });
    el.replaceChildren(t.content);
  }
  function image(el, v) {
    /* v: JSON {src, alt, w, h, cls}. Swaps the <img> only when the picture changed. */
    const d = parse(v);
    const cur = el.querySelector(':scope > img');
    const bare = v => String(v || '').replace(/[?#].*$/, '');
    if (cur && d.src && bare(cur.getAttribute('src')) === bare(d.src)) { if (cur.alt !== (d.alt || '')) cur.alt = d.alt || ''; return; }
    if (!d.src) { if (cur) cur.remove(); return; }
    const n = document.createElement('img'); n.alt = d.alt || ''; n.loading = 'lazy'; n.decoding = 'async'; if (d.cls) n.className = d.cls; if (d.w) n.width = d.w; if (d.h) n.height = d.h; n.src = d.src;
    if (cur) cur.replaceWith(n); else el.prepend(n);
  }
  function link(el, href, st) {
    const tag = href ? 'A' : (el.dataset.anNoLink || 'BUTTON');
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      st.last.set(next, st.last.get(el) || new Map());
      el = next;
    }
    if (href) { el.setAttribute('href', href); if (tag === 'A') el.removeAttribute('type'); }
    else { el.removeAttribute('href'); if (tag === 'BUTTON') el.setAttribute('type', 'button'); }
    return el;
  }
  function write(el, key, v, prev, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'svg') svg(el, v);
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'image') image(el, v);
    else if (key === 'href') return link(el, v, st);
    else if (key === 'copies') copies(el, v, st);
    else if (key === 'noReveal') { const m = el.querySelector(':scope > [data-ti-no-reveal]'); if (v === 'true' && !m) { const n = document.createElement('span'); n.setAttribute('data-ti-no-reveal', ''); n.hidden = true; el.prepend(n); } else if (v !== 'true' && m) m.remove(); }
    return el;
  }

  /* ---------- shared derive pieces ---------- */
  const pick = (own, v, f) => own ? color(v, f) : f;
  function scheme(c) {
    const s = c.s.color_scheme && c.s.color_scheme.id || c.s.color_scheme;
    if (typeof s === 'string' && /^[\w-]+$/.test(s)) c.put(c.root, 'scheme', s);
  }
  /* The wrapper's own margins, desktop or mobile, and the root's reset and width (snippets/announce-frame). */
  function frame(c, width = 'full_width') {
    const {s, root, wrap, put, desktop} = c;
    if (wrap) for (const side of ['top', 'bottom']) put(wrap, '!margin-' + side, px(s['section_margin_' + side + '_' + (desktop ? 'desktop' : 'mobile')]));
    put(root, '@data-reset', bool(s.reset_spacing) ? 'true' : 'false');
    put(root, '@data-width', s.section_width || width);
    /* Reveal on scroll off marks the section for the layout's reveal, as the Liquid does. */
    if (wrap && s.reveal !== undefined) put(wrap, 'noReveal', bool(s.reveal) ? 'false' : 'true');
  }
  const bg = (own, type, solid, start, end, angle) => type === 'gradient'
    ? 'linear-gradient(' + num(angle, 90) + 'deg, ' + pick(own, start, 'var(--color-background)') + ', ' + pick(own, end, 'var(--color-primary)') + ')'
    : pick(own, solid, 'var(--color-background)');
  const imgJson = (img, alt, w, cls) => { const src = url(img, true); if (!src) return '{}'; const h = img && img.width && img.height ? Math.round(img.height * w / img.width) : w; return JSON.stringify({src, alt: alt == null ? (img && img.alt) || '' : alt, w, h, cls}); };

  /* Silent copies of a marquee group: as many as asked, cloned from the first group, each kept on the
     first group's clock so the loop stays seamless. */
  function copies(track, n, st) {
    const groups = () => [...track.children].filter(g => g.classList.contains('scrolling__marquee-wrapper') || g.hasAttribute('data-an-group') || g.hasAttribute('data-an-copies'));
    const all = groups(), first = all.find(g => g.hasAttribute('data-an-group')) || all[0];
    if (!first) return;
    let have = all.length;
    while (have > Math.max(1, n)) { all[have - 1].remove(); have--; }
    while (have < n) {
      const copy = first.cloneNode(true);
      copy.removeAttribute('data-an-group'); copy.setAttribute('data-an-copies', ''); copy.setAttribute('aria-hidden', 'true');
      for (const el of copy.querySelectorAll('[data-an-block]')) {
        el.setAttribute('data-an-copy', el.dataset.anBlock);
        for (const a of [...el.attributes]) if (/^data-(an-block|an-type|an-settings|shopify)/.test(a.name)) el.removeAttribute(a.name);
      }
      for (const img of copy.querySelectorAll('img')) img.alt = '';
      for (const a of copy.querySelectorAll('a, button')) a.tabIndex = -1;
      track.append(copy); have++;
    }
    syncClock(track);
  }
  function syncClock(track) {
    const anims = [...track.children].map(g => g.getAnimations ? g.getAnimations().find(a => a.effect && a.effect.getTiming().iterations === Infinity) : null);
    const lead = anims[0]; if (!lead || lead.currentTime == null) return;
    for (const a of anims.slice(1)) if (a && a.currentTime !== lead.currentTime) a.currentTime = lead.currentTime;
  }
  const copiesOf = (root, id) => [...root.querySelectorAll('[data-an-copy="' + CSS.escape(id) + '"]')];

  /* ---------- marquee pause (all marquee sections) ---------- */
  function pauseWhenAway(root, st) {
    const stop = !st.visible || document.hidden;
    if (stop) root.setAttribute('data-paused', ''); else root.removeAttribute('data-paused');
  }

  /* ---------- section types ---------- */
  const TYPES = {};

  TYPES['marquee-bar'] = {
    bp: 768,
    derive(c) {
      const {root, s, put} = c, own = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
      scheme(c); frame(c, 'full_width');
      const grad = own && typeof s.background_gradient === 'string' && s.background_gradient.trim() ? s.background_gradient.trim() : '';
      const tw = s.text_weight && s.text_weight !== 'theme' ? String(s.text_weight) : (fonts ? fontWeight(s.body_font, 'var(--body-weight, 500)') : 'var(--body-weight, 500)');
      const v = {
        '--an-fs-m': px(s.mobile_text_size), '--an-fs-d': px(s.desktop_text_size), '--an-gap-m': px(s.mobile_item_gap), '--an-gap-d': px(s.desktop_item_gap),
        '--an-pt-m': px(s.mobile_top_padding), '--an-pt-d': px(s.desktop_top_padding), '--an-pb-m': px(s.mobile_bottom_padding), '--an-pb-d': px(s.desktop_bottom_padding),
        '--scrolling-background-color': grad || pick(own, s.background_color, 'var(--color-background)'),
        '--scrolling-text-color': pick(own, s.text_color, 'var(--color-text)'),
        '--scrolling-animation-duration': (num(s.duration) > 0 ? num(s.duration) : 30) + 's',
        '--scrolling-section-width': num(s.inner_width) > 0 ? px(s.inner_width) : 'none',
        '--scrolling-pause-on-hover': bool(s.pause_on_hover) ? 'paused' : 'running',
        '--scrolling-animation-direction': s.direction === 'normal' ? 'normal' : 'reverse',
        '--scrolling-font-weight': tw,
        '--an-bf': fonts ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)',
      };
      for (const k in v) put(root, k, v[k]);
      put(root, '@data-own-font', fonts || null); put(root, '@data-own-weight', fonts || null);
      put(root, '@data-pause-hover', bool(s.pause_on_hover) ? 'true' : 'false');
      put(root, '@data-own-reveal', String(bool(s.reveal) && root.dataset.anThemeAnim === 'none' && !design()));
      const track = c.q('[data-an-track]');
      if (track) {
        put(track, '@id', handleize(s.html_id) || null);
        put(track, '@class', ('scrolling__marquee ' + String(s.html_class || '').replace(/,/g, ' ')).trim());
        put(track, 'copies', Math.max(1, Math.round(num(s.repeat_count, 1))));
      }
    },
    block(c, el, b, type, x) {
      if (type !== 'marquee') return;
      const {put, root} = c, own = bool(b.enable_custom_style), hasSvg = !!String(b.svg_icon || '').trim();
      const font = bool(b.enable_custom_fonts) ? fontCss(b.font, '') : '';
      for (const t of [el, ...copiesOf(root, x.id)]) {
        const copy = t !== el;
        put(t, '--svg-size-mobile', px(b.svg_icon_size_mobile)); put(t, '--svg-size-desktop', px(b.svg_icon_size_desktop));
        put(t, '--svg-icon-offset-y', px(b.svg_icon_vertical_offset)); put(t, '--svg-color', color(b.svg_icon_color, 'currentColor'));
        put(t, '--scrolling-text-color', own ? color(b.text_color, 'var(--color-text)') : null);
        put(t, '--an-b-f', font || null); put(t, '--scrolling-font-weight', font ? fontWeight(b.font, '400') : null);
        put(t, '@data-own-font', !!font || null); put(t, '@data-own-weight', !!font || null);
        const text = t.querySelector('[data-an-text]'); put(text, 'rich', b.text || ''); put(text, 'hidden', !plain(b.text));
        const icon = t.querySelector('[data-an-icon]'); put(icon, 'hidden', !hasSvg);
        const wrap = icon && icon.querySelector('.scrolling__marquee-svg-wrap'); put(wrap, '@data-colorize', bool(b.enable_svg_icon_color) ? 'true' : 'false'); put(wrap, 'svg', b.svg_icon || '');
        const pic = t.querySelector('[data-an-pic]'); put(pic, 'hidden', hasSvg || !url(b.image, true)); put(pic, 'image', imgJson(b.image, copy ? '' : null, 60, 'scrolling__marquee-img'));
      }
    },
    after(root) { const t = root.querySelector('[data-an-track]'); if (t) syncClock(t); },
    visibility: pauseWhenAway,
  };

  /* ---------- engine ---------- */
  function derive(root, st, record) {
    const type = TYPES[root.dataset.anRoot]; if (!type) return [];
    const out = [];
    const put = (el, key, v) => {
      if (!el) return el;
      out.push([el, key, v]);
      if (record === 'audit') return el;
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return el; }
      if (m.has(key) && m.get(key) === v) return el;
      const prev = m.get(key); m.set(key, v);
      return write(el, key, v, prev, st) || el;
    };
    const blocks = [...root.querySelectorAll('[data-an-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.anBlock, t = el.dataset.anType;
      if (st.rawBlocks.get(id) !== el.dataset.anSettings) { st.rawBlocks.set(id, el.dataset.anSettings); st.blocks.set(id, {...parse(el.dataset.anSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: t, b: {...(st.blockDefaults[t] || {}), ...st.blocks.get(id)}};
    });
    const c = {root, st, s: st.s, put, blocks, wrap: root.closest('.shopify-section'), desktop: st.mq.matches, q: sel => root.querySelector(sel), qa: sel => [...root.querySelectorAll(sel)]};
    type.derive(c);
    for (const x of blocks) if (type.block) type.block(c, x.el, x.b, x.type, x);
    if (type.finish) type.finish(c);
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.anSettings) { st.raw = root.dataset.anSettings; st.s = {...st.defaults, ...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    const type = TYPES[root.dataset.anRoot];
    if (type.after) type.after(root, st);
  }
  function drop(root, st) {
    st.io.disconnect(); st.mq.removeEventListener('change', st.schedule); reduced.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame); st.abort.abort(); for (const t of st.timers) clearTimeout(t); st.timers.clear();
    const type = TYPES[root.dataset.anRoot]; if (type && type.drop) type.drop(root, st);
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.anRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const defaults = parse(root.dataset.anDefaults);
    const st = {root, defaults, live: {}, liveBlocks: new Map(), s: {...defaults, ...parse(root.dataset.anSettings)}, raw: root.dataset.anSettings, blocks: new Map(), rawBlocks: new Map(), blockDefaults: parse(root.dataset.anBlockDefaults), last: new Map(), visible: true, abort: new AbortController(), timers: new Set(),
      mq: matchMedia('(min-width: ' + type.bp + 'px)')};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule); reduced.addEventListener('change', st.schedule);
    st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; if (type.visibility) type.visibility(root, st); });
    st.io.observe(root);
    roots.set(root, st);
    derive(root, st, true);
    if (type.init) type.init(root, st);
    st.schedule();
    root.dataset.anReady = '';
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
      if (root.dataset.anSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      if (design()) { st.dismissed = false; root.removeAttribute('data-an-dismissed'); }
      st.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const [root, st] of roots) { const t = TYPES[root.dataset.anRoot]; if (t.visibility) t.visibility(root, st); } });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-an-block]') || n.querySelector(SEL + ',[data-an-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-an-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-an-settings']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false) { have = have !== null; } else want = v == null ? null : String(v); }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'text') { have = el.textContent.trim(); want = String(v == null ? '' : v).trim(); }
      else continue;
      if (have !== want) bad.push((el.dataset.anBlock || el.dataset.anCopy || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaAnnouncements = {scan, audit, roots, TYPES};
  scan();
})();
