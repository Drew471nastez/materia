/* Collections, round 7: Collection Circles (collection-circles) and
   Collection Mosaic (collection-mosaic).

   For both, at 375 and 1366, in the builder and on the storefront: the file
   and the schema, theme inheritance (with the theme's font priority on and
   off), every section and block control (live, back off again, and after a
   server redraw, with the live result equal to the redrawn one), controls
   that belong to one width, every select option looking different, custom
   colours and fonts winning under the real theme rules and restoring the
   theme when off, two instances staying apart, an added block, redraws that
   set the section up once, pictures and the scroll position kept on
   unrelated edits, first paint equal to the hydrated paint, reduced motion,
   collection data (name, link, picture, product count; an empty picker a
   placeholder in the builder and nothing on the storefront), tap targets,
   no overflow at 375 and no errors. The row of circles: native scroller
   styles, touch-style scrollLeft, snapping, arrows, arrow keys, ends.

   LIQUIDJS=<path to liquidjs> LIVE=0 node tests/theme-r7-collections.cjs [section ...] */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const ROOT = path.join(__dirname, '..');
/* The fixture's t filter prints the key's last word; the product count reads the theme's own locale, so use it. */
const FP = require('./theme-featured-product-round5.cjs');
if (!FP.Liquid) { console.log('collections round 7 skipped: liquidjs not installed (LIQUIDJS=<path to liquidjs>)'); return; }
const LOCALE = JSON.parse(fs.readFileSync(path.join(ROOT, 'shopify/locales/en.default.json'), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//, '').replace(/,(\s*[}\]])/g, '$1'));
const baseEngine = FP.engine;
FP.engine = (...a) => {
  const e = baseEngine(...a);
  e.registerFilter('t', (k, ...args) => {
    let v = String(k).split('.').reduce((o, p) => o && o[p], LOCALE);
    if (typeof v !== 'string') return String(k).split('.').pop().replace(/_/g, ' ');
    for (const x of args) if (Array.isArray(x)) v = v.replace(new RegExp('\\{\\{\\s*' + x[0] + '\\s*\\}\\}', 'g'), x[1]);
    return v;
  });
  return e;
};
const {launch, mount, render, schemaOf, schemaProblems} = require('./media-fixture.cjs');
const ASSET = 'live-r7-collections.js';
const only = process.argv.slice(2);

const pic = n => ({url: 'https://theme.test/' + n + '.png', src: 'https://theme.test/' + n + '.png', width: 800, height: 600, alt: ''});
const FONT = {family: 'Verdana', fallback_families: 'sans-serif'};
const FONT2 = {family: 'Courier New', fallback_families: 'monospace'};
const coll = (title, n, image = true) => { const h = title.toLowerCase().replace(/[^a-z0-9]+/g, '-'); return {id: 'c-' + h, title, handle: h, url: '/collections/' + h, featured_image: image ? pic(h) : null, image: image ? pic(h) : null, products_count: n, all_products_count: n}; };
const COLLS = [coll('New in', 24), coll('Dresses', 18), coll('Knitwear and cardigans', 1), coll('Shoes', 42), coll('Bags', 9), coll('Accessories', 31), coll('Sale', 12), coll('Outerwear', 7), coll('Denim', 15), coll('Swim', 11), coll('Home', 5), coll('Gifts', 3)];
const OTHER_COLL = coll('Linen & cotton', 2);
const picked = n => COLLS.slice(0, n).map(c => ({type: 'collection', settings: {collection: c}}));

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const near = (a, b, d = 1) => Math.abs(a - b) <= d;
const rgb = {bg: 'rgb(24, 32, 40)', heading: 'rgb(255, 255, 255)', text: 'rgb(204, 204, 204)', border: 'rgb(68, 85, 102)', altBg: 'rgb(250, 250, 250)', altHeading: 'rgb(16, 16, 16)', altText: 'rgb(51, 51, 51)'};

/* ------------------------------------------------------------ probes (run in the page) */
const PROBES = {
  'collection-circles': uid => {
    const w = document.getElementById('shopify-section-' + uid), root = w.querySelector('.cc');
    if (!root) return {present: false};
    const cs = (el, k) => el ? getComputedStyle(el)[k] : null, r1 = n => Math.round(n * 2) / 2, top = root.getBoundingClientRect().top;
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x: r1(r.x), y: r1(r.y - top), w: r1(r.width), h: r1(r.height)}; };
    const strip = v => v == null ? v : v.replace(/\?.*$/, '');
    const h = root.querySelector('.cc__heading'), track = root.querySelector('.cc__track'), items = [...root.querySelectorAll('.cc__item')], it = items[0];
    const media = it && it.querySelector('.cc__media'), p = it && it.querySelector('.cc__pic'), name = it && it.querySelector('.cc__name'), img = it && it.querySelector('img'), link = it && it.querySelector('.cc__link');
    const prev = root.querySelector('[data-r7c-prev]'), next = root.querySelector('[data-r7c-next]');
    return {present: true, display: cs(root, 'display'), scheme: [...root.classList].filter(c => c.startsWith('color-')).join(' '), spacing: root.classList.contains('remove_spacing'), width: root.dataset.width,
      bg: cs(root, 'backgroundColor'), pt: cs(root, 'paddingTop'), pb: cs(root, 'paddingBottom'), mt: cs(w, 'marginTop'), mb: cs(w, 'marginBottom'), ownFont: root.hasAttribute('data-own-font'),
      inner: box(root.querySelector('.cc__inner')),
      heading: h && {html: h.innerHTML, hidden: h.hidden || cs(h, 'display') === 'none', color: cs(h, 'color'), family: cs(h, 'fontFamily'), size: cs(h, 'fontSize'), weight: cs(h, 'fontWeight'), align: cs(h, 'textAlign'), box: box(h)},
      track: track && {box: box(track), gap: cs(track, 'columnGap'), n: items.length},
      item: it && {box: box(it), last: box(items[items.length - 1])},
      media: media && {pad: cs(media, 'paddingTop'), border: cs(media, 'borderTopColor'), box: box(media)},
      pic: p && {bg: cs(p, 'backgroundColor')},
      name: name && {text: name.textContent, color: cs(name, 'color'), family: cs(name, 'fontFamily'), size: cs(name, 'fontSize'), weight: cs(name, 'fontWeight')},
      img: img ? strip(img.getAttribute('src')) : null, ph: !!(it && it.querySelector('[data-r7c-ph]')), href: link ? link.getAttribute('href') : null, tag: link ? link.tagName : null,
      arrows: {prev: prev ? cs(prev, 'display') !== 'none' && !prev.hidden : false, next: next ? cs(next, 'display') !== 'none' && !next.hidden : false, prevOff: prev ? prev.disabled : null, nextOff: next ? next.disabled : null, flag: root.dataset.arrows}};
  },
  'collection-mosaic': uid => {
    const w = document.getElementById('shopify-section-' + uid), root = w.querySelector('.cm');
    if (!root) return {present: false};
    const cs = (el, k) => el ? getComputedStyle(el)[k] : null, r1 = n => Math.round(n * 2) / 2, top = root.getBoundingClientRect().top;
    const box = el => { if (!el) return null; const r = el.getBoundingClientRect(); return {x: r1(r.x), y: r1(r.y - top), w: r1(r.width), h: r1(r.height)}; };
    const strip = v => v == null ? v : v.replace(/\?.*$/, '');
    const head = root.querySelector('.cm__header'), h = root.querySelector('.cm__heading'), sub = root.querySelector('.cm__sub'), subText = sub && (sub.querySelector('p') || sub), grid = root.querySelector('.cm__grid'), tiles = [...root.querySelectorAll('.cm__tile')];
    const tile = t => { if (!t) return null; const media = t.querySelector('.cm__media'), shade = t.querySelector('.cm__shade'), name = t.querySelector('.cm__name'), count = t.querySelector('.cm__count'), img = t.querySelector('img'), link = t.querySelector('.cm__link');
      return {box: box(t), nopic: t.hasAttribute('data-nopic'), media: {box: box(media), radius: cs(media, 'borderTopLeftRadius'), bg: cs(media, 'backgroundColor')}, shade: {display: cs(shade, 'display'), opacity: cs(shade, 'opacity'), bg: cs(shade, 'backgroundColor')},
        name: {text: name.textContent, color: cs(name, 'color'), family: cs(name, 'fontFamily'), size: cs(name, 'fontSize'), weight: cs(name, 'fontWeight'), box: box(name)},
        count: count && {text: count.textContent.trim(), hidden: count.hidden || cs(count, 'display') === 'none', color: cs(count, 'color'), family: cs(count, 'fontFamily')},
        img: img ? strip(img.getAttribute('src')) : null, ph: !!t.querySelector('[data-r7c-ph]'), href: link.getAttribute('href'), tag: link.tagName}; };
    return {present: true, display: cs(root, 'display'), scheme: [...root.classList].filter(c => c.startsWith('color-')).join(' '), spacing: root.classList.contains('remove_spacing'), width: root.dataset.width,
      bg: cs(root, 'backgroundColor'), pt: cs(root, 'paddingTop'), pb: cs(root, 'paddingBottom'), mt: cs(w, 'marginTop'), mb: cs(w, 'marginBottom'), ownFont: root.hasAttribute('data-own-font'),
      inner: box(root.querySelector('.cm__inner')), header: head && {hidden: head.hidden || cs(head, 'display') === 'none'},
      heading: h && {html: h.innerHTML, hidden: h.hidden || cs(h, 'display') === 'none', color: cs(h, 'color'), family: cs(h, 'fontFamily'), size: cs(h, 'fontSize'), weight: cs(h, 'fontWeight'), align: cs(h, 'textAlign'), box: box(h)},
      sub: sub && {html: sub.innerHTML, hidden: sub.hidden || cs(sub, 'display') === 'none', color: cs(subText, 'color'), family: cs(subText, 'fontFamily'), box: box(sub)},
      grid: grid && {box: box(grid), gap: cs(grid, 'rowGap'), count: grid.dataset.count, n: tiles.length},
      tiles: tiles.map(t => box(t)), first: tile(tiles[0]), second: tile(tiles[1])};
  },
};
const probe = (t, name, uid = 'test') => t.page.evaluate(PROBES[name], uid);
/* Two frames for the controller's one paint per frame, then any colour or size transition is run to its end. */
const frames = (t, n = 2) => t.page.evaluate(n => new Promise(r => { const f = () => n-- > 0 ? requestAnimationFrame(f) : (document.getAnimations().forEach(a => { try { a.finish(); } catch (_) {} }), requestAnimationFrame(() => r())); f(); }), n);

/* ------------------------------------------------------------ what every control must do */
const CUSTOM = {enable_custom_style: true};
const common = W => ({
  color_scheme: {v: 'alt-scheme', ok: q => q.scheme === 'color-alt-scheme' && q.bg === rgb.altBg && q.heading.color === rgb.altHeading},
  show_section_on: {v: W === 375 ? 'desktop' : 'mobile', ok: q => q.display === 'none'},
  reset_spacing: {v: false, pre: {section_margin_top_desktop: 40, section_margin_top_mobile: 20, section_margin_bottom_desktop: 35, section_margin_bottom_mobile: 15}, ok: q => q.mt === (W === 375 ? '20px' : '40px') && q.mb === (W === 375 ? '15px' : '35px') && q.spacing === false},
  enable_custom_style: {v: true, pre: {section_bg: '#abcdef'}, ok: q => q.bg === 'rgb(171, 205, 239)'},
  section_bg: {v: '#abcdef', pre: CUSTOM, ok: q => q.bg === 'rgb(171, 205, 239)'},
  header_size: {v: 'large', ok: (q, b) => parseFloat(q.heading.size) > parseFloat(b.heading.size) + 2},
  padding_top_desktop: {v: 100, at: 1366, ok: q => q.pt === '100px'},
  padding_bottom_desktop: {v: 120, at: 1366, ok: q => q.pb === '120px'},
  section_margin_top_desktop: {v: 40, at: 1366, pre: {reset_spacing: false}, ok: q => q.mt === '40px'},
  section_margin_bottom_desktop: {v: 45, at: 1366, pre: {reset_spacing: false}, ok: q => q.mb === '45px'},
  padding_top_mobile: {v: 10, at: 375, ok: q => q.pt === '10px'},
  padding_bottom_mobile: {v: 90, at: 375, ok: q => q.pb === '90px'},
  section_margin_top_mobile: {v: 25, at: 375, pre: {reset_spacing: false}, ok: q => q.mt === '25px'},
  section_margin_bottom_mobile: {v: 30, at: 375, pre: {reset_spacing: false}, ok: q => q.mb === '30px'},
});
const CFG = {
  'collection-circles': {
    p: 'cc', blocks: () => [{type: 'heading'}, ...picked(12)], few: () => [{type: 'heading'}, ...picked(3)],
    section: W => ({...common(W),
      section_width: {v: 'container', ok: (q, b) => q.width === 'container' && (W === 1366 ? q.inner.w < b.inner.w - 20 : true)},
      alignment: {v: 'left', ok: q => q.heading.align === 'start'},
      circle_size: {v: 160, at: 1366, ok: q => near(q.item.box.w, 160) && near(q.media.box.h, 160)},
      gap: {v: 48, at: 1366, ok: q => q.track.gap === '48px'},
      show_arrows: {v: false, at: 1366, ok: (q, b) => b.arrows.next === true && q.arrows.next === false && q.arrows.flag === 'false'},
      show_ring: {v: false, ok: q => q.media.pad === '0px' && q.media.border === 'rgba(0, 0, 0, 0)'},
      title_color: {v: '#ff8800', pre: CUSTOM, ok: q => q.name.color === 'rgb(255, 136, 0)'},
      ring_color: {v: '#00ff88', pre: CUSTOM, ok: q => q.media.border === 'rgb(0, 255, 136)'},
      image_bg: {v: '#112233', pre: CUSTOM, ok: q => q.pic.bg === 'rgb(17, 34, 51)'},
      font_size: {v: 22, at: 1366, ok: q => q.name.size === '22px'},
      enable_custom_fonts: {v: true, pre: {heading_font: FONT}, ok: q => /Verdana/.test(q.heading.family) && /Verdana/.test(q.name.family) && q.ownFont},
      heading_font: {v: FONT, pre: {enable_custom_fonts: true}, ok: q => /Verdana/.test(q.heading.family) && /Verdana/.test(q.name.family)},
      circle_size_mobile: {v: 100, at: 375, ok: q => near(q.item.box.w, 100) && near(q.media.box.h, 100)},
      gap_mobile: {v: 24, at: 375, ok: q => q.track.gap === '24px'},
      font_size_mobile: {v: 18, at: 375, ok: q => q.name.size === '18px'},
    }),
    block: {
      heading: {
        text: {v: 'Find your <em>fit</em>', ok: q => q.heading.html === 'Find your <em>fit</em>' && !q.heading.hidden},
        enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.heading.color === 'rgb(255, 0, 0)'},
        color: {v: '#00ff00', pre: CUSTOM, ok: q => q.heading.color === 'rgb(0, 255, 0)'},
      },
      collection: {
        collection: {v: OTHER_COLL, redraw: true, ok: q => q.name.text === 'Linen & cotton' && q.href === '/collections/linen-cotton' && /linen-cotton\.png$/.test(q.img)},
        image: {v: pic('own-picture'), ok: q => /own-picture\.png$/.test(q.img)},
      },
    },
    selects: {section_width: 1366, alignment: 0, header_size: 0},
  },
  'collection-mosaic': {
    p: 'cm', blocks: () => [{type: 'heading'}, {type: 'subheading'}, ...picked(4)],
    section: W => ({...common(W),
      section_width: {v: 'container', ok: (q, b) => q.width === 'container' && (W === 1366 ? q.grid.box.w < b.grid.box.w - 20 : true)},
      show_product_count: {v: false, ok: (q, b) => q.first.count.hidden && !b.first.count.hidden},
      large_position: {v: 'right', at: 1366, ok: q => q.tiles[0].x > q.tiles[1].x && q.tiles[0].w > q.tiles[2].w * 1.5},
      collection_information_position: {v: 'below_image', pre: {color_scheme: 'alt-scheme'}, ok: q => q.first.name.box.y >= q.first.media.box.y + q.first.media.box.h - 0.5 && q.first.name.color === rgb.altHeading && q.first.shade.display === 'none'},
      header_alignment: {v: 'center', ok: q => q.heading.align === 'center'},
      grid_height: {v: 700, at: 1366, ok: q => q.grid.box.h === 700},
      gap: {v: 30, ok: q => q.grid.gap === '30px'},
      image_overlay_opacity: {v: 60, ok: q => q.first.shade.opacity === '0.6' && q.first.shade.display === 'block'},
      title_color: {v: '#ff8800', pre: CUSTOM, ok: q => q.first.name.color === 'rgb(255, 136, 0)' && q.first.count.color === 'rgb(255, 136, 0)'},
      overlay_color: {v: '#0000ff', pre: CUSTOM, ok: q => q.first.shade.bg === 'rgb(0, 0, 255)'},
      image_bg: {v: '#112233', pre: CUSTOM, ok: q => q.first.media.bg === 'rgb(17, 34, 51)'},
      border_radius: {v: 30, pre: CUSTOM, ok: q => q.first.media.radius === '30px'},
      font_size: {v: 30, at: 1366, ok: q => q.second.name.size === '30px' && q.first.name.size === '42px'},
      enable_custom_fonts: {v: true, pre: {heading_font: FONT, body_font: FONT2}, ok: q => /Verdana/.test(q.heading.family) && /Verdana/.test(q.first.name.family) && /Courier/.test(q.first.count.family) && /Courier/.test(q.sub.family) && q.ownFont},
      heading_font: {v: FONT, pre: {enable_custom_fonts: true}, ok: q => /Verdana/.test(q.heading.family) && /Verdana/.test(q.first.name.family) && !/Verdana/.test(q.first.count.family)},
      body_font: {v: FONT2, pre: {enable_custom_fonts: true}, ok: q => /Courier/.test(q.first.count.family) && /Courier/.test(q.sub.family) && !/Courier/.test(q.heading.family)},
      mobile_layout: {v: 'grid_2', at: 375, ok: q => q.tiles[1].y === q.tiles[2].y && q.tiles[2].x > q.tiles[1].x && q.tiles[0].w > q.tiles[1].w * 1.9 && near(q.tiles[3].w, q.tiles[0].w)},
      tile_height_mobile: {v: 240, at: 375, ok: q => q.second.media.box.h === 240 && q.first.media.box.h === 360},
      font_size_mobile: {v: 24, at: 375, ok: q => q.second.name.size === '24px'},
    }),
    block: {
      heading: {
        text: {v: 'Start with a <em>collection</em>', ok: q => q.heading.html === 'Start with a <em>collection</em>' && !q.heading.hidden},
        enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.heading.color === 'rgb(255, 0, 0)'},
        color: {v: '#00ff00', pre: CUSTOM, ok: q => q.heading.color === 'rgb(0, 255, 0)'},
      },
      subheading: {
        text: {v: '<p>Sorted by what you are shopping for.</p>', ok: q => q.sub.html === '<p>Sorted by what you are shopping for.</p>' && !q.sub.hidden},
        enable_custom_style: {v: true, pre: {color: '#ff0000'}, ok: q => q.sub.color === 'rgb(255, 0, 0)'},
        color: {v: '#00ff00', pre: CUSTOM, ok: q => q.sub.color === 'rgb(0, 255, 0)'},
      },
      collection: {
        collection: {v: OTHER_COLL, redraw: true, ok: q => q.first.name.text === 'Linen & cotton' && q.first.href === '/collections/linen-cotton' && /linen-cotton\.png$/.test(q.first.img) && q.first.count.text === '2 Products'},
        image: {v: pic('own-picture'), ok: q => /own-picture\.png$/.test(q.first.img)},
      },
    },
    selects: {section_width: 1366, large_position: 1366, collection_information_position: 0, header_alignment: 0, header_size: 0, mobile_layout: 375},
  },
};
const visible = list => (list || []).filter(x => x.id && x.hidden !== true && x.visible_if !== '{{ false }}');

/* ------------------------------------------------------------ static */
function statics(name) {
  const {raw, schema: s} = schemaOf(name), lines = raw.split('\n');
  eq(lines[0], '<template compat="shopify">', name + ': line 1');
  eq(lines[1], `<script src="{{ '${ASSET}' | asset_url }}" defer="defer"></script>`, name + ': line 2 links the controller');
  ok(/\{% render 'theme-type' %\}/.test(lines[2]), name + ': theme-type right after');
  eq(lines.filter(l => /^\s*<\/template>\s*$/.test(l)).length, 1, name + ': one closing template line');
  eq(Object.keys(JSON.parse(raw.split('<schema>')[1].split('</schema>')[0])).includes('shopify'), true, name + ': the schema has the theme\'s own object (Storelib adds its panel)');
  eq(schemaProblems(name), [], name + ': schema problems');
  ok(s.name.length <= 25, name + ': name fits the builder');
  const others = fs.readdirSync(path.join(ROOT, 'sections')).filter(f => f.endsWith('.storelib') && f !== name + '.storelib').filter(f => { try { return schemaOf(f.slice(0, -9)).schema.name === s.name; } catch (_) { return false; } });
  eq(others, [], name + ': no other section has this name');
  eq([s.presets[0].name, s.presets[0].category], [s.name, 'Collections'], name + ': preset name and category');
  const order = s.settings.filter(x => x.type === 'header').map(x => x.content);
  const want = ['General', 'Content', 'Layout', 'Images', 'Appearance', 'Typography', 'Animation', 'Desktop spacing', 'Mobile'].filter(x => order.includes(x));
  eq(order, want, name + ': groups in the shared order');
  eq(s.settings.filter(x => x.id).slice(0, 4).map(x => x.id), ['color_scheme', 'section_width', 'show_section_on', 'reset_spacing'], name + ': General group');
  /* spacing controls are the category's own (Collection Lookbook) */
  const look = schemaOf('collection-lookbook').schema.settings, mine = s.settings;
  for (const id of ['padding_top_desktop', 'padding_bottom_desktop', 'padding_top_mobile', 'padding_bottom_mobile', 'section_margin_top_desktop', 'section_margin_bottom_desktop', 'section_margin_top_mobile', 'section_margin_bottom_mobile', 'show_section_on', 'reset_spacing'])
    eq(mine.find(x => x.id === id), look.find(x => x.id === id), name + ': ' + id + ' matches the category');
  /* every picture is an image picker, every collection a collection picker, nothing typed */
  for (const b of s.blocks.filter(b => b.type === 'collection')) eq(b.settings.filter(x => x.id).map(x => x.type), ['collection', 'image_picker'], name + ': a collection block is a collection picker and a picture');
  const words = JSON.stringify(s) + raw.split('<schema>')[0].replace(/\{%-?\s*comment[\s\S]*?endcomment\s*-?%\}/g, '');
  ok(!/—|–/.test(words), name + ': no dashes in copy');
  ok(!/\b(unlock|elevate|seamless|powerful|effortlessly|supercharge|transform)\b/i.test(JSON.stringify(s)), name + ': no banned words');
  ok(!/<link\b|<iframe\b|onclick=|fetch\(/i.test(raw), name + ': no link, iframe, inline handler or fetch');
  /* every colour of the default drawing is a theme variable (white on a picture and its shade excepted, as in Category Banners) */
  const css = raw.split('<schema>')[0].match(/<style>[\s\S]*?<\/style>/g).join('\n');
  eq([...new Set((css.match(/#[0-9a-fA-F]{3,8}\b/g) || []))].sort(), name === 'collection-mosaic' ? ['#000000', '#ffffff'] : [], name + ': no hard-coded colours');
  /* every schema id is covered by this test */
  const cfg = CFG[name], sec = cfg.section(1366);
  eq(visible(s.settings).map(x => x.id).filter(id => !sec[id]), [], name + ': every section setting has a check');
  for (const b of s.blocks) eq(visible(b.settings).map(x => x.id).filter(id => !(cfg.block[b.type] || {})[id]), [], name + ': every ' + b.type + ' setting has a check');
}

/* ------------------------------------------------------------ every control, live and redrawn */
async function controls(browser, name, W, editing) {
  const cfg = CFG[name], s = schemaOf(name).schema, tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`;
  const t = await mount(browser, name, {width: W, editing, blocks: cfg.blocks(), assets: [ASSET]});
  const defaults = Object.fromEntries(s.settings.filter(x => x.id).map(x => [x.id, x.default === undefined ? '' : x.default]));
  const base = await probe(t, name);
  ok(base.present, tag + ': draws');
  eq(await t.page.evaluate(() => !!document.querySelector('[data-r7c-settings]')), editing, tag + ': settings JSON only in the builder');
  const run = async (id, spec, block) => {
    const where = block ? block + '.' + id : id, bid = block ? t.blockId(block) : undefined;
    const bdef = block ? Object.fromEntries(s.blocks.find(b => b.type === block).settings.filter(x => x.id).map(x => [x.id, x.default === undefined ? '' : x.default])) : defaults;
    const change = {...(spec.pre || {}), [id]: spec.v}, back = Object.fromEntries(Object.keys(change).map(k => [k, k === 'collection' ? COLLS[0] : bdef[k]]));
    const want = !spec.at || spec.at === W;
    let live = null;
    if (editing && !spec.redraw) {
      await t.emit(change, bid); await frames(t);
      live = await probe(t, name);
      eq(!!spec.ok(live, base), want, `${tag}: ${where} live ${want ? 'changes its element' : 'leaves this width alone'}`);
      await t.emit(back, bid); await frames(t);
      eq(await probe(t, name), base, `${tag}: ${where} back to the start, live`);
    }
    const blocksWith = set => t.section.blocks.map(b => ({type: b.type, settings: b.id === bid ? {...b.settings, ...set} : b.settings}));
    await t.redraw(block ? {blocks: blocksWith(change)} : {settings: change}); await frames(t);
    const drawn = await probe(t, name);
    eq(!!spec.ok(drawn, base), want, `${tag}: ${where} redrawn ${want ? 'changes its element' : 'leaves this width alone'}`);
    if (live) eq(live, drawn, `${tag}: ${where} live equals the redraw`);
    await t.redraw(block ? {blocks: blocksWith(back)} : {settings: back}); await frames(t);
    eq(await probe(t, name), base, `${tag}: ${where} back to the start after a redraw`);
  };
  const sec = cfg.section(W);
  for (const x of visible(s.settings)) await run(x.id, sec[x.id]);
  for (const b of s.blocks) for (const x of visible(b.settings)) await run(x.id, cfg.block[b.type][x.id], b.type);
  ok(await t.noOverflow(), tag + ': no sideways page scroll');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* ------------------------------------------------------------ theme, schemes, custom, priority */
async function theme(browser, name, W, editing) {
  const cfg = CFG[name], tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`, m = name === 'collection-mosaic';
  for (const priority of [true, 'off']) {
    const t = await mount(browser, name, {width: W, editing, blocks: cfg.blocks(), assets: [ASSET], priority, settings: m ? {collection_information_position: 'below_image'} : {}});
    const q = await probe(t, name), nm = m ? q.first.name : q.name;
    eq([q.bg, q.heading.color, nm.color], [rgb.bg, rgb.heading, rgb.heading], `${tag} priority ${priority}: scheme colours`);
    ok(/Georgia/.test(q.heading.family) && /Georgia/.test(nm.family), `${tag} priority ${priority}: theme heading font`);
    eq([q.heading.weight, nm.weight], ['700', '700'], `${tag} priority ${priority}: theme heading weight`);
    if (m) { ok(/Arial/.test(q.first.count.family) && /Arial/.test(q.sub.family), `${tag} priority ${priority}: theme body font`); eq([q.first.count.color, q.sub.color, q.first.media.radius], [rgb.text, rgb.text, '8px'], `${tag} priority ${priority}: body colour and theme corners`); }
    else eq(q.media.border, rgb.border, `${tag} priority ${priority}: ring is the scheme border`);
    eq(t.errors, [], `${tag} priority ${priority}: no errors`);
    await t.page.close();
  }
  /* scheme switch, live and redrawn; custom fonts on an element and a descendant under the real theme rules, then off */
  const t = await mount(browser, name, {width: W, editing, blocks: cfg.blocks().map(b => b.type === 'heading' ? {...b, settings: {text: 'Shop <em>the range</em>'}} : b), assets: [ASSET]});
  const base = await probe(t, name);
  await t.emit({color_scheme: 'alt-scheme'}); await frames(t);
  let q = await probe(t, name);
  eq([q.bg, q.heading.color], [rgb.altBg, rgb.altHeading], tag + ': alternate scheme, live');
  if (m) eq([q.first.name.color, q.first.count.color, q.sub.color], ['rgb(255, 255, 255)', 'rgb(255, 255, 255)', rgb.altText], tag + ': a name on a picture stays white, the text follows the scheme');
  else eq([q.name.color, q.media.border], [rgb.altHeading, 'rgb(221, 221, 221)'], tag + ': names and ring follow the scheme');
  await t.redraw({settings: {color_scheme: 'alt-scheme'}}); await frames(t);
  eq(await probe(t, name), q, tag + ': alternate scheme, redrawn');
  await t.redraw({settings: {color_scheme: 'default-color-scheme'}}); await frames(t);
  const fonts = {enable_custom_fonts: true, heading_font: FONT, ...(m ? {body_font: FONT2} : {})};
  const families = () => t.page.evaluate(p => { const r = document.querySelector('#shopify-section-test .' + p), f = el => el ? getComputedStyle(el).fontFamily : ''; return {em: f(r.querySelector('.' + p + '__heading em')), h: f(r.querySelector('.' + p + '__heading')), name: f(r.querySelector('.' + p + '__name')), count: f(r.querySelector('.cm__count')), sub: f(r.querySelector('.cm__sub p'))}; }, cfg.p);
  for (const how of ['live', 'redrawn']) {
    if (how === 'live') await t.emit(fonts); else await t.redraw({settings: fonts});
    await frames(t);
    const f = await families();
    ok(/Verdana/.test(f.h) && /Verdana/.test(f.em) && /Verdana/.test(f.name), `${tag}: custom heading font wins on the heading, its <em> and the names, ${how}`);
    if (m) ok(/Courier/.test(f.count) && /Courier/.test(f.sub), `${tag}: custom body font wins on the count and the text, ${how}`);
    const off = {enable_custom_fonts: false};
    if (how === 'live') await t.emit(off); else await t.redraw({settings: off});
    await frames(t);
    const g = await families();
    ok(/Georgia/.test(g.h) && /Georgia/.test(g.em) && /Georgia/.test(g.name) && (!m || /Arial/.test(g.count) && /Arial/.test(g.sub)), `${tag}: fonts off restores the theme, ${how}`);
  }
  await t.redraw({settings: {enable_custom_fonts: false, heading_font: 'assistant_n4', body_font: 'assistant_n4'}}); await frames(t);
  /* custom styling on with every colour, then off: exactly the theme again */
  const colours = m ? {enable_custom_style: true, section_bg: '#abcdef', title_color: '#ff8800', overlay_color: '#0000ff', image_bg: '#112233', border_radius: 30} : {enable_custom_style: true, section_bg: '#abcdef', title_color: '#ff8800', ring_color: '#00ff88', image_bg: '#112233'};
  for (const how of ['live', 'redrawn']) {
    if (how === 'live') await t.emit(colours); else await t.redraw({settings: colours});
    await frames(t);
    q = await probe(t, name);
    if (m) eq([q.bg, q.first.name.color, q.first.shade.bg, q.first.media.bg, q.first.media.radius], ['rgb(171, 205, 239)', 'rgb(255, 136, 0)', 'rgb(0, 0, 255)', 'rgb(17, 34, 51)', '30px'], `${tag}: every custom colour lands, ${how}`);
    else eq([q.bg, q.name.color, q.media.border, q.pic.bg], ['rgb(171, 205, 239)', 'rgb(255, 136, 0)', 'rgb(0, 255, 136)', 'rgb(17, 34, 51)'], `${tag}: every custom colour lands, ${how}`);
    eq(q.heading.color, rgb.heading, `${tag}: the heading keeps the scheme colour, ${how}`);
    /* an empty custom colour is the theme's */
    const empty = {section_bg: '', title_color: 'rgba(0, 0, 0, 0)', image_bg: ''};
    if (how === 'live') await t.emit(empty); else await t.redraw({settings: empty});
    await frames(t);
    q = await probe(t, name);
    eq([q.bg, (m ? q.first.name : q.name).color], [rgb.bg, rgb.heading], `${tag}: an empty custom colour falls back to the scheme, ${how}`);
    const off = {enable_custom_style: false};
    if (how === 'live') await t.emit(off); else await t.redraw({settings: {...off, section_bg: '', title_color: '', overlay_color: '', ring_color: '', image_bg: '', border_radius: 8}});
    await frames(t);
    q = await probe(t, name);
    eq([q.bg, (m ? q.first.name : q.name).color, m ? q.first.media.radius : q.media.border], [rgb.bg, rgb.heading, m ? '8px' : rgb.border], `${tag}: custom styling off restores the theme, ${how}`);
    if (how === 'live') { await t.emit({section_bg: '', title_color: '', overlay_color: '', ring_color: '', image_bg: '', border_radius: 8}); await frames(t); }
  }
  /* a blank heading hides (and the header with it when nothing else is in it) */
  await t.emit({text: ''}, t.blockId('heading')); await frames(t);
  q = await probe(t, name);
  ok(q.heading.hidden, tag + ': an empty heading is hidden');
  if (m) { ok(!q.header.hidden, tag + ': the header stays for the text under it'); await t.emit({text: ''}, t.blockId('subheading')); await frames(t); ok((await probe(t, name)).header.hidden, tag + ': the header goes when it is empty'); }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
  void base;
}

/* ------------------------------------------------------------ select options look different */
async function selects(browser, name, W) {
  const cfg = CFG[name], s = schemaOf(name).schema, tag = `${name} ${W}`;
  /* Circles: a row that fits, from the left, so the section width shows at its edge (a centred row that fits looks the same stretched or full width). */
  const t = await mount(browser, name, {width: W, editing: true, blocks: (cfg.few || cfg.blocks)(), settings: cfg.few ? {alignment: 'left'} : {}, assets: [ASSET]});
  for (const [id, only] of Object.entries(cfg.selects)) {
    if (only && only !== W) continue;
    const x = s.settings.find(y => y.id === id), seen = [];
    for (const how of ['live', 'redrawn']) {
      const sigs = [];
      for (const o of x.options) {
        if (how === 'live') await t.emit({[id]: o.value}); else await t.redraw({settings: {[id]: o.value}});
        await frames(t);
        sigs.push(JSON.stringify(await probe(t, name)).replace(/"width":"[^"]*",?/, ''));
      }
      eq(new Set(sigs).size, x.options.length, `${tag}: every ${id} option looks different, ${how}`);
      seen.push(sigs);
      const start = id === 'alignment' ? 'left' : x.default;
      if (how === 'live') await t.emit({[id]: start}); else await t.redraw({settings: {[id]: start}});
    }
    eq(seen[0], seen[1], `${tag}: ${id} options, live equals redrawn`);
  }
  /* Show section on: each option at this width */
  for (const [v, shown] of [['all', true], ['mobile', W === 375], ['desktop', W === 1366]]) {
    await t.emit({show_section_on: v}); await frames(t);
    eq((await probe(t, name)).display !== 'none', shown, `${tag}: show on ${v}`);
  }
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();
}

/* ------------------------------------------------------------ lifecycle */
async function lifecycle(browser, name, W) {
  const cfg = CFG[name], tag = `${name} ${W}`, m = name === 'collection-mosaic';
  /* two instances */
  const t = await mount(browser, name, {width: W, editing: true, instances: [{uid: 'a', blocks: cfg.blocks()}, {uid: 'b', blocks: cfg.blocks()}], assets: [ASSET]});
  const a0 = await probe(t, name, 'a'), b0 = await probe(t, name, 'b');
  await t.emit({enable_custom_style: true, section_bg: '#abcdef', padding_top_desktop: 12, padding_top_mobile: 12, color_scheme: 'alt-scheme'}, undefined, 'a'); await frames(t);
  await t.emit({text: 'Only in A'}, t.blockId('heading', 0, 'a'), 'a'); await frames(t);
  const a1 = await probe(t, name, 'a');
  ok(a1.bg === 'rgb(171, 205, 239)' && a1.pt === '12px' && a1.heading.html === 'Only in A', tag + ': the edit lands in instance A');
  const b1 = await probe(t, name, 'b');
  eq(b1, b0, tag + ': instance B is untouched');
  eq(await t.page.evaluate(() => window.MateriaR7Collections.count()), 2, tag + ': two roots');
  /* other shapes of the event: an object, a prefixed id, blockId */
  await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: {id: 'b'}, settings: {padding_bottom_desktop: 8, padding_bottom_mobile: 8}, live: true}})));
  await t.page.evaluate(id => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {section: 'shopify-section-b', blockId: id, settings: {text: 'Only in B'}, live: false}})), t.blockId('heading', 0, 'b'));
  await frames(t, 3);
  const b2 = await probe(t, name, 'b');
  ok(b2.pb === '8px' && b2.heading.html === 'Only in B', tag + ': section as an object, a prefixed id and blockId are understood');
  eq((await probe(t, name, 'a')).heading.html, 'Only in A', tag + ': and A keeps its own');
  /* a change with no section (a theme setting) is not ours */
  await t.page.evaluate(() => document.dispatchEvent(new CustomEvent('storelib:settings-change', {detail: {settings: {padding_top_desktop: 199, padding_top_mobile: 199}, live: true}})));
  await frames(t);
  eq((await probe(t, name, 'a')).pt, '12px', tag + ': a theme setting change is left alone');
  eq(t.errors, [], tag + ': no errors with two instances');
  await t.page.close();
  void a0;

  /* pictures and the scroll position on unrelated edits; an added block; redraws set up once */
  const u = await mount(browser, name, {width: W, editing: true, blocks: cfg.blocks(), assets: [ASSET]});
  const imgSel = '#shopify-section-test .' + cfg.p + '__img';
  await u.page.evaluate(sel => { const i = document.querySelector(sel); i.__kept = true; window.__src = i.getAttribute('src'); window.__srcset = i.getAttribute('srcset'); }, imgSel);
  if (!m) { await u.page.evaluate(() => { document.querySelector('[data-r7c-track]').scrollLeft = 400; }); await u.page.waitForTimeout(250); }
  const left0 = m ? 0 : await u.page.evaluate(() => document.querySelector('[data-r7c-track]').scrollLeft);
  if (!m) ok(left0 > 100, tag + ': the row scrolled');
  await u.emit({padding_top_desktop: 20, padding_top_mobile: 20, gap: 20, enable_custom_style: true, title_color: '#ff8800'}); await frames(u);
  await u.emit({text: 'Edited'}, u.blockId('heading')); await frames(u);
  eq(await u.page.evaluate(sel => { const i = document.querySelector(sel); return [i.__kept === true, i.getAttribute('src') === window.__src, i.getAttribute('srcset') === window.__srcset]; }, imgSel), [true, true, true], tag + ': the picture is the same element with the same address after unrelated edits');
  if (!m && W === 375) eq(await u.page.evaluate(() => document.querySelector('[data-r7c-track]').scrollLeft), left0, tag + ': the row keeps its place on an unrelated edit');
  /* the picture of one block changes only that block */
  const second = u.blockId('collection', 1);
  await u.emit({image: pic('second-own')}, second); await frames(u);
  eq(await u.page.evaluate(({sel, id}) => { const i = document.querySelector(sel), j = document.querySelector('[data-r7c-block="' + id + '"] img'); return [i.__kept === true, i.getAttribute('src') === window.__src, /second-own\.png/.test(j.getAttribute('src'))]; }, {sel: imgSel, id: second}), [true, true, true], tag + ': one block\'s picture changes, the others stay');
  await u.emit({image: ''}, second); await frames(u);
  ok(await u.page.evaluate(id => /dresses\.png/.test(document.querySelector('[data-r7c-block="' + id + '"] img').getAttribute('src')), second), tag + ': clearing a block\'s picture brings the collection\'s back');
  /* added block */
  const added = {type: 'collection', settings: {collection: OTHER_COLL}};
  const before = await u.page.evaluate(() => document.querySelectorAll('[data-r7c-type="collection"]').length);
  const blocks = (m ? [{type: 'heading'}, ...picked(3)] : cfg.blocks()).concat([added]);
  await u.redraw({blocks}); await frames(u);
  const newId = 'test-b' + (blocks.length - 1);
  ok(await u.page.evaluate(id => { const b = document.querySelector('[data-r7c-block="' + id + '"]'); return !!b && /Linen & cotton/.test(b.textContent) && b.querySelector('a').getAttribute('href') === '/collections/linen-cotton'; }, newId), tag + ': an added Collection block draws');
  if (!m) eq(await u.page.evaluate(() => document.querySelectorAll('[data-r7c-type="collection"]').length), before + 1, tag + ': one more circle');
  await u.emit({image: pic('added-own')}, newId); await frames(u);
  ok(await u.page.evaluate(id => /added-own\.png/.test(document.querySelector('[data-r7c-block="' + id + '"] img').getAttribute('src')), newId), tag + ': the added block is live');
  for (let i = 0; i < 3; i++) await u.redraw();
  await frames(u);
  eq(await u.page.evaluate(() => [window.MateriaR7Collections.count(), document.querySelectorAll('[data-r7c]').length]), [1, 1], tag + ': redraws leave one root set up');
  /* a section swapped in with no event is found too */
  await u.page.evaluate(() => { const w = document.getElementById('shopify-section-test'), html = w.innerHTML; w.innerHTML = ''; w.innerHTML = html; });
  await frames(u, 4);
  eq(await u.page.evaluate(() => [window.MateriaR7Collections.count(), [...window.MateriaR7Collections.roots.keys()].every(r => r.isConnected)]), [1, true], tag + ': a section put in without an event is picked up, the old one dropped');
  await u.emit({padding_top_desktop: 44, padding_top_mobile: 44}); await frames(u);
  eq((await probe(u, name)).pt, '44px', tag + ': and it is live');
  if (!m && W === 1366) {
    /* one click, one scroll call: listeners are not doubled by redraws */
    await u.page.evaluate(() => { window.__calls = 0; const o = Element.prototype.scrollBy; Element.prototype.scrollBy = function (...a) { window.__calls++; return o.apply(this, a); }; });
    await u.root('[data-r7c-next]').click();
    eq(await u.page.evaluate(() => window.__calls), 1, tag + ': one click scrolls once after four redraws');
  }
  eq(u.errors, [], tag + ': no errors in the lifecycle');
  await u.page.close();
}

/* ------------------------------------------------------------ first paint, reduced motion, data, phone feel */
async function paint(browser, name, W, editing) {
  const cfg = CFG[name], tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`, m = name === 'collection-mosaic';
  const strip = q => ({...q, arrows: 0});
  const raw = await mount(browser, name, {width: W, editing, blocks: cfg.blocks(), assets: [], inlineScripts: false});
  const first = await probe(raw, name);
  await raw.page.close();
  const t = await mount(browser, name, {width: W, editing, blocks: cfg.blocks(), assets: [ASSET]});
  eq(strip(await probe(t, name)), strip(first), tag + ': first paint equals the hydrated paint');
  /* tap targets */
  const small = await t.page.evaluate(p => [...document.querySelectorAll('#shopify-section-test a.' + p + '__link')].map(a => a.getBoundingClientRect()).filter(r => r.width < 44 || r.height < 44).length, cfg.p);
  eq(small, 0, tag + ': every link is at least 44px');
  ok(await t.page.evaluate(p => [...document.querySelectorAll('#shopify-section-test a.' + p + '__link')].every(a => a.textContent.trim().length > 0 && a.querySelector('h3') && a.querySelector('img').getAttribute('alt') === '' && a.querySelector('img').getAttribute('loading') === 'lazy' && a.querySelector('img').hasAttribute('width') && a.querySelector('img').hasAttribute('height')), cfg.p), tag + ': each link is named by its h3; its picture is decoration, lazy and sized');
  eq(await t.page.evaluate(() => [document.querySelectorAll('#shopify-section-test h1').length, document.querySelectorAll('#shopify-section-test h2').length]), [0, 1], tag + ': one h2, no h1');
  ok(await t.noOverflow(), tag + ': no sideways page scroll');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();

  /* the theme's reveal on scroll: the hook is on the section, nothing is hidden, a live edit does not play it again */
  const a = await mount(browser, name, {width: W, editing, blocks: cfg.blocks(), assets: [ASSET], theme: {scroll_animation: 'fade_up'}});
  const reveal = () => a.page.evaluate(() => { const w = document.getElementById('shopify-section-test'); return [w.classList.contains('scroll-trigger'), w.classList.contains('fade_up'), getComputedStyle(w).opacity, w.getAnimations().length]; });
  eq(await reveal(), [true, true, '1', 0], tag + ': the theme reveal hook is on the section and the content shows');
  await a.emit({padding_top_desktop: 20, padding_top_mobile: 20}); await frames(a);
  eq(await reveal(), [true, true, '1', 0], tag + ': an edit does not replay the reveal');
  eq(a.errors, [], tag + ': no errors with the theme reveal');
  await a.page.close();

  /* reduced motion */
  const r = await mount(browser, name, {width: W, editing, blocks: cfg.blocks(), assets: [ASSET], reducedMotion: 'reduce'});
  const still = await r.page.evaluate(p => { const q = s => document.querySelector('#shopify-section-test ' + s), d = el => getComputedStyle(el).transitionDuration; return [d(q('.' + p + '__media')), d(q('.' + p + '__img')), getComputedStyle(q('.' + p + '__name')).opacity, getComputedStyle(q('.' + p)).opacity]; }, cfg.p);
  eq(still, ['0s', '0s', '1', '1'], tag + ': no transitions under reduced motion, content visible');
  await r.root('a.' + cfg.p + '__link').first().hover();
  eq(await r.page.evaluate(p => getComputedStyle(document.querySelector('#shopify-section-test .' + p + '__img')).transform, cfg.p), 'none', tag + ': no hover zoom under reduced motion');
  if (!m && W === 1366) {
    await r.root('[data-r7c-next]').click();
    await frames(r, 2);
    ok(await r.page.evaluate(() => document.querySelector('[data-r7c-track]').scrollLeft) > 200, tag + ': the arrow moves the row at once under reduced motion');
  }
  eq(r.errors, [], tag + ': no errors under reduced motion');
  await r.page.close();

  /* collection data */
  const d = await mount(browser, name, {width: W, editing, blocks: [{type: 'heading'}, {type: 'collection', settings: {collection: COLLS[0]}}, {type: 'collection', settings: {collection: coll('No picture', 1, false)}}, {type: 'collection'}, {type: 'collection', settings: {collection: COLLS[1], image: pic('own-picture')}}], assets: [ASSET]});
  const data = await d.page.evaluate(p => [...document.querySelectorAll('#shopify-section-test [data-r7c-type="collection"]')].map(b => { const l = b.querySelector('.' + p + '__link'), i = b.querySelector('img'), c = b.querySelector('.cm__count'); return {tag: l.tagName, href: l.getAttribute('href'), name: b.querySelector('h3').textContent, img: i ? i.getAttribute('src').replace(/\?.*/, '') : null, ph: !!b.querySelector('[data-r7c-ph]'), count: c ? c.textContent.trim() : null}; }), cfg.p);
  const want = [{tag: 'A', href: '/collections/new-in', name: 'New in', img: 'https://theme.test/new-in.png', ph: false, count: m ? '24 Products' : null},
    {tag: 'A', href: '/collections/no-picture', name: 'No picture', img: null, ph: editing, count: m ? '1 Product' : null},
    ...(editing ? [{tag: 'DIV', href: null, name: 'Collection', img: null, ph: true, count: null}] : []),
    {tag: 'A', href: '/collections/dresses', name: 'Dresses', img: 'https://theme.test/own-picture.png', ph: false, count: m ? '18 Products' : null}];
  eq(data, want, tag + ': name, link, picture and count come from the collection; an empty picker is a placeholder in the builder only; a block\'s own picture wins');
  if (m) eq(await d.page.evaluate(() => [...document.querySelectorAll('#shopify-section-test .cm__tile')].map(x => [x.hasAttribute('data-nopic'), getComputedStyle(x.querySelector('.cm__name')).color])), want.map(x => [!x.img, x.img ? 'rgb(255, 255, 255)' : rgb.heading]), tag + ': a tile with no picture keeps the scheme colours');
  eq(d.errors, [], tag + ': no errors with collection data');
  await d.page.close();
  /* nothing picked: placeholders in the builder (the Add a section card), nothing at all on the storefront */
  const e = await render(name, {editing});
  if (editing) { ok(/data-r7c-ph/.test(e.html) && />Collection</.test(e.html) && !/<img/.test(e.html), tag + ': the first preset draws placeholders'); }
  else ok(!/data-r7c=/.test(e.html) && !/<h2/.test(e.html), tag + ': nothing picked draws nothing on the storefront');
  const none = await render(name, {editing, blocks: [{type: 'heading'}]});
  eq(/Add a Collection block/.test(none.html), editing, tag + ': no Collection block says so in the builder only');
  if (m) {
    const six = await render(name, {editing, blocks: [{type: 'heading'}, ...picked(7)]});
    eq([(six.html.match(/class="cm__tile"/g) || []).length, /data-count="5"/.test(six.html)], [5, true], tag + ': never more than five tiles');
  }
}

/* ------------------------------------------------------------ the mosaic's shapes */
async function mosaicShapes(browser, W) {
  const name = 'collection-mosaic', tag = `${name} ${W}`;
  for (const n of [1, 2, 3, 4, 5]) for (const large of ['left', 'right']) for (const mobile of ['stack', 'grid_2']) {
    if (W === 375 && large === 'right' || W === 1366 && mobile === 'grid_2') continue;
    const t = await mount(browser, name, {width: W, editing: false, settings: {large_position: large, mobile_layout: mobile}, blocks: [{type: 'heading'}, ...picked(n)], assets: [ASSET]});
    const q = await probe(t, name), g = q.grid.box, area = b => b.w * b.h;
    /* tiles fill the grid with no overlap and no hole: their areas and gaps add up */
    const overlap = q.tiles.some((a, i) => q.tiles.some((b, j) => j > i && a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1));
    ok(!overlap && q.tiles.every(b => b.x >= g.x - 1 && b.x + b.w <= g.x + g.w + 1 && b.y >= g.y - 1 && b.y + b.h <= g.y + g.h + 1 && b.w > 60 && b.h > 60), `${tag}: ${n} tiles, large ${large}, phones ${mobile}: inside the grid, no overlap`);
    ok(q.tiles.every((b, i) => i === 0 || area(q.tiles[0]) >= area(b) - 1), `${tag}: ${n} tiles: the first is the largest`);
    if (W === 1366) {
      eq(g.h, 560, `${tag}: ${n} tiles: the grid keeps its height`);
      if (n > 1) ok(large === 'left' ? q.tiles[0].x === g.x : near(q.tiles[0].x + q.tiles[0].w, g.x + g.w), `${tag}: ${n} tiles: the large tile is on the ${large}`);
      if (n > 2) ok(near(q.tiles[0].h, g.h) && q.tiles.slice(1).every(b => b.h < g.h / 2), `${tag}: ${n} tiles: one tall tile, the rest in two rows`);
      const sum = q.tiles.reduce((s, b) => s + area(b), 0), rows = n > 2 ? 2 : 1;
      ok(sum > g.w * g.h * 0.93, `${tag}: ${n} tiles: no hole in the grid (${Math.round(sum / (g.w * g.h) * 100)}% covered, ${rows} rows)`);
    } else if (mobile === 'grid_2' && n > 1) {
      ok(near(q.tiles[0].w, g.w) && (n % 2 === 0 ? near(q.tiles[n - 1].w, g.w) : q.tiles[n - 1].w < g.w / 2), `${tag}: ${n} tiles two per row: the large one and a leftover take a full row`);
    } else ok(q.tiles.every(b => near(b.w, g.w)), `${tag}: ${n} tiles stacked: full width each`);
    ok(await t.noOverflow(), `${tag}: ${n} tiles: no sideways page scroll`);
    eq(t.errors, [], `${tag}: ${n} tiles: no errors`);
    await t.page.close();
  }
}

/* ------------------------------------------------------------ the row of circles: a native scroller */
async function scrollerChecks(browser, W, editing) {
  const name = 'collection-circles', tag = `${name} ${W} ${editing ? 'builder' : 'storefront'}`;
  const t = await mount(browser, name, {width: W, editing, blocks: CFG[name].blocks(), assets: [ASSET]});
  const settle = async () => { let last = -1; for (let i = 0; i < 40; i++) { await t.page.waitForTimeout(70); const x = await t.page.evaluate(() => document.querySelector('[data-r7c-track]').scrollLeft); if (x === last) return x; last = x; } return last; };
  const m = await t.page.evaluate(() => { const tr = document.querySelector('[data-r7c-track]'), cs = getComputedStyle(tr), it = tr.querySelector('.cc__item');
    return {x: cs.overflowX, snap: cs.scrollSnapType, over: cs.overscrollBehaviorX, touch: cs.touchAction, bar: cs.scrollbarWidth, align: getComputedStyle(it).scrollSnapAlign, wide: tr.scrollWidth - tr.clientWidth, step: it.getBoundingClientRect().width + parseFloat(cs.columnGap), tab: tr.getAttribute('tabindex'), label: tr.getAttribute('aria-label')}; });
  eq([m.x, m.snap, m.over, m.touch, m.bar, m.align], ['auto', 'x mandatory', 'contain', 'pan-x pan-y', 'none', 'start'], tag + ': a native snap scroller');
  ok(m.wide > 100 && m.tab === '0' && m.label === 'Collections', tag + ': twelve circles are wider than the page; the row is a labelled tab stop');
  ok(!/touch-action:\s*none|preventDefault\(\)[^}]*(wheel|touchmove)|addEventListener\('(wheel|touchmove|touchstart|pointermove)'/.test(fs.readFileSync(path.join(ROOT, 'shopify/assets', ASSET), 'utf8')), tag + ': no drag, wheel or touch handlers');
  /* touch-style: the scroll position is set directly, and comes to rest on a circle */
  await t.page.evaluate(v => { document.querySelector('[data-r7c-track]').scrollLeft = v; }, m.step * 1.4);
  let x = await settle();
  ok(x > 0 && near(x / m.step, Math.round(x / m.step), 0.03), `${tag}: a touch-style scroll moves the row and snaps to a circle (${x} of step ${m.step})`);
  await t.page.evaluate(() => { document.querySelector('[data-r7c-track]').scrollLeft = 0; });
  await settle(); await frames(t);
  const arrows = async () => (await probe(t, name)).arrows;
  if (W === 1366) {
    let a = await arrows();
    eq([a.prev, a.next, a.prevOff, a.nextOff], [true, true, true, false], tag + ': arrows show, Previous is disabled at the start');
    eq(await t.page.evaluate(() => [...document.querySelectorAll('.cc__arrow')].map(b => { const r = b.getBoundingClientRect(); return [r.width, r.height, b.getAttribute('aria-label'), b.type]; })), [[44, 44, 'Previous', 'button'], [44, 44, 'Next', 'button']], tag + ': arrows are 44px labelled buttons');
    await t.root('[data-r7c-next]').click();
    x = await settle();
    ok(x >= m.step - 1 && (near(x / m.step, Math.round(x / m.step), 0.03) || near(x, m.wide, 1.5)), tag + ': Next moves the row by whole circles, or to its end');
    a = await arrows();
    eq([a.prevOff, a.nextOff], [false, x >= m.wide - 1], tag + ': Previous is enabled after moving');
    for (let i = 0; i < 12 && !(await arrows()).nextOff; i++) { await t.root('[data-r7c-next]').click(); await settle(); await frames(t); }
    x = await settle();
    a = await arrows();
    ok(near(x, m.wide, 1.5) && a.nextOff && !a.prevOff, tag + ': Next is disabled at the end');
    await t.root('[data-r7c-prev]').click();
    ok(await settle() < x - m.step + 2, tag + ': Previous moves it back');
    await t.page.evaluate(() => { document.querySelector('[data-r7c-track]').scrollLeft = 0; }); await settle(); await frames(t);
    if (editing) {
      await t.emit({show_arrows: false}); await frames(t, 3);
      a = await arrows();
      eq([a.prev, a.next], [false, false], tag + ': Show arrows off hides them, live');
      await t.emit({show_arrows: true}); await frames(t, 3);
      eq((await arrows()).next, true, tag + ': and on shows them again');
    }
  } else {
    const a = await arrows();
    eq([a.prev, a.next], [false, false], tag + ': no arrows on a phone, the finger moves the row');
  }
  /* keys on the focused row */
  await t.root('[data-r7c-track]').focus();
  await t.page.keyboard.press('ArrowRight');
  x = await settle();
  ok(near(x, m.step, 2), `${tag}: the right arrow key moves the row one circle (${x})`);
  await t.page.keyboard.press('ArrowRight'); await settle();
  await t.page.keyboard.press('ArrowLeft');
  ok(near(await settle(), m.step, 2), tag + ': the left arrow key moves it back');
  eq(await t.page.evaluate(() => ['ArrowDown', 'ArrowUp', ' ', 'PageDown', 'ArrowRight'].map(key => { const e = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}); document.querySelector('[data-r7c-track]').dispatchEvent(e); return e.defaultPrevented; })), [false, false, false, false, true], tag + ': only left and right are taken; up, down, space and page keys stay with the page');
  await t.page.evaluate(() => { document.querySelector('[data-r7c-track]').scrollLeft = 0; }); await settle();
  /* keys with a circle focused: focus goes with the row */
  await t.root('.cc__item:nth-child(2) a').focus();
  await t.page.keyboard.press('ArrowRight'); await settle();
  eq(await t.page.evaluate(() => document.activeElement.closest('.cc__item') === document.querySelectorAll('.cc__item')[2]), true, tag + ': focus moves to the next circle');
  /* a circle picked in the builder comes into view */
  await t.page.evaluate(() => { document.querySelector('[data-r7c-track]').scrollLeft = 0; }); await settle();
  await t.page.evaluate(() => document.querySelector('.cc__item:last-child').dispatchEvent(new CustomEvent('shopify:block:select', {bubbles: true})));
  x = await settle();
  ok(await t.page.evaluate(() => { const r = document.querySelector('.cc__item:last-child').getBoundingClientRect(), b = document.querySelector('[data-r7c-track]').getBoundingClientRect(); return r.left >= b.left - 1 && r.right <= b.right + 1; }), tag + ': a picked circle is brought into view');
  /* the page itself never scrolls sideways, whatever the row does */
  ok(await t.noOverflow(), tag + ': no sideways page scroll');
  eq(t.errors, [], tag + ': no errors');
  await t.page.close();

  /* a row that fits: centred or left, no arrows, not a tab stop */
  const f = await mount(browser, name, {width: W, editing, blocks: CFG[name].few(), settings: W === 375 ? {circle_size_mobile: 60, gap_mobile: 10} : {}, assets: [ASSET]});
  let q = await probe(f, name);
  const mid = b => b.x + b.w / 2;
  ok(near((q.item.box.x + q.item.last.x + q.item.last.w) / 2, mid(q.track.box), 1.5) && near(mid(q.heading.box), mid(q.track.box), 1.5), tag + ': three circles are centred under a centred heading');
  eq([q.arrows.prev, q.arrows.next, await f.page.evaluate(() => document.querySelector('[data-r7c-track]').hasAttribute('tabindex'))], [false, false, false], tag + ': a row that fits has no arrows and is not a tab stop');
  await f.redraw({settings: {alignment: 'left'}}); await frames(f);
  q = await probe(f, name);
  ok(q.item.box.x < 80 && q.heading.align === 'start' && near(q.item.box.x, q.heading.box.x + parseFloat(await f.css('.cc__heading', 'paddingLeft')), 1.5), tag + ': left: the first circle lines up with the heading');
  eq(f.errors, [], tag + ': no errors with three circles');
  await f.page.close();
}

(async () => {
  const names = Object.keys(CFG).filter(n => !only.length || only.includes(n));
  const browser = await launch();
  try {
    for (const name of names) {
      statics(name);
      for (const W of [375, 1366]) {
        for (const editing of [true, false]) {
          await controls(browser, name, W, editing);
          await theme(browser, name, W, editing);
          await paint(browser, name, W, editing);
          if (name === 'collection-circles') await scrollerChecks(browser, W, editing);
        }
        await selects(browser, name, W);
        await lifecycle(browser, name, W);
        if (name === 'collection-mosaic') await mosaicShapes(browser, W);
      }
    }
  } finally { await browser.close(); }
  console.log(`collections round 7: ${checks} checks passed (${names.join(', ')}; 375 and 1366, builder and storefront)`);
})().catch(e => { console.error(e); process.exitCode = 1; });
