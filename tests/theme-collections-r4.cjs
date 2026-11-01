/* Collections sections (round 4): Category Banners, Category Banners 2,
   Collection Banner, Collections Display, Collection Hero Pro, Collection
   Lookbook, Collection List and Scrolling Collection.

   Schema, theme inheritance, every control (live and after a server redraw,
   at 375 and 1366), select options look different, first paint equals the
   hydrated paint, two instances stay apart, redraws re-initialise once, added
   blocks are live, pictures and running motion are kept on unrelated edits,
   reduced motion, collection data (title, picture, link, count) with an empty
   picker drawing a tidy placeholder in the editor and nothing broken on the
   storefront, no overflow at 375, no errors.

   LIQUIDJS=<path to liquidjs> node tests/theme-collections-r4.cjs [section ...] */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const {launch, mount, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'live-collections.js';
const IMG = {url: 'https://theme.test/pic.png', src: 'https://theme.test/pic.png', width: 800, height: 600, alt: 'Saved alt'};
const IMG2 = {url: 'https://theme.test/other.png', src: 'https://theme.test/other.png', width: 600, height: 800, alt: ''};
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
const PRODUCT = {id: 1, title: 'Linen shirt', handle: 'linen-shirt', url: '/products/linen-shirt', featured_image: {src: 'https://theme.test/shirt.png', url: 'https://theme.test/shirt.png', width: 600, height: 800, alt: 'Linen shirt'}};
const COLL = {id: 7, title: 'Summer edit', handle: 'summer-edit', url: '/collections/summer-edit', description: 'Light layers for warm days.', featured_image: IMG2, image: IMG2, products: [PRODUCT], products_count: 12, all_products_count: 12};
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const clone = o => JSON.parse(JSON.stringify(o));
const presetBlocks = name => clone(schemaOf(name).schema.presets[0].blocks || []);

/* Per section: base blocks, controls that apply at one width only, prerequisites, controls that wait
   for the builder's redraw (no live check), selectors for the theme checks. */
const CFG = {
  'category-banners-2': {
    blocks: () => presetBlocks('category-banners-2').map(b => b.type === 'banner' ? {...b, settings: {...b.settings, link: '/collections/all'}} : b),
    desk: ['layout', 'aspect_ratio_desktop', 'side_padding_desktop', 'heading_size_desktop', 'heading_font_size_desktop', 'subheading_font_size_desktop', 'space_below_desktop'],
    mob: ['mobile_layout', 'aspect_ratio_mobile', 'side_padding_mobile', 'heading_size_mobile', 'image_mobile', 'heading_font_size_mobile', 'subheading_font_size_mobile', 'space_below_mobile'],
    pre: {placeholder_url: {}, border_radius: {corner_style: 'custom'}},
    preBlock: {image_mobile: {image: IMG}}, anyWidth: ['banner.image_mobile'],
    redraw: ['collection'], hoverSel: '[data-cl-block] a', hover: ['overlay_opacity_hover', 'image_hover_scale', 'hover_duration', 'underline_duration', 'underline_origin', 'underline_thickness', 'underline_offset', 'underline_color', 'sub_visibility'],
    theme: {heading: '.cb2__head-title', text: '.cb2__head-sub', title: '.cb2__heading'},
    life: {section: {padding_top: 12, enable_custom_styling: true, section_bg: '#abcdef'}, block: {type: 'banner', settings: {heading: 'Only in A'}}, check: (page, u) => page.evaluate(u => document.querySelector('#shopify-section-' + u + ' .cb2__heading').textContent === 'Only in A', u),
      unrelated: {gap: 30, padding_bottom: 10, overlay_opacity: 40}, added: [{type: 'banner', settings: {heading: 'Added'}}],
      addedEdit: {settings: {heading: 'Edited added', link: '/pages/x'}, check: (page, id) => page.evaluate(id => { const b = document.querySelector('[data-cl-block="' + id + '"]'); return b.querySelector('.cb2__heading').textContent === 'Edited added' && b.querySelector('a.cb2__item').getAttribute('href') === '/pages/x'; }, id)}},
    imgBlock: 'banner', imgSel: '.cb2__img',
    data: {picked: () => ({blocks: [{type: 'banner', settings: {collection: COLL}}]}), empty: () => ({blocks: [{type: 'banner'}, {type: 'banner', settings: {heading: 'Only a title'}}]})},
  },
  'category-banners': {
    blocks: () => presetBlocks('category-banners').map(b => ({...b, settings: {...b.settings, link: '/collections/all'}})),
    desk: ['layout', 'aspect_ratio_desktop', 'side_padding_desktop', 'heading_size_desktop'],
    mob: ['aspect_ratio_mobile', 'side_padding_mobile', 'heading_size_mobile'],
    pre: {},
    redraw: ['collection'], hoverSel: '[data-cl-block] a', hover: ['overlay_opacity_hover', 'image_hover_scale', 'hover_duration', 'underline_duration', 'underline_origin', 'underline_thickness', 'underline_offset', 'underline_color', 'sub_visibility'],
    theme: {title: '.cb1__heading'},
    life: {section: {padding_top: 12, enable_custom_style: true, section_bg: '#abcdef'}, block: {type: 'banner', settings: {heading: 'Only in A'}}, check: (page, u) => page.evaluate(u => document.querySelector('#shopify-section-' + u + ' .cb1__heading').textContent === 'Only in A', u),
      unrelated: {gap: 30, padding_bottom: 10, overlay_opacity: 40}, added: [{type: 'banner', settings: {heading: 'Added'}}],
      addedEdit: {settings: {heading: 'Edited added', link: '/pages/x'}, check: (page, id) => page.evaluate(id => { const b = document.querySelector('[data-cl-block="' + id + '"]'); return b.querySelector('.cb1__heading').textContent === 'Edited added' && b.querySelector('a.cb1__item').getAttribute('href') === '/pages/x'; }, id)}},
    imgBlock: 'banner', imgSel: '.cb1__img',
    data: {picked: () => ({blocks: [{type: 'banner', settings: {collection: COLL}}]}), empty: () => ({blocks: [{type: 'banner'}, {type: 'banner', settings: {heading: 'Only a title'}}]})},
  },
  'scrolling-collection': {
    blocks: () => [...presetBlocks('scrolling-collection').map(b => b.type === 'collection' ? {...b, settings: {...b.settings, link: '/collections/all'}} : b), {type: 'subheading'}],
    desk: ['chip_width'], mob: [],
    pre: {}, preBlock: {'heading.weight_enable': {weight: '500'}, 'heading.size_enable': {size_desktop: 50, size_mobile: 20}, 'subheading.size_enable': {size: 20}}, preBlocks: {show_product_count: b => b.map(x => x.type === 'collection' ? {...x, settings: {...x.settings, collection: COLL}} : x)},
    redraw: ['rows', 'collection'], hoverSel: '.scol__chip', hover: ['chip_bg_hover', 'pause_on_hover'],
    act: {toggle_active_bg: t => t.root('[data-scol-toggle]').click(), toggle_active_color: t => t.root('[data-scol-toggle]').click()},
    theme: {heading: '.scol__heading', text: '.scol__sub', body: '.scol__chip-label'},
    life: {section: {padding_top_mobile: 12, padding_top_desktop: 12, enable_custom_style: true, section_bg: '#abcdef'}, block: {type: 'collection', settings: {label_first: 'Only in A'}},
      check: (page, u) => page.evaluate(u => document.querySelector('#shopify-section-' + u + ' .scol__chip-label').textContent === 'Only in A', u),
      unrelated: {row_gap: 30, chip_radius: 4, chip_gap: 20}, added: [{type: 'collection', settings: {label_first: 'Added', link: '/collections/all'}}],
      addedEdit: {settings: {label_first: 'Edited added', link: '/pages/x'}, check: (page, id) => page.evaluate(id => { const b = document.querySelector('[data-cl-block="' + id + '"]'); return b.querySelector('.scol__chip-label').textContent === 'Edited added' && b.getAttribute('href') === '/pages/x'; }, id)}},
    imgBlock: 'collection', imgSel: '.scol__chip-img',
    data: {picked: () => ({blocks: [{type: 'collection', settings: {collection: COLL}}]}), empty: () => ({blocks: [{type: 'collection'}, {type: 'collection', settings: {label_first: 'Only a label'}}]}), count: true},
  },
  'collection-lookbook': {
    blocks: () => [...presetBlocks('collection-lookbook').map(b => b.type === 'card' ? {...b, settings: {...b.settings, link: '/collections/all'}} : b), {type: 'card', settings: {title: 'Sixth'}}],
    desk: ['per_view_desktop', 'title_size_desktop'], mob: ['per_view_mobile', 'title_size_mobile'], bp: 768,
    never: ['per_view_tablet'], anyWidth: [], behaviour: ['autoplay', 'autoplay_speed', 'pause_on_hover'], same: [['show_section_on', 'all', 'mobile', 375], ['show_section_on', 'all', 'desktop', 1366], ['title_weight', 'theme', '700'], ['heading.weight', 'theme', '700']],
    pre: {}, preBlock: {'heading.size_enable': {size_desktop: 50, size_mobile: 20, line_height: 1.6, tracking: 2}, 'subheading.size_enable': {size: 20, line_height: 1.9}},
    redraw: ['collection'], hoverSel: '.lcb__card', hover: ['hover_zoom', 'btn_bg_hover', 'btn_color_hover', 'hover_breath'],
    theme: {heading: '.lcb__heading', text: '.lcb__sub', title: '.lcb__title'},
    life: {section: {padding_top_mobile: 12, padding_top_desktop: 12, enable_custom_style: true, section_bg: '#abcdef'}, block: {type: 'card', settings: {title: 'Only in A'}},
      check: (page, u) => page.evaluate(u => document.querySelector('#shopify-section-' + u + ' .lcb__title').textContent === 'Only in A', u),
      unrelated: {card_gap: 30, card_radius: 4, kicker_size: 14}, added: [{type: 'card', settings: {title: 'Added', link: '/collections/all'}}],
      addedEdit: {settings: {title: 'Edited added', link: '/pages/x'}, check: (page, id) => page.evaluate(id => { const b = document.querySelector('[data-cl-block="' + id + '"]'); return b.querySelector('.lcb__title').textContent === 'Edited added' && b.querySelector('a.lcb__card').getAttribute('href') === '/pages/x'; }, id)}},
    imgBlock: 'card', imgSel: '.lcb__bg',
    data: {picked: () => ({blocks: [{type: 'card', settings: {collection: COLL, kicker: ''}}]}), empty: () => ({blocks: [{type: 'card', settings: {kicker: '', button_text: ''}}, {type: 'card', settings: {title: 'Only a title'}}]})},
  },
  'collectionnlist': {
    blocks: () => presetBlocks('collectionnlist'),
    desk: ['desktop_ratio', 'desktop_text_size', 'desktop_image_position', 'desktop_container_gap', 'desktop_menu_offset', 'desktop_top_padding', 'desktop_bottom_padding'],
    mob: ['mobile_ratio', 'mobile_text_size', 'mobile_image_position', 'mobile_container_gap', 'mobile_top_padding', 'mobile_bottom_padding'],
    pre: {}, preBlocks: {show_product_count: b => b.map((x, i) => i === 1 ? {...x, settings: {...x.settings, collection: COLL, title: ''}} : x)},
    redraw: ['collection'], hoverSel: '.cnl__link', hover: ['enable_underline', 'underline_thickness', 'underline_color'],
    behaviour: ['reveal'], same: [['desktop_ratio', 'coverfit', 'auto'], ['mobile_ratio', 'coverfit', 'square'], ['font_weight', 'theme', '700']],
    theme: {title: '.cnl__link', bg: 'background_color'},
    life: {section: {mobile_top_padding: 12, desktop_top_padding: 12, enable_custom_style: true, background_color: '#abcdef'}, block: {type: 'item', settings: {title: 'Only in A'}},
      check: (page, u) => page.evaluate(u => document.querySelector('#shopify-section-' + u + ' .cnl__label').textContent === 'Only in A', u),
      unrelated: {desktop_container_gap: 30, mobile_container_gap: 30, image_border_radius: 4}, added: [{type: 'item', settings: {title: 'Added'}}],
      addedEdit: {settings: {title: 'Edited added', image: IMG2}, check: (page, id) => page.evaluate(id => document.querySelector('[data-cl-block="' + id + '"] .cnl__label').textContent === 'Edited added' && !!document.querySelector('img[data-cnl-img="' + id + '"][src*="other.png"]'), id)}},
    imgBlock: 'item', imgSel: '.cnl__img.is-active',
    data: {picked: () => ({settings: {show_product_count: true}, blocks: [{type: 'item', settings: {collection: COLL, title: ''}}]}), empty: () => ({blocks: [{type: 'item', settings: {title: ''}}, {type: 'item', settings: {title: 'Only a title'}}]}), count: true},
  },
  'collection-list2': {
    blocks: () => [...presetBlocks('collection-list2').slice(0, 1), {type: 'badge'}, ...presetBlocks('collection-list2').slice(1)],
    desk: ['align_columns', 'left_col_fr', 'center_col_fr', 'right_col_fr'], mob: ['media_max_mobile', 'button.gap_top'], bp: 768,
    pre: {}, preBlock: {'heading.size_enable': {size_desktop: 50, size_mobile: 20, line_height: 1.6, tracking: 2}, 'description.size_enable': {size_desktop: 20, size_mobile: 18, line_height: 1.9},
      alt_text: {image: IMG}, poster: {video_url: 'https://theme.test/clip.mp4'}, 'button.use_theme_button': {radius: 2, pad_x: 40, size: 20}},
    redraw: ['video', 'video_url', 'poster'], hoverSel: '.chp__btn', hover: ['hover_anim', 'bg_hover', 'color_hover'],
    same: [['heading.weight', 'theme', '700'], ['show_section_on', 'all', 'mobile', 375], ['show_section_on', 'all', 'desktop', 1366]],
    theme: {heading: '.chp__heading', text: '.chp__desc', button: '.chp__btn'},
    life: {section: {padding_top_mobile: 12, padding_top_desktop: 12, enable_custom_style: true, section_bg: '#abcdef'}, block: {type: 'heading', settings: {text: 'Only in A'}},
      check: (page, u) => page.evaluate(u => document.querySelector('#shopify-section-' + u + ' .chp__heading').textContent === 'Only in A', u),
      unrelated: {col_gap_desktop: 20, col_gap_mobile: 30, content_radius: 2}, added: [{type: 'button', settings: {text: 'Added', link: '/collections/all'}}],
      addedEdit: {settings: {text: 'Edited added', link: '/pages/x'}, check: (page, id) => page.evaluate(id => { const b = document.querySelector('[data-cl-block="' + id + '"] .chp__btn'); return b.textContent === 'Edited added' && b.getAttribute('href') === '/pages/x'; }, id)}},
    imgBlock: 'media_left', imgSel: '.chp__img',
  },
};
const COMMON_PRE = {section_margin_top_mobile: {reset_spacing: false}, section_margin_bottom_mobile: {reset_spacing: false}, section_margin_top_desktop: {reset_spacing: false}, section_margin_bottom_desktop: {reset_spacing: false}, reset_spacing: {section_margin_top_mobile: 20, section_margin_top_desktop: 20}, enable_custom_fonts: {heading_font: FONT, body_font: FONT}, heading_font: {enable_custom_fonts: true, body_font: {family: 'Courier New'}}, body_font: {enable_custom_fonts: true, heading_font: {family: 'Courier New'}}};
const STRUCTURAL = ['reset_spacing'];
const WIDE = ['section_width'];

/* Two values of a select that are meant to look alike (at one width, or always). */
const sameAs = (cfg, key, a, b, width) => (cfg.same || []).some(([id, x, y, w]) => id === key && (!w || w === width) && [x, y].includes(a) && [x, y].includes(b) && a !== b);
function valuesFor(x, cur = x.default) {
  switch (x.type) {
    case 'range': return [cur === x.max ? x.min : x.max];
    case 'number': return [(+cur || 0) + 37];
    case 'select': case 'radio': return x.options.map(o => o.value).filter(v => v !== cur);
    case 'checkbox': return [!cur];
    case 'color': return ['#ab12cd'];
    case 'color_background': return ['linear-gradient(90deg, #ab12cd, #12abcd)'];
    case 'color_scheme': return ['alt-scheme'];
    case 'text': return [/alt/.test(x.id) ? 'Described image' : /aspect/.test(x.id) ? '1 / 1' : /width/.test(x.id) ? '900' : 'Edited text'];
    case 'textarea': return [/url/.test(x.id) ? 'https://theme.test/clip.mp4' : 'Edited longer text'];
    case 'inline_richtext': return ['Edited <em>words</em>'];
    case 'richtext': return ['<p>Edited <strong>copy</strong></p>'];
    case 'url': return [/placeholder/.test(x.id) ? 'https://theme.test/ph.png' : '/pages/test'];
    case 'image_picker': return [IMG];
    case 'font_picker': return [FONT];
    case 'collection': return [COLL];
    case 'video': return [{sources: [{url: 'https://theme.test/up.mp4', mime_type: 'video/mp4'}]}];
  }
  throw new Error('no test value for ' + x.type + ' ' + x.id);
}
/* Settings a control's visible_if asks for, plus all colours when it is a custom styling toggle. */
function prereq(x, list, base) {
  const out = {};
  for (const m of (x.visible_if || '').matchAll(/(?:section|block)\.settings\.(\w+)(?:\s*(==|!=)\s*(?:'([^']*)'|(false|true)))?/g)) {
    const [, id, op, str, lit] = m, want = str ?? (lit === undefined ? true : lit === 'true');
    if (!op) out[id] = true;
    else if (op === '==') out[id] = want;
    else if (base[id] === want) { const s = list.find(y => y.id === id); out[id] = s.type === 'checkbox' ? !want : s.options.map(o => o.value).filter(v => v !== want).pop(); }
  }
  if (/^(enable_custom_style|enable_custom_styling|custom_style)$/.test(x.id)) for (const y of list) if (y.type === 'color') out[y.id] = '#13579b';
  return out;
}

async function addFp(page) {
  await page.evaluate(() => {
    const P = ['color', 'backgroundColor', 'backgroundImage', 'fontSize', 'fontFamily', 'fontWeight', 'textTransform', 'textAlign', 'letterSpacing', 'lineHeight', 'textShadow', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap', 'flexDirection', 'flexBasis', 'alignItems', 'justifyContent', 'borderTopLeftRadius', 'aspectRatio', 'objectFit', 'objectPosition', 'opacity', 'display', 'gridTemplateColumns', 'transform', 'transformOrigin', 'transition', 'animationDuration', 'animationName', 'animationPlayState', 'overflowX', 'borderTopWidth', 'borderTopColor', 'top', 'left', 'width', 'height', 'maxWidth', 'minWidth', 'filter', 'maskImage', 'outlineColor'];
    window.__fp = uid => {
      const wrap = document.getElementById('shopify-section-' + uid), root = wrap.querySelector('[data-cl-root]'), out = {}, seen = {};
      const r0 = root.getBoundingClientRect();
      for (const e of [root, ...root.querySelectorAll('*')]) {
        if (e.closest('template') || e.ownerSVGElement || e.closest('[data-cl-copy]')) continue;
        const cls = typeof e.className === 'string' ? e.className : e.className.baseVal;
        let k = (e.dataset && e.dataset.clBlock) || e.tagName + '.' + (cls.split(' ')[0] || '');
        seen[k] = (seen[k] || 0) + 1; k += '#' + seen[k];
        const cs = getComputedStyle(e), r = e.getBoundingClientRect(), o = {};
        for (const p of P) o[p] = cs[p];
        o.rect = r.width || r.height ? [r.x - r0.x, r.y - r0.y, r.width, r.height].map(Math.round).join(',') : 'none';
        for (const v of ['--mb-bg', '--mb-text', '--mb-border', '--mb-radius', '--mb-padding-x', '--mb-font-size', '--mb-weight', '--mb-hover-bg', '--mb-hover-text', '--mb-hover-border', '--ov-o', '--heading-text-transform']) o[v] = cs.getPropertyValue(v).trim();
        for (const v of [...e.style]) if (v.startsWith('--cl')) o[v] = e.style.getPropertyValue(v).trim();
        for (const a of e.attributes) if (/^data-(?!cl-)/.test(a.name) || /^(href|alt|type|target|aria-label|hidden|srcset|tabindex|poster|rel)$/.test(a.name)) o['@' + a.name] = /^(srcset|poster)$/.test(a.name) ? a.value.split(/[ ,?]/)[0] : a.value;
        if (!e.children.length || /^(H\d|P|A|BUTTON|SPAN)$/.test(e.tagName)) o.text = e.textContent.trim().slice(0, 80);
        o.tag = e.tagName;
        if (e.tagName === 'IMG' || e.tagName === 'VIDEO') o.src = (e.getAttribute('src') || '').split('?')[0];
        for (const pe of ['::after', '::before']) { const a = getComputedStyle(e, pe); if (a.content !== 'none') o[pe] = [a.content, a.opacity, a.backgroundColor, a.backgroundImage, a.height, a.bottom, a.width, a.transformOrigin, a.transition, a.transform].join(); }
        o.blk = e.closest('[data-cl-block]')?.dataset.clBlock || e.closest('[data-cl-of]')?.dataset.clOf || '';
        out[k] = o;
      }
      const w = getComputedStyle(wrap); out.wrap = {marginTop: w.marginTop, marginBottom: w.marginBottom, paddingLeft: w.paddingLeft, maxWidth: w.maxWidth, display: w.display, blk: ''};
      return out;
    };
  });
}
const fp = (t, uid = 'test') => t.page.evaluate(u => window.__fp(u), uid);
const audit = (t, uid = 'test') => t.page.evaluate(u => window.MateriaCollections.audit(document.querySelector('#shopify-section-' + u + ' [data-cl-root]')), uid);
const J = o => JSON.stringify(o && typeof o === 'object' ? Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]])) : o);
const diff = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => J(a[k]) !== J(b[k]));
/* What a visitor sees: the same fingerprint without data attributes and the section's own variables. */
const visual = f => Object.fromEntries(Object.entries(f).map(([k, o]) => [k, Object.fromEntries(Object.entries(o).filter(([p]) => !/^(@data-|--cl)/.test(p)))]));
const diffVis = (a, b) => diff(visual(a), visual(b));
/* Finish CSS transitions started by a live change (a value eased in), so the end states are compared. Running marquees and carousels are infinite and left alone. */
const settle = page => page.evaluate(() => { for (const a of document.getAnimations()) { if (a instanceof CSSTransition) a.finish(); else if (a instanceof CSSAnimation && a.effect?.getComputedTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; } } });
const SPACING = '.shopify-section{padding-top:7px;padding-bottom:7px;margin-top:9px;margin-bottom:9px}';

async function everyControl(browser, name, width) {
  const cfg = CFG[name], {schema} = schemaOf(name);
  const t = await mount(browser, name, {width, editing: true, blocks: cfg.blocks(), assets: [ASSET], globals: cfg.globals || {}});
  await t.page.addStyleTag({content: SPACING}); await addFp(t.page);
  const base = clone(t.section.settings);
  for (const x of schema.settings) if (x.id && !(x.id in base)) base[x.id] = '';
  const baseBlocks = t.section.blocks.map(b => ({type: b.type, settings: clone(b.settings)}));
  const cases = [];
  for (const x of schema.settings) if (x.id && !x.hidden && x.type !== 'header') cases.push({scope: -1, x, list: schema.settings});
  for (const bt of schema.blocks || []) {
    const i = baseBlocks.findIndex(b => b.type === bt.type);
    for (const x of bt.settings || []) if (x.id && !x.hidden && x.type !== 'header') { assert.ok(i >= 0, name + ': no base block ' + bt.type); cases.push({scope: i, x, list: bt.settings, btype: bt.type}); }
  }
  const covered = new Set();
  for (const c of cases) {
    const {x} = c, wide = WIDE.includes(x.id);
    if (wide && width !== 1366) continue;
    if (wide) await t.page.setViewportSize({width: 1900, height: 900});
    const key = (c.btype ? c.btype + '.' : '') + x.id;
    let blocks0 = clone(baseBlocks), S = {...clone(base), ...(c.scope < 0 ? COMMON_PRE[x.id] || {} : {})};
    const bi = c.scope;
    const bBase = bi >= 0 ? blocks0[bi].settings : S;
    const pre = {...prereq(x, c.list, bBase), ...(c.scope < 0 ? cfg.pre?.[x.id] || {} : cfg.preBlock?.[key] || cfg.preBlock?.[x.id] || {})};
    if (bi >= 0) Object.assign(blocks0[bi].settings, pre); else Object.assign(S, pre);
    if (cfg.preBlocks?.[key]) blocks0 = cfg.preBlocks[key](blocks0);
    const blockId = bi >= 0 ? 'test-b' + bi : undefined;
    const isDesk = cfg.desk.includes(x.id) || cfg.desk.includes(key) || /_desktop$/.test(x.id), isMob = cfg.mob.includes(x.id) || cfg.mob.includes(key) || /_mobile$/.test(x.id);
    const bp = cfg.bp || 768;
    const shows = !(isDesk && width < bp) && !(isMob && width >= bp) && !(cfg.never || []).includes(key);
    const structural = STRUCTURAL.includes(x.id) || (cfg.redraw || []).includes(x.id) || (cfg.redraw || []).includes(key);
    const hov = (cfg.hover || []).includes(key) || (cfg.hover || []).includes(x.id);
    const look = async () => { if (cfg.act?.[key]) await cfg.act[key](t); if (hov) { await t.page.mouse.move(0, 0); await t.root(cfg.hoverSel).first().hover({force: true}); await t.page.waitForTimeout(20); } await settle(t.page); return fp(t); };
    await t.redraw({settings: S, blocks: blocks0});
    const fp0 = await look();
    eq(await audit(t), [], name + ' ' + key + ' base markup matches controller');
    const cur = bi >= 0 ? blocks0[bi].settings[x.id] : S[x.id];
    const seen = [[JSON.stringify(cur ?? null), fp0]];
    for (const v of valuesFor(x, cur)) {
      const tag = name + ' @' + width + ' ' + key + '=' + JSON.stringify(v).slice(0, 40);
      await t.redraw({settings: S, blocks: blocks0});
      if (!structural) await t.emit({[x.id]: v}, blockId);
      await t.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const fpL = await look();
      const blocks1 = clone(blocks0); if (bi >= 0) blocks1[bi].settings[x.id] = v;
      await t.redraw({settings: bi >= 0 ? S : {...S, [x.id]: v}, blocks: blocks1});
      const fpR = await look();
      eq(await audit(t), [], tag + ': markup matches controller');
      const dR = diff(fp0, fpR), dL = diff(fp0, fpL);
      if (shows) {
        if (!sameAs(cfg, key, cur, v, width) && !(cfg.behaviour || []).includes(key)) ok(diffVis(fp0, fpR).length > 0, tag + ': redraw changes nothing visible');
        if (bi >= 0) ok(dR.some(k => fpR[k]?.blk === blockId || fp0[k]?.blk === blockId), tag + ': does not change its own block (' + dR.slice(0, 4) + ')');
        if (bi < 0 && /^section_margin/.test(x.id)) ok(dR.includes('wrap'), tag + ': margin not on the section');
        if (!structural) {
          const d = diff(fpL, fpR).filter(k => !(cfg.liveIgnore || []).some(re => re.test(k)));
          eq(d.map(k => k + ' ' + JSON.stringify([...new Set([...Object.keys(fpL[k] || {}), ...Object.keys(fpR[k] || {})])].filter(p => JSON.stringify((fpL[k] || {})[p]) !== JSON.stringify((fpR[k] || {})[p])).map(p => p + ': ' + JSON.stringify((fpL[k] || {})[p]) + ' / ' + JSON.stringify((fpR[k] || {})[p])))), [], tag + ': live differs from redraw (live / redraw)');
        }
        seen.push([JSON.stringify(v), fpR]);
      } else if (!(cfg.anyWidth || []).includes(key)) {
        const vR = diffVis(fp0, fpR), vL = diffVis(fp0, fpL);
        eq(vR, [], tag + ': changes at the wrong width (redraw) ' + vR.slice(0, 3));
        eq(vL, [], tag + ': changes at the wrong width (live)');
      }
      covered.add(key);
    }
    if ((x.type === 'select' || x.type === 'radio') && shows) {
      for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
        if (sameAs(cfg, key, JSON.parse(seen[i][0]), JSON.parse(seen[j][0]), width)) continue;
        ok(diffVis(seen[i][1], seen[j][1]).length > 0, name + ' @' + width + ' ' + key + ': ' + seen[i][0] + ' and ' + seen[j][0] + ' look the same');
      }
    }
    if (wide) await t.page.setViewportSize({width, height: 900});
  }
  eq(t.errors, [], name + ' @' + width + ' errors');
  await t.page.close();
  return covered.size;
}

/* Theme inheritance, schemes, custom styling, fonts, first paint, overflow. */
async function theme(browser, name, width, editing, priority = true) {
  const cfg = CFG[name], th = cfg.theme, tag = name + ' @' + width + (editing ? ' editor' : ' storefront') + (priority === 'off' ? ' priority off' : '');
  const t = await mount(browser, name, {width, editing, blocks: cfg.blocks(), assets: [], globals: cfg.globals || {}, priority});
  await addFp(t.page);
  await settle(t.page);
  const before = await t.page.evaluate(() => { const r = document.querySelector('[data-cl-root]'); return [r, ...r.querySelectorAll('*')].map(e => { const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height), cs.color, cs.backgroundColor, cs.fontFamily, cs.fontSize, cs.fontWeight, cs.opacity].join(); }); });
  await t.page.addScriptTag({content: fs.readFileSync(path.join(__dirname, '../shopify/assets', ASSET), 'utf8')});
  await t.page.waitForTimeout(150);
  await settle(t.page);
  const after = await t.page.evaluate(() => { const r = document.querySelector('[data-cl-root]'); return [r, ...r.querySelectorAll('*')].map(e => { const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height), cs.color, cs.backgroundColor, cs.fontFamily, cs.fontSize, cs.fontWeight, cs.opacity].join(); }); });
  eq(after.filter((v, i) => v !== before[i]).length, 0, tag + ': first paint equals hydrated paint');
  eq(await audit(t), [], tag + ': markup matches controller');
  const root = '[data-cl-root]';
  await settle(t.page);
  const fp0 = await fp(t);
  eq(await t.css(root, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' scheme background');
  if (th.heading) { eq(await t.css(th.heading, 'color'), 'rgb(255, 255, 255)', tag + ' heading colour'); ok(/^Georgia/.test(await t.css(th.heading, 'fontFamily')), tag + ' heading font'); }
  if (th.text) { eq(await t.css(th.text, 'color'), 'rgb(204, 204, 204)', tag + ' text colour'); ok(/^Arial/.test(await t.css(th.text, 'fontFamily')), tag + ' body font'); }
  if (th.title) ok(/^Georgia/.test(await t.css(th.title, 'fontFamily')), tag + ' title font');
  if (th.body) ok(/^Arial/.test(await t.css(th.body, 'fontFamily')), tag + ' body text font');
  if (th.button) {
    eq(await t.css(th.button, 'backgroundColor'), 'rgb(18, 52, 86)', tag + ' button colour');
    eq(await t.css(th.button, 'borderTopLeftRadius'), priority === 'off' ? (th.buttonRadiusOff || '12px') : '12px', tag + ' button radius');
    if (!th.buttonNoHover) { await t.root(th.button).first().hover(); await t.page.waitForTimeout(30); eq(await t.css(th.button, 'backgroundColor'), 'rgb(255, 0, 0)', tag + ' button hover'); await t.page.mouse.move(0, 0); }
    ok((await t.root(th.button).first().boundingBox()).height >= (th.buttonMin ?? 44), tag + ' button target');
  }
  ok(await t.noOverflow(), tag + ' no sideways scroll');
  if (editing) {
    await t.emit({color_scheme: 'alt-scheme'});
    eq(await t.css(root, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme live');
    if (th.heading) eq(await t.css(th.heading, 'color'), 'rgb(16, 16, 16)', tag + ' alt scheme heading live');
    await t.redraw({settings: {color_scheme: 'alt-scheme'}});
    eq(await t.css(root, 'backgroundColor'), 'rgb(250, 250, 250)', tag + ' alt scheme redraw');
    await t.redraw({settings: {color_scheme: 'default-color-scheme'}});
    const toggle = 'enable_custom_styling' in t.section.settings ? 'enable_custom_styling' : 'enable_custom_style' in t.section.settings ? 'enable_custom_style' : th.toggle;
    const bg = th.bg || 'section_bg';
    await t.emit({[toggle]: true, [bg]: '#abcdef'});
    eq(await t.css(th.bgSel || root, 'backgroundColor'), 'rgb(171, 205, 239)', tag + ' custom background live');
    await t.emit({[toggle]: false});
    eq(await t.css(th.bgSel || root, 'backgroundColor'), 'rgb(24, 32, 40)', tag + ' custom background off');
    if ('enable_custom_fonts' in t.section.settings) {
      await t.emit({enable_custom_fonts: true, heading_font: {family: 'Courier New'}, body_font: {family: 'Verdana'}});
      for (const s of [th.heading, th.title].filter(Boolean)) ok(/^"?Courier New/.test(await t.css(s, 'fontFamily')), tag + ' custom heading font ' + s);
      for (const s of [th.text, th.body].filter(Boolean)) ok(/^Verdana/.test(await t.css(s, 'fontFamily')), tag + ' custom body font ' + s);
      await t.emit({enable_custom_fonts: false});
    }
    await settle(t.page);
    eq(diff(fp0, await fp(t)), [], tag + ': toggles off restore the theme exactly');
  }
  eq(t.errors, [], tag + ' errors');
  await t.page.close();
}

/* Two instances, unchanged pictures, redraws, added blocks. */
async function lifecycle(browser, name) {
  const cfg = CFG[name];
  for (const width of [375, 1366]) {
    const tag = name + ' @' + width;
    const withImg = cfg.blocks().map(b => cfg.imgBlock && cfg.imgBlock === b.type ? {...b, settings: {...b.settings, [cfg.imgKey || 'image']: IMG}} : b);
    const t = await mount(browser, name, {width, editing: true, instances: [{uid: 'a', blocks: withImg}, {uid: 'b', blocks: cfg.blocks()}], assets: [ASSET], globals: cfg.globals || {}});
    await addFp(t.page);
    await settle(t.page);
    const b0 = await fp(t, 'b');
    const life = cfg.life;
    await t.emit({...life.section}, undefined, 'a');
    await t.emit(life.block.settings, t.blockId(life.block.type, 0, 'a'), 'a');
    await settle(t.page);
    eq(diff(b0, await fp(t, 'b')), [], tag + ': an edit to one instance leaves the other alone');
    ok(await life.check(t.page, 'a'), tag + ' block edit landed in A');
    if (cfg.imgBlock) {
      const sel = '#shopify-section-a ' + cfg.imgSel;
      await t.page.evaluate(s => { document.querySelector(s).__mark = 1; }, sel);
      await t.emit(life.unrelated, undefined, 'a');
      ok(await t.page.evaluate(s => document.querySelector(s).__mark === 1 && !/^data:/.test(document.querySelector(s).getAttribute('src')), sel), tag + ': picture element kept');
    }
    for (let i = 0; i < 3; i++) await t.redraw({uid: 'a'});
    eq(await t.page.evaluate(() => window.MateriaCollections.roots.size), 2, tag + ': redraws leave one controller per section');
    const blocks = [...withImg, ...life.added.map(b => clone(b))];
    await t.redraw({uid: 'a', blocks});
    const last = 'a-b' + (blocks.length - 1);
    ok(await t.page.locator('[data-cl-block="' + last + '"]').count() > 0, tag + ' added block drawn');
    await t.emit(life.addedEdit.settings, last, 'a');
    ok(await life.addedEdit.check(t.page, last), tag + ' added block live');
    eq(await audit(t, 'a'), [], tag + ' audit after edits');
    ok(await t.noOverflow(), tag + ' no overflow'); eq(t.errors, [], tag + ' errors');
    await t.page.close();
  }
}

/* Collection data: a picked collection gives its title, picture and link; an empty picker draws a tidy placeholder in the editor and nothing broken on the storefront. */
async function collections(browser, name) {
  const cfg = CFG[name];
  if (!cfg.data) return;
  for (const editing of [true, false]) for (const width of [375, 1366]) {
    const tag = name + ' @' + width + (editing ? ' editor' : ' storefront');
    const t = await mount(browser, name, {width, editing, ...cfg.data.picked(), assets: [ASSET], globals: cfg.globals || {}});
    const got = await t.page.evaluate(sel => { const r = document.querySelector('[data-cl-root]'); return {text: r.textContent, hrefs: [...r.querySelectorAll('a[href]')].map(a => a.getAttribute('href')), srcs: [...r.querySelectorAll('img')].map(i => (i.getAttribute('src') || '').split('?')[0])}; });
    ok(got.text.includes(COLL.title), tag + ' collection title shown');
    ok(got.hrefs.includes(COLL.url), tag + ' collection link');
    if (cfg.data.image !== false) ok(got.srcs.includes(COLL.featured_image.src) || got.srcs.includes(PRODUCT.featured_image.src), tag + ' collection picture');
    if (cfg.data.count) ok(got.text.includes(String(COLL.products_count)), tag + ' collection count');
    await t.page.close();
    const e = await mount(browser, name, {width, editing, ...cfg.data.empty(), assets: [ASSET], globals: cfg.globals || {}});
    const st = await e.page.evaluate(() => { const r = document.querySelector('[data-cl-root]'); return {ph: r.querySelectorAll('[data-cl-ph], .placeholder-svg, svg[data-placeholder]').length, h: r.getBoundingClientRect().height, dead: [...r.querySelectorAll('a')].filter(a => !a.getAttribute('href') || a.getAttribute('href') === '#').length, broken: [...r.querySelectorAll('img')].filter(i => !i.getAttribute('src')).length}; });
    if (editing) ok(st.ph > 0, tag + ' empty picker: placeholder in the editor');
    else eq(st.ph, 0, tag + ' empty picker: no placeholder art on the storefront');
    eq(st.dead, 0, tag + ' no dead links');
    eq(st.broken, 0, tag + ' no broken images');
    ok(st.h < 2600, tag + ' empty state keeps a real height (' + Math.round(st.h) + ')');
    ok(await e.noOverflow(), tag + ' empty: no overflow');
    eq(e.errors, [], tag + ' empty errors');
    await e.page.close();
  }
}

/* Reduced motion: transitions off, content visible. */
async function motion(browser, name) {
  const cfg = CFG[name];
  const t = await mount(browser, name, {width: 375, editing: false, blocks: cfg.blocks(), assets: [ASSET], reducedMotion: 'reduce', globals: cfg.globals || {}});
  const r = await t.page.evaluate(() => { const r = document.querySelector('[data-cl-root]'); const els = [...r.querySelectorAll('*')]; return {anim: els.filter(e => e.getAnimations && e.getAnimations().some(a => a.playState === 'running')).length, hiddenText: els.filter(e => /H\d|P/.test(e.tagName) && !e.hidden && e.textContent.trim() && getComputedStyle(e).opacity === '0').length}; });
  eq(r.anim, 0, name + ' reduced motion: nothing animates');
  eq(r.hiddenText, 0, name + ' reduced motion: text visible');
  eq(t.errors, [], name + ' reduced motion errors');
  await t.page.close();
}

const EXTRA = {};
module.exports = {CFG, EXTRA, IMG, IMG2, COLL, PRODUCT, FONT, fp, addFp, audit, diff};

if (require.main === module) (async () => {
  const only = process.argv.slice(2), names = Object.keys(CFG).filter(n => !only.length || only.includes(n));
  const browser = await launch();
  try {
    const covered = {};
    for (const n of names) {
      eq(schemaProblems(n), [], n + ' schema');
      const {schema} = schemaOf(n);
      eq(schema.presets[0].category, 'Collections', n + ' in the Collections category');
      for (const w of [375, 1366]) covered[n] = await everyControl(browser, n, w);
      for (const w of [375, 1366]) for (const e of [true, false]) await theme(browser, n, w, e);
      await theme(browser, n, 1366, false, 'off');
      await lifecycle(browser, n);
      await collections(browser, n);
      await motion(browser, n);
      if (EXTRA[n]) await EXTRA[n](browser, {ok, eq});
      console.log(n + ' done, ' + checks + ' checks so far');
    }
    console.log(checks + ' collections checks passed (controls covered: ' + Object.entries(covered).map(([n, c]) => n + ' ' + c).join(', ') + ')');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
