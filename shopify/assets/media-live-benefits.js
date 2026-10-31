/* Materia Themes. Live editor updates for the benefits Image and video sections:
   Image & Video with Text, Image & Video Benefits, Image With Text Benefits and
   Image & Text Dual.

   Every root [data-mlb-root] carries its settings, defaults and block defaults
   as JSON; every block carries its own. derive() turns settings into a list of
   outputs (a CSS variable, an attribute, text, a picture...) per element. The
   Liquid prints the same outputs, so on load the first derive is only
   recorded, never painted. After that an output is written only when its
   value changes, one frame per root, so a picture never reloads and a video
   never restarts for an unrelated edit. audit() compares the derived outputs
   with what the markup carries (used by the tests). */
(() => {
  if (window.MateriaMediaBenefits) return;
  const SEL = '[data-mlb-root]';
  const roots = new Map();
  const touched = new WeakMap();
  const parse = v => { try { return JSON.parse(v || '{}') || {}; } catch (_) { return {}; } };
  const bool = v => v === true || v === 'true';
  const num = (v, d = 0) => v !== '' && v != null && Number.isFinite(+v) ? +v : d;
  const px = v => num(v) + 'px';
  const api = () => window.MateriaHeroImageOne;
  const localColor = (v, f) => { if (v && typeof v === 'object') { if (v.alpha === 0 || v.a === 0) return f; v = v.hex ?? v.value ?? v.color; } v = typeof v === 'string' ? v.trim() : ''; return v && CSS.supports('color', v) && v !== 'transparent' && !/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(v) && !/^#[0-9a-f]{6}00$/i.test(v) ? v : f; };
  const color = (v, f) => (api() && api().color ? api().color(v, f) : localColor(v, f)) || f;
  const localUrl = (v, image) => { v = v && typeof v === 'object' ? v.src || v.url || v.preview_image?.src || v.preview_image?.url || v.value : v; if (typeof v !== 'string' || !v || v === '#') return ''; try { return (image ? ['http:', 'https:', 'data:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(new URL(v, location.href).protocol) ? v : ''; } catch (_) { return /^\//.test(v) ? v : ''; } };
  const url = (v, image = false) => { const a = api() && api().url ? api().url(v, image) : ''; return a || localUrl(v, image); };
  const fontCss = (v, f) => {
    if (v && typeof v === 'object' && v.family) return v.family + ', ' + (v.fallback_families || 'sans-serif');
    const fam = api() && api().font ? api().font(v) : '';
    return !fam ? f : /^var\(|,/.test(fam) ? fam : fam + ', sans-serif';
  };
  const videoSrc = v => {
    if (!v) return '';
    if (typeof v === 'string') return url(v, true);
    const list = v.sources || v.preview?.sources || [];
    const mp4 = list.find(x => /mp4/.test(x.mime_type || x.format || '')) || list[0];
    return mp4 ? url(mp4.url || mp4.src, true) : '';
  };
  const PH = '<svg class="mlb__ph" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><g fill="currentColor"><circle cx="172" cy="124" r="14"/><path d="M140 192l40-46 25 28 20-18 35 36z"/></g></svg>';
  const tpl = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };

  /* ---------- writers ---------- */
  function rich(el, value) {
    if (api() && api().rich) { api().rich(el, value, {rich: new WeakMap()}); return; }
    el.textContent = String(value || '').replace(/<[^>]*>/g, '');
  }
  function cleanSvg(code) {
    const svg = tpl(String(code || '')).querySelector('svg');
    if (!svg) return null;
    svg.querySelectorAll('script,foreignObject,style').forEach(n => n.remove());
    for (const n of [svg, ...svg.querySelectorAll('*')]) for (const a of [...n.attributes]) if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) n.removeAttribute(a.name);
    svg.setAttribute('aria-hidden', 'true');
    return svg;
  }
  function media(el, v, prev) {
    const d = parse(v), p = parse(prev);
    if (d.t === 'keep') return;
    const cur = el.querySelector(':scope > img, :scope > video, :scope > svg.mlb__ph, :scope > .video-wrapper');
    if (cur && p.t === d.t && p.src === d.src) { if (d.t === 'img' && cur.tagName === 'IMG') cur.alt = d.alt || ''; return; }
    let n;
    if (d.t === 'img') { n = document.createElement('img'); n.alt = d.alt || ''; if (d.w && d.h) { n.width = d.w; n.height = d.h; } n.loading = 'lazy'; n.decoding = 'async'; n.src = d.src; }
    else if (d.t === 'video') { n = document.createElement('video'); n.muted = true; n.playsInline = true; for (const a of ['muted', 'playsinline']) n.setAttribute(a, ''); n.setAttribute('preload', 'metadata'); n.src = d.src; }
    else n = tpl(PH).firstChild;
    if (cur) cur.replaceWith(n); else el.prepend(n);
  }
  function icon(el, v, prev, root) {
    const d = parse(v);
    let n = null;
    if (d.t === 'image' && d.src) { n = document.createElement('img'); n.alt = ''; n.width = 100; n.height = 100; n.loading = 'lazy'; n.src = d.src; }
    else if (d.t === 'svg') n = cleanSvg(d.code);
    else if (d.t === 'library') { const t = root.querySelector('template[data-mlb-icon="' + CSS.escape(d.n || '') + '"]'); if (t) n = t.content.cloneNode(true); else return; }
    if (d.t === 'image' && !d.src) return;
    if (n) el.replaceChildren(n); else el.replaceChildren();
  }
  function link(el, href, st) {
    const tag = href ? 'A' : 'BUTTON';
    if (el.tagName !== tag) {
      const next = document.createElement(tag);
      for (const a of el.attributes) next.setAttribute(a.name, a.value);
      next.replaceChildren(...el.childNodes);
      el.replaceWith(next);
      st.last.set(next, st.last.get(el) || new Map());
      el = next;
    }
    if (href) { el.setAttribute('href', href); el.removeAttribute('type'); } else { el.removeAttribute('href'); el.setAttribute('type', 'button'); }
    return el;
  }
  function write(el, key, v, prev, st) {
    if (key.startsWith('--')) { if (v == null || v === '') el.style.removeProperty(key); else el.style.setProperty(key, String(v)); }
    else if (key[0] === '!') { const k = key.slice(1); if (v == null || v === '') el.style.removeProperty(k); else el.style.setProperty(k, String(v), 'important'); let set = touched.get(el); if (!set) touched.set(el, set = new Set()); set.add(k); }
    else if (key[0] === '@') { const n = key.slice(1); if (v == null || v === false) el.removeAttribute(n); else el.setAttribute(n, v === true ? '' : String(v)); }
    else if (key === 'hidden') el.hidden = !!v;
    else if (key === 'text') el.textContent = v == null ? '' : String(v);
    else if (key === 'rich') rich(el, v);
    else if (key === 'muted') { el.muted = !!v; if (v) el.setAttribute('muted', ''); else el.removeAttribute('muted'); }
    else if (key === 'scheme') { for (const c of [...el.classList]) if (c.startsWith('color-')) el.classList.remove(c); el.classList.add('color-' + v); }
    else if (key === 'media') media(el, v, prev);
    else if (key === 'icon') icon(el, v, prev, st.root);
    else if (key === 'href') return link(el, v, st);
    return el;
  }

  /* ---------- shared derive pieces ---------- */
  const custom = s => bool(s.enable_custom_style);
  const pick = (own, v, f) => own ? color(v, f) : f;
  function common(c, cfg) {
    const {root, s, wrap, put, desktop} = c, own = custom(s), fonts = bool(s.enable_custom_fonts);
    const scheme = s.color_scheme && s.color_scheme.id || s.color_scheme;
    if (typeof scheme === 'string' && /^[\w-]+$/.test(scheme)) put(root, 'scheme', scheme);
    put(root, '@data-width', s.section_width || 'full_width');
    put(root, '@data-side', s[cfg.side] || 'left');
    put(root, '@data-align', s[cfg.align] || 'left');
    put(root, '@data-align-m', s[cfg.alignM] || 'left');
    put(root, '@data-order-m', s.mobile_order || 'media_first');
    put(root, '--m-bg', pick(own, s.section_bg, 'var(--color-background)'));
    put(root, '--m-text', pick(own, s.text_color, 'var(--color-text)'));
    put(root, '--m-hf', fonts ? fontCss(s.heading_font, 'var(--heading-font)') : 'var(--heading-font)');
    put(root, '--m-bf', fonts ? fontCss(s.body_font, 'var(--body-font)') : 'var(--body-font)');
    for (const [k, id] of [['pt-m', 'padding_top_mobile'], ['pb-m', 'padding_bottom_mobile'], ['pt-d', 'padding_top_desktop'], ['pb-d', 'padding_bottom_desktop'], ['px-m', 'side_padding_mobile'], ['px-d', 'side_padding_desktop'], ['gap-m', cfg.gapM], ['gap-d', cfg.gapD], ['cgap', 'content_gap']]) put(root, '--m-' + k, px(s[id]));
    put(root, '--m-tw', cfg.tw(s) + '%');
    if (wrap) for (const side of ['top', 'bottom']) put(wrap, '!margin-' + side, px(s['section_margin_' + side + '_' + (desktop ? 'desktop' : 'mobile')]));
  }
  function textBlock(c, el, b, kind) {
    const {put} = c, own = custom(b);
    put(el, 'rich', b.text || '');
    put(el, 'hidden', !String(b.text || '').trim());
    const fb = kind === 'heading' ? 'var(--color-heading)' : 'var(--color-text)';
    put(el, '--b-c', pick(own, b.color, fb));
    if (b.size_desktop != null || b.size_mobile != null) { put(el, '--b-fs-m', px(b.size_mobile)); put(el, '--b-fs-d', px(b.size_desktop)); }
    else if (kind === 'subheading') { put(el, '--b-fs-m', px(b.size)); put(el, '--b-fs-d', px(b.size)); }
    else put(el, '--b-fs', px(b.size));
    if (kind === 'heading' && b.uppercase !== undefined) put(el, '--b-tt', bool(b.uppercase) ? 'uppercase' : 'var(--heading-text-transform, none)');
    if (kind === 'footnote') put(el, '--b-mt', px(b.margin_top));
  }
  function button(c, el, b) {
    const {put, root} = c, own = custom(b), shape = b.use_theme_button === false || b.use_theme_button === 'false';
    const href = url(b.link) || root.dataset.mlbFallbackHref || '';
    el = put(el, 'href', href);
    put(el, 'text', b.label || '');
    put(el, 'hidden', !String(b.label || '').trim());
    put(el, '@data-theme-button', b.button_style === 'secondary' ? 'secondary' : 'primary');
    put(el, '@data-full', bool(b.full_width) ? 'true' : 'false');
    const cv = v => own ? color(v, '') : '';
    const bg = cv(b.bg), hb = cv(b.bg_hover);
    put(el, '--mb-bg', bg || null); put(el, '--mb-text', cv(b.color) || null); put(el, '--mb-border', cv(b.border_color) || bg || null);
    put(el, '--mb-hover-bg', hb || null); put(el, '--mb-hover-text', cv(b.color_hover) || null); put(el, '--mb-hover-border', cv(b.border_color_hover) || hb || null);
    put(el, '--mb-radius', shape ? px(b.radius) : null); put(el, '--mb-padding-y', shape ? px(b.padding_y) : null); put(el, '--mb-padding-x', shape ? px(b.padding_x) : null);
    put(el, '--mb-font-size', shape ? px(b.font_size) : null); put(el, '--mb-weight', shape ? String(b.font_weight || 600) : null); put(el, '--btn-border-width', shape ? px(b.border_width) : null);
    put(el, '--btn-text-transform', bool(b.uppercase) ? 'uppercase' : null);
  }
  /* image or video for one frame: a section's media or a media block's */
  function mediaDesc(type, image, video, videoUrl, alt) {
    if (type === 'video' || type === 'video_url') {
      const src = type === 'video_url' ? url(videoUrl, true) : videoSrc(video) || url(videoUrl, true);
      if (src) return {t: 'video', src};
      if (video && type === 'video') return {t: 'keep'};
    }
    const src = url(image, true);
    if (src) return {t: 'img', src, alt: alt || (image && image.alt) || '', w: image && image.width || 0, h: image && image.height || 0};
    return {t: 'ph'};
  }
  function frame(c, el, d, autoplay, loop, controls, muted = true) {
    const {put} = c;
    put(el, 'media', JSON.stringify(d));
    put(el, '@data-autoplay', autoplay ? 'true' : 'false');
    const v = el.querySelector(':scope > video, :scope > .video-wrapper video');
    if (v) { put(v, '@loop', !!loop); put(v, '@controls', !!controls); put(v, 'muted', !!muted); }
  }

  /* ---------- section types ---------- */
  const TYPES = {
    'image-and-video-text': {
      bp: 900,
      cfg: {side: 'image_position', align: 'content_align', alignM: 'content_align_mobile', gapD: 'gap_desktop', gapM: 'gap_mobile', tw: s => num(s.text_column_width, 50)},
      derive(c) {
        const {root, s, put, q} = c;
        put(root, '--m-ar', num(s.aspect_w, 4) + ' / ' + num(s.aspect_h, 5));
        put(root, '--m-r', px(s.image_radius));
        put(root, '--m-fit', s.image_fit || 'cover');
        put(root, '@data-overlay', bool(s.enable_overlay) ? 'true' : 'false');
        put(root, '--ivt-ov', color(s.overlay_color, '#000000'));
        put(root, '--ivt-ov-op', String(num(s.overlay_opacity, 30)));
        const el = q('[data-mlb-media]');
        if (el) frame(c, el, mediaDesc(s.media_type === 'video' ? 'video' : 'image', s.image, s.video, s.video_url, s.image_alt), s.media_type === 'video' && bool(s.video_autoplay), bool(s.video_loop), bool(s.video_controls));
      },
    },
    'image-text-benefits': {
      bp: 768,
      cfg: {side: 'image_side', align: 'text_align', alignM: 'text_align_mobile', gapD: 'col_gap_desktop', gapM: 'col_gap_mobile', tw: s => 100 - num(s.media_ratio, 50)},
      derive(c) {
        const {root, s, put, q} = c, own = custom(s);
        put(root, '--m-ar', s.media_aspect_ratio || '4/3');
        put(root, '--m-r', px(s.media_radius));
        put(root, '--m-fit', s.media_fit || 'cover');
        put(root, '--m-ph-bg', pick(own, s.media_placeholder_bg, 'color-mix(in srgb, var(--color-text) 8%, var(--color-background))'));
        put(root, '--ivb-bgap', px(s.benefit_gap));
        put(root, '--ivb-tile', px(s.icon_tile_size));
        put(root, '--ivb-glyph', num(s.icon_glyph_size, 50) + '%');
        put(root, '@data-tile-shape', s.icon_tile_shape || 'round');
        put(root, '--ivb-tile-bg', pick(own, s.icon_tile_bg, 'var(--color-heading)'));
        put(root, '--ivb-tile-c', pick(own, s.icon_tile_color, 'var(--color-background)'));
        const el = q('[data-mlb-media]');
        if (el) frame(c, el, mediaDesc(s.media_type === 'video' ? 'video' : 'image', s.image, s.video, s.video_url, s.image_alt), s.media_type === 'video' && bool(s.video_autoplay), bool(s.video_loop), bool(s.video_controls));
      },
      block(c, el, b, type) {
        if (type !== 'benefit') return false;
        const {put} = c, own = custom(b), ic = el.querySelector('.ivb__benefit-icon'), t = el.querySelector('.ivb__benefit-title'), d = el.querySelector('.ivb__benefit-desc');
        const src = b.icon_type || 'library';
        put(ic, 'icon', JSON.stringify(src === 'image' ? {t: 'image', src: url(b.icon_image, true)} : src === 'svg' ? {t: 'svg', code: b.icon_svg || ''} : {t: 'library', n: b.icon || 'check_circle'}));
        put(ic, '--b-ic', pick(own, b.icon_color, 'var(--ivb-tile-c)'));
        put(t, 'rich', b.title || ''); put(t, 'hidden', !String(b.title || '').trim()); put(t, '--b-c', pick(own, b.title_color, 'var(--color-heading)'));
        put(d, 'rich', b.description || ''); put(d, 'hidden', !String(b.description || '').trim()); put(d, '--b-c', pick(own, b.desc_color, 'var(--color-text)'));
        return true;
      },
    },
    'image-with-text-benefits': {
      bp: 900,
      cfg: {side: 'media_position', align: 'content_align', alignM: 'content_align_mobile', gapD: 'gap_desktop', gapM: 'gap_mobile', tw: s => 100 - num(s.media_column_width, 50)},
      derive(c) {
        const {root, s, put, q, blocks} = c, own = custom(s);
        const vars = {'--m-ar': num(s.media_aspect_w, 3) + ' / ' + num(s.media_aspect_h, 4), '--m-r': px(s.media_radius), '--iwb-mgap': px(s.media_gap), '--iwb-tmax': px(s.text_max_width),
          '--iwb-pt': pick(own, s.progress_track, 'var(--color-border)'), '--iwb-pf': pick(own, s.progress_fill, 'var(--color-heading)'), '--iwb-ph': px(s.progress_height), '--iwb-pm': px(s.progress_margin),
          '--iwb-cols-d': String(num(s.benefits_per_row_desktop, 2)), '--iwb-cols-m': String(num(s.benefits_per_row_mobile, 1)), '--iwb-bgap-d': px(s.benefit_gap_desktop), '--iwb-bgap-m': px(s.benefit_gap_mobile),
          '--iwb-igap': px(s.benefit_inner_gap), '--iwb-bpad': px(s.benefit_padding), '--iwb-bbg': pick(own, s.benefit_bg, 'color-mix(in srgb, var(--color-text) 4%, var(--color-background))'),
          '--iwb-br': px(s.benefit_radius), '--iwb-bbw': px(s.benefit_border_width), '--iwb-bbc': pick(own, s.benefit_border_color, 'var(--color-border)'),
          '--iwb-hs': px(s.benefit_heading_size), '--iwb-hc': pick(own, s.benefit_heading_color, 'var(--color-heading)'), '--iwb-hgap': px(s.benefit_heading_gap),
          '--iwb-ts': px(s.benefit_text_size), '--iwb-tc': pick(own, s.benefit_text_color, 'var(--color-text)'),
          '--iwb-is': px(s.icon_size), '--iwb-ipad': px(s.icon_padding), '--iwb-ir': px(s.icon_radius), '--iwb-ic': pick(own, s.icon_color, 'var(--color-primary)'), '--iwb-ibg': pick(own, s.icon_bg, 'transparent')};
        for (const k in vars) put(root, k, vars[k]);
        put(root, '@data-benefit-layout', s.benefit_layout || 'vertical');
        const count = blocks.filter(x => x.type === 'media').length, per = s.per_row || '1.2';
        let value, layout;
        if (per === 'auto') { value = count <= 1 ? 1 : count === 2 ? 2 : 2.5; layout = count <= 1 ? 'single' : count === 2 ? 'side_by_side' : 'carousel'; }
        else { value = num(per, 1.2); layout = count > value ? 'carousel' : value <= 1 || count <= 1 ? 'single' : 'side_by_side'; }
        put(root, '--iwb-per', per === 'auto' ? String(value) : String(per));
        const grid = q('.iwb__media-grid'), bar = q('.iwb__progress');
        if (grid) put(grid, '@data-layout', layout);
        if (bar) put(bar, 'hidden', !(layout === 'carousel' && count > 1));
      },
      block(c, el, b, type) {
        const {put} = c;
        if (type === 'media') { const v = b.media_type || 'image'; frame(c, el, mediaDesc(v, b.image, b.video, v === 'video' ? '' : b.video_url, b.alt), v !== 'image' && b.autoplay !== false && b.autoplay !== 'false', b.loop !== false && b.loop !== 'false', bool(b.show_controls), b.muted !== false && b.muted !== 'false'); return true; }
        if (type !== 'benefit') return false;
        const ic = el.querySelector('.iwb__benefit-icon'), h = el.querySelector('.iwb__benefit-heading'), t = el.querySelector('.iwb__benefit-text');
        let src = b.icon_source || 'library';
        if ((src === 'image' && !url(b.icon_image, true)) || (src === 'svg' && !String(b.icon_svg || '').trim())) src = 'library';
        put(ic, 'icon', JSON.stringify(src === 'image' ? {t: 'image', src: url(b.icon_image, true)} : src === 'svg' ? {t: 'svg', code: b.icon_svg} : src === 'none' ? {t: 'none'} : {t: 'library', n: b.icon_name || 'check'}));
        put(ic, 'hidden', src === 'none');
        put(h, 'rich', b.heading || ''); put(h, 'hidden', !String(b.heading || '').trim());
        put(t, 'rich', b.text || ''); put(t, 'hidden', !String(b.text || '').trim());
        return true;
      },
    },
    'dual-image-with-text': {
      bp: 900,
      cfg: {side: 'image_position', align: 'content_align', alignM: 'content_align_mobile', gapD: 'gap_desktop', gapM: 'gap_mobile', tw: s => num(s.text_column_width, 45)},
      derive(c) {
        const {root, s, put, blocks} = c, own = custom(s), dca = pick(own, s.dot_color, 'var(--color-border)');
        put(root, '--m-ar', num(s.aspect_ratio_w, 4) + ' / ' + num(s.aspect_ratio_h, 4));
        put(root, '@data-dots', bool(s.show_dots) ? 'true' : 'false');
        put(root, '@data-dots-front', bool(s.dots_behind_main) ? 'false' : 'true');
        put(root, '--itd-ds', px(s.dot_size)); put(root, '--itd-ds-b', px(Math.round(num(s.dot_size, 60) * 0.6)));
        put(root, '--itd-do', String(num(s.dot_opacity, 60)));
        for (const k of ['a_x', 'a_y', 'b_x', 'b_y']) put(root, '--itd-' + k.replace('_', ''), num(s['dot_' + k]) + '%');
        put(root, '--itd-dca', dca); put(root, '--itd-dcb', pick(own, s.dot_color_b, dca));
        const accent = blocks.find(x => x.type === 'accent_image');
        put(root, '@data-accent-front', accent && bool(accent.b.above_main) ? 'true' : 'false');
      },
      block(c, el, b, type) {
        if (type !== 'main_image' && type !== 'accent_image') return false;
        const {put} = c, accent = type === 'accent_image';
        put(el, '@data-anchor', b.anchor || (accent ? 'bottom_right' : 'top_left'));
        put(el, '--b-size', num(b.size, 65) + '%'); put(el, '--b-r', px(b.radius)); put(el, '--b-rot', num(b.rotation) + 'deg');
        put(el, '--b-px', num(b.position_x, 50) + '%'); put(el, '--b-py', num(b.position_y, 50) + '%'); put(el, '--b-fit', b.fit || 'cover');
        put(el, '@data-shadow', bool(b.shadow) ? 'true' : 'false');
        if (accent) {
          put(el, '--b-size-m', num(b.size_mobile, 60) + '%'); put(el, '--b-ox', num(b.offset_x) + '%'); put(el, '--b-oy', num(b.offset_y) + '%');
          put(el, '--b-scale', String(num(b.scale, 100))); put(el, '--b-bw', px(b.border_width));
          put(el, '--b-bc', pick(custom(b), b.border_color, 'var(--color-background)')); put(el, '@data-hide-m', bool(b.hide_on_mobile) ? 'true' : 'false');
        }
        put(el, 'media', JSON.stringify(mediaDesc('image', b.image, null, '', b.alt)));
        return true;
      },
    },
  };

  /* ---------- engine ---------- */
  function derive(root, st, record) {
    const type = TYPES[root.dataset.mlbRoot]; if (!type) return [];
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
    const blocks = [...root.querySelectorAll('[data-mlb-block]')].filter(el => el.closest(SEL) === root).map(el => {
      const id = el.dataset.mlbBlock, t = el.dataset.mlbType;
      if (st.rawBlocks.get(id) !== el.dataset.mlbSettings) { st.rawBlocks.set(id, el.dataset.mlbSettings); st.blocks.set(id, {...parse(el.dataset.mlbSettings), ...(st.liveBlocks.get(id) || {})}); }
      return {el, id, type: t, b: {...(st.blockDefaults[t] || {}), ...st.blocks.get(id)}};
    });
    const c = {root, st, s: st.s, put, blocks, wrap: root.closest('.shopify-section'), desktop: st.mq.matches, q: sel => root.querySelector(sel)};
    common(c, type.cfg);
    type.derive(c);
    for (const x of blocks) {
      if (type.block && type.block(c, x.el, x.b, x.type)) continue;
      if (x.type === 'button') button(c, x.el, x.b);
      else if (['eyebrow', 'heading', 'subheading', 'footnote'].includes(x.type)) textBlock(c, x.el, x.b, x.type);
    }
    return out;
  }
  function videos(root, st) {
    const stop = st.reduced.matches || document.hidden || !st.visible;
    for (const holder of root.querySelectorAll('[data-mlb-media]')) {
      const v = holder.querySelector('video'); if (!v) continue;
      const auto = holder.dataset.autoplay === 'true';
      if (auto && !stop) { v.muted = v.muted || v.hasAttribute('muted'); const p = v.play && v.play(); if (p && p.catch) p.catch(() => {}); }
      else if (!v.paused || v.autoplay) { v.autoplay = false; v.removeAttribute('autoplay'); try { v.pause(); } catch (_) {} if (auto && st.reduced.matches) v.controls = true; }
    }
  }
  function carousel(root, st) {
    const grid = root.querySelector('.iwb__media-grid'); if (!grid || st.carousel === grid) return;
    st.carousel = grid;
    if (st.carouselAbort) st.carouselAbort.abort();
    const ac = new AbortController(), sig = {signal: ac.signal}; st.carouselAbort = ac;
    const on = () => grid.dataset.layout === 'carousel';
    const update = () => {
      const bar = root.querySelector('.iwb__progress'), fill = bar && bar.querySelector('.iwb__progress-fill'); if (!fill || !on()) return;
      const max = grid.scrollWidth - grid.clientWidth, pct = max <= 0 ? 100 : Math.max(0, Math.min(100, grid.scrollLeft / max * 100));
      fill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', String(Math.round(pct)));
    };
    let tick = 0, down = null, moved = false;
    grid.addEventListener('scroll', () => { if (!tick) tick = requestAnimationFrame(() => { tick = 0; update(); }); }, {passive: true, ...sig});
    grid.addEventListener('pointerdown', e => { if (!on() || e.pointerType !== 'mouse' || e.button !== 0) return; down = {x: e.clientX, left: grid.scrollLeft}; moved = false; }, sig);
    window.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x; if (!moved && Math.abs(dx) < 5) return; if (!moved) { moved = true; grid.classList.add('iwb--dragging'); } e.preventDefault(); grid.scrollLeft = down.left - dx; }, {passive: false, ...sig});
    const up = () => { if (!down) return; down = null; if (moved) { grid.classList.remove('iwb--dragging'); grid.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }, {capture: true, once: true}); } };
    window.addEventListener('pointerup', up, sig); window.addEventListener('blur', up, sig);
    grid.addEventListener('dragstart', e => { if (on()) e.preventDefault(); }, sig);
    grid.addEventListener('keydown', e => {
      if (!on() || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      const slot = grid.querySelector('.iwb__slot'); if (!slot) return;
      e.preventDefault(); grid.scrollBy({left: (e.key === 'ArrowLeft' ? -1 : 1) * (slot.offsetWidth + (parseFloat(getComputedStyle(grid).columnGap) || 0)), behavior: st.reduced.matches ? 'auto' : 'smooth'});
    }, sig);
    st.update = update; update();
  }
  function paint(root, st) {
    if (st.raw !== root.dataset.mlbSettings) { st.raw = root.dataset.mlbSettings; st.s = {...st.defaults, ...parse(st.raw), ...st.live}; }
    derive(root, st, false);
    const grid = root.querySelector('.iwb__media-grid');
    if (grid) { grid.tabIndex = grid.dataset.layout === 'carousel' ? 0 : -1; if (grid.dataset.layout !== 'carousel') grid.removeAttribute('tabindex'); }
    videos(root, st);
    if (st.update) st.update();
  }
  function drop(root, st) {
    st.io.disconnect(); st.mq.removeEventListener('change', st.schedule); st.reduced.removeEventListener('change', st.schedule);
    cancelAnimationFrame(st.frame); if (st.carouselAbort) st.carouselAbort.abort(); roots.delete(root);
  }
  function add(root) {
    const type = TYPES[root.dataset.mlbRoot]; if (!type) return;
    const wrap = root.closest('.shopify-section');
    if (wrap) { const set = touched.get(wrap); if (set) { for (const k of set) wrap.style.removeProperty(k); set.clear(); } }
    const defaults = parse(root.dataset.mlbDefaults);
    const st = {root, defaults, live: {}, liveBlocks: new Map(), s: {...defaults, ...parse(root.dataset.mlbSettings)}, raw: root.dataset.mlbSettings, blocks: new Map(), rawBlocks: new Map(), blockDefaults: parse(root.dataset.mlbBlockDefaults), last: new Map(), visible: true,
      mq: matchMedia('(min-width: ' + type.bp + 'px)'), reduced: matchMedia('(prefers-reduced-motion: reduce)')};
    st.schedule = () => { if (!st.frame) st.frame = requestAnimationFrame(() => { st.frame = 0; if (root.isConnected) paint(root, st); }); };
    st.mq.addEventListener('change', st.schedule); st.reduced.addEventListener('change', st.schedule);
    st.io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; videos(root, st); });
    st.io.observe(root);
    roots.set(root, st);
    derive(root, st, true);
    carousel(root, st);
    st.schedule();
    root.dataset.mlbReady = '';
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
      if (root.dataset.mlbSection !== id) continue;
      if (bid) { st.liveBlocks.set(bid, {...st.liveBlocks.get(bid), ...d.settings}); st.blocks.set(bid, {...st.blocks.get(bid), ...d.settings}); }
      else { Object.assign(st.live, d.settings); Object.assign(st.s, d.settings); }
      st.schedule();
    }
  });
  document.addEventListener('visibilitychange', () => { for (const [root, st] of roots) videos(root, st); });
  for (const name of ['DOMContentLoaded', 'storelib:section-load', 'shopify:section:load']) document.addEventListener(name, scan);
  const watched = n => n.nodeType === 1 && (n.matches(SEL + ',[data-mlb-block]') || n.querySelector(SEL + ',[data-mlb-block]'));
  new MutationObserver(records => {
    if (records.some(r => r.type === 'attributes' ? r.target.matches(SEL + ',[data-mlb-block]') : [...r.addedNodes, ...r.removedNodes].some(watched))) scan();
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-mlb-settings']});
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
      else continue;
      if (have !== want) bad.push((el.dataset.mlbBlock || el.className || el.tagName) + ' ' + key + ': markup ' + JSON.stringify(have) + ' vs ' + JSON.stringify(want));
    }
    return bad;
  }
  window.MateriaMediaBenefits = {scan, audit, roots};
  scan();
})();
