/* Materia Themes. Live editor updates for the text-grid Image and video sections:
   Image With Text Bento, Image With Icons, Image With Text Multirow and Image
   With Text Grid. Each root ([data-tg-root]) carries its section id, settings
   and defaults; each block carries its id, type and settings. Every setting is
   a CSS variable, attribute or text node, written here the same way the Liquid
   writes it, once per frame per root and only where the value changed. */
(() => {
  if (window.MateriaTextGrid) return;
  const roots = new Map();
  const BP = {bento: 768, icons: 900, multirow: 900, grid: 900};
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = (v, d = 0) => num(v, d) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const blank = v => v == null || (typeof v === 'string' && v.trim() === '') || (typeof v === 'object' && !Object.keys(v).length);
  const col = (on, v) => on && api() ? api().color(v, '') : '';
  const fontVar = v => !v ? '' : typeof v === 'object' && v.family ? v.family + ', ' + (v.fallback_families || 'sans-serif') : (api() ? api().font(v) : '');
  const fontW = v => v && typeof v === 'object' && v.family && v.weight ? String(v.weight) : '';
  const strip = v => String(v || '').replace(/<[^>]*>/g, '').trim();
  function prop(el, k, v) {
    if (!el) return;
    v = v == null ? '' : String(v);
    if (!v) { if (el.style.getPropertyValue(k) !== '') el.style.removeProperty(k); }
    else if (el.style.getPropertyValue(k).trim() !== v) el.style.setProperty(k, v);
  }
  function imp(el, k, v) {
    if (!el) return;
    if (!v) { if (el.style.getPropertyValue(k) !== '') el.style.removeProperty(k); }
    else if (el.style.getPropertyValue(k) !== v || el.style.getPropertyPriority(k) !== 'important') el.style.setProperty(k, v, 'important');
  }
  const vars = (el, map) => { for (const k in map) prop(el, k, map[k]); };
  const show = (el, on) => { if (el && el.hidden === !!on) el.hidden = !on; };
  const text = (el, v) => { v = v == null ? '' : String(v); if (el && el.textContent !== v) el.textContent = v; };
  /* Rich text the Liquid already printed is left as it is until its value changes. */
  const rich = (el, v, st) => { if (!el || !api()) return; if (!st.seen.has(el)) { st.seen.add(el); st.rich.set(el, v || ''); } api().rich(el, v || '', st); };
  const attr = (el, k, v) => { if (el && el.getAttribute(k) !== String(v)) el.setAttribute(k, v); };
  const align = v => v === 'center' ? ['center', 'center'] : v === 'right' ? ['flex-end', 'right'] : ['flex-start', 'left'];

  /* An image keeps its node and src until its own setting changes. */
  function image(img, v, st, placeholder, alt) {
    if (!img) return;
    const key = JSON.stringify(v ?? null);
    if (!st.img.has(img)) st.img.set(img, key);
    else if (st.img.get(img) !== key) {
      st.img.set(img, key);
      const src = (api() && api().url(v, true)) || placeholder;
      img.removeAttribute('srcset');
      if (img.getAttribute('src') !== src) img.src = src;
      img.classList.toggle('tg__ph', src === placeholder);
    }
    const a = img.classList.contains('tg__ph') ? '' : (v && typeof v === 'object' && v.alt) || alt || '';
    attr(img, 'alt', a);
  }

  /* Theme button contract: <a href> with a link, <button type="button"> without. */
  function button(el, b, label, link, p = '') {
    const href = api() ? api().url(link) : '';
    const tag = href ? 'A' : 'BUTTON';
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next); el = next;
    }
    if (href) { attr(el, 'href', href); el.removeAttribute('type'); } else { el.removeAttribute('href'); attr(el, 'type', 'button'); }
    text(el, label); show(el, !blank(label));
    const own = bool(b.enable_custom_style), shape = b.use_theme_button === false || b.use_theme_button === 'false';
    const c = id => col(own, b[p + id]);
    vars(el, {
      '--mb-bg': c('bg'), '--mb-text': c('color'), '--mb-border': c('border_color') || c('bg'),
      '--mb-hover-bg': c('bg_hover'), '--mb-hover-text': c('color_hover'), '--mb-hover-border': c('border_color_hover') || c('bg_hover'),
      '--mb-radius': shape ? px(b[p + 'radius']) : '', '--mb-padding-y': shape ? px(b[p + 'padding_y']) : '', '--mb-padding-x': shape ? px(b[p + 'padding_x']) : '',
      '--mb-font-size': shape ? px(b[p + 'font_size']) : '', '--mb-weight': shape && !blank(b[p + 'font_weight']) ? b[p + 'font_weight'] : '',
      '--btn-border-width': shape ? px(b[p + 'border_width']) : '',
      '--btn-text-transform': bool(b.uppercase) ? 'uppercase' : shape && 'uppercase' in b ? 'none' : '',
      '--tg-btn-w': bool(b.full_width) ? '100%' : '',
    });
    return el;
  }

  /* Eyebrow, heading, subheading and button blocks (Image With Icons, Image With Text Grid). */
  function textBlock(el, type, b, st) {
    const own = bool(b.enable_custom_style);
    if (type === 'eyebrow') { text(el, b.text); show(el, !blank(b.text)); vars(el, {'--tg-c': col(own, b.color), '--tg-size': px(b.size, 12)}); }
    else if (type === 'heading' || type === 'subheading') { rich(el, b.text, st); show(el, !blank(b.text)); vars(el, {'--tg-c': col(own, b.color), '--tg-size-d': px(b.size_desktop), '--tg-size-m': px(b.size_mobile)}); }
    else if (type === 'button') button(el, b, b.label, b.link);
  }

  function blocks(root, st) {
    const out = [];
    for (const el of root.querySelectorAll('[data-tg-block]')) {
      if (el.closest('[data-tg-root]') !== root) continue;
      const id = el.dataset.tgBlock, type = el.dataset.tgType;
      if (st.rawBlocks.get(id) !== el.dataset.tgSettings) { st.rawBlocks.set(id, el.dataset.tgSettings); st.blocks.set(id, parse(el.dataset.tgSettings)); }
      out.push([el, type, {...(st.blockDefaults[type] || {}), ...st.blocks.get(id)}]);
    }
    return out;
  }

  const PAINT = {
    bento(root, st, s) {
      const custom = bool(s.enable_custom_style), cols = Math.max(1, num(s.columns, 3)), q = sel => root.querySelector(sel);
      vars(root, {
        '--iwb-cols': cols, '--iwb-scale': num(s.scale_desktop, 100) / 100, '--iwb-gap-d': px(s.gap_desktop), '--iwb-gap-m': px(s.gap_mobile),
        '--iwb-row-d': px(s.row_height_desktop), '--iwb-row-m': px(s.row_height_mobile), '--iwb-radius': px(s.card_radius), '--iwb-pad': px(s.card_padding),
        '--iwb-head-gap': px(s.head_gap), '--iwb-h2-d': px(s.section_heading_size_desktop), '--iwb-h2-m': px(s.section_heading_size_mobile),
        '--iwb-h3-d': px(s.card_heading_size_desktop), '--iwb-h3-m': px(s.card_heading_size_mobile), '--iwb-body': px(s.card_body_size),
        '--iwb-head-color': col(custom, s.section_heading_color), '--iwb-sub-color': col(custom, s.section_subheading_color),
      });
      rich(q('.iwb__title'), s.heading, st); show(q('.iwb__title'), !blank(s.heading));
      rich(q('.iwb__sub'), s.subheading, st); show(q('.iwb__sub'), !blank(s.subheading));
      show(q('.iwb__head'), !blank(s.heading) || !blank(s.subheading));
      for (const [el, type, b] of blocks(root, st)) {
        const own = bool(b.enable_custom_style), cs = Math.max(1, num(b.col_span_desktop, 1));
        vars(el, {'--iwb-cs-d': Math.min(cs, cols), '--iwb-cs-t': Math.min(cs, 2), '--iwb-rs': Math.max(1, num(b.row_span_desktop, 1))});
        if (type === 'text_card') { attr(el, 'data-style', b.card_style || 'inverse'); vars(el, {'--iwb-card-bg': col(own, b.bg), '--iwb-card-fg': col(own, b.text_color)}); }
        if (type === 'text_over_image') { attr(el, 'data-position', b.content_position || 'center'); vars(el, {'--iwb-ov-op': num(b.overlay_opacity) / 100, '--iwb-card-fg': col(own, b.text_color), '--iwb-ov-color': col(own, b.overlay_color)}); }
        if (type !== 'text_card') image(el.querySelector('.iwb__bg img'), b.image, st, root.dataset.tgPlaceholder, strip(b.heading));
        if (type !== 'image_card') {
          const cap = el.querySelector('.iwb__caption'), h = el.querySelector('.iwb__heading'), body = el.querySelector('.iwb__body');
          text(cap, b.caption); show(cap, !blank(b.caption)); rich(h, b.heading, st); show(h, !blank(b.heading)); rich(body, b.body, st); show(body, !blank(b.body));
        }
      }
    },

    icons(root, st, s) {
      const custom = bool(s.enable_custom_style), [ai, ta] = align(s.content_align), [aim, tam] = align(s.content_align_mobile);
      vars(root, {
        '--iwi-dir': s.image_position === 'right' ? 'row-reverse' : 'row', '--iwi-ai-d': ai, '--iwi-ta-d': ta, '--iwi-ai-m': aim, '--iwi-ta-m': tam,
        '--iwi-tw': num(s.text_column_width, 50) + '%', '--iwi-gap-d': px(s.gap_desktop), '--iwi-gap-m': px(s.gap_mobile), '--iwi-cgap': px(s.content_gap),
        '--iwi-fc-d': num(s.features_columns_desktop, 4), '--iwi-fc-m': num(s.features_columns_mobile, 2), '--iwi-fg-d': px(s.features_gap_desktop), '--iwi-fg-m': px(s.features_gap),
        '--iwi-fmt': px(s.features_margin_top), '--iwi-icon': px(s.icon_size, 44), '--iwi-icon-r': ({rounded: '8px', square: '0px'})[s.icon_radius_style] || '999px',
        '--iwi-glyph': num(s.icon_glyph_size, 50) + '%', '--iwi-lsize': px(s.feature_label_size, 13), '--iwi-lw': s.feature_label_weight || '500',
        '--iwi-icon-bg': col(custom, s.icon_bg), '--iwi-icon-fg': col(custom, s.icon_color), '--iwi-label': col(custom, s.feature_label_color),
      });
      for (let [el, type, b] of blocks(root, st)) {
        const own = bool(b.enable_custom_style);
        if (type === 'image') {
          vars(el, {'--iwi-ar': num(b.aspect_w, 4) + ' / ' + num(b.aspect_h, 3), '--iwi-r': px(b.radius), '--iwi-fit': b.fit || 'cover'});
          image(el.querySelector('img'), b.image, st, root.dataset.tgPlaceholder, '');
        } else if (type === 'feature') {
          const label = el.querySelector('.iwi__feature-label'), icon = el.querySelector('.iwi__icon');
          text(label, b.label); show(label, !blank(b.label));
          vars(el, {'--iwi-icon-bg': col(own, b.icon_bg), '--iwi-icon-fg': col(own, b.icon_color), '--iwi-label': col(own, b.label_color)});
          const kind = b.icon_type || 'library', key = kind + '|' + JSON.stringify(kind === 'library' ? b.icon_library : kind === 'svg' ? b.icon_svg : b.icon_image ?? null);
          if (!st.icon.has(icon)) st.icon.set(icon, key);
          else if (st.icon.get(icon) !== key) {
            st.icon.set(icon, key);
            if (kind === 'library') { const t = root.querySelector('template[data-tg-icon="' + CSS.escape(b.icon_library || '') + '"]'); icon.replaceChildren(...(t ? [t.content.cloneNode(true)] : [])); }
            else if (kind === 'svg') icon.replaceChildren(...svg(b.icon_svg));
            else { const src = api() && api().url(b.icon_image, true); if (src) { const img = document.createElement('img'); img.src = src; img.alt = ''; img.width = 88; img.height = 88; img.loading = 'lazy'; icon.replaceChildren(img); } else icon.replaceChildren(); }
          }
        } else if (type !== 'features_row') textBlock(el, type, b, st);
      }
    },

    multirow(root, st, s) {
      const custom = bool(s.enable_custom_style), [ai, ta] = align(s.content_align), [aim, tam] = align(s.content_align_mobile);
      vars(root, {
        '--iwm-ai-d': ai, '--iwm-ta-d': ta, '--iwm-ai-m': aim, '--iwm-ta-m': tam, '--iwm-tw': num(s.text_column_width, 50) + '%',
        '--iwm-rg-d': px(s.row_gap_desktop), '--iwm-rg-m': px(s.row_gap_mobile), '--iwm-cg-d': px(s.col_gap_desktop), '--iwm-cg-m': px(s.col_gap_mobile), '--iwm-cgap': px(s.content_gap),
        '--iwm-ar': num(s.image_aspect_w, 1) + ' / ' + num(s.image_aspect_h, 1), '--iwm-r': px(s.image_radius), '--iwm-fit': s.image_fit || 'cover',
        '--iwm-cap-size': px(s.caption_size, 12), '--iwm-h-d': px(s.heading_size_desktop), '--iwm-h-m': px(s.heading_size_mobile), '--iwm-hw': s.heading_weight && s.heading_weight !== 'theme' ? s.heading_weight : '',
        '--iwm-b-d': px(s.body_size_desktop), '--iwm-b-m': px(s.body_size_mobile),
        '--iwm-img-bg': col(custom, s.image_bg), '--iwm-cap-c': col(custom, s.caption_color), '--iwm-head-c': col(custom, s.heading_color), '--iwm-body-c': col(custom, s.body_color),
      });
      let i = 0;
      for (const [el, type, b] of blocks(root, st)) {
        if (type !== 'row') continue;
        i++;
        const own = bool(b.enable_custom_style), pos = b.image_position;
        attr(el, 'data-side', pos === 'left' || pos === 'right' ? pos : bool(s.alternate_rows) && i % 2 === 0 ? 'right' : 'left');
        const r = v => !v || v === 'section' ? ['', ''] : align(v), [rai, rta] = r(b.content_align_desktop), [raim, rtam] = r(b.content_align_mobile);
        vars(el, {'--iwm-ai-d': rai, '--iwm-ta-d': rta, '--iwm-ai-m': raim, '--iwm-ta-m': rtam, '--iwm-row-bg': col(own, b.row_bg), '--iwm-row-pad': px(b.row_padding), '--iwm-row-r': px(b.row_radius)});
        image(el.querySelector('.iwm__media img'), b.image, st, root.dataset.tgPlaceholder, strip(b.heading));
        const cap = el.querySelector('.iwm__caption'), h = el.querySelector('.iwm__heading'), body = el.querySelector('.iwm__body');
        text(cap, b.caption); show(cap, !blank(b.caption)); rich(h, b.heading, st); show(h, !blank(b.heading)); rich(body, b.body, st); show(body, !blank(b.body));
        const btn = el.querySelector('.iwm__btn'); if (btn) button(btn, b, b.btn_label, b.btn_link, 'btn_');
      }
    },

    grid(root, st, s) {
      const [ai, ta] = align(s.content_align), [aim, tam] = align(s.content_align_mobile);
      vars(root, {
        '--iwtg-dir': s.text_position === 'left' ? 'row-reverse' : 'row', '--iwtg-mdir': s.layout === 'thumbs_right' ? 'row-reverse' : 'row',
        '--iwtg-ai-d': ai, '--iwtg-ta-d': ta, '--iwtg-ai-m': aim, '--iwtg-ta-m': tam, '--iwtg-tw': num(s.text_column_width, 38) + '%',
        '--iwtg-g-d': px(s.gap_desktop), '--iwtg-g-m': px(s.gap_mobile), '--iwtg-cgap': px(s.content_gap), '--iwtg-thw': num(s.thumbs_width, 23) + '%', '--iwtg-thm': num(s.thumbs_mobile_width, 30) + '%',
        '--iwtg-mg': px(s.media_gap), '--iwtg-tg': px(s.thumbs_gap), '--iwtg-r': px(s.image_radius), '--iwtg-mar': num(s.main_aspect_w, 3) + ' / ' + num(s.main_aspect_h, 3),
        '--iwtg-tar': num(s.thumb_aspect_w, 1) + ' / ' + num(s.thumb_aspect_h, 1), '--iwtg-fit': s.main_fit || 'cover', '--iwtg-thumbs-m': bool(s.hide_thumbs_on_mobile) ? 'none' : 'flex',
      });
      for (const [el, type, b] of blocks(root, st)) {
        if (type === 'main_image' || type === 'thumb_image') image(el.querySelector('img'), b.image, st, root.dataset.tgPlaceholder, '');
        else textBlock(el, type, b, st);
      }
    },
  };

  /* Pasted SVG: only an <svg> root, no scripts, handlers or external references. */
  function svg(markup) {
    const t = document.createElement('template'); t.innerHTML = String(markup || '');
    const el = t.content.firstElementChild;
    if (!el || el.tagName.toLowerCase() !== 'svg') return [];
    el.querySelectorAll('script,foreignObject,iframe,style').forEach(n => n.remove());
    for (const n of [el, ...el.querySelectorAll('*')]) for (const a of [...n.attributes]) if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value) || (/href$/i.test(a.name) && !/^#/.test(a.value))) n.removeAttribute(a.name);
    return [el];
  }

  function paint(root, st) {
    if (!api()) return;
    if (st.raw !== root.dataset.tgSettings) { st.raw = root.dataset.tgSettings; st.s = {...st.defaults, ...parse(st.raw)}; }
    const s = st.s, custom = bool(s.enable_custom_style), fonts = bool(s.enable_custom_fonts), wrap = root.closest('.shopify-section') || root.parentElement;
    const scheme = s.color_scheme && typeof s.color_scheme === 'object' ? s.color_scheme.id : s.color_scheme;
    if (typeof scheme === 'string' && /^[\w-]+$/.test(scheme) && !root.classList.contains('color-' + scheme)) {
      for (const c of [...root.classList]) if (c.startsWith('color-')) root.classList.remove(c);
      root.classList.add('color-' + scheme);
    }
    const W = {container: 'calc(var(--page-width, 1300px) + 3rem)', fluid_container: 'calc(var(--fluid-container-width, 1500px) + 3rem)', custom: px(s.custom_max_width_desktop, 1200)};
    vars(root, {
      '--tg-maxw': W[s.section_width] || 'none', '--tg-stretch': s.section_width === 'stretch_width' ? '3rem' : '0px',
      '--tg-pt-d': px(s.padding_top_desktop), '--tg-pb-d': px(s.padding_bottom_desktop), '--tg-px-d': px(s.side_padding_desktop),
      '--tg-pt-m': px(s.padding_top_mobile), '--tg-pb-m': px(s.padding_bottom_mobile), '--tg-px-m': px(s.side_padding_mobile),
      '--tg-bg': col(custom, s.section_bg), '--tg-text': root.dataset.tgRoot !== 'bento' ? col(custom, s.text_color) : '',
      '--tg-hf': fonts ? fontVar(s.heading_font) : '', '--tg-hw': fonts ? fontW(s.heading_font) : '', '--tg-bf': fonts ? fontVar(s.body_font) : '', '--tg-bw': fonts ? fontW(s.body_font) : '',
    });
    const d = st.mq.matches, side = d ? 'desktop' : 'mobile', mt = num(s['section_margin_top_' + side]), mb = num(s['section_margin_bottom_' + side]);
    const margins = bool(s.reset_spacing) || ['top', 'bottom'].some(k => num(s['section_margin_' + k + '_desktop']) || num(s['section_margin_' + k + '_mobile']));
    imp(wrap, 'margin-top', margins ? mt + 'px' : ''); imp(wrap, 'margin-bottom', margins ? mb + 'px' : '');
    const own = root.parentElement, media = (el, on) => { if (el && el.media !== (on ? 'all' : 'not all')) el.media = on ? 'all' : 'not all'; };
    media(own && own.querySelector(':scope > style[data-rs-bulletproof]'), bool(s.reset_spacing));
    media(own && own.querySelector(':scope > style[data-tg-margins]'), margins);
    PAINT[root.dataset.tgRoot](root, st, s);
  }

  let listeners = 0;
  function drop(root, st) { st.mq.removeEventListener('change', st.schedule); listeners--; cancelAnimationFrame(st.frame); roots.delete(root); }
  function scan() {
    for (const [root, st] of roots) if (!root.isConnected) drop(root, st);
    for (const root of document.querySelectorAll('[data-tg-root]')) {
      if (roots.has(root)) { roots.get(root).schedule(); continue; }
      if (!PAINT[root.dataset.tgRoot]) continue;
      const defaults = parse(root.dataset.tgDefaults);
      const st = {defaults, raw: null, s: {}, blocks: new Map(), rawBlocks: new Map(), blockDefaults: parse(root.dataset.tgBlockDefaults), rich: new WeakMap(), seen: new WeakSet(), img: new WeakMap(), icon: new WeakMap(), frame: 0, mq: matchMedia('(min-width: ' + (BP[root.dataset.tgRoot] || 768) + 'px)')};
      st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
      st.mq.addEventListener('change', st.schedule); listeners++;
      roots.set(root, st); paint(root, st);
    }
  }
  const sectionId = v => String(v && typeof v === 'object' ? v.id || v.sectionId || '' : v || '').replace(/^shopify-section-/, '');
  document.addEventListener('storelib:settings-change', e => {
    const d = e.detail || {}, id = sectionId(d.section || d.sectionId);
    if (!id || !d.settings) return;
    for (const [root, st] of roots) {
      if (root.dataset.tgSection !== id) continue;
      const b = d.block || d.blockId || d.block_id;
      if (b) { const key = sectionId(b); st.blocks.set(key, {...(st.blocks.get(key) || {}), ...d.settings}); }
      else Object.assign(st.s, d.settings);
      st.schedule();
    }
  });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 && (n.matches('[data-tg-root],[data-tg-block]') || n.querySelector('[data-tg-root],[data-tg-block]'))))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-tg-settings']});
  window.MateriaTextGrid = {scan, size: () => roots.size, listeners: () => listeners};
  scan();
})();
