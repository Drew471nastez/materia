/* Run: node tests/theme-featured-product-round5.cjs   (LIVE=0 skips the live site;
   the rendered part needs liquidjs: LIQUIDJS=<path to liquidjs> or installed)
   Featured product, round 5.

   Static: Featured product offers Main product's media settings (Sticky
   media on by default, Zoom on hover, thumbnails on phones, images per row,
   dots, the grid and stack layouts) in the builder's panel and in the
   theme's schema, with every setting id kept; the product spotlight has
   Sticky media too. The gallery snippet is shared and given its product
   (a featured product on a product page drew the page's product first),
   zooms in a featured product, and every gallery is checked by
   product-page-ui.js (media-gallery connectedCallback, section redraws,
   settings drawn in place). A product with no pictures keeps its column.

   Rendered with liquidjs in the real layout (header, every theme asset),
   then drawn in Chromium at 1366 and 375:
   - Sticky media: scrolling the page, the gallery stays under the header
     while the information column scrolls on; it stops at the end of the
     section. A gallery taller than the screen scrolls until its end shows,
     then stays. Off when Sticky media is off, and on a phone.
   - The gallery is never blank: first load; a builder redraw (innerHTML,
     storelib:section-load) outside design mode, with the theme's reveal
     class on the new pictures; a redraw with no event; a redraw that kept
     the slider element but drew its markup again (settings drawn in place);
     a new product picked; pictures on a slow network (a soft placeholder,
     then the picture); a picture the image service fails is asked for as
     uploaded. The current slide is inside the frame, the slider is built,
     every picture shown.
   - A product with no pictures, and no product picked: the column keeps its
     place with a placeholder, a note in the builder only.
   - Images per row and dots on a phone, hover zoom on a computer.
   Live (LIVE unset): the home page's Featured product with this
   repository's assets: pictures shown on load and after a redraw outside
   design mode, the slider built, no sideways scroll at 375. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const body = text => text.split('\n<schema>')[0].replace(/^<template compat="shopify">\n?/, '').replace(/<\/template>\s*$/, '');
const schemaOf = f => { const t = read(f); return JSON.parse(t.slice(t.indexOf('\n<schema>') + 9, t.lastIndexOf('</schema>'))); };
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

/* ---------------------------------------------------------------- static */
const FEAT = 'sections/featured-product.storelib', MAIN = 'sections/main-product.storelib', SPOT = 'sections/featured-product2.storelib';
{
  const feat = schemaOf(FEAT), main = schemaOf(MAIN), spot = schemaOf(SPOT);
  for (const [name, list] of [['panel', feat.settings], ['schema', feat.shopify.settings]]) {
    const ids = list.filter(s => s.id).map(s => s.id);
    ok(new Set(ids).size === ids.length, `${name}: every setting id once`);
    const S = id => list.find(s => s.id === id);
    ok(S('enable_sticky_content_on_desktop') && S('enable_sticky_content_on_desktop').type === 'checkbox' && S('enable_sticky_content_on_desktop').default === true && S('enable_sticky_content_on_desktop').label === 'Sticky media', `${name}: Sticky media, on by default`);
    ok(S('image_zoom') && S('image_zoom').default === 'no_zoom' && ['no_zoom', 'inner_zoom_circle', 'inner_zoom_square', 'external_zoom'].every(v => S('image_zoom').options.some(o => o.value === v)), `${name}: Zoom on hover`);
    ok(S('mobile_options') && S('mobile_options').options.length === 2 && S('mobile_options').default === 'show_thumbnails', `${name}: thumbnails on phones, two buttons`);
    ok(S('mobile_slides_per_view') && S('mobile_slides_per_view').default === '1', `${name}: images per row (mobile)`);
    ok(S('enable_nav_dots_mobile') && S('enable_nav_dots_mobile').default === false, `${name}: dots on mobile`);
    const layouts = S('desktop_layout').options.map(o => o.value);
    ok(['thumbnail_left', 'thumbnail_bottom', 'hidden_thumbnail', 'grid_1_column', 'grid_2_column', 'stack'].every(v => layouts.includes(v)), `${name}: every Main product layout`);
    // kept ids (the creator's content is stored under them)
    for (const id of ['product', 'show_thumbnails', 'enable_image_square', 'enable_lightbox', 'enable_video_autoplay', 'enable_video_looping', 'enable_video_controls', 'desktop_layout', 'desktop_media_width', 'desktop_main_image_position', 'show_view_link', 'view_link_label']) ok(ids.includes(id), `${name}: kept ${id}`);
    for (const s of list) for (const text of [s.label, s.info, ...(s.options || []).map(o => o.label)]) if (typeof text === 'string') ok(!/shopify|liquid/i.test(text), `${name}: no platform wording in "${text}"`);
  }
  // Main product's media settings, all in Featured product (or its own name for the same thing).
  const same = {media_square: 'enable_image_square'};
  const mediaIds = ['desktop_layout', 'image_zoom', 'mobile_options', 'mobile_slides_per_view', 'enable_nav_dots_mobile', 'enable_sticky_content_on_desktop', 'media_square', 'enable_video_autoplay', 'enable_video_looping', 'enable_video_controls', 'desktop_media_width'];
  const featIds = feat.shopify.settings.map(s => s.id);
  for (const id of mediaIds) ok(main.shopify.settings.some(s => s.id === id) && featIds.includes(same[id] || id), `media setting ${id} in both sections`);
  ok(JSON.stringify(main.shopify.blocks.map(b => b.type).sort()) === JSON.stringify(feat.shopify.blocks.map(b => b.type).sort()), 'the same blocks in both sections');
  for (const list of [spot.settings, spot.shopify.settings]) {
    const s = list.find(x => x.id === 'enable_sticky_content_on_desktop');
    ok(s && s.default === true, 'product spotlight: Sticky media');
  }

  const gallery = read('snippets/media-gallery.storelib');
  ok((gallery.match(/render 'product-media-layout',\s*product: product,/g) || []).length >= 4, 'the gallery gives the media layout its product');
  ok(!/zoom_type !=/.test(gallery) && !/if type == 'single' or type == 'quickview'\s*\n\s*assign image_zoom = 'no_zoom'/.test(gallery), 'a featured product zooms like Main product');
  ok(/data-mobile="\{\{ mg_per_view \}\}"/.test(gallery), 'images per row on a phone come from the section');
  ok(/section_st\.enable_sticky_content_on_desktop == false/.test(gallery), 'sticky unless the section turns it off');
  const single = read('snippets/product-single-layout.storelib');
  ok(/enable_sticky_content_on_desktop != false %\}\s*class="sticky top-30"/.test(single), 'the information column is sticky too');
  ok(single.includes("render 'product-media-placeholder'") && read('snippets/main-product-body.storelib').includes("render 'product-media-placeholder'"), 'no pictures: both sections keep the column');
  ok(single.includes('zoom-external-area'), 'external zoom has its pane');
  ok(read(FEAT).includes("render 'product-variant-media-json'") && read('snippets/main-product-body.storelib').includes("render 'product-variant-media-json'"), 'each variant\'s picture listed in both sections');
  const theme = read('shopify/assets/theme.js');
  const mg = theme.slice(theme.indexOf('class MediaGallery'), theme.indexOf('customElements.define("media-gallery"'));
  ok(/connectedCallback\(\)\s*\{\s*if \(typeof window\.MateriaGalleryHeal === "function"\) window\.MateriaGalleryHeal\(this\);/.test(mg), 'every gallery that joins the page is checked');
  const ui = read('shopify/assets/product-page-ui.js');
  ok(/window\.MateriaGalleryHeal = watchGallery/.test(ui) && /"storelib:section-load", onRedraw/.test(ui) && /"storelib:settings-change"/.test(ui), 'product-page-ui checks galleries after a redraw');
  const ps = read('shopify/assets/photoswipe-init.js');
  ok(/document\.readyState === 'complete'/.test(ps) && !/this\.drift == null/.test(ps), 'zoom set up when the gallery arrives after load');
}

/* -------------------------------------------------------------- rendered */
let Liquid = null;
for (const p of [process.env.LIQUIDJS, 'liquidjs'].filter(Boolean)) {
  try { ({ Liquid } = require(p)); break; } catch { /* next */ }
}

const clean = s => s.replace(/\{\{-\s*-\}\}/g, "{{- '' -}}").replace(/^[ \t]*comment[ \t]*\n[\s\S]*?^[ \t]*endcomment[ \t]*$/gm, '').replace(/^[ \t]*# .*$/gm, '');
function engine(groups = {}) {
  const e = new Liquid({
    root: [path.join(root, 'snippets')], extname: '.storelib', dynamicPartials: true, strictFilters: false, strictVariables: false, jsTruthy: false, lenientIf: true,
    fs: {
      readFileSync: f => clean(body(fs.readFileSync(f, 'utf8'))), readFile: async f => clean(body(fs.readFileSync(f, 'utf8'))),
      existsSync: f => fs.existsSync(f), exists: async f => fs.existsSync(f),
      resolve: (dir, file, ext) => path.join(dir, file + ext), contains: () => true, dirname: path.dirname, sep: '/',
    },
  });
  const block = (name, write) => ({
    parse(tok, remain) { this.tpls = []; const s = this.liquid.parser.parseStream(remain); s.on('tag:end' + name, () => s.stop()).on('template', t => this.tpls.push(t)).on('end', () => { throw new Error('unclosed ' + name); }); s.start(); },
    * render(ctx, em) { if (!write) return; em.write(write[0]); yield this.liquid.renderer.renderTemplates(this.tpls, ctx, em); em.write(write[1]); },
  });
  e.registerTag('style', block('style', ['<style>', '</style>']));
  e.registerTag('stylesheet', block('stylesheet', ['<style>', '</style>']));
  e.registerTag('javascript', block('javascript', null));
  e.registerTag('form', block('form', ['<form>', '</form>']));
  e.registerTag('paginate', block('paginate', ['', '']));
  for (const tag of ['sections', 'section']) e.registerTag(tag, { parse(tok) { this.name = tok.args.replace(/['"]/g, '').trim(); }, * render(ctx, em) { em.write(groups[this.name] || ''); } });
  e.registerFilter('t', k => String(k).split('.').pop().replace(/_/g, ' '));
  e.registerFilter('asset_url', k => '/assets/' + k);
  e.registerFilter('stylesheet_tag', u => `<link rel="stylesheet" href="${u}">`);
  e.registerFilter('image_url', (v, ...a) => {
    const src = typeof v === 'string' ? v : (v && (v.src || v.url)) || '';
    const w = a.find(x => Array.isArray(x) && x[0] === 'width');
    return src + (w && w[1] ? (src.includes('?') ? '&' : '?') + 'width=' + w[1] : '');
  });
  e.registerFilter('image_tag', (u, ...a) => `<img src="${u}" ${a.filter(Array.isArray).filter(([k]) => k !== 'widths').map(([k, v]) => `${k}="${v ?? ''}"`).join(' ')}>`);
  e.registerFilter('json', v => v === undefined ? 'null' : JSON.stringify(v));
  e.registerFilter('video_tag', () => '<video></video>');
  e.registerFilter('media_tag', () => '');
  for (const f of ['font_face', 'font_url', 'payment_type_svg_tag', 'inline_asset_content', 'metafield_tag']) e.registerFilter(f, () => '');
  for (const f of ['font_modify', 'color_to_rgb', 'color_modify', 'color_mix', 'url', 'within']) e.registerFilter(f, v => v);
  e.registerFilter('placeholder_svg_tag', (name, cls) => `<svg class="${cls || ''}" viewBox="0 0 525 525" data-placeholder="${name}"><rect width="525" height="525"/></svg>`);
  e.registerFilter('color_brightness', () => 128);
  e.registerFilter('money', v => 'R$' + (Number(v || 0) / 100).toFixed(2));
  e.registerFilter('money_with_currency', v => 'R$' + (Number(v || 0) / 100).toFixed(2));
  e.registerFilter('money_without_currency', v => (Number(v || 0) / 100).toFixed(2));
  e.registerFilter('handleize', v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  e.registerFilter('date', v => String(v || ''));
  return e;
}

const pic = (name, color, w = 800, h = 1000) => ({ name, color, w, h });
const PICS = {
  black: pic('black', '#1d1d1d'), beige: pic('beige', '#d8cdb5'), poster: pic('poster', '#7a8fa6'),
  red: pic('red', '#b0302a'), blue: pic('blue', '#2a4bb0'), tall: pic('tall', '#4a7a4a', 800, 1600),
};
const media = (id, key, extra = {}) => {
  const p = PICS[key];
  const preview = { src: `/img/${key}.svg`, width: p.w, height: p.h, aspect_ratio: p.w / p.h, alt: 'Pants Down' };
  return { id, media_type: 'image', alt: 'Pants Down', position: id % 100, preview_image: preview, src: preview.src, width: p.w, height: p.h, aspect_ratio: p.w / p.h, ...extra };
};
function productOf(handle, title, items) {
  const variants = [['S', 'Black'], ['M', 'Black'], ['S', 'Beige']].map(([size, color], i) => {
    const fm = items.find(m => m.media_type === 'image' && (color === 'Beige' ? m.preview_image.src.includes('beige') : true)) || items[0] || null;
    return { id: `${handle}-v${i}`, title: `${size} / ${color}`, option1: size, option2: color, option3: null, options: [size, color], price: 13777, compare_at_price: 21193, available: true, inventory_quantity: 15, inventory_management: 'storelib', featured_media: fm, featured_image: fm && fm.preview_image, url: `/products/${handle}?variant=${handle}-v${i}`, sku: '' };
  });
  return {
    id: handle + '-id', handle, title, url: '/products/' + handle, vendor: 'Materia', type: 'Bottoms', available: true,
    price: 13777, price_min: 13777, price_max: 13777, compare_at_price: 21193, compare_at_price_max: 21193, description: '<p>Designed for everyday wear, with clean details and easy styling.</p>',
    options: ['Size', 'Color'], options_with_values: [{ name: 'Size', position: 1, values: ['S', 'M'], selected_value: 'S' }, { name: 'Color', position: 2, values: ['Black', 'Beige'], selected_value: 'Black' }],
    media: items, images: items.filter(m => m.media_type === 'image').map(m => m.preview_image), featured_media: items[0] || null, featured_image: items[0] ? items[0].preview_image : null,
    variants, selected_or_first_available_variant: variants[0], first_available_variant: variants[0], has_only_default_variant: false, metafields: {}, tags: [], collections: [],
  };
}
const VIDEO = { id: 103, media_type: 'video', alt: 'Pants Down', position: 3, sources: [{ format: 'mp4', url: '/clip.webm' }], preview_image: { src: '/img/poster.svg', width: 800, height: 1000, aspect_ratio: 0.8 }, aspect_ratio: 0.8 };
const PANTS = productOf('pants-down', 'Pants Down', [media(101, 'black'), media(102, 'beige'), VIDEO]);
const OTHER = productOf('other-tee', 'Other Tee', [media(201, 'red'), media(202, 'blue')]);
const TALL = productOf('tall-coat', 'Tall Coat', [media(301, 'tall'), media(302, 'tall')]);
const EMPTY = productOf('no-pics', 'No Pictures', []);

const home = JSON.parse(read('templates/home.json'));
const [FID, FSEC] = Object.entries(home.sections).find(([, s]) => s.type === 'featured-product');
const SSEC = Object.values(home.sections).find(s => s.type === 'featured-product2') || {settings:{},blocks:{},block_order:[]};
const featSchema = schemaOf(FEAT).shopify;
const defaults = Object.fromEntries(featSchema.settings.filter(s => s.id && 'default' in s).map(s => [s.id, s.default]));
const blockDefaults = type => { const b = featSchema.blocks.find(x => x.type === type); return b ? Object.fromEntries(b.settings.filter(s => s.id && 'default' in s).map(s => [s.id, s.default])) : {}; };

async function renderPage({ settings = {}, product = PANTS, design = false, blocks = true, spot = false } = {}) {
  const all = JSON.parse(read('config/settings.json'));
  const theme = { ...all.shopify };
  const schemes = Object.entries(theme.color_schemes).map(([id, v]) => ({ id, settings: v.settings }));
  theme.color_schemes = schemes;
  const base = {
    settings: theme, request: { host: 'x.test', locale: { iso_code: 'en' }, page_type: 'index', design_mode: design },
    routes: { account_url: '/account', account_login_url: '/account/login', root_url: '/', cart_url: '/cart', cart_add_url: '/cart/add', search_url: '/search' },
    shop: { name: 'Materia', domain: 'x.test', url: 'https://x.test', currency: 'BRL', money_format: 'R${{amount}}' }, template: { name: 'index' }, cart: { item_count: 0, items: [], currency: { iso_code: 'BRL' } }, customer: null, pages: {}, all_products: {},
  };
  const e = engine();
  let ctx, sectionHtml;
  if (spot) {
    // The product spotlight (featured-product2) as the home page has it.
    const sch = schemaOf(SPOT).shopify;
    const sset = { ...Object.fromEntries(sch.settings.filter(s => s.id && 'default' in s).map(s => [s.id, s.default])), ...SSEC.settings, ...settings, product };
    sset.color_scheme = { ...(schemes.find(s => s.id === sset.color_scheme) || schemes[0]) };
    const list = SSEC.block_order.map(k => { const b = sch.blocks.find(x => x.type === SSEC.blocks[k].type); return { id: k, type: SSEC.blocks[k].type, shopify_attributes: '', settings: { ...Object.fromEntries((b ? b.settings : []).filter(s => s.id && 'default' in s).map(s => [s.id, s.default])), ...SSEC.blocks[k].settings } }; });
    ctx = { ...base, product, section: { id: FID, settings: sset, blocks: list, index: 3 } };
    sectionHtml = await e.parseAndRender(clean(body(read(SPOT))), ctx, { globals: ctx });
  } else {
    // Gallery assertions below exercise the thumbnail layout, independently
    // of the creator's currently saved home-page layout.
    const sset = { ...defaults, ...FSEC.settings, desktop_layout:'thumbnail_bottom', ...settings, product };
    sset.color_scheme = { ...(schemes.find(s => s.id === sset.color_scheme) || schemes[0]) };
    const keep = ['title', 'price', 'variant_picker', 'variant_selector_pro', 'buy_buttons', 'short_description', 'modern_collapsible_row', 'in_stock', 'payment_badges', 'benefits_pills'];
    const list = blocks ? FSEC.block_order.map(k => ({ id: k, type: FSEC.blocks[k].type, shopify_attributes: '', settings: { ...blockDefaults(FSEC.blocks[k].type), ...FSEC.blocks[k].settings } })).filter(b => keep.includes(b.type)) : [];
    // More rows so the information column is much taller than the gallery.
    for (let i = 0; i < 6; i++) list.push({ id: 'row' + i, type: 'modern_collapsible_row', shopify_attributes: '', settings: { ...blockDefaults('modern_collapsible_row'), heading: 'Row ' + i, content: '<p>' + 'Care and fit details. '.repeat(12) + '</p>' } });
    ctx = { ...base, product, section: { id: FID, settings: sset, blocks: list, index: 3 } };
    sectionHtml = await e.parseAndRender(clean(body(read(FEAT))), ctx, { globals: ctx });
  }
  const header = JSON.parse(read('sections/header-group.json'));
  const hset = { ...header.sections.header.settings, mega_menu: { handle: 'main-menu', links: [{ title: 'Home', url: '/', links: [] }, { title: 'Shop', url: '/collections/all', links: [] }] } };
  hset.color_scheme = { ...(schemes.find(s => s.id === hset.color_scheme) || schemes[0]) };
  const hctx = { ...base, section: { id: 'header', settings: hset, blocks: [] } };
  const hdr = await e.parseAndRender(clean(body(read('sections/theme-header.storelib'))), hctx, { globals: hctx });
  const le = engine({ 'header-group': `<div id="shopify-section-header" class="shopify-section section-header">${hdr}</div>`, 'footer-group': '' });
  const content = `<div style="height:300px"></div><div id="shopify-section-${FID}" class="shopify-section">${sectionHtml}</div><div style="height:1400px"></div>`;
  const html = await le.parseAndRender(clean(body(read('layout/theme.storelib'))), { ...base, content_for_header: '', content_for_layout: content }, { globals: base });
  return { html, sectionHtml };
}

module.exports = { renderPage, PANTS, OTHER, TALL, EMPTY, FID, engine, Liquid };
if (require.main !== module) return;

(async () => {
  if (!Liquid) {
    console.log(`${checks} featured product round 5 checks passed (render skipped: liquidjs not installed; set LIQUIDJS=<path to liquidjs>)`);
    return;
  }
  /* Rendered markup */
  {
    const on = (await renderPage({ settings: { enable_image_square: true } })).sectionHtml;
    ok(/<media-gallery\s+class="block sticky top-30"/.test(on), 'Sticky media: the gallery is sticky');
    ok(/class="sticky top-30"\s*>/.test(on.slice(on.indexOf('product-detail__information'))), 'and so is the information column');
    ok(/data-variant-media/.test(on), 'each variant\'s picture is listed');
    const off = (await renderPage({ settings: { enable_sticky_content_on_desktop: false } })).sectionHtml;
    ok(!/media-gallery\s+class="block sticky/.test(off) && !/sticky top-30/.test(off), 'Sticky media off: nothing sticky');
    const legacy = { ...FSEC.settings };
    ok(!('enable_sticky_content_on_desktop' in legacy), 'the home page section was saved before the setting existed');
    const zoom = (await renderPage({ settings: { image_zoom: 'external_zoom', desktop_layout:'thumbnail_bottom', mobile_slides_per_view: '1.2' } })).sectionHtml;
    ok(/<zoom-action[^>]*data-type="external_zoom"[^>]*data-zoom-option="external"/.test(zoom.replace(/\s+/g, ' ')), 'hover zoom in a featured product');
    ok(read('layout/theme.storelib').includes('drift.js') && read('layout/theme.storelib').includes('photoswipe-init.js') && zoom.includes('zoom-external-area'), 'zoom code and its pane');
    ok(/data-mobile="1\.2"/.test(zoom) && /data-spacing="8"/.test(zoom), 'images per row on a phone');
    const none = (await renderPage({ product: EMPTY })).sectionHtml;
    ok(/data-mt-media-placeholder/.test(none) && !/<media-gallery/.test(none) && !/mt-media-placeholder__note/.test(none), 'no pictures: a placeholder, no note on the live site');
    ok(/mt-media-placeholder__note">This product has no pictures yet/.test((await renderPage({ product: EMPTY, design: true })).sectionHtml), 'a note in the builder');
    ok(/mt-media-placeholder__note">Pick a product/.test((await renderPage({ product: null, design: true })).sectionHtml), 'no product picked: a note in the builder');
    // The gallery draws the section's product, not the page's.
    const e = engine();
    const g = await e.parseAndRender(clean(body(read('snippets/media-gallery.storelib'))), { images: OTHER.media, product: OTHER, section_st: { desktop_layout: 'thumbnail_bottom' }, section: { id: 's' }, desktop_layout: 'thumbnail_bottom', type: 'single', settings: {} }, { globals: { product: PANTS, settings: {} } });
    ok(g.includes('/img/red.svg') && !g.includes('/img/black.svg'), 'a featured product on a product page shows its own pictures');
  }

  const { chromium } = require('playwright');
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const svg = (key, h = 1000) => {
    const c = { black: '#1d1d1d', beige: '#d8cdb5', poster: '#7a8fa6', red: '#b0302a', blue: '#2a4bb0', tall: '#4a7a4a', slow1: '#a07a2a', slow2: '#2aa07a' }[key] || '#888';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${h}"><rect width="800" height="${h}" fill="${c}"/></svg>`;
  };
  const FIXTURE_ERRORS = /Unexpected token|Unexpected end of input|is not valid JSON/;
  async function open(width, html, { slow = 0, reduced = false } = {}) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}), reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage();
    p.errors = [];
    p.on('pageerror', err => { if (!FIXTURE_ERRORS.test(err.message)) p.errors.push(err.message); });
    p.pages = new Map([['/', html]]);
    await p.route('**/*', async r => {
      const u = new URL(r.request().url());
      if (u.hostname !== 'fixture.test') return r.fulfill({ status: 204, body: '' });
      if (p.pages.has(u.pathname)) return r.fulfill({ contentType: 'text/html', body: p.pages.get(u.pathname) });
      if (u.pathname.startsWith('/assets/')) {
        const f = path.join(root, 'shopify/assets', u.pathname.slice(8));
        return fs.existsSync(f) ? r.fulfill({ path: f, contentType: f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : undefined }) : r.fulfill({ status: 404, body: '' });
      }
      if (u.pathname === '/_next/image') return r.fulfill({ status: 500, body: 'resize failed' });
      if (u.pathname.startsWith('/img/')) {
        const key = u.pathname.slice(5, -4);
        if (key.startsWith('slow')) await new Promise(res => setTimeout(res, slow));
        return r.fulfill({ contentType: 'image/svg+xml', body: svg(key, key === 'tall' ? 1600 : 1000) });
      }
      return r.fulfill({ status: 204, body: '' });
    });
    await p.goto('https://fixture.test/');
    await p.waitForTimeout(1200);
    return { p, ctx };
  }
  const SEL = `#shopify-section-${FID}`;
  const toSection = async (p, dy = 0) => { await p.evaluate(([s, dy]) => { const el = document.querySelector(s); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + dy); }, [SEL, dy]); await p.waitForTimeout(700); };
  // What the visitor sees of the gallery: built, every loaded picture shown, the current slide in its frame.
  const galleryState = p => p.evaluate(s => {
    const g = document.querySelector(s + ' media-gallery');
    if (!g) return null;
    const frame = g.querySelector('.swiper-wrapper-preview');
    const sw = frame && frame.swiper;
    const fr = frame.getBoundingClientRect();
    const active = sw && sw.slides[sw.activeIndex];
    const ar = active && active.getBoundingClientRect();
    const img = active && active.querySelector('img');
    const mainImgs = [...g.querySelectorAll('.media-main-swiper img')];
    return {
      built: !!(sw && !sw.destroyed && frame.classList.contains('swiper-initialized')),
      slides: frame.querySelectorAll('.swiper-slide').length,
      inFrame: !!ar && ar.width > 10 && ar.height > 10 && ar.left >= fr.left - 1 && ar.right <= fr.right + 1,
      shown: !!img && img.complete && img.naturalWidth > 0 && !img.classList.contains('bls-loading-image') && getComputedStyle(img).opacity === '1' && img.getBoundingClientRect().height > 10,
      src: img && (img.currentSrc || img.src),
      stuck: mainImgs.filter(i => i.complete && i.naturalWidth > 0 && i.classList.contains('bls-loading-image')).length,
      height: Math.round(fr.height),
    };
  }, SEL);
  const redraw = (p, html, { event = true } = {}) => p.evaluate(([s, html, event]) => {
    const sec = document.querySelector(s);
    sec.innerHTML = html;
    if (event) sec.dispatchEvent(new CustomEvent('storelib:section-load', { bubbles: true, detail: { sectionId: s.replace('#shopify-section-', '') } }));
  }, [SEL, html, event]);

  try {
    /* Sticky media at 1366: the gallery stays under the header while the information scrolls on. */
    {
      const { html } = await renderPage({ settings: { desktop_layout:'thumbnail_bottom', enable_image_square: true } });
      const { p, ctx } = await open(1366, html.replace('</head>', '<style>.sec__featured-product .product-detail__information{min-height:2600px}</style></head>'));
      await toSection(p, -100);
      const read = () => p.evaluate(s => {
        const g = document.querySelector(s + ' media-gallery'), info = document.querySelector(s + ' .product-detail__information');
        const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--product-sticky-top')) || parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sticky-top')) || 0;
        return { g: g.getBoundingClientRect().top, gb: g.getBoundingClientRect().bottom, info: info.getBoundingClientRect().top, expected: top + 20, tall: g.classList.contains('mt-sticky-tall'), pos: getComputedStyle(g).position, sec: document.querySelector(s).getBoundingClientRect().bottom };
      }, SEL);
      const a = await read();
      ok(a.pos === 'sticky' && !a.tall, '1366: the gallery is sticky and fits the screen');
      await p.mouse.wheel(0, 500); await p.waitForTimeout(700);
      const b = await read();
      await p.mouse.wheel(0, 500); await p.waitForTimeout(700);
      const c = await read();
      ok(Math.abs(b.g - b.expected) <= 2 && Math.abs(c.g - c.expected) <= 2, `1366: the gallery stays under the header (${b.g}, ${c.g}, expected ${c.expected})`);
      ok(b.info - c.info > 450, '1366: while the information column scrolls on');
      await toSection(p, 2400);
      const d = await read();
      ok(d.gb <= d.sec + 1, '1366: it stops at the end of the section');
      // No jitter: scrolling a little at a time, the gallery does not move.
      await toSection(p, 400); await p.mouse.wheel(0, 40); await p.waitForTimeout(800); // the header hides on the way down: the gallery glides up under it first
      const tops = [];
      for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 40); await p.waitForTimeout(40); tops.push(Math.round((await read()).g)); }
      ok(Math.max(...tops) - Math.min(...tops) <= 1, '1366: steady while scrolling: ' + tops.join(','));
      assert.deepEqual(p.errors, []);
      await ctx.close();
    }
    /* A gallery taller than the screen scrolls until its end shows, then stays. */
    {
      const { html } = await renderPage({ product: TALL, settings: {enable_image_square:false,media_square:false} });
      const { p, ctx } = await open(1366, html.replace('</head>', '<style>.sec__featured-product .product-detail__information{min-height:3600px}</style></head>'));
      await toSection(p, 1200);
      const s = await p.evaluate(s => { const g = document.querySelector(s + ' media-gallery'); const r = g.getBoundingClientRect(); return { tall: g.classList.contains('mt-sticky-tall'), bottom: r.bottom, h: r.height }; }, SEL);
      ok(s.tall && s.h > 900 && Math.abs(s.bottom - (900 - 20)) <= 2, `1366: a tall gallery shows its end (${Math.round(s.bottom)})`);
      await ctx.close();
    }
    /* Sticky media off, and on a phone. */
    {
      const { html } = await renderPage({ settings: { enable_sticky_content_on_desktop: false, enable_image_square: true } });
      const { p, ctx } = await open(1366, html.replace('</head>', '<style>.sec__featured-product .product-detail__information{min-height:2600px}</style></head>'));
      await toSection(p, 1100);
      ok(await p.evaluate(s => getComputedStyle(document.querySelector(s + ' media-gallery')).position !== 'sticky' && document.querySelector(s + ' media-gallery').getBoundingClientRect().bottom < 200, SEL), '1366: Sticky media off, the gallery scrolls away');
      await ctx.close();
      const m = await open(375, (await renderPage()).html);
      await toSection(m.p, 200);
      ok(await m.p.evaluate(s => getComputedStyle(document.querySelector(s + ' media-gallery')).position === 'static' && document.documentElement.scrollWidth <= innerWidth, SEL), '375: not sticky, no sideways scroll');
      await m.ctx.close();
    }

    /* The gallery is never blank. */
    for (const width of [1366, 375]) {
      const { html, sectionHtml } = await renderPage();
      const { p, ctx } = await open(width, html);
      await toSection(p, -50);
      let s = await galleryState(p);
      ok(s.built && s.inFrame && s.shown && s.stuck === 0 && s.slides === 3, `${width}: first load, the gallery shows its first picture ${JSON.stringify(s)}`);
      ok(!(await p.evaluate(() => document.documentElement.classList.contains('shopify-design-mode'))), `${width}: the live page, not the builder`);
      // A builder redraw: new markup, the theme's reveal class on every picture.
      await redraw(p, sectionHtml);
      await p.evaluate(() => document.documentElement.classList.remove('shopify-design-mode'));
      await p.waitForTimeout(900);
      s = await galleryState(p);
      ok(s.built && s.inFrame && s.shown && s.stuck === 0, `${width}: after a redraw ${JSON.stringify(s)}`);
      // A redraw with no event at all.
      await redraw(p, sectionHtml, { event: false });
      await p.waitForTimeout(900);
      s = await galleryState(p);
      ok(s.built && s.inFrame && s.shown && s.stuck === 0, `${width}: after a redraw with no event ${JSON.stringify(s)}`);
      // The slider element kept, its markup drawn again (a setting drawn in place).
      await p.evaluate(s => {
        const frame = document.querySelector(s + ' .swiper-wrapper-preview');
        frame.className = 'swiper-wrapper-preview swiper';
        frame.querySelector('.swiper-wrapper').removeAttribute('style');
        frame.querySelector('.swiper-wrapper').style.transform = 'translate3d(-4000px, 0, 0)';
        frame.querySelectorAll('.swiper-slide').forEach(x => { x.removeAttribute('style'); x.style.setProperty('--aspect-ratio', '3/4'); });
        document.dispatchEvent(new CustomEvent('storelib:settings-change', { detail: { settings: { desktop_media_width: 50 }, live: false, section: s.replace('#shopify-section-', '') } }));
      }, SEL);
      await p.waitForTimeout(900);
      s = await galleryState(p);
      ok(s.built && s.inFrame && s.shown, `${width}: the slider is built again when its markup was reset ${JSON.stringify(s)}`);
      // A new product picked in the builder.
      await redraw(p, (await renderPage({ product: OTHER })).sectionHtml);
      await p.waitForTimeout(1100);
      s = await galleryState(p);
      ok(s.built && s.inFrame && s.shown && s.slides === 2 && /red\.svg/.test(s.src), `${width}: a new product's pictures ${JSON.stringify(s)}`);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no sideways scroll`);
      assert.deepEqual(p.errors, [], `${width}: no script errors`);
      await ctx.close();
    }
    /* A slow network: a soft placeholder until the picture arrives, then the picture. */
    {
      const SLOW = productOf('slow', 'Slow', [media(401, 'black', { preview_image: { src: '/img/slow1.svg', width: 800, height: 1000, aspect_ratio: 0.8 } }), media(402, 'black', { preview_image: { src: '/img/slow2.svg', width: 800, height: 1000, aspect_ratio: 0.8 } })]);
      const { html, sectionHtml } = await renderPage();
      const { p, ctx } = await open(1366, html, { slow: 2500 });
      await toSection(p, -50);
      await redraw(p, (await renderPage({ product: SLOW })).sectionHtml);
      await p.waitForTimeout(700);
      const waiting = await p.evaluate(s => { const f = document.querySelector(s + ' .media-main-swiper .swiper-slide'); return { cls: f.classList.contains('mt-media-loading'), bg: getComputedStyle(f).backgroundColor, h: f.getBoundingClientRect().height }; }, SEL);
      ok(waiting.cls && waiting.bg !== 'rgba(0, 0, 0, 0)' && waiting.h > 300, `slow network: a placeholder while the picture loads ${JSON.stringify(waiting)}`);
      await p.waitForTimeout(2800);
      const s = await galleryState(p);
      ok(s.shown && /slow1/.test(s.src) && !(await p.evaluate(s => !!document.querySelector(s + ' .media-main-swiper .swiper-slide-active.mt-media-loading'), SEL)), `slow network: then the picture ${JSON.stringify(s)}`);
      void sectionHtml;
      await ctx.close();
    }
    /* A picture the image service cannot resize is asked for as uploaded. */
    {
      const FAIL = productOf('fail', 'Fail', [media(501, 'red', { preview_image: { src: '/_next/image?url=%2Fimg%2Fred.svg&w=1920&q=90', width: 800, height: 1000, aspect_ratio: 0.8 } }), media(502, 'blue')]);
      const { html } = await renderPage({ product: FAIL });
      const { p, ctx } = await open(1366, html);
      await toSection(p, -50);
      await p.waitForTimeout(600);
      const s = await galleryState(p);
      ok(s.shown && /\/img\/red\.svg$/.test(s.src), `a failed resize falls back to the uploaded picture ${JSON.stringify(s)}`);
      await ctx.close();
    }
    /* No pictures: the column keeps its place. */
    for (const width of [1366, 375]) {
      const { html } = await renderPage({ product: EMPTY });
      const { p, ctx } = await open(width, html);
      await toSection(p, -50);
      const r = await p.evaluate(s => { const ph = document.querySelector(s + ' [data-mt-media-placeholder]'), col = ph.closest('.product-detail__media'), info = document.querySelector(s + ' .product-detail__information'); const a = ph.getBoundingClientRect(), b = col.getBoundingClientRect(); return { w: a.width, h: a.height, colW: b.width, beside: info.getBoundingClientRect().left > b.right - 1, svg: !!ph.querySelector('svg') }; }, SEL);
      ok(r.svg && r.h > 200 && Math.abs(r.w - r.colW) < 2 && (width < 500 || r.beside), `${width}: no pictures, a placeholder in the media column ${JSON.stringify(r)}`);
      await ctx.close();
    }
    /* Images per row and dots on a phone. */
    {
      const { html } = await renderPage({ settings: { desktop_layout:'thumbnail_bottom', mobile_slides_per_view: '1.2', enable_nav_dots_mobile: true } });
      const { p, ctx } = await open(375, html);
      await toSection(p, -50);
      const r = await p.evaluate(s => { const f = document.querySelector(s + ' .swiper-wrapper-preview'); const sl = f.querySelector('.swiper-slide'); return { ratio: f.getBoundingClientRect().width / sl.getBoundingClientRect().width, dots: document.querySelectorAll(s + ' .nav-dots-row .nav-dot').length }; }, SEL);
      ok(r.ratio > 1.1 && r.ratio < 1.3, `375: 1.2 images per row (${r.ratio.toFixed(2)})`);
      ok(r.dots === 3, `375: a dot for each picture (${r.dots})`);
      const box = await p.locator(`${SEL} .nav-dots-row .nav-dot`).nth(1).boundingBox();
      await p.locator(`${SEL} .nav-dots-row .nav-dot`).nth(1).tap({ force: true });
      await p.waitForTimeout(700);
      ok(await p.evaluate(s => document.querySelector(s + ' .swiper-wrapper-preview').swiper.activeIndex === 1, SEL) && box, '375: a dot goes to its picture');
      await ctx.close();
    }
    /* Hover zoom on a computer. */
    {
      const { html } = await renderPage({ settings: { image_zoom: 'inner_zoom_square', enable_image_square: true } });
      const { p, ctx } = await open(1366, html);
      await toSection(p, -50);
      await p.waitForFunction(s => { const z = document.querySelector(s + ' zoom-action'); return z && z.drift; }, SEL, { timeout: 5000 }).catch(() => {});
      ok(await p.evaluate(s => { const z = document.querySelector(s + ' zoom-action'); return !!(z && customElements.get('zoom-action') && z.drift); }, SEL), '1366: the zoom is set up');
      const img = p.locator(`${SEL} .media-main-swiper .swiper-slide-active img`);
      const b = await img.boundingBox();
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.waitForTimeout(150);
      await p.mouse.move(b.x + b.width / 2 + 20, b.y + b.height / 2 + 20); await p.waitForTimeout(400);
      ok(await p.evaluate(() => !!document.querySelector('.drift-zoom-pane.drift-open, .drift-zoom-pane')), '1366: hovering the picture zooms it');
      await ctx.close();
    }

    /* The product spotlight: its picture stays beside the text while the text scrolls. */
    {
      const { html, sectionHtml } = await renderPage({ spot: true, settings: { column_valign: 'flex-start' } });
      ok(/class="psh__media" data-mt-sticky/.test(sectionHtml) && sectionHtml.includes('product-page-ui.js'), 'spotlight: sticky media drawn');
      ok(!/data-mt-sticky/.test((await renderPage({ spot: true, settings: { enable_sticky_content_on_desktop: false } })).sectionHtml), 'spotlight: Sticky media off');
      const { p, ctx } = await open(1366, html.replace('</head>', '<style>.psh__info{min-height:2200px}</style></head>'));
      await toSection(p, 0);
      const at = () => p.evaluate(s => document.querySelector(s + ' .psh__media').getBoundingClientRect().top, SEL);
      await p.mouse.wheel(0, 300); await p.waitForTimeout(800);
      const a = await at();
      await p.mouse.wheel(0, 500); await p.waitForTimeout(800);
      const b = await at();
      ok(Math.abs(a - b) <= 2 && a >= 0 && a < 140, `spotlight 1366: the picture stays in view (${a}, ${b})`);
      await ctx.close();
      const m = await open(375, html);
      await toSection(m.p, 0);
      ok(await m.p.evaluate(s => getComputedStyle(document.querySelector(s + ' .psh__media')).position !== 'sticky' && document.documentElement.scrollWidth <= innerWidth, SEL), 'spotlight 375: stacked, not sticky');
      await m.ctx.close();
    }

    /* Live home page with this repository's assets. */
    if (process.env.LIVE !== '0') {
      const URL = 'https://andrewrullz.storelib.com/';
      for (const width of [1366, 375]) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
        const p = await ctx.newPage();
        let raw = '';
        await p.route(URL, async r => { const res = await r.fetch(); raw = await res.text(); r.fulfill({ response: res, body: raw }); });
        await p.route(/\/api\/site-theme\/assets\/.*\/([a-z0-9._-]+\.(js|css))(\?.*)?$/, r => {
          const name = r.request().url().match(/\/([a-z0-9._-]+\.(js|css))(\?.*)?$/)[1];
          const file = path.join(root, 'shopify/assets', name);
          if (fs.existsSync(file)) return r.fulfill({ body: fs.readFileSync(file), contentType: name.endsWith('.js') ? 'application/javascript' : 'text/css' });
          return r.continue();
        });
        await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
        await p.waitForTimeout(1500);
        const id = await p.evaluate(() => { const s = document.querySelector('.sec__featured-product'); return s && s.closest('[id^="shopify-section-"]').id; });
        if (!id) { console.log('live: no Featured product on the home page now, skipped'); await ctx.close(); break; }
        const sel = '#' + id;
        const state = () => p.evaluate(s => {
          const g = document.querySelector(s + ' media-gallery');
          const frame = g.querySelector('.swiper-wrapper-preview'), sw = frame && frame.swiper;
          const active = sw && sw.slides[sw.activeIndex], img = active && active.querySelector('img');
          const fr = frame.getBoundingClientRect(), ar = active && active.getBoundingClientRect();
          return { built: !!sw, inFrame: !!ar && ar.width > 10 && ar.left >= fr.left - 1 && ar.right <= fr.right + 1, shown: !!img && img.complete && !img.classList.contains('bls-loading-image') && getComputedStyle(img).opacity === '1' };
        }, sel);
        await p.locator(sel).scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
        let s = await state();
        ok(s.built && s.inFrame && s.shown, `live ${width}: the featured gallery shows ${JSON.stringify(s)}`);
        // The section as served, drawn again outside design mode.
        const start = raw.indexOf(`id="${id}"`), open = raw.indexOf('>', start) + 1, next = raw.indexOf('id="shopify-section-', open);
        let inner = raw.slice(open, raw.lastIndexOf('</', next)); inner = inner.slice(0, inner.lastIndexOf('</div>'));
        await p.evaluate(([s, html]) => { const el = document.querySelector(s); el.innerHTML = html; el.dispatchEvent(new CustomEvent('storelib:section-load', { bubbles: true, detail: { sectionId: s.slice(17) } })); document.documentElement.classList.remove('shopify-design-mode'); }, [sel, inner]);
        await p.locator(sel).scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
        s = await state();
        ok(s.built && s.inFrame && s.shown, `live ${width}: and after a redraw ${JSON.stringify(s)}`);
        ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `live ${width}: no sideways scroll`);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`${checks} featured product round 5 checks passed (sticky media, media settings, gallery never blank, no pictures, phone rows and dots, hover zoom${process.env.LIVE !== '0' ? ', live home page' : ''})`);
})().catch(e => { console.error(e); process.exit(1); });
