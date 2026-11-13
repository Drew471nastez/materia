/* Materia Themes. Hero Split (sections/hero-split-media) and Hero Collage
   (sections/hero-collage): what they do on the page, and live editor paint.

   On the page, per section root [data-r7h]:
   - Hero Split plays its video only while the media is on screen, the tab is
     visible and the visitor has not asked for reduced motion; a small button
     pauses and plays it.
   - Hero Collage's picture row is a native scroller on phones. The arrows
     and the arrow keys call scrollBy; the arrows' disabled state is read
     from the scroll position in a passive listener, once per frame.
   Listeners hang on one AbortController per root and go with the root.

   In the builder the root also carries its settings as JSON, every block
   [data-r7h-block] its own. derive() turns settings into outputs per element
   (a CSS variable, an attribute, text, a link, a picture). The markup prints
   the same outputs, so on load the first derive is only recorded, never
   painted. After that an output is written only when its value changes, at
   most once per frame per root: an unrelated edit leaves the rest alone, a
   picture that did not change is not loaded again. A redraw
   (storelib:section-load) brings a new root, which is set up once; roots
   that leave the page are dropped. audit(root) lists outputs whose markup
   differs from the derived value (used by the tests). */
(() => {
  if (window.MateriaR7Hero) return;
  const SEL = '[data-r7h]', BLOCK = '[data-r7h-block]';
  const roots = new Map();
  const stats = {setups: 0};
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const isFalse = v => v === false || v === 'false';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const raw = v => v == null ? '' : String(v);
  const blank = v => v == null || (typeof v === 'string' && v.trim() === '');
  const px = (v, d = 0) => num(v, d) + 'px';
  const pct = (v, d = 0) => num(v, d) + '%';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => {
    if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; }
    v = typeof v === 'string' ? v.trim() : '';
    return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f;
  };
  const color = (v, f) => { const a = api(); return (a && a.color ? a.color(v, f) : localColor(v, f)) || f; };
  /* a link or a file address: this site (/...), http(s), and for links mailto and tel */
  const address = (v, file) => {
    v = v && typeof v === 'object' ? v.src || v.url || v.href || v.preview_image?.src || v.preview_image?.url || v.value : v;
    if (typeof v !== 'string' || !v || v === '#') return '';
    if (/^\/(?!\/)/.test(v)) return v;
    try { return (file ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return ''; }
  };
  const scheme = s => { const v = s.color_scheme && s.color_scheme.id || s.color_scheme; return typeof v === 'string' && /^[\w-]+$/.test(v) ? v : ''; };
  const fontCss = v => {
    if (v && typeof v === 'object' && v.family) return v.family + ', ' + (v.fallback_families || 'sans-serif');
    const a = api(), fam = a && a.font ? a.font(v) : '';
    return !fam ? '' : /^var\(|,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const videoSrc = s => {
    const v = s.video;
    let src = '';
    if (v && typeof v === 'object') { const list = Array.isArray(v.sources) ? v.sources : []; const pick = list.find(x => x.mime_type === 'video/mp4' || x.format === 'mp4') || list[0]; src = (pick && (pick.url || pick.src)) || v.url || v.src || ''; }
    else if (typeof v === 'string') src = v;
    return address(src, true) || address(s.video_url, true);
  };
  const WIDTHS = ['container', 'fluid_container', 'stretch_width', 'full_width'];
  const ALIGN = {center: 'center', right: 'right'}, ITEMS = {center: 'center', right: 'flex-end'};
  const RATIO = {portrait: '4 / 5', landscape: '4 / 3'};

  /* ---------- writers ---------- */
  function sanitise(el, html, st) {
    const a = api();
    if (a && a.rich) return a.rich(el, html, st);
    const t = document.createElement('template');
    t.innerHTML = String(html || '');
    t.content.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(n => n.remove());
    t.content.querySelectorAll('*').forEach(n => { for (const at of [...n.attributes]) if (/^on/i.test(at.name) || (at.name === 'href' && !address(at.value))) n.removeAttribute(at.name); });
    el.replaceChildren(t.content);
  }
  function write(st, el, key, v) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else if (el.getAttribute(n) !== (v === true ? '' : String(v))) el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') { if (el.textContent !== raw(v)) el.textContent = raw(v); }
    else if (key === 'html') sanitise(el, raw(v), st);
    else if (key === 'href') { if (v) el.setAttribute('href', v); else el.removeAttribute('href'); }
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); if (v) el.classList.add('color-' + v); }
    else if (key === 'width') { el.classList.remove(...WIDTHS); if (v) el.classList.add(v); }
    else if (key === 'src') {
      const next = v || st.root.dataset.r7hPlaceholder || '';
      if (el.getAttribute('src') !== next) { el.removeAttribute('srcset'); el.removeAttribute('sizes'); el.setAttribute('src', next); }
      el.toggleAttribute('data-r7h-empty', !v);
    }
    else if (key === 'video') {
      if (v) { if (el.getAttribute('src') !== v) el.setAttribute('src', v); } else if (el.hasAttribute('src')) { el.pause(); el.removeAttribute('src'); el.load(); }
      if (st.media) st.media.sync();
    }
  }
  /* A button or a picture with a link is an <a>, without one a <button> or a <div>: the same element under another tag. */
  function retag(el, tag) {
    if (el.tagName === tag) return el;
    const next = document.createElement(tag.toLowerCase());
    for (const at of [...el.attributes]) if (at.name !== 'href' && at.name !== 'type') next.setAttribute(at.name, at.value);
    if (tag === 'BUTTON') next.setAttribute('type', 'button');
    next.append(...el.childNodes);
    el.replaceWith(next);
    return next;
  }

  /* ---------- what the two sections share ---------- */
  function common(c, fallbackWidth) {
    const {root, s, put} = c, wrap = root.parentElement, own = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts);
    if (wrap && wrap.id === 'shopify-section-' + root.dataset.r7hSection) {
      put(wrap, '--r7h-mt-m', px(s.section_margin_top_mobile));
      put(wrap, '--r7h-mb-m', px(s.section_margin_bottom_mobile));
      put(wrap, '--r7h-mt-d', px(s.section_margin_top_desktop));
      put(wrap, '--r7h-mb-d', px(s.section_margin_bottom_desktop));
    }
    put(root, 'scheme', scheme(s) || 'default-color-scheme');
    put(root, '@data-reset-spacing', bool(s.reset_spacing));
    put(c.q('[data-r7h-frame]'), 'width', WIDTHS.includes(s.section_width) ? s.section_width : fallbackWidth);
    put(root, '--r7h-gap', px(s.content_gap, 16));
    put(root, '--r7h-max', px(s.content_max_width, 520));
    put(root, '--r7h-align', ALIGN[s.content_align] || 'left');
    put(root, '--r7h-items', ITEMS[s.content_align] || 'flex-start');
    put(root, '--r7h-pt-d', px(s.padding_top_desktop));
    put(root, '--r7h-pb-d', px(s.padding_bottom_desktop));
    put(root, '--r7h-pt-m', px(s.padding_top_mobile));
    put(root, '--r7h-pb-m', px(s.padding_bottom_mobile));
    put(root, '--r7h-bg', own ? color(s.section_bg, 'var(--color-background)') : null);
    const hf = fonts ? fontCss(s.heading_font) : '', bf = fonts ? fontCss(s.body_font) : '';
    put(root, '--r7h-hf', hf || null);
    put(root, '--r7h-bf', bf || null);
    /* Theme settings > Typography "Use in every section" leaves this section's text to its own fonts while they are on. */
    put(root, '@data-own-font', !!(hf || bf));
    return own;
  }
  function textBlocks(c) {
    const {put} = c;
    for (const blk of c.blocks) {
      const {type, b} = blk, own = bool(b.enable_custom_style), sized = bool(b.size_enable);
      let el = blk.el;
      if (type === 'eyebrow') {
        put(el, 'text', raw(b.text));
        put(el, 'hidden', blank(b.text));
        put(el, '--r7h-color', own ? color(b.color, 'var(--color-text)') : null);
        put(el, '--r7h-size', sized ? px(b.size) : null);
      } else if (type === 'heading') {
        const weighted = bool(b.weight_enable);
        put(el, 'html', raw(b.text));
        put(el, 'hidden', blank(b.text));
        put(el, '--r7h-color', own ? color(b.color, 'var(--color-heading)') : null);
        put(el, '@data-own-weight', weighted);
        put(el, '--r7h-weight', weighted ? raw(b.weight) : null);
        put(el, '@data-own-size', sized);
        put(el, '--r7h-size-d', sized ? px(b.size_desktop) : null);
        put(el, '--r7h-size-m', sized ? px(b.size_mobile) : null);
        put(el, '--r7h-lh', sized ? raw(b.line_height) : null);
        put(el, '--r7h-ls', sized ? px(b.tracking) : null);
      } else if (type === 'subheading') {
        put(el, 'html', raw(b.text));
        put(el, 'hidden', blank(b.text));
        put(el, '--r7h-color', own ? color(b.color, 'var(--color-text)') : null);
        put(el, '--r7h-size', sized ? px(b.size) : null);
        put(el, '--r7h-lh', sized ? raw(b.line_height) : null);
      } else if (type === 'button') {
        const href = address(b.link), shape = isFalse(b.use_theme_button), cv = x => own ? color(x, '') || null : null;
        el = c.tag(blk, href ? 'A' : 'BUTTON');
        put(el, 'tag', href ? 'A' : 'BUTTON');
        put(el, 'href', href || null);
        put(el, 'text', raw(b.text));
        put(el, 'hidden', blank(b.text));
        put(el, '@data-theme-button', b.button_style === 'secondary' ? 'secondary' : 'primary');
        put(el, '--mb-bg', cv(b.bg));
        put(el, '--mb-text', cv(b.color));
        put(el, '--mb-border', cv(b.border_color) || cv(b.bg));
        put(el, '--mb-hover-bg', cv(b.bg_hover));
        put(el, '--mb-hover-text', cv(b.color_hover));
        put(el, '--mb-hover-border', cv(b.bg_hover));
        put(el, '@data-own-shape', shape);
        put(el, '--mb-radius', shape ? px(b.radius) : null);
        put(el, '--mb-padding-x', shape ? px(b.pad_x) : null);
        put(el, '--mb-padding-y', shape ? px(b.pad_y) : null);
        put(el, '--mb-font-size', shape ? px(b.size) : null);
        put(el, '--mb-border-width', shape ? px(b.border_width) : null);
      }
    }
  }
  /* size: the width and height printed when the picked picture does not say its own */
  const picture = (put, img, value, alt, size) => {
    if (!img) return;
    const src = address(value, true), o = value && typeof value === 'object' ? value : {};
    put(img, 'src', src || null);
    put(img, '@width', String(src ? o.width || size[0] : 400));
    put(img, '@height', String(src ? o.height || size[1] : 300));
    put(img, '@alt', raw(alt) || raw(o.alt));
  };

  /* ---------- section types ---------- */
  const TYPES = {};
  TYPES.split = {
    derive(c) {
      const {root, s, put, q} = c, own = common(c, 'full_width');
      put(root, '--r7h-px-d', px(s.side_padding_desktop));
      put(root, '--r7h-px-m', px(s.side_padding_mobile));
      put(root, '@data-side', s.image_position === 'left' ? 'left' : 'right');
      put(root, '--hsm-media', pct(s.media_width_desktop, 50));
      put(root, '@data-full', bool(s.full_height));
      put(root, '--hsm-min-d', px(s.min_height_desktop, 560));
      put(root, '--hsm-media-h-m', px(s.media_height_mobile, 320));
      put(root, '--hsm-valign', {top: 'flex-start', bottom: 'flex-end'}[s.vertical_align] || 'center');
      put(root, '@data-media-first', bool(s.mobile_image_first));
      put(root, '--hsm-fx', pct(s.image_position_x, 50));
      put(root, '--hsm-fy', pct(s.image_position_y, 50));
      put(root, '--hsm-radius', own ? px(s.image_radius) : null);
      picture(put, q('[data-r7h-image]'), s.image, s.image_alt, [1600, 1200]);
      put(q('[data-r7h-video]'), 'video', videoSrc(s) || null);
      textBlocks(c);
    },
    behave: video,
  };
  TYPES.collage = {
    derive(c) {
      const {root, s, put, q} = c, own = common(c, 'container');
      const tiles = c.blocks.filter(x => x.type === 'image');
      put(root, '@data-side', s.image_position === 'left' ? 'left' : 'right');
      put(root, '--hcl-media', pct(s.media_width_desktop, 45));
      put(root, '--hcl-ratio', RATIO[s.image_aspect_ratio] || '1 / 1');
      put(root, '--hcl-gap', px(s.collage_gap));
      put(root, '--hcl-offset', px(s.collage_offset_desktop));
      put(root, '--hcl-tile-m', pct(s.tile_width_mobile, 75));
      put(root, '--hcl-radius', own ? px(s.image_radius) : null);
      put(root, '@data-media-first', bool(s.mobile_image_first));
      put(q('[data-r7h-nav]'), 'hidden', isFalse(s.show_arrows) || tiles.length < 2);
      for (const blk of tiles) {
        const href = address(blk.b.link), el = c.tag(blk, href ? 'A' : 'DIV');
        put(el, 'tag', href ? 'A' : 'DIV');
        put(el, 'href', href || null);
        picture(put, el.querySelector('[data-r7h-image]'), blk.b.image, blk.b.alt, [900, 1125]);
      }
      textBlocks(c);
    },
    behave: scroller,
  };

  /* ---------- behaviour: the video of a Hero Split ---------- */
  function video(root, st) {
    const el = root.querySelector('[data-r7h-video]'), btn = root.querySelector('[data-r7h-video-toggle]');
    if (!el) return;
    const signal = st.ac.signal, reduce = matchMedia('(prefers-reduced-motion: reduce)');
    /* user: null until the visitor presses the button, then true (play) or false (pause) */
    const state = {seen: false, user: null};
    const wanted = () => state.seen && !document.hidden && (state.user === null ? !reduce.matches : state.user);
    const sync = () => {
      const has = el.hasAttribute('src');
      if (el.hidden === has) el.hidden = !has;
      if (btn && btn.hidden === has) btn.hidden = !has;
      const play = has && wanted();
      if (play && el.paused) { const p = el.play(); if (p && p.catch) p.catch(() => {}); }
      else if (!play && !el.paused) el.pause();
      if (btn) { const on = String(has && (state.user === null ? !reduce.matches : state.user)); if (btn.getAttribute('aria-pressed') !== on) btn.setAttribute('aria-pressed', on); }
    };
    st.media = {sync};
    if ('IntersectionObserver' in window) {
      st.io = new IntersectionObserver(entries => { state.seen = entries[entries.length - 1].isIntersecting; sync(); }, {threshold: 0.2});
      st.io.observe(el.parentElement);
    } else state.seen = true;
    document.addEventListener('visibilitychange', sync, {signal});
    reduce.addEventListener('change', sync, {signal});
    if (btn) btn.addEventListener('click', () => { state.user = btn.getAttribute('aria-pressed') !== 'true'; sync(); }, {signal});
    sync();
  }

  /* ---------- behaviour: the picture row of a Hero Collage ---------- */
  function scroller(root, st) {
    const track = root.querySelector('[data-r7h-track]'), prev = root.querySelector('[data-r7h-prev]'), next = root.querySelector('[data-r7h-next]');
    if (!track) return;
    const signal = st.ac.signal, reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!root.isConnected) return;
      const max = track.scrollWidth - track.clientWidth, x = Math.abs(track.scrollLeft), can = max > 1;
      /* a row that does not scroll (desktop, where the arrows are not shown) keeps the arrows as they were printed */
      const atStart = !can || x <= 1, atEnd = can && x >= max - 1;
      if (prev && prev.disabled !== atStart) prev.disabled = atStart;
      if (next && next.disabled !== atEnd) next.disabled = atEnd;
      /* the keyboard reaches the row only while it scrolls */
      if (can) { if (track.getAttribute('tabindex') !== '0') track.setAttribute('tabindex', '0'); } else if (track.hasAttribute('tabindex')) track.removeAttribute('tabindex');
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    st.stop = () => cancelAnimationFrame(frame);
    const step = () => { const tile = track.querySelector('.hcl__tile'), cs = getComputedStyle(track); return tile ? tile.getBoundingClientRect().width + (parseFloat(cs.columnGap) || 0) : track.clientWidth; };
    const move = by => track.scrollBy({left: by * step(), behavior: reduce.matches ? 'auto' : 'smooth'});
    const forward = () => getComputedStyle(track).direction === 'rtl' ? -1 : 1;
    track.addEventListener('scroll', schedule, {passive: true, signal});
    if (prev) prev.addEventListener('click', () => move(-forward()), {signal});
    if (next) next.addEventListener('click', () => move(forward()), {signal});
    track.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (track.scrollWidth - track.clientWidth <= 1) return;
      e.preventDefault();
      move(e.key === 'ArrowRight' ? 1 : -1);
    }, {signal});
    if ('ResizeObserver' in window) { st.ro = new ResizeObserver(schedule); st.ro.observe(track); }
    schedule();
  }

  /* ---------- engine ---------- */
  function derive(root, st, record) {
    const type = TYPES[root.dataset.r7h], out = [];
    const put = (el, key, v) => {
      if (!el) return;
      out.push([el, key, v]);
      if (record === 'audit' || key === 'tag') return;
      let m = st.last.get(el); if (!m) st.last.set(el, m = new Map());
      if (record) { if (!m.has(key)) m.set(key, v); return; }
      if (m.has(key) && m.get(key) === v) return;
      m.set(key, v);
      write(st, el, key, v);
    };
    const blocks = [...root.querySelectorAll(BLOCK)].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.r7hBlock;
      if (st.rawBlocks.get(id) !== el.dataset.r7hBlockSettings) { st.rawBlocks.set(id, el.dataset.r7hBlockSettings); st.blocks.set(id, {...parse(el.dataset.r7hBlockSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.r7hType, b: st.blocks.get(id)};
    });
    /* on load and in an audit the markup is left as it is; a live edit swaps the tag */
    const tag = (blk, name) => record ? blk.el : (blk.el = retag(blk.el, name));
    if (type) type.derive({root, st, s: st.s, put, blocks, tag, q: sel => root.querySelector(sel)});
    return out;
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.r7hSettings) { st.raw = root.dataset.r7hSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
  }
  function drop(root, st) {
    cancelAnimationFrame(st.frame);
    st.ac.abort();
    if (st.io) st.io.disconnect();
    if (st.ro) st.ro.disconnect();
    if (st.stop) st.stop();
    roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.r7h];
    if (!type) return;
    /* the settings are printed in the builder only: without them the builder's redraw shows each change */
    const editable = root.hasAttribute('data-r7h-settings');
    const st = {root, editable, ac: new AbortController(), live: {}, liveBlocks: new Map(), s: parse(root.dataset.r7hSettings), raw: root.dataset.r7hSettings, blocks: new Map(), rawBlocks: new Map(), last: new WeakMap(), rich: new Map(), frame: 0};
    st.schedule = () => { if (editable && !st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    roots.set(root, st);
    stats.setups++;
    if (editable) {
      /* a redraw keeps the wrapper: margins a live edit wrote there give way to the new markup */
      const wrap = root.parentElement;
      if (wrap && wrap.id === 'shopify-section-' + root.dataset.r7hSection) for (const k of ['--r7h-mt-m', '--r7h-mb-m', '--r7h-mt-d', '--r7h-mb-d']) wrap.style.removeProperty(k);
      derive(root, st, true);
    }
    if (type.behave) type.behave(root, st);
    root.dataset.r7hReady = '';
  }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll(SEL)) { const st = roots.get(root); if (st) st.schedule(); else add(root); }
    watch();
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id || v.sectionId || '' : v || '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId || d.section_id); if (!id || !d.settings) return;
    const bRaw = d.block || d.blockId || d.block_id, bid = bRaw ? String(bRaw.id || bRaw) : '';
    for (const [root, st] of roots) {
      if (root.dataset.r7hSection !== id || !st.editable) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); if (st.blocks.has(bid)) st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load', 'shopify:section:unload']) document.addEventListener(name, () => (name === 'shopify:section:unload' ? requestAnimationFrame(scan) : scan()));
  /* The builder adds, removes and redraws sections in place; a visitor's page does not, so nothing is watched there. */
  const editing = () => (window.Shopify && window.Shopify.designMode) || document.documentElement.classList.contains('shopify-design-mode') || !!document.querySelector('[data-r7h-settings]');
  let watching = false;
  function watch() {
    if (watching || !editing()) return;
    watching = true;
    const hit = n => n.nodeType === 1 && (n.matches(SEL + ',' + BLOCK) || n.querySelector(SEL + ',' + BLOCK));
    new MutationObserver(records => {
      if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',' + BLOCK) : [...r.addedNodes, ...r.removedNodes].some(hit))) scan();
    }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-r7h-settings', 'data-r7h-block-settings']});
  }

  /* ---------- audit (tests) ---------- */
  const norm = v => String(v ?? '').trim().replace(/\s+/g, ' ').replace(/-?\d*\.?\d+/g, n => String(+n));
  const bare = v => String(v || '').replace(/([?&])width=\d+&?/, '$1').replace(/[?&]$/, '');
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    if (!st.editable) return [];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = norm(el === root.parentElement ? getComputedStyle(el).getPropertyValue(key) : el.style.getPropertyValue(key)); want = v == null ? '' : norm(v); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'width') { have = WIDTHS.filter(w => el.classList.contains(w)).join(' '); }
      else if (key === 'text') { have = el.textContent.trim(); want = raw(v).trim(); }
      else if (key === 'html') { have = el.innerHTML.trim(); want = raw(v).trim(); }
      else if (key === 'href') { have = el.getAttribute('href') || ''; want = v || ''; }
      else if (key === 'tag') { have = el.tagName; }
      else if (key === 'src') { have = el.hasAttribute('data-r7h-empty') ? '' : bare(el.getAttribute('src')); want = bare(v); }
      else if (key === 'video') { have = el.getAttribute('src') || ''; want = v || ''; }
      else continue;
      if (have !== want) bad.push((el.dataset.r7hBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaR7Hero = {TYPES, roots, stats, scan, audit};
  Promise.resolve().then(scan);
})();
