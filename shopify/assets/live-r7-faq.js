/* Materia Themes. FAQ Search (sections/faq-search.storelib) and FAQ With
   Contact Card (sections/faq-contact-card.storelib). Linked by those two
   sections only, so it loads on pages that have one.

   The questions are <details>, opened and closed by the browser (one at a
   time through their shared name unless the section allows several). This
   file adds what markup cannot do:

   Search: as the visitor types, a question stays when every word typed is
   in its question, its answer or its extra search words, capitals and
   accents aside. The matching words are tinted (CSS Custom Highlight, where
   the browser has it), the count line says how many are left, and a polite
   live region reads it out once typing pauses. Escape or the clear button
   empties the field; Enter moves to the first question left.

   Live edits (builder only): every root [data-r7f] carries its settings as
   JSON and every block its own. derive() turns them into outputs (a CSS
   variable, an attribute, text) per element, the same values the templates
   print, so on load the first derive is only recorded. After that an output
   is written only when its value changes, once per frame per root, so an
   open question stays open and a typed search stays typed through an
   unrelated edit. audit() lists outputs whose markup differs (tests). */
(() => {
  if (window.MateriaR7Faq) return;
  const SEL = '[data-r7f]';
  const TYPES = {'faq-search': {kind: 'search', align: 'center'}, 'faq-contact-card': {kind: 'card', align: 'left'}};
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
  const itemsOf = root => [...root.querySelectorAll('[data-r7f-item]')].filter(el => el.closest(SEL) === root);

  /* ---------- search ---------- */
  const fold = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const texts = new WeakMap();
  function textOf(item) {
    const q = item.querySelector('[data-r7f-question]'), a = item.querySelector('[data-r7f-answer]');
    const raw = (q ? q.textContent : '') + ' ' + (a ? a.textContent : '') + ' ' + (item.dataset.r7fKeys || '');
    let t = texts.get(item);
    if (!t || t.raw !== raw) texts.set(item, t = {raw, folded: fold(raw)});
    return t.folded;
  }
  /* the folded text of one text node, and for each of its characters where it starts in the node */
  function foldMap(text) {
    let out = '', i = 0; const at = [];
    for (const ch of text) { const f = fold(ch); for (let k = 0; k < f.length; k++) at.push(i); out += f; i += ch.length; }
    at.push(i);
    return [out, at];
  }
  const HL = window.Highlight && window.CSS && CSS.highlights ? new Highlight() : null;
  if (HL) CSS.highlights.set('r7f-match', HL);
  const ranges = new WeakMap(), timers = new WeakMap();
  function unmark(root) { if (HL) for (const r of ranges.get(root) || []) HL.delete(r); ranges.delete(root); }
  function mark(root, words, items) {
    if (!HL) return;
    unmark(root);
    if (!words.length) return;
    const out = [];
    for (const it of items) {
      if (it.hidden) continue;
      for (const part of it.querySelectorAll('[data-r7f-question], [data-r7f-answer]')) {
        const walk = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const [f, at] = foldMap(n.data);
          for (const w of words) for (let i = f.indexOf(w); i >= 0; i = f.indexOf(w, i + 1)) {
            const r = new Range(); r.setStart(n, at[i]); r.setEnd(n, at[i + w.length]);
            out.push(r); HL.add(r);
          }
        }
      }
    }
    ranges.set(root, out);
  }
  function search(root, announce) {
    const input = root.querySelector('[data-r7f-input]'), status = root.querySelector('[data-r7f-status]');
    if (!input || !status) return;
    const words = fold(input.value).split(/\s+/).filter(Boolean), items = itemsOf(root);
    let left = 0;
    for (const it of items) {
      const text = textOf(it), hit = words.every(w => text.includes(w));
      if (it.hidden === hit) it.hidden = !hit;
      if (hit) left++;
    }
    const state = !words.length ? '' : left ? 'count' : 'empty';
    const msg = state === 'count' ? (status.dataset.count || '').replace(/\[count\]/g, left).replace(/\[total\]/g, items.length) : state === 'empty' ? status.dataset.empty || '' : '';
    if (status.textContent !== msg) status.textContent = msg;
    if ((status.dataset.state || '') !== state) { if (state) status.dataset.state = state; else delete status.dataset.state; }
    const list = root.querySelector('[data-r7f-list]'), clear = root.querySelector('[data-r7f-clear]');
    if (list && list.hidden !== (state === 'empty')) list.hidden = state === 'empty';
    if (clear && clear.hidden !== !input.value) clear.hidden = !input.value;
    mark(root, words, items);
    const live = root.querySelector('[data-r7f-live]');
    if (live && announce) { clearTimeout(timers.get(root)); timers.set(root, setTimeout(() => { if (live.isConnected && live.textContent !== msg) live.textContent = msg; }, 400)); }
  }
  function empty(root, focus) {
    const input = root.querySelector('[data-r7f-input]'); if (!input) return;
    if (input.value) { input.value = ''; search(root, true); }
    if (focus) input.focus();
  }
  document.addEventListener('input', e => {
    const input = e.target && e.target.closest && e.target.closest('[data-r7f-input]'); if (!input) return;
    const root = input.closest(SEL); if (root) search(root, true);
  });
  document.addEventListener('keydown', e => {
    const input = e.target && e.target.closest && e.target.closest('[data-r7f-input]'); if (!input) return;
    const root = input.closest(SEL); if (!root) return;
    if (e.key === 'Escape' && input.value) { e.preventDefault(); empty(root, true); }
    else if (e.key === 'Enter') { e.preventDefault(); const first = itemsOf(root).find(it => !it.hidden); if (first) first.querySelector('summary').focus(); }
  });
  document.addEventListener('click', e => {
    const clear = e.target && e.target.closest && e.target.closest('[data-r7f-clear]'); if (!clear) return;
    const root = clear.closest(SEL); if (root) empty(root, true);
  });
  /* The builder picked a question block: show it (clear a search that hides it) and open it. */
  document.addEventListener('shopify:block:select', e => {
    const d = e.detail || {}, id = d.blockId || d.block_id || '';
    let el = e.target && e.target.closest ? e.target.closest('[data-r7f-block]') : null;
    if (!el && id) el = document.querySelector('[data-r7f-block="' + CSS.escape(String(id)) + '"]');
    if (!el || !el.matches('[data-r7f-item]')) return;
    const root = el.closest(SEL); if (!root) return;
    if (el.hidden) empty(root, false);
    el.open = true;
  });

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = String(value || '').replace(/<[^>]*>/g, '');
  }
  /* a (with a link) or the plain tag (without): the same element kept when the tag does not change */
  function link(el, href, plain, st) {
    const tag = href ? 'A' : plain;
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      st.last.set(next, st.last.get(el) || new Map());
      el = next;
    }
    if (href) { el.setAttribute('href', href); el.removeAttribute('type'); } else { el.removeAttribute('href'); if (plain === 'BUTTON') el.setAttribute('type', 'button'); }
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
    else if (key === 'href') return link(el, v, 'BUTTON', st);
    else if (key === 'line') return link(el, v, 'SPAN', st);
    else if (key === 'first') { const it = itemsOf(st.root)[0]; if (it) it.open = !!v; }
    return el;
  }

  /* ---------- derive ---------- */
  const custom = s => bool(s.enable_custom_style);
  const pick = (on, v, f) => on ? color(v, f) : f;
  const CARD_BG = 'color-mix(in srgb, var(--color-heading) 5%, var(--color-background))';
  function section(c) {
    const {root, s, put} = c, o = custom(s), type = c.st.type, f = bool(s.enable_custom_fonts);
    const v = s.color_scheme && s.color_scheme.id || s.color_scheme;
    if (typeof v === 'string' && /^[\w-]+$/.test(v)) put(root, 'scheme', v);
    put(root, '--r7f-bg', pick(o, s.section_bg, 'var(--color-background)'));
    put(root, '--r7f-pt-m', px(s.padding_top_mobile, 56)); put(root, '--r7f-pb-m', px(s.padding_bottom_mobile, 56)); put(root, '--r7f-pt-d', px(s.padding_top, 60)); put(root, '--r7f-pb-d', px(s.padding_bottom, 60));
    put(root, '--r7f-maxw', px(s.max_content_width, 760)); put(root, '--r7f-gap-header', px(s.gap_header_to_items, 28)); put(root, '--r7f-py', px(s.item_padding_y, 20));
    put(root, '--r7f-q-m', px(s.question_size_mobile, 16)); put(root, '--r7f-q-d', px(s.question_size_desktop, 18)); put(root, '--r7f-a-m', px(s.answer_size_mobile, 15)); put(root, '--r7f-a-d', px(s.answer_size_desktop, 16));
    put(root, '--r7f-q-color', pick(o, s.question_color, 'var(--color-heading)')); put(root, '--r7f-hover', pick(o, s.hover_color, 'var(--color-primary)')); put(root, '--r7f-icon', pick(o, s.icon_color, 'var(--color-heading)'));
    put(root, '--r7f-a-color', pick(o, s.answer_color, 'var(--color-text)')); put(root, '--r7f-divider', pick(o, s.divider_color, 'var(--color-border)'));
    const qw = bool(s.enable_custom_question_weight);
    put(root, '--r7f-qw', qw ? String(s.question_weight || 600) : null);
    put(root, '--r7f-hf', f && font(s.heading_font) || null); put(root, '--r7f-bf', f && font(s.body_font) || null);
    put(root, '@data-r7f-width', s.section_width || 'fluid_container');
    put(root, '@data-r7f-align', s.content_alignment || type.align);
    put(root, '@data-r7f-icon', s.open_icon || 'plus');
    put(root, '@data-r7f-qw', qw || null);
    if (type.kind === 'card') {
      put(root, '--r7f-col-gap', px(s.col_gap, 56));
      put(root, '--r7f-card-bg', pick(o, s.card_bg, CARD_BG)); put(root, '--r7f-card-border', pick(o, s.card_border_color, 'transparent'));
      put(root, '--r7f-card-h', pick(o, s.card_heading_color, 'var(--color-heading)')); put(root, '--r7f-card-text', pick(o, s.card_text_color, 'var(--color-text)'));
      put(root, '@data-r7f-side', s.card_position || 'right'); put(root, '@data-r7f-sticky', bool(s.card_sticky) ? 'true' : 'false');
    } else {
      put(root, '--r7f-field-bg', o ? color(s.field_bg, 'var(--input-bg, var(--color-background))') : null);
      put(root, '--r7f-field-border', o ? color(s.field_border_color, 'var(--input-border-color, var(--color-border))') : null);
      put(root, '--r7f-field-text', o ? color(s.field_text_color, 'var(--field-text, var(--field-text-override, var(--color-text)))') : null);
      const label = c.q('[data-r7f-search-label]'), input = c.q('[data-r7f-input]'), status = c.q('[data-r7f-status]');
      if (label) { const t = s.search_label || label.dataset.fallback || ''; put(label, 'text', t); put(input, '@placeholder', t); }
      put(input, '--body-font', f && font(s.body_font) || null);
      put(status, '@data-count', s.count_text || ''); put(status, '@data-empty', s.empty_text || '');
    }
    put(root, 'first', bool(s.first_item_open));
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
  function question(c, x) {
    const {put, s} = c, b = x.b, f = bool(s.enable_custom_fonts);
    const q = x.el.querySelector('[data-r7f-question]'), a = x.el.querySelector('[data-r7f-answer]');
    if (q) { put(q, 'text', b.question || q.dataset.fallback || ''); put(q, '@data-own-font', f || null); put(q, '@data-own-weight', bool(s.enable_custom_question_weight) || null); }
    if (a) { put(a, 'rich', b.answer || ''); put(a, '@data-own-font', f || null); }
    put(x.el, '@data-r7f-keys', b.keywords || null);
    put(x.el, '@name', bool(s.allow_multiple_open) ? null : 'r7f-' + c.root.dataset.r7fSection);
  }
  function cardText(c, x) {
    const {put, s} = c, b = x.b, f = bool(s.enable_custom_fonts);
    const h = x.el.querySelector('[data-r7f-card-heading]'), t = x.el.querySelector('[data-r7f-card-body]');
    if (h) { put(h, 'rich', b.heading || ''); put(h, 'hidden', blank(b.heading)); put(h, '@data-own-font', f || null); }
    if (t) { put(t, 'rich', b.text || ''); put(t, 'hidden', blank(b.text)); put(t, '@data-own-font', f || null); }
    put(x.el, 'hidden', blank(b.heading) && blank(b.text));
  }
  const SIZES = {small: ['13px', '10px', '18px'], large: ['16px', '16px', '32px']};
  function button(c, x) {
    const {put} = c, b = x.b, own = custom(b), shape = b.use_theme_button === false || b.use_theme_button === 'false';
    let el = x.el.querySelector('[data-r7f-btn]'); if (!el) return;
    el = put(el, 'href', url(b.link) || '');
    put(el, 'text', b.label || el.dataset.fallback || '');
    const style = b.style || 'primary';
    put(el, '.style', 'r7f__btn--' + style);
    /* Link style is a plain underlined link, outside the theme button contract */
    put(el, '@data-theme-button', style === 'text' ? null : style === 'secondary' ? 'secondary' : 'primary');
    put(el, '@data-sl-button', style !== 'text' || null);
    put(el, '@data-button-local-appearance', style === 'text' ? 'underline' : 'theme');
    put(el, '@data-full', bool(b.full_width) ? 'true' : 'false');
    put(el, '@data-own-shape', shape || null);
    put(el, '--mb-bg', own ? color(b.bg_color, 'var(--btn-primary-bg-color)') : null);
    put(el, '--mb-text', own ? color(b.text_color, 'var(--btn-primary-color)') : null);
    put(el, '--mb-border', own ? color(b.border_color, 'var(--btn-primary-border-color, var(--btn-primary-bg-color))') : null);
    put(el, '--mb-hover-bg', own ? color(b.bg_color_hover, 'var(--btn-primary-hover-bg-color)') : null);
    put(el, '--mb-hover-text', own ? color(b.text_color_hover, 'var(--btn-primary-hover-color)') : null);
    const z = SIZES[b.size] || ['14px', '13px', '24px'];
    put(el, '--mb-radius', shape ? px(b.radius, 100) : null);
    put(el, '--mb-font-size', shape ? z[0] : null); put(el, '--mb-padding-y', shape ? z[1] : null); put(el, '--mb-padding-x', shape ? z[2] : null);
  }
  /* A contact line's link: its Link, or its text when that is an email address or a phone number. */
  function lineHref(b) {
    const own = url(b.link), t = String(b.text == null ? '' : b.text).trim();
    if (own || !t) return own;
    const compact = t.replace(/ /g, ''), digits = compact.replace(/[+\-().]/g, '');
    if (t.includes('@') && compact === t) return 'mailto:' + t;
    return /^\d{6,}$/.test(digits) ? 'tel:' + compact.replace(/[\-().]/g, '') : '';
  }
  function line(c, x) {
    const {put} = c, b = x.b, t = String(b.text == null ? '' : b.text).trim();
    const label = x.el.querySelector('[data-r7f-line-label]');
    let value = x.el.querySelector('[data-r7f-line-value]');
    if (label) { put(label, 'text', b.label || ''); put(label, 'hidden', blank(b.label)); }
    if (value) { value = put(value, 'line', lineHref(b)); put(value, 'text', t); put(value, 'hidden', !t); }
    put(x.el, 'hidden', blank(b.label) && !t);
  }
  const BLOCKS = {heading: header, subheading: header, faq_item: question, card_text: cardText, button, contact_line: line};

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
    const blocks = [...root.querySelectorAll('[data-r7f-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.r7fBlock;
      if (st.rawBlocks.get(id) !== el.dataset.r7fBs) { st.rawBlocks.set(id, el.dataset.r7fBs); st.blocks.set(id, {...parse(el.dataset.r7fBs), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: el.dataset.r7fType, b: st.blocks.get(id) || {}};
    });
    const c = {root, st, s: st.s, put, q: sel => root.querySelector(sel)};
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
    if (st.raw !== root.dataset.r7fSettings) { st.raw = root.dataset.r7fSettings; st.s = {...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    /* the words, the extra search words or the count line may have changed */
    search(root, false);
  }
  function drop(root, st) {
    st.mq.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame); clearTimeout(timers.get(root)); unmark(root); roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.r7f]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    /* a visitor's page carries no settings JSON: only the search runs there */
    const editable = root.hasAttribute('data-r7f-settings');
    const st = {root, type, editable, live: {}, liveBlocks: new Map(), s: parse(root.dataset.r7fSettings), raw: root.dataset.r7fSettings, blocks: new Map(), rawBlocks: new Map(), last: new Map(), mq: matchMedia('(min-width: 768px)'), frame: 0};
    st.schedule = () => { if (editable && !st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule);
    roots.set(root, st);
    if (editable) derive(root, st, true);
    /* a field the browser refilled after a reload */
    const input = root.querySelector('[data-r7f-input]'); if (input && input.value) search(root, false);
    root.dataset.r7fReady = '';
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
      if (root.dataset.r7fSection !== id || !st.editable) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-r7f-block]') || n.querySelector(SEL + ',[data-r7f-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-r7f-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-r7f-settings', 'data-r7f-bs']});
  /* Test helper: outputs whose markup value differs from the derived one. */
  function audit(root) {
    const st = roots.get(root); if (!st) return ['not initialised'];
    const bad = [];
    for (const [el, key, v] of derive(root, st, 'audit')) {
      let have, want = v;
      if (key.startsWith('--')) { have = el.style.getPropertyValue(key).trim(); want = v == null ? '' : String(v).trim(); }
      else if (key[0] === '@') { have = el.getAttribute(key.slice(1)); if (v === true || v === false || v == null) { have = have !== null; want = !!v; } else want = String(v); }
      else if (key === 'hidden') { have = el.hidden; want = !!v; }
      else if (key === 'text') { have = el.textContent; want = v == null ? '' : String(v); }
      else if (key === 'scheme') { have = el.classList.contains('color-' + v); want = true; }
      else if (key === 'href' || key === 'line') { have = el.getAttribute('href') || ''; want = v || ''; }
      else if (key[0] === '.') { have = el.classList.contains(v); want = true; }
      else continue;
      if (have !== want) bad.push((el.dataset.r7fBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaR7Faq = {scan, audit, roots, search, fold, lineHref};
  scan();
})();
